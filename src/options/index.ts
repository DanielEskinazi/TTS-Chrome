import { MessageType, Message } from '@common/types/messages';
import { devLog } from '@common/dev-utils';

interface Settings {
  enabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  fontSize: number;
  highlightText: boolean;
}

class OptionsController {
  private form: HTMLFormElement;
  private voices: SpeechSynthesisVoice[] = [];
  private defaultSettings: Settings = {
    enabled: true,
    theme: 'light',
    voice: 'default',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    fontSize: 16,
    highlightText: true,
  };

  constructor() {
    this.form = document.getElementById('settingsForm') as HTMLFormElement;
    this.initialize();
  }

  private async initialize() {
    await this.loadVoices();
    await this.loadSettings();
    this.setupEventListeners();
    this.updateRangeDisplays();
  }

  private async loadVoices() {
    return new Promise<void>((resolve) => {
      const loadVoiceList = () => {
        this.voices = speechSynthesis.getVoices();
        this.populateVoiceSelect();
        resolve();
      };

      if (speechSynthesis.getVoices().length > 0) {
        loadVoiceList();
      } else {
        speechSynthesis.addEventListener('voiceschanged', loadVoiceList, { once: true });
      }
    });
  }

  private populateVoiceSelect() {
    const voiceSelect = document.getElementById('voice') as HTMLSelectElement;

    // Clear existing options except default
    while (voiceSelect.options.length > 1) {
      voiceSelect.remove(1);
    }

    // Add available voices
    this.voices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;

      if (voice.default) {
        option.textContent += ' - Default';
      }

      voiceSelect.appendChild(option);
    });
  }

  private async loadSettings() {
    const stored = await chrome.storage.sync.get(this.defaultSettings);
    const settings = { ...this.defaultSettings, ...stored };

    // Apply settings to form
    Object.entries(settings).forEach(([key, value]) => {
      const input = this.form.elements.namedItem(key) as HTMLInputElement;
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = value as boolean;
        } else {
          input.value = String(value);
        }
      }
    });

    devLog('Settings loaded:', settings);
  }

  private setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // Reset button
    document.getElementById('resetButton')?.addEventListener('click', () => {
      this.resetSettings();
    });

    // Range input updates
    ['rate', 'pitch', 'volume', 'fontSize'].forEach((id) => {
      const input = document.getElementById(id) as HTMLInputElement;
      input?.addEventListener('input', () => this.updateRangeDisplay(id));
    });

    // Export/Import
    document.getElementById('exportSettings')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportSettings();
    });

    document.getElementById('importSettings')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.importSettings();
    });
  }

  private updateRangeDisplays() {
    ['rate', 'pitch', 'volume', 'fontSize'].forEach((id) => {
      this.updateRangeDisplay(id);
    });
  }

  private updateRangeDisplay(id: string) {
    const input = document.getElementById(id) as HTMLInputElement;
    const display = document.getElementById(`${id}Value`) as HTMLSpanElement;

    if (!input || !display) return;

    const value = parseFloat(input.value);

    switch (id) {
      case 'rate':
        display.textContent = `${value.toFixed(1)}x`;
        break;
      case 'pitch':
        display.textContent = value.toFixed(1);
        break;
      case 'volume':
        display.textContent = `${Math.round(value * 100)}%`;
        break;
      case 'fontSize':
        display.textContent = `${value}px`;
        break;
    }
  }

  private async saveSettings() {
    const formData = new FormData(this.form);
    const settings: Record<string, unknown> = {};

    // Process form data
    for (const [key, value] of formData.entries()) {
      if (key in this.defaultSettings) {
        if (key === 'enabled' || key === 'highlightText') {
          settings[key] = (this.form.elements.namedItem(key) as HTMLInputElement)?.checked || false;
        } else if (['rate', 'pitch', 'volume', 'fontSize'].includes(key)) {
          settings[key] = parseFloat(value as string);
        } else {
          settings[key] = value as string;
        }
      }
    }

    // Save to storage
    await chrome.storage.sync.set(settings);

    // Notify background script
    const message: Message = {
      type: MessageType.UPDATE_SETTINGS,
      payload: settings,
    };

    await chrome.runtime.sendMessage(message);

    // Show success message
    this.showNotification('Settings saved successfully!', 'success');
  }

  private async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(this.defaultSettings);
      await this.loadSettings();
      this.updateRangeDisplays();

      this.showNotification('Settings reset to defaults', 'info');
    }
  }

  private async exportSettings() {
    const settings = await chrome.storage.sync.get();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'tts-settings.json');
    link.click();
  }

  private async importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const settings = JSON.parse(text);

        // Validate settings
        if (typeof settings === 'object') {
          await chrome.storage.sync.set(settings);
          await this.loadSettings();
          this.updateRangeDisplays();

          this.showNotification('Settings imported successfully!', 'success');
        } else {
          throw new Error('Invalid settings format');
        }
      } catch (error) {
        this.showNotification('Failed to import settings', 'error');
        devLog('Import error:', error);
      }
    });

    input.click();
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;

    const colors = {
      success: '#4caf50',
      error: '#f44336',
      info: '#2196f3',
    };

    notification.style.backgroundColor = colors[type];

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
