import { MessageType } from '../src/common/types/messages';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: jest.fn(),
    },
  },
};

// Set up Chrome mock globally
(global as any).chrome = mockChrome;

describe('TTS Feedback in Content Script', () => {
  let messageListener: (request: any, sender: any, sendResponse: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock document methods on existing global
    global.document.addEventListener = jest.fn();
    global.document.createElement = jest.fn(() => ({
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
      parentNode: null,
      style: { cssText: '' },
      textContent: '',
      className: '',
    }));
    global.document.body = global.document.body || {};
    global.document.body.appendChild = jest.fn();
    global.document.head = global.document.head || {};
    global.document.head.appendChild = jest.fn();
    
    // Mock window.getSelection
    (global as any).window = global.window || {};
    global.window.getSelection = jest.fn(() => ({
      toString: jest.fn(() => ''),
      rangeCount: 0,
    }));
    global.window.location = { href: 'https://example.com' };
    
    // Import and initialize TextSelectionHandler after mocks are set
    jest.isolateModules(() => {
      const { TextSelectionHandler } = require('../src/content/index');
      new TextSelectionHandler();
    });
    
    // Capture the message listener
    messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('TTS Feedback Message Handling', () => {
    test('should handle TTS_FEEDBACK message type', () => {
      const sendResponse = jest.fn();
      
      messageListener(
        {
          type: MessageType.TTS_FEEDBACK,
          payload: { status: 'started' }
        },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should create notification element for TTS feedback', () => {
      const sendResponse = jest.fn();
      
      messageListener(
        {
          type: MessageType.TTS_FEEDBACK,
          payload: { status: 'started' }
        },
        {},
        sendResponse
      );

      // Check notification was created
      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(global.document.body.appendChild).toHaveBeenCalled();
    });

    test('should show different messages for different statuses', () => {
      const testCases = [
        { status: 'started', expectedText: '🔊 TTS Started' },
        { status: 'no-selection', expectedText: '⚠️ No text selected' },
        { status: 'invalid-text', expectedText: '❌ Invalid text for TTS' },
        { status: 'communication-error', expectedText: '🔌 Communication error' },
        { status: 'error', expectedText: '❌ TTS Error' },
        { status: 'unknown', expectedText: '❌ TTS Error' }, // default case
      ];

      testCases.forEach(({ status, expectedText }) => {
        jest.clearAllMocks();
        
        const sendResponse = jest.fn();
        messageListener(
          {
            type: MessageType.TTS_FEEDBACK,
            payload: { status }
          },
          {},
          sendResponse
        );

        const notification = (global.document.body.appendChild as jest.Mock).mock.calls[0][0];
        expect(notification.textContent).toBe(expectedText);
      });
    });

    test('should apply correct CSS classes based on status', () => {
      const testCases = [
        { status: 'started', expectedClass: 'tts-notification-success' },
        { status: 'no-selection', expectedClass: 'tts-notification-warning' },
        { status: 'invalid-text', expectedClass: 'tts-notification-error' },
        { status: 'communication-error', expectedClass: 'tts-notification-error' },
      ];

      testCases.forEach(({ status, expectedClass }) => {
        jest.clearAllMocks();
        
        messageListener(
          {
            type: MessageType.TTS_FEEDBACK,
            payload: { status }
          },
          {},
          jest.fn()
        );

        const notification = (global.document.body.appendChild as jest.Mock).mock.calls[0][0];
        expect(notification.className).toContain(expectedClass);
      });
    });
  });

  describe('Notification Animation', () => {
    test('should add show class after delay', () => {
      messageListener(
        {
          type: MessageType.TTS_FEEDBACK,
          payload: { status: 'started' }
        },
        {},
        jest.fn()
      );

      const notification = (global.document.body.appendChild as jest.Mock).mock.calls[0][0];
      
      // Initially no show class
      expect(notification.classList.add).not.toHaveBeenCalled();
      
      // After 10ms delay
      jest.advanceTimersByTime(10);
      expect(notification.classList.add).toHaveBeenCalledWith('tts-notification-show');
    });

    test('should remove notification after timeout', () => {
      messageListener(
        {
          type: MessageType.TTS_FEEDBACK,
          payload: { status: 'started' }
        },
        {},
        jest.fn()
      );

      const notification = (global.document.body.appendChild as jest.Mock).mock.calls[0][0];
      notification.parentNode = { removeChild: jest.fn() };
      
      // Show animation
      jest.advanceTimersByTime(10);
      
      // Hide after 3 seconds
      jest.advanceTimersByTime(3000);
      expect(notification.classList.remove).toHaveBeenCalledWith('tts-notification-show');
      
      // Remove after fade out animation (300ms)
      jest.advanceTimersByTime(300);
      expect(notification.parentNode.removeChild).toHaveBeenCalledWith(notification);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing payload gracefully', () => {
      const sendResponse = jest.fn();
      
      // Should not throw
      expect(() => {
        messageListener(
          {
            type: MessageType.TTS_FEEDBACK,
            // No payload
          },
          {},
          sendResponse
        );
      }).not.toThrow();

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should not throw if notification already removed', () => {
      messageListener(
        {
          type: MessageType.TTS_FEEDBACK,
          payload: { status: 'started' }
        },
        {},
        jest.fn()
      );

      const notification = (global.document.body.appendChild as jest.Mock).mock.calls[0][0];
      notification.parentNode = null; // Already removed
      
      // Should not throw
      expect(() => {
        jest.runAllTimers();
      }).not.toThrow();
    });
  });
});