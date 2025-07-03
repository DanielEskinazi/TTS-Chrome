# Component Implementation Examples

## Design System CSS

```css
/* src/popup/styles/design-system.css */
:root {
  /* Colors */
  --primary-blue: #1976D2;
  --primary-hover: #1565C0;
  --primary-active: #0D47A1;
  
  --status-ready: #4CAF50;
  --status-speaking: #2196F3;
  --status-paused: #FF9800;
  --status-error: #F44336;
  
  --neutral-900: #212121;
  --neutral-700: #616161;
  --neutral-500: #9E9E9E;
  --neutral-300: #E0E0E0;
  --neutral-100: #F5F5F5;
  --neutral-000: #FFFFFF;
  
  /* Typography */
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
}

/* Global Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 320px;
  font-family: var(--font-primary);
  font-size: var(--text-base);
  color: var(--neutral-900);
  background: var(--neutral-000);
  padding: var(--space-4);
}
```

## Status Indicator Component

```tsx
// src/popup/components/ui/StatusIndicator.tsx
import React from 'react';
import './StatusIndicator.css';

export type TTSStatus = 'ready' | 'speaking' | 'paused' | 'error';

interface StatusIndicatorProps {
  status: TTSStatus;
  errorMessage?: string;
}

const statusConfig = {
  ready: { icon: '🟢', text: 'Ready to speak', className: 'status-ready' },
  speaking: { icon: '🔵', text: 'Speaking...', className: 'status-speaking' },
  paused: { icon: '🟠', text: 'Paused', className: 'status-paused' },
  error: { icon: '🔴', text: 'Error', className: 'status-error' }
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, errorMessage }) => {
  const config = statusConfig[status];
  
  return (
    <div className={`status-indicator ${config.className}`}>
      <span className="status-icon" aria-hidden="true">{config.icon}</span>
      <span className="status-text">
        {status === 'error' && errorMessage ? errorMessage : config.text}
      </span>
    </div>
  );
};
```

```css
/* src/popup/components/ui/StatusIndicator.css */
.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--neutral-100);
  border-radius: var(--radius-md);
  font-size: var(--text-lg);
  font-weight: 500;
  transition: all var(--transition-base);
}

.status-icon {
  font-size: 12px;
  line-height: 1;
}

.status-speaking .status-icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.status-ready { color: var(--status-ready); }
.status-speaking { color: var(--status-speaking); }
.status-paused { color: var(--status-paused); }
.status-error { color: var(--status-error); }
```

## Primary Action Button Component

```tsx
// src/popup/components/ui/PrimaryActionButton.tsx
import React from 'react';
import './PrimaryActionButton.css';

interface PrimaryActionButtonProps {
  status: 'ready' | 'speaking' | 'paused';
  onClick: () => void;
  disabled?: boolean;
}

const buttonConfig = {
  ready: { icon: '▶️', text: 'Speak', className: 'btn-ready' },
  speaking: { icon: '⏸️', text: 'Pause', className: 'btn-speaking' },
  paused: { icon: '▶️', text: 'Resume', className: 'btn-paused' }
};

export const PrimaryActionButton: React.FC<PrimaryActionButtonProps> = ({ 
  status, 
  onClick, 
  disabled = false 
}) => {
  const config = buttonConfig[status];
  
  return (
    <button
      className={`primary-action-button ${config.className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={config.text}
    >
      <span className="btn-icon" aria-hidden="true">{config.icon}</span>
      <span className="btn-text">{config.text}</span>
    </button>
  );
};
```

```css
/* src/popup/components/ui/PrimaryActionButton.css */
.primary-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  height: 44px;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 600;
  background: var(--primary-blue);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.primary-action-button:hover:not(:disabled) {
  background: var(--primary-hover);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.primary-action-button:active:not(:disabled) {
  background: var(--primary-active);
  transform: scale(0.98);
  box-shadow: none;
}

.primary-action-button:disabled {
  background: var(--neutral-300);
  color: var(--neutral-500);
  cursor: not-allowed;
  box-shadow: none;
}

.btn-paused {
  background: var(--status-paused);
}

.btn-paused:hover:not(:disabled) {
  background: #F57C00;
}
```

## Speed Control Component

```tsx
// src/popup/components/ui/SpeedControl.tsx
import React from 'react';
import './SpeedControl.css';

interface SpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
}

const speeds = [0.75, 1, 1.25, 1.5, 2];

export const SpeedControl: React.FC<SpeedControlProps> = ({ currentSpeed, onSpeedChange }) => {
  return (
    <div className="control-group">
      <label className="control-label">Speed:</label>
      <div className="speed-buttons">
        {speeds.map(speed => (
          <button
            key={speed}
            className={`speed-button ${currentSpeed === speed ? 'active' : ''}`}
            onClick={() => onSpeedChange(speed)}
            aria-label={`Set speed to ${speed}x`}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Volume Control Component

```tsx
// src/popup/components/ui/VolumeControl.tsx
import React from 'react';
import './VolumeControl.css';

interface VolumeControlProps {
  currentVolume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

const volumePresets = [
  { label: 'Quiet', value: 50 },
  { label: 'Normal', value: 75 },
  { label: 'Loud', value: 100 }
];

export const VolumeControl: React.FC<VolumeControlProps> = ({ 
  currentVolume, 
  isMuted, 
  onVolumeChange, 
  onMuteToggle 
}) => {
  return (
    <div className="control-group">
      <label className="control-label">Volume:</label>
      <div className="volume-controls">
        <button
          className={`mute-button ${isMuted ? 'muted' : ''}`}
          onClick={onMuteToggle}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <div className="volume-buttons">
          {volumePresets.map(preset => (
            <button
              key={preset.value}
              className={`volume-button ${currentVolume === preset.value ? 'active' : ''}`}
              onClick={() => onVolumeChange(preset.value)}
              disabled={isMuted}
              aria-label={`Set volume to ${preset.label}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Main Popup Component Structure

```tsx
// src/popup/components/Popup.tsx
import React, { useState, useEffect } from 'react';
import { StatusIndicator } from './ui/StatusIndicator';
import { PrimaryActionButton } from './ui/PrimaryActionButton';
import { VoiceSelector } from './ui/VoiceSelector';
import { SpeedControl } from './ui/SpeedControl';
import { VolumeControl } from './ui/VolumeControl';
import './Popup.css';

export const Popup: React.FC = () => {
  const [status, setStatus] = useState<'ready' | 'speaking' | 'paused'>('ready');
  const [selectedVoice, setSelectedVoice] = useState('Samantha');
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);

  const handlePrimaryAction = () => {
    switch (status) {
      case 'ready':
        // Start speaking
        chrome.runtime.sendMessage({ action: 'start' });
        setStatus('speaking');
        break;
      case 'speaking':
        // Pause
        chrome.runtime.sendMessage({ action: 'pause' });
        setStatus('paused');
        break;
      case 'paused':
        // Resume
        chrome.runtime.sendMessage({ action: 'resume' });
        setStatus('speaking');
        break;
    }
  };

  return (
    <div className="popup-container">
      <StatusIndicator status={status} />
      
      <PrimaryActionButton 
        status={status} 
        onClick={handlePrimaryAction}
      />
      
      <VoiceSelector 
        value={selectedVoice}
        onChange={setSelectedVoice}
      />
      
      <SpeedControl 
        currentSpeed={speed}
        onSpeedChange={setSpeed}
      />
      
      <VolumeControl
        currentVolume={volume}
        isMuted={isMuted}
        onVolumeChange={setVolume}
        onMuteToggle={() => setIsMuted(!isMuted)}
      />
      
      <button className="settings-button">
        ⚙️ Advanced Settings
      </button>
    </div>
  );
};
```

```css
/* src/popup/components/Popup.css */
.popup-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.control-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--neutral-700);
}

.settings-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  height: 32px;
  margin-top: var(--space-2);
  background: transparent;
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--neutral-700);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.settings-button:hover {
  background: var(--neutral-100);
  border-color: var(--neutral-500);
}
```

## Migration Notes

### From Current Implementation

1. **Replace popup.html** with new structure
2. **Update webpack config** to include new CSS files
3. **Preserve existing message handlers** in background script
4. **Map current state** to new status values
5. **Update chrome.storage** keys if needed

### Testing Checklist

- [ ] All keyboard shortcuts work
- [ ] State persists across popup close/open
- [ ] Voice selection updates TTS
- [ ] Speed changes apply immediately
- [ ] Volume/mute works correctly
- [ ] Error states display properly
- [ ] Settings migrate correctly