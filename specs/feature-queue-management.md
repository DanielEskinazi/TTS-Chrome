# Feature Specification: Queue Management

**Feature ID**: QM-001  
**Feature Name**: Advanced Queue Management System  
**Status**: 🟡 IN PLANNING  
**Priority**: High  
**Estimated Effort**: 3-4 weeks  

## 1. Feature Overview

The Queue Management feature provides users with comprehensive control over their text-to-speech reading queue. This system allows users to queue multiple text selections, visually manage the queue through a dedicated UI, reorder items via drag-and-drop, and perform batch operations on queue items. The feature transforms the extension from a single-selection reader to a powerful multi-text management system.

### Key Capabilities
- Queue multiple text selections from different sources
- Visual queue interface with item details and controls
- Drag-and-drop reordering of queue items
- Batch operations (clear all, remove selected, play all)
- Queue persistence across browser sessions
- Smart queue management with auto-cleanup options

## 2. User Stories

### User Story 1: Research Assistant
**As a** research assistant reviewing multiple academic papers  
**I want to** queue several text passages from different papers  
**So that** I can listen to them sequentially while taking notes without manual intervention between readings

**Acceptance Criteria:**
- Can select and queue text from multiple tabs
- Queue shows source URL and selection preview
- Can continue adding to queue while playback is active
- Estimated total reading time is displayed

### User Story 2: Content Curator
**As a** content curator reviewing blog posts  
**I want to** reorder my reading queue based on priority  
**So that** I can listen to the most important content first and reorganize as needed

**Acceptance Criteria:**
- Can drag items to new positions in the queue
- Visual feedback during drag operation
- Queue order persists after reordering
- Currently playing item remains unaffected by reordering

### User Story 3: Language Learner
**As a** language learner practicing with foreign texts  
**I want to** manage multiple text selections with different reading speeds  
**So that** I can queue easy texts at normal speed and difficult texts at slower speeds

**Acceptance Criteria:**
- Can set individual speed preferences per queue item
- Can batch-select items to apply settings
- Can save frequently used text selections as templates
- Visual indicators show different settings per item

## 3. Technical Requirements

### 3.1 Data Structure
```typescript
interface QueueItem {
  id: string;                    // Unique identifier (UUID)
  text: string;                  // Full text content
  preview: string;               // First 100 characters for display
  sourceUrl: string;             // Origin URL
  sourceTitle: string;           // Page title
  timestamp: number;             // When added to queue
  duration: number;              // Estimated reading time (seconds)
  status: 'pending' | 'playing' | 'completed' | 'error';
  settings: {
    voice: string;               // Voice ID for this item
    rate: number;                // Speech rate (0.5-3.0)
    volume: number;              // Volume (0-1)
    pitch: number;               // Pitch adjustment
  };
  metadata: {
    selectionRect?: DOMRect;     // Original selection position
    language?: string;           // Detected language
    wordCount: number;           // Word count
    characterCount: number;      // Character count
  };
}

interface QueueState {
  items: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  totalDuration: number;
  settings: {
    autoPlay: boolean;           // Auto-play next item
    clearOnComplete: boolean;    // Clear completed items
    maxQueueSize: number;        // Maximum items allowed
    persistQueue: boolean;       // Save queue to storage
  };
}
```

### 3.2 Storage Requirements
- Chrome Storage API for queue persistence
- Maximum storage: 5MB for queue data
- Compression for large text content
- Automatic cleanup of old items (30-day expiry)

### 3.3 Performance Requirements
- Queue operations < 50ms response time
- Smooth drag-drop at 60fps
- Lazy loading for queue items > 100
- Virtual scrolling for large queues

### 3.4 Browser Compatibility
- Chrome 88+ (for required APIs)
- Fallback for older versions without drag-drop
- Progressive enhancement approach

## 4. Implementation Details

### 4.1 Architecture Components

#### Background Service Worker (`background/queue-manager.ts`)
```typescript
class QueueManager {
  private queue: QueueItem[] = [];
  private currentIndex: number = -1;
  
  async addToQueue(text: string, metadata: QueueMetadata): Promise<QueueItem>
  async removeFromQueue(id: string): Promise<void>
  async reorderQueue(fromIndex: number, toIndex: number): Promise<void>
  async clearQueue(): Promise<void>
  async playNext(): Promise<void>
  async playPrevious(): Promise<void>
  async jumpToItem(id: string): Promise<void>
  async updateItemSettings(id: string, settings: Partial<QueueItemSettings>): Promise<void>
  async batchOperation(ids: string[], operation: BatchOperation): Promise<void>
}
```

#### Content Script Enhancement (`content/queue-injector.ts`)
```typescript
class QueueInjector {
  private selectionHandler: SelectionHandler;
  
  async captureSelection(): Promise<SelectionData>
  async showQueueNotification(message: string): Promise<void>
  async highlightQueuedText(item: QueueItem): Promise<void>
}
```

#### Queue UI Component (`popup/components/QueuePanel.tsx`)
```typescript
interface QueuePanelProps {
  queue: QueueItem[];
  currentItem: QueueItem | null;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onPlay: (id: string) => void;
  onBatchAction: (action: BatchAction) => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({ ... }) => {
  // Drag-drop implementation
  // Virtual scrolling for performance
  // Batch selection UI
  // Context menus
}
```

### 4.2 Message Protocol

```typescript
// Content → Background
interface AddToQueueMessage {
  type: 'ADD_TO_QUEUE';
  payload: {
    text: string;
    url: string;
    title: string;
    selection: SelectionData;
  };
}

// Background → Popup
interface QueueUpdateMessage {
  type: 'QUEUE_UPDATE';
  payload: {
    queue: QueueItem[];
    currentIndex: number;
    totalDuration: number;
  };
}

// Popup → Background
interface QueueControlMessage {
  type: 'QUEUE_CONTROL';
  action: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'CLEAR';
  itemId?: string;
}
```

### 4.3 Drag-and-Drop Implementation

Using native HTML5 Drag and Drop API with React:
```typescript
const DraggableQueueItem: React.FC<QueueItemProps> = ({ item, index }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'QUEUE_ITEM',
    item: { id: item.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'QUEUE_ITEM',
    drop: (draggedItem: DragItem) => {
      onReorder(draggedItem.index, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div ref={(node) => drag(drop(node))} className={`queue-item ${isDragging ? 'dragging' : ''}`}>
      {/* Item content */}
    </div>
  );
};
```

## 5. Acceptance Criteria

### 5.1 Queue Operations
- ✅ User can add selected text to queue with single action
- ✅ Queue displays all items with preview text (first 100 chars)
- ✅ Each item shows source URL and timestamp
- ✅ Queue persists across browser sessions when enabled
- ✅ Maximum queue size enforced (default: 100 items)
- ✅ Queue automatically saves every 30 seconds

### 5.2 Visual Interface
- ✅ Dedicated queue panel in popup (collapsible)
- ✅ Queue items show: preview, source, duration, status
- ✅ Currently playing item highlighted with progress indicator
- ✅ Total queue duration displayed at top
- ✅ Search/filter functionality for queue items
- ✅ Compact and expanded view modes

### 5.3 Drag-and-Drop
- ✅ All queue items are draggable (except currently playing)
- ✅ Visual placeholder shows drop position
- ✅ Smooth animation during reorder
- ✅ Multi-select drag for moving multiple items
- ✅ Keyboard shortcuts for reordering (Alt+Up/Down)
- ✅ Touch-friendly drag on mobile devices

### 5.4 Batch Operations
- ✅ Select all/none functionality
- ✅ Remove selected items
- ✅ Apply settings to selected items
- ✅ Export selected items as text file
- ✅ Duplicate selected items
- ✅ Merge selected items into one

### 5.5 Playback Control
- ✅ Play queue from any position
- ✅ Skip to next/previous item
- ✅ Pause retains position in current item
- ✅ Auto-play next item option
- ✅ Loop queue option
- ✅ Shuffle queue option

### 5.6 Smart Features
- ✅ Duplicate detection with merge option
- ✅ Auto-cleanup of completed items (optional)
- ✅ Smart grouping by source domain
- ✅ Reading time estimation per item
- ✅ Queue analytics (items read, time spent)
- ✅ Suggested reading order based on length

## 6. Test Cases

### 6.1 Unit Tests

```typescript
// queue-manager.test.ts
describe('QueueManager', () => {
  describe('addToQueue', () => {
    it('should add item with unique ID');
    it('should enforce maximum queue size');
    it('should calculate duration based on word count');
    it('should detect and handle duplicates');
    it('should persist to storage when enabled');
  });

  describe('reorderQueue', () => {
    it('should move item to new position');
    it('should handle invalid indices gracefully');
    it('should not affect currently playing item');
    it('should update storage after reorder');
    it('should emit update event');
  });

  describe('batchOperation', () => {
    it('should apply operation to multiple items');
    it('should skip currently playing item');
    it('should handle partial failures');
    it('should update UI after operation');
  });
});
```

### 6.2 Integration Tests

```typescript
// queue-integration.test.ts
describe('Queue Integration', () => {
  describe('Content to Background', () => {
    it('should queue text selection from content script');
    it('should handle multiple rapid selections');
    it('should queue from different tabs simultaneously');
    it('should preserve formatting in queued text');
  });

  describe('Popup Queue UI', () => {
    it('should display queue updates in real-time');
    it('should handle drag-drop across full queue');
    it('should sync UI state with background');
    it('should recover from connection loss');
  });

  describe('Storage Persistence', () => {
    it('should save and restore queue on restart');
    it('should handle storage quota exceeded');
    it('should migrate queue data on update');
    it('should cleanup expired items');
  });
});
```

### 6.3 E2E Test Scenarios

1. **Multi-tab Queuing**
   - Open 3 different article tabs
   - Select and queue text from each
   - Verify queue shows all 3 items
   - Play through entire queue

2. **Drag-Drop Reordering**
   - Queue 5 items
   - Drag item 3 to position 1
   - Drag item 5 to position 2
   - Verify new order persists

3. **Batch Operations**
   - Queue 10 items
   - Select items 2, 4, 6, 8
   - Apply 2x speed to selected
   - Remove selected items
   - Verify remaining items intact

## 7. UI/UX Specifications

### 7.1 Queue Panel Design

```
┌─────────────────────────────────────┐
│ Queue (5 items • 12:34 total)    ⚙️ │
├─────────────────────────────────────┤
│ 🔍 Search queue...                  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ▶️ 1. Currently Playing         │ │
│ │ "Lorem ipsum dolor sit amet..." │ │
│ │ example.com • 2:15 / 3:20      │ │
│ │ ████████░░░░░░░░░ 68%          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ⏸️ 2. [Drag Handle] ≡           │ │
│ │ "Consectetur adipiscing elit..." │ │
│ │ another.com • 2:45              │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ⏸️ 3. [Drag Handle] ≡           │ │
│ │ "Sed do eiusmod tempor..."      │ │
│ │ website.com • 1:30              │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Select All] [Clear] [Export]       │
└─────────────────────────────────────┘
```

### 7.2 Queue Item States

- **Pending**: Gray background, pause icon
- **Playing**: Blue background, play icon, progress bar
- **Completed**: Green checkmark, faded appearance
- **Error**: Red background, error icon, retry button

### 7.3 Drag-Drop Visual Feedback

```css
.queue-item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.queue-item.drag-over {
  border-top: 3px solid #3b82f6;
}

.drag-placeholder {
  height: 80px;
  background: repeating-linear-gradient(
    45deg,
    #f0f0f0,
    #f0f0f0 10px,
    #e0e0e0 10px,
    #e0e0e0 20px
  );
}
```

### 7.4 Mobile/Touch Interactions

- Long press to initiate drag
- Swipe left to reveal delete button
- Swipe right to reveal options menu
- Pull-to-refresh queue from storage

### 7.5 Keyboard Shortcuts

- `Space`: Play/Pause current item
- `N`: Next item
- `P`: Previous item
- `Ctrl+A`: Select all items
- `Delete`: Remove selected items
- `Alt+↑/↓`: Move selected item up/down
- `Ctrl+D`: Duplicate selected items

## 8. Error Handling

### 8.1 Queue Storage Errors

```typescript
enum QueueError {
  STORAGE_QUOTA_EXCEEDED = 'Storage quota exceeded. Please remove old items.',
  SYNC_CONFLICT = 'Queue sync conflict. Using local version.',
  CORRUPT_DATA = 'Queue data corrupted. Restoring backup.',
  MAX_SIZE_EXCEEDED = 'Maximum queue size reached.',
}

class QueueErrorHandler {
  handleStorageError(error: QueueError): void {
    switch (error) {
      case QueueError.STORAGE_QUOTA_EXCEEDED:
        this.showCleanupPrompt();
        this.compressOldItems();
        break;
      case QueueError.SYNC_CONFLICT:
        this.resolveConflict();
        break;
      // ... other cases
    }
  }
}
```

### 8.2 Playback Errors

- **TTS Failure**: Skip to next item, mark as error
- **Network Error**: Retry with exponential backoff
- **Invalid Text**: Clean and retry, or skip
- **Voice Unavailable**: Fall back to default voice

### 8.3 UI Error States

- Connection lost indicator with retry button
- Sync conflict resolution dialog
- Storage warning when approaching limit
- Graceful degradation without drag-drop

### 8.4 Recovery Strategies

1. **Auto-save Draft**: Save queue state every 30 seconds
2. **Backup Queue**: Keep last 3 queue snapshots
3. **Conflict Resolution**: User chooses between versions
4. **Partial Restore**: Recover as many items as possible
5. **Error Report**: Optional anonymous error reporting

## 9. Dependencies

### 9.1 External Libraries

```json
{
  "dependencies": {
    "uuid": "^9.0.0",                    // Unique IDs for queue items
    "react-beautiful-dnd": "^13.1.0",    // Drag-and-drop functionality
    "react-window": "^1.8.0",            // Virtual scrolling
    "fuse.js": "^6.6.0",                 // Fuzzy search in queue
    "idb": "^7.1.0"                      // IndexedDB wrapper for large queues
  },
  "devDependencies": {
    "@types/react-beautiful-dnd": "^13.1.0",
    "@types/react-window": "^1.8.0"
  }
}
```

### 9.2 Chrome APIs Required

- `chrome.storage.local`: Queue persistence
- `chrome.storage.sync`: Settings sync
- `chrome.runtime`: Message passing
- `chrome.tabs`: Source URL retrieval
- `chrome.contextMenus`: Quick queue actions

### 9.3 Feature Dependencies

- **Prerequisite Features**:
  - Basic TTS functionality
  - Settings management system
  - Message passing architecture
  
- **Integration Points**:
  - Voice selection per queue item
  - Speed control inheritance
  - Storage service module
  - UI component system

### 9.4 Development Dependencies

- TypeScript 5.0+ for advanced types
- React 18+ for UI components
- Webpack 5+ for code splitting
- Jest + React Testing Library for tests

---

## Appendix A: Performance Benchmarks

| Operation | Target Time | Max Items |
|-----------|------------|-----------|
| Add to queue | < 50ms | - |
| Reorder item | < 16ms | 1000 |
| Load queue UI | < 200ms | 100 |
| Search queue | < 100ms | 1000 |
| Batch select | < 100ms | 50 |

## Appendix B: Storage Calculations

- Average queue item size: 2KB (including text and metadata)
- Maximum queue size: 100 items
- Total storage needed: ~200KB + overhead
- Storage limit: 5MB (Chrome local storage)
- Theoretical maximum: ~2500 items

## Appendix C: Accessibility Requirements

- ARIA labels for all queue controls
- Keyboard navigation through queue
- Screen reader announcements for operations
- High contrast mode support
- Focus management during reordering