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
    this.elements.toggleEnabled.querySelector('.btn-text')!.textContent = this.state.enabled
      ? 'Disable TTS'
      : 'Enable TTS';

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
