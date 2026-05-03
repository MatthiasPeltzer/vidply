/*!
 * VidPly v1.1.15 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/renderers/DASHRenderer.ts
var DASHRenderer = class {
  player;
  media;
  dash;
  isStreaming = true;
  _dashSourceLoaded;
  _pendingSrc;
  _dashSubtitleTracksCount;
  _dashTextTracks;
  _cueUpdateTimer;
  _captionEnabledHandler;
  _captionDisabledHandler;
  _lastKnownCueCount;
  _dashTextIsTtml;
  _pendingTimeouts;
  _ttmlDiv;
  _manifestUrl;
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.dash = null;
    this._dashSourceLoaded = false;
    this._pendingSrc = null;
    this._dashSubtitleTracksCount = void 0;
    this._dashTextTracks = [];
    this._cueUpdateTimer = null;
    this._captionEnabledHandler = null;
    this._captionDisabledHandler = null;
    this._lastKnownCueCount = 0;
    this._dashTextIsTtml = false;
    this._pendingTimeouts = [];
    this._ttmlDiv = null;
    this._manifestUrl = null;
  }
  async init() {
    this.player.log("Using dash.js for DASH support");
    await this.initDashJs();
  }
  async initDashJs() {
    this.media.controls = false;
    this.media.removeAttribute("controls");
    if (!window.dashjs) {
      await this.loadDashJs();
    }
    const sourceElements = Array.from(this.media.querySelectorAll("source"));
    let originalSrc = null;
    if (sourceElements.length > 0) {
      originalSrc = sourceElements[0].getAttribute("src");
      sourceElements.forEach((source) => source.remove());
      this.player.log("Removed <source> elements for HTML5 validity (dash.js uses MSE)");
    }
    const dashjs = window.dashjs;
    if (!dashjs) {
      throw new Error("dash.js not available");
    }
    this.dash = dashjs.MediaPlayer().create();
    this.dash.updateSettings({
      debug: {
        logLevel: this.player.options.debug ? 4 : 0
      },
      streaming: {
        // Override dash.js default of 'lowestStartupDelay'. For audio
        // AdaptationSets that tie on selectionPriority and role=main (e.g.
        // Axinom's three en/en-low/en-high tracks), 'lowestStartupDelay'
        // falls through to 'highestEfficiency' which, for audio, has no
        // meaningful pixels-per-bit metric and collapses to "highest
        // bitrate". 'firstTrack' respects manifest order instead, which is
        // both predictable and closer to the MPD author's intent.
        selectionModeForInitialTrack: "firstTrack",
        // NOTE on pre-play preload: we deliberately do NOT set
        // streaming.scheduling.scheduleWhilePaused = false here. While that
        // is the documented dash.js way to suppress segment downloads while
        // paused / before the first play, in our setup (dash.js 5.1.1 +
        // dash.initialize(media, null, false) + attachSource at init) it
        // tears down the SourceBuffers mid-init with
        // "SourceBuffer has been removed from the parent media source"
        // exceptions, which leaves the player unable to seek or play. The
        // PR #3785 fix that was supposed to handle the initial-playback /
        // autoPlay=false case is fragile against our usage pattern.
        // Instead we keep dash.js's default scheduling (scheduleWhilePaused
        // stays at its default `true`) and let the buffer caps below limit
        // how much is fetched before play. With a single ~6s segment size,
        // the visible network preload is one init segment per track plus
        // 1–2 media segments — the same "first two chunks" behavior the
        // user previously confirmed as acceptable for DASH.
        buffer: {
          bufferTimeAtTopQuality: 30,
          bufferTimeAtTopQualityLongForm: 60,
          // dash.js 5.x: use bufferTimeDefault (replaces removed stableBufferTime).
          // Keep at 12s — going lower (0 / 1) was tested but dash.js still
          // loads the first segment regardless because it's needed to make
          // the MediaSource playable, so the savings are negligible while
          // hurting mid-playback resilience on slow networks.
          bufferTimeDefault: 12,
          bufferToKeep: 20,
          bufferPruningInterval: 10
        },
        retryAttempts: {
          MPD: 4,
          MediaSegment: 6,
          InitializationSegment: 4,
          BitstreamSwitchingSegment: 4
        },
        retryIntervals: {
          MPD: 1e3,
          MediaSegment: 1e3,
          InitializationSegment: 1e3,
          BitstreamSwitchingSegment: 1e3
        },
        abr: {
          autoSwitchBitrate: { video: true, audio: true }
        },
        text: {
          defaultEnabled: true
        }
      }
    });
    this._ttmlDiv = document.createElement("div");
    this._ttmlDiv.className = "vidply-dash-ttml";
    this._ttmlDiv.style.visibility = "hidden";
    const wrapper = this.player.videoWrapper || this.media.parentElement;
    if (wrapper) {
      wrapper.appendChild(this._ttmlDiv);
    }
    this.dash.initialize(this.media, null, false);
    this.dash.attachTTMLRenderingDiv(this._ttmlDiv);
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
    this.player.log(`Loading DASH source: ${src}`, "log");
    if (!src) {
      throw new Error("No DASH source found");
    }
    this._pendingSrc = src;
    this._manifestUrl = src;
    this.dash.attachSource(src);
    this._dashSourceLoaded = true;
    this.player.showPosterOverlay();
    this.attachDashEvents();
    this.attachMediaEvents();
    this._setupCaptionSync();
  }
  /**
   * Load dash.js. Pinned to an exact version (the previous default
   * `5.1.1` is preserved) and overridable via `options.dashScriptUrl`
   * (URL) / `options.dashScriptIntegrity` (SRI hash). See
   * HLSRenderer.loadHlsJs() for the SRI computation command.
   */
  async loadDashJs() {
    const defaultUrl = "https://cdn.jsdelivr.net/npm/dashjs@5.1.1/dist/modern/umd/dash.all.min.js";
    const url = this.player.options.dashScriptUrl || defaultUrl;
    const integrity = this.player.options.dashScriptIntegrity;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = "anonymous";
        script.referrerPolicy = "no-referrer";
      }
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load dash.js"));
      document.head.appendChild(script);
    });
  }
  _setTimeout(fn, delay) {
    const id = setTimeout(() => {
      this._pendingTimeouts = this._pendingTimeouts.filter((t) => t !== id);
      fn();
    }, delay);
    this._pendingTimeouts.push(id);
    return id;
  }
  attachDashEvents() {
    const dashjs = window.dashjs;
    if (!dashjs) return;
    const dashEvents = dashjs.MediaPlayer.events;
    this.dash.on(dashEvents.MANIFEST_LOADED, (e) => {
      const data = e.data || e;
      this.player.log("DASH manifest loaded");
      this.player.emit("dashmanifestloaded", data);
      if (this.player.container) {
        this.player.container.classList.remove("vidply-external-controls");
      }
      this._setTimeout(() => {
        this._checkSubtitleTracks();
      }, 500);
    });
    this.dash.on(dashEvents.QUALITY_CHANGE_RENDERED, (e) => {
      if (e.mediaType === "video") {
        this.player.log("DASH quality changed to index " + e.newQuality);
        this.player.emit("dashqualitychanged", e);
      }
    });
    this.dash.on(dashEvents.TEXT_TRACKS_ADDED, (e) => {
      const tracks = e.tracks || [];
      this._dashTextTracks = tracks;
      this._dashTextIsTtml = tracks.some(
        (t) => t.isTTML || /stpp|ttml/i.test(t.codec || "") || /ttml/i.test(t.mimeType || "")
      );
      this.player.log(`DASH text tracks added: ${tracks.length} tracks, format: ${this._dashTextIsTtml ? "TTML" : "WebVTT"}`);
      this._dashSubtitleTracksCount = tracks.length;
      this.player.emit("dashsubtitletracksupdated", { tracks });
      this.updateCaptionButtonsForDash();
      if (tracks.length > 0) {
        try {
          this.dash.setTextTrack(0);
        } catch (err) {
        }
        if (!this._dashTextIsTtml) {
          this._startCueUpdatePolling();
        }
      }
    });
    this.dash.on(dashEvents.STREAM_INITIALIZED, () => {
      this.player.log("DASH stream initialized");
      this.player.emit("dashstreaminitialized");
      this._setTimeout(() => {
        const qualities = this.getQualities();
        if (qualities.length > 0) {
          this.player.emit("dashmanifestparsed", { qualities });
        }
      }, 300);
    });
    this.dash.on(dashEvents.ERROR, (e) => {
      this.handleDashError(e);
    });
    this.dash.on(dashEvents.FRAGMENT_LOADING_COMPLETED, (e) => {
      this.player.state.buffering = false;
      if (e.request && e.request.mediaType === "text" && !this._dashTextIsTtml) {
        this._setTimeout(() => {
          const count = this._getTotalCueCount();
          if (count > this._lastKnownCueCount) {
            this._lastKnownCueCount = count;
            this.player.emit("textcuesupdate");
          }
        }, 100);
      }
    });
  }
  /**
   * Count total cues across all subtitle/caption tracks (for WebVTT DASH).
   */
  _getTotalCueCount() {
    const textTracks = this.media.textTracks;
    let total = 0;
    if (!textTracks) return total;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if ((track.kind === "subtitles" || track.kind === "captions") && !track._vidplyStale && track.cues) {
        total += track.cues.length;
      }
    }
    return total;
  }
  /**
   * Return true if `time` falls inside any TimeRange the SourceBuffer already
   * holds, with a small tolerance to absorb GOP boundaries. Used by the
   * seeking handler to decide whether to surface a 'waiting' event for the
   * spinner UI when the user scrubs while paused.
   */
  _isTimeBuffered(time) {
    const buffered = this.media.buffered;
    if (!buffered || buffered.length === 0) return false;
    const tolerance = 0.25;
    for (let i = 0; i < buffered.length; i++) {
      if (time >= buffered.start(i) - tolerance && time <= buffered.end(i) + tolerance) {
        return true;
      }
    }
    return false;
  }
  /**
   * Sync VidPly caption track switches with dash.js so it loads
   * subtitle segments for the selected language.
   */
  _setupCaptionSync() {
    this._captionEnabledHandler = (selectedTrack) => {
      if (this._dashTextIsTtml) {
        if (selectedTrack.track) {
          selectedTrack.track.mode = "showing";
        }
        if (this._ttmlDiv) {
          this._ttmlDiv.style.visibility = "visible";
        }
      }
      this._syncDashTextTrack(selectedTrack);
    };
    this._captionDisabledHandler = () => {
      if (this._dashTextIsTtml && this._ttmlDiv) {
        this._ttmlDiv.style.visibility = "hidden";
      }
      if (this.dash) {
        try {
          this.dash.setTextTrack(-1);
        } catch (e) {
        }
      }
    };
    this.player.on("captionsenabled", this._captionEnabledHandler);
    this.player.on("captionsdisabled", this._captionDisabledHandler);
  }
  /**
   * Map a VidPly caption track to the corresponding dash.js track index
   * and switch dash.js to load segments for that language.
   */
  _syncDashTextTrack(selectedTrack) {
    if (!this.dash || !this._dashTextTracks.length) return;
    const lang = selectedTrack.language;
    if (!lang) return;
    const dashIndex = this._dashTextTracks.findIndex((dt) => {
      const dtLang = dt.lang || dt.language || dt.srclang || "";
      if (!dtLang) return false;
      return dtLang === lang || dtLang.startsWith(lang) || lang.startsWith(dtLang);
    });
    if (dashIndex >= 0) {
      this.player.log(`Syncing DASH text track to index ${dashIndex} (${lang})`);
      try {
        this.dash.setTextTrack(dashIndex);
      } catch (err) {
      }
      if (!this._dashTextIsTtml) {
        this._lastKnownCueCount = 0;
        this._startCueUpdatePolling();
      }
    }
  }
  /**
   * Poll for new WebVTT cues being added by dash.js as subtitle segments load.
   * Emits events for transcript refresh when new cues arrive.
   */
  _startCueUpdatePolling() {
    this._stopCueUpdatePolling();
    let prevCueCount = 0;
    let stableRounds = 0;
    this._cueUpdateTimer = setInterval(() => {
      const count = this._getTotalCueCount();
      if (count > prevCueCount) {
        prevCueCount = count;
        stableRounds = 0;
        this.player.emit("textcuesupdate");
      } else {
        stableRounds++;
        if (stableRounds >= 8) {
          this._stopCueUpdatePolling();
          if (count > 0) {
            this.player.emit("textcuesupdate");
          }
        }
      }
    }, 500);
  }
  _stopCueUpdatePolling() {
    if (this._cueUpdateTimer) {
      clearInterval(this._cueUpdateTimer);
      this._cueUpdateTimer = null;
    }
  }
  _checkSubtitleTracks() {
    if (this._dashSubtitleTracksCount !== void 0 && this._dashSubtitleTracksCount > 0) {
      return;
    }
    const tracks = this.media.textTracks;
    let count = 0;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if ((track.kind === "subtitles" || track.kind === "captions") && !track._vidplyStale) {
        count++;
      }
    }
    this._dashSubtitleTracksCount = count;
    this.updateCaptionButtonsForDash();
  }
  updateCaptionButtonsForDash(retryCount = 0) {
    const tracksCount = this._dashSubtitleTracksCount || 0;
    const doUpdate = () => {
      this.player.invalidateTrackCache();
      if (tracksCount > 0) {
        if (this.player.captionManager) {
          const found = this.player.captionManager.refreshTracks();
          if (found === 0 && retryCount < 5) {
            const delay = (retryCount + 1) * 200;
            this.player.log(`DASH caption tracks not yet on video element, retrying in ${delay}ms (attempt ${retryCount + 1})`, "info");
            this._setTimeout(() => {
              this.updateCaptionButtonsForDash(retryCount + 1);
            }, delay);
            return;
          }
        }
        if (!this._dashTextIsTtml && this.player.transcriptManager?.isVisible) {
          this.player.transcriptManager.loadTranscriptData();
          this.player.transcriptManager.updateLanguageSelector();
        }
        if (this.player.controlBar) {
          this.player.controlBar.ensureCaptionsButton();
          if (!this._dashTextIsTtml) {
            this.player.controlBar.ensureCaptionStyleButton();
            this.player.controlBar.ensureTranscriptButton();
          }
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
    this.media.addEventListener("seeking", () => {
      this.player.state.seeking = true;
      this.player.emit("seeking");
      if (!this._isTimeBuffered(this.media.currentTime)) {
        this.player.state.buffering = true;
        this.player.emit("waiting");
      }
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
    this.media.addEventListener("error", () => {
      this.player.handleError(this.media.error);
    });
  }
  handleDashError(e) {
    const error = e.error || e;
    if (!error) return;
    const code = error.code ?? "";
    const message = error.message || "";
    this.player.log(`DASH Error - Code: ${code}, Message: ${message}`, "warn");
    if (code && code >= 100) {
      this.player.log("Fatal DASH error", "error");
      this.player.handleError(new Error(`DASH Error: ${code} - ${message}`));
    } else {
      this.player.log("Non-fatal DASH error: " + (message || error), "warn");
    }
  }
  ensureLoaded() {
    if (!this.player.options.deferLoad) {
      return;
    }
    if (!this.dash) {
      return;
    }
    if (this._dashSourceLoaded) {
      return;
    }
    const src = this._pendingSrc || this.player._pendingSource || this.player.currentSource;
    if (!src) {
      return;
    }
    try {
      this.dash.attachSource(src);
      this._dashSourceLoaded = true;
    } catch (e) {
    }
  }
  play() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (this.player.options.deferLoad && this.dash && !this._dashSourceLoaded) {
      const src = this._pendingSrc || this.player.currentSource;
      if (src) {
        try {
          this.dash.attachSource(src);
          this._dashSourceLoaded = true;
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
  switchQuality(qualityIndex) {
    if (!this.dash) return;
    if (qualityIndex === -1) {
      if (typeof this.dash.setAutoSwitchQualityFor === "function") {
        this.dash.setAutoSwitchQualityFor("video", true);
      } else {
        this.dash.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: true } } }
        });
      }
    } else {
      if (typeof this.dash.setAutoSwitchQualityFor === "function") {
        this.dash.setAutoSwitchQualityFor("video", false);
      } else {
        this.dash.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: false } } }
        });
      }
      if (typeof this.dash.setRepresentationForTypeByIndex === "function") {
        this.dash.setRepresentationForTypeByIndex("video", qualityIndex);
      } else if (typeof this.dash.setQualityFor === "function") {
        this.dash.setQualityFor("video", qualityIndex, true);
      }
    }
  }
  getQualities() {
    if (!this.dash) return [];
    try {
      let reps = null;
      if (typeof this.dash.getRepresentationsByType === "function") {
        reps = this.dash.getRepresentationsByType("video");
      }
      if (reps && reps.length > 0) {
        const heightCounts2 = {};
        reps.forEach((r) => {
          const h = Number(r.height) || 0;
          heightCounts2[h] = (heightCounts2[h] || 0) + 1;
        });
        return reps.map((rep, index) => {
          const height = Number(rep.height) || 0;
          const bitrate = Number(rep.bandwidth || rep.bitrate) || 0;
          const kb = bitrate > 0 ? Math.round(bitrate / 1e3) : 0;
          let name;
          if (height > 0 && heightCounts2[height] > 1 && kb > 0) {
            name = `${height}p (${kb} kbps)`;
          } else if (height > 0) {
            name = `${height}p`;
          } else {
            name = kb > 0 ? `${kb} kbps` : "Auto";
          }
          return {
            index,
            id: rep.id,
            height: rep.height,
            width: rep.width,
            bitrate,
            name
          };
        });
      }
      const bitrateList = this.dash.getBitrateInfoListFor("video");
      if (!bitrateList || bitrateList.length === 0) return [];
      const heightCounts = {};
      bitrateList.forEach((info) => {
        const h = Number(info.height) || 0;
        heightCounts[h] = (heightCounts[h] || 0) + 1;
      });
      return bitrateList.map((info, index) => {
        const height = Number(info.height) || 0;
        const bitrate = Number(info.bitrate) || 0;
        const kb = bitrate > 0 ? Math.round(bitrate / 1e3) : 0;
        let name;
        if (height > 0 && heightCounts[height] > 1 && kb > 0) {
          name = `${height}p (${kb} kbps)`;
        } else if (height > 0) {
          name = `${height}p`;
        } else {
          name = kb > 0 ? `${kb} kbps` : "Auto";
        }
        return {
          index,
          height: info.height,
          width: info.width,
          bitrate: info.bitrate,
          name
        };
      });
    } catch (e) {
      return [];
    }
  }
  getCurrentQuality() {
    if (!this.dash) return -1;
    try {
      if (typeof this.dash.getRepresentationsByType === "function") {
        const reps = this.dash.getRepresentationsByType("video");
        const current = this.dash.getCurrentRepresentationForType?.("video");
        if (current && reps) {
          const idx = reps.findIndex((r) => r.id === current.id);
          if (idx >= 0) return idx;
        }
      }
      return this.dash.getQualityFor("video");
    } catch (e) {
      return -1;
    }
  }
  handlesOwnCaptions() {
    return this._dashTextIsTtml;
  }
  /**
   * Tell dash.js to activate the text track for `lang` so it begins
   * downloading subtitle segments and populating cues for that language.
   */
  activateTextTrackForLanguage(lang) {
    if (!this.dash || !this._dashTextTracks.length || !lang) return false;
    let dashIndex = this._dashTextTracks.findIndex((dt) => {
      const dtLang = dt.lang || dt.language || dt.srclang || "";
      if (!dtLang) return false;
      return dtLang === lang || dtLang.startsWith(lang) || lang.startsWith(dtLang);
    });
    if (dashIndex < 0) {
      dashIndex = this._dashTextTracks.findIndex((dt) => {
        const dtLabel = (dt.label || dt.labels || "").toString().toLowerCase();
        return dtLabel.includes(lang.toLowerCase());
      });
    }
    if (dashIndex < 0) return false;
    this.player.log(`Activating DASH text track index ${dashIndex} for transcript language "${lang}"`);
    try {
      this.dash.setTextTrack(dashIndex);
    } catch (err) {
    }
    if (this.media.paused) {
      const pos = this.media.currentTime;
      const wasMuted = this.media.muted;
      this.media.muted = true;
      const playPromise = this.media.play();
      const doPause = () => {
        if (this.media && !this.media.paused) {
          this.media.pause();
          this.media.muted = wasMuted;
          if (Math.abs(this.media.currentTime - pos) > 0.5) {
            this.media.currentTime = pos;
          }
        }
      };
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(() => {
          this._setTimeout(doPause, 250);
        }).catch(() => {
          this.media.muted = wasMuted;
        });
      } else {
        this._setTimeout(doPause, 250);
      }
    }
    if (!this._dashTextIsTtml) {
      this._lastKnownCueCount = 0;
      this._startCueUpdatePolling();
    }
    return true;
  }
  getTextTrackURLs() {
    if (!this.dash || !this._manifestUrl) return [];
    try {
      const manifest = this.dash.getManifest?.();
      if (!manifest) return [];
      const baseUrl = this._manifestUrl.substring(0, this._manifestUrl.lastIndexOf("/") + 1);
      const results = [];
      const periods = manifest.Period || manifest.period || (manifest.periods ? manifest.periods : [manifest]);
      for (const period of Array.isArray(periods) ? periods : [periods]) {
        const adaptSets = period.AdaptationSet || period.adaptationSet || period.AdaptationSet_asArray || [];
        for (const as of Array.isArray(adaptSets) ? adaptSets : [adaptSets]) {
          const ct = as.contentType || as.ContentType || "";
          const mime = as.mimeType || as.MimeType || "";
          if (ct !== "text" && !/text\/vtt|application\/ttml/i.test(mime)) continue;
          const lang = as.lang || as.language || "";
          const reps = as.Representation || as.representation || as.Representation_asArray || [];
          for (const rep of Array.isArray(reps) ? reps : [reps]) {
            const bu = rep.BaseURL || rep.baseURL || rep.BaseURL_asArray;
            const rawUrl = Array.isArray(bu) ? bu[0]?.__text || bu[0] : bu?.__text || bu;
            if (!rawUrl) continue;
            const url = rawUrl.startsWith("http") ? rawUrl : new URL(rawUrl, baseUrl).href;
            results.push({ lang, url });
            break;
          }
        }
      }
      return results;
    } catch {
      return [];
    }
  }
  supportsAutoQuality() {
    return true;
  }
  isAutoQuality() {
    if (!this.dash) return true;
    try {
      if (typeof this.dash.getAutoSwitchQualityFor === "function") {
        return this.dash.getAutoSwitchQualityFor("video");
      }
      const settings = this.dash.getSettings();
      return settings?.streaming?.abr?.autoSwitchBitrate?.video !== false;
    } catch (e) {
      return true;
    }
  }
  destroy() {
    this._pendingTimeouts.forEach((id) => clearTimeout(id));
    this._pendingTimeouts = [];
    this._stopCueUpdatePolling();
    this._lastKnownCueCount = 0;
    if (this._captionEnabledHandler) {
      this.player.off("captionsenabled", this._captionEnabledHandler);
      this._captionEnabledHandler = null;
    }
    if (this._captionDisabledHandler) {
      this.player.off("captionsdisabled", this._captionDisabledHandler);
      this._captionDisabledHandler = null;
    }
    if (this._ttmlDiv && this._ttmlDiv.parentNode) {
      this._ttmlDiv.parentNode.removeChild(this._ttmlDiv);
      this._ttmlDiv = null;
    }
    const textTracks = this.media.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        track._vidplyStale = true;
        track.mode = "disabled";
      }
    }
    if (this.dash) {
      try {
        this.dash.updateSettings({ debug: { logLevel: 0 } });
        this.dash.reset();
      } catch (e) {
      }
      try {
        this.dash.destroy();
      } catch (e) {
      }
      this.dash = null;
    }
    this._dashTextTracks = [];
    this._dashTextIsTtml = false;
    this._manifestUrl = null;
  }
};
export {
  DASHRenderer
};
//# sourceMappingURL=vidply.DASHRenderer-SOXXCGZJ.js.map
