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
  private menuId = 'tts-speak';
  private isMenuCreated = false;
  private selectionManager: SelectionManager;

  constructor(selectionManager: SelectionManager) {
    this.selectionManager = selectionManager;
    this.init();
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
    chrome.contextMenus.create({
      id: this.menuId,
      title: 'Speak',
      contexts: ['selection'],
      enabled: false, // Initially disabled
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error creating context menu:', chrome.runtime.lastError);
      } else {
        this.isMenuCreated = true;
        debugLog('TTS context menu created successfully');
        this.syncMenuWithCurrentState();
      }
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
    if (info.menuItemId === this.menuId && tab?.id) {
      await this.triggerTTS(info, tab);
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
    // Send message to start TTS
    return chrome.tabs.sendMessage(tab.id!, {
      type: MessageType.SPEAK_SELECTION,
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

    const menuProperties = {
      enabled: hasSelection,
      title: hasSelection ? 'Speak' : 'Speak (select text first)'
    };

    try {
      chrome.contextMenus.update(this.menuId, menuProperties, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error updating context menu:', chrome.runtime.lastError);
        } else {
          debugLog('Context menu updated:', hasSelection ? 'enabled' : 'disabled');
        }
      });
    } catch (error) {
      debugLog('Error in updateMenuState:', error);
    }
  }

  public destroy() {
    if (this.isMenuCreated && chrome.contextMenus) {
      chrome.contextMenus.removeAll();
      this.isMenuCreated = false;
    }
  }
}

// Initialize selection manager and context menu manager with error handling
let selectionManager: SelectionManager;
let contextMenuManager: ContextMenuManager;

try {
  selectionManager = new SelectionManager();
  contextMenuManager = new ContextMenuManager(selectionManager);
  
  // Link the managers for bi-directional communication
  selectionManager.setContextMenuManager(contextMenuManager);
  
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
