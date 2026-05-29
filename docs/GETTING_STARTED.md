# <img src="../favicon.svg" width="32" alt="VidPly" /> Getting Started with VidPly

Welcome! This guide will help you get VidPly up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- A text editor
- A modern web browser

## Quick Installation

### 1. Get the Code

```bash
git clone https://github.com/MatthiasPeltzer/vidply.git
cd vidply
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `esbuild` - Fast TypeScript/JavaScript bundler
- `typescript` - Strict type-checking and `.d.ts` emission
- `clean-css` - CSS minifier
- `vitest` + `@playwright/test` - Unit and end-to-end testing

### 3. Build the Player

```bash
npm run build
```

This creates production-ready files in `dist/`:
- `prod/vidply.esm.min.js` - Minified ES Module (recommended for production)
- `legacy/vidply.min.js` - Minified IIFE bundle (global `VidPly`)
- `types/index.d.ts` - TypeScript type declarations for IDE / `tsc` consumers
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
    import Player from './dist/prod/vidply.esm.min.js';
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

### Example 5: SoundCloud Track

```html
<audio
  data-vidply
  src="https://soundcloud.com/artist/track-name"
></audio>
```

### Example 6: HLS Streaming

```html
<video 
  data-vidply 
  src="https://example.com/stream.m3u8"
></video>
```

### Example 7: DASH Streaming

```html
<video 
  data-vidply 
  src="https://example.com/video/dash/manifest.mpd"
></video>
```

### Example 8: With Download Button

```html
<video
  data-vidply
  data-vidply-download-button="true"
  data-vidply-download-url="/files/lecture.mp4"
  src="/streams/lecture/manifest.mpd">
</video>
```

### Example 9: With the Custom Floating Player

Enable the in-page floating player ("own PiP"). When the original scrolls out of
the viewport, VidPly pops the video into a draggable, resizable floating shell
in the chosen corner; when it scrolls back in, the player docks again. The PiP
button in the control bar manually pins/unpins the floating shell. Native
browser PiP is suppressed automatically while floating is enabled.

```html
<video
  data-vidply
  data-vidply-options='{"floating": true, "floatingPosition": "bottom-right", "floatingMinViewportWidth": 768}'
  src="video.mp4"
  width="800" height="450">
  <track kind="subtitles" src="captions.vtt" srclang="en" label="English">
</video>
```

> Audio players ignore `floating`. The feature is hidden below `floatingMinViewportWidth` (default `768px`) and the floating PiP button never appears in the overflow menu.

### Example 10: With Options

```html
<video 
  data-vidply 
  data-vidply-options='{"autoplay": true, "loop": true, "muted": true}'
  src="video.mp4"
></video>
```

### Example 11: Manual Initialization

```html
<video id="my-video" src="video.mp4"></video>

<script type="module">
  import Player from './dist/prod/vidply.esm.min.js';

  const player = new Player('#my-video', {
    controls: true,
    autoplay: false,
    volume: 0.8,
    language: 'en'
  });

  player.on('ready', () => {
    console.log('Player is ready!');
  });
</script>
```

> Working with TypeScript? Import directly from the source tree (`import Player from 'vidply'`) — VidPly ships its own `.d.ts` declarations, so you'll get full type-safety on `PlayerOptions`, events and renderer APIs.

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

- <kbd>Space</kbd> / <kbd>P</kbd> / <kbd>K</kbd> - Play/Pause
- <kbd>F</kbd> - Fullscreen
- <kbd>M</kbd> - Mute/Unmute
- <kbd>↑</kbd> / <kbd>↓</kbd> - Volume Up/Down
- <kbd>←</kbd> / <kbd>→</kbd> - Seek -10s / +10s
- <kbd>C</kbd> - Toggle Captions
- <kbd>A</kbd> - Open Caption Style Menu
- <kbd><</kbd> / <kbd>></kbd> - Decrease/Increase Speed
- <kbd>S</kbd> - Open Speed Menu
- <kbd>Q</kbd> - Open Quality Menu
- <kbd>J</kbd> - Open Chapters Menu
- <kbd>T</kbd> - Toggle Transcript
- <kbd>D</kbd> - Toggle Drag Mode (Transcript/Sign Language)
- <kbd>R</kbd> - Toggle Resize Mode (Transcript/Sign Language)
- <kbd>Home</kbd> - Reset Position (Transcript/Sign Language)
- <kbd>Escape</kbd> - Exit Mode or Close Menu

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

### Built-in Languages

VidPly includes translations for 5 languages:
- `en` - English
- `es` - Spanish (Español)
- `fr` - French (Français)
- `de` - German (Deutsch)
- `ja` - Japanese (日本語)

```javascript
const player = new Player('#video', {
  language: 'de'  // German UI
});
```

### Custom Translations

You can add your own translations by loading language files from URLs. The player supports JSON and YAML formats.

#### Using Data Attributes

Load multiple language files:

```html
<video 
  data-vidply 
  data-vidply-language-files='{"pt": "languages/pt.json", "it": "languages/it.json"}'
  src="video.mp4"
></video>
```

Load a single language file:

```html
<video 
  data-vidply 
  data-vidply-language-file='{"pt": "languages/pt.json"}'
  src="video.mp4"
></video>
```

Or use separate attributes:

```html
<video 
  data-vidply 
  data-vidply-language-file-code="pt"
  data-vidply-language-file-url="languages/pt.json"
  src="video.mp4"
></video>
```

#### Using JavaScript Options

```javascript
const player = new Player('#video', {
  language: 'pt',  // Set language after loading
  languageFiles: {
    'pt': 'languages/pt.json',
    'it': 'languages/it.json'
  }
});
```

#### Language File Format (JSON)

Create a file `languages/pt.json`:

```json
{
  "player": {
    "play": "Reproduzir",
    "pause": "Pausar",
    "mute": "Silenciar",
    "unmute": "Ativar som",
    "fullscreen": "Tela cheia",
    "exitFullscreen": "Sair da tela cheia",
    "captions": "Legendas",
    "settings": "Configurações"
  },
  "time": {
    "currentTime": "Tempo atual",
    "duration": "Duração"
  }
}
```

#### Auto-detection from HTML

The player automatically detects the language from the HTML `lang` attribute if a matching translation is available:

```html
<html lang="pt">
  <video data-vidply 
         data-vidply-language-file='{"pt": "languages/pt.json"}'
         src="video.mp4">
  </video>
</html>
```

#### Programmatic Translation Loading

```javascript
import { i18n } from './src/i18n/i18n.js';

// Load a language file
await i18n.loadLanguageFromUrl('pt', 'languages/pt.json');

// Or load multiple languages
await i18n.loadLanguagesFromUrls({
  'pt': 'languages/pt.json',
  'it': 'languages/it.json'
});

// Set the language
i18n.setLanguage('pt');
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
  import Player from './dist/prod/vidply.esm.min.js';
</script>
```

### Option 2: Traditional Script Tag (IIFE)

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script src="dist/legacy/vidply.min.js"></script>
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

VidPly is mobile-friendly by default with a mobile breakpoint at 768px. For best results:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

And use responsive mode:

```javascript
const player = new Player('#video', {
  responsive: true
});
```

**Mobile-specific behavior (< 768px breakpoint):**
- Transcript window appears below the video (not draggable/resizable)
- Sign language video is not draggable/resizable
- Optimized control bar with overflow menu for many buttons
- Touch-friendly interface with 44px minimum touch targets
- Transcript window minimum width: 300px

## Accessibility

VidPly is WCAG 2.2 AA compliant out of the box:

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
│   ├── dev/
│   │   └── vidply.esm.js       # ES Module (dev)
│   ├── prod/
│   │   └── vidply.esm.min.js   # ES Module (prod)
│   ├── legacy/
│   │   ├── vidply.js           # IIFE (dev)
│   │   └── vidply.min.js       # IIFE (prod)
│   ├── types/
│   │   └── index.d.ts          # TypeScript declarations
│   ├── vidply.css              # Styles (dev)
│   └── vidply.min.css          # Styles (prod)
└── ...
```

Only include in production:
- `dist/prod/vidply.esm.min.js` (or `dist/legacy/vidply.min.js`)
- `dist/vidply.min.css`

Total: ~62KB uncompressed, ~18KB gzipped

## Streaming (HLS & DASH)

VidPly auto-detects streaming formats by file extension:

- **HLS** (`.m3u8`) - Uses **hls.js 1.6.16** on Chrome / Firefox / Edge / desktop Safari (CDN fallback when not preloaded). On iOS / iPadOS the native `<video>` HLS support is used and bridged into VidPly's caption / transcript / quality UI via the `TextTrack` API.
- **DASH** (`.mpd`) - Uses **dash.js 5.2.0** (modern UMD), loaded on demand when not already on the page.
- **SoundCloud** - Auto-detected for any URL containing `soundcloud.com`; the SoundCloud Widget API is loaded on demand.

```html
<!-- HLS -->
<video data-vidply src="https://example.com/stream.m3u8"></video>

<!-- DASH -->
<video data-vidply src="https://example.com/manifest.mpd"></video>

<!-- SoundCloud -->
<audio data-vidply src="https://soundcloud.com/artist/track-name"></audio>
```

All formats support adaptive quality selection and captions. DASH streams with embedded TTML subtitles are rendered natively by dash.js, while WebVTT subtitles are handled by VidPly's caption system and also support the interactive transcript.

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

Need help? Check the [README](../README.md) or [open an issue](https://github.com/MatthiasPeltzer/vidply/issues).