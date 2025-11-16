/**
 * Keyboard Accessibility Manager
 */

export class KeyboardManager {
  constructor(player) {
    this.player = player;
    this.shortcuts = player.options.keyboardShortcuts;
    
    this.init();
  }

  init() {
    this.attachEvents();
  }

  attachEvents() {
    // Listen for keyboard events on the player container
    this.player.container.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // Make player container focusable
    if (!this.player.container.hasAttribute('tabindex')) {
      this.player.container.setAttribute('tabindex', '0');
    }
  }

  handleKeydown(e) {
    // Don't handle if target is an input element
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    // Don't handle if focus is inside a menu (let menu handle its own keyboard navigation)
    const activeElement = document.activeElement;
    if (activeElement) {
      const menu = activeElement.closest('.vidply-menu, [role="menu"]');
      if (menu) {
        return; // Let the menu handle keyboard events
      }
    }

    const key = e.key;
    let handled = false;

    // Special handling for ESC key - exit fullscreen (especially for iOS pseudo-fullscreen)
    if (key === 'Escape' && this.player.state.fullscreen) {
      this.player.exitFullscreen();
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Check each shortcut category
    for (const [action, keys] of Object.entries(this.shortcuts)) {
      if (keys.includes(key)) {
        handled = this.executeAction(action, e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          this.announceAction(action);
          break;
        }
      }
    }
    
    // Log unhandled keys for debugging (in development)
    if (!handled && this.player.options.debug) {
      console.log('[VidPly] Unhandled key:', e.key, 'code:', e.code, 'shiftKey:', e.shiftKey);
    }
  }

  executeAction(action, event) {
    switch (action) {
      case 'play-pause':
        this.player.toggle();
        return true;

      case 'volume-up':
        this.player.setVolume(Math.min(1, this.player.state.volume + 0.1));
        return true;

      case 'volume-down':
        this.player.setVolume(Math.max(0, this.player.state.volume - 0.1));
        return true;

      case 'seek-forward':
        this.player.seekForward();
        return true;

      case 'seek-backward':
        this.player.seekBackward();
        return true;

      case 'mute':
        this.player.toggleMute();
        return true;

      case 'fullscreen':
        this.player.toggleFullscreen();
        return true;

      case 'captions':
        // If only one caption track, toggle on/off
        // If multiple tracks, open caption menu
        if (this.player.captionManager && this.player.captionManager.tracks.length > 1) {
          // Get captions button from control bar
          const captionsButton = this.player.controlBar && this.player.controlBar.controls.captions;
          if (captionsButton) {
            this.player.controlBar.showCaptionsMenu(captionsButton);
          } else {
            // Fallback to toggle if button doesn't exist
            this.player.toggleCaptions();
          }
        } else {
          this.player.toggleCaptions();
        }
        return true;

      case 'caption-style-menu':
        // Open caption style menu
        if (this.player.controlBar && this.player.controlBar.controls.captionStyle) {
          this.player.controlBar.showCaptionStyleMenu(this.player.controlBar.controls.captionStyle);
          return true;
        }
        return false;

      case 'speed-up':
        this.player.setPlaybackSpeed(
          Math.min(2, this.player.state.playbackSpeed + 0.25)
        );
        return true;

      case 'speed-down':
        this.player.setPlaybackSpeed(
          Math.max(0.25, this.player.state.playbackSpeed - 0.25)
        );
        return true;

      case 'speed-menu':
        // Open speed menu
        if (this.player.controlBar && this.player.controlBar.controls.speed) {
          this.player.controlBar.showSpeedMenu(this.player.controlBar.controls.speed);
          return true;
        }
        return false;

      case 'quality-menu':
        // Open quality menu
        if (this.player.controlBar && this.player.controlBar.controls.quality) {
          this.player.controlBar.showQualityMenu(this.player.controlBar.controls.quality);
          return true;
        }
        return false;

      case 'chapters-menu':
        // Open chapters menu
        if (this.player.controlBar && this.player.controlBar.controls.chapters) {
          this.player.controlBar.showChaptersMenu(this.player.controlBar.controls.chapters);
          return true;
        }
        return false;

      case 'transcript-toggle':
        // Toggle transcript
        if (this.player.transcriptManager) {
          this.player.transcriptManager.toggleTranscript();
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  announceAction(action) {
    if (!this.player.options.screenReaderAnnouncements) return;

    let message = '';

    switch (action) {
      case 'play-pause':
        message = this.player.state.playing ? 'Playing' : 'Paused';
        break;
      case 'volume-up':
        message = `Volume ${Math.round(this.player.state.volume * 100)}%`;
        break;
      case 'volume-down':
        message = `Volume ${Math.round(this.player.state.volume * 100)}%`;
        break;
      case 'mute':
        message = this.player.state.muted ? 'Muted' : 'Unmuted';
        break;
      case 'fullscreen':
        message = this.player.state.fullscreen ? 'Fullscreen' : 'Exit fullscreen';
        break;
      case 'captions':
        message = this.player.state.captionsEnabled ? 'Captions on' : 'Captions off';
        break;
      case 'speed-up':
      case 'speed-down':
        message = `Speed ${this.player.state.playbackSpeed}x`;
        break;
    }

    if (message) {
      this.announce(message);
    }
  }

  announce(message, priority = 'polite') {
    // Create or get announcement element
    let announcer = document.getElementById('vidply-announcer');
    
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'vidply-announcer';
      announcer.className = 'vidply-sr-only';
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(announcer);
    }

    // Clear and set new message
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }

  updateShortcut(action, keys) {
    if (Array.isArray(keys)) {
      this.shortcuts[action] = keys;
    }
  }

  destroy() {
    // Event listeners are automatically removed when the container is destroyed
  }
}

