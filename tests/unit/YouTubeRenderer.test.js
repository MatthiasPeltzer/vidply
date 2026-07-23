/**
 * Unit Tests: YouTubeRenderer
 * Tests YouTube video ID extraction and initialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeRenderer } from '../../src/renderers/YouTubeRenderer.js';

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
      renderer = new YouTubeRenderer(mockPlayer);
      renderer.videoId = 'testVideoId';
    });

    it('should create iframe container', () => {
      renderer.createIframe();
      
      expect(renderer.iframe).toBeTruthy();
      expect(renderer.iframe.id).toContain('youtube-player-');
      expect(renderer.iframe.style.width).toBe('100%');
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
  });
});
