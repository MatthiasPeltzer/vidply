/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/renderers/HLSRenderer.js
var HLSRenderer = class {
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.hls = null;
    this._hlsSourceLoaded = false;
    this._pendingSrc = null;
    this._hlsSubtitleTracksCount = void 0;
  }
  async init() {
    if (this.canPlayNatively()) {
      this.player.log("Using native HLS support");
      await this.initNative();
    } else {
      this.player.log("Using hls.js for HLS support");
      await this.initHlsJs();
    }
  }
  canPlayNatively() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isIPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    if (!isIOS && !isIPadDesktopMode) {
      return false;
    }
    const video = document.createElement("video");
    return video.canPlayType("application/vnd.apple.mpegurl") !== "";
  }
  async initNative() {
    const HTML5Renderer = (await import("./vidply.HTML5Renderer-Z6XYGT4E.js")).HTML5Renderer;
    const renderer = new HTML5Renderer(this.player);
    await renderer.init();
    Object.getOwnPropertyNames(Object.getPrototypeOf(renderer)).forEach((method) => {
      if (method !== "constructor" && typeof renderer[method] === "function") {
        this[method] = renderer[method].bind(renderer);
      }
    });
    this._attachNativeTextTrackListeners();
    const html5Destroy = this.destroy;
    this.destroy = () => {
      this._cleanupNativeTextTrackListeners();
      html5Destroy();
    };
  }
  /**
   * Listen for HLS-exposed text tracks so captions/transcript buttons appear on native HLS.
   * Debounces rapid addtrack bursts (one per subtitle rendition in the manifest).
   */
  _attachNativeTextTrackListeners() {
    let debounceTimer = null;
    const checkTracks = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this._nativeTrackListenersDestroyed) return;
        const tracks = this.media.textTracks;
        let count = 0;
        for (let i = 0; i < tracks.length; i++) {
          const k = tracks[i].kind;
          if (k === "subtitles" || k === "captions") {
            count++;
          }
        }
        this._hlsSubtitleTracksCount = count;
        this.updateCaptionButtonsForHls();
      }, 150);
    };
    this.media.textTracks.addEventListener("addtrack", checkTracks);
    this.media.textTracks.addEventListener("removetrack", checkTracks);
    this.media.addEventListener("loadedmetadata", checkTracks);
    this._cleanupNativeTextTrackListeners = () => {
      this._nativeTrackListenersDestroyed = true;
      clearTimeout(debounceTimer);
      this.media.textTracks.removeEventListener("addtrack", checkTracks);
      this.media.textTracks.removeEventListener("removetrack", checkTracks);
      this.media.removeEventListener("loadedmetadata", checkTracks);
    };
  }
  async initHlsJs() {
    this.media.controls = false;
    this.media.removeAttribute("controls");
    if (!window.Hls) {
      await this.loadHlsJs();
    }
    if (!window.Hls.isSupported()) {
      throw new Error("HLS is not supported in this browser");
    }
    const sourceElements = Array.from(this.media.querySelectorAll("source"));
    let originalSrc = null;
    if (sourceElements.length > 0) {
      originalSrc = sourceElements[0].getAttribute("src");
      sourceElements.forEach((source) => source.remove());
      this.player.log("Removed <source> elements for HTML5 validity (hls.js uses src attribute)");
    }
    this.hls = new window.Hls({
      debug: this.player.options.debug,
      // When deferLoad is enabled, do not start loading until the first play().
      autoStartLoad: !this.player.options.deferLoad,
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      maxBufferSize: 60 * 1e3 * 1e3,
      maxBufferHole: 0.5,
      // Network retry settings
      manifestLoadingTimeOut: 1e4,
      manifestLoadingMaxRetry: 4,
      manifestLoadingRetryDelay: 1e3,
      manifestLoadingMaxRetryTimeout: 64e3,
      levelLoadingTimeOut: 1e4,
      levelLoadingMaxRetry: 4,
      levelLoadingRetryDelay: 1e3,
      levelLoadingMaxRetryTimeout: 64e3,
      fragLoadingTimeOut: 2e4,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1e3,
      fragLoadingMaxRetryTimeout: 64e3
    });
    this.hls.attachMedia(this.media);
    let src = this.player.currentSource;
    if (!src && originalSrc) {
      src = originalSrc;
    }
    if (!src) {
      src = this.player.element.getAttribute("data-vidply-src");
    }
    if (!src) {
      const elementSrc = this.player.element.getAttribute("src") || this.player.element.src;
      if (elementSrc && !elementSrc.startsWith("blob:")) {
        src = elementSrc;
      }
    }
    this.player.log(`Loading HLS source: ${src}`, "log");
    if (!src) {
      throw new Error("No HLS source found");
    }
    if (this.player.options.deferLoad) {
      this._pendingSrc = src;
    } else {
      this.hls.loadSource(src);
      this._hlsSourceLoaded = true;
    }
    this.attachHlsEvents();
    this.attachMediaEvents();
  }
  async loadHlsJs() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load hls.js"));
      document.head.appendChild(script);
    });
  }
  attachHlsEvents() {
    this.hls.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
      this.player.log("HLS manifest loaded, found " + data.levels.length + " quality levels");
      this.player.emit("hlsmanifestparsed", data);
      if (this.player.container) {
        this.player.container.classList.remove("vidply-external-controls");
      }
      setTimeout(() => {
        if (this._hlsSubtitleTracksCount === void 0 || this._hlsSubtitleTracksCount === 0) {
          const currentCount = this.hls?.subtitleTracks?.length || 0;
          if (currentCount === 0) {
            this._hlsSubtitleTracksCount = 0;
            this.updateCaptionButtonsForHls();
          }
        }
      }, 500);
    });
    this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
      this.player.log("HLS level switched to " + data.level);
      this.player.emit("hlslevelswitched", data);
    });
    this.hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
      this.player.log("HLS subtitle tracks updated, found " + data.subtitleTracks.length + " tracks");
      this.player.emit("hlssubtitletracksupdated", data);
      this._hlsSubtitleTracksCount = data.subtitleTracks.length;
      this.updateCaptionButtonsForHls();
    });
    this.hls.on(window.Hls.Events.SUBTITLE_TRACK_SWITCH, (event, data) => {
      this.player.log("HLS subtitle track switched to " + data.id);
      this.player.emit("hlssubtitletrackswitch", data);
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
    const onReady = () => {
      this.player.off("ready", onReady);
      doUpdate();
    };
    this.player.on("ready", onReady);
  }
  attachMediaEvents() {
    this.media.addEventListener("loadedmetadata", () => {
      this.player.state.duration = this.media.duration;
      this.player.emit("loadedmetadata");
    });
    this.media.addEventListener("durationchange", () => {
      const duration = this.media.duration;
      if (duration && isFinite(duration) && duration > 0) {
        this.player.state.duration = duration;
        this.player.emit("durationchange", duration);
      }
    });
    this.media.addEventListener("play", () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit("play");
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });
    this.media.addEventListener("pause", () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit("pause");
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });
    this.media.addEventListener("ended", () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit("ended");
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
      if (this.player.options.loop) {
        this.player.seek(0);
        this.player.play();
      }
    });
    this.media.addEventListener("timeupdate", () => {
      this.player.state.currentTime = this.media.currentTime;
      this.player.emit("timeupdate", this.media.currentTime);
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
      }
    });
    this.media.addEventListener("volumechange", () => {
      this.player.state.volume = this.media.volume;
      this.player.state.muted = this.media.muted;
      this.player.emit("volumechange", this.media.volume);
    });
    this.media.addEventListener("waiting", () => {
      this.player.state.buffering = true;
      this.player.emit("waiting");
    });
    this.media.addEventListener("canplay", () => {
      this.player.state.buffering = false;
      this.player.emit("canplay");
    });
    this.media.addEventListener("error", () => {
      this.player.handleError(this.media.error);
    });
  }
  handleHlsError(data) {
    this.player.log(`HLS Error - Type: ${data.type}, Details: ${data.details}, Fatal: ${data.fatal}`, "warn");
    if (data.response) {
      this.player.log(`Response code: ${data.response.code}, URL: ${data.response.url}`, "warn");
    }
    if (data.fatal) {
      switch (data.type) {
        case window.Hls.ErrorTypes.NETWORK_ERROR:
          this.player.log("Fatal network error, trying to recover...", "error");
          this.player.log(`Network error details: ${data.details}`, "error");
          setTimeout(() => {
            this.hls.startLoad();
          }, 1e3);
          break;
        case window.Hls.ErrorTypes.MEDIA_ERROR:
          this.player.log("Fatal media error, trying to recover...", "error");
          this.hls.recoverMediaError();
          break;
        default:
          this.player.log("Fatal error, cannot recover", "error");
          this.player.handleError(new Error(`HLS Error: ${data.type} - ${data.details}`));
          this.hls.destroy();
          break;
      }
    } else {
      this.player.log("Non-fatal HLS error: " + data.details, "warn");
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
      this.hls.startLoad();
    } catch (e) {
    }
  }
  play() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (this.player.options.deferLoad && this.hls && !this._hlsSourceLoaded) {
      const src = this._pendingSrc || this.player.currentSource;
      if (src) {
        try {
          this.hls.loadSource(src);
          this.hls.startLoad();
          this._hlsSourceLoaded = true;
        } catch (e) {
        }
      }
    }
    const promise = this.media.play();
    window.scrollTo(scrollX, scrollY);
    if (promise !== void 0) {
      promise.catch((error) => {
        this.player.log("Play failed:", error, "warn");
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
      const byHeight = /* @__PURE__ */ new Map();
      this.hls.levels.forEach((level, index) => {
        const height = Number(level.height) || 0;
        const bitrate = Number(level.bitrate) || 0;
        const key = height > 0 ? height : `br_${bitrate}`;
        const existing = byHeight.get(key);
        if (!existing || bitrate > (existing.bitrate || 0)) {
          byHeight.set(key, { index, height: level.height, width: level.width, bitrate, level });
        }
      });
      return Array.from(byHeight.values()).map((entry) => {
        const height = Number(entry.height) || 0;
        const kb = entry.bitrate > 0 ? Math.round(entry.bitrate / 1e3) : 0;
        const name = height > 0 ? `${height}p` : kb > 0 ? `${kb} kb` : "Auto";
        return { index: entry.index, height: entry.height, width: entry.width, bitrate: entry.bitrate, name };
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
};
export {
  HLSRenderer
};
//# sourceMappingURL=vidply.HLSRenderer-L6YGUPR6.js.map
