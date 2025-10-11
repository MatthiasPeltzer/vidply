/**
 * HLS Streaming Renderer
 * Uses hls.js for browsers that don't natively support HLS
 */

export class HLSRenderer {
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.hls = null;
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

    // Create hls.js instance with better error recovery
    this.hls = new window.Hls({
      debug: this.player.options.debug,
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

    // Load source - Get from attribute to avoid blob URL conversion
    let src;
    const sourceElement = this.player.element.querySelector('source');
    if (sourceElement) {
      // Use getAttribute to get the original URL, not the blob-converted one
      src = sourceElement.getAttribute('src');
    } else {
      // Fallback to element's src attribute
      src = this.player.element.getAttribute('src') || this.player.element.src;
    }
    
    this.player.log(`Loading HLS source: ${src}`, 'log');
    
    if (!src) {
      throw new Error('No HLS source found');
    }
    
    this.hls.loadSource(src);

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
    });

    this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
      this.player.log('HLS level switched to ' + data.level);
      this.player.emit('hlslevelswitched', data);
    });

    this.hls.on(window.Hls.Events.ERROR, (event, data) => {
      this.handleHlsError(data);
    });

    this.hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
      this.player.state.buffering = false;
    });
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

  play() {
    const promise = this.media.play();
    
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
      return this.hls.levels.map((level, index) => ({
        index,
        height: level.height,
        width: level.width,
        bitrate: level.bitrate,
        name: `${level.height}p`
      }));
    }
    return [];
  }

  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}

