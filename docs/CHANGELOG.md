# Changelog

All notable changes to VidPly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.45] - 2026-04-12

### Added
- **MPEG-DASH Streaming**: Full DASH support via dash.js (loaded from CDN on demand)
  - Adaptive bitrate quality selection with quality menu
  - TTML/stpp subtitle rendering delegated to dash.js natively
  - WebVTT subtitle support with full caption styling and interactive transcript
  - Automatic renderer selection for `.mpd` URLs
  - Deferred loading support (`deferLoad: true`)
  - Robust error recovery and graceful stream teardown (`dash.reset()` before `dash.destroy()`)
  - TTML rendering div attached before `dash.initialize()` to prevent race conditions
  - Quality names include bitrate for disambiguation (e.g., "720p (1427 kbps)")
  - `supportsAutoQuality()` and `isAutoQuality()` for quality auto-switching
  - `handlesOwnCaptions()` to delegate TTML caption rendering to dash.js
- **Unified Text Cue Updates**: New `textcuesupdate` event emitted by both HLS and DASH renderers for dynamic transcript updates
- **HLS Cue Update Polling**: HLS renderer now emits `textcuesupdate` for incrementally loaded WebVTT subtitle segments (fixes transcript truncation)
- New `hideSpeedForDash` option to hide playback speed control for DASH streams
- Demo pages: `single-player-dash.html` and `dash-test.html` with multiple DASH test streams
- Unit tests for DASHRenderer (initialization, quality management, subtitle handling, error recovery, cleanup)

### Changed
- `CaptionManager.updateCaptions()` defers to renderers that handle their own captions (TTML)
- `TranscriptManager` listens for generic `textcuesupdate` event (replaces `dashtextcuesupdate`)
- `preventDragOnElement` now also stops `pointerdown` propagation (fixes autoscroll checkbox in transcript)
- Stale `TextTrack` filtering (`_vidplyStale` flag) prevents ghost tracks after stream switching

### Fixed
- Autoscroll checkbox in transcript window could not be unchecked due to `DraggableResizable` intercepting `pointerdown`
- `SourceBuffer append failed "InvalidStateError"` errors during DASH stream switching
- TTML rendering div race condition causing "Impossible to display subtitles" warnings
- HLS transcript ending prematurely (e.g., bipbop at 01:11) due to incremental subtitle loading
- Quality menu not showing differentiated levels for same-resolution, different-bitrate streams
- Control bar buttons not updating correctly when switching between DASH streams

## [1.0.44] - 2026-04-03

### Changed
- **WCAG 2.2 AA Compliance**: Upgraded accessibility target from WCAG 2.1 AA to WCAG 2.2 AA

### Fixed
- **Target Size (WCAG 2.2 SC 2.5.8)**: Ensured all interactive targets meet the 24×24 CSS px minimum
  - Progress bar: Added transparent `::before` hit area (9px visual → 24px target)
  - Progress handle: Increased from 15px to 24px
  - Volume slider: Expanded horizontal padding for 24px touch target
  - Volume handle: Increased from 10px to 24px
  - Resize handles (corners): Increased from 16px to 24px
  - Resize handles (edges): Increased from 8px to 24px on narrow axis
- **Dragging Movements (WCAG 2.2 SC 2.5.7)**: Verified all drag operations have single-pointer non-drag alternatives
  - Transcript/Sign Language windows: Keyboard D/R/Home/Esc + settings menu toggles
  - Progress bar: Click-to-seek + keyboard arrow keys
  - Volume slider: Click-to-set + keyboard Up/Down arrows
  - Playlist carousel: Native CSS scroll + Previous/Next buttons

### Documentation
- Updated WCAG compliance references from 2.1 to 2.2 in README, Users Guide, and Getting Started guide

## [1.0.40] - 2026-02-21

### Added
- **Dynamic HLS Subtitle Handling**: Automatic detection and loading of subtitle tracks from HLS manifests
- Light theme fixes and improvements
- Updated copyright year to 2026

### Fixed
- Removed blocked Akamai video from HLS stream demo page

## [1.0.39] - 2026-02-20

### Fixed
- **Transcript Dialog Overflow (WCAG 1.4.10)**: Fixed transcript dialog overflow issues for full-width video players, ensuring proper reflow compliance

## [1.0.38] - 2026-02-19

### Fixed
- Removed browser fallback message
- HTML5 validation errors for accessibility and media elements

### Changed
- Updated esbuild to version 0.27.3

## [1.0.37] - 2026-02-18

### Added
- **Testing Infrastructure**: Added Vitest for unit testing and Playwright for end-to-end testing
- **Sign Language Display Mode**: New display mode option for sign language overlay
- New Picture-in-Picture (PiP) icon for sign language window
- Single player and playlist demo pages for testing

### Fixed
- Close fullscreen when clicking external media in playlist preview list

## [1.0.36] - 2026-02-17

### Fixed
- **Comprehensive Fullscreen Mode Improvements**: Multiple fixes for fullscreen behavior across devices

## [1.0.35] - 2026-02-16

### Fixed
- Mobile overflow menu height when positioned below trigger button
- Added aspect ratio handling only for Vimeo or YouTube layers
- Keyboard drag mode improvements
- Multiple iOS playlist fixes
- **Sign Language Touch Support**: Enabled touch drag/resize for sign language overlay via Pointer Events

## [1.0.34] - 2026-02-15

### Fixed
- Audio artwork display in mixed playlists when poster image is available

## [1.0.33] - 2026-02-14

### Added
- **Deferred Loading**: Playlist selection now loads metadata without autoplay
- Initial duration display before media metadata is loaded
- Lazy loading for audio, video, and HLS files (only load on play)

### Changed
- Updated documentation and demo files

## [1.0.32] - 2026-02-13

### Fixed
- Hide speed control for HLS streams (detected by .m3u8 source URL)
- Removed outdated JavaScript code

## [1.0.31] - 2026-02-12

### Added
- **Preview Thumbnails**: Video preview thumbnails on hover over progress bar
- **Auto-Poster Generation**: Automatic poster image generation from video for playlists

## [1.0.30] - 2026-02-11

### Added
- **Preview Thumbnails**: Video preview thumbnails and auto-poster generation for single videos

### Changed
- Updated esbuild dependency

## [1.0.29] - 2026-02-10

### Fixed
- Audio description caption track swapping in playlists

### Added
- **Transcript Descriptions**: Always show descriptions in transcript and swap tracks for audio-described videos

## [1.0.28] - 2026-02-09

### Fixed
- Added missing translation strings

## [1.0.27] - 2026-02-08

### Added
- **Mixed Playlist Support**: Support for playlists containing both audio and video items

## [1.0.26] - 2026-02-07

### Fixed
- VidPly language detection with lazy loading

## [1.0.25] - 2026-02-06

### Added
- Added `dist/` directory to GitHub repository

### Changed
- **ESM Optimization**: Improved ES module builds with legacy code as optional

## [1.0.24] - 2026-02-05

### Added
- **Menu Keyboard Navigation**: Added scrollIntoView for keyboard navigation in all menu popups

## [1.0.23] - 2026-02-04

### Changed
- Removed light mode support (simplified theming)
- Converted all sizing to rem units for better accessibility scaling

## [1.0.22] - 2026-02-03

### Added
- **WCAG-Compliant Light Mode**: Added light mode with proper color-scheme support (later removed in 1.0.23)

## [1.0.21] - 2025-12-01

### Added
- **Single Audio File Artwork Display**: Track artwork is now displayed above single audio files (not just playlists). When a `poster` option is provided to a single audio file, VidPly automatically creates a track artwork element that shows the album art/cover image above the player, matching the visual presentation of playlists. The artwork uses a 16:3 aspect ratio with responsive styling.
- Responsive overflow menu for control bar when many buttons are present
- Transcript-style caption display for audio players (accumulating captions with highlighting)
- Drag and resize modes for transcript window with keyboard and mouse support
- Drag and resize modes for sign language video window
- Settings menus for transcript and sign language windows
- Dynamic button text and ARIA labels that change based on active state

### Changed
- **Touch Support for Transcript and Sign Language Drag/Resize**: Enabled touch support for dragging and resizing the transcript window and sign language video on touch devices. On mobile devices (< 768px), drag/resize is only available in fullscreen mode. On tablets and desktops (>= 768px), drag/resize works in all modes. Users can drag windows by touching the header and resize by touching the resize handles, providing the same functionality as mouse-based interactions.
- **Auto-Hide Controls in Landscape Fullscreen**: Controls now auto-hide in landscape fullscreen mode (like desktop), providing an immersive viewing experience. Touch/swipe the screen to show controls, and they'll auto-hide after inactivity. Controls remain always visible in portrait fullscreen mode (mobile layout).
- **Simplified Volume Control on Touch Devices**: On touch devices (iOS, Android, tablets), the volume control now shows a simple mute/unmute button instead of a volume slider. Mobile devices control HTML5 video volume through hardware buttons, so only a mute toggle is needed for quick silencing. Desktop devices retain the full volume slider control. This provides better UX by offering quick mute functionality while avoiding broken slider controls on mobile.
- Updated mobile breakpoint from 640px to 768px consistently across all CSS and JavaScript
- Mobile breakpoint logic now uses `< 768px` for mobile and `>= 768px` for desktop
- Transcript window minimum width: 370px on desktop, 300px on mobile
- Video transcript window also has minimum widths (same as audio)
- Improved responsive design for mobile devices

### Fixed
- **Menu Positioning in Landscape Mode**: Fixed menus not positioning correctly above buttons in landscape mode on desktop, tablet, and smartphone. Removed landscape-specific menu positioning CSS overrides that were interfering with the default menu centering logic. Menus now properly center above their buttons in all landscape scenarios using the default positioning (right: 50%; transform: translateX(50%)).
- **Desktop Overflow Menu in Landscape Fullscreen**: Fixed empty overflow menu button incorrectly appearing on desktop devices in landscape fullscreen mode. The overflow detection logic was forcing overflow for all landscape fullscreen scenarios, but should only apply to mobile devices (< 768px). Now desktop devices show all buttons directly without the overflow menu in fullscreen.
- **iOS/iPadOS Double Fullscreen Issue**: Fixed issue where native video fullscreen would appear above the pseudo-fullscreen on iOS/iPadOS devices. Added iOS/iPadOS detection to always use pseudo-fullscreen mode instead of attempting native Fullscreen API, preventing the video element from entering its own native fullscreen. Also added `webkit-playsinline` attribute for better iOS compatibility. Now only one fullscreen layer appears on iOS devices.
- **Touch Drag/Resize in Fullscreen Mode**: Fixed drag and resize functionality not working in fullscreen mode on mobile devices. Added fullscreen change listeners to re-initialize DraggableResizable instances when entering/exiting fullscreen on mobile. Added `touch-action: none` to transcript and sign language headers to prevent browser touch interference. Override mobile CSS `cursor: default !important` rule with `cursor: move !important` in fullscreen mode. Touch drag/resize now works correctly in fullscreen mode for both transcript window and sign language video on touch devices.
- **Mobile Fullscreen Landscape Caption Positioning**: Fixed captions not moving to the bottom when controls are hidden in landscape fullscreen. Captions now dynamically position at bottom: 16px when controls are hidden and move up to bottom: 96px when controls are visible or video is paused, providing optimal viewing experience without obstruction.
- **Mobile Fullscreen Landscape Menu Positioning Fix**: Fixed menus not positioning correctly above their buttons in landscape fullscreen. Added `position: relative` to all buttons so menus (which use `position: absolute`) can position relative to their parent button. Ensured menus use proper centering (`right: 50%; transform: translateX(50%)`) to appear directly centered above their respective buttons instead of misaligned to the side.
- **Mobile Fullscreen Landscape Auto-Hide on Touch Devices**: Fixed controls not auto-hiding after touch interaction in landscape fullscreen. The issue was the CSS `:hover` pseudo-class persisting on touch devices, keeping controls visible indefinitely. Now `:hover` behavior is isolated to desktop devices only using `@media (hover: hover) and (pointer: fine)`, while touch devices rely solely on JavaScript-controlled visibility classes. Controls now properly auto-hide after 4.5 seconds of inactivity on mobile.
- **Mobile Fullscreen Landscape Menu Positioning**: Fixed menus not positioning correctly above their buttons in landscape fullscreen. Changed from centered positioning (left: 50%; transform: translateX(-50%)) to right-aligned positioning (right: 0) so menus appear directly above their respective buttons.
- **Mobile Fullscreen Landscape Video Centering Fix**: Fixed video not being centered in the viewport in landscape fullscreen. Made video-wrapper absolutely positioned to fill entire player (top: 0; left: 0; right: 0; bottom: 0) and used flexbox to properly center the video both horizontally and vertically.
- **Mobile Fullscreen Landscape Menu Layout**: Fixed menus (overflow, speed, captions, etc.) displaying horizontally instead of vertically in landscape fullscreen. Added explicit flex-direction: column to ensure menu items stack vertically like in portrait mode, while maintaining horizontal layout for icon+text within each menu item.
- **Mobile Fullscreen Landscape Auto-Hide**: Fixed controls not auto-hiding in landscape fullscreen mode. Increased CSS specificity with !important rules to override mobile defaults, ensuring proper auto-hide behavior. Controls now hide after inactivity and show on touch/swipe.
- **Mobile Fullscreen Landscape Video Centering**: Fixed video not being centered in landscape fullscreen. Added flex centering (align-items: center, justify-content: center) to video-wrapper and proper object-fit: contain to video element.
- **Mobile Fullscreen Landscape Controls Visibility**: Fixed right-side controls (overflow menu, fullscreen button, etc.) not appearing in landscape fullscreen mode. Ensured all control containers and child buttons are properly displayed with display: flex and display: inline-flex rules.
- **Mobile Fullscreen Landscape Overflow Menu**: Fixed overflow menu detection in landscape fullscreen mode. The overflow detection now properly recognizes landscape fullscreen state and ensures buttons/overflow menu work correctly even when viewport width exceeds 768px.
- **iOS Fullscreen Mode**: Fixed fullscreen functionality on iPhone/iPad devices. Since iOS doesn't support the Fullscreen API on container elements, VidPly now automatically falls back to a "pseudo-fullscreen" mode that positions the player to fill the viewport using CSS. This provides a proper fullscreen experience on iOS while maintaining all player features.
- **Mobile Fullscreen Orientation-Aware Controls**: Fixed controls positioning based on device orientation in fullscreen mode. In **landscape** orientation, controls now overlay on the video at the bottom. In **portrait** orientation, controls remain below the video (mobile layout). This provides the optimal viewing experience for each orientation.
- **Mobile Menu z-index Fix**: Fixed overflow menu and volume menu appearing behind the video wrapper in fullscreen. Increased z-index to 100 for all menus to ensure they appear above all video content. Added pointer-events: auto to ensure menus are touchable.
- **iOS Volume Button Touch Support**: Fixed volume button not responding to touch on iOS and mobile devices. Added touchend event handler to the mute/volume button so the volume slider menu opens properly on touch devices.
- **iOS Volume Slider Touch Support**: Fixed volume slider not responding to touch input on iOS and mobile devices. Added touchstart, touchmove, touchend, and touchcancel event handlers to the volume slider, enabling proper touch interaction on all mobile devices. Added larger touch target (padding) and touch-action: none to prevent scrolling. Added touch event prevention on volume menu to stop event bubbling.
- Fixed overflow:hidden clipping controls and menus in fullscreen landscape by allowing video-wrapper to overflow:visible only in landscape orientation.
- Added touchmove event listener and enterfullscreen handler to ensure controls show when touching the screen in fullscreen.
- Increased auto-hide delay in fullscreen (1.5x normal delay) for better mobile UX.
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
- `dist/dev/vidply.esm.js` - ES Module (dev)
- `dist/prod/vidply.esm.min.js` - ES Module (prod)
- `dist/legacy/vidply.js` - IIFE bundle (dev)
- `dist/legacy/vidply.min.js` - IIFE bundle (prod)
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

