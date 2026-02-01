/**
 * Unit Tests: FocusUtils
 * Tests focus management utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { focusElement, focusFirstElement } from '../../src/utils/FocusUtils.js';

describe('FocusUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  describe('focusElement', () => {
    it('should focus an element', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      const focusSpy = vi.spyOn(button, 'focus');

      focusElement(button);
      
      // Advance through requestAnimationFrame and setTimeout
      vi.advanceTimersByTime(100);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should handle null element gracefully', () => {
      expect(() => focusElement(null)).not.toThrow();
    });

    it('should handle undefined element gracefully', () => {
      expect(() => focusElement(undefined)).not.toThrow();
    });

    it('should use preventScroll by default', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      const focusSpy = vi.spyOn(button, 'focus');

      focusElement(button);
      vi.advanceTimersByTime(100);

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should allow custom preventScroll option', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      const focusSpy = vi.spyOn(button, 'focus');

      focusElement(button, { preventScroll: false });
      vi.advanceTimersByTime(100);

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: false });
    });

    it('should respect delay option', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      const focusSpy = vi.spyOn(button, 'focus');

      focusElement(button, { delay: 500 });
      
      // Advance past rAF but not delay
      vi.advanceTimersByTime(100);
      expect(focusSpy).not.toHaveBeenCalled();

      // Now advance past the delay
      vi.advanceTimersByTime(500);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should not focus element if removed from DOM', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      const focusSpy = vi.spyOn(button, 'focus');

      focusElement(button, { delay: 100 });
      
      // Remove element before focus happens
      document.body.removeChild(button);
      vi.advanceTimersByTime(200);

      expect(focusSpy).not.toHaveBeenCalled();
    });
  });

  describe('focusFirstElement', () => {
    it('should focus first matching element in container', () => {
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      button1.className = 'focusable';
      const button2 = document.createElement('button');
      button2.className = 'focusable';
      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);

      const focusSpy = vi.spyOn(button1, 'focus');

      focusFirstElement(container, '.focusable');
      vi.advanceTimersByTime(100);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should handle null container gracefully', () => {
      expect(() => focusFirstElement(null, '.focusable')).not.toThrow();
    });

    it('should handle no matching elements gracefully', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      expect(() => focusFirstElement(container, '.nonexistent')).not.toThrow();
    });

    it('should pass options to focusElement', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      button.className = 'focusable';
      container.appendChild(button);
      document.body.appendChild(container);

      const focusSpy = vi.spyOn(button, 'focus');

      focusFirstElement(container, '.focusable', { preventScroll: false, delay: 50 });
      vi.advanceTimersByTime(200);

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: false });
    });
  });
});
