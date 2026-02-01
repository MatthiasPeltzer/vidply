/**
 * Unit Tests: VideoFrameCapture
 * Tests video frame capture utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { captureVideoFrame } from '../../src/utils/VideoFrameCapture.js';

describe('VideoFrameCapture', () => {
  let mockVideo;
  let mockCanvas;
  let mockContext;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();

    // Create mock video element
    mockVideo = document.createElement('video');
    Object.defineProperty(mockVideo, 'videoWidth', { value: 1920, configurable: true });
    Object.defineProperty(mockVideo, 'videoHeight', { value: 1080, configurable: true });
    Object.defineProperty(mockVideo, 'readyState', { value: 2, configurable: true });
    Object.defineProperty(mockVideo, 'paused', { value: true, configurable: true });
    Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
    Object.defineProperty(mockVideo, 'muted', { value: false, writable: true, configurable: true });

    document.body.appendChild(mockVideo);

    // Mock canvas context
    mockContext = {
      drawImage: vi.fn()
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,test')
    };

    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return mockCanvas;
      }
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('captureVideoFrame', () => {
    it('should return null for null video', async () => {
      const result = await captureVideoFrame(null, 0);
      expect(result).toBeNull();
    });

    it('should return null for non-video element', async () => {
      const div = document.createElement('div');
      const result = await captureVideoFrame(div, 0);
      expect(result).toBeNull();
    });

    it('should capture frame at specified time', async () => {
      // Set video to correct position
      Object.defineProperty(mockVideo, 'currentTime', { value: 10, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 10);
      
      // Advance through the RAF calls
      vi.advanceTimersByTime(100);
      
      const result = await promise;
      expect(result).toBe('data:image/jpeg;base64,test');
    });

    it('should use video dimensions', async () => {
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 0);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockCanvas.width).toBe(1920);
      expect(mockCanvas.height).toBe(1080);
    });

    it('should scale down when maxWidth specified', async () => {
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 0, { maxWidth: 960 });
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockCanvas.width).toBe(960);
      expect(mockCanvas.height).toBe(540); // Maintains aspect ratio
    });

    it('should scale down when maxHeight specified', async () => {
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 0, { maxHeight: 540 });
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockCanvas.height).toBe(540);
      expect(mockCanvas.width).toBe(960); // Maintains aspect ratio
    });

    it('should use default quality of 0.9', async () => {
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 0);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
    });

    it('should use custom quality when specified', async () => {
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 0, { quality: 0.5 });
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.5);
    });

    it('should mute video during capture when restoreState is true', async () => {
      // Track if muted was set to true during capture
      let mutedDuringCapture = false;
      let mutedValue = false;
      Object.defineProperty(mockVideo, 'muted', { 
        get: () => mutedValue,
        set: (val) => { 
          mutedValue = val;
          if (val === true) mutedDuringCapture = true;
        },
        configurable: true 
      });
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 0, { restoreState: true });
      vi.advanceTimersByTime(100);
      await promise;

      expect(mutedDuringCapture).toBe(true);
    });

    it('should use default dimensions when videoWidth/Height are 0', async () => {
      Object.defineProperty(mockVideo, 'videoWidth', { value: 0, configurable: true });
      Object.defineProperty(mockVideo, 'videoHeight', { value: 0, configurable: true });
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });
      
      const promise = captureVideoFrame(mockVideo, 0);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockCanvas.width).toBe(640);
      expect(mockCanvas.height).toBe(360);
    });

    it('should seek to specified time when not at that position', async () => {
      Object.defineProperty(mockVideo, 'currentTime', { 
        get: () => 0,
        set: vi.fn(),
        configurable: true 
      });
      Object.defineProperty(mockVideo, 'readyState', { value: 1, writable: true });

      const promise = captureVideoFrame(mockVideo, 30);
      
      // Trigger the seeked event
      mockVideo.dispatchEvent(new Event('seeked'));
      vi.advanceTimersByTime(100);
      
      await promise;
    });

    it('should wait for loadedmetadata when video not ready', async () => {
      Object.defineProperty(mockVideo, 'readyState', { value: 0, writable: true });
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true, configurable: true });

      const promise = captureVideoFrame(mockVideo, 30);
      
      // Trigger loadedmetadata
      Object.defineProperty(mockVideo, 'readyState', { value: 1, writable: true });
      mockVideo.dispatchEvent(new Event('loadedmetadata'));
      
      // Trigger seeked
      mockVideo.dispatchEvent(new Event('seeked'));
      vi.advanceTimersByTime(100);
      
      await promise;
    });
  });
});
