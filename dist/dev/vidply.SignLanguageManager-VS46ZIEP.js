/*!
 * VidPly v1.1.16 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  DraggablePanel,
  createLabeledSelect,
  preventDragOnElement
} from "./vidply.chunk-XC5S5TJQ.js";
import {
  DraggableResizable
} from "./vidply.chunk-SE2O3UVV.js";
import "./vidply.chunk-HXHMFMHC.js";
import {
  createIconElement
} from "./vidply.chunk-ZJNPHZJJ.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-C7HDJYKX.js";

// src/core/SignLanguageManager.ts
var SignLanguageManager = class {
  player;
  _mainViewMutedBefore;
  _mainViewUsingSourceSwap;
  currentLanguage;
  customKeyHandler;
  desiredPosition;
  draggable;
  handlers;
  header;
  inMainView;
  interactionHandlers;
  mainViewOriginalSources;
  mainViewOriginalSrc;
  resizeHandles;
  selector;
  settingsButton;
  settingsHandlers;
  sources;
  src;
  enabled;
  video;
  wrapper;
  /**
   * Encapsulates the settings-menu DOM, lifecycle (show/hide/outside-
   * click/keyboard nav/positioning), and the drag/resize toggle items.
   * Owned here but lazily created once {@link _setupSettingsButton}
   * instantiates the button it needs to anchor from.
   */
  _panel = null;
  // Back-compat getters for external callers (Player.ts exposes these
  // under `signLanguageSettingsMenu` / `signLanguageSettingsMenuVisible`)
  // and for internal readers of the shared menu-item state (which is now
  // panel-owned). Setters are no-ops by design — the panel is the
  // authoritative owner of these values.
  get settingsMenu() {
    return this._panel?.settingsMenu ?? null;
  }
  set settingsMenu(_v) {
  }
  get settingsMenuVisible() {
    return this._panel?.settingsMenuVisible ?? false;
  }
  set settingsMenuVisible(_v) {
  }
  get settingsMenuJustOpened() {
    return this._panel?.justOpened ?? false;
  }
  set settingsMenuJustOpened(_v) {
  }
  get dragOptionButton() {
    return this._panel?.dragOptionButton ?? null;
  }
  get dragOptionText() {
    return this._panel?.dragOptionText ?? null;
  }
  get resizeOptionButton() {
    return this._panel?.resizeOptionButton ?? null;
  }
  get resizeOptionText() {
    return this._panel?.resizeOptionText ?? null;
  }
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
    this.resizeHandles = [];
    this.enabled = false;
    this.inMainView = false;
    this.mainViewOriginalSrc = null;
    this.mainViewOriginalSources = null;
    this._mainViewUsingSourceSwap = false;
    this._mainViewMutedBefore = false;
    this.handlers = null;
    this.settingsHandlers = null;
    this.interactionHandlers = null;
    this.draggable = null;
    this.customKeyHandler = null;
  }
  /**
   * Check if sign language is available
   */
  isAvailable() {
    return Object.keys(this.sources).length > 0 || Boolean(this.src);
  }
  /**
   * Enable sign language video
   */
  enable() {
    const hasMultipleSources = Object.keys(this.sources).length > 0;
    const hasSingleSource = Boolean(this.src);
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
    const video = this.video;
    if (!wrapper || !video) {
      return;
    }
    wrapper.appendChild(this.header);
    wrapper.appendChild(video);
    this.resizeHandles.forEach((handle) => wrapper.appendChild(handle));
    this._applyInitialSize();
    this.player.container.appendChild(wrapper);
    requestAnimationFrame(() => {
      this.constrainPosition();
    });
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
    this._hideModeBadge();
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
    const hasSingleSource = Boolean(this.src);
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
  }
  /**
   * Create settings button and wire it to a {@link DraggablePanel}
   * that owns the drag/resize settings menu and its lifecycle.
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
    this._panel = new DraggablePanel({
      player: this.player,
      namespace: "sign-language",
      settingsButton: this.settingsButton,
      getDraggable: () => this.draggable,
      i18nKeys: {
        enableDrag: "player.enableSignDragMode",
        disableDrag: "player.disableSignDragMode",
        enableDragAria: "player.enableSignDragModeAria",
        disableDragAria: "player.disableSignDragModeAria",
        enableResize: "player.enableSignResizeMode",
        disableResize: "player.disableSignResizeMode",
        enableResizeAria: "player.enableSignResizeModeAria",
        disableResizeAria: "player.disableSignResizeModeAria",
        closeMenu: "transcript.closeMenu"
      },
      menuAlign: "center",
      getMenuParent: () => this.wrapper,
      getBadgeHost: () => this.wrapper,
      // Existing CSS uses `.vidply-sign-mode-badge` (shorter than
      // the namespace default) — pin the class so the styling
      // keeps applying without having to duplicate the rule.
      badgeClass: `${this.player.options.classPrefix}-sign-mode-badge`,
      onDragItemClick: (panel) => {
        this.toggleKeyboardDragMode();
        panel.hide({ focusButton: false });
        if (this.draggable?.keyboardDragMode) {
          setTimeout(() => {
            this.wrapper?.focus?.({ preventScroll: true });
          }, 20);
        }
      },
      onResizeItemClick: (panel) => {
        const enabled = this.toggleResizeMode({ focus: false });
        if (enabled) {
          panel.hide({ focusButton: false });
          setTimeout(() => {
            this.wrapper?.focus?.({ preventScroll: true });
          }, 20);
        } else {
          panel.hide({ focusButton: true });
        }
      }
    });
    this.settingsHandlers = {
      click: (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._panel?.markJustOpenedForClick();
        this._panel?.toggle();
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
      const signLanguageButton = this.player.controlBar?.controls?.signLanguage;
      if (signLanguageButton) {
        setTimeout(() => {
          signLanguageButton.focus({ preventScroll: true });
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
    const wrapper = this.wrapper;
    if (!wrapper) return;
    const saved = this.player.storage.getSignLanguagePreferences();
    if (saved?.size?.width) {
      wrapper.style.width = saved.size.width;
    } else {
      wrapper.style.width = "280px";
    }
    wrapper.style.height = "auto";
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
    const wrapper = this.wrapper;
    if (!wrapper) return;
    const classPrefix = this.player.options.classPrefix;
    this.draggable = new DraggableResizable(wrapper, {
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
        if (enabled) {
          this._showModeBadge(i18n.t("player.signResizeModeHint"));
          this.player.keyboardManager?.announce(i18n.t("player.signLanguageResizeActive"));
        } else {
          this._hideModeBadge();
          this.player.keyboardManager?.announce(i18n.t("player.signResizeModeDisabled"));
        }
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
          this._hideModeBadge();
          this._updateDragOptionState();
          this.player.keyboardManager?.announce(i18n.t("player.signDragModeDisabled"));
          return;
        }
        this.disable();
        const signLanguageButton = this.player.controlBar?.controls?.signLanguage;
        if (signLanguageButton) {
          setTimeout(() => {
            signLanguageButton.focus({ preventScroll: true });
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
    const wrapperWidth = wrapperRect.width || 280;
    const wrapperHeight = wrapperRect.height || 280 * 9 / 16;
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
   * Show the settings menu. Delegates to the shared {@link DraggablePanel},
   * which owns the DOM, outside-click dismissal, keyboard navigation and
   * positioning. Kept as a named method so external callers (other
   * managers, tests) that referenced the legacy API keep working.
   */
  showSettingsMenu() {
    this._panel?.show();
  }
  /** @see {@link showSettingsMenu} */
  hideSettingsMenu({ focusButton = true } = {}) {
    this._panel?.hide({ focusButton });
  }
  // Badge management moved into {@link DraggablePanel}; these
  // delegates keep the legacy names so internal call sites and
  // subclassers (if any) continue to work. Announcements for
  // assistive tech still go through the shared KeyboardManager
  // live region so AT doesn't read both the badge text and the
  // live-region copy.
  _showModeBadge(text) {
    this._panel?.showBadge(text);
  }
  _hideModeBadge() {
    this._panel?.hideBadge();
  }
  /**
   * Toggle keyboard drag mode
   */
  toggleKeyboardDragMode() {
    if (!this.draggable) return;
    const wasEnabled = this.draggable.keyboardDragMode;
    this.draggable.toggleKeyboardDragMode();
    const isEnabled = this.draggable.keyboardDragMode;
    if (!wasEnabled && isEnabled) {
      this._enableMoveMode();
      this._showModeBadge(i18n.t("player.signDragModeHint"));
      this.player.keyboardManager?.announce(i18n.t("player.signLanguageDragActive"));
    } else if (wasEnabled && !isEnabled) {
      this._hideModeBadge();
      this.player.keyboardManager?.announce(i18n.t("player.signDragModeDisabled"));
    }
    this._updateDragOptionState();
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
  // Thin delegates to the panel's refreshState. Kept as named methods
  // so the existing internal call sites (e.g. `toggleKeyboardDragMode`)
  // read naturally without a double-dot chain to the panel.
  _updateDragOptionState() {
    this._panel?.refreshDragState();
  }
  _updateResizeOptionState() {
    this._panel?.refreshResizeState();
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
    if (this._panel) {
      this._panel.destroy();
      this._panel = null;
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
    this._hideModeBadge();
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
//# sourceMappingURL=vidply.SignLanguageManager-VS46ZIEP.js.map
