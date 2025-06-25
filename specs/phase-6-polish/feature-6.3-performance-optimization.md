# Feature 6.3: Performance Optimization

## Overview

Implement comprehensive performance optimizations for the TTS Chrome Extension to ensure smooth operation, minimal resource usage, and responsive user experience across all features and usage patterns.

## Objectives

- Optimize memory usage and prevent leaks
- Implement efficient text chunking strategies
- Minimize CPU usage during idle states
- Improve startup and response times
- Implement intelligent caching mechanisms

## Technical Requirements

### Functional Requirements

1. **Memory Management**
   - Text buffer limits (10MB max)
   - Automatic garbage collection
   - Resource cleanup on tab close
   - Memory pressure detection
   - Chunk size optimization

2. **Processing Optimization**
   - Lazy loading of resources
   - Debouncing and throttling
   - Web Workers for heavy tasks
   - Streaming text processing
   - Parallel processing where applicable

3. **Caching Strategy**
   - Voice data caching
   - Processed text caching
   - Settings cache with TTL
   - LRU cache implementation
   - Cache invalidation logic

4. **Network Optimization**
   - Minimize API calls
   - Request batching
   - Offline capability
   - Progressive enhancement
   - CDN usage for assets

### Non-Functional Requirements

1. **Performance Targets**
   - Startup time: < 100ms
   - Selection response: < 50ms
   - Memory usage: < 50MB baseline
   - CPU usage: < 5% idle
   - Battery impact: Minimal

2. **Scalability**
   - Handle 100k+ character texts
   - Support 50+ queued items
   - Multiple tab operation
   - Concurrent TTS instances

3. **Monitoring**
   - Performance metrics collection
   - Memory usage tracking
   - Error rate monitoring
   - User experience metrics

## Implementation

### 1. Performance Manager Service

```typescript
// src/services/PerformanceManager.ts
export interface PerformanceMetrics {
  memoryUsage: MemoryUsage;
  cpuUsage: number;
  responseTime: ResponseTimeMetrics;
  cacheStats: CacheStatistics;
  errors: ErrorMetrics;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
}

export interface ResponseTimeMetrics {
  selectionToSpeech: number[];
  textProcessing: number[];
  voiceLoading: number[];
  averages: {
    selection: number;
    processing: number;
    voiceLoad: number;
  };
}

export class PerformanceManager {
  private static instance: PerformanceManager;
  private metrics: PerformanceMetrics;
  private metricsBuffer: Map<string, number[]>;
  private performanceObserver: PerformanceObserver | null = null;
  private memoryMonitor: NodeJS.Timer | null = null;

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  constructor() {
    this.metricsBuffer = new Map();
    this.initializeMetrics();
    this.setupMonitoring();
  }

  private initializeMetrics(): void {
    this.metrics = {
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0,
        heapUsed: 0,
        heapTotal: 0,
      },
      cpuUsage: 0,
      responseTime: {
        selectionToSpeech: [],
        textProcessing: [],
        voiceLoading: [],
        averages: {
          selection: 0,
          processing: 0,
          voiceLoad: 0,
        },
      },
      cacheStats: {
        hits: 0,
        misses: 0,
        size: 0,
        evictions: 0,
      },
      errors: {
        total: 0,
        byType: {},
        rate: 0,
      },
    };
  }

  private setupMonitoring(): void {
    // Memory monitoring
    this.memoryMonitor = setInterval(() => {
      this.updateMemoryMetrics();
    }, 5000);

    // Performance observer for timing metrics
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPerformanceEntry(entry);
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation'] 
      });
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.jsHeapSizeLimit,
      };

      // Check for memory pressure
      if (this.metrics.memoryUsage.percentage > 90) {
        this.handleMemoryPressure();
      }
    }
  }

  private handleMemoryPressure(): void {
    console.warn('Memory pressure detected, initiating cleanup');
    
    // Trigger garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    // Clear caches
    CacheManager.getInstance().evictLRU(0.5); // Evict 50% of cache

    // Notify other services
    chrome.runtime.sendMessage({
      type: 'MEMORY_PRESSURE',
      severity: 'high',
    });
  }

  private recordPerformanceEntry(entry: PerformanceEntry): void {
    const buffer = this.metricsBuffer.get(entry.name) || [];
    buffer.push(entry.duration);
    
    // Keep only last 100 measurements
    if (buffer.length > 100) {
      buffer.shift();
    }
    
    this.metricsBuffer.set(entry.name, buffer);
    
    // Update averages
    this.updateAverages();
  }

  private updateAverages(): void {
    const categories = ['selectionToSpeech', 'textProcessing', 'voiceLoading'];
    
    categories.forEach(category => {
      const buffer = this.metricsBuffer.get(category) || [];
      if (buffer.length > 0) {
        const average = buffer.reduce((a, b) => a + b, 0) / buffer.length;
        (this.metrics.responseTime as any)[category] = buffer;
        
        switch (category) {
          case 'selectionToSpeech':
            this.metrics.responseTime.averages.selection = average;
            break;
          case 'textProcessing':
            this.metrics.responseTime.averages.processing = average;
            break;
          case 'voiceLoading':
            this.metrics.responseTime.averages.voiceLoad = average;
            break;
        }
      }
    });
  }

  // Public API
  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasure(name: string): void {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  recordError(type: string): void {
    this.metrics.errors.total++;
    this.metrics.errors.byType[type] = (this.metrics.errors.byType[type] || 0) + 1;
    this.updateErrorRate();
  }

  private updateErrorRate(): void {
    // Calculate error rate over last minute
    const window = 60000; // 1 minute
    const now = Date.now();
    // Implementation would track errors over time window
  }

  cleanup(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Cache Manager for Performance
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry>;
  private maxSize: number = 50 * 1024 * 1024; // 50MB
  private currentSize: number = 0;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  constructor() {
    this.cache = new Map();
  }

  set(key: string, value: any, ttl: number = 3600000): void {
    const size = this.estimateSize(value);
    
    // Check if we need to evict
    if (this.currentSize + size > this.maxSize) {
      this.evictLRU((this.currentSize + size - this.maxSize) / this.maxSize);
    }

    const entry: CacheEntry = {
      value,
      size,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl,
      hits: 0,
    };

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSize -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.recordMiss();
      return null;
    }

    // Update access time and hits
    entry.lastAccessed = Date.now();
    entry.hits++;
    
    this.recordHit();
    return entry.value;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
    }
  }

  evictLRU(percentage: number = 0.2): void {
    const targetSize = this.currentSize * (1 - percentage);
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    let evicted = 0;
    for (const [key, entry] of entries) {
      if (this.currentSize <= targetSize) break;
      
      this.delete(key);
      evicted++;
    }

    console.log(`Evicted ${evicted} cache entries`);
    this.recordEvictions(evicted);
  }

  private estimateSize(value: any): number {
    // Rough estimation of object size
    const str = JSON.stringify(value);
    return str.length * 2; // 2 bytes per character
  }

  private recordHit(): void {
    PerformanceManager.getInstance().metrics.cacheStats.hits++;
  }

  private recordMiss(): void {
    PerformanceManager.getInstance().metrics.cacheStats.misses++;
  }

  private recordEvictions(count: number): void {
    PerformanceManager.getInstance().metrics.cacheStats.evictions += count;
  }

  getStats(): CacheStatistics {
    const hitRate = this.cache.size > 0 
      ? PerformanceManager.getInstance().metrics.cacheStats.hits / 
        (PerformanceManager.getInstance().metrics.cacheStats.hits + 
         PerformanceManager.getInstance().metrics.cacheStats.misses)
      : 0;

    return {
      size: this.currentSize,
      entries: this.cache.size,
      hitRate,
      ...PerformanceManager.getInstance().metrics.cacheStats,
    };
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }
}

interface CacheEntry {
  value: any;
  size: number;
  timestamp: number;
  lastAccessed: number;
  ttl: number;
  hits: number;
}

interface CacheStatistics {
  size: number;
  entries: number;
  hitRate: number;
  hits: number;
  misses: number;
  evictions: number;
}

// Text Chunking Optimizer
export class TextChunkOptimizer {
  private static readonly MIN_CHUNK_SIZE = 500;
  private static readonly MAX_CHUNK_SIZE = 5000;
  private static readonly OPTIMAL_CHUNK_SIZE = 1500;

  static optimizeChunks(text: string, options: ChunkOptions = {}): TextChunk[] {
    const {
      preferredSize = this.OPTIMAL_CHUNK_SIZE,
      respectSentences = true,
      respectParagraphs = true,
    } = options;

    const chunks: TextChunk[] = [];
    
    if (text.length <= preferredSize) {
      return [{
        text,
        startIndex: 0,
        endIndex: text.length,
        isComplete: true,
      }];
    }

    let currentIndex = 0;
    while (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      const chunkEnd = this.findOptimalBreakpoint(
        remainingText,
        preferredSize,
        respectSentences,
        respectParagraphs
      );

      chunks.push({
        text: remainingText.slice(0, chunkEnd),
        startIndex: currentIndex,
        endIndex: currentIndex + chunkEnd,
        isComplete: currentIndex + chunkEnd >= text.length,
      });

      currentIndex += chunkEnd;
    }

    return chunks;
  }

  private static findOptimalBreakpoint(
    text: string,
    preferredSize: number,
    respectSentences: boolean,
    respectParagraphs: boolean
  ): number {
    if (text.length <= preferredSize) {
      return text.length;
    }

    let breakpoint = preferredSize;

    // Try to break at paragraph
    if (respectParagraphs) {
      const paragraphBreak = text.lastIndexOf('\n\n', preferredSize);
      if (paragraphBreak > this.MIN_CHUNK_SIZE) {
        return paragraphBreak + 2;
      }
    }

    // Try to break at sentence
    if (respectSentences) {
      const sentenceBreak = this.findSentenceBreak(text, preferredSize);
      if (sentenceBreak > this.MIN_CHUNK_SIZE) {
        return sentenceBreak;
      }
    }

    // Try to break at word
    const wordBreak = text.lastIndexOf(' ', preferredSize);
    if (wordBreak > this.MIN_CHUNK_SIZE) {
      return wordBreak + 1;
    }

    // Fallback to preferred size
    return Math.min(preferredSize, text.length);
  }

  private static findSentenceBreak(text: string, nearIndex: number): number {
    const sentenceEnders = /[.!?]+\s/g;
    let lastMatch = -1;
    let match;

    while ((match = sentenceEnders.exec(text)) !== null) {
      if (match.index > nearIndex) break;
      lastMatch = match.index + match[0].length;
    }

    return lastMatch;
  }
}

interface ChunkOptions {
  preferredSize?: number;
  respectSentences?: boolean;
  respectParagraphs?: boolean;
}

interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  isComplete: boolean;
}

// Debounce and Throttle Utilities
export class RateLimiter {
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
      const context = this;

      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function (this: any, ...args: Parameters<T>) {
      const context = this;

      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;

        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  static async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10,
    delayMs: number = 100
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);

      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}
```

### 2. Performance Monitoring Component

```typescript
// src/components/PerformanceMonitor.tsx
import React, { useState, useEffect } from 'react';
import { PerformanceManager, PerformanceMetrics } from '../services/PerformanceManager';

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [visible, setVisible] = useState(false);
  const performanceManager = PerformanceManager.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceManager.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!visible || !metrics) {
    return (
      <button
        className="perf-monitor-toggle"
        onClick={() => setVisible(true)}
        aria-label="Show performance monitor"
      >
        📊
      </button>
    );
  }

  const memoryPercentage = metrics.memoryUsage.percentage.toFixed(1);
  const cacheHitRate = (
    (metrics.cacheStats.hits / (metrics.cacheStats.hits + metrics.cacheStats.misses)) * 100
  ).toFixed(1);

  return (
    <div className="performance-monitor">
      <div className="perf-header">
        <h3>Performance Monitor</h3>
        <button onClick={() => setVisible(false)}>×</button>
      </div>

      <div className="perf-metrics">
        <div className="metric-group">
          <h4>Memory Usage</h4>
          <div className="metric">
            <span className="label">Used:</span>
            <span className="value">{(metrics.memoryUsage.used / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="metric">
            <span className="label">Percentage:</span>
            <span className={`value ${Number(memoryPercentage) > 80 ? 'warning' : ''}`}>
              {memoryPercentage}%
            </span>
          </div>
          <div className="memory-bar">
            <div 
              className="memory-fill"
              style={{ width: `${memoryPercentage}%` }}
            />
          </div>
        </div>

        <div className="metric-group">
          <h4>Response Times</h4>
          <div className="metric">
            <span className="label">Selection → Speech:</span>
            <span className="value">{metrics.responseTime.averages.selection.toFixed(0)}ms</span>
          </div>
          <div className="metric">
            <span className="label">Text Processing:</span>
            <span className="value">{metrics.responseTime.averages.processing.toFixed(0)}ms</span>
          </div>
          <div className="metric">
            <span className="label">Voice Loading:</span>
            <span className="value">{metrics.responseTime.averages.voiceLoad.toFixed(0)}ms</span>
          </div>
        </div>

        <div className="metric-group">
          <h4>Cache Performance</h4>
          <div className="metric">
            <span className="label">Hit Rate:</span>
            <span className="value">{cacheHitRate}%</span>
          </div>
          <div className="metric">
            <span className="label">Size:</span>
            <span className="value">{(metrics.cacheStats.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="metric">
            <span className="label">Evictions:</span>
            <span className="value">{metrics.cacheStats.evictions}</span>
          </div>
        </div>

        <div className="metric-group">
          <h4>Errors</h4>
          <div className="metric">
            <span className="label">Total:</span>
            <span className="value">{metrics.errors.total}</span>
          </div>
          {Object.entries(metrics.errors.byType).map(([type, count]) => (
            <div key={type} className="metric">
              <span className="label">{type}:</span>
              <span className="value">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="perf-actions">
        <button onClick={() => CacheManager.getInstance().clear()}>
          Clear Cache
        </button>
        <button onClick={() => {
          if ('gc' in window) (window as any).gc();
        }}>
          Force GC
        </button>
      </div>
    </div>
  );
}
```

### 3. Performance-Optimized TTS Controller

```typescript
// src/services/OptimizedTTSController.ts
import { TextChunkOptimizer } from './PerformanceManager';
import { CacheManager } from './PerformanceManager';
import { RateLimiter } from './PerformanceManager';

export class OptimizedTTSController {
  private cache: CacheManager;
  private chunkQueue: TextChunk[] = [];
  private preloadBuffer: Map<string, ArrayBuffer> = new Map();
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  constructor() {
    this.cache = CacheManager.getInstance();
    this.setupOptimizations();
  }

  private setupOptimizations(): void {
    // Throttle voice list updates
    this.updateVoiceList = RateLimiter.throttle(
      this.updateVoiceList.bind(this),
      5000
    );

    // Debounce text selection
    this.processSelection = RateLimiter.debounce(
      this.processSelection.bind(this),
      200
    );

    // Preload voices
    this.preloadCommonVoices();
  }

  async speak(text: string, options: SpeakOptions): Promise<void> {
    const perfManager = PerformanceManager.getInstance();
    perfManager.startMeasure('selectionToSpeech');

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text, options);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        await this.playCached(cached);
        return;
      }

      // Optimize chunks
      const chunks = TextChunkOptimizer.optimizeChunks(text, {
        preferredSize: 1500,
        respectSentences: true,
        respectParagraphs: true,
      });

      // Process chunks
      this.chunkQueue = chunks;
      await this.processChunkQueue(options);

    } finally {
      perfManager.endMeasure('selectionToSpeech');
    }
  }

  private async processChunkQueue(options: SpeakOptions): Promise<void> {
    const processingPromises: Promise<void>[] = [];

    // Process current chunk
    const currentChunk = this.chunkQueue.shift();
    if (!currentChunk) return;

    // Start processing current chunk
    const currentPromise = this.processChunk(currentChunk, options);
    processingPromises.push(currentPromise);

    // Preload next chunk while current is playing
    if (this.chunkQueue.length > 0) {
      const nextChunk = this.chunkQueue[0];
      const preloadPromise = this.preloadChunk(nextChunk, options);
      processingPromises.push(preloadPromise);
    }

    await Promise.all(processingPromises);

    // Continue with next chunk
    if (this.chunkQueue.length > 0) {
      await this.processChunkQueue(options);
    }
  }

  private async processChunk(chunk: TextChunk, options: SpeakOptions): Promise<void> {
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    
    // Apply options
    utterance.voice = options.voice;
    utterance.rate = options.rate;
    utterance.volume = options.volume;
    utterance.pitch = options.pitch;

    // Track active utterances for cleanup
    this.activeUtterances.add(utterance);

    // Speak
    return new Promise((resolve) => {
      utterance.onend = () => {
        this.activeUtterances.delete(utterance);
        resolve();
      };

      utterance.onerror = (event) => {
        this.activeUtterances.delete(utterance);
        console.error('TTS error:', event);
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }

  private async preloadChunk(chunk: TextChunk, options: SpeakOptions): Promise<void> {
    // This is a simplified preload - in reality, we might use Web Audio API
    // to preprocess the audio
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.voice = options.voice;
    utterance.rate = options.rate;
    utterance.volume = 0; // Mute for preload
    
    // Store in preload buffer
    const key = this.getCacheKey(chunk.text, options);
    this.preloadBuffer.set(key, new ArrayBuffer(0)); // Placeholder
  }

  private preloadCommonVoices(): void {
    // Preload metadata for commonly used voices
    const voices = speechSynthesis.getVoices();
    const commonVoices = voices.filter(v => 
      v.lang.startsWith('en') || 
      v.localService
    );

    commonVoices.forEach(voice => {
      this.cache.set(`voice_${voice.voiceURI}`, {
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService,
      }, 86400000); // 24 hour TTL
    });
  }

  stop(): void {
    // Cancel all speech
    speechSynthesis.cancel();
    
    // Clear chunk queue
    this.chunkQueue = [];
    
    // Clear active utterances
    this.activeUtterances.clear();
    
    // Clear preload buffer
    this.preloadBuffer.clear();
  }

  pause(): void {
    speechSynthesis.pause();
  }

  resume(): void {
    speechSynthesis.resume();
  }

  private getCacheKey(text: string, options: SpeakOptions): string {
    return `tts_${text.slice(0, 50)}_${options.voice?.name}_${options.rate}_${options.volume}`;
  }

  private async playCached(cached: any): Promise<void> {
    // Implementation would play cached audio
    console.log('Playing from cache');
  }

  private updateVoiceList(): void {
    // Throttled voice list update
    const voices = speechSynthesis.getVoices();
    this.cache.set('voice_list', voices, 3600000); // 1 hour TTL
  }

  private processSelection(text: string): void {
    // Debounced selection processing
    console.log('Processing selection:', text.slice(0, 50));
  }

  cleanup(): void {
    this.stop();
    this.preloadBuffer.clear();
  }
}

interface SpeakOptions {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  volume: number;
  pitch: number;
}
```

## Testing

### Performance Tests

```typescript
// src/services/__tests__/PerformanceManager.test.ts
describe('PerformanceManager', () => {
  let manager: PerformanceManager;

  beforeEach(() => {
    manager = PerformanceManager.getInstance();
  });

  describe('memory monitoring', () => {
    test('should detect memory pressure', () => {
      // Simulate high memory usage
      const mockMemory = {
        usedJSHeapSize: 90 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      };

      (performance as any).memory = mockMemory;
      
      const metrics = manager.getMetrics();
      expect(metrics.memoryUsage.percentage).toBeGreaterThan(90);
    });
  });

  describe('performance timing', () => {
    test('should measure operation duration', async () => {
      manager.startMeasure('test-operation');
      await new Promise(resolve => setTimeout(resolve, 100));
      manager.endMeasure('test-operation');

      const metrics = manager.getMetrics();
      // Check that measurement was recorded
      expect(performance.getEntriesByName('test-operation')).toHaveLength(1);
    });
  });
});

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = CacheManager.getInstance();
    cache.clear();
  });

  test('should respect TTL', async () => {
    cache.set('test', 'value', 100); // 100ms TTL
    expect(cache.get('test')).toBe('value');

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('test')).toBeNull();
  });

  test('should evict LRU entries', () => {
    // Fill cache
    for (let i = 0; i < 100; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    const stats = cache.getStats();
    expect(stats.evictions).toBeGreaterThan(0);
  });
});

describe('TextChunkOptimizer', () => {
  test('should respect sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = TextChunkOptimizer.optimizeChunks(text, {
      preferredSize: 20,
      respectSentences: true,
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0].text).toBe('First sentence. ');
  });

  test('should handle large texts efficiently', () => {
    const largeText = 'Lorem ipsum '.repeat(10000);
    const start = performance.now();
    
    const chunks = TextChunkOptimizer.optimizeChunks(largeText);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should process in < 100ms
  });
});
```

## Success Metrics

1. **Performance Benchmarks**
   - Startup time: < 100ms
   - Selection to speech: < 50ms average
   - Memory baseline: < 50MB
   - Cache hit rate: > 80%
   - Text processing: < 10ms per KB

2. **Resource Usage**
   - CPU idle: < 5%
   - Memory growth: < 1MB per hour
   - Battery impact: < 2% per hour active use

3. **User Experience**
   - Zero perceived lag
   - Smooth playback without stutters
   - Responsive UI during TTS

## Dependencies

### Internal Dependencies
- TTS Controller
- Text Processor
- Storage Service

### External Dependencies
- Performance Observer API
- Chrome Memory API
- Web Workers API

## Risks and Mitigation

### High-Risk Items
1. **Memory Leaks**
   - Risk: Unbounded memory growth
   - Mitigation: Automatic cleanup and monitoring

2. **Cache Overflow**
   - Risk: Excessive memory usage
   - Mitigation: LRU eviction and size limits

### Medium-Risk Items
1. **Performance Regressions**
   - Risk: Updates degrading performance
   - Mitigation: Continuous monitoring

2. **Browser Throttling**
   - Risk: Background tab limitations
   - Mitigation: Efficient resource usage

## Acceptance Criteria

- [ ] Memory usage stays under 50MB baseline
- [ ] Selection response time < 50ms
- [ ] Cache hit rate > 80%
- [ ] No memory leaks detected
- [ ] Performance monitoring works
- [ ] Text chunking optimized
- [ ] Rate limiting implemented
- [ ] Cleanup on tab close
- [ ] Battery impact minimal
- [ ] All tests pass with targets met