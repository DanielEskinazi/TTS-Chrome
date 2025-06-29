import { MessageType, Message, MessageResponse } from '@common/types/messages';
// Temporary debug logging - replace devLog with console.log for debugging
const debugLog = (...args: unknown[]) => console.log('[TTS-Debug]', ...args);

interface SelectionData {
  text: string;
  url: string;
  title: string;
  timestamp: number;
}

class SelectionManager {
  private currentSelection: SelectionData | null = null;
  private activeTab: chrome.tabs.Tab | null = null;
  private contextMenuManager: ContextMenuManager | null = null;

  constructor() {
    this.init();
  }

  public setContextMenuManager(contextMenuManager: ContextMenuManager) {
    this.contextMenuManager = contextMenuManager;
  }

  private init() {
    // Listen for tab changes to clear selection
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    debugLog('Selection Manager initialized');
  }

  public handleSelectionMessage(request: Message, sender: chrome.runtime.MessageSender): Record<string, unknown> | null {
    switch (request.type) {
      case MessageType.SELECTION_CHANGED:
        if (request.payload && sender.tab) {
          this.updateSelection(request.payload, sender.tab);
        }
        return { success: true };
        
      case MessageType.SELECTION_CLEARED:
        this.clearSelection();
        return { success: true };
        
      case MessageType.GET_SELECTION:
        return {
          selection: this.currentSelection,
          tabId: this.activeTab?.id
        };
        
      case MessageType.SELECTION_ERROR:
        if (request.payload) {
          debugLog('Selection error reported:', request.payload);
        }
        return { success: true };
        
      default:
        return null; // Not handled by this manager
    }
  }

  private updateSelection(selectionData: Record<string, unknown>, tab: chrome.tabs.Tab) {
    if (typeof selectionData.text === 'string' && typeof selectionData.url === 'string') {
      this.currentSelection = {
        text: selectionData.text,
        url: selectionData.url,
        title: typeof selectionData.title === 'string' ? selectionData.title : '',
        timestamp: Date.now()
      };
      
      this.activeTab = tab;
      
      // Update context menu state
      this.updateContextMenuState();
      
      debugLog('Selection updated:', this.currentSelection.text.substring(0, 50) + '...');
    }
  }

  private clearSelection() {
    this.currentSelection = null;
    this.activeTab = null;
    
    // Update context menu state
    this.updateContextMenuState();
    
    debugLog('Selection cleared');
  }

  private updateContextMenuState() {
    const hasSelection = this.currentSelection !== null;
    
    // Update context menu state using the ContextMenuManager
    if (this.contextMenuManager) {
      this.contextMenuManager.updateMenuState(hasSelection);
    }
  }

  private handleTabChange(_activeInfo: chrome.tabs.TabActiveInfo) {
    // Clear selection when switching tabs
    this.clearSelection();
  }

  private handleTabUpdate(_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab) {
    // Clear selection when page reloads
    if (changeInfo.status === 'loading') {
      this.clearSelection();
    }
  }

  // Public methods for other components
  public hasSelection(): boolean {
    return this.currentSelection !== null;
  }

  public getSelectionText(): string {
    return this.currentSelection ? this.currentSelection.text : '';
  }

  public getSelectionInfo(): SelectionData | null {
    return this.currentSelection;
  }
}

class ContextMenuManager {
  private speakMenuId = 'tts-speak';
  private stopMenuId = 'tts-stop';
  private isMenuCreated = false;
  private selectionManager: SelectionManager;
  private ttsManager: TTSManager | null = null;

  constructor(selectionManager: SelectionManager) {
    this.selectionManager = selectionManager;
    this.init();
  }

  public setTTSManager(ttsManager: TTSManager) {
    this.ttsManager = ttsManager;
  }

  private init() {
    // Create context menu when extension loads
    chrome.runtime.onStartup.addListener(() => this.createContextMenu());
    chrome.runtime.onInstalled.addListener(() => this.createContextMenu());
    
    // Listen for context menu clicks
    if (chrome.contextMenus && chrome.contextMenus.onClicked) {
      chrome.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));
    }
    
    debugLog('Context Menu Manager initialized');
  }

  public createContextMenu() {
    try {
      if (chrome.contextMenus) {
        // Remove existing menu if present
        if (this.isMenuCreated) {
          chrome.contextMenus.removeAll(() => {
            this.createMenu();
          });
        } else {
          this.createMenu();
        }
      } else {
        debugLog('Warning: chrome.contextMenus API not available');
      }
    } catch (error) {
      debugLog('Error in createContextMenu:', error);
    }
  }

  private createMenu() {
    // Create "Speak" menu item
    chrome.contextMenus.create({
      id: this.speakMenuId,
      title: 'Speak',
      contexts: ['selection'],
      enabled: false, // Initially disabled
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error creating speak menu:', chrome.runtime.lastError);
        return;
      }
      
      // Create "Stop Speaking" menu item
      chrome.contextMenus.create({
        id: this.stopMenuId,
        title: 'Stop Speaking',
        contexts: ['page', 'selection'],
        enabled: false, // Initially disabled
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      }, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error creating stop menu:', chrome.runtime.lastError);
        } else {
          this.isMenuCreated = true;
          debugLog('TTS context menus created successfully');
          this.syncMenuWithCurrentState();
        }
      });
    });
  }

  private async syncMenuWithCurrentState() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: MessageType.GET_SELECTION })
          .then(response => {
            if (response && response.hasSelection) {
              this.updateMenuState(true);
            }
          })
          .catch(error => {
            debugLog('Could not sync menu state:', error);
          });
      }
    } catch (error) {
      debugLog('Error syncing menu state:', error);
    }
  }

  private async handleMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
    try {
      switch (info.menuItemId) {
        case this.speakMenuId:
          if (tab?.id) {
            await this.triggerTTS(info, tab);
          }
          break;
          
        case this.stopMenuId:
          if (tab?.id) {
            await this.stopTTS(tab);
          }
          break;
          
        default:
          debugLog('Unknown menu item clicked:', info.menuItemId);
      }
    } catch (error) {
      debugLog('Error handling menu click:', error);
      if (tab?.id) {
        this.showErrorFeedback(tab, error as Error);
      }
    }
  }

  private async triggerTTS(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) {
    try {
      // Validate tab and selection
      if (!tab || !tab.id) {
        throw new Error('Invalid tab information');
      }

      // Get fresh selection data
      const response = await this.getSelectionFromTab(tab.id);
      
      if (!response || !response.hasSelection) {
        // Fallback to context menu selection text
        if (!info.selectionText) {
          throw new Error('No text selected');
        }
      }

      const textToSpeak = response?.text || info.selectionText || '';
      
      // Validate text content
      if (!textToSpeak || !this.isValidTextForTTS(textToSpeak)) {
        throw new Error('Selected text is not suitable for TTS');
      }

      // Start TTS with retry logic
      await this.startTTSWithRetry(textToSpeak, tab);
      
      this.showTTSFeedback(tab, 'started');
      
    } catch (error) {
      debugLog('TTS trigger error:', error);
      this.handleTTSError(error as Error, tab);
    }
  }

  private async stopTTS(tab: chrome.tabs.Tab) {
    try {
      // Stop TTS using the TTS manager
      if (this.ttsManager) {
        await this.ttsManager.stopTTS();
      }
      
      // Show stop feedback
      this.showStopFeedback(tab);
      
      debugLog('TTS stopped via context menu');
      
    } catch (error) {
      debugLog('Error stopping TTS:', error);
      throw error;
    }
  }

  private showStopFeedback(tab: chrome.tabs.Tab) {
    chrome.tabs.sendMessage(tab.id!, {
      type: MessageType.TTS_FEEDBACK,
      payload: { status: 'stopped' }
    }).catch(error => {
      debugLog('Could not send stop feedback to tab:', error);
    });
  }

  private showErrorFeedback(tab: chrome.tabs.Tab, error: Error) {
    chrome.tabs.sendMessage(tab.id!, {
      type: MessageType.TTS_FEEDBACK,
      payload: { 
        status: 'error',
        message: error.message 
      }
    }).catch(error => {
      debugLog('Could not send error feedback to tab:', error);
    });
  }

  private async getSelectionFromTab(tabId: number, retries = 2): Promise<{ hasSelection: boolean; text?: string; info?: unknown }> {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: MessageType.GET_SELECTION
        });
        return response;
      } catch (error) {
        if (i === retries) {
          throw new Error('Could not communicate with tab');
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    // This should never be reached, but TypeScript needs it
    throw new Error('Could not communicate with tab');
  }

  private isValidTextForTTS(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    const cleanText = text.trim();
    if (cleanText.length === 0) return false;
    if (cleanText.length > 10000) return false; // Reasonable limit
    
    // Check for readable content
    const readableChars = cleanText.replace(/[^\w\s]/g, '').length;
    return readableChars > 0;
  }

  private async startTTSWithRetry(text: string, tab: chrome.tabs.Tab, retries = 1): Promise<void> {
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.startTTS(text, tab);
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  private async startTTS(text: string, tab: chrome.tabs.Tab): Promise<void> {
    // Send message to start TTS using Web Speech API in content script
    return chrome.tabs.sendMessage(tab.id!, {
      type: MessageType.START_SPEECH,
      payload: { text: text }
    });
  }

  private showTTSFeedback(tab: chrome.tabs.Tab, status: string) {
    // Send feedback to content script for user notification
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: MessageType.TTS_FEEDBACK,
        payload: { status: status }
      }).catch(error => {
        debugLog('Could not send feedback to tab:', error);
      });
    }
  }

  private handleTTSError(error: Error, tab: chrome.tabs.Tab) {
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case 'no-selection':
        this.showTTSFeedback(tab, 'no-selection');
        break;
      case 'invalid-text':
        this.showTTSFeedback(tab, 'invalid-text');
        break;
      case 'communication-error':
        this.showTTSFeedback(tab, 'communication-error');
        break;
      default:
        this.showTTSFeedback(tab, 'error');
    }
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('no text selected') || message.includes('selection no longer available')) {
      return 'no-selection';
    }
    if (message.includes('not suitable for tts') || message.includes('invalid text')) {
      return 'invalid-text';
    }
    if (message.includes('communicate with tab') || message.includes('invalid tab')) {
      return 'communication-error';
    }
    
    return 'unknown';
  }

  public updateMenuState(hasSelection: boolean) {
    if (!this.isMenuCreated) return;

    const isPlaying = this.ttsManager ? Boolean(this.ttsManager.getState().isActive) : false;

    // Update speak menu (enabled when text is selected and not playing)
    const speakMenuProperties = {
      enabled: hasSelection && !isPlaying,
      title: hasSelection ? 'Speak' : 'Speak (select text first)'
    };

    // Update stop menu (enabled when playing)
    const stopMenuProperties = {
      enabled: isPlaying
    };

    try {
      chrome.contextMenus.update(this.speakMenuId, speakMenuProperties, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error updating speak menu:', chrome.runtime.lastError);
        }
      });

      chrome.contextMenus.update(this.stopMenuId, stopMenuProperties, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error updating stop menu:', chrome.runtime.lastError);
        } else {
          debugLog('Context menus updated - speak:', speakMenuProperties.enabled, 'stop:', stopMenuProperties.enabled);
        }
      });
    } catch (error) {
      debugLog('Error in updateMenuState:', error);
    }
  }

  public updateMenusForTTSState(state: string) {
    if (!this.isMenuCreated) return;

    const isPlaying = (state === 'started' || state === 'resumed');
    const hasSelection = this.selectionManager.hasSelection();

    // Update speak menu (enabled when text is selected and not playing)
    chrome.contextMenus.update(this.speakMenuId, {
      enabled: hasSelection && !isPlaying
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error updating speak menu:', chrome.runtime.lastError);
      }
    });

    // Update stop menu (enabled when playing)
    chrome.contextMenus.update(this.stopMenuId, {
      enabled: isPlaying
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error updating stop menu:', chrome.runtime.lastError);
      }
    });

    debugLog('Menus updated for TTS state:', state, 'playing:', isPlaying);
  }

  public destroy() {
    if (this.isMenuCreated && chrome.contextMenus) {
      chrome.contextMenus.removeAll();
      this.isMenuCreated = false;
    }
  }
}

class TTSManager {
  private isActive = false;
  private currentTabId: number | null = null;
  private stopTimeout: NodeJS.Timeout | null = null;
  private forceStopAttempts = 0;
  private contextMenuManager: ContextMenuManager | null = null;

  constructor() {
    this.init();
  }

  public setContextMenuManager(contextMenuManager: ContextMenuManager) {
    this.contextMenuManager = contextMenuManager;
  }

  private init(): void {
    // Stop TTS when tab changes
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    
    console.log('TTS Manager initialized with tab navigation listeners');
  }

  async handleMessage(request: Message, sender: chrome.runtime.MessageSender): Promise<Record<string, unknown>> {
    switch (request.type) {
      case MessageType.START_TTS:
        return await this.startTTS(request.payload, sender);
        
      case MessageType.STOP_TTS:
        return await this.stopTTS(request.payload);
        
      case MessageType.FORCE_STOP_TTS:
        return await this.forceStopTTS();
        
      case MessageType.PAUSE_TTS:
        return await this.pauseTTS();
        
      case MessageType.RESUME_TTS:
        return await this.resumeTTS();
        
      case MessageType.TTS_STATE_CHANGED:
        return this.handleStateChange(request.payload || {}, sender);
        
      case MessageType.TTS_ERROR:
        return this.handleTTSError(request.payload || {});

      case MessageType.GET_TTS_STATE:
        return this.getState();
        
      default:
        throw new Error('Unknown TTS message type');
    }
  }

  private async startTTS(data: Record<string, unknown> | undefined, sender: chrome.runtime.MessageSender): Promise<Record<string, unknown>> {
    try {
      if (!data || typeof data.text !== 'string') {
        throw new Error('No text provided for TTS');
      }

      const { text } = data;
      const tabId = typeof data.tabId === 'number' ? data.tabId : sender.tab?.id;
      
      if (!tabId) {
        throw new Error('No tab ID available for TTS');
      }

      // Stop any existing TTS first
      if (this.isActive) {
        await this.stopTTS({ source: 'new-request' });
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Reset force stop attempts
      this.forceStopAttempts = 0;

      // Send speech command to content script
      await chrome.tabs.sendMessage(tabId, {
        type: MessageType.START_SPEECH,
        payload: { text: text }
      });

      this.isActive = true;
      this.currentTabId = tabId;
      
      // Set up automatic stop timeout for very long text
      this.setStopTimeout();
      
      console.log('TTS started for text:', text.substring(0, 50) + '...');
      
      return { success: true };
    } catch (error) {
      console.error('Error starting TTS:', error);
      throw error;
    }
  }

  public async stopTTS(options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const { source = 'manual', force = false } = options;
    
    try {
      if (!this.isActive && !force) {
        console.log('TTS is not active, ignoring stop request');
        return { success: true };
      }

      // Clear the stop timeout
      this.clearStopTimeout();

      if (this.currentTabId) {
        // Send stop command to content script
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.STOP_SPEECH,
          payload: { source: source }
        }).catch(error => {
          console.warn('Could not send stop message to tab:', error);
          // Tab might be closed or unresponsive, continue with cleanup
        });
      }

      // Reset state
      this.isActive = false;
      this.currentTabId = null;
      
      // Broadcast stop state
      this.broadcastStateChange('stopped', { isPlaying: false });
      
      console.log('TTS stopped, source:', source);
      
      return { success: true };
    } catch (error) {
      console.error('Error stopping TTS:', error);
      
      // Force cleanup even if stop failed
      this.forceCleanup();
      throw error;
    }
  }

  private async pauseTTS(): Promise<Record<string, unknown>> {
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.PAUSE_SPEECH
        });
      } catch (error) {
        console.error('Error pausing TTS:', error);
      }
    }
    return { success: true };
  }

  private async resumeTTS(): Promise<Record<string, unknown>> {
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.RESUME_SPEECH
        });
      } catch (error) {
        console.error('Error resuming TTS:', error);
      }
    }
    return { success: true };
  }

  private async forceStopTTS(): Promise<Record<string, unknown>> {
    console.log('Force stopping TTS');
    
    this.forceStopAttempts++;
    
    try {
      // Clear any timeouts
      this.clearStopTimeout();
      
      // Send force stop to content script
      if (this.currentTabId) {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.FORCE_STOP
        }).catch(error => {
          console.warn('Could not send force stop to tab:', error);
        });
      }
      
      // Force cleanup
      this.forceCleanup();
      
      // If we've tried multiple times, show error notification
      if (this.forceStopAttempts > 2) {
        this.showForceStopNotification();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error force stopping TTS:', error);
      this.forceCleanup();
      throw error;
    }
  }

  private forceCleanup() {
    // Aggressively clean up state
    this.isActive = false;
    this.currentTabId = null;
    this.clearStopTimeout();
    
    // Broadcast stopped state
    this.broadcastStateChange('stopped', { isPlaying: false });
    
    console.log('TTS force cleanup completed');
  }

  private setStopTimeout() {
    // Automatically stop TTS after 10 minutes to prevent runaway speech
    this.stopTimeout = setTimeout(() => {
      console.warn('TTS auto-stop timeout reached');
      this.stopTTS({ source: 'timeout', force: true });
    }, 10 * 60 * 1000); // 10 minutes
  }

  private clearStopTimeout() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  private handleStateChange(data: Record<string, unknown>, sender?: chrome.runtime.MessageSender): Record<string, unknown> {
    const state = data.state as string;
    
    switch (state) {
      case 'started':
        this.isActive = true;
        // Set currentTabId from the message sender
        if (sender?.tab?.id) {
          this.currentTabId = sender.tab.id;
        } else if (!this.currentTabId) {
          // Fallback to active tab if sender doesn't have tab info
          chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs[0]?.id) {
              this.currentTabId = tabs[0].id;
            }
          }).catch(error => {
            console.warn('Could not get active tab:', error);
          });
        }
        break;
        
      case 'ended':
      case 'stopped':
        this.isActive = false;
        this.currentTabId = null;
        this.clearStopTimeout();
        break;
        
      case 'paused':
      case 'resumed':
        // State remains active
        break;
        
      case 'error':
        // Handle error state
        this.forceCleanup();
        break;
    }
    
    // Update context menu state
    if (this.contextMenuManager) {
      this.contextMenuManager.updateMenusForTTSState(state);
    }
    
    // Broadcast state change to interested parties (popup, etc.)
    this.broadcastStateChange(state, data.playbackState as Record<string, unknown> || {});
    
    return { success: true };
  }

  private handleTTSError(errorData: Record<string, unknown>): Record<string, unknown> {
    console.error('TTS Error:', errorData);
    
    // Reset state on error
    this.isActive = false;
    this.currentTabId = null;
    
    // Show error notification if possible
    this.showErrorNotification(errorData);
    
    return { success: true };
  }

  private broadcastStateChange(state: string, playbackState: Record<string, unknown>): void {
    // Send to popup if open
    chrome.runtime.sendMessage({
      type: MessageType.TTS_STATE_CHANGED,
      payload: { state, playbackState }
    }).catch(() => {
      // Popup may not be open, ignore error
    });
  }

  private showErrorNotification(errorData: Record<string, unknown>): void {
    // Show browser notification for critical errors
    const errorType = errorData.errorType as string;
    if (errorType === 'initialization' || errorType === 'permission') {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'TTS Error',
        message: 'Text-to-Speech functionality is not available. Please check your browser settings.'
      });
    }
  }

  private showForceStopNotification() {
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'TTS Force Stop',
      message: 'Text-to-Speech has been force stopped due to multiple stop attempts.'
    });
  }

  // Tab change handlers
  private handleTabChange(activeInfo: chrome.tabs.TabActiveInfo) {
    // Stop TTS when switching tabs
    if (this.isActive && this.currentTabId !== activeInfo.tabId) {
      this.stopTTS({ source: 'navigation' });
    }
  }

  private handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab) {
    // Stop TTS when page reloads or navigates
    if (changeInfo.status === 'loading' && this.currentTabId === tabId) {
      this.stopTTS({ source: 'navigation' });
    }
  }

  private handleTabRemoved(tabId: number, _removeInfo: chrome.tabs.TabRemoveInfo) {
    // Clean up if the tab with active TTS is closed
    if (this.currentTabId === tabId) {
      this.forceCleanup();
    }
  }

  // Public API methods
  getState(): Record<string, unknown> {
    return {
      isActive: this.isActive,
      currentTabId: this.currentTabId,
      forceStopAttempts: this.forceStopAttempts,
      hasTimeout: this.stopTimeout !== null
    };
  }
}

// Initialize selection manager and context menu manager with error handling
let selectionManager: SelectionManager;
let contextMenuManager: ContextMenuManager;
let ttsManager: TTSManager;

try {
  selectionManager = new SelectionManager();
  contextMenuManager = new ContextMenuManager(selectionManager);
  ttsManager = new TTSManager();
  
  // Link the managers for bi-directional communication
  selectionManager.setContextMenuManager(contextMenuManager);
  contextMenuManager.setTTSManager(ttsManager);
  ttsManager.setContextMenuManager(contextMenuManager);
  
  console.log('Background script loaded and ready');
  debugLog('Service worker started successfully');
} catch (error) {
  console.error('Failed to initialize background script:', error);
  debugLog('Service worker initialization failed:', error);
}

// Service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  debugLog('Extension installed:', details.reason);

  // Set default values on install
  if (details.reason === 'install') {
    try {
      chrome.storage.sync.set({
        enabled: true,
        theme: 'light',
        fontSize: 16,
      });
    } catch (error) {
      debugLog('Error setting default storage values:', error);
    }
  }

  // Context menu is now managed by ContextMenuManager
});

// Message handler
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
    console.log('Background received message:', message, 'from:', sender);
    debugLog('Background received message:', message, 'from:', sender);

    // Try selection manager first (with safety check)
    if (selectionManager) {
      const selectionResponse = selectionManager.handleSelectionMessage(message, sender);
      if (selectionResponse !== null) {
        sendResponse({ success: true, data: selectionResponse });
        return true;
      }
    }

    // Try TTS manager for TTS-related messages
    if (ttsManager) {
      try {
        if ([MessageType.START_TTS, MessageType.STOP_TTS, MessageType.FORCE_STOP_TTS, MessageType.PAUSE_TTS, 
             MessageType.RESUME_TTS, MessageType.TTS_STATE_CHANGED, MessageType.TTS_ERROR, MessageType.GET_TTS_STATE].includes(message.type)) {
          ttsManager.handleMessage(message, sender)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Will respond asynchronously
        }
      } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
        return true;
      }
    }

    // Handle other message types
    switch (message.type) {
      case MessageType.GET_STATE:
        handleGetState(sendResponse);
        return true; // Will respond asynchronously

      case MessageType.UPDATE_SETTINGS:
        if (message.payload) {
          handleUpdateSettings(message.payload, sendResponse);
        } else {
          sendResponse({ success: false, error: 'No settings provided' });
        }
        return true;

      case MessageType.SPEAK_TEXT:
        if (message.payload && typeof message.payload === 'object' && 'text' in message.payload) {
          handleSpeakText(message.payload as { text: string }, sendResponse);
        } else {
          sendResponse({ success: false, error: 'No text provided' });
        }
        return true;

      case MessageType.CONTENT_READY:
        // Content script is ready, could initialize selection state here if needed
        sendResponse({ success: true });
        return true;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
        return false;
    }
  }
);

// Context menu click handling is now managed by ContextMenuManager

// Alarm for periodic tasks with safety check
try {
  if (chrome.alarms && chrome.alarms.create) {
    chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'heartbeat') {
        debugLog('Heartbeat alarm triggered');
        // Perform periodic tasks
      }
    });
  } else {
    debugLog('Warning: chrome.alarms API not available');
  }
} catch (error) {
  debugLog('Error setting up alarms:', error);
}

// Handler functions
async function handleGetState(sendResponse: (response: MessageResponse) => void) {
  try {
    const state = await chrome.storage.sync.get(['enabled', 'theme', 'fontSize']);
    sendResponse({ success: true, data: state });
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message });
  }
}

async function handleUpdateSettings(
  settings: Record<string, unknown>,
  sendResponse: (response: MessageResponse) => void
) {
  try {
    await chrome.storage.sync.set(settings);
    // Notify all tabs about settings change
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: MessageType.SETTINGS_UPDATED,
          payload: settings,
        });
      }
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message });
  }
}

async function handleSpeakText(
  payload: { text: string },
  sendResponse: (response: MessageResponse) => void
) {
  try {
    debugLog('handleSpeakText called with payload:', payload);
    
    // Check if TTS API is available
    if (!chrome.tts) {
      const error = 'TTS API not available';
      debugLog('Error:', error);
      sendResponse({ success: false, error });
      return;
    }
    
    // Check if we have voices available
    chrome.tts.getVoices((voices) => {
      debugLog('Available TTS voices:', voices.length);
      if (voices.length === 0) {
        debugLog('Warning: No TTS voices available');
      } else {
        debugLog('Sample voices:', voices.slice(0, 3).map(v => v.voiceName));
      }
    });
    
    debugLog('Calling chrome.tts.speak with text:', payload.text.substring(0, 50) + '...');
    
    // Simplified TTS call to avoid callback issues that might crash the service worker
    chrome.tts.speak(payload.text, {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    });
    
    // Send immediate success response
    debugLog('TTS speak called successfully');
    sendResponse({ success: true });
    
  } catch (error) {
    const errorMessage = (error as Error).message;
    debugLog('Exception in handleSpeakText:', error);
    sendResponse({ success: false, error: errorMessage });
  }
}

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  debugLog('Port connected:', port.name);
  port.onDisconnect.addListener(() => {
    debugLog('Port disconnected:', port.name);
  });
});
