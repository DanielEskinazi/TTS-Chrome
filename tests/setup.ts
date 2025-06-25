// Jest test setup file
// Add any global test configuration here

// Mock Chrome APIs for testing
Object.assign(global, {
  chrome: {
    runtime: {
      onInstalled: {
        addListener: jest.fn(),
      },
      onMessage: {
        addListener: jest.fn(),
      },
      sendMessage: jest.fn(),
    },
    action: {
      onClicked: {
        addListener: jest.fn(),
      },
    },
    tts: {
      speak: jest.fn(),
      stop: jest.fn(),
      getVoices: jest.fn(),
    },
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
      },
      sync: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
    contextMenus: {
      create: jest.fn(),
      onClicked: {
        addListener: jest.fn(),
      },
    },
  },
});