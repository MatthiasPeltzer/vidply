/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  DOMUtils,
  DraggableResizable,
  StorageManager,
  TimeUtils,
  attachMenuKeyboardNavigation,
  createIconElement,
  createLabeledSelect,
  createMenuItem,
  focusElement,
  i18n,
  preventDragOnElement
} from "./vidply.chunk-LD3OELXW.js";

// src/controls/TranscriptManager.js
var TranscriptManager = class {
  constructor(player) {
    this.player = player;
    this.transcriptWindow = null;
    this.transcriptEntries = [];
    this.metadataCues = [];
    this.currentActiveEntry = null;
    this.isVisible = false;
    this.storage = new StorageManager("vidply");
    this.draggableResizable = null;
    this.settingsMenuVisible = false;
    this.settingsMenu = null;
    this.settingsButton = null;
    this.settingsMenuJustOpened = false;
    this.resizeOptionButton = null;
    this.resizeOptionText = null;
    this.dragOptionButton = null;
    this.dragOptionText = null;
    this.resizeModeIndicator = null;
    this.resizeModeIndicatorTimeout = null;
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
    this.autoscrollEnabled = savedPreferences?.autoscroll !== void 0 ? savedPreferences.autoscroll : true;
    this.showTimestamps = savedPreferences?.showTimestamps !== void 0 ? savedPreferences.showTimestamps : false;
    this.transcriptStyle = {
      fontSize: savedPreferences?.fontSize || this.player.options.transcriptFontSize || "100%",
      fontFamily: savedPreferences?.fontFamily || this.player.options.transcriptFontFamily || "sans-serif",
      color: savedPreferences?.color || this.player.options.transcriptColor || "#ffffff",
      backgroundColor: savedPreferences?.backgroundColor || this.player.options.transcriptBackgroundColor || "#1e1e1e",
      opacity: savedPreferences?.opacity ?? this.player.options.transcriptOpacity ?? 0.98
    };
    this.handlers = {
      timeupdate: () => this.updateActiveEntry(),
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
      resize: null,
      settingsClick: null,
      settingsKeydown: null,
      documentClick: null,
      styleDialogKeydown: null
    };
    this.timeouts = /* @__PURE__ */ new Set();
    this.init();
  }
  init() {
    this.setupMetadataHandlingOnLoad();
    this.player.on("timeupdate", this.handlers.timeupdate);
    this.player.on("audiodescriptionenabled", this.handlers.audiodescriptionenabled);
    this.player.on("audiodescriptiondisabled", this.handlers.audiodescriptiondisabled);
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
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = "flex";
      this.isVisible = true;
      if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === "function") {
        this.player.controlBar.updateTranscriptButton();
      }
      focusElement(this.settingsButton, { delay: 150 });
      return;
    }
    this.createTranscriptWindow();
    this.loadTranscriptData();
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = "flex";
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
    this.handlers.settingsClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      } else {
        this.showSettingsMenu();
      }
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
        // Hidden until we detect multiple languages
      }
    });
    languageSelectorWrapper.appendChild(this.languageLabel);
    languageSelectorWrapper.appendChild(this.languageSelector);
    this.languageSelectorWrapper = languageSelectorWrapper;
    preventDragOnElement(languageSelectorWrapper);
    this.headerLeft.appendChild(languageSelectorWrapper);
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
      if (this.settingsMenuJustOpened) {
        return;
      }
      if (this.styleDialogJustOpened) {
        return;
      }
      if (this.settingsButton && this.settingsButton.contains(e.target)) {
        return;
      }
      if (this.settingsMenu && this.settingsMenu.contains(e.target)) {
        return;
      }
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      }
      if (this.styleDialogVisible && this.styleDialog && !this.styleDialog.contains(e.target)) {
        this.hideStyleDialog();
      }
    };
    this.documentClickHandlerAdded = false;
    let resizeTimeout;
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
    window.addEventListener("resize", this.handlers.resize);
  }
  createResizeHandles() {
    if (!this.transcriptWindow) return;
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
      this.transcriptWindow.appendChild(handle);
      return handle;
    });
  }
  /**
   * Position transcript window next to video
   */
  positionTranscript() {
    if (!this.transcriptWindow || !this.player.videoWrapper || !this.isVisible) return;
    if (this.draggableResizable && this.draggableResizable.manuallyPositioned) {
      return;
    }
    const isMobile = window.innerWidth < 768;
    const videoRect = this.player.videoWrapper.getBoundingClientRect();
    const isFullscreen = this.player.state.fullscreen;
    if (isMobile && !isFullscreen) {
      this.transcriptWindow.style.position = "relative";
      this.transcriptWindow.style.left = "0";
      this.transcriptWindow.style.right = "0";
      this.transcriptWindow.style.bottom = "auto";
      this.transcriptWindow.style.top = "auto";
      this.transcriptWindow.style.width = "100%";
      this.transcriptWindow.style.maxWidth = "100%";
      this.transcriptWindow.style.maxHeight = "400px";
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
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
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
      const left = videoRect.right - containerRect.left + padding;
      const availableWidth = window.innerWidth - videoRect.right - padding;
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
      if ((track.kind === "captions" || track.kind === "subtitles") && track.language) {
        if (!languages.has(track.language)) {
          languages.set(track.language, {
            language: track.language,
            label: track.label || track.language,
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
    if (!this.languageSelector) return;
    this.availableTranscriptLanguages = this.getAvailableTranscriptLanguages();
    this.languageSelector.innerHTML = "";
    if (this.availableTranscriptLanguages.length < 2) {
      if (this.languageSelectorWrapper) {
        this.languageSelectorWrapper.style.display = "none";
      }
      return;
    }
    if (this.languageSelectorWrapper) {
      this.languageSelectorWrapper.style.display = "flex";
    }
    this.availableTranscriptLanguages.forEach((langInfo, index) => {
      const option = DOMUtils.createElement("option", {
        textContent: langInfo.label,
        attributes: {
          "value": langInfo.language,
          "lang": langInfo.language
        }
      });
      this.languageSelector.appendChild(option);
    });
    if (this.currentTranscriptLanguage) {
      this.languageSelector.value = this.currentTranscriptLanguage;
    } else if (this.availableTranscriptLanguages.length > 0) {
      const activeTrack = this.player.textTracks.find(
        (track) => (track.kind === "captions" || track.kind === "subtitles") && track.mode === "showing"
      );
      this.currentTranscriptLanguage = activeTrack ? activeTrack.language : this.availableTranscriptLanguages[0].language;
      this.languageSelector.value = this.currentTranscriptLanguage;
    }
    if (this.languageSelectorHandler) {
      this.languageSelector.removeEventListener("change", this.languageSelectorHandler);
    }
    this.languageSelectorHandler = (e) => {
      this.currentTranscriptLanguage = e.target.value;
      this.loadTranscriptData();
      if (this.transcriptContent && this.currentTranscriptLanguage) {
        this.transcriptContent.setAttribute("lang", this.currentTranscriptLanguage);
      }
    };
    this.languageSelector.addEventListener("change", this.languageSelectorHandler);
  }
  /**
   * Load transcript data from caption/subtitle tracks
   */
  loadTranscriptData() {
    this.transcriptEntries = [];
    this.transcriptContent.innerHTML = "";
    const textTracks = this.player.textTracks;
    let captionTrack = null;
    if (this.currentTranscriptLanguage) {
      captionTrack = textTracks.find(
        (track) => (track.kind === "captions" || track.kind === "subtitles") && track.language === this.currentTranscriptLanguage
      );
    }
    if (!captionTrack) {
      captionTrack = textTracks.find(
        (track) => track.kind === "captions" || track.kind === "subtitles"
      );
      if (captionTrack) {
        this.currentTranscriptLanguage = captionTrack.language;
      }
    }
    let descriptionTrack = null;
    if (this.currentTranscriptLanguage) {
      descriptionTrack = textTracks.find(
        (track) => track.kind === "descriptions" && track.language === this.currentTranscriptLanguage
      );
    }
    if (!descriptionTrack) {
      descriptionTrack = textTracks.find((track) => track.kind === "descriptions");
    }
    const metadataTrack = textTracks.find((track) => track.kind === "metadata");
    if (!captionTrack && !descriptionTrack && !metadataTrack) {
      this.showNoTranscriptMessage();
      return;
    }
    const tracksToLoad = [captionTrack, descriptionTrack, metadataTrack].filter(Boolean);
    tracksToLoad.forEach((track) => {
      if (track.mode === "disabled") {
        track.mode = "hidden";
      }
    });
    const needsLoading = tracksToLoad.some((track) => !track.cues || track.cues.length === 0);
    if (needsLoading) {
      const loadingMessage = DOMUtils.createElement("div", {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: i18n.t("transcript.loading")
      });
      this.transcriptContent.appendChild(loadingMessage);
      let loaded = 0;
      const onLoad = () => {
        loaded++;
        if (loaded >= tracksToLoad.length) {
          this.loadTranscriptData();
        }
      };
      tracksToLoad.forEach((track) => {
        track.addEventListener("load", onLoad, { once: true });
      });
      this.setManagedTimeout(() => {
        this.loadTranscriptData();
      }, 500);
      return;
    }
    const allCues = [];
    if (captionTrack && captionTrack.cues) {
      Array.from(captionTrack.cues).forEach((cue) => {
        allCues.push({ cue, type: "caption" });
      });
    }
    if (descriptionTrack && descriptionTrack.cues) {
      Array.from(descriptionTrack.cues).forEach((cue) => {
        allCues.push({ cue, type: "description" });
      });
    }
    if (metadataTrack && metadataTrack.cues) {
      this.metadataCues = Array.from(metadataTrack.cues);
      this.setupMetadataHandling();
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
      this.transcriptContent.appendChild(entry);
    });
    this.applyTranscriptStyles();
    this.updateTimestampVisibility();
    if (this.transcriptContent && this.currentTranscriptLanguage) {
      this.transcriptContent.setAttribute("lang", this.currentTranscriptLanguage);
    }
    this.updateLanguageSelector();
  }
  /**
   * Setup metadata handling on player load
   * This runs independently of transcript loading
   */
  setupMetadataHandlingOnLoad() {
    const setupMetadata = () => {
      const textTracks = this.player.textTracks;
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
            if (this.player.options.debug) {
              console.log("[VidPly Metadata] Active cues:", activeCues.map((c) => ({
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
        if (this.player.options.debug) {
          const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
          console.log("[VidPly Metadata] Track enabled,", cueCount, "cues available");
        }
      } else if (this.player.options.debug) {
        console.warn("[VidPly Metadata] No metadata track found");
      }
    };
    setupMetadata();
    this.player.on("loadedmetadata", setupMetadata);
  }
  /**
   * Setup metadata handling
   * Metadata cues are not displayed but can be used programmatically
   * This is called when transcript data is loaded (for storing cues)
   */
  setupMetadataHandling() {
    if (!this.metadataCues || this.metadataCues.length === 0) {
      return;
    }
    if (this.player.options.debug) {
      console.log("[VidPly Metadata]", this.metadataCues.length, "cues stored from transcript load");
    }
  }
  /**
   * Handle individual metadata cues
   * Parses metadata text and emits events or triggers actions
   */
  handleMetadataCue(cue) {
    const text = cue.text.trim();
    if (this.player.options.debug) {
      console.log("[VidPly Metadata] Processing cue:", {
        time: cue.startTime,
        text
      });
    }
    this.player.emit("metadata", {
      time: cue.startTime,
      endTime: cue.endTime,
      text,
      cue
    });
    if (text.includes("PAUSE")) {
      if (!this.player.state.paused) {
        if (this.player.options.debug) {
          console.log("[VidPly Metadata] Pausing video at", cue.startTime);
        }
        this.player.pause();
      }
      this.player.emit("metadata:pause", { time: cue.startTime, text });
    }
    const focusMatch = text.match(/FOCUS:([\w#-]+)/);
    if (focusMatch) {
      const targetSelector = focusMatch[1];
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        if (this.player.options.debug) {
          console.log("[VidPly Metadata] Focusing element:", targetSelector);
        }
        this.setManagedTimeout(() => {
          targetElement.focus({ preventScroll: true });
        }, 10);
      } else if (this.player.options.debug) {
        console.warn("[VidPly Metadata] Element not found:", targetSelector);
      }
      this.player.emit("metadata:focus", {
        time: cue.startTime,
        target: targetSelector,
        element: targetElement,
        text
      });
    }
    const hashtags = text.match(/#[\w-]+/g);
    if (hashtags) {
      if (this.player.options.debug) {
        console.log("[VidPly Metadata] Hashtags found:", hashtags);
      }
      this.player.emit("metadata:hashtags", {
        time: cue.startTime,
        hashtags,
        text
      });
    }
  }
  /**
   * Create a single transcript entry element
   */
  createTranscriptEntry(cue, index, type = "caption") {
    const entryText = this.stripVTTFormatting(cue.text);
    const entry = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-entry ${this.player.options.classPrefix}-transcript-${type}`,
      attributes: {
        "tabindex": "0",
        "data-start": String(cue.startTime),
        "data-end": String(cue.endTime),
        "data-type": type
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
    entry.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        seekToTime();
      }
    });
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
    this.transcriptContent.appendChild(message);
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
          this.transcriptWindow.focus({ preventScroll: true });
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
    this.transcriptWindow.addEventListener("keydown", this.customKeyHandler);
  }
  /**
   * Toggle keyboard drag mode
   */
  toggleKeyboardDragMode() {
    if (this.draggableResizable) {
      const wasEnabled = this.draggableResizable.keyboardDragMode;
      this.draggableResizable.toggleKeyboardDragMode();
      const isEnabled = this.draggableResizable.keyboardDragMode;
      if (!wasEnabled && isEnabled) {
        this.enableMoveMode();
      }
      this.updateDragOptionState();
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      }
      this.transcriptWindow.focus({ preventScroll: true });
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
   * Show settings menu
   */
  showSettingsMenu() {
    this.settingsMenuJustOpened = true;
    setTimeout(() => {
      this.settingsMenuJustOpened = false;
    }, 350);
    if (!this.documentClickHandlerAdded) {
      setTimeout(() => {
        document.addEventListener("click", this.handlers.documentClick);
        this.documentClickHandlerAdded = true;
      }, 300);
    }
    if (this.settingsMenu) {
      this.settingsMenu.style.display = "block";
      this.settingsMenuVisible = true;
      if (this.settingsButton) {
        this.settingsButton.setAttribute("aria-expanded", "true");
      }
      this.attachSettingsMenuKeyboardNavigation();
      this.positionSettingsMenuImmediate();
      this.updateResizeOptionState();
      setTimeout(() => {
        const menuItems = this.settingsMenu.querySelectorAll(`.${this.player.options.classPrefix}-transcript-settings-item`);
        if (menuItems.length > 0) {
          menuItems[0].setAttribute("tabindex", "0");
          for (let i = 1; i < menuItems.length; i++) {
            menuItems[i].setAttribute("tabindex", "-1");
          }
          menuItems[0].focus({ preventScroll: true });
        }
      }, 50);
      return;
    }
    this.settingsMenu = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-settings-menu`,
      attributes: {
        "role": "menu"
      }
    });
    const keyboardDragOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: "move",
      label: "transcript.enableDragMode",
      hasTextClass: true,
      onClick: () => {
        this.toggleKeyboardDragMode();
        this.hideSettingsMenu();
      }
    });
    keyboardDragOption.setAttribute("role", "switch");
    keyboardDragOption.setAttribute("aria-checked", "false");
    const dragTooltip = keyboardDragOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (dragTooltip) dragTooltip.remove();
    const dragButtonText = keyboardDragOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (dragButtonText) dragButtonText.remove();
    this.dragOptionButton = keyboardDragOption;
    this.dragOptionText = keyboardDragOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
    this.updateDragOptionState();
    const styleOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: "settings",
      label: "transcript.styleTranscript",
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideSettingsMenu();
        setTimeout(() => {
          this.showStyleDialog();
        }, 50);
      }
    });
    const styleTooltip = styleOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (styleTooltip) styleTooltip.remove();
    const styleButtonText = styleOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (styleButtonText) styleButtonText.remove();
    const resizeOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: "resize",
      label: "transcript.enableResizeMode",
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        const enabled = this.toggleResizeMode({ focus: false });
        if (enabled) {
          this.hideSettingsMenu({ focusButton: false });
          setTimeout(() => {
            if (this.transcriptWindow) {
              this.transcriptWindow.focus({ preventScroll: true });
            }
          }, 20);
        } else {
          this.hideSettingsMenu({ focusButton: true });
        }
      }
    });
    resizeOption.setAttribute("role", "switch");
    resizeOption.setAttribute("aria-checked", "false");
    const resizeTooltip = resizeOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (resizeTooltip) resizeTooltip.remove();
    const resizeButtonText = resizeOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (resizeButtonText) resizeButtonText.remove();
    this.resizeOptionButton = resizeOption;
    this.resizeOptionText = resizeOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
    this.updateResizeOptionState();
    const showTimestampsOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: "clock",
      label: "transcript.showTimestamps",
      hasTextClass: true,
      onClick: () => {
        this.toggleShowTimestamps();
      }
    });
    showTimestampsOption.setAttribute("role", "switch");
    showTimestampsOption.setAttribute("aria-checked", this.showTimestamps ? "true" : "false");
    const timestampsTooltip = showTimestampsOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (timestampsTooltip) timestampsTooltip.remove();
    const timestampsButtonText = showTimestampsOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (timestampsButtonText) timestampsButtonText.remove();
    this.showTimestampsButton = showTimestampsOption;
    this.showTimestampsText = showTimestampsOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
    this.updateShowTimestampsState();
    const closeOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: "close",
      label: "transcript.closeMenu",
      onClick: () => {
        this.hideSettingsMenu();
      }
    });
    const closeTooltip = closeOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (closeTooltip) closeTooltip.remove();
    const closeButtonText = closeOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (closeButtonText) closeButtonText.remove();
    this.settingsMenu.appendChild(keyboardDragOption);
    this.settingsMenu.appendChild(resizeOption);
    this.settingsMenu.appendChild(styleOption);
    this.settingsMenu.appendChild(showTimestampsOption);
    this.settingsMenu.appendChild(closeOption);
    this.settingsMenu.style.visibility = "hidden";
    this.settingsMenu.style.display = "block";
    if (this.settingsButton && this.settingsButton.parentNode) {
      this.settingsButton.insertAdjacentElement("afterend", this.settingsMenu);
    } else if (this.headerLeft) {
      this.headerLeft.appendChild(this.settingsMenu);
    } else if (this.transcriptHeader) {
      this.transcriptHeader.appendChild(this.settingsMenu);
    } else {
      this.transcriptWindow.appendChild(this.settingsMenu);
    }
    this.positionSettingsMenuImmediate();
    requestAnimationFrame(() => {
      if (this.settingsMenu) {
        this.settingsMenu.style.visibility = "visible";
      }
    });
    this.settingsMenuKeyHandler = attachMenuKeyboardNavigation(
      this.settingsMenu,
      this.settingsButton,
      `.${this.player.options.classPrefix}-transcript-settings-item`,
      () => this.hideSettingsMenu({ focusButton: true })
    );
    this.settingsMenuVisible = true;
    this.settingsMenu.style.display = "block";
    if (this.settingsButton) {
      this.settingsButton.setAttribute("aria-expanded", "true");
    }
    this.updateResizeOptionState();
    setTimeout(() => {
      const menuItems = this.settingsMenu.querySelectorAll(`.${this.player.options.classPrefix}-transcript-settings-item`);
      if (menuItems.length > 0) {
        menuItems[0].setAttribute("tabindex", "0");
        for (let i = 1; i < menuItems.length; i++) {
          menuItems[i].setAttribute("tabindex", "-1");
        }
        menuItems[0].focus({ preventScroll: true });
      }
    }, 50);
  }
  /**
   * Position settings menu relative to settings button (immediate/synchronous)
   */
  positionSettingsMenuImmediate() {
    if (!this.settingsMenu || !this.settingsButton) return;
    const container = this.settingsButton.parentElement;
    if (!container) return;
    const buttonRect = this.settingsButton.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const menuRect = this.settingsMenu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const buttonLeft = buttonRect.left - containerRect.left;
    const buttonBottom = buttonRect.bottom - containerRect.top;
    const buttonTop = buttonRect.top - containerRect.top;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    let menuTop = buttonBottom + 4;
    if (spaceBelow < menuRect.height + 20 && spaceAbove > spaceBelow) {
      menuTop = buttonTop - menuRect.height - 4;
      this.settingsMenu.classList.add("vidply-menu-above");
    } else {
      this.settingsMenu.classList.remove("vidply-menu-above");
    }
    this.settingsMenu.style.top = `${menuTop}px`;
    this.settingsMenu.style.left = `${buttonLeft}px`;
    this.settingsMenu.style.right = "auto";
    this.settingsMenu.style.bottom = "auto";
  }
  /**
   * Position settings menu relative to settings button (async for repositioning)
   */
  positionSettingsMenu() {
    if (!this.settingsMenu || !this.settingsButton) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.positionSettingsMenuImmediate();
      }, 10);
    });
  }
  /**
   * Attach keyboard navigation to settings menu
   */
  attachSettingsMenuKeyboardNavigation() {
    if (!this.settingsMenu) return;
    if (this.settingsMenuKeyHandler) {
      this.settingsMenu.removeEventListener("keydown", this.settingsMenuKeyHandler, true);
    }
    const handler = attachMenuKeyboardNavigation(
      this.settingsMenu,
      this.settingsButton,
      `.${this.player.options.classPrefix}-transcript-settings-item`,
      () => this.hideSettingsMenu({ focusButton: true })
    );
    this.settingsMenuKeyHandler = handler;
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
        this.settingsMenu.removeEventListener("keydown", this.settingsMenuKeyHandler, true);
        this.settingsMenuKeyHandler = null;
      }
      if (this.settingsButton) {
        this.settingsButton.setAttribute("aria-expanded", "false");
        if (focusButton) {
          this.settingsButton.focus({ preventScroll: true });
        }
      }
    }
  }
  /**
   * Enable move mode (gives visual feedback)
   */
  enableMoveMode() {
    this.hideResizeModeIndicator();
    this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-move-mode`);
    const tooltip = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-move-tooltip`,
      textContent: "Drag with mouse or press D for keyboard drag mode"
    });
    this.transcriptHeader.appendChild(tooltip);
    setTimeout(() => {
      this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-move-mode`);
      if (tooltip.parentNode) {
        tooltip.remove();
      }
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
  updateDragOptionState() {
    if (!this.dragOptionButton) {
      return;
    }
    const isEnabled = !!(this.draggableResizable && this.draggableResizable.keyboardDragMode);
    const text = isEnabled ? i18n.t("transcript.disableDragMode") : i18n.t("transcript.enableDragMode");
    const ariaLabel = isEnabled ? i18n.t("transcript.disableDragModeAria") : i18n.t("transcript.enableDragModeAria");
    this.dragOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
    this.dragOptionButton.setAttribute("aria-label", ariaLabel);
    if (this.dragOptionText) {
      this.dragOptionText.textContent = text;
    }
  }
  updateResizeOptionState() {
    if (!this.resizeOptionButton) {
      return;
    }
    const isEnabled = !!(this.draggableResizable && this.draggableResizable.pointerResizeMode);
    const text = isEnabled ? i18n.t("transcript.disableResizeMode") : i18n.t("transcript.enableResizeMode");
    const ariaLabel = isEnabled ? i18n.t("transcript.disableResizeModeAria") : i18n.t("transcript.enableResizeModeAria");
    this.resizeOptionButton.setAttribute("aria-checked", isEnabled ? "true" : "false");
    this.resizeOptionButton.setAttribute("aria-label", ariaLabel);
    if (this.resizeOptionText) {
      this.resizeOptionText.textContent = text;
    }
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
  showResizeModeIndicator() {
    if (!this.transcriptHeader) {
      return;
    }
    this.hideResizeModeIndicator();
    const indicator = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-resize-tooltip`,
      textContent: i18n.t("transcript.resizeModeHint") || "Resize handles enabled. Drag edges or corners to adjust. Press Esc or R to exit."
    });
    this.transcriptHeader.appendChild(indicator);
    this.resizeModeIndicator = indicator;
    this.resizeModeIndicatorTimeout = this.setManagedTimeout(() => {
      this.hideResizeModeIndicator();
    }, 3e3);
  }
  hideResizeModeIndicator() {
    if (this.resizeModeIndicatorTimeout) {
      this.clearManagedTimeout(this.resizeModeIndicatorTimeout);
      this.resizeModeIndicatorTimeout = null;
    }
    if (this.resizeModeIndicator && this.resizeModeIndicator.parentNode) {
      this.resizeModeIndicator.remove();
    }
    this.resizeModeIndicator = null;
  }
  onPointerResizeModeChange(enabled) {
    this.updateResizeOptionState();
    if (enabled) {
      this.showResizeModeIndicator();
      this.announceLive(i18n.t("transcript.resizeModeEnabled"));
    } else {
      this.hideResizeModeIndicator();
      this.announceLive(i18n.t("transcript.resizeModeDisabled"));
    }
  }
  /**
   * Show style dialog
   */
  showStyleDialog() {
    if (this.styleDialog) {
      this.styleDialog.style.display = "block";
      this.styleDialogVisible = true;
      if (this.handlers.styleDialogKeydown) {
        document.addEventListener("keydown", this.handlers.styleDialogKeydown);
      }
      this.styleDialogJustOpened = true;
      setTimeout(() => {
        this.styleDialogJustOpened = false;
      }, 350);
      setTimeout(() => {
        const firstSelect = this.styleDialog.querySelector("select, input");
        if (firstSelect) {
          firstSelect.focus({ preventScroll: true });
        }
      }, 0);
      return;
    }
    this.styleDialog = DOMUtils.createElement("div", {
      className: `${this.player.options.classPrefix}-transcript-style-dialog`
    });
    const title = DOMUtils.createElement("h4", {
      textContent: i18n.t("transcript.styleTitle"),
      className: `${this.player.options.classPrefix}-transcript-style-title`
    });
    this.styleDialog.appendChild(title);
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
    this.styleDialog.appendChild(fontSizeControl);
    const fontFamilyControl = this.createStyleSelectControl(
      i18n.t("captions.fontFamily"),
      "fontFamily",
      [
        { label: i18n.t("fontFamilies.sansSerif"), value: "sans-serif" },
        { label: i18n.t("fontFamilies.serif"), value: "serif" },
        { label: i18n.t("fontFamilies.monospace"), value: "monospace" }
      ]
    );
    this.styleDialog.appendChild(fontFamilyControl);
    const colorControl = this.createStyleColorControl(i18n.t("captions.color"), "color");
    this.styleDialog.appendChild(colorControl);
    const bgColorControl = this.createStyleColorControl(i18n.t("captions.backgroundColor"), "backgroundColor");
    this.styleDialog.appendChild(bgColorControl);
    const opacityControl = this.createStyleOpacityControl(i18n.t("captions.opacity"), "opacity");
    this.styleDialog.appendChild(opacityControl);
    const closeBtn = DOMUtils.createElement("button", {
      className: `${this.player.options.classPrefix}-transcript-style-close`,
      textContent: i18n.t("settings.close"),
      attributes: {
        "type": "button"
      }
    });
    closeBtn.addEventListener("click", () => this.hideStyleDialog());
    this.styleDialog.appendChild(closeBtn);
    this.handlers.styleDialogKeydown = (e) => {
      if (!this.styleDialogVisible) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.hideStyleDialog();
        return;
      }
      if (e.key === "Tab") {
        const focusableElements = this.styleDialog.querySelectorAll(
          "select, input, button"
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus({ preventScroll: true });
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener("keydown", this.handlers.styleDialogKeydown);
    if (this.headerLeft) {
      this.headerLeft.appendChild(this.styleDialog);
    } else {
      this.transcriptHeader.appendChild(this.styleDialog);
    }
    this.applyTranscriptStyles();
    this.styleDialogVisible = true;
    this.styleDialog.style.display = "block";
    this.styleDialogJustOpened = true;
    setTimeout(() => {
      this.styleDialogJustOpened = false;
    }, 350);
    setTimeout(() => {
      const firstSelect = this.styleDialog.querySelector("select, input");
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
    const valueDisplay = DOMUtils.createElement("span", {
      textContent: Math.round(this.transcriptStyle[property] * 100) + "%",
      className: `${this.player.options.classPrefix}-transcript-style-value`
    });
    const input = DOMUtils.createElement("input", {
      attributes: {
        "id": controlId,
        "type": "range",
        "min": "0",
        "max": "1",
        "step": "0.1",
        "value": String(this.transcriptStyle[property])
      },
      className: `${this.player.options.classPrefix}-transcript-style-range`
    });
    input.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      this.transcriptStyle[property] = value;
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
    if (this.handlers.audiodescriptionenabled) {
      this.player.off("audiodescriptionenabled", this.handlers.audiodescriptionenabled);
    }
    if (this.handlers.audiodescriptiondisabled) {
      this.player.off("audiodescriptiondisabled", this.handlers.audiodescriptiondisabled);
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
    this.handlers = null;
    if (this.transcriptWindow && this.transcriptWindow.parentNode) {
      this.transcriptWindow.parentNode.removeChild(this.transcriptWindow);
    }
    this.transcriptWindow = null;
    this.transcriptHeader = null;
    this.transcriptContent = null;
    this.transcriptEntries = [];
    this.settingsMenu = null;
    this.styleDialog = null;
    this.transcriptResizeHandles = [];
    this.resizeOptionButton = null;
    this.resizeOptionText = null;
    this.liveRegion = null;
  }
  announceLive(message) {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = message || "";
  }
};
export {
  TranscriptManager
};
//# sourceMappingURL=vidply.TranscriptManager-UWM2WNAV.js.map
