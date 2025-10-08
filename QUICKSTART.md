# 🚀 VidPly Quick Start

Get started with VidPly in 3 simple steps!

## Step 1: Include the CSS

```html
<link rel="stylesheet" href="src/styles/vidply.css">
```

## Step 2: Add Your Video

```html
<video data-vidply width="800" height="450">
  <source src="your-video.mp4" type="video/mp4">
</video>
```

## Step 3: Import the Player

```html
<script type="module">
  import Player from './src/index.js';
</script>
```

That's it! 🎉

## Test It Out

Open `demo.html` in your browser to see VidPly in action:

```bash
# Option 1: Using Python
python -m http.server 8000

# Option 2: Using Node.js
npx serve .

# Option 3: Using PHP
php -S localhost:8000
```

Then visit: http://localhost:8000/demo.html

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

### Example 2: YouTube Video

```html
<video data-vidply src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></video>
```

### Example 3: With Captions

```html
<video data-vidply width="800" height="450">
  <source src="video.mp4" type="video/mp4">
  <track kind="subtitles" src="captions.vtt" srclang="en" label="English">
</video>
```

### Example 4: Audio Player

```html
<audio data-vidply>
  <source src="music.mp3" type="audio/mpeg">
</audio>
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

## Keyboard Shortcuts (Built-in)

- <kbd>Space</kbd> or <kbd>K</kbd> - Play/Pause
- <kbd>F</kbd> - Fullscreen
- <kbd>M</kbd> - Mute
- <kbd>↑</kbd> / <kbd>↓</kbd> - Volume
- <kbd>←</kbd> / <kbd>→</kbd> - Seek
- <kbd>C</kbd> - Captions

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

## Need More Help?

- 📖 **Full Documentation**: See `README.md`
- 🎯 **Usage Guide**: See `USAGE.md`
- 🎬 **Live Demo**: Open `demo.html`
- 💻 **Source Code**: Browse `src/` folder

## Project Structure

```
vidply/
├── src/
│   ├── core/           # Core player class
│   ├── controls/       # UI controls
│   ├── renderers/      # Media renderers
│   ├── utils/          # Utilities
│   ├── icons/          # SVG icons
│   ├── i18n/           # Translations
│   ├── styles/         # CSS styles
│   └── index.js        # Entry point
├── demo.html           # Live demo
├── README.md           # Documentation
├── USAGE.md            # Usage guide
└── QUICKSTART.md       # This file
```

---

**Happy coding!** 🎬✨

