import { SpeedManager } from '../../src/background/speedManager';

// Mock chrome storage API
const mockStorage = new Map();
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys) => {
        const result: any = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (mockStorage.has(key)) {
              result[key] = mockStorage.get(key);
            }
          });
        }
        return Promise.resolve(result);
      }),
      set: jest.fn((items) => {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value);
        });
        return Promise.resolve();
      })
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ url: 'https://example.com' }])
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(null)
  }
} as any;

describe('SpeedManager', () => {
  let speedManager: SpeedManager;

  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
    speedManager = new SpeedManager();
  });

  describe('Speed Validation', () => {
    test('should validate speed within range', () => {
      expect(speedManager['validateSpeed'](0.3)).toBe(0.5);
      expect(speedManager['validateSpeed'](1.5)).toBe(1.5);
      expect(speedManager['validateSpeed'](5.0)).toBe(3.0);
    });

    test('should format speed correctly', () => {
      expect(speedManager.formatSpeed(1.0)).toBe('1.0x');
      expect(speedManager.formatSpeed(1.5)).toBe('1.5x');
      expect(speedManager.formatSpeed(2.25)).toBe('2.3x');
    });
  });

  describe('Speed Adjustment', () => {
    test('should increment speed correctly', async () => {
      speedManager['currentSpeed'] = 1.0;
      
      await speedManager.incrementSpeed();
      expect(speedManager.getCurrentSpeed()).toBe(1.1);
      
      speedManager['currentSpeed'] = 2.95;
      await speedManager.incrementSpeed();
      expect(speedManager.getCurrentSpeed()).toBe(3.0); // Should cap at max
    });

    test('should decrement speed correctly', async () => {
      speedManager['currentSpeed'] = 1.0;
      
      await speedManager.decrementSpeed();
      expect(speedManager.getCurrentSpeed()).toBe(0.9);
      
      speedManager['currentSpeed'] = 0.55;
      await speedManager.decrementSpeed();
      expect(speedManager.getCurrentSpeed()).toBe(0.5); // Should cap at min
    });

    test('should set preset speeds', async () => {
      const presetSpeeds = [0.75, 1.0, 1.25, 1.5, 2.0];
      
      for (let i = 0; i < presetSpeeds.length; i++) {
        await speedManager.setPresetSpeed(i);
        expect(speedManager.getCurrentSpeed()).toBe(presetSpeeds[i]);
      }
    });

    test('should reset speed to 1.0x', async () => {
      speedManager['currentSpeed'] = 2.5;
      
      await speedManager.resetSpeed();
      expect(speedManager.getCurrentSpeed()).toBe(1.0);
    });
  });

  describe('Speed Persistence', () => {
    test('should save and restore speed preferences', async () => {
      await speedManager.setSpeed(1.5);
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({ defaultSpeed: 1.5 })
      );
      
      // Simulate restart by creating new manager
      const newManager = new SpeedManager();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for init
      
      expect(newManager.getCurrentSpeed()).toBe(1.5);
    });

    test('should handle domain-specific speeds', async () => {
      await speedManager.setDomainSpeed('example.com', 2.0);
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          domainSpeeds: [['example.com', 2.0]]
        })
      );
    });
  });

  describe('Speed Info', () => {
    test('should return correct speed info', () => {
      speedManager['currentSpeed'] = 1.5;
      const info = speedManager.getSpeedInfo();
      
      expect(info).toEqual({
        current: 1.5,
        default: 1.0,
        min: 0.5,
        max: 3.0,
        step: 0.1,
        presets: [0.75, 1.0, 1.25, 1.5, 2.0],
        formatted: '1.5x'
      });
    });
  });

  describe('Reading Time Calculation', () => {
    test('should calculate reading time correctly', () => {
      const testCases = [
        { chars: 750, speed: 1.0, expectedMinutes: 1 }, // 150 words at normal speed
        { chars: 750, speed: 2.0, expectedMinutes: 0.5 }, // 150 words at 2x speed
        { chars: 1500, speed: 1.0, expectedMinutes: 2 }, // 300 words at normal speed
        { chars: 300, speed: 1.0, expectedMinutes: 0.4 }, // 60 words at normal speed
      ];
      
      testCases.forEach(({ chars, speed, expectedMinutes }) => {
        const result = speedManager.calculateReadingTime(chars, speed);
        expect(result.minutes).toBeCloseTo(expectedMinutes, 1);
      });
    });

    test('should format reading time correctly', () => {
      expect(speedManager['formatReadingTime'](0.5)).toBe('30s');
      expect(speedManager['formatReadingTime'](1.5)).toBe('2m');
      expect(speedManager['formatReadingTime'](65)).toBe('1h 5m');
    });
  });

  describe('Speed Notification', () => {
    test('should notify speed change', async () => {
      await speedManager.setSpeed(2.0);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SPEED_CHANGED',
        data: {
          speed: 2.0,
          formatted: '2.0x'
        }
      });
    });
  });
});