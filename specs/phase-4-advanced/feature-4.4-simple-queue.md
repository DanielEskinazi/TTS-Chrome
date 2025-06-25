# Feature 4.4: Simple Queue Management

## Feature Overview and Objectives

### Overview
Implement a simple queue management system that allows users to add multiple text selections to a playback queue, manage the order of items, and control playback flow between queued items. This feature enables users to create a sequential reading experience from multiple text sources or sections.

### Objectives
- Allow users to add multiple text selections to a playback queue
- Provide queue visualization and management interface
- Support automatic progression through queue items
- Enable manual queue item reordering and removal
- Maintain playback state across queue transitions
- Save queue state for future sessions
- Support queue playback controls (skip, previous, shuffle)

## Technical Requirements

### Core Requirements
- Queue data structure with CRUD operations
- Automatic progression to next queue item on completion
- Queue persistence using browser local storage
- Visual queue interface with drag-and-drop reordering
- Queue playback controls (play, pause, skip, previous)
- Real-time queue state synchronization

### Queue Management Requirements
- Add text items from page selections or manual input
- Remove individual items or clear entire queue
- Reorder items via drag-and-drop or button controls
- Duplicate detection and handling
- Queue item metadata (title, source, timestamp)
- Maximum queue size limits (performance considerations)

### Playback Integration Requirements
- Seamless transition between queue items
- Maintain TTS settings across queue items
- Progress tracking for entire queue and individual items
- Pause/resume functionality that works across queue boundaries
- Queue completion callbacks and notifications

## Implementation Steps

### Step 1: Queue Data Structure and Types

```typescript
// types/queue.ts
export interface QueueItem {
  id: string;
  title: string;
  text: string;
  source?: string; // URL or source identifier
  addedAt: number; // Timestamp
  duration?: number; // Estimated duration in seconds
  metadata?: {
    wordCount: number;
    characterCount: number;
    estimatedReadingTime: number;
  };
}

export interface QueueState {
  items: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  autoAdvance: boolean;
  repeatQueue: boolean;
  shuffleMode: boolean;
  totalDuration: number;
  currentProgress: number; // Progress through entire queue
}

export interface QueueActions {
  addItem: (item: Omit<QueueItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  clearQueue: () => void;
  moveToNext: () => boolean;
  moveToPrevious: () => boolean;
  jumpToItem: (index: number) => void;
  toggleAutoAdvance: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

export interface QueueConfig {
  maxItems: number;
  autoSave: boolean;
  storageKey: string;
  allowDuplicates: boolean;
  autoAdvanceDelay: number; // Delay between items in ms
}
```

### Step 2: Queue Management Hook

```typescript
// hooks/useQueue.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { QueueItem, QueueState, QueueActions, QueueConfig } from '../types/queue';

const DEFAULT_CONFIG: QueueConfig = {
  maxItems: 50,
  autoSave: true,
  storageKey: 'tts-queue',
  allowDuplicates: false,
  autoAdvanceDelay: 1000,
};

export const useQueue = (config: Partial<QueueConfig> = {}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [queueState, setQueueState] = useState<QueueState>({
    items: [],
    currentIndex: -1,
    isPlaying: false,
    isPaused: false,
    autoAdvance: true,
    repeatQueue: false,
    shuffleMode: false,
    totalDuration: 0,
    currentProgress: 0,
  });

  const autoAdvanceTimeoutRef = useRef<number | null>(null);

  // Load queue from storage on mount
  useEffect(() => {
    if (fullConfig.autoSave) {
      loadQueueFromStorage();
    }
  }, [fullConfig.autoSave]);

  // Save queue to storage when it changes
  useEffect(() => {
    if (fullConfig.autoSave && queueState.items.length > 0) {
      saveQueueToStorage();
    }
  }, [queueState.items, fullConfig.autoSave]);

  const loadQueueFromStorage = useCallback(() => {
    try {
      const savedQueue = localStorage.getItem(fullConfig.storageKey);
      if (savedQueue) {
        const parsedQueue = JSON.parse(savedQueue);
        setQueueState(prev => ({
          ...prev,
          items: parsedQueue.items || [],
          autoAdvance: parsedQueue.autoAdvance ?? true,
          repeatQueue: parsedQueue.repeatQueue ?? false,
          shuffleMode: parsedQueue.shuffleMode ?? false,
        }));
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
    }
  }, [fullConfig.storageKey]);

  const saveQueueToStorage = useCallback(() => {
    try {
      const queueToSave = {
        items: queueState.items,
        autoAdvance: queueState.autoAdvance,
        repeatQueue: queueState.repeatQueue,
        shuffleMode: queueState.shuffleMode,
        savedAt: Date.now(),
      };
      localStorage.setItem(fullConfig.storageKey, JSON.stringify(queueToSave));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }, [queueState, fullConfig.storageKey]);

  const generateItemId = useCallback(() => {
    return `queue-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const calculateItemMetadata = useCallback((text: string) => {
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = text.length;
    const estimatedReadingTime = Math.ceil(wordCount / 200) * 60; // 200 WPM average, in seconds

    return {
      wordCount,
      characterCount,
      estimatedReadingTime,
    };
  }, []);

  const addItem = useCallback((itemData: Omit<QueueItem, 'id' | 'addedAt'>) => {
    if (queueState.items.length >= fullConfig.maxItems) {
      throw new Error(`Queue is full. Maximum ${fullConfig.maxItems} items allowed.`);
    }

    if (!fullConfig.allowDuplicates) {
      const existingItem = queueState.items.find(item => item.text === itemData.text);
      if (existingItem) {
        throw new Error('This text is already in the queue.');
      }
    }

    const newItem: QueueItem = {
      ...itemData,
      id: generateItemId(),
      addedAt: Date.now(),
      metadata: calculateItemMetadata(itemData.text),
    };

    setQueueState(prev => {
      const newItems = [...prev.items, newItem];
      const totalDuration = newItems.reduce((sum, item) => 
        sum + (item.metadata?.estimatedReadingTime || 0), 0
      );

      return {
        ...prev,
        items: newItems,
        totalDuration,
        currentIndex: prev.currentIndex === -1 ? 0 : prev.currentIndex,
      };
    });
  }, [queueState.items, fullConfig, generateItemId, calculateItemMetadata]);

  const removeItem = useCallback((id: string) => {
    setQueueState(prev => {
      const itemIndex = prev.items.findIndex(item => item.id === id);
      if (itemIndex === -1) return prev;

      const newItems = prev.items.filter(item => item.id !== id);
      const totalDuration = newItems.reduce((sum, item) => 
        sum + (item.metadata?.estimatedReadingTime || 0), 0
      );

      let newCurrentIndex = prev.currentIndex;
      
      // Adjust current index if necessary
      if (itemIndex < prev.currentIndex) {
        newCurrentIndex = prev.currentIndex - 1;
      } else if (itemIndex === prev.currentIndex) {
        // If removing current item, stay at same index or move to previous if at end
        if (newCurrentIndex >= newItems.length) {
          newCurrentIndex = Math.max(0, newItems.length - 1);
        }
      }

      return {
        ...prev,
        items: newItems,
        totalDuration,
        currentIndex: newItems.length === 0 ? -1 : newCurrentIndex,
      };
    });
  }, []);

  const reorderItems = useCallback((startIndex: number, endIndex: number) => {
    setQueueState(prev => {
      if (startIndex < 0 || endIndex < 0 || 
          startIndex >= prev.items.length || endIndex >= prev.items.length) {
        return prev;
      }

      const newItems = [...prev.items];
      const [movedItem] = newItems.splice(startIndex, 1);
      newItems.splice(endIndex, 0, movedItem);

      // Update current index based on the reordering
      let newCurrentIndex = prev.currentIndex;
      if (prev.currentIndex === startIndex) {
        newCurrentIndex = endIndex;
      } else if (startIndex < prev.currentIndex && endIndex >= prev.currentIndex) {
        newCurrentIndex = prev.currentIndex - 1;
      } else if (startIndex > prev.currentIndex && endIndex <= prev.currentIndex) {
        newCurrentIndex = prev.currentIndex + 1;
      }

      return {
        ...prev,
        items: newItems,
        currentIndex: newCurrentIndex,
      };
    });
  }, []);

  const clearQueue = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
    }

    setQueueState(prev => ({
      ...prev,
      items: [],
      currentIndex: -1,
      isPlaying: false,
      isPaused: false,
      totalDuration: 0,
      currentProgress: 0,
    }));
  }, []);

  const getNextIndex = useCallback((currentIndex: number, items: QueueItem[]) => {
    if (queueState.shuffleMode) {
      // Simple shuffle: random index different from current
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * items.length);
      } while (nextIndex === currentIndex && items.length > 1);
      return nextIndex;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      return queueState.repeatQueue ? 0 : -1;
    }
    return nextIndex;
  }, [queueState.shuffleMode, queueState.repeatQueue]);

  const getPreviousIndex = useCallback((currentIndex: number, items: QueueItem[]) => {
    if (queueState.shuffleMode) {
      // For previous in shuffle mode, we could keep a history, but for simplicity:
      let prevIndex;
      do {
        prevIndex = Math.floor(Math.random() * items.length);
      } while (prevIndex === currentIndex && items.length > 1);
      return prevIndex;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      return queueState.repeatQueue ? items.length - 1 : -1;
    }
    return prevIndex;
  }, [queueState.shuffleMode, queueState.repeatQueue]);

  const moveToNext = useCallback(() => {
    const nextIndex = getNextIndex(queueState.currentIndex, queueState.items);
    if (nextIndex >= 0) {
      setQueueState(prev => ({ ...prev, currentIndex: nextIndex }));
      return true;
    }
    return false;
  }, [queueState.currentIndex, queueState.items, getNextIndex]);

  const moveToPrevious = useCallback(() => {
    const prevIndex = getPreviousIndex(queueState.currentIndex, queueState.items);
    if (prevIndex >= 0) {
      setQueueState(prev => ({ ...prev, currentIndex: prevIndex }));
      return true;
    }
    return false;
  }, [queueState.currentIndex, queueState.items, getPreviousIndex]);

  const jumpToItem = useCallback((index: number) => {
    if (index >= 0 && index < queueState.items.length) {
      setQueueState(prev => ({ ...prev, currentIndex: index }));
    }
  }, [queueState.items.length]);

  const toggleAutoAdvance = useCallback(() => {
    setQueueState(prev => ({ ...prev, autoAdvance: !prev.autoAdvance }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setQueueState(prev => ({ ...prev, repeatQueue: !prev.repeatQueue }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setQueueState(prev => ({ ...prev, shuffleMode: !prev.shuffleMode }));
  }, []);

  const handleItemComplete = useCallback(() => {
    if (queueState.autoAdvance) {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }

      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        const moved = moveToNext();
        if (!moved) {
          // Queue completed
          setQueueState(prev => ({ 
            ...prev, 
            isPlaying: false, 
            currentProgress: 100 
          }));
        }
      }, fullConfig.autoAdvanceDelay);
    }
  }, [queueState.autoAdvance, moveToNext, fullConfig.autoAdvanceDelay]);

  const updatePlaybackState = useCallback((isPlaying: boolean, isPaused: boolean = false) => {
    setQueueState(prev => ({ ...prev, isPlaying, isPaused }));
  }, []);

  const updateProgress = useCallback((itemProgress: number) => {
    setQueueState(prev => {
      if (prev.items.length === 0 || prev.currentIndex < 0) return prev;

      // Calculate overall queue progress
      const completedItems = prev.currentIndex;
      const currentItemProgress = itemProgress / 100;
      const overallProgress = ((completedItems + currentItemProgress) / prev.items.length) * 100;

      return {
        ...prev,
        currentProgress: Math.min(100, overallProgress),
      };
    });
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const actions: QueueActions = {
    addItem,
    removeItem,
    reorderItems,
    clearQueue,
    moveToNext,
    moveToPrevious,
    jumpToItem,
    toggleAutoAdvance,
    toggleRepeat,
    toggleShuffle,
  };

  return {
    queueState,
    actions,
    handleItemComplete,
    updatePlaybackState,
    updateProgress,
    getCurrentItem: () => 
      queueState.currentIndex >= 0 ? queueState.items[queueState.currentIndex] : null,
  };
};
```

### Step 3: Queue UI Components

```typescript
// components/QueueItem.tsx
import React from 'react';
import { QueueItem as QueueItemType } from '../types/queue';

interface QueueItemProps {
  item: QueueItemType;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onRemove: (id: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  className?: string;
}

export const QueueItemComponent: React.FC<QueueItemProps> = ({
  item,
  index,
  isActive,
  isPlaying,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
  className = '',
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className={`queue-item ${isActive ? 'active' : ''} ${className}`}>
      {/* Item Status Indicator */}
      <div className="item-status">
        {isActive && isPlaying && (
          <div className="playing-indicator">
            <div className="playing-animation">♪</div>
          </div>
        )}
        <span className="item-index">{index + 1}</span>
      </div>

      {/* Item Content */}
      <div className="item-content">
        <div className="item-header">
          <h4 className="item-title">{item.title}</h4>
          {item.source && (
            <span className="item-source">{item.source}</span>
          )}
        </div>
        
        <div className="item-text">
          {truncateText(item.text)}
        </div>

        <div className="item-metadata">
          <span className="word-count">
            {item.metadata?.wordCount} words
          </span>
          <span className="character-count">
            {item.metadata?.characterCount} chars
          </span>
          <span className="estimated-time">
            ~{formatDuration(item.metadata?.estimatedReadingTime || 0)}
          </span>
          <span className="added-time">
            Added: {formatTimestamp(item.addedAt)}
          </span>
        </div>
      </div>

      {/* Item Controls */}
      <div className="item-controls">
        <button
          className="btn-play"
          onClick={() => onPlay(index)}
          disabled={isActive && isPlaying}
          title="Play this item"
        >
          {isActive && isPlaying ? '▶️' : '▶️'}
        </button>

        <div className="reorder-controls">
          {onMoveUp && (
            <button
              className="btn-move-up"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              title="Move up"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              className="btn-move-down"
              onClick={() => onMoveDown(index)}
              title="Move down"
            >
              ↓
            </button>
          )}
        </div>

        <button
          className="btn-remove"
          onClick={() => onRemove(item.id)}
          title="Remove from queue"
        >
          ❌
        </button>
      </div>
    </div>
  );
};
```

```typescript
// components/QueueControls.tsx
import React from 'react';
import { QueueState } from '../types/queue';

interface QueueControlsProps {
  queueState: QueueState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleAutoAdvance: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onClearQueue: () => void;
  disabled?: boolean;
}

export const QueueControls: React.FC<QueueControlsProps> = ({
  queueState,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrevious,
  onToggleAutoAdvance,
  onToggleRepeat,
  onToggleShuffle,
  onClearQueue,
  disabled = false,
}) => {
  const hasItems = queueState.items.length > 0;
  const hasCurrentItem = queueState.currentIndex >= 0;

  const formatTotalDuration = () => {
    const hours = Math.floor(queueState.totalDuration / 3600);
    const minutes = Math.floor((queueState.totalDuration % 3600) / 60);
    const seconds = queueState.totalDuration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="queue-controls">
      {/* Main Playback Controls */}
      <div className="main-controls">
        <button
          className="btn-previous"
          onClick={onPrevious}
          disabled={disabled || !hasCurrentItem}
          title="Previous item"
        >
          ⏮️
        </button>

        {queueState.isPlaying && !queueState.isPaused ? (
          <button
            className="btn-pause"
            onClick={onPause}
            disabled={disabled}
            title="Pause"
          >
            ⏸️
          </button>
        ) : (
          <button
            className="btn-play"
            onClick={onPlay}
            disabled={disabled || !hasItems}
            title="Play"
          >
            ▶️
          </button>
        )}

        <button
          className="btn-stop"
          onClick={onStop}
          disabled={disabled || !queueState.isPlaying}
          title="Stop"
        >
          ⏹️
        </button>

        <button
          className="btn-next"
          onClick={onNext}
          disabled={disabled || !hasCurrentItem}
          title="Next item"
        >
          ⏭️
        </button>
      </div>

      {/* Queue Progress */}
      <div className="queue-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${queueState.currentProgress}%` }}
          />
        </div>
        <div className="progress-info">
          <span className="current-item">
            {hasCurrentItem ? queueState.currentIndex + 1 : 0} / {queueState.items.length}
          </span>
          <span className="progress-percentage">
            {Math.round(queueState.currentProgress)}%
          </span>
        </div>
      </div>

      {/* Queue Options */}
      <div className="queue-options">
        <button
          className={`btn-option ${queueState.autoAdvance ? 'active' : ''}`}
          onClick={onToggleAutoAdvance}
          title="Auto-advance to next item"
        >
          🔄 Auto
        </button>

        <button
          className={`btn-option ${queueState.repeatQueue ? 'active' : ''}`}
          onClick={onToggleRepeat}
          title="Repeat queue"
        >
          🔁 Repeat
        </button>

        <button
          className={`btn-option ${queueState.shuffleMode ? 'active' : ''}`}
          onClick={onToggleShuffle}
          title="Shuffle mode"
        >
          🔀 Shuffle
        </button>
      </div>

      {/* Queue Info */}
      <div className="queue-info">
        <span className="item-count">
          {queueState.items.length} items
        </span>
        <span className="total-duration">
          Total: {formatTotalDuration()}
        </span>
      </div>

      {/* Queue Management */}
      <div className="queue-management">
        <button
          className="btn-clear"
          onClick={onClearQueue}
          disabled={!hasItems}
          title="Clear queue"
        >
          🗑️ Clear All
        </button>
      </div>
    </div>
  );
};
```

```typescript
// components/QueueManager.tsx
import React, { useState, useCallback } from 'react';
import { useQueue } from '../hooks/useQueue';
import { QueueControls } from './QueueControls';
import { QueueItemComponent } from './QueueItem';
import { QueueItem } from '../types/queue';

interface QueueManagerProps {
  onPlayItem?: (item: QueueItem) => void;
  onQueueComplete?: () => void;
  className?: string;
}

export const QueueManager: React.FC<QueueManagerProps> = ({
  onPlayItem,
  onQueueComplete,
  className = '',
}) => {
  const { queueState, actions, handleItemComplete, updatePlaybackState, getCurrentItem } = useQueue();
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    const currentItem = getCurrentItem();
    if (currentItem) {
      setIsPlaying(true);
      updatePlaybackState(true, false);
      onPlayItem?.(currentItem);
    }
  }, [getCurrentItem, updatePlaybackState, onPlayItem]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    updatePlaybackState(false, true);
  }, [updatePlaybackState]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    updatePlaybackState(false, false);
  }, [updatePlaybackState]);

  const handleNext = useCallback(() => {
    const moved = actions.moveToNext();
    if (moved) {
      const newCurrentItem = getCurrentItem();
      if (newCurrentItem && isPlaying) {
        onPlayItem?.(newCurrentItem);
      }
    } else {
      // Queue completed
      handleStop();
      onQueueComplete?.();
    }
  }, [actions, getCurrentItem, isPlaying, onPlayItem, handleStop, onQueueComplete]);

  const handlePrevious = useCallback(() => {
    const moved = actions.moveToPrevious();
    if (moved) {
      const newCurrentItem = getCurrentItem();
      if (newCurrentItem && isPlaying) {
        onPlayItem?.(newCurrentItem);
      }
    }
  }, [actions, getCurrentItem, isPlaying, onPlayItem]);

  const handlePlayItem = useCallback((index: number) => {
    actions.jumpToItem(index);
    const currentItem = getCurrentItem();
    if (currentItem) {
      setIsPlaying(true);
      updatePlaybackState(true, false);
      onPlayItem?.(currentItem);
    }
  }, [actions, getCurrentItem, updatePlaybackState, onPlayItem]);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      actions.reorderItems(index, index - 1);
    }
  }, [actions]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < queueState.items.length - 1) {
      actions.reorderItems(index, index + 1);
    }
  }, [actions, queueState.items.length]);

  const handleAddTextToQueue = useCallback((text: string, title?: string) => {
    try {
      actions.addItem({
        title: title || `Item ${queueState.items.length + 1}`,
        text: text.trim(),
        source: window.location.href,
      });
    } catch (error) {
      console.error('Failed to add item to queue:', error);
      // You might want to show a toast notification here
    }
  }, [actions, queueState.items.length]);

  return (
    <div className={`queue-manager ${className}`}>
      {/* Queue Controls */}
      <QueueControls
        queueState={queueState}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onToggleAutoAdvance={actions.toggleAutoAdvance}
        onToggleRepeat={actions.toggleRepeat}
        onToggleShuffle={actions.toggleShuffle}
        onClearQueue={actions.clearQueue}
      />

      {/* Add Item Interface */}
      <div className="add-item-section">
        <AddItemForm onAddItem={handleAddTextToQueue} />
      </div>

      {/* Queue Items List */}
      <div className="queue-items">
        <h3>Queue ({queueState.items.length} items)</h3>
        
        {queueState.items.length === 0 ? (
          <div className="empty-queue">
            <p>No items in queue</p>
            <p>Add text selections to start building your reading queue</p>
          </div>
        ) : (
          <div className="queue-items-list">
            {queueState.items.map((item, index) => (
              <QueueItemComponent
                key={item.id}
                item={item}
                index={index}
                isActive={index === queueState.currentIndex}
                isPlaying={isPlaying && index === queueState.currentIndex}
                onPlay={handlePlayItem}
                onRemove={actions.removeItem}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple form component for adding items
const AddItemForm: React.FC<{
  onAddItem: (text: string, title?: string) => void;
}> = ({ onAddItem }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAddItem(text.trim(), title.trim() || undefined);
      setText('');
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-item-form">
      <div className="form-group">
        <input
          type="text"
          placeholder="Item title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="title-input"
        />
      </div>
      <div className="form-group">
        <textarea
          placeholder="Enter text to add to queue..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="text-input"
          rows={3}
          required
        />
      </div>
      <button type="submit" className="btn-add" disabled={!text.trim()}>
        Add to Queue
      </button>
    </form>
  );
};
```

### Step 4: Integration with Main TTS Component

```typescript
// components/TTSWithQueue.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { TTSServiceWithPauseResume } from '../services/ttsServiceWithPauseResume';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { QueueManager } from './QueueManager';
import { QueueItem } from '../types/queue';

interface TTSWithQueueProps {
  initialText?: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export const TTSWithQueue: React.FC<TTSWithQueueProps> = ({
  initialText,
  onComplete,
  onError,
  className = '',
}) => {
  const [ttsService] = useState(() => new TTSServiceWithPauseResume());
  const [currentItem, setCurrentItem] = useState<QueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { progress, initializeProgress, updateProgress, resetProgress } = 
    useProgressTracking(currentItem?.text || '');

  // Set up TTS service callbacks
  useEffect(() => {
    ttsService.setProgressCallback((update) => {
      updateProgress(update);
      
      if (update.type === 'end') {
        handleItemComplete();
      }
    });
  }, [ttsService, updateProgress]);

  const handlePlayItem = useCallback(async (item: QueueItem) => {
    try {
      setCurrentItem(item);
      setIsPlaying(true);
      
      initializeProgress(item.text);
      await ttsService.speak(item.text);
      
    } catch (error) {
      setIsPlaying(false);
      resetProgress();
      onError?.(error as Error);
    }
  }, [ttsService, initializeProgress, resetProgress, onError]);

  const handleItemComplete = useCallback(() => {
    setIsPlaying(false);
    // The QueueManager will handle advancing to the next item
  }, []);

  const handleQueueComplete = useCallback(() => {
    setCurrentItem(null);
    setIsPlaying(false);
    resetProgress();
    onComplete?.();
  }, [resetProgress, onComplete]);

  const handlePause = useCallback(() => {
    ttsService.pause();
    setIsPlaying(false);
  }, [ttsService]);

  const handleResume = useCallback(() => {
    const success = ttsService.resume();
    if (success) {
      setIsPlaying(true);
    }
  }, [ttsService]);

  const handleStop = useCallback(() => {
    ttsService.stop();
    setIsPlaying(false);
    resetProgress();
  }, [ttsService, resetProgress]);

  // Add initial text to queue if provided
  useEffect(() => {
    if (initialText) {
      // This would be handled by the QueueManager's add functionality
      console.log('Initial text provided:', initialText);
    }
  }, [initialText]);

  return (
    <div className={`tts-with-queue ${className}`}>
      {/* Current Item Display */}
      {currentItem && (
        <div className="current-item-display">
          <h3>Now Playing: {currentItem.title}</h3>
          
          {/* Progress for current item */}
          <div className="current-item-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            <div className="progress-info">
              <span>{Math.round(progress.percentComplete)}% complete</span>
              <span>{progress.timeElapsed}s elapsed</span>
              <span>{progress.estimatedTimeRemaining}s remaining</span>
            </div>
          </div>

          {/* Item Controls */}
          <div className="current-item-controls">
            {isPlaying ? (
              <button onClick={handlePause} className="btn-pause">
                Pause
              </button>
            ) : (
              <button onClick={handleResume} className="btn-resume">
                Resume
              </button>
            )}
            <button onClick={handleStop} className="btn-stop">
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Queue Manager */}
      <QueueManager
        onPlayItem={handlePlayItem}
        onQueueComplete={handleQueueComplete}
        className="queue-section"
      />
    </div>
  );
};
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// tests/useQueue.test.ts
import { renderHook, act } from '@testing-library/react';
import { useQueue } from '../hooks/useQueue';

describe('useQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should initialize with empty queue', () => {
    const { result } = renderHook(() => useQueue());
    
    expect(result.current.queueState.items).toHaveLength(0);
    expect(result.current.queueState.currentIndex).toBe(-1);
    expect(result.current.queueState.isPlaying).toBe(false);
  });

  test('should add items to queue', () => {
    const { result } = renderHook(() => useQueue());
    
    act(() => {
      result.current.actions.addItem({
        title: 'Test Item',
        text: 'This is a test text for the queue.',
      });
    });

    expect(result.current.queueState.items).toHaveLength(1);
    expect(result.current.queueState.items[0].title).toBe('Test Item');
    expect(result.current.queueState.currentIndex).toBe(0);
  });

  test('should remove items from queue', () => {
    const { result } = renderHook(() => useQueue());
    
    act(() => {
      result.current.actions.addItem({
        title: 'Test Item 1',
        text: 'First test text.',
      });
      result.current.actions.addItem({
        title: 'Test Item 2',
        text: 'Second test text.',
      });
    });

    const firstItemId = result.current.queueState.items[0].id;
    
    act(() => {
      result.current.actions.removeItem(firstItemId);
    });

    expect(result.current.queueState.items).toHaveLength(1);
    expect(result.current.queueState.items[0].title).toBe('Test Item 2');
  });

  test('should reorder items correctly', () => {
    const { result } = renderHook(() => useQueue());
    
    act(() => {
      result.current.actions.addItem({ title: 'Item 1', text: 'Text 1' });
      result.current.actions.addItem({ title: 'Item 2', text: 'Text 2' });
      result.current.actions.addItem({ title: 'Item 3', text: 'Text 3' });
    });

    act(() => {
      result.current.actions.reorderItems(0, 2); // Move first item to third position
    });

    expect(result.current.queueState.items[0].title).toBe('Item 2');
    expect(result.current.queueState.items[1].title).toBe('Item 3');
    expect(result.current.queueState.items[2].title).toBe('Item 1');
  });

  test('should handle navigation correctly', () => {
    const { result } = renderHook(() => useQueue());
    
    act(() => {
      result.current.actions.addItem({ title: 'Item 1', text: 'Text 1' });
      result.current.actions.addItem({ title: 'Item 2', text: 'Text 2' });
      result.current.actions.addItem({ title: 'Item 3', text: 'Text 3' });
    });

    // Move to next
    act(() => {
      const moved = result.current.actions.moveToNext();
      expect(moved).toBe(true);
    });
    expect(result.current.queueState.currentIndex).toBe(1);

    // Move to previous
    act(() => {
      const moved = result.current.actions.moveToPrevious();
      expect(moved).toBe(true);
    });
    expect(result.current.queueState.currentIndex).toBe(0);
  });

  test('should handle repeat mode', () => {
    const { result } = renderHook(() => useQueue());
    
    act(() => {
      result.current.actions.addItem({ title: 'Item 1', text: 'Text 1' });
      result.current.actions.addItem({ title: 'Item 2', text: 'Text 2' });
      result.current.actions.toggleRepeat();
      result.current.actions.jumpToItem(1); // Go to last item
    });

    // Should wrap to beginning when repeat is enabled
    act(() => {
      const moved = result.current.actions.moveToNext();
      expect(moved).toBe(true);
    });
    expect(result.current.queueState.currentIndex).toBe(0);
  });

  test('should prevent duplicate items when configured', () => {
    const { result } = renderHook(() => useQueue({ allowDuplicates: false }));
    
    act(() => {
      result.current.actions.addItem({
        title: 'Test Item',
        text: 'This is a test text.',
      });
    });

    expect(() => {
      act(() => {
        result.current.actions.addItem({
          title: 'Test Item 2',
          text: 'This is a test text.', // Same text
        });
      });
    }).toThrow('This text is already in the queue.');
  });

  test('should respect maximum queue size', () => {
    const { result } = renderHook(() => useQueue({ maxItems: 2 }));
    
    act(() => {
      result.current.actions.addItem({ title: 'Item 1', text: 'Text 1' });
      result.current.actions.addItem({ title: 'Item 2', text: 'Text 2' });
    });

    expect(() => {
      act(() => {
        result.current.actions.addItem({ title: 'Item 3', text: 'Text 3' });
      });
    }).toThrow('Queue is full. Maximum 2 items allowed.');
  });
});
```

### Integration Tests

```typescript
// tests/queueManager.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueueManager } from '../components/QueueManager';

describe('QueueManager', () => {
  test('should render empty queue state', () => {
    render(<QueueManager />);
    
    expect(screen.getByText('No items in queue')).toBeInTheDocument();
    expect(screen.getByText('Queue (0 items)')).toBeInTheDocument();
  });

  test('should add items to queue through form', async () => {
    render(<QueueManager />);
    
    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText('Item title (optional)'), {
      target: { value: 'Test Item' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter text to add to queue...'), {
      target: { value: 'This is test text for the queue.' }
    });
    fireEvent.click(screen.getByText('Add to Queue'));

    await waitFor(() => {
      expect(screen.getByText('Queue (1 items)')).toBeInTheDocument();
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  test('should play queue items', async () => {
    const onPlayItem = jest.fn();
    render(<QueueManager onPlayItem={onPlayItem} />);
    
    // Add an item
    fireEvent.change(screen.getByPlaceholderText('Enter text to add to queue...'), {
      target: { value: 'Test text to play.' }
    });
    fireEvent.click(screen.getByText('Add to Queue'));

    await waitFor(() => {
      expect(screen.getByText('Queue (1 items)')).toBeInTheDocument();
    });

    // Click play
    fireEvent.click(screen.getByTitle('Play'));

    expect(onPlayItem).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Test text to play.',
      })
    );
  });

  test('should remove items from queue', async () => {
    render(<QueueManager />);
    
    // Add an item
    fireEvent.change(screen.getByPlaceholderText('Enter text to add to queue...'), {
      target: { value: 'Item to be removed.' }
    });
    fireEvent.click(screen.getByText('Add to Queue'));

    await waitFor(() => {
      expect(screen.getByText('Queue (1 items)')).toBeInTheDocument();
    });

    // Remove the item
    fireEvent.click(screen.getByTitle('Remove from queue'));

    await waitFor(() => {
      expect(screen.getByText('Queue (0 items)')).toBeInTheDocument();
      expect(screen.getByText('No items in queue')).toBeInTheDocument();
    });
  });

  test('should handle queue controls', async () => {
    render(<QueueManager />);
    
    // Add multiple items
    for (let i = 1; i <= 3; i++) {
      fireEvent.change(screen.getByPlaceholderText('Enter text to add to queue...'), {
        target: { value: `Item ${i} text.` }
      });
      fireEvent.click(screen.getByText('Add to Queue'));
    }

    await waitFor(() => {
      expect(screen.getByText('Queue (3 items)')).toBeInTheDocument();
    });

    // Test next/previous buttons
    fireEvent.click(screen.getByTitle('Next item'));
    fireEvent.click(screen.getByTitle('Previous item'));

    // Test mode toggles
    fireEvent.click(screen.getByTitle('Auto-advance to next item'));
    fireEvent.click(screen.getByTitle('Repeat queue'));
    fireEvent.click(screen.getByTitle('Shuffle mode'));

    // Verify buttons are toggled
    expect(screen.getByTitle('Auto-advance to next item')).toHaveClass('active');
    expect(screen.getByTitle('Repeat queue')).toHaveClass('active');
    expect(screen.getByTitle('Shuffle mode')).toHaveClass('active');
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e/queueManagement.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Queue Management', () => {
  test('should create and manage a complete queue workflow', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Add multiple items to queue
    const items = [
      { title: 'First Item', text: 'This is the first item in the queue.' },
      { title: 'Second Item', text: 'This is the second item to be read.' },
      { title: 'Third Item', text: 'This is the final item in our test queue.' },
    ];

    for (const item of items) {
      await page.fill('input[placeholder="Item title (optional)"]', item.title);
      await page.fill('textarea[placeholder="Enter text to add to queue..."]', item.text);
      await page.click('button:has-text("Add to Queue")');
    }

    // Verify queue was populated
    await expect(page.locator('text=Queue (3 items)')).toBeVisible();

    // Start queue playback
    await page.click('button[title="Play"]');
    
    // Verify first item is playing
    await expect(page.locator('.queue-item.active')).toContainText('First Item');
    await expect(page.locator('.playing-indicator')).toBeVisible();

    // Skip to next item
    await page.click('button[title="Next item"]');
    await expect(page.locator('.queue-item.active')).toContainText('Second Item');

    // Test pause/resume
    await page.click('button[title="Pause"]');
    await expect(page.locator('button[title="Play"]')).toBeVisible();

    await page.click('button[title="Play"]');
    await expect(page.locator('button[title="Pause"]')).toBeVisible();

    // Test reordering
    await page.click('button[title="Move up"]');
    // First item should now be second in the list

    // Test remove item
    await page.click('button[title="Remove from queue"]');
    await expect(page.locator('text=Queue (2 items)')).toBeVisible();

    // Test clear queue
    await page.click('button[title="Clear queue"]');
    await expect(page.locator('text=Queue (0 items)')).toBeVisible();
    await expect(page.locator('text=No items in queue')).toBeVisible();
  });

  test('should persist queue across browser sessions', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Add items to queue
    await page.fill('textarea[placeholder="Enter text to add to queue..."]', 'Persistent queue item.');
    await page.click('button:has-text("Add to Queue")');
    
    await expect(page.locator('text=Queue (1 items)')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify queue persisted
    await expect(page.locator('text=Queue (1 items)')).toBeVisible();
    await expect(page.locator('text=Persistent queue item.')).toBeVisible();
  });

  test('should handle queue completion correctly', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Add a short item
    await page.fill('textarea[placeholder="Enter text to add to queue..."]', 'Short item.');
    await page.click('button:has-text("Add to Queue")');

    // Enable auto-advance and play
    await page.click('button[title="Auto-advance to next item"]');
    await page.click('button[title="Play"]');

    // Wait for completion (this might need adjustment based on TTS speed)
    await page.waitForTimeout(5000);

    // Verify queue completed
    await expect(page.locator('button[title="Play"]')).toBeVisible();
    expect(await page.locator('.progress-fill').getAttribute('style')).toContain('100%');
  });

  test('should handle queue modes correctly', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Add multiple items
    for (let i = 1; i <= 3; i++) {
      await page.fill('textarea[placeholder="Enter text to add to queue..."]', `Queue item ${i}.`);
      await page.click('button:has-text("Add to Queue")');
    }

    // Test repeat mode
    await page.click('button[title="Repeat queue"]');
    
    // Go to last item
    await page.click('button[title="Next item"]');
    await page.click('button[title="Next item"]');
    
    // Next should wrap to first item with repeat enabled
    await page.click('button[title="Next item"]');
    await expect(page.locator('.queue-item.active')).toContainText('Queue item 1');

    // Test shuffle mode
    await page.click('button[title="Shuffle mode"]');
    await expect(page.locator('button[title="Shuffle mode"]')).toHaveClass(/active/);
  });
});
```

## Success Metrics

### Functional Metrics
- Queue operations (add, remove, reorder) complete within 100ms
- Queue state persists correctly across browser sessions
- Auto-advance works reliably with <500ms delay between items
- Queue supports minimum 50 items without performance degradation
- Drag-and-drop reordering works smoothly on touch and desktop devices

### Performance Metrics
- Queue rendering remains smooth with 100+ items
- Memory usage increases linearly with queue size (<1MB per 100 items)
- Local storage operations complete within 50ms
- Queue state updates don't block UI interactions

### User Experience Metrics
- Users can successfully build and manage queues in 95% of attempts
- Queue controls are intuitive and discoverable
- Visual feedback clearly indicates current item and progress
- Queue persists correctly across 98% of browser session transitions

### Reliability Metrics
- Queue state corruption occurs in <1% of operations
- Auto-advance failure rate <2% across supported browsers
- Queue recovery succeeds in 95% of error scenarios

## Dependencies and Risks

### Dependencies
- **Browser Local Storage**: For queue persistence
- **React 16.8+**: For hooks-based state management
- **Drag and Drop API**: For reordering functionality (optional)
- **Web Audio API**: For TTS integration
- **TypeScript 4.0+**: For type safety

### Technical Risks

**High Risk:**
- **Local Storage Limits**: Large queues may exceed storage limits
  - *Mitigation*: Implement queue size limits and compression
  - *Fallback*: In-memory queue with session persistence warning

**Medium Risk:**
- **State Synchronization**: Queue state may become inconsistent
  - *Mitigation*: Implement atomic operations and state validation
  - *Recovery*: State reconciliation and user notification

**Low Risk:**
- **Performance Degradation**: Very large queues may impact performance
  - *Mitigation*: Virtual scrolling and lazy loading
  - *Optimization*: Queue pagination and item limit enforcement

### Implementation Risks

**Data Loss**: Queue corruption could result in lost user data
- *Solution*: Implement backup mechanisms and data validation

**Browser Compatibility**: Drag-and-drop may not work consistently
- *Solution*: Fallback button-based reordering for all devices

**Memory Leaks**: Event listeners and timers may not be properly cleaned up
- *Solution*: Comprehensive cleanup in useEffect hooks

### Mitigation Strategies

1. **Data Integrity**: Implement queue validation and recovery mechanisms
2. **Performance Optimization**: Use virtual scrolling and pagination for large queues
3. **Progressive Enhancement**: Core functionality works without advanced features
4. **Error Handling**: Graceful degradation when storage or drag-and-drop fails
5. **User Feedback**: Clear messaging about queue limits and operations
6. **Testing Coverage**: Extensive testing of edge cases and error scenarios
7. **Backup Strategies**: Multiple persistence methods (localStorage, sessionStorage, memory)