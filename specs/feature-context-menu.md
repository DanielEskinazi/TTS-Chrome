# Context Menu Integration Feature Specification

**Status: 🔄 IN PROGRESS** | **Feature ID: CTX-001** | **Priority: High**

## 1. Feature Overview

The Context Menu Integration feature enables users to quickly access text-to-speech functionality through right-click context menus. This feature provides seamless integration with the browser's native right-click menu, offering immediate TTS access without requiring users to open the extension popup or use keyboard shortcuts.

### Key Capabilities
- Right-click on selected text to access "Read This" option
- Voice selection submenu for quick voice switching
- Dynamic menu state based on TTS status
- Smart menu item enabling/disabling based on context
- Integration with existing TTS queue system

## 2. User Stories

### User Story 1: Quick Text Reading
**As a** user browsing web content  
**I want to** right-click on selected text and choose "Read This"  
**So that** I can quickly listen to the selected content without opening the extension popup

**Acceptance Criteria:**
- Context menu appears when text is selected
- "Read This" option is visible and clickable
- Selected text starts playing immediately upon click
- Visual feedback indicates reading has started

### User Story 2: Voice Selection from Context Menu
**As a** power user who frequently switches voices  
**I want to** select a different voice directly from the context menu  
**So that** I can choose the most appropriate voice for different content types without navigating to settings

**Acceptance Criteria:**
- "Read This with..." submenu shows available voices
- Recently used voices appear at the top
- Voice selection persists for future readings
- Submenu shows current active voice with a checkmark

### User Story 3: Continuous Reading Control
**As a** user listening to content  
**I want to** control playback through the context menu  
**So that** I can pause, resume, or stop reading without switching to the popup

**Acceptance Criteria:**
- Context menu shows "Pause Reading" when TTS is active
- "Resume Reading" appears when paused
- "Stop Reading" option always available during playback
- Menu items update dynamically based on TTS state

## 3. Technical Requirements

### 3.1 Chrome API Requirements
- **chrome.contextMenus**: Create and manage context menu items
- **chrome.runtime**: Message passing between content and background scripts
- **chrome.storage**: Store voice preferences and recent selections
- **chrome.tts**: Text-to-speech synthesis control

### 3.2 Component Architecture
```typescript
// Background Service Worker
- ContextMenuManager: Handles menu creation, updates, and click events
- MenuStateController: Manages dynamic menu states
- VoiceMenuBuilder: Builds voice selection submenu

// Content Script
- TextSelectionDetector: Monitors text selection events
- ContextMenuTrigger: Sends selection data to background

// Common
- ContextMenuTypes: TypeScript interfaces for menu items
- MenuMessageProtocol: Message passing definitions
```

### 3.3 Menu Structure
```
Right-click on selected text:
├── Read This
├── Read This with... ▶
│   ├── Recently Used
│   │   ├── ✓ Google US English (current)
│   │   ├── Microsoft David
│   │   └── Google UK English Female
│   ├── ─────────────
│   ├── All Voices
│   │   ├── English ▶
│   │   ├── Spanish ▶
│   │   └── [Other Languages] ▶
│   └── Voice Settings...
├── ─────────────
├── Pause Reading (when playing)
├── Resume Reading (when paused)
└── Stop Reading (when active)
```

## 4. Implementation Details

### 4.1 Context Menu Creation
```typescript
interface ContextMenuItem {
  id: string;
  title: string;
  contexts: chrome.contextMenus.ContextType[];
  parentId?: string;
  enabled?: boolean;
  checked?: boolean;
  onclick?: (info: chrome.contextMenus.OnClickData) => void;
}

class ContextMenuManager {
  private menuItems: Map<string, ContextMenuItem>;
  
  async createMenus(): Promise<void> {
    // Create main "Read This" item
    await this.createMenuItem({
      id: 'read-selection',
      title: 'Read This',
      contexts: ['selection']
    });
    
    // Create voice selection submenu
    await this.createVoiceSubmenu();
    
    // Create playback control items
    await this.createPlaybackControls();
  }
  
  async updateMenuState(state: TTSState): Promise<void> {
    // Dynamically update menu items based on TTS state
  }
}
```

### 4.2 Selection Detection
```typescript
class TextSelectionDetector {
  private selectionTimeout: number | null = null;
  
  initialize(): void {
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('selectionchange', this.handleSelectionChange);
  }
  
  private handleSelectionChange = (): void => {
    // Debounce selection changes
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }
    
    this.selectionTimeout = setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        this.notifyBackgroundOfSelection(selection.toString());
      }
    }, 200);
  };
}
```

### 4.3 Voice Menu Management
```typescript
interface VoiceMenuItem {
  voiceId: string;
  displayName: string;
  language: string;
  isRecent: boolean;
  isCurrent: boolean;
}

class VoiceMenuBuilder {
  async buildVoiceMenu(voices: Voice[], recentVoices: string[]): Promise<void> {
    // Group voices by language
    const voicesByLanguage = this.groupVoicesByLanguage(voices);
    
    // Add recent voices section
    await this.createRecentVoicesSection(recentVoices);
    
    // Add separator
    await this.createSeparator();
    
    // Add all voices by language
    await this.createLanguageSubmenus(voicesByLanguage);
    
    // Add voice settings link
    await this.createSettingsLink();
  }
}
```

### 4.4 Message Protocol
```typescript
// Message types for context menu operations
enum ContextMenuMessageType {
  SELECTION_DETECTED = 'SELECTION_DETECTED',
  READ_SELECTION = 'READ_SELECTION',
  CHANGE_VOICE = 'CHANGE_VOICE',
  CONTROL_PLAYBACK = 'CONTROL_PLAYBACK',
  UPDATE_MENU_STATE = 'UPDATE_MENU_STATE'
}

interface ContextMenuMessage {
  type: ContextMenuMessageType;
  payload: {
    text?: string;
    voiceId?: string;
    action?: 'play' | 'pause' | 'resume' | 'stop';
    state?: TTSState;
  };
}
```

## 5. Acceptance Criteria

### 5.1 Basic Functionality
- [ ] Context menu appears when right-clicking on selected text
- [ ] "Read This" menu item triggers TTS for selected text
- [ ] Menu items are properly enabled/disabled based on context
- [ ] Context menu works across all web pages (respecting permissions)
- [ ] Menu items have appropriate icons for visual clarity

### 5.2 Voice Selection
- [ ] Voice submenu displays all available system voices
- [ ] Voices are organized by language with proper grouping
- [ ] Recently used voices (last 5) appear at the top
- [ ] Current voice is marked with a checkmark
- [ ] Voice selection immediately applies to current/next reading
- [ ] Voice preference is saved per domain when applicable

### 5.3 Playback Control
- [ ] "Pause Reading" appears only when TTS is actively playing
- [ ] "Resume Reading" appears only when TTS is paused
- [ ] "Stop Reading" appears whenever there's active TTS session
- [ ] Menu updates within 100ms of state changes
- [ ] Controls affect the correct TTS instance when multiple tabs exist

### 5.4 Performance
- [ ] Context menu appears within 50ms of right-click
- [ ] Voice submenu loads without noticeable delay (<100ms)
- [ ] Menu state updates don't cause flickering
- [ ] Memory usage remains stable with frequent menu usage

### 5.5 Edge Cases
- [ ] Handles empty text selection gracefully
- [ ] Works with multi-line text selections
- [ ] Handles special characters and Unicode properly
- [ ] Functions correctly in iframes (with proper permissions)
- [ ] Manages very long text selections appropriately

## 6. Test Cases

### 6.1 Unit Tests
```typescript
describe('ContextMenuManager', () => {
  test('creates basic menu structure on initialization', async () => {
    const manager = new ContextMenuManager();
    await manager.initialize();
    
    expect(chrome.contextMenus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'read-selection',
        title: 'Read This',
        contexts: ['selection']
      })
    );
  });
  
  test('updates menu state based on TTS status', async () => {
    const manager = new ContextMenuManager();
    await manager.updateMenuState({ isPlaying: true, isPaused: false });
    
    expect(chrome.contextMenus.update).toHaveBeenCalledWith(
      'pause-reading',
      { enabled: true, visible: true }
    );
  });
  
  test('handles voice selection correctly', async () => {
    const manager = new ContextMenuManager();
    const mockVoiceId = 'Google US English';
    
    await manager.handleVoiceSelection(mockVoiceId);
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      selectedVoice: mockVoiceId,
      recentVoices: expect.arrayContaining([mockVoiceId])
    });
  });
});
```

### 6.2 Integration Tests
```typescript
describe('Context Menu Integration', () => {
  test('full flow: selection to speech', async () => {
    // 1. Simulate text selection
    await page.selectText('Hello world');
    
    // 2. Right-click to open context menu
    await page.click('body', { button: 'right' });
    
    // 3. Click "Read This"
    await page.clickContextMenuItem('Read This');
    
    // 4. Verify TTS started
    const ttsState = await extension.getTTSState();
    expect(ttsState.isPlaying).toBe(true);
    expect(ttsState.currentText).toBe('Hello world');
  });
  
  test('voice switching through context menu', async () => {
    // Setup: Select text and open context menu
    await page.selectText('Test voice switching');
    await page.click('body', { button: 'right' });
    
    // Navigate to voice submenu
    await page.hoverContextMenuItem('Read This with...');
    await page.clickContextMenuItem('Microsoft David');
    
    // Verify voice changed
    const settings = await extension.getSettings();
    expect(settings.selectedVoice).toBe('Microsoft David');
  });
});
```

## 7. UI/UX Specifications

### 7.1 Visual Design
- **Icons**: Use Chrome's standard context menu icons where available
- **Checkmarks**: Unicode ✓ for selected voice indication
- **Separators**: Standard Chrome separator style between sections
- **Disabled State**: Grayed out with 50% opacity
- **Hover State**: Standard Chrome highlight behavior

### 7.2 Menu Organization
```
Primary Level:
- "Read This" - Always at top when text selected
- Separator
- Playback controls (dynamic visibility)

Voice Submenu:
- Recent voices (max 5)
- Separator  
- All voices grouped by language
- Separator
- "Voice Settings..." link
```

### 7.3 Interaction Patterns
- **Single Click**: Immediate action (start reading, pause, etc.)
- **Hover**: Opens submenus after 300ms delay
- **Keyboard**: Arrow key navigation support
- **Mouse**: Click outside dismisses menu
- **Feedback**: Audio cue on successful action

### 7.4 Responsive Behavior
- Long voice names truncated with ellipsis (max 40 chars)
- Submenu positioned to avoid screen edges
- Menu width adjusts to content (min: 200px, max: 400px)

## 8. Error Handling

### 8.1 Error Scenarios
```typescript
enum ContextMenuError {
  MENU_CREATION_FAILED = 'Failed to create context menu',
  VOICE_LOAD_FAILED = 'Failed to load voices for menu',
  SELECTION_INVALID = 'Invalid text selection',
  TTS_INIT_FAILED = 'Failed to initialize TTS',
  PERMISSION_DENIED = 'Context menu permission denied'
}

class ContextMenuErrorHandler {
  handleError(error: ContextMenuError, context?: any): void {
    switch (error) {
      case ContextMenuError.MENU_CREATION_FAILED:
        // Fallback to basic menu structure
        this.createFallbackMenu();
        break;
        
      case ContextMenuError.VOICE_LOAD_FAILED:
        // Show generic "Read This" without voice options
        this.hideVoiceSubmenu();
        break;
        
      case ContextMenuError.SELECTION_INVALID:
        // Show user-friendly message
        this.showNotification('Please select valid text to read');
        break;
        
      case ContextMenuError.TTS_INIT_FAILED:
        // Disable TTS menu items
        this.disableTTSMenuItems();
        break;
        
      case ContextMenuError.PERMISSION_DENIED:
        // Guide user to grant permissions
        this.showPermissionGuide();
        break;
    }
    
    // Log error for debugging
    console.error(`Context Menu Error: ${error}`, context);
  }
}
```

### 8.2 Recovery Strategies
- **Graceful Degradation**: Basic menu without advanced features
- **Retry Logic**: Attempt menu recreation after transient failures
- **User Notification**: Clear messages for permission issues
- **Fallback Options**: Alternative ways to access TTS functionality

### 8.3 Edge Case Handling
- **No Text Selected**: Hide or disable "Read This" option
- **No Voices Available**: Show message in submenu
- **Very Long Selection**: Truncate preview in menu item
- **Special Characters**: Properly escape for menu display
- **Iframe Context**: Check permissions before showing menu

## 9. Dependencies

### 9.1 Internal Dependencies
- **SpeechSynthesizer**: Core TTS functionality
- **StorageManager**: Voice preferences and settings
- **MessageBus**: Communication between components
- **TTSStateManager**: Current playback state
- **VoiceManager**: Available voices enumeration

### 9.2 External Dependencies
- **Chrome APIs**: contextMenus, runtime, storage, tts
- **TypeScript**: Type definitions for Chrome APIs
- **DaisyUI**: UI components for settings link

### 9.3 Permission Requirements
```json
{
  "permissions": [
    "contextMenus",
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### 9.4 Browser Compatibility
- **Minimum Chrome Version**: 88+ (for Manifest V3)
- **Context Menu API**: Full support required
- **Service Worker**: Background script environment
- **Dynamic Import**: For lazy loading voice data

---

**Last Updated**: 2025-01-02  
**Author**: TTS-Chrome Development Team  
**Review Status**: Pending Technical Review