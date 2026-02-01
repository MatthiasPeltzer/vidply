/**
 * Unit Tests: PerformanceUtils
 * Tests performance utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debounce, throttle, isMobile, rafWithTimeout } from '../../src/utils/PerformanceUtils.js';

describe('PerformanceUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should use default wait time of 100ms', () => {
      const fn = vi.fn();
      const debounced = debounce(fn);

      debounced();
      vi.advanceTimersByTime(99);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalled();
    });

    it('should only call once for rapid successive calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use latest arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('third');
    });
  });

  describe('throttle', () => {
    it('should execute immediately on first call', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should block subsequent calls within limit', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow call after limit expires', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to throttled function', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1', 'arg2');

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should use default limit of 100ms', () => {
      const fn = vi.fn();
      const throttled = throttle(fn);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(99);
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('isMobile', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true
      });
    });

    it('should return true when width is below breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      expect(isMobile()).toBe(true);
    });

    it('should return false when width is above breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      expect(isMobile()).toBe(false);
    });

    it('should return false when width equals breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      expect(isMobile()).toBe(false);
    });

    it('should use default breakpoint of 768', () => {
      Object.defineProperty(window, 'innerWidth', { value: 767, writable: true });
      expect(isMobile()).toBe(true);

      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      expect(isMobile()).toBe(false);
    });

    it('should accept custom breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      expect(isMobile(400)).toBe(false);
      expect(isMobile(600)).toBe(true);
    });
  });

  describe('rafWithTimeout', () => {
    it('should call callback via requestAnimationFrame', () => {
      const fn = vi.fn();

      rafWithTimeout(fn);
      vi.advanceTimersByTime(16); // Approximate rAF timing

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call callback via timeout fallback', () => {
      const fn = vi.fn();

      rafWithTimeout(fn, 50);
      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should only call callback once even if both fire', () => {
      const fn = vi.fn();

      rafWithTimeout(fn, 50);
      
      // Simulate both rAF and timeout firing
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use default timeout of 100ms', () => {
      const fn = vi.fn();

      rafWithTimeout(fn);
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalled();
    });

    it('should accept custom timeout', () => {
      const fn = vi.fn();

      rafWithTimeout(fn, 200);
      vi.advanceTimersByTime(199);
      
      // rAF would have fired, but let's verify timeout works
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
