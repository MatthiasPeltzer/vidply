# Fullscreen Playlist Feature

## Overview

The playlist panel now displays intelligently in fullscreen mode, similar to YouTube's recommendations overlay. The playlist appears vertically above the controls and automatically shows/hides based on playback state.

## Behavior

### Fullscreen Mode
When in fullscreen:
- **Paused/Not Started**: Playlist panel is visible above the controls
- **Playing**: Playlist panel automatically hides to provide distraction-free viewing
- **Layout**: Vertical scrollable list positioned above control bar
- **Styling**: Semi-transparent backdrop with blur effect

### Normal Mode
When not in fullscreen:
- Original playlist panel behavior is maintained
- Positioned below the video as before
- Toggle button controls visibility

## Features

### Auto Show/Hide
The playlist automatically:
- Shows when you pause the video in fullscreen
- Shows when entering fullscreen (if video is paused)
- Hides when you start playing the video
- Transitions smoothly with fade effects

### Scrolling Support
- **Desktop**: Mouse wheel scrolling with visible scrollbar
- **Touch Devices**: Smooth touch scrolling and swiping
- **Mobile**: Optimized height to prevent covering too much video
- **Landscape**: Adjusted height for horizontal viewing

### Visual Design
- Semi-transparent dark background with backdrop blur
- Positioned above controls (bottom: 80px on desktop, 60px on mobile)
- Maximum height: 50% of viewport (adjusts for mobile/landscape)
- Smooth fade-in/fade-out transitions
- Enhanced hover effects for better visibility

## Responsive Behavior

### Desktop Fullscreen
- Max height: 50vh
- Bottom position: 80px (above controls)
- Large scrollbar for easy navigation

### Mobile Portrait Fullscreen
- Max height: 60vh (more space on mobile)
- Bottom position: 60px
- Touch-optimized scrolling

### Mobile Landscape Fullscreen  
- Max height: 45vh (less vertical space)
- Bottom position: 70px
- Compact playlist items

## Technical Details

### CSS Classes
- `.vidply-playlist-fullscreen-visible` - Applied when playlist should be visible in fullscreen
- Transitions: `opacity 0.3s ease, transform 0.3s ease`
- Z-index: 15 (above video layer, below controls)

### JavaScript Events
The playlist manager listens to:
- `play` - Hides playlist in fullscreen
- `pause` - Shows playlist in fullscreen
- `ended` - Shows playlist in fullscreen
- `enterfullscreen` - Updates visibility based on playback state
- `exitfullscreen` - Restores normal panel behavior

### Key Methods
- `handlePlaybackStateChange()` - Responds to play/pause events
- `handleFullscreenChange()` - Responds to fullscreen changes
- `updatePlaylistVisibilityInFullscreen()` - Controls panel visibility logic

## Usage

No configuration needed! The feature works automatically with any playlist:

```javascript
import { Player, PlaylistManager } from './dist/vidply.esm.js';

const player = new Player('#video-player', {
    mediaType: 'video'
});

const playlist = new PlaylistManager(player, {
    tracks: [
        { src: 'video1.mp4', title: 'Episode 1' },
        { src: 'video2.mp4', title: 'Episode 2' },
        { src: 'video3.mp4', title: 'Episode 3' }
    ]
});
```

## User Experience

### Typical Flow
1. User loads page with video playlist
2. User clicks fullscreen button
3. Playlist appears above controls (if video is paused)
4. User can click any video in the playlist
5. When video plays, playlist smoothly fades out
6. User pauses video → playlist fades back in
7. User exits fullscreen → playlist returns to normal position

### Benefits
- **Distraction-free playback** - Hidden during video playback
- **Easy navigation** - Quick access when paused
- **YouTube-familiar** - Users recognize this pattern
- **Touch-friendly** - Swipeable on mobile devices
- **Space-efficient** - Only appears when needed

## Browser Support

Works in all modern browsers:
- Chrome/Edge (full support)
- Firefox (full support)
- Safari (full support, including iOS)
- Opera (full support)

### Fallbacks
- iOS uses pseudo-fullscreen (native behavior)
- Touch scrolling enabled via `-webkit-overflow-scrolling: touch`
- Smooth scrolling with `scroll-behavior: smooth`

## Accessibility

The feature maintains full accessibility:
- Screen reader announcements preserved
- Keyboard navigation still works
- ARIA attributes maintained
- Focus management intact
- All original accessibility features retained

## Performance

Optimized for smooth performance:
- CSS transitions instead of JavaScript animations
- GPU-accelerated transforms
- Efficient event listeners
- No layout thrashing
- Smooth 60fps scrolling on touch devices

