# <img src="../favicon.svg" width="32" alt="VidPly" /> VidPly Usage Guide

## Getting Started

### 1. Include the CSS

```html
<link rel="stylesheet" href="src/styles/vidply.css">
```

### 2. Add Your Media Element

```html
<!-- Video -->
<video data-vidply width="800" height="450">
  <source src="your-video.mp4" type="video/mp4">
  <track kind="subtitles" src="captions.vtt" srclang="en" label="English">
</video>

<!-- Audio -->
<audio data-vidply>
  <source src="your-audio.mp3" type="audio/mpeg">
</audio>
```

### 3. Import the Player

For production builds:

```html
<script type="module">
  import Player from './dist/prod/vidply.esm.min.js';
  // Player auto-initializes elements with data-vidply attribute
</script>
```

For development with raw TypeScript sources (e.g. via `vite` or `tsx`):

```typescript
import Player from './src/index';

const player = new Player('#video');
```

## Common Use Cases

### Autoplay with Muted Audio

```javascript
const player = new Player('#video', {
  autoplay: true,
  muted: true
});
```

### Start at Specific Time

```javascript
const player = new Player('#video', {
  startTime: 30  // Start at 30 seconds
});
```

### Custom Keyboard Shortcuts

```javascript
const player = new Player('#video', {
  keyboardShortcuts: {
    'play-pause': ['Space', 'Enter'],
    'seek-forward': ['d'],
    'seek-backward': ['a']
  }
});
```

### Loop Video

```javascript
const player = new Player('#video', {
  loop: true
});
```

### Change Language

#### Built-in Languages

```javascript
const player = new Player('#video', {
  language: 'es'  // Spanish (available: en, es, fr, de, ja)
});
```

#### Load Custom Language Files

```javascript
const player = new Player('#video', {
  language: 'pt',  // Portuguese
  languageFiles: {
    'pt': 'languages/pt.json',
    'it': 'languages/it.json'
  }
});
```

#### Using Data Attributes

```html
<video 
  data-vidply 
  data-vidply-language-files='{"pt": "languages/pt.json", "it": "languages/it.json"}'
  src="video.mp4"
></video>
```

#### Auto-detect from HTML

The player automatically detects the language from the HTML `lang` attribute:

```html
<html lang="pt">
  <video 
    data-vidply 
    data-vidply-language-file='{"pt": "languages/pt.json"}'
    src="video.mp4"
  ></video>
</html>
```

### Custom Caption Styling

```javascript
const player = new Player('#video', {
  captionsFontSize: '120%',
  captionsFontFamily: 'Arial',
  captionsColor: '#FFFF00',
  captionsBackgroundColor: '#000000',
  captionsOpacity: 0.9
});
```

### Event Handling

```javascript
const player = new Player('#video');

player.on('play', () => {
  console.log('Video started playing');
});

player.on('timeupdate', (currentTime) => {
  console.log('Current time:', currentTime);
});

player.on('ended', () => {
  console.log('Video ended');
  // Redirect or show related content
});

player.on('error', (error) => {
  console.error('Player error:', error);
});
```

### Programmatic Control

```javascript
const player = new Player('#video');

// Play/Pause
document.getElementById('playBtn').addEventListener('click', () => {
  player.play();
});

document.getElementById('pauseBtn').addEventListener('click', () => {
  player.pause();
});

// Seek
document.getElementById('seek30').addEventListener('click', () => {
  player.seek(30);
});

// Volume
document.getElementById('volumeSlider').addEventListener('input', (e) => {
  player.setVolume(e.target.value / 100);
});

// Speed
document.getElementById('speedSelect').addEventListener('change', (e) => {
  player.setPlaybackSpeed(parseFloat(e.target.value));
});
```

### YouTube/Vimeo/SoundCloud Integration

```html
<!-- YouTube -->
<video data-vidply src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></video>

<!-- Vimeo -->
<video data-vidply src="https://vimeo.com/76979871"></video>

<!-- SoundCloud -->
<audio data-vidply src="https://soundcloud.com/artist/track-name"></audio>

<!-- These will automatically use the appropriate renderer -->
```

### HLS Streaming

```html
<video data-vidply src="https://example.com/stream.m3u8"></video>
```

```javascript
// Access HLS-specific features
const player = new Player('#video');

// Listen for quality levels (hls.js path)
player.on('hlsmanifestparsed', (data) => {
  console.log('Available qualities:', data.levels);
});

// Listen for live cue updates (works for both hls.js and native iOS HLS)
player.on('textcuesupdate', () => {
  console.log('New subtitle cues available');
});

// Switch quality manually (if using HLS renderer)
if (player.renderer.switchQuality) {
  player.renderer.switchQuality(2); // Switch to quality level 2
}
```

> On iOS / iPadOS where MSE is unavailable, VidPly uses the browser's native HLS support but still surfaces captions and quality through the same VidPly UI via the native `TextTrack` API bridge.

### DASH Streaming (MPEG-DASH)

```html
<video data-vidply src="https://example.com/manifest.mpd"></video>
```

```javascript
// Access DASH-specific features
const player = new Player('#video');

// Listen for quality changes
player.on('dashqualitychanged', (data) => {
  console.log('Quality changed:', data);
});

// Get available qualities
if (player.renderer.getQualities) {
  const qualities = player.renderer.getQualities();
  console.log('Available qualities:', qualities);
}

// Switch quality manually
if (player.renderer.switchQuality) {
  player.renderer.switchQuality(2); // Switch to quality level 2
}
```

**DASH Subtitle Handling:**

- **TTML/stpp subtitles** - Rendered natively by dash.js; caption styling is handled by the stream itself. The interactive transcript is not available for TTML tracks.
- **WebVTT subtitles** - Handled by VidPly's caption system with full support for caption styling and interactive transcripts.

### DASH + HLS + MP4 Fallback

For maximum compatibility across devices and browsers, provide all three formats:

```html
<video data-vidply width="800" height="450" poster="preview.jpg">
  <source src="dash/manifest.mpd" type="application/dash+xml">
  <source src="hls/master.m3u8" type="application/x-mpegURL">
  <source src="fallback.mp4" type="video/mp4">
  <track kind="subtitles" src="vtt/subtitles.de.vtt" srclang="de" label="Deutsch">
  <track kind="subtitles" src="vtt/subtitles.en.vtt" srclang="en" label="English">
</video>
```

VidPly auto-selects the best renderer based on the source file extension.

### Download Button

Show a download button in the control bar so visitors can save the media file:

```html
<video
  data-vidply
  data-vidply-download-button="true"
  data-vidply-download-url="/files/video.mp4"
  src="/streams/video/manifest.mpd">
</video>
```

```javascript
const player = new Player('#video', {
  downloadButton: true,
  downloadUrl: '/files/video.mp4' // optional; defaults to current src
});
```

For streaming sources (`.mpd`, `.m3u8`) it is strongly recommended to provide an explicit `downloadUrl` pointing to a single MP4/MP3/WebM file — manifests are not directly downloadable.

In playlists the file can be set per track (`downloadUrl`, `downloadFormat`, `downloadFileSize`), and the button then follows the selection — see [PLAYLIST.md](PLAYLIST.md#per-track-downloads).

### Custom Floating Player (Miniplayer)

Enable the in-page floating player ("own PiP"). When the original video scrolls
out of the viewport, VidPly pops up a draggable, resizable floating shell in the
chosen corner; when the original scrolls back in, it docks again. The PiP
button toggles a manual pin/unpin. Native browser PiP is suppressed automatically
while floating is enabled, so users get a single consistent experience.

```html
<video
  data-vidply
  data-vidply-options='{"floating": true, "floatingPosition": "bottom-right", "floatingMinViewportWidth": 768}'
  src="video.mp4">
  <track kind="subtitles" src="en.vtt" srclang="en" label="English">
</video>
```

```javascript
const player = new Player('#video', {
  floating: true,
  floatingPosition: 'bottom-right', // or 'bottom-left' | 'top-right' | 'top-left'
  floatingMinViewportWidth: 768
});
```

Notes:
- Audio-only players ignore `floating`.
- Closing the floating shell pauses playback and prevents auto-float again until the next user-initiated `play`.
- The floating shell exposes a reduced control bar (play/pause, rewind, forward, volume, captions, PiP, fullscreen) and persists its size/position per player.
- Below `floatingMinViewportWidth` (default `768`) the feature is disabled and the floating PiP button is hidden — it never appears in the overflow menu either.

### Buffering Spinner

A centered loading spinner appears automatically while the player is buffering (`waiting`, `seeking`, initial `loadstart`) and disappears on `canplay` / `playing`. It is enabled for HTML5, HLS and DASH renderers and respects `prefers-reduced-motion`.

You can theme it via CSS variables:

```css
.vidply-player {
  --vidply-spinner-color: #ffffff;
  --vidply-spinner-size: 56px;
}
```

The container exposes a `.vidply-buffering` class while loading; you can hook into it from CSS:

```css
.vidply-player.vidply-buffering .my-overlay { opacity: 0.3; }
```

### Live streams

For HLS, DASH, or HTML5 live sources, enable live-aware controls with `liveStream`:

```javascript
const player = new Player('#live', {
  liveStream: 'auto' // default — detect live vs VOD; or true / false to force
});
```

When a live source is detected:

- A **LIVE** badge replaces total duration
- Restart and playback speed are hidden
- Skip-forward and **Go live** appear only when the viewer is behind the live edge (default threshold: 5 seconds)
- HLS live captions and the interactive transcript update incrementally from rolling WebVTT cues

Player API: `isLiveStream()`, `isBehindLive()`, `seekToLive()`; events `livechange` and `liveedgechange`.

### Resume playback

Remember where a visitor stopped and offer to continue on the next visit:

```javascript
const player = new Player('#video', {
  resumePlayback: true // default: false
});
```

Position is stored in `localStorage` per media source. A focus-trapped prompt lets the visitor resume or start from the beginning.

### Caption Track Selection

When you have multiple caption tracks, clicking the CC button shows a menu to select the language:

```html
<video data-vidply src="video.mp4">
  <track kind="captions" src="en.vtt" srclang="en" label="English">
  <track kind="captions" src="es.vtt" srclang="es" label="Español">
  <track kind="captions" src="fr.vtt" srclang="fr" label="Français">
  <track kind="captions" src="de.vtt" srclang="de" label="Deutsch">
</video>
```

Programmatically switch tracks:

```javascript
const player = new Player('#video');

// Get available tracks
const tracks = player.captionManager.getAvailableTracks();
console.log(tracks);
// [{index: 0, language: 'en', label: 'English', kind: 'captions'}, ...]

// Switch to specific track
player.captionManager.switchTrack(1);  // Switch to Spanish

// Or by finding the track you want
const frenchTrack = tracks.find(t => t.language === 'fr');
if (frenchTrack) {
  player.captionManager.switchTrack(frenchTrack.index);
}
```

### Interactive Transcript

Display a clickable, scrolling transcript alongside your video with drag and resize capabilities:

```html
<video 
  data-vidply
  data-transcript="true"
  data-transcript-button="true"
  src="video.mp4"
>
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
</video>
```

```javascript
const player = new Player('#video', {
  transcript: true,
  transcriptButton: true
});

// Show/Hide Transcript
player.transcriptManager.showTranscript();
player.transcriptManager.hideTranscript();
player.transcriptManager.toggleTranscript();

// Drag & Resize Modes (Desktop only, screen width >= 768px)
player.transcriptManager.toggleKeyboardDragMode();   // Toggle drag mode (D key)
player.transcriptManager.togglePointerResizeMode();  // Toggle resize mode (R key)

// Check State
if (player.transcriptManager.isVisible) {
  console.log('Transcript is showing');
}
```

**Keyboard Shortcuts:**
- <kbd>T</kbd> - Toggle transcript window
- <kbd>D</kbd> - Toggle drag mode (move with arrow keys)
- <kbd>R</kbd> - Toggle resize mode (resize with arrow keys)
- <kbd>Home</kbd> - Reset position to center
- <kbd>Escape</kbd> - Exit drag/resize mode

**Settings Menu:**
The transcript window includes a settings menu (⚙️ icon) with options to:
- Enable/disable drag mode
- Enable/disable resize mode
- Close the transcript window

See [TRANSCRIPT.md](TRANSCRIPT.md) for complete documentation.

### Sign Language Video Overlay

Overlay a sign language interpreter video synchronized with the main video:

#### Single Sign Language Video

```html
<video 
  data-vidply
  src="main-video.mp4"
  data-sign-language-src="sign-language-video.mp4"
  data-sign-language-position="bottom-right"
>
</video>
```

```javascript
const player = new Player('#video', {
  signLanguageSrc: 'path/to/sign-language-video.mp4',
  signLanguageButton: true,
  signLanguagePosition: 'bottom-right' // Options: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
});

// Control programmatically
player.enableSignLanguage();   // Show sign language video
player.disableSignLanguage();  // Hide sign language video
player.toggleSignLanguage();   // Toggle visibility

// Check state
if (player.state.signLanguageEnabled) {
  console.log('Sign language is enabled');
}
```

#### Multiple Sign Language Videos (Language Switching)

You can provide multiple sign language videos for different languages. The player will automatically show a language selector when multiple sources are available:

```html
<video 
  data-vidply
  src="main-video.mp4"
  data-sign-language-src-en="sign-language-en.mp4"
  data-sign-language-src-de="sign-language-de.mp4"
  data-sign-language-src-es="sign-language-es.mp4"
  data-sign-language-position="bottom-right"
>
</video>
```

```javascript
const player = new Player('#video', {
  signLanguageSources: {
    en: 'path/to/sign-language-en.mp4',
    de: 'path/to/sign-language-de.mp4',
    es: 'path/to/sign-language-es.mp4'
  },
  signLanguageButton: true,
  signLanguagePosition: 'bottom-right'
});

// Switch sign language programmatically
player.switchSignLanguage('de'); // Switch to German sign language
```

When multiple sign language sources are available:
- A language selector appears in the sign language video header
- The sign language video automatically switches when captions change (if language codes match)
- Users can manually switch languages using the selector

#### Sign Language Settings Menu

The sign language video includes a settings menu (⚙️ icon) with the following options:
- **Enable/Disable Drag Mode** - Toggle keyboard drag mode (Shortcut: D key)
- **Enable/Disable Resize Mode** - Toggle resize mode to adjust video size (Shortcut: R key)
- **Language Selector** - Switch between available sign language videos (if multiple)
- **Close Menu** - Close the settings menu

**Sign Language Features:**
- Automatically syncs with main video playback
- Adjusts playback speed to match main video
- Muted by default (main video audio is used)
- Positioned as overlay on main video
- Can be dragged and resized (desktop only, >= 768px)
- Supports keyboard navigation:
  - <kbd>D</kbd> - Toggle drag mode (move with arrow keys)
  - <kbd>R</kbd> - Toggle resize mode (resize with arrow keys)
  - <kbd>Home</kbd> - Reset position
  - <kbd>Escape</kbd> - Exit drag/resize mode
- Includes a settings menu for drag, resize, language switching, and close options
- Automatically switches language when caption language changes (if matching sign language available)

### Audio Description

VidPly supports three complementary audio-description paths:

| Path | When used | Behavior |
|------|-----------|----------|
| **Described video swap** | `audioDescriptionSrc` or `<source data-desc-src>` | Replaces the video with a pre-mixed described MP4/WebM; preserves playback position |
| **VTT speech (extended AD)** | `kind="descriptions"` track, no described video | Pauses video, speaks cue text via `speechSynthesis`, resumes when speech ends |
| **Text descriptions** | Descriptions VTT always available | Shown in the transcript panel; toggled via track mode when TTS is off |

**Mode resolution** (`audioDescriptionMode`, default `auto`):

- `auto` — described video swap if configured, otherwise VTT speech if a descriptions track exists
- `swap` — described video only
- `vtt_speech` — VTT speech only (ignores described video URL)

#### Described video swap

```html
<video 
  data-vidply
  src="regular-version.mp4"
  data-audio-description-src="described-version.mp4"
  data-audio-description-button="true"
>
</video>
```

Or with `<source>` elements:

```html
<source src="regular.mp4" type="video/mp4"
        data-desc-src="described.mp4" data-orig-src="regular.mp4">
```

#### VTT speech (extended AD)

No described video file — only a descriptions WebVTT track:

```html
<video
  data-vidply
  data-audio-description-mode="vtt_speech"
  data-audio-description-button="true"
>
  <source src="video.mp4" type="video/mp4">
  <track kind="descriptions" src="descriptions-en.vtt" srclang="en" label="Descriptions">
</video>
```

See also: [`demo/single-player-vtt-speech.html`](../demo/single-player-vtt-speech.html).

#### JavaScript API

```javascript
const player = new Player('#video', {
  audioDescriptionSrc: 'path/to/described-version.mp4', // optional
  audioDescriptionButton: true,
  audioDescriptionMode: 'auto',       // 'auto' | 'swap' | 'vtt_speech'
  audioDescriptionSpeech: true,       // false = text-only (transcript / track toggle)
  audioDescriptionExtended: true      // resume after TTS ends, not at cue.endTime
});

// Control programmatically
await player.enableAudioDescription();
await player.disableAudioDescription();
await player.toggleAudioDescription();

// Check state
if (player.state.audioDescriptionEnabled) {
  console.log('Audio description is active');
}

// Events — swap mode
player.on('audiodescriptionenabled', () => {
  console.log('Audio description enabled');
});

player.on('audiodescriptiondisabled', () => {
  console.log('Audio description disabled');
});

// Events — VTT speech mode (per cue)
player.on('audiodescriptioncuestart', ({ time, text, cue }) => {
  console.log('Speaking description at', time, text);
});

player.on('audiodescriptioncueend', ({ time, text }) => {
  console.log('Finished description at', time);
});
```

**HTML data attributes** (camelCase in `data-vidply-*`):

- `data-audio-description-src`
- `data-audio-description-button`
- `data-audio-description-mode` — `auto`, `swap`, or `vtt_speech`
- `data-audio-description-speech` — `true` / `false`
- `data-audio-description-extended` — `true` / `false`

Note: Playback position is preserved when switching described video sources. VTT speech requires a browser with
`speechSynthesis` support; otherwise descriptions fall back to text-only (`track.mode = 'showing'`).

### Chapter Navigation

Jump to video chapters when chapter tracks are available:

```html
<video data-vidply src="video.mp4">
  <track kind="chapters" src="chapters.vtt" srclang="en" label="Chapters">
</video>
```

Chapters VTT format:

```
WEBVTT

00:00:00.000 --> 00:01:30.000
Introduction

00:01:30.000 --> 00:05:00.000
Getting Started

00:05:00.000 --> 00:10:00.000
Advanced Features

00:10:00.000 --> 00:15:00.000
Conclusion
```

The chapters button automatically appears in the control bar when chapter tracks are detected. Users can click to see a menu and jump to any chapter.

### Caption Styling

VidPly has TWO caption-related buttons:

1. **CC Button** - Select caption language/track
2. **Aa Button** - Customize caption appearance (font, size, color)

```javascript
const player = new Player('#video', {
  captions: true,
  captionsButton: true,      // Shows CC button for track selection
  captionStyleButton: true   // Shows Aa button for styling
});

// Programmatically set caption styles
player.captionManager.setCaptionStyle('fontSize', '120%');
player.captionManager.setCaptionStyle('fontFamily', 'serif');
player.captionManager.setCaptionStyle('color', '#FFFF00');
player.captionManager.setCaptionStyle('backgroundColor', '#000000');
player.captionManager.setCaptionStyle('opacity', 0.9);
```

### Multiple Players on Same Page

```html
<video id="player1" data-vidply src="video1.mp4"></video>
<video id="player2" data-vidply src="video2.mp4"></video>
<video id="player3" data-vidply src="video3.mp4"></video>
```

```javascript
// All will auto-initialize
// By default, playing one will pause the others

// To allow multiple simultaneous playback:
const player1 = new Player('#player1', {
  pauseOthersOnPlay: false
});
```

### Responsive Player

```javascript
const player = new Player('#video', {
  responsive: true,
  fillContainer: false
});
```

### Disable Specific Controls

```javascript
const player = new Player('#video', {
  controls: true,
  playPauseButton: true,
  progressBar: true,
  volumeControl: false,     // Hide volume
  speedButton: false,        // Hide speed
  captionsButton: true,
  fullscreenButton: true,
  pipButton: false           // Hide PiP
});
```

### Custom Callbacks

```javascript
const player = new Player('#video', {
  onReady: function() {
    console.log('Player ready!');
    console.log('Duration:', this.getDuration());
  },
  
  onPlay: function() {
    console.log('Started playing');
    // Track analytics
    gtag('event', 'video_play', { video_title: 'My Video' });
  },
  
  onPause: function() {
    console.log('Paused at:', this.getCurrentTime());
  },
  
  onEnded: function() {
    console.log('Video finished');
    // Show "Watch Next" overlay
  }
});
```

### Cleanup

```javascript
const player = new Player('#video');

// Later, when done:
player.destroy();
```

## Accessibility Best Practices

### 1. Always Provide Captions

```html
<video data-vidply>
  <source src="video.mp4" type="video/mp4">
  <track kind="subtitles" src="en.vtt" srclang="en" label="English">
  <track kind="subtitles" src="es.vtt" srclang="es" label="Español">
</video>
```

### 2. Enable Keyboard Navigation

```javascript
const player = new Player('#video', {
  keyboard: true,
  screenReaderAnnouncements: true
});
```

### 3. Provide Descriptive Labels

```javascript
const player = new Player('#video', {
  ariaLabels: {
    play: 'Start video playback',
    pause: 'Pause video playback',
    // ... custom labels
  }
});
```

### 4. High Contrast Support

The player automatically adapts to high contrast mode. Test with:
- Windows: Settings > Accessibility > Contrast themes
- CSS: `@media (prefers-contrast: high)`

### 5. Reduced Motion

The player respects `prefers-reduced-motion` preferences automatically.

## Performance Tips

### 1. Preload Strategy

```javascript
// Don't preload (better for mobile)
const player = new Player('#video', {
  preload: 'none'
});

// Preload metadata only
const player = new Player('#video', {
  preload: 'metadata'
});

// Preload entire video
const player = new Player('#video', {
  preload: 'auto'
});
```

### 2. Lazy Loading

VidPly can avoid eager network loading (useful if you have many players on one page):

```html
<video
  data-vidply
  preload="none"
  data-vidply-options='{"deferLoad": true, "preload": "none"}'
  src="video.mp4"
></video>
```

Notes:
- With `deferLoad: true`, VidPly does not call `media.load()` during init (and HLS/DASH will not start loading) until the user starts playback.
- Browsers may still perform small requests depending on `preload` and their buffering strategy.

### 3. Responsive Images for Poster

```html
<video 
  data-vidply
  poster="poster-small.jpg"
  data-poster-medium="poster-medium.jpg"
  data-poster-large="poster-large.jpg"
></video>
```

## Troubleshooting

### Video Won't Play

1. Check console for errors
2. Verify video format is supported
3. Enable debug mode:

```javascript
const player = new Player('#video', {
  debug: true
});
```

### Captions Not Showing

1. Verify VTT file format
2. Check CORS headers if loading from different domain
3. Ensure track has `kind="subtitles"` or `kind="captions"`

### YouTube/Vimeo Not Loading

1. Check internet connection
2. Verify video URL format
3. Check browser console for API loading errors

### HLS Stream Issues

1. Verify M3U8 URL is accessible
2. Check CORS headers
3. Test in Safari (native HLS support)
4. **hls.js 1.7.0** loads on demand when not already on the page (override via `hlsScriptUrl`)

### DASH Stream Issues

1. Verify MPD URL is accessible
2. Check CORS headers on the streaming server
3. **dash.js 5.2.1** (modern UMD) loads on demand when not already on the page (override via `dashScriptUrl`)
4. TTML subtitles are rendered by dash.js natively; WebVTT subtitles use VidPly's caption system
5. If quality levels don't appear, check that the MPD manifest contains multiple representations
6. Enable debug mode for dash.js logs: `{ debug: true }`

## Advanced Configuration

### Pass Options via Data Attribute

```html
<video 
  data-vidply
  data-vidply-options='{"autoplay": true, "loop": true, "volume": 0.5}'
  src="video.mp4"
></video>
```

### Create Player from JavaScript

```javascript
// Create video element dynamically
const video = document.createElement('video');
video.src = 'video.mp4';
document.body.appendChild(video);

// Initialize player
const player = new Player(video, {
  controls: true,
  autoplay: false
});
```

### Access Native Video Element

```javascript
const player = new Player('#video');

// Access underlying video/audio element
const videoElement = player.element;
videoElement.playbackRate = 2;
```

## Browser Console Commands

When debug mode is enabled, you can control the player from the browser console:

```javascript
// Find player instance
const player = document.querySelector('.vidply-player')._vidply;

// Control playback
player.play();
player.pause();
player.seek(60);

// Check state
player.state.currentTime;
player.state.duration;
player.state.playing;
```

## Complete Accessibility Example

Here's a video with all accessibility features enabled:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fully Accessible Video</title>
  <link rel="stylesheet" href="dist/vidply.min.css">
</head>
<body>
  <video 
    id="accessible-video"
    data-vidply
    src="main-video.mp4"
    data-audio-description-src="described-version.mp4"
    data-sign-language-src="sign-language-video.mp4"
    data-sign-language-position="bottom-right"
    data-transcript="true"
    data-transcript-button="true"
  >
    <!-- Multiple caption languages -->
    <track kind="captions" src="captions-en.vtt" srclang="en" label="English" default>
    <track kind="captions" src="captions-es.vtt" srclang="es" label="Español">
    <track kind="captions" src="captions-fr.vtt" srclang="fr" label="Français">
    
    <!-- Chapters for navigation -->
    <track kind="chapters" src="chapters-en.vtt" srclang="en" label="Chapters">
    
    <!-- Audio descriptions (if not using alternate video) -->
    <track kind="descriptions" src="descriptions-en.vtt" srclang="en" label="Descriptions">
  </video>

  <script type="module">
    import Player from './dist/prod/vidply.esm.min.js';
    
    // Player auto-initializes with all features enabled
  </script>
</body>
</html>
```

This provides:
- Multiple caption languages with easy switching
- Interactive transcript for reading and navigation
- Sign language video overlay
- Audio description alternate track
- Chapter navigation
- Full keyboard accessibility
- Screen reader support

## Next Steps

- Explore `demo.html` for live examples
- Read API documentation in `README.md`
- Check [TRANSCRIPT.md](TRANSCRIPT.md) for transcript features
- Check [PLAYLIST.md](PLAYLIST.md) for playlist features
- Check source code in `src/` for customization
- Join community discussions

---

Happy coding!

