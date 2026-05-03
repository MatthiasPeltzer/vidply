/*!
 * VidPly v1.1.12 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  DraggableResizable,
  createIconElement
} from "./vidply.chunk-7KJ26XHK.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-SQ6JPO2C.js";

// src/core/FloatingPlayerManager.ts
var FLOATING_CLAIM_EVENT = "vidply:floating-claim";
var DEFAULT_WIDTH = 400;
var MIN_WIDTH = 240;
var EDGE_MARGIN = 16;
var FloatingPlayerManager = class {
  player;
  classPrefix;
  shell;
  dragHandle;
  closeButton;
  resizeHandles;
  placeholder;
  draggable;
  originalParent;
  originalNextSibling;
  intersectionObserver;
  observerTarget;
  lastRatio;
  _autoDismissedThisPlay;
  _playListenerAttached;
  _onPlayAfterDismiss;
  _onClaim;
  _onResize;
  _onKeyDown;
  _onEnterFullscreen;
  _destroyed;
  _triggerFocusEl;
  _claimId;
  constructor(player) {
    this.player = player;
    this.classPrefix = player.options.classPrefix || "vidply";
    this.shell = null;
    this.dragHandle = null;
    this.closeButton = null;
    this.resizeHandles = [];
    this.placeholder = null;
    this.draggable = null;
    this.originalParent = null;
    this.originalNextSibling = null;
    this.intersectionObserver = null;
    this.observerTarget = null;
    this.lastRatio = 1;
    this._autoDismissedThisPlay = false;
    this._playListenerAttached = false;
    this._onPlayAfterDismiss = null;
    this._onClaim = null;
    this._onResize = null;
    this._onKeyDown = null;
    this._onEnterFullscreen = null;
    this._destroyed = false;
    this._triggerFocusEl = null;
    this._claimId = `floating-${player.instanceId}-${Date.now()}`;
    this._setupClaimListener();
    this._setupFullscreenGuard();
    this._startObserving();
  }
  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------
  togglePinned(triggerEl) {
    if (this._destroyed) return;
    if (this.player.state.floating === "pinned") {
      this._autoDismissedThisPlay = true;
      this._armPlayListenerToClearDismiss();
      this.exit("manual");
      return;
    }
    this._autoDismissedThisPlay = false;
    this._triggerFocusEl = triggerEl || this._activeElement();
    this.enter("pinned");
  }
  enter(reason) {
    if (this._destroyed) return;
    if (this.player.state.floating === reason) return;
    if (!this._canFloat(reason)) {
      return;
    }
    if (this.player.state.floating && this.player.state.floating !== reason) {
      this.player.state.floating = reason;
      this.player.emit("floatingchange", reason);
      return;
    }
    this._claimSingleton();
    this._ensureShell();
    this._mountIntoShell();
    this._applyInitialGeometry();
    this.player.state.floating = reason;
    this.player.emit("floatingchange", reason);
    queueMicrotask(() => {
      if (this.closeButton && this.player.state.floating) {
        try {
          this.closeButton.focus({ preventScroll: true });
        } catch {
        }
      }
    });
  }
  exit(reason = "manual") {
    if (this._destroyed && reason !== "destroy") return;
    if (!this.player.state.floating) return;
    this._unmountFromShell();
    this._teardownShell();
    const priorTrigger = this._triggerFocusEl;
    this._triggerFocusEl = null;
    this.player.state.floating = null;
    this.player.emit("floatingchange", null);
    if ((reason === "manual" || reason === "dismiss") && priorTrigger) {
      try {
        priorTrigger.focus({ preventScroll: true });
      } catch {
      }
    }
  }
  /**
   * Close button: pause, dismiss, and prevent auto-float until the next
   * user-initiated play event.
   */
  dismiss() {
    if (this._destroyed) return;
    this._autoDismissedThisPlay = true;
    this._armPlayListenerToClearDismiss();
    try {
      this.player.pause();
    } catch {
    }
    this.exit("dismiss");
  }
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this.player.state && this.player.state.floating) {
      try {
        this.exit("destroy");
      } catch {
      }
    }
    if (this.intersectionObserver) {
      try {
        this.intersectionObserver.disconnect();
      } catch {
      }
      this.intersectionObserver = null;
    }
    this.observerTarget = null;
    if (this._onClaim) {
      window.removeEventListener(FLOATING_CLAIM_EVENT, this._onClaim);
      this._onClaim = null;
    }
    if (this._onResize) {
      window.removeEventListener("resize", this._onResize);
      this._onResize = null;
    }
    if (this._onEnterFullscreen) {
      this.player.off("enterfullscreen", this._onEnterFullscreen);
      this._onEnterFullscreen = null;
    }
    if (this._onPlayAfterDismiss && this._playListenerAttached) {
      this.player.off("play", this._onPlayAfterDismiss);
      this._playListenerAttached = false;
      this._onPlayAfterDismiss = null;
    }
  }
  // ---------------------------------------------------------------
  // Internal: guards
  // ---------------------------------------------------------------
  _canFloat(reason) {
    if (!this.player.options.floating) return false;
    if (!this.player.container) return false;
    if (!this.player.element || this.player.element.tagName !== "VIDEO") return false;
    if (this.player.state.fullscreen) return false;
    if (this.player.playlistManager) return false;
    const minWidth = this.player.options.floatingMinViewportWidth ?? 768;
    if (window.innerWidth < minWidth) return false;
    if (reason === "auto") {
      if (this._autoDismissedThisPlay) return false;
      if (this.player.state.paused) return false;
      if (!this.player.state.hasStartedPlayback) return false;
    }
    return true;
  }
  _claimSingleton() {
    try {
      window.dispatchEvent(new CustomEvent(FLOATING_CLAIM_EVENT, {
        detail: { claimId: this._claimId }
      }));
    } catch {
    }
  }
  _setupClaimListener() {
    this._onClaim = (event) => {
      const detail = event.detail;
      if (!detail || detail.claimId === this._claimId) return;
      if (this.player.state.floating) {
        this.exit("claim");
      }
    };
    window.addEventListener(FLOATING_CLAIM_EVENT, this._onClaim);
    this._onResize = () => {
      const minWidth = this.player.options.floatingMinViewportWidth ?? 768;
      if (this.player.state.floating && window.innerWidth < minWidth) {
        this.exit("auto");
      }
    };
    window.addEventListener("resize", this._onResize);
  }
  _setupFullscreenGuard() {
    this._onEnterFullscreen = () => {
      if (this.player.state.floating) {
        this.exit("manual");
      }
    };
    this.player.on("enterfullscreen", this._onEnterFullscreen);
  }
  _armPlayListenerToClearDismiss() {
    if (this._playListenerAttached) return;
    this._onPlayAfterDismiss = () => {
      this._autoDismissedThisPlay = false;
      if (this._onPlayAfterDismiss) {
        this.player.off("play", this._onPlayAfterDismiss);
      }
      this._playListenerAttached = false;
      this._onPlayAfterDismiss = null;
    };
    this.player.on("play", this._onPlayAfterDismiss);
    this._playListenerAttached = true;
  }
  // ---------------------------------------------------------------
  // Internal: IntersectionObserver for scroll-triggered auto-float
  // ---------------------------------------------------------------
  _startObserving() {
    if (!("IntersectionObserver" in window)) return;
    if (!this.player.container) return;
    this.observerTarget = this.player.container;
    this.intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      this.lastRatio = entry.intersectionRatio;
      if (this.player.options.debug) {
        try {
          console.log("[vidply:floating] intersection", {
            ratio: Number(entry.intersectionRatio.toFixed(3)),
            state: this.player.state.floating,
            paused: this.player.state.paused,
            hasStartedPlayback: this.player.state.hasStartedPlayback,
            dismissed: this._autoDismissedThisPlay
          });
        } catch {
        }
      }
      if (this.player.state.floating === "auto") {
        if (entry.intersectionRatio > 0.5) {
          this.exit("auto");
        }
        return;
      }
      if (this.player.state.floating === "pinned") {
        return;
      }
      if (entry.intersectionRatio < 0.1 && this._canFloat("auto")) {
        this.enter("auto");
      }
    }, { threshold: [0, 0.1, 0.5, 0.9] });
    this.intersectionObserver.observe(this.observerTarget);
  }
  _retargetObserver(target) {
    if (!this.intersectionObserver) return;
    if (this.observerTarget) {
      try {
        this.intersectionObserver.unobserve(this.observerTarget);
      } catch {
      }
    }
    this.observerTarget = target;
    try {
      this.intersectionObserver.observe(target);
    } catch {
    }
  }
  // ---------------------------------------------------------------
  // Internal: shell DOM
  // ---------------------------------------------------------------
  _ensureShell() {
    if (this.shell) return;
    this.shell = DOMUtils.createElement("div", {
      className: `${this.classPrefix}-floating-shell`,
      attributes: {
        "role": "dialog",
        "aria-modal": "false",
        "aria-label": i18n.t("player.floatingPlayer"),
        "data-vidply-floating": "true",
        "tabindex": "-1"
      }
    });
    this.dragHandle = DOMUtils.createElement("div", {
      className: `${this.classPrefix}-floating-drag-handle`,
      attributes: { "aria-hidden": "true" }
    });
    this.shell.appendChild(this.dragHandle);
    this.closeButton = DOMUtils.createElement("button", {
      className: `${this.classPrefix}-floating-close`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.floatingPlayerClose"),
        "title": i18n.t("player.floatingPlayerClose")
      }
    });
    this.closeButton.appendChild(createIconElement("close"));
    this.closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.dismiss();
    });
    this.shell.appendChild(this.closeButton);
    this._createResizeHandles();
    this.resizeHandles.forEach((handle) => this.shell.appendChild(handle));
    this._onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        this.dismiss();
      }
    };
    this.shell.addEventListener("keydown", this._onKeyDown);
  }
  _createResizeHandles() {
    const dirs = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    this.resizeHandles = dirs.map((dir) => DOMUtils.createElement("div", {
      className: `${this.classPrefix}-floating-resize-handle ${this.classPrefix}-floating-resize-${dir}`,
      attributes: {
        "data-direction": dir,
        "aria-hidden": "true"
      }
    }));
  }
  _teardownShell() {
    if (this.draggable) {
      try {
        this.draggable.destroy();
      } catch {
      }
      this.draggable = null;
    }
    if (this.shell) {
      if (this._onKeyDown) {
        this.shell.removeEventListener("keydown", this._onKeyDown);
        this._onKeyDown = null;
      }
      if (this.shell.parentNode) {
        this.shell.parentNode.removeChild(this.shell);
      }
    }
    this.shell = null;
    this.dragHandle = null;
    this.closeButton = null;
    this.resizeHandles = [];
  }
  // ---------------------------------------------------------------
  // Internal: mount / unmount the player.container
  // ---------------------------------------------------------------
  _mountIntoShell() {
    const container = this.player.container;
    if (!container || !container.parentNode) return;
    if (!this.shell) return;
    const rect = container.getBoundingClientRect();
    this.originalParent = container.parentNode;
    this.originalNextSibling = container.nextSibling;
    this.placeholder = DOMUtils.createElement("div", {
      className: `${this.classPrefix}-floating-placeholder`,
      attributes: { "aria-hidden": "true" }
    });
    this.placeholder.style.width = `${Math.max(1, rect.width)}px`;
    this.placeholder.style.height = `${Math.max(1, rect.height)}px`;
    this.originalParent.insertBefore(this.placeholder, container);
    this.shell.appendChild(container);
    document.body.appendChild(this.shell);
    container.classList.add(`${this.classPrefix}-is-floating`);
    this._retargetObserver(this.placeholder);
  }
  _unmountFromShell() {
    const container = this.player.container;
    if (container) {
      container.classList.remove(`${this.classPrefix}-is-floating`);
      container.style.removeProperty("width");
      container.style.removeProperty("height");
    }
    if (this.placeholder && this.placeholder.parentNode) {
      if (container) {
        this.placeholder.parentNode.insertBefore(container, this.placeholder);
      }
      this.placeholder.parentNode.removeChild(this.placeholder);
    } else if (container && this.originalParent) {
      if (this.originalNextSibling && this.originalNextSibling.parentNode === this.originalParent) {
        this.originalParent.insertBefore(container, this.originalNextSibling);
      } else {
        this.originalParent.appendChild(container);
      }
    }
    this.placeholder = null;
    this.originalParent = null;
    this.originalNextSibling = null;
    if (container) {
      this._retargetObserver(container);
    }
  }
  // ---------------------------------------------------------------
  // Internal: initial geometry + drag/resize wiring
  // ---------------------------------------------------------------
  _applyInitialGeometry() {
    if (!this.shell) return;
    const prefs = this.player.storage?.getFloatingPreferences?.() || {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let width = prefs.width && prefs.width >= MIN_WIDTH ? prefs.width : DEFAULT_WIDTH;
    width = Math.min(width, Math.max(MIN_WIDTH, vw - EDGE_MARGIN * 2));
    const containerRect = this.player.container?.getBoundingClientRect();
    const aspect = containerRect && containerRect.height > 0 ? containerRect.width / containerRect.height : 16 / 9;
    const defaultHeight = Math.round(width / aspect);
    let height = prefs.height && prefs.height >= 100 ? prefs.height : defaultHeight;
    height = Math.min(height, Math.max(100, vh - EDGE_MARGIN * 2));
    let left;
    let top;
    if (typeof prefs.left === "number" && typeof prefs.top === "number") {
      left = Math.max(EDGE_MARGIN, Math.min(prefs.left, vw - width - EDGE_MARGIN));
      top = Math.max(EDGE_MARGIN, Math.min(prefs.top, vh - height - EDGE_MARGIN));
    } else {
      const pos = this.player.options.floatingPosition || "bottom-right";
      switch (pos) {
        case "bottom-left":
          left = EDGE_MARGIN;
          top = vh - height - EDGE_MARGIN;
          break;
        case "top-right":
          left = vw - width - EDGE_MARGIN;
          top = EDGE_MARGIN;
          break;
        case "top-left":
          left = EDGE_MARGIN;
          top = EDGE_MARGIN;
          break;
        case "bottom-right":
        default:
          left = vw - width - EDGE_MARGIN;
          top = vh - height - EDGE_MARGIN;
          break;
      }
    }
    this.shell.style.width = `${width}px`;
    this.shell.style.height = `${height}px`;
    this.shell.style.left = `${left}px`;
    this.shell.style.top = `${top}px`;
    this._initDraggable();
  }
  _initDraggable() {
    if (!this.shell) return;
    if (this.draggable) return;
    this.draggable = new DraggableResizable(this.shell, {
      dragHandle: this.dragHandle,
      resizeHandles: this.resizeHandles,
      constrainToViewport: true,
      maintainAspectRatio: true,
      minWidth: MIN_WIDTH,
      minHeight: 100,
      maxWidth: () => Math.max(MIN_WIDTH, window.innerWidth - EDGE_MARGIN * 2),
      maxHeight: () => Math.max(100, window.innerHeight - EDGE_MARGIN * 2),
      classPrefix: `${this.classPrefix}-floating`,
      keyboardDragKey: "d",
      keyboardResizeKey: "r",
      keyboardStep: 10,
      keyboardStepLarge: 50,
      pointerResizeIndicatorText: i18n.t("player.floatingPlayerDialog"),
      onDragEnd: () => this._savePrefs(),
      onResizeEnd: () => this._savePrefs(),
      onDragStart: (event) => {
        const target = event.target;
        if (!target) return true;
        if (target.closest(`.${this.classPrefix}-floating-close`)) return false;
        if (target.closest(`.${this.classPrefix}-controls`)) return false;
        if (target.closest(`.${this.classPrefix}-floating-resize-handle`)) return false;
        return true;
      }
    });
  }
  _savePrefs() {
    if (!this.shell || !this.player.storage?.saveFloatingPreferences) return;
    const rect = this.shell.getBoundingClientRect();
    this.player.storage.saveFloatingPreferences({
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      top: Math.round(rect.top)
    });
  }
  _activeElement() {
    const active = document.activeElement;
    return active && active instanceof HTMLElement ? active : null;
  }
};
export {
  FloatingPlayerManager
};
//# sourceMappingURL=vidply.FloatingPlayerManager-3UNT4M6W.js.map
