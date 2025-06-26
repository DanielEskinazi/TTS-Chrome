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
          if (message.payload && typeof message.payload === 'object') {
            if ('fullPage' in message.payload && message.payload.fullPage) {
              this.speakFullPage();
            } else {
              const text =
                'text' in message.payload ? String(message.payload.text) : this.selectedText;
              this.speakText(text);
            }
          } else {
            this.speakText(this.selectedText);
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
