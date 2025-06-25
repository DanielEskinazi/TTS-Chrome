# Feature 7.2: Multi-Tab Synchronization & Floating Mini Player

## Overview

Implement a floating mini player interface and multi-tab synchronization system that allows users to control TTS playback from any tab. The mini player provides persistent, unobtrusive controls that float above page content, while the synchronization system ensures consistent playback state across all browser tabs.

## Objectives

- Create a draggable floating mini player with essential controls
- Implement cross-tab state synchronization for unified playback control
- Add per-domain position memory for mini player
- Provide auto-hide functionality with hover reveal
- Enable control of playback from any tab, not just the origin
- Implement visual playback indicators across all tabs

## Technical Requirements

### Functional Requirements

1. **Floating Mini Player**
   - Draggable with smooth movement
   - Resizable (compact/expanded modes)
   - Essential controls: play/pause, stop, speed, volume
   - Progress indicator
   - Current text preview (truncated)
   - Semi-transparent with hover effects
   - Z-index management to stay on top

2. **Position Management**
   - Save position per domain
   - Intelligent initial placement (avoid important content)
   - Boundary detection (keep on screen)
   - Snap-to-edge functionality
   - Reset position option

3. **Auto-Hide Behavior**
   - Hide after 5 seconds of inactivity
   - Show on hover near last position
   - Show on playback state change
   - Fade in/out animations
   - User preference for always visible

4. **Multi-Tab Synchronization**
   - Real-time state sync across tabs
   - Single source of truth (background script)
   - Conflict resolution for simultaneous actions
   - Tab focus detection
   - Resource cleanup on tab close

5. **Visual States**
   - Playing animation
   - Paused state
   - Loading indicator
   - Error state
   - Queue indicator

### Non-Functional Requirements

1. **Performance**
   - Drag operations at 60fps
   - State sync latency < 50ms
   - Minimal CPU usage when hidden
   - Memory efficient across many tabs

2. **Compatibility**
   - Works on all websites
   - Handles iframe contexts
   - Respects fullscreen mode
   - Mobile responsive design

3. **Accessibility**
   - Keyboard controls for mini player
   - Screen reader support
   - High contrast mode
   - Focus management

## Implementation

### 1. Floating Mini Player Component

```typescript
// src/content/FloatingMiniPlayer.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '../hooks/useDraggable';
import { useAutoHide } from '../hooks/useAutoHide';
import { SyncManager } from '../services/SyncManager';
import { PlaybackState } from '../types';

interface MiniPlayerProps {
  initialPosition?: { x: number; y: number };
  domain: string;
}

export function FloatingMiniPlayer({ initialPosition, domain }: MiniPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentText: '',
    progress: 0,
    speed: 1.0,
    volume: 1.0,
    queueLength: 0,
  });

  const playerRef = useRef<HTMLDivElement>(null);
  const syncManager = SyncManager.getInstance();

  // Draggable functionality
  const { position, isDragging, handleMouseDown } = useDraggable({
    initialPosition: initialPosition || { x: window.innerWidth - 250, y: 100 },
    elementRef: playerRef,
    onDragEnd: (finalPosition) => {
      savePosition(finalPosition);
    },
    boundaries: {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    },
    snapToEdge: true,
    snapThreshold: 50,
  });

  // Auto-hide functionality
  const { isVisible, showTemporarily, setAlwaysVisible } = useAutoHide({
    delay: 5000,
    showOnHover: true,
    hoverRadius: 100,
  });

  // State synchronization
  useEffect(() => {
    const handleStateUpdate = (state: PlaybackState) => {
      setPlaybackState(state);
      if (state.isPlaying || state.isPaused) {
        showTemporarily();
      }
    };

    syncManager.subscribe('playback-state', handleStateUpdate);
    syncManager.requestSync();

    return () => {
      syncManager.unsubscribe('playback-state', handleStateUpdate);
    };
  }, []);

  // Position persistence
  const savePosition = useCallback(async (pos: { x: number; y: number }) => {
    try {
      const positions = await chrome.storage.local.get('miniPlayerPositions') || {};
      positions[domain] = pos;
      await chrome.storage.local.set({ miniPlayerPositions: positions });
    } catch (error) {
      console.error('Failed to save position:', error);
    }
  }, [domain]);

  // Control handlers
  const handlePlayPause = () => {
    if (playbackState.isPlaying) {
      syncManager.sendCommand('pause');
    } else if (playbackState.isPaused) {
      syncManager.sendCommand('resume');
    } else {
      syncManager.sendCommand('play');
    }
  };

  const handleStop = () => {
    syncManager.sendCommand('stop');
  };

  const handleSpeedChange = (speed: number) => {
    syncManager.sendCommand('setSpeed', { speed });
  };

  const handleVolumeChange = (volume: number) => {
    syncManager.sendCommand('setVolume', { volume });
  };

  const handleSkipForward = () => {
    syncManager.sendCommand('skipForward');
  };

  const handleSkipBackward = () => {
    syncManager.sendCommand('skipBackward');
  };

  // UI helpers
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Render nothing if not visible and not playing
  if (!isVisible && !playbackState.isPlaying && !playbackState.isPaused) {
    return null;
  }

  const playerContent = (
    <div
      ref={playerRef}
      className={`floating-mini-player ${isExpanded ? 'expanded' : 'compact'} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: isDragging ? 'none' : 'opacity 0.3s ease-in-out',
        zIndex: 2147483647, // Maximum z-index
      }}
    >
      <div className="player-header" onMouseDown={handleMouseDown}>
        <div className="drag-handle">⋮⋮</div>
        <div className="player-title">
          {playbackState.isPlaying ? '▶️' : playbackState.isPaused ? '⏸️' : '⏹️'}
          TTS Player
        </div>
        <button
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      <div className="player-content">
        {/* Compact View */}
        {!isExpanded && (
          <div className="compact-controls">
            <button onClick={handlePlayPause} className="play-pause-btn">
              {playbackState.isPlaying ? '⏸️' : '▶️'}
            </button>
            <button onClick={handleStop} className="stop-btn">⏹️</button>
            <span className="speed-indicator">{playbackState.speed}x</span>
            <div className="progress-mini">
              <div 
                className="progress-fill" 
                style={{ width: `${playbackState.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div className="expanded-controls">
            <div className="current-text">
              {truncateText(playbackState.currentText, 100)}
            </div>

            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${playbackState.progress}%` }}
                />
              </div>
              <div className="time-display">
                {formatTime(playbackState.currentTime || 0)} / 
                {formatTime(playbackState.totalTime || 0)}
              </div>
            </div>

            <div className="control-buttons">
              <button onClick={handleSkipBackward} title="Skip Backward">⏮️</button>
              <button onClick={handlePlayPause} className="play-pause-main">
                {playbackState.isPlaying ? '⏸️' : '▶️'}
              </button>
              <button onClick={handleStop} title="Stop">⏹️</button>
              <button onClick={handleSkipForward} title="Skip Forward">⏭️</button>
            </div>

            <div className="sliders">
              <div className="speed-control">
                <label>Speed:</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={playbackState.speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                />
                <span>{playbackState.speed}x</span>
              </div>

              <div className="volume-control">
                <label>Volume:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={playbackState.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                />
                <span>{Math.round(playbackState.volume * 100)}%</span>
              </div>
            </div>

            {playbackState.queueLength > 0 && (
              <div className="queue-indicator">
                Queue: {playbackState.queuePosition || 1} / {playbackState.queueLength}
              </div>
            )}

            <div className="player-options">
              <label>
                <input
                  type="checkbox"
                  checked={!useAutoHide}
                  onChange={(e) => setAlwaysVisible(e.target.checked)}
                />
                Always visible
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Portal to render at document root
  return createPortal(playerContent, document.body);
}

// Inject styles
const styles = `
.floating-mini-player {
  background: rgba(32, 33, 36, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  user-select: none;
  min-width: 200px;
}

.floating-mini-player.compact {
  width: 200px;
}

.floating-mini-player.expanded {
  width: 320px;
}

.floating-mini-player.dragging {
  cursor: grabbing !important;
  opacity: 0.8;
}

.player-header {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: grab;
}

.drag-handle {
  margin-right: 8px;
  opacity: 0.5;
}

.player-title {
  flex: 1;
  font-weight: 500;
}

.expand-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.expand-toggle:hover {
  opacity: 1;
}

.player-content {
  padding: 8px;
}

.compact-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.play-pause-btn,
.stop-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.1s;
}

.play-pause-btn:active,
.stop-btn:active {
  transform: scale(0.9);
}

.speed-indicator {
  font-size: 12px;
  opacity: 0.7;
}

.progress-mini {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.expanded-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-text {
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.9;
  max-height: 60px;
  overflow: hidden;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.time-display {
  font-size: 12px;
  opacity: 0.7;
  text-align: center;
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.control-buttons button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  transition: transform 0.1s;
}

.play-pause-main {
  font-size: 32px !important;
}

.control-buttons button:active {
  transform: scale(0.9);
}

.sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.speed-control,
.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed-control label,
.volume-control label {
  width: 50px;
  font-size: 12px;
  opacity: 0.7;
}

.speed-control input,
.volume-control input {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
}

.speed-control input::-webkit-slider-thumb,
.volume-control input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.speed-control span,
.volume-control span {
  width: 40px;
  text-align: right;
  font-size: 12px;
}

.queue-indicator {
  font-size: 12px;
  text-align: center;
  opacity: 0.7;
  padding: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.player-options {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.player-options input[type="checkbox"] {
  margin-right: 6px;
}

/* Hover effects */
.floating-mini-player:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

/* Animation for visibility changes */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}
`;

// Inject styles on load
if (!document.getElementById('floating-mini-player-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'floating-mini-player-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
```

### 2. Cross-Tab Sync Manager

```typescript
// src/services/SyncManager.ts
import { EventEmitter } from 'events';

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
  progress: number;
  speed: number;
  volume: number;
  queueLength: number;
  queuePosition?: number;
  currentTime?: number;
  totalTime?: number;
  error?: string;
}

export interface SyncMessage {
  type: 'state-update' | 'command' | 'request-sync' | 'tab-closed';
  tabId: number;
  timestamp: number;
  data?: any;
}

export class SyncManager extends EventEmitter {
  private static instance: SyncManager;
  private tabId: number;
  private port: chrome.runtime.Port | null = null;
  private state: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentText: '',
    progress: 0,
    speed: 1.0,
    volume: 1.0,
    queueLength: 0,
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  constructor() {
    super();
    this.tabId = Date.now(); // Unique identifier for this tab
    this.connect();
    this.setupEventListeners();
  }

  private connect(): void {
    try {
      this.port = chrome.runtime.connect({ name: 'tts-sync' });
      
      this.port.onMessage.addListener(this.handleMessage.bind(this));
      
      this.port.onDisconnect.addListener(() => {
        this.handleDisconnect();
      });

      // Register this tab
      this.port.postMessage({
        type: 'register-tab',
        tabId: this.tabId,
      });

      // Request current state
      this.requestSync();
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      
    } catch (error) {
      console.error('Failed to connect to sync service:', error);
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(): void {
    this.port = null;
    this.emit('disconnected');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection-failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'state-update':
        this.updateState(message.data);
        break;
      
      case 'command':
        this.handleCommand(message.data);
        break;
      
      case 'request-sync':
        // Another tab is requesting state
        if (this.isActiveTab()) {
          this.broadcastState();
        }
        break;
      
      case 'tab-closed':
        this.handleTabClosed(message.tabId);
        break;
    }
  }

  private updateState(newState: Partial<PlaybackState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    // Emit specific events for state changes
    if (oldState.isPlaying !== this.state.isPlaying) {
      this.emit('playing-changed', this.state.isPlaying);
    }
    
    if (oldState.progress !== this.state.progress) {
      this.emit('progress-changed', this.state.progress);
    }
    
    // Always emit general state update
    this.emit('playback-state', this.state);
  }

  private handleCommand(command: any): void {
    // Commands are handled by the active tab's content script
    if (this.isActiveTab()) {
      this.emit('command', command);
    }
  }

  private handleTabClosed(closedTabId: number): void {
    // If the closed tab was playing, we might need to take over
    this.emit('tab-closed', closedTabId);
  }

  private isActiveTab(): boolean {
    // Determine if this is the active tab
    // Could be based on focus, most recent activity, etc.
    return document.hasFocus();
  }

  // Public methods
  subscribe(event: string, handler: Function): void {
    this.on(event, handler);
  }

  unsubscribe(event: string, handler: Function): void {
    this.off(event, handler);
  }

  sendCommand(command: string, data?: any): void {
    if (!this.port) {
      console.error('Not connected to sync service');
      return;
    }

    this.port.postMessage({
      type: 'command',
      tabId: this.tabId,
      timestamp: Date.now(),
      data: { command, ...data },
    });
  }

  broadcastState(): void {
    if (!this.port) return;

    this.port.postMessage({
      type: 'state-update',
      tabId: this.tabId,
      timestamp: Date.now(),
      data: this.state,
    });
  }

  requestSync(): void {
    if (!this.port) return;

    this.port.postMessage({
      type: 'request-sync',
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  updateLocalState(updates: Partial<PlaybackState>): void {
    this.updateState(updates);
    this.broadcastState();
  }

  getState(): PlaybackState {
    return { ...this.state };
  }

  dispose(): void {
    if (this.port) {
      this.port.postMessage({
        type: 'unregister-tab',
        tabId: this.tabId,
      });
      this.port.disconnect();
    }
    this.removeAllListeners();
  }

  private setupEventListeners(): void {
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.requestSync();
      }
    });

    // Listen for before unload
    window.addEventListener('beforeunload', () => {
      this.dispose();
    });
  }
}
```

### 3. Background Sync Service

```typescript
// src/background/SyncService.ts
export class SyncService {
  private connections: Map<number, chrome.runtime.Port> = new Map();
  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentText: '',
    progress: 0,
    speed: 1.0,
    volume: 1.0,
    queueLength: 0,
  };
  private activeTabId: number | null = null;

  constructor() {
    this.setupConnectionHandler();
    this.setupTTSListeners();
  }

  private setupConnectionHandler(): void {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== 'tts-sync') return;

      port.onMessage.addListener((message) => {
        this.handlePortMessage(port, message);
      });

      port.onDisconnect.addListener(() => {
        this.handlePortDisconnect(port);
      });
    });
  }

  private handlePortMessage(port: chrome.runtime.Port, message: SyncMessage): void {
    switch (message.type) {
      case 'register-tab':
        this.connections.set(message.tabId, port);
        // Send current state to new tab
        port.postMessage({
          type: 'state-update',
          tabId: -1, // From background
          timestamp: Date.now(),
          data: this.playbackState,
        });
        break;

      case 'unregister-tab':
        this.connections.delete(message.tabId);
        if (this.activeTabId === message.tabId) {
          this.selectNewActiveTab();
        }
        break;

      case 'state-update':
        // Update central state and broadcast to all tabs
        this.playbackState = { ...this.playbackState, ...message.data };
        this.broadcastToAllTabs(message);
        break;

      case 'command':
        // Forward command to TTS controller
        this.handleTTSCommand(message.data);
        break;

      case 'request-sync':
        // Send current state to requesting tab
        port.postMessage({
          type: 'state-update',
          tabId: -1,
          timestamp: Date.now(),
          data: this.playbackState,
        });
        break;
    }
  }

  private handlePortDisconnect(port: chrome.runtime.Port): void {
    // Find and remove disconnected tab
    for (const [tabId, tabPort] of this.connections.entries()) {
      if (tabPort === port) {
        this.connections.delete(tabId);
        this.broadcastToAllTabs({
          type: 'tab-closed',
          tabId,
          timestamp: Date.now(),
        });
        
        if (this.activeTabId === tabId) {
          this.selectNewActiveTab();
        }
        break;
      }
    }
  }

  private broadcastToAllTabs(message: SyncMessage, excludeTabId?: number): void {
    for (const [tabId, port] of this.connections.entries()) {
      if (tabId !== excludeTabId) {
        try {
          port.postMessage(message);
        } catch (error) {
          // Port might be disconnected, clean up
          this.connections.delete(tabId);
        }
      }
    }
  }

  private selectNewActiveTab(): void {
    // Select the most recently active tab
    if (this.connections.size > 0) {
      const tabIds = Array.from(this.connections.keys());
      this.activeTabId = tabIds[tabIds.length - 1];
    } else {
      this.activeTabId = null;
    }
  }

  private handleTTSCommand(command: any): void {
    // Forward to TTS controller
    chrome.runtime.sendMessage({
      type: 'TTS_COMMAND',
      command: command.command,
      data: command,
    });
  }

  private setupTTSListeners(): void {
    // Listen for TTS state updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TTS_STATE_UPDATE') {
        this.playbackState = { ...this.playbackState, ...message.state };
        this.broadcastToAllTabs({
          type: 'state-update',
          tabId: -1,
          timestamp: Date.now(),
          data: this.playbackState,
        });
      }
    });
  }

  // Public methods for TTS controller integration
  updatePlaybackState(updates: Partial<PlaybackState>): void {
    this.playbackState = { ...this.playbackState, ...updates };
    this.broadcastToAllTabs({
      type: 'state-update',
      tabId: -1,
      timestamp: Date.now(),
      data: this.playbackState,
    });
  }

  getActiveConnections(): number {
    return this.connections.size;
  }

  isAnyTabPlaying(): boolean {
    return this.playbackState.isPlaying;
  }
}
```

### 4. Draggable Hook

```typescript
// src/hooks/useDraggable.ts
import { useState, useRef, useEffect, useCallback } from 'react';

interface DraggableOptions {
  initialPosition: { x: number; y: number };
  elementRef: React.RefObject<HTMLElement>;
  onDragEnd?: (position: { x: number; y: number }) => void;
  boundaries?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  snapToEdge?: boolean;
  snapThreshold?: number;
}

export function useDraggable({
  initialPosition,
  elementRef,
  onDragEnd,
  boundaries,
  snapToEdge = false,
  snapThreshold = 50,
}: DraggableOptions) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const elementStart = useRef({ x: 0, y: 0 });

  const constrainPosition = useCallback((pos: { x: number; y: number }) => {
    if (!boundaries || !elementRef.current) return pos;

    const rect = elementRef.current.getBoundingClientRect();
    const constrained = { ...pos };

    // Apply boundaries
    constrained.x = Math.max(boundaries.left, 
      Math.min(boundaries.right - rect.width, constrained.x));
    constrained.y = Math.max(boundaries.top, 
      Math.min(boundaries.bottom - rect.height, constrained.y));

    // Snap to edge if enabled
    if (snapToEdge) {
      if (constrained.x < snapThreshold) {
        constrained.x = boundaries.left;
      } else if (constrained.x > boundaries.right - rect.width - snapThreshold) {
        constrained.x = boundaries.right - rect.width;
      }

      if (constrained.y < snapThreshold) {
        constrained.y = boundaries.top;
      } else if (constrained.y > boundaries.bottom - rect.height - snapThreshold) {
        constrained.y = boundaries.bottom - rect.height;
      }
    }

    return constrained;
  }, [boundaries, snapToEdge, snapThreshold, elementRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    const newPosition = {
      x: elementStart.current.x + deltaX,
      y: elementStart.current.y + deltaY,
    };

    const constrained = constrainPosition(newPosition);
    setPosition(constrained);
  }, [isDragging, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd(position);
    }
  }, [isDragging, position, onDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    elementStart.current = position;
  }, [position]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (boundaries) {
        const constrained = constrainPosition(position);
        if (constrained.x !== position.x || constrained.y !== position.y) {
          setPosition(constrained);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, boundaries, constrainPosition]);

  return {
    position,
    isDragging,
    handleMouseDown,
  };
}
```

## Testing

### Integration Tests

```typescript
// src/__tests__/FloatingMiniPlayer.test.tsx
describe('FloatingMiniPlayer', () => {
  let mockSyncManager: jest.Mocked<SyncManager>;

  beforeEach(() => {
    mockSyncManager = {
      getInstance: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      sendCommand: jest.fn(),
      requestSync: jest.fn(),
      getState: jest.fn(() => ({
        isPlaying: false,
        isPaused: false,
        currentText: '',
        progress: 0,
        speed: 1.0,
        volume: 1.0,
        queueLength: 0,
      })),
    };
  });

  test('should render mini player in compact mode by default', () => {
    const { container } = render(
      <FloatingMiniPlayer domain="example.com" />
    );
    
    const player = container.querySelector('.floating-mini-player');
    expect(player).toHaveClass('compact');
  });

  test('should expand when expand button clicked', () => {
    const { container } = render(
      <FloatingMiniPlayer domain="example.com" />
    );
    
    const expandBtn = container.querySelector('.expand-toggle');
    fireEvent.click(expandBtn!);
    
    const player = container.querySelector('.floating-mini-player');
    expect(player).toHaveClass('expanded');
  });

  test('should be draggable', async () => {
    const { container } = render(
      <FloatingMiniPlayer domain="example.com" />
    );
    
    const header = container.querySelector('.player-header');
    
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(document);
    
    const player = container.querySelector('.floating-mini-player') as HTMLElement;
    expect(player.style.left).toBe('200px');
    expect(player.style.top).toBe('150px');
  });

  test('should sync playback state', () => {
    const { rerender } = render(
      <FloatingMiniPlayer domain="example.com" />
    );
    
    // Simulate state update from sync manager
    const stateHandler = mockSyncManager.subscribe.mock.calls[0][1];
    stateHandler({
      isPlaying: true,
      currentText: 'Test text',
      progress: 50,
    });
    
    rerender(<FloatingMiniPlayer domain="example.com" />);
    
    const progressBar = document.querySelector('.progress-fill') as HTMLElement;
    expect(progressBar.style.width).toBe('50%');
  });
});

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let mockPort: chrome.runtime.Port;

  beforeEach(() => {
    mockPort = {
      postMessage: jest.fn(),
      onMessage: { addListener: jest.fn() },
      onDisconnect: { addListener: jest.fn() },
      disconnect: jest.fn(),
    };
    
    chrome.runtime.connect = jest.fn(() => mockPort);
    syncManager = new SyncManager();
  });

  test('should connect to background service', () => {
    expect(chrome.runtime.connect).toHaveBeenCalledWith({ name: 'tts-sync' });
  });

  test('should send commands', () => {
    syncManager.sendCommand('play', { text: 'Test' });
    
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: 'command',
      tabId: expect.any(Number),
      timestamp: expect.any(Number),
      data: { command: 'play', text: 'Test' },
    });
  });

  test('should handle state updates', () => {
    const stateHandler = jest.fn();
    syncManager.subscribe('playback-state', stateHandler);
    
    // Simulate message from background
    const messageHandler = mockPort.onMessage.addListener.mock.calls[0][0];
    messageHandler({
      type: 'state-update',
      data: { isPlaying: true, progress: 75 },
    });
    
    expect(stateHandler).toHaveBeenCalledWith({
      isPlaying: true,
      isPaused: false,
      currentText: '',
      progress: 75,
      speed: 1.0,
      volume: 1.0,
      queueLength: 0,
    });
  });

  test('should handle reconnection', async () => {
    // Simulate disconnect
    const disconnectHandler = mockPort.onDisconnect.addListener.mock.calls[0][0];
    disconnectHandler();
    
    // Wait for reconnect
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    expect(chrome.runtime.connect).toHaveBeenCalledTimes(2);
  });
});
```

## Success Metrics

1. **Performance Metrics**
   - Drag operations: 60fps consistently
   - State sync latency: < 50ms
   - CPU usage when hidden: < 1%
   - Memory usage: < 10MB per tab

2. **Functionality Metrics**
   - Position persistence accuracy: 100%
   - Multi-tab sync reliability: 99.9%
   - Auto-hide timing accuracy: ±100ms
   - Control responsiveness: < 50ms

3. **User Experience Metrics**
   - Smooth dragging: No stuttering
   - Visual feedback: Immediate
   - Cross-tab consistency: 100%
   - Recovery from errors: < 2s

## Dependencies

### Internal Dependencies
- TTS Controller from Phase 2
- Storage Service from Phase 5
- Queue Manager from Phase 7.1

### External Dependencies
- React 18+ for UI components
- React Portal for rendering outside DOM hierarchy

## Risks and Mitigation

### High-Risk Items
1. **Z-index Conflicts**
   - Risk: Player hidden behind page elements
   - Mitigation: Maximum z-index, shadow DOM consideration

2. **Performance Impact**
   - Risk: Slowing down page interactions
   - Mitigation: Efficient rendering, auto-hide

### Medium-Risk Items
1. **Cross-Tab Sync Failures**
   - Risk: State inconsistencies
   - Mitigation: Reconnection logic, state validation

2. **Position Memory**
   - Risk: Player appears off-screen
   - Mitigation: Boundary validation, reset option

## Acceptance Criteria

- [ ] Mini player appears on text selection
- [ ] Drag and drop works smoothly at 60fps
- [ ] Position saves per domain
- [ ] Auto-hide works after 5 seconds
- [ ] Hover reveals hidden player
- [ ] All controls function correctly
- [ ] State syncs across all tabs
- [ ] Player stays within screen bounds
- [ ] Expand/collapse modes work
- [ ] All tests pass with >90% coverage