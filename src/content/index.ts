import { MessageType, Message } from '@common/types/messages';
import { devLog } from '@common/dev-utils';
import { SpeechSynthesizer } from '@common/speech-synthesizer';

interface SelectionInfo {
  text: string;
  boundingRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  timestamp: number;
}

class TextSelectionHandler {
  private currentSelection: Selection | null = null;
  private selectionText: string = '';
  private isSelectionActive: boolean = false;
  private selectionInfo: SelectionInfo | null = null;
  private speechSynthesizer: SpeechSynthesizer | null = null;

  constructor() {
    try {
      this.speechSynthesizer = new SpeechSynthesizer();
    } catch (error) {
      console.warn('SpeechSynthesizer not available:', error);
      // Gracefully handle cases where SpeechSynthesizer is not available (e.g., tests)
      this.speechSynthesizer = null;
    }
    this.init();
  }

  private init() {
    if (!this.validateSelectionEnvironment()) {
      devLog('Selection environment validation failed');
      return;
    }

    // Listen for selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // Listen for mouse events to detect selection completion
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Listen for keyboard events for keyboard-based selection
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Add keyboard event listeners for stop functionality
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    devLog('TTS Text Selection Handler initialized');
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('🔊 TTS Text Selection Handler initialized - Extension is working!');
    }
  }

  private handleSelectionChange() {
    try {
      const selection = this.safeGetSelection();
      
      if (selection && selection.rangeCount > 0) {
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
          this.currentSelection = selection;
          this.selectionText = selectedText;
          this.isSelectionActive = true;
          
          // Store selection information for context menu
          this.storeSelectionInfo(selection);
        } else {
          this.clearSelection();
        }
      } else {
        this.clearSelection();
      }
    } catch (error) {
      this.handleSelectionError(error as Error, 'handleSelectionChange');
    }
  }

  private handleMouseUp(_event: MouseEvent) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      this.processSelection();
    }, 10);
  }

  private handleKeyUp(event: KeyboardEvent) {
    // Handle keyboard-based selection (Shift + Arrow keys, Ctrl+A, etc.)
    if (event.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      setTimeout(() => {
        this.processSelection();
      }, 10);
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Handle Space bar for pause/resume when TTS is active
    if (event.key === ' ' && this.isTTSActive()) {
      if (!this.isInputElement(event.target as Element)) {
        event.preventDefault();
        this.togglePauseTTS();
      }
    }
    
    // Handle Escape key to stop TTS
    if (event.key === 'Escape') {
      this.handleEscapeKey(event);
    }
    
    // Handle Ctrl+Shift+S to stop TTS
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      this.handleStopShortcut();
    }
  }

  private handleEscapeKey(event: KeyboardEvent) {
    // Only handle escape if TTS is playing
    if (this.isTTSPlaying()) {
      event.preventDefault();
      event.stopPropagation();
      this.stopTTS();
    }
  }

  private handleStopShortcut() {
    // Always handle the stop shortcut
    this.stopTTS();
  }

  private setupKeyboardShortcuts() {
    // Register keyboard shortcuts with the extension
    chrome.runtime.sendMessage({
      type: MessageType.CONTENT_READY, // Reuse existing message type for simplicity
      payload: {
        shortcuts: [
          {
            key: 'Space',
            description: 'Pause/Resume TTS playback',
            condition: 'tts-active'
          },
          {
            key: 'Escape',
            description: 'Stop TTS playback',
            condition: 'tts-playing'
          },
          {
            key: 'Ctrl+Shift+S',
            description: 'Stop TTS playback',
            condition: 'always'
          }
        ]
      }
    }).catch(error => {
      devLog('Could not register shortcuts:', error);
    });
  }

  private isInputElement(element: Element): boolean {
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTags.includes(element.tagName) || 
           element.getAttribute('contenteditable') === 'true';
  }

  private isTTSActive(): boolean {
    if (this.speechSynthesizer) {
      const state = this.speechSynthesizer.getPlaybackState();
      return state.isPlaying || state.isPaused;
    }
    return false;
  }

  private async togglePauseTTS(): Promise<void> {
    try {
      // Toggle pause locally
      if (this.speechSynthesizer) {
        const toggled = this.speechSynthesizer.togglePause();
        
        if (toggled) {
          // Notify background script
          await chrome.runtime.sendMessage({
            type: MessageType.TOGGLE_PAUSE_TTS,
            payload: {
              source: 'keyboard',
              timestamp: Date.now()
            }
          });
          
          // Show feedback
          const state = this.speechSynthesizer.getPlaybackState();
          const message = state.isPaused ? '⏸️ Speech paused' : '▶️ Speech resumed';
          this.showUserFeedback(message, 'info');
        }
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
      this.showUserFeedback('❌ Error toggling pause', 'error');
    }
  }

  private processSelection() {
    try {
      const selection = this.safeGetSelection();
      const selectedText = selection ? selection.toString().trim() : '';
      
      if (selectedText.length > 0) {
        this.validateAndStoreSelection(selectedText, selection);
      }
    } catch (error) {
      this.handleSelectionError(error as Error, 'processSelection');
    }
  }

  private validateAndStoreSelection(text: string, selection: Selection | null) {
    if (this.isValidSelection(text) && selection) {
      this.selectionText = this.cleanSelectionText(text);
      this.currentSelection = selection;
      this.isSelectionActive = true;
      
      // Notify background script of new selection
      this.notifySelectionChange();
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('📝 Text selected:', this.selectionText.substring(0, 50) + '...');
      }
    }
  }

  private isValidSelection(text: string): boolean {
    if (!text || text.length === 0) return false;
    if (text.length > 5000) return false; // Reasonable limit
    
    // Check if text contains readable content (not just symbols/whitespace)
    const readableContent = text.replace(/[\s\n\r\t]/g, '');
    return readableContent.length > 0;
  }

  private cleanSelectionText(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/[\n\r\t]/g, ' ')      // Replace line breaks with spaces
      .trim();                        // Remove leading/trailing whitespace
  }

  private storeSelectionInfo(selection: Selection) {
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Store selection metadata
      this.selectionInfo = {
        text: this.selectionText,
        boundingRect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        timestamp: Date.now()
      };
    }
  }

  private notifySelectionChange() {
    chrome.runtime.sendMessage({
      type: MessageType.SELECTION_CHANGED,
      payload: {
        text: this.selectionText,
        hasSelection: this.isSelectionActive,
        url: window.location.href,
        title: document.title
      }
    }).catch(error => {
      devLog('Error sending selection change message:', error);
    });
  }

  private clearSelection() {
    this.currentSelection = null;
    this.selectionText = '';
    this.isSelectionActive = false;
    this.selectionInfo = null;
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: MessageType.SELECTION_CLEARED
    }).catch(error => {
      devLog('Error sending selection cleared message:', error);
    });
  }

  public handleMessage(request: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: Record<string, unknown>) => void): void {
    switch (request.type) {
      case MessageType.GET_SELECTION:
        sendResponse({
          text: this.selectionText,
          hasSelection: this.isSelectionActive,
          info: this.selectionInfo
        });
        break;
        
      case MessageType.CLEAR_SELECTION:
        this.clearSelection();
        sendResponse({ success: true });
        break;

      case MessageType.TTS_FEEDBACK:
        this.handleTTSFeedback(request.payload || {});
        sendResponse({ success: true });
        break;
        
      case MessageType.START_SPEECH:
        this.handleStartSpeech(request.payload || {});
        sendResponse({ success: true });
        break;
        
      case MessageType.STOP_SPEECH:
        this.handleStopSpeech(request.payload || {});
        sendResponse({ success: true });
        break;
        
      case MessageType.FORCE_STOP:
        this.handleForceStop();
        sendResponse({ success: true });
        break;
        
      case MessageType.PAUSE_SPEECH:
        this.handlePauseSpeech();
        sendResponse({ success: true });
        break;
        
      case MessageType.RESUME_SPEECH:
        this.handleResumeSpeech();
        sendResponse({ success: true });
        break;
        
      case MessageType.TOGGLE_PAUSE_SPEECH: {
        const pauseState = this.handleTogglePauseSpeech();
        sendResponse(pauseState);
        break;
      }
        
      default:
        // Don't handle other message types here
        break;
    }
  }

  private handleTTSFeedback(feedbackData: Record<string, unknown>) {
    const status = feedbackData.status as string;
    
    switch (status) {
      case 'started':
        this.showUserFeedback('🔊 TTS Started', 'success');
        break;
        
      case 'paused':
        this.showUserFeedback('⏸️ Speech paused', 'info');
        break;
        
      case 'resumed':
        this.showUserFeedback('▶️ Speech resumed', 'info');
        break;
        
      case 'stopped':
        this.showUserFeedback('⏹️ Speech stopped', 'info');
        break;
        
      case 'no-selection':
        this.showUserFeedback('⚠️ No text selected', 'warning');
        break;
        
      case 'invalid-text':
        this.showUserFeedback('❌ Invalid text for TTS', 'error');
        break;
        
      case 'communication-error':
        this.showUserFeedback('🔌 Communication error', 'error');
        break;
        
      case 'error':
      default:
        this.showUserFeedback('❌ TTS Error', 'error');
        break;
    }
  }

  private showUserFeedback(message: string, type: 'success' | 'warning' | 'error' | 'info') {
    // Create a temporary notification element
    const notification = this.createNotificationElement(message, type);
    document.body.appendChild(notification);
    
    // Show notification with slight delay for smooth animation
    setTimeout(() => {
      notification.classList.add('tts-notification-show');
    }, 10);
    
    // Hide and remove notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove('tts-notification-show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  private createNotificationElement(message: string, type: 'success' | 'warning' | 'error' | 'info'): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `tts-notification tts-notification-${type}`;
    notification.textContent = message;
    
    // Add styles with proper isolation and clean appearance
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 2147483647;
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
      max-width: 320px;
      word-wrap: break-word;
      border: none;
      outline: none;
      box-sizing: border-box;
    `;
    
    return notification;
  }

  private getNotificationColor(type: 'success' | 'warning' | 'error' | 'info'): string {
    const colors = {
      success: '#10b981', // emerald-500
      warning: '#f59e0b', // amber-500
      error: '#ef4444',   // red-500
      info: '#3b82f6'     // blue-500
    };
    return colors[type] || colors.info;
  }

  private handleSelectionError(error: Error, context: string) {
    devLog('Selection error in', context, ':', error);
    
    // Report error to background script
    chrome.runtime.sendMessage({
      type: MessageType.SELECTION_ERROR,
      payload: {
        error: error.message,
        context: context,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    }).catch(() => {
      // Ignore messaging errors during error handling
    });
    
    // Reset selection state
    this.clearSelection();
  }

  private async handleStartSpeech(data: Record<string, unknown>): Promise<void> {
    try {
      const text = data.text as string;
      
      if (!text || typeof text !== 'string') {
        throw new Error('No text provided for speech synthesis');
      }

      if (!this.speechSynthesizer) {
        throw new Error('Speech synthesizer not available');
      }

      if (!this.speechSynthesizer.isReady()) {
        throw new Error('Speech synthesizer not ready');
      }

      await this.speechSynthesizer.speak(text);
      
      this.showUserFeedback('🔊 Speech started', 'success');
      
    } catch (error) {
      console.error('Error starting speech:', error);
      this.showUserFeedback('❌ Speech error: ' + (error as Error).message, 'error');
    }
  }

  private handleStopSpeech(data: Record<string, unknown> = {}): void {
    try {
      if (!this.speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return;
      }
      
      this.speechSynthesizer.stop();
      
      // Clear any local timers or intervals
      this.clearTTSResources();
      
      // Show appropriate feedback based on stop source
      const source = data.source as string || 'unknown';
      const message = this.getStopMessage(source);
      
      this.showUserFeedback(message, 'info');
      
      devLog('Speech stopped from:', source);
      
    } catch (error) {
      console.error('Error in handleStopSpeech:', error);
      this.showUserFeedback('❌ Error stopping speech', 'error');
    }
  }

  private handleForceStop(): void {
    // Force stop for emergency situations
    try {
      if (this.speechSynthesizer) {
        this.speechSynthesizer.stop();
      }
      
      // Force clear the speech synthesis queue
      if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
      }
      
      this.clearTTSResources();
      this.showUserFeedback('Speech force stopped', 'warning');
      
    } catch (error) {
      console.error('Error in force stop:', error);
    }
  }

  private async stopTTS(): Promise<void> {
    try {
      // Send stop command to background script
      await chrome.runtime.sendMessage({
        type: MessageType.STOP_TTS,
        payload: {
          source: 'keyboard',
          timestamp: Date.now()
        }
      });
      
      // Also stop local speech synthesis
      if (this.speechSynthesizer) {
        this.speechSynthesizer.stop();
      }
      
      // Show feedback
      this.showUserFeedback('Speech stopped', 'info');
      
    } catch (error) {
      console.error('Error stopping TTS:', error);
      this.showUserFeedback('Error stopping speech', 'error');
    }
  }

  private isTTSPlaying(): boolean {
    // Check if TTS is currently playing
    if (this.speechSynthesizer) {
      const state = this.speechSynthesizer.getPlaybackState();
      return state.isPlaying && !state.isPaused;
    }
    return false;
  }

  private clearTTSResources(): void {
    // Clear any timers, intervals, or other resources
    // This would be implemented based on what resources need cleanup
    devLog('TTS resources cleared');
  }

  private getStopMessage(source: string): string {
    const messages: Record<string, string> = {
      'keyboard': 'Speech stopped (keyboard)',
      'context-menu': 'Speech stopped',
      'popup': 'Speech stopped (popup)',
      'navigation': 'Speech stopped (page changed)',
      'new-request': 'Speech stopped (new request)',
      'error': 'Speech stopped (error)',
      'force': 'Speech force stopped'
    };
    
    return messages[source] || 'Speech stopped';
  }

  private handlePauseSpeech(): void {
    try {
      if (!this.speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return;
      }
      if (this.speechSynthesizer.pause()) {
        this.showUserFeedback('⏸️ Speech paused', 'info');
      } else {
        this.showUserFeedback('⚠️ Speech not playing', 'warning');
      }
    } catch (error) {
      console.error('Error pausing speech:', error);
      this.showUserFeedback('❌ Error pausing speech', 'error');
    }
  }

  private handleResumeSpeech(): void {
    try {
      if (!this.speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return;
      }
      if (this.speechSynthesizer.resume()) {
        this.showUserFeedback('▶️ Speech resumed', 'info');
      } else {
        this.showUserFeedback('⚠️ Speech not paused', 'warning');
      }
    } catch (error) {
      console.error('Error resuming speech:', error);
      this.showUserFeedback('❌ Error resuming speech', 'error');
    }
  }

  private handleTogglePauseSpeech(): Record<string, unknown> {
    try {
      if (!this.speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return { success: false, isPaused: false, error: 'Speech synthesizer not available' };
      }
      
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Toggle pause called, current state:', this.speechSynthesizer.getPlaybackState());
      
      const toggled = this.speechSynthesizer.togglePause();
      
      if (toggled) {
        const state = this.speechSynthesizer.getPlaybackState();
        const message = state.isPaused ? '⏸️ Speech paused' : '▶️ Speech resumed';
        this.showUserFeedback(message, 'info');
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] Toggle successful, new state:', state);
        return { success: true, isPaused: state.isPaused };
      } else {
        this.showUserFeedback('⚠️ Speech not active', 'warning');
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] Toggle failed - speech not active');
        return { success: false, isPaused: false, error: 'Speech not active' };
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
      this.showUserFeedback('❌ Error toggling pause', 'error');
      return { success: false, isPaused: false, error: (error as Error).message };
    }
  }

  private safeGetSelection(): Selection | null {
    try {
      return window.getSelection();
    } catch (error) {
      this.handleSelectionError(error as Error, 'getSelection');
      return null;
    }
  }

  private validateSelectionEnvironment(): boolean {
    if (!window.getSelection) {
      devLog('Selection API not available');
      return false;
    }
    
    if (!document) {
      devLog('Document not available');
      return false;
    }
    
    return true;
  }

  // Public method to get current selection
  public getCurrentSelection(): { text: string; isActive: boolean; info: SelectionInfo | null } {
    return {
      text: this.selectionText,
      isActive: this.isSelectionActive,
      info: this.selectionInfo
    };
  }

  // Public method to get selected text (for ContentScriptController compatibility)
  public getSelectedText(): string {
    return this.selectionText;
  }

  // Public methods for testing (expose private methods)
  public testIsValidSelection(text: string): boolean {
    return this.isValidSelection(text);
  }

  public testCleanSelectionText(text: string): string {
    return this.cleanSelectionText(text);
  }

  public testValidateSelectionEnvironment(): boolean {
    return this.validateSelectionEnvironment();
  }

  public testSafeGetSelection(): Selection | null {
    return this.safeGetSelection();
  }

  public testValidateAndStoreSelection(text: string, selection: Selection | null): void {
    return this.validateAndStoreSelection(text, selection);
  }

  public testClearSelection(): void {
    return this.clearSelection();
  }

  public testHandleMessage(request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: Record<string, unknown>) => void): void {
    return this.handleMessage(request, sender, sendResponse);
  }

  public testHandleSelectionChange(): void {
    return this.handleSelectionChange();
  }
}

class ContentScriptController {
  private highlightedElements: HTMLElement[] = [];
  private textSelectionHandler: TextSelectionHandler;

  constructor() {
    this.textSelectionHandler = new TextSelectionHandler();
    this.initialize();
  }

  private initialize() {
    devLog('Content script initialized on:', window.location.href);

    // Notify background that content script is ready
    chrome.runtime.sendMessage({
      type: MessageType.CONTENT_READY,
      payload: { url: window.location.href },
    });

    this.setupEventListeners();
    this.injectStyles();
  }

  private setupEventListeners() {
    // Double-click to speak
    document.addEventListener('dblclick', (e) => {
      const selectedText = this.textSelectionHandler.getSelectedText();
      if (selectedText && e.shiftKey) {
        this.speakText(selectedText);
      }
    });

    // Message listener
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      devLog('Content script received message:', message);

      switch (message.type) {
        case MessageType.SPEAK_SELECTION:
          if (message.payload && typeof message.payload === 'object') {
            if ('fullPage' in message.payload && message.payload.fullPage) {
              this.speakFullPage();
            } else {
              const text = 'text' in message.payload 
                ? String(message.payload.text) 
                : this.textSelectionHandler.getSelectedText();
              this.speakText(text);
            }
          } else {
            this.speakText(this.textSelectionHandler.getSelectedText());
          }
          sendResponse({ success: true });
          break;

        case MessageType.HIGHLIGHT_TEXT:
          if (message.payload && typeof message.payload === 'object' && 'text' in message.payload) {
            this.highlightText(String(message.payload.text));
          }
          sendResponse({ success: true });
          break;

        case MessageType.SETTINGS_UPDATED:
          if (message.payload) {
            this.applySettings(message.payload);
          }
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }

      return true;
    });
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .tts-highlight {
        background-color: yellow !important;
        color: black !important;
        transition: background-color 0.3s ease;
      }
      
      .tts-speaking {
        outline: 2px solid #2196f3 !important;
        outline-offset: 2px;
      }
      
      @keyframes tts-pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      .tts-pulse {
        animation: tts-pulse 1s infinite;
      }

      /* TTS Notification Styles */
      .tts-notification-show {
        transform: translateX(0) !important;
      }

      .tts-notification:hover {
        transform: translateX(0) !important;
        cursor: pointer;
      }

      /* Ensure notifications don't interfere with page content */
      .tts-notification {
        pointer-events: auto;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  }

  private speakText(text: string) {
    if (!text) return;

    // Use the unified Web Speech API flow through TextSelectionHandler
    // This ensures proper state tracking and stop functionality
    this.textSelectionHandler.handleMessage({
      type: MessageType.START_SPEECH,
      payload: { text }
    }, {} as chrome.runtime.MessageSender, () => {});

    // Visual feedback is now handled by the new TTS feedback system
  }

  private speakFullPage() {
    // Get main content (simplified version)
    const content = document.body.innerText
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .join('. ');

    this.speakText(content);
  }

  private highlightText(searchText: string) {
    // Clear previous highlights
    this.clearHighlights();

    if (!searchText) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.textContent?.includes(searchText)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent) {
        parent.classList.add('tts-highlight');
        this.highlightedElements.push(parent);
      }
    }
  }

  private clearHighlights() {
    this.highlightedElements.forEach((el) => {
      el.classList.remove('tts-highlight');
    });
    this.highlightedElements = [];
  }


  private applySettings(settings: Record<string, unknown>) {
    if (settings.fontSize && typeof settings.fontSize === 'number') {
      document.documentElement.style.setProperty('--tts-font-size', `${settings.fontSize}px`);
    }

    if (settings.theme && typeof settings.theme === 'string') {
      document.documentElement.setAttribute('data-tts-theme', settings.theme);
    }
  }
}

// Initialize only once
if (!window.__ttsContentScriptInitialized) {
  window.__ttsContentScriptInitialized = true;
  new ContentScriptController();
}

// TypeScript declaration for the custom property
declare global {
  interface Window {
    __ttsContentScriptInitialized?: boolean;
  }
}

// Export for testing
export { TextSelectionHandler };
