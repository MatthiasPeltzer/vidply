/**
 * Unit Tests: KeyboardManager
 * Tests keyboard accessibility and shortcuts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardManager } from '../../src/controls/KeyboardManager.js';

describe('KeyboardManager', () => {
  let manager;
  let mockPlayer;
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    
    container = document.createElement('div');
    document.body.appendChild(container);

    mockPlayer = {
      container,
      options: {
        keyboardShortcuts: {
          'play-pause': ['Space', 'k'],
          'volume-up': ['ArrowUp'],
          'volume-down': ['ArrowDown'],
          'seek-forward': ['ArrowRight', 'l'],
          'seek-backward': ['ArrowLeft', 'j'],
          'mute': ['m'],
          'fullscreen': ['f'],
          'captions': ['c'],
          'speed-up': ['>'],
          'speed-down': ['<']
        },
        debug: false,
        screenReaderAnnouncements: true,
        classPrefix: 'vidply'
      },
      state: {
        volume: 0.5,
        playing: false,
        muted: false,
        fullscreen: false,
        captionsEnabled: false,
        playbackSpeed: 1
      },
      toggle: vi.fn(),
      setVolume: vi.fn(),
      seekForward: vi.fn(),
      seekBackward: vi.fn(),
      toggleMute: vi.fn(),
      toggleFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      toggleCaptions: vi.fn(),
      setPlaybackSpeed: vi.fn(),
      captionManager: null,
      controlBar: null,
      transcriptManager: null,
      signLanguageManager: null
    };

    manager = new KeyboardManager(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      expect(manager.player).toBe(mockPlayer);
    });

    it('should store shortcuts from player options', () => {
      expect(manager.shortcuts).toBe(mockPlayer.options.keyboardShortcuts);
    });

    it('should call init on construction', () => {
      expect(container.hasAttribute('tabindex')).toBe(true);
    });
  });

  describe('attachEvents', () => {
    it('should make container focusable', () => {
      expect(container.getAttribute('tabindex')).toBe('0');
    });

    it('should not override existing tabindex', () => {
      const newContainer = document.createElement('div');
      newContainer.setAttribute('tabindex', '5');
      document.body.appendChild(newContainer);

      const newPlayer = { ...mockPlayer, container: newContainer };
      new KeyboardManager(newPlayer);

      expect(newContainer.getAttribute('tabindex')).toBe('5');
    });
  });

  describe('handleKeydown', () => {
    it('should ignore events from input elements', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true });
      Object.defineProperty(event, 'target', { value: input });
      
      manager.handleKeydown(event);

      expect(mockPlayer.toggle).not.toHaveBeenCalled();
    });

    it('should ignore events from textarea elements', () => {
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);

      const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true });
      Object.defineProperty(event, 'target', { value: textarea });
      
      manager.handleKeydown(event);

      expect(mockPlayer.toggle).not.toHaveBeenCalled();
    });

    it('should ignore events from select elements', () => {
      const select = document.createElement('select');
      container.appendChild(select);

      const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true });
      Object.defineProperty(event, 'target', { value: select });
      
      manager.handleKeydown(event);

      expect(mockPlayer.toggle).not.toHaveBeenCalled();
    });

    it('should ignore events when focus is in a menu', () => {
      const menu = document.createElement('div');
      menu.className = 'vidply-menu';
      const button = document.createElement('button');
      menu.appendChild(button);
      container.appendChild(menu);
      button.focus();

      const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true });
      Object.defineProperty(event, 'target', { value: button });
      
      manager.handleKeydown(event);

      expect(mockPlayer.toggle).not.toHaveBeenCalled();
    });

    it('should ignore events when focus is on playlist button', () => {
      const playlistButton = document.createElement('button');
      playlistButton.className = 'vidply-playlist-item-button';
      container.appendChild(playlistButton);
      playlistButton.focus();

      const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true });
      Object.defineProperty(event, 'target', { value: playlistButton });
      
      manager.handleKeydown(event);

      expect(mockPlayer.toggle).not.toHaveBeenCalled();
    });

    it('should handle Escape key to exit fullscreen', () => {
      mockPlayer.state.fullscreen = true;
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      Object.defineProperty(event, 'target', { value: container });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      manager.handleKeydown(event);

      expect(mockPlayer.exitFullscreen).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not exit fullscreen on Escape if not in fullscreen', () => {
      mockPlayer.state.fullscreen = false;
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      Object.defineProperty(event, 'target', { value: container });
      
      manager.handleKeydown(event);

      expect(mockPlayer.exitFullscreen).not.toHaveBeenCalled();
    });
  });

  describe('executeAction', () => {
    it('should toggle play/pause on play-pause action', () => {
      const result = manager.executeAction('play-pause');
      
      expect(mockPlayer.toggle).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should increase volume on volume-up action', () => {
      mockPlayer.state.volume = 0.5;
      
      const result = manager.executeAction('volume-up');
      
      expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.6);
      expect(result).toBe(true);
    });

    it('should not exceed max volume of 1', () => {
      mockPlayer.state.volume = 0.95;
      
      manager.executeAction('volume-up');
      
      expect(mockPlayer.setVolume).toHaveBeenCalledWith(1);
    });

    it('should decrease volume on volume-down action', () => {
      mockPlayer.state.volume = 0.5;
      
      const result = manager.executeAction('volume-down');
      
      expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.4);
      expect(result).toBe(true);
    });

    it('should not go below min volume of 0', () => {
      mockPlayer.state.volume = 0.05;
      
      manager.executeAction('volume-down');
      
      expect(mockPlayer.setVolume).toHaveBeenCalledWith(0);
    });

    it('should seek forward on seek-forward action', () => {
      const result = manager.executeAction('seek-forward');
      
      expect(mockPlayer.seekForward).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should seek backward on seek-backward action', () => {
      const result = manager.executeAction('seek-backward');
      
      expect(mockPlayer.seekBackward).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should toggle mute on mute action', () => {
      const result = manager.executeAction('mute');
      
      expect(mockPlayer.toggleMute).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should toggle fullscreen on fullscreen action', () => {
      const result = manager.executeAction('fullscreen');
      
      expect(mockPlayer.toggleFullscreen).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should toggle captions on captions action', () => {
      const result = manager.executeAction('captions');
      
      expect(mockPlayer.toggleCaptions).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should show captions menu when multiple tracks exist', () => {
      mockPlayer.captionManager = {
        tracks: [{ index: 0 }, { index: 1 }]
      };
      mockPlayer.controlBar = {
        controls: { captions: document.createElement('button') },
        showCaptionsMenu: vi.fn()
      };
      
      manager.executeAction('captions');
      
      expect(mockPlayer.controlBar.showCaptionsMenu).toHaveBeenCalled();
    });

    it('should increase playback speed on speed-up action', () => {
      mockPlayer.state.playbackSpeed = 1;
      
      const result = manager.executeAction('speed-up');
      
      expect(mockPlayer.setPlaybackSpeed).toHaveBeenCalledWith(1.25);
      expect(result).toBe(true);
    });

    it('should not exceed max speed of 2', () => {
      mockPlayer.state.playbackSpeed = 1.9;
      
      manager.executeAction('speed-up');
      
      expect(mockPlayer.setPlaybackSpeed).toHaveBeenCalledWith(2);
    });

    it('should decrease playback speed on speed-down action', () => {
      mockPlayer.state.playbackSpeed = 1;
      
      const result = manager.executeAction('speed-down');
      
      expect(mockPlayer.setPlaybackSpeed).toHaveBeenCalledWith(0.75);
      expect(result).toBe(true);
    });

    it('should not go below min speed of 0.25', () => {
      mockPlayer.state.playbackSpeed = 0.3;
      
      manager.executeAction('speed-down');
      
      expect(mockPlayer.setPlaybackSpeed).toHaveBeenCalledWith(0.25);
    });

    it('should toggle transcript on transcript-toggle action', () => {
      mockPlayer.transcriptManager = {
        toggleTranscript: vi.fn()
      };
      
      const result = manager.executeAction('transcript-toggle');
      
      expect(mockPlayer.transcriptManager.toggleTranscript).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for transcript-toggle when no transcript manager', () => {
      mockPlayer.transcriptManager = null;
      
      const result = manager.executeAction('transcript-toggle');
      
      expect(result).toBe(false);
    });

    it('should return false for unknown action', () => {
      const result = manager.executeAction('unknown-action');
      
      expect(result).toBe(false);
    });

    it('should show speed menu on speed-menu action', () => {
      mockPlayer.controlBar = {
        controls: { speed: document.createElement('button') },
        showSpeedMenu: vi.fn()
      };
      
      const result = manager.executeAction('speed-menu');
      
      expect(mockPlayer.controlBar.showSpeedMenu).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should show quality menu on quality-menu action', () => {
      mockPlayer.controlBar = {
        controls: { quality: document.createElement('button') },
        showQualityMenu: vi.fn()
      };
      
      const result = manager.executeAction('quality-menu');
      
      expect(mockPlayer.controlBar.showQualityMenu).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should show chapters menu on chapters-menu action', () => {
      mockPlayer.controlBar = {
        controls: { chapters: document.createElement('button') },
        showChaptersMenu: vi.fn()
      };
      
      const result = manager.executeAction('chapters-menu');
      
      expect(mockPlayer.controlBar.showChaptersMenu).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('announceAction', () => {
    it('should not announce if screenReaderAnnouncements is disabled', () => {
      mockPlayer.options.screenReaderAnnouncements = false;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('play-pause');
      
      expect(announceSpy).not.toHaveBeenCalled();
    });

    it('should announce play/pause state', () => {
      mockPlayer.state.playing = true;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('play-pause');
      
      expect(announceSpy).toHaveBeenCalledWith('Playing');
    });

    it('should announce paused state', () => {
      mockPlayer.state.playing = false;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('play-pause');
      
      expect(announceSpy).toHaveBeenCalledWith('Paused');
    });

    it('should announce volume level', () => {
      mockPlayer.state.volume = 0.75;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('volume-up');
      
      expect(announceSpy).toHaveBeenCalledWith('Volume 75%');
    });

    it('should announce muted state', () => {
      mockPlayer.state.muted = true;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('mute');
      
      expect(announceSpy).toHaveBeenCalledWith('Muted');
    });

    it('should announce unmuted state', () => {
      mockPlayer.state.muted = false;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('mute');
      
      expect(announceSpy).toHaveBeenCalledWith('Unmuted');
    });

    it('should announce fullscreen state', () => {
      mockPlayer.state.fullscreen = true;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('fullscreen');
      
      expect(announceSpy).toHaveBeenCalledWith('Fullscreen');
    });

    it('should announce exit fullscreen state', () => {
      mockPlayer.state.fullscreen = false;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('fullscreen');
      
      expect(announceSpy).toHaveBeenCalledWith('Exit fullscreen');
    });

    it('should announce captions on', () => {
      mockPlayer.state.captionsEnabled = true;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('captions');
      
      expect(announceSpy).toHaveBeenCalledWith('Captions on');
    });

    it('should announce captions off', () => {
      mockPlayer.state.captionsEnabled = false;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('captions');
      
      expect(announceSpy).toHaveBeenCalledWith('Captions off');
    });

    it('should announce speed', () => {
      mockPlayer.state.playbackSpeed = 1.5;
      const announceSpy = vi.spyOn(manager, 'announce');
      
      manager.announceAction('speed-up');
      
      expect(announceSpy).toHaveBeenCalledWith('Speed 1.5x');
    });
  });

  describe('announce', () => {
    it('should create announcer element if not exists', () => {
      manager.announce('Test message');
      vi.advanceTimersByTime(200);
      
      const announcer = document.getElementById('vidply-announcer');
      expect(announcer).not.toBeNull();
    });

    it('should set aria-live attribute', () => {
      manager.announce('Test message');
      vi.advanceTimersByTime(200);
      
      const announcer = document.getElementById('vidply-announcer');
      expect(announcer.getAttribute('aria-live')).toBe('polite');
    });

    it('should set aria-atomic attribute', () => {
      manager.announce('Test message');
      vi.advanceTimersByTime(200);
      
      const announcer = document.getElementById('vidply-announcer');
      expect(announcer.getAttribute('aria-atomic')).toBe('true');
    });

    it('should set message after delay', () => {
      manager.announce('Test message');
      
      const announcer = document.getElementById('vidply-announcer');
      expect(announcer.textContent).toBe('');
      
      vi.advanceTimersByTime(200);
      expect(announcer.textContent).toBe('Test message');
    });

    it('should reuse existing announcer element', () => {
      manager.announce('First message');
      vi.advanceTimersByTime(200);
      
      manager.announce('Second message');
      vi.advanceTimersByTime(200);
      
      const announcers = document.querySelectorAll('#vidply-announcer');
      expect(announcers.length).toBe(1);
    });
  });

  describe('updateShortcut', () => {
    it('should update shortcut for action', () => {
      manager.updateShortcut('play-pause', ['p', 'Space']);
      
      expect(manager.shortcuts['play-pause']).toEqual(['p', 'Space']);
    });

    it('should not update if keys is not an array', () => {
      const originalKeys = manager.shortcuts['play-pause'];
      
      manager.updateShortcut('play-pause', 'p');
      
      expect(manager.shortcuts['play-pause']).toEqual(originalKeys);
    });
  });

  describe('destroy', () => {
    it('should not throw when called', () => {
      expect(() => manager.destroy()).not.toThrow();
    });
  });

  describe('keyboard event integration', () => {
    it('should handle Space key for play-pause', () => {
      const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.toggle).toHaveBeenCalled();
    });

    it('should handle k key for play-pause', () => {
      const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.toggle).toHaveBeenCalled();
    });

    it('should handle ArrowUp for volume up', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.setVolume).toHaveBeenCalled();
    });

    it('should handle ArrowDown for volume down', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.setVolume).toHaveBeenCalled();
    });

    it('should handle ArrowRight for seek forward', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.seekForward).toHaveBeenCalled();
    });

    it('should handle ArrowLeft for seek backward', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.seekBackward).toHaveBeenCalled();
    });

    it('should handle m key for mute', () => {
      const event = new KeyboardEvent('keydown', { key: 'm', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.toggleMute).toHaveBeenCalled();
    });

    it('should handle f key for fullscreen', () => {
      const event = new KeyboardEvent('keydown', { key: 'f', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.toggleFullscreen).toHaveBeenCalled();
    });

    it('should handle c key for captions', () => {
      const event = new KeyboardEvent('keydown', { key: 'c', bubbles: true });
      container.dispatchEvent(event);
      
      expect(mockPlayer.toggleCaptions).toHaveBeenCalled();
    });
  });
});
