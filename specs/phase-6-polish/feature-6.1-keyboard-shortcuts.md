# Feature 6.1: Keyboard Shortcuts System

## Overview

Implement a comprehensive keyboard shortcuts system for the TTS Chrome Extension, providing quick access to all major functions without mouse interaction. This includes customizable shortcuts, conflict detection, and per-domain overrides.

## Objectives

- Create customizable keyboard shortcuts for all TTS functions
- Implement conflict detection with existing shortcuts
- Support modifier key combinations
- Enable per-domain shortcut overrides
- Provide visual feedback for shortcut actions

## Technical Requirements

### Functional Requirements

1. **Default Shortcuts**
   - `Alt+R`: Read selection
   - `Alt+Space`: Play/Pause
   - `Alt+S`: Stop
   - `Alt+↑/↓`: Speed up/down (0.1 increments)
   - `Alt+←/→`: Skip backward/forward by sentence
   - `Alt+1/2/3`: Quick switch to favorite voices
   - `Alt+Q`: Add to queue
   - `Alt+Shift+Q`: Clear queue

2. **Shortcut Customization**
   - User-definable key combinations
   - Support for Ctrl, Alt, Shift, Cmd (Mac)
   - Single key shortcuts in specific contexts
   - Reset to defaults option

3. **Conflict Detection**
   - Check against browser shortcuts
   - Check against system shortcuts
   - Check against website shortcuts
   - Visual warning for conflicts

4. **Per-Domain Overrides**
   - Different shortcuts for different websites
   - Temporary disable option
   - Import/export shortcut profiles

### Non-Functional Requirements

1. **Performance**
   - Shortcut response time < 50ms
   - No impact on page performance
   - Efficient event listener management

2. **Accessibility**
   - Screen reader announcements
   - Visual feedback for actions
   - Alternative input methods

3. **Compatibility**
   - Work across all websites
   - Handle iframe contexts
   - Support international keyboards

## Implementation

### 1. Shortcut Manager Service

```typescript
// src/services/ShortcutManager.ts
import { StorageService } from './StorageService';

export interface Shortcut {
  id: string;
  action: string;
  keys: string[];
  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  enabled: boolean;
  description: string;
}

export interface ShortcutProfile {
  name: string;
  shortcuts: Shortcut[];
  isDefault: boolean;
}

export class ShortcutManager {
  private static instance: ShortcutManager;
  private shortcuts: Map<string, Shortcut> = new Map();
  private listeners: Map<string, (event: KeyboardEvent) => void> = new Map();
  private storageService: StorageService;
  private conflictChecker: ConflictChecker;

  static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  constructor() {
    this.storageService = StorageService.getInstance();
    this.conflictChecker = new ConflictChecker();
    this.initializeDefaultShortcuts();
    this.loadUserShortcuts();
  }

  private initializeDefaultShortcuts(): void {
    const defaults: Shortcut[] = [
      {
        id: 'read-selection',
        action: 'READ_SELECTION',
        keys: ['r'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Read selected text',
      },
      {
        id: 'play-pause',
        action: 'PLAY_PAUSE',
        keys: [' '],
        modifiers: { alt: true },
        enabled: true,
        description: 'Play/Pause reading',
      },
      {
        id: 'stop',
        action: 'STOP',
        keys: ['s'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Stop reading',
      },
      {
        id: 'speed-up',
        action: 'SPEED_UP',
        keys: ['ArrowUp'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Increase reading speed',
      },
      {
        id: 'speed-down',
        action: 'SPEED_DOWN',
        keys: ['ArrowDown'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Decrease reading speed',
      },
      {
        id: 'skip-forward',
        action: 'SKIP_FORWARD',
        keys: ['ArrowRight'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Skip forward one sentence',
      },
      {
        id: 'skip-backward',
        action: 'SKIP_BACKWARD',
        keys: ['ArrowLeft'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Skip backward one sentence',
      },
      {
        id: 'voice-1',
        action: 'VOICE_1',
        keys: ['1'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Switch to favorite voice 1',
      },
      {
        id: 'voice-2',
        action: 'VOICE_2',
        keys: ['2'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Switch to favorite voice 2',
      },
      {
        id: 'voice-3',
        action: 'VOICE_3',
        keys: ['3'],
        modifiers: { alt: true },
        enabled: true,
        description: 'Switch to favorite voice 3',
      },
    ];

    defaults.forEach(shortcut => {
      this.shortcuts.set(shortcut.id, shortcut);
    });
  }

  async loadUserShortcuts(): Promise<void> {
    try {
      const userShortcuts = await this.storageService.getShortcuts();
      if (userShortcuts) {
        userShortcuts.forEach(shortcut => {
          this.shortcuts.set(shortcut.id, shortcut);
        });
      }
    } catch (error) {
      console.error('Failed to load user shortcuts:', error);
    }
  }

  registerShortcut(shortcut: Shortcut): boolean {
    // Check for conflicts
    const conflicts = this.conflictChecker.checkConflicts(shortcut);
    if (conflicts.length > 0) {
      console.warn('Shortcut conflicts detected:', conflicts);
      return false;
    }

    // Register the shortcut
    this.shortcuts.set(shortcut.id, shortcut);
    this.saveShortcuts();
    
    // Update listeners
    this.updateListeners();
    
    return true;
  }

  unregisterShortcut(shortcutId: string): void {
    this.shortcuts.delete(shortcutId);
    this.saveShortcuts();
    this.updateListeners();
  }

  updateShortcut(shortcutId: string, updates: Partial<Shortcut>): boolean {
    const existing = this.shortcuts.get(shortcutId);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    
    // Check for conflicts if keys changed
    if (updates.keys || updates.modifiers) {
      const conflicts = this.conflictChecker.checkConflicts(updated);
      if (conflicts.length > 0) {
        console.warn('Shortcut conflicts detected:', conflicts);
        return false;
      }
    }

    this.shortcuts.set(shortcutId, updated);
    this.saveShortcuts();
    this.updateListeners();
    
    return true;
  }

  private updateListeners(): void {
    // Remove existing listeners
    this.listeners.forEach((listener, key) => {
      document.removeEventListener('keydown', listener);
    });
    this.listeners.clear();

    // Add new listeners
    this.shortcuts.forEach(shortcut => {
      if (!shortcut.enabled) return;

      const listener = (event: KeyboardEvent) => {
        if (this.matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          this.executeAction(shortcut.action);
        }
      };

      const key = this.getShortcutKey(shortcut);
      this.listeners.set(key, listener);
      document.addEventListener('keydown', listener);
    });
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
    // Check modifiers
    if (!!shortcut.modifiers.ctrl !== event.ctrlKey) return false;
    if (!!shortcut.modifiers.alt !== event.altKey) return false;
    if (!!shortcut.modifiers.shift !== event.shiftKey) return false;
    if (!!shortcut.modifiers.meta !== event.metaKey) return false;

    // Check key
    return shortcut.keys.includes(event.key) || shortcut.keys.includes(event.code);
  }

  private getShortcutKey(shortcut: Shortcut): string {
    const parts = [];
    if (shortcut.modifiers.ctrl) parts.push('Ctrl');
    if (shortcut.modifiers.alt) parts.push('Alt');
    if (shortcut.modifiers.shift) parts.push('Shift');
    if (shortcut.modifiers.meta) parts.push('Cmd');
    parts.push(shortcut.keys[0]);
    return parts.join('+');
  }

  private async executeAction(action: string): Promise<void> {
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'SHORTCUT_ACTION',
      action,
      timestamp: Date.now(),
    });

    // Visual feedback
    this.showActionFeedback(action);
  }

  private showActionFeedback(action: string): void {
    const feedback = document.createElement('div');
    feedback.className = 'tts-shortcut-feedback';
    feedback.textContent = this.getActionLabel(action);
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      animation: fadeInOut 2s ease-in-out;
    `;

    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 2000);
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      READ_SELECTION: 'Reading selection',
      PLAY_PAUSE: 'Play/Pause',
      STOP: 'Stopped',
      SPEED_UP: 'Speed increased',
      SPEED_DOWN: 'Speed decreased',
      SKIP_FORWARD: 'Skipped forward',
      SKIP_BACKWARD: 'Skipped backward',
      VOICE_1: 'Switched to voice 1',
      VOICE_2: 'Switched to voice 2',
      VOICE_3: 'Switched to voice 3',
    };
    return labels[action] || action;
  }

  private async saveShortcuts(): Promise<void> {
    const shortcuts = Array.from(this.shortcuts.values());
    await this.storageService.setShortcuts(shortcuts);
  }

  getShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcut(id: string): Shortcut | undefined {
    return this.shortcuts.get(id);
  }

  resetToDefaults(): void {
    this.shortcuts.clear();
    this.initializeDefaultShortcuts();
    this.saveShortcuts();
    this.updateListeners();
  }

  // Domain-specific overrides
  async setDomainShortcuts(domain: string, shortcuts: Shortcut[]): Promise<void> {
    await this.storageService.setDomainShortcuts(domain, shortcuts);
    // Reload if on this domain
    if (window.location.hostname === domain) {
      this.loadDomainShortcuts(domain);
    }
  }

  private async loadDomainShortcuts(domain: string): Promise<void> {
    const domainShortcuts = await this.storageService.getDomainShortcuts(domain);
    if (domainShortcuts) {
      domainShortcuts.forEach(shortcut => {
        this.shortcuts.set(shortcut.id, shortcut);
      });
      this.updateListeners();
    }
  }

  // Cleanup
  dispose(): void {
    this.listeners.forEach((listener) => {
      document.removeEventListener('keydown', listener);
    });
    this.listeners.clear();
    this.shortcuts.clear();
  }
}

// Conflict Checker
class ConflictChecker {
  private browserShortcuts: Set<string> = new Set([
    'Ctrl+T', 'Ctrl+W', 'Ctrl+N', 'Ctrl+Shift+N',
    'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Alt+Tab',
    'F5', 'Ctrl+R', 'Ctrl+F', 'Ctrl+G',
    'Ctrl+D', 'Ctrl+L', 'Ctrl+K',
  ]);

  checkConflicts(shortcut: Shortcut): string[] {
    const conflicts: string[] = [];
    const key = this.getShortcutString(shortcut);

    // Check browser shortcuts
    if (this.browserShortcuts.has(key)) {
      conflicts.push(`Browser shortcut: ${key}`);
    }

    // Check for duplicate shortcuts
    const manager = ShortcutManager.getInstance();
    const existing = manager.getShortcuts().find(s => 
      s.id !== shortcut.id && 
      this.getShortcutString(s) === key
    );
    if (existing) {
      conflicts.push(`Duplicate shortcut: ${existing.description}`);
    }

    return conflicts;
  }

  private getShortcutString(shortcut: Shortcut): string {
    const parts = [];
    if (shortcut.modifiers.ctrl) parts.push('Ctrl');
    if (shortcut.modifiers.alt) parts.push('Alt');
    if (shortcut.modifiers.shift) parts.push('Shift');
    if (shortcut.modifiers.meta) parts.push('Cmd');
    parts.push(shortcut.keys[0]);
    return parts.join('+');
  }
}
```

### 2. Shortcuts Settings Component

```typescript
// src/components/ShortcutsSettings.tsx
import React, { useState, useEffect } from 'react';
import { ShortcutManager, Shortcut } from '../services/ShortcutManager';

export function ShortcutsSettings() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recording, setRecording] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});

  const shortcutManager = ShortcutManager.getInstance();

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = () => {
    const allShortcuts = shortcutManager.getShortcuts();
    setShortcuts(allShortcuts);
  };

  const handleRecord = (shortcutId: string) => {
    setRecording(shortcutId);
    setEditingId(shortcutId);
  };

  const handleKeyDown = (event: React.KeyboardEvent, shortcutId: string) => {
    if (recording !== shortcutId) return;

    event.preventDefault();
    event.stopPropagation();

    const shortcut = shortcuts.find(s => s.id === shortcutId);
    if (!shortcut) return;

    const updated: Shortcut = {
      ...shortcut,
      keys: [event.key],
      modifiers: {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      },
    };

    const success = shortcutManager.updateShortcut(shortcutId, updated);
    if (success) {
      loadShortcuts();
      setRecording(null);
      setEditingId(null);
      setConflicts({});
    } else {
      // Show conflicts
      const checker = new ConflictChecker();
      const conflictList = checker.checkConflicts(updated);
      setConflicts({ ...conflicts, [shortcutId]: conflictList });
    }
  };

  const handleToggle = (shortcutId: string, enabled: boolean) => {
    shortcutManager.updateShortcut(shortcutId, { enabled });
    loadShortcuts();
  };

  const handleReset = () => {
    if (confirm('Reset all shortcuts to defaults?')) {
      shortcutManager.resetToDefaults();
      loadShortcuts();
      setConflicts({});
    }
  };

  const formatShortcut = (shortcut: Shortcut): string => {
    const parts = [];
    if (shortcut.modifiers.ctrl) parts.push('Ctrl');
    if (shortcut.modifiers.alt) parts.push('Alt');
    if (shortcut.modifiers.shift) parts.push('Shift');
    if (shortcut.modifiers.meta) parts.push('Cmd');
    parts.push(shortcut.keys[0]);
    return parts.join(' + ');
  };

  return (
    <div className="shortcuts-settings">
      <div className="shortcuts-header">
        <h2>Keyboard Shortcuts</h2>
        <button onClick={handleReset} className="reset-button">
          Reset to Defaults
        </button>
      </div>

      <div className="shortcuts-list">
        {shortcuts.map(shortcut => (
          <div key={shortcut.id} className="shortcut-item">
            <div className="shortcut-info">
              <label className="shortcut-label">
                <input
                  type="checkbox"
                  checked={shortcut.enabled}
                  onChange={(e) => handleToggle(shortcut.id, e.target.checked)}
                />
                <span className="shortcut-description">{shortcut.description}</span>
              </label>
            </div>

            <div className="shortcut-key">
              {editingId === shortcut.id ? (
                <input
                  type="text"
                  className="shortcut-input"
                  value={recording === shortcut.id ? 'Press keys...' : formatShortcut(shortcut)}
                  onKeyDown={(e) => handleKeyDown(e, shortcut.id)}
                  onBlur={() => {
                    setEditingId(null);
                    setRecording(null);
                  }}
                  autoFocus
                  readOnly
                />
              ) : (
                <button
                  className="shortcut-button"
                  onClick={() => handleRecord(shortcut.id)}
                  disabled={!shortcut.enabled}
                >
                  {formatShortcut(shortcut)}
                </button>
              )}
            </div>

            {conflicts[shortcut.id] && (
              <div className="shortcut-conflicts">
                {conflicts[shortcut.id].map((conflict, index) => (
                  <div key={index} className="conflict-item">
                    ⚠️ {conflict}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="shortcuts-help">
        <h3>Tips:</h3>
        <ul>
          <li>Click on a shortcut to change it</li>
          <li>Use modifier keys (Ctrl, Alt, Shift) for better compatibility</li>
          <li>Some shortcuts may conflict with browser or system shortcuts</li>
          <li>Disable shortcuts you don't use to avoid conflicts</li>
        </ul>
      </div>
    </div>
  );
}
```

### 3. Content Script Integration

```typescript
// src/content/shortcut-handler.ts
import { ShortcutManager } from '../services/ShortcutManager';

export class ContentShortcutHandler {
  private shortcutManager: ShortcutManager;
  private enabled: boolean = true;

  constructor() {
    this.shortcutManager = ShortcutManager.getInstance();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load domain-specific shortcuts
    const domain = window.location.hostname;
    await this.shortcutManager.loadDomainShortcuts(domain);

    // Check if shortcuts are enabled for this domain
    const domainSettings = await chrome.storage.local.get(`shortcuts_${domain}`);
    this.enabled = domainSettings[`shortcuts_${domain}`]?.enabled ?? true;

    if (this.enabled) {
      this.setupListeners();
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_SHORTCUTS') {
        this.enabled = message.enabled;
        if (this.enabled) {
          this.setupListeners();
        } else {
          this.removeListeners();
        }
      }
    });
  }

  private setupListeners(): void {
    // Shortcuts are already registered in ShortcutManager
    // Add any content-specific handling here

    // Handle input focus to disable shortcuts
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('focusout', this.handleFocusOut);
  }

  private removeListeners(): void {
    this.shortcutManager.dispose();
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
  }

  private handleFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (this.isInputElement(target)) {
      // Temporarily disable shortcuts when in input fields
      this.shortcutManager.setEnabled(false);
    }
  };

  private handleFocusOut = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (this.isInputElement(target)) {
      // Re-enable shortcuts when leaving input fields
      this.shortcutManager.setEnabled(true);
    }
  };

  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      element.contentEditable === 'true'
    );
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentShortcutHandler();
  });
} else {
  new ContentShortcutHandler();
}
```

## Testing

### Unit Tests

```typescript
// src/services/__tests__/ShortcutManager.test.ts
describe('ShortcutManager', () => {
  let manager: ShortcutManager;

  beforeEach(() => {
    manager = ShortcutManager.getInstance();
    manager.resetToDefaults();
  });

  test('should register custom shortcut', () => {
    const customShortcut: Shortcut = {
      id: 'custom-action',
      action: 'CUSTOM_ACTION',
      keys: ['x'],
      modifiers: { ctrl: true, shift: true },
      enabled: true,
      description: 'Custom action',
    };

    const success = manager.registerShortcut(customShortcut);
    expect(success).toBe(true);
    expect(manager.getShortcut('custom-action')).toEqual(customShortcut);
  });

  test('should detect conflicts', () => {
    const conflictingShortcut: Shortcut = {
      id: 'conflict',
      action: 'CONFLICT',
      keys: ['t'],
      modifiers: { ctrl: true },
      enabled: true,
      description: 'Conflicting shortcut',
    };

    const success = manager.registerShortcut(conflictingShortcut);
    expect(success).toBe(false);
  });

  test('should handle modifier combinations', () => {
    const shortcut = manager.getShortcut('read-selection');
    const event = new KeyboardEvent('keydown', {
      key: 'r',
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
    });

    expect(manager.matchesShortcut(event, shortcut!)).toBe(true);
  });
});
```

## Success Metrics

1. **Performance Metrics**
   - Shortcut response time: < 50ms
   - Zero performance impact on page load
   - Memory usage: < 1MB for shortcut system

2. **Usability Metrics**
   - 95% of shortcuts work without conflicts
   - Custom shortcuts saved successfully: 100%
   - Visual feedback shown: 100% of actions

3. **Compatibility Metrics**
   - Works on 100% of tested websites
   - International keyboard support: 100%
   - Cross-platform consistency: 95%

## Dependencies

### Internal Dependencies
- Storage Service from Phase 5
- TTS Controller from Phase 2
- Message passing system

### External Dependencies
- Chrome Extension Keyboard API
- Chrome Storage API

## Risks and Mitigation

### High-Risk Items
1. **Browser Shortcut Conflicts**
   - Risk: Overriding critical browser shortcuts
   - Mitigation: Comprehensive conflict detection

2. **Website Compatibility**
   - Risk: Shortcuts not working on some sites
   - Mitigation: Robust event handling and fallbacks

### Medium-Risk Items
1. **International Keyboards**
   - Risk: Key codes differ across layouts
   - Mitigation: Use both key and code properties

2. **Performance Impact**
   - Risk: Too many event listeners
   - Mitigation: Efficient listener management

## Acceptance Criteria

- [ ] All default shortcuts work as specified
- [ ] Users can customize any shortcut
- [ ] Conflict detection prevents issues
- [ ] Visual feedback appears for all actions
- [ ] Shortcuts can be disabled per-domain
- [ ] Settings persist across sessions
- [ ] Performance impact is negligible
- [ ] Works on all major websites
- [ ] Accessibility compliant
- [ ] All tests pass with >90% coverage