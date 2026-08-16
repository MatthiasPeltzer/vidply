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

  /** Called by HLSRenderer when the manifest or buffer state indicates live. */
  evaluateHls(hls: HlsInstance | null): void {
    if (!hls) {
      return;
    }

    const liveSync = hls.liveSyncPosition;
    if (typeof liveSync === 'number' && Number.isFinite(liveSync)) {
      this.sourceReportsLive = true;
      this.refresh();
    }
  }

  /** Called by DASHRenderer after the MPD is loaded. */
  evaluateDash(dash: DashMediaPlayerInstance | null): void {
    if (!dash || typeof dash.isDynamic !== 'function') {
      return;
    }

    if (dash.isDynamic()) {
      this.sourceReportsLive = true;
      this.refresh();
    }
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

    if (media.duration === Infinity || !Number.isFinite(media.duration)) {
      return true;
    }

    const renderer = this.player.renderer;
    if (renderer?.rendererType === 'hls') {
      const hls = (renderer as { hls?: HlsInstance | null }).hls ?? null;
      const liveSync = hls?.liveSyncPosition;
      if (typeof liveSync === 'number' && Number.isFinite(liveSync)) {
        return true;
      }
    }

    if (renderer?.rendererType === 'dash') {
      const dash = (renderer as { dash?: DashMediaPlayerInstance | null }).dash ?? null;
      if (dash && typeof dash.isDynamic === 'function' && dash.isDynamic()) {
        return true;
      }
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
      const liveSync = hls?.liveSyncPosition;
      if (typeof liveSync === 'number' && Number.isFinite(liveSync)) {
        return liveSync;
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
