/*!
 * VidPly v1.2.5 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  CaptionManager
} from "./vidply.chunk-AOMZGVON.js";
import "./vidply.chunk-UBLW7IID.js";
import "./vidply.chunk-MLYKXQUN.js";
import "./vidply.chunk-RACTFVFK.js";

// src/core/DescriptionSpeechManager.ts
var DescriptionSpeechManager = class {
  player;
  enabled = false;
  descriptionTrack = null;
  cueChangeHandler = null;
  seekedHandler = null;
  wasPlayingBeforeCue = false;
  speaking = false;
  lastSpokenCueKey = null;
  _pendingUtterance = null;
  constructor(player) {
    this.player = player;
  }
  /**
   * Whether speech synthesis is available and enabled in player options.
   */
  canUseSpeech() {
    if (this.player.options.audioDescriptionSpeech === false) {
      return false;
    }
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }
  /**
   * Resolve the descriptions track, preferring the active caption language.
   */
  findDescriptionTrack() {
    const textTracks = this.player.element ? Array.from(this.player.element.textTracks || []) : [];
    const descriptionsTracks = textTracks.filter(
      (track) => track.kind === "descriptions" && !track._vidplyStale
    );
    if (descriptionsTracks.length === 0) {
      return null;
    }
    const captionLang = this.player.captionManager?.currentTrack?.track?.language;
    if (captionLang) {
      const match = descriptionsTracks.find((track) => track.language === captionLang);
      if (match) {
        return match;
      }
    }
    return descriptionsTracks[0] ?? null;
  }
  /**
   * Enable VTT speech mode: wire cuechange/seeked listeners.
   */
  enable() {
    const track = this.findDescriptionTrack();
    if (!track) {
      return false;
    }
    if (!this.canUseSpeech()) {
      track.mode = "showing";
      return true;
    }
    this.descriptionTrack = track;
    track.mode = "hidden";
    this.cueChangeHandler = () => {
      this.handleCueChange();
    };
    track.addEventListener("cuechange", this.cueChangeHandler);
    this.seekedHandler = () => {
      this.cancelSpeech();
      this.lastSpokenCueKey = null;
      this.handleCueChange();
    };
    this.player.on("seeked", this.seekedHandler);
    this.enabled = true;
    this.handleCueChange();
    return true;
  }
  /**
   * Disable VTT speech mode and restore track state.
   */
  disable() {
    this.cancelSpeech();
    this.lastSpokenCueKey = null;
    this.enabled = false;
    if (this.descriptionTrack && this.cueChangeHandler) {
      this.descriptionTrack.removeEventListener("cuechange", this.cueChangeHandler);
    }
    if (this.seekedHandler) {
      this.player.off("seeked", this.seekedHandler);
    }
    if (this.descriptionTrack) {
      this.descriptionTrack.mode = "hidden";
    }
    this.cueChangeHandler = null;
    this.seekedHandler = null;
    this.descriptionTrack = null;
    this.wasPlayingBeforeCue = false;
  }
  /**
   * Handle active description cues on the wired track.
   */
  handleCueChange() {
    if (!this.enabled || !this.descriptionTrack || !this.canUseSpeech()) {
      return;
    }
    const activeCues = this.descriptionTrack.activeCues;
    if (!activeCues || activeCues.length === 0) {
      return;
    }
    const cue = activeCues[0];
    const text = cue.text?.trim();
    if (!text) {
      return;
    }
    const cueKey = `${cue.startTime}:${cue.endTime}:${text}`;
    if (this.speaking && this.lastSpokenCueKey === cueKey) {
      return;
    }
    if (this.lastSpokenCueKey === cueKey && !this.player.state.playing) {
      return;
    }
    this.speakCue(cue, cueKey);
  }
  /**
   * Pause playback and speak a description cue.
   */
  speakCue(cue, cueKey) {
    if (!this.canUseSpeech()) {
      return;
    }
    if (this.player.state.paused && !this.speaking && !this.wasPlayingBeforeCue) {
      return;
    }
    this.cancelSpeech();
    this.wasPlayingBeforeCue = this.player.state.playing;
    if (this.wasPlayingBeforeCue) {
      this.player.pause();
    }
    this.speaking = true;
    this.lastSpokenCueKey = cueKey;
    const detail = {
      time: cue.startTime,
      endTime: cue.endTime,
      text: cue.text.trim(),
      cue
    };
    this.player.emit("audiodescriptioncuestart", detail);
    const utterance = new SpeechSynthesisUtterance(detail.text);
    const lang = this.descriptionTrack?.language || this.player.options.language || "en";
    utterance.lang = lang;
    const finish = () => {
      if (this._pendingUtterance !== utterance) {
        return;
      }
      this._pendingUtterance = null;
      this.speaking = false;
      this.player.emit("audiodescriptioncueend", detail);
      const extended = this.player.options.audioDescriptionExtended !== false;
      const shouldResume = extended ? this.wasPlayingBeforeCue : this.wasPlayingBeforeCue && this.player.state.currentTime < cue.endTime;
      if (shouldResume && this.enabled) {
        void this.player.play();
      }
      this.wasPlayingBeforeCue = false;
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    this._pendingUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
  /**
   * Cancel any in-progress speech synthesis.
   */
  cancelSpeech() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this._pendingUtterance = null;
    this.speaking = false;
    this.wasPlayingBeforeCue = false;
  }
  destroy() {
    this.disable();
  }
};

// src/core/AudioDescriptionManager.ts
var AudioDescriptionManager = class {
  player;
  captionTracks;
  desiredState;
  enabled;
  originalSource;
  sourceElement;
  src;
  speechManager;
  constructor(player) {
    this.player = player;
    this.enabled = false;
    this.desiredState = false;
    this.src = player.options.audioDescriptionSrc;
    this.sourceElement = null;
    this.originalSource = null;
    this.captionTracks = [];
    this.speechManager = null;
  }
  /**
   * Whether a described video source swap is configured.
   */
  _hasSwapSource() {
    const hasSourceElementsWithDesc = this.player.sourceElements.some(
      (el) => el.getAttribute("data-desc-src")
    );
    return Boolean(this.src || hasSourceElementsWithDesc);
  }
  /**
   * Whether a descriptions VTT track is present on the media element.
   */
  _hasDescriptionsTrack() {
    return Boolean(this.player.findTextTrack("descriptions"));
  }
  /**
   * Resolve which audio-description delivery mode applies for the current media.
   */
  resolveDeliveryMode() {
    const configured = this.player.options.audioDescriptionMode ?? "auto";
    const hasSwap = this._hasSwapSource();
    const hasDescriptions = this._hasDescriptionsTrack();
    if (configured === "swap") {
      return hasSwap ? "swap" : "none";
    }
    if (configured === "vtt_speech") {
      return hasDescriptions ? "vtt_speech" : "none";
    }
    if (hasSwap) {
      return "swap";
    }
    if (hasDescriptions) {
      return "vtt_speech";
    }
    return "none";
  }
  _ensureSpeechManager() {
    if (!this.speechManager) {
      this.speechManager = new DescriptionSpeechManager(this.player);
    }
    return this.speechManager;
  }
  /**
   * Initialize audio description from source elements
   * Called during player initialization
   */
  initFromSourceElements(sourceElements, trackElements) {
    for (const sourceEl of sourceElements) {
      const descSrc = sourceEl.getAttribute("data-desc-src");
      const origSrc = sourceEl.getAttribute("data-orig-src");
      if (descSrc || origSrc) {
        if (!this.sourceElement) {
          this.sourceElement = sourceEl;
        }
        if (origSrc) {
          if (!this.originalSource) {
            this.originalSource = origSrc;
          }
          if (!this.player.originalSrc) {
            this.player.originalSrc = origSrc;
          }
        } else {
          const currentSrcAttr = sourceEl.getAttribute("src");
          if (!this.originalSource && currentSrcAttr) {
            this.originalSource = currentSrcAttr;
          }
          if (!this.player.originalSrc && currentSrcAttr) {
            this.player.originalSrc = currentSrcAttr;
          }
        }
        if (descSrc && !this.src) {
          this.src = descSrc;
        }
      }
    }
    trackElements.forEach((trackEl) => {
      const trackKind = trackEl.getAttribute("kind");
      const trackDescSrc = trackEl.getAttribute("data-desc-src");
      if ((trackKind === "captions" || trackKind === "subtitles" || trackKind === "chapters" || trackKind === "descriptions") && trackDescSrc && trackEl instanceof HTMLTrackElement) {
        this.captionTracks.push({
          trackElement: trackEl,
          originalSrc: trackEl.getAttribute("src"),
          describedSrc: trackDescSrc,
          originalTrackSrc: trackEl.getAttribute("data-orig-src") || trackEl.getAttribute("src"),
          explicit: true
        });
        this.player.log(`Found explicit described ${trackKind} track: ${trackEl.getAttribute("src")} -> ${trackDescSrc}`);
      }
    });
  }
  /**
   * Check if audio description is available
   */
  isAvailable() {
    const mode = this.resolveDeliveryMode();
    if (mode === "swap" || mode === "vtt_speech") {
      return true;
    }
    return this.captionTracks.length > 0;
  }
  /**
   * Enable audio description
   */
  async enable() {
    const deliveryMode = this.resolveDeliveryMode();
    const hasTracksWithDesc = this.captionTracks.length > 0;
    if (deliveryMode === "none" && !hasTracksWithDesc) {
      console.warn("VidPly: No audio description source, descriptions track, or tracks provided");
      return;
    }
    this.desiredState = true;
    if (deliveryMode === "vtt_speech") {
      const speechManager = this._ensureSpeechManager();
      const started = speechManager.enable();
      if (!started) {
        console.warn("VidPly: No descriptions track available for VTT speech mode");
        return;
      }
      this.enabled = true;
      this.player.state.audioDescriptionEnabled = true;
      this.player.emit("audiodescriptionenabled");
      return;
    }
    const currentTime = this.player.state.currentTime;
    const wasPlaying = this.player.state.playing;
    const posterValue = this.player.element.poster || this.player.element.getAttribute("poster") || this.player.options.poster;
    const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;
    const currentCaptionText = this._getCurrentCaptionText();
    if (this.sourceElement) {
      await this._enableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
    } else if (this.src) {
      await this._enableWithDirectSrc(currentTime, wasPlaying, posterValue, shouldKeepPoster);
    } else if (hasTracksWithDesc) {
      await this._swapCaptionTracks(true);
      this.enabled = true;
      this.player.emit("audiodescriptionenabled");
    }
  }
  /**
   * Disable audio description
   */
  async disable() {
    this.desiredState = false;
    if (this.speechManager?.enabled) {
      this.speechManager.disable();
      this.enabled = false;
      this.player.state.audioDescriptionEnabled = false;
      this.player.emit("audiodescriptiondisabled");
      return;
    }
    const hasTracksWithDesc = this.captionTracks.length > 0;
    if (!this.sourceElement && !this.src && hasTracksWithDesc) {
      await this._swapCaptionTracks(false);
      this.enabled = false;
      this.player.emit("audiodescriptiondisabled");
      return;
    }
    if (!this.player.originalSrc) {
      return;
    }
    const currentTime = this.player.state.currentTime;
    const wasPlaying = this.player.state.playing;
    const posterValue = this.player.element.poster || this.player.element.getAttribute("poster") || this.player.options.poster;
    const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;
    const currentCaptionText = this._getCurrentCaptionText();
    if (this.sourceElement) {
      await this._disableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
    } else if (this.src) {
      await this._disableWithDirectSrc(currentTime, wasPlaying, posterValue);
    }
  }
  /**
   * Toggle audio description
   */
  async toggle() {
    const deliveryMode = this.resolveDeliveryMode();
    const descriptionTrack = this.player.findTextTrack("descriptions");
    const hasSwapOrTracks = this._hasSwapSource() || this.captionTracks.length > 0;
    if (deliveryMode === "vtt_speech") {
      if (this.enabled) {
        await this.disable();
      } else {
        await this.enable();
      }
      return;
    }
    if (descriptionTrack && !hasSwapOrTracks) {
      if (descriptionTrack.mode === "showing") {
        descriptionTrack.mode = "hidden";
        this.enabled = false;
        this.player.state.audioDescriptionEnabled = false;
        this.player.emit("audiodescriptiondisabled");
      } else {
        descriptionTrack.mode = "showing";
        this.enabled = true;
        this.player.state.audioDescriptionEnabled = true;
        this.player.emit("audiodescriptionenabled");
      }
    } else if (descriptionTrack && hasSwapOrTracks) {
      if (this.enabled) {
        this.desiredState = false;
        await this.disable();
      } else {
        descriptionTrack.mode = "showing";
        this.desiredState = true;
        await this.enable();
      }
    } else if (hasSwapOrTracks) {
      if (this.enabled) {
        this.desiredState = false;
        await this.disable();
      } else {
        this.desiredState = true;
        await this.enable();
      }
    }
  }
  /**
   * Get current caption text for synchronization
   */
  _getCurrentCaptionText() {
    if (this.player.captionManager && this.player.captionManager.currentTrack && this.player.captionManager.currentCue) {
      return this.player.captionManager.currentCue.text;
    }
    return null;
  }
  /**
   * Validate that a track URL exists. Bounded by the player's lifecycle
   * AbortController + an 8s timeout so a torn-down player cannot leak
   * the request.
   */
  async _validateTrackExists(url) {
    if (typeof url !== "string" || !url) return false;
    const signals = [];
    const lifecycle = this.player.lifecycleSignal;
    if (lifecycle) signals.push(lifecycle);
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      signals.push(AbortSignal.timeout(8e3));
    }
    let signal;
    if (signals.length === 1) signal = signals[0];
    else if (signals.length > 1) {
      const anyFn = AbortSignal.any;
      signal = anyFn ? anyFn(signals) : signals[0];
    }
    try {
      const response = await fetch(url, { method: "HEAD", signal });
      return response.ok;
    } catch {
      return false;
    }
  }
  /**
   * Swap caption tracks to described versions
   */
  async _swapCaptionTracks(toDescribed = true) {
    if (this.captionTracks.length === 0) return [];
    const swappedTracks = [];
    const validationPromises = this.captionTracks.map(async (trackInfo) => {
      if (trackInfo.trackElement && trackInfo.describedSrc) {
        if (trackInfo.explicit === true) {
          const url = toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc;
          if (!url) return { trackInfo, exists: false };
          try {
            const exists = await this._validateTrackExists(url);
            return { trackInfo, exists };
          } catch {
            return { trackInfo, exists: false };
          }
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
          trackModes.set(trackInfo, { wasShowing: false, wasHidden: false });
        }
      });
      const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
        const attributes = {};
        Array.from(trackInfo.trackElement.attributes).forEach((attr) => {
          attributes[attr.name] = attr.value;
        });
        const result = {
          trackInfo,
          oldSrc: trackInfo.trackElement.getAttribute("src"),
          parent: trackInfo.trackElement.parentNode,
          nextSibling: trackInfo.trackElement.nextSibling,
          attributes
        };
        trackInfo.trackElement.remove();
        return result;
      });
      this.player.element.load();
      await new Promise((resolve) => {
        this.player.setManagedTimeout(() => {
          tracksToReadd.forEach(({ trackInfo, parent, nextSibling, attributes }) => {
            const newSrc = toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc;
            if (!newSrc) {
              return;
            }
            swappedTracks.push(trackInfo);
            const newTrackElement = document.createElement("track");
            newTrackElement.setAttribute("src", newSrc);
            Object.keys(attributes).forEach((attrName) => {
              const attrValue = attributes[attrName];
              if (attrName !== "src" && attrName !== "data-desc-src" && attrValue !== void 0) {
                newTrackElement.setAttribute(attrName, attrValue);
              }
            });
            const targetParent = parent || this.player.element;
            if (nextSibling && nextSibling.parentNode) {
              targetParent.insertBefore(newTrackElement, nextSibling);
            } else {
              targetParent.appendChild(newTrackElement);
            }
            trackInfo.trackElement = newTrackElement;
          });
          this.player.invalidateTrackCache();
          const setupNewTracks = () => {
            this.player.setManagedTimeout(() => {
              swappedTracks.forEach((trackInfo) => {
                const trackElement = trackInfo.trackElement;
                const newTextTrack = trackElement.track;
                if (newTextTrack) {
                  const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                  newTextTrack.mode = "hidden";
                  const restoreMode = () => {
                    if (modeInfo.wasShowing || modeInfo.wasHidden) {
                      newTextTrack.mode = "hidden";
                    } else {
                      newTextTrack.mode = "disabled";
                    }
                  };
                  if (trackElement.readyState >= 2) {
                    restoreMode();
                  } else {
                    trackElement.addEventListener("load", restoreMode, { once: true });
                    trackElement.addEventListener("error", restoreMode, { once: true });
                  }
                }
              });
            }, 300);
          };
          if (this.player.element.readyState >= 1) {
            this.player.setManagedTimeout(setupNewTracks, 200);
          } else {
            this.player.element.addEventListener("loadedmetadata", setupNewTracks, { once: true });
            this.player.setManagedTimeout(setupNewTracks, 2e3);
          }
          resolve();
        }, 100);
      });
    }
    return swappedTracks;
  }
  /**
   * Update source elements to described versions
   */
  _updateSourceElements(toDescribed = true) {
    const sourceElements = this.player.sourceElements;
    const sourcesToUpdate = [];
    sourceElements.forEach((sourceEl) => {
      const descSrcAttr = sourceEl.getAttribute("data-desc-src");
      const currentSrc = sourceEl.getAttribute("src");
      if (descSrcAttr) {
        const type = sourceEl.getAttribute("type");
        const origSrc = sourceEl.getAttribute("data-orig-src") || currentSrc;
        sourcesToUpdate.push({
          src: toDescribed ? descSrcAttr : origSrc,
          type,
          origSrc,
          descSrc: descSrcAttr
        });
      } else {
        sourcesToUpdate.push({
          src: sourceEl.getAttribute("src"),
          type: sourceEl.getAttribute("type"),
          origSrc: null,
          descSrc: null
        });
      }
    });
    if (this.player.element.hasAttribute("src")) {
      this.player.element.removeAttribute("src");
    }
    sourceElements.forEach((sourceEl) => sourceEl.remove());
    sourcesToUpdate.forEach((sourceInfo) => {
      if (!sourceInfo.src) {
        return;
      }
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
      const firstTrack = this.player.element.querySelector("track");
      if (firstTrack) {
        this.player.element.insertBefore(newSource, firstTrack);
      } else {
        this.player.element.appendChild(newSource);
      }
    });
    this.player._sourceElementsDirty = true;
    this.player._sourceElementsCache = null;
  }
  /**
   * Wait for media to be ready
   */
  async _waitForMediaReady(needSeek = false) {
    await new Promise((resolve) => {
      if (this.player.element.readyState >= 1) {
        resolve();
      } else {
        const onLoad = () => {
          this.player.element.removeEventListener("loadedmetadata", onLoad);
          resolve();
        };
        this.player.element.addEventListener("loadedmetadata", onLoad);
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (needSeek) {
      await new Promise((resolve) => {
        if (this.player.element.readyState >= 3) {
          resolve();
        } else {
          const onCanPlay = () => {
            this.player.element.removeEventListener("canplay", onCanPlay);
            this.player.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          };
          this.player.element.addEventListener("canplay", onCanPlay, { once: true });
          this.player.element.addEventListener("canplaythrough", onCanPlay, { once: true });
          setTimeout(() => {
            this.player.element.removeEventListener("canplay", onCanPlay);
            this.player.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          }, 3e3);
        }
      });
    }
  }
  /**
   * Restore playback state after source change
   */
  async _restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText) {
    let syncTime = currentTime;
    if (currentCaptionText && this.player.captionManager && this.player.captionManager.tracks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const matchingTime = this.player.findMatchingCaptionTime(
        currentCaptionText,
        this.player.captionManager.tracks
      );
      if (matchingTime !== null) {
        syncTime = matchingTime;
        if (this.player.options.debug) {
          this.player.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
        }
      }
    }
    if (syncTime > 0) {
      this.player.seek(syncTime);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (wasPlaying) {
      await this.player.play();
      this.player.setManagedTimeout(() => {
        this.player.hidePosterOverlay();
      }, 100);
    } else {
      this.player.pause();
      if (!shouldKeepPoster) {
        this.player.hidePosterOverlay();
      }
    }
  }
  /**
   * Enable with source element method
   */
  async _enableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText) {
    await this._swapCaptionTracks(true);
    this._updateSourceElements(true);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    this.player.element.load();
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    await this._restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText);
    if (!this.desiredState) return;
    this.enabled = true;
    this.player.state.audioDescriptionEnabled = true;
    this.player.emit("audiodescriptionenabled");
    this._reloadTranscript();
  }
  /**
   * Enable with direct src method
   */
  async _enableWithDirectSrc(currentTime, wasPlaying, posterValue, shouldKeepPoster) {
    await this._swapCaptionTracks(true);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    if (!this.src) return;
    this.player.element.src = this.src;
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    if (currentTime > 0) {
      this.player.seek(currentTime);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (wasPlaying) {
      await this.player.play();
    } else {
      this.player.pause();
      if (!shouldKeepPoster) {
        this.player.hidePosterOverlay();
      }
    }
    if (!this.desiredState) return;
    this.enabled = true;
    this.player.state.audioDescriptionEnabled = true;
    this.player.emit("audiodescriptionenabled");
    this._reloadTranscript();
  }
  /**
   * Disable with source element method
   */
  async _disableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText) {
    await this._swapCaptionTracks(false);
    this._updateSourceElements(false);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    this.player.element.load();
    this.player.invalidateTrackCache();
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    await this._restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText);
    if (this.player.captionManager) {
      this.player.captionManager.destroy();
      this.player.captionManager = new CaptionManager(this.player);
    }
    if (this.desiredState) return;
    this.enabled = false;
    this.player.state.audioDescriptionEnabled = false;
    this.player.emit("audiodescriptiondisabled");
    this._reloadTranscript();
  }
  /**
   * Disable with direct src method
   */
  async _disableWithDirectSrc(currentTime, wasPlaying, posterValue) {
    await this._swapCaptionTracks(false);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    const originalSrcToUse = this.originalSource || this.player.originalSrc;
    if (!originalSrcToUse) {
      return;
    }
    this.player.element.src = originalSrcToUse;
    this.player.element.load();
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    if (currentTime > 0) {
      this.player.seek(currentTime);
    }
    if (wasPlaying) {
      await this.player.play();
    }
    if (this.desiredState) return;
    this.enabled = false;
    this.player.state.audioDescriptionEnabled = false;
    this.player.emit("audiodescriptiondisabled");
    this._reloadTranscript();
  }
  /**
   * Reload transcript after audio description state change
   */
  _reloadTranscript() {
    if (this.player.transcriptManager && this.player.transcriptManager.isVisible) {
      this.player.setManagedTimeout(() => {
        if (this.player.transcriptManager && this.player.transcriptManager.loadTranscriptData) {
          this.player.transcriptManager.loadTranscriptData();
        }
      }, 800);
    }
  }
  /**
   * Update sources (called when playlist changes)
   */
  updateSources(audioDescriptionSrc) {
    this.speechManager?.destroy();
    this.speechManager = null;
    this.src = audioDescriptionSrc || null;
    this.enabled = false;
    this.desiredState = false;
    this.sourceElement = null;
    this.originalSource = null;
    this.captionTracks = [];
  }
  /**
   * Reinitialize from current player elements (called after playlist loads new tracks)
   */
  reinitialize() {
    this.player.invalidateTrackCache();
    this.initFromSourceElements(this.player.sourceElements, this.player.trackElements);
  }
  /**
   * Cleanup
   */
  destroy() {
    this.speechManager?.destroy();
    this.speechManager = null;
    this.enabled = false;
    this.desiredState = false;
    this.captionTracks = [];
    this.sourceElement = null;
    this.originalSource = null;
  }
};
export {
  AudioDescriptionManager
};
//# sourceMappingURL=vidply.AudioDescriptionManager-GOZOSVY6.js.map
