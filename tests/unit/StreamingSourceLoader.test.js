/**
 * Unit Tests: StreamingSourceLoader
 * Plays progressive, HLS and DASH URLs on a secondary <video> (sign-language
 * overlay) and falls back to a progressive file when a stream fails.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const nativeHls = { value: false };

vi.mock('../../src/utils/PerformanceUtils.js', () => ({
  canPlayNativeHls: () => nativeHls.value
}));

vi.mock('../../src/utils/StreamingLibraries.js', () => ({
  loadHlsLibrary: vi.fn(() => Promise.resolve()),
  loadDashLibrary: vi.fn(() => Promise.resolve())
}));

import { playQuietly, StreamingSourceLoader } from '../../src/utils/StreamingSourceLoader.js';
import { loadDashLibrary, loadHlsLibrary } from '../../src/utils/StreamingLibraries.js';

function installFakeHls({ supported = true } = {}) {
  const instances = [];
  class FakeHls {
    constructor(config) {
      this.config = config;
      this.handlers = {};
      this.attachMedia = vi.fn();
      this.loadSource = vi.fn();
      this.destroy = vi.fn();
      instances.push(this);
    }
    on(event, handler) {
      this.handlers[event] = handler;
    }
    static isSupported() {
      return supported;
    }
  }
  FakeHls.Events = { ERROR: 'hlsError' };
  window.Hls = FakeHls;
  return instances;
}

function installFakeDash() {
  const instances = [];
  const MediaPlayer = () => ({
    create: () => {
      const instance = {
        handlers: {},
        updateSettings: vi.fn(),
        initialize: vi.fn(),
        reset: vi.fn(),
        on(event, handler) {
          instance.handlers[event] = handler;
        }
      };
      instances.push(instance);
      return instance;
    }
  });
  MediaPlayer.events = { ERROR: 'error' };
  window.dashjs = { MediaPlayer };
  return instances;
}

describe('StreamingSourceLoader', () => {
  let video;

  beforeEach(() => {
    nativeHls.value = false;
    video = document.createElement('video');
    window.MediaSource = window.MediaSource ?? function MediaSource() {};
  });

  afterEach(() => {
    delete window.Hls;
    delete window.dashjs;
    vi.clearAllMocks();
  });

  it('sets progressive sources directly on the element', async () => {
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.mp4');

    expect(video.getAttribute('src')).toBe('/sign/en.mp4');
    expect(loader.engine).toBe('native');
    expect(loadHlsLibrary).not.toHaveBeenCalled();
  });

  it('uses native HLS where the browser supports it', async () => {
    nativeHls.value = true;
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.m3u8');

    expect(video.getAttribute('src')).toBe('/sign/en.m3u8');
    expect(loadHlsLibrary).not.toHaveBeenCalled();
  });

  it('attaches hls.js elsewhere, capped to the overlay size', async () => {
    const instances = installFakeHls();
    const loader = new StreamingSourceLoader(video, { hlsScriptUrl: '/hls.js' });

    await loader.load('/sign/en.m3u8');

    expect(loadHlsLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ hlsScriptUrl: '/hls.js' })
    );
    expect(instances).toHaveLength(1);
    expect(instances[0].config.capLevelToPlayerSize).toBe(true);
    expect(instances[0].attachMedia).toHaveBeenCalledWith(video);
    expect(instances[0].loadSource).toHaveBeenCalledWith('/sign/en.m3u8');
    expect(loader.engine).toBe('hls.js');
  });

  it('switches to the progressive fallback on a fatal hls.js error', async () => {
    const instances = installFakeHls();
    const log = vi.fn();
    const loader = new StreamingSourceLoader(video, { log });

    await loader.load('/sign/en.m3u8', '/sign/en-480p.mp4');
    instances[0].handlers.hlsError('hlsError', {
      fatal: true,
      type: 'networkError',
      details: 'manifestLoadError'
    });

    expect(instances[0].destroy).toHaveBeenCalled();
    expect(video.getAttribute('src')).toBe('/sign/en-480p.mp4');
    expect(loader.engine).toBe('native');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('manifestLoadError'), 'warn');
  });

  it('ignores non-fatal hls.js errors', async () => {
    const instances = installFakeHls();
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.m3u8', '/sign/en-480p.mp4');
    instances[0].handlers.hlsError('hlsError', {
      fatal: false,
      type: 'networkError',
      details: 'x'
    });

    expect(loader.engine).toBe('hls.js');
  });

  it('falls back when hls.js is unsupported', async () => {
    installFakeHls({ supported: false });
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.m3u8', '/sign/en-480p.mp4');

    expect(video.getAttribute('src')).toBe('/sign/en-480p.mp4');
  });

  it('falls back when the library cannot be loaded', async () => {
    loadHlsLibrary.mockRejectedValueOnce(new Error('blocked by CSP'));
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.m3u8', '/sign/en-480p.mp4');

    expect(video.getAttribute('src')).toBe('/sign/en-480p.mp4');
  });

  it('attaches dash.js for DASH manifests and falls back on its error event', async () => {
    const instances = installFakeDash();
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.mpd', '/sign/en-480p.mp4');

    expect(loadDashLibrary).toHaveBeenCalled();
    expect(instances[0].initialize).toHaveBeenCalledWith(video, '/sign/en.mpd', false);
    expect(loader.engine).toBe('dash.js');

    instances[0].handlers.error({ error: { code: 25 } });

    expect(instances[0].reset).toHaveBeenCalled();
    expect(video.getAttribute('src')).toBe('/sign/en-480p.mp4');
  });

  it('falls back on a media element error of a native source', async () => {
    nativeHls.value = true;
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.m3u8', '/sign/en-480p.mp4');
    video.dispatchEvent(new Event('error'));

    expect(video.getAttribute('src')).toBe('/sign/en-480p.mp4');
  });

  it('does not loop when the fallback fails as well', async () => {
    nativeHls.value = true;
    const log = vi.fn();
    const loader = new StreamingSourceLoader(video, { log });

    await loader.load('/sign/en.m3u8', '/sign/en-480p.mp4');
    video.dispatchEvent(new Event('error'));
    video.dispatchEvent(new Event('error'));

    expect(video.getAttribute('src')).toBe('/sign/en-480p.mp4');
    expect(log).toHaveBeenLastCalledWith(expect.stringContaining('failed'), 'warn');
  });

  it('tears the previous engine down when loading another source', async () => {
    const instances = installFakeHls();
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.m3u8');
    await loader.load('/sign/de.mp4');

    expect(instances[0].destroy).toHaveBeenCalled();
    expect(video.getAttribute('src')).toBe('/sign/de.mp4');
  });

  it('drops an outdated load that resolves after a newer one', async () => {
    const instances = installFakeHls();
    let release;
    loadHlsLibrary.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    const loader = new StreamingSourceLoader(video);

    const first = loader.load('/sign/en.m3u8');
    await loader.load('/sign/de.mp4');
    release();
    await first;

    expect(instances).toHaveLength(0);
    expect(video.getAttribute('src')).toBe('/sign/de.mp4');
  });

  it('destroy() releases the engine and the element source', async () => {
    const instances = installFakeHls();
    const loader = new StreamingSourceLoader(video);

    await loader.load('/sign/en.m3u8');
    loader.destroy();

    expect(instances[0].destroy).toHaveBeenCalled();
    expect(video.hasAttribute('src')).toBe(false);
    expect(loader.engine).toBe('none');
  });

  it('playQuietly() tolerates refused and missing play promises', async () => {
    const refused = { play: vi.fn(() => Promise.reject(new Error('NotAllowedError'))) };
    const legacy = { play: vi.fn(() => undefined) };

    expect(() => playQuietly(refused)).not.toThrow();
    expect(() => playQuietly(legacy)).not.toThrow();
    await Promise.resolve();
  });
});
