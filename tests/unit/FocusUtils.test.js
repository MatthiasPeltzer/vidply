/**
 * Unit Tests: FocusUtils
 * Tests focus management utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  focusElement,
  focusFirstElement,
  getFocusableElements,
  setContainerChildrenInert,
  trapFocusInContainer,
} from '../../src/utils/FocusUtils.js';

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

  describe('getFocusableElements', () => {
    it('returns enabled focusable elements in DOM order', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button type="button">One</button>
        <button type="button" disabled>Two</button>
        <a href="#">Three</a>
      `;
      document.body.appendChild(container);

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(2);
      expect(focusable[0].textContent).toBe('One');
      expect(focusable[1].textContent).toBe('Three');
    });
  });

  describe('trapFocusInContainer', () => {
    it('wraps Tab from last to first focusable element', () => {
      const container = document.createElement('div');
      const first = document.createElement('button');
      first.textContent = 'First';
      const last = document.createElement('button');
      last.textContent = 'Last';
      container.append(first, last);
      document.body.appendChild(container);
      last.focus();

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const focusSpy = vi.spyOn(first, 'focus');

      const handled = trapFocusInContainer(event, container);

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  describe('setContainerChildrenInert', () => {
    it('marks siblings inert and restores them when disabled', () => {
      const container = document.createElement('div');
      const keep = document.createElement('div');
      const sibling = document.createElement('div');
      container.append(keep, sibling);
      document.body.appendChild(container);

      let tracked = setContainerChildrenInert(container, keep, true, []);
      expect(sibling.hasAttribute('inert')).toBe(true);
      expect(keep.hasAttribute('inert')).toBe(false);

      tracked = setContainerChildrenInert(container, null, false, tracked);
      expect(sibling.hasAttribute('inert')).toBe(false);
      expect(tracked).toEqual([]);
    });
  });
});
