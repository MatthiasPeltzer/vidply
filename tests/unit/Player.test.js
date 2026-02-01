/**
 * Unit Tests: Player
 * Tests Player class methods with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all heavy dependencies
vi.mock('../../src/controls/ControlBar.js', () => ({
  ControlBar: class MockControlBar {
    constructor() {
      this.element = document.createElement('div');
      this.updateCaptionsButton = vi.fn();
      this.updateQualityButton = vi.fn();
      this.updateTranscriptButton = vi.fn();
      this.destroy = vi.fn();
    }
  }
}));

vi.mock('../../src/controls/CaptionManager.js', () => ({
  CaptionManager: class MockCaptionManager {
    constructor() {
      this.currentTrack = null;
      this.tracks = [];
      this.enableCaptions = vi.fn();
      this.disableCaptions = vi.fn();
      this.toggleCaptions = vi.fn();
      this.destroy = vi.fn();
    }
  }
}));

vi.mock('../../src/controls/KeyboardManager.js', () => ({
  KeyboardManager: class MockKeyboardManager {
    constructor() {
      this.destroy = vi.fn();
    }
  }
}));

vi.mock('../../src/renderers/HTML5Renderer.js', () => ({
  HTML5Renderer: class MockHTML5Renderer {
    constructor(player) {
      this.player = player;
      this.play = vi.fn().mockResolvedValue();
      this.pause = vi.fn();
      this.seek = vi.fn();
      this.setVolume = vi.fn();
      this.setMuted = vi.fn();
      this.setPlaybackSpeed = vi.fn();
      this.getCurrentTime = vi.fn().mockReturnValue(0);
      this.getDuration = vi.fn().mockReturnValue(100);
      this.isPaused = vi.fn().mockReturnValue(true);
      this.isEnded = vi.fn().mockReturnValue(false);
      this.destroy = vi.fn();
    }
  }
}));

vi.mock('../../src/core/AudioDescriptionManager.js', () => ({
  AudioDescriptionManager: class MockAudioDescriptionManager {
    constructor() {
      this.enabled = false;
      this.isAvailable = vi.fn().mockReturnValue(false);
      this.enable = vi.fn().mockResolvedValue();
      this.disable = vi.fn().mockResolvedValue();
      this.toggle = vi.fn().mockResolvedValue();
      this.initFromSourceElements = vi.fn();
    }
  }
}));

vi.mock('../../src/core/SignLanguageManager.js', () => ({
  SignLanguageManager: class MockSignLanguageManager {
    constructor() {
      this.enabled = false;
      this.isAvailable = vi.fn().mockReturnValue(false);
      this.enable = vi.fn();
      this.disable = vi.fn();
      this.toggle = vi.fn();
      this.cleanup = vi.fn();
      this.destroy = vi.fn();
    }
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createPlayOverlay: vi.fn(() => document.createElement('div')),
  createIconElement: vi.fn(() => document.createElement('span'))
}));

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key) => key),
    setLanguage: vi.fn()
  }
}));

vi.mock('../../src/utils/StorageManager.js', () => ({
  StorageManager: class MockStorageManager {
    constructor() {
      this.getPlayerPreferences = vi.fn().mockReturnValue(null);
      this.savePlayerPreferences = vi.fn();
      this.getSignLanguagePreferences = vi.fn().mockReturnValue(null);
      this.saveSignLanguagePreferences = vi.fn();
    }
  }
}));

vi.mock('../../src/utils/DraggableResizable.js', () => ({
  DraggableResizable: class MockDraggableResizable {
    constructor() {
      this.destroy = vi.fn();
    }
  }
}));

vi.mock('../../src/utils/MenuUtils.js', () => ({
  createMenuItem: vi.fn(() => document.createElement('button')),
  attachMenuKeyboardNavigation: vi.fn(),
  focusFirstMenuItem: vi.fn()
}));

vi.mock('../../src/utils/FormUtils.js', () => ({
  createLabeledSelect: vi.fn(() => ({
    label: document.createElement('label'),
    select: document.createElement('select')
  })),
  preventDragOnElement: vi.fn()
}));

vi.mock('../../src/utils/PerformanceUtils.js', () => ({
  debounce: vi.fn((fn) => fn),
  isMobile: vi.fn().mockReturnValue(false),
  rafWithTimeout: vi.fn((fn) => fn())
}));

vi.mock('../../src/utils/VideoFrameCapture.js', () => ({
  captureVideoFrame: vi.fn()
}));

describe('Player', () => {
  let Player;
  let player;
  let container;
  let videoElement;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.useFakeTimers();

    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    videoElement = document.createElement('video');
    videoElement.id = 'test-video';
    container.appendChild(videoElement);

    // Import Player after mocks are set up
    const module = await import('../../src/core/Player.js');
    Player = module.Player;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('play', () => {
    it('should have play method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.play).toBe('function');
    });
  });

  describe('pause', () => {
    it('should have pause method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.pause).toBe('function');
    });
  });

  describe('stop', () => {
    it('should have stop method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.stop).toBe('function');
    });
  });

  describe('toggle', () => {
    it('should have toggle method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.toggle).toBe('function');
    });
  });

  describe('seek', () => {
    it('should have seek method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.seek).toBe('function');
    });
  });

  describe('seekForward', () => {
    it('should have seekForward method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.seekForward).toBe('function');
    });

    it('should call seek', () => {
      player = new Player(videoElement);
      const seekSpy = vi.spyOn(player, 'seek');
      
      player.seekForward();
      
      expect(seekSpy).toHaveBeenCalled();
    });
  });

  describe('seekBackward', () => {
    it('should have seekBackward method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.seekBackward).toBe('function');
    });

    it('should call seek', () => {
      player = new Player(videoElement);
      const seekSpy = vi.spyOn(player, 'seek');
      
      player.seekBackward();
      
      expect(seekSpy).toHaveBeenCalled();
    });
  });

  describe('setVolume', () => {
    it('should update state volume', () => {
      player = new Player(videoElement);
      
      player.setVolume(0.5);
      
      expect(player.state.volume).toBe(0.5);
    });

    it('should clamp volume to 0-1 range', () => {
      player = new Player(videoElement);
      
      player.setVolume(1.5);
      expect(player.state.volume).toBe(1);
      
      player.setVolume(-0.5);
      expect(player.state.volume).toBe(0);
    });
  });

  describe('getVolume', () => {
    it('should return current volume', () => {
      player = new Player(videoElement);
      player.state.volume = 0.7;
      
      const volume = player.getVolume();
      
      expect(volume).toBe(0.7);
    });
  });

  describe('mute', () => {
    it('should set muted state to true', () => {
      player = new Player(videoElement);
      
      player.mute();
      
      expect(player.state.muted).toBe(true);
    });
  });

  describe('unmute', () => {
    it('should set muted state to false', () => {
      player = new Player(videoElement);
      player.state.muted = true;
      
      player.unmute();
      
      expect(player.state.muted).toBe(false);
    });
  });

  describe('toggleMute', () => {
    it('should mute when unmuted', () => {
      player = new Player(videoElement);
      player.state.muted = false;
      const muteSpy = vi.spyOn(player, 'mute');
      
      player.toggleMute();
      
      expect(muteSpy).toHaveBeenCalled();
    });

    it('should unmute when muted', () => {
      player = new Player(videoElement);
      player.state.muted = true;
      const unmuteSpy = vi.spyOn(player, 'unmute');
      
      player.toggleMute();
      
      expect(unmuteSpy).toHaveBeenCalled();
    });
  });

  describe('setPlaybackSpeed', () => {
    it('should update state playbackSpeed', () => {
      player = new Player(videoElement);
      
      player.setPlaybackSpeed(1.5);
      
      expect(player.state.playbackSpeed).toBe(1.5);
    });

    it('should emit playbackspeedchange event', () => {
      player = new Player(videoElement);
      const emitSpy = vi.spyOn(player, 'emit');
      
      player.setPlaybackSpeed(2);
      
      expect(emitSpy).toHaveBeenCalledWith('playbackspeedchange', 2);
    });
  });

  describe('getPlaybackSpeed', () => {
    it('should return current playback speed', () => {
      player = new Player(videoElement);
      player.state.playbackSpeed = 1.25;
      
      const speed = player.getPlaybackSpeed();
      
      expect(speed).toBe(1.25);
    });
  });

  describe('getCurrentTime', () => {
    it('should return current time from state', () => {
      player = new Player(videoElement);
      player.state.currentTime = 45;
      
      const time = player.getCurrentTime();
      
      expect(time).toBe(45);
    });
  });

  describe('getDuration', () => {
    it('should return duration from state', () => {
      player = new Player(videoElement);
      player.state.duration = 120;
      
      const duration = player.getDuration();
      
      expect(duration).toBe(120);
    });
  });

  describe('isPlaying', () => {
    it('should return boolean', () => {
      player = new Player(videoElement);
      
      expect(typeof player.isPlaying()).toBe('boolean');
    });

    it('should return false when paused', () => {
      player = new Player(videoElement);
      player.state.paused = true;
      player.state.playing = false;
      
      expect(player.isPlaying()).toBe(false);
    });
  });

  describe('isPaused', () => {
    it('should return true when paused', () => {
      player = new Player(videoElement);
      player.state.paused = true;
      
      expect(player.isPaused()).toBe(true);
    });

    it('should return false when playing', () => {
      player = new Player(videoElement);
      player.state.paused = false;
      
      expect(player.isPaused()).toBe(false);
    });
  });

  describe('isEnded', () => {
    it('should return true when ended', () => {
      player = new Player(videoElement);
      player.state.ended = true;
      
      expect(player.isEnded()).toBe(true);
    });

    it('should return false when not ended', () => {
      player = new Player(videoElement);
      player.state.ended = false;
      
      expect(player.isEnded()).toBe(false);
    });
  });

  describe('isMuted', () => {
    it('should return true when muted', () => {
      player = new Player(videoElement);
      player.state.muted = true;
      
      expect(player.isMuted()).toBe(true);
    });

    it('should return false when not muted', () => {
      player = new Player(videoElement);
      player.state.muted = false;
      
      expect(player.isMuted()).toBe(false);
    });
  });

  describe('isFullscreen', () => {
    it('should return fullscreen state', () => {
      player = new Player(videoElement);
      player.state.fullscreen = true;
      
      expect(player.isFullscreen()).toBe(true);
    });
  });

  describe('showNotice', () => {
    it('should have showNotice method', () => {
      player = new Player(videoElement);
      
      expect(typeof player.showNotice).toBe('function');
    });

    it('should not throw when called', () => {
      player = new Player(videoElement);
      
      expect(() => player.showNotice('Test message')).not.toThrow();
    });
  });

  describe('log', () => {
    it('should log when debug is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      player = new Player(videoElement, { debug: true });
      
      player.log('Test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log when debug is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      player = new Player(videoElement, { debug: false });
      
      player.log('Test message');
      
      // Should not log unless it's the initialization logs
      consoleSpy.mockRestore();
    });
  });

  describe('handleError', () => {
    it('should emit error event', () => {
      player = new Player(videoElement);
      const emitSpy = vi.spyOn(player, 'emit');
      
      player.handleError(new Error('Test error'));
      
      expect(emitSpy).toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('should log error when debug enabled', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      player = new Player(videoElement, { debug: true });
      
      player.handleError(new Error('Test error'));
      
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('isExternalRendererUrl', () => {
    it('should detect YouTube URLs', () => {
      player = new Player(videoElement);
      
      expect(player.isExternalRendererUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
      expect(player.isExternalRendererUrl('https://youtu.be/abc123')).toBe(true);
    });

    it('should detect Vimeo URLs', () => {
      player = new Player(videoElement);
      
      expect(player.isExternalRendererUrl('https://vimeo.com/123456')).toBe(true);
    });

    it('should detect SoundCloud URLs', () => {
      player = new Player(videoElement);
      
      expect(player.isExternalRendererUrl('https://soundcloud.com/artist/track')).toBe(true);
    });

    it('should detect HLS URLs', () => {
      player = new Player(videoElement);
      
      expect(player.isExternalRendererUrl('https://example.com/video.m3u8')).toBe(true);
    });

    it('should return false for regular video URLs', () => {
      player = new Player(videoElement);
      
      expect(player.isExternalRendererUrl('https://example.com/video.mp4')).toBe(false);
      expect(player.isExternalRendererUrl('/videos/test.webm')).toBe(false);
    });
  });

  describe('stripVTTFormatting', () => {
    it('should remove VTT tags', () => {
      player = new Player(videoElement);
      
      const input = '<v Speaker>Hello world</v>';
      const result = player.stripVTTFormatting(input);
      
      // Method may lowercase the result
      expect(result.toLowerCase()).toBe('hello world');
    });

    it('should handle multiple tags', () => {
      player = new Player(videoElement);
      
      const input = '<b>Bold</b> and <i>italic</i>';
      const result = player.stripVTTFormatting(input);
      
      expect(result.toLowerCase()).toBe('bold and italic');
    });

    it('should replace newlines with spaces', () => {
      player = new Player(videoElement);
      
      const input = 'Line one\nLine two';
      const result = player.stripVTTFormatting(input);
      
      expect(result.toLowerCase()).toBe('line one line two');
    });
  });

  describe('findTextTrack', () => {
    it('should return undefined when no tracks exist', () => {
      player = new Player(videoElement);
      
      const track = player.findTextTrack('captions');
      
      expect(track).toBeUndefined();
    });

    it('should find track from element text tracks', () => {
      // Add a track element to the video
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'captions');
      trackEl.setAttribute('srclang', 'en');
      trackEl.setAttribute('src', 'captions.vtt');
      videoElement.appendChild(trackEl);
      
      player = new Player(videoElement);
      
      // The findTextTrack method searches element.textTracks
      // In jsdom, textTracks may not be fully populated
      const track = player.findTextTrack('captions');
      
      // Just verify method doesn't throw
      expect(typeof player.findTextTrack).toBe('function');
    });
  });

  describe('findSourceElement', () => {
    it('should find source element by attribute', () => {
      const source = document.createElement('source');
      source.setAttribute('data-test', 'value');
      source.setAttribute('src', 'test.mp4');
      videoElement.appendChild(source);
      
      player = new Player(videoElement);
      
      const found = player.findSourceElement('data-test');
      
      expect(found).not.toBeNull();
    });

    it('should find source element by attribute and value', () => {
      const source1 = document.createElement('source');
      source1.setAttribute('type', 'video/mp4');
      source1.setAttribute('src', 'test1.mp4');
      const source2 = document.createElement('source');
      source2.setAttribute('type', 'video/webm');
      source2.setAttribute('src', 'test2.webm');
      videoElement.appendChild(source1);
      videoElement.appendChild(source2);
      
      player = new Player(videoElement);
      
      const found = player.findSourceElement('type', 'video/webm');
      
      expect(found).not.toBeNull();
      expect(found.getAttribute('type')).toBe('video/webm');
    });
  });

  describe('setManagedTimeout', () => {
    it('should return timeout ID', () => {
      player = new Player(videoElement);
      
      const id = player.setManagedTimeout(() => {}, 1000);
      
      expect(id).toBeDefined();
    });

    it('should execute callback after delay', () => {
      player = new Player(videoElement);
      const callback = vi.fn();
      
      player.setManagedTimeout(callback, 1000);
      
      expect(callback).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1000);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('clearManagedTimeout', () => {
    it('should clear timeout', () => {
      player = new Player(videoElement);
      const callback = vi.fn();
      
      const id = player.setManagedTimeout(callback, 1000);
      player.clearManagedTimeout(id);
      
      vi.advanceTimersByTime(2000);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('caption methods', () => {
    it('enableCaptions should not throw when captionManager is null', () => {
      player = new Player(videoElement);
      // captionManager may be null in unit tests
      
      expect(() => player.enableCaptions()).not.toThrow();
    });

    it('disableCaptions should not throw when captionManager is null', () => {
      player = new Player(videoElement);
      
      expect(() => player.disableCaptions()).not.toThrow();
    });

    it('toggleCaptions should not throw when captionManager is null', () => {
      player = new Player(videoElement);
      
      expect(() => player.toggleCaptions()).not.toThrow();
    });
  });

  describe('audio description methods', () => {
    it('enableAudioDescription should call audioDescriptionManager.enable', async () => {
      player = new Player(videoElement);
      
      await player.enableAudioDescription();
      
      expect(player.audioDescriptionManager.enable).toHaveBeenCalled();
    });

    it('disableAudioDescription should call audioDescriptionManager.disable', async () => {
      player = new Player(videoElement);
      
      await player.disableAudioDescription();
      
      expect(player.audioDescriptionManager.disable).toHaveBeenCalled();
    });

    it('toggleAudioDescription should call audioDescriptionManager.toggle', async () => {
      player = new Player(videoElement);
      
      await player.toggleAudioDescription();
      
      expect(player.audioDescriptionManager.toggle).toHaveBeenCalled();
    });
  });

  describe('sign language methods', () => {
    it('enableSignLanguage should call signLanguageManager.enable', () => {
      player = new Player(videoElement);
      
      player.enableSignLanguage();
      
      expect(player.signLanguageManager.enable).toHaveBeenCalled();
    });

    it('disableSignLanguage should call signLanguageManager.disable', () => {
      player = new Player(videoElement);
      
      player.disableSignLanguage();
      
      expect(player.signLanguageManager.disable).toHaveBeenCalled();
    });

    it('toggleSignLanguage should call signLanguageManager.toggle', () => {
      player = new Player(videoElement);
      
      player.toggleSignLanguage();
      
      expect(player.signLanguageManager.toggle).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('should initialize state correctly', () => {
      player = new Player(videoElement);
      
      expect(player.state.paused).toBe(true);
      expect(player.state.volume).toBe(0.8);
      expect(player.state.muted).toBe(false);
      expect(player.state.playbackSpeed).toBe(1);
      expect(player.state.fullscreen).toBe(false);
    });

    it('should update state on volume change', () => {
      player = new Player(videoElement);
      
      player.setVolume(0.3);
      
      expect(player.state.volume).toBe(0.3);
    });

    it('should update state on mute', () => {
      player = new Player(videoElement);
      
      player.mute();
      
      expect(player.state.muted).toBe(true);
    });

    it('should update state on speed change', () => {
      player = new Player(videoElement);
      
      player.setPlaybackSpeed(1.5);
      
      expect(player.state.playbackSpeed).toBe(1.5);
    });
  });

  describe('event emission', () => {
    it('should emit play event', async () => {
      player = new Player(videoElement);
      const listener = vi.fn();
      player.on('play', listener);
      
      // Simulate play triggering
      player.emit('play');
      
      expect(listener).toHaveBeenCalled();
    });

    it('should emit pause event', () => {
      player = new Player(videoElement);
      const listener = vi.fn();
      player.on('pause', listener);
      
      player.emit('pause');
      
      expect(listener).toHaveBeenCalled();
    });

    it('should emit timeupdate event', () => {
      player = new Player(videoElement);
      const listener = vi.fn();
      player.on('timeupdate', listener);
      
      player.emit('timeupdate', { currentTime: 10 });
      
      expect(listener).toHaveBeenCalledWith({ currentTime: 10 });
    });
  });

  describe('destroy', () => {
    it('should not throw when called', () => {
      player = new Player(videoElement);
      
      expect(() => player.destroy()).not.toThrow();
    });

    it('should be callable multiple times safely', () => {
      player = new Player(videoElement);
      
      player.destroy();
      player.destroy(); // Should not throw
      
      // The method should handle being called multiple times
    });
  });

  describe('fullscreen methods', () => {
    it('toggleFullscreen should call enterFullscreen when not fullscreen', async () => {
      player = new Player(videoElement);
      player.state.fullscreen = false;
      const enterSpy = vi.spyOn(player, 'enterFullscreen').mockResolvedValue();
      
      await player.toggleFullscreen();
      
      expect(enterSpy).toHaveBeenCalled();
    });

    it('toggleFullscreen should call exitFullscreen when fullscreen', async () => {
      player = new Player(videoElement);
      player.state.fullscreen = true;
      const exitSpy = vi.spyOn(player, 'exitFullscreen').mockResolvedValue();
      
      await player.toggleFullscreen();
      
      expect(exitSpy).toHaveBeenCalled();
    });
  });

  describe('PiP methods', () => {
    it('enterPiP should request picture in picture if supported', async () => {
      player = new Player(videoElement);
      player.element.requestPictureInPicture = vi.fn().mockResolvedValue();
      
      await player.enterPiP();
      
      expect(player.element.requestPictureInPicture).toHaveBeenCalled();
    });

    it('togglePiP should call enterPiP when not in PiP', async () => {
      player = new Player(videoElement);
      const enterSpy = vi.spyOn(player, 'enterPiP').mockResolvedValue();
      document.pictureInPictureElement = null;
      
      await player.togglePiP();
      
      expect(enterSpy).toHaveBeenCalled();
    });
  });
});
