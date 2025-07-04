import {
  VolumeState,
  VolumePreset,
  SetVolumeOptions,
  IVolumeControlService,
  VolumeStorageData,
  DEFAULT_VOLUME_PRESETS,
  VOLUME_CONSTRAINTS
} from '../../common/types/volume.types';
import { MessageType } from '../../common/types/messages';

export class VolumeControlService implements IVolumeControlService {
  private state: VolumeState = {
    globalVolume: VOLUME_CONSTRAINTS.DEFAULT,
    isMuted: false,
    previousVolume: VOLUME_CONSTRAINTS.DEFAULT,
    domainOverrides: new Map(),
    volumePresets: [...DEFAULT_VOLUME_PRESETS],
    fadeSettings: {
      enableFadeIn: true,
      enableFadeOut: true,
      fadeDuration: VOLUME_CONSTRAINTS.FADE_DURATION_DEFAULT
    }
  };

  private fadeInterval?: NodeJS.Timeout;
  private storageDebounceTimer?: NodeJS.Timeout;

  constructor() {
    console.log('[VolumeControl] Initializing VolumeControlService');
    this.loadVolumeState();
  }

  async setVolume(volume: number, options: SetVolumeOptions = {}): Promise<void> {
    // Validate volume range
    volume = Math.max(VOLUME_CONSTRAINTS.MIN, Math.min(VOLUME_CONSTRAINTS.MAX, volume));
    console.log('[VolumeControl] Setting volume to:', volume, 'options:', options);

    const oldVolume = this.state.globalVolume;
    this.state.globalVolume = volume;
    this.state.isMuted = false;

    // Save to appropriate storage
    if (options.saveToDomain) {
      const domain = await this.getCurrentDomain();
      if (domain) {
        this.state.domainOverrides.set(domain, volume);
        await this.saveDomainOverrides();
      }
    }

    // Apply volume change
    if (options.smooth && this.isCurrentlySpeaking()) {
      await this.smoothVolumeTransition(oldVolume, volume, options.duration || 300);
    } else {
      await this.applyVolumeToActiveSpeech(volume);
    }

    // Persist state (debounced)
    this.debouncedSaveVolumeState();
    
    // Broadcast change
    await this.broadcastVolumeChange(volume);
  }

  getVolume(): number {
    return this.state.globalVolume;
  }

  getCurrentEffectiveVolume(domain?: string): number {
    if (this.state.isMuted) return 0;

    // Check for domain override
    if (domain || (domain = this.getCurrentDomainSync())) {
      const domainVolume = this.state.domainOverrides.get(domain);
      if (domainVolume !== undefined) {
        return domainVolume;
      }
    }

    return this.state.globalVolume;
  }

  mute(): void {
    if (!this.state.isMuted) {
      this.state.previousVolume = this.state.globalVolume;
      this.state.isMuted = true;
      this.setVolume(0, { smooth: true, duration: 100 });
    }
  }

  unmute(): void {
    if (this.state.isMuted) {
      this.state.isMuted = false;
      this.setVolume(this.state.previousVolume, { smooth: true, duration: 100 });
    }
  }

  isMuted(): boolean {
    return this.state.isMuted;
  }

  async setDomainVolume(domain: string, volume: number): Promise<void> {
    // Validate domain entries limit
    if (this.state.domainOverrides.size >= VOLUME_CONSTRAINTS.MAX_DOMAIN_ENTRIES) {
      await this.pruneOldDomainVolumes();
    }

    this.state.domainOverrides.set(domain, volume);
    await this.saveDomainOverrides();
    await this.broadcastVolumeChange(volume);
  }

  async savePreset(name: string, volume?: number): Promise<string> {
    const presetVolume = volume ?? this.state.globalVolume;
    const presetId = `custom-${Date.now()}`;
    
    const newPreset: VolumePreset = {
      id: presetId,
      name,
      volume: presetVolume
    };

    // Limit to 10 total presets (5 default + 5 custom)
    const customPresets = this.state.volumePresets.filter(p => p.id.startsWith('custom-'));
    if (customPresets.length >= 5) {
      // Remove oldest custom preset
      const oldestCustom = customPresets.sort((a, b) => 
        parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1])
      )[0];
      this.state.volumePresets = this.state.volumePresets.filter(p => p.id !== oldestCustom.id);
    }

    this.state.volumePresets.push(newPreset);
    await this.saveVolumeState();
    
    return presetId;
  }

  async applyPreset(presetId: string): Promise<void> {
    const preset = this.state.volumePresets.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    await this.setVolume(preset.volume, { smooth: true, duration: 200 });
  }

  async fadeIn(duration?: number): Promise<void> {
    const fadeDuration = duration || this.state.fadeSettings.fadeDuration;
    const targetVolume = this.getCurrentEffectiveVolume();
    
    // Start from 0 and fade to target
    await this.setVolume(0, { smooth: false });
    await this.smoothVolumeTransition(0, targetVolume, fadeDuration);
  }

  async fadeOut(duration?: number): Promise<void> {
    const fadeDuration = duration || this.state.fadeSettings.fadeDuration;
    const currentVolume = this.getCurrentEffectiveVolume();
    
    // Fade from current to 0
    await this.smoothVolumeTransition(currentVolume, 0, fadeDuration);
  }

  // Message handler for runtime messages
  async handleMessage(
    message: { type: string; volume?: number; options?: SetVolumeOptions; domain?: string; delta?: number; presetId?: string; payload?: Record<string, unknown> }, 
    _sender: chrome.runtime.MessageSender
  ): Promise<Record<string, unknown>> {
    switch (message.type) {
      case MessageType.SET_VOLUME: {
        await this.setVolume(message.volume || (message.payload?.volume as number), message.options || (message.payload?.options as SetVolumeOptions));
        return { success: true, volume: this.state.globalVolume };
      }

      case MessageType.GET_VOLUME_STATE: {
        const domain = message.domain || (message.payload?.domain as string);
        const result = {
          volume: this.state.globalVolume,
          isMuted: this.state.isMuted,
          effectiveVolume: this.getCurrentEffectiveVolume(domain),
          domainVolume: domain ? this.state.domainOverrides.get(domain) : null,
          presets: this.state.volumePresets
        };
        console.log('[VolumeControl] Returning volume state:', result);
        return result;
      }

      case MessageType.MUTE:
        this.mute();
        return { success: true, isMuted: true };

      case MessageType.UNMUTE:
        this.unmute();
        return { success: true, isMuted: false };

      case MessageType.TOGGLE_MUTE:
        if (this.state.isMuted) {
          this.unmute();
        } else {
          this.mute();
        }
        return { 
          success: true, 
          isMuted: this.state.isMuted,
          volume: this.state.globalVolume
        };

      case MessageType.ADJUST_VOLUME: {
        const delta = message.delta || (message.payload?.delta as number) || 0;
        const currentVolume = this.state.globalVolume;
        const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
        await this.setVolume(newVolume, { smooth: true });
        return { 
          success: true, 
          newVolume: this.state.globalVolume,
          isMuted: this.state.isMuted
        };
      }

      case MessageType.SET_DOMAIN_VOLUME: {
        const setDomain = message.domain || (message.payload?.domain as string);
        const domainVolume = message.volume || (message.payload?.volume as number);
        if (setDomain && typeof domainVolume === 'number') {
          await this.setDomainVolume(setDomain, domainVolume);
          return { success: true };
        }
        return { success: false, error: 'Invalid domain or volume' };
      }

      case MessageType.CLEAR_DOMAIN_VOLUME: {
        const clearDomain = await this.getCurrentDomain();
        if (clearDomain && this.state.domainOverrides.has(clearDomain)) {
          this.state.domainOverrides.delete(clearDomain);
          await this.saveDomainOverrides();
          await this.broadcastVolumeChange(this.state.globalVolume);
          return { success: true };
        }
        return { success: false, error: 'No domain volume to clear' };
      }

      case MessageType.APPLY_PRESET: {
        const presetId = message.presetId || (message.payload?.presetId as string);
        if (presetId) {
          await this.applyPreset(presetId);
          return { success: true, volume: this.state.globalVolume };
        }
        return { success: false, error: 'No preset ID provided' };
      }

      default:
        return { success: false, error: 'Unknown volume command' };
    }
  }

  private async smoothVolumeTransition(
    fromVolume: number, 
    toVolume: number, 
    duration: number
  ): Promise<void> {
    const steps = VOLUME_CONSTRAINTS.SMOOTH_TRANSITION_STEPS;
    const stepDuration = duration / steps;
    const volumeStep = (toVolume - fromVolume) / steps;

    // Clear any existing transition
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    return new Promise((resolve) => {
      let currentStep = 0;
      
      this.fadeInterval = setInterval(async () => {
        currentStep++;
        const currentVolume = fromVolume + (volumeStep * currentStep);
        
        await this.applyVolumeToActiveSpeech(currentVolume);
        
        if (currentStep >= steps) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = undefined;
          resolve();
        }
      }, stepDuration);
    });
  }

  private async applyVolumeToActiveSpeech(volume: number): Promise<void> {
    // Convert to Chrome TTS range (0.0 - 1.0)
    const chromeVolume = volume / 100;

    // Send volume update to all active tabs with content scripts
    try {
      const tabs = await chrome.tabs.query({ active: true });
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
          chrome.tabs.sendMessage(tab.id, {
            type: MessageType.UPDATE_TTS_VOLUME,
            volume: chromeVolume
          }).catch(() => {
            // Ignore errors - content script might not be loaded
          });
        }
      }
    } catch (error) {
      console.error('Failed to send volume update to tabs:', error);
    }
  }

  private async getCurrentDomain(): Promise<string | null> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url);
        return url.hostname;
      }
    } catch (error) {
      console.error('Failed to get current domain:', error);
    }
    return null;
  }

  private getCurrentDomainSync(): string | undefined {
    // Synchronous fallback - would need to be populated by tab updates
    return undefined;
  }

  private isCurrentlySpeaking(): boolean {
    // This would integrate with the speech synthesizer service
    return false; // Placeholder
  }

  private async loadVolumeState(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['volumeSettings']);
      console.log('[VolumeControl] Loaded storage:', result);
      if (result.volumeSettings) {
        const data: VolumeStorageData = result.volumeSettings;
        this.state.globalVolume = data.globalVolume || VOLUME_CONSTRAINTS.DEFAULT;
        this.state.volumePresets = data.volumePresets || [...DEFAULT_VOLUME_PRESETS];
        this.state.fadeSettings = data.fadeSettings || this.state.fadeSettings;
        
        // Load domain volumes
        if (data.domainVolumes) {
          this.state.domainOverrides = new Map(Object.entries(data.domainVolumes));
        }
        console.log('[VolumeControl] Volume state loaded:', this.state);
      } else {
        console.log('[VolumeControl] No saved volume settings, using defaults');
      }
    } catch (error) {
      console.error('Failed to load volume state:', error);
    }
  }

  private debouncedSaveVolumeState(): void {
    if (this.storageDebounceTimer) {
      clearTimeout(this.storageDebounceTimer);
    }

    this.storageDebounceTimer = setTimeout(() => {
      this.saveVolumeState();
    }, VOLUME_CONSTRAINTS.VOLUME_CHANGE_DEBOUNCE);
  }

  private async saveVolumeState(): Promise<void> {
    const data: VolumeStorageData = {
      globalVolume: this.state.globalVolume,
      volumePresets: this.state.volumePresets,
      fadeSettings: this.state.fadeSettings,
      domainVolumes: Object.fromEntries(this.state.domainOverrides),
      lastUpdated: Date.now()
    };

    try {
      await chrome.storage.sync.set({ volumeSettings: data });
    } catch (error) {
      console.error('Failed to save volume state:', error);
      // Fallback to local storage if sync fails
      try {
        await chrome.storage.local.set({ volumeSettings: data });
      } catch (localError) {
        console.error('Failed to save to local storage:', localError);
      }
    }
  }

  private async saveDomainOverrides(): Promise<void> {
    const domainVolumes = Object.fromEntries(this.state.domainOverrides);
    try {
      await chrome.storage.local.set({ domainVolumes });
    } catch (error) {
      console.error('Failed to save domain volumes:', error);
    }
  }

  private async pruneOldDomainVolumes(): Promise<void> {
    // Remove oldest entries if we hit the limit
    const entries = Array.from(this.state.domainOverrides.entries());
    entries.sort(); // Simple alphabetical sort - could be enhanced with timestamp
    
    // Keep most recent 80 entries (leave room for 20 more)
    const toKeep = entries.slice(-80);
    this.state.domainOverrides = new Map(toKeep);
    
    await this.saveDomainOverrides();
  }

  private async broadcastVolumeChange(volume: number): Promise<void> {
    // Notify all components
    chrome.runtime.sendMessage({
      type: MessageType.VOLUME_CHANGED,
      volume,
      isMuted: this.state.isMuted,
      effectiveVolume: this.getCurrentEffectiveVolume()
    });
  }
}