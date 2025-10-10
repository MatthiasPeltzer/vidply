# Quality Button Feature

## Overview
The quality button (HD icon) automatically appears in the video player control bar when multiple quality levels are detected. It appears before the speed button.

## When Does the Quality Button Appear?

### 1. HLS Streams (.m3u8) - AUTOMATIC ✅
- **Trigger**: When HLS manifest is parsed and contains multiple quality levels
- **No special markup needed** - works automatically!
- **Auto Mode**: HLS streams support automatic quality switching based on bandwidth

### 2. HTML5 Multiple Sources - REQUIRES DATA ATTRIBUTES ⚠️
- **Trigger**: When 2+ `<source>` elements have `data-height` attributes
- **Required**: `data-height` attribute (e.g., `data-height="720"`)
- **Optional**: `data-width`, `data-quality`, or `label` attributes

## HTML5 Multi-Quality Setup

For HTML5 videos, you need to provide the same video at different quality levels:

```html
<video id="my-video">
  <!-- High Quality -->
  <source 
    src="video-1080p.mp4" 
    type="video/mp4"
    data-height="1080"
    data-width="1920"
    data-quality="1080p"
    label="1080p Full HD">
  
  <!-- Medium Quality -->
  <source 
    src="video-720p.mp4" 
    type="video/mp4"
    data-height="720"
    data-width="1280"
    data-quality="720p"
    label="720p HD">
  
  <!-- Low Quality -->
  <source 
    src="video-480p.mp4" 
    type="video/mp4"
    data-height="480"
    data-width="854"
    data-quality="480p"
    label="480p SD">
</video>

<script type="module">
  import Player from './vidply.esm.js';
  const player = new Player('#my-video');
  // Quality button appears automatically!
</script>
```

### Required Attributes
- `data-height` - **REQUIRED** - Height in pixels (e.g., `720`, `1080`)
- `data-width` - Optional - Width in pixels
- `data-quality` or `label` - Optional - Display name (e.g., "720p HD")

### Important Notes
1. **All sources should be the SAME video** at different resolutions
2. **At least 2 sources with data-height** are required
3. The quality button appears after metadata is loaded

## Testing

### Test Pages Created
1. **`demo/quality-demo.html`** - Main demonstration with examples
2. **`demo/quality-simple-test.html`** - Debug version with console logging
3. **`demo/quality-test.html`** - Comprehensive test suite
4. **`demo/hls-test.html`** - Existing HLS streaming test

### How to Test

1. **Start a local server** (required for HLS):
   ```bash
   cd /Users/matpeltz/Docker/vidply
   npx serve -p 3000
   ```

2. **Open test pages**:
   - http://localhost:3000/demo/quality-demo.html
   - http://localhost:3000/demo/hls-test.html

3. **Look for the HD button** in the control bar:
   - Should appear before the speed button
   - Shows current quality (e.g., "720p", "Auto")
   - Click to see quality menu

### Debugging

Open browser console to see debug messages:
```javascript
// Check if quality button exists
const btn = document.querySelector('.vidply-quality');
console.log('Quality button:', btn);

// Check available qualities
window.hlsPlayer.renderer.getQualities();

// Force check for quality button
window.hlsPlayer.controlBar.ensureQualityButton();
```

## Features

✅ **Dynamic Button Creation** - Appears after renderer is ready
✅ **Quality Indicator** - Shows current quality on button (e.g., "720p")
✅ **Active State** - Checkmark shows currently selected quality
✅ **Seamless Switching** - Preserves playback position when changing quality
✅ **Auto Mode (HLS)** - Adaptive bitrate for HLS streams
✅ **Keyboard Accessible** - Full keyboard navigation support
✅ **Mobile Friendly** - Touch-optimized menu

## Implementation Details

### Files Modified
- `src/renderers/HTML5Renderer.js` - Added quality detection and switching methods
- `src/controls/ControlBar.js` - Added dynamic quality button creation
- Built distribution files in `dist/`

### How It Works

1. **Initialization**:
   - Control bar checks for quality levels during creation
   - If not available initially, waits for `loadedmetadata` or `hlsmanifestparsed` events

2. **Dynamic Addition**:
   - `ensureQualityButton()` method adds button after renderer is ready
   - Inserts before speed button for consistent positioning

3. **Quality Detection**:
   - HLS: Uses hls.js levels array
   - HTML5: Scans `<source>` elements for `data-height` attributes

4. **Quality Switching**:
   - HLS: Changes hls.js current level (-1 for auto)
   - HTML5: Swaps video source, preserves time and playback state

## Troubleshooting

### Quality Button Not Appearing?

**For HLS Streams:**
1. Wait 2-3 seconds for manifest to parse
2. Check console for "HLS manifest parsed" message
3. Verify stream has multiple quality levels
4. Open http:// not file:// (HLS requires server)

**For HTML5 Multiple Sources:**
1. Verify `data-height` attribute on ALL sources
2. Need at least 2 sources with different heights
3. Check console: `player.renderer.getQualities()`
4. Should return array with quality objects

### Common Issues

❌ **Issue**: Button not showing for HTML5
✅ **Solution**: Add `data-height` attribute to source elements

❌ **Issue**: Only one source element
✅ **Solution**: Need 2+ sources for quality switching

❌ **Issue**: Different videos as sources
✅ **Solution**: All sources should be same video at different qualities

❌ **Issue**: Using file:// protocol for HLS
✅ **Solution**: Use http:// with local server

## API

### Get Available Qualities
```javascript
const qualities = player.renderer.getQualities();
// Returns: [{ index: 0, height: 720, width: 1280, name: "720p", src: "..." }, ...]
```

### Switch Quality
```javascript
// HLS: -1 for auto, or quality index
player.renderer.switchQuality(-1); // Auto mode
player.renderer.switchQuality(0);  // First quality

// HTML5: quality index only
player.renderer.switchQuality(0);
```

### Get Current Quality
```javascript
const currentIndex = player.renderer.getCurrentQuality();
```

### Events
```javascript
// Quality changed (HTML5)
player.on('qualitychange', (data) => {
  console.log('New quality:', data.quality, data.index);
});

// HLS level switched
player.on('hlslevelswitched', (data) => {
  console.log('HLS level:', data.level);
});

// HLS manifest parsed
player.on('hlsmanifestparsed', (data) => {
  console.log('Levels:', data.levels);
});
```

## Support

- ✅ HLS Streams (via hls.js)
- ✅ HTML5 Video with multiple sources
- ✅ Safari native HLS support
- ✅ Chrome, Firefox, Edge (via hls.js)
- ✅ Mobile browsers

## Next Steps

To use in your project:

1. **For HLS**: Just use `.m3u8` URL - quality button appears automatically
2. **For HTML5**: Add multiple sources with `data-height` attributes
3. **Build**: Run `npm run build` to update distribution files
4. **Test**: Open demo pages to verify functionality


