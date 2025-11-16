# <img src="../favicon.svg" width="32" alt="VidPly" /> Interactive Transcript Feature

VidPly includes a powerful interactive transcript feature that displays video captions/subtitles in a dedicated window, allowing users to read along, search, and jump to specific parts of the video.

## Features

- **Auto-Scrolling** - Transcript automatically highlights and scrolls to the current line
- **Click to Seek** - Click any transcript line to jump to that moment in the video
- **Draggable Window** - Position the transcript anywhere on screen (desktop only)
- **Resizable Window** - Adjust transcript window size with mouse or keyboard
- **Keyboard Drag Mode** - Use arrow keys to move the transcript window (D key to toggle)
- **Keyboard Resize Mode** - Use arrow keys to resize the transcript window (R key to toggle)
- **Settings Menu** - Configure drag and resize modes
- **Mobile Responsive** - Adapts to mobile screens (< 768px) with optimized layout
- **Fullscreen Support** - Transcript repositions intelligently in fullscreen mode
- **Search & Read** - Perfect for accessibility and language learning

## Quick Start

### Enable Transcript

```html
<video data-vidply data-transcript="true" data-transcript-button="true">
  <source src="video.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
</video>

<script type="module">
  import Player from './dist/vidply.esm.min.js';
</script>
```

That's it! The transcript button will appear in the control bar.

## Configuration Options

### Via JavaScript

```javascript
const player = new Player('#video', {
  transcript: true,              // Enable transcript feature
  transcriptButton: true,        // Show transcript button in controls
  transcriptPosition: 'external' // Position mode (currently only 'external')
});
```

### Via Data Attributes

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

## How It Works

The transcript feature automatically:
1. Detects caption/subtitle tracks in your video
2. Loads the VTT (WebVTT) cue text
3. Creates an interactive, scrollable window
4. Highlights the current line based on video playback time
5. Auto-scrolls to keep the current line visible

## API Methods

### Show/Hide Transcript

```javascript
const player = new Player('#video', {
  transcript: true,
  transcriptButton: true
});

// Show transcript window
player.transcriptManager.showTranscript();

// Hide transcript window
player.transcriptManager.hideTranscript();

// Toggle transcript visibility
player.transcriptManager.toggleTranscript();
```

### Check State

```javascript
// Check if transcript is visible
if (player.transcriptManager.isVisible) {
  console.log('Transcript is showing');
}
```

### Programmatic Control

```javascript
// Get transcript entries
console.log(player.transcriptManager.transcriptEntries);

// Get current active entry
console.log(player.transcriptManager.currentActiveEntry);
```

## User Interaction

### Click to Seek

Users can click any transcript line to jump to that moment:

```javascript
// This happens automatically, but you can listen for it
player.on('timeupdate', (time) => {
  console.log('User jumped to:', time);
});
```

### Drag & Resize Modes (Desktop)

On desktop (>= 768px), users can:

**Drag Mode:**
- **D Key** - Toggle keyboard drag mode
- **Arrow Keys** - Move window in 10px increments (Shift = 50px)
- **Mouse Drag** - Drag the transcript header to reposition
- **Home Key** - Reset to center position
- **Escape Key** - Exit drag mode

**Resize Mode:**
- **R Key** - Toggle keyboard resize mode
- **Arrow Keys** - Resize window in 10px increments (Shift = 50px)
- **Mouse Resize** - Drag resize handles at window edges
- **Escape Key** - Exit resize mode

**Settings Menu:**
- Click the settings icon (⚙️) in the transcript header
- Toggle drag mode and resize mode
- Close the transcript window

### Mobile Behavior

On mobile devices (< 768px):
- Transcript appears below the video player
- Positioned in document flow (not draggable or resizable)
- Optimized for scrolling and reading
- Min-width: 300px

## Positioning Modes

### Desktop (Non-Fullscreen)
- Appears next to the video player
- Draggable to any position
- Height matches video height

### Fullscreen Mode
- Positioned in bottom-right corner
- Floating over the video
- Leaves room for controls

### Mobile
- Below video and controls
- Full width
- Maximum height of 400px
- Part of page flow

## Keyboard Shortcuts

### Global Shortcuts (Player focused)

| Key | Action |
|-----|--------|
| <kbd>T</kbd> | Toggle transcript window |
| <kbd>D</kbd> | Toggle drag mode (when transcript visible) |
| <kbd>R</kbd> | Toggle resize mode (when transcript visible) |

### Drag Mode (D key - must be enabled first)

| Key | Action |
|-----|--------|
| <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> | Move window (10px) |
| <kbd>Shift</kbd> + <kbd>Arrow</kbd> | Move window (50px) |
| <kbd>Home</kbd> | Reset to center position |
| <kbd>Escape</kbd> | Exit drag mode |

### Resize Mode (R key - must be enabled first)

| Key | Action |
|-----|--------|
| <kbd>←</kbd> <kbd>→</kbd> | Adjust width (10px) |
| <kbd>↑</kbd> <kbd>↓</kbd> | Adjust height (10px) |
| <kbd>Shift</kbd> + <kbd>Arrow</kbd> | Adjust size (50px) |
| <kbd>Escape</kbd> | Exit resize mode |

### Transcript Entries

| Key | Action |
|-----|--------|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Jump to that time (when entry focused) |
| <kbd>Tab</kbd> | Navigate through transcript entries |

## Styling the Transcript

### Custom Colors

```css
/* Transcript window */
.vidply-transcript-window {
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Header */
.vidply-transcript-header {
  background: rgba(30, 30, 40, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Transcript entries */
.vidply-transcript-entry {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* Active entry */
.vidply-transcript-entry-active {
  background: rgba(59, 130, 246, 0.2);
  border-left: 3px solid #3b82f6;
}

/* Timestamp */
.vidply-transcript-time {
  color: #60a5fa;
  font-weight: 600;
}
```

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript Example</title>
  <link rel="stylesheet" href="dist/vidply.min.css">
  
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: #111;
      color: #fff;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      margin-bottom: 20px;
    }
    
    /* Custom transcript styling */
    .vidply-transcript-window {
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.98), rgba(20, 20, 40, 0.98));
      backdrop-filter: blur(10px);
    }
    
    .vidply-transcript-entry-active {
      background: linear-gradient(90deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Video with Interactive Transcript</h1>
    
    <video 
      id="my-video"
      data-vidply
      data-transcript="true"
      data-transcript-button="true"
      width="800" 
      height="450"
    >
      <source src="video.mp4" type="video/mp4">
      <track kind="captions" src="captions-en.vtt" srclang="en" label="English" default>
      <track kind="captions" src="captions-es.vtt" srclang="es" label="Español">
    </video>
    
    <div style="margin-top: 20px;">
      <button id="toggleTranscript">Toggle Transcript</button>
    </div>
  </div>

  <script type="module">
    import Player from './dist/vidply.esm.min.js';
    
    // Player is auto-initialized via data-vidply
    
    // Get player instance
    const videoElement = document.getElementById('my-video');
    const player = videoElement._vidplyPlayer; // Internal reference
    
    // Or find it manually
    const allPlayers = document.querySelectorAll('.vidply-player');
    // const player = allPlayers[0]._vidplyPlayer;
    
    // Manual toggle button
    document.getElementById('toggleTranscript').addEventListener('click', () => {
      if (player && player.transcriptManager) {
        player.transcriptManager.toggleTranscript();
      }
    });
    
    // Listen for transcript interactions
    document.addEventListener('DOMContentLoaded', () => {
      // Wait a moment for player to initialize
      setTimeout(() => {
        const container = document.querySelector('.vidply-player');
        if (container && container._vidplyPlayer) {
          const p = container._vidplyPlayer;
          
          p.on('timeupdate', (time) => {
            // User can see which line is active
            if (p.transcriptManager && p.transcriptManager.currentActiveEntry) {
              console.log('Active transcript:', p.transcriptManager.currentActiveEntry.cue.text);
            }
          });
        }
      }, 1000);
    });
  </script>
</body>
</html>
```

## Use Cases

### 1. Accessibility
- Screen reader users can read transcript text
- Deaf/hard-of-hearing users get full text access
- Users in noisy environments can read instead of listen

### 2. Language Learning
- Follow along with native speakers
- Click to replay difficult sections
- Read and listen simultaneously

### 3. Search & Navigation
- Quickly scan content
- Find specific topics
- Jump to relevant sections

### 4. Note Taking
- Reference exact quotes
- Copy text for citations
- Study aid for educational content

### 5. SEO & Searchability
- Video content becomes text-searchable
- Better accessibility indexing
- Improved content discovery

## Requirements

### Caption/Subtitle Track Required

The transcript feature requires at least one caption or subtitle track:

```html
<track kind="captions" src="captions.vtt" srclang="en" label="English">
<!-- or -->
<track kind="subtitles" src="subtitles.vtt" srclang="en" label="English">
```

**Note:** `kind="descriptions"` or `kind="chapters"` tracks are NOT used for transcripts.

### WebVTT Format

Captions must be in WebVTT format:

```
WEBVTT

00:00:00.000 --> 00:00:05.000
Welcome to this video tutorial.

00:00:05.000 --> 00:00:10.000
Today we'll learn about VidPly's transcript feature.

00:00:10.000 --> 00:00:15.000
It's a powerful tool for accessibility and learning.
```

## Browser Support

The transcript feature works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Troubleshooting

### Transcript Button Not Showing

**Cause:** No caption/subtitle tracks detected

**Solution:**
```html
<!-- Add at least one caption track -->
<track kind="captions" src="captions.vtt" srclang="en" label="English">
```

### Transcript Shows "Loading..."

**Cause:** VTT file taking time to load or wrong path

**Solutions:**
1. Check file path is correct
2. Check CORS headers if loading from different domain
3. Verify VTT file format is valid

### Can't Drag Transcript on Mobile

**Expected:** On mobile (< 640px), transcript is NOT draggable. It's positioned in the page flow below the video.

### Transcript Not Auto-Scrolling

**Cause:** JavaScript error or caption track not in `hidden` mode

**Solution:** Check browser console for errors. The transcript manager automatically sets track mode to `hidden`.

## Advanced: External Transcript Container

You can render the transcript in a custom container (future feature):

```javascript
const player = new Player('#video', {
  transcript: true,
  transcriptPosition: 'external',
  transcriptContainer: '#my-transcript-container'
});
```

```html
<div id="my-transcript-container"></div>
```

**Note:** This feature is partially implemented. Currently, transcript always appears next to or below the video.

## Performance Notes

- Transcript entries are created on-demand when transcript is first shown
- Auto-scrolling uses efficient `scrollIntoView` with `smooth` behavior
- Event listeners are cleaned up when transcript is destroyed
- No performance impact when transcript is not visible

## Accessibility Features

**Keyboard Accessible** - Full keyboard navigation  
**ARIA Labels** - Proper role and aria-label attributes  
**Focus Management** - Logical focus order  
**Screen Reader Friendly** - Semantic HTML structure  
**High Contrast** - Respects system color preferences  
**Touch Friendly** - Large touch targets (44px minimum)

## Best Practices

1. **Always provide captions** - Even auto-generated captions are better than none
2. **Use descriptive labels** - Help users identify track languages
3. **Test on mobile** - Ensure transcript is readable on small screens
4. **Consider positioning** - Transcript next to video works well on desktop
5. **Style consistently** - Match your site's design while maintaining readability

## Demo

See working examples:
- `demo/demo.html` - Basic transcript usage
- `demo/sign-language-demo.html` - Transcript with sign language video

---

**Built with Vanilla JavaScript** by Matthias Peltzer

