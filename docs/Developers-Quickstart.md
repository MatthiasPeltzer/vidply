# Developer Quickstart

Quick reference for developers contributing to or extending VidPly.

---

## 🚀 Setup

```bash
# Clone repository
git clone https://github.com/MatthiasPeltzer/vidply.git
cd vidply

# Install dependencies
npm install

# Build production files
npm run build

# Start dev server
npm run dev
```

Dev server runs at `http://localhost:3000`

---

## 📁 Directory Structure

```
vidply/
├── build/                    # Build scripts
│   ├── build.js              # JavaScript build (esbuild)
│   ├── build-css.js          # CSS build (clean-css)
│   ├── watch.js              # Watch mode
│   └── clean.js              # Clean dist
├── demo/                     # Demo pages
│   ├── demo.html             # Main demo
│   ├── playlist-audio.html   # Audio playlist demo
│   ├── playlist-video.html   # Video playlist demo
│   └── hls-test.html         # HLS streaming demo
├── dist/                     # Built files (generated)
│   ├── prod/vidply.esm.min.js# ES Module (production)
│   ├── legacy/vidply.min.js  # IIFE (production)
│   └── vidply.min.css        # Styles (production)
├── docs/                     # Documentation
├── src/                      # Source code
│   ├── core/
│   │   └── Player.js         # Main Player class
│   ├── controls/
│   │   ├── ControlBar.js     # Control bar UI
│   │   ├── CaptionManager.js # Caption handling
│   │   ├── KeyboardManager.js# Keyboard shortcuts
│   │   ├── SettingsDialog.js # Settings menu
│   │   └── TranscriptManager.js
│   ├── features/
│   │   └── PlaylistManager.js# Playlist support
│   ├── i18n/
│   │   ├── i18n.js           # i18n system
│   │   ├── translations.js   # Translation loader
│   │   └── languages/        # Built-in languages
│   │       ├── en.js
│   │       ├── de.js
│   │       ├── es.js
│   │       ├── fr.js
│   │       └── ja.js
│   ├── icons/
│   │   └── Icons.js          # SVG icon definitions
│   ├── renderers/
│   │   ├── HTML5Renderer.js  # Native HTML5 video/audio
│   │   ├── YouTubeRenderer.js# YouTube iframe API
│   │   ├── VimeoRenderer.js  # Vimeo Player API
│   │   └── HLSRenderer.js    # HLS.js integration
│   ├── styles/
│   │   └── vidply.css        # Main stylesheet
│   ├── utils/
│   │   ├── DOMUtils.js       # DOM helpers
│   │   ├── EventEmitter.js   # Event system
│   │   ├── TimeUtils.js      # Time formatting
│   │   ├── FocusUtils.js     # Focus management
│   │   ├── MenuUtils.js      # Menu helpers
│   │   ├── StorageManager.js # localStorage wrapper
│   │   └── ...
│   └── index.js              # Main entry point
├── index.html                # Development page
├── package.json
└── server.js                 # Dev server
```

---

## ⚡ NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build everything (JS + CSS) |
| `npm run build:js` | Build JavaScript only |
| `npm run build:css` | Build CSS only |
| `npm run watch` | Watch mode (auto-rebuild) |
| `npm run dev` | Start dev server |
| `npm run clean` | Clean dist directory |
| `npm run start` | Build + start dev server |

---

## 🏗️ Build System

### JavaScript (esbuild)

`build/build.js` produces:

| File | Format | Use |
|------|--------|-----|
| `dev/vidply.esm.js` | ES Module | Development |
| `prod/vidply.esm.min.js` | ES Module | Production |
| `legacy/vidply.js` | IIFE | Development |
| `legacy/vidply.min.js` | IIFE | Production |

**Features:**
- Code splitting (renderers loaded on demand)
- Tree shaking
- Source maps (development)
- Minification (production)

### CSS (clean-css)

`build/build-css.js` produces:

| File | Use |
|------|-----|
| `vidply.css` | Development |
| `vidply.min.css` | Production |

---

## 🎯 Architecture

### Core Components

```
Player
├── ControlBar           # UI controls
│   ├── PlayButton
│   ├── ProgressBar
│   ├── VolumeControl
│   ├── SettingsButton
│   └── FullscreenButton
├── CaptionManager       # Captions/subtitles
├── KeyboardManager      # Keyboard shortcuts
├── TranscriptManager    # Interactive transcript
├── Renderer             # Media playback
│   ├── HTML5Renderer
│   ├── YouTubeRenderer
│   ├── VimeoRenderer
│   └── HLSRenderer
└── PlaylistManager      # Playlist handling
```

### Event Flow

```
User Action → KeyboardManager/ControlBar → Player → Renderer → DOM
                                              ↓
                                         EventEmitter → External Listeners
```

### Renderer Selection

```javascript
// src/core/Player.js
selectRenderer(src) {
  if (isYouTubeUrl(src)) return YouTubeRenderer;
  if (isVimeoUrl(src)) return VimeoRenderer;
  if (isHLSUrl(src)) return HLSRenderer;
  return HTML5Renderer;
}
```

---

## 📝 Adding Features

### New Control Button

1. **Add to ControlBar** (`src/controls/ControlBar.js`):

```javascript
createMyButton() {
  const button = document.createElement('button');
  button.className = 'vidply-button vidply-my-button';
  button.setAttribute('aria-label', this.i18n.t('player.myButton'));
  button.innerHTML = Icons.myIcon;
  button.addEventListener('click', () => this.player.myAction());
  return button;
}
```

2. **Add icon** (`src/icons/Icons.js`):

```javascript
export const Icons = {
  // ...existing icons
  myIcon: `<svg>...</svg>`,
};
```

3. **Add translation** (`src/i18n/languages/en.js`):

```javascript
export default {
  player: {
    // ...existing
    myButton: 'My Button',
  }
};
```

4. **Add to Player API** (`src/core/Player.js`):

```javascript
myAction() {
  // Implementation
  this.emit('myaction');
}
```

### New Renderer

1. **Create renderer** (`src/renderers/MyRenderer.js`):

```javascript
export class MyRenderer {
  constructor(player, container) {
    this.player = player;
    this.container = container;
  }
  
  async load(src) { /* ... */ }
  play() { /* ... */ }
  pause() { /* ... */ }
  seek(time) { /* ... */ }
  setVolume(vol) { /* ... */ }
  getCurrentTime() { /* ... */ }
  getDuration() { /* ... */ }
  destroy() { /* ... */ }
}
```

2. **Register in Player**:

```javascript
import { MyRenderer } from '../renderers/MyRenderer.js';

// In selectRenderer()
if (isMyServiceUrl(src)) return MyRenderer;
```

### New Language

1. **Create language file** (`src/i18n/languages/pt.js`):

```javascript
export default {
  player: {
    play: 'Reproduzir',
    pause: 'Pausar',
    // ... all translations
  }
};
```

2. **Register** (`src/i18n/translations.js`):

```javascript
import pt from './languages/pt.js';

export const translations = {
  en, de, es, fr, ja,
  pt,  // Add new language
};
```

---

## 🎨 CSS Architecture

### Variables

```css
:root {
  /* Colors */
  --vidply-primary-color: #3b82f6;
  --vidply-background: rgba(0, 0, 0, 0.8);
  --vidply-text-color: #ffffff;
  
  /* Sizing */
  --vidply-button-size: 40px;
  --vidply-icon-size: 20px;
  
  /* Spacing */
  --vidply-gap-sm: 4px;
  --vidply-gap-md: 8px;
  --vidply-gap-lg: 12px;
}
```

### BEM Naming

```css
.vidply-player { }           /* Block */
.vidply-player--fullscreen { } /* Modifier */
.vidply-controls { }         /* Block */
.vidply-controls__left { }   /* Element */
.vidply-button { }           /* Block */
.vidply-button--active { }   /* Modifier */
```

### Accessibility

```css
/* High contrast mode */
@media (forced-colors: active) {
  .vidply-button {
    border: 1px solid currentColor;
  }
}

/* Focus visible */
.vidply-button:focus-visible {
  outline: 2px solid var(--vidply-primary-color);
  outline-offset: 2px;
}

/* Touch targets */
.vidply-button {
  min-width: 44px;
  min-height: 44px;
}
```

---

## 🧪 Testing

### Manual Testing

1. Open `http://localhost:3000` after `npm run dev`
2. Test demos:
   - `demo/demo.html` - Full features
   - `demo/playlist-audio.html` - Audio playlists
   - `demo/playlist-video.html` - Video playlists
   - `demo/hls-test.html` - HLS streaming

### Accessibility Testing

- **Keyboard:** Navigate using only keyboard
- **Screen reader:** Test with NVDA/VoiceOver
- **High contrast:** Enable Windows HCM
- **Mobile:** Test touch interactions

### Browser Testing

| Browser | Priority |
|---------|----------|
| Chrome | High |
| Firefox | High |
| Safari | High |
| Edge | Medium |
| iOS Safari | High |
| Android Chrome | Medium |

---

## 🔌 Plugin System

### EventEmitter

```javascript
// Player extends EventEmitter
player.on('play', () => console.log('Playing'));
player.on('pause', () => console.log('Paused'));
player.on('timeupdate', (time) => console.log(time));

// Custom events
player.emit('mycustomevent', { data: 'value' });
```

### Available Events

| Event | Data | Description |
|-------|------|-------------|
| `ready` | - | Player initialized |
| `play` | - | Playback started |
| `pause` | - | Playback paused |
| `ended` | - | Playback ended |
| `timeupdate` | time | Current time changed |
| `volumechange` | volume | Volume changed |
| `playbackspeedchange` | speed | Speed changed |
| `fullscreenchange` | isFullscreen | Fullscreen toggled |
| `captionsenabled` | track | Captions enabled |
| `captionsdisabled` | - | Captions disabled |
| `playlisttrackchange` | item | Playlist track changed |
| `error` | error | Error occurred |

---

## 🐛 Debugging

### Enable Debug Mode

```javascript
const player = new Player('#video', { debug: true });
```

### Console Logging

```javascript
// In development, use:
if (this.options.debug) {
  console.log('[VidPly]', message, data);
}
```

### Common Issues

| Issue | Debug Steps |
|-------|-------------|
| Player not initializing | Check `data-vidply` attribute; check console errors |
| Renderer not loading | Check source URL format; verify network requests |
| Captions not showing | Validate VTT syntax; check CORS |
| Keyboard not working | Check `keyboard: true`; verify focus |

---

## 📚 Documentation Files

| File | Content |
|------|---------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Basic setup |
| [USAGE.md](USAGE.md) | Detailed API usage |
| [PLAYLIST.md](PLAYLIST.md) | Playlist features |
| [TRANSCRIPT.md](TRANSCRIPT.md) | Transcript system |
| [KEYBOARD.md](KEYBOARD.md) | Keyboard shortcuts |
| [BUILD.md](BUILD.md) | Build system details |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [Users-Guide.md](Users-Guide.md) | Integration guide |

---

## 🔗 Quick Reference

### Key Files

| What | Where |
|------|-------|
| Entry point | `src/index.js` |
| Player class | `src/core/Player.js` |
| Control bar | `src/controls/ControlBar.js` |
| Captions | `src/controls/CaptionManager.js` |
| Keyboard | `src/controls/KeyboardManager.js` |
| i18n | `src/i18n/i18n.js` |
| Styles | `src/styles/vidply.css` |
| Icons | `src/icons/Icons.js` |

### Build Output

| File | Format | Size |
|------|--------|------|
| `vidply.esm.min.js` | ESM | ~45KB |
| `vidply.min.js` | IIFE | ~50KB |
| `vidply.min.css` | CSS | ~15KB |

### External Dependencies

| Dependency | Purpose | Loaded |
|------------|---------|--------|
| HLS.js | HLS streaming | On demand |
| YouTube IFrame API | YouTube playback | On demand |
| Vimeo Player API | Vimeo playback | On demand |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Test thoroughly
5. Build: `npm run build`
6. Commit: `git commit -m 'Add my feature'`
7. Push: `git push origin feature/my-feature`
8. Open Pull Request

### Code Style

- ES6+ JavaScript
- BEM CSS naming
- Meaningful variable names
- Comment complex logic
- Include ARIA attributes

---

**Version:** 1.0.25 | **License:** GPL-2.0-or-later

