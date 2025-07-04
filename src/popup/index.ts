import { MessageType, Message } from '@common/types/messages';
import { VoiceInfo } from '@common/voice-manager';
import {
  TTSState,
  validateTTSState,
  fixInvalidState,
  debugStateTransition,
} from '@common/state-validator';

// Speed info interface
interface SpeedInfo {
  current: number;
  default: number;
  min: number;
  max: number;
  step: number;
  presets: number[];
  formatted: string;
}

// Temporary debug logging - replace devLog with console.log for debugging
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[TTS-Popup-Debug]', ...args);
  }
};

class PopupController {
  private elements: {
    // Status elements
    ttsStatus: HTMLDivElement;
    statusIcon: HTMLDivElement;
    statusText: HTMLDivElement;
    currentText: HTMLDivElement;
    textPreview: HTMLSpanElement;
    initStatus: HTMLDivElement;
    
    // Primary action
    primaryActionBtn: HTMLButtonElement;
    primaryIcon: HTMLSpanElement;
    primaryText: HTMLSpanElement;
    
    // Voice selection
    voiceSelect: HTMLSelectElement;
    
    // Speed control (presets only)
    speedPresets: HTMLDivElement;
    presetButtons: NodeListOf<HTMLButtonElement>;
    
    // Volume control (presets + mute)
    muteBtn: HTMLButtonElement;
    muteIcon: HTMLSpanElement;
    volumePresetButtons: NodeListOf<HTMLButtonElement>;
    domainVolumeIndicator: HTMLDivElement;
    clearDomainVolumeBtn: HTMLButtonElement;
    
    // Advanced settings
    advancedToggle: HTMLButtonElement;
    toggleIcon: HTMLSpanElement;
    advancedPanel: HTMLElement;
    
    // Advanced panel elements
    speakPage: HTMLButtonElement;
    stopBtn: HTMLButtonElement;
    forceStopBtn: HTMLButtonElement;
    testText: HTMLTextAreaElement;
    testSpeak: HTMLButtonElement;
    readingTimeDiv: HTMLDivElement;
    timeEstimate: HTMLSpanElement;
    shortcutsToggle: HTMLButtonElement;
    shortcutsPanel: HTMLDivElement;
    openOptions: HTMLAnchorElement;
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
  private currentSpeed = 1.0;
  
  // Volume control state
  private volumeState = {
    volume: 75,
    isMuted: false,
    domainVolume: null as number | null
  };

  constructor() {
    this.elements = {
      // Status elements
      ttsStatus: document.getElementById('ttsStatus') as HTMLDivElement,
      statusIcon: document.getElementById('statusIcon') as HTMLDivElement,
      statusText: document.getElementById('statusText') as HTMLDivElement,
      currentText: document.getElementById('currentText') as HTMLDivElement,
      textPreview: document.getElementById('textPreview') as HTMLSpanElement,
      initStatus: document.getElementById('initStatus') as HTMLDivElement,
      
      // Primary action
      primaryActionBtn: document.getElementById('primaryActionBtn') as HTMLButtonElement,
      primaryIcon: document.getElementById('primaryIcon') as HTMLSpanElement,
      primaryText: document.getElementById('primaryText') as HTMLSpanElement,
      
      // Voice selection
      voiceSelect: document.getElementById('voiceSelect') as HTMLSelectElement,
      
      // Speed control (presets only)
      speedPresets: document.getElementById('speedPresets') as HTMLDivElement,
      presetButtons: document.querySelectorAll('#speedPresets .preset-btn') as NodeListOf<HTMLButtonElement>,
      
      // Volume control (presets + mute)
      muteBtn: document.getElementById('muteBtn') as HTMLButtonElement,
      muteIcon: document.getElementById('muteIcon') as HTMLSpanElement,
      volumePresetButtons: document.querySelectorAll('.volume-preset-btn') as NodeListOf<HTMLButtonElement>,
      domainVolumeIndicator: document.getElementById('domainVolumeIndicator') as HTMLDivElement,
      clearDomainVolumeBtn: document.getElementById('clearDomainVolumeBtn') as HTMLButtonElement,
      
      // Advanced settings
      advancedToggle: document.getElementById('advancedToggle') as HTMLButtonElement,
      toggleIcon: document.getElementById('toggleIcon') as HTMLSpanElement,
      advancedPanel: document.getElementById('advancedPanel') as HTMLElement,
      
      // Advanced panel elements
      speakPage: document.getElementById('speakPage') as HTMLButtonElement,
      stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
      forceStopBtn: document.getElementById('forceStopBtn') as HTMLButtonElement,
      testText: document.getElementById('testText') as HTMLTextAreaElement,
      testSpeak: document.getElementById('testSpeak') as HTMLButtonElement,
      readingTimeDiv: document.getElementById('readingTime') as HTMLDivElement,
      timeEstimate: document.getElementById('timeEstimate') as HTMLSpanElement,
      shortcutsToggle: document.getElementById('shortcutsToggle') as HTMLButtonElement,
      shortcutsPanel: document.getElementById('shortcutsPanel') as HTMLDivElement,
      openOptions: document.getElementById('openOptions') as HTMLAnchorElement,
    };

    this.initialize();
  }

  private async initialize() {
    await this.loadState();
    await this.updateTTSState();
    await this.enumerateAndUpdateVoices();
    await this.loadVoiceData();
    await this.initializeSpeedManager();
    await this.initializeVolumeManager();
    this.setupEventListeners();
    this.updateUI();
    
    // Additional speed sync attempts to handle timing issues
    setTimeout(() => this.syncSpeedWithBackground(), 500);
    setTimeout(() => this.syncSpeedWithBackground(), 1500);
  }

  private async syncSpeedWithBackground() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_SPEED_INFO
      });
      
      if (response && response.speedInfo) {
        debugLog('Popup: Background speed sync successful:', response.speedInfo);
        this.updateSpeedUI(response.speedInfo);
      }
    } catch (error) {
      debugLog('Popup: Background speed sync failed:', error);
    }
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
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds max
      
      const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          const voiceInfos = this.processVoices(voices);
          resolve(voiceInfos);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(loadVoiceList, 100);
        } else {
          debugLog('Voice enumeration timeout in popup, resolving with empty array');
          resolve([]);
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
        
        // If we got empty voices, retry after a delay (content script might still be loading)
        if (this.voiceData.voices.length === 0) {
          debugLog('No voices received, retrying in 1 second...');
          setTimeout(() => this.retryLoadVoiceData(), 1000);
        } else {
          this.populateVoiceDropdown();
        }
      }
    } catch (error) {
      debugLog('Error loading voice data:', error);
      // Retry on error too
      setTimeout(() => this.retryLoadVoiceData(), 1000);
    }
  }

  private async retryLoadVoiceData() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_VOICE_DATA
      });
      
      if (response && response.success && response.data) {
        this.voiceData = {
          voices: response.data.voices as VoiceInfo[] || [],
          selectedVoice: response.data.selectedVoice as VoiceInfo | null
        };
        
        debugLog('Retry loaded voice data:', this.voiceData.voices.length, 'voices');
        this.populateVoiceDropdown();
      } else {
        debugLog('Retry failed, using fallback voice display');
        this.populateVoiceDropdown();
      }
    } catch (error) {
      debugLog('Error in voice data retry:', error);
      this.populateVoiceDropdown();
    }
  }

  private async initializeSpeedManager(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    try {
      debugLog('Popup: Initializing speed manager, attempt:', retryCount + 1);
      
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_SPEED_INFO
      });
      
      debugLog('Popup: GET_SPEED_INFO response:', response);
      
      // Handle wrapped response format: { success: true, data: { speedInfo: {...} } }
      // or direct format: { speedInfo: {...} }
      const speedInfo = response?.data?.speedInfo || response?.speedInfo;
      
      if (speedInfo) {
        this.updateSpeedUI(speedInfo);
        debugLog('Popup: Speed manager initialized successfully');
      } else if (response && response.error) {
        // Check if it's an initialization error
        const errorMessage = response.error || 'Unknown error';
        if (errorMessage.includes('not yet initialized') && retryCount < maxRetries) {
          debugLog('Popup: SpeedManager not ready, retrying in', retryDelay, 'ms, attempt:', retryCount + 1);
          setTimeout(() => {
            this.initializeSpeedManager(retryCount + 1);
          }, retryDelay);
        } else {
          debugLog('Popup: Speed manager initialization failed after retries:', errorMessage);
          this.showSpeedInitializationError(errorMessage);
        }
      } else {
        debugLog('Popup: Invalid response from speed manager:', response);
        this.showSpeedInitializationError('Invalid response from background script');
      }
    } catch (error) {
      debugLog('Popup: Error initializing speed manager:', error);
      if (retryCount < maxRetries) {
        debugLog('Popup: Retrying speed manager initialization in', retryDelay, 'ms');
        setTimeout(() => {
          this.initializeSpeedManager(retryCount + 1);
        }, retryDelay);
      } else {
        this.showSpeedInitializationError('Failed to communicate with background script');
      }
    }
  }

  private setupEventListeners() {
    // Primary action button
    this.elements.primaryActionBtn.addEventListener('click', () => this.handlePrimaryAction());
    
    // Voice selection
    this.elements.voiceSelect.addEventListener('change', () => this.handleVoiceChange());
    
    // Speed preset buttons
    this.elements.presetButtons.forEach(btn => {
      btn.addEventListener('click', this.handleSpeedPresetClick.bind(this));
    });
    
    // Volume controls
    this.elements.muteBtn.addEventListener('click', this.handleMuteToggle.bind(this));
    this.elements.volumePresetButtons.forEach(btn => {
      btn.addEventListener('click', this.handleVolumePresetClick.bind(this));
    });
    this.elements.clearDomainVolumeBtn.addEventListener('click', this.handleClearDomainVolume.bind(this));
    
    // Advanced settings toggle
    this.elements.advancedToggle.addEventListener('click', () => this.toggleAdvancedPanel());
    
    // Advanced panel elements
    this.elements.speakPage.addEventListener('click', () => this.speakCurrentPage());
    this.elements.stopBtn.addEventListener('click', () => this.handleStop());
    this.elements.forceStopBtn.addEventListener('click', () => this.handleForceStop());
    this.elements.testSpeak.addEventListener('click', () => this.testSpeech());
    this.elements.shortcutsToggle.addEventListener('click', () => this.toggleShortcutsPanel());
    this.elements.openOptions.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboard.bind(this));

    // Listen for TTS state changes and settings updates
    chrome.runtime.onMessage.addListener((message: Message) => {
      if (message.type === MessageType.SETTINGS_UPDATED) {
        this.state = { ...this.state, ...message.payload };
        this.updateUI();
      } else if (message.type === MessageType.TTS_STATE_CHANGED) {
        this.handleTTSStateChange(message.payload || {});
      } else if (message.type === MessageType.VOICE_CHANGED) {
        this.loadVoiceData();
      } else if (message.type === MessageType.SPEED_CHANGED) {
        this.initializeSpeedManager();
      } else if (message.type === MessageType.VOLUME_CHANGED) {
        this.handleVolumeChanged(message.payload || {});
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

  private async handlePrimaryAction() {
    try {
      this.elements.primaryActionBtn.disabled = true;

      if (this.ttsState.isPaused || this.ttsState.isPlaying) {
        // If TTS is active, toggle pause
        await chrome.runtime.sendMessage({
          type: MessageType.TOGGLE_PAUSE_TTS,
          payload: { source: 'popup' },
        });
      } else {
        // If TTS is not active, start speaking selected text or prompt user
        await this.startSpeakingSelectedText();
      }

      // UI will be updated via message listener
    } catch (error) {
      debugLog('Error in primary action:', error);
      this.showError('Failed to perform action');
    } finally {
      // Re-enable button after a short delay
      setTimeout(() => {
        this.elements.primaryActionBtn.disabled = false;
      }, 200);
    }
  }

  private async startSpeakingSelectedText() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.id) {
      try {
        // First, try to get selected text
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.GET_SELECTION,
        });

        if (response && response.text && response.text.trim()) {
          // If we have selected text, speak it
          await chrome.tabs.sendMessage(tab.id, {
            type: MessageType.SPEAK_SELECTION,
            payload: { text: response.text },
          });
        } else {
          // If no text is selected, show helpful message
          this.showTemporaryMessage('Select text on the page to start speaking');
        }
      } catch (error) {
        debugLog('Error getting selected text:', error);
        this.showError('No text selected. Please select text on the page.');
      }
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

    // Update status indicator
    if (this.ttsState.isPaused) {
      debugLog('[updateTTSUI] Entering PAUSED condition');
      this.elements.statusIcon.textContent = '⏸️';
      this.elements.statusText.textContent = 'Paused';
      this.elements.ttsStatus.className = 'status-indicator paused';
      this.updatePrimaryButton('resume');

      // Show current text if available
      if (this.ttsState.currentText) {
        this.showCurrentText();
      }
    } else if (this.ttsState.isPlaying) {
      debugLog('[updateTTSUI] Entering PLAYING condition');
      this.elements.statusIcon.textContent = '🔊';
      this.elements.statusText.textContent = 'Speaking...';
      this.elements.ttsStatus.className = 'status-indicator speaking';
      this.elements.statusIcon.classList.add('speaking'); // For animation
      this.updatePrimaryButton('pause');

      // Show current text if available
      if (this.ttsState.currentText) {
        this.showCurrentText();
      }
    } else {
      debugLog('[updateTTSUI] Entering STOPPED condition');
      this.elements.statusIcon.textContent = '🟢';
      this.elements.statusText.textContent = 'Ready to speak';
      this.elements.ttsStatus.className = 'status-indicator ready';
      this.elements.statusIcon.classList.remove('speaking');
      this.updatePrimaryButton('speak');
      this.hideCurrentText();
    }

    // Update button states
    this.elements.primaryActionBtn.disabled = false; // Always enabled, handles states internally
    this.elements.stopBtn.disabled = !(this.ttsState.isPlaying || this.ttsState.isPaused);
    this.elements.forceStopBtn.disabled = !(this.ttsState.isPlaying || this.ttsState.isPaused);
  }

  private updatePrimaryButton(mode: 'speak' | 'pause' | 'resume') {
    debugLog('[updatePrimaryButton] Setting button mode to:', mode);
    
    // Remove existing state classes
    this.elements.primaryActionBtn.classList.remove('speaking', 'paused');
    
    switch (mode) {
      case 'speak':
        this.elements.primaryIcon.textContent = '▶️';
        this.elements.primaryText.textContent = 'Speak';
        break;
      case 'pause':
        this.elements.primaryIcon.textContent = '⏸️';
        this.elements.primaryText.textContent = 'Pause';
        this.elements.primaryActionBtn.classList.add('speaking');
        break;
      case 'resume':
        this.elements.primaryIcon.textContent = '▶️';
        this.elements.primaryText.textContent = 'Resume';
        this.elements.primaryActionBtn.classList.add('paused');
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
    this.elements.statusIcon.textContent = '❌';
    this.elements.statusText.textContent = message;
    this.elements.ttsStatus.className = 'status-indicator error';

    // Reset after 3 seconds
    setTimeout(() => {
      this.updateTTSState();
    }, 3000);
  }

  private toggleAdvancedPanel() {
    const isVisible = this.elements.advancedPanel.style.display !== 'none';
    
    if (isVisible) {
      this.elements.advancedPanel.style.display = 'none';
      this.elements.toggleIcon.textContent = '▼';
      this.elements.toggleIcon.classList.remove('rotated');
    } else {
      this.elements.advancedPanel.style.display = 'block';
      this.elements.toggleIcon.textContent = '▲';
      this.elements.toggleIcon.classList.add('rotated');
    }
  }

  private toggleShortcutsPanel() {
    const isVisible = this.elements.shortcutsPanel.style.display !== 'none';
    const icon = this.elements.shortcutsToggle.querySelector('.toggle-icon') as HTMLElement;
    
    if (isVisible) {
      this.elements.shortcutsPanel.style.display = 'none';
      icon.textContent = '▼';
    } else {
      this.elements.shortcutsPanel.style.display = 'block';
      icon.textContent = '▲';
    }
  }

  private async handleSpeedPresetClick(event: Event) {
    const speed = parseFloat((event.target as HTMLButtonElement).dataset.speed || '1');
    
    // Immediately update UI for responsive feedback
    this.updateSpeedPresetButtons(speed);
    
    await this.setSpeed(speed);
  }

  private updateSpeedPresetButtons(currentSpeed: number) {
    this.elements.presetButtons.forEach(btn => {
      const presetSpeed = parseFloat(btn.dataset.speed || '1');
      if (Math.abs(presetSpeed - currentSpeed) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateUI() {
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
      return;
    }
    
    const voiceName = this.elements.voiceSelect.value;
    if (!voiceName) return;
    
    try {
      this.isPreviewPlaying = true;
      
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


  private updateSpeedUI(speedInfo: SpeedInfo) {
    this.currentSpeed = speedInfo.current;
    
    // Update preset buttons only
    this.updateSpeedPresetButtons(speedInfo.current);
  }


  // Speed preset methods - simplified for preset-only approach
  private async handleSpeedUp() {
    const presets = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = presets.findIndex(preset => Math.abs(preset - this.currentSpeed) < 0.05);
    const nextIndex = Math.min(currentIndex + 1, presets.length - 1);
    
    if (nextIndex > currentIndex) {
      await this.setSpeed(presets[nextIndex]);
    }
  }

  private async handleSpeedDown() {
    const presets = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = presets.findIndex(preset => Math.abs(preset - this.currentSpeed) < 0.05);
    const prevIndex = Math.max(currentIndex - 1, 0);
    
    if (prevIndex < currentIndex) {
      await this.setSpeed(presets[prevIndex]);
    }
  }

  private async setSpeed(speed: number) {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.SET_SPEED,
        data: { speed: speed }
      });
      
      // Try to update from background, but don't fail if it's unavailable
      await this.initializeSpeedManager().catch(() => {
        debugLog('Background update failed, using local speed value');
      });
      
      this.showTemporaryMessage(`Speed set to ${speed}x`);
    } catch (error) {
      debugLog('Background communication failed, applying speed locally:', error);
      
      // Fallback: Apply speed change locally
      this.currentSpeed = speed;
      this.updateSpeedPresetButtons(speed);
      
      // Show message indicating local-only mode
      this.showTemporaryMessage(`Speed set to ${speed}x (local mode)`);
    }
  }

  private handleKeyboard(event: KeyboardEvent) {
    // Speed control shortcuts
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.handleSpeedUp();
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.handleSpeedDown();
    } else if (event.key >= '1' && event.key <= '5') {
      // Number keys for presets
      const presetIndex = parseInt(event.key) - 1;
      const presetBtn = this.elements.presetButtons[presetIndex];
      if (presetBtn) {
        event.preventDefault();
        presetBtn.click();
      }
    }
  }

  private async updateTimeEstimate(speed: number | null = null) {
    try {
      // Get current selection or playing text
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_CURRENT_TEXT_LENGTH
      });
      
      if (response && response.length > 0) {
        const effectiveSpeed = speed || this.currentSpeed;
        const timeInfo = this.calculateReadingTime(response.length, effectiveSpeed);
        
        this.elements.timeEstimate.textContent = timeInfo.formatted;
        this.elements.readingTimeDiv.style.display = 'block';
      } else {
        this.elements.readingTimeDiv.style.display = 'none';
      }
    } catch (error) {
      debugLog('Error updating time estimate:', error);
    }
  }

  private calculateReadingTime(characterCount: number, speed: number) {
    const baseWPM = 150; // Average words per minute
    const avgWordLength = 5; // Average characters per word
    
    const words = characterCount / avgWordLength;
    const minutes = words / (baseWPM * speed);
    
    return {
      minutes: minutes,
      formatted: this.formatReadingTime(minutes)
    };
  }

  private formatReadingTime(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  }

  private showSpeedInitializationError(error: string) {
    debugLog('Popup: Showing speed initialization error:', error);
    
    // Use local fallback instead of completely disabling
    this.enableLocalSpeedControl();
    
    // Show temporary error message with retry option
    this.showTemporaryMessage('Speed control using local fallback. Retrying background connection...');
    
    // Retry background connection after a delay
    setTimeout(() => {
      this.initializeSpeedManager().catch(() => {
        debugLog('Background retry failed, continuing with local fallback');
      });
    }, 3000);
  }

  private enableLocalSpeedControl() {
    // Enable preset controls with local-only speed control
    debugLog('Enabling local speed control with preset buttons');
    
    // Try to get actual current speed from background before using fallback
    chrome.runtime.sendMessage({ type: MessageType.GET_SPEED_INFO })
      .then(response => {
        if (response && response.speedInfo) {
          debugLog('Got current speed from background for fallback mode:', response.speedInfo);
          this.updateSpeedUI(response.speedInfo);
        } else {
          // Use fallback values only if we can't get current speed
          this.applyFallbackSpeedValues();
        }
      })
      .catch(() => {
        this.applyFallbackSpeedValues();
      });
  }

  private applyFallbackSpeedValues() {
    const fallbackSpeedInfo: SpeedInfo = {
      current: 1.0,
      default: 1.0,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      presets: [0.75, 1.0, 1.25, 1.5, 2.0],
      formatted: '1.0x'
    };
    
    this.updateSpeedUI(fallbackSpeedInfo);
    debugLog('Speed control enabled with local fallback values');
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

  // Volume control methods
  private async initializeVolumeManager() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_VOLUME_STATE
      });
      
      if (response && response.data) {
        this.volumeState.volume = response.data.volume || 70;
        this.volumeState.isMuted = response.data.isMuted || false;
        this.volumeState.domainVolume = response.data.domainVolume || null;
        this.updateVolumeUI();
      }
    } catch (error) {
      debugLog('Error initializing volume manager:', error);
    }
  }

  private updateVolumeUI() {
    // Update mute button icon
    this.elements.muteIcon.textContent = this.volumeState.isMuted ? '🔇' : '🔊';
    
    // Update preset buttons
    this.updateVolumePresetButtons(this.volumeState.volume);
    
    // Update domain indicator
    if (this.volumeState.domainVolume !== null) {
      this.elements.domainVolumeIndicator.style.display = 'flex';
    } else {
      this.elements.domainVolumeIndicator.style.display = 'none';
    }
  }

  private updateVolumePresetButtons(currentVolume: number) {
    this.elements.volumePresetButtons.forEach(btn => {
      const presetVolume = parseInt(btn.dataset.volume || '70');
      if (Math.abs(presetVolume - currentVolume) < 5) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }


  private async setVolume(volume: number) {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.SET_VOLUME,
        volume: volume,
        options: { smooth: true }
      });
      
      this.showTemporaryMessage(`Volume set to ${volume}%`);
    } catch (error) {
      debugLog('Error setting volume:', error);
    }
  }

  private async handleMuteToggle() {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.TOGGLE_MUTE
      });
      
      // Update UI based on response
      await this.initializeVolumeManager();
    } catch (error) {
      debugLog('Error toggling mute:', error);
    }
  }

  private async handleVolumePresetClick(event: Event) {
    const volume = parseInt((event.target as HTMLButtonElement).dataset.volume || '75');
    
    // Update UI immediately
    this.updateVolumePresetButtons(volume);
    this.volumeState.volume = volume;
    
    await this.setVolume(volume);
  }

  private async handleClearDomainVolume() {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.CLEAR_DOMAIN_VOLUME
      });
      
      this.volumeState.domainVolume = null;
      this.elements.domainVolumeIndicator.style.display = 'none';
      this.showTemporaryMessage('Domain volume cleared');
    } catch (error) {
      debugLog('Error clearing domain volume:', error);
    }
  }

  private handleVolumeChanged(message: { volume?: number; isMuted?: boolean }): void {
    if (message.volume !== undefined) {
      this.volumeState.volume = message.volume;
      this.volumeState.isMuted = message.isMuted || false;
      this.updateVolumeUI();
    }
  }

  // Cleanup method to prevent memory leaks
  public cleanup() {
    // Cancel any ongoing speech synthesis
    if (this.isPreviewPlaying) {
      speechSynthesis.cancel();
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  debugLog('Popup DOM loaded, initializing controller...');
  new PopupController();
});
