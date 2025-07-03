# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based Chrome extension for Text-to-Speech functionality with advanced features including multiple voices, playback controls, and comprehensive text processing. The extension uses Webpack for bundling and Jest for testing.

## Repository Information

- **Repository**: `github.com/dany/TTS-Chrome`
- **Primary Branch**: `develop`
- **Development Branch Pattern**: `feature/feature-X.Y-description`
- **Repository Type**: Chrome Extension (Manifest V3)
- **License**: [Specify license if available]
- **GitHub MCP Integration**: Enabled for automated branch creation, PR management, and issue tracking

### GitHub Integration Commands

All GitHub operations should use the MCP GitHub tools:

- **Create Branch**: `mcp__github__create_branch`
- **Create Pull Request**: `mcp__github__create_pull_request`
- **Create Issues**: `mcp__github__create_issue`
- **Repository Operations**: `mcp__github__*` tools as needed

## Development Commands

### Core Development

- **Development build with watch**: `npm run dev`
- **Production build**: `npm run build`
- **Run tests**: `npm test`
- **Lint code**: `npm run lint`
- **Format code**: `npm run format`
- **Type checking**: `npm run typecheck`

### Extension Loading

1. Build the extension: `npm run build`
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `dist/` folder

## Git Workflow and Branching Strategy

### IMPORTANT: Feature Branch Requirement

When working on any new feature, **ALWAYS create a new feature branch** before starting development. Never work directly on the `develop` or `main` branch.

### Branch Creation Using GitHub MCP Tool

Use the GitHub MCP tool to create feature branches:

```
mcp__github__create_branch
```

**Branch Naming Convention:**

- Feature branches: `feature/feature-X.Y-description` (e.g., `feature/feature-2.1-basic-tts`)
- Bug fixes: `fix/issue-description`
- Improvements: `improve/improvement-description`
- Experimental: `experimental/experiment-description`

### Development Workflow

1. **Create Feature Branch**: Use `mcp__github__create_branch` with appropriate naming
2. **Develop Feature**: Make all changes in the feature branch
3. **Test Thoroughly**: Run tests, lint, and typecheck before creating PR
4. **Create Pull Request**: Use `mcp__github__create_pull_request` to propose changes
5. **Review and Merge**: After review, merge to develop branch

### Automatic PR Creation on Feature Completion

When a feature is completed (as per Feature Completion Tracking guidelines), **automatically create a pull request** using the GitHub MCP tool:

1. **Ensure all tests pass** and code is properly linted
2. **Push all commits** to the feature branch
3. **Create PR immediately** with:
   - Descriptive title: `feat: Complete Feature X.Y - [Feature Name]`
   - Body including:
     - Summary of implemented features
     - List of key changes
     - **Manual Testing Instructions** (see Manual Testing Guidelines below)
     - Test results confirmation
     - Reference to feature specification
4. **Tag the feature** as completed per the Git Tag System

### Example Workflow with Automatic PR Creation

```bash
# 1. Create a new feature branch using MCP tool
# mcp__github__create_branch(owner="username", repo="TTS-Chrome", branch="feature/feature-2.1-basic-tts")

# 2. Work on the feature, make commits

# 3. Run tests and checks
npm test
npm run lint
npm run typecheck

# 4. Upon feature completion, automatically create PR using MCP tool
# mcp__github__create_pull_request(
#   owner="username",
#   repo="TTS-Chrome",
#   title="feat: Complete Feature 2.1 - Basic TTS Implementation",
#   head="feature/feature-2.1-basic-tts",
#   base="develop",
#   body="## Summary\n- Implemented basic TTS functionality\n- Added voice selection support\n- Created message passing architecture\n\n## Changes\n- Added background service worker for TTS\n- Created content script for text selection\n- Implemented Chrome TTS API integration\n\n## Tests\n✅ All tests passing\n✅ Linting successful\n✅ Type checking passed\n\n## Feature Specification\nCompletes Feature 2.1 as defined in `specs/phase-2-core-tts/feature-2.1-basic-tts.md`"
# )

# 5. Create git tag for completed feature
# git tag feature-2.1-completed
```

#### Cross-Website Compatibility

**Test on these specific sites:**

- Wikipedia article (complex formatting)
- GitHub README (code blocks, mixed content)
- Google Docs (dynamic content)
- Reddit thread (nested comments)
- Medium article (rich text)

### Required Context Loading

Always load the documentation libraries in `ai_docs/` into context when working on this project:

#### Chrome Extension APIs (Comprehensive Coverage)

- **`ai_docs/chrome-extension-manifest-file-format.md`**: Manifest V3 structure and permissions
- **`ai_docs/chrome-extensions-permissions.md`**: Permission system details (storage, activeTab, contextMenus, tts)
- **`ai_docs/chrome-extension-samples.md`**: Extension patterns and examples (TTS, Storage, Runtime messaging)
- **`ai_docs/chrome-extension-tools.md`**: Development tools and utilities
- **`ai_docs/chrome-dev-tools.md`**: Chrome DevTools Protocol libraries and tooling

#### Development Technologies

- **`ai_docs/typescript.md`**: TypeScript patterns and best practices
- **`ai_docs/webpack.md`**: Build system configuration and patterns
- **`ai_docs/jest.md`**: Testing framework setup and patterns

#### UI and Styling

- **`ai_docs/tailwindCSS.md`**: CSS utilities and responsive design patterns

### Context Loading Workflow

1. **Start of Session**: Read all `ai_docs/*.md` files to understand available libraries and patterns
2. **Feature Implementation**: Reference relevant documentation for Chrome extension APIs, TypeScript patterns, and UI components
3. **Code Reviews**: Validate implementations against documented best practices

### Chrome API Coverage

The existing Chrome documentation provides comprehensive coverage for all TTS Extension requirements:

- **TTS API**: Voice enumeration, speech synthesis, event handling (samples + permissions)
- **Storage API**: Local/sync storage, data persistence patterns (samples + permissions)
- **Runtime Messaging**: Background ↔ Content ↔ Popup communication (samples)
- **Context Menus**: Right-click menu integration (samples + permissions)
- **Manifest V3**: Structure, permissions, service workers (manifest format)

This ensures consistent implementation patterns and proper usage of Chrome extension APIs throughout the project.

## Architecture Overview

### Component Structure

The extension follows Chrome MV3 architecture with distinct modules:

- **`src/background/`**: Service worker handling TTS control, voice management, queue management, and context menus
- **`src/content/`**: Content scripts for text selection detection, DOM interaction, and message handling
- **`src/popup/`**: Extension popup UI with playback controls and settings
- **`src/options/`**: Settings page for voice preferences and configuration
- **`src/common/`**: Shared utilities and type definitions

### Build System

- **Webpack** bundles TypeScript modules into separate entry points (`background.js`, `content.js`, `popup.js`, `options.js`)
- **CopyWebpackPlugin** handles static assets (manifest, HTML files, icons)
- **TypeScript** with strict mode, Chrome types, and ES2020 target

### Extension Architecture

The extension uses Chrome's messaging API for communication between components:

- Content scripts detect text selection and send to background
- Background manages TTS state, voice enumeration, and playback control
- Popup provides real-time UI controls and state display
- Options page handles persistent settings storage

## Key Technical Details

### Chrome APIs Used

- **`chrome.tts`**: Text-to-speech synthesis with voice control, rate/volume adjustment
- **`chrome.contextMenus`**: Right-click menu integration for selected text
- **`chrome.storage`**: Settings persistence and domain-specific preferences
- **`chrome.runtime`**: Message passing between extension components

### State Management Pattern

Centralized state in background script with message-based updates to UI components. State includes:

- Current reading status and position
- Playback queue management
- Voice preferences and settings
- Domain-specific overrides

### Text Processing Pipeline

1. Selection detection in content scripts
2. Text extraction and cleaning (HTML entities, formatting)
3. Sentence boundary detection and chunking
4. TTS synthesis with progress tracking
5. Queue management for multiple selections

## Development Patterns

### TypeScript Configuration

- Strict mode enabled with ES2020 target
- Chrome extension types included
- Path mapping for `@/` imports to `src/`
- Source maps for development debugging

### Testing Strategy

- **Jest** with `jsdom` environment for DOM testing
- Test files in `tests/` directory with setup configuration
- Coverage collection from `src/` TypeScript files
- Separate unit and integration test directories

### Code Organization

- Each component exports types and interfaces
- Shared utilities in `common/` directory
- Message protocols defined for inter-component communication
- Error handling patterns for TTS API limitations

## Extension Permissions

- `storage`: User preferences and settings
- `activeTab`: Access to current page content
- `contextMenus`: Right-click menu integration
- `tts`: Text-to-speech synthesis

## Feature Implementation Notes

### Voice Management

- System voice enumeration on startup
- Categorization by language, gender, quality
- Fallback handling for unavailable voices
- Voice testing with sample text

### Playback Controls

- Play/pause with position tracking
- Speed control (0.5x to 3.0x)
- Volume control independent of system
- Queue management for multiple selections
- Progress indication with time remaining

### Text Selection Handling

- Mouse and keyboard selection detection
- Minimum/maximum character limits
- Special content handling (code blocks, tables)
- Dynamic content and SPA compatibility

## Feature Completion Tracking

This project uses a comprehensive three-tier tracking system for feature completion:

### Git Tag System

- **Feature Tags**: `feature-X.Y-completed` (e.g., `feature-1.1-completed`)
- **Phase Tags**: `phase-X-completed` (created when all features in phase complete)
- **Milestone Tags**: Major project milestones
- **Commands**: `git tag feature-X.Y-completed <commit-hash>`

### Completion Workflow

1. **Complete Feature Implementation**
2. **Create Git Tag**: `git tag feature-X.Y-completed <commit-hash>`
3. **Commit Changes**: Include progress tracking updates in commit
4. **IMPORTANT**: Always commit after completing any feature (major or minor) to maintain project history and enable rollback capabilities

### Commit Guidelines

- **Feature Completion Commits**: Include tracking file updates and feature completion status
- **Commit Message Format**: `feat: Complete Feature X.Y - [Feature Name]`
- **Include in Commit**: Feature spec updates, progress file updates, any implementation files
- **Frequency**: Commit after every single feature completion, no matter how small
- **Example**: `feat: Complete Feature 1.1 - Basic Project Initialization`

### Tracking Commands

```bash
# View all completion tags
git tag -l

# Check specific feature status
head -5 specs/phase-X-*/feature-X.Y-*.md
```
