import { MessageType, Message } from '@common/types/messages';

interface TabState {
  tabId: number;
  lastPing: number;
  isConnected: boolean;
  retryCount: number;
  contentScriptVersion?: string;
}

export class ContextRecoveryService {
  private tabStates: Map<number, TabState> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_COUNT = 3;
  private readonly CONTENT_SCRIPT_VERSION = '1.0.0'; // Increment when content script changes
  
  constructor() {
    this.init();
  }
  
  private init(): void {
    // Start periodic health checks
    this.startHealthChecks();
    
    // Listen for tab events
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    
    // Listen for runtime events
    chrome.runtime.onConnect.addListener(this.handlePortConnect.bind(this));
    
    console.log('[ContextRecovery] Service initialized');
  }
  
  /**
   * Start periodic health checks for connected tabs
   */
  private startHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.PING_INTERVAL);
  }
  
  /**
   * Perform health check on all registered tabs
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    const staleThreshold = this.PING_INTERVAL * 2;
    
    for (const [tabId, state] of this.tabStates) {
      if (now - state.lastPing > staleThreshold) {
        console.log(`[ContextRecovery] Tab ${tabId} appears disconnected`);
        await this.attemptRecovery(tabId);
      }
    }
  }
  
  /**
   * Register a tab for monitoring
   */
  public registerTab(tabId: number): void {
    this.tabStates.set(tabId, {
      tabId,
      lastPing: Date.now(),
      isConnected: true,
      retryCount: 0,
      contentScriptVersion: this.CONTENT_SCRIPT_VERSION
    });
    
    console.log(`[ContextRecovery] Registered tab ${tabId}`);
  }
  
  /**
   * Update tab's last ping time
   */
  public updateTabPing(tabId: number): void {
    const state = this.tabStates.get(tabId);
    if (state) {
      state.lastPing = Date.now();
      state.isConnected = true;
      state.retryCount = 0;
    }
  }
  
  /**
   * Attempt to recover a disconnected tab
   */
  public async attemptRecovery(tabId: number): Promise<boolean> {
    const state = this.tabStates.get(tabId);
    if (!state) {
      return false;
    }
    
    if (state.retryCount >= this.MAX_RETRY_COUNT) {
      console.warn(`[ContextRecovery] Max retries exceeded for tab ${tabId}`);
      this.tabStates.delete(tabId);
      return false;
    }
    
    state.retryCount++;
    console.log(`[ContextRecovery] Attempting recovery for tab ${tabId} (attempt ${state.retryCount})`);
    
    try {
      // First, try a simple ping
      const pingResponse = await this.pingTab(tabId);
      
      if (pingResponse) {
        console.log(`[ContextRecovery] Tab ${tabId} responded to ping`);
        state.isConnected = true;
        state.lastPing = Date.now();
        state.retryCount = 0;
        return true;
      }
      
      // If ping failed, try to reinject content script
      await this.reinjectContentScript(tabId);
      
      // Wait a bit for script to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try ping again
      const retryPing = await this.pingTab(tabId);
      
      if (retryPing) {
        console.log(`[ContextRecovery] Tab ${tabId} recovered after reinjection`);
        state.isConnected = true;
        state.lastPing = Date.now();
        state.retryCount = 0;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`[ContextRecovery] Recovery failed for tab ${tabId}:`, error);
      return false;
    }
  }
  
  /**
   * Ping a specific tab
   */
  private async pingTab(tabId: number): Promise<boolean> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { 
        type: MessageType.PING 
      });
      
      return response && response.pong === true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Reinject content script into a tab
   */
  private async reinjectContentScript(tabId: number): Promise<void> {
    try {
      // Get tab info first
      const tab = await chrome.tabs.get(tabId);
      
      // Check if URL is eligible for content script
      if (!tab.url || 
          tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:')) {
        throw new Error('Invalid URL for content script injection');
      }
      
      console.log(`[ContextRecovery] Reinjecting content script into tab ${tabId}`);
      
      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      
      // Also inject CSS if needed
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css']
      }).catch(() => {
        // CSS injection failure is non-critical
      });
      
      console.log(`[ContextRecovery] Content script reinjected into tab ${tabId}`);
    } catch (error) {
      console.error(`[ContextRecovery] Failed to reinject content script:`, error);
      throw error;
    }
  }
  
  /**
   * Handle tab removal
   */
  private handleTabRemoved(tabId: number): void {
    this.tabStates.delete(tabId);
    console.log(`[ContextRecovery] Unregistered tab ${tabId}`);
  }
  
  /**
   * Handle tab updates
   */
  private handleTabUpdated(
    tabId: number, 
    changeInfo: chrome.tabs.TabChangeInfo, 
    _tab: chrome.tabs.Tab
  ): void {
    // If tab navigated to a new page, reset its state
    if (changeInfo.status === 'loading') {
      const state = this.tabStates.get(tabId);
      if (state) {
        state.isConnected = false;
        state.retryCount = 0;
        console.log(`[ContextRecovery] Tab ${tabId} navigated, marking as disconnected`);
      }
    }
  }
  
  /**
   * Handle port connections for persistent connections
   */
  private handlePortConnect(port: chrome.runtime.Port): void {
    if (port.name === 'content-script-port' && port.sender?.tab?.id) {
      const tabId = port.sender.tab.id;
      
      console.log(`[ContextRecovery] Port connected from tab ${tabId}`);
      this.registerTab(tabId);
      
      port.onDisconnect.addListener(() => {
        console.log(`[ContextRecovery] Port disconnected from tab ${tabId}`);
        const state = this.tabStates.get(tabId);
        if (state) {
          state.isConnected = false;
        }
      });
    }
  }
  
  /**
   * Check if a tab is currently connected
   */
  public isTabConnected(tabId: number): boolean {
    const state = this.tabStates.get(tabId);
    return state ? state.isConnected : false;
  }
  
  /**
   * Get statistics about monitored tabs
   */
  public getStats(): { total: number; connected: number; disconnected: number } {
    let connected = 0;
    let disconnected = 0;
    
    for (const state of this.tabStates.values()) {
      if (state.isConnected) {
        connected++;
      } else {
        disconnected++;
      }
    }
    
    return {
      total: this.tabStates.size,
      connected,
      disconnected
    };
  }
  
  /**
   * Cleanup service
   */
  public cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.tabStates.clear();
    console.log('[ContextRecovery] Service cleaned up');
  }
}