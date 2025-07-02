import { MessageType } from '@common/types/messages';
import { devLog } from '@common/dev-utils';

export interface ProgressState {
  currentPosition: number;      // Current character index
  totalLength: number;         // Total text length
  elapsedTime: number;         // Milliseconds elapsed
  remainingTime: number;       // Milliseconds remaining
  percentComplete: number;     // 0-100
  isPlaying: boolean;
  isPaused: boolean;
  currentSpeed: number;        // Playback rate multiplier
  currentText?: string;        // The text being read
}

export interface ProgressUpdateEvent {
  charIndex: number;
  wordIndex?: number;
  sentenceIndex?: number;
  boundary: 'word' | 'sentence' | 'char';
  timestamp: number;
}

export class ProgressTracker {
  private state: ProgressState | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private pauseStartTime: number = 0;
  private lastUpdateTime: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private wordsPerMinute: number = 150; // Average reading speed

  constructor() {
    devLog('ProgressTracker initialized');
  }

  startTracking(text: string, startPosition: number = 0, speed: number = 1.0): void {
    devLog('Starting progress tracking', { textLength: text.length, startPosition, speed });
    
    this.state = {
      currentPosition: startPosition,
      totalLength: text.length,
      elapsedTime: 0,
      remainingTime: this.estimateTotalTime(text, speed),
      percentComplete: (startPosition / text.length) * 100,
      isPlaying: true,
      isPaused: false,
      currentSpeed: speed,
      currentText: text
    };

    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
    this.pausedTime = 0;
    
    // Start real-time updates
    this.startUpdateTimer();
    
    // Broadcast initial state
    this.broadcastProgress();
  }

  updateProgress(event: ProgressUpdateEvent): void {
    if (!this.state) return;
    
    const now = performance.now();
    
    // Update position based on event
    this.state.currentPosition = event.charIndex;
    this.state.percentComplete = (event.charIndex / this.state.totalLength) * 100;
    
    // Calculate actual elapsed time (excluding paused time)
    const totalElapsed = now - this.startTime - this.pausedTime;
    this.state.elapsedTime = totalElapsed;
    
    // Estimate remaining time based on current progress rate
    if (totalElapsed > 0 && event.charIndex > 0) {
      const progressRate = event.charIndex / totalElapsed; // chars per millisecond
      this.state.remainingTime = (this.state.totalLength - event.charIndex) / progressRate;
    }
    
    devLog('Progress updated', {
      position: event.charIndex,
      percent: this.state.percentComplete.toFixed(1),
      elapsed: Math.round(this.state.elapsedTime / 1000) + 's',
      remaining: Math.round(this.state.remainingTime / 1000) + 's'
    });
    
    // Broadcast update
    this.broadcastProgress();
  }

  pauseTracking(): void {
    if (!this.state || !this.state.isPlaying || this.state.isPaused) return;
    
    this.state.isPaused = true;
    this.state.isPlaying = false;
    this.pauseStartTime = performance.now();
    
    // Stop update timer
    this.stopUpdateTimer();
    
    devLog('Progress tracking paused');
    this.broadcastProgress();
  }

  resumeTracking(): void {
    if (!this.state || this.state.isPlaying || !this.state.isPaused) return;
    
    // Calculate how long we were paused
    const pauseDuration = performance.now() - this.pauseStartTime;
    this.pausedTime += pauseDuration;
    
    this.state.isPaused = false;
    this.state.isPlaying = true;
    
    // Restart update timer
    this.startUpdateTimer();
    
    devLog('Progress tracking resumed');
    this.broadcastProgress();
  }

  stopTracking(): void {
    devLog('Stopping progress tracking');
    
    this.stopUpdateTimer();
    this.state = null;
    this.startTime = 0;
    this.pausedTime = 0;
    this.pauseStartTime = 0;
    
    // Broadcast cleared state
    this.broadcastProgress();
  }

  async seekToPosition(position: number): Promise<void> {
    if (!this.state || !this.state.currentText) {
      throw new Error('No active tracking session');
    }
    
    // Validate position
    const clampedPosition = Math.max(0, Math.min(position, this.state.totalLength));
    
    devLog('Seeking to position', { requested: position, clamped: clampedPosition });
    
    // Update state
    this.state.currentPosition = clampedPosition;
    this.state.percentComplete = (clampedPosition / this.state.totalLength) * 100;
    
    // Recalculate times based on new position
    const percentageComplete = clampedPosition / this.state.totalLength;
    const estimatedTotalTime = this.estimateTotalTime(this.state.currentText, this.state.currentSpeed);
    this.state.elapsedTime = estimatedTotalTime * percentageComplete;
    this.state.remainingTime = estimatedTotalTime * (1 - percentageComplete);
    
    // Reset timing
    this.startTime = performance.now() - this.state.elapsedTime;
    this.pausedTime = 0;
    
    // Broadcast update
    this.broadcastProgress();
  }

  seekToPercentage(percentage: number): Promise<void> {
    if (!this.state) {
      throw new Error('No active tracking session');
    }
    
    const position = Math.round((percentage / 100) * this.state.totalLength);
    return this.seekToPosition(position);
  }

  updateSpeed(speed: number): void {
    if (!this.state) return;
    
    devLog('Updating speed', { oldSpeed: this.state.currentSpeed, newSpeed: speed });
    
    this.state.currentSpeed = speed;
    
    // Recalculate remaining time with new speed
    if (this.state.currentText) {
      const remainingChars = this.state.totalLength - this.state.currentPosition;
      const remainingText = this.state.currentText.substring(this.state.currentPosition);
      const remainingTime = this.estimateTime(remainingText, speed);
      this.state.remainingTime = remainingTime;
    }
    
    this.broadcastProgress();
  }

  getState(): ProgressState | null {
    return this.state ? { ...this.state } : null;
  }

  private estimateTotalTime(text: string, speed: number): number {
    return this.estimateTime(text, speed);
  }

  private estimateTime(text: string, speed: number): number {
    // Estimate based on word count and reading speed
    const wordCount = text.trim().split(/\s+/).length;
    const adjustedWPM = this.wordsPerMinute * speed;
    return (wordCount / adjustedWPM) * 60 * 1000; // Convert to milliseconds
  }

  private startUpdateTimer(): void {
    if (this.updateInterval) return;
    
    this.lastUpdateTime = performance.now();
    
    this.updateInterval = setInterval(() => {
      if (this.state && this.state.isPlaying && !this.state.isPaused) {
        const now = performance.now();
        
        // Only update time-based values, not position
        // Position updates come from TTS events
        this.state.elapsedTime = now - this.startTime - this.pausedTime;
        
        // Update remaining time estimate
        if (this.state.percentComplete > 0) {
          const estimatedTotal = this.state.elapsedTime / (this.state.percentComplete / 100);
          this.state.remainingTime = Math.max(0, estimatedTotal - this.state.elapsedTime);
        }
        
        this.lastUpdateTime = now;
        
        // Broadcast time update
        this.broadcastProgress();
      }
    }, 1000); // Update every second
  }

  private stopUpdateTimer(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private broadcastProgress(): void {
    chrome.runtime.sendMessage({
      type: MessageType.PROGRESS_UPDATE,
      data: this.state
    }).catch(() => {
      // Popup might be closed, ignore error
    });
  }

  cleanup(): void {
    this.stopTracking();
  }
}