# Feature 4.2: Pause/Resume Functionality

## Feature Overview and Objectives

### Overview
Implement comprehensive pause and resume functionality for text-to-speech playback, allowing users to temporarily halt speech and continue from the exact position where they left off. This feature enhances user control and provides a more flexible TTS experience.

### Objectives
- Enable users to pause TTS playback at any point
- Resume playback from the exact pause position
- Maintain state consistency across pause/resume cycles
- Provide visual feedback for pause/resume states
- Handle edge cases like browser tab switching and system interruptions
- Support keyboard shortcuts for pause/resume operations

## Technical Requirements

### Core Requirements
- Pause TTS playback while preserving current position
- Resume playback from the exact character/word position
- Maintain progress tracking state during pause/resume
- Visual indicators for pause/resume states
- Keyboard shortcut support (spacebar for pause/resume)
- Auto-pause on browser tab inactive (optional)

### State Management Requirements
- Track pause state and pause position
- Preserve progress information during pause
- Handle multiple pause/resume cycles
- Maintain audio settings across pause/resume
- Store pause timestamp for analytics

### Browser Compatibility
- Chrome 88+ (SpeechSynthesis pause/resume API)
- Edge 88+ (Chromium-based)
- Fallback behavior for browsers without native pause support

## Implementation Steps

### Step 1: Pause/Resume State Management

```typescript
// types/pauseResume.ts
export interface PauseResumeState {
  isPaused: boolean;
  pausePosition: number; // Character position where paused
  pauseTime: number; // Timestamp when paused
  resumeTime: number; // Timestamp when resumed
  totalPausedDuration: number; // Total time spent paused
  pauseCount: number; // Number of times paused
  canResume: boolean; // Whether resume is possible
}

export interface PauseResumeActions {
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  reset: () => void;
}

export interface TTSPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentPosition: number;
  hasBeenPaused: boolean;
}
```

```typescript
// hooks/usePauseResume.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { PauseResumeState, TTSPlaybackState } from '../types/pauseResume';

export const usePauseResume = () => {
  const [pauseResumeState, setPauseResumeState] = useState<PauseResumeState>({
    isPaused: false,
    pausePosition: 0,
    pauseTime: 0,
    resumeTime: 0,
    totalPausedDuration: 0,
    pauseCount: 0,
    canResume: false,
  });

  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentPosition: 0,
    hasBeenPaused: false,
  });

  const pauseTimerRef = useRef<number | null>(null);

  // Calculate total paused duration
  const updatePausedDuration = useCallback(() => {
    if (pauseResumeState.isPaused && pauseResumeState.pauseTime > 0) {
      const currentPausedTime = Date.now() - pauseResumeState.pauseTime;
      const totalDuration = pauseResumeState.totalPausedDuration + currentPausedTime;
      
      setPauseResumeState(prev => ({
        ...prev,
        totalPausedDuration: totalDuration,
      }));
    }
  }, [pauseResumeState.isPaused, pauseResumeState.pauseTime, pauseResumeState.totalPausedDuration]);

  // Start pause timer
  useEffect(() => {
    if (pauseResumeState.isPaused) {
      pauseTimerRef.current = window.setInterval(updatePausedDuration, 1000);
    } else {
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    }

    return () => {
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
      }
    };
  }, [pauseResumeState.isPaused, updatePausedDuration]);

  const pause = useCallback((currentPosition: number) => {
    const pauseTime = Date.now();
    
    setPauseResumeState(prev => ({
      ...prev,
      isPaused: true,
      pausePosition: currentPosition,
      pauseTime,
      pauseCount: prev.pauseCount + 1,
      canResume: true,
    }));

    setPlaybackState(prev => ({
      ...prev,
      isPaused: true,
      isPlaying: false,
      currentPosition,
      hasBeenPaused: true,
    }));
  }, []);

  const resume = useCallback(() => {
    const resumeTime = Date.now();
    const pausedDuration = resumeTime - pauseResumeState.pauseTime;

    setPauseResumeState(prev => ({
      ...prev,
      isPaused: false,
      resumeTime,
      totalPausedDuration: prev.totalPausedDuration + pausedDuration,
      pauseTime: 0,
    }));

    setPlaybackState(prev => ({
      ...prev,
      isPaused: false,
      isPlaying: true,
    }));
  }, [pauseResumeState.pauseTime]);

  const togglePause = useCallback((currentPosition: number) => {
    if (pauseResumeState.isPaused) {
      resume();
    } else {
      pause(currentPosition);
    }
  }, [pauseResumeState.isPaused, pause, resume]);

  const reset = useCallback(() => {
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    setPauseResumeState({
      isPaused: false,
      pausePosition: 0,
      pauseTime: 0,
      resumeTime: 0,
      totalPausedDuration: 0,
      pauseCount: 0,
      canResume: false,
    });

    setPlaybackState({
      isPlaying: false,
      isPaused: false,
      currentPosition: 0,
      hasBeenPaused: false,
    });
  }, []);

  return {
    pauseResumeState,
    playbackState,
    actions: {
      pause,
      resume,
      togglePause,
      reset,
    },
  };
};
```

### Step 2: Enhanced TTS Service with Robust Pause/Resume

```typescript
// services/ttsServiceWithPauseResume.ts
import { TTSServiceWithProgress } from './ttsServiceWithProgress';

export interface PauseResumeConfig {
  enableAutoResume: boolean;
  pauseOnTabInactive: boolean;
  maxPauseTime: number; // Maximum pause time before auto-reset (ms)
}

export class TTSServiceWithPauseResume extends TTSServiceWithProgress {
  private pauseResumeConfig: PauseResumeConfig;
  private isPaused: boolean = false;
  private pausePosition: number = 0;
  private remainingText: string = '';
  private originalText: string = '';
  private visibilityChangeHandler?: () => void;

  constructor(config: Partial<PauseResumeConfig> = {}) {
    super();
    
    this.pauseResumeConfig = {
      enableAutoResume: true,
      pauseOnTabInactive: false,
      maxPauseTime: 30 * 60 * 1000, // 30 minutes
      ...config,
    };

    this.setupVisibilityHandling();
  }

  private setupVisibilityHandling() {
    if (this.pauseResumeConfig.pauseOnTabInactive) {
      this.visibilityChangeHandler = () => {
        if (document.hidden && this.isPlaying() && !this.isPaused) {
          this.pause();
        } else if (!document.hidden && this.isPaused && this.pauseResumeConfig.enableAutoResume) {
          // Don't auto-resume immediately, let user decide
          console.log('Tab became active, speech is paused');
        }
      };

      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  speak(text: string, options: SpeechSynthesisUtterance = new SpeechSynthesisUtterance()): Promise<void> {
    this.originalText = text;
    this.remainingText = text;
    this.pausePosition = 0;
    this.isPaused = false;

    return super.speak(text, options);
  }

  pause(): boolean {
    if (!this.isPlaying() || this.isPaused) {
      return false;
    }

    try {
      speechSynthesis.pause();
      this.isPaused = true;

      // Get current position from the last boundary event
      // This is stored from the progress tracking
      this.pausePosition = this.getCurrentPosition();
      
      this.progressCallback?.({
        type: 'pause',
      });

      return true;
    } catch (error) {
      console.error('Error pausing speech:', error);
      return false;
    }
  }

  resume(): boolean {
    if (!this.isPaused) {
      return false;
    }

    try {
      // Check if the utterance is still valid
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
        this.isPaused = false;

        this.progressCallback?.({
          type: 'resume',
        });

        return true;
      } else {
        // If the utterance was lost, restart from pause position
        return this.resumeFromPosition();
      }
    } catch (error) {
      console.error('Error resuming speech:', error);
      return this.resumeFromPosition();
    }
  }

  private resumeFromPosition(): boolean {
    if (this.pausePosition >= this.originalText.length) {
      return false;
    }

    try {
      // Create new utterance with remaining text
      this.remainingText = this.originalText.substring(this.pausePosition);
      
      const utterance = new SpeechSynthesisUtterance(this.remainingText);
      
      // Copy settings from current utterance
      if (this.currentUtterance) {
        utterance.rate = this.currentUtterance.rate;
        utterance.pitch = this.currentUtterance.pitch;
        utterance.volume = this.currentUtterance.volume;
        utterance.voice = this.currentUtterance.voice;
      }

      // Set up event handlers
      utterance.onboundary = (event) => {
        // Adjust character index to account for the text offset
        if (event.name === 'word' || event.name === 'sentence') {
          this.progressCallback?.({
            type: 'boundary',
            charIndex: this.pausePosition + event.charIndex,
            name: event.name,
          });
        }
      };

      utterance.onend = () => {
        this.progressCallback?.({
          type: 'end',
        });
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error during resume:', event.error);
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
      
      this.isPaused = false;
      
      this.progressCallback?.({
        type: 'resume',
      });

      return true;
    } catch (error) {
      console.error('Error resuming from position:', error);
      return false;
    }
  }

  togglePause(): boolean {
    if (this.isPaused) {
      return this.resume();
    } else {
      return this.pause();
    }
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  getPausePosition(): number {
    return this.pausePosition;
  }

  private getCurrentPosition(): number {
    // This should be updated from boundary events in the progress tracking
    // For now, return the last known position
    return this.pausePosition;
  }

  // Update position from boundary events
  updateCurrentPosition(position: number) {
    if (!this.isPaused) {
      this.pausePosition = position;
    }
  }

  stop(): void {
    super.stop();
    this.isPaused = false;
    this.pausePosition = 0;
    this.remainingText = '';
  }

  destroy() {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    this.stop();
  }
}
```

### Step 3: Keyboard Shortcuts Integration

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onTogglePause?: () => void;
  onStop?: () => void;
  onSpeedUp?: () => void;
  onSpeedDown?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts, enabled: boolean = true) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        shortcuts.onTogglePause?.();
        break;
        
      case 'Escape':
        event.preventDefault();
        shortcuts.onStop?.();
        break;
        
      case 'ArrowUp':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          shortcuts.onSpeedUp?.();
        }
        break;
        
      case 'ArrowDown':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          shortcuts.onSpeedDown?.();
        }
        break;
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, enabled]);
};
```

### Step 4: Pause/Resume UI Components

```typescript
// components/PauseResumeControls.tsx
import React from 'react';
import { PauseResumeState, TTSPlaybackState } from '../types/pauseResume';

interface PauseResumeControlsProps {
  pauseResumeState: PauseResumeState;
  playbackState: TTSPlaybackState;
  onPause: () => void;
  onResume: () => void;
  onTogglePause: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const PauseResumeControls: React.FC<PauseResumeControlsProps> = ({
  pauseResumeState,
  playbackState,
  onPause,
  onResume,
  onTogglePause,
  onStop,
  disabled = false,
}) => {
  const formatPauseStats = () => {
    if (pauseResumeState.pauseCount === 0) return null;

    const totalPausedSeconds = Math.floor(pauseResumeState.totalPausedDuration / 1000);
    const minutes = Math.floor(totalPausedSeconds / 60);
    const seconds = totalPausedSeconds % 60;

    return (
      <div className="pause-stats">
        <span className="pause-count">Paused {pauseResumeState.pauseCount} times</span>
        <span className="pause-duration">
          Total pause time: {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    );
  };

  return (
    <div className="pause-resume-controls">
      {/* Main Control Buttons */}
      <div className="main-controls">
        {!playbackState.isPlaying && !playbackState.isPaused ? (
          <button 
            className="btn-primary btn-play"
            onClick={onTogglePause}
            disabled={disabled}
          >
            ▶️ Play
          </button>
        ) : (
          <>
            <button
              className={`btn-secondary ${playbackState.isPaused ? 'btn-resume' : 'btn-pause'}`}
              onClick={onTogglePause}
              disabled={disabled}
              title={playbackState.isPaused ? 'Resume (Space)' : 'Pause (Space)'}
            >
              {playbackState.isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            
            <button
              className="btn-danger btn-stop"
              onClick={onStop}
              disabled={disabled}
              title="Stop (Esc)"
            >
              ⏹️ Stop
            </button>
          </>
        )}
      </div>

      {/* Pause State Indicator */}
      {playbackState.isPaused && (
        <div className="pause-indicator">
          <div className="pause-icon">⏸️</div>
          <div className="pause-text">Paused</div>
          <div className="pause-position">
            Position: {pauseResumeState.pausePosition} characters
          </div>
        </div>
      )}

      {/* Resume Availability */}
      {pauseResumeState.canResume && !playbackState.isPlaying && (
        <div className="resume-available">
          <button
            className="btn-link resume-link"
            onClick={onResume}
            disabled={disabled}
          >
            Continue from where you left off
          </button>
        </div>
      )}

      {/* Pause Statistics */}
      {formatPauseStats()}

      {/* Keyboard Shortcuts Help */}
      <div className="keyboard-shortcuts-hint">
        <small>
          Press <kbd>Space</kbd> to pause/resume, <kbd>Esc</kbd> to stop
        </small>
      </div>
    </div>
  );
};
```

### Step 5: Integrated TTS Component with Pause/Resume

```typescript
// components/TTSWithPauseResume.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { TTSServiceWithPauseResume } from '../services/ttsServiceWithPauseResume';
import { usePauseResume } from '../hooks/usePauseResume';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { PauseResumeControls } from './PauseResumeControls';
import { ProgressBar } from './ProgressBar';

interface TTSWithPauseResumeProps {
  text: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  enableKeyboardShortcuts?: boolean;
  pauseOnTabInactive?: boolean;
}

export const TTSWithPauseResume: React.FC<TTSWithPauseResumeProps> = ({
  text,
  onComplete,
  onError,
  enableKeyboardShortcuts = true,
  pauseOnTabInactive = false,
}) => {
  const [ttsService] = useState(() => new TTSServiceWithPauseResume({
    pauseOnTabInactive,
    enableAutoResume: true,
  }));

  const { pauseResumeState, playbackState, actions } = usePauseResume();
  const { progress, initializeProgress, updateProgress, resetProgress } = 
    useProgressTracking(text);

  // Set up TTS service callbacks
  useEffect(() => {
    ttsService.setProgressCallback((update) => {
      updateProgress(update);
      
      // Update current position for pause/resume
      if (update.type === 'boundary' && update.charIndex !== undefined) {
        ttsService.updateCurrentPosition(update.charIndex);
      }
    });
  }, [ttsService, updateProgress]);

  const handlePlay = useCallback(async () => {
    try {
      initializeProgress(text);
      actions.reset();
      
      await ttsService.speak(text);
      
      onComplete?.();
    } catch (error) {
      resetProgress();
      actions.reset();
      onError?.(error as Error);
    }
  }, [text, ttsService, initializeProgress, actions, resetProgress, onComplete, onError]);

  const handlePause = useCallback(() => {
    const success = ttsService.pause();
    if (success) {
      actions.pause(progress.currentCharacter);
    }
  }, [ttsService, actions, progress.currentCharacter]);

  const handleResume = useCallback(() => {
    const success = ttsService.resume();
    if (success) {
      actions.resume();
    }
  }, [ttsService, actions]);

  const handleTogglePause = useCallback(() => {
    if (playbackState.isPlaying && !playbackState.isPaused) {
      // Currently playing, so pause
      handlePause();
    } else if (playbackState.isPaused) {
      // Currently paused, so resume
      handleResume();
    } else {
      // Not playing, so start
      handlePlay();
    }
  }, [playbackState, handlePause, handleResume, handlePlay]);

  const handleStop = useCallback(() => {
    ttsService.stop();
    actions.reset();
    resetProgress();
  }, [ttsService, actions, resetProgress]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePause: handleTogglePause,
    onStop: handleStop,
  }, enableKeyboardShortcuts);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ttsService.destroy();
    };
  }, [ttsService]);

  return (
    <div className="tts-with-pause-resume">
      {/* Control Interface */}
      <PauseResumeControls
        pauseResumeState={pauseResumeState}
        playbackState={playbackState}
        onPause={handlePause}
        onResume={handleResume}
        onTogglePause={handleTogglePause}
        onStop={handleStop}
      />

      {/* Progress Display */}
      {(progress.isTracking || playbackState.hasBeenPaused) && (
        <div className="progress-section">
          <ProgressBar progress={progress} />
          
          {playbackState.isPaused && (
            <div className="pause-progress-info">
              <span>Paused at {Math.round(progress.percentComplete)}% complete</span>
            </div>
          )}
        </div>
      )}

      {/* Text Display */}
      <div className="text-display">
        <div className={`text-content ${playbackState.isPaused ? 'paused' : ''}`}>
          {text}
        </div>
      </div>
    </div>
  );
};
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// tests/pauseResume.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePauseResume } from '../hooks/usePauseResume';

describe('usePauseResume', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => usePauseResume());
    
    expect(result.current.pauseResumeState.isPaused).toBe(false);
    expect(result.current.pauseResumeState.canResume).toBe(false);
    expect(result.current.playbackState.isPlaying).toBe(false);
  });

  test('should handle pause correctly', () => {
    const { result } = renderHook(() => usePauseResume());
    
    act(() => {
      result.current.actions.pause(100);
    });

    expect(result.current.pauseResumeState.isPaused).toBe(true);
    expect(result.current.pauseResumeState.pausePosition).toBe(100);
    expect(result.current.pauseResumeState.canResume).toBe(true);
    expect(result.current.playbackState.isPaused).toBe(true);
  });

  test('should calculate paused duration correctly', () => {
    const { result } = renderHook(() => usePauseResume());
    
    act(() => {
      result.current.actions.pause(100);
    });

    act(() => {
      jest.advanceTimersByTime(5000); // 5 seconds
    });

    act(() => {
      result.current.actions.resume();
    });

    expect(result.current.pauseResumeState.totalPausedDuration).toBeGreaterThanOrEqual(5000);
  });

  test('should handle multiple pause/resume cycles', () => {
    const { result } = renderHook(() => usePauseResume());
    
    // First pause/resume cycle
    act(() => {
      result.current.actions.pause(50);
    });
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    act(() => {
      result.current.actions.resume();
    });

    // Second pause/resume cycle
    act(() => {
      result.current.actions.pause(150);
    });
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    act(() => {
      result.current.actions.resume();
    });

    expect(result.current.pauseResumeState.pauseCount).toBe(2);
    expect(result.current.pauseResumeState.totalPausedDuration).toBeGreaterThanOrEqual(5000);
  });
});
```

### Integration Tests

```typescript
// tests/ttsServiceWithPauseResume.test.ts
import { TTSServiceWithPauseResume } from '../services/ttsServiceWithPauseResume';

// Mock Speech Synthesis API with pause/resume support
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSpeak = jest.fn();
const mockCancel = jest.fn();

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    pause: mockPause,
    resume: mockResume,
    speaking: false,
    pending: false,
    paused: false,
  },
});

describe('TTSServiceWithPauseResume', () => {
  let service: TTSServiceWithPauseResume;

  beforeEach(() => {
    service = new TTSServiceWithPauseResume();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.destroy();
  });

  test('should pause speech successfully', async () => {
    await service.speak('Test text for pause functionality');
    
    const pauseResult = service.pause();
    
    expect(pauseResult).toBe(true);
    expect(mockPause).toHaveBeenCalled();
    expect(service.isPausedState()).toBe(true);
  });

  test('should resume speech successfully', async () => {
    await service.speak('Test text for resume functionality');
    service.pause();
    
    const resumeResult = service.resume();
    
    expect(resumeResult).toBe(true);
    expect(service.isPausedState()).toBe(false);
  });

  test('should toggle pause/resume correctly', async () => {
    await service.speak('Test text for toggle functionality');
    
    // First toggle should pause
    let toggleResult = service.togglePause();
    expect(toggleResult).toBe(true);
    expect(service.isPausedState()).toBe(true);
    
    // Second toggle should resume
    toggleResult = service.togglePause();
    expect(toggleResult).toBe(true);
    expect(service.isPausedState()).toBe(false);
  });

  test('should handle pause position correctly', async () => {
    const testText = 'This is a test text for position tracking';
    await service.speak(testText);
    
    // Simulate boundary event
    service.updateCurrentPosition(10);
    service.pause();
    
    expect(service.getPausePosition()).toBe(10);
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e/pauseResume.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Pause/Resume Functionality', () => {
  test('should pause and resume TTS playback', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Start TTS
    await page.fill('#text-input', 'This is a longer text to test pause and resume functionality with multiple sentences.');
    await page.click('#play-button');
    
    // Wait for playback to start
    await expect(page.locator('.btn-pause')).toBeVisible();
    
    // Pause playback
    await page.click('.btn-pause');
    await expect(page.locator('.pause-indicator')).toBeVisible();
    await expect(page.locator('.btn-resume')).toBeVisible();
    
    // Resume playback
    await page.click('.btn-resume');
    await expect(page.locator('.btn-pause')).toBeVisible();
    await expect(page.locator('.pause-indicator')).not.toBeVisible();
  });

  test('should use keyboard shortcuts for pause/resume', async ({ page }) => {
    await page.goto('/tts-extension');
    
    await page.fill('#text-input', 'Test text for keyboard shortcuts.');
    await page.click('#play-button');
    
    // Use spacebar to pause
    await page.keyboard.press('Space');
    await expect(page.locator('.pause-indicator')).toBeVisible();
    
    // Use spacebar to resume
    await page.keyboard.press('Space');
    await expect(page.locator('.pause-indicator')).not.toBeVisible();
    
    // Use Escape to stop
    await page.keyboard.press('Escape');
    await expect(page.locator('.btn-play')).toBeVisible();
  });

  test('should maintain progress during pause/resume', async ({ page }) => {
    await page.goto('/tts-extension');
    
    await page.fill('#text-input', 'This is a test text that will be paused and resumed to check progress consistency.');
    await page.click('#play-button');
    
    // Wait for some progress
    await page.waitForTimeout(2000);
    
    // Get progress before pause
    const progressBeforePause = await page.locator('.progress-percentage').textContent();
    
    // Pause
    await page.click('.btn-pause');
    
    // Wait a moment
    await page.waitForTimeout(1000);
    
    // Resume
    await page.click('.btn-resume');
    
    // Check that progress continues from where it left off (within reasonable margin)
    const progressAfterResume = await page.locator('.progress-percentage').textContent();
    
    const beforePercent = parseInt(progressBeforePause?.replace('%', '') || '0');
    const afterPercent = parseInt(progressAfterResume?.replace('%', '') || '0');
    
    // Progress should be close to where it was (allowing for some variance)
    expect(Math.abs(afterPercent - beforePercent)).toBeLessThan(10);
  });

  test('should show pause statistics', async ({ page }) => {
    await page.goto('/tts-extension');
    
    await page.fill('#text-input', 'Text for testing pause statistics display.');
    await page.click('#play-button');
    
    // Pause and resume multiple times
    await page.click('.btn-pause');
    await page.waitForTimeout(1000);
    await page.click('.btn-resume');
    
    await page.click('.btn-pause');
    await page.waitForTimeout(1000);
    await page.click('.btn-resume');
    
    // Check pause statistics
    await expect(page.locator('.pause-stats')).toBeVisible();
    await expect(page.locator('.pause-count')).toContainText('Paused 2 times');
  });
});
```

## Success Metrics

### Functional Metrics
- Pause operation completes within 100ms of user action
- Resume operation continues playback within 200ms with <1% position drift
- Keyboard shortcuts respond within 50ms
- Progress state maintained across 100+ pause/resume cycles
- Auto-pause on tab switch works in 95% of browsers

### Performance Metrics
- Pause/resume operations add <10ms overhead
- Memory usage increases <512KB for pause state management
- No degradation in speech quality after pause/resume
- Supports texts up to 50,000 characters without performance issues

### User Experience Metrics
- Users can pause/resume without losing position in 99% of cases
- Visual feedback appears within 100ms of state change
- Keyboard shortcuts work consistently across different page states
- Pause statistics provide meaningful user feedback

### Reliability Metrics
- Pause/resume success rate >98% across supported browsers
- Graceful fallback when native pause/resume is unavailable
- Recovery from browser speech synthesis interruptions in 90% of cases

## Dependencies and Risks

### Dependencies
- **SpeechSynthesis API**: Requires pause/resume support (Chrome 88+)
- **Document Visibility API**: For auto-pause on tab inactive
- **Keyboard Event API**: For shortcut functionality
- **React 16.8+**: For hooks-based state management
- **High-precision timing**: For accurate pause duration tracking

### Technical Risks

**High Risk:**
- **Browser Speech Synthesis Reliability**: Native pause/resume may fail
  - *Mitigation*: Implement fallback with position-based restart
  - *Fallback*: Store text position and restart from character position

**Medium Risk:**
- **State Synchronization**: Progress and pause states may become inconsistent
  - *Mitigation*: Implement atomic state updates and validation
  - *Recovery*: State reconciliation on resume

**Low Risk:**
- **Memory Leaks**: Timer intervals for pause duration tracking
  - *Mitigation*: Proper cleanup in useEffect and component unmount
  - *Monitoring*: Memory usage tracking in development

### Implementation Risks

**Timing Precision**: Pause position may not align perfectly with speech
- *Solution*: Use multiple position tracking methods (boundary events + time estimation)

**Browser Differences**: Different browsers handle pause/resume differently
- *Solution*: Browser-specific adaptations and comprehensive testing

**Long Pause Handling**: Extended pauses may cause speech synthesis to timeout
- *Solution*: Implement maximum pause time with automatic position-based restart

### Mitigation Strategies

1. **Robust Fallback System**: Always provide position-based resume as backup
2. **State Validation**: Verify pause/resume state consistency before operations
3. **Cross-browser Testing**: Extensive testing on Chrome, Edge, and other browsers
4. **Performance Monitoring**: Track pause/resume operation performance
5. **User Feedback**: Clear visual and audio feedback for all state changes
6. **Recovery Mechanisms**: Automatic recovery from failed pause/resume operations
7. **Timeout Handling**: Graceful handling of speech synthesis timeouts during pause