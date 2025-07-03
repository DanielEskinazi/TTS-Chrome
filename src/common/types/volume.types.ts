// Volume control interfaces and types for TTS Chrome Extension

export interface VolumeState {
  globalVolume: number; // 0-100
  isMuted: boolean;
  previousVolume: number; // For unmute
  domainOverrides: Map<string, number>;
  volumePresets: VolumePreset[];
  fadeSettings: FadeSettings;
}

export interface VolumePreset {
  id: string;
  name: string;
  volume: number;
  isDefault?: boolean;
}

export interface FadeSettings {
  enableFadeIn: boolean;
  enableFadeOut: boolean;
  fadeDuration: number; // milliseconds
}

export interface SetVolumeOptions {
  smooth?: boolean;
  duration?: number;
  saveToDomain?: boolean;
}

export interface IVolumeControlService {
  setVolume(volume: number, options?: SetVolumeOptions): Promise<void>;
  getVolume(): number;
  getCurrentEffectiveVolume(domain?: string): number;
  mute(): void;
  unmute(): void;
  isMuted(): boolean;
  setDomainVolume(domain: string, volume: number): Promise<void>;
  savePreset(name: string, volume?: number): Promise<string>;
  applyPreset(presetId: string): Promise<void>;
  fadeIn(duration?: number): Promise<void>;
  fadeOut(duration?: number): Promise<void>;
}

// Message types for volume control
export interface VolumeMessage {
  type: 'SET_VOLUME' | 'GET_VOLUME_STATE' | 'MUTE' | 'UNMUTE' | 'TOGGLE_MUTE' | 
        'ADJUST_VOLUME' | 'SET_DOMAIN_VOLUME' | 'APPLY_PRESET' | 'VOLUME_CHANGED';
  volume?: number;
  delta?: number;
  domain?: string;
  presetId?: string;
  options?: SetVolumeOptions;
  isMuted?: boolean;
  effectiveVolume?: number;
}

// Storage structures
export interface VolumeStorageData {
  globalVolume: number;
  volumePresets: VolumePreset[];
  fadeSettings: FadeSettings;
  domainVolumes: Record<string, number>;
  lastUpdated: number;
}

// Default presets
export const DEFAULT_VOLUME_PRESETS: VolumePreset[] = [
  { id: 'quiet', name: 'Quiet', volume: 30 },
  { id: 'normal', name: 'Normal', volume: 70, isDefault: true },
  { id: 'loud', name: 'Loud', volume: 90 },
  { id: 'office', name: 'Office', volume: 50 },
  { id: 'headphones', name: 'Headphones', volume: 60 }
];

// Constants
export const VOLUME_CONSTRAINTS = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 70,
  STEP: 10,
  MAX_DOMAIN_ENTRIES: 100,
  FADE_DURATION_DEFAULT: 500,
  SMOOTH_TRANSITION_STEPS: 20,
  VOLUME_CHANGE_DEBOUNCE: 50
} as const;