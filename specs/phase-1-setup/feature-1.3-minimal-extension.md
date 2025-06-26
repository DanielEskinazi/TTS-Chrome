# Feature 1.3: Minimal Extension Structure

**Status: ✅ COMPLETED** | **Completed Date: 2025-06-26** | **Commit: e788fae** | **Assignee: Claude** | **Git Tag: feature-1.3-completed**

## Feature Overview and Objectives

### Overview
Create a minimal but functional Chrome Extension that demonstrates the basic architecture and communication patterns between all extension components. This serves as the foundation for building more complex features while ensuring all core extension APIs and patterns are working correctly.

### Objectives
- Implement basic background service worker functionality
- Create functional popup interface with basic UI
- Establish content script injection and communication
- Set up message passing between all components
- Implement basic storage operations
- Create minimal options page
- Ensure all components can communicate effectively

## Technical Requirements

### Background Service Worker
- Handle extension lifecycle events
- Manage message routing between components
- Implement basic context menu functionality
- Handle chrome.runtime API calls
- Set up alarm API for periodic tasks

### Popup Interface
- Basic HTML structure with TypeScript
- Communication with background script
- Display extension state
- Basic interactive elements
- Chrome storage integration

### Content Script
- Safe injection into web pages
- DOM manipulation capabilities
- Message passing to background
- Event listener setup
- Isolated script execution

### Options Page
- Settings storage and retrieval
- Basic form handling
- Sync with chrome.storage
- User preference management

### Message Passing Architecture
- Typed message system
- Request/response patterns
- Error handling
- Message validation

## Implementation Steps

### Step 1: Create Background Service Worker
Create `src/background/index.ts`:
```typescript
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
        handleUpdateSettings(message.payload, sendResponse);
        return true;
        
      case MessageType.SPEAK_TEXT:
        handleSpeakText(message.payload, sendResponse);
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
    sendResponse({ success: false, error: error.message });
  }
}

async function handleUpdateSettings(
  settings: any,
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
    sendResponse({ success: false, error: error.message });
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
    sendResponse({ success: false, error: error.message });
  }
}

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  devLog('Port connected:', port.name);
  port.onDisconnect.addListener(() => {
    devLog('Port disconnected:', port.name);
  });
});
```

### Step 2: Create Message Types
Create `src/common/types/messages.ts`:
```typescript
export enum MessageType {
  // State management
  GET_STATE = 'GET_STATE',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  
  // TTS operations
  SPEAK_TEXT = 'SPEAK_TEXT',
  SPEAK_SELECTION = 'SPEAK_SELECTION',
  STOP_SPEAKING = 'STOP_SPEAKING',
  
  // Content script
  CONTENT_READY = 'CONTENT_READY',
  HIGHLIGHT_TEXT = 'HIGHLIGHT_TEXT',
}

export interface Message {
  type: MessageType;
  payload?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Type guards
export function isMessage(obj: any): obj is Message {
  return obj && typeof obj.type === 'string' && obj.type in MessageType;
}

export function isMessageResponse(obj: any): obj is MessageResponse {
  return obj && typeof obj.success === 'boolean';
}
```

### Step 3: Create Popup Interface
Create `src/popup/popup.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TTS Extension</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Text to Speech</h1>
      <div class="status-indicator" id="status"></div>
    </header>
    
    <main class="popup-content">
      <section class="quick-actions">
        <button id="toggleEnabled" class="btn btn-primary">
          <span class="btn-icon">🔊</span>
          <span class="btn-text">Enable TTS</span>
        </button>
        
        <button id="speakPage" class="btn btn-secondary">
          <span class="btn-icon">📄</span>
          <span class="btn-text">Read Page</span>
        </button>
      </section>
      
      <section class="test-area">
        <textarea 
          id="testText" 
          placeholder="Enter text to test TTS..."
          rows="3"
        ></textarea>
        <button id="testSpeak" class="btn btn-small">Test Speech</button>
      </section>
      
      <section class="settings-preview">
        <div class="setting-item">
          <label>Font Size:</label>
          <span id="fontSizeValue">16px</span>
        </div>
        <div class="setting-item">
          <label>Theme:</label>
          <span id="themeValue">Light</span>
        </div>
      </section>
    </main>
    
    <footer class="popup-footer">
      <a href="#" id="openOptions">Settings</a>
      <span class="version">v0.1.0</span>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Create `src/popup/popup.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 350px;
  min-height: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #333;
  background: #f5f5f5;
}

.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.popup-header {
  background: #fff;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-header h1 {
  font-size: 18px;
  font-weight: 600;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
  transition: background 0.3s;
}

.status-indicator.inactive {
  background: #f44336;
}

.popup-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #fff;
  color: #333;
  border: 1px solid #e0e0e0;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-small {
  padding: 8px 16px;
  font-size: 13px;
}

.btn-icon {
  font-size: 24px;
}

.test-area {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.test-area textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  resize: none;
  margin-bottom: 8px;
  font-family: inherit;
}

.test-area textarea:focus {
  outline: none;
  border-color: #2196f3;
}

.settings-preview {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid #f0f0f0;
}

.setting-item label {
  font-weight: 500;
  color: #666;
}

.popup-footer {
  background: #fff;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-footer a {
  color: #2196f3;
  text-decoration: none;
  font-weight: 500;
}

.popup-footer a:hover {
  text-decoration: underline;
}

.version {
  color: #999;
  font-size: 12px;
}
```

Create `src/popup/index.ts`:
```typescript
import { MessageType, Message } from '@common/types/messages';
import { devLog } from '@common/dev-utils';

class PopupController {
  private elements: {
    toggleEnabled: HTMLButtonElement;
    speakPage: HTMLButtonElement;
    testText: HTMLTextAreaElement;
    testSpeak: HTMLButtonElement;
    openOptions: HTMLAnchorElement;
    status: HTMLDivElement;
    fontSizeValue: HTMLSpanElement;
    themeValue: HTMLSpanElement;
  };
  
  private state = {
    enabled: true,
    fontSize: 16,
    theme: 'light' as 'light' | 'dark',
  };
  
  constructor() {
    this.elements = {
      toggleEnabled: document.getElementById('toggleEnabled') as HTMLButtonElement,
      speakPage: document.getElementById('speakPage') as HTMLButtonElement,
      testText: document.getElementById('testText') as HTMLTextAreaElement,
      testSpeak: document.getElementById('testSpeak') as HTMLButtonElement,
      openOptions: document.getElementById('openOptions') as HTMLAnchorElement,
      status: document.getElementById('status') as HTMLDivElement,
      fontSizeValue: document.getElementById('fontSizeValue') as HTMLSpanElement,
      themeValue: document.getElementById('themeValue') as HTMLSpanElement,
    };
    
    this.initialize();
  }
  
  private async initialize() {
    await this.loadState();
    this.setupEventListeners();
    this.updateUI();
  }
  
  private async loadState() {
    const message: Message = { type: MessageType.GET_STATE };
    const response = await chrome.runtime.sendMessage(message);
    
    if (response.success) {
      this.state = { ...this.state, ...response.data };
      devLog('State loaded:', this.state);
    }
  }
  
  private setupEventListeners() {
    this.elements.toggleEnabled.addEventListener('click', () => this.toggleEnabled());
    this.elements.speakPage.addEventListener('click', () => this.speakCurrentPage());
    this.elements.testSpeak.addEventListener('click', () => this.testSpeech());
    this.elements.openOptions.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    
    // Listen for settings updates
    chrome.runtime.onMessage.addListener((message: Message) => {
      if (message.type === MessageType.SETTINGS_UPDATED) {
        this.state = { ...this.state, ...message.payload };
        this.updateUI();
      }
    });
  }
  
  private async toggleEnabled() {
    this.state.enabled = !this.state.enabled;
    
    const message: Message = {
      type: MessageType.UPDATE_SETTINGS,
      payload: { enabled: this.state.enabled },
    };
    
    await chrome.runtime.sendMessage(message);
    this.updateUI();
  }
  
  private async speakCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: MessageType.SPEAK_SELECTION,
        payload: { fullPage: true },
      });
    }
  }
  
  private async testSpeech() {
    const text = this.elements.testText.value.trim();
    
    if (!text) {
      this.elements.testText.placeholder = 'Please enter some text...';
      return;
    }
    
    const message: Message = {
      type: MessageType.SPEAK_TEXT,
      payload: { text },
    };
    
    const response = await chrome.runtime.sendMessage(message);
    
    if (response.success) {
      this.elements.testText.value = '';
      this.elements.testText.placeholder = 'Speaking...';
      
      setTimeout(() => {
        this.elements.testText.placeholder = 'Enter text to test TTS...';
      }, 2000);
    }
  }
  
  private updateUI() {
    // Update button text and status
    this.elements.toggleEnabled.querySelector('.btn-text')!.textContent = 
      this.state.enabled ? 'Disable TTS' : 'Enable TTS';
    
    this.elements.status.classList.toggle('inactive', !this.state.enabled);
    
    // Update settings display
    this.elements.fontSizeValue.textContent = `${this.state.fontSize}px`;
    this.elements.themeValue.textContent = 
      this.state.theme.charAt(0).toUpperCase() + this.state.theme.slice(1);
    
    // Disable/enable buttons based on state
    this.elements.speakPage.disabled = !this.state.enabled;
    this.elements.testSpeak.disabled = !this.state.enabled;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

### Step 4: Create Content Script
Create `src/content/index.ts`:
```typescript
import { MessageType, Message } from '@common/types/messages';
import { devLog } from '@common/dev-utils';

class ContentScriptController {
  private selectedText: string = '';
  private highlightedElements: HTMLElement[] = [];
  
  constructor() {
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
    // Selection change listener
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      this.selectedText = selection ? selection.toString().trim() : '';
    });
    
    // Double-click to speak
    document.addEventListener('dblclick', (e) => {
      if (this.selectedText && e.shiftKey) {
        this.speakText(this.selectedText);
      }
    });
    
    // Message listener
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      devLog('Content script received message:', message);
      
      switch (message.type) {
        case MessageType.SPEAK_SELECTION:
          if (message.payload.fullPage) {
            this.speakFullPage();
          } else {
            this.speakText(message.payload.text || this.selectedText);
          }
          sendResponse({ success: true });
          break;
          
        case MessageType.HIGHLIGHT_TEXT:
          this.highlightText(message.payload.text);
          sendResponse({ success: true });
          break;
          
        case MessageType.SETTINGS_UPDATED:
          this.applySettings(message.payload);
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
    `;
    document.head.appendChild(style);
  }
  
  private speakText(text: string) {
    if (!text) return;
    
    chrome.runtime.sendMessage({
      type: MessageType.SPEAK_TEXT,
      payload: { text },
    });
    
    // Visual feedback
    this.showSpeakingIndicator();
  }
  
  private speakFullPage() {
    // Get main content (simplified version)
    const content = document.body.innerText
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('. ');
    
    this.speakText(content);
  }
  
  private highlightText(searchText: string) {
    // Clear previous highlights
    this.clearHighlights();
    
    if (!searchText) return;
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.textContent?.includes(searchText) 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        },
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent) {
        parent.classList.add('tts-highlight');
        this.highlightedElements.push(parent);
      }
    }
  }
  
  private clearHighlights() {
    this.highlightedElements.forEach(el => {
      el.classList.remove('tts-highlight');
    });
    this.highlightedElements = [];
  }
  
  private showSpeakingIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2196f3;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      font-family: -apple-system, sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `;
    indicator.textContent = '🔊 Speaking...';
    indicator.classList.add('tts-pulse');
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }
  
  private applySettings(settings: any) {
    if (settings.fontSize) {
      document.documentElement.style.setProperty(
        '--tts-font-size',
        `${settings.fontSize}px`
      );
    }
    
    if (settings.theme) {
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
```

### Step 5: Create Options Page
Create `src/options/options.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TTS Extension Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="options-container">
    <header class="options-header">
      <h1>Text to Speech Settings</h1>
      <p>Configure your TTS extension preferences</p>
    </header>
    
    <main class="options-content">
      <form id="settingsForm">
        <section class="settings-section">
          <h2>General Settings</h2>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" id="enabled" name="enabled">
              <span class="toggle-switch"></span>
              <span class="toggle-text">Enable TTS</span>
            </label>
            <p class="form-help">Turn text-to-speech functionality on or off</p>
          </div>
          
          <div class="form-group">
            <label for="theme">Theme</label>
            <select id="theme" name="theme" class="form-control">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
            <p class="form-help">Choose your preferred color theme</p>
          </div>
        </section>
        
        <section class="settings-section">
          <h2>Speech Settings</h2>
          
          <div class="form-group">
            <label for="voice">Voice</label>
            <select id="voice" name="voice" class="form-control">
              <option value="default">Default System Voice</option>
            </select>
            <p class="form-help">Select the voice for text-to-speech</p>
          </div>
          
          <div class="form-group">
            <label for="rate">Speech Rate</label>
            <div class="range-container">
              <input type="range" id="rate" name="rate" 
                     min="0.5" max="2" step="0.1" value="1">
              <span class="range-value" id="rateValue">1.0x</span>
            </div>
            <p class="form-help">Adjust the speed of speech</p>
          </div>
          
          <div class="form-group">
            <label for="pitch">Pitch</label>
            <div class="range-container">
              <input type="range" id="pitch" name="pitch" 
                     min="0.5" max="2" step="0.1" value="1">
              <span class="range-value" id="pitchValue">1.0</span>
            </div>
            <p class="form-help">Adjust the pitch of the voice</p>
          </div>
          
          <div class="form-group">
            <label for="volume">Volume</label>
            <div class="range-container">
              <input type="range" id="volume" name="volume" 
                     min="0" max="1" step="0.1" value="1">
              <span class="range-value" id="volumeValue">100%</span>
            </div>
            <p class="form-help">Adjust the volume level</p>
          </div>
        </section>
        
        <section class="settings-section">
          <h2>Display Settings</h2>
          
          <div class="form-group">
            <label for="fontSize">Font Size</label>
            <div class="range-container">
              <input type="range" id="fontSize" name="fontSize" 
                     min="12" max="24" step="1" value="16">
              <span class="range-value" id="fontSizeValue">16px</span>
            </div>
            <p class="form-help">Adjust the font size for the extension UI</p>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" id="highlightText" name="highlightText">
              <span class="toggle-switch"></span>
              <span class="toggle-text">Highlight spoken text</span>
            </label>
            <p class="form-help">Visually highlight text as it's being spoken</p>
          </div>
        </section>
        
        <section class="settings-section">
          <h2>Keyboard Shortcuts</h2>
          
          <div class="shortcuts-list">
            <div class="shortcut-item">
              <span class="shortcut-action">Speak selected text</span>
              <span class="shortcut-key">Shift + Double-click</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-action">Stop speaking</span>
              <span class="shortcut-key">Escape</span>
            </div>
          </div>
        </section>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Settings</button>
          <button type="button" id="resetButton" class="btn btn-secondary">
            Reset to Defaults
          </button>
        </div>
      </form>
    </main>
    
    <footer class="options-footer">
      <p>TTS Extension v0.1.0</p>
      <div class="footer-links">
        <a href="#" id="exportSettings">Export Settings</a>
        <a href="#" id="importSettings">Import Settings</a>
      </div>
    </footer>
  </div>
  
  <script src="options.js"></script>
</body>
</html>
```

Create `src/options/index.ts`:
```typescript
import { MessageType, Message } from '@common/types/messages';
import { devLog } from '@common/dev-utils';

interface Settings {
  enabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  fontSize: number;
  highlightText: boolean;
}

class OptionsController {
  private form: HTMLFormElement;
  private voices: SpeechSynthesisVoice[] = [];
  private defaultSettings: Settings = {
    enabled: true,
    theme: 'light',
    voice: 'default',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    fontSize: 16,
    highlightText: true,
  };
  
  constructor() {
    this.form = document.getElementById('settingsForm') as HTMLFormElement;
    this.initialize();
  }
  
  private async initialize() {
    await this.loadVoices();
    await this.loadSettings();
    this.setupEventListeners();
    this.updateRangeDisplays();
  }
  
  private async loadVoices() {
    return new Promise<void>((resolve) => {
      const loadVoiceList = () => {
        this.voices = speechSynthesis.getVoices();
        this.populateVoiceSelect();
        resolve();
      };
      
      if (speechSynthesis.getVoices().length > 0) {
        loadVoiceList();
      } else {
        speechSynthesis.addEventListener('voiceschanged', loadVoiceList, { once: true });
      }
    });
  }
  
  private populateVoiceSelect() {
    const voiceSelect = document.getElementById('voice') as HTMLSelectElement;
    
    // Clear existing options except default
    while (voiceSelect.options.length > 1) {
      voiceSelect.remove(1);
    }
    
    // Add available voices
    this.voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      
      if (voice.default) {
        option.textContent += ' - Default';
      }
      
      voiceSelect.appendChild(option);
    });
  }
  
  private async loadSettings() {
    const stored = await chrome.storage.sync.get(this.defaultSettings);
    const settings = { ...this.defaultSettings, ...stored };
    
    // Apply settings to form
    Object.entries(settings).forEach(([key, value]) => {
      const input = this.form.elements.namedItem(key) as HTMLInputElement;
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = value as boolean;
        } else {
          input.value = String(value);
        }
      }
    });
    
    devLog('Settings loaded:', settings);
  }
  
  private setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
    
    // Reset button
    document.getElementById('resetButton')?.addEventListener('click', () => {
      this.resetSettings();
    });
    
    // Range input updates
    ['rate', 'pitch', 'volume', 'fontSize'].forEach(id => {
      const input = document.getElementById(id) as HTMLInputElement;
      input?.addEventListener('input', () => this.updateRangeDisplay(id));
    });
    
    // Export/Import
    document.getElementById('exportSettings')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportSettings();
    });
    
    document.getElementById('importSettings')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.importSettings();
    });
  }
  
  private updateRangeDisplays() {
    ['rate', 'pitch', 'volume', 'fontSize'].forEach(id => {
      this.updateRangeDisplay(id);
    });
  }
  
  private updateRangeDisplay(id: string) {
    const input = document.getElementById(id) as HTMLInputElement;
    const display = document.getElementById(`${id}Value`) as HTMLSpanElement;
    
    if (!input || !display) return;
    
    const value = parseFloat(input.value);
    
    switch (id) {
      case 'rate':
        display.textContent = `${value.toFixed(1)}x`;
        break;
      case 'pitch':
        display.textContent = value.toFixed(1);
        break;
      case 'volume':
        display.textContent = `${Math.round(value * 100)}%`;
        break;
      case 'fontSize':
        display.textContent = `${value}px`;
        break;
    }
  }
  
  private async saveSettings() {
    const formData = new FormData(this.form);
    const settings: Partial<Settings> = {};
    
    // Process form data
    for (const [key, value] of formData.entries()) {
      if (key in this.defaultSettings) {
        if (key === 'enabled' || key === 'highlightText') {
          settings[key] = this.form.elements.namedItem(key)?.checked || false;
        } else if (['rate', 'pitch', 'volume', 'fontSize'].includes(key)) {
          settings[key] = parseFloat(value as string);
        } else {
          settings[key] = value as string;
        }
      }
    }
    
    // Save to storage
    await chrome.storage.sync.set(settings);
    
    // Notify background script
    const message: Message = {
      type: MessageType.UPDATE_SETTINGS,
      payload: settings,
    };
    
    await chrome.runtime.sendMessage(message);
    
    // Show success message
    this.showNotification('Settings saved successfully!', 'success');
  }
  
  private async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(this.defaultSettings);
      await this.loadSettings();
      this.updateRangeDisplays();
      
      this.showNotification('Settings reset to defaults', 'info');
    }
  }
  
  private async exportSettings() {
    const settings = await chrome.storage.sync.get();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'tts-settings.json');
    link.click();
  }
  
  private async importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const settings = JSON.parse(text);
        
        // Validate settings
        if (typeof settings === 'object') {
          await chrome.storage.sync.set(settings);
          await this.loadSettings();
          this.updateRangeDisplays();
          
          this.showNotification('Settings imported successfully!', 'success');
        } else {
          throw new Error('Invalid settings format');
        }
      } catch (error) {
        this.showNotification('Failed to import settings', 'error');
        devLog('Import error:', error);
      }
    });
    
    input.click();
  }
  
  private showNotification(message: string, type: 'success' | 'error' | 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      info: '#2196f3',
    };
    
    notification.style.backgroundColor = colors[type];
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
```

## Testing Criteria and Test Cases

### Test Case 1: Extension Installation
- **Objective**: Verify extension installs and initializes correctly
- **Steps**:
  1. Build the extension
  2. Load in Chrome
  3. Check extension icon appears
  4. Verify no console errors
- **Expected Result**: Extension loads without errors

### Test Case 2: Popup Functionality
- **Objective**: Verify popup opens and functions correctly
- **Steps**:
  1. Click extension icon
  2. Verify popup opens
  3. Test enable/disable toggle
  4. Test text-to-speech with sample text
- **Expected Result**: All popup features work correctly

### Test Case 3: Content Script Injection
- **Objective**: Verify content script injects properly
- **Steps**:
  1. Navigate to any website
  2. Open console and check for initialization log
  3. Select text and use Shift+double-click
  4. Verify TTS activates
- **Expected Result**: Content script functions on all pages

### Test Case 4: Message Passing
- **Objective**: Verify all components communicate correctly
- **Steps**:
  1. Open popup and change settings
  2. Verify background script receives message
  3. Verify content scripts receive updates
  4. Check chrome.storage for persistence
- **Expected Result**: Messages pass between all components

### Test Case 5: Options Page
- **Objective**: Verify options page saves and loads settings
- **Steps**:
  1. Open options page
  2. Change all settings
  3. Save and reload page
  4. Verify settings persist
  5. Test reset functionality
- **Expected Result**: Settings save and load correctly

### Test Case 6: Chrome APIs
- **Objective**: Verify all Chrome APIs work correctly
- **Steps**:
  1. Test chrome.tts.speak
  2. Test chrome.storage operations
  3. Test chrome.runtime messaging
  4. Test chrome.contextMenus
- **Expected Result**: All APIs function without errors

## Success Metrics

1. **Installation Success Rate**: 100% successful installations
2. **Component Communication**: All messages delivered successfully
3. **API Integration**: All Chrome APIs function correctly
4. **User Interface**: All UI elements responsive and functional
5. **Performance**: < 50ms message passing latency
6. **Memory Usage**: < 20MB memory footprint

## Dependencies and Risks

### Dependencies
- Chrome Extension Manifest V3 APIs
- Chrome TTS API availability
- TypeScript compilation
- Webpack bundling

### Risks

1. **Chrome API Limitations**
   - **Risk**: Some Chrome APIs may have restrictions
   - **Mitigation**: Use only stable, documented APIs
   - **Impact**: Low

2. **Content Script Conflicts**
   - **Risk**: Content scripts may conflict with page scripts
   - **Mitigation**: Use isolated world, namespace all code
   - **Impact**: Medium

3. **Message Passing Failures**
   - **Risk**: Messages may fail between components
   - **Mitigation**: Implement retry logic and error handling
   - **Impact**: Medium

4. **Storage Quota**
   - **Risk**: Chrome storage has size limits
   - **Mitigation**: Monitor storage usage, implement cleanup
   - **Impact**: Low

5. **TTS Voice Availability**
   - **Risk**: TTS voices vary by system
   - **Mitigation**: Fallback to default voice, handle errors
   - **Impact**: Low

### Risk Matrix
| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|---------|-------------------|
| API Limitations | Low | Low | Use stable APIs |
| Script Conflicts | Medium | Medium | Isolated execution |
| Message Failures | Low | Medium | Error handling |
| Storage Quota | Low | Low | Usage monitoring |
| Voice Availability | Medium | Low | Fallback handling |

## Notes

- This minimal structure provides all the foundational patterns needed for the full extension
- Each component is designed to be easily extended with additional features
- The message passing system is typed for safety and maintainability
- Consider adding unit tests for message handlers and utility functions
- The UI is intentionally simple but follows modern design principles