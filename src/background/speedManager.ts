export class SpeedManager {
  private currentSpeed: number = 1.0;
  private defaultSpeed: number = 1.0;
  private readonly minSpeed: number = 0.5;
  private readonly maxSpeed: number = 3.0;
  private readonly speedStep: number = 0.1;
  private readonly presetSpeeds: number[] = [0.75, 1.0, 1.25, 1.5, 2.0];
  private domainSpeeds: Map<string, number> = new Map();
  private initializationPromise: Promise<void>;
  private isInitialized: boolean = false;

  constructor() {
    this.initializationPromise = this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.loadPreferences();
      this.isInitialized = true;
      console.log('Speed Manager initialized successfully, current speed:', this.currentSpeed);
    } catch (error) {
      console.error('SpeedManager initialization failed:', error);
      // Use defaults if initialization fails
      this.isInitialized = true;
    }
  }

  public async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  private async loadPreferences(): Promise<void> {
    try {
      console.log('SpeedManager.loadPreferences: Starting to load from Chrome storage...');
      
      const stored = await chrome.storage.sync.get(['defaultSpeed', 'domainSpeeds']);
      console.log('SpeedManager.loadPreferences: Retrieved from storage:', stored);
      
      if (stored.defaultSpeed) {
        const oldDefault = this.defaultSpeed;
        const oldCurrent = this.currentSpeed;
        
        this.defaultSpeed = this.validateSpeed(stored.defaultSpeed);
        this.currentSpeed = this.defaultSpeed;
        
        console.log('SpeedManager.loadPreferences: Updated speeds - old default:', oldDefault, 'new default:', this.defaultSpeed, 'old current:', oldCurrent, 'new current:', this.currentSpeed);
      } else {
        console.log('SpeedManager.loadPreferences: No defaultSpeed found in storage, using defaults');
      }
      
      if (stored.domainSpeeds) {
        this.domainSpeeds = new Map(stored.domainSpeeds);
        console.log('SpeedManager.loadPreferences: Loaded domain speeds:', Array.from(this.domainSpeeds.entries()));
      } else {
        console.log('SpeedManager.loadPreferences: No domainSpeeds found in storage');
      }
      
      console.log('SpeedManager.loadPreferences: Loading completed successfully');
    } catch (error) {
      console.error('SpeedManager.loadPreferences: Error loading speed preferences:', error);
      throw error; // Re-throw to allow initialization to handle it
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      const dataToSave = {
        defaultSpeed: this.defaultSpeed,
        domainSpeeds: Array.from(this.domainSpeeds.entries())
      };
      
      console.log('SpeedManager.savePreferences: saving data:', dataToSave);
      await chrome.storage.sync.set(dataToSave);
      console.log('SpeedManager.savePreferences: successfully saved');
    } catch (error) {
      console.error('SpeedManager.savePreferences: Error saving speed preferences:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  private validateSpeed(speed: number): number {
    return Math.max(this.minSpeed, Math.min(this.maxSpeed, speed));
  }

  formatSpeed(speed: number): string {
    return speed.toFixed(1) + 'x';
  }

  async setSpeed(speed: number): Promise<boolean> {
    await this.waitForInitialization();
    
    const validSpeed = this.validateSpeed(speed);
    console.log('SpeedManager.setSpeed called:', speed, 'validated to:', validSpeed, 'current:', this.currentSpeed);
    
    if (validSpeed !== this.currentSpeed) {
      this.currentSpeed = validSpeed;
      
      const currentDomain = await this.getCurrentDomain();
      if (!this.domainSpeeds.has(currentDomain)) {
        this.defaultSpeed = validSpeed;
      }
      
      await this.savePreferences();
      this.notifySpeedChange(validSpeed);
      console.log('SpeedManager.setSpeed completed successfully, new speed:', validSpeed);
      
      return true;
    }
    
    console.log('SpeedManager.setSpeed: no change needed');
    return false;
  }

  async incrementSpeed(): Promise<boolean> {
    await this.waitForInitialization();
    const newSpeed = Math.round((this.currentSpeed + this.speedStep) * 10) / 10;
    return this.setSpeed(newSpeed);
  }

  async decrementSpeed(): Promise<boolean> {
    await this.waitForInitialization();
    const newSpeed = Math.round((this.currentSpeed - this.speedStep) * 10) / 10;
    return this.setSpeed(newSpeed);
  }

  async setPresetSpeed(presetIndex: number): Promise<boolean> {
    if (presetIndex >= 0 && presetIndex < this.presetSpeeds.length) {
      return this.setSpeed(this.presetSpeeds[presetIndex]);
    }
    return false;
  }

  async resetSpeed(): Promise<boolean> {
    return this.setSpeed(1.0);
  }

  async setDomainSpeed(domain: string, speed: number): Promise<void> {
    const validSpeed = this.validateSpeed(speed);
    this.domainSpeeds.set(domain, validSpeed);
    await this.savePreferences();
  }

  private async getCurrentDomain(): Promise<string> {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.url) {
        const url = new URL(activeTab.url);
        return url.hostname;
      }
    } catch (error) {
      console.error('Error getting current domain:', error);
    }
    return '';
  }

  async getSpeedForCurrentDomain(): Promise<number> {
    const domain = await this.getCurrentDomain();
    if (domain && this.domainSpeeds.has(domain)) {
      return this.domainSpeeds.get(domain)!;
    }
    return this.defaultSpeed;
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  async getSpeedInfo(): Promise<{
    current: number;
    default: number;
    min: number;
    max: number;
    step: number;
    presets: number[];
    formatted: string;
  }> {
    await this.waitForInitialization();
    
    const speedInfo = {
      current: this.currentSpeed,
      default: this.defaultSpeed,
      min: this.minSpeed,
      max: this.maxSpeed,
      step: this.speedStep,
      presets: this.presetSpeeds,
      formatted: this.formatSpeed(this.currentSpeed)
    };
    
    console.log('SpeedManager.getSpeedInfo returning:', speedInfo);
    return speedInfo;
  }

  private notifySpeedChange(speed: number): void {
    // Silently notify other parts of extension about speed changes
    chrome.runtime.sendMessage({
      type: 'SPEED_CHANGED', // This will be MessageType.SPEED_CHANGED when imported
      data: { 
        speed: speed,
        formatted: this.formatSpeed(speed)
      }
    }).catch((error) => {
      // Expected when no listeners are active - don't log unless it's unexpected
      if (!error.message.includes('Receiving end does not exist')) {
        console.warn('Unexpected error in speed change notification:', error);
      }
    });
  }

  calculateReadingTime(characterCount: number, speed: number | null = null): {
    minutes: number;
    formatted: string;
  } {
    const effectiveSpeed = speed || this.currentSpeed;
    const baseWPM = 150; // Average words per minute
    const avgWordLength = 5; // Average characters per word
    
    const words = characterCount / avgWordLength;
    const minutes = words / (baseWPM * effectiveSpeed);
    
    return {
      minutes: minutes,
      formatted: this.formatReadingTime(minutes)
    };
  }

  private formatReadingTime(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  }
}