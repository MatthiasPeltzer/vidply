/**
 * Unit Tests: VimeoRenderer
 * Tests the Vimeo video renderer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VimeoRenderer } from '../../src/renderers/VimeoRenderer.js';

describe('VimeoRenderer', () => {
  let renderer;
  let mockPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    
    const videoElement = document.createElement('video');
    videoElement.src = 'https://vimeo.com/123456789';
    document.body.appendChild(videoElement);

    mockPlayer = {
      element: videoElement,
      currentSource: 'https://vimeo.com/123456789',
      container: document.createElement('div'),
      options: {
        autoplay: false,
        muted: false,
        loop: false,
        startTime: 0
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
      handleError: vi.fn()
    };

    renderer = new VimeoRenderer(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // Clean up global Vimeo mock
    delete window.Vimeo;
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      expect(renderer.player).toBe(mockPlayer);
    });

    it('should initialize vimeo to null', () => {
      expect(renderer.vimeo).toBeNull();
    });

    it('should initialize videoId to null', () => {
      expect(renderer.videoId).toBeNull();
    });

    it('should initialize isReady to false', () => {
      expect(renderer.isReady).toBe(false);
    });

    it('should initialize iframe to null', () => {
      expect(renderer.iframe).toBeNull();
    });
  });

  describe('extractVideoId', () => {
    it('should extract video ID from vimeo.com/ID format', () => {
      const id = renderer.extractVideoId('https://vimeo.com/123456789');
      expect(id).toBe('123456789');
    });

    it('should extract video ID from vimeo.com/video/ID format', () => {
      const id = renderer.extractVideoId('https://vimeo.com/video/123456789');
      expect(id).toBe('123456789');
    });

    it('should extract video ID from player.vimeo.com/video/ID format', () => {
      const id = renderer.extractVideoId('https://player.vimeo.com/video/123456789');
      expect(id).toBe('123456789');
    });

    it('should return null for invalid URL', () => {
      const id = renderer.extractVideoId('https://youtube.com/watch?v=123');
      expect(id).toBeNull();
    });

    it('should return null for empty URL', () => {
      const id = renderer.extractVideoId('');
      expect(id).toBeNull();
    });

    it('should handle URLs with query parameters', () => {
      const id = renderer.extractVideoId('https://vimeo.com/123456789?autoplay=1');
      expect(id).toBe('123456789');
    });
  });

  describe('play', () => {
    it('should not call vimeo.play when not ready', () => {
      renderer.isReady = false;
      renderer.vimeo = { play: vi.fn().mockResolvedValue(undefined) };

      renderer.play();

      expect(renderer.vimeo.play).not.toHaveBeenCalled();
    });

    it('should call vimeo.play when ready', () => {
      renderer.isReady = true;
      renderer.vimeo = { play: vi.fn().mockResolvedValue(undefined) };

      renderer.play();

      expect(renderer.vimeo.play).toHaveBeenCalled();
    });

    it('should handle play errors', () => {
      renderer.isReady = true;
      renderer.vimeo = { play: vi.fn().mockRejectedValue(new Error('Play error')) };

      expect(() => renderer.play()).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should not call vimeo.pause when not ready', () => {
      renderer.isReady = false;
      renderer.vimeo = { pause: vi.fn().mockResolvedValue(undefined) };

      renderer.pause();

      expect(renderer.vimeo.pause).not.toHaveBeenCalled();
    });

    it('should call vimeo.pause when ready', () => {
      renderer.isReady = true;
      renderer.vimeo = { pause: vi.fn().mockResolvedValue(undefined) };

      renderer.pause();

      expect(renderer.vimeo.pause).toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('should not call setCurrentTime when not ready', () => {
      renderer.isReady = false;
      renderer.vimeo = { setCurrentTime: vi.fn().mockResolvedValue(undefined) };

      renderer.seek(30);

      expect(renderer.vimeo.setCurrentTime).not.toHaveBeenCalled();
    });

    it('should call setCurrentTime when ready', () => {
      renderer.isReady = true;
      renderer.vimeo = { setCurrentTime: vi.fn().mockResolvedValue(undefined) };

      renderer.seek(30);

      expect(renderer.vimeo.setCurrentTime).toHaveBeenCalledWith(30);
    });
  });

  describe('setVolume', () => {
    it('should not call setVolume when not ready', () => {
      renderer.isReady = false;
      renderer.vimeo = { setVolume: vi.fn().mockResolvedValue(undefined) };

      renderer.setVolume(0.5);

      expect(renderer.vimeo.setVolume).not.toHaveBeenCalled();
    });

    it('should call setVolume when ready', () => {
      renderer.isReady = true;
      renderer.vimeo = { setVolume: vi.fn().mockResolvedValue(undefined) };

      renderer.setVolume(0.5);

      expect(renderer.vimeo.setVolume).toHaveBeenCalledWith(0.5);
    });

    it('should update player state volume', () => {
      renderer.isReady = true;
      renderer.vimeo = { setVolume: vi.fn().mockResolvedValue(undefined) };

      renderer.setVolume(0.7);

      expect(mockPlayer.state.volume).toBe(0.7);
    });
  });

  describe('setMuted', () => {
    beforeEach(() => {
      renderer.isReady = true;
      renderer.vimeo = { setVolume: vi.fn().mockResolvedValue(undefined) };
      mockPlayer.state.volume = 0.8;
    });

    it('should set volume to 0 when muting', () => {
      renderer.setMuted(true);

      expect(renderer.vimeo.setVolume).toHaveBeenCalledWith(0);
    });

    it('should restore previous volume when unmuting', () => {
      renderer.setMuted(false);

      expect(renderer.vimeo.setVolume).toHaveBeenCalledWith(0.8);
    });

    it('should update player state muted', () => {
      renderer.setMuted(true);

      expect(mockPlayer.state.muted).toBe(true);
    });
  });

  describe('setPlaybackSpeed', () => {
    it('should not call setPlaybackRate when not ready', () => {
      renderer.isReady = false;
      renderer.vimeo = { setPlaybackRate: vi.fn().mockResolvedValue(undefined) };

      renderer.setPlaybackSpeed(1.5);

      expect(renderer.vimeo.setPlaybackRate).not.toHaveBeenCalled();
    });

    it('should call setPlaybackRate when ready', () => {
      renderer.isReady = true;
      renderer.vimeo = { setPlaybackRate: vi.fn().mockResolvedValue(undefined) };

      renderer.setPlaybackSpeed(1.5);

      expect(renderer.vimeo.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });

    it('should update player state playbackSpeed', () => {
      renderer.isReady = true;
      renderer.vimeo = { setPlaybackRate: vi.fn().mockResolvedValue(undefined) };

      renderer.setPlaybackSpeed(2);

      expect(mockPlayer.state.playbackSpeed).toBe(2);
    });
  });

  describe('destroy', () => {
    it('should call vimeo.destroy if available', () => {
      const destroyFn = vi.fn();
      renderer.vimeo = { destroy: destroyFn };
      renderer.iframe = document.createElement('div');
      document.body.appendChild(renderer.iframe);

      renderer.destroy();

      expect(destroyFn).toHaveBeenCalled();
    });

    it('should remove iframe from DOM', () => {
      renderer.iframe = document.createElement('div');
      document.body.appendChild(renderer.iframe);
      renderer.vimeo = null;

      renderer.destroy();

      expect(renderer.iframe.parentNode).toBeNull();
    });

    it('should show original element', () => {
      mockPlayer.element.style.display = 'none';
      renderer.vimeo = null;
      renderer.iframe = null;

      renderer.destroy();

      expect(mockPlayer.element.style.display).toBe('');
    });

    it('should handle null vimeo gracefully', () => {
      renderer.vimeo = null;
      renderer.iframe = null;

      expect(() => renderer.destroy()).not.toThrow();
    });
  });

  describe('createIframe', () => {
    it('should hide original element', () => {
      renderer.createIframe();

      expect(mockPlayer.element.style.display).toBe('none');
    });

    it('should create iframe container', () => {
      renderer.createIframe();

      expect(renderer.iframe).not.toBeNull();
      expect(renderer.iframe.tagName).toBe('DIV');
    });

    it('should set iframe to 100% width', () => {
      renderer.createIframe();

      expect(renderer.iframe.style.width).toBe('100%');
    });

    it('should insert iframe before original element', () => {
      renderer.createIframe();

      expect(mockPlayer.element.previousSibling).toBe(renderer.iframe);
    });
  });
});
