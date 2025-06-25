# Feature 5.1: Basic Storage System

## Overview

Implement a comprehensive storage system for the TTS Chrome Extension using Chrome's storage APIs. This system will handle user preferences, settings persistence, and data synchronization across devices.

## Objectives

- Create a robust storage abstraction layer
- Implement data validation and migration
- Support both local and sync storage
- Provide offline-first data persistence
- Enable settings backup and restore

## Technical Requirements

### Functional Requirements

1. **Storage Types**
   - Local storage for device-specific preferences
   - Sync storage for cross-device synchronization
   - Session storage for temporary data
   - Managed storage for enterprise policies

2. **Data Models**
   - User preferences (voice, speed, volume)
   - Application state (current position, queue)
   - Usage statistics and analytics
   - Domain-specific overrides

3. **Data Validation**
   - Schema validation using Zod
   - Type safety with TypeScript
   - Migration between schema versions
   - Fallback to default values

### Non-Functional Requirements

1. **Performance**
   - Storage operations < 100ms
   - Batch operations for efficiency
   - Lazy loading of large datasets
   - Cache frequently accessed data

2. **Reliability**
   - Data integrity validation
   - Automatic retry mechanisms
   - Graceful fallback handling
   - Corruption detection and recovery

3. **Security**
   - No sensitive data in sync storage
   - Data encryption for local storage
   - Secure default configurations
   - Privacy-compliant data handling

## Implementation

### 1. Storage Schema Definition

```typescript
// src/types/storage.ts
import { z } from 'zod';

export const VoicePreferenceSchema = z.object({
  voiceURI: z.string(),
  name: z.string(),
  lang: z.string(),
  localService: z.boolean(),
  default: z.boolean().optional(),
});

export const PlaybackSettingsSchema = z.object({
  speed: z.number().min(0.1).max(4.0).default(1.0),
  volume: z.number().min(0).max(1).default(0.8),
  pitch: z.number().min(0).max(2).default(1.0),
  voice: VoicePreferenceSchema.optional(),
});

export const ReadingPreferencesSchema = z.object({
  highlightMode: z.enum(['word', 'sentence', 'paragraph']).default('sentence'),
  autoPlay: z.boolean().default(false),
  skipPunctuation: z.boolean().default(false),
  pauseOnPunctuation: z.boolean().default(true),
});

export const UIPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  compactMode: z.boolean().default(false),
  showProgress: z.boolean().default(true),
  showQueue: z.boolean().default(true),
});

export const UserSettingsSchema = z.object({
  playback: PlaybackSettingsSchema,
  reading: ReadingPreferencesSchema,
  ui: UIPreferencesSchema,
  version: z.string().default('1.0.0'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const DomainOverrideSchema = z.object({
  domain: z.string(),
  settings: PlaybackSettingsSchema.partial(),
  enabled: z.boolean().default(true),
});

export const UsageStatsSchema = z.object({
  totalPlaytime: z.number().default(0),
  totalWordsRead: z.number().default(0),
  favoriteVoices: z.array(z.string()).default([]),
  mostUsedDomains: z.record(z.number()).default({}),
  lastUsed: z.date().default(() => new Date()),
});

export type VoicePreference = z.infer<typeof VoicePreferenceSchema>;
export type PlaybackSettings = z.infer<typeof PlaybackSettingsSchema>;
export type ReadingPreferences = z.infer<typeof ReadingPreferencesSchema>;
export type UIPreferences = z.infer<typeof UIPreferencesSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type DomainOverride = z.infer<typeof DomainOverrideSchema>;
export type UsageStats = z.infer<typeof UsageStatsSchema>;
```

### 2. Storage Service Implementation

```typescript
// src/services/StorageService.ts
import { UserSettings, UserSettingsSchema, DomainOverride, UsageStats } from '../types/storage';

export class StorageService {
  private static instance: StorageService;
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 60000; // 1 minute

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Settings Management
  async getUserSettings(): Promise<UserSettings> {
    const cached = this.getFromCache('userSettings');
    if (cached) return cached;

    try {
      const result = await chrome.storage.sync.get('userSettings');
      const settings = result.userSettings 
        ? UserSettingsSchema.parse(result.userSettings)
        : UserSettingsSchema.parse({});
      
      this.setCache('userSettings', settings);
      return settings;
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return UserSettingsSchema.parse({});
    }
  }

  async setUserSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const currentSettings = await this.getUserSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: new Date(),
      };

      const validatedSettings = UserSettingsSchema.parse(updatedSettings);
      await chrome.storage.sync.set({ userSettings: validatedSettings });
      this.setCache('userSettings', validatedSettings);
      
      // Notify listeners
      this.notifySettingsChange(validatedSettings);
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw new Error('Settings could not be saved');
    }
  }

  // Domain Overrides
  async getDomainOverrides(): Promise<DomainOverride[]> {
    const cached = this.getFromCache('domainOverrides');
    if (cached) return cached;

    try {
      const result = await chrome.storage.local.get('domainOverrides');
      const overrides = result.domainOverrides || [];
      this.setCache('domainOverrides', overrides);
      return overrides;
    } catch (error) {
      console.error('Failed to load domain overrides:', error);
      return [];
    }
  }

  async setDomainOverride(domain: string, settings: Partial<PlaybackSettings>): Promise<void> {
    try {
      const overrides = await this.getDomainOverrides();
      const existingIndex = overrides.findIndex(o => o.domain === domain);
      
      const newOverride: DomainOverride = {
        domain,
        settings,
        enabled: true,
      };

      if (existingIndex >= 0) {
        overrides[existingIndex] = newOverride;
      } else {
        overrides.push(newOverride);
      }

      await chrome.storage.local.set({ domainOverrides: overrides });
      this.setCache('domainOverrides', overrides);
    } catch (error) {
      console.error('Failed to save domain override:', error);
      throw new Error('Domain settings could not be saved');
    }
  }

  // Usage Statistics
  async getUsageStats(): Promise<UsageStats> {
    const cached = this.getFromCache('usageStats');
    if (cached) return cached;

    try {
      const result = await chrome.storage.local.get('usageStats');
      const stats = result.usageStats || {};
      const validatedStats = UsageStatsSchema.parse(stats);
      this.setCache('usageStats', validatedStats);
      return validatedStats;
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      return UsageStatsSchema.parse({});
    }
  }

  async updateUsageStats(update: Partial<UsageStats>): Promise<void> {
    try {
      const currentStats = await this.getUsageStats();
      const updatedStats = {
        ...currentStats,
        ...update,
        lastUsed: new Date(),
      };

      const validatedStats = UsageStatsSchema.parse(updatedStats);
      await chrome.storage.local.set({ usageStats: validatedStats });
      this.setCache('usageStats', validatedStats);
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }

  // Cache Management
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Data Migration
  async migrateData(fromVersion: string, toVersion: string): Promise<void> {
    console.log(`Migrating data from ${fromVersion} to ${toVersion}`);
    
    // Add migration logic here based on version differences
    if (fromVersion === '1.0.0' && toVersion === '1.1.0') {
      // Example migration
      const settings = await this.getUserSettings();
      await this.setUserSettings({
        ...settings,
        version: toVersion,
      });
    }
  }

  // Backup and Restore
  async exportSettings(): Promise<string> {
    try {
      const userSettings = await this.getUserSettings();
      const domainOverrides = await this.getDomainOverrides();
      
      const exportData = {
        userSettings,
        domainOverrides,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw new Error('Settings export failed');
    }
  }

  async importSettings(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.userSettings) {
        await this.setUserSettings(importData.userSettings);
      }
      
      if (importData.domainOverrides) {
        await chrome.storage.local.set({ domainOverrides: importData.domainOverrides });
        this.cache.delete('domainOverrides');
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Settings import failed');
    }
  }

  // Event Listeners
  private listeners: ((settings: UserSettings) => void)[] = [];

  onSettingsChange(callback: (settings: UserSettings) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifySettingsChange(settings: UserSettings): void {
    this.listeners.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        console.error('Error in settings change listener:', error);
      }
    });
  }

  // Cleanup
  clearCache(): void {
    this.cache.clear();
  }

  async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
      this.clearCache();
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw new Error('Data cleanup failed');
    }
  }
}
```

### 3. React Hook for Storage

```typescript
// src/hooks/useStorage.ts
import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/StorageService';
import { UserSettings } from '../types/storage';

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const storageService = StorageService.getInstance();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const userSettings = await storageService.getUserSettings();
        setSettings(userSettings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Listen for settings changes
    const unsubscribe = storageService.onSettingsChange((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, [storageService]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      setError(null);
      await storageService.setUserSettings(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    }
  }, [storageService]);

  const resetSettings = useCallback(async () => {
    try {
      setError(null);
      await storageService.clearAllData();
      const defaultSettings = await storageService.getUserSettings();
      setSettings(defaultSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      throw err;
    }
  }, [storageService]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
  };
}
```

### 4. Storage Provider Component

```typescript
// src/providers/StorageProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useUserSettings } from '../hooks/useStorage';
import { UserSettings } from '../types/storage';

interface StorageContextType {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const storageData = useUserSettings();

  return (
    <StorageContext.Provider value={storageData}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextType {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}
```

## Testing

### Unit Tests

```typescript
// src/services/__tests__/StorageService.test.ts
import { StorageService } from '../StorageService';
import { UserSettingsSchema } from '../../types/storage';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    },
  },
};

(global as any).chrome = mockChrome;

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    storageService = StorageService.getInstance();
    storageService.clearCache();
    jest.clearAllMocks();
  });

  describe('getUserSettings', () => {
    it('should return default settings when none exist', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({});
      
      const settings = await storageService.getUserSettings();
      
      expect(settings).toMatchObject(UserSettingsSchema.parse({}));
    });

    it('should return cached settings on subsequent calls', async () => {
      const mockSettings = UserSettingsSchema.parse({});
      mockChrome.storage.sync.get.mockResolvedValue({ userSettings: mockSettings });
      
      await storageService.getUserSettings();
      await storageService.getUserSettings();
      
      expect(mockChrome.storage.sync.get).toHaveBeenCalledTimes(1);
    });

    it('should handle storage errors gracefully', async () => {
      mockChrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));
      
      const settings = await storageService.getUserSettings();
      
      expect(settings).toMatchObject(UserSettingsSchema.parse({}));
    });
  });

  describe('setUserSettings', () => {
    it('should save settings to sync storage', async () => {
      const updates = { playback: { speed: 1.5 } };
      mockChrome.storage.sync.get.mockResolvedValue({});
      mockChrome.storage.sync.set.mockResolvedValue(undefined);
      
      await storageService.setUserSettings(updates);
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          userSettings: expect.objectContaining({
            playback: expect.objectContaining({ speed: 1.5 }),
          }),
        })
      );
    });

    it('should validate settings before saving', async () => {
      const invalidUpdates = { playback: { speed: 10 } }; // Invalid speed
      
      await expect(storageService.setUserSettings(invalidUpdates)).rejects.toThrow();
    });
  });

  describe('migrateData', () => {
    it('should handle version migration', async () => {
      const oldSettings = { version: '1.0.0' };
      mockChrome.storage.sync.get.mockResolvedValue({ userSettings: oldSettings });
      mockChrome.storage.sync.set.mockResolvedValue(undefined);
      
      await storageService.migrateData('1.0.0', '1.1.0');
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          userSettings: expect.objectContaining({
            version: '1.1.0',
          }),
        })
      );
    });
  });
});
```

### Integration Tests

```typescript
// src/hooks/__tests__/useStorage.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useUserSettings } from '../useStorage';

describe('useUserSettings', () => {
  it('should load settings on mount', async () => {
    const { result } = renderHook(() => useUserSettings());
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      // Wait for settings to load
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.settings).toBeTruthy();
  });

  it('should update settings', async () => {
    const { result } = renderHook(() => useUserSettings());
    
    await act(async () => {
      await result.current.updateSettings({
        playback: { speed: 2.0 },
      });
    });
    
    expect(result.current.settings?.playback.speed).toBe(2.0);
  });
});
```

## Success Metrics

1. **Performance Targets**
   - Settings load time: < 100ms
   - Settings save time: < 200ms
   - Cache hit rate: > 90%
   - Memory usage: < 10MB

2. **Reliability Targets**
   - Data corruption rate: < 0.01%
   - Successful save rate: > 99.9%
   - Error recovery rate: 100%
   - Migration success rate: 100%

3. **User Experience**
   - Settings persistence across sessions: 100%
   - Sync across devices: < 5 seconds
   - Backup/restore success: > 99%
   - Zero data loss incidents

## Dependencies

### Internal Dependencies
- Type definitions from Phase 1
- Error handling utilities
- Chrome Extension APIs

### External Dependencies
- Zod for schema validation
- Chrome Storage APIs
- TypeScript for type safety

## Risks and Mitigation

### High-Risk Items
1. **Storage Quota Limits**
   - Risk: Exceeding Chrome storage limits
   - Mitigation: Implement data cleanup and compression

2. **Data Corruption**
   - Risk: Invalid data causing app crashes
   - Mitigation: Schema validation and data migration

3. **Sync Conflicts**
   - Risk: Settings conflicts across devices
   - Mitigation: Last-write-wins with conflict detection

### Medium-Risk Items
1. **Performance Impact**
   - Risk: Slow storage operations affecting UX
   - Mitigation: Caching and lazy loading

2. **Migration Failures**
   - Risk: Data loss during version upgrades
   - Mitigation: Backup before migration

## Acceptance Criteria

- [ ] Settings persist across browser sessions
- [ ] Data validation prevents corruption
- [ ] Sync works across devices (if enabled)
- [ ] Migration handles version changes
- [ ] Backup/restore functionality works
- [ ] Performance meets targets
- [ ] Error handling is robust
- [ ] Cache improves performance
- [ ] Type safety is maintained
- [ ] All tests pass with >90% coverage