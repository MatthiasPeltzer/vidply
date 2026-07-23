/**
 * Unit Tests: DraggableResizable
 * Tests drag and resize functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DraggableResizable } from '../../src/utils/DraggableResizable.js';

describe('DraggableResizable', () => {
  let element;
  let draggable;

  beforeEach(() => {
    // Create test element
    element = document.createElement('div');
    element.style.width = '200px';
    element.style.height = '150px';
    element.style.position = 'absolute';
    element.style.left = '100px';
    element.style.top = '50px';
    element.tabIndex = 0;
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (draggable) {
      draggable.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should create instance with default options', () => {
      draggable = new DraggableResizable(element);
      
      expect(draggable.element).toBe(element);
      expect(draggable.options.minWidth).toBe(150);
      expect(draggable.options.minHeight).toBe(100);
      expect(draggable.options.constrainToViewport).toBe(true);
    });

    it('should accept custom options', () => {
      draggable = new DraggableResizable(element, {
        minWidth: 200,
        minHeight: 150,
        constrainToViewport: false,
        classPrefix: 'custom'
      });
      
      expect(draggable.options.minWidth).toBe(200);
      expect(draggable.options.minHeight).toBe(150);
      expect(draggable.options.constrainToViewport).toBe(false);
      expect(draggable.options.classPrefix).toBe('custom');
    });

    it('should initialize state flags', () => {
      draggable = new DraggableResizable(element);
      
      expect(draggable.isDragging).toBe(false);
      expect(draggable.isResizing).toBe(false);
      expect(draggable.keyboardDragMode).toBe(false);
      expect(draggable.keyboardResizeMode).toBe(false);
      expect(draggable.manuallyPositioned).toBe(false);
    });
  });

  describe('keyboard drag mode', () => {
    beforeEach(() => {
      draggable = new DraggableResizable(element);
    });

    it('should enable keyboard drag mode', () => {
      draggable.enableKeyboardDragMode();
      
      expect(draggable.keyboardDragMode).toBe(true);
      expect(element.classList.contains('draggable-keyboard-drag')).toBe(true);
    });

    it('should disable keyboard drag mode', () => {
      draggable.enableKeyboardDragMode();
      draggable.disableKeyboardDragMode();
      
      expect(draggable.keyboardDragMode).toBe(false);
      expect(element.classList.contains('draggable-keyboard-drag')).toBe(false);
    });

    it('should toggle keyboard drag mode', () => {
      expect(draggable.keyboardDragMode).toBe(false);
      
      draggable.toggleKeyboardDragMode();
      expect(draggable.keyboardDragMode).toBe(true);
      
      draggable.toggleKeyboardDragMode();
      expect(draggable.keyboardDragMode).toBe(false);
    });

    it('should disable resize mode when enabling drag mode', () => {
      draggable.enableKeyboardResizeMode();
      expect(draggable.keyboardResizeMode).toBe(true);
      
      draggable.enableKeyboardDragMode();
      expect(draggable.keyboardDragMode).toBe(true);
      expect(draggable.keyboardResizeMode).toBe(false);
    });
  });

  describe('keyboard toggle guards', () => {
    beforeEach(() => {
      draggable = new DraggableResizable(element);
    });

    const makeEvent = (key, overrides = {}) => ({
      key,
      target: null,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      ...overrides
    });

    it('does not toggle drag mode while typing in an <input>', () => {
      const input = document.createElement('input');
      const e = makeEvent('d', { target: input });
      draggable.onKeyDown(e);
      expect(draggable.keyboardDragMode).toBe(false);
      expect(e.preventDefault).not.toHaveBeenCalled();
    });

    it('does not toggle resize mode inside a contenteditable', () => {
      const editable = document.createElement('div');
      editable.setAttribute('contenteditable', 'true');
      // jsdom does not derive isContentEditable from the attribute; set it.
      Object.defineProperty(editable, 'isContentEditable', { value: true });
      draggable.onKeyDown(makeEvent('r', { target: editable }));
      expect(draggable.keyboardResizeMode).toBe(false);
    });

    it('does not toggle drag mode when a modifier key is held (e.g. Ctrl+D)', () => {
      draggable.onKeyDown(makeEvent('d', { target: element, ctrlKey: true }));
      expect(draggable.keyboardDragMode).toBe(false);
    });

    it('still toggles drag mode for a bare shortcut key on a non-editable target', () => {
      const e = makeEvent('d', { target: element });
      draggable.onKeyDown(e);
      expect(draggable.keyboardDragMode).toBe(true);
      expect(e.preventDefault).toHaveBeenCalled();
    });
  });

  describe('keyboard resize mode', () => {
    beforeEach(() => {
      draggable = new DraggableResizable(element);
    });

    it('should enable keyboard resize mode', () => {
      draggable.enableKeyboardResizeMode();
      
      expect(draggable.keyboardResizeMode).toBe(true);
      expect(element.classList.contains('draggable-keyboard-resize')).toBe(true);
    });

    it('should disable keyboard resize mode', () => {
      draggable.enableKeyboardResizeMode();
      draggable.disableKeyboardResizeMode();
      
      expect(draggable.keyboardResizeMode).toBe(false);
      expect(element.classList.contains('draggable-keyboard-resize')).toBe(false);
    });

    it('should toggle keyboard resize mode', () => {
      expect(draggable.keyboardResizeMode).toBe(false);
      
      draggable.toggleKeyboardResizeMode();
      expect(draggable.keyboardResizeMode).toBe(true);
      
      draggable.toggleKeyboardResizeMode();
      expect(draggable.keyboardResizeMode).toBe(false);
    });

    it('should disable drag mode when enabling resize mode', () => {
      draggable.enableKeyboardDragMode();
      expect(draggable.keyboardDragMode).toBe(true);
      
      draggable.enableKeyboardResizeMode();
      expect(draggable.keyboardResizeMode).toBe(true);
      expect(draggable.keyboardDragMode).toBe(false);
    });
  });

  describe('keyboard drag', () => {
    beforeEach(() => {
      draggable = new DraggableResizable(element);
      draggable.enableKeyboardDragMode();
    });

    it('should move left with ArrowLeft', () => {
      // First call sets initial position from current style
      draggable.keyboardDrag('ArrowLeft', false);
      const afterFirst = parseFloat(element.style.left);
      
      // Second call should decrease by step
      draggable.keyboardDrag('ArrowLeft', false);
      expect(parseFloat(element.style.left)).toBe(afterFirst - 5);
    });

    it('should move right with ArrowRight', () => {
      draggable.keyboardDrag('ArrowRight', false);
      const afterFirst = parseFloat(element.style.left);
      
      draggable.keyboardDrag('ArrowRight', false);
      expect(parseFloat(element.style.left)).toBe(afterFirst + 5);
    });

    it('should move up with ArrowUp', () => {
      draggable.keyboardDrag('ArrowUp', false);
      const afterFirst = parseFloat(element.style.top);
      
      draggable.keyboardDrag('ArrowUp', false);
      expect(parseFloat(element.style.top)).toBe(afterFirst - 5);
    });

    it('should move down with ArrowDown', () => {
      draggable.keyboardDrag('ArrowDown', false);
      const afterFirst = parseFloat(element.style.top);
      
      draggable.keyboardDrag('ArrowDown', false);
      expect(parseFloat(element.style.top)).toBe(afterFirst + 5);
    });

    it('should use larger step with shift key', () => {
      draggable.keyboardDrag('ArrowRight', false);
      const afterFirst = parseFloat(element.style.left);
      
      draggable.keyboardDrag('ArrowRight', true);
      expect(parseFloat(element.style.left)).toBe(afterFirst + 10);
    });

    it('should call onDrag callback', () => {
      const onDrag = vi.fn();
      draggable.options.onDrag = onDrag;
      
      draggable.keyboardDrag('ArrowRight', false);
      
      expect(onDrag).toHaveBeenCalled();
    });
  });

  describe('keyboard resize', () => {
    beforeEach(() => {
      draggable = new DraggableResizable(element);
      draggable.enableKeyboardResizeMode();
    });

    it('should decrease width with ArrowLeft', () => {
      // keyboardResize uses getBoundingClientRect which returns mocked 800x450
      // So width starts at 800, decreases by 5 = 795
      draggable.keyboardResize('ArrowLeft', false);
      expect(parseFloat(element.style.width)).toBe(795);
    });

    it('should increase width with ArrowRight', () => {
      // Width starts at 800, increases by 5 = 805
      draggable.keyboardResize('ArrowRight', false);
      expect(parseFloat(element.style.width)).toBe(805);
    });

    it('should decrease height with ArrowUp', () => {
      // Height starts at 450, decreases by 5 = 445
      draggable.keyboardResize('ArrowUp', false);
      expect(parseFloat(element.style.height)).toBe(445);
    });

    it('should increase height with ArrowDown', () => {
      // Height starts at 450, increases by 5 = 455
      draggable.keyboardResize('ArrowDown', false);
      expect(parseFloat(element.style.height)).toBe(455);
    });

    it('should respect minimum width', () => {
      // Set a high minimum that will be hit
      draggable.options.minWidth = 800;
      draggable.keyboardResize('ArrowLeft', false);
      
      // Width should not go below minWidth
      expect(parseFloat(element.style.width)).toBe(800);
    });

    it('should respect minimum height', () => {
      // Set a high minimum that will be hit
      draggable.options.minHeight = 450;
      draggable.keyboardResize('ArrowUp', false);
      
      // Height should not go below minHeight
      expect(parseFloat(element.style.height)).toBe(450);
    });

    it('should call onResize callback', () => {
      const onResize = vi.fn();
      draggable.options.onResize = onResize;
      
      draggable.keyboardResize('ArrowRight', false);
      
      expect(onResize).toHaveBeenCalled();
    });
  });

  describe('resetPosition', () => {
    beforeEach(() => {
      draggable = new DraggableResizable(element);
    });

    it('should reset to centered position', () => {
      draggable.resetPosition();
      
      expect(element.style.left).toBe('50%');
      expect(element.style.top).toBe('50%');
      expect(element.style.transform).toBe('translate(-50%, -50%)');
    });

    it('should clear manual positioning flag', () => {
      draggable.manuallyPositioned = true;
      draggable.resetPosition();
      
      expect(draggable.manuallyPositioned).toBe(false);
    });

    it('should call onDrag callback with centered flag', () => {
      const onDrag = vi.fn();
      draggable.options.onDrag = onDrag;
      
      draggable.resetPosition();
      
      expect(onDrag).toHaveBeenCalledWith({ centered: true });
    });
  });

  describe('destroy', () => {
    it('should clean up classes', () => {
      draggable = new DraggableResizable(element);
      draggable.enableKeyboardDragMode();
      
      expect(element.classList.contains('draggable-keyboard-drag')).toBe(true);
      
      draggable.destroy();
      
      expect(element.classList.contains('draggable-keyboard-drag')).toBe(false);
      expect(element.classList.contains('draggable-keyboard-resize')).toBe(false);
      expect(element.classList.contains('draggable-dragging')).toBe(false);
      expect(element.classList.contains('draggable-resizing')).toBe(false);
    });
  });

  describe('resize handles', () => {
    it('should handle managed resize handles', () => {
      const handle = document.createElement('div');
      handle.dataset.vidplyManagedResize = 'true';
      handle.dataset.direction = 'se';
      element.appendChild(handle);
      
      draggable = new DraggableResizable(element, {
        resizeHandles: [handle]
      });
      
      expect(draggable.hasManagedResizeHandles()).toBe(true);
    });

    it('should show/hide managed handles', () => {
      const handle = document.createElement('div');
      handle.dataset.vidplyManagedResize = 'true';
      handle.dataset.direction = 'se';
      element.appendChild(handle);
      
      draggable = new DraggableResizable(element, {
        resizeHandles: [handle]
      });
      
      // Initially hidden
      expect(handle.style.display).toBe('none');
      
      // Show handles
      draggable.setManagedHandlesVisible(true);
      expect(handle.style.display).not.toBe('none');
      
      // Hide handles again
      draggable.setManagedHandlesVisible(false);
      expect(handle.style.display).toBe('none');
    });
  });

  describe('pointer resize mode', () => {
    beforeEach(() => {
      const handle = document.createElement('div');
      handle.dataset.vidplyManagedResize = 'true';
      handle.dataset.direction = 'se';
      element.appendChild(handle);
      
      draggable = new DraggableResizable(element, {
        resizeHandles: [handle]
      });
    });

    it('should toggle pointer resize mode', () => {
      expect(draggable.pointerResizeMode).toBe(false);
      
      draggable.togglePointerResizeMode();
      expect(draggable.pointerResizeMode).toBe(true);
      
      draggable.togglePointerResizeMode();
      expect(draggable.pointerResizeMode).toBe(false);
    });

    it('should add resizable class when enabled', () => {
      draggable.enablePointerResizeMode();
      expect(element.classList.contains('draggable-resizable')).toBe(true);
    });

    it('should call callback when toggled', () => {
      const callback = vi.fn();
      draggable.options.onPointerResizeToggle = callback;
      
      draggable.enablePointerResizeMode();
      expect(callback).toHaveBeenCalledWith(true);
      
      draggable.disablePointerResizeMode();
      expect(callback).toHaveBeenCalledWith(false);
    });
  });
});
