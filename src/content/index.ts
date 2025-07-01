import { MessageType, Message, MessageResponse } from '@common/types/messages';
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
  private _speechSynthesizer: SpeechSynthesizer | null = null;
  private lastShortcutTime = 0;
  private contentController: ContentScriptController | null = null;
  private isDisconnected: boolean = false;

  public setContentController(controller: ContentScriptController): void {
    this.contentController = controller;
  }

  constructor() {
    try {
      // SpeechSynthesizer now initializes synchronously and is immediately ready
      this._speechSynthesizer = new SpeechSynthesizer();
      
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('🚀 SpeechSynthesizer created - TTS ready immediately!');
      }
    } catch (error) {
      console.warn('SpeechSynthesizer not available:', error);
      // Gracefully handle cases where SpeechSynthesizer is not available (e.g., tests)
      this._speechSynthesizer = null;
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
      console.log('🔊 TTS Text Selection Handler initialized - Extension is working! [VERSION: KEYBOARD-FIX-v6]');
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
    const now = Date.now();
    
    // Debounce: Ignore if called within 300ms of last call
    if (now - this.lastShortcutTime < 300) {
      devLog('[Keyboard] Ignoring duplicate shortcut (debounced)');
      return;
    }
    
    // Handle Ctrl+Shift+S - Start TTS
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
      this.lastShortcutTime = now;
      devLog('[Keyboard] Start TTS shortcut triggered: Ctrl+Shift+S');
      event.preventDefault();
      this.handleStartTTSShortcut();
      return;
    }
    
    // Handle Ctrl+Shift+X - Stop TTS  
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'x') {
      this.lastShortcutTime = now;
      devLog('[Keyboard] Stop TTS shortcut triggered: Ctrl+Shift+X');
      event.preventDefault();
      this.handleStopTTSShortcut();
      return;
    }
    
    // Handle Ctrl+Shift+R - Read entire page
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'r') {
      this.lastShortcutTime = now;
      devLog('[Keyboard] Read page shortcut triggered: Ctrl+Shift+R');
      event.preventDefault();
      this.handleReadPageShortcut();
      return;
    }
    
    // Handle Ctrl+Shift+Space for pause/resume
    if (event.ctrlKey && event.shiftKey && event.key === ' ') {
      this.lastShortcutTime = now;
      devLog('[KEYBOARD-FIX-v4] TTS keyboard shortcut triggered: Ctrl+Shift+Space');
      event.preventDefault();
      this.handleTTSShortcut();
    }
  }

  private handleTTSShortcut() {
    // Handle Ctrl+Shift+Space: pause/resume toggle
    const isPlaying = this.isTTSPlaying();
    const isPaused = this.isTTSPaused();
    
    devLog('[KEYBOARD-FIX-v6] TTS shortcut handler called:', {
      isPlaying,
      isPaused,
      speechSynthesizerAvailable: !!this._speechSynthesizer
    });
    
    if (isPlaying || isPaused) {
      // If TTS is active (playing or paused), toggle pause/resume
      devLog('[KEYBOARD-FIX-v6] TTS is active - toggling pause/resume');
      this.togglePauseTTS();
    } else {
      devLog('[KEYBOARD-FIX-v6] TTS is not active - no action taken');
    }
  }
  
  private async handleStartTTSShortcut() {
    devLog('[Keyboard] Start TTS shortcut handler called');
    
    // Get the current selection
    const selection = this.safeGetSelection();
    
    if (!selection || selection.rangeCount === 0) {
      devLog('[Keyboard] No text selected');
      this.showUserFeedback('Please select some text first', 'warning');
      return;
    }
    
    const selectedText = selection.toString().trim();
    
    if (!selectedText) {
      devLog('[Keyboard] Selected text is empty');
      this.showUserFeedback('Please select some text first', 'warning');
      return;
    }
    
    devLog('[Keyboard] Starting TTS with text:', selectedText.substring(0, 50) + '...');
    
    // Send start TTS message to background
    try {
      await this.safeMessageToBackground({
        type: MessageType.START_TTS,
        payload: {
          text: selectedText
        }
      });
      
      devLog('[Keyboard] TTS start message sent to background');
    } catch (error) {
      devLog('[Keyboard] Error starting TTS:', error);
      this.showUserFeedback('Failed to start TTS', 'error');
    }
  }
  
  public async handleStopTTSShortcut(): Promise<void> {
    devLog('[Keyboard] Stop TTS shortcut handler called');
    
    const isPlaying = this.isTTSPlaying();
    const isPaused = this.isTTSPaused();
    
    if (!isPlaying && !isPaused) {
      devLog('[Keyboard] TTS is not active, nothing to stop');
      return;
    }
    
    // Send stop TTS message to background
    try {
      await this.safeMessageToBackground({
        type: MessageType.STOP_TTS,
        payload: {
          source: 'keyboard'
        }
      });
      
      devLog('[Keyboard] TTS stop message sent to background');
    } catch (error) {
      devLog('[Keyboard] Error stopping TTS:', error);
    }
  }
  
  private async handleReadPageShortcut() {
    devLog('[Keyboard] Read page shortcut handler called');
    
    try {
      if (this.contentController) {
        const isAlreadyActive = this.isTTSPlaying() || this.isTTSPaused();
        
        // Call speakFullPage directly on the ContentScriptController
        await this.contentController.speakFullPage();
        devLog('[Keyboard] Page reading initiated');
        
        // Show appropriate feedback based on whether we restarted or started fresh
        if (isAlreadyActive) {
          this.showUserFeedback('🔄 Restarting page reading from beginning...', 'info');
        } else {
          this.showUserFeedback('📄 Reading entire page...', 'info');
        }
      } else {
        devLog('[Keyboard] ContentController not available');
        this.showUserFeedback('Failed to read page - controller not available', 'error');
      }
    } catch (error) {
      devLog('[Keyboard] Error reading page:', error);
      this.showUserFeedback('Failed to read page', 'error');
    }
  }

  private setupKeyboardShortcuts() {
    // Register keyboard shortcuts with the extension
    this.safeMessageToBackground({
      type: MessageType.CONTENT_READY, // Reuse existing message type for simplicity
      payload: {
        shortcuts: [
          {
            key: 'Ctrl+Shift+Space',
            description: 'Pause/Resume TTS (when playing) or Stop TTS (when paused)',
            condition: 'tts-active'
          }
        ]
      }
    }).catch(error => {
      devLog('Could not register shortcuts:', error);
    });
  }

  private isInputElement(element: Element): boolean {
    // Only block the shortcut for actual text input elements where the user is typing
    const isContentEditable = element.getAttribute('contenteditable') === 'true';
    
    // For INPUT elements, only block if it's a text input type
    if (element.tagName === 'INPUT') {
      const inputType = (element as HTMLInputElement).type.toLowerCase();
      const textInputTypes = ['text', 'password', 'email', 'search', 'url', 'tel'];
      return textInputTypes.includes(inputType);
    }
    
    return element.tagName === 'TEXTAREA' || isContentEditable;
  }

  private isTTSActive(): boolean {
    if (this._speechSynthesizer) {
      const state = this._speechSynthesizer.getPlaybackState();
      return state.isPlaying || state.isPaused;
    }
    return false;
  }

  private async togglePauseTTS(): Promise<void> {
    try {
      // Toggle pause locally only (don't notify background to avoid double toggle)
      if (this._speechSynthesizer) {
        devLog('[KEYBOARD-FIX-v5] Calling togglePause on SpeechSynthesizer');
        const toggled = this._speechSynthesizer.togglePause();
        
        if (toggled) {
          // Show feedback
          const state = this._speechSynthesizer.getPlaybackState();
          const message = state.isPaused ? '⏸️ Speech paused' : '▶️ Speech resumed';
          this.showUserFeedback(message, 'info');
          devLog('[KEYBOARD-FIX-v5] Toggle successful, new state:', state.isPaused ? 'PAUSED' : 'PLAYING');
        } else {
          devLog('[KEYBOARD-FIX-v5] Toggle failed');
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
    this.safeMessageToBackground({
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
    this.safeMessageToBackground({
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

      case MessageType.PREVIEW_VOICE:
        this.handlePreviewVoice(request.payload || {});
        sendResponse({ success: true });
        break;
        
      case MessageType.CHANGE_SPEED:
        this.handleSpeedChange(request.data || {});
        sendResponse({ success: true });
        break;
        
      case MessageType.GET_CURRENT_TEXT_LENGTH: {
        const length = this.getCurrentTextLength();
        sendResponse({ length: length });
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
  
  private handleSpeedChange(data: Record<string, unknown>): void {
    if (this._speechSynthesizer && data.speed) {
      const success = this._speechSynthesizer.setRate(data.speed as number);
      
      if (success) {
        this.showUserFeedback(`Speed: ${data.speed}x`, 'info');
      }
    }
  }
  
  private getCurrentTextLength(): number {
    if (this._speechSynthesizer) {
      const state = this._speechSynthesizer.getPlaybackState();
      if (state.currentText) {
        return state.currentText.length;
      }
    }
    
    // Fall back to current selection
    if (this.selectionText) {
      return this.selectionText.length;
    }
    
    return 0;
  }

  private handleSelectionError(error: Error, context: string) {
    devLog('Selection error in', context, ':', error);
    
    // Check if this is a context invalidation error to prevent recursive errors
    const isContextError = error.message.includes('Extension context invalidated') || 
                          error.message.includes('Receiving end does not exist');
    
    // Only try to report to background if it's not a context/communication error
    if (!isContextError) {
      this.safeMessageToBackground({
        type: MessageType.SELECTION_ERROR,
        payload: {
          error: error.message,
          context: context,
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      });
    } else {
      // For context errors, just log locally and mark extension as disconnected
      console.warn('[TTS] Extension context invalidated, background communication lost');
      this.markAsDisconnected();
    }
    
    // Reset selection state
    this.clearSelection();
  }

  private markAsDisconnected() {
    // Mark extension as disconnected to prevent further communication attempts
    // This helps avoid recursive errors when background is unavailable
    if (!this.isDisconnected) {
      this.isDisconnected = true;
      devLog('[TTS] Marked extension as disconnected due to context invalidation');
      
      // Show user feedback about disconnection
      this.showUserFeedback('🔌 Extension reconnecting...', 'info');
      
      // Try to reconnect after a delay
      setTimeout(() => {
        this.attemptReconnection();
      }, 2000);
    }
  }

  private async attemptReconnection() {
    try {
      // Try a simple ping to background
      const response = await chrome.runtime.sendMessage({ type: MessageType.PING });
      if (response && response.pong) {
        this.isDisconnected = false;
        devLog('[TTS] Successfully reconnected to background');
        this.showUserFeedback('✅ Extension reconnected', 'success');
        
        // If background was reinitializing, wait a bit before marking as fully ready
        if (!response.initialized) {
          devLog('[TTS] Background still initializing, monitoring...');
          setTimeout(() => {
            this.verifyConnectionHealth();
          }, 2000);
        } else {
          devLog('[TTS] Background ready and connection healthy');
        }
      } else {
        throw new Error('Invalid ping response');
      }
    } catch (error) {
      // Still disconnected, try again later
      devLog('[TTS] Reconnection failed, will retry in 5s:', error);
      setTimeout(() => {
        this.attemptReconnection();
      }, 5000);
    }
  }

  private async verifyConnectionHealth() {
    try {
      // Test connection by trying to get extension state
      const response = await this.safeMessageToBackground({
        type: MessageType.GET_STATE
      });
      
      if (response && response.success) {
        devLog('[TTS] Connection health verified');
        this.showUserFeedback('🔌 Extension fully ready', 'success');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      devLog('[TTS] Connection health check failed:', error);
      // Don't mark as disconnected again, just retry verification
      setTimeout(() => {
        this.verifyConnectionHealth();
      }, 3000);
    }
  }

  private safeMessageToBackground(message: Message): Promise<MessageResponse> {
    // Safe wrapper for chrome.runtime.sendMessage that handles context invalidation
    if (this.isDisconnected) {
      devLog('[TTS] Skipping message to background - extension disconnected');
      return Promise.reject(new Error('Extension disconnected'));
    }

    return chrome.runtime.sendMessage(message).catch((error) => {
      const isContextError = error.message.includes('Extension context invalidated') || 
                            error.message.includes('Receiving end does not exist');
      
      if (isContextError) {
        this.markAsDisconnected();
        throw new Error('Extension context invalidated');
      }
      throw error;
    });
  }

  private async handleStartSpeech(data: Record<string, unknown>): Promise<void> {
    try {
      const text = data.text as string;
      const voice = data.voice as Record<string, unknown> | undefined;
      const rate = data.rate as number | undefined;
      
      if (!text || typeof text !== 'string') {
        throw new Error('No text provided for speech synthesis');
      }

      if (!this._speechSynthesizer) {
        throw new Error('Speech synthesizer not available');
      }

      if (!this._speechSynthesizer.isReady()) {
        throw new Error('Speech synthesizer not ready');
      }

      // Set voice if provided, or request current selected voice from background
      if (voice && voice.name && typeof voice.name === 'string') {
        const voiceSet = this._speechSynthesizer.setVoice(voice as { name: string });
        devLog('[TTS] Applied voice from message:', voice.name, 'Success:', voiceSet);
      } else {
        // No voice provided, get the currently selected voice from background
        try {
          const voiceResponse = await this.safeMessageToBackground({
            type: MessageType.GET_VOICE_DATA
          });
          
          if (voiceResponse && voiceResponse.success && voiceResponse.data && voiceResponse.data.selectedVoice) {
            const selectedVoice = voiceResponse.data.selectedVoice as { name: string; lang: string; };
            const voiceSet = this._speechSynthesizer.setVoice(selectedVoice);
            devLog('[TTS] Applied selected voice from background:', selectedVoice.name, 'Success:', voiceSet);
          } else {
            devLog('[TTS] No selected voice available, using default');
          }
        } catch (error) {
          devLog('[TTS] Error getting selected voice from background:', error);
        }
      }
      
      // Set rate if provided
      if (rate && typeof rate === 'number') {
        this._speechSynthesizer.setRate(rate);
        devLog('[TTS] Applied rate:', rate);
      }

      await this._speechSynthesizer.speak(text);
      
      this.showUserFeedback('🔊 Speech started', 'success');
      
    } catch (error) {
      console.error('Error starting speech:', error);
      this.showUserFeedback('❌ Speech error: ' + (error as Error).message, 'error');
    }
  }

  private handleStopSpeech(data: Record<string, unknown> = {}): void {
    try {
      if (!this._speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return;
      }
      
      this._speechSynthesizer.stop();
      
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
      if (this._speechSynthesizer) {
        this._speechSynthesizer.stop();
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
      await this.safeMessageToBackground({
        type: MessageType.STOP_TTS,
        payload: {
          source: 'keyboard',
          timestamp: Date.now()
        }
      });
      
      // Also stop local speech synthesis
      if (this._speechSynthesizer) {
        this._speechSynthesizer.stop();
      }
      
      // Show feedback
      this.showUserFeedback('Speech stopped', 'info');
      
    } catch (error) {
      console.error('Error stopping TTS:', error);
      this.showUserFeedback('Error stopping speech', 'error');
    }
  }

  public isTTSPlaying(): boolean {
    // Check if TTS is currently playing
    if (this._speechSynthesizer) {
      const state = this._speechSynthesizer.getPlaybackState();
      return state.isPlaying && !state.isPaused;
    }
    return false;
  }

  public isTTSPaused(): boolean {
    // Check if TTS is currently paused
    if (this._speechSynthesizer) {
      const state = this._speechSynthesizer.getPlaybackState();
      return state.isPlaying && state.isPaused;
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
      if (!this._speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return;
      }
      if (this._speechSynthesizer.pause()) {
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
      if (!this._speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return;
      }
      if (this._speechSynthesizer.resume()) {
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
      if (!this._speechSynthesizer) {
        this.showUserFeedback('⚠️ Speech synthesizer not available', 'warning');
        return { success: false, isPaused: false, error: 'Speech synthesizer not available' };
      }
      
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Toggle pause called, current state:', this._speechSynthesizer.getPlaybackState());
      
      const toggled = this._speechSynthesizer.togglePause();
      
      if (toggled) {
        const state = this._speechSynthesizer.getPlaybackState();
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

  private async handlePreviewVoice(data: Record<string, unknown>): Promise<void> {
    try {
      const voice = data.voice as Record<string, unknown> | undefined;
      
      if (!voice || !voice.name || typeof voice.name !== 'string') {
        throw new Error('No voice provided for preview');
      }

      if (!this._speechSynthesizer) {
        throw new Error('Speech synthesizer not available');
      }

      // Get preview text based on language
      const lang = voice.lang as string || 'en';
      const previewText = this.getPreviewText(lang);

      // Temporarily set the voice for preview
      const previousVoice = this._speechSynthesizer.getVoice();
      this._speechSynthesizer.setVoice(voice as { name: string });

      // Speak the preview text
      await this._speechSynthesizer.speak(previewText);

      // Restore previous voice if it exists
      if (previousVoice) {
        this._speechSynthesizer.setVoice(previousVoice);
      }

      this.showUserFeedback('🔊 Voice preview', 'info');
      
    } catch (error) {
      console.error('Error previewing voice:', error);
      this.showUserFeedback('❌ Voice preview error: ' + (error as Error).message, 'error');
    }
  }

  private getPreviewText(lang: string): string {
    const previewTexts: Record<string, string> = {
      'en': 'Hello! This is a preview of the selected voice. The quick brown fox jumps over the lazy dog.',
      'es': '¡Hola! Esta es una vista previa de la voz seleccionada. El rápido zorro marrón salta sobre el perro perezoso.',
      'fr': 'Bonjour! Ceci est un aperçu de la voix sélectionnée. Le rapide renard brun saute par-dessus le chien paresseux.',
      'de': 'Hallo! Dies ist eine Vorschau der ausgewählten Stimme. Der schnelle braune Fuchs springt über den faulen Hund.',
      'it': 'Ciao! Questa è un\'anteprima della voce selezionata. La rapida volpe marrone salta sopra il cane pigro.',
      'pt': 'Olá! Esta é uma prévia da voz selecionada. A rápida raposa marrom pula sobre o cão preguiçoso.',
      'ja': 'こんにちは！これは選択された音声のプレビューです。素早い茶色のキツネが怠け者の犬を飛び越えます。',
      'ko': '안녕하세요! 선택한 음성의 미리보기입니다. 빠른 갈색 여우가 게으른 개를 뛰어넘습니다.',
      'zh': '你好！这是所选语音的预览。敏捷的棕色狐狸跳过了懒狗。'
    };
    
    const langPrefix = lang.split('-')[0];
    return previewTexts[langPrefix] || previewTexts['en'];
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

  // Public getter for speechSynthesizer
  public get speechSynthesizer(): SpeechSynthesizer | null {
    return this._speechSynthesizer;
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
  private isDisconnected: boolean = false;

  constructor() {
    this.textSelectionHandler = new TextSelectionHandler();
    // Set the reference so TextSelectionHandler can call ContentScriptController methods
    this.textSelectionHandler.setContentController(this);
    this.initialize();
  }

  private async initialize() {
    devLog('Content script initialized on:', window.location.href);

    // Setup event listeners and styles immediately - don't wait for voice enumeration
    this.setupEventListeners();
    this.injectStyles();

    // Notify background that content script is ready (immediately functional)
    this.safeMessageToBackground({
      type: MessageType.CONTENT_READY,
      payload: { url: window.location.href },
    });

    // Enumerate voices in background without blocking
    this.enumerateAndUpdateVoicesAsync().catch(error => {
      console.warn('Voice enumeration failed, extension still functional:', error);
    });
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('🎯 Content script fully initialized - Extension ready for use!');
    }
  }

  private async enumerateAndUpdateVoicesAsync() {
    try {
      // Check if we have access to speechSynthesis
      if (typeof speechSynthesis !== 'undefined') {
        devLog('Enumerating voices in content script...');
        
        // Get voices from the TextSelectionHandler's speech synthesizer
        const speechSynthesizer = this.textSelectionHandler.speechSynthesizer;
        devLog('SpeechSynthesizer instance:', !!speechSynthesizer);
        
        if (speechSynthesizer) {
          const isReady = speechSynthesizer.isReady();
          devLog('SpeechSynthesizer ready:', isReady);
          
          if (isReady) {
            const voices = speechSynthesizer.getAvailableVoices();
            devLog('Retrieved voices from synthesizer:', voices.length);
            
            if (voices.length > 0) {
              // Convert to VoiceInfo format and send to background
              const voiceInfos = voices.map(voice => {
                try {
                  return {
                    ...voice,
                    displayName: this.formatVoiceName(voice),
                    languageDisplay: this.formatLanguage(voice.lang),
                    quality: this.determineVoiceQuality(voice),
                    gender: this.guessGender(voice.name),
                    engine: this.determineEngine(voice),
                    voiceURI: voice.name // Add missing property
                  };
                } catch (formatError) {
                  devLog('Error formatting voice:', voice.name, formatError);
                  return voice; // Return original voice if formatting fails
                }
              });
              
              devLog('Formatted voice data:', voiceInfos.length, 'voices');
              
              const response = await this.safeMessageToBackground({
                type: MessageType.UPDATE_VOICE_DATA,
                payload: { voices: voiceInfos }
              });
              
              devLog('Background response to voice update:', response);
              devLog('✅ Successfully sent voice data to background script:', voiceInfos.length, 'voices');
            } else {
              devLog('⚠️ No voices available from speech synthesizer');
            }
          } else {
            devLog('⚠️ Speech synthesizer not ready yet');
            // Retry after a delay
            setTimeout(() => {
              devLog('Retrying voice enumeration...');
              this.enumerateAndUpdateVoicesAsync();
            }, 1000);
          }
        } else {
          devLog('❌ Speech synthesizer not available');
        }
      } else {
        devLog('❌ speechSynthesis not available in content script context');
      }
    } catch (error) {
      devLog('❌ Error enumerating voices in content script:', error);
    }
  }

  private formatVoiceName(voice: { name: string; localService: boolean }): string {
    let name = voice.name;
    
    name = name.replace(/^Microsoft\s+/i, '');
    name = name.replace(/^Google\s+/i, '');
    name = name.replace(/^Apple\s+/i, '');
    
    if (!voice.localService) {
      name += ' (Online)';
    }
    
    return name;
  }

  private formatLanguage(langCode: string): string {
    const languageNames: Record<string, string> = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'en-AU': 'English (Australia)',
      'es-ES': 'Spanish (Spain)',
      'es-MX': 'Spanish (Mexico)',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese (Brazil)',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)'
    };
    
    return languageNames[langCode] || langCode;
  }

  private determineVoiceQuality(voice: { name: string; localService: boolean }): 'premium' | 'enhanced' | 'standard' | 'compact' {
    if (!voice.localService) return 'premium';
    if (voice.name.toLowerCase().includes('enhanced')) return 'enhanced';
    if (voice.name.toLowerCase().includes('compact')) return 'compact';
    return 'standard';
  }

  private guessGender(voiceName: string): 'male' | 'female' | 'neutral' {
    const name = voiceName.toLowerCase();
    
    const femaleIndicators = ['female', 'woman', 'girl', 'samantha', 'victoria', 
                             'kate', 'karen', 'nicole', 'jennifer', 'lisa'];
    const maleIndicators = ['male', 'man', 'boy', 'daniel', 'thomas', 'james', 
                           'robert', 'john', 'michael', 'david'];
    
    if (femaleIndicators.some(indicator => name.includes(indicator))) {
      return 'female';
    }
    if (maleIndicators.some(indicator => name.includes(indicator))) {
      return 'male';
    }
    
    return 'neutral';
  }

  private determineEngine(voice: { name: string }): string {
    const name = voice.name.toLowerCase();
    if (name.includes('microsoft')) return 'Microsoft';
    if (name.includes('google')) return 'Google';
    if (name.includes('apple')) return 'Apple';
    if (name.includes('amazon')) return 'Amazon';
    return 'System';
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
          // Handle async speakText calls
          (async () => {
            try {
              if (message.payload && typeof message.payload === 'object') {
                if ('fullPage' in message.payload && message.payload.fullPage) {
                  await this.speakFullPage();
                } else {
                  const text = 'text' in message.payload 
                    ? String(message.payload.text) 
                    : this.textSelectionHandler.getSelectedText();
                  await this.speakText(text);
                }
              } else {
                await this.speakText(this.textSelectionHandler.getSelectedText());
              }
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: (error as Error).message });
            }
          })();
          return true; // Keep message channel open for async response
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

  private async speakText(text: string) {
    if (!text) return;

    try {
      // Get the currently selected voice from background script
      const voiceResponse = await this.safeMessageToBackground({
        type: MessageType.GET_VOICE_DATA
      });
      
      const selectedVoice = (voiceResponse?.data as Record<string, unknown>)?.selectedVoice || null;

      // Use the unified Web Speech API flow through TextSelectionHandler
      // This ensures proper state tracking and stop functionality
      this.textSelectionHandler.handleMessage({
        type: MessageType.START_SPEECH,
        payload: { text, voice: selectedVoice }
      }, {} as chrome.runtime.MessageSender, () => {});

      // Visual feedback is now handled by the new TTS feedback system
    } catch (error) {
      console.error('Error getting voice data:', error);
      // Fallback to speaking without voice specification
      this.textSelectionHandler.handleMessage({
        type: MessageType.START_SPEECH,
        payload: { text }
      }, {} as chrome.runtime.MessageSender, () => {});
    }
  }

  public async speakFullPage() {
    // If TTS is already playing or paused, stop it first to restart from beginning
    if (this.textSelectionHandler.isTTSPlaying() || this.textSelectionHandler.isTTSPaused()) {
      devLog('[speakFullPage] TTS already active, stopping to restart from beginning');
      await this.textSelectionHandler.handleStopTTSShortcut();
      
      // Small delay to ensure stop is processed before starting new speech
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get main content (simplified version)
    const content = document.body.innerText
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .join('. ');

    devLog('[speakFullPage] Starting to read page content, length:', content.length);
    await this.speakText(content);
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

  private markAsDisconnected() {
    // Mark extension as disconnected to prevent further communication attempts
    if (!this.isDisconnected) {
      this.isDisconnected = true;
      devLog('[TTS] ContentScriptController marked as disconnected due to context invalidation');
      
      // Try to reconnect after a delay
      setTimeout(() => {
        this.attemptReconnection();
      }, 2000);
    }
  }

  private async attemptReconnection() {
    try {
      // Try a simple ping to background
      const response = await chrome.runtime.sendMessage({ type: MessageType.PING });
      if (response && response.pong) {
        this.isDisconnected = false;
        devLog('[TTS] ContentScriptController successfully reconnected to background');
      }
    } catch (error) {
      // Still disconnected, try again later
      devLog('[TTS] ContentScriptController reconnection failed, will retry');
      setTimeout(() => {
        this.attemptReconnection();
      }, 5000);
    }
  }

  private safeMessageToBackground(message: Message): Promise<MessageResponse> {
    // Safe wrapper for chrome.runtime.sendMessage that handles context invalidation
    if (this.isDisconnected) {
      devLog('[TTS] Skipping message to background - extension disconnected');
      return Promise.reject(new Error('Extension disconnected'));
    }

    return chrome.runtime.sendMessage(message).catch((error) => {
      const isContextError = error.message.includes('Extension context invalidated') || 
                            error.message.includes('Receiving end does not exist');
      
      if (isContextError) {
        this.markAsDisconnected();
        throw new Error('Extension context invalidated');
      }
      throw error;
    });
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
