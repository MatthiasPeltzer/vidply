# Changelog

All notable changes to VidPly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Caption track selector menu - Click CC button to switch between available caption languages
- Visual indicator (checkmark) for active caption track
- Keyboard shortcut (<kbd>C</kbd>) now opens caption menu when multiple tracks available
- Automatic icon update when captions are enabled/disabled

## [1.0.0] - 2024-10-08

### Initial Release

VidPly v1.0.0 is here! A complete, production-ready video player built with vanilla ES6 JavaScript.

### Added

#### Core Features
- HTML5 video and audio playback support
- Multiple format support (MP3, OGG, WAV, MP4, WebM)
- YouTube integration with custom controls
- Vimeo integration with unified API
- HLS streaming support with adaptive bitrate
- Responsive player design

#### Controls & UI
- Play/Pause button with state indication
- Progress bar with seek functionality
- Time display (current/duration)
- Volume control with vertical slider
- Mute/unmute button
- Playback speed control (0.25x - 2x)
- Fullscreen toggle
- Picture-in-Picture support
- Settings dialog with preferences
- Auto-hiding controls on video
- Hover tooltips on progress bar

#### Accessibility
- Full keyboard navigation (WCAG 2.1 AA compliant)
- Screen reader support with ARIA labels
- Customizable keyboard shortcuts
- High contrast mode support
- Focus indicators for all interactive elements
- Live region announcements
- Reduced motion support
- Minimum 44px touch targets on mobile

#### Captions & Subtitles
- WebVTT caption/subtitle support
- Multiple language track support
- Customizable caption styling (font, size, color)
- Background color and opacity controls
- Caption positioning options
- VTT formatting support (bold, italic, voice tags)

#### Internationalization
- English (en) translation
- Spanish (es) translation
- French (fr) translation
- German (de) translation
- Japanese (ja) translation
- Easy-to-extend translation system
- Runtime language switching

#### Developer Features
- Vanilla ES6 modules (no build required)
- Clean, documented API
- Event system for state changes
- Programmatic player control
- Multiple players on same page
- Auto-initialization via data attributes
- Manual initialization support
- Destroy/cleanup methods
- Debug mode for development

#### Performance
- Lazy loading support
- Configurable preload strategies
- Efficient event handling
- Minimal dependencies
- Small footprint (~50KB uncompressed)

### Technical Details

#### Architecture
- Modular ES6 class-based design
- Renderer pattern for different media sources
- Plugin system for extending functionality
- Event-driven architecture
- Separation of concerns (MVC-like)

#### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

#### Renderers
- HTML5Renderer - Native video/audio
- YouTubeRenderer - YouTube IFrame API
- VimeoRenderer - Vimeo Player API
- HLSRenderer - HLS.js integration

#### Components
- Player - Core player class
- ControlBar - UI controls manager
- CaptionManager - Caption/subtitle handler
- KeyboardManager - Keyboard navigation
- SettingsDialog - Settings interface
- EventEmitter - Event system

#### Utilities
- DOMUtils - DOM manipulation helpers
- TimeUtils - Time formatting utilities
- i18n - Internationalization system

### Documentation
- Comprehensive README with API reference
- Quick start guide
- Detailed usage documentation
- Inline code documentation
- Live demo with examples

#### Build System
- **esbuild** - Fast JavaScript bundler
- **clean-css** - CSS minifier
- Build scripts for creating production bundles
- Watch mode for development
- Multiple output formats (ESM, IIFE)
- Source maps for debugging
- Automatic minification

#### Build Scripts
- `build/build.js` - Main JavaScript build
- `build/build-css.js` - CSS build and minification
- `build/watch.js` - Development watch mode
- `build/clean.js` - Clean dist directory

#### Output Files
- `dist/vidply.esm.js` - ES Module (dev)
- `dist/vidply.esm.min.js` - ES Module (prod)
- `dist/vidply.js` - IIFE bundle (dev)
- `dist/vidply.min.js` - IIFE bundle (prod)
- `dist/vidply.css` - Styles (unminified)
- `dist/vidply.min.css` - Styles (minified)

#### Source Files
- `src/core/Player.js` - Main player class (~500 lines)
- `src/controls/ControlBar.js` - Control bar component (~600 lines)
- `src/controls/CaptionManager.js` - Caption management (~200 lines)
- `src/controls/KeyboardManager.js` - Keyboard handling (~150 lines)
- `src/controls/SettingsDialog.js` - Settings UI (~300 lines)
- `src/renderers/HTML5Renderer.js` - HTML5 playback (~200 lines)
- `src/renderers/YouTubeRenderer.js` - YouTube support (~250 lines)
- `src/renderers/VimeoRenderer.js` - Vimeo support (~220 lines)
- `src/renderers/HLSRenderer.js` - HLS streaming (~250 lines)
- `src/utils/EventEmitter.js` - Event system
- `src/utils/DOMUtils.js` - DOM utilities
- `src/utils/TimeUtils.js` - Time utilities
- `src/i18n/i18n.js` - i18n system
- `src/i18n/translations.js` - Translation strings (5 languages)
- `src/icons/Icons.js` - SVG icon library (30+ icons)
- `src/styles/vidply.css` - Player styles (~800 lines)
- `src/index.js` - Entry point

#### Demo Files
- `demo/demo.html` - Full demo with local media files
- `demo/index.html` - Demo landing page
- `demo/media/` - Demo media files (videos, audio, captions)

#### Documentation
- `README.md` - Complete documentation (~500 lines)
- `GETTING_STARTED.md` - Quick start guide
- `INSTALL.md` - Installation guide
- `USAGE.md` - Detailed usage examples
- `QUICKSTART.md` - 3-step quick start
- `BUILD.md` - Build system documentation
- `CHANGELOG.md` - This file
- `LICENSE` - GPL-2.0-or-later License
- `package.json` - Package config with build scripts

### Statistics
- **Total Lines of Code:** ~4,000+
- **Minified Size (JS):** ~50 KB
- **Minified Size (CSS):** ~12 KB
- **Gzipped Total:** ~18 KB
- **Source Files:** 22
- **Build Scripts:** 4
- **SVG Icons:** 30+
- **Languages:** 5 built-in
- **Demo Files:** 20+ media files

[1.0.0]: https://github.com/yourusername/vidply/releases/tag/v1.0.0

