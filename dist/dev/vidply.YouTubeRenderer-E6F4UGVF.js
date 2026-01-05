/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/renderers/YouTubeRenderer.js
var YouTubeRenderer = class {
  constructor(player) {
    this.player = player;
    this.youtube = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }
  async init() {
    const src = this.player.currentSource || this.player.element.src;
    this.videoId = this.extractVideoId(src);
    if (!this.videoId) {
      throw new Error("Invalid YouTube URL");
    }
    await this.loadYouTubeAPI();
    this.createIframe();
    await this.initializePlayer();
  }
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
  async loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      if (window.onYouTubeIframeAPIReady) {
        const originalCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          originalCallback();
          resolve();
        };
        return;
      }
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = () => {
        resolve();
      };
      tag.onerror = () => reject(new Error("Failed to load YouTube API"));
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });
  }
  createIframe() {
    this.player.element.style.display = "none";
    this.iframe = document.createElement("div");
    this.iframe.id = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe.style.width = "100%";
    this.iframe.style.maxHeight = "100%";
    this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
  }
  async initializePlayer() {
    return new Promise((resolve) => {
      this.youtube = new window.YT.Player(this.iframe.id, {
        videoId: this.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 1,
          // Use YouTube native controls
          disablekb: 0,
          // Allow keyboard controls
          fs: 1,
          // Allow fullscreen
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          autoplay: this.player.options.autoplay ? 1 : 0,
          mute: this.player.options.muted ? 1 : 0,
          start: this.player.options.startTime || 0
        },
        events: {
          onReady: (event) => {
            this.isReady = true;
            this.attachEvents();
            if (this.player.container) {
              this.player.container.classList.add("vidply-external-controls");
            }
            resolve();
          },
          onStateChange: (event) => this.handleStateChange(event),
          onError: (event) => this.handleError(event)
        }
      });
    });
  }
  attachEvents() {
    this.timeUpdateInterval = setInterval(() => {
      if (this.isReady && this.youtube) {
        const currentTime = this.youtube.getCurrentTime();
        const duration = this.youtube.getDuration();
        this.player.state.currentTime = currentTime;
        this.player.state.duration = duration;
        this.player.emit("timeupdate", currentTime);
      }
    }, 250);
    if (this.youtube.getDuration) {
      this.player.state.duration = this.youtube.getDuration();
      this.player.emit("loadedmetadata");
    }
  }
  handleStateChange(event) {
    const states = window.YT.PlayerState;
    switch (event.data) {
      case states.PLAYING:
        this.player.state.playing = true;
        this.player.state.paused = false;
        this.player.state.ended = false;
        this.player.state.buffering = false;
        this.player.emit("play");
        this.player.emit("playing");
        if (this.player.options.onPlay) {
          this.player.options.onPlay.call(this.player);
        }
        break;
      case states.PAUSED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.emit("pause");
        if (this.player.options.onPause) {
          this.player.options.onPause.call(this.player);
        }
        break;
      case states.ENDED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.state.ended = true;
        this.player.emit("ended");
        if (this.player.options.onEnded) {
          this.player.options.onEnded.call(this.player);
        }
        if (this.player.options.loop) {
          this.youtube.seekTo(0);
          this.youtube.playVideo();
        }
        break;
      case states.BUFFERING:
        this.player.state.buffering = true;
        this.player.emit("waiting");
        break;
      case states.CUED:
        this.player.emit("loadedmetadata");
        break;
    }
  }
  handleError(event) {
    const errors = {
      2: "Invalid video ID",
      5: "HTML5 player error",
      100: "Video not found",
      101: "Video not allowed to be played in embedded players",
      150: "Video not allowed to be played in embedded players"
    };
    const error = new Error(errors[event.data] || "YouTube player error");
    this.player.handleError(error);
  }
  play() {
    if (this.isReady && this.youtube) {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      this.youtube.playVideo();
      window.scrollTo(scrollX, scrollY);
    }
  }
  pause() {
    if (this.isReady && this.youtube) {
      this.youtube.pauseVideo();
    }
  }
  seek(time) {
    if (this.isReady && this.youtube) {
      this.youtube.seekTo(time, true);
    }
  }
  setVolume(volume) {
    if (this.isReady && this.youtube) {
      this.youtube.setVolume(volume * 100);
      this.player.state.volume = volume;
    }
  }
  setMuted(muted) {
    if (this.isReady && this.youtube) {
      if (muted) {
        this.youtube.mute();
      } else {
        this.youtube.unMute();
      }
      this.player.state.muted = muted;
    }
  }
  setPlaybackSpeed(speed) {
    if (this.isReady && this.youtube) {
      this.youtube.setPlaybackRate(speed);
      this.player.state.playbackSpeed = speed;
    }
  }
  destroy() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    if (this.youtube && this.youtube.destroy) {
      this.youtube.destroy();
    }
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    if (this.player.element) {
      this.player.element.style.display = "";
    }
  }
};
export {
  YouTubeRenderer
};
//# sourceMappingURL=vidply.YouTubeRenderer-E6F4UGVF.js.map
