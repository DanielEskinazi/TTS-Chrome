# Feature 4.1: Progress Tracking

## Feature Overview and Objectives

### Overview
Implement real-time progress tracking for text-to-speech playback, allowing users to see how much of the selected text has been spoken and how much remains. This feature provides visual feedback and enables better user control over lengthy TTS sessions.

### Objectives
- Display current progress as percentage and visual progress bar
- Show time elapsed and estimated time remaining
- Track character/word position in the text
- Provide visual indicators for current speaking position
- Enable seeking/jumping to specific positions in the text

## Technical Requirements

### Core Requirements
- Real-time progress updates during TTS playback
- Visual progress bar with smooth animations
- Time-based progress indicators (elapsed/remaining)
- Character/word position tracking
- Integration with existing TTS state management
- Responsive design for different screen sizes

### Performance Requirements
- Progress updates must not impact TTS performance
- Smooth progress bar animations (60fps)
- Minimal memory overhead for progress tracking
- Efficient text parsing for position calculation

### Browser Compatibility
- Chrome 88+ (SpeechSynthesis API with events)
- Edge 88+ (Chromium-based)
- Support for SpeechSynthesisEvent boundary events

## Implementation Steps

### Step 1: Progress State Management

```typescript
// types/progress.ts
export interface TTSProgress {
  totalCharacters: number;
  currentCharacter: number;
  totalWords: number;
  currentWord: number;
  percentComplete: number;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  isTracking: boolean;
}

export interface ProgressUpdate {
  type: 'boundary' | 'start' | 'end' | 'pause' | 'resume';
  charIndex?: number;
  elapsedTime?: number;
  name?: string; // 'word' or 'sentence'
}
```

```typescript
// hooks/useProgressTracking.ts
import { useState, useEffect, useCallback } from 'react';
import { TTSProgress, ProgressUpdate } from '../types/progress';

export const useProgressTracking = (text: string) => {
  const [progress, setProgress] = useState<TTSProgress>({
    totalCharacters: 0,
    currentCharacter: 0,
    totalWords: 0,
    currentWord: 0,
    percentComplete: 0,
    timeElapsed: 0,
    estimatedTimeRemaining: 0,
    isTracking: false,
  });

  const [startTime, setStartTime] = useState<number>(0);

  const initializeProgress = useCallback((text: string) => {
    const totalCharacters = text.length;
    const totalWords = text.split(/\s+/).filter(word => word.length > 0).length;
    
    setProgress(prev => ({
      ...prev,
      totalCharacters,
      totalWords,
      currentCharacter: 0,
      currentWord: 0,
      percentComplete: 0,
      timeElapsed: 0,
      estimatedTimeRemaining: 0,
      isTracking: true,
    }));
    
    setStartTime(Date.now());
  }, []);

  const updateProgress = useCallback((update: ProgressUpdate) => {
    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);

    setProgress(prev => {
      if (!prev.isTracking) return prev;

      let newProgress = { ...prev, timeElapsed: elapsedTime };

      if (update.type === 'boundary' && update.charIndex !== undefined) {
        const percentComplete = (update.charIndex / prev.totalCharacters) * 100;
        const estimatedTotalTime = elapsedTime / (percentComplete / 100);
        const estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsedTime);

        // Calculate current word based on character position
        const textUpToPosition = text.substring(0, update.charIndex);
        const currentWord = textUpToPosition.split(/\s+/).filter(word => word.length > 0).length;

        newProgress = {
          ...newProgress,
          currentCharacter: update.charIndex,
          currentWord,
          percentComplete: Math.min(100, percentComplete),
          estimatedTimeRemaining: Math.floor(estimatedTimeRemaining),
        };
      }

      if (update.type === 'end') {
        newProgress = {
          ...newProgress,
          currentCharacter: prev.totalCharacters,
          currentWord: prev.totalWords,
          percentComplete: 100,
          estimatedTimeRemaining: 0,
          isTracking: false,
        };
      }

      return newProgress;
    });
  }, [text, startTime]);

  const resetProgress = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      currentCharacter: 0,
      currentWord: 0,
      percentComplete: 0,
      timeElapsed: 0,
      estimatedTimeRemaining: 0,
      isTracking: false,
    }));
  }, []);

  return {
    progress,
    initializeProgress,
    updateProgress,
    resetProgress,
  };
};
```

### Step 2: Enhanced TTS Service with Progress Events

```typescript
// services/ttsServiceWithProgress.ts
import { TTSService } from './ttsService';
import { ProgressUpdate } from '../types/progress';

export class TTSServiceWithProgress extends TTSService {
  private progressCallback?: (update: ProgressUpdate) => void;

  setProgressCallback(callback: (update: ProgressUpdate) => void) {
    this.progressCallback = callback;
  }

  speak(text: string, options: SpeechSynthesisUtterance = new SpeechSynthesisUtterance()): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      this.stop(); // Stop any current speech

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Copy options
      Object.assign(utterance, options);

      // Progress tracking event handlers
      utterance.onstart = () => {
        this.progressCallback?.({
          type: 'start',
          elapsedTime: 0,
        });
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
          this.progressCallback?.({
            type: 'boundary',
            charIndex: event.charIndex,
            name: event.name,
          });
        }
      };

      utterance.onend = () => {
        this.progressCallback?.({
          type: 'end',
        });
        resolve();
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      utterance.onpause = () => {
        this.progressCallback?.({
          type: 'pause',
        });
      };

      utterance.onresume = () => {
        this.progressCallback?.({
          type: 'resume',
        });
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }
}
```

### Step 3: Progress Display Components

```typescript
// components/ProgressBar.tsx
import React from 'react';
import { TTSProgress } from '../types/progress';

interface ProgressBarProps {
  progress: TTSProgress;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className = '' }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`progress-container ${className}`}>
      {/* Progress Bar */}
      <div className="progress-bar-wrapper">
        <div className="progress-bar-track">
          <div 
            className="progress-bar-fill"
            style={{ 
              width: `${progress.percentComplete}%`,
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
        <div className="progress-percentage">
          {Math.round(progress.percentComplete)}%
        </div>
      </div>

      {/* Time Information */}
      <div className="progress-time-info">
        <span className="time-elapsed">
          {formatTime(progress.timeElapsed)}
        </span>
        <span className="time-separator">/</span>
        <span className="time-remaining">
          -{formatTime(progress.estimatedTimeRemaining)}
        </span>
      </div>

      {/* Text Position Information */}
      <div className="progress-text-info">
        <span className="character-progress">
          {progress.currentCharacter} / {progress.totalCharacters} characters
        </span>
        <span className="word-progress">
          {progress.currentWord} / {progress.totalWords} words
        </span>
      </div>
    </div>
  );
};
```

```typescript
// components/TextHighlighter.tsx
import React, { useMemo } from 'react';
import { TTSProgress } from '../types/progress';

interface TextHighlighterProps {
  text: string;
  progress: TTSProgress;
  className?: string;
}

export const TextHighlighter: React.FC<TextHighlighterProps> = ({ 
  text, 
  progress, 
  className = '' 
}) => {
  const highlightedText = useMemo(() => {
    if (!progress.isTracking || progress.currentCharacter === 0) {
      return text;
    }

    const spokenText = text.substring(0, progress.currentCharacter);
    const remainingText = text.substring(progress.currentCharacter);

    return (
      <>
        <span className="text-spoken">{spokenText}</span>
        <span className="text-remaining">{remainingText}</span>
      </>
    );
  }, [text, progress.currentCharacter, progress.isTracking]);

  return (
    <div className={`text-highlighter ${className}`}>
      {highlightedText}
    </div>
  );
};
```

### Step 4: Integration with Main TTS Component

```typescript
// components/TTSWithProgress.tsx
import React, { useState, useCallback } from 'react';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { TTSServiceWithProgress } from '../services/ttsServiceWithProgress';
import { ProgressBar } from './ProgressBar';
import { TextHighlighter } from './TextHighlighter';

interface TTSWithProgressProps {
  text: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export const TTSWithProgress: React.FC<TTSWithProgressProps> = ({
  text,
  onComplete,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsService] = useState(() => new TTSServiceWithProgress());
  
  const { progress, initializeProgress, updateProgress, resetProgress } = 
    useProgressTracking(text);

  // Set up progress callback
  React.useEffect(() => {
    ttsService.setProgressCallback(updateProgress);
  }, [ttsService, updateProgress]);

  const handlePlay = useCallback(async () => {
    try {
      setIsPlaying(true);
      initializeProgress(text);
      
      await ttsService.speak(text);
      
      setIsPlaying(false);
      onComplete?.();
    } catch (error) {
      setIsPlaying(false);
      resetProgress();
      onError?.(error as Error);
    }
  }, [text, ttsService, initializeProgress, resetProgress, onComplete, onError]);

  const handleStop = useCallback(() => {
    ttsService.stop();
    setIsPlaying(false);
    resetProgress();
  }, [ttsService, resetProgress]);

  const handlePause = useCallback(() => {
    ttsService.pause();
  }, [ttsService]);

  const handleResume = useCallback(() => {
    ttsService.resume();
  }, [ttsService]);

  return (
    <div className="tts-with-progress">
      {/* Control Buttons */}
      <div className="tts-controls">
        {!isPlaying ? (
          <button onClick={handlePlay} className="btn-play">
            Play
          </button>
        ) : (
          <>
            <button onClick={handlePause} className="btn-pause">
              Pause
            </button>
            <button onClick={handleStop} className="btn-stop">
              Stop
            </button>
            <button onClick={handleResume} className="btn-resume">
              Resume
            </button>
          </>
        )}
      </div>

      {/* Progress Display */}
      {progress.isTracking && (
        <ProgressBar progress={progress} className="mt-4" />
      )}

      {/* Text with Highlighting */}
      <div className="text-display mt-4">
        <TextHighlighter 
          text={text} 
          progress={progress} 
          className="text-content"
        />
      </div>
    </div>
  );
};
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// tests/progressTracking.test.ts
import { renderHook, act } from '@testing-library/react';
import { useProgressTracking } from '../hooks/useProgressTracking';

describe('useProgressTracking', () => {
  const sampleText = "Hello world. This is a test sentence.";

  test('should initialize progress correctly', () => {
    const { result } = renderHook(() => useProgressTracking(sampleText));
    
    act(() => {
      result.current.initializeProgress(sampleText);
    });

    expect(result.current.progress.totalCharacters).toBe(sampleText.length);
    expect(result.current.progress.totalWords).toBe(7);
    expect(result.current.progress.isTracking).toBe(true);
  });

  test('should update progress on boundary events', () => {
    const { result } = renderHook(() => useProgressTracking(sampleText));
    
    act(() => {
      result.current.initializeProgress(sampleText);
    });

    act(() => {
      result.current.updateProgress({
        type: 'boundary',
        charIndex: 12, // After "Hello world."
      });
    });

    expect(result.current.progress.currentCharacter).toBe(12);
    expect(result.current.progress.percentComplete).toBeGreaterThan(0);
  });

  test('should calculate estimated time remaining', () => {
    const { result } = renderHook(() => useProgressTracking(sampleText));
    
    act(() => {
      result.current.initializeProgress(sampleText);
    });

    // Simulate 50% progress after 5 seconds
    act(() => {
      result.current.updateProgress({
        type: 'boundary',
        charIndex: Math.floor(sampleText.length / 2),
      });
    });

    expect(result.current.progress.estimatedTimeRemaining).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// tests/ttsWithProgress.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TTSWithProgress } from '../components/TTSWithProgress';

// Mock Speech Synthesis API
const mockSpeak = jest.fn();
const mockCancel = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();

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

describe('TTSWithProgress', () => {
  const sampleText = "This is a test text for TTS.";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render play button initially', () => {
    render(<TTSWithProgress text={sampleText} />);
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  test('should show progress bar when playing', async () => {
    render(<TTSWithProgress text={sampleText} />);
    
    fireEvent.click(screen.getByText('Play'));
    
    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  test('should highlight spoken text', async () => {
    render(<TTSWithProgress text={sampleText} />);
    
    fireEvent.click(screen.getByText('Play'));
    
    // Simulate boundary event
    const utterance = mockSpeak.mock.calls[0][0];
    act(() => {
      utterance.onboundary({
        name: 'word',
        charIndex: 4, // After "This"
      });
    });

    await waitFor(() => {
      expect(screen.getByText('This')).toHaveClass('text-spoken');
    });
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e/progressTracking.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Progress Tracking', () => {
  test('should show accurate progress during TTS playback', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Select text and start TTS
    await page.fill('#text-input', 'This is a longer text for testing progress tracking functionality.');
    await page.click('#play-button');
    
    // Check if progress bar appears
    await expect(page.locator('.progress-bar-wrapper')).toBeVisible();
    
    // Wait for some progress
    await page.waitForTimeout(2000);
    
    // Check if progress is updating
    const progressText = await page.locator('.progress-percentage').textContent();
    expect(parseInt(progressText?.replace('%', '') || '0')).toBeGreaterThan(0);
    
    // Check if time information is displayed
    await expect(page.locator('.time-elapsed')).toBeVisible();
    await expect(page.locator('.time-remaining')).toBeVisible();
  });

  test('should highlight spoken text correctly', async ({ page }) => {
    await page.goto('/tts-extension');
    
    await page.fill('#text-input', 'Short test text.');
    await page.click('#play-button');
    
    // Wait for text highlighting to appear
    await expect(page.locator('.text-spoken')).toBeVisible();
    await expect(page.locator('.text-remaining')).toBeVisible();
  });
});
```

## Success Metrics

### Functional Metrics
- Progress bar updates smoothly during TTS playback (60fps)
- Time calculations accuracy within ±10% of actual playback time
- Text highlighting synchronizes with speech within 100ms
- Progress persists correctly across pause/resume cycles

### Performance Metrics
- Progress updates add <5ms overhead per boundary event
- Memory usage increase <1MB for progress tracking
- No noticeable impact on speech quality or timing

### User Experience Metrics
- Users can estimate remaining time within 20% accuracy
- Visual feedback provides clear indication of current position
- Progress information is readable on mobile devices (320px width)

## Dependencies and Risks

### Dependencies
- **SpeechSynthesis API**: Requires boundary event support
- **Browser Support**: Chrome 88+, Edge 88+ for reliable boundary events
- **React 16.8+**: For hooks-based implementation
- **TypeScript 4.0+**: For proper type definitions

### Technical Risks

**High Risk:**
- **Boundary Event Reliability**: Some browsers may not fire boundary events consistently
  - *Mitigation*: Implement fallback time-based progress estimation
  - *Fallback*: Use setTimeout with estimated speaking rate

**Medium Risk:**
- **Performance Impact**: Frequent progress updates could affect performance
  - *Mitigation*: Throttle progress updates to 10fps maximum
  - *Optimization*: Use requestAnimationFrame for smooth animations

**Low Risk:**
- **Text Parsing Accuracy**: Complex text formatting might affect word counting
  - *Mitigation*: Implement robust text parsing with edge case handling
  - *Testing*: Comprehensive test suite for various text formats

### Implementation Risks

**Timing Synchronization**: Speech boundary events may not perfectly align with actual speech
- *Solution*: Implement calibration mechanism based on actual vs. reported progress

**Browser Differences**: Different browsers may report boundary events differently
- *Solution*: Browser-specific adjustments and extensive cross-browser testing

**Long Text Performance**: Very long texts might cause memory or performance issues
- *Solution*: Implement chunking strategy for texts over 10,000 characters

### Mitigation Strategies

1. **Fallback Progress Estimation**: Implement time-based progress calculation when boundary events are unavailable
2. **Performance Monitoring**: Add performance metrics to detect and address bottlenecks
3. **Progressive Enhancement**: Core TTS functionality works without progress tracking
4. **Comprehensive Testing**: Cross-browser testing on multiple devices and text types
5. **User Feedback**: Collect user feedback on progress accuracy and usefulness