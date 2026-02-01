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
});
