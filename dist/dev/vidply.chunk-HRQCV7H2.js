/*!
 * VidPly v1.2.2 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/DOMUtils.ts
function createElementImpl(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) {
    element.className = options.className;
  }
  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      if (value !== void 0) {
        element.setAttribute(key, value);
      }
    }
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
}
var DOMUtils = {
  createElement: createElementImpl,
  show(element) {
    if (element?.style) {
      element.style.display = "";
    }
  },
  hide(element) {
    if (element?.style) {
      element.style.display = "none";
    }
  },
  fadeIn(element, duration = 300, onComplete) {
    if (!element) return;
    element.style.opacity = "0";
    element.style.display = "";
    element.style.transition = `opacity ${duration}ms ease`;
    void element.offsetHeight;
    element.style.opacity = "1";
    if (onComplete) {
      let called = false;
      const cleanup = () => {
        if (called) return;
        called = true;
        element.removeEventListener("transitionend", cleanup);
        onComplete();
      };
      element.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, duration + 50);
    }
  },
  fadeOut(element, duration = 300, onComplete) {
    if (!element) return;
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = "0";
    let called = false;
    const cleanup = () => {
      if (called) return;
      called = true;
      element.removeEventListener("transitionend", cleanup);
      element.style.display = "none";
      if (onComplete) onComplete();
    };
    element.addEventListener("transitionend", cleanup, { once: true });
    setTimeout(cleanup, duration + 50);
  },
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
  escapeHTML(str) {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;"
    };
    return str.replace(/[&<>"']/g, (char) => escapeMap[char] ?? char);
  },
  /**
   * Render a WebVTT cue's text safely.
   *
   * The previous implementation ran a regex-based blacklist over the cue
   * string and assigned the result to `innerHTML`, which is a known-unsafe
   * pattern (mutation-XSS bypasses, attribute-name tricks, etc.). Caption
   * text on most sites is fetched verbatim from external `.vtt` files that
   * the embedding page has no control over (third-party HLS/DASH manifests,
   * user-supplied playlists, ...) so this code path is reachable by
   * untrusted authors.
   *
   * The new implementation tokenizes only the WebVTT inline tags allowed by
   * the spec (`<b>`, `<i>`, `<u>`, `<c[.class]>`, `<v authorName>`) and
   * builds the resulting DOM via `document.createElement` /
   * `document.createTextNode`. Anything else (script, iframe, attributes,
   * URL schemes, character refs, ...) is rendered as literal text.
   *
   * Cue input is hard-capped at 10,000 characters before parsing to
   * eliminate ReDoS and runaway-DOM concerns.
   */
  renderVTTToDOM(text) {
    const MAX_CUE_LENGTH = 1e4;
    const safeInput = text.length > MAX_CUE_LENGTH ? text.slice(0, MAX_CUE_LENGTH) : text;
    const fragment = document.createDocumentFragment();
    const stack = [];
    const append = (node) => {
      const target = stack[stack.length - 1] ?? fragment;
      target.appendChild(node);
    };
    const tagPattern = /<(\/)?([a-z])(?:\.([\w.-]{1,200}))?(?:\s+([^<>]{0,500}))?>/i;
    let cursor = 0;
    while (cursor < safeInput.length) {
      const remaining = safeInput.slice(cursor);
      const match = tagPattern.exec(remaining);
      if (!match || match.index === void 0) {
        append(document.createTextNode(remaining));
        break;
      }
      if (match.index > 0) {
        append(document.createTextNode(remaining.slice(0, match.index)));
      }
      const [, closing, tagLetter, classList, voiceName] = match;
      const tag = (tagLetter || "").toLowerCase();
      if (closing) {
        const top = stack[stack.length - 1];
        if (top && top.dataset.vttTag === tag) {
          stack.pop();
        }
      } else if (tag === "b" || tag === "i" || tag === "u") {
        const elementTag = tag === "b" ? "strong" : tag === "i" ? "em" : "u";
        const node = document.createElement(elementTag);
        node.dataset.vttTag = tag;
        append(node);
        stack.push(node);
      } else if (tag === "c") {
        const span = document.createElement("span");
        span.dataset.vttTag = tag;
        span.classList.add("caption-class");
        if (classList) {
          for (const cls of classList.split(".").filter(Boolean)) {
            if (/^[\w-]+$/.test(cls)) {
              span.classList.add(`caption-class-${cls}`);
            }
          }
        }
        append(span);
        stack.push(span);
      } else if (tag === "v") {
        const span = document.createElement("span");
        span.dataset.vttTag = tag;
        span.classList.add("caption-voice");
        if (voiceName) {
          span.dataset.voice = voiceName.trim().slice(0, 200);
        }
        append(span);
        stack.push(span);
      } else {
        append(document.createTextNode(match[0]));
      }
      cursor += match.index + match[0].length;
    }
    return fragment;
  },
  createTooltip(text, classPrefix = "vidply") {
    return this.createElement("span", {
      className: `${classPrefix}-tooltip`,
      textContent: text,
      attributes: { "aria-hidden": "true" }
    });
  },
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
  createButtonText(text, classPrefix = "vidply") {
    return this.createElement("span", {
      className: `${classPrefix}-button-text`,
      textContent: text,
      attributes: { "aria-hidden": "true" }
    });
  },
  addClass(element, className) {
    element?.classList?.add(className);
  },
  removeClass(element, className) {
    element?.classList?.remove(className);
  },
  toggleClass(element, className) {
    element?.classList?.toggle(className);
  },
  hasClass(element, className) {
    return element?.classList?.contains(className) ?? false;
  }
};

// src/utils/Sanitize.ts
var PROTO_FORBIDDEN_KEYS = Object.freeze(
  /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"])
);
function isForbiddenKey(key) {
  return PROTO_FORBIDDEN_KEYS.has(String(key));
}
function shallowSanitize(input) {
  const out = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(input)) {
    if (isForbiddenKey(key)) continue;
    out[key] = value;
  }
  return out;
}
function deepSanitize(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    if (input && typeof input === "object") {
      return input;
    }
    return /* @__PURE__ */ Object.create(null);
  }
  const out = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(input)) {
    if (isForbiddenKey(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepSanitize(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// src/i18n/languages/en.ts
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
    floatingPlayer: "Floating player",
    floatingPlayerClose: "Close floating player",
    floatingPlayerEnter: "Pop out video",
    floatingPlayerExit: "Dock video",
    floatingPlayerDialog: "Floating video player. Press D to drag, R to resize, Escape to close.",
    download: "Download",
    downloadWithFormat: "Download {format}",
    downloadWithSize: "Download ({size})",
    downloadWithFormatSize: "Download {format} ({size})",
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
    signDragModeHint: "Drag mode: arrow keys to move, Esc to exit",
    signResizeModeHint: "Resize mode: arrow keys to resize, Esc to exit",
    signDragModeDisabled: "Sign language drag mode disabled.",
    signResizeModeDisabled: "Sign language resize mode disabled.",
    resizeHandle: "Resize {direction} corner",
    moreOptions: "More options",
    noMoreOptions: "No additional options available",
    // Screen-reader announcements (used by KeyboardManager.announceAction)
    playing: "Playing",
    paused: "Paused",
    muted: "Muted",
    unmuted: "Unmuted",
    captionsOn: "Captions on",
    captionsOff: "Captions off",
    volumePercent: "Volume {percent} percent",
    volumePercentMuted: "Muted",
    speedRate: "Speed {rate}x"
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
    dragModeBadge: "Drag mode: arrow keys to move, Esc to exit",
    resizeModeBadge: "Resize mode: drag edges or corners, Esc to exit",
    positionReset: "Transcript position reset.",
    styleTranscript: "Open transcript style settings",
    closeMenu: "Close Menu",
    styleTitle: "Transcript Style",
    autoscroll: "Autoscroll",
    settingsMenu: "Transcript dialog settings",
    showTimestamps: "Show timestamps",
    hideTimestamps: "Hide timestamps",
    showTimestampsAria: "Show timestamps in transcript",
    hideTimestampsAria: "Hide timestamps in transcript",
    seekTo: "Seek to {time}"
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
  help: {
    title: "Keyboard shortcuts",
    button: "Keyboard shortcuts",
    close: "Close",
    or: "or",
    keys: {
      space: "Space"
    },
    actions: {
      "play-pause": "Play / Pause",
      "seek-backward": "Seek backward",
      "seek-forward": "Seek forward",
      "volume-up": "Volume up",
      "volume-down": "Volume down",
      "mute": "Mute / Unmute",
      "captions": "Toggle captions",
      "caption-style-menu": "Caption styling",
      "speed-down": "Decrease speed",
      "speed-up": "Increase speed",
      "speed-menu": "Playback speed",
      "quality-menu": "Quality",
      "chapters-menu": "Chapters",
      "transcript-toggle": "Toggle transcript",
      "fullscreen": "Toggle fullscreen",
      "help": "Keyboard shortcuts"
    }
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
  resume: {
    prompt: "Resume from {time}?",
    resume: "Resume",
    startOver: "Start Over"
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

// src/i18n/translations.ts
var builtInLanguageLoaders = {
  de: () => import("./vidply.de-6PEICIJ5.js"),
  es: () => import("./vidply.es-JZOJQSMC.js"),
  fr: () => import("./vidply.fr-X5B3ZCH4.js"),
  ja: () => import("./vidply.ja-FVTGX2ZT.js")
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

// src/i18n/i18n.ts
function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function deepSanitizeTranslations(input) {
  return deepSanitize(input);
}
var I18n = class {
  currentLanguage;
  translations;
  loadingPromises;
  builtInLanguageLoaders;
  constructor() {
    this.currentLanguage = "en";
    this.translations = /* @__PURE__ */ Object.create(null);
    Object.assign(this.translations, getBaseTranslations());
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
          this.translations[normalizedLang] = deepSanitizeTranslations(loaded);
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
      let result = value;
      for (const [placeholder, replacement] of Object.entries(replacements)) {
        if (isForbiddenKey(placeholder)) continue;
        const safe = escapeRegExp(placeholder);
        result = result.replace(new RegExp(`\\{${safe}\\}`, "g"), String(replacement));
      }
      return result;
    }
    return typeof value === "string" ? value : key;
  }
  addTranslation(lang, newTranslations) {
    if (isForbiddenKey(lang)) {
      console.warn(`[VidPly] Refusing to register language with forbidden name "${lang}"`);
      return;
    }
    if (!this.translations[lang]) {
      this.translations[lang] = /* @__PURE__ */ Object.create(null);
    }
    const sanitized = deepSanitizeTranslations(newTranslations);
    Object.assign(this.translations[lang], sanitized);
  }
  /**
   * Load a translation file from a URL. Bounded by an `AbortSignal.timeout`
   * (default 8s) plus an optional caller-supplied signal — typically the
   * Player's lifecycle controller — so a torn-down player does not keep
   * the request alive.
   */
  async loadLanguageFromUrl(langCode, url, options = {}) {
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }
    const loadPromise = (async () => {
      const signals = [];
      if (options.signal) signals.push(options.signal);
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        signals.push(AbortSignal.timeout(options.timeoutMs ?? 8e3));
      }
      const signal = signals.length === 0 ? void 0 : signals.length === 1 ? signals[0] : AbortSignal.any?.(signals) ?? signals[0];
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) {
          throw new Error(`Failed to load language file: ${response.statusText}`);
        }
        const contentType = response.headers.get("content-type") || "";
        let loadedTranslations;
        const buffer = await response.arrayBuffer();
        const utf8Text = new TextDecoder("utf-8").decode(buffer);
        if (contentType.includes("application/json") || url.endsWith(".json")) {
          loadedTranslations = JSON.parse(utf8Text);
        } else if (contentType.includes("text/yaml") || contentType.includes("application/x-yaml") || url.endsWith(".yaml") || url.endsWith(".yml")) {
          try {
            loadedTranslations = JSON.parse(utf8Text);
          } catch {
            if (typeof window !== "undefined" && window.jsyaml) {
              loadedTranslations = window.jsyaml.load(utf8Text);
            } else {
              console.warn("YAML parsing requires js-yaml library. Please include it or use JSON format.");
              throw new Error("YAML parsing not available. Please use JSON format or include js-yaml library.");
            }
          }
        } else {
          loadedTranslations = JSON.parse(utf8Text);
        }
        this.addTranslation(langCode, loadedTranslations);
        return loadedTranslations;
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
  async loadLanguagesFromUrls(languageMap, options = {}) {
    const promises = Object.entries(languageMap).map(
      ([langCode, url]) => this.loadLanguageFromUrl(langCode, url, options)
    );
    await Promise.all(promises);
  }
};
var i18n = new I18n();

export {
  DOMUtils,
  isForbiddenKey,
  shallowSanitize,
  i18n
};
//# sourceMappingURL=vidply.chunk-HRQCV7H2.js.map
