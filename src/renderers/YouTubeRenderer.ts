import type { EmbedCaptionTrack, Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
import {
  filterYoutubeCaptionTracklist,
  probeYoutubeCaptionTrack,
  readYoutubeCaptionTracklist,
  type YoutubeCaptionTrackRaw
} from '../utils/YoutubeEmbedCaptions.js';
import { loadScriptOnce } from '../utils/ScriptLoader.js';
import {
  applyPosterImageToVideoWrapper,
  clearEmbedIdleCover,
  setEmbedIdleCover
} from '../utils/EmbedIdleCover.js';
import { syncYoutubeEmbedAspectRatio } from '../utils/YoutubeEmbedAspectRatio.js';
import { resolveYoutubeThumbnailPosterUrl } from '../utils/YoutubeThumbnailPoster.js';
import {
  isIOS,
  isLikelyUnsupportedYoutubeEmbedHost,
  shouldUseYoutubeIosLanFallback
} from '../utils/PerformanceUtils.js';

export class YouTubeRenderer implements Renderer {
  /** Privacy-enhanced embed host (no cookies until the visitor starts playback). */
  static readonly EMBED_HOST = 'https://www.youtube-nocookie.com';

  readonly rendererType = 'youtube' as const;
  player: Player;
  media: HTMLMediaElement;
  youtube: YTPlayer | null;
  videoId: string | null;
  isReady: boolean;
  iframe: HTMLDivElement | null;
  /** Inner mount node passed to `YT.Player` when chromeless crop wrapper is used. */
  private youtubeMount: HTMLDivElement | null = null;
  timeUpdateInterval?: ReturnType<typeof setInterval>;
  private endScreenPreempted = false;
  /** When true, VidPly CC menu drives YouTube in-frame captions via setOption. */
  private embedCaptionBridgeActive = false;
  private youtubeEmbedCaptionMenu: EmbedCaptionTrack[] = [];
  private youtubeEmbedCaptionTracks = new Map<string, YoutubeCaptionTrackRaw>();

  constructor(player: Player) {
    this.player = player;
    this.media = player.element;
    this.youtube = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }

  /** origin + widget_referrer for YouTube's embed client-identity checks (iOS). */
  static embedIdentityPlayerVars(): Record<string, string> {
    if (typeof window === 'undefined' || isLikelyUnsupportedYoutubeEmbedHost()) {
      return {};
    }
    const vars: Record<string, string> = {};
    if (window.location?.origin) {
      vars.origin = window.location.origin;
    }
    if (window.location?.href) {
      vars.widget_referrer = window.location.href;
    }
    return vars;
  }

  /**
   * Chromium enforces `Permissions-Policy: autoplay=()`: `playVideo()` from
   * VidPly controls is then silently ignored and only a click inside the
   * iframe starts playback. Only the page's own allowance is checked — the
   * API reports cross-origin frames as blocked even when `allow="autoplay"`
   * delegates it. Firefox has no such API, so `undefined` counts as allowed.
   */
  static isEmbedAutoplayBlockedByPermissionsPolicy(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    const doc = document as Document & {
      permissionsPolicy?: { allowsFeature(feature: string, origin?: string): boolean };
      featurePolicy?: { allowsFeature(feature: string, origin?: string): boolean };
    };
    const policy = doc.permissionsPolicy ?? doc.featurePolicy;
    if (!policy?.allowsFeature) {
      return false;
    }
    try {
      return !policy.allowsFeature('autoplay');
    } catch {
      return false;
    }
  }

  static applyEmbedReferrerPolicy(youtube: YTPlayer | null) {
    const iframe = youtube?.getIframe?.();
    if (iframe instanceof HTMLIFrameElement) {
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    }
  }

  /**
   * Chromeless mode: VidPly owns keyboard focus. Keep the cross-origin iframe
   * out of the tab order and assistive-tech traversal (YouTube still injects
   * links/overlays inside the frame).
   */
  private applyChromelessEmbedAccessibility(): void {
    const providerChrome = this.usesProviderChrome();
    const host = this.iframe;
    const iframe = this.youtube?.getIframe?.();

    if (host) {
      if (providerChrome) {
        host.removeAttribute('inert');
      } else {
        host.setAttribute('inert', '');
      }
    }

    if (iframe instanceof HTMLIFrameElement) {
      if (providerChrome) {
        iframe.removeAttribute('tabindex');
        iframe.removeAttribute('aria-hidden');
      } else {
        iframe.setAttribute('tabindex', '-1');
        iframe.setAttribute('aria-hidden', 'true');
      }
    }
  }

  private showIosLanFallback() {
    this.player.element.style.display = 'none';
    this.iframe = document.createElement('div');
    this.iframe.className = 'vidply-youtube-ios-lan-fallback-host';
    this.iframe.style.width = '100%';
    this.iframe.style.maxHeight = '100%';
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);

    const wrap = document.createElement('div');
    wrap.className = 'vidply-youtube-ios-lan-fallback';

    const videoId = this.videoId ?? '';
    const pageLang = (document.documentElement.lang || '').toLowerCase();
    const linkLabel = pageLang.startsWith('de')
      ? 'Video in YouTube abspielen'
      : 'Play video in YouTube';
    const hint = pageLang.startsWith('de')
      ? 'Der eingebettete Player ist auf dem iPhone bei Entwicklungs-Adressen (LAN, IP, sslip.io, DDEV, …) nicht verfügbar. Bitte YouTube öffnen.'
      : 'The embedded player is not available on iPhone on development URLs (LAN, IP, sslip.io, DDEV, …). Please open YouTube.';

    const openLink = document.createElement('a');
    openLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    openLink.className = 'vidply-youtube-ios-lan-fallback__link';
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.textContent = linkLabel;

    const message = document.createElement('p');
    message.className = 'vidply-youtube-ios-lan-fallback__hint';
    message.textContent = hint;

    wrap.appendChild(openLink);
    wrap.appendChild(message);
    this.iframe.appendChild(wrap);

    this.isReady = true;
    this.player._forceProviderEmbedChrome = true;
    this.player.syncEmbedChromeClass('youtube');
    this.player.emit('loadedmetadata');
  }

  private usesProviderChrome(): boolean {
    return this.player.usesProviderNativeChrome('youtube');
  }

  async init() {
    // Extract video ID from URL - use currentSource which works for external renderers
    const src = this.player.currentSource || this.player.element.src;
    this.videoId = this.extractVideoId(src);

    if (!this.videoId) {
      throw new Error('Invalid YouTube URL');
    }

    if (shouldUseYoutubeIosLanFallback()) {
      this.showIosLanFallback();
      return;
    }

    if (!this.usesProviderChrome() && YouTubeRenderer.isEmbedAutoplayBlockedByPermissionsPolicy()) {
      this.player.log(
        "Permissions-Policy blocks autoplay; using YouTube's own controls. " +
          `Allow it with e.g. 'Permissions-Policy: autoplay=(self "${YouTubeRenderer.EMBED_HOST}")'.`,
        'warn'
      );
      this.player._forceProviderEmbedChrome = true;
    }

    this.player.syncEmbedChromeClass('youtube');

    try {
      // Load YouTube IFrame API
      await this.loadYouTubeAPI();

      // Create iframe
      this.createIframe();

      // Initialize player
      await this.initializePlayer();
    } catch (error) {
      this.clearEmbedChromeClassesOnInitFailure();
      throw error;
    }
  }

  private clearEmbedChromeClassesOnInitFailure(): void {
    const prefix = this.player.options.classPrefix;
    this.player.container?.classList.remove(`${prefix}-external-controls`);
    this.player.container?.classList.remove(`${prefix}-embed-chrome-vidply`);
  }

  extractVideoId(url: string) {
    // The capture group stops at the first query/hash/path delimiter so a
    // trailing `?t=`, `&list=`, `#…` or extra path segment can't leak into the
    // returned ID (previously `[^&\s]+` swallowed `?…` on youtu.be/embed URLs).
    const id = '([^&?#/\\s]+)';
    const host = '(?:youtube\\.com|youtube-nocookie\\.com)';
    const patterns = [
      // watch URLs — `v` may be any query parameter, not only the first.
      new RegExp(`${host}\\/watch\\?(?:[^\\s]*&)?v=${id}`),
      // Short links.
      new RegExp(`youtu\\.be\\/${id}`),
      // /embed/, /shorts/ and legacy /v/ path forms.
      new RegExp(`${host}\\/(?:embed|shorts|v)\\/${id}`)
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
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }

    // The IFrame API exposes window.YT.Player a short time after its script
    // loads (it signals readiness via the global onYouTubeIframeAPIReady
    // callback). loadScriptOnce dedupes the injection and the readiness
    // predicate polls for YT.Player, also covering the case where the host
    // page already included the API script.
    return loadScriptOnce('https://www.youtube.com/iframe_api', {
      isReady: () => Boolean(window.YT && window.YT.Player),
      readyTimeout: 8000
    });
  }

  private chromelessEmbedActive(): boolean {
    return !this.usesProviderChrome();
  }

  private hasSidecarCaptionTracks(): boolean {
    const el = this.player.element;
    const trackEls = el.querySelectorAll('track[kind="captions"], track[kind="subtitles"]');
    if (trackEls.length > 0) {
      return true;
    }
    const textTracks = el.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      const tt = textTracks[i];
      if (tt && (tt.kind === 'captions' || tt.kind === 'subtitles')) {
        return true;
      }
    }
    return false;
  }

  private unloadInFrameCaptionsModule(): void {
    const youtube = this.youtube;
    if (!youtube) {
      return;
    }
    try {
      youtube.setOption?.('captions', 'track', {});
    } catch {
      // ignore
    }
    try {
      youtube.unloadModule?.('captions');
    } catch {
      // Captions module may be unavailable for some videos.
    }
    this.embedCaptionBridgeActive = false;
    this.youtubeEmbedCaptionMenu = [];
    this.youtubeEmbedCaptionTracks.clear();
  }

  /**
   * When the embed caption bridge is inactive, unload YouTube's captions module.
   * When active, only clear the active track if VidPly captions are off.
   */
  private syncInFrameCaptionsWithVidPly(): void {
    const youtube = this.youtube;
    if (!youtube) {
      return;
    }

    if (this.usesProviderChrome() || !this.chromelessEmbedActive()) {
      this.unloadInFrameCaptionsModule();
      return;
    }

    if (this.hasSidecarCaptionTracks()) {
      this.unloadInFrameCaptionsModule();
      return;
    }

    if (!this.embedCaptionBridgeActive) {
      this.unloadInFrameCaptionsModule();
      return;
    }

    if (!this.player.state.captionsEnabled) {
      try {
        youtube.setOption?.('captions', 'track', {});
      } catch {
        // ignore
      }
    }
  }

  private syncEmbedCaptionBridgeFromApi(): void {
    const youtube = this.youtube;
    if (!youtube || this.usesProviderChrome() || !this.chromelessEmbedActive()) {
      return;
    }

    if (this.hasSidecarCaptionTracks()) {
      if (this.embedCaptionBridgeActive) {
        this.unloadInFrameCaptionsModule();
        this.refreshSidecarCaptionControls();
      }
      return;
    }

    const rawList = readYoutubeCaptionTracklist(youtube);
    if (!rawList?.length) {
      return;
    }

    const filtered = filterYoutubeCaptionTracklist(rawList);
    if (filtered.length === 0) {
      return;
    }

    const probeTrack = filtered[0]?.raw;
    if (!probeTrack || !probeYoutubeCaptionTrack(youtube, probeTrack)) {
      this.unloadInFrameCaptionsModule();
      return;
    }

    this.embedCaptionBridgeActive = true;
    this.youtubeEmbedCaptionMenu = filtered.map(({ id, language, label }) => ({
      id,
      language,
      label
    }));
    this.youtubeEmbedCaptionTracks.clear();
    for (const entry of filtered) {
      this.youtubeEmbedCaptionTracks.set(entry.id, entry.raw);
    }

    this.refreshSidecarCaptionControls();
  }

  private refreshSidecarCaptionControls(): void {
    void Promise.resolve(this.player.captionManager?.refreshTracks()).then(() => {
      this.player.controlBar?.syncCaptionControlsFromTracks();
    });
  }

  private syncChromelessHostClasses(ready: boolean): void {
    if (!this.chromelessEmbedActive() || !this.iframe) {
      return;
    }
    const prefix = this.player.options.classPrefix;
    this.iframe.classList.add(`${prefix}-youtube-chromeless-host`);
    this.iframe.classList.toggle(`${prefix}-youtube-chromeless-ready`, ready);
    this.player.container?.classList.toggle(`${prefix}-embed-youtube`, ready);
  }

  private applyChromelessIdlePoster(): void {
    const raw =
      this.player.element.getAttribute('poster') ??
      (typeof this.player.options.poster === 'string' ? this.player.options.poster : null);
    if (raw) {
      applyPosterImageToVideoWrapper(this.player, this.player.resolvePosterPath(raw));
      return;
    }

    void this.applyYoutubeThumbnailIdlePoster();
  }

  private async applyYoutubeThumbnailIdlePoster(): Promise<void> {
    const videoId = this.videoId;
    if (!videoId || !this.chromelessEmbedActive()) {
      return;
    }

    const thumbnailUrl = await resolveYoutubeThumbnailPosterUrl(videoId);
    if (!thumbnailUrl || videoId !== this.videoId) {
      return;
    }

    applyPosterImageToVideoWrapper(this.player, thumbnailUrl);
  }

  private setYoutubeIdleCover(active: boolean): void {
    if (!this.chromelessEmbedActive()) {
      return;
    }
    if (active) {
      this.applyChromelessIdlePoster();
    }
    setEmbedIdleCover(this.player, active);
  }

  createIframe() {
    // Hide original element
    this.player.element.style.display = 'none';
    if (this.chromelessEmbedActive()) {
      this.setYoutubeIdleCover(true);
    } else {
      this.player.clearVideoPosterForExternalEmbed?.();
    }

    const prefix = this.player.options.classPrefix;
    const playerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;

    this.iframe = document.createElement('div');
    this.iframe.id = playerId;
    this.iframe.style.width = '100%';
    this.iframe.style.maxHeight = '100%';

    if (this.chromelessEmbedActive()) {
      const crop = document.createElement('div');
      crop.className = `${prefix}-youtube-crop`;
      this.youtubeMount = document.createElement('div');
      this.youtubeMount.id = `${playerId}-mount`;
      crop.appendChild(this.youtubeMount);
      this.iframe.appendChild(crop);
    } else {
      this.youtubeMount = null;
    }

    this.syncChromelessHostClasses(false);

    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }

  private youtubePlayerElementId(): string {
    return this.youtubeMount?.id ?? this.iframe?.id ?? '';
  }

  async initializePlayer() {
    return new Promise<void>((resolve, reject) => {
      const playerElementId = this.youtubePlayerElementId();
      if (!window.YT || !this.iframe || !playerElementId) {
        // The SDK never became available (or the iframe container is missing).
        // Reject so Player.init() surfaces a real failure instead of treating
        // a non-functional embed as a successful initialization.
        reject(new Error('YouTube IFrame API is not available'));
        return;
      }
      const providerChrome = this.usesProviderChrome();
      this.youtube = new window.YT.Player(playerElementId, {
        host: YouTubeRenderer.EMBED_HOST,
        videoId: this.videoId ?? undefined,
        width: '100%',
        height: '100%',
        playerVars: {
          enablejsapi: 1,
          controls: providerChrome ? 1 : 0,
          disablekb: providerChrome ? 0 : 1,
          fs: providerChrome ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          // iOS rejects programmatic/autoplay starts inside cross-origin embeds; leave
          // the video cued so the visitor starts it with a tap on YouTube's control.
          autoplay: isIOS() ? 0 : this.player.options.autoplay ? 1 : 0,
          mute: this.player.options.muted ? 1 : 0,
          start: this.player.options.startTime || 0,
          ...(!providerChrome && this.player.options.loop && this.videoId
            ? { loop: 1, playlist: this.videoId }
            : {}),
          ...YouTubeRenderer.embedIdentityPlayerVars()
        },
        events: {
          onReady: (_event: unknown) => {
            this.isReady = true;
            YouTubeRenderer.applyEmbedReferrerPolicy(this.youtube);
            this.applyChromelessEmbedAccessibility();
            this.attachEvents();
            this.player.syncEmbedChromeClass('youtube');
            this.syncChromelessHostClasses(true);
            if (this.chromelessEmbedActive()) {
              this.setYoutubeIdleCover(true);
            }
            this.syncEmbedCaptionBridgeFromApi();
            this.syncInFrameCaptionsWithVidPly();
            void syncYoutubeEmbedAspectRatio(this.player, this.videoId);
            this.refreshSidecarCaptionControls();
            resolve();
          },
          onApiChange: () => {
            this.syncEmbedCaptionBridgeFromApi();
            this.syncInFrameCaptionsWithVidPly();
          },
          onStateChange: (event: unknown) => this.handleStateChange(event as { data: number }),
          onError: (event: unknown) => this.handleError(event as { data: 2 | 5 | 100 | 101 | 150 })
        }
      });
    });
  }

  /**
   * YouTube paints the end-screen before the ENDED event; stop slightly early and
   * restore the VidPly poster cover (Google does not allow disabling that UI).
   */
  private maybePreemptYoutubeEndScreen(currentTime: number, duration: number): void {
    if (this.usesProviderChrome() || !this.youtube || this.endScreenPreempted) {
      return;
    }
    if (this.player.options.loop || duration <= 0) {
      return;
    }
    const remaining = duration - currentTime;
    if (remaining > 0.45 || remaining < 0) {
      return;
    }

    this.endScreenPreempted = true;
    this.youtube.pauseVideo();
    this.youtube.seekTo(0, true);
    this.player.state.playing = false;
    this.player.state.paused = true;
    this.player.state.ended = true;
    this.player.state.currentTime = 0;
    this.setYoutubeIdleCover(true);
    this.player.controlBar?.updatePlayPauseButton();
    this.player.emit('ended');
  }

  attachEvents() {
    // Set up polling for time updates (YouTube doesn't provide timeupdate events)
    this.timeUpdateInterval = setInterval(() => {
      const youtube = this.youtube;
      if (this.isReady && youtube) {
        const currentTime = youtube.getCurrentTime();
        const duration = youtube.getDuration();

        this.player.state.currentTime = currentTime;
        this.player.state.duration = duration;

        this.maybePreemptYoutubeEndScreen(currentTime, duration);

        this.player.emit('timeupdate', currentTime);
      }
    }, 250);

    // Initial metadata
    const youtube = this.youtube;
    if (youtube && youtube.getDuration) {
      this.player.state.duration = youtube.getDuration();
      this.player.emit('loadedmetadata');
    }
  }

  handleStateChange(event: { data: number }) {
    const states = window.YT?.PlayerState;
    if (!states) return;

    switch (event.data) {
      case states.PLAYING:
        this.player.state.playing = true;
        this.player.state.paused = false;
        this.player.state.ended = false;
        this.player.state.buffering = false;
        if (!this.usesProviderChrome()) {
          this.endScreenPreempted = false;
          this.setYoutubeIdleCover(false);
          this.player.setEmbedChromeReproducing(true);
        }
        this.syncInFrameCaptionsWithVidPly();
        this.player.emit('play');
        this.player.emit('playing');

        if (this.player.options.onPlay) {
          this.player.options.onPlay.call(this.player);
        }
        break;

      case states.PAUSED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        if (!this.usesProviderChrome()) {
          this.player.setEmbedChromeReproducing(false);
          this.player.positionPlayOverlayOnMobile();
        }
        this.player.emit('pause');

        if (this.player.options.onPause) {
          this.player.options.onPause.call(this.player);
        }
        break;

      case states.ENDED:
        if (this.endScreenPreempted) {
          this.endScreenPreempted = false;
          break;
        }

        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.state.ended = true;
        this.player.emit('ended');

        if (this.player.options.onEnded) {
          this.player.options.onEnded.call(this.player);
        }

        if (this.player.options.loop && this.youtube) {
          this.youtube.seekTo(0);
          this.youtube.playVideo();
        } else if (!this.usesProviderChrome() && this.youtube) {
          this.youtube.pauseVideo();
          this.youtube.seekTo(0, true);
          this.player.setEmbedChromeReproducing(false);
          this.setYoutubeIdleCover(true);
          this.player.controlBar?.updatePlayPauseButton();
        }
        break;

      case states.BUFFERING:
        this.player.state.buffering = true;
        this.player.emit('waiting');
        break;

      case states.CUED:
        this.player.emit('loadedmetadata');
        break;
    }
  }

  handleError(event: { data: 2 | 5 | 100 | 101 | 150 }) {
    const errors = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found',
      101: 'Video not allowed to be played in embedded players',
      150: 'Video not allowed to be played in embedded players'
    };

    const error = new Error(errors[event.data] || 'YouTube player error');
    this.player.handleError(error);
  }

  /**
   * Switch to another YouTube video without recreating the iframe player.
   * Used by playlist track changes when the renderer type stays `youtube`.
   */
  loadSource(src: string) {
    const videoId = this.extractVideoId(src);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    if (videoId === this.videoId) {
      return;
    }

    this.videoId = videoId;
    this.player.currentSource = src;
    this.endScreenPreempted = false;
    this.embedCaptionBridgeActive = false;
    this.youtubeEmbedCaptionMenu = [];
    this.youtubeEmbedCaptionTracks.clear();

    if (this.isReady && this.youtube) {
      // Cue only — PlaylistManager / Player.play() starts playback explicitly.
      this.youtube.cueVideoById(videoId);
      if (this.chromelessEmbedActive()) {
        this.setYoutubeIdleCover(true);
      }
      void syncYoutubeEmbedAspectRatio(this.player, this.videoId);
      this.syncEmbedCaptionBridgeFromApi();
      this.syncInFrameCaptionsWithVidPly();
      this.refreshSidecarCaptionControls();
    }
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

  seek(time: number) {
    if (this.isReady && this.youtube) {
      this.youtube.seekTo(time, true);
    }
  }

  setVolume(volume: number) {
    if (this.isReady && this.youtube) {
      this.youtube.setVolume(volume * 100);
      this.player.state.volume = volume;
    }
  }

  setMuted(muted: boolean) {
    if (this.isReady && this.youtube) {
      if (muted) {
        this.youtube.mute();
      } else {
        this.youtube.unMute();
      }
      this.player.state.muted = muted;
    }
  }

  setPlaybackSpeed(speed: number) {
    if (this.isReady && this.youtube) {
      this.youtube.setPlaybackRate(speed);
      this.player.state.playbackSpeed = speed;
    }
  }

  handlesOwnCaptions(): boolean {
    return this.embedCaptionBridgeActive && !this.usesProviderChrome();
  }

  async getEmbedCaptionTracks(): Promise<EmbedCaptionTrack[]> {
    if (!this.embedCaptionBridgeActive || this.usesProviderChrome()) {
      return [];
    }
    return [...this.youtubeEmbedCaptionMenu];
  }

  async setEmbedCaptionTrack(trackId: string | null): Promise<void> {
    const youtube = this.youtube;
    if (!youtube || !this.embedCaptionBridgeActive || this.usesProviderChrome()) {
      return;
    }
    if (trackId === null) {
      youtube.setOption?.('captions', 'track', {});
      return;
    }
    const raw = this.youtubeEmbedCaptionTracks.get(trackId);
    if (raw) {
      youtube.setOption?.('captions', 'track', raw);
    }
  }

  destroy() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    if (this.youtube && this.youtube.destroy) {
      this.youtube.destroy();
    }

    if (this.iframe) {
      this.iframe.removeAttribute('inert');
      if (this.iframe.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe);
      }
    }
    this.youtubeMount = null;
    this.embedCaptionBridgeActive = false;
    this.youtubeEmbedCaptionMenu = [];
    this.youtubeEmbedCaptionTracks.clear();

    const prefix = this.player.options.classPrefix;
    this.player.container?.classList.remove(`${prefix}-embed-youtube`);
    clearEmbedIdleCover(this.player);
    this.player.setEmbedChromeReproducing(false);
    this.player.clearEmbedAspectRatio?.();

    // Show original element
    if (this.player.element) {
      this.player.element.style.display = '';
    }
  }
}
