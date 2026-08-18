/**
 * Unit Tests: LiveStreamManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LiveStreamManager } from '../../src/core/LiveStreamManager.js';

function createMockPlayer(overrides = {}) {
  const listeners = new Map();

  const player = {
    options: {
      classPrefix: 'vidply',
      liveStream: 'auto',
      liveBehindThreshold: 5,
    },
    state: {
      currentTime: 0,
      isLive: false,
      behindLive: false,
      liveEdge: null,
    },
    element: document.createElement('audio'),
    renderer: null,
    container: document.createElement('div'),
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
      return player;
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
      return player;
    },
    emit(event, ...args) {
      listeners.get(event)?.forEach((handler) => handler(...args));
    },
    seek: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return player;
}

describe('LiveStreamManager', () => {
  /** @type {ReturnType<typeof createMockPlayer>} */
  let player;
  /** @type {LiveStreamManager} */
  let manager;

  beforeEach(() => {
    player = createMockPlayer();
    manager = new LiveStreamManager(player);
  });

  afterEach(() => {
    manager.destroy();
  });

  it('forces live mode when liveStream option is true', () => {
    player.options.liveStream = true;
    expect(manager.resolveIsLive()).toBe(true);
  });

  it('forces VOD mode when liveStream option is false', () => {
    player.options.liveStream = false;
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: Infinity,
    });
    expect(manager.resolveIsLive()).toBe(false);
  });

  it('detects live streams from Infinity duration in auto mode', () => {
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: Infinity,
    });
    manager.refresh();
    expect(player.state.isLive).toBe(true);
    expect(player.container.classList.contains('vidply-is-live')).toBe(true);
  });

  it('does not treat unknown duration as live before metadata is loaded', () => {
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: NaN,
    });
    manager.refresh();
    expect(player.state.isLive).toBe(false);
    expect(player.container.classList.contains('vidply-is-live')).toBe(false);
  });

  it('marks the user as behind live when currentTime is before the edge', () => {
    player.options.liveStream = true;
    Object.defineProperty(player.element, 'seekable', {
      configurable: true,
      value: {
        length: 1,
        start: () => 100,
        end: () => 200,
      },
    });
    player.state.currentTime = 180;
    manager.refresh();
    expect(player.state.behindLive).toBe(true);
    expect(player.container.classList.contains('vidply-behind-live')).toBe(true);
  });

  it('clamps seekForward target to the live edge', () => {
    player.options.liveStream = true;
    Object.defineProperty(player.element, 'seekable', {
      configurable: true,
      value: {
        length: 1,
        start: () => 0,
        end: () => 100,
      },
    });
    player.state.currentTime = 95;
    expect(manager.clampSeekTime(110)).toBe(100);
  });

  it('seeks to the live edge via seekToLive()', () => {
    player.options.liveStream = true;
    Object.defineProperty(player.element, 'seekable', {
      configurable: true,
      value: {
        length: 1,
        start: () => 0,
        end: () => 250,
      },
    });
    manager.seekToLive();
    expect(player.seek).toHaveBeenCalledWith(250);
    expect(player.play).toHaveBeenCalled();
  });

  it('does not treat VOD HLS Infinity duration as live when level details say VOD', () => {
    player.renderer = {
      rendererType: 'hls',
      hls: {
        latestLevelDetails: { live: false },
      },
    };
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: Infinity,
    });
    expect(manager.resolveIsLive()).toBe(false);
  });

  it('evaluates live HLS playlists via latestLevelDetails.live', () => {
    manager.evaluateHls({
      liveSyncPosition: 42,
      latestLevelDetails: { live: true },
    });
    expect(player.state.isLive).toBe(true);
  });

  it('does not treat VOD HLS liveSyncPosition as live (Apple BipBop case)', () => {
    manager.evaluateHls({
      liveSyncPosition: 597,
      latestLevelDetails: { live: false, edge: 600 },
    });
    expect(player.state.isLive).toBe(false);
    expect(player.container.classList.contains('vidply-is-live')).toBe(false);
  });

  it('ignores HLS liveSyncPosition until the level playlist is loaded', () => {
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: 600,
    });
    manager.evaluateHls({ liveSyncPosition: 597 });
    manager.refresh();
    expect(player.state.isLive).toBe(false);
  });

  it('resets live state on sourcechange', () => {
    manager.evaluateHls({
      latestLevelDetails: { live: true },
    });
    expect(player.state.isLive).toBe(true);

    player.emit('sourcechange', {});
    expect(manager.getSourceReportsLive()).toBe(null);
    expect(player.state.isLive).toBe(false);
    expect(player.container.classList.contains('vidply-is-live')).toBe(false);
  });

  it('resetForSourceChange clears a prior live report', () => {
    manager.evaluateHls({
      latestLevelDetails: { live: true },
    });
    expect(player.state.isLive).toBe(true);

    manager.resetForSourceChange();
    expect(manager.getSourceReportsLive()).toBe(null);
    expect(player.state.isLive).toBe(false);
  });

  it('evaluates dynamic DASH manifests', () => {
    manager.evaluateDash({ isDynamic: () => true });
    expect(player.state.isLive).toBe(true);
  });

  it('confirms VOD DASH from MANIFEST_LOADED payload before playback starts', () => {
    manager.evaluateDash(null, { type: 'static' });
    expect(manager.isConfirmedVod()).toBe(true);
    expect(manager.shouldShowRestart()).toBe(true);
    expect(manager.shouldShowForwardSkip()).toBe(true);
  });

  it('parses dynamic DASH manifest payloads', () => {
    expect(manager.parseDashManifestLive({ type: 'dynamic' })).toBe(true);
    expect(manager.parseDashManifestLive({ manifestInfo: { type: 'static' } })).toBe(false);
  });

  it('ignores isDynamic when it throws before playback initialization', () => {
    manager.evaluateDash({
      isDynamic: () => {
        throw new Error('PLAYBACK_NOT_INITIALIZED_ERROR');
      },
    });
    expect(manager.isConfirmedVod()).toBe(false);

    manager.evaluateDash(null, { type: 'static' });
    expect(manager.isConfirmedVod()).toBe(true);
  });

  it('confirms DASH VOD from finite duration once playback metadata is known', () => {
    player.renderer = { rendererType: 'dash' };
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: 120,
    });
    manager.refresh();

    expect(manager.isConfirmedVod()).toBe(true);
    expect(manager.shouldShowRestart()).toBe(true);
  });

  it('reports seconds behind the live edge', () => {
    player.options.liveStream = true;
    Object.defineProperty(player.element, 'seekable', {
      configurable: true,
      value: {
        length: 1,
        start: () => 0,
        end: () => 200,
      },
    });
    player.state.currentTime = 185;
    expect(manager.getSecondsBehindLive()).toBe(15);
  });

  it('parses VOD HLS media playlists from ENDLIST / PLAYLIST-TYPE:VOD', () => {
    expect(manager.parseHlsMediaPlaylistLive('#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXTINF:6,\nfile.ts\n#EXT-X-ENDLIST')).toBe(false);
  });

  it('parses live HLS media playlists without ENDLIST', () => {
    expect(manager.parseHlsMediaPlaylistLive('#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\nseg.ts')).toBe(true);
  });

  it('hides forward/restart until VOD is confirmed under liveStream auto', () => {
    player.options.initialDuration = 0;
    expect(manager.shouldShowForwardSkip()).toBe(false);
    expect(manager.shouldShowRestart()).toBe(false);

    manager.reportSourceLive(false);
    expect(manager.shouldShowForwardSkip()).toBe(true);
    expect(manager.shouldShowRestart()).toBe(true);
  });

  it('uses initialDuration as a VOD hint before the level playlist loads', () => {
    player.options.initialDuration = 600;
    expect(manager.isConfirmedVod()).toBe(true);
    expect(manager.shouldShowForwardSkip()).toBe(true);
  });

  it('confirms VOD from finite HTML5 media duration under liveStream auto', () => {
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: 265.9,
    });
    manager.refresh();

    expect(manager.isConfirmedVod()).toBe(true);
    expect(manager.shouldShowRestart()).toBe(true);
    expect(manager.shouldShowForwardSkip()).toBe(true);
  });

  it('does not confirm VOD from finite duration on HLS before the playlist reports VOD', () => {
    player.renderer = { rendererType: 'hls', hls: null };
    Object.defineProperty(player.element, 'duration', {
      configurable: true,
      value: 600,
    });
    manager.refresh();

    expect(manager.resolveIsLive()).toBe(false);
    expect(manager.isConfirmedVod()).toBe(false);
    expect(manager.shouldShowRestart()).toBe(false);
  });

  it('shows live catch-up forward only when behind the edge', () => {
    player.options.liveStream = true;
    player.state.isLive = true;
    player.state.behindLive = false;
    expect(manager.shouldShowForwardSkip()).toBe(false);

    player.state.behindLive = true;
    expect(manager.shouldShowForwardSkip()).toBe(true);
  });
});
