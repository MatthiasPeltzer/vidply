# Keyboard Shortcuts

VidPly provides comprehensive keyboard navigation for accessibility and power users. All player controls can be accessed via keyboard shortcuts.

## Quick Reference

| Key | Action | Description |
|-----|--------|-------------|
| <kbd>Space</kbd>, <kbd>P</kbd>, <kbd>K</kbd> | Play/Pause | Toggle video playback |
| <kbd>M</kbd> | Mute/Unmute | Toggle audio mute with visual feedback |
| <kbd>F</kbd> | Fullscreen | Toggle fullscreen mode |
| <kbd>←</kbd> | Seek Backward | Skip backward 5 seconds |
| <kbd>→</kbd> | Seek Forward | Skip forward 5 seconds |
| <kbd>↑</kbd> | Volume Up | Increase volume by 5% |
| <kbd>↓</kbd> | Volume Down | Decrease volume by 5% |
| <kbd>C</kbd> | Captions Menu | Open captions/subtitles menu |
| <kbd>S</kbd> | Speed Menu | Open playback speed menu |
| <kbd>Q</kbd> | Quality Menu | Open quality selection menu |
| <kbd>J</kbd> | Chapters Menu | Open chapters menu |
| <kbd>A</kbd> | Caption Style Menu | Open caption styling options |
| <kbd>T</kbd> | Transcript | Toggle transcript panel |
| <kbd>&gt;</kbd> (Shift+.) | Speed Up | Increase playback speed by 0.25x |
| <kbd>&lt;</kbd> (Shift+,) | Speed Down | Decrease playback speed by 0.25x |
| <kbd>Esc</kbd> | Close | Close any open menu or exit fullscreen |

## Menu Navigation

When any menu is open (captions, speed, quality, chapters, or caption style), you can navigate using:

| Key | Action |
|-----|--------|
| <kbd>↓</kbd> / <kbd>↑</kbd> | Navigate between menu items |
| <kbd>Home</kbd> | Jump to first menu item |
| <kbd>End</kbd> | Jump to last menu item |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Select current menu item |
| <kbd>Esc</kbd> | Close menu |

## Detailed Controls

### Playback Controls

- **Play/Pause** (<kbd>Space</kbd>, <kbd>P</kbd>, <kbd>K</kbd>)  
  Toggles between play and pause states. Visual feedback shows the current state in the control bar.

- **Seek Backward** (<kbd>←</kbd>)  
  Skips backward 5 seconds in the video timeline.

- **Seek Forward** (<kbd>→</kbd>)  
  Skips forward 5 seconds in the video timeline.

### Audio Controls

- **Mute/Unmute** (<kbd>M</kbd>)  
  Toggles audio mute. The volume button icon changes to reflect the muted state.

- **Volume Up** (<kbd>↑</kbd>)  
  Increases volume by 5%. Maximum volume is 100%.

- **Volume Down** (<kbd>↓</kbd>)  
  Decreases volume by 5%. Minimum volume is 0%.

### Speed Controls

- **Speed Up** (<kbd>&gt;</kbd>)  
  Increases playback speed by 0.25x (e.g., 1.0x → 1.25x → 1.5x). Maximum speed is typically 2x.

- **Speed Down** (<kbd>&lt;</kbd>)  
  Decreases playback speed by 0.25x (e.g., 1.5x → 1.25x → 1.0x). Minimum speed is typically 0.25x.

- **Speed Menu** (<kbd>S</kbd>)  
  Opens the speed selection menu with preset speed options. The currently active speed is auto-focused.

### Caption Controls

- **Captions Menu** (<kbd>C</kbd>)  
  Opens the captions/subtitles menu to select or disable caption tracks. The active track is auto-focused.

- **Caption Style Menu** (<kbd>A</kbd>)  
  Opens the caption styling options (font size, color, background, etc.). The first style option is auto-focused.

### View Controls

- **Fullscreen** (<kbd>F</kbd>)  
  Toggles fullscreen mode. Press <kbd>F</kbd> or <kbd>Esc</kbd> to exit fullscreen.

- **Quality Menu** (<kbd>Q</kbd>)  
  Opens the quality selection menu for videos with multiple quality levels. The active quality is auto-focused.

- **Chapters Menu** (<kbd>J</kbd>)  
  Opens the chapters menu if the video has chapter markers. The active chapter is auto-focused.

- **Transcript Toggle** (<kbd>T</kbd>)  
  Shows or hides the interactive transcript panel (if available).

## Accessibility Features

### Auto-Focus
When opening any menu via keyboard shortcut, the currently active item (or first item) is automatically focused, allowing immediate navigation with arrow keys.

### Visual Feedback
All keyboard actions provide visual feedback:
- Volume and mute state update the volume icon
- Playback speed changes update the speed display
- Caption selection updates the captions button state
- All menu selections are immediately reflected in the UI

### Screen Reader Support
- All buttons have proper ARIA labels
- Volume sliders have `aria-valuenow` attributes
- Menu items are keyboard-navigable with proper focus management
- State changes are announced through visual updates

## Customization

Keyboard shortcuts can be customized when initializing the player:

```javascript
const player = new VidPly('#player', {
  keyboardShortcuts: {
    'play-pause': [' ', 'p'],  // Remove 'k' if desired
    'mute': ['m'],
    'fullscreen': ['f'],
    // ... customize other shortcuts
  }
});
```

To disable keyboard shortcuts entirely:

```javascript
const player = new VidPly('#player', {
  keyboardShortcuts: false
});
```

## Browser Compatibility

Keyboard shortcuts work in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Tips

1. **Focus Management**: Click on the player or press <kbd>Tab</kbd> to focus the player before using keyboard shortcuts.

2. **Menu Navigation**: All menus support full keyboard navigation. Use arrow keys to browse and <kbd>Enter</kbd> to select.

3. **Quick Access**: Press <kbd>S</kbd>, <kbd>Q</kbd>, <kbd>J</kbd>, or <kbd>A</kbd> to quickly access common menus without clicking.

4. **Transcript Integration**: Use <kbd>T</kbd> to toggle the transcript for an enhanced viewing experience with synchronized text.

5. **Multiple Keys**: Some actions (like play/pause) support multiple keys for convenience based on different video player conventions.

## Related Documentation

- [Getting Started Guide](./GETTING_STARTED.md)
- [Usage Guide](./USAGE.md)
- [Transcript Features](./TRANSCRIPT.md)
- [Playlist Features](./PLAYLIST.md)

