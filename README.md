# VidPly

**Universal, Accessible Video Player**

A modern, feature-rich video player built with vanilla ES6 JavaScript. Combines the best accessibility features from AblePlayer with the streaming capabilities of MediaElement.js.

![License](https://img.shields.io/badge/license-GPL--2.0--or--later-blue.svg)
![ES6](https://img.shields.io/badge/ES6-Module-yellow.svg)
![WCAG](https://img.shields.io/badge/WCAG-2.1%20AA-green.svg)

## Features

### Core Media Support
- **Audio & Video Playback** - Native HTML5 support
- **Multiple Formats** - MP3, OGG, WAV, MP4, WebM
- **YouTube Integration** - Embed with unified controls
- **Vimeo Integration** - Seamless Vimeo support
- **HLS Streaming** - Adaptive bitrate streaming
- **Playlists** - Audio/video playlist support

### Accessibility Features
- **Full Keyboard Navigation** - WCAG 2.1 compliant
- **Screen Reader Support** - Complete ARIA labels
- **Customizable Shortcuts** - User-definable hotkeys
- **High Contrast Mode** - Windows HCM support
- **Focus Indicators** - Clear visual focus states
- **Live Announcements** - Screen reader updates

### Captions & Subtitles
- **WebVTT Support** - Standard caption format
- **Multiple Languages** - Multi-track support
- **Customizable Display** - Font, size, color, opacity
- **Caption Positioning** - Flexible placement
- **Auto-generated Transcripts** - Interactive text

### Playback Features
- **Adjustable Speed** - 0.25x to 2x playback
- **Seek Controls** - Forward/backward navigation
- **Volume Control** - 0-100% with mute
- **Loop Playback** - Single or playlist loop
- **Fullscreen Mode** - Native fullscreen API
- **Picture-in-Picture** - PiP support

### Internationalization
Built-in support for:
- 🇬🇧 English
- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇯🇵 Japanese
- Easy to add more languages

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
  speedButton: true,
  captionsButton: true,
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
| <kbd>Space</kbd> / <kbd>K</kbd> | Play/Pause |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>M</kbd> | Mute/Unmute |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume Up/Down |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek -10s / +10s |
| <kbd>J</kbd> / <kbd>L</kbd> | Seek -30s / +30s |
| <kbd>C</kbd> | Toggle Captions |
| <kbd><</kbd> / <kbd>></kbd> | Decrease/Increase Speed |
| <kbd>S</kbd> | Open Settings |

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
player.setVolume(0.5)   // Set volume (0-1)
player.getVolume()      // Get current volume
player.mute()           // Mute audio
player.unmute()         // Unmute audio
player.toggleMute()     // Toggle mute state
```

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

### Captions

```javascript
player.enableCaptions()   // Enable captions
player.disableCaptions()  // Disable captions
player.toggleCaptions()   // Toggle captions

// Switch between caption tracks
player.captionManager.switchTrack(0)  // Switch to first track
player.captionManager.getAvailableTracks()  // Get all tracks
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

```css
/* Override default colors */
.vidply-player {
  --vidply-primary-color: #3b82f6;
  --vidply-background: rgba(0, 0, 0, 0.8);
  --vidply-text-color: #ffffff;
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

```javascript
import { i18n } from './src/i18n/i18n.js';

i18n.addTranslation('pt', {
  player: {
    play: 'Reproduzir',
    pause: 'Pausar',
    // ... more translations
  }
});

i18n.setLanguage('pt');
```

## 🔧 Build Process

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

See [BUILD.md](BUILD.md) for detailed build documentation.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

## License

GNU General Public License v2.0 or later

Copyright (C) 2024 Matthias Peltzer

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

See [LICENSE](LICENSE) for full license text.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- Documentation: See [GETTING_STARTED.md](GETTING_STARTED.md)
- Installation: See [INSTALL.md](INSTALL.md)
- Usage Examples: See [USAGE.md](USAGE.md)
- Build Guide: See [BUILD.md](BUILD.md)
- Issues: Report on GitHub
- Discussions: GitHub Discussions

## Credits

Inspired by:
- [AblePlayer](https://github.com/ableplayer/ableplayer) - Accessibility features
- [MediaElement.js](https://github.com/mediaelement/mediaelement) - Streaming support

---

Made with ❤️ and Vanilla JavaScript by Matthias Peltzer
