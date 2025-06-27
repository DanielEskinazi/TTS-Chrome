# Feature 2.3: Basic Speech Output

**Status: ✅ COMPLETED** | **Completed Date: 2025-06-27** | **Commit: a5e7691** | **Assignee: Claude** | **Git Tag: feature-2.3-completed**

## Feature Overview

Implement the core text-to-speech functionality using the Web Speech API to convert selected text into spoken audio. This feature integrates with the text selection (2.1) and context menu (2.2) to provide the fundamental TTS capability that users expect from the extension.

## Objectives

- Implement robust text-to-speech using Web Speech API
- Provide high-quality speech output with natural-sounding voices
- Handle various text types and content gracefully
- Ensure cross-browser compatibility and fallback mechanisms
- Provide real-time feedback during speech playback
- Support pause, resume, and basic speed control functionality

## Technical Requirements

### Functional Requirements

1. **Speech Synthesis Core**
   - Convert text to speech using Web Speech API
   - Support multiple voices and languages
   - Handle text preprocessing and normalization
   - Manage speech queue and playback state

2. **Voice Management**
   - Detect and list available system voices
   - Select appropriate default voice
   - Handle voice loading and availability
   - Support voice preferences storage

3. **Speech Control**
   - Start speech synthesis from context menu trigger
   - Provide basic playback controls (pause/resume)
   - Handle speech interruption and cleanup
   - Support text chunking for long content

4. **Error Handling**
   - Handle API unavailability gracefully
   - Manage speech synthesis errors
   - Provide user feedback for error states
   - Implement fallback mechanisms

### Non-Functional Requirements

1. **Performance**
   - Minimal delay between trigger and speech start (<500ms)
   - Efficient memory usage during speech playback
   - Smooth speech without stuttering or interruptions

2. **Quality**
   - Natural-sounding speech output
   - Proper handling of punctuation and formatting
   - Appropriate speech rate and pitch

3. **Reliability**
   - Consistent behavior across different text types
   - Graceful handling of API limitations
   - Recovery from speech synthesis errors

## Implementation Steps

### Step 1: Speech Synthesis Core Implementation

```javascript
// speech-synthesizer.js - Core TTS functionality
class SpeechSynthesizer {
  constructor() {
    this.isInitialized = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.speechQueue = [];
    this.availableVoices = [];
    this.defaultVoice = null;
    this.settings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: null
    };
    
    this.init();
  }

  async init() {
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
      console.log('Speech Synthesizer initialized');
      
    } catch (error) {
      console.error('Failed to initialize Speech Synthesizer:', error);
      this.handleInitializationError(error);
    }
  }

  async loadVoices() {
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

  processVoices(voices) {
    this.availableVoices = voices.filter(voice => !voice.localService || voice.localService);
    
    // Select default voice (prefer English, then system default)
    this.defaultVoice = this.selectDefaultVoice(this.availableVoices);
    this.settings.voice = this.defaultVoice;
    
    console.log(`Loaded ${this.availableVoices.length} voices, default: ${this.defaultVoice?.name}`);
  }

  selectDefaultVoice(voices) {
    // Priority order: English native voices, English voices, system default, any voice
    const englishNative = voices.find(v => v.lang.startsWith('en') && v.localService);
    const english = voices.find(v => v.lang.startsWith('en'));
    const systemDefault = voices.find(v => v.default);
    
    return englishNative || english || systemDefault || voices[0] || null;
  }

  setupSpeechEvents() {
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

    this.onError = (event) => {
      console.error('Speech synthesis error:', event);
      this.handleSpeechError(event);
    };

    this.onPause = () => {
      this.isPaused = true;
      this.notifyPlaybackState('paused');
    };

    this.onResume = () => {
      this.isPaused = false;
      this.notifyPlaybackState('resumed');
    };
  }

  async speak(text, options = {}) {
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

  preprocessText(text) {
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

  chunkText(text, maxChunkSize = 200) {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
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

  chunkLongSentence(sentence, maxSize) {
    const words = sentence.split(' ');
    const chunks = [];
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

  async speakChunk(text, options = {}) {
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
      
      utterance.onerror = (event) => {
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

  async speakChunks(chunks, options = {}) {
    this.speechQueue = chunks.map(chunk => ({ text: chunk, options }));
    return this.processQueue();
  }

  async processQueue() {
    if (this.speechQueue.length === 0 || this.isPlaying) {
      return;
    }

    const nextItem = this.speechQueue.shift();
    
    try {
      await this.speakChunk(nextItem.text, nextItem.options);
    } catch (error) {
      console.error('Error processing speech queue:', error);
      this.handleSpeechError(error);
    }
  }

  pause() {
    if (this.isPlaying && !this.isPaused) {
      speechSynthesis.pause();
      return true;
    }
    return false;
  }

  resume() {
    if (this.isPaused) {
      speechSynthesis.resume();
      return true;
    }
    return false;
  }

  stop() {
    speechSynthesis.cancel();
    this.speechQueue = [];
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.notifyPlaybackState('stopped');
  }

  // State management
  getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      hasQueue: this.speechQueue.length > 0,
      currentText: this.currentUtterance?.text || null
    };
  }

  notifyPlaybackState(state) {
    // Send message to background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'TTS_STATE_CHANGED',
        data: {
          state: state,
          playbackState: this.getPlaybackState(),
          timestamp: Date.now()
        }
      }).catch(error => {
        console.log('Could not notify playback state:', error);
      });
    }
  }

  handleSpeechError(error) {
    console.error('Speech synthesis error:', error);
    
    this.stop(); // Clean up state
    
    // Categorize error and provide appropriate feedback
    const errorType = this.categorizeError(error);
    this.notifyError(errorType, error);
  }

  categorizeError(error) {
    const errorMessage = error?.error || error?.message || 'unknown';
    
    if (errorMessage.includes('network')) return 'network';
    if (errorMessage.includes('not-allowed')) return 'permission';
    if (errorMessage.includes('audio-busy')) return 'audio-busy';
    if (errorMessage.includes('audio-hardware')) return 'audio-hardware';
    if (errorMessage.includes('language-not-supported')) return 'language-not-supported';
    if (errorMessage.includes('voice-unavailable')) return 'voice-unavailable';
    
    return 'unknown';
  }

  notifyError(errorType, originalError) {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'TTS_ERROR',
        data: {
          errorType: errorType,
          error: originalError?.message || 'Unknown error',
          timestamp: Date.now()
        }
      }).catch(error => {
        console.log('Could not notify error:', error);
      });
    }
  }

  handleInitializationError(error) {
    console.error('Speech Synthesizer initialization failed:', error);
    this.notifyError('initialization', error);
  }

  // Public API methods
  isReady() {
    return this.isInitialized && this.availableVoices.length > 0;
  }

  getAvailableVoices() {
    return this.availableVoices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default
    }));
  }

  setVoice(voiceName) {
    const voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      this.settings.voice = voice;
      return true;
    }
    return false;
  }

  setRate(rate) {
    if (rate >= 0.1 && rate <= 10) {
      this.settings.rate = rate;
      return true;
    }
    return false;
  }

  setPitch(pitch) {
    if (pitch >= 0 && pitch <= 2) {
      this.settings.pitch = pitch;
      return true;
    }
    return false;
  }

  setVolume(volume) {
    if (volume >= 0 && volume <= 1) {
      this.settings.volume = volume;
      return true;
    }
    return false;
  }
}

// Initialize speech synthesizer
const speechSynthesizer = new SpeechSynthesizer();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpeechSynthesizer;
}
```

### Step 2: Integration with Background Script

```javascript
// background.js - TTS Integration
class TTSManager {
  constructor() {
    this.isActive = false;
    this.currentTabId = null;
    this.speechSynthesizer = null;
    
    this.init();
  }

  init() {
    // Listen for TTS requests
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Initialize speech synthesizer in a content script context
    this.initializeSynthesizer();
  }

  async initializeSynthesizer() {
    // The speech synthesizer needs to run in a content script context
    // We'll send commands to content scripts to manage TTS
    console.log('TTS Manager initialized');
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'START_TTS':
        await this.startTTS(request.data, sender);
        sendResponse({ success: true });
        break;
        
      case 'STOP_TTS':
        await this.stopTTS();
        sendResponse({ success: true });
        break;
        
      case 'PAUSE_TTS':
        await this.pauseTTS();
        sendResponse({ success: true });
        break;
        
      case 'RESUME_TTS':
        await this.resumeTTS();
        sendResponse({ success: true });
        break;
        
      case 'TTS_STATE_CHANGED':
        this.handleStateChange(request.data);
        sendResponse({ success: true });
        break;
        
      case 'TTS_ERROR':
        this.handleTTSError(request.data);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async startTTS(data, sender) {
    try {
      const { text, tabId } = data;
      
      if (!text) {
        throw new Error('No text provided for TTS');
      }

      // Stop any existing TTS
      if (this.isActive) {
        await this.stopTTS();
      }

      // Send TTS command to the appropriate tab
      const targetTabId = tabId || sender.tab?.id;
      
      if (!targetTabId) {
        throw new Error('No tab ID available for TTS');
      }

      // Send speech command to content script
      await chrome.tabs.sendMessage(targetTabId, {
        type: 'START_SPEECH',
        data: { text: text }
      });

      this.isActive = true;
      this.currentTabId = targetTabId;
      
      console.log('TTS started for text:', text.substring(0, 50) + '...');
      
    } catch (error) {
      console.error('Error starting TTS:', error);
      throw error;
    }
  }

  async stopTTS() {
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'STOP_SPEECH'
        });
        
        this.isActive = false;
        this.currentTabId = null;
        
        console.log('TTS stopped');
      } catch (error) {
        console.error('Error stopping TTS:', error);
        // Reset state even if message fails
        this.isActive = false;
        this.currentTabId = null;
      }
    }
  }

  async pauseTTS() {
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'PAUSE_SPEECH'
        });
      } catch (error) {
        console.error('Error pausing TTS:', error);
      }
    }
  }

  async resumeTTS() {
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'RESUME_SPEECH'
        });
      } catch (error) {
        console.error('Error resuming TTS:', error);
      }
    }
  }

  handleStateChange(data) {
    const { state, playbackState } = data;
    
    switch (state) {
      case 'started':
        this.isActive = true;
        break;
        
      case 'ended':
      case 'stopped':
        this.isActive = false;
        this.currentTabId = null;
        break;
        
      case 'paused':
      case 'resumed':
        // State remains active
        break;
    }
    
    // Broadcast state change to interested parties (popup, etc.)
    this.broadcastStateChange(state, playbackState);
  }

  handleTTSError(errorData) {
    console.error('TTS Error:', errorData);
    
    // Reset state on error
    this.isActive = false;
    this.currentTabId = null;
    
    // Show error notification if possible
    this.showErrorNotification(errorData);
  }

  broadcastStateChange(state, playbackState) {
    // Send to popup if open
    chrome.runtime.sendMessage({
      type: 'TTS_PLAYBACK_STATE',
      data: { state, playbackState }
    }).catch(() => {
      // Popup may not be open, ignore error
    });
  }

  showErrorNotification(errorData) {
    // Show browser notification for critical errors
    if (errorData.errorType === 'initialization' || errorData.errorType === 'permission') {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'TTS Error',
        message: 'Text-to-Speech functionality is not available. Please check your browser settings.'
      });
    }
  }

  // Public API methods
  getState() {
    return {
      isActive: this.isActive,
      currentTabId: this.currentTabId
    };
  }
}

// Initialize TTS manager
const ttsManager = new TTSManager();
```

### Step 3: Content Script TTS Integration

```javascript
// content-script.js - Enhanced with TTS functionality
class TextSelectionHandler {
  // ... existing code from features 2.1 and 2.2 ...

  constructor() {
    // ... existing constructor code ...
    
    // Initialize speech synthesizer
    this.initializeSpeechSynthesizer();
  }

  async initializeSpeechSynthesizer() {
    // Load speech synthesizer
    const script = document.createElement('script');
    script.textContent = `
      // Inline the speech synthesizer code here or load it
      ${await this.loadSpeechSynthesizerCode()}
    `;
    document.head.appendChild(script);
    
    // Wait for initialization
    setTimeout(() => {
      if (window.speechSynthesizer) {
        console.log('Speech synthesizer loaded in content script');
      }
    }, 100);
  }

  async loadSpeechSynthesizerCode() {
    // Return the speech synthesizer code as a string
    // In a real implementation, this would be loaded from a separate file
    return `
      // Speech synthesizer code would be embedded here
      // For brevity, just showing the integration pattern
      window.speechSynthesizer = new SpeechSynthesizer();
    `;
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'GET_SELECTION':
        sendResponse({
          text: this.selectionText,
          hasSelection: this.isSelectionActive,
          info: this.selectionInfo
        });
        break;
        
      case 'CLEAR_SELECTION':
        this.clearSelection();
        sendResponse({ success: true });
        break;

      case 'TTS_FEEDBACK':
        this.handleTTSFeedback(request.data);
        sendResponse({ success: true });
        break;
        
      case 'START_SPEECH':
        this.handleStartSpeech(request.data);
        sendResponse({ success: true });
        break;
        
      case 'STOP_SPEECH':
        this.handleStopSpeech();
        sendResponse({ success: true });
        break;
        
      case 'PAUSE_SPEECH':
        this.handlePauseSpeech();
        sendResponse({ success: true });
        break;
        
      case 'RESUME_SPEECH':
        this.handleResumeSpeech();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async handleStartSpeech(data) {
    try {
      const { text } = data;
      
      if (!window.speechSynthesizer) {
        throw new Error('Speech synthesizer not available');
      }

      if (!window.speechSynthesizer.isReady()) {
        throw new Error('Speech synthesizer not ready');
      }

      await window.speechSynthesizer.speak(text);
      
      this.showUserFeedback('Speech started', 'success');
      
    } catch (error) {
      console.error('Error starting speech:', error);
      this.showUserFeedback('Speech error: ' + error.message, 'error');
    }
  }

  handleStopSpeech() {
    try {
      if (window.speechSynthesizer) {
        window.speechSynthesizer.stop();
        this.showUserFeedback('Speech stopped', 'info');
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  handlePauseSpeech() {
    try {
      if (window.speechSynthesizer) {
        if (window.speechSynthesizer.pause()) {
          this.showUserFeedback('Speech paused', 'info');
        }
      }
    } catch (error) {
      console.error('Error pausing speech:', error);
    }
  }

  handleResumeSpeech() {
    try {
      if (window.speechSynthesizer) {
        if (window.speechSynthesizer.resume()) {
          this.showUserFeedback('Speech resumed', 'info');
        }
      }
    } catch (error) {
      console.error('Error resuming speech:', error);
    }
  }

  // ... rest of existing methods ...
}
```

### Step 4: Error Handling and Fallbacks

```javascript
// Enhanced error handling for speech synthesis
class SpeechSynthesizer {
  // ... existing code ...

  async speak(text, options = {}) {
    try {
      // Check availability before speaking
      if (!this.checkAvailability()) {
        throw new Error('Speech synthesis not available');
      }

      // Validate text
      if (!this.validateText(text)) {
        throw new Error('Invalid text for speech synthesis');
      }

      // Apply retry logic for common failures
      return await this.speakWithRetry(text, options);
      
    } catch (error) {
      this.handleSpeechError(error);
      throw error;
    }
  }

  checkAvailability() {
    // Check if API is available
    if (!('speechSynthesis' in window)) {
      return false;
    }

    // Check if voices are loaded
    if (this.availableVoices.length === 0) {
      return false;
    }

    // Check if audio context is available (for some browsers)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.close();
      return true;
    } catch (error) {
      console.warn('Audio context not available:', error);
      return true; // Don't fail completely
    }
  }

  validateText(text) {
    if (!text || typeof text !== 'string') return false;
    if (text.trim().length === 0) return false;
    if (text.length > 32000) return false; // Chrome limit
    
    return true;
  }

  async speakWithRetry(text, options = {}, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.speakChunk(text, options);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        
        // Try to recover from certain errors
        if (error.message.includes('audio-busy')) {
          this.stop(); // Clear any stuck audio
        }
      }
    }
  }

  handleSpeechError(error) {
    console.error('Speech synthesis error:', error);
    
    const errorType = this.categorizeError(error);
    const userMessage = this.getErrorMessage(errorType);
    
    // Notify user
    this.notifyError(errorType, error);
    
    // Clean up state
    this.stop();
    
    // Attempt recovery for certain errors
    this.attemptRecovery(errorType);
  }

  getErrorMessage(errorType) {
    const messages = {
      'network': 'Network error during speech synthesis',
      'permission': 'Permission denied for audio playback',
      'audio-busy': 'Audio system is busy, please try again',
      'audio-hardware': 'Audio hardware error',
      'language-not-supported': 'Selected language not supported',
      'voice-unavailable': 'Selected voice is not available',
      'initialization': 'Speech synthesis could not be initialized',
      'unknown': 'An unknown error occurred during speech synthesis'
    };
    
    return messages[errorType] || messages['unknown'];
  }

  attemptRecovery(errorType) {
    switch (errorType) {
      case 'audio-busy':
        // Try to clear the speech queue
        setTimeout(() => {
          speechSynthesis.cancel();
        }, 1000);
        break;
        
      case 'voice-unavailable':
        // Try to reload voices
        this.loadVoices().then(() => {
          console.log('Voices reloaded after error');
        });
        break;
        
      case 'initialization':
        // Try to reinitialize
        setTimeout(() => {
          this.init();
        }, 2000);
        break;
    }
  }
}
```

## Testing Criteria

### Unit Tests

1. **Speech Synthesis Tests**
   ```javascript
   describe('Speech Synthesis', () => {
     test('should initialize with available voices', async () => {
       const synthesizer = new SpeechSynthesizer();
       await synthesizer.init();
       
       expect(synthesizer.isReady()).toBe(true);
       expect(synthesizer.getAvailableVoices().length).toBeGreaterThan(0);
     });

     test('should speak text successfully', async () => {
       const synthesizer = new SpeechSynthesizer();
       await synthesizer.init();
       
       const mockUtterance = jest.fn();
       global.SpeechSynthesisUtterance = jest.fn(() => mockUtterance);
       global.speechSynthesis = { speak: jest.fn() };
       
       await synthesizer.speak('Hello world');
       
       expect(global.speechSynthesis.speak).toHaveBeenCalledWith(mockUtterance);
     });

     test('should handle text preprocessing', () => {
       const synthesizer = new SpeechSynthesizer();
       const processed = synthesizer.preprocessText('Dr. Smith visited  the   website.');
       
       expect(processed).toBe('Doctor Smith visited the website.');
     });
   });
   ```

2. **Text Chunking Tests**
   ```javascript
   test('should chunk long text appropriately', () => {
     const synthesizer = new SpeechSynthesizer();
     const longText = 'This is a very long sentence. '.repeat(20);
     const chunks = synthesizer.chunkText(longText, 100);
     
     expect(chunks.length).toBeGreaterThan(1);
     expect(chunks.every(chunk => chunk.length <= 100)).toBe(true);
   });
   ```

### Integration Tests

1. **End-to-End TTS Flow**
   ```javascript
   test('should complete full TTS flow from selection to speech', async () => {
     // Simulate text selection
     await simulateTextSelection('Hello world');
     
     // Trigger context menu
     await simulateContextMenuClick();
     
     // Verify speech synthesis was called
     expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
   });
   ```

2. **Error Handling Integration**
   ```javascript
   test('should handle speech synthesis errors gracefully', async () => {
     mockSpeechSynthesis.speak.mockImplementation(() => {
       throw new Error('Audio busy');
     });
     
     await expect(synthesizer.speak('test')).rejects.toThrow();
     expect(synthesizer.getPlaybackState().isPlaying).toBe(false);
   });
   ```

### Manual Testing Scenarios

1. **Basic Speech Tests**
   - Select and speak short text (single sentence)
   - Select and speak long text (multiple paragraphs)
   - Test with different text types (articles, lists, headings)
   - Test with special characters and numbers

2. **Voice and Quality Tests**
   - Test with different available voices
   - Verify speech rate and pitch settings
   - Test volume control
   - Verify natural pronunciation of common words

3. **Error Scenario Tests**
   - Test with audio system busy
   - Test with no audio hardware
   - Test with network-dependent voices
   - Test with extremely long text

4. **Performance Tests**
   - Test speech startup time (<500ms)
   - Test memory usage during long speech
   - Test system resource usage
   - Test concurrent speech requests

## Success Metrics

### Technical Metrics

1. **Reliability**: 95%+ success rate in speech synthesis
2. **Performance**: <500ms delay from trigger to speech start
3. **Quality**: Natural-sounding speech with proper pronunciation
4. **Compatibility**: Works with 90%+ of available system voices

### User Experience Metrics

1. **Responsiveness**: Immediate feedback on speech start/stop
2. **Quality**: Clear, understandable speech output
3. **Reliability**: Consistent behavior across different content types

## Dependencies

### Internal Dependencies
- Feature 2.1 (Simple Text Selection) - Source of text content
- Feature 2.2 (Minimal Context Menu) - Trigger mechanism
- Chrome tabs and runtime APIs

### External Dependencies
- Web Speech API (speechSynthesis)
- System text-to-speech voices
- Audio hardware and drivers

## Risks and Mitigation

### Technical Risks

1. **Browser Compatibility**
   - Risk: Web Speech API may not be available in all browsers
   - Mitigation: Graceful degradation and clear error messages

2. **Voice Availability**
   - Risk: System may not have suitable voices installed
   - Mitigation: Fallback to any available voice, user guidance

3. **Audio Hardware Issues**
   - Risk: Audio system may be busy or unavailable
   - Mitigation: Retry mechanisms and clear error feedback

4. **Performance Impact**
   - Risk: Speech synthesis may use significant system resources
   - Mitigation: Efficient text chunking and resource monitoring

### User Experience Risks

1. **Poor Speech Quality**
   - Risk: Computer voices may sound robotic or unclear
   - Mitigation: Voice selection options, rate/pitch adjustment

2. **Unexpected Behavior**
   - Risk: Speech may start/stop at unexpected times
   - Mitigation: Clear feedback and easy stop functionality

## Future Enhancements

1. **Advanced Voice Controls**
   - Speed and pitch adjustment UI
   - Voice selection preferences
   - Language detection and voice matching

2. **Speech Queue Management**
   - Queue multiple text selections
   - Smart paragraph/sentence breaking
   - Reading progress indicators

3. **Enhanced Preprocessing**
   - Better handling of technical text
   - Pronunciation customization
   - Skip non-readable content (navigation, ads)

## Acceptance Criteria

- [ ] Text is converted to speech using Web Speech API
- [ ] Speech quality is natural and understandable
- [ ] Long text is properly chunked for smooth playback
- [ ] Error handling prevents crashes and provides user feedback
- [ ] Performance impact is acceptable (<500ms start time)
- [ ] Speech can be stopped cleanly without audio artifacts
- [ ] Integration with context menu works seamlessly
- [ ] Cross-browser compatibility is maintained
- [ ] Memory usage remains within reasonable limits