/*!
 * VidPly v1.2.13 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  StorageManager,
  deriveTrackLabel
} from "./vidply.chunk-2BW3KV5P.js";
import {
  debounce,
  isMobile,
  rafWithTimeout,
  reducedMotionScrollOptions
} from "./vidply.chunk-SP2E252G.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-IRBLODYO.js";

// src/controls/CaptionManager.ts
var CaptionManager = class {
  player;
  _altCueChangeHandler = null;
  cueChangeHandler = null;
  currentCue;
  currentTrack;
  debouncedPositionCaptions;
  element;
  storage;
  tracks;
  constructor(player) {
    this.player = player;
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
      if (typeof saved.fontSize === "string") this.player.options.captionsFontSize = saved.fontSize;
      if (typeof saved.fontFamily === "string") this.player.options.captionsFontFamily = saved.fontFamily;
      if (typeof saved.color === "string") this.player.options.captionsColor = saved.color;
      if (typeof saved.backgroundColor === "string") this.player.options.captionsBackgroundColor = saved.backgroundColor;
      if (typeof saved.opacity === "number") this.player.options.captionsOpacity = saved.opacity;
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
        "aria-label": i18n.t("player.captions"),
        "aria-live": "polite"
      }
    });
    this.updateStyles();
    const target = this.player.videoWrapper || this.player.container;
    target.appendChild(this.element);
  }
  loadTracks() {
    const textTracks = this.player.element.textTracks;
    let defaultTrackIndex = -1;
    const seen = /* @__PURE__ */ new Map();
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (!track) continue;
      if ((track.kind === "subtitles" || track.kind === "captions") && !track._vidplyStale) {
        track.mode = "hidden";
        const dedupeKey = `${track.language}|${track.label}`;
        const existing = seen.get(dedupeKey);
        if (existing) {
          existing.alternatives.push(track);
          continue;
        }
        const trackElement = this.player.findTrackElement(track);
        const isDefault = trackElement ? trackElement.hasAttribute("default") : false;
        const entry = {
          track,
          language: track.language,
          label: deriveTrackLabel(track.label, track.language),
          kind: track.kind,
          index: i,
          isDefault,
          alternatives: []
        };
        this.tracks.push(entry);
        seen.set(dedupeKey, entry);
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
  /**
   * Sync hls.js subtitle rendition to match the given language.
   * Matches by lang, language, or falls back to name/label.
   */
  _syncHlsSubtitleTrack(targetLang, targetLabel) {
    const renderer = this.player.renderer;
    if (!renderer?.hls || !renderer.hls.subtitleTracks?.length) return;
    const tracks = renderer.hls.subtitleTracks;
    const normalizedTarget = targetLang.trim();
    let hlsIndex = normalizedTarget !== "" ? tracks.findIndex((t) => {
      const tLang = (t.lang || t.language || "").trim();
      return tLang === normalizedTarget || tLang !== "" && (tLang.startsWith(normalizedTarget) || normalizedTarget.startsWith(tLang));
    }) : -1;
    if (hlsIndex < 0 && targetLabel) {
      hlsIndex = tracks.findIndex(
        (t) => t.name === targetLabel
      );
    }
    if (hlsIndex < 0 && tracks.length > 0) {
      const defaultIndex = tracks.findIndex((t) => t.default);
      hlsIndex = defaultIndex >= 0 ? defaultIndex : 0;
    }
    if (hlsIndex >= 0 && renderer.hls.subtitleTrack !== hlsIndex) {
      renderer.hls.subtitleTrack = hlsIndex;
      this.player.log(`HLS subtitle track set to index ${hlsIndex} (${targetLang || targetLabel || "default"})`, "info");
    }
  }
  attachEvents() {
    this.player.on("timeupdate", () => {
      this.updateCaptions();
    });
    this.player.on("textcuesupdate", () => {
      this.updateCaptions();
    });
    this.player.on("captionschange", () => {
      this.updateStyles();
    });
    this.debouncedPositionCaptions = debounce(() => {
      this.positionCaptionsOnMobile();
    }, 150);
    window.addEventListener("resize", this.debouncedPositionCaptions, {
      signal: this.player.lifecycleSignal
    });
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
    this._cleanupTrackListeners();
    const selectedTrack = this.tracks[trackIndex];
    if (selectedTrack && selectedTrack.track) {
      selectedTrack.track.mode = "hidden";
      this.currentTrack = selectedTrack;
      this.player.state.captionsEnabled = true;
      if (selectedTrack.language) {
        this.element.setAttribute("lang", selectedTrack.language);
      }
      const cueChangeHandler = () => {
        this.updateCaptions();
      };
      this.cueChangeHandler = cueChangeHandler;
      selectedTrack.track.addEventListener("cuechange", cueChangeHandler);
      if (selectedTrack.alternatives && selectedTrack.alternatives.length > 0) {
        const altCueChangeHandler = () => {
          if (this.currentTrack !== selectedTrack) return;
          for (const alt of selectedTrack.alternatives) {
            if (alt.activeCues && alt.activeCues.length > 0) {
              this.player.log(`Switching to alternative caption track for "${selectedTrack.label}"`, "info");
              selectedTrack.track.removeEventListener("cuechange", cueChangeHandler);
              selectedTrack.alternatives.forEach((a) => a.removeEventListener("cuechange", altCueChangeHandler));
              selectedTrack.track = alt;
              selectedTrack.track.addEventListener("cuechange", cueChangeHandler);
              this._altCueChangeHandler = null;
              this.updateCaptions();
              return;
            }
          }
        };
        this._altCueChangeHandler = altCueChangeHandler;
        selectedTrack.alternatives.forEach((alt) => {
          alt.mode = "hidden";
          alt.addEventListener("cuechange", altCueChangeHandler);
        });
      }
      const trackElement = this.player.findTrackElement(selectedTrack.track);
      const ensureTrackReady = () => {
        if (trackElement && trackElement.readyState < 2) {
          const onTrackLoad = () => {
            trackElement.removeEventListener("load", onTrackLoad);
            trackElement.removeEventListener("error", onTrackLoad);
            requestAnimationFrame(() => {
              if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                this.updateCaptions();
              }
            });
          };
          trackElement.addEventListener("load", onTrackLoad, { once: true });
          trackElement.addEventListener("error", onTrackLoad, { once: true });
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
      this._syncHlsSubtitleTrack(selectedTrack.language, selectedTrack.label);
      this.player.emit("captionsenabled", selectedTrack);
    }
  }
  _cleanupTrackListeners() {
    if (this.currentTrack && this.currentTrack.track) {
      const cueChangeHandler = this.cueChangeHandler;
      if (cueChangeHandler) {
        this.currentTrack.track.removeEventListener("cuechange", cueChangeHandler);
      }
      const altCueChangeHandler = this._altCueChangeHandler;
      if (altCueChangeHandler && this.currentTrack.alternatives) {
        this.currentTrack.alternatives.forEach((alt) => {
          alt.removeEventListener("cuechange", altCueChangeHandler);
        });
      }
      this.currentTrack.track.mode = "hidden";
    }
    this._altCueChangeHandler = null;
  }
  disable() {
    this._cleanupTrackListeners();
    this.currentTrack = null;
    this.element.style.display = "none";
    this.element.replaceChildren();
    this.element.removeAttribute("lang");
    this.currentCue = null;
    this.player.state.captionsEnabled = false;
    this.player.emit("captionsdisabled");
  }
  updateCaptions() {
    if (!this.currentTrack || !this.currentTrack.track) {
      return;
    }
    if (this.player.renderer?.handlesOwnCaptions?.()) {
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
          this.element.replaceChildren();
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
        const rawText = cue.text || "";
        if (!rawText.trim()) {
          return;
        }
        const fragment = DOMUtils.renderVTTToDOM(rawText);
        if (isAudioPlayer) {
          const existingCues = this.element.querySelectorAll(`.${this.player.options.classPrefix}-caption-cue`);
          existingCues.forEach((el) => el.classList.remove(`${this.player.options.classPrefix}-caption-active`));
          const cueId = `cue-${cue.startTime}-${cue.endTime}`;
          let cueElement = this.element.querySelector(`[data-cue-id="${cueId}"]`);
          if (!cueElement) {
            cueElement = document.createElement("div");
            cueElement.className = `${this.player.options.classPrefix}-caption-cue`;
            cueElement.setAttribute("data-cue-id", cueId);
            cueElement.replaceChildren(fragment);
            this.element.appendChild(cueElement);
          } else {
            cueElement.replaceChildren(fragment);
          }
          cueElement.classList.add(`${this.player.options.classPrefix}-caption-active`);
          requestAnimationFrame(() => {
            if (cueElement) {
              cueElement.scrollIntoView(reducedMotionScrollOptions("center"));
            }
          });
        } else {
          this.element.replaceChildren(fragment);
        }
        this.element.style.display = "block";
        this.positionCaptionsOnMobile();
        this.player.emit("captionchange", cue);
      }
    } else if (this.currentCue) {
      if (!isAudioPlayer) {
        this.element.replaceChildren();
        this.element.style.display = "none";
      }
      this.currentCue = null;
    }
  }
  positionCaptionsOnMobile() {
    if (!this.element || this.element.style.display === "none") {
      return;
    }
    const isFullscreen = this.player.state?.fullscreen || false;
    const mobile = isMobile();
    if (!mobile && !isFullscreen) {
      this.element.style.bottom = "";
      return;
    }
    const controls = this.player.controlBar?.element;
    if (!controls) {
      return;
    }
    requestAnimationFrame(() => {
      if (!this.element || this.element.style.display === "none") {
        return;
      }
      const controlsRect = controls.getBoundingClientRect();
      if (!this.player.videoWrapper) return;
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
  // VTT formatting is parsed via DOMUtils.renderVTTToDOM() which returns
  // a DocumentFragment built with createElement / createTextNode. The
  // previous regex-based parseVTTFormatting helper was removed because
  // it produced strings that were assigned to `innerHTML`, which is
  // unsafe for cue text from third-party WebVTT sources.
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
    if (result && result[1] && result[2] && result[3]) {
      return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }
    return hex;
  }
  setCaptionStyle(property, value) {
    switch (property) {
      case "fontSize":
        this.player.options.captionsFontSize = String(value);
        break;
      case "fontFamily":
        this.player.options.captionsFontFamily = String(value);
        break;
      case "color":
        this.player.options.captionsColor = String(value);
        break;
      case "backgroundColor":
        this.player.options.captionsBackgroundColor = String(value);
        break;
      case "opacity":
        this.player.options.captionsOpacity = Number(value);
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
  /**
   * Refresh tracks list - useful when HLS adds subtitle tracks dynamically
   */
  refreshTracks() {
    const currentLanguage = this.currentTrack?.language;
    const wasEnabled = this.player.state.captionsEnabled;
    if (this.currentTrack) {
      this.disable();
    }
    this.tracks = [];
    this.loadTracks();
    this.player.log(`Caption tracks refreshed, found ${this.tracks.length} tracks`, "info");
    if (wasEnabled && currentLanguage && this.tracks.length > 0) {
      const matchingIndex = this.tracks.findIndex((t) => t.language === currentLanguage);
      if (matchingIndex >= 0) {
        this.enable(matchingIndex);
      }
    } else if (!wasEnabled && this.player.options.captionsDefault && this.tracks.length > 0) {
      this.enable(0);
    }
    return this.tracks.length;
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

export {
  CaptionManager
};
//# sourceMappingURL=vidply.chunk-YXSCQMXM.js.map
