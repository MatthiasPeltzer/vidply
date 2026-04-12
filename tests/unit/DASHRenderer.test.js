/**
 * Unit Tests: DASHRenderer
 * Tests DASH streaming support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DASHRenderer } from '../../src/renderers/DASHRenderer.js';

describe('DASHRenderer', () => {
  let renderer;
  let mockPlayer;
  let mockMedia;
  let mockDashInstance;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();

    mockMedia = document.createElement('video');
    mockMedia.src = 'https://example.com/stream.mpd';
    document.body.appendChild(mockMedia);

    mockPlayer = {
      element: mockMedia,
      currentSource: 'https://example.com/stream.mpd',
      container: document.createElement('div'),
      options: {
        debug: false,
        deferLoad: false,
        autoplay: false,
        loop: false
      },
      state: {
        duration: 0,
        currentTime: 0,
        volume: 1,
        muted: false,
        playing: false,
        paused: true,
        ended: false,
        buffering: false
      },
      emit: vi.fn(),
      handleError: vi.fn(),
      log: vi.fn(),
      seek: vi.fn(),
      play: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      invalidateTrackCache: vi.fn()
    };

    mockDashInstance = {
      initialize: vi.fn(),
      attachSource: vi.fn(),
      attachTTMLRenderingDiv: vi.fn(),
      updateSettings: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
      getBitrateInfoListFor: vi.fn(() => [
        { height: 360, width: 640, bitrate: 800000, qualityIndex: 0 },
        { height: 720, width: 1280, bitrate: 2500000, qualityIndex: 1 },
        { height: 1080, width: 1920, bitrate: 5000000, qualityIndex: 2 }
      ]),
      getQualityFor: vi.fn(() => 1),
      setQualityFor: vi.fn(),
      getSettings: vi.fn(() => ({
        streaming: {
          abr: {
            autoSwitchBitrate: { video: true, audio: true }
          }
        }
      }))
    };

    window.dashjs = {
      MediaPlayer: vi.fn(() => ({
        create: vi.fn(() => mockDashInstance)
      })),
    };
    window.dashjs.MediaPlayer.events = {
      MANIFEST_LOADED: 'manifestLoaded',
      QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
      TEXT_TRACKS_ADDED: 'allTextTracksAdded',
      STREAM_INITIALIZED: 'streamInitialized',
      ERROR: 'error',
      FRAGMENT_LOADING_COMPLETED: 'fragmentLoadingCompleted'
    };

    renderer = new DASHRenderer(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
    delete window.dashjs;
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      expect(renderer.player).toBe(mockPlayer);
    });

    it('should store media element', () => {
      expect(renderer.media).toBe(mockMedia);
    });

    it('should initialize with null dash instance', () => {
      expect(renderer.dash).toBeNull();
    });

    it('should initialize dashSourceLoaded to false', () => {
      expect(renderer._dashSourceLoaded).toBe(false);
    });
  });

  describe('initDashJs', () => {
    it('should hide native controls', async () => {
      await renderer.initDashJs();

      expect(mockMedia.controls).toBe(false);
    });

    it('should create dash.js MediaPlayer instance', async () => {
      await renderer.initDashJs();

      expect(renderer.dash).not.toBeNull();
      expect(renderer.dash.initialize).toBeDefined();
    });

    it('should initialize with media element', async () => {
      await renderer.initDashJs();

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockMedia, null, false);
    });

    it('should attach source when deferLoad is false', async () => {
      await renderer.initDashJs();

      expect(mockDashInstance.attachSource).toHaveBeenCalled();
      expect(renderer._dashSourceLoaded).toBe(true);
    });

    it('should defer loading when deferLoad is true', async () => {
      mockPlayer.options.deferLoad = true;
      renderer = new DASHRenderer(mockPlayer);

      await renderer.initDashJs();

      expect(mockDashInstance.attachSource).not.toHaveBeenCalled();
      expect(renderer._dashSourceLoaded).toBe(false);
      expect(renderer._pendingSrc).toBe(mockPlayer.currentSource);
    });

    it('should throw error when no source found', async () => {
      const emptyVideo = document.createElement('video');
      document.body.appendChild(emptyVideo);

      const playerWithoutSource = {
        ...mockPlayer,
        element: emptyVideo,
        currentSource: null
      };
      emptyVideo.removeAttribute('src');

      renderer = new DASHRenderer(playerWithoutSource);

      await expect(renderer.initDashJs()).rejects.toThrow('No DASH source found');
    });

    it('should remove source elements from media', async () => {
      const source = document.createElement('source');
      source.src = 'https://example.com/stream.mpd';
      mockMedia.appendChild(source);

      await renderer.initDashJs();

      expect(mockMedia.querySelectorAll('source').length).toBe(0);
    });
  });

  describe('attachDashEvents', () => {
    beforeEach(async () => {
      await renderer.initDashJs();
    });

    it('should bind MANIFEST_LOADED event', () => {
      expect(mockDashInstance.on).toHaveBeenCalledWith(
        window.dashjs.MediaPlayer.events.MANIFEST_LOADED,
        expect.any(Function)
      );
    });

    it('should bind QUALITY_CHANGE_RENDERED event', () => {
      expect(mockDashInstance.on).toHaveBeenCalledWith(
        window.dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED,
        expect.any(Function)
      );
    });

    it('should bind ERROR event', () => {
      expect(mockDashInstance.on).toHaveBeenCalledWith(
        window.dashjs.MediaPlayer.events.ERROR,
        expect.any(Function)
      );
    });

    it('should bind STREAM_INITIALIZED event', () => {
      expect(mockDashInstance.on).toHaveBeenCalledWith(
        window.dashjs.MediaPlayer.events.STREAM_INITIALIZED,
        expect.any(Function)
      );
    });

    it('should bind FRAGMENT_LOADING_COMPLETED event', () => {
      expect(mockDashInstance.on).toHaveBeenCalledWith(
        window.dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED,
        expect.any(Function)
      );
    });
  });

  describe('handleDashError', () => {
    beforeEach(async () => {
      await renderer.initDashJs();
    });

    it('should log error details', () => {
      renderer.handleDashError({
        error: { code: 25, message: 'Download error' }
      });

      expect(mockPlayer.log).toHaveBeenCalled();
    });

    it('should report fatal errors to player', () => {
      renderer.handleDashError({
        error: { code: 100, message: 'Fatal download error' }
      });

      expect(mockPlayer.handleError).toHaveBeenCalled();
    });

    it('should log non-fatal errors', () => {
      renderer.handleDashError({
        error: { message: 'Minor issue' }
      });

      expect(mockPlayer.log).toHaveBeenCalledWith(
        expect.stringContaining('Non-fatal'),
        'warn'
      );
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await renderer.initDashJs();
      mockDashInstance.attachSource.mockClear();
    });

    it('should call media.play()', () => {
      const playSpy = vi.spyOn(mockMedia, 'play').mockResolvedValue();

      renderer.play();

      expect(playSpy).toHaveBeenCalled();
    });

    it('should attach source on first play when deferLoad is true', async () => {
      mockPlayer.options.deferLoad = true;
      renderer = new DASHRenderer(mockPlayer);
      await renderer.initDashJs();

      vi.spyOn(mockMedia, 'play').mockResolvedValue();

      renderer.play();

      expect(mockDashInstance.attachSource).toHaveBeenCalled();
    });

    it('should handle play promise rejection', () => {
      vi.spyOn(mockMedia, 'play').mockRejectedValue(new Error('Play failed'));

      expect(() => renderer.play()).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should call media.pause()', async () => {
      await renderer.initDashJs();
      const pauseSpy = vi.spyOn(mockMedia, 'pause');

      renderer.pause();

      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('should set media.currentTime', async () => {
      await renderer.initDashJs();

      renderer.seek(30);

      expect(mockMedia.currentTime).toBe(30);
    });
  });

  describe('setVolume', () => {
    it('should set media.volume', async () => {
      await renderer.initDashJs();

      renderer.setVolume(0.5);

      expect(mockMedia.volume).toBe(0.5);
    });
  });

  describe('setMuted', () => {
    it('should set media.muted', async () => {
      await renderer.initDashJs();

      renderer.setMuted(true);

      expect(mockMedia.muted).toBe(true);
    });
  });

  describe('setPlaybackSpeed', () => {
    it('should set media.playbackRate', async () => {
      await renderer.initDashJs();

      renderer.setPlaybackSpeed(1.5);

      expect(mockMedia.playbackRate).toBe(1.5);
    });
  });

  describe('switchQuality', () => {
    it('should set quality via dash.js API', async () => {
      await renderer.initDashJs();

      renderer.switchQuality(2);

      expect(mockDashInstance.setQualityFor).toHaveBeenCalledWith('video', 2);
      expect(mockDashInstance.updateSettings).toHaveBeenCalledWith({
        streaming: { abr: { autoSwitchBitrate: { video: false } } }
      });
    });

    it('should enable auto quality when index is -1', async () => {
      await renderer.initDashJs();

      renderer.switchQuality(-1);

      expect(mockDashInstance.updateSettings).toHaveBeenCalledWith({
        streaming: { abr: { autoSwitchBitrate: { video: true } } }
      });
    });

    it('should not throw when dash is null', () => {
      renderer.dash = null;
      expect(() => renderer.switchQuality(1)).not.toThrow();
    });
  });

  describe('getQualities', () => {
    it('should return quality levels', async () => {
      await renderer.initDashJs();

      const qualities = renderer.getQualities();

      expect(qualities).toHaveLength(3);
      expect(qualities[0]).toHaveProperty('index', 0);
      expect(qualities[0]).toHaveProperty('height', 360);
      expect(qualities[0]).toHaveProperty('name', '360p');
    });

    it('should format quality names correctly', async () => {
      await renderer.initDashJs();

      const qualities = renderer.getQualities();

      expect(qualities[1].name).toBe('720p');
      expect(qualities[2].name).toBe('1080p');
    });

    it('should handle audio-only levels (height=0)', async () => {
      mockDashInstance.getBitrateInfoListFor.mockReturnValue([
        { height: 0, width: 0, bitrate: 128000 }
      ]);
      await renderer.initDashJs();

      const qualities = renderer.getQualities();

      expect(qualities[0].name).toBe('128 kbps');
    });

    it('should return empty array when dash is null', () => {
      renderer.dash = null;

      const qualities = renderer.getQualities();

      expect(qualities).toEqual([]);
    });

    it('should return empty array when bitrateList is empty', async () => {
      mockDashInstance.getBitrateInfoListFor.mockReturnValue([]);
      await renderer.initDashJs();

      const qualities = renderer.getQualities();

      expect(qualities).toEqual([]);
    });
  });

  describe('getCurrentQuality', () => {
    it('should return current quality index', async () => {
      await renderer.initDashJs();

      const quality = renderer.getCurrentQuality();

      expect(quality).toBe(1);
    });

    it('should return -1 when dash is null', () => {
      renderer.dash = null;

      const quality = renderer.getCurrentQuality();

      expect(quality).toBe(-1);
    });
  });

  describe('supportsAutoQuality', () => {
    it('should return true', () => {
      expect(renderer.supportsAutoQuality()).toBe(true);
    });
  });

  describe('isAutoQuality', () => {
    it('should return true when auto bitrate switching is enabled', async () => {
      await renderer.initDashJs();

      expect(renderer.isAutoQuality()).toBe(true);
    });

    it('should return false when auto bitrate switching is disabled', async () => {
      mockDashInstance.getSettings.mockReturnValue({
        streaming: {
          abr: {
            autoSwitchBitrate: { video: false }
          }
        }
      });
      await renderer.initDashJs();

      expect(renderer.isAutoQuality()).toBe(false);
    });

    it('should return true when dash is null', () => {
      renderer.dash = null;

      expect(renderer.isAutoQuality()).toBe(true);
    });
  });

  describe('ensureLoaded', () => {
    it('should do nothing when deferLoad is false', async () => {
      await renderer.initDashJs();
      mockDashInstance.attachSource.mockClear();

      renderer.ensureLoaded();

      expect(mockDashInstance.attachSource).not.toHaveBeenCalled();
    });

    it('should attach source when deferLoad is true and not yet loaded', async () => {
      mockPlayer.options.deferLoad = true;
      renderer = new DASHRenderer(mockPlayer);
      await renderer.initDashJs();

      renderer.ensureLoaded();

      expect(mockDashInstance.attachSource).toHaveBeenCalled();
      expect(renderer._dashSourceLoaded).toBe(true);
    });

    it('should not reload when already loaded', async () => {
      mockPlayer.options.deferLoad = true;
      renderer = new DASHRenderer(mockPlayer);
      await renderer.initDashJs();
      renderer._dashSourceLoaded = true;
      mockDashInstance.attachSource.mockClear();

      renderer.ensureLoaded();

      expect(mockDashInstance.attachSource).not.toHaveBeenCalled();
    });

    it('should do nothing when dash is null', () => {
      mockPlayer.options.deferLoad = true;
      renderer.dash = null;

      expect(() => renderer.ensureLoaded()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should destroy dash instance', async () => {
      await renderer.initDashJs();

      renderer.destroy();

      expect(mockDashInstance.destroy).toHaveBeenCalled();
      expect(renderer.dash).toBeNull();
    });

    it('should handle destroy when dash is null', () => {
      renderer.dash = null;

      expect(() => renderer.destroy()).not.toThrow();
    });
  });

  describe('media events', () => {
    beforeEach(async () => {
      await renderer.initDashJs();
    });

    it('should handle loadedmetadata event', () => {
      Object.defineProperty(mockMedia, 'duration', { value: 120, configurable: true });
      mockMedia.dispatchEvent(new Event('loadedmetadata'));

      expect(mockPlayer.state.duration).toBe(120);
      expect(mockPlayer.emit).toHaveBeenCalledWith('loadedmetadata');
    });

    it('should handle play event', () => {
      mockMedia.dispatchEvent(new Event('play'));

      expect(mockPlayer.state.playing).toBe(true);
      expect(mockPlayer.state.paused).toBe(false);
      expect(mockPlayer.emit).toHaveBeenCalledWith('play');
    });

    it('should handle pause event', () => {
      mockMedia.dispatchEvent(new Event('pause'));

      expect(mockPlayer.state.playing).toBe(false);
      expect(mockPlayer.state.paused).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('pause');
    });

    it('should handle ended event', () => {
      mockMedia.dispatchEvent(new Event('ended'));

      expect(mockPlayer.state.ended).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('ended');
    });

    it('should handle loop on ended', () => {
      mockPlayer.options.loop = true;

      mockMedia.dispatchEvent(new Event('ended'));

      expect(mockPlayer.seek).toHaveBeenCalledWith(0);
      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('should handle timeupdate event', () => {
      Object.defineProperty(mockMedia, 'currentTime', { value: 45, configurable: true });
      mockMedia.dispatchEvent(new Event('timeupdate'));

      expect(mockPlayer.state.currentTime).toBe(45);
      expect(mockPlayer.emit).toHaveBeenCalledWith('timeupdate', 45);
    });

    it('should handle volumechange event', () => {
      Object.defineProperty(mockMedia, 'volume', { value: 0.7, configurable: true });
      Object.defineProperty(mockMedia, 'muted', { value: false, configurable: true });
      mockMedia.dispatchEvent(new Event('volumechange'));

      expect(mockPlayer.state.volume).toBe(0.7);
      expect(mockPlayer.emit).toHaveBeenCalledWith('volumechange', 0.7);
    });

    it('should handle waiting event', () => {
      mockMedia.dispatchEvent(new Event('waiting'));

      expect(mockPlayer.state.buffering).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('waiting');
    });

    it('should handle canplay event', () => {
      mockMedia.dispatchEvent(new Event('canplay'));

      expect(mockPlayer.state.buffering).toBe(false);
      expect(mockPlayer.emit).toHaveBeenCalledWith('canplay');
    });
  });
});
