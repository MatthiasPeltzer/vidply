# User's Guide: VidPly Player

A practical guide for web developers on how to integrate VidPly into your websites.

---

## Quick Overview

VidPly is a universal, accessible media player supporting:

| Feature | Support |
|---------|---------|
| **Video** | MP4, WebM, OGG |
| **Audio** | MP3, OGG, WAV |
| **YouTube** | Embedded with unified controls |
| **Vimeo** | Embedded with unified controls |
| **HLS** | Adaptive bitrate streaming |
| **DASH** | MPEG-DASH streaming via dash.js |
| **Playlists** | Audio, video & mixed media with thumbnails |
| **Accessibility** | WCAG 2.2 AA compliant |
| **Languages** | EN, ES, FR, DE, JA + custom |

---

## Installation

### 1. Build the Player

```bash
npm install
npm run build
```

This creates files in `dist/`:
- `prod/vidply.esm.min.js` - ES Module (recommended)
- `legacy/vidply.min.js` - IIFE for script tag (global `VidPly`)
- `vidply.min.css` - Styles

### 2. Include in Your Page

**ES Module (Recommended):**

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script type="module">
  import Player from './dist/prod/vidply.esm.min.js';
</script>
```

**Traditional Script Tag:**

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script src="dist/legacy/vidply.min.js"></script>
```

---

## Basic Usage

### Video Player

```html
<video data-vidply width="800" height="450">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
</video>
```

The `data-vidply` attribute auto-initializes the player.

### Audio Player

```html
<audio data-vidply>
  <source src="audio.mp3" type="audio/mpeg">
  <source src="audio.ogg" type="audio/ogg">
</audio>
```

### With Poster Image

```html
<video data-vidply poster="thumbnail.jpg" width="800" height="450">
  <source src="video.mp4" type="video/mp4">
</video>
```

---

## External Services

### YouTube

```html
<video data-vidply src="https://www.youtube.com/watch?v=VIDEO_ID"></video>
```

Or with full URL:

```html
<video data-vidply src="https://youtu.be/VIDEO_ID"></video>
```

### Vimeo

```html
<video data-vidply src="https://vimeo.com/VIDEO_ID"></video>
```

### HLS Streaming

```html
<video data-vidply src="https://example.com/stream.m3u8"></video>
```

HLS.js is automatically loaded when `.m3u8` URLs are detected.

### DASH Streaming

```html
<video data-vidply src="https://example.com/manifest.mpd"></video>
```

dash.js is automatically loaded from CDN when `.mpd` URLs are detected. DASH streams support:
- Adaptive bitrate quality selection
- TTML subtitles (rendered natively by dash.js)
- WebVTT subtitles (handled by VidPly's caption system with transcript support)

### DASH + HLS + MP4 Fallback

```html
<video data-vidply width="800" height="450">
  <source src="dash/manifest.mpd" type="application/dash+xml">
  <source src="hls/master.m3u8" type="application/x-mpegURL">
  <source src="fallback.mp4" type="video/mp4">
  <track kind="subtitles" src="subtitles.en.vtt" srclang="en" label="English">
</video>
```

---

## Adding Captions & Subtitles

### Basic Captions

```html
<video data-vidply width="800" height="450">
  <source src="video.mp4" type="video/mp4">
  <track kind="subtitles" src="captions-en.vtt" srclang="en" label="English">
  <track kind="subtitles" src="captions-de.vtt" srclang="de" label="Deutsch">
</video>
```

### Track Types

| Kind | Purpose |
|------|---------|
| `subtitles` | Translation of dialogue |
| `captions` | Dialogue + sound effects (deaf/hard of hearing) |
| `descriptions` | Text descriptions of visual content |
| `chapters` | Chapter markers for navigation |

### Default Captions On

```html
<track kind="subtitles" src="captions.vtt" srclang="en" label="English" default>
```

---

## Chapters

Add chapter navigation with a chapters track:

```html
<video data-vidply>
  <source src="video.mp4" type="video/mp4">
  <track kind="chapters" src="chapters.vtt" srclang="en">
</video>
```

**chapters.vtt:**

```
WEBVTT

00:00:00.000 --> 00:02:30.000
Introduction

00:02:30.000 --> 00:08:00.000
Main Topic

00:08:00.000 --> 00:12:00.000
Examples

00:12:00.000 --> 00:15:00.000
Conclusion
```

---

## Configuration Options

### Via Data Attributes

```html
<video 
  data-vidply
  data-vidply-autoplay="false"
  data-vidply-loop="false"
  data-vidply-muted="false"
  data-vidply-volume="0.8"
  data-vidply-language="en"
  data-vidply-keyboard="true"
  data-vidply-responsive="true"
  src="video.mp4">
</video>
```

### Via JavaScript

```javascript
const player = new Player('#my-video', {
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
  
  // Controls
  controls: true,
  hideControlsDelay: 3000,
  
  // Buttons (show/hide individual controls)
  playPauseButton: true,
  progressBar: true,
  volumeControl: true,
  speedButton: true,
  captionsButton: true,
  fullscreenButton: true,
  pipButton: true,
  
  // Language
  language: 'en',
  
  // Keyboard
  keyboard: true,
  
  // Accessibility
  screenReaderAnnouncements: true,
  focusHighlight: true
});
```

### All Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | number | 800 | Player width |
| `height` | number | 450 | Player height |
| `poster` | string | null | Poster image URL |
| `responsive` | bool | true | Responsive sizing |
| `autoplay` | bool | false | Auto-start playback |
| `loop` | bool | false | Loop playback |
| `muted` | bool | false | Start muted |
| `volume` | number | 0.8 | Default volume (0-1) |
| `playbackSpeed` | number | 1.0 | Default speed |
| `controls` | bool | true | Show controls |
| `hideControlsDelay` | number | 3000 | Auto-hide delay (ms) |
| `keyboard` | bool | true | Enable keyboard shortcuts |
| `language` | string | 'en' | UI language |
| `captions` | bool | true | Enable captions support |
| `captionsDefault` | bool | false | Show captions by default |
| `transcript` | bool | false | Show transcript panel |
| `debug` | bool | false | Debug logging |
| `preload` | string | 'metadata' | `'none'`, `'metadata'`, `'auto'` |
| `deferLoad` | bool | false | Avoid starting network loading during init; load on user play / explicit load |
| `initialDuration` | number | 0 | Initial duration in seconds (UI only, before media metadata is loaded) |
| `requirePlaybackForAccessibilityToggles` | bool | false | If true: AD/SL before playback shows a notice instead of implicitly loading/playing |

---

## Playlists

### Audio Playlist

```html
<div id="audio-player"></div>

<script type="module">
  import { Player, PlaylistManager } from './dist/prod/vidply.esm.min.js';
  
  // When you pass a non-media element, VidPly will create the media element for you.
  const player = new Player('#audio-player', { mediaType: 'audio' });
  const playlist = new PlaylistManager(player, {
    autoAdvance: true,
    loop: false,
    showPanel: true
  });
  
  playlist.loadPlaylist([
    {
      src: 'track1.mp3',
      title: 'Track 1',
      artist: 'Artist Name',
      poster: 'cover1.jpg'
    },
    {
      src: 'track2.mp3',
      title: 'Track 2',
      artist: 'Artist Name',
      poster: 'cover2.jpg'
    }
  ]);
</script>
```

### Video Playlist

```html
<div id="video-player"></div>

<script type="module">
  import { Player, PlaylistManager } from './dist/prod/vidply.esm.min.js';
  
  const player = new Player('#video-player');
  const playlist = new PlaylistManager(player, {
    autoAdvance: true,
    showPanel: true
  });
  
  playlist.loadPlaylist([
    {
      src: 'video1.mp4',
      title: 'Video 1',
      poster: 'thumb1.jpg',
      tracks: [
        { src: 'captions1.vtt', kind: 'captions', srclang: 'en', label: 'English' }
      ]
    },
    {
      src: 'video2.mp4',
      title: 'Video 2',
      poster: 'thumb2.jpg'
    }
  ]);
</script>
```

### Playlist Options

| Option | Default | Description |
|--------|---------|-------------|
| `autoAdvance` | true | Auto-play next track |
| `autoPlayFirst` | true | Auto-play first track on `loadPlaylist()` (if false: first track is loaded/selected but not played) |
| `loop` | false | Loop playlist |
| `showPanel` | true | Show playlist panel |

### Playlist Controls

```javascript
playlist.next()           // Next track
playlist.previous()       // Previous track
playlist.goToTrack(2)     // Jump to track index
playlist.hasNext()        // Check if next exists
playlist.hasPrevious()    // Check if previous exists
```

---

## Accessibility Features

### Audio Description

Provide an alternate video with audio descriptions:

```javascript
const player = new Player('#my-video', {
  audioDescription: true,
  audioDescriptionSrc: 'video-with-description.mp4'
});
```

Users can toggle via the AD button.

### Sign Language

Add sign language interpretation overlay:

```javascript
const player = new Player('#my-video', {
  signLanguage: true,
  signLanguageSrc: 'sign-language.mp4',
  signLanguagePosition: 'bottom-right'
});
```

Position options: `bottom-right`, `bottom-left`, `top-right`, `top-left`

### Interactive Transcripts

```javascript
const player = new Player('#my-video', {
  transcript: true,
  transcriptPosition: 'external',
  transcriptContainer: '#transcript-panel'
});
```

Features:
- Click any line to seek to that point
- Auto-scrolls during playback
- Searchable text
- Draggable/resizable window

---

## Keyboard Shortcuts

VidPly includes comprehensive keyboard controls:

| Key | Action |
|-----|--------|
| **Space** / **P** / **K** | Play/Pause |
| **F** | Toggle fullscreen |
| **M** | Mute/Unmute |
| **↑** / **↓** | Volume up/down |
| **←** / **→** | Seek ±10 seconds |
| **C** | Toggle captions |
| **A** | Caption style menu |
| **<** / **>** | Decrease/increase speed |
| **S** | Speed menu |
| **Q** | Quality menu |
| **J** | Chapters menu |
| **T** | Toggle transcript |
| **D** | Drag mode (transcript/sign) |
| **R** | Resize mode |
| **Home** | Reset position |
| **Escape** | Exit mode/close menu |

### Custom Keyboard Shortcuts

```javascript
const player = new Player('#my-video', {
  keyboardShortcuts: {
    'play-pause': [' ', 'p', 'k'],
    'seek-forward': ['ArrowRight', 'l'],
    'seek-backward': ['ArrowLeft', 'j'],
    'volume-up': ['ArrowUp'],
    'volume-down': ['ArrowDown'],
    'mute': ['m'],
    'fullscreen': ['f'],
    'captions': ['c']
  }
});
```

---

## Styling & Theming

### CSS Variables

```css
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
```

### Custom Progress Bar

```css
.vidply-progress-played {
  background: linear-gradient(90deg, #667eea, #764ba2);
}
```

### Custom Buttons

```css
.vidply-button:hover {
  background: rgba(59, 130, 246, 0.2);
}

.vidply-button:focus {
  outline: 2px solid var(--vidply-primary-color);
  outline-offset: 2px;
}
```

---

## Internationalization

### Built-in Languages

- English (en)
- Spanish (es) - Español
- French (fr) - Français
- German (de) - Deutsch
- Japanese (ja) - 日本語

### Set Language

```javascript
const player = new Player('#my-video', {
  language: 'de'  // German
});
```

### Auto-detect from HTML

```html
<html lang="de">
  <!-- Player auto-detects German -->
</html>
```

### Load Custom Language

**Via data attribute:**

```html
<video 
  data-vidply 
  data-vidply-language-files='{"pt": "languages/pt.json"}'
  src="video.mp4">
</video>
```

**Via JavaScript (options):**

```javascript
import Player from './dist/prod/vidply.esm.min.js';

const player = new Player('#my-video', {
  language: 'pt',
  languageFiles: { pt: 'languages/pt.json' }
});
```

### Language File Format

**languages/pt.json:**

```json
{
  "player": {
    "play": "Reproduzir",
    "pause": "Pausar",
    "mute": "Silenciar",
    "unmute": "Ativar som",
    "fullscreen": "Tela cheia",
    "captions": "Legendas",
    "settings": "Configurações"
  },
  "time": {
    "currentTime": "Tempo atual",
    "duration": "Duração"
  }
}
```

---

## API Reference

### Playback

```javascript
player.play()              // Start playback
player.pause()             // Pause playback
player.stop()              // Stop and reset
player.toggle()            // Toggle play/pause
player.seek(30)            // Seek to 30 seconds
player.seekForward(10)     // Skip forward 10s
player.seekBackward(10)    // Skip backward 10s
```

### Volume

```javascript
player.setVolume(0.5)      // Set volume (0-1)
player.getVolume()         // Get volume
player.mute()              // Mute
player.unmute()            // Unmute
player.toggleMute()        // Toggle mute
```

### Speed

```javascript
player.setPlaybackSpeed(1.5)   // Set speed (0.25-2.0)
player.getPlaybackSpeed()      // Get speed
```

### Fullscreen

```javascript
player.enterFullscreen()   // Enter fullscreen
player.exitFullscreen()    // Exit fullscreen
player.toggleFullscreen()  // Toggle fullscreen
```

### Captions

```javascript
player.enableCaptions()    // Enable captions
player.disableCaptions()   // Disable captions
player.toggleCaptions()    // Toggle captions
```

### State

```javascript
player.getCurrentTime()    // Current time in seconds
player.getDuration()       // Total duration
player.isPlaying()         // Is playing?
player.isPaused()          // Is paused?
player.isEnded()           // Has ended?
player.isMuted()           // Is muted?
player.isFullscreen()      // Is fullscreen?
```

### Events

```javascript
player.on('ready', () => {})
player.on('play', () => {})
player.on('pause', () => {})
player.on('ended', () => {})
player.on('timeupdate', (time) => {})
player.on('volumechange', (volume) => {})
player.on('fullscreenchange', (isFullscreen) => {})
player.on('captionsenabled', (track) => {})
player.on('error', (error) => {})
```

### Cleanup

```javascript
player.destroy()           // Remove player
```

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| iOS Safari | 14+ |
| Android Chrome | 90+ |

---

## Troubleshooting

### Video Not Playing

| Issue | Solution |
|-------|----------|
| Black screen | Check video URL is accessible |
| CORS error | Ensure proper CORS headers on server |
| Format unsupported | Provide MP4 fallback |
| Autoplay blocked | Set `muted: true` for autoplay |

### Captions Not Showing

| Issue | Solution |
|-------|----------|
| VTT not loading | Check file URL; validate VTT syntax |
| CORS error | Serve VTT from same domain or enable CORS |
| Wrong encoding | Save VTT as UTF-8 |

### YouTube/Vimeo Not Working

| Issue | Solution |
|-------|----------|
| Not loading | Check video URL format |
| API errors | Ensure videos are embeddable |
| Controls missing | VidPly uses native service players |

### HLS Not Playing

| Issue | Solution |
|-------|----------|
| Stream not loading | Verify .m3u8 URL is accessible |
| CORS issues | Configure CORS on streaming server |
| Segments failing | Check segment URLs in manifest |

### DASH Not Playing

| Issue | Solution |
|-------|----------|
| Stream not loading | Verify .mpd URL is accessible |
| CORS issues | Configure CORS on streaming server |
| No quality levels | Check MPD has multiple representations |
| TTML captions missing | dash.js renders TTML natively; ensure tracks are in the manifest |
| Transcript not available | TTML tracks don't support transcript; use WebVTT for transcript |

---

## Best Practices

### Performance
- ✅ Use `responsive: true` for fluid layouts
- ✅ Provide poster images
- ✅ Use appropriate video resolutions
- ✅ Compress videos for web delivery

### Accessibility
- ✅ Always provide captions
- ✅ Use meaningful track labels
- ✅ Test with keyboard only
- ✅ Test with screen readers

### Cross-browser
- ✅ Provide MP4 + WebM sources
- ✅ Test on mobile devices
- ✅ Handle fullscreen differences on iOS

---

## Live Demos

Try VidPly in action:
- [Main Demo](https://matthiaspeltzer.github.io/vidply/demo/demo.html)
- [Audio Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-audio.html)
- [Video Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-video.html)
- [Mixed Media Playlist](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html)
- [HLS Streaming](https://matthiaspeltzer.github.io/vidply/demo/hls-test.html)
- [DASH Streaming](https://matthiaspeltzer.github.io/vidply/demo/dash-test.html)

---

**Need help?** Check the [API documentation](USAGE.md) or open an issue on GitHub.

