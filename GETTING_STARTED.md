# Getting Started with VidPly

Welcome! This guide will help you get VidPly up and running in 5 minutes.

## 📋 Prerequisites

- Node.js 18+ installed
- A text editor
- A modern web browser

## 🚀 Quick Setup

### 1. Clone or Download

```bash
git clone https://github.com/yourusername/vidply.git
cd vidply
```

### 2. Install & Build

```bash
npm install
npm run build
```

This creates optimized files in the `dist/` folder.

### 3. View the Demo

```bash
npm run dev
```

Open http://localhost:3000/demo/ to see VidPly in action!

## 🎬 Your First Video Player

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

## 🎵 Audio Player

```html
<audio data-vidply>
  <source src="music.mp3" type="audio/mpeg">
  <track kind="captions" src="lyrics.vtt" srclang="en" label="Lyrics">
</audio>
```

## 📺 YouTube Video

```html
<video 
  data-vidply 
  src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
></video>
```

## 🎨 Vimeo Video

```html
<video 
  data-vidply 
  src="https://vimeo.com/76979871"
></video>
```

## ⚙️ Configuration

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

```html
<video id="my-video" src="video.mp4"></video>

<script type="module">
  import Player from './dist/vidply.esm.min.js';
  
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
</script>
```

## 🎯 Common Use Cases

### Autoplay (Muted)

```javascript
const player = new Player('#video', {
  autoplay: true,
  muted: true  // Required for autoplay to work
});
```

### Start at Specific Time

```javascript
const player = new Player('#video', {
  startTime: 30  // Start at 30 seconds
});
```

### Multi-Language Captions

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
- The active track is marked with a checkmark ✓

### Custom Keyboard Shortcuts

```javascript
const player = new Player('#video', {
  keyboardShortcuts: {
    'play-pause': [' ', 'Enter'],
    'seek-forward': ['d'],
    'seek-backward': ['a'],
    'volume-up': ['w'],
    'volume-down': ['s']
  }
});
```

## 📝 Creating Captions (WebVTT)

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

## 🎮 Controlling the Player

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

## ⌨️ Keyboard Shortcuts

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

## 🎨 Customizing Styles

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

## 🌐 Change Language

```javascript
const player = new Player('#video', {
  language: 'de'  // German UI
});

// Available: en, es, fr, de, ja
```

## 🔧 Development Mode

Enable debug logging:

```javascript
const player = new Player('#video', {
  debug: true
});
```

Check the browser console for detailed logs.

## 📱 Mobile Optimization

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

## ♿ Accessibility

VidPly is WCAG 2.1 AA compliant out of the box:

- Full keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators
- ARIA labels

No extra configuration needed!

## 🐛 Troubleshooting

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

## 📚 Next Steps

- Read [README.md](README.md) for full API documentation
- See [USAGE.md](USAGE.md) for more examples
- Check [demo/demo.html](demo/demo.html) for live demos
- Read [BUILD.md](BUILD.md) for build customization

## 💡 Tips

1. **Always use a local server** - Don't open HTML files directly (file://)
2. **Enable captions by default** for better accessibility
3. **Use responsive mode** for mobile support
4. **Test keyboard shortcuts** to ensure accessibility
5. **Check browser console** for helpful debug messages

## 🎉 You're Ready!

That's it! You now know how to:
- ✅ Build VidPly
- ✅ Create video/audio players
- ✅ Add captions
- ✅ Configure options
- ✅ Control playback
- ✅ Customize styles

Happy coding! 🎬

---

Need help? Check the [documentation](README.md) or [open an issue](https://github.com/yourusername/vidply/issues).

