/**
 * Development utilities - these will be stripped in production builds
 */

export const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = (...args: any[]): void => {
  if (isDevelopment) {
    console.log('[TTS-Dev]', ...args);
  }
};

export const devError = (...args: any[]): void => {
  if (isDevelopment) {
    console.error('[TTS-Dev Error]', ...args);
  }
};

export const devTime = (label: string): void => {
  if (isDevelopment) {
    console.time(`[TTS-Dev] ${label}`);
  }
};

export const devTimeEnd = (label: string): void => {
  if (isDevelopment) {
    console.timeEnd(`[TTS-Dev] ${label}`);
  }
};

// Development-only Chrome storage viewer
export const viewStorage = async (): Promise<void> => {
  if (isDevelopment) {
    const data = await chrome.storage.local.get();
    console.table(data);
  }
};

// Development-only performance monitor
export const perfMonitor = {
  marks: new Map<string, number>(),
  
  start(label: string): void {
    if (isDevelopment) {
      this.marks.set(label, performance.now());
    }
  },
  
  end(label: string): void {
    if (isDevelopment) {
      const start = this.marks.get(label);
      if (start) {
        const duration = performance.now() - start;
        devLog(`Performance: ${label} took ${duration.toFixed(2)}ms`);
        this.marks.delete(label);
      }
    }
  },
  
  measure(fn: () => void | Promise<void>, label: string): void | Promise<void> {
    if (!isDevelopment) return fn();
    
    this.start(label);
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => this.end(label));
    } else {
      this.end(label);
      return result;
    }
  },
};