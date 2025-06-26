import { MessageType, Message } from '@common/types/messages';
// Temporary debug logging - replace devLog with console.log for debugging  
const debugLog = (...args: unknown[]) => console.log('[TTS-Popup-Debug]', ...args);

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
      debugLog('State loaded:', this.state);
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
    console.log('Test Speech button clicked');
    debugLog('Test Speech button clicked - starting debug trace');
    
    const text = this.elements.testText.value.trim();
    debugLog('Text to speak:', text);

    if (!text) {
      console.log('No text entered');
      debugLog('No text entered - showing placeholder');
      this.elements.testText.placeholder = 'Please enter some text...';
      return;
    }

    console.log('Sending SPEAK_TEXT message with text:', text);
    debugLog('Preparing message payload:', { type: MessageType.SPEAK_TEXT, text });
    
    const message: Message = {
      type: MessageType.SPEAK_TEXT,
      payload: { text },
    };

    try {
      debugLog('Sending message to background script...');
      const response = await chrome.runtime.sendMessage(message);
      
      // Check for chrome.runtime.lastError
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError.message);
        debugLog('Chrome runtime error:', chrome.runtime.lastError.message);
        this.elements.testText.placeholder = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      
      console.log('Response from background:', response);
      debugLog('Full response object:', response);

      if (response && response.success) {
        debugLog('TTS request successful - updating UI');
        this.elements.testText.value = '';
        this.elements.testText.placeholder = 'Speaking...';

        setTimeout(() => {
          this.elements.testText.placeholder = 'Enter text to test TTS...';
        }, 2000);
      } else {
        console.error('TTS failed:', response ? response.error : 'No response');
        debugLog('TTS failed - response:', response);
        this.elements.testText.placeholder = 'TTS Error: ' + (response ? response.error : 'No response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      debugLog('Exception caught:', error);
      this.elements.testText.placeholder = 'Error: ' + (error as Error).message;
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
  console.log('Popup DOM loaded, initializing controller...');
  new PopupController();
});
