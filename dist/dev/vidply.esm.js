/*!
 * VidPly v1.2.13 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  TimeUtils
} from "./vidply.chunk-J52XY3IE.js";
import {
  createIconElement,
  createPlayOverlay
} from "./vidply.chunk-KWFBLB4D.js";
import {
  focusElement,
  setContainerChildrenInert,
  trapFocusInContainer
} from "./vidply.chunk-6VDVZHVT.js";
import {
  HTML5Renderer
} from "./vidply.chunk-OSK2MHE3.js";
import {
  CaptionManager
} from "./vidply.chunk-YXSCQMXM.js";
import {
  StorageManager
} from "./vidply.chunk-2BW3KV5P.js";
import {
  debounce,
  isMobile,
  rafWithTimeout,
  reducedMotionScrollOptions,
  throttle
} from "./vidply.chunk-SP2E252G.js";
import {
  DOMUtils,
  i18n,
  isForbiddenKey
} from "./vidply.chunk-IRBLODYO.js";

// src/utils/EventEmitter.ts
var EventEmitter = class {
  events = {};
  on(event, listener) {
    const listeners = this.events[event] ?? [];
    listeners.push(listener);
    this.events[event] = listeners;
    return this;
  }
  once(event, listener) {
    const onceListener = ((...args) => {
      listener(...args);
      this.off(event, onceListener);
    });
    return this.on(event, onceListener);
  }
  off(event, listener) {
    const listeners = this.events[event];
    if (!listeners) return this;
    if (!listener) {
      delete this.events[event];
    } else {
      this.events[event] = listeners.filter(
        (l) => l !== listener
      );
    }
    return this;
  }
  emit(event, ...args) {
    const listeners = this.events[event];
    if (!listeners) return this;
    listeners.forEach((listener) => {
      listener(...args);
    });
    return this;
  }
  removeAllListeners() {
    this.events = {};
    return this;
  }
};

// src/utils/VideoFrameCapture.ts
async function captureVideoFrame(video, time, options = {}) {
  if (!video || video.tagName !== "VIDEO") {
    return null;
  }
  const { restoreState = true, quality = 0.9, maxWidth, maxHeight } = options;
  const wasPlaying = !video.paused;
  const originalTime = video.currentTime;
  const originalMuted = video.muted;
  if (restoreState) {
    video.muted = true;
  }
  return new Promise((resolve) => {
    const captureFrame = () => {
      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;
        if (maxWidth && width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        if (maxHeight && height > maxHeight) {
          const ratio = maxHeight / height;
          height = maxHeight;
          width = Math.round(width * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataURL = canvas.toDataURL("image/jpeg", quality);
        if (restoreState) {
          video.currentTime = originalTime;
          video.muted = originalMuted;
          if (wasPlaying && !video.paused) {
            video.play().catch((e) => {
              if (typeof console !== "undefined" && console.debug) {
                console.debug("[VidPly] preview play() rejected:", e);
              }
            });
          }
        }
        resolve(dataURL);
      } catch (e) {
        if (typeof console !== "undefined" && console.debug) {
          console.debug("[VidPly] frame capture failed:", e);
        }
        if (restoreState) {
          video.currentTime = originalTime;
          video.muted = originalMuted;
          if (wasPlaying && !video.paused) {
            video.play().catch((err) => {
              if (typeof console !== "undefined" && console.debug) {
                console.debug("[VidPly] preview play() rejected:", err);
              }
            });
          }
        }
        resolve(null);
      }
    };
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      requestAnimationFrame(() => {
        requestAnimationFrame(captureFrame);
      });
    };
    const timeDiff = Math.abs(video.currentTime - time);
    if (timeDiff < 0.1 && video.readyState >= 2) {
      captureFrame();
    } else if (video.readyState >= 1) {
      video.addEventListener("seeked", onSeeked);
      video.currentTime = time;
    } else {
      const onLoadedMetadata = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("seeked", onSeeked);
        video.currentTime = time;
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);
    }
  });
}

// src/utils/DownloadInfo.ts
var MIME_TO_FORMAT = {
  "video/mp4": "MP4",
  "video/webm": "WebM",
  "video/ogg": "Ogg",
  "video/quicktime": "MOV",
  "video/x-matroska": "MKV",
  "video/x-msvideo": "AVI",
  "audio/mpeg": "MP3",
  "audio/mp3": "MP3",
  "audio/mp4": "M4A",
  "audio/x-m4a": "M4A",
  "audio/aac": "AAC",
  "audio/ogg": "Ogg",
  "audio/opus": "Opus",
  "audio/wav": "WAV",
  "audio/x-wav": "WAV",
  "audio/wave": "WAV",
  "audio/flac": "FLAC",
  "audio/x-flac": "FLAC",
  "audio/webm": "WebM"
};
var EXT_TO_FORMAT = {
  mp4: "MP4",
  m4v: "MP4",
  mov: "MOV",
  webm: "WebM",
  mkv: "MKV",
  avi: "AVI",
  ogv: "Ogg",
  ogg: "Ogg",
  oga: "Ogg",
  mp3: "MP3",
  m4a: "M4A",
  aac: "AAC",
  opus: "Opus",
  wav: "WAV",
  flac: "FLAC"
};
function inferFormatFromMime(mime) {
  if (!mime) return null;
  const trimmed = (mime.split(";")[0] ?? "").trim().toLowerCase();
  return MIME_TO_FORMAT[trimmed] || null;
}
function inferFormatFromUrl(url) {
  if (!url) return null;
  try {
    const cleaned = url.split("?")[0]?.split("#")[0] ?? "";
    const lastSegment = cleaned.split("/").pop() || "";
    const dotIndex = lastSegment.lastIndexOf(".");
    if (dotIndex < 0 || dotIndex === lastSegment.length - 1) return null;
    const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
    return EXT_TO_FORMAT[ext] || null;
  } catch {
    return null;
  }
}
function formatBytes(bytes, locale = "en") {
  if (!isFinite(bytes) || bytes < 0) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const fractionDigits = unitIndex < 2 ? 0 : 1;
  let formatted;
  try {
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value);
  } catch {
    formatted = value.toFixed(fractionDigits);
  }
  return `${formatted} ${units[unitIndex]}`;
}
async function fetchContentLength(url, options = {}) {
  if (!url || typeof fetch !== "function") return null;
  const signals = [];
  if (options.signal) signals.push(options.signal);
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    signals.push(AbortSignal.timeout(options.timeoutMs ?? 8e3));
  }
  let combinedSignal;
  if (signals.length === 1) combinedSignal = signals[0];
  else if (signals.length > 1) {
    const anyFn = AbortSignal.any;
    combinedSignal = anyFn ? anyFn(signals) : signals[0];
  }
  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "omit",
      cache: "no-store",
      signal: combinedSignal
    });
    if (!response.ok) return null;
    const header = response.headers.get("Content-Length");
    if (!header) return null;
    const size = Number(header);
    return Number.isFinite(size) && size > 0 ? size : null;
  } catch (error) {
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[vidply] HEAD request for download size failed:", error);
    }
    return null;
  }
}
function buildDownloadLabel(parts) {
  const { baseLabel, format, sizeBytes, locale = "en" } = parts;
  const sizeStr = sizeBytes != null ? formatBytes(sizeBytes, locale) : null;
  if (format && sizeStr) {
    return parts.withFormatSizeTemplate.replace("{format}", format).replace("{size}", sizeStr);
  }
  if (format) {
    return parts.withFormatTemplate.replace("{format}", format);
  }
  if (sizeStr) {
    return parts.withSizeTemplate.replace("{size}", sizeStr);
  }
  return baseLabel;
}

// src/controls/ControlBar.ts
var menuButtonHandlers = /* @__PURE__ */ new WeakMap();
function getMenuButtonHandlers(button) {
  let entry = menuButtonHandlers.get(button);
  if (!entry) {
    entry = {};
    menuButtonHandlers.set(button, entry);
  }
  return entry;
}
function normalizeDownloadSize(value) {
  const size = typeof value === "string" ? Number(value) : value;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null;
  return size;
}
var ControlBar = class {
  player;
  _overflowMenuItemRef = null;
  controls;
  currentPreviewTime;
  element;
  hideTimeout;
  isDraggingProgress;
  isDraggingVolume;
  openMenu;
  openMenuButton;
  overflowResizeObserver = null;
  /** Player-event subscriptions grouped by the method that registered them,
   *  so rebuilds can detach-and-re-add per group without leaking. */
  _playerSubscriptions = [];
  /** Guards the one-time auto-hide DOM/player listener binding so control
   *  rebuilds (which re-call setupAutoHide) don't stack duplicate handlers. */
  _autoHideBound = false;
  /** Guards the one-time window-resize/fullscreen overflow listeners so
   *  control rebuilds (which re-call setupOverflowDetection) don't stack them.
   *  The ResizeObserver is still recreated each call for the new rightButtons. */
  _overflowGlobalBound = false;
  previewSupported = false;
  previewThumbnailCache = /* @__PURE__ */ new Map();
  previewThumbnailTimeout = null;
  previewUsingMainVideo = false;
  previewVideo = null;
  previewVideoInitialized = false;
  previewVideoReady = false;
  rightButtons;
  leftButtons;
  timeDisplayContainer = null;
  overflowMenuButton = null;
  /** Track of the currently open volume slider so a single pair of
   *  document listeners (installed once in {@link init}) can update the
   *  right element while dragging without being re-registered per open. */
  _activeVolumeTrack = null;
  /** Track of the currently rendered progress bar so document-level
   *  mousemove/mouseup handlers installed once in {@link init} can resolve
   *  the geometry without re-registering per drag. */
  _progressBarRect = null;
  constructor(player) {
    this.player = player;
    this.controls = {};
    this.hideTimeout = void 0;
    this.isDraggingProgress = false;
    this.isDraggingVolume = false;
    this.currentPreviewTime = null;
    this.openMenu = null;
    this.openMenuButton = null;
    this.init();
  }
  init() {
    this.createElement();
    this.createControls();
    this.updateDuration();
    this.updateProgress();
    this.updateLiveControls();
    this.attachEvents();
    this.setupAutoHide();
    this.setupOverflowDetection();
    this.setupGlobalDragListeners();
  }
  /**
   * Register a player-event listener tagged with a lifecycle `group` so it
   * can be detached before the owning method re-runs on a control rebuild.
   */
  subscribe(group, event, handler) {
    this.player.on(event, handler);
    this._playerSubscriptions.push({
      group,
      event,
      handler
    });
  }
  /**
   * Detach player-event listeners. With a `group`, only that group's
   * listeners are removed (and re-added by the method that owns it);
   * without one, every ControlBar subscription is removed (destroy path).
   */
  detachPlayerEvents(group) {
    const remaining = [];
    for (const sub of this._playerSubscriptions) {
      if (group === void 0 || sub.group === group) {
        this.player.off(sub.event, sub.handler);
      } else {
        remaining.push(sub);
      }
    }
    this._playerSubscriptions = remaining;
  }
  /**
   * Install a single pair of document-level mousemove/mouseup handlers
   * that both the progress bar drag and the volume slider drag reuse.
   *
   * This replaces the previous pattern where {@link showVolumeSlider}
   * and {@link setupProgressBarEvents} each attached their own
   * `document.addEventListener` calls on every call — the volume variant
   * in particular accumulated two extra document listeners on every menu
   * open for the life of the page. All listeners here are tied to the
   * Player's lifecycle AbortController so `destroy()` removes them.
   */
  setupGlobalDragListeners() {
    const signal = this.player.lifecycleSignal;
    document.addEventListener("mousemove", (e) => {
      if (this.isDraggingProgress && this._progressBarRect) {
        const rect = this._progressBarRect;
        const percent = rect.width > 0 ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
        const { start, end } = this.getProgressSeekRange();
        const span = end - start;
        this.player.seek(span > 0 ? start + percent * span : 0);
        return;
      }
      if (this.isDraggingVolume && this._activeVolumeTrack) {
        const rect = this._activeVolumeTrack.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
        this.player.setVolume(percent);
      }
    }, { signal });
    document.addEventListener("mouseup", () => {
      this.isDraggingProgress = false;
      this._progressBarRect = null;
      this.isDraggingVolume = false;
      this._activeVolumeTrack = null;
    }, { signal });
  }
  // Helper method to detect touch devices
  isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0 || (navigator.msMaxTouchPoints ?? 0) > 0;
  }
  // Smart menu positioning to avoid overflow
  positionMenu(menu, button, immediate = false) {
    const mobile = isMobile();
    const isOverflowMenu = menu.classList.contains(`${this.player.options.classPrefix}-overflow-menu-list`);
    const isFullscreen = this.player.state.fullscreen;
    const menuInPlayerContainer = menu.parentElement === this.player.container;
    if (menuInPlayerContainer && (isFullscreen || isOverflowMenu)) {
      const doFullscreenPositioning = () => {
        const buttonRect = button.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const containerRect = this.player.container.getBoundingClientRect();
        const buttonCenterX = buttonRect.left + buttonRect.width / 2 - containerRect.left;
        const buttonTop = buttonRect.top - containerRect.top;
        const buttonBottom = buttonRect.bottom - containerRect.top;
        const spaceAbove = buttonRect.top - containerRect.top;
        const spaceBelow = containerRect.bottom - buttonRect.bottom;
        if (spaceAbove >= menuRect.height + 20 || spaceAbove > spaceBelow) {
          menu.style.bottom = `${containerRect.height - buttonTop + 8}px`;
          menu.style.top = "auto";
          menu.classList.remove("vidply-menu-below");
        } else {
          menu.style.top = `${buttonBottom + 8}px`;
          menu.style.bottom = "auto";
          menu.classList.add("vidply-menu-below");
        }
        if (isOverflowMenu) {
          const buttonRight = buttonRect.right - containerRect.left;
          menu.style.left = "auto";
          menu.style.right = `${containerRect.width - buttonRight}px`;
          menu.style.transform = "none";
          const menuWidth = menuRect.width || menu.offsetWidth;
          if (menuWidth > 0) {
            const maxLeft = Math.max(0, buttonRight - menuWidth);
            const computedLeft = buttonRight - menuWidth;
            if (computedLeft < 0) {
              menu.style.left = `${maxLeft}px`;
              menu.style.right = "auto";
            }
          }
        } else {
          menu.style.left = `${buttonCenterX}px`;
          menu.style.right = "auto";
          menu.style.transform = "translateX(-50%)";
        }
      };
      if (immediate) {
        doFullscreenPositioning();
      } else {
        requestAnimationFrame(doFullscreenPositioning);
      }
      return;
    }
    if (mobile) {
      const isVolumeMenu = menu.classList.contains(`${this.player.options.classPrefix}-volume-menu`);
      const doMobilePositioning = () => {
        const parentContainer = button.parentElement;
        if (!parentContainer) return;
        const buttonRect = button.getBoundingClientRect();
        const parentRect = parentContainer.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        if (isVolumeMenu) {
          const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
          menu.style.left = `${buttonCenterX}px`;
          menu.style.right = "auto";
          menu.style.transform = "translateX(-50%)";
          return;
        }
        if (menuRect.right > viewportWidth) {
          menu.style.left = "auto";
          menu.style.right = "10px";
          menu.style.transform = "none";
        }
        if (menuRect.left < 0) {
          menu.style.left = "10px";
          menu.style.right = "auto";
          menu.style.transform = "none";
        }
        if (menuRect.top < 10) {
          menu.style.top = "10px";
          menu.style.bottom = "auto";
        }
        if (menuRect.bottom > viewportHeight - 10) {
          menu.style.bottom = "10px";
          menu.style.top = "auto";
        }
      };
      if (immediate) {
        doMobilePositioning();
      } else {
        requestAnimationFrame(doMobilePositioning);
      }
      return;
    }
    const doPositioning = () => {
      const buttonRect = button.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const parentContainer = button.parentElement;
      if (!parentContainer) return;
      const parentRect = parentContainer.getBoundingClientRect();
      const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
      const buttonBottom = buttonRect.bottom - parentRect.top;
      const buttonTop = buttonRect.top - parentRect.top;
      const spaceAbove = buttonRect.top;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      let menuTop = buttonTop - menuRect.height - 8;
      let menuBottom = null;
      if (spaceAbove < menuRect.height + 20 && spaceBelow > spaceAbove) {
        menuTop = null;
        const parentHeight = parentRect.bottom - parentRect.top;
        menuBottom = parentHeight - buttonBottom + 8;
        menu.classList.add("vidply-menu-below");
      } else {
        menu.classList.remove("vidply-menu-below");
      }
      let menuLeft = "auto";
      let menuRight = "auto";
      let transformX = "translateX(0)";
      if (isOverflowMenu) {
        menuLeft = "auto";
        menuRight = 0;
        transformX = "translateX(0)";
      } else {
        menuLeft = buttonCenterX - menuRect.width / 2;
        const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
        if (menuLeftAbsolute < 10) {
          menuLeft = 0;
          transformX = "translateX(0)";
        } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
          menuLeft = "auto";
          menuRight = 0;
          transformX = "translateX(0)";
        } else {
          menuLeft = buttonCenterX;
          transformX = "translateX(-50%)";
        }
      }
      if (menuTop !== null) {
        menu.style.top = `${menuTop}px`;
        menu.style.bottom = "auto";
      } else if (menuBottom !== null) {
        menu.style.top = "auto";
        menu.style.bottom = `${menuBottom}px`;
      }
      if (menuLeft !== "auto") {
        menu.style.left = `${menuLeft}px`;
        menu.style.right = "auto";
      } else {
        menu.style.left = "auto";
        menu.style.right = `${menuRight}px`;
      }
      menu.style.transform = transformX;
    };
    if (immediate) {
      doPositioning();
    } else {
      requestAnimationFrame(() => {
        setTimeout(doPositioning, 10);
      });
    }
  }
  // Helper method to insert menu into DOM (handles fullscreen vs normal mode)
  insertMenuIntoDOM(menu, button) {
    if (!menu.id) {
      menu.id = `vidply-menu-${Math.random().toString(36).substr(2, 9)}`;
    }
    button.setAttribute("aria-controls", menu.id);
    button.setAttribute("aria-haspopup", "true");
    const prefix = this.player.options.classPrefix;
    const isOverflowMenuList = menu.classList.contains(`${prefix}-overflow-menu-list`);
    const isFullscreen = this.player.state.fullscreen;
    if (isFullscreen || isOverflowMenuList) {
      this.player.container.appendChild(menu);
      menu.dataset.triggerButton = button.getAttribute("aria-label") || "button";
    } else {
      button.insertAdjacentElement("afterend", menu);
    }
  }
  // Helper method to attach close-on-outside-click behavior to menus
  attachMenuCloseHandler(menu, button, preventCloseOnInteraction = false) {
    if (this.openMenu && this.openMenu !== menu && this.openMenuButton) {
      const previousHandlers = menuButtonHandlers.get(this.openMenuButton);
      if (previousHandlers?.blur) {
        this.openMenuButton.removeEventListener("blur", previousHandlers.blur);
        delete previousHandlers.blur;
      }
      if (previousHandlers?.mousedown) {
        this.openMenuButton.removeEventListener("mousedown", previousHandlers.mousedown);
        delete previousHandlers.mousedown;
      }
      if (this.openMenu && document.contains(this.openMenu)) {
        this.openMenu.remove();
      } else if (this.openMenu && this.openMenu.parentNode) {
        this.openMenu.parentNode.removeChild(this.openMenu);
      }
      if (this.openMenuButton) {
        this.openMenuButton.setAttribute("aria-expanded", "false");
      }
    }
    this.openMenu = menu;
    this.openMenuButton = button;
    this.positionMenu(menu, button);
    if (button) {
      button.setAttribute("aria-expanded", "true");
    }
    let isClickingButton = false;
    let blurHandlerActive = true;
    const handleButtonMousedown = () => {
      isClickingButton = true;
      blurHandlerActive = false;
      setTimeout(() => {
        isClickingButton = false;
        blurHandlerActive = true;
      }, 200);
    };
    button.addEventListener("mousedown", handleButtonMousedown);
    getMenuButtonHandlers(button).mousedown = handleButtonMousedown;
    const handleButtonBlur = (e) => {
      if (!blurHandlerActive || isClickingButton) {
        return;
      }
      if (this.openMenu !== menu) {
        return;
      }
      const relatedTarget = e.relatedTarget;
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!blurHandlerActive || this.openMenu !== menu) {
            return;
          }
          const activeElement = document.activeElement;
          if (menu.contains(activeElement)) {
            return;
          }
          const signLanguageWrapper = this.player.signLanguageWrapper;
          const transcriptWindow = this.player.transcriptManager?.transcriptWindow;
          if (signLanguageWrapper && signLanguageWrapper.contains(activeElement) || transcriptWindow && transcriptWindow.contains(activeElement)) {
            return;
          }
          const controlBarButtons = Array.from(this.element.querySelectorAll("button"));
          const isFocusOnAnotherButton = activeElement !== null && controlBarButtons.includes(activeElement) && activeElement !== button;
          const isRelatedTargetAnotherButton = relatedTarget !== null && relatedTarget instanceof Element && controlBarButtons.includes(relatedTarget) && relatedTarget !== button;
          if (isFocusOnAnotherButton || isRelatedTargetAnotherButton) {
            if (this.openMenu !== menu) {
              return;
            }
            if (menu && document.contains(menu)) {
              menu.remove();
            } else if (menu && menu.parentNode) {
              menu.parentNode.removeChild(menu);
            }
            if (button) {
              button.setAttribute("aria-expanded", "false");
            }
            if (this.openMenu === menu) {
              this.openMenu = null;
              this.openMenuButton = null;
            }
            button.removeEventListener("blur", handleButtonBlur);
            button.removeEventListener("mousedown", handleButtonMousedown);
            const handlers = menuButtonHandlers.get(button);
            if (handlers) {
              delete handlers.blur;
              delete handlers.mousedown;
            }
          }
        }, 10);
      });
    };
    button.addEventListener("blur", handleButtonBlur);
    getMenuButtonHandlers(button).blur = handleButtonBlur;
    const closeMenuAndUpdateAria = () => {
      this.closeMenuAndReturnFocus(menu, button);
    };
    let documentClickHandler = null;
    let documentEscapeHandler = null;
    setTimeout(() => {
      documentClickHandler = (e) => {
        if (preventCloseOnInteraction && menu.contains(e.target)) {
          return;
        }
        if (this.openMenu === menu && !menu.contains(e.target) && !button.contains(e.target)) {
          closeMenuAndUpdateAria();
          if (documentClickHandler) {
            document.removeEventListener("click", documentClickHandler);
          }
          if (documentEscapeHandler) {
            document.removeEventListener("keydown", documentEscapeHandler);
          }
        }
      };
      documentEscapeHandler = (e) => {
        if (e.key === "Escape" && this.openMenu === menu) {
          e.preventDefault();
          e.stopPropagation();
          this.closeMenuAndReturnFocus(menu, button, true);
          if (documentClickHandler) {
            document.removeEventListener("click", documentClickHandler);
          }
          if (documentEscapeHandler) {
            document.removeEventListener("keydown", documentEscapeHandler);
          }
        }
      };
      const signal = this.player.lifecycleSignal;
      document.addEventListener("click", documentClickHandler, { signal });
      document.addEventListener("keydown", documentEscapeHandler, { signal });
    }, 100);
  }
  // Helper method to close menu and return focus to button
  closeMenuAndReturnFocus(menu, button, returnFocus = true) {
    if (menu) {
      if (document.contains(menu)) {
        menu.remove();
      } else if (menu.parentNode) {
        menu.parentNode.removeChild(menu);
      }
    }
    if (button) {
      button.setAttribute("aria-expanded", "false");
      if (menu && menu.id) {
        button.removeAttribute("aria-controls");
      }
      if (returnFocus) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (button && document.contains(button)) {
              button.focus({ preventScroll: true });
            }
          }, 0);
        });
      }
    }
    if (this.openMenu === menu) {
      this.openMenu = null;
      this.openMenuButton = null;
    }
  }
  // Close any open menu when tabbing to another button or clicking another button
  closeOpenMenu() {
    if (this.openMenu && this.openMenuButton) {
      if (this.openMenu && document.contains(this.openMenu)) {
        this.openMenu.remove();
      } else if (this.openMenu && this.openMenu.parentNode) {
        this.openMenu.parentNode.removeChild(this.openMenu);
      }
      if (this.openMenuButton) {
        this.openMenuButton.setAttribute("aria-expanded", "false");
      }
      this.openMenu = null;
      this.openMenuButton = null;
    }
  }
  // Helper method to add keyboard navigation to menus (arrow keys)
  attachMenuKeyboardNavigation(menu, button) {
    const menuItems = Array.from(
      menu.querySelectorAll(`.${this.player.options.classPrefix}-menu-item`)
    ).filter((item) => item.getAttribute("aria-disabled") !== "true");
    if (menuItems.length === 0) return;
    const handleKeyDown = (e) => {
      const currentIndex = menuItems.indexOf(document.activeElement);
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          e.stopPropagation();
          const nextIndex = (currentIndex + 1) % menuItems.length;
          const nextItem = menuItems[nextIndex];
          if (nextItem) {
            nextItem.focus({ preventScroll: false });
            nextItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          e.stopPropagation();
          const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
          const prevItem = menuItems[prevIndex];
          if (prevItem) {
            prevItem.focus({ preventScroll: false });
            prevItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "ArrowLeft":
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          break;
        case "Home": {
          e.preventDefault();
          e.stopPropagation();
          const homeItem = menuItems[0];
          if (homeItem) {
            homeItem.focus({ preventScroll: false });
            homeItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "End": {
          e.preventDefault();
          e.stopPropagation();
          const endItem = menuItems[menuItems.length - 1];
          if (endItem) {
            endItem.focus({ preventScroll: false });
            endItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "Enter":
        case " ":
          e.preventDefault();
          e.stopPropagation();
          if (document.activeElement && menuItems.includes(document.activeElement)) {
            document.activeElement.click();
            focusElement(button, { delay: 0 });
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          this.closeMenuAndReturnFocus(menu, button, true);
          break;
      }
    };
    menu.addEventListener("keydown", handleKeyDown);
  }
  createElement() {
    this.element = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls`,
      attributes: {
        "role": "region",
        "aria-label": i18n.t("player.label") + " controls"
      }
    });
  }
  createControls() {
    this.detachPlayerEvents("controls");
    const progressTimeWrapper = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-time-wrapper`
    });
    if (this.player.options.progressBar) {
      this.createProgressBar();
      if (this.controls.progress) {
        progressTimeWrapper.appendChild(this.controls.progress);
      }
    }
    if (this.player.options.currentTime || this.player.options.duration) {
      progressTimeWrapper.appendChild(this.createTimeDisplay());
    }
    this.element.appendChild(progressTimeWrapper);
    const buttonContainer = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls-buttons`
    });
    const leftButtons = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls-left`
    });
    this.leftButtons = leftButtons;
    if (this.player.playlistManager) {
      leftButtons.appendChild(this.createPreviousButton());
    }
    if (this.player.options.playPauseButton) {
      leftButtons.appendChild(this.createPlayPauseButton());
    }
    const restartButton = this.createRestartButton();
    leftButtons.appendChild(restartButton);
    this.controls.restart = restartButton;
    if (this.player.playlistManager) {
      leftButtons.appendChild(this.createNextButton());
    }
    const rewindButton = this.createRewindButton();
    leftButtons.appendChild(rewindButton);
    this.controls.rewind = rewindButton;
    const forwardButton = this.createForwardButton();
    leftButtons.appendChild(forwardButton);
    this.controls.forward = forwardButton;
    if (this.shouldMountLiveControlsAtBuild()) {
      this.ensureGoLiveButton();
    }
    if (this.player.options.volumeControl) {
      if (this.isTouchDevice()) {
        leftButtons.appendChild(this.createMuteButton());
      } else {
        leftButtons.appendChild(this.createVolumeControl());
      }
    }
    this.rightButtons = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-controls-right`
    });
    const hasChapters = this.hasChapterTracks();
    const hasCaptions = this.hasCaptionTracks();
    const hasQualityLevels = this.hasQualityLevels();
    const hasAudioDescription = this.hasAudioDescription();
    if (this.player.options.chaptersButton && hasChapters) {
      const btn = this.createChaptersButton();
      btn.dataset.overflowPriority = "3";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    if (this.player.options.captionsButton && hasCaptions) {
      const btn = this.createCaptionsButton();
      btn.dataset.overflowPriority = "1";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    if (this.player.options.captionStyleButton && hasCaptions) {
      const btn = this.createCaptionStyleButton();
      btn.dataset.overflowPriority = "3";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    const src = this.player.currentSource || this.player.element?.getAttribute?.("src") || this.player.element?.currentSrc || this.player.element?.src || this.player.element?.querySelector?.("source")?.getAttribute?.("src") || this.player.element?.querySelector?.("source")?.src || "";
    const isHlsSource = typeof src === "string" && src.includes(".m3u8");
    const isDashSource = typeof src === "string" && src.includes(".mpd");
    const isVideoElement = this.player.element?.tagName?.toLowerCase() === "video";
    const hideSpeedForThisPlayer = this.player.state.isLive || Boolean(this.player.options.hideSpeedForHls) && isHlsSource || Boolean(this.player.options.hideSpeedForHlsVideo) && isHlsSource && isVideoElement || Boolean(this.player.options.hideSpeedForDash) && isDashSource || Boolean(this.player.options.hideSpeedForDashVideo) && isDashSource && isVideoElement;
    if (this.player.options.speedButton && !hideSpeedForThisPlayer) {
      const btn = this.createSpeedButton();
      btn.dataset.overflowPriority = "1";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    if (this.player.options.audioDescriptionButton && hasAudioDescription) {
      const btn = this.createAudioDescriptionButton();
      btn.dataset.overflowPriority = "2";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    if (this.player.options.transcriptButton && hasCaptions) {
      const btn = this.createTranscriptButton();
      btn.dataset.overflowPriority = "3";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    if (this.player.playlistManager && this.player.options.playlistToggleButton !== false) {
      this.rightButtons.appendChild(this.createPlaylistToggleButton());
    }
    const hasSignLanguage = this.hasSignLanguage();
    const showSignLanguageButtons = this.player.options.signLanguageButton !== false && hasSignLanguage;
    const signLanguageDisplayMode = this.player.options.signLanguageDisplayMode || "both";
    if (showSignLanguageButtons) {
      if (["pip", "both"].includes(signLanguageDisplayMode)) {
        const pipBtn = this.createSignLanguageButton();
        pipBtn.dataset.overflowPriority = "3";
        pipBtn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(pipBtn);
      }
      if (["main", "both"].includes(signLanguageDisplayMode)) {
        const mainViewBtn = this.createSignLanguageInMainViewButton();
        mainViewBtn.dataset.overflowPriority = "3";
        mainViewBtn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(mainViewBtn);
      }
    }
    if (this.player.options.qualityButton && hasQualityLevels) {
      const btn = this.createQualityButton();
      btn.dataset.overflowPriority = "2";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    if (this.player.options.downloadButton) {
      const target = this.resolveDownloadTarget();
      if (target) {
        const btn = this.createDownloadButton(target.url, target);
        btn.dataset.overflowPriority = "2";
        btn.dataset.overflowPriorityMobile = "3";
        this.rightButtons.appendChild(btn);
      }
    }
    const pipEnabled = this.player.options.pipButton && (this.player.options.floating || "pictureInPictureEnabled" in document);
    const isAudio = this.player.element.tagName.toLowerCase() === "audio";
    if (pipEnabled && !(this.player.options.floating && isAudio)) {
      const btn = this.createPipButton();
      if (this.player.options.floating) {
        btn.dataset.skipOverflow = "true";
        btn.dataset.overflowPriority = "1";
        btn.dataset.overflowPriorityMobile = "1";
      } else {
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
      }
      this.rightButtons.appendChild(btn);
    }
    if (this.player.options.helpButton && this.player.options.keyboard) {
      const btn = this.createHelpButton();
      btn.dataset.overflowPriority = "3";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    this.overflowMenuButton = this.createOverflowMenuButton();
    this.overflowMenuButton.style.display = "none";
    this.rightButtons.appendChild(this.overflowMenuButton);
    const isAudioPlayer = this.player.element.tagName.toLowerCase() === "audio";
    if (this.player.options.fullscreenButton && !isAudioPlayer) {
      const btn = this.createFullscreenButton();
      btn.dataset.overflowPriority = "1";
      btn.dataset.overflowPriorityMobile = "1";
      this.rightButtons.appendChild(btn);
    }
    buttonContainer.appendChild(leftButtons);
    buttonContainer.appendChild(this.rightButtons);
    this.element.appendChild(buttonContainer);
    this.ensureButtonTooltips(buttonContainer);
  }
  /**
   * Ensure all buttons in the controls have title attributes
   * Uses aria-label as title if title is not present
   */
  ensureButtonTooltips(container) {
    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => {
      if (button.querySelector(`.${this.player.options.classPrefix}-tooltip`)) {
        return;
      }
      if (button.querySelector(`.${this.player.options.classPrefix}-button-text`)) {
        return;
      }
      if (button.getAttribute("role") === "menuitem" || button.classList.contains(`${this.player.options.classPrefix}-settings-item`) || button.classList.contains(`${this.player.options.classPrefix}-menu-item`) || button.classList.contains(`${this.player.options.classPrefix}-transcript-settings-item`) || button.classList.contains(`${this.player.options.classPrefix}-sign-language-settings-item`) || button.classList.contains(`${this.player.options.classPrefix}-popup-settings-item`)) {
        return;
      }
      const ariaLabel = button.getAttribute("aria-label");
      if (ariaLabel) {
        DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
      }
    });
  }
  // Helper methods to check for available features
  hasChapterTracks() {
    const textTracks = this.player.element.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      if (textTracks[i]?.kind === "chapters") return true;
    }
    const trackEls = Array.from(this.player.element.querySelectorAll('track[kind="chapters"]'));
    if (trackEls.length > 0) return true;
    const current = this.player.playlistManager?.getCurrentTrack?.();
    if (current?.tracks && Array.isArray(current.tracks)) {
      const tracks = current.tracks;
      return tracks.some((t) => t?.kind === "chapters");
    }
    return false;
  }
  hasCaptionTracks() {
    const textTracks = this.player.element.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      const tt = textTracks[i];
      if (tt && (tt.kind === "captions" || tt.kind === "subtitles") && !tt._vidplyStale) {
        return true;
      }
    }
    const trackEls = Array.from(this.player.element.querySelectorAll("track"));
    if (trackEls.some((el) => el.getAttribute("kind") === "captions" || el.getAttribute("kind") === "subtitles")) {
      return true;
    }
    const current = this.player.playlistManager?.getCurrentTrack?.();
    const playlistTracks = current?.tracks ?? [];
    if (playlistTracks.some((t) => t?.kind === "captions" || t?.kind === "subtitles")) {
      return true;
    }
    return false;
  }
  hasQualityLevels() {
    if (this.player.renderer && this.player.renderer.getQualities) {
      const qualities = this.player.renderer.getQualities();
      return qualities && qualities.length > 1;
    }
    return false;
  }
  hasAudioDescription() {
    if (this.player.audioDescriptionSrc && this.player.audioDescriptionSrc.length > 0) {
      return true;
    }
    const textTracks = Array.from(this.player.element.textTracks || []);
    return textTracks.some((track) => track.kind === "descriptions");
  }
  hasSignLanguage() {
    const hasSingleSource = this.player.signLanguageSrc && this.player.signLanguageSrc.length > 0;
    const hasMultipleSources = this.player.signLanguageSources && Object.keys(this.player.signLanguageSources).length > 0;
    return hasSingleSource || hasMultipleSources;
  }
  createProgressBar() {
    const progressContainer = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-container`,
      attributes: {
        "role": "slider",
        "aria-label": i18n.t("player.progress"),
        "aria-orientation": "horizontal",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": "0",
        "tabindex": "0"
      }
    });
    this.controls.buffered = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-buffered`
    });
    this.controls.played = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-played`
    });
    this.controls.progressHandle = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-handle`
    });
    this.controls.progressTooltip = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-tooltip`
    });
    this.controls.progressPreview = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-preview`,
      attributes: {
        "aria-hidden": "true"
      }
    });
    this.controls.progressTooltip.appendChild(this.controls.progressPreview);
    this.controls.progressTooltipTime = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-tooltip-time`
    });
    this.controls.progressTooltip.appendChild(this.controls.progressTooltipTime);
    progressContainer.appendChild(this.controls.buffered);
    progressContainer.appendChild(this.controls.played);
    this.controls.played.appendChild(this.controls.progressHandle);
    progressContainer.appendChild(this.controls.progressTooltip);
    this.controls.progress = progressContainer;
    this.initPreviewThumbnail();
    this.setupProgressBarEvents();
  }
  /**
   * Initialize preview thumbnail functionality for HTML5 video
   */
  initPreviewThumbnail() {
    this.previewThumbnailCache = /* @__PURE__ */ new Map();
    this.previewVideo = null;
    this.currentPreviewTime = null;
    this.previewThumbnailTimeout = null;
    this.previewSupported = false;
    this.previewVideoReady = false;
    this.previewVideoInitialized = false;
    this.previewUsingMainVideo = false;
    const isVideo = this.player.element && this.player.element.tagName === "VIDEO";
    if (!isVideo) {
      return;
    }
  }
  /**
   * Lazily create the hidden preview video (only after playback started once)
   * Supports HTML5, HLS, and DASH renderers
   */
  ensurePreviewVideoInitialized() {
    if (this.previewVideoInitialized) return;
    if (!this.player?.state?.hasStartedPlayback) return;
    if (this.player.options.thumbnailPreview === false) {
      this.previewSupported = false;
      this.previewVideoInitialized = true;
      return;
    }
    const renderer = this.player.renderer;
    const hasVideoMedia = renderer && renderer.media && renderer.media.tagName === "VIDEO";
    if (!hasVideoMedia) {
      this.previewSupported = false;
      this.previewVideoInitialized = true;
      return;
    }
    const isStreamingRenderer = renderer.isStreaming === true || renderer.hls && typeof renderer.hls.loadLevel !== "undefined" || renderer.dash && (typeof renderer.dash.getQualityFor === "function" || typeof renderer.dash.getCurrentRepresentationForType === "function" || typeof renderer.dash.getRepresentationsByType === "function" || typeof renderer.dash.attachSource === "function");
    const isHTML5Renderer = hasVideoMedia && renderer.media === this.player.element && !isStreamingRenderer && typeof renderer.seek === "function";
    if (isStreamingRenderer) {
      this.previewVideo = null;
      this.previewVideoReady = false;
      this.previewSupported = false;
      this.previewUsingMainVideo = false;
      this.previewVideoInitialized = true;
      this.player.log("Preview thumbnails disabled for streaming sources", "info");
      return;
    }
    this.previewSupported = isHTML5Renderer && hasVideoMedia;
    if (!this.previewSupported) {
      this.previewVideoInitialized = true;
      return;
    }
    const mainVideo = renderer.media || this.player.element;
    let videoSrc = null;
    if (mainVideo.src) {
      videoSrc = mainVideo.src;
    } else {
      const source = mainVideo.querySelector("source");
      if (source) {
        videoSrc = source.src;
      }
    }
    if (!videoSrc) {
      this.player.log("No video source found for preview", "warn");
      this.previewSupported = false;
      this.previewVideoInitialized = true;
      return;
    }
    this.previewVideo = document.createElement("video");
    this.previewVideo.muted = true;
    this.previewVideo.preload = "auto";
    this.previewVideo.playsInline = true;
    this.previewVideo.style.position = "absolute";
    this.previewVideo.style.visibility = "hidden";
    this.previewVideo.style.width = "1px";
    this.previewVideo.style.height = "1px";
    this.previewVideo.style.top = "-9999px";
    if (mainVideo.crossOrigin) {
      this.previewVideo.crossOrigin = mainVideo.crossOrigin;
    }
    this.previewVideo.addEventListener("error", (e) => {
      this.player.log("Preview video failed to load:", e, "warn");
      this.previewSupported = false;
    });
    this.previewVideo.addEventListener("loadedmetadata", () => {
      this.previewVideoReady = true;
      if (this.player.options.thumbnailPregenerate) {
        this.pregenerateThumbnails();
      }
    }, { once: true });
    if (this.player.container) {
      this.player.container.appendChild(this.previewVideo);
    }
    this.previewVideo.src = videoSrc;
    this.previewVideoReady = false;
    this.previewUsingMainVideo = false;
    this.previewVideoInitialized = true;
  }
  /**
   * Pre-generate thumbnails during browser idle time
   * Uses requestIdleCallback to avoid impacting UI performance
   */
  pregenerateThumbnails() {
    if (!this.previewSupported || !this.previewVideo) return;
    if (!window.requestIdleCallback) return;
    const duration = this.player.state.duration;
    if (!duration || duration <= 0) return;
    const interval = this.player.options.thumbnailInterval || 10;
    const times = [];
    for (let t = 0; t < duration; t += interval) {
      const cacheKey = Math.floor(t);
      if (!this.previewThumbnailCache.has(cacheKey)) {
        times.push(t);
      }
    }
    if (times.length === 0) return;
    this.player.log(`Pre-generating ${times.length} thumbnails`, "debug");
    const generateNext = (deadline) => {
      while (deadline.timeRemaining() > 50 && times.length > 0) {
        const time = times.shift();
        if (time === void 0) {
          break;
        }
        this.generatePreviewThumbnail(time).catch(() => {
        });
      }
      if (times.length > 0 && this.previewSupported) {
        requestIdleCallback(generateNext, { timeout: 5e3 });
      }
    };
    requestIdleCallback(generateNext, { timeout: 5e3 });
  }
  /**
   * Generate preview thumbnail for a specific time
   * @param {number} time - Time in seconds
   * @returns {Promise<string>} Data URL of the thumbnail
   */
  async generatePreviewThumbnail(time) {
    if (!this.previewSupported || !this.previewVideo) {
      return null;
    }
    const previewVideo = this.previewVideo;
    if (!this.previewVideoReady) {
      if (previewVideo.readyState < 2) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Preview video data load timeout"));
          }, 1e4);
          const cleanup = () => {
            clearTimeout(timeout);
            previewVideo.removeEventListener("loadeddata", checkReady);
            previewVideo.removeEventListener("canplay", checkReady);
            previewVideo.removeEventListener("error", onError);
          };
          const checkReady = () => {
            if (previewVideo.readyState >= 2) {
              cleanup();
              this.previewVideoReady = true;
              resolve();
            }
          };
          const onError = () => {
            cleanup();
            reject(new Error("Preview video failed to load"));
          };
          if (previewVideo.readyState >= 1) {
            previewVideo.addEventListener("loadeddata", checkReady);
          }
          previewVideo.addEventListener("canplay", checkReady);
          previewVideo.addEventListener("error", onError);
          if (previewVideo.readyState >= 2) {
            checkReady();
          }
        }).catch(() => {
          this.previewSupported = false;
          return null;
        });
      } else {
        this.previewVideoReady = true;
      }
    }
    const cacheKey = Math.floor(time);
    if (this.previewThumbnailCache.has(cacheKey)) {
      return this.previewThumbnailCache.get(cacheKey);
    }
    const restoreState = this.previewUsingMainVideo;
    const quality = this.player.options.thumbnailQuality || 0.8;
    const maxWidth = this.player.options.thumbnailWidth || 160;
    const maxHeight = this.player.options.thumbnailHeight || 90;
    const dataURL = await captureVideoFrame(previewVideo, time, {
      restoreState,
      quality,
      maxWidth,
      maxHeight
    });
    if (dataURL) {
      const maxCacheSize = this.player.options.thumbnailCacheSize || 50;
      if (this.previewThumbnailCache.size >= maxCacheSize) {
        const firstKey = this.previewThumbnailCache.keys().next().value;
        if (firstKey !== void 0) {
          this.previewThumbnailCache.delete(firstKey);
        }
      }
      this.previewThumbnailCache.set(cacheKey, dataURL);
    }
    return dataURL;
  }
  /**
   * Update preview thumbnail display
   * @param {number} time - Time in seconds
   */
  async updatePreviewThumbnail(time) {
    if (!this.previewSupported || !this.controls.progressPreview) {
      return;
    }
    if (this.previewThumbnailTimeout) {
      clearTimeout(this.previewThumbnailTimeout);
    }
    this.previewThumbnailTimeout = setTimeout(async () => {
      try {
        const thumbnail = await this.generatePreviewThumbnail(time);
        if (thumbnail && this.controls.progressPreview) {
          this.controls.progressPreview.style.backgroundImage = `url("${thumbnail}")`;
          this.controls.progressPreview.style.display = "block";
          this.controls.progressPreview.style.backgroundRepeat = "no-repeat";
          this.controls.progressPreview.style.backgroundPosition = "center";
        } else {
          if (this.controls.progressPreview) {
            this.controls.progressPreview.style.display = "none";
          }
        }
        this.currentPreviewTime = time;
      } catch (error) {
        this.player.log("Preview thumbnail update failed:", error, "warn");
        if (this.controls.progressPreview) {
          this.controls.progressPreview.style.display = "none";
        }
      }
    }, 100);
  }
  getProgressSeekRange() {
    const liveRange = this.player.getLiveSeekRange();
    if (liveRange) {
      return liveRange;
    }
    const duration = this.player.state.duration || 0;
    return { start: 0, end: duration };
  }
  formatProgressTooltipTime(seekTime) {
    if (!this.player.state.isLive) {
      return TimeUtils.formatTime(seekTime);
    }
    const { end } = this.getProgressSeekRange();
    const behindSeconds = Math.max(0, end - seekTime);
    const threshold = Number(this.player.options.liveBehindThreshold) >= 0 ? Number(this.player.options.liveBehindThreshold) : 5;
    if (behindSeconds <= threshold) {
      return i18n.t("player.live");
    }
    return TimeUtils.formatBehindLive(behindSeconds);
  }
  updateLiveTimeDisplay() {
    const isLive = this.player.state.isLive;
    const behindLive = this.player.state.behindLive;
    if (this.controls.currentTimeDisplay) {
      this.controls.currentTimeDisplay.hidden = isLive && !behindLive;
    }
    if (this.controls.timeSeparator) {
      this.controls.timeSeparator.hidden = isLive ? !behindLive : false;
    }
  }
  setupProgressBarEvents() {
    const progress = this.controls.progress;
    if (!progress) return;
    const updateProgress = (clientX) => {
      const rect = progress.getBoundingClientRect();
      const percent = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
      const { start, end } = this.getProgressSeekRange();
      const span = end - start;
      const time = span > 0 ? start + percent * span : 0;
      return { percent, time };
    };
    progress.addEventListener("mousedown", (e) => {
      this.isDraggingProgress = true;
      this._progressBarRect = progress.getBoundingClientRect();
      const { time } = updateProgress(e.clientX);
      this.player.seek(time);
    });
    progress.addEventListener("mousemove", (e) => {
      if (!this.isDraggingProgress) {
        const { time } = updateProgress(e.clientX);
        const rect = progress.getBoundingClientRect();
        const left = e.clientX - rect.left;
        const tooltip = this.controls.progressTooltip;
        const tooltipTime = this.controls.progressTooltipTime;
        if (tooltip && tooltipTime) {
          tooltipTime.textContent = this.formatProgressTooltipTime(time);
          tooltip.style.left = `${left}px`;
          tooltip.style.display = "block";
        }
        if (!this.player?.state?.hasStartedPlayback) {
          if (this.controls.progressPreview) {
            this.controls.progressPreview.style.display = "none";
          }
          return;
        }
        this.ensurePreviewVideoInitialized();
        if (this.previewSupported) {
          this.updatePreviewThumbnail(time);
        } else if (this.controls.progressPreview) {
          this.controls.progressPreview.style.display = "none";
        }
      }
    });
    progress.addEventListener("mouseleave", () => {
      if (this.controls.progressTooltip) {
        this.controls.progressTooltip.style.display = "none";
      }
      if (this.previewThumbnailTimeout) {
        clearTimeout(this.previewThumbnailTimeout);
      }
    });
    progress.addEventListener("keydown", (e) => {
      const smallStep = this.player.options.seekInterval || 5;
      const largeStep = this.player.options.seekIntervalLarge || 30;
      const { start, end } = this.getProgressSeekRange();
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          this.player.seekBackward(smallStep);
          break;
        case "ArrowRight":
          e.preventDefault();
          this.player.seekForward(smallStep);
          break;
        case "PageUp":
          e.preventDefault();
          this.player.seekForward(largeStep);
          break;
        case "PageDown":
          e.preventDefault();
          this.player.seekBackward(largeStep);
          break;
        case "Home":
          e.preventDefault();
          this.player.seek(start);
          break;
        case "End":
          e.preventDefault();
          if (Number.isFinite(end) && end > start) {
            this.player.seek(Math.max(start, end - 0.1));
          }
          break;
        default:
          break;
      }
    });
    progress.addEventListener("touchstart", (e) => {
      this.isDraggingProgress = true;
      const touch = e.touches[0];
      if (!touch) return;
      const { time } = updateProgress(touch.clientX);
      this.player.seek(time);
    });
    progress.addEventListener("touchmove", (e) => {
      if (this.isDraggingProgress) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        const { time } = updateProgress(touch.clientX);
        this.player.seek(time);
      }
    });
    progress.addEventListener("touchend", () => {
      this.isDraggingProgress = false;
    });
  }
  createPlayPauseButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-play-pause`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.play")
      }
    });
    button.appendChild(createIconElement("play"));
    button.addEventListener("click", () => {
      this.player.toggle();
    });
    this.controls.playPause = button;
    button.dataset.overflowPriority = "1";
    button.dataset.overflowPriorityMobile = "1";
    return button;
  }
  createRestartButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-restart`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.restart"),
        "hidden": "true"
      }
    });
    button.appendChild(createIconElement("restart"));
    button.addEventListener("click", () => {
      this.player.seek(0);
      this.player.play();
    });
    button.dataset.overflowPriority = "3";
    button.dataset.overflowPriorityMobile = "3";
    return button;
  }
  createPreviousButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-previous`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.previous")
      }
    });
    button.appendChild(createIconElement("skipPrevious"));
    button.addEventListener("click", () => {
      if (this.player.playlistManager) {
        this.player.playlistManager.previous();
      }
    });
    const updateState = () => {
      if (this.player.playlistManager) {
        button.disabled = !this.player.playlistManager.hasPrevious() && !this.player.playlistManager.options.loop;
      }
    };
    this.subscribe("controls", "playlisttrackchange", updateState);
    updateState();
    this.controls.previous = button;
    button.dataset.overflowPriority = "3";
    button.dataset.overflowPriorityMobile = "1";
    return button;
  }
  createNextButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-next`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.next")
      }
    });
    button.appendChild(createIconElement("skipNext"));
    button.addEventListener("click", () => {
      if (this.player.playlistManager) {
        this.player.playlistManager.next();
      }
    });
    const updateState = () => {
      if (this.player.playlistManager) {
        button.disabled = !this.player.playlistManager.hasNext() && !this.player.playlistManager.options.loop;
      }
    };
    this.subscribe("controls", "playlisttrackchange", updateState);
    updateState();
    this.controls.next = button;
    button.dataset.overflowPriority = "3";
    button.dataset.overflowPriorityMobile = "1";
    return button;
  }
  createPlaylistToggleButton() {
    const panelId = this.player.playlistManager ? `${this.player.playlistManager.uniqueId}-panel` : "vidply-playlist-panel";
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-playlist-toggle`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.playlist"),
        "aria-expanded": "false",
        "aria-pressed": "false",
        "aria-controls": panelId
      }
    });
    button.appendChild(createIconElement("playlist"));
    button.addEventListener("click", () => {
      if (this.player.playlistManager) {
        this.player.playlistManager.togglePanel();
      }
    });
    this.controls.playlistToggle = button;
    button.dataset.overflowPriority = "2";
    button.dataset.overflowPriorityMobile = "3";
    return button;
  }
  createRewindButton() {
    const seconds = this.player.options.seekInterval || 10;
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-rewind`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.rewindSeconds", { seconds })
      }
    });
    button.appendChild(createIconElement("rewind"));
    button.addEventListener("click", () => {
      this.player.seekBackward(seconds);
    });
    button.dataset.overflowPriority = "2";
    button.dataset.overflowPriorityMobile = "3";
    return button;
  }
  createForwardButton() {
    const seconds = this.player.options.seekInterval || 10;
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-forward`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.forwardSeconds", { seconds }),
        "hidden": "true"
      }
    });
    button.appendChild(createIconElement("forward"));
    button.addEventListener("click", () => {
      this.player.seekForward(seconds);
    });
    button.dataset.overflowPriority = "2";
    button.dataset.overflowPriorityMobile = "3";
    return button;
  }
  createGoLiveButton() {
    const prefix = this.player.options.classPrefix;
    const button = DOMUtils.createElement("button", {
      className: `${prefix}-button ${prefix}-go-live`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.goLive"),
        "hidden": "true"
      },
      textContent: i18n.t("player.goLiveShort")
    });
    button.addEventListener("click", () => {
      this.player.seekToLive();
    });
    return button;
  }
  createMuteButton() {
    const muteButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-mute`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.mute")
      }
    });
    muteButton.appendChild(createIconElement("volumeHigh"));
    muteButton.addEventListener("click", () => {
      this.player.toggleMute();
    });
    this.controls.mute = muteButton;
    muteButton.dataset.overflowPriority = "1";
    muteButton.dataset.overflowPriorityMobile = "1";
    return muteButton;
  }
  createVolumeControl() {
    const muteButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-mute`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.volume"),
        "aria-expanded": "false"
      }
    });
    muteButton.appendChild(createIconElement("volumeHigh"));
    muteButton.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.player.toggleMute();
    });
    muteButton.addEventListener("click", () => {
      this.showVolumeSlider(muteButton);
    });
    this.controls.mute = muteButton;
    muteButton.dataset.overflowPriority = "1";
    muteButton.dataset.overflowPriorityMobile = "1";
    return muteButton;
  }
  showVolumeSlider(button) {
    const existingSlider = this.player.container.querySelector(`.${this.player.options.classPrefix}-volume-menu`);
    if (existingSlider) {
      existingSlider.remove();
      button.setAttribute("aria-expanded", "false");
      return;
    }
    const volumeMenu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-menu ${this.player.options.classPrefix}-menu`
    });
    const initialPercent = Math.round(this.player.state.volume * 100);
    const volumeSlider = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-slider`,
      attributes: {
        "role": "slider",
        "aria-label": i18n.t("player.volume"),
        "aria-orientation": "vertical",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(initialPercent),
        "aria-valuetext": this.player.state.muted ? i18n.t("player.muted") : i18n.t("player.volumePercent", { percent: initialPercent }),
        "tabindex": "0"
      }
    });
    const volumeTrack = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-track`
    });
    const volumeFill = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-fill`
    });
    const initialVolumePercent = this.player.state.volume * 100;
    volumeFill.style.height = `${initialVolumePercent}%`;
    const volumeHandle = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-handle`
    });
    volumeTrack.appendChild(volumeFill);
    volumeFill.appendChild(volumeHandle);
    volumeSlider.appendChild(volumeTrack);
    volumeMenu.appendChild(volumeSlider);
    const updateVolume = (clientY) => {
      const rect = volumeTrack.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      this.player.setVolume(percent);
    };
    volumeSlider.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDraggingVolume = true;
      this._activeVolumeTrack = volumeTrack;
      updateVolume(e.clientY);
    });
    volumeSlider.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDraggingVolume = true;
      this._activeVolumeTrack = volumeTrack;
      const touch = e.touches[0];
      if (!touch) return;
      updateVolume(touch.clientY);
    }, { passive: false });
    volumeSlider.addEventListener("touchmove", (e) => {
      if (this.isDraggingVolume) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        updateVolume(touch.clientY);
      }
    }, { passive: false });
    volumeSlider.addEventListener("touchend", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDraggingVolume = false;
      this._activeVolumeTrack = null;
    }, { passive: false });
    volumeSlider.addEventListener("touchcancel", () => {
      this.isDraggingVolume = false;
      this._activeVolumeTrack = null;
    });
    volumeSlider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.player.setVolume(Math.min(1, this.player.state.volume + 0.1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.player.setVolume(Math.max(0, this.player.state.volume - 0.1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.closeMenuAndReturnFocus(volumeMenu, button, true);
      }
    });
    volumeMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    volumeMenu.addEventListener("touchstart", (e) => {
      e.stopPropagation();
    });
    volumeMenu.addEventListener("touchmove", (e) => {
      e.stopPropagation();
    });
    volumeMenu.addEventListener("touchend", (e) => {
      e.stopPropagation();
    });
    volumeMenu.style.visibility = "hidden";
    volumeMenu.style.display = "block";
    this.insertMenuIntoDOM(volumeMenu, button);
    this.positionMenu(volumeMenu, button, true);
    requestAnimationFrame(() => {
      volumeMenu.style.visibility = "visible";
    });
    this.controls.volumeSlider = volumeSlider;
    this.controls.volumeFill = volumeFill;
    focusElement(volumeSlider, { delay: 50 });
    this.attachMenuCloseHandler(volumeMenu, button, true);
  }
  createTimeDisplay() {
    const container = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-time`,
      attributes: {
        "role": "group",
        "aria-label": i18n.t("time.display")
      }
    });
    this.controls.currentTimeDisplay = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-current-time`
    });
    const currentTimeVisual = DOMUtils.createElement("span", {
      textContent: "00:00",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const currentTimeAccessible = DOMUtils.createElement("span", {
      className: "vidply-sr-only",
      textContent: i18n.t("time.seconds", { count: 0 })
    });
    this.controls.currentTimeDisplay.appendChild(currentTimeVisual);
    this.controls.currentTimeDisplay.appendChild(currentTimeAccessible);
    this.controls.currentTimeVisual = currentTimeVisual;
    this.controls.currentTimeAccessible = currentTimeAccessible;
    const separator = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-time-separator`,
      textContent: " / ",
      attributes: {
        "aria-hidden": "true"
      }
    });
    this.controls.timeSeparator = separator;
    this.controls.durationDisplay = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-duration`
    });
    const durationVisual = DOMUtils.createElement("span", {
      textContent: "00:00",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const durationAccessible = DOMUtils.createElement("span", {
      className: "vidply-sr-only",
      textContent: i18n.t("time.durationPrefix") + i18n.t("time.seconds", { count: 0 })
    });
    this.controls.durationDisplay.appendChild(durationVisual);
    this.controls.durationDisplay.appendChild(durationAccessible);
    this.controls.durationVisual = durationVisual;
    this.controls.durationAccessible = durationAccessible;
    this.timeDisplayContainer = container;
    container.appendChild(this.controls.currentTimeDisplay);
    container.appendChild(separator);
    container.appendChild(this.controls.durationDisplay);
    if (this.shouldMountLiveControlsAtBuild()) {
      this.ensureLiveBadge();
    }
    return container;
  }
  /** Live-only UI is omitted entirely when liveStream is false. */
  liveControlsAllowed() {
    return this.player.options.liveStream !== false;
  }
  /** Under liveStream auto, live controls are injected only after detection. */
  usesDynamicLiveControls() {
    return this.player.options.liveStream === "auto";
  }
  shouldMountLiveControlsAtBuild() {
    return this.liveControlsAllowed() && !this.usesDynamicLiveControls() && !this.player.playlistManager;
  }
  ensureGoLiveButton() {
    if (!this.liveControlsAllowed() || this.player.playlistManager || !this.player.options.goLiveButton) {
      return;
    }
    if (this.controls.goLive) {
      return;
    }
    const goLiveButton = this.createGoLiveButton();
    const insertBefore = this.controls.mute ?? null;
    if (insertBefore) {
      this.leftButtons.insertBefore(goLiveButton, insertBefore);
    } else {
      const anchor = this.controls.forward ?? this.controls.rewind;
      if (anchor?.nextSibling) {
        this.leftButtons.insertBefore(goLiveButton, anchor.nextSibling);
      } else {
        this.leftButtons.appendChild(goLiveButton);
      }
    }
    this.controls.goLive = goLiveButton;
  }
  removeGoLiveButton() {
    this.controls.goLive?.remove();
    delete this.controls.goLive;
  }
  ensureLiveBadge() {
    if (!this.liveControlsAllowed() || this.controls.liveBadge || !this.timeDisplayContainer) {
      return;
    }
    const liveBadgeAccessible = DOMUtils.createElement("span", {
      className: "vidply-sr-only",
      textContent: i18n.t("player.live")
    });
    const liveBadgeVisual = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-live-badge`,
      attributes: {
        "aria-hidden": "true"
      },
      textContent: i18n.t("player.live")
    });
    this.controls.liveBadge = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-live-indicator`
    });
    this.controls.liveBadge.appendChild(liveBadgeVisual);
    this.controls.liveBadge.appendChild(liveBadgeAccessible);
    this.controls.liveBadgeVisual = liveBadgeVisual;
    this.controls.liveBadgeAccessible = liveBadgeAccessible;
    this.timeDisplayContainer.appendChild(this.controls.liveBadge);
  }
  removeLiveBadge() {
    this.controls.liveBadge?.remove();
    delete this.controls.liveBadge;
    delete this.controls.liveBadgeVisual;
    delete this.controls.liveBadgeAccessible;
  }
  /**
   * Mount or remove Go Live / LIVE badge for liveStream auto. Forced-live players
   * mount at build; VOD-only players (liveStream false) never get these nodes.
   */
  syncLiveOnlyControls() {
    if (!this.liveControlsAllowed()) {
      this.removeGoLiveButton();
      this.removeLiveBadge();
      return;
    }
    if (!this.usesDynamicLiveControls()) {
      return;
    }
    if (this.player.state.isLive) {
      this.ensureGoLiveButton();
      this.ensureLiveBadge();
    } else {
      this.removeGoLiveButton();
      this.removeLiveBadge();
    }
  }
  createChaptersButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-chapters`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.chapters"),
        "aria-expanded": "false"
      }
    });
    button.appendChild(createIconElement("chapters"));
    button.addEventListener("click", () => {
      this.showChaptersMenu(button);
    });
    this.controls.chapters = button;
    return button;
  }
  showChaptersMenu(button) {
    const existingMenu = this.player.container.querySelector(`.${this.player.options.classPrefix}-chapters-menu`);
    if (existingMenu) {
      existingMenu.remove();
      button.setAttribute("aria-expanded", "false");
      if (this.openMenu === existingMenu) {
        this.openMenu = null;
        this.openMenuButton = null;
      }
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-chapters-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu",
        "aria-label": i18n.t("player.chapters")
      }
    });
    const chapterTracks = Array.from(this.player.element.textTracks).filter(
      (track) => track.kind === "chapters"
    );
    if (chapterTracks.length === 0) {
      const noChaptersItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item ${this.player.options.classPrefix}-menu-item-disabled`,
        textContent: i18n.t("player.noChapters"),
        attributes: {
          "role": "menuitem",
          "aria-disabled": "true",
          "tabindex": "-1"
        },
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noChaptersItem);
    } else if (chapterTracks[0]) {
      const chapterTrack = chapterTracks[0];
      if (chapterTrack.mode === "disabled") {
        chapterTrack.mode = "hidden";
      }
      if (!chapterTrack.cues || chapterTrack.cues.length === 0) {
        const loadingItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item ${this.player.options.classPrefix}-menu-item-disabled`,
          textContent: i18n.t("player.loadingChapters"),
          attributes: {
            "role": "menuitem",
            "aria-disabled": "true",
            "tabindex": "-1"
          },
          style: { opacity: "0.5", cursor: "default" }
        });
        menu.appendChild(loadingItem);
        const onTrackLoad = () => {
          menu.remove();
          this.showChaptersMenu(button);
        };
        chapterTrack.addEventListener("load", onTrackLoad, { once: true });
        setTimeout(() => {
          if (chapterTrack.cues && chapterTrack.cues.length > 0 && document.contains(menu)) {
            menu.remove();
            this.showChaptersMenu(button);
          }
        }, 500);
      } else {
        const cues = chapterTrack.cues;
        for (let i = 0; i < cues.length; i++) {
          const cue = cues[i];
          const item = DOMUtils.createElement("button", {
            className: `${this.player.options.classPrefix}-menu-item`,
            attributes: {
              "type": "button",
              "role": "menuitem",
              "tabindex": "-1"
            }
          });
          const timeLabel = DOMUtils.createElement("span", {
            className: `${this.player.options.classPrefix}-chapter-time`,
            textContent: TimeUtils.formatTime(cue.startTime),
            attributes: {
              "aria-label": TimeUtils.formatDuration(cue.startTime)
            }
          });
          const titleLabel = DOMUtils.createElement("span", {
            className: `${this.player.options.classPrefix}-chapter-title`,
            textContent: cue.text
          });
          item.appendChild(timeLabel);
          item.appendChild(document.createTextNode(" "));
          item.appendChild(titleLabel);
          item.addEventListener("click", () => {
            this.player.seek(cue.startTime);
            this.closeMenuAndReturnFocus(menu, button);
          });
          menu.appendChild(item);
        }
        this.attachMenuKeyboardNavigation(menu, button);
        setTimeout(() => {
          const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
          if (firstItem) {
            firstItem.focus({ preventScroll: true });
          }
        }, 0);
      }
    }
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    this.insertMenuIntoDOM(menu, button);
    this.positionMenu(menu, button, true);
    requestAnimationFrame(() => {
      menu.style.visibility = "visible";
    });
    this.attachMenuCloseHandler(menu, button);
  }
  createQualityButton() {
    const ariaLabel = i18n.t("player.quality");
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-quality`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "aria-expanded": "false"
      }
    });
    button.appendChild(createIconElement("hd"));
    DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
    const qualityText = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-quality-text`,
      textContent: ""
    });
    button.appendChild(qualityText);
    button.addEventListener("click", () => {
      this.showQualityMenu(button);
    });
    this.controls.quality = button;
    this.controls.qualityText = qualityText;
    setTimeout(() => this.updateQualityIndicator(), 500);
    return button;
  }
  showQualityMenu(button) {
    const existingMenu = this.player.container.querySelector(`.${this.player.options.classPrefix}-quality-menu`);
    if (existingMenu) {
      existingMenu.remove();
      button.setAttribute("aria-expanded", "false");
      if (this.openMenu === existingMenu) {
        this.openMenu = null;
        this.openMenuButton = null;
      }
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-quality-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu",
        "aria-label": i18n.t("player.quality")
      }
    });
    if (this.player.renderer && this.player.renderer.getQualities) {
      const qualities = this.player.renderer.getQualities();
      const currentQuality = this.player.renderer.getCurrentQuality ? this.player.renderer.getCurrentQuality() : -1;
      const hasAutoQuality = typeof this.player.renderer.supportsAutoQuality === "function" && this.player.renderer.supportsAutoQuality();
      if (qualities.length === 0) {
        const noQualityItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: i18n.t("player.autoQuality"),
          attributes: {
            "role": "menuitem"
          },
          style: { opacity: "0.5", cursor: "default" }
        });
        menu.appendChild(noQualityItem);
      } else {
        let activeItem = null;
        if (hasAutoQuality) {
          const autoItem = DOMUtils.createElement("button", {
            className: `${this.player.options.classPrefix}-menu-item`,
            textContent: i18n.t("player.auto"),
            attributes: {
              "type": "button",
              "role": "menuitem",
              "tabindex": "-1"
            }
          });
          const isAuto = typeof this.player.renderer.isAutoQuality === "function" && this.player.renderer.isAutoQuality();
          if (isAuto) {
            autoItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
            autoItem.appendChild(createIconElement("check"));
            activeItem = autoItem;
          }
          autoItem.addEventListener("click", () => {
            if (this.player.renderer?.switchQuality) {
              this.player.renderer.switchQuality(-1);
            }
            this.closeMenuAndReturnFocus(menu, button);
          });
          menu.appendChild(autoItem);
        }
        qualities.forEach((quality) => {
          const item = DOMUtils.createElement("button", {
            className: `${this.player.options.classPrefix}-menu-item`,
            textContent: quality.name || `${quality.height}p`,
            attributes: {
              "type": "button",
              "role": "menuitem",
              "tabindex": "-1"
            }
          });
          if (quality.index === currentQuality) {
            item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
            item.appendChild(createIconElement("check"));
            activeItem = item;
          }
          item.addEventListener("click", () => {
            if (this.player.renderer?.switchQuality && quality.index !== void 0) {
              this.player.renderer.switchQuality(quality.index);
            }
            this.closeMenuAndReturnFocus(menu, button);
          });
          menu.appendChild(item);
        });
        this.attachMenuKeyboardNavigation(menu, button);
        setTimeout(() => {
          const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
          if (focusTarget) {
            focusTarget.focus({ preventScroll: true });
          }
        }, 0);
      }
    } else {
      const noSupportItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: i18n.t("player.noQuality"),
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noSupportItem);
    }
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    this.insertMenuIntoDOM(menu, button);
    this.positionMenu(menu, button, true);
    requestAnimationFrame(() => {
      menu.style.visibility = "visible";
    });
    this.attachMenuCloseHandler(menu, button);
  }
  createCaptionStyleButton() {
    const ariaLabel = i18n.t("player.captionStyling");
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-caption-style`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "aria-expanded": "false"
      }
    });
    const textIcon = DOMUtils.createElement("span", {
      textContent: "Aa",
      style: {
        fontSize: "14px",
        fontWeight: "bold"
      }
    });
    button.appendChild(textIcon);
    DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
    button.addEventListener("click", () => {
      this.showCaptionStyleMenu(button);
    });
    this.controls.captionStyle = button;
    return button;
  }
  showCaptionStyleMenu(button) {
    import("./vidply.CaptionStyleMenu-4RWWGFVE.js").then(({ showCaptionStyleMenu }) => showCaptionStyleMenu(this, button)).catch((error) => this.player.log("Failed to load caption style menu:", error, "error"));
  }
  createSpeedButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-speed`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.speed"),
        "aria-expanded": "false"
      }
    });
    button.appendChild(createIconElement("speed"));
    const speedText = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-speed-text`,
      textContent: "1x"
    });
    button.appendChild(speedText);
    button.addEventListener("click", () => {
      this.showSpeedMenu(button);
    });
    this.controls.speed = button;
    this.controls.speedText = speedText;
    return button;
  }
  formatSpeedLabel(speed) {
    if (speed === 1) {
      return i18n.t("speeds.normal");
    }
    const speedStr = speed.toLocaleString(i18n.getLanguage(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return `${speedStr}×`;
  }
  showSpeedMenu(button) {
    const existingMenu = this.player.container.querySelector(`.${this.player.options.classPrefix}-speed-menu`);
    if (existingMenu) {
      existingMenu.remove();
      button.setAttribute("aria-expanded", "false");
      if (this.openMenu === existingMenu) {
        this.openMenu = null;
        this.openMenuButton = null;
      }
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-speed-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu"
      }
    });
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    let activeItem = null;
    speeds.forEach((speed) => {
      const item = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: this.formatSpeedLabel(speed),
        attributes: {
          "type": "button",
          "role": "menuitem",
          "tabindex": "-1"
        }
      });
      if (speed === this.player.state.playbackSpeed) {
        item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
        item.appendChild(createIconElement("check"));
        activeItem = item;
      }
      item.addEventListener("click", () => {
        this.player.setPlaybackSpeed(speed);
        this.closeMenuAndReturnFocus(menu, button);
      });
      menu.appendChild(item);
    });
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    this.insertMenuIntoDOM(menu, button);
    this.positionMenu(menu, button, true);
    requestAnimationFrame(() => {
      menu.style.visibility = "visible";
    });
    this.attachMenuKeyboardNavigation(menu, button);
    this.attachMenuCloseHandler(menu, button);
    setTimeout(() => {
      const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
      if (focusTarget) {
        focusTarget.focus({ preventScroll: true });
      }
    }, 0);
  }
  createCaptionsButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-captions-button`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.captions"),
        "aria-expanded": "false"
      }
    });
    button.appendChild(createIconElement("captionsOff"));
    button.addEventListener("click", () => {
      this.showCaptionsMenu(button);
    });
    this.controls.captions = button;
    return button;
  }
  showCaptionsMenu(button) {
    const existingMenu = this.player.container.querySelector(`.${this.player.options.classPrefix}-captions-menu`);
    if (existingMenu) {
      existingMenu.remove();
      button.setAttribute("aria-expanded", "false");
      if (this.openMenu === existingMenu) {
        this.openMenu = null;
        this.openMenuButton = null;
      }
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-captions-menu ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu",
        "aria-label": i18n.t("captions.select")
      }
    });
    if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
      const noTracksItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: i18n.t("player.noCaptions"),
        attributes: {
          "role": "menuitem"
        },
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noTracksItem);
      this.insertMenuIntoDOM(menu, button);
      this.attachMenuCloseHandler(menu, button);
      return;
    }
    let activeItem = null;
    const offItem = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-menu-item`,
      textContent: i18n.t("captions.off"),
      attributes: {
        "type": "button",
        "role": "menuitem",
        "tabindex": "-1"
      }
    });
    if (!this.player.state.captionsEnabled) {
      offItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
      offItem.appendChild(createIconElement("check"));
      activeItem = offItem;
    }
    offItem.addEventListener("click", () => {
      this.player.disableCaptions();
      this.updateCaptionsButton();
      this.closeMenuAndReturnFocus(menu, button);
    });
    menu.appendChild(offItem);
    const tracks = this.player.captionManager.getAvailableTracks();
    tracks.forEach((track) => {
      const item = DOMUtils.createElement("button", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: track.label,
        attributes: {
          "type": "button",
          "role": "menuitem",
          "lang": track.language,
          "tabindex": "-1"
        }
      });
      const captionManager = this.player.captionManager;
      if (captionManager && this.player.state.captionsEnabled && captionManager.currentTrack === captionManager.tracks[track.index]) {
        item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
        item.appendChild(createIconElement("check"));
        activeItem = item;
      }
      item.addEventListener("click", () => {
        this.player.captionManager?.switchTrack(track.index);
        this.updateCaptionsButton();
        this.closeMenuAndReturnFocus(menu, button);
      });
      menu.appendChild(item);
    });
    this.insertMenuIntoDOM(menu, button);
    this.attachMenuKeyboardNavigation(menu, button);
    this.attachMenuCloseHandler(menu, button);
    setTimeout(() => {
      const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
      if (focusTarget) {
        focusTarget.focus({ preventScroll: true });
      }
    }, 0);
  }
  updateCaptionsButton() {
    if (!this.controls.captions) return;
    const icon = this.controls.captions.querySelector(".vidply-icon");
    if (!icon) return;
    const isEnabled = this.player.state.captionsEnabled;
    icon.innerHTML = isEnabled ? createIconElement("captions").innerHTML : createIconElement("captionsOff").innerHTML;
  }
  createTranscriptButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-transcript`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.transcript"),
        "aria-expanded": "false"
      }
    });
    button.appendChild(createIconElement("transcript"));
    button.addEventListener("click", async () => {
      await this.player.toggleTranscript();
      this.updateTranscriptButton();
    });
    this.controls.transcript = button;
    return button;
  }
  updateTranscriptButton() {
    if (!this.controls.transcript) return;
    const isVisible = this.player.transcriptManager && this.player.transcriptManager.isVisible;
    this.controls.transcript.setAttribute("aria-expanded", isVisible ? "true" : "false");
  }
  createHelpButton() {
    const ariaLabel = i18n.t("help.button");
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-help`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "aria-haspopup": "dialog"
      }
    });
    button.appendChild(createIconElement("help"));
    DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
    button.addEventListener("click", () => {
      this.player.toggleKeyboardHelp();
    });
    this.controls.help = button;
    return button;
  }
  createAudioDescriptionButton() {
    const ariaLabel = i18n.t("player.audioDescription");
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-audio-description`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "role": "switch",
        "aria-checked": "false"
      }
    });
    button.appendChild(createIconElement("audioDescription"));
    DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
    button.addEventListener("click", async () => {
      await this.player.toggleAudioDescription();
      this.updateAudioDescriptionButton();
    });
    this.controls.audioDescription = button;
    return button;
  }
  updateAudioDescriptionButton() {
    if (!this.controls.audioDescription) return;
    const icon = this.controls.audioDescription.querySelector(".vidply-icon");
    const isEnabled = this.player.state.audioDescriptionEnabled;
    if (icon) {
      icon.innerHTML = isEnabled ? createIconElement("audioDescriptionOn").innerHTML : createIconElement("audioDescription").innerHTML;
    }
    this.controls.audioDescription.setAttribute("aria-checked", isEnabled ? "true" : "false");
  }
  createSignLanguageButton() {
    const ariaLabel = i18n.t("player.signLanguage");
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "aria-expanded": "false"
      }
    });
    button.appendChild(createIconElement("signLanguagePip"));
    DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
    button.addEventListener("click", () => {
      this.player.toggleSignLanguage();
      this.updateSignLanguageButton();
    });
    this.controls.signLanguage = button;
    return button;
  }
  updateSignLanguageButton() {
    if (!this.controls.signLanguage) return;
    const icon = this.controls.signLanguage.querySelector(".vidply-icon");
    const isEnabled = this.player.state.signLanguageEnabled;
    if (icon) {
      icon.innerHTML = isEnabled ? createIconElement("signLanguagePipOn").innerHTML : createIconElement("signLanguagePip").innerHTML;
    }
    this.controls.signLanguage.setAttribute("aria-expanded", isEnabled ? "true" : "false");
    this.controls.signLanguage.setAttribute(
      "aria-label",
      isEnabled ? i18n.t("signLanguage.hide") : i18n.t("signLanguage.show")
    );
  }
  /**
   * Create sign language in main view button (src swap, like audio description)
   */
  createSignLanguageInMainViewButton() {
    const ariaLabel = i18n.t("signLanguage.showInMainView");
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language-main-view`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "aria-pressed": "false"
      }
    });
    button.appendChild(createIconElement("signLanguage"));
    DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
    button.addEventListener("click", () => {
      void this.player.toggleSignLanguageInMainView();
      this.updateSignLanguageInMainViewButton();
    });
    this.controls.signLanguageMainView = button;
    return button;
  }
  /**
   * Update sign language in main view button state
   */
  updateSignLanguageInMainViewButton() {
    const btn = this.controls.signLanguageMainView;
    if (!btn) return;
    const isEnabled = this.player.state.signLanguageInMainView;
    const newLabel = isEnabled ? i18n.t("signLanguage.hideInMainView") : i18n.t("signLanguage.showInMainView");
    const iconName = isEnabled ? "signLanguageOn" : "signLanguage";
    const icon = btn.querySelector(".vidply-icon");
    if (icon) {
      icon.innerHTML = createIconElement(iconName).innerHTML;
    }
    btn.setAttribute("aria-pressed", String(isEnabled));
    btn.setAttribute("aria-label", newLabel);
    const tooltip = btn.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (tooltip) tooltip.textContent = newLabel;
  }
  /**
   * Update accessibility buttons visibility based on current track data.
   * Called when loading a new playlist track to show/hide buttons accordingly.
   */
  updateAccessibilityButtons() {
    const hasAudioDescription = this.hasAudioDescription();
    const hasSignLanguage = this.hasSignLanguage();
    if (hasAudioDescription) {
      if (!this.controls.audioDescription && this.player.options.audioDescriptionButton !== false) {
        const btn = this.createAudioDescriptionButton();
        btn.dataset.overflowPriority = "2";
        btn.dataset.overflowPriorityMobile = "3";
        const transcriptBtn = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-transcript`);
        const playlistBtn = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-playlist-toggle`);
        const insertBefore = transcriptBtn || playlistBtn || null;
        if (insertBefore) {
          this.rightButtons.insertBefore(btn, insertBefore);
        } else {
          this.rightButtons.appendChild(btn);
        }
        this.checkOverflow();
      }
      if (this.controls.audioDescription) {
        this.controls.audioDescription.style.display = "";
      }
    } else {
      if (this.controls.audioDescription) {
        this.controls.audioDescription.style.display = "none";
      }
    }
    const showSignLanguage = hasSignLanguage && this.player.options.signLanguageButton !== false;
    const classPrefix = this.player.options.classPrefix;
    const displayMode = this.player.options.signLanguageDisplayMode || "both";
    const showPip = ["pip", "both"].includes(displayMode);
    const showMain = ["main", "both"].includes(displayMode);
    if (showSignLanguage) {
      const qualityBtn = this.rightButtons.querySelector(`.${classPrefix}-quality`);
      const fullscreenBtn = this.rightButtons.querySelector(`.${classPrefix}-fullscreen`);
      const insertBeforeRef = qualityBtn || fullscreenBtn || null;
      let needsOverflowSetup = false;
      if (showPip && !this.controls.signLanguage) {
        const btn = this.createSignLanguageButton();
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
        if (insertBeforeRef) {
          this.rightButtons.insertBefore(btn, insertBeforeRef);
        } else {
          this.rightButtons.appendChild(btn);
        }
        needsOverflowSetup = true;
      }
      if (showMain && !this.controls.signLanguageMainView) {
        const btn = this.createSignLanguageInMainViewButton();
        btn.dataset.overflowPriority = "3";
        btn.dataset.overflowPriorityMobile = "3";
        const afterPip = this.controls.signLanguage?.nextSibling;
        if (afterPip) {
          this.rightButtons.insertBefore(btn, afterPip);
        } else if (insertBeforeRef) {
          this.rightButtons.insertBefore(btn, insertBeforeRef);
        } else {
          this.rightButtons.appendChild(btn);
        }
        needsOverflowSetup = true;
      }
      if (needsOverflowSetup) {
        this.checkOverflow();
      }
      if (this.controls.signLanguage) {
        this.controls.signLanguage.style.display = showPip ? "" : "none";
      }
      if (this.controls.signLanguageMainView) {
        this.controls.signLanguageMainView.style.display = showMain ? "" : "none";
      }
    } else {
      if (this.controls.signLanguage) this.controls.signLanguage.style.display = "none";
      if (this.controls.signLanguageMainView) this.controls.signLanguageMainView.style.display = "none";
    }
  }
  createPipButton() {
    const floating = this.player.options.floating === true;
    const labelKey = floating ? "player.floatingPlayer" : "player.pip";
    const prefix = this.player.options.classPrefix;
    const className = floating ? `${prefix}-button ${prefix}-pip ${prefix}-pip-floating` : `${prefix}-button ${prefix}-pip`;
    const button = DOMUtils.createElement("button", {
      className,
      attributes: {
        "type": "button",
        "aria-label": i18n.t(labelKey),
        "aria-pressed": "false"
      }
    });
    button.appendChild(createIconElement("pip"));
    button.addEventListener("click", () => {
      if (floating) {
        if (this.player.floatingPlayerManager) {
          this.player.floatingPlayerManager.togglePinned(button);
        }
      } else {
        this.player.togglePiP();
      }
    });
    if (floating) {
      this.subscribe("controls", "floatingchange", (state) => {
        button.setAttribute("aria-pressed", state === "pinned" ? "true" : "false");
        button.classList.toggle(`${this.player.options.classPrefix}-pip-active`, Boolean(state));
      });
    }
    return button;
  }
  /**
   * @param downloadUrl File the button offers when nothing else resolves.
   * @param target Format/size that belong to `downloadUrl` — passed by
   *   playlists, which know their track's metadata; omitted for single media,
   *   where format and size are read from the element and player options.
   */
  createDownloadButton(downloadUrl, target) {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-download`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.download")
      }
    });
    button.appendChild(createIconElement("download"));
    button.addEventListener("click", () => {
      const url = this.resolveDownloadTarget()?.url || downloadUrl;
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = url.split("/").pop()?.split("?")[0] || "download";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    this.controls.download = button;
    this.applyDownloadTarget(button, {
      url: downloadUrl,
      format: target?.format ?? this.resolveDownloadFormat(downloadUrl),
      sizeBytes: target?.sizeBytes ?? this.resolveInitialDownloadSize()
    });
    return button;
  }
  /**
   * Point the download button at the file that is loaded now, creating or
   * hiding it as the current media allows one.
   *
   * Playlists swap the file behind the player without always rebuilding the
   * control bar — MSE renderers (DASH/HLS) skip the rebuild — so track
   * changes call this to keep button, label and target in sync.
   */
  updateDownloadButton() {
    if (!this.rightButtons) return;
    const target = this.player.options.downloadButton ? this.resolveDownloadTarget() : null;
    const existing = this.controls.download;
    const mounted = existing && this.rightButtons.contains(existing) ? existing : void 0;
    if (!target) {
      if (mounted) mounted.style.display = "none";
      return;
    }
    if (!mounted) {
      const prefix = this.player.options.classPrefix;
      const button = this.createDownloadButton(target.url, target);
      button.dataset.overflowPriority = "2";
      button.dataset.overflowPriorityMobile = "3";
      const insertBefore = this.rightButtons.querySelector(`.${prefix}-pip`) || this.rightButtons.querySelector(`.${prefix}-fullscreen`);
      if (insertBefore) {
        this.rightButtons.insertBefore(button, insertBefore);
      } else {
        this.rightButtons.appendChild(button);
      }
      if (button.getAttribute("aria-label")) {
        DOMUtils.attachTooltip(button, button.getAttribute("aria-label"), prefix);
      }
      this.checkOverflow();
      return;
    }
    mounted.style.display = "";
    this.applyDownloadTarget(mounted, target);
  }
  /**
   * Resolve which file the download button offers.
   *
   * Playlist tracks may carry `downloadUrl` (plus optional `downloadFormat`
   * and `downloadFileSize`), which makes the button follow the selection.
   * Playlists without any of those, and single media, keep using the player
   * option and the `data-vidply-download-url` attribute.
   */
  resolveDownloadTarget() {
    const track = this.resolveDownloadTrack();
    if (track) {
      const url2 = typeof track.downloadUrl === "string" ? track.downloadUrl : "";
      if (!url2) return null;
      const trackFormat = typeof track.downloadFormat === "string" ? track.downloadFormat : "";
      const mime = typeof track.type === "string" ? track.type : null;
      return {
        url: url2,
        format: trackFormat || inferFormatFromMime(mime) || inferFormatFromUrl(url2),
        sizeBytes: normalizeDownloadSize(track.downloadFileSize)
      };
    }
    const url = this.player.options.downloadUrl || this.player.element?.dataset?.vidplyDownloadUrl || "";
    if (!url) return null;
    return {
      url,
      format: this.resolveDownloadFormat(url),
      sizeBytes: this.resolveInitialDownloadSize()
    };
  }
  /**
   * The selected playlist track, but only for playlists that describe their
   * downloads themselves. Older playlists say nothing about downloads, and
   * for those the element-level target must stay in charge.
   */
  resolveDownloadTrack() {
    const manager = this.player.playlistManager;
    const tracks = manager?.tracks;
    if (!manager || !Array.isArray(tracks) || tracks.length === 0) return null;
    const describesDownloads = tracks.some((track) => {
      const url = track?.downloadUrl;
      return typeof url === "string" && url !== "";
    });
    if (!describesDownloads) return null;
    return manager.getCurrentTrack?.() ?? null;
  }
  /**
   * Write a resolved target onto the button: the URL it hands out, the data
   * attributes host pages read, and the label built from format and size.
   */
  applyDownloadTarget(button, target) {
    button.dataset.vidplyDownloadUrl = target.url;
    if (target.format) {
      button.dataset.vidplyDownloadFormat = target.format;
    } else {
      delete button.dataset.vidplyDownloadFormat;
    }
    if (target.sizeBytes != null) {
      button.dataset.vidplyDownloadSize = String(target.sizeBytes);
    } else {
      delete button.dataset.vidplyDownloadSize;
    }
    this.updateDownloadButtonLabel(button, this.composeDownloadLabel(target.format, target.sizeBytes));
    if (this.player.options.downloadFetchSize === false || target.sizeBytes != null) return;
    fetchContentLength(target.url).then((sizeBytes) => {
      if (sizeBytes == null || button.dataset.vidplyDownloadUrl !== target.url) return;
      button.dataset.vidplyDownloadSize = String(sizeBytes);
      this.updateDownloadButtonLabel(button, this.composeDownloadLabel(target.format, sizeBytes));
    });
  }
  /** Localized download label for a format/size pair. */
  composeDownloadLabel(format, sizeBytes) {
    return buildDownloadLabel({
      baseLabel: i18n.t("player.download"),
      format,
      sizeBytes,
      locale: i18n.getLanguage(),
      withFormatSizeTemplate: i18n.t("player.downloadWithFormatSize"),
      withFormatTemplate: i18n.t("player.downloadWithFormat"),
      withSizeTemplate: i18n.t("player.downloadWithSize")
    });
  }
  /**
   * Resolve the human-readable file format (e.g. "MP4") for the download
   * button from options, data attributes, the matching <source type>, or
   * the URL extension. Returns null when nothing can be determined.
   */
  resolveDownloadFormat(downloadUrl) {
    const dataset = this.player.element?.dataset || {};
    const explicit = this.player.options.downloadFormat || dataset.vidplyDownloadFormat || null;
    if (explicit) return explicit;
    const sourceEls = this.player.element?.querySelectorAll ? Array.from(this.player.element.querySelectorAll("source")) : [];
    const matching = sourceEls.find((s) => (s.getAttribute("src") || s.src || "") === downloadUrl);
    const candidate = matching || sourceEls[0];
    if (candidate) {
      const fromMime = inferFormatFromMime(candidate.getAttribute("type"));
      if (fromMime) return fromMime;
    }
    return inferFormatFromUrl(downloadUrl);
  }
  /**
   * Resolve a known file size from options or data attributes (in bytes).
   * Returns null if no value was provided and a HEAD request should run.
   */
  resolveInitialDownloadSize() {
    const dataset = this.player.element?.dataset || {};
    return normalizeDownloadSize(this.player.options.downloadFileSize) ?? normalizeDownloadSize(dataset.vidplyDownloadSize);
  }
  /**
   * Update both aria-label and the visible tooltip text for the download button.
   */
  updateDownloadButtonLabel(button, label) {
    if (!button || !label) return;
    button.setAttribute("aria-label", label);
    const tooltip = button.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (tooltip) {
      tooltip.textContent = label;
    }
  }
  createFullscreenButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-fullscreen`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.fullscreen")
      }
    });
    button.appendChild(createIconElement("fullscreen"));
    button.addEventListener("click", () => {
      this.player.toggleFullscreen();
    });
    this.controls.fullscreen = button;
    return button;
  }
  attachEvents() {
    this.detachPlayerEvents("events");
    this.subscribe("events", "play", () => this.updatePlayPauseButton());
    this.subscribe("events", "pause", () => this.updatePlayPauseButton());
    this.subscribe("events", "timeupdate", () => {
      this.updateProgress();
      this.updateLiveControls();
    });
    this.subscribe("events", "loadedmetadata", () => {
      this.updateDuration();
      this.updateLiveControls();
      this.ensureQualityButton();
      this.updateQualityIndicator();
      this.updatePreviewVideoSource();
    });
    this.subscribe("events", "durationchange", () => {
      this.updateDuration();
      this.updateLiveControls();
    });
    this.subscribe("events", "livechange", () => {
      this.updateDuration();
      this.updateLiveControls();
    });
    this.subscribe("events", "liveedgechange", () => this.updateLiveControls());
    this.subscribe("events", "sourcechange", () => {
      this.updatePreviewVideoSource();
      this.updateLiveControls();
    });
    this.subscribe("events", "volumechange", () => this.updateVolumeDisplay());
    this.subscribe("events", "progress", () => this.updateBuffered());
    this.subscribe("events", "playbackspeedchange", () => this.updateSpeedDisplay());
    this.subscribe("events", "fullscreenchange", () => this.updateFullscreenButton());
    this.subscribe("events", "captionsenabled", () => this.updateCaptionsButton());
    this.subscribe("events", "captionsdisabled", () => this.updateCaptionsButton());
    this.subscribe("events", "audiodescriptionenabled", () => this.updateAudioDescriptionButton());
    this.subscribe("events", "audiodescriptiondisabled", () => this.updateAudioDescriptionButton());
    this.subscribe("events", "signlanguageenabled", () => this.updateSignLanguageButton());
    this.subscribe("events", "signlanguagedisabled", () => this.updateSignLanguageButton());
    this.subscribe("events", "signlanguageinmainviewenabled", () => this.updateSignLanguageInMainViewButton());
    this.subscribe("events", "signlanguageinmainviewdisabled", () => this.updateSignLanguageInMainViewButton());
    this.subscribe("events", "qualitychange", () => this.updateQualityIndicator());
    this.subscribe("events", "hlslevelswitched", () => this.updateQualityIndicator());
    this.subscribe("events", "hlsmanifestparsed", () => {
      this.ensureQualityButton();
      this.updateQualityIndicator();
      this.updateLiveControls();
    });
    this.subscribe("events", "dashqualitychanged", () => this.updateQualityIndicator());
    this.subscribe("events", "dashmanifestparsed", () => {
      this.ensureQualityButton();
      this.updateQualityIndicator();
    });
    this.subscribe("events", "dashmanifestloaded", () => this.updateLiveControls());
  }
  updatePlayPauseButton() {
    if (!this.controls.playPause) return;
    const icon = this.controls.playPause.querySelector(".vidply-icon");
    const isPlaying = this.player.state.playing;
    if (icon) {
      icon.innerHTML = isPlaying ? createIconElement("pause").innerHTML : createIconElement("play").innerHTML;
    }
    const newAriaLabel = isPlaying ? i18n.t("player.pause") : i18n.t("player.play");
    this.controls.playPause.setAttribute("aria-label", newAriaLabel);
    DOMUtils.attachTooltip(this.controls.playPause, newAriaLabel, this.player.options.classPrefix);
  }
  updateProgress() {
    if (!this.controls.played) return;
    const currentTime = this.player.state.currentTime || 0;
    const { start, end } = this.getProgressSeekRange();
    const span = end - start;
    const percent = span > 0 ? Math.min(100, Math.max(0, (currentTime - start) / span * 100)) : 0;
    this.controls.played.style.width = `${percent}%`;
    if (this.controls.progress) {
      this.controls.progress.setAttribute("aria-valuenow", String(Math.round(percent)));
      if (this.player.state.isLive) {
        if (this.player.state.behindLive) {
          const behindText = TimeUtils.formatDuration(this.player.getSecondsBehindLive());
          this.controls.progress.setAttribute(
            "aria-valuetext",
            `${Math.round(percent)}%, ${i18n.t("time.behindLive", { time: behindText })}, ${i18n.t("player.live")}`
          );
        } else {
          this.controls.progress.setAttribute(
            "aria-valuetext",
            `${Math.round(percent)}%, ${i18n.t("player.live")}`
          );
        }
      } else {
        const currentTimeText = TimeUtils.formatDuration(this.player.state.currentTime);
        const durationText = TimeUtils.formatDuration(this.player.state.duration);
        this.controls.progress.setAttribute(
          "aria-valuetext",
          `${Math.round(percent)}%, ${currentTimeText} ${i18n.t("time.of")} ${durationText}`
        );
      }
    }
    if (this.controls.currentTimeVisual) {
      if (this.player.state.isLive && this.player.state.behindLive) {
        const behindSeconds = this.player.getSecondsBehindLive();
        this.controls.currentTimeVisual.textContent = TimeUtils.formatBehindLive(behindSeconds);
        if (this.controls.currentTimeAccessible) {
          this.controls.currentTimeAccessible.textContent = i18n.t("time.behindLive", {
            time: TimeUtils.formatDuration(behindSeconds)
          });
        }
      } else if (!this.player.state.isLive) {
        const currentTime2 = this.player.state.currentTime;
        this.controls.currentTimeVisual.textContent = TimeUtils.formatTime(currentTime2);
        if (this.controls.currentTimeAccessible) {
          this.controls.currentTimeAccessible.textContent = TimeUtils.formatDuration(currentTime2);
        }
      }
    }
    this.updateLiveTimeDisplay();
  }
  updateDuration() {
    const isLive = this.player.state.isLive;
    if (this.controls.durationDisplay) {
      this.controls.durationDisplay.hidden = isLive;
    }
    this.updateLiveTimeDisplay();
    if (!isLive && this.controls.durationVisual) {
      const duration = this.player.state.duration;
      this.controls.durationVisual.textContent = TimeUtils.formatTime(duration);
      if (this.controls.durationAccessible) {
        this.controls.durationAccessible.textContent = i18n.t("time.durationPrefix") + TimeUtils.formatDuration(duration);
      }
    }
  }
  updateLiveControls() {
    this.syncLiveOnlyControls();
    const isLive = this.player.state.isLive;
    const behindLive = this.player.state.behindLive;
    const prefix = this.player.options.classPrefix;
    const liveManager = this.player.liveStreamManager;
    if (this.controls.restart) {
      this.controls.restart.hidden = liveManager ? !liveManager.shouldShowRestart() : true;
    }
    if (this.controls.forward) {
      this.controls.forward.hidden = liveManager ? !liveManager.shouldShowForwardSkip() : isLive ? !behindLive : true;
    }
    if (this.controls.goLive) {
      this.controls.goLive.hidden = !isLive || !behindLive;
    }
    this.updateLiveTimeDisplay();
    const speedButton = this.rightButtons?.querySelector(`.${prefix}-speed`);
    if (speedButton) {
      speedButton.hidden = isLive;
    }
  }
  updateVolumeDisplay() {
    const percent = this.player.state.volume * 100;
    if (this.controls.volumeFill) {
      this.controls.volumeFill.style.height = `${percent}%`;
    }
    if (this.controls.volumeSlider) {
      const rounded = Math.round(percent);
      this.controls.volumeSlider.setAttribute("aria-valuenow", String(rounded));
      this.controls.volumeSlider.setAttribute(
        "aria-valuetext",
        this.player.state.muted ? i18n.t("player.muted") : i18n.t("player.volumePercent", { percent: rounded })
      );
    }
    if (this.controls.mute) {
      const icon = this.controls.mute.querySelector(".vidply-icon");
      if (icon) {
        let iconName;
        if (this.player.state.muted || this.player.state.volume === 0) {
          iconName = "volumeMuted";
        } else if (this.player.state.volume < 0.3) {
          iconName = "volumeLow";
        } else if (this.player.state.volume < 0.7) {
          iconName = "volumeMedium";
        } else {
          iconName = "volumeHigh";
        }
        icon.innerHTML = createIconElement(iconName).innerHTML;
        const volumePercent = this.player.state.muted ? 0 : Math.round(percent);
        const newMuteAriaLabel = this.isTouchDevice() ? this.player.state.muted ? i18n.t("player.unmute") : i18n.t("player.mute") : `${i18n.t("player.volume")} ${volumePercent}%`;
        this.controls.mute.setAttribute("aria-label", newMuteAriaLabel);
        DOMUtils.attachTooltip(this.controls.mute, newMuteAriaLabel, this.player.options.classPrefix);
      }
    }
  }
  updateBuffered() {
    if (!this.controls.buffered || !this.player.element.buffered || this.player.element.buffered.length === 0) return;
    const buffered = this.player.element.buffered.end(this.player.element.buffered.length - 1);
    const { start, end } = this.getProgressSeekRange();
    const span = end - start;
    const percent = span > 0 ? (buffered - start) / span * 100 : 0;
    this.controls.buffered.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
  updateSpeedDisplay() {
    if (this.controls.speedText) {
      this.controls.speedText.textContent = `${this.player.state.playbackSpeed}x`;
    }
  }
  updateFullscreenButton() {
    if (!this.controls.fullscreen) return;
    const icon = this.controls.fullscreen.querySelector(".vidply-icon");
    const isFullscreen = this.player.state.fullscreen;
    if (icon) {
      icon.innerHTML = isFullscreen ? createIconElement("fullscreenExit").innerHTML : createIconElement("fullscreen").innerHTML;
    }
    this.controls.fullscreen.setAttribute(
      "aria-label",
      isFullscreen ? i18n.t("player.exitFullscreen") : i18n.t("player.fullscreen")
    );
  }
  /**
   * Ensure quality button exists if qualities are available
   * This is called after renderer initialization to dynamically add the button
   */
  ensureQualityButton() {
    if (!this.player.options.qualityButton) return;
    if (this.controls.quality) return;
    if (!this.hasQualityLevels()) return;
    const qualityButton = this.createQualityButton();
    const speedButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-speed`);
    const captionStyleButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-caption-style`);
    const insertBefore = captionStyleButton || speedButton;
    if (insertBefore) {
      this.rightButtons.insertBefore(qualityButton, insertBefore);
    } else {
      this.rightButtons.insertBefore(qualityButton, this.rightButtons.firstChild);
    }
    this.player.log("Quality button added dynamically", "info");
  }
  /**
   * Dynamically add captions button if HLS subtitle tracks become available
   * Button order: Chapters, Captions, Caption Style, Speed, AD, Transcript, Playlist, Sign, Quality, PiP, Fullscreen
   */
  ensureCaptionsButton() {
    if (!this.player.options.captionsButton) return;
    if (this.controls.captions) return;
    const btn = this.createCaptionsButton();
    btn.dataset.overflowPriority = "1";
    btn.dataset.overflowPriorityMobile = "3";
    const chaptersButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-chapters`);
    if (chaptersButton && chaptersButton.nextSibling) {
      this.rightButtons.insertBefore(btn, chaptersButton.nextSibling);
    } else if (chaptersButton) {
      chaptersButton.after(btn);
    } else {
      this.rightButtons.insertBefore(btn, this.rightButtons.firstChild);
    }
    this.player.log("Captions button added dynamically for HLS subtitles", "info");
  }
  /**
   * Dynamically add caption style button if HLS subtitle tracks become available
   */
  ensureCaptionStyleButton() {
    if (!this.player.options.captionStyleButton) return;
    if (this.controls.captionStyle) return;
    const btn = this.createCaptionStyleButton();
    btn.dataset.overflowPriority = "3";
    btn.dataset.overflowPriorityMobile = "3";
    const captionsButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-captions-button`);
    if (captionsButton) {
      captionsButton.after(btn);
    } else {
      this.rightButtons.insertBefore(btn, this.rightButtons.firstChild);
    }
    this.player.log("Caption style button added dynamically for HLS subtitles", "info");
  }
  /**
   * Dynamically add transcript button if HLS subtitle tracks become available
   */
  ensureTranscriptButton() {
    if (!this.player.options.transcriptButton) return;
    if (this.controls.transcript) return;
    const btn = this.createTranscriptButton();
    btn.dataset.overflowPriority = "3";
    btn.dataset.overflowPriorityMobile = "3";
    const adButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-audio-description`);
    const speedButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-speed`);
    const captionStyleButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-caption-style`);
    if (adButton) {
      adButton.after(btn);
    } else if (speedButton) {
      speedButton.after(btn);
    } else if (captionStyleButton) {
      captionStyleButton.after(btn);
    } else {
      const qualityButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-quality`);
      const pipButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-pip`);
      const fullscreenButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-fullscreen`);
      const insertBefore = qualityButton || pipButton || fullscreenButton;
      if (insertBefore) {
        this.rightButtons.insertBefore(btn, insertBefore);
      } else {
        this.rightButtons.appendChild(btn);
      }
    }
    this.player.log("Transcript button added dynamically for HLS subtitles", "info");
  }
  /**
   * Remove caption-related buttons if no HLS subtitle tracks are available
   * and no native caption tracks exist. Called when switching to a stream
   * without subtitles.
   * @param {boolean} force - If true, skip the native captions check and force removal
   */
  removeHlsCaptionButtons(force = false) {
    if (!force) {
      const trackElements = this.player.element.querySelectorAll('track[kind="captions"], track[kind="subtitles"]');
      if (trackElements.length > 0) {
        this.player.log("Keeping caption buttons - native track elements exist", "info");
        return;
      }
    }
    this.disableAllCaptions();
    if (this.controls.captions) {
      this.controls.captions.remove();
      delete this.controls.captions;
      this.player.log("Captions button removed - no subtitle tracks", "info");
    }
    if (this.controls.captionStyle) {
      this.controls.captionStyle.remove();
      delete this.controls.captionStyle;
      this.player.log("Caption style button removed - no subtitle tracks", "info");
    }
    if (this.controls.transcript) {
      this.controls.transcript.remove();
      delete this.controls.transcript;
      this.player.log("Transcript button removed - no subtitle tracks", "info");
    }
  }
  /**
   * Disable all caption/subtitle tracks and clear the captions display
   */
  disableAllCaptions() {
    const textTracks = this.player.element.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      const tt = textTracks[i];
      if (tt) tt.mode = "disabled";
    }
    const captionsContainer = this.player.container?.querySelector(`.${this.player.options.classPrefix}-captions`);
    if (captionsContainer) {
      captionsContainer.textContent = "";
      captionsContainer.style.display = "none";
    }
    this.player.state.captionsEnabled = false;
    this.player.log("All captions disabled and cleared", "info");
  }
  updateQualityIndicator() {
    if (!this.controls.qualityText) return;
    if (!this.player.renderer || !this.player.renderer.getQualities) return;
    const qualities = this.player.renderer.getQualities();
    if (qualities.length === 0) {
      this.controls.qualityText.textContent = "";
      return;
    }
    let currentQualityText = "";
    if (typeof this.player.renderer.isAutoQuality === "function" && this.player.renderer.isAutoQuality()) {
      currentQualityText = "Auto";
    } else if (this.player.renderer.getCurrentQuality) {
      const currentIndex = this.player.renderer.getCurrentQuality();
      const currentQuality = qualities.find((q) => q.index === currentIndex);
      if (currentQuality) {
        currentQualityText = currentQuality.height ? `${currentQuality.height}p` : "";
      }
    }
    this.controls.qualityText.textContent = currentQualityText;
  }
  setupAutoHide() {
    if (this.player.element.tagName !== "VIDEO") return;
    const showControls = () => {
      this.element.classList.add(`${this.player.options.classPrefix}-controls-visible`);
      this.player.container.classList.add(`${this.player.options.classPrefix}-controls-visible`);
      this.player.state.controlsVisible = true;
      clearTimeout(this.hideTimeout);
      if (this.player.state.playing) {
        const delay = this.player.state.fullscreen ? this.player.options.hideControlsDelay * 1.5 : this.player.options.hideControlsDelay;
        this.hideTimeout = setTimeout(() => {
          this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
          this.player.container.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
          this.player.state.controlsVisible = false;
        }, delay);
      }
    };
    if (!this._autoHideBound) {
      this._autoHideBound = true;
      const signal = this.player.lifecycleSignal;
      this.player.container.addEventListener("mousemove", showControls, { signal });
      this.player.container.addEventListener("touchstart", showControls, { signal });
      this.player.container.addEventListener("touchmove", showControls, { signal });
      this.player.container.addEventListener("click", showControls, { signal });
      this.player.container.addEventListener("tap", showControls, { signal });
      this.element.addEventListener("focusin", showControls, { signal });
      this.subscribe("autohide", "pause", () => {
        showControls();
        clearTimeout(this.hideTimeout);
      });
      this.subscribe("autohide", "play", () => {
        showControls();
      });
      this.subscribe("autohide", "enterfullscreen", () => {
        showControls();
        if (this.player.state.fullscreen) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = setTimeout(() => {
            if (this.player.state.playing) {
              this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
              this.player.container.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
              this.player.state.controlsVisible = false;
            }
          }, this.player.options.hideControlsDelay * 2);
        }
      });
    }
    showControls();
  }
  createOverflowMenuButton() {
    const ariaLabel = i18n.t("player.moreOptions");
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-overflow-menu`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "aria-expanded": "false"
      }
    });
    button.appendChild(createIconElement("moreVertical"));
    DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
    button.addEventListener("click", () => {
      this.showOverflowMenu(button);
    });
    this.controls.overflowMenu = button;
    return button;
  }
  showOverflowMenu(button) {
    const existingMenu = this.player.container.querySelector(`.${this.player.options.classPrefix}-overflow-menu-list`);
    if (existingMenu) {
      existingMenu.remove();
      button.setAttribute("aria-expanded", "false");
      if (this.openMenu === existingMenu) {
        this.openMenu = null;
        this.openMenuButton = null;
      }
      return;
    }
    const menu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-overflow-menu-list ${this.player.options.classPrefix}-menu`,
      attributes: {
        "role": "menu",
        "aria-label": i18n.t("player.moreOptions")
      }
    });
    const overflowButtons = [
      ...Array.from(this.leftButtons?.querySelectorAll('button[data-in-overflow="true"]') ?? []),
      ...Array.from(this.rightButtons.querySelectorAll('button[data-in-overflow="true"]'))
    ];
    if (overflowButtons.length === 0) {
      const noItemsText = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item ${this.player.options.classPrefix}-menu-item-disabled`,
        textContent: i18n.t("player.noMoreOptions"),
        attributes: {
          "role": "menuitem",
          "aria-disabled": "true",
          "tabindex": "-1"
        },
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noItemsText);
    } else {
      overflowButtons.forEach((btn) => {
        const item = DOMUtils.createElement("button", {
          className: `${this.player.options.classPrefix}-menu-item`,
          attributes: {
            "type": "button",
            "role": "menuitem",
            "tabindex": "-1"
          }
        });
        const label = btn.getAttribute("aria-label") || btn.getAttribute("title") || "";
        const icon = btn.querySelector(".vidply-icon");
        if (icon) {
          const iconClone = icon.cloneNode(true);
          item.appendChild(iconClone);
        } else {
          const firstChild = btn.querySelector("span");
          if (firstChild && firstChild.textContent && firstChild.textContent.length <= 3) {
            const iconClone = firstChild.cloneNode(true);
            iconClone.classList.add("vidply-icon");
            item.appendChild(iconClone);
          }
        }
        const labelSpan = DOMUtils.createElement("span", {
          textContent: label
        });
        item.appendChild(labelSpan);
        item.addEventListener("click", () => {
          this._overflowMenuItemRef = item;
          const originalDisplay = btn.style.display;
          btn.style.display = "";
          btn.style.visibility = "hidden";
          btn.click();
          setTimeout(() => {
            btn.style.display = originalDisplay;
            btn.style.visibility = "";
            this._overflowMenuItemRef = null;
          }, 100);
          this.closeMenuAndReturnFocus(menu, button);
        });
        menu.appendChild(item);
      });
      this.attachMenuKeyboardNavigation(menu, button);
      setTimeout(() => {
        const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
        if (firstItem && firstItem.tagName === "BUTTON") {
          firstItem.focus({ preventScroll: true });
        }
      }, 0);
    }
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    this.insertMenuIntoDOM(menu, button);
    this.positionMenu(menu, button, true);
    requestAnimationFrame(() => {
      menu.style.visibility = "visible";
    });
    this.attachMenuCloseHandler(menu, button);
  }
  /**
   * Re-evaluate which buttons fit in the right-side area and which need to
   * be moved into the overflow ("more options") menu. Safe to call any
   * number of times — extracted from `setupOverflowDetection` so dynamic
   * button insertions (audio-description / sign-language) can request a
   * recheck without re-attaching observers.
   */
  measureControlButton(btn) {
    const style = getComputedStyle(btn);
    return btn.offsetWidth + parseInt(style.marginLeft || "0", 10) + parseInt(style.marginRight || "0", 10);
  }
  getOverflowPriority(btn, priorityAttr) {
    return parseInt(btn.dataset[priorityAttr] || btn.dataset.overflowPriority || "1", 10);
  }
  isFullscreenControlButton(btn) {
    return btn.classList.contains(`${this.player.options.classPrefix}-fullscreen`);
  }
  /**
   * Width available for right-side control buttons. Uses the controls row
   * minus the left cluster so overflow detection reacts to narrow playlist
   * columns instead of the unconstrained scroll width of the button row.
   */
  getOverflowContainerWidth() {
    if (!this.rightButtons) {
      return 0;
    }
    const parent = this.rightButtons.parentElement;
    if (parent) {
      const prefix = this.player.options.classPrefix;
      const left = parent.querySelector(`.${prefix}-controls-left`);
      const parentWidth = parent.clientWidth;
      if (parentWidth > 0) {
        const styles = getComputedStyle(parent);
        const gap = parseInt(styles.columnGap || styles.gap || "0", 10) || 0;
        const leftWidth = left?.getBoundingClientRect().width ?? 0;
        const available = Math.floor(parentWidth - leftWidth - (left && leftWidth > 0 ? gap : 0));
        if (available > 0) {
          return available;
        }
      }
    }
    const clientWidth = this.rightButtons.clientWidth;
    if (clientWidth > 0) {
      return clientWidth;
    }
    return this.rightButtons.offsetWidth;
  }
  /**
   * Fit as many collapsible buttons as possible into the row budget while
   * keeping the overflow menu (optional) and fullscreen pinned at the end.
   */
  fitCollapsibleButtons(collapsible, containerWidth, gapWidth, reserveOverflowMenu, priorityAttr, fullscreenButton, overflowButton) {
    let reserved = 0;
    if (fullscreenButton) {
      reserved += this.measureControlButton(fullscreenButton);
    }
    if (reserveOverflowMenu && overflowButton) {
      reserved += this.measureControlButton(overflowButton);
    }
    const pinnedCount = (fullscreenButton ? 1 : 0) + (reserveOverflowMenu && overflowButton ? 1 : 0);
    if (pinnedCount > 0) {
      reserved += Math.max(0, pinnedCount - 1) * gapWidth;
    }
    let budget = containerWidth - reserved;
    const sorted = collapsible.map((btn) => ({
      btn,
      width: this.measureControlButton(btn),
      priority: this.getOverflowPriority(btn, priorityAttr)
    })).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return 0;
    });
    const visible = [];
    const hidden = [];
    for (const item of sorted) {
      const gap = visible.length > 0 ? gapWidth : 0;
      if (item.width + gap <= budget) {
        budget -= item.width + gap;
        visible.push(item.btn);
      } else {
        hidden.push(item.btn);
      }
    }
    return { visible, hidden };
  }
  getLeftClusterCandidates() {
    if (!this.leftButtons) {
      return [];
    }
    return Array.from(this.leftButtons.children).filter(
      (btn) => btn.tagName === "BUTTON" && btn.dataset.skipOverflow !== "true" && !btn.hasAttribute("hidden")
    );
  }
  /**
   * Hide lower-priority left-cluster buttons when the row is too narrow.
   * Runs after the right cluster is resolved so the remaining width is accurate.
   */
  applyLeftClusterOverflow(priorityAttr, options = {}) {
    if (!this.leftButtons) {
      return;
    }
    const row = this.leftButtons.parentElement;
    if (!row) {
      return;
    }
    const candidates = this.getLeftClusterCandidates();
    candidates.forEach((btn) => {
      btn.style.display = "";
      btn.dataset.inOverflow = "false";
    });
    const rowWidth = row.clientWidth;
    if (rowWidth <= 0) {
      return;
    }
    const rowStyles = getComputedStyle(row);
    const rowGap = parseInt(rowStyles.columnGap || rowStyles.gap || "0", 10) || 0;
    const rightWidth = this.rightButtons?.getBoundingClientRect().width ?? 0;
    let budget = Math.floor(rowWidth - rightWidth - (rightWidth > 0 ? rowGap : 0));
    if (budget <= 0) {
      return;
    }
    const gapWidth = parseInt(getComputedStyle(this.leftButtons).gap || "0", 10) || 0;
    const sorted = candidates.map((btn) => ({
      btn,
      width: this.measureControlButton(btn),
      priority: this.getOverflowPriority(btn, priorityAttr)
    })).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return 0;
    });
    let visibleCount = 0;
    for (const item of sorted) {
      if (options.maxVisiblePriority !== void 0 && item.priority > options.maxVisiblePriority) {
        item.btn.style.display = "none";
        item.btn.dataset.inOverflow = "true";
        continue;
      }
      const itemGap = visibleCount > 0 ? gapWidth : 0;
      const fits = item.width + itemGap <= budget;
      if (fits || item.priority <= 1) {
        budget -= item.width + itemGap;
        visibleCount++;
        item.btn.style.display = "";
        item.btn.dataset.inOverflow = "false";
      } else {
        item.btn.style.display = "none";
        item.btn.dataset.inOverflow = "true";
      }
    }
  }
  updateOverflowMenuVisibility() {
    if (!this.overflowMenuButton) {
      return;
    }
    const hiddenCount = (this.leftButtons?.querySelectorAll('button[data-in-overflow="true"]').length ?? 0) + (this.rightButtons?.querySelectorAll('button[data-in-overflow="true"]').length ?? 0);
    this.overflowMenuButton.style.display = hiddenCount > 0 ? "" : "none";
  }
  checkOverflow() {
    const isDesktop = window.innerWidth >= 768;
    const isLandscape = window.innerHeight < window.innerWidth;
    const isFullscreen = this.player.state.fullscreen;
    const isLandscapeFullscreen = isLandscape && isFullscreen;
    if (!this.rightButtons || this.rightButtons.children.length === 0) {
      if (this.overflowMenuButton) {
        this.overflowMenuButton.style.display = "none";
      }
      return;
    }
    const allButtons = Array.from(this.rightButtons.children).filter(
      (btn) => !btn.classList.contains(`${this.player.options.classPrefix}-overflow-menu`) && btn.dataset.skipOverflow !== "true"
    );
    if (allButtons.length === 0) {
      if (this.overflowMenuButton) {
        this.overflowMenuButton.style.display = "none";
      }
      return;
    }
    const isMobilePortrait = !isDesktop && !isLandscape;
    if (!isDesktop && isLandscape && !isLandscapeFullscreen) {
      allButtons.forEach((btn) => {
        btn.dataset.inOverflow = "false";
        btn.style.display = "";
      });
      this.applyLeftClusterOverflow("overflowPriorityMobile");
      this.updateOverflowMenuVisibility();
      return;
    }
    if (this.player.options.debug) {
      console.log("Overflow detection:", {
        isDesktop,
        isFullscreen,
        isLandscape,
        isLandscapeFullscreen,
        isMobilePortrait,
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
    allButtons.forEach((btn) => {
      btn.style.display = "";
    });
    this.getLeftClusterCandidates().forEach((btn) => {
      btn.style.display = "";
      btn.dataset.inOverflow = "false";
    });
    const containerWidth = this.getOverflowContainerWidth();
    if (containerWidth <= 0) {
      return;
    }
    const gapWidth = parseInt(getComputedStyle(this.rightButtons).gap || "8", 10) || 8;
    const priorityAttr = isMobilePortrait ? "overflowPriorityMobile" : "overflowPriority";
    const fullscreenButton = allButtons.find((btn) => this.isFullscreenControlButton(btn));
    const collapsible = allButtons.filter((btn) => !this.isFullscreenControlButton(btn));
    if (isMobilePortrait) {
      for (const btn of collapsible) {
        const priority = this.getOverflowPriority(btn, priorityAttr);
        const hide = priority > 1;
        btn.dataset.inOverflow = hide ? "true" : "false";
        btn.style.display = hide ? "none" : "";
      }
      if (fullscreenButton) {
        fullscreenButton.dataset.inOverflow = "false";
        fullscreenButton.style.display = "";
      }
      this.applyLeftClusterOverflow(priorityAttr, { maxVisiblePriority: 1 });
      this.updateOverflowMenuVisibility();
      return;
    }
    let { visible, hidden } = this.fitCollapsibleButtons(
      collapsible,
      containerWidth,
      gapWidth,
      false,
      priorityAttr,
      fullscreenButton,
      this.overflowMenuButton
    );
    if (hidden.length > 0) {
      ({ visible, hidden } = this.fitCollapsibleButtons(
        collapsible,
        containerWidth,
        gapWidth,
        true,
        priorityAttr,
        fullscreenButton,
        this.overflowMenuButton
      ));
    }
    if (this.player.options.debug) {
      console.log("Overflow detection:", {
        containerWidth,
        visibleCount: visible.length,
        hiddenCount: hidden.length,
        isMobilePortrait,
        width: window.innerWidth
      });
    }
    const hiddenSet = new Set(hidden);
    for (const btn of collapsible) {
      const hide = hiddenSet.has(btn);
      btn.dataset.inOverflow = hide ? "true" : "false";
      btn.style.display = hide ? "none" : "";
    }
    if (fullscreenButton) {
      fullscreenButton.dataset.inOverflow = "false";
      fullscreenButton.style.display = "";
    }
    this.applyLeftClusterOverflow(priorityAttr);
    this.updateOverflowMenuVisibility();
  }
  setupOverflowDetection() {
    const signal = this.player.lifecycleSignal;
    const checkOverflow = () => {
      if (signal.aborted) return;
      this.checkOverflow();
    };
    if (this.overflowResizeObserver) {
      this.overflowResizeObserver.disconnect();
    }
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(checkOverflow);
    });
    resizeObserver.observe(this.rightButtons);
    const controlsRow = this.rightButtons.parentElement;
    if (controlsRow) {
      resizeObserver.observe(controlsRow);
    }
    if (!this._overflowGlobalBound) {
      this._overflowGlobalBound = true;
      window.addEventListener("resize", () => {
        requestAnimationFrame(checkOverflow);
      }, { signal });
      this.subscribe("overflow", "fullscreenchange", () => {
        setTimeout(() => {
          requestAnimationFrame(checkOverflow);
        }, 50);
      });
    }
    requestAnimationFrame(() => {
      checkOverflow();
      setTimeout(() => checkOverflow(), 100);
      setTimeout(() => checkOverflow(), 300);
      setTimeout(() => checkOverflow(), 500);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(checkOverflow);
      });
    }
    this.overflowResizeObserver = resizeObserver;
  }
  show() {
    this.element.style.display = "";
  }
  hide() {
    this.element.style.display = "none";
  }
  /**
   * Update preview video source when player source changes (for playlists)
   * Also re-initializes if preview wasn't set up initially
   */
  updatePreviewVideoSource() {
    const renderer = this.player.renderer;
    if (!renderer || !renderer.media || renderer.media.tagName !== "VIDEO") {
      return;
    }
    if (!this.previewSupported && !this.previewVideo) {
      this.initPreviewThumbnail();
    }
    if (!this.previewSupported || !this.previewVideo) {
      return;
    }
    const mainVideo = renderer.media;
    const newSrc = mainVideo.src || mainVideo.querySelector("source")?.src;
    if (newSrc && this.previewVideo.src !== newSrc) {
      this.previewThumbnailCache.clear();
      this.previewVideoReady = false;
      this.previewVideo.src = newSrc;
      if (mainVideo.crossOrigin) {
        this.previewVideo.crossOrigin = mainVideo.crossOrigin;
      }
      this.previewVideo.addEventListener("loadedmetadata", () => {
        this.previewVideoReady = true;
      }, { once: true });
    } else if (newSrc && !this.previewVideoReady && this.previewVideo.readyState >= 1) {
      this.previewVideoReady = true;
    }
  }
  /**
   * Cleanup preview thumbnail resources
   */
  cleanupPreviewThumbnail() {
    if (this.previewThumbnailTimeout) {
      clearTimeout(this.previewThumbnailTimeout);
      this.previewThumbnailTimeout = null;
    }
    if (this.previewVideo && this.previewVideo.parentNode) {
      this.previewVideo.parentNode.removeChild(this.previewVideo);
      this.previewVideo = null;
    }
    this.previewThumbnailCache.clear();
  }
  destroy() {
    this.detachPlayerEvents();
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = void 0;
    }
    if (this.overflowResizeObserver) {
      this.overflowResizeObserver.disconnect();
      this.overflowResizeObserver = null;
    }
    this.cleanupPreviewThumbnail();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
};

// src/controls/KeyboardManager.ts
var KeyboardManager = class {
  player;
  shortcuts;
  announcer = null;
  // Announcements are driven by player state-change events so they fire for
  // mouse/touch control use too, not only keyboard shortcuts (WCAG 4.1.3).
  // Gated until 'ready' so initial volume/mute/source setup stays silent.
  _announceReady = false;
  _prevMuted;
  _prevVolumePercent;
  _stateAnnouncers = [];
  _announceVolume;
  constructor(player) {
    this.player = player;
    this.shortcuts = player.options.keyboardShortcuts;
    this._prevMuted = player.state.muted;
    this._prevVolumePercent = Math.round(player.state.volume * 100);
    this._announceVolume = debounce(() => {
      const percent = Math.round(this.player.state.volume * 100);
      if (percent === this._prevVolumePercent) return;
      this._prevVolumePercent = percent;
      this.announce(i18n.t("player.volumePercent", { percent }));
    }, 500);
    this.init();
  }
  init() {
    this.attachEvents();
    this.attachStateAnnouncements();
  }
  /**
   * Subscribe to player state-change events so play/pause, mute, volume,
   * captions, fullscreen and speed changes are announced to assistive tech
   * regardless of whether the user used the keyboard, mouse or touch
   * (WCAG 4.1.3 Status Messages).
   *
   * These are the announcements `screenReaderAnnouncements: false` turns off.
   * Announcements tied to an explicit action — `Player.showNotice()` and the
   * sign-language drag/resize hints — keep speaking, since suppressing them
   * would leave that action with no feedback at all.
   */
  attachStateAnnouncements() {
    if (typeof this.player.on !== "function") return;
    const onReady = () => {
      this._announceReady = true;
    };
    this.player.on("ready", onReady);
    const register = (event, handler) => {
      const wrapped = () => {
        if (!this._announceReady) return;
        if (!this.player.options.screenReaderAnnouncements) return;
        handler();
      };
      this.player.on(event, wrapped);
      this._stateAnnouncers.push({ event, handler: wrapped });
    };
    this._stateAnnouncers.push({ event: "ready", handler: onReady });
    register("play", () => this.announce(i18n.t("player.playing")));
    register("pause", () => this.announce(i18n.t("player.paused")));
    register("captionsenabled", () => this.announce(i18n.t("player.captionsOn")));
    register("captionsdisabled", () => this.announce(i18n.t("player.captionsOff")));
    register("fullscreenchange", () => {
      this.announce(this.player.state.fullscreen ? i18n.t("player.fullscreen") : i18n.t("player.exitFullscreen"));
    });
    register("ratechange", () => {
      const rate = this.player.state.playbackSpeed;
      this.announce(i18n.t("player.speedRate", { rate: String(rate) }));
    });
    register("volumechange", () => {
      if (this.player.state.muted !== this._prevMuted) {
        this._prevMuted = this.player.state.muted;
        this.announce(this.player.state.muted ? i18n.t("player.muted") : i18n.t("player.unmuted"));
        return;
      }
      if (!this.player.state.muted) {
        this._announceVolume();
      }
    });
  }
  attachEvents() {
    this.player.container.addEventListener("keydown", (e) => {
      this.handleKeydown(e);
    }, true);
    if (!this.player.container.hasAttribute("tabindex")) {
      this.player.container.setAttribute("tabindex", "0");
    }
  }
  handleKeydown(e) {
    const target = e.target;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
      return;
    }
    const activeElement = document.activeElement;
    if (activeElement) {
      const menu = activeElement.closest('.vidply-menu, [role="menu"]');
      if (menu) {
        return;
      }
      const playlistButton = activeElement.closest(".vidply-playlist-item-button");
      if (playlistButton) {
        return;
      }
      const signWrapper = activeElement.closest(".vidply-sign-language-wrapper");
      if (signWrapper) {
        const draggable = this.player.signLanguageManager?.draggable;
        if (draggable?.keyboardDragMode || draggable?.keyboardResizeMode) {
          return;
        }
      }
      const transcriptWindow = activeElement.closest(".vidply-transcript-window");
      if (transcriptWindow) {
        const draggable = this.player.transcriptManager?.draggableResizable;
        if (draggable?.keyboardDragMode || draggable?.keyboardResizeMode) {
          return;
        }
      }
    }
    const key = e.key;
    let handled = false;
    if (key === "Escape" && this.player.state.fullscreen) {
      this.player.exitFullscreen();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    for (const [action, keys] of Object.entries(this.shortcuts)) {
      if (keys.includes(key)) {
        handled = this.executeAction(action, e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          break;
        }
      }
    }
    if (!handled && this.player.options.debug) {
      console.log("[VidPly] Unhandled key:", e.key, "code:", e.code, "shiftKey:", e.shiftKey);
    }
  }
  executeAction(action, _event) {
    switch (action) {
      case "play-pause":
        this.player.toggle();
        return true;
      case "volume-up":
        this.player.setVolume(Math.min(1, this.player.state.volume + 0.1));
        return true;
      case "volume-down":
        this.player.setVolume(Math.max(0, this.player.state.volume - 0.1));
        return true;
      case "seek-forward":
        this.player.seekForward();
        return true;
      case "seek-backward":
        this.player.seekBackward();
        return true;
      case "mute":
        this.player.toggleMute();
        return true;
      case "fullscreen":
        this.player.toggleFullscreen();
        return true;
      case "captions":
        if (this.player.captionManager && this.player.captionManager.tracks.length > 1) {
          const captionsButton = this.player.controlBar?.controls.captions;
          if (captionsButton && this.player.controlBar) {
            this.player.controlBar.showCaptionsMenu(captionsButton);
          } else {
            this.player.toggleCaptions();
          }
        } else {
          this.player.toggleCaptions();
        }
        return true;
      case "caption-style-menu":
        if (this.player.controlBar && this.player.controlBar.controls.captionStyle) {
          this.player.controlBar.showCaptionStyleMenu(this.player.controlBar.controls.captionStyle);
          return true;
        }
        return false;
      case "speed-up":
        this.player.setPlaybackSpeed(
          Math.min(2, this.player.state.playbackSpeed + 0.25)
        );
        return true;
      case "speed-down":
        this.player.setPlaybackSpeed(
          Math.max(0.25, this.player.state.playbackSpeed - 0.25)
        );
        return true;
      case "speed-menu":
        if (this.player.controlBar && this.player.controlBar.controls.speed) {
          this.player.controlBar.showSpeedMenu(this.player.controlBar.controls.speed);
          return true;
        }
        return false;
      case "quality-menu":
        if (this.player.controlBar && this.player.controlBar.controls.quality) {
          this.player.controlBar.showQualityMenu(this.player.controlBar.controls.quality);
          return true;
        }
        return false;
      case "chapters-menu":
        if (this.player.controlBar && this.player.controlBar.controls.chapters) {
          this.player.controlBar.showChaptersMenu(this.player.controlBar.controls.chapters);
          return true;
        }
        return false;
      case "transcript-toggle":
        if (this.player.transcriptManager) {
          this.player.transcriptManager.toggleTranscript();
          return true;
        }
        return false;
      case "help":
        this.player.toggleKeyboardHelp();
        return true;
      default:
        return false;
    }
  }
  announceAction(action) {
    if (!this.player.options.screenReaderAnnouncements) return;
    let message = "";
    switch (action) {
      case "play-pause":
        message = this.player.state.playing ? i18n.t("player.playing") : i18n.t("player.paused");
        break;
      case "volume-up":
      case "volume-down": {
        const percent = Math.round(this.player.state.volume * 100);
        message = i18n.t("player.volumePercent", { percent });
        break;
      }
      case "mute":
        message = this.player.state.muted ? i18n.t("player.muted") : i18n.t("player.unmuted");
        break;
      case "fullscreen":
        message = this.player.state.fullscreen ? i18n.t("player.fullscreen") : i18n.t("player.exitFullscreen");
        break;
      case "captions":
        message = this.player.state.captionsEnabled ? i18n.t("player.captionsOn") : i18n.t("player.captionsOff");
        break;
      case "speed-up":
      case "speed-down": {
        const rate = this.player.state.playbackSpeed;
        message = i18n.t("player.speedRate", { rate: String(rate) });
        break;
      }
    }
    if (message) {
      this.announce(message);
    }
  }
  /**
   * Live-region announcer scoped to *this* player instance so multi-player
   * pages do not cross-talk through a shared `#vidply-announcer` id. The
   * region is appended to `document.body` so it is reachable regardless of
   * the embedding container's stacking / overflow context.
   */
  announce(message, priority = "polite") {
    if (!this.announcer) {
      const id = `vidply-announcer-${this.player.instanceId}`;
      this.announcer = document.createElement("div");
      this.announcer.id = id;
      this.announcer.className = "vidply-sr-only";
      this.announcer.setAttribute("aria-live", priority);
      this.announcer.setAttribute("aria-atomic", "true");
      this.announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(this.announcer);
    } else {
      this.announcer.setAttribute("aria-live", priority);
    }
    this.announcer.textContent = "";
    const announcer = this.announcer;
    setTimeout(() => {
      if (announcer) announcer.textContent = message;
    }, 100);
  }
  updateShortcut(action, keys) {
    if (Array.isArray(keys)) {
      this.shortcuts[action] = keys;
    }
  }
  destroy() {
    if (typeof this.player.off === "function") {
      for (const { event, handler } of this._stateAnnouncers) {
        this.player.off(event, handler);
      }
    }
    this._stateAnnouncers = [];
    if (this.announcer && this.announcer.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer);
    }
    this.announcer = null;
  }
};

// src/core/MediaSessionManager.ts
var POSITION_THROTTLE_MS = 1e3;
var activeManager = null;
function setActiveManager(manager) {
  activeManager = manager;
}
var MediaSessionManager = class {
  player;
  supported;
  handlers = {};
  boundActions = [];
  lastPositionUpdate = 0;
  constructor(player) {
    this.player = player;
    this.supported = typeof navigator !== "undefined" && "mediaSession" in navigator;
    if (!this.supported) return;
    this.attachEvents();
    if (activeManager === null) {
      this.claimSession();
    }
  }
  /** Does this manager currently own the global media session? */
  isActive() {
    return activeManager === this;
  }
  /**
   * Take ownership of the global session: (re)register the action handlers so
   * the OS controls drive this player, and refresh metadata/state/position.
   */
  claimSession() {
    if (!this.supported) return;
    setActiveManager(this);
    this.setupActionHandlers();
    this.updateMetadata();
    this.updatePlaybackState();
    this.updatePositionState(true);
  }
  get session() {
    return navigator.mediaSession;
  }
  setActionHandler(action, handler) {
    try {
      this.session.setActionHandler(action, handler);
      if (handler && !this.boundActions.includes(action)) {
        this.boundActions.push(action);
      }
    } catch {
    }
  }
  setupActionHandlers() {
    this.setActionHandler("play", () => this.player.play());
    this.setActionHandler("pause", () => this.player.pause());
    this.setActionHandler("stop", () => this.player.stop());
    this.setActionHandler("seekbackward", (details) => {
      this.player.seekBackward(this.offsetFrom(details));
    });
    this.setActionHandler("seekforward", (details) => {
      this.player.seekForward(this.offsetFrom(details));
    });
    this.setActionHandler("seekto", (details) => {
      if (details && typeof details.seekTime === "number") {
        this.player.seek(details.seekTime);
      }
    });
    this.updateTrackHandlers();
  }
  offsetFrom(details) {
    const offset = details && typeof details.seekOffset === "number" ? details.seekOffset : void 0;
    return typeof offset === "number" && offset > 0 ? offset : void 0;
  }
  /**
   * previous/next track only make sense with a multi-item playlist; bind
   * or clear them whenever the playlist state changes so the OS shows the
   * correct affordances.
   */
  updateTrackHandlers() {
    const pm = this.player.playlistManager;
    const hasPlaylist = Boolean(pm && Array.isArray(pm.tracks) && pm.tracks.length > 1);
    if (hasPlaylist && pm) {
      this.setActionHandler("previoustrack", () => pm.previous());
      this.setActionHandler("nexttrack", () => pm.next());
    } else {
      this.setActionHandler("previoustrack", null);
      this.setActionHandler("nexttrack", null);
    }
  }
  attachEvents() {
    this.handlers = {
      // Starting playback makes this player the session owner, taking over
      // the OS controls from any other player on the page.
      play: () => this.claimSession(),
      pause: () => {
        if (!this.isActive()) return;
        this.updatePlaybackState();
        this.updatePositionState(true);
      },
      ended: () => {
        if (!this.isActive()) return;
        this.updatePlaybackState();
      },
      timeupdate: () => {
        if (!this.isActive()) return;
        this.updatePositionState();
      },
      durationchange: () => {
        if (!this.isActive()) return;
        this.updatePositionState(true);
      },
      ratechange: () => {
        if (!this.isActive()) return;
        this.updatePositionState(true);
      },
      loadedmetadata: () => {
        if (!this.isActive()) return;
        this.updateMetadata();
        this.updatePositionState(true);
      },
      playlisttrackchange: () => {
        if (!this.isActive()) return;
        this.updateMetadata();
        this.updateTrackHandlers();
        this.updatePositionState(true);
      }
    };
    for (const [event, handler] of Object.entries(this.handlers)) {
      if (handler) {
        this.player.on(event, handler);
      }
    }
  }
  resolveMetadata() {
    const opts = this.player.options;
    let title = opts.title || "";
    let artist = opts.artist || "";
    const album = opts.album || "";
    let poster = opts.poster || null;
    const pm = this.player.playlistManager;
    if (pm && Array.isArray(pm.tracks) && pm.currentIndex >= 0) {
      const track = pm.tracks[pm.currentIndex];
      if (track) {
        if (track.title) title = track.title;
        if (track.artist) artist = track.artist;
        if (track.poster) poster = track.poster;
      }
    }
    if (!title && typeof document !== "undefined") {
      title = document.title || "VidPly";
    }
    return { title, artist, album, poster };
  }
  updateMetadata() {
    if (!this.supported || typeof window === "undefined" || typeof window.MediaMetadata === "undefined") {
      return;
    }
    const { title, artist, album, poster } = this.resolveMetadata();
    const artwork = [];
    if (poster) {
      try {
        const src = this.player.resolvePosterPath(poster);
        if (src) {
          artwork.push({ src });
        }
      } catch {
      }
    }
    try {
      this.session.metadata = new window.MediaMetadata({
        title,
        artist,
        album,
        artwork
      });
    } catch {
    }
  }
  updatePlaybackState() {
    if (!this.supported) return;
    try {
      this.session.playbackState = this.player.state.playing ? "playing" : "paused";
    } catch {
    }
  }
  /**
   * Push the current position to the OS scrubber. `timeupdate` fires
   * several times a second, so non-forced updates are throttled.
   */
  updatePositionState(force = false) {
    if (!this.supported || typeof this.session.setPositionState !== "function") {
      return;
    }
    const now = Date.now();
    if (!force && now - this.lastPositionUpdate < POSITION_THROTTLE_MS) {
      return;
    }
    this.lastPositionUpdate = now;
    const duration = this.player.state.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      try {
        this.session.setPositionState();
      } catch {
      }
      return;
    }
    const playbackRate = this.player.state.playbackSpeed || 1;
    const position = Math.min(Math.max(0, this.player.state.currentTime || 0), duration);
    try {
      this.session.setPositionState({
        duration,
        playbackRate: playbackRate > 0 ? playbackRate : 1,
        position
      });
    } catch {
    }
  }
  destroy() {
    if (!this.supported) return;
    for (const [event, handler] of Object.entries(this.handlers)) {
      if (handler) {
        this.player.off(event, handler);
      }
    }
    this.handlers = {};
    if (this.isActive()) {
      for (const action of this.boundActions) {
        try {
          this.session.setActionHandler(action, null);
        } catch {
        }
      }
      try {
        this.session.metadata = null;
      } catch {
      }
      try {
        if (typeof this.session.setPositionState === "function") {
          this.session.setPositionState();
        }
      } catch {
      }
      try {
        this.session.playbackState = "none";
      } catch {
      }
      activeManager = null;
    }
    this.boundActions = [];
  }
};

// src/constants/layoutBreakpoints.ts
var PLAYLIST_PANEL_RIGHT_DESKTOP_MIN_WIDTH = "75rem";
var PLAYLIST_PANEL_RIGHT_DESKTOP_MEDIA_QUERY = `(width >= ${PLAYLIST_PANEL_RIGHT_DESKTOP_MIN_WIDTH})`;
function isPlaylistPanelRightDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia(PLAYLIST_PANEL_RIGHT_DESKTOP_MEDIA_QUERY).matches;
}

// src/utils/UrlSafe.ts
function sanitizePosterUrl(input) {
  if (typeof input !== "string" || input.length === 0 || input.length > 4096) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/[\s"'<>\\]/.test(trimmed)) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed, typeof window !== "undefined" ? window.location.href : "http://localhost/");
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
    if (url.protocol === "data:" && /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);/i.test(trimmed)) {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}
function cssEscapeUrl(url) {
  return url.replace(/["()\\]/g, (m) => `\\${m}`);
}
function toCssBackgroundImage(input) {
  const safe = sanitizePosterUrl(input);
  if (!safe) return null;
  return `url("${cssEscapeUrl(safe)}")`;
}

// src/utils/RendererType.ts
function classifyRendererType(src) {
  if (src.includes("youtube.com") || src.includes("youtu.be") || src.includes("youtube-nocookie.com")) return "youtube";
  if (src.includes("vimeo.com")) return "vimeo";
  if (src.includes(".m3u8")) return "hls";
  if (src.includes(".mpd")) return "dash";
  if (src.includes("soundcloud.com") || src.includes("api.soundcloud.com")) return "soundcloud";
  return "html5";
}

// src/core/LazyInit.ts
var pendingByElement = /* @__PURE__ */ new WeakMap();
function observeForLazyInit(element, options, margin, factory) {
  const existing = pendingByElement.get(element);
  if (existing) {
    existing.observer.unobserve(element);
    pendingByElement.delete(element);
  }
  const rect = element.getBoundingClientRect();
  if (rect.height < 20) {
    factory(element, options);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          pendingByElement.delete(entry.target);
          factory(entry.target, options);
        }
      });
    },
    { rootMargin: margin, threshold: 0 }
  );
  observer.observe(element);
  pendingByElement.set(element, { observer, options });
}
function cancelLazyInit(element) {
  const pending = pendingByElement.get(element);
  if (pending) {
    pending.observer.unobserve(element);
    pendingByElement.delete(element);
  }
}

// src/core/PseudoFullscreen.ts
var PseudoFullscreenController = class {
  player;
  // All of the "remember current style / scroll / viewport" slots used
  // to restore state on exit. Kept private so the rest of the code
  // base cannot poke into them.
  originalScrollX;
  originalScrollY;
  originalBodyOverflow;
  originalBodyPosition;
  originalBodyWidth;
  originalBodyHeight;
  originalHtmlOverflow;
  originalBodyBackground;
  originalHtmlBackground;
  originalViewport;
  inertElements = [];
  constructor(player) {
    this.player = player;
  }
  enable() {
    const { player } = this;
    player.state.fullscreen = true;
    player.container.classList.add(`${player.options.classPrefix}-fullscreen`);
    document.body.classList.add("vidply-fullscreen-active");
    this.originalScrollX = window.scrollX || window.pageXOffset;
    this.originalScrollY = window.scrollY || window.pageYOffset;
    this.originalBodyOverflow = document.body.style.overflow;
    this.originalBodyPosition = document.body.style.position;
    this.originalBodyWidth = document.body.style.width;
    this.originalBodyHeight = document.body.style.height;
    this.originalHtmlOverflow = document.documentElement.style.overflow;
    this.originalBodyBackground = document.body.style.background;
    this.originalHtmlBackground = document.documentElement.style.background;
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.background = "#000";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.background = "#000";
    this.originalViewport = document.querySelector('meta[name="viewport"]')?.getAttribute("content");
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute("content", "width=device-width, initial-scale=1.0");
    }
    window.scrollTo(0, 0);
    this.makeBackgroundInert();
    player.emit("fullscreenchange", true);
    player.emit("enterfullscreen");
  }
  /**
   * Make every sibling of the player container (walking up to the body)
   * `inert`. Scripts/styles are skipped so layout-time mutations still
   * work. Elements that were already inert are left alone so we don't
   * accidentally clear another author's inert marker on exit.
   *
   * Public because the real Fullscreen API handler also calls it — we
   * need the same inert treatment when the browser grants real
   * fullscreen, not only in the pseudo-fallback path.
   */
  makeBackgroundInert() {
    this.inertElements = [];
    let current = this.player.container;
    while (current && current !== document.body && current !== document.documentElement) {
      const parentElement = current.parentElement;
      if (parentElement) {
        Array.from(parentElement.children).forEach((sibling) => {
          if (sibling !== current && sibling.nodeType === Node.ELEMENT_NODE && !sibling.hasAttribute("inert") && sibling.tagName !== "SCRIPT" && sibling.tagName !== "STYLE" && sibling.tagName !== "LINK" && sibling.tagName !== "META") {
            sibling.setAttribute("inert", "");
            this.inertElements.push(sibling);
          }
        });
      }
      current = parentElement;
    }
  }
  /** Public counterpart of {@link makeBackgroundInert}. */
  restoreBackgroundInteractivity() {
    if (this.inertElements.length > 0) {
      for (const el of this.inertElements) {
        el.removeAttribute("inert");
      }
      this.inertElements = [];
    }
  }
  disable() {
    document.body.classList.remove("vidply-fullscreen-active");
    this.restoreBackgroundInteractivity();
    if (this.originalBodyOverflow !== void 0) {
      document.body.style.overflow = this.originalBodyOverflow;
      this.originalBodyOverflow = void 0;
    }
    if (this.originalBodyPosition !== void 0) {
      document.body.style.position = this.originalBodyPosition;
      this.originalBodyPosition = void 0;
    }
    if (this.originalBodyWidth !== void 0) {
      document.body.style.width = this.originalBodyWidth;
      this.originalBodyWidth = void 0;
    }
    if (this.originalBodyHeight !== void 0) {
      document.body.style.height = this.originalBodyHeight;
      this.originalBodyHeight = void 0;
    }
    if (this.originalHtmlOverflow !== void 0) {
      document.documentElement.style.overflow = this.originalHtmlOverflow;
      this.originalHtmlOverflow = void 0;
    }
    if (this.originalBodyBackground !== void 0) {
      document.body.style.background = this.originalBodyBackground;
      this.originalBodyBackground = void 0;
    }
    if (this.originalHtmlBackground !== void 0) {
      document.documentElement.style.background = this.originalHtmlBackground;
      this.originalHtmlBackground = void 0;
    }
    if (this.originalViewport !== void 0) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport && this.originalViewport !== null) {
        viewport.setAttribute("content", this.originalViewport);
      }
      this.originalViewport = void 0;
    }
    if (this.originalScrollX !== void 0 && this.originalScrollY !== void 0) {
      window.scrollTo(this.originalScrollX, this.originalScrollY);
      this.originalScrollX = void 0;
      this.originalScrollY = void 0;
    }
    this.player.emit("exitfullscreen");
  }
};

// src/core/ThemeManager.ts
var PLAYER_THEMES = ["dark", "light", "minimal", "high-contrast"];
function isValidThemeVariableName(name) {
  return /^--vidply-[A-Za-z0-9_-]{1,64}$/.test(name);
}
function isValidThemeVariableValue(value) {
  if (typeof value !== "string") return false;
  if (value.length > 200) return false;
  return !/[<>{};@\\]/.test(value);
}
var ThemeManager = class {
  player;
  constructor(player) {
    this.player = player;
  }
  /**
   * Apply `options.theme` and validate-and-apply every entry in
   * `options.themeVariables` to the container. Bad entries are logged
   * and skipped so a single malformed override cannot poison siblings.
   */
  apply() {
    const player = this.player;
    if (!player.container) return;
    const themeClasses = PLAYER_THEMES.map((t) => `${player.options.classPrefix}-theme-${t}`);
    player.container.classList.remove(...themeClasses);
    const theme = player.options.theme;
    if (theme && PLAYER_THEMES.includes(theme)) {
      player.container.classList.add(`${player.options.classPrefix}-theme-${theme}`);
    }
    if (player.options.themeVariables && typeof player.options.themeVariables === "object") {
      for (const [rawKey, rawValue] of Object.entries(player.options.themeVariables)) {
        if (isForbiddenKey(rawKey)) continue;
        const cssVar = rawKey.startsWith("--vidply-") ? rawKey : `--vidply-${rawKey}`;
        if (!isValidThemeVariableName(cssVar)) {
          player.log(`[VidPly] Ignoring invalid theme variable name: ${rawKey}`, "warn");
          continue;
        }
        if (!isValidThemeVariableValue(rawValue)) {
          player.log(`[VidPly] Ignoring invalid theme variable value for ${cssVar}`, "warn");
          continue;
        }
        player.container.style.setProperty(cssVar, rawValue);
      }
    }
  }
  /**
   * Swap the active theme at runtime. Emits `themechange` with the old
   * and new names so external consumers (e.g. telemetry) can react.
   */
  set(themeName, customVariables = {}) {
    const player = this.player;
    const previousTheme = player.options.theme;
    player.options.theme = themeName;
    if (customVariables && Object.keys(customVariables).length > 0) {
      player.options.themeVariables = {
        ...player.options.themeVariables,
        ...customVariables
      };
    }
    this.apply();
    player.emit("themechange", {
      theme: themeName,
      previousTheme,
      customVariables: player.options.themeVariables
    });
  }
  get() {
    return this.player.options.theme;
  }
  /** Set a single CSS variable override, validating the (name, value)
   *  pair before it reaches the DOM. Callers must pass a string value. */
  setVariable(variableName, value) {
    const player = this.player;
    if (!player.container) return;
    const cssVar = variableName.startsWith("--vidply-") ? variableName : `--vidply-${variableName}`;
    if (!isValidThemeVariableName(cssVar) || !isValidThemeVariableValue(value)) {
      player.log(`[VidPly] Ignoring unsafe setThemeVariable(${variableName})`, "warn");
      return;
    }
    player.container.style.setProperty(cssVar, value);
    if (!player.options.themeVariables) {
      player.options.themeVariables = {};
    }
    player.options.themeVariables[variableName] = value;
  }
  /**
   * Reset to the default theme (dark) and clear every override that was
   * applied through `options.themeVariables`.
   */
  reset() {
    const player = this.player;
    if (player.container && player.options.themeVariables) {
      Object.keys(player.options.themeVariables).forEach((key) => {
        const cssVar = key.startsWith("--vidply-") ? key : `--vidply-${key}`;
        player.container.style.removeProperty(cssVar);
      });
    }
    const previousTheme = player.options.theme;
    player.options.theme = "dark";
    player.options.themeVariables = {};
    this.apply();
    player.emit("themechange", { theme: "dark", previousTheme });
  }
};

// src/core/PosterManager.ts
var PosterManager = class _PosterManager {
  player;
  constructor(player) {
    this.player = player;
  }
  /**
   * Build a CSS `url("...")` value for a poster that is safe to
   * interpolate into a custom property / `background-image`.
   *
   * - `data:image/*` URLs (e.g. an auto-captured frame) are opaque and
   *   frequently exceed the allow-list length cap, so they bypass
   *   {@link sanitizePosterUrl} but are still CSS-escaped and required to
   *   carry an `image/*` MIME type.
   * - Everything else goes through the poster allow-list.
   *
   * Returns `null` for anything unsafe so callers can skip the overlay.
   */
  static toSafeCssPoster(resolved) {
    if (typeof resolved !== "string" || !resolved) return null;
    if (/^data:/i.test(resolved)) {
      if (!/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);/i.test(resolved)) return null;
      return `url("${cssEscapeUrl(resolved)}")`;
    }
    const safe = sanitizePosterUrl(resolved);
    if (!safe) return null;
    return `url("${cssEscapeUrl(safe)}")`;
  }
  /**
   * Convert a relative poster path into an absolute URL. Absolute URLs
   * (http/https) and root-relative paths (`/foo`) are returned as-is.
   * Falls back to the raw string on any parse error — a malformed URL
   * is still better than throwing and breaking the caller.
   */
  resolvePath(posterPath) {
    if (!posterPath) return "";
    if (posterPath.match(/^(https?:|\/)/)) {
      return posterPath;
    }
    try {
      const posterUrl = new URL(posterPath, window.location.href);
      return posterUrl.href;
    } catch {
      return posterPath;
    }
  }
  /**
   * Capture a frame from the underlying video as a data URL suitable
   * for use as `<video>.poster`. Returns `null` when the element is
   * not a video, the renderer isn't ready, or the capture fails.
   *
   * When the control bar has a hidden "preview video" element (used
   * for the seek hover thumbnail), we prefer that so we don't disturb
   * the user's current playback position.
   */
  async generateFromVideo(time = 10) {
    const player = this.player;
    if (player.element.tagName !== "VIDEO") return null;
    const renderer = player.renderer;
    if (!renderer || !renderer.media || renderer.media.tagName !== "VIDEO") {
      return null;
    }
    const video = renderer.media;
    if (!video.duration || video.duration < time) {
      time = Math.min(time, Math.max(1, video.duration * 0.1));
    }
    let videoToUse = video;
    if (player.controlBar && player.controlBar.previewVideo && player.controlBar.previewSupported) {
      videoToUse = player.controlBar.previewVideo;
    }
    const restoreState = videoToUse === video;
    return await captureVideoFrame(videoToUse, time, {
      restoreState,
      quality: 0.9
    });
  }
  /**
   * Auto-generate a poster from the video at the 10-second mark if the
   * content doesn't already have one. No-op for audio elements and for
   * media that ships with a poster attribute or option.
   */
  async autoGenerate() {
    const player = this.player;
    const hasPoster = player.element.getAttribute("poster") || player.element.poster || player.options.poster;
    if (hasPoster) return;
    if (player.element.tagName !== "VIDEO") return;
    if (!player.state.duration || player.state.duration === 0) {
      await new Promise((resolve) => {
        const onLoadedMetadata = () => {
          player.element.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        if (player.element.readyState >= 1) {
          resolve();
        } else {
          player.element.addEventListener("loadedmetadata", onLoadedMetadata);
        }
      });
    }
    const posterDataURL = await this.generateFromVideo(10);
    if (posterDataURL) {
      player.element.poster = posterDataURL;
      player.log("Auto-generated poster from video frame at 10 seconds", "info");
      this.showOverlay();
    }
  }
  /**
   * Apply the poster as a CSS background on the video wrapper. This is
   * used to keep the poster visible behind the play button when the
   * browser wouldn't render `<video>.poster` itself (e.g. during
   * fallback / transitional states).
   */
  showOverlay() {
    const player = this.player;
    if (!player.videoWrapper || player.element.tagName !== "VIDEO") return;
    const poster = player.element.getAttribute("poster") || player.element.poster || player.options.poster;
    if (!poster) return;
    const resolvedPoster = poster.startsWith("data:") ? poster : this.resolvePath(poster);
    const cssPoster = _PosterManager.toSafeCssPoster(resolvedPoster);
    if (!cssPoster) return;
    player.videoWrapper.style.setProperty("--vidply-poster-image", cssPoster);
    player.videoWrapper.classList.add("vidply-forced-poster");
    if (player._isAudioContent && player.container) {
      player.container.classList.add("vidply-audio-content");
    } else if (player.container) {
      player.container.classList.remove("vidply-audio-content");
    }
  }
  hideOverlay() {
    const player = this.player;
    if (!player.videoWrapper) return;
    player.videoWrapper.classList.remove("vidply-forced-poster");
    player.videoWrapper.style.removeProperty("--vidply-poster-image");
  }
};

// src/core/ResumeManager.ts
var ResumeManager = class {
  player;
  saveProgressThrottled = null;
  resumeChecked = false;
  listenersAttached = false;
  /** Element focused before the modal opened, restored when it closes. */
  previouslyFocused = null;
  constructor(player) {
    this.player = player;
  }
  /**
   * Wire up the progress-save + resume-check listeners. Safe to call
   * multiple times: repeat calls are no-ops so a re-init path during
   * source switching doesn't stack duplicate listeners.
   */
  init() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;
    this.saveProgressThrottled = throttle(() => this.saveProgress(), 5e3);
    this.player.on("timeupdate", () => {
      if (this.player.state.playing && this.player.state.duration > 0) {
        this.saveProgressThrottled?.();
      }
    });
    this.player.on("loadedmetadata", () => {
      if (!this.resumeChecked) {
        this.resumeChecked = true;
        this.checkForResume();
      }
    });
    this.player.on("ended", () => {
      const videoId = this.player.getVideoId();
      if (videoId) {
        this.player.storage.clearWatchProgress(videoId);
      }
    });
  }
  /**
   * Persist current playback progress to storage. No-op when the
   * feature is disabled, when the video is too short / at the very
   * start, or when playback is effectively complete.
   */
  saveProgress() {
    const player = this.player;
    if (!player.options.resumePlayback) return;
    const videoId = player.getVideoId();
    if (!videoId) return;
    const currentTime = player.state.currentTime;
    const duration = player.state.duration;
    if (duration < 30 || currentTime < player.options.resumeThreshold) {
      return;
    }
    const percentage = currentTime / duration * 100;
    if (percentage > 95) return;
    player.storage.saveWatchProgress(videoId, currentTime, duration);
  }
  /**
   * Check for a previously-saved resume point for the current video
   * and either auto-resume or show the prompt depending on
   * `options.resumePrompt`. Safe to call manually, e.g. after an
   * external source change.
   */
  checkForResume() {
    const player = this.player;
    if (!player.options.resumePlayback) return;
    const videoId = player.getVideoId();
    if (!videoId) return;
    const progress = player.storage.getWatchProgress(videoId);
    if (!progress) return;
    const { currentTime, duration, percentage } = progress;
    const threshold = player.options.resumeThreshold;
    if (currentTime < threshold || percentage > 95) {
      player.storage.clearWatchProgress(videoId);
      return;
    }
    if (player.state.duration > 0 && Math.abs(player.state.duration - duration) > 5) {
      player.storage.clearWatchProgress(videoId);
      return;
    }
    if (player.options.resumePrompt) {
      this.showPrompt(currentTime);
    } else {
      player.seek(currentTime);
    }
  }
  /**
   * Format a time value as `mm:ss` (or `hh:mm:ss` once we cross an
   * hour) for display in the resume prompt label. No localisation is
   * needed because the surrounding prompt text is already localised
   * by i18n.
   */
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  /**
   * Collect the tabbable elements inside a container, in DOM order. Used to
   * keep Tab / Shift+Tab cycling within the modal (focus trap).
   */
  getFocusableElements(container) {
    if (!container) return [];
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector)).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1"
    );
  }
  showPrompt(savedTime) {
    const player = this.player;
    if (player.state.resumePromptVisible || !player.container) return;
    this.previouslyFocused = document.activeElement;
    const formattedTime = this.formatTime(savedTime);
    const promptText = i18n.t("resume.prompt", { time: formattedTime });
    player.resumePromptElement = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-resume-prompt`,
      attributes: {
        role: "dialog",
        "aria-label": promptText,
        "aria-modal": "true"
      }
    });
    const promptContent = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-resume-prompt-content`
    });
    const promptMessage = DOMUtils.createElement("p", {
      className: `${player.options.classPrefix}-resume-prompt-message`,
      textContent: promptText
    });
    const buttonContainer = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-resume-prompt-buttons`
    });
    const resumeButton = DOMUtils.createElement("button", {
      className: `${player.options.classPrefix}-resume-prompt-button ${player.options.classPrefix}-resume-prompt-button-primary`,
      textContent: i18n.t("resume.resume"),
      attributes: { type: "button" }
    });
    resumeButton.addEventListener("click", () => {
      this.hidePrompt();
      player.seek(savedTime);
      player.play();
    });
    const startOverButton = DOMUtils.createElement("button", {
      className: `${player.options.classPrefix}-resume-prompt-button`,
      textContent: i18n.t("resume.startOver"),
      attributes: { type: "button" }
    });
    startOverButton.addEventListener("click", () => {
      this.hidePrompt();
      const videoId = player.getVideoId();
      if (videoId) player.storage.clearWatchProgress(videoId);
      player.seek(0);
      player.play();
    });
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.hidePrompt();
        return;
      }
      if (e.key === "Tab") {
        const focusable = this.getFocusableElements(player.resumePromptElement);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        const active = document.activeElement;
        const withinModal = player.resumePromptElement?.contains(active) ?? false;
        if (e.shiftKey) {
          if (!withinModal || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (!withinModal || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    player.resumePromptElement.addEventListener("keydown", handleKeydown);
    buttonContainer.appendChild(resumeButton);
    buttonContainer.appendChild(startOverButton);
    promptContent.appendChild(promptMessage);
    promptContent.appendChild(buttonContainer);
    player.resumePromptElement.appendChild(promptContent);
    player.container.appendChild(player.resumePromptElement);
    player.state.resumePromptVisible = true;
    requestAnimationFrame(() => {
      resumeButton.focus();
    });
    player.emit("resumepromptshow", { savedTime });
  }
  hidePrompt() {
    const player = this.player;
    if (!player.resumePromptElement) return;
    const toRestore = this.previouslyFocused;
    this.previouslyFocused = null;
    player.resumePromptElement.remove();
    player.resumePromptElement = null;
    player.state.resumePromptVisible = false;
    const fallback = player.controlBar?.controls?.playPause ?? null;
    const target = toRestore && document.contains(toRestore) ? toRestore : fallback;
    target?.focus({ preventScroll: true });
    player.emit("resumeprompthide");
  }
};

// src/core/ResponsiveManager.ts
var ResponsiveManager = class {
  player;
  orientationQuery = null;
  orientationHandler = null;
  constructor(player) {
    this.player = player;
  }
  setup() {
    this.setupResizeTracking();
    this.setupOrientationTracking();
    this.setupFullscreenTracking();
  }
  setupResizeTracking() {
    const player = this.player;
    if (typeof ResizeObserver !== "undefined") {
      player.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const controlBar = player.controlBar;
          if (controlBar && typeof controlBar.updateControlsForViewport === "function") {
            controlBar.updateControlsForViewport(width);
          }
          if (player.transcriptManager && player.transcriptManager.isVisible) {
            player.transcriptManager.positionTranscript();
          }
        }
      });
      player.resizeObserver.observe(player.container);
      return;
    }
    player.resizeHandler = () => {
      const width = player.container.clientWidth;
      const controlBar = player.controlBar;
      if (controlBar && typeof controlBar.updateControlsForViewport === "function") {
        controlBar.updateControlsForViewport(width);
      }
      if (player.transcriptManager && player.transcriptManager.isVisible) {
        if (!player.transcriptManager.draggableResizable || !player.transcriptManager.draggableResizable.manuallyPositioned) {
          player.transcriptManager.positionTranscript();
        }
      }
    };
    window.addEventListener("resize", player.resizeHandler, { signal: player.lifecycleSignal });
  }
  setupOrientationTracking() {
    const player = this.player;
    if (!window.matchMedia) return;
    this.orientationHandler = () => {
      setTimeout(() => {
        if (player.transcriptManager && player.transcriptManager.isVisible) {
          if (!player.transcriptManager.draggableResizable || !player.transcriptManager.draggableResizable.manuallyPositioned) {
            player.transcriptManager.positionTranscript();
          }
        }
      }, 100);
    };
    const orientationQuery = window.matchMedia("(orientation: portrait)");
    if (orientationQuery.addEventListener) {
      orientationQuery.addEventListener("change", this.orientationHandler, {
        signal: player.lifecycleSignal
      });
    } else if (orientationQuery.addListener) {
      orientationQuery.addListener(this.orientationHandler);
    }
    this.orientationQuery = orientationQuery;
    player.orientationQuery = orientationQuery;
    player.orientationHandler = this.orientationHandler;
  }
  setupFullscreenTracking() {
    const player = this.player;
    player.fullscreenChangeHandler = () => {
      const doc = document;
      const isFullscreen = Boolean(
        document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement
      );
      if (player.state.fullscreen === isFullscreen) return;
      player.state.fullscreen = isFullscreen;
      if (!player.pseudoFullscreen) {
        player.pseudoFullscreen = new PseudoFullscreenController(player);
      }
      if (isFullscreen) {
        player.container.classList.add(`${player.options.classPrefix}-fullscreen`);
        document.body.classList.add("vidply-fullscreen-active");
        player.pseudoFullscreen.makeBackgroundInert();
      } else {
        player.container.classList.remove(`${player.options.classPrefix}-fullscreen`);
        document.body.classList.remove("vidply-fullscreen-active");
        player.pseudoFullscreen.restoreBackgroundInteractivity();
        player._disablePseudoFullscreen();
      }
      player.emit("fullscreenchange", isFullscreen);
      if (player.controlBar) {
        player.controlBar.updateFullscreenButton();
      }
      if (player.signLanguageWrapper && player.signLanguageWrapper.style.display !== "none") {
        const isMobileDevice = window.innerWidth < 768;
        if (isMobileDevice) {
          player.setupSignLanguageInteraction();
        }
        player.setManagedTimeout(() => {
          requestAnimationFrame(() => {
            player.storage.saveSignLanguagePreferences({ size: null });
            if (player.signLanguageWrapper) {
              player.signLanguageWrapper.style.width = isFullscreen ? "400px" : "280px";
            }
            player.constrainSignLanguagePosition();
          });
        }, 500);
      }
    };
    const opts = { signal: player.lifecycleSignal };
    document.addEventListener("fullscreenchange", player.fullscreenChangeHandler, opts);
    document.addEventListener("webkitfullscreenchange", player.fullscreenChangeHandler, opts);
    document.addEventListener("mozfullscreenchange", player.fullscreenChangeHandler, opts);
    document.addEventListener("MSFullscreenChange", player.fullscreenChangeHandler, opts);
  }
  /**
   * Tear down listeners that aren't covered by the Player's
   * lifecycle AbortController. The `window.resize` and
   * `document.fullscreenchange` listeners are already cleaned up
   * via `{signal}`; only the ResizeObserver and old-Safari
   * matchMedia listener need an explicit removal.
   */
  cleanup() {
    const player = this.player;
    if (player.resizeObserver) {
      player.resizeObserver.disconnect();
      player.resizeObserver = null;
    }
    player.resizeHandler = null;
    player.fullscreenChangeHandler = null;
    if (this.orientationQuery && this.orientationHandler) {
      if (this.orientationQuery.removeEventListener) {
        this.orientationQuery.removeEventListener("change", this.orientationHandler);
      } else if (this.orientationQuery.removeListener) {
        this.orientationQuery.removeListener(this.orientationHandler);
      }
      this.orientationQuery = null;
      this.orientationHandler = null;
    }
    player.orientationQuery = null;
    player.orientationHandler = null;
  }
};

// src/core/LiveStreamManager.ts
var LiveStreamManager = class {
  player;
  boundRefresh;
  boundReset;
  /** Set by renderers when the manifest reports a dynamic/live playlist. */
  sourceReportsLive = null;
  constructor(player) {
    this.player = player;
    this.boundRefresh = () => this.refresh();
    this.boundReset = () => {
      this.sourceReportsLive = null;
      this.refresh();
      this.player.controlBar?.updateLiveControls();
    };
    this.player.on("timeupdate", this.boundRefresh);
    this.player.on("durationchange", this.boundRefresh);
    this.player.on("loadedmetadata", this.boundRefresh);
    this.player.on("seeked", this.boundRefresh);
    this.player.on("hlsmanifestparsed", this.boundRefresh);
    this.player.on("dashmanifestloaded", this.boundRefresh);
    this.player.on("sourcechange", this.boundReset);
  }
  destroy() {
    this.player.off("timeupdate", this.boundRefresh);
    this.player.off("durationchange", this.boundRefresh);
    this.player.off("loadedmetadata", this.boundRefresh);
    this.player.off("seeked", this.boundRefresh);
    this.player.off("hlsmanifestparsed", this.boundRefresh);
    this.player.off("dashmanifestloaded", this.boundRefresh);
    this.player.off("sourcechange", this.boundReset);
  }
  /** Clear manifest live hints when the media source changes (before the new manifest loads). */
  resetForSourceChange() {
    this.boundReset();
  }
  /**
   * hls.js exposes `liveSyncPosition` for VOD too (edge minus target latency).
   * Only trust the playlist `live` flag once the level manifest is loaded.
   */
  hlsPlaylistIsLive(hls) {
    if (!hls) {
      return null;
    }
    const details = hls.latestLevelDetails;
    if (details && typeof details.live === "boolean") {
      return details.live;
    }
    return null;
  }
  /** Called by HLSRenderer when the manifest or buffer state indicates live. */
  evaluateHls(hls) {
    if (!hls) {
      return;
    }
    const playlistLive = this.hlsPlaylistIsLive(hls);
    if (playlistLive === null) {
      return;
    }
    this.applySourceLiveReport(playlistLive);
  }
  /** Called by DASHRenderer after the MPD is loaded (and again once playback starts). */
  evaluateDash(dash, manifestData) {
    const fromManifest = this.parseDashManifestLive(manifestData);
    if (fromManifest !== null) {
      this.applySourceLiveReport(fromManifest);
      return;
    }
    if (!dash || typeof dash.isDynamic !== "function") {
      return;
    }
    try {
      this.applySourceLiveReport(dash.isDynamic());
    } catch {
    }
  }
  /**
   * Infer live/VOD from a DASH MPD payload (MANIFEST_LOADED event data).
   * Returns null when the manifest type is not available.
   */
  parseDashManifestLive(manifestData) {
    if (!manifestData || typeof manifestData !== "object") {
      return null;
    }
    const data = manifestData;
    const type = data.type ?? data.manifestInfo?.type;
    if (type === "static") {
      return false;
    }
    if (type === "dynamic") {
      return true;
    }
    return null;
  }
  applySourceLiveReport(isLive) {
    if (this.sourceReportsLive === isLive) {
      this.refresh();
      this.player.controlBar?.updateLiveControls();
      return;
    }
    this.sourceReportsLive = isLive;
    this.refresh();
    this.player.controlBar?.updateLiveControls();
  }
  /** Current manifest/playlist live hint from the active renderer, if known. */
  getSourceReportsLive() {
    return this.sourceReportsLive;
  }
  /** Called when a renderer learns live/VOD from a fetched level/media playlist. */
  reportSourceLive(isLive) {
    this.applySourceLiveReport(isLive);
  }
  /**
   * Infer live/VOD from a fetched HLS media playlist before hls.js loads level details.
   * Returns null when the text is not a usable media playlist.
   */
  parseHlsMediaPlaylistLive(m3u8Text) {
    const text = m3u8Text.replace(/\r\n/g, "\n");
    if (!text.trimStart().startsWith("#EXTM3U")) {
      return null;
    }
    if (/#EXT-X-PLAYLIST-TYPE:VOD/i.test(text) || /#EXT-X-ENDLIST/i.test(text)) {
      return false;
    }
    if (/#EXT-X-PLAYLIST-TYPE:EVENT/i.test(text)) {
      return true;
    }
    if (/#EXTINF:/.test(text)) {
      return true;
    }
    return null;
  }
  /** True once the source is confidently VOD (not merely "not live yet"). */
  isConfirmedVod() {
    const option = this.player.options.liveStream;
    if (option === false) {
      return true;
    }
    if (option === true) {
      return false;
    }
    if (this.sourceReportsLive === false) {
      return true;
    }
    if (this.sourceReportsLive === true) {
      return false;
    }
    const initialDuration = Number(this.player.options.initialDuration);
    if (Number.isFinite(initialDuration) && initialDuration > 0) {
      return true;
    }
    if (this.isPlainHtml5Renderer() && this.hasFiniteMediaDuration() && !this.resolveIsLive()) {
      return true;
    }
    if (this.isDashRenderer() && this.sourceReportsLive !== true && this.hasFiniteMediaDuration() && !this.resolveIsLive()) {
      return true;
    }
    return false;
  }
  isDashRenderer() {
    return this.player.renderer?.rendererType === "dash";
  }
  isPlainHtml5Renderer() {
    const renderer = this.player.renderer;
    return !renderer || renderer.rendererType === "html5";
  }
  hasFiniteMediaDuration() {
    const media = this.player.element;
    return Boolean(media && Number.isFinite(media.duration) && media.duration > 0);
  }
  /** VOD skip-forward, or live catch-up when behind the edge. */
  shouldShowForwardSkip() {
    if (this.player.state.isLive) {
      return this.player.state.behindLive;
    }
    return this.isConfirmedVod();
  }
  /** Restart is a VOD-only affordance once the source is confirmed VOD. */
  shouldShowRestart() {
    return this.isConfirmedVod() && !this.player.state.isLive;
  }
  resolveIsLive() {
    const option = this.player.options.liveStream;
    if (option === true) {
      return true;
    }
    if (option === false) {
      return false;
    }
    if (this.sourceReportsLive === true) {
      return true;
    }
    if (this.sourceReportsLive === false) {
      return false;
    }
    return this.detectFromMedia();
  }
  detectFromMedia() {
    const media = this.player.element;
    if (!media) {
      return false;
    }
    const renderer = this.player.renderer;
    if (renderer?.rendererType === "hls") {
      const hls = renderer.hls ?? null;
      const playlistLive = this.hlsPlaylistIsLive(hls);
      if (playlistLive === true) {
        return true;
      }
      if (playlistLive === false) {
        return false;
      }
      return false;
    }
    if (renderer?.rendererType === "dash") {
      const dash = renderer.dash ?? null;
      if (dash && typeof dash.isDynamic === "function") {
        return dash.isDynamic();
      }
      return false;
    }
    if (media.duration === Infinity) {
      return true;
    }
    return false;
  }
  getLiveEdge() {
    const media = this.player.element;
    if (!media) {
      return null;
    }
    const renderer = this.player.renderer;
    if (renderer?.rendererType === "hls") {
      const hls = renderer.hls ?? null;
      if (this.hlsPlaylistIsLive(hls) === true) {
        const liveSync = hls?.liveSyncPosition;
        if (typeof liveSync === "number" && Number.isFinite(liveSync)) {
          return liveSync;
        }
      }
    }
    if (media.seekable && media.seekable.length > 0) {
      try {
        const end = media.seekable.end(media.seekable.length - 1);
        if (Number.isFinite(end) && end > 0) {
          return end;
        }
      } catch {
      }
    }
    if (Number.isFinite(media.duration) && media.duration > 0) {
      return media.duration;
    }
    return null;
  }
  getSeekableStart() {
    const media = this.player.element;
    if (!media?.seekable?.length) {
      return 0;
    }
    try {
      const start = media.seekable.start(0);
      return Number.isFinite(start) && start >= 0 ? start : 0;
    } catch {
      return 0;
    }
  }
  getSeekRange() {
    if (!this.resolveIsLive()) {
      return null;
    }
    const start = this.getSeekableStart();
    const end = this.getLiveEdge();
    if (end === null || end <= start) {
      return null;
    }
    return { start, end };
  }
  getBehindThreshold() {
    const threshold = this.player.options.liveBehindThreshold;
    return typeof threshold === "number" && Number.isFinite(threshold) && threshold >= 0 ? threshold : 5;
  }
  isBehindLive() {
    if (!this.resolveIsLive()) {
      return false;
    }
    return this.getSecondsBehindLive() > this.getBehindThreshold();
  }
  getSecondsBehindLive() {
    if (!this.resolveIsLive()) {
      return 0;
    }
    const edge = this.getLiveEdge();
    if (edge === null) {
      return 0;
    }
    return Math.max(0, edge - this.player.state.currentTime);
  }
  clampSeekTime(time) {
    if (!Number.isFinite(time)) {
      return 0;
    }
    let clamped = Math.max(0, time);
    if (!this.resolveIsLive()) {
      return clamped;
    }
    clamped = Math.max(clamped, this.getSeekableStart());
    const edge = this.getLiveEdge();
    if (edge !== null) {
      clamped = Math.min(clamped, edge);
    }
    return clamped;
  }
  seekToLive() {
    const edge = this.getLiveEdge();
    if (edge === null) {
      return;
    }
    this.player.seek(edge);
    if (!this.player.state.playing) {
      void this.player.play();
    }
  }
  refresh() {
    const wasLive = this.player.state.isLive;
    const wasBehind = this.player.state.behindLive;
    const isLive = this.resolveIsLive();
    const liveEdge = isLive ? this.getLiveEdge() : null;
    const behindLive = isLive && this.isBehindLive();
    this.player.state.isLive = isLive;
    this.player.state.liveEdge = liveEdge;
    this.player.state.behindLive = behindLive;
    const prefix = this.player.options.classPrefix;
    this.player.container?.classList.toggle(`${prefix}-is-live`, isLive);
    this.player.container?.classList.toggle(`${prefix}-behind-live`, behindLive);
    if (wasLive !== isLive) {
      this.player.emit("livechange", isLive);
    }
    if (wasBehind !== behindLive) {
      const detail = { behindLive, liveEdge };
      this.player.emit("liveedgechange", detail);
    }
  }
};

// src/core/MetadataAlertsManager.ts
var MetadataAlertsManager = class {
  player;
  cueChangeHandler = null;
  alertHandlers = /* @__PURE__ */ new Map();
  constructor(player) {
    this.player = player;
  }
  /** The `cuechange` handler this manager installed on the metadata
   *  track. Exposed so Player can mirror it onto itself for legacy
   *  access (some tests poke at `player.metadataCueChangeHandler`). */
  get cuechangeListener() {
    return this.cueChangeHandler;
  }
  setupHandling() {
    const player = this.player;
    const setupMetadata = () => {
      const textTracks = player.textTracks;
      const metadataTrack = textTracks.find((track) => track.kind === "metadata");
      if (!metadataTrack) {
        if (player.options.debug) player.log("[Metadata] No metadata track found");
        return;
      }
      if (metadataTrack.mode === "disabled") {
        metadataTrack.mode = "hidden";
      }
      if (this.cueChangeHandler) {
        metadataTrack.removeEventListener("cuechange", this.cueChangeHandler);
      }
      this.cueChangeHandler = () => {
        const activeCues = Array.from(metadataTrack.activeCues || []);
        if (activeCues.length > 0 && player.options.debug) {
          player.log("[Metadata] Active cues:", activeCues.map((c) => ({
            start: c.startTime,
            end: c.endTime,
            text: c.text
          })));
        }
        activeCues.forEach((cue) => this.handleCue(cue));
      };
      metadataTrack.addEventListener("cuechange", this.cueChangeHandler);
      player.metadataCueChangeHandler = this.cueChangeHandler;
      if (player.options.debug) {
        const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
        player.log("[Metadata] Track enabled,", cueCount, "cues available");
      }
    };
    setupMetadata();
    player.on("loadedmetadata", setupMetadata);
  }
  /**
   * Sanitise a user-supplied selector string. Returns `null` for
   * anything that isn't obviously safe: non-string input, empty
   * after trimming, or too long to bound selector-engine cost.
   */
  normalizeSelector(selector) {
    if (typeof selector !== "string") return null;
    const trimmed = selector.trim();
    if (!trimmed) return null;
    if (trimmed.length > 200) return null;
    if (trimmed.startsWith("#") || trimmed.startsWith(".") || trimmed.startsWith("[")) {
      return trimmed;
    }
    return `#${trimmed}`;
  }
  resolveConfig(map, key) {
    if (!map || !key) return null;
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    const withoutHash = key.replace(/^#/, "");
    if (Object.prototype.hasOwnProperty.call(map, withoutHash)) {
      return map[withoutHash];
    }
    return null;
  }
  /**
   * Remember the original title/message text before a hashtag cue
   * overwrites them, so `restoreContent` can roll back on the next
   * cue boundary. Idempotent — a second call for the same element
   * does not overwrite the already-cached value.
   */
  cacheContent(element, config = {}) {
    if (!element) return;
    const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
    const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
    const titleEl = element.querySelector(titleSelector);
    if (titleEl && !titleEl.dataset.vidplyAlertTitleOriginal) {
      titleEl.dataset.vidplyAlertTitleOriginal = titleEl.textContent?.trim() ?? "";
    }
    const messageEl = element.querySelector(messageSelector);
    if (messageEl && !messageEl.dataset.vidplyAlertMessageOriginal) {
      messageEl.dataset.vidplyAlertMessageOriginal = messageEl.textContent?.trim() ?? "";
    }
  }
  restoreContent(element, config = {}) {
    if (!element) return;
    const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
    const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
    const titleEl = element.querySelector(titleSelector);
    if (titleEl && titleEl.dataset.vidplyAlertTitleOriginal) {
      titleEl.textContent = titleEl.dataset.vidplyAlertTitleOriginal;
    }
    const messageEl = element.querySelector(messageSelector);
    if (messageEl && messageEl.dataset.vidplyAlertMessageOriginal) {
      messageEl.textContent = messageEl.dataset.vidplyAlertMessageOriginal;
    }
  }
  /**
   * Move focus to one of the well-known targets understood by the
   * alert system, or to a named selector. Never silently errors — an
   * unresolved target is simply a no-op.
   */
  focusTarget(target, fallbackElement = null) {
    if (!target || target === "none") return;
    if (target === "alert" && fallbackElement) {
      fallbackElement.focus({ preventScroll: true });
      return;
    }
    const player = this.player;
    if (target === "player") {
      player.container?.focus({ preventScroll: true });
      return;
    }
    if (target === "media") {
      player.element.focus({ preventScroll: true });
      return;
    }
    if (target === "playButton") {
      const playButton = player.controlBar?.controls?.playPause;
      playButton?.focus({ preventScroll: true });
      return;
    }
    if (typeof target === "string") {
      const targetElement = document.querySelector(target);
      if (targetElement) {
        if (targetElement.tabIndex === -1 && !targetElement.hasAttribute("tabindex")) {
          targetElement.setAttribute("tabindex", "-1");
        }
        targetElement.focus({ preventScroll: true });
      }
    }
  }
  /**
   * The public alert entry point. Pulls config out of
   * `options.metadataAlerts`, locates the DOM element, and applies
   * show/focus/continue logic per configuration.
   */
  handleAlert(selector, options = {}) {
    const player = this.player;
    if (!selector) return void 0;
    const config = this.resolveConfig(player.options.metadataAlerts, selector) || {};
    const element = options.element || this.resolveElement(selector);
    if (!element) {
      if (player.options.debug) player.log("[Metadata] Alert element not found:", selector);
      return void 0;
    }
    if (player.options.debug) {
      player.log("[Metadata] Handling alert", selector, { reason: options.reason, config });
    }
    this.cacheContent(element, config);
    if (!element.dataset.vidplyAlertOriginalDisplay) {
      element.dataset.vidplyAlertOriginalDisplay = element.style.display || "";
    }
    if (!element.dataset.vidplyAlertDisplay) {
      element.dataset.vidplyAlertDisplay = config.display || "block";
    }
    const shouldShow = options.show !== void 0 ? options.show : config.show !== false;
    if (shouldShow) {
      const displayValue = config.display || element.dataset.vidplyAlertDisplay || "block";
      element.style.display = displayValue;
      element.hidden = false;
      element.removeAttribute("hidden");
      element.setAttribute("aria-hidden", "false");
      element.setAttribute("data-vidply-alert-active", "true");
    }
    const shouldReset = config.resetContent !== false && options.reason === "focus";
    if (shouldReset) this.restoreContent(element, config);
    const shouldFocus = options.focus !== void 0 ? options.focus : config.focusOnShow ?? options.reason !== "focus";
    if (shouldShow && shouldFocus) {
      if (element.tabIndex === -1 && !element.hasAttribute("tabindex")) {
        element.setAttribute("tabindex", "-1");
      }
      element.focus({ preventScroll: true });
    }
    if (shouldShow && config.autoScroll !== false && options.autoScroll !== false) {
      element.scrollIntoView(reducedMotionScrollOptions("nearest"));
    }
    const continueSelector = config.continueButton;
    if (continueSelector) {
      let continueButton = null;
      if (continueSelector === "self") {
        continueButton = element;
      } else if (element.matches(continueSelector)) {
        continueButton = element;
      } else {
        continueButton = element.querySelector(continueSelector) || document.querySelector(continueSelector);
      }
      if (continueButton && !this.alertHandlers.has(selector)) {
        const handler = () => {
          const hideOnContinue = config.hideOnContinue !== false;
          if (hideOnContinue) {
            const originalDisplay = element.dataset.vidplyAlertOriginalDisplay || "";
            element.style.display = config.hideDisplay || originalDisplay || "none";
            element.setAttribute("aria-hidden", "true");
            element.removeAttribute("data-vidply-alert-active");
          }
          if (config.resume !== false && player.state.paused) {
            player.play();
          }
          const focusTarget = config.focusTarget || "playButton";
          player.setManagedTimeout(() => {
            this.focusTarget(focusTarget, element);
          }, config.focusDelay ?? 100);
        };
        continueButton.addEventListener("click", handler);
        this.alertHandlers.set(selector, { button: continueButton, handler });
      }
    }
    return element;
  }
  handleHashtags(hashtags) {
    if (!Array.isArray(hashtags) || hashtags.length === 0) return;
    const player = this.player;
    const configMap = player.options.metadataHashtags;
    if (!configMap) return;
    hashtags.forEach((tag) => {
      const config = this.resolveConfig(configMap, tag);
      if (!config) return;
      const selector = this.normalizeSelector(config.alert || config.selector || config.target);
      if (!selector) return;
      const element = this.resolveElement(selector);
      if (!element) {
        if (player.options.debug) player.log("[Metadata] Hashtag target not found:", selector);
        return;
      }
      if (player.options.debug) {
        player.log("[Metadata] Handling hashtag", tag, { selector, config });
      }
      this.cacheContent(element, config);
      if (config.title) {
        const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
        const titleEl = element.querySelector(titleSelector);
        if (titleEl) titleEl.textContent = config.title;
      }
      if (config.message) {
        const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
        const messageEl = element.querySelector(messageSelector);
        if (messageEl) messageEl.textContent = config.message;
      }
      const show = config.show !== false;
      const focus = config.focus !== void 0 ? config.focus : false;
      this.handleAlert(selector, {
        element,
        show,
        focus,
        autoScroll: config.autoScroll,
        reason: "hashtag"
      });
    });
  }
  /**
   * Parse a single metadata cue for directives (`PAUSE`, `FOCUS:x`,
   * `#hashtag`), emit the corresponding public events, and execute
   * DOM side-effects only when `options.metadataDirectives` is set.
   */
  handleCue(cue) {
    const player = this.player;
    const text = cue.text.trim();
    if (player.options.debug) {
      player.log("[Metadata] Processing cue:", { time: cue.startTime, text });
    }
    player.emit("metadata", {
      time: cue.startTime,
      endTime: cue.endTime,
      text,
      cue
    });
    if (text.includes("PAUSE")) {
      if (!player.state.paused) {
        if (player.options.debug) player.log("[Metadata] Pausing video at", cue.startTime);
        player.pause();
      }
      player.emit("metadata:pause", { time: cue.startTime, text });
    }
    const focusMatch = text.match(/FOCUS:([\w#-]{1,128})/);
    if (focusMatch) {
      const targetSelector = focusMatch[1];
      const normalizedSelector = this.normalizeSelector(targetSelector);
      const targetElement = this.resolveElement(normalizedSelector);
      if (targetElement) {
        if (player.options.debug) player.log("[Metadata] Focusing element:", normalizedSelector);
        if (targetElement.tabIndex === -1 && !targetElement.hasAttribute("tabindex")) {
          targetElement.setAttribute("tabindex", "-1");
        }
        player.setManagedTimeout(() => {
          targetElement.focus({ preventScroll: true });
        }, 10);
      } else if (player.options.debug && player.options.metadataDirectives) {
        player.log("[Metadata] Element not found:", normalizedSelector || targetSelector);
      }
      player.emit("metadata:focus", {
        time: cue.startTime,
        target: targetSelector,
        selector: normalizedSelector,
        element: targetElement,
        text
      });
      if (player.options.metadataDirectives && normalizedSelector) {
        this.handleAlert(normalizedSelector, {
          element: targetElement,
          reason: "focus"
        });
      }
    }
    const hashtags = text.match(/#[\w-]{1,64}/g);
    if (hashtags && hashtags.length > 0) {
      const safeTags = hashtags.slice(0, 32);
      if (player.options.debug) player.log("[Metadata] Hashtags found:", safeTags);
      player.emit("metadata:hashtags", {
        time: cue.startTime,
        hashtags: safeTags,
        text
      });
      if (player.options.metadataDirectives) this.handleHashtags(safeTags);
    }
  }
  /**
   * Resolve a metadata-cue selector inside the configured directive
   * scope. Returns `null` when directives are disabled or the
   * selector doesn't resolve. Container-scoped resolution is the
   * default so a malicious caption cannot focus a login-form input
   * or trigger a dialog elsewhere on the page.
   */
  resolveElement(selector) {
    const player = this.player;
    const mode = player.options.metadataDirectives;
    if (!mode) return null;
    if (!selector) return null;
    try {
      if (mode === true || mode === "global") {
        return document.querySelector(selector);
      }
      const root = player.container || player.element.parentElement || document;
      return root.querySelector(selector);
    } catch {
      return null;
    }
  }
  /** Tear down the per-alert click handlers and the cuechange
   *  listener. Called from Player.destroy(). */
  cleanup() {
    if (this.alertHandlers.size > 0) {
      this.alertHandlers.forEach(({ button, handler }) => {
        if (button && handler) button.removeEventListener("click", handler);
      });
      this.alertHandlers.clear();
    }
    this.cueChangeHandler = null;
  }
};

// src/utils/RichText.ts
var ALLOWED_TAGS = /* @__PURE__ */ new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "span",
  "div"
]);
var ALLOWED_ATTRS = {
  a: /* @__PURE__ */ new Set(["href", "title", "target", "rel"])
};
var FORBIDDEN_URI_PATTERN = /^\s*(javascript|data|vbscript):/i;
function sanitizeNode(root) {
  const elements = root instanceof Element ? Array.from(root.children) : Array.from(root.childNodes).filter((node) => node instanceof Element);
  for (const child of elements) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      while (child.firstChild) {
        child.parentNode?.insertBefore(child.firstChild, child);
      }
      child.remove();
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        child.removeAttribute(attr.name);
        continue;
      }
      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed?.has(name)) {
        child.removeAttribute(attr.name);
      }
    }
    if (tag === "a") {
      const href = child.getAttribute("href") ?? "";
      if (href === "" || FORBIDDEN_URI_PATTERN.test(href)) {
        child.removeAttribute("href");
      } else if (child.getAttribute("target") === "_blank") {
        const rel = (child.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean);
        if (!rel.includes("noopener")) rel.push("noopener");
        if (!rel.includes("noreferrer")) rel.push("noreferrer");
        child.setAttribute("rel", rel.join(" "));
      }
    }
    sanitizeNode(child);
  }
}
function createSanitizedRichTextFragment(html) {
  const fragment = document.createDocumentFragment();
  const trimmed = html.trim();
  if (trimmed === "") {
    return fragment;
  }
  const template = document.createElement("template");
  template.innerHTML = trimmed;
  sanitizeNode(template.content);
  fragment.append(...Array.from(template.content.childNodes));
  return fragment;
}
function setSanitizedRichText(container, html) {
  container.replaceChildren(...Array.from(createSanitizedRichTextFragment(html).childNodes));
}

// src/core/TrackInfoView.ts
var TrackInfoView = class _TrackInfoView {
  element;
  classPrefix;
  titleElementId;
  longDescPanelId;
  handleClick;
  static instanceCounter = 0;
  constructor(classPrefix = "vidply") {
    _TrackInfoView.instanceCounter += 1;
    this.classPrefix = classPrefix;
    this.titleElementId = `${classPrefix}-track-info-title-${_TrackInfoView.instanceCounter}`;
    this.longDescPanelId = `${classPrefix}-track-longdesc-panel-${_TrackInfoView.instanceCounter}`;
    this.element = DOMUtils.createElement("div", {
      className: `${classPrefix}-track-info`,
      attributes: {
        role: "region",
        "aria-labelledby": this.titleElementId
      }
    });
    this.element.style.display = "none";
    this.handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const toggle = target.closest(`.${this.classPrefix}-track-longdesc-toggle`);
      if (!(toggle instanceof HTMLButtonElement) || !this.element.contains(toggle)) {
        return;
      }
      this.toggleLongDescription(toggle);
    };
    this.element.addEventListener("click", this.handleClick);
  }
  mount(container, before) {
    if (before) {
      container.insertBefore(this.element, before);
    } else {
      container.appendChild(this.element);
    }
  }
  render(data) {
    const hasContent = this.hasVisibleContent(data);
    if (!hasContent) {
      this.hide();
      return;
    }
    const prefix = this.classPrefix;
    const trackTitle = (data.title ?? "").trim() || i18n.t("playlist.untitled");
    const trackArtist = (data.artist ?? "").trim();
    const trackDescription = (data.description ?? "").trim();
    const trackDate = (data.date ?? "").trim();
    const longDescription = (data.longDescription ?? "").trim();
    const trackNumber = data.trackNumber ?? 0;
    const totalTracks = data.totalTracks ?? 0;
    const showTrackHeader = totalTracks > 1 && trackNumber > 0;
    const isPlaylistContext = totalTracks > 1;
    const effectiveDuration = isPlaylistContext && typeof data.duration === "number" && data.duration > 0 ? data.duration : 0;
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : "";
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : "";
    const artistPart = trackArtist ? i18n.t("playlist.by") + trackArtist : "";
    const datePart = trackDate ? `. ${trackDate}` : "";
    const durationPart = trackDurationReadable ? `. ${trackDurationReadable}` : "";
    let playlistAnnouncement = trackTitle + artistPart + datePart + durationPart;
    if (showTrackHeader) {
      playlistAnnouncement = i18n.t("playlist.nowPlaying", {
        current: trackNumber,
        total: totalTracks,
        title: trackTitle,
        artist: artistPart
      }) + datePart + durationPart;
    }
    this.element.replaceChildren();
    if (isPlaylistContext) {
      this.element.appendChild(DOMUtils.createElement("span", {
        className: `${prefix}-sr-only`,
        attributes: { "aria-live": "polite" },
        textContent: playlistAnnouncement
      }));
    }
    if (showTrackHeader) {
      const header = DOMUtils.createElement("div", {
        className: `${prefix}-track-header`
      });
      header.appendChild(DOMUtils.createElement("span", {
        className: `${prefix}-track-number`,
        textContent: i18n.t("playlist.trackOf", { current: trackNumber, total: totalTracks })
      }));
      if (trackDuration) {
        header.appendChild(DOMUtils.createElement("span", {
          className: `${prefix}-track-duration`,
          textContent: trackDuration
        }));
      }
      this.element.appendChild(header);
    }
    this.element.appendChild(DOMUtils.createElement("p", {
      className: `${prefix}-track-title`,
      attributes: { id: this.titleElementId },
      textContent: trackTitle
    }));
    if (trackArtist) {
      this.element.appendChild(DOMUtils.createElement("p", {
        className: `${prefix}-track-artist`,
        textContent: trackArtist
      }));
    }
    if (trackDate) {
      this.element.appendChild(DOMUtils.createElement("p", {
        className: `${prefix}-track-date`,
        textContent: trackDate
      }));
    }
    if (trackDescription) {
      this.element.appendChild(DOMUtils.createElement("p", {
        className: `${prefix}-track-description`,
        textContent: trackDescription
      }));
    }
    if (longDescription) {
      const showLabel = i18n.t("trackInfo.descriptionShow");
      const toggle = DOMUtils.createElement("button", {
        className: `${prefix}-track-longdesc-toggle`,
        attributes: {
          type: "button",
          "aria-expanded": "false",
          "aria-controls": this.longDescPanelId,
          "aria-label": trackTitle ? `${showLabel}: ${trackTitle}` : showLabel
        },
        children: [
          createIconElement("chevronDown", `${prefix}-track-longdesc-toggle-icon`),
          DOMUtils.createElement("span", {
            className: `${prefix}-track-longdesc-toggle-text`,
            textContent: showLabel
          })
        ]
      });
      toggle.dataset.labelShow = showLabel;
      toggle.dataset.labelHide = i18n.t("trackInfo.descriptionHide");
      toggle.dataset.trackTitle = trackTitle;
      const actions = DOMUtils.createElement("div", {
        className: `${prefix}-track-actions`
      });
      actions.appendChild(toggle);
      this.element.appendChild(actions);
      const panel = DOMUtils.createElement("div", {
        className: `${prefix}-track-longdesc`,
        attributes: {
          id: this.longDescPanelId,
          hidden: ""
        }
      });
      setSanitizedRichText(panel, longDescription);
      this.element.appendChild(panel);
    }
    this.element.style.display = "block";
  }
  hide() {
    this.element.replaceChildren();
    this.element.style.display = "none";
  }
  destroy() {
    this.element.removeEventListener("click", this.handleClick);
    this.element.remove();
  }
  hasVisibleContent(data) {
    const isPlaylistContext = (data.totalTracks ?? 0) > 1;
    return Boolean(
      (data.title ?? "").trim() || (data.artist ?? "").trim() || (data.description ?? "").trim() || (data.longDescription ?? "").trim() || (data.date ?? "").trim() || isPlaylistContext && typeof data.duration === "number" && data.duration > 0 || isPlaylistContext && (data.trackNumber ?? 0) > 0
    );
  }
  toggleLongDescription(button) {
    const panel = button.closest(`.${this.classPrefix}-track-info`)?.querySelector(`#${CSS.escape(this.longDescPanelId)}`);
    if (!(panel instanceof HTMLElement)) return;
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    panel.toggleAttribute("hidden", !expanded);
    const label = expanded ? button.dataset.labelHide ?? i18n.t("trackInfo.descriptionHide") : button.dataset.labelShow ?? i18n.t("trackInfo.descriptionShow");
    const text = button.querySelector(`.${this.classPrefix}-track-longdesc-toggle-text`);
    if (text instanceof HTMLElement) {
      text.textContent = label;
    }
    const title = button.dataset.trackTitle ?? "";
    button.setAttribute("aria-label", title ? `${label}: ${title}` : label);
    const icon = button.querySelector(`.${this.classPrefix}-track-longdesc-toggle-icon`);
    const newIcon = createIconElement(
      expanded ? "chevronUp" : "chevronDown",
      `${this.classPrefix}-track-longdesc-toggle-icon`
    );
    if (icon instanceof HTMLElement) {
      icon.replaceWith(newIcon);
    } else {
      button.insertBefore(newIcon, button.firstChild);
    }
  }
};

// src/controls/KeyboardHelp.ts
var ACTION_ORDER = [
  "play-pause",
  "seek-backward",
  "seek-forward",
  "volume-up",
  "volume-down",
  "mute",
  "captions",
  "caption-style-menu",
  "speed-down",
  "speed-up",
  "speed-menu",
  "quality-menu",
  "chapters-menu",
  "transcript-toggle",
  "fullscreen",
  "help"
];
var ACTION_REQUIRES_CONTROL = {
  captions: "captions",
  "caption-style-menu": "captionStyle",
  "speed-down": "speed",
  "speed-up": "speed",
  "speed-menu": "speed",
  "quality-menu": "quality",
  "chapters-menu": "chapters",
  "transcript-toggle": "transcript",
  fullscreen: "fullscreen"
};
var KeyboardHelp = class {
  player;
  isOpen = false;
  overlay = null;
  _triggerElement = null;
  _keydownHandler = null;
  _content = null;
  _inertedElements = [];
  constructor(player) {
    this.player = player;
  }
  get prefix() {
    return this.player.options.classPrefix;
  }
  /**
   * Turn a raw KeyboardEvent.key value into a human-readable label. Arrow
   * keys become universally understood glyphs; the space bar and single
   * letters are normalised for legibility.
   */
  formatKey(key) {
    switch (key) {
      case " ":
        return i18n.t("help.keys.space");
      case "ArrowUp":
        return "↑";
      case "ArrowDown":
        return "↓";
      case "ArrowLeft":
        return "←";
      case "ArrowRight":
        return "→";
      case "Escape":
        return "Esc";
      default:
        return key.length === 1 ? key.toUpperCase() : key;
    }
  }
  createElement() {
    const titleId = `${this.prefix}-help-title-${this.player.instanceId}`;
    const overlay = DOMUtils.createElement("div", {
      className: `${this.prefix}-settings-overlay ${this.prefix}-help-overlay`,
      attributes: {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId
      }
    });
    overlay.style.display = "none";
    const dialog = DOMUtils.createElement("div", {
      className: `${this.prefix}-settings-dialog ${this.prefix}-help-dialog`
    });
    const header = DOMUtils.createElement("div", {
      className: `${this.prefix}-settings-header`
    });
    const title = DOMUtils.createElement("h2", {
      textContent: i18n.t("help.title"),
      attributes: { id: titleId }
    });
    const closeButton = DOMUtils.createElement("button", {
      className: `${this.prefix}-button ${this.prefix}-settings-close`,
      attributes: {
        type: "button",
        "aria-label": i18n.t("help.close")
      }
    });
    closeButton.appendChild(createIconElement("close"));
    closeButton.addEventListener("click", () => this.hide());
    header.appendChild(title);
    header.appendChild(closeButton);
    const content = DOMUtils.createElement("div", {
      className: `${this.prefix}-settings-content`
    });
    this._content = content;
    content.appendChild(this.buildContent());
    dialog.appendChild(header);
    dialog.appendChild(content);
    overlay.appendChild(dialog);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });
    this._keydownHandler = (e) => {
      if (!this.isOpen || !this.overlay) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
        return;
      }
      if (e.key === "Tab") {
        trapFocusInContainer(e, this.overlay);
      }
    };
    const lifecycleSignal = this.player.lifecycleSignal;
    document.addEventListener(
      "keydown",
      this._keydownHandler,
      lifecycleSignal ? { signal: lifecycleSignal } : void 0
    );
    return overlay;
  }
  /**
   * Whether a shortcut row is worth showing for *this* player. Feature actions
   * are hidden when their control isn't present (e.g. no captions track, an
   * audio-only player with no fullscreen). Core actions are always relevant.
   *
   * When the player has no control bar we can't infer availability, so nothing
   * is hidden — the shortcuts still work and we'd rather over-show than mislead.
   */
  isActionRelevant(action) {
    if (this.player.state?.isLive) {
      if (action === "speed-down" || action === "speed-up" || action === "speed-menu") {
        return false;
      }
    }
    const requiredControl = ACTION_REQUIRES_CONTROL[action];
    if (!requiredControl) return true;
    const controlBar = this.player.controlBar;
    if (!controlBar || !controlBar.controls) return true;
    return Boolean(controlBar.controls[requiredControl]);
  }
  getActionLabel(action) {
    if (this.player.state?.isLive && action === "seek-forward") {
      return i18n.t("help.actions.seek-forward-live");
    }
    return i18n.t(`help.actions.${action}`);
  }
  buildLiveControlsSection() {
    if (!this.player.state?.isLive) {
      return null;
    }
    const seekSeconds = Number(this.player.options.seekInterval) > 0 ? Number(this.player.options.seekInterval) : 10;
    const section = DOMUtils.createElement("div", {
      className: `${this.prefix}-help-live-section`
    });
    section.appendChild(DOMUtils.createElement("h3", {
      className: `${this.prefix}-help-live-title`,
      textContent: i18n.t("help.liveSectionTitle")
    }));
    const list = DOMUtils.createElement("dl", {
      className: `${this.prefix}-help-list ${this.prefix}-help-live-list`
    });
    const rows = [
      {
        term: i18n.t("help.live.skipBack"),
        desc: i18n.t("help.live.skipBackDesc", { seconds: seekSeconds })
      },
      {
        term: i18n.t("help.live.skipForward"),
        desc: i18n.t("help.live.skipForwardDesc", { seconds: seekSeconds })
      }
    ];
    if (this.player.options.goLiveButton) {
      rows.push({
        term: i18n.t("help.live.goLive"),
        desc: i18n.t("help.live.goLiveDesc")
      });
    }
    rows.push(
      {
        term: i18n.t("help.live.progress"),
        desc: i18n.t("help.live.progressDesc")
      },
      {
        term: i18n.t("help.live.liveBadge"),
        desc: i18n.t("help.live.liveBadgeDesc")
      }
    );
    for (const row of rows) {
      list.appendChild(DOMUtils.createElement("dt", {
        className: `${this.prefix}-help-action`,
        textContent: row.term
      }));
      list.appendChild(DOMUtils.createElement("dd", {
        className: `${this.prefix}-help-desc`,
        textContent: row.desc
      }));
    }
    section.appendChild(list);
    return section;
  }
  buildContent() {
    const content = document.createDocumentFragment();
    content.appendChild(this.buildShortcutList());
    const liveSection = this.buildLiveControlsSection();
    if (liveSection) {
      content.appendChild(liveSection);
    }
    return content;
  }
  buildShortcutList() {
    const list = DOMUtils.createElement("dl", {
      className: `${this.prefix}-help-list`
    });
    const shortcuts = this.player.options.keyboardShortcuts;
    for (const action of ACTION_ORDER) {
      const keys = shortcuts[action];
      if (!Array.isArray(keys) || keys.length === 0) continue;
      if (!this.isActionRelevant(action)) continue;
      const term = DOMUtils.createElement("dt", {
        className: `${this.prefix}-help-action`,
        textContent: this.getActionLabel(action)
      });
      const desc = DOMUtils.createElement("dd", {
        className: `${this.prefix}-help-keys`
      });
      keys.forEach((key, index) => {
        if (index > 0) {
          desc.appendChild(
            DOMUtils.createElement("span", {
              className: `${this.prefix}-help-key-sep`,
              textContent: i18n.t("help.or")
            })
          );
        }
        desc.appendChild(
          DOMUtils.createElement("kbd", {
            className: `${this.prefix}-help-key`,
            textContent: this.formatKey(key)
          })
        );
      });
      list.appendChild(term);
      list.appendChild(desc);
    }
    return list;
  }
  show() {
    if (this.isOpen) return;
    if (!this.overlay) {
      this.overlay = this.createElement();
      this.player.container.appendChild(this.overlay);
    } else if (this._content) {
      this._content.replaceChildren(this.buildContent());
    }
    const active = typeof document !== "undefined" ? document.activeElement : null;
    this._triggerElement = active && typeof active.focus === "function" ? active : null;
    this.overlay.style.display = "flex";
    this.player.container?.classList.add(`${this.prefix}-modal-open`);
    if (this.player.container && this.overlay) {
      this._inertedElements = setContainerChildrenInert(
        this.player.container,
        this.overlay,
        true,
        this._inertedElements
      );
    }
    this.isOpen = true;
    const closeButton = this.overlay.querySelector(`.${this.prefix}-settings-close`);
    closeButton?.focus({ preventScroll: true });
    this.player.emit("keyboardhelpopen");
  }
  hide() {
    if (!this.overlay) return;
    this.overlay.style.display = "none";
    this.player.container?.classList.remove(`${this.prefix}-modal-open`);
    if (this.player.container) {
      this._inertedElements = setContainerChildrenInert(
        this.player.container,
        null,
        false,
        this._inertedElements
      );
    }
    this.isOpen = false;
    const trigger = this._triggerElement;
    this._triggerElement = null;
    if (trigger && document.contains(trigger)) {
      try {
        trigger.focus({ preventScroll: true });
      } catch {
        this.player.container?.focus();
      }
    } else {
      this.player.container?.focus();
    }
    this.player.emit("keyboardhelpclose");
  }
  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }
  destroy() {
    if (this._keydownHandler) {
      document.removeEventListener("keydown", this._keydownHandler);
      this._keydownHandler = null;
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.player.container) {
      this._inertedElements = setContainerChildrenInert(
        this.player.container,
        null,
        false,
        this._inertedElements
      );
    }
    this.player.container?.classList.remove(`${this.prefix}-modal-open`);
    this.overlay = null;
    this._content = null;
    this._triggerElement = null;
    this.isOpen = false;
  }
};

// src/core/Player.ts
var AudioDescriptionManagerModule = null;
var SignLanguageManagerModule = null;
var FloatingPlayerManagerModule = null;
async function loadAudioDescriptionManager() {
  if (!AudioDescriptionManagerModule) {
    const module = await import("./vidply.AudioDescriptionManager-7I2NEQYD.js");
    AudioDescriptionManagerModule = module.AudioDescriptionManager;
  }
  return AudioDescriptionManagerModule;
}
async function loadSignLanguageManager() {
  if (!SignLanguageManagerModule) {
    const module = await import("./vidply.SignLanguageManager-W537ZKL7.js");
    SignLanguageManagerModule = module.SignLanguageManager;
  }
  return SignLanguageManagerModule;
}
async function loadFloatingPlayerManager() {
  if (!FloatingPlayerManagerModule) {
    const module = await import("./vidply.FloatingPlayerManager-BX3UUAHE.js");
    FloatingPlayerManagerModule = module.FloatingPlayerManager;
  }
  return FloatingPlayerManagerModule;
}
var ALLOWED_MEDIA_TYPES = ["video", "audio"];
var playerInstanceCounter = 0;
var Player = class _Player extends EventEmitter {
  static instances = [];
  /**
   * Available theme names. Kept as a static field for backward
   * compatibility with external callers that used
   * `Player.THEMES.includes(x)`; the canonical source is
   * `PLAYER_THEMES` in `./ThemeManager.ts`.
   */
  static THEMES = PLAYER_THEMES;
  /**
   * Manually schedule a lazy-initialised player for `selector` /
   * `element`. The player is constructed the first time the element
   * scrolls within `margin` of the viewport; if `IntersectionObserver`
   * is unavailable the player is constructed immediately.
   *
   * Returns a handle whose `cancel()` method removes the pending
   * observation, or `null` if no observation was scheduled (element
   * missing or eager fallback took effect).
   *
   * Implemented as a real static method (rather than a post-construction
   * assignment from `index.ts`) so the API belongs to the `Player`
   * symbol itself — which makes it easier to tree-shake and reason about.
   */
  static observeLazy(selector, options = {}, margin = "200px") {
    const element = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!element) {
      console.warn("VidPly: Element not found for lazy observation");
      return null;
    }
    if ("IntersectionObserver" in window) {
      observeForLazyInit(
        element,
        options,
        margin,
        (target, opts) => {
          new _Player(target, opts);
        }
      );
      return { cancel: () => cancelLazyInit(element) };
    }
    new _Player(element, options);
    return null;
  }
  element;
  container;
  /**
   * Runtime options. Includes a `[key: string]: unknown` index for
   * internal-only dynamic keys that have not yet been promoted into
   * the public {@link PlayerOptions} interface.
   */
  options;
  state;
  renderer = null;
  controlBar = null;
  captionManager = null;
  keyboardManager = null;
  mediaSessionManager = null;
  transcriptManager = null;
  playlistManager = null;
  keyboardHelp = null;
  audioDescriptionManager = null;
  signLanguageManager = null;
  floatingPlayerManager = null;
  liveStreamManager = null;
  storage;
  instanceId;
  _audioDescriptionDesiredState;
  _fallbackSources = null;
  _isAudioContent;
  _isFallingBack;
  _managersLoading = null;
  _originalElement;
  /** Lazily-created on first pseudo-fullscreen entry. Owns the scroll /
   *  inert / viewport bookkeeping that used to live as `_original*`
   *  fields directly on the player. */
  pseudoFullscreen = null;
  /** Owns `applyTheme`/`setTheme`/`setThemeVariable`/`resetTheme`. Player
   *  keeps delegating public methods so the existing API is unchanged. */
  themeManager;
  /** Owns poster resolution, canvas-capture, and overlay show/hide. */
  posterManager;
  /** Owns resume-playback prompt + progress persistence. Lazily
   *  created the first time `initResumePlayback` is called so sites
   *  that don't enable the feature don't pay the DOM / listener cost. */
  resumeManager = null;
  /** Standalone track metadata header (single-item players without a playlist). */
  trackInfoView = null;
  /** Owns resize-observer, orientation matchMedia, and the
   *  cross-vendor fullscreenchange listeners. */
  responsiveManager;
  /** Baseline `muted|volume` from page options; invalidates stale localStorage. */
  _preferencesConfigKey = "";
  /** While true, HTML5 renderers ignore media `volumechange` sync. */
  _isApplyingVolumeSettings = false;
  /** Owns `kind=metadata` text-track directives (PAUSE, FOCUS,
   *  #hashtag) + the per-selector alert UI. Lazily created on first
   *  `setupMetadataHandling()` call. */
  metadataAlertsManager = null;
  _pendingSource = null;
  _sourceElementsCache = null;
  _sourceElementsDirty = true;
  _switchingRenderer;
  _trackElementsCache = null;
  _trackElementsDirty = true;
  _textTracksCache = null;
  _textTracksDirty;
  audioDescriptionCaptionTracks = [];
  audioDescriptionSourceElement = null;
  audioDescriptionSrc = null;
  currentSignLanguage = null;
  currentSource = null;
  debouncedPositionPlayOverlay = null;
  fullscreenChangeHandler = null;
  /** Mirrored from `MetadataAlertsManager` so the TextTrack cleanup
   *  path in `destroy()` can still find it by a fixed field name. */
  metadataCueChangeHandler = null;
  noticeElement = null;
  noticeTimeout = null;
  orientationHandler = null;
  orientationQuery = null;
  originalAudioDescriptionSource = null;
  originalSrc = null;
  playButtonOverlay = null;
  /** Wrapper button for the audio play overlay. Video keeps the bare,
   *  presentational SVG because the video surface is itself clickable. */
  playButtonOverlayButton = null;
  resizeHandler = null;
  resizeObserver = null;
  resumePromptElement = null;
  signLanguageDraggable = null;
  signLanguageHeader = null;
  signLanguageSettingsButton = null;
  signLanguageSettingsMenu = null;
  signLanguageSettingsMenuVisible = false;
  signLanguageSources = {};
  signLanguageSrc = null;
  signLanguageVideo = null;
  signLanguageWrapper = null;
  timeouts = /* @__PURE__ */ new Set();
  trackArtworkElement = null;
  videoWrapper = null;
  /** Centered buffering spinner (see `.vidply-loading` / `.vidply-buffering` in CSS) */
  loadingOverlayElement = null;
  /** Native `playing` listener — must be removed in destroy() */
  _bufferingHideOnMediaPlaying = null;
  /** AbortController, whose signal feeds every window/document listener and
   *  every user-influenced fetch the Player creates. `destroy()` calls
   *  `abort()` so a torn-down player can never leak listeners or pending
   *  network calls. */
  _lifecycleController = new AbortController();
  constructor(element, options = {}) {
    super();
    this.element = typeof element === "string" ? document.querySelector(element) : element;
    if (!this.element) {
      throw new Error("VidPly: Element not found");
    }
    playerInstanceCounter++;
    this.instanceId = playerInstanceCounter;
    if (this.element.tagName !== "VIDEO" && this.element.tagName !== "AUDIO") {
      const requested = typeof options.mediaType === "string" ? options.mediaType.toLowerCase() : "video";
      const mediaType = ALLOWED_MEDIA_TYPES.includes(requested) ? requested : "video";
      if (mediaType !== requested) {
        console.warn(`[VidPly] Ignoring unsafe mediaType "${requested}", falling back to "video"`);
      }
      const mediaElement = document.createElement(mediaType);
      Array.from(this.element.attributes).forEach((attr) => {
        if (attr.name !== "id" && attr.name !== "class" && !attr.name.startsWith("data-")) {
          mediaElement.setAttribute(attr.name, attr.value);
        }
      });
      const tracks = this.element.querySelectorAll("track");
      tracks.forEach((track) => {
        mediaElement.appendChild(track.cloneNode(true));
      });
      this.element.replaceChildren(mediaElement);
      this.element = mediaElement;
    }
    this._originalElement = this.element;
    this.options = {
      // Display
      width: null,
      height: null,
      poster: null,
      responsive: true,
      fillContainer: false,
      showTrackInfo: true,
      // Media metadata + OS media controls (Media Session API)
      title: null,
      artist: null,
      album: null,
      mediaSession: true,
      // Playback
      autoplay: false,
      loop: false,
      muted: false,
      volume: 0.8,
      playbackSpeed: 1,
      preload: "metadata",
      // Optional initial duration (seconds) so UI can show duration
      // before media metadata is loaded (useful with deferLoad/preload=none).
      initialDuration: 0,
      // When enabled, VidPly will not start network loading during init().
      // - HTML5: does not call element.load() until the first user-initiated play()
      // - HLS (hls.js): does not load manifest/segments until the first play()
      // - DASH (dash.js): does not attach a source until the first play()
      // This is useful for pages with many players to avoid high initial bandwidth.
      deferLoad: false,
      // When enabled, clicking Audio Description / Sign Language before playback will show
      // a notice instead of implicitly starting playback/loading.
      requirePlaybackForAccessibilityToggles: false,
      startTime: 0,
      playsInline: true,
      // Enable inline playback on iOS (prevents native fullscreen)
      // Controls
      controls: true,
      hideControlsDelay: 3e3,
      playPauseButton: true,
      // 'auto' = video only. Set to true to also show the centered play
      // button on audio players (rendered on top of the track artwork).
      playButtonOverlay: "auto",
      progressBar: true,
      currentTime: true,
      duration: true,
      volumeControl: true,
      muteButton: true,
      chaptersButton: true,
      qualityButton: true,
      captionStyleButton: true,
      speedButton: true,
      // When enabled, the playback speed UI is suppressed for ALL HLS streams (audio + video).
      hideSpeedForHls: false,
      // When enabled, the playback speed UI is suppressed for HLS *video* streams only.
      // This is useful for live streams where speed controls don't make sense.
      hideSpeedForHlsVideo: false,
      // When enabled, the playback speed UI is suppressed for ALL DASH streams (audio + video).
      hideSpeedForDash: false,
      // When enabled, the playback speed UI is suppressed for DASH *video* streams only.
      hideSpeedForDashVideo: false,
      captionsButton: true,
      transcriptButton: true,
      fullscreenButton: true,
      helpButton: true,
      pipButton: false,
      floating: false,
      floatingPosition: "bottom-right",
      floatingMinViewportWidth: 768,
      downloadButton: false,
      downloadUrl: null,
      downloadFormat: null,
      downloadFileSize: null,
      downloadFetchSize: true,
      // Seeking
      seekInterval: 10,
      seekIntervalLarge: 30,
      liveStream: "auto",
      liveBehindThreshold: 5,
      goLiveButton: true,
      // Captions
      captions: true,
      captionsDefault: false,
      captionsFontSize: "100%",
      captionsFontFamily: "sans-serif",
      captionsColor: "#FFFFFF",
      captionsBackgroundColor: "#000000",
      captionsOpacity: 0.8,
      // Audio Description
      audioDescription: true,
      audioDescriptionSrc: null,
      // URL to audio-described version
      audioDescriptionButton: true,
      audioDescriptionMode: "auto",
      audioDescriptionSpeech: true,
      audioDescriptionExtended: true,
      // Sign Language
      signLanguage: true,
      signLanguageSrc: null,
      // URL to sign language video
      signLanguageButton: true,
      signLanguagePosition: "bottom-right",
      // Position: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
      signLanguageDisplayMode: "both",
      // Display mode: 'pip' (overlay), 'main' (source swap), 'both'
      // Transcripts
      transcript: false,
      transcriptPosition: "external",
      transcriptContainer: null,
      // Keyboard
      keyboard: true,
      keyboardShortcuts: {
        "play-pause": [" ", "p", "k"],
        "volume-up": ["ArrowUp"],
        "volume-down": ["ArrowDown"],
        "seek-forward": ["ArrowRight"],
        "seek-backward": ["ArrowLeft"],
        "mute": ["m"],
        "fullscreen": ["f"],
        "captions": ["c"],
        "caption-style-menu": ["a"],
        "speed-up": [">"],
        "speed-down": ["<"],
        "speed-menu": ["s"],
        "quality-menu": ["q"],
        "chapters-menu": ["j"],
        "transcript-toggle": ["t"],
        "help": ["?"]
      },
      // Accessibility
      ariaLabels: {},
      screenReaderAnnouncements: true,
      highContrast: false,
      focusHighlight: true,
      metadataAlerts: {},
      metadataHashtags: {},
      // Languages
      language: "en",
      languages: ["en"],
      // Resume Playback
      resumePlayback: false,
      // Enable saving and resuming playback position
      resumeThreshold: 10,
      // Don't resume if < threshold seconds watched
      resumePrompt: true,
      // Show prompt to resume (false = auto-resume silently)
      // Thumbnail Preview
      thumbnailPreview: true,
      // Enable/disable thumbnail preview on seek bar
      thumbnailCacheSize: 50,
      // Max cached thumbnails (default increased from 20)
      thumbnailPregenerate: true,
      // Pre-generate thumbnails during idle time
      thumbnailInterval: 10,
      // Pre-generation interval in seconds
      thumbnailWidth: 160,
      // Thumbnail width
      thumbnailHeight: 90,
      // Thumbnail height
      thumbnailQuality: 0.8,
      // Thumbnail JPEG quality
      // Lazy Loading (primarily used by index.js auto-init)
      lazyInit: true,
      // Enable lazy initialization via IntersectionObserver
      lazyMargin: "200px",
      // Root margin for IntersectionObserver
      // Theming
      theme: "dark",
      // Theme: 'dark', 'light', 'minimal', 'high-contrast'
      themeVariables: {},
      // Custom CSS variable overrides (e.g., { 'primary': '#ff0000' })
      // Advanced
      debug: false,
      classPrefix: "vidply",
      iconType: "svg",
      pauseOthersOnPlay: true,
      // Callbacks
      onReady: null,
      onPlay: null,
      onPause: null,
      onEnded: null,
      onTimeUpdate: null,
      onVolumeChange: null,
      onError: null,
      ...options
    };
    this.options.metadataAlerts = this.options.metadataAlerts || {};
    this.options.metadataHashtags = this.options.metadataHashtags || {};
    this.noticeElement = null;
    this.noticeTimeout = null;
    this._preferencesConfigKey = `${Boolean(this.options.muted)}|${Number(this.options.volume)}`;
    this.storage = new StorageManager("vidply");
    this.themeManager = new ThemeManager(this);
    this.posterManager = new PosterManager(this);
    this.responsiveManager = new ResponsiveManager(this);
    const savedPrefs = this.storage.getPlayerPreferences();
    if (savedPrefs) {
      const savedConfigKey = typeof savedPrefs.configKey === "string" ? savedPrefs.configKey : null;
      if (savedConfigKey === this._preferencesConfigKey) {
        if (typeof savedPrefs.volume === "number") this.options.volume = savedPrefs.volume;
        if (typeof savedPrefs.muted === "boolean") this.options.muted = savedPrefs.muted;
      }
      if (typeof savedPrefs.playbackSpeed === "number") {
        this.options.playbackSpeed = savedPrefs.playbackSpeed;
      }
    }
    this.state = {
      ready: false,
      playing: false,
      paused: true,
      ended: false,
      buffering: false,
      seeking: false,
      hasStartedPlayback: false,
      muted: this.options.muted,
      volume: this.options.volume,
      currentTime: 0,
      duration: Number(this.options.initialDuration) > 0 ? Number(this.options.initialDuration) : 0,
      playbackSpeed: this.options.playbackSpeed,
      fullscreen: false,
      pip: false,
      floating: null,
      captionsEnabled: this.options.captionsDefault,
      currentCaption: null,
      controlsVisible: true,
      audioDescriptionEnabled: false,
      signLanguageEnabled: false,
      signLanguageInMainView: false,
      resumePromptVisible: false,
      isLive: false,
      behindLive: false,
      liveEdge: null
    };
    this.liveStreamManager = new LiveStreamManager(this);
    this.resumePromptElement = null;
    this.originalSrc = null;
    this.audioDescriptionSrc = this.options.audioDescriptionSrc;
    this.signLanguageSrc = this.options.signLanguageSrc;
    this.signLanguageSources = this.options.signLanguageSources || {};
    this.currentSignLanguage = null;
    this.signLanguageVideo = null;
    this.audioDescriptionSourceElement = null;
    this.originalAudioDescriptionSource = null;
    this.audioDescriptionCaptionTracks = [];
    this._audioDescriptionDesiredState = false;
    this._textTracksCache = null;
    this._textTracksDirty = true;
    this._sourceElementsCache = null;
    this._sourceElementsDirty = true;
    this._trackElementsCache = null;
    this._trackElementsDirty = true;
    this.timeouts = /* @__PURE__ */ new Set();
    this.container = document.createElement("div");
    this.renderer = null;
    this.controlBar = null;
    this.captionManager = null;
    this.keyboardManager = null;
    this.metadataCueChangeHandler = null;
    this.audioDescriptionManager = null;
    this.signLanguageManager = null;
    this._managersLoading = null;
    Object.defineProperties(this, {
      signLanguageWrapper: {
        get: () => this.signLanguageManager?.wrapper,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.wrapper = v;
        }
      },
      signLanguageVideo: {
        get: () => this.signLanguageManager?.video,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.video = v;
        }
      },
      signLanguageHeader: {
        get: () => this.signLanguageManager?.header,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.header = v;
        }
      },
      signLanguageSettingsButton: {
        get: () => this.signLanguageManager?.settingsButton,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.settingsButton = v;
        }
      },
      signLanguageSettingsMenu: {
        get: () => this.signLanguageManager?.settingsMenu,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.settingsMenu = v;
        }
      },
      signLanguageSettingsMenuVisible: {
        get: () => this.signLanguageManager?.settingsMenuVisible,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.settingsMenuVisible = v;
        }
      },
      signLanguageDraggable: {
        get: () => this.signLanguageManager?.draggable,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.draggable = v;
        }
      },
      currentSignLanguage: {
        get: () => this.signLanguageManager?.currentLanguage,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.currentLanguage = v;
        }
      }
    });
    this.init();
  }
  /** Convenience getter for subsystems that take an AbortSignal. */
  get lifecycleSignal() {
    return this._lifecycleController.signal;
  }
  /**
   * Get cached text tracks array
   * @returns {Array} Array of text tracks
   */
  get textTracks() {
    if (!this._textTracksCache || this._textTracksDirty) {
      this._textTracksCache = Array.from(this.element.textTracks || []);
      this._textTracksDirty = false;
    }
    return this._textTracksCache;
  }
  /**
   * Get cached source elements array
   * @returns {Array} Array of source elements
   */
  get sourceElements() {
    if (!this._sourceElementsCache || this._sourceElementsDirty) {
      this._sourceElementsCache = Array.from(this.element.querySelectorAll("source"));
      this._sourceElementsDirty = false;
    }
    return this._sourceElementsCache;
  }
  /**
   * Get cached track elements array
   * @returns {Array} Array of track elements
   */
  get trackElements() {
    if (!this._trackElementsCache || this._trackElementsDirty) {
      this._trackElementsCache = Array.from(this.element.querySelectorAll("track"));
      this._trackElementsDirty = false;
    }
    return this._trackElementsCache;
  }
  /**
   * Show a small in-player notice (non-blocking), also announced to screen readers.
   */
  showNotice(message, { timeout = 2500, priority = "polite" } = {}) {
    try {
      if (!message) return;
      if (!this.container) return;
      if (this.keyboardManager?.announce) {
        this.keyboardManager.announce(message, priority);
      }
      if (!this.noticeElement) {
        const el = document.createElement("div");
        el.className = `${this.options.classPrefix}-notice`;
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", priority);
        el.setAttribute("aria-atomic", "true");
        el.style.position = "absolute";
        el.style.left = "0.75rem";
        el.style.right = "0.75rem";
        el.style.top = "0.75rem";
        el.style.zIndex = "9999";
        el.style.padding = "0.5rem 0.75rem";
        el.style.borderRadius = "0.5rem";
        el.style.background = "rgba(0, 0, 0, 0.75)";
        el.style.color = "#fff";
        el.style.fontSize = "0.875rem";
        el.style.lineHeight = "1.3";
        el.style.pointerEvents = "none";
        this.noticeElement = el;
        this.container.appendChild(el);
      }
      const noticeElement = this.noticeElement;
      noticeElement.textContent = message;
      noticeElement.style.display = "block";
      if (this.noticeTimeout) {
        clearTimeout(this.noticeTimeout);
        this.noticeTimeout = null;
      }
      this.noticeTimeout = setTimeout(() => {
        if (this.noticeElement) {
          this.noticeElement.style.display = "none";
        }
      }, timeout);
    } catch {
    }
  }
  async init() {
    try {
      this.log("Initializing VidPly player");
      if (this.options.languageFiles) {
        try {
          await i18n.loadLanguagesFromUrls(this.options.languageFiles);
        } catch (error) {
          console.warn("Failed to load some language files:", error);
        }
      }
      if (this.options.languageFile && this.options.languageFileUrl) {
        try {
          await i18n.loadLanguageFromUrl(this.options.languageFile, this.options.languageFileUrl);
          this.log(`Custom language file loaded for ${this.options.languageFile}`);
        } catch (error) {
          console.warn(`Failed to load language file for ${this.options.languageFile}:`, error);
        }
      }
      if (!this.options.language || this.options.language === "en") {
        const htmlLang = this.detectHtmlLanguage();
        if (htmlLang) {
          this.options.language = htmlLang;
          this.log(`Auto-detected language from HTML: ${htmlLang}`);
        }
      }
      if (!this.options.language) {
        this.options.language = "en";
      }
      await i18n.ensureLanguage(this.options.language);
      i18n.setLanguage(this.options.language);
      this.createContainer();
      this.initStandaloneTrackInfo();
      if (this.options.floating && this.element && this.element.tagName === "VIDEO") {
        try {
          const mediaEl = this.element;
          mediaEl.disablePictureInPicture = true;
          mediaEl.disableRemotePlayback = true;
          this.element.setAttribute("disablepictureinpicture", "");
          this.element.setAttribute("disableremoteplayback", "");
        } catch (err) {
          this.log(`Failed to disable native PiP: ${err}`, "warn");
        }
      }
      const src = this.element.src || this.element.querySelector("source")?.src;
      if (src) {
        await this.initializeRenderer();
      } else {
        this.log("No initial source - waiting for playlist or manual load");
      }
      await this.initFeatureManagers();
      if (this.options.controls) {
        this.controlBar = new ControlBar(this);
        this.videoWrapper?.appendChild(this.controlBar.element);
      }
      if (this.options.captions) {
        this.captionManager = new CaptionManager(this);
      }
      if (this.options.transcript) {
        await this.ensureTranscriptManager();
      }
      this.setupMetadataHandling();
      if (this.options.keyboard) {
        this.keyboardManager = new KeyboardManager(this);
      }
      if (this.options.mediaSession) {
        this.mediaSessionManager = new MediaSessionManager(this);
      }
      this.setupResponsiveHandlers();
      if (this.options.startTime > 0) {
        this.seek(this.options.startTime);
      }
      requestAnimationFrame(() => {
        this.applyVolumeAndMuteSettings();
      });
      if (this.options.resumePlayback) {
        this.initResumePlayback();
      }
      this.state.ready = true;
      this._originalElement.classList.add("vidply-initialized");
      this.emit("ready");
      if (this.options.onReady) {
        this.options.onReady.call(this);
      }
      if (this.options.autoplay) {
        this.play();
      }
      this.log("Player initialized successfully");
    } catch (error) {
      this.handleError(error);
    }
  }
  /**
   * Ensure the transcript manager is available, creating it on demand.
   * This keeps the initial load fast when transcripts are not needed.
   */
  async ensureTranscriptManager() {
    if (this.transcriptManager) {
      return this.transcriptManager;
    }
    if (!this.options.transcript && !this.options.transcriptButton) {
      return null;
    }
    const module = await import("./vidply.TranscriptManager-M7PGQRMQ.js");
    const fallbackDefault = module.default;
    const Manager = module.TranscriptManager || fallbackDefault;
    if (!Manager) {
      return null;
    }
    this.transcriptManager = new Manager(this);
    return this.transcriptManager;
  }
  /**
   * Toggle transcript visibility, lazily creating the manager if necessary.
   */
  async toggleTranscript() {
    const manager = await this.ensureTranscriptManager();
    if (!manager) return;
    manager.toggleTranscript();
    if (this.controlBar) {
      this.controlBar.updateTranscriptButton();
    }
  }
  /**
   * Ensure the audio description manager is available, creating it on demand.
   * This keeps the initial load fast when an audio description is not needed.
   */
  async ensureAudioDescriptionManager() {
    if (this.audioDescriptionManager) {
      return this.audioDescriptionManager;
    }
    if (!this.hasAudioDescriptionContent()) {
      return null;
    }
    const AudioDescManager = await loadAudioDescriptionManager();
    this.audioDescriptionManager = new AudioDescManager(this);
    return this.audioDescriptionManager;
  }
  /**
   * True when the current media actually exposes audio-description content:
   * an explicit described-audio source, `<source>` elements carrying
   * `data-desc-src` / `data-orig-src`, or a `descriptions` text track.
   * Mirrors `ControlBar.hasAudioDescription()` so the chunk load and the
   * button visibility stay in lock-step.
   */
  hasAudioDescriptionContent() {
    if (this.options.audioDescriptionSrc || this.audioDescriptionSrc) {
      return true;
    }
    const hasSourceElementsWithDesc = this.sourceElements.some(
      (el) => el.getAttribute("data-desc-src") || el.getAttribute("data-orig-src")
    );
    if (hasSourceElementsWithDesc) {
      return true;
    }
    const textTracks = this.element ? Array.from(this.element.textTracks || []) : [];
    return textTracks.some((track) => track.kind === "descriptions");
  }
  // ============================================
  // Resume Playback Methods
  // ============================================
  /**
   * Ensure the sign language manager is available, creating it on demand.
   * This keeps the initial load fast when sign language is not needed.
   */
  async ensureSignLanguageManager() {
    if (this.signLanguageManager) {
      this.signLanguageManager.src = this.resolveSignLanguageSrc();
      this.signLanguageManager.sources = this.resolveSignLanguageSources();
      return this.signLanguageManager;
    }
    if (!this.hasSignLanguageContent()) {
      return null;
    }
    const SignLangManager = await loadSignLanguageManager();
    this.signLanguageManager = new SignLangManager(this);
    return this.signLanguageManager;
  }
  /**
   * True when a sign-language video source (single `signLanguageSrc` or a
   * `signLanguageSources` map) is configured. Mirrors
   * `ControlBar.hasSignLanguage()`.
   */
  hasSignLanguageContent() {
    const src = this.signLanguageSrc ?? this.options.signLanguageSrc ?? null;
    if (src && src.length > 0) {
      return true;
    }
    const sources = this.signLanguageSources && Object.keys(this.signLanguageSources).length > 0 ? this.signLanguageSources : this.options.signLanguageSources || {};
    return Object.keys(sources).length > 0;
  }
  resolveSignLanguageSrc() {
    const src = this.signLanguageSrc ?? this.options.signLanguageSrc ?? null;
    return src && src.length > 0 ? src : null;
  }
  resolveSignLanguageSources() {
    if (this.signLanguageSources && Object.keys(this.signLanguageSources).length > 0) {
      return { ...this.signLanguageSources };
    }
    return { ...this.options.signLanguageSources || {} };
  }
  /**
   * Lazy-load and instantiate the floating (in-page PiP) manager. Only
   * created when `options.floating === true` and the media element is a
   * <video>. Audio-only players never float.
   */
  async ensureFloatingPlayerManager() {
    if (this.floatingPlayerManager) {
      return this.floatingPlayerManager;
    }
    if (!this.options.floating) {
      return null;
    }
    if (!this.element || this.element.tagName !== "VIDEO") {
      return null;
    }
    const FloatingManager = await loadFloatingPlayerManager();
    this.floatingPlayerManager = new FloatingManager(this);
    return this.floatingPlayerManager;
  }
  /**
   * Initialize feature managers if needed (called during init)
   */
  async initFeatureManagers() {
    const promises = [];
    if (this.hasAudioDescriptionContent()) {
      promises.push(this.ensureAudioDescriptionManager());
    }
    if (this.hasSignLanguageContent()) {
      promises.push(this.ensureSignLanguageManager());
    }
    if (this.options.floating && this.element && this.element.tagName === "VIDEO") {
      promises.push(this.ensureFloatingPlayerManager());
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    if (this.audioDescriptionManager) {
      this.audioDescriptionManager.initFromSourceElements(this.sourceElements, this.trackElements);
    }
  }
  /**
   * Detect language from HTML lang attribute
   * @returns {string|null} Language code if available in translations or as built-in, null otherwise
   */
  detectHtmlLanguage() {
    const htmlLang = document.documentElement.lang || document.documentElement.getAttribute("lang");
    if (!htmlLang) {
      return null;
    }
    const normalizedLang = htmlLang.toLowerCase().split("-")[0];
    if (!normalizedLang) {
      return null;
    }
    if (i18n.translations[normalizedLang]) {
      return normalizedLang;
    }
    const i18nWithLoaders = i18n;
    if (i18nWithLoaders.builtInLanguageLoaders && i18nWithLoaders.builtInLanguageLoaders[normalizedLang]) {
      return normalizedLang;
    }
    this.log(`Language "${htmlLang}" not available, using English as fallback`);
    return null;
  }
  /**
   * Initialise the resume-playback feature. Lazily constructs a
   * `ResumeManager` on first use so disabled pages don't pay the DOM
   * / listener cost. Repeat calls are safe — the manager's own
   * `init()` is idempotent.
   */
  initResumePlayback() {
    if (!this.resumeManager) {
      this.resumeManager = new ResumeManager(this);
    }
    this.resumeManager.init();
  }
  /**
   * Render track metadata above the media for single-item players. Skipped
   * when a playlist manager owns the track-info header instead.
   */
  initStandaloneTrackInfo() {
    if (this.playlistManager || !this.container || this.options.showTrackInfo === false) {
      return;
    }
    const data = this.buildStandaloneTrackInfoData();
    if (!data) {
      return;
    }
    this.trackInfoView = new TrackInfoView(this.options.classPrefix);
    this.trackInfoView.mount(this.container);
    this.trackInfoView.render(data);
  }
  buildStandaloneTrackInfoData() {
    const opts = this.options;
    const data = {
      title: typeof opts.title === "string" ? opts.title : void 0,
      artist: typeof opts.artist === "string" ? opts.artist : void 0,
      description: typeof opts.description === "string" ? opts.description : void 0,
      longDescription: typeof opts.longDescription === "string" ? opts.longDescription : void 0,
      date: typeof opts.date === "string" ? opts.date : void 0
    };
    const hasContent = Boolean(
      (data.title ?? "").trim() || (data.artist ?? "").trim() || (data.description ?? "").trim() || (data.longDescription ?? "").trim() || (data.date ?? "").trim()
    );
    return hasContent ? data : null;
  }
  /**
   * Get a unique identifier for the current video
   * Uses data-video-id attribute if available, otherwise hashes the source URL
   * @returns {string|null} Video ID or null if not available
   */
  getVideoId() {
    const explicitId = this.element.getAttribute("data-video-id") || this.element.dataset.videoId || this._originalElement?.getAttribute("data-video-id") || this._originalElement?.dataset?.videoId;
    if (explicitId) {
      return explicitId;
    }
    let src = this.element.src;
    if (!src) {
      const sourceEl = this.element.querySelector("source");
      src = sourceEl?.src;
    }
    if (!src) {
      return null;
    }
    return this._hashString(src);
  }
  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return "v_" + Math.abs(hash).toString(36);
  }
  // Resume-playback delegates. Implementations live in
  // `core/ResumeManager.ts`; these stubs keep the public API.
  saveProgress() {
    this.resumeManager?.saveProgress();
  }
  checkForResume() {
    this.resumeManager?.checkForResume();
  }
  showResumePrompt(savedTime) {
    this.resumeManager?.showPrompt(savedTime);
  }
  hideResumePrompt() {
    this.resumeManager?.hidePrompt();
  }
  // Theme delegates. All four keep their original names so external
  // callers keep working; the real work is in `core/ThemeManager.ts`.
  applyTheme() {
    this.themeManager.apply();
  }
  setTheme(themeName, customVariables = {}) {
    this.themeManager.set(themeName, customVariables);
  }
  getTheme() {
    return this.themeManager.get();
  }
  setThemeVariable(variableName, value) {
    this.themeManager.setVariable(variableName, value);
  }
  resetTheme() {
    this.themeManager.reset();
  }
  createContainer() {
    const playerLabel = this.instanceId > 1 ? `${i18n.t("player.label")} ${this.instanceId}` : i18n.t("player.label");
    this.container = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-player`,
      attributes: {
        "role": "region",
        "aria-label": playerLabel,
        "tabindex": "0"
      }
    });
    const mediaType = this.element.tagName.toLowerCase();
    this.container.classList.add(`${this.options.classPrefix}-${mediaType}`);
    if (this.options.responsive) {
      this.container.classList.add(`${this.options.classPrefix}-responsive`);
    }
    this.videoWrapper = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-video-wrapper`
    });
    this.element.parentNode?.insertBefore(this.container, this.element);
    if (this.element.tagName === "AUDIO" && this.options.poster) {
      const safePoster = sanitizePosterUrl(this.resolvePosterPath(this.options.poster));
      if (safePoster) {
        this.trackArtworkElement = DOMUtils.createElement("div", {
          className: `${this.options.classPrefix}-track-artwork`,
          attributes: {
            "aria-hidden": "true"
          }
        });
        this.trackArtworkElement.style.backgroundImage = `url("${cssEscapeUrl(safePoster)}")`;
        this.container.appendChild(this.trackArtworkElement);
      } else {
        this.log(`[VidPly] Ignored unsafe poster URL`, "warn");
      }
    }
    this.container.appendChild(this.videoWrapper);
    this.videoWrapper.appendChild(this.element);
    this.element.controls = false;
    this.element.removeAttribute("controls");
    this.element.setAttribute("tabindex", "-1");
    this.element.style.width = "100%";
    this.element.style.height = "100%";
    if (this.element.tagName === "VIDEO" && this.options.playsInline) {
      this.element.setAttribute("playsinline", "");
      this.element.playsInline = true;
    }
    if (this.options.width) {
      this.container.style.width = typeof this.options.width === "number" ? `${this.options.width}px` : this.options.width;
    }
    if (this.options.height) {
      this.container.style.height = typeof this.options.height === "number" ? `${this.options.height}px` : this.options.height;
    }
    if (this.options.poster && this.element.tagName === "VIDEO") {
      const resolvedPoster = sanitizePosterUrl(this.resolvePosterPath(this.options.poster));
      if (resolvedPoster) {
        this.element.poster = resolvedPoster;
      }
    }
    if (this.isPlayButtonOverlayEnabled()) {
      this.createPlayButtonOverlay();
    }
    this.createBufferingLoadingOverlay();
    this.element.vidply = this;
    _Player.instances.push(this);
    this.element.style.cursor = "pointer";
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.toggle();
      }
    }, { signal: this.lifecycleSignal });
    this.on("play", () => {
      this.state.hasStartedPlayback = true;
      this.hidePosterOverlay();
    });
    this.on("timeupdate", () => {
      if (this.state.hasStartedPlayback && this.state.currentTime > 0) {
        this.hidePosterOverlay();
      }
    });
    this.element.addEventListener("loadeddata", () => {
      if (this.state.hasStartedPlayback && (this.state.playing || this.state.currentTime > 0)) {
        this.hidePosterOverlay();
      }
    }, { once: true });
    this.applyTheme();
  }
  /**
   * Whether the centered play overlay should be created for this player.
   * `playButtonOverlay: 'auto'` keeps it video-only.
   */
  isPlayButtonOverlayEnabled() {
    const option = this.options.playButtonOverlay;
    if (option === false) {
      return false;
    }
    if (this.element.tagName === "VIDEO") {
      return true;
    }
    return option === true;
  }
  /** The node actually inserted into the DOM: the button on audio, the SVG on video. */
  getPlayButtonOverlayNode() {
    return this.playButtonOverlayButton ?? this.playButtonOverlay;
  }
  /**
   * (Re-)insert the overlay into its host. Audio players hang it on the track
   * artwork, which `PlaylistManager` may only create once a track is loaded —
   * hence the separate, idempotent mount step.
   */
  mountPlayButtonOverlay(host = null) {
    const node = this.getPlayButtonOverlayNode();
    if (!node) {
      return;
    }
    const target = host ?? (this.element.tagName === "AUDIO" ? this.trackArtworkElement ?? this.container : this.videoWrapper);
    if (!target || node.parentNode === target) {
      return;
    }
    if (this.playButtonOverlayButton) {
      target.removeAttribute("aria-hidden");
    }
    target.appendChild(node);
  }
  createPlayButtonOverlay() {
    const overlay = createPlayOverlay();
    this.playButtonOverlay = overlay;
    if (this.element.tagName === "AUDIO") {
      const button = DOMUtils.createElement("button", {
        className: `${this.options.classPrefix}-play-overlay-button`,
        attributes: {
          type: "button",
          "aria-label": i18n.t("player.play")
        }
      });
      button.appendChild(overlay);
      button.addEventListener("click", () => {
        this.toggle();
      });
      this.playButtonOverlayButton = button;
    } else {
      overlay.addEventListener("click", () => {
        this.toggle();
      });
    }
    const node = this.getPlayButtonOverlayNode();
    this.mountPlayButtonOverlay();
    this.on("play", () => {
      node.style.opacity = "0";
      node.style.pointerEvents = "none";
      this.playButtonOverlayButton?.setAttribute("aria-label", i18n.t("player.pause"));
    });
    this.on("pause", () => {
      node.style.opacity = "1";
      node.style.pointerEvents = "auto";
      this.playButtonOverlayButton?.setAttribute("aria-label", i18n.t("player.play"));
      this.positionPlayOverlayOnMobile();
    });
    this.on("ended", () => {
      node.style.opacity = "1";
      node.style.pointerEvents = "auto";
      this.playButtonOverlayButton?.setAttribute("aria-label", i18n.t("player.play"));
      this.positionPlayOverlayOnMobile();
    });
    const debouncedPosition = debounce(() => {
      this.positionPlayOverlayOnMobile();
    }, 150);
    this.debouncedPositionPlayOverlay = debouncedPosition;
    window.addEventListener("resize", debouncedPosition, { signal: this.lifecycleSignal });
    this.on("loadedmetadata", () => {
      this.positionPlayOverlayOnMobile();
    });
    this.on("enterfullscreen", () => {
      rafWithTimeout(() => this.positionPlayOverlayOnMobile(), 100);
    });
    this.on("exitfullscreen", () => {
      rafWithTimeout(() => this.positionPlayOverlayOnMobile(), 100);
    });
  }
  /**
   * Purely additive buffering spinner. Never touches play overlay or any other UI —
   * only toggles `vidply-buffering` on the container and manages its own `.vidply-loading` node.
   * Skipped for external providers (YouTube, Vimeo, SoundCloud) which have native loading UI.
   */
  createBufferingLoadingOverlay() {
    if (!this.videoWrapper) {
      return;
    }
    const prefix = this.options.classPrefix;
    const bufferingLabel = i18n.t("player.buffering");
    const loading = DOMUtils.createElement("div", {
      className: `${prefix}-loading`,
      attributes: {
        "aria-busy": "false"
      }
    });
    const srAnnouncer = DOMUtils.createElement("span", {
      className: `${prefix}-sr-only`,
      attributes: {
        id: `${prefix}-buffering-live-${this.instanceId}`,
        "aria-live": "polite",
        "aria-atomic": "true"
      }
    });
    loading.appendChild(srAnnouncer);
    this.loadingOverlayElement = loading;
    this.videoWrapper.appendChild(loading);
    const isExternalControls = () => this.container?.classList.contains(`${prefix}-external-controls`);
    const showBuffering = () => {
      if (isExternalControls()) {
        return;
      }
      if (!this.state.hasStartedPlayback && !this.state.seeking) {
        return;
      }
      this.container.classList.add(`${prefix}-buffering`);
      loading.setAttribute("aria-busy", "true");
      srAnnouncer.textContent = bufferingLabel;
      this.positionPlayOverlayOnMobile();
    };
    const hideBuffering = () => {
      if (!this.container.classList.contains(`${prefix}-buffering`)) {
        return;
      }
      this.container.classList.remove(`${prefix}-buffering`);
      loading.setAttribute("aria-busy", "false");
      srAnnouncer.textContent = "";
    };
    this.on("waiting", showBuffering);
    this.on("canplay", hideBuffering);
    this.on("pause", hideBuffering);
    this.on("ended", hideBuffering);
    this._bufferingHideOnMediaPlaying = hideBuffering;
    this.element.addEventListener("playing", this._bufferingHideOnMediaPlaying);
    this.on("timeupdate", () => {
      if (this.container.classList.contains(`${prefix}-buffering`)) {
        hideBuffering();
      }
    });
  }
  positionPlayOverlayOnMobile() {
    this.positionOverlayOnMediaCenter(this.getPlayButtonOverlayNode());
    this.positionOverlayOnMediaCenter(this.loadingOverlayElement);
  }
  /**
   * Center an overlay on the visible media surface. The video wrapper can be
   * taller than the media (controls, aspect-ratio boxes), so plain 50%/50% CSS
   * would sit too low — same logic as the play overlay button.
   */
  positionOverlayOnMediaCenter(node) {
    if (!node) {
      return;
    }
    const mediaEl = this.getPlayOverlayMediaElement();
    if (!mediaEl) {
      node.style.top = "";
      node.style.left = "";
      node.style.transform = "";
      return;
    }
    const needsManualPosition = isMobile() || this.isPlaylistPanelRightDesktop() || mediaEl !== this.element;
    if (!needsManualPosition) {
      node.style.top = "";
      node.style.left = "";
      node.style.transform = "";
      return;
    }
    const mediaRect = mediaEl.getBoundingClientRect();
    const wrapperRect = this.videoWrapper?.getBoundingClientRect();
    if (!wrapperRect || mediaRect.height <= 0) {
      return;
    }
    const mediaCenterY = mediaRect.top - wrapperRect.top + mediaRect.height / 2;
    const mediaCenterX = mediaRect.left - wrapperRect.left + mediaRect.width / 2;
    node.style.top = `${mediaCenterY}px`;
    node.style.left = `${mediaCenterX}px`;
    node.style.transform = "translate(-50%, -50%)";
  }
  /**
   * Visible media surface used to center the play overlay. External renderers
   * hide the host <video>, so their iframe/container must be used instead.
   */
  getPlayOverlayMediaElement() {
    const prefix = this.options.classPrefix;
    if (this.videoWrapper) {
      const externalSelectors = [
        'div[id^="youtube-player-"]',
        'iframe[id^="vimeo-player-"]',
        `iframe.${prefix}-soundcloud-iframe`
      ];
      for (const selector of externalSelectors) {
        const candidate = this.videoWrapper.querySelector(selector);
        if (candidate instanceof HTMLElement && candidate.getBoundingClientRect().height > 0) {
          return candidate;
        }
      }
    }
    if (this.element.tagName === "VIDEO" && getComputedStyle(this.element).display !== "none") {
      return this.element;
    }
    return null;
  }
  isPlaylistPanelRightDesktop() {
    return !!this.container?.classList.contains("vidply-playlist-panel-right") && !this.state.fullscreen && isPlaylistPanelRightDesktopViewport();
  }
  async initializeRenderer() {
    this.liveStreamManager?.resetForSourceChange();
    this.resetPlaybackStateForSourceChange();
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
      this.controlBar?.removeHlsCaptionButtons(true);
    }
    let src = this._pendingSource;
    let rendererClass = null;
    if (!src) {
      const sourceElements = Array.from(this.element.querySelectorAll("source"));
      if (sourceElements.length > 1) {
        const negotiated = this._selectBestSource(sourceElements);
        src = negotiated.src;
        this._fallbackSources = negotiated.fallbacks;
      } else {
        src = this.element.src || sourceElements[0]?.src;
        this._fallbackSources = [];
      }
    } else {
      this._fallbackSources = [];
    }
    if (!src) {
      throw new Error("No media source found");
    }
    this.currentSource = src;
    this._pendingSource = null;
    if (this.hasAudioDescriptionContent()) {
      await this.ensureAudioDescriptionManager();
    }
    this.audioDescriptionManager?.initFromSourceElements(this.sourceElements, this.trackElements);
    if (!this.originalSrc) {
      this.originalSrc = src;
    }
    rendererClass = await this._detectRendererClass(src);
    this.log(`Using ${rendererClass?.name || "HTML5Renderer"} renderer`);
    this.renderer = new rendererClass(this);
    const initTimeout = (this._fallbackSources?.length ?? 0) > 0 ? 1e4 : 0;
    if (initTimeout > 0) {
      let timer;
      await Promise.race([
        this.renderer.init(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Renderer init timed out after ${initTimeout}ms`)), initTimeout);
        })
      ]).finally(() => {
        if (timer !== void 0) clearTimeout(timer);
      });
    } else {
      await this.renderer.init();
    }
    this.invalidateTrackCache();
    rafWithTimeout(() => this.positionPlayOverlayOnMobile(), 100);
  }
  async _detectRendererClass(src) {
    switch (classifyRendererType(src)) {
      case "youtube": {
        const module = await import("./vidply.YouTubeRenderer-NIOLQMHE.js");
        return module.YouTubeRenderer ?? module.default;
      }
      case "vimeo": {
        const module = await import("./vidply.VimeoRenderer-PIHEWFW5.js");
        return module.VimeoRenderer ?? module.default;
      }
      case "hls": {
        const module = await import("./vidply.HLSRenderer-4E4OFIVH.js");
        return module.HLSRenderer ?? module.default;
      }
      case "dash": {
        const module = await import("./vidply.DASHRenderer-ZYVJXAQU.js");
        return module.DASHRenderer ?? module.default;
      }
      case "soundcloud": {
        const module = await import("./vidply.SoundCloudRenderer-PCSU742H.js");
        return module.SoundCloudRenderer ?? module.default;
      }
      default:
        return HTML5Renderer;
    }
  }
  _selectBestSource(sourceElements) {
    const hasMSE = typeof MediaSource !== "undefined";
    const sources = sourceElements.map((el) => ({
      src: el.src || el.getAttribute("src") || "",
      type: el.type || el.getAttribute("type") || "",
      el
    }));
    const canPlayNativeHLS = (() => {
      const v = document.createElement("video");
      return v.canPlayType("application/vnd.apple.mpegurl") !== "";
    })();
    let chosen;
    if (hasMSE) {
      chosen = sources.find((s) => s.src.includes(".mpd"));
    }
    if (!chosen) {
      const hlsSource = sources.find((s) => s.src.includes(".m3u8"));
      if (hlsSource && (hasMSE || canPlayNativeHLS)) {
        chosen = hlsSource;
      }
    }
    if (!chosen) {
      chosen = sources.find((s) => !s.src.includes(".mpd") && !s.src.includes(".m3u8")) || sources[0];
    }
    const fallbacks = sources.filter((s) => s !== chosen).map((s) => ({ src: s.src, type: s.type }));
    return { src: chosen?.src ?? "", fallbacks };
  }
  async _fallbackToNextSource() {
    if (!this._fallbackSources || this._fallbackSources.length === 0) {
      return false;
    }
    const next = this._fallbackSources.shift();
    if (!next) return false;
    this.log(`Falling back to next source: ${next.src}`);
    try {
      if (this.renderer && typeof this.renderer.destroy === "function") {
        this.renderer.destroy();
        this.renderer = null;
      }
      this.currentSource = next.src;
      this._pendingSource = next.src;
      this._isFallingBack = true;
      await this.initializeRenderer();
      this._isFallingBack = false;
      return true;
    } catch {
      this.log(`Fallback source failed: ${next.src}`, "warn");
      this._isFallingBack = false;
      return this._fallbackToNextSource();
    }
  }
  /**
   * Invalidate DOM query cache (call when tracks/sources change)
   */
  invalidateTrackCache() {
    this._textTracksDirty = true;
    this._trackElementsDirty = true;
    this._sourceElementsDirty = true;
  }
  /**
   * Find a text track by kind and optionally language
   * @param {string} kind - Track kind (captions, subtitles, descriptions, chapters, metadata)
   * @param {string} [language] - Optional language code
   * @returns {TextTrack|null} Found track or null
   */
  findTextTrack(kind, language = null) {
    const tracks = this.textTracks;
    if (language) {
      return tracks.find((t) => t.kind === kind && t.language === language);
    }
    return tracks.find((t) => t.kind === kind);
  }
  /**
   * Find a source element by attribute
   * @param {string} attribute - Attribute name (e.g., 'data-desc-src')
   * @param {string} [value] - Optional attribute value
   * @returns {Element|null} Found source element or null
   */
  findSourceElement(attribute, value = null) {
    const sources = this.sourceElements;
    if (value) {
      return sources.find((el) => el.getAttribute(attribute) === value);
    }
    return sources.find((el) => el.hasAttribute(attribute));
  }
  /**
   * Find a track element by its associated TextTrack
   * @param {TextTrack} track - The TextTrack object
   * @returns {Element|null} Found track element or null
   */
  findTrackElement(track) {
    return this.trackElements.find((el) => el.track === track);
  }
  // Poster delegates. Implementations live in `core/PosterManager.ts`.
  resolvePosterPath(posterPath) {
    return this.posterManager.resolvePath(posterPath);
  }
  async generatePosterFromVideo(time = 10) {
    return this.posterManager.generateFromVideo(time);
  }
  async autoGeneratePoster() {
    return this.posterManager.autoGenerate();
  }
  showPosterOverlay() {
    this.posterManager.showOverlay();
  }
  hidePosterOverlay() {
    this.posterManager.hideOverlay();
  }
  /**
   * Set a managed timeout that will be cleaned up on destroy
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timeout ID
   */
  setManagedTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      this.timeouts.delete(timeoutId);
      callback();
    }, delay);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }
  /**
   * Clear a managed timeout
   * @param {number} timeoutId - Timeout ID to clear
   */
  clearManagedTimeout(timeoutId) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(timeoutId);
    }
  }
  /**
   * Load new media source (for playlists)
   * @param {Object} config - Media configuration
   * @param {string} config.src - Media source URL
   * @param {string} config.type - Media MIME type
   * @param {string} [config.poster] - Poster image URL
   * @param {Array} [config.tracks] - Text tracks (captions, chapters, etc.)
   * @param {string} [config.audioDescriptionSrc] - Audio description video URL
   * @param {string} [config.signLanguageSrc] - Sign language video URL
   */
  /**
   * Check if a source URL requires an external renderer (YouTube, Vimeo, SoundCloud, HLS, DASH)
   * @param {string} src - Source URL
   * @returns {boolean}
   */
  isExternalRendererUrl(src) {
    if (!src) return false;
    return src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com") || src.includes("soundcloud.com") || src.includes("api.soundcloud.com") || src.includes(".m3u8") || src.includes(".mpd");
  }
  async load(config) {
    try {
      this.log("Loading new media:", config.src);
      this.liveStreamManager?.resetForSourceChange();
      if (this.renderer) {
        this.pause();
      }
      this.resetPlaybackStateForSourceChange();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const existingTracks = this.trackElements;
      existingTracks.forEach((track) => track.remove());
      this.invalidateTrackCache();
      const isExternalRenderer = this.isExternalRendererUrl(config.src);
      if (isExternalRenderer) {
        this._switchingRenderer = true;
      }
      if (!isExternalRenderer) {
        this.element.src = config.src;
        if (config.type) {
          this.element.type = config.type;
        }
      } else {
        this.element.removeAttribute("src");
        const sources = this.element.querySelectorAll("source");
        sources.forEach((s) => s.removeAttribute("src"));
      }
      this._pendingSource = config.src;
      this._isAudioContent = Boolean(config.type && config.type.startsWith("audio/"));
      if (this.container) {
        if (this._isAudioContent) {
          this.container.classList.add("vidply-audio-content");
        } else {
          this.container.classList.remove("vidply-audio-content");
        }
      }
      if (config.poster && this.element.tagName === "VIDEO") {
        if (this._isAudioContent) {
          this.element.removeAttribute("poster");
          if (this.videoWrapper) {
            const cssPoster = PosterManager.toSafeCssPoster(this.resolvePosterPath(config.poster));
            if (cssPoster) {
              this.videoWrapper.style.setProperty("--vidply-poster-image", cssPoster);
              this.videoWrapper.classList.add("vidply-forced-poster");
            } else {
              this.videoWrapper.style.removeProperty("--vidply-poster-image");
            }
          }
        } else {
          const safePoster = sanitizePosterUrl(this.resolvePosterPath(config.poster));
          if (safePoster) {
            this.element.poster = safePoster;
          } else {
            this.element.removeAttribute("poster");
          }
          if (this.videoWrapper) {
            this.videoWrapper.classList.remove("vidply-forced-poster");
            this.videoWrapper.style.removeProperty("--vidply-poster-image");
          }
        }
      }
      if (config.tracks && config.tracks.length > 0) {
        config.tracks.forEach((trackConfig) => {
          const track = document.createElement("track");
          track.src = trackConfig.src ?? "";
          track.kind = trackConfig.kind || "captions";
          track.srclang = trackConfig.srclang || "en";
          track.label = trackConfig.label || trackConfig.srclang || "";
          if (trackConfig.default) {
            track.default = true;
          }
          if (typeof trackConfig.describedSrc === "string") {
            track.setAttribute("data-desc-src", trackConfig.describedSrc);
          }
          const firstChild = this.element.firstChild;
          if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE && firstChild.tagName !== "TRACK") {
            this.element.insertBefore(track, firstChild);
          } else {
            this.element.appendChild(track);
          }
        });
        this.invalidateTrackCache();
      }
      const wasSignLanguageEnabled = this.state.signLanguageEnabled;
      const wasAudioDescriptionEnabled = this.state.audioDescriptionEnabled;
      this.audioDescriptionSrc = config.audioDescriptionSrc || null;
      this.signLanguageSrc = config.signLanguageSrc || null;
      this.signLanguageSources = config.signLanguageSources || {};
      this.options.signLanguageSrc = config.signLanguageSrc || null;
      this.options.signLanguageSources = config.signLanguageSources || {};
      this.originalSrc = config.src;
      if (this.audioDescriptionManager) {
        this.audioDescriptionManager.updateSources(config.audioDescriptionSrc);
        this.audioDescriptionManager.reinitialize();
      }
      if (this.signLanguageManager) {
        this.signLanguageManager.updateSources(config.signLanguageSrc, config.signLanguageSources);
      }
      if (wasAudioDescriptionEnabled) {
        this.disableAudioDescription();
      }
      if (wasSignLanguageEnabled) {
        this.disableSignLanguage();
      }
      const shouldChangeRenderer = this.shouldChangeRenderer(config.src);
      const needsFullReinit = !shouldChangeRenderer && this.renderer && (this.renderer.dash || this.renderer.hls);
      if ((shouldChangeRenderer || needsFullReinit) && this.renderer) {
        this.renderer.destroy();
        this.renderer = null;
        if (this.controlBar) {
          this.controlBar.removeHlsCaptionButtons(true);
        }
        if (this.transcriptManager?.isVisible) {
          this.transcriptManager.hideTranscript();
        }
      }
      if (!this.renderer || shouldChangeRenderer || needsFullReinit) {
        await this.initializeRenderer();
      } else {
        this.renderer.media = this.element;
        const sourceChanged = Boolean(config.src && config.src !== this.currentSource);
        if (sourceChanged && isExternalRenderer && typeof this.renderer.loadSource === "function") {
          this.currentSource = config.src;
          await this.renderer.loadSource(config.src);
        } else if (this.options.deferLoad) {
          try {
            this.element.preload = this.options.preload || "metadata";
          } catch {
          }
          if (sourceChanged && config.src) {
            this.currentSource = config.src;
          }
          if (this.renderer) {
            const deferState = this.renderer;
            if (typeof deferState._didDeferredLoad === "boolean") {
              deferState._didDeferredLoad = false;
            }
            if (typeof deferState._hlsSourceLoaded === "boolean") {
              deferState._hlsSourceLoaded = false;
            }
            if (typeof deferState._dashSourceLoaded === "boolean") {
              deferState._dashSourceLoaded = false;
            }
            if ("_pendingSrc" in this.renderer) {
              deferState._pendingSrc = this._pendingSource || this.currentSource || null;
            }
          }
        } else if (!isExternalRenderer) {
          if (sourceChanged && config.src) {
            this.currentSource = config.src;
          }
          this.element.load();
        } else if (sourceChanged) {
          this._pendingSource = config.src;
          this.renderer.destroy();
          this.renderer = null;
          await this.initializeRenderer();
        }
      }
      if (isExternalRenderer) {
        setTimeout(() => {
          this._switchingRenderer = false;
        }, 500);
      } else {
        this._switchingRenderer = false;
      }
      window.scrollTo(scrollX, scrollY);
      if (needsFullReinit) {
        if (this.captionManager) {
          this.captionManager.disable();
          this.captionManager.tracks = [];
        }
        if (this.transcriptManager?.isVisible) {
          this.transcriptManager.hideTranscript();
        }
      } else {
        if (this.captionManager) {
          this.captionManager.destroy();
          this.captionManager = new CaptionManager(this);
        }
        if (this.transcriptManager) {
          const wasTranscriptVisible = this.transcriptManager.isVisible;
          this.transcriptManager.destroy();
          this.transcriptManager = null;
          const newManager = await this.ensureTranscriptManager();
          if (wasTranscriptVisible && this.controlBar && this.controlBar.hasCaptionTracks()) {
            newManager?.showTranscript();
          }
        }
        if (this.controlBar) {
          this.updateControlBar();
        }
      }
      window.scrollTo(scrollX, scrollY);
      if (wasSignLanguageEnabled && this.signLanguageSrc) {
        setTimeout(() => {
          this.enableSignLanguage();
          window.scrollTo(scrollX, scrollY);
        }, 150);
      }
      if (wasAudioDescriptionEnabled && this.audioDescriptionSrc) {
        setTimeout(() => {
          this.enableAudioDescription();
          window.scrollTo(scrollX, scrollY);
        }, 150);
      }
      this.emit("sourcechange", config);
      this.resetPlaybackStateForSourceChange();
      this.log("Media loaded successfully");
    } catch (error) {
      this.handleError(error);
    }
  }
  /**
   * Sync play/pause UI after a source swap. Destroying an HLS/DASH renderer or
   * clearing the media `src` can leave `state.playing` true without a matching
   * `pause` event on the element.
   */
  resetPlaybackStateForSourceChange() {
    try {
      this.element.pause();
    } catch {
    }
    this.state.playing = false;
    this.state.paused = true;
    this.state.ended = false;
    this.state.buffering = false;
    this.state.seeking = false;
    this.controlBar?.updatePlayPauseButton();
  }
  /**
   * Ensure the current renderer has started its initial load (metadata/manifest)
   * without starting playback. This is useful for playlists to behave like
   * single videos on selection, while still keeping autoplay off.
   */
  ensureLoaded() {
    try {
      if (!this.renderer) return;
      if (typeof this.renderer.ensureLoaded === "function") {
        this.renderer.ensureLoaded();
      }
    } catch {
    }
  }
  /**
   * Check if we need to change renderer type
   * @param {string} src - New source URL
   * @returns {boolean}
   */
  /**
   * Update the control bar to refresh button visibility based on available features
   */
  updateControlBar() {
    if (!this.controlBar) return;
    const controlBar = this.controlBar;
    controlBar.element.innerHTML = "";
    controlBar.createControls();
    controlBar.attachEvents();
    controlBar.setupAutoHide();
    controlBar.setupOverflowDetection();
    controlBar.updateLiveControls();
    controlBar.updateDuration();
    controlBar.updateProgress();
  }
  shouldChangeRenderer(src) {
    if (!this.renderer) return true;
    return classifyRendererType(src) !== this.renderer.rendererType;
  }
  // Playback controls
  play() {
    if (this.renderer) {
      this.renderer.play();
      return;
    }
    if (this._switchingRenderer || this.playlistManager?.isChangingTrack) {
      return;
    }
    if (this.playlistManager && Array.isArray(this.playlistManager.tracks) && this.playlistManager.tracks.length > 0) {
      const index = this.playlistManager.currentIndex >= 0 ? this.playlistManager.currentIndex : 0;
      this.playlistManager.play(index, true);
    }
  }
  pause() {
    if (this.renderer) {
      this.renderer.pause();
    }
  }
  stop() {
    this.pause();
    this.seek(0);
  }
  toggle() {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  }
  /**
   * Seek to a non-negative finite second offset. Non-finite or non-numeric
   * inputs are silently dropped instead of being forwarded to the renderer
   * where they would set `currentTime = NaN` on an HTMLMediaElement.
   */
  seek(time) {
    if (typeof time !== "number" || !Number.isFinite(time)) return;
    const safeTime = this.liveStreamManager ? this.liveStreamManager.clampSeekTime(time) : time < 0 ? 0 : time;
    this.hidePosterOverlay();
    if (this.renderer) {
      this.renderer.seek(safeTime);
    }
  }
  seekForward(interval = this.options.seekInterval) {
    const step = Number.isFinite(interval) ? interval : 5;
    let targetTime = this.state.currentTime + step;
    if (this.liveStreamManager?.resolveIsLive()) {
      const edge = this.liveStreamManager.getLiveEdge();
      if (edge !== null) {
        targetTime = Math.min(targetTime, edge);
      }
    } else if (this.state.duration > 0) {
      targetTime = Math.min(targetTime, this.state.duration);
    }
    this.seek(targetTime);
  }
  seekBackward(interval = this.options.seekInterval) {
    const step = Number.isFinite(interval) ? interval : 5;
    const minTime = this.liveStreamManager?.resolveIsLive() ? this.liveStreamManager.getSeekableStart() : 0;
    this.seek(Math.max(this.state.currentTime - step, minTime));
  }
  isLiveStream() {
    return this.liveStreamManager?.resolveIsLive() ?? false;
  }
  isBehindLive() {
    return this.liveStreamManager?.isBehindLive() ?? false;
  }
  getSecondsBehindLive() {
    return this.liveStreamManager?.getSecondsBehindLive() ?? 0;
  }
  getLiveSeekRange() {
    return this.liveStreamManager?.getSeekRange() ?? null;
  }
  seekToLive() {
    this.liveStreamManager?.seekToLive();
  }
  // Volume controls
  /**
   * HTML5 renderers call this before syncing `media.volume` / `media.muted`
   * into player state so programmatic init is not overwritten (Chrome timing).
   */
  shouldSyncVolumeFromMedia() {
    return !this._isApplyingVolumeSettings;
  }
  /**
   * Apply the resolved options volume/mute to the renderer and player state.
   */
  applyVolumeAndMuteSettings() {
    if (!this.renderer) {
      return;
    }
    const volume = Math.max(0, Math.min(1, this.options.volume));
    const muted = Boolean(this.options.muted);
    this._isApplyingVolumeSettings = true;
    try {
      this.renderer.setVolume(volume);
      this.renderer.setMuted(muted);
      this.state.volume = volume;
      this.state.muted = muted;
    } finally {
      this._isApplyingVolumeSettings = false;
    }
    this.emit("volumechange");
  }
  /**
   * Set the volume to a finite number in [0, 1]. Non-numeric or NaN
   * input is silently ignored.
   */
  setVolume(volume) {
    if (typeof volume !== "number" || !Number.isFinite(volume)) return;
    const newVolume = Math.max(0, Math.min(1, volume));
    if (this.renderer) {
      this.renderer.setVolume(newVolume);
    }
    this.state.volume = newVolume;
    if (newVolume > 0 && this.state.muted) {
      this.state.muted = false;
      if (this.renderer) {
        this.renderer.setMuted(false);
      }
      this.emit("volumechange");
    }
    this.savePlayerPreferences();
  }
  getVolume() {
    return this.state.volume;
  }
  mute() {
    if (this.renderer) {
      this.renderer.setMuted(true);
    }
    this.state.muted = true;
    this.savePlayerPreferences();
    this.emit("volumechange");
  }
  unmute() {
    if (this.renderer) {
      this.renderer.setMuted(false);
    }
    this.state.muted = false;
    this.savePlayerPreferences();
    this.emit("volumechange");
  }
  toggleMute() {
    if (this.state.muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }
  // Playback speed
  /**
   * Set playback speed in [0.25, 2]. Silently rejects non-finite input.
   */
  setPlaybackSpeed(speed) {
    if (typeof speed !== "number" || !Number.isFinite(speed)) return;
    const newSpeed = Math.max(0.25, Math.min(2, speed));
    if (this.renderer) {
      this.renderer.setPlaybackSpeed(newSpeed);
    }
    this.state.playbackSpeed = newSpeed;
    this.savePlayerPreferences();
    this.emit("playbackspeedchange", newSpeed);
  }
  getPlaybackSpeed() {
    return this.state.playbackSpeed;
  }
  // Save player preferences to localStorage
  savePlayerPreferences() {
    this.storage.savePlayerPreferences({
      configKey: this._preferencesConfigKey,
      volume: this.state.volume,
      muted: this.state.muted,
      playbackSpeed: this.state.playbackSpeed
    });
  }
  // Fullscreen
  enterFullscreen() {
    const elem = this.container;
    let fullscreenPromise = null;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    if (isIOS) {
      this._enablePseudoFullscreen();
      return;
    }
    if (elem.requestFullscreen) {
      fullscreenPromise = elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      fullscreenPromise = elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      fullscreenPromise = elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      fullscreenPromise = elem.msRequestFullscreen();
    }
    if (fullscreenPromise && typeof fullscreenPromise.catch === "function") {
      fullscreenPromise.catch((err) => {
        this.log("Fullscreen API failed, using pseudo-fullscreen:", err.message);
        this._enablePseudoFullscreen();
      });
    }
    if (!elem.requestFullscreen && !elem.webkitRequestFullscreen && !elem.mozRequestFullScreen && !elem.msRequestFullscreen) {
      this._enablePseudoFullscreen();
    } else {
      this.state.fullscreen = true;
      this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
      this.emit("fullscreenchange", true);
    }
  }
  exitFullscreen() {
    const doc = document;
    const isInNativeFullscreen = Boolean(
      document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement
    );
    if (isInNativeFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } else {
      this._disablePseudoFullscreen();
    }
    this.state.fullscreen = false;
    this.container.classList.remove(`${this.options.classPrefix}-fullscreen`);
    this.emit("fullscreenchange", false);
  }
  toggleFullscreen() {
    if (this.state.fullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }
  // Pseudo-fullscreen fallback for iOS and browsers without Fullscreen API.
  // All of the real DOM + scroll + inert bookkeeping lives in
  // `PseudoFullscreenController`; Player keeps these thin delegates so
  // call sites elsewhere in the class stay readable.
  _enablePseudoFullscreen() {
    if (!this.pseudoFullscreen) {
      this.pseudoFullscreen = new PseudoFullscreenController(this);
    }
    this.pseudoFullscreen.enable();
  }
  _disablePseudoFullscreen() {
    this.pseudoFullscreen?.disable();
  }
  // Picture-in-Picture
  enterPiP() {
    if (this.options.floating) {
      if (this.floatingPlayerManager) {
        this.floatingPlayerManager.togglePinned();
      }
      return;
    }
    const pipElement = this.element;
    if (typeof pipElement.requestPictureInPicture === "function") {
      pipElement.requestPictureInPicture();
      this.state.pip = true;
      this.emit("pipchange", true);
    }
  }
  exitPiP() {
    if (this.options.floating) {
      if (this.floatingPlayerManager && this.state.floating) {
        this.floatingPlayerManager.exit("manual");
      }
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
      this.state.pip = false;
      this.emit("pipchange", false);
    }
  }
  togglePiP() {
    if (this.options.floating) {
      if (this.floatingPlayerManager) {
        this.floatingPlayerManager.togglePinned();
      }
      return;
    }
    if (this.state.pip) {
      this.exitPiP();
    } else {
      this.enterPiP();
    }
  }
  // Captions
  enableCaptions() {
    if (this.captionManager) {
      this.captionManager.enable();
      this.state.captionsEnabled = true;
    }
  }
  disableCaptions() {
    if (this.captionManager) {
      this.captionManager.disable();
      this.state.captionsEnabled = false;
    }
  }
  toggleCaptions() {
    if (this.state.captionsEnabled) {
      this.disableCaptions();
    } else {
      this.enableCaptions();
    }
  }
  /**
   * Check if a track file exists. Bounded by a 8s `AbortSignal.timeout`
   * and the player's lifecycle controller, so a slow / hung server cannot
   * keep a request alive past `destroy()`.
   */
  async validateTrackExists(url) {
    if (typeof url !== "string" || !url) return false;
    const signals = [this.lifecycleSignal];
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      signals.push(AbortSignal.timeout(8e3));
    }
    const signal = signals.length === 1 ? signals[0] : AbortSignal.any?.(signals) ?? signals[0];
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-cache", signal });
      return response.ok;
    } catch (error) {
      if (this.options.debug) {
        this.log(`validateTrackExists("${url}") failed: ${error?.message ?? error}`, "warn");
      }
      return false;
    }
  }
  /**
   * Strip VTT formatting tags from caption text
   * @param {string} text - Caption text with VTT formatting
   * @returns {string} Plain text without formatting
   */
  stripVTTFormatting(text) {
    if (!text) return "";
    return text.replace(/<[^>]+>/g, "").replace(/\n/g, " ").trim().toLowerCase();
  }
  /**
   * Find matching caption time based on text content
   * Useful for syncing between videos of different lengths (e.g., with/without audio description)
   * @param {string} targetText - Caption text to search for
   * @param {Array} tracks - Array of caption tracks to search in
   * @returns {number|null} Start time of matching caption, or null if not found
   */
  findMatchingCaptionTime(targetText, tracks) {
    if (!targetText || !tracks || tracks.length === 0) {
      return null;
    }
    const normalizedTarget = this.stripVTTFormatting(targetText);
    for (const trackInfo of tracks) {
      if (trackInfo.kind !== "captions" && trackInfo.kind !== "subtitles") {
        continue;
      }
      const track = trackInfo.track;
      if (!track || !track.cues) {
        continue;
      }
      for (let i = 0; i < track.cues.length; i++) {
        const cue = track.cues[i];
        const cueText = this.stripVTTFormatting(cue.text);
        if (cueText === normalizedTarget) {
          return cue.startTime;
        }
        const targetWords = normalizedTarget.split(/\s+/).filter((w) => w.length > 2);
        const cueWords = cueText.split(/\s+/).filter((w) => w.length > 2);
        if (targetWords.length > 0 && cueWords.length > 0) {
          const matchingWords = targetWords.filter((word) => cueWords.includes(word));
          const matchRatio = matchingWords.length / targetWords.length;
          if (matchRatio >= 0.8) {
            return cue.startTime;
          }
        }
      }
    }
    return null;
  }
  // Audio Description (delegated to AudioDescriptionManager)
  async enableAudioDescription() {
    const manager = await this.ensureAudioDescriptionManager();
    return manager?.enable();
  }
  async disableAudioDescription() {
    const manager = await this.ensureAudioDescriptionManager();
    return manager?.disable();
  }
  async toggleAudioDescription() {
    if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
      this.showNotice(i18n.t("player.startPlaybackForAudioDescription"));
      return;
    }
    const manager = await this.ensureAudioDescriptionManager();
    if (!manager) return;
    if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
      manager.desiredState = !manager.desiredState;
      this.state.audioDescriptionEnabled = manager.desiredState;
      this.emit(manager.desiredState ? "audiodescriptionenabled" : "audiodescriptiondisabled");
      this.play();
      return;
    }
    return manager.toggle();
  }
  // Sign Language (delegated to SignLanguageManager)
  async enableSignLanguage() {
    const manager = await this.ensureSignLanguageManager();
    return manager?.enable();
  }
  async disableSignLanguage() {
    const manager = await this.ensureSignLanguageManager();
    return manager?.disable();
  }
  async toggleSignLanguage() {
    if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
      this.showNotice(i18n.t("player.startPlaybackForSignLanguage"));
      return;
    }
    const manager = await this.ensureSignLanguageManager();
    if (!manager) return;
    if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
      const wasEnabled = manager.enabled;
      const result = manager.toggle();
      if (!wasEnabled && manager.enabled) {
        this.play();
      }
      return result;
    }
    return manager.toggle();
  }
  async toggleSignLanguageInMainView() {
    const manager = await this.ensureSignLanguageManager();
    if (!manager) {
      return;
    }
    return manager.toggleInMainView();
  }
  setupSignLanguageInteraction() {
    return this.signLanguageManager?._setupInteraction();
  }
  switchSignLanguage(langCode) {
    return this.signLanguageManager?.switchLanguage(langCode);
  }
  showSignLanguageSettingsMenu() {
    return this.signLanguageManager?.showSettingsMenu();
  }
  hideSignLanguageSettingsMenu({ focusButton = true } = {}) {
    return this.signLanguageManager?.hideSettingsMenu({ focusButton });
  }
  constrainSignLanguagePosition() {
    return this.signLanguageManager?.constrainPosition();
  }
  saveSignLanguagePreferences() {
    return this.signLanguageManager?.savePreferences();
  }
  cleanupSignLanguage() {
    return this.signLanguageManager?.cleanup();
  }
  // Settings dialog removed - using individual control buttons instead
  showSettings() {
    console.warn("[VidPly] Settings dialog has been removed. Use individual control buttons (speed, captions, etc.)");
  }
  hideSettings() {
  }
  /**
   * Lazily build (on first use) and toggle the keyboard-shortcuts help
   * dialog. Reflects the live `keyboardShortcuts` bindings, including any
   * consumer overrides.
   */
  toggleKeyboardHelp() {
    if (!this.keyboardHelp) {
      this.keyboardHelp = new KeyboardHelp(this);
    }
    this.keyboardHelp.toggle();
  }
  showKeyboardHelp() {
    if (!this.keyboardHelp) {
      this.keyboardHelp = new KeyboardHelp(this);
    }
    this.keyboardHelp.show();
  }
  hideKeyboardHelp() {
    this.keyboardHelp?.hide();
  }
  // Utility methods
  getCurrentTime() {
    return this.state.currentTime;
  }
  getDuration() {
    return this.state.duration;
  }
  isPlaying() {
    return this.state.playing;
  }
  isPaused() {
    return this.state.paused;
  }
  isEnded() {
    return this.state.ended;
  }
  isMuted() {
    return this.state.muted;
  }
  isFullscreen() {
    return this.state.fullscreen;
  }
  handleError(error) {
    if (this._switchingRenderer || this._isFallingBack) {
      this.log("Suppressing error during renderer switch:", error, "debug");
      return;
    }
    if (this._fallbackSources && this._fallbackSources.length > 0) {
      this.log("Renderer error, attempting fallback:", error, "warn");
      this._fallbackToNextSource().then((success) => {
        if (!success) {
          this.log("All fallback sources exhausted", "error");
          this.emit("error", error);
          if (this.options.onError) {
            this.options.onError.call(this, error);
          }
        }
      });
      return;
    }
    this.log("Error:", error, "error");
    this.emit("error", error);
    if (this.options.onError) {
      this.options.onError.call(this, error);
    }
  }
  // Logging
  log(...messages) {
    if (!this.options.debug) {
      return;
    }
    let type = "log";
    const consoleObj = console;
    if (messages.length > 0) {
      const potentialType = messages[messages.length - 1];
      if (typeof potentialType === "string" && typeof consoleObj[potentialType] === "function") {
        type = potentialType;
        messages = messages.slice(0, -1);
      }
    }
    if (messages.length === 0) {
      messages = [""];
    }
    const consoleFn = consoleObj[type];
    if (typeof consoleFn === "function") {
      consoleFn("[VidPly]", ...messages);
    } else {
      console.log("[VidPly]", ...messages);
    }
  }
  /**
   * Wire up resize / orientation / fullscreen listeners. Delegates to
   * `ResponsiveManager`; Player keeps the method name for backward
   * compatibility with external callers that start the feature
   * manually after swapping the container.
   */
  setupResponsiveHandlers() {
    this.responsiveManager.setup();
  }
  // Cleanup. Aborts the lifecycle controller (which removes every
  // window/document listener wired with `{ signal }` plus every
  // user-influenced fetch we threaded the signal into), cascade-destroys
  // every manager we own, and finally removes this instance from the
  // global `Player.instances` registry.
  destroy() {
    this.log("Destroying player");
    try {
      this._lifecycleController.abort();
    } catch (err) {
      this.log(`AbortController.abort failed: ${err}`, "warn");
    }
    if (this.renderer) {
      this.renderer.destroy();
    }
    if (this.controlBar) {
      this.controlBar.destroy();
    }
    if (this.captionManager) {
      this.captionManager.destroy();
    }
    if (this.keyboardManager) {
      this.keyboardManager.destroy();
    }
    if (this.transcriptManager) {
      this.transcriptManager.destroy();
    }
    this.cleanupSignLanguage();
    if (this.audioDescriptionManager && typeof this.audioDescriptionManager.destroy === "function") {
      try {
        this.audioDescriptionManager.destroy();
      } catch (err) {
        this.log(`AudioDescriptionManager.destroy failed: ${err}`, "warn");
      }
      this.audioDescriptionManager = null;
    }
    if (this.signLanguageManager && typeof this.signLanguageManager.destroy === "function") {
      try {
        this.signLanguageManager.destroy();
      } catch (err) {
        this.log(`SignLanguageManager.destroy failed: ${err}`, "warn");
      }
      this.signLanguageManager = null;
    }
    if (this.playlistManager && typeof this.playlistManager.destroy === "function") {
      try {
        this.playlistManager.destroy();
      } catch (err) {
        this.log(`PlaylistManager.destroy failed: ${err}`, "warn");
      }
      this.playlistManager = null;
    }
    if (this.trackInfoView) {
      this.trackInfoView.destroy();
      this.trackInfoView = null;
    }
    if (this.keyboardHelp && typeof this.keyboardHelp.destroy === "function") {
      try {
        this.keyboardHelp.destroy();
      } catch (err) {
        this.log(`KeyboardHelp.destroy failed: ${err}`, "warn");
      }
      this.keyboardHelp = null;
    }
    if (this.mediaSessionManager && typeof this.mediaSessionManager.destroy === "function") {
      try {
        this.mediaSessionManager.destroy();
      } catch (err) {
        this.log(`MediaSessionManager.destroy failed: ${err}`, "warn");
      }
      this.mediaSessionManager = null;
    }
    if (this.liveStreamManager) {
      this.liveStreamManager.destroy();
      this.liveStreamManager = null;
    }
    if (this.floatingPlayerManager) {
      try {
        this.floatingPlayerManager.destroy();
      } catch (err) {
        this.log(`FloatingPlayerManager.destroy failed: ${err}`, "warn");
      }
      this.floatingPlayerManager = null;
    }
    if (this.playButtonOverlayButton && this.playButtonOverlayButton.parentNode) {
      this.playButtonOverlayButton.remove();
    }
    this.playButtonOverlayButton = null;
    if (this.playButtonOverlay && this.playButtonOverlay.parentNode) {
      this.playButtonOverlay.remove();
    }
    this.playButtonOverlay = null;
    if (this._bufferingHideOnMediaPlaying) {
      this.element.removeEventListener("playing", this._bufferingHideOnMediaPlaying);
      this._bufferingHideOnMediaPlaying = null;
    }
    if (this.loadingOverlayElement && this.loadingOverlayElement.parentNode) {
      this.loadingOverlayElement.remove();
      this.loadingOverlayElement = null;
    }
    this.responsiveManager?.cleanup();
    if (this.pseudoFullscreen && this.state.fullscreen) {
      try {
        this.pseudoFullscreen.disable();
      } catch (err) {
        this.log(`PseudoFullscreenController.disable failed: ${err}`, "warn");
      }
    }
    this.pseudoFullscreen = null;
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts.clear();
    if (this.metadataCueChangeHandler) {
      const textTracks = this.textTracks;
      const metadataTrack = textTracks.find((track) => track.kind === "metadata");
      if (metadataTrack) {
        metadataTrack.removeEventListener("cuechange", this.metadataCueChangeHandler);
      }
      this.metadataCueChangeHandler = null;
    }
    this.metadataAlertsManager?.cleanup();
    const idx = _Player.instances.indexOf(this);
    if (idx >= 0) {
      _Player.instances.splice(idx, 1);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.insertBefore(this.element, this.container);
      this.container.parentNode.removeChild(this.container);
    }
    this.removeAllListeners();
  }
  /**
   * Set up metadata track handling. Delegates to
   * `MetadataAlertsManager` — Player lazily constructs it so pages
   * without metadata tracks pay no cost.
   */
  setupMetadataHandling() {
    if (!this.metadataAlertsManager) {
      this.metadataAlertsManager = new MetadataAlertsManager(this);
    }
    this.metadataAlertsManager.setupHandling();
  }
  // Thin delegates for the metadata-alert system. Implementations
  // live in `core/MetadataAlertsManager.ts`; Player keeps the names
  // so call sites inside `handleMetadataCue` and external callers
  // (e.g. TranscriptManager integration tests) keep working.
  normalizeMetadataSelector(selector) {
    return (this.metadataAlertsManager ?? this._ensureMetadataManager()).normalizeSelector(selector);
  }
  resolveMetadataConfig(map, key) {
    return (this.metadataAlertsManager ?? this._ensureMetadataManager()).resolveConfig(map, key);
  }
  cacheMetadataAlertContent(element, config = {}) {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).cacheContent(element, config);
  }
  restoreMetadataAlertContent(element, config = {}) {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).restoreContent(element, config);
  }
  focusMetadataTarget(target, fallbackElement = null) {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).focusTarget(target, fallbackElement);
  }
  /** Internal helper: lazily creates the manager for external
   *  entry points that didn't come via `setupMetadataHandling`. */
  _ensureMetadataManager() {
    if (!this.metadataAlertsManager) {
      this.metadataAlertsManager = new MetadataAlertsManager(this);
    }
    return this.metadataAlertsManager;
  }
  handleMetadataAlert(selector, options = {}) {
    return (this.metadataAlertsManager ?? this._ensureMetadataManager()).handleAlert(selector, options);
  }
  handleMetadataHashtags(hashtags) {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).handleHashtags(hashtags);
  }
  handleMetadataCue(cue) {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).handleCue(cue);
  }
};

// src/features/PlaylistManager.ts
var playlistInstanceCounter = 0;
var PlaylistManager = class _PlaylistManager {
  player;
  container;
  currentIndex;
  hostElement;
  initialTracks;
  instanceId;
  isChangingTrack;
  isPanelVisible;
  navigationFeedback;
  options;
  PlayerClass;
  playlistPanel;
  playlistMainElement;
  trackArtworkElement;
  trackInfoView;
  tracks;
  uniqueId;
  // Timers owned by this manager. Tracked so destroy() can cancel any pending
  // deferred callback (auto-play, guard-flag resets, live-region clears,
  // focus moves) that would otherwise run against a torn-down player.
  _timers = /* @__PURE__ */ new Set();
  constructor(player, options = {}) {
    this.player = player;
    this.tracks = [];
    this.initialTracks = Array.isArray(options.tracks) ? options.tracks : [];
    this.currentIndex = -1;
    this.instanceId = ++playlistInstanceCounter;
    this.uniqueId = `vidply-playlist-${this.instanceId}`;
    this.options = {
      ...options,
      autoAdvance: options.autoAdvance !== false,
      // Default true
      autoPlayFirst: options.autoPlayFirst !== false,
      // Default true - auto-play first track on load
      loop: Boolean(options.loop) || false,
      showPanel: options.showPanel !== false,
      // Default true
      panelPosition: _PlaylistManager.normalizePanelPosition(options.panelPosition),
      recreatePlayers: Boolean(options.recreatePlayers) || false
    };
    this.container = null;
    this.playlistPanel = null;
    this.playlistMainElement = null;
    this.trackInfoView = null;
    this.trackArtworkElement = null;
    this.navigationFeedback = null;
    this.isPanelVisible = this.options.showPanel !== false;
    this.isChangingTrack = false;
    this.hostElement = options.hostElement ?? null;
    this.PlayerClass = options.PlayerClass ?? null;
    this.handleTrackEnd = this.handleTrackEnd.bind(this);
    this.handleTrackError = this.handleTrackError.bind(this);
    this.handlePlaybackStateChange = this.handlePlaybackStateChange.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleAudioDescriptionChange = this.handleAudioDescriptionChange.bind(this);
    this.player.playlistManager = this;
    this.init();
    this.updatePlayerControls();
    if (this.initialTracks.length > 0) {
      this.loadPlaylist(this.initialTracks);
    }
  }
  /**
   * Determine the media type for a track
   * @param {Object} track - Track object
   * @returns {string} - 'audio', 'video', 'youtube', 'vimeo', 'soundcloud', 'hls', 'dash'
   */
  getTrackMediaType(track) {
    const src = track.src || "";
    if (src.includes("youtube.com") || src.includes("youtu.be")) {
      return "youtube";
    }
    if (src.includes("vimeo.com")) {
      return "vimeo";
    }
    if (src.includes("soundcloud.com") || src.includes("api.soundcloud.com")) {
      return "soundcloud";
    }
    const normalizedType = (track.type || "").toLowerCase();
    if (normalizedType === "youtube" || normalizedType === "vimeo" || normalizedType === "soundcloud") {
      return normalizedType;
    }
    if (src.includes(".m3u8")) {
      return "hls";
    }
    if (src.includes(".mpd")) {
      return "dash";
    }
    if (track.type && track.type.startsWith("audio/")) {
      return "audio";
    }
    return "video";
  }
  /**
   * Recreate the player with the appropriate element type for the track
   * @param {Object} track - Track to load
   * @param {boolean} autoPlay - Whether to auto-play after creation
   */
  async recreatePlayerForTrack(track, autoPlay = false) {
    if (!this.hostElement || !this.PlayerClass) {
      console.warn("VidPly Playlist: Cannot recreate player - missing hostElement or PlayerClass");
      return false;
    }
    const mediaType = this.getTrackMediaType(track);
    const elementType = mediaType === "audio" ? "audio" : "video";
    const wasVisible = this.isPanelVisible;
    const savedTracks = [...this.tracks];
    const savedIndex = this.currentIndex;
    if (this.trackArtworkElement && this.trackArtworkElement.parentNode) {
      this.trackArtworkElement.parentNode.removeChild(this.trackArtworkElement);
    }
    this.trackArtworkElement = null;
    if (this.trackInfoView?.element.parentNode) {
      this.trackInfoView.element.parentNode.removeChild(this.trackInfoView.element);
    }
    if (this.navigationFeedback && this.navigationFeedback.parentNode) {
      this.navigationFeedback.parentNode.removeChild(this.navigationFeedback);
    }
    if (this.playlistPanel && this.playlistPanel.parentNode) {
      this.playlistPanel.parentNode.removeChild(this.playlistPanel);
    }
    const preservedPlayerOptions = this.player?.options ? { ...this.player.options } : {};
    if (this.player) {
      this.player.off("ended", this.handleTrackEnd);
      this.player.off("error", this.handleTrackError);
      this.player.playlistManager = null;
      this.player.destroy();
    }
    this.hostElement.innerHTML = "";
    const mediaElement = document.createElement(elementType);
    const preloadValue = preservedPlayerOptions.preload || "metadata";
    mediaElement.setAttribute("preload", preloadValue);
    if (elementType === "video" && track.poster && (mediaType === "video" || mediaType === "hls" || mediaType === "dash")) {
      mediaElement.setAttribute("poster", track.poster);
    }
    const isExternalRenderer = ["youtube", "vimeo", "soundcloud", "hls", "dash"].includes(mediaType);
    if (!isExternalRenderer) {
      const source = document.createElement("source");
      source.src = track.src || "";
      if (track.type) {
        source.type = track.type;
      }
      mediaElement.appendChild(source);
      if (track.tracks && track.tracks.length > 0) {
        track.tracks.forEach((trackConfig) => {
          const trackEl = document.createElement("track");
          trackEl.src = trackConfig.src || "";
          trackEl.kind = trackConfig.kind || "captions";
          trackEl.srclang = trackConfig.srclang || "en";
          trackEl.label = trackConfig.label || trackConfig.srclang || "";
          if (trackConfig.default) {
            trackEl.default = true;
          }
          mediaElement.appendChild(trackEl);
        });
      }
    }
    this.hostElement.appendChild(mediaElement);
    const playerOptions = Object.assign({}, preservedPlayerOptions, {
      mediaType: elementType,
      poster: track.poster,
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      audioDescriptionDuration: track.audioDescriptionDuration || null,
      signLanguageSrc: track.signLanguageSrc || null
    });
    this.player = new this.PlayerClass(mediaElement, playerOptions);
    this.player.playlistManager = this;
    await new Promise((resolve) => {
      if (this.player.state?.ready) {
        resolve();
        return;
      }
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      this.player.once("ready", done);
      this.setManagedTimeout(done, 5e3);
    });
    this.player.on("ended", this.handleTrackEnd);
    this.player.on("error", this.handleTrackError);
    if (this.player.container) {
      if (this.trackInfoView) {
        this.player.container.appendChild(this.trackInfoView.element);
      }
      if (this.navigationFeedback) {
        this.player.container.appendChild(this.navigationFeedback);
      }
      if (this.playlistPanel) {
        this.player.container.appendChild(this.playlistPanel);
      }
    }
    this.tracks = savedTracks;
    this.currentIndex = savedIndex;
    this.container = this.player.container;
    this.playlistMainElement = null;
    if (this.container) {
      this.container.classList.add("vidply-has-playlist");
    }
    this.applyPanelPositionClass();
    this.updatePlayerControls();
    this.applyPanelPositionClass();
    this.updatePlaylistUI();
    this.isPanelVisible = wasVisible;
    if (this.playlistPanel) {
      this.playlistPanel.style.display = wasVisible ? "" : "none";
    }
    const loadConfig = {
      src: track.src ?? "",
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || [],
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      signLanguageSrc: track.signLanguageSrc || null
    };
    await this.player.load(loadConfig);
    if (autoPlay) {
      this.player.play();
    }
    if (this.hostElement) {
      this.hostElement._vidplyPlayer = this.player;
    }
    this.updateTrackInfo(track);
    this.finalizeTrackArtworkForTrack(track);
    return true;
  }
  init() {
    this.player.on("ended", this.handleTrackEnd);
    this.player.on("error", this.handleTrackError);
    this.player.on("play", this.handlePlaybackStateChange);
    this.player.on("pause", this.handlePlaybackStateChange);
    this.player.on("ended", this.handlePlaybackStateChange);
    this.player.on("fullscreenchange", this.handleFullscreenChange);
    this.player.on("audiodescriptionenabled", this.handleAudioDescriptionChange);
    this.player.on("audiodescriptiondisabled", this.handleAudioDescriptionChange);
    if (this.options.showPanel) {
      this.createUI();
    }
    if (this.tracks.length === 0 && this.initialTracks.length === 0) {
      this.loadPlaylistFromAttribute();
    }
  }
  /**
   * Load playlist from data-playlist attribute if present
   */
  loadPlaylistFromAttribute() {
    if (!this.player.element || !this.player.element.parentElement) {
      return;
    }
    const videoWrapper = this.player.element.parentElement;
    const playerContainer = videoWrapper.parentElement;
    const originalElement = playerContainer ? playerContainer.parentElement : null;
    if (!originalElement) {
      return;
    }
    this.loadOptionsFromAttributes(originalElement);
    const playlistData = originalElement.getAttribute("data-playlist");
    if (!playlistData) {
      return;
    }
    try {
      const tracks = JSON.parse(playlistData);
      if (Array.isArray(tracks) && tracks.length > 0) {
        this.loadPlaylist(tracks);
      } else {
        console.warn("VidPly Playlist: data-playlist is not a valid array or is empty");
      }
    } catch (error) {
      console.error("VidPly Playlist: Failed to parse data-playlist attribute", error);
    }
  }
  /**
   * Load playlist options from data attributes
   * @param {HTMLElement} element - Element to read attributes from
   */
  loadOptionsFromAttributes(element) {
    const autoAdvance = element.getAttribute("data-playlist-auto-advance");
    if (autoAdvance !== null) {
      this.options.autoAdvance = autoAdvance === "true";
    }
    const autoPlayFirst = element.getAttribute("data-playlist-auto-play-first");
    if (autoPlayFirst !== null) {
      this.options.autoPlayFirst = autoPlayFirst === "true";
    }
    const loop = element.getAttribute("data-playlist-loop");
    if (loop !== null) {
      this.options.loop = loop === "true";
    }
    const showPanel = element.getAttribute("data-playlist-show-panel");
    if (showPanel !== null) {
      this.options.showPanel = showPanel === "true";
    }
    const panelPosition = element.getAttribute("data-playlist-panel-position");
    if (panelPosition !== null) {
      this.options.panelPosition = _PlaylistManager.normalizePanelPosition(panelPosition);
    }
    this.applyPanelPositionClass();
  }
  /**
   * Normalize a caller-supplied panel position to a supported value.
   */
  static normalizePanelPosition(value) {
    return value === "right" ? "right" : "below";
  }
  /**
   * Apply or remove the layout modifier class on the player container.
   */
  applyPanelPositionClass() {
    if (!this.container) {
      return;
    }
    if (this.tracks.length > 0 || this.playlistPanel) {
      this.container.classList.add("vidply-has-playlist");
    }
    if (this.playlistMainElement && this.playlistMainElement.parentElement !== this.container) {
      this.playlistMainElement = null;
    }
    const isRight = this.options.panelPosition === "right";
    this.container.classList.toggle("vidply-playlist-panel-right", isRight);
    if (isRight) {
      this.ensurePlaylistMainLayout();
      this.syncRightPanelMediaStyles();
    } else {
      this.teardownPlaylistMainLayout();
    }
  }
  /**
   * Group the media area (wrapper, track info, artwork) so the playlist can sit
   * beside it without stretching the video wrapper to the playlist height.
   */
  ensurePlaylistMainLayout() {
    if (!this.container || this.playlistMainElement) {
      return;
    }
    const main = DOMUtils.createElement("div", {
      className: "vidply-playlist-main"
    });
    const panel = this.playlistPanel;
    const children = Array.from(this.container.children).filter(
      (child) => child instanceof HTMLElement && child !== panel
    );
    if (panel && panel.parentElement === this.container) {
      this.container.insertBefore(main, panel);
    } else {
      this.container.appendChild(main);
    }
    children.forEach((child) => main.appendChild(child));
    this.orderPlaylistMainChildren(main);
    this.playlistMainElement = main;
  }
  /**
   * Left column order: artwork (optional) → video → controls (inside wrapper) → track info.
   */
  orderPlaylistMainChildren(main) {
    const orderedSelectors = [
      ".vidply-track-artwork",
      ".vidply-video-wrapper",
      ".vidply-track-info"
    ];
    orderedSelectors.forEach((selector) => {
      const node = main.querySelector(selector);
      if (node) {
        main.appendChild(node);
      }
    });
    Array.from(main.children).forEach((child) => {
      if (child.classList.contains("vidply-sr-only")) {
        main.appendChild(child);
      }
    });
  }
  /**
   * Insert a node before the video wrapper regardless of whether the right-panel
   * layout wrapped the player chrome in `.vidply-playlist-main`.
   */
  insertBeforeVideoWrapper(element) {
    if (!this.container) {
      return;
    }
    const videoWrapper = this.playlistMainElement?.querySelector(".vidply-video-wrapper") ?? this.container.querySelector(".vidply-video-wrapper");
    if (videoWrapper?.parentElement) {
      videoWrapper.parentElement.insertBefore(element, videoWrapper);
      if (this.playlistMainElement && videoWrapper.parentElement === this.playlistMainElement) {
        this.orderPlaylistMainChildren(this.playlistMainElement);
      }
      return;
    }
    const host = this.playlistMainElement ?? this.container;
    host.appendChild(element);
  }
  /**
   * Inline 100% heights on the media element stretch the wrapper in grid layouts.
   */
  syncRightPanelMediaStyles() {
    if (!this.container || this.options.panelPosition !== "right") {
      return;
    }
    this.container.querySelectorAll(".vidply-video-wrapper > video, .vidply-video-wrapper > audio").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.height = "auto";
      }
    });
    requestAnimationFrame(() => {
      this.player.positionPlayOverlayOnMobile();
    });
  }
  /**
   * Restore the default single-column DOM when the panel is below the player.
   */
  teardownPlaylistMainLayout() {
    if (!this.container || !this.playlistMainElement) {
      return;
    }
    const main = this.playlistMainElement;
    while (main.firstChild) {
      if (this.playlistPanel) {
        this.container.insertBefore(main.firstChild, this.playlistPanel);
      } else {
        this.container.appendChild(main.firstChild);
      }
    }
    main.remove();
    this.playlistMainElement = null;
  }
  /**
   * Update player controls to add playlist navigation buttons
   */
  updatePlayerControls() {
    if (!this.player.controlBar) return;
    const controlBar = this.player.controlBar;
    controlBar.element.innerHTML = "";
    controlBar.createControls();
    controlBar.attachEvents();
    controlBar.setupAutoHide();
  }
  /**
   * Move the control bar's download button to the selected track.
   *
   * Tracks may each offer their own file, and the control bar is not always
   * rebuilt on a track change (MSE renderers keep their controls), so the
   * button is refreshed explicitly.
   */
  refreshDownloadButton() {
    if (typeof this.player.controlBar?.updateDownloadButton === "function") {
      this.player.controlBar.updateDownloadButton();
    }
  }
  /**
   * Load a playlist
   * @param {Array} tracks - Array of track objects
   */
  loadPlaylist(tracks) {
    this.tracks = tracks;
    this.currentIndex = -1;
    if (this.container) {
      this.container.classList.add("vidply-has-playlist");
      this.applyPanelPositionClass();
    }
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
    if (tracks.length > 0) {
      if (this.options.autoPlayFirst) {
        this.play(0);
      } else {
        void this.loadTrack(0).catch(() => {
        });
      }
    }
    this.updatePlaylistVisibilityInFullscreen();
  }
  /**
   * Load a track without playing
   * This is the playlist equivalent of a "single video initialized but not started yet":
   * it updates UI selection and loads the media into the player so metadata/manifests
   * and feature managers can be ready, but it does not start playback.
   * @param {number} index - Track index
   */
  async loadTrack(index) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn("VidPly Playlist: Invalid track index", index);
      return;
    }
    const track = this.tracks[index];
    if (!track) return;
    this.selectTrack(index);
    this.isChangingTrack = true;
    if (this.options.recreatePlayers && this.hostElement && this.PlayerClass) {
      const currentMediaType = this.player ? this.player.element.tagName === "AUDIO" ? "audio" : "video" : null;
      const newMediaType = this.getTrackMediaType(track);
      const newElementType = newMediaType === "audio" || newMediaType === "soundcloud" ? "audio" : "video";
      if (currentMediaType !== newElementType) {
        await this.recreatePlayerForTrack(track, false);
        this.selectTrack(index);
        this.player.emit("playlisttrackchange", {
          index,
          item: track,
          total: this.tracks.length
        });
        this.setManagedTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    const loadPromise = this.player.load({
      src: track.src ?? "",
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || [],
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      signLanguageSrc: track.signLanguageSrc || null,
      signLanguageSources: track.signLanguageSources || {}
    });
    if (this.player?.options?.deferLoad && typeof this.player.ensureLoaded === "function") {
      Promise.resolve(loadPromise).then(() => this.player?.ensureLoaded?.()).catch(() => {
      });
    }
    this.player.emit("playlisttrackchange", {
      index,
      item: track,
      total: this.tracks.length
    });
    this.setManagedTimeout(() => {
      this.isChangingTrack = false;
    }, 150);
  }
  /**
   * Select a track (UI/selection only; does NOT set the media src / does NOT initialize renderer)
   *
   * In "B always" playlist mode, you typically want `loadTrack()` on selection so the
   * selected item behaves like a single video (metadata/manifest loaded, features ready)
   * without auto-playing.
   * @param {number} index - Track index
   */
  selectTrack(index) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn("VidPly Playlist: Invalid track index", index);
      return;
    }
    const track = this.tracks[index];
    if (!track) return;
    this.currentIndex = index;
    try {
      if (this.player?.element?.tagName === "VIDEO") {
        if (track.poster) {
          const resolved = typeof this.player.resolvePosterPath === "function" ? this.player.resolvePosterPath(track.poster) : track.poster;
          const posterUrl = sanitizePosterUrl(resolved);
          if (posterUrl) {
            this.player.element.poster = posterUrl;
            this.player.applyPosterAspectRatio?.(posterUrl);
          } else {
            this.player.element.removeAttribute("poster");
          }
        } else {
          this.player.element.removeAttribute("poster");
        }
      }
      this.player.audioDescriptionSrc = track.audioDescriptionSrc || null;
      this.player.signLanguageSrc = track.signLanguageSrc || null;
      this.player.signLanguageSources = track.signLanguageSources || {};
      this.player.options.signLanguageSrc = track.signLanguageSrc || null;
      this.player.options.signLanguageSources = track.signLanguageSources || {};
      if (track.duration && Number(track.duration) > 0) {
        this.player.state.duration = Number(track.duration);
      }
      if (this.player.audioDescriptionManager) {
        this.player.audioDescriptionManager.src = track.audioDescriptionSrc || null;
        this.player.audioDescriptionManager.originalSource = track.src || this.player.originalSrc || null;
      }
      if (this.player.signLanguageManager) {
        this.player.signLanguageManager.src = track.signLanguageSrc || null;
        this.player.signLanguageManager.sources = track.signLanguageSources || {};
        this.player.signLanguageManager.currentLanguage = null;
      }
      if (track.src && !this.player.originalSrc) {
        this.player.originalSrc = track.src;
      }
      const existing = Array.from(this.player.element.querySelectorAll("track"));
      existing.forEach((t) => t.remove());
      if (Array.isArray(track.tracks)) {
        track.tracks.forEach((tc) => {
          if (!tc?.src) return;
          const el = document.createElement("track");
          el.src = tc.src;
          el.kind = tc.kind || "captions";
          el.srclang = tc.srclang || "en";
          el.label = tc.label || tc.srclang || "Track";
          if (tc.default) el.default = true;
          if (tc.describedSrc) {
            el.setAttribute("data-desc-src", tc.describedSrc);
          }
          this.player.element.appendChild(el);
        });
      }
      if (typeof this.player.invalidateTrackCache === "function") {
        this.player.invalidateTrackCache();
      }
      const reinitAudioDescription = (adm) => {
        if (!adm || typeof adm.initFromSourceElements !== "function") return;
        try {
          adm.captionTracks = [];
          adm.initFromSourceElements(this.player.sourceElements, this.player.trackElements);
        } catch {
        }
      };
      if (this.player.audioDescriptionManager) {
        reinitAudioDescription(this.player.audioDescriptionManager);
      } else if (this.player.hasAudioDescriptionContent?.()) {
        void this.player.ensureAudioDescriptionManager().then(reinitAudioDescription).catch(() => {
        });
      }
      if (this.player.captionManager && typeof this.player.captionManager.loadTracks === "function") {
        try {
          this.player.captionManager.tracks = [];
          this.player.captionManager.currentTrack = null;
          this.player.captionManager.loadTracks();
        } catch {
        }
      }
      if (typeof this.player.updateControlBar === "function") {
        this.player.updateControlBar();
      }
    } catch {
    }
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    this.refreshDownloadButton();
    this.player.emit("playlisttrackselect", {
      index,
      item: track,
      total: this.tracks.length
    });
  }
  /**
   * Play a specific track
   * @param {number} index - Track index
   * @param {boolean} userInitiated - Whether this was triggered by user action (default: false)
   */
  async play(index, _userInitiated = false) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn("VidPly Playlist: Invalid track index", index);
      return;
    }
    const track = this.tracks[index];
    if (!track) return;
    this.isChangingTrack = true;
    this.currentIndex = index;
    if (this.options.recreatePlayers && this.hostElement && this.PlayerClass) {
      const currentMediaType = this.player ? this.player.element.tagName === "AUDIO" ? "audio" : "video" : null;
      const newMediaType = this.getTrackMediaType(track);
      const newElementType = newMediaType === "audio" || newMediaType === "soundcloud" ? "audio" : "video";
      if (currentMediaType !== newElementType) {
        await this.recreatePlayerForTrack(track, true);
        this.updateTrackInfo(track);
        this.updatePlaylistUI();
        this.refreshDownloadButton();
        this.player.emit("playlisttrackchange", {
          index,
          item: track,
          total: this.tracks.length
        });
        this.setManagedTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    let srcToLoad = track.src;
    if (this.player?.audioDescriptionManager?.desiredState && track.audioDescriptionSrc) {
      this.player.originalSrc = track.src ?? null;
      this.player.audioDescriptionManager.originalSource = track.src ?? null;
      this.player.audioDescriptionManager.src = track.audioDescriptionSrc;
      srcToLoad = track.audioDescriptionSrc;
    }
    try {
      await this.player.load({
        src: srcToLoad ?? "",
        type: track.type,
        poster: track.poster,
        tracks: track.tracks || [],
        audioDescriptionSrc: track.audioDescriptionSrc || null,
        signLanguageSrc: track.signLanguageSrc || null,
        signLanguageSources: track.signLanguageSources || {}
      });
    } catch {
      this.isChangingTrack = false;
      return;
    }
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    this.refreshDownloadButton();
    this.player.emit("playlisttrackchange", {
      index,
      item: track,
      total: this.tracks.length
    });
    this.player.play();
    this.setManagedTimeout(() => {
      this.isChangingTrack = false;
    }, 50);
  }
  /**
   * Play next track
   */
  next() {
    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.tracks.length) {
      if (this.options.loop) {
        nextIndex = 0;
      } else {
        return;
      }
    }
    this.play(nextIndex);
  }
  /**
   * Play previous track
   */
  previous() {
    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      if (this.options.loop) {
        prevIndex = this.tracks.length - 1;
      } else {
        return;
      }
    }
    this.play(prevIndex);
  }
  /**
   * Handle track end
   */
  handleTrackEnd() {
    if (this.isChangingTrack) {
      return;
    }
    if (this.options.autoAdvance) {
      this.next();
    }
  }
  /**
   * Check if a source URL requires an external renderer
   * @param {string} src - Source URL
   * @returns {boolean}
   */
  isExternalRendererUrl(src) {
    if (!src) return false;
    return src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com") || src.includes("soundcloud.com") || src.includes("api.soundcloud.com") || src.includes(".m3u8") || src.includes(".mpd");
  }
  /**
   * Handle track error
   */
  handleTrackError(e) {
    const currentTrack = this.getCurrentTrack();
    if (currentTrack && currentTrack.src && this.isExternalRendererUrl(currentTrack.src)) {
      return;
    }
    if (this.isChangingTrack) {
      return;
    }
    console.error("VidPly Playlist: Track error", e);
    if (this.options.autoAdvance) {
      this.setManagedTimeout(() => {
        this.next();
      }, 1e3);
    }
  }
  /**
   * Handle playback state changes (for fullscreen playlist visibility)
   */
  handlePlaybackStateChange() {
    this.updatePlaylistVisibilityInFullscreen();
  }
  /**
   * Handle fullscreen state changes
   */
  handleFullscreenChange() {
    this.setManagedTimeout(() => {
      this.updatePlaylistVisibilityInFullscreen();
    }, 50);
  }
  /**
   * Handle audio description state changes
   * Updates duration displays to show audio-described version duration when AD is enabled
   */
  handleAudioDescriptionChange() {
    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;
    this.updateTrackInfo(currentTrack);
    this.updatePlaylistUI();
    this.updatePlaylistDurations();
  }
  /**
   * Update the visual duration displays in the playlist panel
   * Called when audio description state changes
   */
  updatePlaylistDurations() {
    if (!this.playlistPanel) return;
    const items = this.playlistPanel.querySelectorAll(".vidply-playlist-item");
    items.forEach((item, index) => {
      const track = this.tracks[index];
      if (!track) return;
      const effectiveDuration = this.getEffectiveDuration(track);
      const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : "";
      const durationBadge = item.querySelector(".vidply-playlist-duration-badge");
      if (durationBadge) {
        durationBadge.textContent = trackDuration;
      }
      const inlineDuration = item.querySelector(".vidply-playlist-item-duration");
      if (inlineDuration) {
        inlineDuration.textContent = trackDuration;
      }
    });
  }
  /**
   * Get the effective duration for a track based on audio description state
   * @param {Object} track - Track object
   * @returns {number|null} - Duration in seconds or null if not available
   */
  getEffectiveDuration(track) {
    if (!track) return null;
    const isAudioDescriptionEnabled = this.player.state.audioDescriptionEnabled;
    if (isAudioDescriptionEnabled && track.audioDescriptionDuration) {
      return track.audioDescriptionDuration;
    }
    return track.duration || null;
  }
  /**
   * Update playlist visibility based on fullscreen and playback state
   * In fullscreen: show when paused/not started, hide when playing
   * Outside fullscreen: respect original panel visibility setting
   */
  updatePlaylistVisibilityInFullscreen() {
    const playlistPanel = this.playlistPanel;
    if (!playlistPanel || !this.tracks.length) return;
    const isFullscreen = this.player.state.fullscreen;
    const isPlaying = this.player.state.playing;
    if (isFullscreen) {
      if (!isPlaying) {
        playlistPanel.classList.add("vidply-playlist-fullscreen-visible");
        playlistPanel.style.display = "block";
      } else {
        playlistPanel.classList.remove("vidply-playlist-fullscreen-visible");
        this.setManagedTimeout(() => {
          if (this.player.state.playing && this.player.state.fullscreen) {
            playlistPanel.style.display = "none";
          }
        }, 300);
      }
    } else {
      playlistPanel.classList.remove("vidply-playlist-fullscreen-visible");
      if (this.isPanelVisible && this.tracks.length > 0) {
        playlistPanel.style.display = "block";
      } else {
        playlistPanel.style.display = "none";
      }
    }
  }
  /**
   * Create playlist UI
   */
  createUI() {
    this.container = this.player.container;
    if (!this.container) {
      console.warn("VidPly Playlist: No container found");
      return;
    }
    this.trackInfoView = new TrackInfoView(this.player.options.classPrefix);
    this.trackInfoView.mount(this.container);
    this.navigationFeedback = DOMUtils.createElement("div", {
      className: "vidply-sr-only",
      attributes: {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true"
      }
    });
    this.container.appendChild(this.navigationFeedback);
    this.playlistPanel = DOMUtils.createElement("div", {
      className: "vidply-playlist-panel",
      attributes: {
        id: `${this.uniqueId}-panel`,
        role: "region",
        "aria-label": i18n.t("playlist.title"),
        "aria-labelledby": `${this.uniqueId}-heading`
      }
    });
    this.playlistPanel.style.display = this.isPanelVisible ? "none" : "none";
    this.container.appendChild(this.playlistPanel);
    this.applyPanelPositionClass();
  }
  /**
   * Update track info display
   */
  updateTrackInfo(track) {
    if (this.trackInfoView) {
      const effectiveDuration = this.getEffectiveDuration(track);
      const data = {
        title: track.title,
        artist: track.artist,
        description: track.description,
        longDescription: typeof track.longDescription === "string" ? track.longDescription : void 0,
        date: typeof track.date === "string" ? track.date : void 0,
        duration: effectiveDuration ? Number(effectiveDuration) : void 0,
        trackNumber: this.currentIndex + 1,
        totalTracks: this.tracks.length
      };
      this.trackInfoView.render(data);
    }
    this.updateTrackArtwork(track);
    this.syncRightPanelMediaStyles();
  }
  /**
   * Resolve a track poster for CSS/artwork (absolute URL + allow-list).
   */
  resolveTrackPosterForArtwork(poster) {
    if (!poster) {
      return null;
    }
    const resolved = typeof this.player?.resolvePosterPath === "function" ? this.player.resolvePosterPath(poster) : poster;
    return toCssBackgroundImage(resolved);
  }
  /**
   * Locate an existing artwork node in the current player tree.
   */
  findExistingTrackArtworkElement() {
    const candidates = [
      this.player?.trackArtworkElement ?? null,
      this.playlistMainElement,
      this.container,
      this.hostElement
    ];
    for (const root of candidates) {
      if (!root) {
        continue;
      }
      if (root.classList.contains("vidply-track-artwork")) {
        return root;
      }
      const nested = root.querySelector(".vidply-track-artwork");
      if (nested instanceof HTMLElement) {
        return nested;
      }
    }
    return null;
  }
  /**
   * Keep a single artwork node — Player init and PlaylistManager can both create one.
   */
  dedupeTrackArtworkElements(keep) {
    const roots = [this.playlistMainElement, this.container, this.hostElement].filter(
      (root) => root instanceof HTMLElement
    );
    roots.forEach((root) => {
      root.querySelectorAll(".vidply-track-artwork").forEach((el) => {
        if (el !== keep) {
          el.remove();
        }
      });
    });
    if (this.player) {
      this.player.trackArtworkElement = keep;
    }
  }
  /**
   * Re-apply artwork after player recreation and right-panel layout settle.
   */
  finalizeTrackArtworkForTrack(track) {
    this.updateTrackArtwork(track);
    requestAnimationFrame(() => {
      this.updateTrackArtwork(track);
    });
  }
  /**
   * Whether a playlist track uses an external embed renderer (not local HTML5 media).
   */
  isExternalEmbedTrack(track) {
    const mediaType = this.getTrackMediaType(track);
    return mediaType === "youtube" || mediaType === "vimeo" || mediaType === "soundcloud";
  }
  /**
   * Hide every track-artwork node in the current playlist layout.
   */
  hideTrackArtworkElements(clearBackground = false) {
    const roots = [this.playlistMainElement, this.container, this.hostElement].filter(
      (root) => root instanceof HTMLElement
    );
    roots.forEach((root) => {
      root.querySelectorAll(".vidply-track-artwork").forEach((el) => {
        if (!(el instanceof HTMLElement)) {
          return;
        }
        if (clearBackground) {
          el.style.backgroundImage = "";
        }
        el.style.display = "none";
      });
    });
    if (this.trackArtworkElement) {
      if (clearBackground) {
        this.trackArtworkElement.style.backgroundImage = "";
      }
      this.trackArtworkElement.style.display = "none";
    }
  }
  /**
   * Update track artwork display (for audio playlists)
   */
  updateTrackArtwork(track) {
    if (this.isExternalEmbedTrack(track)) {
      this.hideTrackArtworkElements(true);
      return;
    }
    const forcedHidden = this.trackArtworkElement?.getAttribute("data-vidply-artwork-forced-hidden") === "true" || this.container?.querySelector('.vidply-track-artwork[data-vidply-artwork-forced-hidden="true"]') instanceof HTMLElement || this.playlistMainElement?.querySelector('.vidply-track-artwork[data-vidply-artwork-forced-hidden="true"]') instanceof HTMLElement;
    if (forcedHidden) {
      return;
    }
    if (this.player?.element?.tagName !== "AUDIO") {
      this.hideTrackArtworkElements();
      return;
    }
    if (!this.trackArtworkElement) {
      const existing = this.findExistingTrackArtworkElement();
      if (existing) {
        this.trackArtworkElement = existing;
      }
    }
    if (!this.trackArtworkElement && this.container) {
      this.trackArtworkElement = DOMUtils.createElement("div", {
        className: "vidply-track-artwork",
        attributes: {
          "aria-hidden": "true"
        }
      });
      this.trackArtworkElement.style.display = "none";
      this.insertBeforeVideoWrapper(this.trackArtworkElement);
    }
    if (!this.trackArtworkElement) return;
    this.dedupeTrackArtworkElements(this.trackArtworkElement);
    const safeBackground = this.resolveTrackPosterForArtwork(track.poster);
    if (safeBackground) {
      this.trackArtworkElement.style.backgroundImage = safeBackground;
      this.trackArtworkElement.removeAttribute("data-vidply-hidden");
      this.trackArtworkElement.style.removeProperty("display");
      this.trackArtworkElement.style.display = "block";
      this.insertBeforeVideoWrapper(this.trackArtworkElement);
      this.player?.mountPlayButtonOverlay(this.trackArtworkElement);
    } else {
      this.trackArtworkElement.style.backgroundImage = "";
      this.trackArtworkElement.style.display = "none";
    }
  }
  /**
   * Render playlist
   */
  renderPlaylist() {
    if (!this.playlistPanel) return;
    this.playlistPanel.innerHTML = "";
    const header = DOMUtils.createElement("h2", {
      className: "vidply-playlist-header",
      attributes: {
        id: `${this.uniqueId}-heading`
      }
    });
    header.textContent = `${i18n.t("playlist.title")} (${this.tracks.length})`;
    this.playlistPanel.appendChild(header);
    const instructions = DOMUtils.createElement("div", {
      className: "vidply-sr-only",
      attributes: {
        id: `${this.uniqueId}-keyboard-instructions`
      }
    });
    instructions.textContent = i18n.t("playlist.keyboardInstructions");
    this.playlistPanel.appendChild(instructions);
    const list = DOMUtils.createElement("ul", {
      className: "vidply-playlist-list",
      attributes: {
        role: "listbox",
        "aria-labelledby": `${this.uniqueId}-heading`,
        "aria-describedby": `${this.uniqueId}-keyboard-instructions`
      }
    });
    this.tracks.forEach((track, index) => {
      const item = this.createPlaylistItem(track, index);
      list.appendChild(item);
    });
    this.playlistPanel.appendChild(list);
    if (this.isPanelVisible) {
      this.playlistPanel.style.display = "block";
    }
    this.syncPanelCollapsedLayout();
  }
  /**
   * Create playlist item element
   */
  createPlaylistItem(track, index) {
    const trackTitle = track.title || i18n.t("playlist.trackUntitled", { number: index + 1 });
    const trackArtist = track.artist ? i18n.t("playlist.by") + track.artist : "";
    const effectiveDuration = this.getEffectiveDuration(track);
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : "";
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : "";
    const isActive = index === this.currentIndex;
    const trackDate = typeof track.date === "string" ? track.date : "";
    let ariaLabel = `${trackTitle}${trackArtist}`;
    if (trackDate) {
      ariaLabel += `. ${trackDate}`;
    }
    if (trackDurationReadable) {
      ariaLabel += `. ${trackDurationReadable}`;
    }
    const item = DOMUtils.createElement("li", {
      className: isActive ? "vidply-playlist-item vidply-playlist-item-active" : "vidply-playlist-item",
      attributes: {
        "data-playlist-index": String(index),
        role: "none"
      }
    });
    const button = DOMUtils.createElement("button", {
      className: "vidply-playlist-item-button",
      attributes: {
        type: "button",
        role: "option",
        tabIndex: index === 0 ? "0" : "-1",
        "aria-label": ariaLabel,
        "aria-posinset": String(index + 1),
        "aria-setsize": String(this.tracks.length),
        "aria-selected": isActive ? "true" : "false"
      }
    });
    if (isActive) {
      button.setAttribute("aria-current", "true");
      button.setAttribute("tabIndex", "0");
    }
    const thumbnailContainer = DOMUtils.createElement("span", {
      className: "vidply-playlist-thumbnail-container",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const thumbnail = DOMUtils.createElement("span", {
      className: "vidply-playlist-thumbnail"
    });
    const safeThumbnail = track.poster ? toCssBackgroundImage(track.poster) : null;
    if (safeThumbnail) {
      thumbnail.style.backgroundImage = safeThumbnail;
    } else {
      const icon = createIconElement("music");
      icon.classList.add("vidply-playlist-thumbnail-icon");
      thumbnail.appendChild(icon);
    }
    thumbnailContainer.appendChild(thumbnail);
    if (trackDuration && track.poster) {
      const durationBadge = DOMUtils.createElement("span", {
        className: "vidply-playlist-duration-badge"
      });
      durationBadge.textContent = trackDuration;
      thumbnailContainer.appendChild(durationBadge);
    }
    button.appendChild(thumbnailContainer);
    const info = DOMUtils.createElement("span", {
      className: "vidply-playlist-item-info",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const titleRow = DOMUtils.createElement("span", {
      className: "vidply-playlist-item-title-row"
    });
    const title = DOMUtils.createElement("span", {
      className: "vidply-playlist-item-title"
    });
    title.textContent = trackTitle;
    titleRow.appendChild(title);
    if (trackDuration && !track.poster) {
      const inlineDuration = DOMUtils.createElement("span", {
        className: "vidply-playlist-item-duration"
      });
      inlineDuration.textContent = trackDuration;
      titleRow.appendChild(inlineDuration);
    }
    info.appendChild(titleRow);
    if (track.artist) {
      const artist = DOMUtils.createElement("span", {
        className: "vidply-playlist-item-artist"
      });
      artist.textContent = track.artist;
      info.appendChild(artist);
    }
    if (trackDate) {
      const date = DOMUtils.createElement("span", {
        className: "vidply-playlist-item-date"
      });
      date.textContent = trackDate;
      info.appendChild(date);
    }
    if (track.description) {
      const description = DOMUtils.createElement("span", {
        className: "vidply-playlist-item-description"
      });
      description.textContent = track.description;
      info.appendChild(description);
    }
    button.appendChild(info);
    const playIcon = createIconElement("play");
    playIcon.classList.add("vidply-playlist-item-icon");
    playIcon.setAttribute("aria-hidden", "true");
    button.appendChild(playIcon);
    button.addEventListener("click", () => {
      const track2 = this.tracks[index];
      const isExternalRenderer = this.isExternalRendererUrl(track2?.src);
      if (isExternalRenderer && this.player.state.fullscreen) {
        this.player.exitFullscreen();
        this.setManagedTimeout(() => {
          this.play(index, true);
        }, 100);
      } else {
        this.play(index, true);
      }
    });
    button.addEventListener("keydown", (e) => {
      this.handlePlaylistItemKeydown(e, index);
    });
    item.appendChild(button);
    return item;
  }
  /**
   * Handle keyboard navigation in playlist items
   */
  handlePlaylistItemKeydown(e, index) {
    if (!this.playlistPanel) return;
    const buttons = Array.from(this.playlistPanel.querySelectorAll(".vidply-playlist-item-button"));
    let newIndex = -1;
    let announcement = "";
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        e.stopPropagation();
        {
          const track = this.tracks[index];
          const isExternalRenderer = this.isExternalRendererUrl(track?.src);
          if (isExternalRenderer && this.player.state.fullscreen) {
            this.player.exitFullscreen();
            this.setManagedTimeout(() => {
              this.play(index, true);
            }, 100);
          } else {
            this.play(index, true);
          }
        }
        return;
      // No need to move focus
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        if (index < buttons.length - 1) {
          newIndex = index + 1;
        } else {
          announcement = i18n.t("playlist.endOfPlaylist", { current: buttons.length, total: buttons.length });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        if (index > 0) {
          newIndex = index - 1;
        } else {
          announcement = i18n.t("playlist.beginningOfPlaylist", { total: buttons.length });
        }
        break;
      case "PageDown":
        e.preventDefault();
        e.stopPropagation();
        newIndex = Math.min(index + 5, buttons.length - 1);
        if (newIndex === buttons.length - 1 && index !== newIndex) {
          announcement = i18n.t("playlist.jumpedToLastTrack", { current: newIndex + 1, total: buttons.length });
        }
        break;
      case "PageUp":
        e.preventDefault();
        e.stopPropagation();
        newIndex = Math.max(index - 5, 0);
        if (newIndex === 0 && index !== newIndex) {
          announcement = i18n.t("playlist.jumpedToFirstTrack", { total: buttons.length });
        }
        break;
      case "Home":
        e.preventDefault();
        e.stopPropagation();
        newIndex = 0;
        if (index !== 0) {
          announcement = i18n.t("playlist.firstTrack", { total: buttons.length });
        }
        break;
      case "End":
        e.preventDefault();
        e.stopPropagation();
        newIndex = buttons.length - 1;
        if (index !== buttons.length - 1) {
          announcement = i18n.t("playlist.lastTrack", { current: buttons.length, total: buttons.length });
        }
        break;
    }
    if (newIndex !== -1 && newIndex !== index) {
      const currentButton = buttons[index];
      const newButton = buttons[newIndex];
      if (currentButton && newButton) {
        currentButton.setAttribute("tabIndex", "-1");
        newButton.setAttribute("tabIndex", "0");
        newButton.focus({ preventScroll: false });
        const item = newButton.closest(".vidply-playlist-item");
        if (item) {
          item.scrollIntoView(reducedMotionScrollOptions("nearest"));
        }
      }
    }
    if (announcement && this.navigationFeedback) {
      this.navigationFeedback.textContent = announcement;
      this.setManagedTimeout(() => {
        if (this.navigationFeedback) {
          this.navigationFeedback.textContent = "";
        }
      }, 1e3);
    }
  }
  /**
   * Update playlist UI (highlight current track)
   */
  updatePlaylistUI() {
    if (!this.playlistPanel) return;
    const items = this.playlistPanel.querySelectorAll(".vidply-playlist-item");
    const buttons = this.playlistPanel.querySelectorAll(".vidply-playlist-item-button");
    items.forEach((item, index) => {
      const button = buttons[index];
      if (!button) return;
      const track = this.tracks[index];
      if (!track) return;
      const trackTitle = track.title || i18n.t("playlist.trackUntitled", { number: index + 1 });
      const trackArtist = track.artist ? i18n.t("playlist.by") + track.artist : "";
      const effectiveDuration = this.getEffectiveDuration(track);
      const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : "";
      if (index === this.currentIndex) {
        item.classList.add("vidply-playlist-item-active");
        button.setAttribute("aria-current", "true");
        button.setAttribute("aria-selected", "true");
        button.setAttribute("tabIndex", "0");
        let ariaLabel = `${trackTitle}${trackArtist}`;
        if (trackDurationReadable) {
          ariaLabel += `. ${trackDurationReadable}`;
        }
        button.setAttribute("aria-label", ariaLabel);
        item.scrollIntoView(reducedMotionScrollOptions("nearest"));
      } else {
        item.classList.remove("vidply-playlist-item-active");
        button.removeAttribute("aria-current");
        button.setAttribute("aria-selected", "false");
        button.setAttribute("tabIndex", "-1");
        let ariaLabel = `${trackTitle}${trackArtist}`;
        if (trackDurationReadable) {
          ariaLabel += `. ${trackDurationReadable}`;
        }
        button.setAttribute("aria-label", ariaLabel);
      }
    });
  }
  /**
   * Get current track
   */
  getCurrentTrack() {
    return this.tracks[this.currentIndex] || null;
  }
  /**
   * Get playlist info
   */
  getPlaylistInfo() {
    return {
      currentIndex: this.currentIndex,
      totalTracks: this.tracks.length,
      currentTrack: this.getCurrentTrack(),
      hasNext: this.hasNext(),
      hasPrevious: this.hasPrevious()
    };
  }
  /**
   * Check if there is a next track
   */
  hasNext() {
    if (this.options.loop) return true;
    return this.currentIndex < this.tracks.length - 1;
  }
  /**
   * Check if there is a previous track
   */
  hasPrevious() {
    if (this.options.loop) return true;
    return this.currentIndex > 0;
  }
  /**
   * Add track to playlist
   */
  addTrack(track) {
    this.tracks.push(track);
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  /**
   * Remove track from playlist
   */
  removeTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.tracks.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      if (this.currentIndex >= this.tracks.length) {
        this.currentIndex = this.tracks.length - 1;
      }
      if (this.currentIndex >= 0) {
        this.play(this.currentIndex);
      }
    }
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  /**
   * Clear playlist
   */
  clear() {
    this.tracks = [];
    this.currentIndex = -1;
    if (this.playlistPanel) {
      this.playlistPanel.innerHTML = "";
      this.playlistPanel.style.display = "none";
    }
    if (this.trackInfoView) {
      this.trackInfoView.hide();
    }
    if (this.trackArtworkElement) {
      this.trackArtworkElement.style.backgroundImage = "";
      this.trackArtworkElement.style.display = "none";
    }
  }
  /**
   * Sync grid layout when the in-player playlist panel is toggled in the
   * right-column desktop layout (full width when collapsed).
   */
  syncPanelCollapsedLayout() {
    if (!this.container) {
      return;
    }
    const isRightDesktop = this.options.panelPosition === "right" && isPlaylistPanelRightDesktopViewport();
    this.container.classList.toggle(
      "vidply-playlist-panel-collapsed",
      isRightDesktop && !this.isPanelVisible
    );
    requestAnimationFrame(() => {
      this.player.controlBar?.checkOverflow();
      this.player.positionPlayOverlayOnMobile();
    });
  }
  /**
   * Toggle playlist panel visibility
   * @param {boolean} show - Optional: force show (true) or hide (false)
   * @returns {boolean} - New visibility state
   */
  togglePanel(show) {
    const playlistPanel = this.playlistPanel;
    if (!playlistPanel) return false;
    const shouldShow = show !== void 0 ? show : playlistPanel.style.display === "none";
    if (shouldShow) {
      playlistPanel.style.display = "block";
      this.isPanelVisible = true;
      if (this.tracks.length > 0) {
        this.setManagedTimeout(() => {
          const firstItem = playlistPanel.querySelector('.vidply-playlist-item[tabindex="0"]');
          if (firstItem) {
            firstItem.focus({ preventScroll: true });
          }
        }, 100);
      }
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute("aria-expanded", "true");
        this.player.controlBar.controls.playlistToggle.setAttribute("aria-pressed", "true");
      }
    } else {
      playlistPanel.style.display = "none";
      this.isPanelVisible = false;
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute("aria-expanded", "false");
        this.player.controlBar.controls.playlistToggle.setAttribute("aria-pressed", "false");
        this.player.controlBar.controls.playlistToggle.focus({ preventScroll: true });
      }
    }
    this.syncPanelCollapsedLayout();
    return this.isPanelVisible;
  }
  /**
   * Show playlist panel
   */
  showPanel() {
    return this.togglePanel(true);
  }
  /**
   * Hide playlist panel
   */
  hidePanel() {
    return this.togglePanel(false);
  }
  /**
   * Destroy playlist manager
   */
  /**
   * setTimeout wrapper that tracks the handle so destroy() can cancel any
   * still-pending callback. Nested deferred work should also route through
   * this so it can't fire after teardown.
   */
  setManagedTimeout(callback, delay) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      callback();
    }, delay);
    this._timers.add(id);
    return id;
  }
  destroy() {
    this._timers.forEach((id) => clearTimeout(id));
    this._timers.clear();
    this.player.off("ended", this.handleTrackEnd);
    this.player.off("error", this.handleTrackError);
    this.player.off("play", this.handlePlaybackStateChange);
    this.player.off("pause", this.handlePlaybackStateChange);
    this.player.off("ended", this.handlePlaybackStateChange);
    this.player.off("fullscreenchange", this.handleFullscreenChange);
    this.player.off("audiodescriptionenabled", this.handleAudioDescriptionChange);
    this.player.off("audiodescriptiondisabled", this.handleAudioDescriptionChange);
    if (this.trackArtworkElement) {
      this.trackArtworkElement.remove();
    }
    if (this.trackInfoView) {
      this.trackInfoView.destroy();
      this.trackInfoView = null;
    }
    this.teardownPlaylistMainLayout();
    if (this.playlistPanel) {
      this.playlistPanel.remove();
    }
    if (this.container) {
      this.container.classList.remove("vidply-has-playlist", "vidply-playlist-panel-right");
    }
    this.clear();
  }
};

// src/index.ts
function sanitizeOptionsObject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const out = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(input)) {
    if (isForbiddenKey(key)) continue;
    out[key] = value;
  }
  return out;
}
function parseInlineOptions(element) {
  const raw = element.dataset.vidplyOptions;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return sanitizeOptionsObject(parsed);
  } catch (err) {
    console.warn("[VidPly] Ignored malformed data-vidply-options:", err);
    return {};
  }
}
function initializePlayers() {
  const elements = document.querySelectorAll("[data-vidply]");
  elements.forEach((element) => {
    const options = parseInlineOptions(element);
    const dataOptions = parseDataAttributes(element.dataset);
    const mergedOptions = { ...dataOptions, ...options };
    const lazyInit = element.dataset.vidplyLazy !== "false" && mergedOptions.lazyInit !== false;
    const lazyMargin = element.dataset.vidplyLazyMargin || mergedOptions.lazyMargin || "500px";
    if (lazyInit && "IntersectionObserver" in window) {
      observeForLazyInit(
        element,
        mergedOptions,
        lazyMargin,
        (target, opts) => {
          new Player(target, opts);
        }
      );
    } else {
      new Player(element, mergedOptions);
    }
  });
}
function parseDataAttributes(dataset) {
  const options = /* @__PURE__ */ Object.create(null);
  const attributeMap = {
    signLanguageSrc: "signLanguageSrc",
    signLanguageButton: "signLanguageButton",
    signLanguagePosition: "signLanguagePosition",
    signLanguageDisplayMode: "signLanguageDisplayMode",
    audioDescriptionSrc: "audioDescriptionSrc",
    audioDescriptionButton: "audioDescriptionButton",
    audioDescriptionMode: "audioDescriptionMode",
    audioDescriptionSpeech: "audioDescriptionSpeech",
    audioDescriptionExtended: "audioDescriptionExtended",
    autoplay: "autoplay",
    loop: "loop",
    muted: "muted",
    controls: "controls",
    poster: "poster",
    width: "width",
    height: "height",
    language: "language",
    captions: "captions",
    captionsDefault: "captionsDefault",
    transcript: "transcript",
    transcriptButton: "transcriptButton",
    keyboard: "keyboard",
    responsive: "responsive",
    pipButton: "pipButton",
    fullscreenButton: "fullscreenButton",
    floating: "floating",
    floatingPosition: "floatingPosition",
    floatingMinViewportWidth: "floatingMinViewportWidth",
    lazyInit: "lazyInit",
    lazyMargin: "lazyMargin",
    theme: "theme"
  };
  for (const [dataKey, optionKey] of Object.entries(attributeMap)) {
    if (isForbiddenKey(optionKey)) continue;
    const value = dataset[dataKey];
    if (value === void 0) continue;
    if (value === "true") {
      options[optionKey] = true;
    } else if (value === "false") {
      options[optionKey] = false;
    } else if (value !== "" && !Number.isNaN(Number(value))) {
      options[optionKey] = Number(value);
    } else {
      options[optionKey] = value;
    }
  }
  const signLanguageSources = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(dataset)) {
    if (key.startsWith("signLanguageSrc") && key !== "signLanguageSrc") {
      const langMatch = key.match(/^signLanguageSrc([A-Z][a-z]*)$/);
      if (langMatch && langMatch[1]) {
        const langCode = langMatch[1].toLowerCase();
        const value = dataset[key];
        if (value !== void 0) {
          signLanguageSources[langCode] = value;
        }
      }
    }
  }
  if (Object.keys(signLanguageSources).length > 0) {
    options.signLanguageSources = signLanguageSources;
    if (dataset.signLanguageSrc && !options.signLanguageSrc) {
      options.signLanguageSrc = dataset.signLanguageSrc;
    }
  }
  if (dataset.vidplyLanguageFiles) {
    try {
      const parsed = JSON.parse(dataset.vidplyLanguageFiles);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        options.languageFiles = sanitizeOptionsObject(parsed);
      }
    } catch (e) {
      console.warn("Invalid JSON in data-vidply-language-files:", e);
    }
  }
  if (dataset.vidplyLanguageFile) {
    try {
      const parsed = JSON.parse(dataset.vidplyLanguageFile);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        options.languageFiles = sanitizeOptionsObject(parsed);
      }
    } catch {
      if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
        options.languageFile = dataset.vidplyLanguageFileCode;
        options.languageFileUrl = dataset.vidplyLanguageFileUrl;
      }
    }
  } else if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
    options.languageFile = dataset.vidplyLanguageFileCode;
    options.languageFileUrl = dataset.vidplyLanguageFileUrl;
  }
  return options;
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePlayers);
} else {
  initializePlayers();
}
var index_default = Player;
export {
  Player,
  PlaylistManager,
  index_default as default
};
//# sourceMappingURL=vidply.esm.js.map
