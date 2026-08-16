/**
 * Integration Tests: Player Initialization Paths
 * Tests various ways to initialize the Player
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Player } from '../../src/core/Player.js';

// Mock complex dependencies that require browser APIs
vi.mock('../../src/controls/ControlBar.js', () => ({
  ControlBar: class MockControlBar {
    constructor() {
      this.element = document.createElement('div');
      this.destroy = vi.fn();
      this.updatePlayPauseButton = vi.fn();
      this.updateVolumeButton = vi.fn();
      this.updateTimeDisplay = vi.fn();
      this.updateProgress = vi.fn();
      this.showControls = vi.fn();
      this.hideControls = vi.fn();
    }
  }
}));

vi.mock('../../src/controls/CaptionManager.js', () => ({
  CaptionManager: class MockCaptionManager {
    constructor() {
      this.destroy = vi.fn();
      this.loadCaptions = vi.fn();
      this.showCaptions = vi.fn();
      this.hideCaptions = vi.fn();
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
    constructor() {
      this.init = vi.fn().mockResolvedValue(undefined);
      this.destroy = vi.fn();
      this.play = vi.fn();
      this.pause = vi.fn();
      this.seek = vi.fn();
      this.setVolume = vi.fn();
      this.setMuted = vi.fn();
    }
  }
}));

vi.mock('../../src/core/AudioDescriptionManager.js', () => ({
  AudioDescriptionManager: class MockAudioDescriptionManager {
    constructor() {
      this.isAvailable = vi.fn().mockReturnValue(false);
      this.initFromSourceElements = vi.fn();
    }
  }
}));

vi.mock('../../src/core/SignLanguageManager.js', () => ({
  SignLanguageManager: class MockSignLanguageManager {
    constructor() {
      this.isAvailable = vi.fn().mockReturnValue(false);
    }
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createPlayOverlay: vi.fn(() => document.createElement('div')),
  createIconElement: vi.fn(() => document.createElement('span'))
}));

describe('Player Initialization Paths', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Element Selection', () => {
    it('should initialize from a video element directly', () => {
      const video = document.createElement('video');
      video.src = 'test.mp4';
      document.body.appendChild(video);

      const player = new Player(video);
      
      expect(player.element).toBe(video);
      expect(player.element.tagName).toBe('VIDEO');
    });

    it('should initialize from a CSS selector string', () => {
      const video = document.createElement('video');
      video.id = 'my-video';
      video.src = 'test.mp4';
      document.body.appendChild(video);

      const player = new Player('#my-video');
      
      expect(player.element.id).toBe('my-video');
    });

    it('should throw error for invalid selector', () => {
      expect(() => new Player('#nonexistent')).toThrow('VidPly: Element not found');
    });

    it('should throw error for null element', () => {
      expect(() => new Player(null)).toThrow('VidPly: Element not found');
    });
  });

  describe('Auto-create Media Element', () => {
    it('should auto-create video element from div', () => {
      const div = document.createElement('div');
      div.id = 'player-container';
      document.body.appendChild(div);

      const player = new Player(div);
      
      expect(player.element.tagName).toBe('VIDEO');
    });

    it('should auto-create audio element when mediaType is audio', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const player = new Player(div, { mediaType: 'audio' });
      
      expect(player.element.tagName).toBe('AUDIO');
    });

    it('should copy track elements from div to media element', () => {
      const div = document.createElement('div');
      const track = document.createElement('track');
      track.src = 'captions.vtt';
      track.kind = 'captions';
      track.srclang = 'en';
      div.appendChild(track);
      document.body.appendChild(div);

      const player = new Player(div);
      
      const copiedTracks = player.element.querySelectorAll('track');
      expect(copiedTracks.length).toBe(1);
      expect(copiedTracks[0].src).toContain('captions.vtt');
    });

    it('should not copy id and class attributes from div', () => {
      const div = document.createElement('div');
      div.id = 'original-id';
      div.className = 'original-class';
      div.setAttribute('data-custom', 'value');
      document.body.appendChild(div);

      const player = new Player(div);
      
      // id, class, and data- attributes should NOT be copied
      expect(player.element.id).not.toBe('original-id');
      expect(player.element.className).not.toBe('original-class');
    });
  });

  describe('Instance ID Assignment', () => {
    it('should assign unique instance IDs', () => {
      const video1 = document.createElement('video');
      const video2 = document.createElement('video');
      document.body.appendChild(video1);
      document.body.appendChild(video2);

      const player1 = new Player(video1);
      const player2 = new Player(video2);
      
      expect(player1.instanceId).toBeDefined();
      expect(player2.instanceId).toBeDefined();
      expect(player1.instanceId).not.toBe(player2.instanceId);
    });

    it('should increment instance IDs', () => {
      const video1 = document.createElement('video');
      const video2 = document.createElement('video');
      document.body.appendChild(video1);
      document.body.appendChild(video2);

      const player1 = new Player(video1);
      const player2 = new Player(video2);
      
      expect(player2.instanceId).toBeGreaterThan(player1.instanceId);
    });
  });

  describe('Options Merging', () => {
    it('should use default options when none provided', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video);
      
      expect(player.options.volume).toBe(0.8);
      expect(player.options.playbackSpeed).toBe(1.0);
      expect(player.options.responsive).toBe(true);
      expect(player.options.controls).toBe(true);
    });

    it('should merge custom options with defaults', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        volume: 0.5,
        autoplay: true,
        customOption: 'test'
      });
      
      expect(player.options.volume).toBe(0.5);
      expect(player.options.autoplay).toBe(true);
      expect(player.options.customOption).toBe('test');
      // Default values should still be present
      expect(player.options.playbackSpeed).toBe(1.0);
    });

    it('should handle display options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        width: 1280,
        height: 720,
        poster: 'poster.jpg'
      });
      
      expect(player.options.width).toBe(1280);
      expect(player.options.height).toBe(720);
      expect(player.options.poster).toBe('poster.jpg');
    });

    it('should handle playback options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        autoplay: true,
        loop: true,
        muted: true,
        preload: 'auto',
        startTime: 30
      });
      
      expect(player.options.autoplay).toBe(true);
      expect(player.options.loop).toBe(true);
      expect(player.options.muted).toBe(true);
      expect(player.options.preload).toBe('auto');
      expect(player.options.startTime).toBe(30);
    });

    it('ignores stale localStorage volume/mute when CMS defaults change', () => {
      localStorage.setItem('vidply_player_preferences', JSON.stringify({
        configKey: 'false|0.8',
        volume: 0.25,
        muted: false,
        playbackSpeed: 1.5
      }));

      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, { muted: true, volume: 0.8 });

      expect(player.options.muted).toBe(true);
      expect(player.options.volume).toBe(0.8);
      expect(player.options.playbackSpeed).toBe(1.5);
    });

    it('restores localStorage volume/mute when CMS config matches', () => {
      localStorage.setItem('vidply_player_preferences', JSON.stringify({
        configKey: 'true|0.8',
        volume: 0.55,
        muted: false,
        playbackSpeed: 1
      }));

      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, { muted: true, volume: 0.8 });

      expect(player.options.muted).toBe(false);
      expect(player.options.volume).toBe(0.55);
    });

    it('should handle control options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        controls: false,
        hideControlsDelay: 5000,
        playPauseButton: false,
        fullscreenButton: false
      });
      
      expect(player.options.controls).toBe(false);
      expect(player.options.hideControlsDelay).toBe(5000);
      expect(player.options.playPauseButton).toBe(false);
      expect(player.options.fullscreenButton).toBe(false);
    });

    it('should handle caption options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        captions: true,
        captionsDefault: true,
        captionsFontSize: '120%',
        captionsColor: '#FFFF00'
      });
      
      expect(player.options.captions).toBe(true);
      expect(player.options.captionsDefault).toBe(true);
      expect(player.options.captionsFontSize).toBe('120%');
      expect(player.options.captionsColor).toBe('#FFFF00');
    });

    it('should handle keyboard shortcuts options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        keyboard: true,
        keyboardShortcuts: {
          'play-pause': ['Space'],
          'custom-action': ['x']
        }
      });
      
      expect(player.options.keyboard).toBe(true);
      expect(player.options.keyboardShortcuts['play-pause']).toEqual(['Space']);
      expect(player.options.keyboardShortcuts['custom-action']).toEqual(['x']);
    });

    it('should handle accessibility options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        audioDescription: true,
        audioDescriptionSrc: '/videos/ad.mp4',
        signLanguage: true,
        signLanguageSrc: '/videos/sign.mp4',
        signLanguagePosition: 'top-left'
      });
      
      expect(player.options.audioDescription).toBe(true);
      expect(player.options.audioDescriptionSrc).toBe('/videos/ad.mp4');
      expect(player.options.signLanguage).toBe(true);
      expect(player.options.signLanguageSrc).toBe('/videos/sign.mp4');
      expect(player.options.signLanguagePosition).toBe('top-left');
    });

    it('should handle callback options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const onReady = vi.fn();
      const onPlay = vi.fn();
      const onPause = vi.fn();

      const player = new Player(video, {
        onReady,
        onPlay,
        onPause
      });
      
      expect(player.options.onReady).toBe(onReady);
      expect(player.options.onPlay).toBe(onPlay);
      expect(player.options.onPause).toBe(onPause);
    });

    it('should handle language options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        language: 'de',
        languages: ['en', 'de', 'fr']
      });
      
      expect(player.options.language).toBe('de');
      expect(player.options.languages).toEqual(['en', 'de', 'fr']);
    });

    it('should handle advanced options', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video, {
        debug: true,
        classPrefix: 'custom-player',
        pauseOthersOnPlay: false
      });
      
      expect(player.options.debug).toBe(true);
      expect(player.options.classPrefix).toBe('custom-player');
      expect(player.options.pauseOthersOnPlay).toBe(false);
    });
  });

  describe('Initial State', () => {
    it('should initialize with default state values', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video);
      
      expect(player.state).toBeDefined();
    });

    it('should store original element reference', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const player = new Player(video);
      
      expect(player._originalElement).toBe(video);
    });
  });
});
