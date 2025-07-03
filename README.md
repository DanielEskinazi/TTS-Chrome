# Advanced Text-to-Speech Chrome Extension

A professional text-to-speech Chrome extension with advanced features including multiple voice options, speed controls, comprehensive text processing capabilities, and a modern UI built with Tailwind CSS.

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
│   ├── background/     # Service worker
│   ├── content/        # Content scripts
│   ├── popup/          # Extension popup
│   ├── options/        # Settings page
│   └── common/         # Shared utilities
├── public/
│   ├── icons/          # Extension icons
│   └── assets/         # Static assets
├── tests/              # Test files
├── docs/               # Documentation
└── specs/              # Feature specifications
```

### Loading the Extension

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder

## Features

- Text-to-speech with multiple voice options
- Context menu integration
- Customizable speed and volume controls
- Advanced text processing
- Keyboard shortcuts
- Settings persistence
- Modern UI Tailwind CSS components
- Responsive design for popup and options pages

## Contributing

Please refer to the feature specifications in the `specs/` directory for detailed implementation guidelines.

## License

MIT License - see LICENSE file for details.
