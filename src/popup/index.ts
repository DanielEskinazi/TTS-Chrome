import { MessageType, Message } from '@common/types/messages';
// Temporary debug logging - replace devLog with console.log for debugging  
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[TTS-Popup-Debug]', ...args);
  }
};

interface Voice {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  voiceURI: string;
}

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
    stopBtn: HTMLButtonElement;
    forceStopBtn: HTMLButtonElement;
    voiceSelect: HTMLSelectElement;
    previewVoice: HTMLButtonElement;
    voiceInfo: HTMLDivElement;
    voiceLanguage: HTMLSpanElement;
    voiceType: HTMLSpanElement;
  };

  private state = {
    fontSize: 16,
    theme: 'light' as 'light' | 'dark',
    selectedVoice: '' as string,
  };

  private ttsState = {
    isPlaying: false,
    currentText: '',
  };

  private voices: Voice[] = [];
  private isPreviewPlaying = false;

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
      stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
      forceStopBtn: document.getElementById('forceStopBtn') as HTMLButtonElement,
      voiceSelect: document.getElementById('voiceSelect') as HTMLSelectElement,
      previewVoice: document.getElementById('previewVoice') as HTMLButtonElement,
      voiceInfo: document.getElementById('voiceInfo') as HTMLDivElement,
      voiceLanguage: document.getElementById('voiceLanguage') as HTMLSpanElement,
      voiceType: document.getElementById('voiceType') as HTMLSpanElement,
    };

    this.initialize();
  }

  private async initialize() {
    await this.loadState();
    await this.updateTTSState();
    await this.loadVoices();
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
    
    // Load selected voice from storage
    const result = await chrome.storage.sync.get('selectedVoice');
    if (result.selectedVoice) {
      this.state.selectedVoice = result.selectedVoice;
    }
  }

  private async loadVoices() {
    return new Promise<void>((resolve) => {
      const loadVoicesFromAPI = () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          this.voices = voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            localService: voice.localService,
            default: voice.default,
            voiceURI: voice.voiceURI
          }));
          
          this.populateVoiceSelect();
          resolve();
        }
      };

      // Voices might not be loaded immediately
      if (speechSynthesis.getVoices().length > 0) {
        loadVoicesFromAPI();
      } else {
        speechSynthesis.addEventListener('voiceschanged', loadVoicesFromAPI, { once: true });
        // Fallback timeout
        setTimeout(() => {
          loadVoicesFromAPI();
          resolve();
        }, 1000);
      }
    });
  }

  private populateVoiceSelect() {
    const voiceSelect = this.elements.voiceSelect;
    voiceSelect.innerHTML = '<option value="">Default System Voice</option>';
    
    // Group voices by language
    const voicesByLang = new Map<string, Voice[]>();
    this.voices.forEach(voice => {
      const lang = voice.lang.split('-')[0];
      if (!voicesByLang.has(lang)) {
        voicesByLang.set(lang, []);
      }
      voicesByLang.get(lang)!.push(voice);
    });
    
    // Sort languages and add voices
    const sortedLangs = Array.from(voicesByLang.keys()).sort();
    sortedLangs.forEach(lang => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = this.getLanguageName(lang);
      
      voicesByLang.get(lang)!.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} ${voice.default ? '(Default)' : ''}`;
        optgroup.appendChild(option);
      });
      
      voiceSelect.appendChild(optgroup);
    });
    
    // Set selected voice
    if (this.state.selectedVoice) {
      voiceSelect.value = this.state.selectedVoice;
      this.updateVoiceInfo();
    }
    
    // Enable preview button
    this.elements.previewVoice.disabled = false;
  }

  private getLanguageName(langCode: string): string {
    const languages: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'ru': 'Russian',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish'
    };
    
    return languages[langCode] || langCode.toUpperCase();
  }

  private updateVoiceInfo() {
    const selectedVoiceName = this.elements.voiceSelect.value;
    
    if (!selectedVoiceName) {
      this.elements.voiceInfo.style.display = 'none';
      return;
    }
    
    const voice = this.voices.find(v => v.name === selectedVoiceName);
    if (voice) {
      this.elements.voiceLanguage.textContent = voice.lang;
      this.elements.voiceType.textContent = voice.localService ? 'Local' : 'Online';
      this.elements.voiceType.className = `voice-type ${voice.localService ? 'local' : 'online'}`;
      this.elements.voiceInfo.style.display = 'flex';
    }
  }

  private setupEventListeners() {
    this.elements.speakPage.addEventListener('click', () => this.speakCurrentPage());
    this.elements.testSpeak.addEventListener('click', () => this.testSpeech());
    this.elements.stopBtn.addEventListener('click', () => this.handleStop());
    this.elements.forceStopBtn.addEventListener('click', () => this.handleForceStop());
    this.elements.openOptions.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    // Voice selection events
    this.elements.voiceSelect.addEventListener('change', () => this.handleVoiceChange());
    this.elements.previewVoice.addEventListener('click', () => this.handleVoicePreview());

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
        payload: { text, voice: this.state.selectedVoice || undefined },
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

  private async handleVoiceChange() {
    const selectedVoice = this.elements.voiceSelect.value;
    this.state.selectedVoice = selectedVoice;
    
    // Save to storage
    await chrome.storage.sync.set({ selectedVoice });
    
    // Update voice info display
    this.updateVoiceInfo();
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: MessageType.VOICE_CHANGED,
      payload: { voice: selectedVoice }
    });
    
    debugLog('Voice changed to:', selectedVoice);
  }

  private async handleVoicePreview() {
    if (this.isPreviewPlaying) {
      // Stop preview
      speechSynthesis.cancel();
      this.isPreviewPlaying = false;
      this.elements.previewVoice.querySelector('.btn-text')!.textContent = 'Preview';
      return;
    }

    const selectedVoiceName = this.elements.voiceSelect.value;
    const previewText = this.elements.testText.value.trim() || 'Hello! This is how this voice sounds.';
    
    // Use the Web Speech API directly for preview
    const utterance = new SpeechSynthesisUtterance(previewText);
    
    if (selectedVoiceName) {
      const voice = speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    utterance.onstart = () => {
      this.isPreviewPlaying = true;
      this.elements.previewVoice.querySelector('.btn-text')!.textContent = 'Stop';
    };
    
    utterance.onend = () => {
      this.isPreviewPlaying = false;
      this.elements.previewVoice.querySelector('.btn-text')!.textContent = 'Preview';
    };
    
    utterance.onerror = () => {
      this.isPreviewPlaying = false;
      this.elements.previewVoice.querySelector('.btn-text')!.textContent = 'Preview';
    };
    
    speechSynthesis.speak(utterance);
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
    
    // Determine if TTS is playing
    const isPlaying = (state === 'started' || state === 'resumed') && 
                      playbackState && 
                      typeof (playbackState as Record<string, unknown>).isPlaying === 'boolean' &&
                      (playbackState as Record<string, unknown>).isPlaying;
    
    this.ttsState.isPlaying = Boolean(isPlaying);
    
    // Update current text if available
    if (playbackState && (playbackState as Record<string, unknown>).currentText) {
      this.ttsState.currentText = (playbackState as Record<string, unknown>).currentText as string;
    }
    
    this.updateTTSUI();
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
    if (this.ttsState.isPlaying) {
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = 'TTS is playing';
      this.elements.ttsStatus.className = 'status-card playing';
      
      // Show current text if available
      if (this.ttsState.currentText) {
        this.showCurrentText();
      }
    } else {
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = 'TTS is not active';
      this.elements.ttsStatus.className = 'status-card stopped';
      this.hideCurrentText();
    }
    
    // Update button states
    this.elements.stopBtn.disabled = !this.ttsState.isPlaying;
    this.elements.forceStopBtn.disabled = !this.ttsState.isPlaying;
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
