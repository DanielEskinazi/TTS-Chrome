export interface VoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
  displayName: string;
  languageDisplay: string;
  quality: 'premium' | 'enhanced' | 'standard' | 'compact';
  gender: 'male' | 'female' | 'neutral';
  engine: string;
}

export interface VoicePreferences {
  selectedVoice: VoiceInfo | null;
  favoriteVoices: VoiceInfo[];
  recentVoices: VoiceInfo[];
  defaultVoices: Map<string, VoiceInfo>;
}

export class VoiceManager {
  private availableVoices: VoiceInfo[] = [];
  private voicesByLanguage: Map<string, VoiceInfo[]> = new Map();
  private selectedVoice: VoiceInfo | null = null;
  private favoriteVoices: VoiceInfo[] = [];
  private recentVoices: VoiceInfo[] = [];
  private defaultVoices: Map<string, VoiceInfo> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    try {
      await this.loadPreferences();
      
      // Check if we're in a context with speechSynthesis access
      if (this.hasSpeechSynthesis()) {
        await this.loadVoices();
        
        speechSynthesis.addEventListener('voiceschanged', () => {
          this.loadVoices();
        });
      } else {
        // For background script, we'll initialize with stored voice data
        // Actual voice enumeration will happen when popup or content script loads
        await this.loadStoredVoiceData();
        
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Voice Manager initialized in background context (no direct speechSynthesis access)');
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Voice Manager:', error);
      throw error;
    }
  }

  private hasSpeechSynthesis(): boolean {
    return typeof speechSynthesis !== 'undefined' && speechSynthesis !== null;
  }

  private async loadVoices(): Promise<VoiceInfo[]> {
    if (!this.hasSpeechSynthesis()) {
      return [];
    }

    return new Promise((resolve) => {
      const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          this.processVoices(voices);
          // Store voice data for background script access
          this.storeVoiceData();
          resolve(this.availableVoices);
        } else {
          setTimeout(loadVoiceList, 100);
        }
      };
      
      loadVoiceList();
    });
  }

  private processVoices(voices: SpeechSynthesisVoice[]): void {
    this.availableVoices = [];
    this.voicesByLanguage.clear();
    
    voices.forEach(voice => {
      const voiceInfo: VoiceInfo = {
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
      };
      
      this.availableVoices.push(voiceInfo);
      
      if (!this.voicesByLanguage.has(voice.lang)) {
        this.voicesByLanguage.set(voice.lang, []);
      }
      this.voicesByLanguage.get(voice.lang)!.push(voiceInfo);
    });
    
    this.sortVoices();
    
    if (!this.selectedVoice || !this.isVoiceAvailable(this.selectedVoice)) {
      this.selectDefaultVoice();
    }
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

  private sortVoices(): void {
    this.availableVoices.sort((a, b) => {
      // Use navigator.language if available, otherwise default to 'en-US'
      const userLang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
      if (a.lang.startsWith(userLang) && !b.lang.startsWith(userLang)) return -1;
      if (!a.lang.startsWith(userLang) && b.lang.startsWith(userLang)) return 1;
      
      const qualityOrder = { premium: 0, enhanced: 1, standard: 2, compact: 3 };
      const qualityDiff = qualityOrder[a.quality] - qualityOrder[b.quality];
      if (qualityDiff !== 0) return qualityDiff;
      
      return a.displayName.localeCompare(b.displayName);
    });
  }

  private selectDefaultVoice(): void {
    // Use navigator.language if available, otherwise default to 'en-US'
    const userLang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    
    let voice = this.availableVoices.find(v => 
      v.lang === userLang && v.quality !== 'compact'
    );
    
    if (!voice) {
      voice = this.availableVoices.find(v => 
        v.lang.startsWith(userLang.split('-')[0])
      );
    }
    
    if (!voice) {
      voice = this.availableVoices.find(v => v.lang.startsWith('en'));
    }
    
    if (!voice) {
      voice = this.availableVoices[0];
    }
    
    this.selectedVoice = voice;
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await chrome.storage.sync.get(['selectedVoice', 'favoriteVoices', 'recentVoices']);
      
      if (stored.selectedVoice) {
        this.selectedVoice = stored.selectedVoice;
      }
      
      if (stored.favoriteVoices) {
        this.favoriteVoices = stored.favoriteVoices;
      }
      
      if (stored.recentVoices) {
        this.recentVoices = stored.recentVoices;
      }
    } catch (error) {
      console.error('Error loading voice preferences:', error);
    }
  }

  private async loadStoredVoiceData(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(['availableVoices', 'voicesByLanguage']);
      
      if (stored.availableVoices) {
        this.availableVoices = stored.availableVoices;
        
        // Rebuild voicesByLanguage map
        this.voicesByLanguage.clear();
        this.availableVoices.forEach(voice => {
          if (!this.voicesByLanguage.has(voice.lang)) {
            this.voicesByLanguage.set(voice.lang, []);
          }
          this.voicesByLanguage.get(voice.lang)!.push(voice);
        });
        
        // Verify selected voice is still available
        if (this.selectedVoice && !this.isVoiceAvailable(this.selectedVoice)) {
          this.selectDefaultVoice();
        }
      }
    } catch (error) {
      console.error('Error loading stored voice data:', error);
    }
  }

  private async storeVoiceData(): Promise<void> {
    try {
      // Convert Map to serializable format
      const voicesByLanguageObj: Record<string, VoiceInfo[]> = {};
      this.voicesByLanguage.forEach((voices, lang) => {
        voicesByLanguageObj[lang] = voices;
      });
      
      await chrome.storage.local.set({
        availableVoices: this.availableVoices,
        voicesByLanguage: voicesByLanguageObj,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error storing voice data:', error);
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        selectedVoice: this.selectedVoice,
        favoriteVoices: this.favoriteVoices,
        recentVoices: this.recentVoices
      });
    } catch (error) {
      console.error('Error saving voice preferences:', error);
    }
  }

  getAvailableVoices(): VoiceInfo[] {
    return this.availableVoices;
  }

  getVoicesByLanguage(langCode?: string): VoiceInfo[] | Map<string, VoiceInfo[]> {
    if (langCode) {
      return this.voicesByLanguage.get(langCode) || [];
    }
    return this.voicesByLanguage;
  }

  getSelectedVoice(): VoiceInfo | null {
    return this.selectedVoice;
  }

  async selectVoice(voiceNameOrInfo: string | VoiceInfo): Promise<boolean> {
    let voice: VoiceInfo | undefined;
    
    if (typeof voiceNameOrInfo === 'string') {
      voice = this.availableVoices.find(v => v.name === voiceNameOrInfo);
    } else {
      voice = voiceNameOrInfo;
    }
    
    if (voice && this.isVoiceAvailable(voice)) {
      this.selectedVoice = voice;
      this.updateRecentVoices(voice);
      await this.savePreferences();
      this.notifyVoiceChange(voice);
      return true;
    }
    
    return false;
  }

  private updateRecentVoices(voice: VoiceInfo): void {
    this.recentVoices = this.recentVoices.filter(v => v.name !== voice.name);
    this.recentVoices.unshift(voice);
    this.recentVoices = this.recentVoices.slice(0, 5);
  }

  private isVoiceAvailable(voice: VoiceInfo): boolean {
    return this.availableVoices.some(v => v.name === voice.name);
  }

  getFavoriteVoices(): VoiceInfo[] {
    return this.favoriteVoices.filter(v => this.isVoiceAvailable(v));
  }

  async setFavoriteVoices(voices: VoiceInfo[]): Promise<void> {
    this.favoriteVoices = voices.slice(0, 3);
    await this.savePreferences();
  }

  getRecentVoices(): VoiceInfo[] {
    return this.recentVoices.filter(v => this.isVoiceAvailable(v));
  }


  private notifyVoiceChange(voice: VoiceInfo): void {
    chrome.runtime.sendMessage({
      type: 'VOICE_CHANGED',
      payload: { voice }
    }).catch(() => {
      // Ignore if no listeners
    });
  }

  async previewVoice(voice: VoiceInfo, text?: string): Promise<void> {
    if (!this.hasSpeechSynthesis()) {
      // In background script, we can't preview directly
      throw new Error('Voice preview not available in background context');
    }

    const previewText = text || this.getPreviewText(voice.lang);
    
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(previewText);
      
      const systemVoice = speechSynthesis.getVoices().find(v => v.name === voice.name);
      if (systemVoice) {
        utterance.voice = systemVoice;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      
      speechSynthesis.cancel();
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

  isInitialized(): boolean {
    return this.initialized;
  }

  // Method to update voice data from a context with speechSynthesis access
  async updateVoiceData(voices: VoiceInfo[]): Promise<void> {
    this.availableVoices = voices;
    this.voicesByLanguage.clear();
    
    // Rebuild voicesByLanguage map
    voices.forEach(voice => {
      if (!this.voicesByLanguage.has(voice.lang)) {
        this.voicesByLanguage.set(voice.lang, []);
      }
      this.voicesByLanguage.get(voice.lang)!.push(voice);
    });
    
    // Store for background script access
    await this.storeVoiceData();
    
    // Verify selected voice is still available
    if (!this.selectedVoice || !this.isVoiceAvailable(this.selectedVoice)) {
      this.selectDefaultVoice();
    }
  }
}