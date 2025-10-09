/*!
 * VidPly v1.0.0
 * Universal, Accessible Video Player
 * (c) 2025 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/renderers/HTML5Renderer.js
var HTML5Renderer_exports = {};
__export(HTML5Renderer_exports, {
  HTML5Renderer: () => HTML5Renderer
});
var HTML5Renderer;
var init_HTML5Renderer = __esm({
  "src/renderers/HTML5Renderer.js"() {
    HTML5Renderer = class {
      constructor(player) {
        this.player = player;
        this.media = player.element;
      }
      async init() {
        this.attachEvents();
        this.media.preload = this.player.options.preload;
        this.media.load();
      }
      attachEvents() {
        this.media.addEventListener("loadedmetadata", () => {
          this.player.state.duration = this.media.duration;
          this.player.emit("loadedmetadata");
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
        const promise = this.media.play();
        if (promise !== void 0) {
          promise.catch((error) => {
            this.player.log("Play failed:", error, "warn");
            if (this.player.options.autoplay && !this.player.state.muted) {
              this.player.log("Retrying play with muted audio", "info");
              this.media.muted = true;
              this.media.play().catch((err) => {
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
        this.media.removeEventListener("loadedmetadata", () => {
        });
        this.media.removeEventListener("play", () => {
        });
        this.media.removeEventListener("pause", () => {
        });
      }
    };
  }
});

// src/utils/EventEmitter.js
var EventEmitter = class {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }
  once(event, listener) {
    const onceListener = (...args) => {
      listener(...args);
      this.off(event, onceListener);
    };
    return this.on(event, onceListener);
  }
  off(event, listener) {
    if (!this.events[event]) return this;
    if (!listener) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    }
    return this;
  }
  emit(event, ...args) {
    if (!this.events[event]) return this;
    this.events[event].forEach((listener) => {
      listener(...args);
    });
    return this;
  }
  removeAllListeners() {
    this.events = {};
    return this;
  }
};

// src/utils/DOMUtils.js
var DOMUtils = {
  createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) {
      element.className = options.className;
    }
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    if (options.style) {
      Object.assign(element.style, options.style);
    }
    if (options.children) {
      options.children.forEach((child) => {
        if (child) element.appendChild(child);
      });
    }
    return element;
  },
  addClass(element, className) {
    if (element && className) {
      element.classList.add(className);
    }
  },
  removeClass(element, className) {
    if (element && className) {
      element.classList.remove(className);
    }
  },
  toggleClass(element, className) {
    if (element && className) {
      element.classList.toggle(className);
    }
  },
  hasClass(element, className) {
    return element && element.classList.contains(className);
  },
  show(element) {
    if (element) {
      element.style.display = "";
    }
  },
  hide(element) {
    if (element) {
      element.style.display = "none";
    }
  },
  fadeIn(element, duration = 300) {
    if (!element) return;
    element.style.opacity = "0";
    element.style.display = "";
    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.min(progress / duration, 1);
      element.style.opacity = opacity;
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  },
  fadeOut(element, duration = 300) {
    if (!element) return;
    const startOpacity = parseFloat(getComputedStyle(element).opacity) || 1;
    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.max(startOpacity - progress / duration, 0);
      element.style.opacity = opacity;
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = "none";
      }
    };
    requestAnimationFrame(animate);
  },
  offset(element) {
    if (!element) return { top: 0, left: 0 };
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.pageYOffset,
      left: rect.left + window.pageXOffset,
      width: rect.width,
      height: rect.height
    };
  },
  escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
  sanitizeHTML(html) {
    const temp = document.createElement("div");
    const safeHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "").replace(/on\w+\s*=/gi, "").replace(/javascript:/gi, "");
    temp.innerHTML = safeHtml;
    return temp.innerHTML;
  }
};

// src/utils/TimeUtils.js
var TimeUtils = {
  /**
   * Format seconds to time string (HH:MM:SS or MM:SS)
   */
  formatTime(seconds, alwaysShowHours = false) {
    if (!isFinite(seconds) || seconds < 0) {
      return alwaysShowHours ? "00:00:00" : "00:00";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (num) => String(num).padStart(2, "0");
    if (hours > 0 || alwaysShowHours) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  },
  /**
   * Parse time string to seconds
   */
  parseTime(timeString) {
    const parts = timeString.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  },
  /**
   * Format seconds to readable duration
   */
  formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      return "0 seconds";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
    }
    if (secs > 0 || parts.length === 0) {
      parts.push(`${secs} second${secs !== 1 ? "s" : ""}`);
    }
    return parts.join(", ");
  },
  /**
   * Format percentage
   */
  formatPercentage(value, total) {
    if (total === 0) return 0;
    return Math.round(value / total * 100);
  }
};

// src/icons/Icons.js
var Icons = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
  </svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12"/>
  </svg>`,
  rewind: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
  </svg>`,
  forward: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
  </svg>`,
  skipPrevious: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6V6zm3 6l8.5 6V6L9 12z"/>
  </svg>`,
  skipNext: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 6h2v12h-2V6zM6 6l8.5 6L6 18V6z"/>
  </svg>`,
  volumeHigh: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>`,
  volumeMedium: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
  </svg>`,
  volumeLow: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
  </svg>`,
  volumeMuted: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
  </svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>`,
  fullscreenExit: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
  </svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>`,
  captions: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
  </svg>`,
  captionsOff: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
    <path d="M0 0h24v24H0z" fill="none"/>
  </svg>`,
  pip: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>
  </svg>`,
  speed: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44z"/>
    <path d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/>
  </svg>`,
  close: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>`,
  check: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>`,
  arrowUp: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 14l5-5 5 5z"/>
  </svg>`,
  arrowDown: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 10l5 5 5-5z"/>
  </svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
  </svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>`,
  loading: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
  </svg>`,
  error: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>`,
  download: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>`,
  link: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
  </svg>`,
  playlist: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
  </svg>`,
  language: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
  </svg>`,
  hd: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1c0 .55-.45 1-1 1h-.75v1.5h-1.5V15H14c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v4zm-3.5-.5h2v-3h-2v3z"/>
  </svg>`,
  transcript: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>`,
  audioDescription: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/>
    <path d="M10.5 19c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`,
  audioDescriptionOn: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/>
    <path d="M10.5 19c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    <circle cx="19" cy="16" r="3" fill="#3b82f6"/>
    <path d="M18.5 17.5l1-1 1.5 1.5" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  signLanguage: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C10.34 2 9 3.34 9 5v4c0 .34.07.66.18.96L7.5 8.29C7.19 8.1 6.85 8 6.5 8 5.12 8 4 9.12 4 10.5v3c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-3c0-.28.22-.5.5-.5s.5.22.5.5V14l2 2v-1c0-.55.45-1 1-1s1 .45 1 1v2c0 .55.45 1 1 1s1-.45 1-1V9c0-.55.45-1 1-1s1 .45 1 1v8c0 2.21-1.79 4-4 4s-4-1.79-4-4v-2.83l-2.93-2.93A3.93 3.93 0 0 1 4 8c0-1.66 1.34-3 3-3 .83 0 1.58.34 2.12.88L11 7.76V5c0-.55.45-1 1-1s1 .45 1 1v4c0 .55.45 1 1 1s1-.45 1-1V5c0-1.66-1.34-3-3-3z"/>
  </svg>`,
  signLanguageOn: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C10.34 2 9 3.34 9 5v4c0 .34.07.66.18.96L7.5 8.29C7.19 8.1 6.85 8 6.5 8 5.12 8 4 9.12 4 10.5v3c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-3c0-.28.22-.5.5-.5s.5.22.5.5V14l2 2v-1c0-.55.45-1 1-1s1 .45 1 1v2c0 .55.45 1 1 1s1-.45 1-1V9c0-.55.45-1 1-1s1 .45 1 1v8c0 2.21-1.79 4-4 4s-4-1.79-4-4v-2.83l-2.93-2.93A3.93 3.93 0 0 1 4 8c0-1.66 1.34-3 3-3 .83 0 1.58.34 2.12.88L11 7.76V5c0-.55.45-1 1-1s1 .45 1 1v4c0 .55.45 1 1 1s1-.45 1-1V5c0-1.66-1.34-3-3-3z"/>
    <circle cx="19" cy="16" r="3" fill="#3b82f6"/>
    <path d="M18.5 17.5l1-1 1.5 1.5" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  speaker: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
  </svg>`,
  music: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7zm-1.5 16c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`
};
function getIcon(name) {
  return Icons[name] || Icons.play;
}
function createIconElement(name, className = "") {
  const wrapper = document.createElement("span");
  wrapper.className = `vidply-icon ${className}`.trim();
  wrapper.innerHTML = getIcon(name);
  wrapper.setAttribute("aria-hidden", "true");
  return wrapper;
}

// src/i18n/translations.js
var translations = {
  en: {
    player: {
      label: "Video Player",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      rewind: "Rewind",
      forward: "Forward",
      volume: "Volume",
      mute: "Mute",
      unmute: "Unmute",
      fullscreen: "Fullscreen",
      exitFullscreen: "Exit Fullscreen",
      captions: "Captions",
      settings: "Settings",
      speed: "Playback Speed",
      pip: "Picture in Picture",
      currentTime: "Current time",
      duration: "Duration",
      progress: "Progress",
      seekForward: "Seek forward {seconds} seconds",
      seekBackward: "Seek backward {seconds} seconds",
      volumeUp: "Volume up",
      volumeDown: "Volume down",
      loading: "Loading...",
      error: "Error loading media",
      buffering: "Buffering...",
      signLanguageVideo: "Sign Language Video"
    },
    captions: {
      off: "Off",
      select: "Select captions",
      fontSize: "Font Size",
      fontFamily: "Font Family",
      color: "Text Color",
      backgroundColor: "Background Color",
      opacity: "Opacity"
    },
    settings: {
      title: "Settings",
      quality: "Quality",
      speed: "Speed",
      captions: "Captions",
      language: "Language",
      reset: "Reset to defaults",
      close: "Close"
    },
    speeds: {
      "0.25": "0.25x",
      "0.5": "0.5x",
      "0.75": "0.75x",
      "1": "Normal",
      "1.25": "1.25x",
      "1.5": "1.5x",
      "1.75": "1.75x",
      "2": "2x"
    }
  },
  de: {
    player: {
      label: "Videoplayer",
      play: "Abspielen",
      pause: "Pause",
      stop: "Stopp",
      rewind: "Zur\xFCckspulen",
      forward: "Vorspulen",
      volume: "Lautst\xE4rke",
      mute: "Stumm",
      unmute: "Ton ein",
      fullscreen: "Vollbild",
      exitFullscreen: "Vollbild beenden",
      captions: "Untertitel",
      settings: "Einstellungen",
      speed: "Wiedergabegeschwindigkeit",
      pip: "Bild-in-Bild",
      currentTime: "Aktuelle Zeit",
      duration: "Dauer",
      progress: "Fortschritt",
      loading: "L\xE4dt...",
      error: "Fehler beim Laden",
      buffering: "Puffern...",
      signLanguageVideo: "Geb\xE4rdensprache-Video"
    },
    captions: {
      off: "Aus",
      select: "Untertitel ausw\xE4hlen",
      fontSize: "Schriftgr\xF6\xDFe",
      fontFamily: "Schriftart",
      color: "Textfarbe",
      backgroundColor: "Hintergrundfarbe",
      opacity: "Deckkraft"
    },
    settings: {
      title: "Einstellungen",
      quality: "Qualit\xE4t",
      speed: "Geschwindigkeit",
      captions: "Untertitel",
      language: "Sprache",
      reset: "Zur\xFCcksetzen",
      close: "Schlie\xDFen"
    }
  },
  es: {
    player: {
      label: "Reproductor de video",
      play: "Reproducir",
      pause: "Pausa",
      stop: "Detener",
      rewind: "Retroceder",
      forward: "Avanzar",
      volume: "Volumen",
      mute: "Silenciar",
      unmute: "Activar sonido",
      fullscreen: "Pantalla completa",
      exitFullscreen: "Salir de pantalla completa",
      captions: "Subt\xEDtulos",
      settings: "Configuraci\xF3n",
      speed: "Velocidad de reproducci\xF3n",
      pip: "Imagen en imagen",
      currentTime: "Tiempo actual",
      duration: "Duraci\xF3n",
      progress: "Progreso",
      loading: "Cargando...",
      error: "Error al cargar",
      buffering: "Almacenando en b\xFAfer...",
      signLanguageVideo: "Video en Lengua de Se\xF1as"
    },
    captions: {
      off: "Desactivado",
      select: "Seleccionar subt\xEDtulos",
      fontSize: "Tama\xF1o de fuente",
      fontFamily: "Familia de fuente",
      color: "Color de texto",
      backgroundColor: "Color de fondo",
      opacity: "Opacidad"
    },
    settings: {
      title: "Configuraci\xF3n",
      quality: "Calidad",
      speed: "Velocidad",
      captions: "Subt\xEDtulos",
      language: "Idioma",
      reset: "Restablecer",
      close: "Cerrar"
    }
  },
  fr: {
    player: {
      label: "Lecteur vid\xE9o",
      play: "Lecture",
      pause: "Pause",
      stop: "Arr\xEAt",
      rewind: "Reculer",
      forward: "Avancer",
      volume: "Volume",
      mute: "Muet",
      unmute: "Activer le son",
      fullscreen: "Plein \xE9cran",
      exitFullscreen: "Quitter le plein \xE9cran",
      captions: "Sous-titres",
      settings: "Param\xE8tres",
      speed: "Vitesse de lecture",
      pip: "Image dans l'image",
      currentTime: "Temps actuel",
      duration: "Dur\xE9e",
      progress: "Progression",
      loading: "Chargement...",
      error: "Erreur de chargement",
      buffering: "Mise en m\xE9moire tampon...",
      signLanguageVideo: "Vid\xE9o en Langue des Signes"
    },
    captions: {
      off: "D\xE9sactiv\xE9",
      select: "S\xE9lectionner les sous-titres",
      fontSize: "Taille de police",
      fontFamily: "Police",
      color: "Couleur du texte",
      backgroundColor: "Couleur de fond",
      opacity: "Opacit\xE9"
    },
    settings: {
      title: "Param\xE8tres",
      quality: "Qualit\xE9",
      speed: "Vitesse",
      captions: "Sous-titres",
      language: "Langue",
      reset: "R\xE9initialiser",
      close: "Fermer"
    }
  },
  ja: {
    player: {
      label: "\u30D3\u30C7\u30AA\u30D7\u30EC\u30FC\u30E4\u30FC",
      play: "\u518D\u751F",
      pause: "\u4E00\u6642\u505C\u6B62",
      stop: "\u505C\u6B62",
      rewind: "\u5DFB\u304D\u623B\u3057",
      forward: "\u65E9\u9001\u308A",
      volume: "\u97F3\u91CF",
      mute: "\u30DF\u30E5\u30FC\u30C8",
      unmute: "\u30DF\u30E5\u30FC\u30C8\u89E3\u9664",
      fullscreen: "\u5168\u753B\u9762\u8868\u793A",
      exitFullscreen: "\u5168\u753B\u9762\u8868\u793A\u3092\u7D42\u4E86",
      captions: "\u5B57\u5E55",
      settings: "\u8A2D\u5B9A",
      speed: "\u518D\u751F\u901F\u5EA6",
      pip: "\u30D4\u30AF\u30C1\u30E3\u30FC\u30A4\u30F3\u30D4\u30AF\u30C1\u30E3\u30FC",
      currentTime: "\u73FE\u5728\u306E\u6642\u9593",
      duration: "\u518D\u751F\u6642\u9593",
      progress: "\u9032\u884C\u72B6\u6CC1",
      loading: "\u8AAD\u307F\u8FBC\u307F\u4E2D...",
      error: "\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC",
      buffering: "\u30D0\u30C3\u30D5\u30A1\u30EA\u30F3\u30B0\u4E2D...",
      signLanguageVideo: "\u624B\u8A71\u52D5\u753B"
    },
    captions: {
      off: "\u30AA\u30D5",
      select: "\u5B57\u5E55\u3092\u9078\u629E",
      fontSize: "\u30D5\u30A9\u30F3\u30C8\u30B5\u30A4\u30BA",
      fontFamily: "\u30D5\u30A9\u30F3\u30C8",
      color: "\u30C6\u30AD\u30B9\u30C8\u306E\u8272",
      backgroundColor: "\u80CC\u666F\u8272",
      opacity: "\u4E0D\u900F\u660E\u5EA6"
    },
    settings: {
      title: "\u8A2D\u5B9A",
      quality: "\u753B\u8CEA",
      speed: "\u901F\u5EA6",
      captions: "\u5B57\u5E55",
      language: "\u8A00\u8A9E",
      reset: "\u30EA\u30BB\u30C3\u30C8",
      close: "\u9589\u3058\u308B"
    }
  }
};

// src/i18n/i18n.js
var I18n = class {
  constructor() {
    this.currentLanguage = "en";
    this.translations = translations;
  }
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Language "${lang}" not found, falling back to English`);
      this.currentLanguage = "en";
    }
  }
  getLanguage() {
    return this.currentLanguage;
  }
  t(key, replacements = {}) {
    const keys = key.split(".");
    let value = this.translations[this.currentLanguage];
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        value = this.translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === "object" && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key;
          }
        }
        break;
      }
    }
    if (typeof value === "string") {
      Object.entries(replacements).forEach(([placeholder, replacement]) => {
        value = value.replace(new RegExp(`{${placeholder}}`, "g"), replacement);
      });
    }
    return value;
  }
  addTranslation(lang, translations2) {
    if (!this.translations[lang]) {
      this.translations[lang] = {};
    }
    Object.assign(this.translations[lang], translations2);
  }
};
var i18n = new I18n();

// src/controls/ControlBar.js
var ControlBar = class {
  constructor(player) {
    this.player = player;
    this.element = null;
    this.controls = {};
    this.hideTimeout = null;
    this.isDraggingProgress = false;
    this.isDraggingVolume = false;
    this.init();
  }
  init() {
    this.createElement();
    this.createControls();
    this.attachEvents();
    this.setupAutoHide();
  }
  // Helper method to attach close-on-outside-click behavior to menus
  attachMenuCloseHandler(menu, button, preventCloseOnInteraction = false) {
    setTimeout(() => {
      const closeMenu = (e) => {
        if (preventCloseOnInteraction && menu.contains(e.target)) {
          return;
        }
        if (!menu.contains(e.target) && !button.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
          document.removeEventListener("keydown", handleEscape);
        }
      };
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          menu.remove();
          document.removeEventListener("click", closeMenu);
          document.removeEventListener("keydown", handleEscape);
          button.focus();
        }
      };
      document.addEventListener("click", closeMenu);
      document.addEventListener("keydown", handleEscape);
    }, 100);
  }
  createElement() {
    this.element = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls`,
      attributes: {
        "role": "region",
        "aria-label": i18n.t("player.label") + " controls"
      }
    });
  }
  createControls() {
    if (this.player.options.progressBar) {
      this.createProgressBar();
    }
    const buttonContainer = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls-buttons`
    });
    const leftButtons = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls-left`
    });
    if (this.player.playlistManager) {
      leftButtons.appendChild(this.createPreviousButton());
    }
    if (this.player.options.playPauseButton) {
      leftButtons.appendChild(this.createPlayPauseButton());
    }
    if (this.player.playlistManager) {
      leftButtons.appendChild(this.createNextButton());
    }
    if (!this.player.playlistManager) {
      leftButtons.appendChild(this.createRewindButton());
    }
    if (!this.player.playlistManager) {
      leftButtons.appendChild(this.createForwardButton());
    }
    if (this.player.options.volumeControl) {
      leftButtons.appendChild(this.createVolumeControl());
    }
    if (this.player.options.currentTime || this.player.options.duration) {
      leftButtons.appendChild(this.createTimeDisplay());
    }
    const rightButtons = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls-right`
    });
    const hasChapters = this.hasChapterTracks();
    const hasCaptions = this.hasCaptionTracks();
    const hasQualityLevels = this.hasQualityLevels();
    const hasAudioDescription = this.hasAudioDescription();
    if (this.player.options.chaptersButton && hasChapters) {
      rightButtons.appendChild(this.createChaptersButton());
    }
    if (this.player.options.qualityButton && hasQualityLevels) {
      rightButtons.appendChild(this.createQualityButton());
    }
    if (this.player.options.captionStyleButton && hasCaptions) {
      rightButtons.appendChild(this.createCaptionStyleButton());
    }
    if (this.player.options.speedButton) {
      rightButtons.appendChild(this.createSpeedButton());
    }
    if (this.player.options.captionsButton && hasCaptions) {
      rightButtons.appendChild(this.createCaptionsButton());
    }
    if (this.player.options.transcriptButton && hasCaptions) {
      rightButtons.appendChild(this.createTranscriptButton());
    }
    if (this.player.options.audioDescriptionButton && hasAudioDescription) {
      rightButtons.appendChild(this.createAudioDescriptionButton());
    }
    const hasSignLanguage = this.hasSignLanguage();
    if (this.player.options.signLanguageButton && hasSignLanguage) {
      rightButtons.appendChild(this.createSignLanguageButton());
    }
    if (this.player.options.pipButton && "pictureInPictureEnabled" in document) {
      rightButtons.appendChild(this.createPipButton());
    }
    if (this.player.options.fullscreenButton) {
      rightButtons.appendChild(this.createFullscreenButton());
    }
    buttonContainer.appendChild(leftButtons);
    buttonContainer.appendChild(rightButtons);
    this.element.appendChild(buttonContainer);
  }
  // Helper methods to check for available features
  hasChapterTracks() {
    const textTracks = this.player.element.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      if (textTracks[i].kind === "chapters") {
        return true;
      }
    }
    return false;
  }
  hasCaptionTracks() {
    const textTracks = this.player.element.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      if (textTracks[i].kind === "captions" || textTracks[i].kind === "subtitles") {
        return true;
      }
    }
    return false;
  }
  hasQualityLevels() {
    if (this.player.renderer && this.player.renderer.hls) {
      const levels = this.player.renderer.hls.levels;
      return levels && levels.length > 1;
    }
    return false;
  }
  hasAudioDescription() {
    return this.player.audioDescriptionSrc && this.player.audioDescriptionSrc.length > 0;
  }
  hasSignLanguage() {
    return this.player.signLanguageSrc && this.player.signLanguageSrc.length > 0;
  }
  createProgressBar() {
    const progressContainer = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-container`,
      attributes: {
        "role": "slider",
        "aria-label": i18n.t("player.progress"),
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": "0",
        "tabindex": "0"
      }
    });
    this.controls.buffered = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-buffered`
    });
    this.controls.played = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-played`
    });
    this.controls.progressHandle = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-handle`
    });
    this.controls.progressTooltip = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-tooltip`
    });
    progressContainer.appendChild(this.controls.buffered);
    progressContainer.appendChild(this.controls.played);
    this.controls.played.appendChild(this.controls.progressHandle);
    progressContainer.appendChild(this.controls.progressTooltip);
    this.controls.progress = progressContainer;
    this.element.appendChild(progressContainer);
    this.setupProgressBarEvents();
  }
  setupProgressBarEvents() {
    const progress = this.controls.progress;
    const updateProgress = (clientX) => {
      const rect = progress.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const time = percent * this.player.state.duration;
      return { percent, time };
    };
    progress.addEventListener("mousedown", (e) => {
      this.isDraggingProgress = true;
      const { time } = updateProgress(e.clientX);
      this.player.seek(time);
    });
    document.addEventListener("mousemove", (e) => {
      if (this.isDraggingProgress) {
        const { time } = updateProgress(e.clientX);
        this.player.seek(time);
      }
    });
    document.addEventListener("mouseup", () => {
      this.isDraggingProgress = false;
    });
    progress.addEventListener("mousemove", (e) => {
      if (!this.isDraggingProgress) {
        const { time } = updateProgress(e.clientX);
        this.controls.progressTooltip.textContent = TimeUtils.formatTime(time);
        this.controls.progressTooltip.style.left = `${e.clientX - progress.getBoundingClientRect().left}px`;
        this.controls.progressTooltip.style.display = "block";
      }
    });
    progress.addEventListener("mouseleave", () => {
      this.controls.progressTooltip.style.display = "none";
    });
    progress.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.player.seekBackward(5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.player.seekForward(5);
      }
    });
    progress.addEventListener("touchstart", (e) => {
      this.isDraggingProgress = true;
      const touch = e.touches[0];
      const { time } = updateProgress(touch.clientX);
      this.player.seek(time);
    });
    progress.addEventListener("touchmove", (e) => {
      if (this.isDraggingProgress) {
        e.preventDefault();
        const touch = e.touches[0];
        const { time } = updateProgress(touch.clientX);
        this.player.seek(time);
      }
    });
    progress.addEventListener("touchend", () => {
      this.isDraggingProgress = false;
    });
  }
  createPlayPauseButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-play-pause`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.play")
      }
    });
    button.appendChild(createIconElement("play"));
    button.addEventListener("click", () => {
      this.player.toggle();
    });
    this.controls.playPause = button;
    return button;
  }
  createPreviousButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-previous`,
      attributes: {
        "type": "button",
        "aria-label": "Previous track"
      }
    });
    button.appendChild(createIconElement("skipPrevious"));
    button.addEventListener("click", () => {
      if (this.player.playlistManager) {
        this.player.playlistManager.previous();
      }
    });
    const updateState = () => {
      if (this.player.playlistManager) {
        button.disabled = !this.player.playlistManager.hasPrevious() && !this.player.playlistManager.options.loop;
      }
    };
    this.player.on("playlisttrackchange", updateState);
    updateState();
    this.controls.previous = button;
    return button;
  }
  createNextButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-next`,
      attributes: {
        "type": "button",
        "aria-label": "Next track"
      }
    });
    button.appendChild(createIconElement("skipNext"));
    button.addEventListener("click", () => {
      if (this.player.playlistManager) {
        this.player.playlistManager.next();
      }
    });
    const updateState = () => {
      if (this.player.playlistManager) {
        button.disabled = !this.player.playlistManager.hasNext() && !this.player.playlistManager.options.loop;
      }
    };
    this.player.on("playlisttrackchange", updateState);
    updateState();
    this.controls.next = button;
    return button;
  }
  createRewindButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-rewind`,
      attributes: {
        "type": "button",
        "aria-label": "Rewind 15 seconds"
      }
    });
    button.appendChild(createIconElement("rewind"));
    button.addEventListener("click", () => {
      this.player.seekBackward(15);
    });
    return button;
  }
  createForwardButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-forward`,
      attributes: {
        "type": "button",
        "aria-label": "Forward 15 seconds"
      }
    });
    button.appendChild(createIconElement("forward"));
    button.addEventListener("click", () => {
      this.player.seekForward(15);
    });
    return button;
  }
  createVolumeControl() {
    const muteButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-mute`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.volume"),
        "aria-haspopup": "true"
      }
    });
    muteButton.appendChild(createIconElement("volumeHigh"));
    muteButton.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.player.toggleMute();
    });
    muteButton.addEventListener("click", () => {
      this.showVolumeSlider(muteButton);
    });
    this.controls.mute = muteButton;
    return muteButton;
  }
  showVolumeSlider(button) {
    const existingSlider = document.querySelector(`.${this.player.options.classPrefix}-volume-menu`);
    if (existingSlider) {
      existingSlider.remove();
      return;
    }
    const volumeMenu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-menu ${this.player.options.classPrefix}-menu`
    });
    const volumeSlider = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-slider`,
      attributes: {
        "role": "slider",
        "aria-label": i18n.t("player.volume"),
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(Math.round(this.player.state.volume * 100)),
        "tabindex": "0"
      }
    });
    const volumeTrack = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-track`
    });
    const volumeFill = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-fill`
    });
    const volumeHandle = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-handle`
    });
    volumeTrack.appendChild(volumeFill);
    volumeFill.appendChild(volumeHandle);
    volumeSlider.appendChild(volumeTrack);
    volumeMenu.appendChild(volumeSlider);
    const updateVolume = (clientY) => {
      const rect = volumeTrack.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      this.player.setVolume(percent);
    };
    volumeSlider.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.isDraggingVolume = true;
      updateVolume(e.clientY);
    });
    document.addEventListener("mousemove", (e) => {
      if (this.isDraggingVolume) {
        updateVolume(e.clientY);
      }
    });
    document.addEventListener("mouseup", () => {
      this.isDraggingVolume = false;
    });
    volumeSlider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.player.setVolume(Math.min(1, this.player.state.volume + 0.1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.player.setVolume(Math.max(0, this.player.state.volume - 0.1));
      }
    });
    volumeMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    button.appendChild(volumeMenu);
    this.controls.volumeSlider = volumeSlider;
    this.controls.volumeFill = volumeFill;
    this.attachMenuCloseHandler(volumeMenu, button, true);
  }
  createTimeDisplay() {
    const container = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-time`
    });
    this.controls.currentTimeDisplay = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-current-time`,
      textContent: "00:00"
    });
    const separator = DOMUtils.createElement("span", {
      textContent: " / ",
      attributes: {
        "aria-hidden": "true"
      }
    });
    this.controls.durationDisplay = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-duration`,
      textContent: "00:00"
    });
    container.appendChild(this.controls.currentTimeDisplay);
    container.appendChild(separator);
    container.appendChild(this.controls.durationDisplay);
    return container;
  }
  createChaptersButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-chapters`,
      attributes: {
        "type": "button",
        "aria-label": "Chapters",
        "aria-haspopup": "menu"
      }
    });
    button.appendChild(createIconElement("playlist"));
    button.addEventListener("click", () => {
      this.showChaptersMenu(button);
    });
    this.controls.chapters = button;
    return button;
  }
  showChaptersMenu(button) {
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-chapters-menu`);
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-chapters-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu",
        "aria-label": "Chapters"
      }
    });
    const chapterTracks = Array.from(this.player.element.textTracks).filter(
      (track) => track.kind === "chapters"
    );
    if (chapterTracks.length === 0) {
      const noChaptersItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: "No chapters available",
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noChaptersItem);
    } else {
      const chapterTrack = chapterTracks[0];
      if (chapterTrack.mode === "disabled") {
        chapterTrack.mode = "hidden";
      }
      if (!chapterTrack.cues || chapterTrack.cues.length === 0) {
        const loadingItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: "Loading chapters...",
          style: { opacity: "0.5", cursor: "default" }
        });
        menu.appendChild(loadingItem);
        const onTrackLoad = () => {
          menu.remove();
          this.showChaptersMenu(button);
        };
        chapterTrack.addEventListener("load", onTrackLoad, { once: true });
        setTimeout(() => {
          if (chapterTrack.cues && chapterTrack.cues.length > 0 && document.contains(menu)) {
            menu.remove();
            this.showChaptersMenu(button);
          }
        }, 500);
      } else {
        const cues = chapterTrack.cues;
        for (let i = 0; i < cues.length; i++) {
          const cue = cues[i];
          const item = DOMUtils.createElement("button", {
            className: `${this.player.options.classPrefix}-menu-item`,
            attributes: {
              "type": "button",
              "role": "menuitem"
            }
          });
          const timeLabel = DOMUtils.createElement("span", {
            className: `${this.player.options.classPrefix}-chapter-time`,
            textContent: TimeUtils.formatTime(cue.startTime)
          });
          const titleLabel = DOMUtils.createElement("span", {
            className: `${this.player.options.classPrefix}-chapter-title`,
            textContent: cue.text
          });
          item.appendChild(timeLabel);
          item.appendChild(document.createTextNode(" "));
          item.appendChild(titleLabel);
          item.addEventListener("click", () => {
            this.player.seek(cue.startTime);
            menu.remove();
          });
          menu.appendChild(item);
        }
      }
    }
    button.appendChild(menu);
    this.attachMenuCloseHandler(menu, button);
  }
  createQualityButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-quality`,
      attributes: {
        "type": "button",
        "aria-label": "Quality",
        "aria-haspopup": "menu"
      }
    });
    button.appendChild(createIconElement("hd"));
    button.addEventListener("click", () => {
      this.showQualityMenu(button);
    });
    this.controls.quality = button;
    return button;
  }
  showQualityMenu(button) {
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-quality-menu`);
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-quality-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu",
        "aria-label": "Quality"
      }
    });
    if (this.player.renderer && this.player.renderer.getQualities) {
      const qualities = this.player.renderer.getQualities();
      if (qualities.length === 0) {
        const noQualityItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: "Auto (no quality selection available)",
          style: { opacity: "0.5", cursor: "default" }
        });
        menu.appendChild(noQualityItem);
      } else {
        const autoItem = DOMUtils.createElement("button", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: "Auto",
          attributes: {
            "type": "button",
            "role": "menuitem"
          }
        });
        autoItem.addEventListener("click", () => {
          if (this.player.renderer.switchQuality) {
            this.player.renderer.switchQuality(-1);
          }
          menu.remove();
        });
        menu.appendChild(autoItem);
        qualities.forEach((quality) => {
          const item = DOMUtils.createElement("button", {
            className: `${this.player.options.classPrefix}-menu-item`,
            textContent: quality.name || `${quality.height}p`,
            attributes: {
              "type": "button",
              "role": "menuitem"
            }
          });
          item.addEventListener("click", () => {
            if (this.player.renderer.switchQuality) {
              this.player.renderer.switchQuality(quality.index);
            }
            menu.remove();
          });
          menu.appendChild(item);
        });
      }
    } else {
      const noSupportItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: "Quality selection not available",
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noSupportItem);
    }
    button.appendChild(menu);
    this.attachMenuCloseHandler(menu, button);
  }
  createCaptionStyleButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-caption-style`,
      attributes: {
        "type": "button",
        "aria-label": "Caption styling",
        "aria-haspopup": "menu",
        "title": "Caption styling"
      }
    });
    const textIcon = DOMUtils.createElement("span", {
      textContent: "Aa",
      style: {
        fontSize: "14px",
        fontWeight: "bold"
      }
    });
    button.appendChild(textIcon);
    button.addEventListener("click", () => {
      this.showCaptionStyleMenu(button);
    });
    this.controls.captionStyle = button;
    return button;
  }
  showCaptionStyleMenu(button) {
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-caption-style-menu`);
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-caption-style-menu ${this.player.options.classPrefix}-menu ${this.player.options.classPrefix}-settings-menu`,
      attributes: {
        "role": "menu",
        "aria-label": "Caption styling"
      }
    });
    menu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
      const noTracksItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: "No captions available",
        style: { opacity: "0.5", cursor: "default", padding: "12px 16px" }
      });
      menu.appendChild(noTracksItem);
      button.appendChild(menu);
      this.attachMenuCloseHandler(menu, button, true);
      return;
    }
    const fontSizeGroup = this.createStyleControl(
      "Font Size",
      "captionsFontSize",
      [
        { label: "Small", value: "80%" },
        { label: "Medium", value: "100%" },
        { label: "Large", value: "120%" },
        { label: "X-Large", value: "150%" }
      ]
    );
    menu.appendChild(fontSizeGroup);
    const fontFamilyGroup = this.createStyleControl(
      "Font",
      "captionsFontFamily",
      [
        { label: "Sans-serif", value: "sans-serif" },
        { label: "Serif", value: "serif" },
        { label: "Monospace", value: "monospace" }
      ]
    );
    menu.appendChild(fontFamilyGroup);
    const colorGroup = this.createColorControl("Text Color", "captionsColor");
    menu.appendChild(colorGroup);
    const bgColorGroup = this.createColorControl("Background", "captionsBackgroundColor");
    menu.appendChild(bgColorGroup);
    const opacityGroup = this.createOpacityControl("Opacity", "captionsOpacity");
    menu.appendChild(opacityGroup);
    menu.style.minWidth = "220px";
    button.appendChild(menu);
    this.attachMenuCloseHandler(menu, button, true);
  }
  createStyleControl(label, property, options) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-style-group`
    });
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      style: {
        display: "block",
        fontSize: "12px",
        marginBottom: "4px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    group.appendChild(labelEl);
    const select = DOMUtils.createElement("select", {
      className: `${this.player.options.classPrefix}-style-select`,
      style: {
        width: "100%",
        padding: "6px",
        background: "var(--vidply-white)",
        border: "1px solid var(--vidply-white-10)",
        borderRadius: "4px",
        color: "var(--vidply-black)",
        fontSize: "13px"
      }
    });
    const currentValue = this.player.options[property];
    options.forEach((opt) => {
      const option = DOMUtils.createElement("option", {
        textContent: opt.label,
        attributes: { value: opt.value }
      });
      if (opt.value === currentValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    select.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    select.addEventListener("change", (e) => {
      e.stopPropagation();
      this.player.options[property] = e.target.value;
      if (this.player.captionManager) {
        this.player.captionManager.setCaptionStyle(
          property.replace("captions", "").charAt(0).toLowerCase() + property.replace("captions", "").slice(1),
          e.target.value
        );
      }
    });
    group.appendChild(select);
    return group;
  }
  createColorControl(label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-style-group`
    });
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      style: {
        display: "block",
        fontSize: "12px",
        marginBottom: "4px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    group.appendChild(labelEl);
    const input = DOMUtils.createElement("input", {
      attributes: {
        type: "color",
        value: this.player.options[property]
      },
      style: {
        width: "100%",
        height: "32px",
        padding: "2px",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "4px",
        cursor: "pointer"
      }
    });
    input.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("change", (e) => {
      e.stopPropagation();
      this.player.options[property] = e.target.value;
      if (this.player.captionManager) {
        this.player.captionManager.setCaptionStyle(
          property.replace("captions", "").charAt(0).toLowerCase() + property.replace("captions", "").slice(1),
          e.target.value
        );
      }
    });
    group.appendChild(input);
    return group;
  }
  createOpacityControl(label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-style-group`
    });
    const labelContainer = DOMUtils.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "4px"
      }
    });
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      style: {
        fontSize: "12px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    const valueEl = DOMUtils.createElement("span", {
      textContent: Math.round(this.player.options[property] * 100) + "%",
      style: {
        fontSize: "12px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    labelContainer.appendChild(labelEl);
    labelContainer.appendChild(valueEl);
    group.appendChild(labelContainer);
    const input = DOMUtils.createElement("input", {
      attributes: {
        type: "range",
        min: "0",
        max: "1",
        step: "0.1",
        value: String(this.player.options[property])
      },
      style: {
        width: "100%",
        cursor: "pointer"
      }
    });
    input.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("input", (e) => {
      e.stopPropagation();
      const value = parseFloat(e.target.value);
      valueEl.textContent = Math.round(value * 100) + "%";
      this.player.options[property] = value;
      if (this.player.captionManager) {
        this.player.captionManager.setCaptionStyle(
          property.replace("captions", "").charAt(0).toLowerCase() + property.replace("captions", "").slice(1),
          value
        );
      }
    });
    group.appendChild(input);
    return group;
  }
  createSpeedButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-speed`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.speed"),
        "aria-haspopup": "menu"
      }
    });
    button.appendChild(createIconElement("speed"));
    const speedText = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-speed-text`,
      textContent: "1x"
    });
    button.appendChild(speedText);
    button.addEventListener("click", () => {
      this.showSpeedMenu(button);
    });
    this.controls.speed = button;
    this.controls.speedText = speedText;
    return button;
  }
  showSpeedMenu(button) {
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-speed-menu`);
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-speed-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu"
      }
    });
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    speeds.forEach((speed) => {
      const item = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: i18n.t(`speeds.${speed}`) || `${speed}x`,
        attributes: {
          "type": "button",
          "role": "menuitem"
        }
      });
      if (speed === this.player.state.playbackSpeed) {
        item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
        item.appendChild(createIconElement("check"));
      }
      item.addEventListener("click", () => {
        this.player.setPlaybackSpeed(speed);
        menu.remove();
      });
      menu.appendChild(item);
    });
    button.appendChild(menu);
    this.attachMenuCloseHandler(menu, button);
  }
  createCaptionsButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-captions-button`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.captions"),
        "aria-pressed": "false",
        "aria-haspopup": "menu"
      }
    });
    button.appendChild(createIconElement("captionsOff"));
    button.addEventListener("click", () => {
      this.showCaptionsMenu(button);
    });
    this.controls.captions = button;
    return button;
  }
  showCaptionsMenu(button) {
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-captions-menu`);
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-captions-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu",
        "aria-label": i18n.t("captions.select")
      }
    });
    if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
      const noTracksItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: "No captions available",
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noTracksItem);
      button.appendChild(menu);
      this.attachMenuCloseHandler(menu, button);
      return;
    }
    const offItem = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-menu-item`,
      textContent: i18n.t("captions.off"),
      attributes: {
        "type": "button",
        "role": "menuitem"
      }
    });
    if (!this.player.state.captionsEnabled) {
      offItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
      offItem.appendChild(createIconElement("check"));
    }
    offItem.addEventListener("click", () => {
      this.player.disableCaptions();
      this.updateCaptionsButton();
      menu.remove();
    });
    menu.appendChild(offItem);
    const tracks = this.player.captionManager.getAvailableTracks();
    tracks.forEach((track) => {
      const item = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: track.label,
        attributes: {
          "type": "button",
          "role": "menuitem",
          "lang": track.language
        }
      });
      if (this.player.state.captionsEnabled && this.player.captionManager.currentTrack === this.player.captionManager.tracks[track.index]) {
        item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
        item.appendChild(createIconElement("check"));
      }
      item.addEventListener("click", () => {
        this.player.captionManager.switchTrack(track.index);
        this.updateCaptionsButton();
        menu.remove();
      });
      menu.appendChild(item);
    });
    button.appendChild(menu);
    this.attachMenuCloseHandler(menu, button);
  }
  updateCaptionsButton() {
    if (!this.controls.captions) return;
    const icon = this.controls.captions.querySelector(".vidply-icon");
    const isEnabled = this.player.state.captionsEnabled;
    icon.innerHTML = isEnabled ? createIconElement("captions").innerHTML : createIconElement("captionsOff").innerHTML;
    this.controls.captions.setAttribute("aria-pressed", isEnabled ? "true" : "false");
  }
  createTranscriptButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-transcript`,
      attributes: {
        "type": "button",
        "aria-label": "Toggle transcript",
        "aria-pressed": "false"
      }
    });
    button.appendChild(createIconElement("transcript"));
    button.addEventListener("click", () => {
      if (this.player.transcriptManager) {
        this.player.transcriptManager.toggleTranscript();
        this.updateTranscriptButton();
      }
    });
    this.controls.transcript = button;
    return button;
  }
  updateTranscriptButton() {
    if (!this.controls.transcript) return;
    const isVisible = this.player.transcriptManager && this.player.transcriptManager.isVisible;
    this.controls.transcript.setAttribute("aria-pressed", isVisible ? "true" : "false");
  }
  createAudioDescriptionButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-audio-description`,
      attributes: {
        "type": "button",
        "aria-label": "Audio description",
        "aria-pressed": "false",
        "title": "Toggle audio description"
      }
    });
    button.appendChild(createIconElement("audioDescription"));
    button.addEventListener("click", async () => {
      await this.player.toggleAudioDescription();
      this.updateAudioDescriptionButton();
    });
    this.controls.audioDescription = button;
    return button;
  }
  updateAudioDescriptionButton() {
    if (!this.controls.audioDescription) return;
    const icon = this.controls.audioDescription.querySelector(".vidply-icon");
    const isEnabled = this.player.state.audioDescriptionEnabled;
    icon.innerHTML = isEnabled ? createIconElement("audioDescriptionOn").innerHTML : createIconElement("audioDescription").innerHTML;
    this.controls.audioDescription.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    this.controls.audioDescription.setAttribute(
      "aria-label",
      isEnabled ? "Disable audio description" : "Enable audio description"
    );
  }
  createSignLanguageButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language`,
      attributes: {
        "type": "button",
        "aria-label": "Sign language video",
        "aria-pressed": "false",
        "title": "Toggle sign language video"
      }
    });
    button.appendChild(createIconElement("signLanguage"));
    button.addEventListener("click", () => {
      this.player.toggleSignLanguage();
      this.updateSignLanguageButton();
    });
    this.controls.signLanguage = button;
    return button;
  }
  updateSignLanguageButton() {
    if (!this.controls.signLanguage) return;
    const icon = this.controls.signLanguage.querySelector(".vidply-icon");
    const isEnabled = this.player.state.signLanguageEnabled;
    icon.innerHTML = isEnabled ? createIconElement("signLanguageOn").innerHTML : createIconElement("signLanguage").innerHTML;
    this.controls.signLanguage.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    this.controls.signLanguage.setAttribute(
      "aria-label",
      isEnabled ? "Hide sign language video" : "Show sign language video"
    );
  }
  createSettingsButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-settings`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.settings")
      }
    });
    button.appendChild(createIconElement("settings"));
    button.addEventListener("click", () => {
      this.player.showSettings();
    });
    return button;
  }
  createPipButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-pip`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.pip")
      }
    });
    button.appendChild(createIconElement("pip"));
    button.addEventListener("click", () => {
      this.player.togglePiP();
    });
    return button;
  }
  createFullscreenButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-fullscreen`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.fullscreen")
      }
    });
    button.appendChild(createIconElement("fullscreen"));
    button.addEventListener("click", () => {
      this.player.toggleFullscreen();
    });
    this.controls.fullscreen = button;
    return button;
  }
  attachEvents() {
    this.player.on("play", () => this.updatePlayPauseButton());
    this.player.on("pause", () => this.updatePlayPauseButton());
    this.player.on("timeupdate", () => this.updateProgress());
    this.player.on("loadedmetadata", () => this.updateDuration());
    this.player.on("volumechange", () => this.updateVolumeDisplay());
    this.player.on("progress", () => this.updateBuffered());
    this.player.on("playbackspeedchange", () => this.updateSpeedDisplay());
    this.player.on("fullscreenchange", () => this.updateFullscreenButton());
    this.player.on("captionsenabled", () => this.updateCaptionsButton());
    this.player.on("captionsdisabled", () => this.updateCaptionsButton());
    this.player.on("audiodescriptionenabled", () => this.updateAudioDescriptionButton());
    this.player.on("audiodescriptiondisabled", () => this.updateAudioDescriptionButton());
    this.player.on("signlanguageenabled", () => this.updateSignLanguageButton());
    this.player.on("signlanguagedisabled", () => this.updateSignLanguageButton());
  }
  updatePlayPauseButton() {
    if (!this.controls.playPause) return;
    const icon = this.controls.playPause.querySelector(".vidply-icon");
    const isPlaying = this.player.state.playing;
    icon.innerHTML = isPlaying ? createIconElement("pause").innerHTML : createIconElement("play").innerHTML;
    this.controls.playPause.setAttribute(
      "aria-label",
      isPlaying ? i18n.t("player.pause") : i18n.t("player.play")
    );
  }
  updateProgress() {
    if (!this.controls.played) return;
    const percent = this.player.state.currentTime / this.player.state.duration * 100;
    this.controls.played.style.width = `${percent}%`;
    this.controls.progress.setAttribute("aria-valuenow", String(Math.round(percent)));
    if (this.controls.currentTimeDisplay) {
      this.controls.currentTimeDisplay.textContent = TimeUtils.formatTime(this.player.state.currentTime);
    }
  }
  updateDuration() {
    if (this.controls.durationDisplay) {
      this.controls.durationDisplay.textContent = TimeUtils.formatTime(this.player.state.duration);
    }
  }
  updateVolumeDisplay() {
    if (!this.controls.volumeFill) return;
    const percent = this.player.state.volume * 100;
    this.controls.volumeFill.style.height = `${percent}%`;
    if (this.controls.mute) {
      const icon = this.controls.mute.querySelector(".vidply-icon");
      let iconName;
      if (this.player.state.muted || this.player.state.volume === 0) {
        iconName = "volumeMuted";
      } else if (this.player.state.volume < 0.3) {
        iconName = "volumeLow";
      } else if (this.player.state.volume < 0.7) {
        iconName = "volumeMedium";
      } else {
        iconName = "volumeHigh";
      }
      icon.innerHTML = createIconElement(iconName).innerHTML;
      this.controls.mute.setAttribute(
        "aria-label",
        this.player.state.muted ? i18n.t("player.unmute") : i18n.t("player.mute")
      );
    }
    if (this.controls.volumeSlider) {
      this.controls.volumeSlider.setAttribute("aria-valuenow", String(Math.round(percent)));
    }
  }
  updateBuffered() {
    if (!this.controls.buffered || !this.player.element.buffered || this.player.element.buffered.length === 0) return;
    const buffered = this.player.element.buffered.end(this.player.element.buffered.length - 1);
    const percent = buffered / this.player.state.duration * 100;
    this.controls.buffered.style.width = `${percent}%`;
  }
  updateSpeedDisplay() {
    if (this.controls.speedText) {
      this.controls.speedText.textContent = `${this.player.state.playbackSpeed}x`;
    }
  }
  updateFullscreenButton() {
    if (!this.controls.fullscreen) return;
    const icon = this.controls.fullscreen.querySelector(".vidply-icon");
    const isFullscreen = this.player.state.fullscreen;
    icon.innerHTML = isFullscreen ? createIconElement("fullscreenExit").innerHTML : createIconElement("fullscreen").innerHTML;
    this.controls.fullscreen.setAttribute(
      "aria-label",
      isFullscreen ? i18n.t("player.exitFullscreen") : i18n.t("player.fullscreen")
    );
  }
  setupAutoHide() {
    if (this.player.element.tagName !== "VIDEO") return;
    const showControls = () => {
      this.element.classList.add(`${this.player.options.classPrefix}-controls-visible`);
      this.player.state.controlsVisible = true;
      clearTimeout(this.hideTimeout);
      if (this.player.state.playing) {
        this.hideTimeout = setTimeout(() => {
          this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
          this.player.state.controlsVisible = false;
        }, this.player.options.hideControlsDelay);
      }
    };
    this.player.container.addEventListener("mousemove", showControls);
    this.player.container.addEventListener("touchstart", showControls);
    this.player.container.addEventListener("click", showControls);
    this.element.addEventListener("focusin", showControls);
    this.player.on("pause", () => {
      showControls();
      clearTimeout(this.hideTimeout);
    });
    this.player.on("play", () => {
      showControls();
    });
    showControls();
  }
  show() {
    this.element.style.display = "";
  }
  hide() {
    this.element.style.display = "none";
  }
  destroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
};

// src/controls/CaptionManager.js
var CaptionManager = class {
  constructor(player) {
    this.player = player;
    this.element = null;
    this.tracks = [];
    this.currentTrack = null;
    this.currentCue = null;
    this.init();
  }
  init() {
    this.createElement();
    this.loadTracks();
    this.attachEvents();
    if (this.player.options.captionsDefault && this.tracks.length > 0) {
      this.enable();
    }
  }
  createElement() {
    this.element = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-captions`,
      attributes: {
        "aria-live": "polite",
        "aria-atomic": "true",
        "role": "region",
        "aria-label": i18n.t("player.captions")
      }
    });
    this.updateStyles();
    const target = this.player.videoWrapper || this.player.container;
    target.appendChild(this.element);
  }
  loadTracks() {
    const textTracks = this.player.element.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        this.tracks.push({
          track,
          language: track.language,
          label: track.label,
          kind: track.kind,
          index: i
        });
        track.mode = "hidden";
      }
    }
  }
  attachEvents() {
    this.player.on("timeupdate", () => {
      this.updateCaptions();
    });
    this.player.on("captionschange", () => {
      this.updateStyles();
    });
  }
  enable(trackIndex = 0) {
    if (this.tracks.length === 0) {
      return;
    }
    if (this.currentTrack) {
      this.currentTrack.track.mode = "hidden";
    }
    const selectedTrack = this.tracks[trackIndex];
    if (selectedTrack) {
      selectedTrack.track.mode = "hidden";
      this.currentTrack = selectedTrack;
      this.player.state.captionsEnabled = true;
      if (this.cueChangeHandler) {
        selectedTrack.track.removeEventListener("cuechange", this.cueChangeHandler);
      }
      this.cueChangeHandler = () => {
        this.updateCaptions();
      };
      selectedTrack.track.addEventListener("cuechange", this.cueChangeHandler);
      this.element.style.display = "block";
      this.player.emit("captionsenabled", selectedTrack);
    }
  }
  disable() {
    if (this.currentTrack) {
      this.currentTrack.track.mode = "hidden";
      this.currentTrack = null;
    }
    this.element.style.display = "none";
    this.element.innerHTML = "";
    this.currentCue = null;
    this.player.state.captionsEnabled = false;
    this.player.emit("captionsdisabled");
  }
  updateCaptions() {
    if (!this.currentTrack) {
      return;
    }
    if (!this.currentTrack.track.activeCues) {
      return;
    }
    const activeCues = this.currentTrack.track.activeCues;
    if (activeCues.length > 0) {
      const cue = activeCues[0];
      if (this.currentCue !== cue) {
        this.currentCue = cue;
        let text = cue.text;
        text = this.parseVTTFormatting(text);
        this.element.innerHTML = DOMUtils.sanitizeHTML(text);
        this.element.style.display = "block";
        this.player.emit("captionchange", cue);
      }
    } else if (this.currentCue) {
      this.element.innerHTML = "";
      this.element.style.display = "none";
      this.currentCue = null;
    }
  }
  parseVTTFormatting(text) {
    text = text.replace(/<c[^>]*>(.*?)<\/c>/g, '<span class="caption-class">$1</span>');
    text = text.replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>");
    text = text.replace(/<i>(.*?)<\/i>/g, "<em>$1</em>");
    text = text.replace(/<u>(.*?)<\/u>/g, "<u>$1</u>");
    text = text.replace(/<v\s+([^>]+)>(.*?)<\/v>/g, '<span class="caption-voice" data-voice="$1">$2</span>');
    return text;
  }
  updateStyles() {
    if (!this.element) return;
    const options = this.player.options;
    this.element.style.fontSize = options.captionsFontSize;
    this.element.style.fontFamily = options.captionsFontFamily;
    this.element.style.color = options.captionsColor;
    this.element.style.backgroundColor = this.hexToRgba(
      options.captionsBackgroundColor,
      options.captionsOpacity
    );
  }
  hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }
    return hex;
  }
  setCaptionStyle(property, value) {
    switch (property) {
      case "fontSize":
        this.player.options.captionsFontSize = value;
        break;
      case "fontFamily":
        this.player.options.captionsFontFamily = value;
        break;
      case "color":
        this.player.options.captionsColor = value;
        break;
      case "backgroundColor":
        this.player.options.captionsBackgroundColor = value;
        break;
      case "opacity":
        this.player.options.captionsOpacity = value;
        break;
    }
    this.updateStyles();
    this.player.emit("captionschange");
  }
  getAvailableTracks() {
    return this.tracks.map((t, index) => ({
      index,
      language: t.language,
      label: t.label || t.language,
      kind: t.kind
    }));
  }
  switchTrack(trackIndex) {
    if (trackIndex >= 0 && trackIndex < this.tracks.length) {
      this.disable();
      this.enable(trackIndex);
    }
  }
  destroy() {
    this.disable();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
};

// src/controls/KeyboardManager.js
var KeyboardManager = class {
  constructor(player) {
    this.player = player;
    this.shortcuts = player.options.keyboardShortcuts;
    this.init();
  }
  init() {
    this.attachEvents();
  }
  attachEvents() {
    this.player.container.addEventListener("keydown", (e) => {
      this.handleKeydown(e);
    });
    if (!this.player.container.hasAttribute("tabindex")) {
      this.player.container.setAttribute("tabindex", "0");
    }
  }
  handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
      return;
    }
    const key = e.key;
    let handled = false;
    for (const [action, keys] of Object.entries(this.shortcuts)) {
      if (keys.includes(key)) {
        handled = this.executeAction(action, e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          this.announceAction(action);
          break;
        }
      }
    }
  }
  executeAction(action, event) {
    switch (action) {
      case "play-pause":
        this.player.toggle();
        return true;
      case "volume-up":
        this.player.setVolume(Math.min(1, this.player.state.volume + 0.1));
        return true;
      case "volume-down":
        this.player.setVolume(Math.max(0, this.player.state.volume - 0.1));
        return true;
      case "seek-forward":
        this.player.seekForward();
        return true;
      case "seek-backward":
        this.player.seekBackward();
        return true;
      case "seek-forward-large":
        this.player.seekForward(this.player.options.seekIntervalLarge);
        return true;
      case "seek-backward-large":
        this.player.seekBackward(this.player.options.seekIntervalLarge);
        return true;
      case "mute":
        this.player.toggleMute();
        return true;
      case "fullscreen":
        this.player.toggleFullscreen();
        return true;
      case "captions":
        if (this.player.captionManager && this.player.captionManager.tracks.length > 1) {
          const captionsButton = document.querySelector(".vidply-captions");
          if (captionsButton && this.player.controlBar) {
            this.player.controlBar.showCaptionsMenu(captionsButton);
          }
        } else {
          this.player.toggleCaptions();
        }
        return true;
      case "speed-up":
        this.player.setPlaybackSpeed(
          Math.min(2, this.player.state.playbackSpeed + 0.25)
        );
        return true;
      case "speed-down":
        this.player.setPlaybackSpeed(
          Math.max(0.25, this.player.state.playbackSpeed - 0.25)
        );
        return true;
      case "settings":
        this.player.showSettings();
        return true;
      default:
        return false;
    }
  }
  announceAction(action) {
    if (!this.player.options.screenReaderAnnouncements) return;
    let message = "";
    switch (action) {
      case "play-pause":
        message = this.player.state.playing ? "Playing" : "Paused";
        break;
      case "volume-up":
        message = `Volume ${Math.round(this.player.state.volume * 100)}%`;
        break;
      case "volume-down":
        message = `Volume ${Math.round(this.player.state.volume * 100)}%`;
        break;
      case "mute":
        message = this.player.state.muted ? "Muted" : "Unmuted";
        break;
      case "fullscreen":
        message = this.player.state.fullscreen ? "Fullscreen" : "Exit fullscreen";
        break;
      case "captions":
        message = this.player.state.captionsEnabled ? "Captions on" : "Captions off";
        break;
      case "speed-up":
      case "speed-down":
        message = `Speed ${this.player.state.playbackSpeed}x`;
        break;
    }
    if (message) {
      this.announce(message);
    }
  }
  announce(message, priority = "polite") {
    let announcer = document.getElementById("vidply-announcer");
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = "vidply-announcer";
      announcer.className = "vidply-sr-only";
      announcer.setAttribute("aria-live", priority);
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(announcer);
    }
    announcer.textContent = "";
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }
  updateShortcut(action, keys) {
    if (Array.isArray(keys)) {
      this.shortcuts[action] = keys;
    }
  }
  destroy() {
  }
};

// src/controls/SettingsDialog.js
var SettingsDialog = class {
  constructor(player) {
    this.player = player;
    this.element = null;
    this.isOpen = false;
    this.init();
  }
  init() {
    this.createElement();
  }
  createElement() {
    this.overlay = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-overlay`,
      attributes: {
        "role": "dialog",
        "aria-modal": "true",
        "aria-label": i18n.t("settings.title")
      }
    });
    this.overlay.style.display = "none";
    this.element = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-dialog`
    });
    const header = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-header`
    });
    const title = DOMUtils.createElement("h2", {
      textContent: i18n.t("settings.title"),
      attributes: {
        "id": `${this.player.options.classPrefix}-settings-title`
      }
    });
    const closeButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-settings-close`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("settings.close")
      }
    });
    closeButton.appendChild(createIconElement("close"));
    closeButton.addEventListener("click", () => this.hide());
    header.appendChild(title);
    header.appendChild(closeButton);
    const content = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-content`
    });
    content.appendChild(this.createSpeedSettings());
    if (this.player.captionManager && this.player.captionManager.tracks.length > 0) {
      content.appendChild(this.createCaptionSettings());
    }
    const footer = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-footer`
    });
    const resetButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button`,
      textContent: i18n.t("settings.reset"),
      attributes: {
        "type": "button"
      }
    });
    resetButton.addEventListener("click", () => this.resetSettings());
    footer.appendChild(resetButton);
    this.element.appendChild(header);
    this.element.appendChild(content);
    this.element.appendChild(footer);
    this.overlay.appendChild(this.element);
    this.player.container.appendChild(this.overlay);
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.hide();
      }
    });
  }
  createSpeedSettings() {
    const section = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-section`
    });
    const label = DOMUtils.createElement("label", {
      textContent: i18n.t("settings.speed"),
      attributes: {
        "for": `${this.player.options.classPrefix}-speed-select`
      }
    });
    const select = DOMUtils.createElement("select", {
      className: `${this.player.options.classPrefix}-settings-select`,
      attributes: {
        "id": `${this.player.options.classPrefix}-speed-select`
      }
    });
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    speeds.forEach((speed) => {
      const option = DOMUtils.createElement("option", {
        textContent: i18n.t(`speeds.${speed}`) || `${speed}x`,
        attributes: {
          "value": String(speed)
        }
      });
      if (speed === this.player.state.playbackSpeed) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("change", (e) => {
      this.player.setPlaybackSpeed(parseFloat(e.target.value));
    });
    section.appendChild(label);
    section.appendChild(select);
    return section;
  }
  createCaptionSettings() {
    const section = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-section`
    });
    const heading = DOMUtils.createElement("h3", {
      textContent: i18n.t("settings.captions")
    });
    section.appendChild(heading);
    const trackLabel = DOMUtils.createElement("label", {
      textContent: i18n.t("captions.select"),
      attributes: {
        "for": `${this.player.options.classPrefix}-caption-track-select`
      }
    });
    const trackSelect = DOMUtils.createElement("select", {
      className: `${this.player.options.classPrefix}-settings-select`,
      attributes: {
        "id": `${this.player.options.classPrefix}-caption-track-select`
      }
    });
    const offOption = DOMUtils.createElement("option", {
      textContent: i18n.t("captions.off"),
      attributes: { "value": "-1" }
    });
    trackSelect.appendChild(offOption);
    const tracks = this.player.captionManager.getAvailableTracks();
    tracks.forEach((track) => {
      const option = DOMUtils.createElement("option", {
        textContent: track.label,
        attributes: { "value": String(track.index) }
      });
      trackSelect.appendChild(option);
    });
    trackSelect.addEventListener("change", (e) => {
      const index = parseInt(e.target.value);
      if (index === -1) {
        this.player.disableCaptions();
      } else {
        this.player.captionManager.switchTrack(index);
      }
    });
    section.appendChild(trackLabel);
    section.appendChild(trackSelect);
    section.appendChild(this.createCaptionStyleControl("fontSize", i18n.t("captions.fontSize"), [
      { label: "Small", value: "80%" },
      { label: "Medium", value: "100%" },
      { label: "Large", value: "120%" },
      { label: "X-Large", value: "150%" }
    ]));
    section.appendChild(this.createCaptionStyleControl("fontFamily", i18n.t("captions.fontFamily"), [
      { label: "Sans-serif", value: "sans-serif" },
      { label: "Serif", value: "serif" },
      { label: "Monospace", value: "monospace" }
    ]));
    section.appendChild(this.createColorControl("color", i18n.t("captions.color")));
    section.appendChild(this.createColorControl("backgroundColor", i18n.t("captions.backgroundColor")));
    section.appendChild(this.createRangeControl("opacity", i18n.t("captions.opacity"), 0, 1, 0.1));
    return section;
  }
  createCaptionStyleControl(property, label, options) {
    const wrapper = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-control`
    });
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": `${this.player.options.classPrefix}-caption-${property}`
      }
    });
    const select = DOMUtils.createElement("select", {
      className: `${this.player.options.classPrefix}-settings-select`,
      attributes: {
        "id": `${this.player.options.classPrefix}-caption-${property}`
      }
    });
    options.forEach((opt) => {
      const option = DOMUtils.createElement("option", {
        textContent: opt.label,
        attributes: { "value": opt.value }
      });
      if (opt.value === this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`]) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("change", (e) => {
      this.player.captionManager.setCaptionStyle(property, e.target.value);
    });
    wrapper.appendChild(labelEl);
    wrapper.appendChild(select);
    return wrapper;
  }
  createColorControl(property, label) {
    const wrapper = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-control`
    });
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": `${this.player.options.classPrefix}-caption-${property}`
      }
    });
    const input = DOMUtils.createElement("input", {
      className: `${this.player.options.classPrefix}-settings-color`,
      attributes: {
        "type": "color",
        "id": `${this.player.options.classPrefix}-caption-${property}`,
        "value": this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`]
      }
    });
    input.addEventListener("change", (e) => {
      this.player.captionManager.setCaptionStyle(property, e.target.value);
    });
    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
  }
  createRangeControl(property, label, min, max, step) {
    const wrapper = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-settings-control`
    });
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": `${this.player.options.classPrefix}-caption-${property}`
      }
    });
    const input = DOMUtils.createElement("input", {
      className: `${this.player.options.classPrefix}-settings-range`,
      attributes: {
        "type": "range",
        "id": `${this.player.options.classPrefix}-caption-${property}`,
        "min": String(min),
        "max": String(max),
        "step": String(step),
        "value": String(this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`])
      }
    });
    const valueDisplay = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-settings-value`,
      textContent: String(this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`])
    });
    input.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = value.toFixed(1);
      this.player.captionManager.setCaptionStyle(property, value);
    });
    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    wrapper.appendChild(valueDisplay);
    return wrapper;
  }
  resetSettings() {
    this.player.setPlaybackSpeed(1);
    if (this.player.captionManager) {
      this.player.captionManager.setCaptionStyle("fontSize", "100%");
      this.player.captionManager.setCaptionStyle("fontFamily", "sans-serif");
      this.player.captionManager.setCaptionStyle("color", "#FFFFFF");
      this.player.captionManager.setCaptionStyle("backgroundColor", "#000000");
      this.player.captionManager.setCaptionStyle("opacity", 0.8);
    }
    this.hide();
    setTimeout(() => this.show(), 100);
  }
  show() {
    this.overlay.style.display = "flex";
    this.isOpen = true;
    const closeButton = this.element.querySelector(`.${this.player.options.classPrefix}-settings-close`);
    if (closeButton) {
      closeButton.focus();
    }
    this.player.emit("settingsopen");
  }
  hide() {
    this.overlay.style.display = "none";
    this.isOpen = false;
    this.player.container.focus();
    this.player.emit("settingsclose");
  }
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
};

// src/controls/TranscriptManager.js
var TranscriptManager = class {
  constructor(player) {
    this.player = player;
    this.transcriptWindow = null;
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    this.isVisible = false;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.handlers = {
      timeupdate: () => this.updateActiveEntry(),
      resize: null,
      mousemove: null,
      mouseup: null,
      touchmove: null,
      touchend: null,
      mousedown: null,
      touchstart: null,
      keydown: null
    };
    this.init();
  }
  init() {
    this.player.on("timeupdate", this.handlers.timeupdate);
  }
  /**
   * Toggle transcript window visibility
   */
  toggleTranscript() {
    if (this.isVisible) {
      this.hideTranscript();
    } else {
      this.showTranscript();
    }
  }
  /**
   * Show transcript window
   */
  showTranscript() {
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = "flex";
      this.isVisible = true;
      return;
    }
    this.createTranscriptWindow();
    this.loadTranscriptData();
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = "flex";
      setTimeout(() => this.positionTranscript(), 0);
    }
    this.isVisible = true;
  }
  /**
   * Hide transcript window
   */
  hideTranscript() {
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = "none";
      this.isVisible = false;
    }
  }
  /**
   * Create the transcript window UI
   */
  createTranscriptWindow() {
    this.transcriptWindow = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-window`,
      attributes: {
        "role": "dialog",
        "aria-label": "Video Transcript",
        "tabindex": "-1"
      }
    });
    this.transcriptHeader = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-header`,
      attributes: {
        "aria-label": "Drag to reposition transcript. Use arrow keys to move, Home to reset position, Escape to close.",
        "tabindex": "0"
      }
    });
    const title = DOMUtils.createElement("h3", {
      textContent: "Transcript"
    });
    const closeButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-transcript-close`,
      attributes: {
        "type": "button",
        "aria-label": "Close transcript"
      }
    });
    closeButton.appendChild(createIconElement("close"));
    closeButton.addEventListener("click", () => this.hideTranscript());
    this.transcriptHeader.appendChild(title);
    this.transcriptHeader.appendChild(closeButton);
    this.transcriptContent = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-content`
    });
    this.transcriptWindow.appendChild(this.transcriptHeader);
    this.transcriptWindow.appendChild(this.transcriptContent);
    this.player.container.appendChild(this.transcriptWindow);
    this.positionTranscript();
    this.setupDragAndDrop();
    let resizeTimeout;
    this.handlers.resize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.positionTranscript(), 100);
    };
    window.addEventListener("resize", this.handlers.resize);
  }
  /**
   * Position transcript window next to video
   */
  positionTranscript() {
    if (!this.transcriptWindow || !this.player.videoWrapper || !this.isVisible) return;
    const videoRect = this.player.videoWrapper.getBoundingClientRect();
    const leftOffset = videoRect.width + 8;
    const height = videoRect.height;
    this.transcriptWindow.style.left = `${leftOffset}px`;
    this.transcriptWindow.style.height = `${height}px`;
  }
  /**
   * Load transcript data from caption/subtitle tracks
   */
  loadTranscriptData() {
    this.transcriptEntries = [];
    this.transcriptContent.innerHTML = "";
    const textTracks = Array.from(this.player.element.textTracks);
    const transcriptTrack = textTracks.find(
      (track) => track.kind === "captions" || track.kind === "subtitles"
    );
    if (!transcriptTrack) {
      this.showNoTranscriptMessage();
      return;
    }
    if (transcriptTrack.mode === "disabled") {
      transcriptTrack.mode = "hidden";
    }
    if (!transcriptTrack.cues || transcriptTrack.cues.length === 0) {
      const loadingMessage = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: "Loading transcript..."
      });
      this.transcriptContent.appendChild(loadingMessage);
      const onLoad = () => {
        this.loadTranscriptData();
      };
      transcriptTrack.addEventListener("load", onLoad, { once: true });
      setTimeout(() => {
        if (transcriptTrack.cues && transcriptTrack.cues.length > 0) {
          this.loadTranscriptData();
        }
      }, 500);
      return;
    }
    const cues = Array.from(transcriptTrack.cues);
    cues.forEach((cue, index) => {
      const entry = this.createTranscriptEntry(cue, index);
      this.transcriptEntries.push({
        element: entry,
        cue,
        startTime: cue.startTime,
        endTime: cue.endTime
      });
      this.transcriptContent.appendChild(entry);
    });
  }
  /**
   * Create a single transcript entry element
   */
  createTranscriptEntry(cue, index) {
    const entry = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-entry`,
      attributes: {
        "data-start": String(cue.startTime),
        "data-end": String(cue.endTime),
        "role": "button",
        "tabindex": "0"
      }
    });
    const timestamp = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-transcript-time`,
      textContent: TimeUtils.formatTime(cue.startTime)
    });
    const text = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-transcript-text`,
      textContent: this.stripVTTFormatting(cue.text)
    });
    entry.appendChild(timestamp);
    entry.appendChild(text);
    const seekToTime = () => {
      this.player.seek(cue.startTime);
      if (this.player.state.paused) {
        this.player.play();
      }
    };
    entry.addEventListener("click", seekToTime);
    entry.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        seekToTime();
      }
    });
    return entry;
  }
  /**
   * Strip VTT formatting tags from text
   */
  stripVTTFormatting(text) {
    return text.replace(/<[^>]+>/g, "").replace(/\n/g, " ").trim();
  }
  /**
   * Show message when no transcript is available
   */
  showNoTranscriptMessage() {
    const message = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-empty`,
      textContent: "No transcript available for this video."
    });
    this.transcriptContent.appendChild(message);
  }
  /**
   * Update active transcript entry based on current time
   */
  updateActiveEntry() {
    if (!this.isVisible || this.transcriptEntries.length === 0) return;
    const currentTime = this.player.state.currentTime;
    const activeEntry = this.transcriptEntries.find(
      (entry) => currentTime >= entry.startTime && currentTime < entry.endTime
    );
    if (activeEntry && activeEntry !== this.currentActiveEntry) {
      if (this.currentActiveEntry) {
        this.currentActiveEntry.element.classList.remove(
          `${this.player.options.classPrefix}-transcript-entry-active`
        );
      }
      activeEntry.element.classList.add(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      this.scrollToEntry(activeEntry.element);
      this.currentActiveEntry = activeEntry;
    } else if (!activeEntry && this.currentActiveEntry) {
      this.currentActiveEntry.element.classList.remove(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      this.currentActiveEntry = null;
    }
  }
  /**
   * Scroll transcript window to show active entry
   */
  scrollToEntry(entryElement) {
    if (!this.transcriptContent) return;
    const contentRect = this.transcriptContent.getBoundingClientRect();
    const entryRect = entryElement.getBoundingClientRect();
    if (entryRect.top < contentRect.top || entryRect.bottom > contentRect.bottom) {
      const scrollTop = entryElement.offsetTop - this.transcriptContent.clientHeight / 2 + entryElement.clientHeight / 2;
      this.transcriptContent.scrollTo({
        top: scrollTop,
        behavior: "smooth"
      });
    }
  }
  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    if (!this.transcriptHeader || !this.transcriptWindow) return;
    this.handlers.mousedown = (e) => {
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-close`)) {
        return;
      }
      this.startDragging(e.clientX, e.clientY);
      e.preventDefault();
    };
    this.handlers.mousemove = (e) => {
      if (this.isDragging) {
        this.drag(e.clientX, e.clientY);
      }
    };
    this.handlers.mouseup = () => {
      if (this.isDragging) {
        this.stopDragging();
      }
    };
    this.handlers.touchstart = (e) => {
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-close`)) {
        return;
      }
      const touch = e.touches[0];
      this.startDragging(touch.clientX, touch.clientY);
    };
    this.handlers.touchmove = (e) => {
      if (this.isDragging) {
        const touch = e.touches[0];
        this.drag(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    };
    this.handlers.touchend = () => {
      if (this.isDragging) {
        this.stopDragging();
      }
    };
    this.handlers.keydown = (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Escape"].includes(e.key)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Home") {
        this.resetPosition();
        return;
      }
      if (e.key === "Escape") {
        this.hideTranscript();
        return;
      }
      const step = e.shiftKey ? 50 : 10;
      let currentLeft = parseFloat(this.transcriptWindow.style.left) || 0;
      let currentTop = parseFloat(this.transcriptWindow.style.top) || 0;
      const computedStyle = window.getComputedStyle(this.transcriptWindow);
      if (computedStyle.transform !== "none") {
        const rect = this.transcriptWindow.getBoundingClientRect();
        currentLeft = rect.left;
        currentTop = rect.top;
        this.transcriptWindow.style.transform = "none";
        this.transcriptWindow.style.left = `${currentLeft}px`;
        this.transcriptWindow.style.top = `${currentTop}px`;
      }
      let newX = currentLeft;
      let newY = currentTop;
      switch (e.key) {
        case "ArrowLeft":
          newX -= step;
          break;
        case "ArrowRight":
          newX += step;
          break;
        case "ArrowUp":
          newY -= step;
          break;
        case "ArrowDown":
          newY += step;
          break;
      }
      this.transcriptWindow.style.left = `${newX}px`;
      this.transcriptWindow.style.top = `${newY}px`;
    };
    this.transcriptHeader.addEventListener("mousedown", this.handlers.mousedown);
    document.addEventListener("mousemove", this.handlers.mousemove);
    document.addEventListener("mouseup", this.handlers.mouseup);
    this.transcriptHeader.addEventListener("touchstart", this.handlers.touchstart);
    document.addEventListener("touchmove", this.handlers.touchmove);
    document.addEventListener("touchend", this.handlers.touchend);
    this.transcriptHeader.addEventListener("keydown", this.handlers.keydown);
  }
  /**
   * Start dragging
   */
  startDragging(clientX, clientY) {
    const rect = this.transcriptWindow.getBoundingClientRect();
    const containerRect = this.player.container.getBoundingClientRect();
    const relativeLeft = rect.left - containerRect.left;
    const relativeTop = rect.top - containerRect.top;
    const computedStyle = window.getComputedStyle(this.transcriptWindow);
    if (computedStyle.transform !== "none") {
      this.transcriptWindow.style.transform = "none";
      this.transcriptWindow.style.left = `${relativeLeft}px`;
      this.transcriptWindow.style.top = `${relativeTop}px`;
    }
    this.dragOffsetX = clientX - rect.left;
    this.dragOffsetY = clientY - rect.top;
    this.isDragging = true;
    this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-dragging`);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }
  /**
   * Perform drag
   */
  drag(clientX, clientY) {
    if (!this.isDragging) return;
    const newViewportX = clientX - this.dragOffsetX;
    const newViewportY = clientY - this.dragOffsetY;
    const containerRect = this.player.container.getBoundingClientRect();
    const newX = newViewportX - containerRect.left;
    const newY = newViewportY - containerRect.top;
    this.transcriptWindow.style.left = `${newX}px`;
    this.transcriptWindow.style.top = `${newY}px`;
  }
  /**
   * Stop dragging
   */
  stopDragging() {
    this.isDragging = false;
    this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-dragging`);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }
  /**
   * Set window position with boundary constraints
   */
  setPosition(x, y) {
    const rect = this.transcriptWindow.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const minVisible = 100;
    const minX = -(rect.width - minVisible);
    const minY = -(rect.height - minVisible);
    const maxX = viewportWidth - minVisible;
    const maxY = viewportHeight - minVisible;
    x = Math.max(minX, Math.min(x, maxX));
    y = Math.max(minY, Math.min(y, maxY));
    this.transcriptWindow.style.left = `${x}px`;
    this.transcriptWindow.style.top = `${y}px`;
    this.transcriptWindow.style.transform = "none";
  }
  /**
   * Reset position to center
   */
  resetPosition() {
    this.transcriptWindow.style.left = "50%";
    this.transcriptWindow.style.top = "50%";
    this.transcriptWindow.style.transform = "translate(-50%, -50%)";
  }
  /**
   * Cleanup
   */
  destroy() {
    if (this.handlers.timeupdate) {
      this.player.off("timeupdate", this.handlers.timeupdate);
    }
    if (this.transcriptHeader) {
      if (this.handlers.mousedown) {
        this.transcriptHeader.removeEventListener("mousedown", this.handlers.mousedown);
      }
      if (this.handlers.touchstart) {
        this.transcriptHeader.removeEventListener("touchstart", this.handlers.touchstart);
      }
      if (this.handlers.keydown) {
        this.transcriptHeader.removeEventListener("keydown", this.handlers.keydown);
      }
    }
    if (this.handlers.mousemove) {
      document.removeEventListener("mousemove", this.handlers.mousemove);
    }
    if (this.handlers.mouseup) {
      document.removeEventListener("mouseup", this.handlers.mouseup);
    }
    if (this.handlers.touchmove) {
      document.removeEventListener("touchmove", this.handlers.touchmove);
    }
    if (this.handlers.touchend) {
      document.removeEventListener("touchend", this.handlers.touchend);
    }
    if (this.handlers.resize) {
      window.removeEventListener("resize", this.handlers.resize);
    }
    this.handlers = null;
    if (this.transcriptWindow && this.transcriptWindow.parentNode) {
      this.transcriptWindow.parentNode.removeChild(this.transcriptWindow);
    }
    this.transcriptWindow = null;
    this.transcriptHeader = null;
    this.transcriptContent = null;
    this.transcriptEntries = [];
  }
};

// src/core/Player.js
init_HTML5Renderer();

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
    this.videoId = this.extractVideoId(this.player.element.src);
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
    this.iframe.style.height = "100%";
    this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
  }
  async initializePlayer() {
    return new Promise((resolve) => {
      this.youtube = new window.YT.Player(this.iframe.id, {
        videoId: this.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
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
      this.youtube.playVideo();
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

// src/renderers/VimeoRenderer.js
var VimeoRenderer = class {
  constructor(player) {
    this.player = player;
    this.vimeo = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }
  async init() {
    this.videoId = this.extractVideoId(this.player.element.src);
    if (!this.videoId) {
      throw new Error("Invalid Vimeo URL");
    }
    await this.loadVimeoAPI();
    this.createIframe();
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
    if (window.Vimeo && window.Vimeo.Player) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Vimeo API"));
      document.head.appendChild(script);
    });
  }
  createIframe() {
    this.player.element.style.display = "none";
    this.iframe = document.createElement("div");
    this.iframe.id = `vimeo-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
  }
  async initializePlayer() {
    const options = {
      id: this.videoId,
      width: "100%",
      height: "100%",
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
    await this.vimeo.ready();
    this.isReady = true;
    this.attachEvents();
    try {
      const duration = await this.vimeo.getDuration();
      this.player.state.duration = duration;
      this.player.emit("loadedmetadata");
    } catch (error) {
      this.player.log("Error getting duration:", error, "warn");
    }
  }
  attachEvents() {
    this.vimeo.on("play", () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit("play");
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });
    this.vimeo.on("pause", () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit("pause");
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });
    this.vimeo.on("ended", () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit("ended");
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
    });
    this.vimeo.on("timeupdate", (data) => {
      this.player.state.currentTime = data.seconds;
      this.player.state.duration = data.duration;
      this.player.emit("timeupdate", data.seconds);
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, data.seconds);
      }
    });
    this.vimeo.on("volumechange", (data) => {
      this.player.state.volume = data.volume;
      this.player.emit("volumechange", data.volume);
    });
    this.vimeo.on("bufferstart", () => {
      this.player.state.buffering = true;
      this.player.emit("waiting");
    });
    this.vimeo.on("bufferend", () => {
      this.player.state.buffering = false;
      this.player.emit("canplay");
    });
    this.vimeo.on("seeking", () => {
      this.player.state.seeking = true;
      this.player.emit("seeking");
    });
    this.vimeo.on("seeked", () => {
      this.player.state.seeking = false;
      this.player.emit("seeked");
    });
    this.vimeo.on("playbackratechange", (data) => {
      this.player.state.playbackSpeed = data.playbackRate;
      this.player.emit("ratechange", data.playbackRate);
    });
    this.vimeo.on("error", (error) => {
      this.player.handleError(new Error(`Vimeo error: ${error.message}`));
    });
  }
  play() {
    if (this.isReady && this.vimeo) {
      this.vimeo.play().catch((error) => {
        this.player.log("Play error:", error, "warn");
      });
    }
  }
  pause() {
    if (this.isReady && this.vimeo) {
      this.vimeo.pause().catch((error) => {
        this.player.log("Pause error:", error, "warn");
      });
    }
  }
  seek(time) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setCurrentTime(time).catch((error) => {
        this.player.log("Seek error:", error, "warn");
      });
    }
  }
  setVolume(volume) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setVolume(volume).catch((error) => {
        this.player.log("Volume error:", error, "warn");
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
      this.vimeo.setPlaybackRate(speed).catch((error) => {
        this.player.log("Playback rate error:", error, "warn");
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
    if (this.player.element) {
      this.player.element.style.display = "";
    }
  }
};

// src/renderers/HLSRenderer.js
var HLSRenderer = class {
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.hls = null;
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
    const video = document.createElement("video");
    return video.canPlayType("application/vnd.apple.mpegurl") !== "";
  }
  async initNative() {
    const HTML5Renderer2 = (await Promise.resolve().then(() => (init_HTML5Renderer(), HTML5Renderer_exports))).HTML5Renderer;
    const renderer = new HTML5Renderer2(this.player);
    await renderer.init();
    Object.getOwnPropertyNames(Object.getPrototypeOf(renderer)).forEach((method) => {
      if (method !== "constructor" && typeof renderer[method] === "function") {
        this[method] = renderer[method].bind(renderer);
      }
    });
  }
  async initHlsJs() {
    var _a;
    if (!window.Hls) {
      await this.loadHlsJs();
    }
    if (!window.Hls.isSupported()) {
      throw new Error("HLS is not supported in this browser");
    }
    this.hls = new window.Hls({
      debug: this.player.options.debug,
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90
    });
    this.hls.attachMedia(this.media);
    const src = this.player.element.src || ((_a = this.player.element.querySelector("source")) == null ? void 0 : _a.src);
    this.hls.loadSource(src);
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
    });
    this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
      this.player.log("HLS level switched to " + data.level);
      this.player.emit("hlslevelswitched", data);
    });
    this.hls.on(window.Hls.Events.ERROR, (event, data) => {
      this.handleHlsError(data);
    });
    this.hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
      this.player.state.buffering = false;
    });
  }
  attachMediaEvents() {
    this.media.addEventListener("loadedmetadata", () => {
      this.player.state.duration = this.media.duration;
      this.player.emit("loadedmetadata");
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
    if (data.fatal) {
      switch (data.type) {
        case window.Hls.ErrorTypes.NETWORK_ERROR:
          this.player.log("Fatal network error, trying to recover...", "error");
          this.hls.startLoad();
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
  play() {
    const promise = this.media.play();
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
};

// src/core/Player.js
var Player = class extends EventEmitter {
  constructor(element, options = {}) {
    super();
    this.element = typeof element === "string" ? document.querySelector(element) : element;
    if (!this.element) {
      throw new Error("VidPly: Element not found");
    }
    if (this.element.tagName !== "VIDEO" && this.element.tagName !== "AUDIO") {
      const mediaType = options.mediaType || "video";
      const mediaElement = document.createElement(mediaType);
      Array.from(this.element.attributes).forEach((attr) => {
        if (attr.name !== "id" && attr.name !== "class" && !attr.name.startsWith("data-")) {
          mediaElement.setAttribute(attr.name, attr.value);
        }
      });
      const tracks = this.element.querySelectorAll("track");
      tracks.forEach((track) => {
        mediaElement.appendChild(track.cloneNode(true));
      });
      this.element.innerHTML = "";
      this.element.appendChild(mediaElement);
      this.element = mediaElement;
    }
    this.options = {
      // Display
      width: null,
      height: null,
      poster: null,
      responsive: true,
      fillContainer: false,
      // Playback
      autoplay: false,
      loop: false,
      muted: false,
      volume: 0.8,
      playbackSpeed: 1,
      preload: "metadata",
      startTime: 0,
      // Controls
      controls: true,
      hideControlsDelay: 3e3,
      playPauseButton: true,
      progressBar: true,
      currentTime: true,
      duration: true,
      volumeControl: true,
      muteButton: true,
      chaptersButton: true,
      qualityButton: true,
      captionStyleButton: true,
      speedButton: true,
      captionsButton: true,
      transcriptButton: true,
      fullscreenButton: true,
      pipButton: true,
      // Seeking
      seekInterval: 10,
      seekIntervalLarge: 30,
      // Captions
      captions: true,
      captionsDefault: false,
      captionsFontSize: "100%",
      captionsFontFamily: "sans-serif",
      captionsColor: "#FFFFFF",
      captionsBackgroundColor: "#000000",
      captionsOpacity: 0.8,
      // Audio Description
      audioDescription: true,
      audioDescriptionSrc: null,
      // URL to audio-described version
      audioDescriptionButton: true,
      // Sign Language
      signLanguage: true,
      signLanguageSrc: null,
      // URL to sign language video
      signLanguageButton: true,
      signLanguagePosition: "bottom-right",
      // Position: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
      // Transcripts
      transcript: false,
      transcriptPosition: "external",
      transcriptContainer: null,
      // Keyboard
      keyboard: true,
      keyboardShortcuts: {
        "play-pause": [" ", "p", "k"],
        "volume-up": ["ArrowUp"],
        "volume-down": ["ArrowDown"],
        "seek-forward": ["ArrowRight", "f"],
        "seek-backward": ["ArrowLeft", "r"],
        "seek-forward-large": ["l"],
        "seek-backward-large": ["j"],
        "mute": ["m"],
        "fullscreen": ["f"],
        "captions": ["c"],
        "speed-up": [">"],
        "speed-down": ["<"],
        "settings": ["s"]
      },
      // Accessibility
      ariaLabels: {},
      screenReaderAnnouncements: true,
      highContrast: false,
      focusHighlight: true,
      // Languages
      language: "en",
      languages: ["en"],
      // Advanced
      debug: false,
      classPrefix: "vidply",
      iconType: "svg",
      pauseOthersOnPlay: true,
      // Callbacks
      onReady: null,
      onPlay: null,
      onPause: null,
      onEnded: null,
      onTimeUpdate: null,
      onVolumeChange: null,
      onError: null,
      ...options
    };
    this.state = {
      ready: false,
      playing: false,
      paused: true,
      ended: false,
      buffering: false,
      seeking: false,
      muted: this.options.muted,
      volume: this.options.volume,
      currentTime: 0,
      duration: 0,
      playbackSpeed: this.options.playbackSpeed,
      fullscreen: false,
      pip: false,
      captionsEnabled: this.options.captionsDefault,
      currentCaption: null,
      controlsVisible: true,
      audioDescriptionEnabled: false,
      signLanguageEnabled: false
    };
    this.originalSrc = null;
    this.audioDescriptionSrc = this.options.audioDescriptionSrc;
    this.signLanguageSrc = this.options.signLanguageSrc;
    this.signLanguageVideo = null;
    this.container = null;
    this.renderer = null;
    this.controlBar = null;
    this.captionManager = null;
    this.keyboardManager = null;
    this.settingsDialog = null;
    this.init();
  }
  async init() {
    var _a;
    try {
      this.log("Initializing VidPly player");
      i18n.setLanguage(this.options.language);
      this.createContainer();
      const src = this.element.src || ((_a = this.element.querySelector("source")) == null ? void 0 : _a.src);
      if (src) {
        await this.initializeRenderer();
      } else {
        this.log("No initial source - waiting for playlist or manual load");
      }
      if (this.options.controls) {
        this.controlBar = new ControlBar(this);
        this.videoWrapper.appendChild(this.controlBar.element);
      }
      if (this.options.captions) {
        this.captionManager = new CaptionManager(this);
      }
      if (this.options.transcript || this.options.transcriptButton) {
        this.transcriptManager = new TranscriptManager(this);
      }
      if (this.options.keyboard) {
        this.keyboardManager = new KeyboardManager(this);
      }
      if (this.options.settingsButton) {
        this.settingsDialog = new SettingsDialog(this);
      }
      if (this.options.startTime > 0) {
        this.seek(this.options.startTime);
      }
      if (this.options.muted) {
        this.mute();
      }
      if (this.options.volume !== 0.8) {
        this.setVolume(this.options.volume);
      }
      this.state.ready = true;
      this.emit("ready");
      if (this.options.onReady) {
        this.options.onReady.call(this);
      }
      if (this.options.autoplay) {
        this.play();
      }
      this.log("Player initialized successfully");
    } catch (error) {
      this.handleError(error);
    }
  }
  createContainer() {
    this.container = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-player`,
      attributes: {
        "role": "region",
        "aria-label": i18n.t("player.label"),
        "tabindex": "-1"
      }
    });
    const mediaType = this.element.tagName.toLowerCase();
    this.container.classList.add(`${this.options.classPrefix}-${mediaType}`);
    if (this.options.responsive) {
      this.container.classList.add(`${this.options.classPrefix}-responsive`);
    }
    this.videoWrapper = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-video-wrapper`
    });
    this.element.parentNode.insertBefore(this.container, this.element);
    this.container.appendChild(this.videoWrapper);
    this.videoWrapper.appendChild(this.element);
    this.element.style.width = "100%";
    this.element.style.height = "100%";
    if (this.options.width) {
      this.container.style.width = typeof this.options.width === "number" ? `${this.options.width}px` : this.options.width;
    }
    if (this.options.height) {
      this.container.style.height = typeof this.options.height === "number" ? `${this.options.height}px` : this.options.height;
    }
    if (this.options.poster && this.element.tagName === "VIDEO") {
      this.element.poster = this.options.poster;
    }
  }
  async initializeRenderer() {
    var _a;
    const src = this.element.src || ((_a = this.element.querySelector("source")) == null ? void 0 : _a.src);
    if (!src) {
      throw new Error("No media source found");
    }
    if (!this.originalSrc) {
      this.originalSrc = src;
    }
    let renderer;
    if (src.includes("youtube.com") || src.includes("youtu.be")) {
      renderer = YouTubeRenderer;
    } else if (src.includes("vimeo.com")) {
      renderer = VimeoRenderer;
    } else if (src.includes(".m3u8")) {
      renderer = HLSRenderer;
    } else {
      renderer = HTML5Renderer;
    }
    this.log(`Using ${renderer.name} renderer`);
    this.renderer = new renderer(this);
    await this.renderer.init();
  }
  /**
   * Load new media source (for playlists)
   * @param {Object} config - Media configuration
   * @param {string} config.src - Media source URL
   * @param {string} config.type - Media MIME type
   * @param {string} [config.poster] - Poster image URL
   * @param {Array} [config.tracks] - Text tracks (captions, chapters, etc.)
   */
  async load(config) {
    try {
      this.log("Loading new media:", config.src);
      if (this.renderer) {
        this.pause();
      }
      const existingTracks = this.element.querySelectorAll("track");
      existingTracks.forEach((track) => track.remove());
      this.element.src = config.src;
      if (config.type) {
        this.element.type = config.type;
      }
      if (config.poster && this.element.tagName === "VIDEO") {
        this.element.poster = config.poster;
      }
      if (config.tracks && config.tracks.length > 0) {
        config.tracks.forEach((trackConfig) => {
          const track = document.createElement("track");
          track.src = trackConfig.src;
          track.kind = trackConfig.kind || "captions";
          track.srclang = trackConfig.srclang || "en";
          track.label = trackConfig.label || trackConfig.srclang;
          if (trackConfig.default) {
            track.default = true;
          }
          this.element.appendChild(track);
        });
      }
      const shouldChangeRenderer = this.shouldChangeRenderer(config.src);
      if (shouldChangeRenderer && this.renderer) {
        this.renderer.destroy();
        this.renderer = null;
      }
      if (!this.renderer || shouldChangeRenderer) {
        await this.initializeRenderer();
      } else {
        this.renderer.media = this.element;
        this.element.load();
      }
      if (this.captionManager) {
        this.captionManager.destroy();
        this.captionManager = new CaptionManager(this);
      }
      this.emit("sourcechange", config);
      this.log("Media loaded successfully");
    } catch (error) {
      this.handleError(error);
    }
  }
  /**
   * Check if we need to change renderer type
   * @param {string} src - New source URL
   * @returns {boolean}
   */
  shouldChangeRenderer(src) {
    if (!this.renderer) return true;
    const isYouTube = src.includes("youtube.com") || src.includes("youtu.be");
    const isVimeo = src.includes("vimeo.com");
    const isHLS = src.includes(".m3u8");
    const currentRendererName = this.renderer.constructor.name;
    if (isYouTube && currentRendererName !== "YouTubeRenderer") return true;
    if (isVimeo && currentRendererName !== "VimeoRenderer") return true;
    if (isHLS && currentRendererName !== "HLSRenderer") return true;
    if (!isYouTube && !isVimeo && !isHLS && currentRendererName !== "HTML5Renderer") return true;
    return false;
  }
  // Playback controls
  play() {
    if (this.renderer) {
      this.renderer.play();
    }
  }
  pause() {
    if (this.renderer) {
      this.renderer.pause();
    }
  }
  stop() {
    this.pause();
    this.seek(0);
  }
  toggle() {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  }
  seek(time) {
    if (this.renderer) {
      this.renderer.seek(time);
    }
  }
  seekForward(interval = this.options.seekInterval) {
    this.seek(Math.min(this.state.currentTime + interval, this.state.duration));
  }
  seekBackward(interval = this.options.seekInterval) {
    this.seek(Math.max(this.state.currentTime - interval, 0));
  }
  // Volume controls
  setVolume(volume) {
    const newVolume = Math.max(0, Math.min(1, volume));
    if (this.renderer) {
      this.renderer.setVolume(newVolume);
    }
    this.state.volume = newVolume;
    if (newVolume > 0 && this.state.muted) {
      this.state.muted = false;
    }
  }
  getVolume() {
    return this.state.volume;
  }
  mute() {
    if (this.renderer) {
      this.renderer.setMuted(true);
    }
    this.state.muted = true;
  }
  unmute() {
    if (this.renderer) {
      this.renderer.setMuted(false);
    }
    this.state.muted = false;
  }
  toggleMute() {
    if (this.state.muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }
  // Playback speed
  setPlaybackSpeed(speed) {
    const newSpeed = Math.max(0.25, Math.min(2, speed));
    if (this.renderer) {
      this.renderer.setPlaybackSpeed(newSpeed);
    }
    this.state.playbackSpeed = newSpeed;
    this.emit("playbackspeedchange", newSpeed);
  }
  getPlaybackSpeed() {
    return this.state.playbackSpeed;
  }
  // Fullscreen
  enterFullscreen() {
    const elem = this.container;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
    this.state.fullscreen = true;
    this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
    this.emit("fullscreenchange", true);
  }
  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    this.state.fullscreen = false;
    this.container.classList.remove(`${this.options.classPrefix}-fullscreen`);
    this.emit("fullscreenchange", false);
  }
  toggleFullscreen() {
    if (this.state.fullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }
  // Picture-in-Picture
  enterPiP() {
    if (this.element.requestPictureInPicture) {
      this.element.requestPictureInPicture();
      this.state.pip = true;
      this.emit("pipchange", true);
    }
  }
  exitPiP() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
      this.state.pip = false;
      this.emit("pipchange", false);
    }
  }
  togglePiP() {
    if (this.state.pip) {
      this.exitPiP();
    } else {
      this.enterPiP();
    }
  }
  // Captions
  enableCaptions() {
    if (this.captionManager) {
      this.captionManager.enable();
      this.state.captionsEnabled = true;
    }
  }
  disableCaptions() {
    if (this.captionManager) {
      this.captionManager.disable();
      this.state.captionsEnabled = false;
    }
  }
  toggleCaptions() {
    if (this.state.captionsEnabled) {
      this.disableCaptions();
    } else {
      this.enableCaptions();
    }
  }
  // Audio Description
  async enableAudioDescription() {
    if (!this.audioDescriptionSrc) {
      console.warn("VidPly: No audio description source provided");
      return;
    }
    const currentTime = this.state.currentTime;
    const wasPlaying = this.state.playing;
    this.element.src = this.audioDescriptionSrc;
    await new Promise((resolve) => {
      const onLoadedMetadata = () => {
        this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
        resolve();
      };
      this.element.addEventListener("loadedmetadata", onLoadedMetadata);
    });
    this.seek(currentTime);
    if (wasPlaying) {
      this.play();
    }
    this.state.audioDescriptionEnabled = true;
    this.emit("audiodescriptionenabled");
  }
  async disableAudioDescription() {
    if (!this.originalSrc) {
      return;
    }
    const currentTime = this.state.currentTime;
    const wasPlaying = this.state.playing;
    this.element.src = this.originalSrc;
    await new Promise((resolve) => {
      const onLoadedMetadata = () => {
        this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
        resolve();
      };
      this.element.addEventListener("loadedmetadata", onLoadedMetadata);
    });
    this.seek(currentTime);
    if (wasPlaying) {
      this.play();
    }
    this.state.audioDescriptionEnabled = false;
    this.emit("audiodescriptiondisabled");
  }
  async toggleAudioDescription() {
    if (this.state.audioDescriptionEnabled) {
      await this.disableAudioDescription();
    } else {
      await this.enableAudioDescription();
    }
  }
  // Sign Language
  enableSignLanguage() {
    if (!this.signLanguageSrc) {
      console.warn("No sign language video source provided");
      return;
    }
    if (this.signLanguageVideo) {
      this.signLanguageVideo.style.display = "block";
      this.state.signLanguageEnabled = true;
      this.emit("signlanguageenabled");
      return;
    }
    this.signLanguageVideo = document.createElement("video");
    this.signLanguageVideo.className = "vidply-sign-language-video";
    this.signLanguageVideo.src = this.signLanguageSrc;
    this.signLanguageVideo.setAttribute("aria-label", this.i18n.t("signLanguageVideo"));
    const position = this.options.signLanguagePosition || "bottom-right";
    this.signLanguageVideo.classList.add(`vidply-sign-position-${position}`);
    this.signLanguageVideo.muted = true;
    this.signLanguageVideo.currentTime = this.state.currentTime;
    if (!this.state.paused) {
      this.signLanguageVideo.play();
    }
    this.container.appendChild(this.signLanguageVideo);
    this.signLanguageHandlers = {
      play: () => {
        if (this.signLanguageVideo) {
          this.signLanguageVideo.play();
        }
      },
      pause: () => {
        if (this.signLanguageVideo) {
          this.signLanguageVideo.pause();
        }
      },
      timeupdate: () => {
        if (this.signLanguageVideo && Math.abs(this.signLanguageVideo.currentTime - this.state.currentTime) > 0.5) {
          this.signLanguageVideo.currentTime = this.state.currentTime;
        }
      },
      ratechange: () => {
        if (this.signLanguageVideo) {
          this.signLanguageVideo.playbackRate = this.state.playbackSpeed;
        }
      }
    };
    this.on("play", this.signLanguageHandlers.play);
    this.on("pause", this.signLanguageHandlers.pause);
    this.on("timeupdate", this.signLanguageHandlers.timeupdate);
    this.on("ratechange", this.signLanguageHandlers.ratechange);
    this.state.signLanguageEnabled = true;
    this.emit("signlanguageenabled");
  }
  disableSignLanguage() {
    if (this.signLanguageVideo) {
      this.signLanguageVideo.style.display = "none";
    }
    this.state.signLanguageEnabled = false;
    this.emit("signlanguagedisabled");
  }
  toggleSignLanguage() {
    if (this.state.signLanguageEnabled) {
      this.disableSignLanguage();
    } else {
      this.enableSignLanguage();
    }
  }
  cleanupSignLanguage() {
    if (this.signLanguageHandlers) {
      this.off("play", this.signLanguageHandlers.play);
      this.off("pause", this.signLanguageHandlers.pause);
      this.off("timeupdate", this.signLanguageHandlers.timeupdate);
      this.off("ratechange", this.signLanguageHandlers.ratechange);
      this.signLanguageHandlers = null;
    }
    if (this.signLanguageVideo && this.signLanguageVideo.parentNode) {
      this.signLanguageVideo.pause();
      this.signLanguageVideo.src = "";
      this.signLanguageVideo.parentNode.removeChild(this.signLanguageVideo);
      this.signLanguageVideo = null;
    }
  }
  // Settings
  showSettings() {
    if (this.settingsDialog) {
      this.settingsDialog.show();
    }
  }
  hideSettings() {
    if (this.settingsDialog) {
      this.settingsDialog.hide();
    }
  }
  // Utility methods
  getCurrentTime() {
    return this.state.currentTime;
  }
  getDuration() {
    return this.state.duration;
  }
  isPlaying() {
    return this.state.playing;
  }
  isPaused() {
    return this.state.paused;
  }
  isEnded() {
    return this.state.ended;
  }
  isMuted() {
    return this.state.muted;
  }
  isFullscreen() {
    return this.state.fullscreen;
  }
  // Error handling
  handleError(error) {
    this.log("Error:", error, "error");
    this.emit("error", error);
    if (this.options.onError) {
      this.options.onError.call(this, error);
    }
  }
  // Logging
  log(message, type = "log") {
    if (this.options.debug) {
      console[type](`[VidPly]`, message);
    }
  }
  // Cleanup
  destroy() {
    this.log("Destroying player");
    if (this.renderer) {
      this.renderer.destroy();
    }
    if (this.controlBar) {
      this.controlBar.destroy();
    }
    if (this.captionManager) {
      this.captionManager.destroy();
    }
    if (this.keyboardManager) {
      this.keyboardManager.destroy();
    }
    if (this.settingsDialog) {
      this.settingsDialog.destroy();
    }
    if (this.transcriptManager) {
      this.transcriptManager.destroy();
    }
    this.cleanupSignLanguage();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.insertBefore(this.element, this.container);
      this.container.parentNode.removeChild(this.container);
    }
    this.removeAllListeners();
  }
};
Player.instances = [];

// src/features/PlaylistManager.js
var PlaylistManager = class {
  constructor(player, options = {}) {
    this.player = player;
    this.tracks = [];
    this.currentIndex = -1;
    this.options = {
      autoAdvance: options.autoAdvance !== false,
      // Default true
      loop: options.loop || false,
      showPanel: options.showPanel !== false,
      // Default true
      ...options
    };
    this.container = null;
    this.playlistPanel = null;
    this.trackInfoElement = null;
    this.handleTrackEnd = this.handleTrackEnd.bind(this);
    this.handleTrackError = this.handleTrackError.bind(this);
    this.init();
  }
  init() {
    this.player.on("ended", this.handleTrackEnd);
    this.player.on("error", this.handleTrackError);
    if (this.options.showPanel) {
      this.createUI();
    }
  }
  /**
   * Load a playlist
   * @param {Array} tracks - Array of track objects
   */
  loadPlaylist(tracks) {
    this.tracks = tracks;
    this.currentIndex = -1;
    if (this.container) {
      this.container.classList.add("vidply-has-playlist");
    }
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
    if (tracks.length > 0) {
      this.play(0);
    }
  }
  /**
   * Play a specific track
   * @param {number} index - Track index
   */
  play(index) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn("VidPly Playlist: Invalid track index", index);
      return;
    }
    const track = this.tracks[index];
    this.currentIndex = index;
    this.player.load({
      src: track.src,
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || []
    });
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    this.player.emit("playlisttrackchange", {
      index,
      item: track,
      total: this.tracks.length
    });
    setTimeout(() => {
      this.player.play();
    }, 100);
  }
  /**
   * Play next track
   */
  next() {
    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.tracks.length) {
      if (this.options.loop) {
        nextIndex = 0;
      } else {
        return;
      }
    }
    this.play(nextIndex);
  }
  /**
   * Play previous track
   */
  previous() {
    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      if (this.options.loop) {
        prevIndex = this.tracks.length - 1;
      } else {
        return;
      }
    }
    this.play(prevIndex);
  }
  /**
   * Handle track end
   */
  handleTrackEnd() {
    if (this.options.autoAdvance) {
      this.next();
    }
  }
  /**
   * Handle track error
   */
  handleTrackError(e) {
    console.error("VidPly Playlist: Track error", e);
    if (this.options.autoAdvance) {
      setTimeout(() => {
        this.next();
      }, 1e3);
    }
  }
  /**
   * Create playlist UI
   */
  createUI() {
    this.container = this.player.container;
    if (!this.container) {
      console.warn("VidPly Playlist: No container found");
      return;
    }
    this.trackInfoElement = DOMUtils.createElement("div", {
      className: "vidply-track-info"
    });
    this.trackInfoElement.style.display = "none";
    this.container.appendChild(this.trackInfoElement);
    this.playlistPanel = DOMUtils.createElement("div", {
      className: "vidply-playlist-panel"
    });
    this.playlistPanel.style.display = "none";
    this.container.appendChild(this.playlistPanel);
  }
  /**
   * Update track info display
   */
  updateTrackInfo(track) {
    if (!this.trackInfoElement) return;
    const trackNumber = this.currentIndex + 1;
    const totalTracks = this.tracks.length;
    this.trackInfoElement.innerHTML = `
      <div class="vidply-track-number">Track ${trackNumber} of ${totalTracks}</div>
      <div class="vidply-track-title">${DOMUtils.escapeHTML(track.title || "Untitled")}</div>
      ${track.artist ? `<div class="vidply-track-artist">${DOMUtils.escapeHTML(track.artist)}</div>` : ""}
    `;
    this.trackInfoElement.style.display = "block";
  }
  /**
   * Render playlist
   */
  renderPlaylist() {
    if (!this.playlistPanel) return;
    this.playlistPanel.innerHTML = "";
    const header = DOMUtils.createElement("div", {
      className: "vidply-playlist-header"
    });
    header.textContent = `Playlist (${this.tracks.length})`;
    this.playlistPanel.appendChild(header);
    const list = DOMUtils.createElement("div", {
      className: "vidply-playlist-list"
    });
    this.tracks.forEach((track, index) => {
      const item = this.createPlaylistItem(track, index);
      list.appendChild(item);
    });
    this.playlistPanel.appendChild(list);
    this.playlistPanel.style.display = "block";
  }
  /**
   * Create playlist item element
   */
  createPlaylistItem(track, index) {
    const item = DOMUtils.createElement("div", {
      className: "vidply-playlist-item",
      role: "button",
      tabIndex: 0,
      "aria-label": `Play ${track.title || "Track " + (index + 1)}`
    });
    if (index === this.currentIndex) {
      item.classList.add("vidply-playlist-item-active");
    }
    const thumbnail = DOMUtils.createElement("div", {
      className: "vidply-playlist-thumbnail"
    });
    if (track.poster) {
      thumbnail.style.backgroundImage = `url(${track.poster})`;
    } else {
      const icon = createIconElement("music");
      icon.classList.add("vidply-playlist-thumbnail-icon");
      thumbnail.appendChild(icon);
    }
    item.appendChild(thumbnail);
    const info = DOMUtils.createElement("div", {
      className: "vidply-playlist-item-info"
    });
    const title = DOMUtils.createElement("div", {
      className: "vidply-playlist-item-title"
    });
    title.textContent = track.title || `Track ${index + 1}`;
    info.appendChild(title);
    if (track.artist) {
      const artist = DOMUtils.createElement("div", {
        className: "vidply-playlist-item-artist"
      });
      artist.textContent = track.artist;
      info.appendChild(artist);
    }
    item.appendChild(info);
    const playIcon = createIconElement("play");
    playIcon.classList.add("vidply-playlist-item-icon");
    item.appendChild(playIcon);
    item.addEventListener("click", () => {
      this.play(index);
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.play(index);
      }
    });
    return item;
  }
  /**
   * Update playlist UI (highlight current track)
   */
  updatePlaylistUI() {
    if (!this.playlistPanel) return;
    const items = this.playlistPanel.querySelectorAll(".vidply-playlist-item");
    items.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.classList.add("vidply-playlist-item-active");
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        item.classList.remove("vidply-playlist-item-active");
      }
    });
  }
  /**
   * Get current track
   */
  getCurrentTrack() {
    return this.tracks[this.currentIndex] || null;
  }
  /**
   * Get playlist info
   */
  getPlaylistInfo() {
    return {
      currentIndex: this.currentIndex,
      totalTracks: this.tracks.length,
      currentTrack: this.getCurrentTrack(),
      hasNext: this.currentIndex < this.tracks.length - 1,
      hasPrevious: this.currentIndex > 0
    };
  }
  /**
   * Add track to playlist
   */
  addTrack(track) {
    this.tracks.push(track);
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  /**
   * Remove track from playlist
   */
  removeTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.tracks.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      if (this.currentIndex >= this.tracks.length) {
        this.currentIndex = this.tracks.length - 1;
      }
      if (this.currentIndex >= 0) {
        this.play(this.currentIndex);
      }
    }
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  /**
   * Clear playlist
   */
  clear() {
    this.tracks = [];
    this.currentIndex = -1;
    if (this.playlistPanel) {
      this.playlistPanel.innerHTML = "";
      this.playlistPanel.style.display = "none";
    }
    if (this.trackInfoElement) {
      this.trackInfoElement.innerHTML = "";
      this.trackInfoElement.style.display = "none";
    }
  }
  /**
   * Destroy playlist manager
   */
  destroy() {
    this.player.off("ended", this.handleTrackEnd);
    this.player.off("error", this.handleTrackError);
    if (this.trackInfoElement) {
      this.trackInfoElement.remove();
    }
    if (this.playlistPanel) {
      this.playlistPanel.remove();
    }
    this.clear();
  }
};

// src/index.js
function initializePlayers() {
  const elements = document.querySelectorAll("[data-vidply]");
  elements.forEach((element) => {
    const options = element.dataset.vidplyOptions ? JSON.parse(element.dataset.vidplyOptions) : {};
    new Player(element, options);
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePlayers);
} else {
  initializePlayers();
}
var index_default = Player;
export {
  Player,
  PlaylistManager,
  index_default as default
};
//# sourceMappingURL=vidply.esm.js.map
