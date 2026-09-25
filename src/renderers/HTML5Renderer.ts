import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
import { isIOS } from '../utils/PerformanceUtils.js';

export class HTML5Renderer implements Renderer {
  readonly rendererType = 'html5' as const;
  player: Player;
  media: HTMLMediaElement;
  _didDeferredLoad: boolean;
  // All media listeners are registered with this controller's signal so a
  // single abort() in destroy() detaches every one of them. Avoids the leak
  // of removeEventListener being called with fresh, non-matching callbacks.
  private _listenerController: AbortController;

  constructor(player: Player) {
    this.player = player;
    this.media = player.element;
    this._didDeferredLoad = false;
    this._listenerController = new AbortController();
  }

  async init() {
    // Hide native controls
    this.media.controls = false;
    this.media.removeAttribute('controls');
    
    this.attachEvents();
    
    // Set preload + optionally defer network loading until user play
    if (this.player.options.deferLoad) {
      // Allow metadata preload while still avoiding full media download.
      // Note: browsers may still fetch metadata automatically when preload="metadata".
      this.media.preload = this.player.options.preload || 'none';
      
      // Firefox requires an explicit load() call to fetch metadata even with preload="metadata".
      // Only call load() if preload is set to "metadata" to ensure duration is available.
      // iOS Safari: skip load() here — it races with an in-flight user play() during
      // renderer init and resets WebKit into "gesture required", which breaks HLS/MP4
      // and audio on the first tap (infinite buffering spinner).
      if (this.player.options.preload === 'metadata' && !isIOS()) {
        this.media.load();
      }
    } else {
      this.media.preload = this.player.options.preload;
      // Load media (eager) — runs at page init, not inside a play() gesture on iOS.
      this.media.load();
    }
    
    // Show VidPly controls (remove external controls class if present)
    if (this.player.container) {
      this.player.container.classList.remove('vidply-external-controls');
    }
  }

  attachEvents() {
    const { signal } = this._listenerController;

    // Playback events
    this.media.addEventListener('loadedmetadata', () => {
      this.player.state.duration = this.media.duration;
      this.player.emit('loadedmetadata');
      
      // Auto-generate poster if none exists (for HTML5 video only)
      if (this.media.tagName === 'VIDEO') {
        this.player.autoGeneratePoster().catch((error: unknown) => {
          this.player.log('Failed to auto-generate poster:', error, 'warn');
        });
      }
    }, { signal });

    this.media.addEventListener('durationchange', () => {
      const duration = this.media.duration;
      if (duration && isFinite(duration) && duration > 0) {
        this.player.state.duration = duration;
        this.player.emit('durationchange', duration);
      }
    }, { signal });

    this.media.addEventListener('play', () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit('play');
      
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
      
      // Pause other players if enabled
      if (this.player.options.pauseOthersOnPlay) {
        this.pauseOtherPlayers();
      }
    }, { signal });

    this.media.addEventListener('pause', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit('pause');
      
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    }, { signal });

    this.media.addEventListener('ended', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit('ended');
      
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
      
      // Handle loop
      if (this.player.options.loop) {
        this.player.seek(0);
        this.player.play();
      }
    }, { signal });

    this.media.addEventListener('timeupdate', () => {
      this.player.state.currentTime = this.media.currentTime;
      this.player.emit('timeupdate', this.media.currentTime);
      
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
      }
    }, { signal });

    this.media.addEventListener('volumechange', () => {
      if (!this.player.shouldSyncVolumeFromMedia()) {
        return;
      }
      this.player.state.volume = this.media.volume;
      this.player.state.muted = this.media.muted;
      this.player.emit('volumechange', this.media.volume);
      
      if (this.player.options.onVolumeChange) {
        this.player.options.onVolumeChange.call(this.player, this.media.volume);
      }
    }, { signal });

    this.media.addEventListener('seeking', () => {
      this.player.state.seeking = true;
      this.player.emit('seeking');
    }, { signal });

    this.media.addEventListener('seeked', () => {
      this.player.state.seeking = false;
      this.player.emit('seeked');
    }, { signal });

    this.media.addEventListener('waiting', () => {
      this.player.state.buffering = true;
      this.player.emit('waiting');
    }, { signal });

    this.media.addEventListener('canplay', () => {
      this.player.state.buffering = false;
      this.player.emit('canplay');
    }, { signal });

    this.media.addEventListener('progress', () => {
      if (this.media.buffered.length > 0) {
        const buffered = this.media.buffered.end(this.media.buffered.length - 1);
        this.player.emit('progress', buffered);
      }
    }, { signal });

    this.media.addEventListener('error', (_e: Event) => {
      this.player.handleError(this.media.error);
    }, { signal });

    this.media.addEventListener('emptied', () => {
      this.player.syncPlaybackUiFromMediaElement?.();
    }, { signal });

    this.media.addEventListener('ratechange', () => {
      this.player.state.playbackSpeed = this.media.playbackRate;
      this.player.emit('ratechange', this.media.playbackRate);
    }, { signal });
  }

  pauseOtherPlayers() {
    // Pause other VidPly instances
    const allPlayers = document.querySelectorAll('.vidply-player');
    allPlayers.forEach(playerEl => {
      if (playerEl !== this.player.container) {
        const video = playerEl.querySelector('video, audio') as HTMLMediaElement | null;
        if (video && !video.paused) {
          video.pause();
        }
      }
    });
  }

  play() {
    // Deferred loading needs no explicit load() here: play() runs the resource
    // selection algorithm itself when the element is still NETWORK_EMPTY. On
    // iOS an extra load() is actively harmful — it resets the element into its
    // "gesture required" state, so the play() that follows inside the same tap
    // handler is rejected and the video never starts.
    if (this.player.options.deferLoad) {
      this._didDeferredLoad = true;
    }

    if (isIOS() && !this.media.currentSrc) {
      const fallback = this.player.currentSource;
      const hasSourceChild = Boolean(this.media.querySelector('source[src]'));
      if (fallback && !hasSourceChild) {
        this.media.src = fallback;
      }
    }

    const promise = this.media.play();

    if (promise !== undefined) {
      promise.catch(error => {
        this.player.state.buffering = false;
        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.emit('canplay');
        const err = error as { name?: string; message?: string };
        this.player.log(
          `Play failed: ${err.name ?? 'Error'} ${err.message ?? ''}`.trim(),
          'warn',
        );
        this.player.syncPlaybackUiFromMediaElement?.();

        // If autoplay failed, try muted autoplay
        if (this.player.options.autoplay && !this.player.state.muted) {
          this.player.log('Retrying play with muted audio', 'info');
          this.media.muted = true;
          this.media.play().catch(err => {
            this.player.handleError(err);
          });
        }
      });
      return promise;
    }
    return Promise.resolve();
  }

  /**
   * Ensure the media element has been loaded at least once (metadata/initial state)
   * without starting playback. Useful for playlists to behave like single videos.
   */
  ensureLoaded() {
    if (!this.player.options.deferLoad || this._didDeferredLoad) {
      return;
    }

    // Playlist selection (incl. iOS): fetch metadata/manifest without playback.
    // This is not a user play() tap — init() still skips load() on iOS so a
    // gesture-time play() is never preceded by load() in the same handler.
    // iOS Safari: programmatic load() without a user gesture poisons the next
    // Abspielen tap (deferLoad + preload metadata from TYPO3 playlists).
    if (isIOS()) {
      this._didDeferredLoad = true;
      return;
    }

    try {
      const hasSrc = Boolean(
        this.media.currentSrc ||
        this.media.getAttribute('src') ||
        this.media.src
      );
      if (hasSrc && this.media.readyState === 0) {
        this.media.load();
      }
    } catch {
      // ignore
    }
    this._didDeferredLoad = true;
  }

  pause() {
    this.media.pause();
  }

  seek(time: number) {
    this.media.currentTime = time;
  }

  setVolume(volume: number) {
    this.media.volume = volume;
  }

  setMuted(muted: boolean) {
    this.media.muted = muted;
  }

  setPlaybackSpeed(speed: number) {
    this.media.playbackRate = speed;
  }

  /**
   * Get available quality levels from source elements
   * @returns {Array} Array of quality objects with index, height, width, and src
   */
  getQualities() {
    const sources = Array.from(this.media.querySelectorAll('source'));
    
    if (sources.length <= 1) {
      return [];
    }

    return sources.map((source, index) => {
      // Extract quality from data-quality attribute (preferred, HTML5-valid)
      // Fallback to deprecated 'label' attribute for backward compatibility
      // Note: 'label' is not a valid HTML attribute on <source> elements
      const label = source.getAttribute('data-quality') || source.getAttribute('data-label') || source.getAttribute('label') || '';
      const height = source.getAttribute('data-height') || String(this.extractHeightFromLabel(label));
      const width = source.getAttribute('data-width') || '';
      
      return {
        index,
        height: height ? parseInt(height) : 0,
        width: width ? parseInt(width) : 0,
        src: source.src,
        type: source.type,
        name: label || (height ? `${height}p` : `Quality ${index + 1}`)
      };
    }).filter(q => q.height > 0); // Only return qualities with valid height
  }

  /**
   * Extract height from quality label (e.g., "1080p" -> 1080)
   * @param {string} label 
   * @returns {number}
   */
  extractHeightFromLabel(label: string) {
    const match = label.match(/(\d+)p/i);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  /**
   * Switch to a specific quality level
   * @param {number} qualityIndex - Index of the quality level (-1 for auto, not applicable for HTML5)
   */
  switchQuality(qualityIndex: number) {
    const qualities = this.getQualities();
    
    if (qualityIndex < 0 || qualityIndex >= qualities.length) {
      this.player.log('Invalid quality index', 'warn');
      return;
    }

    const quality = qualities[qualityIndex];
    if (!quality || !quality.src) {
      return;
    }
    const currentTime = this.media.currentTime;
    const wasPlaying = !this.media.paused;

    // Store the current source for comparison
    const currentSrc = this.media.currentSrc;
    
    // Don't switch if already at this quality
    if (currentSrc === quality.src) {
      this.player.log('Already at this quality level', 'info');
      return;
    }

    this.player.log(`Switching to quality: ${quality.name}`, 'info');

    // Update the src
    this.media.src = quality.src;
    
    // Wait for the new source to load, then restore playback state
    const onLoadedMetadata = () => {
      this.media.removeEventListener('loadedmetadata', onLoadedMetadata);
      
      // Restore playback position
      this.media.currentTime = currentTime;
      
      // Resume playback if it was playing
      if (wasPlaying) {
        this.media.play().catch(() => {
          this.player.log('Failed to resume playback after quality switch', 'warn');
        });
      }
      
      // Emit quality change event
      this.player.emit('qualitychange', { quality: quality.name, index: qualityIndex });
    };

    this.media.addEventListener('loadedmetadata', onLoadedMetadata);
    this.media.load();
  }

  /**
   * Get current quality index
   * @returns {number}
   */
  getCurrentQuality() {
    const qualities = this.getQualities();
    const currentSrc = this.media.currentSrc;
    
    for (let i = 0; i < qualities.length; i++) {
      if (qualities[i]?.src === currentSrc) {
        return i;
      }
    }
    
    return 0; // Default to first quality if not found
  }

  destroy() {
    // Detach every media listener registered in attachEvents() in one shot.
    this._listenerController.abort();
  }
}

