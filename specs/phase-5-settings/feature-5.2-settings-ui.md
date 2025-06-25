# Feature 5.2: Settings UI

## Feature Overview and Objectives

### Overview
Create a comprehensive, user-friendly settings interface that allows users to customize all aspects of the TTS Chrome Extension. The UI should be intuitive, accessible, and provide real-time feedback for all configuration changes.

### Objectives
- Design intuitive settings interface following Chrome extension UI patterns
- Implement real-time settings preview and validation
- Provide categorized settings organization for better UX
- Ensure accessibility compliance (WCAG 2.1 AA)
- Enable settings import/export functionality
- Support both light and dark themes

### Key Benefits
- Enhanced user control over TTS experience
- Improved accessibility for diverse user needs
- Reduced support requests through clear UI
- Increased user engagement and retention
- Professional appearance matching Chrome standards

## Technical Requirements

### Functional Requirements
- **FR-5.2.1**: Provide tabbed interface for settings categories
- **FR-5.2.2**: Implement real-time voice preview functionality
- **FR-5.2.3**: Support settings search and filtering
- **FR-5.2.4**: Enable settings import/export as JSON
- **FR-5.2.5**: Provide settings reset functionality with confirmation
- **FR-5.2.6**: Display storage usage and limits
- **FR-5.2.7**: Show sync status across devices

### Non-Functional Requirements
- **NFR-5.2.1**: Settings UI must load within 300ms
- **NFR-5.2.2**: All controls must be keyboard accessible
- **NFR-5.2.3**: Support screen readers and assistive technologies
- **NFR-5.2.4**: Responsive design supporting 320px minimum width
- **NFR-5.2.5**: Color contrast ratio of 4.5:1 minimum
- **NFR-5.2.6**: Settings changes must persist within 1 second

### UI Component Architecture
```typescript
interface SettingsUIProps {
  initialSettings: StorageSchema['settings'];
  onSettingsChange: (settings: Partial<StorageSchema['settings']>) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}

interface SettingsCategory {
  id: string;
  title: string;
  icon: React.ComponentType;
  component: React.ComponentType<any>;
  badge?: number;
}
```

## Implementation Steps

### Step 1: Settings UI Container Component
```typescript
// src/components/settings/SettingsUI.tsx
import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { useSettings } from '../../hooks/useSettings';
import { VoiceSettings } from './tabs/VoiceSettings';
import { UISettings } from './tabs/UISettings';
import { BehaviorSettings } from './tabs/BehaviorSettings';
import { AdvancedSettings } from './tabs/AdvancedSettings';
import { SettingsHeader } from './SettingsHeader';
import { SettingsFooter } from './SettingsFooter';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';
import type { StorageSchema } from '../../types/storage';

import './SettingsUI.css';

const SETTINGS_TABS = [
  {
    id: 'voice',
    title: 'Voice & Speech',
    icon: '🎤',
    component: VoiceSettings,
  },
  {
    id: 'ui',
    title: 'Interface',
    icon: '🎨',
    component: UISettings,
  },
  {
    id: 'behavior',
    title: 'Behavior',
    icon: '⚙️',
    component: BehaviorSettings,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    icon: '🔧',
    component: AdvancedSettings,
  },
];

export const SettingsUI: React.FC = () => {
  const { settings, updateSettings, resetSettings, loading } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSettingsChange = async (
    partial: Partial<StorageSchema['settings']>
  ) => {
    try {
      await updateSettings(partial);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Show error toast
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ 
      encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `tts-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        await updateSettings(importedSettings);
        // Show success toast
      } catch (error) {
        console.error('Failed to import settings:', error);
        // Show error toast
      }
    };
    reader.readAsText(file);
  };

  const handleResetSettings = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all settings to defaults? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await resetSettings();
        // Show success toast
      } catch (error) {
        console.error('Failed to reset settings:', error);
        // Show error toast
      }
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <LoadingSpinner />
        <p>Loading settings...</p>
      </div>
    );
  }

  const filteredTabs = SETTINGS_TABS.filter(tab =>
    searchQuery === '' || 
    tab.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ErrorBoundary>
      <div className="settings-ui">
        <SettingsHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onExport={handleExportSettings}
          onImport={handleImportSettings}
          onReset={handleResetSettings}
          hasUnsavedChanges={hasUnsavedChanges}
        />

        <Tabs 
          selectedIndex={activeTab} 
          onSelect={setActiveTab}
          className="settings-tabs"
        >
          <TabList className="settings-tab-list">
            {filteredTabs.map((tab, index) => (
              <Tab key={tab.id} className="settings-tab">
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-title">{tab.title}</span>
              </Tab>
            ))}
          </TabList>

          {filteredTabs.map((tab) => (
            <TabPanel key={tab.id} className="settings-tab-panel">
              <tab.component
                settings={settings}
                onSettingsChange={handleSettingsChange}
                onMarkUnsaved={() => setHasUnsavedChanges(true)}
              />
            </TabPanel>
          ))}
        </Tabs>

        <SettingsFooter />
      </div>
    </ErrorBoundary>
  );
};
```

### Step 2: Voice Settings Tab
```typescript
// src/components/settings/tabs/VoiceSettings.tsx
import React, { useState, useEffect } from 'react';
import { VoiceSelector } from '../../voice/VoiceSelector';
import { VoicePreview } from '../../voice/VoicePreview';
import { SettingsGroup } from '../SettingsGroup';
import { RangeSlider } from '../controls/RangeSlider';
import { Toggle } from '../controls/Toggle';
import type { StorageSchema } from '../../../types/storage';

interface VoiceSettingsProps {
  settings: StorageSchema['settings'];
  onSettingsChange: (settings: Partial<StorageSchema['settings']>) => void;
  onMarkUnsaved: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  settings,
  onSettingsChange,
  onMarkUnsaved,
}) => {
  const [previewText, setPreviewText] = useState(
    'This is a preview of how the selected voice will sound with your current settings.'
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVoiceChange = (voiceId: string) => {
    onSettingsChange({
      voice: { ...settings.voice, selectedVoice: voiceId }
    });
    onMarkUnsaved();
  };

  const handleRateChange = (rate: number) => {
    onSettingsChange({
      voice: { ...settings.voice, rate }
    });
    onMarkUnsaved();
  };

  const handlePitchChange = (pitch: number) => {
    onSettingsChange({
      voice: { ...settings.voice, pitch }
    });
    onMarkUnsaved();
  };

  const handleVolumeChange = (volume: number) => {
    onSettingsChange({
      voice: { ...settings.voice, volume }
    });
    onMarkUnsaved();
  };

  return (
    <div className="voice-settings">
      <SettingsGroup 
        title="Voice Selection"
        description="Choose your preferred text-to-speech voice"
      >
        <VoiceSelector
          selectedVoice={settings.voice.selectedVoice}
          onVoiceChange={handleVoiceChange}
          showFavorites={true}
        />
      </SettingsGroup>

      <SettingsGroup 
        title="Voice Preview"
        description="Test your voice settings"
      >
        <div className="voice-preview-container">
          <textarea
            className="preview-text-input"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Enter text to preview..."
            rows={3}
          />
          <VoicePreview
            text={previewText}
            voiceSettings={settings.voice}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup 
        title="Speech Rate"
        description="Control how fast the voice speaks"
      >
        <RangeSlider
          value={settings.voice.rate}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={handleRateChange}
          formatValue={(value) => `${value}x`}
          presets={[
            { label: 'Slow', value: 0.8 },
            { label: 'Normal', value: 1.0 },
            { label: 'Fast', value: 1.5 },
          ]}
        />
      </SettingsGroup>

      <SettingsGroup 
        title="Voice Pitch"
        description="Adjust the voice pitch/tone"
      >
        <RangeSlider
          value={settings.voice.pitch}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={handlePitchChange}
          formatValue={(value) => `${value}x`}
          presets={[
            { label: 'Low', value: 0.8 },
            { label: 'Normal', value: 1.0 },
            { label: 'High', value: 1.2 },
          ]}
        />
      </SettingsGroup>

      <SettingsGroup 
        title="Volume"
        description="Control the playback volume"
      >
        <RangeSlider
          value={settings.voice.volume}
          min={0.0}
          max={1.0}
          step={0.05}
          onChange={handleVolumeChange}
          formatValue={(value) => `${Math.round(value * 100)}%`}
          presets={[
            { label: 'Quiet', value: 0.5 },
            { label: 'Normal', value: 0.8 },
            { label: 'Loud', value: 1.0 },
          ]}
        />
      </SettingsGroup>
    </div>
  );
};
```

### Step 3: UI Settings Tab
```typescript
// src/components/settings/tabs/UISettings.tsx
import React from 'react';
import { SettingsGroup } from '../SettingsGroup';
import { RadioGroup } from '../controls/RadioGroup';
import { Toggle } from '../controls/Toggle';
import { ColorPicker } from '../controls/ColorPicker';
import type { StorageSchema } from '../../../types/storage';

interface UISettingsProps {
  settings: StorageSchema['settings'];
  onSettingsChange: (settings: Partial<StorageSchema['settings']>) => void;
  onMarkUnsaved: () => void;
}

export const UISettings: React.FC<UISettingsProps> = ({
  settings,
  onSettingsChange,
  onMarkUnsaved,
}) => {
  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    onSettingsChange({
      ui: { ...settings.ui, theme }
    });
    onMarkUnsaved();
  };

  const handlePositionChange = (position: string) => {
    onSettingsChange({
      ui: { ...settings.ui, position: position as any }
    });
    onMarkUnsaved();
  };

  const handleAutoHideChange = (autoHide: boolean) => {
    onSettingsChange({
      ui: { ...settings.ui, autoHide }
    });
    onMarkUnsaved();
  };

  const handleShowShortcutsChange = (showKeyboardShortcuts: boolean) => {
    onSettingsChange({
      ui: { ...settings.ui, showKeyboardShortcuts }
    });
    onMarkUnsaved();
  };

  return (
    <div className="ui-settings">
      <SettingsGroup 
        title="Theme"
        description="Choose the appearance of the extension"
      >
        <RadioGroup
          name="theme"
          value={settings.ui.theme}
          onChange={handleThemeChange}
          options={[
            { value: 'light', label: 'Light', description: 'Always use light theme' },
            { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
            { value: 'auto', label: 'Auto', description: 'Follow system preference' },
          ]}
        />
      </SettingsGroup>

      <SettingsGroup 
        title="Control Position"
        description="Where to display the TTS controls"
      >
        <div className="position-selector">
          {[
            { value: 'top-left', label: 'Top Left' },
            { value: 'top-right', label: 'Top Right' },
            { value: 'bottom-left', label: 'Bottom Left' },
            { value: 'bottom-right', label: 'Bottom Right' },
          ].map((option) => (
            <button
              key={option.value}
              className={`position-option ${
                settings.ui.position === option.value ? 'selected' : ''
              }`}
              onClick={() => handlePositionChange(option.value)}
              aria-pressed={settings.ui.position === option.value}
            >
              <div className="position-preview">
                <div className={`position-indicator ${option.value}`} />
              </div>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </SettingsGroup>

      <SettingsGroup 
        title="Behavior"
        description="Control how the interface behaves"
      >
        <div className="toggle-list">
          <Toggle
            label="Auto-hide controls"
            description="Hide controls when not in use"
            checked={settings.ui.autoHide}
            onChange={handleAutoHideChange}
          />
          
          <Toggle
            label="Show keyboard shortcuts"
            description="Display keyboard shortcuts in tooltips"
            checked={settings.ui.showKeyboardShortcuts}
            onChange={handleShowShortcutsChange}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup 
        title="Accessibility"
        description="Settings for better accessibility"
      >
        <div className="accessibility-options">
          <div className="option">
            <label>High Contrast Mode</label>
            <Toggle
              checked={false} // TODO: Implement high contrast
              onChange={() => {}} // TODO: Implement
            />
          </div>
          
          <div className="option">
            <label>Reduce Motion</label>
            <Toggle
              checked={false} // TODO: Implement reduce motion
              onChange={() => {}} // TODO: Implement
            />
          </div>
          
          <div className="option">
            <label>Large Text</label>
            <Toggle
              checked={false} // TODO: Implement large text
              onChange={() => {}} // TODO: Implement
            />
          </div>
        </div>
      </SettingsGroup>
    </div>
  );
};
```

### Step 4: Settings Controls Components
```typescript
// src/components/settings/controls/RangeSlider.tsx
import React from 'react';

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  presets?: Array<{ label: string; value: number }>;
  disabled?: boolean;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  formatValue = (v) => v.toString(),
  presets = [],
  disabled = false,
}) => {
  return (
    <div className="range-slider">
      <div className="slider-header">
        <span className="current-value">{formatValue(value)}</span>
        {presets.length > 0 && (
          <div className="presets">
            {presets.map((preset) => (
              <button
                key={preset.label}
                className={`preset-button ${value === preset.value ? 'active' : ''}`}
                onClick={() => onChange(preset.value)}
                disabled={disabled}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="slider-container">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="slider"
        />
        <div className="slider-track">
          <div 
            className="slider-progress"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="slider-labels">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
};

// src/components/settings/controls/Toggle.tsx
import React from 'react';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="toggle-control">
      <div className="toggle-info">
        <label className="toggle-label">{label}</label>
        {description && (
          <p className="toggle-description">{description}</p>
        )}
      </div>
      
      <button
        className={`toggle-switch ${checked ? 'on' : 'off'}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-pressed={checked}
        aria-label={label}
      >
        <span className="toggle-slider" />
      </button>
    </div>
  );
};

// src/components/settings/controls/RadioGroup.tsx
import React from 'react';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  disabled = false,
}) => {
  return (
    <div className="radio-group">
      {options.map((option) => (
        <label key={option.value} className="radio-option">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          <span className="radio-custom" />
          <div className="radio-content">
            <span className="radio-label">{option.label}</span>
            {option.description && (
              <span className="radio-description">{option.description}</span>
            )}
          </div>
        </label>
      ))}
    </div>
  );
};
```

### Step 5: Settings Header and Footer
```typescript
// src/components/settings/SettingsHeader.tsx
import React, { useRef } from 'react';
import { SearchIcon, ExportIcon, ImportIcon, ResetIcon } from '../icons';

interface SettingsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  hasUnsavedChanges: boolean;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onExport,
  onImport,
  onReset,
  hasUnsavedChanges,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="settings-header">
      <div className="header-title">
        <h1>TTS Settings</h1>
        {hasUnsavedChanges && (
          <span className="unsaved-indicator">Unsaved changes</span>
        )}
      </div>

      <div className="header-controls">
        <div className="search-container">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="action-buttons">
          <button
            onClick={onExport}
            className="action-button"
            title="Export Settings"
          >
            <ExportIcon />
            Export
          </button>

          <button
            onClick={handleImportClick}
            className="action-button"
            title="Import Settings"
          >
            <ImportIcon />
            Import
          </button>

          <button
            onClick={onReset}
            className="action-button danger"
            title="Reset to Defaults"
          >
            <ResetIcon />
            Reset
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImport}
          style={{ display: 'none' }}
        />
      </div>
    </header>
  );
};

// src/components/settings/SettingsFooter.tsx
import React from 'react';
import { useStorage } from '../../hooks/useStorage';

export const SettingsFooter: React.FC = () => {
  const [storageInfo] = useStorage('storageInfo');

  return (
    <footer className="settings-footer">
      <div className="footer-info">
        <div className="storage-info">
          <span>Storage Used: </span>
          <span className="storage-usage">
            {storageInfo?.used || 0}KB / {storageInfo?.quota || 100}KB
          </span>
          <div className="storage-bar">
            <div 
              className="storage-fill"
              style={{ 
                width: `${((storageInfo?.used || 0) / (storageInfo?.quota || 100)) * 100}%` 
              }}
            />
          </div>
        </div>

        <div className="sync-status">
          <span className="sync-indicator online">
            Synced across devices
          </span>
        </div>
      </div>

      <div className="footer-links">
        <a href="#" onClick={() => window.open('chrome://extensions/')}>
          Extension Settings
        </a>
        <a href="#" onClick={() => window.open('/help.html')}>
          Help & Support
        </a>
        <span>Version 1.0.0</span>
      </div>
    </footer>
  );
};
```

## Testing Criteria and Test Cases

### Unit Tests
```typescript
// src/components/settings/__tests__/SettingsUI.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsUI } from '../SettingsUI';
import { useSettings } from '../../../hooks/useSettings';

jest.mock('../../../hooks/useSettings');

const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

describe('SettingsUI', () => {
  const mockSettings = {
    voice: { selectedVoice: 'en-US', rate: 1.0, pitch: 1.0, volume: 1.0 },
    ui: { theme: 'auto', position: 'top-right', autoHide: false, showKeyboardShortcuts: true },
    behavior: { autoStart: false, pauseOnSwitch: true, highlightText: true, skipPunctuation: false },
  };

  beforeEach(() => {
    mockUseSettings.mockReturnValue({
      settings: mockSettings,
      updateSettings: jest.fn(),
      resetSettings: jest.fn(),
      loading: false,
    });
  });

  it('renders all settings tabs', () => {
    render(<SettingsUI />);
    
    expect(screen.getByText('Voice & Speech')).toBeInTheDocument();
    expect(screen.getByText('Interface')).toBeInTheDocument();
    expect(screen.getByText('Behavior')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<SettingsUI />);
    
    await user.click(screen.getByText('Interface'));
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('filters tabs based on search query', async () => {
    const user = userEvent.setup();
    render(<SettingsUI />);
    
    const searchInput = screen.getByPlaceholderText('Search settings...');
    await user.type(searchInput, 'voice');
    
    expect(screen.getByText('Voice & Speech')).toBeInTheDocument();
    expect(screen.queryByText('Interface')).not.toBeInTheDocument();
  });

  it('exports settings as JSON', async () => {
    const user = userEvent.setup();
    global.URL.createObjectURL = jest.fn();
    
    render(<SettingsUI />);
    
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);
    
    // Verify download was triggered
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('imports settings from JSON file', async () => {
    const user = userEvent.setup();
    const mockUpdateSettings = jest.fn();
    
    mockUseSettings.mockReturnValue({
      settings: mockSettings,
      updateSettings: mockUpdateSettings,
      resetSettings: jest.fn(),
      loading: false,
    });

    render(<SettingsUI />);
    
    const file = new File(
      [JSON.stringify({ voice: { rate: 1.5 } })],
      'settings.json',
      { type: 'application/json' }
    );

    const importButton = screen.getByText('Import');
    await user.click(importButton);
    
    const fileInput = screen.getByRole('textbox', { hidden: true });
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ voice: { rate: 1.5 } });
    });
  });

  it('resets settings with confirmation', async () => {
    const user = userEvent.setup();
    const mockResetSettings = jest.fn();
    
    global.confirm = jest.fn(() => true);
    
    mockUseSettings.mockReturnValue({
      settings: mockSettings,
      updateSettings: jest.fn(),
      resetSettings: mockResetSettings,
      loading: false,
    });

    render(<SettingsUI />);
    
    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);
    
    expect(global.confirm).toHaveBeenCalled();
    expect(mockResetSettings).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    mockUseSettings.mockReturnValue({
      settings: mockSettings,
      updateSettings: jest.fn(),
      resetSettings: jest.fn(),
      loading: true,
    });

    render(<SettingsUI />);
    
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
// src/components/settings/__tests__/VoiceSettings.integration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceSettings } from '../tabs/VoiceSettings';

describe('VoiceSettings Integration', () => {
  const mockSettings = {
    voice: { selectedVoice: 'en-US', rate: 1.0, pitch: 1.0, volume: 1.0 },
    ui: { theme: 'auto', position: 'top-right', autoHide: false, showKeyboardShortcuts: true },
    behavior: { autoStart: false, pauseOnSwitch: true, highlightText: true, skipPunctuation: false },
  };

  const mockProps = {
    settings: mockSettings,
    onSettingsChange: jest.fn(),
    onMarkUnsaved: jest.fn(),
  };

  beforeEach(() => {
    // Mock Speech Synthesis API
    global.speechSynthesis = {
      getVoices: jest.fn(() => [
        { name: 'English US', lang: 'en-US', voiceURI: 'en-US' },
        { name: 'English UK', lang: 'en-GB', voiceURI: 'en-GB' },
      ]),
      speak: jest.fn(),
      cancel: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    } as any;
  });

  it('updates voice settings when sliders change', async () => {
    const user = userEvent.setup();
    render(<VoiceSettings {...mockProps} />);
    
    const rateSlider = screen.getByLabelText(/speech rate/i);
    await user.click(rateSlider);
    fireEvent.change(rateSlider, { target: { value: '1.5' } });
    
    expect(mockProps.onSettingsChange).toHaveBeenCalledWith({
      voice: { ...mockSettings.voice, rate: 1.5 }
    });
    expect(mockProps.onMarkUnsaved).toHaveBeenCalled();
  });

  it('plays voice preview with current settings', async () => {
    const user = userEvent.setup();
    render(<VoiceSettings {...mockProps} />);
    
    const previewButton = screen.getByText(/play preview/i);
    await user.click(previewButton);
    
    expect(global.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('updates preview text', async () => {
    const user = userEvent.setup();
    render(<VoiceSettings {...mockProps} />);
    
    const textArea = screen.getByRole('textbox');
    await user.clear(textArea);
    await user.type(textArea, 'Custom preview text');
    
    expect(textArea).toHaveValue('Custom preview text');
  });

  it('applies preset values', async () => {
    const user = userEvent.setup();
    render(<VoiceSettings {...mockProps} />);
    
    const fastPreset = screen.getByText('Fast');
    await user.click(fastPreset);
    
    expect(mockProps.onSettingsChange).toHaveBeenCalledWith({
      voice: { ...mockSettings.voice, rate: 1.5 }
    });
  });
});
```

### End-to-End Tests
```typescript
// tests/e2e/settings-ui.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('chrome-extension://extension-id/settings.html');
  });

  test('complete settings workflow', async ({ page }) => {
    // Test tab navigation
    await page.click('text=Interface');
    await expect(page.locator('text=Theme')).toBeVisible();

    // Test theme selection
    await page.click('text=Dark');
    await expect(page.locator('[data-theme="dark"]')).toBeVisible();

    // Test voice settings
    await page.click('text=Voice & Speech');
    await page.selectOption('[data-testid="voice-select"]', 'en-GB');
    
    // Test rate slider
    const rateSlider = page.locator('[data-testid="rate-slider"]');
    await rateSlider.fill('1.5');
    
    // Test voice preview
    await page.fill('[data-testid="preview-text"]', 'Testing voice preview');
    await page.click('[data-testid="play-preview"]');
    
    // Verify unsaved changes indicator
    await expect(page.locator('text=Unsaved changes')).toBeVisible();

    // Test settings export
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/tts-settings-.*\.json/);

    // Test settings reset
    page.on('dialog', dialog => dialog.accept());
    await page.click('text=Reset');
    
    // Verify settings were reset
    const voiceSelect = page.locator('[data-testid="voice-select"]');
    await expect(voiceSelect).toHaveValue('');
  });

  test('keyboard navigation', async ({ page }) => {
    // Test tab navigation with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should activate Interface tab
    
    await expect(page.locator('text=Theme')).toBeVisible();

    // Test settings controls with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // Toggle control
    
    // Test slider with keyboard
    const rateSlider = page.locator('[data-testid="rate-slider"]');
    await rateSlider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
  });

  test('accessibility compliance', async ({ page }) => {
    // Check for proper ARIA labels
    const voiceSelect = page.locator('[data-testid="voice-select"]');
    await expect(voiceSelect).toHaveAttribute('aria-label');

    // Check color contrast
    const tabButtons = page.locator('.settings-tab');
    for (const tab of await tabButtons.all()) {
      const styles = await tab.evaluate(el => getComputedStyle(el));
      // Verify contrast ratio meets WCAG standards
      // This would need actual contrast calculation
    }

    // Check for screen reader announcements
    await page.click('text=Interface');
    // Verify proper focus management and announcements
  });

  test('responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 320, height: 568 });
    
    // Verify layout adapts
    const settingsContainer = page.locator('.settings-ui');
    await expect(settingsContainer).toHaveCSS('width', /320px|100%/);

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify tabs are still accessible
    await page.click('text=Voice & Speech');
    await expect(page.locator('text=Voice Selection')).toBeVisible();
  });
});
```

## Success Metrics

### User Experience Metrics
- **Settings Discoverability**: > 80% of users find desired settings within 30 seconds
- **Settings Completion Rate**: > 95% of users successfully save their preferences
- **User Satisfaction**: > 4.5/5 rating for settings interface usability
- **Error Recovery**: < 2% of users encounter unrecoverable errors

### Performance Metrics
- **Initial Load Time**: < 300ms for settings page to become interactive
- **Settings Save Time**: < 1 second for changes to persist
- **Search Responsiveness**: < 100ms for search results to update
- **Memory Usage**: < 50MB for settings page in Chrome

### Accessibility Metrics
- **Keyboard Navigation**: 100% of controls accessible via keyboard
- **Screen Reader Compatibility**: Compatible with NVDA, JAWS, VoiceOver
- **Color Contrast**: 4.5:1 minimum ratio for all text elements
- **Focus Management**: Proper focus indicators and logical tab order

### Technical Metrics
- **Code Coverage**: > 90% for UI components
- **Performance Budget**: Bundle size < 100KB for settings page
- **Cross-Browser Compatibility**: Chrome 88+, Edge 88+
- **Responsive Design**: Works on screens 320px - 2560px wide

## Dependencies and Risks

### Internal Dependencies
- **Storage Service**: Core storage functionality from Feature 5.1
- **Settings Manager**: Settings management service
- **Voice Engine**: Integration with TTS voice system
- **Theme System**: Consistent theming across components
- **Component Library**: Reusable UI components

### External Dependencies
- **React**: 18+ for UI components and hooks
- **React Tabs**: For tabbed interface
- **Chrome Extension APIs**: chrome.storage, chrome.theme
- **CSS Custom Properties**: For dynamic theming
- **Accessibility Standards**: WCAG 2.1 AA compliance

### Technical Risks
- **Performance Impact**: Complex UI could slow down extension
- **Browser Compatibility**: New CSS features may not work in older browsers
- **Storage Limitations**: Large settings data could hit Chrome limits
- **Memory Leaks**: React components not properly cleaned up

### Mitigation Strategies
- **Performance Optimization**: Lazy loading, code splitting, memoization
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Data Compression**: Minimize storage footprint with compression
- **Memory Management**: Proper cleanup of event listeners and subscriptions
- **Error Boundaries**: Prevent crashes from affecting entire extension
- **Testing Strategy**: Comprehensive unit, integration, and e2e tests

### UX Risks
- **Cognitive Overload**: Too many settings could overwhelm users
- **Settings Discoverability**: Users may not find important settings
- **Mobile Usability**: Settings may be hard to use on small screens
- **Accessibility Barriers**: Complex interactions may exclude some users

### Business Risks
- **User Adoption**: Poor settings experience could reduce usage
- **Support Burden**: Confusing UI could increase support requests
- **Feature Creep**: Settings complexity could grow uncontrollably
- **Platform Changes**: Chrome API changes could break functionality

### Risk Monitoring
- **User Analytics**: Track settings usage patterns and completion rates
- **Performance Monitoring**: Monitor page load times and memory usage
- **Error Tracking**: Log and alert on settings-related errors
- **Accessibility Audits**: Regular testing with assistive technologies
- **User Feedback**: Collect and analyze user feedback on settings experience