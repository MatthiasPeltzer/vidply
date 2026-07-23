import type { StorageManager } from './StorageManager.js';

export interface DraggableResizableOptions {
  dragHandle?: HTMLElement | null;
  resizeHandles?: HTMLElement[];
  onDragStart?: ((e: Event) => boolean | void) | null;
  onDrag?: ((pos: { x?: number; y?: number; centered?: boolean }) => void) | null;
  onDragEnd?: (() => void) | null;
  onResizeStart?: (() => void) | null;
  onResize?: ((dims: { width: number; height: number; left?: number; top?: number }) => void) | null;
  onResizeEnd?: (() => void) | null;
  constrainToViewport?: boolean;
  minWidth?: number;
  minHeight?: number;
  maintainAspectRatio?: boolean;
  keyboardDragKey?: string;
  keyboardResizeKey?: string;
  keyboardStep?: number;
  keyboardStepLarge?: number;
  maxWidth?: number | (() => number) | null;
  maxHeight?: number | (() => number) | null;
  pointerResizeIndicatorText?: string | null;
  onPointerResizeToggle?: ((enabled: boolean) => void) | null;
  classPrefix?: string;
  storage?: StorageManager | null;
  storageKey?: string | null;
}

interface ResolvedOptions extends Required<Omit<DraggableResizableOptions, 'maxWidth' | 'maxHeight'>> {
  maxWidth: number | (() => number) | null;
  maxHeight: number | (() => number) | null;
}

export class DraggableResizable {
  element: HTMLElement;
  options: ResolvedOptions;
  isDragging: boolean;
  isResizing: boolean;
  resizeDirection: string | null;
  dragOffsetX: number;
  dragOffsetY: number;
  positionOffsetX: number;
  positionOffsetY: number;
  initialMouseX: number;
  initialMouseY: number;
  needsPositionConversion: boolean;
  resizeStartX: number;
  resizeStartY: number;
  resizeStartWidth: number;
  resizeStartHeight: number;
  resizeStartLeft: number;
  resizeStartTop: number;
  keyboardDragMode: boolean;
  keyboardResizeMode: boolean;
  pointerResizeMode: boolean;
  manuallyPositioned: boolean;
  resizeHandlesManaged: Map<HTMLElement, boolean>;
  resizeIndicatorElement: HTMLElement | null;
  handlers: {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: () => void;
    touchstart: (e: TouchEvent) => void;
    touchmove: (e: TouchEvent) => void;
    touchend: () => void;
    pointerdown: (e: PointerEvent) => void;
    pointermove: (e: PointerEvent) => void;
    pointerup: (e: PointerEvent) => void;
    pointercancel: (e: PointerEvent) => void;
    keydown: (e: KeyboardEvent) => void;
    resizeHandleMousedown: (e: MouseEvent | TouchEvent) => void;
    resizeHandlePointerDown: (e: PointerEvent) => void;
  };
  activePointerId: number | null;
  activePointerType: string | null;

  constructor(element: HTMLElement, options: DraggableResizableOptions = {}) {
    this.element = element;
    this.options = {
      dragHandle: null,
      resizeHandles: [],
      onDragStart: null,
      onDrag: null,
      onDragEnd: null,
      onResizeStart: null,
      onResize: null,
      onResizeEnd: null,
      constrainToViewport: true,
      minWidth: 150,
      minHeight: 100,
      maintainAspectRatio: false,
      keyboardDragKey: 'd',
      keyboardResizeKey: 'r',
      keyboardStep: 5,
      keyboardStepLarge: 10,
      maxWidth: null,
      maxHeight: null,
      pointerResizeIndicatorText: null,
      onPointerResizeToggle: null,
      classPrefix: 'draggable',
      storage: null,
      storageKey: null,
      ...options
    } as ResolvedOptions;

    // State
    this.isDragging = false;
    this.isResizing = false;
    this.resizeDirection = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.positionOffsetX = 0;
    this.positionOffsetY = 0;
    this.initialMouseX = 0;
    this.initialMouseY = 0;
    this.needsPositionConversion = false;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.resizeStartLeft = 0;
    this.resizeStartTop = 0;
    this.keyboardDragMode = false;
    this.keyboardResizeMode = false;
    this.pointerResizeMode = false;
    this.manuallyPositioned = false; // Flag to track if user has manually moved/resized
    this.resizeHandlesManaged = new Map();
    this.resizeIndicatorElement = null;

    // Event handlers
    this.handlers = {
      mousedown: this.onMouseDown.bind(this),
      mousemove: this.onMouseMove.bind(this),
      mouseup: this.onMouseUp.bind(this),
      touchstart: this.onTouchStart.bind(this),
      touchmove: this.onTouchMove.bind(this),
      touchend: this.onTouchEnd.bind(this),
      pointerdown: this.onPointerDown.bind(this),
      pointermove: this.onPointerMove.bind(this),
      pointerup: this.onPointerUp.bind(this),
      pointercancel: this.onPointerUp.bind(this),
      keydown: this.onKeyDown.bind(this),
      resizeHandleMousedown: this.onResizeHandleMouseDown.bind(this),
      resizeHandlePointerDown: this.onResizeHandlePointerDown.bind(this)
    };

    // Pointer tracking (Pointer Events unify mouse + touch)
    this.activePointerId = null;
    this.activePointerType = null;

    this.init();
  }

  hasManagedResizeHandles(): boolean {
    return Array.from(this.resizeHandlesManaged.values()).some(Boolean);
  }

  storeOriginalHandleDisplay(handle: HTMLElement): void {
    if (!handle.dataset.originalDisplay) {
      handle.dataset.originalDisplay = handle.style.display || '';
    }
  }

  hideResizeHandle(handle: HTMLElement): void {
    handle.style.display = 'none';
    handle.setAttribute('aria-hidden', 'true');
  }

  showResizeHandle(handle: HTMLElement): void {
    const original = handle.dataset.originalDisplay !== undefined ? handle.dataset.originalDisplay : '';
    handle.style.display = original;
    handle.removeAttribute('aria-hidden');
  }

  setManagedHandlesVisible(visible: boolean): void {
    if (!this.options.resizeHandles || this.options.resizeHandles.length === 0) {
      return;
    }

    this.options.resizeHandles.forEach(handle => {
      if (!this.resizeHandlesManaged.get(handle)) {
        return;
      }

      if (visible) {
        this.showResizeHandle(handle);
      } else {
        this.hideResizeHandle(handle);
      }
    });
  }

  init(): void {
    const dragHandle = this.options.dragHandle || this.element;
    
    // Prefer Pointer Events when available (covers mouse + touch in one codepath)
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      dragHandle.addEventListener('pointerdown', this.handlers.pointerdown);

      // Document-level up/cancel events (always needed to end a drag/resize that
      // started inside the element even when the pointer leaves the element).
      // pointermove is NOT registered here — it is added lazily in startDragging()
      // and startResizing() with { passive: false } so that it can call
      // e.preventDefault() to suppress scroll during an active interaction, and
      // removed again in stopDragging() / stopResizing().  Keeping the listener
      // absent while the element is merely visible prevents the non-passive
      // handler from blocking compositor-threaded scroll on the rest of the page.
      document.addEventListener('pointerup', this.handlers.pointerup);
      document.addEventListener('pointercancel', this.handlers.pointercancel);
    } else {
      // Fallback for very old browsers
      dragHandle.addEventListener('mousedown', this.handlers.mousedown);
      dragHandle.addEventListener('touchstart', this.handlers.touchstart, { passive: false });

      // Document-level move/up events
      document.addEventListener('mousemove', this.handlers.mousemove);
      document.addEventListener('mouseup', this.handlers.mouseup);
      document.addEventListener('touchmove', this.handlers.touchmove, { passive: false });
      document.addEventListener('touchend', this.handlers.touchend);
    }
    
    // Keyboard events
    this.element.addEventListener('keydown', this.handlers.keydown);
    
    // Resize handles
    if (this.options.resizeHandles && this.options.resizeHandles.length > 0) {
      this.options.resizeHandles.forEach(handle => {
        if (typeof window !== 'undefined' && 'PointerEvent' in window) {
          handle.addEventListener('pointerdown', this.handlers.resizeHandlePointerDown);
        } else {
          handle.addEventListener('mousedown', this.handlers.resizeHandleMousedown);
          handle.addEventListener('touchstart', this.handlers.resizeHandleMousedown, { passive: false });
        }

        const managed = handle.dataset.vidplyManagedResize === 'true';
        this.resizeHandlesManaged.set(handle, managed);
        if (managed) {
          this.storeOriginalHandleDisplay(handle);
          this.hideResizeHandle(handle);
        }
      });
    }
  }

  onPointerDown(e: PointerEvent): void {
    if (e.isPrimary === false) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }

    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }

    this.activePointerId = e.pointerId;
    this.activePointerType = e.pointerType;

    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    this.startDragging(e.clientX, e.clientY);
    e.preventDefault();
  }

  onPointerMove(e: PointerEvent): void {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    if (this.isDragging) {
      this.drag(e.clientX, e.clientY);
      e.preventDefault();
    } else if (this.isResizing) {
      this.resize(e.clientX, e.clientY);
      e.preventDefault();
    }
  }

  onPointerUp(e: PointerEvent): void {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    if (this.isDragging) {
      this.stopDragging();
    } else if (this.isResizing) {
      this.stopResizing();
    }

    this.activePointerId = null;
    this.activePointerType = null;
  }

  onMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }
    
    // Call custom handler if provided
    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }

    this.startDragging(e.clientX, e.clientY);
    e.preventDefault();
  }

  onTouchStart(e: TouchEvent): void {
    const target = e.target as HTMLElement;
    if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }
    
    // Call custom handler if provided
    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }

    const touch = e.touches[0];
    if (!touch) return;
    this.startDragging(touch.clientX, touch.clientY);
    // Prevent page scroll while dragging (requires passive:false listener)
    e.preventDefault();
  }

  onResizeHandlePointerDown(e: PointerEvent): void {
    // Only handle primary pointer
    if (e.isPrimary === false) return;

    // Only left click for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const handle = e.target as HTMLElement;
    this.resizeDirection = handle.getAttribute('data-direction');

    this.activePointerId = e.pointerId;
    this.activePointerType = e.pointerType;

    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    this.startResizing(e.clientX, e.clientY);
  }

  onResizeHandleMouseDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();
    
    const handle = e.target as HTMLElement;
    this.resizeDirection = handle.getAttribute('data-direction');
    
    const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX;
    const clientY = 'clientY' in e ? e.clientY : e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    this.startResizing(clientX, clientY);
  }

  onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.drag(e.clientX, e.clientY);
      e.preventDefault();
    } else if (this.isResizing) {
      this.resize(e.clientX, e.clientY);
      e.preventDefault();
    }
  }

  onTouchMove(e: TouchEvent): void {
    if (this.isDragging || this.isResizing) {
      const touch = e.touches[0];
      if (!touch) return;
      if (this.isDragging) {
        this.drag(touch.clientX, touch.clientY);
      } else {
        this.resize(touch.clientX, touch.clientY);
      }
      e.preventDefault();
    }
  }

  onMouseUp(): void {
    if (this.isDragging) {
      this.stopDragging();
    } else if (this.isResizing) {
      this.stopResizing();
    }
  }

  onTouchEnd(): void {
    if (this.isDragging) {
      this.stopDragging();
    } else if (this.isResizing) {
      this.stopResizing();
    }
  }

  onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const isToggleKey =
      key === this.options.keyboardDragKey.toLowerCase() ||
      key === this.options.keyboardResizeKey.toLowerCase();

    // Never hijack the single-letter drag/resize shortcuts while the user is
    // typing into a form control / contenteditable, or while a modifier is
    // held (e.g. Ctrl+D bookmark, Cmd+R reload). Escape/arrow handling for
    // already-active modes below is unaffected.
    if (isToggleKey) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target !== null &&
        (target.isContentEditable ||
          /^(input|textarea|select)$/i.test(target.tagName));
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      if (isEditable || hasModifier) {
        return;
      }
    }

    // Toggle drag mode
    if (key === this.options.keyboardDragKey.toLowerCase()) {
      e.preventDefault();
      this.toggleKeyboardDragMode();
      return;
    }

    // Toggle resize mode
    if (e.key.toLowerCase() === this.options.keyboardResizeKey.toLowerCase()) {
      e.preventDefault();
      if (this.hasManagedResizeHandles()) {
        this.togglePointerResizeMode();
      } else {
        this.toggleKeyboardResizeMode();
      }
      return;
    }

    // Exit modes with Escape
    if (e.key === 'Escape') {
      if (this.pointerResizeMode) {
        e.preventDefault();
        this.disablePointerResizeMode();
        return;
      }
      if (this.keyboardDragMode || this.keyboardResizeMode) {
        e.preventDefault();
        this.disableKeyboardDragMode();
        this.disableKeyboardResizeMode();
        return;
      }
    }

    // Arrow keys for drag/resize
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      if (this.keyboardDragMode) {
        e.preventDefault();
        e.stopPropagation();
        this.keyboardDrag(e.key, e.shiftKey);
      } else if (this.keyboardResizeMode) {
        e.preventDefault();
        e.stopPropagation();
        this.keyboardResize(e.key, e.shiftKey);
      }
    }

    // Home key to reset position
    if (e.key === 'Home' && (this.keyboardDragMode || this.keyboardResizeMode)) {
      e.preventDefault();
      this.resetPosition();
    }
  }

  startDragging(clientX: number, clientY: number): void {
    // Get current rendered position BEFORE any changes
    const rect = this.element.getBoundingClientRect();
    
    // Convert position to left/top IMMEDIATELY (before setting any state)
    // Check if element is using right/bottom/transform positioning
    const computedStyle = window.getComputedStyle(this.element);
    const needsConversion = computedStyle.right !== 'auto' || 
                           computedStyle.bottom !== 'auto' || 
                           computedStyle.transform !== 'none';
    
    this.positionOffsetX = 0;
    this.positionOffsetY = 0;

    if (needsConversion) {
      // Determine the correct left/top values based on position type
      let targetLeft, targetTop;
      
      if (computedStyle.position === 'absolute') {
        // position: absolute uses container-relative coordinates
        const offsetParent = this.element.offsetParent || document.body;
        const parentRect = offsetParent.getBoundingClientRect();
        targetLeft = rect.left - parentRect.left;
        targetTop = rect.top - parentRect.top;
        this.positionOffsetX = parentRect.left;
        this.positionOffsetY = parentRect.top;
      } else if (computedStyle.position === 'fixed') {
        const parsedLeft = parseFloat(computedStyle.left);
        const parsedTop = parseFloat(computedStyle.top);
        const hasLeft = Number.isFinite(parsedLeft);
        const hasTop = Number.isFinite(parsedTop);
        targetLeft = hasLeft ? parsedLeft : rect.left;
        targetTop = hasTop ? parsedTop : rect.top;
        this.positionOffsetX = rect.left - targetLeft;
        this.positionOffsetY = rect.top - targetTop;
      } else {
        // fallback: treat as viewport-relative
        targetLeft = rect.left;
        targetTop = rect.top;
        this.positionOffsetX = rect.left - targetLeft;
        this.positionOffsetY = rect.top - targetTop;
      }
      
      // Build complete style update atomically
      const currentCssText = this.element.style.cssText;
      let newCssText = currentCssText
        .split(';')
        .filter(rule => {
          const trimmed = rule.trim();
          // Filter out empty rules
          if (!trimmed) return false;
          
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex === -1) return false;
          
          const property = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim();
          
          // Skip if value is empty or just whitespace (this catches empty border properties)
          if (!value || value === '') return false;
          
          // Skip positioning properties
          if (property === 'right' || property === 'bottom' || property === 'transform' ||
              property === 'left' || property === 'top' || property === 'inset') {
            return false;
          }
          
          // Skip border-image properties (these can have empty values that cause parse errors)
          if (property.startsWith('border-image')) {
            return false;
          }
          
          return true;
        })
        .join('; ');
      
      if (newCssText) newCssText += '; ';
      newCssText += `left: ${targetLeft}px; top: ${targetTop}px; right: auto; bottom: auto; transform: none`;
      
      // Apply all at once
      this.element.style.cssText = newCssText;
    }
    
    // Now calculate offsets based on CURRENT position (after conversion)
    // Re-get rect after potential position change
    const finalRect = this.element.getBoundingClientRect();
    this.dragOffsetX = clientX - finalRect.left;
    this.dragOffsetY = clientY - finalRect.top;
    
    this.isDragging = true;
    this.element.classList.add(`${this.options.classPrefix}-dragging`);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    // Register the non-passive pointermove listener only for the duration of
    // the drag so it does not block compositor-threaded scroll at other times.
    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', this.handlers.pointermove, { passive: false });
    }
  }

  drag(clientX: number, clientY: number): void {
    if (!this.isDragging) return;

    // Calculate new position: current mouse position minus the offset where user clicked
    let newX = clientX - this.dragOffsetX - this.positionOffsetX;
    let newY = clientY - this.dragOffsetY - this.positionOffsetY;
    
    // Constrain to viewport if needed
    if (this.options.constrainToViewport) {
      const rect = this.element.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      
      // Keep at least 100px visible
      const minVisible = 100;
      const minX = -(rect.width - minVisible);
      const minY = -(rect.height - minVisible);
      const maxX = viewportWidth - minVisible;
      const maxY = viewportHeight - minVisible;
      
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));
    }
    
    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
    
    // Call custom handler if provided
    if (this.options.onDrag) {
      this.options.onDrag({ x: newX, y: newY });
    }
  }

  stopDragging(): void {
    this.isDragging = false;
    this.element.classList.remove(`${this.options.classPrefix}-dragging`);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Remove the non-passive pointermove listener that was added in startDragging().
    if ('PointerEvent' in window) {
      document.removeEventListener('pointermove', this.handlers.pointermove);
    }
    
    // Mark as manually positioned
    this.manuallyPositioned = true;
    
    // Call custom handler if provided
    if (this.options.onDragEnd) {
      this.options.onDragEnd();
    }
  }

  startResizing(clientX: number, clientY: number): void {
    this.isResizing = true;
    this.resizeStartX = clientX;
    this.resizeStartY = clientY;
    
    const rect = this.element.getBoundingClientRect();
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;
    this.resizeStartLeft = rect.left;
    this.resizeStartTop = rect.top;
    
    this.element.classList.add(`${this.options.classPrefix}-resizing`);
    document.body.style.userSelect = 'none';

    // Register the non-passive pointermove listener only for the duration of
    // the resize so it does not block compositor-threaded scroll at other times.
    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', this.handlers.pointermove, { passive: false });
    }
    
    // Call custom handler if provided
    if (this.options.onResizeStart) {
      this.options.onResizeStart();
    }
  }

  resize(clientX: number, clientY: number): void {
    if (!this.isResizing) return;

    const deltaX = clientX - this.resizeStartX;
    const deltaY = clientY - this.resizeStartY;
    
    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;
    let newLeft = this.resizeStartLeft;
    let newTop = this.resizeStartTop;

    // Handle horizontal resizing
    const resizeDirection = this.resizeDirection ?? '';

    if (resizeDirection.includes('e')) {
      newWidth = Math.max(this.options.minWidth, this.resizeStartWidth + deltaX);
    }
    if (resizeDirection.includes('w')) {
      const proposedWidth = Math.max(this.options.minWidth, this.resizeStartWidth - deltaX);
      newLeft = this.resizeStartLeft + (this.resizeStartWidth - proposedWidth);
      newWidth = proposedWidth;
    }

    const maxWidthOption = typeof this.options.maxWidth === 'function'
      ? this.options.maxWidth()
      : this.options.maxWidth;
    if (typeof maxWidthOption === 'number' && Number.isFinite(maxWidthOption)) {
      const clampedWidth = Math.min(newWidth, maxWidthOption);
      if (clampedWidth !== newWidth && resizeDirection.includes('w')) {
        newLeft += newWidth - clampedWidth;
      }
      newWidth = clampedWidth;
    }

    // Handle vertical resizing (if not maintaining aspect ratio)
    if (!this.options.maintainAspectRatio) {
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(this.options.minHeight, this.resizeStartHeight + deltaY);
      }
      if (resizeDirection.includes('n')) {
        const proposedHeight = Math.max(this.options.minHeight, this.resizeStartHeight - deltaY);
        newTop = this.resizeStartTop + (this.resizeStartHeight - proposedHeight);
        newHeight = proposedHeight;
      }

      const maxHeightOption = typeof this.options.maxHeight === 'function'
        ? this.options.maxHeight()
        : this.options.maxHeight;
      if (typeof maxHeightOption === 'number' && Number.isFinite(maxHeightOption)) {
        const clampedHeight = Math.min(newHeight, maxHeightOption);
        if (clampedHeight !== newHeight && resizeDirection.includes('n')) {
          newTop += newHeight - clampedHeight;
        }
        newHeight = clampedHeight;
      }
    }

    // Apply new dimensions
    this.element.style.width = `${newWidth}px`;
    if (!this.options.maintainAspectRatio) {
      this.element.style.height = `${newHeight}px`;
    } else {
      this.element.style.height = 'auto';
    }
    
    // Apply new position if resizing from west or north
    if (resizeDirection.includes('w')) {
      this.element.style.left = `${newLeft}px`;
    }
    if (resizeDirection.includes('n') && !this.options.maintainAspectRatio) {
      this.element.style.top = `${newTop}px`;
    }
    
    // Call custom handler if provided
    if (this.options.onResize) {
      this.options.onResize({ width: newWidth, height: newHeight, left: newLeft, top: newTop });
    }
  }

  stopResizing(): void {
    this.isResizing = false;
    this.resizeDirection = null;
    this.element.classList.remove(`${this.options.classPrefix}-resizing`);
    document.body.style.userSelect = '';

    // Remove the non-passive pointermove listener that was added in startResizing().
    if ('PointerEvent' in window) {
      document.removeEventListener('pointermove', this.handlers.pointermove);
    }
    
    // Mark as manually positioned
    this.manuallyPositioned = true;
    
    // Call custom handler if provided
    if (this.options.onResizeEnd) {
      this.options.onResizeEnd();
    }
  }

  toggleKeyboardDragMode(): void {
    if (this.keyboardDragMode) {
      this.disableKeyboardDragMode();
    } else {
      this.enableKeyboardDragMode();
    }
  }

  enableKeyboardDragMode(): void {
    this.keyboardDragMode = true;
    this.keyboardResizeMode = false;
    this.element.classList.add(`${this.options.classPrefix}-keyboard-drag`);
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-resize`);
    this.focusElement();
  }

  disableKeyboardDragMode(): void {
    this.keyboardDragMode = false;
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-drag`);
  }

  toggleKeyboardResizeMode(): void {
    if (this.keyboardResizeMode) {
      this.disableKeyboardResizeMode();
    } else {
      this.enableKeyboardResizeMode();
    }
  }

  enableKeyboardResizeMode(): void {
    this.keyboardResizeMode = true;
    this.keyboardDragMode = false;
    this.element.classList.add(`${this.options.classPrefix}-keyboard-resize`);
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-drag`);
    this.focusElement();
  }

  disableKeyboardResizeMode(): void {
    this.keyboardResizeMode = false;
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-resize`);
  }

  enablePointerResizeMode({ focus = true }: { focus?: boolean } = {}): void {
    if (!this.hasManagedResizeHandles()) {
      this.enableKeyboardResizeMode();
      return;
    }

    if (this.pointerResizeMode) {
      return;
    }

    this.pointerResizeMode = true;
    this.setManagedHandlesVisible(true);
    this.element.classList.add(`${this.options.classPrefix}-resizable`);
    this.enableKeyboardResizeMode();

    if (focus) {
      this.focusElement();
    }

    if (typeof this.options.onPointerResizeToggle === 'function') {
      this.options.onPointerResizeToggle(true);
    }
  }

  disablePointerResizeMode({ focus = false }: { focus?: boolean } = {}): void {
    if (!this.pointerResizeMode) {
      return;
    }

    this.pointerResizeMode = false;
    this.setManagedHandlesVisible(false);
    this.element.classList.remove(`${this.options.classPrefix}-resizable`);
    this.disableKeyboardResizeMode();

    if (focus) {
      this.focusElement();
    }

    if (typeof this.options.onPointerResizeToggle === 'function') {
      this.options.onPointerResizeToggle(false);
    }
  }

  togglePointerResizeMode(): boolean {
    if (this.pointerResizeMode) {
      this.disablePointerResizeMode();
    } else {
      this.enablePointerResizeMode();
    }
    return this.pointerResizeMode;
  }

  focusElement(): void {
    if (typeof this.element.focus === 'function') {
      try {
        this.element.focus({ preventScroll: true });
      } catch {
        // Some browsers do not support the preventScroll option; fallback without it
        this.element.focus();
      }
    }
  }

  keyboardDrag(key: string, shiftKey: boolean): void {
    const step = shiftKey ? this.options.keyboardStepLarge : this.options.keyboardStep;
    
    // Get current position
    let currentLeft = parseFloat(this.element.style.left) || 0;
    let currentTop = parseFloat(this.element.style.top) || 0;
    
    // If element is still centered with transform, convert to absolute position first
    const computedStyle = window.getComputedStyle(this.element);
    if (computedStyle.transform !== 'none') {
      const rect = this.element.getBoundingClientRect();
      currentLeft = rect.left;
      currentTop = rect.top;
      this.element.style.transform = 'none';
      this.element.style.left = `${currentLeft}px`;
      this.element.style.top = `${currentTop}px`;
    }
    
    // Calculate new position
    let newX = currentLeft;
    let newY = currentTop;

    switch(key) {
      case 'ArrowLeft':
        newX -= step;
        break;
      case 'ArrowRight':
        newX += step;
        break;
      case 'ArrowUp':
        newY -= step;
        break;
      case 'ArrowDown':
        newY += step;
        break;
    }

    // Apply position
    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
    
    // Call custom handler if provided
    if (this.options.onDrag) {
      this.options.onDrag({ x: newX, y: newY });
    }
  }

  keyboardResize(key: string, shiftKey: boolean): void {
    const step = shiftKey ? this.options.keyboardStepLarge : this.options.keyboardStep;
    const rect = this.element.getBoundingClientRect();
    
    let width = rect.width;
    let height = rect.height;

    // Adjust width/height based on arrow key
    switch(key) {
      case 'ArrowLeft':
        width -= step;
        break;
      case 'ArrowRight':
        width += step;
        break;
      case 'ArrowUp':
        if (this.options.maintainAspectRatio) {
          width += step;
        } else {
          height -= step;
        }
        break;
      case 'ArrowDown':
        if (this.options.maintainAspectRatio) {
          width -= step;
        } else {
          height += step;
        }
        break;
    }

    // Constrain to minimum dimensions
    width = Math.max(this.options.minWidth, width);
    height = Math.max(this.options.minHeight, height);

    // Apply new dimensions
    this.element.style.width = `${width}px`;
    if (!this.options.maintainAspectRatio) {
      this.element.style.height = `${height}px`;
    } else {
      this.element.style.height = 'auto';
    }
    
    // Call custom handler if provided
    if (this.options.onResize) {
      this.options.onResize({ width, height });
    }
  }

  resetPosition(): void {
    this.element.style.left = '50%';
    this.element.style.top = '50%';
    this.element.style.transform = 'translate(-50%, -50%)';
    this.element.style.right = '';
    this.element.style.bottom = '';
    
    // Clear manual positioning flag
    this.manuallyPositioned = false;
    
    // Call custom handler if provided
    if (this.options.onDrag) {
      this.options.onDrag({ centered: true });
    }
  }

  destroy(): void {
    const dragHandle = this.options.dragHandle || this.element;
    
    this.disablePointerResizeMode();
    
    // Remove drag events
    dragHandle.removeEventListener('mousedown', this.handlers.mousedown);
    dragHandle.removeEventListener('touchstart', this.handlers.touchstart);
    dragHandle.removeEventListener('pointerdown', this.handlers.pointerdown);
    
    // Remove document-level events
    document.removeEventListener('mousemove', this.handlers.mousemove);
    document.removeEventListener('mouseup', this.handlers.mouseup);
    document.removeEventListener('touchmove', this.handlers.touchmove);
    document.removeEventListener('touchend', this.handlers.touchend);
    document.removeEventListener('pointermove', this.handlers.pointermove);
    document.removeEventListener('pointerup', this.handlers.pointerup);
    document.removeEventListener('pointercancel', this.handlers.pointercancel);
    
    // Remove keyboard events
    this.element.removeEventListener('keydown', this.handlers.keydown);
    
    // Remove resize handle events
    if (this.options.resizeHandles && this.options.resizeHandles.length > 0) {
      this.options.resizeHandles.forEach(handle => {
        handle.removeEventListener('mousedown', this.handlers.resizeHandleMousedown);
        handle.removeEventListener('touchstart', this.handlers.resizeHandleMousedown);
        handle.removeEventListener('pointerdown', this.handlers.resizeHandlePointerDown);
      });
    }
    
    // Clean up classes
    this.element.classList.remove(
      `${this.options.classPrefix}-dragging`,
      `${this.options.classPrefix}-resizing`,
      `${this.options.classPrefix}-keyboard-drag`,
      `${this.options.classPrefix}-keyboard-resize`
    );
  }
}

