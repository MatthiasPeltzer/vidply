# <img src="favicon.svg" width="32" alt="VidPly" /> VidPly

**Universal, Accessible Video & Audio Player**

A modern, feature-rich media player authored in strict TypeScript and shipped as a zero-dependency ES module. Combines
the best accessibility features from AblePlayer with the streaming capabilities of MediaElement.js. Fully
internationalized with support for 5 languages and complete WCAG 2.2 AA compliance.

![License](https://img.shields.io/badge/license-GPL--2.0--or--later-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![ESM](https://img.shields.io/badge/ESM-Module-yellow.svg)
![WCAG](https://img.shields.io/badge/WCAG-2.2%20AA-green.svg)
![npm version](https://img.shields.io/npm/v/vidply.svg)

## Live Demos

Try VidPly in action:

- **[Main Demo](https://matthiaspeltzer.github.io/vidply/demo/demo.html)** - Full-featured video player showcase
- **[Audio Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-audio.html)** - Audio player with playlist
  support
- **[Video Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-video.html)** - Video playlist with
  thumbnails
- **[Mixed Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html)** - Combined audio and video
  playlist
- **[HLS Streaming](https://matthiaspeltzer.github.io/vidply/demo/hls-test.html)** - Adaptive bitrate streaming demo
- **[DASH Streaming](https://matthiaspeltzer.github.io/vidply/demo/dash-test.html)** - MPEG-DASH streaming demo

## Why VidPly?

- **Zero Dependencies** - Pure vanilla JavaScript / TypeScript, no frameworks required
- **TypeScript Native** - Authored in strict TypeScript with shipped type declarations (`dist/types/index.d.ts`)
- **Accessibility First** - WCAG 2.2 AA compliant with full keyboard and screen reader support
- **Multilingual** - Built-in translations for 5 languages with easy extensibility
- **Fully Customizable** - CSS variables and comprehensive API
- **Modern Build** - ES modules with tree-shaking, code-splitting and source maps
- **Production Ready** - Thoroughly tested with real-world media content

## Features

### Core Media Support

- **Audio & Video Playback** - Native HTML5 support for both media types
- **Multiple Formats** - MP3, OGG, WAV (audio) / MP4, WebM (video)
- **YouTube Integration** - Embed YouTube videos with unified controls
- **Vimeo Integration** - Seamless Vimeo player integration
- **SoundCloud Integration** - Play SoundCloud tracks and sets via the Widget API with unified controls
- **HLS Streaming** - Adaptive bitrate streaming with quality selection and dynamic subtitle detection
  - Uses **hls.js 1.6.16** on Chrome / Firefox / Edge / desktop Safari for full feature parity (quality menu, captions,
    transcript)
  - Falls back to native HLS on iOS / iPadOS where MSE is unavailable; native text tracks are still surfaced through the
    VidPly captions and transcript UI
- **DASH Streaming** - MPEG-DASH support via **dash.js 5.2.0** (modern UMD) with adaptive quality, TTML and WebVTT subtitles
- **Buffering Spinner** - Centered loading spinner shown automatically while media is buffering (HTML5, HLS, DASH)
- **Download Button** - Optional download control with custom URL support (`downloadButton` + `downloadUrl`)
- **Preview Thumbnails** - Video preview thumbnails on progress bar hover
- **OS Media Controls** - Media Session API integration: now-playing metadata (title/artist/album/artwork) and lock-screen / notification / headset controls, including previous/next track for playlists
- **Playlists** - Full playlist support with auto-advance and navigation
  - Audio playlists with track info
  - Video playlists with thumbnails
  - **Mixed playlists** - Combine audio and video in a single playlist
  - Previous/Next controls
  - Visual playlist panel
  - **Fullscreen Mode**: YouTube-style horizontal carousel
    - Auto-show/hide based on playback state
    - Swipeable touch interface
    - Responsive card layout

### Accessibility Features (WCAG 2.2 AA Compliant)

- **Full Keyboard Navigation** - All features accessible via keyboard, custom shortcuts, menu navigation with Arrow keys
  (non-interactive/disabled menu items are excluded from roving focus)
- **Screen Reader Support** - Complete ARIA labels (`aria-controls`, `aria-expanded`, `aria-haspopup`), live regions;
  single-select menus (speed/quality/captions) use `role="menuitemradio"` + `aria-checked`, and both mouse- and
  keyboard-driven play/pause, caption and volume changes are announced
- **Interactive Transcripts** - Click-to-seek and auto-scroll with proper semantic HTML and a focus trap while open
- **Sign Language Overlay** - Picture-in-picture with drag/resize, keyboard accessible
- **Audio Description** - Alternate audio track with visual content descriptions
- **Caption Styling** - Fully customizable (font, size, color, opacity, edge style)
- **High Contrast Mode** - Windows HCM support, color-independent design
- **Reduced Motion** - Smooth scrolling and animations honor `prefers-reduced-motion` (SC 2.3.3)
- **Zoom & Reflow** - Pinch-zoom is preserved even in (pseudo-)fullscreen; no fixed `maximum-scale` lock (SC 1.4.4 /
  1.4.10)
- **Focus Management** - Logical focus order, programmatic focus handling, visible indicators, focus traps in the
  transcript window and settings dialog
- **Touch Accessibility** - Buttons, resize handles and slider thumbs sized at or above the WCAG 2.2 AA 24×24
  CSS-pixel minimum (SC 2.5.8); swipeable interfaces

### Captions & Subtitles

- **WebVTT Support** - Standard caption format
- **Multiple Languages** - Multi-track support
- **Caption Selector** - Easy track switching with CC button
- **Caption Styling** - Dedicated styling dialog (font, size, color, opacity)
- **Chapter Navigation** - Jump to video chapters
- **Interactive Transcripts** - Click-to-seek transcript panel (browser Find-in-page works for searching)

### Playback Features

- **Adjustable Speed** - 0.25x to 2x playback
- **Seek Controls** - Forward/backward navigation
- **Volume Control** - 0-100% with mute
- **Loop Playback** - Single or playlist loop
- **Fullscreen Mode** - Native fullscreen API with smart playlist overlay
- **Picture-in-Picture** - Native browser PiP support (toggled via the standard PiP button)
- **Custom Floating Player (Miniplayer)** - Optional in-page floating window that
  - automatically floats when the original player scrolls out of the viewport and docks back when it scrolls in
  - can be pinned/unpinned manually via the PiP button (manual pin overrides scroll behavior)
  - is fully draggable and resizable, with persistent geometry per player
  - keeps VidPly captions, transport controls and fullscreen working inside the floating shell
  - suppresses native browser PiP automatically while enabled
  - is desktop-only (disabled below 768 px viewport width by default)

### Internationalization

Built-in support for 5 languages:

- English (en)
- Spanish (es) - Español
- French (fr) - Français
- German (de) - Deutsch
- Japanese (ja) - 日本語

All UI elements are fully translated, including:

- Control buttons and menus
- Time display and duration formatting
- Keyboard shortcuts
- Error messages and notifications
- ARIA labels for screen readers

**Custom Translations**: Easily add your own languages by loading JSON or YAML translation files via data attributes or
JavaScript options. The player automatically detects the HTML `lang` attribute and loads matching translations.

## Installation

### Build from Source

First, build the player:

```bash
# Install dependencies
npm install

# Build production files
npm run build
```

This creates minified files in the `dist/` folder.

### Option 1: Using Built Files (Recommended for Production)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="dist/vidply.min.css">
</head>
<body>
  <video data-vidply src="video.mp4" width="800" height="450">
    <track kind="subtitles" src="captions.vtt" srclang="en" label="English">
  </video>

  <script type="module">
    import Player from './dist/prod/vidply.esm.min.js';
    // Auto-initialized via data-vidply attribute
  </script>
</body>
</html>
```

### Option 2: Traditional Script Tag (IIFE)

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script src="dist/legacy/vidply.min.js"></script>

<video id="my-video" src="video.mp4"></video>

<script>
  const player = new VidPly.Player('#my-video', {
    controls: true,
    autoplay: false,
    volume: 0.8,
    language: 'en'
  });
</script>
```

### Option 3: Development (TypeScript Sources)

```typescript
import Player from './src/index';

const player = new Player('#my-video', {
  controls: true,
  autoplay: false,
  volume: 0.8,
  language: 'en'
});
```

> The library is authored in strict TypeScript. Type declarations ship to `dist/types/index.d.ts` so consumers using
`tsc` or `vite` get full IntelliSense without any extra `@types` package.

## Quick Start

### 1. Build the Player

```bash
npm install
npm run build
```

### 2. Add to Your Page

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script type="module">
  import Player from './dist/prod/vidply.esm.min.js';
</script>
```

### 3. Create a Video Player

```html
<video data-vidply width="800" height="450">
  <source src="video.mp4" type="video/mp4">
  <track kind="subtitles" src="captions-en.vtt" srclang="en" label="English">
  <track kind="subtitles" src="captions-es.vtt" srclang="es" label="Español">
</video>
```

That's it! The player auto-initializes.

### YouTube Player

```html
<video data-vidply src="https://www.youtube.com/watch?v=VIDEO_ID"></video>
```

### Vimeo Player

```html
<video data-vidply src="https://vimeo.com/VIDEO_ID"></video>
```

### Audio Player

```html
<audio data-vidply>
  <source src="audio.mp3" type="audio/mpeg">
</audio>
```

### HLS Streaming

```html
<video data-vidply src="https://example.com/stream.m3u8"></video>
```

### DASH Streaming

```html
<video data-vidply src="https://example.com/manifest.mpd"></video>
```

### SoundCloud

```html
<audio data-vidply src="https://soundcloud.com/artist/track"></audio>
```

### Download Button

Enable the download button and (optionally) provide a custom URL:

```html
<video
  data-vidply
  data-vidply-download-button="true"
  data-vidply-download-url="/files/lecture.mp4"
  src="/streams/lecture/manifest.mpd">
</video>
```

```javascript
const player = new Player('#my-video', {
  downloadButton: true,
  downloadUrl: '/files/lecture.mp4' // optional, falls back to current src
});
```

### Custom Floating Player (Miniplayer)

Enable the in-page floating player ("own PiP"). When the original video scrolls
out of the viewport, VidPly pops up a draggable, resizable floating shell in the
chosen corner; when the original scrolls back in, it docks again. Users can also
manually pin/unpin the floating player via the PiP button in the control bar.
The native browser Picture-in-Picture API is automatically suppressed while
floating is enabled, so users get a single, consistent experience.

Enable via the `data-vidply-options` JSON blob:

```html
<video
  data-vidply
  data-vidply-options='{"floating": true, "floatingPosition": "bottom-right", "floatingMinViewportWidth": 768}'
  src="video.mp4"
  width="800" height="450">
  <track kind="subtitles" src="captions.vtt" srclang="en" label="English">
</video>
```

Or programmatically:

```javascript
const player = new Player('#my-video', {
  floating: true,
  floatingPosition: 'bottom-right', // or 'bottom-left' | 'top-right' | 'top-left'
  floatingMinViewportWidth: 768     // disable feature below this viewport width
});
```

Notes:

- Audio-only players (`<audio>`) ignore the floating option.
- Closing the floating window pauses playback and prevents auto-float again until the next user-initiated `play`.
- The floating window persists its size/position per player via local storage.
- Below `floatingMinViewportWidth` (default 768 px) the PiP button is hidden and the floating feature is disabled.

### DASH + HLS + MP4 Fallback

For maximum device compatibility, provide all three formats:

```html
<video data-vidply width="800" height="450" poster="preview.jpg">
  <source src="video/dash/manifest.mpd" type="application/dash+xml">
  <source src="video/hls/master.m3u8" type="application/x-mpegURL">
  <source src="video/fallback.mp4" type="video/mp4">
  <track kind="subtitles" src="video/vtt/subtitles.de.vtt" srclang="de" label="Deutsch" default>
  <track kind="subtitles" src="video/vtt/subtitles.en.vtt" srclang="en" label="English">
  <track kind="chapters" src="video/vtt/chapters.de.vtt" srclang="de" label="Kapitel">
</video>
```

VidPly auto-detects the source type by file extension (`.mpd` / `.m3u8` / `.mp4`) and selects the appropriate renderer.

## Configuration Options

```javascript
const player = new Player('#video', {
  // Display
  width: 800,
  height: 450,
  poster: 'poster.jpg',
  responsive: true,

  // Media metadata + OS media controls (Media Session API)
  title: null,                  // Now-playing title (lock-screen / notification)
  artist: null,                 // Now-playing artist/author
  album: null,                  // Now-playing album/collection
  mediaSession: true,           // Expose OS media controls + metadata (set false to opt out)

  // Playback
  autoplay: false,
  loop: false,
  muted: false,
  volume: 0.8,
  playbackSpeed: 1.0,
  startTime: 0,
  
  // Controls
  controls: true,
  hideControlsDelay: 3000,
  playPauseButton: true,
  progressBar: true,
  currentTime: true,
  duration: true,
  volumeControl: true,
  muteButton: true,
  chaptersButton: true,
  qualityButton: true,
  captionStyleButton: true,
  speedButton: true,
  captionsButton: true,
  transcriptButton: true,
  audioDescriptionButton: true,
  signLanguageButton: true,
  fullscreenButton: true,
  helpButton: true,             // Show a keyboard-shortcuts help button (requires keyboard: true)
  pipButton: false,
  downloadButton: false,        // Show a download button in the control bar
  downloadUrl: null,            // Optional explicit download URL (falls back to current src)
  downloadFormat: null,         // Optional override for the displayed download format (e.g. "MP4")
  downloadFileSize: null,       // Optional override for the displayed file size (bytes)
  downloadFetchSize: true,      // Issue a HEAD request to detect file size when not provided

  // Custom Floating Player (in-page miniplayer / "own PiP")
  floating: false,                          // Enable the custom floating player; also disables native browser PiP
  floatingPosition: 'bottom-right',         // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  floatingMinViewportWidth: 768,            // Floating feature is hidden below this viewport width (px)

  // Seeking
  seekInterval: 10,
  seekIntervalLarge: 30,

  // Captions
  captions: true,
  captionsDefault: false,
  captionsFontSize: '100%',
  captionsFontFamily: 'sans-serif',
  captionsColor: '#FFFFFF',
  captionsBackgroundColor: '#000000',
  captionsOpacity: 0.8,

  // Audio Description
  audioDescription: true,
  audioDescriptionSrc: null, // URL to audio-described version

  // Sign Language
  signLanguage: true,
  signLanguageSrc: null, // URL to sign language video
  signLanguagePosition: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
  signLanguageDisplayMode: 'both',      // 'pip' (overlay) | 'main' (source swap) | 'both'
  signLanguageSources: undefined,       // { en: '/sl/en.mp4', de: '/sl/de.mp4', ... }

  // Transcripts
  transcript: false,
  transcriptPosition: 'external',
  transcriptContainer: null,
  
  // Keyboard (defaults; do not assign the same key to two actions)
  keyboard: true,
  keyboardShortcuts: {
    'play-pause': [' ', 'p', 'k'],
    'seek-forward': ['ArrowRight'],
    'seek-backward': ['ArrowLeft'],
    'volume-up': ['ArrowUp'],
    'volume-down': ['ArrowDown'],
    'mute': ['m'],
    'fullscreen': ['f'],
    'captions': ['c'],
    'caption-style-menu': ['a'],
    'speed-up': ['>'],
    'speed-down': ['<'],
    'speed-menu': ['s'],
    'quality-menu': ['q'],
    'chapters-menu': ['j'],
    'transcript-toggle': ['t'],
    'help': ['?']
  },
  
  // Accessibility
  screenReaderAnnouncements: true,
  focusHighlight: true,
  highContrast: false,
  ariaLabels: {},                 // Override individual ARIA labels by i18n key
  metadataAlerts: {},             // Map of metadata-cue keys to alert handlers (opt-in)
  metadataHashtags: {},           // Map of metadata-cue hashtags to handler config (opt-in)

  // Internationalization
  language: 'en',
  languages: ['en'],
  languageFiles: undefined,       // { pt: '/i18n/pt.json', it: '/i18n/it.json' }
  languageFile: undefined,        // Single language code to load
  languageFileUrl: undefined,     // URL for the single language file

  // Resume Playback
  resumePlayback: true,           // Save and offer to resume playback position
  resumeThreshold: 10,            // Seconds; do not offer resume if less than this was watched
  resumePrompt: true,             // false = silently auto-resume

  // Thumbnail Preview
  thumbnailPreview: true,
  thumbnailCacheSize: 50,
  thumbnailPregenerate: true,
  thumbnailInterval: 10,
  thumbnailWidth: 160,
  thumbnailHeight: 90,
  thumbnailQuality: 0.8,

  // Lazy Loading
  lazyInit: true,
  lazyMargin: '200px',

  // Theming
  theme: 'dark',                  // 'dark' | 'light' | 'minimal' | 'high-contrast'
  themeVariables: {},             // Custom --vidply-* CSS variable overrides

  // Callbacks
  onReady: () => console.log('Ready!'),
  onPlay: () => console.log('Playing!'),
  onPause: () => console.log('Paused!'),
  onEnded: () => console.log('Ended!'),
  onTimeUpdate: (t) => {},
  onVolumeChange: (v) => {},
  onError: (err) => console.error(err),

  // Streaming
  hideSpeedForHls: false,         // Hide speed control for ALL HLS streams
  hideSpeedForHlsVideo: false,    // Hide speed control only for HLS video (e.g. live streams)
  hideSpeedForDash: false,        // Hide speed control for ALL DASH streams
  hideSpeedForDashVideo: false,   // Hide speed control only for DASH video

  // Advanced
  debug: false,
  pauseOthersOnPlay: true,
  classPrefix: 'vidply',          // CSS class prefix and event/storage namespace
  iconType: 'svg',
  initialDuration: 0,             // Optional duration shown before metadata is loaded
  requirePlaybackForAccessibilityToggles: false, // If true, AD/SL toggles before play show a notice instead of starting playback
  fillContainer: false,
  playsInline: true,              // Inline playback on iOS

  // Performance
  preload: 'metadata',            // 'none', 'metadata', or 'auto'
  deferLoad: false                // Delay loading until user plays (good for many players)
});
```

## Keyboard Shortcuts

| Key                                            | Action                                        |
|------------------------------------------------|-----------------------------------------------|
| <kbd>Space</kbd> / <kbd>P</kbd> / <kbd>K</kbd> | Play/Pause                                    |
| <kbd>F</kbd>                                   | Toggle Fullscreen                             |
| <kbd>M</kbd>                                   | Mute/Unmute                                   |
| <kbd>↑</kbd> / <kbd>↓</kbd>                    | Volume Up/Down                                |
| <kbd>←</kbd> / <kbd>→</kbd>                    | Seek -10s / +10s                              |
| <kbd>C</kbd>                                   | Toggle Captions (or open menu if multiple)    |
| <kbd>A</kbd>                                   | Open Caption Style Menu                       |
| <kbd><</kbd> / <kbd>></kbd>                    | Decrease/Increase Speed                       |
| <kbd>S</kbd>                                   | Open Speed Menu                               |
| <kbd>Q</kbd>                                   | Open Quality Menu                             |
| <kbd>J</kbd>                                   | Open Chapters Menu                            |
| <kbd>T</kbd>                                   | Toggle Transcript                             |
| <kbd>?</kbd>                                   | Show Keyboard Shortcuts help                  |
| <kbd>D</kbd>                                   | Toggle Drag Mode (Transcript/Sign Language)   |
| <kbd>R</kbd>                                   | Toggle Resize Mode (Transcript/Sign Language) |
| <kbd>Escape</kbd>                              | Exit Drag/Resize Mode or Close Menus          |
| <kbd>Home</kbd>                                | Reset Transcript/Sign Language Position       |

## API Reference

### Playback Control

```javascript
player.play()           // Start playback
player.pause()          // Pause playback
player.stop()           // Stop and reset
player.toggle()         // Toggle play/pause
player.seek(30)         // Seek to 30 seconds
player.seekForward(10)  // Skip forward 10 seconds
player.seekBackward(10) // Skip backward 10 seconds
```

### Volume Control

```javascript
player.setVolume(0.5)   // Set volume (0.0-1.0)
player.getVolume()      // Get current volume
player.mute()           // Mute audio
player.unmute()         // Unmute audio
player.toggleMute()     // Toggle mute state
```

**Note on Mobile Devices:** On touch devices (iOS, Android, tablets), only a **mute/unmute button** is shown instead of
the volume slider. Mobile browsers control HTML5 video volume through **hardware device volume buttons** - this is
standard behavior that cannot be overridden by web apps for security reasons. The mute button provides quick silencing
functionality while hardware buttons control actual volume levels.

### Playback Speed

```javascript
player.setPlaybackSpeed(1.5)  // Set speed (0.25-2.0)
player.getPlaybackSpeed()     // Get current speed
```

### Fullscreen

```javascript
player.enterFullscreen()  // Enter fullscreen
player.exitFullscreen()   // Exit fullscreen
player.toggleFullscreen() // Toggle fullscreen
```

**Note on iOS/Mobile Safari:** Since iOS doesn't support the Fullscreen API on container elements, VidPly automatically
falls back to a "pseudo-fullscreen" mode that positions the player to fill the entire viewport using CSS. This provides
a fullscreen-like experience on iOS devices while maintaining all player functionality.

### Captions

```javascript
player.enableCaptions()   // Enable captions
player.disableCaptions()  // Disable captions
player.toggleCaptions()   // Toggle captions

// Switch between caption tracks
player.captionManager.switchTrack(0)  // Switch to first track
player.captionManager.getAvailableTracks()  // Get all tracks
```

### Transcript

```javascript
// Show/Hide Transcript
player.transcriptManager.showTranscript()     // Show transcript window
player.transcriptManager.hideTranscript()     // Hide transcript window
player.transcriptManager.toggleTranscript()   // Toggle transcript visibility

// Drag & Resize Modes (Desktop only, mobile breakpoint: 768px)
player.transcriptManager.toggleKeyboardDragMode()   // Toggle drag mode (D key)
player.transcriptManager.toggleResizeMode()         // Toggle resize mode (R key)

// Settings Menu
player.transcriptManager.showSettingsMenu()    // Show settings dropdown
player.transcriptManager.hideSettingsMenu()    // Hide settings dropdown

// Check State
if (player.transcriptManager.isVisible) {
  console.log('Transcript is visible');
}
```

### Audio Description

```javascript
player.enableAudioDescription()   // Switch to described version
player.disableAudioDescription()  // Switch back to original
player.toggleAudioDescription()   // Toggle audio description
```

### Sign Language

```javascript
// Show/Hide Sign Language Video
player.enableSignLanguage()   // Show sign language overlay
player.disableSignLanguage()  // Hide sign language overlay
player.toggleSignLanguage()   // Toggle sign language

// Multi-Language Support
player.switchSignLanguage('de')  // Switch to German sign language

// Drag & Resize (available via settings menu or keyboard)
// D key - Toggle drag mode with arrow keys
// R key - Toggle resize mode (shows resize handles)
// Home key - Reset position
// Escape - Exit drag/resize mode
```

### Playlists

```javascript
import { Player, PlaylistManager } from './dist/prod/vidply.esm.min.js';

// Create player
const player = new Player('#my-player');

// Create playlist manager
const playlist = new PlaylistManager(player, {
  autoAdvance: true,   // Auto-play next track
  loop: false,         // Loop back to start
  showPanel: true      // Show playlist UI
});

// Load tracks
playlist.loadPlaylist([
  {
    src: 'track1.mp3',
    title: 'Track 1',
    artist: 'Artist Name',
    poster: 'thumb1.jpg'
  },
  {
    src: 'track2.mp3',
    title: 'Track 2',
    artist: 'Artist Name',
    tracks: [
      { src: 'captions.vtt', kind: 'captions', srclang: 'en' }
    ]
  }
]);

// Control playlist
playlist.next()         // Go to next track
playlist.previous()     // Go to previous track
playlist.goToTrack(2)   // Jump to specific track
playlist.hasNext()      // Check if next track exists
playlist.hasPrevious()  // Check if previous track exists

// Listen for track changes
player.on('playlisttrackchange', (e) => {
  // e: { index: number, item: PlaylistTrack, total: number, previousIndex?: number }
  console.log(`Now playing track ${e.index + 1} / ${e.total}:`, e.item.title);
});
```

### Settings

```javascript
player.showSettings()  // Open settings dialog
player.hideSettings()  // Close settings dialog
```

### Keyboard Shortcuts Help

```javascript
player.toggleKeyboardHelp()  // Toggle the keyboard-shortcuts help dialog
player.showKeyboardHelp()    // Open the help dialog
player.hideKeyboardHelp()    // Close the help dialog
```

The dialog is built from the live `keyboardShortcuts` bindings (including any
overrides) and is also reachable via the control-bar help button and the
<kbd>?</kbd> shortcut.

### State Information

```javascript
player.getCurrentTime()  // Get current time
player.getDuration()     // Get duration
player.isPlaying()       // Check if playing
player.isPaused()        // Check if paused
player.isEnded()         // Check if ended
player.isMuted()         // Check if muted
player.isFullscreen()    // Check if fullscreen
```

### Event Listeners

```javascript
player.on('ready', () => {})
player.on('play', () => {})
player.on('pause', () => {})
player.on('ended', () => {})
player.on('timeupdate', (time) => {})
player.on('volumechange', (volume) => {})
player.on('playbackspeedchange', (speed) => {})
player.on('fullscreenchange', (isFullscreen) => {})
player.on('hlsmanifestparsed', (data) => {})
player.on('dashqualitychanged', (data) => {})
player.on('textcuesupdate', () => {})
player.on('captionsenabled', (track) => {})
player.on('captionsdisabled', () => {})
player.on('error', (error) => {})
```

### Cleanup

```javascript
player.destroy()  // Remove player and cleanup
```

## Customization

### Custom Styling

VidPly provides extensive CSS variables for easy customization:

```css
/* Override default colors and sizing */
.vidply-player {
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
  
  /* Border radius */
  --vidply-radius-sm: 4px;
  --vidply-radius-md: 8px;
  --vidply-radius-lg: 12px;
  
  /* Transitions */
  --vidply-transition-fast: 150ms;
  --vidply-transition-normal: 300ms;
}

/* Custom progress bar */
.vidply-progress-played {
  background: linear-gradient(90deg, #667eea, #764ba2);
}

/* Custom buttons */
.vidply-button:hover {
  background: rgba(59, 130, 246, 0.2);
}
```

### Add Custom Language

#### Option 1: Load from URL (Recommended)

```html
<video 
  data-vidply 
  data-vidply-language-files='{"pt": "languages/pt.json", "it": "languages/it.json"}'
  src="video.mp4"
></video>
```

#### Option 2: JavaScript API

```typescript
import { i18n } from './src/i18n/i18n';

// Load language file from URL
await i18n.loadLanguageFromUrl('pt', 'languages/pt.json');

// Or load multiple languages
await i18n.loadLanguagesFromUrls({
  'pt': 'languages/pt.json',
  'it': 'languages/it.json'
});

// Set the language
i18n.setLanguage('pt');
```

#### Option 3: Add Translations Programmatically

```typescript
import { i18n } from './src/i18n/i18n';

i18n.addTranslation('pt', {
  player: {
    play: 'Reproduzir',
    pause: 'Pausar',
    mute: 'Silenciar',
    unmute: 'Ativar som'
  }
});

i18n.setLanguage('pt');
```

#### Language File Format

Create `languages/pt.json`:

```json
{
  "player": {
    "play": "Reproduzir",
    "pause": "Pausar",
    "mute": "Silenciar",
    "unmute": "Ativar som",
    "fullscreen": "Tela cheia",
    "captions": "Legendas"
  },
  "time": {
    "currentTime": "Tempo atual",
    "duration": "Duração"
  }
}
```

The player supports both JSON and YAML formats for language files.

## Build Process

VidPly uses a modern build system with esbuild for TypeScript bundling, the TypeScript compiler for `.d.ts`
declarations, and clean-css for CSS.

### Available Scripts

```bash
npm run build        # Build everything (JS + types + CSS)
npm run build:js     # Bundle TypeScript with esbuild (ESM + IIFE)
npm run build:types  # Emit type declarations to dist/types/
npm run build:css    # Build CSS only
npm run typecheck    # Run tsc --noEmit
npm run watch        # Watch mode for development
npm run clean        # Clean dist directory
npm run dev          # Start dev server
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run end-to-end tests (Playwright)
npm run test:all     # Run all tests
```

### Output Files

- `dist/dev/vidply.esm.js` - ES Module (development)
- `dist/prod/vidply.esm.min.js` - ES Module (production)
- `dist/legacy/vidply.js` - IIFE (development)
- `dist/legacy/vidply.min.js` - IIFE (production)
- `dist/types/index.d.ts` - TypeScript declarations
- `dist/vidply.css` - Styles (unminified)
- `dist/vidply.min.css` - Styles (minified)

See [BUILD.md](docs/BUILD.md) for detailed build documentation.

## Browser Support

The library ships two bundles. Pick the one that matches your audience:

**Modern ESM bundle** (`dist/prod/vidply.esm.min.js`) — recommended.

- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+
- iOS Safari 15+
- Android Chrome 100+

**Legacy IIFE bundle** (`dist/legacy/vidply.min.js`) — for older browser support.

- Chrome 80+
- Firefox 78+
- Safari 14+
- Edge 88+

The TypeScript declarations target ES2022; both bundles are produced with esbuild + Terser.
See [BUILD.md](docs/BUILD.md) for the exact targets.

## License

GNU General Public License v2.0 or later

Copyright (C) 2026 Matthias Peltzer

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

See [LICENSE](LICENSE) for full license text.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Documentation

### Guides

- **[User's Guide](docs/Users-Guide.md)** - Complete integration guide for web developers
- **[Developer Quickstart](docs/Developers-Quickstart.md)** - Quick reference for contributors

### Reference

- [Getting Started Guide](docs/GETTING_STARTED.md) - Basic setup and usage
- [Usage Guide](docs/USAGE.md) - Detailed usage examples
- [Playlist Guide](docs/PLAYLIST.md) - Audio/video playlists with fullscreen support
- [Transcript Guide](docs/TRANSCRIPT.md) - Interactive transcripts
- [Keyboard Shortcuts](docs/KEYBOARD.md) - Complete keyboard reference
- [Build Guide](docs/BUILD.md) - Build system and development
- [Changelog](docs/CHANGELOG.md) - Version history and updates

## Credits

Inspired by:

- [AblePlayer](https://github.com/ableplayer/ableplayer) - Accessibility features
- [MediaElement.js](https://github.com/mediaelement/mediaelement) - Streaming support

---

Made with Vanilla JavaScript by Matthias Peltzer
