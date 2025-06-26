import { MessageType } from '@common/types/messages';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    onActivated: {
      addListener: jest.fn(),
    },
    onUpdated: {
      addListener: jest.fn(),
    },
  },
  contextMenus: {
    update: jest.fn(),
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Mock window.getSelection
const mockSelection = {
  toString: jest.fn(),
  rangeCount: 0,
  getRangeAt: jest.fn(),
  anchorNode: null,
  anchorOffset: 0,
  direction: 'forward',
  focusNode: null,
  focusOffset: 0,
  isCollapsed: false,
  type: 'Range',
  addRange: jest.fn(),
  collapse: jest.fn(),
  collapseToEnd: jest.fn(),
  collapseToStart: jest.fn(),
  containsNode: jest.fn(),
  deleteFromDocument: jest.fn(),
  empty: jest.fn(),
  extend: jest.fn(),
  getComposedRanges: jest.fn(),
  modify: jest.fn(),
  removeAllRanges: jest.fn(),
  removeRange: jest.fn(),
  selectAllChildren: jest.fn(),
  setBaseAndExtent: jest.fn(),
  setPosition: jest.fn(),
} as unknown as Selection;

const mockGetSelection = jest.fn().mockReturnValue(mockSelection);
Object.defineProperty(window, 'getSelection', {
  value: mockGetSelection,
  writable: true,
});

// Mock document for event listeners
Object.defineProperty(document, 'addEventListener', {
  value: jest.fn(),
  writable: true,
});

// Mock devLog before importing
jest.mock('@common/dev-utils', () => ({
  devLog: jest.fn(),
}));

import { TextSelectionHandler } from '../src/content/index';

describe('Text Selection Handler', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    (mockSelection.toString as jest.Mock).mockReturnValue('');
    (mockSelection as any).rangeCount = 0;
  });

  describe('Selection validation', () => {
    test('should reject empty selections', () => {
      const handler = new TextSelectionHandler();
      
      expect(handler.testIsValidSelection('')).toBe(false);
      expect(handler.testIsValidSelection('   ')).toBe(false);
      expect(handler.testIsValidSelection('\n\t\r')).toBe(false);
    });

    test('should accept valid text selections', () => {
      const handler = new TextSelectionHandler();
      
      expect(handler.testIsValidSelection('Hello World')).toBe(true);
      expect(handler.testIsValidSelection('This is a test sentence.')).toBe(true);
    });

    test('should reject overly long selections', () => {
      const handler = new TextSelectionHandler();
      const longText = 'a'.repeat(5001);
      
      expect(handler.testIsValidSelection(longText)).toBe(false);
    });

    test('should accept selections with special characters', () => {
      const handler = new TextSelectionHandler();
      
      expect(handler.testIsValidSelection('Hello, World! 123')).toBe(true);
      expect(handler.testIsValidSelection('Test with émojis 🚀')).toBe(true);
    });
  });

  describe('Text cleaning', () => {
    test('should normalize whitespace', () => {
      const handler = new TextSelectionHandler();
      
      const dirtyText = '  Hello\n\tWorld  \r\n  ';
      const cleanText = handler.testCleanSelectionText(dirtyText);
      
      expect(cleanText).toBe('Hello World');
    });

    test('should handle multiple spaces', () => {
      const handler = new TextSelectionHandler();
      
      const dirtyText = 'Hello    World     Test';
      const cleanText = handler.testCleanSelectionText(dirtyText);
      
      expect(cleanText).toBe('Hello World Test');
    });

    test('should handle mixed line breaks', () => {
      const handler = new TextSelectionHandler();
      
      const dirtyText = 'Line 1\nLine 2\r\nLine 3\rLine 4';
      const cleanText = handler.testCleanSelectionText(dirtyText);
      
      expect(cleanText).toBe('Line 1 Line 2 Line 3 Line 4');
    });
  });

  describe('Selection environment validation', () => {
    test('should validate proper environment', () => {
      const handler = new TextSelectionHandler();
      
      expect(handler.testValidateSelectionEnvironment()).toBe(true);
    });

    test('should handle missing getSelection API', () => {
      const originalGetSelection = window.getSelection;
      // @ts-ignore
      delete window.getSelection;
      
      const handler = new TextSelectionHandler();
      expect(handler.testValidateSelectionEnvironment()).toBe(false);
      
      // Restore
      window.getSelection = originalGetSelection;
    });
  });

  describe('Error handling', () => {
    test('should handle getSelection errors gracefully', () => {
      mockGetSelection.mockImplementation(() => {
        throw new Error('Selection API error');
      });

      const handler = new TextSelectionHandler();
      const result = handler.testSafeGetSelection();
      
      expect(result).toBeNull();
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.SELECTION_ERROR,
        })
      );
    });

    test('should handle selection change errors', () => {
      (mockSelection.toString as jest.Mock).mockImplementation(() => {
        throw new Error('toString error');
      });
      (mockSelection as any).rangeCount = 1;

      const handler = new TextSelectionHandler();
      handler.testHandleSelectionChange();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.SELECTION_ERROR,
        })
      );
    });
  });

  describe('Message handling', () => {
    test('should respond to GET_SELECTION requests', () => {
      const handler = new TextSelectionHandler();
      const mockSendResponse = jest.fn();
      
      handler.testHandleMessage(
        { type: MessageType.GET_SELECTION },
        {},
        mockSendResponse
      );
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        text: '',
        hasSelection: false,
        info: null,
      });
    });

    test('should handle CLEAR_SELECTION requests', () => {
      const handler = new TextSelectionHandler();
      const mockSendResponse = jest.fn();
      
      handler.testHandleMessage(
        { type: MessageType.CLEAR_SELECTION },
        {},
        mockSendResponse
      );
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Selection state management', () => {
    test('should track selection state correctly', () => {
      const handler = new TextSelectionHandler();
      
      expect(handler.getCurrentSelection().isActive).toBe(false);
      expect(handler.getSelectedText()).toBe('');
      
      // Simulate valid selection
      (mockSelection.toString as jest.Mock).mockReturnValue('Test selection');
      (mockSelection as any).rangeCount = 1;
      (mockSelection.getRangeAt as jest.Mock).mockReturnValue({
        getBoundingClientRect: () => ({
          top: 100,
          left: 200,
          width: 150,
          height: 20,
        }),
      });
      
      handler.testValidateAndStoreSelection('Test selection', mockSelection);
      
      expect(handler.getCurrentSelection().isActive).toBe(true);
      expect(handler.getSelectedText()).toBe('Test selection');
    });

    test('should clear selection state', () => {
      const handler = new TextSelectionHandler();
      
      // Set up initial selection
      handler.testValidateAndStoreSelection('Test selection', mockSelection);
      expect(handler.getCurrentSelection().isActive).toBe(true);
      
      // Clear selection
      handler.testClearSelection();
      
      expect(handler.getCurrentSelection().isActive).toBe(false);
      expect(handler.getSelectedText()).toBe('');
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.SELECTION_CLEARED,
      });
    });
  });
});

describe('Selection Manager (Background)', () => {
  let SelectionManager: any;

  beforeAll(() => {
    // Import SelectionManager from background script
    // Note: This would need the background script to export the class
    // For now, we'll test the interface
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Message handling', () => {
    test('should handle SELECTION_CHANGED messages', () => {
      // Test implementation would go here
      // This would test the SelectionManager's handleSelectionMessage method
    });

    test('should handle SELECTION_CLEARED messages', () => {
      // Test implementation would go here
    });

    test('should handle GET_SELECTION requests', () => {
      // Test implementation would go here
    });
  });

  describe('Context menu integration', () => {
    test('should update context menu state on selection change', () => {
      // Test implementation would go here
    });

    test('should disable context menu when no selection', () => {
      // Test implementation would go here
    });
  });

  describe('Tab management', () => {
    test('should clear selection on tab change', () => {
      // Test implementation would go here
    });

    test('should clear selection on page reload', () => {
      // Test implementation would go here
    });
  });
});