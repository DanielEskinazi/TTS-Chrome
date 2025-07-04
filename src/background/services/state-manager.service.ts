import { SpeedInfo } from '../speedManager';
import { VoiceInfo } from '@common/voice-manager';

interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string | null;
  currentTabId: number | null;
  selectedVoice: VoiceInfo | null;
  voiceList: VoiceInfo[];
  speedInfo: SpeedInfo;
  volume: number;
  isMuted: boolean;
  domainVolumes: Map<string, number>;
}

interface StateChangeListener {
  (state: TTSState, changedKeys: Set<string>): void;
}

export class StateManager {
  private state: TTSState = {
    isPlaying: false,
    isPaused: false,
    currentText: null,
    currentTabId: null,
    selectedVoice: null,
    voiceList: [],
    speedInfo: {
      current: 1.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      default: 1.0,
      presets: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
      formatted: '1.0x'
    },
    volume: 100,
    isMuted: false,
    domainVolumes: new Map()
  };
  
  private listeners: Set<StateChangeListener> = new Set();
  private stateVersion = 0;
  private updateQueue: Array<() => void> = [];
  private isUpdating = false;
  
  constructor() {
    console.log('[StateManager] Service initialized');
    this.loadPersistedState();
  }
  
  /**
   * Get current state snapshot
   */
  public getState(): Readonly<TTSState> {
    return {
      ...this.state,
      domainVolumes: new Map(this.state.domainVolumes)
    };
  }
  
  /**
   * Update state with partial updates
   */
  public async updateState(updates: Partial<TTSState>): Promise<void> {
    return new Promise((resolve) => {
      this.updateQueue.push(() => {
        const changedKeys = new Set<string>();
        
        // Apply updates and track changes
        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'domainVolumes' && value instanceof Map) {
            // Special handling for Map
            if (!this.mapsEqual(this.state.domainVolumes, value)) {
              this.state.domainVolumes = new Map(value);
              changedKeys.add(key);
            }
          } else if (this.state[key as keyof TTSState] !== value) {
            (this.state as unknown as Record<string, unknown>)[key] = value;
            changedKeys.add(key);
          }
        });
        
        if (changedKeys.size > 0) {
          this.stateVersion++;
          console.log(`[StateManager] State updated (v${this.stateVersion}):`, Array.from(changedKeys));
          
          // Persist critical state
          this.persistState(changedKeys);
          
          // Notify listeners
          this.notifyListeners(changedKeys);
        }
        
        resolve();
      });
      
      this.processUpdateQueue();
    });
  }
  
  /**
   * Process queued updates sequentially
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isUpdating || this.updateQueue.length === 0) {
      return;
    }
    
    this.isUpdating = true;
    
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift();
      if (update) {
        update();
      }
    }
    
    this.isUpdating = false;
  }
  
  /**
   * Subscribe to state changes
   */
  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(changedKeys: Set<string>): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState, changedKeys);
      } catch (error) {
        console.error('[StateManager] Listener error:', error);
      }
    });
  }
  
  /**
   * Persist critical state to storage
   */
  private async persistState(changedKeys: Set<string>): Promise<void> {
    const persistKeys = ['selectedVoice', 'speedInfo', 'volume', 'isMuted', 'domainVolumes'];
    const shouldPersist = Array.from(changedKeys).some(key => persistKeys.includes(key));
    
    if (!shouldPersist) {
      return;
    }
    
    try {
      const dataToStore: Record<string, unknown> = {};
      
      if (changedKeys.has('selectedVoice') && this.state.selectedVoice) {
        dataToStore.selectedVoice = {
          name: this.state.selectedVoice.name,
          lang: this.state.selectedVoice.lang
        };
      }
      
      if (changedKeys.has('speedInfo')) {
        dataToStore.speedInfo = this.state.speedInfo;
      }
      
      if (changedKeys.has('volume')) {
        dataToStore.volume = this.state.volume;
      }
      
      if (changedKeys.has('isMuted')) {
        dataToStore.isMuted = this.state.isMuted;
      }
      
      if (changedKeys.has('domainVolumes')) {
        dataToStore.domainVolumes = Array.from(this.state.domainVolumes.entries());
      }
      
      await chrome.storage.local.set(dataToStore);
      console.log('[StateManager] Persisted state:', Object.keys(dataToStore));
    } catch (error) {
      console.error('[StateManager] Failed to persist state:', error);
    }
  }
  
  /**
   * Load persisted state from storage
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get([
        'selectedVoice',
        'speedInfo',
        'volume',
        'isMuted',
        'domainVolumes'
      ]);
      
      const updates: Partial<TTSState> = {};
      
      if (stored.selectedVoice) {
        // Voice will be matched when voice list is loaded
        updates.selectedVoice = stored.selectedVoice;
      }
      
      if (stored.speedInfo) {
        updates.speedInfo = stored.speedInfo;
      }
      
      if (typeof stored.volume === 'number') {
        updates.volume = stored.volume;
      }
      
      if (typeof stored.isMuted === 'boolean') {
        updates.isMuted = stored.isMuted;
      }
      
      if (Array.isArray(stored.domainVolumes)) {
        updates.domainVolumes = new Map(stored.domainVolumes);
      }
      
      if (Object.keys(updates).length > 0) {
        await this.updateState(updates);
        console.log('[StateManager] Loaded persisted state:', Object.keys(updates));
      }
    } catch (error) {
      console.error('[StateManager] Failed to load persisted state:', error);
    }
  }
  
  /**
   * Compare two Maps for equality
   */
  private mapsEqual(map1: Map<string, number>, map2: Map<string, number>): boolean {
    if (map1.size !== map2.size) return false;
    
    for (const [key, value] of map1) {
      if (!map2.has(key) || map2.get(key) !== value) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Reset state to defaults
   */
  public async resetState(): Promise<void> {
    await this.updateState({
      isPlaying: false,
      isPaused: false,
      currentText: null,
      currentTabId: null,
      selectedVoice: null,
      voiceList: [],
      speedInfo: {
        current: 1.0,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        default: 1.0,
        presets: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
        formatted: '1.0x'
      },
      volume: 100,
      isMuted: false,
      domainVolumes: new Map()
    });
    
    // Clear storage
    await chrome.storage.local.clear();
    console.log('[StateManager] State reset to defaults');
  }
  
  /**
   * Get state version for change detection
   */
  public getVersion(): number {
    return this.stateVersion;
  }
  
  /**
   * Cleanup service
   */
  public cleanup(): void {
    this.listeners.clear();
    this.updateQueue = [];
    console.log('[StateManager] Service cleaned up');
  }
}