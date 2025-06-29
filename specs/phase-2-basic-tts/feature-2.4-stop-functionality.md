# Feature 2.4: Stop Functionality

**Status: ✅ COMPLETED** | **Completed Date: 2025-06-27** | **Commit: 85e89e6** | **Assignee: Claude** | **Git Tag: feature-2.4-completed** | **Pull Request: [#6](https://github.com/DanielEskinazi/TTS-Chrome/pull/6)**

## Feature Overview

Implement comprehensive stop functionality that allows users to immediately halt TTS playback through multiple interaction methods. This feature ensures users have full control over speech synthesis and can stop unwanted or lengthy speech at any time, providing a critical safety valve for the TTS system.

## Objectives

- Provide multiple ways to stop TTS playback (context menu, keyboard shortcuts, popup)
- Ensure immediate and complete cessation of speech synthesis
- Clean up audio resources and reset system state properly
- Maintain consistent behavior across all stop mechanisms
- Handle edge cases like rapid stop/start cycles gracefully
- Provide clear feedback when speech is stopped

## Technical Requirements

### Functional Requirements

1. **Stop Mechanisms**
   - Context menu "Stop Speaking" option
   - Keyboard shortcut (Escape key, Ctrl+Shift+S)
   - Extension popup stop button
   - Automatic stop on page navigation
   - Stop on new TTS request

2. **State Management**
   - Immediately halt speech synthesis
   - Clear speech queue and current utterance
   - Reset playback state across all components
   - Update UI elements to reflect stopped state

3. **Resource Cleanup**
   - Properly dispose of audio resources
   - Clear event listeners and timers
   - Reset memory usage to baseline
   - Handle concurrent stop requests safely

4. **User Feedback**
   - Visual confirmation of stop action
   - Update context menu state
   - Provide audio feedback (brief tone) if enabled
   - Show stop status in extension popup

### Non-Functional Requirements

1. **Performance**
   - Stop action should be instantaneous (< 100ms)
   - No audio artifacts or glitches during stop
   - Minimal CPU usage for stop operations

2. **Reliability**
   - Stop should work in all playback states
   - Handle rapid stop/start cycles without issues
   - Graceful handling of stop during speech errors

## Implementation Steps

### Step 1: Enhanced Context Menu with Stop Option

```javascript
// background.js - Enhanced Context Menu Manager
class ContextMenuManager {
  constructor(selectionManager, ttsManager) {
    this.selectionManager = selectionManager;
    this.ttsManager = ttsManager;
    this.speakMenuId = 'tts-speak';
    this.stopMenuId = 'tts-stop';
    this.isMenuCreated = false;
    
    this.init();
  }

  init() {
    // Create context menus when extension loads
    chrome.runtime.onStartup.addListener(() => this.createContextMenus());
    chrome.runtime.onInstalled.addListener(() => this.createContextMenus());
    
    // Listen for context menu clicks
    chrome.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));
    
    // Listen for TTS state changes to update menu
    chrome.runtime.onMessage.addListener(this.handleTTSStateMessage.bind(this));
    
    // Create menus immediately
    this.createContextMenus();
  }

  createContextMenus() {
    // Remove existing menus if present
    if (this.isMenuCreated) {
      chrome.contextMenus.removeAll(() => {
        this.createMenus();
      });
    } else {
      this.createMenus();
    }
  }

  createMenus() {
    // Create "Speak" menu item
    chrome.contextMenus.create({
      id: this.speakMenuId,
      title: 'Speak',
      contexts: ['selection'],
      enabled: false,
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, (error) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating speak menu:', chrome.runtime.lastError);
        return;
      }
    });

    // Create "Stop Speaking" menu item
    chrome.contextMenus.create({
      id: this.stopMenuId,
      title: 'Stop Speaking',
      contexts: ['page', 'selection'],
      enabled: false,
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, (error) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating stop menu:', chrome.runtime.lastError);
        return;
      }
      
      this.isMenuCreated = true;
      console.log('TTS context menus created');
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
          
        default:
          console.warn('Unknown menu item clicked:', info.menuItemId);
      }
    } catch (error) {
      console.error('Error handling menu click:', error);
      this.showErrorFeedback(tab, error);
    }
  }

  async triggerTTS(info, tab) {
    // Existing TTS trigger logic from feature 2.2
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SELECTION'
      });

      if (response && response.hasSelection) {
        const textToSpeak = response.text || info.selectionText;
        
        // Start TTS
        await this.ttsManager.startTTS({
          text: textToSpeak,
          tabId: tab.id
        });
        
      } else {
        throw new Error('No text selected for TTS');
      }
    } catch (error) {
      console.error('Error triggering TTS:', error);
      throw error;
    }
  }

  async stopTTS(tab) {
    try {
      // Stop TTS using the TTS manager
      await this.ttsManager.stopTTS();
      
      // Show stop feedback
      this.showStopFeedback(tab);
      
      console.log('TTS stopped via context menu');
      
    } catch (error) {
      console.error('Error stopping TTS:', error);
      throw error;
    }
  }

  showStopFeedback(tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TTS_FEEDBACK',
      data: { status: 'stopped' }
    }).catch(error => {
      console.log('Could not send stop feedback to tab:', error);
    });
  }

  showErrorFeedback(tab, error) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TTS_FEEDBACK',
      data: { 
        status: 'error',
        message: error.message 
      }
    }).catch(error => {
      console.log('Could not send error feedback to tab:', error);
    });
  }

  handleTTSStateMessage(request, sender, sendResponse) {
    if (request.type === 'TTS_STATE_CHANGED') {
      const { state } = request.data;
      this.updateMenusForTTSState(state);
    }
  }

  updateMenusForTTSState(state) {
    if (!this.isMenuCreated) return;

    const isPlaying = (state === 'started' || state === 'resumed');
    const hasStopped = (state === 'ended' || state === 'stopped');

    // Update speak menu (enabled when text is selected and not playing)
    chrome.contextMenus.update(this.speakMenuId, {
      enabled: !isPlaying && this.selectionManager.hasSelection()
    });

    // Update stop menu (enabled when playing)
    chrome.contextMenus.update(this.stopMenuId, {
      enabled: isPlaying
    });
  }

  // Update selection state (from feature 2.2)
  updateMenuState(hasSelection) {
    if (!this.isMenuCreated) return;

    const isPlaying = this.ttsManager.getState().isActive;

    chrome.contextMenus.update(this.speakMenuId, {
      enabled: hasSelection && !isPlaying
    });

    // Stop menu state remains based on TTS state
  }
}
```

### Step 2: Keyboard Shortcuts Implementation

```javascript
// content-script.js - Keyboard shortcut handling
class TextSelectionHandler {
  // ... existing code ...

  init() {
    // ... existing initialization ...
    
    // Add keyboard event listeners for stop functionality
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Listen for global keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  handleKeyDown(event) {
    // Handle Escape key to stop TTS
    if (event.key === 'Escape') {
      this.handleEscapeKey(event);
    }
    
    // Handle Ctrl+Shift+S to stop TTS
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      this.handleStopShortcut();
    }
  }

  handleEscapeKey(event) {
    // Only handle escape if TTS is playing
    if (this.isTTSPlaying()) {
      event.preventDefault();
      event.stopPropagation();
      this.stopTTS();
    }
  }

  handleStopShortcut() {
    // Always handle the stop shortcut
    this.stopTTS();
  }

  setupKeyboardShortcuts() {
    // Register keyboard shortcuts with the extension
    chrome.runtime.sendMessage({
      type: 'REGISTER_SHORTCUTS',
      data: {
        shortcuts: [
          {
            key: 'Escape',
            description: 'Stop TTS playback',
            condition: 'tts-playing'
          },
          {
            key: 'Ctrl+Shift+S',
            description: 'Stop TTS playback',
            condition: 'always'
          }
        ]
      }
    }).catch(error => {
      console.log('Could not register shortcuts:', error);
    });
  }

  async stopTTS() {
    try {
      // Send stop command to background script
      await chrome.runtime.sendMessage({
        type: 'STOP_TTS',
        data: {
          source: 'keyboard',
          timestamp: Date.now()
        }
      });
      
      // Also stop local speech synthesis
      if (window.speechSynthesizer) {
        window.speechSynthesizer.stop();
      }
      
      // Show feedback
      this.showUserFeedback('Speech stopped', 'info');
      
    } catch (error) {
      console.error('Error stopping TTS:', error);
      this.showUserFeedback('Error stopping speech', 'error');
    }
  }

  isTTSPlaying() {
    // Check if TTS is currently playing
    if (window.speechSynthesizer) {
      const state = window.speechSynthesizer.getPlaybackState();
      return state.isPlaying && !state.isPaused;
    }
    return false;
  }

  // Enhanced message handling for stop functionality
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
        this.handleStopSpeech(request.data);
        sendResponse({ success: true });
        break;
        
      case 'FORCE_STOP':
        this.handleForceStop();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  handleStopSpeech(data = {}) {
    try {
      if (window.speechSynthesizer) {
        window.speechSynthesizer.stop();
      }
      
      // Clear any local timers or intervals
      this.clearTTSResources();
      
      // Show appropriate feedback based on stop source
      const source = data.source || 'unknown';
      const message = this.getStopMessage(source);
      
      this.showUserFeedback(message, 'info');
      
      console.log('Speech stopped from:', source);
      
    } catch (error) {
      console.error('Error in handleStopSpeech:', error);
    }
  }

  handleForceStop() {
    // Force stop for emergency situations
    try {
      if (window.speechSynthesizer) {
        window.speechSynthesizer.stop();
      }
      
      // Force clear the speech synthesis queue
      if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
      }
      
      this.clearTTSResources();
      this.showUserFeedback('Speech force stopped', 'warning');
      
    } catch (error) {
      console.error('Error in force stop:', error);
    }
  }

  clearTTSResources() {
    // Clear any timers, intervals, or other resources
    if (this.ttsTimer) {
      clearTimeout(this.ttsTimer);
      this.ttsTimer = null;
    }
    
    if (this.ttsInterval) {
      clearInterval(this.ttsInterval);
      this.ttsInterval = null;
    }
  }

  getStopMessage(source) {
    const messages = {
      'keyboard': 'Speech stopped (keyboard)',
      'context-menu': 'Speech stopped',
      'popup': 'Speech stopped (popup)',
      'navigation': 'Speech stopped (page changed)',
      'new-request': 'Speech stopped (new request)',
      'error': 'Speech stopped (error)',
      'force': 'Speech force stopped'
    };
    
    return messages[source] || 'Speech stopped';
  }

  handleTTSFeedback(feedbackData) {
    const { status, message } = feedbackData;
    
    switch (status) {
      case 'started':
        this.showUserFeedback('TTS Started', 'success');
        break;
        
      case 'stopped':
        this.showUserFeedback('TTS Stopped', 'info');
        break;
        
      case 'no-selection':
        this.showUserFeedback('No text selected', 'warning');
        break;
        
      case 'error':
        this.showUserFeedback(message || 'TTS Error', 'error');
        break;
    }
  }
}
```

### Step 3: Enhanced TTS Manager with Comprehensive Stop Logic

```javascript
// background.js - Enhanced TTS Manager
class TTSManager {
  constructor() {
    this.isActive = false;
    this.currentTabId = null;
    this.stopTimeout = null;
    this.forceStopAttempts = 0;
    
    this.init();
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'START_TTS':
        await this.startTTS(request.data, sender);
        sendResponse({ success: true });
        break;
        
      case 'STOP_TTS':
        await this.stopTTS(request.data);
        sendResponse({ success: true });
        break;
        
      case 'FORCE_STOP_TTS':
        await this.forceStopTTS();
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
      // Stop any existing TTS first
      if (this.isActive) {
        await this.stopTTS({ source: 'new-request' });
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const { text, tabId } = data;
      
      if (!text) {
        throw new Error('No text provided for TTS');
      }

      const targetTabId = tabId || sender.tab?.id;
      
      if (!targetTabId) {
        throw new Error('No tab ID available for TTS');
      }

      // Reset force stop attempts
      this.forceStopAttempts = 0;

      // Send speech command to content script
      await chrome.tabs.sendMessage(targetTabId, {
        type: 'START_SPEECH',
        data: { text: text }
      });

      this.isActive = true;
      this.currentTabId = targetTabId;
      
      // Set up automatic stop timeout for very long text
      this.setStopTimeout();
      
      console.log('TTS started for text:', text.substring(0, 50) + '...');
      
    } catch (error) {
      console.error('Error starting TTS:', error);
      throw error;
    }
  }

  async stopTTS(options = {}) {
    const { source = 'manual', force = false } = options;
    
    try {
      if (!this.isActive && !force) {
        console.log('TTS is not active, ignoring stop request');
        return;
      }

      // Clear the stop timeout
      this.clearStopTimeout();

      if (this.currentTabId) {
        // Send stop command to content script
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'STOP_SPEECH',
          data: { source: source }
        }).catch(error => {
          console.warn('Could not send stop message to tab:', error);
          // Tab might be closed or unresponsive, continue with cleanup
        });
      }

      // Reset state
      this.isActive = false;
      this.currentTabId = null;
      
      // Broadcast stop state
      this.broadcastStateChange('stopped', { isPlaying: false });
      
      console.log('TTS stopped, source:', source);
      
    } catch (error) {
      console.error('Error stopping TTS:', error);
      
      // Force cleanup even if stop failed
      this.forceCleanup();
      throw error;
    }
  }

  async forceStopTTS() {
    console.log('Force stopping TTS');
    
    this.forceStopAttempts++;
    
    try {
      // Clear any timeouts
      this.clearStopTimeout();
      
      // Send force stop to content script
      if (this.currentTabId) {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: 'FORCE_STOP'
        }).catch(error => {
          console.warn('Could not send force stop to tab:', error);
        });
      }
      
      // Force cleanup
      this.forceCleanup();
      
      // If we've tried multiple times, show error notification
      if (this.forceStopAttempts > 2) {
        this.showForceStopNotification();
      }
      
    } catch (error) {
      console.error('Error force stopping TTS:', error);
      this.forceCleanup();
    }
  }

  forceCleanup() {
    // Aggressively clean up state
    this.isActive = false;
    this.currentTabId = null;
    this.clearStopTimeout();
    
    // Broadcast stopped state
    this.broadcastStateChange('stopped', { isPlaying: false });
    
    console.log('TTS force cleanup completed');
  }

  setStopTimeout() {
    // Automatically stop TTS after 10 minutes to prevent runaway speech
    this.stopTimeout = setTimeout(() => {
      console.warn('TTS auto-stop timeout reached');
      this.stopTTS({ source: 'timeout', force: true });
    }, 10 * 60 * 1000); // 10 minutes
  }

  clearStopTimeout() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
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
        this.clearStopTimeout();
        break;
        
      case 'paused':
      case 'resumed':
        // State remains active
        break;
        
      case 'error':
        // Handle error state
        this.forceCleanup();
        break;
    }
    
    // Broadcast state change
    this.broadcastStateChange(state, playbackState);
  }

  handleTTSError(errorData) {
    console.error('TTS Error:', errorData);
    
    // Stop and cleanup on error
    this.forceCleanup();
    
    // Show error notification if critical
    if (errorData.errorType === 'critical') {
      this.showErrorNotification(errorData);
    }
  }

  showForceStopNotification() {
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'TTS Force Stop',
      message: 'Text-to-Speech has been force stopped due to multiple stop attempts.'
    });
  }

  showErrorNotification(errorData) {
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'TTS Error',
      message: `Text-to-Speech error: ${errorData.error}`
    });
  }

  broadcastStateChange(state, playbackState) {
    // Send to popup and other components
    chrome.runtime.sendMessage({
      type: 'TTS_PLAYBACK_STATE',
      data: { state, playbackState }
    }).catch(() => {
      // Popup may not be open, ignore error
    });
  }

  // Tab change handlers
  init() {
    // ... existing initialization ...
    
    // Stop TTS when tab changes
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
  }

  handleTabChange(activeInfo) {
    // Stop TTS when switching tabs
    if (this.isActive && this.currentTabId !== activeInfo.tabId) {
      this.stopTTS({ source: 'navigation' });
    }
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Stop TTS when page reloads or navigates
    if (changeInfo.status === 'loading' && this.currentTabId === tabId) {
      this.stopTTS({ source: 'navigation' });
    }
  }

  handleTabRemoved(tabId, removeInfo) {
    // Clean up if the tab with active TTS is closed
    if (this.currentTabId === tabId) {
      this.forceCleanup();
    }
  }

  // Public API methods
  getState() {
    return {
      isActive: this.isActive,
      currentTabId: this.currentTabId,
      forceStopAttempts: this.forceStopAttempts
    };
  }
}
```

### Step 4: Popup UI with Stop Button

```html
<!-- popup.html - Enhanced with stop functionality -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            width: 300px;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .status {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 4px;
            text-align: center;
        }
        
        .status.playing {
            background-color: #e8f5e8;
            color: #2e7d32;
            border: 1px solid #4caf50;
        }
        
        .status.stopped {
            background-color: #f5f5f5;
            color: #666;
            border: 1px solid #ccc;
        }
        
        .controls {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }
        
        button {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .stop-btn {
            background-color: #f44336;
            color: white;
        }
        
        .stop-btn:hover:not(:disabled) {
            background-color: #d32f2f;
        }
        
        .force-stop-btn {
            background-color: #ff9800;
            color: white;
        }
        
        .force-stop-btn:hover:not(:disabled) {
            background-color: #f57c00;
        }
        
        .info {
            font-size: 12px;
            color: #666;
            margin-top: 16px;
        }
        
        .shortcuts {
            margin-top: 12px;
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 4px;
            font-size: 11px;
            color: #555;
        }
        
        .shortcuts h4 {
            margin: 0 0 4px 0;
            font-size: 12px;
        }
        
        .shortcuts ul {
            margin: 0;
            padding-left: 16px;
        }
    </style>
</head>
<body>
    <div id="status" class="status stopped">
        TTS is not active
    </div>
    
    <div class="controls">
        <button id="stopBtn" class="stop-btn" disabled>
            Stop Speaking
        </button>
        <button id="forceStopBtn" class="force-stop-btn" disabled>
            Force Stop
        </button>
    </div>
    
    <div class="info">
        <div id="currentText" style="display: none;">
            Currently speaking: <span id="textPreview"></span>
        </div>
    </div>
    
    <div class="shortcuts">
        <h4>Keyboard Shortcuts:</h4>
        <ul>
            <li><strong>Escape</strong> - Stop TTS (when playing)</li>
            <li><strong>Ctrl+Shift+S</strong> - Stop TTS</li>
        </ul>
    </div>
    
    <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js - Popup functionality
class TTSPopup {
  constructor() {
    this.isPlaying = false;
    this.currentText = '';
    
    this.init();
  }

  init() {
    // Get DOM elements
    this.statusElement = document.getElementById('status');
    this.stopBtn = document.getElementById('stopBtn');
    this.forceStopBtn = document.getElementById('forceStopBtn');
    this.currentTextElement = document.getElementById('currentText');
    this.textPreviewElement = document.getElementById('textPreview');
    
    // Set up event listeners
    this.stopBtn.addEventListener('click', this.handleStop.bind(this));
    this.forceStopBtn.addEventListener('click', this.handleForceStop.bind(this));
    
    // Listen for TTS state changes
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Get initial state
    this.updateState();
  }

  async updateState() {
    try {
      // Get current TTS state from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TTS_STATE'
      });
      
      if (response && response.state) {
        this.updateUI(response.state);
      }
    } catch (error) {
      console.error('Error getting TTS state:', error);
    }
  }

  handleMessage(request, sender, sendResponse) {
    if (request.type === 'TTS_PLAYBACK_STATE') {
      const { state, playbackState } = request.data;
      this.updateUI({ state, playbackState });
    }
  }

  updateUI(stateData) {
    const { state, playbackState } = stateData;
    
    // Determine if TTS is playing
    this.isPlaying = (state === 'started' || state === 'resumed') && 
                     playbackState && playbackState.isPlaying;
    
    // Update status display
    if (this.isPlaying) {
      this.statusElement.textContent = 'TTS is playing';
      this.statusElement.className = 'status playing';
      
      // Show current text if available
      if (playbackState.currentText) {
        this.currentText = playbackState.currentText;
        this.showCurrentText();
      }
    } else {
      this.statusElement.textContent = 'TTS is not active';
      this.statusElement.className = 'status stopped';
      this.hideCurrentText();
    }
    
    // Update button states
    this.stopBtn.disabled = !this.isPlaying;
    this.forceStopBtn.disabled = !this.isPlaying;
  }

  showCurrentText() {
    if (this.currentText) {
      const preview = this.currentText.length > 50 
        ? this.currentText.substring(0, 50) + '...'
        : this.currentText;
      
      this.textPreviewElement.textContent = preview;
      this.currentTextElement.style.display = 'block';
    }
  }

  hideCurrentText() {
    this.currentTextElement.style.display = 'none';
    this.textPreviewElement.textContent = '';
  }

  async handleStop() {
    try {
      this.stopBtn.disabled = true;
      this.stopBtn.textContent = 'Stopping...';
      
      await chrome.runtime.sendMessage({
        type: 'STOP_TTS',
        data: { source: 'popup' }
      });
      
      // UI will be updated via message listener
      
    } catch (error) {
      console.error('Error stopping TTS:', error);
      this.showError('Failed to stop TTS');
    } finally {
      this.stopBtn.textContent = 'Stop Speaking';
    }
  }

  async handleForceStop() {
    try {
      this.forceStopBtn.disabled = true;
      this.forceStopBtn.textContent = 'Force Stopping...';
      
      await chrome.runtime.sendMessage({
        type: 'FORCE_STOP_TTS'
      });
      
      // UI will be updated via message listener
      
    } catch (error) {
      console.error('Error force stopping TTS:', error);
      this.showError('Failed to force stop TTS');
    } finally {
      this.forceStopBtn.textContent = 'Force Stop';
    }
  }

  showError(message) {
    this.statusElement.textContent = message;
    this.statusElement.className = 'status error';
    
    // Reset after 3 seconds
    setTimeout(() => {
      this.updateState();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TTSPopup();
});
```

## Testing Criteria

### Unit Tests

1. **Stop Mechanism Tests**
   ```javascript
   describe('Stop Functionality', () => {
     test('should stop TTS via context menu', async () => {
       // Start TTS
       await ttsManager.startTTS({ text: 'test text' });
       expect(ttsManager.isActive).toBe(true);
       
       // Stop via context menu
       await contextMenuManager.stopTTS(mockTab);
       expect(ttsManager.isActive).toBe(false);
     });

     test('should stop TTS via keyboard shortcut', async () => {
       // Start TTS
       await startTTS();
       
       // Simulate Escape key
       const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
       document.dispatchEvent(escapeEvent);
       
       expect(speechSynthesizer.isPlaying).toBe(false);
     });

     test('should handle force stop', async () => {
       // Start TTS
       await ttsManager.startTTS({ text: 'test text' });
       
       // Force stop
       await ttsManager.forceStopTTS();
       
       expect(ttsManager.isActive).toBe(false);
       expect(speechSynthesis.cancel).toHaveBeenCalled();
     });
   });
   ```

2. **State Management Tests**
   ```javascript
   test('should clean up resources on stop', async () => {
     const ttsManager = new TTSManager();
     await ttsManager.startTTS({ text: 'test' });
     
     await ttsManager.stopTTS();
     
     expect(ttsManager.stopTimeout).toBeNull();
     expect(ttsManager.currentTabId).toBeNull();
   });
   ```

### Integration Tests

1. **Cross-Component Stop Tests**
   ```javascript
   test('should sync stop state across all components', async () => {
     // Start TTS
     await simulateContextMenuTTS();
     
     // Stop via keyboard
     await simulateKeyboardStop();
     
     // Verify all components reflect stopped state
     expect(contextMenuManager.getMenuState().stopEnabled).toBe(false);
     expect(ttsManager.isActive).toBe(false);
   });
   ```

2. **Tab Navigation Stop Tests**
   ```javascript
   test('should stop TTS when navigating away from tab', async () => {
     await startTTS();
     
     // Simulate tab change
     await simulateTabChange();
     
     expect(ttsManager.isActive).toBe(false);
   });
   ```

### Manual Testing Scenarios

1. **Basic Stop Tests**
   - Start TTS, stop via context menu
   - Start TTS, stop via Escape key
   - Start TTS, stop via Ctrl+Shift+S
   - Start TTS, stop via popup button

2. **Edge Case Tests**
   - Rapid start/stop cycles
   - Stop during very long text playback
   - Stop when audio system is busy
   - Multiple stop requests simultaneously

3. **Navigation Tests**
   - Stop when refreshing page
   - Stop when navigating to new URL
   - Stop when closing tab
   - Stop when switching tabs

4. **Error Recovery Tests**
   - Force stop when regular stop fails
   - Stop during speech synthesis errors
   - Recovery after failed stop attempts

## Success Metrics

### Technical Metrics

1. **Responsiveness**: Stop action completes within 100ms
2. **Reliability**: 99%+ success rate for stop operations
3. **Resource Cleanup**: Complete cleanup of audio resources
4. **State Consistency**: All components reflect correct stop state

### User Experience Metrics

1. **Immediacy**: No audio artifacts or delays during stop
2. **Feedback**: Clear confirmation of stop action
3. **Accessibility**: Stop accessible via multiple methods

## Dependencies

### Internal Dependencies
- Feature 2.3 (Basic Speech Output) - Core TTS functionality to stop
- Feature 2.2 (Minimal Context Menu) - Context menu integration
- Chrome tabs, contextMenus, and runtime APIs

### External Dependencies
- Web Speech API speechSynthesis.cancel()
- Browser keyboard event handling
- Audio system cooperation

## Risks and Mitigation

### Technical Risks

1. **Incomplete Stop**
   - Risk: Speech synthesis may not stop completely
   - Mitigation: Force stop mechanisms and multiple stop methods

2. **Resource Leaks**
   - Risk: Audio resources may not be properly released
   - Mitigation: Comprehensive cleanup procedures and timeouts

3. **State Inconsistency**
   - Risk: UI may not reflect actual stop state
   - Mitigation: Robust state synchronization and error handling

### User Experience Risks

1. **Delayed Stop Response**
   - Risk: Stop action may not be immediate
   - Mitigation: Multiple stop mechanisms and force stop option

2. **Confusing Feedback**
   - Risk: Users may not know if stop worked
   - Mitigation: Clear visual and audio feedback

## Future Enhancements

1. **Advanced Stop Options**
   - Fade out instead of abrupt stop
   - Stop at sentence boundaries
   - Pause/resume before stop

2. **Smart Stop Behavior**
   - Context-aware stop (finish sentence)
   - Stop with bookmark for resume
   - Stop with reading progress save

3. **Enhanced Feedback**
   - Visual progress indicators
   - Stop confirmation sounds
   - Undo stop functionality

## Acceptance Criteria

- [ ] TTS can be stopped via context menu "Stop Speaking" option
- [ ] Escape key stops TTS when playing
- [ ] Ctrl+Shift+S keyboard shortcut stops TTS
- [ ] Extension popup provides stop button with real-time state
- [ ] Stop action is immediate (< 100ms response time)
- [ ] All audio resources are properly cleaned up on stop
- [ ] Stop state is synchronized across all UI components
- [ ] Force stop mechanism handles stuck or unresponsive TTS
- [ ] TTS automatically stops on page navigation/refresh
- [ ] Error handling prevents stop failures from causing crashes
- [ ] User receives clear feedback when stop is successful
- [ ] Multiple simultaneous stop requests are handled gracefully