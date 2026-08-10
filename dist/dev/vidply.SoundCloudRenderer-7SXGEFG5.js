/*!
 * VidPly v1.2.6 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  loadScriptOnce
} from "./vidply.chunk-QWGAJFCY.js";

// src/renderers/SoundCloudRenderer.ts
var SoundCloudRenderer = class {
  rendererType = "soundcloud";
  player;
  media;
  widget;
  trackUrl;
  isReady;
  iframe;
  iframeId;
  _previousVolume;
  // Pending init timeout (rejects after 10s); cleared once READY fires or on
  // destroy so it can't reject / touch a torn-down player afterwards.
  _initTimeoutId;
  // Detaches the iframe 'load' listener on destroy.
  _initController;
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.widget = null;
    this.trackUrl = null;
    this.isReady = false;
    this.iframe = null;
    this.iframeId = null;
    this._previousVolume = 100;
    this._initTimeoutId = null;
    this._initController = null;
  }
  async init() {
    this.trackUrl = this.player.currentSource || this.player.element.src || this.player.element.querySelector("source")?.src || null;
    if (!this.trackUrl || !this.isValidSoundCloudUrl(this.trackUrl)) {
      throw new Error("Invalid SoundCloud URL");
    }
    await this.loadSoundCloudAPI();
    this.createIframe();
    await this.initializeWidget();
  }
  /**
   * Validate a SoundCloud URL by parsing it with the URL constructor and
   * checking the protocol + hostname against an explicit allow-list.
   * Substring checks like `url.includes('soundcloud.com')` accept things
   * like `https://evil.com/?leak=soundcloud.com` or
   * `https://soundcloud.com.attacker.example`.
   */
  isValidSoundCloudUrl(url) {
    if (typeof url !== "string" || !url) return false;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (parsed.protocol !== "https:") return false;
    const allowedHosts = /* @__PURE__ */ new Set([
      "soundcloud.com",
      "www.soundcloud.com",
      "m.soundcloud.com",
      "api.soundcloud.com",
      "api-v2.soundcloud.com"
    ]);
    return allowedHosts.has(parsed.hostname.toLowerCase());
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
    const trackUrl = this.trackUrl;
    if (!trackUrl) {
      throw new Error("SoundCloudRenderer.getEmbedUrl(): trackUrl is not set");
    }
    const params = new URLSearchParams({
      url: trackUrl,
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
    if (typeof window.SC !== "undefined") {
      return Promise.resolve();
    }
    return loadScriptOnce("https://w.soundcloud.com/player/api.js", {
      isReady: () => typeof window.SC !== "undefined"
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
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }
  async initializeWidget() {
    return new Promise((resolve, reject) => {
      const iframe = this.iframe;
      if (!iframe || typeof window.SC === "undefined") {
        reject(new Error("SoundCloud widget cannot initialize"));
        return;
      }
      const SC = window.SC;
      if (!SC) {
        reject(new Error("SoundCloud widget cannot initialize"));
        return;
      }
      this._initController = new AbortController();
      iframe.addEventListener("load", () => {
        try {
          const widget = SC.Widget(iframe);
          this.widget = widget;
          widget.bind(SC.Widget.Events.READY, () => {
            this.isReady = true;
            if (this._initTimeoutId !== null) {
              clearTimeout(this._initTimeoutId);
              this._initTimeoutId = null;
            }
            this.attachEvents();
            if (this.player.container) {
              this.player.container.classList.add("vidply-external-controls");
            }
            widget.getCurrentSound((sound) => {
              const info = sound;
              if (info) {
                this.player.state.duration = info.duration / 1e3;
                this.player.emit("loadedmetadata");
              }
            });
            resolve();
          });
          widget.bind(SC.Widget.Events.ERROR, (...args) => {
            const error = args[0];
            this.player.handleError(new Error(`SoundCloud error: ${error?.message || "Unknown error"}`));
          });
        } catch (error) {
          reject(error);
        }
      }, { signal: this._initController.signal });
      this._initTimeoutId = setTimeout(() => {
        this._initTimeoutId = null;
        if (!this.isReady) {
          reject(new Error("SoundCloud widget initialization timeout"));
        }
      }, 1e4);
    });
  }
  attachEvents() {
    const widget = this.widget;
    const SC = window.SC;
    if (!widget || !SC) return;
    const Events = SC.Widget.Events;
    widget.bind(Events.PLAY, () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit("play");
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });
    widget.bind(Events.PAUSE, () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit("pause");
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });
    widget.bind(Events.FINISH, () => {
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
    widget.bind(Events.PLAY_PROGRESS, (...args) => {
      const data = args[0];
      const currentTime = data.currentPosition / 1e3;
      this.player.state.currentTime = currentTime;
      this.player.emit("timeupdate", currentTime);
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, currentTime);
      }
    });
    widget.bind(Events.SEEK, (...args) => {
      const data = args[0];
      this.player.state.currentTime = data.currentPosition / 1e3;
      this.player.emit("seeked");
    });
    widget.bind(Events.LOAD_PROGRESS, (...args) => {
      const data = args[0];
      if (this.player.state.duration && data.loadedProgress !== void 0) {
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
    const widget = this.widget;
    if (this.isReady && widget) {
      if (muted) {
        widget.getVolume((vol) => {
          this._previousVolume = vol;
          widget.setVolume(0);
        });
      } else {
        widget.setVolume(this._previousVolume || 100);
      }
      this.player.state.muted = muted;
    }
  }
  setPlaybackSpeed(_speed) {
    this.player.log("SoundCloud does not support playback speed control", "warn");
  }
  /**
   * Get current track info. Returns the raw sound payload from the
   * SoundCloud Widget API (shape is best described as `unknown` since
   * the API exposes many optional fields we don't formally type).
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
    if (this._initTimeoutId !== null) {
      clearTimeout(this._initTimeoutId);
      this._initTimeoutId = null;
    }
    if (this._initController) {
      this._initController.abort();
      this._initController = null;
    }
    if (this.widget && window.SC) {
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
      } catch {
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
//# sourceMappingURL=vidply.SoundCloudRenderer-7SXGEFG5.js.map
