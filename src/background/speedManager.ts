export class SpeedManager {
  private currentSpeed: number = 1.0;
  private defaultSpeed: number = 1.0;
  private readonly minSpeed: number = 0.5;
  private readonly maxSpeed: number = 3.0;
  private readonly speedStep: number = 0.1;
  private readonly presetSpeeds: number[] = [0.75, 1.0, 1.25, 1.5, 2.0];
  private domainSpeeds: Map<string, number> = new Map();

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadPreferences();
    console.log('Speed Manager initialized, current speed:', this.currentSpeed);
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await chrome.storage.sync.get(['defaultSpeed', 'domainSpeeds']);
      
      if (stored.defaultSpeed) {
        this.defaultSpeed = this.validateSpeed(stored.defaultSpeed);
        this.currentSpeed = this.defaultSpeed;
      }
      
      if (stored.domainSpeeds) {
        this.domainSpeeds = new Map(stored.domainSpeeds);
      }
    } catch (error) {
      console.error('Error loading speed preferences:', error);
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        defaultSpeed: this.defaultSpeed,
        domainSpeeds: Array.from(this.domainSpeeds.entries())
      });
    } catch (error) {
      console.error('Error saving speed preferences:', error);
    }
  }

  private validateSpeed(speed: number): number {
    return Math.max(this.minSpeed, Math.min(this.maxSpeed, speed));
  }

  formatSpeed(speed: number): string {
    return speed.toFixed(1) + 'x';
  }

  async setSpeed(speed: number): Promise<boolean> {
    const validSpeed = this.validateSpeed(speed);
    
    if (validSpeed !== this.currentSpeed) {
      this.currentSpeed = validSpeed;
      
      const currentDomain = await this.getCurrentDomain();
      if (!this.domainSpeeds.has(currentDomain)) {
        this.defaultSpeed = validSpeed;
      }
      
      await this.savePreferences();
      this.notifySpeedChange(validSpeed);
      
      return true;
    }
    
    return false;
  }

  async incrementSpeed(): Promise<boolean> {
    const newSpeed = Math.round((this.currentSpeed + this.speedStep) * 10) / 10;
    return this.setSpeed(newSpeed);
  }

  async decrementSpeed(): Promise<boolean> {
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

  getSpeedInfo(): {
    current: number;
    default: number;
    min: number;
    max: number;
    step: number;
    presets: number[];
    formatted: string;
  } {
    return {
      current: this.currentSpeed,
      default: this.defaultSpeed,
      min: this.minSpeed,
      max: this.maxSpeed,
      step: this.speedStep,
      presets: this.presetSpeeds,
      formatted: this.formatSpeed(this.currentSpeed)
    };
  }

  private notifySpeedChange(speed: number): void {
    chrome.runtime.sendMessage({
      type: 'SPEED_CHANGED', // This will be MessageType.SPEED_CHANGED when imported
      data: { 
        speed: speed,
        formatted: this.formatSpeed(speed)
      }
    }).catch(() => {
      // Ignore if no listeners
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