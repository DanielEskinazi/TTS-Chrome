# Feature 2.6: Basic Voice Selection

**Status: 🚧 IN PLANNING** | **Estimated Effort: 4-5 hours** | **Priority: High**

## Feature Overview

Implement basic voice selection functionality that allows users to choose from available system voices for TTS playback. This feature provides essential customization by letting users select their preferred voice from a list of available options, with the ability to quickly switch between voices via context menu and popup interface.

## Objectives

- Enumerate and display all available system voices
- Allow users to select their preferred voice
- Provide quick voice switching via context menu submenu
- Remember user's voice preference
- Filter voices by language for better usability
- Provide voice preview functionality
- Handle voice availability gracefully

## Technical Requirements

### Functional Requirements

1. **Voice Enumeration**
   - Detect all available system voices on startup
   - Categorize voices by language and locale
   - Identify voice characteristics (local/remote, gender if available)
   - Handle dynamic voice loading

2. **Voice Selection Interface**
   - Context menu submenu with top 3 voices
   - Popup dropdown with all available voices
   - Settings page with full voice management
   - Voice preview/test functionality

3. **Voice Persistence**
   - Save selected voice preference
   - Restore voice on extension restart
   - Handle unavailable saved voice gracefully
   - Per-language default voices

4. **Quick Voice Switching**
   - Context menu "Read with..." submenu
   - Keyboard shortcuts for favorite voices
   - Recent voices list
   - Smart voice suggestions

### Non-Functional Requirements

1. **Performance**
   - Voice list loads quickly (< 500ms)
   - Voice switching is immediate
   - No delay in TTS start with custom voice

2. **Usability**
   - Intuitive voice naming and grouping
   - Clear language indicators
   - Easy voice preview mechanism
   - Sensible defaults

## Implementation Steps

### Step 1: Enhanced Voice Manager

```javascript
// voice-manager.js - Comprehensive voice management
class VoiceManager {
  constructor() {
    this.availableVoices = [];
    this.voicesByLanguage = new Map();
    this.selectedVoice = null;
    this.favoriteVoices = [];
    this.recentVoices = [];
    this.defaultVoices = new Map(); // Per-language defaults
    
    this.init();
  }

  async init() {
    try {
      // Load saved preferences
      await this.loadPreferences();
      
      // Load available voices
      await this.loadVoices();
      
      // Set up voice change listener
      if ('speechSynthesis' in window) {
        speechSynthesis.addEventListener('voiceschanged', () => {
          this.loadVoices();
        });
      }
      
      console.log('Voice Manager initialized with', this.availableVoices.length, 'voices');
    } catch (error) {
      console.error('Failed to initialize Voice Manager:', error);
    }
  }

  async loadVoices() {
    return new Promise((resolve) => {
      const loadVoiceList = () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          this.processVoices(voices);
          resolve(this.availableVoices);
        } else {
          // Retry after a short delay
          setTimeout(loadVoiceList, 100);
        }
      };
      
      loadVoiceList();
    });
  }

  processVoices(voices) {
    // Clear existing data
    this.availableVoices = [];
    this.voicesByLanguage.clear();
    
    // Process each voice
    voices.forEach(voice => {
      const voiceInfo = {
        name: voice.name,
        lang: voice.lang,
        voiceURI: voice.voiceURI,
        localService: voice.localService,
        default: voice.default,
        // Enhanced properties
        displayName: this.formatVoiceName(voice),
        languageDisplay: this.formatLanguage(voice.lang),
        quality: this.determineVoiceQuality(voice),
        gender: this.guessGender(voice.name),
        engine: this.determineEngine(voice)
      };
      
      this.availableVoices.push(voiceInfo);
      
      // Group by language
      if (!this.voicesByLanguage.has(voice.lang)) {
        this.voicesByLanguage.set(voice.lang, []);
      }
      this.voicesByLanguage.get(voice.lang).push(voiceInfo);
    });
    
    // Sort voices for better presentation
    this.sortVoices();
    
    // Select initial voice if needed
    if (!this.selectedVoice || !this.isVoiceAvailable(this.selectedVoice)) {
      this.selectDefaultVoice();
    }
  }

  formatVoiceName(voice) {
    // Clean up voice names for better display
    let name = voice.name;
    
    // Remove common prefixes
    name = name.replace(/^Microsoft\s+/i, '');
    name = name.replace(/^Google\s+/i, '');
    name = name.replace(/^Apple\s+/i, '');
    
    // Add quality indicators
    if (!voice.localService) {
      name += ' (Online)';
    }
    
    return name;
  }

  formatLanguage(langCode) {
    // Convert language codes to readable names
    const languageNames = {
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

  determineVoiceQuality(voice) {
    // Assess voice quality based on various factors
    if (!voice.localService) return 'premium';
    if (voice.name.toLowerCase().includes('enhanced')) return 'enhanced';
    if (voice.name.toLowerCase().includes('compact')) return 'compact';
    return 'standard';
  }

  guessGender(voiceName) {
    // Attempt to determine gender from voice name
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

  determineEngine(voice) {
    // Identify TTS engine
    const name = voice.name.toLowerCase();
    if (name.includes('microsoft')) return 'Microsoft';
    if (name.includes('google')) return 'Google';
    if (name.includes('apple')) return 'Apple';
    if (name.includes('amazon')) return 'Amazon';
    return 'System';
  }

  sortVoices() {
    // Sort voices for optimal presentation
    this.availableVoices.sort((a, b) => {
      // First by language (user's language first)
      const userLang = navigator.language;
      if (a.lang.startsWith(userLang) && !b.lang.startsWith(userLang)) return -1;
      if (!a.lang.startsWith(userLang) && b.lang.startsWith(userLang)) return 1;
      
      // Then by quality
      const qualityOrder = { premium: 0, enhanced: 1, standard: 2, compact: 3 };
      const qualityDiff = qualityOrder[a.quality] - qualityOrder[b.quality];
      if (qualityDiff !== 0) return qualityDiff;
      
      // Finally by name
      return a.displayName.localeCompare(b.displayName);
    });
  }

  selectDefaultVoice() {
    // Select the best available voice
    const userLang = navigator.language;
    
    // Try to find a voice matching user's language
    let voice = this.availableVoices.find(v => 
      v.lang === userLang && v.quality !== 'compact'
    );
    
    // Fallback to any voice in user's language
    if (!voice) {
      voice = this.availableVoices.find(v => 
        v.lang.startsWith(userLang.split('-')[0])
      );
    }
    
    // Fallback to any English voice
    if (!voice) {
      voice = this.availableVoices.find(v => v.lang.startsWith('en'));
    }
    
    // Fallback to first available voice
    if (!voice) {
      voice = this.availableVoices[0];
    }
    
    this.selectedVoice = voice;
    return voice;
  }

  async loadPreferences() {
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

  async savePreferences() {
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

  // Public API methods
  getAvailableVoices() {
    return this.availableVoices;
  }

  getVoicesByLanguage(langCode) {
    if (langCode) {
      return this.voicesByLanguage.get(langCode) || [];
    }
    return this.voicesByLanguage;
  }

  getSelectedVoice() {
    return this.selectedVoice;
  }

  async selectVoice(voiceNameOrInfo) {
    let voice;
    
    if (typeof voiceNameOrInfo === 'string') {
      voice = this.availableVoices.find(v => v.name === voiceNameOrInfo);
    } else {
      voice = voiceNameOrInfo;
    }
    
    if (voice && this.isVoiceAvailable(voice)) {
      this.selectedVoice = voice;
      
      // Update recent voices
      this.updateRecentVoices(voice);
      
      // Save preferences
      await this.savePreferences();
      
      // Notify listeners
      this.notifyVoiceChange(voice);
      
      return true;
    }
    
    return false;
  }

  updateRecentVoices(voice) {
    // Remove if already in list
    this.recentVoices = this.recentVoices.filter(v => v.name !== voice.name);
    
    // Add to beginning
    this.recentVoices.unshift(voice);
    
    // Keep only last 5
    this.recentVoices = this.recentVoices.slice(0, 5);
  }

  isVoiceAvailable(voice) {
    return this.availableVoices.some(v => v.name === voice.name);
  }

  getFavoriteVoices() {
    return this.favoriteVoices.filter(v => this.isVoiceAvailable(v));
  }

  async setFavoriteVoices(voices) {
    // Limit to 3 favorites
    this.favoriteVoices = voices.slice(0, 3);
    await this.savePreferences();
  }

  getRecentVoices() {
    return this.recentVoices.filter(v => this.isVoiceAvailable(v));
  }

  getSuggestedVoices() {
    // Return smart suggestions based on usage
    const suggestions = [];
    
    // Add selected voice
    if (this.selectedVoice) {
      suggestions.push(this.selectedVoice);
    }
    
    // Add favorites
    suggestions.push(...this.getFavoriteVoices());
    
    // Add recent voices
    suggestions.push(...this.getRecentVoices());
    
    // Remove duplicates and limit to 5
    const unique = Array.from(new Map(
      suggestions.map(v => [v.name, v])
    ).values());
    
    return unique.slice(0, 5);
  }

  notifyVoiceChange(voice) {
    // Send message to other components
    chrome.runtime.sendMessage({
      type: 'VOICE_CHANGED',
      data: { voice: voice }
    }).catch(() => {
      // Ignore if no listeners
    });
  }

  // Voice preview functionality
  async previewVoice(voice, text = null) {
    const previewText = text || this.getPreviewText(voice.lang);
    
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(previewText);
      
      // Find the actual voice object
      const systemVoice = speechSynthesis.getVoices().find(v => v.name === voice.name);
      if (systemVoice) {
        utterance.voice = systemVoice;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      
      // Stop any ongoing speech
      speechSynthesis.cancel();
      
      // Speak preview
      speechSynthesis.speak(utterance);
    });
  }

  getPreviewText(lang) {
    // Language-specific preview texts
    const previewTexts = {
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
}

// Initialize voice manager
const voiceManager = new VoiceManager();
```

### Step 2: Enhanced Context Menu with Voice Submenu

```javascript
// background.js - Context menu with voice selection
class ContextMenuManager {
  constructor(selectionManager, ttsManager, voiceManager) {
    // ... existing properties ...
    this.voiceManager = voiceManager;
    this.voiceSubmenus = [];
  }

  createMenus() {
    // ... existing menus ...
    
    // Create "Read with..." parent menu
    chrome.contextMenus.create({
      id: 'tts-read-with',
      title: 'Read with...',
      contexts: ['selection'],
      enabled: false,
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
    
    // Create voice submenus
    this.createVoiceSubmenus();
  }

  createVoiceSubmenus() {
    // Clear existing voice submenus
    this.voiceSubmenus.forEach(id => {
      chrome.contextMenus.remove(id, () => {
        if (chrome.runtime.lastError) {
          console.log('Error removing voice submenu:', chrome.runtime.lastError);
        }
      });
    });
    this.voiceSubmenus = [];
    
    // Get suggested voices
    const suggestedVoices = this.voiceManager.getSuggestedVoices();
    const selectedVoice = this.voiceManager.getSelectedVoice();
    
    // Create submenu for each suggested voice
    suggestedVoices.slice(0, 3).forEach((voice, index) => {
      const menuId = `tts-voice-${index}`;
      const isSelected = selectedVoice && voice.name === selectedVoice.name;
      const title = `${isSelected ? '✓ ' : ''}${voice.displayName}`;
      
      chrome.contextMenus.create({
        id: menuId,
        parentId: 'tts-read-with',
        title: title,
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      }, () => {
        if (!chrome.runtime.lastError) {
          this.voiceSubmenus.push(menuId);
        }
      });
    });
    
    // Add separator
    chrome.contextMenus.create({
      id: 'tts-voice-separator',
      parentId: 'tts-read-with',
      type: 'separator',
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
    
    // Add "More voices..." option
    chrome.contextMenus.create({
      id: 'tts-more-voices',
      parentId: 'tts-read-with',
      title: 'More voices...',
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
  }

  async handleMenuClick(info, tab) {
    try {
      // Handle voice selection submenus
      if (info.menuItemId.startsWith('tts-voice-')) {
        const voiceIndex = parseInt(info.menuItemId.split('-')[2]);
        await this.handleVoiceSelection(voiceIndex, info, tab);
        return;
      }
      
      if (info.menuItemId === 'tts-more-voices') {
        // Open popup or options page
        chrome.runtime.openOptionsPage();
        return;
      }
      
      // ... existing menu handlers ...
    } catch (error) {
      console.error('Error handling menu click:', error);
      this.showErrorFeedback(tab, error);
    }
  }

  async handleVoiceSelection(voiceIndex, info, tab) {
    const suggestedVoices = this.voiceManager.getSuggestedVoices();
    const selectedVoice = suggestedVoices[voiceIndex];
    
    if (selectedVoice) {
      // Select the voice
      await this.voiceManager.selectVoice(selectedVoice);
      
      // Update submenus to reflect new selection
      this.createVoiceSubmenus();
      
      // Start TTS with the selected voice
      await this.triggerTTS(info, tab, selectedVoice);
    }
  }

  async triggerTTS(info, tab, voice = null) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SELECTION'
      });

      if (response && response.hasSelection) {
        const textToSpeak = response.text || info.selectionText;
        
        // Start TTS with optional voice override
        await this.ttsManager.startTTS({
          text: textToSpeak,
          tabId: tab.id,
          voice: voice || this.voiceManager.getSelectedVoice()
        });
        
      } else {
        throw new Error('No text selected for TTS');
      }
    } catch (error) {
      console.error('Error triggering TTS:', error);
      throw error;
    }
  }

  updateMenuState(hasSelection) {
    if (!this.isMenuCreated) return;

    const isPlaying = this.ttsManager.getState().isActive;

    // Update main speak menu
    chrome.contextMenus.update(this.speakMenuId, {
      enabled: hasSelection && !isPlaying
    });
    
    // Update "Read with..." menu
    chrome.contextMenus.update('tts-read-with', {
      enabled: hasSelection && !isPlaying
    });

    // ... existing updates ...
  }
}
```

### Step 3: Popup UI with Voice Selection

```html
<!-- popup.html - Enhanced with voice selection -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div class="popup-container">
        <div id="status" class="status stopped">
            TTS is not active
        </div>
        
        <div class="voice-selection">
            <label for="voiceSelect">Voice:</label>
            <div class="voice-controls">
                <select id="voiceSelect" class="voice-dropdown">
                    <option value="">Loading voices...</option>
                </select>
                <button id="previewBtn" class="preview-btn" title="Preview voice">
                    🔊
                </button>
            </div>
        </div>
        
        <div class="controls">
            <button id="playPauseBtn" class="play-btn" disabled>
                ▶️ Play
            </button>
            <button id="stopBtn" class="stop-btn" disabled>
                ⏹️ Stop
            </button>
        </div>
        
        <div class="quick-voices">
            <label>Quick select:</label>
            <div id="quickVoiceButtons" class="quick-voice-buttons">
                <!-- Dynamically populated -->
            </div>
        </div>
        
        <div class="footer">
            <button id="settingsBtn" class="settings-btn">
                ⚙️ Settings
            </button>
        </div>
    </div>
    
    <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js - Voice selection functionality
class TTSPopup {
  constructor() {
    // ... existing properties ...
    this.voiceManager = null;
    this.isPreviewPlaying = false;
  }

  async init() {
    // Get DOM elements
    this.voiceSelect = document.getElementById('voiceSelect');
    this.previewBtn = document.getElementById('previewBtn');
    this.quickVoiceButtons = document.getElementById('quickVoiceButtons');
    this.settingsBtn = document.getElementById('settingsBtn');
    // ... existing elements ...
    
    // Initialize voice manager
    await this.initializeVoiceManager();
    
    // Set up event listeners
    this.voiceSelect.addEventListener('change', this.handleVoiceChange.bind(this));
    this.previewBtn.addEventListener('click', this.handlePreviewVoice.bind(this));
    this.settingsBtn.addEventListener('click', this.openSettings.bind(this));
    // ... existing listeners ...
    
    // Load initial state
    this.updateState();
  }

  async initializeVoiceManager() {
    // Get voice data from background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_VOICE_DATA'
    });
    
    if (response && response.voices) {
      this.populateVoiceDropdown(response.voices, response.selectedVoice);
      this.createQuickVoiceButtons(response.suggestedVoices);
    }
  }

  populateVoiceDropdown(voices, selectedVoice) {
    // Clear existing options
    this.voiceSelect.innerHTML = '';
    
    // Group voices by language
    const voicesByLang = new Map();
    voices.forEach(voice => {
      if (!voicesByLang.has(voice.languageDisplay)) {
        voicesByLang.set(voice.languageDisplay, []);
      }
      voicesByLang.get(voice.languageDisplay).push(voice);
    });
    
    // Create optgroups for each language
    voicesByLang.forEach((voices, language) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = language;
      
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = voice.displayName;
        
        if (selectedVoice && voice.name === selectedVoice.name) {
          option.selected = true;
        }
        
        // Add quality indicator
        if (voice.quality === 'premium') {
          option.textContent += ' ⭐';
        }
        
        optgroup.appendChild(option);
      });
      
      this.voiceSelect.appendChild(optgroup);
    });
  }

  createQuickVoiceButtons(suggestedVoices) {
    // Clear existing buttons
    this.quickVoiceButtons.innerHTML = '';
    
    // Create button for each suggested voice
    suggestedVoices.slice(0, 3).forEach((voice, index) => {
      const button = document.createElement('button');
      button.className = 'quick-voice-btn';
      button.textContent = voice.displayName.split(' ')[0]; // First word only
      button.title = voice.displayName;
      button.dataset.voiceName = voice.name;
      
      // Keyboard shortcut hint
      if (index < 3) {
        button.textContent += ` (${index + 1})`;
      }
      
      button.addEventListener('click', () => this.selectQuickVoice(voice));
      
      this.quickVoiceButtons.appendChild(button);
    });
  }

  async handleVoiceChange(event) {
    const voiceName = event.target.value;
    
    if (voiceName) {
      try {
        // Update voice selection
        await chrome.runtime.sendMessage({
          type: 'SELECT_VOICE',
          data: { voiceName: voiceName }
        });
        
        // Update quick voice buttons
        await this.initializeVoiceManager();
        
        this.showTemporaryMessage('Voice updated');
      } catch (error) {
        console.error('Error selecting voice:', error);
        this.showError('Failed to select voice');
      }
    }
  }

  async handlePreviewVoice() {
    if (this.isPreviewPlaying) {
      // Stop preview
      speechSynthesis.cancel();
      this.isPreviewPlaying = false;
      this.previewBtn.textContent = '🔊';
      return;
    }
    
    const voiceName = this.voiceSelect.value;
    if (!voiceName) return;
    
    try {
      this.isPreviewPlaying = true;
      this.previewBtn.textContent = '⏹️';
      this.previewBtn.disabled = true;
      
      // Request preview from background
      await chrome.runtime.sendMessage({
        type: 'PREVIEW_VOICE',
        data: { voiceName: voiceName }
      });
      
      // Reset button after preview
      setTimeout(() => {
        this.isPreviewPlaying = false;
        this.previewBtn.textContent = '🔊';
        this.previewBtn.disabled = false;
      }, 3000); // Assume preview is ~3 seconds
      
    } catch (error) {
      console.error('Error previewing voice:', error);
      this.isPreviewPlaying = false;
      this.previewBtn.textContent = '🔊';
      this.previewBtn.disabled = false;
    }
  }

  async selectQuickVoice(voice) {
    try {
      // Update voice selection
      await chrome.runtime.sendMessage({
        type: 'SELECT_VOICE',
        data: { voiceName: voice.name }
      });
      
      // Update dropdown
      this.voiceSelect.value = voice.name;
      
      // Update quick buttons
      await this.initializeVoiceManager();
      
      this.showTemporaryMessage(`Selected ${voice.displayName}`);
    } catch (error) {
      console.error('Error selecting quick voice:', error);
    }
  }

  showTemporaryMessage(message) {
    const originalText = this.statusElement.textContent;
    const originalClass = this.statusElement.className;
    
    this.statusElement.textContent = message;
    this.statusElement.className = 'status info';
    
    setTimeout(() => {
      this.statusElement.textContent = originalText;
      this.statusElement.className = originalClass;
    }, 2000);
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }
}
```

### Step 4: Integration with Speech Synthesizer

```javascript
// speech-synthesizer.js - Enhanced with voice selection
class SpeechSynthesizer {
  // ... existing code ...
  
  setVoice(voiceInfo) {
    if (voiceInfo) {
      // Find the actual voice object
      const systemVoice = speechSynthesis.getVoices().find(
        v => v.name === voiceInfo.name
      );
      
      if (systemVoice) {
        this.settings.voice = systemVoice;
        return true;
      }
    }
    return false;
  }
  
  async speakChunk(text, options = {}) {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply voice selection
      if (options.voice) {
        const systemVoice = speechSynthesis.getVoices().find(
          v => v.name === options.voice.name
        );
        if (systemVoice) {
          utterance.voice = systemVoice;
        }
      } else if (this.settings.voice) {
        utterance.voice = this.settings.voice;
      }
      
      // Apply other settings
      utterance.rate = options.rate || this.settings.rate;
      utterance.pitch = options.pitch || this.settings.pitch;
      utterance.volume = options.volume || this.settings.volume;
      
      // ... rest of existing speakChunk implementation ...
    });
  }
}
```

### Step 5: Background Script Integration

```javascript
// background.js - Voice management integration
class TTSManager {
  constructor(voiceManager) {
    // ... existing properties ...
    this.voiceManager = voiceManager;
  }
  
  async handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      // ... existing cases ...
      
      case 'GET_VOICE_DATA':
        sendResponse({
          voices: this.voiceManager.getAvailableVoices(),
          selectedVoice: this.voiceManager.getSelectedVoice(),
          suggestedVoices: this.voiceManager.getSuggestedVoices()
        });
        break;
        
      case 'SELECT_VOICE':
        const selected = await this.voiceManager.selectVoice(request.data.voiceName);
        sendResponse({ success: selected });
        break;
        
      case 'PREVIEW_VOICE':
        await this.previewVoice(request.data.voiceName);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }
  
  async startTTS(data, sender) {
    try {
      // ... existing validation ...
      
      // Include voice in TTS command
      const voice = data.voice || this.voiceManager.getSelectedVoice();
      
      await chrome.tabs.sendMessage(targetTabId, {
        type: 'START_SPEECH',
        data: { 
          text: text,
          voice: voice
        }
      });
      
      // ... rest of existing implementation ...
    } catch (error) {
      console.error('Error starting TTS:', error);
      throw error;
    }
  }
  
  async previewVoice(voiceName) {
    const voices = this.voiceManager.getAvailableVoices();
    const voice = voices.find(v => v.name === voiceName);
    
    if (voice) {
      // Send preview command to active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (activeTab) {
        await chrome.tabs.sendMessage(activeTab.id, {
          type: 'PREVIEW_VOICE',
          data: { voice: voice }
        });
      }
    }
  }
}
```

## Testing Criteria

### Unit Tests

1. **Voice Enumeration Tests**
   ```javascript
   describe('Voice Manager', () => {
     test('should load available voices', async () => {
       const voiceManager = new VoiceManager();
       await voiceManager.init();
       
       expect(voiceManager.getAvailableVoices().length).toBeGreaterThan(0);
       expect(voiceManager.getSelectedVoice()).toBeDefined();
     });

     test('should categorize voices by language', () => {
       const mockVoices = [
         { name: 'Voice1', lang: 'en-US' },
         { name: 'Voice2', lang: 'en-GB' },
         { name: 'Voice3', lang: 'es-ES' }
       ];
       
       voiceManager.processVoices(mockVoices);
       const voicesByLang = voiceManager.getVoicesByLanguage();
       
       expect(voicesByLang.get('en-US')).toHaveLength(1);
       expect(voicesByLang.get('es-ES')).toHaveLength(1);
     });
   });
   ```

2. **Voice Selection Tests**
   ```javascript
   test('should select and persist voice preference', async () => {
     const voice = voiceManager.getAvailableVoices()[0];
     await voiceManager.selectVoice(voice);
     
     expect(voiceManager.getSelectedVoice()).toBe(voice);
     expect(chrome.storage.sync.set).toHaveBeenCalledWith(
       expect.objectContaining({ selectedVoice: voice })
     );
   });
   ```

### Integration Tests

1. **Voice Selection Flow**
   ```javascript
   test('should apply selected voice to TTS', async () => {
     // Select a voice
     await voiceManager.selectVoice('TestVoice');
     
     // Start TTS
     await ttsManager.startTTS({ text: 'Test' });
     
     // Verify voice was applied
     expect(speechSynthesisUtterance.voice.name).toBe('TestVoice');
   });
   ```

### Manual Testing Scenarios

1. **Voice Selection Tests**
   - Open popup, verify all voices are listed
   - Select different voices and verify they persist
   - Test voice preview functionality
   - Test quick voice buttons

2. **Context Menu Tests**
   - Right-click with text selected
   - Verify "Read with..." submenu appears
   - Test reading with different voices
   - Verify selected voice has checkmark

3. **Edge Cases**
   - Test with no voices available
   - Test with voice that becomes unavailable
   - Test language filtering
   - Test voice quality indicators

## Success Metrics

### Technical Metrics

1. **Performance**: Voice list loads in < 500ms
2. **Accuracy**: Selected voice always used for TTS
3. **Persistence**: Voice preferences saved and restored
4. **Compatibility**: Works with all system voices

### User Experience Metrics

1. **Discoverability**: Easy to find and change voices
2. **Preview Quality**: Clear voice preview functionality  
3. **Quick Access**: Fast switching between favorite voices

## Dependencies

### Internal Dependencies
- Feature 2.3 (Basic Speech Output) - Core TTS functionality
- Chrome storage API for preferences
- Chrome contextMenus API for submenu

### External Dependencies
- Web Speech API getVoices()
- System TTS voices availability

## Risks and Mitigation

### Technical Risks

1. **Voice Loading Delays**
   - Risk: Voices may not be immediately available
   - Mitigation: Retry mechanism and loading states

2. **Voice Compatibility**
   - Risk: Selected voice may not work with all text
   - Mitigation: Fallback to default voice

3. **Storage Limits**
   - Risk: Chrome sync storage has size limits
   - Mitigation: Store only essential voice data

## Acceptance Criteria

- [ ] All system voices are detected and displayed
- [ ] Voices are organized by language in dropdown
- [ ] Voice selection persists across sessions
- [ ] Context menu shows "Read with..." submenu
- [ ] Quick voice buttons provide fast switching
- [ ] Voice preview works for all voices
- [ ] Selected voice is used for all TTS
- [ ] Fallback to default voice if selected unavailable
- [ ] Voice quality indicators are shown
- [ ] Recent and favorite voices are tracked