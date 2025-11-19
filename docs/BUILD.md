# <img src="../favicon.svg" width="32" alt="VidPly" /> VidPly Build Guide

This document explains how to build VidPly from source.

## Prerequisites

- Node.js 18+ (for build tools)
- npm or yarn

## Installation

Install dependencies:

```bash
npm install
```

This will install:
- `esbuild` - Fast JavaScript bundler
- `clean-css` - CSS minifier

## Build Commands

### Build Everything

Build both JavaScript and CSS:

```bash
npm run build
```

This creates:
- `dist/vidply.esm.js` - ES Module (development)
- `dist/vidply.esm.min.js` - ES Module (production, minified)
- `dist/vidply.js` - IIFE/UMD bundle (development)
- `dist/vidply.min.js` - IIFE/UMD bundle (production, minified)
- `dist/vidply.css` - Unminified styles
- `dist/vidply.min.css` - Minified styles

### Build JavaScript Only

```bash
npm run build:js
```

### Build CSS Only

```bash
npm run build:css
```

### Clean Build Directory

```bash
npm run clean
```

### Watch Mode (Development)

Auto-rebuild on file changes:

```bash
npm run watch
```

Then in another terminal:

```bash
npm run dev
```

This starts a local server at http://localhost:3000

## Build Output

### JavaScript Bundles

**ESM Format** (`dist/vidply.esm.js` and `.min.js`)
- Modern ES6 module format
- Use with `import` statements
- Tree-shakeable
- Recommended for modern projects

```javascript
import Player from './dist/vidply.esm.min.js';
```

**IIFE Format** (`dist/vidply.js` and `.min.js`)
- Immediately Invoked Function Expression
- Works with `<script>` tags
- Creates global `VidPly` variable
- For traditional web pages

```html
<script src="dist/vidply.min.js"></script>
<script>
  const player = new VidPly.Player('#video');
</script>
```

### CSS Files

**dist/vidply.css**
- Unminified, readable styles
- Includes comments
- Good for development and customization

**dist/vidply.min.css**
- Minified and optimized
- ~60% smaller than unminified
- Use in production

## Using Built Files

### Option 1: ES Module (Recommended)

```html
<link rel="stylesheet" href="dist/vidply.min.css">

<video data-vidply src="video.mp4"></video>

<script type="module">
  import Player from './dist/vidply.esm.min.js';
  // Player auto-initializes with data-vidply
</script>
```

### Option 2: IIFE (Traditional)

```html
<link rel="stylesheet" href="dist/vidply.min.css">
<script src="dist/vidply.min.js"></script>

<video id="my-video" src="video.mp4"></video>

<script>
  const player = new VidPly.Player('#my-video', {
    controls: true,
    autoplay: false
  });
</script>
```

## File Sizes

Approximate sizes (minified + gzip):

| File | Uncompressed | Gzipped |
|------|--------------|---------|
| vidply.esm.min.js | ~50 KB | ~15 KB |
| vidply.min.js | ~52 KB | ~16 KB |
| vidply.min.css | ~12 KB | ~3 KB |
| **Total** | ~62 KB | ~18 KB |

**Note:** Actual file sizes may vary depending on the version and features included. These are approximate values for the production builds.

## Build Scripts Explained

### build/build.js

Main JavaScript build script:
- Bundles all source files
- Creates ES Module and IIFE formats
- Generates both dev and production versions
- Adds license banner
- Creates source maps for debugging

### build/build-css.js

CSS build script:
- Copies unminified CSS to dist
- Minifies CSS for production
- Reports compression statistics
- Optimizes for performance

### build/watch.js

Development watch script:
- Monitors src/ for changes
- Auto-rebuilds on save
- Creates development builds with source maps
- Faster than full production build

### build/clean.js

Cleanup script:
- Removes dist/ directory
- Prepares for fresh build

## Customizing the Build

### Change Target Browsers

Edit `build/build.js`:

```javascript
target: ['es2020', 'chrome90', 'firefox88', 'safari14']
```

### Add Source Maps to Production

Edit `build/build.js`:

```javascript
{
  name: 'ESM Bundle (Minified)',
  sourcemap: true,  // Enable source maps
  minify: true
}
```

### Change Global Name

Edit `build/build.js`:

```javascript
{
  format: 'iife',
  globalName: 'MyPlayer',  // Change from VidPly
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

## Troubleshooting

### Build Fails

**Symptom:** Build command fails with errors

**Solutions:**
```bash
# 1. Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build

# 2. Check Node.js version (requires 18+)
node --version

# 3. Try using npx directly
npx esbuild src/index.js --bundle --outfile=dist/vidply.js
```

### Source Maps Not Working

**Symptom:** Unable to debug minified code in browser dev tools

**Solutions:**
1. Ensure source maps are enabled in build config (`build/build.js`)
2. Check browser dev tools are configured to load source maps
3. Verify `.map` files exist in `dist/` folder
4. Clear browser cache and reload

### Large Bundle Size

**Symptom:** Bundle size is larger than expected

**Explanation:**
The player includes:
- Complete UI controls with all buttons and menus
- Multiple renderers (HTML5, YouTube, Vimeo, HLS)
- i18n system with 5 built-in languages
- Full accessibility features (ARIA, keyboard navigation)
- Transcript, playlist, and sign language features

**Solutions:**
- The minified + gzipped size (~18 KB) is already optimized for production
- Modern browsers will cache the files after first load
- Consider using a CDN for better caching across sites
- For custom builds excluding unused features, modify `src/index.js` before building

### Permission Denied on Build Scripts

**Symptom:** `EACCES` or permission errors

**Solutions:**
```bash
# On Linux/macOS, ensure scripts have execute permission
chmod +x build/*.js

# Or run with node explicitly
node build/build.js
```

### Watch Mode Not Detecting Changes

**Symptom:** Files change but build doesn't trigger

**Solutions:**
1. Restart watch mode
2. Check if editor saves files properly (some editors use atomic writes)
3. Increase file watch timeout in `build/watch.js` if needed

### ESM Import Errors in Browser

**Symptom:** Browser console shows module import errors

**Solutions:**
1. Ensure you're using a local server (not `file://` protocol)
2. Check file paths are correct and relative to HTML file
3. Verify `<script type="module">` is set correctly
4. Check browser supports ES6 modules (Chrome 61+, Firefox 60+, Safari 11+)

## Development Workflow

1. **Make changes** to src/ files
2. **Run watch mode**: `npm run watch`
3. **Test in browser**: `npm run dev`
4. **View demo**: http://localhost:3000/demo/
5. **Build production**: `npm run build`

## Distribution

For production deployment, only include:
- `dist/vidply.esm.min.js` or `dist/vidply.min.js`
- `dist/vidply.min.css`

These are the only files users need.

## License

Built files include license banner automatically.

## Support

For build issues, check:
1. Node.js version (18+)
2. npm install completed successfully
3. No syntax errors in source files
4. Build scripts have execute permission

---

**Happy building!**

