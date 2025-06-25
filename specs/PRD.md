# Personal Text-to-Speech Chrome Extension - Detailed PRD

## 1. Project Overview

### 1.1 Purpose

Build a personal Chrome extension that converts highlighted text to speech with multiple voice options, optimized for daily reading of articles, documentation, and web content.

### 1.2 Key Design Principles

- **Minimal Friction**: Highlight → Read with minimum clicks
- **Personal Preferences**: Remember all my settings
- **Works Everywhere**: Handle edge cases on different websites
- **Fast Response**: Instant playback, no loading delays

## 2. Detailed Functional Requirements

### 2.1 Text Selection & Detection

#### 2.1.1 Selection Methods

- **Mouse Selection**: Detect mouseup events after text selection
- **Keyboard Selection**: Detect Shift+Arrow key selections
- **Triple-Click**: Properly handle paragraph selection
- **Select All**: Handle Ctrl+A selections

#### 2.1.2 Selection Validation

- Minimum 3 characters (avoid accidental selections)
- Maximum 50,000 characters (Chrome TTS limit)
- Strip extra whitespace and formatting
- Handle special characters and emojis properly

#### 2.1.3 Edge Cases to Handle

- Text in iframes (if same-origin)
- Dynamically loaded content (SPAs)
- Text with mixed languages
- Code blocks and preformatted text
- Text with HTML entities (&amp;, &lt;, etc.)

### 2.2 Context Menu Integration

#### 2.2.1 Menu Structure

```
Right-click on selected text:
├── Read This (Default Voice)
├── Read This with...
│   ├── Voice 1
│   ├── Voice 2
│   └── Voice 3
└── Stop Reading
```

#### 2.2.2 Context Menu Logic

- Only show when text is selected
- "Stop Reading" only visible when audio is playing
- Submenu for quick voice switching
- Update menu labels with actual voice names

### 2.3 Voice Management

#### 2.3.1 Voice Discovery

- Enumerate all system voices on startup
- Categorize by:
  - Language (en-US, en-GB, etc.)
  - Gender (when identifiable)
  - Quality (local vs. online)
- Filter to only show relevant languages

#### 2.3.2 Voice Preferences

- Default voice selection
- Per-domain voice preferences (optional)
- Fallback voice if default unavailable
- Quick access to 3 favorite voices

#### 2.3.3 Voice Testing

- Preview button for each voice
- Sample text: "The quick brown fox jumps over the lazy dog. 1234567890."
- Volume meter during preview

### 2.4 Playback Controls

#### 2.4.1 Control Features

- **Play/Pause**: Resume from exact position
- **Stop**: Clear queue and reset
- **Skip**: Jump forward/back by sentence
- **Speed**: 0.5x to 3.0x in 0.1 increments
- **Volume**: Independent from system volume
- **Progress**: Visual progress bar with time remaining

#### 2.4.2 Playback Queue

- Queue multiple selections
- "Add to Queue" vs "Play Now" options
- Clear queue button
- Show queue length in popup

#### 2.4.3 Reading Modes

- **Continuous**: Auto-proceed to next paragraph
- **Selection Only**: Stop after selected text
- **Page Reader**: Read entire page from selection point

### 2.5 User Interface Details

#### 2.5.1 Popup Window (400x300px)

```
┌─────────────────────────────────────┐
│ Text-to-Speech Controller           │
├─────────────────────────────────────┤
│ Voice: [Google US English ▼]        │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ Currently Reading:             │   │
│ │ "This is the text being..."   │   │
│ └───────────────────────────────┘   │
│                                     │
│ [▶️] [⏸️] [⏹️] [⏮️] [⏭️]            │
│                                     │
│ Speed: ───────●───── 1.2x          │
│ Volume: ──────────●─ 90%           │
│                                     │
│ Progress: ████████░░░░ 2:34 / 3:45 │
│                                     │
│ [Queue (3)] [Settings] [History]   │
└─────────────────────────────────────┘
```

#### 2.5.2 Settings Page

```
Voice Settings:
- Default Voice: [Dropdown]
- Favorite Voices: [Multiple Select - max 3]
- Filter by Language: [Checkbox list]

Playback Settings:
- Default Speed: [Slider]
- Default Volume: [Slider]
- Reading Mode: [Radio buttons]
- Auto-pause on tab switch: [Toggle]

Keyboard Shortcuts:
- Read Selection: [Input field]
- Play/Pause: [Input field]
- Stop: [Input field]
- Speed Up/Down: [Input fields]

Advanced:
- Chunk Size: [Number - characters per chunk]
- Sentence Detection: [Improved/Basic]
- Skip Code Blocks: [Toggle]
- Read Alt Text: [Toggle]
```

#### 2.5.3 Mini Player (Floating)

```
┌─────────────────────┐
│ ▶️ ⏸️ ⏹️  1.2x  🔊  │
└─────────────────────┘
```

- Draggable position
- Remember position per domain
- Auto-hide after 5 seconds of inactivity
- Reappear on mouse hover

### 2.6 Keyboard Shortcuts

#### 2.6.1 Default Shortcuts

- `Alt+R`: Read selection
- `Alt+Space`: Play/Pause
- `Alt+S`: Stop
- `Alt+↑/↓`: Speed up/down
- `Alt+←/→`: Skip backward/forward
- `Alt+1/2/3`: Quick switch to favorite voices

#### 2.6.2 Shortcut Customization

- Detect conflicts with existing shortcuts
- Allow modifier key combinations
- Reset to defaults option
- Per-domain shortcut overrides

### 2.7 Text Processing

#### 2.7.1 Pre-processing Pipeline

1. Extract text from selection
2. Clean HTML entities
3. Expand abbreviations (optional)
   - "Dr." → "Doctor"
   - "etc." → "et cetera"
4. Handle URLs (read domain only or full URL)
5. Process numbers and units
   - "100km/h" → "100 kilometers per hour"
   - "$1,234.56" → "1,234 dollars and 56 cents"

#### 2.7.2 Sentence Boundary Detection

- Use proper sentence detection regex
- Handle edge cases:
  - "Mr. Smith went to Dr. Johnson"
  - "The temperature is 98.6 degrees"
  - Lists and bullet points
- Preserve paragraph breaks as pauses

#### 2.7.3 Special Content Handling

- **Code blocks**: Option to skip or read
- **Tables**: Read by row or column
- **Lists**: Pause between items
- **Quotes**: Slight voice change (if supported)

## 3. Technical Implementation Details

### 3.1 Architecture

#### 3.1.1 Component Structure

```
background.js
├── TTS Controller (singleton)
├── Voice Manager
├── Queue Manager
├── Settings Manager
└── Context Menu Manager

content.js
├── Selection Detector
├── Text Extractor
├── DOM Observer (for dynamic content)
└── Message Handler

popup.js
├── UI Controller
├── State Manager
└── Settings Bridge

options.js
└── Settings UI Handler
```

#### 3.1.2 State Management

```javascript
State = {
  isReading: boolean,
  currentText: string,
  currentPosition: number,
  queue: Array<TextItem>,
  settings: {
    defaultVoice: string,
    favoriteVoices: string[],
    speed: number,
    volume: number,
    // ... more settings
  },
  domainOverrides: {
    "example.com": { voice: "...", speed: 1.5 }
  }
}
```

#### 3.1.3 Message Protocol

```javascript
// Content → Background
{
  action: "READ_SELECTION",
  text: "Selected text...",
  url: "https://example.com",
  metadata: {
    language: "en",
    position: { x: 100, y: 200 }
  }
}

// Background → Popup
{
  action: "UPDATE_STATE",
  state: { ... }
}
```

### 3.2 Chrome APIs Usage

#### 3.2.1 Required Permissions

```json
{
  "permissions": [
    "contextMenus", // Right-click menu
    "storage", // Save preferences
    "activeTab", // Access current tab
    "tts" // Text-to-speech
  ],
  "optional_permissions": [
    "tabs", // For cross-tab features
    "<all_urls>" // For iframe access
  ]
}
```

#### 3.2.2 TTS API Implementation

```javascript
// Advanced TTS usage
chrome.tts.speak(text, {
  voiceName: selectedVoice,
  rate: speed,
  volume: volume,
  pitch: 1.0,
  onEvent: function (event) {
    if (event.type == "sentence") {
      updateProgress(event.charIndex);
    }
    if (event.type == "error") {
      handleError(event.errorMessage);
    }
  },
});
```

### 3.3 Performance Optimizations

#### 3.3.1 Text Chunking

- Break long texts into ~1000 character chunks
- Chunk at sentence boundaries
- Preload next chunk while current is playing
- Memory limit: 10MB text buffer

#### 3.3.2 Resource Management

- Lazy load voices list
- Debounce selection events (200ms)
- Throttle progress updates (100ms)
- Clean up finished audio immediately

#### 3.3.3 Error Handling

- Network voice timeout (3s fallback to local)
- Invalid selection recovery
- Chrome TTS API errors
- Memory pressure handling

## 4. Data Storage Schema

### 4.1 Local Storage Structure

```javascript
{
  // User Preferences
  "settings": {
    "defaultVoice": "Google US English",
    "favoriteVoices": ["Voice1", "Voice2", "Voice3"],
    "defaultSpeed": 1.2,
    "defaultVolume": 0.9,
    "shortcuts": { ... },
    "readingMode": "selection",
    "theme": "auto"
  },

  // Usage Statistics (Personal Analytics)
  "stats": {
    "totalCharactersRead": 1234567,
    "totalTimeListening": 3600, // seconds
    "favoriteVoiceUsage": { ... },
    "dailyUsage": { ... }
  },

  // Domain-Specific Settings
  "domains": {
    "github.com": {
      "voice": "Google UK English",
      "speed": 1.5,
      "skipCodeBlocks": true
    }
  },

  // Reading History (Optional)
  "history": [
    {
      "text": "First 50 chars...",
      "url": "https://...",
      "timestamp": 1234567890,
      "duration": 120
    }
  ]
}
```

## 5. Edge Cases & Error Scenarios

### 5.1 Content Handling

- Password fields (never read)
- Invisible text (display: none)
- Canvas/SVG text extraction
- PDF embed text
- Video captions
- Dynamic React/Vue content

### 5.2 TTS Limitations

- Rate limit handling (Chrome TTS)
- Voice loading failures
- Interrupted by system sounds
- Browser audio focus issues
- Background tab throttling

### 5.3 Permission Issues

- Incognito mode restrictions
- Enterprise policy blocks
- Cross-origin iframe limits
- Local file:// protocol

## 6. Testing Checklist

### 6.1 Functionality Tests

- [ ] All voice types play correctly
- [ ] Speed changes work mid-playback
- [ ] Pause/resume maintains position
- [ ] Queue management works
- [ ] Settings persist after restart
- [ ] Shortcuts work on all pages

### 6.2 Website Compatibility

- [ ] Google Docs
- [ ] GitHub (code and comments)
- [ ] Medium/Substack articles
- [ ] Reddit threads
- [ ] Wikipedia
- [ ] PDF viewers
- [ ] Gmail
- [ ] Slack web

### 6.3 Performance Tests

- [ ] 100k character text
- [ ] 100 queued items
- [ ] Rapid play/pause
- [ ] Memory usage over time
- [ ] CPU usage during playback

## 7. Future Enhancement Ideas

### 7.1 Power Features

- Spotify-like "Reading Radio" mode
- Voice cloning (read in your voice)
- Translation before reading
- Ebook/PDF full support
- Sync position across devices
- Export audio files
- Reading speed training mode

### 7.2 Quality of Life

- Dark mode UI
- Reading streaks/goals
- Pronunciation dictionary
- Custom SSML support
- Bookmark positions
- Note-taking while listening
- Integration with Pocket/Instapaper

## 8. Development Milestones

### Phase 1: Core (Week 1)

- Basic manifest and structure
- Simple text selection → TTS
- One working voice
- Play/stop functionality

### Phase 2: Control (Week 2)

- Full playback controls
- Multiple voices
- Speed/volume control
- Context menu

### Phase 3: Polish (Week 3)

- Settings persistence
- Keyboard shortcuts
- Error handling
- UI refinement

### Phase 4: Advanced (Week 4+)

- Queue management
- Per-domain settings
- Reading modes
- Performance optimization
