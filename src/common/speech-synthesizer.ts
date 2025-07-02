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
  private lastToggleTime = 0; // For debouncing pause/resume operations
  private utteranceStartTime = 0; // Track when current utterance started
  private isChangingRate = false; // Flag to track rate change operations
  private rateChangeTimeout: NodeJS.Timeout | null = null; // Track pending rate change
  private cleanupTimeout: NodeJS.Timeout | null = null; // Track cleanup operations
  private lastStopTime = 0; // Track when stop was last called for debouncing
  private readonly START_DEBOUNCE_DELAY = 200; // Minimum ms between stop and start
  private settings: SpeechSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voice: null
  };

  constructor() {
    // Initialize immediately with basic functionality
    this.initializeSync();
    // Load voices in background without blocking
    this.loadVoicesAsync();
  }

  private initializeSync(): void {
    // Check if Speech Synthesis is supported
    if (!('speechSynthesis' in window)) {
      console.warn('Speech Synthesis not supported');
      return;
    }

    // Set up event listeners immediately
    this.setupSpeechEvents();
    
    // Mark as ready for basic functionality
    this.isInitialized = true;
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Speech Synthesizer initialized (sync) - basic functionality ready');
    }
  }

  private async loadVoicesAsync(): Promise<void> {
    try {
      // Load voices in background without blocking startup
      await this.loadVoices();
      
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Speech Synthesizer voice enumeration completed');
      }
      
    } catch (error) {
      console.warn('Voice enumeration failed, using fallback:', error);
      // Extension still works with default system voice
      this.handleInitializationError(error as Error);
    }
  }

  async init(): Promise<void> {
    // For backward compatibility - now just waits for voice loading
    if (!this.isInitialized) {
      this.initializeSync();
    }
    // Don't block - voices load in background
  }

  private async loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      // Check cache first for faster subsequent loads
      let voices = speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        this.processVoices(voices);
        resolve(voices);
        return;
      }

      // Setup voice loading with shorter timeout and fallback
      let isResolved = false;
      
      const voicesChangedHandler = () => {
        if (isResolved) return;
        
        voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          isResolved = true;
          speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          this.processVoices(voices);
          resolve(voices);
        }
      };
      
      speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
      
      // Reduced timeout to 2 seconds instead of 5
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          
          // Always resolve, even with no voices - use system default
          if (voices.length === 0) {
            console.warn('No voices loaded, using system default');
            this.useSystemDefaults();
          } else {
            this.processVoices(voices);
          }
          resolve(voices);
        }
      }, 2000);
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

  private useSystemDefaults(): void {
    // Use minimal fallback configuration when no voices are available
    this.availableVoices = [];
    this.defaultVoice = null;
    this.settings.voice = null;
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Using system default voice (no enumeration available)');
    }
  }

  private selectDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // Priority order: English native voices, English voices, system default, any voice
    const englishNative = voices.find(v => v.lang.startsWith('en') && v.localService);
    const english = voices.find(v => v.lang.startsWith('en'));
    const systemDefault = voices.find(v => v.default);
    
    return englishNative || english || systemDefault || voices[0] || null;
  }

  // Removed setupVolumeMessageHandler as volume is now handled via content script message handler

  private setupSpeechEvents(): void {
    // These will be set on individual utterances
    this.onStart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyPlaybackState('started');
    };

    this.onEnd = () => {
      // Don't change playing state if we're changing rate
      if (!this.isChangingRate) {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.processQueue();
        this.notifyPlaybackState('ended');
      } else {
        console.log('[SpeechSynthesizer] onEnd called during rate change - preserving state');
      }
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

    // Progressive preparation with multiple fallback strategies
    await this.prepareForSpeech();

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

  private async prepareForSpeech(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Preparing for speech...');
    }

    // Step 1: Stop any current speech cleanly
    if (this.isPlaying) {
      this.stop();
    }

    // Step 2: Respect debouncing delay for stability
    if (!this.canStart()) {
      const waitTime = this.START_DEBOUNCE_DELAY - (Date.now() - this.lastStopTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Step 3: Simple state validation (now very permissive)
    if (!this.validateAPIState()) {
      // Only do a simple cleanup for the rare cases that fail validation
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] API state needs simple cleanup');
      }
      speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 4: Reset internal state for fresh start
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.speechQueue = [];

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Speech preparation completed');
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
        this.utteranceStartTime = Date.now();
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
    // Enhanced API state logging
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] Pause called - API State:', {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      'speechSynthesis.speaking': speechSynthesis.speaking,
      'speechSynthesis.paused': speechSynthesis.paused,
      'speechSynthesis.pending': speechSynthesis.pending
    });
    
    // More flexible pause conditions
    if (!this.isPlaying || this.isPaused) {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Not in playing state, cannot pause');
      return false;
    }

    // Check if API is in a pauseable state
    if (!speechSynthesis.speaking) {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] API not speaking, aligning internal state');
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyPlaybackState('stopped');
      return false;
    }
    
    try {
      // Store current position for resume
      this.storePausePosition();
      
      // Update internal state immediately for responsiveness
      this.isPaused = true;
      this.notifyPlaybackState('paused');
      
      // Attempt to pause API
      speechSynthesis.pause();
      
      // Graceful pause verification with progressive fallbacks
      this.verifyPauseState();
      
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Pause initiated, state updated');
      return true;
      
    } catch (error) {
      console.error('Error pausing speech:', error);
      // Restore state on error
      this.isPaused = false;
      this.notifyPlaybackState('started');
      return false;
    }
  }

  private verifyPauseState(): void {
    // Progressive verification with multiple fallback strategies
    const checkPause = (attempt: number = 1) => {
      setTimeout(() => {
        const apiPaused = speechSynthesis.paused;
        const apiSpeaking = speechSynthesis.speaking;
        
        // eslint-disable-next-line no-console
        console.log(`[TTS-Debug] Pause verification attempt ${attempt}:`, {
          'speechSynthesis.speaking': apiSpeaking,
          'speechSynthesis.paused': apiPaused,
          'speechSynthesis.pending': speechSynthesis.pending
        });
        
        // Success case: API is paused
        if (apiPaused && apiSpeaking) {
          // eslint-disable-next-line no-console
          console.log('[TTS-Debug] Pause verified successfully');
          return;
        }
        
        // Problem case: Still playing despite pause attempt
        if (apiSpeaking && !apiPaused && attempt < 3) {
          // eslint-disable-next-line no-console
          console.warn(`[TTS-Debug] Pause attempt ${attempt} failed, retrying...`);
          speechSynthesis.pause();
          checkPause(attempt + 1);
          return;
        }
        
        // API stopped completely (might be end of utterance)
        if (!apiSpeaking && !apiPaused) {
          // eslint-disable-next-line no-console
          console.log('[TTS-Debug] Speech ended during pause attempt');
          this.isPaused = false;
          this.isPlaying = false;
          this.notifyPlaybackState('ended');
          return;
        }
        
        // Final fallback: Accept current state but log warning
        if (attempt >= 3) {
          // eslint-disable-next-line no-console
          console.warn('[TTS-Debug] Pause verification failed after 3 attempts, proceeding anyway');
          // Keep our internal pause state even if API disagrees
        }
      }, attempt * 50); // Progressive delay: 50ms, 100ms, 150ms
    };
    
    checkPause();
  }

  resume(): boolean {
    // Enhanced API state logging
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] Resume called - API State:', {
      isPaused: this.isPaused,
      'speechSynthesis.speaking': speechSynthesis.speaking,
      'speechSynthesis.paused': speechSynthesis.paused,
      'speechSynthesis.pending': speechSynthesis.pending
    });
    
    // More flexible resume conditions
    if (!this.isPaused) {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Not in paused state, cannot resume');
      return false;
    }
    
    // Handle state mismatches gracefully
    if (this.isPaused && !speechSynthesis.paused) {
      // eslint-disable-next-line no-console
      console.warn('[TTS-Debug] State mismatch: internally paused but API not paused');
      
      // Check if speech is actually playing
      if (speechSynthesis.speaking) {
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] API is actually playing, aligning state');
        this.isPaused = false;
        this.notifyPlaybackState('resumed');
        return true;
      } else {
        // Speech ended while we thought it was paused
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] Speech ended while paused, resetting state');
        this.isPlaying = false;
        this.isPaused = false;
        this.notifyPlaybackState('ended');
        return false;
      }
    }
    
    // Handle truly stuck states more gracefully
    if (speechSynthesis.paused && !speechSynthesis.speaking) {
      // This can be a normal transitional state, only recover if it's persistent
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[TTS-Debug] API in transitional paused state, attempting resume anyway');
      }
      // Don't immediately cancel - try resume first
    }
    
    try {
      // Update internal state immediately for responsiveness
      this.isPaused = false;
      this.notifyPlaybackState('resumed');
      
      // Attempt to resume API
      speechSynthesis.resume();
      
      // Graceful resume verification with progressive fallbacks
      this.verifyResumeState();
      
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] Resume initiated, state updated');
      return true;
      
    } catch (error) {
      console.error('Error resuming speech:', error);
      // Restore pause state on error
      this.isPaused = true;
      this.notifyPlaybackState('paused');
      return false;
    }
  }

  private verifyResumeState(): void {
    // Progressive verification with multiple fallback strategies
    const checkResume = (attempt: number = 1) => {
      setTimeout(() => {
        const apiPaused = speechSynthesis.paused;
        const apiSpeaking = speechSynthesis.speaking;
        
        // eslint-disable-next-line no-console
        console.log(`[TTS-Debug] Resume verification attempt ${attempt}:`, {
          'speechSynthesis.speaking': apiSpeaking,
          'speechSynthesis.paused': apiPaused,
          'speechSynthesis.pending': speechSynthesis.pending
        });
        
        // Success case: API is playing (speaking and not paused)
        if (apiSpeaking && !apiPaused) {
          // eslint-disable-next-line no-console
          console.log('[TTS-Debug] Resume verified successfully');
          return;
        }
        
        // Problem case: Still paused despite resume attempt
        if (apiSpeaking && apiPaused && attempt < 3) {
          // eslint-disable-next-line no-console
          console.warn(`[TTS-Debug] Resume attempt ${attempt} failed, retrying...`);
          speechSynthesis.resume();
          checkResume(attempt + 1);
          return;
        }
        
        // API stopped completely during resume
        if (!apiSpeaking && !apiPaused) {
          // eslint-disable-next-line no-console
          console.log('[TTS-Debug] Speech ended during resume attempt');
          this.isPaused = false;
          this.isPlaying = false;
          this.notifyPlaybackState('ended');
          return;
        }
        
        // Stuck in paused state - force recovery
        if (!apiSpeaking && apiPaused && attempt >= 2) {
          // eslint-disable-next-line no-console
          console.warn('[TTS-Debug] API stuck in paused state, forcing recovery');
          speechSynthesis.cancel();
          this.isPlaying = false;
          this.isPaused = false;
          this.notifyPlaybackState('stopped');
          return;
        }
        
        // Final fallback: Accept current state but log warning
        if (attempt >= 3) {
          // eslint-disable-next-line no-console
          console.warn('[TTS-Debug] Resume verification failed after 3 attempts, proceeding anyway');
          // Keep our internal resume state even if API disagrees
        }
      }, attempt * 50); // Progressive delay: 50ms, 100ms, 150ms
    };
    
    checkResume();
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
    const now = Date.now();
    const timeSinceLastToggle = now - this.lastToggleTime;
    
    // Debounce: prevent rapid successive calls (minimum 300ms between operations)
    if (timeSinceLastToggle < 300) {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] TogglePause debounced - too soon since last toggle:', timeSinceLastToggle + 'ms');
      return false;
    }
    
    this.lastToggleTime = now;
    
    // Enhanced API state logging
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug] TogglePause called - Current State:', {
      isPaused: this.isPaused,
      isPlaying: this.isPlaying,
      'speechSynthesis.speaking': speechSynthesis.speaking,
      'speechSynthesis.paused': speechSynthesis.paused,
      'speechSynthesis.pending': speechSynthesis.pending,
      timeSinceLastToggle: timeSinceLastToggle + 'ms'
    });
    
    // Check for inconsistent state and try to recover
    if (!speechSynthesis.speaking && (this.isPlaying || this.isPaused)) {
      console.warn('[TTS-Debug] State inconsistency detected - resetting state');
      console.warn('[TTS-Debug] Internal state:', { isPlaying: this.isPlaying, isPaused: this.isPaused });
      console.warn('[TTS-Debug] API state:', { speaking: speechSynthesis.speaking, paused: speechSynthesis.paused });
      
      // Reset to consistent state
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyPlaybackState('stopped');
      
      // Try to clean up any stuck state
      speechSynthesis.cancel();
      
      return false;
    }
    
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
    // Clear any pending timeouts to prevent interference
    if (this.rateChangeTimeout) {
      clearTimeout(this.rateChangeTimeout);
      this.rateChangeTimeout = null;
    }
    
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    
    // Reset rate change flag
    this.isChangingRate = false;
    
    // Track stop time for debouncing
    this.lastStopTime = Date.now();
    
    // Single clean cancel - no delayed cleanup that can interfere with new speech
    speechSynthesis.cancel();
    
    // Reset all state immediately
    this.speechQueue = [];
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.pausePosition = null;
    this.pausedText = null;
    this.currentChunkIndex = 0;
    this.notifyPlaybackState('stopped');
  }

  // Validate that Web Speech API is in a workable state (permissive approach)
  private validateAPIState(): boolean {
    const isSpeaking = speechSynthesis.speaking;
    const isPaused = speechSynthesis.paused;
    const isPending = speechSynthesis.pending;
    
    // Log current state for debugging without failing validation
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[TTS-Debug] API state check:', { isSpeaking, isPaused, isPending });
    }
    
    // Only reject truly problematic states that would block new speech
    // Most API states are workable if we handle them properly
    
    // Accept all these as valid states:
    // - Completely idle: !speaking && !paused && !pending
    // - Currently speaking: speaking && !paused && !pending  
    // - Currently paused: speaking && paused && !pending
    // - Transitional paused: !speaking && paused (common during pause/resume transitions)
    // - Light pending: pending but not stuck (will resolve quickly)
    
    // Only reject if we detect a true stuck state that persists
    // This is very rare and usually indicates a browser bug
    if (isPending && isSpeaking && isPaused) {
      // Triple-state condition is very unusual and potentially problematic
      console.warn('[TTS-Debug] API in unusual triple state - may need reset');
      return false;
    }
    
    // For all other states, proceed with confidence
    // The prepareForSpeech() method will handle any necessary cleanup
    return true;
  }

  // Enhanced force reset with multiple strategies
  private forceReset(): void {
    console.log('[TTS-Debug] Force reset initiated');
    
    // Strategy 1: Standard cancel
    speechSynthesis.cancel();
    
    // Strategy 2: Reset our internal state regardless of API
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.speechQueue = [];
    
    // Strategy 3: Progressive recovery with multiple attempts
    setTimeout(() => {
      if (!this.validateAPIState()) {
        console.log('[TTS-Debug] First reset failed, trying secondary reset');
        speechSynthesis.cancel();
        
        // Strategy 4: Aggressive reset after more time
        setTimeout(() => {
          if (!this.validateAPIState()) {
            console.log('[TTS-Debug] Secondary reset failed, forcing state reconciliation');
            this.reconcileState();
          }
        }, 200);
      }
    }, 100);
  }

  // Reconcile mismatched states between API and internal tracking
  private reconcileState(): void {
    console.log('[TTS-Debug] Reconciling state mismatch');
    console.log('[TTS-Debug] API state:', {
      speaking: speechSynthesis.speaking,
      paused: speechSynthesis.paused,
      pending: speechSynthesis.pending
    });
    console.log('[TTS-Debug] Internal state:', {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      hasUtterance: !!this.currentUtterance
    });
    
    // If API says nothing is happening, align our state
    if (!speechSynthesis.speaking && !speechSynthesis.paused) {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.speechQueue = [];
      console.log('[TTS-Debug] Aligned to idle state');
      return;
    }
    
    // If API is paused, align our pause state
    if (speechSynthesis.speaking && speechSynthesis.paused) {
      this.isPlaying = true;
      this.isPaused = true;
      console.log('[TTS-Debug] Aligned to paused state');
      return;
    }
    
    // If API is speaking, align our playing state
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      this.isPlaying = true;
      this.isPaused = false;
      console.log('[TTS-Debug] Aligned to playing state');
      return;
    }
    
    // For stuck states, force everything to stop
    console.log('[TTS-Debug] Forcing everything to stop due to irreconcilable state');
    speechSynthesis.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.speechQueue = [];
  }

  // Check if enough time has passed since last stop (more flexible)
  private canStart(): boolean {
    const timeSinceStop = Date.now() - this.lastStopTime;
    return timeSinceStop >= this.START_DEBOUNCE_DELAY;
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
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const message = chrome.runtime.sendMessage({
        type: MessageType.TTS_STATE_CHANGED,
        payload: {
          state: state,
          playbackState: this.getPlaybackState(),
          timestamp: Date.now()
        }
      });
      
      // Only call .catch() if sendMessage returns a Promise
      if (message && typeof message.catch === 'function') {
        message.catch(error => {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('Could not notify playback state:', error);
          }
        });
      }
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
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const message = chrome.runtime.sendMessage({
        type: MessageType.TTS_ERROR,
        payload: {
          errorType: errorType,
          error: 'message' in originalError ? originalError.message : originalError.error || 'Unknown error',
          timestamp: Date.now()
        }
      });
      
      // Only call .catch() if sendMessage returns a Promise
      if (message && typeof message.catch === 'function') {
        message.catch(error => {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('Could not notify error:', error);
          }
        });
      }
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

  setVoice(voiceNameOrInfo: string | { name: string }): boolean {
    const voiceName = typeof voiceNameOrInfo === 'string' ? voiceNameOrInfo : voiceNameOrInfo.name;
    const voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      this.settings.voice = voice;
      return true;
    }
    return false;
  }

  getVoice(): SpeechSynthesisVoice | null {
    return this.settings.voice;
  }

  private lastRateChangeTime = 0;
  private readonly RATE_CHANGE_COOLDOWN = 200; // Minimum ms between rate changes

  setRate(rate: number): boolean {
    if (rate >= 0.1 && rate <= 10) {
      this.settings.rate = rate;
      
      // Apply to current speech if playing - brief controlled restart
      if (this.isPlaying && !this.isPaused) {
        const now = Date.now();
        const timeSinceLastChange = now - this.lastRateChangeTime;
        
        if (timeSinceLastChange < this.RATE_CHANGE_COOLDOWN) {
          // Still update the setting but don't restart speech yet
          return true;
        }
        
        this.lastRateChangeTime = now;
        this.applyRateChange(rate);
      }
      
      return true;
    }
    return false;
  }

  private applyRateChange(rate: number): void {
    // Clear any pending timeouts to avoid conflicts with new rate change
    if (this.rateChangeTimeout) {
      clearTimeout(this.rateChangeTimeout);
      this.rateChangeTimeout = null;
    }
    
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    
    if (this.currentUtterance) {
      // Save current state BEFORE cancel changes it
      const wasPlaying = this.isPlaying && !this.isPaused;
      const remainingQueue = [...this.speechQueue]; // Copy remaining items
      const currentText = this.currentUtterance.text; // Save current utterance text
      
      // Mark that we're doing a rate change to handle in onEnd
      this.isChangingRate = true;
      
      // Brief pause for rate change feedback
      speechSynthesis.cancel();
      
      // If we were playing, continue with new rate
      if (wasPlaying) {
        // Use tracked timeout for speech restart
        this.rateChangeTimeout = setTimeout(() => {
          // Clear the timeout reference
          this.rateChangeTimeout = null;
          
          // Reset playing state since cancel() will have cleared it
          this.isPlaying = false;
          this.isPaused = false;
          
          // Reset the flag
          this.isChangingRate = false;
          
          // Create new queue with current text plus remaining
          const allTexts = [currentText, ...remainingQueue.map(item => item.text)];
          
          // Resume playback with new rate
          this.speak(allTexts.join(' '), { rate });
        }, 200); // Slightly longer delay for better stability
      } else {
        // Use tracked timeout for state cleanup to prevent interference
        this.cleanupTimeout = setTimeout(() => {
          this.cleanupTimeout = null;
          this.isChangingRate = false;
          this.isPlaying = false;
          this.isPaused = false;
        }, 100);
      }
    }
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
      
      // Apply to current speech if playing
      if (this.currentUtterance && this.isPlaying) {
        this.applyVolumeToCurrentSpeech(volume);
      }
      
      return true;
    }
    return false;
  }

  private applyVolumeToCurrentSpeech(volume: number): void {
    if (this.currentUtterance) {
      // For Web Speech API, we need to restart the utterance with new volume
      // as there's no way to change volume of an active utterance
      const wasPlaying = this.isPlaying && !this.isPaused;
      
      if (wasPlaying) {
        const currentText = this.currentUtterance.text;
        const remainingQueue = [...this.speechQueue];
        
        // Brief cancel and restart with new volume
        speechSynthesis.cancel();
        
        setTimeout(() => {
          // Reset state
          this.isPlaying = false;
          this.isPaused = false;
          
          // Create new queue with current text plus remaining
          const allTexts = [currentText, ...remainingQueue.map(item => item.text)];
          
          // Resume with new volume
          this.speak(allTexts.join(' '), { volume });
        }, 50);
      }
    }
  }

  getSettings(): SpeechSettings {
    return { ...this.settings };
  }
}

// Ensure proper export for both ES6 and CommonJS
export default SpeechSynthesizer;