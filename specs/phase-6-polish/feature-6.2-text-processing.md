# Feature 6.2: Advanced Text Processing Pipeline

## Overview

Implement a sophisticated text processing pipeline that handles various text formats, special content types, and improves the natural reading experience. This includes sentence boundary detection, abbreviation expansion, number processing, and special content handling.

## Objectives

- Create intelligent text pre-processing for natural speech
- Handle edge cases in sentence detection
- Process special content types appropriately
- Support multiple languages and formats
- Optimize for reading comprehension

## Technical Requirements

### Functional Requirements

1. **Text Extraction & Cleaning**
   - Clean HTML entities (&amp;, &lt;, &gt;, etc.)
   - Remove invisible characters
   - Preserve meaningful whitespace
   - Handle Unicode properly
   - Extract alt text from images

2. **Sentence Boundary Detection**
   - Advanced regex for accurate detection
   - Handle abbreviations (Dr., Mr., etc.)
   - Decimal numbers (3.14, $19.99)
   - URLs and email addresses
   - Lists and bullet points

3. **Content Transformation**
   - Abbreviation expansion (optional)
   - Number and unit conversion
   - URL shortening or expansion
   - Emoji to text conversion
   - Code syntax simplification

4. **Special Content Handling**
   - Code blocks (skip or read)
   - Tables (row/column navigation)
   - Lists (pause between items)
   - Quotes (voice modulation)
   - Math equations (readable format)

### Non-Functional Requirements

1. **Performance**
   - Processing time < 100ms for 10KB text
   - Streaming support for large texts
   - Memory efficient chunking
   - Parallel processing where possible

2. **Accuracy**
   - 99% accurate sentence detection
   - Correct abbreviation handling
   - Proper number pronunciation
   - Language-aware processing

3. **Flexibility**
   - User-configurable options
   - Per-domain settings
   - Language-specific rules
   - Custom dictionaries

## Implementation

### 1. Text Processing Service

```typescript
// src/services/TextProcessor.ts
export interface ProcessingOptions {
  expandAbbreviations: boolean;
  processNumbers: boolean;
  handleUrls: 'full' | 'domain' | 'skip';
  skipCodeBlocks: boolean;
  convertEmojis: boolean;
  preserveFormatting: boolean;
  language: string;
}

export interface ProcessedText {
  originalText: string;
  processedText: string;
  sentences: Sentence[];
  metadata: TextMetadata;
}

export interface Sentence {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'normal' | 'code' | 'quote' | 'heading' | 'list-item';
  pauseAfter: number; // milliseconds
}

export interface TextMetadata {
  language: string;
  wordCount: number;
  estimatedDuration: number;
  hasCode: boolean;
  hasMath: boolean;
  hasUrls: boolean;
}

export class TextProcessor {
  private static instance: TextProcessor;
  private abbreviations: Map<string, string>;
  private sentenceDetector: SentenceDetector;
  private numberProcessor: NumberProcessor;
  private contentAnalyzer: ContentAnalyzer;

  static getInstance(): TextProcessor {
    if (!TextProcessor.instance) {
      TextProcessor.instance = new TextProcessor();
    }
    return TextProcessor.instance;
  }

  constructor() {
    this.abbreviations = this.loadAbbreviations();
    this.sentenceDetector = new SentenceDetector();
    this.numberProcessor = new NumberProcessor();
    this.contentAnalyzer = new ContentAnalyzer();
  }

  async processText(
    text: string,
    options: ProcessingOptions = this.getDefaultOptions()
  ): Promise<ProcessedText> {
    // Step 1: Clean and normalize
    let processed = this.cleanText(text);

    // Step 2: Analyze content
    const metadata = await this.contentAnalyzer.analyze(processed);

    // Step 3: Apply transformations
    if (options.expandAbbreviations) {
      processed = this.expandAbbreviations(processed);
    }

    if (options.processNumbers) {
      processed = this.numberProcessor.process(processed, metadata.language);
    }

    if (options.handleUrls !== 'full') {
      processed = this.processUrls(processed, options.handleUrls);
    }

    if (options.convertEmojis) {
      processed = this.convertEmojis(processed);
    }

    // Step 4: Detect sentences
    const sentences = this.sentenceDetector.detect(processed, metadata);

    // Step 5: Handle special content
    const finalSentences = this.processSpecialContent(sentences, options);

    return {
      originalText: text,
      processedText: processed,
      sentences: finalSentences,
      metadata,
    };
  }

  private cleanText(text: string): string {
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    let cleaned = textarea.value;

    // Remove zero-width characters
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove control characters except newlines and tabs
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return cleaned;
  }

  private expandAbbreviations(text: string): string {
    let expanded = text;

    // Common abbreviations
    const commonAbbrevs: Record<string, string> = {
      'Dr.': 'Doctor',
      'Mr.': 'Mister',
      'Mrs.': 'Misses',
      'Ms.': 'Miss',
      'Prof.': 'Professor',
      'St.': 'Street',
      'Ave.': 'Avenue',
      'etc.': 'et cetera',
      'vs.': 'versus',
      'e.g.': 'for example',
      'i.e.': 'that is',
      'Jr.': 'Junior',
      'Sr.': 'Senior',
      'Ph.D.': 'Doctor of Philosophy',
      'M.D.': 'Medical Doctor',
      'B.A.': 'Bachelor of Arts',
      'M.A.': 'Master of Arts',
      'B.S.': 'Bachelor of Science',
      'M.S.': 'Master of Science',
    };

    // Replace abbreviations with word boundaries
    Object.entries(commonAbbrevs).forEach(([abbrev, full]) => {
      const regex = new RegExp(`\\b${this.escapeRegex(abbrev)}`, 'g');
      expanded = expanded.replace(regex, full);
    });

    return expanded;
  }

  private processUrls(text: string, mode: 'domain' | 'skip'): string {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

    if (mode === 'skip') {
      return text.replace(urlRegex, '[link]');
    }

    // Extract domain only
    return text.replace(urlRegex, (match) => {
      try {
        const url = new URL(match);
        return url.hostname.replace('www.', '');
      } catch {
        return '[link]';
      }
    });
  }

  private convertEmojis(text: string): string {
    // Common emoji to text mappings
    const emojiMap: Record<string, string> = {
      '😀': 'smiling face',
      '😂': 'laughing',
      '❤️': 'heart',
      '👍': 'thumbs up',
      '👎': 'thumbs down',
      '✅': 'check mark',
      '❌': 'cross mark',
      '⭐': 'star',
      '🔥': 'fire',
      '💯': 'hundred points',
      // Add more as needed
    };

    let converted = text;
    Object.entries(emojiMap).forEach(([emoji, description]) => {
      converted = converted.replace(new RegExp(emoji, 'g'), ` ${description} `);
    });

    return converted;
  }

  private processSpecialContent(
    sentences: Sentence[],
    options: ProcessingOptions
  ): Sentence[] {
    return sentences.map(sentence => {
      // Skip code blocks if requested
      if (sentence.type === 'code' && options.skipCodeBlocks) {
        return {
          ...sentence,
          text: '[code block skipped]',
          pauseAfter: 500,
        };
      }

      // Add pauses for different content types
      switch (sentence.type) {
        case 'heading':
          sentence.pauseAfter = 800;
          break;
        case 'list-item':
          sentence.pauseAfter = 400;
          break;
        case 'quote':
          sentence.pauseAfter = 600;
          break;
        default:
          sentence.pauseAfter = 300;
      }

      return sentence;
    });
  }

  private getDefaultOptions(): ProcessingOptions {
    return {
      expandAbbreviations: true,
      processNumbers: true,
      handleUrls: 'domain',
      skipCodeBlocks: false,
      convertEmojis: true,
      preserveFormatting: true,
      language: 'en-US',
    };
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private loadAbbreviations(): Map<string, string> {
    // Load custom abbreviations from storage
    // This is a placeholder - would load from actual storage
    return new Map();
  }
}

// Sentence Detection Engine
class SentenceDetector {
  private sentenceEndRegex: RegExp;

  constructor() {
    // Advanced sentence boundary detection regex
    this.sentenceEndRegex = /[.!?]+(?:\s+|$)(?=[A-Z])|[.!?]+$/g;
  }

  detect(text: string, metadata: TextMetadata): Sentence[] {
    const sentences: Sentence[] = [];
    const lines = text.split('\n');
    let globalIndex = 0;

    for (const line of lines) {
      if (!line.trim()) {
        globalIndex += line.length + 1;
        continue;
      }

      const type = this.detectLineType(line);
      const lineSentences = this.splitIntoSentences(line, type);

      for (const sentence of lineSentences) {
        sentences.push({
          text: sentence,
          startIndex: globalIndex,
          endIndex: globalIndex + sentence.length,
          type,
          pauseAfter: 300,
        });
        globalIndex += sentence.length;
      }
      globalIndex += 1; // newline
    }

    return sentences;
  }

  private detectLineType(line: string): Sentence['type'] {
    // Code detection
    if (line.trim().startsWith('```') || /^\s{4,}/.test(line)) {
      return 'code';
    }

    // Quote detection
    if (line.trim().startsWith('>') || line.trim().startsWith('"')) {
      return 'quote';
    }

    // Heading detection (Markdown style)
    if (/^#{1,6}\s/.test(line.trim())) {
      return 'heading';
    }

    // List item detection
    if (/^[\*\-\+•]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())) {
      return 'list-item';
    }

    return 'normal';
  }

  private splitIntoSentences(text: string, type: Sentence['type']): string[] {
    if (type === 'code') {
      // Don't split code blocks
      return [text];
    }

    // Handle abbreviations
    let processed = text;
    const abbreviations = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Inc.', 'Ltd.', 'Co.'];
    abbreviations.forEach(abbr => {
      processed = processed.replace(new RegExp(`\\b${this.escapeRegex(abbr)}`, 'g'), abbr.replace('.', '@@@'));
    });

    // Handle decimal numbers
    processed = processed.replace(/(\d)\.(\d)/g, '$1@@@$2');

    // Split sentences
    const sentences = processed.split(this.sentenceEndRegex).filter(s => s.trim());

    // Restore periods
    return sentences.map(s => s.replace(/@@@/g, '.'));
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Number Processing Engine
class NumberProcessor {
  process(text: string, language: string): string {
    let processed = text;

    // Currency
    processed = processed.replace(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, (match, amount) => {
      return this.numberToWords(amount) + ' dollars';
    });

    // Percentages
    processed = processed.replace(/(\d+(?:\.\d+)?)\s*%/g, (match, num) => {
      return this.numberToWords(num) + ' percent';
    });

    // Time (12:30 PM)
    processed = processed.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (match, hour, minute, ampm) => {
      const h = parseInt(hour);
      const m = parseInt(minute);
      let timeString = `${this.numberToWords(h)}`;
      if (m > 0) {
        if (m < 10) {
          timeString += ` oh ${this.numberToWords(m)}`;
        } else {
          timeString += ` ${this.numberToWords(m)}`;
        }
      }
      timeString += ` ${ampm.toLowerCase()}`;
      return timeString;
    });

    // Measurements with units
    processed = processed.replace(/(\d+(?:\.\d+)?)\s*(km|m|cm|mm|kg|g|mg|l|ml)/gi, (match, num, unit) => {
      const units: Record<string, string> = {
        'km': 'kilometers',
        'm': 'meters',
        'cm': 'centimeters',
        'mm': 'millimeters',
        'kg': 'kilograms',
        'g': 'grams',
        'mg': 'milligrams',
        'l': 'liters',
        'ml': 'milliliters',
      };
      return `${this.numberToWords(num)} ${units[unit.toLowerCase()] || unit}`;
    });

    return processed;
  }

  private numberToWords(num: string | number): string {
    // Simplified number to words conversion
    // In production, use a proper library like number-to-words
    const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    
    if (isNaN(n)) return num.toString();
    
    // For now, just return the number as is
    // A full implementation would convert to words
    return n.toString();
  }
}

// Content Analysis Engine
class ContentAnalyzer {
  async analyze(text: string): Promise<TextMetadata> {
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const avgWordsPerMinute = 150; // Average TTS speed
    const estimatedDuration = Math.ceil((wordCount / avgWordsPerMinute) * 60 * 1000);

    return {
      language: this.detectLanguage(text),
      wordCount,
      estimatedDuration,
      hasCode: this.detectCode(text),
      hasMath: this.detectMath(text),
      hasUrls: this.detectUrls(text),
    };
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common patterns
    // In production, use a proper library
    const samples = text.slice(0, 1000);
    
    if (/[а-яА-Я]/.test(samples)) return 'ru';
    if (/[ä-üÄ-Ü]/.test(samples)) return 'de';
    if (/[à-ùÀ-Ù]/.test(samples)) return 'fr';
    if (/[ñáéíóú]/.test(samples)) return 'es';
    
    return 'en-US';
  }

  private detectCode(text: string): boolean {
    const codePatterns = [
      /```[\s\S]*?```/,
      /^\s{4,}\S/m,
      /\bfunction\s*\(/,
      /\bclass\s+\w+/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
    ];
    
    return codePatterns.some(pattern => pattern.test(text));
  }

  private detectMath(text: string): boolean {
    const mathPatterns = [
      /\$\$[\s\S]*?\$\$/,
      /\\\([\s\S]*?\\\)/,
      /\\\[[\s\S]*?\\\]/,
      /[∑∏∫∂√∞±≠≤≥]/,
    ];
    
    return mathPatterns.some(pattern => pattern.test(text));
  }

  private detectUrls(text: string): boolean {
    return /https?:\/\/[^\s]+/.test(text);
  }
}
```

### 2. Text Processing Settings Component

```typescript
// src/components/TextProcessingSettings.tsx
import React, { useState, useEffect } from 'react';
import { ProcessingOptions } from '../services/TextProcessor';
import { useStorage } from '../providers/StorageProvider';

export function TextProcessingSettings() {
  const { settings, updateSettings } = useStorage();
  const [options, setOptions] = useState<ProcessingOptions>({
    expandAbbreviations: true,
    processNumbers: true,
    handleUrls: 'domain',
    skipCodeBlocks: false,
    convertEmojis: true,
    preserveFormatting: true,
    language: 'en-US',
  });

  useEffect(() => {
    if (settings?.textProcessing) {
      setOptions(settings.textProcessing);
    }
  }, [settings]);

  const handleChange = (key: keyof ProcessingOptions, value: any) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    updateSettings({ textProcessing: newOptions });
  };

  return (
    <div className="text-processing-settings">
      <h2>Text Processing Options</h2>

      <div className="settings-group">
        <h3>Text Transformations</h3>
        
        <label className="setting-item">
          <input
            type="checkbox"
            checked={options.expandAbbreviations}
            onChange={(e) => handleChange('expandAbbreviations', e.target.checked)}
          />
          <span>Expand abbreviations (Dr. → Doctor)</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={options.processNumbers}
            onChange={(e) => handleChange('processNumbers', e.target.checked)}
          />
          <span>Process numbers and units ($100 → 100 dollars)</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={options.convertEmojis}
            onChange={(e) => handleChange('convertEmojis', e.target.checked)}
          />
          <span>Convert emojis to text (😀 → smiling face)</span>
        </label>
      </div>

      <div className="settings-group">
        <h3>URL Handling</h3>
        <select
          value={options.handleUrls}
          onChange={(e) => handleChange('handleUrls', e.target.value as 'full' | 'domain' | 'skip')}
        >
          <option value="full">Read full URLs</option>
          <option value="domain">Read domain only</option>
          <option value="skip">Skip URLs</option>
        </select>
      </div>

      <div className="settings-group">
        <h3>Special Content</h3>
        
        <label className="setting-item">
          <input
            type="checkbox"
            checked={options.skipCodeBlocks}
            onChange={(e) => handleChange('skipCodeBlocks', e.target.checked)}
          />
          <span>Skip code blocks</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={options.preserveFormatting}
            onChange={(e) => handleChange('preserveFormatting', e.target.checked)}
          />
          <span>Preserve text formatting</span>
        </label>
      </div>

      <div className="settings-group">
        <h3>Language</h3>
        <select
          value={options.language}
          onChange={(e) => handleChange('language', e.target.value)}
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="ru">Russian</option>
          <option value="ja">Japanese</option>
          <option value="zh">Chinese</option>
        </select>
      </div>
    </div>
  );
}
```

### 3. Text Processing Integration

```typescript
// src/hooks/useTextProcessor.ts
import { useState, useCallback } from 'react';
import { TextProcessor, ProcessedText, ProcessingOptions } from '../services/TextProcessor';
import { useStorage } from '../providers/StorageProvider';

export function useTextProcessor() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useStorage();
  
  const processor = TextProcessor.getInstance();

  const processText = useCallback(async (
    text: string,
    customOptions?: Partial<ProcessingOptions>
  ): Promise<ProcessedText | null> => {
    try {
      setProcessing(true);
      setError(null);

      const options = {
        ...settings?.textProcessing,
        ...customOptions,
      };

      const result = await processor.processText(text, options);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Text processing failed');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [processor, settings]);

  return {
    processText,
    processing,
    error,
  };
}
```

## Testing

### Unit Tests

```typescript
// src/services/__tests__/TextProcessor.test.ts
describe('TextProcessor', () => {
  let processor: TextProcessor;

  beforeEach(() => {
    processor = TextProcessor.getInstance();
  });

  describe('cleanText', () => {
    test('should decode HTML entities', async () => {
      const input = 'Hello &amp; welcome &lt;everyone&gt;';
      const result = await processor.processText(input);
      expect(result.processedText).toContain('Hello & welcome <everyone>');
    });

    test('should remove zero-width characters', async () => {
      const input = 'Hello\u200Bworld';
      const result = await processor.processText(input);
      expect(result.processedText).toBe('Helloworld');
    });
  });

  describe('sentence detection', () => {
    test('should handle abbreviations correctly', async () => {
      const input = 'Dr. Smith met Mrs. Johnson.';
      const result = await processor.processText(input);
      expect(result.sentences).toHaveLength(1);
    });

    test('should handle decimal numbers', async () => {
      const input = 'The temperature is 98.6 degrees.';
      const result = await processor.processText(input);
      expect(result.sentences).toHaveLength(1);
    });

    test('should detect multiple sentences', async () => {
      const input = 'First sentence. Second sentence! Third sentence?';
      const result = await processor.processText(input);
      expect(result.sentences).toHaveLength(3);
    });
  });

  describe('number processing', () => {
    test('should convert currency', async () => {
      const input = 'The price is $99.99';
      const result = await processor.processText(input, { processNumbers: true });
      expect(result.processedText).toContain('dollars');
    });

    test('should convert percentages', async () => {
      const input = 'Increase of 25%';
      const result = await processor.processText(input, { processNumbers: true });
      expect(result.processedText).toContain('percent');
    });
  });

  describe('URL handling', () => {
    test('should extract domain only', async () => {
      const input = 'Visit https://www.example.com/path/to/page';
      const result = await processor.processText(input, { handleUrls: 'domain' });
      expect(result.processedText).toContain('example.com');
      expect(result.processedText).not.toContain('/path/to/page');
    });

    test('should skip URLs entirely', async () => {
      const input = 'Visit https://www.example.com for more';
      const result = await processor.processText(input, { handleUrls: 'skip' });
      expect(result.processedText).toContain('[link]');
    });
  });
});
```

## Success Metrics

1. **Processing Performance**
   - Text processing time: < 100ms for 10KB
   - Memory usage: < 50MB for large texts
   - Sentence detection accuracy: > 99%

2. **Feature Effectiveness**
   - Abbreviation expansion accuracy: > 95%
   - Number conversion accuracy: > 98%
   - URL handling success: 100%

3. **User Satisfaction**
   - Natural sounding output: 90% positive feedback
   - Improved comprehension: Measurable increase
   - Reduced manual corrections: < 1%

## Dependencies

### Internal Dependencies
- Storage Service for settings
- TTS Controller for playback
- Error Handler for robust processing

### External Dependencies
- Unicode support libraries
- Potential NLP libraries for advanced features

## Risks and Mitigation

### High-Risk Items
1. **Language Detection Accuracy**
   - Risk: Incorrect language detection
   - Mitigation: User override option

2. **Processing Performance**
   - Risk: Slow processing for large texts
   - Mitigation: Streaming and chunking

### Medium-Risk Items
1. **Edge Cases in Text**
   - Risk: Unusual formatting breaks processing
   - Mitigation: Comprehensive test suite

2. **Memory Usage**
   - Risk: Large texts cause memory issues
   - Mitigation: Efficient streaming algorithms

## Acceptance Criteria

- [ ] HTML entities decoded correctly
- [ ] Sentence detection 99% accurate
- [ ] Abbreviations expanded properly
- [ ] Numbers converted naturally
- [ ] URLs handled per user preference
- [ ] Code blocks processed correctly
- [ ] Emojis converted to text
- [ ] Performance meets targets
- [ ] Settings persist and apply
- [ ] All tests pass with >90% coverage