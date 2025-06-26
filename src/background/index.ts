import { MessageType, Message, MessageResponse } from '@common/types/messages';
import { devLog } from '@common/dev-utils';

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
  });
});

// Message handler
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
    devLog('Background received message:', message, 'from:', sender);

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

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
        return false;
    }
  }
);

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'tts-speak' && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: MessageType.SPEAK_SELECTION,
      payload: { text: info.selectionText },
    });
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
