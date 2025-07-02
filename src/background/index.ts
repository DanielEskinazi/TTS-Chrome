import { MessageType, Message, MessageResponse } from '@common/types/messages';
import { VoiceManager, VoiceInfo } from '@common/voice-manager';
import { SpeedManager } from './speedManager';
import { VolumeControlService } from './services/volume-control.service';
// Temporary debug logging - replace devLog with console.log for debugging
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[TTS-Debug]', ...args);
  }
};

interface SelectionData {
  text: string;
  url: string;
  title: string;
  timestamp: number;
}

class SelectionManager {
  private currentSelection: SelectionData | null = null;
  private activeTab: chrome.tabs.Tab | null = null;
  private contextMenuManager: ContextMenuManager | null = null;

  constructor() {
    this.init();
  }

  public setContextMenuManager(contextMenuManager: ContextMenuManager) {
    this.contextMenuManager = contextMenuManager;
  }

  private init() {
    // Listen for tab changes to clear selection
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    debugLog('Selection Manager initialized');
  }

  public handleSelectionMessage(request: Message, sender: chrome.runtime.MessageSender): Record<string, unknown> | null {
    switch (request.type) {
      case MessageType.SELECTION_CHANGED:
        if (request.payload && sender.tab) {
          this.updateSelection(request.payload, sender.tab);
        }
        return { success: true };
        
      case MessageType.SELECTION_CLEARED:
        this.clearSelection();
        return { success: true };
        
      case MessageType.GET_SELECTION:
        return {
          selection: this.currentSelection,
          tabId: this.activeTab?.id
        };
        
      case MessageType.SELECTION_ERROR:
        if (request.payload) {
          debugLog('Selection error reported:', request.payload);
        }
        return { success: true };
        
      default:
        return null; // Not handled by this manager
    }
  }

  private updateSelection(selectionData: Record<string, unknown>, tab: chrome.tabs.Tab) {
    if (typeof selectionData.text === 'string' && typeof selectionData.url === 'string') {
      this.currentSelection = {
        text: selectionData.text,
        url: selectionData.url,
        title: typeof selectionData.title === 'string' ? selectionData.title : '',
        timestamp: Date.now()
      };
      
      this.activeTab = tab;
      
      // Update context menu state
      this.updateContextMenuState();
      
      debugLog('Selection updated:', this.currentSelection.text.substring(0, 50) + '...');
    }
  }

  private clearSelection() {
    this.currentSelection = null;
    this.activeTab = null;
    
    // Update context menu state
    this.updateContextMenuState();
    
    debugLog('Selection cleared');
  }

  private updateContextMenuState() {
    const hasSelection = this.currentSelection !== null;
    
    // Update context menu state using the ContextMenuManager
    if (this.contextMenuManager) {
      this.contextMenuManager.updateMenuState(hasSelection);
    }
  }

  private handleTabChange(_activeInfo: chrome.tabs.TabActiveInfo) {
    // Clear selection when switching tabs
    this.clearSelection();
  }

  private handleTabUpdate(_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab) {
    // Clear selection when page reloads
    if (changeInfo.status === 'loading') {
      this.clearSelection();
    }
  }

  // Public methods for other components
  public hasSelection(): boolean {
    return this.currentSelection !== null;
  }

  public getSelectionText(): string {
    return this.currentSelection ? this.currentSelection.text : '';
  }

  public getSelectionInfo(): SelectionData | null {
    return this.currentSelection;
  }
}

class ContextMenuManager {
  private speakMenuId = 'tts-speak';
  private stopMenuId = 'tts-stop';
  private pauseResumeMenuId = 'tts-pause-resume';
  private isMenuCreated = false;
  private selectionManager: SelectionManager;
  private ttsManager: TTSManager | null = null;
  private voiceManager: VoiceManager;

  constructor(selectionManager: SelectionManager, voiceManager: VoiceManager) {
    this.selectionManager = selectionManager;
    this.voiceManager = voiceManager;
    this.init();
  }

  public setTTSManager(ttsManager: TTSManager) {
    this.ttsManager = ttsManager;
  }

  private init() {
    // Create context menu when extension loads
    chrome.runtime.onStartup.addListener(() => this.createContextMenu());
    chrome.runtime.onInstalled.addListener(() => this.createContextMenu());
    
    // Listen for context menu clicks
    if (chrome.contextMenus && chrome.contextMenus.onClicked) {
      chrome.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));
    }
    
    debugLog('Context Menu Manager initialized');
  }

  public createContextMenu() {
    try {
      if (chrome.contextMenus) {
        // Remove existing menu if present
        if (this.isMenuCreated) {
          chrome.contextMenus.removeAll(() => {
            this.createMenu();
          });
        } else {
          this.createMenu();
        }
      } else {
        debugLog('Warning: chrome.contextMenus API not available');
      }
    } catch (error) {
      debugLog('Error in createContextMenu:', error);
    }
  }

  private createMenu() {
    // Create "Speak" menu item
    chrome.contextMenus.create({
      id: this.speakMenuId,
      title: 'Speak',
      contexts: ['selection'],
      enabled: false, // Initially disabled
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error creating speak menu:', chrome.runtime.lastError);
        return;
      }
      
      // Create "Stop Speaking" menu item
      chrome.contextMenus.create({
        id: this.stopMenuId,
        title: 'Stop Speaking',
        contexts: ['page', 'selection'],
        enabled: false, // Initially disabled
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      }, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error creating stop menu:', chrome.runtime.lastError);
          return;
        }
        
        // Create "Pause/Resume" menu item
        chrome.contextMenus.create({
          id: this.pauseResumeMenuId,
          title: 'Pause Speaking',
          contexts: ['page', 'selection'],
          enabled: false, // Initially disabled
          documentUrlPatterns: ['http://*/*', 'https://*/*']
        }, () => {
          if (chrome.runtime.lastError) {
            debugLog('Error creating pause/resume menu:', chrome.runtime.lastError);
          } else {
            this.isMenuCreated = true;
            debugLog('TTS context menus created successfully');
            this.syncMenuWithCurrentState();
          }
        });
      });
    });
  }


  private async syncMenuWithCurrentState() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: MessageType.GET_SELECTION })
          .then(response => {
            if (response && response.hasSelection) {
              this.updateMenuState(true);
            }
          })
          .catch(error => {
            debugLog('Could not sync menu state:', error);
          });
      }
    } catch (error) {
      debugLog('Error syncing menu state:', error);
    }
  }

  private async handleMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
    try {
      switch (info.menuItemId) {
        case this.speakMenuId:
          if (tab?.id) {
            await this.triggerTTS(info, tab);
          }
          break;
          
        case this.stopMenuId:
          if (tab?.id) {
            await this.stopTTS(tab);
          }
          break;
          
        case this.pauseResumeMenuId:
          if (tab?.id) {
            await this.togglePauseTTS(tab);
          }
          break;
          
        default:
          debugLog('Unknown menu item clicked:', info.menuItemId);
      }
    } catch (error) {
      debugLog('Error handling menu click:', error);
      if (tab?.id) {
        this.showErrorFeedback(tab, error as Error);
      }
    }
  }


  private async triggerTTS(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab, voice?: VoiceInfo) {
    try {
      // Validate tab and selection
      if (!tab || !tab.id) {
        throw new Error('Invalid tab information');
      }

      // Get fresh selection data
      const response = await this.getSelectionFromTab(tab.id);
      
      if (!response || !response.hasSelection) {
        // Fallback to context menu selection text
        if (!info.selectionText) {
          throw new Error('No text selected');
        }
      }

      const textToSpeak = response?.text || info.selectionText || '';
      
      // Validate text content
      if (!textToSpeak || !this.isValidTextForTTS(textToSpeak)) {
        throw new Error('Selected text is not suitable for TTS');
      }

      // Start TTS with retry logic and optional voice
      await this.startTTSWithRetry(textToSpeak, tab, voice);
      
      this.showTTSFeedback(tab, 'started');
      
    } catch (error) {
      debugLog('TTS trigger error:', error);
      this.handleTTSError(error as Error, tab);
    }
  }

  private async stopTTS(tab: chrome.tabs.Tab) {
    try {
      // Stop TTS using the TTS manager
      if (this.ttsManager) {
        await this.ttsManager.stopTTS();
      }
      
      // Show stop feedback
      this.showStopFeedback(tab);
      
      debugLog('TTS stopped via context menu');
      
    } catch (error) {
      debugLog('Error stopping TTS:', error);
      throw error;
    }
  }

  private async togglePauseTTS(tab: chrome.tabs.Tab) {
    try {
      const state = await this.ttsManager?.togglePause();
      
      // Show appropriate feedback
      const message = state?.isPaused ? 'paused' : 'resumed';
      this.showPauseFeedback(tab, message);
      
      debugLog(`TTS ${message} via context menu`);
      
    } catch (error) {
      debugLog('Error toggling pause:', error);
      throw error;
    }
  }

  private showPauseFeedback(tab: chrome.tabs.Tab, status: string) {
    chrome.tabs.sendMessage(tab.id!, {
      type: MessageType.TTS_FEEDBACK,
      payload: { status: status }
    }).catch(error => {
      debugLog('Could not send pause feedback to tab:', error);
    });
  }

  private showStopFeedback(tab: chrome.tabs.Tab) {
    chrome.tabs.sendMessage(tab.id!, {
      type: MessageType.TTS_FEEDBACK,
      payload: { status: 'stopped' }
    }).catch(error => {
      debugLog('Could not send stop feedback to tab:', error);
    });
  }

  private showErrorFeedback(tab: chrome.tabs.Tab, error: Error) {
    chrome.tabs.sendMessage(tab.id!, {
      type: MessageType.TTS_FEEDBACK,
      payload: { 
        status: 'error',
        message: error.message 
      }
    }).catch(error => {
      debugLog('Could not send error feedback to tab:', error);
    });
  }

  private async getSelectionFromTab(tabId: number, retries = 2): Promise<{ hasSelection: boolean; text?: string; info?: unknown }> {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: MessageType.GET_SELECTION
        });
        return response;
      } catch (error) {
        if (i === retries) {
          throw new Error('Could not communicate with tab');
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    // This should never be reached, but TypeScript needs it
    throw new Error('Could not communicate with tab');
  }

  private isValidTextForTTS(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    const cleanText = text.trim();
    if (cleanText.length === 0) return false;
    if (cleanText.length > 10000) return false; // Reasonable limit
    
    // Check for readable content
    const readableChars = cleanText.replace(/[^\w\s]/g, '').length;
    return readableChars > 0;
  }

  private async startTTSWithRetry(text: string, tab: chrome.tabs.Tab, voice?: VoiceInfo, retries = 1): Promise<void> {
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.startTTS(text, tab, voice);
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  private async startTTS(text: string, tab: chrome.tabs.Tab, voice?: VoiceInfo): Promise<void> {
    // Route through TTSManager to ensure proper state management
    if (!this.ttsManager) {
      throw new Error('TTS Manager not available');
    }
    
    const startTTSData = {
      text: text,
      voice: voice || this.voiceManager.getSelectedVoice(),
      tabId: tab.id
    };
    
    debugLog('[Context-Menu-Debug] Starting TTS via TTSManager:', startTTSData);
    
    // Use TTSManager to handle TTS with proper state management
    await this.ttsManager.handleMessage({
      type: MessageType.START_TTS,
      payload: startTTSData
    }, { tab: tab } as chrome.runtime.MessageSender);
  }

  private showTTSFeedback(tab: chrome.tabs.Tab, status: string) {
    // Send feedback to content script for user notification
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: MessageType.TTS_FEEDBACK,
        payload: { status: status }
      }).catch(error => {
        debugLog('Could not send feedback to tab:', error);
      });
    }
  }

  private handleTTSError(error: Error, tab: chrome.tabs.Tab) {
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

  private categorizeError(error: Error): string {
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

    const ttsState = this.ttsManager ? this.ttsManager.getState() : { isActive: false, isPaused: false };
    const isPlaying = Boolean(ttsState.isActive) && !ttsState.isPaused;
    const isPaused = Boolean(ttsState.isPaused);
    const isActive = Boolean(ttsState.isActive);

    debugLog('[Context-Menu-Debug] updateMenuState called - hasSelection:', hasSelection, 'isPlaying:', isPlaying, 'isPaused:', isPaused, 'isActive:', isActive);

    // Update speak menu (enabled when text is selected and not playing)
    const speakMenuProperties = {
      enabled: hasSelection && !isActive,
      title: hasSelection ? 'Speak' : 'Speak (select text first)'
    };

    // Update stop menu (enabled when playing or paused)
    const stopMenuProperties = {
      enabled: isActive
    };

    // Update pause/resume menu
    const pauseResumeProperties = {
      enabled: isActive,
      title: isPaused ? 'Resume Speaking' : 'Pause Speaking'
    };

    try {
      chrome.contextMenus.update(this.speakMenuId, speakMenuProperties, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error updating speak menu:', chrome.runtime.lastError);
        }
      });

      chrome.contextMenus.update(this.stopMenuId, stopMenuProperties, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error updating stop menu:', chrome.runtime.lastError);
        }
      });

      chrome.contextMenus.update(this.pauseResumeMenuId, pauseResumeProperties, () => {
        if (chrome.runtime.lastError) {
          debugLog('Error updating pause/resume menu:', chrome.runtime.lastError);
        } else {
          debugLog('[Context-Menu-Debug] Context menus updated - speak:', speakMenuProperties.enabled, 'stop:', stopMenuProperties.enabled, 'pause/resume:', pauseResumeProperties.enabled, 'title:', pauseResumeProperties.title);
        }
      });

    } catch (error) {
      debugLog('Error in updateMenuState:', error);
    }
  }

  public updateMenusForTTSState(state: string, _playbackState?: Record<string, unknown>) {
    if (!this.isMenuCreated) return;

    // Use consistent logic with proper state mapping
    const isActive = ['started', 'resumed', 'paused'].includes(state);
    const isPlaying = isActive && state !== 'paused';
    const isPaused = state === 'paused';
    const hasSelection = this.selectionManager.hasSelection();

    debugLog('[Context-Menu-Debug] updateMenusForTTSState called - state:', state, 'isPlaying:', isPlaying, 'isPaused:', isPaused, 'isActive:', isActive, 'hasSelection:', hasSelection);

    // Update speak menu (enabled when text is selected and not active)
    chrome.contextMenus.update(this.speakMenuId, {
      enabled: hasSelection && !isActive,
      title: hasSelection ? 'Speak' : 'Speak (select text first)'
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error updating speak menu:', chrome.runtime.lastError);
      }
    });

    // Update stop menu (enabled when active)
    chrome.contextMenus.update(this.stopMenuId, {
      enabled: isActive,
      title: 'Stop Speaking'
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error updating stop menu:', chrome.runtime.lastError);
      }
    });

    // Update pause/resume menu (enabled when active)
    chrome.contextMenus.update(this.pauseResumeMenuId, {
      enabled: isActive,
      title: isPaused ? 'Resume Speaking' : 'Pause Speaking'
    }, () => {
      if (chrome.runtime.lastError) {
        debugLog('Error updating pause/resume menu:', chrome.runtime.lastError);
      } else {
        debugLog('[Context-Menu-Debug] Menus updated for TTS state:', state, 'speak enabled:', hasSelection && !isActive, 'stop enabled:', isActive, 'pause/resume enabled:', isActive, 'pause/resume title:', isPaused ? 'Resume Speaking' : 'Pause Speaking');
      }
    });
  }

  public destroy() {
    if (this.isMenuCreated && chrome.contextMenus) {
      chrome.contextMenus.removeAll();
      this.isMenuCreated = false;
    }
  }
}

class TTSManager {
  private isActive = false;
  private isPaused = false;
  private currentTabId: number | null = null;
  private stopTimeout: NodeJS.Timeout | null = null;
  private forceStopAttempts = 0;
  private contextMenuManager: ContextMenuManager | null = null;
  private voiceManager: VoiceManager;
  private speedManager: SpeedManager;

  constructor(voiceManager: VoiceManager, speedManager: SpeedManager) {
    this.voiceManager = voiceManager;
    this.speedManager = speedManager;
    this.init();
  }

  public setContextMenuManager(contextMenuManager: ContextMenuManager) {
    this.contextMenuManager = contextMenuManager;
  }

  private init(): void {
    // Stop TTS when tab changes
    chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    
    debugLog('TTS Manager initialized with tab navigation listeners');
  }

  async handleMessage(request: Message, sender: chrome.runtime.MessageSender): Promise<Record<string, unknown>> {
    switch (request.type) {
      case MessageType.START_TTS:
        return await this.startTTS(request.payload, sender);
        
      case MessageType.STOP_TTS:
        return await this.stopTTS(request.payload);
        
      case MessageType.FORCE_STOP_TTS:
        return await this.forceStopTTS();
        
      case MessageType.PAUSE_TTS:
        return await this.pauseTTS();
        
      case MessageType.RESUME_TTS:
        return await this.resumeTTS();
        
      case MessageType.TOGGLE_PAUSE_TTS: {
        const state = await this.togglePause();
        return { ...state };
      }
        
      case MessageType.TTS_STATE_CHANGED:
        return this.handleStateChange(request.payload || {}, sender);
        
      case MessageType.TTS_ERROR:
        return this.handleTTSError(request.payload || {});

      case MessageType.GET_TTS_STATE:
        return this.getState();

      case MessageType.GET_VOICE_DATA:
        return {
          voices: this.voiceManager.getAvailableVoices(),
          selectedVoice: this.voiceManager.getSelectedVoice()
        };
        
      case MessageType.SELECT_VOICE:
        if (request.payload && typeof request.payload.voiceName === 'string') {
          const selected = await this.voiceManager.selectVoice(request.payload.voiceName);
          return { success: selected };
        }
        return { success: false };
        
      case MessageType.PREVIEW_VOICE:
        if (request.payload && typeof request.payload.voiceName === 'string') {
          await this.previewVoice(request.payload.voiceName);
          return { success: true };
        }
        return { success: false };
        
      case MessageType.UPDATE_VOICE_DATA:
        if (request.payload && Array.isArray(request.payload.voices)) {
          await this.voiceManager.updateVoiceData(request.payload.voices);
          return { success: true };
        }
        return { success: false };
        
      case MessageType.GET_SPEED_INFO: {
        const speedInfo = await this.speedManager.getSpeedInfo();
        return {
          speedInfo: speedInfo
        };
      }
        
      case MessageType.SET_SPEED:
        if (request.data && typeof request.data.speed === 'number') {
          const set = await this.speedManager.setSpeed(request.data.speed);
          
          // If speed was changed and TTS is active, notify the content script
          if (set && this.isActive && this.currentTabId) {
            try {
              await chrome.tabs.sendMessage(this.currentTabId, {
                type: MessageType.CHANGE_SPEED,
                data: { speed: request.data.speed }
              });
              console.log('Speed change sent to active tab:', this.currentTabId, 'new speed:', request.data.speed);
            } catch (error) {
              console.warn('Could not send speed change to tab:', error);
            }
          }
          
          return { success: set };
        }
        return { success: false };
        
      case MessageType.INCREMENT_SPEED:
        await this.speedManager.incrementSpeed();
        
        // If TTS is active, notify the content script of the new speed
        if (this.isActive && this.currentTabId) {
          const currentSpeed = this.speedManager.getCurrentSpeed();
          try {
            await chrome.tabs.sendMessage(this.currentTabId, {
              type: MessageType.CHANGE_SPEED,
              data: { speed: currentSpeed }
            });
            console.log('Speed increment sent to active tab:', this.currentTabId, 'new speed:', currentSpeed);
          } catch (error) {
            console.warn('Could not send speed increment to tab:', error);
          }
        }
        
        return { success: true };
        
      case MessageType.DECREMENT_SPEED:
        await this.speedManager.decrementSpeed();
        
        // If TTS is active, notify the content script of the new speed
        if (this.isActive && this.currentTabId) {
          const currentSpeed = this.speedManager.getCurrentSpeed();
          try {
            await chrome.tabs.sendMessage(this.currentTabId, {
              type: MessageType.CHANGE_SPEED,
              data: { speed: currentSpeed }
            });
            console.log('Speed decrement sent to active tab:', this.currentTabId, 'new speed:', currentSpeed);
          } catch (error) {
            console.warn('Could not send speed decrement to tab:', error);
          }
        }
        
        return { success: true };
        
      case MessageType.GET_CURRENT_TEXT_LENGTH: {
        const length = await this.getCurrentTextLength();
        return { length: length };
      }
        
      default:
        throw new Error('Unknown TTS message type');
    }
  }

  private async previewVoice(voiceName: string): Promise<void> {
    const voices = this.voiceManager.getAvailableVoices();
    const voice = voices.find(v => v.name === voiceName);
    
    debugLog('Preview voice requested:', voiceName, 'Found:', voice ? 'yes' : 'no');
    
    if (voice) {
      // Send preview command to active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      debugLog('Active tab:', activeTab?.id, activeTab?.url);
      
      if (activeTab?.id) {
        // Check if the tab URL allows content scripts
        if (activeTab.url && (activeTab.url.startsWith('chrome://') || 
            activeTab.url.startsWith('chrome-extension://') || 
            activeTab.url.startsWith('edge://'))) {
          debugLog('Cannot inject content script into:', activeTab.url);
          // For these pages, we could show an error or handle differently
          throw new Error('Voice preview not available on this page');
        }
        
        try {
          await chrome.tabs.sendMessage(activeTab.id, {
            type: MessageType.PREVIEW_VOICE,
            payload: { voice: voice }
          });
          debugLog('Preview message sent to tab');
        } catch (error) {
          debugLog('Error sending preview message:', error);
          throw error;
        }
      } else {
        throw new Error('No active tab found for preview');
      }
    } else {
      throw new Error('Voice not found: ' + voiceName);
    }
  }

  private async startTTS(data: Record<string, unknown> | undefined, sender: chrome.runtime.MessageSender): Promise<Record<string, unknown>> {
    try {
      if (!data || typeof data.text !== 'string') {
        throw new Error('No text provided for TTS');
      }

      const { text } = data;
      const tabId = typeof data.tabId === 'number' ? data.tabId : sender.tab?.id;
      
      if (!tabId) {
        throw new Error('No tab ID available for TTS');
      }

      // Stop any existing TTS first
      if (this.isActive) {
        await this.stopTTS({ source: 'new-request' });
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Reset force stop attempts
      this.forceStopAttempts = 0;

      // Get voice from data or use default
      const voice = data.voice || this.voiceManager.getSelectedVoice();
      
      // Get current speed
      const speed = this.speedManager.getCurrentSpeed();
      
      // Get current volume from VolumeControlService
      let volume = 1.0; // Default volume
      if (volumeControlService) {
        const volumeState = await volumeControlService.handleMessage(
          { type: MessageType.GET_VOLUME_STATE },
          sender
        );
        console.log('[TTSManager] Got volume state:', volumeState);
        if (volumeState && typeof volumeState.effectiveVolume === 'number') {
          // Convert from 0-100 range to 0-1 range for Web Speech API
          volume = volumeState.effectiveVolume / 100;
          console.log('[TTSManager] Using volume:', volume, 'from effective volume:', volumeState.effectiveVolume);
        }
      } else {
        console.log('[TTSManager] VolumeControlService not available, using default volume');
      }

      // Send speech command to content script with volume
      await chrome.tabs.sendMessage(tabId, {
        type: MessageType.START_SPEECH,
        payload: { text: text, voice: voice, rate: speed, volume: volume }
      });

      // Update state immediately for context menu updates
      this.isActive = true;
      this.isPaused = false;
      this.currentTabId = tabId;
      
      // Trigger context menu update immediately
      if (this.contextMenuManager) {
        debugLog('[Context-Menu-Debug] TTS started, updating context menus');
        this.contextMenuManager.updateMenusForTTSState('started', { isPlaying: true, isPaused: false });
      }
      
      // Set up automatic stop timeout for very long text
      this.setStopTimeout();
      
      debugLog('TTS started for text:', text.substring(0, 50) + '...');
      
      return { success: true };
    } catch (error) {
      console.error('Error starting TTS:', error);
      throw error;
    }
  }

  public async stopTTS(options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const { source = 'manual', force = false } = options;
    
    try {
      if (!this.isActive && !force) {
        debugLog('TTS is not active, ignoring stop request');
        return { success: true };
      }

      // Clear the stop timeout
      this.clearStopTimeout();

      if (this.currentTabId) {
        // Send stop command to content script with robust error handling
        try {
          // First check if tab still exists
          const tab = await chrome.tabs.get(this.currentTabId).catch(() => null);
          if (tab && tab.url && !tab.url.startsWith('chrome://')) {
            await chrome.tabs.sendMessage(this.currentTabId, {
              type: MessageType.STOP_SPEECH,
              payload: { source: source }
            });
          }
        } catch (error) {
          // Silently handle expected errors (tab closed, content script not ready, etc.)
          debugLog('Stop message not sent to tab (expected):', (error as Error).message);
        }
      }

      // Reset state
      this.isActive = false;
      this.isPaused = false;
      this.currentTabId = null;
      
      // Trigger context menu update immediately
      if (this.contextMenuManager) {
        debugLog('[Context-Menu-Debug] TTS stopped, updating context menus');
        this.contextMenuManager.updateMenusForTTSState('stopped', { isPlaying: false, isPaused: false });
      }
      
      // Broadcast stop state
      this.broadcastStateChange('stopped', { isPlaying: false });
      
      debugLog('TTS stopped, source:', source);
      
      return { success: true };
    } catch (error) {
      console.error('Error stopping TTS:', error);
      
      // Force cleanup even if stop failed
      this.forceCleanup();
      throw error;
    }
  }

  private async pauseTTS(options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const { source = 'manual' } = options;
    
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.PAUSE_SPEECH,
          payload: { source: source }
        });
        
        // Update state immediately
        this.isPaused = true;
        
        // Trigger context menu update immediately
        if (this.contextMenuManager) {
          debugLog('[Context-Menu-Debug] TTS paused, updating context menus');
          this.contextMenuManager.updateMenusForTTSState('paused', { isPlaying: false, isPaused: true });
        }
        
        debugLog('TTS paused, source:', source);
        return { success: true };
      } catch (error) {
        console.error('Error pausing TTS:', error);
        return { success: false };
      }
    }
    return { success: false };
  }

  private async resumeTTS(options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const { source = 'manual' } = options;
    
    if (this.isActive && this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.RESUME_SPEECH,
          payload: { source: source }
        });
        
        // Update state immediately
        this.isPaused = false;
        
        // Trigger context menu update immediately
        if (this.contextMenuManager) {
          debugLog('[Context-Menu-Debug] TTS resumed, updating context menus');
          this.contextMenuManager.updateMenusForTTSState('resumed', { isPlaying: true, isPaused: false });
        }
        
        debugLog('TTS resumed, source:', source);
        return { success: true };
      } catch (error) {
        console.error('Error resuming TTS:', error);
        return { success: false };
      }
    }
    return { success: false };
  }

  async togglePause(options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const { source = 'manual' } = options;
    
    debugLog('[TTS-Debug] Background togglePause called - isActive:', this.isActive, 'currentTabId:', this.currentTabId, 'source:', source);
    
    if (this.isActive && this.currentTabId) {
      try {
        debugLog('[TTS-Debug] Sending TOGGLE_PAUSE_SPEECH to content script');
        const response = await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.TOGGLE_PAUSE_SPEECH,
          payload: { source: source }
        });
        
        debugLog('[TTS-Debug] Received response from content script:', response);
        return response;
      } catch (error) {
        console.error('Error toggling pause:', error);
        throw error;
      }
    }
    debugLog('[TTS-Debug] TTS not active or no tab ID, returning false');
    return { isPaused: false };
  }

  private async forceStopTTS(): Promise<Record<string, unknown>> {
    debugLog('Force stopping TTS');
    
    this.forceStopAttempts++;
    
    try {
      // Clear any timeouts
      this.clearStopTimeout();
      
      // Send force stop to content script
      if (this.currentTabId) {
        await chrome.tabs.sendMessage(this.currentTabId, {
          type: MessageType.FORCE_STOP
        }).catch(error => {
          console.warn('Could not send force stop to tab:', error);
        });
      }
      
      // Force cleanup
      this.forceCleanup();
      
      // If we've tried multiple times, show error notification
      if (this.forceStopAttempts > 2) {
        this.showForceStopNotification();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error force stopping TTS:', error);
      this.forceCleanup();
      throw error;
    }
  }

  private forceCleanup() {
    // Aggressively clean up state
    this.isActive = false;
    this.currentTabId = null;
    this.clearStopTimeout();
    
    // Broadcast stopped state
    this.broadcastStateChange('stopped', { isPlaying: false });
    
    debugLog('TTS force cleanup completed');
  }

  private setStopTimeout() {
    // Automatically stop TTS after 10 minutes to prevent runaway speech
    this.stopTimeout = setTimeout(() => {
      console.warn('TTS auto-stop timeout reached');
      this.stopTTS({ source: 'timeout', force: true });
    }, 10 * 60 * 1000); // 10 minutes
  }

  private clearStopTimeout() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  private handleStateChange(data: Record<string, unknown>, sender?: chrome.runtime.MessageSender): Record<string, unknown> {
    const state = data.state as string;
    const playbackState = data.playbackState as Record<string, unknown> || {};
    
    debugLog('[Context-Menu-Debug] Received TTS state change:', state, 'playbackState:', playbackState);
    
    switch (state) {
      case 'started':
        this.isActive = true;
        this.isPaused = false;
        // Set currentTabId from the message sender
        if (sender?.tab?.id) {
          this.currentTabId = sender.tab.id;
        } else if (!this.currentTabId) {
          // Fallback to active tab if sender doesn't have tab info
          chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs[0]?.id) {
              this.currentTabId = tabs[0].id;
            }
          }).catch(error => {
            console.warn('Could not get active tab:', error);
          });
        }
        debugLog('[Context-Menu-Debug] TTS started - isActive:', this.isActive, 'tabId:', this.currentTabId);
        break;
        
      case 'ended':
      case 'stopped':
        this.isActive = false;
        this.isPaused = false;
        this.currentTabId = null;
        this.clearStopTimeout();
        debugLog('[Context-Menu-Debug] TTS stopped - isActive:', this.isActive);
        break;
        
      case 'paused':
        this.isActive = true;
        this.isPaused = true;
        debugLog('[Context-Menu-Debug] TTS paused - isActive:', this.isActive, 'isPaused:', this.isPaused);
        break;
        
      case 'resumed':
        this.isActive = true;
        this.isPaused = false;
        debugLog('[Context-Menu-Debug] TTS resumed - isActive:', this.isActive, 'isPaused:', this.isPaused);
        break;
        
      case 'error':
        // Handle error state
        this.forceCleanup();
        debugLog('[Context-Menu-Debug] TTS error - state reset');
        break;
    }
    
    // Update context menu state immediately
    if (this.contextMenuManager) {
      debugLog('[Context-Menu-Debug] Updating context menus for state:', state);
      this.contextMenuManager.updateMenusForTTSState(state, playbackState);
    }
    
    // Broadcast state change to interested parties (popup, etc.)
    this.broadcastStateChange(state, playbackState);
    
    return { success: true };
  }

  private handleTTSError(errorData: Record<string, unknown>): Record<string, unknown> {
    console.error('TTS Error:', errorData);
    
    // Reset state on error
    this.isActive = false;
    this.currentTabId = null;
    
    // Show error notification if possible
    this.showErrorNotification(errorData);
    
    return { success: true };
  }

  private broadcastStateChange(state: string, playbackState: Record<string, unknown>): void {
    // Send to popup if open
    chrome.runtime.sendMessage({
      type: MessageType.TTS_STATE_CHANGED,
      payload: { state, playbackState }
    }).catch(() => {
      // Popup may not be open, ignore error
    });
  }

  private showErrorNotification(errorData: Record<string, unknown>): void {
    // Show browser notification for critical errors
    const errorType = errorData.errorType as string;
    if (errorType === 'initialization' || errorType === 'permission') {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'TTS Error',
        message: 'Text-to-Speech functionality is not available. Please check your browser settings.'
      });
    }
  }

  private showForceStopNotification() {
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'TTS Force Stop',
      message: 'Text-to-Speech has been force stopped due to multiple stop attempts.'
    });
  }

  // Tab change handlers
  private handleTabChange(activeInfo: chrome.tabs.TabActiveInfo) {
    // Stop TTS when switching tabs
    if (this.isActive && this.currentTabId !== activeInfo.tabId) {
      this.stopTTS({ source: 'navigation' });
    }
  }

  private handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab) {
    // Stop TTS when page reloads or navigates
    if (changeInfo.status === 'loading' && this.currentTabId === tabId) {
      this.stopTTS({ source: 'navigation' });
    }
  }

  private handleTabRemoved(tabId: number, _removeInfo: chrome.tabs.TabRemoveInfo) {
    // Clean up if the tab with active TTS is closed
    if (this.currentTabId === tabId) {
      this.forceCleanup();
    }
  }

  // Public API methods
  getState(): Record<string, unknown> {
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      currentTabId: this.currentTabId,
      forceStopAttempts: this.forceStopAttempts,
      hasTimeout: this.stopTimeout !== null
    };
  }
  
  private async getCurrentTextLength(): Promise<number> {
    // Get length of currently selected or playing text
    if (this.currentTabId) {
      try {
        // Check if tab exists and is accessible
        const tab = await chrome.tabs.get(this.currentTabId).catch(() => null);
        if (tab && tab.url && !tab.url.startsWith('chrome://')) {
          const response = await chrome.tabs.sendMessage(this.currentTabId, {
            type: MessageType.GET_CURRENT_TEXT_LENGTH
          });
          return response.length || 0;
        }
      } catch (error) {
        // Silently handle expected errors
        debugLog('Text length not available (expected):', (error as Error).message);
      }
    }
    return 0;
  }
}

// Initialize selection manager and context menu manager with error handling
let selectionManager: SelectionManager;
let contextMenuManager: ContextMenuManager;
let ttsManager: TTSManager;
let voiceManager: VoiceManager;
let speedManager: SpeedManager;
let volumeControlService: VolumeControlService;

let isInitialized = false;
let isInitializing = false;

async function initializeExtension(): Promise<boolean> {
  // Prevent multiple simultaneous initializations
  if (isInitialized || isInitializing) {
    debugLog('Extension already initialized or initializing, skipping');
    return isInitialized;
  }

  isInitializing = true;
  debugLog('Initializing extension...');

  try {
    // Initialize managers with error isolation - create singletons
    if (!voiceManager) {
      debugLog('Initializing VoiceManager...');
      voiceManager = new VoiceManager();
      
      // Initialize voice manager in background - don't block on it
      voiceManager.init().catch(error => {
        console.warn('Voice manager initialization failed (non-critical):', error);
      });
    }
    
    // Initialize speed manager only if not already created
    if (!speedManager) {
      debugLog('Initializing SpeedManager...');
      speedManager = new SpeedManager();
      await speedManager.waitForInitialization();
      debugLog('SpeedManager ready');
    }
    
    // Initialize volume control service only if not already created
    if (!volumeControlService) {
      debugLog('Initializing VolumeControlService...');
      volumeControlService = new VolumeControlService();
      debugLog('VolumeControlService ready');
    }
    
    // Initialize core managers with singleton pattern
    if (!selectionManager) {
      selectionManager = new SelectionManager();
    }
    if (!contextMenuManager) {
      contextMenuManager = new ContextMenuManager(selectionManager, voiceManager);
    }
    if (!ttsManager) {
      ttsManager = new TTSManager(voiceManager, speedManager);
    }
    
    // Set up relationships (safe to call multiple times)
    selectionManager.setContextMenuManager(contextMenuManager);
    contextMenuManager.setTTSManager(ttsManager);
    ttsManager.setContextMenuManager(contextMenuManager);
    
    // Create context menu (idempotent operation)
    try {
      contextMenuManager.createContextMenu();
    } catch (error) {
      console.warn('Context menu creation failed (non-critical):', error);
    }
    
    isInitialized = true;
    debugLog('Extension initialization completed successfully');
    return true;
    
  } catch (error) {
    console.error('Critical initialization error:', error);
    return false;
  } finally {
    isInitializing = false;
  }
}

// Simple service worker lifecycle - let Chrome handle restarts naturally
// Handle service worker startup (browser starts or worker restarts)
chrome.runtime.onStartup.addListener(() => {
  debugLog('Browser started, initializing extension...');
  // Simple one-time initialization on browser startup
  if (!isInitialized) {
    initializeExtension();
  }
});

// Handle service worker suspension/wake (clean shutdown)
chrome.runtime.onSuspend?.addListener(() => {
  debugLog('Service worker being suspended...');
  // Clean up any pending operations
  if (ttsManager) {
    ttsManager.stopTTS({ source: 'suspension', force: true }).catch(() => {
      // Ignore errors during suspension
    });
  }
});

// Simple initialization - no aggressive restart detection
initializeExtension();

// Service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  debugLog('Extension installed:', details.reason);

  // Set default values on install
  if (details.reason === 'install') {
    try {
      chrome.storage.sync.set({
        theme: 'light',
        fontSize: 16,
      });
    } catch (error) {
      debugLog('Error setting default storage values:', error);
    }
  }

  // Context menu is now managed by ContextMenuManager
});

// Message handler
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
    debugLog('Background received message:', message, 'from:', sender);

    // If extension is not initialized, either wait or trigger initialization
    if (!isInitialized) {
      // For critical requests, try to initialize first
      if (message.type === MessageType.PING || message.type === MessageType.GET_STATE) {
        // Allow these through even if not fully initialized
      } else {
        // For other requests, trigger initialization and return error
        initializeExtension().catch(error => {
          console.error('Failed to initialize during message handling:', error);
        });
        
        sendResponse({ 
          success: false, 
          error: 'Extension is initializing, please try again in a moment' 
        });
        return true;
      }
    }

    // Try selection manager first (with safety check)
    if (selectionManager) {
      const selectionResponse = selectionManager.handleSelectionMessage(message, sender);
      if (selectionResponse !== null) {
        sendResponse({ success: true, data: selectionResponse });
        return true;
      }
    }

    // Try volume control service for volume-related messages
    if (volumeControlService) {
      const volumeMessageTypes = [
        MessageType.SET_VOLUME, 
        MessageType.GET_VOLUME_STATE, 
        MessageType.MUTE, 
        MessageType.UNMUTE, 
        MessageType.TOGGLE_MUTE, 
        MessageType.ADJUST_VOLUME, 
        MessageType.SET_DOMAIN_VOLUME, 
        MessageType.APPLY_PRESET, 
        MessageType.CLEAR_DOMAIN_VOLUME
      ];
      
      if (volumeMessageTypes.includes(message.type)) {
        try {
          volumeControlService.handleMessage(message, sender)
            .then(response => {
              sendResponse({ success: true, data: response });
              
              // If volume was changed and TTS is active, notify the content script
              if ([MessageType.SET_VOLUME, MessageType.ADJUST_VOLUME, MessageType.UNMUTE, MessageType.TOGGLE_MUTE].includes(message.type) && 
                  ttsManager && ttsManager.getState().isActive && ttsManager.getState().currentTabId) {
                const currentTabId = ttsManager.getState().currentTabId as number;
                
                // Get the current effective volume
                volumeControlService.handleMessage({ type: MessageType.GET_VOLUME_STATE }, sender)
                  .then(volumeState => {
                    if (volumeState && typeof volumeState.effectiveVolume === 'number') {
                      const chromeVolume = volumeState.effectiveVolume / 100;
                      chrome.tabs.sendMessage(currentTabId, {
                        type: MessageType.UPDATE_TTS_VOLUME,
                        volume: chromeVolume
                      }).catch(error => {
                        console.warn('Could not send volume update to active tab:', error);
                      });
                    }
                  });
              }
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Will respond asynchronously
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
          return true;
        }
      }
    }

    // Try TTS manager for TTS-related messages
    if (ttsManager && speedManager) {
      try {
        // For speed-related messages, ensure SpeedManager is ready
        if ([MessageType.GET_SPEED_INFO, MessageType.SET_SPEED, MessageType.INCREMENT_SPEED, MessageType.DECREMENT_SPEED].includes(message.type)) {
          if (!speedManager.isReady()) {
            sendResponse({ success: false, error: 'SpeedManager not yet initialized' });
            return true;
          }
        }
        
        if ([MessageType.START_TTS, MessageType.STOP_TTS, MessageType.FORCE_STOP_TTS, MessageType.PAUSE_TTS, 
             MessageType.RESUME_TTS, MessageType.TOGGLE_PAUSE_TTS, MessageType.TTS_STATE_CHANGED, MessageType.TTS_ERROR, MessageType.GET_TTS_STATE,
             MessageType.GET_VOICE_DATA, MessageType.SELECT_VOICE, MessageType.PREVIEW_VOICE, MessageType.UPDATE_VOICE_DATA,
             MessageType.GET_SPEED_INFO, MessageType.SET_SPEED, MessageType.INCREMENT_SPEED, MessageType.DECREMENT_SPEED, MessageType.GET_CURRENT_TEXT_LENGTH].includes(message.type)) {
          ttsManager.handleMessage(message, sender)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Will respond asynchronously
        }
      } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
        return true;
      }
    }

    // Handle other message types
    switch (message.type) {
      case MessageType.PING:
        // Handle ping requests from content scripts for reconnection
        sendResponse({ success: true, pong: true, initialized: isInitialized });
        return true;

      case MessageType.GET_STATE:
        handleGetState(sendResponse);
        return true; // Will respond asynchronously

      case MessageType.UPDATE_SETTINGS:
        if (message.payload) {
          handleUpdateSettings(message.payload, sendResponse);
        } else {
          sendResponse({ success: false, error: 'No settings provided' });
        }
        return true;

      case MessageType.SPEAK_TEXT:
        // Deprecated: Use Web Speech API flow via START_SPEECH instead
        sendResponse({ success: false, error: 'SPEAK_TEXT is deprecated, use Web Speech API flow' });
        return true;

      case MessageType.CONTENT_READY:
        // Content script is ready, could initialize selection state here if needed
        sendResponse({ success: true });
        return true;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
        return false;
    }
  }
);

// Context menu click handling is now managed by ContextMenuManager

// Alarm for periodic tasks with safety check
try {
  if (chrome.alarms && chrome.alarms.create) {
    chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'heartbeat') {
        debugLog('Heartbeat alarm triggered');
        // Perform periodic tasks
      }
    });
  } else {
    debugLog('Warning: chrome.alarms API not available');
  }
} catch (error) {
  debugLog('Error setting up alarms:', error);
}

// Handler functions
async function handleGetState(sendResponse: (response: MessageResponse) => void) {
  try {
    const state = await chrome.storage.sync.get(['theme', 'fontSize']);
    sendResponse({ success: true, data: state });
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message });
  }
}

async function handleUpdateSettings(
  settings: Record<string, unknown>,
  sendResponse: (response: MessageResponse) => void
) {
  try {
    await chrome.storage.sync.set(settings);
    // Notify all tabs about settings change
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: MessageType.SETTINGS_UPDATED,
          payload: settings,
        });
      }
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Removed handleSpeakText function - all TTS now uses Web Speech API flow for consistent state tracking

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  debugLog('Port connected:', port.name);
  port.onDisconnect.addListener(() => {
    debugLog('Port disconnected:', port.name);
  });
});
