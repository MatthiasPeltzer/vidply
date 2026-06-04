import type { Renderer, QualityLevel } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
import { loadScriptOnce } from '../utils/ScriptLoader.js';

/** Subset of payloads emitted by hls.js events that we actually consume. */
interface HlsManifestParsedData {
  levels: HlsLevel[];
}

interface HlsLevelSwitchedData {
  level: number;
}

interface HlsSubtitleTracksUpdatedData {
  subtitleTracks: HlsSubtitleTrack[];
}

interface HlsSubtitleTrackSwitchData {
  id: number;
}

interface HlsSubtitleFragProcessedData {
  success?: boolean;
}

export class HLSRenderer implements Renderer {
  player: Player;
  media: HTMLMediaElement;
  hls: HlsInstance | null;

  // True once hls.js is driving playback via MSE. Native HLS playback on
  // iOS / iPadOS keeps a real HTTP URL on the <video> and does not need the
  // streaming path to be forced.
  get isStreaming(): boolean {
    return this.hls !== null && this.hls !== undefined;
  }

  _hlsSourceLoaded: boolean;
  _pendingSrc: string | null;
  _hlsSubtitleTracksCount: number | undefined;
  _cueUpdateTimer: ReturnType<typeof setInterval> | null;
  _lastKnownCueCount: number;
  _nativeTrackListenersDestroyed?: boolean;
  _didDeferredLoad?: boolean;
  _manifestUrl: string | null;
  /**
   * True when the most recent startLoad() call was triggered by a seek on a
   * paused media element (not by play()). The FRAG_BUFFERED handler uses this
   * to call stopLoad() once the seek target is buffered, so hls.js does not
   * keep pre-fetching subsequent segments while the user is still paused.
   */
  _loadingForSeekOnly?: boolean;
  _cleanupNativeTextTrackListeners: () => void;
  // Detaches all hls.js-path media listeners (attachMediaEvents) in destroy().
  private _listenerController: AbortController;
  // Pending setTimeout ids so destroy() can cancel retries that would
  // otherwise fire (and touch a torn-down player) after teardown.
  private _timers: Set<ReturnType<typeof setTimeout>>;
  // Tracked 'ready' listener registered by updateCaptionButtonsForHls when the
  // control bar isn't built yet; removed on destroy if it never fired.
  private _pendingReadyHandler: (() => void) | null;

  constructor(player: Player) {
    this.player = player;
    this.media = player.element;
    this.hls = null;
    this._hlsSourceLoaded = false;
    this._pendingSrc = null;
    this._hlsSubtitleTracksCount = undefined;
    this._cueUpdateTimer = null;
    this._lastKnownCueCount = 0;
    this._manifestUrl = null;
    this._cleanupNativeTextTrackListeners = () => {};
    this._listenerController = new AbortController();
    this._timers = new Set();
    this._pendingReadyHandler = null;
  }

  /**
   * Schedule a timeout that is automatically cancelled by destroy(). Prevents
   * caption-retry / error-recovery callbacks from running after teardown.
   */
  private _setTimeout(handler: () => void, ms: number): void {
    const id = setTimeout(() => {
      this._timers.delete(id);
      handler();
    }, ms);
    this._timers.add(id);
  }

  private _clearTimers(): void {
    for (const id of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
  }

  async init() {
    // Check if browser natively supports HLS (Safari)
    if (this.canPlayNatively()) {
      this.player.log('Using native HLS support');
      await this.initNative();
    } else {
      this.player.log('Using hls.js for HLS support');
      await this.initHlsJs();
    }
  }

  canPlayNatively() {
    // Use native HLS only on iOS/iPadOS (MSE unavailable); desktop macOS Safari uses hls.js
    // for quality switching and parity with Chrome/Firefox.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // iPad in desktop mode reports MacIntel but has touch
    const isIPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    if (!isIOS && !isIPadDesktopMode) {
      return false;
    }

    const video = document.createElement('video');
    return video.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  async initNative() {
    // Native HLS (iOS / iPadOS): the <video> element plays the HLS URL
    // directly, so we delegate the playback surface to an HTML5Renderer via
    // composition rather than grafting its prototype methods onto this
    // instance. hls.js is never created on this path (this.hls stays null),
    // and this.media already references the same player.element the delegate
    // drives, so quality/caption inspection keeps working.
    const { HTML5Renderer } = await import('./HTML5Renderer.js');
    const native = new HTML5Renderer(this.player);
    await native.init();

    // Forward the externally-invoked Renderer surface to the delegate. The
    // delegate's own internal helpers (attachEvents, pauseOtherPlayers, …)
    // run via these calls, so they don't need explicit forwarding. HLS-only
    // methods (attachHlsEvents, handleHlsError, supportsAutoQuality, …) keep
    // their HLSRenderer implementations.
    this.play = () => native.play();
    this.pause = () => native.pause();
    this.seek = (time: number) => native.seek(time);
    this.setVolume = (volume: number) => native.setVolume(volume);
    this.setMuted = (muted: boolean) => native.setMuted(muted);
    this.setPlaybackSpeed = (speed: number) => native.setPlaybackSpeed(speed);
    this.ensureLoaded = () => native.ensureLoaded?.();
    this.getQualities = () => native.getQualities?.() ?? [];
    this.switchQuality = (index: number) => native.switchQuality?.(index);
    this.getCurrentQuality = () => native.getCurrentQuality?.() ?? 0;

    this._attachNativeTextTrackListeners();

    // destroy() delegates to the native renderer but also tears down the
    // native text-track listeners, caption-retry timers and any deferred
    // 'ready' handler scheduled by updateCaptionButtonsForHls.
    this.destroy = () => {
      this._cleanupNativeTextTrackListeners();
      this._clearTimers();
      if (this._pendingReadyHandler) {
        this.player.off('ready', this._pendingReadyHandler);
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
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const checkTracks = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this._nativeTrackListenersDestroyed) return;
        const tracks = this.media.textTracks;
        let count = 0;
        for (let i = 0; i < tracks.length; i++) {
          const k = tracks[i]?.kind;
          if (k === 'subtitles' || k === 'captions') {
            count++;
          }
        }
        this._hlsSubtitleTracksCount = count;
        this.updateCaptionButtonsForHls();
      }, 150);
    };

    this.media.textTracks.addEventListener('addtrack', checkTracks);
    this.media.textTracks.addEventListener('removetrack', checkTracks);
    this.media.addEventListener('loadedmetadata', checkTracks);

    this._cleanupNativeTextTrackListeners = () => {
      this._nativeTrackListenersDestroyed = true;
      clearTimeout(debounceTimer);
      this.media.textTracks.removeEventListener('addtrack', checkTracks);
      this.media.textTracks.removeEventListener('removetrack', checkTracks);
      this.media.removeEventListener('loadedmetadata', checkTracks);
    };
  }

  async initHlsJs() {
    // Hide native controls
    this.media.controls = false;
    this.media.removeAttribute('controls');
    
    // Load hls.js if not already loaded
    if (!window.Hls) {
      await this.loadHlsJs();
    }

    const HlsCtor = window.Hls;
    if (!HlsCtor?.isSupported()) {
      throw new Error('HLS is not supported in this browser');
    }

    // HTML5 spec: If video has src attribute, <source> children are not allowed.
    // hls.js sets a blob: URL on the src attribute, so we must remove any <source> elements
    // to maintain valid HTML. Store the original source URL first.
    const sourceElements = Array.from(this.media.querySelectorAll('source'));
    let originalSrc = null;
    if (sourceElements.length > 0) {
      originalSrc = sourceElements[0]?.getAttribute('src') ?? null;
      sourceElements.forEach(source => source.remove());
      this.player.log('Removed <source> elements for HTML5 validity (hls.js uses src attribute)');
    }

    // Create hls.js instance with better error recovery
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
      maxBufferSize: 30 * 1000 * 1000,
      maxBufferHole: 0.5,
      // Network retry settings
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 4,
      manifestLoadingRetryDelay: 1000,
      manifestLoadingMaxRetryTimeout: 64000,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 4,
      levelLoadingRetryDelay: 1000,
      levelLoadingMaxRetryTimeout: 64000,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 64000
    });

    // Attach media element
    this.hls.attachMedia(this.media);

    // Load source - use currentSource for external renderers, or get from attribute
    // Priority: currentSource > originalSrc (from removed <source>) > data-vidply-src > src attribute
    let src = this.player.currentSource;
    
    if (!src && originalSrc) {
      src = originalSrc;
    }
    
    if (!src) {
      // Try data-vidply-src attribute (used by TYPO3 integration)
      src = this.player.element.getAttribute('data-vidply-src');
    }
    
    if (!src) {
      // Fallback to element's src attribute (but not blob: URLs)
      const elementSrc = this.player.element.getAttribute('src') || this.player.element.src;
      if (elementSrc && !elementSrc.startsWith('blob:')) {
        src = elementSrc;
      }
    }
    
    this.player.log(`Loading HLS source: ${src}`, 'log');
    
    if (!src) {
      throw new Error('No HLS source found');
    }
    
    // Always load the manifest immediately so duration/quality levels/subtitle
    // tracks are available in the UI before playback. Because autoStartLoad is
    // false, this does NOT trigger media fragment downloads; startLoad() in
    // play() / ensureLoaded() does.
    this._pendingSrc = src;
    this._manifestUrl = src;
    this.hls.loadSource(src);
    this._hlsSourceLoaded = true;

    // Attach events
    this.attachHlsEvents();
    this.attachMediaEvents();
  }

  /**
   * Load hls.js. Pinned to an exact version by default (no more `@latest`).
   * Embedders who self-host or who want SRI protection can override via:
   *   - `options.hlsScriptUrl` (URL to load from)
   *   - `options.hlsScriptIntegrity` (Subresource Integrity hash, e.g.
   *     `sha384-XXXX`)
   *
   * Generate the SRI hash with:
   *   curl -sSL <url> | openssl dgst -sha384 -binary | openssl base64 -A
   * and prefix with `sha384-`. SRI is opt-in because hash drift would
   * silently break playback for consumers who upgrade hls.js.
   */
  async loadHlsJs(): Promise<void> {
    const defaultUrl = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.16/dist/hls.min.js';
    const url: string = (this.player.options.hlsScriptUrl as string | undefined) || defaultUrl;
    const integrity = this.player.options.hlsScriptIntegrity as string | undefined;

    return loadScriptOnce(url, { integrity });
  }

  attachHlsEvents() {
    const hls = this.hls;
    const Hls = window.Hls;
    if (!hls || !Hls) return;

    hls.on(Hls.Events.MANIFEST_PARSED, (...args: unknown[]) => {
      const data = args[1] as HlsManifestParsedData;
      this.player.log('HLS manifest loaded, found ' + data.levels.length + ' quality levels');
      this.player.emit('hlsmanifestparsed', data);

      // Show VidPly controls (remove external controls class if present)
      if (this.player.container) {
        this.player.container.classList.remove('vidply-external-controls');
      }

      // Check for subtitle tracks after manifest parse
      // This handles streams without subtitles (SUBTITLE_TRACKS_UPDATED won't fire for them)
      this._setTimeout(() => {
        if (this._hlsSubtitleTracksCount === undefined || this._hlsSubtitleTracksCount === 0) {
          const currentCount = this.hls?.subtitleTracks?.length || 0;
          if (currentCount === 0) {
            this._hlsSubtitleTracksCount = 0;
            this.updateCaptionButtonsForHls();
          }
        }
      }, 500);
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (...args: unknown[]) => {
      const data = args[1] as HlsLevelSwitchedData;
      this.player.log('HLS level switched to ' + data.level);
      this.player.emit('hlslevelswitched', data);
    });

    // Handle HLS subtitle tracks
    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (...args: unknown[]) => {
      const data = args[1] as HlsSubtitleTracksUpdatedData;
      this.player.log('HLS subtitle tracks updated, found ' + data.subtitleTracks.length + ' tracks');
      this.player.emit('hlssubtitletracksupdated', data);
      this._hlsSubtitleTracksCount = data.subtitleTracks.length;
      this.updateCaptionButtonsForHls();
      if (data.subtitleTracks.length > 0) {
        this._startCueUpdatePolling();
      }
    });

    hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (...args: unknown[]) => {
      const data = args[1] as HlsSubtitleTrackSwitchData;
      this.player.log('HLS subtitle track switched to ' + data.id);
      this.player.emit('hlssubtitletrackswitch', data);
      this._lastKnownCueCount = 0;
      this._startCueUpdatePolling();
    });

    hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
      this.handleHlsError(args[1] as HlsErrorData);
    });

    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      this.player.state.buffering = false;

      // Seek-only loading: the user scrubbed the seekbar on a paused (or
      // never-played) media element. We only want hls.js to fetch enough
      // fragments to render the seek target frame and then stop, instead of
      // continuing to pre-fetch upcoming segments.
      //
      // FRAG_BUFFERED fires per track (audio and video have separate
      // SourceBuffers in hls.js), so the first event may fire after just the
      // audio fragment is appended — at which point media.buffered does not
      // yet cover the seek position because the video track is still loading.
      // Stopping there would abort the video fetch and leave the player on a
      // frozen frame. Checking _isTimeBuffered(currentTime) makes sure both
      // tracks actually cover the playhead before we call stopLoad.
      //
      // Playback resuming before this fires clears the flag so a later
      // mid-playback fragment doesn't accidentally stop the loader.
      if (!this.media.paused) {
        this._loadingForSeekOnly = false;
      } else if (this._loadingForSeekOnly && this._isTimeBuffered(this.media.currentTime)) {
        this._loadingForSeekOnly = false;
        try {
          hls.stopLoad();
        } catch {
          // ignore
        }
      }
    });

    // Subtitle fragments do NOT go through the media source buffer, so
    // FRAG_BUFFERED is unreliable for them. SUBTITLE_FRAG_PROCESSED fires
    // immediately after hls.js has parsed the WebVTT and appended cues to
    // the TextTrack via `addCueToTrack`, which is exactly when we need to
    // refresh captions/transcript UIs.
    hls.on(Hls.Events.SUBTITLE_FRAG_PROCESSED, (...args: unknown[]) => {
      const data = args[1] as HlsSubtitleFragProcessedData | undefined;
      if (!data || !data.success) return;
      const count = this._getTotalCueCount();
      if (count > this._lastKnownCueCount) {
        this._lastKnownCueCount = count;
        this.player.emit('textcuesupdate');
      }
    });

    // Some streams (e.g. IMSC1/TTML rendered externally by hls.js) deliver
    // their cues via CUES_PARSED instead of through a native TextTrack. Echo
    // that through to the transcript so it can refresh regardless of the
    // underlying subtitle format.
    hls.on(Hls.Events.CUES_PARSED, () => {
      this.player.emit('textcuesupdate');
    });
  }

  _getTotalCueCount() {
    const textTracks = this.media.textTracks;
    let total = 0;
    if (!textTracks) return total;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track && (track.kind === 'subtitles' || track.kind === 'captions') && track.cues) {
        total += track.cues.length;
      }
    }
    return total;
  }

  /**
   * Return true if `time` falls inside any TimeRange the SourceBuffer already
   * holds, with a small tolerance to absorb GOP boundaries. Used by the
   * seeking handler to decide whether to surface a 'waiting' event for the
   * spinner UI.
   */
  _isTimeBuffered(time: number): boolean {
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
    let stableRounds = 0;

    this._cueUpdateTimer = setInterval(() => {
      const count = this._getTotalCueCount();

      if (count > prevCueCount) {
        prevCueCount = count;
        stableRounds = 0;
        this.player.emit('textcuesupdate');
      } else {
        stableRounds++;
        if (stableRounds >= 8) {
          this._stopCueUpdatePolling();
          if (count > 0) {
            this.player.emit('textcuesupdate');
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

          // hls.js fires SUBTITLE_TRACKS_UPDATED when it knows about the
          // tracks, but the browser TextTrackList may not yet enumerate
          // the new TextTrack objects synchronously. Retry with increasing
          // delays until the tracks appear.
          if (found === 0 && retryCount < 5) {
            const delay = (retryCount + 1) * 200;
            this.player.log(`HLS caption tracks not yet on video element, retrying in ${delay}ms (attempt ${retryCount + 1})`, 'info');
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
      this.player.off('ready', onReady);
      this._pendingReadyHandler = null;
      doUpdate();
    };
    // Track so destroy() can detach it if 'ready' never fires.
    this._pendingReadyHandler = onReady;
    this.player.on('ready', onReady);
  }

  attachMediaEvents() {
    const { signal } = this._listenerController;

    // Use same events as HTML5 renderer
    this.media.addEventListener('loadedmetadata', () => {
      this.player.state.duration = this.media.duration;
      this.player.emit('loadedmetadata');
    }, { signal });

    this.media.addEventListener('durationchange', () => {
      const duration = this.media.duration;
      if (duration && isFinite(duration) && duration > 0) {
        this.player.state.duration = duration;
        this.player.emit('durationchange', duration);
      }
    }, { signal });

    this.media.addEventListener('play', () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit('play');
      
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    }, { signal });

    this.media.addEventListener('pause', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit('pause');
      
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    }, { signal });

    this.media.addEventListener('ended', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit('ended');
      
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
      
      if (this.player.options.loop) {
        this.player.seek(0);
        this.player.play();
      }
    }, { signal });

    this.media.addEventListener('timeupdate', () => {
      this.player.state.currentTime = this.media.currentTime;
      this.player.emit('timeupdate', this.media.currentTime);
      
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
      }
    }, { signal });

    this.media.addEventListener('volumechange', () => {
      this.player.state.volume = this.media.volume;
      this.player.state.muted = this.media.muted;
      this.player.emit('volumechange', this.media.volume);
    }, { signal });

    this.media.addEventListener('waiting', () => {
      this.player.state.buffering = true;
      this.player.emit('waiting');
    }, { signal });

    this.media.addEventListener('seeking', () => {
      this.player.state.seeking = true;
      this.player.emit('seeking');

      // Browsers fire `waiting` when playback can't continue due to missing
      // data, but they DO NOT fire it when seeking on a paused element. With
      // hls.js + stopLoad-on-pause, scrubbing while paused triggers a real
      // segment download, but the spinner stays hidden because no `waiting`
      // event reaches the buffering UI. Detect a seek into an unbuffered
      // range here and surface it as 'waiting' so the spinner appears. The
      // spinner is cleared again by the existing `canplay` / `seeked` paths.
      if (!this._isTimeBuffered(this.media.currentTime)) {
        this.player.state.buffering = true;
        this.player.emit('waiting');
      }
    }, { signal });

    this.media.addEventListener('seeked', () => {
      this.player.state.seeking = false;
      this.player.emit('seeked');

      // After a seek finishes while paused, hls.js otherwise keeps fetching
      // subsequent segments to fill maxBufferLength. The user explicitly chose
      // not to play, so calling stopLoad() halts the loader once the segment(s)
      // required to render the new playhead frame are buffered. play() and
      // future seeks re-arm via startLoad(-1).
      if (this.media.paused && this.hls) {
        try {
          this.hls.stopLoad();
        } catch {
          // ignore
        }
      }
    }, { signal });

    this.media.addEventListener('canplay', () => {
      this.player.state.buffering = false;
      this.player.emit('canplay');
    }, { signal });

    this.media.addEventListener('error', () => {
      this.player.handleError(this.media.error);
    }, { signal });
  }

  handleHlsError(data: HlsErrorData) {
    // Log detailed error info
    this.player.log(`HLS Error - Type: ${data.type}, Details: ${data.details}, Fatal: ${data.fatal}`, 'warn');
    if (data.response) {
      this.player.log(`Response code: ${data.response.code}, URL: ${data.response.url}`, 'warn');
    }

    if (data.fatal) {
      const ErrorTypes = window.Hls?.ErrorTypes;
      switch (data.type) {
        case ErrorTypes?.NETWORK_ERROR:
          this.player.log('Fatal network error, trying to recover...', 'error');
          this.player.log(`Network error details: ${data.details}`, 'error');
          this._setTimeout(() => {
            this.hls?.startLoad();
          }, 1000);
          break;

        case ErrorTypes?.MEDIA_ERROR:
          this.player.log('Fatal media error, trying to recover...', 'error');
          this.hls?.recoverMediaError();
          break;

        default:
          this.player.log('Fatal error, cannot recover', 'error');
          this.player.handleError(new Error(`HLS Error: ${data.type} - ${data.details}`));
          this.hls?.destroy();
          break;
      }
    } else {
      this.player.log('Non-fatal HLS error: ' + data.details, 'warn');
    }
  }

  /**
   * Begin fetching media fragments without starting playback. Used by the
   * playlist manager when a track is selected so playback can start quickly
   * once the user hits play. The manifest was already loaded in initHlsJs();
   * this call is just the equivalent of "press play without playing".
   */
  ensureLoaded() {
    // Native HLS path delegates to HTML5Renderer; if we got here and have no
    // hls.js instance, there is nothing to do.
    if (!this.hls) {
      return;
    }

    if (this._didDeferredLoad) {
      return;
    }

    try {
      this.hls.startLoad(-1);
    } catch {
      // ignore
    }
    this._didDeferredLoad = true;
  }

  play() {
    // Save scroll position to prevent browser from scrolling to video
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // (Re)start segment loading on every play. Cheap when already loading
    // (hls.js no-ops); needed after pause() called stopLoad() so the buffer
    // resumes filling. Passing -1 lets hls.js pick the starting position from
    // the current playhead instead of forcing one. Clearing the seek-only
    // flag here ensures FRAG_BUFFERED does not stop the loader mid-playback.
    if (this.hls) {
      this._loadingForSeekOnly = false;
      try {
        this.hls.startLoad(-1);
      } catch {
        // ignore and let media.play() surface errors if any
      }
      this._didDeferredLoad = true;
    }

    const promise = this.media.play();
    
    // Restore scroll position immediately to prevent auto-scroll
    window.scrollTo(scrollX, scrollY);
    
    if (promise !== undefined) {
      promise.catch(error => {
        this.player.log('Play failed:', error, 'warn');
      });
    }
  }

  pause() {
    this.media.pause();
    // Stop downloading further segments while paused. Already buffered data
    // stays in the SourceBuffer so resume is instant for short pauses; longer
    // pauses (or stop() = pause() + seek(0)) save bandwidth by not pre-fetching
    // content the user may never watch. play() / seek() re-arm via startLoad().
    if (this.hls) {
      try {
        this.hls.stopLoad();
      } catch {
        // ignore
      }
    }
  }

  seek(time: number) {
    this.media.currentTime = time;
    // If we're paused with the loader stopped and the user seeks outside the
    // currently buffered range, hls.js needs to fetch new fragments to render
    // the target frame. Calling startLoad(-1) here is safe regardless: when
    // already loading, hls.js no-ops; when stopped, it resumes from the new
    // currentTime so the seek shows a real frame instead of a frozen one.
    // The _loadingForSeekOnly flag tells FRAG_BUFFERED to stop the loader
    // again once the target segment is buffered, so paused/never-played
    // players don't keep pre-fetching beyond the seek point.
    if (this.hls) {
      if (this.media.paused) {
        this._loadingForSeekOnly = true;
      }
      try {
        this.hls.startLoad(-1);
      } catch {
        // ignore
      }
    }
  }

  setVolume(volume: number) {
    this.media.volume = volume;
  }

  setMuted(muted: boolean) {
    this.media.muted = muted;
  }

  setPlaybackSpeed(speed: number) {
    this.media.playbackRate = speed;
  }

  switchQuality(levelIndex: number) {
    if (this.hls) {
      this.hls.currentLevel = levelIndex;
    }
  }

  getQualities(): QualityLevel[] {
    if (this.hls && this.hls.levels) {
      // hls.js creates separate levels for each video+audio-group combination,
      // producing duplicates (e.g. three "720p" entries). Deduplicate by
      // resolution height, keeping the entry with the highest bitrate per height.
      type LevelEntry = { index: number; height: number; width: number; bitrate: number; level: HlsLevel };
      const byHeight = new Map<string | number, LevelEntry>();

      this.hls.levels.forEach((level: HlsLevel, index: number) => {
        const height = Number(level.height) || 0;
        const bitrate = Number(level.bitrate) || 0;
        const key: string | number = height > 0 ? height : `br_${bitrate}`;
        const existing = byHeight.get(key);

        if (!existing || bitrate > (existing.bitrate || 0)) {
          byHeight.set(key, { index, height: level.height, width: level.width, bitrate, level });
        }
      });

      return Array.from(byHeight.values()).map((entry) => {
        const height = Number(entry.height) || 0;
        const kb = entry.bitrate > 0 ? Math.round(entry.bitrate / 1000) : 0;
        const name = height > 0 ? `${height}p` : (kb > 0 ? `${kb} kb` : 'Auto');
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

  activateTextTrackForLanguage(lang: string): boolean {
    if (!this.hls || !lang) return false;

    const tracks = this.hls.subtitleTracks;
    if (!tracks || tracks.length === 0) return false;

    const idx = tracks.findIndex((t: HlsSubtitleTrack) => {
      const tLang = t.lang || t.language || '';
      return tLang === lang || tLang.startsWith(lang) || lang.startsWith(tLang);
    });

    if (idx < 0) return false;

    this.player.log(`Activating HLS subtitle track index ${idx} for language "${lang}"`);
    this.hls.subtitleTrack = idx;

    this._lastKnownCueCount = 0;
    this._startCueUpdatePolling();
    return true;
  }

  getTextTrackURLs(): { lang: string; url: string }[] {
    if (!this.hls || !this._manifestUrl) return [];
    try {
      const tracks = this.hls.subtitleTracks;
      if (!tracks || tracks.length === 0) return [];

      const results: { lang: string; url: string }[] = [];
      for (const track of tracks) {
        const lang = track.lang || track.language || '';
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
    // Detach the media listeners registered in attachMediaEvents().
    this._listenerController.abort();
    // Remove the deferred 'ready' listener if it never fired.
    if (this._pendingReadyHandler) {
      this.player.off('ready', this._pendingReadyHandler);
      this._pendingReadyHandler = null;
    }
    this._lastKnownCueCount = 0;
    this._manifestUrl = null;
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}

