# VidPly Installation Guide

## Quick Install

### Step 1: Get the Code

```bash
git clone https://github.com/yourusername/vidply.git
cd vidply
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `esbuild` - Fast JavaScript bundler
- `clean-css` - CSS minifier

### Step 3: Build

```bash
npm run build
```

This creates production-ready files in `dist/`:
- `vidply.esm.min.js` - Minified ES Module (~50KB)
- `vidply.min.js` - Minified IIFE bundle (~52KB)
- `vidply.min.css` - Minified styles (~12KB)

### Step 4: Use in Your Project

#### Option A: ES Module (Modern)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/vidply.min.css">
</head>
<body>
  <video data-vidply src="video.mp4" width="800" height="450">
    <track kind="captions" src="captions.vtt" srclang="en" label="English">
  </video>

  <script type="module">
    import Player from './path/to/vidply.esm.min.js';
  </script>
</body>
</html>
```

#### Option B: Script Tag (Traditional)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/vidply.min.css">
</head>
<body>
  <video id="my-video" src="video.mp4"></video>

  <script src="path/to/vidply.min.js"></script>
  <script>
    const player = new VidPly.Player('#my-video', {
      controls: true,
      captions: true
    });
  </script>
</body>
</html>
```

## Development Setup

For contributing or customizing VidPly:

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Watch Mode

```bash
npm run watch
```

This watches for file changes and rebuilds automatically.

### 3. Start Dev Server

In another terminal:

```bash
npm run dev
```

Open http://localhost:3000/demo/ to see the demo page.

### 4. Make Changes

Edit files in `src/`:
- `src/core/` - Core player logic
- `src/controls/` - UI controls
- `src/renderers/` - Media renderers
- `src/styles/` - CSS styles

Changes are automatically rebuilt.

## Directory Structure

```
vidply/
├── src/                  # Source code
│   ├── core/            # Core player
│   ├── controls/        # UI components
│   ├── renderers/       # Media renderers
│   ├── utils/           # Utilities
│   ├── icons/           # SVG icons
│   ├── i18n/            # Translations
│   ├── styles/          # CSS
│   └── index.js         # Entry point
├── build/               # Build scripts
│   ├── build.js         # Main build script
│   ├── build-css.js     # CSS build
│   ├── watch.js         # Watch mode
│   └── clean.js         # Clean script
├── demo/                # Demo files
│   ├── demo.html        # Full demo
│   ├── index.html       # Demo landing
│   └── media/           # Demo media files
├── dist/                # Built files (generated)
│   ├── vidply.esm.js
│   ├── vidply.esm.min.js
│   ├── vidply.js
│   ├── vidply.min.js
│   ├── vidply.css
│   └── vidply.min.css
├── package.json         # Dependencies
├── README.md            # Documentation
├── BUILD.md             # Build guide
├── INSTALL.md           # This file
└── LICENSE              # GPL-2.0-or-later
```

## Minimal Installation

If you only want to use the player (not develop it):

1. Copy these files to your project:
   - `dist/vidply.esm.min.js` (or `vidply.min.js`)
   - `dist/vidply.min.css`

2. Reference them in your HTML:

```html
<link rel="stylesheet" href="vidply.min.css">
<script type="module">
  import Player from './vidply.esm.min.js';
</script>
```

No npm install or build required!

## CDN Usage (Future)

Once published, you could use:

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vidply@1/dist/vidply.min.css">

<!-- JS (ES Module) -->
<script type="module">
  import Player from 'https://cdn.jsdelivr.net/npm/vidply@1/dist/vidply.esm.min.js';
</script>
```

## Requirements

### Runtime (Browser)
- Modern browser with ES2020 support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- No external dependencies

### Build Time (Development)
- Node.js 18 or higher
- npm 8 or higher

## Troubleshooting

### Build Fails

```bash
# Clear and reinstall
rm -rf node_modules
npm install
npm run build
```

### Module Not Found

Make sure paths are correct:
```javascript
// Correct
import Player from './dist/vidply.esm.min.js';

// Wrong (missing ./)
import Player from 'dist/vidply.esm.min.js';
```

### CORS Issues

If loading from `file://` protocol, use a local server:

```bash
npm run dev
# or
python -m http.server 3000
# or
npx serve .
```

### Styles Not Loading

Ensure CSS is loaded before the video element:

```html
<head>
  <link rel="stylesheet" href="vidply.min.css">
</head>
```

## Next Steps

- Read [README.md](README.md) for full documentation
- See [BUILD.md](BUILD.md) for build details
- Check [USAGE.md](USAGE.md) for examples
- Open [demo/demo.html](demo/demo.html) for live demos

## Support

- 📖 Documentation: See README.md
- 🐛 Issues: Report on GitHub
- 💬 Questions: GitHub Discussions

---

**Happy coding!** 🎬

