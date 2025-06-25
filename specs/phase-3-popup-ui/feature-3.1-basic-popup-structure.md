# Feature 3.1: Basic Popup Structure

## Feature Overview and Objectives

### Primary Objective
Create a modern, responsive popup interface that serves as the main control center for the TTS Chrome Extension. The popup should provide an intuitive user experience with proper layout, navigation, and visual hierarchy.

### Secondary Objectives
- Establish a consistent design system using Tailwind CSS
- Implement proper React component architecture with TypeScript
- Ensure responsive design for various screen sizes
- Create reusable UI components for future features
- Implement proper state management for popup interactions

### User Stories
- As a user, I want to see a clean, professional popup interface when I click the extension icon
- As a user, I want the popup to load quickly and be responsive to my interactions
- As a user, I want consistent visual styling throughout the interface
- As a user, I want the popup to adapt to different screen sizes and resolutions

## Technical Requirements

### Functional Requirements
1. **Popup Dimensions**: 400px width × 600px height (standard Chrome extension popup size)
2. **Header Section**: Extension title, version, and status indicator
3. **Main Content Area**: Scrollable container for controls and settings
4. **Footer Section**: Quick actions and help links
5. **Loading States**: Proper loading indicators for async operations
6. **Error Handling**: Error boundaries and user-friendly error messages

### Non-Functional Requirements
1. **Performance**: Popup should load within 100ms
2. **Accessibility**: WCAG 2.1 AA compliance
3. **Responsiveness**: Support for 320px to 800px width range
4. **Cross-browser**: Compatible with Chrome 88+, Firefox 78+, Edge 88+
5. **Memory Usage**: Keep under 50MB memory footprint

### Technical Stack
- **React 18+** with TypeScript
- **Tailwind CSS** for styling
- **React Hooks** for state management
- **Chrome Extension APIs** for message passing
- **Lucide React** for icons

## Implementation Steps

### Step 1: Project Setup and Base Structure

```typescript
// src/popup/types/popup.types.ts
export interface PopupState {
  isLoading: boolean;
  error: string | null;
  activeTab: 'main' | 'settings' | 'help';
  ttsStatus: 'idle' | 'speaking' | 'paused' | 'error';
}

export interface PopupContextType {
  state: PopupState;
  setState: React.Dispatch<React.SetStateAction<PopupState>>;
  sendMessage: (message: any) => Promise<any>;
}
```

### Step 2: Popup Context Provider

```typescript
// src/popup/contexts/PopupContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { PopupState, PopupContextType } from '../types/popup.types';

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within PopupProvider');
  }
  return context;
};

interface PopupProviderProps {
  children: React.ReactNode;
}

export const PopupProvider: React.FC<PopupProviderProps> = ({ children }) => {
  const [state, setState] = useState<PopupState>({
    isLoading: false,
    error: null,
    activeTab: 'main',
    ttsStatus: 'idle'
  });

  const sendMessage = useCallback(async (message: any) => {
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to communicate with extension'
      }));
      throw error;
    }
  }, []);

  const value: PopupContextType = {
    state,
    setState,
    sendMessage
  };

  return (
    <PopupContext.Provider value={value}>
      {children}
    </PopupContext.Provider>
  );
};
```

### Step 3: Base Layout Components

```typescript
// src/popup/components/layout/PopupHeader.tsx
import React from 'react';
import { Volume2, Settings, HelpCircle } from 'lucide-react';
import { usePopup } from '../../contexts/PopupContext';

export const PopupHeader: React.FC = () => {
  const { state, setState } = usePopup();

  const handleTabChange = (tab: 'main' | 'settings' | 'help') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">
            Text to Speech
          </h1>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className={`
            w-2 h-2 rounded-full 
            ${state.ttsStatus === 'speaking' ? 'bg-green-500' : 
              state.ttsStatus === 'paused' ? 'bg-yellow-500' : 
              state.ttsStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}
          `} />
          <span className="text-xs text-gray-500 ml-1">
            v1.0.0
          </span>
        </div>
      </div>
      
      <nav className="flex space-x-1 mt-3">
        {[
          { id: 'main', label: 'Main', icon: Volume2 },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'help', label: 'Help', icon: HelpCircle }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id as any)}
            className={`
              flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium
              transition-colors duration-200
              ${state.activeTab === id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
```

```typescript
// src/popup/components/layout/PopupContent.tsx
import React from 'react';
import { usePopup } from '../../contexts/PopupContext';
import { MainTab } from '../tabs/MainTab';
import { SettingsTab } from '../tabs/SettingsTab';
import { HelpTab } from '../tabs/HelpTab';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export const PopupContent: React.FC = () => {
  const { state } = usePopup();

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (state.activeTab) {
      case 'main':
        return <MainTab />;
      case 'settings':
        return <SettingsTab />;
      case 'help':
        return <HelpTab />;
      default:
        return <MainTab />;
    }
  };

  return (
    <ErrorBoundary>
      <main className="flex-1 overflow-y-auto p-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800">{state.error}</p>
          </div>
        )}
        {renderActiveTab()}
      </main>
    </ErrorBoundary>
  );
};
```

```typescript
// src/popup/components/layout/PopupFooter.tsx
import React from 'react';
import { ExternalLink, Github } from 'lucide-react';

export const PopupFooter: React.FC = () => {
  const handleOpenGithub = () => {
    chrome.tabs.create({ 
      url: 'https://github.com/yourusername/tts-chrome-extension' 
    });
  };

  const handleOpenHelp = () => {
    chrome.tabs.create({ 
      url: 'https://your-help-docs.com' 
    });
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <button
            onClick={handleOpenGithub}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </button>
          
          <button
            onClick={handleOpenHelp}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Help</span>
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
          © 2024 TTS Extension
        </div>
      </div>
    </footer>
  );
};
```

### Step 4: Main Popup Component

```typescript
// src/popup/components/Popup.tsx
import React, { useEffect } from 'react';
import { PopupProvider } from '../contexts/PopupContext';
import { PopupHeader } from './layout/PopupHeader';
import { PopupContent } from './layout/PopupContent';
import { PopupFooter } from './layout/PopupFooter';

const PopupInner: React.FC = () => {
  return (
    <div className="w-96 h-[600px] bg-white flex flex-col shadow-lg">
      <PopupHeader />
      <PopupContent />
      <PopupFooter />
    </div>
  );
};

export const Popup: React.FC = () => {
  return (
    <PopupProvider>
      <PopupInner />
    </PopupProvider>
  );
};
```

### Step 5: Utility Components

```typescript
// src/popup/components/ui/LoadingSpinner.tsx
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
};
```

```typescript
// src/popup/components/ui/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Popup error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600 mb-4">
            The popup encountered an unexpected error. Please try refreshing the extension.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// src/popup/components/__tests__/Popup.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Popup } from '../Popup';

describe('Popup Component', () => {
  test('renders popup with header, content, and footer', () => {
    render(<Popup />);
    
    expect(screen.getByText('Text to Speech')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('© 2024 TTS Extension')).toBeInTheDocument();
  });

  test('switches between tabs correctly', () => {
    render(<Popup />);
    
    const settingsTab = screen.getByText('Settings');
    fireEvent.click(settingsTab);
    
    expect(settingsTab).toHaveClass('bg-blue-100');
  });

  test('displays error messages properly', async () => {
    // Mock chrome.runtime.sendMessage to throw error
    const mockSendMessage = jest.fn().mockRejectedValue(new Error('Test error'));
    global.chrome = {
      runtime: { sendMessage: mockSendMessage }
    } as any;

    render(<Popup />);
    
    // Trigger an action that would cause an error
    // Implementation depends on specific error trigger
  });

  test('shows loading state', async () => {
    render(<Popup />);
    
    // Test loading spinner appears during async operations
    // Implementation depends on specific loading trigger
  });
});
```

### Integration Tests

```typescript
// src/popup/components/__tests__/PopupIntegration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Popup } from '../Popup';

describe('Popup Integration Tests', () => {
  beforeEach(() => {
    // Mock Chrome APIs
    global.chrome = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      },
      tabs: {
        create: jest.fn()
      }
    } as any;
  });

  test('communicates with background script', async () => {
    render(<Popup />);
    
    // Test message passing functionality
    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  test('opens external links correctly', () => {
    render(<Popup />);
    
    const githubLink = screen.getByText('GitHub');
    fireEvent.click(githubLink);
    
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('github.com')
    });
  });
});
```

### E2E Tests

```typescript
// e2e/popup.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Popup E2E Tests', () => {
  test('popup opens and displays correctly', async ({ page }) => {
    // Load extension
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Check popup dimensions
    const popup = page.locator('[data-testid="popup-container"]');
    await expect(popup).toHaveCSS('width', '384px'); // w-96 = 384px
    await expect(popup).toHaveCSS('height', '600px');
  });

  test('tab navigation works correctly', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Click settings tab
    await page.click('text=Settings');
    await expect(page.locator('text=Settings')).toHaveClass(/bg-blue-100/);
    
    // Click main tab
    await page.click('text=Main');
    await expect(page.locator('text=Main')).toHaveClass(/bg-blue-100/);
  });

  test('status indicator reflects TTS state', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    const statusIndicator = page.locator('[data-testid="status-indicator"]');
    
    // Initially should be gray (idle)
    await expect(statusIndicator).toHaveClass(/bg-gray-400/);
    
    // After starting TTS, should be green (speaking)
    // This test would need to trigger TTS activation
  });
});
```

## Success Metrics

### Performance Metrics
- **Load Time**: Popup renders within 100ms
- **Memory Usage**: Under 50MB total memory footprint
- **Bundle Size**: Popup bundle under 500KB
- **Interaction Response**: UI interactions respond within 16ms

### User Experience Metrics
- **Accessibility Score**: WCAG 2.1 AA compliance (100%)
- **Error Rate**: Less than 1% of popup opens result in errors
- **User Satisfaction**: Average rating of 4.5+ stars
- **Task Completion**: 95%+ success rate for primary user tasks

### Technical Metrics
- **Test Coverage**: 90%+ code coverage
- **Bug Density**: Less than 0.5 bugs per 100 lines of code
- **Cross-browser Compatibility**: 99%+ compatibility across target browsers
- **Responsive Design**: Perfect rendering on 95%+ of screen sizes

## Dependencies and Risks

### Internal Dependencies
- **React 18+**: Core UI framework
- **TypeScript 5+**: Type safety and development experience
- **Tailwind CSS 3+**: Styling framework
- **Lucide React**: Icon library
- **Chrome Extension APIs**: Core functionality

### External Dependencies
- **Chrome Extension Platform**: Popup API limitations
- **Browser Compatibility**: Different browser implementations
- **Screen Resolution Support**: Various display densities
- **User Permissions**: Extension permissions model

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Chrome API Changes | High | Low | Version pinning, API monitoring |
| Performance Issues | Medium | Medium | Performance testing, optimization |
| Accessibility Compliance | Medium | Low | Regular audits, automated testing |
| Cross-browser Issues | High | Medium | Comprehensive testing matrix |
| Memory Leaks | High | Low | Profiling, careful cleanup |

### Mitigation Strategies

1. **API Stability**: Pin Chrome extension manifest version and monitor API changes
2. **Performance Monitoring**: Implement performance budgets and monitoring
3. **Testing Strategy**: Comprehensive unit, integration, and E2E testing
4. **Error Handling**: Robust error boundaries and fallback mechanisms
5. **Documentation**: Maintain up-to-date technical documentation

### Rollback Plan
- Keep previous popup version available for quick rollback
- Feature flags for gradual rollout of new functionality
- Automated monitoring and alerting for critical issues
- Clear rollback procedures documented and tested