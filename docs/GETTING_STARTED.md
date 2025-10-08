# <img src="../favicon.svg" width="32" alt="VidPly" /> Getting Started with VidPly

Welcome! This guide will help you get VidPly up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- A text editor
- A modern web browser

## Quick Installation

### 1. Get the Code

```bash
git clone https://github.com/yourusername/vidply.git
cd vidply
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `esbuild` - Fast JavaScript bundler
- `clean-css` - CSS minifier

### 3. Build the Player

```bash
npm run build
```

This creates production-ready files in `dist/`:
- `vidply.esm.min.js` - Minified ES Module (~50KB)
- `vidply.min.js` - Minified IIFE bundle (~52KB)
- `vidply.min.css` - Minified styles (~12KB)

### 4. View the Demo

```bash
npm run dev
```

Open http://localhost:3000/demo/ to see VidPly in action!

## Your First Video Player

### Create `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Video Player</title>
  <link rel="stylesheet" href="dist/vidply.min.css">
</head>
<body>
  <h1>My Video Player</h1>
  
  <video 
    data-vidply 
    width="800" 
    height="450"
    poster="poster.jpg"
  >
    <source src="video.mp4" type="video/mp4">
    <track 
      kind="captions" 
      src="captions.vtt" 
      srclang="en" 
      label="English"
    >
  </video>

  <script type="module">
    import Player from './dist/vidply.esm.min.js';
    // That's it! Player auto-initializes
  </script>
</body>
</html>
```

### Test It

```bash
# Start a local server
npm run dev

# Or use Python
python -m http.server 3000

# Or use PHP
php -S localhost:3000
```

Open http://localhost:3000 in your browser.

## 3-Step Quick Start

If you just want to use the source files directly without building:

### Step 1: Include the CSS

```html
<link rel="stylesheet" href="src/styles/vidply.css">
```

### Step 2: Add Your Video

```html
<video data-vidply width="800" height="450">
  <source src="your-video.mp4" type="video/mp4">
</video>
```

### Step 3: Import the Player

```html
<script type="module">
  import Player from './src/index.js';
</script>
```

That's it!

## Basic Examples

### Example 1: Simple Video

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="src/styles/vidply.css">
</head>
<body>
  <video data-vidply src="video.mp4" width="800" height="450"></video>
  
  <script type="module">
    import Player from './src/index.js';
  </script>
</body>
</html>
```

### Example 2: Audio Player

```html
<audio data-vidply>
  <source src="music.mp3" type="audio/mpeg">
  <track kind="captions" src="lyrics.vtt" srclang="en" label="Lyrics">
</audio>
```

### Example 3: YouTube Video

```html
<video 
  data-vidply 
  src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
></video>
```

### Example 4: Vimeo Video

```html
<video 
  data-vidply 
  src="https://vimeo.com/76979871"
></video>
```

### Example 5: With Options

```html
<video 
  data-vidply 
  data-vidply-options='{"autoplay": true, "loop": true, "muted": true}'
  src="video.mp4"
></video>
```

### Example 6: Manual Initialization

```html
<video id="my-video" src="video.mp4"></video>

<script type="module">
  import Player from './src/index.js';
  
  const player = new Player('#my-video', {
    controls: true,
    autoplay: false,
    volume: 0.8,
    language: 'en'
  });
  
  // Control the player
  player.on('ready', () => {
    console.log('Player is ready!');
  });
</script>
```

## Configuration

### Via Data Attribute

```html
<video 
  data-vidply 
  data-vidply-options='{
    "autoplay": true,
    "loop": true,
    "volume": 0.5,
    "language": "de"
  }'
  src="video.mp4"
></video>
```

### Via JavaScript

```javascript
const player = new Player('#my-video', {
  controls: true,
  autoplay: false,
  loop: false,
  volume: 0.8,
  playbackSpeed: 1.0,
  captions: true,
  captionsDefault: true,
  keyboard: true,
  language: 'en',
  responsive: true
});
```

## Common Options

```javascript
{
  // Playback
  autoplay: false,      // Auto-start playback
  loop: false,          // Loop video
  muted: false,         // Start muted
  volume: 0.8,          // Volume (0-1)
  playbackSpeed: 1.0,   // Speed (0.25-2.0)
  
  // Display
  responsive: true,     // Responsive sizing
  controls: true,       // Show controls
  
  // Captions
  captions: true,       // Enable captions
  captionsDefault: false, // Show captions by default
  
  // Accessibility
  keyboard: true,       // Keyboard shortcuts
  
  // Language
  language: 'en'        // UI language (en, es, fr, de, ja)
}
```

## Multi-Language Captions

```html
<video data-vidply src="video.mp4">
  <track kind="captions" src="en.vtt" srclang="en" label="English">
  <track kind="captions" src="es.vtt" srclang="es" label="Español">
  <track kind="captions" src="fr.vtt" srclang="fr" label="Français">
  <track kind="captions" src="de.vtt" srclang="de" label="Deutsch">
</video>
```

**How it works:**
- Click the CC button to open the caption menu
- Select your preferred language
- Or press <kbd>C</kbd> to open the menu (if multiple tracks available)
- The active track is marked with a checkmark

## Creating Captions (WebVTT)

Create a file called `captions.vtt`:

```
WEBVTT

00:00:00.000 --> 00:00:05.000
Welcome to my video!

00:00:05.000 --> 00:00:10.000
This is how captions work.

00:00:10.000 --> 00:00:15.000
Pretty easy, right?
```

## Controlling the Player

```javascript
const player = new Player('#video');

// Playback
player.play();
player.pause();
player.stop();
player.seek(60);  // Jump to 1 minute

// Volume
player.setVolume(0.5);  // 50% volume
player.mute();
player.unmute();

// Speed
player.setPlaybackSpeed(1.5);  // 1.5x speed

// Fullscreen
player.enterFullscreen();
player.exitFullscreen();

// Captions
player.enableCaptions();
player.disableCaptions();

// Events
player.on('play', () => console.log('Playing!'));
player.on('pause', () => console.log('Paused'));
player.on('ended', () => console.log('Finished'));
player.on('timeupdate', (time) => {
  console.log('Current time:', time);
});
```

## Keyboard Shortcuts

Once the player is focused:

- <kbd>Space</kbd> or <kbd>K</kbd> - Play/Pause
- <kbd>F</kbd> - Fullscreen
- <kbd>M</kbd> - Mute
- <kbd>↑</kbd> / <kbd>↓</kbd> - Volume Up/Down
- <kbd>←</kbd> / <kbd>→</kbd> - Seek -10s / +10s
- <kbd>J</kbd> / <kbd>L</kbd> - Seek -30s / +30s
- <kbd>C</kbd> - Toggle Captions
- <kbd><</kbd> / <kbd>></kbd> - Decrease/Increase Speed
- <kbd>S</kbd> - Settings

## Customizing Styles

### Override CSS Variables

```css
.vidply-player {
  --vidply-primary-color: #ff0000;
  --vidply-background: rgba(0, 0, 0, 0.9);
}
```

### Custom Progress Bar

```css
.vidply-progress-played {
  background: linear-gradient(90deg, #ff0000, #ff00ff);
}
```

### Custom Button Hover

```css
.vidply-button:hover {
  background: rgba(255, 0, 0, 0.2);
}
```

## Change Language

```javascript
const player = new Player('#video', {
  language: 'de'  // German UI
});

// Available: en, es, fr, de, ja
```

## Development Mode

Enable debug logging:

```javascript
const player = new Player('#video', {
  debug: true
});
```

Check the browser console for detailed logs.

## Deployment Options

### Option 1: ES Module (Modern Browsers)

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script type="module">
  import Player from './dist/vidply.esm.min.js';
</script>
```

### Option 2: Traditional Script Tag (IIFE)

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script src="dist/vidply.min.js"></script>
<script>
  const player = new VidPly.Player('#video');
</script>
```

### Option 3: CDN (Future)

```html
<!-- Will be available after publishing to npm -->
<link rel="stylesheet" href="https://cdn.example.com/vidply@1.0.0/vidply.min.css">
<script type="module">
  import Player from 'https://cdn.example.com/vidply@1.0.0/vidply.esm.min.js';
</script>
```

## Mobile Optimization

VidPly is mobile-friendly by default. For best results:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

And use responsive mode:

```javascript
const player = new Player('#video', {
  responsive: true
});
```

## Accessibility

VidPly is WCAG 2.1 AA compliant out of the box:

- Full keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators
- ARIA labels

No extra configuration needed!

## Troubleshooting

### Video Won't Play

1. Check console for errors (press F12)
2. Verify video URL is correct
3. Check CORS headers if loading from different domain
4. Enable debug mode: `{ debug: true }`

### Captions Not Showing

1. Verify VTT file format is correct
2. Check file path
3. Enable captions: click the CC button
4. Or enable by default: `{ captionsDefault: true }`

### Build Failed

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules
npm install
npm run build
```

### Autoplay Not Working

Browsers block autoplay with audio. Solution:

```javascript
const player = new Player('#video', {
  autoplay: true,
  muted: true  // Required for autoplay
});
```

## Available Build Scripts

```bash
npm run build        # Build everything
npm run build:js     # Build JS only
npm run build:css    # Build CSS only
npm run watch        # Watch mode for development
npm run clean        # Clean dist/
npm run dev          # Start dev server (port 3000)
npm start            # Alias for npm run dev
```

## File Structure

After building, you'll have:

```
vidply/
├── dist/
│   ├── vidply.esm.js       # ES Module (dev)
│   ├── vidply.esm.min.js   # ES Module (prod)
│   ├── vidply.js           # IIFE (dev)
│   ├── vidply.min.js       # IIFE (prod)
│   ├── vidply.css          # Styles (dev)
│   └── vidply.min.css      # Styles (prod)
└── ...
```

Only include in production:
- `vidply.esm.min.js` (or `vidply.min.js`)
- `vidply.min.css`

Total: ~62KB uncompressed, ~18KB gzipped

## Next Steps

- Read [USAGE.md](USAGE.md) for more examples
- Check [demo/demo.html](../demo/demo.html) for live demos
- See [PLAYLIST.md](PLAYLIST.md) for playlist features
- Read [BUILD.md](BUILD.md) for build customization

## Tips

1. **Always use a local server** - Don't open HTML files directly (file://)
2. **Enable captions by default** for better accessibility
3. **Use responsive mode** for mobile support
4. **Test keyboard shortcuts** to ensure accessibility
5. **Check browser console** for helpful debug messages

## You're Ready!

That's it! You now know how to:
- Install and build VidPly
- Create video/audio players
- Add captions
- Configure options
- Control playback
- Customize styles

Happy coding!

---

Need help? Check the [README](../README.md) or [open an issue](https://github.com/yourusername/vidply/issues).