# <img src="favicon.svg" width="32" alt="VidPly" /> VidPly

**Universal, Accessible Video & Audio Player**

A modern, feature-rich media player built with vanilla ES6 JavaScript. Combines the best accessibility features from AblePlayer with the streaming capabilities of MediaElement.js. Fully internationalized with support for 5 languages and complete WCAG 2.1 AA compliance.

![License](https://img.shields.io/badge/license-GPL--2.0--or--later-blue.svg)
![ES6](https://img.shields.io/badge/ES6-Module-yellow.svg)
![WCAG](https://img.shields.io/badge/WCAG-2.1%20AA-green.svg)
![Version](https://img.shields.io/badge/version-1.0.18-brightgreen.svg)

## Live Demos

Try VidPly in action:
- **[Main Demo](https://matthiaspeltzer.github.io/vidply/demo/demo.html)** - Full-featured video player showcase
- **[Audio Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-audio.html)** - Audio player with playlist support
- **[Video Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-video.html)** - Video playlist with thumbnails
- **[HLS Streaming](https://matthiaspeltzer.github.io/vidply/demo/hls-test.html)** - Adaptive bitrate streaming demo

## Why VidPly?

- **Zero Dependencies** - Pure vanilla JavaScript, no frameworks required
- **Accessibility First** - WCAG 2.1 AA compliant with full keyboard and screen reader support
- **Multilingual** - Built-in translations for 5 languages with easy extensibility
- **Fully Customizable** - CSS variables and comprehensive API
- **Modern Build** - ES6 modules with tree-shaking support
- **Production Ready** - Thoroughly tested with real-world media content

## Features

### Core Media Support
- **Audio & Video Playback** - Native HTML5 support for both media types
- **Multiple Formats** - MP3, OGG, WAV (audio) / MP4, WebM (video)
- **YouTube Integration** - Embed YouTube videos with unified controls
- **Vimeo Integration** - Seamless Vimeo player integration
- **HLS Streaming** - Adaptive bitrate streaming with quality selection
- **Playlists** - Full playlist support with auto-advance and navigation
  - Audio playlists with track info
  - Video playlists with thumbnails
  - Previous/Next controls
  - Visual playlist panel
  - **Fullscreen Mode**: YouTube-style horizontal carousel
    - Auto-show/hide based on playback state
    - Swipeable touch interface
    - Responsive card layout

### Accessibility Features (WCAG 2.1 AA Compliant)
- **Full Keyboard Navigation** - All features accessible via keyboard, custom shortcuts, menu navigation with Arrow keys
- **Screen Reader Support** - Complete ARIA labels (`aria-controls`, `aria-expanded`, `aria-haspopup`), live regions
- **Interactive Transcripts** - Click-to-seek, searchable, auto-scroll with proper semantic HTML
- **Sign Language Overlay** - Picture-in-picture with drag/resize, keyboard accessible
- **Audio Description** - Alternate audio track with visual content descriptions
- **Caption Styling** - Fully customizable (font, size, color, opacity, edge style)
- **High Contrast Mode** - Windows HCM support, color-independent design
- **Focus Management** - Logical focus order, programmatic focus handling, visible indicators
- **Touch Accessibility** - 44x44px minimum touch targets, swipeable interfaces

### Captions & Subtitles
- **WebVTT Support** - Standard caption format
- **Multiple Languages** - Multi-track support
- **Caption Selector** - Easy track switching with CC button
- **Caption Styling** - Dedicated styling menu (font, size, color, opacity)
- **Chapter Navigation** - Jump to video chapters
- **Interactive Transcripts** - Full-text searchable transcript panel

### Playback Features
- **Adjustable Speed** - 0.25x to 2x playback
- **Seek Controls** - Forward/backward navigation
- **Volume Control** - 0-100% with mute
- **Loop Playback** - Single or playlist loop
- **Fullscreen Mode** - Native fullscreen API with smart playlist overlay
- **Picture-in-Picture** - PiP support

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

**Custom Translations**: Easily add your own languages by loading JSON or YAML translation files via data attributes or JavaScript options. The player automatically detects the HTML `lang` attribute and loads matching translations.

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
    import Player from './dist/vidply.esm.min.js';
    // Auto-initialized via data-vidply attribute
  </script>
</body>
</html>
```

### Option 2: Traditional Script Tag (IIFE)

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script src="dist/vidply.min.js"></script>

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

### Option 3: Development (Source Files)

```javascript
import Player from './src/index.js';

const player = new Player('#my-video', {
  controls: true,
  autoplay: false,
  volume: 0.8,
  language: 'en'
});
```

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
  import Player from './dist/vidply.esm.min.js';
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

## Configuration Options

```javascript
const player = new Player('#video', {
  // Display
  width: 800,
  height: 450,
  poster: 'poster.jpg',
  responsive: true,
  
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
  volumeControl: true,
  chaptersButton: true,
  qualityButton: true,
  captionStyleButton: true,
  speedButton: true,
  captionsButton: true,
  transcriptButton: true,
  audioDescriptionButton: true,
  signLanguageButton: true,
  fullscreenButton: true,
  pipButton: true,
  
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
  audioDescriptionButton: true,
  
  // Sign Language
  signLanguage: true,
  signLanguageSrc: null, // URL to sign language video
  signLanguageButton: true,
  signLanguagePosition: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
  
  // Transcripts
  transcript: false,
  transcriptButton: true,
  transcriptPosition: 'external',
  transcriptContainer: null,
  
  // Keyboard
  keyboard: true,
  keyboardShortcuts: {
    'play-pause': [' ', 'p', 'k'],
    'seek-forward': ['ArrowRight', 'l'],
    'seek-backward': ['ArrowLeft', 'j'],
    'volume-up': ['ArrowUp'],
    'volume-down': ['ArrowDown'],
    'mute': ['m'],
    'fullscreen': ['f'],
    'captions': ['c']
  },
  
  // Accessibility
  screenReaderAnnouncements: true,
  focusHighlight: true,
  
  // Internationalization
  language: 'en',
  
  // Callbacks
  onReady: () => console.log('Ready!'),
  onPlay: () => console.log('Playing!'),
  onPause: () => console.log('Paused!'),
  onEnded: () => console.log('Ended!'),
  
  // Advanced
  debug: false,
  pauseOthersOnPlay: true
});
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| <kbd>Space</kbd> / <kbd>P</kbd> / <kbd>K</kbd> | Play/Pause |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>M</kbd> | Mute/Unmute |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume Up/Down |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek -10s / +10s |
| <kbd>C</kbd> | Toggle Captions (or open menu if multiple) |
| <kbd>A</kbd> | Open Caption Style Menu |
| <kbd><</kbd> / <kbd>></kbd> | Decrease/Increase Speed |
| <kbd>S</kbd> | Open Speed Menu |
| <kbd>Q</kbd> | Open Quality Menu |
| <kbd>J</kbd> | Open Chapters Menu |
| <kbd>T</kbd> | Toggle Transcript |
| <kbd>D</kbd> | Toggle Drag Mode (Transcript/Sign Language) |
| <kbd>R</kbd> | Toggle Resize Mode (Transcript/Sign Language) |
| <kbd>Escape</kbd> | Exit Drag/Resize Mode or Close Menus |
| <kbd>Home</kbd> | Reset Transcript/Sign Language Position |

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

**Note on Mobile Devices:** On touch devices (iOS, Android, tablets), only a **mute/unmute button** is shown instead of the volume slider. Mobile browsers control HTML5 video volume through **hardware device volume buttons** - this is standard behavior that cannot be overridden by web apps for security reasons. The mute button provides quick silencing functionality while hardware buttons control actual volume levels.

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

**Note on iOS/Mobile Safari:** Since iOS doesn't support the Fullscreen API on container elements, VidPly automatically falls back to a "pseudo-fullscreen" mode that positions the player to fill the entire viewport using CSS. This provides a fullscreen-like experience on iOS devices while maintaining all player functionality.

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
player.transcriptManager.togglePointerResizeMode()  // Toggle resize mode (R key)

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
import { Player, PlaylistManager } from './dist/vidply.esm.js';

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
  console.log('Now playing:', e.item.title);
});
```

### Settings

```javascript
player.showSettings()  // Open settings dialog
player.hideSettings()  // Close settings dialog
```

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

```javascript
import { i18n } from './src/i18n/i18n.js';

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

```javascript
import { i18n } from './src/i18n/i18n.js';

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

VidPly uses a modern build system with esbuild for JavaScript and clean-css for CSS.

### Available Scripts

```bash
npm run build        # Build everything (JS + CSS)
npm run build:js     # Build JavaScript only
npm run build:css    # Build CSS only
npm run watch        # Watch mode for development
npm run clean        # Clean dist directory
npm run dev          # Start dev server
```

### Output Files

- `dist/vidply.esm.js` - ES Module (development)
- `dist/vidply.esm.min.js` - ES Module (production)
- `dist/vidply.js` - IIFE (development)
- `dist/vidply.min.js` - IIFE (production)
- `dist/vidply.css` - Styles (unminified)
- `dist/vidply.min.css` - Styles (minified)

See [BUILD.md](docs/BUILD.md) for detailed build documentation.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

## License

GNU General Public License v2.0 or later

Copyright (C) 2025 Matthias Peltzer

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

See [LICENSE](LICENSE) for full license text.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Documentation

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
