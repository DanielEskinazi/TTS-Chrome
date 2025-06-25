# Feature 3.4: Volume Control

## Feature Overview and Objectives

### Primary Objective
Implement a comprehensive volume control interface that allows users to adjust text-to-speech audio volume with precision, including mute functionality, visual feedback, and intelligent volume management across different audio contexts.

### Secondary Objectives
- Provide intuitive volume adjustment with visual and audio feedback
- Support quick mute/unmute functionality with volume restoration
- Implement volume presets for common use cases
- Enable real-time volume changes during playback
- Ensure accessibility for users with hearing impairments
- Persist volume preferences across sessions
- Integrate with system volume controls and audio ducking

### User Stories
- As a user, I want to adjust TTS volume independently from system volume
- As a user, I want to quickly mute and unmute TTS with one click
- As a user, I want visual feedback showing current volume level
- As a user, I want volume changes to apply immediately during playback
- As a user, I want my volume preference to be remembered across sessions
- As a user, I want volume presets for different listening environments
- As a hearing-impaired user, I want clear visual indicators for volume state

## Technical Requirements

### Functional Requirements
1. **Volume Range**: Support 0% to 100% volume control
2. **Volume Slider**: Smooth slider control with visual feedback
3. **Mute Toggle**: Quick mute/unmute with volume restoration
4. **Volume Presets**: Quick access buttons for common volume levels
5. **Real-time Adjustment**: Volume changes during active playback
6. **Visual Feedback**: Volume level indicator and waveform animation
7. **System Integration**: Respect system volume and audio ducking

### Non-Functional Requirements
1. **Responsiveness**: Volume changes apply within 50ms
2. **Precision**: Support 1% increments for fine control
3. **Accessibility**: Full keyboard navigation and screen reader support
4. **Performance**: Smooth slider interaction without audio glitches
5. **Persistence**: Remember volume and mute state across sessions
6. **Audio Quality**: No distortion or clipping at any volume level

### Volume Control Data Structure
```typescript
interface VolumeSettings {
  currentVolume: number;
  isMuted: boolean;
  previousVolume: number;
  minVolume: number;
  maxVolume: number;
  step: number;
  presets: number[];
}
```

## Implementation Steps

### Step 1: Volume Types and Interfaces

```typescript
// src/popup/types/volume.types.ts
export interface VolumeSettings {
  currentVolume: number;
  isMuted: boolean;
  previousVolume: number;
  minVolume: number;
  maxVolume: number;
  step: number;
  presets: number[];
  fadeInEnabled: boolean;
  fadeOutEnabled: boolean;
}

export interface VolumeState {
  settings: VolumeSettings;
  isPlaying: boolean;
  isAdjusting: boolean;
  visualLevel: number; // For animations
  audioContext: AudioContext | null;
  gainNode: GainNode | null;
  keyboardShortcutsEnabled: boolean;
}

export type VolumeChangeEvent = {
  volume: number;
  isMuted: boolean;
  source: 'slider' | 'preset' | 'keyboard' | 'mute' | 'system';
  timestamp: number;
};

export interface AudioVisualizationData {
  level: number;
  peak: number;
  average: number;
}
```

### Step 2: Volume Control Hook

```typescript
// src/popup/hooks/useVolumeControl.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { VolumeState, VolumeSettings, VolumeChangeEvent } from '../types/volume.types';

const DEFAULT_VOLUME_SETTINGS: VolumeSettings = {
  currentVolume: 80,
  isMuted: false,
  previousVolume: 80,
  minVolume: 0,
  maxVolume: 100,
  step: 5,
  presets: [25, 50, 75, 100],
  fadeInEnabled: true,
  fadeOutEnabled: true
};

export const useVolumeControl = () => {
  const [state, setState] = useState<VolumeState>({
    settings: DEFAULT_VOLUME_SETTINGS,
    isPlaying: false,
    isAdjusting: false,
    visualLevel: 0,
    audioContext: null,
    gainNode: null,
    keyboardShortcutsEnabled: true
  });

  const fadeTimeout = useRef<NodeJS.Timeout>();
  const visualAnimationFrame = useRef<number>();
  const onVolumeChangeRef = useRef<((event: VolumeChangeEvent) => void) | null>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const gainNode = audioContext.createGain();
        
        setState(prev => ({
          ...prev,
          audioContext,
          gainNode
        }));
      } catch (error) {
        console.warn('Failed to initialize audio context:', error);
      }
    };

    initAudioContext();
  }, []);

  // Load saved volume on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('tts-volume');
    const savedMuted = localStorage.getItem('tts-muted') === 'true';
    
    if (savedVolume) {
      const volume = parseInt(savedVolume, 10);
      if (volume >= 0 && volume <= 100) {
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            currentVolume: volume,
            previousVolume: volume,
            isMuted: savedMuted
          }
        }));
      }
    }
  }, []);

  // Save volume changes
  const saveVolumeSettings = useCallback((volume: number, isMuted: boolean) => {
    localStorage.setItem('tts-volume', volume.toString());
    localStorage.setItem('tts-muted', isMuted.toString());
  }, []);

  const setVolume = useCallback((newVolume: number, source: VolumeChangeEvent['source'] = 'slider') => {
    const clampedVolume = Math.max(0, Math.min(100, Math.round(newVolume)));
    
    setState(prev => {
      const newSettings = {
        ...prev.settings,
        currentVolume: clampedVolume,
        isMuted: clampedVolume === 0 ? true : prev.settings.isMuted
      };

      if (clampedVolume > 0 && prev.settings.isMuted) {
        newSettings.isMuted = false;
      }

      return {
        ...prev,
        settings: newSettings
      };
    });

    // Apply volume to Web Speech API
    const volumeRatio = clampedVolume / 100;
    if (state.gainNode) {
      if (state.settings.fadeInEnabled && source !== 'keyboard') {
        // Smooth volume transition
        state.gainNode.gain.setTargetAtTime(volumeRatio, state.audioContext!.currentTime, 0.1);
      } else {
        state.gainNode.gain.value = volumeRatio;
      }
    }

    const event: VolumeChangeEvent = {
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
      source,
      timestamp: Date.now()
    };

    // Notify parent component
    if (onVolumeChangeRef.current) {
      onVolumeChangeRef.current(event);
    }

    // Send message to content script/background
    chrome.runtime.sendMessage({
      type: 'VOLUME_CHANGED',
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
      source
    });

    saveVolumeSettings(clampedVolume, clampedVolume === 0);
  }, [state.audioContext, state.gainNode, state.settings.fadeInEnabled, saveVolumeSettings]);

  const toggleMute = useCallback(() => {
    setState(prev => {
      const newIsMuted = !prev.settings.isMuted;
      const newVolume = newIsMuted ? 0 : prev.settings.previousVolume;
      
      const newSettings = {
        ...prev.settings,
        isMuted: newIsMuted,
        currentVolume: newVolume,
        previousVolume: newIsMuted ? prev.settings.currentVolume : prev.settings.previousVolume
      };

      // Apply mute/unmute
      if (prev.gainNode) {
        const targetVolume = newIsMuted ? 0 : newVolume / 100;
        if (prev.settings.fadeOutEnabled) {
          prev.gainNode.gain.setTargetAtTime(targetVolume, prev.audioContext!.currentTime, 0.05);
        } else {
          prev.gainNode.gain.value = targetVolume;
        }
      }

      const event: VolumeChangeEvent = {
        volume: newVolume,
        isMuted: newIsMuted,
        source: 'mute',
        timestamp: Date.now()
      };

      if (onVolumeChangeRef.current) {
        onVolumeChangeRef.current(event);
      }

      chrome.runtime.sendMessage({
        type: 'VOLUME_CHANGED',
        volume: newVolume,
        isMuted: newIsMuted,
        source: 'mute'
      });

      saveVolumeSettings(newVolume, newIsMuted);

      return {
        ...prev,
        settings: newSettings
      };
    });
  }, [saveVolumeSettings]);

  const increaseVolume = useCallback(() => {
    const newVolume = Math.min(100, state.settings.currentVolume + state.settings.step);
    setVolume(newVolume, 'keyboard');
  }, [state.settings.currentVolume, state.settings.step, setVolume]);

  const decreaseVolume = useCallback(() => {
    const newVolume = Math.max(0, state.settings.currentVolume - state.settings.step);
    setVolume(newVolume, 'keyboard');
  }, [state.settings.currentVolume, state.settings.step, setVolume]);

  const setPresetVolume = useCallback((presetVolume: number) => {
    setVolume(presetVolume, 'preset');
  }, [setVolume]);

  const setAdjusting = useCallback((isAdjusting: boolean) => {
    setState(prev => ({
      ...prev,
      isAdjusting
    }));
  }, []);

  const setPlaying = useCallback((isPlaying: boolean) => {
    setState(prev => ({
      ...prev,
      isPlaying
    }));

    if (isPlaying) {
      // Start visual level animation
      const animateLevel = () => {
        setState(prev => ({
          ...prev,
          visualLevel: prev.settings.isMuted ? 0 : prev.settings.currentVolume
        }));
        
        if (state.isPlaying) {
          visualAnimationFrame.current = requestAnimationFrame(animateLevel);
        }
      };
      animateLevel();
    } else {
      // Stop animation
      if (visualAnimationFrame.current) {
        cancelAnimationFrame(visualAnimationFrame.current);
      }
      setState(prev => ({
        ...prev,
        visualLevel: 0
      }));
    }
  }, [state.isPlaying]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!state.keyboardShortcutsEnabled) return;

    switch (event.key) {
      case 'ArrowUp':
        if (event.shiftKey) {
          event.preventDefault();
          increaseVolume();
        }
        break;
      case 'ArrowDown':
        if (event.shiftKey) {
          event.preventDefault();
          decreaseVolume();
        }
        break;
      case 'm':
      case 'M':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          toggleMute();
        }
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const volumeLevel = parseInt(event.key) * 10;
          setVolume(volumeLevel, 'keyboard');
        }
        break;
    }
  }, [state.keyboardShortcutsEnabled, increaseVolume, decreaseVolume, toggleMute, setVolume]);

  // Register keyboard shortcuts
  useEffect(() => {
    if (state.keyboardShortcutsEnabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, state.keyboardShortcutsEnabled]);

  const registerVolumeChangeCallback = useCallback((callback: (event: VolumeChangeEvent) => void) => {
    onVolumeChangeRef.current = callback;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (fadeTimeout.current) {
        clearTimeout(fadeTimeout.current);
      }
      if (visualAnimationFrame.current) {
        cancelAnimationFrame(visualAnimationFrame.current);
      }
    };
  }, []);

  return {
    state,
    setVolume,
    toggleMute,
    increaseVolume,
    decreaseVolume,
    setPresetVolume,
    setAdjusting,
    setPlaying,
    registerVolumeChangeCallback
  };
};
```

### Step 3: Volume Control Components

```typescript
// src/popup/components/volume/VolumeControl.tsx
import React, { useEffect } from 'react';
import { VolumeSlider } from './VolumeSlider';
import { VolumePresets } from './VolumePresets';
import { VolumeDisplay } from './VolumeDisplay';
import { VolumeVisualizer } from './VolumeVisualizer';
import { VolumeKeyboardHelp } from './VolumeKeyboardHelp';
import { useVolumeControl } from '../../hooks/useVolumeControl';
import { VolumeChangeEvent } from '../../types/volume.types';

interface VolumeControlProps {
  isPlaying?: boolean;
  onVolumeChange?: (event: VolumeChangeEvent) => void;
  showVisualizer?: boolean;
  showKeyboardHelp?: boolean;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  isPlaying = false,
  onVolumeChange,
  showVisualizer = true,
  showKeyboardHelp = true
}) => {
  const volumeControl = useVolumeControl();

  // Update playing state
  useEffect(() => {
    volumeControl.setPlaying(isPlaying);
  }, [isPlaying, volumeControl]);

  // Register volume change callback
  useEffect(() => {
    if (onVolumeChange) {
      volumeControl.registerVolumeChangeCallback(onVolumeChange);
    }
  }, [onVolumeChange, volumeControl]);

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Volume Control</h3>
        <VolumeDisplay 
          volume={volumeControl.state.settings.currentVolume}
          isMuted={volumeControl.state.settings.isMuted}
          isAdjusting={volumeControl.state.isAdjusting}
        />
      </div>

      {showVisualizer && (
        <VolumeVisualizer
          level={volumeControl.state.visualLevel}
          isPlaying={volumeControl.state.isPlaying}
          isMuted={volumeControl.state.settings.isMuted}
        />
      )}

      <VolumeSlider
        volume={volumeControl.state.settings.currentVolume}
        isMuted={volumeControl.state.settings.isMuted}
        onVolumeChange={volumeControl.setVolume}
        onMuteToggle={volumeControl.toggleMute}
        onAdjustingChange={volumeControl.setAdjusting}
        isPlaying={volumeControl.state.isPlaying}
      />

      <VolumePresets
        currentVolume={volumeControl.state.settings.currentVolume}
        presets={volumeControl.state.settings.presets}
        onPresetSelect={volumeControl.setPresetVolume}
        isMuted={volumeControl.state.settings.isMuted}
      />

      {showKeyboardHelp && <VolumeKeyboardHelp />}
    </div>
  );
};
```

```typescript
// src/popup/components/volume/VolumeSlider.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface VolumeSliderProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onAdjustingChange: (isAdjusting: boolean) => void;
  isPlaying: boolean;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  onAdjustingChange,
  isPlaying
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const sliderRef = useRef<HTMLInputElement>(null);
  const updateTimer = useRef<NodeJS.Timeout>();

  // Sync local volume with prop
  useEffect(() => {
    if (!isDragging) {
      setLocalVolume(volume);
    }
  }, [volume, isDragging]);

  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(event.target.value, 10);
    setLocalVolume(newVolume);

    // Debounce updates during dragging
    if (updateTimer.current) {
      clearTimeout(updateTimer.current);
    }

    updateTimer.current = setTimeout(() => {
      onVolumeChange(newVolume);
    }, 50);
  }, [onVolumeChange]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
    onAdjustingChange(true);
  }, [onAdjustingChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onAdjustingChange(false);
    onVolumeChange(localVolume);
  }, [localVolume, onVolumeChange, onAdjustingChange]);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="h-5 w-5" />;
    } else if (volume < 50) {
      return <Volume1 className="h-5 w-5" />;
    } else {
      return <Volume2 className="h-5 w-5" />;
    }
  };

  const getVolumeColor = () => {
    if (isMuted) return 'text-red-500';
    if (volume < 30) return 'text-yellow-500';
    return 'text-blue-500';
  };

  // Calculate percentage for styling
  const displayVolume = isMuted ? 0 : localVolume;
  const percentage = displayVolume;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <button
          onClick={onMuteToggle}
          className={`
            p-2 rounded-full transition-all duration-200
            ${isMuted 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
            }
          `}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {getVolumeIcon()}
        </button>

        <div className="flex-1 relative">
          <input
            ref={sliderRef}
            type="range"
            min="0"
            max="100"
            step="1"
            value={displayVolume}
            onChange={handleSliderChange}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            disabled={isMuted}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer volume-slider focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isMuted 
                ? '#E5E7EB'
                : `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`
            }}
          />
          
          {/* Volume level markers */}
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        <div className={`text-sm font-medium w-10 text-right ${getVolumeColor()}`}>
          {isMuted ? '0%' : `${localVolume}%`}
        </div>
      </div>

      {/* Real-time feedback */}
      {isPlaying && (
        <div className="text-xs text-blue-600 flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span>Volume changes apply in real-time</span>
        </div>
      )}

      {/* Mute indicator */}
      {isMuted && (
        <div className="text-xs text-red-600 flex items-center space-x-1">
          <VolumeX className="h-3 w-3" />
          <span>Audio is muted</span>
        </div>
      )}
    </div>
  );
};
```

```typescript
// src/popup/components/volume/VolumePresets.tsx
import React from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumePresetsProps {
  currentVolume: number;
  presets: number[];
  onPresetSelect: (volume: number) => void;
  isMuted: boolean;
}

export const VolumePresets: React.FC<VolumePresetsProps> = ({
  currentVolume,
  presets,
  onPresetSelect,
  isMuted
}) => {
  const getPresetIcon = (volume: number) => {
    if (volume === 0) return <VolumeX className="h-3 w-3" />;
    if (volume < 50) return <Volume1 className="h-3 w-3" />;
    return <Volume2 className="h-3 w-3" />;
  };

  const getPresetLabel = (volume: number): string => {
    if (volume === 0) return 'Mute';
    if (volume <= 25) return 'Quiet';
    if (volume <= 50) return 'Low';
    if (volume <= 75) return 'Medium';
    return 'High';
  };

  const isActivePreset = (preset: number): boolean => {
    return !isMuted && Math.abs(currentVolume - preset) <= 2;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Quick Levels</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const isActive = isActivePreset(preset);
          
          return (
            <button
              key={preset}
              onClick={() => onPresetSelect(preset)}
              className={`
                px-2 py-2 rounded-md text-xs font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }
              `}
              title={`${getPresetLabel(preset)} - ${preset}%`}
            >
              <div className="flex flex-col items-center space-y-1">
                {getPresetIcon(preset)}
                <span className="font-semibold">{preset}%</span>
                <span className="opacity-75 text-xs">
                  {getPresetLabel(preset)}
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
// src/popup/components/volume/VolumeDisplay.tsx
import React from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface VolumeDisplayProps {
  volume: number;
  isMuted: boolean;
  isAdjusting: boolean;
}

export const VolumeDisplay: React.FC<VolumeDisplayProps> = ({
  volume,
  isMuted,
  isAdjusting
}) => {
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="h-4 w-4 text-red-500" />;
    } else if (volume < 50) {
      return <Volume1 className="h-4 w-4 text-yellow-500" />;
    } else {
      return <Volume2 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getVolumeColor = () => {
    if (isMuted) return 'text-red-600';
    if (volume < 30) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getVolumeDescription = (volume: number, isMuted: boolean): string => {
    if (isMuted) return 'Muted';
    if (volume === 0) return 'Silent';
    if (volume <= 25) return 'Quiet';
    if (volume <= 50) return 'Low';
    if (volume <= 75) return 'Medium';
    return 'High';
  };

  const displayVolume = isMuted ? 0 : volume;

  return (
    <div className={`
      flex items-center space-x-2 px-3 py-1 rounded-md
      ${isAdjusting ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}
      transition-colors duration-200
    `}>
      {getVolumeIcon()}
      <div className="text-right">
        <div className={`text-sm font-semibold ${getVolumeColor()}`}>
          {displayVolume}%
        </div>
        <div className="text-xs text-gray-500">
          {getVolumeDescription(volume, isMuted)}
        </div>
      </div>
    </div>
  );
};
```

```typescript
// src/popup/components/volume/VolumeVisualizer.tsx
import React from 'react';

interface VolumeVisualizerProps {
  level: number;
  isPlaying: boolean;
  isMuted: boolean;
}

export const VolumeVisualizer: React.FC<VolumeVisualizerProps> = ({
  level,
  isPlaying,
  isMuted
}) => {
  const barCount = 20;
  const activeCount = Math.floor((level / 100) * barCount);

  const getBarColor = (index: number): string => {
    if (isMuted) return 'bg-gray-300';
    if (index < activeCount * 0.6) return 'bg-green-500';
    if (index < activeCount * 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getBarHeight = (index: number): string => {
    const baseHeight = 4 + (index % 3) * 2; // Vary bar heights slightly
    if (!isPlaying || isMuted) return `${baseHeight}px`;
    
    if (index < activeCount) {
      const animation = isPlaying ? 'animate-pulse' : '';
      return `${baseHeight + Math.random() * 4}px`;
    }
    return `${baseHeight}px`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">Audio Level</span>
        <span className="text-xs text-gray-500">
          {isPlaying ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      <div className="flex items-end justify-center space-x-1 h-8">
        {Array.from({ length: barCount }).map((_, index) => (
          <div
            key={index}
            className={`
              w-2 rounded-t transition-all duration-100
              ${index < activeCount ? getBarColor(index) : 'bg-gray-300'}
              ${isPlaying && index < activeCount ? 'animate-pulse' : ''}
            `}
            style={{
              height: getBarHeight(index),
              opacity: isMuted ? 0.3 : 1
            }}
          />
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
};
```

```typescript
// src/popup/components/volume/VolumeKeyboardHelp.tsx
import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp } from 'lucide-react';

export const VolumeKeyboardHelp: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shortcuts = [
    { keys: 'Shift + ↑', action: 'Increase volume' },
    { keys: 'Shift + ↓', action: 'Decrease volume' },
    { keys: 'Ctrl/Cmd + M', action: 'Toggle mute' },
    { keys: 'Ctrl/Cmd + 0-9', action: 'Set volume (0-90%)' }
  ];

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-xs text-gray-600 hover:text-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-1">
          <Keyboard className="h-3 w-3" />
          <span>Volume Shortcuts</span>
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

### Step 4: CSS Styles for Volume Slider

```css
/* src/popup/styles/volume-slider.css */
.volume-slider::-webkit-slider-thumb {
  appearance: none;
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: #3B82F6;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  background: #2563EB;
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.volume-slider::-webkit-slider-thumb:active {
  transform: scale(1.2);
}

.volume-slider:disabled::-webkit-slider-thumb {
  background: #9CA3AF;
  cursor: not-allowed;
}

.volume-slider::-moz-range-thumb {
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: #3B82F6;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.volume-slider::-moz-range-thumb:hover {
  background: #2563EB;
  transform: scale(1.1);
}

.volume-slider:focus {
  outline: none;
}

.volume-slider:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* Muted state styling */
.volume-slider:disabled {
  opacity: 0.5;
}

.volume-slider:disabled::-webkit-slider-thumb {
  background: #DC2626;
}
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// src/popup/hooks/__tests__/useVolumeControl.test.ts
import { renderHook, act } from '@testing-library/react';
import { useVolumeControl } from '../useVolumeControl';

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn().mockReturnValue({
    gain: {
      value: 1,
      setTargetAtTime: jest.fn()
    }
  }),
  currentTime: 0
}));

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

describe('useVolumeControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('initializes with default volume', () => {
    const { result } = renderHook(() => useVolumeControl());
    
    expect(result.current.state.settings.currentVolume).toBe(80);
    expect(result.current.state.settings.isMuted).toBe(false);
  });

  test('loads saved volume from localStorage', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'tts-volume') return '60';
      if (key === 'tts-muted') return 'false';
      return null;
    });
    
    const { result } = renderHook(() => useVolumeControl());
    
    expect(result.current.state.settings.currentVolume).toBe(60);
    expect(result.current.state.settings.isMuted).toBe(false);
  });

  test('clamps volume to valid range', () => {
    const { result } = renderHook(() => useVolumeControl());
    
    act(() => {
      result.current.setVolume(150); // Above max
    });
    
    expect(result.current.state.settings.currentVolume).toBe(100);
    
    act(() => {
      result.current.setVolume(-10); // Below min
    });
    
    expect(result.current.state.settings.currentVolume).toBe(0);
  });

  test('toggles mute correctly', () => {
    const { result } = renderHook(() => useVolumeControl());
    
    // Set initial volume
    act(() => {
      result.current.setVolume(75);
    });
    
    // Mute
    act(() => {
      result.current.toggleMute();
    });
    
    expect(result.current.state.settings.isMuted).toBe(true);
    expect(result.current.state.settings.currentVolume).toBe(0);
    expect(result.current.state.settings.previousVolume).toBe(75);
    
    // Unmute
    act(() => {
      result.current.toggleMute();
    });
    
    expect(result.current.state.settings.isMuted).toBe(false);
    expect(result.current.state.settings.currentVolume).toBe(75);
  });

  test('increases and decreases volume', () => {
    const { result } = renderHook(() => useVolumeControl());
    
    act(() => {
      result.current.increaseVolume();
    });
    
    expect(result.current.state.settings.currentVolume).toBe(85); // 80 + 5
    
    act(() => {
      result.current.decreaseVolume();
    });
    
    expect(result.current.state.settings.currentVolume).toBe(80); // 85 - 5
  });

  test('sends message when volume changes', () => {
    const { result } = renderHook(() => useVolumeControl());
    
    act(() => {
      result.current.setVolume(90);
    });
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'VOLUME_CHANGED',
      volume: 90,
      isMuted: false,
      source: 'slider'
    });
  });

  test('saves volume to localStorage', () => {
    const { result } = renderHook(() => useVolumeControl());
    
    act(() => {
      result.current.setVolume(65);
    });
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('tts-volume', '65');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('tts-muted', 'false');
  });
});
```

### Integration Tests

```typescript
// src/popup/components/__tests__/VolumeControl.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VolumeControl } from '../volume/VolumeControl';

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn().mockReturnValue({
    gain: {
      value: 1,
      setTargetAtTime: jest.fn()
    }
  }),
  currentTime: 0
}));

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

describe('VolumeControl Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('renders volume control components', () => {
    render(<VolumeControl />);
    
    expect(screen.getByText('Volume Control')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument(); // Default volume
  });

  test('slider changes volume', async () => {
    const onVolumeChange = jest.fn();
    render(<VolumeControl onVolumeChange={onVolumeChange} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '60' } });
    
    await waitFor(() => {
      expect(onVolumeChange).toHaveBeenCalledWith(
        expect.objectContaining({
          volume: 60,
          isMuted: false,
          source: 'slider'
        })
      );
    });
  });

  test('mute button toggles mute state', () => {
    const onVolumeChange = jest.fn();
    render(<VolumeControl onVolumeChange={onVolumeChange} />);
    
    const muteButton = screen.getByTitle('Mute');
    fireEvent.click(muteButton);
    
    expect(onVolumeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        volume: 0,
        isMuted: true,
        source: 'mute'
      })
    );
  });

  test('preset buttons change volume', () => {
    const onVolumeChange = jest.fn();
    render(<VolumeControl onVolumeChange={onVolumeChange} />);
    
    const preset50 = screen.getByText('50%').closest('button');
    fireEvent.click(preset50!);
    
    expect(onVolumeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        volume: 50,
        source: 'preset'
      })
    );
  });

  test('shows mute indicator when muted', () => {
    render(<VolumeControl />);
    
    const muteButton = screen.getByTitle('Mute');
    fireEvent.click(muteButton);
    
    expect(screen.getByText('Audio is muted')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('shows real-time feedback when playing', () => {
    render(<VolumeControl isPlaying={true} />);
    
    expect(screen.getByText('Volume changes apply in real-time')).toBeInTheDocument();
  });

  test('keyboard shortcuts work', () => {
    const onVolumeChange = jest.fn();
    render(<VolumeControl onVolumeChange={onVolumeChange} />);
    
    // Focus on component
    fireEvent.click(screen.getByRole('slider'));
    
    // Shift+Up to increase volume
    fireEvent.keyDown(document, { key: 'ArrowUp', shiftKey: true });
    
    expect(onVolumeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        volume: 85, // 80 + 5
        source: 'keyboard'
      })
    );
  });
});
```

### E2E Tests

```typescript
// e2e/volume-control.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Volume Control E2E', () => {
  test('volume control workflow', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Check initial volume display
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('80%');
    
    // Use slider to change volume
    const slider = page.locator('input[type="range"]');
    await slider.fill('60');
    
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('60%');
    
    // Use preset button
    await page.click('text=25%');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('25%');
    
    // Test mute functionality
    await page.click('[title="Mute"]');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('0%');
    await expect(page.locator('text=Audio is muted')).toBeVisible();
    
    // Unmute
    await page.click('[title="Unmute"]');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('25%');
  });

  test('volume visualizer responds to changes', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Set volume to 100%
    await page.fill('input[type="range"]', '100');
    
    // Start playback simulation
    await page.evaluate(() => {
      // Simulate playing state
      window.dispatchEvent(new CustomEvent('tts-playing', { detail: { isPlaying: true } }));
    });
    
    // Check visualizer bars are active
    const visualizerBars = page.locator('[data-testid="visualizer-bar"]');
    await expect(visualizerBars.first()).toHaveClass(/bg-green-500|bg-yellow-500|bg-red-500/);
    
    // Mute and check bars become inactive
    await page.click('[title="Mute"]');
    await expect(visualizerBars.first()).toHaveClass(/bg-gray-300/);
  });

  test('keyboard shortcuts work', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Focus on the volume control area
    await page.click('input[type="range"]');
    
    // Shift+Up to increase volume
    await page.keyboard.press('Shift+ArrowUp');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('85%');
    
    // Shift+Down to decrease volume
    await page.keyboard.press('Shift+ArrowDown');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('80%');
    
    // Ctrl+M to mute
    await page.keyboard.press('Control+m');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('0%');
    
    // Ctrl+5 to set 50% volume
    await page.keyboard.press('Control+5');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('50%');
  });

  test('volume persists across sessions', async ({ page, context }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Change volume
    await page.fill('input[type="range"]', '35');
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('35%');
    
    // Close and reopen popup
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('chrome-extension://extension-id/popup.html');
    
    // Volume should be remembered
    await expect(newPage.locator('[data-testid="volume-display"]')).toContainText('35%');
  });
});
```

## Success Metrics

### Performance Metrics
- **Response Time**: Volume changes apply within 50ms
- **Slider Smoothness**: 60fps during slider interaction
- **Audio Quality**: No distortion or clipping at any volume level
- **Memory Usage**: Volume control uses under 8MB memory

### User Experience Metrics
- **Volume Accuracy**: 99%+ accuracy in volume setting
- **Mute Usage**: 60%+ of users use mute functionality
- **Preset Usage**: 50%+ of users use volume presets
- **Visual Feedback**: 90%+ user satisfaction with visualizer

### Technical Metrics
- **Error Rate**: Less than 1% of volume operations fail
- **Cross-browser Compatibility**: 99%+ compatibility
- **Accessibility Score**: Perfect keyboard navigation and screen reader support
- **Test Coverage**: 95%+ code coverage

## Dependencies and Risks

### Internal Dependencies
- **Web Audio API**: Advanced audio control and processing
- **Speech Synthesis API**: Core volume control integration
- **React State Management**: Volume state and preferences
- **Local Storage**: Persistence of volume settings

### External Dependencies
- **Browser Audio Support**: Web Audio API availability
- **System Audio**: Integration with system volume controls
- **Hardware Support**: Audio output device compatibility
- **Permissions**: Audio permissions and autoplay policies

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Web Audio API Limitations | High | Low | Fallback to basic volume control |
| Audio Context Restrictions | High | Medium | User gesture requirements, clear prompts |
| Cross-browser Audio Differences | Medium | Medium | Comprehensive testing, feature detection |
| Performance with Audio Processing | Medium | Low | Efficient audio node management |
| Mobile Audio Restrictions | Medium | High | Touch-first design, clear feedback |

### Mitigation Strategies

1. **API Compatibility**: Implement graceful degradation for unsupported features
2. **Performance**: Efficient audio processing and memory management
3. **User Experience**: Clear visual feedback and intuitive controls
4. **Testing**: Comprehensive audio testing across devices and browsers
5. **Accessibility**: Full support for assistive technologies

### Rollback Plan
- Feature flags for disabling advanced audio features
- Fallback to basic Speech Synthesis API volume control
- Quick disable mechanism for audio visualizer
- Graceful degradation to simple volume slider
- Emergency mute functionality always available