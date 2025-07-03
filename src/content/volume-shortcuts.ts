import { MessageType } from '../common/types/messages';

export class VolumeShortcutHandler {
  private volumeStep = 10; // 10% increments
  private lastVolumeChangeTime = 0;
  private volumeNotification: HTMLElement | null = null;

  initialize(): void {
    // Chrome commands are now handled in the background script
    // Content script only handles direct keyboard events
    
    // Listen for keyboard events
    document.addEventListener('keydown', this.handleKeyPress);
  }


  private handleKeyPress = (event: KeyboardEvent) => {
    // Only handle if extension has focus or with modifier key
    if (!event.ctrlKey || !event.shiftKey) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.adjustVolume(this.volumeStep);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.adjustVolume(-this.volumeStep);
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        this.toggleMute();
        break;
      case '0':
        event.preventDefault();
        this.setVolume(0);
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        event.preventDefault();
        const volumeLevel = parseInt(event.key) * 10;
        this.setVolume(volumeLevel);
        break;
      }
    }
  };

  private async adjustVolume(delta: number) {
    // Rate limit volume changes
    const now = Date.now();
    if (now - this.lastVolumeChangeTime < 100) return;
    this.lastVolumeChangeTime = now;

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.ADJUST_VOLUME,
        delta
      });

      if (response.success) {
        this.showVolumeNotification(response.newVolume, response.isMuted);
      }
    } catch (error) {
      console.error('Volume adjustment failed:', error);
    }
  }

  private async setVolume(volume: number) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.SET_VOLUME,
        volume,
        options: { smooth: true }
      });

      if (response.success) {
        this.showVolumeNotification(volume, false);
      }
    } catch (error) {
      console.error('Volume set failed:', error);
    }
  }

  private async toggleMute() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.TOGGLE_MUTE
      });

      if (response.success) {
        this.showVolumeNotification(
          response.volume, 
          response.isMuted,
          response.isMuted ? 'Muted' : 'Unmuted'
        );
      }
    } catch (error) {
      console.error('Mute toggle failed:', error);
    }
  }

  private showVolumeNotification(
    volume: number, 
    isMuted: boolean, 
    message?: string
  ) {
    // Remove existing notification
    if (this.volumeNotification) {
      this.volumeNotification.remove();
    }

    // Create new notification
    this.volumeNotification = document.createElement('div');
    this.volumeNotification.className = 'tts-volume-notification';
    
    // Volume bar visualization
    const volumeBar = this.createVolumeBar(volume, isMuted);
    
    this.volumeNotification.innerHTML = `
      <div class="volume-icon">${isMuted ? '🔇' : '🔊'}</div>
      <div class="volume-bar-container">
        ${volumeBar}
      </div>
      <div class="volume-text">${message || `${volume}%`}</div>
    `;

    // Style the notification
    this.volumeNotification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      animation: slideIn 0.3s ease-out;
      user-select: none;
      pointer-events: none;
      min-width: 200px;
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    
    if (!document.head.querySelector('[data-tts-volume-styles]')) {
      style.setAttribute('data-tts-volume-styles', 'true');
      document.head.appendChild(style);
    }

    document.body.appendChild(this.volumeNotification);

    // Auto-remove after delay
    setTimeout(() => {
      if (this.volumeNotification) {
        this.volumeNotification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          this.volumeNotification?.remove();
          this.volumeNotification = null;
        }, 300);
      }
    }, 2000);
  }

  private createVolumeBar(volume: number, isMuted: boolean): string {
    const segments = 10;
    const filledSegments = Math.round((volume / 100) * segments);
    
    let bar = '<div style="display: flex; gap: 2px; align-items: center;">';
    for (let i = 0; i < segments; i++) {
      const isFilled = i < filledSegments && !isMuted;
      const color = isMuted ? '#666' : (isFilled ? '#4ade80' : '#333');
      const height = isFilled ? '16px' : '12px';
      bar += `<div style="width: 3px; height: ${height}; background: ${color}; border-radius: 1px; transition: all 0.15s ease;"></div>`;
    }
    bar += '</div>';
    
    return bar;
  }

  destroy(): void {
    // Clean up event listeners
    document.removeEventListener('keydown', this.handleKeyPress);

    // Remove notification if exists
    if (this.volumeNotification) {
      this.volumeNotification.remove();
      this.volumeNotification = null;
    }

    // Remove styles
    const existingStyles = document.head.querySelector('[data-tts-volume-styles]');
    if (existingStyles) {
      existingStyles.remove();
    }
  }
}