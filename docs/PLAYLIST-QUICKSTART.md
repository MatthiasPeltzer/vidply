# Playlist Quick Start Guide

## 1. Basic Audio Playlist (30 seconds)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="vidply.css">
</head>
<body>
  <div id="player"></div>

  <script type="module">
    import { Player, PlaylistManager } from 'vidply';

    // 1. Create player
    const player = new Player('#player');

    // 2. Create playlist
    const playlist = new PlaylistManager(player, {
      autoAdvance: true,
      showPanel: true
    });

    // 3. Load tracks
    playlist.loadPlaylist([
      { src: 'song1.mp3', type: 'audio/mp3', title: 'Song 1', artist: 'Artist 1' },
      { src: 'song2.mp3', type: 'audio/mp3', title: 'Song 2', artist: 'Artist 2' },
      { src: 'song3.mp3', type: 'audio/mp3', title: 'Song 3', artist: 'Artist 3' }
    ]);
  </script>
</body>
</html>
```

## 2. Playlist with Captions

```javascript
const tracks = [
  {
    src: 'song.mp3',
    type: 'audio/mp3',
    title: 'My Song',
    artist: 'My Artist',
    tracks: [
      { src: 'captions-en.vtt', kind: 'captions', srclang: 'en', label: 'English' },
      { src: 'captions-es.vtt', kind: 'captions', srclang: 'es', label: 'Español' }
    ]
  }
];
```

## 3. Programmatic Control

```javascript
// Navigate
playlist.next();              // Go to next track
playlist.previous();          // Go to previous track
playlist.play(2);             // Play track at index 2

// Check state
if (playlist.hasNext()) {
  console.log('Has next track');
}

// Get current
const track = playlist.getCurrentTrack();
console.log(track.title);

// Listen to changes
player.on('playlisttrackchange', (e) => {
  console.log('Now playing:', e.item.title);
});
```

## 4. Dynamic Playlist

```javascript
// Start with empty playlist
const playlist = new PlaylistManager(player);

// Add tracks dynamically
playlist.addItem({
  src: 'new-song.mp3',
  type: 'audio/mp3',
  title: 'New Song'
});

// Or reload entire playlist
playlist.loadPlaylist(newTracksArray);
```

## 5. Video Playlist

```javascript
// Create video player (note: mediaType: 'video')
const player = new Player('#video-player', {
  mediaType: 'video'
});

const playlist = new PlaylistManager(player, {
  autoAdvance: true,
  showPanel: true
});

const videoTracks = [
  {
    src: 'video1.mp4',
    type: 'video/mp4',
    title: 'Episode 1',
    poster: 'thumbnail1.jpg',
    tracks: [
      { src: 'video1-captions.vtt', kind: 'captions', srclang: 'en', label: 'English' },
      { src: 'video1-chapters.vtt', kind: 'chapters', srclang: 'en', label: 'Chapters' }
    ]
  },
  {
    src: 'video2.mp4',
    type: 'video/mp4',
    title: 'Episode 2',
    poster: 'thumbnail2.jpg'
  }
];

playlist.loadPlaylist(videoTracks);
```

## 6. Playlist Options

```javascript
const playlist = new PlaylistManager(player, {
  autoAdvance: true,   // Auto-play next track (default: true)
  loop: false,         // Loop playlist (default: false)
  showPanel: true      // Show playlist UI (default: true)
});
```

## 7. Hide Playlist Panel

```javascript
// Create without panel
const playlist = new PlaylistManager(player, {
  showPanel: false
});

// Or toggle it
playlist.togglePanel();
```

## 8. Keyboard Shortcuts

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' && e.shiftKey) {
    playlist.next();
  }
  if (e.key === 'ArrowLeft' && e.shiftKey) {
    playlist.previous();
  }
});
```

## 9. Custom Styling

```css
/* Track info */
.vidply-track-title {
  font-size: 20px;
  color: #ff6b6b;
}

/* Active playlist item */
.vidply-playlist-item-active {
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-left-color: #fff;
}

/* Playlist panel */
.vidply-playlist-panel {
  background: #1a1a2e;
  border: 2px solid #16213e;
}
```

## 10. Complete Minimal Example

```javascript
import { Player, PlaylistManager } from 'vidply';

const player = new Player('#player');
const playlist = new PlaylistManager(player);

playlist.loadPlaylist([
  { src: 'a.mp3', type: 'audio/mp3', title: 'Track A' },
  { src: 'b.mp3', type: 'audio/mp3', title: 'Track B' }
]);
```

That's it! 🎉

## Common Use Cases

### Music Player
```javascript
const musicPlayer = new PlaylistManager(player, {
  autoAdvance: true,
  loop: true,
  showPanel: true
});
```

### Podcast Playlist
```javascript
const podcast = new PlaylistManager(player, {
  autoAdvance: false,  // Manual navigation
  loop: false,
  showPanel: true
});
```

### Video Series (Netflix-style)
```javascript
const series = new PlaylistManager(player, {
  autoAdvance: true,   // Binge watching
  loop: false,
  showPanel: true
});
```

## Need Help?

- Full documentation: [PLAYLIST.md](./PLAYLIST.md)
- Live demos: 
  - [Audio Playlist](../demo/playlist-audio.html)
  - [Video Playlist](../demo/playlist-video.html)
- API reference: See PLAYLIST.md
