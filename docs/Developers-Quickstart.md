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
├── build/                       # Build scripts
│   ├── build.js                 # TypeScript bundling (esbuild → ESM + IIFE)
│   ├── build-css.js             # CSS build (clean-css)
│   ├── watch.js                 # Watch mode
│   └── clean.js                 # Clean dist
├── demo/                        # Demo pages
│   ├── demo.html                # Main demo
│   ├── playlist-audio.html      # Audio playlist demo
│   ├── playlist-video.html      # Video playlist demo
│   ├── hls-test.html            # HLS streaming demo
│   ├── dash-test.html           # DASH streaming demo
│   └── single-player-dash.html  # Single DASH player demo
├── dist/                        # Built files (generated)
│   ├── prod/vidply.esm.min.js   # ES Module (production)
│   ├── legacy/vidply.min.js     # IIFE (production)
│   ├── types/index.d.ts         # TypeScript declarations
│   └── vidply.min.css           # Styles (production)
├── docs/                        # Documentation
├── src/                         # Source code (strict TypeScript)
│   ├── core/
│   │   └── Player.ts            # Main Player class
│   ├── controls/
│   │   ├── ControlBar.ts        # Control bar UI (incl. download button, buffering spinner)
│   │   ├── CaptionManager.ts    # Caption handling
│   │   ├── KeyboardManager.ts   # Keyboard shortcuts
│   │   ├── SettingsDialog.ts    # Settings menu
│   │   └── TranscriptManager.ts
│   ├── features/
│   │   └── PlaylistManager.ts   # Playlist support
│   ├── i18n/
│   │   ├── i18n.ts              # i18n system
│   │   ├── translations.ts      # Translation loader
│   │   └── languages/           # Built-in languages
│   │       ├── en.ts
│   │       ├── de.ts
│   │       ├── es.ts
│   │       ├── fr.ts
│   │       └── ja.ts
│   ├── icons/
│   │   └── Icons.ts             # SVG icon definitions
│   ├── renderers/
│   │   ├── HTML5Renderer.ts     # Native HTML5 video/audio
│   │   ├── YouTubeRenderer.ts   # YouTube iframe API
│   │   ├── VimeoRenderer.ts     # Vimeo Player API
│   │   ├── SoundCloudRenderer.ts# SoundCloud Widget API
│   │   ├── HLSRenderer.ts       # hls.js integration + native iOS bridge
│   │   └── DASHRenderer.ts      # dash.js integration
│   ├── styles/
│   │   └── vidply.css           # Main stylesheet
│   ├── types/                   # Shared TypeScript types
│   │   ├── options.ts           # PlayerOptions
│   │   └── globals.d.ts         # Ambient declarations (Hls, dashjs, …)
│   ├── utils/
│   │   ├── DOMUtils.ts          # DOM helpers
│   │   ├── EventEmitter.ts      # Event system
│   │   ├── TimeUtils.ts         # Time formatting
│   │   ├── FocusUtils.ts        # Focus management
│   │   ├── MenuUtils.ts         # Menu helpers
│   │   ├── StorageManager.ts    # localStorage wrapper
│   │   └── ...
│   └── index.ts                 # Main entry point
├── index.html                   # Development page
├── tsconfig.json                # Strict TypeScript config
├── package.json
└── server.js                    # Dev server
```

---

## ⚡ NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build everything (TypeScript bundles + types + CSS) |
| `npm run build:js` | Bundle TypeScript with esbuild (ESM + IIFE) |
| `npm run build:types` | Emit `.d.ts` type declarations to `dist/types/` |
| `npm run build:css` | Build CSS only |
| `npm run typecheck` | `tsc --noEmit` strict type-check across `src/` |
| `npm run watch` | Watch mode (auto-rebuild) |
| `npm run dev` | Start dev server |
| `npm run clean` | Clean dist directory |
| `npm run start` | Build + start dev server |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

---

## 🏗️ Build System

### TypeScript bundles (esbuild)

`build/build.js` consumes the TypeScript sources directly (esbuild handles transpilation) and produces:

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

### Type declarations (tsc)

`npm run build:types` runs `tsc --emitDeclarationOnly` against `tsconfig.build.json` and emits:

| File | Use |
|------|-----|
| `dist/types/index.d.ts` | Public type entry, referenced from `package.json#types` |
| `dist/types/**/*.d.ts` | Per-module declarations for tree-shakable named imports |

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
│   ├── DownloadButton    # opt-in via downloadButton/downloadUrl
│   ├── SettingsButton
│   └── FullscreenButton
├── BufferingOverlay     # Centered loading spinner (.vidply-loading)
├── CaptionManager       # Captions/subtitles
├── KeyboardManager      # Keyboard shortcuts
├── TranscriptManager    # Interactive transcript
├── Renderer             # Media playback
│   ├── HTML5Renderer
│   ├── YouTubeRenderer
│   ├── VimeoRenderer
│   ├── SoundCloudRenderer
│   ├── HLSRenderer       # hls.js + native iOS TextTrack bridge
│   └── DASHRenderer
└── PlaylistManager      # Playlist handling
```

### Event Flow

```
User Action → KeyboardManager/ControlBar → Player → Renderer → DOM
                                              ↓
                                         EventEmitter → External Listeners
```

### Renderer Selection

```typescript
// src/core/Player.ts
selectRenderer(src: string): RendererCtor {
  if (isYouTubeUrl(src)) return YouTubeRenderer;
  if (isVimeoUrl(src)) return VimeoRenderer;
  if (src.includes('soundcloud.com')) return SoundCloudRenderer;
  if (isHLSUrl(src)) return HLSRenderer;   // hls.js (or native HLS on iOS/iPadOS)
  if (isDASHUrl(src)) return DASHRenderer;
  return HTML5Renderer;
}
```

> The HLS renderer self-decides whether to use `hls.js` (Chrome / Firefox / Edge / desktop Safari) or the native `<video>` HLS support (iOS / iPadOS where MSE is unavailable). On the native path it bridges the browser's `TextTrack` API into VidPly's caption / transcript / quality UI so feature parity is preserved.

---

## 📝 Adding Features

### New Control Button

1. **Add to ControlBar** (`src/controls/ControlBar.ts`):

```typescript
createMyButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'vidply-button vidply-my-button';
  button.setAttribute('aria-label', i18n.t('player.myButton'));
  button.innerHTML = Icons.myIcon;
  button.addEventListener('click', () => this.player.myAction());
  return button;
}
```

2. **Add icon** (`src/icons/Icons.ts`):

```typescript
export const Icons = {
  // ...existing icons
  myIcon: `<svg>...</svg>`,
} as const;
```

3. **Add translation** (`src/i18n/languages/en.ts`):

```typescript
export default {
  player: {
    // ...existing
    myButton: 'My Button',
  }
};
```

4. **Add to Player API** (`src/core/Player.ts`):

```typescript
myAction(): void {
  this.emit('myaction');
}
```

### New Renderer

1. **Create renderer** (`src/renderers/MyRenderer.ts`):

```typescript
import type { Player } from '../core/Player';

export class MyRenderer {
  constructor(public player: Player) {}

  async init(): Promise<void> { /* ... */ }
  async load(src: string): Promise<void> { /* ... */ }
  play(): void { /* ... */ }
  pause(): void { /* ... */ }
  seek(time: number): void { /* ... */ }
  setVolume(vol: number): void { /* ... */ }
  getCurrentTime(): number { /* ... */ }
  getDuration(): number { /* ... */ }
  destroy(): void { /* ... */ }
}
```

2. **Register in Player**:

```typescript
import { MyRenderer } from '../renderers/MyRenderer';

// In selectRenderer()
if (isMyServiceUrl(src)) return MyRenderer;
```

### New Language

1. **Create language file** (`src/i18n/languages/pt.ts`):

```typescript
export default {
  player: {
    play: 'Reproduzir',
    pause: 'Pausar',
    // ... all translations
  }
};
```

2. **Register** (`src/i18n/translations.ts`):

```typescript
import pt from './languages/pt';

export const translations = {
  en, de, es, fr, ja,
  pt,
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
   - `demo/dash-test.html` - DASH streaming

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
| `hlsmanifestparsed` | data | HLS manifest parsed |
| `dashqualitychanged` | data | DASH quality changed |
| `textcuesupdate` | - | New text cues available (HLS/DASH) |
| `captionsenabled` | track | Captions enabled |
| `captionsdisabled` | - | Captions disabled |
| `playlisttrackchange` | item | Playlist track changed |
| `error` | error | Error occurred |

---

## 🐛 Debugging

### Enable Debug Mode

```typescript
const player = new Player('#video', { debug: true });
```

### Console Logging

```typescript
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
| Entry point | `src/index.ts` |
| Player class | `src/core/Player.ts` |
| Player options type | `src/types/options.ts` |
| Control bar | `src/controls/ControlBar.ts` |
| Captions | `src/controls/CaptionManager.ts` |
| Keyboard | `src/controls/KeyboardManager.ts` |
| i18n | `src/i18n/i18n.ts` |
| Styles | `src/styles/vidply.css` |
| Icons | `src/icons/Icons.ts` |
| TypeScript config | `tsconfig.json` |

### Build Output

| File | Format | Size |
|------|--------|------|
| `vidply.esm.min.js` | ESM | ~45KB |
| `vidply.min.js` | IIFE | ~50KB |
| `vidply.min.css` | CSS | ~15KB |

### External Dependencies

| Dependency | Purpose | Loaded |
|------------|---------|--------|
| hls.js | HLS streaming (Chrome / Firefox / Edge / desktop Safari) | On demand (CDN) |
| dash.js | DASH streaming | On demand (CDN) |
| YouTube IFrame API | YouTube playback | On demand |
| Vimeo Player API | Vimeo playback | On demand |
| SoundCloud Widget API | SoundCloud playback | On demand |

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

- Strict TypeScript (`strict: true`, `noImplicitAny`, `strictNullChecks`)
- BEM CSS naming
- Meaningful variable names
- Comment non-obvious intent (not _what_ the code does)
- Include ARIA attributes on every interactive element
- Run `npm run typecheck` and `npm run test` before committing

---

**Version:** 1.1.3 | **License:** GPL-2.0-or-later

