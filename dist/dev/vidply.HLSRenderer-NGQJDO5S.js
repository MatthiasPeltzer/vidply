/*!
 * VidPly v1.2.14 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  loadPinnedScript
} from "./vidply.chunk-TEQ45FGM.js";

// src/renderers/HLSRenderer.ts
var HLSRenderer = class {
  rendererType = "hls";
  player;
  media;
  hls;
  // True once hls.js is driving playback via MSE. Native HLS playback on
  // iOS / iPadOS keeps a real HTTP URL on the <video> and does not need the
  // streaming path to be forced.
  get isStreaming() {
    return this.hls !== null && this.hls !== void 0;
  }
  _hlsSourceLoaded;
  _pendingSrc;
  _hlsSubtitleTracksCount;
  _cueUpdateTimer;
  _lastKnownCueCount;
  _lastKnownMaxCueStart;
  _nativeTrackListenersDestroyed;
  _didDeferredLoad;
  _manifestUrl;
  /**
   * True when the most recent startLoad() call was triggered by a seek on a
   * paused media element (not by play()). The FRAG_BUFFERED handler uses this
   * to call stopLoad() once the seek target is buffered, so hls.js does not
   * keep pre-fetching subsequent segments while the user is still paused.
   */
  _loadingForSeekOnly;
  _cleanupNativeTextTrackListeners;
  // Detaches all hls.js-path media listeners (attachMediaEvents) in destroy().
  _listenerController;
  // Pending setTimeout ids so destroy() can cancel retries that would
  // otherwise fire (and touch a torn-down player) after teardown.
  _timers;
  // Tracked 'ready' listener registered by updateCaptionButtonsForHls when the
  // control bar isn't built yet; removed on destroy if it never fired.
  _pendingReadyHandler;
  _boundLiveChangeHandler;
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.hls = null;
    this._hlsSourceLoaded = false;
    this._pendingSrc = null;
    this._hlsSubtitleTracksCount = void 0;
    this._cueUpdateTimer = null;
    this._lastKnownCueCount = 0;
    this._lastKnownMaxCueStart = -1;
    this._manifestUrl = null;
    this._cleanupNativeTextTrackListeners = () => {
    };
    this._listenerController = new AbortController();
    this._timers = /* @__PURE__ */ new Set();
    this._pendingReadyHandler = null;
    this._boundLiveChangeHandler = null;
  }
  /**
   * Schedule a timeout that is automatically cancelled by destroy(). Prevents
   * caption-retry / error-recovery callbacks from running after teardown.
   */
  _setTimeout(handler, ms) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      handler();
    }, ms);
    this._timers.add(id);
  }
  _clearTimers() {
    for (const id of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
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
    const { HTML5Renderer } = await import("./vidply.HTML5Renderer-N5G3UJ3K.js");
    const native = new HTML5Renderer(this.player);
    await native.init();
    this.play = () => native.play();
    this.pause = () => native.pause();
    this.seek = (time) => native.seek(time);
    this.setVolume = (volume) => native.setVolume(volume);
    this.setMuted = (muted) => native.setMuted(muted);
    this.setPlaybackSpeed = (speed) => native.setPlaybackSpeed(speed);
    this.ensureLoaded = () => native.ensureLoaded?.();
    this.getQualities = () => native.getQualities?.() ?? [];
    this.switchQuality = (index) => native.switchQuality?.(index);
    this.getCurrentQuality = () => native.getCurrentQuality?.() ?? 0;
    this._attachNativeTextTrackListeners();
    this.destroy = () => {
      this._cleanupNativeTextTrackListeners();
      this._clearTimers();
      if (this._pendingReadyHandler) {
        this.player.off("ready", this._pendingReadyHandler);
        this._pendingReadyHandler = null;
      }
      native.destroy();
    };
  }
  /**
   * Listen for HLS-exposed text tracks so captions/transcript buttons appear on native HLS.
   * Debounces rapid addtrack bursts (one per subtitle rendition in the manifest).
   */
  _attachNativeTextTrackListeners() {
    let debounceTimer;
    const checkTracks = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this._nativeTrackListenersDestroyed) return;
        const tracks = this.media.textTracks;
        let count = 0;
        for (let i = 0; i < tracks.length; i++) {
          const k = tracks[i]?.kind;
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
    const HlsCtor = window.Hls;
    if (!HlsCtor?.isSupported()) {
      throw new Error("HLS is not supported in this browser");
    }
    const sourceElements = Array.from(this.media.querySelectorAll("source"));
    let originalSrc = null;
    if (sourceElements.length > 0) {
      originalSrc = sourceElements[0]?.getAttribute("src") ?? null;
      sourceElements.forEach((source) => source.remove());
      this.player.log("Removed <source> elements for HTML5 validity (hls.js uses src attribute)");
    }
    this.hls = new HlsCtor({
      debug: this.player.options.debug,
      // Never let hls.js auto-start segment loading. loadSource() alone fetches
      // the manifest (needed for duration, quality levels, subtitle tracks) but
      // startLoad() is what kicks off media fragment downloads. We defer that
      // to the first play() (or ensureLoaded() for playlists) so paused HLS
      // players don't pre-download the entire stream the way hls.js does by
      // default. This matches dash.js behavior where initialize(media, null, false)
      // only loads the init segment + minimal startup buffer.
      autoStartLoad: false,
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      // Buffer ceilings tuned to roughly match dash.js defaults so HLS and DASH
      // behave similarly in terms of pre-fetched data:
      //  - maxBufferLength (12s) ≈ dash.js bufferTimeDefault: 12
      //  - maxMaxBufferLength (60s) ≈ dash.js bufferTimeAtTopQualityLongForm: 60
      //  - maxBufferSize (30 MB) — byte cap, hit first on high-bitrate streams.
      // For typical 6s segments this keeps ~2 segments buffered ahead during
      // playback. Combined with stopLoad() on pause(), zero segments are
      // pre-fetched when paused.
      maxBufferLength: 12,
      maxMaxBufferLength: 60,
      maxBufferSize: 30 * 1e3 * 1e3,
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
    this._pendingSrc = src;
    this._manifestUrl = src;
    this.hls.loadSource(src);
    this._hlsSourceLoaded = true;
    this.attachHlsEvents();
    this.attachMediaEvents();
  }
  /**
   * Load hls.js. Pinned to an exact version by default (no more `@latest`) and
   * shipped with a matching Subresource Integrity hash, so the default CDN
   * script is verified out of the box. Embedders who self-host can override via:
   *   - `options.hlsScriptUrl` (URL to load from)
   *   - `options.hlsScriptIntegrity` (Subresource Integrity hash, e.g.
   *     `sha384-XXXX`)
   *
   * The built-in hash only applies to the pinned default URL. A custom URL
   * without an explicit integrity gets none — we can't know its hash. Generate
   * a hash for a new pin/URL with:
   *   curl -sSL <url> | openssl dgst -sha384 -binary | openssl base64 -A
   * and prefix with `sha384-`.
   */
  async loadHlsJs() {
    return loadPinnedScript({
      defaultUrl: "https://cdn.jsdelivr.net/npm/hls.js@1.7.2/dist/hls.min.js",
      defaultIntegrity: "sha384-xZKOEqJSfUEI1E4N6MG1+KjnKYM1R1v2WKpyaS0c+ksIxRi5PB8MAkyEdX48MX2/",
      url: this.player.options.hlsScriptUrl,
      integrity: this.player.options.hlsScriptIntegrity
    });
  }
  attachHlsEvents() {
    const hls = this.hls;
    const Hls = window.Hls;
    if (!hls || !Hls) return;
    hls.on(Hls.Events.MANIFEST_PARSED, (...args) => {
      const data = args[1];
      this.player.log("HLS manifest loaded, found " + data.levels.length + " quality levels");
      this.player.emit("hlsmanifestparsed", data);
      this.player.liveStreamManager?.evaluateHls(this.hls);
      void this._probeHlsLevelPlaylistLive();
      if (this.player.container) {
        this.player.container.classList.remove("vidply-external-controls");
      }
      this._setTimeout(() => {
        if (this._hlsSubtitleTracksCount === void 0 || this._hlsSubtitleTracksCount === 0) {
          const currentCount = this.hls?.subtitleTracks?.length || 0;
          if (currentCount === 0) {
            this._hlsSubtitleTracksCount = 0;
            this.updateCaptionButtonsForHls();
          }
        }
      }, 500);
    });
    hls.on(Hls.Events.LEVEL_UPDATED, () => {
      this.player.liveStreamManager?.evaluateHls(this.hls);
    });
    this._boundLiveChangeHandler = (isLive) => {
      if (this._cueUpdateTimer) {
        this._startCueUpdatePolling();
      }
      if (!isLive && (this.hls?.subtitleTrack ?? -1) >= 0) {
        this._ensureHlsSubtitleTrackActive();
      }
    };
    this.player.on("livechange", this._boundLiveChangeHandler);
    hls.on(Hls.Events.LEVEL_SWITCHED, (...args) => {
      const data = args[1];
      this.player.log("HLS level switched to " + data.level);
      this.player.emit("hlslevelswitched", data);
    });
    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (...args) => {
      const data = args[1];
      this.player.log("HLS subtitle tracks updated, found " + data.subtitleTracks.length + " tracks");
      this.player.emit("hlssubtitletracksupdated", data);
      this._hlsSubtitleTracksCount = data.subtitleTracks.length;
      this.updateCaptionButtonsForHls();
      if (data.subtitleTracks.length > 0) {
        this._startCueUpdatePolling();
        this._ensureHlsSubtitleTrackActive();
      }
    });
    hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (...args) => {
      const data = args[1];
      this.player.log("HLS subtitle track switched to " + data.id);
      this.player.emit("hlssubtitletrackswitch", data);
      this._lastKnownCueCount = 0;
      this._startCueUpdatePolling();
    });
    hls.on(Hls.Events.ERROR, (...args) => {
      this.handleHlsError(args[1]);
    });
    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      this.player.state.buffering = false;
      this.player.liveStreamManager?.evaluateHls(this.hls);
      if (!this.media.paused) {
        this._loadingForSeekOnly = false;
      } else if (this._loadingForSeekOnly && this._isTimeBuffered(this.media.currentTime)) {
        this._loadingForSeekOnly = false;
        try {
          hls.stopLoad();
        } catch {
        }
      }
    });
    hls.on(Hls.Events.SUBTITLE_FRAG_PROCESSED, (...args) => {
      const data = args[1];
      if (!data || !data.success) return;
      this._emitTextCuesUpdateIfChanged();
    });
    hls.on(Hls.Events.CUES_PARSED, () => {
      this.player.emit("textcuesupdate");
    });
  }
  _getTotalCueCount() {
    const textTracks = this.media.textTracks;
    let total = 0;
    if (!textTracks) return total;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track && (track.kind === "subtitles" || track.kind === "captions") && track.cues) {
        total += track.cues.length;
      }
    }
    return total;
  }
  _getMaxCueStartTime() {
    const textTracks = this.media.textTracks;
    if (!textTracks) {
      return -1;
    }
    let max = -1;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (!track || track.kind !== "subtitles" && track.kind !== "captions" || !track.cues) {
        continue;
      }
      for (let j = 0; j < track.cues.length; j++) {
        const cue = track.cues[j];
        if (cue && cue.startTime > max) {
          max = cue.startTime;
        }
      }
    }
    return max;
  }
  _isLivePlayback() {
    return typeof this.player.isLiveStream === "function" && this.player.isLiveStream();
  }
  /**
   * Live HLS keeps a rolling TextTrack window — cue count plateaus while
   * content keeps changing. Emit when count or latest cue time advances.
   */
  _emitTextCuesUpdateIfChanged() {
    const count = this._getTotalCueCount();
    const maxStart = this._getMaxCueStartTime();
    const isLive = this._isLivePlayback();
    if (isLive || count > this._lastKnownCueCount || maxStart > this._lastKnownMaxCueStart) {
      this._lastKnownCueCount = count;
      this._lastKnownMaxCueStart = maxStart;
      this.player.emit("textcuesupdate");
      return true;
    }
    return false;
  }
  /**
   * Return true if `time` falls inside any TimeRange the SourceBuffer already
   * holds, with a small tolerance to absorb GOP boundaries. Used by the
   * seeking handler to decide whether to surface a 'waiting' event for the
   * spinner UI.
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
  _startCueUpdatePolling() {
    this._stopCueUpdatePolling();
    let prevCueCount = 0;
    let prevMaxStart = -1;
    let stableRounds = 0;
    this._cueUpdateTimer = setInterval(() => {
      const count = this._getTotalCueCount();
      const maxStart = this._getMaxCueStartTime();
      const isLive = this._isLivePlayback();
      if (isLive) {
        if (count > prevCueCount || maxStart > prevMaxStart) {
          prevCueCount = count;
          prevMaxStart = maxStart;
          this._lastKnownCueCount = count;
          this._lastKnownMaxCueStart = maxStart;
          this.player.emit("textcuesupdate");
        }
        return;
      }
      if (count > prevCueCount || maxStart > prevMaxStart) {
        prevCueCount = count;
        prevMaxStart = maxStart;
        stableRounds = 0;
        this._lastKnownCueCount = count;
        this._lastKnownMaxCueStart = maxStart;
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
  /**
   * Update caption buttons based on HLS subtitle tracks
   * Handles the case where control bar may not exist yet
   */
  updateCaptionButtonsForHls(retryCount = 0) {
    const tracksCount = this._hlsSubtitleTracksCount || 0;
    const doUpdate = () => {
      this.player.invalidateTrackCache();
      if (tracksCount > 0) {
        if (this.player.captionManager) {
          const found = this.player.captionManager.refreshTracks();
          if (found === 0 && retryCount < 5) {
            const delay = (retryCount + 1) * 200;
            this.player.log(`HLS caption tracks not yet on video element, retrying in ${delay}ms (attempt ${retryCount + 1})`, "info");
            this._setTimeout(() => {
              this.updateCaptionButtonsForHls(retryCount + 1);
            }, delay);
            return;
          }
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
      this._pendingReadyHandler = null;
      doUpdate();
    };
    this._pendingReadyHandler = onReady;
    this.player.on("ready", onReady);
  }
  /**
   * With `autoStartLoad: false`, hls.js does not fetch level playlists until play.
   * Fetch the active variant playlist once so live/VOD controls are correct pre-play.
   */
  async _probeHlsLevelPlaylistLive() {
    const hls = this.hls;
    const manager = this.player.liveStreamManager;
    if (!hls || !manager || manager.getSourceReportsLive() !== null) {
      return;
    }
    const levelIndex = hls.currentLevel >= 0 ? hls.currentLevel : 0;
    const level = hls.levels?.[levelIndex];
    if (!level) {
      return;
    }
    const rawUrl = Array.isArray(level.url) ? level.url[0] : level.url;
    if (typeof rawUrl !== "string" || rawUrl === "") {
      return;
    }
    try {
      const res = await fetch(rawUrl, { signal: this.player.lifecycleSignal });
      if (!res.ok) {
        return;
      }
      const playlistLive = manager.parseHlsMediaPlaylistLive(await res.text());
      if (playlistLive !== null) {
        manager.reportSourceLive(playlistLive);
      }
    } catch {
    }
  }
  attachMediaEvents() {
    const { signal } = this._listenerController;
    this.media.addEventListener("loadedmetadata", () => {
      this.player.state.duration = this.media.duration;
      this.player.emit("loadedmetadata");
    }, { signal });
    this.media.addEventListener("durationchange", () => {
      const duration = this.media.duration;
      if (duration && isFinite(duration) && duration > 0) {
        this.player.state.duration = duration;
        this.player.emit("durationchange", duration);
      }
    }, { signal });
    this.media.addEventListener("play", () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit("play");
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    }, { signal });
    this.media.addEventListener("pause", () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit("pause");
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    }, { signal });
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
    }, { signal });
    this.media.addEventListener("timeupdate", () => {
      this.player.state.currentTime = this.media.currentTime;
      this.player.emit("timeupdate", this.media.currentTime);
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
      }
    }, { signal });
    this.media.addEventListener("volumechange", () => {
      if (!this.player.shouldSyncVolumeFromMedia()) {
        return;
      }
      this.player.state.volume = this.media.volume;
      this.player.state.muted = this.media.muted;
      this.player.emit("volumechange", this.media.volume);
    }, { signal });
    this.media.addEventListener("waiting", () => {
      this.player.state.buffering = true;
      this.player.emit("waiting");
    }, { signal });
    this.media.addEventListener("seeking", () => {
      this.player.state.seeking = true;
      this.player.emit("seeking");
      if (!this._isTimeBuffered(this.media.currentTime)) {
        this.player.state.buffering = true;
        this.player.emit("waiting");
      }
    }, { signal });
    this.media.addEventListener("seeked", () => {
      this.player.state.seeking = false;
      this.player.emit("seeked");
      if (this.media.paused && this.hls) {
        try {
          this.hls.stopLoad();
        } catch {
        }
      }
    }, { signal });
    this.media.addEventListener("canplay", () => {
      this.player.state.buffering = false;
      this.player.emit("canplay");
    }, { signal });
    this.media.addEventListener("error", () => {
      this.player.handleError(this.media.error);
    }, { signal });
  }
  handleHlsError(data) {
    this.player.log(`HLS Error - Type: ${data.type}, Details: ${data.details}, Fatal: ${data.fatal}`, "warn");
    if (data.response) {
      this.player.log(`Response code: ${data.response.code}, URL: ${data.response.url}`, "warn");
    }
    if (data.fatal) {
      const ErrorTypes = window.Hls?.ErrorTypes;
      switch (data.type) {
        case ErrorTypes?.NETWORK_ERROR:
          this.player.log("Fatal network error, trying to recover...", "error");
          this.player.log(`Network error details: ${data.details}`, "error");
          this._setTimeout(() => {
            this.hls?.startLoad();
          }, 1e3);
          break;
        case ErrorTypes?.MEDIA_ERROR:
          this.player.log("Fatal media error, trying to recover...", "error");
          this.hls?.recoverMediaError();
          break;
        default:
          this.player.log("Fatal error, cannot recover", "error");
          this.player.handleError(new Error(`HLS Error: ${data.type} - ${data.details}`));
          this.hls?.destroy();
          break;
      }
    } else {
      this.player.log("Non-fatal HLS error: " + data.details, "warn");
    }
  }
  /**
   * Begin fetching media fragments without starting playback. Used by the
   * playlist manager when a track is selected so playback can start quickly
   * once the user hits play. The manifest was already loaded in initHlsJs();
   * this call is just the equivalent of "press play without playing".
   */
  ensureLoaded() {
    if (!this.hls) {
      return;
    }
    if (this._didDeferredLoad) {
      return;
    }
    try {
      this.hls.startLoad(-1);
    } catch {
    }
    this._didDeferredLoad = true;
  }
  play() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (this.hls) {
      this._loadingForSeekOnly = false;
      try {
        this.hls.startLoad(-1);
      } catch {
      }
      this._didDeferredLoad = true;
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
    if (this.hls) {
      try {
        this.hls.stopLoad();
      } catch {
      }
    }
  }
  seek(time) {
    this.media.currentTime = time;
    if (this.hls) {
      if (this.media.paused) {
        this._loadingForSeekOnly = true;
      }
      try {
        this.hls.startLoad(-1);
      } catch {
      }
    }
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
  activateTextTrackForLanguage(lang) {
    if (!this.hls || !lang) return false;
    const tracks = this.hls.subtitleTracks;
    if (!tracks || tracks.length === 0) return false;
    const idx = tracks.findIndex((t) => {
      const tLang = t.lang || t.language || "";
      return tLang === lang || tLang.startsWith(lang) || lang.startsWith(tLang);
    });
    if (idx < 0) return false;
    this.player.log(`Activating HLS subtitle track index ${idx} for language "${lang}"`);
    this.hls.subtitleTrack = idx;
    this._lastKnownCueCount = 0;
    this._startCueUpdatePolling();
    return true;
  }
  /**
   * hls.js does not download subtitle segments until a subtitle rendition is
   * selected. Activate the default (or first) track when captions/transcript
   * should be on so live streams receive rolling WebVTT cues.
   */
  _ensureHlsSubtitleTrackActive() {
    if (!this.hls?.subtitleTracks?.length) {
      return;
    }
    const wantsSubtitles = this.player.state.captionsEnabled || this.player.options.captionsDefault || this.player.transcriptManager?.isVisible;
    if (!wantsSubtitles) {
      return;
    }
    if (this.hls.subtitleTrack >= 0) {
      return;
    }
    const tracks = this.hls.subtitleTracks;
    const defaultIdx = tracks.findIndex((t) => t.default);
    const idx = defaultIdx >= 0 ? defaultIdx : 0;
    this.hls.subtitleTrack = idx;
    this._lastKnownCueCount = 0;
    this._startCueUpdatePolling();
    this.player.log(`HLS subtitle track auto-selected: index ${idx}`, "info");
  }
  getTextTrackURLs() {
    if (!this.hls || !this._manifestUrl) return [];
    try {
      const tracks = this.hls.subtitleTracks;
      if (!tracks || tracks.length === 0) return [];
      const results = [];
      for (const track of tracks) {
        const lang = track.lang || track.language || "";
        const playlistUrl = track.url;
        if (!lang || !playlistUrl) continue;
        results.push({ lang, url: playlistUrl });
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
    return this.hls?.currentLevel === -1;
  }
  destroy() {
    this._stopCueUpdatePolling();
    this._clearTimers();
    this._listenerController.abort();
    if (this._pendingReadyHandler) {
      this.player.off("ready", this._pendingReadyHandler);
      this._pendingReadyHandler = null;
    }
    if (this._boundLiveChangeHandler) {
      this.player.off("livechange", this._boundLiveChangeHandler);
      this._boundLiveChangeHandler = null;
    }
    this._lastKnownCueCount = 0;
    this._manifestUrl = null;
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
};
export {
  HLSRenderer
};
//# sourceMappingURL=vidply.HLSRenderer-NGQJDO5S.js.map
