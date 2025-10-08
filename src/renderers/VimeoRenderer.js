/**
 * Vimeo Renderer
 */

export class VimeoRenderer {
  constructor(player) {
    this.player = player;
    this.vimeo = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }

  async init() {
    // Extract video ID from URL
    this.videoId = this.extractVideoId(this.player.element.src);
    
    if (!this.videoId) {
      throw new Error('Invalid Vimeo URL');
    }

    // Load Vimeo Player API
    await this.loadVimeoAPI();

    // Create iframe
    this.createIframe();

    // Initialize player
    await this.initializePlayer();
  }

  extractVideoId(url) {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/video\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  async loadVimeoAPI() {
    // Check if API is already loaded
    if (window.Vimeo && window.Vimeo.Player) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Vimeo API'));
      document.head.appendChild(script);
    });
  }

  createIframe() {
    // Hide original element
    this.player.element.style.display = 'none';

    // Create container for iframe
    this.iframe = document.createElement('div');
    this.iframe.id = `vimeo-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    
    this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
  }

  async initializePlayer() {
    const options = {
      id: this.videoId,
      width: '100%',
      height: '100%',
      controls: false,
      autoplay: this.player.options.autoplay,
      muted: this.player.options.muted,
      loop: this.player.options.loop,
      keyboard: false
    };

    if (this.player.options.startTime > 0) {
      options.startTime = this.player.options.startTime;
    }

    this.vimeo = new window.Vimeo.Player(this.iframe.id, options);

    // Wait for player to be ready
    await this.vimeo.ready();
    this.isReady = true;

    this.attachEvents();

    // Get initial duration
    try {
      const duration = await this.vimeo.getDuration();
      this.player.state.duration = duration;
      this.player.emit('loadedmetadata');
    } catch (error) {
      this.player.log('Error getting duration:', error, 'warn');
    }
  }

  attachEvents() {
    this.vimeo.on('play', () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit('play');
      
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });

    this.vimeo.on('pause', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit('pause');
      
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });

    this.vimeo.on('ended', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit('ended');
      
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
    });

    this.vimeo.on('timeupdate', (data) => {
      this.player.state.currentTime = data.seconds;
      this.player.state.duration = data.duration;
      this.player.emit('timeupdate', data.seconds);
      
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, data.seconds);
      }
    });

    this.vimeo.on('volumechange', (data) => {
      this.player.state.volume = data.volume;
      this.player.emit('volumechange', data.volume);
    });

    this.vimeo.on('bufferstart', () => {
      this.player.state.buffering = true;
      this.player.emit('waiting');
    });

    this.vimeo.on('bufferend', () => {
      this.player.state.buffering = false;
      this.player.emit('canplay');
    });

    this.vimeo.on('seeking', () => {
      this.player.state.seeking = true;
      this.player.emit('seeking');
    });

    this.vimeo.on('seeked', () => {
      this.player.state.seeking = false;
      this.player.emit('seeked');
    });

    this.vimeo.on('playbackratechange', (data) => {
      this.player.state.playbackSpeed = data.playbackRate;
      this.player.emit('ratechange', data.playbackRate);
    });

    this.vimeo.on('error', (error) => {
      this.player.handleError(new Error(`Vimeo error: ${error.message}`));
    });
  }

  play() {
    if (this.isReady && this.vimeo) {
      this.vimeo.play().catch(error => {
        this.player.log('Play error:', error, 'warn');
      });
    }
  }

  pause() {
    if (this.isReady && this.vimeo) {
      this.vimeo.pause().catch(error => {
        this.player.log('Pause error:', error, 'warn');
      });
    }
  }

  seek(time) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setCurrentTime(time).catch(error => {
        this.player.log('Seek error:', error, 'warn');
      });
    }
  }

  setVolume(volume) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setVolume(volume).catch(error => {
        this.player.log('Volume error:', error, 'warn');
      });
      this.player.state.volume = volume;
    }
  }

  setMuted(muted) {
    if (this.isReady && this.vimeo) {
      if (muted) {
        this.vimeo.setVolume(0);
      } else {
        this.vimeo.setVolume(this.player.state.volume);
      }
      this.player.state.muted = muted;
    }
  }

  setPlaybackSpeed(speed) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setPlaybackRate(speed).catch(error => {
        this.player.log('Playback rate error:', error, 'warn');
      });
      this.player.state.playbackSpeed = speed;
    }
  }

  destroy() {
    if (this.vimeo && this.vimeo.destroy) {
      this.vimeo.destroy();
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    // Show original element
    if (this.player.element) {
      this.player.element.style.display = '';
    }
  }
}

