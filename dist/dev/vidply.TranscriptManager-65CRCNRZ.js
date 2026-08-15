/*!
 * VidPly v1.2.9 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  DraggablePanel,
  createLabeledSelect,
  createMenuItem,
  preventDragOnElement
} from "./vidply.chunk-3XLISO52.js";
import {
  DraggableResizable
} from "./vidply.chunk-QDVE22LM.js";
import {
  TimeUtils
} from "./vidply.chunk-3L3D66RG.js";
import {
  createIconElement
} from "./vidply.chunk-MST7YVO2.js";
import {
  focusElement
} from "./vidply.chunk-XOXOPD2X.js";
import {
  StorageManager,
  deriveTrackLabel
} from "./vidply.chunk-74ATRZS2.js";
import "./vidply.chunk-XQIUVLS5.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-ZAFXR35D.js";

// src/controls/TranscriptManager.ts
var TranscriptManager = class {
  player;
  _cueUpdateTimeout;
  autoscrollCheckbox = null;
  autoscrollEnabled;
  availableTranscriptLanguages;
  currentActiveEntry;
  currentTranscriptLanguage;
  customKeyHandler = null;
  /**
   * True once the style-dialog's outside-click listener has been
   * attached. The settings-menu's outside-click listener is now
   * owned by {@link DraggablePanel} and tracked there; this flag
   * covers the dialog half of the shared `handlers.documentClick`.
   */
  documentClickHandlerAdded = false;
  draggableResizable;
  handlers = {};
  headerLeft = null;
  isVisible;
  languageLabel;
  languageSelector;
  languageSelectorHandler;
  languageSelectorWrapper = null;
  liveRegion;
  settingsButton;
  showTimestamps;
  showTimestampsButton = null;
  showTimestampsText = null;
  storage;
  styleDialog;
  styleDialogJustOpened;
  styleDialogVisible;
  timeouts;
  transcriptContent = null;
  transcriptEntries;
  transcriptHeader = null;
  transcriptResizeHandles;
  transcriptStyle;
  transcriptWindow;
  _dashActiveLang;
  _vttCache;
  /**
   * Owns the settings-menu DOM scaffold, its outside-click
   * dismissal, keyboard navigation, viewport-aware positioning,
   * and the drag-mode / resize-mode toggle items. Instantiated
   * lazily once the header is built in {@link createTranscriptHeader}.
   */
  _panel = null;
  // Back-compat getters for panel-owned state. External callers and
  // internal reads (e.g. `this.settingsMenuVisible` inside other
  // transcript methods) keep reading the same properties; the
  // setters are no-ops because the panel is now the authoritative
  // owner of those values.
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
    this.transcriptWindow = null;
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    this.isVisible = false;
    this.storage = new StorageManager("vidply");
    this.draggableResizable = null;
    this.settingsButton = null;
    this.transcriptResizeHandles = [];
    this.liveRegion = null;
    this.styleDialog = null;
    this.styleDialogVisible = false;
    this.styleDialogJustOpened = false;
    this.languageSelector = null;
    this.languageLabel = null;
    this.currentTranscriptLanguage = null;
    this.availableTranscriptLanguages = [];
    this.languageSelectorHandler = null;
    const savedPreferences = this.storage.getTranscriptPreferences();
    this.autoscrollEnabled = typeof savedPreferences?.autoscroll === "boolean" ? savedPreferences.autoscroll : true;
    this.showTimestamps = typeof savedPreferences?.showTimestamps === "boolean" ? savedPreferences.showTimestamps : false;
    const savedFontSize = typeof savedPreferences?.fontSize === "string" ? savedPreferences.fontSize : void 0;
    const savedFontFamily = typeof savedPreferences?.fontFamily === "string" ? savedPreferences.fontFamily : void 0;
    const savedColor = typeof savedPreferences?.color === "string" ? savedPreferences.color : void 0;
    const savedBackgroundColor = typeof savedPreferences?.backgroundColor === "string" ? savedPreferences.backgroundColor : void 0;
    const savedOpacity = typeof savedPreferences?.opacity === "number" ? savedPreferences.opacity : void 0;
    const optFontSize = typeof this.player.options.transcriptFontSize === "string" ? this.player.options.transcriptFontSize : void 0;
    const optFontFamily = typeof this.player.options.transcriptFontFamily === "string" ? this.player.options.transcriptFontFamily : void 0;
    const optColor = typeof this.player.options.transcriptColor === "string" ? this.player.options.transcriptColor : void 0;
    const optBackgroundColor = typeof this.player.options.transcriptBackgroundColor === "string" ? this.player.options.transcriptBackgroundColor : void 0;
    const optOpacity = typeof this.player.options.transcriptOpacity === "number" ? this.player.options.transcriptOpacity : void 0;
    this.transcriptStyle = {
      fontSize: savedFontSize || optFontSize || "100%",
      fontFamily: savedFontFamily || optFontFamily || "sans-serif",
      color: savedColor || optColor || "#ffffff",
      backgroundColor: savedBackgroundColor || optBackgroundColor || "#1e1e1e",
      opacity: savedOpacity ?? optOpacity ?? 0.98
    };
    this.handlers = {
      timeupdate: () => this.updateActiveEntry(),
      seeked: () => this.updateActiveEntry(),
      audiodescriptionenabled: () => {
        if (this.isVisible) {
          this.loadTranscriptData();
        }
      },
      audiodescriptiondisabled: () => {
        if (this.isVisible) {
          this.loadTranscriptData();
        }
      },
      textcuesupdate: null,
      resize: null,
      settingsClick: null,
      settingsKeydown: null,
      documentClick: null,
      styleDialogKeydown: null,
      floatingchange: null
    };
    this._cueUpdateTimeout = null;
    this._dashActiveLang = null;
    this._vttCache = /* @__PURE__ */ new Map();
    this.timeouts = /* @__PURE__ */ new Set();
    this.init();
  }
  init() {
    this.player.on("timeupdate", this.handlers.timeupdate);
    this.player.on("seeked", this.handlers.seeked);
    this.player.on("audiodescriptionenabled", this.handlers.audiodescriptionenabled);
    this.player.on("audiodescriptiondisabled", this.handlers.audiodescriptiondisabled);
    this.handlers.textcuesupdate = () => {
      if (!this.isVisible) return;
      if (this.currentTranscriptLanguage && this._vttCache.has(this.currentTranscriptLanguage)) return;
      if (this._cueUpdateTimeout) {
        this.clearManagedTimeout(this._cueUpdateTimeout);
      }
      this._cueUpdateTimeout = this.setManagedTimeout(() => {
        this._cueUpdateTimeout = null;
        this.loadTranscriptData();
      }, 400);
    };
    this.player.on("textcuesupdate", this.handlers.textcuesupdate);
    this.player.on("fullscreenchange", () => {
      if (this.isVisible) {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          this.setupDragAndDrop();
        }
        if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
          this.setManagedTimeout(() => this.positionTranscript(), 100);
        }
      }
    });
    this.handlers.floatingchange = (state) => {
      if (state && this.isVisible) {
        this.hideTranscript();
      }
    };
    this.player.on("floatingchange", this.handlers.floatingchange);
  }
  /**
   * For streaming renderers (DASH), tell the renderer to activate the text
   * track for `lang` so dash.js starts downloading subtitle segments and
   * populating cues.  Skips the call if the language is already active.
   */
  _requestStreamingTrack(lang) {
    if (!lang) return;
    const renderer = this.player.renderer;
    if (renderer?.isStreaming && typeof renderer.activateTextTrackForLanguage === "function") {
      if (this._dashActiveLang !== lang) {
        this._dashActiveLang = lang;
        renderer.activateTextTrackForLanguage(lang);
      }
    }
  }
  /**
   * Toggle transcript window visibility
   */
  toggleTranscript() {
    if (this.isVisible) {
      this.hideTranscript();
    } else {
      this.showTranscript();
    }
  }
  /**
   * Show transcript window
   */
  showTranscript() {
    if (this.player.state?.floating) {
      return;
    }
    this.player.invalidateTrackCache();
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = "flex";
      this.isVisible = true;
      this.loadTranscriptData();
      this._requestStreamingTrack(this.currentTranscriptLanguage);
      this.updateLanguageSelector();
      if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === "function") {
        this.player.controlBar.updateTranscriptButton();
      }
      focusElement(this.settingsButton, { delay: 150 });
      return;
    }
    this.createTranscriptWindow();
    this.loadTranscriptData();
    this._requestStreamingTrack(this.currentTranscriptLanguage);
    const transcriptWindow = this.transcriptWindow;
    if (transcriptWindow) {
      transcriptWindow.style.display = "flex";
      if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
        this.setManagedTimeout(() => this.positionTranscript(), 0);
      }
      focusElement(this.settingsButton, { delay: 150 });
    }
    this.isVisible = true;
  }
  /**
   * Hide transcript window
   */
  hideTranscript({ focusButton = false } = {}) {
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = "none";
      this.isVisible = false;
    }
    if (this.draggableResizable && this.draggableResizable.pointerResizeMode) {
      this.draggableResizable.disablePointerResizeMode();
      this.updateResizeOptionState();
    }
    this.hideResizeModeIndicator();
    this.announceLive("");
    if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === "function") {
      this.player.controlBar.updateTranscriptButton();
    }
    if (focusButton) {
      const transcriptButton = this.player.controlBar?.controls?.transcript;
      if (transcriptButton && typeof transcriptButton.focus === "function") {
        transcriptButton.focus({ preventScroll: true });
      }
    }
  }
  /**
   * Create the transcript window UI
   */
  createTranscriptWindow() {
    this.transcriptWindow = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-window`,
      attributes: {
        "role": "dialog",
        "aria-label": i18n.t("transcript.ariaLabel"),
        "tabindex": "-1"
      }
    });
    this.transcriptHeader = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-header`,
      attributes: {
        "tabindex": "0"
      }
    });
    this.headerLeft = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-header-left`
    });
    const settingsAriaLabel = i18n.t("transcript.settingsMenu");
    this.settingsButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-transcript-settings`,
      attributes: {
        "type": "button",
        "aria-label": settingsAriaLabel,
        "aria-expanded": "false"
      }
    });
    this.settingsButton.appendChild(createIconElement("settings"));
    DOMUtils.attachTooltip(this.settingsButton, settingsAriaLabel, this.player.options.classPrefix);
    this._panel = new DraggablePanel({
      player: this.player,
      namespace: "transcript",
      settingsButton: this.settingsButton,
      getDraggable: () => this.draggableResizable,
      i18nKeys: {
        enableDrag: "transcript.enableDragMode",
        disableDrag: "transcript.disableDragMode",
        enableDragAria: "transcript.enableDragModeAria",
        disableDragAria: "transcript.disableDragModeAria",
        enableResize: "transcript.enableResizeMode",
        disableResize: "transcript.disableResizeMode",
        enableResizeAria: "transcript.enableResizeModeAria",
        disableResizeAria: "transcript.disableResizeModeAria",
        closeMenu: "transcript.closeMenu"
      },
      menuAlign: "left",
      getMenuParent: () => this.headerLeft ?? this.transcriptHeader ?? this.transcriptWindow,
      // The transcript window itself is the anchor for the mode badge
      // so it sits above the panel regardless of where the settings
      // menu was opened from. The default class name is derived from
      // the namespace → `{classPrefix}-transcript-mode-badge`.
      getBadgeHost: () => this.transcriptWindow,
      onDragItemClick: (panel) => {
        this.toggleKeyboardDragMode();
        panel.hide();
      },
      onResizeItemClick: (panel) => {
        const enabled = this.toggleResizeMode({ focus: false });
        if (enabled) {
          panel.hide({ focusButton: false });
          setTimeout(() => {
            this.transcriptWindow?.focus({ preventScroll: true });
          }, 20);
        } else {
          panel.hide({ focusButton: true });
        }
      },
      buildExtraItems: ({ menu, itemClass, classPrefix, stripInlineTooltip }) => {
        const styleOption = createMenuItem({
          classPrefix,
          itemClass,
          icon: "settings",
          label: "transcript.styleTranscript",
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._panel?.hide();
            setTimeout(() => {
              this.showStyleDialog();
            }, 50);
          }
        });
        stripInlineTooltip(styleOption);
        menu.appendChild(styleOption);
        const timestampsOption = createMenuItem({
          classPrefix,
          itemClass,
          icon: "clock",
          label: "transcript.showTimestamps",
          hasTextClass: true,
          onClick: () => {
            this.toggleShowTimestamps();
          }
        });
        timestampsOption.setAttribute("role", "switch");
        timestampsOption.setAttribute(
          "aria-checked",
          this.showTimestamps ? "true" : "false"
        );
        stripInlineTooltip(timestampsOption);
        this.showTimestampsButton = timestampsOption;
        this.showTimestampsText = timestampsOption.querySelector(
          `.${classPrefix}-settings-text`
        );
        this.updateShowTimestampsState();
        menu.appendChild(timestampsOption);
      }
    });
    this.handlers.settingsClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._panel?.markJustOpenedForClick();
      this._panel?.toggle();
    };
    this.settingsButton.addEventListener("click", this.handlers.settingsClick);
    this.handlers.settingsKeydown = (e) => {
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
    };
    this.settingsButton.addEventListener("keydown", this.handlers.settingsKeydown);
    const title = DOMUtils.createElement("h3", {
      textContent: `${i18n.t("transcript.title")}. ${i18n.t("transcript.dragResizePrompt")}`
    });
    const autoscrollId = `${this.player.options.classPrefix}-transcript-autoscroll-${Date.now()}`;
    const autoscrollLabel = DOMUtils.createElement("label", {
      className: `${this.player.options.classPrefix}-transcript-autoscroll-label`,
      attributes: {
        "for": autoscrollId
      }
    });
    this.autoscrollCheckbox = DOMUtils.createElement("input", {
      attributes: {
        "id": autoscrollId,
        "type": "checkbox"
      }
    });
    if (this.autoscrollEnabled) {
      this.autoscrollCheckbox.checked = true;
    }
    const autoscrollText = DOMUtils.createElement("span", {
      textContent: i18n.t("transcript.autoscroll"),
      className: `${this.player.options.classPrefix}-transcript-autoscroll-text`
    });
    autoscrollLabel.appendChild(this.autoscrollCheckbox);
    autoscrollLabel.appendChild(autoscrollText);
    this.autoscrollCheckbox.addEventListener("change", (e) => {
      this.autoscrollEnabled = e.target.checked;
      this.saveAutoscrollPreference();
    });
    preventDragOnElement(autoscrollLabel);
    this.transcriptHeader.appendChild(title);
    this.headerLeft.appendChild(this.settingsButton);
    this.headerLeft.appendChild(autoscrollLabel);
    const selectId = `${this.player.options.classPrefix}-transcript-language-select-${Date.now()}`;
    const { label: languageLabel, select: languageSelector } = createLabeledSelect({
      classPrefix: this.player.options.classPrefix,
      labelClass: `${this.player.options.classPrefix}-transcript-language-label`,
      selectClass: `${this.player.options.classPrefix}-transcript-language-select`,
      labelText: "settings.language",
      selectId,
      hidden: false
      // Don't hide individual elements, we'll hide the wrapper instead
    });
    this.languageLabel = languageLabel;
    this.languageSelector = languageSelector;
    const languageSelectorWrapper = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-language-wrapper`,
      attributes: {
        "style": "display: none;"
      }
    });
    languageSelectorWrapper.appendChild(languageLabel);
    languageSelectorWrapper.appendChild(languageSelector);
    this.languageSelectorWrapper = languageSelectorWrapper;
    preventDragOnElement(languageSelectorWrapper);
    if (this.headerLeft) {
      this.headerLeft.appendChild(languageSelectorWrapper);
    }
    const closeAriaLabel = i18n.t("transcript.close");
    const closeButton = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-transcript-close`,
      attributes: {
        "type": "button",
        "aria-label": closeAriaLabel
      }
    });
    closeButton.appendChild(createIconElement("close"));
    DOMUtils.attachTooltip(closeButton, closeAriaLabel, this.player.options.classPrefix);
    closeButton.addEventListener("click", () => this.hideTranscript({ focusButton: true }));
    this.transcriptHeader.appendChild(this.headerLeft);
    this.transcriptHeader.appendChild(closeButton);
    this.transcriptContent = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-content`
    });
    this.transcriptWindow.appendChild(this.transcriptHeader);
    this.transcriptWindow.appendChild(this.transcriptContent);
    this.createResizeHandles();
    this.liveRegion = DOMUtils.createElement("div", {
      className: "vidply-sr-only",
      attributes: {
        "aria-live": "polite",
        "aria-atomic": "true"
      }
    });
    this.transcriptWindow.appendChild(this.liveRegion);
    this.player.container.appendChild(this.transcriptWindow);
    this.setupDragAndDrop();
    if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
      this.positionTranscript();
    }
    this.handlers.documentClick = (e) => {
      if (this.styleDialogJustOpened) {
        return;
      }
      const target = e.target;
      if (this.styleDialogVisible && this.styleDialog && target && !this.styleDialog.contains(target)) {
        this.hideStyleDialog();
      }
    };
    this.documentClickHandlerAdded = false;
    let resizeTimeout = null;
    this.handlers.resize = () => {
      if (resizeTimeout) {
        this.clearManagedTimeout(resizeTimeout);
      }
      resizeTimeout = this.setManagedTimeout(() => {
        if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
          this.positionTranscript();
        }
      }, 100);
    };
    window.addEventListener("resize", this.handlers.resize, {
      signal: this.player.lifecycleSignal
    });
  }
  createResizeHandles() {
    const transcriptWindow = this.transcriptWindow;
    if (!transcriptWindow) return;
    const directions = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    this.transcriptResizeHandles = directions.map((direction) => {
      const handle = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-resize-handle ${this.player.options.classPrefix}-transcript-resize-${direction}`,
        attributes: {
          "data-direction": direction,
          "data-vidply-managed-resize": "true",
          "aria-hidden": "true"
        }
      });
      handle.style.display = "none";
      transcriptWindow.appendChild(handle);
      return handle;
    });
  }
  /**
   * Position transcript window next to video
   */
  positionTranscript() {
    const playerWithVideoWrapper = this.player;
    if (!this.transcriptWindow || !playerWithVideoWrapper.videoWrapper || !this.isVisible) return;
    if (this.draggableResizable && this.draggableResizable.manuallyPositioned) {
      return;
    }
    const isMobile = window.innerWidth < 768;
    const videoRect = playerWithVideoWrapper.videoWrapper.getBoundingClientRect();
    const isFullscreen = this.player.state.fullscreen;
    if (isMobile && !isFullscreen) {
      this.transcriptWindow.style.position = "relative";
      this.transcriptWindow.style.left = "0";
      this.transcriptWindow.style.right = "0";
      this.transcriptWindow.style.bottom = "auto";
      this.transcriptWindow.style.top = "auto";
      this.transcriptWindow.style.width = "100%";
      this.transcriptWindow.style.maxWidth = "100%";
      this.transcriptWindow.style.maxHeight = "300px";
      this.transcriptWindow.style.height = "auto";
      this.transcriptWindow.style.borderRadius = "0";
      this.transcriptWindow.style.transform = "none";
      this.transcriptWindow.style.border = "none";
      this.transcriptWindow.style.borderTop = "1px solid var(--vidply-border-light)";
      this.transcriptWindow.style.removeProperty("border-right");
      this.transcriptWindow.style.removeProperty("border-bottom");
      this.transcriptWindow.style.removeProperty("border-left");
      this.transcriptWindow.style.removeProperty("border-image");
      this.transcriptWindow.style.removeProperty("border-image-source");
      this.transcriptWindow.style.removeProperty("border-image-slice");
      this.transcriptWindow.style.removeProperty("border-image-width");
      this.transcriptWindow.style.removeProperty("border-image-outset");
      this.transcriptWindow.style.removeProperty("border-image-repeat");
      this.transcriptWindow.style.boxShadow = "none";
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = "default";
      }
      const videoWrapper = playerWithVideoWrapper.videoWrapper;
      if (videoWrapper && videoWrapper.parentNode && videoWrapper.nextSibling !== this.transcriptWindow) {
        videoWrapper.parentNode.insertBefore(this.transcriptWindow, videoWrapper.nextSibling);
      }
    } else if (isFullscreen) {
      this.transcriptWindow.style.position = "fixed";
      this.transcriptWindow.style.left = "auto";
      this.transcriptWindow.style.right = "20px";
      this.transcriptWindow.style.bottom = "80px";
      this.transcriptWindow.style.top = "auto";
      this.transcriptWindow.style.maxHeight = "calc(100vh - 180px)";
      this.transcriptWindow.style.height = "auto";
      const fullscreenMinWidth = 260;
      const fullscreenAvailable = Math.max(fullscreenMinWidth, window.innerWidth - 40);
      const fullscreenDesired = parseFloat(this.transcriptWindow.style.width) || 400;
      const fullscreenWidth = Math.max(fullscreenMinWidth, Math.min(fullscreenDesired, fullscreenAvailable));
      this.transcriptWindow.style.width = `${fullscreenWidth}px`;
      this.transcriptWindow.style.maxWidth = "none";
      this.transcriptWindow.style.borderRadius = "8px";
      this.transcriptWindow.style.border = "1px solid var(--vidply-border)";
      this.transcriptWindow.style.removeProperty("border-top");
      this.transcriptWindow.style.removeProperty("border-right");
      this.transcriptWindow.style.removeProperty("border-bottom");
      this.transcriptWindow.style.removeProperty("border-left");
      this.transcriptWindow.style.removeProperty("border-image");
      this.transcriptWindow.style.removeProperty("border-image-source");
      this.transcriptWindow.style.removeProperty("border-image-slice");
      this.transcriptWindow.style.removeProperty("border-image-width");
      this.transcriptWindow.style.removeProperty("border-image-outset");
      this.transcriptWindow.style.removeProperty("border-image-repeat");
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = "move";
      }
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    } else {
      const transcriptWidth = parseFloat(this.transcriptWindow.style.width) || 400;
      const padding = 20;
      const minWidth = 260;
      const containerRect = this.player.container.getBoundingClientRect();
      const ensureContainerPositioned = () => {
        const computed = window.getComputedStyle(this.player.container);
        if (computed.position === "static") {
          this.player.container.style.position = "relative";
        }
      };
      ensureContainerPositioned();
      const availableWidth = window.innerWidth - videoRect.right - padding;
      const wouldBeCutOff = availableWidth < transcriptWidth;
      const hasMinimumSpace = availableWidth >= minWidth;
      const useOverlay = wouldBeCutOff || !hasMinimumSpace;
      if (!useOverlay) {
        const left = videoRect.right - containerRect.left + padding;
        const appliedWidth = Math.max(minWidth, Math.min(transcriptWidth, availableWidth));
        const appliedHeight = videoRect.height;
        this.transcriptWindow.style.position = "absolute";
        this.transcriptWindow.style.left = `${left}px`;
        this.transcriptWindow.style.right = "auto";
        this.transcriptWindow.style.bottom = "auto";
        this.transcriptWindow.style.top = "0";
        this.transcriptWindow.style.height = `${appliedHeight}px`;
        this.transcriptWindow.style.maxHeight = "none";
        this.transcriptWindow.style.width = `${appliedWidth}px`;
        this.transcriptWindow.style.maxWidth = "none";
        this.transcriptWindow.style.boxShadow = "";
      } else {
        const overlayMaxWidth = 320;
        const overlayMaxHeight = 280;
        const overlayWidth = Math.min(overlayMaxWidth, videoRect.width - 40);
        const overlayHeight = Math.min(overlayMaxHeight, videoRect.height - 120);
        const videoWrapperRect = playerWithVideoWrapper.videoWrapper.getBoundingClientRect();
        const controlsHeight = 70;
        const overlayActualHeight = Math.max(180, overlayHeight);
        const topPosition = videoWrapperRect.bottom - containerRect.top - controlsHeight - overlayActualHeight;
        const rightPosition = containerRect.right - videoWrapperRect.right + 12;
        this.transcriptWindow.style.position = "absolute";
        this.transcriptWindow.style.left = "auto";
        this.transcriptWindow.style.right = `${rightPosition}px`;
        this.transcriptWindow.style.top = `${topPosition}px`;
        this.transcriptWindow.style.bottom = "auto";
        this.transcriptWindow.style.width = `${Math.max(minWidth, overlayWidth)}px`;
        this.transcriptWindow.style.maxWidth = `${overlayMaxWidth}px`;
        this.transcriptWindow.style.height = `${overlayActualHeight}px`;
        this.transcriptWindow.style.maxHeight = `${overlayMaxHeight}px`;
        this.transcriptWindow.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.6)";
      }
      this.transcriptWindow.style.borderRadius = "8px";
      this.transcriptWindow.style.border = "1px solid var(--vidply-border)";
      this.transcriptWindow.style.removeProperty("border-top");
      this.transcriptWindow.style.removeProperty("border-right");
      this.transcriptWindow.style.removeProperty("border-bottom");
      this.transcriptWindow.style.removeProperty("border-left");
      this.transcriptWindow.style.removeProperty("border-image");
      this.transcriptWindow.style.removeProperty("border-image-source");
      this.transcriptWindow.style.removeProperty("border-image-slice");
      this.transcriptWindow.style.removeProperty("border-image-width");
      this.transcriptWindow.style.removeProperty("border-image-outset");
      this.transcriptWindow.style.removeProperty("border-image-repeat");
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = "move";
      }
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    }
  }
  /**
   * Get available transcript languages from tracks
   */
  getAvailableTranscriptLanguages() {
    const textTracks = this.player.textTracks;
    const languages = /* @__PURE__ */ new Map();
    textTracks.forEach((track) => {
      if ((track.kind === "captions" || track.kind === "subtitles") && !track._vidplyStale) {
        const lang = (track.language ?? "").trim();
        const label = deriveTrackLabel(track.label, track.language, "player.captions");
        const key = lang || label;
        if (key && !languages.has(key)) {
          languages.set(key, {
            language: lang,
            label,
            track
          });
        }
      }
    });
    return Array.from(languages.values());
  }
  /**
   * Update language selector dropdown
   */
  updateLanguageSelector() {
    const languageSelector = this.languageSelector;
    if (!languageSelector) return;
    this.availableTranscriptLanguages = this.getAvailableTranscriptLanguages();
    languageSelector.innerHTML = "";
    if (this.availableTranscriptLanguages.length < 2) {
      if (this.languageSelectorWrapper) {
        this.languageSelectorWrapper.style.display = "none";
      }
      return;
    }
    if (this.languageSelectorWrapper) {
      this.languageSelectorWrapper.style.display = "flex";
    }
    this.availableTranscriptLanguages.forEach((langInfo) => {
      const attrs = {
        "value": langInfo.language || langInfo.label
      };
      if (langInfo.language) {
        attrs["lang"] = langInfo.language;
      }
      const option = DOMUtils.createElement("option", {
        textContent: langInfo.label,
        attributes: attrs
      });
      languageSelector.appendChild(option);
    });
    if (this.currentTranscriptLanguage) {
      languageSelector.value = this.currentTranscriptLanguage;
    } else if (this.availableTranscriptLanguages.length > 0) {
      const activeTrack = this.player.textTracks.find(
        (track) => (track.kind === "captions" || track.kind === "subtitles") && track.mode === "showing"
      );
      const firstLang = this.availableTranscriptLanguages[0];
      const fallbackLang = firstLang ? firstLang.language : null;
      this.currentTranscriptLanguage = activeTrack ? activeTrack.language : fallbackLang;
      if (this.currentTranscriptLanguage) {
        languageSelector.value = this.currentTranscriptLanguage;
      }
    }
    if (this.languageSelectorHandler) {
      languageSelector.removeEventListener("change", this.languageSelectorHandler);
    }
    const handler = (e) => {
      this.currentTranscriptLanguage = e.target.value;
      this._requestStreamingTrack(this.currentTranscriptLanguage);
      this.loadTranscriptData();
      if (this.transcriptContent && this.currentTranscriptLanguage) {
        this.transcriptContent.setAttribute("lang", this.currentTranscriptLanguage);
      }
    };
    this.languageSelectorHandler = handler;
    languageSelector.addEventListener("change", handler);
  }
  _parseVTT(vttText) {
    const cues = [];
    const blocks = vttText.replace(/\r\n/g, "\n").split(/\n\n+/);
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      let tsLine = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes("-->")) {
          tsLine = i;
          break;
        }
      }
      if (tsLine < 0) continue;
      const match = lines[tsLine]?.match(
        /(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})/
      );
      if (!match) continue;
      const startTime = (match[1] ? parseInt(match[1]) * 3600 : 0) + parseInt(match[2] ?? "0") * 60 + parseInt(match[3] ?? "0") + parseInt(match[4] ?? "0") / 1e3;
      const endTime = (match[5] ? parseInt(match[5]) * 3600 : 0) + parseInt(match[6] ?? "0") * 60 + parseInt(match[7] ?? "0") + parseInt(match[8] ?? "0") / 1e3;
      const text = lines.slice(tsLine + 1).join("\n").trim();
      if (!text) continue;
      cues.push({
        cue: { startTime, endTime, text, id: "" },
        type: "caption"
      });
    }
    return cues;
  }
  async _loadVttTranscript(lang) {
    const cached = this._vttCache.get(lang);
    if (cached) return cached;
    const renderer = this.player.renderer;
    if (!renderer?.isStreaming || typeof renderer.getTextTrackURLs !== "function") return null;
    const urls = renderer.getTextTrackURLs();
    const entry = urls.find(
      (u) => u.lang === lang || u.lang.startsWith(lang) || lang.startsWith(u.lang)
    );
    if (!entry) return null;
    const signal = this._buildFetchSignal(1e4);
    try {
      const res = await fetch(entry.url, { signal });
      if (!res.ok) return null;
      let text = await res.text();
      if (text.trimStart().startsWith("#EXTM3U")) {
        const vttUri = text.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
        if (!vttUri) return null;
        const baseUrl = entry.url.substring(0, entry.url.lastIndexOf("/") + 1);
        const vttUrl = vttUri.startsWith("http") ? vttUri : new URL(vttUri, baseUrl).href;
        const vttRes = await fetch(vttUrl, { signal: this._buildFetchSignal(1e4) });
        if (!vttRes.ok) return null;
        text = await vttRes.text();
      }
      const cues = this._parseVTT(text);
      if (cues.length > 0) this._vttCache.set(lang, cues);
      return cues;
    } catch {
      return null;
    }
  }
  /**
   * Build an AbortSignal that fires when either the player is destroyed
   * or `timeoutMs` elapses, whichever happens first.
   */
  _buildFetchSignal(timeoutMs) {
    const signals = [];
    const lifecycle = this.player.lifecycleSignal;
    if (lifecycle) signals.push(lifecycle);
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      signals.push(AbortSignal.timeout(timeoutMs));
    }
    if (signals.length === 0) return void 0;
    if (signals.length === 1) return signals[0];
    const anyFn = AbortSignal.any;
    return anyFn ? anyFn(signals) : signals[0];
  }
  /**
   * Load transcript data from caption/subtitle tracks
   */
  loadTranscriptData() {
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    if (this.transcriptContent) {
      this.transcriptContent.innerHTML = "";
    }
    const textTracks = this.player.textTracks;
    let captionTrack = null;
    if (this.currentTranscriptLanguage) {
      const candidates = textTracks.filter(
        (track) => (track.kind === "captions" || track.kind === "subtitles") && track.language === this.currentTranscriptLanguage && !track._vidplyStale
      );
      captionTrack = candidates.find((t) => t.cues && t.cues.length > 0) || candidates[0] || null;
    }
    if (!captionTrack) {
      const candidates = textTracks.filter(
        (track) => (track.kind === "captions" || track.kind === "subtitles") && !track._vidplyStale
      );
      captionTrack = candidates.find((t) => t.cues && t.cues.length > 0) || candidates[0] || null;
      if (captionTrack) {
        this.currentTranscriptLanguage = captionTrack.language;
      }
    }
    let descriptionTrack = null;
    if (this.currentTranscriptLanguage) {
      descriptionTrack = textTracks.find(
        (track) => track.kind === "descriptions" && track.language === this.currentTranscriptLanguage
      ) || null;
    }
    if (!descriptionTrack) {
      descriptionTrack = textTracks.find((track) => track.kind === "descriptions") || null;
    }
    const metadataTrack = textTracks.find((track) => track.kind === "metadata");
    if (!captionTrack && !descriptionTrack && !metadataTrack) {
      this.showNoTranscriptMessage();
      return;
    }
    const tracksToLoad = [captionTrack, descriptionTrack, metadataTrack].filter(
      (track) => Boolean(track)
    );
    tracksToLoad.forEach((track) => {
      if (track.mode === "disabled") {
        track.mode = "hidden";
      }
    });
    const renderer = this.player.renderer;
    const isStreaming = renderer?.isStreaming && typeof renderer.getTextTrackURLs === "function";
    const lang = this.currentTranscriptLanguage || (captionTrack?.language ?? "");
    if (isStreaming && lang) {
      const loadingMessage = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: i18n.t("transcript.loading")
      });
      this.transcriptContent?.appendChild(loadingMessage);
      this._loadVttTranscript(lang).then((vttCues) => {
        if (!this.isVisible) return;
        this._renderTranscriptCues(
          vttCues && vttCues.length > 0 ? vttCues : null,
          captionTrack,
          descriptionTrack
        );
      });
      return;
    }
    const primaryTrack = captionTrack;
    const primaryNeedsCues = primaryTrack && (!primaryTrack.cues || primaryTrack.cues.length === 0);
    if (primaryNeedsCues) {
      const loadingMessage = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: i18n.t("transcript.loading")
      });
      this.transcriptContent?.appendChild(loadingMessage);
      const hasSidecarElement = this.player.findTrackElement?.(primaryTrack);
      if (hasSidecarElement) {
        primaryTrack.addEventListener("load", () => {
          this.loadTranscriptData();
        }, { once: true });
        this.setManagedTimeout(() => {
          this.loadTranscriptData();
        }, 1e3);
      } else {
        let attempts = 0;
        const poll = () => {
          attempts++;
          if (!this.isVisible) return;
          if (primaryTrack.cues && primaryTrack.cues.length > 0) {
            this.loadTranscriptData();
            return;
          }
          if (attempts < 40) {
            this.setManagedTimeout(poll, 500);
          }
        };
        this.setManagedTimeout(poll, 300);
      }
      return;
    }
    this._renderTranscriptCues(null, captionTrack, descriptionTrack);
  }
  _renderTranscriptCues(vttCues, captionTrack, descriptionTrack) {
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    const transcriptContent = this.transcriptContent;
    if (transcriptContent) {
      transcriptContent.innerHTML = "";
    }
    const allCues = [];
    if (vttCues && vttCues.length > 0) {
      allCues.push(...vttCues);
    } else if (captionTrack && captionTrack.cues) {
      Array.from(captionTrack.cues).forEach((cue) => {
        allCues.push({ cue, type: "caption" });
      });
    }
    if (descriptionTrack && descriptionTrack.cues) {
      Array.from(descriptionTrack.cues).forEach((cue) => {
        allCues.push({ cue, type: "description" });
      });
    }
    allCues.sort((a, b) => a.cue.startTime - b.cue.startTime);
    allCues.forEach((item, index) => {
      const entry = this.createTranscriptEntry(item.cue, index, item.type);
      this.transcriptEntries.push({
        element: entry,
        cue: item.cue,
        type: item.type,
        startTime: item.cue.startTime,
        endTime: item.cue.endTime
      });
      transcriptContent?.appendChild(entry);
    });
    this.applyTranscriptStyles();
    this.updateTimestampVisibility();
    if (this.transcriptContent && this.currentTranscriptLanguage) {
      this.transcriptContent.setAttribute("lang", this.currentTranscriptLanguage);
    }
    this.updateLanguageSelector();
    this.updateActiveEntry();
  }
  /**
   * Handle an individual metadata cue.
   *
   * Directive parsing (`PAUSE`, `FOCUS:`, `#hashtags`) lives in the
   * scoped {@link MetadataAlertsManager}, which resolves selectors
   * inside the player container by default (never document-wide unless
   * the embedder opts into `metadataDirectives: 'global'`). Delegating
   * here keeps a single source of truth and prevents an untrusted VTT
   * cue from moving focus to arbitrary elements on the host page.
   */
  handleMetadataCue(cue) {
    this.player.handleMetadataCue(cue);
  }
  /**
   * Create a single transcript entry element
   */
  createTranscriptEntry(cue, index, type = "caption") {
    const entryText = this.stripVTTFormatting(cue.text || "");
    const seekLabelTemplate = i18n.t("transcript.seekTo") || "Seek to {time}";
    const ariaLabel = seekLabelTemplate.replace("{time}", TimeUtils.formatTime(cue.startTime)).replace("{text}", entryText);
    const entry = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-transcript-entry ${this.player.options.classPrefix}-transcript-${type}`,
      attributes: {
        "type": "button",
        "data-start": String(cue.startTime),
        "data-end": String(cue.endTime),
        "data-type": type,
        "aria-label": `${ariaLabel} — ${entryText}`
      }
    });
    const timestamp = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-transcript-time`,
      textContent: TimeUtils.formatTime(cue.startTime),
      attributes: {
        "aria-hidden": "true"
        // Hide from screen readers - decorative timestamp
      }
    });
    const text = DOMUtils.createElement("span", {
      className: `${this.player.options.classPrefix}-transcript-text`,
      textContent: entryText
    });
    entry.appendChild(timestamp);
    entry.appendChild(text);
    const seekToTime = () => {
      this.player.seek(cue.startTime);
      if (this.player.state.paused) {
        this.player.play();
      }
    };
    entry.addEventListener("click", seekToTime);
    return entry;
  }
  /**
   * Strip VTT formatting tags from text
   */
  stripVTTFormatting(text) {
    return text.replace(/<[^>]+>/g, "").replace(/\n/g, " ").trim();
  }
  /**
   * Show message when no transcript is available
   */
  showNoTranscriptMessage() {
    const message = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-empty`,
      textContent: i18n.t("transcript.noTranscript")
    });
    this.transcriptContent?.appendChild(message);
  }
  /**
   * Update active transcript entry based on current time
   */
  updateActiveEntry() {
    if (!this.isVisible || this.transcriptEntries.length === 0) return;
    const currentTime = this.player.state.currentTime;
    const activeEntry = this.transcriptEntries.find(
      (entry) => currentTime >= entry.startTime && currentTime < entry.endTime
    );
    if (activeEntry && activeEntry !== this.currentActiveEntry) {
      if (this.currentActiveEntry) {
        this.currentActiveEntry.element.classList.remove(
          `${this.player.options.classPrefix}-transcript-entry-active`
        );
      }
      activeEntry.element.classList.add(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      this.scrollToEntry(activeEntry.element);
      this.currentActiveEntry = activeEntry;
    } else if (!activeEntry && this.currentActiveEntry) {
      this.currentActiveEntry.element.classList.remove(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      this.currentActiveEntry = null;
    }
  }
  /**
   * Scroll transcript window to show active entry
   */
  scrollToEntry(entryElement) {
    if (!this.transcriptContent || !this.autoscrollEnabled) return;
    const contentRect = this.transcriptContent.getBoundingClientRect();
    const entryRect = entryElement.getBoundingClientRect();
    if (entryRect.top < contentRect.top || entryRect.bottom > contentRect.bottom) {
      const scrollTop = entryElement.offsetTop - this.transcriptContent.clientHeight / 2 + entryElement.clientHeight / 2;
      this.transcriptContent.scrollTo({
        top: scrollTop,
        behavior: "smooth"
      });
    }
  }
  /**
   * Save autoscroll preference to localStorage
   */
  saveAutoscrollPreference() {
    const savedPreferences = this.storage.getTranscriptPreferences() || {};
    savedPreferences.autoscroll = this.autoscrollEnabled;
    this.storage.saveTranscriptPreferences(savedPreferences);
  }
  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    if (!this.transcriptHeader || !this.transcriptWindow) return;
    const isMobile = window.innerWidth < 768;
    const isFullscreen = this.player.state.fullscreen;
    if (isMobile && !isFullscreen) {
      if (this.draggableResizable) {
        this.draggableResizable.destroy();
        this.draggableResizable = null;
      }
      return;
    }
    if (this.draggableResizable) {
      return;
    }
    this.draggableResizable = new DraggableResizable(this.transcriptWindow, {
      dragHandle: this.transcriptHeader,
      resizeHandles: this.transcriptResizeHandles,
      constrainToViewport: true,
      classPrefix: `${this.player.options.classPrefix}-transcript`,
      keyboardDragKey: "d",
      keyboardResizeKey: "r",
      keyboardStep: 10,
      keyboardStepLarge: 50,
      minWidth: 300,
      minHeight: 200,
      maxWidth: () => Math.max(320, window.innerWidth - 40),
      maxHeight: () => Math.max(200, window.innerHeight - 120),
      pointerResizeIndicatorText: i18n.t("transcript.resizeModeHint"),
      onPointerResizeToggle: (enabled) => {
        this.transcriptResizeHandles.forEach((handle) => {
          handle.style.display = enabled ? "block" : "none";
        });
        this.onPointerResizeModeChange(enabled);
      },
      onDragStart: (e) => {
        const ignoreSelectors = [
          `.${this.player.options.classPrefix}-transcript-close`,
          `.${this.player.options.classPrefix}-transcript-settings`,
          `.${this.player.options.classPrefix}-transcript-language-select`,
          `.${this.player.options.classPrefix}-transcript-language-label`,
          `.${this.player.options.classPrefix}-transcript-settings-menu`,
          `.${this.player.options.classPrefix}-transcript-style-dialog`
        ];
        for (const selector of ignoreSelectors) {
          if (e.target.closest(selector)) {
            return false;
          }
        }
        return true;
      }
    });
    this.customKeyHandler = (e) => {
      const key = e.key.toLowerCase();
      const alreadyPrevented = e.defaultPrevented;
      if (this.settingsMenuVisible || this.styleDialogVisible) {
        return;
      }
      if (key === "home") {
        e.preventDefault();
        e.stopPropagation();
        if (this.draggableResizable) {
          if (this.draggableResizable.pointerResizeMode) {
            this.draggableResizable.disablePointerResizeMode();
          }
          this.draggableResizable.manuallyPositioned = false;
          this.positionTranscript();
          this.updateResizeOptionState();
          this.announceLive(i18n.t("transcript.positionReset"));
        }
        return;
      }
      if (key === "r") {
        if (alreadyPrevented) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const enabled = this.toggleResizeMode();
        if (enabled) {
          this.transcriptWindow?.focus({ preventScroll: true });
        }
        return;
      }
      if (key === "escape") {
        if (this.draggableResizable && this.draggableResizable.pointerResizeMode) {
          e.preventDefault();
          e.stopPropagation();
          this.draggableResizable.disablePointerResizeMode();
          return;
        }
        if (this.draggableResizable && this.draggableResizable.keyboardDragMode) {
          e.preventDefault();
          e.stopPropagation();
          this.draggableResizable.disableKeyboardDragMode();
          this.announceLive(i18n.t("transcript.dragModeDisabled"));
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.hideTranscript({ focusButton: true });
        return;
      }
    };
    const customKeyHandler = this.customKeyHandler;
    if (this.transcriptWindow && customKeyHandler) {
      this.transcriptWindow.addEventListener("keydown", customKeyHandler, {
        signal: this.player.lifecycleSignal
      });
    }
  }
  /**
   * Toggle keyboard drag mode. Mirrors the sign-language flow: a
   * persistent badge is shown on the transcript window while the mode
   * is active, and a live-region announcement is made on each state
   * change.
   */
  toggleKeyboardDragMode() {
    if (this.draggableResizable) {
      const wasEnabled = this.draggableResizable.keyboardDragMode;
      this.draggableResizable.toggleKeyboardDragMode();
      const isEnabled = this.draggableResizable.keyboardDragMode;
      if (!wasEnabled && isEnabled) {
        this.enableMoveMode();
        this._panel?.showBadge(i18n.t("transcript.dragModeBadge"));
        this.announceLive(i18n.t("transcript.dragModeEnabled"));
      } else if (wasEnabled && !isEnabled) {
        this._panel?.hideBadge();
        this.announceLive(i18n.t("transcript.dragModeDisabled"));
      }
      this.updateDragOptionState();
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      }
      this.transcriptWindow?.focus({ preventScroll: true });
    }
  }
  /**
   * Toggle settings menu visibility
   */
  toggleSettingsMenu() {
    if (this.settingsMenuVisible) {
      this.hideSettingsMenu();
    } else {
      this.showSettingsMenu();
    }
  }
  /**
   * Show the settings menu. Delegates to the shared {@link DraggablePanel};
   * kept as a named method so external callers (tests, other managers)
   * that referenced the legacy API keep working.
   */
  showSettingsMenu() {
    this._panel?.show();
  }
  /** @see {@link showSettingsMenu} */
  positionSettingsMenu() {
    this._panel?.reposition();
  }
  /** @see {@link showSettingsMenu} */
  hideSettingsMenu({ focusButton = true } = {}) {
    this._panel?.hide({ focusButton });
  }
  /**
   * Enable move mode (gives visual feedback)
   */
  /**
   * Brief pulse animation on the transcript window to confirm entry
   * into keyboard drag mode. The textual hint that used to also flash
   * here has been replaced by a persistent {@link DraggablePanel}
   * badge (see `toggleKeyboardDragMode`), so this method only owns
   * the 1s visual cue now.
   */
  enableMoveMode() {
    this.transcriptWindow?.classList.add(
      `${this.player.options.classPrefix}-transcript-move-mode`
    );
    setTimeout(() => {
      this.transcriptWindow?.classList.remove(
        `${this.player.options.classPrefix}-transcript-move-mode`
      );
    }, 2e3);
  }
  /**
   * Toggle resize mode
   */
  toggleResizeMode({ focus = true } = {}) {
    if (!this.draggableResizable) {
      return false;
    }
    if (this.draggableResizable.pointerResizeMode) {
      this.draggableResizable.disablePointerResizeMode({ focus });
      return false;
    }
    this.draggableResizable.enablePointerResizeMode({ focus });
    return true;
  }
  // Thin delegates to the panel's refreshState. Kept as named methods
  // so the existing internal call sites (e.g. `toggleKeyboardDragMode`
  // and `toggleResizeMode`) read naturally without having to chain
  // through the optional panel reference every time.
  updateDragOptionState() {
    this._panel?.refreshDragState();
  }
  updateResizeOptionState() {
    this._panel?.refreshResizeState();
  }
  toggleShowTimestamps() {
    this.showTimestamps = !this.showTimestamps;
    this.updateShowTimestampsState();
    this.updateTimestampVisibility();
    this.saveTimestampsPreference();
  }
  updateShowTimestampsState() {
    if (!this.showTimestampsButton) {
      return;
    }
    const text = this.showTimestamps ? i18n.t("transcript.hideTimestamps") : i18n.t("transcript.showTimestamps");
    const ariaLabel = this.showTimestamps ? i18n.t("transcript.hideTimestampsAria") : i18n.t("transcript.showTimestampsAria");
    this.showTimestampsButton.setAttribute("aria-checked", this.showTimestamps ? "true" : "false");
    this.showTimestampsButton.setAttribute("aria-label", ariaLabel);
    if (this.showTimestampsText) {
      this.showTimestampsText.textContent = text;
    }
  }
  updateTimestampVisibility() {
    if (!this.transcriptContent) return;
    const timestamps = this.transcriptContent.querySelectorAll(`.${this.player.options.classPrefix}-transcript-time`);
    timestamps.forEach((timestamp) => {
      timestamp.style.display = this.showTimestamps ? "" : "none";
    });
  }
  saveTimestampsPreference() {
    const savedPreferences = this.storage.getTranscriptPreferences() || {};
    savedPreferences.showTimestamps = this.showTimestamps;
    this.storage.saveTranscriptPreferences(savedPreferences);
  }
  // Legacy shims kept for any external callers that still invoke the
  // old transient-tooltip API. The persistent badge owned by the
  // {@link DraggablePanel} now replaces the 3-second indicator, so
  // these simply forward to the panel. Safe to remove once the next
  // consumer sweep confirms no external references.
  showResizeModeIndicator() {
    this._panel?.showBadge(i18n.t("transcript.resizeModeBadge"));
  }
  hideResizeModeIndicator() {
    this._panel?.hideBadge();
  }
  onPointerResizeModeChange(enabled) {
    this.updateResizeOptionState();
    if (enabled) {
      this._panel?.showBadge(i18n.t("transcript.resizeModeBadge"));
      this.announceLive(i18n.t("transcript.resizeModeEnabled"));
    } else {
      this._panel?.hideBadge();
      this.announceLive(i18n.t("transcript.resizeModeDisabled"));
    }
  }
  /**
   * Show style dialog
   */
  showStyleDialog() {
    if (!this.documentClickHandlerAdded) {
      setTimeout(() => {
        const documentClick = this.handlers.documentClick;
        if (documentClick) {
          document.addEventListener("click", documentClick, {
            signal: this.player.lifecycleSignal
          });
        }
        this.documentClickHandlerAdded = true;
      }, 300);
    }
    if (this.styleDialog) {
      this.styleDialog.style.display = "block";
      this.styleDialogVisible = true;
      if (this.handlers.styleDialogKeydown) {
        document.addEventListener("keydown", this.handlers.styleDialogKeydown, {
          signal: this.player.lifecycleSignal
        });
      }
      this.styleDialogJustOpened = true;
      setTimeout(() => {
        this.styleDialogJustOpened = false;
      }, 350);
      setTimeout(() => {
        const dialog = this.styleDialog;
        if (!dialog) return;
        const firstSelect = dialog.querySelector("select, input");
        if (firstSelect) {
          firstSelect.focus({ preventScroll: true });
        }
      }, 0);
      return;
    }
    const styleDialog = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-style-dialog`
    });
    this.styleDialog = styleDialog;
    const title = DOMUtils.createElement("h4", {
      textContent: i18n.t("transcript.styleTitle"),
      className: `${this.player.options.classPrefix}-transcript-style-title`
    });
    styleDialog.appendChild(title);
    const fontSizeControl = this.createStyleSelectControl(
      i18n.t("captions.fontSize"),
      "fontSize",
      [
        { label: i18n.t("fontSizes.small"), value: "90%" },
        { label: i18n.t("fontSizes.normal"), value: "100%" },
        { label: i18n.t("fontSizes.large"), value: "110%" },
        { label: i18n.t("fontSizes.xlarge"), value: "120%" }
      ]
    );
    styleDialog.appendChild(fontSizeControl);
    const fontFamilyControl = this.createStyleSelectControl(
      i18n.t("captions.fontFamily"),
      "fontFamily",
      [
        { label: i18n.t("fontFamilies.sansSerif"), value: "sans-serif" },
        { label: i18n.t("fontFamilies.serif"), value: "serif" },
        { label: i18n.t("fontFamilies.monospace"), value: "monospace" }
      ]
    );
    styleDialog.appendChild(fontFamilyControl);
    const colorControl = this.createStyleColorControl(i18n.t("captions.color"), "color");
    styleDialog.appendChild(colorControl);
    const bgColorControl = this.createStyleColorControl(i18n.t("captions.backgroundColor"), "backgroundColor");
    styleDialog.appendChild(bgColorControl);
    const opacityControl = this.createStyleOpacityControl(i18n.t("captions.opacity"), "opacity");
    styleDialog.appendChild(opacityControl);
    const closeBtn = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-transcript-style-close`,
      textContent: i18n.t("settings.close"),
      attributes: {
        "type": "button"
      }
    });
    closeBtn.addEventListener("click", () => this.hideStyleDialog());
    styleDialog.appendChild(closeBtn);
    const styleKeyHandler = (e) => {
      if (!this.styleDialogVisible) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.hideStyleDialog();
        return;
      }
      if (e.key === "Tab") {
        const focusableElements = styleDialog.querySelectorAll(
          "select, input, button"
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!firstElement || !lastElement) return;
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus({ preventScroll: true });
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus({ preventScroll: true });
        }
      }
    };
    this.handlers.styleDialogKeydown = styleKeyHandler;
    document.addEventListener("keydown", styleKeyHandler, {
      signal: this.player.lifecycleSignal
    });
    if (this.headerLeft) {
      this.headerLeft.appendChild(styleDialog);
    } else if (this.transcriptHeader) {
      this.transcriptHeader.appendChild(styleDialog);
    }
    this.applyTranscriptStyles();
    this.styleDialogVisible = true;
    styleDialog.style.display = "block";
    this.styleDialogJustOpened = true;
    setTimeout(() => {
      this.styleDialogJustOpened = false;
    }, 350);
    setTimeout(() => {
      const firstSelect = styleDialog.querySelector("select, input");
      if (firstSelect) {
        firstSelect.focus({ preventScroll: true });
      }
    }, 0);
  }
  /**
   * Hide style dialog
   */
  hideStyleDialog() {
    if (this.styleDialog) {
      this.styleDialog.style.display = "none";
      this.styleDialogVisible = false;
      if (this.handlers.styleDialogKeydown) {
        document.removeEventListener("keydown", this.handlers.styleDialogKeydown);
      }
      if (this.settingsButton) {
        this.settingsButton.focus({ preventScroll: true });
      }
    }
  }
  /**
   * Create style select control
   */
  createStyleSelectControl(label, property, options) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": controlId
      }
    });
    group.appendChild(labelEl);
    const select = DOMUtils.createElement("select", {
      className: `${this.player.options.classPrefix}-transcript-style-select`,
      attributes: {
        "id": controlId
      }
    });
    options.forEach((opt) => {
      const option = DOMUtils.createElement("option", {
        textContent: opt.label,
        attributes: {
          "value": opt.value
        }
      });
      if (this.transcriptStyle[property] === opt.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("change", (e) => {
      this.transcriptStyle[property] = e.target.value;
      this.applyTranscriptStyles();
      this.savePreferences();
    });
    group.appendChild(select);
    return group;
  }
  /**
   * Create style color control
   */
  createStyleColorControl(label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": controlId
      }
    });
    group.appendChild(labelEl);
    const input = DOMUtils.createElement("input", {
      attributes: {
        "id": controlId,
        "type": "color",
        "value": this.transcriptStyle[property]
      },
      className: `${this.player.options.classPrefix}-transcript-style-color`
    });
    input.addEventListener("input", (e) => {
      this.transcriptStyle[property] = e.target.value;
      this.applyTranscriptStyles();
      this.savePreferences();
    });
    group.appendChild(input);
    return group;
  }
  /**
   * Create style opacity control
   */
  createStyleOpacityControl(label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;
    const labelEl = DOMUtils.createElement("label", {
      textContent: label,
      attributes: {
        "for": controlId
      }
    });
    group.appendChild(labelEl);
    const opacityProperty = property;
    const valueDisplay = DOMUtils.createElement("span", {
      textContent: Math.round(this.transcriptStyle[opacityProperty] * 100) + "%",
      className: `${this.player.options.classPrefix}-transcript-style-value`
    });
    const input = DOMUtils.createElement("input", {
      attributes: {
        "id": controlId,
        "type": "range",
        "min": "0",
        "max": "1",
        "step": "0.1",
        "value": String(this.transcriptStyle[opacityProperty])
      },
      className: `${this.player.options.classPrefix}-transcript-style-range`
    });
    input.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      this.transcriptStyle[opacityProperty] = value;
      valueDisplay.textContent = Math.round(value * 100) + "%";
      this.applyTranscriptStyles();
      this.savePreferences();
    });
    const inputContainer = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-style-range-container`
    });
    inputContainer.appendChild(input);
    inputContainer.appendChild(valueDisplay);
    group.appendChild(labelEl);
    group.appendChild(inputContainer);
    return group;
  }
  /**
   * Save transcript preferences to localStorage
   */
  savePreferences() {
    this.storage.saveTranscriptPreferences(this.transcriptStyle);
  }
  /**
   * Apply transcript styles
   */
  applyTranscriptStyles() {
    if (!this.transcriptWindow) return;
    this.transcriptWindow.style.backgroundColor = this.transcriptStyle.backgroundColor;
    this.transcriptWindow.style.opacity = String(this.transcriptStyle.opacity);
    if (this.transcriptContent) {
      this.transcriptContent.style.fontSize = this.transcriptStyle.fontSize;
      this.transcriptContent.style.fontFamily = this.transcriptStyle.fontFamily;
      this.transcriptContent.style.color = this.transcriptStyle.color;
    }
    const textEntries = this.transcriptWindow.querySelectorAll(`.${this.player.options.classPrefix}-transcript-text`);
    textEntries.forEach((entry) => {
      entry.style.fontSize = this.transcriptStyle.fontSize;
      entry.style.fontFamily = this.transcriptStyle.fontFamily;
      entry.style.color = this.transcriptStyle.color;
    });
    const timeEntries = this.transcriptWindow.querySelectorAll(`.${this.player.options.classPrefix}-transcript-time`);
    timeEntries.forEach((entry) => {
      entry.style.fontFamily = this.transcriptStyle.fontFamily;
    });
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
   * Cleanup
   */
  destroy() {
    this.hideResizeModeIndicator();
    if (this._panel) {
      this._panel.destroy();
      this._panel = null;
    }
    if (this.draggableResizable) {
      if (this.draggableResizable.pointerResizeMode) {
        this.draggableResizable.disablePointerResizeMode();
        this.updateResizeOptionState();
      }
      this.draggableResizable.destroy();
      this.draggableResizable = null;
    }
    if (this.transcriptWindow && this.customKeyHandler) {
      this.transcriptWindow.removeEventListener("keydown", this.customKeyHandler);
      this.customKeyHandler = null;
    }
    if (this.handlers.timeupdate) {
      this.player.off("timeupdate", this.handlers.timeupdate);
    }
    if (this.handlers.seeked) {
      this.player.off("seeked", this.handlers.seeked);
    }
    if (this.handlers.audiodescriptionenabled) {
      this.player.off("audiodescriptionenabled", this.handlers.audiodescriptionenabled);
    }
    if (this.handlers.audiodescriptiondisabled) {
      this.player.off("audiodescriptiondisabled", this.handlers.audiodescriptiondisabled);
    }
    if (this.handlers.textcuesupdate) {
      this.player.off("textcuesupdate", this.handlers.textcuesupdate);
    }
    if (this.handlers.floatingchange) {
      this.player.off("floatingchange", this.handlers.floatingchange);
    }
    if (this.settingsButton) {
      if (this.handlers.settingsClick) {
        this.settingsButton.removeEventListener("click", this.handlers.settingsClick);
      }
      if (this.handlers.settingsKeydown) {
        this.settingsButton.removeEventListener("keydown", this.handlers.settingsKeydown);
      }
    }
    if (this.handlers.styleDialogKeydown) {
      document.removeEventListener("keydown", this.handlers.styleDialogKeydown);
    }
    if (this.handlers.documentClick) {
      document.removeEventListener("click", this.handlers.documentClick);
    }
    if (this.handlers.resize) {
      window.removeEventListener("resize", this.handlers.resize);
    }
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts.clear();
    this.handlers = {};
    if (this.transcriptWindow && this.transcriptWindow.parentNode) {
      this.transcriptWindow.parentNode.removeChild(this.transcriptWindow);
    }
    this.transcriptWindow = null;
    this.transcriptHeader = null;
    this.transcriptContent = null;
    this.transcriptEntries = [];
    this.styleDialog = null;
    this.transcriptResizeHandles = [];
    this.liveRegion = null;
    this._vttCache.clear();
  }
  announceLive(message) {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = message || "";
  }
};
export {
  TranscriptManager
};
//# sourceMappingURL=vidply.TranscriptManager-65CRCNRZ.js.map
