/*!
 * VidPly v1.0.0
 * Universal, Accessible Video Player
 * (c) 2025 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
var VidPly = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

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
          this.media.controls = false;
          this.media.removeAttribute("controls");
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
    }
  });

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    Player: () => Player,
    PlaylistManager: () => PlaylistManager,
    default: () => index_default
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

  // src/i18n/languages/en.js
  var en = {
    player: {
      label: "Video Player",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      restart: "Restart from beginning",
      rewind: "Rewind",
      forward: "Forward",
      rewindSeconds: "Rewind {seconds} seconds",
      forwardSeconds: "Forward {seconds} seconds",
      previous: "Previous track",
      next: "Next track",
      volume: "Volume",
      mute: "Mute",
      unmute: "Unmute",
      fullscreen: "Fullscreen",
      exitFullscreen: "Exit Fullscreen",
      captions: "Captions",
      chapters: "Chapters",
      quality: "Quality",
      captionStyling: "Caption styling",
      transcript: "Toggle transcript",
      audioDescription: "Audio description",
      signLanguage: "Sign language video",
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
      loadingChapters: "Loading chapters...",
      error: "Error loading media",
      buffering: "Buffering...",
      signLanguageVideo: "Sign Language Video",
      closeSignLanguage: "Close sign language video",
      signLanguageSettings: "Sign language settings",
      noChapters: "No chapters available",
      noCaptions: "No captions available",
      auto: "Auto",
      autoQuality: "Auto (no quality selection available)",
      noQuality: "Quality selection not available",
      signLanguageDragResize: "Sign Language Video - Press D to drag with keyboard, R to resize",
      signLanguageDragActive: "Sign Language Video - Drag mode active. Use arrow keys to move, Escape to exit.",
      signLanguageResizeActive: "Sign Language Video - Resize mode active. Use left/right arrow keys to resize, Escape to exit.",
      enableSignDragMode: "Enable drag mode. Shortcut: D key",
      disableSignDragMode: "Disable drag mode. Shortcut: D key",
      enableSignDragModeAria: "Enable toggle keyboard drag mode with arrow keys. Shortcut: D key",
      disableSignDragModeAria: "Disable toggle keyboard drag mode with arrow keys. Shortcut: D key",
      enableSignResizeMode: "Enable resize mode. Shortcut: R key",
      disableSignResizeMode: "Disable resize mode. Shortcut: R key",
      enableSignResizeModeAria: "Enable keyboard resize mode with arrow keys. Shortcut: R key",
      disableSignResizeModeAria: "Disable keyboard resize mode with arrow keys. Shortcut: R key",
      resizeHandle: "Resize {direction} corner",
      moreOptions: "More options",
      noMoreOptions: "No additional options available"
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
    fontSizes: {
      small: "Small",
      normal: "Normal",
      large: "Large",
      xlarge: "X-Large"
    },
    fontFamilies: {
      sansSerif: "Sans-serif",
      serif: "Serif",
      monospace: "Monospace"
    },
    styleLabels: {
      textColor: "Text Color",
      background: "Background",
      font: "Font",
      fontSize: "Font Size",
      opacity: "Opacity"
    },
    audioDescription: {
      enable: "Enable audio description",
      disable: "Disable audio description"
    },
    signLanguage: {
      show: "Show sign language video",
      hide: "Hide sign language video"
    },
    transcript: {
      title: "Transcript",
      close: "Close transcript",
      loading: "Loading transcript...",
      noTranscript: "No transcript available for this video.",
      settings: "Transcript settings. Press Enter to open menu, or D to enable drag mode",
      keyboardDragMode: "Toggle keyboard drag mode with arrow keys. Shortcut: D key",
      keyboardDragActive: "\u2328\uFE0F Keyboard Drag Mode Active (Arrow keys to move, Shift+Arrows for large steps, D or ESC to exit)",
      dragResizePrompt: "Press D to drag or R to resize. Use Home to reset position, Esc to close.",
      dragModeEnabled: "Keyboard drag mode enabled. Use arrow keys to move, Shift+Arrow for larger steps. Press D or Esc to exit.",
      dragModeDisabled: "Keyboard drag mode disabled.",
      enableDragMode: "Enable drag mode. Shortcut: D key",
      disableDragMode: "Disable drag mode. Shortcut: D key",
      enableDragModeAria: "Enable toggle keyboard drag mode with arrow keys. Shortcut: D key",
      disableDragModeAria: "Disable toggle keyboard drag mode with arrow keys. Shortcut: D key",
      resizeWindow: "Resize Window",
      disableResizeWindow: "Disable Resize Mode",
      enableResizeMode: "Enable resize mode. Shortcut: R key",
      disableResizeMode: "Disable resize mode. Shortcut: R key",
      enableResizeModeAria: "Enable keyboard resize mode with arrow keys. Shortcut: R key",
      disableResizeModeAria: "Disable keyboard resize mode with arrow keys. Shortcut: R key",
      resizeModeHint: "Resize handles enabled. Drag edges or corners to adjust. Press Esc or R to exit.",
      resizeModeEnabled: "Resize mode enabled. Drag edges or corners to adjust. Press Esc or R to exit.",
      resizeModeDisabled: "Resize mode disabled.",
      positionReset: "Transcript position reset.",
      styleTranscript: "Open transcript style settings",
      closeMenu: "Close Menu",
      styleTitle: "Transcript Style",
      autoscroll: "Autoscroll",
      settingsMenu: "Transcript dialog settings"
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
      normal: "Normal"
    },
    time: {
      display: "Time display",
      durationPrefix: "Duration: ",
      of: "of",
      hour: "{count} hour",
      hours: "{count} hours",
      minute: "{count} minute",
      minutes: "{count} minutes",
      second: "{count} second",
      seconds: "{count} seconds"
    }
  };

  // src/i18n/languages/de.js
  var de = {
    player: {
      label: "Videoplayer",
      play: "Abspielen",
      pause: "Pause",
      stop: "Stopp",
      restart: "Von vorne beginnen",
      rewind: "Zur\xFCckspulen",
      forward: "Vorspulen",
      rewindSeconds: "{seconds} Sekunden zur\xFCckspulen",
      forwardSeconds: "{seconds} Sekunden vorspulen",
      previous: "Vorheriger Titel",
      next: "N\xE4chster Titel",
      volume: "Lautst\xE4rke",
      mute: "Stumm",
      unmute: "Ton ein",
      fullscreen: "Vollbild",
      exitFullscreen: "Vollbild beenden",
      captions: "Untertitel",
      chapters: "Kapitel",
      quality: "Qualit\xE4t",
      captionStyling: "Untertitel-Stil",
      transcript: "Transkript umschalten",
      audioDescription: "Audiodeskription",
      signLanguage: "Geb\xE4rdensprache-Video",
      settings: "Einstellungen",
      speed: "Wiedergabegeschwindigkeit",
      pip: "Bild-in-Bild",
      currentTime: "Aktuelle Zeit",
      duration: "Dauer",
      progress: "Fortschritt",
      seekForward: "{seconds} Sekunden vorspulen",
      seekBackward: "{seconds} Sekunden zur\xFCckspulen",
      volumeUp: "Lauter",
      volumeDown: "Leiser",
      loading: "L\xE4dt...",
      loadingChapters: "Kapitel werden geladen...",
      error: "Fehler beim Laden",
      buffering: "Puffern...",
      signLanguageVideo: "Geb\xE4rdensprache-Video",
      closeSignLanguage: "Geb\xE4rdensprache-Video schlie\xDFen",
      signLanguageSettings: "Geb\xE4rdensprache-Einstellungen",
      noChapters: "Keine Kapitel verf\xFCgbar",
      noCaptions: "Keine Untertitel verf\xFCgbar",
      auto: "Automatisch",
      autoQuality: "Automatisch (keine Qualit\xE4tsauswahl verf\xFCgbar)",
      noQuality: "Qualit\xE4tsauswahl nicht verf\xFCgbar",
      signLanguageDragResize: "Geb\xE4rdensprache-Video - Dr\xFCcken Sie D zum Verschieben per Tastatur, R zum \xC4ndern der Gr\xF6\xDFe",
      signLanguageDragActive: "Geb\xE4rdensprache-Video - Verschiebemodus aktiv. Pfeiltasten zum Bewegen, Escape zum Beenden.",
      signLanguageResizeActive: "Geb\xE4rdensprache-Video - Gr\xF6\xDFen\xE4nderungsmodus aktiv. Links-/Rechts-Pfeiltasten zum \xC4ndern der Gr\xF6\xDFe, Escape zum Beenden.",
      enableSignDragMode: "Verschiebemodus aktivieren. Tastenkombination: D-Taste",
      disableSignDragMode: "Verschiebemodus deaktivieren. Tastenkombination: D-Taste",
      enableSignDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten aktivieren. Tastenkombination: D-Taste",
      disableSignDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten deaktivieren. Tastenkombination: D-Taste",
      enableSignResizeMode: "Gr\xF6\xDFen\xE4nderungsmodus aktivieren. Tastenkombination: R-Taste",
      disableSignResizeMode: "Gr\xF6\xDFen\xE4nderungsmodus deaktivieren. Tastenkombination: R-Taste",
      enableSignResizeModeAria: "Tastatur-Gr\xF6\xDFen\xE4nderungsmodus mit Pfeiltasten aktivieren. Tastenkombination: R-Taste",
      disableSignResizeModeAria: "Tastatur-Gr\xF6\xDFen\xE4nderungsmodus mit Pfeiltasten deaktivieren. Tastenkombination: R-Taste",
      resizeHandle: "Gr\xF6\xDFen\xE4nderung {direction}-Ecke",
      moreOptions: "Weitere Optionen",
      noMoreOptions: "Keine weiteren Optionen verf\xFCgbar"
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
    fontSizes: {
      small: "Klein",
      normal: "Normal",
      large: "Gro\xDF",
      xlarge: "Sehr gro\xDF"
    },
    fontFamilies: {
      sansSerif: "Sans-serif",
      serif: "Serif",
      monospace: "Monospace"
    },
    styleLabels: {
      textColor: "Textfarbe",
      background: "Hintergrund",
      font: "Schrift",
      fontSize: "Schriftgr\xF6\xDFe",
      opacity: "Deckkraft"
    },
    audioDescription: {
      enable: "Audiodeskription aktivieren",
      disable: "Audiodeskription deaktivieren"
    },
    signLanguage: {
      show: "Geb\xE4rdensprache-Video anzeigen",
      hide: "Geb\xE4rdensprache-Video ausblenden"
    },
    transcript: {
      title: "Transkript",
      close: "Transkript schlie\xDFen",
      loading: "Transkript wird geladen...",
      noTranscript: "Kein Transkript f\xFCr dieses Video verf\xFCgbar.",
      settings: "Transkript-Einstellungen. Eingabetaste zum \xD6ffnen des Men\xFCs dr\xFCcken oder D zum Aktivieren des Verschiebemodus",
      keyboardDragMode: "Tastatur-Verschiebemodus mit Pfeiltasten umschalten. Tastenkombination: D-Taste",
      keyboardDragActive: "\u2328\uFE0F Tastatur-Verschiebemodus aktiv (Pfeiltasten zum Bewegen, Umschalt+Pfeiltasten f\xFCr gro\xDFe Schritte, D oder ESC zum Beenden)",
      dragResizePrompt: "Dr\xFCcken Sie D zum Verschieben oder R zur Gr\xF6\xDFen\xE4nderung. Home setzt die Position zur\xFCck, Esc schlie\xDFt.",
      dragModeEnabled: "Tastatur-Verschiebemodus aktiviert. Pfeiltasten zum Bewegen, Umschalt+Pfeiltasten f\xFCr gr\xF6\xDFere Schritte. D oder Esc zum Beenden.",
      dragModeDisabled: "Tastatur-Verschiebemodus deaktiviert.",
      enableDragMode: "Verschiebemodus aktivieren. Tastenkombination: D-Taste",
      disableDragMode: "Verschiebemodus deaktivieren. Tastenkombination: D-Taste",
      enableDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten aktivieren. Tastenkombination: D-Taste",
      disableDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten deaktivieren. Tastenkombination: D-Taste",
      resizeWindow: "Fenster vergr\xF6\xDFern/verkleinern",
      disableResizeWindow: "Resize-Modus deaktivieren",
      enableResizeMode: "Gr\xF6\xDFen\xE4nderungsmodus aktivieren. Tastenkombination: R-Taste",
      disableResizeMode: "Gr\xF6\xDFen\xE4nderungsmodus deaktivieren. Tastenkombination: R-Taste",
      enableResizeModeAria: "Tastatur-Gr\xF6\xDFen\xE4nderungsmodus mit Pfeiltasten aktivieren. Tastenkombination: R-Taste",
      disableResizeModeAria: "Tastatur-Gr\xF6\xDFen\xE4nderungsmodus mit Pfeiltasten deaktivieren. Tastenkombination: R-Taste",
      resizeModeHint: "Griffe aktiviert. Ziehen Sie Kanten oder Ecken zum Anpassen. Esc oder R zum Beenden.",
      resizeModeEnabled: "Resize-Modus aktiviert. Kanten oder Ecken ziehen; Esc oder R beendet.",
      resizeModeDisabled: "Resize-Modus deaktiviert.",
      positionReset: "Transkriptposition zur\xFCckgesetzt.",
      styleTranscript: "Transkript-Stileinstellungen \xF6ffnen",
      closeMenu: "Men\xFC schlie\xDFen",
      styleTitle: "Transkript-Stil",
      autoscroll: "Automatisches Scrollen",
      settingsMenu: "Transkript-Dialog-Einstellungen"
    },
    settings: {
      title: "Einstellungen",
      quality: "Qualit\xE4t",
      speed: "Geschwindigkeit",
      captions: "Untertitel",
      language: "Sprache",
      reset: "Zur\xFCcksetzen",
      close: "Schlie\xDFen"
    },
    speeds: {
      normal: "Normal"
    },
    time: {
      display: "Zeitanzeige",
      durationPrefix: "Dauer: ",
      of: "von",
      hour: "{count} Stunde",
      hours: "{count} Stunden",
      minute: "{count} Minute",
      minutes: "{count} Minuten",
      second: "{count} Sekunde",
      seconds: "{count} Sekunden"
    }
  };

  // src/i18n/languages/es.js
  var es = {
    player: {
      label: "Reproductor de video",
      play: "Reproducir",
      pause: "Pausa",
      stop: "Detener",
      restart: "Reiniciar desde el principio",
      rewind: "Retroceder",
      forward: "Avanzar",
      rewindSeconds: "Retroceder {seconds} segundos",
      forwardSeconds: "Avanzar {seconds} segundos",
      previous: "Pista anterior",
      next: "Siguiente pista",
      volume: "Volumen",
      mute: "Silenciar",
      unmute: "Activar sonido",
      fullscreen: "Pantalla completa",
      exitFullscreen: "Salir de pantalla completa",
      captions: "Subt\xEDtulos",
      chapters: "Cap\xEDtulos",
      quality: "Calidad",
      captionStyling: "Estilo de subt\xEDtulos",
      transcript: "Alternar transcripci\xF3n",
      audioDescription: "Audiodescripci\xF3n",
      signLanguage: "Video en lengua de se\xF1as",
      settings: "Configuraci\xF3n",
      speed: "Velocidad de reproducci\xF3n",
      pip: "Imagen en imagen",
      currentTime: "Tiempo actual",
      duration: "Duraci\xF3n",
      progress: "Progreso",
      seekForward: "Avanzar {seconds} segundos",
      seekBackward: "Retroceder {seconds} segundos",
      volumeUp: "Subir volumen",
      volumeDown: "Bajar volumen",
      loading: "Cargando...",
      loadingChapters: "Cargando cap\xEDtulos...",
      error: "Error al cargar",
      buffering: "Almacenando en b\xFAfer...",
      signLanguageVideo: "Video en Lengua de Se\xF1as",
      closeSignLanguage: "Cerrar video en lengua de se\xF1as",
      signLanguageSettings: "Configuraci\xF3n de lengua de se\xF1as",
      noChapters: "No hay cap\xEDtulos disponibles",
      noCaptions: "No hay subt\xEDtulos disponibles",
      auto: "Autom\xE1tico",
      autoQuality: "Autom\xE1tico (selecci\xF3n de calidad no disponible)",
      noQuality: "Selecci\xF3n de calidad no disponible",
      signLanguageDragResize: "Video en Lengua de Se\xF1as - Presione D para arrastrar con el teclado, R para cambiar el tama\xF1o",
      signLanguageDragActive: "Video en Lengua de Se\xF1as - Modo de arrastre activo. Use las teclas de flecha para mover, Escape para salir.",
      signLanguageResizeActive: "Video en Lengua de Se\xF1as - Modo de cambio de tama\xF1o activo. Use las teclas de flecha izquierda/derecha para cambiar el tama\xF1o, Escape para salir.",
      enableSignDragMode: "Activar modo de arrastre. Atajo: tecla D",
      disableSignDragMode: "Desactivar modo de arrastre. Atajo: tecla D",
      enableSignDragModeAria: "Activar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
      disableSignDragModeAria: "Desactivar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
      enableSignResizeMode: "Activar modo de cambio de tama\xF1o. Atajo: tecla R",
      disableSignResizeMode: "Desactivar modo de cambio de tama\xF1o. Atajo: tecla R",
      enableSignResizeModeAria: "Activar modo de cambio de tama\xF1o con teclado usando teclas de flecha. Atajo: tecla R",
      disableSignResizeModeAria: "Desactivar modo de cambio de tama\xF1o con teclado usando teclas de flecha. Atajo: tecla R",
      resizeHandle: "Cambiar tama\xF1o esquina {direction}",
      moreOptions: "M\xE1s opciones",
      noMoreOptions: "No hay opciones adicionales disponibles"
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
    fontSizes: {
      small: "Peque\xF1o",
      normal: "Normal",
      large: "Grande",
      xlarge: "Muy grande"
    },
    fontFamilies: {
      sansSerif: "Sans-serif",
      serif: "Serif",
      monospace: "Monospace"
    },
    styleLabels: {
      textColor: "Color de texto",
      background: "Fondo",
      font: "Fuente",
      fontSize: "Tama\xF1o de fuente",
      opacity: "Opacidad"
    },
    audioDescription: {
      enable: "Activar audiodescripci\xF3n",
      disable: "Desactivar audiodescripci\xF3n"
    },
    signLanguage: {
      show: "Mostrar video en lengua de se\xF1as",
      hide: "Ocultar video en lengua de se\xF1as"
    },
    transcript: {
      title: "Transcripci\xF3n",
      close: "Cerrar transcripci\xF3n",
      loading: "Cargando transcripci\xF3n...",
      noTranscript: "No hay transcripci\xF3n disponible para este video.",
      settings: "Configuraci\xF3n de transcripci\xF3n. Presione Enter para abrir el men\xFA o D para activar el modo de arrastre",
      keyboardDragMode: "Alternar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
      keyboardDragActive: "\u2328\uFE0F Modo de Arrastre con Teclado Activo (Teclas de flecha para mover, May\xFAs+Flechas para pasos grandes, D o ESC para salir)",
      dragResizePrompt: "Pulsa D para mover o R para cambiar el tama\xF1o. Home restablece la posici\xF3n; Esc cierra.",
      dragModeEnabled: "Modo de arrastre con teclado activado. Usa flechas para mover, May\xFAs+Flechas para pasos grandes. Pulsa D o Esc para salir.",
      dragModeDisabled: "Modo de arrastre con teclado desactivado.",
      enableDragMode: "Activar modo de arrastre. Atajo: tecla D",
      disableDragMode: "Desactivar modo de arrastre. Atajo: tecla D",
      enableDragModeAria: "Activar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
      disableDragModeAria: "Desactivar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
      resizeWindow: "Cambiar tama\xF1o de ventana",
      disableResizeWindow: "Desactivar modo de cambio de tama\xF1o",
      enableResizeMode: "Activar modo de cambio de tama\xF1o. Atajo: tecla R",
      disableResizeMode: "Desactivar modo de cambio de tama\xF1o. Atajo: tecla R",
      enableResizeModeAria: "Activar modo de cambio de tama\xF1o con teclado usando teclas de flecha. Atajo: tecla R",
      disableResizeModeAria: "Desactivar modo de cambio de tama\xF1o con teclado usando teclas de flecha. Atajo: tecla R",
      resizeModeHint: "Controladores habilitados. Arrastra bordes o esquinas para ajustar. Pulsa Esc o R para salir.",
      resizeModeEnabled: "Modo de cambio de tama\xF1o activado. Arrastra bordes o esquinas. Pulsa Esc o R para salir.",
      resizeModeDisabled: "Modo de cambio de tama\xF1o desactivado.",
      positionReset: "Posici\xF3n de la transcripci\xF3n restablecida.",
      styleTranscript: "Abrir configuraci\xF3n de estilo de transcripci\xF3n",
      closeMenu: "Cerrar men\xFA",
      styleTitle: "Estilo de Transcripci\xF3n",
      autoscroll: "Desplazamiento autom\xE1tico",
      settingsMenu: "Configuraci\xF3n del di\xE1logo de transcripci\xF3n"
    },
    settings: {
      title: "Configuraci\xF3n",
      quality: "Calidad",
      speed: "Velocidad",
      captions: "Subt\xEDtulos",
      language: "Idioma",
      reset: "Restablecer",
      close: "Cerrar"
    },
    speeds: {
      normal: "Normal"
    },
    time: {
      display: "Visualizaci\xF3n de tiempo",
      durationPrefix: "Duraci\xF3n: ",
      of: "de",
      hour: "{count} hora",
      hours: "{count} horas",
      minute: "{count} minuto",
      minutes: "{count} minutos",
      second: "{count} segundo",
      seconds: "{count} segundos"
    }
  };

  // src/i18n/languages/fr.js
  var fr = {
    player: {
      label: "Lecteur vid\xE9o",
      play: "Lecture",
      pause: "Pause",
      stop: "Arr\xEAt",
      restart: "Red\xE9marrer du d\xE9but",
      rewind: "Reculer",
      forward: "Avancer",
      rewindSeconds: "Reculer de {seconds} secondes",
      forwardSeconds: "Avancer de {seconds} secondes",
      previous: "Piste pr\xE9c\xE9dente",
      next: "Piste suivante",
      volume: "Volume",
      mute: "Muet",
      unmute: "Activer le son",
      fullscreen: "Plein \xE9cran",
      exitFullscreen: "Quitter le plein \xE9cran",
      captions: "Sous-titres",
      chapters: "Chapitres",
      quality: "Qualit\xE9",
      captionStyling: "Style des sous-titres",
      transcript: "Activer/d\xE9sactiver la transcription",
      audioDescription: "Audiodescription",
      signLanguage: "Vid\xE9o en langue des signes",
      settings: "Param\xE8tres",
      speed: "Vitesse de lecture",
      pip: "Image dans l'image",
      currentTime: "Temps actuel",
      duration: "Dur\xE9e",
      progress: "Progression",
      seekForward: "Avancer de {seconds} secondes",
      seekBackward: "Reculer de {seconds} secondes",
      volumeUp: "Augmenter le volume",
      volumeDown: "Diminuer le volume",
      loading: "Chargement...",
      loadingChapters: "Chargement des chapitres...",
      error: "Erreur de chargement",
      buffering: "Mise en m\xE9moire tampon...",
      signLanguageVideo: "Vid\xE9o en Langue des Signes",
      closeSignLanguage: "Fermer la vid\xE9o en langue des signes",
      signLanguageSettings: "Param\xE8tres de la langue des signes",
      noChapters: "Aucun chapitre disponible",
      noCaptions: "Aucun sous-titre disponible",
      auto: "Automatique",
      autoQuality: "Automatique (s\xE9lection de qualit\xE9 non disponible)",
      noQuality: "S\xE9lection de qualit\xE9 non disponible",
      signLanguageDragResize: "Vid\xE9o en Langue des Signes - Appuyez sur D pour d\xE9placer avec le clavier, R pour redimensionner",
      signLanguageDragActive: "Vid\xE9o en Langue des Signes - Mode glissement actif. Utilisez les touches fl\xE9ch\xE9es pour d\xE9placer, \xC9chap pour quitter.",
      signLanguageResizeActive: "Vid\xE9o en Langue des Signes - Mode redimensionnement actif. Utilisez les touches fl\xE9ch\xE9es gauche/droite pour redimensionner, \xC9chap pour quitter.",
      enableSignDragMode: "Activer le mode glissement. Raccourci : touche D",
      disableSignDragMode: "D\xE9sactiver le mode glissement. Raccourci : touche D",
      enableSignDragModeAria: "Activer le mode glissement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche D",
      disableSignDragModeAria: "D\xE9sactiver le mode glissement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche D",
      enableSignResizeMode: "Activer le mode redimensionnement. Raccourci : touche R",
      disableSignResizeMode: "D\xE9sactiver le mode redimensionnement. Raccourci : touche R",
      enableSignResizeModeAria: "Activer le mode redimensionnement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche R",
      disableSignResizeModeAria: "D\xE9sactiver le mode redimensionnement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche R",
      resizeHandle: "Redimensionner coin {direction}",
      moreOptions: "Plus d'options",
      noMoreOptions: "Aucune option suppl\xE9mentaire disponible"
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
    fontSizes: {
      small: "Petit",
      normal: "Normal",
      large: "Grand",
      xlarge: "Tr\xE8s grand"
    },
    fontFamilies: {
      sansSerif: "Sans-serif",
      serif: "Serif",
      monospace: "Monospace"
    },
    styleLabels: {
      textColor: "Couleur du texte",
      background: "Arri\xE8re-plan",
      font: "Police",
      fontSize: "Taille de police",
      opacity: "Opacit\xE9"
    },
    audioDescription: {
      enable: "Activer l'audiodescription",
      disable: "D\xE9sactiver l'audiodescription"
    },
    signLanguage: {
      show: "Afficher la vid\xE9o en langue des signes",
      hide: "Masquer la vid\xE9o en langue des signes"
    },
    transcript: {
      title: "Transcription",
      close: "Fermer la transcription",
      loading: "Chargement de la transcription...",
      noTranscript: "Aucune transcription disponible pour cette vid\xE9o.",
      settings: "Param\xE8tres de transcription. Appuyez sur Entr\xE9e pour ouvrir le menu ou D pour activer le mode glissement",
      keyboardDragMode: "Basculer le mode glissement avec les touches fl\xE9ch\xE9es. Raccourci: touche D",
      keyboardDragActive: "\u2328\uFE0F Mode Glissement Clavier Actif (Touches fl\xE9ch\xE9es pour d\xE9placer, Maj+Fl\xE9ch\xE9es pour grands pas, D ou \xC9chap pour quitter)",
      dragResizePrompt: "Appuyez sur D pour d\xE9placer ou R pour redimensionner. Home r\xE9initialise la position, \xC9chap ferme.",
      dragModeEnabled: "Mode glissement clavier activ\xE9. Utilisez les fl\xE8ches pour d\xE9placer, Maj+Fl\xE8ches pour de grands pas. Appuyez sur D ou \xC9chap pour quitter.",
      dragModeDisabled: "Mode glissement clavier d\xE9sactiv\xE9.",
      enableDragMode: "Activer le mode glissement. Raccourci : touche D",
      disableDragMode: "D\xE9sactiver le mode glissement. Raccourci : touche D",
      enableDragModeAria: "Activer le mode glissement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche D",
      disableDragModeAria: "D\xE9sactiver le mode glissement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche D",
      resizeWindow: "Redimensionner la fen\xEAtre",
      disableResizeWindow: "D\xE9sactiver le mode de redimensionnement",
      enableResizeMode: "Activer le mode redimensionnement. Raccourci : touche R",
      disableResizeMode: "D\xE9sactiver le mode redimensionnement. Raccourci : touche R",
      enableResizeModeAria: "Activer le mode redimensionnement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche R",
      disableResizeModeAria: "D\xE9sactiver le mode redimensionnement clavier avec les touches fl\xE9ch\xE9es. Raccourci : touche R",
      resizeModeHint: "Poign\xE9es activ\xE9es. Faites glisser les bords ou les coins pour ajuster. Appuyez sur \xC9chap ou R pour quitter.",
      resizeModeEnabled: "Mode redimensionnement activ\xE9. Faites glisser les bords ou coins. Appuyez sur \xC9chap ou R pour quitter.",
      resizeModeDisabled: "Mode redimensionnement d\xE9sactiv\xE9.",
      positionReset: "Position de la transcription r\xE9initialis\xE9e.",
      styleTranscript: "Ouvrir les param\xE8tres de style de transcription",
      closeMenu: "Fermer le menu",
      styleTitle: "Style de Transcription",
      autoscroll: "D\xE9filement automatique",
      settingsMenu: "Param\xE8tres de dialogue de transcription"
    },
    settings: {
      title: "Param\xE8tres",
      quality: "Qualit\xE9",
      speed: "Vitesse",
      captions: "Sous-titres",
      language: "Langue",
      reset: "R\xE9initialiser",
      close: "Fermer"
    },
    speeds: {
      normal: "Normal"
    },
    time: {
      display: "Affichage du temps",
      durationPrefix: "Dur\xE9e : ",
      of: "sur",
      hour: "{count} heure",
      hours: "{count} heures",
      minute: "{count} minute",
      minutes: "{count} minutes",
      second: "{count} seconde",
      seconds: "{count} secondes"
    }
  };

  // src/i18n/languages/ja.js
  var ja = {
    player: {
      label: "\u30D3\u30C7\u30AA\u30D7\u30EC\u30FC\u30E4\u30FC",
      play: "\u518D\u751F",
      pause: "\u4E00\u6642\u505C\u6B62",
      stop: "\u505C\u6B62",
      restart: "\u6700\u521D\u304B\u3089\u518D\u751F",
      rewind: "\u5DFB\u304D\u623B\u3057",
      forward: "\u65E9\u9001\u308A",
      rewindSeconds: "{seconds}\u79D2\u623B\u3059",
      forwardSeconds: "{seconds}\u79D2\u9032\u3081\u308B",
      previous: "\u524D\u306E\u30C8\u30E9\u30C3\u30AF",
      next: "\u6B21\u306E\u30C8\u30E9\u30C3\u30AF",
      volume: "\u97F3\u91CF",
      mute: "\u30DF\u30E5\u30FC\u30C8",
      unmute: "\u30DF\u30E5\u30FC\u30C8\u89E3\u9664",
      fullscreen: "\u5168\u753B\u9762\u8868\u793A",
      exitFullscreen: "\u5168\u753B\u9762\u8868\u793A\u3092\u7D42\u4E86",
      captions: "\u5B57\u5E55",
      chapters: "\u30C1\u30E3\u30D7\u30BF\u30FC",
      quality: "\u753B\u8CEA",
      captionStyling: "\u5B57\u5E55\u30B9\u30BF\u30A4\u30EB",
      transcript: "\u6587\u5B57\u8D77\u3053\u3057\u5207\u308A\u66FF\u3048",
      audioDescription: "\u97F3\u58F0\u89E3\u8AAC",
      signLanguage: "\u624B\u8A71\u52D5\u753B",
      settings: "\u8A2D\u5B9A",
      speed: "\u518D\u751F\u901F\u5EA6",
      pip: "\u30D4\u30AF\u30C1\u30E3\u30FC\u30A4\u30F3\u30D4\u30AF\u30C1\u30E3\u30FC",
      currentTime: "\u73FE\u5728\u306E\u6642\u9593",
      duration: "\u518D\u751F\u6642\u9593",
      progress: "\u9032\u884C\u72B6\u6CC1",
      seekForward: "{seconds}\u79D2\u9032\u3081\u308B",
      seekBackward: "{seconds}\u79D2\u623B\u3059",
      volumeUp: "\u97F3\u91CF\u3092\u4E0A\u3052\u308B",
      volumeDown: "\u97F3\u91CF\u3092\u4E0B\u3052\u308B",
      loading: "\u8AAD\u307F\u8FBC\u307F\u4E2D...",
      loadingChapters: "\u30C1\u30E3\u30D7\u30BF\u30FC\u8AAD\u307F\u8FBC\u307F\u4E2D...",
      error: "\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC",
      buffering: "\u30D0\u30C3\u30D5\u30A1\u30EA\u30F3\u30B0\u4E2D...",
      signLanguageVideo: "\u624B\u8A71\u52D5\u753B",
      closeSignLanguage: "\u624B\u8A71\u52D5\u753B\u3092\u9589\u3058\u308B",
      signLanguageSettings: "\u624B\u8A71\u8A2D\u5B9A",
      noChapters: "\u30C1\u30E3\u30D7\u30BF\u30FC\u304C\u3042\u308A\u307E\u305B\u3093",
      noCaptions: "\u5B57\u5E55\u304C\u3042\u308A\u307E\u305B\u3093",
      auto: "\u81EA\u52D5",
      autoQuality: "\u81EA\u52D5\uFF08\u753B\u8CEA\u9078\u629E\u4E0D\u53EF\uFF09",
      noQuality: "\u753B\u8CEA\u9078\u629E\u4E0D\u53EF",
      signLanguageDragResize: "\u624B\u8A71\u52D5\u753B - \u30AD\u30FC\u30DC\u30FC\u30C9\u3067\u30C9\u30E9\u30C3\u30B0\u3059\u308B\u306B\u306FD\u30AD\u30FC\u3092\u3001\u30B5\u30A4\u30BA\u5909\u66F4\u3059\u308B\u306B\u306FR\u30AD\u30FC\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044",
      signLanguageDragActive: "\u624B\u8A71\u52D5\u753B - \u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u304C\u6709\u52B9\u3067\u3059\u3002\u77E2\u5370\u30AD\u30FC\u3067\u79FB\u52D5\u3001Escape\u3067\u7D42\u4E86\u3057\u307E\u3059\u3002",
      signLanguageResizeActive: "\u624B\u8A71\u52D5\u753B - \u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u304C\u6709\u52B9\u3067\u3059\u3002\u5DE6\u53F3\u306E\u77E2\u5370\u30AD\u30FC\u3067\u30B5\u30A4\u30BA\u5909\u66F4\u3001Escape\u3067\u7D42\u4E86\u3057\u307E\u3059\u3002",
      enableSignDragMode: "\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      disableSignDragMode: "\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      enableSignDragModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      disableSignDragModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      enableSignResizeMode: "\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      disableSignResizeMode: "\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      enableSignResizeModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      disableSignResizeModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      resizeHandle: "{direction}\u30B3\u30FC\u30CA\u30FC\u306E\u30B5\u30A4\u30BA\u5909\u66F4",
      moreOptions: "\u305D\u306E\u4ED6\u306E\u30AA\u30D7\u30B7\u30E7\u30F3",
      noMoreOptions: "\u8FFD\u52A0\u306E\u30AA\u30D7\u30B7\u30E7\u30F3\u306F\u3042\u308A\u307E\u305B\u3093"
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
    fontSizes: {
      small: "\u5C0F",
      normal: "\u6A19\u6E96",
      large: "\u5927",
      xlarge: "\u7279\u5927"
    },
    fontFamilies: {
      sansSerif: "\u30B5\u30F3\u30BB\u30EA\u30D5",
      serif: "\u30BB\u30EA\u30D5",
      monospace: "\u7B49\u5E45"
    },
    styleLabels: {
      textColor: "\u30C6\u30AD\u30B9\u30C8\u306E\u8272",
      background: "\u80CC\u666F",
      font: "\u30D5\u30A9\u30F3\u30C8",
      fontSize: "\u30D5\u30A9\u30F3\u30C8\u30B5\u30A4\u30BA",
      opacity: "\u4E0D\u900F\u660E\u5EA6"
    },
    audioDescription: {
      enable: "\u97F3\u58F0\u89E3\u8AAC\u3092\u6709\u52B9\u306B\u3059\u308B",
      disable: "\u97F3\u58F0\u89E3\u8AAC\u3092\u7121\u52B9\u306B\u3059\u308B"
    },
    signLanguage: {
      show: "\u624B\u8A71\u52D5\u753B\u3092\u8868\u793A",
      hide: "\u624B\u8A71\u52D5\u753B\u3092\u975E\u8868\u793A"
    },
    transcript: {
      title: "\u6587\u5B57\u8D77\u3053\u3057",
      close: "\u6587\u5B57\u8D77\u3053\u3057\u3092\u9589\u3058\u308B",
      loading: "\u6587\u5B57\u8D77\u3053\u3057\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D...",
      noTranscript: "\u3053\u306E\u30D3\u30C7\u30AA\u306E\u6587\u5B57\u8D77\u3053\u3057\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
      settings: "\u6587\u5B57\u8D77\u3053\u3057\u8A2D\u5B9A\u3002Enter\u30AD\u30FC\u3067\u30E1\u30CB\u30E5\u30FC\u3092\u958B\u304F\u3001\u307E\u305F\u306FD\u30AD\u30FC\u3067\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B",
      keyboardDragMode: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u5207\u308A\u66FF\u3048\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      keyboardDragActive: "\u2328\uFE0F \u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u6709\u52B9\uFF08\u77E2\u5370\u30AD\u30FC\u3067\u79FB\u52D5\u3001Shift+\u77E2\u5370\u30AD\u30FC\u3067\u5927\u304D\u304F\u79FB\u52D5\u3001D\u307E\u305F\u306FESC\u3067\u7D42\u4E86\uFF09",
      dragResizePrompt: "D\u30AD\u30FC\u3067\u79FB\u52D5\u3001R\u30AD\u30FC\u3067\u30B5\u30A4\u30BA\u5909\u66F4\u3002Home\u3067\u4F4D\u7F6E\u3092\u30EA\u30BB\u30C3\u30C8\u3001Esc\u3067\u9589\u3058\u307E\u3059\u3002",
      dragModeEnabled: "\u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F\u3002\u77E2\u5370\u30AD\u30FC\u3067\u79FB\u52D5\u3001Shift+\u77E2\u5370\u30AD\u30FC\u3067\u5927\u304D\u304F\u79FB\u52D5\u3067\u304D\u307E\u3059\u3002\u7D42\u4E86\u3059\u308B\u306B\u306F D \u307E\u305F\u306F Esc \u3092\u62BC\u3057\u307E\u3059\u3002",
      dragModeDisabled: "\u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F\u3002",
      enableDragMode: "\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      disableDragMode: "\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      enableDragModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      disableDragModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30C9\u30E9\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AD\u30AD\u30FC",
      resizeWindow: "\u30A6\u30A3\u30F3\u30C9\u30A6\u306E\u30B5\u30A4\u30BA\u5909\u66F4",
      disableResizeWindow: "\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B",
      enableResizeMode: "\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      disableResizeMode: "\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      enableResizeModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      disableResizeModeAria: "\u77E2\u5370\u30AD\u30FC\u3067\u30AD\u30FC\u30DC\u30FC\u30C9\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3059\u308B\u3002\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\uFF1AR\u30AD\u30FC",
      resizeModeHint: "\u30EA\u30B5\u30A4\u30BA\u30CF\u30F3\u30C9\u30EB\u304C\u6709\u52B9\u306B\u306A\u308A\u307E\u3057\u305F\u3002\u8FBA\u3084\u89D2\u3092\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u8ABF\u6574\u3057\u307E\u3059\u3002Esc \u307E\u305F\u306F R \u3067\u7D42\u4E86\u3057\u307E\u3059\u3002",
      resizeModeEnabled: "\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F\u3002\u8FBA\u3084\u89D2\u3092\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u8ABF\u6574\u3057\u307E\u3059\u3002Esc \u307E\u305F\u306F R \u3067\u7D42\u4E86\u3057\u307E\u3059\u3002",
      resizeModeDisabled: "\u30B5\u30A4\u30BA\u5909\u66F4\u30E2\u30FC\u30C9\u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F\u3002",
      positionReset: "\u6587\u5B57\u8D77\u3053\u3057\u306E\u4F4D\u7F6E\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\u3002",
      styleTranscript: "\u6587\u5B57\u8D77\u3053\u3057\u30B9\u30BF\u30A4\u30EB\u8A2D\u5B9A\u3092\u958B\u304F",
      closeMenu: "\u30E1\u30CB\u30E5\u30FC\u3092\u9589\u3058\u308B",
      styleTitle: "\u6587\u5B57\u8D77\u3053\u3057\u30B9\u30BF\u30A4\u30EB",
      autoscroll: "\u81EA\u52D5\u30B9\u30AF\u30ED\u30FC\u30EB",
      settingsMenu: "\u6587\u5B57\u8D77\u3053\u3057\u30C0\u30A4\u30A2\u30ED\u30B0\u8A2D\u5B9A"
    },
    settings: {
      title: "\u8A2D\u5B9A",
      quality: "\u753B\u8CEA",
      speed: "\u901F\u5EA6",
      captions: "\u5B57\u5E55",
      language: "\u8A00\u8A9E",
      reset: "\u30EA\u30BB\u30C3\u30C8",
      close: "\u9589\u3058\u308B"
    },
    speeds: {
      normal: "\u901A\u5E38"
    },
    time: {
      display: "\u6642\u9593\u8868\u793A",
      durationPrefix: "\u518D\u751F\u6642\u9593: ",
      of: "/",
      hour: "{count}\u6642\u9593",
      hours: "{count}\u6642\u9593",
      minute: "{count}\u5206",
      minutes: "{count}\u5206",
      second: "{count}\u79D2",
      seconds: "{count}\u79D2"
    }
  };

  // src/i18n/translations.js
  function loadBuiltInTranslations() {
    return {
      en,
      de,
      es,
      fr,
      ja
    };
  }
  var translations = loadBuiltInTranslations();

  // src/i18n/i18n.js
  var I18n = class {
    constructor() {
      this.currentLanguage = "en";
      this.translations = loadBuiltInTranslations();
      this.loadingPromises = /* @__PURE__ */ new Map();
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
    /**
     * Load a language file from a URL (JSON or YAML)
     * @param {string} langCode - Language code (e.g., 'pt', 'it')
     * @param {string} url - URL to the language file (JSON or YAML)
     * @returns {Promise<void>}
     */
    async loadLanguageFromUrl(langCode, url) {
      if (this.loadingPromises.has(url)) {
        return this.loadingPromises.get(url);
      }
      const loadPromise = (async () => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to load language file: ${response.statusText}`);
          }
          const contentType = response.headers.get("content-type") || "";
          let translations2;
          if (contentType.includes("application/json") || url.endsWith(".json")) {
            translations2 = await response.json();
          } else if (contentType.includes("text/yaml") || contentType.includes("application/x-yaml") || url.endsWith(".yaml") || url.endsWith(".yml")) {
            const text = await response.text();
            try {
              translations2 = JSON.parse(text);
            } catch (e) {
              if (typeof window !== "undefined" && window.jsyaml) {
                translations2 = window.jsyaml.load(text);
              } else {
                console.warn("YAML parsing requires js-yaml library. Please include it or use JSON format.");
                throw new Error("YAML parsing not available. Please use JSON format or include js-yaml library.");
              }
            }
          } else {
            translations2 = await response.json();
          }
          this.addTranslation(langCode, translations2);
          return translations2;
        } catch (error) {
          console.error(`Error loading language file from ${url}:`, error);
          throw error;
        } finally {
          this.loadingPromises.delete(url);
        }
      })();
      this.loadingPromises.set(url, loadPromise);
      return loadPromise;
    }
    /**
     * Load multiple language files from URLs
     * @param {Object} languageMap - Object mapping language codes to URLs
     * @returns {Promise<void>}
     */
    async loadLanguagesFromUrls(languageMap) {
      const promises = Object.entries(languageMap).map(
        ([langCode, url]) => this.loadLanguageFromUrl(langCode, url)
      );
      await Promise.all(promises);
    }
  };
  var i18n = new I18n();

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
        return i18n.t("time.seconds", { count: 0 });
      }
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds % 3600 / 60);
      const secs = Math.floor(seconds % 60);
      const parts = [];
      if (hours > 0) {
        const key = hours === 1 ? "time.hour" : "time.hours";
        parts.push(i18n.t(key, { count: hours }));
      }
      if (minutes > 0) {
        const key = minutes === 1 ? "time.minute" : "time.minutes";
        parts.push(i18n.t(key, { count: minutes }));
      }
      if (secs > 0 || parts.length === 0) {
        const key = secs === 1 ? "time.second" : "time.seconds";
        parts.push(i18n.t(key, { count: secs }));
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
  var iconPaths = {
    play: `<path d="M8 5v14l11-7z"/>`,
    pause: `<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>`,
    stop: `<rect x="6" y="6" width="12" height="12"/>`,
    rewind: `<path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>`,
    forward: `<path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>`,
    skipPrevious: `<path d="M6 6h2v12H6V6zm3 6l8.5 6V6L9 12z"/>`,
    skipNext: `<path d="M16 6h2v12h-2V6zM6 6l8.5 6L6 18V6z"/>`,
    restart: `<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>`,
    volumeHigh: `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`,
    volumeMedium: `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>`,
    volumeLow: `<path d="M7 9v6h4l5 5V4l-5 5H7z"/>`,
    volumeMuted: `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`,
    fullscreen: `<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>`,
    fullscreenExit: `<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>`,
    settings: `<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>`,
    captions: `<path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>`,
    captionsOff: `<path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/><path d="M0 0h24v24H0z" fill="none"/>`,
    pip: `<path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>`,
    speed: `<path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44z"/><path d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/>`,
    close: `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`,
    check: `<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
    arrowUp: `<path d="M7 14l5-5 5 5z"/>`,
    arrowDown: `<path d="M7 10l5 5 5-5z"/>`,
    arrowLeft: `<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>`,
    arrowRight: `<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>`,
    loading: `<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>`,
    error: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>`,
    download: `<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>`,
    link: `<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>`,
    playlist: `<path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>`,
    language: `<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>`,
    hd: `<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1c0 .55-.45 1-1 1h-.75v1.5h-1.5V15H14c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v4zm-3.5-.5h2v-3h-2v3z"/>`,
    transcript: `<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>`,
    audioDescription: `<rect x="2" y="5" width="20" height="14" rx="2" fill="#ffffff" stroke="#ffffff" stroke-width="2"/><text x="12" y="16" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="#1a1a1a">AD</text>`,
    audioDescriptionOn: `<rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">AD</text>`,
    signLanguage: `<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>`,
    signLanguageOn: `<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>`,
    speaker: `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>`,
    music: `<path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7zm-1.5 16c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>`,
    moreVertical: `<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>`,
    moreHorizontal: `<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>`,
    move: `<path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>`,
    resize: `<path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v2.5L7 11l3-3.5V10h4V7.5l3 3.5-3 3.5z"/>`
  };
  var svgWrapper = (paths) => `<svg viewBox="0 0 24 24" fill="currentColor">${paths}</svg>`;
  var Icons = Object.fromEntries(
    Object.entries(iconPaths).map(([key, value]) => [key, svgWrapper(value)])
  );
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
  function createPlayOverlay() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "vidply-play-overlay");
    svg.setAttribute("viewBox", "0 0 80 80");
    svg.setAttribute("width", "80");
    svg.setAttribute("height", "80");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("role", "presentation");
    svg.style.cursor = "pointer";
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filterId = `vidply-play-shadow-${Math.random().toString(36).substr(2, 9)}`;
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", filterId);
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");
    const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussianBlur.setAttribute("in", "SourceAlpha");
    feGaussianBlur.setAttribute("stdDeviation", "3");
    const feOffset = document.createElementNS("http://www.w3.org/2000/svg", "feOffset");
    feOffset.setAttribute("dx", "0");
    feOffset.setAttribute("dy", "2");
    feOffset.setAttribute("result", "offsetblur");
    const feComponentTransfer = document.createElementNS("http://www.w3.org/2000/svg", "feComponentTransfer");
    const feFuncA = document.createElementNS("http://www.w3.org/2000/svg", "feFuncA");
    feFuncA.setAttribute("type", "linear");
    feFuncA.setAttribute("slope", "0.3");
    feComponentTransfer.appendChild(feFuncA);
    const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
    const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feOffset);
    filter.appendChild(feComponentTransfer);
    filter.appendChild(feMerge);
    defs.appendChild(filter);
    svg.appendChild(defs);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "40");
    circle.setAttribute("cy", "40");
    circle.setAttribute("r", "40");
    circle.setAttribute("fill", "rgba(255, 255, 255, 0.95)");
    circle.setAttribute("filter", `url(#${filterId})`);
    circle.setAttribute("class", "vidply-play-overlay-bg");
    svg.appendChild(circle);
    const playTriangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    playTriangle.setAttribute("points", "32,28 32,52 54,40");
    playTriangle.setAttribute("fill", "#0a406e");
    playTriangle.setAttribute("class", "vidply-play-overlay-icon");
    svg.appendChild(playTriangle);
    return svg;
  }

  // src/utils/FocusUtils.js
  function focusElement(element, { delay = 0, preventScroll = true } = {}) {
    if (!element) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (element && document.contains(element)) {
          element.focus({ preventScroll });
        }
      }, delay);
    });
  }
  function focusFirstElement(container, selector, options = {}) {
    if (!container) return;
    const element = container.querySelector(selector);
    if (element) {
      focusElement(element, options);
    }
  }

  // src/controls/ControlBar.js
  var ControlBar = class {
    constructor(player) {
      this.player = player;
      this.element = null;
      this.controls = {};
      this.hideTimeout = null;
      this.isDraggingProgress = false;
      this.isDraggingVolume = false;
      this.openMenu = null;
      this.openMenuButton = null;
      this.init();
    }
    init() {
      this.createElement();
      this.createControls();
      this.attachEvents();
      this.setupAutoHide();
      this.setupOverflowDetection();
    }
    // Helper method to check if we're on a mobile device
    isMobile() {
      return window.innerWidth < 768;
    }
    // Helper method to detect touch devices
    isTouchDevice() {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    }
    // Smart menu positioning to avoid overflow
    positionMenu(menu, button, immediate = false) {
      const isMobile2 = this.isMobile();
      const isOverflowMenu = menu.classList.contains(`${this.player.options.classPrefix}-overflow-menu-list`);
      if (isMobile2) {
        const isVolumeMenu = menu.classList.contains(`${this.player.options.classPrefix}-volume-menu`);
        const doMobilePositioning = () => {
          const parentContainer = button.parentElement;
          if (!parentContainer) return;
          const buttonRect = button.getBoundingClientRect();
          const parentRect = parentContainer.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          if (isVolumeMenu) {
            const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
            menu.style.left = `${buttonCenterX}px`;
            menu.style.right = "auto";
            menu.style.transform = "translateX(-50%)";
            return;
          }
          if (menuRect.right > viewportWidth) {
            menu.style.left = "auto";
            menu.style.right = "10px";
            menu.style.transform = "none";
          }
          if (menuRect.left < 0) {
            menu.style.left = "10px";
            menu.style.right = "auto";
            menu.style.transform = "none";
          }
          if (menuRect.top < 10) {
            menu.style.top = "10px";
          }
          if (menuRect.bottom > viewportHeight - 10) {
            menu.style.bottom = "10px";
            menu.style.top = "auto";
          }
        };
        if (immediate) {
          doMobilePositioning();
        } else {
          requestAnimationFrame(doMobilePositioning);
        }
        return;
      }
      const doPositioning = () => {
        const buttonRect = button.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const parentContainer = button.parentElement;
        if (!parentContainer) return;
        const parentRect = parentContainer.getBoundingClientRect();
        const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
        const buttonBottom = buttonRect.bottom - parentRect.top;
        const buttonTop = buttonRect.top - parentRect.top;
        const spaceAbove = buttonRect.top;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        let menuTop = buttonTop - menuRect.height - 8;
        let menuBottom = null;
        if (spaceAbove < menuRect.height + 20 && spaceBelow > spaceAbove) {
          menuTop = null;
          const parentHeight = parentRect.bottom - parentRect.top;
          menuBottom = parentHeight - buttonBottom + 8;
          menu.classList.add("vidply-menu-below");
        } else {
          menu.classList.remove("vidply-menu-below");
        }
        let menuLeft = "auto";
        let menuRight = "auto";
        let transformX = "translateX(0)";
        if (isOverflowMenu) {
          menuLeft = "auto";
          menuRight = 0;
          transformX = "translateX(0)";
        } else {
          menuLeft = buttonCenterX - menuRect.width / 2;
          const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
          if (menuLeftAbsolute < 10) {
            menuLeft = 0;
            transformX = "translateX(0)";
          } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
            menuLeft = "auto";
            menuRight = 0;
            transformX = "translateX(0)";
          } else {
            menuLeft = buttonCenterX;
            transformX = "translateX(-50%)";
          }
        }
        if (menuTop !== null) {
          menu.style.top = `${menuTop}px`;
          menu.style.bottom = "auto";
        } else if (menuBottom !== null) {
          menu.style.top = "auto";
          menu.style.bottom = `${menuBottom}px`;
        }
        if (menuLeft !== "auto") {
          menu.style.left = `${menuLeft}px`;
          menu.style.right = "auto";
        } else {
          menu.style.left = "auto";
          menu.style.right = `${menuRight}px`;
        }
        menu.style.transform = transformX;
      };
      if (immediate) {
        doPositioning();
      } else {
        requestAnimationFrame(() => {
          setTimeout(doPositioning, 10);
        });
      }
    }
    // Helper method to attach close-on-outside-click behavior to menus
    attachMenuCloseHandler(menu, button, preventCloseOnInteraction = false) {
      if (this.openMenu && this.openMenu !== menu && this.openMenuButton) {
        if (this.openMenuButton._vidplyBlurHandler) {
          this.openMenuButton.removeEventListener("blur", this.openMenuButton._vidplyBlurHandler);
          delete this.openMenuButton._vidplyBlurHandler;
        }
        if (this.openMenuButton._vidplyMousedownHandler) {
          this.openMenuButton.removeEventListener("mousedown", this.openMenuButton._vidplyMousedownHandler);
          delete this.openMenuButton._vidplyMousedownHandler;
        }
        if (this.openMenu && document.contains(this.openMenu)) {
          this.openMenu.remove();
        } else if (this.openMenu && this.openMenu.parentNode) {
          this.openMenu.parentNode.removeChild(this.openMenu);
        }
        if (this.openMenuButton) {
          this.openMenuButton.setAttribute("aria-expanded", "false");
        }
      }
      this.openMenu = menu;
      this.openMenuButton = button;
      this.positionMenu(menu, button);
      if (button) {
        button.setAttribute("aria-expanded", "true");
      }
      let isClickingButton = false;
      let blurHandlerActive = true;
      const handleButtonMousedown = () => {
        isClickingButton = true;
        blurHandlerActive = false;
        setTimeout(() => {
          isClickingButton = false;
          blurHandlerActive = true;
        }, 200);
      };
      button.addEventListener("mousedown", handleButtonMousedown);
      button._vidplyMousedownHandler = handleButtonMousedown;
      const handleButtonBlur = (e) => {
        if (!blurHandlerActive || isClickingButton) {
          return;
        }
        if (this.openMenu !== menu) {
          return;
        }
        const relatedTarget = e.relatedTarget;
        requestAnimationFrame(() => {
          setTimeout(() => {
            var _a;
            if (!blurHandlerActive || this.openMenu !== menu) {
              return;
            }
            const activeElement = document.activeElement;
            if (menu.contains(activeElement)) {
              return;
            }
            const signLanguageWrapper = this.player.signLanguageWrapper;
            const transcriptWindow = (_a = this.player.transcriptManager) == null ? void 0 : _a.transcriptWindow;
            if (signLanguageWrapper && signLanguageWrapper.contains(activeElement) || transcriptWindow && transcriptWindow.contains(activeElement)) {
              return;
            }
            const controlBarButtons = this.element.querySelectorAll("button");
            const isFocusOnAnotherButton = Array.from(controlBarButtons).includes(activeElement) && activeElement !== button;
            const isRelatedTargetAnotherButton = relatedTarget && Array.from(controlBarButtons).includes(relatedTarget) && relatedTarget !== button;
            if (isFocusOnAnotherButton || isRelatedTargetAnotherButton) {
              if (this.openMenu !== menu) {
                return;
              }
              if (menu && document.contains(menu)) {
                menu.remove();
              } else if (menu && menu.parentNode) {
                menu.parentNode.removeChild(menu);
              }
              if (button) {
                button.setAttribute("aria-expanded", "false");
              }
              if (this.openMenu === menu) {
                this.openMenu = null;
                this.openMenuButton = null;
              }
              button.removeEventListener("blur", handleButtonBlur);
              button.removeEventListener("mousedown", handleButtonMousedown);
              delete button._vidplyBlurHandler;
              delete button._vidplyMousedownHandler;
            }
          }, 10);
        });
      };
      button.addEventListener("blur", handleButtonBlur);
      button._vidplyBlurHandler = handleButtonBlur;
      const closeMenuAndUpdateAria = () => {
        this.closeMenuAndReturnFocus(menu, button);
      };
      let documentClickHandler = null;
      let documentEscapeHandler = null;
      setTimeout(() => {
        documentClickHandler = (e) => {
          if (preventCloseOnInteraction && menu.contains(e.target)) {
            return;
          }
          if (this.openMenu === menu && !menu.contains(e.target) && !button.contains(e.target)) {
            closeMenuAndUpdateAria();
            if (documentClickHandler) {
              document.removeEventListener("click", documentClickHandler);
            }
            if (documentEscapeHandler) {
              document.removeEventListener("keydown", documentEscapeHandler);
            }
          }
        };
        documentEscapeHandler = (e) => {
          if (e.key === "Escape" && this.openMenu === menu) {
            e.preventDefault();
            e.stopPropagation();
            this.closeMenuAndReturnFocus(menu, button, true);
            if (documentClickHandler) {
              document.removeEventListener("click", documentClickHandler);
            }
            if (documentEscapeHandler) {
              document.removeEventListener("keydown", documentEscapeHandler);
            }
          }
        };
        document.addEventListener("click", documentClickHandler);
        document.addEventListener("keydown", documentEscapeHandler);
      }, 100);
    }
    // Helper method to close menu and return focus to button
    closeMenuAndReturnFocus(menu, button, returnFocus = true) {
      if (menu) {
        if (document.contains(menu)) {
          menu.remove();
        } else if (menu.parentNode) {
          menu.parentNode.removeChild(menu);
        }
      }
      if (button) {
        button.setAttribute("aria-expanded", "false");
        if (returnFocus) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (button && document.contains(button)) {
                button.focus({ preventScroll: true });
              }
            }, 0);
          });
        }
      }
      if (this.openMenu === menu) {
        this.openMenu = null;
        this.openMenuButton = null;
      }
    }
    // Close any open menu when tabbing to another button or clicking another button
    closeOpenMenu() {
      if (this.openMenu && this.openMenuButton) {
        if (this.openMenu && document.contains(this.openMenu)) {
          this.openMenu.remove();
        } else if (this.openMenu && this.openMenu.parentNode) {
          this.openMenu.parentNode.removeChild(this.openMenu);
        }
        if (this.openMenuButton) {
          this.openMenuButton.setAttribute("aria-expanded", "false");
        }
        this.openMenu = null;
        this.openMenuButton = null;
      }
    }
    // Helper method to add keyboard navigation to menus (arrow keys)
    attachMenuKeyboardNavigation(menu, button) {
      const menuItems = Array.from(menu.querySelectorAll(`.${this.player.options.classPrefix}-menu-item`));
      if (menuItems.length === 0) return;
      const handleKeyDown = (e) => {
        const currentIndex = menuItems.indexOf(document.activeElement);
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            e.stopPropagation();
            const nextIndex = (currentIndex + 1) % menuItems.length;
            menuItems[nextIndex].focus();
            break;
          case "ArrowUp":
            e.preventDefault();
            e.stopPropagation();
            const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
            menuItems[prevIndex].focus();
            break;
          case "ArrowLeft":
          case "ArrowRight":
            e.preventDefault();
            e.stopPropagation();
            break;
          case "Home":
            e.preventDefault();
            e.stopPropagation();
            menuItems[0].focus();
            break;
          case "End":
            e.preventDefault();
            e.stopPropagation();
            menuItems[menuItems.length - 1].focus();
            break;
          case "Enter":
          case " ":
            e.preventDefault();
            e.stopPropagation();
            if (document.activeElement && menuItems.includes(document.activeElement)) {
              document.activeElement.click();
              focusElement(button, { delay: 0 });
            }
            break;
          case "Escape":
            e.preventDefault();
            e.stopPropagation();
            this.closeMenuAndReturnFocus(menu, button, true);
            break;
        }
      };
      menu.addEventListener("keydown", handleKeyDown);
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
      const progressTimeWrapper = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-progress-time-wrapper`
      });
      if (this.player.options.progressBar) {
        this.createProgressBar();
        progressTimeWrapper.appendChild(this.controls.progress);
      }
      if (this.player.options.currentTime || this.player.options.duration) {
        progressTimeWrapper.appendChild(this.createTimeDisplay());
      }
      this.element.appendChild(progressTimeWrapper);
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
      leftButtons.appendChild(this.createRestartButton());
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
        if (this.isTouchDevice()) {
          leftButtons.appendChild(this.createMuteButton());
        } else {
          leftButtons.appendChild(this.createVolumeControl());
        }
      }
      this.rightButtons = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-controls-right`
      });
      const hasChapters = this.hasChapterTracks();
      const hasCaptions = this.hasCaptionTracks();
      const hasQualityLevels = this.hasQualityLevels();
      const hasAudioDescription = this.hasAudioDescription();
      if (this.player.options.chaptersButton && hasChapters) {
        const btn = this.createChaptersButton();
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      if (this.player.options.captionsButton && hasCaptions) {
        const btn = this.createCaptionsButton();
        btn.dataset.overflowPriority = "1";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      if (this.player.options.captionStyleButton && hasCaptions) {
        const btn = this.createCaptionStyleButton();
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      if (this.player.options.speedButton) {
        const btn = this.createSpeedButton();
        btn.dataset.overflowPriority = "1";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      if (this.player.options.audioDescriptionButton && hasAudioDescription) {
        const btn = this.createAudioDescriptionButton();
        btn.dataset.overflowPriority = "2";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      if (this.player.options.transcriptButton && hasCaptions) {
        const btn = this.createTranscriptButton();
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      const hasSignLanguage = this.hasSignLanguage();
      if (this.player.options.signLanguageButton && hasSignLanguage) {
        const btn = this.createSignLanguageButton();
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      if (this.player.options.qualityButton && hasQualityLevels) {
        const btn = this.createQualityButton();
        btn.dataset.overflowPriority = "2";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      if (this.player.options.pipButton && "pictureInPictureEnabled" in document) {
        const btn = this.createPipButton();
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      const isAudioPlayer = this.player.element.tagName.toLowerCase() === "audio";
      if (this.player.options.fullscreenButton && !isAudioPlayer) {
        const btn = this.createFullscreenButton();
        btn.dataset.overflowPriority = "1";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
      this.overflowMenuButton = this.createOverflowMenuButton();
      this.overflowMenuButton.style.display = "none";
      this.rightButtons.appendChild(this.overflowMenuButton);
      buttonContainer.appendChild(leftButtons);
      buttonContainer.appendChild(this.rightButtons);
      this.element.appendChild(buttonContainer);
      this.ensureButtonTitles(buttonContainer);
    }
    /**
     * Ensure all buttons in the controls have title attributes
     * Uses aria-label as title if title is not present
     */
    ensureButtonTitles(container) {
      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        if (!button.hasAttribute("title")) {
          const ariaLabel = button.getAttribute("aria-label");
          if (ariaLabel) {
            button.setAttribute("title", ariaLabel);
          }
        }
      });
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
      if (this.player.renderer && this.player.renderer.getQualities) {
        const qualities = this.player.renderer.getQualities();
        return qualities && qualities.length > 1;
      }
      return false;
    }
    hasAudioDescription() {
      if (this.player.audioDescriptionSrc && this.player.audioDescriptionSrc.length > 0) {
        return true;
      }
      const textTracks = Array.from(this.player.element.textTracks || []);
      return textTracks.some((track) => track.kind === "descriptions");
    }
    hasSignLanguage() {
      const hasSingleSource = this.player.signLanguageSrc && this.player.signLanguageSrc.length > 0;
      const hasMultipleSources = this.player.signLanguageSources && Object.keys(this.player.signLanguageSources).length > 0;
      return hasSingleSource || hasMultipleSources;
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
          this.controls.progressTooltip.setAttribute("aria-label", TimeUtils.formatDuration(time));
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
    createRestartButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-restart`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.restart")
        }
      });
      button.appendChild(createIconElement("restart"));
      button.addEventListener("click", () => {
        this.player.seek(0);
        this.player.play();
      });
      return button;
    }
    createPreviousButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-previous`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.previous")
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
          "aria-label": i18n.t("player.next")
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
          "aria-label": i18n.t("player.rewindSeconds", { seconds: 15 })
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
          "aria-label": i18n.t("player.forwardSeconds", { seconds: 15 })
        }
      });
      button.appendChild(createIconElement("forward"));
      button.addEventListener("click", () => {
        this.player.seekForward(15);
      });
      return button;
    }
    createMuteButton() {
      const muteButton = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-mute`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.mute")
        }
      });
      muteButton.appendChild(createIconElement("volumeHigh"));
      muteButton.addEventListener("click", () => {
        this.player.toggleMute();
      });
      this.controls.mute = muteButton;
      return muteButton;
    }
    createVolumeControl() {
      const muteButton = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-mute`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.volume"),
          "aria-expanded": "false"
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
        button.setAttribute("aria-expanded", "false");
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
      const initialVolumePercent = this.player.state.volume * 100;
      volumeFill.style.height = `${initialVolumePercent}%`;
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
        e.preventDefault();
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
      volumeSlider.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.isDraggingVolume = true;
        const touch = e.touches[0];
        updateVolume(touch.clientY);
      }, { passive: false });
      volumeSlider.addEventListener("touchmove", (e) => {
        if (this.isDraggingVolume) {
          e.preventDefault();
          const touch = e.touches[0];
          updateVolume(touch.clientY);
        }
      }, { passive: false });
      volumeSlider.addEventListener("touchend", (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.isDraggingVolume = false;
      }, { passive: false });
      volumeSlider.addEventListener("touchcancel", () => {
        this.isDraggingVolume = false;
      });
      volumeSlider.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          this.player.setVolume(Math.min(1, this.player.state.volume + 0.1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          this.player.setVolume(Math.max(0, this.player.state.volume - 0.1));
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          this.closeMenuAndReturnFocus(volumeMenu, button, true);
        }
      });
      volumeMenu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      volumeMenu.addEventListener("touchstart", (e) => {
        e.stopPropagation();
      });
      volumeMenu.addEventListener("touchmove", (e) => {
        e.stopPropagation();
      });
      volumeMenu.addEventListener("touchend", (e) => {
        e.stopPropagation();
      });
      volumeMenu.style.visibility = "hidden";
      volumeMenu.style.display = "block";
      button.insertAdjacentElement("afterend", volumeMenu);
      this.positionMenu(volumeMenu, button, true);
      requestAnimationFrame(() => {
        volumeMenu.style.visibility = "visible";
      });
      this.controls.volumeSlider = volumeSlider;
      this.controls.volumeFill = volumeFill;
      focusElement(volumeSlider, { delay: 50 });
      this.attachMenuCloseHandler(volumeMenu, button, true);
    }
    createTimeDisplay() {
      const container = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-time`,
        attributes: {
          "role": "group",
          "aria-label": i18n.t("time.display")
        }
      });
      this.controls.currentTimeDisplay = DOMUtils.createElement("span", {
        className: `${this.player.options.classPrefix}-current-time`
      });
      const currentTimeVisual = DOMUtils.createElement("span", {
        textContent: "00:00",
        attributes: {
          "aria-hidden": "true"
        }
      });
      const currentTimeAccessible = DOMUtils.createElement("span", {
        className: "vidply-sr-only",
        textContent: i18n.t("time.seconds", { count: 0 })
      });
      this.controls.currentTimeDisplay.appendChild(currentTimeVisual);
      this.controls.currentTimeDisplay.appendChild(currentTimeAccessible);
      this.controls.currentTimeVisual = currentTimeVisual;
      this.controls.currentTimeAccessible = currentTimeAccessible;
      const separator = DOMUtils.createElement("span", {
        textContent: " / ",
        attributes: {
          "aria-hidden": "true"
        }
      });
      this.controls.durationDisplay = DOMUtils.createElement("span", {
        className: `${this.player.options.classPrefix}-duration`
      });
      const durationVisual = DOMUtils.createElement("span", {
        textContent: "00:00",
        attributes: {
          "aria-hidden": "true"
        }
      });
      const durationAccessible = DOMUtils.createElement("span", {
        className: "vidply-sr-only",
        textContent: i18n.t("time.durationPrefix") + i18n.t("time.seconds", { count: 0 })
      });
      this.controls.durationDisplay.appendChild(durationVisual);
      this.controls.durationDisplay.appendChild(durationAccessible);
      this.controls.durationVisual = durationVisual;
      this.controls.durationAccessible = durationAccessible;
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
          "aria-label": i18n.t("player.chapters"),
          "aria-expanded": "false"
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
        button.setAttribute("aria-expanded", "false");
        if (this.openMenu === existingMenu) {
          this.openMenu = null;
          this.openMenuButton = null;
        }
        return;
      }
      const menu = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-chapters-menu ${this.player.options.classPrefix}-menu`,
        attributes: {
          "role": "menu",
          "aria-label": i18n.t("player.chapters")
        }
      });
      const chapterTracks = Array.from(this.player.element.textTracks).filter(
        (track) => track.kind === "chapters"
      );
      if (chapterTracks.length === 0) {
        const noChaptersItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: i18n.t("player.noChapters"),
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
            textContent: i18n.t("player.loadingChapters"),
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
                "role": "menuitem",
                "tabindex": "-1"
              }
            });
            const timeLabel = DOMUtils.createElement("span", {
              className: `${this.player.options.classPrefix}-chapter-time`,
              textContent: TimeUtils.formatTime(cue.startTime),
              attributes: {
                "aria-label": TimeUtils.formatDuration(cue.startTime)
              }
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
              this.closeMenuAndReturnFocus(menu, button);
            });
            menu.appendChild(item);
          }
          this.attachMenuKeyboardNavigation(menu, button);
          setTimeout(() => {
            const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
            if (firstItem) {
              firstItem.focus();
            }
          }, 0);
        }
      }
      menu.style.visibility = "hidden";
      menu.style.display = "block";
      button.insertAdjacentElement("afterend", menu);
      this.positionMenu(menu, button, true);
      requestAnimationFrame(() => {
        menu.style.visibility = "visible";
      });
      this.attachMenuCloseHandler(menu, button);
    }
    createQualityButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-quality`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.quality"),
          "aria-expanded": "false"
        }
      });
      button.appendChild(createIconElement("hd"));
      const qualityText = DOMUtils.createElement("span", {
        className: `${this.player.options.classPrefix}-quality-text`,
        textContent: ""
      });
      button.appendChild(qualityText);
      button.addEventListener("click", () => {
        this.showQualityMenu(button);
      });
      this.controls.quality = button;
      this.controls.qualityText = qualityText;
      setTimeout(() => this.updateQualityIndicator(), 500);
      return button;
    }
    showQualityMenu(button) {
      const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-quality-menu`);
      if (existingMenu) {
        existingMenu.remove();
        button.setAttribute("aria-expanded", "false");
        if (this.openMenu === existingMenu) {
          this.openMenu = null;
          this.openMenuButton = null;
        }
        return;
      }
      const menu = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-quality-menu ${this.player.options.classPrefix}-menu`,
        attributes: {
          "role": "menu",
          "aria-label": i18n.t("player.quality")
        }
      });
      if (this.player.renderer && this.player.renderer.getQualities) {
        const qualities = this.player.renderer.getQualities();
        const currentQuality = this.player.renderer.getCurrentQuality ? this.player.renderer.getCurrentQuality() : -1;
        const isHLS = this.player.renderer.hls !== void 0;
        if (qualities.length === 0) {
          const noQualityItem = DOMUtils.createElement("div", {
            className: `${this.player.options.classPrefix}-menu-item`,
            textContent: i18n.t("player.autoQuality"),
            style: { opacity: "0.5", cursor: "default" }
          });
          menu.appendChild(noQualityItem);
        } else {
          let activeItem = null;
          if (isHLS) {
            const autoItem = DOMUtils.createElement("button", {
              className: `${this.player.options.classPrefix}-menu-item`,
              textContent: i18n.t("player.auto"),
              attributes: {
                "type": "button",
                "role": "menuitem",
                "tabindex": "-1"
              }
            });
            const isAuto = this.player.renderer.hls && this.player.renderer.hls.currentLevel === -1;
            if (isAuto) {
              autoItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
              autoItem.appendChild(createIconElement("check"));
              activeItem = autoItem;
            }
            autoItem.addEventListener("click", () => {
              if (this.player.renderer.switchQuality) {
                this.player.renderer.switchQuality(-1);
              }
              this.closeMenuAndReturnFocus(menu, button);
            });
            menu.appendChild(autoItem);
          }
          qualities.forEach((quality) => {
            const item = DOMUtils.createElement("button", {
              className: `${this.player.options.classPrefix}-menu-item`,
              textContent: quality.name || `${quality.height}p`,
              attributes: {
                "type": "button",
                "role": "menuitem",
                "tabindex": "-1"
              }
            });
            if (quality.index === currentQuality) {
              item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
              item.appendChild(createIconElement("check"));
              activeItem = item;
            }
            item.addEventListener("click", () => {
              if (this.player.renderer.switchQuality) {
                this.player.renderer.switchQuality(quality.index);
              }
              this.closeMenuAndReturnFocus(menu, button);
            });
            menu.appendChild(item);
          });
          this.attachMenuKeyboardNavigation(menu, button);
          setTimeout(() => {
            const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
            if (focusTarget) {
              focusTarget.focus();
            }
          }, 0);
        }
      } else {
        const noSupportItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: i18n.t("player.noQuality"),
          style: { opacity: "0.5", cursor: "default" }
        });
        menu.appendChild(noSupportItem);
      }
      menu.style.visibility = "hidden";
      menu.style.display = "block";
      button.insertAdjacentElement("afterend", menu);
      this.positionMenu(menu, button, true);
      requestAnimationFrame(() => {
        menu.style.visibility = "visible";
      });
      this.attachMenuCloseHandler(menu, button);
    }
    createCaptionStyleButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-caption-style`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.captionStyling"),
          "aria-expanded": "false",
          "title": i18n.t("player.captionStyling")
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
        button.setAttribute("aria-expanded", "false");
        if (this.openMenu === existingMenu) {
          this.openMenu = null;
          this.openMenuButton = null;
        }
        return;
      }
      const menu = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-caption-style-menu ${this.player.options.classPrefix}-menu ${this.player.options.classPrefix}-settings-menu`,
        attributes: {
          "role": "menu",
          "aria-label": i18n.t("player.captionStyling")
        }
      });
      menu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
        const noTracksItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: i18n.t("player.noCaptions"),
          style: { opacity: "0.5", cursor: "default", padding: "12px 16px" }
        });
        menu.appendChild(noTracksItem);
        menu.style.visibility = "hidden";
        menu.style.display = "block";
        button.insertAdjacentElement("afterend", menu);
        this.positionMenu(menu, button, true);
        requestAnimationFrame(() => {
          menu.style.visibility = "visible";
        });
        this.attachMenuCloseHandler(menu, button, true);
        return;
      }
      const fontSizeGroup = this.createStyleControl(
        i18n.t("styleLabels.fontSize"),
        "captionsFontSize",
        [
          { label: i18n.t("fontSizes.small"), value: "87.5%" },
          { label: i18n.t("fontSizes.normal"), value: "100%" },
          { label: i18n.t("fontSizes.large"), value: "125%" },
          { label: i18n.t("fontSizes.xlarge"), value: "150%" }
        ]
      );
      menu.appendChild(fontSizeGroup);
      const fontFamilyGroup = this.createStyleControl(
        i18n.t("styleLabels.font"),
        "captionsFontFamily",
        [
          { label: i18n.t("fontFamilies.sansSerif"), value: "sans-serif" },
          { label: i18n.t("fontFamilies.serif"), value: "serif" },
          { label: i18n.t("fontFamilies.monospace"), value: "monospace" }
        ]
      );
      menu.appendChild(fontFamilyGroup);
      const colorGroup = this.createColorControl(i18n.t("styleLabels.textColor"), "captionsColor");
      menu.appendChild(colorGroup);
      const bgColorGroup = this.createColorControl(i18n.t("styleLabels.background"), "captionsBackgroundColor");
      menu.appendChild(bgColorGroup);
      const opacityGroup = this.createOpacityControl(i18n.t("styleLabels.opacity"), "captionsOpacity");
      menu.appendChild(opacityGroup);
      menu.style.minWidth = "220px";
      menu.style.visibility = "hidden";
      menu.style.display = "block";
      button.insertAdjacentElement("afterend", menu);
      this.positionMenu(menu, button, true);
      requestAnimationFrame(() => {
        menu.style.visibility = "visible";
      });
      this.attachMenuCloseHandler(menu, button, true);
      focusFirstElement(menu, `.${this.player.options.classPrefix}-style-select`);
    }
    createStyleControl(label, property, options) {
      const group = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-style-group`
      });
      const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;
      const labelEl = DOMUtils.createElement("label", {
        textContent: label,
        attributes: {
          "for": controlId
        },
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
        attributes: {
          "id": controlId
        },
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
      const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;
      const labelEl = DOMUtils.createElement("label", {
        textContent: label,
        attributes: {
          "for": controlId
        },
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
          "id": controlId,
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
      const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;
      const labelContainer = DOMUtils.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px"
        }
      });
      const labelEl = DOMUtils.createElement("label", {
        textContent: label,
        attributes: {
          "for": controlId
        },
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
          "id": controlId,
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
          "aria-expanded": "false"
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
    formatSpeedLabel(speed) {
      if (speed === 1) {
        return i18n.t("speeds.normal");
      }
      const speedStr = speed.toLocaleString(i18n.getLanguage(), {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
      return `${speedStr}\xD7`;
    }
    showSpeedMenu(button) {
      const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-speed-menu`);
      if (existingMenu) {
        existingMenu.remove();
        button.setAttribute("aria-expanded", "false");
        if (this.openMenu === existingMenu) {
          this.openMenu = null;
          this.openMenuButton = null;
        }
        return;
      }
      const menu = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-speed-menu ${this.player.options.classPrefix}-menu`,
        attributes: {
          "role": "menu"
        }
      });
      const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
      let activeItem = null;
      speeds.forEach((speed) => {
        const item = DOMUtils.createElement("button", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: this.formatSpeedLabel(speed),
          attributes: {
            "type": "button",
            "role": "menuitem",
            "tabindex": "-1"
          }
        });
        if (speed === this.player.state.playbackSpeed) {
          item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
          item.appendChild(createIconElement("check"));
          activeItem = item;
        }
        item.addEventListener("click", () => {
          this.player.setPlaybackSpeed(speed);
          this.closeMenuAndReturnFocus(menu, button);
        });
        menu.appendChild(item);
      });
      menu.style.visibility = "hidden";
      menu.style.display = "block";
      button.insertAdjacentElement("afterend", menu);
      this.positionMenu(menu, button, true);
      requestAnimationFrame(() => {
        menu.style.visibility = "visible";
      });
      this.attachMenuKeyboardNavigation(menu, button);
      this.attachMenuCloseHandler(menu, button);
      setTimeout(() => {
        const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
        if (focusTarget) {
          focusTarget.focus();
        }
      }, 0);
    }
    createCaptionsButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-captions-button`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.captions"),
          "aria-expanded": "false"
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
        button.setAttribute("aria-expanded", "false");
        if (this.openMenu === existingMenu) {
          this.openMenu = null;
          this.openMenuButton = null;
        }
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
          textContent: i18n.t("player.noCaptions"),
          style: { opacity: "0.5", cursor: "default" }
        });
        menu.appendChild(noTracksItem);
        button.insertAdjacentElement("afterend", menu);
        this.attachMenuCloseHandler(menu, button);
        return;
      }
      let activeItem = null;
      const offItem = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: i18n.t("captions.off"),
        attributes: {
          "type": "button",
          "role": "menuitem",
          "tabindex": "-1"
        }
      });
      if (!this.player.state.captionsEnabled) {
        offItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
        offItem.appendChild(createIconElement("check"));
        activeItem = offItem;
      }
      offItem.addEventListener("click", () => {
        this.player.disableCaptions();
        this.updateCaptionsButton();
        this.closeMenuAndReturnFocus(menu, button);
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
            "lang": track.language,
            "tabindex": "-1"
          }
        });
        if (this.player.state.captionsEnabled && this.player.captionManager.currentTrack === this.player.captionManager.tracks[track.index]) {
          item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
          item.appendChild(createIconElement("check"));
          activeItem = item;
        }
        item.addEventListener("click", () => {
          this.player.captionManager.switchTrack(track.index);
          this.updateCaptionsButton();
          this.closeMenuAndReturnFocus(menu, button);
        });
        menu.appendChild(item);
      });
      button.insertAdjacentElement("afterend", menu);
      this.attachMenuKeyboardNavigation(menu, button);
      this.attachMenuCloseHandler(menu, button);
      setTimeout(() => {
        const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
        if (focusTarget) {
          focusTarget.focus();
        }
      }, 0);
    }
    updateCaptionsButton() {
      if (!this.controls.captions) return;
      const icon = this.controls.captions.querySelector(".vidply-icon");
      const isEnabled = this.player.state.captionsEnabled;
      icon.innerHTML = isEnabled ? createIconElement("captions").innerHTML : createIconElement("captionsOff").innerHTML;
    }
    createTranscriptButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-transcript`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.transcript"),
          "aria-expanded": "false"
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
      this.controls.transcript.setAttribute("aria-expanded", isVisible ? "true" : "false");
    }
    createAudioDescriptionButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-audio-description`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.audioDescription"),
          "role": "switch",
          "aria-checked": "false",
          "title": i18n.t("player.audioDescription")
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
      this.controls.audioDescription.setAttribute("aria-checked", isEnabled ? "true" : "false");
    }
    createSignLanguageButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.signLanguage"),
          "aria-expanded": "false",
          "title": i18n.t("player.signLanguage")
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
      this.controls.signLanguage.setAttribute("aria-expanded", isEnabled ? "true" : "false");
      this.controls.signLanguage.setAttribute(
        "aria-label",
        isEnabled ? i18n.t("signLanguage.hide") : i18n.t("signLanguage.show")
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
      this.player.on("loadedmetadata", () => {
        this.updateDuration();
        this.ensureQualityButton();
        this.updateQualityIndicator();
      });
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
      this.player.on("qualitychange", () => this.updateQualityIndicator());
      this.player.on("hlslevelswitched", () => this.updateQualityIndicator());
      this.player.on("hlsmanifestparsed", () => {
        this.ensureQualityButton();
        this.updateQualityIndicator();
      });
    }
    updatePlayPauseButton() {
      if (!this.controls.playPause) return;
      const icon = this.controls.playPause.querySelector(".vidply-icon");
      const isPlaying = this.player.state.playing;
      icon.innerHTML = isPlaying ? createIconElement("pause").innerHTML : createIconElement("play").innerHTML;
      const newAriaLabel = isPlaying ? i18n.t("player.pause") : i18n.t("player.play");
      this.controls.playPause.setAttribute("aria-label", newAriaLabel);
      this.controls.playPause.setAttribute("title", newAriaLabel);
    }
    updateProgress() {
      if (!this.controls.played) return;
      const percent = this.player.state.currentTime / this.player.state.duration * 100;
      this.controls.played.style.width = `${percent}%`;
      this.controls.progress.setAttribute("aria-valuenow", String(Math.round(percent)));
      const currentTimeText = TimeUtils.formatDuration(this.player.state.currentTime);
      const durationText = TimeUtils.formatDuration(this.player.state.duration);
      this.controls.progress.setAttribute(
        "aria-valuetext",
        `${Math.round(percent)}%, ${currentTimeText} ${i18n.t("time.of")} ${durationText}`
      );
      if (this.controls.currentTimeVisual) {
        const currentTime = this.player.state.currentTime;
        this.controls.currentTimeVisual.textContent = TimeUtils.formatTime(currentTime);
        if (this.controls.currentTimeAccessible) {
          this.controls.currentTimeAccessible.textContent = TimeUtils.formatDuration(currentTime);
        }
      }
    }
    updateDuration() {
      if (this.controls.durationVisual) {
        const duration = this.player.state.duration;
        this.controls.durationVisual.textContent = TimeUtils.formatTime(duration);
        if (this.controls.durationAccessible) {
          this.controls.durationAccessible.textContent = i18n.t("time.durationPrefix") + TimeUtils.formatDuration(duration);
        }
      }
    }
    updateVolumeDisplay() {
      const percent = this.player.state.volume * 100;
      if (this.controls.volumeFill) {
        this.controls.volumeFill.style.height = `${percent}%`;
      }
      if (this.controls.volumeSlider) {
        this.controls.volumeSlider.setAttribute("aria-valuenow", String(Math.round(percent)));
      }
      if (this.controls.mute) {
        const icon = this.controls.mute.querySelector(".vidply-icon");
        if (icon) {
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
          const newMuteAriaLabel = this.player.state.muted ? i18n.t("player.unmute") : i18n.t("player.mute");
          this.controls.mute.setAttribute("aria-label", newMuteAriaLabel);
          this.controls.mute.setAttribute("title", newMuteAriaLabel);
        }
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
    /**
     * Ensure quality button exists if qualities are available
     * This is called after renderer initialization to dynamically add the button
     */
    ensureQualityButton() {
      if (!this.player.options.qualityButton) return;
      if (this.controls.quality) return;
      if (!this.hasQualityLevels()) return;
      const qualityButton = this.createQualityButton();
      const speedButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-speed`);
      const captionStyleButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-caption-style`);
      const insertBefore = captionStyleButton || speedButton;
      if (insertBefore) {
        this.rightButtons.insertBefore(qualityButton, insertBefore);
      } else {
        this.rightButtons.insertBefore(qualityButton, this.rightButtons.firstChild);
      }
      this.player.log("Quality button added dynamically", "info");
    }
    updateQualityIndicator() {
      if (!this.controls.qualityText) return;
      if (!this.player.renderer || !this.player.renderer.getQualities) return;
      const qualities = this.player.renderer.getQualities();
      if (qualities.length === 0) {
        this.controls.qualityText.textContent = "";
        return;
      }
      let currentQualityText = "";
      if (this.player.renderer.hls && this.player.renderer.hls.currentLevel === -1) {
        currentQualityText = "Auto";
      } else if (this.player.renderer.getCurrentQuality) {
        const currentIndex = this.player.renderer.getCurrentQuality();
        const currentQuality = qualities.find((q) => q.index === currentIndex);
        if (currentQuality) {
          currentQualityText = currentQuality.height ? `${currentQuality.height}p` : "";
        }
      }
      this.controls.qualityText.textContent = currentQualityText;
    }
    setupAutoHide() {
      if (this.player.element.tagName !== "VIDEO") return;
      const showControls = () => {
        this.element.classList.add(`${this.player.options.classPrefix}-controls-visible`);
        this.player.container.classList.add(`${this.player.options.classPrefix}-controls-visible`);
        this.player.state.controlsVisible = true;
        clearTimeout(this.hideTimeout);
        if (this.player.state.playing) {
          const delay = this.player.state.fullscreen ? this.player.options.hideControlsDelay * 1.5 : this.player.options.hideControlsDelay;
          this.hideTimeout = setTimeout(() => {
            this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
            this.player.container.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
            this.player.state.controlsVisible = false;
          }, delay);
        }
      };
      this.player.container.addEventListener("mousemove", showControls);
      this.player.container.addEventListener("touchstart", showControls);
      this.player.container.addEventListener("touchmove", showControls);
      this.player.container.addEventListener("click", showControls);
      this.player.container.addEventListener("tap", showControls);
      this.element.addEventListener("focusin", showControls);
      this.player.on("pause", () => {
        showControls();
        clearTimeout(this.hideTimeout);
      });
      this.player.on("play", () => {
        showControls();
      });
      this.player.on("enterfullscreen", () => {
        showControls();
        if (this.player.state.fullscreen) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = setTimeout(() => {
            if (this.player.state.playing) {
              this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
              this.player.container.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
              this.player.state.controlsVisible = false;
            }
          }, this.player.options.hideControlsDelay * 2);
        }
      });
      showControls();
    }
    createOverflowMenuButton() {
      const button = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-overflow-menu`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.moreOptions"),
          "aria-expanded": "false",
          "title": i18n.t("player.moreOptions")
        }
      });
      button.appendChild(createIconElement("moreVertical"));
      button.addEventListener("click", () => {
        this.showOverflowMenu(button);
      });
      this.controls.overflowMenu = button;
      return button;
    }
    showOverflowMenu(button) {
      const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-overflow-menu-list`);
      if (existingMenu) {
        existingMenu.remove();
        button.setAttribute("aria-expanded", "false");
        if (this.openMenu === existingMenu) {
          this.openMenu = null;
          this.openMenuButton = null;
        }
        return;
      }
      const menu = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-overflow-menu-list ${this.player.options.classPrefix}-menu`,
        attributes: {
          "role": "menu",
          "aria-label": i18n.t("player.moreOptions")
        }
      });
      const overflowButtons = Array.from(this.rightButtons.querySelectorAll('button[data-in-overflow="true"]'));
      if (overflowButtons.length === 0) {
        const noItemsText = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: i18n.t("player.noMoreOptions"),
          style: { opacity: "0.5", cursor: "default" }
        });
        menu.appendChild(noItemsText);
      } else {
        overflowButtons.forEach((btn) => {
          const item = DOMUtils.createElement("button", {
            className: `${this.player.options.classPrefix}-menu-item`,
            attributes: {
              "type": "button",
              "role": "menuitem",
              "tabindex": "-1"
            }
          });
          const label = btn.getAttribute("aria-label") || btn.getAttribute("title") || "";
          const icon = btn.querySelector(".vidply-icon");
          if (icon) {
            const iconClone = icon.cloneNode(true);
            item.appendChild(iconClone);
          } else {
            const firstChild = btn.querySelector("span");
            if (firstChild && firstChild.textContent && firstChild.textContent.length <= 3) {
              const iconClone = firstChild.cloneNode(true);
              iconClone.classList.add("vidply-icon");
              item.appendChild(iconClone);
            }
          }
          const labelSpan = DOMUtils.createElement("span", {
            textContent: label
          });
          item.appendChild(labelSpan);
          item.addEventListener("click", (e) => {
            this._overflowMenuItemRef = item;
            const originalDisplay = btn.style.display;
            btn.style.display = "";
            btn.style.visibility = "hidden";
            btn.click();
            setTimeout(() => {
              btn.style.display = originalDisplay;
              btn.style.visibility = "";
              this._overflowMenuItemRef = null;
            }, 100);
            this.closeMenuAndReturnFocus(menu, button);
          });
          menu.appendChild(item);
        });
        this.attachMenuKeyboardNavigation(menu, button);
        setTimeout(() => {
          const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
          if (firstItem && firstItem.tagName === "BUTTON") {
            firstItem.focus();
          }
        }, 0);
      }
      menu.style.visibility = "hidden";
      menu.style.display = "block";
      button.insertAdjacentElement("afterend", menu);
      this.positionMenu(menu, button, true);
      requestAnimationFrame(() => {
        menu.style.visibility = "visible";
      });
      this.attachMenuCloseHandler(menu, button);
    }
    setupOverflowDetection() {
      const checkOverflow = () => {
        const isDesktop = window.innerWidth >= 768;
        const isLandscape = window.innerHeight < window.innerWidth;
        const isFullscreen = this.player.state.fullscreen;
        const isLandscapeFullscreen = isLandscape && isFullscreen;
        if (!this.rightButtons || this.rightButtons.children.length === 0) {
          if (this.overflowMenuButton) {
            this.overflowMenuButton.style.display = "none";
          }
          return;
        }
        const allButtons = Array.from(this.rightButtons.children).filter(
          (btn) => !btn.classList.contains(`${this.player.options.classPrefix}-overflow-menu`)
        );
        if (allButtons.length === 0) {
          if (this.overflowMenuButton) {
            this.overflowMenuButton.style.display = "none";
          }
          return;
        }
        const shouldUseOverflow = !isDesktop && !isLandscape;
        if (this.player.options.debug) {
          console.log("Overflow detection:", {
            isDesktop,
            isFullscreen,
            isLandscape,
            isLandscapeFullscreen,
            shouldUseOverflow,
            width: window.innerWidth,
            height: window.innerHeight
          });
        }
        if (!shouldUseOverflow) {
          allButtons.forEach((btn) => {
            btn.dataset.inOverflow = "false";
            btn.style.display = "";
          });
          if (this.overflowMenuButton) {
            this.overflowMenuButton.style.display = "none";
          }
          if (this.player.options.debug) {
            console.log("No overflow menu needed - all buttons visible, overflow button hidden");
          }
          return;
        }
        if (this.player.options.debug) {
          console.log("Mobile portrait - checking for overflow...");
        }
        allButtons.forEach((btn) => {
          btn.style.display = "";
        });
        const containerWidth = this.rightButtons.offsetWidth;
        const overflowButtonWidth = 50;
        const availableWidth = containerWidth - overflowButtonWidth;
        let totalWidth = 0;
        const buttonWidths = allButtons.map((btn) => {
          const style = getComputedStyle(btn);
          const width = btn.offsetWidth + parseInt(style.marginLeft || 0) + parseInt(style.marginRight || 0);
          totalWidth += width;
          return { btn, width };
        });
        const gapWidth = 8;
        totalWidth += (allButtons.length - 1) * gapWidth;
        const isSmallScreen = window.innerWidth < 768;
        const needsOverflow = totalWidth > availableWidth || isSmallScreen || isLandscapeFullscreen && !isDesktop;
        if (this.player.options.debug) {
          console.log("Overflow detection:", {
            containerWidth,
            availableWidth,
            totalWidth,
            needsOverflow,
            isSmallScreen,
            reason: isSmallScreen ? "mobile screen" : totalWidth > availableWidth ? "not enough space" : "enough space",
            buttonCount: allButtons.length
          });
        }
        if (needsOverflow) {
          const isSmallScreen2 = window.innerWidth < 768;
          const priorityAttr = isSmallScreen2 ? "overflowPriorityMobile" : "overflowPriority";
          if (this.player.options.debug) {
            console.log(`Using ${isSmallScreen2 ? "mobile" : "desktop"} priorities (width: ${window.innerWidth}px)`);
          }
          const sortedButtons = buttonWidths.sort((a, b) => {
            const priorityA = parseInt(a.btn.dataset[priorityAttr] || a.btn.dataset.overflowPriority || "1");
            const priorityB = parseInt(b.btn.dataset[priorityAttr] || b.btn.dataset.overflowPriority || "1");
            return priorityB - priorityA;
          });
          let currentWidth = totalWidth;
          let movedToOverflow = 0;
          for (const { btn, width } of sortedButtons) {
            const priority = parseInt(btn.dataset[priorityAttr] || btn.dataset.overflowPriority || "1");
            const buttonLabel = btn.getAttribute("aria-label") || "unknown";
            if (priority === 1) {
              btn.dataset.inOverflow = "false";
              btn.style.display = "";
              continue;
            }
            const shouldHide = isSmallScreen2 ? priority > 1 : currentWidth > availableWidth;
            if (shouldHide) {
              btn.dataset.inOverflow = "true";
              btn.style.display = "none";
              currentWidth -= width;
              movedToOverflow++;
              if (this.player.options.debug) {
                console.log(`  \u2192 Hiding button: ${buttonLabel} (priority ${priority}, ${isSmallScreen2 ? "mobile" : "desktop"})`);
              }
            } else {
              btn.dataset.inOverflow = "false";
              btn.style.display = "";
            }
          }
          if (this.player.options.debug) {
            console.log("Overflow button exists?", !!this.overflowMenuButton);
          }
          if (!this.overflowMenuButton) {
            console.error("Overflow menu button not found!");
            return;
          }
          if (movedToOverflow > 0) {
            this.overflowMenuButton.style.display = "";
            if (this.player.options.debug) {
              console.log("Showing overflow menu button -", movedToOverflow, "buttons moved");
            }
          } else {
            this.overflowMenuButton.style.display = "none";
            if (this.player.options.debug) {
              console.log("Hiding overflow menu button - all buttons fit");
            }
          }
        } else {
          allButtons.forEach((btn) => {
            btn.dataset.inOverflow = "false";
            btn.style.display = "";
          });
          this.overflowMenuButton.style.display = "none";
        }
      };
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(checkOverflow);
      });
      resizeObserver.observe(this.rightButtons);
      window.addEventListener("resize", () => {
        requestAnimationFrame(checkOverflow);
      });
      this.player.on("fullscreenchange", () => {
        setTimeout(() => {
          requestAnimationFrame(checkOverflow);
        }, 50);
      });
      requestAnimationFrame(() => {
        checkOverflow();
        setTimeout(() => checkOverflow(), 100);
        setTimeout(() => checkOverflow(), 300);
        setTimeout(() => checkOverflow(), 500);
      });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          requestAnimationFrame(checkOverflow);
        });
      }
      this.overflowResizeObserver = resizeObserver;
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
      if (this.overflowResizeObserver) {
        this.overflowResizeObserver.disconnect();
      }
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }
  };

  // src/utils/StorageManager.js
  var StorageManager = class {
    constructor(namespace = "vidply") {
      this.namespace = namespace;
      this.storage = this.isStorageAvailable() ? localStorage : null;
    }
    /**
     * Check if localStorage is available
     */
    isStorageAvailable() {
      try {
        const test = "__storage_test__";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    }
    /**
     * Get a namespaced key
     */
    getKey(key) {
      return `${this.namespace}_${key}`;
    }
    /**
     * Save a value to storage
     */
    set(key, value) {
      if (!this.storage) return false;
      try {
        const namespacedKey = this.getKey(key);
        this.storage.setItem(namespacedKey, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn("Failed to save to localStorage:", e);
        return false;
      }
    }
    /**
     * Get a value from storage
     */
    get(key, defaultValue = null) {
      if (!this.storage) return defaultValue;
      try {
        const namespacedKey = this.getKey(key);
        const value = this.storage.getItem(namespacedKey);
        return value ? JSON.parse(value) : defaultValue;
      } catch (e) {
        console.warn("Failed to read from localStorage:", e);
        return defaultValue;
      }
    }
    /**
     * Remove a value from storage
     */
    remove(key) {
      if (!this.storage) return false;
      try {
        const namespacedKey = this.getKey(key);
        this.storage.removeItem(namespacedKey);
        return true;
      } catch (e) {
        console.warn("Failed to remove from localStorage:", e);
        return false;
      }
    }
    /**
     * Clear all namespaced values
     */
    clear() {
      if (!this.storage) return false;
      try {
        const keys = Object.keys(this.storage);
        keys.forEach((key) => {
          if (key.startsWith(this.namespace)) {
            this.storage.removeItem(key);
          }
        });
        return true;
      } catch (e) {
        console.warn("Failed to clear localStorage:", e);
        return false;
      }
    }
    /**
     * Save transcript preferences
     */
    saveTranscriptPreferences(preferences) {
      return this.set("transcript_preferences", preferences);
    }
    /**
     * Get transcript preferences
     */
    getTranscriptPreferences() {
      return this.get("transcript_preferences", null);
    }
    /**
     * Save caption preferences
     */
    saveCaptionPreferences(preferences) {
      return this.set("caption_preferences", preferences);
    }
    /**
     * Get caption preferences
     */
    getCaptionPreferences() {
      return this.get("caption_preferences", null);
    }
    /**
     * Save player preferences (volume, speed, etc.)
     */
    savePlayerPreferences(preferences) {
      return this.set("player_preferences", preferences);
    }
    /**
     * Get player preferences
     */
    getPlayerPreferences() {
      return this.get("player_preferences", null);
    }
    /**
     * Save sign language preferences (position and size)
     */
    saveSignLanguagePreferences(preferences) {
      return this.set("sign_language_preferences", preferences);
    }
    /**
     * Get sign language preferences
     */
    getSignLanguagePreferences() {
      return this.get("sign_language_preferences", null);
    }
  };

  // src/utils/PerformanceUtils.js
  function debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  function isMobile(breakpoint = 768) {
    return window.innerWidth < breakpoint;
  }
  function rafWithTimeout(callback, timeout = 100) {
    let called = false;
    const execute = () => {
      if (!called) {
        called = true;
        callback();
      }
    };
    requestAnimationFrame(execute);
    setTimeout(execute, timeout);
  }

  // src/controls/CaptionManager.js
  var CaptionManager = class {
    constructor(player) {
      this.player = player;
      this.element = null;
      this.tracks = [];
      this.currentTrack = null;
      this.currentCue = null;
      this.storage = new StorageManager("vidply");
      this.loadSavedPreferences();
      this.init();
    }
    loadSavedPreferences() {
      const saved = this.storage.getCaptionPreferences();
      if (saved) {
        if (saved.fontSize) this.player.options.captionsFontSize = saved.fontSize;
        if (saved.fontFamily) this.player.options.captionsFontFamily = saved.fontFamily;
        if (saved.color) this.player.options.captionsColor = saved.color;
        if (saved.backgroundColor) this.player.options.captionsBackgroundColor = saved.backgroundColor;
        if (saved.opacity !== void 0) this.player.options.captionsOpacity = saved.opacity;
      }
    }
    saveCaptionPreferences() {
      this.storage.saveCaptionPreferences({
        fontSize: this.player.options.captionsFontSize,
        fontFamily: this.player.options.captionsFontFamily,
        color: this.player.options.captionsColor,
        backgroundColor: this.player.options.captionsBackgroundColor,
        opacity: this.player.options.captionsOpacity
      });
    }
    init() {
      this.createElement();
      this.loadTracks();
      this.attachEvents();
      if (this.player.options.captionsDefault && this.tracks.length > 0 && !this.currentTrack) {
        this.enable();
      }
    }
    createElement() {
      this.element = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-captions`,
        attributes: {
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
      let defaultTrackIndex = -1;
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind === "subtitles" || track.kind === "captions") {
          const trackElement = this.player.findTrackElement(track);
          const isDefault = trackElement && trackElement.hasAttribute("default");
          this.tracks.push({
            track,
            language: track.language,
            label: track.label,
            kind: track.kind,
            index: i,
            isDefault
          });
          if (track.mode === "showing") {
            track.mode = "hidden";
          } else if (track.mode === "disabled") {
            track.mode = "hidden";
          } else {
            track.mode = "hidden";
          }
          if (isDefault) {
            defaultTrackIndex = this.tracks.length - 1;
          }
        }
      }
      if (defaultTrackIndex >= 0) {
        requestAnimationFrame(() => {
          this.enable(defaultTrackIndex);
        });
      }
    }
    attachEvents() {
      this.player.on("timeupdate", () => {
        this.updateCaptions();
      });
      this.player.on("captionschange", () => {
        this.updateStyles();
      });
      this.debouncedPositionCaptions = debounce(() => {
        this.positionCaptionsOnMobile();
      }, 150);
      window.addEventListener("resize", this.debouncedPositionCaptions);
      this.player.on("enterfullscreen", () => {
        rafWithTimeout(() => this.positionCaptionsOnMobile(), 100);
      });
      this.player.on("exitfullscreen", () => {
        rafWithTimeout(() => this.positionCaptionsOnMobile(), 100);
      });
    }
    enable(trackIndex = 0) {
      if (this.tracks.length === 0) {
        return;
      }
      if (this.currentTrack && this.currentTrack.track) {
        if (this.cueChangeHandler) {
          this.currentTrack.track.removeEventListener("cuechange", this.cueChangeHandler);
        }
        this.currentTrack.track.mode = "hidden";
      }
      const selectedTrack = this.tracks[trackIndex];
      if (selectedTrack && selectedTrack.track) {
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
        const ensureTrackReady = () => {
          if (selectedTrack.track.readyState < 2) {
            const onTrackLoad = () => {
              selectedTrack.track.removeEventListener("load", onTrackLoad);
              selectedTrack.track.removeEventListener("error", onTrackLoad);
              requestAnimationFrame(() => {
                if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                  this.updateCaptions();
                }
              });
            };
            selectedTrack.track.addEventListener("load", onTrackLoad, { once: true });
            selectedTrack.track.addEventListener("error", onTrackLoad, { once: true });
          } else {
            requestAnimationFrame(() => {
              if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                this.updateCaptions();
              }
            });
          }
        };
        requestAnimationFrame(() => {
          if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
            ensureTrackReady();
          }
        });
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
      if (!this.currentTrack || !this.currentTrack.track) {
        return;
      }
      if (this.currentTrack.track.mode === "disabled") {
        this.currentTrack.track.mode = "hidden";
      }
      if (this.currentTrack.track.mode === "showing") {
        this.currentTrack.track.mode = "hidden";
      }
      if (!this.currentTrack.track.activeCues) {
        if (this.currentTrack.track.cues && this.currentTrack.track.cues.length > 0) {
          if (this.currentCue) {
            this.element.innerHTML = "";
            this.element.style.display = "none";
            this.currentCue = null;
          }
        }
        return;
      }
      const activeCues = this.currentTrack.track.activeCues;
      const isAudioPlayer = this.player.element.tagName.toLowerCase() === "audio";
      if (activeCues.length > 0) {
        const cue = activeCues[0];
        if (this.currentCue !== cue) {
          this.currentCue = cue;
          let text = cue.text;
          text = this.parseVTTFormatting(text);
          if (isAudioPlayer) {
            const existingCues = this.element.querySelectorAll(`.${this.player.options.classPrefix}-caption-cue`);
            existingCues.forEach((el) => el.classList.remove(`${this.player.options.classPrefix}-caption-active`));
            const cueId = `cue-${cue.startTime}-${cue.endTime}`;
            let cueElement = this.element.querySelector(`[data-cue-id="${cueId}"]`);
            if (!cueElement) {
              cueElement = document.createElement("div");
              cueElement.className = `${this.player.options.classPrefix}-caption-cue`;
              cueElement.setAttribute("data-cue-id", cueId);
              cueElement.innerHTML = DOMUtils.sanitizeHTML(text);
              this.element.appendChild(cueElement);
            }
            cueElement.classList.add(`${this.player.options.classPrefix}-caption-active`);
            requestAnimationFrame(() => {
              if (cueElement) {
                cueElement.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            });
          } else {
            this.element.innerHTML = DOMUtils.sanitizeHTML(text);
          }
          this.element.style.display = "block";
          this.positionCaptionsOnMobile();
          this.player.emit("captionchange", cue);
        }
      } else if (this.currentCue) {
        if (!isAudioPlayer) {
          this.element.innerHTML = "";
          this.element.style.display = "none";
        }
        this.currentCue = null;
      }
    }
    positionCaptionsOnMobile() {
      var _a, _b;
      if (!this.element || this.element.style.display === "none") {
        return;
      }
      const isFullscreen = ((_a = this.player.state) == null ? void 0 : _a.fullscreen) || false;
      const mobile = isMobile();
      if (!mobile && !isFullscreen) {
        this.element.style.bottom = "";
        return;
      }
      const controls = (_b = this.player.controlBar) == null ? void 0 : _b.element;
      if (!controls) {
        return;
      }
      requestAnimationFrame(() => {
        if (!this.element || this.element.style.display === "none") {
          return;
        }
        const controlsRect = controls.getBoundingClientRect();
        const wrapperRect = this.player.videoWrapper.getBoundingClientRect();
        const bottomOffset = wrapperRect.bottom - controlsRect.top + 16;
        this.element.style.bottom = `${bottomOffset}px`;
        if (this.player.options.debug) {
          console.log("[VidPly] Caption position:", {
            mobile,
            isFullscreen,
            controlsHeight: controlsRect.height,
            bottomOffset: `${bottomOffset}px`
          });
        }
      });
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
      this.saveCaptionPreferences();
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
      }, true);
      if (!this.player.container.hasAttribute("tabindex")) {
        this.player.container.setAttribute("tabindex", "0");
      }
    }
    handleKeydown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        return;
      }
      const activeElement = document.activeElement;
      if (activeElement) {
        const menu = activeElement.closest('.vidply-menu, [role="menu"]');
        if (menu) {
          return;
        }
      }
      const key = e.key;
      let handled = false;
      if (key === "Escape" && this.player.state.fullscreen) {
        this.player.exitFullscreen();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
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
      if (!handled && this.player.options.debug) {
        console.log("[VidPly] Unhandled key:", e.key, "code:", e.code, "shiftKey:", e.shiftKey);
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
        case "mute":
          this.player.toggleMute();
          return true;
        case "fullscreen":
          this.player.toggleFullscreen();
          return true;
        case "captions":
          if (this.player.captionManager && this.player.captionManager.tracks.length > 1) {
            const captionsButton = this.player.controlBar && this.player.controlBar.controls.captions;
            if (captionsButton) {
              this.player.controlBar.showCaptionsMenu(captionsButton);
            } else {
              this.player.toggleCaptions();
            }
          } else {
            this.player.toggleCaptions();
          }
          return true;
        case "caption-style-menu":
          if (this.player.controlBar && this.player.controlBar.controls.captionStyle) {
            this.player.controlBar.showCaptionStyleMenu(this.player.controlBar.controls.captionStyle);
            return true;
          }
          return false;
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
        case "speed-menu":
          if (this.player.controlBar && this.player.controlBar.controls.speed) {
            this.player.controlBar.showSpeedMenu(this.player.controlBar.controls.speed);
            return true;
          }
          return false;
        case "quality-menu":
          if (this.player.controlBar && this.player.controlBar.controls.quality) {
            this.player.controlBar.showQualityMenu(this.player.controlBar.controls.quality);
            return true;
          }
          return false;
        case "chapters-menu":
          if (this.player.controlBar && this.player.controlBar.controls.chapters) {
            this.player.controlBar.showChaptersMenu(this.player.controlBar.controls.chapters);
            return true;
          }
          return false;
        case "transcript-toggle":
          if (this.player.transcriptManager) {
            this.player.transcriptManager.toggleTranscript();
            return true;
          }
          return false;
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

  // src/utils/MenuUtils.js
  function createMenuItem({ classPrefix, itemClass, icon, label, ariaLabel, onClick, hasTextClass = false }) {
    const isI18nKeyForAria = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
    const ariaLabelText = ariaLabel || (isI18nKeyForAria ? i18n.t(label) || label : label);
    const button = DOMUtils.createElement("button", {
      className: itemClass,
      attributes: {
        "type": "button",
        "aria-label": ariaLabelText,
        "tabindex": "-1"
      }
    });
    if (icon) {
      button.appendChild(createIconElement(icon));
    }
    const isI18nKey = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
    const textContent = isI18nKey ? i18n.t(label) || label : label;
    const text = DOMUtils.createElement("span", {
      textContent,
      className: hasTextClass ? `${classPrefix}-settings-text` : void 0
    });
    button.appendChild(text);
    if (onClick) {
      button.addEventListener("click", onClick);
    }
    return button;
  }
  function attachMenuKeyboardNavigation(menu, button, itemSelector, onClose) {
    if (!menu) return;
    const menuItems = Array.from(menu.querySelectorAll(itemSelector));
    if (menuItems.length === 0) return;
    const handleKeyDown = (e) => {
      const currentIndex = menuItems.indexOf(document.activeElement);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          const nextIndex = (currentIndex + 1) % menuItems.length;
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === nextIndex ? "0" : "-1");
          });
          menuItems[nextIndex].focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === prevIndex ? "0" : "-1");
          });
          menuItems[prevIndex].focus();
          break;
        case "Home":
          e.preventDefault();
          e.stopPropagation();
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === 0 ? "0" : "-1");
          });
          menuItems[0].focus();
          break;
        case "End":
          e.preventDefault();
          e.stopPropagation();
          const lastIndex = menuItems.length - 1;
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === lastIndex ? "0" : "-1");
          });
          menuItems[lastIndex].focus();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          e.stopPropagation();
          if (document.activeElement && menuItems.includes(document.activeElement)) {
            document.activeElement.click();
            if (onClose) {
              setTimeout(() => {
                if (button && document.contains(button)) {
                  button.focus();
                }
              }, 0);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          if (onClose) {
            onClose();
          }
          break;
      }
    };
    menu.addEventListener("keydown", handleKeyDown, true);
    return handleKeyDown;
  }
  function focusFirstMenuItem(menu, itemSelector, delay = 0) {
    if (!menu) return;
    setTimeout(() => {
      const menuItems = Array.from(menu.querySelectorAll(itemSelector));
      if (menuItems.length > 0) {
        menuItems.forEach((item, index) => {
          item.setAttribute("tabindex", index === 0 ? "0" : "-1");
        });
        focusElement(menuItems[0], { delay: 0 });
      }
    }, delay);
  }

  // src/utils/DraggableResizable.js
  var DraggableResizable = class {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        dragHandle: null,
        // Element to use as drag handle (defaults to element itself)
        resizeHandles: [],
        // Array of resize handle elements
        onDragStart: null,
        onDrag: null,
        onDragEnd: null,
        onResizeStart: null,
        onResize: null,
        onResizeEnd: null,
        constrainToViewport: true,
        // Allow movement outside viewport?
        minWidth: 150,
        minHeight: 100,
        maintainAspectRatio: false,
        keyboardDragKey: "d",
        keyboardResizeKey: "r",
        keyboardStep: 5,
        keyboardStepLarge: 10,
        maxWidth: null,
        maxHeight: null,
        pointerResizeIndicatorText: null,
        onPointerResizeToggle: null,
        classPrefix: "draggable",
        storage: null,
        // StorageManager instance for saving position/size
        storageKey: null,
        // Key for localStorage (if storage is provided)
        ...options
      };
      this.isDragging = false;
      this.isResizing = false;
      this.resizeDirection = null;
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;
      this.positionOffsetX = 0;
      this.positionOffsetY = 0;
      this.initialMouseX = 0;
      this.initialMouseY = 0;
      this.needsPositionConversion = false;
      this.resizeStartX = 0;
      this.resizeStartY = 0;
      this.resizeStartWidth = 0;
      this.resizeStartHeight = 0;
      this.resizeStartLeft = 0;
      this.resizeStartTop = 0;
      this.keyboardDragMode = false;
      this.keyboardResizeMode = false;
      this.pointerResizeMode = false;
      this.manuallyPositioned = false;
      this.resizeHandlesManaged = /* @__PURE__ */ new Map();
      this.resizeIndicatorElement = null;
      this.handlers = {
        mousedown: this.onMouseDown.bind(this),
        mousemove: this.onMouseMove.bind(this),
        mouseup: this.onMouseUp.bind(this),
        touchstart: this.onTouchStart.bind(this),
        touchmove: this.onTouchMove.bind(this),
        touchend: this.onTouchEnd.bind(this),
        keydown: this.onKeyDown.bind(this),
        resizeHandleMousedown: this.onResizeHandleMouseDown.bind(this)
      };
      this.init();
    }
    hasManagedResizeHandles() {
      return Array.from(this.resizeHandlesManaged.values()).some(Boolean);
    }
    storeOriginalHandleDisplay(handle) {
      if (!handle.dataset.originalDisplay) {
        handle.dataset.originalDisplay = handle.style.display || "";
      }
    }
    hideResizeHandle(handle) {
      handle.style.display = "none";
      handle.setAttribute("aria-hidden", "true");
    }
    showResizeHandle(handle) {
      const original = handle.dataset.originalDisplay !== void 0 ? handle.dataset.originalDisplay : "";
      handle.style.display = original;
      handle.removeAttribute("aria-hidden");
    }
    setManagedHandlesVisible(visible) {
      if (!this.options.resizeHandles || this.options.resizeHandles.length === 0) {
        return;
      }
      this.options.resizeHandles.forEach((handle) => {
        if (!this.resizeHandlesManaged.get(handle)) {
          return;
        }
        if (visible) {
          this.showResizeHandle(handle);
        } else {
          this.hideResizeHandle(handle);
        }
      });
    }
    init() {
      const dragHandle = this.options.dragHandle || this.element;
      dragHandle.addEventListener("mousedown", this.handlers.mousedown);
      dragHandle.addEventListener("touchstart", this.handlers.touchstart);
      document.addEventListener("mousemove", this.handlers.mousemove);
      document.addEventListener("mouseup", this.handlers.mouseup);
      document.addEventListener("touchmove", this.handlers.touchmove, { passive: false });
      document.addEventListener("touchend", this.handlers.touchend);
      this.element.addEventListener("keydown", this.handlers.keydown);
      if (this.options.resizeHandles && this.options.resizeHandles.length > 0) {
        this.options.resizeHandles.forEach((handle) => {
          handle.addEventListener("mousedown", this.handlers.resizeHandleMousedown);
          handle.addEventListener("touchstart", this.handlers.resizeHandleMousedown);
          const managed = handle.dataset.vidplyManagedResize === "true";
          this.resizeHandlesManaged.set(handle, managed);
          if (managed) {
            this.storeOriginalHandleDisplay(handle);
            this.hideResizeHandle(handle);
          }
        });
      }
    }
    onMouseDown(e) {
      if (e.target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
        return;
      }
      if (this.options.onDragStart && !this.options.onDragStart(e)) {
        return;
      }
      this.startDragging(e.clientX, e.clientY);
      e.preventDefault();
    }
    onTouchStart(e) {
      if (e.target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
        return;
      }
      if (this.options.onDragStart && !this.options.onDragStart(e)) {
        return;
      }
      const touch = e.touches[0];
      this.startDragging(touch.clientX, touch.clientY);
    }
    onResizeHandleMouseDown(e) {
      var _a, _b, _c, _d;
      e.preventDefault();
      e.stopPropagation();
      const handle = e.target;
      this.resizeDirection = handle.getAttribute("data-direction");
      const clientX = e.clientX || ((_b = (_a = e.touches) == null ? void 0 : _a[0]) == null ? void 0 : _b.clientX);
      const clientY = e.clientY || ((_d = (_c = e.touches) == null ? void 0 : _c[0]) == null ? void 0 : _d.clientY);
      this.startResizing(clientX, clientY);
    }
    onMouseMove(e) {
      if (this.isDragging) {
        this.drag(e.clientX, e.clientY);
        e.preventDefault();
      } else if (this.isResizing) {
        this.resize(e.clientX, e.clientY);
        e.preventDefault();
      }
    }
    onTouchMove(e) {
      if (this.isDragging || this.isResizing) {
        const touch = e.touches[0];
        if (this.isDragging) {
          this.drag(touch.clientX, touch.clientY);
        } else {
          this.resize(touch.clientX, touch.clientY);
        }
        e.preventDefault();
      }
    }
    onMouseUp() {
      if (this.isDragging) {
        this.stopDragging();
      } else if (this.isResizing) {
        this.stopResizing();
      }
    }
    onTouchEnd() {
      if (this.isDragging) {
        this.stopDragging();
      } else if (this.isResizing) {
        this.stopResizing();
      }
    }
    onKeyDown(e) {
      if (e.key.toLowerCase() === this.options.keyboardDragKey.toLowerCase()) {
        e.preventDefault();
        this.toggleKeyboardDragMode();
        return;
      }
      if (e.key.toLowerCase() === this.options.keyboardResizeKey.toLowerCase()) {
        e.preventDefault();
        if (this.hasManagedResizeHandles()) {
          this.togglePointerResizeMode();
        } else {
          this.toggleKeyboardResizeMode();
        }
        return;
      }
      if (e.key === "Escape") {
        if (this.pointerResizeMode) {
          e.preventDefault();
          this.disablePointerResizeMode();
          return;
        }
        if (this.keyboardDragMode || this.keyboardResizeMode) {
          e.preventDefault();
          this.disableKeyboardDragMode();
          this.disableKeyboardResizeMode();
          return;
        }
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        if (this.keyboardDragMode) {
          e.preventDefault();
          e.stopPropagation();
          this.keyboardDrag(e.key, e.shiftKey);
        } else if (this.keyboardResizeMode) {
          e.preventDefault();
          e.stopPropagation();
          this.keyboardResize(e.key, e.shiftKey);
        }
      }
      if (e.key === "Home" && (this.keyboardDragMode || this.keyboardResizeMode)) {
        e.preventDefault();
        this.resetPosition();
      }
    }
    startDragging(clientX, clientY) {
      const rect = this.element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(this.element);
      const needsConversion = computedStyle.right !== "auto" || computedStyle.bottom !== "auto" || computedStyle.transform !== "none";
      this.positionOffsetX = 0;
      this.positionOffsetY = 0;
      if (needsConversion) {
        let targetLeft, targetTop;
        if (computedStyle.position === "absolute") {
          const offsetParent = this.element.offsetParent || document.body;
          const parentRect = offsetParent.getBoundingClientRect();
          targetLeft = rect.left - parentRect.left;
          targetTop = rect.top - parentRect.top;
          this.positionOffsetX = parentRect.left;
          this.positionOffsetY = parentRect.top;
        } else if (computedStyle.position === "fixed") {
          const parsedLeft = parseFloat(computedStyle.left);
          const parsedTop = parseFloat(computedStyle.top);
          const hasLeft = Number.isFinite(parsedLeft);
          const hasTop = Number.isFinite(parsedTop);
          targetLeft = hasLeft ? parsedLeft : rect.left;
          targetTop = hasTop ? parsedTop : rect.top;
          this.positionOffsetX = rect.left - targetLeft;
          this.positionOffsetY = rect.top - targetTop;
        } else {
          targetLeft = rect.left;
          targetTop = rect.top;
          this.positionOffsetX = rect.left - targetLeft;
          this.positionOffsetY = rect.top - targetTop;
        }
        const currentCssText = this.element.style.cssText;
        let newCssText = currentCssText.split(";").filter((rule) => {
          const trimmed = rule.trim();
          if (!trimmed) return false;
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex === -1) return false;
          const property = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim();
          if (!value || value === "") return false;
          if (property === "right" || property === "bottom" || property === "transform" || property === "left" || property === "top" || property === "inset") {
            return false;
          }
          if (property.startsWith("border-image")) {
            return false;
          }
          return true;
        }).join("; ");
        if (newCssText) newCssText += "; ";
        newCssText += `left: ${targetLeft}px; top: ${targetTop}px; right: auto; bottom: auto; transform: none`;
        this.element.style.cssText = newCssText;
      }
      const finalRect = this.element.getBoundingClientRect();
      this.dragOffsetX = clientX - finalRect.left;
      this.dragOffsetY = clientY - finalRect.top;
      this.isDragging = true;
      this.element.classList.add(`${this.options.classPrefix}-dragging`);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }
    drag(clientX, clientY) {
      if (!this.isDragging) return;
      let newX = clientX - this.dragOffsetX - this.positionOffsetX;
      let newY = clientY - this.dragOffsetY - this.positionOffsetY;
      if (this.options.constrainToViewport) {
        const rect = this.element.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const minVisible = 100;
        const minX = -(rect.width - minVisible);
        const minY = -(rect.height - minVisible);
        const maxX = viewportWidth - minVisible;
        const maxY = viewportHeight - minVisible;
        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));
      }
      this.element.style.left = `${newX}px`;
      this.element.style.top = `${newY}px`;
      if (this.options.onDrag) {
        this.options.onDrag({ x: newX, y: newY });
      }
    }
    stopDragging() {
      this.isDragging = false;
      this.element.classList.remove(`${this.options.classPrefix}-dragging`);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      this.manuallyPositioned = true;
      if (this.options.onDragEnd) {
        this.options.onDragEnd();
      }
    }
    startResizing(clientX, clientY) {
      this.isResizing = true;
      this.resizeStartX = clientX;
      this.resizeStartY = clientY;
      const rect = this.element.getBoundingClientRect();
      this.resizeStartWidth = rect.width;
      this.resizeStartHeight = rect.height;
      this.resizeStartLeft = rect.left;
      this.resizeStartTop = rect.top;
      this.element.classList.add(`${this.options.classPrefix}-resizing`);
      document.body.style.userSelect = "none";
      if (this.options.onResizeStart) {
        this.options.onResizeStart();
      }
    }
    resize(clientX, clientY) {
      if (!this.isResizing) return;
      const deltaX = clientX - this.resizeStartX;
      const deltaY = clientY - this.resizeStartY;
      let newWidth = this.resizeStartWidth;
      let newHeight = this.resizeStartHeight;
      let newLeft = this.resizeStartLeft;
      let newTop = this.resizeStartTop;
      if (this.resizeDirection.includes("e")) {
        newWidth = Math.max(this.options.minWidth, this.resizeStartWidth + deltaX);
      }
      if (this.resizeDirection.includes("w")) {
        const proposedWidth = Math.max(this.options.minWidth, this.resizeStartWidth - deltaX);
        newLeft = this.resizeStartLeft + (this.resizeStartWidth - proposedWidth);
        newWidth = proposedWidth;
      }
      const maxWidthOption = typeof this.options.maxWidth === "function" ? this.options.maxWidth() : this.options.maxWidth;
      if (Number.isFinite(maxWidthOption)) {
        const clampedWidth = Math.min(newWidth, maxWidthOption);
        if (clampedWidth !== newWidth && this.resizeDirection.includes("w")) {
          newLeft += newWidth - clampedWidth;
        }
        newWidth = clampedWidth;
      }
      if (!this.options.maintainAspectRatio) {
        if (this.resizeDirection.includes("s")) {
          newHeight = Math.max(this.options.minHeight, this.resizeStartHeight + deltaY);
        }
        if (this.resizeDirection.includes("n")) {
          const proposedHeight = Math.max(this.options.minHeight, this.resizeStartHeight - deltaY);
          newTop = this.resizeStartTop + (this.resizeStartHeight - proposedHeight);
          newHeight = proposedHeight;
        }
        const maxHeightOption = typeof this.options.maxHeight === "function" ? this.options.maxHeight() : this.options.maxHeight;
        if (Number.isFinite(maxHeightOption)) {
          const clampedHeight = Math.min(newHeight, maxHeightOption);
          if (clampedHeight !== newHeight && this.resizeDirection.includes("n")) {
            newTop += newHeight - clampedHeight;
          }
          newHeight = clampedHeight;
        }
      }
      this.element.style.width = `${newWidth}px`;
      if (!this.options.maintainAspectRatio) {
        this.element.style.height = `${newHeight}px`;
      } else {
        this.element.style.height = "auto";
      }
      if (this.resizeDirection.includes("w")) {
        this.element.style.left = `${newLeft}px`;
      }
      if (this.resizeDirection.includes("n") && !this.options.maintainAspectRatio) {
        this.element.style.top = `${newTop}px`;
      }
      if (this.options.onResize) {
        this.options.onResize({ width: newWidth, height: newHeight, left: newLeft, top: newTop });
      }
    }
    stopResizing() {
      this.isResizing = false;
      this.resizeDirection = null;
      this.element.classList.remove(`${this.options.classPrefix}-resizing`);
      document.body.style.userSelect = "";
      this.manuallyPositioned = true;
      if (this.options.onResizeEnd) {
        this.options.onResizeEnd();
      }
    }
    toggleKeyboardDragMode() {
      if (this.keyboardDragMode) {
        this.disableKeyboardDragMode();
      } else {
        this.enableKeyboardDragMode();
      }
    }
    enableKeyboardDragMode() {
      this.keyboardDragMode = true;
      this.keyboardResizeMode = false;
      this.element.classList.add(`${this.options.classPrefix}-keyboard-drag`);
      this.element.classList.remove(`${this.options.classPrefix}-keyboard-resize`);
      this.focusElement();
    }
    disableKeyboardDragMode() {
      this.keyboardDragMode = false;
      this.element.classList.remove(`${this.options.classPrefix}-keyboard-drag`);
    }
    toggleKeyboardResizeMode() {
      if (this.keyboardResizeMode) {
        this.disableKeyboardResizeMode();
      } else {
        this.enableKeyboardResizeMode();
      }
    }
    enableKeyboardResizeMode() {
      this.keyboardResizeMode = true;
      this.keyboardDragMode = false;
      this.element.classList.add(`${this.options.classPrefix}-keyboard-resize`);
      this.element.classList.remove(`${this.options.classPrefix}-keyboard-drag`);
      this.focusElement();
    }
    disableKeyboardResizeMode() {
      this.keyboardResizeMode = false;
      this.element.classList.remove(`${this.options.classPrefix}-keyboard-resize`);
    }
    enablePointerResizeMode({ focus = true } = {}) {
      if (!this.hasManagedResizeHandles()) {
        this.enableKeyboardResizeMode();
        return;
      }
      if (this.pointerResizeMode) {
        return;
      }
      this.pointerResizeMode = true;
      this.setManagedHandlesVisible(true);
      this.element.classList.add(`${this.options.classPrefix}-resizable`);
      this.enableKeyboardResizeMode();
      if (focus) {
        this.focusElement();
      }
      if (typeof this.options.onPointerResizeToggle === "function") {
        this.options.onPointerResizeToggle(true);
      }
    }
    disablePointerResizeMode({ focus = false } = {}) {
      if (!this.pointerResizeMode) {
        return;
      }
      this.pointerResizeMode = false;
      this.setManagedHandlesVisible(false);
      this.element.classList.remove(`${this.options.classPrefix}-resizable`);
      this.disableKeyboardResizeMode();
      if (focus) {
        this.focusElement();
      }
      if (typeof this.options.onPointerResizeToggle === "function") {
        this.options.onPointerResizeToggle(false);
      }
    }
    togglePointerResizeMode() {
      if (this.pointerResizeMode) {
        this.disablePointerResizeMode();
      } else {
        this.enablePointerResizeMode();
      }
      return this.pointerResizeMode;
    }
    focusElement() {
      if (typeof this.element.focus === "function") {
        try {
          this.element.focus({ preventScroll: true });
        } catch (e) {
          this.element.focus();
        }
      }
    }
    keyboardDrag(key, shiftKey) {
      const step = shiftKey ? this.options.keyboardStepLarge : this.options.keyboardStep;
      let currentLeft = parseFloat(this.element.style.left) || 0;
      let currentTop = parseFloat(this.element.style.top) || 0;
      const computedStyle = window.getComputedStyle(this.element);
      if (computedStyle.transform !== "none") {
        const rect = this.element.getBoundingClientRect();
        currentLeft = rect.left;
        currentTop = rect.top;
        this.element.style.transform = "none";
        this.element.style.left = `${currentLeft}px`;
        this.element.style.top = `${currentTop}px`;
      }
      let newX = currentLeft;
      let newY = currentTop;
      switch (key) {
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
      this.element.style.left = `${newX}px`;
      this.element.style.top = `${newY}px`;
      if (this.options.onDrag) {
        this.options.onDrag({ x: newX, y: newY });
      }
    }
    keyboardResize(key, shiftKey) {
      const step = shiftKey ? this.options.keyboardStepLarge : this.options.keyboardStep;
      const rect = this.element.getBoundingClientRect();
      let width = rect.width;
      let height = rect.height;
      switch (key) {
        case "ArrowLeft":
          width -= step;
          break;
        case "ArrowRight":
          width += step;
          break;
        case "ArrowUp":
          if (this.options.maintainAspectRatio) {
            width += step;
          } else {
            height -= step;
          }
          break;
        case "ArrowDown":
          if (this.options.maintainAspectRatio) {
            width -= step;
          } else {
            height += step;
          }
          break;
      }
      width = Math.max(this.options.minWidth, width);
      height = Math.max(this.options.minHeight, height);
      this.element.style.width = `${width}px`;
      if (!this.options.maintainAspectRatio) {
        this.element.style.height = `${height}px`;
      } else {
        this.element.style.height = "auto";
      }
      if (this.options.onResize) {
        this.options.onResize({ width, height });
      }
    }
    resetPosition() {
      this.element.style.left = "50%";
      this.element.style.top = "50%";
      this.element.style.transform = "translate(-50%, -50%)";
      this.element.style.right = "";
      this.element.style.bottom = "";
      this.manuallyPositioned = false;
      if (this.options.onDrag) {
        this.options.onDrag({ centered: true });
      }
    }
    destroy() {
      const dragHandle = this.options.dragHandle || this.element;
      this.disablePointerResizeMode();
      dragHandle.removeEventListener("mousedown", this.handlers.mousedown);
      dragHandle.removeEventListener("touchstart", this.handlers.touchstart);
      document.removeEventListener("mousemove", this.handlers.mousemove);
      document.removeEventListener("mouseup", this.handlers.mouseup);
      document.removeEventListener("touchmove", this.handlers.touchmove);
      document.removeEventListener("touchend", this.handlers.touchend);
      this.element.removeEventListener("keydown", this.handlers.keydown);
      if (this.options.resizeHandles && this.options.resizeHandles.length > 0) {
        this.options.resizeHandles.forEach((handle) => {
          handle.removeEventListener("mousedown", this.handlers.resizeHandleMousedown);
          handle.removeEventListener("touchstart", this.handlers.resizeHandleMousedown);
        });
      }
      this.element.classList.remove(
        `${this.options.classPrefix}-dragging`,
        `${this.options.classPrefix}-resizing`,
        `${this.options.classPrefix}-keyboard-drag`,
        `${this.options.classPrefix}-keyboard-resize`
      );
    }
  };

  // src/utils/FormUtils.js
  function createLabeledSelect({
    classPrefix,
    labelClass,
    selectClass,
    labelText,
    selectId,
    hidden = false,
    onChange = null,
    options = []
  }) {
    const isI18nKey = typeof labelText === "string" && (labelText.startsWith("transcript.") || labelText.startsWith("player.") || labelText.startsWith("settings.") || labelText.startsWith("captions."));
    const labelTextContent = isI18nKey ? i18n.t(labelText) || labelText : labelText;
    const label = DOMUtils.createElement("label", {
      className: labelClass,
      textContent: labelTextContent,
      attributes: {
        "for": selectId,
        "style": hidden ? "display: none;" : void 0
      }
    });
    const select = DOMUtils.createElement("select", {
      className: selectClass,
      attributes: {
        "id": selectId,
        "style": hidden ? "display: none;" : void 0
      }
    });
    options.forEach((opt) => {
      const option = DOMUtils.createElement("option", {
        textContent: opt.text,
        attributes: {
          "value": opt.value,
          "selected": opt.selected ? "selected" : void 0
        }
      });
      select.appendChild(option);
    });
    if (onChange) {
      select.addEventListener("change", onChange);
    }
    return { label, select };
  }
  function toggleLabeledSelect(label, select, show) {
    if (label) {
      label.style.display = show ? "block" : "none";
    }
    if (select) {
      select.style.display = show ? "block" : "none";
    }
  }
  function preventDragOnElement(element) {
    if (!element) return;
    ["mousedown", "click"].forEach((eventType) => {
      element.addEventListener(eventType, (e) => {
        e.stopPropagation();
      });
    });
  }

  // src/controls/TranscriptManager.js
  var TranscriptManager = class {
    constructor(player) {
      this.player = player;
      this.transcriptWindow = null;
      this.transcriptEntries = [];
      this.metadataCues = [];
      this.currentActiveEntry = null;
      this.isVisible = false;
      this.storage = new StorageManager("vidply");
      this.draggableResizable = null;
      this.settingsMenuVisible = false;
      this.settingsMenu = null;
      this.settingsButton = null;
      this.settingsMenuJustOpened = false;
      this.resizeOptionButton = null;
      this.resizeOptionText = null;
      this.dragOptionButton = null;
      this.dragOptionText = null;
      this.resizeModeIndicator = null;
      this.resizeModeIndicatorTimeout = null;
      this.transcriptResizeHandles = [];
      this.liveRegion = null;
      this.styleDialog = null;
      this.styleDialogVisible = false;
      this.styleDialogJustOpened = false;
      this.languageSelector = null;
      this.languageLabel = null;
      this.currentTranscriptLanguage = null;
      this.availableTranscriptLanguages = [];
      this.languageSelectorHandler = null;
      const savedPreferences = this.storage.getTranscriptPreferences();
      this.autoscrollEnabled = (savedPreferences == null ? void 0 : savedPreferences.autoscroll) !== void 0 ? savedPreferences.autoscroll : true;
      this.transcriptStyle = {
        fontSize: (savedPreferences == null ? void 0 : savedPreferences.fontSize) || this.player.options.transcriptFontSize || "100%",
        fontFamily: (savedPreferences == null ? void 0 : savedPreferences.fontFamily) || this.player.options.transcriptFontFamily || "sans-serif",
        color: (savedPreferences == null ? void 0 : savedPreferences.color) || this.player.options.transcriptColor || "#ffffff",
        backgroundColor: (savedPreferences == null ? void 0 : savedPreferences.backgroundColor) || this.player.options.transcriptBackgroundColor || "#1e1e1e",
        opacity: (savedPreferences == null ? void 0 : savedPreferences.opacity) ?? this.player.options.transcriptOpacity ?? 0.98
      };
      this.handlers = {
        timeupdate: () => this.updateActiveEntry(),
        audiodescriptionenabled: () => {
          if (this.isVisible) {
            this.loadTranscriptData();
          }
        },
        audiodescriptiondisabled: () => {
          if (this.isVisible) {
            this.loadTranscriptData();
          }
        },
        resize: null,
        settingsClick: null,
        settingsKeydown: null,
        documentClick: null,
        styleDialogKeydown: null
      };
      this.timeouts = /* @__PURE__ */ new Set();
      this.init();
    }
    init() {
      this.setupMetadataHandlingOnLoad();
      this.player.on("timeupdate", this.handlers.timeupdate);
      this.player.on("audiodescriptionenabled", this.handlers.audiodescriptionenabled);
      this.player.on("audiodescriptiondisabled", this.handlers.audiodescriptiondisabled);
      this.player.on("fullscreenchange", () => {
        if (this.isVisible) {
          const isMobile2 = window.innerWidth < 768;
          if (isMobile2) {
            this.setupDragAndDrop();
          }
          if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
            this.setManagedTimeout(() => this.positionTranscript(), 100);
          }
        }
      });
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
        if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === "function") {
          this.player.controlBar.updateTranscriptButton();
        }
        focusElement(this.settingsButton, { delay: 150 });
        return;
      }
      this.createTranscriptWindow();
      this.loadTranscriptData();
      if (this.transcriptWindow) {
        this.transcriptWindow.style.display = "flex";
        if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
          this.setManagedTimeout(() => this.positionTranscript(), 0);
        }
        focusElement(this.settingsButton, { delay: 150 });
      }
      this.isVisible = true;
    }
    /**
     * Hide transcript window
     */
    hideTranscript({ focusButton = false } = {}) {
      var _a, _b;
      if (this.transcriptWindow) {
        this.transcriptWindow.style.display = "none";
        this.isVisible = false;
      }
      if (this.draggableResizable && this.draggableResizable.pointerResizeMode) {
        this.draggableResizable.disablePointerResizeMode();
        this.updateResizeOptionState();
      }
      this.hideResizeModeIndicator();
      this.announceLive("");
      if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === "function") {
        this.player.controlBar.updateTranscriptButton();
      }
      if (focusButton) {
        const transcriptButton = (_b = (_a = this.player.controlBar) == null ? void 0 : _a.controls) == null ? void 0 : _b.transcript;
        if (transcriptButton && typeof transcriptButton.focus === "function") {
          transcriptButton.focus();
        }
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
          "tabindex": "0"
        }
      });
      this.headerLeft = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-header-left`
      });
      this.settingsButton = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-transcript-settings`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("transcript.settingsMenu"),
          "aria-expanded": "false"
        }
      });
      this.settingsButton.appendChild(createIconElement("settings"));
      this.handlers.settingsClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.settingsMenuVisible) {
          this.hideSettingsMenu();
        } else {
          this.showSettingsMenu();
        }
      };
      this.settingsButton.addEventListener("click", this.handlers.settingsClick);
      this.handlers.settingsKeydown = (e) => {
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          e.stopPropagation();
          this.toggleKeyboardDragMode();
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          e.stopPropagation();
          this.toggleResizeMode();
        } else if (e.key === "Escape" && this.settingsMenuVisible) {
          e.preventDefault();
          e.stopPropagation();
          this.hideSettingsMenu();
        }
      };
      this.settingsButton.addEventListener("keydown", this.handlers.settingsKeydown);
      const title = DOMUtils.createElement("h3", {
        textContent: `${i18n.t("transcript.title")}. ${i18n.t("transcript.dragResizePrompt")}`
      });
      const autoscrollId = `${this.player.options.classPrefix}-transcript-autoscroll-${Date.now()}`;
      const autoscrollLabel = DOMUtils.createElement("label", {
        className: `${this.player.options.classPrefix}-transcript-autoscroll-label`,
        attributes: {
          "for": autoscrollId,
          "title": i18n.t("transcript.autoscroll")
        }
      });
      this.autoscrollCheckbox = DOMUtils.createElement("input", {
        attributes: {
          "id": autoscrollId,
          "type": "checkbox",
          "aria-label": i18n.t("transcript.autoscroll")
        }
      });
      if (this.autoscrollEnabled) {
        this.autoscrollCheckbox.checked = true;
      }
      const autoscrollText = DOMUtils.createElement("span", {
        textContent: i18n.t("transcript.autoscroll"),
        className: `${this.player.options.classPrefix}-transcript-autoscroll-text`
      });
      autoscrollLabel.appendChild(this.autoscrollCheckbox);
      autoscrollLabel.appendChild(autoscrollText);
      this.autoscrollCheckbox.addEventListener("change", (e) => {
        this.autoscrollEnabled = e.target.checked;
        this.saveAutoscrollPreference();
      });
      this.transcriptHeader.appendChild(title);
      this.headerLeft.appendChild(this.settingsButton);
      this.headerLeft.appendChild(autoscrollLabel);
      const selectId = `${this.player.options.classPrefix}-transcript-language-select-${Date.now()}`;
      const { label: languageLabel, select: languageSelector } = createLabeledSelect({
        classPrefix: this.player.options.classPrefix,
        labelClass: `${this.player.options.classPrefix}-transcript-language-label`,
        selectClass: `${this.player.options.classPrefix}-transcript-language-select`,
        labelText: "settings.language",
        selectId,
        hidden: true
        // Hidden until we detect multiple languages
      });
      this.languageLabel = languageLabel;
      this.languageSelector = languageSelector;
      preventDragOnElement(this.languageLabel);
      preventDragOnElement(this.languageSelector);
      this.headerLeft.appendChild(this.languageLabel);
      this.headerLeft.appendChild(this.languageSelector);
      const closeButton = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-transcript-close`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("transcript.close")
        }
      });
      closeButton.appendChild(createIconElement("close"));
      closeButton.addEventListener("click", () => this.hideTranscript({ focusButton: true }));
      this.transcriptHeader.appendChild(this.headerLeft);
      this.transcriptHeader.appendChild(closeButton);
      this.transcriptContent = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-content`
      });
      this.transcriptWindow.appendChild(this.transcriptHeader);
      this.transcriptWindow.appendChild(this.transcriptContent);
      this.createResizeHandles();
      this.liveRegion = DOMUtils.createElement("div", {
        className: "vidply-sr-only",
        attributes: {
          "aria-live": "polite",
          "aria-atomic": "true"
        }
      });
      this.transcriptWindow.appendChild(this.liveRegion);
      this.player.container.appendChild(this.transcriptWindow);
      this.setupDragAndDrop();
      if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
        this.positionTranscript();
      }
      this.handlers.documentClick = (e) => {
        if (this.settingsMenuJustOpened) {
          return;
        }
        if (this.styleDialogJustOpened) {
          return;
        }
        if (this.settingsButton && this.settingsButton.contains(e.target)) {
          return;
        }
        if (this.settingsMenu && this.settingsMenu.contains(e.target)) {
          return;
        }
        if (this.settingsMenuVisible) {
          this.hideSettingsMenu();
        }
        if (this.styleDialogVisible && this.styleDialog && !this.styleDialog.contains(e.target)) {
          this.hideStyleDialog();
        }
      };
      this.documentClickHandlerAdded = false;
      let resizeTimeout;
      this.handlers.resize = () => {
        if (resizeTimeout) {
          this.clearManagedTimeout(resizeTimeout);
        }
        resizeTimeout = this.setManagedTimeout(() => {
          if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
            this.positionTranscript();
          }
        }, 100);
      };
      window.addEventListener("resize", this.handlers.resize);
    }
    createResizeHandles() {
      if (!this.transcriptWindow) return;
      const directions = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
      this.transcriptResizeHandles = directions.map((direction) => {
        const handle = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-transcript-resize-handle ${this.player.options.classPrefix}-transcript-resize-${direction}`,
          attributes: {
            "data-direction": direction,
            "data-vidply-managed-resize": "true",
            "aria-hidden": "true"
          }
        });
        handle.style.display = "none";
        this.transcriptWindow.appendChild(handle);
        return handle;
      });
    }
    /**
     * Position transcript window next to video
     */
    positionTranscript() {
      if (!this.transcriptWindow || !this.player.videoWrapper || !this.isVisible) return;
      if (this.draggableResizable && this.draggableResizable.manuallyPositioned) {
        return;
      }
      const isMobile2 = window.innerWidth < 768;
      const videoRect = this.player.videoWrapper.getBoundingClientRect();
      const isFullscreen = this.player.state.fullscreen;
      if (isMobile2 && !isFullscreen) {
        this.transcriptWindow.style.position = "relative";
        this.transcriptWindow.style.left = "0";
        this.transcriptWindow.style.right = "0";
        this.transcriptWindow.style.bottom = "auto";
        this.transcriptWindow.style.top = "auto";
        this.transcriptWindow.style.width = "100%";
        this.transcriptWindow.style.maxWidth = "100%";
        this.transcriptWindow.style.maxHeight = "400px";
        this.transcriptWindow.style.height = "auto";
        this.transcriptWindow.style.borderRadius = "0";
        this.transcriptWindow.style.transform = "none";
        this.transcriptWindow.style.border = "none";
        this.transcriptWindow.style.borderTop = "1px solid var(--vidply-border-light)";
        this.transcriptWindow.style.removeProperty("border-right");
        this.transcriptWindow.style.removeProperty("border-bottom");
        this.transcriptWindow.style.removeProperty("border-left");
        this.transcriptWindow.style.removeProperty("border-image");
        this.transcriptWindow.style.removeProperty("border-image-source");
        this.transcriptWindow.style.removeProperty("border-image-slice");
        this.transcriptWindow.style.removeProperty("border-image-width");
        this.transcriptWindow.style.removeProperty("border-image-outset");
        this.transcriptWindow.style.removeProperty("border-image-repeat");
        this.transcriptWindow.style.boxShadow = "none";
        if (this.transcriptHeader) {
          this.transcriptHeader.style.cursor = "default";
        }
        if (this.transcriptWindow.parentNode !== this.player.container) {
          this.player.container.appendChild(this.transcriptWindow);
        }
      } else if (isFullscreen) {
        this.transcriptWindow.style.position = "fixed";
        this.transcriptWindow.style.left = "auto";
        this.transcriptWindow.style.right = "20px";
        this.transcriptWindow.style.bottom = "80px";
        this.transcriptWindow.style.top = "auto";
        this.transcriptWindow.style.maxHeight = "calc(100vh - 180px)";
        this.transcriptWindow.style.height = "auto";
        const fullscreenMinWidth = 260;
        const fullscreenAvailable = Math.max(fullscreenMinWidth, window.innerWidth - 40);
        const fullscreenDesired = parseFloat(this.transcriptWindow.style.width) || 400;
        const fullscreenWidth = Math.max(fullscreenMinWidth, Math.min(fullscreenDesired, fullscreenAvailable));
        this.transcriptWindow.style.width = `${fullscreenWidth}px`;
        this.transcriptWindow.style.maxWidth = "none";
        this.transcriptWindow.style.borderRadius = "8px";
        this.transcriptWindow.style.border = "1px solid var(--vidply-border)";
        this.transcriptWindow.style.removeProperty("border-top");
        this.transcriptWindow.style.removeProperty("border-right");
        this.transcriptWindow.style.removeProperty("border-bottom");
        this.transcriptWindow.style.removeProperty("border-left");
        this.transcriptWindow.style.removeProperty("border-image");
        this.transcriptWindow.style.removeProperty("border-image-source");
        this.transcriptWindow.style.removeProperty("border-image-slice");
        this.transcriptWindow.style.removeProperty("border-image-width");
        this.transcriptWindow.style.removeProperty("border-image-outset");
        this.transcriptWindow.style.removeProperty("border-image-repeat");
        if (this.transcriptHeader) {
          this.transcriptHeader.style.cursor = "move";
        }
        if (this.transcriptWindow.parentNode !== this.player.container) {
          this.player.container.appendChild(this.transcriptWindow);
        }
      } else {
        const transcriptWidth = parseFloat(this.transcriptWindow.style.width) || 400;
        const padding = 20;
        const minWidth = 260;
        const containerRect = this.player.container.getBoundingClientRect();
        const ensureContainerPositioned = () => {
          const computed = window.getComputedStyle(this.player.container);
          if (computed.position === "static") {
            this.player.container.style.position = "relative";
          }
        };
        ensureContainerPositioned();
        const left = videoRect.right - containerRect.left + padding;
        const availableWidth = window.innerWidth - videoRect.right - padding;
        const appliedWidth = Math.max(minWidth, Math.min(transcriptWidth, availableWidth));
        const appliedHeight = videoRect.height;
        this.transcriptWindow.style.position = "absolute";
        this.transcriptWindow.style.left = `${left}px`;
        this.transcriptWindow.style.right = "auto";
        this.transcriptWindow.style.bottom = "auto";
        this.transcriptWindow.style.top = "0";
        this.transcriptWindow.style.height = `${appliedHeight}px`;
        this.transcriptWindow.style.maxHeight = "none";
        this.transcriptWindow.style.width = `${appliedWidth}px`;
        this.transcriptWindow.style.maxWidth = "none";
        this.transcriptWindow.style.borderRadius = "8px";
        this.transcriptWindow.style.border = "1px solid var(--vidply-border)";
        this.transcriptWindow.style.removeProperty("border-top");
        this.transcriptWindow.style.removeProperty("border-right");
        this.transcriptWindow.style.removeProperty("border-bottom");
        this.transcriptWindow.style.removeProperty("border-left");
        this.transcriptWindow.style.removeProperty("border-image");
        this.transcriptWindow.style.removeProperty("border-image-source");
        this.transcriptWindow.style.removeProperty("border-image-slice");
        this.transcriptWindow.style.removeProperty("border-image-width");
        this.transcriptWindow.style.removeProperty("border-image-outset");
        this.transcriptWindow.style.removeProperty("border-image-repeat");
        if (this.transcriptHeader) {
          this.transcriptHeader.style.cursor = "move";
        }
        if (this.transcriptWindow.parentNode !== this.player.container) {
          this.player.container.appendChild(this.transcriptWindow);
        }
      }
    }
    /**
     * Get available transcript languages from tracks
     */
    getAvailableTranscriptLanguages() {
      const textTracks = this.player.textTracks;
      const languages = /* @__PURE__ */ new Map();
      textTracks.forEach((track) => {
        if ((track.kind === "captions" || track.kind === "subtitles") && track.language) {
          if (!languages.has(track.language)) {
            languages.set(track.language, {
              language: track.language,
              label: track.label || track.language,
              track
            });
          }
        }
      });
      return Array.from(languages.values());
    }
    /**
     * Update language selector dropdown
     */
    updateLanguageSelector() {
      if (!this.languageSelector) return;
      this.availableTranscriptLanguages = this.getAvailableTranscriptLanguages();
      this.languageSelector.innerHTML = "";
      if (this.availableTranscriptLanguages.length < 2) {
        toggleLabeledSelect(this.languageLabel, this.languageSelector, false);
        return;
      }
      toggleLabeledSelect(this.languageLabel, this.languageSelector, true);
      this.availableTranscriptLanguages.forEach((langInfo, index) => {
        const option = DOMUtils.createElement("option", {
          textContent: langInfo.label,
          attributes: {
            "value": langInfo.language
          }
        });
        this.languageSelector.appendChild(option);
      });
      if (this.currentTranscriptLanguage) {
        this.languageSelector.value = this.currentTranscriptLanguage;
      } else if (this.availableTranscriptLanguages.length > 0) {
        const activeTrack = this.player.textTracks.find(
          (track) => (track.kind === "captions" || track.kind === "subtitles") && track.mode === "showing"
        );
        this.currentTranscriptLanguage = activeTrack ? activeTrack.language : this.availableTranscriptLanguages[0].language;
        this.languageSelector.value = this.currentTranscriptLanguage;
      }
      if (this.languageSelectorHandler) {
        this.languageSelector.removeEventListener("change", this.languageSelectorHandler);
      }
      this.languageSelectorHandler = (e) => {
        this.currentTranscriptLanguage = e.target.value;
        this.loadTranscriptData();
      };
      this.languageSelector.addEventListener("change", this.languageSelectorHandler);
    }
    /**
     * Load transcript data from caption/subtitle tracks
     */
    loadTranscriptData() {
      this.transcriptEntries = [];
      this.transcriptContent.innerHTML = "";
      const textTracks = this.player.textTracks;
      let captionTrack = null;
      if (this.currentTranscriptLanguage) {
        captionTrack = textTracks.find(
          (track) => (track.kind === "captions" || track.kind === "subtitles") && track.language === this.currentTranscriptLanguage
        );
      }
      if (!captionTrack) {
        captionTrack = textTracks.find(
          (track) => track.kind === "captions" || track.kind === "subtitles"
        );
        if (captionTrack) {
          this.currentTranscriptLanguage = captionTrack.language;
        }
      }
      let descriptionTrack = null;
      if (this.currentTranscriptLanguage) {
        descriptionTrack = textTracks.find(
          (track) => track.kind === "descriptions" && track.language === this.currentTranscriptLanguage
        );
      }
      if (!descriptionTrack) {
        descriptionTrack = textTracks.find((track) => track.kind === "descriptions");
      }
      const metadataTrack = textTracks.find((track) => track.kind === "metadata");
      const hasDescriptionTrack = descriptionTrack && this.player.state.audioDescriptionEnabled;
      if (!captionTrack && !hasDescriptionTrack && !metadataTrack) {
        this.showNoTranscriptMessage();
        return;
      }
      const tracksToLoad = [captionTrack, descriptionTrack, metadataTrack].filter(Boolean);
      tracksToLoad.forEach((track) => {
        if (track.mode === "disabled") {
          track.mode = "hidden";
        }
      });
      const needsLoading = tracksToLoad.some((track) => !track.cues || track.cues.length === 0);
      if (needsLoading) {
        const loadingMessage = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-transcript-loading`,
          textContent: i18n.t("transcript.loading")
        });
        this.transcriptContent.appendChild(loadingMessage);
        let loaded = 0;
        const onLoad = () => {
          loaded++;
          if (loaded >= tracksToLoad.length) {
            this.loadTranscriptData();
          }
        };
        tracksToLoad.forEach((track) => {
          track.addEventListener("load", onLoad, { once: true });
        });
        this.setManagedTimeout(() => {
          this.loadTranscriptData();
        }, 500);
        return;
      }
      const allCues = [];
      if (captionTrack && captionTrack.cues) {
        Array.from(captionTrack.cues).forEach((cue) => {
          allCues.push({ cue, type: "caption" });
        });
      }
      if (descriptionTrack && descriptionTrack.cues && this.player.state.audioDescriptionEnabled) {
        Array.from(descriptionTrack.cues).forEach((cue) => {
          allCues.push({ cue, type: "description" });
        });
      }
      if (metadataTrack && metadataTrack.cues) {
        this.metadataCues = Array.from(metadataTrack.cues);
        this.setupMetadataHandling();
      }
      allCues.sort((a, b) => a.cue.startTime - b.cue.startTime);
      allCues.forEach((item, index) => {
        const entry = this.createTranscriptEntry(item.cue, index, item.type);
        this.transcriptEntries.push({
          element: entry,
          cue: item.cue,
          type: item.type,
          startTime: item.cue.startTime,
          endTime: item.cue.endTime
        });
        this.transcriptContent.appendChild(entry);
      });
      this.applyTranscriptStyles();
      this.updateLanguageSelector();
    }
    /**
     * Setup metadata handling on player load
     * This runs independently of transcript loading
     */
    setupMetadataHandlingOnLoad() {
      const setupMetadata = () => {
        const textTracks = this.player.textTracks;
        const metadataTrack = textTracks.find((track) => track.kind === "metadata");
        if (metadataTrack) {
          if (metadataTrack.mode === "disabled") {
            metadataTrack.mode = "hidden";
          }
          if (this.metadataCueChangeHandler) {
            metadataTrack.removeEventListener("cuechange", this.metadataCueChangeHandler);
          }
          this.metadataCueChangeHandler = () => {
            const activeCues = Array.from(metadataTrack.activeCues || []);
            if (activeCues.length > 0) {
              if (this.player.options.debug) {
                console.log("[VidPly Metadata] Active cues:", activeCues.map((c) => ({
                  start: c.startTime,
                  end: c.endTime,
                  text: c.text
                })));
              }
            }
            activeCues.forEach((cue) => {
              this.handleMetadataCue(cue);
            });
          };
          metadataTrack.addEventListener("cuechange", this.metadataCueChangeHandler);
          if (this.player.options.debug) {
            const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
            console.log("[VidPly Metadata] Track enabled,", cueCount, "cues available");
          }
        } else if (this.player.options.debug) {
          console.warn("[VidPly Metadata] No metadata track found");
        }
      };
      setupMetadata();
      this.player.on("loadedmetadata", setupMetadata);
    }
    /**
     * Setup metadata handling
     * Metadata cues are not displayed but can be used programmatically
     * This is called when transcript data is loaded (for storing cues)
     */
    setupMetadataHandling() {
      if (!this.metadataCues || this.metadataCues.length === 0) {
        return;
      }
      if (this.player.options.debug) {
        console.log("[VidPly Metadata]", this.metadataCues.length, "cues stored from transcript load");
      }
    }
    /**
     * Handle individual metadata cues
     * Parses metadata text and emits events or triggers actions
     */
    handleMetadataCue(cue) {
      const text = cue.text.trim();
      if (this.player.options.debug) {
        console.log("[VidPly Metadata] Processing cue:", {
          time: cue.startTime,
          text
        });
      }
      this.player.emit("metadata", {
        time: cue.startTime,
        endTime: cue.endTime,
        text,
        cue
      });
      if (text.includes("PAUSE")) {
        if (!this.player.state.paused) {
          if (this.player.options.debug) {
            console.log("[VidPly Metadata] Pausing video at", cue.startTime);
          }
          this.player.pause();
        }
        this.player.emit("metadata:pause", { time: cue.startTime, text });
      }
      const focusMatch = text.match(/FOCUS:([\w#-]+)/);
      if (focusMatch) {
        const targetSelector = focusMatch[1];
        const targetElement = document.querySelector(targetSelector);
        if (targetElement) {
          if (this.player.options.debug) {
            console.log("[VidPly Metadata] Focusing element:", targetSelector);
          }
          this.setManagedTimeout(() => {
            targetElement.focus();
          }, 10);
        } else if (this.player.options.debug) {
          console.warn("[VidPly Metadata] Element not found:", targetSelector);
        }
        this.player.emit("metadata:focus", {
          time: cue.startTime,
          target: targetSelector,
          element: targetElement,
          text
        });
      }
      const hashtags = text.match(/#[\w-]+/g);
      if (hashtags) {
        if (this.player.options.debug) {
          console.log("[VidPly Metadata] Hashtags found:", hashtags);
        }
        this.player.emit("metadata:hashtags", {
          time: cue.startTime,
          hashtags,
          text
        });
      }
    }
    /**
     * Create a single transcript entry element
     */
    createTranscriptEntry(cue, index, type = "caption") {
      const readableTime = TimeUtils.formatDuration(cue.startTime);
      const entryText = this.stripVTTFormatting(cue.text);
      const accessibleLabel = `${readableTime}: ${entryText}`;
      const entry = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-entry ${this.player.options.classPrefix}-transcript-${type}`,
        attributes: {
          "data-start": String(cue.startTime),
          "data-end": String(cue.endTime),
          "data-type": type,
          "role": "button",
          "tabindex": "0",
          "aria-label": accessibleLabel
        }
      });
      const timestamp = DOMUtils.createElement("span", {
        className: `${this.player.options.classPrefix}-transcript-time`,
        textContent: TimeUtils.formatTime(cue.startTime),
        attributes: {
          "aria-hidden": "true"
          // Hide from screen readers since aria-label on parent is used
        }
      });
      const text = DOMUtils.createElement("span", {
        className: `${this.player.options.classPrefix}-transcript-text`,
        textContent: entryText,
        attributes: {
          "aria-hidden": "true"
          // Hide from screen readers since aria-label on parent is used
        }
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
        textContent: i18n.t("transcript.noTranscript")
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
      if (!this.transcriptContent || !this.autoscrollEnabled) return;
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
     * Save autoscroll preference to localStorage
     */
    saveAutoscrollPreference() {
      const savedPreferences = this.storage.getTranscriptPreferences() || {};
      savedPreferences.autoscroll = this.autoscrollEnabled;
      this.storage.saveTranscriptPreferences(savedPreferences);
    }
    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
      if (!this.transcriptHeader || !this.transcriptWindow) return;
      const isMobile2 = window.innerWidth < 768;
      const isFullscreen = this.player.state.fullscreen;
      if (isMobile2 && !isFullscreen) {
        if (this.draggableResizable) {
          this.draggableResizable.destroy();
          this.draggableResizable = null;
        }
        return;
      }
      if (this.draggableResizable) {
        return;
      }
      this.draggableResizable = new DraggableResizable(this.transcriptWindow, {
        dragHandle: this.transcriptHeader,
        resizeHandles: this.transcriptResizeHandles,
        constrainToViewport: true,
        classPrefix: `${this.player.options.classPrefix}-transcript`,
        keyboardDragKey: "d",
        keyboardResizeKey: "r",
        keyboardStep: 10,
        keyboardStepLarge: 50,
        minWidth: 300,
        minHeight: 200,
        maxWidth: () => Math.max(320, window.innerWidth - 40),
        maxHeight: () => Math.max(200, window.innerHeight - 120),
        pointerResizeIndicatorText: i18n.t("transcript.resizeModeHint"),
        onPointerResizeToggle: (enabled) => {
          this.transcriptResizeHandles.forEach((handle) => {
            handle.style.display = enabled ? "block" : "none";
          });
          this.onPointerResizeModeChange(enabled);
        },
        onDragStart: (e) => {
          const ignoreSelectors = [
            `.${this.player.options.classPrefix}-transcript-close`,
            `.${this.player.options.classPrefix}-transcript-settings`,
            `.${this.player.options.classPrefix}-transcript-language-select`,
            `.${this.player.options.classPrefix}-transcript-language-label`,
            `.${this.player.options.classPrefix}-transcript-settings-menu`,
            `.${this.player.options.classPrefix}-transcript-style-dialog`
          ];
          for (const selector of ignoreSelectors) {
            if (e.target.closest(selector)) {
              return false;
            }
          }
          return true;
        }
      });
      this.customKeyHandler = (e) => {
        const key = e.key.toLowerCase();
        const alreadyPrevented = e.defaultPrevented;
        if (this.settingsMenuVisible || this.styleDialogVisible) {
          return;
        }
        if (key === "home") {
          e.preventDefault();
          e.stopPropagation();
          if (this.draggableResizable) {
            if (this.draggableResizable.pointerResizeMode) {
              this.draggableResizable.disablePointerResizeMode();
            }
            this.draggableResizable.manuallyPositioned = false;
            this.positionTranscript();
            this.updateResizeOptionState();
            this.announceLive(i18n.t("transcript.positionReset"));
          }
          return;
        }
        if (key === "r") {
          if (alreadyPrevented) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const enabled = this.toggleResizeMode();
          if (enabled) {
            this.transcriptWindow.focus();
          }
          return;
        }
        if (key === "escape") {
          if (this.draggableResizable && this.draggableResizable.pointerResizeMode) {
            e.preventDefault();
            e.stopPropagation();
            this.draggableResizable.disablePointerResizeMode();
            return;
          }
          if (this.draggableResizable && this.draggableResizable.keyboardDragMode) {
            e.preventDefault();
            e.stopPropagation();
            this.draggableResizable.disableKeyboardDragMode();
            this.announceLive(i18n.t("transcript.dragModeDisabled"));
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          this.hideTranscript({ focusButton: true });
          return;
        }
      };
      this.transcriptWindow.addEventListener("keydown", this.customKeyHandler);
    }
    /**
     * Toggle keyboard drag mode
     */
    toggleKeyboardDragMode() {
      if (this.draggableResizable) {
        const wasEnabled = this.draggableResizable.keyboardDragMode;
        this.draggableResizable.toggleKeyboardDragMode();
        const isEnabled = this.draggableResizable.keyboardDragMode;
        if (!wasEnabled && isEnabled) {
          this.enableMoveMode();
        }
        this.updateDragOptionState();
        if (this.settingsMenuVisible) {
          this.hideSettingsMenu();
        }
        this.transcriptWindow.focus();
      }
    }
    /**
     * Toggle settings menu visibility
     */
    toggleSettingsMenu() {
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      } else {
        this.showSettingsMenu();
      }
    }
    /**
     * Show settings menu
     */
    showSettingsMenu() {
      this.settingsMenuJustOpened = true;
      setTimeout(() => {
        this.settingsMenuJustOpened = false;
      }, 350);
      if (!this.documentClickHandlerAdded) {
        setTimeout(() => {
          document.addEventListener("click", this.handlers.documentClick);
          this.documentClickHandlerAdded = true;
        }, 300);
      }
      if (this.settingsMenu) {
        this.settingsMenu.style.display = "block";
        this.settingsMenuVisible = true;
        if (this.settingsButton) {
          this.settingsButton.setAttribute("aria-expanded", "true");
        }
        this.attachSettingsMenuKeyboardNavigation();
        this.positionSettingsMenuImmediate();
        this.updateResizeOptionState();
        setTimeout(() => {
          const menuItems = this.settingsMenu.querySelectorAll(`.${this.player.options.classPrefix}-transcript-settings-item`);
          if (menuItems.length > 0) {
            menuItems[0].setAttribute("tabindex", "0");
            for (let i = 1; i < menuItems.length; i++) {
              menuItems[i].setAttribute("tabindex", "-1");
            }
            menuItems[0].focus();
          }
        }, 50);
        return;
      }
      this.settingsMenu = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-settings-menu`,
        attributes: {
          "role": "menu"
        }
      });
      const keyboardDragOption = createMenuItem({
        classPrefix: this.player.options.classPrefix,
        itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
        icon: "move",
        label: "transcript.enableDragMode",
        hasTextClass: true,
        onClick: () => {
          this.toggleKeyboardDragMode();
          this.hideSettingsMenu();
        }
      });
      keyboardDragOption.setAttribute("role", "switch");
      keyboardDragOption.setAttribute("aria-checked", "false");
      this.dragOptionButton = keyboardDragOption;
      this.dragOptionText = keyboardDragOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
      this.updateDragOptionState();
      const styleOption = createMenuItem({
        classPrefix: this.player.options.classPrefix,
        itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
        icon: "settings",
        label: "transcript.styleTranscript",
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.hideSettingsMenu();
          setTimeout(() => {
            this.showStyleDialog();
          }, 50);
        }
      });
      const resizeOption = createMenuItem({
        classPrefix: this.player.options.classPrefix,
        itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
        icon: "resize",
        label: "transcript.enableResizeMode",
        hasTextClass: true,
        onClick: (event) => {
          event.preventDefault();
          event.stopPropagation();
          const enabled = this.toggleResizeMode({ focus: false });
          if (enabled) {
            this.hideSettingsMenu({ focusButton: false });
            setTimeout(() => {
              if (this.transcriptWindow) {
                this.transcriptWindow.focus();
              }
            }, 20);
          } else {
            this.hideSettingsMenu({ focusButton: true });
          }
        }
      });
      resizeOption.setAttribute("role", "switch");
      resizeOption.setAttribute("aria-checked", "false");
      this.resizeOptionButton = resizeOption;
      this.resizeOptionText = resizeOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
      this.updateResizeOptionState();
      const closeOption = createMenuItem({
        classPrefix: this.player.options.classPrefix,
        itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
        icon: "close",
        label: "transcript.closeMenu",
        onClick: () => {
          this.hideSettingsMenu();
        }
      });
      this.settingsMenu.appendChild(keyboardDragOption);
      this.settingsMenu.appendChild(resizeOption);
      this.settingsMenu.appendChild(styleOption);
      this.settingsMenu.appendChild(closeOption);
      this.settingsMenu.style.visibility = "hidden";
      this.settingsMenu.style.display = "block";
      if (this.settingsButton && this.settingsButton.parentNode) {
        this.settingsButton.insertAdjacentElement("afterend", this.settingsMenu);
      } else if (this.headerLeft) {
        this.headerLeft.appendChild(this.settingsMenu);
      } else if (this.transcriptHeader) {
        this.transcriptHeader.appendChild(this.settingsMenu);
      } else {
        this.transcriptWindow.appendChild(this.settingsMenu);
      }
      this.positionSettingsMenuImmediate();
      requestAnimationFrame(() => {
        if (this.settingsMenu) {
          this.settingsMenu.style.visibility = "visible";
        }
      });
      this.settingsMenuKeyHandler = attachMenuKeyboardNavigation(
        this.settingsMenu,
        this.settingsButton,
        `.${this.player.options.classPrefix}-transcript-settings-item`,
        () => this.hideSettingsMenu({ focusButton: true })
      );
      this.settingsMenuVisible = true;
      this.settingsMenu.style.display = "block";
      if (this.settingsButton) {
        this.settingsButton.setAttribute("aria-expanded", "true");
      }
      this.updateResizeOptionState();
      setTimeout(() => {
        const menuItems = this.settingsMenu.querySelectorAll(`.${this.player.options.classPrefix}-transcript-settings-item`);
        if (menuItems.length > 0) {
          menuItems[0].setAttribute("tabindex", "0");
          for (let i = 1; i < menuItems.length; i++) {
            menuItems[i].setAttribute("tabindex", "-1");
          }
          menuItems[0].focus();
        }
      }, 50);
    }
    /**
     * Position settings menu relative to settings button (immediate/synchronous)
     */
    positionSettingsMenuImmediate() {
      if (!this.settingsMenu || !this.settingsButton) return;
      const container = this.settingsButton.parentElement;
      if (!container) return;
      const buttonRect = this.settingsButton.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const menuRect = this.settingsMenu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const buttonLeft = buttonRect.left - containerRect.left;
      const buttonBottom = buttonRect.bottom - containerRect.top;
      const buttonTop = buttonRect.top - containerRect.top;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      let menuTop = buttonBottom + 4;
      if (spaceBelow < menuRect.height + 20 && spaceAbove > spaceBelow) {
        menuTop = buttonTop - menuRect.height - 4;
        this.settingsMenu.classList.add("vidply-menu-above");
      } else {
        this.settingsMenu.classList.remove("vidply-menu-above");
      }
      this.settingsMenu.style.top = `${menuTop}px`;
      this.settingsMenu.style.left = `${buttonLeft}px`;
      this.settingsMenu.style.right = "auto";
      this.settingsMenu.style.bottom = "auto";
    }
    /**
     * Position settings menu relative to settings button (async for repositioning)
     */
    positionSettingsMenu() {
      if (!this.settingsMenu || !this.settingsButton) return;
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.positionSettingsMenuImmediate();
        }, 10);
      });
    }
    /**
     * Attach keyboard navigation to settings menu
     */
    attachSettingsMenuKeyboardNavigation() {
      if (!this.settingsMenu) return;
      if (this.settingsMenuKeyHandler) {
        this.settingsMenu.removeEventListener("keydown", this.settingsMenuKeyHandler, true);
      }
      const handler = attachMenuKeyboardNavigation(
        this.settingsMenu,
        this.settingsButton,
        `.${this.player.options.classPrefix}-transcript-settings-item`,
        () => this.hideSettingsMenu({ focusButton: true })
      );
      this.settingsMenuKeyHandler = handler;
    }
    /**
     * Hide settings menu
     */
    hideSettingsMenu({ focusButton = true } = {}) {
      if (this.settingsMenu) {
        this.settingsMenu.style.display = "none";
        this.settingsMenuVisible = false;
        this.settingsMenuJustOpened = false;
        if (this.settingsMenuKeyHandler) {
          this.settingsMenu.removeEventListener("keydown", this.settingsMenuKeyHandler, true);
          this.settingsMenuKeyHandler = null;
        }
        if (this.settingsButton) {
          this.settingsButton.setAttribute("aria-expanded", "false");
          if (focusButton) {
            this.settingsButton.focus();
          }
        }
      }
    }
    /**
     * Enable move mode (gives visual feedback)
     */
    enableMoveMode() {
      this.hideResizeModeIndicator();
      this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-move-mode`);
      const tooltip = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-move-tooltip`,
        textContent: "Drag with mouse or press D for keyboard drag mode"
      });
      this.transcriptHeader.appendChild(tooltip);
      setTimeout(() => {
        this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-move-mode`);
        if (tooltip.parentNode) {
          tooltip.remove();
        }
      }, 2e3);
    }
    /**
     * Toggle resize mode
     */
    toggleResizeMode({ focus = true } = {}) {
      if (!this.draggableResizable) {
        return false;
      }
      if (this.draggableResizable.pointerResizeMode) {
        this.draggableResizable.disablePointerResizeMode({ focus });
        return false;
      }
      this.draggableResizable.enablePointerResizeMode({ focus });
      return true;
    }
    updateDragOptionState() {
      if (!this.dragOptionButton) {
        return;
      }
      const isEnabled = !!(this.draggableResizable && this.draggableResizable.keyboardDragMode);
      const text = isEnabled ? i18n.t("transcript.disableDragMode") : i18n.t("transcript.enableDragMode");
      const ariaLabel = isEnabled ? i18n.t("transcript.disableDragModeAria") : i18n.t("transcript.enableDragModeAria");
      this.dragOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
      this.dragOptionButton.setAttribute("aria-label", ariaLabel);
      this.dragOptionButton.setAttribute("title", text);
      if (this.dragOptionText) {
        this.dragOptionText.textContent = text;
      }
    }
    updateResizeOptionState() {
      if (!this.resizeOptionButton) {
        return;
      }
      const isEnabled = !!(this.draggableResizable && this.draggableResizable.pointerResizeMode);
      const text = isEnabled ? i18n.t("transcript.disableResizeMode") : i18n.t("transcript.enableResizeMode");
      const ariaLabel = isEnabled ? i18n.t("transcript.disableResizeModeAria") : i18n.t("transcript.enableResizeModeAria");
      this.resizeOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
      this.resizeOptionButton.setAttribute("aria-label", ariaLabel);
      this.resizeOptionButton.setAttribute("title", text);
      if (this.resizeOptionText) {
        this.resizeOptionText.textContent = text;
      }
    }
    showResizeModeIndicator() {
      if (!this.transcriptHeader) {
        return;
      }
      this.hideResizeModeIndicator();
      const indicator = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-resize-tooltip`,
        textContent: i18n.t("transcript.resizeModeHint") || "Resize handles enabled. Drag edges or corners to adjust. Press Esc or R to exit."
      });
      this.transcriptHeader.appendChild(indicator);
      this.resizeModeIndicator = indicator;
      this.resizeModeIndicatorTimeout = this.setManagedTimeout(() => {
        this.hideResizeModeIndicator();
      }, 3e3);
    }
    hideResizeModeIndicator() {
      if (this.resizeModeIndicatorTimeout) {
        this.clearManagedTimeout(this.resizeModeIndicatorTimeout);
        this.resizeModeIndicatorTimeout = null;
      }
      if (this.resizeModeIndicator && this.resizeModeIndicator.parentNode) {
        this.resizeModeIndicator.remove();
      }
      this.resizeModeIndicator = null;
    }
    onPointerResizeModeChange(enabled) {
      this.updateResizeOptionState();
      if (enabled) {
        this.showResizeModeIndicator();
        this.announceLive(i18n.t("transcript.resizeModeEnabled"));
      } else {
        this.hideResizeModeIndicator();
        this.announceLive(i18n.t("transcript.resizeModeDisabled"));
      }
    }
    /**
     * Show style dialog
     */
    showStyleDialog() {
      if (this.styleDialog) {
        this.styleDialog.style.display = "block";
        this.styleDialogVisible = true;
        if (this.handlers.styleDialogKeydown) {
          document.addEventListener("keydown", this.handlers.styleDialogKeydown);
        }
        this.styleDialogJustOpened = true;
        setTimeout(() => {
          this.styleDialogJustOpened = false;
        }, 350);
        setTimeout(() => {
          const firstSelect = this.styleDialog.querySelector("select, input");
          if (firstSelect) {
            firstSelect.focus();
          }
        }, 0);
        return;
      }
      this.styleDialog = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-style-dialog`
      });
      const title = DOMUtils.createElement("h4", {
        textContent: i18n.t("transcript.styleTitle"),
        className: `${this.player.options.classPrefix}-transcript-style-title`
      });
      this.styleDialog.appendChild(title);
      const fontSizeControl = this.createStyleSelectControl(
        i18n.t("captions.fontSize"),
        "fontSize",
        [
          { label: i18n.t("fontSizes.small"), value: "90%" },
          { label: i18n.t("fontSizes.normal"), value: "100%" },
          { label: i18n.t("fontSizes.large"), value: "110%" },
          { label: i18n.t("fontSizes.xlarge"), value: "120%" }
        ]
      );
      this.styleDialog.appendChild(fontSizeControl);
      const fontFamilyControl = this.createStyleSelectControl(
        i18n.t("captions.fontFamily"),
        "fontFamily",
        [
          { label: i18n.t("fontFamilies.sansSerif"), value: "sans-serif" },
          { label: i18n.t("fontFamilies.serif"), value: "serif" },
          { label: i18n.t("fontFamilies.monospace"), value: "monospace" }
        ]
      );
      this.styleDialog.appendChild(fontFamilyControl);
      const colorControl = this.createStyleColorControl(i18n.t("captions.color"), "color");
      this.styleDialog.appendChild(colorControl);
      const bgColorControl = this.createStyleColorControl(i18n.t("captions.backgroundColor"), "backgroundColor");
      this.styleDialog.appendChild(bgColorControl);
      const opacityControl = this.createStyleOpacityControl(i18n.t("captions.opacity"), "opacity");
      this.styleDialog.appendChild(opacityControl);
      const closeBtn = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-transcript-style-close`,
        textContent: i18n.t("settings.close"),
        attributes: {
          "type": "button"
        }
      });
      closeBtn.addEventListener("click", () => this.hideStyleDialog());
      this.styleDialog.appendChild(closeBtn);
      this.handlers.styleDialogKeydown = (e) => {
        if (!this.styleDialogVisible) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          this.hideStyleDialog();
          return;
        }
        if (e.key === "Tab") {
          const focusableElements = this.styleDialog.querySelectorAll(
            "select, input, button"
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      document.addEventListener("keydown", this.handlers.styleDialogKeydown);
      if (this.headerLeft) {
        this.headerLeft.appendChild(this.styleDialog);
      } else {
        this.transcriptHeader.appendChild(this.styleDialog);
      }
      this.applyTranscriptStyles();
      this.styleDialogVisible = true;
      this.styleDialog.style.display = "block";
      this.styleDialogJustOpened = true;
      setTimeout(() => {
        this.styleDialogJustOpened = false;
      }, 350);
      setTimeout(() => {
        const firstSelect = this.styleDialog.querySelector("select, input");
        if (firstSelect) {
          firstSelect.focus();
        }
      }, 0);
    }
    /**
     * Hide style dialog
     */
    hideStyleDialog() {
      if (this.styleDialog) {
        this.styleDialog.style.display = "none";
        this.styleDialogVisible = false;
        if (this.handlers.styleDialogKeydown) {
          document.removeEventListener("keydown", this.handlers.styleDialogKeydown);
        }
        if (this.settingsButton) {
          this.settingsButton.focus();
        }
      }
    }
    /**
     * Create style select control
     */
    createStyleSelectControl(label, property, options) {
      const group = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-style-group`
      });
      const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;
      const labelEl = DOMUtils.createElement("label", {
        textContent: label,
        attributes: {
          "for": controlId
        }
      });
      group.appendChild(labelEl);
      const select = DOMUtils.createElement("select", {
        className: `${this.player.options.classPrefix}-transcript-style-select`,
        attributes: {
          "id": controlId
        }
      });
      options.forEach((opt) => {
        const option = DOMUtils.createElement("option", {
          textContent: opt.label,
          attributes: {
            "value": opt.value
          }
        });
        if (this.transcriptStyle[property] === opt.value) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.addEventListener("change", (e) => {
        this.transcriptStyle[property] = e.target.value;
        this.applyTranscriptStyles();
        this.savePreferences();
      });
      group.appendChild(select);
      return group;
    }
    /**
     * Create style color control
     */
    createStyleColorControl(label, property) {
      const group = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-style-group`
      });
      const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;
      const labelEl = DOMUtils.createElement("label", {
        textContent: label,
        attributes: {
          "for": controlId
        }
      });
      group.appendChild(labelEl);
      const input = DOMUtils.createElement("input", {
        attributes: {
          "id": controlId,
          "type": "color",
          "value": this.transcriptStyle[property]
        },
        className: `${this.player.options.classPrefix}-transcript-style-color`
      });
      input.addEventListener("input", (e) => {
        this.transcriptStyle[property] = e.target.value;
        this.applyTranscriptStyles();
        this.savePreferences();
      });
      group.appendChild(input);
      return group;
    }
    /**
     * Create style opacity control
     */
    createStyleOpacityControl(label, property) {
      const group = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-style-group`
      });
      const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;
      const labelEl = DOMUtils.createElement("label", {
        textContent: label,
        attributes: {
          "for": controlId
        }
      });
      group.appendChild(labelEl);
      const valueDisplay = DOMUtils.createElement("span", {
        textContent: Math.round(this.transcriptStyle[property] * 100) + "%",
        className: `${this.player.options.classPrefix}-transcript-style-value`
      });
      const input = DOMUtils.createElement("input", {
        attributes: {
          "id": controlId,
          "type": "range",
          "min": "0",
          "max": "1",
          "step": "0.1",
          "value": String(this.transcriptStyle[property])
        },
        className: `${this.player.options.classPrefix}-transcript-style-range`
      });
      input.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        this.transcriptStyle[property] = value;
        valueDisplay.textContent = Math.round(value * 100) + "%";
        this.applyTranscriptStyles();
        this.savePreferences();
      });
      const inputContainer = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-style-range-container`
      });
      inputContainer.appendChild(input);
      inputContainer.appendChild(valueDisplay);
      group.appendChild(labelEl);
      group.appendChild(inputContainer);
      return group;
    }
    /**
     * Save transcript preferences to localStorage
     */
    savePreferences() {
      this.storage.saveTranscriptPreferences(this.transcriptStyle);
    }
    /**
     * Apply transcript styles
     */
    applyTranscriptStyles() {
      if (!this.transcriptWindow) return;
      this.transcriptWindow.style.backgroundColor = this.transcriptStyle.backgroundColor;
      this.transcriptWindow.style.opacity = String(this.transcriptStyle.opacity);
      if (this.transcriptContent) {
        this.transcriptContent.style.fontSize = this.transcriptStyle.fontSize;
        this.transcriptContent.style.fontFamily = this.transcriptStyle.fontFamily;
        this.transcriptContent.style.color = this.transcriptStyle.color;
      }
      const textEntries = this.transcriptWindow.querySelectorAll(`.${this.player.options.classPrefix}-transcript-text`);
      textEntries.forEach((entry) => {
        entry.style.fontSize = this.transcriptStyle.fontSize;
        entry.style.fontFamily = this.transcriptStyle.fontFamily;
        entry.style.color = this.transcriptStyle.color;
      });
      const timeEntries = this.transcriptWindow.querySelectorAll(`.${this.player.options.classPrefix}-transcript-time`);
      timeEntries.forEach((entry) => {
        entry.style.fontFamily = this.transcriptStyle.fontFamily;
      });
    }
    /**
     * Set a managed timeout that will be cleaned up on destroy
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setManagedTimeout(callback, delay) {
      const timeoutId = setTimeout(() => {
        this.timeouts.delete(timeoutId);
        callback();
      }, delay);
      this.timeouts.add(timeoutId);
      return timeoutId;
    }
    /**
     * Clear a managed timeout
     * @param {number} timeoutId - Timeout ID to clear
     */
    clearManagedTimeout(timeoutId) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(timeoutId);
      }
    }
    /**
     * Cleanup
     */
    destroy() {
      this.hideResizeModeIndicator();
      if (this.draggableResizable) {
        if (this.draggableResizable.pointerResizeMode) {
          this.draggableResizable.disablePointerResizeMode();
          this.updateResizeOptionState();
        }
        this.draggableResizable.destroy();
        this.draggableResizable = null;
      }
      if (this.transcriptWindow && this.customKeyHandler) {
        this.transcriptWindow.removeEventListener("keydown", this.customKeyHandler);
        this.customKeyHandler = null;
      }
      if (this.handlers.timeupdate) {
        this.player.off("timeupdate", this.handlers.timeupdate);
      }
      if (this.handlers.audiodescriptionenabled) {
        this.player.off("audiodescriptionenabled", this.handlers.audiodescriptionenabled);
      }
      if (this.handlers.audiodescriptiondisabled) {
        this.player.off("audiodescriptiondisabled", this.handlers.audiodescriptiondisabled);
      }
      if (this.settingsButton) {
        if (this.handlers.settingsClick) {
          this.settingsButton.removeEventListener("click", this.handlers.settingsClick);
        }
        if (this.handlers.settingsKeydown) {
          this.settingsButton.removeEventListener("keydown", this.handlers.settingsKeydown);
        }
      }
      if (this.handlers.styleDialogKeydown) {
        document.removeEventListener("keydown", this.handlers.styleDialogKeydown);
      }
      if (this.handlers.documentClick) {
        document.removeEventListener("click", this.handlers.documentClick);
      }
      if (this.handlers.resize) {
        window.removeEventListener("resize", this.handlers.resize);
      }
      this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      this.timeouts.clear();
      this.handlers = null;
      if (this.transcriptWindow && this.transcriptWindow.parentNode) {
        this.transcriptWindow.parentNode.removeChild(this.transcriptWindow);
      }
      this.transcriptWindow = null;
      this.transcriptHeader = null;
      this.transcriptContent = null;
      this.transcriptEntries = [];
      this.settingsMenu = null;
      this.styleDialog = null;
      this.transcriptResizeHandles = [];
      this.resizeOptionButton = null;
      this.resizeOptionText = null;
      this.liveRegion = null;
    }
    announceLive(message) {
      if (!this.liveRegion) return;
      this.liveRegion.textContent = message || "";
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
      this.media.controls = false;
      this.media.removeAttribute("controls");
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
      let src;
      const sourceElement = this.player.element.querySelector("source");
      if (sourceElement) {
        src = sourceElement.getAttribute("src");
      } else {
        src = this.player.element.getAttribute("src") || this.player.element.src;
      }
      this.player.log(`Loading HLS source: ${src}`, "log");
      if (!src) {
        throw new Error("No HLS source found");
      }
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
  var Player = class _Player extends EventEmitter {
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
        playsInline: true,
        // Enable inline playback on iOS (prevents native fullscreen)
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
        pipButton: false,
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
          "seek-forward": ["ArrowRight"],
          "seek-backward": ["ArrowLeft"],
          "mute": ["m"],
          "fullscreen": ["f"],
          "captions": ["c"],
          "caption-style-menu": ["a"],
          "speed-up": [">"],
          "speed-down": ["<"],
          "speed-menu": ["s"],
          "quality-menu": ["q"],
          "chapters-menu": ["j"],
          "transcript-toggle": ["t"]
        },
        // Accessibility
        ariaLabels: {},
        screenReaderAnnouncements: true,
        highContrast: false,
        focusHighlight: true,
        metadataAlerts: {},
        metadataHashtags: {},
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
      this.options.metadataAlerts = this.options.metadataAlerts || {};
      this.options.metadataHashtags = this.options.metadataHashtags || {};
      this.storage = new StorageManager("vidply");
      const savedPrefs = this.storage.getPlayerPreferences();
      if (savedPrefs) {
        if (savedPrefs.volume !== void 0) this.options.volume = savedPrefs.volume;
        if (savedPrefs.playbackSpeed !== void 0) this.options.playbackSpeed = savedPrefs.playbackSpeed;
        if (savedPrefs.muted !== void 0) this.options.muted = savedPrefs.muted;
      }
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
      this.signLanguageSources = this.options.signLanguageSources || {};
      this.currentSignLanguage = null;
      this.signLanguageVideo = null;
      this.audioDescriptionSourceElement = null;
      this.originalAudioDescriptionSource = null;
      this.audioDescriptionCaptionTracks = [];
      this._audioDescriptionDesiredState = false;
      this._textTracksCache = null;
      this._textTracksDirty = true;
      this._sourceElementsCache = null;
      this._sourceElementsDirty = true;
      this._trackElementsCache = null;
      this._trackElementsDirty = true;
      this.timeouts = /* @__PURE__ */ new Set();
      this.container = null;
      this.renderer = null;
      this.controlBar = null;
      this.captionManager = null;
      this.keyboardManager = null;
      this.settingsDialog = null;
      this.metadataCueChangeHandler = null;
      this.metadataAlertHandlers = /* @__PURE__ */ new Map();
      this.init();
    }
    async init() {
      var _a;
      try {
        this.log("Initializing VidPly player");
        if (this.options.languageFiles) {
          try {
            await i18n.loadLanguagesFromUrls(this.options.languageFiles);
          } catch (error) {
            console.warn("Failed to load some language files:", error);
          }
        }
        if (this.options.languageFile && this.options.languageFileUrl) {
          try {
            await i18n.loadLanguageFromUrl(this.options.languageFile, this.options.languageFileUrl);
            this.log(`Custom language file loaded for ${this.options.languageFile}`);
          } catch (error) {
            console.warn(`Failed to load language file for ${this.options.languageFile}:`, error);
          }
        }
        if (!this.options.language || this.options.language === "en") {
          const htmlLang = this.detectHtmlLanguage();
          if (htmlLang) {
            this.options.language = htmlLang;
            this.log(`Auto-detected language from HTML: ${htmlLang}`);
          }
        }
        if (!this.options.language) {
          this.options.language = "en";
        }
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
        this.setupMetadataHandling();
        if (this.options.keyboard) {
          this.keyboardManager = new KeyboardManager(this);
        }
        this.setupResponsiveHandlers();
        if (this.options.startTime > 0) {
          this.seek(this.options.startTime);
        }
        requestAnimationFrame(() => {
          if (this.options.muted) {
            this.mute();
          } else if (this.renderer && this.renderer.media) {
            this.renderer.setMuted(false);
          }
          if (this.options.volume !== 0.8) {
            this.setVolume(this.options.volume);
          } else if (this.renderer && this.renderer.media) {
            this.renderer.setVolume(this.options.volume);
          }
        });
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
    /**
     * Detect language from HTML lang attribute
     * @returns {string|null} Language code if available in translations, null otherwise
     */
    detectHtmlLanguage() {
      const htmlLang = document.documentElement.lang || document.documentElement.getAttribute("lang");
      if (!htmlLang) {
        return null;
      }
      const normalizedLang = htmlLang.toLowerCase().split("-")[0];
      if (i18n.translations[normalizedLang]) {
        return normalizedLang;
      }
      this.log(`Language "${htmlLang}" not available, using English as fallback`);
      return null;
    }
    createContainer() {
      this.container = DOMUtils.createElement("div", {
        className: `${this.options.classPrefix}-player`,
        attributes: {
          "role": "region",
          "aria-label": i18n.t("player.label"),
          "tabindex": "0"
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
      this.element.controls = false;
      this.element.removeAttribute("controls");
      this.element.setAttribute("tabindex", "-1");
      this.element.style.width = "100%";
      this.element.style.height = "100%";
      if (this.element.tagName === "VIDEO" && this.options.playsInline) {
        this.element.setAttribute("playsinline", "");
        this.element.playsInline = true;
      }
      if (this.options.width) {
        this.container.style.width = typeof this.options.width === "number" ? `${this.options.width}px` : this.options.width;
      }
      if (this.options.height) {
        this.container.style.height = typeof this.options.height === "number" ? `${this.options.height}px` : this.options.height;
      }
      if (this.options.poster && this.element.tagName === "VIDEO") {
        this.element.poster = this.resolvePosterPath(this.options.poster);
      }
      if (this.element.tagName === "VIDEO") {
        this.createPlayButtonOverlay();
      }
      this.element.vidply = this;
      _Player.instances.push(this);
      this.element.style.cursor = "pointer";
      this.element.addEventListener("click", (e) => {
        if (e.target === this.element) {
          this.toggle();
        }
      });
      this.on("play", () => {
        this.hidePosterOverlay();
      });
      this.on("timeupdate", () => {
        if (this.state.currentTime > 0) {
          this.hidePosterOverlay();
        }
      });
      this.element.addEventListener("loadeddata", () => {
        if (this.state.playing || this.state.currentTime > 0) {
          this.hidePosterOverlay();
        }
      }, { once: true });
    }
    createPlayButtonOverlay() {
      this.playButtonOverlay = createPlayOverlay();
      this.playButtonOverlay.addEventListener("click", () => {
        this.toggle();
      });
      this.videoWrapper.appendChild(this.playButtonOverlay);
      this.on("play", () => {
        this.playButtonOverlay.style.opacity = "0";
        this.playButtonOverlay.style.pointerEvents = "none";
      });
      this.on("pause", () => {
        this.playButtonOverlay.style.opacity = "1";
        this.playButtonOverlay.style.pointerEvents = "auto";
        this.positionPlayOverlayOnMobile();
      });
      this.on("ended", () => {
        this.playButtonOverlay.style.opacity = "1";
        this.playButtonOverlay.style.pointerEvents = "auto";
        this.positionPlayOverlayOnMobile();
      });
      this.debouncedPositionPlayOverlay = debounce(() => {
        this.positionPlayOverlayOnMobile();
      }, 150);
      window.addEventListener("resize", this.debouncedPositionPlayOverlay);
      this.on("loadedmetadata", () => {
        this.positionPlayOverlayOnMobile();
      });
      this.on("enterfullscreen", () => {
        rafWithTimeout(() => this.positionPlayOverlayOnMobile(), 100);
      });
      this.on("exitfullscreen", () => {
        rafWithTimeout(() => this.positionPlayOverlayOnMobile(), 100);
      });
    }
    positionPlayOverlayOnMobile() {
      if (!this.playButtonOverlay || this.element.tagName !== "VIDEO") {
        return;
      }
      const mobile = isMobile();
      if (!mobile) {
        this.playButtonOverlay.style.top = "";
        return;
      }
      const videoRect = this.element.getBoundingClientRect();
      const wrapperRect = this.videoWrapper.getBoundingClientRect();
      const videoCenter = videoRect.top - wrapperRect.top + videoRect.height / 2;
      this.playButtonOverlay.style.top = `${videoCenter}px`;
    }
    async initializeRenderer() {
      var _a;
      const src = this.element.src || ((_a = this.element.querySelector("source")) == null ? void 0 : _a.src);
      if (!src) {
        throw new Error("No media source found");
      }
      const sourceElements = this.sourceElements;
      for (const sourceEl of sourceElements) {
        const descSrc = sourceEl.getAttribute("data-desc-src");
        const origSrc = sourceEl.getAttribute("data-orig-src");
        if (descSrc || origSrc) {
          if (!this.audioDescriptionSourceElement) {
            this.audioDescriptionSourceElement = sourceEl;
          }
          if (origSrc) {
            if (!this.originalAudioDescriptionSource) {
              this.originalAudioDescriptionSource = origSrc;
            }
            if (!this.originalSrc) {
              this.originalSrc = origSrc;
            }
          } else {
            const currentSrcAttr = sourceEl.getAttribute("src");
            if (!this.originalAudioDescriptionSource && currentSrcAttr) {
              this.originalAudioDescriptionSource = currentSrcAttr;
            }
            if (!this.originalSrc && currentSrcAttr) {
              this.originalSrc = currentSrcAttr;
            }
          }
          if (descSrc && !this.audioDescriptionSrc) {
            this.audioDescriptionSrc = descSrc;
          }
        }
      }
      const trackElements = this.trackElements;
      trackElements.forEach((trackEl) => {
        const trackKind = trackEl.getAttribute("kind");
        const trackDescSrc = trackEl.getAttribute("data-desc-src");
        if (trackKind === "captions" || trackKind === "subtitles" || trackKind === "chapters") {
          if (trackDescSrc) {
            this.audioDescriptionCaptionTracks.push({
              trackElement: trackEl,
              originalSrc: trackEl.getAttribute("src"),
              describedSrc: trackDescSrc,
              originalTrackSrc: trackEl.getAttribute("data-orig-src") || trackEl.getAttribute("src"),
              explicit: true
              // Explicitly defined, so we should validate it
            });
            this.log(`Found explicit described ${trackKind} track: ${trackEl.getAttribute("src")} -> ${trackDescSrc}`);
          }
        }
      });
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
      this.invalidateTrackCache();
    }
    /**
     * Get cached text tracks array
     * @returns {Array} Array of text tracks
     */
    get textTracks() {
      if (!this._textTracksCache || this._textTracksDirty) {
        this._textTracksCache = Array.from(this.element.textTracks || []);
        this._textTracksDirty = false;
      }
      return this._textTracksCache;
    }
    /**
     * Get cached source elements array
     * @returns {Array} Array of source elements
     */
    get sourceElements() {
      if (!this._sourceElementsCache || this._sourceElementsDirty) {
        this._sourceElementsCache = Array.from(this.element.querySelectorAll("source"));
        this._sourceElementsDirty = false;
      }
      return this._sourceElementsCache;
    }
    /**
     * Get cached track elements array
     * @returns {Array} Array of track elements
     */
    get trackElements() {
      if (!this._trackElementsCache || this._trackElementsDirty) {
        this._trackElementsCache = Array.from(this.element.querySelectorAll("track"));
        this._trackElementsDirty = false;
      }
      return this._trackElementsCache;
    }
    /**
     * Invalidate DOM query cache (call when tracks/sources change)
     */
    invalidateTrackCache() {
      this._textTracksDirty = true;
      this._trackElementsDirty = true;
      this._sourceElementsDirty = true;
    }
    /**
     * Find a text track by kind and optionally language
     * @param {string} kind - Track kind (captions, subtitles, descriptions, chapters, metadata)
     * @param {string} [language] - Optional language code
     * @returns {TextTrack|null} Found track or null
     */
    findTextTrack(kind, language = null) {
      const tracks = this.textTracks;
      if (language) {
        return tracks.find((t) => t.kind === kind && t.language === language);
      }
      return tracks.find((t) => t.kind === kind);
    }
    /**
     * Find a source element by attribute
     * @param {string} attribute - Attribute name (e.g., 'data-desc-src')
     * @param {string} [value] - Optional attribute value
     * @returns {Element|null} Found source element or null
     */
    findSourceElement(attribute, value = null) {
      const sources = this.sourceElements;
      if (value) {
        return sources.find((el) => el.getAttribute(attribute) === value);
      }
      return sources.find((el) => el.hasAttribute(attribute));
    }
    /**
     * Find a track element by its associated TextTrack
     * @param {TextTrack} track - The TextTrack object
     * @returns {Element|null} Found track element or null
     */
    findTrackElement(track) {
      return this.trackElements.find((el) => el.track === track);
    }
    /**
     * Convert relative poster path to absolute URL
     * @param {string} posterPath - Poster path (relative or absolute)
     * @returns {string} Absolute URL
     */
    resolvePosterPath(posterPath) {
      if (!posterPath) {
        return posterPath;
      }
      if (posterPath.match(/^(https?:|\/)/)) {
        return posterPath;
      }
      try {
        const posterUrl = new URL(posterPath, window.location.href);
        return posterUrl.href;
      } catch (e) {
        return posterPath;
      }
    }
    showPosterOverlay() {
      if (!this.videoWrapper || this.element.tagName !== "VIDEO") {
        return;
      }
      const poster = this.element.getAttribute("poster") || this.element.poster || this.options.poster;
      if (!poster) {
        return;
      }
      const resolvedPoster = this.resolvePosterPath(poster);
      this.videoWrapper.style.setProperty("--vidply-poster-image", `url("${resolvedPoster}")`);
      this.videoWrapper.classList.add("vidply-forced-poster");
    }
    hidePosterOverlay() {
      if (!this.videoWrapper) {
        return;
      }
      this.videoWrapper.classList.remove("vidply-forced-poster");
      this.videoWrapper.style.removeProperty("--vidply-poster-image");
    }
    /**
     * Set a managed timeout that will be cleaned up on destroy
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setManagedTimeout(callback, delay) {
      const timeoutId = setTimeout(() => {
        this.timeouts.delete(timeoutId);
        callback();
      }, delay);
      this.timeouts.add(timeoutId);
      return timeoutId;
    }
    /**
     * Clear a managed timeout
     * @param {number} timeoutId - Timeout ID to clear
     */
    clearManagedTimeout(timeoutId) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(timeoutId);
      }
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
        const existingTracks = this.trackElements;
        existingTracks.forEach((track) => track.remove());
        this.invalidateTrackCache();
        this.element.src = config.src;
        if (config.type) {
          this.element.type = config.type;
        }
        if (config.poster && this.element.tagName === "VIDEO") {
          this.element.poster = this.resolvePosterPath(config.poster);
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
          this.invalidateTrackCache();
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
        if (this.transcriptManager) {
          const wasVisible = this.transcriptManager.isVisible;
          this.transcriptManager.destroy();
          this.transcriptManager = new TranscriptManager(this);
          if (wasVisible) {
            this.transcriptManager.showTranscript();
          }
        }
        if (this.controlBar) {
          this.updateControlBar();
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
    /**
     * Update control bar to refresh button visibility based on available features
     */
    updateControlBar() {
      if (!this.controlBar) return;
      const controlBar = this.controlBar;
      controlBar.element.innerHTML = "";
      controlBar.createControls();
      controlBar.attachEvents();
      controlBar.setupAutoHide();
    }
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
        if (this.renderer) {
          this.renderer.setMuted(false);
        }
        this.emit("volumechange");
      }
      this.savePlayerPreferences();
    }
    getVolume() {
      return this.state.volume;
    }
    mute() {
      if (this.renderer) {
        this.renderer.setMuted(true);
      }
      this.state.muted = true;
      this.savePlayerPreferences();
      this.emit("volumechange");
    }
    unmute() {
      if (this.renderer) {
        this.renderer.setMuted(false);
      }
      this.state.muted = false;
      this.savePlayerPreferences();
      this.emit("volumechange");
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
      this.savePlayerPreferences();
      this.emit("playbackspeedchange", newSpeed);
    }
    getPlaybackSpeed() {
      return this.state.playbackSpeed;
    }
    // Save player preferences to localStorage
    savePlayerPreferences() {
      this.storage.savePlayerPreferences({
        volume: this.state.volume,
        muted: this.state.muted,
        playbackSpeed: this.state.playbackSpeed
      });
    }
    // Fullscreen
    enterFullscreen() {
      const elem = this.container;
      let fullscreenPromise = null;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
      if (isIOS) {
        this._enablePseudoFullscreen();
        return;
      }
      if (elem.requestFullscreen) {
        fullscreenPromise = elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        fullscreenPromise = elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        fullscreenPromise = elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        fullscreenPromise = elem.msRequestFullscreen();
      }
      if (fullscreenPromise && fullscreenPromise.catch) {
        fullscreenPromise.catch((err) => {
          this.log("Fullscreen API failed, using pseudo-fullscreen:", err.message);
          this._enablePseudoFullscreen();
        });
      }
      if (!elem.requestFullscreen && !elem.webkitRequestFullscreen && !elem.mozRequestFullScreen && !elem.msRequestFullscreen) {
        this._enablePseudoFullscreen();
      } else {
        this.state.fullscreen = true;
        this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
        this.emit("fullscreenchange", true);
      }
    }
    exitFullscreen() {
      const isInNativeFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (isInNativeFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      } else {
        this._disablePseudoFullscreen();
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
    // Pseudo-fullscreen fallback for iOS and browsers without Fullscreen API
    _enablePseudoFullscreen() {
      var _a;
      this.state.fullscreen = true;
      this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
      this._originalBodyOverflow = document.body.style.overflow;
      this._originalBodyPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      this._originalViewport = (_a = document.querySelector('meta[name="viewport"]')) == null ? void 0 : _a.getAttribute("content");
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
      }
      this.emit("fullscreenchange", true);
      this.emit("enterfullscreen");
    }
    _disablePseudoFullscreen() {
      if (this._originalBodyOverflow !== void 0) {
        document.body.style.overflow = this._originalBodyOverflow;
        delete this._originalBodyOverflow;
      }
      if (this._originalBodyPosition !== void 0) {
        document.body.style.position = this._originalBodyPosition;
        delete this._originalBodyPosition;
      }
      if (this._originalViewport !== void 0) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute("content", this._originalViewport);
        }
        delete this._originalViewport;
      }
      this.emit("exitfullscreen");
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
    /**
     * Check if a track file exists
     * @param {string} url - Track file URL
     * @returns {Promise<boolean>} - True if file exists
     */
    async validateTrackExists(url) {
      try {
        const response = await fetch(url, { method: "HEAD", cache: "no-cache" });
        return response.ok;
      } catch (error) {
        return false;
      }
    }
    /**
     * Strip VTT formatting tags from caption text
     * @param {string} text - Caption text with VTT formatting
     * @returns {string} Plain text without formatting
     */
    stripVTTFormatting(text) {
      if (!text) return "";
      return text.replace(/<[^>]+>/g, "").replace(/\n/g, " ").trim().toLowerCase();
    }
    /**
     * Find matching caption time based on text content
     * Useful for syncing between videos of different lengths (e.g., with/without audio description)
     * @param {string} targetText - Caption text to search for
     * @param {Array} tracks - Array of caption tracks to search in
     * @returns {number|null} Start time of matching caption, or null if not found
     */
    findMatchingCaptionTime(targetText, tracks) {
      if (!targetText || !tracks || tracks.length === 0) {
        return null;
      }
      const normalizedTarget = this.stripVTTFormatting(targetText);
      for (const trackInfo of tracks) {
        if (trackInfo.kind !== "captions" && trackInfo.kind !== "subtitles") {
          continue;
        }
        const track = trackInfo.track;
        if (!track || !track.cues) {
          continue;
        }
        for (let i = 0; i < track.cues.length; i++) {
          const cue = track.cues[i];
          const cueText = this.stripVTTFormatting(cue.text);
          if (cueText === normalizedTarget) {
            return cue.startTime;
          }
          const targetWords = normalizedTarget.split(/\s+/).filter((w) => w.length > 2);
          const cueWords = cueText.split(/\s+/).filter((w) => w.length > 2);
          if (targetWords.length > 0 && cueWords.length > 0) {
            const matchingWords = targetWords.filter((word) => cueWords.includes(word));
            const matchRatio = matchingWords.length / targetWords.length;
            if (matchRatio >= 0.8) {
              return cue.startTime;
            }
          }
        }
      }
      return null;
    }
    // Audio Description
    async enableAudioDescription() {
      const hasSourceElementsWithDesc = this.sourceElements.some((el) => el.getAttribute("data-desc-src"));
      const hasTracksWithDesc = this.audioDescriptionCaptionTracks.length > 0;
      if (!this.audioDescriptionSrc && !hasSourceElementsWithDesc && !hasTracksWithDesc) {
        console.warn("VidPly: No audio description source, source elements, or tracks provided");
        return;
      }
      const currentTime = this.element.currentTime;
      const wasPlaying = this.state.playing;
      const shouldKeepPoster = !wasPlaying && currentTime === 0;
      let currentCaptionText = null;
      if (this.captionManager && this.captionManager.currentTrack) {
        const track = this.captionManager.currentTrack.track;
        if (track && track.activeCues && track.activeCues.length > 0) {
          const activeCue = track.activeCues[0];
          currentCaptionText = this.stripVTTFormatting(activeCue.text);
        }
      }
      const posterValue = this.resolvePosterPath(
        this.element.getAttribute("poster") || this.element.poster || this.options.poster
      );
      if (shouldKeepPoster) {
        this.showPosterOverlay();
      }
      let swappedTracksForTranscript = [];
      if (this.audioDescriptionSourceElement) {
        const currentSrc = this.element.currentSrc || this.element.src;
        const sourceElements = this.sourceElements;
        let sourceElementToUpdate = null;
        let descSrc = this.audioDescriptionSrc;
        for (const sourceEl of sourceElements) {
          const sourceSrc = sourceEl.getAttribute("src");
          const descSrcAttr = sourceEl.getAttribute("data-desc-src");
          const sourceFilename = sourceSrc ? sourceSrc.split("/").pop() : "";
          const currentFilename = currentSrc ? currentSrc.split("/").pop() : "";
          if (currentSrc && (currentSrc === sourceSrc || currentSrc.includes(sourceSrc) || currentSrc.includes(sourceFilename) || sourceFilename && currentFilename === sourceFilename)) {
            sourceElementToUpdate = sourceEl;
            if (descSrcAttr) {
              descSrc = descSrcAttr;
            } else if (sourceSrc) {
              descSrc = this.audioDescriptionSrc || descSrc;
            }
            break;
          }
        }
        if (!sourceElementToUpdate) {
          sourceElementToUpdate = this.audioDescriptionSourceElement;
          const storedDescSrc = sourceElementToUpdate.getAttribute("data-desc-src");
          if (storedDescSrc) {
            descSrc = storedDescSrc;
          }
        }
        if (this.audioDescriptionCaptionTracks.length > 0) {
          const validationPromises = this.audioDescriptionCaptionTracks.map(async (trackInfo) => {
            if (trackInfo.trackElement && trackInfo.describedSrc) {
              if (trackInfo.explicit === true) {
                try {
                  const exists = await this.validateTrackExists(trackInfo.describedSrc);
                  return { trackInfo, exists };
                } catch (error) {
                  return { trackInfo, exists: false };
                }
              } else {
                return { trackInfo, exists: false };
              }
            }
            return { trackInfo, exists: false };
          });
          const validationResults = await Promise.all(validationPromises);
          const tracksToSwap = validationResults.filter((result) => result.exists);
          if (tracksToSwap.length > 0) {
            const trackModes = /* @__PURE__ */ new Map();
            tracksToSwap.forEach(({ trackInfo }) => {
              const textTrack = trackInfo.trackElement.track;
              if (textTrack) {
                trackModes.set(trackInfo, {
                  wasShowing: textTrack.mode === "showing",
                  wasHidden: textTrack.mode === "hidden"
                });
              } else {
                trackModes.set(trackInfo, {
                  wasShowing: false,
                  wasHidden: false
                });
              }
            });
            const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
              const oldSrc = trackInfo.trackElement.getAttribute("src");
              const parent = trackInfo.trackElement.parentNode;
              const nextSibling = trackInfo.trackElement.nextSibling;
              const attributes = {};
              Array.from(trackInfo.trackElement.attributes).forEach((attr) => {
                attributes[attr.name] = attr.value;
              });
              return {
                trackInfo,
                oldSrc,
                parent,
                nextSibling,
                attributes
              };
            });
            tracksToReadd.forEach(({ trackInfo }) => {
              trackInfo.trackElement.remove();
            });
            this.element.load();
            await new Promise((resolve) => {
              setTimeout(() => {
                tracksToReadd.forEach(({ trackInfo, oldSrc, parent, nextSibling, attributes }) => {
                  swappedTracksForTranscript.push(trackInfo);
                  const newTrackElement = document.createElement("track");
                  newTrackElement.setAttribute("src", trackInfo.describedSrc);
                  Object.keys(attributes).forEach((attrName) => {
                    if (attrName !== "src" && attrName !== "data-desc-src") {
                      newTrackElement.setAttribute(attrName, attributes[attrName]);
                    }
                  });
                  if (nextSibling && nextSibling.parentNode) {
                    parent.insertBefore(newTrackElement, nextSibling);
                  } else {
                    parent.appendChild(newTrackElement);
                  }
                  trackInfo.trackElement = newTrackElement;
                });
                this.invalidateTrackCache();
                const setupNewTracks = () => {
                  this.setManagedTimeout(() => {
                    swappedTracksForTranscript.forEach((trackInfo) => {
                      const trackElement = trackInfo.trackElement;
                      const newTextTrack = trackElement.track;
                      if (newTextTrack) {
                        const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                        newTextTrack.mode = "hidden";
                        const restoreMode = () => {
                          if (modeInfo.wasShowing) {
                            newTextTrack.mode = "hidden";
                          } else if (modeInfo.wasHidden) {
                            newTextTrack.mode = "hidden";
                          } else {
                            newTextTrack.mode = "disabled";
                          }
                        };
                        if (newTextTrack.readyState >= 2) {
                          restoreMode();
                        } else {
                          newTextTrack.addEventListener("load", restoreMode, { once: true });
                          newTextTrack.addEventListener("error", restoreMode, { once: true });
                        }
                      }
                    });
                  }, 300);
                };
                if (this.element.readyState >= 1) {
                  setTimeout(setupNewTracks, 200);
                } else {
                  this.element.addEventListener("loadedmetadata", setupNewTracks, { once: true });
                  setTimeout(setupNewTracks, 2e3);
                }
                resolve();
              }, 100);
            });
            const skippedCount = validationResults.length - tracksToSwap.length;
          }
        }
        const allSourceElements = this.sourceElements;
        const sourcesToUpdate = [];
        allSourceElements.forEach((sourceEl) => {
          const descSrcAttr = sourceEl.getAttribute("data-desc-src");
          const currentSrc2 = sourceEl.getAttribute("src");
          if (descSrcAttr) {
            const type = sourceEl.getAttribute("type");
            let origSrc = sourceEl.getAttribute("data-orig-src");
            if (!origSrc) {
              origSrc = currentSrc2;
            }
            sourcesToUpdate.push({
              src: descSrcAttr,
              // Use described version
              type,
              origSrc,
              descSrc: descSrcAttr
            });
          } else {
            const type = sourceEl.getAttribute("type");
            const src = sourceEl.getAttribute("src");
            sourcesToUpdate.push({
              src,
              type,
              origSrc: null,
              descSrc: null
            });
          }
        });
        allSourceElements.forEach((sourceEl) => {
          sourceEl.remove();
        });
        sourcesToUpdate.forEach((sourceInfo) => {
          const newSource = document.createElement("source");
          newSource.setAttribute("src", sourceInfo.src);
          if (sourceInfo.type) {
            newSource.setAttribute("type", sourceInfo.type);
          }
          if (sourceInfo.origSrc) {
            newSource.setAttribute("data-orig-src", sourceInfo.origSrc);
          }
          if (sourceInfo.descSrc) {
            newSource.setAttribute("data-desc-src", sourceInfo.descSrc);
          }
          const firstTrack = this.element.querySelector("track");
          if (firstTrack) {
            this.element.insertBefore(newSource, firstTrack);
          } else {
            this.element.appendChild(newSource);
          }
        });
        this._sourceElementsDirty = true;
        this._sourceElementsCache = null;
        if (posterValue && this.element.tagName === "VIDEO") {
          this.element.poster = posterValue;
        }
        this.element.load();
        await new Promise((resolve) => {
          const onLoadedMetadata = () => {
            this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
            resolve();
          };
          if (this.element.readyState >= 1) {
            resolve();
          } else {
            this.element.addEventListener("loadedmetadata", onLoadedMetadata);
          }
        });
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (currentTime > 0 || wasPlaying) {
          await new Promise((resolve) => {
            const onCanPlay = () => {
              this.element.removeEventListener("canplay", onCanPlay);
              this.element.removeEventListener("canplaythrough", onCanPlay);
              resolve();
            };
            if (this.element.readyState >= 3) {
              resolve();
            } else {
              this.element.addEventListener("canplay", onCanPlay, { once: true });
              this.element.addEventListener("canplaythrough", onCanPlay, { once: true });
              setTimeout(() => {
                this.element.removeEventListener("canplay", onCanPlay);
                this.element.removeEventListener("canplaythrough", onCanPlay);
                resolve();
              }, 3e3);
            }
          });
        }
        let syncTime2 = currentTime;
        if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
          if (matchingTime !== null) {
            syncTime2 = matchingTime;
            if (this.options.debug) {
              console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime2}s`);
            }
          }
        }
        if (syncTime2 > 0) {
          this.seek(syncTime2);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (wasPlaying) {
          await this.play();
          this.setManagedTimeout(() => {
            this.hidePosterOverlay();
          }, 100);
        } else {
          this.pause();
          if (!shouldKeepPoster) {
            this.hidePosterOverlay();
          }
        }
        if (!this._audioDescriptionDesiredState) {
          return;
        }
        this.state.audioDescriptionEnabled = true;
        this.emit("audiodescriptionenabled");
      } else {
        if (this.audioDescriptionCaptionTracks.length > 0) {
          const validationPromises = this.audioDescriptionCaptionTracks.map(async (trackInfo) => {
            if (trackInfo.trackElement && trackInfo.describedSrc) {
              if (trackInfo.explicit === true) {
                try {
                  const exists = await this.validateTrackExists(trackInfo.describedSrc);
                  return { trackInfo, exists };
                } catch (error) {
                  return { trackInfo, exists: false };
                }
              } else {
                return { trackInfo, exists: false };
              }
            }
            return { trackInfo, exists: false };
          });
          const validationResults = await Promise.all(validationPromises);
          const tracksToSwap = validationResults.filter((result) => result.exists);
          if (tracksToSwap.length > 0) {
            const trackModes = /* @__PURE__ */ new Map();
            tracksToSwap.forEach(({ trackInfo }) => {
              const textTrack = trackInfo.trackElement.track;
              if (textTrack) {
                trackModes.set(trackInfo, {
                  wasShowing: textTrack.mode === "showing",
                  wasHidden: textTrack.mode === "hidden"
                });
              } else {
                trackModes.set(trackInfo, {
                  wasShowing: false,
                  wasHidden: false
                });
              }
            });
            const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
              const oldSrc = trackInfo.trackElement.getAttribute("src");
              const parent = trackInfo.trackElement.parentNode;
              const nextSibling = trackInfo.trackElement.nextSibling;
              const attributes = {};
              Array.from(trackInfo.trackElement.attributes).forEach((attr) => {
                attributes[attr.name] = attr.value;
              });
              return {
                trackInfo,
                oldSrc,
                parent,
                nextSibling,
                attributes
              };
            });
            tracksToReadd.forEach(({ trackInfo }) => {
              trackInfo.trackElement.remove();
            });
            this.element.load();
            setTimeout(() => {
              tracksToReadd.forEach(({ trackInfo, oldSrc, parent, nextSibling, attributes }) => {
                swappedTracksForTranscript.push(trackInfo);
                const newTrackElement = document.createElement("track");
                newTrackElement.setAttribute("src", trackInfo.describedSrc);
                Object.keys(attributes).forEach((attrName) => {
                  if (attrName !== "src" && attrName !== "data-desc-src") {
                    newTrackElement.setAttribute(attrName, attributes[attrName]);
                  }
                });
                if (nextSibling && nextSibling.parentNode) {
                  parent.insertBefore(newTrackElement, nextSibling);
                } else {
                  parent.appendChild(newTrackElement);
                }
                trackInfo.trackElement = newTrackElement;
              });
              this.element.load();
              const setupNewTracks = () => {
                setTimeout(() => {
                  swappedTracksForTranscript.forEach((trackInfo) => {
                    const trackElement = trackInfo.trackElement;
                    const newTextTrack = trackElement.track;
                    if (newTextTrack) {
                      const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                      newTextTrack.mode = "hidden";
                      const restoreMode = () => {
                        if (modeInfo.wasShowing) {
                          newTextTrack.mode = "hidden";
                        } else if (modeInfo.wasHidden) {
                          newTextTrack.mode = "hidden";
                        } else {
                          newTextTrack.mode = "disabled";
                        }
                      };
                      if (newTextTrack.readyState >= 2) {
                        restoreMode();
                      } else {
                        newTextTrack.addEventListener("load", restoreMode, { once: true });
                        newTextTrack.addEventListener("error", restoreMode, { once: true });
                      }
                    }
                  });
                }, 300);
              };
              if (this.element.readyState >= 1) {
                setTimeout(setupNewTracks, 200);
              } else {
                this.element.addEventListener("loadedmetadata", setupNewTracks, { once: true });
                setTimeout(setupNewTracks, 2e3);
              }
            }, 100);
          }
        }
        const fallbackSourceElements = this.sourceElements;
        const hasSourceElementsWithDesc2 = fallbackSourceElements.some((el) => el.getAttribute("data-desc-src"));
        if (hasSourceElementsWithDesc2) {
          const fallbackSourcesToUpdate = [];
          fallbackSourceElements.forEach((sourceEl) => {
            const descSrcAttr = sourceEl.getAttribute("data-desc-src");
            const currentSrc = sourceEl.getAttribute("src");
            if (descSrcAttr) {
              const type = sourceEl.getAttribute("type");
              let origSrc = sourceEl.getAttribute("data-orig-src");
              if (!origSrc) {
                origSrc = currentSrc;
              }
              fallbackSourcesToUpdate.push({
                src: descSrcAttr,
                type,
                origSrc,
                descSrc: descSrcAttr
              });
            } else {
              const type = sourceEl.getAttribute("type");
              const src = sourceEl.getAttribute("src");
              fallbackSourcesToUpdate.push({
                src,
                type,
                origSrc: null,
                descSrc: null
              });
            }
          });
          fallbackSourceElements.forEach((sourceEl) => {
            sourceEl.remove();
          });
          fallbackSourcesToUpdate.forEach((sourceInfo) => {
            const newSource = document.createElement("source");
            newSource.setAttribute("src", sourceInfo.src);
            if (sourceInfo.type) {
              newSource.setAttribute("type", sourceInfo.type);
            }
            if (sourceInfo.origSrc) {
              newSource.setAttribute("data-orig-src", sourceInfo.origSrc);
            }
            if (sourceInfo.descSrc) {
              newSource.setAttribute("data-desc-src", sourceInfo.descSrc);
            }
            this.element.appendChild(newSource);
          });
          if (posterValue && this.element.tagName === "VIDEO") {
            this.element.poster = posterValue;
          }
          this.element.load();
          this.invalidateTrackCache();
        } else {
          if (posterValue && this.element.tagName === "VIDEO") {
            this.element.poster = posterValue;
          }
          this.element.src = this.audioDescriptionSrc;
        }
      }
      await new Promise((resolve) => {
        const onLoadedMetadata = () => {
          this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        if (this.element.readyState >= 1) {
          resolve();
        } else {
          this.element.addEventListener("loadedmetadata", onLoadedMetadata);
        }
      });
      if (currentTime > 0 || wasPlaying) {
        await new Promise((resolve) => {
          const onCanPlay = () => {
            this.element.removeEventListener("canplay", onCanPlay);
            this.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          };
          if (this.element.readyState >= 3) {
            resolve();
          } else {
            this.element.addEventListener("canplay", onCanPlay, { once: true });
            this.element.addEventListener("canplaythrough", onCanPlay, { once: true });
            setTimeout(() => {
              this.element.removeEventListener("canplay", onCanPlay);
              this.element.removeEventListener("canplaythrough", onCanPlay);
              resolve();
            }, 3e3);
          }
        });
      }
      if (this.element.tagName === "VIDEO" && currentTime === 0 && !wasPlaying) {
        if (this.element.readyState >= 1) {
          this.element.currentTime = 1e-3;
          this.setManagedTimeout(() => {
            this.element.currentTime = 0;
          }, 10);
        }
      }
      let syncTime = currentTime;
      if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
        if (matchingTime !== null) {
          syncTime = matchingTime;
          if (this.options.debug) {
            console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
          }
        }
      }
      if (syncTime > 0) {
        this.seek(syncTime);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (wasPlaying) {
        await this.play();
        this.setManagedTimeout(() => {
          this.hidePosterOverlay();
        }, 100);
      } else {
        this.pause();
        if (!shouldKeepPoster) {
          this.hidePosterOverlay();
        }
      }
      if (swappedTracksForTranscript.length > 0 && this.captionManager) {
        const wasCaptionsEnabled = this.state.captionsEnabled;
        let currentTrackInfo = null;
        if (this.captionManager.currentTrack) {
          const currentTrackIndex = this.captionManager.tracks.findIndex((t) => t.track === this.captionManager.currentTrack.track);
          if (currentTrackIndex >= 0) {
            currentTrackInfo = {
              language: this.captionManager.tracks[currentTrackIndex].language,
              kind: this.captionManager.tracks[currentTrackIndex].kind
            };
          }
        }
        const reloadTracks = () => {
          this.captionManager.tracks = [];
          this.captionManager.loadTracks();
          if (wasCaptionsEnabled && currentTrackInfo && this.captionManager.tracks.length > 0) {
            const matchingTrackIndex = this.captionManager.tracks.findIndex(
              (t) => t.language === currentTrackInfo.language && t.kind === currentTrackInfo.kind
            );
            if (matchingTrackIndex >= 0) {
              const trackToEnable = this.captionManager.tracks[matchingTrackIndex];
              if (trackToEnable.track.readyState >= 2) {
                this.captionManager.enable(matchingTrackIndex);
              } else {
                const onTrackLoad = () => {
                  trackToEnable.track.removeEventListener("load", onTrackLoad);
                  trackToEnable.track.removeEventListener("error", onTrackLoad);
                  if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                    this.captionManager.enable(matchingTrackIndex);
                  }
                };
                trackToEnable.track.addEventListener("load", onTrackLoad, { once: true });
                trackToEnable.track.addEventListener("error", onTrackLoad, { once: true });
                trackToEnable.track.mode = "hidden";
                setTimeout(() => {
                  if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                    this.captionManager.enable(matchingTrackIndex);
                  }
                }, 1e3);
              }
            } else if (this.captionManager.tracks.length > 0) {
              const firstTrack = this.captionManager.tracks[0];
              if (firstTrack.track.readyState >= 2) {
                this.captionManager.enable(0);
              } else {
                const onTrackLoad = () => {
                  firstTrack.track.removeEventListener("load", onTrackLoad);
                  firstTrack.track.removeEventListener("error", onTrackLoad);
                  if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                    this.captionManager.enable(0);
                  }
                };
                firstTrack.track.addEventListener("load", onTrackLoad, { once: true });
                firstTrack.track.addEventListener("error", onTrackLoad, { once: true });
                firstTrack.track.mode = "hidden";
                setTimeout(() => {
                  if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                    this.captionManager.enable(0);
                  }
                }, 1e3);
              }
            }
          }
        };
        setTimeout(reloadTracks, 600);
      }
      if (this.transcriptManager && this.transcriptManager.isVisible) {
        const swappedTracks = typeof swappedTracksForTranscript !== "undefined" ? swappedTracksForTranscript : [];
        if (swappedTracks.length > 0) {
          const onMetadataLoaded = () => {
            this.invalidateTrackCache();
            const allTextTracks = this.textTracks;
            const freshTracks = swappedTracks.map((trackInfo) => {
              const trackEl = trackInfo.trackElement;
              const expectedSrc = trackEl.getAttribute("src");
              const srclang = trackEl.getAttribute("srclang");
              const kind = trackEl.getAttribute("kind");
              let foundTrack = allTextTracks.find((track) => trackEl.track === track);
              if (!foundTrack) {
                foundTrack = allTextTracks.find((track) => {
                  if (track.language === srclang && (track.kind === kind || kind === "captions" && track.kind === "subtitles")) {
                    const trackElementForTrack = this.findTrackElement(track);
                    if (trackElementForTrack) {
                      const actualSrc = trackElementForTrack.getAttribute("src");
                      if (actualSrc === expectedSrc) {
                        return true;
                      }
                    }
                  }
                  return false;
                });
              }
              if (foundTrack) {
                const trackElement = this.findTrackElement(foundTrack);
                if (trackElement && trackElement.getAttribute("src") !== expectedSrc) {
                  return null;
                }
              }
              return foundTrack;
            }).filter(Boolean);
            if (freshTracks.length === 0) {
              this.setManagedTimeout(() => {
                if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                  this.transcriptManager.loadTranscriptData();
                }
              }, 1e3);
              return;
            }
            freshTracks.forEach((track) => {
              if (track.mode === "disabled") {
                track.mode = "hidden";
              }
            });
            let loadedCount = 0;
            const checkLoaded = () => {
              loadedCount++;
              if (loadedCount >= freshTracks.length) {
                this.setManagedTimeout(() => {
                  if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                    this.invalidateTrackCache();
                    const allTextTracks2 = this.textTracks;
                    const swappedTrackSrcs = swappedTracks.map((t) => t.describedSrc);
                    const hasCorrectTracks = freshTracks.some((track) => {
                      const trackEl = this.findTrackElement(track);
                      return trackEl && swappedTrackSrcs.includes(trackEl.getAttribute("src"));
                    });
                    if (hasCorrectTracks || freshTracks.length > 0) {
                      this.transcriptManager.loadTranscriptData();
                    }
                  }
                }, 800);
              }
            };
            freshTracks.forEach((track) => {
              if (track.mode === "disabled") {
                track.mode = "hidden";
              }
              const trackElementForTrack = this.findTrackElement(track);
              const actualSrc = trackElementForTrack ? trackElementForTrack.getAttribute("src") : null;
              const expectedTrackInfo = swappedTracks.find((t) => {
                const tEl = t.trackElement;
                return tEl && (tEl.track === track || tEl.getAttribute("srclang") === track.language && tEl.getAttribute("kind") === track.kind);
              });
              const expectedSrc = expectedTrackInfo ? expectedTrackInfo.describedSrc : null;
              if (expectedSrc && actualSrc && actualSrc !== expectedSrc) {
                checkLoaded();
                return;
              }
              if (track.readyState >= 2 && track.cues && track.cues.length > 0) {
                checkLoaded();
              } else {
                if (track.mode === "disabled") {
                  track.mode = "hidden";
                }
                const onTrackLoad = () => {
                  this.setManagedTimeout(checkLoaded, 300);
                };
                if (track.readyState >= 2) {
                  this.setManagedTimeout(() => {
                    if (track.cues && track.cues.length > 0) {
                      checkLoaded();
                    } else {
                      track.addEventListener("load", onTrackLoad, { once: true });
                    }
                  }, 100);
                } else {
                  track.addEventListener("load", onTrackLoad, { once: true });
                  track.addEventListener("error", () => {
                    checkLoaded();
                  }, { once: true });
                }
              }
            });
          };
          const waitForTracks = () => {
            this.setManagedTimeout(() => {
              if (this.element.readyState >= 1) {
                onMetadataLoaded();
              } else {
                this.element.addEventListener("loadedmetadata", onMetadataLoaded, { once: true });
                this.setManagedTimeout(onMetadataLoaded, 2e3);
              }
            }, 500);
          };
          waitForTracks();
          setTimeout(() => {
            if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
              this.transcriptManager.loadTranscriptData();
            }
          }, 5e3);
        } else {
          setTimeout(() => {
            if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
              this.transcriptManager.loadTranscriptData();
            }
          }, 800);
        }
      }
      if (!shouldKeepPoster) {
        this.hidePosterOverlay();
      }
      if (!this._audioDescriptionDesiredState) {
        return;
      }
      this.state.audioDescriptionEnabled = true;
      this.emit("audiodescriptionenabled");
    }
    async disableAudioDescription() {
      if (!this.originalSrc) {
        return;
      }
      const currentTime = this.element.currentTime;
      const wasPlaying = this.state.playing;
      let currentCaptionText = null;
      if (this.captionManager && this.captionManager.currentTrack) {
        const track = this.captionManager.currentTrack.track;
        if (track && track.activeCues && track.activeCues.length > 0) {
          const activeCue = track.activeCues[0];
          currentCaptionText = this.stripVTTFormatting(activeCue.text);
        }
      }
      const posterValue = this.resolvePosterPath(
        this.element.getAttribute("poster") || this.element.poster || this.options.poster
      );
      let swappedTracksForTranscript = [];
      if (this.audioDescriptionCaptionTracks.length > 0) {
        const tracksToRestore = this.audioDescriptionCaptionTracks.map((trackInfo) => {
          const trackElement = trackInfo.trackElement;
          if (!trackElement || !trackElement.parentNode) {
            return null;
          }
          const parent = trackElement.parentNode;
          const nextSibling = trackElement.nextSibling;
          const attributes = {};
          Array.from(trackElement.attributes).forEach((attr) => {
            attributes[attr.name] = attr.value;
          });
          return {
            trackInfo,
            parent,
            nextSibling,
            attributes
          };
        }).filter(Boolean);
        tracksToRestore.forEach(({ trackInfo }) => {
          if (trackInfo.trackElement && trackInfo.trackElement.parentNode) {
            trackInfo.trackElement.remove();
          }
        });
        this.element.load();
        await new Promise((resolve) => {
          setTimeout(() => {
            tracksToRestore.forEach(({ trackInfo, parent, nextSibling, attributes }) => {
              swappedTracksForTranscript.push(trackInfo);
              const newTrackElement = document.createElement("track");
              newTrackElement.setAttribute("src", trackInfo.originalTrackSrc);
              Object.keys(attributes).forEach((attrName) => {
                if (attrName !== "src" && attrName !== "data-desc-src") {
                  newTrackElement.setAttribute(attrName, attributes[attrName]);
                }
              });
              if (trackInfo.describedSrc) {
                newTrackElement.setAttribute("data-desc-src", trackInfo.describedSrc);
              }
              if (nextSibling && nextSibling.parentNode) {
                parent.insertBefore(newTrackElement, nextSibling);
              } else {
                parent.appendChild(newTrackElement);
              }
              trackInfo.trackElement = newTrackElement;
            });
            this.invalidateTrackCache();
            resolve();
          }, 100);
        });
      }
      const allSourceElements = this.sourceElements;
      const hasSourceElementsToSwap = allSourceElements.some((el) => el.getAttribute("data-orig-src"));
      if (hasSourceElementsToSwap) {
        const sourcesToRestore = [];
        allSourceElements.forEach((sourceEl) => {
          const origSrcAttr = sourceEl.getAttribute("data-orig-src");
          const descSrcAttr = sourceEl.getAttribute("data-desc-src");
          if (origSrcAttr) {
            const type = sourceEl.getAttribute("type");
            sourcesToRestore.push({
              src: origSrcAttr,
              // Use original version
              type,
              origSrc: origSrcAttr,
              descSrc: descSrcAttr
              // Keep data-desc-src for future swaps
            });
          } else {
            const type = sourceEl.getAttribute("type");
            const src = sourceEl.getAttribute("src");
            sourcesToRestore.push({
              src,
              type,
              origSrc: null,
              descSrc: descSrcAttr
            });
          }
        });
        allSourceElements.forEach((sourceEl) => {
          sourceEl.remove();
        });
        sourcesToRestore.forEach((sourceInfo) => {
          const newSource = document.createElement("source");
          newSource.setAttribute("src", sourceInfo.src);
          if (sourceInfo.type) {
            newSource.setAttribute("type", sourceInfo.type);
          }
          if (sourceInfo.origSrc) {
            newSource.setAttribute("data-orig-src", sourceInfo.origSrc);
          }
          if (sourceInfo.descSrc) {
            newSource.setAttribute("data-desc-src", sourceInfo.descSrc);
          }
          const firstTrack = this.element.querySelector("track");
          if (firstTrack) {
            this.element.insertBefore(newSource, firstTrack);
          } else {
            this.element.appendChild(newSource);
          }
        });
        this._sourceElementsDirty = true;
        this._sourceElementsCache = null;
        if (posterValue && this.element.tagName === "VIDEO") {
          this.element.poster = posterValue;
        }
        this.element.load();
      } else {
        if (posterValue && this.element.tagName === "VIDEO") {
          this.element.poster = posterValue;
        }
        const originalSrcToUse = this.originalAudioDescriptionSource || this.originalSrc;
        this.element.src = originalSrcToUse;
        this.element.load();
      }
      await new Promise((resolve) => {
        const onLoadedMetadata = () => {
          this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        if (this.element.readyState >= 1) {
          resolve();
        } else {
          this.element.addEventListener("loadedmetadata", onLoadedMetadata);
        }
      });
      if (currentTime > 0 || wasPlaying) {
        await new Promise((resolve) => {
          const onCanPlay = () => {
            this.element.removeEventListener("canplay", onCanPlay);
            this.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          };
          if (this.element.readyState >= 3) {
            resolve();
          } else {
            this.element.addEventListener("canplay", onCanPlay, { once: true });
            this.element.addEventListener("canplaythrough", onCanPlay, { once: true });
            setTimeout(() => {
              this.element.removeEventListener("canplay", onCanPlay);
              this.element.removeEventListener("canplaythrough", onCanPlay);
              resolve();
            }, 3e3);
          }
        });
      }
      let syncTime = currentTime;
      if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
        if (matchingTime !== null) {
          syncTime = matchingTime;
          if (this.options.debug) {
            console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
          }
        }
      }
      if (syncTime > 0) {
        this.seek(syncTime);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (wasPlaying) {
        await this.play();
        this.hidePosterOverlay();
      } else {
        this.pause();
        if (!wasPlaying && syncTime === 0) {
          this.showPosterOverlay();
        } else {
          this.hidePosterOverlay();
        }
      }
      if (swappedTracksForTranscript.length > 0 && this.captionManager) {
        const wasCaptionsEnabled = this.state.captionsEnabled;
        let currentTrackInfo = null;
        if (this.captionManager.currentTrack) {
          const currentTrackIndex = this.captionManager.tracks.findIndex((t) => t.track === this.captionManager.currentTrack.track);
          if (currentTrackIndex >= 0) {
            currentTrackInfo = {
              language: this.captionManager.tracks[currentTrackIndex].language,
              kind: this.captionManager.tracks[currentTrackIndex].kind
            };
          }
        }
        const reloadTracks = () => {
          this.captionManager.tracks = [];
          this.captionManager.loadTracks();
          if (wasCaptionsEnabled && currentTrackInfo && this.captionManager.tracks.length > 0) {
            const matchingTrackIndex = this.captionManager.tracks.findIndex(
              (t) => t.language === currentTrackInfo.language && t.kind === currentTrackInfo.kind
            );
            if (matchingTrackIndex >= 0) {
              const trackToEnable = this.captionManager.tracks[matchingTrackIndex];
              if (trackToEnable.track.readyState >= 2) {
                this.captionManager.enable(matchingTrackIndex);
              } else {
                const onTrackLoad = () => {
                  trackToEnable.track.removeEventListener("load", onTrackLoad);
                  trackToEnable.track.removeEventListener("error", onTrackLoad);
                  if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                    this.captionManager.enable(matchingTrackIndex);
                  }
                };
                trackToEnable.track.addEventListener("load", onTrackLoad, { once: true });
                trackToEnable.track.addEventListener("error", onTrackLoad, { once: true });
                trackToEnable.track.mode = "hidden";
                setTimeout(() => {
                  if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                    this.captionManager.enable(matchingTrackIndex);
                  }
                }, 1e3);
              }
            } else if (this.captionManager.tracks.length > 0) {
              const firstTrack = this.captionManager.tracks[0];
              if (firstTrack.track.readyState >= 2) {
                this.captionManager.enable(0);
              } else {
                const onTrackLoad = () => {
                  firstTrack.track.removeEventListener("load", onTrackLoad);
                  firstTrack.track.removeEventListener("error", onTrackLoad);
                  if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                    this.captionManager.enable(0);
                  }
                };
                firstTrack.track.addEventListener("load", onTrackLoad, { once: true });
                firstTrack.track.addEventListener("error", onTrackLoad, { once: true });
                firstTrack.track.mode = "hidden";
                setTimeout(() => {
                  if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                    this.captionManager.enable(0);
                  }
                }, 1e3);
              }
            }
          }
        };
        setTimeout(reloadTracks, 600);
      }
      if (this.transcriptManager && this.transcriptManager.isVisible) {
        this.setManagedTimeout(() => {
          if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
            this.transcriptManager.loadTranscriptData();
          }
        }, 500);
      }
      if (this._audioDescriptionDesiredState) {
        return;
      }
      this.state.audioDescriptionEnabled = false;
      this.emit("audiodescriptiondisabled");
    }
    async toggleAudioDescription() {
      const descriptionTrack = this.findTextTrack("descriptions");
      const hasAudioDescriptionSrc = this.audioDescriptionSrc || this.sourceElements.some((el) => el.getAttribute("data-desc-src"));
      if (descriptionTrack && hasAudioDescriptionSrc) {
        if (this.state.audioDescriptionEnabled) {
          this._audioDescriptionDesiredState = false;
          descriptionTrack.mode = "hidden";
          await this.disableAudioDescription();
        } else {
          this._audioDescriptionDesiredState = true;
          await this.enableAudioDescription();
          const enableDescriptionTrack = () => {
            this.invalidateTrackCache();
            const descTrack = this.findTextTrack("descriptions");
            if (descTrack) {
              if (descTrack.mode === "disabled") {
                descTrack.mode = "hidden";
                this.setManagedTimeout(() => {
                  descTrack.mode = "showing";
                }, 50);
              } else {
                descTrack.mode = "showing";
              }
            } else if (this.element.readyState < 2) {
              this.setManagedTimeout(enableDescriptionTrack, 100);
            }
          };
          if (this.element.readyState >= 1) {
            this.setManagedTimeout(enableDescriptionTrack, 200);
          } else {
            this.element.addEventListener("loadedmetadata", () => {
              this.setManagedTimeout(enableDescriptionTrack, 200);
            }, { once: true });
          }
        }
      } else if (descriptionTrack) {
        if (descriptionTrack.mode === "showing") {
          this._audioDescriptionDesiredState = false;
          descriptionTrack.mode = "hidden";
          this.state.audioDescriptionEnabled = false;
          this.emit("audiodescriptiondisabled");
        } else {
          this._audioDescriptionDesiredState = true;
          descriptionTrack.mode = "showing";
          this.state.audioDescriptionEnabled = true;
          this.emit("audiodescriptionenabled");
        }
      } else if (hasAudioDescriptionSrc) {
        if (this.state.audioDescriptionEnabled) {
          this._audioDescriptionDesiredState = false;
          await this.disableAudioDescription();
        } else {
          this._audioDescriptionDesiredState = true;
          await this.enableAudioDescription();
        }
      }
    }
    // Sign Language
    enableSignLanguage() {
      var _a;
      const hasMultipleSources = Object.keys(this.signLanguageSources).length > 0;
      const hasSingleSource = !!this.signLanguageSrc;
      if (!hasMultipleSources && !hasSingleSource) {
        console.warn("No sign language video source provided");
        return;
      }
      if (this.signLanguageWrapper) {
        this.signLanguageWrapper.style.display = "block";
        this.state.signLanguageEnabled = true;
        this.emit("signlanguageenabled");
        this.setManagedTimeout(() => {
          if (this.signLanguageSettingsButton && document.contains(this.signLanguageSettingsButton)) {
            this.signLanguageSettingsButton.focus({ preventScroll: true });
          }
        }, 150);
        return;
      }
      let initialLang = null;
      let initialSrc = null;
      if (hasMultipleSources) {
        if (this.captionManager && this.captionManager.currentTrack) {
          const captionLang = (_a = this.captionManager.currentTrack.language) == null ? void 0 : _a.toLowerCase().split("-")[0];
          if (captionLang && this.signLanguageSources[captionLang]) {
            initialLang = captionLang;
            initialSrc = this.signLanguageSources[captionLang];
          }
        }
        if (!initialLang && this.options.language) {
          const playerLang = this.options.language.toLowerCase().split("-")[0];
          if (this.signLanguageSources[playerLang]) {
            initialLang = playerLang;
            initialSrc = this.signLanguageSources[playerLang];
          }
        }
        if (!initialLang) {
          initialLang = Object.keys(this.signLanguageSources)[0];
          initialSrc = this.signLanguageSources[initialLang];
        }
        this.currentSignLanguage = initialLang;
      } else {
        initialSrc = this.signLanguageSrc;
      }
      this.signLanguageWrapper = document.createElement("div");
      this.signLanguageWrapper.className = "vidply-sign-language-wrapper";
      this.signLanguageWrapper.setAttribute("tabindex", "0");
      this.signLanguageWrapper.setAttribute("aria-label", i18n.t("player.signLanguageDragResize"));
      this.signLanguageHeader = DOMUtils.createElement("div", {
        className: `${this.options.classPrefix}-sign-language-header`,
        attributes: {
          "tabindex": "0"
        }
      });
      const headerLeft = DOMUtils.createElement("div", {
        className: `${this.options.classPrefix}-sign-language-header-left`
      });
      const title = DOMUtils.createElement("h3", {
        textContent: i18n.t("player.signLanguageVideo")
      });
      this.signLanguageSettingsButton = DOMUtils.createElement("button", {
        className: `${this.options.classPrefix}-sign-language-settings`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.signLanguageSettings"),
          "aria-expanded": "false"
        }
      });
      this.signLanguageSettingsButton.appendChild(createIconElement("settings"));
      this.signLanguageSettingsHandlers = {
        settingsClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.signLanguageDocumentClickHandler) {
            const wasJustOpened = this.signLanguageSettingsMenuJustOpened;
            this.signLanguageSettingsMenuJustOpened = true;
            setTimeout(() => {
              this.signLanguageSettingsMenuJustOpened = wasJustOpened;
            }, 100);
          }
          if (this.signLanguageSettingsMenuVisible) {
            this.hideSignLanguageSettingsMenu();
          } else {
            this.showSignLanguageSettingsMenu();
          }
        },
        settingsKeydown: (e) => {
          if (e.key === "d" || e.key === "D") {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSignLanguageKeyboardDragMode();
          } else if (e.key === "r" || e.key === "R") {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSignLanguageResizeMode();
          } else if (e.key === "Escape" && this.signLanguageSettingsMenuVisible) {
            e.preventDefault();
            e.stopPropagation();
            this.hideSignLanguageSettingsMenu();
          }
        }
      };
      this.signLanguageSettingsButton.addEventListener("click", this.signLanguageSettingsHandlers.settingsClick);
      this.signLanguageSettingsButton.addEventListener("keydown", this.signLanguageSettingsHandlers.settingsKeydown);
      headerLeft.appendChild(this.signLanguageSettingsButton);
      this.signLanguageSelector = null;
      if (hasMultipleSources) {
        const selectId = `${this.options.classPrefix}-sign-language-select-${Date.now()}`;
        const options = Object.keys(this.signLanguageSources).map((langCode) => ({
          value: langCode,
          text: this.getSignLanguageLabel(langCode),
          selected: langCode === initialLang
        }));
        const { label: signLanguageLabel, select: signLanguageSelector } = createLabeledSelect({
          classPrefix: this.options.classPrefix,
          labelClass: `${this.options.classPrefix}-sign-language-label`,
          selectClass: `${this.options.classPrefix}-sign-language-select`,
          labelText: "settings.language",
          selectId,
          options,
          onChange: (e) => {
            e.stopPropagation();
            const selectedLang = e.target.value;
            this.switchSignLanguage(selectedLang);
          }
        });
        this.signLanguageSelector = signLanguageSelector;
        preventDragOnElement(signLanguageLabel);
        preventDragOnElement(this.signLanguageSelector);
        headerLeft.appendChild(signLanguageLabel);
        headerLeft.appendChild(this.signLanguageSelector);
      }
      headerLeft.appendChild(title);
      const closeButton = DOMUtils.createElement("button", {
        className: `${this.options.classPrefix}-sign-language-close`,
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.closeSignLanguage")
        }
      });
      closeButton.appendChild(createIconElement("close"));
      closeButton.addEventListener("click", () => {
        this.disableSignLanguage();
        if (this.controlBar && this.controlBar.controls && this.controlBar.controls.signLanguage) {
          setTimeout(() => {
            this.controlBar.controls.signLanguage.focus();
          }, 0);
        }
      });
      this.signLanguageHeader.appendChild(headerLeft);
      this.signLanguageHeader.appendChild(closeButton);
      this.signLanguageSettingsMenuVisible = false;
      this.signLanguageSettingsMenu = null;
      this.signLanguageSettingsMenuJustOpened = false;
      this.signLanguageResizeOptionButton = null;
      this.signLanguageResizeOptionText = null;
      this.signLanguageDragOptionButton = null;
      this.signLanguageDragOptionText = null;
      this.signLanguageDocumentClickHandler = null;
      this.signLanguageDocumentClickHandlerAdded = false;
      this.signLanguageVideo = document.createElement("video");
      this.signLanguageVideo.className = "vidply-sign-language-video";
      this.signLanguageVideo.src = initialSrc;
      this.signLanguageVideo.setAttribute("aria-label", i18n.t("player.signLanguage"));
      this.signLanguageVideo.muted = true;
      this.signLanguageVideo.setAttribute("playsinline", "");
      this.signLanguageResizeHandles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((dir) => {
        const handle = DOMUtils.createElement("div", {
          className: `${this.options.classPrefix}-sign-resize-handle ${this.options.classPrefix}-sign-resize-${dir}`,
          attributes: {
            "data-direction": dir,
            "data-vidply-managed-resize": "true",
            "aria-hidden": "true"
          }
        });
        handle.style.display = "none";
        return handle;
      });
      this.signLanguageWrapper.appendChild(this.signLanguageHeader);
      this.signLanguageWrapper.appendChild(this.signLanguageVideo);
      this.signLanguageResizeHandles.forEach((handle) => this.signLanguageWrapper.appendChild(handle));
      const saved = this.storage.getSignLanguagePreferences();
      if (saved && saved.size && saved.size.width) {
        this.signLanguageWrapper.style.width = saved.size.width;
      } else {
        this.signLanguageWrapper.style.width = "280px";
      }
      this.signLanguageWrapper.style.height = "auto";
      this.signLanguageDesiredPosition = this.options.signLanguagePosition || "bottom-right";
      this.container.appendChild(this.signLanguageWrapper);
      requestAnimationFrame(() => {
        this.constrainSignLanguagePosition();
      });
      this.signLanguageVideo.currentTime = this.state.currentTime;
      if (!this.state.paused) {
        this.signLanguageVideo.play();
      }
      this.setupSignLanguageInteraction();
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
      if (hasMultipleSources) {
        this.signLanguageHandlers.captionChange = () => {
          var _a2;
          if (this.captionManager && this.captionManager.currentTrack && this.signLanguageSelector) {
            const captionLang = (_a2 = this.captionManager.currentTrack.language) == null ? void 0 : _a2.toLowerCase().split("-")[0];
            if (captionLang && this.signLanguageSources[captionLang] && this.currentSignLanguage !== captionLang) {
              this.switchSignLanguage(captionLang);
              this.signLanguageSelector.value = captionLang;
            }
          }
        };
        this.on("captionsenabled", this.signLanguageHandlers.captionChange);
      }
      this.state.signLanguageEnabled = true;
      this.emit("signlanguageenabled");
      this.setManagedTimeout(() => {
        if (this.signLanguageSettingsButton && document.contains(this.signLanguageSettingsButton)) {
          this.signLanguageSettingsButton.focus({ preventScroll: true });
        }
      }, 150);
    }
    disableSignLanguage() {
      if (this.signLanguageSettingsMenuVisible) {
        this.hideSignLanguageSettingsMenu({ focusButton: false });
      }
      if (this.signLanguageWrapper) {
        this.signLanguageWrapper.style.display = "none";
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
    setupSignLanguageInteraction() {
      if (!this.signLanguageWrapper) return;
      const isMobile2 = window.innerWidth < 768;
      const isFullscreen = this.state.fullscreen;
      if (isMobile2 && !isFullscreen) {
        if (this.signLanguageDraggable) {
          this.signLanguageDraggable.destroy();
          this.signLanguageDraggable = null;
        }
        return;
      }
      if (this.signLanguageDraggable) {
        return;
      }
      this.signLanguageDraggable = new DraggableResizable(this.signLanguageWrapper, {
        dragHandle: this.signLanguageHeader,
        resizeHandles: this.signLanguageResizeHandles,
        constrainToViewport: true,
        maintainAspectRatio: true,
        minWidth: 150,
        minHeight: 100,
        classPrefix: `${this.options.classPrefix}-sign`,
        keyboardDragKey: "d",
        keyboardResizeKey: "r",
        keyboardStep: 10,
        keyboardStepLarge: 50,
        pointerResizeIndicatorText: i18n.t("player.signLanguageResizeActive"),
        onPointerResizeToggle: (enabled) => {
          this.signLanguageResizeHandles.forEach((handle) => {
            handle.style.display = enabled ? "block" : "none";
          });
        },
        onDragStart: (e) => {
          if (e.target.closest(`.${this.options.classPrefix}-sign-language-close`) || e.target.closest(`.${this.options.classPrefix}-sign-language-settings`) || e.target.closest(`.${this.options.classPrefix}-sign-language-select`) || e.target.closest(`.${this.options.classPrefix}-sign-language-label`) || e.target.closest(`.${this.options.classPrefix}-sign-language-settings-menu`)) {
            return false;
          }
          return true;
        }
      });
      this.signLanguageCustomKeyHandler = (e) => {
        const key = e.key.toLowerCase();
        if (this.signLanguageSettingsMenuVisible) {
          return;
        }
        if (key === "home") {
          e.preventDefault();
          e.stopPropagation();
          if (this.signLanguageDraggable) {
            if (this.signLanguageDraggable.pointerResizeMode) {
              this.signLanguageDraggable.disablePointerResizeMode();
            }
            this.signLanguageDraggable.manuallyPositioned = false;
            this.constrainSignLanguagePosition();
          }
          return;
        }
        if (key === "r") {
          e.preventDefault();
          e.stopPropagation();
          const enabled = this.toggleSignLanguageResizeMode();
          if (enabled) {
            this.signLanguageWrapper.focus();
          }
          return;
        }
        if (key === "escape") {
          e.preventDefault();
          e.stopPropagation();
          if (this.signLanguageDraggable && this.signLanguageDraggable.pointerResizeMode) {
            this.signLanguageDraggable.disablePointerResizeMode();
            return;
          }
          if (this.signLanguageDraggable && this.signLanguageDraggable.keyboardDragMode) {
            this.signLanguageDraggable.disableKeyboardDragMode();
            return;
          }
          this.disableSignLanguage();
          if (this.controlBar && this.controlBar.controls && this.controlBar.controls.signLanguage) {
            setTimeout(() => {
              this.controlBar.controls.signLanguage.focus();
            }, 0);
          }
          return;
        }
      };
      this.signLanguageWrapper.addEventListener("keydown", this.signLanguageCustomKeyHandler);
      this.signLanguageInteractionHandlers = {
        draggable: this.signLanguageDraggable,
        headerKeyHandler: this.signLanguageHeaderKeyHandler,
        customKeyHandler: this.signLanguageCustomKeyHandler
      };
    }
    toggleSignLanguageKeyboardDragMode() {
      if (this.signLanguageDraggable) {
        const wasEnabled = this.signLanguageDraggable.keyboardDragMode;
        this.signLanguageDraggable.toggleKeyboardDragMode();
        const isEnabled = this.signLanguageDraggable.keyboardDragMode;
        if (!wasEnabled && isEnabled) {
          this.enableSignLanguageMoveMode();
        }
        this.updateSignLanguageDragOptionState();
      }
    }
    enableSignLanguageMoveMode() {
      this.signLanguageWrapper.classList.add(`${this.options.classPrefix}-sign-move-mode`);
      this.updateSignLanguageResizeOptionState();
      setTimeout(() => {
        this.signLanguageWrapper.classList.remove(`${this.options.classPrefix}-sign-move-mode`);
      }, 2e3);
    }
    toggleSignLanguageResizeMode({ focus = true } = {}) {
      if (!this.signLanguageDraggable) {
        return false;
      }
      if (this.signLanguageDraggable.pointerResizeMode) {
        this.signLanguageDraggable.disablePointerResizeMode({ focus });
        this.updateSignLanguageResizeOptionState();
        return false;
      }
      this.signLanguageDraggable.enablePointerResizeMode({ focus });
      this.updateSignLanguageResizeOptionState();
      return true;
    }
    getSignLanguageLabel(langCode) {
      const langNames = {
        "en": "English",
        "de": "Deutsch",
        "es": "Espa\xF1ol",
        "fr": "Fran\xE7ais",
        "it": "Italiano",
        "ja": "\u65E5\u672C\u8A9E",
        "pt": "Portugu\xEAs",
        "ar": "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
        "hi": "\u0939\u093F\u0928\u094D\u0926\u0940"
      };
      return langNames[langCode] || langCode.toUpperCase();
    }
    switchSignLanguage(langCode) {
      if (!this.signLanguageSources[langCode] || !this.signLanguageVideo) {
        return;
      }
      const currentTime = this.signLanguageVideo.currentTime;
      const wasPlaying = !this.signLanguageVideo.paused;
      this.signLanguageVideo.src = this.signLanguageSources[langCode];
      this.currentSignLanguage = langCode;
      this.signLanguageVideo.currentTime = currentTime;
      if (wasPlaying) {
        this.signLanguageVideo.play().catch(() => {
        });
      }
      this.emit("signlanguagelanguagechanged", langCode);
    }
    showSignLanguageSettingsMenu() {
      this.signLanguageSettingsMenuJustOpened = true;
      setTimeout(() => {
        this.signLanguageSettingsMenuJustOpened = false;
      }, 350);
      if (!this.signLanguageDocumentClickHandlerAdded) {
        this.signLanguageDocumentClickHandler = (e) => {
          if (this.signLanguageSettingsMenuJustOpened) {
            return;
          }
          if (this.signLanguageSettingsButton && (this.signLanguageSettingsButton === e.target || this.signLanguageSettingsButton.contains(e.target))) {
            return;
          }
          if (this.signLanguageSettingsMenu && this.signLanguageSettingsMenu.contains(e.target)) {
            return;
          }
          if (this.signLanguageSettingsMenuVisible) {
            this.hideSignLanguageSettingsMenu();
          }
        };
        setTimeout(() => {
          document.addEventListener("mousedown", this.signLanguageDocumentClickHandler, true);
          this.signLanguageDocumentClickHandlerAdded = true;
        }, 300);
      }
      if (this.signLanguageSettingsMenu) {
        this.signLanguageSettingsMenu.style.display = "block";
        this.signLanguageSettingsMenuVisible = true;
        if (this.signLanguageSettingsButton) {
          this.signLanguageSettingsButton.setAttribute("aria-expanded", "true");
        }
        this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
          this.signLanguageSettingsMenu,
          this.signLanguageSettingsButton,
          `.${this.options.classPrefix}-sign-language-settings-item`,
          () => this.hideSignLanguageSettingsMenu({ focusButton: true })
        );
        this.positionSignLanguageSettingsMenu();
        this.updateSignLanguageDragOptionState();
        this.updateSignLanguageResizeOptionState();
        focusFirstMenuItem(this.signLanguageSettingsMenu, `.${this.options.classPrefix}-sign-language-settings-item`);
        return;
      }
      this.signLanguageSettingsMenu = DOMUtils.createElement("div", {
        className: `${this.options.classPrefix}-sign-language-settings-menu`,
        attributes: {
          "role": "menu"
        }
      });
      const keyboardDragOption = createMenuItem({
        classPrefix: this.options.classPrefix,
        itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
        icon: "move",
        label: "player.enableSignDragMode",
        hasTextClass: true,
        onClick: () => {
          this.toggleSignLanguageKeyboardDragMode();
          this.hideSignLanguageSettingsMenu();
        }
      });
      keyboardDragOption.setAttribute("role", "switch");
      keyboardDragOption.setAttribute("aria-checked", "false");
      this.signLanguageDragOptionButton = keyboardDragOption;
      this.signLanguageDragOptionText = keyboardDragOption.querySelector(`.${this.options.classPrefix}-settings-text`);
      this.updateSignLanguageDragOptionState();
      const resizeOption = createMenuItem({
        classPrefix: this.options.classPrefix,
        itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
        icon: "resize",
        label: "player.enableSignResizeMode",
        hasTextClass: true,
        onClick: (event) => {
          event.preventDefault();
          event.stopPropagation();
          const enabled = this.toggleSignLanguageResizeMode({ focus: false });
          if (enabled) {
            this.hideSignLanguageSettingsMenu({ focusButton: false });
            setTimeout(() => {
              if (this.signLanguageWrapper) {
                this.signLanguageWrapper.focus();
              }
            }, 20);
          } else {
            this.hideSignLanguageSettingsMenu({ focusButton: true });
          }
        }
      });
      resizeOption.setAttribute("role", "switch");
      resizeOption.setAttribute("aria-checked", "false");
      this.signLanguageResizeOptionButton = resizeOption;
      this.signLanguageResizeOptionText = resizeOption.querySelector(`.${this.options.classPrefix}-settings-text`);
      this.updateSignLanguageResizeOptionState();
      const closeOption = createMenuItem({
        classPrefix: this.options.classPrefix,
        itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
        icon: "close",
        label: "transcript.closeMenu",
        onClick: () => {
          this.hideSignLanguageSettingsMenu();
        }
      });
      this.signLanguageSettingsMenu.appendChild(keyboardDragOption);
      this.signLanguageSettingsMenu.appendChild(resizeOption);
      this.signLanguageSettingsMenu.appendChild(closeOption);
      this.signLanguageSettingsMenu.style.visibility = "hidden";
      this.signLanguageSettingsMenu.style.display = "block";
      if (this.signLanguageSettingsButton && this.signLanguageSettingsButton.parentNode) {
        this.signLanguageSettingsButton.insertAdjacentElement("afterend", this.signLanguageSettingsMenu);
      } else if (this.signLanguageWrapper) {
        this.signLanguageWrapper.appendChild(this.signLanguageSettingsMenu);
      }
      this.positionSignLanguageSettingsMenuImmediate();
      requestAnimationFrame(() => {
        if (this.signLanguageSettingsMenu) {
          this.signLanguageSettingsMenu.style.visibility = "visible";
        }
      });
      this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
        this.signLanguageSettingsMenu,
        this.signLanguageSettingsButton,
        `.${this.options.classPrefix}-sign-language-settings-item`,
        () => this.hideSignLanguageSettingsMenu({ focusButton: true })
      );
      this.signLanguageSettingsMenuVisible = true;
      if (this.signLanguageSettingsButton) {
        this.signLanguageSettingsButton.setAttribute("aria-expanded", "true");
      }
      this.updateSignLanguageDragOptionState();
      this.updateSignLanguageResizeOptionState();
      focusFirstMenuItem(this.signLanguageSettingsMenu, `.${this.options.classPrefix}-sign-language-settings-item`);
    }
    hideSignLanguageSettingsMenu({ focusButton = true } = {}) {
      if (this.signLanguageSettingsMenu) {
        this.signLanguageSettingsMenu.style.display = "none";
        this.signLanguageSettingsMenuVisible = false;
        this.signLanguageSettingsMenuJustOpened = false;
        if (this.signLanguageSettingsMenuKeyHandler) {
          this.signLanguageSettingsMenu.removeEventListener("keydown", this.signLanguageSettingsMenuKeyHandler);
          this.signLanguageSettingsMenuKeyHandler = null;
        }
        const menuItems = Array.from(this.signLanguageSettingsMenu.querySelectorAll(`.${this.options.classPrefix}-sign-language-settings-item`));
        menuItems.forEach((item) => {
          item.setAttribute("tabindex", "-1");
        });
        if (this.signLanguageSettingsButton) {
          this.signLanguageSettingsButton.setAttribute("aria-expanded", "false");
          if (focusButton) {
            this.signLanguageSettingsButton.focus();
          }
        }
      }
    }
    positionSignLanguageSettingsMenuImmediate() {
      if (!this.signLanguageSettingsMenu || !this.signLanguageSettingsButton) return;
      const buttonRect = this.signLanguageSettingsButton.getBoundingClientRect();
      const menuRect = this.signLanguageSettingsMenu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const parentContainer = this.signLanguageSettingsButton.parentElement;
      if (!parentContainer) return;
      const parentRect = parentContainer.getBoundingClientRect();
      const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
      const buttonBottom = buttonRect.bottom - parentRect.top;
      const buttonTop = buttonRect.top - parentRect.top;
      const spaceAbove = buttonRect.top;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      let menuTop = buttonBottom + 8;
      let menuBottom = null;
      if (spaceBelow < menuRect.height + 20 && spaceAbove > spaceBelow) {
        menuTop = null;
        const parentHeight = parentRect.bottom - parentRect.top;
        menuBottom = parentHeight - buttonTop + 8;
        this.signLanguageSettingsMenu.classList.add("vidply-menu-above");
      } else {
        this.signLanguageSettingsMenu.classList.remove("vidply-menu-above");
      }
      let menuLeft = buttonCenterX - menuRect.width / 2;
      let menuRight = "auto";
      let transformX = "translateX(0)";
      const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
      if (menuLeftAbsolute < 10) {
        menuLeft = 0;
        transformX = "translateX(0)";
      } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
        menuLeft = "auto";
        menuRight = 0;
        transformX = "translateX(0)";
      } else {
        menuLeft = buttonCenterX;
        transformX = "translateX(-50%)";
      }
      if (menuTop !== null) {
        this.signLanguageSettingsMenu.style.top = `${menuTop}px`;
        this.signLanguageSettingsMenu.style.bottom = "auto";
      } else if (menuBottom !== null) {
        this.signLanguageSettingsMenu.style.top = "auto";
        this.signLanguageSettingsMenu.style.bottom = `${menuBottom}px`;
      }
      if (menuLeft !== "auto") {
        this.signLanguageSettingsMenu.style.left = `${menuLeft}px`;
        this.signLanguageSettingsMenu.style.right = "auto";
      } else {
        this.signLanguageSettingsMenu.style.left = "auto";
        this.signLanguageSettingsMenu.style.right = `${menuRight}px`;
      }
      this.signLanguageSettingsMenu.style.transform = transformX;
    }
    positionSignLanguageSettingsMenu() {
      if (!this.signLanguageSettingsMenu || !this.signLanguageSettingsButton || !this.signLanguageWrapper) return;
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.positionSignLanguageSettingsMenuImmediate();
        }, 10);
      });
    }
    attachSignLanguageSettingsMenuKeyboardNavigation() {
      if (!this.signLanguageSettingsMenu) return;
      if (this.signLanguageSettingsMenuKeyHandler) {
        this.signLanguageSettingsMenu.removeEventListener("keydown", this.signLanguageSettingsMenuKeyHandler);
      }
      this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
        this.signLanguageSettingsMenu,
        this.signLanguageSettingsButton,
        `.${this.options.classPrefix}-sign-language-settings-item`,
        () => this.hideSignLanguageSettingsMenu({ focusButton: true })
      );
    }
    updateSignLanguageDragOptionState() {
      if (!this.signLanguageDragOptionButton) {
        return;
      }
      const isEnabled = !!(this.signLanguageDraggable && this.signLanguageDraggable.keyboardDragMode);
      const text = isEnabled ? i18n.t("player.disableSignDragMode") : i18n.t("player.enableSignDragMode");
      const ariaLabel = isEnabled ? i18n.t("player.disableSignDragModeAria") : i18n.t("player.enableSignDragModeAria");
      this.signLanguageDragOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
      this.signLanguageDragOptionButton.setAttribute("aria-label", ariaLabel);
      this.signLanguageDragOptionButton.setAttribute("title", text);
      if (this.signLanguageDragOptionText) {
        this.signLanguageDragOptionText.textContent = text;
      }
    }
    updateSignLanguageResizeOptionState() {
      if (!this.signLanguageResizeOptionButton) {
        return;
      }
      const isEnabled = !!(this.signLanguageDraggable && this.signLanguageDraggable.pointerResizeMode);
      const text = isEnabled ? i18n.t("player.disableSignResizeMode") : i18n.t("player.enableSignResizeMode");
      const ariaLabel = isEnabled ? i18n.t("player.disableSignResizeModeAria") : i18n.t("player.enableSignResizeModeAria");
      this.signLanguageResizeOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
      this.signLanguageResizeOptionButton.setAttribute("aria-label", ariaLabel);
      this.signLanguageResizeOptionButton.setAttribute("title", text);
      if (this.signLanguageResizeOptionText) {
        this.signLanguageResizeOptionText.textContent = text;
      }
    }
    constrainSignLanguagePosition() {
      if (!this.signLanguageWrapper || !this.videoWrapper) return;
      if (this.signLanguageDraggable && this.signLanguageDraggable.manuallyPositioned) {
        return;
      }
      if (!this.signLanguageWrapper.style.width || this.signLanguageWrapper.style.width === "") {
        this.signLanguageWrapper.style.width = "280px";
      }
      const videoWrapperRect = this.videoWrapper.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      const wrapperRect = this.signLanguageWrapper.getBoundingClientRect();
      const videoWrapperLeft = videoWrapperRect.left - containerRect.left;
      const videoWrapperTop = videoWrapperRect.top - containerRect.top;
      const videoWrapperWidth = videoWrapperRect.width;
      const videoWrapperHeight = videoWrapperRect.height;
      let wrapperWidth = wrapperRect.width || 280;
      let wrapperHeight = wrapperRect.height || 280 * 9 / 16;
      let left, top;
      const margin = 16;
      const controlsHeight = 95;
      const position = this.signLanguageDesiredPosition || "bottom-right";
      switch (position) {
        case "bottom-right":
          left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
          top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
          break;
        case "bottom-left":
          left = videoWrapperLeft + margin;
          top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
          break;
        case "top-right":
          left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
          top = videoWrapperTop + margin;
          break;
        case "top-left":
          left = videoWrapperLeft + margin;
          top = videoWrapperTop + margin;
          break;
        default:
          left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
          top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
      }
      left = Math.max(videoWrapperLeft, Math.min(left, videoWrapperLeft + videoWrapperWidth - wrapperWidth));
      top = Math.max(videoWrapperTop, Math.min(top, videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight));
      this.signLanguageWrapper.style.left = `${left}px`;
      this.signLanguageWrapper.style.top = `${top}px`;
      this.signLanguageWrapper.style.right = "auto";
      this.signLanguageWrapper.style.bottom = "auto";
      this.signLanguageWrapper.classList.remove(...Array.from(this.signLanguageWrapper.classList).filter((c) => c.startsWith("vidply-sign-position-")));
    }
    saveSignLanguagePreferences() {
      if (!this.signLanguageWrapper) return;
      this.storage.saveSignLanguagePreferences({
        size: {
          width: this.signLanguageWrapper.style.width
          // Height is auto - maintained by aspect ratio
        }
      });
    }
    cleanupSignLanguage() {
      if (this.signLanguageSettingsMenuVisible) {
        this.hideSignLanguageSettingsMenu({ focusButton: false });
      }
      if (this.signLanguageDocumentClickHandler && this.signLanguageDocumentClickHandlerAdded) {
        document.removeEventListener("mousedown", this.signLanguageDocumentClickHandler, true);
        this.signLanguageDocumentClickHandlerAdded = false;
        this.signLanguageDocumentClickHandler = null;
      }
      if (this.signLanguageSettingsHandlers) {
        if (this.signLanguageSettingsButton) {
          this.signLanguageSettingsButton.removeEventListener("click", this.signLanguageSettingsHandlers.settingsClick);
          this.signLanguageSettingsButton.removeEventListener("keydown", this.signLanguageSettingsHandlers.settingsKeydown);
        }
        this.signLanguageSettingsHandlers = null;
      }
      if (this.signLanguageHandlers) {
        this.off("play", this.signLanguageHandlers.play);
        this.off("pause", this.signLanguageHandlers.pause);
        this.off("timeupdate", this.signLanguageHandlers.timeupdate);
        this.off("ratechange", this.signLanguageHandlers.ratechange);
        if (this.signLanguageHandlers.captionChange) {
          this.off("captionsenabled", this.signLanguageHandlers.captionChange);
        }
        this.signLanguageHandlers = null;
      }
      if (this.signLanguageInteractionHandlers) {
        if (this.signLanguageHeader && this.signLanguageInteractionHandlers.headerKeyHandler) {
          this.signLanguageHeader.removeEventListener("keydown", this.signLanguageInteractionHandlers.headerKeyHandler);
        }
        if (this.signLanguageWrapper && this.signLanguageInteractionHandlers.customKeyHandler) {
          this.signLanguageWrapper.removeEventListener("keydown", this.signLanguageInteractionHandlers.customKeyHandler);
        }
      }
      if (this.signLanguageDraggable) {
        if (this.signLanguageDraggable.pointerResizeMode) {
          this.signLanguageDraggable.disablePointerResizeMode();
        }
        this.signLanguageDraggable.destroy();
        this.signLanguageDraggable = null;
      }
      this.signLanguageInteractionHandlers = null;
      if (this.signLanguageWrapper && this.signLanguageWrapper.parentNode) {
        if (this.signLanguageVideo) {
          this.signLanguageVideo.pause();
          this.signLanguageVideo.src = "";
        }
        this.signLanguageWrapper.parentNode.removeChild(this.signLanguageWrapper);
      }
      this.signLanguageWrapper = null;
      this.signLanguageVideo = null;
      this.signLanguageSettingsButton = null;
      this.signLanguageSettingsMenu = null;
    }
    // Settings
    // Settings dialog removed - using individual control buttons instead
    showSettings() {
      console.warn("[VidPly] Settings dialog has been removed. Use individual control buttons (speed, captions, etc.)");
    }
    hideSettings() {
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
    log(...messages) {
      if (!this.options.debug) {
        return;
      }
      let type = "log";
      if (messages.length > 0) {
        const potentialType = messages[messages.length - 1];
        if (typeof potentialType === "string" && console[potentialType]) {
          type = potentialType;
          messages = messages.slice(0, -1);
        }
      }
      if (messages.length === 0) {
        messages = [""];
      }
      if (typeof console[type] === "function") {
        console[type]("[VidPly]", ...messages);
      } else {
        console.log("[VidPly]", ...messages);
      }
    }
    // Setup responsive handlers
    setupResponsiveHandlers() {
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const width = entry.contentRect.width;
            if (this.controlBar && typeof this.controlBar.updateControlsForViewport === "function") {
              this.controlBar.updateControlsForViewport(width);
            }
            if (this.transcriptManager && this.transcriptManager.isVisible) {
              this.transcriptManager.positionTranscript();
            }
          }
        });
        this.resizeObserver.observe(this.container);
      } else {
        this.resizeHandler = () => {
          const width = this.container.clientWidth;
          if (this.controlBar && typeof this.controlBar.updateControlsForViewport === "function") {
            this.controlBar.updateControlsForViewport(width);
          }
          if (this.transcriptManager && this.transcriptManager.isVisible) {
            if (!this.transcriptManager.draggableResizable || !this.transcriptManager.draggableResizable.manuallyPositioned) {
              this.transcriptManager.positionTranscript();
            }
          }
        };
        window.addEventListener("resize", this.resizeHandler);
      }
      if (window.matchMedia) {
        this.orientationHandler = (e) => {
          setTimeout(() => {
            if (this.transcriptManager && this.transcriptManager.isVisible) {
              if (!this.transcriptManager.draggableResizable || !this.transcriptManager.draggableResizable.manuallyPositioned) {
                this.transcriptManager.positionTranscript();
              }
            }
          }, 100);
        };
        const orientationQuery = window.matchMedia("(orientation: portrait)");
        if (orientationQuery.addEventListener) {
          orientationQuery.addEventListener("change", this.orientationHandler);
        } else if (orientationQuery.addListener) {
          orientationQuery.addListener(this.orientationHandler);
        }
        this.orientationQuery = orientationQuery;
      }
      this.fullscreenChangeHandler = () => {
        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        if (this.state.fullscreen !== isFullscreen) {
          this.state.fullscreen = isFullscreen;
          if (isFullscreen) {
            this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
          } else {
            this.container.classList.remove(`${this.options.classPrefix}-fullscreen`);
            this._disablePseudoFullscreen();
          }
          this.emit("fullscreenchange", isFullscreen);
          if (this.controlBar) {
            this.controlBar.updateFullscreenButton();
          }
          if (this.signLanguageWrapper && this.signLanguageWrapper.style.display !== "none") {
            const isMobile2 = window.innerWidth < 768;
            if (isMobile2) {
              this.setupSignLanguageInteraction();
            }
            this.setManagedTimeout(() => {
              requestAnimationFrame(() => {
                this.storage.saveSignLanguagePreferences({ size: null });
                this.signLanguageDesiredPosition = "bottom-right";
                this.signLanguageWrapper.style.width = isFullscreen ? "400px" : "280px";
                this.constrainSignLanguagePosition();
              });
            }, 500);
          }
        }
      };
      document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
      document.addEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);
      document.addEventListener("mozfullscreenchange", this.fullscreenChangeHandler);
      document.addEventListener("MSFullscreenChange", this.fullscreenChangeHandler);
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
      if (this.transcriptManager) {
        this.transcriptManager.destroy();
      }
      this.cleanupSignLanguage();
      if (this.playButtonOverlay && this.playButtonOverlay.parentNode) {
        this.playButtonOverlay.remove();
        this.playButtonOverlay = null;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.resizeHandler) {
        window.removeEventListener("resize", this.resizeHandler);
        this.resizeHandler = null;
      }
      if (this.orientationQuery && this.orientationHandler) {
        if (this.orientationQuery.removeEventListener) {
          this.orientationQuery.removeEventListener("change", this.orientationHandler);
        } else if (this.orientationQuery.removeListener) {
          this.orientationQuery.removeListener(this.orientationHandler);
        }
        this.orientationQuery = null;
        this.orientationHandler = null;
      }
      if (this.fullscreenChangeHandler) {
        document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler);
        document.removeEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);
        document.removeEventListener("mozfullscreenchange", this.fullscreenChangeHandler);
        document.removeEventListener("MSFullscreenChange", this.fullscreenChangeHandler);
        this.fullscreenChangeHandler = null;
      }
      this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      this.timeouts.clear();
      if (this.metadataCueChangeHandler) {
        const textTracks = this.textTracks;
        const metadataTrack = textTracks.find((track) => track.kind === "metadata");
        if (metadataTrack) {
          metadataTrack.removeEventListener("cuechange", this.metadataCueChangeHandler);
        }
        this.metadataCueChangeHandler = null;
      }
      if (this.metadataAlertHandlers && this.metadataAlertHandlers.size > 0) {
        this.metadataAlertHandlers.forEach(({ button, handler }) => {
          if (button && handler) {
            button.removeEventListener("click", handler);
          }
        });
        this.metadataAlertHandlers.clear();
      }
      if (this.container && this.container.parentNode) {
        this.container.parentNode.insertBefore(this.element, this.container);
        this.container.parentNode.removeChild(this.container);
      }
      this.removeAllListeners();
    }
    /**
     * Setup metadata track handling
     * This enables metadata tracks and listens for cue changes to trigger actions
     */
    setupMetadataHandling() {
      const setupMetadata = () => {
        const textTracks = this.textTracks;
        const metadataTrack = textTracks.find((track) => track.kind === "metadata");
        if (metadataTrack) {
          if (metadataTrack.mode === "disabled") {
            metadataTrack.mode = "hidden";
          }
          if (this.metadataCueChangeHandler) {
            metadataTrack.removeEventListener("cuechange", this.metadataCueChangeHandler);
          }
          this.metadataCueChangeHandler = () => {
            const activeCues = Array.from(metadataTrack.activeCues || []);
            if (activeCues.length > 0) {
              if (this.options.debug) {
                this.log("[Metadata] Active cues:", activeCues.map((c) => ({
                  start: c.startTime,
                  end: c.endTime,
                  text: c.text
                })));
              }
            }
            activeCues.forEach((cue) => {
              this.handleMetadataCue(cue);
            });
          };
          metadataTrack.addEventListener("cuechange", this.metadataCueChangeHandler);
          if (this.options.debug) {
            const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
            this.log("[Metadata] Track enabled,", cueCount, "cues available");
          }
        } else if (this.options.debug) {
          this.log("[Metadata] No metadata track found");
        }
      };
      setupMetadata();
      this.on("loadedmetadata", setupMetadata);
    }
    normalizeMetadataSelector(selector) {
      if (!selector) {
        return null;
      }
      const trimmed = selector.trim();
      if (!trimmed) {
        return null;
      }
      if (trimmed.startsWith("#") || trimmed.startsWith(".") || trimmed.startsWith("[")) {
        return trimmed;
      }
      return `#${trimmed}`;
    }
    resolveMetadataConfig(map, key) {
      if (!map || !key) {
        return null;
      }
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        return map[key];
      }
      const withoutHash = key.replace(/^#/, "");
      if (Object.prototype.hasOwnProperty.call(map, withoutHash)) {
        return map[withoutHash];
      }
      return null;
    }
    cacheMetadataAlertContent(element, config = {}) {
      if (!element) {
        return;
      }
      const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
      const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
      const titleEl = element.querySelector(titleSelector);
      if (titleEl && !titleEl.dataset.vidplyAlertTitleOriginal) {
        titleEl.dataset.vidplyAlertTitleOriginal = titleEl.textContent.trim();
      }
      const messageEl = element.querySelector(messageSelector);
      if (messageEl && !messageEl.dataset.vidplyAlertMessageOriginal) {
        messageEl.dataset.vidplyAlertMessageOriginal = messageEl.textContent.trim();
      }
    }
    restoreMetadataAlertContent(element, config = {}) {
      if (!element) {
        return;
      }
      const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
      const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
      const titleEl = element.querySelector(titleSelector);
      if (titleEl && titleEl.dataset.vidplyAlertTitleOriginal) {
        titleEl.textContent = titleEl.dataset.vidplyAlertTitleOriginal;
      }
      const messageEl = element.querySelector(messageSelector);
      if (messageEl && messageEl.dataset.vidplyAlertMessageOriginal) {
        messageEl.textContent = messageEl.dataset.vidplyAlertMessageOriginal;
      }
    }
    focusMetadataTarget(target, fallbackElement = null) {
      var _a, _b;
      if (!target || target === "none") {
        return;
      }
      if (target === "alert" && fallbackElement) {
        fallbackElement.focus();
        return;
      }
      if (target === "player") {
        if (this.container) {
          this.container.focus();
        }
        return;
      }
      if (target === "media") {
        this.element.focus();
        return;
      }
      if (target === "playButton") {
        const playButton = (_b = (_a = this.controlBar) == null ? void 0 : _a.controls) == null ? void 0 : _b.playPause;
        if (playButton) {
          playButton.focus();
        }
        return;
      }
      if (typeof target === "string") {
        const targetElement = document.querySelector(target);
        if (targetElement) {
          if (targetElement.tabIndex === -1 && !targetElement.hasAttribute("tabindex")) {
            targetElement.setAttribute("tabindex", "-1");
          }
          targetElement.focus();
        }
      }
    }
    handleMetadataAlert(selector, options = {}) {
      if (!selector) {
        return;
      }
      const config = this.resolveMetadataConfig(this.options.metadataAlerts, selector) || {};
      const element = options.element || document.querySelector(selector);
      if (!element) {
        if (this.options.debug) {
          this.log("[Metadata] Alert element not found:", selector);
        }
        return;
      }
      if (this.options.debug) {
        this.log("[Metadata] Handling alert", selector, { reason: options.reason, config });
      }
      this.cacheMetadataAlertContent(element, config);
      if (!element.dataset.vidplyAlertOriginalDisplay) {
        element.dataset.vidplyAlertOriginalDisplay = element.style.display || "";
      }
      if (!element.dataset.vidplyAlertDisplay) {
        element.dataset.vidplyAlertDisplay = config.display || "block";
      }
      const shouldShow = options.show !== void 0 ? options.show : config.show !== false;
      if (shouldShow) {
        const displayValue = config.display || element.dataset.vidplyAlertDisplay || "block";
        element.style.display = displayValue;
        element.hidden = false;
        element.removeAttribute("hidden");
        element.setAttribute("aria-hidden", "false");
        element.setAttribute("data-vidply-alert-active", "true");
      }
      const shouldReset = config.resetContent !== false && options.reason === "focus";
      if (shouldReset) {
        this.restoreMetadataAlertContent(element, config);
      }
      const shouldFocus = options.focus !== void 0 ? options.focus : config.focusOnShow ?? options.reason !== "focus";
      if (shouldShow && shouldFocus) {
        if (element.tabIndex === -1 && !element.hasAttribute("tabindex")) {
          element.setAttribute("tabindex", "-1");
        }
        element.focus();
      }
      if (shouldShow && config.autoScroll !== false && options.autoScroll !== false) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      const continueSelector = config.continueButton;
      if (continueSelector) {
        let continueButton = null;
        if (continueSelector === "self") {
          continueButton = element;
        } else if (element.matches(continueSelector)) {
          continueButton = element;
        } else {
          continueButton = element.querySelector(continueSelector) || document.querySelector(continueSelector);
        }
        if (continueButton && !this.metadataAlertHandlers.has(selector)) {
          const handler = () => {
            const hideOnContinue = config.hideOnContinue !== false;
            if (hideOnContinue) {
              const originalDisplay = element.dataset.vidplyAlertOriginalDisplay || "";
              element.style.display = config.hideDisplay || originalDisplay || "none";
              element.setAttribute("aria-hidden", "true");
              element.removeAttribute("data-vidply-alert-active");
            }
            if (config.resume !== false && this.state.paused) {
              this.play();
            }
            const focusTarget = config.focusTarget || "playButton";
            this.setManagedTimeout(() => {
              this.focusMetadataTarget(focusTarget, element);
            }, config.focusDelay ?? 100);
          };
          continueButton.addEventListener("click", handler);
          this.metadataAlertHandlers.set(selector, { button: continueButton, handler });
        }
      }
      return element;
    }
    handleMetadataHashtags(hashtags) {
      if (!Array.isArray(hashtags) || hashtags.length === 0) {
        return;
      }
      const configMap = this.options.metadataHashtags;
      if (!configMap) {
        return;
      }
      hashtags.forEach((tag) => {
        const config = this.resolveMetadataConfig(configMap, tag);
        if (!config) {
          return;
        }
        const selector = this.normalizeMetadataSelector(config.alert || config.selector || config.target);
        if (!selector) {
          return;
        }
        const element = document.querySelector(selector);
        if (!element) {
          if (this.options.debug) {
            this.log("[Metadata] Hashtag target not found:", selector);
          }
          return;
        }
        if (this.options.debug) {
          this.log("[Metadata] Handling hashtag", tag, { selector, config });
        }
        this.cacheMetadataAlertContent(element, config);
        if (config.title) {
          const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
          const titleEl = element.querySelector(titleSelector);
          if (titleEl) {
            titleEl.textContent = config.title;
          }
        }
        if (config.message) {
          const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
          const messageEl = element.querySelector(messageSelector);
          if (messageEl) {
            messageEl.textContent = config.message;
          }
        }
        const show = config.show !== false;
        const focus = config.focus !== void 0 ? config.focus : false;
        this.handleMetadataAlert(selector, {
          element,
          show,
          focus,
          autoScroll: config.autoScroll,
          reason: "hashtag"
        });
      });
    }
    /**
     * Handle individual metadata cues
     * Parses metadata text and emits events or triggers actions
     */
    handleMetadataCue(cue) {
      const text = cue.text.trim();
      if (this.options.debug) {
        this.log("[Metadata] Processing cue:", {
          time: cue.startTime,
          text
        });
      }
      this.emit("metadata", {
        time: cue.startTime,
        endTime: cue.endTime,
        text,
        cue
      });
      if (text.includes("PAUSE")) {
        if (!this.state.paused) {
          if (this.options.debug) {
            this.log("[Metadata] Pausing video at", cue.startTime);
          }
          this.pause();
        }
        this.emit("metadata:pause", { time: cue.startTime, text });
      }
      const focusMatch = text.match(/FOCUS:([\w#-]+)/);
      if (focusMatch) {
        const targetSelector = focusMatch[1];
        const normalizedSelector = this.normalizeMetadataSelector(targetSelector);
        const targetElement = normalizedSelector ? document.querySelector(normalizedSelector) : null;
        if (targetElement) {
          if (this.options.debug) {
            this.log("[Metadata] Focusing element:", normalizedSelector);
          }
          if (targetElement.tabIndex === -1 && !targetElement.hasAttribute("tabindex")) {
            targetElement.setAttribute("tabindex", "-1");
          }
          this.setManagedTimeout(() => {
            targetElement.focus();
            targetElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 10);
        } else if (this.options.debug) {
          this.log("[Metadata] Element not found:", normalizedSelector || targetSelector);
        }
        this.emit("metadata:focus", {
          time: cue.startTime,
          target: targetSelector,
          selector: normalizedSelector,
          element: targetElement,
          text
        });
        if (normalizedSelector) {
          this.handleMetadataAlert(normalizedSelector, {
            element: targetElement,
            reason: "focus"
          });
        }
      }
      const hashtags = text.match(/#[\w-]+/g);
      if (hashtags) {
        if (this.options.debug) {
          this.log("[Metadata] Hashtags found:", hashtags);
        }
        this.emit("metadata:hashtags", {
          time: cue.startTime,
          hashtags,
          text
        });
        this.handleMetadataHashtags(hashtags);
      }
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
        autoPlayFirst: options.autoPlayFirst !== false,
        // Default true - auto-play first track on load
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
      this.player.playlistManager = this;
      this.init();
      this.updatePlayerControls();
    }
    init() {
      this.player.on("ended", this.handleTrackEnd);
      this.player.on("error", this.handleTrackError);
      if (this.options.showPanel) {
        this.createUI();
      }
    }
    /**
     * Update player controls to add playlist navigation buttons
     */
    updatePlayerControls() {
      if (!this.player.controlBar) return;
      const controlBar = this.player.controlBar;
      controlBar.element.innerHTML = "";
      controlBar.createControls();
      controlBar.attachEvents();
      controlBar.setupAutoHide();
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
        if (this.options.autoPlayFirst) {
          this.play(0);
        } else {
          this.loadTrack(0);
        }
      }
    }
    /**
     * Load a track without playing
     * @param {number} index - Track index
     */
    loadTrack(index) {
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
    }
    /**
     * Play a specific track
     * @param {number} index - Track index
     * @param {boolean} userInitiated - Whether this was triggered by user action (default: false)
     */
    play(index, userInitiated = false) {
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
      if (userInitiated && this.player.container) {
        this.player.container.focus();
      }
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
        className: "vidply-track-info",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true"
      });
      this.trackInfoElement.style.display = "none";
      this.container.appendChild(this.trackInfoElement);
      this.playlistPanel = DOMUtils.createElement("div", {
        className: "vidply-playlist-panel",
        role: "region",
        "aria-label": "Media playlist"
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
      const trackTitle = track.title || "Untitled";
      const trackArtist = track.artist || "";
      const announcement = `Now playing: Track ${trackNumber} of ${totalTracks}. ${trackTitle}${trackArtist ? " by " + trackArtist : ""}`;
      this.trackInfoElement.innerHTML = `
      <span class="vidply-sr-only">${DOMUtils.escapeHTML(announcement)}</span>
      <div class="vidply-track-number" aria-hidden="true">Track ${trackNumber} of ${totalTracks}</div>
      <div class="vidply-track-title" aria-hidden="true">${DOMUtils.escapeHTML(trackTitle)}</div>
      ${trackArtist ? `<div class="vidply-track-artist" aria-hidden="true">${DOMUtils.escapeHTML(trackArtist)}</div>` : ""}
    `;
      this.trackInfoElement.style.display = "block";
    }
    /**
     * Render playlist
     */
    renderPlaylist() {
      if (!this.playlistPanel) return;
      this.playlistPanel.innerHTML = "";
      const header = DOMUtils.createElement("h2", {
        className: "vidply-playlist-header",
        id: "vidply-playlist-heading"
      });
      header.textContent = `Playlist (${this.tracks.length})`;
      this.playlistPanel.appendChild(header);
      const instructions = DOMUtils.createElement("div", {
        className: "vidply-sr-only",
        "aria-hidden": "false"
      });
      instructions.textContent = "Use arrow keys to navigate between tracks. Press Enter or Space to play a track. Press Home or End to jump to first or last track.";
      this.playlistPanel.appendChild(instructions);
      const list = DOMUtils.createElement("ul", {
        className: "vidply-playlist-list",
        "aria-labelledby": "vidply-playlist-heading",
        "aria-describedby": "vidply-playlist-instructions"
      });
      const listDescription = DOMUtils.createElement("div", {
        className: "vidply-sr-only",
        id: "vidply-playlist-instructions"
      });
      listDescription.textContent = `Playlist with ${this.tracks.length} ${this.tracks.length === 1 ? "track" : "tracks"}`;
      this.playlistPanel.appendChild(listDescription);
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
      const trackPosition = `Track ${index + 1} of ${this.tracks.length}`;
      const trackTitle = track.title || `Track ${index + 1}`;
      const trackArtist = track.artist ? ` by ${track.artist}` : "";
      const isActive = index === this.currentIndex;
      const statusText = isActive ? "Currently playing" : "Not playing";
      const actionText = isActive ? "Press Enter to restart" : "Press Enter to play";
      const item = DOMUtils.createElement("li", {
        className: "vidply-playlist-item",
        tabIndex: index === 0 ? 0 : -1,
        // Only first item is in tab order initially
        "aria-label": `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`,
        "aria-posinset": index + 1,
        "aria-setsize": this.tracks.length,
        "data-playlist-index": index
      });
      if (isActive) {
        item.classList.add("vidply-playlist-item-active");
        item.setAttribute("aria-current", "true");
        item.setAttribute("tabIndex", "0");
      }
      const positionInfo = DOMUtils.createElement("span", {
        className: "vidply-sr-only"
      });
      positionInfo.textContent = `${trackPosition}: `;
      item.appendChild(positionInfo);
      const thumbnail = DOMUtils.createElement("div", {
        className: "vidply-playlist-thumbnail",
        "aria-hidden": "true"
      });
      if (track.poster) {
        thumbnail.style.backgroundImage = `url(${track.poster})`;
        thumbnail.setAttribute("role", "img");
        thumbnail.setAttribute("aria-label", `${trackTitle} thumbnail`);
      } else {
        const icon = createIconElement("music");
        icon.classList.add("vidply-playlist-thumbnail-icon");
        thumbnail.appendChild(icon);
      }
      item.appendChild(thumbnail);
      const info = DOMUtils.createElement("div", {
        className: "vidply-playlist-item-info",
        "aria-hidden": "true"
      });
      const title = DOMUtils.createElement("div", {
        className: "vidply-playlist-item-title"
      });
      title.textContent = trackTitle;
      info.appendChild(title);
      if (track.artist) {
        const artist = DOMUtils.createElement("div", {
          className: "vidply-playlist-item-artist"
        });
        artist.textContent = track.artist;
        info.appendChild(artist);
      }
      item.appendChild(info);
      if (isActive) {
        const statusIndicator = DOMUtils.createElement("span", {
          className: "vidply-sr-only"
        });
        statusIndicator.textContent = " (Currently playing)";
        item.appendChild(statusIndicator);
      }
      const playIcon = createIconElement("play");
      playIcon.classList.add("vidply-playlist-item-icon");
      playIcon.setAttribute("aria-hidden", "true");
      item.appendChild(playIcon);
      item.addEventListener("click", () => {
        this.play(index, true);
      });
      item.addEventListener("keydown", (e) => {
        this.handlePlaylistItemKeydown(e, index);
      });
      return item;
    }
    /**
     * Handle keyboard navigation in playlist items
     */
    handlePlaylistItemKeydown(e, index) {
      const items = Array.from(this.playlistPanel.querySelectorAll(".vidply-playlist-item"));
      let newIndex = -1;
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          this.play(index, true);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (index < items.length - 1) {
            newIndex = index + 1;
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (index > 0) {
            newIndex = index - 1;
          }
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = items.length - 1;
          break;
      }
      if (newIndex !== -1 && newIndex !== index) {
        items[index].setAttribute("tabIndex", "-1");
        items[newIndex].setAttribute("tabIndex", "0");
        items[newIndex].focus();
      }
    }
    /**
     * Update playlist UI (highlight current track)
     */
    updatePlaylistUI() {
      if (!this.playlistPanel) return;
      const items = this.playlistPanel.querySelectorAll(".vidply-playlist-item");
      items.forEach((item, index) => {
        const track = this.tracks[index];
        const trackPosition = `Track ${index + 1} of ${this.tracks.length}`;
        const trackTitle = track.title || `Track ${index + 1}`;
        const trackArtist = track.artist ? ` by ${track.artist}` : "";
        if (index === this.currentIndex) {
          item.classList.add("vidply-playlist-item-active");
          item.setAttribute("aria-current", "true");
          item.setAttribute("tabIndex", "0");
          const statusText = "Currently playing";
          const actionText = "Press Enter to restart";
          item.setAttribute("aria-label", `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`);
          item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          item.classList.remove("vidply-playlist-item-active");
          item.removeAttribute("aria-current");
          item.setAttribute("tabIndex", "-1");
          const statusText = "Not playing";
          const actionText = "Press Enter to play";
          item.setAttribute("aria-label", `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`);
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
        hasNext: this.hasNext(),
        hasPrevious: this.hasPrevious()
      };
    }
    /**
     * Check if there is a next track
     */
    hasNext() {
      if (this.options.loop) return true;
      return this.currentIndex < this.tracks.length - 1;
    }
    /**
     * Check if there is a previous track
     */
    hasPrevious() {
      if (this.options.loop) return true;
      return this.currentIndex > 0;
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
      const dataOptions = parseDataAttributes(element.dataset);
      const mergedOptions = { ...dataOptions, ...options };
      new Player(element, mergedOptions);
    });
  }
  function parseDataAttributes(dataset) {
    const options = {};
    const attributeMap = {
      // Sign Language
      "signLanguageSrc": "signLanguageSrc",
      "signLanguageButton": "signLanguageButton",
      "signLanguagePosition": "signLanguagePosition",
      // Audio Description
      "audioDescriptionSrc": "audioDescriptionSrc",
      "audioDescriptionButton": "audioDescriptionButton",
      // Other common options
      "autoplay": "autoplay",
      "loop": "loop",
      "muted": "muted",
      "controls": "controls",
      "poster": "poster",
      "width": "width",
      "height": "height",
      "language": "language",
      "captions": "captions",
      "captionsDefault": "captionsDefault",
      "transcript": "transcript",
      "transcriptButton": "transcriptButton",
      "keyboard": "keyboard",
      "responsive": "responsive",
      "pipButton": "pipButton",
      "fullscreenButton": "fullscreenButton"
    };
    Object.keys(attributeMap).forEach((dataKey) => {
      const optionKey = attributeMap[dataKey];
      const value = dataset[dataKey];
      if (value !== void 0) {
        if (value === "true") {
          options[optionKey] = true;
        } else if (value === "false") {
          options[optionKey] = false;
        } else if (!isNaN(value) && value !== "") {
          options[optionKey] = Number(value);
        } else {
          options[optionKey] = value;
        }
      }
    });
    const signLanguageSources = {};
    Object.keys(dataset).forEach((key) => {
      if (key.startsWith("signLanguageSrc") && key !== "signLanguageSrc") {
        const langMatch = key.match(/^signLanguageSrc([A-Z][a-z]*)$/);
        if (langMatch) {
          const langCode = langMatch[1].toLowerCase();
          signLanguageSources[langCode] = dataset[key];
        }
      }
    });
    if (Object.keys(signLanguageSources).length > 0) {
      options.signLanguageSources = signLanguageSources;
      if (dataset.signLanguageSrc && !options.signLanguageSrc) {
        options.signLanguageSrc = dataset.signLanguageSrc;
      }
    }
    if (dataset.vidplyLanguageFiles) {
      try {
        options.languageFiles = JSON.parse(dataset.vidplyLanguageFiles);
      } catch (e) {
        console.warn("Invalid JSON in data-vidply-language-files:", e);
      }
    }
    if (dataset.vidplyLanguageFile) {
      try {
        const parsed = JSON.parse(dataset.vidplyLanguageFile);
        if (typeof parsed === "object" && parsed !== null) {
          options.languageFiles = parsed;
        }
      } catch (e) {
        if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
          options.languageFile = dataset.vidplyLanguageFileCode;
          options.languageFileUrl = dataset.vidplyLanguageFileUrl;
        }
      }
    } else if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
      options.languageFile = dataset.vidplyLanguageFileCode;
      options.languageFileUrl = dataset.vidplyLanguageFileUrl;
    }
    return options;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePlayers);
  } else {
    initializePlayers();
  }
  var index_default = Player;
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=vidply.js.map
