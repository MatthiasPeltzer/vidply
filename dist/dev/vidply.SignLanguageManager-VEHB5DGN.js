/*!
 * VidPly v1.1.15 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  attachMenuKeyboardNavigation,
  createLabeledSelect,
  createMenuItem,
  focusFirstMenuItem,
  preventDragOnElement
} from "./vidply.chunk-UX7EGBQP.js";
import {
  DraggableResizable,
  createIconElement
} from "./vidply.chunk-4TFXLFHL.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-NSVYEGDT.js";

// src/core/SignLanguageManager.ts
var SignLanguageManager = class {
  player;
  _mainViewMutedBefore;
  _mainViewUsingSourceSwap;
  currentLanguage;
  customKeyHandler;
  desiredPosition;
  draggable;
  dragOptionButton;
  dragOptionText;
  handlers;
  header;
  inMainView;
  interactionHandlers;
  mainViewOriginalSources;
  mainViewOriginalSrc;
  resizeHandles;
  resizeOptionButton;
  resizeOptionText;
  selector;
  settingsButton;
  settingsHandlers;
  settingsMenu;
  settingsMenuJustOpened;
  settingsMenuKeyHandler;
  settingsMenuVisible;
  sources;
  src;
  enabled;
  documentClickHandler;
  documentClickHandlerAdded;
  video;
  wrapper;
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
    const wrapper = this.wrapper;
    wrapper.appendChild(this.header);
    wrapper.appendChild(this.video);
    this.resizeHandles.forEach((handle) => wrapper.appendChild(handle));
    this._applyInitialSize();
    this.player.container.appendChild(wrapper);
    requestAnimationFrame(() => {
      this.constrainPosition();
    });
    const video = this.video;
    video.currentTime = this.player.state.currentTime;
    if (!this.player.state.paused) {
      video.play();
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
      const signSrcValue = signSrc ?? "";
      signSource.setAttribute("src", signSrcValue);
      const type = this._inferVideoType(signSrcValue);
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
      el.src = signSrc ?? "";
      this._mainViewUsingSourceSwap = false;
    }
    el.muted = true;
    this.player.currentSource = signSrc ?? "";
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
    this.player.currentSource = this.mainViewOriginalSrc || el.querySelector("source")?.src || "";
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
        this.video.play().catch((e) => {
          if (typeof console !== "undefined" && console.debug) {
            console.debug("[VidPly] sign-language play() rejected:", e);
          }
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
    this.video.src = src ?? "";
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
    const isMobile = window.innerWidth < 768;
    const isFullscreen = this.player.state.fullscreen;
    if (isMobile && !isFullscreen && this.player?.options?.signLanguageDragOnMobile === false) {
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
        const target = e.target;
        if (target.closest(`.${classPrefix}-sign-language-close`) || target.closest(`.${classPrefix}-sign-language-settings`) || target.closest(`.${classPrefix}-sign-language-select`) || target.closest(`.${classPrefix}-sign-language-label`) || target.closest(`.${classPrefix}-sign-language-settings-menu`)) {
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
          this.wrapper?.focus({ preventScroll: true });
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
    this.wrapper?.addEventListener("keydown", this.customKeyHandler);
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
      const targetNode = e.target;
      if (this.settingsButton && (this.settingsButton === targetNode || targetNode && this.settingsButton.contains(targetNode))) {
        return;
      }
      if (this.settingsMenu && targetNode && this.settingsMenu.contains(targetNode)) {
        return;
      }
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      }
    };
    setTimeout(() => {
      const documentClickHandler = this.documentClickHandler;
      if (!documentClickHandler) return;
      document.addEventListener("mousedown", documentClickHandler, true);
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
    ) ?? null;
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
    this.wrapper?.classList.add(`${this.player.options.classPrefix}-sign-move-mode`);
    this._updateResizeOptionState();
    setTimeout(() => {
      this.wrapper?.classList.remove(`${this.player.options.classPrefix}-sign-move-mode`);
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
export {
  SignLanguageManager
};
//# sourceMappingURL=vidply.SignLanguageManager-VEHB5DGN.js.map
