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

```html
<script type="module">
  import Player from './src/index.js';
  // Player auto-initializes elements with data-vidply attribute
</script>
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

```javascript
const player = new Player('#video', {
  language: 'es'  // Spanish
});
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

### YouTube/Vimeo Integration

```html
<!-- YouTube -->
<video data-vidply src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></video>

<!-- Vimeo -->
<video data-vidply src="https://vimeo.com/76979871"></video>

<!-- These will automatically use the appropriate renderer -->
```

### HLS Streaming

```html
<video data-vidply src="https://example.com/stream.m3u8"></video>
```

```javascript
// Access HLS-specific features
const player = new Player('#video');

// Listen for quality levels
player.on('hlsmanifestparsed', (data) => {
  console.log('Available qualities:', data.levels);
});

// Switch quality manually (if using HLS renderer)
if (player.renderer.switchQuality) {
  player.renderer.switchQuality(2); // Switch to quality level 2
}
```

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

```html
<!-- Only initialize when in viewport -->
<video 
  data-vidply
  loading="lazy"
  src="video.mp4"
></video>
```

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
4. hls.js library will auto-load for other browsers

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

## Next Steps

- Explore `demo.html` for live examples
- Read API documentation in `README.md`
- Check source code in `src/` for customization
- Join community discussions

---

Happy coding!

