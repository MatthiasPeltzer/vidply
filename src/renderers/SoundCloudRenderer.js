/**
 * SoundCloud Renderer
 * Uses SoundCloud Widget API for embedded track playback
 */

export class SoundCloudRenderer {
  constructor(player) {
    this.player = player;
    this.widget = null;
    this.trackUrl = null;
    this.isReady = false;
    this.iframe = null;
    this.iframeId = null;
  }

  async init() {
    // Extract track URL - use currentSource which works for external renderers
    this.trackUrl = this.player.currentSource || this.player.element.src || this.player.element.querySelector('source')?.src;
    
    if (!this.trackUrl || !this.isValidSoundCloudUrl(this.trackUrl)) {
      throw new Error('Invalid SoundCloud URL');
    }

    // Load SoundCloud Widget API
    await this.loadSoundCloudAPI();

    // Create iframe
    this.createIframe();

    // Initialize widget
    await this.initializeWidget();
  }

  /**
   * Validate SoundCloud URL
   * @param {string} url 
   * @returns {boolean}
   */
  isValidSoundCloudUrl(url) {
    return url.includes('soundcloud.com') || url.includes('api.soundcloud.com');
  }

  /**
   * Check if URL is a playlist/set
   */
  isPlaylist() {
    return this.trackUrl && this.trackUrl.includes('/sets/');
  }

  /**
   * Extract track/playlist info from URL for embed
   * SoundCloud URLs can be:
   * - https://soundcloud.com/artist/track
   * - https://soundcloud.com/artist/sets/playlist
   * - https://api.soundcloud.com/tracks/123456
   */
  getEmbedUrl() {
    // SoundCloud widget needs the track URL encoded
    const encodedUrl = encodeURIComponent(this.trackUrl);
    
    // Build widget URL with parameters
    const params = new URLSearchParams({
      url: this.trackUrl,
      auto_play: this.player.options.autoplay ? 'true' : 'false',
      hide_related: 'true',
      show_comments: 'false',
      show_user: 'true',
      show_reposts: 'false',
      show_teaser: 'false',
      visual: 'false', // Use classic player for better control
      color: '%23007bff'
    });
    
    return `https://w.soundcloud.com/player/?${params.toString()}`;
  }

  async loadSoundCloudAPI() {
    // Check if API is already loaded
    if (window.SC && window.SC.Widget) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.onload = () => {
        // Wait a bit for SC.Widget to be fully available
        setTimeout(() => {
          if (window.SC && window.SC.Widget) {
            resolve();
          } else {
            reject(new Error('SoundCloud Widget API not available'));
          }
        }, 100);
      };
      script.onerror = () => reject(new Error('Failed to load SoundCloud Widget API'));
      document.head.appendChild(script);
    });
  }

  createIframe() {
    // Hide original element and remove poster (SoundCloud has its own visual widget)
    this.player.element.style.display = 'none';
    this.player.element.removeAttribute('poster');
    
    // Remove poster overlay from video wrapper if present
    if (this.player.videoWrapper) {
      this.player.videoWrapper.classList.remove('vidply-forced-poster');
      this.player.videoWrapper.style.removeProperty('--vidply-poster-image');
    }

    // Generate unique ID for iframe
    this.iframeId = `soundcloud-player-${Math.random().toString(36).substr(2, 9)}`;

    // Create iframe for SoundCloud widget
    this.iframe = document.createElement('iframe');
    this.iframe.id = this.iframeId;
    this.iframe.scrolling = 'no';
    this.iframe.frameBorder = 'no';
    this.iframe.allow = 'autoplay';
    this.iframe.src = this.getEmbedUrl();
    this.iframe.style.width = '100%';
    this.iframe.style.display = 'block';
    
    // Use different aspect ratio for playlists vs single tracks
    // Playlists need more height to show the track list
    if (this.isPlaylist()) {
      this.iframe.style.aspectRatio = '16 / 9'; // More height for playlist
      this.iframe.classList.add('vidply-soundcloud-iframe', 'vidply-soundcloud-playlist');
    } else {
      this.iframe.style.aspectRatio = '16 / 3'; // Banner-like for single track
      this.iframe.classList.add('vidply-soundcloud-iframe');
    }
    this.iframe.style.maxHeight = '100%';
    
    this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
  }

  async initializeWidget() {
    return new Promise((resolve, reject) => {
      // Wait for iframe to load
      this.iframe.addEventListener('load', () => {
        try {
          this.widget = window.SC.Widget(this.iframe);
          
          this.widget.bind(window.SC.Widget.Events.READY, () => {
            this.isReady = true;
            this.attachEvents();
            
            // Hide VidPly controls - SoundCloud has its own
            if (this.player.container) {
              this.player.container.classList.add('vidply-external-controls');
            }
            
            // Get initial sound info
            this.widget.getCurrentSound((sound) => {
              if (sound) {
                this.player.state.duration = sound.duration / 1000; // Convert ms to seconds
                this.player.emit('loadedmetadata');
              }
            });
            
            resolve();
          });
          
          this.widget.bind(window.SC.Widget.Events.ERROR, (error) => {
            this.player.handleError(new Error(`SoundCloud error: ${error.message || 'Unknown error'}`));
          });
        } catch (error) {
          reject(error);
        }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('SoundCloud widget initialization timeout'));
        }
      }, 10000);
    });
  }

  attachEvents() {
    if (!this.widget) return;
    
    const Events = window.SC.Widget.Events;

    this.widget.bind(Events.PLAY, () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit('play');
      
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });

    this.widget.bind(Events.PAUSE, () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit('pause');
      
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });

    this.widget.bind(Events.FINISH, () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit('ended');
      
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
      
      if (this.player.options.loop) {
        this.seek(0);
        this.play();
      }
    });

    this.widget.bind(Events.PLAY_PROGRESS, (data) => {
      // data.currentPosition is in milliseconds
      const currentTime = data.currentPosition / 1000;
      this.player.state.currentTime = currentTime;
      this.player.emit('timeupdate', currentTime);
      
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, currentTime);
      }
    });

    this.widget.bind(Events.SEEK, (data) => {
      this.player.state.currentTime = data.currentPosition / 1000;
      this.player.emit('seeked');
    });

    this.widget.bind(Events.LOAD_PROGRESS, (data) => {
      // data.loadedProgress is 0-1
      if (this.player.state.duration) {
        const buffered = data.loadedProgress * this.player.state.duration;
        this.player.emit('progress', buffered);
      }
    });
  }

  play() {
    if (this.isReady && this.widget) {
      // Save scroll position to prevent browser from scrolling
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      this.widget.play();
      
      // Restore scroll position
      window.scrollTo(scrollX, scrollY);
    }
  }

  pause() {
    if (this.isReady && this.widget) {
      this.widget.pause();
    }
  }

  seek(time) {
    if (this.isReady && this.widget) {
      // SoundCloud seekTo uses milliseconds
      this.widget.seekTo(time * 1000);
      this.player.state.currentTime = time;
    }
  }

  setVolume(volume) {
    if (this.isReady && this.widget) {
      // SoundCloud setVolume expects 0-100
      this.widget.setVolume(volume * 100);
      this.player.state.volume = volume;
    }
  }

  setMuted(muted) {
    if (this.isReady && this.widget) {
      // SoundCloud doesn't have a native mute, use volume instead
      if (muted) {
        // Store current volume before muting
        this.widget.getVolume((vol) => {
          this._previousVolume = vol;
          this.widget.setVolume(0);
        });
      } else {
        this.widget.setVolume(this._previousVolume || 100);
      }
      this.player.state.muted = muted;
    }
  }

  setPlaybackSpeed(speed) {
    // SoundCloud Widget API doesn't support playback speed
    this.player.log('SoundCloud does not support playback speed control', 'warn');
  }

  /**
   * Get current track info
   * @returns {Promise<Object>}
   */
  getCurrentSound() {
    return new Promise((resolve) => {
      if (this.isReady && this.widget) {
        this.widget.getCurrentSound((sound) => {
          resolve(sound);
        });
      } else {
        resolve(null);
      }
    });
  }

  destroy() {
    // Unbind all events
    if (this.widget) {
      const Events = window.SC.Widget.Events;
      try {
        this.widget.unbind(Events.READY);
        this.widget.unbind(Events.PLAY);
        this.widget.unbind(Events.PAUSE);
        this.widget.unbind(Events.FINISH);
        this.widget.unbind(Events.PLAY_PROGRESS);
        this.widget.unbind(Events.SEEK);
        this.widget.unbind(Events.LOAD_PROGRESS);
        this.widget.unbind(Events.ERROR);
      } catch (e) {
        // Ignore unbind errors
      }
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    // Show original element
    if (this.player.element) {
      this.player.element.style.display = '';
    }

    this.widget = null;
    this.isReady = false;
  }
}

export default SoundCloudRenderer;

