/**
 * Unit Tests: AudioDescriptionManager
 * Tests audio description functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioDescriptionManager } from '../../src/core/AudioDescriptionManager.js';

describe('AudioDescriptionManager', () => {
  let manager;
  let mockPlayer;

  beforeEach(() => {
    // Create mock player
    mockPlayer = {
      options: {
        audioDescriptionSrc: null,
        classPrefix: 'vidply'
      },
      element: document.createElement('video'),
      sourceElements: [],
      originalSrc: null,
      log: vi.fn(),
      state: {}
    };
    
    document.body.appendChild(mockPlayer.element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      
      expect(manager.player).toBe(mockPlayer);
      expect(manager.enabled).toBe(false);
      expect(manager.desiredState).toBe(false);
      expect(manager.src).toBe(null);
      expect(manager.captionTracks).toEqual([]);
    });

    it('should use audioDescriptionSrc from options', () => {
      mockPlayer.options.audioDescriptionSrc = '/videos/ad-version.mp4';
      manager = new AudioDescriptionManager(mockPlayer);
      
      expect(manager.src).toBe('/videos/ad-version.mp4');
    });
  });

  describe('isAvailable', () => {
    it('should return false when no audio description source', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      
      expect(manager.isAvailable()).toBe(false);
    });

    it('should return true when src is provided', () => {
      mockPlayer.options.audioDescriptionSrc = '/videos/ad-version.mp4';
      manager = new AudioDescriptionManager(mockPlayer);
      
      expect(manager.isAvailable()).toBe(true);
    });

    it('should return true when source elements have data-desc-src', () => {
      const sourceEl = document.createElement('source');
      sourceEl.setAttribute('data-desc-src', '/videos/ad-version.mp4');
      mockPlayer.sourceElements = [sourceEl];
      
      manager = new AudioDescriptionManager(mockPlayer);
      
      expect(manager.isAvailable()).toBe(true);
    });

    it('should return true when caption tracks exist', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      manager.captionTracks = [{ describedSrc: '/captions/ad.vtt' }];
      
      expect(manager.isAvailable()).toBe(true);
    });
  });

  describe('initFromSourceElements', () => {
    it('should extract audio description src from source elements', () => {
      const sourceEl = document.createElement('source');
      sourceEl.setAttribute('src', '/videos/normal.mp4');
      sourceEl.setAttribute('data-desc-src', '/videos/ad-version.mp4');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([sourceEl], []);
      
      expect(manager.src).toBe('/videos/ad-version.mp4');
      expect(manager.originalSource).toBe('/videos/normal.mp4');
    });

    it('should extract original src from data-orig-src attribute', () => {
      const sourceEl = document.createElement('source');
      sourceEl.setAttribute('src', '/videos/ad-version.mp4');
      sourceEl.setAttribute('data-orig-src', '/videos/normal.mp4');
      sourceEl.setAttribute('data-desc-src', '/videos/ad-version.mp4');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([sourceEl], []);
      
      expect(manager.originalSource).toBe('/videos/normal.mp4');
    });

    it('should extract caption tracks with audio description versions', () => {
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'captions');
      trackEl.setAttribute('src', '/captions/normal.vtt');
      trackEl.setAttribute('data-desc-src', '/captions/ad.vtt');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], [trackEl]);
      
      expect(manager.captionTracks.length).toBe(1);
      expect(manager.captionTracks[0].originalSrc).toBe('/captions/normal.vtt');
      expect(manager.captionTracks[0].describedSrc).toBe('/captions/ad.vtt');
    });

    it('should handle subtitles tracks', () => {
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'subtitles');
      trackEl.setAttribute('src', '/subtitles/en.vtt');
      trackEl.setAttribute('data-desc-src', '/subtitles/en-ad.vtt');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], [trackEl]);
      
      expect(manager.captionTracks.length).toBe(1);
    });

    it('should handle chapters tracks', () => {
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'chapters');
      trackEl.setAttribute('src', '/chapters/normal.vtt');
      trackEl.setAttribute('data-desc-src', '/chapters/ad.vtt');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], [trackEl]);
      
      expect(manager.captionTracks.length).toBe(1);
    });

    it('should handle multiple source elements', () => {
      const sourceEl1 = document.createElement('source');
      sourceEl1.setAttribute('src', '/videos/normal-720.mp4');
      sourceEl1.setAttribute('data-desc-src', '/videos/ad-720.mp4');
      
      const sourceEl2 = document.createElement('source');
      sourceEl2.setAttribute('src', '/videos/normal-480.mp4');
      // No data-desc-src on second source
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([sourceEl1, sourceEl2], []);
      
      // Should use first source element with desc-src
      expect(manager.sourceElement).toBe(sourceEl1);
      expect(manager.src).toBe('/videos/ad-720.mp4');
    });

    it('should log found caption tracks', () => {
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'captions');
      trackEl.setAttribute('src', '/captions/en.vtt');
      trackEl.setAttribute('data-desc-src', '/captions/en-ad.vtt');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], [trackEl]);
      
      expect(mockPlayer.log).toHaveBeenCalled();
    });

    it('should ignore tracks without data-desc-src', () => {
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'captions');
      trackEl.setAttribute('src', '/captions/en.vtt');
      // No data-desc-src
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], [trackEl]);
      
      expect(manager.captionTracks.length).toBe(0);
    });

    it('should set player.originalSrc', () => {
      const sourceEl = document.createElement('source');
      sourceEl.setAttribute('src', '/videos/normal.mp4');
      sourceEl.setAttribute('data-desc-src', '/videos/ad.mp4');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([sourceEl], []);
      
      expect(mockPlayer.originalSrc).toBe('/videos/normal.mp4');
    });
  });

  describe('state management', () => {
    it('should track enabled state', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      
      expect(manager.enabled).toBe(false);
      
      manager.enabled = true;
      expect(manager.enabled).toBe(true);
    });

    it('should track desired state separately', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      
      // User wants AD but it's not yet enabled
      manager.desiredState = true;
      manager.enabled = false;
      
      expect(manager.desiredState).toBe(true);
      expect(manager.enabled).toBe(false);
    });
  });

  describe('enable', () => {
    it('should warn when no audio description source available', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager = new AudioDescriptionManager(mockPlayer);
      
      await manager.enable();
      
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No audio description source'));
      warnSpy.mockRestore();
    });

    it('should set desiredState to true', async () => {
      mockPlayer.options.audioDescriptionSrc = '/videos/ad-version.mp4';
      mockPlayer.state = {
        currentTime: 0,
        playing: false
      };
      manager = new AudioDescriptionManager(mockPlayer);
      
      // Mock the internal methods to avoid full implementation
      manager._enableWithDirectSrc = vi.fn().mockResolvedValue();
      
      await manager.enable();
      
      expect(manager.desiredState).toBe(true);
    });

    it('should store current playback state before switching', async () => {
      mockPlayer.options.audioDescriptionSrc = '/videos/ad-version.mp4';
      mockPlayer.state = {
        currentTime: 30,
        playing: true
      };
      manager = new AudioDescriptionManager(mockPlayer);
      manager._enableWithDirectSrc = vi.fn().mockResolvedValue();
      
      await manager.enable();
      
      // The method should capture currentTime and wasPlaying
      expect(manager._enableWithDirectSrc).toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('should return early when no original source', async () => {
      manager = new AudioDescriptionManager(mockPlayer);
      mockPlayer.originalSrc = null;
      
      await manager.disable();
      
      // Should exit without error
      expect(manager.desiredState).toBe(false);
    });

    it('should set desiredState to false', async () => {
      manager = new AudioDescriptionManager(mockPlayer);
      mockPlayer.originalSrc = '/videos/original.mp4';
      mockPlayer.state = {
        currentTime: 0,
        playing: false
      };
      manager._disableWithDirectSrc = vi.fn().mockResolvedValue();
      
      await manager.disable();
      
      expect(manager.desiredState).toBe(false);
    });
  });

  describe('toggle', () => {
    beforeEach(() => {
      mockPlayer.findTextTrack = vi.fn().mockReturnValue(null);
      mockPlayer.state = {
        currentTime: 0,
        playing: false
      };
    });

    it('should enable when currently disabled and has src', async () => {
      mockPlayer.options.audioDescriptionSrc = '/videos/ad.mp4';
      manager = new AudioDescriptionManager(mockPlayer);
      manager.enabled = false;
      manager._enableWithDirectSrc = vi.fn().mockResolvedValue();
      
      await manager.toggle();
      
      expect(manager.desiredState).toBe(true);
    });

    it('should disable when currently enabled and has src', async () => {
      mockPlayer.options.audioDescriptionSrc = '/videos/ad.mp4';
      mockPlayer.originalSrc = '/videos/original.mp4';
      manager = new AudioDescriptionManager(mockPlayer);
      manager.enabled = true;
      manager._disableWithDirectSrc = vi.fn().mockResolvedValue();
      
      await manager.toggle();
      
      expect(manager.desiredState).toBe(false);
    });

    it('should toggle description track when track exists but no src', async () => {
      const mockTrack = { mode: 'hidden' };
      mockPlayer.findTextTrack = vi.fn().mockReturnValue(mockTrack);
      mockPlayer.emit = vi.fn();
      manager = new AudioDescriptionManager(mockPlayer);
      
      await manager.toggle();
      
      expect(mockTrack.mode).toBe('showing');
      expect(manager.enabled).toBe(true);
    });

    it('should disable description track when already showing', async () => {
      const mockTrack = { mode: 'showing' };
      mockPlayer.findTextTrack = vi.fn().mockReturnValue(mockTrack);
      mockPlayer.emit = vi.fn();
      manager = new AudioDescriptionManager(mockPlayer);
      
      await manager.toggle();
      
      expect(mockTrack.mode).toBe('hidden');
      expect(manager.enabled).toBe(false);
    });
  });

  describe('_getCurrentCaptionText', () => {
    it('should return null when no caption manager', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      mockPlayer.captionManager = null;
      
      const result = manager._getCurrentCaptionText();
      
      expect(result).toBeNull();
    });

    it('should return null when no current track', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      mockPlayer.captionManager = { currentTrack: null };
      
      const result = manager._getCurrentCaptionText();
      
      expect(result).toBeNull();
    });

    it('should return null when no current cue', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      mockPlayer.captionManager = { 
        currentTrack: {}, 
        currentCue: null 
      };
      
      const result = manager._getCurrentCaptionText();
      
      expect(result).toBeNull();
    });

    it('should return cue text when available', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      mockPlayer.captionManager = { 
        currentTrack: {}, 
        currentCue: { text: 'Hello world' }
      };
      
      const result = manager._getCurrentCaptionText();
      
      expect(result).toBe('Hello world');
    });
  });

  describe('_validateTrackExists', () => {
    beforeEach(() => {
      manager = new AudioDescriptionManager(mockPlayer);
    });

    it('should return true for successful HEAD request', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const result = await manager._validateTrackExists('/test.vtt');
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/test.vtt', { method: 'HEAD' });
    });

    it('should return false for failed HEAD request', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      
      const result = await manager._validateTrackExists('/nonexistent.vtt');
      
      expect(result).toBe(false);
    });

    it('should return false on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await manager._validateTrackExists('/error.vtt');
      
      expect(result).toBe(false);
    });
  });

  describe('_swapCaptionTracks', () => {
    beforeEach(() => {
      manager = new AudioDescriptionManager(mockPlayer);
    });

    it('should return empty array when no caption tracks', async () => {
      manager.captionTracks = [];
      
      const result = await manager._swapCaptionTracks(true);
      
      expect(result).toEqual([]);
    });

    it('should validate track URLs before swapping', async () => {
      // This test just checks the method exists and basic behavior
      manager.captionTracks = [{
        trackElement: null, // No element
        originalSrc: '/captions/normal.vtt',
        describedSrc: '/captions/ad.vtt',
        explicit: true
      }];
      
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      
      const result = await manager._swapCaptionTracks(true);
      
      // Should return empty since validation fails
      expect(result).toEqual([]);
    });
  });

  describe('source element handling', () => {
    it('should handle empty source elements array', () => {
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], []);
      
      expect(manager.sourceElement).toBeNull();
    });

    it('should handle source elements without desc-src', () => {
      const sourceEl = document.createElement('source');
      sourceEl.setAttribute('src', '/videos/normal.mp4');
      // No data-desc-src
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([sourceEl], []);
      
      expect(manager.src).toBeNull();
    });
  });

  describe('track element handling', () => {
    it('should handle metadata tracks', () => {
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'metadata');
      trackEl.setAttribute('src', '/metadata.vtt');
      trackEl.setAttribute('data-desc-src', '/metadata-ad.vtt');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], [trackEl]);
      
      // Metadata tracks should not be in captionTracks
      expect(manager.captionTracks.length).toBe(0);
    });

    it('should handle descriptions track kind', () => {
      const trackEl = document.createElement('track');
      trackEl.setAttribute('kind', 'descriptions');
      trackEl.setAttribute('src', '/descriptions.vtt');
      trackEl.setAttribute('data-desc-src', '/descriptions-ad.vtt');
      
      manager = new AudioDescriptionManager(mockPlayer);
      manager.initFromSourceElements([], [trackEl]);
      
      expect(manager.captionTracks.length).toBe(1);
    });
  });
});
