# Feature 1.2: Development Environment

**Status: ✅ COMPLETED** | **Completed Date: 2025-06-25** | **Commit: 9a52fc8** | **Assignee: Claude** | **Git Tag: feature-1.2-completed**

## Feature Overview and Objectives

### Overview
Set up a comprehensive development environment that enables efficient Chrome Extension development with hot reloading, debugging capabilities, and automated workflows. This includes configuring webpack for development builds, setting up Chrome for extension development, and establishing development best practices.

### Objectives
- Configure webpack for Chrome Extension development with hot reloading
- Set up Chrome browser for extension development and debugging
- Establish automated build and watch processes
- Configure source maps for debugging TypeScript code
- Create development scripts and shortcuts
- Set up VS Code with recommended extensions and settings

## Technical Requirements

### Webpack Configuration
- Multiple entry points for different extension components
- Development and production build configurations
- Source map generation for debugging
- Asset copying for manifest and static files
- Hot Module Replacement (HMR) where applicable
- Code splitting for optimal loading

### Chrome Development Setup
- Chrome Canary or Dev channel for testing
- Extension development mode enabled
- Debugging tools configuration
- Performance profiling setup

### Development Tools
- TypeScript watch mode
- Automatic extension reloading
- Console logging configuration
- Error boundary setup
- Development-only features

### VS Code Configuration
- Recommended extensions
- Workspace settings
- Debug configurations
- Task automation

## Implementation Steps

### Step 1: Create Webpack Configuration
Create `webpack.config.js`:
```javascript
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: argv.mode || 'development',
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    
    entry: {
      background: './src/background/index.ts',
      content: './src/content/index.ts',
      popup: './src/popup/index.ts',
      options: './src/options/index.ts',
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
      ],
    },
    
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@common': path.resolve(__dirname, 'src/common'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@content': path.resolve(__dirname, 'src/content'),
        '@popup': path.resolve(__dirname, 'src/popup'),
        '@options': path.resolve(__dirname, 'src/options'),
      },
    },
    
    plugins: [
      new CleanWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'public/icons', to: 'icons' },
          { from: 'src/popup/popup.html', to: 'popup.html' },
          { from: 'src/options/options.html', to: 'options.html' },
        ],
      }),
    ],
    
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 10,
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    },
    
    // Disable performance hints in development
    performance: {
      hints: isProduction ? 'warning' : false,
    },
    
    // Watch options for development
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: 1000,
    },
  };
};
```

### Step 2: Create Development Scripts
Update `package.json` scripts section:
```json
{
  "scripts": {
    "dev": "webpack --mode development --watch",
    "dev:reload": "webpack --mode development --watch & node scripts/reload-extension.js",
    "build": "webpack --mode production",
    "build:analyze": "webpack-bundle-analyzer dist/stats.json",
    "clean": "rm -rf dist",
    "lint": "eslint src/**/*.{ts,tsx}",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix",
    "format": "prettier --write src/**/*.{ts,tsx,css,json}",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "pre-commit": "npm run lint && npm run type-check && npm run test",
    "chrome:launch": "node scripts/launch-chrome.js"
  }
}
```

### Step 3: Create Extension Reload Script
Create `scripts/reload-extension.js`:
```javascript
const WebSocket = require('ws');
const chokidar = require('chokidar');
const path = require('path');

const WS_PORT = 9090;
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`Extension reload server running on ws://localhost:${WS_PORT}`);

// Watch for file changes
const watcher = chokidar.watch(path.join(__dirname, '../dist'), {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('change', (filepath) => {
  console.log(`File changed: ${filepath}`);
  
  // Notify all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ 
        type: 'reload',
        timestamp: Date.now(),
        file: path.basename(filepath)
      }));
    }
  });
});

// Create reload client for injection
const reloadClient = `
(function() {
  const ws = new WebSocket('ws://localhost:${WS_PORT}');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log('Reloading extension...');
      chrome.runtime.reload();
    }
  };
  
  ws.onerror = () => {
    console.log('Extension reload server not available');
  };
})();
`;

// Save reload client for injection
const fs = require('fs');
fs.writeFileSync(
  path.join(__dirname, '../dist/reload-client.js'),
  reloadClient
);
```

### Step 4: Create Chrome Launch Script
Create `scripts/launch-chrome.js`:
```javascript
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const extensionPath = path.join(__dirname, '../dist');

// Chrome executable paths for different platforms
const chromeExecutables = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  linux: 'google-chrome',
};

const platform = os.platform();
const chromeExecutable = chromeExecutables[platform] || 'google-chrome';

// Chrome flags for development
const chromeFlags = [
  `--load-extension=${extensionPath}`,
  '--auto-open-devtools-for-tabs',
  '--disable-extensions-except=' + extensionPath,
  '--user-data-dir=' + path.join(__dirname, '../.chrome-profile'),
  '--no-first-run',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-features=ChromeWhatsNewUI',
  '--enable-logging=stderr',
  '--v=1',
];

console.log('Launching Chrome for extension development...');
console.log('Extension path:', extensionPath);

const chrome = spawn(chromeExecutable, chromeFlags, {
  stdio: 'inherit',
  detached: false,
});

chrome.on('error', (err) => {
  console.error('Failed to launch Chrome:', err);
  console.error('Chrome executable path:', chromeExecutable);
});

chrome.on('exit', (code) => {
  console.log(`Chrome exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  chrome.kill();
  process.exit();
});
```

### Step 5: Create VS Code Configuration
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": false,
    "**/.chrome-profile": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.chrome-profile": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense",
    "streetsidesoftware.code-spell-checker",
    "wayou.vscode-todo-highlight",
    "gruntfuggly.todo-tree",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "yzhang.markdown-all-in-one"
  ]
}
```

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome Extension",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/dist",
      "sourceMaps": true,
      "trace": true,
      "runtimeArgs": [
        "--load-extension=${workspaceFolder}/dist",
        "--disable-extensions-except=${workspaceFolder}/dist"
      ]
    },
    {
      "name": "Debug Background Script",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/background.js",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Step 6: Create Development Utilities
Create `src/common/dev-utils.ts`:
```typescript
/**
 * Development utilities - these will be stripped in production builds
 */

export const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = (...args: any[]): void => {
  if (isDevelopment) {
    console.log('[TTS-Dev]', ...args);
  }
};

export const devError = (...args: any[]): void => {
  if (isDevelopment) {
    console.error('[TTS-Dev Error]', ...args);
  }
};

export const devTime = (label: string): void => {
  if (isDevelopment) {
    console.time(`[TTS-Dev] ${label}`);
  }
};

export const devTimeEnd = (label: string): void => {
  if (isDevelopment) {
    console.timeEnd(`[TTS-Dev] ${label}`);
  }
};

// Development-only Chrome storage viewer
export const viewStorage = async (): Promise<void> => {
  if (isDevelopment) {
    const data = await chrome.storage.local.get();
    console.table(data);
  }
};

// Development-only performance monitor
export const perfMonitor = {
  marks: new Map<string, number>(),
  
  start(label: string): void {
    if (isDevelopment) {
      this.marks.set(label, performance.now());
    }
  },
  
  end(label: string): void {
    if (isDevelopment) {
      const start = this.marks.get(label);
      if (start) {
        const duration = performance.now() - start;
        devLog(`Performance: ${label} took ${duration.toFixed(2)}ms`);
        this.marks.delete(label);
      }
    }
  },
  
  measure(fn: () => void | Promise<void>, label: string): void | Promise<void> {
    if (!isDevelopment) return fn();
    
    this.start(label);
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => this.end(label));
    } else {
      this.end(label);
      return result;
    }
  },
};
```

### Step 7: Create Environment Configuration
Create `.env.development`:
```
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
EXTENSION_ID=your-dev-extension-id
WS_RELOAD_PORT=9090
```

Create `src/config/env.ts`:
```typescript
interface Config {
  isDevelopment: boolean;
  isProduction: boolean;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  wsReloadPort: number;
}

export const config: Config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  debug: process.env.DEBUG === 'true',
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  wsReloadPort: parseInt(process.env.WS_RELOAD_PORT || '9090', 10),
};
```

## Testing Criteria and Test Cases

### Test Case 1: Webpack Build Verification
- **Objective**: Verify webpack builds correctly in both modes
- **Steps**:
  1. Run `npm run build`
  2. Check dist/ directory structure
  3. Verify all entry points are built
  4. Run `npm run dev`
  5. Make a change and verify rebuild
- **Expected Result**: All builds complete without errors

### Test Case 2: Extension Loading in Chrome
- **Objective**: Verify extension loads correctly in Chrome
- **Steps**:
  1. Run `npm run build`
  2. Open Chrome and navigate to `chrome://extensions/`
  3. Enable Developer Mode
  4. Click "Load unpacked" and select dist/ directory
  5. Verify extension appears in toolbar
- **Expected Result**: Extension loads without errors

### Test Case 3: Hot Reload Functionality
- **Objective**: Verify hot reload works during development
- **Steps**:
  1. Run `npm run dev:reload`
  2. Load extension in Chrome
  3. Make a change to popup.ts
  4. Verify extension reloads automatically
- **Expected Result**: Extension reloads within 2 seconds of file save

### Test Case 4: Source Maps and Debugging
- **Objective**: Verify TypeScript debugging works
- **Steps**:
  1. Set a breakpoint in background/index.ts
  2. Run extension with dev tools open
  3. Trigger the breakpoint
  4. Verify source maps show TypeScript code
- **Expected Result**: Breakpoints work with TypeScript source

### Test Case 5: Development Scripts
- **Objective**: Verify all npm scripts work correctly
- **Steps**:
  1. Run each npm script
  2. Verify expected output
  3. Check for any errors
- **Expected Result**: All scripts execute successfully

## Success Metrics

1. **Build Performance**: Development builds complete in < 2 seconds
2. **Reload Speed**: Extension reloads in < 1 second after file change
3. **Source Map Accuracy**: 100% of TypeScript lines map correctly
4. **Script Reliability**: All development scripts run without errors
5. **Developer Experience**: Setup completes in < 5 minutes
6. **Chrome Compatibility**: Works with Chrome 100+ and Chrome Canary

## Dependencies and Risks

### Dependencies
- **Webpack 5**: Build tool and module bundler
- **TypeScript**: Type safety and modern JavaScript features
- **Chrome/Chrome Canary**: Testing and development browser
- **Node.js 18+**: Development runtime
- **VS Code**: Recommended IDE

### Risks

1. **Webpack Configuration Complexity**
   - **Risk**: Complex webpack config may be difficult to maintain
   - **Mitigation**: Well-documented configuration with clear comments
   - **Impact**: Medium

2. **Chrome API Changes**
   - **Risk**: Chrome extension APIs may change
   - **Mitigation**: Use stable APIs, monitor Chrome release notes
   - **Impact**: Low

3. **Hot Reload Stability**
   - **Risk**: WebSocket-based reload may be unreliable
   - **Mitigation**: Fallback to manual reload, clear error messages
   - **Impact**: Low

4. **Development Performance**
   - **Risk**: Large codebase may slow down watch mode
   - **Mitigation**: Optimize webpack config, use incremental builds
   - **Impact**: Medium

5. **Cross-Platform Compatibility**
   - **Risk**: Scripts may not work on all operating systems
   - **Mitigation**: Test on Windows, macOS, and Linux
   - **Impact**: Medium

### Risk Matrix
| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|---------|-------------------|
| Webpack Complexity | Medium | Medium | Clear documentation |
| Chrome API Changes | Low | Low | Use stable APIs |
| Hot Reload Issues | Medium | Low | Manual reload fallback |
| Dev Performance | Low | Medium | Incremental builds |
| Cross-Platform | Medium | Medium | Multi-OS testing |

## Notes

- Consider using webpack-dev-server for serving development assets
- Chrome Canary provides the latest APIs but may be unstable
- Source maps significantly increase build size but are essential for debugging
- Consider adding webpack-bundle-analyzer for production build optimization
- The hot reload mechanism requires the extension to inject a WebSocket client