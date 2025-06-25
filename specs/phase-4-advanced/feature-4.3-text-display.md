# Feature 4.3: Text Display with Real-time Highlighting

## Feature Overview and Objectives

### Overview
Implement a sophisticated text display system that shows the selected text with real-time visual highlighting as it's being spoken. This feature provides visual feedback to help users follow along with the TTS playback, making the experience more accessible and engaging.

### Objectives
- Display selected text in a clean, readable format
- Highlight currently spoken words/sentences in real-time
- Support multiple highlighting modes (word-by-word, sentence-by-sentence)
- Provide customizable visual styling options
- Handle complex text formatting and edge cases
- Maintain performance with large text blocks
- Support accessibility features for visually impaired users

## Technical Requirements

### Core Requirements
- Real-time text highlighting synchronized with TTS playback
- Multiple highlighting granularities (character, word, sentence)
- Smooth visual transitions between highlighted segments
- Support for rich text formatting preservation
- Responsive design for various screen sizes
- High contrast mode for accessibility

### Performance Requirements
- Smooth highlighting updates at 60fps
- Efficient DOM manipulation for large texts (>10,000 characters)
- Minimal memory overhead for text processing
- Fast text parsing and segmentation
- Lazy rendering for extremely long texts

### Visual Requirements
- Customizable highlight colors and styles
- Smooth fade transitions between highlights
- Multiple visual themes (dark mode, high contrast)
- Adjustable font sizes and spacing
- Progress indicator integration

## Implementation Steps

### Step 1: Text Processing and Segmentation

```typescript
// types/textDisplay.ts
export interface TextSegment {
  id: string;
  type: 'word' | 'sentence' | 'paragraph';
  text: string;
  startIndex: number;
  endIndex: number;
  isHighlighted: boolean;
  isSpoken: boolean;
}

export interface TextDisplayConfig {
  highlightMode: 'word' | 'sentence' | 'paragraph';
  highlightColor: string;
  spokenColor: string;
  fontSize: number;
  lineHeight: number;
  theme: 'light' | 'dark' | 'high-contrast';
  animationSpeed: number;
  showProgress: boolean;
}

export interface HighlightState {
  currentSegmentId: string | null;
  spokenSegmentIds: Set<string>;
  highlightPosition: number;
  isAnimating: boolean;
}
```

```typescript
// utils/textProcessor.ts
export class TextProcessor {
  private static readonly SENTENCE_ENDINGS = /[.!?]+(?:\s|$)/g;
  private static readonly WORD_BOUNDARIES = /\s+/g;

  static segmentText(text: string, mode: 'word' | 'sentence' | 'paragraph'): TextSegment[] {
    switch (mode) {
      case 'word':
        return this.segmentByWords(text);
      case 'sentence':
        return this.segmentBySentences(text);
      case 'paragraph':
        return this.segmentByParagraphs(text);
      default:
        return this.segmentByWords(text);
    }
  }

  private static segmentByWords(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const words = text.split(this.WORD_BOUNDARIES);
    let currentIndex = 0;

    words.forEach((word, index) => {
      if (word.trim().length === 0) {
        currentIndex += word.length;
        return;
      }

      const startIndex = text.indexOf(word, currentIndex);
      const endIndex = startIndex + word.length;

      segments.push({
        id: `word-${index}`,
        type: 'word',
        text: word,
        startIndex,
        endIndex,
        isHighlighted: false,
        isSpoken: false,
      });

      currentIndex = endIndex;
    });

    return segments;
  }

  private static segmentBySentences(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const sentences = text.split(this.SENTENCE_ENDINGS);
    let currentIndex = 0;

    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) return;

      const startIndex = text.indexOf(trimmedSentence, currentIndex);
      const endIndex = startIndex + trimmedSentence.length;

      segments.push({
        id: `sentence-${index}`,
        type: 'sentence',
        text: trimmedSentence,
        startIndex,
        endIndex,
        isHighlighted: false,
        isSpoken: false,
      });

      currentIndex = endIndex;
    });

    return segments;
  }

  private static segmentByParagraphs(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const paragraphs = text.split(/\n\s*\n/);
    let currentIndex = 0;

    paragraphs.forEach((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      if (trimmedParagraph.length === 0) return;

      const startIndex = text.indexOf(trimmedParagraph, currentIndex);
      const endIndex = startIndex + trimmedParagraph.length;

      segments.push({
        id: `paragraph-${index}`,
        type: 'paragraph',
        text: trimmedParagraph,
        startIndex,
        endIndex,
        isHighlighted: false,
        isSpoken: false,
      });

      currentIndex = endIndex;
    });

    return segments;
  }

  static findSegmentByPosition(segments: TextSegment[], position: number): TextSegment | null {
    return segments.find(segment => 
      position >= segment.startIndex && position < segment.endIndex
    ) || null;
  }

  static getSegmentsByRange(segments: TextSegment[], startPos: number, endPos: number): TextSegment[] {
    return segments.filter(segment =>
      segment.startIndex >= startPos && segment.endIndex <= endPos
    );
  }
}
```

### Step 2: Text Display Hook with Highlighting Logic

```typescript
// hooks/useTextDisplay.ts
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TextSegment, TextDisplayConfig, HighlightState } from '../types/textDisplay';
import { TextProcessor } from '../utils/textProcessor';

const DEFAULT_CONFIG: TextDisplayConfig = {
  highlightMode: 'word',
  highlightColor: '#ffeb3b',
  spokenColor: '#4caf50',
  fontSize: 16,
  lineHeight: 1.5,
  theme: 'light',
  animationSpeed: 300,
  showProgress: true,
};

export const useTextDisplay = (text: string, config: Partial<TextDisplayConfig> = {}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [highlightState, setHighlightState] = useState<HighlightState>({
    currentSegmentId: null,
    spokenSegmentIds: new Set(),
    highlightPosition: 0,
    isAnimating: false,
  });

  const animationTimeoutRef = useRef<number | null>(null);

  // Memoized text segments
  const segments = useMemo(() => {
    return TextProcessor.segmentText(text, fullConfig.highlightMode);
  }, [text, fullConfig.highlightMode]);

  // Update highlight based on character position
  const updateHighlight = useCallback((position: number, isCompleted: boolean = false) => {
    if (isCompleted) {
      // Mark all segments as spoken
      setHighlightState(prev => ({
        ...prev,
        currentSegmentId: null,
        spokenSegmentIds: new Set(segments.map(s => s.id)),
        highlightPosition: text.length,
        isAnimating: false,
      }));
      return;
    }

    const currentSegment = TextProcessor.findSegmentByPosition(segments, position);
    
    if (!currentSegment) return;

    setHighlightState(prev => {
      const newSpokenIds = new Set(prev.spokenSegmentIds);
      
      // Mark previous segments as spoken
      segments.forEach(segment => {
        if (segment.endIndex <= position && segment.id !== currentSegment.id) {
          newSpokenIds.add(segment.id);
        }
      });

      return {
        ...prev,
        currentSegmentId: currentSegment.id,
        spokenSegmentIds: newSpokenIds,
        highlightPosition: position,
        isAnimating: true,
      };
    });

    // Clear animation state after animation completes
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    animationTimeoutRef.current = window.setTimeout(() => {
      setHighlightState(prev => ({ ...prev, isAnimating: false }));
    }, fullConfig.animationSpeed);

  }, [segments, text.length, fullConfig.animationSpeed]);

  // Reset highlight state
  const resetHighlight = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    setHighlightState({
      currentSegmentId: null,
      spokenSegmentIds: new Set(),
      highlightPosition: 0,
      isAnimating: false,
    });
  }, []);

  // Get segment display properties
  const getSegmentDisplayProps = useCallback((segment: TextSegment) => {
    const isCurrentlyHighlighted = segment.id === highlightState.currentSegmentId;
    const isSpoken = highlightState.spokenSegmentIds.has(segment.id);
    
    return {
      isCurrentlyHighlighted,
      isSpoken,
      className: [
        'text-segment',
        `text-segment-${segment.type}`,
        isCurrentlyHighlighted && 'highlighted',
        isSpoken && 'spoken',
        highlightState.isAnimating && isCurrentlyHighlighted && 'animating',
      ].filter(Boolean).join(' '),
      style: {
        backgroundColor: isCurrentlyHighlighted 
          ? fullConfig.highlightColor 
          : isSpoken 
            ? fullConfig.spokenColor 
            : 'transparent',
        fontSize: `${fullConfig.fontSize}px`,
        lineHeight: fullConfig.lineHeight,
        transition: `background-color ${fullConfig.animationSpeed}ms ease-in-out`,
      },
    };
  }, [highlightState, fullConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return {
    segments,
    highlightState,
    config: fullConfig,
    updateHighlight,
    resetHighlight,
    getSegmentDisplayProps,
  };
};
```

### Step 3: Text Display Components

```typescript
// components/TextSegment.tsx
import React, { memo } from 'react';
import { TextSegment as TextSegmentType } from '../types/textDisplay';

interface TextSegmentProps {
  segment: TextSegmentType;
  displayProps: {
    isCurrentlyHighlighted: boolean;
    isSpoken: boolean;
    className: string;
    style: React.CSSProperties;
  };
  onClick?: (segment: TextSegmentType) => void;
}

export const TextSegment: React.FC<TextSegmentProps> = memo(({ 
  segment, 
  displayProps, 
  onClick 
}) => {
  const handleClick = () => {
    onClick?.(segment);
  };

  return (
    <span
      className={displayProps.className}
      style={displayProps.style}
      onClick={handleClick}
      data-segment-id={segment.id}
      data-start-index={segment.startIndex}
      data-end-index={segment.endIndex}
    >
      {segment.text}
      {segment.type !== 'word' && ' '}
    </span>
  );
});

TextSegment.displayName = 'TextSegment';
```

```typescript
// components/TextDisplay.tsx
import React, { useRef, useEffect } from 'react';
import { useTextDisplay } from '../hooks/useTextDisplay';
import { TextDisplayConfig } from '../types/textDisplay';
import { TextSegment } from './TextSegment';

interface TextDisplayProps {
  text: string;
  currentPosition: number;
  isCompleted: boolean;
  config?: Partial<TextDisplayConfig>;
  onSegmentClick?: (startIndex: number, endIndex: number) => void;
  className?: string;
}

export const TextDisplay: React.FC<TextDisplayProps> = ({
  text,
  currentPosition,
  isCompleted,
  config,
  onSegmentClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    segments,
    highlightState,
    config: fullConfig,
    updateHighlight,
    resetHighlight,
    getSegmentDisplayProps,
  } = useTextDisplay(text, config);

  // Update highlight when position changes
  useEffect(() => {
    updateHighlight(currentPosition, isCompleted);
  }, [currentPosition, isCompleted, updateHighlight]);

  // Auto-scroll to highlighted segment
  useEffect(() => {
    if (!highlightState.currentSegmentId || !containerRef.current) return;

    const highlightedElement = containerRef.current.querySelector(
      `[data-segment-id="${highlightState.currentSegmentId}"]`
    );

    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [highlightState.currentSegmentId]);

  // Reset highlight when text changes
  useEffect(() => {
    resetHighlight();
  }, [text, resetHighlight]);

  const handleSegmentClick = (segment: any) => {
    onSegmentClick?.(segment.startIndex, segment.endIndex);
  };

  const getThemeClassName = () => {
    switch (fullConfig.theme) {
      case 'dark':
        return 'text-display-dark';
      case 'high-contrast':
        return 'text-display-high-contrast';
      default:
        return 'text-display-light';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`text-display ${getThemeClassName()} ${className}`}
      data-testid="text-display"
    >
      {/* Progress Indicator */}
      {fullConfig.showProgress && (
        <div className="text-progress-indicator">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${(highlightState.highlightPosition / text.length) * 100}%`,
                transition: `width ${fullConfig.animationSpeed}ms ease-out`,
              }}
            />
          </div>
          <div className="progress-stats">
            <span className="current-position">
              {highlightState.highlightPosition}
            </span>
            <span className="separator">/</span>
            <span className="total-length">{text.length}</span>
            <span className="percentage">
              ({Math.round((highlightState.highlightPosition / text.length) * 100)}%)
            </span>
          </div>
        </div>
      )}

      {/* Text Content */}
      <div className="text-content">
        {segments.map((segment) => (
          <TextSegment
            key={segment.id}
            segment={segment}
            displayProps={getSegmentDisplayProps(segment)}
            onClick={handleSegmentClick}
          />
        ))}
      </div>

      {/* Reading Statistics */}
      <div className="reading-statistics">
        <div className="segments-stats">
          <span className="total-segments">
            Total {fullConfig.highlightMode}s: {segments.length}
          </span>
          <span className="spoken-segments">
            Spoken: {highlightState.spokenSegmentIds.size}
          </span>
          <span className="remaining-segments">
            Remaining: {segments.length - highlightState.spokenSegmentIds.size}
          </span>
        </div>
      </div>
    </div>
  );
};
```

### Step 4: Advanced Text Display with Virtual Scrolling

```typescript
// components/VirtualizedTextDisplay.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { useTextDisplay } from '../hooks/useTextDisplay';
import { TextDisplayConfig } from '../types/textDisplay';

interface VirtualizedTextDisplayProps {
  text: string;
  currentPosition: number;
  isCompleted: boolean;
  config?: Partial<TextDisplayConfig>;
  onSegmentClick?: (startIndex: number, endIndex: number) => void;
  maxVisibleSegments?: number;
  className?: string;
}

const ITEM_HEIGHT = 32; // Height of each text segment

export const VirtualizedTextDisplay: React.FC<VirtualizedTextDisplayProps> = ({
  text,
  currentPosition,
  isCompleted,
  config,
  onSegmentClick,
  maxVisibleSegments = 50,
  className = '',
}) => {
  const listRef = useRef<List>(null);
  const {
    segments,
    highlightState,
    config: fullConfig,
    updateHighlight,
    resetHighlight,
    getSegmentDisplayProps,
  } = useTextDisplay(text, config);

  // Update highlight when position changes
  useEffect(() => {
    updateHighlight(currentPosition, isCompleted);
  }, [currentPosition, isCompleted, updateHighlight]);

  // Auto-scroll to highlighted segment
  useEffect(() => {
    if (!highlightState.currentSegmentId || !listRef.current) return;

    const currentIndex = segments.findIndex(
      segment => segment.id === highlightState.currentSegmentId
    );

    if (currentIndex >= 0) {
      listRef.current.scrollToItem(currentIndex, 'center');
    }
  }, [highlightState.currentSegmentId, segments]);

  const handleSegmentClick = useCallback((segment: any) => {
    onSegmentClick?.(segment.startIndex, segment.endIndex);
  }, [onSegmentClick]);

  // Virtual list item renderer
  const SegmentItem: React.FC<ListChildComponentProps> = ({ index, style }) => {
    const segment = segments[index];
    const displayProps = getSegmentDisplayProps(segment);

    return (
      <div style={style}>
        <span
          className={displayProps.className}
          style={{
            ...displayProps.style,
            display: 'inline-block',
            width: '100%',
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={() => handleSegmentClick(segment)}
          data-segment-id={segment.id}
        >
          {segment.text}
        </span>
      </div>
    );
  };

  const listHeight = Math.min(segments.length * ITEM_HEIGHT, maxVisibleSegments * ITEM_HEIGHT);

  return (
    <div className={`virtualized-text-display ${className}`}>
      {/* Progress Indicator */}
      {fullConfig.showProgress && (
        <div className="text-progress-indicator">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${(highlightState.highlightPosition / text.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Virtualized Text List */}
      <List
        ref={listRef}
        height={listHeight}
        itemCount={segments.length}
        itemSize={ITEM_HEIGHT}
        className="text-segments-list"
      >
        {SegmentItem}
      </List>

      {/* Statistics */}
      <div className="text-statistics">
        <span>
          Showing {Math.min(maxVisibleSegments, segments.length)} of {segments.length} segments
        </span>
      </div>
    </div>
  );
};
```

### Step 5: Configuration Panel

```typescript
// components/TextDisplayConfig.tsx
import React from 'react';
import { TextDisplayConfig } from '../types/textDisplay';

interface TextDisplayConfigProps {
  config: TextDisplayConfig;
  onChange: (config: Partial<TextDisplayConfig>) => void;
  className?: string;
}

export const TextDisplayConfigPanel: React.FC<TextDisplayConfigProps> = ({
  config,
  onChange,
  className = '',
}) => {
  const handleConfigChange = (key: keyof TextDisplayConfig, value: any) => {
    onChange({ [key]: value });
  };

  return (
    <div className={`text-display-config ${className}`}>
      <h3>Text Display Settings</h3>
      
      {/* Highlighting Mode */}
      <div className="config-group">
        <label htmlFor="highlight-mode">Highlight Mode:</label>
        <select
          id="highlight-mode"
          value={config.highlightMode}
          onChange={(e) => handleConfigChange('highlightMode', e.target.value)}
        >
          <option value="word">Word by Word</option>
          <option value="sentence">Sentence by Sentence</option>
          <option value="paragraph">Paragraph by Paragraph</option>
        </select>
      </div>

      {/* Colors */}
      <div className="config-group">
        <label htmlFor="highlight-color">Highlight Color:</label>
        <input
          type="color"
          id="highlight-color"
          value={config.highlightColor}
          onChange={(e) => handleConfigChange('highlightColor', e.target.value)}
        />
      </div>

      <div className="config-group">
        <label htmlFor="spoken-color">Spoken Text Color:</label>
        <input
          type="color"
          id="spoken-color"
          value={config.spokenColor}
          onChange={(e) => handleConfigChange('spokenColor', e.target.value)}
        />
      </div>

      {/* Typography */}
      <div className="config-group">
        <label htmlFor="font-size">Font Size:</label>
        <input
          type="range"
          id="font-size"
          min="12"
          max="24"
          value={config.fontSize}
          onChange={(e) => handleConfigChange('fontSize', parseInt(e.target.value))}
        />
        <span>{config.fontSize}px</span>
      </div>

      <div className="config-group">
        <label htmlFor="line-height">Line Height:</label>
        <input
          type="range"
          id="line-height"
          min="1.0"
          max="2.0"
          step="0.1"
          value={config.lineHeight}
          onChange={(e) => handleConfigChange('lineHeight', parseFloat(e.target.value))}
        />
        <span>{config.lineHeight}</span>
      </div>

      {/* Theme */}
      <div className="config-group">
        <label htmlFor="theme">Theme:</label>
        <select
          id="theme"
          value={config.theme}
          onChange={(e) => handleConfigChange('theme', e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="high-contrast">High Contrast</option>
        </select>
      </div>

      {/* Animation Speed */}
      <div className="config-group">
        <label htmlFor="animation-speed">Animation Speed:</label>
        <input
          type="range"
          id="animation-speed"
          min="100"
          max="1000"
          step="50"
          value={config.animationSpeed}
          onChange={(e) => handleConfigChange('animationSpeed', parseInt(e.target.value))}
        />
        <span>{config.animationSpeed}ms</span>
      </div>

      {/* Show Progress */}
      <div className="config-group">
        <label>
          <input
            type="checkbox"
            checked={config.showProgress}
            onChange={(e) => handleConfigChange('showProgress', e.target.checked)}
          />
          Show Progress Indicator
        </label>
      </div>
    </div>
  );
};
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// tests/textProcessor.test.ts
import { TextProcessor } from '../utils/textProcessor';

describe('TextProcessor', () => {
  const sampleText = "Hello world. This is a test. How are you today?";

  test('should segment text by words correctly', () => {
    const segments = TextProcessor.segmentText(sampleText, 'word');
    
    expect(segments).toHaveLength(10); // Number of words
    expect(segments[0].text).toBe('Hello');
    expect(segments[1].text).toBe('world.');
    expect(segments[0].type).toBe('word');
  });

  test('should segment text by sentences correctly', () => {
    const segments = TextProcessor.segmentText(sampleText, 'sentence');
    
    expect(segments).toHaveLength(3); // Number of sentences
    expect(segments[0].text).toBe('Hello world.');
    expect(segments[1].text).toBe('This is a test.');
    expect(segments[0].type).toBe('sentence');
  });

  test('should find segment by position correctly', () => {
    const segments = TextProcessor.segmentText(sampleText, 'word');
    const segment = TextProcessor.findSegmentByPosition(segments, 6); // Position in "world"
    
    expect(segment?.text).toBe('world.');
  });

  test('should handle empty text gracefully', () => {
    const segments = TextProcessor.segmentText('', 'word');
    expect(segments).toHaveLength(0);
  });

  test('should handle text with multiple spaces', () => {
    const textWithSpaces = "Hello    world.   This  is   a    test.";
    const segments = TextProcessor.segmentText(textWithSpaces, 'word');
    
    expect(segments.every(segment => segment.text.trim() !== '')).toBe(true);
  });
});
```

### Component Tests

```typescript
// tests/textDisplay.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextDisplay } from '../components/TextDisplay';

describe('TextDisplay', () => {
  const sampleText = "Hello world. This is a test sentence.";

  test('should render text segments correctly', () => {
    render(
      <TextDisplay
        text={sampleText}
        currentPosition={0}
        isCompleted={false}
      />
    );

    expect(screen.getByTestId('text-display')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world.')).toBeInTheDocument();
  });

  test('should highlight current segment', () => {
    render(
      <TextDisplay
        text={sampleText}
        currentPosition={6} // Position in "world"
        isCompleted={false}
      />
    );

    const worldSegment = screen.getByText('world.');
    expect(worldSegment).toHaveClass('highlighted');
  });

  test('should mark spoken segments', () => {
    render(
      <TextDisplay
        text={sampleText}
        currentPosition={15} // After "Hello world. This"
        isCompleted={false}
      />
    );

    const helloSegment = screen.getByText('Hello');
    expect(helloSegment).toHaveClass('spoken');
  });

  test('should handle segment clicks', () => {
    const onSegmentClick = jest.fn();
    
    render(
      <TextDisplay
        text={sampleText}
        currentPosition={0}
        isCompleted={false}
        onSegmentClick={onSegmentClick}
      />
    );

    fireEvent.click(screen.getByText('Hello'));
    expect(onSegmentClick).toHaveBeenCalled();
  });

  test('should apply custom configuration', () => {
    const customConfig = {
      fontSize: 20,
      highlightColor: '#ff0000',
      theme: 'dark' as const,
    };

    render(
      <TextDisplay
        text={sampleText}
        currentPosition={0}
        isCompleted={false}
        config={customConfig}
      />
    );

    const display = screen.getByTestId('text-display');
    expect(display).toHaveClass('text-display-dark');
  });

  test('should show progress indicator when enabled', () => {
    render(
      <TextDisplay
        text={sampleText}
        currentPosition={sampleText.length / 2}
        isCompleted={false}
        config={{ showProgress: true }}
      />
    );

    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// tests/textDisplayIntegration.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TextDisplay } from '../components/TextDisplay';

describe('TextDisplay Integration', () => {
  test('should update highlights smoothly as position changes', async () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const { rerender } = render(
      <TextDisplay
        text={text}
        currentPosition={0}
        isCompleted={false}
      />
    );

    // Initially no highlights
    expect(screen.queryByText('The')).not.toHaveClass('highlighted');

    // Update position to highlight "The"
    rerender(
      <TextDisplay
        text={text}
        currentPosition={2}
        isCompleted={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('The')).toHaveClass('highlighted');
    });

    // Move to next word "quick"
    rerender(
      <TextDisplay
        text={text}
        currentPosition={8}
        isCompleted={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('The')).toHaveClass('spoken');
      expect(screen.getByText('quick')).toHaveClass('highlighted');
    });
  });

  test('should handle completion state correctly', async () => {
    const text = "Short test text.";
    const { rerender } = render(
      <TextDisplay
        text={text}
        currentPosition={0}
        isCompleted={false}
      />
    );

    // Mark as completed
    rerender(
      <TextDisplay
        text={text}
        currentPosition={text.length}
        isCompleted={true}
      />
    );

    await waitFor(() => {
      const segments = screen.getAllByClass('spoken');
      expect(segments.length).toBeGreaterThan(0);
    });
  });

  test('should handle mode switching', async () => {
    const text = "First sentence. Second sentence.";
    const { rerender } = render(
      <TextDisplay
        text={text}
        currentPosition={0}
        isCompleted={false}
        config={{ highlightMode: 'word' }}
      />
    );

    // Check word-level segmentation
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('sentence.')).toBeInTheDocument();

    // Switch to sentence mode
    rerender(
      <TextDisplay
        text={text}
        currentPosition={0}
        isCompleted={false}
        config={{ highlightMode: 'sentence' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('First sentence.')).toBeInTheDocument();
    });
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e/textDisplay.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Text Display with Highlighting', () => {
  test('should display and highlight text during TTS playback', async ({ page }) => {
    await page.goto('/tts-extension');
    
    const testText = 'The quick brown fox jumps over the lazy dog.';
    await page.fill('#text-input', testText);
    await page.click('#play-button');
    
    // Check if text display is visible
    await expect(page.locator('.text-display')).toBeVisible();
    
    // Check if segments are rendered
    await expect(page.locator('.text-segment')).toHaveCount(9); // 9 words
    
    // Wait for highlighting to start
    await expect(page.locator('.text-segment.highlighted')).toBeVisible();
    
    // Check if progress indicator is working
    await expect(page.locator('.progress-fill')).toBeVisible();
    
    // Verify spoken segments have correct styling
    await page.waitForTimeout(2000);
    await expect(page.locator('.text-segment.spoken')).toHaveCount.greaterThan(0);
  });

  test('should allow configuration changes', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Open configuration panel
    await page.click('#config-button');
    
    // Change highlight mode
    await page.selectOption('#highlight-mode', 'sentence');
    
    // Change colors
    await page.fill('#highlight-color', '#ff0000');
    await page.fill('#spoken-color', '#00ff00');
    
    // Change font size
    await page.fill('#font-size', '20');
    
    const testText = 'First sentence. Second sentence.';
    await page.fill('#text-input', testText);
    await page.click('#play-button');
    
    // Verify sentence-level highlighting
    await expect(page.locator('.text-segment-sentence')).toHaveCount(2);
    
    // Verify custom styling is applied
    const highlightedSegment = page.locator('.text-segment.highlighted').first();
    const backgroundColor = await highlightedSegment.evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).toBe('rgb(255, 0, 0)'); // #ff0000
  });

  test('should handle long text with virtualization', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Generate long text
    const longText = Array(1000).fill('This is a test sentence.').join(' ');
    await page.fill('#text-input', longText);
    
    // Enable virtualization for long text
    await page.check('#enable-virtualization');
    
    await page.click('#play-button');
    
    // Check if virtualized display is used
    await expect(page.locator('.virtualized-text-display')).toBeVisible();
    
    // Verify auto-scrolling works
    await page.waitForTimeout(3000);
    const scrollTop = await page.locator('.text-segments-list').evaluate(
      el => el.scrollTop
    );
    expect(scrollTop).toBeGreaterThan(0);
  });

  test('should support accessibility features', async ({ page }) => {
    await page.goto('/tts-extension');
    
    // Enable high contrast mode
    await page.selectOption('#theme', 'high-contrast');
    
    const testText = 'Testing accessibility features.';
    await page.fill('#text-input', testText);
    await page.click('#play-button');
    
    // Check if high contrast theme is applied
    await expect(page.locator('.text-display-high-contrast')).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should click on focused segment
    
    // Verify segment click functionality works with keyboard
    await expect(page.locator('.text-segment:focus')).toBeVisible();
  });
});
```

## Success Metrics

### Performance Metrics
- Text segmentation completes within 100ms for texts up to 10,000 characters
- Highlight updates render at consistent 60fps
- Virtual scrolling maintains smooth performance with 10,000+ segments
- Memory usage remains stable during long TTS sessions

### Visual Quality Metrics
- Highlight transitions are smooth with no flickering
- Text remains readable across all supported font sizes (12px-24px)
- Color contrast meets WCAG AA standards in all themes
- Auto-scrolling keeps highlighted text visible 95% of the time

### User Experience Metrics
- Users can follow along with highlighted text in 98% of cases
- Configuration changes apply immediately without disrupting playback
- Segment clicking allows users to jump to specific positions accurately
- Text display adapts properly to different screen sizes (320px-1920px)

### Accessibility Metrics
- High contrast mode provides sufficient color contrast (7:1 ratio)
- Keyboard navigation works for all interactive elements
- Screen readers can access segment information properly
- Text scaling up to 200% maintains readability

## Dependencies and Risks

### Dependencies
- **React 16.8+**: For hooks-based state management
- **React Window**: For virtualization of long texts (optional)
- **Web API**: Intersection Observer for auto-scrolling
- **CSS Transitions**: For smooth highlight animations
- **TypeScript 4.0+**: For proper type definitions

### Technical Risks

**High Risk:**
- **Performance Degradation**: Large texts may cause performance issues
  - *Mitigation*: Implement virtualization for texts >5,000 characters
  - *Fallback*: Lazy loading and text chunking strategies

**Medium Risk:**
- **Memory Leaks**: Frequent highlight updates may accumulate event listeners
  - *Mitigation*: Proper cleanup in useEffect hooks
  - *Monitoring*: Memory usage tracking and automated cleanup

**Low Risk:**
- **Animation Conflicts**: Multiple rapid highlight changes may cause visual artifacts
  - *Mitigation*: Debounce highlight updates and use animation queues
  - *Solution*: Implement smooth transition management

### Implementation Risks

**Browser Compatibility**: CSS transitions and advanced selectors may not work in older browsers
- *Solution*: Progressive enhancement with fallback styles

**Text Processing Edge Cases**: Complex text formatting, special characters, or unusual spacing
- *Solution*: Comprehensive text processing with extensive test coverage

**Accessibility Compliance**: Color-only highlighting may not be sufficient for all users
- *Solution*: Multiple visual indicators (color, underline, bold, animation)

### Mitigation Strategies

1. **Progressive Enhancement**: Core text display works without advanced features
2. **Performance Monitoring**: Real-time performance metrics and automated optimization
3. **Comprehensive Testing**: Cross-browser testing with various text types and sizes
4. **Accessibility First**: Design with accessibility requirements from the start
5. **Fallback Strategies**: Multiple rendering strategies based on text size and device capabilities
6. **User Customization**: Allow users to disable resource-intensive features
7. **Error Boundaries**: Graceful handling of text processing errors