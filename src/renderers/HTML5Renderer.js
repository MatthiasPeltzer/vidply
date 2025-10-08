/**
 * HTML5 Media Renderer
 */

export class HTML5Renderer {
  constructor(player) {
    this.player = player;
    this.media = player.element;
  }

  async init() {
    this.attachEvents();
    
    // Set preload
    this.media.preload = this.player.options.preload;
    
    // Load media
    this.media.load();
  }

  attachEvents() {
    // Playback events
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
      
      // Pause other players if enabled
      if (this.player.options.pauseOthersOnPlay) {
        this.pauseOtherPlayers();
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
      
      // Handle loop
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
      
      if (this.player.options.onVolumeChange) {
        this.player.options.onVolumeChange.call(this.player, this.media.volume);
      }
    });

    this.media.addEventListener('seeking', () => {
      this.player.state.seeking = true;
      this.player.emit('seeking');
    });

    this.media.addEventListener('seeked', () => {
      this.player.state.seeking = false;
      this.player.emit('seeked');
    });

    this.media.addEventListener('waiting', () => {
      this.player.state.buffering = true;
      this.player.emit('waiting');
    });

    this.media.addEventListener('canplay', () => {
      this.player.state.buffering = false;
      this.player.emit('canplay');
    });

    this.media.addEventListener('progress', () => {
      if (this.media.buffered.length > 0) {
        const buffered = this.media.buffered.end(this.media.buffered.length - 1);
        this.player.emit('progress', buffered);
      }
    });

    this.media.addEventListener('error', (e) => {
      this.player.handleError(this.media.error);
    });

    this.media.addEventListener('ratechange', () => {
      this.player.state.playbackSpeed = this.media.playbackRate;
      this.player.emit('ratechange', this.media.playbackRate);
    });
  }

  pauseOtherPlayers() {
    // Pause other VidPly instances
    const allPlayers = document.querySelectorAll('.vidply-player');
    allPlayers.forEach(playerEl => {
      if (playerEl !== this.player.container) {
        const video = playerEl.querySelector('video, audio');
        if (video && !video.paused) {
          video.pause();
        }
      }
    });
  }

  play() {
    const promise = this.media.play();
    
    if (promise !== undefined) {
      promise.catch(error => {
        this.player.log('Play failed:', error, 'warn');
        
        // If autoplay failed, try muted autoplay
        if (this.player.options.autoplay && !this.player.state.muted) {
          this.player.log('Retrying play with muted audio', 'info');
          this.media.muted = true;
          this.media.play().catch(err => {
            this.player.handleError(err);
          });
        }
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

  destroy() {
    // Remove event listeners
    this.media.removeEventListener('loadedmetadata', () => {});
    this.media.removeEventListener('play', () => {});
    this.media.removeEventListener('pause', () => {});
    // ... (other listeners would be removed in a real implementation)
  }
}

