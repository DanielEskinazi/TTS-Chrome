# Feature Specification: Keyboard Shortcuts

**Status: 🔄 IN PROGRESS** | **Assignee: TBD** | **Target Version: 2.0**

## 1. Feature Overview

The Keyboard Shortcuts feature provides users with customizable keyboard combinations to control TTS functionality without using mouse interactions. This feature enables power users to efficiently manage text-to-speech operations through global and context-specific keyboard shortcuts, with built-in conflict detection and visual feedback.

### Key Capabilities
- Global keyboard shortcuts for core TTS functions (play/pause, stop, skip)
- Customizable shortcut combinations with modifier keys
- Conflict detection with existing browser/system shortcuts
- Visual feedback for keyboard actions
- Context-aware shortcuts (different shortcuts for different page contexts)
- Accessibility compliance for keyboard-only navigation

## 2. User Stories

### Story 1: Power User Workflow
**As a** power user who frequently uses TTS while working  
**I want to** control TTS playback using keyboard shortcuts  
**So that** I can manage speech synthesis without interrupting my workflow or reaching for the mouse

**Acceptance Criteria:**
- User can play/pause TTS with a single keyboard shortcut
- User can stop TTS and clear queue with keyboard shortcut
- User can skip to next/previous sentence while reading
- Shortcuts work regardless of current focus (within Chrome)

### Story 2: Shortcut Customization
**As a** user with specific keyboard preferences  
**I want to** customize TTS keyboard shortcuts  
**So that** they don't conflict with my existing shortcuts and match my muscle memory

**Acceptance Criteria:**
- User can view all available keyboard shortcuts
- User can modify any default shortcut combination
- User receives warning if shortcut conflicts with known browser/system shortcuts
- User can reset shortcuts to defaults
- Changes take effect immediately without extension reload

### Story 3: Visual Feedback
**As a** user triggering keyboard shortcuts  
**I want to** see visual confirmation of my actions  
**So that** I know the shortcut was recognized and what action was performed

**Acceptance Criteria:**
- Brief toast notification appears when shortcut is triggered
- Visual indicator shows current TTS state change
- Feedback is non-intrusive and auto-dismisses
- Feedback can be disabled in settings

## 3. Technical Requirements

### 3.1 Chrome APIs Required
- `chrome.commands`: For registering and handling keyboard shortcuts
- `chrome.storage.sync`: For storing custom shortcut preferences
- `chrome.runtime`: For message passing between components
- `chrome.tabs`: For injecting visual feedback into active tab

### 3.2 Shortcut Architecture
```typescript
interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  defaultShortcut: string;
  currentShortcut: string;
  category: 'playback' | 'navigation' | 'selection' | 'settings';
  scope: 'global' | 'in_tab';
  enabled: boolean;
}

interface ShortcutConflict {
  shortcut: string;
  conflictType: 'browser' | 'system' | 'extension' | 'custom';
  conflictingAction: string;
  severity: 'warning' | 'error';
}
```

### 3.3 Default Shortcuts
```typescript
const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'play_pause',
    name: 'Play/Pause',
    defaultShortcut: 'Ctrl+Shift+Space',
    category: 'playback',
    scope: 'global'
  },
  {
    id: 'stop',
    name: 'Stop Reading',
    defaultShortcut: 'Ctrl+Shift+S',
    category: 'playback',
    scope: 'global'
  },
  {
    id: 'read_selection',
    name: 'Read Selected Text',
    defaultShortcut: 'Ctrl+Shift+R',
    category: 'selection',
    scope: 'in_tab'
  },
  {
    id: 'next_sentence',
    name: 'Next Sentence',
    defaultShortcut: 'Ctrl+Shift+Right',
    category: 'navigation',
    scope: 'global'
  },
  {
    id: 'previous_sentence',
    name: 'Previous Sentence',
    defaultShortcut: 'Ctrl+Shift+Left',
    category: 'navigation',
    scope: 'global'
  },
  {
    id: 'increase_speed',
    name: 'Increase Speed',
    defaultShortcut: 'Ctrl+Shift+Plus',
    category: 'playback',
    scope: 'global'
  },
  {
    id: 'decrease_speed',
    name: 'Decrease Speed',
    defaultShortcut: 'Ctrl+Shift+Minus',
    category: 'playback',
    scope: 'global'
  },
  {
    id: 'toggle_popup',
    name: 'Toggle Extension Popup',
    defaultShortcut: 'Ctrl+Shift+T',
    category: 'settings',
    scope: 'global'
  }
];
```

### 3.4 Platform Differences
- **Windows/Linux**: Use `Ctrl` as primary modifier
- **macOS**: Use `Cmd` as primary modifier (automatic Chrome conversion)
- **ChromeOS**: Special handling for Search key combinations

## 4. Implementation Details

### 4.1 Manifest Configuration
```json
{
  "commands": {
    "play_pause": {
      "suggested_key": {
        "default": "Ctrl+Shift+Space",
        "mac": "Command+Shift+Space"
      },
      "description": "Play or pause text-to-speech"
    },
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      }
    }
  },
  "permissions": ["commands"]
}
```

### 4.2 Background Service Worker Handler
```typescript
// src/background/keyboard-shortcuts.ts
class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut>;
  private conflictChecker: ConflictChecker;
  
  constructor() {
    this.initializeShortcuts();
    this.registerCommandListeners();
  }
  
  private registerCommandListeners(): void {
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
      this.sendVisualFeedback(command);
    });
  }
  
  private async handleCommand(command: string): Promise<void> {
    switch (command) {
      case 'play_pause':
        await this.togglePlayback();
        break;
      case 'stop':
        await this.stopPlayback();
        break;
      case 'read_selection':
        await this.readCurrentSelection();
        break;
      // ... other commands
    }
  }
  
  private sendVisualFeedback(command: string): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SHORTCUT_TRIGGERED',
          command,
          timestamp: Date.now()
        });
      }
    });
  }
}
```

### 4.3 Conflict Detection System
```typescript
// src/common/conflict-detector.ts
class ConflictChecker {
  private knownBrowserShortcuts: Set<string> = new Set([
    'Ctrl+T', 'Ctrl+W', 'Ctrl+Tab', 'Ctrl+Shift+Tab',
    'Ctrl+N', 'Ctrl+Shift+N', 'Ctrl+R', 'F5',
    // ... comprehensive list
  ]);
  
  checkConflict(shortcut: string): ShortcutConflict | null {
    const normalized = this.normalizeShortcut(shortcut);
    
    if (this.knownBrowserShortcuts.has(normalized)) {
      return {
        shortcut: normalized,
        conflictType: 'browser',
        conflictingAction: this.getBrowserAction(normalized),
        severity: 'error'
      };
    }
    
    // Check for other extension shortcuts
    return this.checkExtensionConflicts(normalized);
  }
  
  private normalizeShortcut(shortcut: string): string {
    // Normalize modifier key order and naming
    return shortcut
      .toLowerCase()
      .replace('cmd', 'ctrl')
      .replace('command', 'ctrl')
      .split('+')
      .sort()
      .join('+');
  }
}
```

### 4.4 Visual Feedback System
```typescript
// src/content/visual-feedback.ts
class VisualFeedback {
  private toastContainer: HTMLElement;
  private feedbackTimeout: number | null = null;
  
  showShortcutFeedback(command: string, action: string): void {
    this.clearExistingFeedback();
    
    const toast = this.createToast(command, action);
    this.toastContainer.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('tts-toast-visible');
    });
    
    // Auto-dismiss after 2 seconds
    this.feedbackTimeout = window.setTimeout(() => {
      this.dismissToast(toast);
    }, 2000);
  }
  
  private createToast(command: string, action: string): HTMLElement {
    const toast = document.createElement('div');
    toast.className = 'tts-shortcut-toast';
    toast.innerHTML = `
      <div class="tts-toast-icon">${this.getActionIcon(action)}</div>
      <div class="tts-toast-text">
        <div class="tts-toast-action">${action}</div>
        <div class="tts-toast-shortcut">${command}</div>
      </div>
    `;
    return toast;
  }
}
```

### 4.5 Options Page Shortcut Editor
```typescript
// src/options/shortcut-editor.tsx
interface ShortcutEditorProps {
  shortcut: KeyboardShortcut;
  onUpdate: (id: string, newShortcut: string) => void;
}

const ShortcutEditor: React.FC<ShortcutEditorProps> = ({ shortcut, onUpdate }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [newShortcut, setNewShortcut] = useState('');
  const [conflict, setConflict] = useState<ShortcutConflict | null>(null);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isRecording) return;
    
    e.preventDefault();
    const shortcutString = buildShortcutString(e);
    setNewShortcut(shortcutString);
    
    // Check for conflicts
    const conflictResult = conflictChecker.checkConflict(shortcutString);
    setConflict(conflictResult);
  };
  
  return (
    <div className="shortcut-editor">
      <div className="shortcut-info">
        <h4>{shortcut.name}</h4>
        <p>{shortcut.description}</p>
      </div>
      <div className="shortcut-input">
        <input
          type="text"
          value={isRecording ? newShortcut : shortcut.currentShortcut}
          onFocus={() => setIsRecording(true)}
          onBlur={() => setIsRecording(false)}
          onKeyDown={handleKeyDown}
          placeholder="Press keys..."
        />
        {conflict && (
          <div className={`conflict-warning ${conflict.severity}`}>
            ⚠️ Conflicts with {conflict.conflictingAction}
          </div>
        )}
      </div>
    </div>
  );
};
```

## 5. Acceptance Criteria

### 5.1 Core Functionality
- [ ] All default keyboard shortcuts work as specified
- [ ] Shortcuts trigger appropriate TTS actions without delay
- [ ] Shortcuts work when Chrome is focused (any tab)
- [ ] In-tab shortcuts only work when content is focused

### 5.2 Customization
- [ ] Users can view all available shortcuts in options page
- [ ] Users can modify any shortcut by recording new key combination
- [ ] Modified shortcuts persist across browser restarts
- [ ] Reset to defaults button restores original shortcuts

### 5.3 Conflict Detection
- [ ] System detects conflicts with known browser shortcuts
- [ ] System warns about conflicts with other installed extensions
- [ ] Severity levels (warning/error) are appropriately assigned
- [ ] Users cannot save shortcuts with error-level conflicts

### 5.4 Visual Feedback
- [ ] Toast notifications appear for all shortcut actions
- [ ] Toasts show action name and shortcut used
- [ ] Toasts auto-dismiss after 2 seconds
- [ ] Toasts can be disabled via settings

### 5.5 Accessibility
- [ ] All shortcuts are accessible via keyboard navigation
- [ ] Screen readers announce shortcut actions
- [ ] Visual feedback has sufficient contrast ratios
- [ ] Options page shortcut editor is fully keyboard navigable

### 5.6 Performance
- [ ] Shortcut response time < 100ms
- [ ] No performance impact on page rendering
- [ ] Visual feedback doesn't cause layout shifts

## 6. Test Cases

### 6.1 Unit Tests

```typescript
// tests/unit/keyboard-shortcuts.test.ts
describe('KeyboardShortcutManager', () => {
  it('should initialize with default shortcuts', () => {
    const manager = new KeyboardShortcutManager();
    expect(manager.getShortcuts()).toHaveLength(8);
    expect(manager.getShortcut('play_pause')).toBeDefined();
  });
  
  it('should handle play/pause command', async () => {
    const manager = new KeyboardShortcutManager();
    const spy = jest.spyOn(ttsController, 'togglePlayback');
    
    await manager.handleCommand('play_pause');
    expect(spy).toHaveBeenCalled();
  });
  
  it('should detect browser shortcut conflicts', () => {
    const checker = new ConflictChecker();
    const conflict = checker.checkConflict('Ctrl+T');
    
    expect(conflict).toBeDefined();
    expect(conflict?.conflictType).toBe('browser');
    expect(conflict?.severity).toBe('error');
  });
  
  it('should normalize shortcut strings', () => {
    const checker = new ConflictChecker();
    expect(checker.normalizeShortcut('Ctrl+Shift+A')).toBe('a+ctrl+shift');
    expect(checker.normalizeShortcut('Cmd+K')).toBe('ctrl+k');
  });
});
```

### 6.2 Integration Tests

```typescript
// tests/integration/shortcut-flow.test.ts
describe('Keyboard Shortcut Integration', () => {
  it('should trigger TTS playback via keyboard shortcut', async () => {
    await loadExtension();
    await selectText('Test text to read');
    
    // Trigger shortcut
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Space');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    
    // Verify TTS started
    const isPlaying = await getBackgroundState('isPlaying');
    expect(isPlaying).toBe(true);
    
    // Verify visual feedback appeared
    const toast = await page.$('.tts-shortcut-toast');
    expect(toast).toBeTruthy();
  });
  
  it('should update shortcuts through options page', async () => {
    await page.goto(optionsPageUrl);
    
    // Find play/pause shortcut editor
    const editor = await page.$('[data-shortcut-id="play_pause"] input');
    await editor.click();
    
    // Record new shortcut
    await page.keyboard.down('Control');
    await page.keyboard.down('Alt');
    await page.keyboard.press('P');
    await page.keyboard.up('Alt');
    await page.keyboard.up('Control');
    
    // Save and verify
    await page.click('[data-save-shortcuts]');
    const savedShortcut = await getStoredShortcut('play_pause');
    expect(savedShortcut).toBe('Ctrl+Alt+P');
  });
});
```

## 7. UI/UX Specifications

### 7.1 Visual Feedback Design
```css
.tts-shortcut-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateY(100px);
  transition: transform 0.3s ease;
  z-index: 999999;
}

.tts-toast-visible {
  transform: translateY(0);
}

.tts-toast-icon {
  font-size: 20px;
}

.tts-toast-action {
  font-weight: 600;
  font-size: 14px;
}

.tts-toast-shortcut {
  font-size: 12px;
  opacity: 0.8;
  font-family: monospace;
}
```

### 7.2 Options Page Shortcut Section
- Grouped by category (Playback, Navigation, Selection, Settings)
- Each shortcut shows: Name, Description, Current binding, Reset button
- Recording mode highlights input field with pulsing border
- Conflict warnings appear inline below input
- Save/Cancel buttons at bottom of section

### 7.3 Shortcut Display Format
- Modifier keys shown with symbols: ⌘ (Mac), Ctrl (Win/Linux)
- Plus signs between keys: "Ctrl + Shift + Space"
- Consistent capitalization for key names
- Special keys spelled out: "Space", "Enter", "Tab"

## 8. Error Handling

### 8.1 Shortcut Registration Failures
```typescript
try {
  await chrome.commands.update({
    name: commandName,
    shortcut: newShortcut
  });
} catch (error) {
  if (error.message.includes('invalid')) {
    showError('Invalid key combination. Please use valid modifier keys.');
  } else if (error.message.includes('reserved')) {
    showError('This shortcut is reserved by Chrome and cannot be used.');
  } else {
    showError('Failed to update shortcut. Please try again.');
  }
}
```

### 8.2 Runtime Errors
- Content script not injected: Fallback to popup notification
- Tab not accessible: Show error toast in extension popup
- Storage quota exceeded: Implement shortcut pruning
- Chrome commands API unavailable: Graceful degradation

### 8.3 User Input Validation
- Prevent single key shortcuts without modifiers
- Require at least one modifier key (Ctrl/Alt/Shift/Cmd)
- Block function keys (F1-F12) without modifiers
- Validate key combination syntax before saving

## 9. Dependencies

### 9.1 External Dependencies
- **Chrome Commands API**: Core keyboard shortcut functionality
- **Chrome Storage API**: Persisting custom shortcuts
- **React** (for options page): Shortcut editor component
- **DaisyUI**: Styling for options page components

### 9.2 Internal Dependencies
- **TTS Controller**: For executing playback commands
- **Message Handler**: For cross-component communication
- **Storage Manager**: For persisting preferences
- **State Manager**: For current playback state

### 9.3 Feature Dependencies
- Requires basic TTS functionality to be implemented
- Requires options page infrastructure
- Requires message passing system
- Requires visual feedback injection system

### 9.4 Platform Requirements
- Chrome 88+ (for full Commands API support)
- Manifest V3 compatibility
- Cross-platform modifier key handling