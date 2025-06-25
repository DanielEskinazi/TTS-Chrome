# Feature 2.1: Simple Text Selection

## Feature Overview

Implement basic text selection detection functionality that allows users to select text on web pages and trigger TTS functionality through the context menu. This forms the foundation for all subsequent TTS features.

## Objectives

- Enable reliable detection of text selection across different web page types
- Provide consistent selection behavior across various HTML elements
- Handle edge cases like empty selections and special characters
- Support both mouse and keyboard-based text selection
- Maintain selection state for context menu integration

## Technical Requirements

### Functional Requirements

1. **Text Selection Detection**
   - Detect when user selects text on any web page
   - Capture selected text content accurately
   - Handle selections across multiple HTML elements
   - Support selections within form inputs and textareas

2. **Selection State Management**
   - Store current selection text and position
   - Clear selection state when appropriate
   - Maintain selection context for menu operations

3. **Cross-Browser Compatibility**
   - Support Chrome-based browsers (primary target)
   - Handle different DOM selection APIs consistently

### Non-Functional Requirements

1. **Performance**
   - Selection detection should have minimal impact on page performance
   - Memory usage should remain low during extended browsing
   - No noticeable delay in selection feedback

2. **Reliability**
   - Handle malformed HTML gracefully
   - Work consistently across different website architectures
   - Recover from selection API errors

## Implementation Steps

### Step 1: Content Script Setup

Create the main content script that will handle selection detection:

```javascript
// content-script.js
class TextSelectionHandler {
  constructor() {
    this.currentSelection = null;
    this.selectionText = '';
    this.isSelectionActive = false;
    
    this.init();
  }

  init() {
    // Listen for selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // Listen for mouse events to detect selection completion
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Listen for keyboard events for keyboard-based selection
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    console.log('TTS Text Selection Handler initialized');
  }

  handleSelectionChange() {
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0) {
        this.currentSelection = selection;
        this.selectionText = selectedText;
        this.isSelectionActive = true;
        
        // Store selection information for context menu
        this.storeSelectionInfo(selection);
      } else {
        this.clearSelection();
      }
    } else {
      this.clearSelection();
    }
  }

  handleMouseUp(event) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      this.processSelection();
    }, 10);
  }

  handleKeyUp(event) {
    // Handle keyboard-based selection (Shift + Arrow keys, Ctrl+A, etc.)
    if (event.shiftKey || event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
        event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      setTimeout(() => {
        this.processSelection();
      }, 10);
    }
  }

  processSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      this.validateAndStoreSelection(selectedText, selection);
    }
  }

  validateAndStoreSelection(text, selection) {
    // Validate selection text
    if (this.isValidSelection(text)) {
      this.selectionText = this.cleanSelectionText(text);
      this.currentSelection = selection;
      this.isSelectionActive = true;
      
      // Notify background script of new selection
      this.notifySelectionChange();
    }
  }

  isValidSelection(text) {
    // Check if selection is valid for TTS
    if (!text || text.length === 0) return false;
    if (text.length > 5000) return false; // Reasonable limit
    
    // Check if text contains readable content (not just symbols/whitespace)
    const readableContent = text.replace(/[\s\n\r\t]/g, '');
    return readableContent.length > 0;
  }

  cleanSelectionText(text) {
    // Clean up text for TTS processing
    return text
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/[\n\r\t]/g, ' ')      // Replace line breaks with spaces
      .trim();                        // Remove leading/trailing whitespace
  }

  storeSelectionInfo(selection) {
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Store selection metadata
      this.selectionInfo = {
        text: this.selectionText,
        boundingRect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        timestamp: Date.now()
      };
    }
  }

  notifySelectionChange() {
    // Send selection info to background script
    chrome.runtime.sendMessage({
      type: 'SELECTION_CHANGED',
      data: {
        text: this.selectionText,
        hasSelection: this.isSelectionActive,
        url: window.location.href,
        title: document.title
      }
    });
  }

  clearSelection() {
    this.currentSelection = null;
    this.selectionText = '';
    this.isSelectionActive = false;
    this.selectionInfo = null;
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SELECTION_CLEARED'
    });
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
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  // Public method to get current selection
  getCurrentSelection() {
    return {
      text: this.selectionText,
      isActive: this.isSelectionActive,
      info: this.selectionInfo
    };
  }
}

// Initialize the text selection handler
const textSelectionHandler = new TextSelectionHandler();

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextSelectionHandler;
}
```

### Step 2: Background Script Integration

Update the background script to handle selection events:

```javascript
// background.js - Selection handling portion
class SelectionManager {
  constructor() {
    this.currentSelection = null;
    this.activeTab = null;
    
    this.init();
  }

  init() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Listen for tab changes to clear selection
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'SELECTION_CHANGED':
        this.updateSelection(request.data, sender.tab);
        sendResponse({ success: true });
        break;
        
      case 'SELECTION_CLEARED':
        this.clearSelection();
        sendResponse({ success: true });
        break;
        
      case 'GET_CURRENT_SELECTION':
        sendResponse({
          selection: this.currentSelection,
          tabId: this.activeTab?.id
        });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  updateSelection(selectionData, tab) {
    this.currentSelection = {
      text: selectionData.text,
      url: selectionData.url,
      title: selectionData.title,
      timestamp: Date.now()
    };
    
    this.activeTab = tab;
    
    // Update context menu state if needed
    this.updateContextMenuState();
    
    console.log('Selection updated:', this.currentSelection.text.substring(0, 50) + '...');
  }

  clearSelection() {
    this.currentSelection = null;
    this.activeTab = null;
    
    // Update context menu state
    this.updateContextMenuState();
    
    console.log('Selection cleared');
  }

  updateContextMenuState() {
    // This will be implemented in feature 2.2
    // For now, just log the state change
    const hasSelection = this.currentSelection !== null;
    console.log('Context menu state:', hasSelection ? 'enabled' : 'disabled');
  }

  handleTabChange(activeInfo) {
    // Clear selection when switching tabs
    this.clearSelection();
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Clear selection when page reloads
    if (changeInfo.status === 'loading') {
      this.clearSelection();
    }
  }

  // Public methods for other components
  hasSelection() {
    return this.currentSelection !== null;
  }

  getSelectionText() {
    return this.currentSelection ? this.currentSelection.text : '';
  }

  getSelectionInfo() {
    return this.currentSelection;
  }
}

// Initialize selection manager
const selectionManager = new SelectionManager();
```

### Step 3: Manifest Configuration

Ensure the manifest includes necessary permissions and scripts:

```json
{
  "manifest_version": 3,
  "name": "TTS Chrome Extension",
  "version": "1.0.0",
  "description": "Text-to-Speech Chrome Extension",
  
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage"
  ],
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_end"
    }
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "TTS Extension"
  }
}
```

### Step 4: Error Handling and Edge Cases

Add comprehensive error handling:

```javascript
// Error handling additions to TextSelectionHandler
class TextSelectionHandler {
  // ... existing code ...

  handleSelectionError(error, context) {
    console.error('Selection error in', context, ':', error);
    
    // Report error to background script
    chrome.runtime.sendMessage({
      type: 'SELECTION_ERROR',
      data: {
        error: error.message,
        context: context,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    });
    
    // Reset selection state
    this.clearSelection();
  }

  safeGetSelection() {
    try {
      return window.getSelection();
    } catch (error) {
      this.handleSelectionError(error, 'getSelection');
      return null;
    }
  }

  validateSelectionEnvironment() {
    // Check if we're in a valid environment for selection
    if (!window.getSelection) {
      console.warn('Selection API not available');
      return false;
    }
    
    if (!document) {
      console.warn('Document not available');
      return false;
    }
    
    return true;
  }
}
```

## Testing Criteria

### Unit Tests

1. **Selection Detection Tests**
   ```javascript
   // Test text selection detection
   describe('Text Selection Detection', () => {
     test('should detect simple text selection', () => {
       // Create mock selection
       const mockSelection = createMockSelection('Hello World');
       // Test detection logic
       expect(handler.isValidSelection('Hello World')).toBe(true);
     });

     test('should reject empty selections', () => {
       expect(handler.isValidSelection('')).toBe(false);
       expect(handler.isValidSelection('   ')).toBe(false);
     });

     test('should clean selection text properly', () => {
       const dirtyText = '  Hello\n\tWorld  \r\n  ';
       const cleanText = handler.cleanSelectionText(dirtyText);
       expect(cleanText).toBe('Hello World');
     });
   });
   ```

2. **Cross-Element Selection Tests**
   ```javascript
   test('should handle selection across multiple elements', () => {
     // Create DOM with multiple elements
     const container = document.createElement('div');
     container.innerHTML = '<p>First paragraph</p><p>Second paragraph</p>';
     document.body.appendChild(container);
     
     // Simulate cross-element selection
     // Test that text is properly captured
   });
   ```

### Integration Tests

1. **Page Load Tests**
   - Test selection functionality on various website types
   - Verify performance impact is minimal
   - Test memory usage over extended periods

2. **Browser Compatibility Tests**
   - Test on different Chromium-based browsers
   - Verify consistent behavior across browser versions

### Manual Testing Scenarios

1. **Basic Selection Tests**
   - Select text in paragraphs, headings, lists
   - Select text in form inputs and textareas
   - Select text across multiple elements
   - Test keyboard-based selection (Shift+Arrow, Ctrl+A)

2. **Edge Case Tests**
   - Select very long text (>1000 characters)
   - Select text with special characters and emojis
   - Select text in dynamically loaded content
   - Test on pages with complex CSS layouts

3. **Performance Tests**
   - Test on pages with large amounts of text
   - Monitor memory usage during extended use
   - Verify no impact on page scrolling/interaction

## Success Metrics

### Technical Metrics

1. **Accuracy**: 99%+ success rate in detecting valid text selections
2. **Performance**: <5ms delay in selection detection
3. **Memory**: <2MB additional memory usage per tab
4. **Compatibility**: Works on 95%+ of tested websites

### User Experience Metrics

1. **Responsiveness**: Immediate visual feedback on selection
2. **Reliability**: No missed selections during normal usage
3. **Consistency**: Same behavior across different page types

## Dependencies

### Internal Dependencies
- Chrome Extension APIs (runtime, tabs)
- Background script messaging system
- DOM Selection API

### External Dependencies
- None (uses only native browser APIs)

## Risks and Mitigation

### Technical Risks

1. **Selection API Inconsistencies**
   - Risk: Different browsers may handle selection events differently
   - Mitigation: Comprehensive testing and fallback mechanisms

2. **Performance Impact**
   - Risk: Selection detection could slow down page interactions
   - Mitigation: Efficient event handling and debouncing

3. **Memory Leaks**
   - Risk: Event listeners not properly cleaned up
   - Mitigation: Proper cleanup in tab/page unload events

### User Experience Risks

1. **False Positives**
   - Risk: Detecting selections when user didn't intend TTS
   - Mitigation: Clear validation rules and user feedback

2. **Missed Selections**
   - Risk: Not detecting valid text selections
   - Mitigation: Multiple detection methods and extensive testing

## Future Enhancements

1. **Smart Selection**
   - Automatic sentence/paragraph boundary detection
   - Context-aware selection expansion

2. **Visual Feedback**
   - Highlight selected text for TTS
   - Selection state indicators

3. **Advanced Filtering**
   - Skip non-readable content (code blocks, navigation)
   - Language detection for appropriate TTS voice selection

## Acceptance Criteria

- [ ] Text selection is reliably detected across different HTML elements
- [ ] Selection state is properly maintained and cleared
- [ ] Performance impact is negligible on page interactions
- [ ] Error handling prevents crashes and provides useful feedback
- [ ] Cross-browser compatibility is maintained
- [ ] Memory usage remains within acceptable limits
- [ ] Integration tests pass with 95%+ success rate