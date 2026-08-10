/**
 * Unit Tests: YouTubeRenderer (Mocked API)
 * Tests YouTube renderer with mocked YouTube IFrame API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeRenderer } from '../../src/renderers/YouTubeRenderer.js';

describe('YouTubeRenderer (Mocked)', () => {
  let renderer;
  let mockPlayer;
  let mockYouTubePlayer;

  beforeEach(() => {
    // Create mock YouTube player instance
    mockYouTubePlayer = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      cueVideoById: vi.fn(),
      loadVideoById: vi.fn(),
      seekTo: vi.fn(),
      setVolume: vi.fn(),
      mute: vi.fn(),
      unMute: vi.fn(),
      setPlaybackRate: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(30),
      getDuration: vi.fn().mockReturnValue(300),
      destroy: vi.fn()
    };

    // Mock YouTube IFrame API
    window.YT = {
      Player: vi.fn().mockImplementation((elementId, config) => {
        // Simulate onReady callback
        setTimeout(() => {
          if (config.events && config.events.onReady) {
            config.events.onReady({ target: mockYouTubePlayer });
          }
        }, 0);
        return mockYouTubePlayer;
      }),
      PlayerState: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5
      }
    };

    // Create mock player
    mockPlayer = {
      element: document.createElement('video'),
      container: document.createElement('div'),
      currentSource: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      options: {
        classPrefix: 'vidply',
        autoplay: false,
        muted: false,
        startTime: 0,
        loop: false
      },
      state: {
        playing: false,
        paused: true,
        ended: false,
        buffering: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        muted: false,
        playbackSpeed: 1
      },
      emit: vi.fn(),
      handleError: vi.fn()
    };

    mockPlayer.container.appendChild(mockPlayer.element);
    document.body.appendChild(mockPlayer.container);

    renderer = new YouTubeRenderer(mockPlayer);
    renderer.videoId = 'dQw4w9WgXcQ';
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
    delete window.YT;
  });

  describe('loadSource', () => {
    it('should cue a different YouTube video without recreating the player', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;
      renderer.videoId = 'dQw4w9WgXcQ';
      mockPlayer.currentSource = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      renderer.loadSource('https://www.youtube.com/watch?v=abc123DEF45');

      expect(mockYouTubePlayer.cueVideoById).toHaveBeenCalledWith('abc123DEF45');
      expect(renderer.videoId).toBe('abc123DEF45');
      expect(mockPlayer.currentSource).toBe('https://www.youtube.com/watch?v=abc123DEF45');
    });

    it('should no-op when the video id is unchanged', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;
      renderer.videoId = 'dQw4w9WgXcQ';

      renderer.loadSource('https://youtu.be/dQw4w9WgXcQ?t=10');

      expect(mockYouTubePlayer.cueVideoById).not.toHaveBeenCalled();
    });
  });

  describe('play', () => {
    it('should call playVideo when ready', async () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.play();

      expect(mockYouTubePlayer.playVideo).toHaveBeenCalled();
    });

    it('should not call playVideo when not ready', () => {
      renderer.isReady = false;
      renderer.youtube = mockYouTubePlayer;

      renderer.play();

      expect(mockYouTubePlayer.playVideo).not.toHaveBeenCalled();
    });

    it('should preserve scroll position', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      const scrollX = 100;
      const scrollY = 200;
      window.scrollX = scrollX;
      window.scrollY = scrollY;
      window.scrollTo = vi.fn();

      renderer.play();

      expect(window.scrollTo).toHaveBeenCalledWith(scrollX, scrollY);
    });
  });

  describe('pause', () => {
    it('should call pauseVideo when ready', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.pause();

      expect(mockYouTubePlayer.pauseVideo).toHaveBeenCalled();
    });

    it('should not call pauseVideo when not ready', () => {
      renderer.isReady = false;
      renderer.youtube = mockYouTubePlayer;

      renderer.pause();

      expect(mockYouTubePlayer.pauseVideo).not.toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('should call seekTo with time', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.seek(120);

      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(120, true);
    });

    it('should not seek when not ready', () => {
      renderer.isReady = false;
      renderer.youtube = mockYouTubePlayer;

      renderer.seek(120);

      expect(mockYouTubePlayer.seekTo).not.toHaveBeenCalled();
    });
  });

  describe('setVolume', () => {
    it('should set volume as percentage (0-100)', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.setVolume(0.5);

      expect(mockYouTubePlayer.setVolume).toHaveBeenCalledWith(50);
      expect(mockPlayer.state.volume).toBe(0.5);
    });

    it('should handle full volume', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.setVolume(1);

      expect(mockYouTubePlayer.setVolume).toHaveBeenCalledWith(100);
    });

    it('should handle zero volume', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.setVolume(0);

      expect(mockYouTubePlayer.setVolume).toHaveBeenCalledWith(0);
    });
  });

  describe('setMuted', () => {
    it('should call mute when muted is true', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.setMuted(true);

      expect(mockYouTubePlayer.mute).toHaveBeenCalled();
      expect(mockPlayer.state.muted).toBe(true);
    });

    it('should call unMute when muted is false', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.setMuted(false);

      expect(mockYouTubePlayer.unMute).toHaveBeenCalled();
      expect(mockPlayer.state.muted).toBe(false);
    });
  });

  describe('setPlaybackSpeed', () => {
    it('should set playback rate', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.setPlaybackSpeed(1.5);

      expect(mockYouTubePlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);
      expect(mockPlayer.state.playbackSpeed).toBe(1.5);
    });

    it('should handle slow playback', () => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.setPlaybackSpeed(0.5);

      expect(mockYouTubePlayer.setPlaybackRate).toHaveBeenCalledWith(0.5);
    });
  });

  describe('handleStateChange', () => {
    beforeEach(() => {
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;
    });

    it('should handle PLAYING state', () => {
      const event = { data: window.YT.PlayerState.PLAYING };
      
      renderer.handleStateChange(event);

      expect(mockPlayer.state.playing).toBe(true);
      expect(mockPlayer.state.paused).toBe(false);
      expect(mockPlayer.state.ended).toBe(false);
      expect(mockPlayer.emit).toHaveBeenCalledWith('play');
      expect(mockPlayer.emit).toHaveBeenCalledWith('playing');
    });

    it('should handle PAUSED state', () => {
      const event = { data: window.YT.PlayerState.PAUSED };
      
      renderer.handleStateChange(event);

      expect(mockPlayer.state.playing).toBe(false);
      expect(mockPlayer.state.paused).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('pause');
    });

    it('should handle ENDED state', () => {
      const event = { data: window.YT.PlayerState.ENDED };
      
      renderer.handleStateChange(event);

      expect(mockPlayer.state.playing).toBe(false);
      expect(mockPlayer.state.paused).toBe(true);
      expect(mockPlayer.state.ended).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('ended');
    });

    it('should handle ENDED state with loop enabled', () => {
      mockPlayer.options.loop = true;
      const event = { data: window.YT.PlayerState.ENDED };
      
      renderer.handleStateChange(event);

      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(0);
      expect(mockYouTubePlayer.playVideo).toHaveBeenCalled();
    });

    it('should handle BUFFERING state', () => {
      const event = { data: window.YT.PlayerState.BUFFERING };
      
      renderer.handleStateChange(event);

      expect(mockPlayer.state.buffering).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('waiting');
    });

    it('should handle CUED state', () => {
      const event = { data: window.YT.PlayerState.CUED };
      
      renderer.handleStateChange(event);

      expect(mockPlayer.emit).toHaveBeenCalledWith('loadedmetadata');
    });

    it('should call onPlay callback when playing', () => {
      const onPlay = vi.fn();
      mockPlayer.options.onPlay = onPlay;
      const event = { data: window.YT.PlayerState.PLAYING };
      
      renderer.handleStateChange(event);

      expect(onPlay).toHaveBeenCalled();
    });

    it('should call onPause callback when paused', () => {
      const onPause = vi.fn();
      mockPlayer.options.onPause = onPause;
      const event = { data: window.YT.PlayerState.PAUSED };
      
      renderer.handleStateChange(event);

      expect(onPause).toHaveBeenCalled();
    });

    it('should call onEnded callback when ended', () => {
      const onEnded = vi.fn();
      mockPlayer.options.onEnded = onEnded;
      const event = { data: window.YT.PlayerState.ENDED };
      
      renderer.handleStateChange(event);

      expect(onEnded).toHaveBeenCalled();
    });
  });

  describe('handleError', () => {
    it('should handle invalid video ID error', () => {
      renderer.handleError({ data: 2 });

      expect(mockPlayer.handleError).toHaveBeenCalled();
      const error = mockPlayer.handleError.mock.calls[0][0];
      expect(error.message).toBe('Invalid video ID');
    });

    it('should handle video not found error', () => {
      renderer.handleError({ data: 100 });

      expect(mockPlayer.handleError).toHaveBeenCalled();
      const error = mockPlayer.handleError.mock.calls[0][0];
      expect(error.message).toBe('Video not found');
    });

    it('should handle embed restriction error (101)', () => {
      renderer.handleError({ data: 101 });

      expect(mockPlayer.handleError).toHaveBeenCalled();
      const error = mockPlayer.handleError.mock.calls[0][0];
      expect(error.message).toBe('Video not allowed to be played in embedded players');
    });

    it('should handle embed restriction error (150)', () => {
      renderer.handleError({ data: 150 });

      expect(mockPlayer.handleError).toHaveBeenCalled();
      const error = mockPlayer.handleError.mock.calls[0][0];
      expect(error.message).toBe('Video not allowed to be played in embedded players');
    });

    it('should handle unknown errors', () => {
      renderer.handleError({ data: 999 });

      expect(mockPlayer.handleError).toHaveBeenCalled();
      const error = mockPlayer.handleError.mock.calls[0][0];
      expect(error.message).toBe('YouTube player error');
    });
  });

  describe('destroy', () => {
    it('should clear time update interval', () => {
      renderer.timeUpdateInterval = setInterval(() => {}, 1000);
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      renderer.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should destroy YouTube player', () => {
      renderer.youtube = mockYouTubePlayer;

      renderer.destroy();

      expect(mockYouTubePlayer.destroy).toHaveBeenCalled();
    });

    it('should remove iframe from DOM', () => {
      renderer.iframe = document.createElement('div');
      document.body.appendChild(renderer.iframe);

      renderer.destroy();

      expect(renderer.iframe.parentNode).toBeNull();
    });

    it('should show original element', () => {
      mockPlayer.element.style.display = 'none';

      renderer.destroy();

      expect(mockPlayer.element.style.display).toBe('');
    });
  });

  describe('attachEvents', () => {
    it('should set up time update polling', () => {
      vi.useFakeTimers();
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.attachEvents();
      vi.advanceTimersByTime(250);

      expect(mockYouTubePlayer.getCurrentTime).toHaveBeenCalled();
      expect(mockYouTubePlayer.getDuration).toHaveBeenCalled();
      expect(mockPlayer.emit).toHaveBeenCalledWith('timeupdate', 30);

      vi.useRealTimers();
    });

    it('should update player state with current time', () => {
      vi.useFakeTimers();
      renderer.isReady = true;
      renderer.youtube = mockYouTubePlayer;

      renderer.attachEvents();
      vi.advanceTimersByTime(250);

      expect(mockPlayer.state.currentTime).toBe(30);
      expect(mockPlayer.state.duration).toBe(300);

      vi.useRealTimers();
    });
  });
});
