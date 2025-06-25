# Feature 3.3: Speed Control

## Feature Overview and Objectives

### Primary Objective
Implement a comprehensive speed control interface that allows users to adjust the text-to-speech playback rate with precision and ease. The control should provide both slider and preset options while maintaining real-time feedback and user preference persistence.

### Secondary Objectives
- Provide intuitive speed adjustment with visual feedback
- Support preset speed values for common use cases
- Enable real-time speed changes during playback
- Implement keyboard shortcuts for power users
- Ensure accessibility for users with motor impairments
- Persist speed preferences across sessions

### User Stories
- As a user, I want to adjust speech speed using a visual slider for precise control
- As a user, I want quick access to common speed presets (0.5x, 1x, 1.5x, 2x)
- As a user, I want to change speed in real-time while text is being spoken
- As a user, I want keyboard shortcuts for speed adjustment
- As a user, I want my speed preference to be remembered across browser sessions
- As a user, I want visual and audio feedback when adjusting speed

## Technical Requirements

### Functional Requirements
1. **Speed Range**: Support 0.1x to 4.0x playback speed (Web Speech API limits)
2. **Speed Slider**: Smooth slider control with visual indicators
3. **Preset Buttons**: Quick access buttons for common speeds
4. **Real-time Adjustment**: Change speed during active playback
5. **Keyboard Shortcuts**: Arrow keys and number keys for adjustment
6. **Speed Display**: Current speed value with percentage format
7. **Reset Function**: Quick reset to default 1.0x speed

### Non-Functional Requirements
1. **Responsiveness**: Speed changes apply within 100ms
2. **Precision**: Support 0.1x increments for fine control
3. **Accessibility**: Full keyboard navigation and screen reader support
4. **Performance**: Smooth slider interaction without lag
5. **Persistence**: Remember speed setting across sessions
6. **Visual Feedback**: Clear indication of current and target speeds

### Speed Control Data Structure
```typescript
interface SpeedSettings {
  currentSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  step: number;
  presets: number[];
  isAdjusting: boolean;
}
```

## Implementation Steps

### Step 1: Speed Types and Interfaces

```typescript
// src/popup/types/speed.types.ts
export interface SpeedSettings {
  currentSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  step: number;
  presets: number[];
  isAdjusting: boolean;
  defaultSpeed: number;
}

export interface SpeedState {
  settings: SpeedSettings;
  isPlaying: boolean;
  lastAdjustmentTime: number;
  keyboardShortcutsEnabled: boolean;
}

export type SpeedChangeEvent = {
  speed: number;
  source: 'slider' | 'preset' | 'keyboard' | 'reset';
  timestamp: number;
};
```

### Step 2: Speed Control Hook

```typescript
// src/popup/hooks/useSpeedControl.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { SpeedState, SpeedSettings, SpeedChangeEvent } from '../types/speed.types';

const DEFAULT_SPEED_SETTINGS: SpeedSettings = {
  currentSpeed: 1.0,
  minSpeed: 0.1,
  maxSpeed: 4.0,
  step: 0.1,
  presets: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
  isAdjusting: false,
  defaultSpeed: 1.0
};

export const useSpeedControl = () => {
  const [state, setState] = useState<SpeedState>({
    settings: DEFAULT_SPEED_SETTINGS,
    isPlaying: false,
    lastAdjustmentTime: 0,
    keyboardShortcutsEnabled: true
  });

  const debounceTimer = useRef<NodeJS.Timeout>();
  const onSpeedChangeRef = useRef<((event: SpeedChangeEvent) => void) | null>(null);

  // Load saved speed on mount
  useEffect(() => {
    const savedSpeed = localStorage.getItem('tts-speech-speed');
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      if (speed >= DEFAULT_SPEED_SETTINGS.minSpeed && speed <= DEFAULT_SPEED_SETTINGS.maxSpeed) {
        setSpeed(speed, 'reset');
      }
    }
  }, []);

  // Save speed to localStorage with debouncing
  const saveSpeed = useCallback((speed: number) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      localStorage.setItem('tts-speech-speed', speed.toString());
    }, 500);
  }, []);

  const setSpeed = useCallback((newSpeed: number, source: SpeedChangeEvent['source'] = 'slider') => {
    const clampedSpeed = Math.max(
      DEFAULT_SPEED_SETTINGS.minSpeed,
      Math.min(DEFAULT_SPEED_SETTINGS.maxSpeed, newSpeed)
    );

    const roundedSpeed = Math.round(clampedSpeed * 10) / 10; // Round to 1 decimal place

    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        currentSpeed: roundedSpeed
      },
      lastAdjustmentTime: Date.now()
    }));

    const event: SpeedChangeEvent = {
      speed: roundedSpeed,
      source,
      timestamp: Date.now()
    };

    // Notify parent component
    if (onSpeedChangeRef.current) {
      onSpeedChangeRef.current(event);
    }

    // Send message to content script/background
    chrome.runtime.sendMessage({
      type: 'SPEED_CHANGED',
      speed: roundedSpeed,
      source
    });

    saveSpeed(roundedSpeed);
  }, [saveSpeed]);

  const increaseSpeed = useCallback(() => {
    const newSpeed = state.settings.currentSpeed + state.settings.step;
    setSpeed(newSpeed, 'keyboard');
  }, [state.settings.currentSpeed, state.settings.step, setSpeed]);

  const decreaseSpeed = useCallback(() => {
    const newSpeed = state.settings.currentSpeed - state.settings.step;
    setSpeed(newSpeed, 'keyboard');
  }, [state.settings.currentSpeed, state.settings.step, setSpeed]);

  const resetSpeed = useCallback(() => {
    setSpeed(state.settings.defaultSpeed, 'reset');
  }, [state.settings.defaultSpeed, setSpeed]);

  const setPresetSpeed = useCallback((presetSpeed: number) => {
    setSpeed(presetSpeed, 'preset');
  }, [setSpeed]);

  const setAdjusting = useCallback((isAdjusting: boolean) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        isAdjusting
      }
    }));
  }, []);

  const setPlaying = useCallback((isPlaying: boolean) => {
    setState(prev => ({
      ...prev,
      isPlaying
    }));
  }, []);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!state.keyboardShortcutsEnabled) return;

    // Prevent default for handled keys
    const handledKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (handledKeys.includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        increaseSpeed();
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        decreaseSpeed();
        break;
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          resetSpeed();
        }
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const presetIndex = parseInt(event.key) - 1;
          if (presetIndex < state.settings.presets.length) {
            setPresetSpeed(state.settings.presets[presetIndex]);
          }
        }
        break;
    }
  }, [state.keyboardShortcutsEnabled, state.settings.presets, increaseSpeed, decreaseSpeed, resetSpeed, setPresetSpeed]);

  // Register keyboard shortcuts
  useEffect(() => {
    if (state.keyboardShortcutsEnabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, state.keyboardShortcutsEnabled]);

  const registerSpeedChangeCallback = useCallback((callback: (event: SpeedChangeEvent) => void) => {
    onSpeedChangeRef.current = callback;
  }, []);

  return {
    state,
    setSpeed,
    increaseSpeed,
    decreaseSpeed,
    resetSpeed,
    setPresetSpeed,
    setAdjusting,
    setPlaying,
    registerSpeedChangeCallback
  };
};
```

### Step 3: Speed Control Components

```typescript
// src/popup/components/speed/SpeedControl.tsx
import React, { useEffect } from 'react';
import { SpeedSlider } from './SpeedSlider';
import { SpeedPresets } from './SpeedPresets';
import { SpeedDisplay } from './SpeedDisplay';
import { SpeedKeyboardHelp } from './SpeedKeyboardHelp';
import { useSpeedControl } from '../../hooks/useSpeedControl';
import { SpeedChangeEvent } from '../../types/speed.types';

interface SpeedControlProps {
  isPlaying?: boolean;
  onSpeedChange?: (event: SpeedChangeEvent) => void;
  showKeyboardHelp?: boolean;
}

export const SpeedControl: React.FC<SpeedControlProps> = ({
  isPlaying = false,
  onSpeedChange,
  showKeyboardHelp = true
}) => {
  const speedControl = useSpeedControl();

  // Update playing state
  useEffect(() => {
    speedControl.setPlaying(isPlaying);
  }, [isPlaying, speedControl]);

  // Register speed change callback
  useEffect(() => {
    if (onSpeedChange) {
      speedControl.registerSpeedChangeCallback(onSpeedChange);
    }
  }, [onSpeedChange, speedControl]);

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Playback Speed</h3>
        <SpeedDisplay 
          speed={speedControl.state.settings.currentSpeed}
          isAdjusting={speedControl.state.settings.isAdjusting}
        />
      </div>

      <SpeedSlider
        speed={speedControl.state.settings.currentSpeed}
        minSpeed={speedControl.state.settings.minSpeed}
        maxSpeed={speedControl.state.settings.maxSpeed}
        step={speedControl.state.settings.step}
        onSpeedChange={speedControl.setSpeed}
        onAdjustingChange={speedControl.setAdjusting}
        isPlaying={speedControl.state.isPlaying}
      />

      <SpeedPresets
        currentSpeed={speedControl.state.settings.currentSpeed}
        presets={speedControl.state.settings.presets}
        onPresetSelect={speedControl.setPresetSpeed}
        onReset={speedControl.resetSpeed}
      />

      {showKeyboardHelp && <SpeedKeyboardHelp />}
    </div>
  );
};
```

```typescript
// src/popup/components/speed/SpeedSlider.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface SpeedSliderProps {
  speed: number;
  minSpeed: number;
  maxSpeed: number;
  step: number;
  onSpeedChange: (speed: number) => void;
  onAdjustingChange: (isAdjusting: boolean) => void;
  isPlaying: boolean;
}

export const SpeedSlider: React.FC<SpeedSliderProps> = ({
  speed,
  minSpeed,
  maxSpeed,
  step,
  onSpeedChange,
  onAdjustingChange,
  isPlaying
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(speed);
  const sliderRef = useRef<HTMLInputElement>(null);
  const updateTimer = useRef<NodeJS.Timeout>();

  // Sync local speed with prop
  useEffect(() => {
    if (!isDragging) {
      setLocalSpeed(speed);
    }
  }, [speed, isDragging]);

  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(event.target.value);
    setLocalSpeed(newSpeed);

    // Debounce updates during dragging
    if (updateTimer.current) {
      clearTimeout(updateTimer.current);
    }

    updateTimer.current = setTimeout(() => {
      onSpeedChange(newSpeed);
    }, 50);
  }, [onSpeedChange]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
    onAdjustingChange(true);
  }, [onAdjustingChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onAdjustingChange(false);
    onSpeedChange(localSpeed);
  }, [localSpeed, onSpeedChange, onAdjustingChange]);

  const handleDecrement = useCallback(() => {
    const newSpeed = Math.max(minSpeed, localSpeed - step);
    setLocalSpeed(newSpeed);
    onSpeedChange(newSpeed);
  }, [localSpeed, minSpeed, step, onSpeedChange]);

  const handleIncrement = useCallback(() => {
    const newSpeed = Math.min(maxSpeed, localSpeed + step);
    setLocalSpeed(newSpeed);
    onSpeedChange(newSpeed);
  }, [localSpeed, maxSpeed, step, onSpeedChange]);

  // Calculate percentage for styling
  const percentage = ((localSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <button
          onClick={handleDecrement}
          disabled={localSpeed <= minSpeed}
          className="p-1 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Decrease speed"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex-1 relative">
          <input
            ref={sliderRef}
            type="range"
            min={minSpeed}
            max={maxSpeed}
            step={step}
            value={localSpeed}
            onChange={handleSliderChange}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`
            }}
          />
          
          {/* Speed markers */}
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{minSpeed}x</span>
            <span>1x</span>
            <span>2x</span>
            <span>{maxSpeed}x</span>
          </div>
        </div>

        <button
          onClick={handleIncrement}
          disabled={localSpeed >= maxSpeed}
          className="p-1 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Increase speed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Visual feedback during playback */}
      {isPlaying && (
        <div className="text-xs text-blue-600 flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span>Speed changes apply in real-time</span>
        </div>
      )}
    </div>
  );
};
```

```typescript
// src/popup/components/speed/SpeedPresets.tsx
import React from 'react';
import { RotateCcw } from 'lucide-react';

interface SpeedPresetsProps {
  currentSpeed: number;
  presets: number[];
  onPresetSelect: (speed: number) => void;
  onReset: () => void;
}

export const SpeedPresets: React.FC<SpeedPresetsProps> = ({
  currentSpeed,
  presets,
  onPresetSelect,
  onReset
}) => {
  const formatSpeed = (speed: number): string => {
    return speed === 1 ? '1x' : `${speed}x`;
  };

  const getSpeedLabel = (speed: number): string => {
    if (speed < 0.8) return 'Very Slow';
    if (speed < 1.0) return 'Slow';
    if (speed === 1.0) return 'Normal';
    if (speed <= 1.5) return 'Fast';
    return 'Very Fast';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Quick Presets</span>
        <button
          onClick={onReset}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Reset to normal speed"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => {
          const isActive = Math.abs(currentSpeed - preset) < 0.05;
          
          return (
            <button
              key={preset}
              onClick={() => onPresetSelect(preset)}
              className={`
                px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }
              `}
              title={`${getSpeedLabel(preset)} - ${formatSpeed(preset)}`}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="font-semibold">{formatSpeed(preset)}</span>
                <span className="text-xs opacity-75">
                  {getSpeedLabel(preset)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

```typescript
// src/popup/components/speed/SpeedDisplay.tsx
import React from 'react';
import { Gauge } from 'lucide-react';

interface SpeedDisplayProps {
  speed: number;
  isAdjusting: boolean;
}

export const SpeedDisplay: React.FC<SpeedDisplayProps> = ({
  speed,
  isAdjusting
}) => {
  const getSpeedColor = (speed: number): string => {
    if (speed < 0.8) return 'text-blue-600';
    if (speed < 1.0) return 'text-green-600';
    if (speed === 1.0) return 'text-gray-600';
    if (speed <= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSpeedDescription = (speed: number): string => {
    if (speed < 0.8) return 'Very Slow';
    if (speed < 1.0) return 'Slow';
    if (speed === 1.0) return 'Normal';
    if (speed <= 1.5) return 'Fast';
    return 'Very Fast';
  };

  return (
    <div className={`
      flex items-center space-x-2 px-3 py-1 rounded-md
      ${isAdjusting ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}
      transition-colors duration-200
    `}>
      <Gauge className={`h-4 w-4 ${getSpeedColor(speed)}`} />
      <div className="text-right">
        <div className={`text-sm font-semibold ${getSpeedColor(speed)}`}>
          {speed.toFixed(1)}x
        </div>
        <div className="text-xs text-gray-500">
          {getSpeedDescription(speed)}
        </div>
      </div>
    </div>
  );
};
```

```typescript
// src/popup/components/speed/SpeedKeyboardHelp.tsx
import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp } from 'lucide-react';

export const SpeedKeyboardHelp: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shortcuts = [
    { keys: '↑ / →', action: 'Increase speed' },
    { keys: '↓ / ←', action: 'Decrease speed' },
    { keys: 'Ctrl/Cmd + R', action: 'Reset to normal' },
    { keys: 'Ctrl/Cmd + 1-6', action: 'Select preset' }
  ];

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-xs text-gray-600 hover:text-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-1">
          <Keyboard className="h-3 w-3" />
          <span>Keyboard Shortcuts</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="font-mono bg-gray-100 px-1 rounded">
                {shortcut.keys}
              </span>
              <span className="text-gray-600">{shortcut.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Step 4: CSS Styles for Custom Slider

```css
/* src/popup/styles/speed-slider.css */
.slider-thumb::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3B82F6;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.slider-thumb::-webkit-slider-thumb:hover {
  background: #2563EB;
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.slider-thumb::-webkit-slider-thumb:active {
  transform: scale(1.2);
}

.slider-thumb::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3B82F6;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.slider-thumb::-moz-range-thumb:hover {
  background: #2563EB;
  transform: scale(1.1);
}

.slider-thumb:focus {
  outline: none;
}

.slider-thumb:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// src/popup/hooks/__tests__/useSpeedControl.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSpeedControl } from '../useSpeedControl';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = mockLocalStorage as any;

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn()
  }
} as any;

describe('useSpeedControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('initializes with default speed', () => {
    const { result } = renderHook(() => useSpeedControl());
    
    expect(result.current.state.settings.currentSpeed).toBe(1.0);
    expect(result.current.state.settings.minSpeed).toBe(0.1);
    expect(result.current.state.settings.maxSpeed).toBe(4.0);
  });

  test('loads saved speed from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('1.5');
    
    const { result } = renderHook(() => useSpeedControl());
    
    expect(result.current.state.settings.currentSpeed).toBe(1.5);
  });

  test('clamps speed to valid range', () => {
    const { result } = renderHook(() => useSpeedControl());
    
    act(() => {
      result.current.setSpeed(5.0); // Above max
    });
    
    expect(result.current.state.settings.currentSpeed).toBe(4.0);
    
    act(() => {
      result.current.setSpeed(0.05); // Below min
    });
    
    expect(result.current.state.settings.currentSpeed).toBe(0.1);
  });

  test('increases and decreases speed', () => {
    const { result } = renderHook(() => useSpeedControl());
    
    act(() => {
      result.current.increaseSpeed();
    });
    
    expect(result.current.state.settings.currentSpeed).toBe(1.1);
    
    act(() => {
      result.current.decreaseSpeed();
    });
    
    expect(result.current.state.settings.currentSpeed).toBe(1.0);
  });

  test('resets to default speed', () => {
    const { result } = renderHook(() => useSpeedControl());
    
    act(() => {
      result.current.setSpeed(2.0);
    });
    
    expect(result.current.state.settings.currentSpeed).toBe(2.0);
    
    act(() => {
      result.current.resetSpeed();
    });
    
    expect(result.current.state.settings.currentSpeed).toBe(1.0);
  });

  test('sends message when speed changes', () => {
    const { result } = renderHook(() => useSpeedControl());
    
    act(() => {
      result.current.setSpeed(1.5);
    });
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'SPEED_CHANGED',
      speed: 1.5,
      source: 'slider'
    });
  });

  test('saves speed to localStorage', (done) => {
    const { result } = renderHook(() => useSpeedControl());
    
    act(() => {
      result.current.setSpeed(1.8);
    });
    
    // Wait for debounced save
    setTimeout(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('tts-speech-speed', '1.8');
      done();
    }, 600);
  });
});
```

### Integration Tests

```typescript
// src/popup/components/__tests__/SpeedControl.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpeedControl } from '../speed/SpeedControl';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn()
};
global.localStorage = mockLocalStorage as any;

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn()
  }
} as any;

describe('SpeedControl Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('renders speed control components', () => {
    render(<SpeedControl />);
    
    expect(screen.getByText('Playbook Speed')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('1.0x')).toBeInTheDocument();
  });

  test('slider changes speed', async () => {
    const onSpeedChange = jest.fn();
    render(<SpeedControl onSpeedChange={onSpeedChange} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1.5' } });
    
    await waitFor(() => {
      expect(onSpeedChange).toHaveBeenCalledWith(
        expect.objectContaining({
          speed: 1.5,
          source: 'slider'
        })
      );
    });
  });

  test('preset buttons change speed', () => {
    const onSpeedChange = jest.fn();
    render(<SpeedControl onSpeedChange={onSpeedChange} />);
    
    const preset2x = screen.getByText('2x').closest('button');
    fireEvent.click(preset2x!);
    
    expect(onSpeedChange).toHaveBeenCalledWith(
      expect.objectContaining({
        speed: 2.0,
        source: 'preset'
      })
    );
  });

  test('increment/decrement buttons work', () => {
    const onSpeedChange = jest.fn();
    render(<SpeedControl onSpeedChange={onSpeedChange} />);
    
    const incrementButton = screen.getByTitle('Increase speed');
    fireEvent.click(incrementButton);
    
    expect(onSpeedChange).toHaveBeenCalledWith(
      expect.objectContaining({
        speed: 1.1,
        source: 'slider' // Buttons use setSpeed with default source
      })
    );
  });

  test('reset button works', () => {
    const onSpeedChange = jest.fn();
    render(<SpeedControl onSpeedChange={onSpeedChange} />);
    
    // First change speed
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '2.0' } });
    
    // Then reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    expect(onSpeedChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        speed: 1.0,
        source: 'reset'
      })
    );
  });

  test('keyboard shortcuts work', () => {
    const onSpeedChange = jest.fn();
    render(<SpeedControl onSpeedChange={onSpeedChange} />);
    
    // Arrow up to increase
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    
    expect(onSpeedChange).toHaveBeenCalledWith(
      expect.objectContaining({
        speed: 1.1,
        source: 'keyboard'
      })
    );
  });

  test('shows real-time feedback when playing', () => {
    render(<SpeedControl isPlaying={true} />);
    
    expect(screen.getByText('Speed changes apply in real-time')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
// e2e/speed-control.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Speed Control E2E', () => {
  test('speed control workflow', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Check initial speed display
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('1.0x');
    
    // Use slider to change speed
    const slider = page.locator('input[type="range"]');
    await slider.fill('1.5');
    
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('1.5x');
    
    // Use preset button
    await page.click('text=2x');
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('2.0x');
    
    // Reset speed
    await page.click('text=Reset');
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('1.0x');
  });

  test('keyboard shortcuts work', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Focus on the slider area
    await page.click('input[type="range"]');
    
    // Arrow up to increase
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('1.1x');
    
    // Arrow down to decrease
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('1.0x');
    
    // Ctrl+R to reset (after changing speed first)
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Control+r');
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('1.0x');
  });

  test('speed persists across sessions', async ({ page, context }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Change speed
    await page.fill('input[type="range"]', '1.8');
    await expect(page.locator('[data-testid="speed-display"]')).toContainText('1.8x');
    
    // Close and reopen popup
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('chrome-extension://extension-id/popup.html');
    
    // Speed should be remembered
    await expect(newPage.locator('[data-testid="speed-display"]')).toContainText('1.8x');
  });

  test('visual feedback during adjustment', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    const slider = page.locator('input[type="range"]');
    
    // Start dragging
    await slider.hover();
    await page.mouse.down();
    
    // Should show adjusting state
    await expect(page.locator('[data-testid="speed-display"]')).toHaveClass(/border-blue-200/);
    
    // Stop dragging
    await page.mouse.up();
    
    // Should return to normal state
    await expect(page.locator('[data-testid="speed-display"]')).not.toHaveClass(/border-blue-200/);
  });
});
```

## Success Metrics

### Performance Metrics
- **Response Time**: Speed changes apply within 100ms
- **Slider Smoothness**: 60fps during slider interaction
- **Keyboard Response**: Shortcut actions respond within 50ms
- **Memory Usage**: Speed control uses under 5MB memory

### User Experience Metrics
- **Speed Accuracy**: 99%+ accuracy in speed setting
- **Preset Usage**: 70%+ of users use preset buttons
- **Keyboard Shortcuts**: 30%+ of power users use shortcuts
- **Speed Persistence**: 95%+ accuracy in remembering speed settings

### Technical Metrics
- **Error Rate**: Less than 1% of speed changes fail
- **Cross-browser Compatibility**: 99%+ compatibility
- **Accessibility Score**: Perfect keyboard navigation
- **Test Coverage**: 95%+ code coverage

## Dependencies and Risks

### Internal Dependencies
- **Speech Synthesis API**: Core browser API for speed control
- **React Hooks**: State management for speed settings
- **Local Storage**: Persistence of speed preferences
- **Chrome Extension APIs**: Message passing for speed changes

### External Dependencies
- **Browser Support**: Speech synthesis rate property support
- **Keyboard Events**: Browser keyboard event handling
- **CSS Support**: Modern CSS features for styling
- **Touch Events**: Mobile/tablet touch support

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Speech API Rate Limits | High | Low | Graceful degradation, user feedback |
| Keyboard Conflicts | Medium | Medium | Configurable shortcuts, conflict detection |
| Performance Issues | Medium | Low | Debouncing, efficient rendering |
| Cross-browser Differences | Medium | Medium | Feature detection, polyfills |
| Touch Device Support | Medium | Medium | Touch-friendly controls, responsive design |

### Mitigation Strategies

1. **API Reliability**: Implement fallback mechanisms and clear error messages
2. **Performance**: Use debouncing and efficient state updates
3. **Accessibility**: Comprehensive keyboard support and screen reader compatibility
4. **Testing**: Extensive cross-browser and device testing
5. **User Experience**: Clear visual feedback and intuitive controls

### Rollback Plan
- Feature flags for disabling speed control if issues arise
- Fallback to simple speed presets if slider fails
- Quick disable mechanism for keyboard shortcuts
- Graceful degradation to basic speed adjustment