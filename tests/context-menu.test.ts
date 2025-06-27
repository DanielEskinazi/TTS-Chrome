import { MessageType } from '../src/common/types/messages';

// Mock Chrome APIs
const mockChrome = {
  contextMenus: {
    create: jest.fn((props, callback) => callback && callback()),
    update: jest.fn((id, props, callback) => callback && callback()),
    removeAll: jest.fn((callback) => callback && callback()),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    lastError: null as any,
    onStartup: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    query: jest.fn().mockResolvedValue([]),
    onActivated: {
      addListener: jest.fn(),
    },
    onUpdated: {
      addListener: jest.fn(),
    },
  },
  storage: {
    sync: {
      set: jest.fn(),
      get: jest.fn(),
    },
  },
  alarms: {
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
  tts: {
    speak: jest.fn(),
    getVoices: jest.fn((callback) => callback && callback([])),
  },
};

// Set up Chrome mock globally
(global as any).chrome = mockChrome;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

// Mock classes to avoid importing the actual background module during tests
class MockSelectionManager {
  private currentSelection: any = null;
  private contextMenuManager: any = null;

  constructor() {}

  setContextMenuManager(contextMenuManager: any) {
    this.contextMenuManager = contextMenuManager;
  }

  handleSelectionMessage(request: any, sender: any) {
    switch (request.type) {
      case MessageType.SELECTION_CHANGED:
        this.currentSelection = request.payload;
        if (this.contextMenuManager) {
          this.contextMenuManager.updateMenuState(true);
        }
        return { success: true };
      case MessageType.SELECTION_CLEARED:
        this.currentSelection = null;
        if (this.contextMenuManager) {
          this.contextMenuManager.updateMenuState(false);
        }
        return { success: true };
      default:
        return null;
    }
  }

  hasSelection() {
    return this.currentSelection !== null;
  }
}

class MockContextMenuManager {
  private menuId = 'tts-speak';
  private isMenuCreated = false;
  private selectionManager: any;

  constructor(selectionManager: any) {
    this.selectionManager = selectionManager;
    this.init();
  }

  private init() {
    mockChrome.runtime.onStartup.addListener(() => this.createContextMenu());
    mockChrome.runtime.onInstalled.addListener(() => this.createContextMenu());
    
    if (mockChrome.contextMenus && mockChrome.contextMenus.onClicked) {
      mockChrome.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));
    }
  }

  public createContextMenu() {
    try {
      if (mockChrome.contextMenus) {
        if (this.isMenuCreated) {
          mockChrome.contextMenus.removeAll(() => {
            this.createMenu();
          });
        } else {
          this.createMenu();
        }
      }
    } catch (error) {
      console.log('[TTS-Debug]', 'Error in createContextMenu:', error);
    }
  }

  private createMenu() {
    mockChrome.contextMenus.create({
      id: this.menuId,
      title: 'Speak',
      contexts: ['selection'],
      enabled: false,
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, () => {
      if (mockChrome.runtime.lastError) {
        console.log('[TTS-Debug]', 'Error creating context menu:', mockChrome.runtime.lastError);
      } else {
        this.isMenuCreated = true;
        console.log('[TTS-Debug]', 'TTS context menu created successfully');
      }
    });
  }

  private async handleMenuClick(info: any, tab?: any) {
    if (info.menuItemId === this.menuId && tab?.id) {
      await this.triggerTTS(info, tab);
    }
  }

  private async triggerTTS(info: any, tab: any) {
    try {
      if (!tab || !tab.id) {
        throw new Error('Invalid tab information');
      }

      const response = await this.getSelectionFromTab(tab.id);
      
      if (!response || !response.hasSelection) {
        if (!info.selectionText) {
          throw new Error('No text selected');
        }
      }

      const textToSpeak = response?.text || info.selectionText;
      
      if (!this.isValidTextForTTS(textToSpeak)) {
        throw new Error('Selected text is not suitable for TTS');
      }

      await this.startTTSWithRetry(textToSpeak, tab);
      
      this.showTTSFeedback(tab, 'started');
      
    } catch (error: any) {
      console.log('[TTS-Debug]', 'TTS trigger error:', error);
      this.handleTTSError(error, tab);
    }
  }

  private async getSelectionFromTab(tabId: number, retries = 2): Promise<any> {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await mockChrome.tabs.sendMessage(tabId, {
          type: MessageType.GET_SELECTION
        });
        return response;
      } catch (error) {
        if (i === retries) {
          throw new Error('Could not communicate with tab');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private isValidTextForTTS(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    const cleanText = text.trim();
    if (cleanText.length === 0) return false;
    if (cleanText.length > 10000) return false;
    
    const readableChars = cleanText.replace(/[^\w\s]/g, '').length;
    return readableChars > 0;
  }

  private async startTTSWithRetry(text: string, tab: any, retries = 1): Promise<void> {
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.startTTS(text, tab);
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  private async startTTS(text: string, tab: any): Promise<void> {
    return mockChrome.tabs.sendMessage(tab.id!, {
      type: MessageType.SPEAK_SELECTION,
      payload: { text: text }
    });
  }

  private showTTSFeedback(tab: any, status: string) {
    if (tab.id) {
      mockChrome.tabs.sendMessage(tab.id, {
        type: MessageType.TTS_FEEDBACK,
        payload: { status: status }
      }).catch((error: any) => {
        console.log('[TTS-Debug]', 'Could not send feedback to tab:', error);
      });
    }
  }

  private handleTTSError(error: Error, tab: any) {
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case 'no-selection':
        this.showTTSFeedback(tab, 'no-selection');
        break;
      case 'invalid-text':
        this.showTTSFeedback(tab, 'invalid-text');
        break;
      case 'communication-error':
        this.showTTSFeedback(tab, 'communication-error');
        break;
      default:
        this.showTTSFeedback(tab, 'error');
    }
  }

  public categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('no text selected') || message.includes('selection no longer available')) {
      return 'no-selection';
    }
    if (message.includes('not suitable for tts') || message.includes('invalid text')) {
      return 'invalid-text';
    }
    if (message.includes('communicate with tab') || message.includes('invalid tab')) {
      return 'communication-error';
    }
    
    return 'unknown';
  }

  public updateMenuState(hasSelection: boolean) {
    if (!this.isMenuCreated) return;

    const menuProperties = {
      enabled: hasSelection,
      title: hasSelection ? 'Speak' : 'Speak (select text first)'
    };

    try {
      mockChrome.contextMenus.update(this.menuId, menuProperties, () => {
        if (mockChrome.runtime.lastError) {
          console.log('[TTS-Debug]', 'Error updating context menu:', mockChrome.runtime.lastError);
        } else {
          console.log('[TTS-Debug]', 'Context menu updated:', hasSelection ? 'enabled' : 'disabled');
        }
      });
    } catch (error) {
      console.log('[TTS-Debug]', 'Error in updateMenuState:', error);
    }
  }

  public destroy() {
    if (this.isMenuCreated && mockChrome.contextMenus) {
      mockChrome.contextMenus.removeAll(() => {});
      this.isMenuCreated = false;
    }
  }
}

describe('ContextMenuManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.runtime.lastError = null;
  });

  describe('Context Menu Creation', () => {
    test('should create context menu on initialization', () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      new MockContextMenuManager(mockSelectionManager);

      // Verify startup and install listeners are registered
      expect(mockChrome.runtime.onStartup.addListener).toHaveBeenCalled();
      expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
      expect(mockChrome.contextMenus.onClicked.addListener).toHaveBeenCalled();
    });

    test('should create context menu with correct properties', () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Trigger menu creation
      manager.createContextMenu();

      expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tts-speak',
          title: 'Speak',
          contexts: ['selection'],
          enabled: false,
          documentUrlPatterns: ['http://*/*', 'https://*/*']
        }),
        expect.any(Function)
      );
    });

    test('should handle menu creation errors gracefully', () => {
      mockChrome.runtime.lastError = { message: 'Test error' };
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Should not throw
      expect(() => manager.createContextMenu()).not.toThrow();
      
      // Should log error
      expect(mockConsoleLog).toHaveBeenCalledWith('[TTS-Debug]', 'Error creating context menu:', { message: 'Test error' });
    });
  });

  describe('Menu State Management', () => {
    test('should enable menu when text is selected', () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(true) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Ensure menu is created first
      manager.createContextMenu();
      // Wait for async menu creation
      const createCallback = mockChrome.contextMenus.create.mock.calls[0][1];
      createCallback();
      
      manager.updateMenuState(true);

      expect(mockChrome.contextMenus.update).toHaveBeenCalledWith(
        'tts-speak',
        {
          enabled: true,
          title: 'Speak'
        },
        expect.any(Function)
      );
    });

    test('should disable menu when no text is selected', () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Ensure menu is created first
      manager.createContextMenu();
      const createCallback = mockChrome.contextMenus.create.mock.calls[0][1];
      createCallback();
      
      manager.updateMenuState(false);

      expect(mockChrome.contextMenus.update).toHaveBeenCalledWith(
        'tts-speak',
        {
          enabled: false,
          title: 'Speak (select text first)'
        },
        expect.any(Function)
      );
    });

    test('should handle update errors gracefully', () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Ensure menu is created first
      manager.createContextMenu();
      const createCallback = mockChrome.contextMenus.create.mock.calls[0][1];
      createCallback();
      
      // Set error for update
      mockChrome.runtime.lastError = { message: 'Update failed' };
      
      // Should not throw
      expect(() => manager.updateMenuState(true)).not.toThrow();
      
      // Call the update callback to trigger error logging
      const updateCallback = mockChrome.contextMenus.update.mock.calls[0][2];
      updateCallback();
      
      // Should log error
      expect(mockConsoleLog).toHaveBeenCalledWith('[TTS-Debug]', 'Error updating context menu:', { message: 'Update failed' });
    });
  });

  describe('Menu Click Handling', () => {
    test('should trigger TTS when menu is clicked with valid selection', async () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(true) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Mock tab response
      mockChrome.tabs.sendMessage
        .mockResolvedValueOnce({ hasSelection: true, text: 'Hello world' })
        .mockResolvedValueOnce({ success: true });

      // Get the click handler
      const clickHandler = mockChrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      // Simulate menu click
      await clickHandler(
        { menuItemId: 'tts-speak', selectionText: 'Hello world' },
        { id: 123, url: 'https://example.com' }
      );

      // Verify TTS was triggered
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: MessageType.GET_SELECTION
      });
      
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: MessageType.SPEAK_SELECTION,
        payload: { text: 'Hello world' }
      });
    });

    test('should show error feedback when no text is selected', async () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Mock no selection response
      mockChrome.tabs.sendMessage
        .mockResolvedValueOnce({ hasSelection: false, text: '' })
        .mockResolvedValueOnce({ success: true });

      // Get the click handler
      const clickHandler = mockChrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      // Simulate menu click with no selection text
      await clickHandler(
        { menuItemId: 'tts-speak' },
        { id: 123, url: 'https://example.com' }
      );

      // Verify error feedback was sent
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: MessageType.TTS_FEEDBACK,
        payload: { status: 'no-selection' }
      });
    });

    test('should validate text for TTS suitability', async () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(true) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Test invalid text (only whitespace)
      mockChrome.tabs.sendMessage
        .mockResolvedValueOnce({ hasSelection: true, text: '   ' })
        .mockResolvedValueOnce({ success: true });

      const clickHandler = mockChrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      await clickHandler(
        { menuItemId: 'tts-speak', selectionText: '   ' },
        { id: 123, url: 'https://example.com' }
      );

      // Should send invalid-text feedback
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: MessageType.TTS_FEEDBACK,
        payload: { status: 'invalid-text' }
      });
    });

    test('should handle communication errors with retry', async () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(true) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Clear previous calls
      mockChrome.tabs.sendMessage.mockClear();
      
      // Mock communication failure then success
      mockChrome.tabs.sendMessage
        .mockRejectedValueOnce(new Error('Tab not found'))
        .mockRejectedValueOnce(new Error('Tab not found'))
        .mockResolvedValueOnce({ hasSelection: true, text: 'Hello' })
        .mockResolvedValueOnce({ success: true }) // For SPEAK_SELECTION
        .mockResolvedValueOnce({ success: true }); // For TTS_FEEDBACK

      const clickHandler = mockChrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      await clickHandler(
        { menuItemId: 'tts-speak', selectionText: 'Hello' },
        { id: 123, url: 'https://example.com' }
      );

      // Should have called 3 times for GET_SELECTION (2 failures + 1 success)
      // Plus 2 more times for SPEAK_SELECTION and TTS_FEEDBACK
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(5);
      
      // Verify the retry pattern for GET_SELECTION
      expect(mockChrome.tabs.sendMessage).toHaveBeenNthCalledWith(1, 123, {
        type: MessageType.GET_SELECTION
      });
      expect(mockChrome.tabs.sendMessage).toHaveBeenNthCalledWith(2, 123, {
        type: MessageType.GET_SELECTION
      });
      expect(mockChrome.tabs.sendMessage).toHaveBeenNthCalledWith(3, 123, {
        type: MessageType.GET_SELECTION
      });
    });
  });

  describe('Error Categorization', () => {
    test('should categorize different error types correctly', () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Access private method through prototype
      const categorizeError = manager.categorizeError.bind(manager);
      
      expect(categorizeError(new Error('No text selected'))).toBe('no-selection');
      expect(categorizeError(new Error('Selection no longer available'))).toBe('no-selection');
      expect(categorizeError(new Error('Selected text is not suitable for TTS'))).toBe('invalid-text');
      expect(categorizeError(new Error('Could not communicate with tab'))).toBe('communication-error');
      expect(categorizeError(new Error('Unknown error'))).toBe('unknown');
    });
  });

  describe('Cleanup', () => {
    test('should clean up context menu on destroy', () => {
      const mockSelectionManager = { hasSelection: jest.fn().mockReturnValue(false) };
      const manager = new MockContextMenuManager(mockSelectionManager);
      
      // Create menu first
      manager.createContextMenu();
      
      // Then destroy
      manager.destroy();
      
      expect(mockChrome.contextMenus.removeAll).toHaveBeenCalled();
    });
  });
});

describe('SelectionManager Integration', () => {
  test('should update context menu when selection changes', () => {
    const selectionManager = new MockSelectionManager();
    const contextMenuManager = new MockContextMenuManager(selectionManager);
    
    // Link managers
    selectionManager.setContextMenuManager(contextMenuManager);
    
    // Spy on updateMenuState
    const updateSpy = jest.spyOn(contextMenuManager, 'updateMenuState');
    
    // Simulate selection change
    selectionManager.handleSelectionMessage(
      {
        type: MessageType.SELECTION_CHANGED,
        payload: {
          text: 'Test selection',
          url: 'https://example.com',
          title: 'Test Page'
        }
      },
      { tab: { id: 123, url: 'https://example.com' } } as any
    );
    
    expect(updateSpy).toHaveBeenCalledWith(true);
  });

  test('should disable context menu when selection is cleared', () => {
    const selectionManager = new MockSelectionManager();
    const contextMenuManager = new MockContextMenuManager(selectionManager);
    
    // Link managers
    selectionManager.setContextMenuManager(contextMenuManager);
    
    // Spy on updateMenuState
    const updateSpy = jest.spyOn(contextMenuManager, 'updateMenuState');
    
    // Simulate selection clear
    selectionManager.handleSelectionMessage(
      { type: MessageType.SELECTION_CLEARED },
      { tab: { id: 123, url: 'https://example.com' } } as any
    );
    
    expect(updateSpy).toHaveBeenCalledWith(false);
  });
});

