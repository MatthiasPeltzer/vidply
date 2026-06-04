/*!
 * VidPly v1.2.0 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/DraggableResizable.ts
var DraggableResizable = class {
  element;
  options;
  isDragging;
  isResizing;
  resizeDirection;
  dragOffsetX;
  dragOffsetY;
  positionOffsetX;
  positionOffsetY;
  initialMouseX;
  initialMouseY;
  needsPositionConversion;
  resizeStartX;
  resizeStartY;
  resizeStartWidth;
  resizeStartHeight;
  resizeStartLeft;
  resizeStartTop;
  keyboardDragMode;
  keyboardResizeMode;
  pointerResizeMode;
  manuallyPositioned;
  resizeHandlesManaged;
  resizeIndicatorElement;
  handlers;
  activePointerId;
  activePointerType;
  constructor(element, options = {}) {
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
      keyboardDragKey: "d",
      keyboardResizeKey: "r",
      keyboardStep: 5,
      keyboardStepLarge: 10,
      maxWidth: null,
      maxHeight: null,
      pointerResizeIndicatorText: null,
      onPointerResizeToggle: null,
      classPrefix: "draggable",
      storage: null,
      storageKey: null,
      ...options
    };
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
    this.manuallyPositioned = false;
    this.resizeHandlesManaged = /* @__PURE__ */ new Map();
    this.resizeIndicatorElement = null;
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
    this.activePointerId = null;
    this.activePointerType = null;
    this.init();
  }
  hasManagedResizeHandles() {
    return Array.from(this.resizeHandlesManaged.values()).some(Boolean);
  }
  storeOriginalHandleDisplay(handle) {
    if (!handle.dataset.originalDisplay) {
      handle.dataset.originalDisplay = handle.style.display || "";
    }
  }
  hideResizeHandle(handle) {
    handle.style.display = "none";
    handle.setAttribute("aria-hidden", "true");
  }
  showResizeHandle(handle) {
    const original = handle.dataset.originalDisplay !== void 0 ? handle.dataset.originalDisplay : "";
    handle.style.display = original;
    handle.removeAttribute("aria-hidden");
  }
  setManagedHandlesVisible(visible) {
    if (!this.options.resizeHandles || this.options.resizeHandles.length === 0) {
      return;
    }
    this.options.resizeHandles.forEach((handle) => {
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
  init() {
    const dragHandle = this.options.dragHandle || this.element;
    if (typeof window !== "undefined" && "PointerEvent" in window) {
      dragHandle.addEventListener("pointerdown", this.handlers.pointerdown);
      document.addEventListener("pointerup", this.handlers.pointerup);
      document.addEventListener("pointercancel", this.handlers.pointercancel);
    } else {
      dragHandle.addEventListener("mousedown", this.handlers.mousedown);
      dragHandle.addEventListener("touchstart", this.handlers.touchstart, { passive: false });
      document.addEventListener("mousemove", this.handlers.mousemove);
      document.addEventListener("mouseup", this.handlers.mouseup);
      document.addEventListener("touchmove", this.handlers.touchmove, { passive: false });
      document.addEventListener("touchend", this.handlers.touchend);
    }
    this.element.addEventListener("keydown", this.handlers.keydown);
    if (this.options.resizeHandles && this.options.resizeHandles.length > 0) {
      this.options.resizeHandles.forEach((handle) => {
        if (typeof window !== "undefined" && "PointerEvent" in window) {
          handle.addEventListener("pointerdown", this.handlers.resizeHandlePointerDown);
        } else {
          handle.addEventListener("mousedown", this.handlers.resizeHandleMousedown);
          handle.addEventListener("touchstart", this.handlers.resizeHandleMousedown, { passive: false });
        }
        const managed = handle.dataset.vidplyManagedResize === "true";
        this.resizeHandlesManaged.set(handle, managed);
        if (managed) {
          this.storeOriginalHandleDisplay(handle);
          this.hideResizeHandle(handle);
        }
      });
    }
  }
  onPointerDown(e) {
    if (e.isPrimary === false) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target;
    if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }
    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }
    this.activePointerId = e.pointerId;
    this.activePointerType = e.pointerType;
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {
    }
    this.startDragging(e.clientX, e.clientY);
    e.preventDefault();
  }
  onPointerMove(e) {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
    if (this.isDragging) {
      this.drag(e.clientX, e.clientY);
      e.preventDefault();
    } else if (this.isResizing) {
      this.resize(e.clientX, e.clientY);
      e.preventDefault();
    }
  }
  onPointerUp(e) {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
    if (this.isDragging) {
      this.stopDragging();
    } else if (this.isResizing) {
      this.stopResizing();
    }
    this.activePointerId = null;
    this.activePointerType = null;
  }
  onMouseDown(e) {
    const target = e.target;
    if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }
    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }
    this.startDragging(e.clientX, e.clientY);
    e.preventDefault();
  }
  onTouchStart(e) {
    const target = e.target;
    if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }
    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    this.startDragging(touch.clientX, touch.clientY);
    e.preventDefault();
  }
  onResizeHandlePointerDown(e) {
    if (e.isPrimary === false) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.target;
    this.resizeDirection = handle.getAttribute("data-direction");
    this.activePointerId = e.pointerId;
    this.activePointerType = e.pointerType;
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {
    }
    this.startResizing(e.clientX, e.clientY);
  }
  onResizeHandleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.target;
    this.resizeDirection = handle.getAttribute("data-direction");
    const clientX = "clientX" in e ? e.clientX : e.touches?.[0]?.clientX;
    const clientY = "clientY" in e ? e.clientY : e.touches?.[0]?.clientY;
    if (clientX === void 0 || clientY === void 0) return;
    this.startResizing(clientX, clientY);
  }
  onMouseMove(e) {
    if (this.isDragging) {
      this.drag(e.clientX, e.clientY);
      e.preventDefault();
    } else if (this.isResizing) {
      this.resize(e.clientX, e.clientY);
      e.preventDefault();
    }
  }
  onTouchMove(e) {
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
  onMouseUp() {
    if (this.isDragging) {
      this.stopDragging();
    } else if (this.isResizing) {
      this.stopResizing();
    }
  }
  onTouchEnd() {
    if (this.isDragging) {
      this.stopDragging();
    } else if (this.isResizing) {
      this.stopResizing();
    }
  }
  onKeyDown(e) {
    if (e.key.toLowerCase() === this.options.keyboardDragKey.toLowerCase()) {
      e.preventDefault();
      this.toggleKeyboardDragMode();
      return;
    }
    if (e.key.toLowerCase() === this.options.keyboardResizeKey.toLowerCase()) {
      e.preventDefault();
      if (this.hasManagedResizeHandles()) {
        this.togglePointerResizeMode();
      } else {
        this.toggleKeyboardResizeMode();
      }
      return;
    }
    if (e.key === "Escape") {
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
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
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
    if (e.key === "Home" && (this.keyboardDragMode || this.keyboardResizeMode)) {
      e.preventDefault();
      this.resetPosition();
    }
  }
  startDragging(clientX, clientY) {
    const rect = this.element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(this.element);
    const needsConversion = computedStyle.right !== "auto" || computedStyle.bottom !== "auto" || computedStyle.transform !== "none";
    this.positionOffsetX = 0;
    this.positionOffsetY = 0;
    if (needsConversion) {
      let targetLeft, targetTop;
      if (computedStyle.position === "absolute") {
        const offsetParent = this.element.offsetParent || document.body;
        const parentRect = offsetParent.getBoundingClientRect();
        targetLeft = rect.left - parentRect.left;
        targetTop = rect.top - parentRect.top;
        this.positionOffsetX = parentRect.left;
        this.positionOffsetY = parentRect.top;
      } else if (computedStyle.position === "fixed") {
        const parsedLeft = parseFloat(computedStyle.left);
        const parsedTop = parseFloat(computedStyle.top);
        const hasLeft = Number.isFinite(parsedLeft);
        const hasTop = Number.isFinite(parsedTop);
        targetLeft = hasLeft ? parsedLeft : rect.left;
        targetTop = hasTop ? parsedTop : rect.top;
        this.positionOffsetX = rect.left - targetLeft;
        this.positionOffsetY = rect.top - targetTop;
      } else {
        targetLeft = rect.left;
        targetTop = rect.top;
        this.positionOffsetX = rect.left - targetLeft;
        this.positionOffsetY = rect.top - targetTop;
      }
      const currentCssText = this.element.style.cssText;
      let newCssText = currentCssText.split(";").filter((rule) => {
        const trimmed = rule.trim();
        if (!trimmed) return false;
        const colonIndex = trimmed.indexOf(":");
        if (colonIndex === -1) return false;
        const property = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        if (!value || value === "") return false;
        if (property === "right" || property === "bottom" || property === "transform" || property === "left" || property === "top" || property === "inset") {
          return false;
        }
        if (property.startsWith("border-image")) {
          return false;
        }
        return true;
      }).join("; ");
      if (newCssText) newCssText += "; ";
      newCssText += `left: ${targetLeft}px; top: ${targetTop}px; right: auto; bottom: auto; transform: none`;
      this.element.style.cssText = newCssText;
    }
    const finalRect = this.element.getBoundingClientRect();
    this.dragOffsetX = clientX - finalRect.left;
    this.dragOffsetY = clientY - finalRect.top;
    this.isDragging = true;
    this.element.classList.add(`${this.options.classPrefix}-dragging`);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    if ("PointerEvent" in window) {
      document.addEventListener("pointermove", this.handlers.pointermove, { passive: false });
    }
  }
  drag(clientX, clientY) {
    if (!this.isDragging) return;
    let newX = clientX - this.dragOffsetX - this.positionOffsetX;
    let newY = clientY - this.dragOffsetY - this.positionOffsetY;
    if (this.options.constrainToViewport) {
      const rect = this.element.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
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
    if (this.options.onDrag) {
      this.options.onDrag({ x: newX, y: newY });
    }
  }
  stopDragging() {
    this.isDragging = false;
    this.element.classList.remove(`${this.options.classPrefix}-dragging`);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if ("PointerEvent" in window) {
      document.removeEventListener("pointermove", this.handlers.pointermove);
    }
    this.manuallyPositioned = true;
    if (this.options.onDragEnd) {
      this.options.onDragEnd();
    }
  }
  startResizing(clientX, clientY) {
    this.isResizing = true;
    this.resizeStartX = clientX;
    this.resizeStartY = clientY;
    const rect = this.element.getBoundingClientRect();
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;
    this.resizeStartLeft = rect.left;
    this.resizeStartTop = rect.top;
    this.element.classList.add(`${this.options.classPrefix}-resizing`);
    document.body.style.userSelect = "none";
    if ("PointerEvent" in window) {
      document.addEventListener("pointermove", this.handlers.pointermove, { passive: false });
    }
    if (this.options.onResizeStart) {
      this.options.onResizeStart();
    }
  }
  resize(clientX, clientY) {
    if (!this.isResizing) return;
    const deltaX = clientX - this.resizeStartX;
    const deltaY = clientY - this.resizeStartY;
    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;
    let newLeft = this.resizeStartLeft;
    let newTop = this.resizeStartTop;
    const resizeDirection = this.resizeDirection ?? "";
    if (resizeDirection.includes("e")) {
      newWidth = Math.max(this.options.minWidth, this.resizeStartWidth + deltaX);
    }
    if (resizeDirection.includes("w")) {
      const proposedWidth = Math.max(this.options.minWidth, this.resizeStartWidth - deltaX);
      newLeft = this.resizeStartLeft + (this.resizeStartWidth - proposedWidth);
      newWidth = proposedWidth;
    }
    const maxWidthOption = typeof this.options.maxWidth === "function" ? this.options.maxWidth() : this.options.maxWidth;
    if (typeof maxWidthOption === "number" && Number.isFinite(maxWidthOption)) {
      const clampedWidth = Math.min(newWidth, maxWidthOption);
      if (clampedWidth !== newWidth && resizeDirection.includes("w")) {
        newLeft += newWidth - clampedWidth;
      }
      newWidth = clampedWidth;
    }
    if (!this.options.maintainAspectRatio) {
      if (resizeDirection.includes("s")) {
        newHeight = Math.max(this.options.minHeight, this.resizeStartHeight + deltaY);
      }
      if (resizeDirection.includes("n")) {
        const proposedHeight = Math.max(this.options.minHeight, this.resizeStartHeight - deltaY);
        newTop = this.resizeStartTop + (this.resizeStartHeight - proposedHeight);
        newHeight = proposedHeight;
      }
      const maxHeightOption = typeof this.options.maxHeight === "function" ? this.options.maxHeight() : this.options.maxHeight;
      if (typeof maxHeightOption === "number" && Number.isFinite(maxHeightOption)) {
        const clampedHeight = Math.min(newHeight, maxHeightOption);
        if (clampedHeight !== newHeight && resizeDirection.includes("n")) {
          newTop += newHeight - clampedHeight;
        }
        newHeight = clampedHeight;
      }
    }
    this.element.style.width = `${newWidth}px`;
    if (!this.options.maintainAspectRatio) {
      this.element.style.height = `${newHeight}px`;
    } else {
      this.element.style.height = "auto";
    }
    if (resizeDirection.includes("w")) {
      this.element.style.left = `${newLeft}px`;
    }
    if (resizeDirection.includes("n") && !this.options.maintainAspectRatio) {
      this.element.style.top = `${newTop}px`;
    }
    if (this.options.onResize) {
      this.options.onResize({ width: newWidth, height: newHeight, left: newLeft, top: newTop });
    }
  }
  stopResizing() {
    this.isResizing = false;
    this.resizeDirection = null;
    this.element.classList.remove(`${this.options.classPrefix}-resizing`);
    document.body.style.userSelect = "";
    if ("PointerEvent" in window) {
      document.removeEventListener("pointermove", this.handlers.pointermove);
    }
    this.manuallyPositioned = true;
    if (this.options.onResizeEnd) {
      this.options.onResizeEnd();
    }
  }
  toggleKeyboardDragMode() {
    if (this.keyboardDragMode) {
      this.disableKeyboardDragMode();
    } else {
      this.enableKeyboardDragMode();
    }
  }
  enableKeyboardDragMode() {
    this.keyboardDragMode = true;
    this.keyboardResizeMode = false;
    this.element.classList.add(`${this.options.classPrefix}-keyboard-drag`);
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-resize`);
    this.focusElement();
  }
  disableKeyboardDragMode() {
    this.keyboardDragMode = false;
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-drag`);
  }
  toggleKeyboardResizeMode() {
    if (this.keyboardResizeMode) {
      this.disableKeyboardResizeMode();
    } else {
      this.enableKeyboardResizeMode();
    }
  }
  enableKeyboardResizeMode() {
    this.keyboardResizeMode = true;
    this.keyboardDragMode = false;
    this.element.classList.add(`${this.options.classPrefix}-keyboard-resize`);
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-drag`);
    this.focusElement();
  }
  disableKeyboardResizeMode() {
    this.keyboardResizeMode = false;
    this.element.classList.remove(`${this.options.classPrefix}-keyboard-resize`);
  }
  enablePointerResizeMode({ focus = true } = {}) {
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
    if (typeof this.options.onPointerResizeToggle === "function") {
      this.options.onPointerResizeToggle(true);
    }
  }
  disablePointerResizeMode({ focus = false } = {}) {
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
    if (typeof this.options.onPointerResizeToggle === "function") {
      this.options.onPointerResizeToggle(false);
    }
  }
  togglePointerResizeMode() {
    if (this.pointerResizeMode) {
      this.disablePointerResizeMode();
    } else {
      this.enablePointerResizeMode();
    }
    return this.pointerResizeMode;
  }
  focusElement() {
    if (typeof this.element.focus === "function") {
      try {
        this.element.focus({ preventScroll: true });
      } catch {
        this.element.focus();
      }
    }
  }
  keyboardDrag(key, shiftKey) {
    const step = shiftKey ? this.options.keyboardStepLarge : this.options.keyboardStep;
    let currentLeft = parseFloat(this.element.style.left) || 0;
    let currentTop = parseFloat(this.element.style.top) || 0;
    const computedStyle = window.getComputedStyle(this.element);
    if (computedStyle.transform !== "none") {
      const rect = this.element.getBoundingClientRect();
      currentLeft = rect.left;
      currentTop = rect.top;
      this.element.style.transform = "none";
      this.element.style.left = `${currentLeft}px`;
      this.element.style.top = `${currentTop}px`;
    }
    let newX = currentLeft;
    let newY = currentTop;
    switch (key) {
      case "ArrowLeft":
        newX -= step;
        break;
      case "ArrowRight":
        newX += step;
        break;
      case "ArrowUp":
        newY -= step;
        break;
      case "ArrowDown":
        newY += step;
        break;
    }
    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
    if (this.options.onDrag) {
      this.options.onDrag({ x: newX, y: newY });
    }
  }
  keyboardResize(key, shiftKey) {
    const step = shiftKey ? this.options.keyboardStepLarge : this.options.keyboardStep;
    const rect = this.element.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    switch (key) {
      case "ArrowLeft":
        width -= step;
        break;
      case "ArrowRight":
        width += step;
        break;
      case "ArrowUp":
        if (this.options.maintainAspectRatio) {
          width += step;
        } else {
          height -= step;
        }
        break;
      case "ArrowDown":
        if (this.options.maintainAspectRatio) {
          width -= step;
        } else {
          height += step;
        }
        break;
    }
    width = Math.max(this.options.minWidth, width);
    height = Math.max(this.options.minHeight, height);
    this.element.style.width = `${width}px`;
    if (!this.options.maintainAspectRatio) {
      this.element.style.height = `${height}px`;
    } else {
      this.element.style.height = "auto";
    }
    if (this.options.onResize) {
      this.options.onResize({ width, height });
    }
  }
  resetPosition() {
    this.element.style.left = "50%";
    this.element.style.top = "50%";
    this.element.style.transform = "translate(-50%, -50%)";
    this.element.style.right = "";
    this.element.style.bottom = "";
    this.manuallyPositioned = false;
    if (this.options.onDrag) {
      this.options.onDrag({ centered: true });
    }
  }
  destroy() {
    const dragHandle = this.options.dragHandle || this.element;
    this.disablePointerResizeMode();
    dragHandle.removeEventListener("mousedown", this.handlers.mousedown);
    dragHandle.removeEventListener("touchstart", this.handlers.touchstart);
    dragHandle.removeEventListener("pointerdown", this.handlers.pointerdown);
    document.removeEventListener("mousemove", this.handlers.mousemove);
    document.removeEventListener("mouseup", this.handlers.mouseup);
    document.removeEventListener("touchmove", this.handlers.touchmove);
    document.removeEventListener("touchend", this.handlers.touchend);
    document.removeEventListener("pointermove", this.handlers.pointermove);
    document.removeEventListener("pointerup", this.handlers.pointerup);
    document.removeEventListener("pointercancel", this.handlers.pointercancel);
    this.element.removeEventListener("keydown", this.handlers.keydown);
    if (this.options.resizeHandles && this.options.resizeHandles.length > 0) {
      this.options.resizeHandles.forEach((handle) => {
        handle.removeEventListener("mousedown", this.handlers.resizeHandleMousedown);
        handle.removeEventListener("touchstart", this.handlers.resizeHandleMousedown);
        handle.removeEventListener("pointerdown", this.handlers.resizeHandlePointerDown);
      });
    }
    this.element.classList.remove(
      `${this.options.classPrefix}-dragging`,
      `${this.options.classPrefix}-resizing`,
      `${this.options.classPrefix}-keyboard-drag`,
      `${this.options.classPrefix}-keyboard-resize`
    );
  }
};

export {
  DraggableResizable
};
//# sourceMappingURL=vidply.chunk-JJ47NO24.js.map
