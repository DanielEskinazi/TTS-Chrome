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

  constructor() {
    this.init();
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
    
    // Update context menu visibility/state with safety check
    try {
      if (chrome.contextMenus && chrome.contextMenus.update) {
        chrome.contextMenus.update('tts-speak', {
          enabled: hasSelection,
          title: hasSelection ? 'Speak Selected Text' : 'Speak Selected Text (No selection)'
        });
      }
    } catch (error) {
      debugLog('Error updating context menu:', error);
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

// Initialize selection manager with error handling
let selectionManager: SelectionManager;
try {
  selectionManager = new SelectionManager();
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

  // Create context menu items with safety check
  try {
    if (chrome.contextMenus && chrome.contextMenus.create) {
      chrome.contextMenus.create({
        id: 'tts-speak',
        title: 'Speak Selected Text',
        contexts: ['selection'],
        enabled: false, // Initially disabled until text is selected
      });
      debugLog('Context menu created successfully');
    } else {
      debugLog('Warning: chrome.contextMenus API not available');
    }
  } catch (error) {
    debugLog('Error creating context menu:', error);
  }
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

// Context menu handler with safety check
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'tts-speak' && tab?.id) {
      // Use current selection from selection manager or fallback to context menu selection
      const currentSelectionText = selectionManager?.getSelectionText() || '';
      const textToSpeak = currentSelectionText || info.selectionText;
      
      if (textToSpeak) {
        chrome.tabs.sendMessage(tab.id, {
          type: MessageType.SPEAK_SELECTION,
          payload: { text: textToSpeak },
        });
      }
    }
  });
} else {
  debugLog('Warning: chrome.contextMenus.onClicked not available');
}

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
