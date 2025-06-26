import { MessageType, Message, MessageResponse } from '@common/types/messages';
import { devLog } from '@common/dev-utils';

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
    
    devLog('Selection Manager initialized');
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
          devLog('Selection error reported:', request.payload);
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
      
      devLog('Selection updated:', this.currentSelection.text.substring(0, 50) + '...');
    }
  }

  private clearSelection() {
    this.currentSelection = null;
    this.activeTab = null;
    
    // Update context menu state
    this.updateContextMenuState();
    
    devLog('Selection cleared');
  }

  private updateContextMenuState() {
    const hasSelection = this.currentSelection !== null;
    
    // Update context menu visibility/state
    try {
      chrome.contextMenus.update('tts-speak', {
        enabled: hasSelection,
        title: hasSelection ? 'Speak Selected Text' : 'Speak Selected Text (No selection)'
      });
    } catch (error) {
      devLog('Error updating context menu:', error);
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

// Initialize selection manager
const selectionManager = new SelectionManager();

// Service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  devLog('Extension installed:', details.reason);

  // Set default values on install
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      enabled: true,
      theme: 'light',
      fontSize: 16,
    });
  }

  // Create context menu items
  chrome.contextMenus.create({
    id: 'tts-speak',
    title: 'Speak Selected Text',
    contexts: ['selection'],
    enabled: false, // Initially disabled until text is selected
  });
});

// Message handler
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
    devLog('Background received message:', message, 'from:', sender);

    // Try selection manager first
    const selectionResponse = selectionManager.handleSelectionMessage(message, sender);
    if (selectionResponse !== null) {
      sendResponse({ success: true, data: selectionResponse });
      return true;
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

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'tts-speak' && tab?.id) {
    // Use current selection from selection manager or fallback to context menu selection
    const currentSelectionText = selectionManager.getSelectionText();
    const textToSpeak = currentSelectionText || info.selectionText;
    
    if (textToSpeak) {
      chrome.tabs.sendMessage(tab.id, {
        type: MessageType.SPEAK_SELECTION,
        payload: { text: textToSpeak },
      });
    }
  }
});

// Alarm for periodic tasks
chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') {
    devLog('Heartbeat alarm triggered');
    // Perform periodic tasks
  }
});

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
    await chrome.tts.speak(payload.text, {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      onEvent: (event) => {
        devLog('TTS Event:', event);
      },
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  devLog('Port connected:', port.name);
  port.onDisconnect.addListener(() => {
    devLog('Port disconnected:', port.name);
  });
});
