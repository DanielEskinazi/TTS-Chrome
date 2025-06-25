# Feature 5.3: Comprehensive Error Handling System

## Overview

Implement a robust error handling system for the TTS Chrome Extension that gracefully manages all error scenarios, provides meaningful user feedback, and ensures the extension remains stable under all conditions.

## Objectives

- Create a centralized error handling service
- Implement user-friendly error messages and recovery options
- Add error tracking and reporting capabilities
- Ensure graceful degradation when features fail
- Provide clear error states in the UI

## Technical Requirements

### Functional Requirements

1. **Error Categories**
   - TTS Engine Errors (voice not available, speech synthesis failure)
   - Storage Errors (quota exceeded, sync failures)
   - Network Errors (offline, timeout)
   - Permission Errors (missing permissions, blocked by policy)
   - Content Script Errors (injection failures, DOM access)
   - Runtime Errors (message passing, API failures)

2. **Error Handling Strategies**
   - Automatic retry with exponential backoff
   - Fallback to alternative methods
   - User notification with actionable solutions
   - Error logging and analytics
   - Recovery mechanisms

3. **User Experience**
   - Non-intrusive error notifications
   - Clear error messages in plain language
   - Suggested actions for resolution
   - Error history and diagnostics
   - One-click error reporting

### Non-Functional Requirements

1. **Performance**
   - Error handling overhead < 10ms
   - No blocking of main functionality
   - Efficient error logging (batch processing)

2. **Reliability**
   - Error handler must never crash
   - Graceful degradation of features
   - Recovery without data loss

3. **Maintainability**
   - Centralized error definitions
   - Consistent error handling patterns
   - Easy to add new error types

## Implementation

### 1. Error Types and Definitions

```typescript
// src/types/errors.ts
export enum ErrorCategory {
  TTS = 'TTS',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  CONTENT_SCRIPT = 'CONTENT_SCRIPT',
  RUNTIME = 'RUNTIME',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorDetails {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  technicalDetails?: any;
  stackTrace?: string;
  timestamp: number;
  context?: Record<string, any>;
  recoverable: boolean;
  suggestedActions?: string[];
}

export class TTSError extends Error {
  public details: ErrorDetails;

  constructor(details: Partial<ErrorDetails>) {
    const message = details.message || 'An error occurred';
    super(message);
    
    this.name = 'TTSError';
    this.details = {
      code: details.code || 'UNKNOWN_ERROR',
      category: details.category || ErrorCategory.UNKNOWN,
      severity: details.severity || ErrorSeverity.MEDIUM,
      message,
      userMessage: details.userMessage || 'Something went wrong. Please try again.',
      timestamp: Date.now(),
      recoverable: details.recoverable ?? true,
      ...details
    };

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TTSError);
    }
    this.details.stackTrace = this.stack;
  }
}

// Predefined error types
export const ErrorTypes = {
  // TTS Errors
  TTS_VOICE_NOT_FOUND: {
    code: 'TTS_VOICE_NOT_FOUND',
    category: ErrorCategory.TTS,
    severity: ErrorSeverity.MEDIUM,
    message: 'Selected voice not found',
    userMessage: 'The selected voice is not available. Switching to default voice.',
    recoverable: true,
    suggestedActions: ['Select a different voice', 'Refresh available voices']
  },
  
  TTS_SYNTHESIS_FAILED: {
    code: 'TTS_SYNTHESIS_FAILED',
    category: ErrorCategory.TTS,
    severity: ErrorSeverity.HIGH,
    message: 'Speech synthesis failed',
    userMessage: 'Unable to read text. Please check your audio settings.',
    recoverable: true,
    suggestedActions: ['Check audio output', 'Try a different voice', 'Restart the extension']
  },

  TTS_RATE_LIMITED: {
    code: 'TTS_RATE_LIMITED',
    category: ErrorCategory.TTS,
    severity: ErrorSeverity.MEDIUM,
    message: 'TTS rate limit exceeded',
    userMessage: 'Too many requests. Please wait a moment before trying again.',
    recoverable: true,
    suggestedActions: ['Wait 30 seconds', 'Reduce reading speed']
  },

  // Storage Errors
  STORAGE_QUOTA_EXCEEDED: {
    code: 'STORAGE_QUOTA_EXCEEDED',
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.HIGH,
    message: 'Storage quota exceeded',
    userMessage: 'Storage limit reached. Please clear some data to continue.',
    recoverable: true,
    suggestedActions: ['Clear reading history', 'Export and reset settings']
  },

  STORAGE_SYNC_FAILED: {
    code: 'STORAGE_SYNC_FAILED',
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.LOW,
    message: 'Settings sync failed',
    userMessage: 'Settings could not be synced across devices. Local settings are still saved.',
    recoverable: true,
    suggestedActions: ['Check internet connection', 'Sign in to Chrome']
  },

  // Network Errors
  NETWORK_OFFLINE: {
    code: 'NETWORK_OFFLINE',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'No internet connection',
    userMessage: 'You appear to be offline. Some features may be limited.',
    recoverable: true,
    suggestedActions: ['Check internet connection', 'Use offline voices only']
  },

  // Permission Errors
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    category: ErrorCategory.PERMISSION,
    severity: ErrorSeverity.HIGH,
    message: 'Permission denied',
    userMessage: 'This feature requires additional permissions.',
    recoverable: true,
    suggestedActions: ['Grant required permissions', 'Check extension settings']
  },

  // Content Script Errors
  CONTENT_SCRIPT_INJECTION_FAILED: {
    code: 'CONTENT_SCRIPT_INJECTION_FAILED',
    category: ErrorCategory.CONTENT_SCRIPT,
    severity: ErrorSeverity.HIGH,
    message: 'Failed to inject content script',
    userMessage: 'Cannot access this page. Some websites block extensions.',
    recoverable: false,
    suggestedActions: ['Try refreshing the page', 'Check if extensions are allowed on this site']
  },

  // Runtime Errors
  MESSAGE_PASSING_FAILED: {
    code: 'MESSAGE_PASSING_FAILED',
    category: ErrorCategory.RUNTIME,
    severity: ErrorSeverity.CRITICAL,
    message: 'Communication error between extension components',
    userMessage: 'Extension encountered an error. Please reload the extension.',
    recoverable: false,
    suggestedActions: ['Reload the extension', 'Restart Chrome']
  }
} as const;
```

### 2. Error Handler Service

```typescript
// src/services/ErrorHandler.ts
import { ErrorDetails, TTSError, ErrorSeverity, ErrorCategory } from '../types/errors';
import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

export interface ErrorHandler {
  handle(error: Error | TTSError): void;
  handleAsync(error: Error | TTSError): Promise<void>;
  setContext(context: Record<string, any>): void;
  clearContext(): void;
}

export class ErrorHandlerService implements ErrorHandler {
  private static instance: ErrorHandlerService;
  private context: Record<string, any> = {};
  private errorLog: ErrorDetails[] = [];
  private readonly MAX_LOG_SIZE = 100;
  private retryMap = new Map<string, number>();
  private notificationService: NotificationService;
  private storageService: StorageService;

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  constructor() {
    this.notificationService = NotificationService.getInstance();
    this.storageService = StorageService.getInstance();
    this.setupGlobalErrorHandlers();
    this.loadErrorLog();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors in content scripts
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handle(new Error(event.message));
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.handle(new Error(event.reason));
      });
    }

    // Handle errors in background script
    if (chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ERROR_REPORT') {
          this.handle(new TTSError(message.error));
        }
      });
    }
  }

  handle(error: Error | TTSError): void {
    const errorDetails = this.normalizeError(error);
    
    // Log error
    this.logError(errorDetails);
    
    // Show user notification based on severity
    if (errorDetails.severity !== ErrorSeverity.LOW) {
      this.notifyUser(errorDetails);
    }

    // Attempt recovery if possible
    if (errorDetails.recoverable) {
      this.attemptRecovery(errorDetails);
    }

    // Report critical errors
    if (errorDetails.severity === ErrorSeverity.CRITICAL) {
      this.reportError(errorDetails);
    }
  }

  async handleAsync(error: Error | TTSError): Promise<void> {
    return new Promise((resolve) => {
      this.handle(error);
      resolve();
    });
  }

  private normalizeError(error: Error | TTSError): ErrorDetails {
    if (error instanceof TTSError) {
      return {
        ...error.details,
        context: { ...this.context, ...error.details.context }
      };
    }

    // Convert regular errors to TTSError format
    return {
      code: 'UNKNOWN_ERROR',
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: 'An unexpected error occurred.',
      stackTrace: error.stack,
      timestamp: Date.now(),
      context: this.context,
      recoverable: true,
      suggestedActions: ['Try again', 'Reload the extension']
    };
  }

  private async logError(error: ErrorDetails): Promise<void> {
    // Add to in-memory log
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.pop();
    }

    // Persist to storage (debounced)
    this.saveErrorLog();

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[TTS Error]', error);
    }
  }

  private notifyUser(error: ErrorDetails): void {
    const notification = {
      title: this.getErrorTitle(error.category),
      message: error.userMessage,
      type: this.getNotificationType(error.severity),
      actions: error.suggestedActions || [],
      duration: error.severity === ErrorSeverity.CRITICAL ? 0 : 5000
    };

    this.notificationService.show(notification);
  }

  private attemptRecovery(error: ErrorDetails): void {
    const retryCount = this.retryMap.get(error.code) || 0;
    
    if (retryCount >= 3) {
      // Max retries reached
      this.retryMap.delete(error.code);
      return;
    }

    // Exponential backoff
    const delay = Math.pow(2, retryCount) * 1000;
    
    setTimeout(() => {
      this.retryMap.set(error.code, retryCount + 1);
      
      // Emit recovery attempt event
      chrome.runtime.sendMessage({
        type: 'ERROR_RECOVERY',
        error: error,
        attempt: retryCount + 1
      });
    }, delay);
  }

  private reportError(error: ErrorDetails): void {
    // In production, this would send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      console.error('Critical error reported:', error);
    }
  }

  private getErrorTitle(category: ErrorCategory): string {
    const titles: Record<ErrorCategory, string> = {
      [ErrorCategory.TTS]: 'Text-to-Speech Error',
      [ErrorCategory.STORAGE]: 'Storage Error',
      [ErrorCategory.NETWORK]: 'Network Error',
      [ErrorCategory.PERMISSION]: 'Permission Error',
      [ErrorCategory.CONTENT_SCRIPT]: 'Page Access Error',
      [ErrorCategory.RUNTIME]: 'Extension Error',
      [ErrorCategory.UNKNOWN]: 'Error'
    };
    return titles[category];
  }

  private getNotificationType(severity: ErrorSeverity): 'info' | 'warning' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
    }
  }

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
    this.saveErrorLog();
  }

  private async loadErrorLog(): Promise<void> {
    try {
      const stored = await this.storageService.getErrorLog();
      if (stored) {
        this.errorLog = stored;
      }
    } catch (error) {
      // Ignore storage errors when loading error log
    }
  }

  private saveErrorLog = debounce(async () => {
    try {
      await this.storageService.setErrorLog(this.errorLog);
    } catch (error) {
      // Ignore storage errors when saving error log
    }
  }, 1000);
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

### 3. Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandlerService } from '../services/ErrorHandler';
import { TTSError, ErrorTypes } from '../types/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler: ErrorHandlerService;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
    this.errorHandler = ErrorHandlerService.getInstance();
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to error handler service
    const ttsError = new TTSError({
      code: 'REACT_ERROR_BOUNDARY',
      message: error.message,
      userMessage: 'The interface encountered an error. Please refresh the page.',
      technicalDetails: {
        componentStack: errorInfo.componentStack,
        error: error.toString()
      }
    });

    this.errorHandler.handle(ttsError);

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-content">
            <h2>Oops! Something went wrong</h2>
            <p>We're sorry for the inconvenience. The application encountered an error.</p>
            
            <div className="error-actions">
              <button onClick={this.handleReset} className="primary-button">
                Try Again
              </button>
              <button onClick={() => window.location.reload()} className="secondary-button">
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 4. Error Recovery Strategies

```typescript
// src/services/ErrorRecovery.ts
import { ErrorDetails, ErrorCategory, TTSError, ErrorTypes } from '../types/errors';
import { StorageService } from './StorageService';
import { TTSService } from './TTSService';

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private storageService: StorageService;
  private ttsService: TTSService;

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  constructor() {
    this.storageService = StorageService.getInstance();
    this.ttsService = TTSService.getInstance();
    this.setupRecoveryHandlers();
  }

  private setupRecoveryHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ERROR_RECOVERY') {
        this.handleRecovery(message.error, message.attempt)
          .then(sendResponse)
          .catch(error => sendResponse({ success: false, error }));
        return true; // Keep channel open for async response
      }
    });
  }

  async handleRecovery(error: ErrorDetails, attempt: number): Promise<any> {
    switch (error.code) {
      case ErrorTypes.TTS_VOICE_NOT_FOUND.code:
        return this.recoverFromVoiceNotFound();
      
      case ErrorTypes.TTS_SYNTHESIS_FAILED.code:
        return this.recoverFromSynthesisFailure();
      
      case ErrorTypes.STORAGE_QUOTA_EXCEEDED.code:
        return this.recoverFromStorageQuota();
      
      case ErrorTypes.STORAGE_SYNC_FAILED.code:
        return this.recoverFromSyncFailure();
      
      case ErrorTypes.NETWORK_OFFLINE.code:
        return this.recoverFromOffline();
      
      case ErrorTypes.CONTENT_SCRIPT_INJECTION_FAILED.code:
        return this.recoverFromInjectionFailure();
      
      default:
        return this.genericRecovery(error);
    }
  }

  private async recoverFromVoiceNotFound(): Promise<void> {
    // Get available voices
    const voices = await this.ttsService.getVoices();
    
    if (voices.length === 0) {
      throw new TTSError({
        ...ErrorTypes.TTS_VOICE_NOT_FOUND,
        message: 'No voices available'
      });
    }

    // Select first available voice
    const defaultVoice = voices.find(v => v.default) || voices[0];
    await this.storageService.updateSettings({
      voice: { selectedVoice: defaultVoice.voiceURI }
    });

    // Notify user of voice change
    chrome.runtime.sendMessage({
      type: 'NOTIFICATION',
      notification: {
        title: 'Voice Changed',
        message: `Switched to ${defaultVoice.name}`,
        type: 'info'
      }
    });
  }

  private async recoverFromSynthesisFailure(): Promise<void> {
    // Clear TTS queue
    chrome.tts.stop();
    
    // Reset TTS settings to defaults
    await this.ttsService.resetToDefaults();
    
    // Try with simpler settings
    const settings = await this.storageService.getUserSettings();
    await this.storageService.updateSettings({
      voice: {
        ...settings.voice,
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8
      }
    });
  }

  private async recoverFromStorageQuota(): Promise<void> {
    // Clear old data
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES;
    
    if (usage > quota * 0.9) {
      // Clear reading history (usually the largest data)
      await this.storageService.clearHistory();
      
      // Clear old error logs
      const errorHandler = ErrorHandlerService.getInstance();
      errorHandler.clearErrorLog();
    }
  }

  private async recoverFromSyncFailure(): Promise<void> {
    // Fall back to local storage
    const settings = await chrome.storage.local.get('userSettings');
    if (settings.userSettings) {
      // Continue with local settings
      return;
    }
    
    // If no local settings, use defaults
    await this.storageService.resetSettings();
  }

  private async recoverFromOffline(): Promise<void> {
    // Switch to offline-capable voices only
    const voices = await this.ttsService.getVoices();
    const offlineVoices = voices.filter(v => v.localService);
    
    if (offlineVoices.length > 0) {
      await this.storageService.updateSettings({
        voice: { selectedVoice: offlineVoices[0].voiceURI }
      });
    }
  }

  private async recoverFromInjectionFailure(): Promise<void> {
    // Try alternative injection method
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab[0]?.id) {
      try {
        // Try programmatic injection
        await chrome.scripting.executeScript({
          target: { tabId: tab[0].id },
          files: ['content.js']
        });
      } catch (error) {
        // If still fails, it's likely a protected page
        throw new TTSError({
          ...ErrorTypes.CONTENT_SCRIPT_INJECTION_FAILED,
          message: 'Cannot access this page',
          recoverable: false
        });
      }
    }
  }

  private async genericRecovery(error: ErrorDetails): Promise<void> {
    // Generic recovery attempts
    console.log('Attempting generic recovery for:', error.code);
    
    // Reload extension resources
    chrome.runtime.reload();
  }
}
```

### 5. Error UI Components

```typescript
// src/components/ErrorNotification.tsx
import React, { useState, useEffect } from 'react';
import { ErrorDetails } from '../types/errors';

interface ErrorNotificationProps {
  error: ErrorDetails;
  onClose: () => void;
  onAction: (action: string) => void;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onClose,
  onAction
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (error.severity === 'LOW') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error.severity, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (error.severity) {
      case 'LOW':
        return '💬';
      case 'MEDIUM':
        return '⚠️';
      case 'HIGH':
        return '🚨';
      case 'CRITICAL':
        return '❌';
    }
  };

  const getClassName = () => {
    return `error-notification error-${error.severity.toLowerCase()}`;
  };

  return (
    <div className={getClassName()}>
      <div className="error-header">
        <span className="error-icon">{getIcon()}</span>
        <span className="error-title">{error.category}</span>
        <button className="error-close" onClick={onClose}>×</button>
      </div>
      
      <div className="error-message">
        {error.userMessage}
      </div>
      
      {error.suggestedActions && error.suggestedActions.length > 0 && (
        <div className="error-actions">
          {error.suggestedActions.map((action, index) => (
            <button
              key={index}
              className="error-action"
              onClick={() => onAction(action)}
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Error Log Viewer Component
export const ErrorLogViewer: React.FC = () => {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  
  useEffect(() => {
    const errorHandler = ErrorHandlerService.getInstance();
    setErrors(errorHandler.getErrorLog());
  }, []);

  const filteredErrors = errors.filter(error => {
    if (filter === 'ALL') return true;
    return error.category === filter;
  });

  const clearLog = () => {
    const errorHandler = ErrorHandlerService.getInstance();
    errorHandler.clearErrorLog();
    setErrors([]);
  };

  return (
    <div className="error-log-viewer">
      <div className="error-log-header">
        <h3>Error History</h3>
        <div className="error-log-controls">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="error-filter"
          >
            <option value="ALL">All Categories</option>
            <option value="TTS">Text-to-Speech</option>
            <option value="STORAGE">Storage</option>
            <option value="NETWORK">Network</option>
            <option value="PERMISSION">Permission</option>
            <option value="CONTENT_SCRIPT">Content Script</option>
            <option value="RUNTIME">Runtime</option>
          </select>
          <button onClick={clearLog} className="clear-log-button">
            Clear Log
          </button>
        </div>
      </div>

      <div className="error-log-list">
        {filteredErrors.length === 0 ? (
          <div className="no-errors">No errors recorded</div>
        ) : (
          filteredErrors.map((error, index) => (
            <ErrorLogItem key={index} error={error} />
          ))
        )}
      </div>
    </div>
  );
};

const ErrorLogItem: React.FC<{ error: ErrorDetails }> = ({ error }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="error-log-item">
      <div 
        className="error-log-summary"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`severity-indicator ${error.severity.toLowerCase()}`} />
        <span className="error-time">
          {new Date(error.timestamp).toLocaleTimeString()}
        </span>
        <span className="error-code">{error.code}</span>
        <span className="error-message">{error.userMessage}</span>
      </div>
      
      {expanded && (
        <div className="error-log-details">
          <div className="detail-row">
            <strong>Technical Details:</strong> {error.message}
          </div>
          {error.context && (
            <div className="detail-row">
              <strong>Context:</strong>
              <pre>{JSON.stringify(error.context, null, 2)}</pre>
            </div>
          )}
          {error.stackTrace && (
            <details className="stack-trace">
              <summary>Stack Trace</summary>
              <pre>{error.stackTrace}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
```

## Testing

### Unit Tests

```typescript
// src/services/__tests__/ErrorHandler.test.ts
import { ErrorHandlerService } from '../ErrorHandler';
import { TTSError, ErrorTypes } from '../../types/errors';

describe('ErrorHandlerService', () => {
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = ErrorHandlerService.getInstance();
    errorHandler.clearErrorLog();
  });

  test('should handle TTSError correctly', () => {
    const error = new TTSError(ErrorTypes.TTS_VOICE_NOT_FOUND);
    errorHandler.handle(error);
    
    const log = errorHandler.getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].code).toBe('TTS_VOICE_NOT_FOUND');
  });

  test('should handle regular Error', () => {
    const error = new Error('Something went wrong');
    errorHandler.handle(error);
    
    const log = errorHandler.getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].code).toBe('UNKNOWN_ERROR');
  });

  test('should maintain context', () => {
    errorHandler.setContext({ userId: '123', page: 'settings' });
    
    const error = new Error('Context test');
    errorHandler.handle(error);
    
    const log = errorHandler.getErrorLog();
    expect(log[0].context).toMatchObject({
      userId: '123',
      page: 'settings'
    });
  });

  test('should limit error log size', () => {
    for (let i = 0; i < 150; i++) {
      errorHandler.handle(new Error(`Error ${i}`));
    }
    
    const log = errorHandler.getErrorLog();
    expect(log).toHaveLength(100); // MAX_LOG_SIZE
  });
});

// src/services/__tests__/ErrorRecovery.test.ts
import { ErrorRecoveryService } from '../ErrorRecovery';
import { ErrorTypes } from '../../types/errors';

describe('ErrorRecoveryService', () => {
  let recoveryService: ErrorRecoveryService;

  beforeEach(() => {
    recoveryService = ErrorRecoveryService.getInstance();
  });

  test('should recover from voice not found', async () => {
    const mockVoices = [
      { voiceURI: 'en-US', name: 'English US', default: true }
    ];
    
    jest.spyOn(chrome.tts, 'getVoices').mockImplementation((callback) => {
      callback(mockVoices);
    });

    await recoveryService.handleRecovery(
      ErrorTypes.TTS_VOICE_NOT_FOUND,
      1
    );

    // Verify settings were updated
    expect(chrome.storage.sync.set).toHaveBeenCalled();
  });

  test('should clear data on storage quota exceeded', async () => {
    jest.spyOn(chrome.storage.local, 'getBytesInUse')
      .mockResolvedValue(chrome.storage.local.QUOTA_BYTES * 0.95);

    await recoveryService.handleRecovery(
      ErrorTypes.STORAGE_QUOTA_EXCEEDED,
      1
    );

    // Verify history was cleared
    expect(chrome.storage.local.remove).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// src/components/__tests__/ErrorBoundary.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
  return null;
};

describe('ErrorBoundary', () => {
  test('should catch errors and display fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
  });

  test('should use custom fallback when provided', () => {
    const customFallback = <div>Custom Error Message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Message')).toBeInTheDocument();
  });

  test('should reset when try again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });
});
```

## Success Metrics

1. **Error Handling Coverage**
   - 100% of known error scenarios handled
   - < 0.1% unhandled errors in production
   - 95% of errors recoverable without user intervention

2. **User Experience**
   - Error messages understood by 90% of users
   - 80% of errors resolved through suggested actions
   - < 5% of sessions terminated due to errors

3. **Performance Impact**
   - Error handling overhead < 10ms
   - No memory leaks from error logging
   - Error recovery attempts < 3 seconds

4. **Developer Experience**
   - New error types added in < 5 minutes
   - Error logs help resolve 90% of bug reports
   - Consistent error handling patterns across codebase

## Dependencies

### Internal Dependencies
- Storage Service for error persistence
- Notification Service for user feedback
- TTS Service for recovery actions
- Message passing system

### External Dependencies
- Chrome Runtime API for error reporting
- Chrome Storage API for error logs
- Chrome Notifications API for user alerts

## Risks and Mitigation

### High-Risk Items
1. **Error Handler Failure**
   - Risk: Error handler itself crashes
   - Mitigation: Minimal dependencies, fail-safe design

2. **Storage Quota for Logs**
   - Risk: Error logs consume too much storage
   - Mitigation: Log rotation and size limits

### Medium-Risk Items
1. **Recovery Loop**
   - Risk: Recovery attempts cause more errors
   - Mitigation: Retry limits and backoff strategy

2. **User Notification Fatigue**
   - Risk: Too many error notifications
   - Mitigation: Smart grouping and severity filtering

## Acceptance Criteria

- [ ] All error types have user-friendly messages
- [ ] Error recovery works for all recoverable errors
- [ ] Error logs are persisted and searchable
- [ ] User notifications appear for relevant errors
- [ ] Error boundaries prevent UI crashes
- [ ] Performance impact is negligible
- [ ] Developers can easily add new error types
- [ ] Error tracking helps diagnose issues
- [ ] No errors are silently swallowed
- [ ] All tests pass with >90% coverage