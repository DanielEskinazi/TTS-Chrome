# Feature Specification: Mini Player (Floating Controls)

**Feature ID**: feature-mini-player  
**Status**: 🔄 IN PLANNING  
**Priority**: High  
**Estimated Complexity**: Large (5-8 days)  
**Dependencies**: Basic TTS functionality, Playback controls

## 1. Feature Overview

The Mini Player is a floating control panel that provides persistent, always-accessible TTS playback controls directly on web pages. This draggable, semi-transparent overlay allows users to control text-to-speech playback without needing to open the extension popup, providing a seamless reading experience while browsing.

### Key Capabilities
- Floating panel that appears over web content
- Draggable positioning with position memory
- Auto-hide functionality with hover activation
- Essential playback controls (play/pause, stop, skip)
- Visual progress indication
- Minimal, non-intrusive design

## 2. User Stories

### Story 1: Quick Access Controls
**As a** user reading long articles  
**I want** floating controls that stay visible on the page  
**So that** I can control playback without opening the extension popup

**Acceptance Criteria:**
- Controls appear automatically when TTS starts
- Controls remain accessible while scrolling
- Can pause/resume without losing reading position

### Story 2: Customizable Positioning
**As a** user with specific reading preferences  
**I want** to position the mini player where it doesn't obstruct content  
**So that** I can read comfortably while listening

**Acceptance Criteria:**
- Can drag the mini player to any screen position
- Position is remembered per domain
- Player stays within viewport boundaries

### Story 3: Non-Intrusive Experience
**As a** user focused on content  
**I want** the mini player to auto-hide when not in use  
**So that** it doesn't distract from my reading

**Acceptance Criteria:**
- Player becomes semi-transparent after inactivity
- Full opacity on hover or interaction
- Can be manually minimized/expanded

### Story 4: Multi-Tab Consistency
**As a** user with multiple tabs open  
**I want** the mini player to show correct state per tab  
**So that** I know which tab is currently reading

**Acceptance Criteria:**
- Player shows only in tabs with active TTS
- State syncs with actual playback status
- No conflicts between multiple tabs

## 3. Technical Requirements

### 3.1 Architecture Components
```typescript
// Mini Player Components
interface MiniPlayerComponents {
  // Core UI Component
  miniPlayer: {
    render(): HTMLElement;
    show(): void;
    hide(): void;
    updateState(state: PlaybackState): void;
  };
  
  // Drag Handler
  dragHandler: {
    enable(): void;
    disable(): void;
    savePosition(position: Position): void;
    restorePosition(): Position;
  };
  
  // Auto-Hide Manager
  autoHideManager: {
    startTimer(): void;
    resetTimer(): void;
    setOpacity(level: number): void;
  };
  
  // State Synchronizer
  stateSynchronizer: {
    connect(): void;
    disconnect(): void;
    onStateChange(callback: StateCallback): void;
  };
}
```

### 3.2 Message Protocol
```typescript
// Mini Player Messages
interface MiniPlayerMessages {
  // Content → Background
  MINI_PLAYER_READY: { tabId: number };
  MINI_PLAYER_ACTION: { action: PlaybackAction; tabId: number };
  MINI_PLAYER_POSITION: { position: Position; domain: string };
  
  // Background → Content
  SHOW_MINI_PLAYER: { state: PlaybackState };
  HIDE_MINI_PLAYER: { reason: string };
  UPDATE_MINI_PLAYER: { state: PlaybackState };
}
```

### 3.3 Storage Schema
```typescript
interface MiniPlayerStorage {
  // Per-domain settings
  domainSettings: {
    [domain: string]: {
      position: { x: number; y: number };
      size: 'compact' | 'normal' | 'expanded';
      autoHide: boolean;
      opacity: number;
    };
  };
  
  // Global settings
  globalSettings: {
    enabled: boolean;
    defaultPosition: Position;
    hideDelay: number; // milliseconds
    minOpacity: number; // 0.0-1.0
  };
}
```

## 4. Implementation Details

### 4.1 Content Script Integration
```typescript
// content/mini-player.ts
class MiniPlayer {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private isDragging: boolean = false;
  private autoHideTimer: number | null = null;
  
  constructor() {
    this.createContainer();
    this.attachShadowDOM();
    this.injectStyles();
    this.setupEventListeners();
  }
  
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'tts-mini-player';
    this.container.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: auto;
      transition: opacity 0.3s ease;
    `;
  }
  
  private attachShadowDOM(): void {
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    // Isolated styles and DOM
  }
}
```

### 4.2 Drag Functionality
```typescript
class DragHandler {
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  
  enableDragging(element: HTMLElement): void {
    const handle = element.querySelector('.drag-handle');
    
    handle?.addEventListener('mousedown', (e) => {
      this.startDragging(e as MouseEvent);
    });
    
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDragging);
  }
  
  private constrainToViewport(x: number, y: number): Position {
    const rect = this.element.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    };
  }
}
```

### 4.3 Auto-Hide Behavior
```typescript
class AutoHideManager {
  private hideDelay: number = 3000; // 3 seconds
  private minOpacity: number = 0.3;
  private isHovered: boolean = false;
  
  setupAutoHide(element: HTMLElement): void {
    element.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.show();
    });
    
    element.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.startHideTimer();
    });
    
    // Reset timer on any interaction
    element.addEventListener('click', () => {
      this.resetTimer();
    });
  }
  
  private fadeOut(): void {
    if (!this.isHovered) {
      this.element.style.opacity = String(this.minOpacity);
    }
  }
}
```

### 4.4 State Synchronization
```typescript
class MiniPlayerStateSynchronizer {
  private port: chrome.runtime.Port;
  
  connect(): void {
    this.port = chrome.runtime.connect({ name: 'mini-player' });
    
    this.port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'UPDATE_PLAYBACK_STATE':
          this.updateUI(msg.state);
          break;
        case 'HIDE_PLAYER':
          this.hide();
          break;
      }
    });
  }
  
  private updateUI(state: PlaybackState): void {
    // Update button states
    this.playButton.classList.toggle('playing', state.isPlaying);
    this.pauseButton.classList.toggle('paused', state.isPaused);
    
    // Update progress
    this.progressBar.style.width = `${state.progress}%`;
    
    // Update time display
    this.timeDisplay.textContent = this.formatTime(state.currentTime);
  }
}
```

## 5. Acceptance Criteria

### 5.1 Appearance & Visibility
- [ ] Mini player appears automatically when TTS playback starts
- [ ] Player appears within 100ms of playback initiation
- [ ] Player is visible above all page content (z-index: 2147483647)
- [ ] Player maintains visibility during page scrolling
- [ ] Player hides automatically when playback completes
- [ ] Player can be manually shown/hidden via keyboard shortcut

### 5.2 Positioning & Dragging
- [ ] Player can be dragged to any position on screen
- [ ] Drag operation is smooth without lag or jitter
- [ ] Player constrains to viewport boundaries
- [ ] Position is saved immediately after drag ends
- [ ] Position persists across page reloads
- [ ] Per-domain position memory works correctly
- [ ] Default position is center-right of viewport

### 5.3 Auto-Hide Functionality
- [ ] Player fades to 30% opacity after 3 seconds of inactivity
- [ ] Hovering over player restores 100% opacity instantly
- [ ] Any interaction resets the auto-hide timer
- [ ] Auto-hide can be disabled in settings
- [ ] Opacity transition is smooth (300ms ease)
- [ ] Player remains interactive at low opacity

### 5.4 Playback Controls
- [ ] Play/Pause button toggles correctly
- [ ] Stop button halts playback and hides player
- [ ] Skip forward/backward buttons work (±10 seconds)
- [ ] Progress bar shows accurate playback position
- [ ] Time display shows current/total time
- [ ] All controls respond within 50ms

### 5.5 Visual Design
- [ ] Player has semi-transparent background (90% opacity)
- [ ] Controls use clear, recognizable icons
- [ ] Active states are visually distinct
- [ ] Player has subtle shadow for depth
- [ ] Responsive hover states on all interactive elements
- [ ] Smooth transitions for all state changes

### 5.6 Multi-Tab Behavior
- [ ] Each tab maintains independent mini player state
- [ ] Player only shows in tabs with active TTS
- [ ] No visual glitches when switching tabs
- [ ] State updates correctly when background playback changes

### 5.7 Performance
- [ ] No impact on page scroll performance
- [ ] CPU usage remains under 5% during idle
- [ ] Memory footprint under 10MB
- [ ] No memory leaks after extended use

## 6. Test Cases

### 6.1 Unit Tests

```typescript
// tests/unit/mini-player.test.ts
describe('MiniPlayer', () => {
  describe('Initialization', () => {
    it('should create shadow DOM container', () => {
      const player = new MiniPlayer();
      expect(player.shadowRoot).toBeDefined();
      expect(player.container.id).toBe('tts-mini-player');
    });
    
    it('should load saved position on init', () => {
      mockStorage.get.mockResolvedValue({
        position: { x: 100, y: 200 }
      });
      
      const player = new MiniPlayer();
      expect(player.position).toEqual({ x: 100, y: 200 });
    });
  });
  
  describe('Drag Behavior', () => {
    it('should update position during drag', () => {
      const player = new MiniPlayer();
      const dragHandle = player.getDragHandle();
      
      fireEvent.mouseDown(dragHandle, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 50, clientY: 50 });
      
      expect(player.position).toEqual({ x: 50, y: 50 });
    });
    
    it('should constrain to viewport boundaries', () => {
      const player = new MiniPlayer();
      player.setPosition({ x: -100, y: 5000 });
      
      expect(player.position.x).toBeGreaterThanOrEqual(0);
      expect(player.position.y).toBeLessThanOrEqual(window.innerHeight);
    });
  });
  
  describe('Auto-Hide', () => {
    it('should fade after inactivity timeout', async () => {
      const player = new MiniPlayer();
      player.show();
      
      await wait(3100); // 3s timeout + buffer
      
      expect(player.container.style.opacity).toBe('0.3');
    });
    
    it('should restore opacity on hover', () => {
      const player = new MiniPlayer();
      player.container.style.opacity = '0.3';
      
      fireEvent.mouseEnter(player.container);
      
      expect(player.container.style.opacity).toBe('1');
    });
  });
});
```

### 6.2 Integration Tests

```typescript
// tests/integration/mini-player-integration.test.ts
describe('Mini Player Integration', () => {
  describe('Message Handling', () => {
    it('should show player on TTS start message', async () => {
      const { content, background } = await setupExtension();
      
      await background.startTTS('Test text');
      
      const player = await content.waitForElement('#tts-mini-player');
      expect(player).toBeVisible();
    });
    
    it('should update state from background messages', async () => {
      const { content, background } = await setupExtension();
      
      await background.startTTS('Test text');
      await background.pauseTTS();
      
      const pauseButton = await content.waitForElement('.pause-button.active');
      expect(pauseButton).toBeTruthy();
    });
  });
  
  describe('Storage Persistence', () => {
    it('should save position per domain', async () => {
      const { content } = await setupExtension();
      
      await content.navigateTo('https://example.com');
      const player = new MiniPlayer();
      player.setPosition({ x: 100, y: 100 });
      
      await content.reload();
      
      const newPlayer = new MiniPlayer();
      expect(newPlayer.position).toEqual({ x: 100, y: 100 });
    });
  });
});
```

## 7. UI/UX Specifications

### 7.1 Visual Design

```css
/* Mini Player Styles */
.mini-player {
  /* Container */
  width: 320px;
  height: 80px;
  background: rgba(20, 20, 20, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Layout */
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
}

/* Drag Handle */
.drag-handle {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: move;
}

/* Control Buttons */
.control-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* Progress Bar */
.progress-container {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}
```

### 7.2 Layout Specifications

```
┌─────────────────────────────────────────┐
│  ═══  (drag handle)                     │
│ ┌───┐ ┌───┐ ┌───┐ ░░░░░░░░░░░ 2:35/5:20│
│ │ ▶ │ │ ⏸ │ │ ⏹ │ ████░░░░░░░         │
│ └───┘ └───┘ └───┘ (progress)           │
└─────────────────────────────────────────┘

Dimensions:
- Container: 320x80px (normal), 240x60px (compact)
- Buttons: 36x36px with 12px spacing
- Progress bar: flex-grow, 4px height
- Border radius: 12px container, 50% buttons
- Padding: 12px all sides
```

### 7.3 Interaction States

1. **Default State**
   - 90% background opacity
   - White icons at 80% opacity
   - Subtle shadow

2. **Hover State**
   - 100% background opacity
   - White icons at 100% opacity
   - Enhanced shadow
   - Scale buttons to 110%

3. **Active/Pressed State**
   - Scale to 95%
   - Darker background
   - Instant feedback

4. **Dragging State**
   - 100% opacity
   - Cursor: grabbing
   - Slight scale increase (102%)

5. **Auto-Hidden State**
   - 30% total opacity
   - All interactions still functional
   - Smooth 300ms transition

### 7.4 Responsive Behavior

- **Viewport Constraints**: Always fully visible
- **Window Resize**: Maintains relative position
- **Scroll**: Position: fixed (unaffected)
- **Zoom**: Scales appropriately with page zoom

## 8. Error Handling

### 8.1 Error Scenarios

1. **Shadow DOM Conflicts**
   ```typescript
   try {
     this.shadowRoot = container.attachShadow({ mode: 'closed' });
   } catch (error) {
     console.warn('Shadow DOM not supported, falling back to isolated styles');
     this.useFallbackStyles();
   }
   ```

2. **Storage Access Failures**
   ```typescript
   async savePosition(position: Position): Promise<void> {
     try {
       await chrome.storage.local.set({ miniPlayerPosition: position });
     } catch (error) {
       console.error('Failed to save position:', error);
       // Continue without persistence
     }
   }
   ```

3. **Message Port Disconnection**
   ```typescript
   this.port.onDisconnect.addListener(() => {
     console.warn('Mini player disconnected from background');
     this.attemptReconnect();
   });
   ```

4. **DOM Injection Failures**
   ```typescript
   injectPlayer(): boolean {
     if (this.isFrameset() || this.isPDF()) {
       console.info('Mini player not supported on this page type');
       return false;
     }
     
     try {
       document.body.appendChild(this.container);
       return true;
     } catch (error) {
       console.error('Failed to inject mini player:', error);
       return false;
     }
   }
   ```

### 8.2 Recovery Strategies

- **Automatic Reconnection**: Attempt to reconnect to background service every 5 seconds
- **Graceful Degradation**: Hide player if critical features fail
- **State Recovery**: Restore last known good state from storage
- **User Notification**: Show subtle error indicator without disrupting content

### 8.3 Edge Cases

1. **CSP Restrictions**: Detect and handle Content Security Policy blocks
2. **IFrame Context**: Disable in iframes to avoid conflicts
3. **Full-Screen Mode**: Hide player during full-screen video
4. **Print Mode**: Hide player in print media CSS
5. **Extension Updates**: Gracefully handle mid-session updates

## 9. Dependencies

### 9.1 Required Features
- **Basic TTS Engine**: Core text-to-speech functionality must be implemented
- **Message Passing System**: Chrome runtime messaging infrastructure
- **Storage API**: For position and preference persistence
- **Content Script Infrastructure**: Ability to inject scripts into web pages

### 9.2 External Dependencies
- **Chrome APIs**:
  - `chrome.runtime` for messaging
  - `chrome.storage` for persistence
  - `chrome.tabs` for tab management
  
### 9.3 Development Dependencies
- **Build System**: Webpack configuration for shadow DOM styles
- **Testing**: Jest with shadow DOM testing utilities
- **Types**: Chrome extension TypeScript definitions

### 9.4 Optional Enhancements
- **Keyboard Shortcuts**: Global hotkeys for player control
- **Context Menu**: Right-click options for player
- **Animation Library**: For smooth transitions (optional)

---

## Appendix A: State Diagram

```
┌─────────────┐
│   Hidden    │◄─────────────┐
└──────┬──────┘              │
       │ TTS Start           │ TTS Stop
       ▼                     │
┌─────────────┐              │
│   Visible   │──────────────┘
└──────┬──────┘
       │ 3s timeout
       ▼
┌─────────────┐
│ Semi-Hidden │◄────┐
└──────┬──────┘     │ Mouse Leave
       │            │ + 3s
       │ Mouse      │
       │ Enter      │
       ▼            │
┌─────────────┐     │
│   Hovered   │─────┘
└─────────────┘
```

## Appendix B: Message Flow

```
Content Script          Background Service          Popup
     │                         │                      │
     │──MINI_PLAYER_READY──────►                     │
     │                         │                      │
     │◄──SHOW_MINI_PLAYER──────│◄──TTS_STARTED───────│
     │                         │                      │
     │──PLAYBACK_ACTION────────►                     │
     │                         │                      │
     │◄──UPDATE_STATE──────────│                      │
     │                         │                      │
     │──SAVE_POSITION──────────►                     │
     │                         │                      │
```