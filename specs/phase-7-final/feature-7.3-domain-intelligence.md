# Feature 7.3: Domain-Specific Intelligence & History

## Overview

Implement intelligent domain-specific features that learn from user behavior and adapt TTS settings per website. This includes automatic voice and speed preferences, content filtering rules, reading history with search capabilities, and smart content detection to skip irrelevant page elements like ads and navigation.

## Objectives

- Create per-domain preference profiles that remember user settings
- Build a searchable reading history with analytics
- Implement intelligent content detection to skip ads, navigation, and boilerplate
- Add domain-specific text processing rules for better reading experience
- Provide insights into reading patterns and domain usage
- Enable smart content extraction based on page structure

## Technical Requirements

### Functional Requirements

1. **Domain Profile Management**
   - Auto-save settings when changed on a domain
   - Voice preference per domain
   - Speed/volume preferences
   - Reading mode preferences
   - Content filtering rules
   - Custom CSS selectors for content

2. **Reading History**
   - Track all reading sessions with metadata
   - Full-text search across history
   - Filter by domain, date, duration
   - Export history as CSV/JSON
   - Privacy mode to disable tracking
   - Auto-cleanup old entries (configurable)

3. **Smart Content Detection**
   - Skip navigation menus automatically
   - Detect and skip advertisement blocks
   - Identify main content areas
   - Skip repetitive footer content
   - Detect article boundaries
   - Handle pagination intelligently

4. **Domain-Specific Rules**
   - GitHub: Skip UI elements, focus on code/comments
   - Wikipedia: Skip edit links, infoboxes optional
   - News sites: Skip ads, related articles
   - Documentation: Preserve code blocks
   - Social media: Skip UI chrome
   - Custom rule creation interface

5. **Analytics Dashboard**
   - Reading time per domain
   - Most read domains
   - Average session duration
   - Words per minute tracking
   - Voice usage statistics
   - Time of day patterns

### Non-Functional Requirements

1. **Performance**
   - History search < 100ms for 10k entries
   - Domain detection < 10ms
   - Content analysis < 200ms
   - Minimal impact on page load

2. **Storage**
   - Efficient history compression
   - 6-month default retention
   - < 100MB storage usage
   - Automatic cleanup

3. **Privacy**
   - Opt-in history tracking
   - Local storage only
   - Easy data deletion
   - Incognito mode support

## Implementation

### 1. Domain Intelligence Service

```typescript
// src/services/DomainIntelligenceService.ts
import { EventEmitter } from 'events';
import { TextProcessor } from './TextProcessor';
import { StorageService } from './StorageService';

export interface DomainProfile {
  domain: string;
  settings: {
    defaultVoice?: string;
    defaultSpeed?: number;
    defaultVolume?: number;
    readingMode?: 'selection' | 'continuous' | 'page' | 'smart';
    autoSkipNav?: boolean;
    autoSkipAds?: boolean;
    customSelectors?: {
      content?: string[];
      skip?: string[];
    };
  };
  statistics: {
    totalSessions: number;
    totalWords: number;
    totalDuration: number; // seconds
    lastUsed: number; // timestamp
    averageSpeed: number; // words per minute
  };
  rules: ContentRule[];
}

export interface ContentRule {
  id: string;
  type: 'skip' | 'include' | 'transform';
  selector?: string;
  pattern?: RegExp;
  action: string;
  priority: number;
}

export interface ReadingSession {
  id: string;
  domain: string;
  url: string;
  title: string;
  text: string;
  startTime: number;
  endTime?: number;
  duration: number;
  wordCount: number;
  voice: string;
  speed: number;
  completed: boolean;
  excerpt: string; // First 200 chars
  metadata: {
    selectionContext?: string;
    pageSection?: string;
    userAgent: string;
  };
}

export class DomainIntelligenceService extends EventEmitter {
  private static instance: DomainIntelligenceService;
  private profiles: Map<string, DomainProfile> = new Map();
  private history: ReadingSession[] = [];
  private currentSession: ReadingSession | null = null;
  private storageService: StorageService;
  private contentDetector: ContentDetector;
  private historyLimit = 10000;
  private privacyMode = false;

  // Predefined rules for popular domains
  private defaultRules: Record<string, ContentRule[]> = {
    'github.com': [
      { id: 'gh-1', type: 'skip', selector: '.Header, .Footer', action: 'skip', priority: 10 },
      { id: 'gh-2', type: 'skip', selector: '.js-navigation-item', action: 'skip', priority: 9 },
      { id: 'gh-3', type: 'include', selector: '.markdown-body, .comment-body', action: 'include', priority: 8 },
    ],
    'wikipedia.org': [
      { id: 'wiki-1', type: 'skip', selector: '#mw-navigation, .navbox', action: 'skip', priority: 10 },
      { id: 'wiki-2', type: 'skip', pattern: /\[edit\]/g, action: 'remove', priority: 9 },
      { id: 'wiki-3', type: 'include', selector: '#mw-content-text', action: 'include', priority: 8 },
    ],
    'medium.com': [
      { id: 'med-1', type: 'skip', selector: 'nav, .metabar', action: 'skip', priority: 10 },
      { id: 'med-2', type: 'skip', selector: '[aria-label="responses"]', action: 'skip', priority: 9 },
      { id: 'med-3', type: 'include', selector: 'article', action: 'include', priority: 8 },
    ],
    'reddit.com': [
      { id: 'red-1', type: 'skip', selector: 'header, .side', action: 'skip', priority: 10 },
      { id: 'red-2', type: 'include', selector: '.usertext-body, .title', action: 'include', priority: 8 },
    ],
  };

  static getInstance(): DomainIntelligenceService {
    if (!DomainIntelligenceService.instance) {
      DomainIntelligenceService.instance = new DomainIntelligenceService();
    }
    return DomainIntelligenceService.instance;
  }

  constructor() {
    super();
    this.storageService = StorageService.getInstance();
    this.contentDetector = new ContentDetector();
    this.loadData();
    this.setupAutoSave();
  }

  // Profile Management
  async getProfile(domain: string): Promise<DomainProfile> {
    let profile = this.profiles.get(domain);
    
    if (!profile) {
      profile = this.createDefaultProfile(domain);
      this.profiles.set(domain, profile);
    }

    return profile;
  }

  async updateProfile(domain: string, updates: Partial<DomainProfile>): Promise<void> {
    const profile = await this.getProfile(domain);
    
    if (updates.settings) {
      profile.settings = { ...profile.settings, ...updates.settings };
    }
    
    if (updates.rules) {
      profile.rules = updates.rules;
    }

    profile.statistics.lastUsed = Date.now();
    this.profiles.set(domain, profile);
    
    this.emit('profile-updated', profile);
    await this.saveProfiles();
  }

  private createDefaultProfile(domain: string): DomainProfile {
    const rules = this.getDefaultRules(domain);
    
    return {
      domain,
      settings: {
        autoSkipNav: true,
        autoSkipAds: true,
      },
      statistics: {
        totalSessions: 0,
        totalWords: 0,
        totalDuration: 0,
        lastUsed: Date.now(),
        averageSpeed: 150,
      },
      rules,
    };
  }

  private getDefaultRules(domain: string): ContentRule[] {
    // Check for exact match
    if (this.defaultRules[domain]) {
      return [...this.defaultRules[domain]];
    }

    // Check for partial match (e.g., en.wikipedia.org matches wikipedia.org)
    for (const [key, rules] of Object.entries(this.defaultRules)) {
      if (domain.includes(key)) {
        return [...rules];
      }
    }

    // Return generic rules
    return [
      { id: 'generic-1', type: 'skip', selector: 'nav, .navigation, .nav-menu', action: 'skip', priority: 10 },
      { id: 'generic-2', type: 'skip', selector: '.ads, .advertisement, [class*="ad-"]', action: 'skip', priority: 9 },
      { id: 'generic-3', type: 'skip', selector: 'footer, .footer', action: 'skip', priority: 8 },
    ];
  }

  // Session Tracking
  startSession(options: {
    domain: string;
    url: string;
    title: string;
    text: string;
    voice: string;
    speed: number;
    metadata?: any;
  }): string {
    if (this.privacyMode) return '';

    const session: ReadingSession = {
      id: this.generateSessionId(),
      domain: options.domain,
      url: options.url,
      title: options.title,
      text: options.text,
      startTime: Date.now(),
      duration: 0,
      wordCount: options.text.split(/\s+/).length,
      voice: options.voice,
      speed: options.speed,
      completed: false,
      excerpt: options.text.substring(0, 200) + '...',
      metadata: {
        ...options.metadata,
        userAgent: navigator.userAgent,
      },
    };

    this.currentSession = session;
    this.emit('session-started', session);
    
    return session.id;
  }

  updateSession(updates: Partial<ReadingSession>): void {
    if (!this.currentSession || this.privacyMode) return;

    this.currentSession = { ...this.currentSession, ...updates };
    
    if (updates.endTime) {
      this.currentSession.duration = 
        (updates.endTime - this.currentSession.startTime) / 1000;
    }
  }

  async endSession(completed: boolean = true): Promise<void> {
    if (!this.currentSession || this.privacyMode) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = 
      (this.currentSession.endTime - this.currentSession.startTime) / 1000;
    this.currentSession.completed = completed;

    // Update domain statistics
    const profile = await this.getProfile(this.currentSession.domain);
    profile.statistics.totalSessions++;
    profile.statistics.totalWords += this.currentSession.wordCount;
    profile.statistics.totalDuration += this.currentSession.duration;
    profile.statistics.averageSpeed = 
      (this.currentSession.wordCount / this.currentSession.duration) * 60;

    // Add to history
    this.history.unshift(this.currentSession);
    
    // Enforce history limit
    if (this.history.length > this.historyLimit) {
      this.history = this.history.slice(0, this.historyLimit);
    }

    this.emit('session-ended', this.currentSession);
    await this.saveHistory();
    
    this.currentSession = null;
  }

  // History Management
  async searchHistory(query: string, filters?: {
    domain?: string;
    startDate?: Date;
    endDate?: Date;
    minDuration?: number;
  }): Promise<ReadingSession[]> {
    let results = this.history;

    // Apply filters
    if (filters?.domain) {
      results = results.filter(s => s.domain === filters.domain);
    }

    if (filters?.startDate) {
      const startTime = filters.startDate.getTime();
      results = results.filter(s => s.startTime >= startTime);
    }

    if (filters?.endDate) {
      const endTime = filters.endDate.getTime();
      results = results.filter(s => s.startTime <= endTime);
    }

    if (filters?.minDuration) {
      results = results.filter(s => s.duration >= filters.minDuration);
    }

    // Search query
    if (query) {
      const searchLower = query.toLowerCase();
      results = results.filter(s => 
        s.text.toLowerCase().includes(searchLower) ||
        s.title.toLowerCase().includes(searchLower) ||
        s.url.toLowerCase().includes(searchLower) ||
        s.excerpt.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  getHistoryStats(): {
    totalSessions: number;
    totalWords: number;
    totalDuration: number;
    domainStats: Record<string, {
      sessions: number;
      words: number;
      duration: number;
    }>;
    dailyStats: Record<string, {
      sessions: number;
      words: number;
    }>;
  } {
    const stats = {
      totalSessions: this.history.length,
      totalWords: 0,
      totalDuration: 0,
      domainStats: {} as Record<string, any>,
      dailyStats: {} as Record<string, any>,
    };

    this.history.forEach(session => {
      stats.totalWords += session.wordCount;
      stats.totalDuration += session.duration;

      // Domain stats
      if (!stats.domainStats[session.domain]) {
        stats.domainStats[session.domain] = {
          sessions: 0,
          words: 0,
          duration: 0,
        };
      }
      stats.domainStats[session.domain].sessions++;
      stats.domainStats[session.domain].words += session.wordCount;
      stats.domainStats[session.domain].duration += session.duration;

      // Daily stats
      const day = new Date(session.startTime).toDateString();
      if (!stats.dailyStats[day]) {
        stats.dailyStats[day] = {
          sessions: 0,
          words: 0,
        };
      }
      stats.dailyStats[day].sessions++;
      stats.dailyStats[day].words += session.wordCount;
    });

    return stats;
  }

  async clearHistory(options?: {
    domain?: string;
    olderThan?: Date;
  }): Promise<void> {
    if (options?.domain) {
      this.history = this.history.filter(s => s.domain !== options.domain);
    } else if (options?.olderThan) {
      const cutoff = options.olderThan.getTime();
      this.history = this.history.filter(s => s.startTime >= cutoff);
    } else {
      this.history = [];
    }

    await this.saveHistory();
    this.emit('history-cleared', options);
  }

  exportHistory(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        version: 1,
        exportDate: new Date().toISOString(),
        sessions: this.history,
        statistics: this.getHistoryStats(),
      }, null, 2);
    } else {
      // CSV format
      const headers = [
        'Date', 'Time', 'Domain', 'URL', 'Title', 
        'Words', 'Duration (s)', 'Speed (wpm)', 'Voice', 'Completed'
      ];
      
      const rows = this.history.map(s => [
        new Date(s.startTime).toLocaleDateString(),
        new Date(s.startTime).toLocaleTimeString(),
        s.domain,
        s.url,
        `"${s.title.replace(/"/g, '""')}"`,
        s.wordCount,
        Math.round(s.duration),
        Math.round((s.wordCount / s.duration) * 60),
        s.voice,
        s.completed ? 'Yes' : 'No',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  // Content Intelligence
  async analyzeContent(options: {
    domain: string;
    url: string;
    content: string;
    selection?: Range;
  }): Promise<{
    mainContent: string;
    skippedSections: string[];
    contentType: string;
    readingTime: number;
    suggestions: string[];
  }> {
    const profile = await this.getProfile(options.domain);
    const analysis = this.contentDetector.analyze(options.content, profile.rules);

    // Apply domain-specific rules
    let processedContent = options.content;
    const skippedSections: string[] = [];

    for (const rule of profile.rules.sort((a, b) => b.priority - a.priority)) {
      if (rule.type === 'skip') {
        if (rule.selector) {
          const elements = document.querySelectorAll(rule.selector);
          elements.forEach(el => {
            const text = el.textContent || '';
            if (text) {
              skippedSections.push(text.substring(0, 50) + '...');
              processedContent = processedContent.replace(text, '');
            }
          });
        } else if (rule.pattern) {
          processedContent = processedContent.replace(rule.pattern, '');
        }
      }
    }

    // Detect content type
    const contentType = this.detectContentType(options.url, processedContent);

    // Calculate reading time
    const words = processedContent.split(/\s+/).length;
    const readingTime = Math.ceil(words / profile.statistics.averageSpeed);

    // Generate suggestions
    const suggestions = this.generateSuggestions(analysis, profile);

    return {
      mainContent: processedContent,
      skippedSections,
      contentType,
      readingTime,
      suggestions,
    };
  }

  private detectContentType(url: string, content: string): string {
    // URL patterns
    if (url.includes('/article/') || url.includes('/post/')) return 'article';
    if (url.includes('/docs/') || url.includes('/documentation/')) return 'documentation';
    if (url.includes('/wiki/')) return 'wiki';
    
    // Content patterns
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    if (codeBlockCount > 5) return 'technical';
    
    const avgSentenceLength = content.split(/[.!?]/).length / content.split(/\s+/).length;
    if (avgSentenceLength < 0.05) return 'list';
    
    return 'general';
  }

  private generateSuggestions(analysis: any, profile: DomainProfile): string[] {
    const suggestions: string[] = [];

    if (analysis.hasNavigation && !profile.settings.autoSkipNav) {
      suggestions.push('Enable navigation skipping for better reading flow');
    }

    if (analysis.hasAds && !profile.settings.autoSkipAds) {
      suggestions.push('Enable ad skipping to focus on content');
    }

    if (analysis.avgParagraphLength > 500) {
      suggestions.push('Consider continuous mode for long-form content');
    }

    return suggestions;
  }

  // Privacy Controls
  setPrivacyMode(enabled: boolean): void {
    this.privacyMode = enabled;
    if (enabled && this.currentSession) {
      this.endSession(false);
    }
    this.emit('privacy-mode-changed', enabled);
  }

  isPrivacyMode(): boolean {
    return this.privacyMode;
  }

  // Persistence
  private async loadData(): Promise<void> {
    try {
      const data = await this.storageService.getDomainIntelligence();
      
      if (data.profiles) {
        this.profiles = new Map(Object.entries(data.profiles));
      }
      
      if (data.history) {
        this.history = data.history;
      }

      if (data.privacyMode !== undefined) {
        this.privacyMode = data.privacyMode;
      }
    } catch (error) {
      console.error('Failed to load domain intelligence data:', error);
    }
  }

  private async saveProfiles(): Promise<void> {
    if (this.privacyMode) return;

    const profiles = Object.fromEntries(this.profiles);
    await this.storageService.setDomainProfiles(profiles);
  }

  private async saveHistory(): Promise<void> {
    if (this.privacyMode) return;

    await this.storageService.setReadingHistory(this.history);
  }

  private setupAutoSave(): void {
    // Save periodically
    setInterval(() => {
      this.saveProfiles();
      this.saveHistory();
    }, 60000); // Every minute

    // Save on important events
    window.addEventListener('beforeunload', () => {
      this.saveProfiles();
      this.saveHistory();
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  dispose(): void {
    if (this.currentSession) {
      this.endSession(false);
    }
    this.saveProfiles();
    this.saveHistory();
    this.removeAllListeners();
  }
}

// Content Detection Helper
class ContentDetector {
  analyze(content: string, rules: ContentRule[]): {
    hasNavigation: boolean;
    hasAds: boolean;
    hasSidebar: boolean;
    mainContentRatio: number;
    avgParagraphLength: number;
    codeBlockCount: number;
  } {
    const analysis = {
      hasNavigation: false,
      hasAds: false,
      hasSidebar: false,
      mainContentRatio: 0,
      avgParagraphLength: 0,
      codeBlockCount: 0,
    };

    // Check for common patterns
    const navPatterns = /navigation|menu|nav-|navbar/i;
    const adPatterns = /advertisement|sponsored|ad-slot|google-ads/i;
    const sidebarPatterns = /sidebar|aside|widget/i;

    analysis.hasNavigation = navPatterns.test(content);
    analysis.hasAds = adPatterns.test(content);
    analysis.hasSidebar = sidebarPatterns.test(content);

    // Calculate content metrics
    const paragraphs = content.split(/\n\n+/);
    if (paragraphs.length > 0) {
      const lengths = paragraphs.map(p => p.length);
      analysis.avgParagraphLength = 
        lengths.reduce((a, b) => a + b, 0) / lengths.length;
    }

    // Count code blocks
    analysis.codeBlockCount = (content.match(/```/g) || []).length / 2;

    // Estimate main content ratio
    const totalLength = content.length;
    let skipLength = 0;
    
    rules.forEach(rule => {
      if (rule.type === 'skip' && rule.pattern) {
        const matches = content.match(rule.pattern);
        if (matches) {
          skipLength += matches.join('').length;
        }
      }
    });

    analysis.mainContentRatio = 1 - (skipLength / totalLength);

    return analysis;
  }
}
```

### 2. Domain Settings UI Component

```typescript
// src/components/DomainSettings.tsx
import React, { useState, useEffect } from 'react';
import { DomainIntelligenceService, DomainProfile } from '../services/DomainIntelligenceService';
import { VoiceSelector } from './VoiceSelector';

interface DomainSettingsProps {
  domain: string;
  onClose: () => void;
}

export function DomainSettings({ domain, onClose }: DomainSettingsProps) {
  const [profile, setProfile] = useState<DomainProfile | null>(null);
  const [customRules, setCustomRules] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'rules' | 'history'>('settings');

  const intelligenceService = DomainIntelligenceService.getInstance();

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [domain]);

  const loadProfile = async () => {
    const prof = await intelligenceService.getProfile(domain);
    setProfile(prof);
    
    // Convert rules to editable format
    const rulesText = prof.rules
      .map(r => `${r.type}: ${r.selector || r.pattern} (priority: ${r.priority})`)
      .join('\n');
    setCustomRules(rulesText);
  };

  const loadStats = async () => {
    const history = await intelligenceService.searchHistory('', { domain });
    const totalWords = history.reduce((sum, s) => sum + s.wordCount, 0);
    const totalTime = history.reduce((sum, s) => sum + s.duration, 0);
    
    setStats({
      sessions: history.length,
      totalWords,
      totalTime,
      avgDuration: history.length > 0 ? totalTime / history.length : 0,
      lastUsed: history[0]?.startTime || null,
    });
  };

  const handleSettingChange = async (key: string, value: any) => {
    if (!profile) return;

    const updates = {
      settings: {
        ...profile.settings,
        [key]: value,
      },
    };

    await intelligenceService.updateProfile(domain, updates);
    loadProfile();
  };

  const handleRulesChange = async () => {
    // Parse custom rules format
    const rules = customRules.split('\n')
      .filter(line => line.trim())
      .map((line, index) => {
        const match = line.match(/^(skip|include|transform):\s*(.+?)\s*\(priority:\s*(\d+)\)/);
        if (match) {
          return {
            id: `custom-${index}`,
            type: match[1] as any,
            selector: match[2],
            action: match[1],
            priority: parseInt(match[3]),
          };
        }
        return null;
      })
      .filter(Boolean);

    await intelligenceService.updateProfile(domain, { rules: rules as any });
    loadProfile();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="domain-settings">
      <div className="settings-header">
        <h2>{domain} Settings</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="settings-tabs">
        <button 
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button 
          className={activeTab === 'rules' ? 'active' : ''}
          onClick={() => setActiveTab('rules')}
        >
          Content Rules
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="settings-content">
          <div className="setting-group">
            <label>Default Voice</label>
            <VoiceSelector
              value={profile.settings.defaultVoice || 'system'}
              onChange={(voice) => handleSettingChange('defaultVoice', voice)}
            />
          </div>

          <div className="setting-group">
            <label>Default Speed</label>
            <div className="speed-control">
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={profile.settings.defaultSpeed || 1}
                onChange={(e) => handleSettingChange('defaultSpeed', parseFloat(e.target.value))}
              />
              <span>{profile.settings.defaultSpeed || 1}x</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Default Volume</label>
            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={profile.settings.defaultVolume || 1}
                onChange={(e) => handleSettingChange('defaultVolume', parseFloat(e.target.value))}
              />
              <span>{Math.round((profile.settings.defaultVolume || 1) * 100)}%</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Reading Mode</label>
            <select
              value={profile.settings.readingMode || 'selection'}
              onChange={(e) => handleSettingChange('readingMode', e.target.value)}
            >
              <option value="selection">Selection Only</option>
              <option value="continuous">Continuous</option>
              <option value="page">Page Reader</option>
              <option value="smart">Smart Mode</option>
            </select>
          </div>

          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={profile.settings.autoSkipNav !== false}
                onChange={(e) => handleSettingChange('autoSkipNav', e.target.checked)}
              />
              Automatically skip navigation
            </label>
          </div>

          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={profile.settings.autoSkipAds !== false}
                onChange={(e) => handleSettingChange('autoSkipAds', e.target.checked)}
              />
              Automatically skip advertisements
            </label>
          </div>

          {stats && (
            <div className="domain-stats">
              <h3>Usage Statistics</h3>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Sessions</span>
                  <span className="stat-value">{stats.sessions}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Words</span>
                  <span className="stat-value">{stats.totalWords.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Time</span>
                  <span className="stat-value">{formatDuration(stats.totalTime)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Duration</span>
                  <span className="stat-value">{formatDuration(stats.avgDuration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="rules-content">
          <p className="rules-help">
            Define content rules to customize what gets read. Format: 
            <code>type: selector/pattern (priority: number)</code>
          </p>
          
          <textarea
            className="rules-editor"
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            rows={10}
            placeholder={`skip: .advertisement (priority: 10)
include: .main-content (priority: 9)
skip: nav, footer (priority: 8)`}
          />
          
          <button onClick={handleRulesChange} className="save-rules-btn">
            Save Rules
          </button>

          <div className="predefined-rules">
            <h4>Common Rules</h4>
            <button onClick={() => setCustomRules(customRules + '\nskip: .cookie-banner (priority: 10)')}>
              + Skip Cookie Banners
            </button>
            <button onClick={() => setCustomRules(customRules + '\nskip: .social-share (priority: 8)')}>
              + Skip Social Buttons
            </button>
            <button onClick={() => setCustomRules(customRules + '\ninclude: article, main (priority: 9)')}>
              + Focus on Main Content
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <DomainHistory domain={domain} />
      )}
    </div>
  );
}

// Domain History Component
function DomainHistory({ domain }: { domain: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const intelligenceService = DomainIntelligenceService.getInstance();

  useEffect(() => {
    loadHistory();
  }, [domain, searchQuery]);

  const loadHistory = async () => {
    const results = await intelligenceService.searchHistory(searchQuery, { domain });
    setSessions(results);
  };

  const handleClearHistory = async () => {
    if (confirm(`Clear all history for ${domain}?`)) {
      await intelligenceService.clearHistory({ domain });
      loadHistory();
    }
  };

  return (
    <div className="domain-history">
      <div className="history-controls">
        <input
          type="text"
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="history-search"
        />
        <button onClick={handleClearHistory} className="clear-history-btn">
          Clear History
        </button>
      </div>

      <div className="history-list">
        {sessions.length === 0 ? (
          <p className="no-history">No reading history for this domain</p>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="history-item">
              <div className="history-header">
                <h4>{session.title}</h4>
                <span className="history-date">
                  {new Date(session.startTime).toLocaleDateString()}
                </span>
              </div>
              <p className="history-excerpt">{session.excerpt}</p>
              <div className="history-meta">
                <span>{session.wordCount} words</span>
                <span>{Math.round(session.duration)}s</span>
                <span>{session.completed ? '✓ Completed' : '⚬ Partial'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### 3. Content Analysis Component

```typescript
// src/content/ContentAnalyzer.ts
export class ContentAnalyzer {
  private intelligenceService = DomainIntelligenceService.getInstance();

  async analyzeCurrentPage(): Promise<{
    recommendation: string;
    mainContent: HTMLElement | null;
    skipElements: HTMLElement[];
    readingTime: number;
  }> {
    const domain = window.location.hostname;
    const profile = await this.intelligenceService.getProfile(domain);
    
    // Get all text content
    const bodyText = document.body.innerText;
    
    // Analyze using intelligence service
    const analysis = await this.intelligenceService.analyzeContent({
      domain,
      url: window.location.href,
      content: bodyText,
    });

    // Find main content element
    const mainContent = this.findMainContent(profile);
    
    // Find elements to skip
    const skipElements = this.findSkipElements(profile);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      analysis.contentType,
      analysis.readingTime,
      skipElements.length
    );

    return {
      recommendation,
      mainContent,
      skipElements,
      readingTime: analysis.readingTime,
    };
  }

  private findMainContent(profile: DomainProfile): HTMLElement | null {
    // Try custom selectors first
    if (profile.settings.customSelectors?.content) {
      for (const selector of profile.settings.customSelectors.content) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) return element;
      }
    }

    // Try rules
    const includeRules = profile.rules.filter(r => r.type === 'include');
    for (const rule of includeRules) {
      if (rule.selector) {
        const element = document.querySelector(rule.selector) as HTMLElement;
        if (element) return element;
      }
    }

    // Fallback to common patterns
    const commonSelectors = [
      'main', 'article', '[role="main"]', 
      '.main-content', '#main-content', '.content'
    ];
    
    for (const selector of commonSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    }

    // Use heuristics
    return this.findMainContentHeuristic();
  }

  private findMainContentHeuristic(): HTMLElement | null {
    const candidates = Array.from(document.querySelectorAll('div, section, article'));
    
    let bestCandidate = null;
    let bestScore = 0;

    candidates.forEach(element => {
      const text = element.innerText || '';
      const wordCount = text.split(/\s+/).length;
      
      // Score based on text density
      const score = wordCount / (element.getElementsByTagName('*').length + 1);
      
      // Bonus for semantic elements
      if (element.tagName === 'ARTICLE') score *= 2;
      if (element.tagName === 'MAIN') score *= 2;
      
      // Penalty for likely non-content
      if (element.className.includes('sidebar')) score *= 0.1;
      if (element.className.includes('nav')) score *= 0.1;
      if (element.className.includes('footer')) score *= 0.1;
      
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = element as HTMLElement;
      }
    });

    return bestCandidate;
  }

  private findSkipElements(profile: DomainProfile): HTMLElement[] {
    const skipElements: HTMLElement[] = [];
    
    // Apply skip rules
    const skipRules = profile.rules.filter(r => r.type === 'skip');
    for (const rule of skipRules) {
      if (rule.selector) {
        const elements = document.querySelectorAll(rule.selector);
        elements.forEach(el => skipElements.push(el as HTMLElement));
      }
    }

    // Apply custom skip selectors
    if (profile.settings.customSelectors?.skip) {
      for (const selector of profile.settings.customSelectors.skip) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => skipElements.push(el as HTMLElement));
      }
    }

    // Remove duplicates
    return Array.from(new Set(skipElements));
  }

  private generateRecommendation(
    contentType: string,
    readingTime: number,
    skipCount: number
  ): string {
    const recommendations = [];

    if (contentType === 'article' && readingTime > 10) {
      recommendations.push('Use continuous mode for this long article');
    }

    if (contentType === 'documentation') {
      recommendations.push('Page reader mode recommended for documentation');
    }

    if (skipCount > 5) {
      recommendations.push(`Skipping ${skipCount} non-content sections`);
    }

    if (readingTime < 1) {
      recommendations.push('Quick read - selection mode is perfect');
    }

    return recommendations.join('. ') || 'Ready to read';
  }

  highlightContent(mainContent: HTMLElement | null, skipElements: HTMLElement[]): void {
    // Highlight main content
    if (mainContent) {
      mainContent.style.outline = '2px solid #4CAF50';
      mainContent.style.outlineOffset = '4px';
    }

    // Dim skip elements
    skipElements.forEach(element => {
      element.style.opacity = '0.3';
      element.style.filter = 'grayscale(100%)';
    });
  }

  removeHighlights(): void {
    // Remove main content highlight
    const highlighted = document.querySelector('[style*="outline"]');
    if (highlighted) {
      (highlighted as HTMLElement).style.outline = '';
      (highlighted as HTMLElement).style.outlineOffset = '';
    }

    // Remove dimming
    const dimmed = document.querySelectorAll('[style*="opacity: 0.3"]');
    dimmed.forEach(element => {
      (element as HTMLElement).style.opacity = '';
      (element as HTMLElement).style.filter = '';
    });
  }
}
```

## Testing

### Unit Tests

```typescript
// src/services/__tests__/DomainIntelligenceService.test.ts
describe('DomainIntelligenceService', () => {
  let service: DomainIntelligenceService;

  beforeEach(() => {
    service = DomainIntelligenceService.getInstance();
    service.clearHistory();
  });

  describe('Profile Management', () => {
    test('should create default profile for new domain', async () => {
      const profile = await service.getProfile('example.com');
      
      expect(profile.domain).toBe('example.com');
      expect(profile.settings.autoSkipNav).toBe(true);
      expect(profile.rules.length).toBeGreaterThan(0);
    });

    test('should load predefined rules for known domains', async () => {
      const githubProfile = await service.getProfile('github.com');
      
      const hasGithubRules = githubProfile.rules.some(r => 
        r.selector?.includes('.Header')
      );
      expect(hasGithubRules).toBe(true);
    });

    test('should update profile settings', async () => {
      await service.updateProfile('example.com', {
        settings: { defaultSpeed: 1.5 }
      });
      
      const profile = await service.getProfile('example.com');
      expect(profile.settings.defaultSpeed).toBe(1.5);
    });
  });

  describe('Session Tracking', () => {
    test('should track reading sessions', async () => {
      const sessionId = service.startSession({
        domain: 'example.com',
        url: 'https://example.com/article',
        title: 'Test Article',
        text: 'This is test content',
        voice: 'Test Voice',
        speed: 1.0,
      });
      
      expect(sessionId).toBeTruthy();
      
      service.updateSession({ progress: 50 });
      await service.endSession(true);
      
      const history = await service.searchHistory('');
      expect(history.length).toBe(1);
      expect(history[0].completed).toBe(true);
    });

    test('should respect privacy mode', () => {
      service.setPrivacyMode(true);
      
      const sessionId = service.startSession({
        domain: 'example.com',
        url: 'https://example.com',
        title: 'Private',
        text: 'Private content',
        voice: 'Test',
        speed: 1.0,
      });
      
      expect(sessionId).toBe('');
      expect(service.getHistoryStats().totalSessions).toBe(0);
    });
  });

  describe('History Search', () => {
    beforeEach(async () => {
      // Add test sessions
      for (let i = 0; i < 5; i++) {
        service.startSession({
          domain: i < 3 ? 'example.com' : 'test.com',
          url: `https://example.com/article-${i}`,
          title: `Article ${i}`,
          text: `Content for article ${i}`,
          voice: 'Test',
          speed: 1.0,
        });
        await service.endSession(true);
      }
    });

    test('should search by domain', async () => {
      const results = await service.searchHistory('', {
        domain: 'example.com'
      });
      
      expect(results.length).toBe(3);
    });

    test('should search by text content', async () => {
      const results = await service.searchHistory('article 2');
      
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Article 2');
    });

    test('should filter by date range', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);
      
      const results = await service.searchHistory('', {
        startDate: yesterday,
        endDate: tomorrow,
      });
      
      expect(results.length).toBe(5);
    });
  });

  describe('Content Analysis', () => {
    test('should analyze content with domain rules', async () => {
      const analysis = await service.analyzeContent({
        domain: 'github.com',
        url: 'https://github.com/user/repo',
        content: 'Header content. Main repository content. Footer content.',
      });
      
      expect(analysis.skippedSections.length).toBeGreaterThan(0);
      expect(analysis.contentType).toBeTruthy();
      expect(analysis.readingTime).toBeGreaterThan(0);
    });

    test('should detect content types', async () => {
      const docAnalysis = await service.analyzeContent({
        domain: 'example.com',
        url: 'https://example.com/docs/guide',
        content: 'Documentation content with code blocks',
      });
      
      expect(docAnalysis.contentType).toBe('documentation');
    });
  });

  describe('History Export', () => {
    test('should export as JSON', () => {
      const json = service.exportHistory('json');
      const data = JSON.parse(json);
      
      expect(data.version).toBe(1);
      expect(Array.isArray(data.sessions)).toBe(true);
      expect(data.statistics).toBeTruthy();
    });

    test('should export as CSV', () => {
      const csv = service.exportHistory('csv');
      const lines = csv.split('\n');
      
      expect(lines[0]).toContain('Date,Time,Domain');
    });
  });
});
```

## Success Metrics

1. **Performance Metrics**
   - Profile load time: < 10ms
   - History search: < 100ms for 10k entries
   - Content analysis: < 200ms
   - Storage usage: < 100MB

2. **Intelligence Metrics**
   - Content detection accuracy: > 90%
   - Skip rule effectiveness: > 95%
   - Main content identification: > 85%
   - Reading time estimation: ±10%

3. **User Experience Metrics**
   - Setting persistence: 100%
   - History accuracy: 100%
   - Domain recognition: 100%
   - Privacy mode compliance: 100%

## Dependencies

### Internal Dependencies
- Storage Service from Phase 5
- Text Processor from Phase 6.2
- TTS Controller from Phase 2

### External Dependencies
- None (all functionality self-contained)

## Risks and Mitigation

### High-Risk Items
1. **Storage Limits**
   - Risk: Exceeding Chrome storage quota
   - Mitigation: Auto-cleanup, compression

2. **Privacy Concerns**
   - Risk: Unintended data collection
   - Mitigation: Privacy mode, local-only storage

### Medium-Risk Items
1. **Content Detection Accuracy**
   - Risk: Missing main content
   - Mitigation: Multiple detection strategies

2. **Performance Impact**
   - Risk: Slow page analysis
   - Mitigation: Async processing, caching

## Acceptance Criteria

- [ ] Domain profiles save automatically
- [ ] History tracks all sessions accurately
- [ ] Search works across 10k+ entries
- [ ] Content detection works on major sites
- [ ] Skip rules apply correctly
- [ ] Privacy mode disables all tracking
- [ ] Export formats work correctly
- [ ] Analytics show accurate statistics
- [ ] Custom rules can be created
- [ ] All tests pass with >90% coverage