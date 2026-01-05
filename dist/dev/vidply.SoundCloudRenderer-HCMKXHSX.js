/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/renderers/SoundCloudRenderer.js
var SoundCloudRenderer = class {
  constructor(player) {
    this.player = player;
    this.widget = null;
    this.trackUrl = null;
    this.isReady = false;
    this.iframe = null;
    this.iframeId = null;
  }
  async init() {
    this.trackUrl = this.player.currentSource || this.player.element.src || this.player.element.querySelector("source")?.src;
    if (!this.trackUrl || !this.isValidSoundCloudUrl(this.trackUrl)) {
      throw new Error("Invalid SoundCloud URL");
    }
    await this.loadSoundCloudAPI();
    this.createIframe();
    await this.initializeWidget();
  }
  /**
   * Validate SoundCloud URL
   * @param {string} url 
   * @returns {boolean}
   */
  isValidSoundCloudUrl(url) {
    return url.includes("soundcloud.com") || url.includes("api.soundcloud.com");
  }
  /**
   * Check if URL is a playlist/set
   */
  isPlaylist() {
    return this.trackUrl && this.trackUrl.includes("/sets/");
  }
  /**
   * Extract track/playlist info from URL for embed
   * SoundCloud URLs can be:
   * - https://soundcloud.com/artist/track
   * - https://soundcloud.com/artist/sets/playlist
   * - https://api.soundcloud.com/tracks/123456
   */
  getEmbedUrl() {
    const encodedUrl = encodeURIComponent(this.trackUrl);
    const params = new URLSearchParams({
      url: this.trackUrl,
      auto_play: this.player.options.autoplay ? "true" : "false",
      hide_related: "true",
      show_comments: "false",
      show_user: "true",
      show_reposts: "false",
      show_teaser: "false",
      visual: "false",
      // Use classic player for better control
      color: "%23007bff"
    });
    return `https://w.soundcloud.com/player/?${params.toString()}`;
  }
  async loadSoundCloudAPI() {
    if (window.SC && window.SC.Widget) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://w.soundcloud.com/player/api.js";
      script.onload = () => {
        setTimeout(() => {
          if (window.SC && window.SC.Widget) {
            resolve();
          } else {
            reject(new Error("SoundCloud Widget API not available"));
          }
        }, 100);
      };
      script.onerror = () => reject(new Error("Failed to load SoundCloud Widget API"));
      document.head.appendChild(script);
    });
  }
  createIframe() {
    this.player.element.style.display = "none";
    this.player.element.removeAttribute("poster");
    if (this.player.videoWrapper) {
      this.player.videoWrapper.classList.remove("vidply-forced-poster");
      this.player.videoWrapper.style.removeProperty("--vidply-poster-image");
    }
    this.iframeId = `soundcloud-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe = document.createElement("iframe");
    this.iframe.id = this.iframeId;
    this.iframe.scrolling = "no";
    this.iframe.frameBorder = "no";
    this.iframe.allow = "autoplay";
    this.iframe.src = this.getEmbedUrl();
    this.iframe.style.width = "100%";
    this.iframe.style.display = "block";
    if (this.isPlaylist()) {
      this.iframe.classList.add("vidply-soundcloud-iframe", "vidply-soundcloud-playlist");
    } else {
      this.iframe.classList.add("vidply-soundcloud-iframe");
    }
    this.iframe.style.maxHeight = "100%";
    this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
  }
  async initializeWidget() {
    return new Promise((resolve, reject) => {
      this.iframe.addEventListener("load", () => {
        try {
          this.widget = window.SC.Widget(this.iframe);
          this.widget.bind(window.SC.Widget.Events.READY, () => {
            this.isReady = true;
            this.attachEvents();
            if (this.player.container) {
              this.player.container.classList.add("vidply-external-controls");
            }
            this.widget.getCurrentSound((sound) => {
              if (sound) {
                this.player.state.duration = sound.duration / 1e3;
                this.player.emit("loadedmetadata");
              }
            });
            resolve();
          });
          this.widget.bind(window.SC.Widget.Events.ERROR, (error) => {
            this.player.handleError(new Error(`SoundCloud error: ${error.message || "Unknown error"}`));
          });
        } catch (error) {
          reject(error);
        }
      });
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error("SoundCloud widget initialization timeout"));
        }
      }, 1e4);
    });
  }
  attachEvents() {
    if (!this.widget) return;
    const Events = window.SC.Widget.Events;
    this.widget.bind(Events.PLAY, () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit("play");
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });
    this.widget.bind(Events.PAUSE, () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit("pause");
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });
    this.widget.bind(Events.FINISH, () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit("ended");
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
      if (this.player.options.loop) {
        this.seek(0);
        this.play();
      }
    });
    this.widget.bind(Events.PLAY_PROGRESS, (data) => {
      const currentTime = data.currentPosition / 1e3;
      this.player.state.currentTime = currentTime;
      this.player.emit("timeupdate", currentTime);
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, currentTime);
      }
    });
    this.widget.bind(Events.SEEK, (data) => {
      this.player.state.currentTime = data.currentPosition / 1e3;
      this.player.emit("seeked");
    });
    this.widget.bind(Events.LOAD_PROGRESS, (data) => {
      if (this.player.state.duration) {
        const buffered = data.loadedProgress * this.player.state.duration;
        this.player.emit("progress", buffered);
      }
    });
  }
  play() {
    if (this.isReady && this.widget) {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      this.widget.play();
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
      this.widget.seekTo(time * 1e3);
      this.player.state.currentTime = time;
    }
  }
  setVolume(volume) {
    if (this.isReady && this.widget) {
      this.widget.setVolume(volume * 100);
      this.player.state.volume = volume;
    }
  }
  setMuted(muted) {
    if (this.isReady && this.widget) {
      if (muted) {
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
    this.player.log("SoundCloud does not support playback speed control", "warn");
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
      }
    }
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    if (this.player.element) {
      this.player.element.style.display = "";
    }
    this.widget = null;
    this.isReady = false;
  }
};
var SoundCloudRenderer_default = SoundCloudRenderer;
export {
  SoundCloudRenderer,
  SoundCloudRenderer_default as default
};
//# sourceMappingURL=vidply.SoundCloudRenderer-HCMKXHSX.js.map
