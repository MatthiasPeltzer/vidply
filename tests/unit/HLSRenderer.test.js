/**
 * Unit Tests: HLSRenderer
 * Tests HLS streaming support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HLSRenderer } from '../../src/renderers/HLSRenderer.js';

describe('HLSRenderer', () => {
  let renderer;
  let mockPlayer;
  let mockMedia;
  let mockHls;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    
    mockMedia = document.createElement('video');
    mockMedia.src = 'https://example.com/stream.m3u8';
    document.body.appendChild(mockMedia);

    mockPlayer = {
      element: mockMedia,
      currentSource: 'https://example.com/stream.m3u8',
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
      play: vi.fn()
    };

    // Mock hls.js - needs to be a proper class for `new` to work
    mockHls = {
      attachMedia: vi.fn(),
      loadSource: vi.fn(),
      startLoad: vi.fn(),
      recoverMediaError: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
      levels: [
        { height: 360, width: 640, bitrate: 800000 },
        { height: 720, width: 1280, bitrate: 2500000 },
        { height: 1080, width: 1920, bitrate: 5000000 }
      ],
      currentLevel: 1
    };

    // Create a proper constructor function that can be used with `new`
    class MockHls {
      constructor() {
        Object.assign(this, mockHls);
      }
    }
    MockHls.isSupported = vi.fn(() => true);
    MockHls.Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      LEVEL_SWITCHED: 'hlsLevelSwitched',
      SUBTITLE_TRACKS_UPDATED: 'hlsSubtitleTracksUpdated',
      SUBTITLE_TRACK_SWITCH: 'hlsSubtitleTrackSwitch',
      SUBTITLE_FRAG_PROCESSED: 'hlsSubtitleFragProcessed',
      CUES_PARSED: 'hlsCuesParsed',
      ERROR: 'hlsError',
      FRAG_BUFFERED: 'hlsFragBuffered'
    };
    MockHls.ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
      OTHER_ERROR: 'otherError'
    };
    window.Hls = MockHls;

    renderer = new HLSRenderer(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
    delete window.Hls;
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      expect(renderer.player).toBe(mockPlayer);
    });

    it('exposes a stable, minification-safe rendererType', () => {
      // Player.shouldChangeRenderer() relies on this instead of
      // constructor.name (which minifiers mangle in production).
      expect(renderer.rendererType).toBe('hls');
    });

    it('should store media element', () => {
      expect(renderer.media).toBe(mockMedia);
    });

    it('should initialize with null hls instance', () => {
      expect(renderer.hls).toBeNull();
    });

    it('should initialize hlsSourceLoaded to false', () => {
      expect(renderer._hlsSourceLoaded).toBe(false);
    });
  });

  describe('canPlayNatively', () => {
    it('should return false for desktop browsers (non-iOS, non-iPad desktop mode)', () => {
      // Default jsdom: not iPhone/iPad, not MacIntel+touch
      expect(renderer.canPlayNatively()).toBe(false);
    });

    it('should check native HLS support on iOS when HLS type is reported', () => {
      const ua = navigator.userAgent;
      const platform = navigator.platform;
      const maxTouchPoints = navigator.maxTouchPoints;
      try {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          configurable: true
        });
        const spy = vi.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('maybe');
        expect(renderer.canPlayNatively()).toBe(true);
        spy.mockRestore();
      } finally {
        Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
        Object.defineProperty(navigator, 'platform', { value: platform, configurable: true });
        Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
      }
    });

    it('should return false on iOS when canPlayType does not report HLS', () => {
      const ua = navigator.userAgent;
      try {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          configurable: true
        });
        const spy = vi.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('');
        expect(renderer.canPlayNatively()).toBe(false);
        spy.mockRestore();
      } finally {
        Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
      }
    });

    it('should treat iPad desktop mode as native HLS candidate when canPlayType allows', () => {
      const ua = navigator.userAgent;
      const platform = navigator.platform;
      const maxTouchPoints = navigator.maxTouchPoints;
      try {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
          configurable: true
        });
        Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
        const spy = vi.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('maybe');
        expect(renderer.canPlayNatively()).toBe(true);
        spy.mockRestore();
      } finally {
        Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
        Object.defineProperty(navigator, 'platform', { value: platform, configurable: true });
        Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
      }
    });
  });

  describe('initHlsJs', () => {
    it('should hide native controls', async () => {
      await renderer.initHlsJs();
      
      expect(mockMedia.controls).toBe(false);
    });

    it('should create Hls instance', async () => {
      await renderer.initHlsJs();
      
      // Verify hls instance was created
      expect(renderer.hls).not.toBeNull();
      expect(renderer.hls.attachMedia).toBeDefined();
    });

    it('should attach media element', async () => {
      await renderer.initHlsJs();
      
      expect(mockHls.attachMedia).toHaveBeenCalledWith(mockMedia);
    });

    it('should load source when deferLoad is false', async () => {
      await renderer.initHlsJs();
      
      expect(mockHls.loadSource).toHaveBeenCalled();
      expect(renderer._hlsSourceLoaded).toBe(true);
    });

    it('should always load manifest at init even when deferLoad is true', async () => {
      // The manifest is always loaded at init (regardless of deferLoad) so
      // duration / quality levels / subtitle tracks are available in the UI
      // before first play. Media fragment downloads are still deferred via
      // hls.js's `autoStartLoad: false` config; startLoad() is what is
      // postponed to play() / ensureLoaded().
      mockPlayer.options.deferLoad = true;
      renderer = new HLSRenderer(mockPlayer);

      await renderer.initHlsJs();

      expect(mockHls.loadSource).toHaveBeenCalledWith(mockPlayer.currentSource);
      expect(mockHls.startLoad).not.toHaveBeenCalled();
      expect(renderer._hlsSourceLoaded).toBe(true);
      expect(renderer._pendingSrc).toBe(mockPlayer.currentSource);
    });

    it('should throw error when HLS is not supported', async () => {
      window.Hls.isSupported.mockReturnValue(false);
      
      await expect(renderer.initHlsJs()).rejects.toThrow('HLS is not supported');
    });

    it('should throw error when no source found', async () => {
      // Create a fresh video element without any source
      const emptyVideo = document.createElement('video');
      document.body.appendChild(emptyVideo);
      
      const playerWithoutSource = {
        ...mockPlayer,
        element: emptyVideo,
        currentSource: null
      };
      // Clear any source attributes
      emptyVideo.removeAttribute('src');
      
      renderer = new HLSRenderer(playerWithoutSource);
      
      await expect(renderer.initHlsJs()).rejects.toThrow('No HLS source found');
    });
  });

  describe('attachHlsEvents', () => {
    beforeEach(async () => {
      await renderer.initHlsJs();
    });

    it('should bind MANIFEST_PARSED event', () => {
      expect(mockHls.on).toHaveBeenCalledWith(
        window.Hls.Events.MANIFEST_PARSED,
        expect.any(Function)
      );
    });

    it('should bind LEVEL_SWITCHED event', () => {
      expect(mockHls.on).toHaveBeenCalledWith(
        window.Hls.Events.LEVEL_SWITCHED,
        expect.any(Function)
      );
    });

    it('should bind ERROR event', () => {
      expect(mockHls.on).toHaveBeenCalledWith(
        window.Hls.Events.ERROR,
        expect.any(Function)
      );
    });

    it('should bind FRAG_BUFFERED event', () => {
      expect(mockHls.on).toHaveBeenCalledWith(
        window.Hls.Events.FRAG_BUFFERED,
        expect.any(Function)
      );
    });
  });

  describe('handleHlsError', () => {
    beforeEach(async () => {
      await renderer.initHlsJs();
    });

    it('should log error details', () => {
      renderer.handleHlsError({
        type: 'networkError',
        details: 'manifestLoadError',
        fatal: false
      });
      
      expect(mockPlayer.log).toHaveBeenCalled();
    });

    it('should attempt recovery for fatal network errors', () => {
      renderer.handleHlsError({
        type: window.Hls.ErrorTypes.NETWORK_ERROR,
        details: 'manifestLoadError',
        fatal: true
      });
      
      vi.advanceTimersByTime(1500);
      
      expect(mockHls.startLoad).toHaveBeenCalled();
    });

    it('should attempt recovery for fatal media errors', () => {
      renderer.handleHlsError({
        type: window.Hls.ErrorTypes.MEDIA_ERROR,
        details: 'bufferStalledError',
        fatal: true
      });
      
      expect(mockHls.recoverMediaError).toHaveBeenCalled();
    });

    it('should destroy hls on unrecoverable errors', () => {
      renderer.handleHlsError({
        type: 'otherError',
        details: 'unknownError',
        fatal: true
      });
      
      expect(mockHls.destroy).toHaveBeenCalled();
      expect(mockPlayer.handleError).toHaveBeenCalled();
    });

    it('should log non-fatal errors', () => {
      renderer.handleHlsError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false
      });
      
      expect(mockPlayer.log).toHaveBeenCalledWith(
        expect.stringContaining('Non-fatal'),
        'warn'
      );
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await renderer.initHlsJs();
      // Reset mock to track calls after init
      mockHls.loadSource.mockClear();
      mockHls.startLoad.mockClear();
    });

    it('should call media.play()', () => {
      const playSpy = vi.spyOn(mockMedia, 'play').mockResolvedValue();
      
      renderer.play();
      
      expect(playSpy).toHaveBeenCalled();
    });

    it('should start HLS loading on first play when deferLoad is true', async () => {
      mockPlayer.options.deferLoad = true;
      renderer = new HLSRenderer(mockPlayer);
      await renderer.initHlsJs();
      
      // Manually spy on play
      vi.spyOn(mockMedia, 'play').mockResolvedValue();
      
      renderer.play();
      
      expect(mockHls.loadSource).toHaveBeenCalled();
      expect(mockHls.startLoad).toHaveBeenCalled();
    });

    it('should handle play promise rejection', () => {
      vi.spyOn(mockMedia, 'play').mockRejectedValue(new Error('Play failed'));
      
      expect(() => renderer.play()).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should call media.pause()', async () => {
      await renderer.initHlsJs();
      const pauseSpy = vi.spyOn(mockMedia, 'pause');
      
      renderer.pause();
      
      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('should set media.currentTime', async () => {
      await renderer.initHlsJs();
      
      renderer.seek(30);
      
      expect(mockMedia.currentTime).toBe(30);
    });
  });

  describe('setVolume', () => {
    it('should set media.volume', async () => {
      await renderer.initHlsJs();
      
      renderer.setVolume(0.5);
      
      expect(mockMedia.volume).toBe(0.5);
    });
  });

  describe('setMuted', () => {
    it('should set media.muted', async () => {
      await renderer.initHlsJs();
      
      renderer.setMuted(true);
      
      expect(mockMedia.muted).toBe(true);
    });
  });

  describe('setPlaybackSpeed', () => {
    it('should set media.playbackRate', async () => {
      await renderer.initHlsJs();
      
      renderer.setPlaybackSpeed(1.5);
      
      expect(mockMedia.playbackRate).toBe(1.5);
    });
  });

  describe('switchQuality', () => {
    it('should set hls.currentLevel', async () => {
      await renderer.initHlsJs();
      
      renderer.switchQuality(2);
      
      // Check the renderer's hls instance, not mockHls
      expect(renderer.hls.currentLevel).toBe(2);
    });

    it('should not throw when hls is null', () => {
      renderer.hls = null;
      expect(() => renderer.switchQuality(1)).not.toThrow();
    });
  });

  describe('getQualities', () => {
    it('should return quality levels', async () => {
      await renderer.initHlsJs();
      
      const qualities = renderer.getQualities();
      
      expect(qualities).toHaveLength(3);
      expect(qualities[0]).toHaveProperty('index', 0);
      expect(qualities[0]).toHaveProperty('height', 360);
      expect(qualities[0]).toHaveProperty('name', '360p');
    });

    it('should format quality names correctly', async () => {
      await renderer.initHlsJs();
      
      const qualities = renderer.getQualities();
      
      expect(qualities[1].name).toBe('720p');
      expect(qualities[2].name).toBe('1080p');
    });

    it('should handle audio-only levels (height=0)', async () => {
      mockHls.levels = [{ height: 0, width: 0, bitrate: 128000 }];
      await renderer.initHlsJs();
      
      const qualities = renderer.getQualities();
      
      expect(qualities[0].name).toBe('128 kb');
    });

    it('should return empty array when hls is null', () => {
      renderer.hls = null;
      
      const qualities = renderer.getQualities();
      
      expect(qualities).toEqual([]);
    });

    it('should return empty array when levels is null', async () => {
      await renderer.initHlsJs();
      // Set levels to null on the actual hls instance
      renderer.hls.levels = null;
      
      const qualities = renderer.getQualities();
      
      expect(qualities).toEqual([]);
    });
  });

  describe('getCurrentQuality', () => {
    it('should return current level index', async () => {
      await renderer.initHlsJs();
      
      const quality = renderer.getCurrentQuality();
      
      expect(quality).toBe(1);
    });

    it('should return -1 when hls is null', () => {
      renderer.hls = null;
      
      const quality = renderer.getCurrentQuality();
      
      expect(quality).toBe(-1);
    });
  });

  describe('ensureLoaded', () => {
    it('should do nothing when deferLoad is false', async () => {
      await renderer.initHlsJs();
      mockHls.loadSource.mockClear();
      
      renderer.ensureLoaded();
      
      expect(mockHls.loadSource).not.toHaveBeenCalled();
    });

    it('should load source when deferLoad is true and not yet loaded', async () => {
      mockPlayer.options.deferLoad = true;
      renderer = new HLSRenderer(mockPlayer);
      await renderer.initHlsJs();
      
      renderer.ensureLoaded();
      
      expect(mockHls.loadSource).toHaveBeenCalled();
      expect(mockHls.startLoad).toHaveBeenCalled();
      expect(renderer._hlsSourceLoaded).toBe(true);
    });

    it('should not reload when already loaded', async () => {
      mockPlayer.options.deferLoad = true;
      renderer = new HLSRenderer(mockPlayer);
      await renderer.initHlsJs();
      renderer._hlsSourceLoaded = true;
      mockHls.loadSource.mockClear();
      
      renderer.ensureLoaded();
      
      expect(mockHls.loadSource).not.toHaveBeenCalled();
    });

    it('should do nothing when hls is null', () => {
      mockPlayer.options.deferLoad = true;
      renderer.hls = null;
      
      expect(() => renderer.ensureLoaded()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should destroy hls instance', async () => {
      await renderer.initHlsJs();
      
      renderer.destroy();
      
      expect(mockHls.destroy).toHaveBeenCalled();
      expect(renderer.hls).toBeNull();
    });

    it('should handle destroy when hls is null', () => {
      renderer.hls = null;
      
      expect(() => renderer.destroy()).not.toThrow();
    });
  });

  describe('cue update polling', () => {
    beforeEach(async () => {
      await renderer.initHlsJs();
    });

    it('should initialize cue update timer state', () => {
      expect(renderer._cueUpdateTimer).toBeNull();
      expect(renderer._lastKnownCueCount).toBe(0);
    });

    it('should count cues from subtitle/caption text tracks', () => {
      const mockTextTracks = [
        { kind: 'subtitles', cues: { length: 3 } },
        { kind: 'captions', cues: { length: 2 } },
        { kind: 'metadata', cues: { length: 10 } }
      ];
      mockTextTracks.length = 3;
      Object.defineProperty(mockMedia, 'textTracks', { value: mockTextTracks, configurable: true });

      expect(renderer._getTotalCueCount()).toBe(5);
    });

    it('should emit textcuesupdate when new cues arrive during polling', () => {
      let cueCount = 0;
      const mockTextTracks = [{ kind: 'subtitles', get cues() { return { length: cueCount }; } }];
      mockTextTracks.length = 1;
      Object.defineProperty(mockMedia, 'textTracks', { value: mockTextTracks, configurable: true });

      renderer._startCueUpdatePolling();
      cueCount = 3;
      vi.advanceTimersByTime(500);

      expect(mockPlayer.emit).toHaveBeenCalledWith('textcuesupdate');
    });

    it('should stop polling after cue count stabilises', () => {
      const mockTextTracks = [{ kind: 'subtitles', cues: { length: 1 } }];
      mockTextTracks.length = 1;
      Object.defineProperty(mockMedia, 'textTracks', { value: mockTextTracks, configurable: true });

      renderer._startCueUpdatePolling();

      // 8 stable rounds (8 * 500ms = 4000ms) should stop polling
      vi.advanceTimersByTime(4500);

      expect(renderer._cueUpdateTimer).toBeNull();
    });

    it('should keep polling on live streams when cue count plateaus', () => {
      mockPlayer.isLiveStream = vi.fn(() => true);
      const mockTextTracks = [{ kind: 'subtitles', cues: { length: 12 } }];
      mockTextTracks.length = 1;
      Object.defineProperty(mockMedia, 'textTracks', { value: mockTextTracks, configurable: true });

      renderer._startCueUpdatePolling();
      vi.advanceTimersByTime(10000);

      expect(renderer._cueUpdateTimer).not.toBeNull();
    });

    it('should emit textcuesupdate on live subtitle fragments even when cue count is stable', () => {
      mockPlayer.isLiveStream = vi.fn(() => true);
      const hlsOnCalls = mockHls.on.mock.calls;
      const subtitleFragHandler = hlsOnCalls.find(c => c[0] === 'hlsSubtitleFragProcessed')?.[1];

      const mockTextTracks = [{ kind: 'subtitles', cues: { length: 12 } }];
      mockTextTracks.length = 1;
      Object.defineProperty(mockMedia, 'textTracks', { value: mockTextTracks, configurable: true });
      renderer._lastKnownCueCount = 12;

      mockPlayer.emit.mockClear();
      subtitleFragHandler('hlsSubtitleFragProcessed', { success: true });

      expect(mockPlayer.emit).toHaveBeenCalledWith('textcuesupdate');
    });

    it('should clean up polling on destroy', () => {
      renderer._startCueUpdatePolling();
      expect(renderer._cueUpdateTimer).not.toBeNull();

      renderer.destroy();

      expect(renderer._cueUpdateTimer).toBeNull();
      expect(renderer._lastKnownCueCount).toBe(0);
    });

    it('should emit textcuesupdate on subtitle fragment processed', () => {
      // Subtitle fragments do NOT go through the media SourceBuffer, so
      // FRAG_BUFFERED is unreliable for them. The renderer instead listens to
      // SUBTITLE_FRAG_PROCESSED, which fires after hls.js has parsed the
      // WebVTT and appended cues to the TextTrack.
      const hlsOnCalls = mockHls.on.mock.calls;
      const subtitleFragHandler = hlsOnCalls.find(c => c[0] === 'hlsSubtitleFragProcessed')?.[1];
      expect(subtitleFragHandler).toBeDefined();

      const mockTextTracks = [{ kind: 'subtitles', cues: { length: 2 } }];
      mockTextTracks.length = 1;
      Object.defineProperty(mockMedia, 'textTracks', { value: mockTextTracks, configurable: true });

      subtitleFragHandler('hlsSubtitleFragProcessed', { success: true });

      expect(mockPlayer.emit).toHaveBeenCalledWith('textcuesupdate');
    });

    it('should auto-select the default hls.js subtitle track when captions are enabled', () => {
      renderer.hls.subtitleTracks = [{ lang: 'de', default: true }, { lang: 'en' }];
      renderer.hls.subtitleTrack = -1;
      mockPlayer.state.captionsEnabled = true;

      renderer._ensureHlsSubtitleTrackActive();

      expect(renderer.hls.subtitleTrack).toBe(0);
    });

    it('should not auto-select hls.js subtitles when captions and transcript are off', () => {
      renderer.hls.subtitleTracks = [{ lang: 'de' }];
      renderer.hls.subtitleTrack = -1;
      mockPlayer.state.captionsEnabled = false;
      mockPlayer.options.captionsDefault = false;
      mockPlayer.transcriptManager = null;

      renderer._ensureHlsSubtitleTrackActive();

      expect(renderer.hls.subtitleTrack).toBe(-1);
    });
  });

  describe('media events', () => {
    beforeEach(async () => {
      await renderer.initHlsJs();
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
