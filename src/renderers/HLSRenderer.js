/**
 * HLS Streaming Renderer
 * Uses hls.js for browsers that don't natively support HLS
 */

export class HLSRenderer {
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.hls = null;
    this._hlsSourceLoaded = false;
    this._pendingSrc = null;
    this._hlsSubtitleTracksCount = undefined; // Reset on new instance
  }

  async init() {
    // Check if browser natively supports HLS (Safari)
    if (this.canPlayNatively()) {
      this.player.log('Using native HLS support');
      await this.initNative();
    } else {
      this.player.log('Using hls.js for HLS support');
      await this.initHlsJs();
    }
  }

  canPlayNatively() {
    // Only use native HLS on Safari/iOS where it actually works properly
    // Chrome reports it can play HLS but doesn't have proper quality switching
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (!isSafari && !isIOS) {
      // Force hls.js on non-Safari browsers for proper quality switching
      return false;
    }
    
    const video = document.createElement('video');
    return video.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  async initNative() {
    // Use HTML5 renderer for native HLS support
    const HTML5Renderer = (await import('./HTML5Renderer.js')).HTML5Renderer;
    const renderer = new HTML5Renderer(this.player);
    await renderer.init();
    
    // Copy methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(renderer)).forEach(method => {
      if (method !== 'constructor' && typeof renderer[method] === 'function') {
        this[method] = renderer[method].bind(renderer);
      }
    });
  }

  async initHlsJs() {
    // Hide native controls
    this.media.controls = false;
    this.media.removeAttribute('controls');
    
    // Load hls.js if not already loaded
    if (!window.Hls) {
      await this.loadHlsJs();
    }

    if (!window.Hls.isSupported()) {
      throw new Error('HLS is not supported in this browser');
    }

    // HTML5 spec: If video has src attribute, <source> children are not allowed.
    // hls.js sets a blob: URL on the src attribute, so we must remove any <source> elements
    // to maintain valid HTML. Store the original source URL first.
    const sourceElements = Array.from(this.media.querySelectorAll('source'));
    let originalSrc = null;
    if (sourceElements.length > 0) {
      originalSrc = sourceElements[0].getAttribute('src');
      sourceElements.forEach(source => source.remove());
      this.player.log('Removed <source> elements for HTML5 validity (hls.js uses src attribute)');
    }

    // Create hls.js instance with better error recovery
    this.hls = new window.Hls({
      debug: this.player.options.debug,
      // When deferLoad is enabled, do not start loading until the first play().
      autoStartLoad: !this.player.options.deferLoad,
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      // Network retry settings
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 4,
      manifestLoadingRetryDelay: 1000,
      manifestLoadingMaxRetryTimeout: 64000,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 4,
      levelLoadingRetryDelay: 1000,
      levelLoadingMaxRetryTimeout: 64000,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 64000
    });

    // Attach media element
    this.hls.attachMedia(this.media);

    // Load source - use currentSource for external renderers, or get from attribute
    // Priority: currentSource > originalSrc (from removed <source>) > data-vidply-src > src attribute
    let src = this.player.currentSource;
    
    if (!src && originalSrc) {
      src = originalSrc;
    }
    
    if (!src) {
      // Try data-vidply-src attribute (used by TYPO3 integration)
      src = this.player.element.getAttribute('data-vidply-src');
    }
    
    if (!src) {
      // Fallback to element's src attribute (but not blob: URLs)
      const elementSrc = this.player.element.getAttribute('src') || this.player.element.src;
      if (elementSrc && !elementSrc.startsWith('blob:')) {
        src = elementSrc;
      }
    }
    
    this.player.log(`Loading HLS source: ${src}`, 'log');
    
    if (!src) {
      throw new Error('No HLS source found');
    }
    
    if (this.player.options.deferLoad) {
      // Defer manifest/segment loading until first play()
      this._pendingSrc = src;
    } else {
      this.hls.loadSource(src);
      this._hlsSourceLoaded = true;
    }

    // Attach events
    this.attachHlsEvents();
    this.attachMediaEvents();
  }

  async loadHlsJs() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load hls.js'));
      document.head.appendChild(script);
    });
  }

  attachHlsEvents() {
    this.hls.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
      this.player.log('HLS manifest loaded, found ' + data.levels.length + ' quality levels');
      this.player.emit('hlsmanifestparsed', data);
      
      // Show VidPly controls (remove external controls class if present)
      if (this.player.container) {
        this.player.container.classList.remove('vidply-external-controls');
      }
      
      // Check for subtitle tracks after manifest parse
      // This handles streams without subtitles (SUBTITLE_TRACKS_UPDATED won't fire for them)
      setTimeout(() => {
        if (this._hlsSubtitleTracksCount === undefined || this._hlsSubtitleTracksCount === 0) {
          const currentCount = this.hls?.subtitleTracks?.length || 0;
          if (currentCount === 0) {
            this._hlsSubtitleTracksCount = 0;
            this.updateCaptionButtonsForHls();
          }
        }
      }, 500);
    });

    this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
      this.player.log('HLS level switched to ' + data.level);
      this.player.emit('hlslevelswitched', data);
    });

    // Handle HLS subtitle tracks
    this.hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
      this.player.log('HLS subtitle tracks updated, found ' + data.subtitleTracks.length + ' tracks');
      this.player.emit('hlssubtitletracksupdated', data);
      this._hlsSubtitleTracksCount = data.subtitleTracks.length;
      this.updateCaptionButtonsForHls();
    });

    this.hls.on(window.Hls.Events.SUBTITLE_TRACK_SWITCH, (event, data) => {
      this.player.log('HLS subtitle track switched to ' + data.id);
      this.player.emit('hlssubtitletrackswitch', data);
    });

    this.hls.on(window.Hls.Events.ERROR, (event, data) => {
      this.handleHlsError(data);
    });

    this.hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
      this.player.state.buffering = false;
    });
  }

  /**
   * Update caption buttons based on HLS subtitle tracks
   * Handles the case where control bar may not exist yet
   */
  updateCaptionButtonsForHls() {
    const tracksCount = this._hlsSubtitleTracksCount || 0;
    
    const doUpdate = () => {
      this.player.invalidateTrackCache();
      
      if (tracksCount > 0) {
        // HLS has subtitle tracks - refresh managers and add buttons
        if (this.player.captionManager) {
          this.player.captionManager.refreshTracks();
        }
        
        if (this.player.transcriptManager?.isVisible) {
          this.player.transcriptManager.loadTranscriptData();
          this.player.transcriptManager.updateLanguageSelector();
        }
        
        if (this.player.controlBar) {
          this.player.controlBar.ensureCaptionsButton();
          this.player.controlBar.ensureCaptionStyleButton();
          this.player.controlBar.ensureTranscriptButton();
        }
      } else {
        // No HLS subtitle tracks - clean up
        if (this.player.captionManager) {
          this.player.captionManager.refreshTracks();
        }
        
        if (this.player.transcriptManager?.isVisible) {
          this.player.transcriptManager.hideTranscript();
        }
        
        if (this.player.controlBar) {
          this.player.controlBar.removeHlsCaptionButtons(true);
        }
      }
    };
    
    if (this.player.controlBar) {
      doUpdate();
      return;
    }
    
    // Control bar doesn't exist yet - wait for ready event
    const onReady = () => {
      this.player.off('ready', onReady);
      doUpdate();
    };
    this.player.on('ready', onReady);
  }

  attachMediaEvents() {
    // Use same events as HTML5 renderer
    this.media.addEventListener('loadedmetadata', () => {
      this.player.state.duration = this.media.duration;
      this.player.emit('loadedmetadata');
    });

    this.media.addEventListener('play', () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit('play');
      
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });

    this.media.addEventListener('pause', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit('pause');
      
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });

    this.media.addEventListener('ended', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit('ended');
      
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
      
      if (this.player.options.loop) {
        this.player.seek(0);
        this.player.play();
      }
    });

    this.media.addEventListener('timeupdate', () => {
      this.player.state.currentTime = this.media.currentTime;
      this.player.emit('timeupdate', this.media.currentTime);
      
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
      }
    });

    this.media.addEventListener('volumechange', () => {
      this.player.state.volume = this.media.volume;
      this.player.state.muted = this.media.muted;
      this.player.emit('volumechange', this.media.volume);
    });

    this.media.addEventListener('waiting', () => {
      this.player.state.buffering = true;
      this.player.emit('waiting');
    });

    this.media.addEventListener('canplay', () => {
      this.player.state.buffering = false;
      this.player.emit('canplay');
    });

    this.media.addEventListener('error', () => {
      this.player.handleError(this.media.error);
    });
  }

  handleHlsError(data) {
    // Log detailed error info
    this.player.log(`HLS Error - Type: ${data.type}, Details: ${data.details}, Fatal: ${data.fatal}`, 'warn');
    if (data.response) {
      this.player.log(`Response code: ${data.response.code}, URL: ${data.response.url}`, 'warn');
    }
    
    if (data.fatal) {
      switch (data.type) {
        case window.Hls.ErrorTypes.NETWORK_ERROR:
          this.player.log('Fatal network error, trying to recover...', 'error');
          this.player.log(`Network error details: ${data.details}`, 'error');
          setTimeout(() => {
            this.hls.startLoad();
          }, 1000);
          break;
          
        case window.Hls.ErrorTypes.MEDIA_ERROR:
          this.player.log('Fatal media error, trying to recover...', 'error');
          this.hls.recoverMediaError();
          break;
          
        default:
          this.player.log('Fatal error, cannot recover', 'error');
          this.player.handleError(new Error(`HLS Error: ${data.type} - ${data.details}`));
          this.hls.destroy();
          break;
      }
    } else {
      this.player.log('Non-fatal HLS error: ' + data.details, 'warn');
    }
  }

  /**
   * Ensure the HLS manifest/initial loading is started without starting playback.
   * This makes playlist selection behave more like single-video initialization.
   */
  ensureLoaded() {
    if (!this.player.options.deferLoad) {
      return;
    }

    // Native HLS path delegates to HTML5Renderer; if we got here and have no hls.js instance,
    // there's nothing to do.
    if (!this.hls) {
      return;
    }

    if (this._hlsSourceLoaded) {
      return;
    }

    const src = this._pendingSrc || this.player._pendingSource || this.player.currentSource;
    if (!src) {
      return;
    }

    try {
      this.hls.loadSource(src);
      this._hlsSourceLoaded = true;
      // Start loading so manifest is parsed and levels/tracks become available.
      // Note: this may fetch initial fragments depending on stream/config.
      this.hls.startLoad();
    } catch (e) {
      // ignore
    }
  }

  play() {
    // Save scroll position to prevent browser from scrolling to video
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // If deferLoad is enabled, start HLS loading only on the first user play request.
    if (this.player.options.deferLoad && this.hls && !this._hlsSourceLoaded) {
      const src = this._pendingSrc || this.player.currentSource;
      if (src) {
        try {
          this.hls.loadSource(src);
          this.hls.startLoad();
          this._hlsSourceLoaded = true;
        } catch (e) {
          // ignore and let media.play() surface errors if any
        }
      }
    }
    
    const promise = this.media.play();
    
    // Restore scroll position immediately to prevent auto-scroll
    window.scrollTo(scrollX, scrollY);
    
    if (promise !== undefined) {
      promise.catch(error => {
        this.player.log('Play failed:', error, 'warn');
      });
    }
  }

  pause() {
    this.media.pause();
  }

  seek(time) {
    this.media.currentTime = time;
  }

  setVolume(volume) {
    this.media.volume = volume;
  }

  setMuted(muted) {
    this.media.muted = muted;
  }

  setPlaybackSpeed(speed) {
    this.media.playbackRate = speed;
  }

  switchQuality(levelIndex) {
    if (this.hls) {
      this.hls.currentLevel = levelIndex;
    }
  }

  getQualities() {
    if (this.hls && this.hls.levels) {
      return this.hls.levels.map((level, index) => {
        const height = Number(level.height) || 0;
        const bitrate = Number(level.bitrate) || 0;
        const kb = bitrate > 0 ? Math.round(bitrate / 1000) : 0;

        // Video HLS typically has height -> show "720p".
        // Audio-only HLS often has height=0 -> show bitrate label instead.
        const name = height > 0 ? `${height}p` : (kb > 0 ? `${kb} kb` : 'Auto');

        return {
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name
        };
      });
    }
    return [];
  }

  getCurrentQuality() {
    if (this.hls) {
      return this.hls.currentLevel;
    }
    return -1;
  }

  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}

