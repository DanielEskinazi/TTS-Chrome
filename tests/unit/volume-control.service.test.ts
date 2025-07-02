import { VolumeControlService } from '../../src/background/services/volume-control.service';
import { VOLUME_CONSTRAINTS } from '../../src/common/types/volume.types';

// Mock Chrome APIs
const mockStorage = {
  sync: {
    get: jest.fn(),
    set: jest.fn()
  },
  local: {
    get: jest.fn(),
    set: jest.fn()
  }
};

const mockTabs = {
  query: jest.fn()
};

const mockRuntime = {
  sendMessage: jest.fn()
};

// Setup global chrome mock
(global as any).chrome = {
  storage: mockStorage,
  tabs: mockTabs,
  runtime: mockRuntime
};

// Mock window.setTimeout for controlled testing
jest.useFakeTimers();

describe('VolumeControlService', () => {
  let service: VolumeControlService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockStorage.sync.get.mockResolvedValue({});
    mockStorage.sync.set.mockResolvedValue(undefined);
    mockStorage.local.set.mockResolvedValue(undefined);
    mockTabs.query.mockResolvedValue([{ url: 'https://example.com' }]);
    
    service = new VolumeControlService();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('setVolume()', () => {
    it('should clamp volume to 0-100 range', async () => {
      await service.setVolume(150);
      expect(service.getVolume()).toBe(100);

      await service.setVolume(-50);
      expect(service.getVolume()).toBe(0);
    });

    it('should apply volume changes immediately', async () => {
      await service.setVolume(75);
      expect(service.getVolume()).toBe(75);
      expect(service.isMuted()).toBe(false);
    });

    it('should unmute when setting volume', async () => {
      service.mute();
      expect(service.isMuted()).toBe(true);

      await service.setVolume(50);
      expect(service.isMuted()).toBe(false);
      expect(service.getVolume()).toBe(50);
    });

    it('should save domain override when specified', async () => {
      const domain = 'example.com';
      
      await service.setVolume(60, { saveToDomain: true });
      
      expect(service.getCurrentEffectiveVolume(domain)).toBe(60);
      expect(mockStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          domainVolumes: expect.objectContaining({
            [domain]: 60
          })
        })
      );
    });

    it('should broadcast volume changes', async () => {
      await service.setVolume(80);
      
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'VOLUME_CHANGED',
        volume: 80,
        isMuted: false,
        effectiveVolume: 80
      });
    });

    it('should debounce storage saves', async () => {
      await service.setVolume(50);
      await service.setVolume(60);
      await service.setVolume(70);
      
      // Should only save once after debounce
      expect(mockStorage.sync.set).not.toHaveBeenCalled();
      
      // Fast-forward past debounce delay
      jest.advanceTimersByTime(VOLUME_CONSTRAINTS.VOLUME_CHANGE_DEBOUNCE + 10);
      
      expect(mockStorage.sync.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('mute/unmute', () => {
    it('should mute and preserve previous volume', () => {
      service.setVolume(75);
      service.mute();

      expect(service.isMuted()).toBe(true);
      expect(service.getVolume()).toBe(0);
      expect((service as any).state.previousVolume).toBe(75);
    });

    it('should restore previous volume on unmute', () => {
      service.setVolume(80);
      service.mute();
      service.unmute();

      expect(service.isMuted()).toBe(false);
      expect(service.getVolume()).toBe(80);
    });

    it('should not double-mute', () => {
      service.setVolume(60);
      service.mute();
      const firstPreviousVolume = (service as any).state.previousVolume;
      service.mute(); // Second mute

      service.unmute();
      expect(service.getVolume()).toBe(firstPreviousVolume); // Should restore original
    });

    it('should handle mute toggle correctly', async () => {
      service.setVolume(70);
      
      // First toggle - should mute
      const response1 = await service.handleMessage({ type: 'TOGGLE_MUTE' }, {} as any);
      expect(response1.isMuted).toBe(true);
      expect(service.isMuted()).toBe(true);
      
      // Second toggle - should unmute
      const response2 = await service.handleMessage({ type: 'TOGGLE_MUTE' }, {} as any);
      expect(response2.isMuted).toBe(false);
      expect(service.isMuted()).toBe(false);
      expect(service.getVolume()).toBe(70);
    });
  });

  describe('domain-specific volumes', () => {
    it('should return domain volume when available', () => {
      service.setVolume(70); // Global
      (service as any).state.domainOverrides.set('example.com', 50);

      expect(service.getCurrentEffectiveVolume('example.com')).toBe(50);
      expect(service.getCurrentEffectiveVolume('other.com')).toBe(70);
    });

    it('should respect mute state for domain volumes', () => {
      (service as any).state.domainOverrides.set('example.com', 80);
      service.mute();

      expect(service.getCurrentEffectiveVolume('example.com')).toBe(0);
    });

    it('should set domain volume correctly', async () => {
      await service.setDomainVolume('test.com', 45);
      
      expect(service.getCurrentEffectiveVolume('test.com')).toBe(45);
      expect(mockStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          domainVolumes: expect.objectContaining({
            'test.com': 45
          })
        })
      );
    });

    it('should limit domain entries and prune old ones', async () => {
      // Fill up domain overrides to max
      for (let i = 0; i < VOLUME_CONSTRAINTS.MAX_DOMAIN_ENTRIES; i++) {
        (service as any).state.domainOverrides.set(`domain${i}.com`, 50);
      }

      // Add one more - should trigger pruning
      await service.setDomainVolume('newdomain.com', 60);
      
      expect((service as any).state.domainOverrides.size).toBeLessThanOrEqual(
        VOLUME_CONSTRAINTS.MAX_DOMAIN_ENTRIES
      );
      expect((service as any).state.domainOverrides.has('newdomain.com')).toBe(true);
    });
  });

  describe('volume presets', () => {
    it('should save custom presets', async () => {
      const presetId = await service.savePreset('Work', 40);
      
      expect(presetId).toMatch(/^custom-\d+$/);
      expect((service as any).state.volumePresets).toContainEqual(
        expect.objectContaining({
          id: presetId,
          name: 'Work',
          volume: 40
        })
      );
    });

    it('should apply presets correctly', async () => {
      const presetId = await service.savePreset('Gaming', 85);
      await service.applyPreset(presetId);
      
      expect(service.getVolume()).toBe(85);
    });

    it('should limit custom presets to 5', async () => {
      // Add 6 custom presets
      const presetIds = [];
      for (let i = 0; i < 6; i++) {
        const id = await service.savePreset(`Preset${i}`, 30 + i);
        presetIds.push(id);
      }
      
      const customPresets = (service as any).state.volumePresets.filter(
        (p: any) => p.id.startsWith('custom-')
      );
      expect(customPresets.length).toBe(5);
      
      // Should remove oldest
      expect(customPresets.some((p: any) => p.id === presetIds[0])).toBe(false);
      expect(customPresets.some((p: any) => p.id === presetIds[5])).toBe(true);
    });

    it('should throw error for non-existent preset', async () => {
      await expect(service.applyPreset('non-existent')).rejects.toThrow(
        'Preset not found: non-existent'
      );
    });
  });

  describe('fade effects', () => {
    it('should fade in from 0 to target volume', async () => {
      service.setVolume(60);
      const spy = jest.spyOn(service as any, 'smoothVolumeTransition');

      await service.fadeIn(500);

      expect(spy).toHaveBeenCalledWith(0, 60, 500);
    });

    it('should fade out from current to 0', async () => {
      service.setVolume(80);
      const spy = jest.spyOn(service as any, 'smoothVolumeTransition');

      await service.fadeOut(300);

      expect(spy).toHaveBeenCalledWith(80, 0, 300);
    });

    it('should use default fade duration when not specified', async () => {
      service.setVolume(50);
      const spy = jest.spyOn(service as any, 'smoothVolumeTransition');

      await service.fadeIn();

      expect(spy).toHaveBeenCalledWith(0, 50, VOLUME_CONSTRAINTS.FADE_DURATION_DEFAULT);
    });
  });

  describe('message handling', () => {
    it('should handle GET_VOLUME_STATE message', async () => {
      service.setVolume(65);
      (service as any).state.domainOverrides.set('test.com', 40);
      
      const response = await service.handleMessage(
        { type: 'GET_VOLUME_STATE', domain: 'test.com' }, 
        {} as any
      );
      
      expect(response).toEqual({
        volume: 65,
        isMuted: false,
        effectiveVolume: 40,
        domainVolume: 40,
        presets: expect.any(Array)
      });
    });

    it('should handle ADJUST_VOLUME message', async () => {
      service.setVolume(50);
      
      const response = await service.handleMessage(
        { type: 'ADJUST_VOLUME', delta: 20 }, 
        {} as any
      );
      
      expect(response.success).toBe(true);
      expect(response.newVolume).toBe(70);
      expect(service.getVolume()).toBe(70);
    });

    it('should clamp adjusted volume to valid range', async () => {
      service.setVolume(95);
      
      const response = await service.handleMessage(
        { type: 'ADJUST_VOLUME', delta: 20 }, 
        {} as any
      );
      
      expect(response.newVolume).toBe(100);
      expect(service.getVolume()).toBe(100);
    });

    it('should handle unknown message types', async () => {
      const response = await service.handleMessage(
        { type: 'UNKNOWN_TYPE' }, 
        {} as any
      );
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown volume command');
    });
  });

  describe('storage operations', () => {
    it('should load volume state from storage on initialization', async () => {
      const mockData = {
        volumeSettings: {
          globalVolume: 85,
          volumePresets: [
            { id: 'custom-test', name: 'Test', volume: 45 }
          ],
          domainVolumes: {
            'example.com': 30
          },
          fadeSettings: {
            enableFadeIn: false,
            enableFadeOut: true,
            fadeDuration: 1000
          }
        }
      };
      
      mockStorage.sync.get.mockResolvedValueOnce(mockData);
      
      const newService = new VolumeControlService();
      
      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(newService.getVolume()).toBe(85);
      expect(newService.getCurrentEffectiveVolume('example.com')).toBe(30);
    });

    it('should fallback to local storage when sync fails', async () => {
      mockStorage.sync.set.mockRejectedValueOnce(new Error('Sync failed'));
      mockStorage.local.set.mockResolvedValueOnce(undefined);
      
      await service.setVolume(75);
      
      // Trigger storage save
      jest.advanceTimersByTime(VOLUME_CONSTRAINTS.VOLUME_CHANGE_DEBOUNCE + 10);
      
      expect(mockStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          volumeSettings: expect.any(Object)
        })
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.sync.get.mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw
      expect(() => new VolumeControlService()).not.toThrow();
    });
  });

  describe('smooth volume transitions', () => {
    it('should perform smooth transitions with correct parameters', async () => {
      const spy = jest.spyOn(service as any, 'applyVolumeToActiveSpeech');
      
      await service.setVolume(80, { smooth: true, duration: 400 });
      
      // Should call applyVolumeToActiveSpeech multiple times during transition
      expect(spy).toHaveBeenCalled();
    });

    it('should clear existing transitions before starting new ones', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      // Start first transition
      service.setVolume(50, { smooth: true, duration: 500 });
      
      // Start second transition immediately
      service.setVolume(80, { smooth: true, duration: 300 });
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});