import { SpeechSynthesizer } from '../../src/common/speech-synthesizer';

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string = '';
  voice: SpeechSynthesisVoice | null = null;
  rate: number = 1.0;
  pitch: number = 1.0;
  volume: number = 1.0;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text?: string) {
    if (text) this.text = text;
  }
}

// Mock speechSynthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn().mockReturnValue([]),
  speaking: false,
  paused: false,
  pending: false
};

// Setup globals
global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as any;
global.speechSynthesis = mockSpeechSynthesis as any;
global.window = { speechSynthesis: mockSpeechSynthesis } as any;

describe('SpeechSynthesizer - Rate Control', () => {
  let synthesizer: SpeechSynthesizer;

  beforeEach(() => {
    jest.clearAllMocks();
    synthesizer = new SpeechSynthesizer();
  });

  describe('Rate Setting', () => {
    test('should set rate within valid range', () => {
      expect(synthesizer.setRate(1.5)).toBe(true);
      expect(synthesizer.getSettings().rate).toBe(1.5);
      
      expect(synthesizer.setRate(0.5)).toBe(true);
      expect(synthesizer.getSettings().rate).toBe(0.5);
      
      expect(synthesizer.setRate(3.0)).toBe(true);
      expect(synthesizer.getSettings().rate).toBe(3.0);
    });

    test('should reject rate outside valid range', () => {
      expect(synthesizer.setRate(0.05)).toBe(false);
      expect(synthesizer.getSettings().rate).toBe(1.0); // Should remain default
      
      expect(synthesizer.setRate(11)).toBe(false);
      expect(synthesizer.getSettings().rate).toBe(1.0); // Should remain default
    });

    test('should apply rate to new utterances', async () => {
      synthesizer.setRate(2.0);
      
      // Mock the speak implementation to check utterance properties
      let capturedUtterance: MockSpeechSynthesisUtterance | null = null;
      mockSpeechSynthesis.speak.mockImplementation((utterance) => {
        capturedUtterance = utterance;
        // Simulate immediate completion
        if (utterance.onstart) utterance.onstart();
        if (utterance.onend) utterance.onend();
      });

      await synthesizer.speak('Test text');
      
      expect(capturedUtterance).not.toBeNull();
      expect(capturedUtterance!.rate).toBe(2.0);
    });
  });

  describe('Dynamic Rate Changes', () => {
    test('should track utterance start time', async () => {
      let capturedUtterance: MockSpeechSynthesisUtterance | null = null;
      mockSpeechSynthesis.speak.mockImplementation((utterance) => {
        capturedUtterance = utterance;
        // Simulate async start and end
        setTimeout(() => {
          if (utterance.onstart) utterance.onstart();
          setTimeout(() => {
            if (utterance.onend) utterance.onend();
          }, 10);
        }, 0);
      });

      await synthesizer.speak('Test text');
      
      // utteranceStartTime should be set when utterance starts
      expect(synthesizer['utteranceStartTime']).toBeGreaterThan(0);
    });

    test('should apply rate immediately to new speech', async () => {
      synthesizer.setRate(2.0);
      
      // Mock utterance with known text
      const testText = 'This is a test utterance';
      let capturedUtterance: MockSpeechSynthesisUtterance | null = null;
      mockSpeechSynthesis.speak.mockImplementation((utterance) => {
        capturedUtterance = utterance;
        synthesizer['currentUtterance'] = utterance as any;
        synthesizer['isPlaying'] = true;
        // Simulate async start and end
        setTimeout(() => {
          if (utterance.onstart) utterance.onstart();
          setTimeout(() => {
            if (utterance.onend) utterance.onend();
          }, 10);
        }, 0);
      });

      await synthesizer.speak(testText);
      
      // The utterance should have the correct rate applied
      expect(capturedUtterance).not.toBeNull();
      expect(capturedUtterance!.rate).toBe(2.0);
      expect(synthesizer.getSettings().rate).toBe(2.0);
    });

    test('should handle rate change during playback', async () => {
      // Reset last rate change time to ensure test doesn't hit cooldown
      synthesizer['lastRateChangeTime'] = 0;
      
      // Start speaking
      let firstUtterance: MockSpeechSynthesisUtterance | null = null;
      mockSpeechSynthesis.speak.mockImplementation((utterance) => {
        if (!firstUtterance) {
          firstUtterance = utterance;
          synthesizer['currentUtterance'] = utterance as any;
          synthesizer['isPlaying'] = true;
          synthesizer['isPaused'] = false;
          // Simulate async start and end
          setTimeout(() => {
            if (utterance.onstart) utterance.onstart();
            setTimeout(() => {
              if (utterance.onend) utterance.onend();
            }, 50);
          }, 0);
        }
      });

      await synthesizer.speak('This is a long test utterance for rate changes');
      
      // Clear mock for next call
      mockSpeechSynthesis.speak.mockClear();
      
      // Change rate while playing - this should trigger rate change logic
      let resumedUtterance: MockSpeechSynthesisUtterance | null = null;
      mockSpeechSynthesis.speak.mockImplementation((utterance) => {
        resumedUtterance = utterance;
        // Simulate async start and end for resumed speech
        setTimeout(() => {
          if (utterance.onstart) utterance.onstart();
          setTimeout(() => {
            if (utterance.onend) utterance.onend();
          }, 10);
        }, 0);
      });
      
      synthesizer.setRate(2.0);
      
      // Wait for async rate change operations
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // The rate should be updated regardless of whether cancel was called
      expect(synthesizer.getSettings().rate).toBe(2.0);
    });
  });

  describe('Integration with Playback', () => {
    test('should maintain rate across pause/resume', () => {
      synthesizer.setRate(1.5);
      
      synthesizer['isPlaying'] = true;
      synthesizer['isPaused'] = false;
      
      // Pause
      synthesizer.pause();
      expect(synthesizer.getSettings().rate).toBe(1.5);
      
      // Resume
      synthesizer.resume();
      expect(synthesizer.getSettings().rate).toBe(1.5);
    });

    test('should apply rate to chunked text', async () => {
      synthesizer.setRate(1.25);
      
      const capturedUtterances: MockSpeechSynthesisUtterance[] = [];
      mockSpeechSynthesis.speak.mockImplementation((utterance) => {
        capturedUtterances.push(utterance);
        // Simulate completion
        if (utterance.onstart) utterance.onstart();
        if (utterance.onend) utterance.onend();
      });

      // Text that will be chunked (need to exceed chunkText maxChunkSize of 200)
      const longText = 'A'.repeat(250) + '. ' + 'B'.repeat(250); // Will create multiple chunks
      await synthesizer.speak(longText);
      
      // All chunks should have the same rate
      expect(capturedUtterances.length).toBeGreaterThan(1);
      capturedUtterances.forEach(utterance => {
        expect(utterance.rate).toBe(1.25);
      });
    });
  });
});