/**
 * Unit Tests: SoundCloudRenderer
 * Tests SoundCloud widget integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundCloudRenderer } from '../../src/renderers/SoundCloudRenderer.js';

describe('SoundCloudRenderer', () => {
  let renderer;
  let mockPlayer;
  let mockWidget;
  let mockElement;
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    
    container = document.createElement('div');
    mockElement = document.createElement('audio');
    mockElement.src = 'https://soundcloud.com/artist/track-name';
    container.appendChild(mockElement);
    document.body.appendChild(container);

    mockPlayer = {
      element: mockElement,
      currentSource: 'https://soundcloud.com/artist/track-name',
      container,
      videoWrapper: document.createElement('div'),
      options: {
        autoplay: false
      },
      state: {
        duration: 0,
        currentTime: 0,
        volume: 1,
        muted: false,
        playing: false,
        paused: true,
        ended: false
      },
      emit: vi.fn(),
      handleError: vi.fn(),
      log: vi.fn()
    };

    // Mock SoundCloud Widget API
    mockWidget = {
      bind: vi.fn(),
      unbind: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      seekTo: vi.fn(),
      setVolume: vi.fn(),
      getVolume: vi.fn((callback) => callback(50)),
      getCurrentSound: vi.fn((callback) => callback({ duration: 180000 }))
    };

    window.SC = {
      Widget: vi.fn(() => mockWidget),
    };
    window.SC.Widget.Events = {
      READY: 'ready',
      PLAY: 'play',
      PAUSE: 'pause',
      FINISH: 'finish',
      PLAY_PROGRESS: 'playProgress',
      SEEK: 'seek',
      LOAD_PROGRESS: 'loadProgress',
      ERROR: 'error'
    };

    renderer = new SoundCloudRenderer(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
    delete window.SC;
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      expect(renderer.player).toBe(mockPlayer);
    });

    it('should initialize with null widget', () => {
      expect(renderer.widget).toBeNull();
    });

    it('should initialize with isReady false', () => {
      expect(renderer.isReady).toBe(false);
    });

    it('should initialize with null iframe', () => {
      expect(renderer.iframe).toBeNull();
    });
  });

  describe('isValidSoundCloudUrl', () => {
    it('should validate soundcloud.com URLs', () => {
      expect(renderer.isValidSoundCloudUrl('https://soundcloud.com/artist/track')).toBe(true);
    });

    it('should validate api.soundcloud.com URLs', () => {
      expect(renderer.isValidSoundCloudUrl('https://api.soundcloud.com/tracks/123456')).toBe(true);
    });

    it('should reject non-SoundCloud URLs', () => {
      expect(renderer.isValidSoundCloudUrl('https://youtube.com/watch?v=123')).toBe(false);
    });

    it('should reject empty URLs', () => {
      expect(renderer.isValidSoundCloudUrl('')).toBe(false);
    });
  });

  describe('isPlaylist', () => {
    it('should return true for playlist URLs', () => {
      renderer.trackUrl = 'https://soundcloud.com/artist/sets/playlist-name';
      expect(renderer.isPlaylist()).toBe(true);
    });

    it('should return false for single track URLs', () => {
      renderer.trackUrl = 'https://soundcloud.com/artist/track-name';
      expect(renderer.isPlaylist()).toBe(false);
    });

    it('should return falsy when trackUrl is null', () => {
      renderer.trackUrl = null;
      expect(renderer.isPlaylist()).toBeFalsy();
    });
  });

  describe('getEmbedUrl', () => {
    it('should generate embed URL with track URL', () => {
      renderer.trackUrl = 'https://soundcloud.com/artist/track';
      const embedUrl = renderer.getEmbedUrl();
      
      expect(embedUrl).toContain('https://w.soundcloud.com/player/');
      expect(embedUrl).toContain('url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Ftrack');
    });

    it('should include auto_play parameter based on options', () => {
      renderer.trackUrl = 'https://soundcloud.com/artist/track';
      mockPlayer.options.autoplay = true;
      
      const embedUrl = renderer.getEmbedUrl();
      expect(embedUrl).toContain('auto_play=true');
    });

    it('should set auto_play to false when autoplay disabled', () => {
      renderer.trackUrl = 'https://soundcloud.com/artist/track';
      mockPlayer.options.autoplay = false;
      
      const embedUrl = renderer.getEmbedUrl();
      expect(embedUrl).toContain('auto_play=false');
    });

    it('should hide related tracks', () => {
      renderer.trackUrl = 'https://soundcloud.com/artist/track';
      const embedUrl = renderer.getEmbedUrl();
      
      expect(embedUrl).toContain('hide_related=true');
    });
  });

  describe('createIframe', () => {
    beforeEach(() => {
      renderer.trackUrl = 'https://soundcloud.com/artist/track';
    });

    it('should hide original element', () => {
      renderer.createIframe();
      expect(mockElement.style.display).toBe('none');
    });

    it('should create iframe element', () => {
      renderer.createIframe();
      expect(renderer.iframe).not.toBeNull();
      expect(renderer.iframe.tagName).toBe('IFRAME');
    });

    it('should set iframe ID', () => {
      renderer.createIframe();
      expect(renderer.iframe.id).toContain('soundcloud-player-');
    });

    it('should set iframe src to embed URL', () => {
      renderer.createIframe();
      expect(renderer.iframe.src).toContain('https://w.soundcloud.com/player/');
    });

    it('should add playlist class for playlist URLs', () => {
      renderer.trackUrl = 'https://soundcloud.com/artist/sets/playlist';
      renderer.createIframe();
      
      expect(renderer.iframe.classList.contains('vidply-soundcloud-playlist')).toBe(true);
    });

    it('should not add playlist class for single tracks', () => {
      renderer.createIframe();
      expect(renderer.iframe.classList.contains('vidply-soundcloud-playlist')).toBe(false);
    });

    it('should insert iframe before original element', () => {
      renderer.createIframe();
      const iframeIndex = Array.from(container.children).indexOf(renderer.iframe);
      const elementIndex = Array.from(container.children).indexOf(mockElement);
      expect(iframeIndex).toBeLessThan(elementIndex);
    });
  });

  describe('play', () => {
    it('should call widget play when ready', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.play();
      
      expect(mockWidget.play).toHaveBeenCalled();
    });

    it('should not call widget play when not ready', () => {
      renderer.isReady = false;
      renderer.widget = mockWidget;
      
      renderer.play();
      
      expect(mockWidget.play).not.toHaveBeenCalled();
    });

    it('should not throw when widget is null', () => {
      renderer.isReady = true;
      renderer.widget = null;
      
      expect(() => renderer.play()).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should call widget pause when ready', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.pause();
      
      expect(mockWidget.pause).toHaveBeenCalled();
    });

    it('should not call widget pause when not ready', () => {
      renderer.isReady = false;
      renderer.widget = mockWidget;
      
      renderer.pause();
      
      expect(mockWidget.pause).not.toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('should call widget seekTo with milliseconds', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.seek(30);
      
      expect(mockWidget.seekTo).toHaveBeenCalledWith(30000);
    });

    it('should update player state currentTime', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.seek(45);
      
      expect(mockPlayer.state.currentTime).toBe(45);
    });
  });

  describe('setVolume', () => {
    it('should call widget setVolume with 0-100 range', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.setVolume(0.5);
      
      expect(mockWidget.setVolume).toHaveBeenCalledWith(50);
    });

    it('should update player state volume', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.setVolume(0.75);
      
      expect(mockPlayer.state.volume).toBe(0.75);
    });
  });

  describe('setMuted', () => {
    it('should set volume to 0 when muting', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.setMuted(true);
      
      // getVolume is called first to store previous volume
      expect(mockWidget.getVolume).toHaveBeenCalled();
    });

    it('should restore previous volume when unmuting', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      renderer._previousVolume = 75;
      
      renderer.setMuted(false);
      
      expect(mockWidget.setVolume).toHaveBeenCalledWith(75);
    });

    it('should default to 100 when no previous volume', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.setMuted(false);
      
      expect(mockWidget.setVolume).toHaveBeenCalledWith(100);
    });

    it('should update player state muted', () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      renderer.setMuted(true);
      
      expect(mockPlayer.state.muted).toBe(true);
    });
  });

  describe('setPlaybackSpeed', () => {
    it('should log warning about unsupported feature', () => {
      renderer.setPlaybackSpeed(1.5);
      
      expect(mockPlayer.log).toHaveBeenCalledWith(
        'SoundCloud does not support playback speed control',
        'warn'
      );
    });
  });

  describe('getCurrentSound', () => {
    it('should return sound info when ready', async () => {
      renderer.isReady = true;
      renderer.widget = mockWidget;
      
      const sound = await renderer.getCurrentSound();
      
      expect(sound).toEqual({ duration: 180000 });
    });

    it('should return null when not ready', async () => {
      renderer.isReady = false;
      renderer.widget = mockWidget;
      
      const sound = await renderer.getCurrentSound();
      
      expect(sound).toBeNull();
    });
  });

  describe('attachEvents', () => {
    beforeEach(() => {
      renderer.widget = mockWidget;
    });

    it('should not attach events when widget is null', () => {
      renderer.widget = null;
      renderer.attachEvents();
      
      expect(mockWidget.bind).not.toHaveBeenCalled();
    });

    it('should bind PLAY event', () => {
      renderer.attachEvents();
      
      expect(mockWidget.bind).toHaveBeenCalledWith(
        window.SC.Widget.Events.PLAY,
        expect.any(Function)
      );
    });

    it('should bind PAUSE event', () => {
      renderer.attachEvents();
      
      expect(mockWidget.bind).toHaveBeenCalledWith(
        window.SC.Widget.Events.PAUSE,
        expect.any(Function)
      );
    });

    it('should bind FINISH event', () => {
      renderer.attachEvents();
      
      expect(mockWidget.bind).toHaveBeenCalledWith(
        window.SC.Widget.Events.FINISH,
        expect.any(Function)
      );
    });

    it('should bind PLAY_PROGRESS event', () => {
      renderer.attachEvents();
      
      expect(mockWidget.bind).toHaveBeenCalledWith(
        window.SC.Widget.Events.PLAY_PROGRESS,
        expect.any(Function)
      );
    });

    it('should bind SEEK event', () => {
      renderer.attachEvents();
      
      expect(mockWidget.bind).toHaveBeenCalledWith(
        window.SC.Widget.Events.SEEK,
        expect.any(Function)
      );
    });

    it('should handle PLAY event correctly', () => {
      renderer.attachEvents();
      
      // Find the PLAY callback
      const playCall = mockWidget.bind.mock.calls.find(
        call => call[0] === window.SC.Widget.Events.PLAY
      );
      const playCallback = playCall[1];
      
      playCallback();
      
      expect(mockPlayer.state.playing).toBe(true);
      expect(mockPlayer.state.paused).toBe(false);
      expect(mockPlayer.emit).toHaveBeenCalledWith('play');
    });

    it('should handle PAUSE event correctly', () => {
      renderer.attachEvents();
      
      const pauseCall = mockWidget.bind.mock.calls.find(
        call => call[0] === window.SC.Widget.Events.PAUSE
      );
      const pauseCallback = pauseCall[1];
      
      pauseCallback();
      
      expect(mockPlayer.state.playing).toBe(false);
      expect(mockPlayer.state.paused).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('pause');
    });

    it('should handle FINISH event correctly', () => {
      renderer.attachEvents();
      
      const finishCall = mockWidget.bind.mock.calls.find(
        call => call[0] === window.SC.Widget.Events.FINISH
      );
      const finishCallback = finishCall[1];
      
      finishCallback();
      
      expect(mockPlayer.state.ended).toBe(true);
      expect(mockPlayer.emit).toHaveBeenCalledWith('ended');
    });

    it('should handle loop option on FINISH', () => {
      mockPlayer.options.loop = true;
      renderer.isReady = true;
      renderer.attachEvents();
      
      const finishCall = mockWidget.bind.mock.calls.find(
        call => call[0] === window.SC.Widget.Events.FINISH
      );
      const finishCallback = finishCall[1];
      
      finishCallback();
      
      expect(mockWidget.seekTo).toHaveBeenCalledWith(0);
      expect(mockWidget.play).toHaveBeenCalled();
    });

    it('should handle PLAY_PROGRESS event', () => {
      renderer.attachEvents();
      
      const progressCall = mockWidget.bind.mock.calls.find(
        call => call[0] === window.SC.Widget.Events.PLAY_PROGRESS
      );
      const progressCallback = progressCall[1];
      
      progressCallback({ currentPosition: 30000 });
      
      expect(mockPlayer.state.currentTime).toBe(30);
      expect(mockPlayer.emit).toHaveBeenCalledWith('timeupdate', 30);
    });

    it('should handle SEEK event', () => {
      renderer.attachEvents();
      
      const seekCall = mockWidget.bind.mock.calls.find(
        call => call[0] === window.SC.Widget.Events.SEEK
      );
      const seekCallback = seekCall[1];
      
      seekCallback({ currentPosition: 45000 });
      
      expect(mockPlayer.state.currentTime).toBe(45);
      expect(mockPlayer.emit).toHaveBeenCalledWith('seeked');
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      renderer.widget = mockWidget;
      renderer.isReady = true;
      renderer.iframe = document.createElement('iframe');
      container.appendChild(renderer.iframe);
    });

    it('should unbind all events', () => {
      renderer.destroy();
      
      expect(mockWidget.unbind).toHaveBeenCalledWith(window.SC.Widget.Events.READY);
      expect(mockWidget.unbind).toHaveBeenCalledWith(window.SC.Widget.Events.PLAY);
      expect(mockWidget.unbind).toHaveBeenCalledWith(window.SC.Widget.Events.PAUSE);
      expect(mockWidget.unbind).toHaveBeenCalledWith(window.SC.Widget.Events.FINISH);
    });

    it('should remove iframe from DOM', () => {
      renderer.destroy();
      
      expect(container.contains(renderer.iframe)).toBe(false);
    });

    it('should show original element', () => {
      mockElement.style.display = 'none';
      
      renderer.destroy();
      
      expect(mockElement.style.display).toBe('');
    });

    it('should set widget to null', () => {
      renderer.destroy();
      
      expect(renderer.widget).toBeNull();
    });

    it('should set isReady to false', () => {
      renderer.destroy();
      
      expect(renderer.isReady).toBe(false);
    });

    it('should handle destroy when widget is null', () => {
      renderer.widget = null;
      expect(() => renderer.destroy()).not.toThrow();
    });
  });
});
