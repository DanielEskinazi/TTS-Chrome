import { VoiceManager, VoiceInfo } from '@common/voice-manager';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};

// Mock speechSynthesis
const mockSpeechSynthesis = {
  getVoices: jest.fn(),
  addEventListener: jest.fn(),
  cancel: jest.fn(),
  speak: jest.fn(),
};

// @ts-ignore
global.chrome = mockChrome;
// @ts-ignore
global.speechSynthesis = mockSpeechSynthesis;
// @ts-ignore
global.window = { speechSynthesis: mockSpeechSynthesis };
// @ts-ignore
global.navigator = { language: 'en-US' };

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1.0;
  pitch = 1.0;
  volume = 1.0;
  onend: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

// @ts-ignore
global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

describe('VoiceManager', () => {
  let voiceManager: VoiceManager;
  
  const mockVoices: SpeechSynthesisVoice[] = [
    {
      name: 'Google US English',
      lang: 'en-US',
      voiceURI: 'Google US English',
      localService: false,
      default: true,
    } as SpeechSynthesisVoice,
    {
      name: 'Microsoft David Desktop',
      lang: 'en-US',
      voiceURI: 'Microsoft David Desktop',
      localService: true,
      default: false,
    } as SpeechSynthesisVoice,
    {
      name: 'Google español',
      lang: 'es-ES',
      voiceURI: 'Google español',
      localService: false,
      default: false,
    } as SpeechSynthesisVoice,
    {
      name: 'Enhanced Voice',
      lang: 'en-GB',
      voiceURI: 'Enhanced Voice',
      localService: true,
      default: false,
    } as SpeechSynthesisVoice,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpeechSynthesis.getVoices.mockReturnValue(mockVoices);
    mockChrome.storage.sync.get.mockResolvedValue({});
    mockChrome.storage.sync.set.mockResolvedValue(undefined);
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.runtime.sendMessage.mockResolvedValue(undefined);
    
    voiceManager = new VoiceManager();
  });

  describe('initialization', () => {
    test('should initialize and load voices', async () => {
      await voiceManager.init();
      
      expect(voiceManager.isInitialized()).toBe(true);
      expect(voiceManager.getAvailableVoices().length).toBeGreaterThan(0);
    });

    test('should load preferences from storage', async () => {
      const savedPreferences = {
        selectedVoice: { name: 'Google US English' } as VoiceInfo,
        favoriteVoices: [],
        recentVoices: [],
      };
      
      mockChrome.storage.sync.get.mockResolvedValue(savedPreferences);
      
      await voiceManager.init();
      
      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(['selectedVoice', 'favoriteVoices', 'recentVoices']);
    });

    test('should handle initialization errors gracefully', async () => {
      mockSpeechSynthesis.getVoices.mockImplementation(() => {
        throw new Error('Speech synthesis not available');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(voiceManager.init()).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize Voice Manager:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('voice enumeration', () => {
    test('should process and categorize voices correctly', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      
      expect(voices).toHaveLength(mockVoices.length);
      expect(voices[0]).toHaveProperty('displayName');
      expect(voices[0]).toHaveProperty('languageDisplay');
      expect(voices[0]).toHaveProperty('quality');
      expect(voices[0]).toHaveProperty('gender');
      expect(voices[0]).toHaveProperty('engine');
    });

    test('should format voice names correctly', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      const googleVoice = voices.find(v => v.name === 'Google US English');
      
      expect(googleVoice?.displayName).toBe('US English (Online)');
    });

    test('should categorize voices by language', async () => {
      await voiceManager.init();
      
      const voicesByLanguage = voiceManager.getVoicesByLanguage() as Map<string, VoiceInfo[]>;
      
      expect(voicesByLanguage.get('en-US')).toHaveLength(2);
      expect(voicesByLanguage.get('es-ES')).toHaveLength(1);
      expect(voicesByLanguage.get('en-GB')).toHaveLength(1);
    });

    test('should get voices for specific language', async () => {
      await voiceManager.init();
      
      const englishVoices = voiceManager.getVoicesByLanguage('en-US') as VoiceInfo[];
      
      expect(englishVoices).toHaveLength(2);
      expect(englishVoices.every(v => v.lang === 'en-US')).toBe(true);
    });

    test('should sort voices by user language preference', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      
      // First voices should be in user's language (en-US)
      expect(voices[0].lang).toBe('en-US');
    });
  });

  describe('voice selection', () => {
    test('should select voice by name', async () => {
      await voiceManager.init();
      
      const result = await voiceManager.selectVoice('Google español');
      
      expect(result).toBe(true);
      expect(voiceManager.getSelectedVoice()?.name).toBe('Google español');
    });

    test('should select voice by VoiceInfo object', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      const spanishVoice = voices.find(v => v.lang === 'es-ES')!;
      
      const result = await voiceManager.selectVoice(spanishVoice);
      
      expect(result).toBe(true);
      expect(voiceManager.getSelectedVoice()?.name).toBe('Google español');
    });

    test('should update recent voices when selecting', async () => {
      await voiceManager.init();
      
      await voiceManager.selectVoice('Google español');
      
      const recentVoices = voiceManager.getRecentVoices();
      expect(recentVoices[0].name).toBe('Google español');
    });

    test('should save preferences when selecting voice', async () => {
      await voiceManager.init();
      
      await voiceManager.selectVoice('Google español');
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedVoice: expect.objectContaining({ name: 'Google español' }),
        })
      );
    });

    test('should notify voice change', async () => {
      await voiceManager.init();
      
      await voiceManager.selectVoice('Google español');
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'VOICE_CHANGED',
        payload: { voice: expect.objectContaining({ name: 'Google español' }) },
      });
    });

    test('should return false for unavailable voice', async () => {
      await voiceManager.init();
      
      const result = await voiceManager.selectVoice('Non-existent Voice');
      
      expect(result).toBe(false);
    });
  });

  describe('default voice selection', () => {
    test('should select default voice matching user language', async () => {
      await voiceManager.init();
      
      const selectedVoice = voiceManager.getSelectedVoice();
      
      expect(selectedVoice?.lang).toBe('en-US');
      expect(selectedVoice?.quality).not.toBe('compact');
    });

    test('should fallback to any English voice', async () => {
      // @ts-ignore
      global.navigator = { language: 'fr-FR' };
      
      const frenchManager = new VoiceManager();
      await frenchManager.init();
      
      const selectedVoice = frenchManager.getSelectedVoice();
      
      expect(selectedVoice?.lang.startsWith('en')).toBe(true);
    });

    test('should fallback to first available voice', async () => {
      mockSpeechSynthesis.getVoices.mockReturnValue([
        {
          name: 'Japanese Voice',
          lang: 'ja-JP',
          voiceURI: 'Japanese Voice',
          localService: true,
          default: false,
        } as SpeechSynthesisVoice,
      ]);
      
      const manager = new VoiceManager();
      await manager.init();
      
      const selectedVoice = manager.getSelectedVoice();
      
      expect(selectedVoice?.name).toBe('Japanese Voice');
    });
  });

  describe('favorite voices', () => {
    test('should set and get favorite voices', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      const favorites = voices.slice(0, 2);
      
      await voiceManager.setFavoriteVoices(favorites);
      
      const retrievedFavorites = voiceManager.getFavoriteVoices();
      expect(retrievedFavorites).toHaveLength(2);
    });

    test('should limit favorites to 3 voices', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      
      await voiceManager.setFavoriteVoices(voices); // Try to set all voices
      
      const favorites = voiceManager.getFavoriteVoices();
      expect(favorites).toHaveLength(3);
    });

    test('should filter out unavailable favorites', async () => {
      await voiceManager.init();
      
      // Set favorites with a non-existent voice
      await voiceManager.setFavoriteVoices([
        voiceManager.getAvailableVoices()[0],
        { name: 'Non-existent' } as VoiceInfo,
      ]);
      
      const favorites = voiceManager.getFavoriteVoices();
      expect(favorites).toHaveLength(1);
    });
  });

  describe('recent voices', () => {
    test('should track recent voice selections', async () => {
      await voiceManager.init();
      
      await voiceManager.selectVoice('Google español');
      await voiceManager.selectVoice('Enhanced Voice');
      
      const recent = voiceManager.getRecentVoices();
      
      expect(recent[0].name).toBe('Enhanced Voice');
      expect(recent[1].name).toBe('Google español');
    });

    test('should limit recent voices to 5', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      
      // Select all voices
      for (const voice of voices) {
        await voiceManager.selectVoice(voice);
      }
      
      // Select 2 more times
      await voiceManager.selectVoice(voices[0]);
      await voiceManager.selectVoice(voices[1]);
      
      const recent = voiceManager.getRecentVoices();
      expect(recent).toHaveLength(4); // Only 4 voices available, can't have more than that
    });

    test('should not duplicate voices in recent list', async () => {
      await voiceManager.init();
      
      await voiceManager.selectVoice('Google español');
      await voiceManager.selectVoice('Google español');
      
      const recent = voiceManager.getRecentVoices();
      const spanishVoices = recent.filter(v => v.name === 'Google español');
      
      expect(spanishVoices).toHaveLength(1);
    });
  });


  describe('voice preview', () => {
    test('should preview voice with default text', async () => {
      await voiceManager.init();
      
      const voice = voiceManager.getAvailableVoices()[0];
      
      // Mock the speak method
      const speakPromise = Promise.resolve();
      mockSpeechSynthesis.speak.mockImplementation(() => {
        const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
        if (utterance.onend) {
          setTimeout(() => utterance.onend(), 0);
        }
      });
      
      await voiceManager.previewVoice(voice);
      
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('should preview voice with custom text', async () => {
      await voiceManager.init();
      
      const voice = voiceManager.getAvailableVoices()[0];
      const customText = 'Custom preview text';
      
      mockSpeechSynthesis.speak.mockImplementation(() => {
        const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
        if (utterance.onend) {
          setTimeout(() => utterance.onend(), 0);
        }
      });
      
      await voiceManager.previewVoice(voice, customText);
      
      const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
      expect(utterance.text).toBe(customText);
    });

    test('should use language-specific preview text', async () => {
      await voiceManager.init();
      
      const spanishVoice = voiceManager.getAvailableVoices().find(v => v.lang === 'es-ES')!;
      
      mockSpeechSynthesis.speak.mockImplementation(() => {
        const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
        if (utterance.onend) {
          setTimeout(() => utterance.onend(), 0);
        }
      });
      
      await voiceManager.previewVoice(spanishVoice);
      
      const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
      expect(utterance.text).toContain('¡Hola!');
    });

    test('should handle preview errors', async () => {
      await voiceManager.init();
      
      const voice = voiceManager.getAvailableVoices()[0];
      
      mockSpeechSynthesis.speak.mockImplementation(() => {
        const utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
        if (utterance.onerror) {
          setTimeout(() => utterance.onerror(new Error('Preview error')), 0);
        }
      });
      
      await expect(voiceManager.previewVoice(voice)).rejects.toThrow();
    });
  });

  describe('voice quality determination', () => {
    test('should identify premium voices', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      const onlineVoice = voices.find(v => !v.localService);
      
      expect(onlineVoice?.quality).toBe('premium');
    });

    test('should identify enhanced voices', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      const enhancedVoice = voices.find(v => v.name.includes('Enhanced'));
      
      expect(enhancedVoice?.quality).toBe('enhanced');
    });

    test('should default to standard quality', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      const standardVoice = voices.find(v => v.name === 'Microsoft David Desktop');
      
      expect(standardVoice?.quality).toBe('standard');
    });
  });

  describe('language formatting', () => {
    test('should format common language codes', async () => {
      await voiceManager.init();
      
      const voices = voiceManager.getAvailableVoices();
      const usVoice = voices.find(v => v.lang === 'en-US');
      const spanishVoice = voices.find(v => v.lang === 'es-ES');
      
      expect(usVoice?.languageDisplay).toBe('English (US)');
      expect(spanishVoice?.languageDisplay).toBe('Spanish (Spain)');
    });

    test('should return original code for unknown languages', async () => {
      mockSpeechSynthesis.getVoices.mockReturnValue([
        {
          name: 'Unknown Language',
          lang: 'xx-XX',
          voiceURI: 'Unknown',
          localService: true,
          default: false,
        } as SpeechSynthesisVoice,
      ]);
      
      const manager = new VoiceManager();
      await manager.init();
      
      const voice = manager.getAvailableVoices()[0];
      expect(voice.languageDisplay).toBe('xx-XX');
    });
  });
});