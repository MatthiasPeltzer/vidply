/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  HTML5Renderer
} from "./vidply.chunk-6A7APLCL.js";
import {
  DOMUtils,
  DraggableResizable,
  StorageManager,
  TimeUtils,
  attachMenuKeyboardNavigation,
  createIconElement,
  createLabeledSelect,
  createMenuItem,
  createPlayOverlay,
  focusElement,
  focusFirstElement,
  focusFirstMenuItem,
  i18n,
  preventDragOnElement
} from "./vidply.chunk-LD3OELXW.js";

// src/utils/EventEmitter.js
var EventEmitter = class {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }
  once(event, listener) {
    const onceListener = (...args) => {
      listener(...args);
      this.off(event, onceListener);
    };
    return this.on(event, onceListener);
  }
  off(event, listener) {
    if (!this.events[event]) return this;
    if (!listener) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    }
    return this;
  }
  emit(event, ...args) {
    if (!this.events[event]) return this;
    this.events[event].forEach((listener) => {
      listener(...args);
    });
    return this;
  }
  removeAllListeners() {
    this.events = {};
    return this;
  }
};

// src/utils/PerformanceUtils.js
function debounce(func, wait = 100) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
function isMobile(breakpoint = 768) {
  return window.innerWidth < breakpoint;
}
function rafWithTimeout(callback, timeout = 100) {
  let called = false;
  const execute = () => {
    if (!called) {
      called = true;
      callback();
    }
  };
  requestAnimationFrame(execute);
  setTimeout(execute, timeout);
}

// src/utils/VideoFrameCapture.js
async function captureVideoFrame(video, time, options = {}) {
  if (!video || video.tagName !== "VIDEO") {
    return null;
  }
  const {
    restoreState = true,
    quality = 0.9,
    maxWidth,
    maxHeight
  } = options;
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
        ctx.drawImage(video, 0, 0, width, height);
        const dataURL = canvas.toDataURL("image/jpeg", quality);
        if (restoreState) {
          video.currentTime = originalTime;
          video.muted = originalMuted;
          if (wasPlaying && !video.paused) {
            video.play().catch(() => {
            });
          }
        }
        resolve(dataURL);
      } catch (error) {
        if (restoreState) {
          video.currentTime = originalTime;
          video.muted = originalMuted;
          if (wasPlaying && !video.paused) {
            video.play().catch(() => {
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

// src/controls/ControlBar.js
var ControlBar = class {
  constructor(player) {
    this.player = player;
    this.element = null;
    this.controls = {};
    this.hideTimeout = null;
    this.isDraggingProgress = false;
    this.isDraggingVolume = false;
    this.openMenu = null;
    this.openMenuButton = null;
    this.init();
  }
  init() {
    this.createElement();
    this.createControls();
    this.updateDuration();
    this.updateProgress();
    this.attachEvents();
    this.setupAutoHide();
    this.setupOverflowDetection();
  }
  // Helper method to detect touch devices
  isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  }
  // Smart menu positioning to avoid overflow
  positionMenu(menu, button, immediate = false) {
    const mobile = isMobile();
    const isOverflowMenu = menu.classList.contains(`${this.player.options.classPrefix}-overflow-menu-list`);
    const isFullscreen = this.player.state.fullscreen;
    if (isFullscreen && menu.parentElement === this.player.container) {
      const doFullscreenPositioning = () => {
        const buttonRect = button.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const containerRect = this.player.container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
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
          menu.style.right = `${containerRect.width - buttonRight}px`;
          menu.style.left = "auto";
          menu.style.transform = "none";
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
    const isFullscreen = this.player.state.fullscreen;
    if (isFullscreen) {
      this.player.container.appendChild(menu);
      menu.dataset.triggerButton = button.getAttribute("aria-label") || "button";
    } else {
      button.insertAdjacentElement("afterend", menu);
    }
  }
  // Helper method to attach close-on-outside-click behavior to menus
  attachMenuCloseHandler(menu, button, preventCloseOnInteraction = false) {
    if (this.openMenu && this.openMenu !== menu && this.openMenuButton) {
      if (this.openMenuButton._vidplyBlurHandler) {
        this.openMenuButton.removeEventListener("blur", this.openMenuButton._vidplyBlurHandler);
        delete this.openMenuButton._vidplyBlurHandler;
      }
      if (this.openMenuButton._vidplyMousedownHandler) {
        this.openMenuButton.removeEventListener("mousedown", this.openMenuButton._vidplyMousedownHandler);
        delete this.openMenuButton._vidplyMousedownHandler;
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
    button._vidplyMousedownHandler = handleButtonMousedown;
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
          const controlBarButtons = this.element.querySelectorAll("button");
          const isFocusOnAnotherButton = Array.from(controlBarButtons).includes(activeElement) && activeElement !== button;
          const isRelatedTargetAnotherButton = relatedTarget && Array.from(controlBarButtons).includes(relatedTarget) && relatedTarget !== button;
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
            delete button._vidplyBlurHandler;
            delete button._vidplyMousedownHandler;
          }
        }, 10);
      });
    };
    button.addEventListener("blur", handleButtonBlur);
    button._vidplyBlurHandler = handleButtonBlur;
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
      document.addEventListener("click", documentClickHandler);
      document.addEventListener("keydown", documentEscapeHandler);
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
    const menuItems = Array.from(menu.querySelectorAll(`.${this.player.options.classPrefix}-menu-item`));
    if (menuItems.length === 0) return;
    const handleKeyDown = (e) => {
      const currentIndex = menuItems.indexOf(document.activeElement);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          const nextIndex = (currentIndex + 1) % menuItems.length;
          menuItems[nextIndex].focus({ preventScroll: false });
          menuItems[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
          menuItems[prevIndex].focus({ preventScroll: false });
          menuItems[prevIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
          break;
        case "ArrowLeft":
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          break;
        case "Home":
          e.preventDefault();
          e.stopPropagation();
          menuItems[0].focus({ preventScroll: false });
          menuItems[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
          break;
        case "End":
          e.preventDefault();
          e.stopPropagation();
          menuItems[menuItems.length - 1].focus({ preventScroll: false });
          menuItems[menuItems.length - 1].scrollIntoView({ behavior: "smooth", block: "nearest" });
          break;
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
    const progressTimeWrapper = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-progress-time-wrapper`
    });
    if (this.player.options.progressBar) {
      this.createProgressBar();
      progressTimeWrapper.appendChild(this.controls.progress);
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
    if (this.player.playlistManager) {
      leftButtons.appendChild(this.createPreviousButton());
    }
    if (this.player.options.playPauseButton) {
      leftButtons.appendChild(this.createPlayPauseButton());
    }
    leftButtons.appendChild(this.createRestartButton());
    if (this.player.playlistManager) {
      leftButtons.appendChild(this.createNextButton());
    }
    if (!this.player.playlistManager) {
      leftButtons.appendChild(this.createRewindButton());
    }
    if (!this.player.playlistManager) {
      leftButtons.appendChild(this.createForwardButton());
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
    const isVideoElement = this.player.element?.tagName?.toLowerCase() === "video";
    const hideSpeedForThisPlayer = !!this.player.options.hideSpeedForHls && isHlsSource || !!this.player.options.hideSpeedForHlsVideo && isHlsSource && isVideoElement;
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
      const btn = this.createPlaylistToggleButton();
      btn.dataset.overflowPriority = "2";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
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
    if (this.player.options.pipButton && "pictureInPictureEnabled" in document) {
      const btn = this.createPipButton();
      btn.dataset.overflowPriority = "3";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    const isAudioPlayer = this.player.element.tagName.toLowerCase() === "audio";
    if (this.player.options.fullscreenButton && !isAudioPlayer) {
      const btn = this.createFullscreenButton();
      btn.dataset.overflowPriority = "1";
      btn.dataset.overflowPriorityMobile = "3";
      this.rightButtons.appendChild(btn);
    }
    this.overflowMenuButton = this.createOverflowMenuButton();
    this.overflowMenuButton.style.display = "none";
    this.rightButtons.appendChild(this.overflowMenuButton);
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
      if (textTracks[i].kind === "chapters") return true;
    }
    const trackEls = Array.from(this.player.element.querySelectorAll('track[kind="chapters"]'));
    if (trackEls.length > 0) return true;
    const current = this.player.playlistManager?.getCurrentTrack?.();
    if (current?.tracks && Array.isArray(current.tracks)) {
      return current.tracks.some((t) => t?.kind === "chapters");
    }
    return false;
  }
  hasCaptionTracks() {
    const textTracks = this.player.element.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
      if (textTracks[i].kind === "captions" || textTracks[i].kind === "subtitles") return true;
    }
    const trackEls = Array.from(this.player.element.querySelectorAll("track"));
    if (trackEls.some((el) => el.getAttribute("kind") === "captions" || el.getAttribute("kind") === "subtitles")) {
      return true;
    }
    const current = this.player.playlistManager?.getCurrentTrack?.();
    if (current?.tracks && Array.isArray(current.tracks)) {
      return current.tracks.some((t) => t?.kind === "captions" || t?.kind === "subtitles");
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
    const isVideo = this.player.element && this.player.element.tagName === "VIDEO";
    if (!isVideo) {
      return;
    }
  }
  /**
   * Lazily create the hidden preview video (only after playback started once)
   */
  ensurePreviewVideoInitialized() {
    if (this.previewVideoInitialized) return;
    if (!this.player?.state?.hasStartedPlayback) return;
    const renderer = this.player.renderer;
    const hasVideoMedia = renderer && renderer.media && renderer.media.tagName === "VIDEO";
    const isHTML5Renderer = hasVideoMedia && renderer.media === this.player.element && !renderer.hls && typeof renderer.seek === "function";
    this.previewSupported = isHTML5Renderer && hasVideoMedia;
    if (!this.previewSupported) return;
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
    }, { once: true });
    if (this.player.container) {
      this.player.container.appendChild(this.previewVideo);
    }
    this.previewVideo.src = videoSrc;
    this.previewVideoReady = false;
    this.previewVideoInitialized = true;
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
    if (!this.previewVideoReady) {
      if (this.previewVideo.readyState < 2) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Preview video data load timeout"));
          }, 1e4);
          const cleanup = () => {
            clearTimeout(timeout);
            this.previewVideo.removeEventListener("loadeddata", checkReady);
            this.previewVideo.removeEventListener("canplay", checkReady);
            this.previewVideo.removeEventListener("error", onError);
          };
          const checkReady = () => {
            if (this.previewVideo.readyState >= 2) {
              cleanup();
              this.previewVideoReady = true;
              resolve();
            }
          };
          const onError = () => {
            cleanup();
            reject(new Error("Preview video failed to load"));
          };
          if (this.previewVideo.readyState >= 1) {
            this.previewVideo.addEventListener("loadeddata", checkReady);
          }
          this.previewVideo.addEventListener("canplay", checkReady);
          this.previewVideo.addEventListener("error", onError);
          if (this.previewVideo.readyState >= 2) {
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
    const dataURL = await captureVideoFrame(this.previewVideo, time, {
      restoreState: false,
      quality: 0.8,
      maxWidth: 160,
      maxHeight: 90
    });
    if (dataURL) {
      if (this.previewThumbnailCache.size >= 20) {
        const firstKey = this.previewThumbnailCache.keys().next().value;
        this.previewThumbnailCache.delete(firstKey);
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
  setupProgressBarEvents() {
    const progress = this.controls.progress;
    const updateProgress = (clientX) => {
      const rect = progress.getBoundingClientRect();
      const percent = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
      const duration = this.player.state.duration || 0;
      const time = percent * duration;
      return { percent, time };
    };
    progress.addEventListener("mousedown", (e) => {
      this.isDraggingProgress = true;
      const { time } = updateProgress(e.clientX);
      this.player.seek(time);
    });
    document.addEventListener("mousemove", (e) => {
      if (this.isDraggingProgress) {
        const { time } = updateProgress(e.clientX);
        this.player.seek(time);
      }
    });
    document.addEventListener("mouseup", () => {
      this.isDraggingProgress = false;
    });
    progress.addEventListener("mousemove", (e) => {
      if (!this.isDraggingProgress) {
        const { time } = updateProgress(e.clientX);
        const rect = progress.getBoundingClientRect();
        const left = e.clientX - rect.left;
        this.controls.progressTooltipTime.textContent = TimeUtils.formatTime(time);
        this.controls.progressTooltip.style.left = `${left}px`;
        this.controls.progressTooltip.style.display = "block";
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
      this.controls.progressTooltip.style.display = "none";
      if (this.previewThumbnailTimeout) {
        clearTimeout(this.previewThumbnailTimeout);
      }
    });
    progress.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.player.seekBackward(5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.player.seekForward(5);
      }
    });
    progress.addEventListener("touchstart", (e) => {
      this.isDraggingProgress = true;
      const touch = e.touches[0];
      const { time } = updateProgress(touch.clientX);
      this.player.seek(time);
    });
    progress.addEventListener("touchmove", (e) => {
      if (this.isDraggingProgress) {
        e.preventDefault();
        const touch = e.touches[0];
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
    return button;
  }
  createRestartButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-restart`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.restart")
      }
    });
    button.appendChild(createIconElement("restart"));
    button.addEventListener("click", () => {
      this.player.seek(0);
      this.player.play();
    });
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
    this.player.on("playlisttrackchange", updateState);
    updateState();
    this.controls.previous = button;
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
    this.player.on("playlisttrackchange", updateState);
    updateState();
    this.controls.next = button;
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
    return button;
  }
  createRewindButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-rewind`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.rewindSeconds", { seconds: 15 })
      }
    });
    button.appendChild(createIconElement("rewind"));
    button.addEventListener("click", () => {
      this.player.seekBackward(15);
    });
    return button;
  }
  createForwardButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-forward`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.forwardSeconds", { seconds: 15 })
      }
    });
    button.appendChild(createIconElement("forward"));
    button.addEventListener("click", () => {
      this.player.seekForward(15);
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
    return muteButton;
  }
  showVolumeSlider(button) {
    const existingSlider = document.querySelector(`.${this.player.options.classPrefix}-volume-menu`);
    if (existingSlider) {
      existingSlider.remove();
      button.setAttribute("aria-expanded", "false");
      return;
    }
    const volumeMenu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-menu ${this.player.options.classPrefix}-menu`
    });
    const volumeSlider = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-volume-slider`,
      attributes: {
        "role": "slider",
        "aria-label": i18n.t("player.volume"),
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(Math.round(this.player.state.volume * 100)),
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
      updateVolume(e.clientY);
    });
    document.addEventListener("mousemove", (e) => {
      if (this.isDraggingVolume) {
        updateVolume(e.clientY);
      }
    });
    document.addEventListener("mouseup", () => {
      this.isDraggingVolume = false;
    });
    volumeSlider.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDraggingVolume = true;
      const touch = e.touches[0];
      updateVolume(touch.clientY);
    }, { passive: false });
    volumeSlider.addEventListener("touchmove", (e) => {
      if (this.isDraggingVolume) {
        e.preventDefault();
        const touch = e.touches[0];
        updateVolume(touch.clientY);
      }
    }, { passive: false });
    volumeSlider.addEventListener("touchend", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDraggingVolume = false;
    }, { passive: false });
    volumeSlider.addEventListener("touchcancel", () => {
      this.isDraggingVolume = false;
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
      textContent: " / ",
      attributes: {
        "aria-hidden": "true"
      }
    });
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
    container.appendChild(this.controls.currentTimeDisplay);
    container.appendChild(separator);
    container.appendChild(this.controls.durationDisplay);
    return container;
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
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-chapters-menu`);
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
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: i18n.t("player.noChapters"),
        attributes: {
          "role": "menuitem"
        },
        style: { opacity: "0.5", cursor: "default" }
      });
      menu.appendChild(noChaptersItem);
    } else {
      const chapterTrack = chapterTracks[0];
      if (chapterTrack.mode === "disabled") {
        chapterTrack.mode = "hidden";
      }
      if (!chapterTrack.cues || chapterTrack.cues.length === 0) {
        const loadingItem = DOMUtils.createElement("div", {
          className: `${this.player.options.classPrefix}-menu-item`,
          textContent: i18n.t("player.loadingChapters"),
          attributes: {
            "role": "menuitem"
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
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-quality-menu`);
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
      const isHLS = this.player.renderer.hls !== void 0;
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
        if (isHLS) {
          const autoItem = DOMUtils.createElement("button", {
            className: `${this.player.options.classPrefix}-menu-item`,
            textContent: i18n.t("player.auto"),
            attributes: {
              "type": "button",
              "role": "menuitem",
              "tabindex": "-1"
            }
          });
          const isAuto = this.player.renderer.hls && this.player.renderer.hls.currentLevel === -1;
          if (isAuto) {
            autoItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
            autoItem.appendChild(createIconElement("check"));
            activeItem = autoItem;
          }
          autoItem.addEventListener("click", () => {
            if (this.player.renderer.switchQuality) {
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
            if (this.player.renderer.switchQuality) {
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
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-caption-style-menu`);
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
      className: `${this.player.options.classPrefix}-caption-style-menu ${this.player.options.classPrefix}-menu ${this.player.options.classPrefix}-settings-menu`,
      attributes: {
        "role": "menu",
        "aria-label": i18n.t("player.captionStyling")
      }
    });
    menu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
      const noTracksItem = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: i18n.t("player.noCaptions"),
        attributes: {
          "role": "menuitem"
        },
        style: { opacity: "0.5", cursor: "default", padding: "12px 16px" }
      });
      menu.appendChild(noTracksItem);
      menu.style.visibility = "hidden";
      menu.style.display = "block";
      this.insertMenuIntoDOM(menu, button);
      this.positionMenu(menu, button, true);
      requestAnimationFrame(() => {
        menu.style.visibility = "visible";
      });
      this.attachMenuCloseHandler(menu, button, true);
      return;
    }
    const fontSizeGroup = this.createStyleControl(
      i18n.t("styleLabels.fontSize"),
      "captionsFontSize",
      [
        { label: i18n.t("fontSizes.small"), value: "87.5%" },
        { label: i18n.t("fontSizes.normal"), value: "100%" },
        { label: i18n.t("fontSizes.large"), value: "125%" },
        { label: i18n.t("fontSizes.xlarge"), value: "150%" }
      ]
    );
    menu.appendChild(fontSizeGroup);
    const fontFamilyGroup = this.createStyleControl(
      i18n.t("styleLabels.font"),
      "captionsFontFamily",
      [
        { label: i18n.t("fontFamilies.sansSerif"), value: "sans-serif" },
        { label: i18n.t("fontFamilies.serif"), value: "serif" },
        { label: i18n.t("fontFamilies.monospace"), value: "monospace" }
      ]
    );
    menu.appendChild(fontFamilyGroup);
    const colorGroup = this.createColorControl(i18n.t("styleLabels.textColor"), "captionsColor");
    menu.appendChild(colorGroup);
    const bgColorGroup = this.createColorControl(i18n.t("styleLabels.background"), "captionsBackgroundColor");
    menu.appendChild(bgColorGroup);
    const opacityGroup = this.createOpacityControl(i18n.t("styleLabels.opacity"), "captionsOpacity");
    menu.appendChild(opacityGroup);
    menu.style.minWidth = "220px";
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    this.insertMenuIntoDOM(menu, button);
    this.positionMenu(menu, button, true);
    requestAnimationFrame(() => {
      menu.style.visibility = "visible";
    });
    this.attachMenuCloseHandler(menu, button, true);
    focusFirstElement(menu, `.${this.player.options.classPrefix}-style-select`);
  }
  createStyleControl(label, property, options) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-style-group`
    });
    const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": controlId
      },
      style: {
        display: "block",
        fontSize: "12px",
        marginBottom: "4px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    group.appendChild(labelEl);
    const select = DOMUtils.createElement("select", {
      className: `${this.player.options.classPrefix}-style-select`,
      attributes: {
        "id": controlId
      },
      style: {
        width: "100%",
        padding: "6px",
        background: "var(--vidply-white)",
        border: "1px solid var(--vidply-white-10)",
        borderRadius: "4px",
        color: "var(--vidply-black)",
        fontSize: "13px"
      }
    });
    const currentValue = this.player.options[property];
    options.forEach((opt) => {
      const option = DOMUtils.createElement("option", {
        textContent: opt.label,
        attributes: { value: opt.value }
      });
      if (opt.value === currentValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    select.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    select.addEventListener("change", (e) => {
      e.stopPropagation();
      this.player.options[property] = e.target.value;
      if (this.player.captionManager) {
        this.player.captionManager.setCaptionStyle(
          property.replace("captions", "").charAt(0).toLowerCase() + property.replace("captions", "").slice(1),
          e.target.value
        );
      }
    });
    group.appendChild(select);
    return group;
  }
  createColorControl(label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-style-group`
    });
    const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": controlId
      },
      style: {
        display: "block",
        fontSize: "12px",
        marginBottom: "4px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    group.appendChild(labelEl);
    const input = DOMUtils.createElement("input", {
      attributes: {
        "id": controlId,
        type: "color",
        value: this.player.options[property]
      },
      style: {
        width: "100%",
        height: "32px",
        padding: "2px",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "4px",
        cursor: "pointer"
      }
    });
    input.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("change", (e) => {
      e.stopPropagation();
      this.player.options[property] = e.target.value;
      if (this.player.captionManager) {
        this.player.captionManager.setCaptionStyle(
          property.replace("captions", "").charAt(0).toLowerCase() + property.replace("captions", "").slice(1),
          e.target.value
        );
      }
    });
    group.appendChild(input);
    return group;
  }
  createOpacityControl(label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-style-group`
    });
    const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;
    const labelContainer = DOMUtils.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "4px"
      }
    });
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": controlId
      },
      style: {
        fontSize: "12px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    const valueEl = DOMUtils.createElement("span", {
      textContent: Math.round(this.player.options[property] * 100) + "%",
      style: {
        fontSize: "12px",
        color: "rgba(255,255,255,0.7)"
      }
    });
    labelContainer.appendChild(labelEl);
    labelContainer.appendChild(valueEl);
    group.appendChild(labelContainer);
    const input = DOMUtils.createElement("input", {
      attributes: {
        "id": controlId,
        type: "range",
        min: "0",
        max: "1",
        step: "0.1",
        value: String(this.player.options[property])
      },
      style: {
        width: "100%",
        cursor: "pointer"
      }
    });
    input.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("input", (e) => {
      e.stopPropagation();
      const value = parseFloat(e.target.value);
      valueEl.textContent = Math.round(value * 100) + "%";
      this.player.options[property] = value;
      if (this.player.captionManager) {
        this.player.captionManager.setCaptionStyle(
          property.replace("captions", "").charAt(0).toLowerCase() + property.replace("captions", "").slice(1),
          value
        );
      }
    });
    group.appendChild(input);
    return group;
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
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-speed-menu`);
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
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-captions-menu`);
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
      if (this.player.state.captionsEnabled && this.player.captionManager.currentTrack === this.player.captionManager.tracks[track.index]) {
        item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
        item.appendChild(createIconElement("check"));
        activeItem = item;
      }
      item.addEventListener("click", () => {
        this.player.captionManager.switchTrack(track.index);
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
    icon.innerHTML = isEnabled ? createIconElement("audioDescriptionOn").innerHTML : createIconElement("audioDescription").innerHTML;
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
    icon.innerHTML = isEnabled ? createIconElement("signLanguagePipOn").innerHTML : createIconElement("signLanguagePip").innerHTML;
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
      if (this.player.signLanguageManager) {
        this.player.signLanguageManager.toggleInMainView();
      }
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
    btn.querySelector(".vidply-icon").innerHTML = createIconElement(iconName).innerHTML;
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
        this.setupOverflowMenu();
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
        this.setupOverflowMenu();
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
  createSettingsButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-settings`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.settings")
      }
    });
    button.appendChild(createIconElement("settings"));
    button.addEventListener("click", () => {
      this.player.showSettings();
    });
    return button;
  }
  createPipButton() {
    const button = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-pip`,
      attributes: {
        "type": "button",
        "aria-label": i18n.t("player.pip")
      }
    });
    button.appendChild(createIconElement("pip"));
    button.addEventListener("click", () => {
      this.player.togglePiP();
    });
    return button;
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
    this.player.on("play", () => this.updatePlayPauseButton());
    this.player.on("pause", () => this.updatePlayPauseButton());
    this.player.on("timeupdate", () => this.updateProgress());
    this.player.on("loadedmetadata", () => {
      this.updateDuration();
      this.ensureQualityButton();
      this.updateQualityIndicator();
      this.updatePreviewVideoSource();
    });
    this.player.on("sourcechange", () => {
      this.updatePreviewVideoSource();
    });
    this.player.on("volumechange", () => this.updateVolumeDisplay());
    this.player.on("progress", () => this.updateBuffered());
    this.player.on("playbackspeedchange", () => this.updateSpeedDisplay());
    this.player.on("fullscreenchange", () => this.updateFullscreenButton());
    this.player.on("captionsenabled", () => this.updateCaptionsButton());
    this.player.on("captionsdisabled", () => this.updateCaptionsButton());
    this.player.on("audiodescriptionenabled", () => this.updateAudioDescriptionButton());
    this.player.on("audiodescriptiondisabled", () => this.updateAudioDescriptionButton());
    this.player.on("signlanguageenabled", () => this.updateSignLanguageButton());
    this.player.on("signlanguagedisabled", () => this.updateSignLanguageButton());
    this.player.on("signlanguageinmainviewenabled", () => this.updateSignLanguageInMainViewButton());
    this.player.on("signlanguageinmainviewdisabled", () => this.updateSignLanguageInMainViewButton());
    this.player.on("qualitychange", () => this.updateQualityIndicator());
    this.player.on("hlslevelswitched", () => this.updateQualityIndicator());
    this.player.on("hlsmanifestparsed", () => {
      this.ensureQualityButton();
      this.updateQualityIndicator();
    });
  }
  updatePlayPauseButton() {
    if (!this.controls.playPause) return;
    const icon = this.controls.playPause.querySelector(".vidply-icon");
    const isPlaying = this.player.state.playing;
    icon.innerHTML = isPlaying ? createIconElement("pause").innerHTML : createIconElement("play").innerHTML;
    const newAriaLabel = isPlaying ? i18n.t("player.pause") : i18n.t("player.play");
    this.controls.playPause.setAttribute("aria-label", newAriaLabel);
    DOMUtils.attachTooltip(this.controls.playPause, newAriaLabel, this.player.options.classPrefix);
  }
  updateProgress() {
    if (!this.controls.played) return;
    const currentTime = this.player.state.currentTime || 0;
    const duration = this.player.state.duration || 0;
    const percent = duration > 0 ? Math.min(100, Math.max(0, currentTime / duration * 100)) : 0;
    this.controls.played.style.width = `${percent}%`;
    this.controls.progress.setAttribute("aria-valuenow", String(Math.round(percent)));
    const currentTimeText = TimeUtils.formatDuration(this.player.state.currentTime);
    const durationText = TimeUtils.formatDuration(this.player.state.duration);
    this.controls.progress.setAttribute(
      "aria-valuetext",
      `${Math.round(percent)}%, ${currentTimeText} ${i18n.t("time.of")} ${durationText}`
    );
    if (this.controls.currentTimeVisual) {
      const currentTime2 = this.player.state.currentTime;
      this.controls.currentTimeVisual.textContent = TimeUtils.formatTime(currentTime2);
      if (this.controls.currentTimeAccessible) {
        this.controls.currentTimeAccessible.textContent = TimeUtils.formatDuration(currentTime2);
      }
    }
  }
  updateDuration() {
    if (this.controls.durationVisual) {
      const duration = this.player.state.duration;
      this.controls.durationVisual.textContent = TimeUtils.formatTime(duration);
      if (this.controls.durationAccessible) {
        this.controls.durationAccessible.textContent = i18n.t("time.durationPrefix") + TimeUtils.formatDuration(duration);
      }
    }
  }
  updateVolumeDisplay() {
    const percent = this.player.state.volume * 100;
    if (this.controls.volumeFill) {
      this.controls.volumeFill.style.height = `${percent}%`;
    }
    if (this.controls.volumeSlider) {
      this.controls.volumeSlider.setAttribute("aria-valuenow", String(Math.round(percent)));
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
        const newMuteAriaLabel = this.player.state.muted ? i18n.t("player.unmute") : i18n.t("player.mute");
        this.controls.mute.setAttribute("aria-label", newMuteAriaLabel);
        DOMUtils.attachTooltip(this.controls.mute, newMuteAriaLabel, this.player.options.classPrefix);
      }
    }
    if (this.controls.volumeSlider) {
      this.controls.volumeSlider.setAttribute("aria-valuenow", String(Math.round(percent)));
    }
  }
  updateBuffered() {
    if (!this.controls.buffered || !this.player.element.buffered || this.player.element.buffered.length === 0) return;
    const buffered = this.player.element.buffered.end(this.player.element.buffered.length - 1);
    const percent = buffered / this.player.state.duration * 100;
    this.controls.buffered.style.width = `${percent}%`;
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
    icon.innerHTML = isFullscreen ? createIconElement("fullscreenExit").innerHTML : createIconElement("fullscreen").innerHTML;
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
  updateQualityIndicator() {
    if (!this.controls.qualityText) return;
    if (!this.player.renderer || !this.player.renderer.getQualities) return;
    const qualities = this.player.renderer.getQualities();
    if (qualities.length === 0) {
      this.controls.qualityText.textContent = "";
      return;
    }
    let currentQualityText = "";
    if (this.player.renderer.hls && this.player.renderer.hls.currentLevel === -1) {
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
    this.player.container.addEventListener("mousemove", showControls);
    this.player.container.addEventListener("touchstart", showControls);
    this.player.container.addEventListener("touchmove", showControls);
    this.player.container.addEventListener("click", showControls);
    this.player.container.addEventListener("tap", showControls);
    this.element.addEventListener("focusin", showControls);
    this.player.on("pause", () => {
      showControls();
      clearTimeout(this.hideTimeout);
    });
    this.player.on("play", () => {
      showControls();
    });
    this.player.on("enterfullscreen", () => {
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
    const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-overflow-menu-list`);
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
    const overflowButtons = Array.from(this.rightButtons.querySelectorAll('button[data-in-overflow="true"]'));
    if (overflowButtons.length === 0) {
      const noItemsText = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-menu-item`,
        textContent: i18n.t("player.noMoreOptions"),
        attributes: {
          "role": "menuitem"
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
        item.addEventListener("click", (e) => {
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
  setupOverflowDetection() {
    const checkOverflow = () => {
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
        (btn) => !btn.classList.contains(`${this.player.options.classPrefix}-overflow-menu`)
      );
      if (allButtons.length === 0) {
        if (this.overflowMenuButton) {
          this.overflowMenuButton.style.display = "none";
        }
        return;
      }
      const shouldUseOverflow = !isDesktop && !isLandscape;
      if (this.player.options.debug) {
        console.log("Overflow detection:", {
          isDesktop,
          isFullscreen,
          isLandscape,
          isLandscapeFullscreen,
          shouldUseOverflow,
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
      if (!shouldUseOverflow) {
        allButtons.forEach((btn) => {
          btn.dataset.inOverflow = "false";
          btn.style.display = "";
        });
        if (this.overflowMenuButton) {
          this.overflowMenuButton.style.display = "none";
        }
        if (this.player.options.debug) {
          console.log("No overflow menu needed - all buttons visible, overflow button hidden");
        }
        return;
      }
      if (this.player.options.debug) {
        console.log("Mobile portrait - checking for overflow...");
      }
      allButtons.forEach((btn) => {
        btn.style.display = "";
      });
      const containerWidth = this.rightButtons.offsetWidth;
      const overflowButtonWidth = 50;
      const availableWidth = containerWidth - overflowButtonWidth;
      let totalWidth = 0;
      const buttonWidths = allButtons.map((btn) => {
        const style = getComputedStyle(btn);
        const width = btn.offsetWidth + parseInt(style.marginLeft || 0) + parseInt(style.marginRight || 0);
        totalWidth += width;
        return { btn, width };
      });
      const gapWidth = 8;
      totalWidth += (allButtons.length - 1) * gapWidth;
      const isSmallScreen = window.innerWidth < 768;
      const needsOverflow = totalWidth > availableWidth || isSmallScreen || isLandscapeFullscreen && !isDesktop;
      if (this.player.options.debug) {
        console.log("Overflow detection:", {
          containerWidth,
          availableWidth,
          totalWidth,
          needsOverflow,
          isSmallScreen,
          reason: isSmallScreen ? "mobile screen" : totalWidth > availableWidth ? "not enough space" : "enough space",
          buttonCount: allButtons.length
        });
      }
      if (needsOverflow) {
        const isSmallScreen2 = window.innerWidth < 768;
        const priorityAttr = isSmallScreen2 ? "overflowPriorityMobile" : "overflowPriority";
        if (this.player.options.debug) {
          console.log(`Using ${isSmallScreen2 ? "mobile" : "desktop"} priorities (width: ${window.innerWidth}px)`);
        }
        const sortedButtons = buttonWidths.sort((a, b) => {
          const priorityA = parseInt(a.btn.dataset[priorityAttr] || a.btn.dataset.overflowPriority || "1");
          const priorityB = parseInt(b.btn.dataset[priorityAttr] || b.btn.dataset.overflowPriority || "1");
          return priorityB - priorityA;
        });
        let currentWidth = totalWidth;
        let movedToOverflow = 0;
        for (const { btn, width } of sortedButtons) {
          const priority = parseInt(btn.dataset[priorityAttr] || btn.dataset.overflowPriority || "1");
          const buttonLabel = btn.getAttribute("aria-label") || "unknown";
          if (priority === 1) {
            btn.dataset.inOverflow = "false";
            btn.style.display = "";
            continue;
          }
          const shouldHide = isSmallScreen2 ? priority > 1 : currentWidth > availableWidth;
          if (shouldHide) {
            btn.dataset.inOverflow = "true";
            btn.style.display = "none";
            currentWidth -= width;
            movedToOverflow++;
            if (this.player.options.debug) {
              console.log(`  → Hiding button: ${buttonLabel} (priority ${priority}, ${isSmallScreen2 ? "mobile" : "desktop"})`);
            }
          } else {
            btn.dataset.inOverflow = "false";
            btn.style.display = "";
          }
        }
        if (this.player.options.debug) {
          console.log("Overflow button exists?", !!this.overflowMenuButton);
        }
        if (!this.overflowMenuButton) {
          console.error("Overflow menu button not found!");
          return;
        }
        if (movedToOverflow > 0) {
          this.overflowMenuButton.style.display = "";
          if (this.player.options.debug) {
            console.log("Showing overflow menu button -", movedToOverflow, "buttons moved");
          }
        } else {
          this.overflowMenuButton.style.display = "none";
          if (this.player.options.debug) {
            console.log("Hiding overflow menu button - all buttons fit");
          }
        }
      } else {
        allButtons.forEach((btn) => {
          btn.dataset.inOverflow = "false";
          btn.style.display = "";
        });
        this.overflowMenuButton.style.display = "none";
      }
    };
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(checkOverflow);
    });
    resizeObserver.observe(this.rightButtons);
    window.addEventListener("resize", () => {
      requestAnimationFrame(checkOverflow);
    });
    this.player.on("fullscreenchange", () => {
      setTimeout(() => {
        requestAnimationFrame(checkOverflow);
      }, 50);
    });
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
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    if (this.overflowResizeObserver) {
      this.overflowResizeObserver.disconnect();
    }
    this.cleanupPreviewThumbnail();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
};

// src/controls/CaptionManager.js
var CaptionManager = class {
  constructor(player) {
    this.player = player;
    this.element = null;
    this.tracks = [];
    this.currentTrack = null;
    this.currentCue = null;
    this.storage = new StorageManager("vidply");
    this.loadSavedPreferences();
    this.init();
  }
  loadSavedPreferences() {
    const saved = this.storage.getCaptionPreferences();
    if (saved) {
      if (saved.fontSize) this.player.options.captionsFontSize = saved.fontSize;
      if (saved.fontFamily) this.player.options.captionsFontFamily = saved.fontFamily;
      if (saved.color) this.player.options.captionsColor = saved.color;
      if (saved.backgroundColor) this.player.options.captionsBackgroundColor = saved.backgroundColor;
      if (saved.opacity !== void 0) this.player.options.captionsOpacity = saved.opacity;
    }
  }
  saveCaptionPreferences() {
    this.storage.saveCaptionPreferences({
      fontSize: this.player.options.captionsFontSize,
      fontFamily: this.player.options.captionsFontFamily,
      color: this.player.options.captionsColor,
      backgroundColor: this.player.options.captionsBackgroundColor,
      opacity: this.player.options.captionsOpacity
    });
  }
  init() {
    this.createElement();
    this.loadTracks();
    this.attachEvents();
    if (this.player.options.captionsDefault && this.tracks.length > 0 && !this.currentTrack) {
      this.enable();
    }
  }
  createElement() {
    this.element = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-captions`,
      attributes: {
        "role": "region",
        "aria-label": i18n.t("player.captions")
      }
    });
    this.updateStyles();
    const target = this.player.videoWrapper || this.player.container;
    target.appendChild(this.element);
  }
  loadTracks() {
    const textTracks = this.player.element.textTracks;
    let defaultTrackIndex = -1;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        const trackElement = this.player.findTrackElement(track);
        const isDefault = trackElement && trackElement.hasAttribute("default");
        this.tracks.push({
          track,
          language: track.language,
          label: track.label,
          kind: track.kind,
          index: i,
          isDefault
        });
        if (track.mode === "showing") {
          track.mode = "hidden";
        } else if (track.mode === "disabled") {
          track.mode = "hidden";
        } else {
          track.mode = "hidden";
        }
        if (isDefault) {
          defaultTrackIndex = this.tracks.length - 1;
        }
      }
    }
    if (defaultTrackIndex >= 0) {
      requestAnimationFrame(() => {
        this.enable(defaultTrackIndex);
      });
    }
  }
  attachEvents() {
    this.player.on("timeupdate", () => {
      this.updateCaptions();
    });
    this.player.on("captionschange", () => {
      this.updateStyles();
    });
    this.debouncedPositionCaptions = debounce(() => {
      this.positionCaptionsOnMobile();
    }, 150);
    window.addEventListener("resize", this.debouncedPositionCaptions);
    this.player.on("enterfullscreen", () => {
      rafWithTimeout(() => this.positionCaptionsOnMobile(), 100);
    });
    this.player.on("exitfullscreen", () => {
      rafWithTimeout(() => this.positionCaptionsOnMobile(), 100);
    });
  }
  enable(trackIndex = 0) {
    if (this.tracks.length === 0) {
      return;
    }
    if (this.currentTrack && this.currentTrack.track) {
      if (this.cueChangeHandler) {
        this.currentTrack.track.removeEventListener("cuechange", this.cueChangeHandler);
      }
      this.currentTrack.track.mode = "hidden";
    }
    const selectedTrack = this.tracks[trackIndex];
    if (selectedTrack && selectedTrack.track) {
      selectedTrack.track.mode = "hidden";
      this.currentTrack = selectedTrack;
      this.player.state.captionsEnabled = true;
      if (selectedTrack.language) {
        this.element.setAttribute("lang", selectedTrack.language);
      }
      if (this.cueChangeHandler) {
        selectedTrack.track.removeEventListener("cuechange", this.cueChangeHandler);
      }
      this.cueChangeHandler = () => {
        this.updateCaptions();
      };
      selectedTrack.track.addEventListener("cuechange", this.cueChangeHandler);
      const ensureTrackReady = () => {
        if (selectedTrack.track.readyState < 2) {
          const onTrackLoad = () => {
            selectedTrack.track.removeEventListener("load", onTrackLoad);
            selectedTrack.track.removeEventListener("error", onTrackLoad);
            requestAnimationFrame(() => {
              if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                this.updateCaptions();
              }
            });
          };
          selectedTrack.track.addEventListener("load", onTrackLoad, { once: true });
          selectedTrack.track.addEventListener("error", onTrackLoad, { once: true });
        } else {
          requestAnimationFrame(() => {
            if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
              this.updateCaptions();
            }
          });
        }
      };
      requestAnimationFrame(() => {
        if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
          ensureTrackReady();
        }
      });
      this.player.emit("captionsenabled", selectedTrack);
    }
  }
  disable() {
    if (this.currentTrack) {
      this.currentTrack.track.mode = "hidden";
      this.currentTrack = null;
    }
    this.element.style.display = "none";
    this.element.innerHTML = "";
    this.element.removeAttribute("lang");
    this.currentCue = null;
    this.player.state.captionsEnabled = false;
    this.player.emit("captionsdisabled");
  }
  updateCaptions() {
    if (!this.currentTrack || !this.currentTrack.track) {
      return;
    }
    if (this.currentTrack.track.mode === "disabled") {
      this.currentTrack.track.mode = "hidden";
    }
    if (this.currentTrack.track.mode === "showing") {
      this.currentTrack.track.mode = "hidden";
    }
    if (!this.currentTrack.track.activeCues) {
      if (this.currentTrack.track.cues && this.currentTrack.track.cues.length > 0) {
        if (this.currentCue) {
          this.element.innerHTML = "";
          this.element.style.display = "none";
          this.currentCue = null;
        }
      }
      return;
    }
    const activeCues = this.currentTrack.track.activeCues;
    const isAudioPlayer = this.player.element.tagName.toLowerCase() === "audio";
    if (activeCues.length > 0) {
      const cue = activeCues[0];
      if (this.currentCue !== cue) {
        this.currentCue = cue;
        let text = cue.text;
        text = this.parseVTTFormatting(text);
        if (isAudioPlayer) {
          const existingCues = this.element.querySelectorAll(`.${this.player.options.classPrefix}-caption-cue`);
          existingCues.forEach((el) => el.classList.remove(`${this.player.options.classPrefix}-caption-active`));
          const cueId = `cue-${cue.startTime}-${cue.endTime}`;
          let cueElement = this.element.querySelector(`[data-cue-id="${cueId}"]`);
          if (!cueElement) {
            cueElement = document.createElement("div");
            cueElement.className = `${this.player.options.classPrefix}-caption-cue`;
            cueElement.setAttribute("data-cue-id", cueId);
            cueElement.innerHTML = DOMUtils.sanitizeHTML(text);
            this.element.appendChild(cueElement);
          }
          cueElement.classList.add(`${this.player.options.classPrefix}-caption-active`);
          requestAnimationFrame(() => {
            if (cueElement) {
              cueElement.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });
        } else {
          this.element.innerHTML = DOMUtils.sanitizeHTML(text);
        }
        this.element.style.display = "block";
        this.positionCaptionsOnMobile();
        this.player.emit("captionchange", cue);
      }
    } else if (this.currentCue) {
      if (!isAudioPlayer) {
        this.element.innerHTML = "";
        this.element.style.display = "none";
      }
      this.currentCue = null;
    }
  }
  positionCaptionsOnMobile() {
    if (!this.element || this.element.style.display === "none") {
      return;
    }
    const isFullscreen = this.player.state?.fullscreen || false;
    const mobile = isMobile();
    if (!mobile && !isFullscreen) {
      this.element.style.bottom = "";
      return;
    }
    const controls = this.player.controlBar?.element;
    if (!controls) {
      return;
    }
    requestAnimationFrame(() => {
      if (!this.element || this.element.style.display === "none") {
        return;
      }
      const controlsRect = controls.getBoundingClientRect();
      const wrapperRect = this.player.videoWrapper.getBoundingClientRect();
      const bottomOffset = wrapperRect.bottom - controlsRect.top + 16;
      this.element.style.bottom = `${bottomOffset}px`;
      if (this.player.options.debug) {
        console.log("[VidPly] Caption position:", {
          mobile,
          isFullscreen,
          controlsHeight: controlsRect.height,
          bottomOffset: `${bottomOffset}px`
        });
      }
    });
  }
  parseVTTFormatting(text) {
    text = text.replace(/<c[^>]*>(.*?)<\/c>/g, '<span class="caption-class">$1</span>');
    text = text.replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>");
    text = text.replace(/<i>(.*?)<\/i>/g, "<em>$1</em>");
    text = text.replace(/<u>(.*?)<\/u>/g, "<u>$1</u>");
    text = text.replace(/<v\s+([^>]+)>(.*?)<\/v>/g, '<span class="caption-voice" data-voice="$1">$2</span>');
    return text;
  }
  updateStyles() {
    if (!this.element) return;
    const options = this.player.options;
    this.element.style.fontSize = options.captionsFontSize;
    this.element.style.fontFamily = options.captionsFontFamily;
    this.element.style.color = options.captionsColor;
    this.element.style.backgroundColor = this.hexToRgba(
      options.captionsBackgroundColor,
      options.captionsOpacity
    );
  }
  hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }
    return hex;
  }
  setCaptionStyle(property, value) {
    switch (property) {
      case "fontSize":
        this.player.options.captionsFontSize = value;
        break;
      case "fontFamily":
        this.player.options.captionsFontFamily = value;
        break;
      case "color":
        this.player.options.captionsColor = value;
        break;
      case "backgroundColor":
        this.player.options.captionsBackgroundColor = value;
        break;
      case "opacity":
        this.player.options.captionsOpacity = value;
        break;
    }
    this.updateStyles();
    this.saveCaptionPreferences();
    this.player.emit("captionschange");
  }
  getAvailableTracks() {
    return this.tracks.map((t, index) => ({
      index,
      language: t.language,
      label: t.label || t.language,
      kind: t.kind
    }));
  }
  switchTrack(trackIndex) {
    if (trackIndex >= 0 && trackIndex < this.tracks.length) {
      this.disable();
      this.enable(trackIndex);
    }
  }
  destroy() {
    this.disable();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
};

// src/controls/KeyboardManager.js
var KeyboardManager = class {
  constructor(player) {
    this.player = player;
    this.shortcuts = player.options.keyboardShortcuts;
    this.init();
  }
  init() {
    this.attachEvents();
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
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
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
          this.announceAction(action);
          break;
        }
      }
    }
    if (!handled && this.player.options.debug) {
      console.log("[VidPly] Unhandled key:", e.key, "code:", e.code, "shiftKey:", e.shiftKey);
    }
  }
  executeAction(action, event) {
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
          const captionsButton = this.player.controlBar && this.player.controlBar.controls.captions;
          if (captionsButton) {
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
      default:
        return false;
    }
  }
  announceAction(action) {
    if (!this.player.options.screenReaderAnnouncements) return;
    let message = "";
    switch (action) {
      case "play-pause":
        message = this.player.state.playing ? "Playing" : "Paused";
        break;
      case "volume-up":
        message = `Volume ${Math.round(this.player.state.volume * 100)}%`;
        break;
      case "volume-down":
        message = `Volume ${Math.round(this.player.state.volume * 100)}%`;
        break;
      case "mute":
        message = this.player.state.muted ? "Muted" : "Unmuted";
        break;
      case "fullscreen":
        message = this.player.state.fullscreen ? "Fullscreen" : "Exit fullscreen";
        break;
      case "captions":
        message = this.player.state.captionsEnabled ? "Captions on" : "Captions off";
        break;
      case "speed-up":
      case "speed-down":
        message = `Speed ${this.player.state.playbackSpeed}x`;
        break;
    }
    if (message) {
      this.announce(message);
    }
  }
  announce(message, priority = "polite") {
    let announcer = document.getElementById("vidply-announcer");
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = "vidply-announcer";
      announcer.className = "vidply-sr-only";
      announcer.setAttribute("aria-live", priority);
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(announcer);
    }
    announcer.textContent = "";
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }
  updateShortcut(action, keys) {
    if (Array.isArray(keys)) {
      this.shortcuts[action] = keys;
    }
  }
  destroy() {
  }
};

// src/core/AudioDescriptionManager.js
var AudioDescriptionManager = class {
  constructor(player) {
    this.player = player;
    this.enabled = false;
    this.desiredState = false;
    this.src = player.options.audioDescriptionSrc;
    this.sourceElement = null;
    this.originalSource = null;
    this.captionTracks = [];
  }
  /**
   * Initialize audio description from source elements
   * Called during player initialization
   */
  initFromSourceElements(sourceElements, trackElements) {
    for (const sourceEl of sourceElements) {
      const descSrc = sourceEl.getAttribute("data-desc-src");
      const origSrc = sourceEl.getAttribute("data-orig-src");
      if (descSrc || origSrc) {
        if (!this.sourceElement) {
          this.sourceElement = sourceEl;
        }
        if (origSrc) {
          if (!this.originalSource) {
            this.originalSource = origSrc;
          }
          if (!this.player.originalSrc) {
            this.player.originalSrc = origSrc;
          }
        } else {
          const currentSrcAttr = sourceEl.getAttribute("src");
          if (!this.originalSource && currentSrcAttr) {
            this.originalSource = currentSrcAttr;
          }
          if (!this.player.originalSrc && currentSrcAttr) {
            this.player.originalSrc = currentSrcAttr;
          }
        }
        if (descSrc && !this.src) {
          this.src = descSrc;
        }
      }
    }
    trackElements.forEach((trackEl) => {
      const trackKind = trackEl.getAttribute("kind");
      const trackDescSrc = trackEl.getAttribute("data-desc-src");
      if ((trackKind === "captions" || trackKind === "subtitles" || trackKind === "chapters" || trackKind === "descriptions") && trackDescSrc) {
        this.captionTracks.push({
          trackElement: trackEl,
          originalSrc: trackEl.getAttribute("src"),
          describedSrc: trackDescSrc,
          originalTrackSrc: trackEl.getAttribute("data-orig-src") || trackEl.getAttribute("src"),
          explicit: true
        });
        this.player.log(`Found explicit described ${trackKind} track: ${trackEl.getAttribute("src")} -> ${trackDescSrc}`);
      }
    });
  }
  /**
   * Check if audio description is available
   */
  isAvailable() {
    const hasSourceElementsWithDesc = this.player.sourceElements.some(
      (el) => el.getAttribute("data-desc-src")
    );
    return !!(this.src || hasSourceElementsWithDesc || this.captionTracks.length > 0);
  }
  /**
   * Enable audio description
   */
  async enable() {
    const hasSourceElementsWithDesc = this.player.sourceElements.some(
      (el) => el.getAttribute("data-desc-src")
    );
    const hasTracksWithDesc = this.captionTracks.length > 0;
    if (!this.src && !hasSourceElementsWithDesc && !hasTracksWithDesc) {
      console.warn("VidPly: No audio description source, source elements, or tracks provided");
      return;
    }
    this.desiredState = true;
    const currentTime = this.player.state.currentTime;
    const wasPlaying = this.player.state.playing;
    const posterValue = this.player.element.poster || this.player.element.getAttribute("poster") || this.player.options.poster;
    const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;
    const currentCaptionText = this._getCurrentCaptionText();
    if (this.sourceElement) {
      await this._enableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
    } else {
      await this._enableWithDirectSrc(currentTime, wasPlaying, posterValue, shouldKeepPoster);
    }
  }
  /**
   * Disable audio description
   */
  async disable() {
    if (!this.player.originalSrc) {
      return;
    }
    this.desiredState = false;
    const currentTime = this.player.state.currentTime;
    const wasPlaying = this.player.state.playing;
    const posterValue = this.player.element.poster || this.player.element.getAttribute("poster") || this.player.options.poster;
    const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;
    const currentCaptionText = this._getCurrentCaptionText();
    if (this.sourceElement) {
      await this._disableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
    } else {
      await this._disableWithDirectSrc(currentTime, wasPlaying, posterValue);
    }
  }
  /**
   * Toggle audio description
   */
  async toggle() {
    const descriptionTrack = this.player.findTextTrack("descriptions");
    const hasAudioDescriptionSrc = this.isAvailable();
    if (descriptionTrack && !hasAudioDescriptionSrc) {
      if (descriptionTrack.mode === "showing") {
        descriptionTrack.mode = "hidden";
        this.enabled = false;
        this.player.emit("audiodescriptiondisabled");
      } else {
        descriptionTrack.mode = "showing";
        this.enabled = true;
        this.player.emit("audiodescriptionenabled");
      }
    } else if (descriptionTrack && hasAudioDescriptionSrc) {
      if (this.enabled) {
        this.desiredState = false;
        await this.disable();
      } else {
        descriptionTrack.mode = "showing";
        this.desiredState = true;
        await this.enable();
      }
    } else if (hasAudioDescriptionSrc) {
      if (this.enabled) {
        this.desiredState = false;
        await this.disable();
      } else {
        this.desiredState = true;
        await this.enable();
      }
    }
  }
  /**
   * Get current caption text for synchronization
   */
  _getCurrentCaptionText() {
    if (this.player.captionManager && this.player.captionManager.currentTrack && this.player.captionManager.currentCue) {
      return this.player.captionManager.currentCue.text;
    }
    return null;
  }
  /**
   * Validate that a track URL exists
   */
  async _validateTrackExists(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
  /**
   * Swap caption tracks to described versions
   */
  async _swapCaptionTracks(toDescribed = true) {
    if (this.captionTracks.length === 0) return [];
    const swappedTracks = [];
    const validationPromises = this.captionTracks.map(async (trackInfo) => {
      if (trackInfo.trackElement && trackInfo.describedSrc) {
        if (trackInfo.explicit === true) {
          try {
            const exists = await this._validateTrackExists(
              toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc
            );
            return { trackInfo, exists };
          } catch {
            return { trackInfo, exists: false };
          }
        }
      }
      return { trackInfo, exists: false };
    });
    const validationResults = await Promise.all(validationPromises);
    const tracksToSwap = validationResults.filter((result) => result.exists);
    if (tracksToSwap.length > 0) {
      const trackModes = /* @__PURE__ */ new Map();
      tracksToSwap.forEach(({ trackInfo }) => {
        const textTrack = trackInfo.trackElement.track;
        if (textTrack) {
          trackModes.set(trackInfo, {
            wasShowing: textTrack.mode === "showing",
            wasHidden: textTrack.mode === "hidden"
          });
        } else {
          trackModes.set(trackInfo, { wasShowing: false, wasHidden: false });
        }
      });
      const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
        const attributes = {};
        Array.from(trackInfo.trackElement.attributes).forEach((attr) => {
          attributes[attr.name] = attr.value;
        });
        const result = {
          trackInfo,
          oldSrc: trackInfo.trackElement.getAttribute("src"),
          parent: trackInfo.trackElement.parentNode,
          nextSibling: trackInfo.trackElement.nextSibling,
          attributes
        };
        trackInfo.trackElement.remove();
        return result;
      });
      this.player.element.load();
      await new Promise((resolve) => {
        setTimeout(() => {
          tracksToReadd.forEach(({ trackInfo, parent, nextSibling, attributes }) => {
            swappedTracks.push(trackInfo);
            const newTrackElement = document.createElement("track");
            const newSrc = toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc;
            newTrackElement.setAttribute("src", newSrc);
            Object.keys(attributes).forEach((attrName) => {
              if (attrName !== "src" && attrName !== "data-desc-src") {
                newTrackElement.setAttribute(attrName, attributes[attrName]);
              }
            });
            const targetParent = parent || this.player.element;
            if (nextSibling && nextSibling.parentNode) {
              targetParent.insertBefore(newTrackElement, nextSibling);
            } else {
              targetParent.appendChild(newTrackElement);
            }
            trackInfo.trackElement = newTrackElement;
          });
          this.player.invalidateTrackCache();
          const setupNewTracks = () => {
            this.player.setManagedTimeout(() => {
              swappedTracks.forEach((trackInfo) => {
                const newTextTrack = trackInfo.trackElement.track;
                if (newTextTrack) {
                  const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                  newTextTrack.mode = "hidden";
                  const restoreMode = () => {
                    if (modeInfo.wasShowing || modeInfo.wasHidden) {
                      newTextTrack.mode = "hidden";
                    } else {
                      newTextTrack.mode = "disabled";
                    }
                  };
                  if (newTextTrack.readyState >= 2) {
                    restoreMode();
                  } else {
                    newTextTrack.addEventListener("load", restoreMode, { once: true });
                    newTextTrack.addEventListener("error", restoreMode, { once: true });
                  }
                }
              });
            }, 300);
          };
          if (this.player.element.readyState >= 1) {
            setTimeout(setupNewTracks, 200);
          } else {
            this.player.element.addEventListener("loadedmetadata", setupNewTracks, { once: true });
            setTimeout(setupNewTracks, 2e3);
          }
          resolve();
        }, 100);
      });
    }
    return swappedTracks;
  }
  /**
   * Update source elements to described versions
   */
  _updateSourceElements(toDescribed = true) {
    const sourceElements = this.player.sourceElements;
    const sourcesToUpdate = [];
    sourceElements.forEach((sourceEl) => {
      const descSrcAttr = sourceEl.getAttribute("data-desc-src");
      const currentSrc = sourceEl.getAttribute("src");
      if (descSrcAttr) {
        const type = sourceEl.getAttribute("type");
        let origSrc = sourceEl.getAttribute("data-orig-src") || currentSrc;
        sourcesToUpdate.push({
          src: toDescribed ? descSrcAttr : origSrc,
          type,
          origSrc,
          descSrc: descSrcAttr
        });
      } else {
        sourcesToUpdate.push({
          src: sourceEl.getAttribute("src"),
          type: sourceEl.getAttribute("type"),
          origSrc: null,
          descSrc: null
        });
      }
    });
    if (this.player.element.hasAttribute("src")) {
      this.player.element.removeAttribute("src");
    }
    sourceElements.forEach((sourceEl) => sourceEl.remove());
    sourcesToUpdate.forEach((sourceInfo) => {
      const newSource = document.createElement("source");
      newSource.setAttribute("src", sourceInfo.src);
      if (sourceInfo.type) {
        newSource.setAttribute("type", sourceInfo.type);
      }
      if (sourceInfo.origSrc) {
        newSource.setAttribute("data-orig-src", sourceInfo.origSrc);
      }
      if (sourceInfo.descSrc) {
        newSource.setAttribute("data-desc-src", sourceInfo.descSrc);
      }
      const firstTrack = this.player.element.querySelector("track");
      if (firstTrack) {
        this.player.element.insertBefore(newSource, firstTrack);
      } else {
        this.player.element.appendChild(newSource);
      }
    });
    this.player._sourceElementsDirty = true;
    this.player._sourceElementsCache = null;
  }
  /**
   * Wait for media to be ready
   */
  async _waitForMediaReady(needSeek = false) {
    await new Promise((resolve) => {
      if (this.player.element.readyState >= 1) {
        resolve();
      } else {
        const onLoad = () => {
          this.player.element.removeEventListener("loadedmetadata", onLoad);
          resolve();
        };
        this.player.element.addEventListener("loadedmetadata", onLoad);
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (needSeek) {
      await new Promise((resolve) => {
        if (this.player.element.readyState >= 3) {
          resolve();
        } else {
          const onCanPlay = () => {
            this.player.element.removeEventListener("canplay", onCanPlay);
            this.player.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          };
          this.player.element.addEventListener("canplay", onCanPlay, { once: true });
          this.player.element.addEventListener("canplaythrough", onCanPlay, { once: true });
          setTimeout(() => {
            this.player.element.removeEventListener("canplay", onCanPlay);
            this.player.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          }, 3e3);
        }
      });
    }
  }
  /**
   * Restore playback state after source change
   */
  async _restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText) {
    let syncTime = currentTime;
    if (currentCaptionText && this.player.captionManager && this.player.captionManager.tracks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const matchingTime = this.player.findMatchingCaptionTime(
        currentCaptionText,
        this.player.captionManager.tracks
      );
      if (matchingTime !== null) {
        syncTime = matchingTime;
        if (this.player.options.debug) {
          this.player.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
        }
      }
    }
    if (syncTime > 0) {
      this.player.seek(syncTime);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (wasPlaying) {
      await this.player.play();
      this.player.setManagedTimeout(() => {
        this.player.hidePosterOverlay();
      }, 100);
    } else {
      this.player.pause();
      if (!shouldKeepPoster) {
        this.player.hidePosterOverlay();
      }
    }
  }
  /**
   * Enable with source element method
   */
  async _enableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText) {
    await this._swapCaptionTracks(true);
    this._updateSourceElements(true);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    this.player.element.load();
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    await this._restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText);
    if (!this.desiredState) return;
    this.enabled = true;
    this.player.state.audioDescriptionEnabled = true;
    this.player.emit("audiodescriptionenabled");
    this._reloadTranscript();
  }
  /**
   * Enable with direct src method
   */
  async _enableWithDirectSrc(currentTime, wasPlaying, posterValue, shouldKeepPoster) {
    await this._swapCaptionTracks(true);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    this.player.element.src = this.src;
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    if (currentTime > 0) {
      this.player.seek(currentTime);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (wasPlaying) {
      await this.player.play();
    } else {
      this.player.pause();
      if (!shouldKeepPoster) {
        this.player.hidePosterOverlay();
      }
    }
    if (!this.desiredState) return;
    this.enabled = true;
    this.player.state.audioDescriptionEnabled = true;
    this.player.emit("audiodescriptionenabled");
    this._reloadTranscript();
  }
  /**
   * Disable with source element method
   */
  async _disableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText) {
    await this._swapCaptionTracks(false);
    this._updateSourceElements(false);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    this.player.element.load();
    this.player.invalidateTrackCache();
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    await this._restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText);
    if (this.player.captionManager) {
      this.player.captionManager.destroy();
      this.player.captionManager = new CaptionManager(this.player);
    }
    if (this.desiredState) return;
    this.enabled = false;
    this.player.state.audioDescriptionEnabled = false;
    this.player.emit("audiodescriptiondisabled");
    this._reloadTranscript();
  }
  /**
   * Disable with direct src method
   */
  async _disableWithDirectSrc(currentTime, wasPlaying, posterValue) {
    await this._swapCaptionTracks(false);
    if (posterValue && this.player.element.tagName === "VIDEO") {
      this.player.element.poster = posterValue;
    }
    const originalSrcToUse = this.originalSource || this.player.originalSrc;
    this.player.element.src = originalSrcToUse;
    this.player.element.load();
    await this._waitForMediaReady(currentTime > 0 || wasPlaying);
    if (currentTime > 0) {
      this.player.seek(currentTime);
    }
    if (wasPlaying) {
      await this.player.play();
    }
    if (this.desiredState) return;
    this.enabled = false;
    this.player.state.audioDescriptionEnabled = false;
    this.player.emit("audiodescriptiondisabled");
    this._reloadTranscript();
  }
  /**
   * Reload transcript after audio description state change
   */
  _reloadTranscript() {
    if (this.player.transcriptManager && this.player.transcriptManager.isVisible) {
      this.player.setManagedTimeout(() => {
        if (this.player.transcriptManager && this.player.transcriptManager.loadTranscriptData) {
          this.player.transcriptManager.loadTranscriptData();
        }
      }, 800);
    }
  }
  /**
   * Update sources (called when playlist changes)
   */
  updateSources(audioDescriptionSrc) {
    this.src = audioDescriptionSrc || null;
    this.enabled = false;
    this.desiredState = false;
    this.sourceElement = null;
    this.originalSource = null;
    this.captionTracks = [];
  }
  /**
   * Reinitialize from current player elements (called after playlist loads new tracks)
   */
  reinitialize() {
    this.player.invalidateTrackCache();
    this.initFromSourceElements(this.player.sourceElements, this.player.trackElements);
  }
  /**
   * Cleanup
   */
  destroy() {
    this.enabled = false;
    this.desiredState = false;
    this.captionTracks = [];
    this.sourceElement = null;
    this.originalSource = null;
  }
};

// src/core/SignLanguageManager.js
var SignLanguageManager = class {
  constructor(player) {
    this.player = player;
    this.src = player.options.signLanguageSrc;
    this.sources = player.options.signLanguageSources || {};
    this.currentLanguage = null;
    this.desiredPosition = player.options.signLanguagePosition || "bottom-right";
    this.wrapper = null;
    this.header = null;
    this.video = null;
    this.selector = null;
    this.settingsButton = null;
    this.settingsMenu = null;
    this.resizeHandles = [];
    this.enabled = false;
    this.inMainView = false;
    this.mainViewOriginalSrc = null;
    this.mainViewOriginalSources = null;
    this._mainViewUsingSourceSwap = false;
    this._mainViewMutedBefore = false;
    this.settingsMenuVisible = false;
    this.settingsMenuJustOpened = false;
    this.documentClickHandlerAdded = false;
    this.handlers = null;
    this.settingsHandlers = null;
    this.interactionHandlers = null;
    this.draggable = null;
    this.documentClickHandler = null;
    this.settingsMenuKeyHandler = null;
    this.customKeyHandler = null;
    this.dragOptionButton = null;
    this.dragOptionText = null;
    this.resizeOptionButton = null;
    this.resizeOptionText = null;
  }
  /**
   * Check if sign language is available
   */
  isAvailable() {
    return Object.keys(this.sources).length > 0 || !!this.src;
  }
  /**
   * Enable sign language video
   */
  enable() {
    const hasMultipleSources = Object.keys(this.sources).length > 0;
    const hasSingleSource = !!this.src;
    if (!hasMultipleSources && !hasSingleSource) {
      console.warn("No sign language video source provided");
      return;
    }
    if (this.wrapper) {
      this.wrapper.style.display = "block";
      this.enabled = true;
      this.player.state.signLanguageEnabled = true;
      this.player.emit("signlanguageenabled");
      this.player.setManagedTimeout(() => {
        if (this.settingsButton && document.contains(this.settingsButton)) {
          this.settingsButton.focus({ preventScroll: true });
        }
      }, 150);
      return;
    }
    let initialLang = null;
    let initialSrc = null;
    if (hasMultipleSources) {
      initialLang = this._determineInitialLanguage();
      initialSrc = this.sources[initialLang];
      this.currentLanguage = initialLang;
    } else {
      initialSrc = this.src;
    }
    this._createWrapper();
    this._createHeader(hasMultipleSources, initialLang);
    this._createVideo(initialSrc);
    this._createResizeHandles();
    this.wrapper.appendChild(this.header);
    this.wrapper.appendChild(this.video);
    this.resizeHandles.forEach((handle) => this.wrapper.appendChild(handle));
    this._applyInitialSize();
    this.player.container.appendChild(this.wrapper);
    requestAnimationFrame(() => {
      this.constrainPosition();
    });
    this.video.currentTime = this.player.state.currentTime;
    if (!this.player.state.paused) {
      this.video.play();
    }
    this._setupInteraction();
    this._setupEventHandlers(hasMultipleSources);
    this.enabled = true;
    this.player.state.signLanguageEnabled = true;
    this.player.emit("signlanguageenabled");
    this.player.setManagedTimeout(() => {
      if (this.settingsButton && document.contains(this.settingsButton)) {
        this.settingsButton.focus({ preventScroll: true });
      }
    }, 150);
  }
  /**
   * Disable sign language video
   */
  disable() {
    if (this.settingsMenuVisible) {
      this.hideSettingsMenu({ focusButton: false });
    }
    if (this.wrapper) {
      this.wrapper.style.display = "none";
    }
    this.enabled = false;
    this.player.state.signLanguageEnabled = false;
    this.player.emit("signlanguagedisabled");
  }
  /**
   * Toggle sign language video
   */
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  /**
   * Enable sign language in main view: replace main video src with sign language URL (like audio description).
   * Same video element, different URL; no overlay.
   */
  async enableInMainView() {
    const hasMultipleSources = Object.keys(this.sources).length > 0;
    const hasSingleSource = !!this.src;
    if (!hasMultipleSources && !hasSingleSource) return;
    if (!this.player.element || this.player.element.tagName !== "VIDEO") return;
    if (this.inMainView) return;
    let signSrc;
    if (hasMultipleSources) {
      const initialLang = this._determineInitialLanguage();
      this.currentLanguage = initialLang;
      signSrc = this.sources[initialLang];
    } else {
      signSrc = this.src;
    }
    const el = this.player.element;
    const currentTime = this.player.state.currentTime;
    const wasPlaying = this.player.state.playing;
    const posterValue = el.poster || el.getAttribute("poster") || this.player.options.poster;
    const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;
    const sourceElements = Array.from(el.querySelectorAll("source"));
    const firstSource = sourceElements[0];
    this.mainViewOriginalSrc = el.currentSrc && el.currentSrc.length > 0 ? el.currentSrc : el.src && el.src.length > 0 ? el.src : firstSource && firstSource.getAttribute("src") ? firstSource.getAttribute("src") : "";
    this._mainViewMutedBefore = this.player.state.muted;
    if (posterValue && shouldKeepPoster && el.tagName === "VIDEO") {
      el.poster = posterValue;
    }
    if (sourceElements.length > 0) {
      this.mainViewOriginalSources = sourceElements;
      this.mainViewOriginalSources.forEach((source) => source.remove());
      const signSource = document.createElement("source");
      signSource.setAttribute("src", signSrc);
      const type = this._inferVideoType(signSrc);
      if (type) {
        signSource.setAttribute("type", type);
      }
      const trackNode = el.querySelector("track");
      if (trackNode) {
        el.insertBefore(signSource, trackNode);
      } else {
        el.appendChild(signSource);
      }
      this._mainViewUsingSourceSwap = true;
    } else {
      el.src = signSrc;
      this._mainViewUsingSourceSwap = false;
    }
    el.muted = true;
    this.player.currentSource = signSrc;
    if (typeof this.player.invalidateTrackCache === "function") {
      this.player.invalidateTrackCache();
    }
    el.load();
    await this._waitForMediaReadyMainView(currentTime > 0 || wasPlaying);
    if (currentTime > 0) {
      this.player.seek(currentTime);
      await new Promise((r) => setTimeout(r, 100));
    }
    if (wasPlaying) {
      await this.player.play();
    } else {
      this.player.pause();
      if (!shouldKeepPoster && this.player.hidePosterOverlay) {
        this.player.hidePosterOverlay();
      }
    }
    this.inMainView = true;
    this.player.state.signLanguageInMainView = true;
    if (this.player.videoWrapper) {
      this.player.videoWrapper.classList.add("vidply-sign-language-main-view-active");
    }
    this.player.emit("signlanguageinmainviewenabled");
  }
  /**
   * Disable sign language in main view: restore main video src.
   */
  async disableInMainView() {
    if (!this.inMainView) return;
    if (!this.mainViewOriginalSrc && !this.mainViewOriginalSources) {
      this.inMainView = false;
      this.player.state.signLanguageInMainView = false;
      if (this.player.videoWrapper) {
        this.player.videoWrapper.classList.remove("vidply-sign-language-main-view-active");
      }
      this.player.emit("signlanguageinmainviewdisabled");
      return;
    }
    const el = this.player.element;
    const currentTime = this.player.state.currentTime;
    const wasPlaying = this.player.state.playing;
    const posterValue = el.poster || el.getAttribute("poster") || this.player.options.poster;
    if (this._mainViewUsingSourceSwap && this.mainViewOriginalSources && this.mainViewOriginalSources.length > 0) {
      Array.from(el.querySelectorAll("source")).forEach((source) => source.remove());
      const trackNode = el.querySelector("track");
      this.mainViewOriginalSources.forEach((source) => {
        if (trackNode) {
          el.insertBefore(source, trackNode);
        } else {
          el.appendChild(source);
        }
      });
      this._mainViewUsingSourceSwap = false;
    } else if (this.mainViewOriginalSrc) {
      el.src = this.mainViewOriginalSrc;
    }
    el.muted = this._mainViewMutedBefore;
    this.player.currentSource = this.mainViewOriginalSrc || el.querySelector("source") && el.querySelector("source").src || "";
    if (typeof this.player.invalidateTrackCache === "function") {
      this.player.invalidateTrackCache();
    }
    el.load();
    await this._waitForMediaReadyMainView(currentTime > 0 || wasPlaying);
    if (currentTime > 0) {
      this.player.seek(currentTime);
    }
    if (wasPlaying) {
      try {
        await this.player.play();
      } catch (e) {
        this.player.log?.("Sign language main view: play after restore failed", e, "warn");
      }
    }
    this.mainViewOriginalSrc = null;
    this.mainViewOriginalSources = null;
    this.inMainView = false;
    this.player.state.signLanguageInMainView = false;
    if (this.player.videoWrapper) {
      this.player.videoWrapper.classList.remove("vidply-sign-language-main-view-active");
    }
    this.player.emit("signlanguageinmainviewdisabled");
  }
  /**
   * Wait for media ready (like AudioDescriptionManager).
   */
  async _waitForMediaReadyMainView(needSeek = false) {
    const el = this.player.element;
    const loadedMetaPromise = new Promise((resolve) => {
      if (el.readyState >= 1) {
        resolve();
        return;
      }
      const onLoad = () => {
        el.removeEventListener("loadedmetadata", onLoad);
        el.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        el.removeEventListener("loadedmetadata", onLoad);
        el.removeEventListener("error", onError);
        resolve();
      };
      el.addEventListener("loadedmetadata", onLoad);
      el.addEventListener("error", onError, { once: true });
    });
    const timeoutPromise = new Promise((r) => setTimeout(r, 1e4));
    await Promise.race([loadedMetaPromise, timeoutPromise]);
    await new Promise((r) => setTimeout(r, 300));
    if (needSeek) {
      await new Promise((resolve) => {
        if (el.readyState >= 3) resolve();
        else {
          const onCanPlay = () => {
            el.removeEventListener("canplay", onCanPlay);
            el.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          };
          el.addEventListener("canplay", onCanPlay, { once: true });
          el.addEventListener("canplaythrough", onCanPlay, { once: true });
          setTimeout(() => {
            el.removeEventListener("canplay", onCanPlay);
            el.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          }, 3e3);
        }
      });
    }
  }
  /**
   * Toggle sign language in main view (src swap, like audio description).
   */
  toggleInMainView() {
    if (this.inMainView) {
      this.disableInMainView();
    } else {
      this.enableInMainView();
    }
  }
  /**
   * Switch to a different sign language
   */
  switchLanguage(langCode) {
    if (!this.sources[langCode]) return;
    this.currentLanguage = langCode;
    if (this.video) {
      const currentTime = this.video.currentTime;
      const wasPlaying = !this.video.paused;
      this.video.src = this.sources[langCode];
      this.video.currentTime = currentTime;
      if (wasPlaying) {
        this.video.play().catch(() => {
        });
      }
    }
    if (this.inMainView && this.player.element && this.player.element.tagName === "VIDEO") {
      const currentTime = this.player.state.currentTime;
      const wasPlaying = this.player.state.playing;
      if (this._mainViewUsingSourceSwap) {
        const signSource = this.player.element.querySelector("source");
        if (signSource) {
          signSource.setAttribute("src", this.sources[langCode]);
          const type = this._inferVideoType(this.sources[langCode]);
          if (type) {
            signSource.setAttribute("type", type);
          }
        }
      } else {
        this.player.element.src = this.sources[langCode];
      }
      this.player.currentSource = this.sources[langCode];
      if (typeof this.player.invalidateTrackCache === "function") {
        this.player.invalidateTrackCache();
      }
      this.player.element.load();
      this._waitForMediaReadyMainView(true).then(() => {
        if (currentTime > 0) this.player.seek(currentTime);
        if (wasPlaying) this.player.play();
      });
    }
    this.player.emit("signlanguagelanguagechanged", langCode);
  }
  _inferVideoType(url) {
    if (!url) return "";
    const cleanUrl = url.split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".mp4")) return "video/mp4";
    if (cleanUrl.endsWith(".webm")) return "video/webm";
    if (cleanUrl.endsWith(".ogv") || cleanUrl.endsWith(".ogg")) return "video/ogg";
    return "";
  }
  /**
   * Get language label
   */
  getLanguageLabel(langCode) {
    const langNames = {
      "en": "English",
      "de": "Deutsch",
      "es": "Español",
      "fr": "Français",
      "it": "Italiano",
      "ja": "日本語",
      "pt": "Português",
      "ar": "العربية",
      "hi": "हिन्दी"
    };
    return langNames[langCode] || langCode.toUpperCase();
  }
  /**
   * Determine initial sign language
   */
  _determineInitialLanguage() {
    if (this.player.captionManager && this.player.captionManager.currentTrack) {
      const captionLang = this.player.captionManager.currentTrack.language?.toLowerCase().split("-")[0];
      if (captionLang && this.sources[captionLang]) {
        return captionLang;
      }
    }
    if (this.player.options.language) {
      const playerLang = this.player.options.language.toLowerCase().split("-")[0];
      if (this.sources[playerLang]) {
        return playerLang;
      }
    }
    return Object.keys(this.sources)[0];
  }
  /**
   * Create wrapper element
   */
  _createWrapper() {
    this.wrapper = document.createElement("div");
    this.wrapper.className = "vidply-sign-language-wrapper";
    this.wrapper.setAttribute("tabindex", "0");
    this.wrapper.setAttribute("aria-label", i18n.t("player.signLanguageDragResize"));
  }
  /**
   * Create header element
   */
  _createHeader(hasMultipleSources, initialLang) {
    const classPrefix = this.player.options.classPrefix;
    this.header = DOMUtils.createElement("div", {
      className: `${classPrefix}-sign-language-header`,
      attributes: { "tabindex": "0" }
    });
    const headerLeft = DOMUtils.createElement("div", {
      className: `${classPrefix}-sign-language-header-left`
    });
    const title = DOMUtils.createElement("h3", {
      textContent: i18n.t("player.signLanguageVideo")
    });
    this._createSettingsButton(headerLeft);
    if (hasMultipleSources) {
      this._createLanguageSelector(headerLeft, initialLang);
    }
    headerLeft.appendChild(title);
    const closeButton = this._createCloseButton();
    this.header.appendChild(headerLeft);
    this.header.appendChild(closeButton);
    this.settingsMenuVisible = false;
    this.settingsMenu = null;
    this.settingsMenuJustOpened = false;
  }
  /**
   * Create settings button
   */
  _createSettingsButton(container) {
    const classPrefix = this.player.options.classPrefix;
    const ariaLabel = i18n.t("player.signLanguageSettings");
    this.settingsButton = DOMUtils.createElement("button", {
      className: `${classPrefix}-sign-language-settings`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel,
        "aria-expanded": "false"
      }
    });
    this.settingsButton.appendChild(createIconElement("settings"));
    DOMUtils.attachTooltip(this.settingsButton, ariaLabel, classPrefix);
    this.settingsHandlers = {
      click: (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.documentClickHandler) {
          this.settingsMenuJustOpened = true;
          setTimeout(() => {
            this.settingsMenuJustOpened = false;
          }, 100);
        }
        if (this.settingsMenuVisible) {
          this.hideSettingsMenu();
        } else {
          this.showSettingsMenu();
        }
      },
      keydown: (e) => {
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          e.stopPropagation();
          this.toggleKeyboardDragMode();
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          e.stopPropagation();
          this.toggleResizeMode();
        } else if (e.key === "Escape" && this.settingsMenuVisible) {
          e.preventDefault();
          e.stopPropagation();
          this.hideSettingsMenu();
        }
      }
    };
    this.settingsButton.addEventListener("click", this.settingsHandlers.click);
    this.settingsButton.addEventListener("keydown", this.settingsHandlers.keydown);
    container.appendChild(this.settingsButton);
  }
  /**
   * Create language selector
   */
  _createLanguageSelector(container, initialLang) {
    const classPrefix = this.player.options.classPrefix;
    const selectId = `${classPrefix}-sign-language-select-${Date.now()}`;
    const options = Object.keys(this.sources).map((langCode) => ({
      value: langCode,
      text: this.getLanguageLabel(langCode),
      selected: langCode === initialLang
    }));
    const { label, select } = createLabeledSelect({
      classPrefix,
      labelClass: `${classPrefix}-sign-language-label`,
      selectClass: `${classPrefix}-sign-language-select`,
      labelText: "settings.language",
      selectId,
      options,
      onChange: (e) => {
        e.stopPropagation();
        this.switchLanguage(e.target.value);
      }
    });
    this.selector = select;
    const selectorWrapper = DOMUtils.createElement("div", {
      className: `${classPrefix}-sign-language-selector-wrapper`
    });
    selectorWrapper.appendChild(label);
    selectorWrapper.appendChild(this.selector);
    preventDragOnElement(selectorWrapper);
    container.appendChild(selectorWrapper);
  }
  /**
   * Create close button
   */
  _createCloseButton() {
    const classPrefix = this.player.options.classPrefix;
    const ariaLabel = i18n.t("player.closeSignLanguage");
    const closeButton = DOMUtils.createElement("button", {
      className: `${classPrefix}-sign-language-close`,
      attributes: {
        "type": "button",
        "aria-label": ariaLabel
      }
    });
    closeButton.appendChild(createIconElement("close"));
    DOMUtils.attachTooltip(closeButton, ariaLabel, classPrefix);
    closeButton.addEventListener("click", () => {
      this.disable();
      if (this.player.controlBar?.controls?.signLanguage) {
        setTimeout(() => {
          this.player.controlBar.controls.signLanguage.focus({ preventScroll: true });
        }, 0);
      }
    });
    return closeButton;
  }
  /**
   * Create video element
   */
  _createVideo(src) {
    this.video = document.createElement("video");
    this.video.className = "vidply-sign-language-video";
    this.video.src = src;
    this.video.setAttribute("aria-label", i18n.t("player.signLanguage"));
    this.video.muted = true;
    this.video.setAttribute("playsinline", "");
  }
  /**
   * Create resize handles
   */
  _createResizeHandles() {
    const classPrefix = this.player.options.classPrefix;
    this.resizeHandles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((dir) => {
      const handle = DOMUtils.createElement("div", {
        className: `${classPrefix}-sign-resize-handle ${classPrefix}-sign-resize-${dir}`,
        attributes: {
          "data-direction": dir,
          "data-vidply-managed-resize": "true",
          "aria-hidden": "true"
        }
      });
      handle.style.display = "none";
      return handle;
    });
  }
  /**
   * Apply initial size
   */
  _applyInitialSize() {
    const saved = this.player.storage.getSignLanguagePreferences();
    if (saved?.size?.width) {
      this.wrapper.style.width = saved.size.width;
    } else {
      this.wrapper.style.width = "280px";
    }
    this.wrapper.style.height = "auto";
  }
  /**
   * Setup interaction (drag and resize)
   */
  _setupInteraction() {
    const isMobile2 = window.innerWidth < 768;
    const isFullscreen = this.player.state.fullscreen;
    if (isMobile2 && !isFullscreen && this.player?.options?.signLanguageDragOnMobile === false) {
      if (this.draggable) {
        this.draggable.destroy();
        this.draggable = null;
      }
      return;
    }
    if (this.draggable) return;
    const classPrefix = this.player.options.classPrefix;
    this.draggable = new DraggableResizable(this.wrapper, {
      // Allow dragging from anywhere on the sign-language window (better for touch).
      // We still block dragging when interacting with controls via `onDragStart` below.
      dragHandle: this.wrapper,
      resizeHandles: this.resizeHandles,
      constrainToViewport: true,
      maintainAspectRatio: true,
      minWidth: 150,
      minHeight: 100,
      classPrefix: `${classPrefix}-sign`,
      keyboardDragKey: "d",
      keyboardResizeKey: "r",
      keyboardStep: 10,
      keyboardStepLarge: 50,
      pointerResizeIndicatorText: i18n.t("player.signLanguageResizeActive"),
      onPointerResizeToggle: (enabled) => {
        this.resizeHandles.forEach((handle) => {
          handle.style.display = enabled ? "block" : "none";
        });
      },
      onDragStart: (e) => {
        if (e.target.closest(`.${classPrefix}-sign-language-close`) || e.target.closest(`.${classPrefix}-sign-language-settings`) || e.target.closest(`.${classPrefix}-sign-language-select`) || e.target.closest(`.${classPrefix}-sign-language-label`) || e.target.closest(`.${classPrefix}-sign-language-settings-menu`)) {
          return false;
        }
        return true;
      }
    });
    this._setupCustomKeyHandler();
    this.interactionHandlers = {
      draggable: this.draggable,
      customKeyHandler: this.customKeyHandler
    };
  }
  /**
   * Setup custom keyboard handler
   */
  _setupCustomKeyHandler() {
    this.customKeyHandler = (e) => {
      const key = e.key.toLowerCase();
      if (this.settingsMenuVisible) return;
      if (key === "home") {
        e.preventDefault();
        e.stopPropagation();
        if (this.draggable) {
          if (this.draggable.pointerResizeMode) {
            this.draggable.disablePointerResizeMode();
          }
          this.draggable.manuallyPositioned = false;
          this.constrainPosition();
        }
        return;
      }
      if (key === "r") {
        e.preventDefault();
        e.stopPropagation();
        if (this.toggleResizeMode()) {
          this.wrapper.focus({ preventScroll: true });
        }
        return;
      }
      if (key === "escape") {
        e.preventDefault();
        e.stopPropagation();
        if (this.draggable?.pointerResizeMode) {
          this.draggable.disablePointerResizeMode();
          return;
        }
        if (this.draggable?.keyboardDragMode) {
          this.draggable.disableKeyboardDragMode();
          return;
        }
        this.disable();
        if (this.player.controlBar?.controls?.signLanguage) {
          setTimeout(() => {
            this.player.controlBar.controls.signLanguage.focus({ preventScroll: true });
          }, 0);
        }
      }
    };
    this.wrapper.addEventListener("keydown", this.customKeyHandler);
  }
  /**
   * Setup event handlers
   */
  _setupEventHandlers(hasMultipleSources) {
    this.handlers = {
      play: () => {
        if (this.video) this.video.play();
      },
      pause: () => {
        if (this.video) this.video.pause();
      },
      timeupdate: () => {
        if (this.video && Math.abs(this.video.currentTime - this.player.state.currentTime) > 0.5) {
          this.video.currentTime = this.player.state.currentTime;
        }
      },
      ratechange: () => {
        if (this.video) this.video.playbackRate = this.player.state.playbackSpeed;
      }
    };
    this.player.on("play", this.handlers.play);
    this.player.on("pause", this.handlers.pause);
    this.player.on("timeupdate", this.handlers.timeupdate);
    this.player.on("ratechange", this.handlers.ratechange);
    if (hasMultipleSources) {
      this.handlers.captionChange = () => {
        if (this.player.captionManager?.currentTrack && this.selector) {
          const captionLang = this.player.captionManager.currentTrack.language?.toLowerCase().split("-")[0];
          if (captionLang && this.sources[captionLang] && this.currentLanguage !== captionLang) {
            this.switchLanguage(captionLang);
            this.selector.value = captionLang;
          }
        }
      };
      this.player.on("captionsenabled", this.handlers.captionChange);
    }
  }
  /**
   * Constrain position within video wrapper
   */
  constrainPosition() {
    if (!this.wrapper || !this.player.videoWrapper) return;
    if (this.draggable?.manuallyPositioned) return;
    if (!this.wrapper.style.width) {
      this.wrapper.style.width = "280px";
    }
    const videoWrapperRect = this.player.videoWrapper.getBoundingClientRect();
    const containerRect = this.player.container.getBoundingClientRect();
    const wrapperRect = this.wrapper.getBoundingClientRect();
    const videoWrapperLeft = videoWrapperRect.left - containerRect.left;
    const videoWrapperTop = videoWrapperRect.top - containerRect.top;
    const videoWrapperWidth = videoWrapperRect.width;
    const videoWrapperHeight = videoWrapperRect.height;
    let wrapperWidth = wrapperRect.width || 280;
    let wrapperHeight = wrapperRect.height || 280 * 9 / 16;
    let left, top;
    const margin = 16;
    const controlsHeight = 95;
    const position = this.desiredPosition || "bottom-right";
    switch (position) {
      case "bottom-right":
        left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
        top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
        break;
      case "bottom-left":
        left = videoWrapperLeft + margin;
        top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
        break;
      case "top-right":
        left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
        top = videoWrapperTop + margin;
        break;
      case "top-left":
        left = videoWrapperLeft + margin;
        top = videoWrapperTop + margin;
        break;
      default:
        left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
        top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
    }
    left = Math.max(videoWrapperLeft, Math.min(left, videoWrapperLeft + videoWrapperWidth - wrapperWidth));
    top = Math.max(videoWrapperTop, Math.min(top, videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight));
    this.wrapper.style.left = `${left}px`;
    this.wrapper.style.top = `${top}px`;
    this.wrapper.style.right = "auto";
    this.wrapper.style.bottom = "auto";
  }
  /**
   * Show settings menu
   */
  showSettingsMenu() {
    this.settingsMenuJustOpened = true;
    setTimeout(() => {
      this.settingsMenuJustOpened = false;
    }, 350);
    this._addDocumentClickHandler();
    if (this.settingsMenu) {
      this.settingsMenu.style.display = "block";
      this.settingsMenuVisible = true;
      this.settingsButton?.setAttribute("aria-expanded", "true");
      this._attachMenuKeyboardNavigation();
      this._positionSettingsMenu();
      this._updateDragOptionState();
      this._updateResizeOptionState();
      focusFirstMenuItem(this.settingsMenu, `.${this.player.options.classPrefix}-sign-language-settings-item`);
      return;
    }
    this._createSettingsMenu();
  }
  /**
   * Hide settings menu
   */
  hideSettingsMenu({ focusButton = true } = {}) {
    if (this.settingsMenu) {
      this.settingsMenu.style.display = "none";
      this.settingsMenuVisible = false;
      this.settingsMenuJustOpened = false;
      if (this.settingsMenuKeyHandler) {
        this.settingsMenu.removeEventListener("keydown", this.settingsMenuKeyHandler);
        this.settingsMenuKeyHandler = null;
      }
      const classPrefix = this.player.options.classPrefix;
      const menuItems = Array.from(this.settingsMenu.querySelectorAll(`.${classPrefix}-sign-language-settings-item`));
      menuItems.forEach((item) => item.setAttribute("tabindex", "-1"));
      if (this.settingsButton) {
        this.settingsButton.setAttribute("aria-expanded", "false");
        if (focusButton) {
          this.settingsButton.focus({ preventScroll: true });
        }
      }
    }
  }
  /**
   * Add document click handler
   */
  _addDocumentClickHandler() {
    if (this.documentClickHandlerAdded) return;
    this.documentClickHandler = (e) => {
      if (this.settingsMenuJustOpened) return;
      if (this.settingsButton && (this.settingsButton === e.target || this.settingsButton.contains(e.target))) {
        return;
      }
      if (this.settingsMenu && this.settingsMenu.contains(e.target)) {
        return;
      }
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", this.documentClickHandler, true);
      this.documentClickHandlerAdded = true;
    }, 300);
  }
  /**
   * Create settings menu
   */
  _createSettingsMenu() {
    const classPrefix = this.player.options.classPrefix;
    this.settingsMenu = DOMUtils.createElement("div", {
      className: `${classPrefix}-sign-language-settings-menu`,
      attributes: { "role": "menu" }
    });
    const dragOption = createMenuItem({
      classPrefix,
      itemClass: `${classPrefix}-sign-language-settings-item`,
      icon: "move",
      label: "player.enableSignDragMode",
      hasTextClass: true,
      onClick: () => {
        this.toggleKeyboardDragMode();
        this.hideSettingsMenu({ focusButton: false });
        if (this.draggable?.keyboardDragMode) {
          setTimeout(() => {
            this.wrapper?.focus?.({ preventScroll: true });
          }, 20);
        }
      }
    });
    dragOption.setAttribute("data-setting", "keyboard-drag");
    dragOption.setAttribute("role", "switch");
    dragOption.setAttribute("aria-checked", "false");
    this._removeTooltipFromMenuItem(dragOption);
    this.dragOptionButton = dragOption;
    this.dragOptionText = dragOption.querySelector(`.${classPrefix}-settings-text`);
    this._updateDragOptionState();
    const resizeOption = createMenuItem({
      classPrefix,
      itemClass: `${classPrefix}-sign-language-settings-item`,
      icon: "resize",
      label: "player.enableSignResizeMode",
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        const enabled = this.toggleResizeMode({ focus: false });
        if (enabled) {
          this.hideSettingsMenu({ focusButton: false });
          setTimeout(() => {
            if (this.wrapper) this.wrapper.focus({ preventScroll: true });
          }, 20);
        } else {
          this.hideSettingsMenu({ focusButton: true });
        }
      }
    });
    resizeOption.setAttribute("role", "switch");
    resizeOption.setAttribute("aria-checked", "false");
    this._removeTooltipFromMenuItem(resizeOption);
    this.resizeOptionButton = resizeOption;
    this.resizeOptionText = resizeOption.querySelector(`.${classPrefix}-settings-text`);
    this._updateResizeOptionState();
    const closeOption = createMenuItem({
      classPrefix,
      itemClass: `${classPrefix}-sign-language-settings-item`,
      icon: "close",
      label: "transcript.closeMenu",
      onClick: () => this.hideSettingsMenu()
    });
    this._removeTooltipFromMenuItem(closeOption);
    this.settingsMenu.appendChild(dragOption);
    this.settingsMenu.appendChild(resizeOption);
    this.settingsMenu.appendChild(closeOption);
    this.settingsMenu.style.visibility = "hidden";
    this.settingsMenu.style.display = "block";
    if (this.settingsButton?.parentNode) {
      this.settingsButton.insertAdjacentElement("afterend", this.settingsMenu);
    } else if (this.wrapper) {
      this.wrapper.appendChild(this.settingsMenu);
    }
    this._positionSettingsMenuImmediate();
    requestAnimationFrame(() => {
      if (this.settingsMenu) {
        this.settingsMenu.style.visibility = "visible";
      }
    });
    this._attachMenuKeyboardNavigation();
    this.settingsMenuVisible = true;
    this.settingsButton?.setAttribute("aria-expanded", "true");
    this._updateDragOptionState();
    this._updateResizeOptionState();
    focusFirstMenuItem(this.settingsMenu, `.${classPrefix}-sign-language-settings-item`);
  }
  /**
   * Remove tooltip from menu item
   */
  _removeTooltipFromMenuItem(item) {
    const classPrefix = this.player.options.classPrefix;
    const tooltip = item.querySelector(`.${classPrefix}-tooltip`);
    if (tooltip) tooltip.remove();
    const buttonText = item.querySelector(`.${classPrefix}-button-text`);
    if (buttonText) buttonText.remove();
  }
  /**
   * Attach menu keyboard navigation
   */
  _attachMenuKeyboardNavigation() {
    if (this.settingsMenuKeyHandler) {
      this.settingsMenu.removeEventListener("keydown", this.settingsMenuKeyHandler);
    }
    this.settingsMenuKeyHandler = attachMenuKeyboardNavigation(
      this.settingsMenu,
      this.settingsButton,
      `.${this.player.options.classPrefix}-sign-language-settings-item`,
      () => this.hideSettingsMenu({ focusButton: true })
    );
  }
  /**
   * Position settings menu immediately
   */
  _positionSettingsMenuImmediate() {
    if (!this.settingsMenu || !this.settingsButton) return;
    const buttonRect = this.settingsButton.getBoundingClientRect();
    const menuRect = this.settingsMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const parentContainer = this.settingsButton.parentElement;
    if (!parentContainer) return;
    const parentRect = parentContainer.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
    const buttonBottom = buttonRect.bottom - parentRect.top;
    const buttonTop = buttonRect.top - parentRect.top;
    const spaceAbove = buttonRect.top;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    let menuTop = buttonBottom + 8;
    let menuBottom = null;
    if (spaceBelow < menuRect.height + 20 && spaceAbove > spaceBelow) {
      menuTop = null;
      const parentHeight = parentRect.bottom - parentRect.top;
      menuBottom = parentHeight - buttonTop + 8;
      this.settingsMenu.classList.add("vidply-menu-above");
    } else {
      this.settingsMenu.classList.remove("vidply-menu-above");
    }
    let menuLeft = buttonCenterX - menuRect.width / 2;
    let menuRight = "auto";
    let transformX = "translateX(0)";
    const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
    if (menuLeftAbsolute < 10) {
      menuLeft = 0;
    } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
      menuLeft = "auto";
      menuRight = 0;
    } else {
      menuLeft = buttonCenterX;
      transformX = "translateX(-50%)";
    }
    if (menuTop !== null) {
      this.settingsMenu.style.top = `${menuTop}px`;
      this.settingsMenu.style.bottom = "auto";
    } else if (menuBottom !== null) {
      this.settingsMenu.style.top = "auto";
      this.settingsMenu.style.bottom = `${menuBottom}px`;
    }
    if (menuLeft !== "auto") {
      this.settingsMenu.style.left = `${menuLeft}px`;
      this.settingsMenu.style.right = "auto";
    } else {
      this.settingsMenu.style.left = "auto";
      this.settingsMenu.style.right = `${menuRight}px`;
    }
    this.settingsMenu.style.transform = transformX;
  }
  /**
   * Position settings menu with RAF
   */
  _positionSettingsMenu() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this._positionSettingsMenuImmediate();
      }, 10);
    });
  }
  /**
   * Toggle keyboard drag mode
   */
  toggleKeyboardDragMode() {
    if (this.draggable) {
      const wasEnabled = this.draggable.keyboardDragMode;
      this.draggable.toggleKeyboardDragMode();
      const isEnabled = this.draggable.keyboardDragMode;
      if (!wasEnabled && isEnabled) {
        this._enableMoveMode();
      }
      this._updateDragOptionState();
    }
  }
  /**
   * Enable move mode visual feedback
   */
  _enableMoveMode() {
    this.wrapper.classList.add(`${this.player.options.classPrefix}-sign-move-mode`);
    this._updateResizeOptionState();
    setTimeout(() => {
      this.wrapper.classList.remove(`${this.player.options.classPrefix}-sign-move-mode`);
    }, 2e3);
  }
  /**
   * Toggle resize mode
   */
  toggleResizeMode({ focus = true } = {}) {
    if (!this.draggable) return false;
    if (this.draggable.pointerResizeMode) {
      this.draggable.disablePointerResizeMode({ focus });
      this._updateResizeOptionState();
      return false;
    }
    this.draggable.enablePointerResizeMode({ focus });
    this._updateResizeOptionState();
    return true;
  }
  /**
   * Update drag option state
   */
  _updateDragOptionState() {
    if (!this.dragOptionButton) return;
    const isEnabled = !!this.draggable?.keyboardDragMode;
    const text = isEnabled ? i18n.t("player.disableSignDragMode") : i18n.t("player.enableSignDragMode");
    const ariaLabel = isEnabled ? i18n.t("player.disableSignDragModeAria") : i18n.t("player.enableSignDragModeAria");
    this.dragOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
    this.dragOptionButton.setAttribute("aria-label", ariaLabel);
    if (this.dragOptionText) {
      this.dragOptionText.textContent = text;
    }
  }
  /**
   * Update resize option state
   */
  _updateResizeOptionState() {
    if (!this.resizeOptionButton) return;
    const isEnabled = !!this.draggable?.pointerResizeMode;
    const text = isEnabled ? i18n.t("player.disableSignResizeMode") : i18n.t("player.enableSignResizeMode");
    const ariaLabel = isEnabled ? i18n.t("player.disableSignResizeModeAria") : i18n.t("player.enableSignResizeModeAria");
    this.resizeOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
    this.resizeOptionButton.setAttribute("aria-label", ariaLabel);
    if (this.resizeOptionText) {
      this.resizeOptionText.textContent = text;
    }
  }
  /**
   * Save preferences
   */
  savePreferences() {
    if (!this.wrapper) return;
    this.player.storage.saveSignLanguagePreferences({
      size: { width: this.wrapper.style.width }
    });
  }
  /**
   * Update sources (called when playlist changes)
   */
  updateSources(signLanguageSrc, signLanguageSources) {
    this.src = signLanguageSrc || null;
    this.sources = signLanguageSources || {};
    this.currentLanguage = null;
  }
  /**
   * Cleanup
   */
  cleanup() {
    if (this.inMainView && this.player.element) {
      const el = this.player.element;
      if (this._mainViewUsingSourceSwap && this.mainViewOriginalSources && this.mainViewOriginalSources.length > 0) {
        Array.from(el.querySelectorAll("source")).forEach((source) => source.remove());
        const trackNode = el.querySelector("track");
        this.mainViewOriginalSources.forEach((source) => {
          if (trackNode) {
            el.insertBefore(source, trackNode);
          } else {
            el.appendChild(source);
          }
        });
        this._mainViewUsingSourceSwap = false;
      } else if (this.mainViewOriginalSrc) {
        el.src = this.mainViewOriginalSrc;
      }
      el.muted = this._mainViewMutedBefore;
      if (typeof this.player.invalidateTrackCache === "function") {
        this.player.invalidateTrackCache();
      }
      el.load();
      this.mainViewOriginalSrc = null;
      this.mainViewOriginalSources = null;
      this.inMainView = false;
      this.player.state.signLanguageInMainView = false;
      if (this.player.videoWrapper) {
        this.player.videoWrapper.classList.remove("vidply-sign-language-main-view-active");
      }
      this.player.emit("signlanguageinmainviewdisabled");
    }
    if (this.settingsMenuVisible) {
      this.hideSettingsMenu({ focusButton: false });
    }
    if (this.documentClickHandler && this.documentClickHandlerAdded) {
      document.removeEventListener("mousedown", this.documentClickHandler, true);
      this.documentClickHandlerAdded = false;
      this.documentClickHandler = null;
    }
    if (this.settingsHandlers && this.settingsButton) {
      this.settingsButton.removeEventListener("click", this.settingsHandlers.click);
      this.settingsButton.removeEventListener("keydown", this.settingsHandlers.keydown);
    }
    this.settingsHandlers = null;
    if (this.handlers) {
      this.player.off("play", this.handlers.play);
      this.player.off("pause", this.handlers.pause);
      this.player.off("timeupdate", this.handlers.timeupdate);
      this.player.off("ratechange", this.handlers.ratechange);
      if (this.handlers.captionChange) {
        this.player.off("captionsenabled", this.handlers.captionChange);
      }
      this.handlers = null;
    }
    if (this.wrapper && this.customKeyHandler) {
      this.wrapper.removeEventListener("keydown", this.customKeyHandler);
    }
    if (this.draggable) {
      if (this.draggable.pointerResizeMode) {
        this.draggable.disablePointerResizeMode();
      }
      this.draggable.destroy();
      this.draggable = null;
    }
    this.interactionHandlers = null;
    if (this.wrapper?.parentNode) {
      if (this.video) {
        this.video.pause();
        this.video.src = "";
      }
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    this.wrapper = null;
    this.video = null;
    this.settingsButton = null;
    this.settingsMenu = null;
  }
  /**
   * Destroy
   */
  destroy() {
    this.cleanup();
    this.enabled = false;
  }
};

// src/core/Player.js
var playerInstanceCounter = 0;
var Player = class _Player extends EventEmitter {
  constructor(element, options = {}) {
    super();
    this.element = typeof element === "string" ? document.querySelector(element) : element;
    if (!this.element) {
      throw new Error("VidPly: Element not found");
    }
    playerInstanceCounter++;
    this.instanceId = playerInstanceCounter;
    if (this.element.tagName !== "VIDEO" && this.element.tagName !== "AUDIO") {
      const mediaType = options.mediaType || "video";
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
      this.element.innerHTML = "";
      this.element.appendChild(mediaElement);
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
      captionsButton: true,
      transcriptButton: true,
      fullscreenButton: true,
      pipButton: false,
      // Seeking
      seekInterval: 10,
      seekIntervalLarge: 30,
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
        "transcript-toggle": ["t"]
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
    this.storage = new StorageManager("vidply");
    const savedPrefs = this.storage.getPlayerPreferences();
    if (savedPrefs) {
      if (savedPrefs.volume !== void 0) this.options.volume = savedPrefs.volume;
      if (savedPrefs.playbackSpeed !== void 0) this.options.playbackSpeed = savedPrefs.playbackSpeed;
      if (savedPrefs.muted !== void 0) this.options.muted = savedPrefs.muted;
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
      captionsEnabled: this.options.captionsDefault,
      currentCaption: null,
      controlsVisible: true,
      audioDescriptionEnabled: false,
      signLanguageEnabled: false,
      signLanguageInMainView: false
    };
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
    this.container = null;
    this.renderer = null;
    this.controlBar = null;
    this.captionManager = null;
    this.keyboardManager = null;
    this.settingsDialog = null;
    this.metadataCueChangeHandler = null;
    this.metadataAlertHandlers = /* @__PURE__ */ new Map();
    this.audioDescriptionManager = new AudioDescriptionManager(this);
    this.signLanguageManager = new SignLanguageManager(this);
    Object.defineProperties(this, {
      signLanguageWrapper: {
        get: () => this.signLanguageManager.wrapper,
        set: (v) => {
          this.signLanguageManager.wrapper = v;
        }
      },
      signLanguageVideo: {
        get: () => this.signLanguageManager.video,
        set: (v) => {
          this.signLanguageManager.video = v;
        }
      },
      signLanguageHeader: {
        get: () => this.signLanguageManager.header,
        set: (v) => {
          this.signLanguageManager.header = v;
        }
      },
      signLanguageSettingsButton: {
        get: () => this.signLanguageManager.settingsButton,
        set: (v) => {
          this.signLanguageManager.settingsButton = v;
        }
      },
      signLanguageSettingsMenu: {
        get: () => this.signLanguageManager.settingsMenu,
        set: (v) => {
          this.signLanguageManager.settingsMenu = v;
        }
      },
      signLanguageSettingsMenuVisible: {
        get: () => this.signLanguageManager.settingsMenuVisible,
        set: (v) => {
          this.signLanguageManager.settingsMenuVisible = v;
        }
      },
      signLanguageDraggable: {
        get: () => this.signLanguageManager.draggable,
        set: (v) => {
          this.signLanguageManager.draggable = v;
        }
      },
      currentSignLanguage: {
        get: () => this.signLanguageManager.currentLanguage,
        set: (v) => {
          this.signLanguageManager.currentLanguage = v;
        }
      }
    });
    this.init();
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
      this.noticeElement.textContent = message;
      this.noticeElement.style.display = "block";
      if (this.noticeTimeout) {
        clearTimeout(this.noticeTimeout);
        this.noticeTimeout = null;
      }
      this.noticeTimeout = setTimeout(() => {
        if (this.noticeElement) {
          this.noticeElement.style.display = "none";
        }
      }, timeout);
    } catch (e) {
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
      const src = this.element.src || this.element.querySelector("source")?.src;
      if (src) {
        await this.initializeRenderer();
      } else {
        this.log("No initial source - waiting for playlist or manual load");
      }
      if (this.options.controls) {
        this.controlBar = new ControlBar(this);
        this.videoWrapper.appendChild(this.controlBar.element);
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
      this.setupResponsiveHandlers();
      if (this.options.startTime > 0) {
        this.seek(this.options.startTime);
      }
      requestAnimationFrame(() => {
        if (this.options.muted) {
          this.mute();
        } else if (this.renderer && this.renderer.media) {
          this.renderer.setMuted(false);
        }
        if (this.options.volume !== 0.8) {
          this.setVolume(this.options.volume);
        } else if (this.renderer && this.renderer.media) {
          this.renderer.setVolume(this.options.volume);
        }
      });
      this.state.ready = true;
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
   * This keeps initial load fast when transcripts are not needed.
   */
  async ensureTranscriptManager() {
    if (this.transcriptManager) {
      return this.transcriptManager;
    }
    if (!this.options.transcript && !this.options.transcriptButton) {
      return null;
    }
    const module = await import("./vidply.TranscriptManager-UWM2WNAV.js");
    const Manager = module.TranscriptManager || module.default;
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
   * Detect language from HTML lang attribute
   * @returns {string|null} Language code if available in translations or as built-in, null otherwise
   */
  detectHtmlLanguage() {
    const htmlLang = document.documentElement.lang || document.documentElement.getAttribute("lang");
    if (!htmlLang) {
      return null;
    }
    const normalizedLang = htmlLang.toLowerCase().split("-")[0];
    if (i18n.translations[normalizedLang]) {
      return normalizedLang;
    }
    if (i18n.builtInLanguageLoaders && i18n.builtInLanguageLoaders[normalizedLang]) {
      return normalizedLang;
    }
    this.log(`Language "${htmlLang}" not available, using English as fallback`);
    return null;
  }
  createContainer() {
    const playerLabel = this.instanceId > 1 ? `${i18n.t("player.label")} ${this.instanceId}` : i18n.t("player.label");
    this.container = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-player`,
      attributes: {
        "role": "application",
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
    this.element.parentNode.insertBefore(this.container, this.element);
    if (this.element.tagName === "AUDIO" && this.options.poster) {
      this.trackArtworkElement = DOMUtils.createElement("div", {
        className: `${this.options.classPrefix}-track-artwork`,
        attributes: {
          "aria-hidden": "true"
        }
      });
      this.trackArtworkElement.style.backgroundImage = `url(${this.options.poster})`;
      this.container.appendChild(this.trackArtworkElement);
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
      const resolvedPoster = this.resolvePosterPath(this.options.poster);
      this.element.poster = resolvedPoster;
    }
    if (this.element.tagName === "VIDEO") {
      this.createPlayButtonOverlay();
    }
    this.element.vidply = this;
    _Player.instances.push(this);
    this.element.style.cursor = "pointer";
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.toggle();
      }
    });
    this.on("play", () => {
      this.state.hasStartedPlayback = true;
      this.hidePosterOverlay();
    });
    this.on("timeupdate", () => {
      if (this.state.currentTime > 0) {
        this.hidePosterOverlay();
      }
    });
    this.element.addEventListener("loadeddata", () => {
      if (this.state.playing || this.state.currentTime > 0) {
        this.hidePosterOverlay();
      }
    }, { once: true });
  }
  createPlayButtonOverlay() {
    this.playButtonOverlay = createPlayOverlay();
    this.playButtonOverlay.addEventListener("click", () => {
      this.toggle();
    });
    this.videoWrapper.appendChild(this.playButtonOverlay);
    this.on("play", () => {
      this.playButtonOverlay.style.opacity = "0";
      this.playButtonOverlay.style.pointerEvents = "none";
    });
    this.on("pause", () => {
      this.playButtonOverlay.style.opacity = "1";
      this.playButtonOverlay.style.pointerEvents = "auto";
      this.positionPlayOverlayOnMobile();
    });
    this.on("ended", () => {
      this.playButtonOverlay.style.opacity = "1";
      this.playButtonOverlay.style.pointerEvents = "auto";
      this.positionPlayOverlayOnMobile();
    });
    this.debouncedPositionPlayOverlay = debounce(() => {
      this.positionPlayOverlayOnMobile();
    }, 150);
    window.addEventListener("resize", this.debouncedPositionPlayOverlay);
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
  positionPlayOverlayOnMobile() {
    if (!this.playButtonOverlay || this.element.tagName !== "VIDEO") {
      return;
    }
    const mobile = isMobile();
    if (!mobile) {
      this.playButtonOverlay.style.top = "";
      return;
    }
    const videoRect = this.element.getBoundingClientRect();
    const wrapperRect = this.videoWrapper.getBoundingClientRect();
    const videoCenter = videoRect.top - wrapperRect.top + videoRect.height / 2;
    this.playButtonOverlay.style.top = `${videoCenter}px`;
  }
  async initializeRenderer() {
    let src = this._pendingSource || this.element.src || this.element.querySelector("source")?.src;
    if (!src) {
      throw new Error("No media source found");
    }
    this.currentSource = src;
    this._pendingSource = null;
    this.audioDescriptionManager.initFromSourceElements(this.sourceElements, this.trackElements);
    if (!this.originalSrc) {
      this.originalSrc = src;
    }
    let rendererClass = HTML5Renderer;
    if (src.includes("youtube.com") || src.includes("youtu.be")) {
      const module = await import("./vidply.YouTubeRenderer-E6F4UGVF.js");
      rendererClass = module.YouTubeRenderer || module.default;
    } else if (src.includes("vimeo.com")) {
      const module = await import("./vidply.VimeoRenderer-SLEBCZTT.js");
      rendererClass = module.VimeoRenderer || module.default;
    } else if (src.includes(".m3u8")) {
      const module = await import("./vidply.HLSRenderer-JX33TBXM.js");
      rendererClass = module.HLSRenderer || module.default;
    } else if (src.includes("soundcloud.com") || src.includes("api.soundcloud.com")) {
      const module = await import("./vidply.SoundCloudRenderer-HCMKXHSX.js");
      rendererClass = module.SoundCloudRenderer || module.default;
    }
    this.log(`Using ${rendererClass?.name || "HTML5Renderer"} renderer`);
    this.renderer = new rendererClass(this);
    await this.renderer.init();
    this.invalidateTrackCache();
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
  /**
   * Convert relative poster path to absolute URL
   * @param {string} posterPath - Poster path (relative or absolute)
   * @returns {string} Absolute URL
   */
  resolvePosterPath(posterPath) {
    if (!posterPath) {
      return posterPath;
    }
    if (posterPath.match(/^(https?:|\/)/)) {
      return posterPath;
    }
    try {
      const posterUrl = new URL(posterPath, window.location.href);
      return posterUrl.href;
    } catch (e) {
      return posterPath;
    }
  }
  /**
   * Generate a poster image from video frame at specified time
   * @param {number} time - Time in seconds (default: 10)
   * @returns {Promise<string|null>} Data URL of the poster image or null if failed
   */
  async generatePosterFromVideo(time = 10) {
    if (this.element.tagName !== "VIDEO") {
      return null;
    }
    const renderer = this.renderer;
    if (!renderer || !renderer.media || renderer.media.tagName !== "VIDEO") {
      return null;
    }
    const video = renderer.media;
    if (!video.duration || video.duration < time) {
      time = Math.min(time, Math.max(1, video.duration * 0.1));
    }
    let videoToUse = video;
    if (this.controlBar && this.controlBar.previewVideo && this.controlBar.previewSupported) {
      videoToUse = this.controlBar.previewVideo;
    }
    const restoreState = videoToUse === video;
    return await captureVideoFrame(videoToUse, time, {
      restoreState,
      quality: 0.9
    });
  }
  /**
   * Auto-generate poster from video if none is provided
   */
  async autoGeneratePoster() {
    const hasPoster = this.element.getAttribute("poster") || this.element.poster || this.options.poster;
    if (hasPoster) {
      return;
    }
    if (this.element.tagName !== "VIDEO") {
      return;
    }
    if (!this.state.duration || this.state.duration === 0) {
      await new Promise((resolve) => {
        const onLoadedMetadata = () => {
          this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        if (this.element.readyState >= 1) {
          resolve();
        } else {
          this.element.addEventListener("loadedmetadata", onLoadedMetadata);
        }
      });
    }
    const posterDataURL = await this.generatePosterFromVideo(10);
    if (posterDataURL) {
      this.element.poster = posterDataURL;
      this.log("Auto-generated poster from video frame at 10 seconds", "info");
      this.showPosterOverlay();
    }
  }
  showPosterOverlay() {
    if (!this.videoWrapper || this.element.tagName !== "VIDEO") {
      return;
    }
    const poster = this.element.getAttribute("poster") || this.element.poster || this.options.poster;
    if (!poster) {
      return;
    }
    const resolvedPoster = poster.startsWith("data:") ? poster : this.resolvePosterPath(poster);
    this.videoWrapper.style.setProperty("--vidply-poster-image", `url("${resolvedPoster}")`);
    this.videoWrapper.classList.add("vidply-forced-poster");
    if (this._isAudioContent && this.container) {
      this.container.classList.add("vidply-audio-content");
    } else if (this.container) {
      this.container.classList.remove("vidply-audio-content");
    }
  }
  hidePosterOverlay() {
    if (!this.videoWrapper) {
      return;
    }
    this.videoWrapper.classList.remove("vidply-forced-poster");
    this.videoWrapper.style.removeProperty("--vidply-poster-image");
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
   * Check if a source URL requires an external renderer (YouTube, Vimeo, SoundCloud, HLS)
   * @param {string} src - Source URL
   * @returns {boolean}
   */
  isExternalRendererUrl(src) {
    if (!src) return false;
    return src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com") || src.includes("soundcloud.com") || src.includes("api.soundcloud.com") || src.includes(".m3u8");
  }
  async load(config) {
    try {
      this.log("Loading new media:", config.src);
      if (this.renderer) {
        this.pause();
      }
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
      this._isAudioContent = config.type && config.type.startsWith("audio/");
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
            const resolvedPoster = this.resolvePosterPath(config.poster);
            this.videoWrapper.style.setProperty("--vidply-poster-image", `url("${resolvedPoster}")`);
            this.videoWrapper.classList.add("vidply-forced-poster");
          }
        } else {
          this.element.poster = this.resolvePosterPath(config.poster);
          if (this.videoWrapper) {
            this.videoWrapper.classList.remove("vidply-forced-poster");
            this.videoWrapper.style.removeProperty("--vidply-poster-image");
          }
        }
      }
      if (config.tracks && config.tracks.length > 0) {
        config.tracks.forEach((trackConfig) => {
          const track = document.createElement("track");
          track.src = trackConfig.src;
          track.kind = trackConfig.kind || "captions";
          track.srclang = trackConfig.srclang || "en";
          track.label = trackConfig.label || trackConfig.srclang;
          if (trackConfig.default) {
            track.default = true;
          }
          if (trackConfig.describedSrc) {
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
      if (shouldChangeRenderer && this.renderer) {
        this.renderer.destroy();
        this.renderer = null;
      }
      if (!this.renderer || shouldChangeRenderer) {
        await this.initializeRenderer();
      } else {
        this.renderer.media = this.element;
        if (this.options.deferLoad) {
          try {
            this.element.preload = this.options.preload || "metadata";
          } catch (e) {
          }
          if (this.renderer) {
            if (typeof this.renderer._didDeferredLoad === "boolean") {
              this.renderer._didDeferredLoad = false;
            }
            if (typeof this.renderer._hlsSourceLoaded === "boolean") {
              this.renderer._hlsSourceLoaded = false;
            }
            if ("_pendingSrc" in this.renderer) {
              this.renderer._pendingSrc = this._pendingSource || this.currentSource || null;
            }
          }
        } else {
          this.element.load();
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
      if (this.captionManager) {
        this.captionManager.destroy();
        this.captionManager = new CaptionManager(this);
      }
      if (this.transcriptManager) {
        const wasTranscriptVisible = this.transcriptManager.isVisible;
        this.transcriptManager.destroy();
        this.transcriptManager = null;
        await this.ensureTranscriptManager();
        if (wasTranscriptVisible && this.controlBar && this.controlBar.hasCaptionTracks()) {
          this.transcriptManager?.showTranscript();
        }
      }
      if (this.controlBar) {
        this.updateControlBar();
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
      this.log("Media loaded successfully");
    } catch (error) {
      this.handleError(error);
    }
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
    } catch (e) {
    }
  }
  /**
   * Check if we need to change renderer type
   * @param {string} src - New source URL
   * @returns {boolean}
   */
  /**
   * Update control bar to refresh button visibility based on available features
   */
  updateControlBar() {
    if (!this.controlBar) return;
    const controlBar = this.controlBar;
    controlBar.element.innerHTML = "";
    controlBar.createControls();
    controlBar.attachEvents();
    controlBar.setupAutoHide();
    controlBar.setupOverflowDetection();
  }
  shouldChangeRenderer(src) {
    if (!this.renderer) return true;
    const isYouTube = src.includes("youtube.com") || src.includes("youtu.be");
    const isVimeo = src.includes("vimeo.com");
    const isHLS = src.includes(".m3u8");
    const isSoundCloud = src.includes("soundcloud.com") || src.includes("api.soundcloud.com");
    const currentRendererName = this.renderer.constructor.name;
    if (isYouTube && currentRendererName !== "YouTubeRenderer") return true;
    if (isVimeo && currentRendererName !== "VimeoRenderer") return true;
    if (isHLS && currentRendererName !== "HLSRenderer") return true;
    if (isSoundCloud && currentRendererName !== "SoundCloudRenderer") return true;
    if (!isYouTube && !isVimeo && !isHLS && !isSoundCloud && currentRendererName !== "HTML5Renderer") return true;
    return false;
  }
  // Playback controls
  play() {
    if (this.renderer) {
      this.renderer.play();
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
  seek(time) {
    if (this.renderer) {
      this.renderer.seek(time);
    }
  }
  seekForward(interval = this.options.seekInterval) {
    this.seek(Math.min(this.state.currentTime + interval, this.state.duration));
  }
  seekBackward(interval = this.options.seekInterval) {
    this.seek(Math.max(this.state.currentTime - interval, 0));
  }
  // Volume controls
  setVolume(volume) {
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
  setPlaybackSpeed(speed) {
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
    if (fullscreenPromise && fullscreenPromise.catch) {
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
    const isInNativeFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (isInNativeFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
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
  // Pseudo-fullscreen fallback for iOS and browsers without Fullscreen API
  _enablePseudoFullscreen() {
    this.state.fullscreen = true;
    this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
    document.body.classList.add("vidply-fullscreen-active");
    this._originalScrollX = window.scrollX || window.pageXOffset;
    this._originalScrollY = window.scrollY || window.pageYOffset;
    this._originalBodyOverflow = document.body.style.overflow;
    this._originalBodyPosition = document.body.style.position;
    this._originalBodyWidth = document.body.style.width;
    this._originalBodyHeight = document.body.style.height;
    this._originalHtmlOverflow = document.documentElement.style.overflow;
    this._originalBodyBackground = document.body.style.background;
    this._originalHtmlBackground = document.documentElement.style.background;
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.background = "#000";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.background = "#000";
    this._originalViewport = document.querySelector('meta[name="viewport"]')?.getAttribute("content");
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    }
    window.scrollTo(0, 0);
    this._makeBackgroundInert();
    this.emit("fullscreenchange", true);
    this.emit("enterfullscreen");
  }
  /**
   * Makes all page content except the fullscreen player inert (non-focusable)
   * This prevents keyboard navigation from focusing on hidden background elements
   */
  _makeBackgroundInert() {
    this._inertElements = [];
    let current = this.container;
    while (current && current !== document.body && current !== document.documentElement) {
      const parent = current.parentElement;
      if (parent) {
        Array.from(parent.children).forEach((sibling) => {
          if (sibling !== current && sibling.nodeType === Node.ELEMENT_NODE && !sibling.hasAttribute("inert") && sibling.tagName !== "SCRIPT" && sibling.tagName !== "STYLE" && sibling.tagName !== "LINK" && sibling.tagName !== "META") {
            sibling.setAttribute("inert", "");
            this._inertElements.push(sibling);
          }
        });
      }
      current = parent;
    }
  }
  /**
   * Restores interactivity to elements that were made inert during fullscreen
   */
  _restoreBackgroundInteractivity() {
    if (this._inertElements) {
      this._inertElements.forEach((el) => {
        el.removeAttribute("inert");
      });
      this._inertElements = [];
    }
  }
  _disablePseudoFullscreen() {
    document.body.classList.remove("vidply-fullscreen-active");
    this._restoreBackgroundInteractivity();
    if (this._originalBodyOverflow !== void 0) {
      document.body.style.overflow = this._originalBodyOverflow;
      delete this._originalBodyOverflow;
    }
    if (this._originalBodyPosition !== void 0) {
      document.body.style.position = this._originalBodyPosition;
      delete this._originalBodyPosition;
    }
    if (this._originalBodyWidth !== void 0) {
      document.body.style.width = this._originalBodyWidth;
      delete this._originalBodyWidth;
    }
    if (this._originalBodyHeight !== void 0) {
      document.body.style.height = this._originalBodyHeight;
      delete this._originalBodyHeight;
    }
    if (this._originalHtmlOverflow !== void 0) {
      document.documentElement.style.overflow = this._originalHtmlOverflow;
      delete this._originalHtmlOverflow;
    }
    if (this._originalBodyBackground !== void 0) {
      document.body.style.background = this._originalBodyBackground;
      delete this._originalBodyBackground;
    }
    if (this._originalHtmlBackground !== void 0) {
      document.documentElement.style.background = this._originalHtmlBackground;
      delete this._originalHtmlBackground;
    }
    if (this._originalViewport !== void 0) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute("content", this._originalViewport);
      }
      delete this._originalViewport;
    }
    if (this._originalScrollX !== void 0 && this._originalScrollY !== void 0) {
      window.scrollTo(this._originalScrollX, this._originalScrollY);
      delete this._originalScrollX;
      delete this._originalScrollY;
    }
    this.emit("exitfullscreen");
  }
  // Picture-in-Picture
  enterPiP() {
    if (this.element.requestPictureInPicture) {
      this.element.requestPictureInPicture();
      this.state.pip = true;
      this.emit("pipchange", true);
    }
  }
  exitPiP() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
      this.state.pip = false;
      this.emit("pipchange", false);
    }
  }
  togglePiP() {
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
   * Check if a track file exists
   * @param {string} url - Track file URL
   * @returns {Promise<boolean>} - True if file exists
   */
  async validateTrackExists(url) {
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-cache" });
      return response.ok;
    } catch (error) {
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
    return this.audioDescriptionManager.enable();
  }
  // Legacy method body preserved for reference - can be removed after testing
  async _legacyEnableAudioDescription() {
    const hasSourceElementsWithDesc = this.sourceElements.some((el) => el.getAttribute("data-desc-src"));
    const hasTracksWithDesc = this.audioDescriptionCaptionTracks.length > 0;
    if (!this.audioDescriptionSrc && !hasSourceElementsWithDesc && !hasTracksWithDesc) {
      console.warn("VidPly: No audio description source, source elements, or tracks provided");
      return;
    }
    const currentTime = this.element.currentTime;
    const wasPlaying = this.state.playing;
    const shouldKeepPoster = !wasPlaying && currentTime === 0;
    let currentCaptionText = null;
    if (this.captionManager && this.captionManager.currentTrack) {
      const track = this.captionManager.currentTrack.track;
      if (track && track.activeCues && track.activeCues.length > 0) {
        const activeCue = track.activeCues[0];
        currentCaptionText = this.stripVTTFormatting(activeCue.text);
      }
    }
    const posterValue = this.resolvePosterPath(
      this.element.getAttribute("poster") || this.element.poster || this.options.poster
    );
    if (shouldKeepPoster) {
      this.showPosterOverlay();
    }
    let swappedTracksForTranscript = [];
    if (this.audioDescriptionSourceElement) {
      const currentSrc = this.element.currentSrc || this.element.src;
      const sourceElements = this.sourceElements;
      let sourceElementToUpdate = null;
      let descSrc = this.audioDescriptionSrc;
      for (const sourceEl of sourceElements) {
        const sourceSrc = sourceEl.getAttribute("src");
        const descSrcAttr = sourceEl.getAttribute("data-desc-src");
        const sourceFilename = sourceSrc ? sourceSrc.split("/").pop() : "";
        const currentFilename = currentSrc ? currentSrc.split("/").pop() : "";
        if (currentSrc && (currentSrc === sourceSrc || currentSrc.includes(sourceSrc) || currentSrc.includes(sourceFilename) || sourceFilename && currentFilename === sourceFilename)) {
          sourceElementToUpdate = sourceEl;
          if (descSrcAttr) {
            descSrc = descSrcAttr;
          } else if (sourceSrc) {
            descSrc = this.audioDescriptionSrc || descSrc;
          }
          break;
        }
      }
      if (!sourceElementToUpdate) {
        sourceElementToUpdate = this.audioDescriptionSourceElement;
        const storedDescSrc = sourceElementToUpdate.getAttribute("data-desc-src");
        if (storedDescSrc) {
          descSrc = storedDescSrc;
        }
      }
      if (this.audioDescriptionCaptionTracks.length > 0) {
        const validationPromises = this.audioDescriptionCaptionTracks.map(async (trackInfo) => {
          if (trackInfo.trackElement && trackInfo.describedSrc) {
            if (trackInfo.explicit === true) {
              try {
                const exists = await this.validateTrackExists(trackInfo.describedSrc);
                return { trackInfo, exists };
              } catch (error) {
                return { trackInfo, exists: false };
              }
            } else {
              return { trackInfo, exists: false };
            }
          }
          return { trackInfo, exists: false };
        });
        const validationResults = await Promise.all(validationPromises);
        const tracksToSwap = validationResults.filter((result) => result.exists);
        if (tracksToSwap.length > 0) {
          const trackModes = /* @__PURE__ */ new Map();
          tracksToSwap.forEach(({ trackInfo }) => {
            const textTrack = trackInfo.trackElement.track;
            if (textTrack) {
              trackModes.set(trackInfo, {
                wasShowing: textTrack.mode === "showing",
                wasHidden: textTrack.mode === "hidden"
              });
            } else {
              trackModes.set(trackInfo, {
                wasShowing: false,
                wasHidden: false
              });
            }
          });
          const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
            const oldSrc = trackInfo.trackElement.getAttribute("src");
            const parent = trackInfo.trackElement.parentNode;
            const nextSibling = trackInfo.trackElement.nextSibling;
            const attributes = {};
            Array.from(trackInfo.trackElement.attributes).forEach((attr) => {
              attributes[attr.name] = attr.value;
            });
            return {
              trackInfo,
              oldSrc,
              parent,
              nextSibling,
              attributes
            };
          });
          tracksToReadd.forEach(({ trackInfo }) => {
            trackInfo.trackElement.remove();
          });
          this.element.load();
          await new Promise((resolve) => {
            setTimeout(() => {
              tracksToReadd.forEach(({ trackInfo, oldSrc, parent, nextSibling, attributes }) => {
                swappedTracksForTranscript.push(trackInfo);
                const newTrackElement = document.createElement("track");
                newTrackElement.setAttribute("src", trackInfo.describedSrc);
                Object.keys(attributes).forEach((attrName) => {
                  if (attrName !== "src" && attrName !== "data-desc-src") {
                    newTrackElement.setAttribute(attrName, attributes[attrName]);
                  }
                });
                if (nextSibling && nextSibling.parentNode) {
                  parent.insertBefore(newTrackElement, nextSibling);
                } else {
                  parent.appendChild(newTrackElement);
                }
                trackInfo.trackElement = newTrackElement;
              });
              this.invalidateTrackCache();
              const setupNewTracks = () => {
                this.setManagedTimeout(() => {
                  swappedTracksForTranscript.forEach((trackInfo) => {
                    const trackElement = trackInfo.trackElement;
                    const newTextTrack = trackElement.track;
                    if (newTextTrack) {
                      const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                      newTextTrack.mode = "hidden";
                      const restoreMode = () => {
                        if (modeInfo.wasShowing) {
                          newTextTrack.mode = "hidden";
                        } else if (modeInfo.wasHidden) {
                          newTextTrack.mode = "hidden";
                        } else {
                          newTextTrack.mode = "disabled";
                        }
                      };
                      if (newTextTrack.readyState >= 2) {
                        restoreMode();
                      } else {
                        newTextTrack.addEventListener("load", restoreMode, { once: true });
                        newTextTrack.addEventListener("error", restoreMode, { once: true });
                      }
                    }
                  });
                }, 300);
              };
              if (this.element.readyState >= 1) {
                setTimeout(setupNewTracks, 200);
              } else {
                this.element.addEventListener("loadedmetadata", setupNewTracks, { once: true });
                setTimeout(setupNewTracks, 2e3);
              }
              resolve();
            }, 100);
          });
          const skippedCount = validationResults.length - tracksToSwap.length;
        }
      }
      const allSourceElements = this.sourceElements;
      const sourcesToUpdate = [];
      allSourceElements.forEach((sourceEl) => {
        const descSrcAttr = sourceEl.getAttribute("data-desc-src");
        const currentSrc2 = sourceEl.getAttribute("src");
        if (descSrcAttr) {
          const type = sourceEl.getAttribute("type");
          let origSrc = sourceEl.getAttribute("data-orig-src");
          if (!origSrc) {
            origSrc = currentSrc2;
          }
          sourcesToUpdate.push({
            src: descSrcAttr,
            // Use described version
            type,
            origSrc,
            descSrc: descSrcAttr
          });
        } else {
          const type = sourceEl.getAttribute("type");
          const src = sourceEl.getAttribute("src");
          sourcesToUpdate.push({
            src,
            type,
            origSrc: null,
            descSrc: null
          });
        }
      });
      const hasSrcAttribute = this.element.hasAttribute("src");
      const srcValue = hasSrcAttribute ? this.element.getAttribute("src") : null;
      if (hasSrcAttribute) {
        this.element.removeAttribute("src");
      }
      allSourceElements.forEach((sourceEl) => {
        sourceEl.remove();
      });
      sourcesToUpdate.forEach((sourceInfo) => {
        const newSource = document.createElement("source");
        newSource.setAttribute("src", sourceInfo.src);
        if (sourceInfo.type) {
          newSource.setAttribute("type", sourceInfo.type);
        }
        if (sourceInfo.origSrc) {
          newSource.setAttribute("data-orig-src", sourceInfo.origSrc);
        }
        if (sourceInfo.descSrc) {
          newSource.setAttribute("data-desc-src", sourceInfo.descSrc);
        }
        const firstTrack = this.element.querySelector("track");
        if (firstTrack) {
          this.element.insertBefore(newSource, firstTrack);
        } else {
          this.element.appendChild(newSource);
        }
      });
      this._sourceElementsDirty = true;
      this._sourceElementsCache = null;
      if (posterValue && this.element.tagName === "VIDEO") {
        this.element.poster = posterValue;
      }
      this.element.load();
      await new Promise((resolve) => {
        const onLoadedMetadata = () => {
          this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        if (this.element.readyState >= 1) {
          resolve();
        } else {
          this.element.addEventListener("loadedmetadata", onLoadedMetadata);
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (currentTime > 0 || wasPlaying) {
        await new Promise((resolve) => {
          const onCanPlay = () => {
            this.element.removeEventListener("canplay", onCanPlay);
            this.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          };
          if (this.element.readyState >= 3) {
            resolve();
          } else {
            this.element.addEventListener("canplay", onCanPlay, { once: true });
            this.element.addEventListener("canplaythrough", onCanPlay, { once: true });
            setTimeout(() => {
              this.element.removeEventListener("canplay", onCanPlay);
              this.element.removeEventListener("canplaythrough", onCanPlay);
              resolve();
            }, 3e3);
          }
        });
      }
      let syncTime2 = currentTime;
      if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
        if (matchingTime !== null) {
          syncTime2 = matchingTime;
          if (this.options.debug) {
            console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime2}s`);
          }
        }
      }
      if (syncTime2 > 0) {
        this.seek(syncTime2);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (wasPlaying) {
        await this.play();
        this.setManagedTimeout(() => {
          this.hidePosterOverlay();
        }, 100);
      } else {
        this.pause();
        if (!shouldKeepPoster) {
          this.hidePosterOverlay();
        }
      }
      if (!this._audioDescriptionDesiredState) {
        return;
      }
      this.state.audioDescriptionEnabled = true;
      this.emit("audiodescriptionenabled");
    } else {
      if (this.audioDescriptionCaptionTracks.length > 0) {
        const validationPromises = this.audioDescriptionCaptionTracks.map(async (trackInfo) => {
          if (trackInfo.trackElement && trackInfo.describedSrc) {
            if (trackInfo.explicit === true) {
              try {
                const exists = await this.validateTrackExists(trackInfo.describedSrc);
                return { trackInfo, exists };
              } catch (error) {
                return { trackInfo, exists: false };
              }
            } else {
              return { trackInfo, exists: false };
            }
          }
          return { trackInfo, exists: false };
        });
        const validationResults = await Promise.all(validationPromises);
        const tracksToSwap = validationResults.filter((result) => result.exists);
        if (tracksToSwap.length > 0) {
          const trackModes = /* @__PURE__ */ new Map();
          tracksToSwap.forEach(({ trackInfo }) => {
            const textTrack = trackInfo.trackElement.track;
            if (textTrack) {
              trackModes.set(trackInfo, {
                wasShowing: textTrack.mode === "showing",
                wasHidden: textTrack.mode === "hidden"
              });
            } else {
              trackModes.set(trackInfo, {
                wasShowing: false,
                wasHidden: false
              });
            }
          });
          const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
            const oldSrc = trackInfo.trackElement.getAttribute("src");
            const parent = trackInfo.trackElement.parentNode;
            const nextSibling = trackInfo.trackElement.nextSibling;
            const attributes = {};
            Array.from(trackInfo.trackElement.attributes).forEach((attr) => {
              attributes[attr.name] = attr.value;
            });
            return {
              trackInfo,
              oldSrc,
              parent,
              nextSibling,
              attributes
            };
          });
          tracksToReadd.forEach(({ trackInfo }) => {
            trackInfo.trackElement.remove();
          });
          this.element.load();
          setTimeout(() => {
            tracksToReadd.forEach(({ trackInfo, oldSrc, parent, nextSibling, attributes }) => {
              swappedTracksForTranscript.push(trackInfo);
              const newTrackElement = document.createElement("track");
              newTrackElement.setAttribute("src", trackInfo.describedSrc);
              Object.keys(attributes).forEach((attrName) => {
                if (attrName !== "src" && attrName !== "data-desc-src") {
                  newTrackElement.setAttribute(attrName, attributes[attrName]);
                }
              });
              const firstChild = parent.firstChild;
              if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE && firstChild.tagName !== "TRACK") {
                parent.insertBefore(newTrackElement, firstChild);
              } else if (nextSibling && nextSibling.parentNode) {
                parent.insertBefore(newTrackElement, nextSibling);
              } else {
                parent.appendChild(newTrackElement);
              }
              trackInfo.trackElement = newTrackElement;
            });
            this.element.load();
            const setupNewTracks = () => {
              setTimeout(() => {
                swappedTracksForTranscript.forEach((trackInfo) => {
                  const trackElement = trackInfo.trackElement;
                  const newTextTrack = trackElement.track;
                  if (newTextTrack) {
                    const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                    newTextTrack.mode = "hidden";
                    const restoreMode = () => {
                      if (modeInfo.wasShowing) {
                        newTextTrack.mode = "hidden";
                      } else if (modeInfo.wasHidden) {
                        newTextTrack.mode = "hidden";
                      } else {
                        newTextTrack.mode = "disabled";
                      }
                    };
                    if (newTextTrack.readyState >= 2) {
                      restoreMode();
                    } else {
                      newTextTrack.addEventListener("load", restoreMode, { once: true });
                      newTextTrack.addEventListener("error", restoreMode, { once: true });
                    }
                  }
                });
              }, 300);
            };
            if (this.element.readyState >= 1) {
              setTimeout(setupNewTracks, 200);
            } else {
              this.element.addEventListener("loadedmetadata", setupNewTracks, { once: true });
              setTimeout(setupNewTracks, 2e3);
            }
          }, 100);
        }
      }
      const fallbackSourceElements = this.sourceElements;
      const hasSourceElementsWithDesc2 = fallbackSourceElements.some((el) => el.getAttribute("data-desc-src"));
      if (hasSourceElementsWithDesc2) {
        const fallbackSourcesToUpdate = [];
        fallbackSourceElements.forEach((sourceEl) => {
          const descSrcAttr = sourceEl.getAttribute("data-desc-src");
          const currentSrc = sourceEl.getAttribute("src");
          if (descSrcAttr) {
            const type = sourceEl.getAttribute("type");
            let origSrc = sourceEl.getAttribute("data-orig-src");
            if (!origSrc) {
              origSrc = currentSrc;
            }
            fallbackSourcesToUpdate.push({
              src: descSrcAttr,
              type,
              origSrc,
              descSrc: descSrcAttr
            });
          } else {
            const type = sourceEl.getAttribute("type");
            const src = sourceEl.getAttribute("src");
            fallbackSourcesToUpdate.push({
              src,
              type,
              origSrc: null,
              descSrc: null
            });
          }
        });
        fallbackSourceElements.forEach((sourceEl) => {
          sourceEl.remove();
        });
        fallbackSourcesToUpdate.forEach((sourceInfo) => {
          const newSource = document.createElement("source");
          newSource.setAttribute("src", sourceInfo.src);
          if (sourceInfo.type) {
            newSource.setAttribute("type", sourceInfo.type);
          }
          if (sourceInfo.origSrc) {
            newSource.setAttribute("data-orig-src", sourceInfo.origSrc);
          }
          if (sourceInfo.descSrc) {
            newSource.setAttribute("data-desc-src", sourceInfo.descSrc);
          }
          this.element.appendChild(newSource);
        });
        if (posterValue && this.element.tagName === "VIDEO") {
          this.element.poster = posterValue;
        }
        this.element.load();
        this.invalidateTrackCache();
      } else {
        if (posterValue && this.element.tagName === "VIDEO") {
          this.element.poster = posterValue;
        }
        this.element.src = this.audioDescriptionSrc;
      }
    }
    await new Promise((resolve) => {
      const onLoadedMetadata = () => {
        this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
        resolve();
      };
      if (this.element.readyState >= 1) {
        resolve();
      } else {
        this.element.addEventListener("loadedmetadata", onLoadedMetadata);
      }
    });
    if (currentTime > 0 || wasPlaying) {
      await new Promise((resolve) => {
        const onCanPlay = () => {
          this.element.removeEventListener("canplay", onCanPlay);
          this.element.removeEventListener("canplaythrough", onCanPlay);
          resolve();
        };
        if (this.element.readyState >= 3) {
          resolve();
        } else {
          this.element.addEventListener("canplay", onCanPlay, { once: true });
          this.element.addEventListener("canplaythrough", onCanPlay, { once: true });
          setTimeout(() => {
            this.element.removeEventListener("canplay", onCanPlay);
            this.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          }, 3e3);
        }
      });
    }
    if (this.element.tagName === "VIDEO" && currentTime === 0 && !wasPlaying) {
      if (this.element.readyState >= 1) {
        this.element.currentTime = 1e-3;
        this.setManagedTimeout(() => {
          this.element.currentTime = 0;
        }, 10);
      }
    }
    let syncTime = currentTime;
    if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
      if (matchingTime !== null) {
        syncTime = matchingTime;
        if (this.options.debug) {
          console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
        }
      }
    }
    if (syncTime > 0) {
      this.seek(syncTime);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (wasPlaying) {
      await this.play();
      this.setManagedTimeout(() => {
        this.hidePosterOverlay();
      }, 100);
    } else {
      this.pause();
      if (!shouldKeepPoster) {
        this.hidePosterOverlay();
      }
    }
    if (swappedTracksForTranscript.length > 0 && this.captionManager) {
      const wasCaptionsEnabled = this.state.captionsEnabled;
      let currentTrackInfo = null;
      if (this.captionManager.currentTrack) {
        const currentTrackIndex = this.captionManager.tracks.findIndex((t) => t.track === this.captionManager.currentTrack.track);
        if (currentTrackIndex >= 0) {
          currentTrackInfo = {
            language: this.captionManager.tracks[currentTrackIndex].language,
            kind: this.captionManager.tracks[currentTrackIndex].kind
          };
        }
      }
      const reloadTracks = () => {
        this.captionManager.tracks = [];
        this.captionManager.loadTracks();
        if (wasCaptionsEnabled && currentTrackInfo && this.captionManager.tracks.length > 0) {
          const matchingTrackIndex = this.captionManager.tracks.findIndex(
            (t) => t.language === currentTrackInfo.language && t.kind === currentTrackInfo.kind
          );
          if (matchingTrackIndex >= 0) {
            const trackToEnable = this.captionManager.tracks[matchingTrackIndex];
            if (trackToEnable.track.readyState >= 2) {
              this.captionManager.enable(matchingTrackIndex);
            } else {
              const onTrackLoad = () => {
                trackToEnable.track.removeEventListener("load", onTrackLoad);
                trackToEnable.track.removeEventListener("error", onTrackLoad);
                if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                  this.captionManager.enable(matchingTrackIndex);
                }
              };
              trackToEnable.track.addEventListener("load", onTrackLoad, { once: true });
              trackToEnable.track.addEventListener("error", onTrackLoad, { once: true });
              trackToEnable.track.mode = "hidden";
              setTimeout(() => {
                if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                  this.captionManager.enable(matchingTrackIndex);
                }
              }, 1e3);
            }
          } else if (this.captionManager.tracks.length > 0) {
            const firstTrack = this.captionManager.tracks[0];
            if (firstTrack.track.readyState >= 2) {
              this.captionManager.enable(0);
            } else {
              const onTrackLoad = () => {
                firstTrack.track.removeEventListener("load", onTrackLoad);
                firstTrack.track.removeEventListener("error", onTrackLoad);
                if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                  this.captionManager.enable(0);
                }
              };
              firstTrack.track.addEventListener("load", onTrackLoad, { once: true });
              firstTrack.track.addEventListener("error", onTrackLoad, { once: true });
              firstTrack.track.mode = "hidden";
              setTimeout(() => {
                if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                  this.captionManager.enable(0);
                }
              }, 1e3);
            }
          }
        }
      };
      setTimeout(reloadTracks, 600);
    }
    if (this.transcriptManager && this.transcriptManager.isVisible) {
      const swappedTracks = typeof swappedTracksForTranscript !== "undefined" ? swappedTracksForTranscript : [];
      if (swappedTracks.length > 0) {
        const onMetadataLoaded = () => {
          this.invalidateTrackCache();
          const allTextTracks = this.textTracks;
          const freshTracks = swappedTracks.map((trackInfo) => {
            const trackEl = trackInfo.trackElement;
            const expectedSrc = trackEl.getAttribute("src");
            const srclang = trackEl.getAttribute("srclang");
            const kind = trackEl.getAttribute("kind");
            let foundTrack = allTextTracks.find((track) => trackEl.track === track);
            if (!foundTrack) {
              foundTrack = allTextTracks.find((track) => {
                if (track.language === srclang && (track.kind === kind || kind === "captions" && track.kind === "subtitles")) {
                  const trackElementForTrack = this.findTrackElement(track);
                  if (trackElementForTrack) {
                    const actualSrc = trackElementForTrack.getAttribute("src");
                    if (actualSrc === expectedSrc) {
                      return true;
                    }
                  }
                }
                return false;
              });
            }
            if (foundTrack) {
              const trackElement = this.findTrackElement(foundTrack);
              if (trackElement && trackElement.getAttribute("src") !== expectedSrc) {
                return null;
              }
            }
            return foundTrack;
          }).filter(Boolean);
          if (freshTracks.length === 0) {
            this.setManagedTimeout(() => {
              if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                this.transcriptManager.loadTranscriptData();
              }
            }, 1e3);
            return;
          }
          freshTracks.forEach((track) => {
            if (track.mode === "disabled") {
              track.mode = "hidden";
            }
          });
          let loadedCount = 0;
          const checkLoaded = () => {
            loadedCount++;
            if (loadedCount >= freshTracks.length) {
              this.setManagedTimeout(() => {
                if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                  this.invalidateTrackCache();
                  const allTextTracks2 = this.textTracks;
                  const swappedTrackSrcs = swappedTracks.map((t) => t.describedSrc);
                  const hasCorrectTracks = freshTracks.some((track) => {
                    const trackEl = this.findTrackElement(track);
                    return trackEl && swappedTrackSrcs.includes(trackEl.getAttribute("src"));
                  });
                  if (hasCorrectTracks || freshTracks.length > 0) {
                    this.transcriptManager.loadTranscriptData();
                  }
                }
              }, 800);
            }
          };
          freshTracks.forEach((track) => {
            if (track.mode === "disabled") {
              track.mode = "hidden";
            }
            const trackElementForTrack = this.findTrackElement(track);
            const actualSrc = trackElementForTrack ? trackElementForTrack.getAttribute("src") : null;
            const expectedTrackInfo = swappedTracks.find((t) => {
              const tEl = t.trackElement;
              return tEl && (tEl.track === track || tEl.getAttribute("srclang") === track.language && tEl.getAttribute("kind") === track.kind);
            });
            const expectedSrc = expectedTrackInfo ? expectedTrackInfo.describedSrc : null;
            if (expectedSrc && actualSrc && actualSrc !== expectedSrc) {
              checkLoaded();
              return;
            }
            if (track.readyState >= 2 && track.cues && track.cues.length > 0) {
              checkLoaded();
            } else {
              if (track.mode === "disabled") {
                track.mode = "hidden";
              }
              const onTrackLoad = () => {
                this.setManagedTimeout(checkLoaded, 300);
              };
              if (track.readyState >= 2) {
                this.setManagedTimeout(() => {
                  if (track.cues && track.cues.length > 0) {
                    checkLoaded();
                  } else {
                    track.addEventListener("load", onTrackLoad, { once: true });
                  }
                }, 100);
              } else {
                track.addEventListener("load", onTrackLoad, { once: true });
                track.addEventListener("error", () => {
                  checkLoaded();
                }, { once: true });
              }
            }
          });
        };
        const waitForTracks = () => {
          this.setManagedTimeout(() => {
            if (this.element.readyState >= 1) {
              onMetadataLoaded();
            } else {
              this.element.addEventListener("loadedmetadata", onMetadataLoaded, { once: true });
              this.setManagedTimeout(onMetadataLoaded, 2e3);
            }
          }, 500);
        };
        waitForTracks();
        setTimeout(() => {
          if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
            this.transcriptManager.loadTranscriptData();
          }
        }, 5e3);
      } else {
        setTimeout(() => {
          if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
            this.transcriptManager.loadTranscriptData();
          }
        }, 800);
      }
    }
    if (!shouldKeepPoster) {
      this.hidePosterOverlay();
    }
    if (!this._audioDescriptionDesiredState) {
      return;
    }
    this.state.audioDescriptionEnabled = true;
    this.emit("audiodescriptionenabled");
  }
  async disableAudioDescription() {
    return this.audioDescriptionManager.disable();
  }
  // Legacy method body preserved for reference - can be removed after testing
  async _legacyDisableAudioDescription() {
    if (!this.originalSrc) {
      return;
    }
    const currentTime = this.element.currentTime;
    const wasPlaying = this.state.playing;
    let currentCaptionText = null;
    if (this.captionManager && this.captionManager.currentTrack) {
      const track = this.captionManager.currentTrack.track;
      if (track && track.activeCues && track.activeCues.length > 0) {
        const activeCue = track.activeCues[0];
        currentCaptionText = this.stripVTTFormatting(activeCue.text);
      }
    }
    const posterValue = this.resolvePosterPath(
      this.element.getAttribute("poster") || this.element.poster || this.options.poster
    );
    let swappedTracksForTranscript = [];
    if (this.audioDescriptionCaptionTracks.length > 0) {
      const tracksToRestore = this.audioDescriptionCaptionTracks.map((trackInfo) => {
        const trackElement = trackInfo.trackElement;
        if (!trackElement || !trackElement.parentNode) {
          return null;
        }
        const parent = trackElement.parentNode;
        const nextSibling = trackElement.nextSibling;
        const attributes = {};
        Array.from(trackElement.attributes).forEach((attr) => {
          attributes[attr.name] = attr.value;
        });
        return {
          trackInfo,
          parent,
          nextSibling,
          attributes
        };
      }).filter(Boolean);
      tracksToRestore.forEach(({ trackInfo }) => {
        if (trackInfo.trackElement && trackInfo.trackElement.parentNode) {
          trackInfo.trackElement.remove();
        }
      });
      this.element.load();
      await new Promise((resolve) => {
        setTimeout(() => {
          tracksToRestore.forEach(({ trackInfo, parent, nextSibling, attributes }) => {
            swappedTracksForTranscript.push(trackInfo);
            const newTrackElement = document.createElement("track");
            newTrackElement.setAttribute("src", trackInfo.originalTrackSrc);
            Object.keys(attributes).forEach((attrName) => {
              if (attrName !== "src" && attrName !== "data-desc-src") {
                newTrackElement.setAttribute(attrName, attributes[attrName]);
              }
            });
            if (trackInfo.describedSrc) {
              newTrackElement.setAttribute("data-desc-src", trackInfo.describedSrc);
            }
            if (nextSibling && nextSibling.parentNode) {
              parent.insertBefore(newTrackElement, nextSibling);
            } else {
              parent.appendChild(newTrackElement);
            }
            trackInfo.trackElement = newTrackElement;
          });
          this.invalidateTrackCache();
          resolve();
        }, 100);
      });
    }
    const allSourceElements = this.sourceElements;
    const hasSourceElementsToSwap = allSourceElements.some((el) => el.getAttribute("data-orig-src"));
    if (hasSourceElementsToSwap) {
      const sourcesToRestore = [];
      allSourceElements.forEach((sourceEl) => {
        const origSrcAttr = sourceEl.getAttribute("data-orig-src");
        const descSrcAttr = sourceEl.getAttribute("data-desc-src");
        if (origSrcAttr) {
          const type = sourceEl.getAttribute("type");
          sourcesToRestore.push({
            src: origSrcAttr,
            // Use original version
            type,
            origSrc: origSrcAttr,
            descSrc: descSrcAttr
            // Keep data-desc-src for future swaps
          });
        } else {
          const type = sourceEl.getAttribute("type");
          const src = sourceEl.getAttribute("src");
          sourcesToRestore.push({
            src,
            type,
            origSrc: null,
            descSrc: descSrcAttr
          });
        }
      });
      const hasSrcAttribute = this.element.hasAttribute("src");
      const srcValue = hasSrcAttribute ? this.element.getAttribute("src") : null;
      if (hasSrcAttribute) {
        this.element.removeAttribute("src");
      }
      allSourceElements.forEach((sourceEl) => {
        sourceEl.remove();
      });
      sourcesToRestore.forEach((sourceInfo) => {
        const newSource = document.createElement("source");
        newSource.setAttribute("src", sourceInfo.src);
        if (sourceInfo.type) {
          newSource.setAttribute("type", sourceInfo.type);
        }
        if (sourceInfo.origSrc) {
          newSource.setAttribute("data-orig-src", sourceInfo.origSrc);
        }
        if (sourceInfo.descSrc) {
          newSource.setAttribute("data-desc-src", sourceInfo.descSrc);
        }
        const firstTrack = this.element.querySelector("track");
        if (firstTrack) {
          this.element.insertBefore(newSource, firstTrack);
        } else {
          this.element.appendChild(newSource);
        }
      });
      this._sourceElementsDirty = true;
      this._sourceElementsCache = null;
      if (posterValue && this.element.tagName === "VIDEO") {
        this.element.poster = posterValue;
      }
      this.element.load();
    } else {
      if (posterValue && this.element.tagName === "VIDEO") {
        this.element.poster = posterValue;
      }
      const originalSrcToUse = this.originalAudioDescriptionSource || this.originalSrc;
      this.element.src = originalSrcToUse;
      this.element.load();
    }
    await new Promise((resolve) => {
      const onLoadedMetadata = () => {
        this.element.removeEventListener("loadedmetadata", onLoadedMetadata);
        resolve();
      };
      if (this.element.readyState >= 1) {
        resolve();
      } else {
        this.element.addEventListener("loadedmetadata", onLoadedMetadata);
      }
    });
    if (currentTime > 0 || wasPlaying) {
      await new Promise((resolve) => {
        const onCanPlay = () => {
          this.element.removeEventListener("canplay", onCanPlay);
          this.element.removeEventListener("canplaythrough", onCanPlay);
          resolve();
        };
        if (this.element.readyState >= 3) {
          resolve();
        } else {
          this.element.addEventListener("canplay", onCanPlay, { once: true });
          this.element.addEventListener("canplaythrough", onCanPlay, { once: true });
          setTimeout(() => {
            this.element.removeEventListener("canplay", onCanPlay);
            this.element.removeEventListener("canplaythrough", onCanPlay);
            resolve();
          }, 3e3);
        }
      });
    }
    let syncTime = currentTime;
    if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
      if (matchingTime !== null) {
        syncTime = matchingTime;
        if (this.options.debug) {
          console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
        }
      }
    }
    if (syncTime > 0) {
      this.seek(syncTime);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (wasPlaying) {
      await this.play();
      this.hidePosterOverlay();
    } else {
      this.pause();
      if (!wasPlaying && syncTime === 0) {
        this.showPosterOverlay();
      } else {
        this.hidePosterOverlay();
      }
    }
    if (swappedTracksForTranscript.length > 0 && this.captionManager) {
      const wasCaptionsEnabled = this.state.captionsEnabled;
      let currentTrackInfo = null;
      if (this.captionManager.currentTrack) {
        const currentTrackIndex = this.captionManager.tracks.findIndex((t) => t.track === this.captionManager.currentTrack.track);
        if (currentTrackIndex >= 0) {
          currentTrackInfo = {
            language: this.captionManager.tracks[currentTrackIndex].language,
            kind: this.captionManager.tracks[currentTrackIndex].kind
          };
        }
      }
      const reloadTracks = () => {
        this.captionManager.tracks = [];
        this.captionManager.loadTracks();
        if (wasCaptionsEnabled && currentTrackInfo && this.captionManager.tracks.length > 0) {
          const matchingTrackIndex = this.captionManager.tracks.findIndex(
            (t) => t.language === currentTrackInfo.language && t.kind === currentTrackInfo.kind
          );
          if (matchingTrackIndex >= 0) {
            const trackToEnable = this.captionManager.tracks[matchingTrackIndex];
            if (trackToEnable.track.readyState >= 2) {
              this.captionManager.enable(matchingTrackIndex);
            } else {
              const onTrackLoad = () => {
                trackToEnable.track.removeEventListener("load", onTrackLoad);
                trackToEnable.track.removeEventListener("error", onTrackLoad);
                if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                  this.captionManager.enable(matchingTrackIndex);
                }
              };
              trackToEnable.track.addEventListener("load", onTrackLoad, { once: true });
              trackToEnable.track.addEventListener("error", onTrackLoad, { once: true });
              trackToEnable.track.mode = "hidden";
              setTimeout(() => {
                if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                  this.captionManager.enable(matchingTrackIndex);
                }
              }, 1e3);
            }
          } else if (this.captionManager.tracks.length > 0) {
            const firstTrack = this.captionManager.tracks[0];
            if (firstTrack.track.readyState >= 2) {
              this.captionManager.enable(0);
            } else {
              const onTrackLoad = () => {
                firstTrack.track.removeEventListener("load", onTrackLoad);
                firstTrack.track.removeEventListener("error", onTrackLoad);
                if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                  this.captionManager.enable(0);
                }
              };
              firstTrack.track.addEventListener("load", onTrackLoad, { once: true });
              firstTrack.track.addEventListener("error", onTrackLoad, { once: true });
              firstTrack.track.mode = "hidden";
              setTimeout(() => {
                if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                  this.captionManager.enable(0);
                }
              }, 1e3);
            }
          }
        }
      };
      setTimeout(reloadTracks, 600);
    }
    if (this.transcriptManager && this.transcriptManager.isVisible) {
      this.setManagedTimeout(() => {
        if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
          this.transcriptManager.loadTranscriptData();
        }
      }, 500);
    }
    if (this._audioDescriptionDesiredState) {
      return;
    }
    this.state.audioDescriptionEnabled = false;
    this.emit("audiodescriptiondisabled");
  }
  async toggleAudioDescription() {
    if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
      this.showNotice(i18n.t("player.startPlaybackForAudioDescription"));
      return;
    }
    if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
      this.audioDescriptionManager.desiredState = !this.audioDescriptionManager.desiredState;
      this.state.audioDescriptionEnabled = this.audioDescriptionManager.desiredState;
      this.emit(this.audioDescriptionManager.desiredState ? "audiodescriptionenabled" : "audiodescriptiondisabled");
      this.play();
      return;
    }
    return this.audioDescriptionManager.toggle();
  }
  // Sign Language (delegated to SignLanguageManager)
  enableSignLanguage() {
    return this.signLanguageManager.enable();
  }
  // Legacy method body preserved for reference - can be removed after testing
  _legacyEnableSignLanguage() {
    const hasMultipleSources = Object.keys(this.signLanguageSources).length > 0;
    const hasSingleSource = !!this.signLanguageSrc;
    if (!hasMultipleSources && !hasSingleSource) {
      console.warn("No sign language video source provided");
      return;
    }
    if (this.signLanguageWrapper) {
      this.signLanguageWrapper.style.display = "block";
      this.state.signLanguageEnabled = true;
      this.emit("signlanguageenabled");
      this.setManagedTimeout(() => {
        if (this.signLanguageSettingsButton && document.contains(this.signLanguageSettingsButton)) {
          this.signLanguageSettingsButton.focus({ preventScroll: true });
        }
      }, 150);
      return;
    }
    let initialLang = null;
    let initialSrc = null;
    if (hasMultipleSources) {
      if (this.captionManager && this.captionManager.currentTrack) {
        const captionLang = this.captionManager.currentTrack.language?.toLowerCase().split("-")[0];
        if (captionLang && this.signLanguageSources[captionLang]) {
          initialLang = captionLang;
          initialSrc = this.signLanguageSources[captionLang];
        }
      }
      if (!initialLang && this.options.language) {
        const playerLang = this.options.language.toLowerCase().split("-")[0];
        if (this.signLanguageSources[playerLang]) {
          initialLang = playerLang;
          initialSrc = this.signLanguageSources[playerLang];
        }
      }
      if (!initialLang) {
        initialLang = Object.keys(this.signLanguageSources)[0];
        initialSrc = this.signLanguageSources[initialLang];
      }
      this.currentSignLanguage = initialLang;
    } else {
      initialSrc = this.signLanguageSrc;
    }
    this.signLanguageWrapper = document.createElement("div");
    this.signLanguageWrapper.className = "vidply-sign-language-wrapper";
    this.signLanguageWrapper.setAttribute("tabindex", "0");
    this.signLanguageWrapper.setAttribute("aria-label", i18n.t("player.signLanguageDragResize"));
    this.signLanguageHeader = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-sign-language-header`,
      attributes: {
        "tabindex": "0"
      }
    });
    const headerLeft = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-sign-language-header-left`
    });
    const title = DOMUtils.createElement("h3", {
      textContent: i18n.t("player.signLanguageVideo")
    });
    const settingsAriaLabel = i18n.t("player.signLanguageSettings");
    this.signLanguageSettingsButton = DOMUtils.createElement("button", {
      className: `${this.options.classPrefix}-sign-language-settings`,
      attributes: {
        "type": "button",
        "aria-label": settingsAriaLabel,
        "aria-expanded": "false"
      }
    });
    this.signLanguageSettingsButton.appendChild(createIconElement("settings"));
    DOMUtils.attachTooltip(this.signLanguageSettingsButton, settingsAriaLabel, this.options.classPrefix);
    this.signLanguageSettingsHandlers = {
      settingsClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.signLanguageDocumentClickHandler) {
          const wasJustOpened = this.signLanguageSettingsMenuJustOpened;
          this.signLanguageSettingsMenuJustOpened = true;
          setTimeout(() => {
            this.signLanguageSettingsMenuJustOpened = wasJustOpened;
          }, 100);
        }
        if (this.signLanguageSettingsMenuVisible) {
          this.hideSignLanguageSettingsMenu();
        } else {
          this.showSignLanguageSettingsMenu();
        }
      },
      settingsKeydown: (e) => {
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          e.stopPropagation();
          this.toggleSignLanguageKeyboardDragMode();
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          e.stopPropagation();
          this.toggleSignLanguageResizeMode();
        } else if (e.key === "Escape" && this.signLanguageSettingsMenuVisible) {
          e.preventDefault();
          e.stopPropagation();
          this.hideSignLanguageSettingsMenu();
        }
      }
    };
    this.signLanguageSettingsButton.addEventListener("click", this.signLanguageSettingsHandlers.settingsClick);
    this.signLanguageSettingsButton.addEventListener("keydown", this.signLanguageSettingsHandlers.settingsKeydown);
    headerLeft.appendChild(this.signLanguageSettingsButton);
    this.signLanguageSelector = null;
    if (hasMultipleSources) {
      const selectId = `${this.options.classPrefix}-sign-language-select-${Date.now()}`;
      const options = Object.keys(this.signLanguageSources).map((langCode) => ({
        value: langCode,
        text: this.getSignLanguageLabel(langCode),
        selected: langCode === initialLang
      }));
      const { label: signLanguageLabel, select: signLanguageSelector } = createLabeledSelect({
        classPrefix: this.options.classPrefix,
        labelClass: `${this.options.classPrefix}-sign-language-label`,
        selectClass: `${this.options.classPrefix}-sign-language-select`,
        labelText: "settings.language",
        selectId,
        options,
        onChange: (e) => {
          e.stopPropagation();
          const selectedLang = e.target.value;
          this.switchSignLanguage(selectedLang);
        }
      });
      this.signLanguageSelector = signLanguageSelector;
      const signLanguageSelectorWrapper = DOMUtils.createElement("div", {
        className: `${this.options.classPrefix}-sign-language-selector-wrapper`
      });
      signLanguageSelectorWrapper.appendChild(signLanguageLabel);
      signLanguageSelectorWrapper.appendChild(this.signLanguageSelector);
      preventDragOnElement(signLanguageSelectorWrapper);
      headerLeft.appendChild(signLanguageSelectorWrapper);
    }
    headerLeft.appendChild(title);
    const closeAriaLabel = i18n.t("player.closeSignLanguage");
    const closeButton = DOMUtils.createElement("button", {
      className: `${this.options.classPrefix}-sign-language-close`,
      attributes: {
        "type": "button",
        "aria-label": closeAriaLabel
      }
    });
    closeButton.appendChild(createIconElement("close"));
    DOMUtils.attachTooltip(closeButton, closeAriaLabel, this.options.classPrefix);
    closeButton.addEventListener("click", () => {
      this.disableSignLanguage();
      if (this.controlBar && this.controlBar.controls && this.controlBar.controls.signLanguage) {
        setTimeout(() => {
          this.controlBar.controls.signLanguage.focus({ preventScroll: true });
        }, 0);
      }
    });
    this.signLanguageHeader.appendChild(headerLeft);
    this.signLanguageHeader.appendChild(closeButton);
    this.signLanguageSettingsMenuVisible = false;
    this.signLanguageSettingsMenu = null;
    this.signLanguageSettingsMenuJustOpened = false;
    this.signLanguageResizeOptionButton = null;
    this.signLanguageResizeOptionText = null;
    this.signLanguageDragOptionButton = null;
    this.signLanguageDragOptionText = null;
    this.signLanguageDocumentClickHandler = null;
    this.signLanguageDocumentClickHandlerAdded = false;
    this.signLanguageVideo = document.createElement("video");
    this.signLanguageVideo.className = "vidply-sign-language-video";
    this.signLanguageVideo.src = initialSrc;
    this.signLanguageVideo.setAttribute("aria-label", i18n.t("player.signLanguage"));
    this.signLanguageVideo.muted = true;
    this.signLanguageVideo.setAttribute("playsinline", "");
    this.signLanguageResizeHandles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((dir) => {
      const handle = DOMUtils.createElement("div", {
        className: `${this.options.classPrefix}-sign-resize-handle ${this.options.classPrefix}-sign-resize-${dir}`,
        attributes: {
          "data-direction": dir,
          "data-vidply-managed-resize": "true",
          "aria-hidden": "true"
        }
      });
      handle.style.display = "none";
      return handle;
    });
    this.signLanguageWrapper.appendChild(this.signLanguageHeader);
    this.signLanguageWrapper.appendChild(this.signLanguageVideo);
    this.signLanguageResizeHandles.forEach((handle) => this.signLanguageWrapper.appendChild(handle));
    const saved = this.storage.getSignLanguagePreferences();
    if (saved && saved.size && saved.size.width) {
      this.signLanguageWrapper.style.width = saved.size.width;
    } else {
      this.signLanguageWrapper.style.width = "280px";
    }
    this.signLanguageWrapper.style.height = "auto";
    this.signLanguageDesiredPosition = this.options.signLanguagePosition || "bottom-right";
    this.container.appendChild(this.signLanguageWrapper);
    requestAnimationFrame(() => {
      this.constrainSignLanguagePosition();
    });
    this.signLanguageVideo.currentTime = this.state.currentTime;
    if (!this.state.paused) {
      this.signLanguageVideo.play();
    }
    this.setupSignLanguageInteraction();
    this.signLanguageHandlers = {
      play: () => {
        if (this.signLanguageVideo) {
          this.signLanguageVideo.play();
        }
      },
      pause: () => {
        if (this.signLanguageVideo) {
          this.signLanguageVideo.pause();
        }
      },
      timeupdate: () => {
        if (this.signLanguageVideo && Math.abs(this.signLanguageVideo.currentTime - this.state.currentTime) > 0.5) {
          this.signLanguageVideo.currentTime = this.state.currentTime;
        }
      },
      ratechange: () => {
        if (this.signLanguageVideo) {
          this.signLanguageVideo.playbackRate = this.state.playbackSpeed;
        }
      }
    };
    this.on("play", this.signLanguageHandlers.play);
    this.on("pause", this.signLanguageHandlers.pause);
    this.on("timeupdate", this.signLanguageHandlers.timeupdate);
    this.on("ratechange", this.signLanguageHandlers.ratechange);
    if (hasMultipleSources) {
      this.signLanguageHandlers.captionChange = () => {
        if (this.captionManager && this.captionManager.currentTrack && this.signLanguageSelector) {
          const captionLang = this.captionManager.currentTrack.language?.toLowerCase().split("-")[0];
          if (captionLang && this.signLanguageSources[captionLang] && this.currentSignLanguage !== captionLang) {
            this.switchSignLanguage(captionLang);
            this.signLanguageSelector.value = captionLang;
          }
        }
      };
      this.on("captionsenabled", this.signLanguageHandlers.captionChange);
    }
    this.state.signLanguageEnabled = true;
    this.emit("signlanguageenabled");
    this.setManagedTimeout(() => {
      if (this.signLanguageSettingsButton && document.contains(this.signLanguageSettingsButton)) {
        this.signLanguageSettingsButton.focus({ preventScroll: true });
      }
    }, 150);
  }
  disableSignLanguage() {
    return this.signLanguageManager.disable();
  }
  toggleSignLanguage() {
    if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
      this.showNotice(i18n.t("player.startPlaybackForSignLanguage"));
      return;
    }
    if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
      const wasEnabled = this.signLanguageManager.enabled;
      const result = this.signLanguageManager.toggle();
      if (!wasEnabled && this.signLanguageManager.enabled) {
        this.play();
      }
      return result;
    }
    return this.signLanguageManager.toggle();
  }
  setupSignLanguageInteraction() {
    return this.signLanguageManager._setupInteraction();
  }
  // Legacy method preserved for reference
  _legacySetupSignLanguageInteraction() {
    if (!this.signLanguageWrapper) return;
    const isMobile2 = window.innerWidth < 768;
    const isFullscreen = this.state.fullscreen;
    if (isMobile2 && !isFullscreen) {
      if (this.signLanguageDraggable) {
        this.signLanguageDraggable.destroy();
        this.signLanguageDraggable = null;
      }
      return;
    }
    if (this.signLanguageDraggable) {
      return;
    }
    this.signLanguageDraggable = new DraggableResizable(this.signLanguageWrapper, {
      dragHandle: this.signLanguageHeader,
      resizeHandles: this.signLanguageResizeHandles,
      constrainToViewport: true,
      maintainAspectRatio: true,
      minWidth: 150,
      minHeight: 100,
      classPrefix: `${this.options.classPrefix}-sign`,
      keyboardDragKey: "d",
      keyboardResizeKey: "r",
      keyboardStep: 10,
      keyboardStepLarge: 50,
      pointerResizeIndicatorText: i18n.t("player.signLanguageResizeActive"),
      onPointerResizeToggle: (enabled) => {
        this.signLanguageResizeHandles.forEach((handle) => {
          handle.style.display = enabled ? "block" : "none";
        });
      },
      onDragStart: (e) => {
        if (e.target.closest(`.${this.options.classPrefix}-sign-language-close`) || e.target.closest(`.${this.options.classPrefix}-sign-language-settings`) || e.target.closest(`.${this.options.classPrefix}-sign-language-select`) || e.target.closest(`.${this.options.classPrefix}-sign-language-label`) || e.target.closest(`.${this.options.classPrefix}-sign-language-settings-menu`)) {
          return false;
        }
        return true;
      }
    });
    this.signLanguageCustomKeyHandler = (e) => {
      const key = e.key.toLowerCase();
      if (this.signLanguageSettingsMenuVisible) {
        return;
      }
      if (key === "home") {
        e.preventDefault();
        e.stopPropagation();
        if (this.signLanguageDraggable) {
          if (this.signLanguageDraggable.pointerResizeMode) {
            this.signLanguageDraggable.disablePointerResizeMode();
          }
          this.signLanguageDraggable.manuallyPositioned = false;
          this.constrainSignLanguagePosition();
        }
        return;
      }
      if (key === "r") {
        e.preventDefault();
        e.stopPropagation();
        const enabled = this.toggleSignLanguageResizeMode();
        if (enabled) {
          this.signLanguageWrapper.focus({ preventScroll: true });
        }
        return;
      }
      if (key === "escape") {
        e.preventDefault();
        e.stopPropagation();
        if (this.signLanguageDraggable && this.signLanguageDraggable.pointerResizeMode) {
          this.signLanguageDraggable.disablePointerResizeMode();
          return;
        }
        if (this.signLanguageDraggable && this.signLanguageDraggable.keyboardDragMode) {
          this.signLanguageDraggable.disableKeyboardDragMode();
          return;
        }
        this.disableSignLanguage();
        if (this.controlBar && this.controlBar.controls && this.controlBar.controls.signLanguage) {
          setTimeout(() => {
            this.controlBar.controls.signLanguage.focus({ preventScroll: true });
          }, 0);
        }
        return;
      }
    };
    this.signLanguageWrapper.addEventListener("keydown", this.signLanguageCustomKeyHandler);
    this.signLanguageInteractionHandlers = {
      draggable: this.signLanguageDraggable,
      headerKeyHandler: this.signLanguageHeaderKeyHandler,
      customKeyHandler: this.signLanguageCustomKeyHandler
    };
  }
  toggleSignLanguageKeyboardDragMode() {
    if (this.signLanguageDraggable) {
      const wasEnabled = this.signLanguageDraggable.keyboardDragMode;
      this.signLanguageDraggable.toggleKeyboardDragMode();
      const isEnabled = this.signLanguageDraggable.keyboardDragMode;
      if (!wasEnabled && isEnabled) {
        this.enableSignLanguageMoveMode();
      }
      this.updateSignLanguageDragOptionState();
    }
  }
  enableSignLanguageMoveMode() {
    this.signLanguageWrapper.classList.add(`${this.options.classPrefix}-sign-move-mode`);
    this.updateSignLanguageResizeOptionState();
    setTimeout(() => {
      this.signLanguageWrapper.classList.remove(`${this.options.classPrefix}-sign-move-mode`);
    }, 2e3);
  }
  toggleSignLanguageResizeMode({ focus = true } = {}) {
    if (!this.signLanguageDraggable) {
      return false;
    }
    if (this.signLanguageDraggable.pointerResizeMode) {
      this.signLanguageDraggable.disablePointerResizeMode({ focus });
      this.updateSignLanguageResizeOptionState();
      return false;
    }
    this.signLanguageDraggable.enablePointerResizeMode({ focus });
    this.updateSignLanguageResizeOptionState();
    return true;
  }
  getSignLanguageLabel(langCode) {
    const langNames = {
      "en": "English",
      "de": "Deutsch",
      "es": "Español",
      "fr": "Français",
      "it": "Italiano",
      "ja": "日本語",
      "pt": "Português",
      "ar": "العربية",
      "hi": "हिन्दी"
    };
    return langNames[langCode] || langCode.toUpperCase();
  }
  switchSignLanguage(langCode) {
    return this.signLanguageManager.switchLanguage(langCode);
  }
  // Legacy method preserved for reference
  _legacySwitchSignLanguage(langCode) {
    if (!this.signLanguageSources[langCode] || !this.signLanguageVideo) {
      return;
    }
    const currentTime = this.signLanguageVideo.currentTime;
    const wasPlaying = !this.signLanguageVideo.paused;
    this.signLanguageVideo.src = this.signLanguageSources[langCode];
    this.currentSignLanguage = langCode;
    this.signLanguageVideo.currentTime = currentTime;
    if (wasPlaying) {
      this.signLanguageVideo.play().catch(() => {
      });
    }
    this.emit("signlanguagelanguagechanged", langCode);
  }
  showSignLanguageSettingsMenu() {
    return this.signLanguageManager.showSettingsMenu();
  }
  // Legacy method preserved for reference
  _legacyShowSignLanguageSettingsMenu() {
    this.signLanguageSettingsMenuJustOpened = true;
    setTimeout(() => {
      this.signLanguageSettingsMenuJustOpened = false;
    }, 350);
    if (!this.signLanguageDocumentClickHandlerAdded) {
      this.signLanguageDocumentClickHandler = (e) => {
        if (this.signLanguageSettingsMenuJustOpened) {
          return;
        }
        if (this.signLanguageSettingsButton && (this.signLanguageSettingsButton === e.target || this.signLanguageSettingsButton.contains(e.target))) {
          return;
        }
        if (this.signLanguageSettingsMenu && this.signLanguageSettingsMenu.contains(e.target)) {
          return;
        }
        if (this.signLanguageSettingsMenuVisible) {
          this.hideSignLanguageSettingsMenu();
        }
      };
      setTimeout(() => {
        document.addEventListener("mousedown", this.signLanguageDocumentClickHandler, true);
        this.signLanguageDocumentClickHandlerAdded = true;
      }, 300);
    }
    if (this.signLanguageSettingsMenu) {
      this.signLanguageSettingsMenu.style.display = "block";
      this.signLanguageSettingsMenuVisible = true;
      if (this.signLanguageSettingsButton) {
        this.signLanguageSettingsButton.setAttribute("aria-expanded", "true");
      }
      this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
        this.signLanguageSettingsMenu,
        this.signLanguageSettingsButton,
        `.${this.options.classPrefix}-sign-language-settings-item`,
        () => this.hideSignLanguageSettingsMenu({ focusButton: true })
      );
      this.positionSignLanguageSettingsMenu();
      this.updateSignLanguageDragOptionState();
      this.updateSignLanguageResizeOptionState();
      focusFirstMenuItem(this.signLanguageSettingsMenu, `.${this.options.classPrefix}-sign-language-settings-item`);
      return;
    }
    this.signLanguageSettingsMenu = DOMUtils.createElement("div", {
      className: `${this.options.classPrefix}-sign-language-settings-menu`,
      attributes: {
        "role": "menu"
      }
    });
    const keyboardDragOption = createMenuItem({
      classPrefix: this.options.classPrefix,
      itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
      icon: "move",
      label: "player.enableSignDragMode",
      hasTextClass: true,
      onClick: () => {
        this.toggleSignLanguageKeyboardDragMode();
        this.hideSignLanguageSettingsMenu();
      }
    });
    keyboardDragOption.setAttribute("role", "switch");
    keyboardDragOption.setAttribute("aria-checked", "false");
    const dragTooltip = keyboardDragOption.querySelector(`.${this.options.classPrefix}-tooltip`);
    if (dragTooltip) dragTooltip.remove();
    const dragButtonText = keyboardDragOption.querySelector(`.${this.options.classPrefix}-button-text`);
    if (dragButtonText) dragButtonText.remove();
    this.signLanguageDragOptionButton = keyboardDragOption;
    this.signLanguageDragOptionText = keyboardDragOption.querySelector(`.${this.options.classPrefix}-settings-text`);
    this.updateSignLanguageDragOptionState();
    const resizeOption = createMenuItem({
      classPrefix: this.options.classPrefix,
      itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
      icon: "resize",
      label: "player.enableSignResizeMode",
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        const enabled = this.toggleSignLanguageResizeMode({ focus: false });
        if (enabled) {
          this.hideSignLanguageSettingsMenu({ focusButton: false });
          setTimeout(() => {
            if (this.signLanguageWrapper) {
              this.signLanguageWrapper.focus({ preventScroll: true });
            }
          }, 20);
        } else {
          this.hideSignLanguageSettingsMenu({ focusButton: true });
        }
      }
    });
    resizeOption.setAttribute("role", "switch");
    resizeOption.setAttribute("aria-checked", "false");
    const resizeTooltip = resizeOption.querySelector(`.${this.options.classPrefix}-tooltip`);
    if (resizeTooltip) resizeTooltip.remove();
    const resizeButtonText = resizeOption.querySelector(`.${this.options.classPrefix}-button-text`);
    if (resizeButtonText) resizeButtonText.remove();
    this.signLanguageResizeOptionButton = resizeOption;
    this.signLanguageResizeOptionText = resizeOption.querySelector(`.${this.options.classPrefix}-settings-text`);
    this.updateSignLanguageResizeOptionState();
    const closeOption = createMenuItem({
      classPrefix: this.options.classPrefix,
      itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
      icon: "close",
      label: "transcript.closeMenu",
      onClick: () => {
        this.hideSignLanguageSettingsMenu();
      }
    });
    const closeTooltip = closeOption.querySelector(`.${this.options.classPrefix}-tooltip`);
    if (closeTooltip) closeTooltip.remove();
    const closeButtonText = closeOption.querySelector(`.${this.options.classPrefix}-button-text`);
    if (closeButtonText) closeButtonText.remove();
    this.signLanguageSettingsMenu.appendChild(keyboardDragOption);
    this.signLanguageSettingsMenu.appendChild(resizeOption);
    this.signLanguageSettingsMenu.appendChild(closeOption);
    this.signLanguageSettingsMenu.style.visibility = "hidden";
    this.signLanguageSettingsMenu.style.display = "block";
    if (this.signLanguageSettingsButton && this.signLanguageSettingsButton.parentNode) {
      this.signLanguageSettingsButton.insertAdjacentElement("afterend", this.signLanguageSettingsMenu);
    } else if (this.signLanguageWrapper) {
      this.signLanguageWrapper.appendChild(this.signLanguageSettingsMenu);
    }
    this.positionSignLanguageSettingsMenuImmediate();
    requestAnimationFrame(() => {
      if (this.signLanguageSettingsMenu) {
        this.signLanguageSettingsMenu.style.visibility = "visible";
      }
    });
    this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
      this.signLanguageSettingsMenu,
      this.signLanguageSettingsButton,
      `.${this.options.classPrefix}-sign-language-settings-item`,
      () => this.hideSignLanguageSettingsMenu({ focusButton: true })
    );
    this.signLanguageSettingsMenuVisible = true;
    if (this.signLanguageSettingsButton) {
      this.signLanguageSettingsButton.setAttribute("aria-expanded", "true");
    }
    this.updateSignLanguageDragOptionState();
    this.updateSignLanguageResizeOptionState();
    focusFirstMenuItem(this.signLanguageSettingsMenu, `.${this.options.classPrefix}-sign-language-settings-item`);
  }
  hideSignLanguageSettingsMenu({ focusButton = true } = {}) {
    return this.signLanguageManager.hideSettingsMenu({ focusButton });
  }
  positionSignLanguageSettingsMenuImmediate() {
    if (!this.signLanguageSettingsMenu || !this.signLanguageSettingsButton) return;
    const buttonRect = this.signLanguageSettingsButton.getBoundingClientRect();
    const menuRect = this.signLanguageSettingsMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const parentContainer = this.signLanguageSettingsButton.parentElement;
    if (!parentContainer) return;
    const parentRect = parentContainer.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
    const buttonBottom = buttonRect.bottom - parentRect.top;
    const buttonTop = buttonRect.top - parentRect.top;
    const spaceAbove = buttonRect.top;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    let menuTop = buttonBottom + 8;
    let menuBottom = null;
    if (spaceBelow < menuRect.height + 20 && spaceAbove > spaceBelow) {
      menuTop = null;
      const parentHeight = parentRect.bottom - parentRect.top;
      menuBottom = parentHeight - buttonTop + 8;
      this.signLanguageSettingsMenu.classList.add("vidply-menu-above");
    } else {
      this.signLanguageSettingsMenu.classList.remove("vidply-menu-above");
    }
    let menuLeft = buttonCenterX - menuRect.width / 2;
    let menuRight = "auto";
    let transformX = "translateX(0)";
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
    if (menuTop !== null) {
      this.signLanguageSettingsMenu.style.top = `${menuTop}px`;
      this.signLanguageSettingsMenu.style.bottom = "auto";
    } else if (menuBottom !== null) {
      this.signLanguageSettingsMenu.style.top = "auto";
      this.signLanguageSettingsMenu.style.bottom = `${menuBottom}px`;
    }
    if (menuLeft !== "auto") {
      this.signLanguageSettingsMenu.style.left = `${menuLeft}px`;
      this.signLanguageSettingsMenu.style.right = "auto";
    } else {
      this.signLanguageSettingsMenu.style.left = "auto";
      this.signLanguageSettingsMenu.style.right = `${menuRight}px`;
    }
    this.signLanguageSettingsMenu.style.transform = transformX;
  }
  positionSignLanguageSettingsMenu() {
    if (!this.signLanguageSettingsMenu || !this.signLanguageSettingsButton || !this.signLanguageWrapper) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.positionSignLanguageSettingsMenuImmediate();
      }, 10);
    });
  }
  attachSignLanguageSettingsMenuKeyboardNavigation() {
    if (!this.signLanguageSettingsMenu) return;
    if (this.signLanguageSettingsMenuKeyHandler) {
      this.signLanguageSettingsMenu.removeEventListener("keydown", this.signLanguageSettingsMenuKeyHandler);
    }
    this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
      this.signLanguageSettingsMenu,
      this.signLanguageSettingsButton,
      `.${this.options.classPrefix}-sign-language-settings-item`,
      () => this.hideSignLanguageSettingsMenu({ focusButton: true })
    );
  }
  updateSignLanguageDragOptionState() {
    if (!this.signLanguageDragOptionButton) {
      return;
    }
    const isEnabled = !!(this.signLanguageDraggable && this.signLanguageDraggable.keyboardDragMode);
    const text = isEnabled ? i18n.t("player.disableSignDragMode") : i18n.t("player.enableSignDragMode");
    const ariaLabel = isEnabled ? i18n.t("player.disableSignDragModeAria") : i18n.t("player.enableSignDragModeAria");
    this.signLanguageDragOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
    this.signLanguageDragOptionButton.setAttribute("aria-label", ariaLabel);
    if (this.signLanguageDragOptionText) {
      this.signLanguageDragOptionText.textContent = text;
    }
  }
  updateSignLanguageResizeOptionState() {
    if (!this.signLanguageResizeOptionButton) {
      return;
    }
    const isEnabled = !!(this.signLanguageDraggable && this.signLanguageDraggable.pointerResizeMode);
    const text = isEnabled ? i18n.t("player.disableSignResizeMode") : i18n.t("player.enableSignResizeMode");
    const ariaLabel = isEnabled ? i18n.t("player.disableSignResizeModeAria") : i18n.t("player.enableSignResizeModeAria");
    this.signLanguageResizeOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
    this.signLanguageResizeOptionButton.setAttribute("aria-label", ariaLabel);
    if (this.signLanguageResizeOptionText) {
      this.signLanguageResizeOptionText.textContent = text;
    }
  }
  constrainSignLanguagePosition() {
    return this.signLanguageManager.constrainPosition();
  }
  saveSignLanguagePreferences() {
    return this.signLanguageManager.savePreferences();
  }
  // Legacy methods preserved for reference - can be removed after testing
  _legacyConstrainSignLanguagePosition() {
    if (!this.signLanguageWrapper || !this.videoWrapper) return;
    if (this.signLanguageDraggable && this.signLanguageDraggable.manuallyPositioned) {
      return;
    }
    if (!this.signLanguageWrapper.style.width || this.signLanguageWrapper.style.width === "") {
      this.signLanguageWrapper.style.width = "280px";
    }
    const videoWrapperRect = this.videoWrapper.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const wrapperRect = this.signLanguageWrapper.getBoundingClientRect();
    const videoWrapperLeft = videoWrapperRect.left - containerRect.left;
    const videoWrapperTop = videoWrapperRect.top - containerRect.top;
    const videoWrapperWidth = videoWrapperRect.width;
    const videoWrapperHeight = videoWrapperRect.height;
    let wrapperWidth = wrapperRect.width || 280;
    let wrapperHeight = wrapperRect.height || 280 * 9 / 16;
    let left, top;
    const margin = 16;
    const controlsHeight = 95;
    const position = this.signLanguageDesiredPosition || "bottom-right";
    switch (position) {
      case "bottom-right":
        left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
        top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
        break;
      case "bottom-left":
        left = videoWrapperLeft + margin;
        top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
        break;
      case "top-right":
        left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
        top = videoWrapperTop + margin;
        break;
      case "top-left":
        left = videoWrapperLeft + margin;
        top = videoWrapperTop + margin;
        break;
      default:
        left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
        top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
    }
    left = Math.max(videoWrapperLeft, Math.min(left, videoWrapperLeft + videoWrapperWidth - wrapperWidth));
    top = Math.max(videoWrapperTop, Math.min(top, videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight));
    this.signLanguageWrapper.style.left = `${left}px`;
    this.signLanguageWrapper.style.top = `${top}px`;
    this.signLanguageWrapper.style.right = "auto";
    this.signLanguageWrapper.style.bottom = "auto";
    this.signLanguageWrapper.classList.remove(...Array.from(this.signLanguageWrapper.classList).filter((c) => c.startsWith("vidply-sign-position-")));
  }
  _legacySaveSignLanguagePreferences() {
    if (!this.signLanguageWrapper) return;
    this.storage.saveSignLanguagePreferences({
      size: {
        width: this.signLanguageWrapper.style.width
        // Height is auto - maintained by aspect ratio
      }
    });
  }
  cleanupSignLanguage() {
    return this.signLanguageManager.cleanup();
  }
  // Settings
  // Settings dialog removed - using individual control buttons instead
  showSettings() {
    console.warn("[VidPly] Settings dialog has been removed. Use individual control buttons (speed, captions, etc.)");
  }
  hideSettings() {
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
  // Error handling
  handleError(error) {
    if (this._switchingRenderer) {
      this.log("Suppressing error during renderer switch:", error, "debug");
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
    if (messages.length > 0) {
      const potentialType = messages[messages.length - 1];
      if (typeof potentialType === "string" && console[potentialType]) {
        type = potentialType;
        messages = messages.slice(0, -1);
      }
    }
    if (messages.length === 0) {
      messages = [""];
    }
    if (typeof console[type] === "function") {
      console[type]("[VidPly]", ...messages);
    } else {
      console.log("[VidPly]", ...messages);
    }
  }
  // Setup responsive handlers
  setupResponsiveHandlers() {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (this.controlBar && typeof this.controlBar.updateControlsForViewport === "function") {
            this.controlBar.updateControlsForViewport(width);
          }
          if (this.transcriptManager && this.transcriptManager.isVisible) {
            this.transcriptManager.positionTranscript();
          }
        }
      });
      this.resizeObserver.observe(this.container);
    } else {
      this.resizeHandler = () => {
        const width = this.container.clientWidth;
        if (this.controlBar && typeof this.controlBar.updateControlsForViewport === "function") {
          this.controlBar.updateControlsForViewport(width);
        }
        if (this.transcriptManager && this.transcriptManager.isVisible) {
          if (!this.transcriptManager.draggableResizable || !this.transcriptManager.draggableResizable.manuallyPositioned) {
            this.transcriptManager.positionTranscript();
          }
        }
      };
      window.addEventListener("resize", this.resizeHandler);
    }
    if (window.matchMedia) {
      this.orientationHandler = (e) => {
        setTimeout(() => {
          if (this.transcriptManager && this.transcriptManager.isVisible) {
            if (!this.transcriptManager.draggableResizable || !this.transcriptManager.draggableResizable.manuallyPositioned) {
              this.transcriptManager.positionTranscript();
            }
          }
        }, 100);
      };
      const orientationQuery = window.matchMedia("(orientation: portrait)");
      if (orientationQuery.addEventListener) {
        orientationQuery.addEventListener("change", this.orientationHandler);
      } else if (orientationQuery.addListener) {
        orientationQuery.addListener(this.orientationHandler);
      }
      this.orientationQuery = orientationQuery;
    }
    this.fullscreenChangeHandler = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (this.state.fullscreen !== isFullscreen) {
        this.state.fullscreen = isFullscreen;
        if (isFullscreen) {
          this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
          document.body.classList.add("vidply-fullscreen-active");
          this._makeBackgroundInert();
        } else {
          this.container.classList.remove(`${this.options.classPrefix}-fullscreen`);
          document.body.classList.remove("vidply-fullscreen-active");
          this._restoreBackgroundInteractivity();
          this._disablePseudoFullscreen();
        }
        this.emit("fullscreenchange", isFullscreen);
        if (this.controlBar) {
          this.controlBar.updateFullscreenButton();
        }
        if (this.signLanguageWrapper && this.signLanguageWrapper.style.display !== "none") {
          const isMobile2 = window.innerWidth < 768;
          if (isMobile2) {
            this.setupSignLanguageInteraction();
          }
          this.setManagedTimeout(() => {
            requestAnimationFrame(() => {
              this.storage.saveSignLanguagePreferences({ size: null });
              this.signLanguageDesiredPosition = "bottom-right";
              this.signLanguageWrapper.style.width = isFullscreen ? "400px" : "280px";
              this.constrainSignLanguagePosition();
            });
          }, 500);
        }
      }
    };
    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
    document.addEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);
    document.addEventListener("mozfullscreenchange", this.fullscreenChangeHandler);
    document.addEventListener("MSFullscreenChange", this.fullscreenChangeHandler);
  }
  // Cleanup
  destroy() {
    this.log("Destroying player");
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
    if (this.playButtonOverlay && this.playButtonOverlay.parentNode) {
      this.playButtonOverlay.remove();
      this.playButtonOverlay = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.orientationQuery && this.orientationHandler) {
      if (this.orientationQuery.removeEventListener) {
        this.orientationQuery.removeEventListener("change", this.orientationHandler);
      } else if (this.orientationQuery.removeListener) {
        this.orientationQuery.removeListener(this.orientationHandler);
      }
      this.orientationQuery = null;
      this.orientationHandler = null;
    }
    if (this.fullscreenChangeHandler) {
      document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler);
      document.removeEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);
      document.removeEventListener("mozfullscreenchange", this.fullscreenChangeHandler);
      document.removeEventListener("MSFullscreenChange", this.fullscreenChangeHandler);
      this.fullscreenChangeHandler = null;
    }
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
    if (this.metadataAlertHandlers && this.metadataAlertHandlers.size > 0) {
      this.metadataAlertHandlers.forEach(({ button, handler }) => {
        if (button && handler) {
          button.removeEventListener("click", handler);
        }
      });
      this.metadataAlertHandlers.clear();
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.insertBefore(this.element, this.container);
      this.container.parentNode.removeChild(this.container);
    }
    this.removeAllListeners();
  }
  /**
   * Setup metadata track handling
   * This enables metadata tracks and listens for cue changes to trigger actions
   */
  setupMetadataHandling() {
    const setupMetadata = () => {
      const textTracks = this.textTracks;
      const metadataTrack = textTracks.find((track) => track.kind === "metadata");
      if (metadataTrack) {
        if (metadataTrack.mode === "disabled") {
          metadataTrack.mode = "hidden";
        }
        if (this.metadataCueChangeHandler) {
          metadataTrack.removeEventListener("cuechange", this.metadataCueChangeHandler);
        }
        this.metadataCueChangeHandler = () => {
          const activeCues = Array.from(metadataTrack.activeCues || []);
          if (activeCues.length > 0) {
            if (this.options.debug) {
              this.log("[Metadata] Active cues:", activeCues.map((c) => ({
                start: c.startTime,
                end: c.endTime,
                text: c.text
              })));
            }
          }
          activeCues.forEach((cue) => {
            this.handleMetadataCue(cue);
          });
        };
        metadataTrack.addEventListener("cuechange", this.metadataCueChangeHandler);
        if (this.options.debug) {
          const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
          this.log("[Metadata] Track enabled,", cueCount, "cues available");
        }
      } else if (this.options.debug) {
        this.log("[Metadata] No metadata track found");
      }
    };
    setupMetadata();
    this.on("loadedmetadata", setupMetadata);
  }
  normalizeMetadataSelector(selector) {
    if (!selector) {
      return null;
    }
    const trimmed = selector.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith(".") || trimmed.startsWith("[")) {
      return trimmed;
    }
    return `#${trimmed}`;
  }
  resolveMetadataConfig(map, key) {
    if (!map || !key) {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    const withoutHash = key.replace(/^#/, "");
    if (Object.prototype.hasOwnProperty.call(map, withoutHash)) {
      return map[withoutHash];
    }
    return null;
  }
  cacheMetadataAlertContent(element, config = {}) {
    if (!element) {
      return;
    }
    const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
    const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
    const titleEl = element.querySelector(titleSelector);
    if (titleEl && !titleEl.dataset.vidplyAlertTitleOriginal) {
      titleEl.dataset.vidplyAlertTitleOriginal = titleEl.textContent.trim();
    }
    const messageEl = element.querySelector(messageSelector);
    if (messageEl && !messageEl.dataset.vidplyAlertMessageOriginal) {
      messageEl.dataset.vidplyAlertMessageOriginal = messageEl.textContent.trim();
    }
  }
  restoreMetadataAlertContent(element, config = {}) {
    if (!element) {
      return;
    }
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
  focusMetadataTarget(target, fallbackElement = null) {
    if (!target || target === "none") {
      return;
    }
    if (target === "alert" && fallbackElement) {
      fallbackElement.focus({ preventScroll: true });
      return;
    }
    if (target === "player") {
      if (this.container) {
        this.container.focus({ preventScroll: true });
      }
      return;
    }
    if (target === "media") {
      this.element.focus({ preventScroll: true });
      return;
    }
    if (target === "playButton") {
      const playButton = this.controlBar?.controls?.playPause;
      if (playButton) {
        playButton.focus({ preventScroll: true });
      }
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
  handleMetadataAlert(selector, options = {}) {
    if (!selector) {
      return;
    }
    const config = this.resolveMetadataConfig(this.options.metadataAlerts, selector) || {};
    const element = options.element || document.querySelector(selector);
    if (!element) {
      if (this.options.debug) {
        this.log("[Metadata] Alert element not found:", selector);
      }
      return;
    }
    if (this.options.debug) {
      this.log("[Metadata] Handling alert", selector, { reason: options.reason, config });
    }
    this.cacheMetadataAlertContent(element, config);
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
    if (shouldReset) {
      this.restoreMetadataAlertContent(element, config);
    }
    const shouldFocus = options.focus !== void 0 ? options.focus : config.focusOnShow ?? options.reason !== "focus";
    if (shouldShow && shouldFocus) {
      if (element.tabIndex === -1 && !element.hasAttribute("tabindex")) {
        element.setAttribute("tabindex", "-1");
      }
      element.focus({ preventScroll: true });
    }
    if (shouldShow && config.autoScroll !== false && options.autoScroll !== false) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
      if (continueButton && !this.metadataAlertHandlers.has(selector)) {
        const handler = () => {
          const hideOnContinue = config.hideOnContinue !== false;
          if (hideOnContinue) {
            const originalDisplay = element.dataset.vidplyAlertOriginalDisplay || "";
            element.style.display = config.hideDisplay || originalDisplay || "none";
            element.setAttribute("aria-hidden", "true");
            element.removeAttribute("data-vidply-alert-active");
          }
          if (config.resume !== false && this.state.paused) {
            this.play();
          }
          const focusTarget = config.focusTarget || "playButton";
          this.setManagedTimeout(() => {
            this.focusMetadataTarget(focusTarget, element);
          }, config.focusDelay ?? 100);
        };
        continueButton.addEventListener("click", handler);
        this.metadataAlertHandlers.set(selector, { button: continueButton, handler });
      }
    }
    return element;
  }
  handleMetadataHashtags(hashtags) {
    if (!Array.isArray(hashtags) || hashtags.length === 0) {
      return;
    }
    const configMap = this.options.metadataHashtags;
    if (!configMap) {
      return;
    }
    hashtags.forEach((tag) => {
      const config = this.resolveMetadataConfig(configMap, tag);
      if (!config) {
        return;
      }
      const selector = this.normalizeMetadataSelector(config.alert || config.selector || config.target);
      if (!selector) {
        return;
      }
      const element = document.querySelector(selector);
      if (!element) {
        if (this.options.debug) {
          this.log("[Metadata] Hashtag target not found:", selector);
        }
        return;
      }
      if (this.options.debug) {
        this.log("[Metadata] Handling hashtag", tag, { selector, config });
      }
      this.cacheMetadataAlertContent(element, config);
      if (config.title) {
        const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
        const titleEl = element.querySelector(titleSelector);
        if (titleEl) {
          titleEl.textContent = config.title;
        }
      }
      if (config.message) {
        const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
        const messageEl = element.querySelector(messageSelector);
        if (messageEl) {
          messageEl.textContent = config.message;
        }
      }
      const show = config.show !== false;
      const focus = config.focus !== void 0 ? config.focus : false;
      this.handleMetadataAlert(selector, {
        element,
        show,
        focus,
        autoScroll: config.autoScroll,
        reason: "hashtag"
      });
    });
  }
  /**
   * Handle individual metadata cues
   * Parses metadata text and emits events or triggers actions
   */
  handleMetadataCue(cue) {
    const text = cue.text.trim();
    if (this.options.debug) {
      this.log("[Metadata] Processing cue:", {
        time: cue.startTime,
        text
      });
    }
    this.emit("metadata", {
      time: cue.startTime,
      endTime: cue.endTime,
      text,
      cue
    });
    if (text.includes("PAUSE")) {
      if (!this.state.paused) {
        if (this.options.debug) {
          this.log("[Metadata] Pausing video at", cue.startTime);
        }
        this.pause();
      }
      this.emit("metadata:pause", { time: cue.startTime, text });
    }
    const focusMatch = text.match(/FOCUS:([\w#-]+)/);
    if (focusMatch) {
      const targetSelector = focusMatch[1];
      const normalizedSelector = this.normalizeMetadataSelector(targetSelector);
      const targetElement = normalizedSelector ? document.querySelector(normalizedSelector) : null;
      if (targetElement) {
        if (this.options.debug) {
          this.log("[Metadata] Focusing element:", normalizedSelector);
        }
        if (targetElement.tabIndex === -1 && !targetElement.hasAttribute("tabindex")) {
          targetElement.setAttribute("tabindex", "-1");
        }
        this.setManagedTimeout(() => {
          targetElement.focus({ preventScroll: true });
        }, 10);
      } else if (this.options.debug) {
        this.log("[Metadata] Element not found:", normalizedSelector || targetSelector);
      }
      this.emit("metadata:focus", {
        time: cue.startTime,
        target: targetSelector,
        selector: normalizedSelector,
        element: targetElement,
        text
      });
      if (normalizedSelector) {
        this.handleMetadataAlert(normalizedSelector, {
          element: targetElement,
          reason: "focus"
        });
      }
    }
    const hashtags = text.match(/#[\w-]+/g);
    if (hashtags) {
      if (this.options.debug) {
        this.log("[Metadata] Hashtags found:", hashtags);
      }
      this.emit("metadata:hashtags", {
        time: cue.startTime,
        hashtags,
        text
      });
      this.handleMetadataHashtags(hashtags);
    }
  }
};
Player.instances = [];

// src/features/PlaylistManager.js
var playlistInstanceCounter = 0;
var PlaylistManager = class {
  constructor(player, options = {}) {
    this.player = player;
    this.tracks = [];
    this.initialTracks = Array.isArray(options.tracks) ? options.tracks : [];
    this.currentIndex = -1;
    this.instanceId = ++playlistInstanceCounter;
    this.uniqueId = `vidply-playlist-${this.instanceId}`;
    this.options = {
      autoAdvance: options.autoAdvance !== false,
      // Default true
      autoPlayFirst: options.autoPlayFirst !== false,
      // Default true - auto-play first track on load
      loop: options.loop || false,
      showPanel: options.showPanel !== false,
      // Default true
      recreatePlayers: options.recreatePlayers || false,
      // New: recreate player for each track type
      ...options
    };
    this.container = null;
    this.playlistPanel = null;
    this.trackInfoElement = null;
    this.navigationFeedback = null;
    this.isPanelVisible = this.options.showPanel !== false;
    this.isChangingTrack = false;
    this.hostElement = options.hostElement || null;
    this.PlayerClass = options.PlayerClass || null;
    this.handleTrackEnd = this.handleTrackEnd.bind(this);
    this.handleTrackError = this.handleTrackError.bind(this);
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
   * @returns {string} - 'audio', 'video', 'youtube', 'vimeo', 'soundcloud', 'hls'
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
    if (src.includes(".m3u8")) {
      return "hls";
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
    if (this.trackInfoElement && this.trackInfoElement.parentNode) {
      this.trackInfoElement.parentNode.removeChild(this.trackInfoElement);
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
      this.player.destroy();
    }
    this.hostElement.innerHTML = "";
    const mediaElement = document.createElement(elementType);
    const preloadValue = preservedPlayerOptions.preload || "metadata";
    mediaElement.setAttribute("preload", preloadValue);
    if (elementType === "video" && track.poster && (mediaType === "video" || mediaType === "hls")) {
      mediaElement.setAttribute("poster", track.poster);
    }
    const isExternalRenderer = ["youtube", "vimeo", "soundcloud", "hls"].includes(mediaType);
    if (!isExternalRenderer) {
      const source = document.createElement("source");
      source.src = track.src;
      if (track.type) {
        source.type = track.type;
      }
      mediaElement.appendChild(source);
      if (track.tracks && track.tracks.length > 0) {
        track.tracks.forEach((trackConfig) => {
          const trackEl = document.createElement("track");
          trackEl.src = trackConfig.src;
          trackEl.kind = trackConfig.kind || "captions";
          trackEl.srclang = trackConfig.srclang || "en";
          trackEl.label = trackConfig.label || trackConfig.srclang;
          if (trackConfig.default) {
            trackEl.default = true;
          }
          mediaElement.appendChild(trackEl);
        });
      }
    }
    this.hostElement.appendChild(mediaElement);
    const playerOptions = {
      mediaType: elementType,
      poster: track.poster,
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      audioDescriptionDuration: track.audioDescriptionDuration || null,
      signLanguageSrc: track.signLanguageSrc || null
    };
    Object.assign(playerOptions, preservedPlayerOptions);
    this.player = new this.PlayerClass(mediaElement, playerOptions);
    this.player.playlistManager = this;
    await new Promise((resolve) => {
      this.player.on("ready", resolve);
    });
    this.player.on("ended", this.handleTrackEnd);
    this.player.on("error", this.handleTrackError);
    if (this.player.container) {
      if (this.trackArtworkElement) {
        const videoWrapper = this.player.container.querySelector(".vidply-video-wrapper");
        if (videoWrapper) {
          this.player.container.insertBefore(this.trackArtworkElement, videoWrapper);
        } else {
          this.player.container.appendChild(this.trackArtworkElement);
        }
      }
      if (this.trackInfoElement) {
        this.player.container.appendChild(this.trackInfoElement);
      }
      if (this.navigationFeedback) {
        this.player.container.appendChild(this.navigationFeedback);
      }
      if (this.playlistPanel) {
        this.player.container.appendChild(this.playlistPanel);
      }
    }
    this.container = this.player.container;
    this.updatePlayerControls();
    this.tracks = savedTracks;
    this.currentIndex = savedIndex;
    this.updatePlaylistUI();
    this.isPanelVisible = wasVisible;
    if (this.playlistPanel) {
      this.playlistPanel.style.display = wasVisible ? "" : "none";
    }
    if (isExternalRenderer) {
      this.player.load({
        src: track.src,
        type: track.type,
        poster: track.poster,
        tracks: track.tracks || [],
        audioDescriptionSrc: track.audioDescriptionSrc || null,
        signLanguageSrc: track.signLanguageSrc || null
      });
    } else {
      this.player.load({
        src: track.src,
        type: track.type,
        poster: track.poster,
        tracks: track.tracks || [],
        audioDescriptionSrc: track.audioDescriptionSrc || null,
        signLanguageSrc: track.signLanguageSrc || null
      });
    }
    if (autoPlay) {
      setTimeout(() => {
        this.player.play();
      }, 100);
    }
    return true;
  }
  init() {
    this.player.on("ended", this.handleTrackEnd);
    this.player.on("error", this.handleTrackError);
    this.player.on("play", this.handlePlaybackStateChange.bind(this));
    this.player.on("pause", this.handlePlaybackStateChange.bind(this));
    this.player.on("ended", this.handlePlaybackStateChange.bind(this));
    this.player.on("fullscreenchange", this.handleFullscreenChange.bind(this));
    this.player.on("audiodescriptionenabled", this.handleAudioDescriptionChange.bind(this));
    this.player.on("audiodescriptiondisabled", this.handleAudioDescriptionChange.bind(this));
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
      console.log("VidPly Playlist: No player element found");
      return;
    }
    const videoWrapper = this.player.element.parentElement;
    const playerContainer = videoWrapper.parentElement;
    const originalElement = playerContainer ? playerContainer.parentElement : null;
    if (!originalElement) {
      console.log("VidPly Playlist: No original element found");
      return;
    }
    this.loadOptionsFromAttributes(originalElement);
    const playlistData = originalElement.getAttribute("data-playlist");
    if (!playlistData) {
      console.log("VidPly Playlist: No data-playlist attribute found");
      return;
    }
    console.log("VidPly Playlist: Found data-playlist attribute, parsing...");
    try {
      const tracks = JSON.parse(playlistData);
      if (Array.isArray(tracks) && tracks.length > 0) {
        console.log(`VidPly Playlist: Loaded ${tracks.length} tracks from data-playlist`);
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
    console.log("VidPly Playlist: Options from attributes:", this.options);
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
   * Load a playlist
   * @param {Array} tracks - Array of track objects
   */
  loadPlaylist(tracks) {
    this.tracks = tracks;
    this.currentIndex = -1;
    if (this.container) {
      this.container.classList.add("vidply-has-playlist");
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
        setTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    const loadPromise = this.player.load({
      src: track.src,
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
    setTimeout(() => {
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
    this.currentIndex = index;
    try {
      if (this.player?.element?.tagName === "VIDEO") {
        if (track.poster) {
          const posterUrl = typeof this.player.resolvePosterPath === "function" ? this.player.resolvePosterPath(track.poster) : track.poster;
          this.player.element.poster = posterUrl;
          this.player.applyPosterAspectRatio?.(posterUrl);
        } else {
          this.player.element.removeAttribute("poster");
        }
      }
      this.player.audioDescriptionSrc = track.audioDescriptionSrc || null;
      this.player.signLanguageSrc = track.signLanguageSrc || null;
      this.player.signLanguageSources = track.signLanguageSources || {};
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
      if (this.player.audioDescriptionManager && typeof this.player.audioDescriptionManager.initFromSourceElements === "function") {
        try {
          this.player.audioDescriptionManager.captionTracks = [];
          this.player.audioDescriptionManager.initFromSourceElements(this.player.sourceElements, this.player.trackElements);
        } catch (e) {
        }
      }
      if (this.player.captionManager && typeof this.player.captionManager.loadTracks === "function") {
        try {
          this.player.captionManager.tracks = [];
          this.player.captionManager.currentTrack = null;
          this.player.captionManager.loadTracks();
        } catch (e) {
        }
      }
      if (typeof this.player.updateControlBar === "function") {
        this.player.updateControlBar();
      }
    } catch (e) {
    }
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
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
  async play(index, userInitiated = false) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn("VidPly Playlist: Invalid track index", index);
      return;
    }
    const track = this.tracks[index];
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
        this.player.emit("playlisttrackchange", {
          index,
          item: track,
          total: this.tracks.length
        });
        setTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    let srcToLoad = track.src;
    if (this.player?.audioDescriptionManager?.desiredState && track.audioDescriptionSrc) {
      this.player.originalSrc = track.src;
      this.player.audioDescriptionManager.originalSource = track.src;
      this.player.audioDescriptionManager.src = track.audioDescriptionSrc;
      srcToLoad = track.audioDescriptionSrc;
    }
    this.player.load({
      src: srcToLoad,
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || [],
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      signLanguageSrc: track.signLanguageSrc || null,
      signLanguageSources: track.signLanguageSources || {}
    });
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    this.player.emit("playlisttrackchange", {
      index,
      item: track,
      total: this.tracks.length
    });
    setTimeout(() => {
      this.player.play();
      setTimeout(() => {
        this.isChangingTrack = false;
      }, 50);
    }, 100);
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
    return src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com") || src.includes("soundcloud.com") || src.includes("api.soundcloud.com") || src.includes(".m3u8");
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
      setTimeout(() => {
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
    setTimeout(() => {
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
    if (!this.playlistPanel || !this.tracks.length) return;
    const isFullscreen = this.player.state.fullscreen;
    const isPlaying = this.player.state.playing;
    if (isFullscreen) {
      if (!isPlaying) {
        this.playlistPanel.classList.add("vidply-playlist-fullscreen-visible");
        this.playlistPanel.style.display = "block";
      } else {
        this.playlistPanel.classList.remove("vidply-playlist-fullscreen-visible");
        setTimeout(() => {
          if (this.player.state.playing && this.player.state.fullscreen) {
            this.playlistPanel.style.display = "none";
          }
        }, 300);
      }
    } else {
      this.playlistPanel.classList.remove("vidply-playlist-fullscreen-visible");
      if (this.isPanelVisible && this.tracks.length > 0) {
        this.playlistPanel.style.display = "block";
      } else {
        this.playlistPanel.style.display = "none";
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
    this.trackInfoElement = DOMUtils.createElement("div", {
      className: "vidply-track-info",
      attributes: {
        role: "status"
      }
    });
    this.trackInfoElement.style.display = "none";
    this.container.appendChild(this.trackInfoElement);
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
  }
  /**
   * Update track info display
   */
  updateTrackInfo(track) {
    if (!this.trackInfoElement) return;
    const trackNumber = this.currentIndex + 1;
    const totalTracks = this.tracks.length;
    const trackTitle = track.title || i18n.t("playlist.untitled");
    const trackArtist = track.artist || "";
    const effectiveDuration = this.getEffectiveDuration(track);
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : "";
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : "";
    const artistPart = trackArtist ? i18n.t("playlist.by") + trackArtist : "";
    const durationPart = trackDurationReadable ? `. ${trackDurationReadable}` : "";
    const announcement = i18n.t("playlist.nowPlaying", {
      current: trackNumber,
      total: totalTracks,
      title: trackTitle,
      artist: artistPart
    }) + durationPart;
    const trackOfText = i18n.t("playlist.trackOf", {
      current: trackNumber,
      total: totalTracks
    });
    const durationHtml = trackDuration ? `<span class="vidply-track-duration" aria-hidden="true">${DOMUtils.escapeHTML(trackDuration)}</span>` : "";
    const trackDescription = track.description || "";
    this.trackInfoElement.innerHTML = `
      <span class="vidply-sr-only">${DOMUtils.escapeHTML(announcement)}</span>
      <div class="vidply-track-header" aria-hidden="true">
        <span class="vidply-track-number">${DOMUtils.escapeHTML(trackOfText)}</span>
        ${durationHtml}
      </div>
      <div class="vidply-track-title" aria-hidden="true">${DOMUtils.escapeHTML(trackTitle)}</div>
      ${trackArtist ? `<div class="vidply-track-artist" aria-hidden="true">${DOMUtils.escapeHTML(trackArtist)}</div>` : ""}
      ${trackDescription ? `<div class="vidply-track-description" aria-hidden="true">${DOMUtils.escapeHTML(trackDescription)}</div>` : ""}
    `;
    this.trackInfoElement.style.display = "block";
    this.updateTrackArtwork(track);
  }
  /**
   * Update track artwork display (for audio playlists)
   */
  updateTrackArtwork(track) {
    if (this.player?.element?.tagName !== "AUDIO") {
      if (this.trackArtworkElement) {
        this.trackArtworkElement.style.display = "none";
      }
      return;
    }
    if (!this.trackArtworkElement && this.container) {
      this.trackArtworkElement = DOMUtils.createElement("div", {
        className: "vidply-track-artwork",
        attributes: {
          "aria-hidden": "true"
        }
      });
      this.trackArtworkElement.style.display = "none";
      const videoWrapper = this.container.querySelector(".vidply-video-wrapper");
      if (videoWrapper) {
        this.container.insertBefore(this.trackArtworkElement, videoWrapper);
      } else {
        this.container.appendChild(this.trackArtworkElement);
      }
    }
    if (!this.trackArtworkElement) return;
    if (track.poster) {
      this.trackArtworkElement.style.backgroundImage = `url(${track.poster})`;
      this.trackArtworkElement.style.display = "block";
    } else {
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
  }
  /**
   * Create playlist item element
   */
  createPlaylistItem(track, index) {
    const trackPosition = i18n.t("playlist.trackOf", {
      current: index + 1,
      total: this.tracks.length
    });
    const trackTitle = track.title || i18n.t("playlist.trackUntitled", { number: index + 1 });
    const trackArtist = track.artist ? i18n.t("playlist.by") + track.artist : "";
    const effectiveDuration = this.getEffectiveDuration(track);
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : "";
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : "";
    const isActive = index === this.currentIndex;
    let ariaLabel = `${trackTitle}${trackArtist}`;
    if (trackDurationReadable) {
      ariaLabel += `. ${trackDurationReadable}`;
    }
    const item = DOMUtils.createElement("li", {
      className: isActive ? "vidply-playlist-item vidply-playlist-item-active" : "vidply-playlist-item",
      attributes: {
        "data-playlist-index": index
      }
    });
    const button = DOMUtils.createElement("button", {
      className: "vidply-playlist-item-button",
      attributes: {
        type: "button",
        role: "option",
        tabIndex: index === 0 ? 0 : -1,
        // Only first item is in tab order initially
        "aria-label": ariaLabel,
        "aria-posinset": index + 1,
        "aria-setsize": this.tracks.length,
        "aria-checked": isActive ? "true" : "false"
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
    if (track.poster) {
      thumbnail.style.backgroundImage = `url(${track.poster})`;
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
        setTimeout(() => {
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
            setTimeout(() => {
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
      buttons[index].setAttribute("tabIndex", "-1");
      buttons[newIndex].setAttribute("tabIndex", "0");
      buttons[newIndex].focus({ preventScroll: false });
      const item = buttons[newIndex].closest(".vidply-playlist-item");
      if (item) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    if (announcement && this.navigationFeedback) {
      this.navigationFeedback.textContent = announcement;
      setTimeout(() => {
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
      const trackPosition = i18n.t("playlist.trackOf", {
        current: index + 1,
        total: this.tracks.length
      });
      const trackTitle = track.title || i18n.t("playlist.trackUntitled", { number: index + 1 });
      const trackArtist = track.artist ? i18n.t("playlist.by") + track.artist : "";
      const effectiveDuration = this.getEffectiveDuration(track);
      const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : "";
      if (index === this.currentIndex) {
        item.classList.add("vidply-playlist-item-active");
        button.setAttribute("aria-current", "true");
        button.setAttribute("aria-checked", "true");
        button.setAttribute("tabIndex", "0");
        let ariaLabel = `${trackTitle}${trackArtist}`;
        if (trackDurationReadable) {
          ariaLabel += `. ${trackDurationReadable}`;
        }
        button.setAttribute("aria-label", ariaLabel);
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        item.classList.remove("vidply-playlist-item-active");
        button.removeAttribute("aria-current");
        button.setAttribute("aria-checked", "false");
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
    if (this.trackInfoElement) {
      this.trackInfoElement.innerHTML = "";
      this.trackInfoElement.style.display = "none";
    }
    if (this.trackArtworkElement) {
      this.trackArtworkElement.style.backgroundImage = "";
      this.trackArtworkElement.style.display = "none";
    }
  }
  /**
   * Toggle playlist panel visibility
   * @param {boolean} show - Optional: force show (true) or hide (false)
   * @returns {boolean} - New visibility state
   */
  togglePanel(show) {
    if (!this.playlistPanel) return false;
    const shouldShow = show !== void 0 ? show : this.playlistPanel.style.display === "none";
    if (shouldShow) {
      this.playlistPanel.style.display = "block";
      this.isPanelVisible = true;
      if (this.tracks.length > 0) {
        setTimeout(() => {
          const firstItem = this.playlistPanel.querySelector('.vidply-playlist-item[tabindex="0"]');
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
      this.playlistPanel.style.display = "none";
      this.isPanelVisible = false;
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute("aria-expanded", "false");
        this.player.controlBar.controls.playlistToggle.setAttribute("aria-pressed", "false");
        this.player.controlBar.controls.playlistToggle.focus({ preventScroll: true });
      }
    }
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
  destroy() {
    this.player.off("ended", this.handleTrackEnd);
    this.player.off("error", this.handleTrackError);
    if (this.trackArtworkElement) {
      this.trackArtworkElement.remove();
    }
    if (this.trackInfoElement) {
      this.trackInfoElement.remove();
    }
    if (this.playlistPanel) {
      this.playlistPanel.remove();
    }
    this.clear();
  }
};

// src/index.js
function initializePlayers() {
  const elements = document.querySelectorAll("[data-vidply]");
  elements.forEach((element) => {
    const options = element.dataset.vidplyOptions ? JSON.parse(element.dataset.vidplyOptions) : {};
    const dataOptions = parseDataAttributes(element.dataset);
    const mergedOptions = { ...dataOptions, ...options };
    new Player(element, mergedOptions);
  });
}
function parseDataAttributes(dataset) {
  const options = {};
  const attributeMap = {
    // Sign Language
    "signLanguageSrc": "signLanguageSrc",
    "signLanguageButton": "signLanguageButton",
    "signLanguagePosition": "signLanguagePosition",
    "signLanguageDisplayMode": "signLanguageDisplayMode",
    // Audio Description
    "audioDescriptionSrc": "audioDescriptionSrc",
    "audioDescriptionButton": "audioDescriptionButton",
    // Other common options
    "autoplay": "autoplay",
    "loop": "loop",
    "muted": "muted",
    "controls": "controls",
    "poster": "poster",
    "width": "width",
    "height": "height",
    "language": "language",
    "captions": "captions",
    "captionsDefault": "captionsDefault",
    "transcript": "transcript",
    "transcriptButton": "transcriptButton",
    "keyboard": "keyboard",
    "responsive": "responsive",
    "pipButton": "pipButton",
    "fullscreenButton": "fullscreenButton"
    // Layout
  };
  Object.keys(attributeMap).forEach((dataKey) => {
    const optionKey = attributeMap[dataKey];
    const value = dataset[dataKey];
    if (value !== void 0) {
      if (value === "true") {
        options[optionKey] = true;
      } else if (value === "false") {
        options[optionKey] = false;
      } else if (!isNaN(value) && value !== "") {
        options[optionKey] = Number(value);
      } else {
        options[optionKey] = value;
      }
    }
  });
  const signLanguageSources = {};
  Object.keys(dataset).forEach((key) => {
    if (key.startsWith("signLanguageSrc") && key !== "signLanguageSrc") {
      const langMatch = key.match(/^signLanguageSrc([A-Z][a-z]*)$/);
      if (langMatch) {
        const langCode = langMatch[1].toLowerCase();
        signLanguageSources[langCode] = dataset[key];
      }
    }
  });
  if (Object.keys(signLanguageSources).length > 0) {
    options.signLanguageSources = signLanguageSources;
    if (dataset.signLanguageSrc && !options.signLanguageSrc) {
      options.signLanguageSrc = dataset.signLanguageSrc;
    }
  }
  if (dataset.vidplyLanguageFiles) {
    try {
      options.languageFiles = JSON.parse(dataset.vidplyLanguageFiles);
    } catch (e) {
      console.warn("Invalid JSON in data-vidply-language-files:", e);
    }
  }
  if (dataset.vidplyLanguageFile) {
    try {
      const parsed = JSON.parse(dataset.vidplyLanguageFile);
      if (typeof parsed === "object" && parsed !== null) {
        options.languageFiles = parsed;
      }
    } catch (e) {
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
