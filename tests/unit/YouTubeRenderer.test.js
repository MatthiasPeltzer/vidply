/**
 * Unit Tests: YouTubeRenderer
 * Tests YouTube video ID extraction and initialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeRenderer } from '../../src/renderers/YouTubeRenderer.js';

function attachEmbedChromeMocks(mockPlayer, rendererType = 'youtube') {
  mockPlayer.options = mockPlayer.options ?? {};
  mockPlayer.options.embedChrome = mockPlayer.options.embedChrome ?? 'vidply';
  mockPlayer.usesProviderNativeChrome = vi.fn((type) => {
    return (mockPlayer.options.embedChrome ?? 'vidply') === 'provider' && type === rendererType;
  });
  mockPlayer.syncEmbedChromeClass = vi.fn((type) => {
    const provider = mockPlayer.usesProviderNativeChrome(type ?? rendererType);
    mockPlayer.container?.classList.toggle('vidply-external-controls', provider);
    mockPlayer.container?.classList.toggle('vidply-embed-chrome-vidply', !provider);
  });
  mockPlayer.captionManager = { refreshTracks: vi.fn() };
  mockPlayer._forceProviderEmbedChrome = false;
}

describe('YouTubeRenderer', () => {
  let renderer;
  let mockPlayer;

  beforeEach(() => {
    // Create mock player
    mockPlayer = {
      element: document.createElement('video'),
      currentSource: null,
      options: {
        classPrefix: 'vidply'
      }
    };
    document.body.appendChild(mockPlayer.element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('extractVideoId', () => {
    beforeEach(() => {
      renderer = new YouTubeRenderer(mockPlayer);
    });

    it('should extract video ID from youtube.com/watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/watch with extra params', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&list=PLtest';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be short URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be with params (excludes the query)', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?t=60';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be with a share (?si=) param', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?si=abcdEFGHij';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL with params (excludes the query)', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID when v is not the first query parameter', () => {
      const url = 'https://www.youtube.com/watch?list=PLtest&v=dQw4w9WgXcQ&t=10';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from a /shorts/ URL', () => {
      expect(renderer.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from a youtube-nocookie embed URL', () => {
      expect(renderer.extractVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should strip a #fragment from the video ID', () => {
      expect(renderer.extractVideoId('https://youtu.be/dQw4w9WgXcQ#t=1m')).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/video';
      expect(renderer.extractVideoId(url)).toBe(null);
    });

    it('should return null for empty URL', () => {
      expect(renderer.extractVideoId('')).toBe(null);
    });

    it('should handle URL without protocol', () => {
      const url = 'youtube.com/watch?v=dQw4w9WgXcQ';
      expect(renderer.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should handle various video ID formats', () => {
      // 11 character standard ID
      expect(renderer.extractVideoId('https://youtube.com/watch?v=abc123DEF45')).toBe('abc123DEF45');
      
      // With underscore and hyphen
      expect(renderer.extractVideoId('https://youtube.com/watch?v=a_b-c123456')).toBe('a_b-c123456');
    });
  });

  describe('initialization', () => {
    it('should initialize with player reference', () => {
      renderer = new YouTubeRenderer(mockPlayer);
      
      expect(renderer.player).toBe(mockPlayer);
      expect(renderer.youtube).toBe(null);
      expect(renderer.videoId).toBe(null);
      expect(renderer.isReady).toBe(false);
    });
  });

  describe('createIframe', () => {
    beforeEach(() => {
      mockPlayer.container = document.createElement('div');
      attachEmbedChromeMocks(mockPlayer);
      renderer = new YouTubeRenderer(mockPlayer);
      renderer.videoId = 'testVideoId';
    });

    it('should create iframe container', () => {
      renderer.createIframe();
      
      expect(renderer.iframe).toBeTruthy();
      expect(renderer.iframe.id).toContain('youtube-player-');
      expect(renderer.iframe.style.width).toBe('100%');
      expect(renderer.iframe.classList.contains('vidply-youtube-chromeless-host')).toBe(true);
      expect(renderer.iframe.classList.contains('vidply-youtube-chromeless-crop')).toBe(false);
      expect(renderer.iframe.classList.contains('vidply-youtube-chromeless-ready')).toBe(false);
      expect(renderer.iframe.querySelector('.vidply-youtube-crop')).toBeTruthy();
    });

    it('should hide original element', () => {
      renderer.createIframe();
      
      expect(mockPlayer.element.style.display).toBe('none');
    });

    it('should insert iframe before original element', () => {
      renderer.createIframe();
      
      const parent = mockPlayer.element.parentNode;
      const children = Array.from(parent.children);
      const iframeIndex = children.indexOf(renderer.iframe);
      const elementIndex = children.indexOf(mockPlayer.element);
      
      expect(iframeIndex).toBeLessThan(elementIndex);
    });

    it('keeps chromeless iframe out of tab order and marks host inert', () => {
      renderer.createIframe();
      const iframeEl = document.createElement('iframe');
      renderer.youtube = { getIframe: () => iframeEl };

      renderer.applyChromelessEmbedAccessibility();

      expect(renderer.iframe.getAttribute('inert')).toBe('');
      expect(iframeEl.getAttribute('tabindex')).toBe('-1');
      expect(iframeEl.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('init controls visibility', () => {
    beforeEach(() => {
      mockPlayer.container = document.createElement('div');
      mockPlayer.currentSource = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      attachEmbedChromeMocks(mockPlayer);
      renderer = new YouTubeRenderer(mockPlayer);
    });

    it('keeps VidPly chrome while the YouTube IFrame API loads (default embedChrome)', async () => {
      let resolveApi;
      renderer.loadYouTubeAPI = vi.fn(() => new Promise((resolve) => { resolveApi = resolve; }));
      renderer.initializePlayer = vi.fn().mockResolvedValue(undefined);

      const pending = renderer.init();

      expect(mockPlayer.container.classList.contains('vidply-external-controls')).toBe(false);
      expect(mockPlayer.container.classList.contains('vidply-embed-chrome-vidply')).toBe(true);
      resolveApi();
      await pending;
    });

    it('hides VidPly controls during load when embedChrome is provider', async () => {
      mockPlayer.options.embedChrome = 'provider';
      let resolveApi;
      renderer.loadYouTubeAPI = vi.fn(() => new Promise((resolve) => { resolveApi = resolve; }));
      renderer.initializePlayer = vi.fn().mockResolvedValue(undefined);

      const pending = renderer.init();

      expect(mockPlayer.container.classList.contains('vidply-external-controls')).toBe(true);
      resolveApi();
      await pending;
    });

    it('shows VidPly controls again when the IFrame API fails to load', async () => {
      renderer.loadYouTubeAPI = vi.fn().mockRejectedValue(new Error('blocked'));

      await expect(renderer.init()).rejects.toThrow('blocked');

      expect(mockPlayer.container.classList.contains('vidply-external-controls')).toBe(false);
    });
  });

  describe('YouTube captions are never shown', () => {
    beforeEach(() => {
      mockPlayer.container = document.createElement('div');
      mockPlayer.currentSource = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      renderer = new YouTubeRenderer(mockPlayer);
      renderer.youtube = {
        setOption: vi.fn(),
        unloadModule: vi.fn()
      };
    });

    afterEach(() => {
      delete window.YT;
    });

    it('does not offer YouTube caption tracks to the VidPly CC menu', () => {
      expect(renderer.getEmbedCaptionTracks).toBeUndefined();
      expect(renderer.setEmbedCaptionTrack).toBeUndefined();
    });

    it.each(['vidply', 'provider'])('switches YouTube captions off with %s chrome', (embedChrome) => {
      attachEmbedChromeMocks(mockPlayer, 'youtube');
      mockPlayer.options.embedChrome = embedChrome;
      renderer.disableInFrameCaptions();
      expect(renderer.youtube.setOption).toHaveBeenCalledWith('captions', 'track', {});
      expect(renderer.youtube.unloadModule).toHaveBeenCalledWith('captions');
    });

    it.each(['vidply', 'provider'])('requests cc_load_policy 0 with %s chrome', (embedChrome) => {
      attachEmbedChromeMocks(mockPlayer, 'youtube');
      mockPlayer.options.embedChrome = embedChrome;
      window.YT = { Player: vi.fn() };
      renderer.videoId = 'dQw4w9WgXcQ';
      renderer.iframe = document.createElement('div');
      renderer.iframe.id = 'youtube-player-test';

      void renderer.initializePlayer();

      const config = window.YT.Player.mock.calls[0][1];
      expect(config.playerVars.cc_load_policy).toBe(0);
    });
  });
});
