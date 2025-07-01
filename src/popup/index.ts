import { MessageType, Message } from '@common/types/messages';
import { VoiceInfo } from '@common/voice-manager';
import {
  TTSState,
  validateTTSState,
  fixInvalidState,
  debugStateTransition,
} from '@common/state-validator';

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
    voiceSelect: HTMLSelectElement;
    previewBtn: HTMLButtonElement;
    initStatus: HTMLDivElement;
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

  private voiceData: {
    voices: VoiceInfo[];
    selectedVoice: VoiceInfo | null;
  } = {
    voices: [],
    selectedVoice: null
  };

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
      playPauseBtn: document.getElementById('playPauseBtn') as HTMLButtonElement,
      stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
      forceStopBtn: document.getElementById('forceStopBtn') as HTMLButtonElement,
      voiceSelect: document.getElementById('voiceSelect') as HTMLSelectElement,
      previewBtn: document.getElementById('previewBtn') as HTMLButtonElement,
      initStatus: document.getElementById('initStatus') as HTMLDivElement,
    };

    this.initialize();
  }

  private async initialize() {
    await this.loadState();
    await this.updateTTSState();
    await this.enumerateAndUpdateVoices();
    await this.loadVoiceData();
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

  private async enumerateAndUpdateVoices() {
    try {
      // Check if we have access to speechSynthesis in popup
      if (typeof speechSynthesis !== 'undefined') {
        debugLog('Enumerating voices in popup...');
        
        const voices = await this.loadVoicesFromSpeechSynthesis();
        
        if (voices.length > 0) {
          // Send voice data to background script
          await chrome.runtime.sendMessage({
            type: MessageType.UPDATE_VOICE_DATA,
            payload: { voices: voices }
          });
          debugLog('Sent voice data to background script:', voices.length, 'voices');
        }
      }
    } catch (error) {
      debugLog('Error enumerating voices:', error);
    }
  }

  private async loadVoicesFromSpeechSynthesis(): Promise<VoiceInfo[]> {
    return new Promise((resolve) => {
      const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          const voiceInfos = this.processVoices(voices);
          resolve(voiceInfos);
        } else {
          setTimeout(loadVoiceList, 100);
        }
      };
      
      loadVoiceList();
    });
  }

  private processVoices(voices: SpeechSynthesisVoice[]): VoiceInfo[] {
    return voices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      voiceURI: voice.voiceURI,
      localService: voice.localService,
      default: voice.default,
      displayName: this.formatVoiceName(voice),
      languageDisplay: this.formatLanguage(voice.lang),
      quality: this.determineVoiceQuality(voice),
      gender: this.guessGender(voice.name),
      engine: this.determineEngine(voice)
    }));
  }

  private formatVoiceName(voice: SpeechSynthesisVoice): string {
    let name = voice.name;
    
    name = name.replace(/^Microsoft\s+/i, '');
    name = name.replace(/^Google\s+/i, '');
    name = name.replace(/^Apple\s+/i, '');
    
    if (!voice.localService) {
      name += ' (Online)';
    }
    
    return name;
  }

  private formatLanguage(langCode: string): string {
    const languageNames: Record<string, string> = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'en-AU': 'English (Australia)',
      'es-ES': 'Spanish (Spain)',
      'es-MX': 'Spanish (Mexico)',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese (Brazil)',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)'
    };
    
    return languageNames[langCode] || langCode;
  }

  private determineVoiceQuality(voice: SpeechSynthesisVoice): VoiceInfo['quality'] {
    if (!voice.localService) return 'premium';
    if (voice.name.toLowerCase().includes('enhanced')) return 'enhanced';
    if (voice.name.toLowerCase().includes('compact')) return 'compact';
    return 'standard';
  }

  private guessGender(voiceName: string): VoiceInfo['gender'] {
    const name = voiceName.toLowerCase();
    
    const femaleIndicators = ['female', 'woman', 'girl', 'samantha', 'victoria', 
                             'kate', 'karen', 'nicole', 'jennifer', 'lisa'];
    const maleIndicators = ['male', 'man', 'boy', 'daniel', 'thomas', 'james', 
                           'robert', 'john', 'michael', 'david'];
    
    if (femaleIndicators.some(indicator => name.includes(indicator))) {
      return 'female';
    }
    if (maleIndicators.some(indicator => name.includes(indicator))) {
      return 'male';
    }
    
    return 'neutral';
  }

  private determineEngine(voice: SpeechSynthesisVoice): string {
    const name = voice.name.toLowerCase();
    if (name.includes('microsoft')) return 'Microsoft';
    if (name.includes('google')) return 'Google';
    if (name.includes('apple')) return 'Apple';
    if (name.includes('amazon')) return 'Amazon';
    return 'System';
  }

  private async loadVoiceData() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_VOICE_DATA
      });
      
      if (response && response.success && response.data) {
        this.voiceData = {
          voices: response.data.voices as VoiceInfo[] || [],
          selectedVoice: response.data.selectedVoice as VoiceInfo | null
        };
        
        this.populateVoiceDropdown();
      }
    } catch (error) {
      debugLog('Error loading voice data:', error);
    }
  }

  private setupEventListeners() {
    this.elements.speakPage.addEventListener('click', () => this.speakCurrentPage());
    this.elements.testSpeak.addEventListener('click', () => this.testSpeech());
    this.elements.playPauseBtn.addEventListener('click', () => this.handlePlayPause());
    this.elements.stopBtn.addEventListener('click', () => this.handleStop());
    this.elements.forceStopBtn.addEventListener('click', () => this.handleForceStop());
    this.elements.voiceSelect.addEventListener('change', () => this.handleVoiceChange());
    this.elements.previewBtn.addEventListener('click', () => this.handlePreviewVoice());
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
      } else if (message.type === MessageType.VOICE_CHANGED) {
        this.loadVoiceData();
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
        payload: { 
          text,
          voice: this.voiceData.selectedVoice
        },
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
        this.elements.testText.placeholder =
          'TTS Error: ' + (response ? response.error : 'No response');
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
        type: MessageType.GET_TTS_STATE,
      });

      if (response && response.success) {
        const data = response.data;
        debugLog('[updateTTSState] Received state data:', data);
        
        // Use the actual response format from background script
        // Background returns: { isActive, isPaused, currentTabId, forceStopAttempts, hasTimeout }
        this.ttsState.isPlaying = data?.isActive || false;
        this.ttsState.isPaused = data?.isPaused || false;
        
        debugLog('[updateTTSState] Mapped state:', {
          isPlaying: this.ttsState.isPlaying,
          isPaused: this.ttsState.isPaused
        });
        
        this.updateTTSUI();
      }
    } catch (error) {
      debugLog('Error getting TTS state:', error);
    }
  }

  private handleTTSStateChange(data: Record<string, unknown>) {
    const { state, playbackState } = data;

    // Store previous state for debugging
    const oldState = { ...this.ttsState };

    // Fix: Use playbackState directly instead of state-based logic
    const playbackData = playbackState as Record<string, unknown>;

    const isPlaying =
      playbackData && typeof playbackData.isPlaying === 'boolean' && playbackData.isPlaying;

    const isPaused =
      playbackData && typeof playbackData.isPaused === 'boolean' && playbackData.isPaused;

    // Create new state and validate/fix if needed
    let newState: TTSState = {
      isPlaying: Boolean(isPlaying),
      isPaused: Boolean(isPaused),
      currentText: this.ttsState.currentText,
    };

    // Validate and fix state if needed
    if (!validateTTSState(newState)) {
      newState = fixInvalidState(newState);
    }

    // Debug state transition
    debugStateTransition('Popup', oldState, newState, { state, playbackData });

    this.ttsState.isPlaying = newState.isPlaying;
    this.ttsState.isPaused = newState.isPaused;
    
    // Debug: Log state assignment
    debugLog('[handleTTSStateChange] State assigned:', {
      'this.ttsState.isPlaying': this.ttsState.isPlaying,
      'this.ttsState.isPaused': this.ttsState.isPaused,
      'newState.isPlaying': newState.isPlaying,
      'newState.isPaused': newState.isPaused
    });

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
          payload: { source: 'popup' },
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
        payload: { source: 'popup' },
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
        type: MessageType.FORCE_STOP_TTS,
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
    // Debug: Log current state before UI update
    debugLog('[updateTTSUI] Current state:', {
      isPlaying: this.ttsState.isPlaying,
      isPaused: this.ttsState.isPaused,
      currentText: this.ttsState.currentText ? this.ttsState.currentText.substring(0, 50) + '...' : null
    });

    // Update TTS status display
    if (this.ttsState.isPaused) {
      debugLog('[updateTTSUI] Entering PAUSED condition');
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = 'TTS is paused';
      this.elements.ttsStatus.className = 'status-card paused';
      this.updatePlayPauseButton('resume');

      // Show current text if available
      if (this.ttsState.currentText) {
        this.showCurrentText();
      }
    } else if (this.ttsState.isPlaying) {
      debugLog('[updateTTSUI] Entering PLAYING condition');
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = 'TTS is playing';
      this.elements.ttsStatus.className = 'status-card playing';
      this.updatePlayPauseButton('pause');

      // Show current text if available
      if (this.ttsState.currentText) {
        this.showCurrentText();
      }
    } else {
      debugLog('[updateTTSUI] Entering STOPPED condition');
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
    debugLog('[updatePlayPauseButton] Setting button mode to:', mode);
    
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
      const preview =
        this.ttsState.currentText.length > 50
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

  private populateVoiceDropdown() {
    // Clear existing options
    this.elements.voiceSelect.innerHTML = '';
    
    if (this.voiceData.voices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Using system default voice';
      this.elements.voiceSelect.appendChild(option);
      // Hide loading status - extension is still functional with default voice
      this.elements.initStatus.style.display = 'none';
      return;
    }
    
    // Hide loading status when voices are loaded
    this.elements.initStatus.style.display = 'none';
    
    // Group voices by language
    const voicesByLang = new Map<string, VoiceInfo[]>();
    this.voiceData.voices.forEach(voice => {
      if (!voicesByLang.has(voice.languageDisplay)) {
        voicesByLang.set(voice.languageDisplay, []);
      }
      voicesByLang.get(voice.languageDisplay)!.push(voice);
    });
    
    // Create optgroups for each language
    voicesByLang.forEach((voices, language) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = language;
      
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = voice.displayName;
        
        if (this.voiceData.selectedVoice && voice.name === this.voiceData.selectedVoice.name) {
          option.selected = true;
        }
        
        // Add quality indicator
        if (voice.quality === 'premium') {
          option.textContent += ' ⭐';
        }
        
        optgroup.appendChild(option);
      });
      
      this.elements.voiceSelect.appendChild(optgroup);
    });
  }


  private async handleVoiceChange() {
    const voiceName = this.elements.voiceSelect.value;
    
    if (voiceName) {
      try {
        // Update voice selection
        const response = await chrome.runtime.sendMessage({
          type: MessageType.SELECT_VOICE,
          payload: { voiceName: voiceName }
        });
        
        if (response && response.success) {
          this.showTemporaryMessage('Voice updated');
        }
      } catch (error) {
        debugLog('Error selecting voice:', error);
        this.showError('Failed to select voice');
      }
    }
  }

  private async handlePreviewVoice() {
    if (this.isPreviewPlaying) {
      // Stop preview
      speechSynthesis.cancel();
      this.isPreviewPlaying = false;
      this.elements.previewBtn.textContent = '🔊';
      return;
    }
    
    const voiceName = this.elements.voiceSelect.value;
    if (!voiceName) return;
    
    try {
      this.isPreviewPlaying = true;
      this.elements.previewBtn.textContent = '⏹️';
      this.elements.previewBtn.disabled = true;
      
      // Find the selected voice
      const voice = this.voiceData.voices.find(v => v.name === voiceName);
      if (!voice) {
        throw new Error('Voice not found');
      }
      
      // Play preview directly in popup
      await this.playVoicePreview(voice);
      
    } catch (error) {
      debugLog('Error previewing voice:', error);
      this.showError('Preview failed: ' + (error as Error).message);
    } finally {
      this.isPreviewPlaying = false;
      this.elements.previewBtn.textContent = '🔊';
      this.elements.previewBtn.disabled = false;
    }
  }
  
  private async playVoicePreview(voice: VoiceInfo): Promise<void> {
    const previewText = this.getPreviewText(voice.lang);
    
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(previewText);
      
      // Find the actual system voice
      const systemVoice = speechSynthesis.getVoices().find(v => v.name === voice.name);
      if (systemVoice) {
        utterance.voice = systemVoice;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      // Speak the preview
      speechSynthesis.speak(utterance);
    });
  }
  
  private getPreviewText(lang: string): string {
    const previewTexts: Record<string, string> = {
      'en': 'Hello! This is a preview of the selected voice. The quick brown fox jumps over the lazy dog.',
      'es': '¡Hola! Esta es una vista previa de la voz seleccionada. El rápido zorro marrón salta sobre el perro perezoso.',
      'fr': 'Bonjour! Ceci est un aperçu de la voix sélectionnée. Le rapide renard brun saute par-dessus le chien paresseux.',
      'de': 'Hallo! Dies ist eine Vorschau der ausgewählten Stimme. Der schnelle braune Fuchs springt über den faulen Hund.',
      'it': 'Ciao! Questa è un\'anteprima della voce selezionata. La rapida volpe marrone salta sopra il cane pigro.',
      'pt': 'Olá! Esta é uma prévia da voz selecionada. A rápida raposa marrom pula sobre o cão preguiçoso.',
      'ja': 'こんにちは！これは選択された音声のプレビューです。素早い茶色のキツネが怠け者の犬を飛び越えます。',
      'ko': '안녕하세요! 선택한 음성의 미리보기입니다. 빠른 갈색 여우가 게으른 개를 뛰어넘습니다.',
      'zh': '你好！这是所选语音的预览。敏捷的棕色狐狸跳过了懒狗。'
    };
    
    const langPrefix = lang.split('-')[0];
    return previewTexts[langPrefix] || previewTexts['en'];
  }


  private showTemporaryMessage(message: string) {
    const originalText = this.elements.ttsStatus.querySelector('.status-text')!.textContent;
    const originalClass = this.elements.ttsStatus.className;
    
    this.elements.ttsStatus.querySelector('.status-text')!.textContent = message;
    this.elements.ttsStatus.className = 'status-card info';
    
    setTimeout(() => {
      this.elements.ttsStatus.querySelector('.status-text')!.textContent = originalText || '';
      this.elements.ttsStatus.className = originalClass;
    }, 2000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  debugLog('Popup DOM loaded, initializing controller...');
  new PopupController();
});
