# VidPly Playlist Feature

The `PlaylistManager` allows you to create audio and video playlists with automatic track switching, navigation controls, and a visual playlist panel.

## Features

- **Previous/Next Track Navigation** - Skip between tracks with dedicated buttons
- **Auto-Advance** - Automatically play the next track when one finishes
- **Loop Mode** - Loop back to the first track after the last one
- **Track Info Display** - Shows current track number, title, and artist
- **Visual Playlist Panel** - Interactive list of all tracks with thumbnails
- **Active Track Highlighting** - Visual indicator for the currently playing track
- **Keyboard Support** - Navigate playlist items with keyboard
- **Custom Tracks** - Support for captions, chapters, and other text tracks per playlist item

## Installation

The `PlaylistManager` is included in the VidPly package:

```javascript
import { Player, PlaylistManager } from 'vidply';
```

## Basic Usage

```javascript
// Create a player
const player = new Player('#player-element', {
  autoplay: false,
  controls: true
});

// Create a playlist manager
const playlist = new PlaylistManager(player, {
  autoAdvance: true,  // Auto-play next track
  loop: false,        // Loop playlist
  showPanel: true     // Show playlist panel
});

// Load tracks
const tracks = [
  {
    src: 'audio/track1.mp3',
    type: 'audio/mp3',
    title: 'Track 1',
    artist: 'Artist Name'
  },
  {
    src: 'audio/track2.mp3',
    type: 'audio/mp3',
    title: 'Track 2',
    artist: 'Artist Name'
  }
];

playlist.loadPlaylist(tracks);
```

## Configuration Options

### PlaylistManager Options

```javascript
{
  autoAdvance: true,  // Automatically play next track when current ends
  loop: false,        // Loop back to first track after last
  showPanel: true     // Show visual playlist panel
}
```

### Track Object Structure

```javascript
{
  src: 'path/to/media.mp3',      // Required: Media URL
  type: 'audio/mp3',              // Required: MIME type
  title: 'Track Title',           // Optional: Track title
  artist: 'Artist Name',          // Optional: Artist name
  duration: 180,                  // Optional: Duration in seconds
  poster: 'path/to/thumbnail.jpg', // Optional: Thumbnail image
  tracks: [                       // Optional: Text tracks (captions, chapters)
    {
      src: 'captions.vtt',
      kind: 'captions',
      srclang: 'en',
      label: 'English'
    }
  ]
}
```

## API Methods

### loadPlaylist(items)
Load an array of track items into the playlist.

```javascript
playlist.loadPlaylist([
  { src: 'track1.mp3', type: 'audio/mp3', title: 'Track 1' },
  { src: 'track2.mp3', type: 'audio/mp3', title: 'Track 2' }
]);
```

### addItem(item)
Add a single track to the playlist.

```javascript
playlist.addItem({
  src: 'track3.mp3',
  type: 'audio/mp3',
  title: 'Track 3'
});
```

### play(index)
Play a specific track by index.

```javascript
playlist.play(2); // Play third track (0-based index)
```

### next()
Play the next track.

```javascript
playlist.next();
```

### previous()
Play the previous track.

```javascript
playlist.previous();
```

### hasNext()
Check if there's a next track.

```javascript
if (playlist.hasNext()) {
  playlist.next();
}
```

### hasPrevious()
Check if there's a previous track.

```javascript
if (playlist.hasPrevious()) {
  playlist.previous();
}
```

### getCurrentTrack()
Get the current track object.

```javascript
const track = playlist.getCurrentTrack();
console.log(track.title);
```

### togglePanel()
Toggle playlist panel visibility.

```javascript
playlist.togglePanel();
```

## Events

Listen to playlist events through the player:

```javascript
// Track change event
player.on('playlisttrackchange', (e) => {
  console.log('Now playing:', e.item.title);
  console.log('Track index:', e.index);
});
```

## UI Components

### Track Info Display

Appears above the controls, showing:
- Track number (e.g., "3 / 10")
- Track title
- Artist name (if provided)

### Playlist Panel

A scrollable list below the player showing:
- Track thumbnails (if provided)
- Track numbers
- Track titles and artists
- Track duration (if provided)
- Active track indicator

### Navigation Buttons

When a playlist is active:
- **Previous button** (⏮) - Replaces rewind button
- **Next button** (⏭) - Replaces forward button
- Buttons are disabled at playlist boundaries (unless loop is enabled)

## Complete Example

```javascript
import { Player, PlaylistManager } from 'vidply';

// Create player
const player = new Player('#audio-player', {
  autoplay: false,
  controls: true,
  preload: 'metadata'
});

// Create playlist
const playlist = new PlaylistManager(player, {
  autoAdvance: true,
  loop: false,
  showPanel: true
});

// Load tracks with captions and chapters
const tracks = [
  {
    src: 'media/song1.mp3',
    type: 'audio/mp3',
    title: 'Summer Vibes',
    artist: 'The Acoustic Project',
    duration: 245,
    poster: 'media/album-art-1.jpg',
    tracks: [
      {
        src: 'media/song1-captions-en.vtt',
        kind: 'captions',
        srclang: 'en',
        label: 'English'
      },
      {
        src: 'media/song1-chapters.vtt',
        kind: 'chapters',
        srclang: 'en',
        label: 'Chapters'
      }
    ]
  },
  {
    src: 'media/song2.mp3',
    type: 'audio/mp3',
    title: 'Midnight Jazz',
    artist: 'Blue Note Ensemble',
    duration: 198,
    poster: 'media/album-art-2.jpg'
  }
];

playlist.loadPlaylist(tracks);

// Listen for track changes
player.on('playlisttrackchange', (e) => {
  console.log(`Now playing: ${e.item.title} by ${e.item.artist}`);
  
  // Optional: Update document title
  document.title = `${e.item.title} - ${e.item.artist}`;
  
  // Optional: Update media session API
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: e.item.title,
      artist: e.item.artist,
      artwork: [{ src: e.item.poster }]
    });
  }
});

// Optional: Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return; // Don't interfere with form inputs
  }
  
  switch(e.key) {
    case 'ArrowLeft':
      if (e.shiftKey) {
        playlist.previous();
        e.preventDefault();
      }
      break;
    case 'ArrowRight':
      if (e.shiftKey) {
        playlist.next();
        e.preventDefault();
      }
      break;
    case 'p':
      playlist.togglePanel();
      break;
  }
});
```

## Styling

Customize the playlist appearance with CSS:

```css
/* Track info display */
.vidply-track-info {
  background: your-gradient;
  padding: 20px;
}

.vidply-track-title {
  font-size: 18px;
  color: #fff;
}

.vidply-track-artist {
  color: rgba(255, 255, 255, 0.8);
}

/* Playlist panel */
.vidply-playlist-panel {
  background: rgba(20, 20, 30, 0.95);
  max-height: 400px;
}

.vidply-playlist-item-active {
  background: rgba(59, 130, 246, 0.2);
  border-left-color: #3b82f6;
}

/* Custom hover effects */
.vidply-playlist-item:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

## Best Practices

1. **Preload Metadata**: Set `preload: 'metadata'` to load track durations without downloading full files
2. **Provide Thumbnails**: Add poster images for better visual presentation
3. **Include Duration**: Pre-calculate durations for better UX
4. **Use Consistent Naming**: Keep track object properties consistent across your playlist
5. **Handle Loading States**: Listen to `loadstart` and `canplay` events for loading indicators
6. **Accessibility**: Ensure track titles and artists are descriptive for screen readers

## Browser Support

The playlist feature works in all modern browsers that support:
- ES6 Modules
- HTML5 Media Elements
- WebVTT (for captions/chapters)

## Demos

See the complete demos:
- **Audio Playlist**: [demo/playlist-audio.html](../demo/playlist-audio.html)
- **Video Playlist**: [demo/playlist-video.html](../demo/playlist-video.html)

## Troubleshoads

### Tracks Don't Auto-Advance

Make sure `autoAdvance: true` is set in the playlist options and the media element is emitting the `ended` event.

### Previous/Next Buttons Not Showing

The buttons only appear when a `PlaylistManager` instance is attached to the player. Make sure you create the playlist manager before the controls are rendered, or call `player.renderControls()` after creating the playlist manager.

### Playlist Panel Not Visible

Check that `showPanel: true` is set in the playlist options. The panel is inserted after the player element in the DOM.

### Captions Don't Switch Between Tracks

Ensure the `tracks` array is included in each playlist item that has captions. The tracks will be reloaded when switching between playlist items.
