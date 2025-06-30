/**
 * SpeechSynthesizer - Web Speech API integration for TTS Chrome Extension
 * Provides robust text-to-speech functionality with error handling and retry logic
 */

import { MessageType } from './types/messages';

export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  hasQueue: boolean;
  currentText: string | null;
  pausePosition: PausePosition | null;
  canResume: boolean;
}

export interface PausePosition {
  chunkIndex: number;
  queueLength: number;
  timestamp: number;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export type ErrorType = 'network' | 'permission' | 'audio-busy' | 'audio-hardware' | 
  'language-not-supported' | 'voice-unavailable' | 'initialization' | 'unknown';

export type PlaybackStateType = 'started' | 'ended' | 'stopped' | 'paused' | 'resumed';

export class SpeechSynthesizer {
  private isInitialized = false;
  private isPlaying = false;
  private isPaused = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechQueue: Array<{ text: string; options: Partial<SpeechSettings> }> = [];
  private availableVoices: SpeechSynthesisVoice[] = [];
  private defaultVoice: SpeechSynthesisVoice | null = null;
  private pausePosition: PausePosition | null = null;
  private pausedText: string | null = null;
  private currentChunkIndex = 0;
  private settings: SpeechSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voice: null
  };

  constructor() {
    // Don't auto-initialize in constructor to avoid blocking
    // Call init() manually when ready
  }

  async init(): Promise<void> {
    try {
      // Check if Speech Synthesis is supported
      if (!('speechSynthesis' in window)) {
        throw new Error('Speech Synthesis not supported');
      }

      // Load voices (may need to wait for voices to load)
      await this.loadVoices();
      
      // Set up event listeners
      this.setupSpeechEvents();
      
      this.isInitialized = true;
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Speech Synthesizer initialized');
      }
      
    } catch (error) {
      console.error('Failed to initialize Speech Synthesizer:', error);
      this.handleInitializationError(error as Error);
    }
  }

  private async loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve, reject) => {
      // Get voices immediately if available
      let voices = speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        this.processVoices(voices);
        resolve(voices);
      } else {
        // Wait for voices to load
        const voicesChangedHandler = () => {
          voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
            this.processVoices(voices);
            resolve(voices);
          }
        };
        
        speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          if (voices.length === 0) {
            reject(new Error('No voices available'));
          }
        }, 5000);
      }
    });
  }

  private processVoices(voices: SpeechSynthesisVoice[]): void {
    this.availableVoices = voices.filter(voice => !voice.localService || voice.localService);
    
    // Select default voice (prefer English, then system default)
    this.defaultVoice = this.selectDefaultVoice(this.availableVoices);
    this.settings.voice = this.defaultVoice;
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`Loaded ${this.availableVoices.length} voices, default: ${this.defaultVoice?.name}`);
    }
  }

  private selectDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // Priority order: English native voices, English voices, system default, any voice
    const englishNative = voices.find(v => v.lang.startsWith('en') && v.localService);
    const english = voices.find(v => v.lang.startsWith('en'));
    const systemDefault = voices.find(v => v.default);
    
    return englishNative || english || systemDefault || voices[0] || null;
  }

  private setupSpeechEvents(): void {
    // These will be set on individual utterances
    this.onStart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyPlaybackState('started');
    };

    this.onEnd = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.processQueue();
      this.notifyPlaybackState('ended');
    };

    this.onError = (event: SpeechSynthesisErrorEvent) => {
      console.error('Speech synthesis error:', event);
      this.handleSpeechError(event);
    };

    this.onPause = () => {
      this.isPaused = true;
      // Don't notify here since pause() method already handles it
    };

    this.onResume = () => {
      this.isPaused = false;
      // Don't notify here since resume() method already handles it
    };
  }

  private onStart!: () => void;
  private onEnd!: () => void;
  private onError!: (event: SpeechSynthesisErrorEvent) => void;
  private onPause!: () => void;
  private onResume!: () => void;

  async speak(text: string, options: Partial<SpeechSettings> = {}): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Speech Synthesizer not initialized');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text for speech synthesis');
    }

    // Stop current speech if playing
    if (this.isPlaying) {
      this.stop();
    }

    // Preprocess text
    const processedText = this.preprocessText(text);
    
    // Handle long text by chunking
    const chunks = this.chunkText(processedText);
    
    if (chunks.length === 1) {
      // Single chunk - speak directly
      return this.speakChunk(chunks[0], options);
    } else {
      // Multiple chunks - queue them
      return this.speakChunks(chunks, options);
    }
  }

  private preprocessText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Handle common abbreviations
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Missus')
      .replace(/\bMs\./g, 'Miss')
      // Handle URLs (basic)
      .replace(/https?:\/\/[^\s]+/g, 'link')
      // Handle email addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'email address')
      // Clean up extra spaces
      .trim();
  }

  private chunkText(text: string, maxChunkSize = 200): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length <= maxChunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        
        // Handle very long sentences
        if (trimmedSentence.length > maxChunkSize) {
          const subChunks = this.chunkLongSentence(trimmedSentence, maxChunkSize);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  private chunkLongSentence(sentence: string, maxSize: number): string[] {
    const words = sentence.split(' ');
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= maxSize) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private async speakChunk(text: string, options: Partial<SpeechSettings> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings
      utterance.voice = options.voice || this.settings.voice;
      utterance.rate = options.rate || this.settings.rate;
      utterance.pitch = options.pitch || this.settings.pitch;
      utterance.volume = options.volume || this.settings.volume;
      
      // Set up event handlers
      utterance.onstart = () => {
        this.currentUtterance = utterance;
        this.onStart();
      };
      
      utterance.onend = () => {
        this.onEnd();
        resolve();
      };
      
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        // Check if this is an expected interruption
        if (event.error === 'interrupted' || event.error === 'canceled') {
          // This is expected when stopping TTS - don't treat as error
          resolve(); // Resolve instead of reject for interruptions
          return;
        }
        
        this.onError(event);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };
      
      utterance.onpause = this.onPause;
      utterance.onresume = this.onResume;
      
      // Start speech
      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async speakChunks(chunks: string[], options: Partial<SpeechSettings> = {}): Promise<void> {
    this.speechQueue = chunks.map(chunk => ({ text: chunk, options }));
    this.currentChunkIndex = 0;
    return this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.speechQueue.length === 0 || this.isPlaying) {
      return;
    }

    const nextItem = this.speechQueue.shift();
    if (!nextItem) return;
    
    try {
      await this.speakChunk(nextItem.text, nextItem.options);
      this.currentChunkIndex++;
    } catch (error) {
      // Check if this is an expected interruption error
      const errorMessage = (error as Error).message || '';
      const isInterrupted = errorMessage.includes('interrupted') || errorMessage.includes('canceled');
      
      if (isInterrupted) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Speech queue processing interrupted (expected when stopping)');
        }
        return;
      }
      
      // eslint-disable-next-line no-console
    console.error('Error processing speech queue:', error);
      this.handleSpeechError(error as Error);
    }
  }

  pause(): boolean {
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] Pause called - isPlaying:', this.isPlaying, 'isPaused:', this.isPaused, 'speechSynthesis.speaking:', speechSynthesis.speaking);
    
    // Check if speech synthesis is actually speaking
    if (!speechSynthesis.speaking) {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] speechSynthesis is not speaking, cannot pause');
      return false;
    }
    
    if (this.isPlaying && !this.isPaused) {
      try {
        // Store current position for resume
        this.storePausePosition();
        
        // Pause speech synthesis
        speechSynthesis.pause();
        
        this.isPaused = true;
        this.notifyPlaybackState('paused');
        
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] Speech paused successfully, speechSynthesis.paused:', speechSynthesis.paused);
        
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Speech paused at position:', this.pausePosition);
        }
        return true;
      } catch (error) {
        console.error('Error pausing speech:', error);
        return false;
      }
    }
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] Pause conditions not met - returning false');
    return false;
  }

  resume(): boolean {
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] Resume called - isPaused:', this.isPaused, 'speechSynthesis.paused:', speechSynthesis.paused);
    
    if (this.isPaused && speechSynthesis.paused) {
      try {
        // Resume speech synthesis
        speechSynthesis.resume();
        
        this.isPaused = false;
        this.notifyPlaybackState('resumed');
        
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] Speech resumed successfully');
        
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Speech resumed');
        }
        return true;
      } catch (error) {
        console.error('Error resuming speech:', error);
        return false;
      }
    }
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] Resume conditions not met - returning false');
    return false;
  }

  private storePausePosition(): void {
    if (this.currentUtterance) {
      // Store current text and position
      this.pausedText = this.currentUtterance.text;
      this.pausePosition = {
        chunkIndex: this.currentChunkIndex,
        queueLength: this.speechQueue.length,
        timestamp: Date.now()
      };
    }
  }

  togglePause(): boolean {
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] TogglePause called - isPaused:', this.isPaused, 'isPlaying:', this.isPlaying);
    
    if (this.isPaused) {
      return this.resume();
    } else if (this.isPlaying) {
      return this.pause();
    }
    
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] TogglePause - neither paused nor playing, returning false');
    return false;
  }

  stop(): void {
    speechSynthesis.cancel();
    this.speechQueue = [];
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.pausePosition = null;
    this.pausedText = null;
    this.currentChunkIndex = 0;
    this.notifyPlaybackState('stopped');
  }

  // State management
  getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      hasQueue: this.speechQueue.length > 0,
      currentText: this.currentUtterance?.text || null,
      pausePosition: this.pausePosition,
      canResume: this.isPaused && this.pausedText !== null
    };
  }

  private notifyPlaybackState(state: PlaybackStateType): void {
    // Send message to background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: MessageType.TTS_STATE_CHANGED,
        payload: {
          state: state,
          playbackState: this.getPlaybackState(),
          timestamp: Date.now()
        }
      }).catch(error => {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Could not notify playback state:', error);
        }
      });
    }
  }

  private handleSpeechError(error: Error | SpeechSynthesisErrorEvent): void {
    // Check if this is an expected "interrupted" error from stopping TTS
    const errorMessage = 'error' in error ? error.error : error.message || 'unknown';
    const isInterrupted = errorMessage.includes('interrupted') || errorMessage.includes('canceled');
    
    if (isInterrupted) {
      // This is expected when TTS is stopped - don't log as an error
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Speech synthesis interrupted (expected when stopping)');
      }
      this.stop(); // Clean up state
      return;
    }
    
    // Only log and handle unexpected errors
    // eslint-disable-next-line no-console
    console.error('Speech synthesis error:', error);
    
    this.stop(); // Clean up state
    
    // Categorize error and provide appropriate feedback
    const errorType = this.categorizeError(error);
    this.notifyError(errorType, error);
  }

  private categorizeError(error: Error | SpeechSynthesisErrorEvent): ErrorType {
    const errorMessage = 'error' in error ? error.error : error.message || 'unknown';
    
    if (errorMessage.includes('network')) return 'network';
    if (errorMessage.includes('not-allowed')) return 'permission';
    if (errorMessage.includes('audio-busy')) return 'audio-busy';
    if (errorMessage.includes('audio-hardware')) return 'audio-hardware';
    if (errorMessage.includes('language-not-supported')) return 'language-not-supported';
    if (errorMessage.includes('voice-unavailable')) return 'voice-unavailable';
    
    return 'unknown';
  }

  private notifyError(errorType: ErrorType, originalError: Error | SpeechSynthesisErrorEvent): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: MessageType.TTS_ERROR,
        payload: {
          errorType: errorType,
          error: 'message' in originalError ? originalError.message : originalError.error || 'Unknown error',
          timestamp: Date.now()
        }
      }).catch(error => {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Could not notify error:', error);
        }
      });
    }
  }

  private handleInitializationError(error: Error): void {
    console.error('Speech Synthesizer initialization failed:', error);
    this.notifyError('initialization', error);
  }

  // Public API methods
  isReady(): boolean {
    return this.isInitialized && this.availableVoices.length > 0;
  }

  getAvailableVoices(): VoiceInfo[] {
    return this.availableVoices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default
    }));
  }

  setVoice(voiceName: string): boolean {
    const voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      this.settings.voice = voice;
      return true;
    }
    return false;
  }

  setRate(rate: number): boolean {
    if (rate >= 0.1 && rate <= 10) {
      this.settings.rate = rate;
      return true;
    }
    return false;
  }

  setPitch(pitch: number): boolean {
    if (pitch >= 0 && pitch <= 2) {
      this.settings.pitch = pitch;
      return true;
    }
    return false;
  }

  setVolume(volume: number): boolean {
    if (volume >= 0 && volume <= 1) {
      this.settings.volume = volume;
      return true;
    }
    return false;
  }

  getSettings(): SpeechSettings {
    return { ...this.settings };
  }
}

// Ensure proper export for both ES6 and CommonJS
export default SpeechSynthesizer;