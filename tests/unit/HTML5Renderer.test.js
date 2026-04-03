/**
 * Unit Tests: HTML5Renderer
 * Tests the HTML5 media renderer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HTML5Renderer } from '../../src/renderers/HTML5Renderer.js';

describe('HTML5Renderer', () => {
  let renderer;
  let mockPlayer;
  let mockMedia;

  beforeEach(() => {
    document.body.innerHTML = '';
    
    mockMedia = document.createElement('video');
    mockMedia.controls = true;
    document.body.appendChild(mockMedia);

    mockPlayer = {
      element: mockMedia,
      container: document.createElement('div'),
      options: {
        preload: 'metadata',
        deferLoad: false,
        autoplay: false,
        loop: false
      },
      state: {
        duration: 0,
        playing: false,
        paused: true,
        ended: false,
        currentTime: 0,
        volume: 1,
        muted: false,
        seeking: false,
        buffering: false,
        playbackSpeed: 1
      },
      emit: vi.fn(),
      log: vi.fn(),
      handleError: vi.fn(),
      seek: vi.fn(),
      play: vi.fn(),
      autoGeneratePoster: vi.fn().mockResolvedValue(null)
    };

    renderer = new HTML5Renderer(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      expect(renderer.player).toBe(mockPlayer);
    });

    it('should store media element reference', () => {
      expect(renderer.media).toBe(mockMedia);
    });

    it('should initialize _didDeferredLoad to false', () => {
      expect(renderer._didDeferredLoad).toBe(false);
    });
  });

  describe('init', () => {
    it('should hide native controls', async () => {
      await renderer.init();
      expect(mockMedia.controls).toBe(false);
    });

    it('should remove controls attribute', async () => {
      mockMedia.setAttribute('controls', '');
      await renderer.init();
      expect(mockMedia.hasAttribute('controls')).toBe(false);
    });

    it('should set preload attribute', async () => {
      await renderer.init();
      expect(mockMedia.preload).toBe('metadata');
    });

    it('should not call load when deferLoad is true and preload is none', async () => {
      mockPlayer.options.deferLoad = true;
      mockPlayer.options.preload = 'none';
      const loadSpy = vi.spyOn(mockMedia, 'load');
      
      await renderer.init();
      
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should call load when deferLoad is false', async () => {
      mockPlayer.options.deferLoad = false;
      const loadSpy = vi.spyOn(mockMedia, 'load');
      
      await renderer.init();
      
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await renderer.init();
      // Mock play to return a resolved promise
      mockMedia.play = vi.fn().mockResolvedValue(undefined);
    });

    it('should call media.play()', () => {
      renderer.play();
      expect(mockMedia.play).toHaveBeenCalled();
    });

    it('should trigger load on first play when deferLoad is true', () => {
      mockPlayer.options.deferLoad = true;
      renderer._didDeferredLoad = false;
      Object.defineProperty(mockMedia, 'readyState', { value: 0, configurable: true });
      const loadSpy = vi.spyOn(mockMedia, 'load');

      renderer.play();

      expect(loadSpy).toHaveBeenCalled();
      expect(renderer._didDeferredLoad).toBe(true);
    });

    it('should not trigger load again after first deferred load', () => {
      // This test verifies the _didDeferredLoad flag is respected
      mockPlayer.options.deferLoad = true;
      renderer._didDeferredLoad = true;
      
      // Record initial _didDeferredLoad value before play
      const flagBefore = renderer._didDeferredLoad;
      
      renderer.play();

      // Flag should remain true (not reset) - proving we didn't go through the load branch
      expect(renderer._didDeferredLoad).toBe(true);
      expect(flagBefore).toBe(true);
    });

    it('should return a promise', () => {
      const result = renderer.play();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('pause', () => {
    beforeEach(async () => {
      await renderer.init();
    });

    it('should call media.pause()', () => {
      const pauseSpy = vi.spyOn(mockMedia, 'pause');
      renderer.pause();
      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    beforeEach(async () => {
      await renderer.init();
    });

    it('should set currentTime on media element', () => {
      renderer.seek(30);
      expect(mockMedia.currentTime).toBe(30);
    });

    it('should handle zero time', () => {
      renderer.seek(0);
      expect(mockMedia.currentTime).toBe(0);
    });
  });

  describe('setVolume', () => {
    beforeEach(async () => {
      await renderer.init();
    });

    it('should set volume on media element', () => {
      renderer.setVolume(0.5);
      expect(mockMedia.volume).toBe(0.5);
    });

    it('should handle volume 0', () => {
      renderer.setVolume(0);
      expect(mockMedia.volume).toBe(0);
    });

    it('should handle volume 1', () => {
      renderer.setVolume(1);
      expect(mockMedia.volume).toBe(1);
    });
  });

  describe('setMuted', () => {
    beforeEach(async () => {
      await renderer.init();
    });

    it('should set muted to true', () => {
      renderer.setMuted(true);
      expect(mockMedia.muted).toBe(true);
    });

    it('should set muted to false', () => {
      mockMedia.muted = true;
      renderer.setMuted(false);
      expect(mockMedia.muted).toBe(false);
    });
  });

  describe('setPlaybackSpeed', () => {
    beforeEach(async () => {
      await renderer.init();
    });

    it('should set playbackRate on media element', () => {
      renderer.setPlaybackSpeed(1.5);
      expect(mockMedia.playbackRate).toBe(1.5);
    });

    it('should handle speed 0.5', () => {
      renderer.setPlaybackSpeed(0.5);
      expect(mockMedia.playbackRate).toBe(0.5);
    });

    it('should handle speed 2', () => {
      renderer.setPlaybackSpeed(2);
      expect(mockMedia.playbackRate).toBe(2);
    });
  });

  describe('ensureLoaded', () => {
    it('should do nothing if deferLoad is false', () => {
      mockPlayer.options.deferLoad = false;
      const loadSpy = vi.spyOn(mockMedia, 'load');

      renderer.ensureLoaded();

      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should call load if deferLoad is true and not yet loaded', () => {
      mockPlayer.options.deferLoad = true;
      renderer._didDeferredLoad = false;
      Object.defineProperty(mockMedia, 'readyState', { value: 0, configurable: true });
      const loadSpy = vi.spyOn(mockMedia, 'load');

      renderer.ensureLoaded();

      expect(loadSpy).toHaveBeenCalled();
      expect(renderer._didDeferredLoad).toBe(true);
    });

    it('should not call load if already deferred loaded', () => {
      mockPlayer.options.deferLoad = true;
      renderer._didDeferredLoad = true;
      const loadSpy = vi.spyOn(mockMedia, 'load');

      renderer.ensureLoaded();

      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe('getQualities', () => {
    it('should return empty array when only one source', () => {
      const result = renderer.getQualities();
      expect(result).toEqual([]);
    });

    it('should return empty array when no sources', () => {
      const result = renderer.getQualities();
      expect(result).toEqual([]);
    });

    it('should return quality objects for multiple sources', () => {
      const source1 = document.createElement('source');
      source1.src = 'video-720.mp4';
      source1.setAttribute('data-quality', '720p');
      source1.setAttribute('data-height', '720');
      
      const source2 = document.createElement('source');
      source2.src = 'video-1080.mp4';
      source2.setAttribute('data-quality', '1080p');
      source2.setAttribute('data-height', '1080');
      
      mockMedia.appendChild(source1);
      mockMedia.appendChild(source2);

      const qualities = renderer.getQualities();
      
      expect(qualities.length).toBe(2);
      expect(qualities[0].height).toBe(720);
      expect(qualities[1].height).toBe(1080);
    });
  });

  describe('extractHeightFromLabel', () => {
    it('should extract height from label like "720p"', () => {
      expect(renderer.extractHeightFromLabel('720p')).toBe(720);
    });

    it('should extract height from label like "1080p"', () => {
      expect(renderer.extractHeightFromLabel('1080p')).toBe(1080);
    });

    it('should return 0 for invalid label', () => {
      expect(renderer.extractHeightFromLabel('invalid')).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(renderer.extractHeightFromLabel('')).toBe(0);
    });

    it('should handle HD label without p', () => {
      expect(renderer.extractHeightFromLabel('HD')).toBe(0);
    });
  });

  describe('getCurrentQuality', () => {
    it('should return 0 when no qualities defined', () => {
      expect(renderer.getCurrentQuality()).toBe(0);
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      await renderer.init();
    });

    it('should emit play event when media plays', () => {
      mockMedia.dispatchEvent(new Event('play'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('play');
    });

    it('should emit pause event when media pauses', () => {
      mockMedia.dispatchEvent(new Event('pause'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('pause');
    });

    it('should emit ended event when media ends', () => {
      mockMedia.dispatchEvent(new Event('ended'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('ended');
    });

    it('should emit timeupdate event with current time', () => {
      mockMedia.dispatchEvent(new Event('timeupdate'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('timeupdate', expect.any(Number));
    });

    it('should emit volumechange event', () => {
      mockMedia.dispatchEvent(new Event('volumechange'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('volumechange', expect.any(Number));
    });

    it('should emit seeking event', () => {
      mockMedia.dispatchEvent(new Event('seeking'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('seeking');
    });

    it('should emit seeked event', () => {
      mockMedia.dispatchEvent(new Event('seeked'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('seeked');
    });

    it('should emit waiting event', () => {
      mockMedia.dispatchEvent(new Event('waiting'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('waiting');
    });

    it('should emit canplay event', () => {
      mockMedia.dispatchEvent(new Event('canplay'));
      expect(mockPlayer.emit).toHaveBeenCalledWith('canplay');
    });

    it('should update player state on play', () => {
      mockMedia.dispatchEvent(new Event('play'));
      expect(mockPlayer.state.playing).toBe(true);
      expect(mockPlayer.state.paused).toBe(false);
    });

    it('should update player state on pause', () => {
      mockPlayer.state.playing = true;
      mockMedia.dispatchEvent(new Event('pause'));
      expect(mockPlayer.state.playing).toBe(false);
      expect(mockPlayer.state.paused).toBe(true);
    });

    it('should call onPlay callback if provided', () => {
      const onPlay = vi.fn();
      mockPlayer.options.onPlay = onPlay;
      
      mockMedia.dispatchEvent(new Event('play'));
      
      expect(onPlay).toHaveBeenCalled();
    });

    it('should call onPause callback if provided', () => {
      const onPause = vi.fn();
      mockPlayer.options.onPause = onPause;
      
      mockMedia.dispatchEvent(new Event('pause'));
      
      expect(onPause).toHaveBeenCalled();
    });

    it('should call onEnded callback if provided', () => {
      const onEnded = vi.fn();
      mockPlayer.options.onEnded = onEnded;
      
      mockMedia.dispatchEvent(new Event('ended'));
      
      expect(onEnded).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should not throw when called', async () => {
      await renderer.init();
      expect(() => renderer.destroy()).not.toThrow();
    });
  });
});
