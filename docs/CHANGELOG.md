# Changelog

All notable changes to VidPly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Responsive overflow menu for control bar when many buttons are present
- Transcript-style caption display for audio players (accumulating captions with highlighting)
- Drag and resize modes for transcript window with keyboard and mouse support
- Drag and resize modes for sign language video window
- Settings menus for transcript and sign language windows
- Dynamic button text and ARIA labels that change based on active state

### Changed
- Updated mobile breakpoint from 640px to 768px consistently across all CSS and JavaScript
- Mobile breakpoint logic now uses `< 768px` for mobile and `>= 768px` for desktop
- Transcript window minimum width: 370px on desktop, 300px on mobile
- Video transcript window also has minimum widths (same as audio)
- Improved responsive design for mobile devices

### Fixed
- **iOS Fullscreen Mode**: Fixed fullscreen functionality on iPhone/iPad devices. Since iOS doesn't support the Fullscreen API on container elements, VidPly now automatically falls back to a "pseudo-fullscreen" mode that positions the player to fill the viewport using CSS. This provides a proper fullscreen experience on iOS while maintaining all player features.
- Added ESC key support for exiting pseudo-fullscreen mode on iOS and other devices without native Fullscreen API support.
- Improved fullscreen API error handling with automatic fallback to pseudo-fullscreen when native API fails.
- Transcript window resize functionality now properly shows resize handles and works with mouse
- Sign language video resize functionality improved
- Consistent breakpoint logic throughout the codebase

### Documentation
- Updated all documentation files with drag/resize features
- Fixed mobile breakpoint references (640px → 768px)
- Added comprehensive keyboard shortcut documentation for D and R keys
- Enhanced transcript and sign language documentation with settings menu details

## [1.0.11] - 2025-11-15

### Added
- Sign language video settings menu with keyboard drag, resize, and close options
- Multiple sign language video sources support with automatic language selector
- Automatic sign language video switching when captions change (if language codes match)
- Accessible labels for all select boxes (visually hidden but available to screen readers)
- FormUtils.js utility module for creating accessible form elements
- `createLabeledSelect()` utility function for creating labeled select elements
- `toggleLabeledSelect()` utility function for showing/hiding labeled select elements
- `preventDragOnElement()` utility function for centralized drag prevention
- Translation keys `closeSignLanguage` and `signLanguageSettings` for all built-in languages

### Changed
- Dropdown menus now use `aria-expanded` instead of `aria-pressed` or `aria-haspopup` for better accessibility
- Improved dropdown menu focus management - Escape key returns focus to trigger button
- Enhanced tab navigation - open dropdowns close when tabbing to another button without disrupting focus
- Sign language settings menu positioning now uses parent container for proper alignment
- Refactored language selector creation to use new FormUtils utilities

### Fixed
- Resize icon not displaying in transcript and sign language settings menus
- Sign language settings button not functioning correctly
- Dropdown menus closing both old and new menus when clicking between buttons
- Focus jumping back to previous button when pressing Escape
- Menu positioning jumps when opening dropdowns
- Incorrect translation text in sign language close button ("Close transcript" → "Close sign language video")
- Sign language settings menu not supporting arrow key navigation

### Improved
- **Accessibility**
  - All select boxes now have properly associated labels for screen readers
  - Better ARIA attribute usage throughout dropdown menus
  - Enhanced keyboard navigation matching Bootstrap 5.3 patterns
  - Consistent focus management across all interactive elements

- **Code Quality**
  - Reduced code duplication by extracting common patterns into utilities
  - Improved maintainability with centralized form element creation
  - Consistent patterns for all language selectors

### Documentation
- Updated sign language documentation with multiple video sources and language switching
- Added documentation for sign language settings menu and keyboard shortcuts
- Enhanced README with updated sign language feature description

## [1.0.5] - 2025-10-16

### Added
- Full internationalization for time display and duration formatting
- Translation strings for all time units (hours, minutes, seconds) in all 5 supported languages
- Proper pluralization support for time units across languages
- i18n support for "Time display" aria-label and "Duration:" prefix

### Changed
- `TimeUtils.formatDuration()` now uses i18n system instead of hardcoded English strings
- Time display aria-labels now translate based on player's language setting
- Screen reader announcements for time and duration now properly localized

### Improved
- **Internationalization**
  - All UI elements including time displays are now fully translated
  - Time formatting respects language-specific conventions
  - Proper singular/plural forms for all supported languages (en, de, es, fr, ja)
  - Enhanced accessibility with translated aria-labels for screen readers

### Documentation
- Updated README.md with comprehensive feature descriptions
- Added live demo links for GitHub Pages
- Enhanced API documentation with playlist examples
- Improved contribution guidelines
- Updated copyright year to 2025

## [1.0.4] - 2025-10-16

### Added
- Previous/Next track navigation buttons in playlist mode
- Dynamic control button visibility based on available features (captions, chapters, transcript)
- Focus management - returns focus to player after playlist item activation
- Semantic HTML structure with proper `<ul>` and `<li>` elements for playlists
- Comprehensive ARIA attributes for playlist items (`aria-posinset`, `aria-setsize`, `aria-current`)
- ARIA live regions for announcing track changes to screen readers
- ARIA landmarks (`role="region"`) for playlist panel
- Visually hidden keyboard instructions for screen reader users
- Track position context ("Track X of Y") in playlist item labels
- Human-readable time announcements for screen readers (e.g., "3 minutes, 23 seconds" instead of "03:23")
- Screen reader-only status indicators for currently playing tracks

### Changed
- Playlist items now use semantic `<li>` elements instead of `<div>` elements
- Control bar dynamically updates when media tracks change
- Transcript content now updates automatically when switching between playlist items
- Time displays now use `aria-hidden` on visual format and `aria-label` for natural language
- Improved heading structure with proper `<h2>` elements in playlist

### Improved
- **Keyboard Navigation**
  - Roving tabindex pattern for efficient playlist navigation (only one item in tab order)
  - Arrow key navigation (↑/↓) through playlist items
  - Home/End keys to jump to first/last track
  - Enter/Space to play selected track
- **Accessibility**
  - WCAG 2.1 Level AA compliant playlist navigation
  - Enhanced focus states with visible outlines (2px solid)
  - Better screen reader context with position, status, and action instructions
  - Intelligent time format announcements (adapts based on duration length)
- **User Experience**
  - Seamless keyboard workflow from playlist to playback controls
  - Smart button appearance (show only when features are available per track)
  - Playlist stays open during track changes with updated transcript content

### Fixed
- Screen readers no longer read time formats character by character (colons, individual digits)
- Transcript now properly updates when navigating between tracks with different captions
- Control buttons (captions, chapters, transcript) now appear/disappear correctly per track
- Focus state properly maintained throughout playlist interactions

## [1.0.1] - 2025-10-12

### Added
- Caption track selector menu - Click CC button to switch between available caption languages
- Visual indicator (checkmark) for active caption track
- Keyboard shortcut (<kbd>C</kbd>) now opens caption menu when multiple tracks available
- Automatic icon update when captions are enabled/disabled

## [1.0.0] - 2025-10-11

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
- `docs/GETTING_STARTED.md` - Getting started guide (installation + quick start)
- `docs/USAGE.md` - Detailed usage examples
- `docs/PLAYLIST.md` - Playlist feature documentation
- `docs/BUILD.md` - Build system documentation
- `docs/CHANGELOG.md` - This file
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

