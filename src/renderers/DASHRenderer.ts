import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
import { loadPinnedScript } from '../utils/ScriptLoader.js';

interface DashTextTrack {
  lang?: string;
  language?: string;
  srclang?: string;
  kind?: string;
  label?: string;
  labels?: string;
  isTTML?: boolean;
  codec?: string;
  mimeType?: string;
  [key: string]: unknown;
}

/**
 * Shape of payloads emitted by VidPly's `captionsenabled` event when
 * routed into a DASH renderer. These come from CaptionManager and carry
 * both the language and the underlying TextTrack reference.
 */
interface CaptionTrackSelection {
  language?: string;
  label?: string;
  track?: TextTrack;
}

type CaptionEnabledHandler = (track: CaptionTrackSelection) => void;
type CaptionDisabledHandler = () => void;

export class DASHRenderer implements Renderer {
  readonly rendererType = 'dash' as const;
  player: Player;
  media: HTMLMediaElement;
  dash: DashMediaPlayerInstance | null;
  readonly isStreaming = true;
  _dashSourceLoaded: boolean;
  _pendingSrc: string | null;
  _dashSubtitleTracksCount: number | undefined;
  _dashTextTracks: DashTextTrack[];
  _cueUpdateTimer: ReturnType<typeof setInterval> | null;
  _captionEnabledHandler: CaptionEnabledHandler | null;
  _captionDisabledHandler: CaptionDisabledHandler | null;
  _lastKnownCueCount: number;
  _lastKnownMaxCueStart: number;
  _dashTextIsTtml: boolean;
  _pendingTimeouts: ReturnType<typeof setTimeout>[];
  _ttmlDiv: HTMLElement | null;
  _manifestUrl: string | null;
  // Detaches all media listeners (attachMediaEvents) in destroy().
  private _listenerController: AbortController;
  // Deferred 'ready' handler from updateCaptionButtonsForStreaming, removed on
  // destroy if it never fired.
  private _pendingReadyHandler: (() => void) | null;

  constructor(player: Player) {
    this.player = player;
    this.media = player.element;
    this.dash = null;
    this._dashSourceLoaded = false;
    this._pendingSrc = null;
    this._dashSubtitleTracksCount = undefined;
    this._dashTextTracks = [];
    this._cueUpdateTimer = null;
    this._captionEnabledHandler = null;
    this._captionDisabledHandler = null;
    this._lastKnownCueCount = 0;
    this._lastKnownMaxCueStart = -1;
    this._dashTextIsTtml = false;
    this._pendingTimeouts = [];
    this._ttmlDiv = null;
    this._manifestUrl = null;
    this._listenerController = new AbortController();
    this._pendingReadyHandler = null;
  }

  async init() {
    this.player.log('Using dash.js for DASH support');
    await this.initDashJs();
  }

  async initDashJs() {
    this.media.controls = false;
    this.media.removeAttribute('controls');

    if (!window.dashjs) {
      await this.loadDashJs();
    }

    // Remove <source> children — dash.js manages the src via MSE
    const sourceElements = Array.from(this.media.querySelectorAll('source'));
    let originalSrc = null;
    if (sourceElements.length > 0) {
      originalSrc = sourceElements[0]?.getAttribute('src') ?? null;
      sourceElements.forEach(source => source.remove());
      this.player.log('Removed <source> elements for HTML5 validity (dash.js uses MSE)');
    }

    const dashjs = window.dashjs;
    if (!dashjs) {
      throw new Error('dash.js not available');
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
        selectionModeForInitialTrack: 'firstTrack',
        // NOTE on pre-play preload: we deliberately do NOT set
        // streaming.scheduling.scheduleWhilePaused = false here. While that
        // is the documented dash.js way to suppress segment downloads while
        // paused / before the first play, in our setup (dash.js 5.2.0 +
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
          MPD: 1000,
          MediaSegment: 1000,
          InitializationSegment: 1000,
          BitstreamSwitchingSegment: 1000
        },
        abr: {
          autoSwitchBitrate: { video: true, audio: true }
        },
        text: {
          defaultEnabled: true
        }
      }
    });

    // Create the TTML rendering div before initialize() so the DOM element
    // exists, but attach it to dash.js after initialize() because
    // attachTTMLRenderingDiv() requires attachView() which initialize() calls.
    this._ttmlDiv = document.createElement('div');
    this._ttmlDiv.className = 'vidply-dash-ttml';
    this._ttmlDiv.style.visibility = 'hidden';
    const wrapper = this.player.videoWrapper || this.media.parentElement;
    if (wrapper) {
      wrapper.appendChild(this._ttmlDiv);
    }

    this.dash.initialize(this.media, null, false);
    this.dash.attachTTMLRenderingDiv(this._ttmlDiv);

    // Resolve source URL
    let src = this.player.currentSource;

    if (!src && originalSrc) {
      src = originalSrc;
    }

    if (!src) {
      src = this.player.element.getAttribute('data-vidply-src');
    }

    if (!src) {
      const elementSrc = this.player.element.getAttribute('src') || this.player.element.src;
      if (elementSrc && !elementSrc.startsWith('blob:')) {
        src = elementSrc;
      }
    }

    this.player.log(`Loading DASH source: ${src}`, 'log');

    if (!src) {
      throw new Error('No DASH source found');
    }

    // Always attach the source at init so the manifest is fetched and the
    // seekbar / duration / quality list are available before the first play.
    // We deliberately don't honor `deferLoad` here: deferring attachSource
    // would leave duration unknown and seek requests unserviceable. The
    // small preload (init segments + ~1 segment of media data) that dash.js
    // does up to bufferTimeDefault is acceptable; in exchange the seekbar
    // becomes functional immediately.
    this._pendingSrc = src;
    this._manifestUrl = src;
    this.dash.attachSource(src);
    this._dashSourceLoaded = true;

    // Force the vidply poster overlay even though dash.js will paint the
    // first decoded frame into the <video> element. With MSE attached and
    // init/startup segments appended, the browser ignores the native
    // `poster` attribute and shows the first frame instead. We instead use
    // the `vidply-forced-poster` CSS class, which sets `<video>` to
    // opacity:0 and renders the poster image as a wrapper background — the
    // user sees the artwork until they press play, just like on a fully
    // native HTML5 video. The 'play' handler in Player.ts already calls
    // hidePosterOverlay() on first playback, so we don't need to remove it
    // manually here.
    this.player.showPosterOverlay();

    this.attachDashEvents();
    this.attachMediaEvents();
    this._setupCaptionSync();
  }

  /**
   * Load dash.js. Pinned to an exact version (the previous default
   * `5.2.0` is preserved) and shipped with a matching Subresource
   * Integrity hash, so the default CDN script is verified out of the
   * box. Overridable via `options.dashScriptUrl` (URL) /
   * `options.dashScriptIntegrity` (SRI hash). The built-in hash only
   * applies to the pinned default URL. See HLSRenderer.loadHlsJs() for
   * the SRI computation command.
   */
  async loadDashJs(): Promise<void> {
    // SRI for the pinned default build below, verified against the file served
    // by jsdelivr for dashjs@5.2.0. Recompute whenever the pin changes.
    return loadPinnedScript({
      defaultUrl: 'https://cdn.jsdelivr.net/npm/dashjs@5.2.0/dist/modern/umd/dash.all.min.js',
      defaultIntegrity: 'sha384-DUqWPzOl/i7/DGF7SBoe4NrlZOMxxomlJsg3X0daS5SBeFxco3dmwWQPFr2oauXn',
      url: this.player.options.dashScriptUrl as string | undefined,
      integrity: this.player.options.dashScriptIntegrity as string | undefined
    });
  }

  _setTimeout(fn: () => void, delay: number) {
    const id = setTimeout(() => {
      this._pendingTimeouts = this._pendingTimeouts.filter(t => t !== id);
      fn();
    }, delay);
    this._pendingTimeouts.push(id);
    return id;
  }

  attachDashEvents() {
    const dashjs = window.dashjs;
    const dash = this.dash;
    if (!dashjs || !dash) return;
    const dashEvents = dashjs.MediaPlayer.events;

    dash.on(dashEvents.MANIFEST_LOADED, (...args: unknown[]) => {
      const e = args[0] as { data?: unknown } | undefined;
      const data = e?.data ?? e;
      this.player.log('DASH manifest loaded');
      this.player.emit('dashmanifestloaded', data);
      this.player.liveStreamManager?.evaluateDash(this.dash, data);

      if (this.player.container) {
        this.player.container.classList.remove('vidply-external-controls');
      }

      this._setTimeout(() => {
        this._checkSubtitleTracks();
      }, 500);
    });

    dash.on(dashEvents.QUALITY_CHANGE_RENDERED, (...args: unknown[]) => {
      const e = args[0] as { mediaType?: string; newQuality?: number };
      if (e.mediaType === 'video') {
        this.player.log('DASH quality changed to index ' + e.newQuality);
        this.player.emit('dashqualitychanged', e);
      }
    });

    dash.on(dashEvents.TEXT_TRACKS_ADDED, (...args: unknown[]) => {
      const e = args[0] as { tracks?: DashTextTrack[] } | undefined;
      const tracks = e?.tracks ?? [];
      this._dashTextTracks = tracks;
      this._dashTextIsTtml = tracks.some((t) =>
        t.isTTML || /stpp|ttml/i.test(t.codec || '') || /ttml/i.test(t.mimeType || '')
      );
      this.player.log(`DASH text tracks added: ${tracks.length} tracks, format: ${this._dashTextIsTtml ? 'TTML' : 'WebVTT'}`);
      this._dashSubtitleTracksCount = tracks.length;
      this.player.emit('dashsubtitletracksupdated', { tracks });
      this.updateCaptionButtonsForDash();

      if (tracks.length > 0) {
        try {
          dash.setTextTrack(0);
        } catch {
          // ignore if not ready yet
        }
        if (!this._dashTextIsTtml) {
          this._startCueUpdatePolling();
        }
      }
    });

    dash.on(dashEvents.STREAM_INITIALIZED, () => {
      this.player.log('DASH stream initialized');
      this.player.emit('dashstreaminitialized');
      this.player.liveStreamManager?.evaluateDash(this.dash);

      this._setTimeout(() => {
        const qualities = this.getQualities();
        if (qualities.length > 0) {
          this.player.emit('dashmanifestparsed', { qualities });
        }
      }, 300);
    });

    dash.on(dashEvents.ERROR, (...args: unknown[]) => {
      this.handleDashError(args[0]);
    });

    dash.on(dashEvents.FRAGMENT_LOADING_COMPLETED, (...args: unknown[]) => {
      const e = args[0] as { request?: { mediaType?: string } } | undefined;
      this.player.state.buffering = false;
      if (e?.request?.mediaType === 'text' && !this._dashTextIsTtml) {
        this._setTimeout(() => {
          this._emitTextCuesUpdateIfChanged();
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
      if (track && (track.kind === 'subtitles' || track.kind === 'captions') && !track._vidplyStale && track.cues) {
        total += track.cues.length;
      }
    }
    return total;
  }

  _getMaxCueStartTime(): number {
    const textTracks = this.media.textTracks;
    if (!textTracks) {
      return -1;
    }

    let max = -1;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (
        !track
        || (track.kind !== 'subtitles' && track.kind !== 'captions')
        || track._vidplyStale
        || !track.cues
      ) {
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

  _isLivePlayback(): boolean {
    return typeof this.player.isLiveStream === 'function' && this.player.isLiveStream();
  }

  _emitTextCuesUpdateIfChanged(): boolean {
    const count = this._getTotalCueCount();
    const maxStart = this._getMaxCueStartTime();
    const isLive = this._isLivePlayback();

    if (
      isLive
      || count > this._lastKnownCueCount
      || maxStart > this._lastKnownMaxCueStart
    ) {
      this._lastKnownCueCount = count;
      this._lastKnownMaxCueStart = maxStart;
      this.player.emit('textcuesupdate');
      return true;
    }

    return false;
  }

  /**
   * Return true if `time` falls inside any TimeRange the SourceBuffer already
   * holds, with a small tolerance to absorb GOP boundaries. Used by the
   * seeking handler to decide whether to surface a 'waiting' event for the
   * spinner UI when the user scrubs while paused.
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

  /**
   * Sync VidPly caption track switches with dash.js so it loads
   * subtitle segments for the selected language.
   */
  _setupCaptionSync() {
    this._captionEnabledHandler = (selectedTrack) => {
      if (this._dashTextIsTtml) {
        // dash.js only renders TTML content to the rendering div when the
        // TextTrack mode is 'showing'. CaptionManager sets it to 'hidden',
        // so we override it here. VidPly's own caption overlay is skipped
        // via handlesOwnCaptions().
        if (selectedTrack.track) {
          selectedTrack.track.mode = 'showing';
        }
        if (this._ttmlDiv) {
          this._ttmlDiv.style.visibility = 'visible';
        }
      }
      this._syncDashTextTrack(selectedTrack);
    };
    this._captionDisabledHandler = () => {
      if (this._dashTextIsTtml && this._ttmlDiv) {
        this._ttmlDiv.style.visibility = 'hidden';
      }
      if (this.dash) {
        try { this.dash.setTextTrack(-1); } catch { /* ignore */ }
      }
    };
    this.player.on('captionsenabled', this._captionEnabledHandler);
    this.player.on('captionsdisabled', this._captionDisabledHandler);
  }

  /**
   * Map a VidPly caption track to the corresponding dash.js track index
   * and switch dash.js to load segments for that language.
   */
  _syncDashTextTrack(selectedTrack: CaptionTrackSelection) {
    if (!this.dash || !this._dashTextTracks.length) return;

    const lang = selectedTrack.language;
    if (!lang) return;

    const dashIndex = this._dashTextTracks.findIndex(dt => {
      const dtLang = dt.lang || dt.language || dt.srclang || '';
      if (!dtLang) return false;
      return dtLang === lang || dtLang.startsWith(lang) || lang.startsWith(dtLang);
    });

    if (dashIndex >= 0) {
      this.player.log(`Syncing DASH text track to index ${dashIndex} (${lang})`);
      try {
        this.dash.setTextTrack(dashIndex);
      } catch { /* ignore */ }
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
    let prevMaxStart = -1;
    let stableRounds = 0;
    const isLive = this._isLivePlayback();

    this._cueUpdateTimer = setInterval(() => {
      const count = this._getTotalCueCount();
      const maxStart = this._getMaxCueStartTime();

      if (isLive) {
        if (count > prevCueCount || maxStart > prevMaxStart) {
          prevCueCount = count;
          prevMaxStart = maxStart;
          this._lastKnownCueCount = count;
          this._lastKnownMaxCueStart = maxStart;
          this.player.emit('textcuesupdate');
        }
        return;
      }

      if (count > prevCueCount || maxStart > prevMaxStart) {
        prevCueCount = count;
        prevMaxStart = maxStart;
        stableRounds = 0;
        this._lastKnownCueCount = count;
        this._lastKnownMaxCueStart = maxStart;
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

  _checkSubtitleTracks() {
    if (this._dashSubtitleTracksCount !== undefined && this._dashSubtitleTracksCount > 0) {
      return;
    }
    const tracks = this.media.textTracks;
    let count = 0;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track && (track.kind === 'subtitles' || track.kind === 'captions') && !track._vidplyStale) {
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

          // dash.js fires TEXT_TRACKS_ADDED when it knows about the
          // tracks, but the browser TextTrackList may not yet enumerate
          // the new TextTrack objects synchronously. If refreshTracks
          // found nothing, retry a few times with increasing delays.
          if (found === 0 && retryCount < 5) {
            const delay = (retryCount + 1) * 200;
            this.player.log(`DASH caption tracks not yet on video element, retrying in ${delay}ms (attempt ${retryCount + 1})`, 'info');
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
      if (!this.player.shouldSyncVolumeFromMedia()) {
        return;
      }
      this.player.state.volume = this.media.volume;
      this.player.state.muted = this.media.muted;
      this.player.emit('volumechange', this.media.volume);
    }, { signal });

    this.media.addEventListener('seeking', () => {
      this.player.state.seeking = true;
      this.player.emit('seeking');

      // Browsers do not fire `waiting` when seeking on a paused media element
      // — there is nothing to "wait" for since playback isn't requested. With
      // dash.js + MSE, scrubbing while paused (or before the first play)
      // still triggers a real fragment download, but the spinner stays hidden
      // because no `waiting` event reaches the buffering UI. Detect a seek
      // into an unbuffered range here and surface it as 'waiting' so the
      // spinner appears. Cleared again by the existing `canplay` /
      // `seeked` paths.
      if (!this._isTimeBuffered(this.media.currentTime)) {
        this.player.state.buffering = true;
        this.player.emit('waiting');
      }
    }, { signal });

    this.media.addEventListener('seeked', () => {
      this.player.state.seeking = false;
      this.player.emit('seeked');
    }, { signal });

    this.media.addEventListener('waiting', () => {
      this.player.state.buffering = true;
      this.player.emit('waiting');
    }, { signal });

    this.media.addEventListener('canplay', () => {
      this.player.state.buffering = false;
      this.player.emit('canplay');
    }, { signal });

    this.media.addEventListener('error', () => {
      this.player.handleError(this.media.error);
    }, { signal });
  }

  handleDashError(e: unknown) {
    const wrapped = e as { error?: { code?: number; message?: string }; code?: number; message?: string } | undefined;
    const error = wrapped?.error ?? wrapped;
    if (!error) return;
    const code = error.code ?? '';
    const message = error.message || '';
    this.player.log(`DASH Error - Code: ${code}, Message: ${message}`, 'warn');

    if (typeof code === 'number' && code >= 100) {
      this.player.log('Fatal DASH error', 'error');
      this.player.handleError(new Error(`DASH Error: ${code} - ${message}`));
    } else {
      this.player.log('Non-fatal DASH error: ' + (message || String(error)), 'warn');
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
    } catch {
      // ignore
    }
  }

  play() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Defer-load (legacy code path, kept for completeness): the source is
    // normally attached at init and dash.js is configured with
    // scheduling.scheduleWhilePaused: false to keep prefetch at zero until
    // play. If for any reason the source is still pending here, attach it
    // now. Note that media.play() is called immediately afterwards; on
    // modern dash.js this races cleanly because attachSource() is sync
    // enough for the MediaSource to be ready by the time the play promise
    // resolves, and the configured zero-prefetch settings make the race
    // window very short. The general "no preload" UX no longer relies on
    // this branch.
    if (this.player.options.deferLoad && this.dash && !this._dashSourceLoaded) {
      const src = this._pendingSrc || this.player.currentSource;
      if (src) {
        try {
          this.dash.attachSource(src);
          this._dashSourceLoaded = true;
        } catch {
          // ignore and let media.play() surface errors if any
        }
      }
    }

    const promise = this.media.play();

    window.scrollTo(scrollX, scrollY);

    if (promise !== undefined) {
      promise.catch(error => {
        this.player.log('Play failed:', error, 'warn');
      });
    }
  }

  pause() {
    // dash.js stops scheduling new fragment downloads once `paused` is true,
    // because we configured `streaming.scheduling.scheduleWhilePaused: false`
    // at init. Already-buffered data stays in the SourceBuffer, so a
    // subsequent play() resumes near-instantly while pause saves bandwidth.
    this.media.pause();
  }

  seek(time: number) {
    this.media.currentTime = time;
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

  switchQuality(qualityIndex: number) {
    if (!this.dash) return;

    if (qualityIndex === -1) {
      // Re-enable ABR auto-switching
      if (typeof this.dash.setAutoSwitchQualityFor === 'function') {
        this.dash.setAutoSwitchQualityFor('video', true);
      } else {
        this.dash.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: true } } }
        });
      }
    } else {
      // Disable ABR and lock to the chosen quality
      if (typeof this.dash.setAutoSwitchQualityFor === 'function') {
        this.dash.setAutoSwitchQualityFor('video', false);
      } else {
        this.dash.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: false } } }
        });
      }

      if (typeof this.dash.setRepresentationForTypeByIndex === 'function') {
        this.dash.setRepresentationForTypeByIndex('video', qualityIndex);
      } else if (typeof this.dash.setQualityFor === 'function') {
        this.dash.setQualityFor('video', qualityIndex, true);
      }
    }
  }

  getQualities() {
    if (!this.dash) return [];

    try {
      // dash.js v5+: getRepresentationsByType
      let reps = null;
      if (typeof this.dash.getRepresentationsByType === 'function') {
        reps = this.dash.getRepresentationsByType('video');
      }

      if (reps && reps.length > 0) {
        const heightCounts: Record<number, number> = {};
        reps.forEach((r: DashRepresentation) => {
          const h = Number(r.height) || 0;
          heightCounts[h] = (heightCounts[h] || 0) + 1;
        });

        return reps.map((rep: DashRepresentation, index: number) => {
          const height = Number(rep.height) || 0;
          const bitrate = Number(rep.bandwidth || rep.bitrate) || 0;
          const kb = bitrate > 0 ? Math.round(bitrate / 1000) : 0;
          let name;
          if (height > 0 && (heightCounts[height] ?? 0) > 1 && kb > 0) {
            name = `${height}p (${kb} kbps)`;
          } else if (height > 0) {
            name = `${height}p`;
          } else {
            name = kb > 0 ? `${kb} kbps` : 'Auto';
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

      // Fallback: dash.js v4 and earlier
      const bitrateList = this.dash.getBitrateInfoListFor('video');
      if (!bitrateList || bitrateList.length === 0) return [];

      const heightCounts: Record<number, number> = {};
      bitrateList.forEach((info: DashBitrateInfo) => {
        const h = Number(info.height) || 0;
        heightCounts[h] = (heightCounts[h] || 0) + 1;
      });

      return bitrateList.map((info: DashBitrateInfo, index: number) => {
        const height = Number(info.height) || 0;
        const bitrate = Number(info.bitrate) || 0;
        const kb = bitrate > 0 ? Math.round(bitrate / 1000) : 0;
        let name;
        if (height > 0 && (heightCounts[height] ?? 0) > 1 && kb > 0) {
          name = `${height}p (${kb} kbps)`;
        } else if (height > 0) {
          name = `${height}p`;
        } else {
          name = kb > 0 ? `${kb} kbps` : 'Auto';
        }
        return {
          index,
          height: info.height,
          width: info.width,
          bitrate: info.bitrate,
          name
        };
      });
    } catch {
      return [];
    }
  }

  getCurrentQuality() {
    if (!this.dash) return -1;
    try {
      if (typeof this.dash.getRepresentationsByType === 'function') {
        const reps = this.dash.getRepresentationsByType('video');
        const current = this.dash.getCurrentRepresentationForType?.('video');
        if (current && reps) {
          const idx = reps.findIndex((r: DashRepresentation) => r.id === current.id);
          if (idx >= 0) return idx;
        }
      }
      return this.dash.getQualityFor('video');
    } catch {
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
  activateTextTrackForLanguage(lang: string): boolean {
    if (!this.dash || !this._dashTextTracks.length || !lang) return false;

    let dashIndex = this._dashTextTracks.findIndex(dt => {
      const dtLang = dt.lang || dt.language || dt.srclang || '';
      if (!dtLang) return false;
      return dtLang === lang || dtLang.startsWith(lang) || lang.startsWith(dtLang);
    });

    if (dashIndex < 0) {
      dashIndex = this._dashTextTracks.findIndex(dt => {
        const dtLabel = (dt.label || dt.labels || '').toString().toLowerCase();
        return dtLabel.includes(lang.toLowerCase());
      });
    }

    if (dashIndex < 0) return false;

    this.player.log(`Activating DASH text track index ${dashIndex} for transcript language "${lang}"`);
    try {
      this.dash.setTextTrack(dashIndex);
    } catch { /* ignore */ }

    // dash.js's text scheduler only fetches segments while the video is
    // playing.  When paused, a brief play–pause cycle forces the scheduler
    // to buffer text data for the newly selected track.
    if (this.media.paused) {
      const pos = this.media.currentTime;
      const wasMuted = this.media.muted;
      this.media.muted = true;
      const playPromise = this.media.play();
      const doPause = () => {
        if (this.media && !this.media.paused) {
          this.media.pause();
          this.media.muted = wasMuted;
          // Restore position in case it drifted
          if (Math.abs(this.media.currentTime - pos) > 0.5) {
            this.media.currentTime = pos;
          }
        }
      };
      if (playPromise && typeof playPromise.then === 'function') {
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

  getTextTrackURLs(): { lang: string; url: string }[] {
    if (!this.dash || !this._manifestUrl) return [];
    try {
      // dash.js manifest objects are loosely shaped (XML-derived), so we
      // walk them through index-keyed records and narrow as we go.
      type ManifestNode = Record<string, unknown>;
      const manifest = this.dash.getManifest?.() as ManifestNode | undefined;
      if (!manifest) return [];

      const baseUrl = this._manifestUrl.substring(0, this._manifestUrl.lastIndexOf('/') + 1);
      const results: { lang: string; url: string }[] = [];

      const rawPeriods = manifest.Period || manifest.period || manifest.periods || manifest;
      const periods = (Array.isArray(rawPeriods) ? rawPeriods : [rawPeriods]) as ManifestNode[];
      for (const period of periods) {
        const rawAdaptSets = period.AdaptationSet || period.adaptationSet || period.AdaptationSet_asArray || [];
        const adaptSets = (Array.isArray(rawAdaptSets) ? rawAdaptSets : [rawAdaptSets]) as ManifestNode[];
        for (const as of adaptSets) {
          const ct = String(as.contentType || as.ContentType || '');
          const mime = String(as.mimeType || as.MimeType || '');
          if (ct !== 'text' && !/text\/vtt|application\/ttml/i.test(mime)) continue;

          const lang = String(as.lang || as.language || '');
          const rawReps = as.Representation || as.representation || as.Representation_asArray || [];
          const reps = (Array.isArray(rawReps) ? rawReps : [rawReps]) as ManifestNode[];
          for (const rep of reps) {
            const bu = (rep.BaseURL || rep.baseURL || rep.BaseURL_asArray) as
              | string
              | { __text?: string }
              | Array<string | { __text?: string }>
              | undefined;
            let rawUrl: string | undefined;
            if (Array.isArray(bu)) {
              const first = bu[0];
              rawUrl = typeof first === 'string' ? first : first?.__text;
            } else if (typeof bu === 'string') {
              rawUrl = bu;
            } else {
              rawUrl = bu?.__text;
            }
            if (!rawUrl) continue;
            const url = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, baseUrl).href;
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
      if (typeof this.dash.getAutoSwitchQualityFor === 'function') {
        return this.dash.getAutoSwitchQualityFor('video');
      }
      const settings = this.dash.getSettings?.();
      return settings?.streaming?.abr?.autoSwitchBitrate?.video !== false;
    } catch {
      return true;
    }
  }

  destroy() {
    this._pendingTimeouts.forEach(id => clearTimeout(id));
    this._pendingTimeouts = [];
    this._stopCueUpdatePolling();
    this._lastKnownCueCount = 0;
    // Detach media listeners registered in attachMediaEvents().
    this._listenerController.abort();
    // Remove the deferred 'ready' listener if it never fired.
    if (this._pendingReadyHandler) {
      this.player.off('ready', this._pendingReadyHandler);
      this._pendingReadyHandler = null;
    }

    if (this._captionEnabledHandler) {
      this.player.off('captionsenabled', this._captionEnabledHandler);
      this._captionEnabledHandler = null;
    }
    if (this._captionDisabledHandler) {
      this.player.off('captionsdisabled', this._captionDisabledHandler);
      this._captionDisabledHandler = null;
    }

    if (this._ttmlDiv && this._ttmlDiv.parentNode) {
      this._ttmlDiv.parentNode.removeChild(this._ttmlDiv);
      this._ttmlDiv = null;
    }

    // Mark all subtitle/caption text tracks as stale. dash.js creates
    // programmatic TextTrack objects that persist on the <video> element
    // after destroy() and cannot be removed via standard APIs. The stale
    // flag prevents _checkSubtitleTracks() in a new renderer instance from
    // treating them as tracks belonging to the current stream.
    const textTracks = this.media.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track && (track.kind === 'subtitles' || track.kind === 'captions')) {
        track._vidplyStale = true;
        track.mode = 'disabled';
      }
    }

    if (this.dash) {
      try {
        // Silence dash.js logging during teardown to suppress harmless
        // SourceBuffer errors from in-flight async operations.
        this.dash.updateSettings({ debug: { logLevel: 0 } });
        // reset() cleanly detaches from MediaSource and cancels pending
        // buffer operations before destroy() releases all resources.
        this.dash.reset();
      } catch { /* ignore teardown errors */ }
      try {
        this.dash.destroy();
      } catch { /* ignore teardown errors */ }
      this.dash = null;
    }
    this._dashTextTracks = [];
    this._dashTextIsTtml = false;
    this._manifestUrl = null;
  }
}
