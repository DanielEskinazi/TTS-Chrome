# Advanced Text-to-Speech Chrome Extension

A professional text-to-speech Chrome extension built with TypeScript, featuring multiple voice options, advanced playback controls, comprehensive text processing capabilities, keyboard shortcuts, and domain-specific settings. Built using Manifest V3 for modern Chrome extension development.

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git 2.x or higher

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd TTS-Chrome
```

2. Install dependencies:

```bash
npm install
```

### Development

- **Start development build**: `npm run dev`
- **Build for production**: `npm run build`
- **Run tests**: `npm test`
- **Lint code**: `npm run lint`
- **Format code**: `npm run format`
- **Type check**: `npm run typecheck`

### Project Structure

```
TTS-Chrome/
├── src/
│   ├── background/         # Service worker & core TTS logic
│   │   ├── index.ts        # Main background script
│   │   ├── services/       # Volume control service
│   │   └── speedManager.ts # Speed management logic
│   ├── content/            # Content scripts
│   │   ├── index.ts        # Text selection & DOM interaction
│   │   └── volume-shortcuts.ts # Keyboard shortcut handlers
│   ├── popup/              # Extension popup UI
│   │   ├── components/     # React components (VolumeControl, etc.)
│   │   ├── controllers/    # UI controllers
│   │   ├── services/       # Popup-specific services
│   │   └── popup.html      # Main popup interface
│   ├── options/            # Settings page
│   │   └── options.html    # Options interface
│   └── common/             # Shared utilities
│       ├── speech-synthesizer.ts  # TTS wrapper
│       ├── voice-manager.ts       # Voice enumeration
│       ├── state-validator.ts     # State validation
│       └── types/                 # TypeScript definitions
├── ai_docs/                # Chrome API documentation
├── public/
│   ├── icons/              # Extension icons
│   └── assets/             # Static assets
├── tests/                  # Test suite
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── scripts/                # Build & dev scripts
└── manifest.json           # Chrome extension manifest v3
```

### Loading the Extension

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder

## Features

### Core TTS Functionality
- **Multiple Voice Options**: Support for all Chrome TTS voices with voice preview
- **Context Menu Integration**: Right-click any selected text to read it aloud
- **Full Page Reading**: Read entire pages with intelligent text extraction
- **Test Area**: Built-in text testing area in popup for voice testing

### Advanced Playback Controls
- **Speed Control**: Adjustable speed from 0.5x to 3.0x with preset buttons (0.75x, 1x, 1.25x, 1.5x, 2x)
- **Volume Control**: 0-100% volume with preset options (Quiet, Normal, Loud)
- **Domain-Specific Settings**: Save volume preferences per website
- **Mute/Unmute**: Quick toggle for audio output
- **Play/Pause/Stop**: Full playback control with Force Stop option
- **Reading Time Estimation**: Shows estimated time to read selected text

### Keyboard Shortcuts
- `Ctrl+Shift+S` - Start TTS for selected text
- `Ctrl+Shift+R` - Read entire page
- `Ctrl+Shift+X` - Stop TTS playback
- `Ctrl+Shift+Space` - Pause/Resume (when playing) or Stop (when paused)
- `+` / `-` - Increase/Decrease speed
- `1-5` - Select speed preset (0.75x - 2x)
- `Ctrl+Shift+Up/Down` - Volume up/down by 10%
- `Ctrl+Shift+M` - Toggle mute

### Technical Features
- **Robust State Management**: Ultra-robust TTS state handling to prevent inconsistencies
- **Chrome Extension Context Invalidation Handling**: Automatic recovery from context errors
- **Comprehensive Debug Logging**: Development mode logging for troubleshooting
- **Real-time UI Updates**: Live status updates and synchronization
- **Persistent Settings**: All preferences saved using Chrome Storage API
- **TypeScript**: Full type safety throughout the codebase
- **Modern Build System**: Webpack 5 with hot reload for development

## Architecture

### Communication Flow
The extension uses Chrome's messaging API for component communication:
1. **Content Script** detects text selection → sends to Background
2. **Background Service Worker** manages TTS state, voices, and playback
3. **Popup UI** provides real-time controls and state display
4. **Options Page** handles persistent settings configuration

### State Management
- Centralized state in background script
- Message-based updates to UI components
- Chrome Storage API for persistence
- Domain-specific preference overrides

### Chrome APIs Used
- `chrome.tts` - Text-to-speech synthesis
- `chrome.contextMenus` - Right-click menu integration
- `chrome.storage` - Settings persistence
- `chrome.runtime` - Inter-component messaging
- `chrome.notifications` - User notifications
- `chrome.commands` - Keyboard shortcuts

## Testing

The project includes a comprehensive test suite:

```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
```

### Test Coverage
- Unit tests for core services (voice manager, speed manager, volume control)
- Integration tests for component communication
- TTS feedback and state validation tests
- Context menu functionality tests

## Contributing

### Development Workflow
1. Create feature branch: `feature/feature-X.Y-description`
2. Implement changes with tests
3. Run `npm run pre-commit` to validate
4. Submit PR to `develop` branch

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Pre-commit hooks for validation
- Comprehensive error handling

## License

MIT License - see LICENSE file for details.

## Version History

### v0.1.0 (Current)
- Initial release with core TTS functionality
- Volume control with keyboard shortcuts
- Speed control with presets
- Domain-specific settings
- Robust state management
- Context menu integration
- Full keyboard shortcut support
