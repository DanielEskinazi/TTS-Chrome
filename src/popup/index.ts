import { MessageType, Message } from '@common/types/messages';
// Temporary debug logging - replace devLog with console.log for debugging  
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[TTS-Popup-Debug]', ...args);
  }
};

class PopupController {
  private elements: {
    speakPage: HTMLButtonElement;
    testText: HTMLTextAreaElement;
    testSpeak: HTMLButtonElement;
    openOptions: HTMLAnchorElement;
    status: HTMLDivElement;
    fontSizeValue: HTMLSpanElement;
    themeValue: HTMLSpanElement;
    ttsStatus: HTMLDivElement;
    currentText: HTMLDivElement;
    textPreview: HTMLSpanElement;
    playPauseBtn: HTMLButtonElement;
    stopBtn: HTMLButtonElement;
    forceStopBtn: HTMLButtonElement;
  };

  private state = {
    fontSize: 16,
    theme: 'light' as 'light' | 'dark',
  };

  private ttsState = {
    isPlaying: false,
    isPaused: false,
    currentText: '',
  };

  constructor() {
    this.elements = {
      speakPage: document.getElementById('speakPage') as HTMLButtonElement,
      testText: document.getElementById('testText') as HTMLTextAreaElement,
      testSpeak: document.getElementById('testSpeak') as HTMLButtonElement,
      openOptions: document.getElementById('openOptions') as HTMLAnchorElement,
      status: document.getElementById('status') as HTMLDivElement,
      fontSizeValue: document.getElementById('fontSizeValue') as HTMLSpanElement,
      themeValue: document.getElementById('themeValue') as HTMLSpanElement,
      ttsStatus: document.getElementById('ttsStatus') as HTMLDivElement,
      currentText: document.getElementById('currentText') as HTMLDivElement,
      textPreview: document.getElementById('textPreview') as HTMLSpanElement,
      playPauseBtn: document.getElementById('playPauseBtn') as HTMLButtonElement,
      stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
      forceStopBtn: document.getElementById('forceStopBtn') as HTMLButtonElement,
    };

    this.initialize();
  }

  private async initialize() {
    await this.loadState();
    await this.updateTTSState();
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
    this.elements.speakPage.addEventListener('click', () => this.speakCurrentPage());
    this.elements.testSpeak.addEventListener('click', () => this.testSpeech());
    this.elements.playPauseBtn.addEventListener('click', () => this.handlePlayPause());
    this.elements.stopBtn.addEventListener('click', () => this.handleStop());
    this.elements.forceStopBtn.addEventListener('click', () => this.handleForceStop());
    this.elements.openOptions.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    // Listen for TTS state changes and settings updates
    chrome.runtime.onMessage.addListener((message: Message) => {
      if (message.type === MessageType.SETTINGS_UPDATED) {
        this.state = { ...this.state, ...message.payload };
        this.updateUI();
      } else if (message.type === MessageType.TTS_STATE_CHANGED) {
        this.handleTTSStateChange(message.payload || {});
      }
    });
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
    debugLog('Test Speech button clicked');
    debugLog('Test Speech button clicked - starting debug trace');
    
    const text = this.elements.testText.value.trim();
    debugLog('Text to speak:', text);

    if (!text) {
      debugLog('No text entered');
      debugLog('No text entered - showing placeholder');
      this.elements.testText.placeholder = 'Please enter some text...';
      return;
    }

    try {
      // Get the active tab and send START_SPEECH message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      debugLog('Sending START_SPEECH message to content script with text:', text);
      debugLog('Preparing message payload:', { type: MessageType.START_SPEECH, text });
      
      const message: Message = {
        type: MessageType.START_SPEECH,
        payload: { text },
      };

      debugLog('Sending message to content script...');
      const response = await chrome.tabs.sendMessage(tab.id, message);
      
      debugLog('Response from content script:', response);
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

  private async updateTTSState() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_TTS_STATE
      });
      
      if (response && response.success) {
        const state = response.data;
        this.ttsState.isPlaying = state?.isActive || false;
        this.updateTTSUI();
      }
    } catch (error) {
      debugLog('Error getting TTS state:', error);
    }
  }

  private handleTTSStateChange(data: Record<string, unknown>) {
    const { state, playbackState } = data;
    
    // Determine if TTS is playing or paused
    const isPlaying = (state === 'started' || state === 'resumed') && 
                      playbackState && 
                      typeof (playbackState as Record<string, unknown>).isPlaying === 'boolean' &&
                      (playbackState as Record<string, unknown>).isPlaying;
    
    const isPaused = state === 'paused' && 
                     playbackState && 
                     typeof (playbackState as Record<string, unknown>).isPaused === 'boolean' &&
                     (playbackState as Record<string, unknown>).isPaused;
    
    this.ttsState.isPlaying = Boolean(isPlaying);
    this.ttsState.isPaused = Boolean(isPaused);
    
    // Update current text if available
    if (playbackState && (playbackState as Record<string, unknown>).currentText) {
      this.ttsState.currentText = (playbackState as Record<string, unknown>).currentText as string;
    }
    
    this.updateTTSUI();
  }

  private async handlePlayPause() {
    try {
      this.elements.playPauseBtn.disabled = true;
      
      if (this.ttsState.isPaused || this.ttsState.isPlaying) {
        await chrome.runtime.sendMessage({
          type: MessageType.TOGGLE_PAUSE_TTS,
          payload: { source: 'popup' }
        });
      }
      
      // UI will be updated via message listener
      
    } catch (error) {
      debugLog('Error toggling pause:', error);
      this.showError('Failed to toggle pause');
    } finally {
      // Re-enable button after a short delay
      setTimeout(() => {
        this.elements.playPauseBtn.disabled = false;
      }, 200);
    }
  }

  private async handleStop() {
    try {
      this.elements.stopBtn.disabled = true;
      this.elements.stopBtn.querySelector('.btn-text')!.textContent = 'Stopping...';
      
      await chrome.runtime.sendMessage({
        type: MessageType.STOP_TTS,
        payload: { source: 'popup' }
      });
      
      // UI will be updated via message listener
      
    } catch (error) {
      debugLog('Error stopping TTS:', error);
      this.showError('Failed to stop TTS');
    } finally {
      this.elements.stopBtn.querySelector('.btn-text')!.textContent = 'Stop Speaking';
    }
  }

  private async handleForceStop() {
    try {
      this.elements.forceStopBtn.disabled = true;
      this.elements.forceStopBtn.querySelector('.btn-text')!.textContent = 'Force Stopping...';
      
      await chrome.runtime.sendMessage({
        type: MessageType.FORCE_STOP_TTS
      });
      
      // UI will be updated via message listener
      
    } catch (error) {
      debugLog('Error force stopping TTS:', error);
      this.showError('Failed to force stop TTS');
    } finally {
      this.elements.forceStopBtn.querySelector('.btn-text')!.textContent = 'Force Stop';
    }
  }

  private updateTTSUI() {
    // Update TTS status display
    if (this.ttsState.isPaused) {
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = 'TTS is paused';
      this.elements.ttsStatus.className = 'status-card paused';
      this.updatePlayPauseButton('resume');
      
      // Show current text if available
      if (this.ttsState.currentText) {
        this.showCurrentText();
      }
    } else if (this.ttsState.isPlaying) {
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = 'TTS is playing';
      this.elements.ttsStatus.className = 'status-card playing';
      this.updatePlayPauseButton('pause');
      
      // Show current text if available
      if (this.ttsState.currentText) {
        this.showCurrentText();
      }
    } else {
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = 'TTS is not active';
      this.elements.ttsStatus.className = 'status-card stopped';
      this.updatePlayPauseButton('play');
      this.hideCurrentText();
    }
    
    // Update button states
    this.elements.playPauseBtn.disabled = !(this.ttsState.isPlaying || this.ttsState.isPaused);
    this.elements.stopBtn.disabled = !(this.ttsState.isPlaying || this.ttsState.isPaused);
    this.elements.forceStopBtn.disabled = !(this.ttsState.isPlaying || this.ttsState.isPaused);
  }

  private updatePlayPauseButton(mode: 'play' | 'pause' | 'resume') {
    const iconSpan = this.elements.playPauseBtn.querySelector('.btn-icon') as HTMLSpanElement;
    const textSpan = this.elements.playPauseBtn.querySelector('.btn-text') as HTMLSpanElement;
    
    switch (mode) {
      case 'play':
        iconSpan.textContent = '▶️';
        textSpan.textContent = 'Play';
        break;
      case 'pause':
        iconSpan.textContent = '⏸️';
        textSpan.textContent = 'Pause';
        break;
      case 'resume':
        iconSpan.textContent = '▶️';
        textSpan.textContent = 'Resume';
        break;
    }
  }

  private showCurrentText() {
    if (this.ttsState.currentText) {
      const preview = this.ttsState.currentText.length > 50 
        ? this.ttsState.currentText.substring(0, 50) + '...'
        : this.ttsState.currentText;
      
      this.elements.textPreview.textContent = preview;
      this.elements.currentText.style.display = 'block';
    }
  }

  private hideCurrentText() {
    this.elements.currentText.style.display = 'none';
    this.elements.textPreview.textContent = '';
  }

  private showError(message: string) {
    this.elements.ttsStatus.querySelector('.status-text')!.textContent = message;
    this.elements.ttsStatus.className = 'status-card error';
    
    // Reset after 3 seconds
    setTimeout(() => {
      this.updateTTSState();
    }, 3000);
  }

  private updateUI() {
    // Update settings display
    this.elements.fontSizeValue.textContent = `${this.state.fontSize}px`;
    this.elements.themeValue.textContent =
      this.state.theme.charAt(0).toUpperCase() + this.state.theme.slice(1);
    
    // Update TTS UI
    this.updateTTSUI();
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  debugLog('Popup DOM loaded, initializing controller...');
  new PopupController();
});
