# Feature Specification: Reading Modes

**Feature ID**: FEATURE-READING-MODES  
**Version**: 1.0  
**Last Updated**: 2025-01-02  
**Status**: DRAFT  
**Priority**: HIGH  
**Estimated Effort**: 5-7 days  

## 1. Feature Overview

### 1.1 Description
The Reading Modes feature provides users with three distinct ways to consume webpage content through text-to-speech: Selection Only mode for reading specific highlighted text, Continue Reading mode for automatically advancing through content, and Read Entire Page mode for comprehensive page narration. This feature enables flexible content consumption patterns to match different user needs and reading scenarios.

### 1.2 Business Value
- **Enhanced User Experience**: Users can choose the most appropriate reading mode for their context
- **Improved Accessibility**: Multiple reading approaches cater to different accessibility needs
- **Increased Engagement**: Auto-advance functionality enables hands-free consumption of long-form content
- **Productivity Boost**: Read Entire Page mode allows users to multitask while consuming content
- **Better Content Coverage**: Continue Reading ensures users don't miss related content

### 1.3 Scope
- Three distinct reading modes with clear differentiation
- Mode selection interface in popup and context menu
- Intelligent content detection and sequencing
- Visual indicators for current reading mode and position
- Mode-specific controls and behaviors
- Persistence of mode preference across sessions

## 2. User Stories

### 2.1 Primary User Stories

**US-001: Selection Only Mode**
```
As a user who wants precise control over what is read,
I want to read only the text I explicitly select,
So that I can focus on specific content without unwanted narration.

Acceptance Criteria:
- TTS reads only the currently selected text
- Reading stops when selection is complete
- No automatic progression to other content
- Clear visual feedback showing what's being read
- Simple one-click/shortcut activation
```

**US-002: Continue Reading Mode**
```
As a user reading articles or blog posts,
I want the TTS to automatically continue to the next paragraph after finishing the current one,
So that I can listen to content hands-free without constant interaction.

Acceptance Criteria:
- Automatically advances to next logical content block
- Skips navigation elements and ads
- Respects content hierarchy (headings, paragraphs, lists)
- Allows pause/resume at any point
- Visual indicator shows upcoming content
- Smart detection of content boundaries
```

**US-003: Read Entire Page Mode**
```
As a user who wants to consume all page content,
I want to start TTS that reads the entire page from top to bottom,
So that I don't miss any important information.

Acceptance Criteria:
- Reads main content area intelligently
- Filters out repetitive navigation/footer content
- Handles multi-column layouts correctly
- Shows progress through the page
- Allows jumping to specific sections
- Remembers position if interrupted
```

### 2.2 Secondary User Stories

**US-004: Mode Switching**
```
As a user currently in one reading mode,
I want to switch to a different mode without losing my position,
So that I can adapt to changing needs while reading.
```

**US-005: Smart Content Detection**
```
As a user on various types of websites,
I want the extension to intelligently detect the main content area,
So that Continue Reading and Full Page modes work correctly everywhere.
```

**US-006: Reading Mode Memory**
```
As a returning user,
I want the extension to remember my preferred reading mode,
So that I don't have to select it every time.
```

## 3. Technical Requirements

### 3.1 Mode Architecture

```typescript
// Core reading mode types
enum ReadingMode {
  SELECTION_ONLY = 'selection_only',
  CONTINUE_READING = 'continue_reading',
  READ_ENTIRE_PAGE = 'read_entire_page'
}

interface ReadingModeConfig {
  mode: ReadingMode;
  autoAdvance: boolean;
  skipNavigation: boolean;
  detectMainContent: boolean;
  highlightCurrent: boolean;
  showUpcoming: boolean;
  rememberPosition: boolean;
}

interface IReadingModeManager {
  setMode(mode: ReadingMode): void;
  getCurrentMode(): ReadingMode;
  startReading(initialText?: string): Promise<void>;
  advanceToNext(): Promise<void>;
  getReadingQueue(): ReadingQueueItem[];
  getCurrentPosition(): ReadingPosition;
}
```

### 3.2 Content Detection Engine

```typescript
interface IContentDetector {
  detectMainContent(): ContentArea;
  getReadableElements(): ReadableElement[];
  getNextElement(current: Element): Element | null;
  getPreviousElement(current: Element): Element | null;
  isContentElement(element: Element): boolean;
  extractTextContent(element: Element): string;
}

interface ContentArea {
  container: Element;
  startElement: Element;
  endElement: Element;
  totalElements: number;
  estimatedReadTime: number;
}

interface ReadableElement {
  element: Element;
  text: string;
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'code';
  level: number; // hierarchy level
  index: number; // position in sequence
}
```

### 3.3 Mode-Specific Behaviors

**Selection Only Mode**
- Reads selected text immediately
- Stops after completion
- No queue management
- No position tracking
- Simple state management

**Continue Reading Mode**
- Maintains reading queue
- Auto-advances on completion
- Smart paragraph detection
- Skip non-content elements
- Position tracking and restoration

**Read Entire Page Mode**
- Full page analysis on start
- Progress tracking
- Section navigation
- Bookmark support
- Resume from saved position

### 3.4 Integration Points

```typescript
// Message types for reading modes
interface ReadingModeMessages {
  SET_READING_MODE: {
    mode: ReadingMode;
    config?: Partial<ReadingModeConfig>;
  };
  
  START_READING: {
    mode: ReadingMode;
    text?: string;
    startPosition?: ReadingPosition;
  };
  
  READING_PROGRESS: {
    current: ReadingPosition;
    queue: ReadingQueueItem[];
    percentComplete: number;
  };
  
  MODE_CHANGED: {
    previousMode: ReadingMode;
    newMode: ReadingMode;
  };
}
```

## 4. Implementation Details

### 4.1 Content Detection Algorithm

```typescript
// src/content/reading-modes/content-detector.ts
export class ContentDetector implements IContentDetector {
  private contentSelectors = [
    'main', 'article', '[role="main"]', '#content', '.content',
    '.post', '.entry-content', '.article-body'
  ];
  
  private skipSelectors = [
    'nav', 'header', 'footer', 'aside', '.advertisement',
    '.sidebar', '.comment', '[role="navigation"]'
  ];

  detectMainContent(): ContentArea {
    // Try semantic HTML5 elements first
    let container = document.querySelector('main, article');
    
    // Fallback to common class/id patterns
    if (!container) {
      for (const selector of this.contentSelectors) {
        container = document.querySelector(selector);
        if (container) break;
      }
    }
    
    // Final fallback: largest text container
    if (!container) {
      container = this.findLargestTextContainer();
    }
    
    return this.analyzeContentArea(container || document.body);
  }
  
  private findLargestTextContainer(): Element {
    const candidates = Array.from(document.querySelectorAll('div, section'));
    let bestCandidate = document.body;
    let maxScore = 0;
    
    for (const candidate of candidates) {
      const score = this.calculateContentScore(candidate);
      if (score > maxScore) {
        maxScore = score;
        bestCandidate = candidate;
      }
    }
    
    return bestCandidate;
  }
  
  private calculateContentScore(element: Element): number {
    const text = element.textContent || '';
    const wordCount = text.split(/\s+/).length;
    const paragraphs = element.querySelectorAll('p').length;
    const headings = element.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
    const links = element.querySelectorAll('a').length;
    const linkDensity = links / Math.max(wordCount, 1);
    
    // Score based on content indicators
    let score = wordCount + (paragraphs * 10) + (headings * 5);
    
    // Penalize high link density (likely navigation)
    score *= (1 - Math.min(linkDensity * 2, 0.8));
    
    // Penalize if contains skip selectors
    const skipElements = element.querySelectorAll(this.skipSelectors.join(','));
    score -= skipElements.length * 20;
    
    return Math.max(score, 0);
  }
  
  getReadableElements(): ReadableElement[] {
    const mainContent = this.detectMainContent();
    const elements: ReadableElement[] = [];
    
    const walker = document.createTreeWalker(
      mainContent.container,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as Element;
          if (this.shouldSkipElement(element)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (this.isReadableElement(element)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let index = 0;
    let node: Node | null;
    while (node = walker.nextNode()) {
      const element = node as Element;
      const readableElement = this.createReadableElement(element, index++);
      if (readableElement.text.trim().length > 0) {
        elements.push(readableElement);
      }
    }
    
    return elements;
  }
  
  private isReadableElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const readableTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                         'li', 'blockquote', 'pre', 'td', 'th'];
    
    return readableTags.includes(tagName) && 
           !this.isHidden(element) &&
           this.hasReadableText(element);
  }
  
  private hasReadableText(element: Element): boolean {
    const text = element.textContent || '';
    const words = text.trim().split(/\s+/).length;
    return words >= 3; // Minimum 3 words to be considered readable
  }
}
```

### 4.2 Reading Mode Manager Implementation

```typescript
// src/background/services/reading-mode-manager.ts
export class ReadingModeManager implements IReadingModeManager {
  private currentMode: ReadingMode = ReadingMode.SELECTION_ONLY;
  private readingQueue: ReadingQueueItem[] = [];
  private currentPosition: ReadingPosition | null = null;
  private contentDetector: ContentDetector;
  private speechSynthesizer: SpeechSynthesizer;
  
  constructor(speechSynthesizer: SpeechSynthesizer) {
    this.speechSynthesizer = speechSynthesizer;
    this.contentDetector = new ContentDetector();
    this.loadSavedMode();
  }
  
  async setMode(mode: ReadingMode): Promise<void> {
    const previousMode = this.currentMode;
    this.currentMode = mode;
    
    // Save mode preference
    await chrome.storage.local.set({ preferredReadingMode: mode });
    
    // Broadcast mode change
    await this.broadcastModeChange(previousMode, mode);
    
    // Reset queue for new mode
    if (mode !== previousMode) {
      this.readingQueue = [];
      this.currentPosition = null;
    }
  }
  
  async startReading(initialText?: string): Promise<void> {
    switch (this.currentMode) {
      case ReadingMode.SELECTION_ONLY:
        await this.startSelectionReading(initialText);
        break;
        
      case ReadingMode.CONTINUE_READING:
        await this.startContinueReading(initialText);
        break;
        
      case ReadingMode.READ_ENTIRE_PAGE:
        await this.startFullPageReading();
        break;
    }
  }
  
  private async startSelectionReading(text?: string): Promise<void> {
    if (!text) {
      throw new Error('No text provided for selection reading');
    }
    
    // Simple reading - no queue or advancement
    await this.speechSynthesizer.speak(text);
  }
  
  private async startContinueReading(initialText?: string): Promise<void> {
    // Get current selection or use provided text
    const startText = initialText || await this.getCurrentSelection();
    
    if (!startText) {
      throw new Error('No text to start continue reading');
    }
    
    // Find starting element
    const startElement = await this.findElementContainingText(startText);
    
    if (!startElement) {
      // Fallback to selection only if element not found
      await this.startSelectionReading(startText);
      return;
    }
    
    // Build reading queue from starting element
    this.buildReadingQueue(startElement);
    
    // Start reading with auto-advance
    await this.readWithAutoAdvance();
  }
  
  private async startFullPageReading(): Promise<void> {
    // Check for saved position
    const savedPosition = await this.getSavedPosition();
    
    // Get all readable elements
    const elements = await this.contentDetector.getReadableElements();
    
    if (elements.length === 0) {
      throw new Error('No readable content found on page');
    }
    
    // Build complete queue
    this.readingQueue = elements.map((element, index) => ({
      id: `element-${index}`,
      text: element.text,
      element: element.element,
      type: element.type,
      index: index,
      isRead: false
    }));
    
    // Start from saved position or beginning
    const startIndex = savedPosition?.index || 0;
    this.currentPosition = {
      index: startIndex,
      totalItems: this.readingQueue.length,
      percentComplete: 0
    };
    
    // Start reading with progress tracking
    await this.readWithProgress();
  }
  
  private async readWithAutoAdvance(): Promise<void> {
    while (this.readingQueue.length > 0) {
      const item = this.readingQueue.shift();
      if (!item) break;
      
      // Update position
      this.currentPosition = {
        index: item.index,
        totalItems: this.readingQueue.length + item.index + 1,
        percentComplete: (item.index / (this.readingQueue.length + item.index + 1)) * 100
      };
      
      // Highlight current element
      await this.highlightElement(item.element);
      
      // Speak the text
      await this.speechSynthesizer.speak(item.text);
      
      // Mark as read
      item.isRead = true;
      
      // Check if we should continue
      if (!this.shouldContinueReading()) {
        break;
      }
      
      // Small pause between elements
      await this.pause(300);
    }
  }
  
  private shouldContinueReading(): boolean {
    return this.currentMode === ReadingMode.CONTINUE_READING && 
           !this.speechSynthesizer.isStopped();
  }
  
  private async highlightElement(element: Element): Promise<void> {
    // Send highlight message to content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: MessageType.HIGHLIGHT_READING_ELEMENT,
        payload: { element: this.getElementSelector(element) }
      });
    }
  }
}
```

### 4.3 UI Implementation for Mode Selection

```tsx
// src/popup/components/ReadingModeSelector.tsx
import React, { useState, useEffect } from 'react';
import { ReadingMode } from '@/common/types/reading-modes';

export const ReadingModeSelector: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<ReadingMode>(ReadingMode.SELECTION_ONLY);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    // Load current mode
    chrome.storage.local.get(['preferredReadingMode'], (result) => {
      if (result.preferredReadingMode) {
        setCurrentMode(result.preferredReadingMode);
      }
    });
  }, []);

  const handleModeChange = async (newMode: ReadingMode) => {
    if (newMode === currentMode || isChanging) return;
    
    setIsChanging(true);
    try {
      // Send mode change to background
      await chrome.runtime.sendMessage({
        type: 'SET_READING_MODE',
        payload: { mode: newMode }
      });
      
      setCurrentMode(newMode);
      
      // Show confirmation
      showToast(`Switched to ${getModeDisplayName(newMode)}`);
    } catch (error) {
      console.error('Failed to change reading mode:', error);
      showToast('Failed to change mode', 'error');
    } finally {
      setIsChanging(false);
    }
  };

  const getModeDisplayName = (mode: ReadingMode): string => {
    const names = {
      [ReadingMode.SELECTION_ONLY]: 'Selection Only',
      [ReadingMode.CONTINUE_READING]: 'Continue Reading',
      [ReadingMode.READ_ENTIRE_PAGE]: 'Read Entire Page'
    };
    return names[mode];
  };

  const getModeDescription = (mode: ReadingMode): string => {
    const descriptions = {
      [ReadingMode.SELECTION_ONLY]: 'Read only selected text',
      [ReadingMode.CONTINUE_READING]: 'Auto-advance through content',
      [ReadingMode.READ_ENTIRE_PAGE]: 'Read complete page content'
    };
    return descriptions[mode];
  };

  const getModeIcon = (mode: ReadingMode): string => {
    const icons = {
      [ReadingMode.SELECTION_ONLY]: '🎯',
      [ReadingMode.CONTINUE_READING]: '➡️',
      [ReadingMode.READ_ENTIRE_PAGE]: '📄'
    };
    return icons[mode];
  };

  return (
    <div className="reading-mode-selector">
      <h3 className="text-sm font-semibold mb-2">Reading Mode</h3>
      
      <div className="space-y-2">
        {Object.values(ReadingMode).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            disabled={isChanging}
            className={`
              w-full p-3 rounded-lg border transition-all
              ${currentMode === mode 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-base-300 hover:border-primary/50'}
              ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getModeIcon(mode)}</span>
                <div className="text-left">
                  <div className="font-medium">{getModeDisplayName(mode)}</div>
                  <div className="text-xs opacity-70">{getModeDescription(mode)}</div>
                </div>
              </div>
              {currentMode === mode && (
                <div className="text-primary">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Mode-specific controls */}
      {currentMode === ReadingMode.CONTINUE_READING && (
        <div className="mt-4 p-3 bg-base-200 rounded-lg">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              defaultChecked
            />
            <span className="text-sm">Skip navigation elements</span>
          </label>
        </div>
      )}
      
      {currentMode === ReadingMode.READ_ENTIRE_PAGE && (
        <div className="mt-4 space-y-2">
          <button className="btn btn-sm btn-outline w-full">
            Jump to Section
          </button>
          <div className="text-xs text-center opacity-70">
            Progress: 0% • 0 of 0 elements
          </div>
        </div>
      )}
    </div>
  );
};
```

## 5. Acceptance Criteria

### 5.1 Mode Selection
- ✅ Three reading modes clearly presented in UI
- ✅ Mode selection persists across sessions
- ✅ Visual indication of active mode
- ✅ Mode can be changed mid-reading
- ✅ Keyboard shortcuts for mode switching
- ✅ Context menu shows current mode

### 5.2 Selection Only Mode
- ✅ Reads only explicitly selected text
- ✅ Stops immediately after selection
- ✅ No auto-advancement
- ✅ Works with all selection methods
- ✅ Clear start/stop behavior
- ✅ No position tracking

### 5.3 Continue Reading Mode
- ✅ Automatically advances to next paragraph
- ✅ Skips navigation and ads
- ✅ Respects content hierarchy
- ✅ Visual preview of next content
- ✅ Smooth transitions between elements
- ✅ Stop at logical content boundaries

### 5.4 Read Entire Page Mode
- ✅ Identifies main content area
- ✅ Reads in logical order
- ✅ Shows reading progress
- ✅ Allows jumping to sections
- ✅ Saves and restores position
- ✅ Handles complex layouts

### 5.5 Content Detection
- ✅ Works on 90%+ of websites
- ✅ Identifies articles, blogs, documentation
- ✅ Filters out navigation/ads
- ✅ Handles dynamic content
- ✅ Respects reading order
- ✅ Adapts to page structure

## 6. Test Cases

### 6.1 Unit Tests

```typescript
// tests/unit/reading-modes.test.ts
describe('ReadingModeManager', () => {
  let manager: ReadingModeManager;
  let mockSynthesizer: jest.Mocked<SpeechSynthesizer>;

  beforeEach(() => {
    mockSynthesizer = createMockSynthesizer();
    manager = new ReadingModeManager(mockSynthesizer);
  });

  describe('Mode Selection', () => {
    it('should default to selection only mode', () => {
      expect(manager.getCurrentMode()).toBe(ReadingMode.SELECTION_ONLY);
    });

    it('should change mode and persist preference', async () => {
      await manager.setMode(ReadingMode.CONTINUE_READING);
      
      expect(manager.getCurrentMode()).toBe(ReadingMode.CONTINUE_READING);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        preferredReadingMode: ReadingMode.CONTINUE_READING
      });
    });

    it('should broadcast mode changes', async () => {
      const spy = jest.spyOn(manager, 'broadcastModeChange');
      
      await manager.setMode(ReadingMode.READ_ENTIRE_PAGE);
      
      expect(spy).toHaveBeenCalledWith(
        ReadingMode.SELECTION_ONLY,
        ReadingMode.READ_ENTIRE_PAGE
      );
    });
  });

  describe('Selection Only Mode', () => {
    it('should read provided text without advancement', async () => {
      await manager.startReading('Hello world');
      
      expect(mockSynthesizer.speak).toHaveBeenCalledWith('Hello world');
      expect(mockSynthesizer.speak).toHaveBeenCalledTimes(1);
    });

    it('should throw error if no text provided', async () => {
      await expect(manager.startReading()).rejects.toThrow(
        'No text provided for selection reading'
      );
    });
  });

  describe('Continue Reading Mode', () => {
    beforeEach(() => {
      manager.setMode(ReadingMode.CONTINUE_READING);
    });

    it('should build queue from starting element', async () => {
      const mockElement = document.createElement('p');
      mockElement.textContent = 'Starting paragraph';
      
      jest.spyOn(manager, 'findElementContainingText')
        .mockResolvedValue(mockElement);
      
      await manager.startReading('Starting paragraph');
      
      expect(manager.getReadingQueue().length).toBeGreaterThan(0);
    });

    it('should auto-advance through queue', async () => {
      // Setup mock queue
      const queue = [
        { text: 'First paragraph', element: document.createElement('p') },
        { text: 'Second paragraph', element: document.createElement('p') },
        { text: 'Third paragraph', element: document.createElement('p') }
      ];
      
      jest.spyOn(manager, 'buildReadingQueue').mockImplementation(() => {
        manager['readingQueue'] = queue;
      });
      
      await manager.startReading('First paragraph');
      
      // Should speak all paragraphs
      expect(mockSynthesizer.speak).toHaveBeenCalledTimes(3);
      expect(mockSynthesizer.speak).toHaveBeenNthCalledWith(1, 'First paragraph');
      expect(mockSynthesizer.speak).toHaveBeenNthCalledWith(2, 'Second paragraph');
      expect(mockSynthesizer.speak).toHaveBeenNthCalledWith(3, 'Third paragraph');
    });
  });
});

describe('ContentDetector', () => {
  let detector: ContentDetector;

  beforeEach(() => {
    detector = new ContentDetector();
    document.body.innerHTML = `
      <nav>Navigation</nav>
      <main>
        <article>
          <h1>Article Title</h1>
          <p>First paragraph with some content.</p>
          <p>Second paragraph with more content.</p>
          <aside>Sidebar content</aside>
          <p>Third paragraph continues the article.</p>
        </article>
      </main>
      <footer>Footer content</footer>
    `;
  });

  it('should detect main content area', () => {
    const contentArea = detector.detectMainContent();
    
    expect(contentArea.container.tagName).toBe('MAIN');
    expect(contentArea.totalElements).toBeGreaterThan(0);
  });

  it('should extract readable elements in order', () => {
    const elements = detector.getReadableElements();
    
    expect(elements.length).toBe(4); // h1 + 3 paragraphs
    expect(elements[0].type).toBe('heading');
    expect(elements[0].text).toBe('Article Title');
    expect(elements[1].type).toBe('paragraph');
    expect(elements[1].text).toContain('First paragraph');
  });

  it('should skip navigation and sidebar elements', () => {
    const elements = detector.getReadableElements();
    const texts = elements.map(e => e.text);
    
    expect(texts).not.toContain('Navigation');
    expect(texts).not.toContain('Sidebar content');
    expect(texts).not.toContain('Footer content');
  });

  it('should calculate content scores correctly', () => {
    const article = document.querySelector('article')!;
    const nav = document.querySelector('nav')!;
    
    const articleScore = detector['calculateContentScore'](article);
    const navScore = detector['calculateContentScore'](nav);
    
    expect(articleScore).toBeGreaterThan(navScore);
  });
});
```

### 6.2 Integration Tests

```typescript
// tests/integration/reading-modes-integration.test.ts
describe('Reading Modes Integration', () => {
  let extension: ChromeExtension;

  beforeEach(async () => {
    extension = await loadExtension();
    await extension.navigateTo('https://example.com/article');
  });

  it('should switch between reading modes seamlessly', async () => {
    // Start in selection mode
    await extension.selectText('First paragraph');
    await extension.startTTS();
    
    // Verify only selection is read
    await extension.waitForSpeechComplete();
    expect(await extension.getSpeechLog()).toHaveLength(1);
    
    // Switch to continue reading
    await extension.setReadingMode('continue_reading');
    await extension.selectText('Second paragraph');
    await extension.startTTS();
    
    // Verify multiple paragraphs are read
    await extension.waitForSpeechComplete();
    expect(await extension.getSpeechLog()).toHaveLength(3);
  });

  it('should save and restore reading position', async () => {
    // Start full page reading
    await extension.setReadingMode('read_entire_page');
    await extension.startTTS();
    
    // Let it read 3 elements
    await extension.waitForElements(3);
    const position1 = await extension.getReadingPosition();
    
    // Stop and navigate away
    await extension.stopTTS();
    await extension.navigateTo('https://example.com/other');
    
    // Navigate back and resume
    await extension.navigateBack();
    await extension.resumeReading();
    
    const position2 = await extension.getReadingPosition();
    expect(position2.index).toBe(position1.index);
  });

  it('should handle mode switching during active reading', async () => {
    // Start in continue reading mode
    await extension.setReadingMode('continue_reading');
    await extension.selectText('Start here');
    await extension.startTTS();
    
    // Switch to selection only while reading
    await extension.wait(1000);
    await extension.setReadingMode('selection_only');
    
    // Verify reading stops
    await extension.wait(500);
    expect(await extension.isSpeaking()).toBe(false);
  });
});
```

### 6.3 E2E Test Scenarios

**E2E-001: Selection Only Mode Flow**
1. Navigate to article page
2. Select paragraph of text
3. Choose "Selection Only" mode
4. Start TTS via context menu
5. Verify only selected text is read
6. Verify stops after completion
7. Select different text
8. Start again
9. Verify new selection is read

**E2E-002: Continue Reading Mode Flow**
1. Navigate to blog post
2. Select first paragraph
3. Choose "Continue Reading" mode
4. Start TTS
5. Verify first paragraph is read
6. Verify automatic advance to second
7. Pause during third paragraph
8. Resume
9. Verify continues from pause point
10. Let it reach end of article

**E2E-003: Read Entire Page Mode Flow**
1. Navigate to documentation page
2. Choose "Read Entire Page" mode
3. Click start in popup
4. Verify progress indicator updates
5. Jump to specific section
6. Verify reading continues from jump point
7. Close tab during reading
8. Reopen same page
9. Verify position restored
10. Complete reading to 100%

## 7. UI/UX Specifications

### 7.1 Mode Selection Interface

```css
/* Mode selector styles */
.reading-mode-selector {
  padding: 12px;
  background: var(--base-100);
  border-radius: 8px;
}

.mode-button {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
  border: 2px solid var(--base-300);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-button:hover {
  border-color: var(--primary);
  background: var(--primary-content);
}

.mode-button.active {
  border-color: var(--primary);
  background: var(--primary) / 0.1;
  color: var(--primary);
}

.mode-icon {
  font-size: 24px;
  margin-right: 12px;
}

.mode-info {
  flex: 1;
  text-align: left;
}

.mode-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.mode-description {
  font-size: 12px;
  opacity: 0.7;
}
```

### 7.2 Visual Indicators

**Current Reading Position**
- Highlight current paragraph/element
- Subtle animation for reading progress
- Different colors for different modes
- Smooth transitions between elements

**Reading Queue Preview**
- Semi-transparent overlay for next items
- Numbered indicators for queue position
- Collapsible queue viewer
- Drag to reorder capability

**Progress Indicators**
- Linear progress bar for full page mode
- Circular progress for current element
- Time remaining estimation
- Elements read counter

### 7.3 Mode-Specific UI Elements

**Selection Only Mode**
- Simple play button
- No progress indicators
- Clear completion state
- Minimal UI footprint

**Continue Reading Mode**
- Next/Previous navigation
- Queue length indicator
- Auto-advance toggle
- Preview of next content

**Read Entire Page Mode**
- Full progress bar
- Section navigator
- Bookmark controls
- Reading statistics

## 8. Error Handling

### 8.1 Content Detection Failures

```typescript
interface ContentDetectionError {
  type: 'NO_CONTENT' | 'DYNAMIC_CONTENT' | 'ACCESS_DENIED' | 'COMPLEX_LAYOUT';
  fallbackStrategy: () => void;
  userMessage: string;
}

function handleContentDetectionError(error: ContentDetectionError): void {
  switch (error.type) {
    case 'NO_CONTENT':
      // Fallback to basic DOM traversal
      error.fallbackStrategy = () => useBasicDOMReader();
      error.userMessage = 'Using simplified reading mode';
      break;
      
    case 'DYNAMIC_CONTENT':
      // Wait for content to load
      error.fallbackStrategy = () => waitForDynamicContent();
      error.userMessage = 'Waiting for content to load...';
      break;
      
    case 'ACCESS_DENIED':
      // Try alternative selectors
      error.fallbackStrategy = () => useAlternativeSelectors();
      error.userMessage = 'Adjusting content detection...';
      break;
      
    case 'COMPLEX_LAYOUT':
      // Use manual selection
      error.fallbackStrategy = () => promptManualSelection();
      error.userMessage = 'Please select the main content area';
      break;
  }
  
  showNotification(error.userMessage, 'warning');
  error.fallbackStrategy();
}
```

### 8.2 Mode Transition Errors

```typescript
async function handleModeTransition(
  fromMode: ReadingMode, 
  toMode: ReadingMode
): Promise<void> {
  try {
    // Save current state
    const currentState = await saveCurrentState();
    
    // Stop current reading
    await stopCurrentReading();
    
    // Switch mode
    await setMode(toMode);
    
    // Restore applicable state
    if (shouldRestoreState(fromMode, toMode)) {
      await restoreState(currentState);
    }
  } catch (error) {
    console.error('Mode transition failed:', error);
    
    // Rollback to previous mode
    await setMode(fromMode);
    
    showNotification('Failed to switch mode', 'error');
  }
}
```

### 8.3 Reading Queue Management

```typescript
class ReadingQueueError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean
  ) {
    super(message);
  }
}

function handleQueueError(error: ReadingQueueError): void {
  if (error.recoverable) {
    // Try to recover
    switch (error.code) {
      case 'QUEUE_EMPTY':
        rebuildQueue();
        break;
      case 'ELEMENT_REMOVED':
        skipToNextValid();
        break;
      case 'POSITION_LOST':
        resetToBeginning();
        break;
    }
  } else {
    // Non-recoverable error
    stopReading();
    showError(error.message);
  }
}
```

## 9. Dependencies

### 9.1 Internal Dependencies
- **SpeechSynthesizer**: Core TTS functionality
- **MessageHandler**: Communication between components
- **StorageService**: Mode preferences and positions
- **ContentScript**: DOM manipulation and detection
- **PopupController**: UI state management

### 9.2 External Dependencies
- **Chrome APIs**:
  - `chrome.storage.local`: Mode preferences
  - `chrome.tabs`: Content script communication
  - `chrome.runtime`: Message passing
  - `chrome.contextMenus`: Mode selection menu

### 9.3 Feature Dependencies
- **Basic TTS**: Must be fully implemented
- **Text Selection**: Required for selection mode
- **Pause/Resume**: Required for mode switching
- **Progress Tracking**: Required for full page mode

### 9.4 Library Dependencies
- **DOM Traversal**: TreeWalker API
- **Content Analysis**: Custom algorithms
- **State Management**: React hooks
- **UI Components**: DaisyUI components

## 10. Performance Considerations

### 10.1 Content Detection Optimization
- Cache detected content areas
- Lazy load reading queue items
- Limit DOM queries per detection
- Use efficient selectors
- Debounce dynamic content checks

### 10.2 Memory Management
- Limit queue size (max 1000 items)
- Clean up completed items
- Release element references
- Use weak references where possible
- Clear cache on navigation

### 10.3 CPU Optimization
- Throttle highlighting updates
- Batch DOM operations
- Use requestAnimationFrame
- Minimize reflows/repaints
- Optimize content scoring algorithm

### 10.4 Battery Impact
- Reduce polling in background
- Suspend inactive detectors
- Use passive event listeners
- Minimize animation frames
- Cache detection results

## 11. Accessibility Considerations

### 11.1 Screen Reader Compatibility
- Announce mode changes
- Provide reading status updates
- Use ARIA live regions
- Label all controls clearly
- Support keyboard navigation

### 11.2 Visual Accessibility
- High contrast mode support
- Configurable highlight colors
- Clear focus indicators
- Sufficient text size
- Color-blind friendly indicators

### 11.3 Motor Accessibility
- Large click targets (44x44px)
- Keyboard shortcuts for modes
- Reduced motion options
- Customizable timing
- One-handed operation support

## 12. Future Enhancements

### 12.1 Advanced Features
- AI-powered content summarization
- Smart chapter detection
- Reading speed optimization
- Voice commands for mode switching
- Multi-language content handling
- Collaborative reading sessions

### 12.2 Integration Opportunities
- Bookmark service integration
- Reading list synchronization
- Progress sharing across devices
- Export to audio files
- Integration with read-later apps
- Analytics and reading insights

## 13. Configuration Options

```typescript
interface ReadingModeSettings {
  // General settings
  defaultMode: ReadingMode;
  rememberModePerSite: boolean;
  autoSavePosition: boolean;
  
  // Selection Only settings
  selectionMinLength: number;
  selectionMaxLength: number;
  
  // Continue Reading settings
  autoAdvanceDelay: number; // ms between elements
  skipNavigation: boolean;
  skipAds: boolean;
  smartParagraphDetection: boolean;
  previewNextContent: boolean;
  
  // Read Entire Page settings
  detectMainContent: boolean;
  includeHeadings: boolean;
  includeLists: boolean;
  includeQuotes: boolean;
  includeTables: boolean;
  includeCodeBlocks: boolean;
  savePositionDuration: number; // minutes
  
  // Visual settings
  highlightCurrentElement: boolean;
  highlightColor: string;
  highlightOpacity: number;
  showReadingProgress: boolean;
  showQueuePreview: boolean;
}
```

## 14. Metrics and Analytics

### 14.1 Usage Metrics
- Mode usage distribution
- Average session duration per mode
- Mode switching frequency
- Content detection success rate
- Queue completion rate

### 14.2 Performance Metrics
- Content detection time
- Mode switching latency
- Memory usage per mode
- Battery impact analysis
- Error frequency by mode

### 14.3 User Satisfaction
- Mode preference trends
- Feature request patterns
- Error report analysis
- User feedback sentiment
- Completion rate by content type

## 15. Migration and Rollout

### 15.1 Migration Plan
1. Implement basic mode infrastructure
2. Migrate existing TTS to selection only mode
3. Add continue reading mode (beta)
4. Add full page mode (beta)
5. Gradual rollout with feature flags

### 15.2 Backwards Compatibility
- Existing shortcuts continue working
- Settings migrate automatically
- Default to selection only mode
- No breaking changes to API
- Graceful degradation for errors

### 15.3 User Communication
- In-app tutorial for new modes
- Changelog highlighting features
- Video demonstrations
- Help documentation
- Feedback collection mechanism

---

**Document Version History**
- v1.0 (2025-01-02): Initial specification created

**Approvals Required**
- [ ] Engineering Lead
- [ ] Product Manager  
- [ ] UX Designer
- [ ] QA Lead
- [ ] Accessibility Reviewer