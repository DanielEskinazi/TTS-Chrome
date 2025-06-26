# Feature 2.2: Minimal Context Menu

**Status: ✅ COMPLETED** | **Completed Date: 2025-06-26** | **Commit: [pending]** | **Assignee: Claude** | **Git Tag: feature-2.2-completed**

## Feature Overview

Implement a context menu integration that appears when users right-click on selected text, providing a "Speak" option to trigger TTS functionality. This feature builds upon the text selection detection from Feature 2.1 and provides the primary user interface for TTS activation.

## Objectives

- Create a clean, intuitive context menu entry for TTS functionality
- Ensure context menu only appears when text is selected
- Provide immediate feedback when TTS is triggered
- Handle context menu state management across tabs and page changes
- Maintain consistency with Chrome's native context menu design

## Technical Requirements

### Functional Requirements

1. **Context Menu Creation**
   - Add "Speak" menu item when text is selected
   - Remove or disable menu item when no text is selected
   - Handle menu item click events to trigger TTS

2. **State Management**
   - Enable/disable menu based on selection state
   - Clear menu state on tab changes and page navigation
   - Synchronize menu state with selection detection

3. **User Experience**
   - Provide clear, recognizable menu text and icon
   - Show appropriate loading/feedback states
   - Handle menu dismissal gracefully

### Non-Functional Requirements

1. **Performance**
   - Menu state updates should be instantaneous
   - No delay in context menu appearance
   - Minimal memory footprint for menu management

2. **Accessibility**
   - Menu item should be keyboard accessible
   - Proper ARIA labels and descriptions
   - Compatible with screen readers

## Implementation Steps

### Step 1: Context Menu Setup in Background Script

```javascript
// background.js - Context Menu Management
class ContextMenuManager {
  constructor(selectionManager) {
    this.selectionManager = selectionManager;
    this.menuId = 'tts-speak';
    this.isMenuCreated = false;
    
    this.init();
  }

  init() {
    // Create context menu when extension loads
    chrome.runtime.onStartup.addListener(() => this.createContextMenu());
    chrome.runtime.onInstalled.addListener(() => this.createContextMenu());
    
    // Listen for context menu clicks
    chrome.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));
    
    // Listen for selection changes to update menu state
    chrome.runtime.onMessage.addListener(this.handleSelectionMessage.bind(this));
    
    // Create menu immediately
    this.createContextMenu();
  }

  createContextMenu() {
    // Remove existing menu if present
    if (this.isMenuCreated) {
      chrome.contextMenus.removeAll(() => {
        this.createMenu();
      });
    } else {
      this.createMenu();
    }
  }

  createMenu() {
    chrome.contextMenus.create({
      id: this.menuId,
      title: 'Speak',
      contexts: ['selection'],
      enabled: false, // Initially disabled
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        this.isMenuCreated = true;
        console.log('TTS context menu created');
      }
    });
  }

  handleMenuClick(info, tab) {
    if (info.menuItemId === this.menuId) {
      this.triggerTTS(info, tab);
    }
  }

  async triggerTTS(info, tab) {
    try {
      // Get current selection from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SELECTION'
      });

      if (response && response.hasSelection) {
        const textToSpeak = response.text || info.selectionText;
        
        // Trigger TTS (will be implemented in feature 2.3)
        await this.startTTS(textToSpeak, tab);
        
        // Provide user feedback
        this.showTTSFeedback(tab, 'started');
        
      } else {
        console.warn('No text selected for TTS');
        this.showTTSFeedback(tab, 'no-selection');
      }
    } catch (error) {
      console.error('Error triggering TTS:', error);
      this.showTTSFeedback(tab, 'error');
    }
  }

  async startTTS(text, tab) {
    // Send message to start TTS (feature 2.3 implementation)
    return chrome.runtime.sendMessage({
      type: 'START_TTS',
      data: {
        text: text,
        tabId: tab.id,
        timestamp: Date.now()
      }
    });
  }

  showTTSFeedback(tab, status) {
    // Send feedback to content script for user notification
    chrome.tabs.sendMessage(tab.id, {
      type: 'TTS_FEEDBACK',
      data: { status: status }
    }).catch(error => {
      console.log('Could not send feedback to tab:', error);
    });
  }

  handleSelectionMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'SELECTION_CHANGED':
        this.updateMenuState(true);
        break;
        
      case 'SELECTION_CLEARED':
        this.updateMenuState(false);
        break;
    }
  }

  updateMenuState(hasSelection) {
    if (this.isMenuCreated) {
      chrome.contextMenus.update(this.menuId, {
        enabled: hasSelection
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error updating context menu:', chrome.runtime.lastError);
        }
      });
    }
  }

  // Clean up method
  destroy() {
    if (this.isMenuCreated) {
      chrome.contextMenus.removeAll();
      this.isMenuCreated = false;
    }
  }
}

// Initialize context menu manager with selection manager
const contextMenuManager = new ContextMenuManager(selectionManager);
```

### Step 2: Enhanced Content Script for Menu Feedback

```javascript
// content-script.js - Additional methods for context menu feedback
class TextSelectionHandler {
  // ... existing code from feature 2.1 ...

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
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  handleTTSFeedback(feedbackData) {
    const { status } = feedbackData;
    
    switch (status) {
      case 'started':
        this.showUserFeedback('TTS Started', 'success');
        break;
        
      case 'no-selection':
        this.showUserFeedback('No text selected', 'warning');
        break;
        
      case 'error':
        this.showUserFeedback('TTS Error', 'error');
        break;
    }
  }

  showUserFeedback(message, type) {
    // Create a temporary notification element
    const notification = this.createNotificationElement(message, type);
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('tts-notification-show');
    }, 10);
    
    // Hide and remove notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove('tts-notification-show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  createNotificationElement(message, type) {
    const notification = document.createElement('div');
    notification.className = `tts-notification tts-notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 2147483647;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;
    
    return notification;
  }

  getNotificationColor(type) {
    const colors = {
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3'
    };
    return colors[type] || colors.info;
  }
}

// Add CSS for notifications
const notificationCSS = `
  .tts-notification-show {
    transform: translateX(0) !important;
  }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);
```

### Step 3: Context Menu Icon and Styling

```javascript
// background.js - Enhanced context menu with icon
class ContextMenuManager {
  // ... existing code ...

  createMenu() {
    chrome.contextMenus.create({
      id: this.menuId,
      title: 'Speak',
      contexts: ['selection'],
      enabled: false,
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
      // Add visual elements for better UX
      type: 'normal',
      visible: true
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        this.isMenuCreated = true;
        console.log('TTS context menu created');
        
        // Set initial state based on current selection
        this.syncMenuWithCurrentState();
      }
    });
  }

  async syncMenuWithCurrentState() {
    try {
      // Get active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (activeTab) {
        // Check if there's a current selection
        chrome.tabs.sendMessage(activeTab.id, { type: 'GET_SELECTION' })
          .then(response => {
            if (response && response.hasSelection) {
              this.updateMenuState(true);
            }
          })
          .catch(error => {
            console.log('Could not sync menu state:', error);
          });
      }
    } catch (error) {
      console.error('Error syncing menu state:', error);
    }
  }

  // Enhanced menu state management
  updateMenuState(hasSelection) {
    if (!this.isMenuCreated) return;

    const menuProperties = {
      enabled: hasSelection,
      title: hasSelection ? 'Speak' : 'Speak (select text first)'
    };

    chrome.contextMenus.update(this.menuId, menuProperties, () => {
      if (chrome.runtime.lastError) {
        console.error('Error updating context menu:', chrome.runtime.lastError);
      } else {
        console.log('Context menu updated:', hasSelection ? 'enabled' : 'disabled');
      }
    });
  }
}
```

### Step 4: Error Handling and Edge Cases

```javascript
// Enhanced error handling for context menu
class ContextMenuManager {
  // ... existing code ...

  async triggerTTS(info, tab) {
    try {
      // Validate tab and selection
      if (!tab || !tab.id) {
        throw new Error('Invalid tab information');
      }

      // Validate selection exists
      if (!info.selectionText && !this.selectionManager.hasSelection()) {
        throw new Error('No text selected');
      }

      // Get fresh selection data
      const response = await this.getSelectionFromTab(tab.id);
      
      if (!response || !response.hasSelection) {
        throw new Error('Selection no longer available');
      }

      const textToSpeak = response.text || info.selectionText;
      
      // Validate text content
      if (!this.isValidTextForTTS(textToSpeak)) {
        throw new Error('Selected text is not suitable for TTS');
      }

      // Start TTS with error handling
      await this.startTTSWithRetry(textToSpeak, tab);
      
      this.showTTSFeedback(tab, 'started');
      
    } catch (error) {
      console.error('TTS trigger error:', error);
      this.handleTTSError(error, tab);
    }
  }

  async getSelectionFromTab(tabId, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'GET_SELECTION'
        });
        return response;
      } catch (error) {
        if (i === retries) {
          throw new Error('Could not communicate with tab');
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  isValidTextForTTS(text) {
    if (!text || typeof text !== 'string') return false;
    
    const cleanText = text.trim();
    if (cleanText.length === 0) return false;
    if (cleanText.length > 10000) return false; // Reasonable limit
    
    // Check for readable content
    const readableChars = cleanText.replace(/[^\w\s]/g, '').length;
    return readableChars > 0;
  }

  async startTTSWithRetry(text, tab, retries = 1) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.startTTS(text, tab);
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  handleTTSError(error, tab) {
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case 'no-selection':
        this.showTTSFeedback(tab, 'no-selection');
        break;
      case 'invalid-text':
        this.showTTSFeedback(tab, 'invalid-text');
        break;
      case 'communication-error':
        this.showTTSFeedback(tab, 'communication-error');
        break;
      default:
        this.showTTSFeedback(tab, 'error');
    }
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('no text selected') || message.includes('selection no longer available')) {
      return 'no-selection';
    }
    if (message.includes('not suitable for tts') || message.includes('invalid text')) {
      return 'invalid-text';
    }
    if (message.includes('communicate with tab') || message.includes('invalid tab')) {
      return 'communication-error';
    }
    
    return 'unknown';
  }
}
```

## Testing Criteria

### Unit Tests

1. **Context Menu Creation Tests**
   ```javascript
   describe('Context Menu Creation', () => {
     test('should create context menu on extension start', async () => {
       const manager = new ContextMenuManager(mockSelectionManager);
       await manager.init();
       
       expect(chrome.contextMenus.create).toHaveBeenCalledWith(
         expect.objectContaining({
           id: 'tts-speak',
           title: 'Speak',
           contexts: ['selection']
         }),
         expect.any(Function)
       );
     });

     test('should handle menu creation errors gracefully', async () => {
       chrome.contextMenus.create.mockImplementation((props, callback) => {
         chrome.runtime.lastError = { message: 'Test error' };
         callback();
       });
       
       const manager = new ContextMenuManager(mockSelectionManager);
       await manager.init();
       
       // Should not throw, should log error
       expect(console.error).toHaveBeenCalled();
     });
   });
   ```

2. **Menu State Management Tests**
   ```javascript
   describe('Menu State Management', () => {
     test('should enable menu when text is selected', () => {
       const manager = new ContextMenuManager(mockSelectionManager);
       manager.updateMenuState(true);
       
       expect(chrome.contextMenus.update).toHaveBeenCalledWith(
         'tts-speak',
         { enabled: true },
         expect.any(Function)
       );
     });

     test('should disable menu when no text is selected', () => {
       const manager = new ContextMenuManager(mockSelectionManager);
       manager.updateMenuState(false);
       
       expect(chrome.contextMenus.update).toHaveBeenCalledWith(
         'tts-speak',
         { enabled: false },
         expect.any(Function)
       );
     });
   });
   ```

### Integration Tests

1. **Menu-Selection Integration**
   ```javascript
   test('should sync menu state with selection changes', async () => {
     // Simulate text selection
     await simulateTextSelection('Hello world');
     
     // Verify menu is enabled
     expect(chrome.contextMenus.update).toHaveBeenCalledWith(
       'tts-speak',
       expect.objectContaining({ enabled: true }),
       expect.any(Function)
     );
   });
   ```

2. **Cross-Tab State Management**
   ```javascript
   test('should clear menu state when switching tabs', async () => {
     // Set up selection in first tab
     await simulateTextSelection('Hello world');
     
     // Simulate tab switch
     await simulateTabSwitch();
     
     // Verify menu is disabled
     expect(chrome.contextMenus.update).toHaveBeenCalledWith(
       'tts-speak',
       expect.objectContaining({ enabled: false }),
       expect.any(Function)
     );
   });
   ```

### Manual Testing Scenarios

1. **Basic Context Menu Tests**
   - Right-click without selecting text (menu should be disabled)
   - Select text and right-click (menu should show "Speak" option)
   - Click "Speak" menu item (should trigger TTS feedback)
   - Test on different types of text (paragraphs, headings, links)

2. **State Management Tests**
   - Select text, switch tabs, return (menu state should reset)
   - Select text, refresh page (menu state should reset)
   - Select text on one tab, switch to another tab without selection

3. **Error Handling Tests**
   - Trigger menu on tab with no content script
   - Trigger menu after selection is cleared
   - Test with very long text selections

## Success Metrics

### Technical Metrics

1. **Reliability**: 99%+ success rate in menu state synchronization
2. **Performance**: <100ms delay in menu state updates
3. **Error Handling**: Graceful degradation in all error scenarios

### User Experience Metrics

1. **Accessibility**: Menu accessible via keyboard navigation
2. **Feedback**: Clear user feedback for all menu actions
3. **Consistency**: Menu behavior matches Chrome UI patterns

## Dependencies

### Internal Dependencies
- Feature 2.1 (Simple Text Selection) - Required for selection state
- Chrome contextMenus API
- Chrome tabs API for cross-tab communication

### External Dependencies
- None (uses only native Chrome APIs)

## Risks and Mitigation

### Technical Risks

1. **Context Menu API Limitations**
   - Risk: Chrome may limit context menu customization
   - Mitigation: Use standard Chrome context menu patterns

2. **State Synchronization Issues**
   - Risk: Menu state may get out of sync with selection state
   - Mitigation: Implement robust state management and recovery

3. **Performance Impact**
   - Risk: Frequent menu updates may impact performance
   - Mitigation: Debounce menu updates and optimize API calls

### User Experience Risks

1. **Menu Clutter**
   - Risk: Adding to already crowded context menus
   - Mitigation: Clean, minimal menu item design

2. **Accidental Activation**
   - Risk: Users accidentally triggering TTS
   - Mitigation: Clear menu labeling and feedback

## Future Enhancements

1. **Submenu Options**
   - Voice selection submenu
   - Speed/pitch adjustment options
   - Language selection

2. **Smart Menu Positioning**
   - Context-aware menu placement
   - Keyboard shortcuts display

3. **Advanced Feedback**
   - Visual selection highlighting
   - Progress indicators for long text

## Acceptance Criteria

- [ ] Context menu appears only when text is selected
- [ ] Menu item is clearly labeled and accessible
- [ ] Menu state properly synchronizes with selection changes
- [ ] Error handling prevents extension crashes
- [ ] User feedback is provided for all menu actions
- [ ] Menu integrates seamlessly with Chrome's native context menu
- [ ] Performance impact is negligible
- [ ] Cross-tab state management works correctly