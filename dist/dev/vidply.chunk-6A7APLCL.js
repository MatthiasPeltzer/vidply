/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/renderers/HTML5Renderer.js
var HTML5Renderer = class {
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this._didDeferredLoad = false;
  }
  async init() {
    this.media.controls = false;
    this.media.removeAttribute("controls");
    this.attachEvents();
    if (this.player.options.deferLoad) {
      this.media.preload = this.player.options.preload || "none";
    } else {
      this.media.preload = this.player.options.preload;
      this.media.load();
    }
    if (this.player.container) {
      this.player.container.classList.remove("vidply-external-controls");
    }
  }
  attachEvents() {
    this.media.addEventListener("loadedmetadata", () => {
      this.player.state.duration = this.media.duration;
      this.player.emit("loadedmetadata");
      if (this.media.tagName === "VIDEO") {
        this.player.autoGeneratePoster().catch((error) => {
          this.player.log("Failed to auto-generate poster:", error, "warn");
        });
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
      if (this.player.options.pauseOthersOnPlay) {
        this.pauseOtherPlayers();
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
      if (this.player.options.onVolumeChange) {
        this.player.options.onVolumeChange.call(this.player, this.media.volume);
      }
    });
    this.media.addEventListener("seeking", () => {
      this.player.state.seeking = true;
      this.player.emit("seeking");
    });
    this.media.addEventListener("seeked", () => {
      this.player.state.seeking = false;
      this.player.emit("seeked");
    });
    this.media.addEventListener("waiting", () => {
      this.player.state.buffering = true;
      this.player.emit("waiting");
    });
    this.media.addEventListener("canplay", () => {
      this.player.state.buffering = false;
      this.player.emit("canplay");
    });
    this.media.addEventListener("progress", () => {
      if (this.media.buffered.length > 0) {
        const buffered = this.media.buffered.end(this.media.buffered.length - 1);
        this.player.emit("progress", buffered);
      }
    });
    this.media.addEventListener("error", (e) => {
      this.player.handleError(this.media.error);
    });
    this.media.addEventListener("ratechange", () => {
      this.player.state.playbackSpeed = this.media.playbackRate;
      this.player.emit("ratechange", this.media.playbackRate);
    });
  }
  pauseOtherPlayers() {
    const allPlayers = document.querySelectorAll(".vidply-player");
    allPlayers.forEach((playerEl) => {
      if (playerEl !== this.player.container) {
        const video = playerEl.querySelector("video, audio");
        if (video && !video.paused) {
          video.pause();
        }
      }
    });
  }
  play() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (this.player.options.deferLoad && !this._didDeferredLoad) {
      try {
        if (this.media.readyState === 0) {
          this.media.load();
        }
      } catch (e) {
      }
      this._didDeferredLoad = true;
    }
    const promise = this.media.play();
    window.scrollTo(scrollX, scrollY);
    if (promise !== void 0) {
      promise.catch((error) => {
        this.player.log("Play failed:", error, "warn");
        if (this.player.options.autoplay && !this.player.state.muted) {
          this.player.log("Retrying play with muted audio", "info");
          this.media.muted = true;
          const retryScrollX = window.scrollX;
          const retryScrollY = window.scrollY;
          this.media.play().then(() => {
            window.scrollTo(retryScrollX, retryScrollY);
          }).catch((err) => {
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
    try {
      if (this.media.readyState === 0) {
        this.media.load();
      }
    } catch (e) {
    }
    this._didDeferredLoad = true;
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
  /**
   * Get available quality levels from source elements
   * @returns {Array} Array of quality objects with index, height, width, and src
   */
  getQualities() {
    const sources = Array.from(this.media.querySelectorAll("source"));
    if (sources.length <= 1) {
      return [];
    }
    return sources.map((source, index) => {
      const label = source.getAttribute("data-quality") || source.getAttribute("label") || "";
      const height = source.getAttribute("data-height") || this.extractHeightFromLabel(label);
      const width = source.getAttribute("data-width") || "";
      return {
        index,
        height: height ? parseInt(height) : 0,
        width: width ? parseInt(width) : 0,
        src: source.src,
        type: source.type,
        name: label || (height ? `${height}p` : `Quality ${index + 1}`)
      };
    }).filter((q) => q.height > 0);
  }
  /**
   * Extract height from quality label (e.g., "1080p" -> 1080)
   * @param {string} label 
   * @returns {number}
   */
  extractHeightFromLabel(label) {
    const match = label.match(/(\d+)p/i);
    return match ? parseInt(match[1]) : 0;
  }
  /**
   * Switch to a specific quality level
   * @param {number} qualityIndex - Index of the quality level (-1 for auto, not applicable for HTML5)
   */
  switchQuality(qualityIndex) {
    const qualities = this.getQualities();
    if (qualityIndex < 0 || qualityIndex >= qualities.length) {
      this.player.log("Invalid quality index", "warn");
      return;
    }
    const quality = qualities[qualityIndex];
    const currentTime = this.media.currentTime;
    const wasPlaying = !this.media.paused;
    const currentSrc = this.media.currentSrc;
    if (currentSrc === quality.src) {
      this.player.log("Already at this quality level", "info");
      return;
    }
    this.player.log(`Switching to quality: ${quality.name}`, "info");
    this.media.src = quality.src;
    const onLoadedMetadata = () => {
      this.media.removeEventListener("loadedmetadata", onLoadedMetadata);
      this.media.currentTime = currentTime;
      if (wasPlaying) {
        this.media.play().catch((err) => {
          this.player.log("Failed to resume playback after quality switch", "warn");
        });
      }
      this.player.emit("qualitychange", { quality: quality.name, index: qualityIndex });
    };
    this.media.addEventListener("loadedmetadata", onLoadedMetadata);
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
      if (qualities[i].src === currentSrc) {
        return i;
      }
    }
    return 0;
  }
  destroy() {
    this.media.removeEventListener("loadedmetadata", () => {
    });
    this.media.removeEventListener("play", () => {
    });
    this.media.removeEventListener("pause", () => {
    });
  }
};

export {
  HTML5Renderer
};
//# sourceMappingURL=vidply.chunk-6A7APLCL.js.map
