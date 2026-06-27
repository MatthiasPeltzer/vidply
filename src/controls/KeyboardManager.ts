/**
 * Keyboard Accessibility Manager
 */

import { i18n } from '../i18n/i18n.js';
import { debounce } from '../utils/PerformanceUtils.js';
import type { Player } from '../core/Player.js';
import type { KeyboardShortcuts } from '../types/options.js';

export class KeyboardManager {
  player: Player;
  shortcuts: KeyboardShortcuts;
  private announcer: HTMLElement | null = null;
  // Announcements are driven by player state-change events so they fire for
  // mouse/touch control use too, not only keyboard shortcuts (WCAG 4.1.3).
  // Gated until 'ready' so initial volume/mute/source setup stays silent.
  private _announceReady = false;
  private _prevMuted: boolean;
  private _stateAnnouncers: Array<{ event: string; handler: (...args: unknown[]) => void }> = [];
  private _announceVolume: () => void;

  constructor(player: Player) {
    this.player = player;
    this.shortcuts = player.options.keyboardShortcuts;
    this._prevMuted = player.state.muted;
    // Volume slider drags emit a stream of volumechange events; debounce the
    // level announcement so AT hears the final value instead of every step.
    this._announceVolume = debounce(() => {
      const percent = Math.round(this.player.state.volume * 100);
      this.announce(i18n.t('player.volumePercent', { percent }));
    }, 500);

    this.init();
  }

  init() {
    this.attachEvents();
    this.attachStateAnnouncements();
  }

  /**
   * Subscribe to player state-change events so play/pause, mute, volume,
   * captions, fullscreen and speed changes are announced to assistive tech
   * regardless of whether the user used the keyboard, mouse or touch
   * (WCAG 4.1.3 Status Messages).
   */
  attachStateAnnouncements(): void {
    // Defensive: the player exposes an EventEmitter `on`/`off` API at runtime.
    if (typeof this.player.on !== 'function') return;

    const onReady = () => { this._announceReady = true; };
    this.player.on('ready', onReady);

    const register = (event: string, handler: () => void) => {
      const wrapped = () => { if (this._announceReady) handler(); };
      this.player.on(event as never, wrapped as never);
      this._stateAnnouncers.push({ event, handler: wrapped as (...args: unknown[]) => void });
    };

    // Track the 'ready' handler too so destroy() detaches it.
    this._stateAnnouncers.push({ event: 'ready', handler: onReady as (...args: unknown[]) => void });

    register('play', () => this.announce(i18n.t('player.playing')));
    register('pause', () => this.announce(i18n.t('player.paused')));
    register('captionsenabled', () => this.announce(i18n.t('player.captionsOn')));
    register('captionsdisabled', () => this.announce(i18n.t('player.captionsOff')));
    register('fullscreenchange', () => {
      this.announce(this.player.state.fullscreen
        ? i18n.t('player.fullscreen')
        : i18n.t('player.exitFullscreen'));
    });
    register('ratechange', () => {
      const rate = this.player.state.playbackSpeed;
      this.announce(i18n.t('player.speedRate', { rate: String(rate) }));
    });
    register('volumechange', () => {
      // Mute toggles are discrete and announced immediately; continuous
      // level changes are debounced via _announceVolume.
      if (this.player.state.muted !== this._prevMuted) {
        this._prevMuted = this.player.state.muted;
        this.announce(this.player.state.muted
          ? i18n.t('player.muted')
          : i18n.t('player.unmuted'));
        return;
      }
      if (!this.player.state.muted) {
        this._announceVolume();
      }
    });
  }

  attachEvents() {
    // Listen for keyboard events on the player container using CAPTURE phase
    // This ensures we intercept events before they reach child elements
    this.player.container.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeydown(e);
    }, true); // Use capture phase

    // Make player container focusable
    if (!this.player.container.hasAttribute('tabindex')) {
      this.player.container.setAttribute('tabindex', '0');
    }
  }

  handleKeydown(e: KeyboardEvent) {
    // Don't handle if target is an input element
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    
    // Don't handle if focus is inside a menu (let menu handle its own keyboard navigation)
    const activeElement = document.activeElement;
    if (activeElement) {
      const menu = activeElement.closest('.vidply-menu, [role="menu"]');
      if (menu) {
        return; // Let the menu handle keyboard events
      }
      
        // Don't handle if focus is on a playlist button (let playlist handle navigation)
        const playlistButton = activeElement.closest('.vidply-playlist-item-button');
        if (playlistButton) {
          return; // Let the playlist handle keyboard events
        }

      // Don't steal arrow keys when the sign-language overlay is in keyboard drag/resize mode.
      // DraggableResizable listens on the overlay itself, but we run in CAPTURE phase, so we must opt out here.
      const signWrapper = activeElement.closest('.vidply-sign-language-wrapper');
      if (signWrapper) {
        const draggable = this.player.signLanguageManager?.draggable;
        if (draggable?.keyboardDragMode || draggable?.keyboardResizeMode) {
          return;
        }
      }

      // Same idea for the transcript floating window (it also uses DraggableResizable).
      const transcriptWindow = activeElement.closest('.vidply-transcript-window');
      if (transcriptWindow) {
        const draggable = this.player.transcriptManager?.draggableResizable;
        if (draggable?.keyboardDragMode || draggable?.keyboardResizeMode) {
          return;
        }
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
      if ((keys as string[]).includes(key)) {
        handled = this.executeAction(action, e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          // Announcements are handled centrally by attachStateAnnouncements()
          // via player events, so they fire for pointer interactions too.
          break;
        }
      }
    }
    
    // Log unhandled keys for debugging (in development)
    if (!handled && this.player.options.debug) {
      console.log('[VidPly] Unhandled key:', e.key, 'code:', e.code, 'shiftKey:', e.shiftKey);
    }
  }

  executeAction(action: string, _event: KeyboardEvent): boolean {
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
        if (this.player.captionManager && this.player.captionManager.tracks.length > 1) {
          const captionsButton = this.player.controlBar?.controls.captions;
          if (captionsButton && this.player.controlBar) {
            this.player.controlBar.showCaptionsMenu(captionsButton);
          } else {
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

      case 'help':
        this.player.toggleKeyboardHelp();
        return true;

      default:
        return false;
    }
  }

  announceAction(action: string): void {
    if (!this.player.options.screenReaderAnnouncements) return;

    // Every announcement now goes through i18n.t so the screen-reader
    // hears the player's configured language instead of always English.
    // Missing keys fall back to the same English literal used previously,
    // so behavior is unchanged for unconfigured locales.
    let message = '';

    switch (action) {
      case 'play-pause':
        message = this.player.state.playing
          ? i18n.t('player.playing')
          : i18n.t('player.paused');
        break;
      case 'volume-up':
      case 'volume-down': {
        const percent = Math.round(this.player.state.volume * 100);
        message = i18n.t('player.volumePercent', { percent });
        break;
      }
      case 'mute':
        message = this.player.state.muted
          ? i18n.t('player.muted')
          : i18n.t('player.unmuted');
        break;
      case 'fullscreen':
        message = this.player.state.fullscreen
          ? i18n.t('player.fullscreen')
          : i18n.t('player.exitFullscreen');
        break;
      case 'captions':
        message = this.player.state.captionsEnabled
          ? i18n.t('player.captionsOn')
          : i18n.t('player.captionsOff');
        break;
      case 'speed-up':
      case 'speed-down': {
        const rate = this.player.state.playbackSpeed;
        message = i18n.t('player.speedRate', { rate: String(rate) });
        break;
      }
    }

    if (message) {
      this.announce(message);
    }
  }

  /**
   * Live-region announcer scoped to *this* player instance so multi-player
   * pages do not cross-talk through a shared `#vidply-announcer` id. The
   * region is appended to `document.body` so it is reachable regardless of
   * the embedding container's stacking / overflow context.
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer) {
      const id = `vidply-announcer-${this.player.instanceId}`;
      this.announcer = document.createElement('div');
      this.announcer.id = id;
      this.announcer.className = 'vidply-sr-only';
      this.announcer.setAttribute('aria-live', priority);
      this.announcer.setAttribute('aria-atomic', 'true');
      this.announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(this.announcer);
    } else {
      this.announcer.setAttribute('aria-live', priority);
    }

    this.announcer.textContent = '';
    const announcer = this.announcer;
    setTimeout(() => {
      if (announcer) announcer.textContent = message;
    }, 100);
  }

  updateShortcut(action: string, keys: string[]): void {
    if (Array.isArray(keys)) {
      (this.shortcuts as Record<string, string[]>)[action] = keys;
    }
  }

  destroy(): void {
    // Detach the player state-change listeners that drive announcements.
    if (typeof this.player.off === 'function') {
      for (const { event, handler } of this._stateAnnouncers) {
        this.player.off(event as never, handler as never);
      }
    }
    this._stateAnnouncers = [];

    // Container-attached keydown listener is removed when the container is
    // destroyed by Player.destroy(). The live-region announcer, however,
    // lives on `document.body` so we must remove it explicitly.
    if (this.announcer && this.announcer.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer);
    }
    this.announcer = null;
  }
}

