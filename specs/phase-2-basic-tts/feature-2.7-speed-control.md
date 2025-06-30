# Feature 2.7: Speed Control

**Status: 🚧 IN PLANNING** | **Estimated Effort: 3-4 hours** | **Priority: Medium**

## Feature Overview

Implement speech rate control functionality that allows users to adjust the TTS playback speed from 0.5x to 3.0x. This feature provides essential customization for different reading preferences and content types, enabling users to slow down for complex content or speed up for familiar material.

## Objectives

- Provide intuitive speed control interface in popup
- Allow real-time speed adjustment during playback
- Remember user's speed preference
- Provide keyboard shortcuts for quick speed changes
- Show current speed clearly in UI
- Support smooth speed transitions

## Technical Requirements

### Functional Requirements

1. **Speed Range and Controls**
   - Support speed range from 0.5x to 3.0x
   - Default speed of 1.0x
   - Increment/decrement by 0.1x steps
   - Quick preset buttons (0.75x, 1x, 1.25x, 1.5x, 2x)
   - Slider control for fine adjustment

2. **Speed Adjustment Methods**
   - Popup slider with live preview
   - Keyboard shortcuts (+ and - keys)
   - Context menu speed options
   - Quick preset buttons

3. **Speed Persistence**
   - Save user's preferred speed
   - Per-domain speed preferences (optional)
   - Restore speed on extension restart
   - Apply to all new TTS sessions

4. **Real-time Adjustment**
   - Change speed during active playback
   - Smooth transitions without audio artifacts
   - Update UI to reflect current speed
   - Maintain position during speed changes

### Non-Functional Requirements

1. **Performance**
   - Speed changes apply instantly (< 50ms)
   - No audio glitches during adjustment
   - Smooth UI updates

2. **Usability**
   - Clear speed indicator
   - Intuitive controls
   - Easy reset to default

## Implementation Steps

### Step 1: Speed Control Manager

```javascript
// speed-manager.js - Speed control management
class SpeedManager {
  constructor() {
    this.currentSpeed = 1.0;
    this.defaultSpeed = 1.0;
    this.minSpeed = 0.5;
    this.maxSpeed = 3.0;
    this.speedStep = 0.1;
    this.presetSpeeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    this.domainSpeeds = new Map();
    
    this.init();
  }

  async init() {
    // Load saved preferences
    await this.loadPreferences();
    
    console.log('Speed Manager initialized, current speed:', this.currentSpeed);
  }

  async loadPreferences() {
    try {
      const stored = await chrome.storage.sync.get(['defaultSpeed', 'domainSpeeds']);
      
      if (stored.defaultSpeed) {
        this.defaultSpeed = this.validateSpeed(stored.defaultSpeed);
        this.currentSpeed = this.defaultSpeed;
      }
      
      if (stored.domainSpeeds) {
        this.domainSpeeds = new Map(stored.domainSpeeds);
      }
    } catch (error) {
      console.error('Error loading speed preferences:', error);
    }
  }

  async savePreferences() {
    try {
      await chrome.storage.sync.set({
        defaultSpeed: this.defaultSpeed,
        domainSpeeds: Array.from(this.domainSpeeds.entries())
      });
    } catch (error) {
      console.error('Error saving speed preferences:', error);
    }
  }

  validateSpeed(speed) {
    // Ensure speed is within valid range
    return Math.max(this.minSpeed, Math.min(this.maxSpeed, speed));
  }

  formatSpeed(speed) {
    // Format speed for display
    return speed.toFixed(1) + 'x';
  }

  // Speed adjustment methods
  async setSpeed(speed) {
    const validSpeed = this.validateSpeed(speed);
    
    if (validSpeed !== this.currentSpeed) {
      this.currentSpeed = validSpeed;
      
      // Update default if not domain-specific
      const currentDomain = await this.getCurrentDomain();
      if (!this.domainSpeeds.has(currentDomain)) {
        this.defaultSpeed = validSpeed;
      }
      
      await this.savePreferences();
      this.notifySpeedChange(validSpeed);
      
      return true;
    }
    
    return false;
  }

  async incrementSpeed() {
    const newSpeed = Math.round((this.currentSpeed + this.speedStep) * 10) / 10;
    return this.setSpeed(newSpeed);
  }

  async decrementSpeed() {
    const newSpeed = Math.round((this.currentSpeed - this.speedStep) * 10) / 10;
    return this.setSpeed(newSpeed);
  }

  async setPresetSpeed(presetIndex) {
    if (presetIndex >= 0 && presetIndex < this.presetSpeeds.length) {
      return this.setSpeed(this.presetSpeeds[presetIndex]);
    }
    return false;
  }

  async resetSpeed() {
    return this.setSpeed(1.0);
  }

  // Domain-specific speeds
  async setDomainSpeed(domain, speed) {
    const validSpeed = this.validateSpeed(speed);
    this.domainSpeeds.set(domain, validSpeed);
    await this.savePreferences();
  }

  async getCurrentDomain() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.url) {
        const url = new URL(activeTab.url);
        return url.hostname;
      }
    } catch (error) {
      console.error('Error getting current domain:', error);
    }
    return null;
  }

  async getSpeedForCurrentDomain() {
    const domain = await this.getCurrentDomain();
    if (domain && this.domainSpeeds.has(domain)) {
      return this.domainSpeeds.get(domain);
    }
    return this.defaultSpeed;
  }

  // Get current state
  getCurrentSpeed() {
    return this.currentSpeed;
  }

  getSpeedInfo() {
    return {
      current: this.currentSpeed,
      default: this.defaultSpeed,
      min: this.minSpeed,
      max: this.maxSpeed,
      step: this.speedStep,
      presets: this.presetSpeeds,
      formatted: this.formatSpeed(this.currentSpeed)
    };
  }

  // Notify other components
  notifySpeedChange(speed) {
    chrome.runtime.sendMessage({
      type: 'SPEED_CHANGED',
      data: { 
        speed: speed,
        formatted: this.formatSpeed(speed)
      }
    }).catch(() => {
      // Ignore if no listeners
    });
  }

  // Quick speed calculations
  calculateReadingTime(characterCount, speed = null) {
    const effectiveSpeed = speed || this.currentSpeed;
    const baseWPM = 150; // Average words per minute
    const avgWordLength = 5; // Average characters per word
    
    const words = characterCount / avgWordLength;
    const minutes = words / (baseWPM * effectiveSpeed);
    
    return {
      minutes: minutes,
      formatted: this.formatReadingTime(minutes)
    };
  }

  formatReadingTime(minutes) {
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
}

// Initialize speed manager
const speedManager = new SpeedManager();
```

### Step 2: Enhanced Speech Synthesizer with Speed Control

```javascript
// speech-synthesizer.js - Enhanced with speed control
class SpeechSynthesizer {
  // ... existing code ...
  
  setRate(rate) {
    if (rate >= 0.1 && rate <= 10) {
      this.settings.rate = rate;
      
      // Apply to current utterance if playing
      if (this.isPlaying && !this.isPaused) {
        this.applyRateToCurrentUtterance(rate);
      }
      
      return true;
    }
    return false;
  }
  
  applyRateToCurrentUtterance(rate) {
    // Note: Web Speech API doesn't support changing rate mid-utterance
    // We need to implement a workaround
    if (this.currentUtterance) {
      // Store current position
      const currentPosition = this.estimateCurrentPosition();
      
      // Stop current utterance
      speechSynthesis.cancel();
      
      // Resume from position with new rate
      this.resumeFromPosition(currentPosition, rate);
    }
  }
  
  estimateCurrentPosition() {
    // Estimate position based on time elapsed and rate
    if (this.utteranceStartTime && this.currentUtterance) {
      const elapsed = Date.now() - this.utteranceStartTime;
      const estimatedCharsSpoken = (elapsed / 1000) * this.settings.rate * 10; // Rough estimate
      return Math.min(estimatedCharsSpoken, this.currentUtterance.text.length);
    }
    return 0;
  }
  
  resumeFromPosition(position, rate) {
    if (this.currentUtterance && position < this.currentUtterance.text.length) {
      const remainingText = this.currentUtterance.text.substring(position);
      
      // Create new utterance with remaining text
      const utterance = new SpeechSynthesisUtterance(remainingText);
      utterance.voice = this.settings.voice;
      utterance.rate = rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = this.settings.volume;
      
      // Copy event handlers
      utterance.onend = this.currentUtterance.onend;
      utterance.onerror = this.currentUtterance.onerror;
      
      // Update current utterance and speak
      this.currentUtterance = utterance;
      this.utteranceStartTime = Date.now();
      speechSynthesis.speak(utterance);
    }
  }
  
  async speakChunk(text, options = {}) {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings including rate
      utterance.voice = options.voice || this.settings.voice;
      utterance.rate = options.rate || this.settings.rate;
      utterance.pitch = options.pitch || this.settings.pitch;
      utterance.volume = options.volume || this.settings.volume;
      
      // Track start time for position estimation
      utterance.onstart = () => {
        this.utteranceStartTime = Date.now();
        this.currentUtterance = utterance;
        this.onStart();
      };
      
      // ... rest of existing implementation ...
    });
  }
}
```

### Step 3: Popup UI with Speed Control

```html
<!-- popup.html - Enhanced with speed control -->
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
        
        <!-- Voice selection (from feature 2.6) -->
        <div class="voice-selection">
            <!-- ... voice controls ... -->
        </div>
        
        <!-- Speed control section -->
        <div class="speed-control">
            <label for="speedSlider">Speed: <span id="speedValue">1.0x</span></label>
            <div class="speed-controls">
                <button id="speedDownBtn" class="speed-btn" title="Decrease speed (-)">
                    ➖
                </button>
                <input type="range" id="speedSlider" 
                       min="0.5" max="3.0" step="0.1" value="1.0"
                       class="speed-slider">
                <button id="speedUpBtn" class="speed-btn" title="Increase speed (+)">
                    ➕
                </button>
            </div>
            
            <!-- Speed presets -->
            <div class="speed-presets">
                <button class="preset-btn" data-speed="0.75">0.75x</button>
                <button class="preset-btn active" data-speed="1.0">1x</button>
                <button class="preset-btn" data-speed="1.25">1.25x</button>
                <button class="preset-btn" data-speed="1.5">1.5x</button>
                <button class="preset-btn" data-speed="2.0">2x</button>
            </div>
        </div>
        
        <!-- Playback controls -->
        <div class="controls">
            <!-- ... existing controls ... -->
        </div>
        
        <!-- Reading time estimate -->
        <div id="readingTime" class="reading-time" style="display: none;">
            Estimated time: <span id="timeEstimate">--</span>
        </div>
    </div>
    
    <script src="popup.js"></script>
</body>
</html>
```

```css
/* popup.css - Speed control styles */
.speed-control {
    margin: 12px 0;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 6px;
}

.speed-control label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

#speedValue {
    color: #1976d2;
    font-weight: bold;
}

.speed-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.speed-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.speed-btn:hover {
    background: #f0f0f0;
}

.speed-slider {
    flex: 1;
    height: 6px;
    -webkit-appearance: none;
    background: #ddd;
    border-radius: 3px;
    outline: none;
}

.speed-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #1976d2;
    border-radius: 50%;
    cursor: pointer;
}

.speed-slider::-webkit-slider-thumb:hover {
    background: #1565c0;
}

.speed-presets {
    display: flex;
    gap: 4px;
    margin-top: 8px;
    justify-content: center;
}

.preset-btn {
    padding: 4px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
}

.preset-btn:hover {
    background: #f0f0f0;
}

.preset-btn.active {
    background: #1976d2;
    color: white;
    border-color: #1976d2;
}

.reading-time {
    margin-top: 8px;
    padding: 8px;
    background: #e3f2fd;
    border-radius: 4px;
    font-size: 12px;
    text-align: center;
}
```

```javascript
// popup.js - Speed control functionality
class TTSPopup {
  constructor() {
    // ... existing properties ...
    this.speedManager = null;
    this.currentSpeed = 1.0;
  }

  async init() {
    // Get DOM elements
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');
    this.speedUpBtn = document.getElementById('speedUpBtn');
    this.speedDownBtn = document.getElementById('speedDownBtn');
    this.presetButtons = document.querySelectorAll('.preset-btn');
    this.readingTimeDiv = document.getElementById('readingTime');
    this.timeEstimate = document.getElementById('timeEstimate');
    // ... existing elements ...
    
    // Initialize speed manager
    await this.initializeSpeedManager();
    
    // Set up event listeners
    this.speedSlider.addEventListener('input', this.handleSpeedSliderChange.bind(this));
    this.speedSlider.addEventListener('change', this.handleSpeedSliderCommit.bind(this));
    this.speedUpBtn.addEventListener('click', this.handleSpeedUp.bind(this));
    this.speedDownBtn.addEventListener('click', this.handleSpeedDown.bind(this));
    
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', this.handlePresetClick.bind(this));
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
    
    // ... existing listeners ...
  }

  async initializeSpeedManager() {
    // Get speed data from background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SPEED_INFO'
    });
    
    if (response && response.speedInfo) {
      this.updateSpeedUI(response.speedInfo);
    }
  }

  updateSpeedUI(speedInfo) {
    this.currentSpeed = speedInfo.current;
    
    // Update slider
    this.speedSlider.value = speedInfo.current;
    this.speedSlider.min = speedInfo.min;
    this.speedSlider.max = speedInfo.max;
    this.speedSlider.step = speedInfo.step;
    
    // Update display
    this.speedValue.textContent = speedInfo.formatted;
    
    // Update preset buttons
    this.updatePresetButtons(speedInfo.current);
    
    // Update button states
    this.speedDownBtn.disabled = speedInfo.current <= speedInfo.min;
    this.speedUpBtn.disabled = speedInfo.current >= speedInfo.max;
  }

  updatePresetButtons(currentSpeed) {
    this.presetButtons.forEach(btn => {
      const presetSpeed = parseFloat(btn.dataset.speed);
      if (Math.abs(presetSpeed - currentSpeed) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  handleSpeedSliderChange(event) {
    const speed = parseFloat(event.target.value);
    this.speedValue.textContent = speed.toFixed(1) + 'x';
    this.updatePresetButtons(speed);
    
    // Update time estimate if text is selected
    this.updateTimeEstimate(speed);
  }

  async handleSpeedSliderCommit(event) {
    const speed = parseFloat(event.target.value);
    await this.setSpeed(speed);
  }

  async handleSpeedUp() {
    try {
      await chrome.runtime.sendMessage({
        type: 'INCREMENT_SPEED'
      });
      
      await this.initializeSpeedManager();
    } catch (error) {
      console.error('Error incrementing speed:', error);
    }
  }

  async handleSpeedDown() {
    try {
      await chrome.runtime.sendMessage({
        type: 'DECREMENT_SPEED'
      });
      
      await this.initializeSpeedManager();
    } catch (error) {
      console.error('Error decrementing speed:', error);
    }
  }

  async handlePresetClick(event) {
    const speed = parseFloat(event.target.dataset.speed);
    await this.setSpeed(speed);
  }

  async setSpeed(speed) {
    try {
      await chrome.runtime.sendMessage({
        type: 'SET_SPEED',
        data: { speed: speed }
      });
      
      await this.initializeSpeedManager();
      this.showTemporaryMessage(`Speed set to ${speed}x`);
    } catch (error) {
      console.error('Error setting speed:', error);
      this.showError('Failed to set speed');
    }
  }

  handleKeyboard(event) {
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
      const presetBtn = this.presetButtons[presetIndex];
      if (presetBtn) {
        event.preventDefault();
        presetBtn.click();
      }
    }
  }

  async updateTimeEstimate(speed = null) {
    // Get current selection or playing text
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CURRENT_TEXT_LENGTH'
    });
    
    if (response && response.length > 0) {
      const effectiveSpeed = speed || this.currentSpeed;
      const timeInfo = this.calculateReadingTime(response.length, effectiveSpeed);
      
      this.timeEstimate.textContent = timeInfo.formatted;
      this.readingTimeDiv.style.display = 'block';
    } else {
      this.readingTimeDiv.style.display = 'none';
    }
  }

  calculateReadingTime(characterCount, speed) {
    const baseWPM = 150; // Average words per minute
    const avgWordLength = 5; // Average characters per word
    
    const words = characterCount / avgWordLength;
    const minutes = words / (baseWPM * speed);
    
    return {
      minutes: minutes,
      formatted: this.formatReadingTime(minutes)
    };
  }

  formatReadingTime(minutes) {
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
}
```

### Step 4: Background Script Integration

```javascript
// background.js - Speed management integration
class TTSManager {
  constructor(voiceManager, speedManager) {
    // ... existing properties ...
    this.speedManager = speedManager;
  }
  
  async handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      // ... existing cases ...
      
      case 'GET_SPEED_INFO':
        sendResponse({
          speedInfo: this.speedManager.getSpeedInfo()
        });
        break;
        
      case 'SET_SPEED':
        const set = await this.speedManager.setSpeed(request.data.speed);
        sendResponse({ success: set });
        break;
        
      case 'INCREMENT_SPEED':
        await this.speedManager.incrementSpeed();
        sendResponse({ success: true });
        break;
        
      case 'DECREMENT_SPEED':
        await this.speedManager.decrementSpeed();
        sendResponse({ success: true });
        break;
        
      case 'GET_CURRENT_TEXT_LENGTH':
        const length = await this.getCurrentTextLength();
        sendResponse({ length: length });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }
  
  async startTTS(data, sender) {
    try {
      // ... existing validation ...
      
      // Include speed in TTS command
      const speed = this.speedManager.getCurrentSpeed();
      
      await chrome.tabs.sendMessage(targetTabId, {
        type: 'START_SPEECH',
        data: { 
          text: text,
          voice: data.voice || this.voiceManager.getSelectedVoice(),
          rate: speed
        }
      });
      
      // ... rest of existing implementation ...
    } catch (error) {
      console.error('Error starting TTS:', error);
      throw error;
    }
  }
  
  async getCurrentTextLength() {
    // Get length of currently selected or playing text
    if (this.currentTabId) {
      try {
        const response = await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'GET_CURRENT_TEXT_LENGTH'
        });
        return response.length || 0;
      } catch (error) {
        console.error('Error getting text length:', error);
      }
    }
    return 0;
  }
}
```

### Step 5: Content Script Integration

```javascript
// content-script.js - Speed control support
class TextSelectionHandler {
  // ... existing code ...
  
  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      // ... existing cases ...
      
      case 'CHANGE_SPEED':
        this.handleSpeedChange(request.data);
        sendResponse({ success: true });
        break;
        
      case 'GET_CURRENT_TEXT_LENGTH':
        const length = this.getCurrentTextLength();
        sendResponse({ length: length });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }
  
  handleSpeedChange(data) {
    if (window.speechSynthesizer && data.speed) {
      const success = window.speechSynthesizer.setRate(data.speed);
      
      if (success) {
        this.showUserFeedback(`Speed: ${data.speed}x`, 'info');
      }
    }
  }
  
  getCurrentTextLength() {
    if (window.speechSynthesizer) {
      const state = window.speechSynthesizer.getPlaybackState();
      if (state.currentText) {
        return state.currentText.length;
      }
    }
    
    // Fall back to current selection
    if (this.selectionText) {
      return this.selectionText.length;
    }
    
    return 0;
  }
}
```

## Testing Criteria

### Unit Tests

1. **Speed Validation Tests**
   ```javascript
   describe('Speed Manager', () => {
     test('should validate speed within range', () => {
       const speedManager = new SpeedManager();
       
       expect(speedManager.validateSpeed(0.3)).toBe(0.5);
       expect(speedManager.validateSpeed(1.5)).toBe(1.5);
       expect(speedManager.validateSpeed(5.0)).toBe(3.0);
     });

     test('should increment and decrement speed correctly', async () => {
       speedManager.currentSpeed = 1.0;
       
       await speedManager.incrementSpeed();
       expect(speedManager.currentSpeed).toBe(1.1);
       
       await speedManager.decrementSpeed();
       expect(speedManager.currentSpeed).toBe(1.0);
     });
   });
   ```

2. **Speed Persistence Tests**
   ```javascript
   test('should save and restore speed preferences', async () => {
     await speedManager.setSpeed(1.5);
     
     expect(chrome.storage.sync.set).toHaveBeenCalledWith(
       expect.objectContaining({ defaultSpeed: 1.5 })
     );
     
     // Simulate restart
     const newManager = new SpeedManager();
     await newManager.init();
     
     expect(newManager.getCurrentSpeed()).toBe(1.5);
   });
   ```

### Integration Tests

1. **Speed Application Tests**
   ```javascript
   test('should apply speed to speech synthesis', async () => {
     await speedManager.setSpeed(2.0);
     await ttsManager.startTTS({ text: 'Test' });
     
     expect(speechSynthesisUtterance.rate).toBe(2.0);
   });
   ```

### Manual Testing Scenarios

1. **Basic Speed Control**
   - Adjust speed slider and verify display updates
   - Use +/- buttons to increment/decrement
   - Click preset buttons and verify selection
   - Test keyboard shortcuts (+, -, 1-5)

2. **Speed During Playback**
   - Start TTS at normal speed
   - Change speed while playing
   - Verify smooth transition
   - Test at extreme speeds (0.5x and 3.0x)

3. **Speed Persistence**
   - Set custom speed
   - Restart extension
   - Verify speed is restored
   - Test domain-specific speeds

## Success Metrics

### Technical Metrics

1. **Response Time**: Speed changes apply in < 50ms
2. **Range Coverage**: Full 0.5x-3.0x range functional
3. **Persistence**: Speed preferences saved and restored
4. **Accuracy**: Actual playback speed matches setting

### User Experience Metrics

1. **Intuitiveness**: Clear speed indication and controls
2. **Accessibility**: Multiple ways to adjust speed
3. **Feedback**: Immediate visual/audio confirmation

## Dependencies

### Internal Dependencies
- Feature 2.3 (Basic Speech Output) - Core TTS functionality
- Chrome storage API for preferences
- Web Speech API rate parameter

### External Dependencies
- Browser support for speech rate adjustment
- Audio subsystem capability

## Risks and Mitigation

### Technical Risks

1. **Mid-playback Adjustment**
   - Risk: Can't change rate during utterance
   - Mitigation: Stop and resume with position tracking

2. **Speed Limits**
   - Risk: Some voices may not support full range
   - Mitigation: Validate per-voice capabilities

3. **Audio Quality**
   - Risk: Extreme speeds may sound distorted
   - Mitigation: Warn users about quality at extremes

## Acceptance Criteria

- [ ] Speed slider adjusts from 0.5x to 3.0x
- [ ] Current speed clearly displayed
- [ ] Preset buttons for common speeds
- [ ] Keyboard shortcuts work (+/- and 1-5)
- [ ] Speed persists across sessions
- [ ] Speed can be changed during playback
- [ ] Reading time estimates update with speed
- [ ] No audio artifacts during speed changes
- [ ] Speed setting applies to all TTS
- [ ] Visual feedback for speed changes