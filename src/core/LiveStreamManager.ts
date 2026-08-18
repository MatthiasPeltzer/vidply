import type { Player } from './Player.js';

type LiveEdgeChangeDetail = {
  behindLive: boolean;
  liveEdge: number | null;
};

/**
 * Detects live streams, tracks the live edge, and exposes seek clamping /
 * "behind live" state for the control bar and keyboard shortcuts.
 */
export class LiveStreamManager {
  private readonly player: Player;
  private readonly boundRefresh: () => void;
  private readonly boundReset: () => void;
  /** Set by renderers when the manifest reports a dynamic/live playlist. */
  private sourceReportsLive: boolean | null = null;

  constructor(player: Player) {
    this.player = player;
    this.boundRefresh = () => this.refresh();
    this.boundReset = () => {
      this.sourceReportsLive = null;
      this.refresh();
      this.player.controlBar?.updateLiveControls();
    };

    this.player.on('timeupdate', this.boundRefresh);
    this.player.on('durationchange', this.boundRefresh);
    this.player.on('loadedmetadata', this.boundRefresh);
    this.player.on('seeked', this.boundRefresh);
    this.player.on('hlsmanifestparsed', this.boundRefresh);
    this.player.on('dashmanifestloaded', this.boundRefresh);
    this.player.on('sourcechange', this.boundReset);
  }

  destroy(): void {
    this.player.off('timeupdate', this.boundRefresh);
    this.player.off('durationchange', this.boundRefresh);
    this.player.off('loadedmetadata', this.boundRefresh);
    this.player.off('seeked', this.boundRefresh);
    this.player.off('hlsmanifestparsed', this.boundRefresh);
    this.player.off('dashmanifestloaded', this.boundRefresh);
    this.player.off('sourcechange', this.boundReset);
  }

  /** Clear manifest live hints when the media source changes (before the new manifest loads). */
  resetForSourceChange(): void {
    this.boundReset();
  }

  /**
   * hls.js exposes `liveSyncPosition` for VOD too (edge minus target latency).
   * Only trust the playlist `live` flag once the level manifest is loaded.
   */
  private hlsPlaylistIsLive(hls: HlsInstance | null): boolean | null {
    if (!hls) {
      return null;
    }

    const details = hls.latestLevelDetails;
    if (details && typeof details.live === 'boolean') {
      return details.live;
    }

    return null;
  }

  /** Called by HLSRenderer when the manifest or buffer state indicates live. */
  evaluateHls(hls: HlsInstance | null): void {
    if (!hls) {
      return;
    }

    const playlistLive = this.hlsPlaylistIsLive(hls);
    if (playlistLive === null) {
      return;
    }

    this.applySourceLiveReport(playlistLive);
  }

  /** Called by DASHRenderer after the MPD is loaded (and again once playback starts). */
  evaluateDash(dash: DashMediaPlayerInstance | null, manifestData?: unknown): void {
    const fromManifest = this.parseDashManifestLive(manifestData);
    if (fromManifest !== null) {
      this.applySourceLiveReport(fromManifest);
      return;
    }

    if (!dash || typeof dash.isDynamic !== 'function') {
      return;
    }

    try {
      this.applySourceLiveReport(dash.isDynamic());
    } catch {
      // dash.js throws PLAYBACK_NOT_INITIALIZED_ERROR until STREAM_INITIALIZED.
    }
  }

  /**
   * Infer live/VOD from a DASH MPD payload (MANIFEST_LOADED event data).
   * Returns null when the manifest type is not available.
   */
  parseDashManifestLive(manifestData: unknown): boolean | null {
    if (!manifestData || typeof manifestData !== 'object') {
      return null;
    }

    const data = manifestData as {
      type?: string;
      manifestInfo?: { type?: string };
    };
    const type = data.type ?? data.manifestInfo?.type;
    if (type === 'static') {
      return false;
    }
    if (type === 'dynamic') {
      return true;
    }

    return null;
  }

  private applySourceLiveReport(isLive: boolean): void {
    if (this.sourceReportsLive === isLive) {
      this.refresh();
      this.player.controlBar?.updateLiveControls();
      return;
    }

    this.sourceReportsLive = isLive;
    this.refresh();
    this.player.controlBar?.updateLiveControls();
  }

  /** Current manifest/playlist live hint from the active renderer, if known. */
  getSourceReportsLive(): boolean | null {
    return this.sourceReportsLive;
  }

  /** Called when a renderer learns live/VOD from a fetched level/media playlist. */
  reportSourceLive(isLive: boolean): void {
    this.applySourceLiveReport(isLive);
  }

  /**
   * Infer live/VOD from a fetched HLS media playlist before hls.js loads level details.
   * Returns null when the text is not a usable media playlist.
   */
  parseHlsMediaPlaylistLive(m3u8Text: string): boolean | null {
    const text = m3u8Text.replace(/\r\n/g, '\n');
    if (!text.trimStart().startsWith('#EXTM3U')) {
      return null;
    }

    if (/#EXT-X-PLAYLIST-TYPE:VOD/i.test(text) || /#EXT-X-ENDLIST/i.test(text)) {
      return false;
    }

    if (/#EXT-X-PLAYLIST-TYPE:EVENT/i.test(text)) {
      return true;
    }

    if (/#EXTINF:/.test(text)) {
      return true;
    }

    return null;
  }

  /** True once the source is confidently VOD (not merely "not live yet"). */
  isConfirmedVod(): boolean {
    const option = this.player.options.liveStream;
    if (option === false) {
      return true;
    }
    if (option === true) {
      return false;
    }
    if (this.sourceReportsLive === false) {
      return true;
    }
    if (this.sourceReportsLive === true) {
      return false;
    }

    const initialDuration = Number(this.player.options.initialDuration);
    if (Number.isFinite(initialDuration) && initialDuration > 0) {
      return true;
    }

    // Plain HTML5 audio/video: a finite duration after metadata means VOD.
    // Streaming renderers may report Infinity during startup, so only apply this
    // when the active renderer is HTML5 (or not yet chosen).
    if (this.isPlainHtml5Renderer() && this.hasFiniteMediaDuration() && !this.resolveIsLive()) {
      return true;
    }

    // DASH VOD: once playback exposes a finite duration and we are not live,
    // treat as confirmed VOD even if isDynamic() was unavailable earlier.
    if (this.isDashRenderer() && this.sourceReportsLive !== true
      && this.hasFiniteMediaDuration() && !this.resolveIsLive()) {
      return true;
    }

    return false;
  }

  private isDashRenderer(): boolean {
    return this.player.renderer?.rendererType === 'dash';
  }

  private isPlainHtml5Renderer(): boolean {
    const renderer = this.player.renderer;
    return !renderer || renderer.rendererType === 'html5';
  }

  private hasFiniteMediaDuration(): boolean {
    const media = this.player.element;
    return Boolean(media && Number.isFinite(media.duration) && media.duration > 0);
  }

  /** VOD skip-forward, or live catch-up when behind the edge. */
  shouldShowForwardSkip(): boolean {
    if (this.player.state.isLive) {
      return this.player.state.behindLive;
    }

    return this.isConfirmedVod();
  }

  /** Restart is a VOD-only affordance once the source is confirmed VOD. */
  shouldShowRestart(): boolean {
    return this.isConfirmedVod() && !this.player.state.isLive;
  }

  resolveIsLive(): boolean {
    const option = this.player.options.liveStream;
    if (option === true) {
      return true;
    }
    if (option === false) {
      return false;
    }

    if (this.sourceReportsLive === true) {
      return true;
    }
    if (this.sourceReportsLive === false) {
      return false;
    }

    return this.detectFromMedia();
  }

  detectFromMedia(): boolean {
    const media = this.player.element;
    if (!media) {
      return false;
    }

    const renderer = this.player.renderer;

    if (renderer?.rendererType === 'hls') {
      const hls = (renderer as { hls?: HlsInstance | null }).hls ?? null;
      const playlistLive = this.hlsPlaylistIsLive(hls);
      if (playlistLive === true) {
        return true;
      }
      if (playlistLive === false) {
        return false;
      }
      // Level playlist not loaded yet — MSE may already report Infinity
      // duration during startup; never infer live from that alone.
      return false;
    }

    if (renderer?.rendererType === 'dash') {
      const dash = (renderer as { dash?: DashMediaPlayerInstance | null }).dash ?? null;
      if (dash && typeof dash.isDynamic === 'function') {
        return dash.isDynamic();
      }
      return false;
    }

    if (media.duration === Infinity) {
      return true;
    }

    return false;
  }

  getLiveEdge(): number | null {
    const media = this.player.element;
    if (!media) {
      return null;
    }

    const renderer = this.player.renderer;
    if (renderer?.rendererType === 'hls') {
      const hls = (renderer as { hls?: HlsInstance | null }).hls ?? null;
      if (this.hlsPlaylistIsLive(hls) === true) {
        const liveSync = hls?.liveSyncPosition;
        if (typeof liveSync === 'number' && Number.isFinite(liveSync)) {
          return liveSync;
        }
      }
    }

    if (media.seekable && media.seekable.length > 0) {
      try {
        const end = media.seekable.end(media.seekable.length - 1);
        if (Number.isFinite(end) && end > 0) {
          return end;
        }
      } catch {
        // ignore invalid seekable ranges
      }
    }

    if (Number.isFinite(media.duration) && media.duration > 0) {
      return media.duration;
    }

    return null;
  }

  getSeekableStart(): number {
    const media = this.player.element;
    if (!media?.seekable?.length) {
      return 0;
    }

    try {
      const start = media.seekable.start(0);
      return Number.isFinite(start) && start >= 0 ? start : 0;
    } catch {
      return 0;
    }
  }

  getSeekRange(): { start: number; end: number } | null {
    if (!this.resolveIsLive()) {
      return null;
    }

    const start = this.getSeekableStart();
    const end = this.getLiveEdge();
    if (end === null || end <= start) {
      return null;
    }

    return { start, end };
  }

  getBehindThreshold(): number {
    const threshold = this.player.options.liveBehindThreshold;
    return typeof threshold === 'number' && Number.isFinite(threshold) && threshold >= 0
      ? threshold
      : 5;
  }

  isBehindLive(): boolean {
    if (!this.resolveIsLive()) {
      return false;
    }

    return this.getSecondsBehindLive() > this.getBehindThreshold();
  }

  getSecondsBehindLive(): number {
    if (!this.resolveIsLive()) {
      return 0;
    }

    const edge = this.getLiveEdge();
    if (edge === null) {
      return 0;
    }

    return Math.max(0, edge - this.player.state.currentTime);
  }

  clampSeekTime(time: number): number {
    if (!Number.isFinite(time)) {
      return 0;
    }

    let clamped = Math.max(0, time);
    if (!this.resolveIsLive()) {
      return clamped;
    }

    clamped = Math.max(clamped, this.getSeekableStart());
    const edge = this.getLiveEdge();
    if (edge !== null) {
      clamped = Math.min(clamped, edge);
    }

    return clamped;
  }

  seekToLive(): void {
    const edge = this.getLiveEdge();
    if (edge === null) {
      return;
    }

    this.player.seek(edge);
    if (!this.player.state.playing) {
      void this.player.play();
    }
  }

  refresh(): void {
    const wasLive = this.player.state.isLive;
    const wasBehind = this.player.state.behindLive;

    const isLive = this.resolveIsLive();
    const liveEdge = isLive ? this.getLiveEdge() : null;
    const behindLive = isLive && this.isBehindLive();

    this.player.state.isLive = isLive;
    this.player.state.liveEdge = liveEdge;
    this.player.state.behindLive = behindLive;

    const prefix = this.player.options.classPrefix;
    this.player.container?.classList.toggle(`${prefix}-is-live`, isLive);
    this.player.container?.classList.toggle(`${prefix}-behind-live`, behindLive);

    if (wasLive !== isLive) {
      this.player.emit('livechange', isLive);
    }

    if (wasBehind !== behindLive) {
      const detail: LiveEdgeChangeDetail = { behindLive, liveEdge };
      this.player.emit('liveedgechange', detail);
    }
  }
}
