/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/DOMUtils.js
var DOMUtils = {
  /**
   * Create an element with options
   * @param {string} tag - HTML tag name
   * @param {Object} options - Element options
   * @returns {HTMLElement}
   */
  createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) {
      element.className = options.className;
    }
    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        element.setAttribute(key, value);
      }
    }
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    if (options.style) {
      Object.assign(element.style, options.style);
    }
    if (options.children) {
      for (const child of options.children) {
        if (child) element.appendChild(child);
      }
    }
    return element;
  },
  /**
   * Show element (remove display:none)
   * @param {HTMLElement} element
   */
  show(element) {
    element?.style && (element.style.display = "");
  },
  /**
   * Hide element
   * @param {HTMLElement} element
   */
  hide(element) {
    element?.style && (element.style.display = "none");
  },
  /**
   * Fade in element using CSS transitions (GPU accelerated)
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms
   * @param {Function} [onComplete] - Callback when complete
   */
  fadeIn(element, duration = 300, onComplete) {
    if (!element) return;
    element.style.opacity = "0";
    element.style.display = "";
    element.style.transition = `opacity ${duration}ms ease`;
    element.offsetHeight;
    element.style.opacity = "1";
    if (onComplete) {
      const cleanup = () => {
        element.removeEventListener("transitionend", cleanup);
        onComplete();
      };
      element.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, duration + 50);
    }
  },
  /**
   * Fade out element using CSS transitions (GPU accelerated)
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms
   * @param {Function} [onComplete] - Callback when complete
   */
  fadeOut(element, duration = 300, onComplete) {
    if (!element) return;
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = "0";
    const cleanup = () => {
      element.removeEventListener("transitionend", cleanup);
      element.style.display = "none";
      if (onComplete) onComplete();
    };
    element.addEventListener("transitionend", cleanup, { once: true });
    setTimeout(cleanup, duration + 50);
  },
  /**
   * Get element's offset position and dimensions
   * @param {HTMLElement} element
   * @returns {Object} { top, left, width, height }
   */
  offset(element) {
    if (!element) return { top: 0, left: 0, width: 0, height: 0 };
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  },
  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHTML(str) {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;"
    };
    return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
  },
  /**
   * Basic HTML sanitization for VTT captions
   * Allows safe formatting tags, removes dangerous content
   * @param {string} html - HTML string to sanitize
   * @returns {string} Sanitized HTML
   */
  sanitizeHTML(html) {
    const safeHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "").replace(/on\w+\s*=/gi, "").replace(/javascript:/gi, "");
    const temp = document.createElement("div");
    temp.innerHTML = safeHtml;
    return temp.innerHTML;
  },
  /**
   * Create a tooltip element (aria-hidden)
   * @param {string} text - Tooltip text
   * @param {string} classPrefix - Class prefix
   * @returns {HTMLElement}
   */
  createTooltip(text, classPrefix = "vidply") {
    return this.createElement("span", {
      className: `${classPrefix}-tooltip`,
      textContent: text,
      attributes: { "aria-hidden": "true" }
    });
  },
  /**
   * Attach a tooltip to an element with hover/focus behavior
   * @param {HTMLElement} element - Target element
   * @param {string} text - Tooltip text
   * @param {string} classPrefix - Class prefix
   */
  attachTooltip(element, text, classPrefix = "vidply") {
    if (!element || !text) return;
    element.querySelector(`.${classPrefix}-tooltip`)?.remove();
    const tooltip = this.createTooltip(text, classPrefix);
    element.appendChild(tooltip);
    const visibleClass = `${classPrefix}-tooltip-visible`;
    const show = () => tooltip.classList.add(visibleClass);
    const hide = () => tooltip.classList.remove(visibleClass);
    element.addEventListener("mouseenter", show);
    element.addEventListener("mouseleave", hide);
    element.addEventListener("focus", show);
    element.addEventListener("blur", hide);
  },
  /**
   * Create button text element (visible when CSS disabled)
   * @param {string} text - Button text
   * @param {string} classPrefix - Class prefix
   * @returns {HTMLElement}
   */
  createButtonText(text, classPrefix = "vidply") {
    return this.createElement("span", {
      className: `${classPrefix}-button-text`,
      textContent: text,
      attributes: { "aria-hidden": "true" }
    });
  },
  /**
   * Add class to element (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   */
  addClass(element, className) {
    element?.classList?.add(className);
  },
  /**
   * Remove class from element (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   */
  removeClass(element, className) {
    element?.classList?.remove(className);
  },
  /**
   * Toggle class on element (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   */
  toggleClass(element, className) {
    element?.classList?.toggle(className);
  },
  /**
   * Check if element has class (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   * @returns {boolean}
   */
  hasClass(element, className) {
    return element?.classList?.contains(className) ?? false;
  }
};

// src/i18n/languages/en.js
var en = {
  player: {
    label: "Video Player",
    play: "Play",
    pause: "Pause",
    stop: "Stop",
    restart: "Restart from beginning",
    rewind: "Rewind",
    forward: "Forward",
    rewindSeconds: "Rewind {seconds} seconds",
    forwardSeconds: "Forward {seconds} seconds",
    previous: "Previous track",
    next: "Next track",
    playlist: "Toggle playlist",
    volume: "Volume",
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit Fullscreen",
    captions: "Captions",
    chapters: "Chapters",
    quality: "Quality",
    captionStyling: "Caption styling",
    transcript: "Toggle transcript",
    audioDescription: "Audio description",
    signLanguage: "Sign language video",
    settings: "Settings",
    speed: "Playback Speed",
    pip: "Picture in Picture",
    currentTime: "Current time",
    duration: "Duration",
    progress: "Progress",
    seekForward: "Seek forward {seconds} seconds",
    seekBackward: "Seek backward {seconds} seconds",
    volumeUp: "Volume up",
    volumeDown: "Volume down",
    loading: "Loading...",
    loadingChapters: "Loading chapters...",
    error: "Error loading media",
    buffering: "Buffering...",
    signLanguageVideo: "Sign Language Video",
    closeSignLanguage: "Close sign language video",
    signLanguageSettings: "Sign language settings",
    startPlaybackFirst: "Please start playback first.",
    startPlaybackForAudioDescription: "Please start playback first to use audio description.",
    startPlaybackForSignLanguage: "Please start playback first to use sign language video.",
    noChapters: "No chapters available",
    noCaptions: "No captions available",
    auto: "Auto",
    autoQuality: "Auto (no quality selection available)",
    noQuality: "Quality selection not available",
    signLanguageDragResize: "Sign Language Video - Press D to drag with keyboard, R to resize",
    signLanguageDragActive: "Sign Language Video - Drag mode active. Use arrow keys to move, Escape to exit.",
    signLanguageResizeActive: "Sign Language Video - Resize mode active. Use left/right arrow keys to resize, Escape to exit.",
    enableSignDragMode: "Enable drag mode. Shortcut: D key",
    disableSignDragMode: "Disable drag mode. Shortcut: D key",
    enableSignDragModeAria: "Enable toggle keyboard drag mode with arrow keys. Shortcut: D key",
    disableSignDragModeAria: "Disable toggle keyboard drag mode with arrow keys. Shortcut: D key",
    enableSignResizeMode: "Enable resize mode. Shortcut: R key",
    disableSignResizeMode: "Disable resize mode. Shortcut: R key",
    enableSignResizeModeAria: "Enable keyboard resize mode with arrow keys. Shortcut: R key",
    disableSignResizeModeAria: "Disable keyboard resize mode with arrow keys. Shortcut: R key",
    resizeHandle: "Resize {direction} corner",
    moreOptions: "More options",
    noMoreOptions: "No additional options available"
  },
  captions: {
    off: "Off",
    select: "Select captions",
    fontSize: "Font Size",
    fontFamily: "Font Family",
    color: "Text Color",
    backgroundColor: "Background Color",
    opacity: "Opacity"
  },
  fontSizes: {
    small: "Small",
    normal: "Normal",
    large: "Large",
    xlarge: "X-Large"
  },
  fontFamilies: {
    sansSerif: "Sans-serif",
    serif: "Serif",
    monospace: "Monospace"
  },
  styleLabels: {
    textColor: "Text Color",
    background: "Background",
    font: "Font",
    fontSize: "Font Size",
    opacity: "Opacity"
  },
  audioDescription: {
    enable: "Enable audio description",
    disable: "Disable audio description"
  },
  signLanguage: {
    show: "Show sign language video",
    hide: "Hide sign language video",
    showInMainView: "Show sign language in main video",
    hideInMainView: "Hide sign language from main video"
  },
  transcript: {
    title: "Transcript",
    ariaLabel: "Video Transcript",
    close: "Close transcript",
    loading: "Loading transcript...",
    noTranscript: "No transcript available for this video.",
    settings: "Transcript settings. Press Enter to open menu, or D to enable drag mode",
    keyboardDragMode: "Toggle keyboard drag mode with arrow keys. Shortcut: D key",
    keyboardDragActive: "⌨️ Keyboard Drag Mode Active (Arrow keys to move, Shift+Arrows for large steps, D or ESC to exit)",
    dragResizePrompt: "Press D to drag or R to resize. Use Home to reset position, Esc to close.",
    dragModeEnabled: "Keyboard drag mode enabled. Use arrow keys to move, Shift+Arrow for larger steps. Press D or Esc to exit.",
    dragModeDisabled: "Keyboard drag mode disabled.",
    enableDragMode: "Enable drag mode. Shortcut: D key",
    disableDragMode: "Disable drag mode. Shortcut: D key",
    enableDragModeAria: "Enable toggle keyboard drag mode with arrow keys. Shortcut: D key",
    disableDragModeAria: "Disable toggle keyboard drag mode with arrow keys. Shortcut: D key",
    resizeWindow: "Resize Window",
    disableResizeWindow: "Disable Resize Mode",
    enableResizeMode: "Enable resize mode. Shortcut: R key",
    disableResizeMode: "Disable resize mode. Shortcut: R key",
    enableResizeModeAria: "Enable keyboard resize mode with arrow keys. Shortcut: R key",
    disableResizeModeAria: "Disable keyboard resize mode with arrow keys. Shortcut: R key",
    resizeModeHint: "Resize handles enabled. Drag edges or corners to adjust. Press Esc or R to exit.",
    resizeModeEnabled: "Resize mode enabled. Drag edges or corners to adjust. Press Esc or R to exit.",
    resizeModeDisabled: "Resize mode disabled.",
    positionReset: "Transcript position reset.",
    styleTranscript: "Open transcript style settings",
    closeMenu: "Close Menu",
    styleTitle: "Transcript Style",
    autoscroll: "Autoscroll",
    settingsMenu: "Transcript dialog settings",
    showTimestamps: "Show timestamps",
    hideTimestamps: "Hide timestamps",
    showTimestampsAria: "Show timestamps in transcript",
    hideTimestampsAria: "Hide timestamps in transcript"
  },
  settings: {
    title: "Settings",
    quality: "Quality",
    speed: "Speed",
    captions: "Captions",
    language: "Language",
    reset: "Reset to defaults",
    close: "Close"
  },
  speeds: {
    normal: "Normal"
  },
  time: {
    display: "Time display",
    durationPrefix: "Duration: ",
    of: "of",
    hour: "{count} hour",
    hours: "{count} hours",
    minute: "{count} minute",
    minutes: "{count} minutes",
    second: "{count} second",
    seconds: "{count} seconds"
  },
  playlist: {
    title: "Playlist",
    trackOf: "Track {current} of {total}",
    nowPlaying: "Now playing: Track {current} of {total}. {title}{artist}",
    by: " by ",
    untitled: "Untitled",
    trackUntitled: "Track {number}",
    currentlyPlaying: "Currently playing",
    notPlaying: "Not playing",
    pressEnterPlay: "Press Enter to play",
    pressEnterRestart: "Press Enter to restart",
    keyboardInstructions: "Playlist navigation: Use Up and Down arrow keys to move between tracks. Press Page Up or Page Down to skip 5 tracks. Press Home to go to first track, End to go to last track. Press Enter or Space to play the selected track.",
    endOfPlaylist: "End of playlist. {current} of {total}.",
    beginningOfPlaylist: "Beginning of playlist. 1 of {total}.",
    jumpedToLastTrack: "Jumped to last track. {current} of {total}.",
    jumpedToFirstTrack: "Jumped to first track. 1 of {total}.",
    firstTrack: "First track. 1 of {total}.",
    lastTrack: "Last track. {current} of {total}."
  }
};

// src/i18n/translations.js
var builtInLanguageLoaders = {
  de: () => import("./vidply.de-IXUNTP3C.js"),
  es: () => import("./vidply.es-PSWHNCXC.js"),
  fr: () => import("./vidply.fr-3ZGYEON2.js"),
  ja: () => import("./vidply.ja-HS2NMBQZ.js")
};
function getBaseTranslations() {
  return { en };
}
function getBuiltInLanguageLoaders() {
  return builtInLanguageLoaders;
}
async function loadBuiltInTranslation(lang) {
  const loader = builtInLanguageLoaders[lang];
  if (!loader) return null;
  const module = await loader();
  return module[lang] || module.default || null;
}
var translations = getBaseTranslations();

// src/i18n/i18n.js
var I18n = class {
  constructor() {
    this.currentLanguage = "en";
    this.translations = getBaseTranslations();
    this.loadingPromises = /* @__PURE__ */ new Map();
    this.builtInLanguageLoaders = getBuiltInLanguageLoaders();
  }
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Language "${lang}" not found, falling back to English`);
      this.currentLanguage = "en";
    }
  }
  getLanguage() {
    return this.currentLanguage;
  }
  /**
   * Ensure a language is available, loading built-ins on demand.
   * @param {string} lang Language code
   * @returns {Promise<string|null>} Normalized language code if available
   */
  async ensureLanguage(lang) {
    const normalizedLang = (lang || "").toLowerCase();
    if (!normalizedLang) return this.currentLanguage;
    if (this.translations[normalizedLang]) {
      return normalizedLang;
    }
    if (this.loadingPromises.has(normalizedLang)) {
      await this.loadingPromises.get(normalizedLang);
      return this.translations[normalizedLang] ? normalizedLang : null;
    }
    if (!this.builtInLanguageLoaders[normalizedLang]) {
      return null;
    }
    const loadPromise = (async () => {
      try {
        const loaded = await loadBuiltInTranslation(normalizedLang);
        if (loaded) {
          this.translations[normalizedLang] = loaded;
        }
      } catch (error) {
        console.warn(`Language "${normalizedLang}" failed to load:`, error);
      } finally {
        this.loadingPromises.delete(normalizedLang);
      }
    })();
    this.loadingPromises.set(normalizedLang, loadPromise);
    await loadPromise;
    return this.translations[normalizedLang] ? normalizedLang : null;
  }
  t(key, replacements = {}) {
    const keys = key.split(".");
    let value = this.translations[this.currentLanguage];
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        value = this.translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === "object" && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key;
          }
        }
        break;
      }
    }
    if (typeof value === "string") {
      Object.entries(replacements).forEach(([placeholder, replacement]) => {
        value = value.replace(new RegExp(`{${placeholder}}`, "g"), replacement);
      });
    }
    return value;
  }
  addTranslation(lang, translations2) {
    if (!this.translations[lang]) {
      this.translations[lang] = {};
    }
    Object.assign(this.translations[lang], translations2);
  }
  /**
   * Load a language file from a URL (JSON or YAML)
   * @param {string} langCode - Language code (e.g., 'pt', 'it')
   * @param {string} url - URL to the language file (JSON or YAML)
   * @returns {Promise<void>}
   */
  async loadLanguageFromUrl(langCode, url) {
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }
    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load language file: ${response.statusText}`);
        }
        const contentType = response.headers.get("content-type") || "";
        let translations2;
        const buffer = await response.arrayBuffer();
        const utf8Text = new TextDecoder("utf-8").decode(buffer);
        if (contentType.includes("application/json") || url.endsWith(".json")) {
          translations2 = JSON.parse(utf8Text);
        } else if (contentType.includes("text/yaml") || contentType.includes("application/x-yaml") || url.endsWith(".yaml") || url.endsWith(".yml")) {
          try {
            translations2 = JSON.parse(utf8Text);
          } catch (e) {
            if (typeof window !== "undefined" && window.jsyaml) {
              translations2 = window.jsyaml.load(utf8Text);
            } else {
              console.warn("YAML parsing requires js-yaml library. Please include it or use JSON format.");
              throw new Error("YAML parsing not available. Please use JSON format or include js-yaml library.");
            }
          }
        } else {
          translations2 = JSON.parse(utf8Text);
        }
        this.addTranslation(langCode, translations2);
        return translations2;
      } catch (error) {
        console.error(`Error loading language file from ${url}:`, error);
        throw error;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();
    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }
  /**
   * Load multiple language files from URLs
   * @param {Object} languageMap - Object mapping language codes to URLs
   * @returns {Promise<void>}
   */
  async loadLanguagesFromUrls(languageMap) {
    const promises = Object.entries(languageMap).map(
      ([langCode, url]) => this.loadLanguageFromUrl(langCode, url)
    );
    await Promise.all(promises);
  }
};
var i18n = new I18n();

// src/utils/TimeUtils.js
var TimeUtils = {
  /**
   * Format seconds to time string (HH:MM:SS or MM:SS)
   */
  formatTime(seconds, alwaysShowHours = false) {
    if (!isFinite(seconds) || seconds < 0) {
      return alwaysShowHours ? "00:00:00" : "00:00";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (num) => String(num).padStart(2, "0");
    if (hours > 0 || alwaysShowHours) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  },
  /**
   * Parse time string to seconds
   */
  parseTime(timeString) {
    const parts = timeString.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  },
  /**
   * Format seconds to readable duration
   */
  formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      return i18n.t("time.seconds", { count: 0 });
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0) {
      const key = hours === 1 ? "time.hour" : "time.hours";
      parts.push(i18n.t(key, { count: hours }));
    }
    if (minutes > 0) {
      const key = minutes === 1 ? "time.minute" : "time.minutes";
      parts.push(i18n.t(key, { count: minutes }));
    }
    if (secs > 0 || parts.length === 0) {
      const key = secs === 1 ? "time.second" : "time.seconds";
      parts.push(i18n.t(key, { count: secs }));
    }
    return parts.join(", ");
  },
  /**
   * Format percentage
   */
  formatPercentage(value, total) {
    if (total === 0) return 0;
    return Math.round(value / total * 100);
  }
};

// src/icons/Icons.js
var iconPaths = {
  play: `<path d="M8 5v14l11-7z"/>`,
  pause: `<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>`,
  stop: `<rect x="6" y="6" width="12" height="12"/>`,
  rewind: `<path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>`,
  forward: `<path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>`,
  skipPrevious: `<path d="M6 6h2v12H6V6zm3 6l8.5 6V6L9 12z"/>`,
  skipNext: `<path d="M16 6h2v12h-2V6zM6 6l8.5 6L6 18V6z"/>`,
  restart: `<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>`,
  volumeHigh: `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`,
  volumeMedium: `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>`,
  volumeLow: `<path d="M7 9v6h4l5 5V4l-5 5H7z"/>`,
  volumeMuted: `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`,
  fullscreen: `<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>`,
  fullscreenExit: `<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>`,
  settings: `<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>`,
  captions: `<path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>`,
  captionsOff: `<path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/><path d="M0 0h24v24H0z" fill="none"/>`,
  pip: `<path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>`,
  speed: `<path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44z"/><path d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/>`,
  close: `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`,
  check: `<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
  loading: `<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>`,
  error: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>`,
  playlist: `<path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>`,
  hd: `<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1c0 .55-.45 1-1 1h-.75v1.5h-1.5V15H14c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v4zm-3.5-.5h2v-3h-2v3z"/>`,
  transcript: `<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>`,
  chapters: `<path d="M3 5h2v2H3V5zm0 4h2v2H3V9zm0 4h2v2H3v-2zm0 4h2v2H3v-2zM7 5h14v2H7V5zm0 4h14v2H7V9zm0 4h14v2H7v-2zm0 4h14v2H7v-2z"/>`,
  audioDescription: `<rect x="2" y="5" width="20" height="14" rx="2" fill="#ffffff" stroke="#ffffff" stroke-width="2"/><text x="12" y="16" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="#1a1a1a">AD</text>`,
  audioDescriptionOn: `<rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">AD</text>`,
  signLanguage: `<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>`,
  signLanguageOn: `<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>`,
  signLanguagePip: `<g transform="scale(1.2) translate(1, 1)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g><polygon points="14,23 23,14 23,23" fill="currentColor"/>`,
  signLanguagePipOn: `<g transform="scale(1.2) translate(1, 1)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g><polygon points="14,23 23,14 23,23" fill="currentColor"/>`,
  music: `<path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7zm-1.5 16c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>`,
  moreVertical: `<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>`,
  move: `<path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>`,
  resize: `<path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v2.5L7 11l3-3.5V10h4V7.5l3 3.5-3 3.5z"/>`,
  clock: `<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>`
};
var svgWrapper = (paths) => `<svg viewBox="0 0 24 24" fill="currentColor">${paths}</svg>`;
var Icons = Object.fromEntries(
  Object.entries(iconPaths).map(([key, value]) => [key, svgWrapper(value)])
);
function getIcon(name) {
  return Icons[name] || Icons.play;
}
function createIconElement(name, className = "") {
  const wrapper = document.createElement("span");
  wrapper.className = `vidply-icon ${className}`.trim();
  wrapper.innerHTML = getIcon(name);
  wrapper.setAttribute("aria-hidden", "true");
  return wrapper;
}
function createPlayOverlay() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "vidply-play-overlay");
  svg.setAttribute("viewBox", "0 0 80 80");
  svg.setAttribute("width", "80");
  svg.setAttribute("height", "80");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("role", "presentation");
  svg.style.cursor = "pointer";
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filterId = `vidply-play-shadow-${Math.random().toString(36).substr(2, 9)}`;
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", filterId);
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "200%");
  const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
  feGaussianBlur.setAttribute("in", "SourceAlpha");
  feGaussianBlur.setAttribute("stdDeviation", "3");
  const feOffset = document.createElementNS("http://www.w3.org/2000/svg", "feOffset");
  feOffset.setAttribute("dx", "0");
  feOffset.setAttribute("dy", "2");
  feOffset.setAttribute("result", "offsetblur");
  const feComponentTransfer = document.createElementNS("http://www.w3.org/2000/svg", "feComponentTransfer");
  const feFuncA = document.createElementNS("http://www.w3.org/2000/svg", "feFuncA");
  feFuncA.setAttribute("type", "linear");
  feFuncA.setAttribute("slope", "0.3");
  feComponentTransfer.appendChild(feFuncA);
  const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
  const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  feMergeNode2.setAttribute("in", "SourceGraphic");
  feMerge.appendChild(feMergeNode1);
  feMerge.appendChild(feMergeNode2);
  filter.appendChild(feGaussianBlur);
  filter.appendChild(feOffset);
  filter.appendChild(feComponentTransfer);
  filter.appendChild(feMerge);
  defs.appendChild(filter);
  svg.appendChild(defs);
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "40");
  circle.setAttribute("cy", "40");
  circle.setAttribute("r", "40");
  circle.setAttribute("fill", "rgba(255, 255, 255, 0.95)");
  circle.setAttribute("filter", `url(#${filterId})`);
  circle.setAttribute("class", "vidply-play-overlay-bg");
  svg.appendChild(circle);
  const playTriangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  playTriangle.setAttribute("points", "32,28 32,52 54,40");
  playTriangle.setAttribute("fill", "#0a406e");
  playTriangle.setAttribute("class", "vidply-play-overlay-icon");
  svg.appendChild(playTriangle);
  return svg;
}

// src/utils/FocusUtils.js
function focusElement(element, { delay = 0, preventScroll = true } = {}) {
  if (!element) return;
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (element && document.contains(element)) {
        element.focus({ preventScroll });
      }
    }, delay);
  });
}
function focusFirstElement(container, selector, options = {}) {
  if (!container) return;
  const element = container.querySelector(selector);
  if (element) {
    focusElement(element, options);
  }
}

// src/utils/StorageManager.js
var StorageManager = class {
  constructor(namespace = "vidply") {
    this.namespace = namespace;
    this.storage = this.isStorageAvailable() ? localStorage : null;
  }
  /**
   * Check if localStorage is available
   */
  isStorageAvailable() {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  /**
   * Get a namespaced key
   */
  getKey(key) {
    return `${this.namespace}_${key}`;
  }
  /**
   * Save a value to storage
   */
  set(key, value) {
    if (!this.storage) return false;
    try {
      const namespacedKey = this.getKey(key);
      this.storage.setItem(namespacedKey, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
      return false;
    }
  }
  /**
   * Get a value from storage
   */
  get(key, defaultValue = null) {
    if (!this.storage) return defaultValue;
    try {
      const namespacedKey = this.getKey(key);
      const value = this.storage.getItem(namespacedKey);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.warn("Failed to read from localStorage:", e);
      return defaultValue;
    }
  }
  /**
   * Remove a value from storage
   */
  remove(key) {
    if (!this.storage) return false;
    try {
      const namespacedKey = this.getKey(key);
      this.storage.removeItem(namespacedKey);
      return true;
    } catch (e) {
      console.warn("Failed to remove from localStorage:", e);
      return false;
    }
  }
  /**
   * Clear all namespaced values
   */
  clear() {
    if (!this.storage) return false;
    try {
      const keys = Object.keys(this.storage);
      keys.forEach((key) => {
        if (key.startsWith(this.namespace)) {
          this.storage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
      return false;
    }
  }
  /**
   * Save transcript preferences
   */
  saveTranscriptPreferences(preferences) {
    return this.set("transcript_preferences", preferences);
  }
  /**
   * Get transcript preferences
   */
  getTranscriptPreferences() {
    return this.get("transcript_preferences", null);
  }
  /**
   * Save caption preferences
   */
  saveCaptionPreferences(preferences) {
    return this.set("caption_preferences", preferences);
  }
  /**
   * Get caption preferences
   */
  getCaptionPreferences() {
    return this.get("caption_preferences", null);
  }
  /**
   * Save player preferences (volume, speed, etc.)
   */
  savePlayerPreferences(preferences) {
    return this.set("player_preferences", preferences);
  }
  /**
   * Get player preferences
   */
  getPlayerPreferences() {
    return this.get("player_preferences", null);
  }
  /**
   * Save sign language preferences (position and size)
   */
  saveSignLanguagePreferences(preferences) {
    return this.set("sign_language_preferences", preferences);
  }
  /**
   * Get sign language preferences
   */
  getSignLanguagePreferences() {
    return this.get("sign_language_preferences", null);
  }
};

// src/utils/DraggableResizable.js
var DraggableResizable = class {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      dragHandle: null,
      // Element to use as drag handle (defaults to element itself)
      resizeHandles: [],
      // Array of resize handle elements
      onDragStart: null,
      onDrag: null,
      onDragEnd: null,
      onResizeStart: null,
      onResize: null,
      onResizeEnd: null,
      constrainToViewport: true,
      // Allow movement outside viewport?
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
      // StorageManager instance for saving position/size
      storageKey: null,
      // Key for localStorage (if storage is provided)
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
      document.addEventListener("pointermove", this.handlers.pointermove, { passive: false });
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
    if (e.target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
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
    if (e.target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }
    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }
    this.startDragging(e.clientX, e.clientY);
    e.preventDefault();
  }
  onTouchStart(e) {
    if (e.target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
      return;
    }
    if (this.options.onDragStart && !this.options.onDragStart(e)) {
      return;
    }
    const touch = e.touches[0];
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
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
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
    if (this.resizeDirection.includes("e")) {
      newWidth = Math.max(this.options.minWidth, this.resizeStartWidth + deltaX);
    }
    if (this.resizeDirection.includes("w")) {
      const proposedWidth = Math.max(this.options.minWidth, this.resizeStartWidth - deltaX);
      newLeft = this.resizeStartLeft + (this.resizeStartWidth - proposedWidth);
      newWidth = proposedWidth;
    }
    const maxWidthOption = typeof this.options.maxWidth === "function" ? this.options.maxWidth() : this.options.maxWidth;
    if (Number.isFinite(maxWidthOption)) {
      const clampedWidth = Math.min(newWidth, maxWidthOption);
      if (clampedWidth !== newWidth && this.resizeDirection.includes("w")) {
        newLeft += newWidth - clampedWidth;
      }
      newWidth = clampedWidth;
    }
    if (!this.options.maintainAspectRatio) {
      if (this.resizeDirection.includes("s")) {
        newHeight = Math.max(this.options.minHeight, this.resizeStartHeight + deltaY);
      }
      if (this.resizeDirection.includes("n")) {
        const proposedHeight = Math.max(this.options.minHeight, this.resizeStartHeight - deltaY);
        newTop = this.resizeStartTop + (this.resizeStartHeight - proposedHeight);
        newHeight = proposedHeight;
      }
      const maxHeightOption = typeof this.options.maxHeight === "function" ? this.options.maxHeight() : this.options.maxHeight;
      if (Number.isFinite(maxHeightOption)) {
        const clampedHeight = Math.min(newHeight, maxHeightOption);
        if (clampedHeight !== newHeight && this.resizeDirection.includes("n")) {
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
    if (this.resizeDirection.includes("w")) {
      this.element.style.left = `${newLeft}px`;
    }
    if (this.resizeDirection.includes("n") && !this.options.maintainAspectRatio) {
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
      } catch (e) {
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

// src/utils/MenuUtils.js
function createMenuItem({ classPrefix, itemClass, icon, label, ariaLabel, onClick, hasTextClass = false }) {
  const isI18nKeyForAria = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
  const ariaLabelText = ariaLabel || (isI18nKeyForAria ? i18n.t(label) || label : label);
  const button = DOMUtils.createElement("button", {
    className: itemClass,
    attributes: {
      "type": "button",
      "aria-label": ariaLabelText,
      "tabindex": "-1"
    }
  });
  if (icon) {
    button.appendChild(createIconElement(icon));
  }
  const isI18nKey = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
  const textContent = isI18nKey ? i18n.t(label) || label : label;
  const text = DOMUtils.createElement("span", {
    textContent,
    className: hasTextClass ? `${classPrefix}-settings-text` : void 0,
    attributes: {
      "aria-hidden": "true"
    }
  });
  button.appendChild(text);
  if (onClick) {
    button.addEventListener("click", onClick);
  }
  return button;
}
function attachMenuKeyboardNavigation(menu, button, itemSelector, onClose) {
  if (!menu) return;
  const menuItems = Array.from(menu.querySelectorAll(itemSelector));
  if (menuItems.length === 0) return;
  const handleKeyDown = (e) => {
    const currentIndex = menuItems.indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === nextIndex ? "0" : "-1");
        });
        menuItems[nextIndex].focus({ preventScroll: false });
        menuItems[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === prevIndex ? "0" : "-1");
        });
        menuItems[prevIndex].focus({ preventScroll: false });
        menuItems[prevIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      case "Home":
        e.preventDefault();
        e.stopPropagation();
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === 0 ? "0" : "-1");
        });
        menuItems[0].focus({ preventScroll: false });
        menuItems[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      case "End":
        e.preventDefault();
        e.stopPropagation();
        const lastIndex = menuItems.length - 1;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === lastIndex ? "0" : "-1");
        });
        menuItems[lastIndex].focus({ preventScroll: false });
        menuItems[lastIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement && menuItems.includes(document.activeElement)) {
          document.activeElement.click();
          if (onClose) {
            setTimeout(() => {
              if (button && document.contains(button)) {
                button.focus();
              }
            }, 0);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        if (onClose) {
          onClose();
        }
        break;
    }
  };
  menu.addEventListener("keydown", handleKeyDown, true);
  return handleKeyDown;
}
function focusFirstMenuItem(menu, itemSelector, delay = 0) {
  if (!menu) return;
  setTimeout(() => {
    const menuItems = Array.from(menu.querySelectorAll(itemSelector));
    if (menuItems.length > 0) {
      menuItems.forEach((item, index) => {
        item.setAttribute("tabindex", index === 0 ? "0" : "-1");
      });
      focusElement(menuItems[0], { delay: 0 });
      menuItems[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, delay);
}

// src/utils/FormUtils.js
function createLabeledSelect({
  classPrefix,
  labelClass,
  selectClass,
  labelText,
  selectId,
  hidden = false,
  onChange = null,
  options = []
}) {
  const isI18nKey = typeof labelText === "string" && (labelText.startsWith("transcript.") || labelText.startsWith("player.") || labelText.startsWith("settings.") || labelText.startsWith("captions."));
  const labelTextContent = isI18nKey ? i18n.t(labelText) || labelText : labelText;
  const label = DOMUtils.createElement("label", {
    className: labelClass,
    textContent: labelTextContent,
    attributes: {
      "for": selectId,
      "style": hidden ? "display: none;" : void 0
    }
  });
  const select = DOMUtils.createElement("select", {
    className: selectClass,
    attributes: {
      "id": selectId,
      "style": hidden ? "display: none;" : void 0
    }
  });
  options.forEach((opt) => {
    const option = DOMUtils.createElement("option", {
      textContent: opt.text,
      attributes: {
        "value": opt.value,
        "selected": opt.selected ? "selected" : void 0
      }
    });
    select.appendChild(option);
  });
  if (onChange) {
    select.addEventListener("change", onChange);
  }
  return { label, select };
}
function preventDragOnElement(element) {
  if (!element) return;
  ["mousedown", "click"].forEach((eventType) => {
    element.addEventListener(eventType, (e) => {
      e.stopPropagation();
    });
  });
}

export {
  DOMUtils,
  i18n,
  TimeUtils,
  createIconElement,
  createPlayOverlay,
  focusElement,
  focusFirstElement,
  StorageManager,
  DraggableResizable,
  createMenuItem,
  attachMenuKeyboardNavigation,
  focusFirstMenuItem,
  createLabeledSelect,
  preventDragOnElement
};
//# sourceMappingURL=vidply.chunk-LD3OELXW.js.map
