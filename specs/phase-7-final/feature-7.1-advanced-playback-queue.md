# Feature 7.1: Advanced Playback Modes & Queue Management

## Overview

Implement advanced playback modes and sophisticated queue management to enable continuous reading workflows, better content organization, and seamless multi-selection reading experiences. This feature transforms the extension from a simple selection reader to a comprehensive reading assistant.

## Objectives

- Implement continuous reading mode that auto-proceeds to next paragraphs
- Create page reader mode that reads entire page from selection point
- Build advanced queue management with drag-and-drop reordering
- Add "Add to Queue" vs "Play Now" options in context menu
- Implement queue persistence across browser sessions
- Provide queue analytics and time estimations

## Technical Requirements

### Functional Requirements

1. **Reading Modes**
   - **Selection Only Mode**: Stop after selected text (current behavior)
   - **Continuous Mode**: Auto-detect and read next paragraph/section
   - **Page Reader Mode**: Read entire page from selection point downward
   - **Smart Mode**: Intelligently skip navigation, ads, and repetitive content

2. **Queue Management**
   - Visual queue with drag-and-drop reordering
   - Batch operations (clear all, remove completed, merge items)
   - Queue persistence across sessions
   - Queue export/import functionality
   - Priority levels for queue items
   - Estimated time remaining calculations

3. **Context Menu Enhancement**
   - "Play Now" - Interrupts current and plays immediately
   - "Add to Queue" - Adds to end of queue
   - "Play Next" - Inserts after current item
   - "Add to Priority Queue" - Adds with high priority

4. **Queue Item Features**
   - Title (auto-generated from first sentence or custom)
   - Source URL and timestamp
   - Estimated reading time
   - Progress tracking per item
   - Skip/repeat individual items
   - Edit text before reading

### Non-Functional Requirements

1. **Performance**
   - Queue operations < 10ms
   - Smooth drag-and-drop at 60fps
   - Support 1000+ queue items
   - Efficient memory usage with virtual scrolling

2. **Reliability**
   - Queue persistence with versioning
   - Graceful handling of corrupted queue data
   - Automatic backup of queue state
   - Recovery from interrupted sessions

3. **Usability**
   - Intuitive drag-and-drop interface
   - Clear visual feedback for all operations
   - Keyboard shortcuts for queue management
   - Mobile-responsive queue UI

## Implementation

### 1. Enhanced Queue Manager Service

```typescript
// src/services/AdvancedQueueManager.ts
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface QueueItem {
  id: string;
  text: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedDuration: number; // in seconds
  actualDuration?: number;
  progress: number; // 0-100
  status: 'pending' | 'playing' | 'paused' | 'completed' | 'skipped' | 'error';
  metadata: {
    language?: string;
    voice?: string;
    speed?: number;
    selectionContext?: string; // text around selection
    pageTitle?: string;
    position?: { x: number; y: number };
  };
  error?: string;
}

export interface ReadingMode {
  type: 'selection' | 'continuous' | 'page' | 'smart';
  options: {
    skipNavigation?: boolean;
    skipAds?: boolean;
    skipCodeBlocks?: boolean;
    paragraphPause?: number; // ms between paragraphs
    sectionPause?: number; // ms between sections
    maxReadingTime?: number; // max minutes for continuous reading
  };
}

export interface QueueState {
  items: QueueItem[];
  currentItemId: string | null;
  mode: ReadingMode;
  isPlaying: boolean;
  totalDuration: number;
  completedDuration: number;
  version: number;
}

export class AdvancedQueueManager extends EventEmitter {
  private static instance: AdvancedQueueManager;
  private queue: QueueItem[] = [];
  private currentItemId: string | null = null;
  private mode: ReadingMode = {
    type: 'selection',
    options: {},
  };
  private storageKey = 'tts_queue_state';
  private backupKey = 'tts_queue_backup';
  private maxQueueSize = 1000;
  private autosaveInterval: NodeJS.Timeout | null = null;

  static getInstance(): AdvancedQueueManager {
    if (!AdvancedQueueManager.instance) {
      AdvancedQueueManager.instance = new AdvancedQueueManager();
    }
    return AdvancedQueueManager.instance;
  }

  constructor() {
    super();
    this.loadQueue();
    this.startAutosave();
  }

  // Core Queue Operations
  async addToQueue(
    text: string,
    options: Partial<QueueItem> = {},
    position: 'end' | 'next' | 'priority' = 'end'
  ): Promise<QueueItem> {
    const item: QueueItem = {
      id: uuidv4(),
      text,
      title: options.title || this.generateTitle(text),
      sourceUrl: options.sourceUrl || window.location.href,
      sourceDomain: options.sourceDomain || window.location.hostname,
      timestamp: Date.now(),
      priority: options.priority || 'normal',
      estimatedDuration: this.estimateReadingTime(text),
      progress: 0,
      status: 'pending',
      metadata: options.metadata || {},
      ...options,
    };

    // Validate queue size
    if (this.queue.length >= this.maxQueueSize) {
      this.emit('queue-full', this.maxQueueSize);
      throw new Error(`Queue is full (max ${this.maxQueueSize} items)`);
    }

    // Add to queue based on position
    switch (position) {
      case 'next':
        const currentIndex = this.getCurrentItemIndex();
        this.queue.splice(currentIndex + 1, 0, item);
        break;
      case 'priority':
        // Insert based on priority level
        const insertIndex = this.findPriorityInsertIndex(item.priority);
        this.queue.splice(insertIndex, 0, item);
        break;
      case 'end':
      default:
        this.queue.push(item);
    }

    this.emit('item-added', item);
    this.saveQueue();
    return item;
  }

  async playNow(text: string, options: Partial<QueueItem> = {}): Promise<void> {
    // Stop current playback
    if (this.currentItemId) {
      await this.stop();
    }

    // Add and immediately play
    const item = await this.addToQueue(text, options, 'next');
    await this.playItem(item.id);
  }

  removeItem(itemId: string): boolean {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    const removed = this.queue.splice(index, 1)[0];
    
    // If removing current item, move to next
    if (this.currentItemId === itemId) {
      this.currentItemId = this.queue[index]?.id || null;
    }

    this.emit('item-removed', removed);
    this.saveQueue();
    return true;
  }

  reorderQueue(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.queue.length ||
        toIndex < 0 || toIndex >= this.queue.length) {
      throw new Error('Invalid indices for reordering');
    }

    const [item] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, item);

    this.emit('queue-reordered', { fromIndex, toIndex, item });
    this.saveQueue();
  }

  clearQueue(options: { completed?: boolean; errors?: boolean } = {}): void {
    if (options.completed || options.errors) {
      this.queue = this.queue.filter(item => {
        if (options.completed && item.status === 'completed') return false;
        if (options.errors && item.status === 'error') return false;
        return true;
      });
    } else {
      this.queue = [];
      this.currentItemId = null;
    }

    this.emit('queue-cleared', options);
    this.saveQueue();
  }

  // Playback Control
  async playItem(itemId: string): Promise<void> {
    const item = this.queue.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found in queue');

    // Update current item
    this.currentItemId = itemId;
    item.status = 'playing';

    // Send to TTS engine
    this.emit('play-item', item);
    
    // Start progress tracking
    this.startProgressTracking(item);
    
    this.saveQueue();
  }

  async playNext(): Promise<void> {
    const currentIndex = this.getCurrentItemIndex();
    const nextItem = this.queue[currentIndex + 1];
    
    if (!nextItem) {
      this.emit('queue-finished');
      return;
    }

    // Handle continuous mode
    if (this.mode.type === 'continuous' || this.mode.type === 'page') {
      const nextText = await this.getNextContent(nextItem);
      if (nextText) {
        await this.addToQueue(nextText, {
          sourceUrl: nextItem.sourceUrl,
          metadata: { ...nextItem.metadata, autoContinue: true },
        }, 'next');
      }
    }

    await this.playItem(nextItem.id);
  }

  pause(): void {
    const current = this.getCurrentItem();
    if (current) {
      current.status = 'paused';
      this.emit('item-paused', current);
      this.saveQueue();
    }
  }

  resume(): void {
    const current = this.getCurrentItem();
    if (current && current.status === 'paused') {
      current.status = 'playing';
      this.emit('item-resumed', current);
      this.saveQueue();
    }
  }

  stop(): void {
    if (this.currentItemId) {
      const current = this.getCurrentItem();
      if (current) {
        current.status = 'pending';
        current.progress = 0;
      }
      this.currentItemId = null;
      this.emit('playback-stopped');
      this.saveQueue();
    }
  }

  skip(): void {
    const current = this.getCurrentItem();
    if (current) {
      current.status = 'skipped';
      this.emit('item-skipped', current);
      this.playNext();
    }
  }

  // Reading Mode Management
  setReadingMode(mode: ReadingMode): void {
    this.mode = mode;
    this.emit('mode-changed', mode);
    this.saveQueue();
  }

  getReadingMode(): ReadingMode {
    return this.mode;
  }

  // Queue Analysis
  getQueueStats(): {
    totalItems: number;
    pendingItems: number;
    completedItems: number;
    totalDuration: number;
    remainingDuration: number;
    averageItemDuration: number;
    itemsByDomain: Record<string, number>;
    itemsByPriority: Record<string, number>;
  } {
    const stats = {
      totalItems: this.queue.length,
      pendingItems: 0,
      completedItems: 0,
      totalDuration: 0,
      remainingDuration: 0,
      averageItemDuration: 0,
      itemsByDomain: {} as Record<string, number>,
      itemsByPriority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
      },
    };

    let durations: number[] = [];

    this.queue.forEach(item => {
      // Status counts
      if (item.status === 'pending') stats.pendingItems++;
      if (item.status === 'completed') stats.completedItems++;

      // Duration calculations
      const duration = item.actualDuration || item.estimatedDuration;
      stats.totalDuration += duration;
      durations.push(duration);

      if (item.status === 'pending' || item.status === 'playing' || item.status === 'paused') {
        stats.remainingDuration += duration;
      }

      // Group by domain
      stats.itemsByDomain[item.sourceDomain] = (stats.itemsByDomain[item.sourceDomain] || 0) + 1;

      // Group by priority
      stats.itemsByPriority[item.priority]++;
    });

    // Calculate average
    if (durations.length > 0) {
      stats.averageItemDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    return stats;
  }

  // Progress Tracking
  updateProgress(itemId: string, progress: number): void {
    const item = this.queue.find(i => i.id === itemId);
    if (item) {
      item.progress = Math.min(100, Math.max(0, progress));
      
      // Update actual duration based on progress
      if (progress > 0 && item.status === 'playing') {
        const elapsed = (Date.now() - item.timestamp) / 1000;
        item.actualDuration = elapsed / (progress / 100);
      }

      this.emit('progress-updated', { item, progress });
      
      // Check if completed
      if (progress >= 100) {
        item.status = 'completed';
        this.emit('item-completed', item);
        
        // Auto-play next if enabled
        if (this.mode.type !== 'selection') {
          setTimeout(() => this.playNext(), this.mode.options.paragraphPause || 500);
        }
      }
    }
  }

  // Persistence
  private async saveQueue(): Promise<void> {
    const state: QueueState = {
      items: this.queue,
      currentItemId: this.currentItemId,
      mode: this.mode,
      isPlaying: false, // Will be updated by player
      totalDuration: this.getQueueStats().totalDuration,
      completedDuration: this.getQueueStats().totalDuration - this.getQueueStats().remainingDuration,
      version: 1,
    };

    try {
      // Save main state
      await chrome.storage.local.set({ [this.storageKey]: state });
      
      // Create backup every 10 saves
      if (Math.random() < 0.1) {
        await chrome.storage.local.set({ [this.backupKey]: state });
      }
    } catch (error) {
      console.error('Failed to save queue:', error);
      this.emit('save-error', error);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const data = await chrome.storage.local.get([this.storageKey, this.backupKey]);
      let state = data[this.storageKey] as QueueState;

      // Try backup if main is corrupted
      if (!state || !Array.isArray(state.items)) {
        state = data[this.backupKey] as QueueState;
      }

      if (state && Array.isArray(state.items)) {
        this.queue = state.items;
        this.currentItemId = state.currentItemId;
        this.mode = state.mode || this.mode;
        
        // Validate queue items
        this.queue = this.queue.filter(item => 
          item.id && item.text && typeof item.progress === 'number'
        );

        this.emit('queue-loaded', state);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
      this.emit('load-error', error);
    }
  }

  // Import/Export
  exportQueue(): string {
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      queue: this.queue,
      mode: this.mode,
      stats: this.getQueueStats(),
    };
    return JSON.stringify(exportData, null, 2);
  }

  importQueue(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.version !== 1 || !Array.isArray(data.queue)) {
        throw new Error('Invalid queue format');
      }

      // Validate and import
      this.queue = data.queue.filter((item: any) => 
        item.id && item.text && typeof item.text === 'string'
      );
      
      if (data.mode) {
        this.mode = data.mode;
      }

      this.saveQueue();
      this.emit('queue-imported', { itemCount: this.queue.length });
      return true;
    } catch (error) {
      console.error('Failed to import queue:', error);
      return false;
    }
  }

  // Helper Methods
  private generateTitle(text: string): string {
    // Get first sentence or first 50 characters
    const firstSentence = text.match(/^[^.!?]+[.!?]/);
    if (firstSentence) {
      return firstSentence[0].trim();
    }
    return text.substring(0, 50).trim() + '...';
  }

  private estimateReadingTime(text: string): number {
    // Average reading speed: 150-200 words per minute
    const words = text.split(/\s+/).length;
    const wordsPerSecond = 150 / 60; // Conservative estimate
    return Math.ceil(words / wordsPerSecond);
  }

  private getCurrentItemIndex(): number {
    if (!this.currentItemId) return -1;
    return this.queue.findIndex(item => item.id === this.currentItemId);
  }

  private getCurrentItem(): QueueItem | null {
    if (!this.currentItemId) return null;
    return this.queue.find(item => item.id === this.currentItemId) || null;
  }

  private findPriorityInsertIndex(priority: string): number {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const targetPriority = priorityOrder[priority as keyof typeof priorityOrder];

    for (let i = 0; i < this.queue.length; i++) {
      const itemPriority = priorityOrder[this.queue[i].priority];
      if (itemPriority > targetPriority) {
        return i;
      }
    }
    return this.queue.length;
  }

  private startProgressTracking(item: QueueItem): void {
    // This would be called by the TTS engine with actual progress
    // Simulated here for demonstration
    const interval = setInterval(() => {
      if (item.status !== 'playing') {
        clearInterval(interval);
        return;
      }
      
      // Simulate progress
      const newProgress = Math.min(100, item.progress + 1);
      this.updateProgress(item.id, newProgress);
      
      if (newProgress >= 100) {
        clearInterval(interval);
      }
    }, item.estimatedDuration * 10); // Update every 1%
  }

  private async getNextContent(currentItem: QueueItem): Promise<string | null> {
    // This would integrate with content detection
    // Placeholder for continuous reading logic
    if (this.mode.type === 'continuous') {
      // Would detect next paragraph/section
      return null;
    } else if (this.mode.type === 'page') {
      // Would get next content block from page
      return null;
    }
    return null;
  }

  private startAutosave(): void {
    this.autosaveInterval = setInterval(() => {
      this.saveQueue();
    }, 30000); // Every 30 seconds
  }

  dispose(): void {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
    }
    this.saveQueue();
    this.removeAllListeners();
  }
}
```

### 2. Queue UI Component

```typescript
// src/components/AdvancedQueueUI.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { AdvancedQueueManager, QueueItem, ReadingMode } from '../services/AdvancedQueueManager';

interface QueueItemProps {
  item: QueueItem;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

function SortableQueueItem({ item, isPlaying, onPlay, onRemove, onEdit }: QueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      urgent: '#ff4444',
      high: '#ff8800',
      normal: '#4CAF50',
      low: '#888888',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getStatusIcon = (status: string): string => {
    const icons = {
      pending: '⏳',
      playing: '▶️',
      paused: '⏸️',
      completed: '✅',
      skipped: '⏭️',
      error: '❌',
    };
    return icons[status as keyof typeof icons] || '';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`queue-item ${item.status} ${isPlaying ? 'current' : ''}`}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      <div className="item-content">
        <div className="item-header">
          <span className="status-icon">{getStatusIcon(item.status)}</span>
          <h4 className="item-title">{item.title}</h4>
          <span 
            className="priority-badge" 
            style={{ backgroundColor: getPriorityColor(item.priority) }}
          >
            {item.priority}
          </span>
        </div>

        <div className="item-metadata">
          <span className="domain">{item.sourceDomain}</span>
          <span className="duration">{formatDuration(item.estimatedDuration)}</span>
          <span className="word-count">{item.text.split(/\s+/).length} words</span>
        </div>

        {item.progress > 0 && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}

        <div className="item-actions">
          <button onClick={() => onPlay(item.id)} disabled={isPlaying}>
            {item.status === 'paused' ? 'Resume' : 'Play'}
          </button>
          <button onClick={() => onEdit(item.id, item.text)}>Edit</button>
          <button onClick={() => onRemove(item.id)} className="remove-btn">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdvancedQueueUI() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({});
  const [mode, setMode] = useState<ReadingMode>({ type: 'selection', options: {} });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const queueManager = AdvancedQueueManager.getInstance();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const updateUI = () => {
      setQueue([...queueManager.getQueue()]);
      setCurrentItemId(queueManager.getCurrentItemId());
      setStats(queueManager.getQueueStats());
      setMode(queueManager.getReadingMode());
    };

    // Initial load
    updateUI();

    // Subscribe to events
    const events = [
      'item-added', 'item-removed', 'queue-reordered',
      'queue-cleared', 'play-item', 'item-completed',
      'progress-updated', 'mode-changed'
    ];

    events.forEach(event => {
      queueManager.on(event, updateUI);
    });

    return () => {
      events.forEach(event => {
        queueManager.off(event, updateUI);
      });
    };
  }, []);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = queue.findIndex(item => item.id === active.id);
      const newIndex = queue.findIndex(item => item.id === over.id);
      
      queueManager.reorderQueue(oldIndex, newIndex);
    }
  };

  const handleModeChange = (newMode: ReadingMode['type']) => {
    queueManager.setReadingMode({
      ...mode,
      type: newMode,
    });
  };

  const handleClearQueue = (type?: 'completed' | 'errors') => {
    const options = type ? { [type]: true } : undefined;
    if (confirm(`Clear ${type || 'all'} items from queue?`)) {
      queueManager.clearQueue(options);
    }
  };

  const handleExport = () => {
    const data = queueManager.exportQueue();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tts-queue-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (queueManager.importQueue(content)) {
          alert('Queue imported successfully');
        } else {
          alert('Failed to import queue');
        }
      };
      reader.readAsText(file);
    }
  };

  const filteredQueue = queue.filter(item => {
    if (filter === 'pending' && item.status !== 'pending') return false;
    if (filter === 'completed' && item.status !== 'completed') return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(search) ||
        item.text.toLowerCase().includes(search) ||
        item.sourceDomain.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="advanced-queue-ui">
      <div className="queue-header">
        <h2>Reading Queue</h2>
        <div className="queue-stats">
          <span>{stats.totalItems} items</span>
          <span>{formatTime(stats.remainingDuration)} remaining</span>
        </div>
      </div>

      <div className="queue-controls">
        <div className="mode-selector">
          <label>Reading Mode:</label>
          <select 
            value={mode.type} 
            onChange={(e) => handleModeChange(e.target.value as ReadingMode['type'])}
          >
            <option value="selection">Selection Only</option>
            <option value="continuous">Continuous</option>
            <option value="page">Page Reader</option>
            <option value="smart">Smart Mode</option>
          </select>
        </div>

        <div className="filter-controls">
          <input
            type="text"
            placeholder="Search queue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Items</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="queue-actions">
          <button onClick={() => handleClearQueue('completed')}>
            Clear Completed
          </button>
          <button onClick={() => handleClearQueue()}>
            Clear All
          </button>
          <button onClick={handleExport}>Export</button>
          <label className="import-btn">
            Import
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>
        </div>
      </div>

      {mode.type !== 'selection' && (
        <div className="mode-options">
          <label>
            <input
              type="checkbox"
              checked={mode.options.skipNavigation}
              onChange={(e) => queueManager.setReadingMode({
                ...mode,
                options: { ...mode.options, skipNavigation: e.target.checked }
              })}
            />
            Skip Navigation
          </label>
          <label>
            <input
              type="checkbox"
              checked={mode.options.skipAds}
              onChange={(e) => queueManager.setReadingMode({
                ...mode,
                options: { ...mode.options, skipAds: e.target.checked }
              })}
            />
            Skip Ads
          </label>
          <label>
            Paragraph Pause:
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={mode.options.paragraphPause || 500}
              onChange={(e) => queueManager.setReadingMode({
                ...mode,
                options: { ...mode.options, paragraphPause: parseInt(e.target.value) }
              })}
            />
            {mode.options.paragraphPause || 500}ms
          </label>
        </div>
      )}

      <div className="queue-list">
        {filteredQueue.length === 0 ? (
          <div className="empty-queue">
            <p>No items in queue</p>
            <p className="hint">Select text and choose "Add to Queue" to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredQueue.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredQueue.map(item => (
                <SortableQueueItem
                  key={item.id}
                  item={item}
                  isPlaying={item.id === currentItemId}
                  onPlay={(id) => queueManager.playItem(id)}
                  onRemove={(id) => queueManager.removeItem(id)}
                  onEdit={(id, text) => {
                    // Would open edit dialog
                    console.log('Edit item:', id, text);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {stats.itemsByDomain && Object.keys(stats.itemsByDomain).length > 1 && (
        <div className="queue-analytics">
          <h3>Queue Analytics</h3>
          <div className="domain-stats">
            {Object.entries(stats.itemsByDomain).map(([domain, count]) => (
              <div key={domain} className="domain-stat">
                <span>{domain}</span>
                <span>{count} items</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Context Menu Enhancement

```typescript
// src/background/contextMenuEnhancer.ts
import { AdvancedQueueManager } from '../services/AdvancedQueueManager';

export class ContextMenuEnhancer {
  private queueManager: AdvancedQueueManager;
  private menuItems = {
    playNow: 'play-now',
    addToQueue: 'add-to-queue',
    playNext: 'play-next',
    addPriority: 'add-priority',
    separator: 'separator',
  };

  constructor() {
    this.queueManager = AdvancedQueueManager.getInstance();
    this.createMenus();
  }

  private createMenus(): void {
    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
      // Create parent menu
      chrome.contextMenus.create({
        id: 'tts-parent',
        title: 'Text-to-Speech',
        contexts: ['selection'],
      });

      // Play Now (default action)
      chrome.contextMenus.create({
        id: this.menuItems.playNow,
        parentId: 'tts-parent',
        title: 'Play Now',
        contexts: ['selection'],
      });

      // Add to Queue submenu
      chrome.contextMenus.create({
        id: 'queue-submenu',
        parentId: 'tts-parent',
        title: 'Add to Queue',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: this.menuItems.addToQueue,
        parentId: 'queue-submenu',
        title: 'Add to End',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: this.menuItems.playNext,
        parentId: 'queue-submenu',
        title: 'Play Next',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: this.menuItems.addPriority,
        parentId: 'queue-submenu',
        title: 'Add as Priority',
        contexts: ['selection'],
      });

      // Separator
      chrome.contextMenus.create({
        id: this.menuItems.separator,
        parentId: 'tts-parent',
        type: 'separator',
        contexts: ['selection'],
      });

      // Quick actions based on current state
      this.updateDynamicMenus();
    });

    // Handle clicks
    chrome.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));
  }

  private async handleMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<void> {
    if (!info.selectionText || !tab) return;

    const text = info.selectionText;
    const metadata = {
      sourceUrl: info.pageUrl || tab.url || '',
      sourceDomain: new URL(info.pageUrl || tab.url || '').hostname,
      pageTitle: tab.title,
      selectionContext: await this.getSelectionContext(tab.id!, info.frameId),
    };

    switch (info.menuItemId) {
      case this.menuItems.playNow:
        await this.queueManager.playNow(text, { metadata });
        this.showNotification('Playing selection', text);
        break;

      case this.menuItems.addToQueue:
        await this.queueManager.addToQueue(text, { metadata }, 'end');
        this.showNotification('Added to queue', text);
        break;

      case this.menuItems.playNext:
        await this.queueManager.addToQueue(text, { metadata }, 'next');
        this.showNotification('Will play next', text);
        break;

      case this.menuItems.addPriority:
        await this.queueManager.addToQueue(text, { 
          metadata, 
          priority: 'high' 
        }, 'priority');
        this.showNotification('Added as priority', text);
        break;
    }

    // Update badge with queue count
    this.updateBadge();
  }

  private async getSelectionContext(
    tabId: number, 
    frameId?: number
  ): Promise<string> {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId, frameIds: frameId ? [frameId] : undefined },
        func: () => {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return '';
          
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const parent = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement 
            : container as HTMLElement;
          
          // Get surrounding context (up to 100 chars before/after)
          const fullText = parent?.textContent || '';
          const selectedText = selection.toString();
          const startIndex = fullText.indexOf(selectedText);
          
          if (startIndex !== -1) {
            const contextStart = Math.max(0, startIndex - 100);
            const contextEnd = Math.min(
              fullText.length, 
              startIndex + selectedText.length + 100
            );
            return fullText.substring(contextStart, contextEnd);
          }
          
          return selectedText;
        },
      });
      
      return result[0]?.result as string || '';
    } catch (error) {
      console.error('Failed to get selection context:', error);
      return '';
    }
  }

  private updateDynamicMenus(): void {
    const stats = this.queueManager.getQueueStats();
    
    // Update menu titles with queue info
    chrome.contextMenus.update('queue-submenu', {
      title: `Add to Queue (${stats.totalItems} items)`,
    });

    // Add current mode indicator
    const mode = this.queueManager.getReadingMode();
    if (mode.type !== 'selection') {
      chrome.contextMenus.update(this.menuItems.playNow, {
        title: `Play Now (${mode.type} mode)`,
      });
    }
  }

  private updateBadge(): void {
    const stats = this.queueManager.getQueueStats();
    
    if (stats.pendingItems > 0) {
      chrome.action.setBadgeText({ text: stats.pendingItems.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  private showNotification(title: string, message: string): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: title,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      priority: 1,
    });
  }
}
```

## Testing

### Unit Tests

```typescript
// src/services/__tests__/AdvancedQueueManager.test.ts
describe('AdvancedQueueManager', () => {
  let manager: AdvancedQueueManager;

  beforeEach(() => {
    manager = AdvancedQueueManager.getInstance();
    manager.clearQueue();
  });

  describe('Queue Operations', () => {
    test('should add items to queue', async () => {
      const item = await manager.addToQueue('Test text');
      expect(item.text).toBe('Test text');
      expect(item.status).toBe('pending');
      expect(manager.getQueueStats().totalItems).toBe(1);
    });

    test('should handle priority insertion', async () => {
      await manager.addToQueue('Low priority', { priority: 'low' });
      await manager.addToQueue('Normal priority', { priority: 'normal' });
      await manager.addToQueue('High priority', { priority: 'high' }, 'priority');
      
      const queue = manager.getQueue();
      expect(queue[0].priority).toBe('high');
      expect(queue[1].priority).toBe('normal');
      expect(queue[2].priority).toBe('low');
    });

    test('should reorder queue items', async () => {
      const item1 = await manager.addToQueue('Item 1');
      const item2 = await manager.addToQueue('Item 2');
      const item3 = await manager.addToQueue('Item 3');
      
      manager.reorderQueue(2, 0);
      
      const queue = manager.getQueue();
      expect(queue[0].id).toBe(item3.id);
      expect(queue[1].id).toBe(item1.id);
      expect(queue[2].id).toBe(item2.id);
    });

    test('should enforce queue size limit', async () => {
      // Set a small limit for testing
      manager['maxQueueSize'] = 3;
      
      await manager.addToQueue('Item 1');
      await manager.addToQueue('Item 2');
      await manager.addToQueue('Item 3');
      
      await expect(manager.addToQueue('Item 4')).rejects.toThrow('Queue is full');
    });
  });

  describe('Playback Control', () => {
    test('should play items in sequence', async () => {
      const item1 = await manager.addToQueue('Item 1');
      const item2 = await manager.addToQueue('Item 2');
      
      await manager.playItem(item1.id);
      expect(manager.getCurrentItemId()).toBe(item1.id);
      
      await manager.playNext();
      expect(manager.getCurrentItemId()).toBe(item2.id);
    });

    test('should handle pause and resume', async () => {
      const item = await manager.addToQueue('Test item');
      await manager.playItem(item.id);
      
      manager.pause();
      expect(item.status).toBe('paused');
      
      manager.resume();
      expect(item.status).toBe('playing');
    });

    test('should update progress correctly', async () => {
      const item = await manager.addToQueue('Test item');
      await manager.playItem(item.id);
      
      manager.updateProgress(item.id, 50);
      expect(item.progress).toBe(50);
      
      manager.updateProgress(item.id, 100);
      expect(item.status).toBe('completed');
    });
  });

  describe('Reading Modes', () => {
    test('should set and get reading mode', () => {
      const mode: ReadingMode = {
        type: 'continuous',
        options: {
          skipNavigation: true,
          paragraphPause: 1000,
        },
      };
      
      manager.setReadingMode(mode);
      expect(manager.getReadingMode()).toEqual(mode);
    });

    test('should auto-continue in continuous mode', async () => {
      manager.setReadingMode({ type: 'continuous', options: {} });
      
      const item1 = await manager.addToQueue('Item 1');
      await manager.playItem(item1.id);
      
      // Simulate completion
      manager.updateProgress(item1.id, 100);
      
      // Should trigger playNext automatically
      setTimeout(() => {
        expect(manager.getCurrentItemId()).not.toBe(item1.id);
      }, 600);
    });
  });

  describe('Persistence', () => {
    test('should export and import queue', () => {
      manager.addToQueue('Item 1');
      manager.addToQueue('Item 2');
      
      const exported = manager.exportQueue();
      manager.clearQueue();
      
      expect(manager.getQueueStats().totalItems).toBe(0);
      
      const success = manager.importQueue(exported);
      expect(success).toBe(true);
      expect(manager.getQueueStats().totalItems).toBe(2);
    });

    test('should handle corrupted import data', () => {
      const success = manager.importQueue('invalid json');
      expect(success).toBe(false);
      
      const success2 = manager.importQueue('{"version": 2}');
      expect(success2).toBe(false);
    });
  });

  describe('Analytics', () => {
    test('should calculate queue statistics', async () => {
      await manager.addToQueue('Short text', { priority: 'high' });
      await manager.addToQueue('Medium length text here', { priority: 'normal' });
      await manager.addToQueue('Very long text with many words...', { priority: 'low' });
      
      const stats = manager.getQueueStats();
      expect(stats.totalItems).toBe(3);
      expect(stats.pendingItems).toBe(3);
      expect(stats.completedItems).toBe(0);
      expect(stats.itemsByPriority.high).toBe(1);
      expect(stats.itemsByPriority.normal).toBe(1);
      expect(stats.itemsByPriority.low).toBe(1);
    });
  });
});
```

## Success Metrics

1. **Performance Metrics**
   - Queue operations: < 10ms
   - Drag-and-drop: 60fps
   - Memory usage: < 20MB for 1000 items
   - Save/load time: < 100ms

2. **Functionality Metrics**
   - Queue persistence reliability: 99.9%
   - Continuous mode accuracy: 95%
   - Priority ordering accuracy: 100%
   - Progress tracking accuracy: ±1%

3. **User Experience Metrics**
   - Time to add to queue: < 2 clicks
   - Queue reordering smoothness: 60fps
   - Visual feedback latency: < 50ms
   - Mode switching time: < 100ms

## Dependencies

### Internal Dependencies
- TTS Controller from Phase 2
- Storage Service from Phase 5
- Text Processor from Phase 6.2
- Performance Manager from Phase 6.3

### External Dependencies
- @dnd-kit/core: Drag and drop functionality
- @dnd-kit/sortable: Sortable list implementation
- uuid: Unique ID generation

## Risks and Mitigation

### High-Risk Items
1. **Large Queue Performance**
   - Risk: UI lag with 1000+ items
   - Mitigation: Virtual scrolling, pagination

2. **Queue Corruption**
   - Risk: Lost user data
   - Mitigation: Backup system, validation

### Medium-Risk Items
1. **Continuous Mode Accuracy**
   - Risk: Reading wrong content
   - Mitigation: Smart content detection

2. **Cross-Tab Sync**
   - Risk: State conflicts
   - Mitigation: Centralized state management

## Acceptance Criteria

- [ ] All reading modes work as specified
- [ ] Queue supports 1000+ items smoothly
- [ ] Drag-and-drop reordering works at 60fps
- [ ] Context menu shows all queue options
- [ ] Queue persists across browser restarts
- [ ] Progress tracking is accurate
- [ ] Export/import functionality works
- [ ] Priority system orders correctly
- [ ] Analytics show accurate statistics
- [ ] All tests pass with >90% coverage