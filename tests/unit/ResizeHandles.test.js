/**
 * Unit Tests: ResizeHandles
 * Tests resize handle creation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createResizeHandles,
  removeResizeHandles,
  toggleResizableState,
  getCursorForDirection
} from '../../src/utils/ResizeHandles.js';

// Mock DOMUtils
vi.mock('../../src/utils/DOMUtils.js', () => ({
  DOMUtils: {
    createElement: vi.fn((tag, options = {}) => {
      const el = document.createElement(tag);
      if (options.className) el.className = options.className;
      return el;
    }),
    addClass: vi.fn((el, className) => el.classList.add(className)),
    removeClass: vi.fn((el, className) => el.classList.remove(className))
  }
}));

describe('ResizeHandles', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('createResizeHandles', () => {
    it('should create 8 resize handles', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const handles = createResizeHandles(container, 'vidply', 'transcript-resize');

      expect(handles.length).toBe(8);
    });

    it('should create handles for all directions', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const handles = createResizeHandles(container, 'vidply', 'transcript-resize');
      const directions = handles.map(h => h.direction);

      expect(directions).toContain('n');
      expect(directions).toContain('s');
      expect(directions).toContain('e');
      expect(directions).toContain('w');
      expect(directions).toContain('ne');
      expect(directions).toContain('nw');
      expect(directions).toContain('se');
      expect(directions).toContain('sw');
    });

    it('should return handle objects with direction and element', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const handles = createResizeHandles(container, 'vidply', 'test');

      handles.forEach(handle => {
        expect(handle).toHaveProperty('direction');
        expect(handle).toHaveProperty('element');
        expect(handle.element).toBeInstanceOf(HTMLElement);
      });
    });

    it('should append handles to container element', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      createResizeHandles(container, 'vidply', 'test');

      expect(container.children.length).toBe(8);
    });

    it('should apply correct class names to handles', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const handles = createResizeHandles(container, 'myprefix', 'myhandle');

      handles.forEach(handle => {
        expect(handle.element.className).toContain('myprefix-resize-handle');
        expect(handle.element.className).toContain(`myprefix-resize-handle-${handle.direction}`);
        expect(handle.element.className).toContain(`myprefix-myhandle-${handle.direction}`);
      });
    });
  });

  describe('removeResizeHandles', () => {
    it('should remove all resize handles from element', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Create handles first
      createResizeHandles(container, 'vidply', 'test');
      expect(container.children.length).toBe(8);

      // Now remove them
      removeResizeHandles(container, 'vidply');
      expect(container.children.length).toBe(0);
    });

    it('should handle element with no handles gracefully', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      expect(() => removeResizeHandles(container, 'vidply')).not.toThrow();
    });

    it('should only remove handles with matching class prefix', () => {
      const container = document.createElement('div');
      const otherChild = document.createElement('div');
      otherChild.className = 'other-element';
      container.appendChild(otherChild);
      document.body.appendChild(container);

      createResizeHandles(container, 'vidply', 'test');
      expect(container.children.length).toBe(9); // 8 handles + 1 other

      removeResizeHandles(container, 'vidply');
      expect(container.children.length).toBe(1); // Only other element remains
    });
  });

  describe('toggleResizableState', () => {
    it('should add resizable class when isResizable is true', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      toggleResizableState(element, 'vidply', true);

      expect(element.classList.contains('vidply-resizable')).toBe(true);
    });

    it('should remove resizable class when isResizable is false', () => {
      const element = document.createElement('div');
      element.classList.add('vidply-resizable');
      document.body.appendChild(element);

      toggleResizableState(element, 'vidply', false);

      expect(element.classList.contains('vidply-resizable')).toBe(false);
    });
  });

  describe('getCursorForDirection', () => {
    it('should return ns-resize for north direction', () => {
      expect(getCursorForDirection('n')).toBe('ns-resize');
    });

    it('should return ns-resize for south direction', () => {
      expect(getCursorForDirection('s')).toBe('ns-resize');
    });

    it('should return ew-resize for east direction', () => {
      expect(getCursorForDirection('e')).toBe('ew-resize');
    });

    it('should return ew-resize for west direction', () => {
      expect(getCursorForDirection('w')).toBe('ew-resize');
    });

    it('should return nesw-resize for northeast direction', () => {
      expect(getCursorForDirection('ne')).toBe('nesw-resize');
    });

    it('should return nesw-resize for southwest direction', () => {
      expect(getCursorForDirection('sw')).toBe('nesw-resize');
    });

    it('should return nwse-resize for northwest direction', () => {
      expect(getCursorForDirection('nw')).toBe('nwse-resize');
    });

    it('should return nwse-resize for southeast direction', () => {
      expect(getCursorForDirection('se')).toBe('nwse-resize');
    });

    it('should return default for unknown direction', () => {
      expect(getCursorForDirection('unknown')).toBe('default');
    });

    it('should return default for empty string', () => {
      expect(getCursorForDirection('')).toBe('default');
    });
  });
});
