# Feature 2.5: Pause/Resume Functionality

**Status: 🚧 IN PROGRESS** | **Estimated Effort: 3-4 hours** | **Priority: High**

## Feature Overview

Implement pause and resume controls for TTS playback, allowing users to temporarily halt speech synthesis and continue from where they left off. This feature is essential for user control and is a natural complement to the stop functionality implemented in Feature 2.4.

## Objectives

- Enable users to pause TTS playback at any point
- Allow resuming from the exact position where paused
- Provide multiple ways to pause/resume (keyboard, context menu, popup)
- Maintain pause state information accurately
- Ensure smooth audio transitions without glitches
- Synchronize pause/resume state across all UI components

## Technical Requirements

### Functional Requirements

1. **Pause/Resume Controls**
   - Add pause/resume to context menu
   - Keyboard shortcuts (Space bar when TTS active)
   - Popup UI with play/pause button
   - Visual indicators for paused state

2. **State Management**
   - Track current utterance position
   - Maintain pause state across components
   - Handle pause during text chunking
   - Resume from correct position in queue

3. **Audio Control**
   - Smooth pause without audio artifacts
   - Immediate response to pause command
   - Accurate resume from pause point
   - Handle pause/resume during errors

4. **User Feedback**
   - Clear visual indication of paused state
   - Update all UI elements consistently
   - Show pause position in long texts
   - Provide audio feedback if enabled

### Non-Functional Requirements

1. **Performance**
   - Pause/resume actions < 50ms response time
   - No memory leaks during extended pause
   - Minimal CPU usage while paused

2. **Reliability**
   - Maintain pause state during tab switches
   - Handle rapid pause/resume cycles
   - Recover from pause during errors

## Implementation Steps

### Step 1: Enhance Speech Synthesizer with Pause/Resume

```javascript
// speech-synthesizer.js - Enhanced with pause/resume
class SpeechSynthesizer {
  constructor() {
    // ... existing properties ...
    this.pausePosition = null;
    this.pausedText = null;
    this.pausedChunkIndex = 0;
  }

  pause() {
    if (this.isPlaying && !this.isPaused) {
      try {
        // Store current position for resume
        this.storePausePosition();
        
        // Pause speech synthesis
        speechSynthesis.pause();
        
        this.isPaused = true;
        this.notifyPlaybackState('paused');
        
        console.log('Speech paused at position:', this.pausePosition);
        return true;
      } catch (error) {
        console.error('Error pausing speech:', error);
        return false;
      }
    }
    return false;
  }

  resume() {
    if (this.isPaused && speechSynthesis.paused) {
      try {
        // Resume speech synthesis
        speechSynthesis.resume();
        
        this.isPaused = false;
        this.notifyPlaybackState('resumed');
        
        console.log('Speech resumed');
        return true;
      } catch (error) {
        console.error('Error resuming speech:', error);
        return false;
      }
    }
    return false;
  }

  storePausePosition() {
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

  togglePause() {
    if (this.isPaused) {
      return this.resume();
    } else if (this.isPlaying) {
      return this.pause();
    }
    return false;
  }

  // Enhanced state management
  getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      hasQueue: this.speechQueue.length > 0,
      currentText: this.currentUtterance?.text || null,
      pausePosition: this.pausePosition,
      canResume: this.isPaused && this.pausedText !== null
    };
  }
}
```

### Step 2: Update Context Menu with Pause/Resume

```javascript
// background.js - Enhanced Context Menu Manager
class ContextMenuManager {
  constructor(selectionManager, ttsManager) {
    // ... existing properties ...
    this.pauseResumeMenuId = 'tts-pause-resume';
  }

  createMenus() {
    // ... existing menus ...
    
    // Create "Pause/Resume" menu item
    chrome.contextMenus.create({
      id: this.pauseResumeMenuId,
      title: 'Pause Speaking', // Dynamic title
      contexts: ['page', 'selection'],
      enabled: false,
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
  }

  async handleMenuClick(info, tab) {
    try {
      switch (info.menuItemId) {
        case this.speakMenuId:
          await this.triggerTTS(info, tab);
          break;
          
        case this.stopMenuId:
          await this.stopTTS(tab);
          break;
          
        case this.pauseResumeMenuId:
          await this.togglePauseTTS(tab);
          break;
          
        default:
          console.warn('Unknown menu item clicked:', info.menuItemId);
      }
    } catch (error) {
      console.error('Error handling menu click:', error);
      this.showErrorFeedback(tab, error);
    }
  }

  async togglePauseTTS(tab) {
    try {
      const state = await this.ttsManager.togglePause();
      
      // Show appropriate feedback
      const message = state.isPaused ? 'paused' : 'resumed';
      this.showPauseFeedback(tab, message);
      
      console.log(`TTS ${message} via context menu`);
      
    } catch (error) {
      console.error('Error toggling pause:', error);
      throw error;
    }
  }

  showPauseFeedback(tab, status) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TTS_FEEDBACK',
      data: { status: status }
    }).catch(error => {
      console.log('Could not send pause feedback to tab:', error);
    });
  }

  updateMenusForTTSState(state, playbackState) {
    if (!this.isMenuCreated) return;

    const isPlaying = state === 'started' || state === 'resumed';
    const isPaused = state === 'paused';
    
    // Update pause/resume menu
    if (isPlaying || isPaused) {
      chrome.contextMenus.update(this.pauseResumeMenuId, {
        enabled: true,
        title: isPaused ? 'Resume Speaking' : 'Pause Speaking'
      });
    } else {
      chrome.contextMenus.update(this.pauseResumeMenuId, {
        enabled: false,
        title: 'Pause Speaking'
      });
    }

    // ... existing menu updates ...
  }
}
```

### Step 3: Keyboard Shortcuts for Pause/Resume

```javascript
// content-script.js - Enhanced keyboard handling
class TextSelectionHandler {
  handleKeyDown(event) {
    // Handle Space bar for pause/resume when TTS is active
    if (event.key === ' ' && this.isTTSActive()) {
      if (!this.isInputElement(event.target)) {
        event.preventDefault();
        this.togglePauseTTS();
      }
    }
    
    // ... existing keyboard handlers ...
  }

  isInputElement(element) {
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTags.includes(element.tagName) || 
           element.contentEditable === 'true';
  }

  isTTSActive() {
    if (window.speechSynthesizer) {
      const state = window.speechSynthesizer.getPlaybackState();
      return state.isPlaying || state.isPaused;
    }
    return false;
  }

  async togglePauseTTS() {
    try {
      // Toggle pause locally
      if (window.speechSynthesizer) {
        const toggled = window.speechSynthesizer.togglePause();
        
        if (toggled) {
          // Notify background script
          await chrome.runtime.sendMessage({
            type: 'TOGGLE_PAUSE_TTS',
            data: {
              source: 'keyboard',
              timestamp: Date.now()
            }
          });
          
          // Show feedback
          const state = window.speechSynthesizer.getPlaybackState();
          const message = state.isPaused ? 'Speech paused' : 'Speech resumed';
          this.showUserFeedback(message, 'info');
        }
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
      this.showUserFeedback('Error toggling pause', 'error');
    }
  }

  // Enhanced message handling
  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      // ... existing cases ...
      
      case 'PAUSE_SPEECH':
        this.handlePauseSpeech();
        sendResponse({ success: true });
        break;
        
      case 'RESUME_SPEECH':
        this.handleResumeSpeech();
        sendResponse({ success: true });
        break;
        
      case 'TOGGLE_PAUSE_SPEECH':
        this.handleTogglePauseSpeech();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  handleTogglePauseSpeech() {
    try {
      if (window.speechSynthesizer) {
        window.speechSynthesizer.togglePause();
        
        const state = window.speechSynthesizer.getPlaybackState();
        const message = state.isPaused ? 'Speech paused' : 'Speech resumed';
        this.showUserFeedback(message, 'info');
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  }
}
```

### Step 4: Enhanced Popup UI with Play/Pause Button

```javascript
// popup.js - Enhanced with pause/resume controls
class TTSPopup {
  constructor() {
    this.isPlaying = false;
    this.isPaused = false;
    // ... existing properties ...
  }

  init() {
    // Get DOM elements
    this.playPauseBtn = document.getElementById('playPauseBtn');
    // ... existing elements ...
    
    // Set up event listeners
    this.playPauseBtn.addEventListener('click', this.handlePlayPause.bind(this));
    // ... existing listeners ...
  }

  updateUI(stateData) {
    const { state, playbackState } = stateData;
    
    this.isPlaying = playbackState && playbackState.isPlaying;
    this.isPaused = playbackState && playbackState.isPaused;
    
    // Update play/pause button
    if (this.isPaused) {
      this.playPauseBtn.innerHTML = '▶️ Resume';
      this.playPauseBtn.className = 'play-btn';
      this.playPauseBtn.disabled = false;
      this.statusElement.textContent = 'TTS is paused';
      this.statusElement.className = 'status paused';
    } else if (this.isPlaying) {
      this.playPauseBtn.innerHTML = '⏸️ Pause';
      this.playPauseBtn.className = 'pause-btn';
      this.playPauseBtn.disabled = false;
      this.statusElement.textContent = 'TTS is playing';
      this.statusElement.className = 'status playing';
    } else {
      this.playPauseBtn.innerHTML = '▶️ Play';
      this.playPauseBtn.className = 'play-btn';
      this.playPauseBtn.disabled = true;
      this.statusElement.textContent = 'TTS is not active';
      this.statusElement.className = 'status stopped';
    }
    
    // ... existing UI updates ...
  }

  async handlePlayPause() {
    try {
      this.playPauseBtn.disabled = true;
      
      if (this.isPaused || this.isPlaying) {
        await chrome.runtime.sendMessage({
          type: 'TOGGLE_PAUSE_TTS',
          data: { source: 'popup' }
        });
      }
      
      // UI will be updated via message listener
      
    } catch (error) {
      console.error('Error toggling pause:', error);
      this.showError('Failed to toggle pause');
    } finally {
      // Re-enable button after a short delay
      setTimeout(() => {
        this.playPauseBtn.disabled = false;
      }, 200);
    }
  }
}
```

### Step 5: Enhanced TTS Manager with Pause/Resume

```javascript
// background.js - TTS Manager with pause/resume
class TTSManager {
  async handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      // ... existing cases ...
      
      case 'PAUSE_TTS':
        await this.pauseTTS(request.data);
        sendResponse({ success: true });
        break;
        
      case 'RESUME_TTS':
        await this.resumeTTS(request.data);
        sendResponse({ success: true });
        break;
        
      case 'TOGGLE_PAUSE_TTS':
        const state = await this.togglePause(request.data);
        sendResponse({ success: true, state: state });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async pauseTTS(options = {}) {
    const { source = 'manual' } = options;
    
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'PAUSE_SPEECH',
          data: { source: source }
        });
        
        console.log('TTS paused, source:', source);
        return true;
      } catch (error) {
        console.error('Error pausing TTS:', error);
        return false;
      }
    }
    return false;
  }

  async resumeTTS(options = {}) {
    const { source = 'manual' } = options;
    
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'RESUME_SPEECH',
          data: { source: source }
        });
        
        console.log('TTS resumed, source:', source);
        return true;
      } catch (error) {
        console.error('Error resuming TTS:', error);
        return false;
      }
    }
    return false;
  }

  async togglePause(options = {}) {
    const { source = 'manual' } = options;
    
    if (this.isActive && this.currentTabId) {
      try {
        const response = await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'TOGGLE_PAUSE_SPEECH',
          data: { source: source }
        });
        
        return response;
      } catch (error) {
        console.error('Error toggling pause:', error);
        throw error;
      }
    }
    return null;
  }

  handleStateChange(data) {
    const { state, playbackState } = data;
    
    switch (state) {
      case 'started':
      case 'resumed':
        this.isActive = true;
        this.isPaused = false;
        break;
        
      case 'paused':
        this.isActive = true;
        this.isPaused = true;
        break;
        
      case 'ended':
      case 'stopped':
        this.isActive = false;
        this.isPaused = false;
        this.currentTabId = null;
        break;
    }
    
    // Broadcast state change
    this.broadcastStateChange(state, playbackState);
  }
}
```

## Testing Criteria

### Unit Tests

1. **Pause/Resume Functionality**
   ```javascript
   describe('Pause/Resume', () => {
     test('should pause active speech', async () => {
       await speechSynthesizer.speak('Test text');
       const paused = speechSynthesizer.pause();
       
       expect(paused).toBe(true);
       expect(speechSynthesizer.isPaused).toBe(true);
       expect(speechSynthesis.pause).toHaveBeenCalled();
     });

     test('should resume paused speech', async () => {
       await speechSynthesizer.speak('Test text');
       speechSynthesizer.pause();
       const resumed = speechSynthesizer.resume();
       
       expect(resumed).toBe(true);
       expect(speechSynthesizer.isPaused).toBe(false);
       expect(speechSynthesis.resume).toHaveBeenCalled();
     });

     test('should toggle pause state correctly', () => {
       speechSynthesizer.isPlaying = true;
       speechSynthesizer.togglePause();
       expect(speechSynthesizer.isPaused).toBe(true);
       
       speechSynthesizer.togglePause();
       expect(speechSynthesizer.isPaused).toBe(false);
     });
   });
   ```

2. **State Management Tests**
   ```javascript
   test('should maintain pause position', async () => {
     const longText = 'This is a long text. '.repeat(20);
     await speechSynthesizer.speak(longText);
     
     speechSynthesizer.pause();
     const state = speechSynthesizer.getPlaybackState();
     
     expect(state.pausePosition).toBeDefined();
     expect(state.canResume).toBe(true);
   });
   ```

### Integration Tests

1. **Cross-Component Pause/Resume**
   ```javascript
   test('should sync pause state across components', async () => {
     // Start TTS
     await startTTS();
     
     // Pause via keyboard
     simulateKeyPress(' ');
     
     // Verify context menu reflects paused state
     expect(contextMenu.title).toBe('Resume Speaking');
     
     // Verify popup reflects paused state
     expect(popup.playPauseBtn.textContent).toBe('▶️ Resume');
   });
   ```

### Manual Testing Scenarios

1. **Basic Pause/Resume Tests**
   - Start TTS, pause mid-sentence
   - Resume and verify continues from correct position
   - Pause/resume multiple times during playback
   - Test with different pause durations

2. **Control Method Tests**
   - Pause via space bar, resume via context menu
   - Pause via popup, resume via keyboard
   - Test all combinations of pause/resume methods

3. **Edge Case Tests**
   - Pause during last word of text
   - Pause/resume during text chunking
   - Rapid pause/resume cycles
   - Pause, switch tabs, return and resume

## Success Metrics

### Technical Metrics

1. **Responsiveness**: Pause/resume actions < 50ms
2. **Accuracy**: Resume from exact pause position 100% of time
3. **Reliability**: No audio glitches or stutters
4. **State Consistency**: All UI components reflect correct state

### User Experience Metrics

1. **Intuitive Controls**: Space bar for pause/resume
2. **Visual Feedback**: Clear indication of paused state
3. **Smooth Transitions**: No jarring audio cuts

## Dependencies

### Internal Dependencies
- Feature 2.3 (Basic Speech Output) - Core TTS functionality
- Feature 2.4 (Stop Functionality) - State management patterns
- Chrome tabs and runtime APIs

### External Dependencies
- Web Speech API pause()/resume() methods
- Browser audio subsystem cooperation

## Risks and Mitigation

### Technical Risks

1. **Browser Compatibility**
   - Risk: pause()/resume() may not work consistently
   - Mitigation: Test across Chrome versions, implement fallbacks

2. **Position Loss**
   - Risk: Cannot resume from exact position
   - Mitigation: Track position manually if needed

3. **State Synchronization**
   - Risk: Pause state may get out of sync
   - Mitigation: Robust state management and recovery

## Acceptance Criteria

- [ ] TTS can be paused and resumed via multiple methods
- [ ] Space bar pauses/resumes when TTS is active
- [ ] Context menu shows "Pause Speaking" / "Resume Speaking"
- [ ] Popup has functional play/pause button
- [ ] Resume continues from exact pause position
- [ ] Pause state persists during tab switches
- [ ] All UI components reflect correct pause state
- [ ] No audio artifacts during pause/resume
- [ ] Pause/resume works with chunked text
- [ ] Error handling prevents crashes