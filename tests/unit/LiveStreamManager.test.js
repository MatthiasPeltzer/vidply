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

  it('evaluates HLS liveSyncPosition', () => {
    manager.evaluateHls({ liveSyncPosition: 42 });
    manager.refresh();
    expect(player.state.isLive).toBe(true);
  });

  it('evaluates dynamic DASH manifests', () => {
    manager.evaluateDash({ isDynamic: () => true });
    manager.refresh();
    expect(player.state.isLive).toBe(true);
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
});
