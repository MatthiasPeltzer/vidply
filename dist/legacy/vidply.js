/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/utils/DOMUtils.js
  var DOMUtils;
  var init_DOMUtils = __esm({
    "src/utils/DOMUtils.js"() {
      DOMUtils = {
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
          (element == null ? void 0 : element.style) && (element.style.display = "");
        },
        /**
         * Hide element
         * @param {HTMLElement} element
         */
        hide(element) {
          (element == null ? void 0 : element.style) && (element.style.display = "none");
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
          element.style.transition = "opacity ".concat(duration, "ms ease");
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
          element.style.transition = "opacity ".concat(duration, "ms ease");
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
            className: "".concat(classPrefix, "-tooltip"),
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
          var _a;
          if (!element || !text) return;
          (_a = element.querySelector(".".concat(classPrefix, "-tooltip"))) == null ? void 0 : _a.remove();
          const tooltip = this.createTooltip(text, classPrefix);
          element.appendChild(tooltip);
          const visibleClass = "".concat(classPrefix, "-tooltip-visible");
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
            className: "".concat(classPrefix, "-button-text"),
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
          var _a;
          (_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.add(className);
        },
        /**
         * Remove class from element (null-safe)
         * @param {HTMLElement} element
         * @param {string} className
         */
        removeClass(element, className) {
          var _a;
          (_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.remove(className);
        },
        /**
         * Toggle class on element (null-safe)
         * @param {HTMLElement} element
         * @param {string} className
         */
        toggleClass(element, className) {
          var _a;
          (_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.toggle(className);
        },
        /**
         * Check if element has class (null-safe)
         * @param {HTMLElement} element
         * @param {string} className
         * @returns {boolean}
         */
        hasClass(element, className) {
          var _a, _b;
          return (_b = (_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.contains(className)) != null ? _b : false;
        }
      };
    }
  });

  // src/i18n/languages/en.js
  var en;
  var init_en = __esm({
    "src/i18n/languages/en.js"() {
      en = {
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
    }
  });

  // src/i18n/languages/de.js
  var de_exports = {};
  __export(de_exports, {
    de: () => de
  });
  var de;
  var init_de = __esm({
    "src/i18n/languages/de.js"() {
      de = {
        player: {
          label: "Videoplayer",
          play: "Abspielen",
          pause: "Pause",
          stop: "Stopp",
          restart: "Von vorne beginnen",
          rewind: "Zurückspulen",
          forward: "Vorspulen",
          rewindSeconds: "{seconds} Sekunden zurückspulen",
          forwardSeconds: "{seconds} Sekunden vorspulen",
          previous: "Vorheriger Titel",
          next: "Nächster Titel",
          playlist: "Wiedergabeliste umschalten",
          volume: "Lautstärke",
          mute: "Stumm",
          unmute: "Ton ein",
          fullscreen: "Vollbild",
          exitFullscreen: "Vollbild beenden",
          captions: "Untertitel",
          chapters: "Kapitel",
          quality: "Qualität",
          captionStyling: "Untertitel-Stil",
          transcript: "Transkript umschalten",
          audioDescription: "Audiodeskription",
          signLanguage: "Gebärdensprache-Video",
          settings: "Einstellungen",
          speed: "Wiedergabegeschwindigkeit",
          pip: "Bild-in-Bild",
          currentTime: "Aktuelle Zeit",
          duration: "Dauer",
          progress: "Fortschritt",
          seekForward: "{seconds} Sekunden vorspulen",
          seekBackward: "{seconds} Sekunden zurückspulen",
          volumeUp: "Lauter",
          volumeDown: "Leiser",
          loading: "Lädt...",
          loadingChapters: "Kapitel werden geladen...",
          error: "Fehler beim Laden",
          buffering: "Puffern...",
          signLanguageVideo: "Gebärdensprache-Video",
          closeSignLanguage: "Gebärdensprache-Video schließen",
          signLanguageSettings: "Gebärdensprache-Einstellungen",
          startPlaybackFirst: "Bitte starten Sie die Wiedergabe zuerst.",
          startPlaybackForAudioDescription: "Bitte starten Sie die Wiedergabe zuerst, um die Audiodeskription zu nutzen.",
          startPlaybackForSignLanguage: "Bitte starten Sie die Wiedergabe zuerst, um das Gebärdensprache-Video zu nutzen.",
          noChapters: "Keine Kapitel verfügbar",
          noCaptions: "Keine Untertitel verfügbar",
          auto: "Automatisch",
          autoQuality: "Automatisch (keine Qualitätsauswahl verfügbar)",
          noQuality: "Qualitätsauswahl nicht verfügbar",
          signLanguageDragResize: "Gebärdensprache-Video - Drücken Sie D zum Verschieben per Tastatur, R zum Ändern der Größe",
          signLanguageDragActive: "Gebärdensprache-Video - Verschiebemodus aktiv. Pfeiltasten zum Bewegen, Escape zum Beenden.",
          signLanguageResizeActive: "Gebärdensprache-Video - Größenänderungsmodus aktiv. Links-/Rechts-Pfeiltasten zum Ändern der Größe, Escape zum Beenden.",
          enableSignDragMode: "Verschiebemodus aktivieren. Tastenkombination: D-Taste",
          disableSignDragMode: "Verschiebemodus deaktivieren. Tastenkombination: D-Taste",
          enableSignDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten aktivieren. Tastenkombination: D-Taste",
          disableSignDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten deaktivieren. Tastenkombination: D-Taste",
          enableSignResizeMode: "Größenänderungsmodus aktivieren. Tastenkombination: R-Taste",
          disableSignResizeMode: "Größenänderungsmodus deaktivieren. Tastenkombination: R-Taste",
          enableSignResizeModeAria: "Tastatur-Größenänderungsmodus mit Pfeiltasten aktivieren. Tastenkombination: R-Taste",
          disableSignResizeModeAria: "Tastatur-Größenänderungsmodus mit Pfeiltasten deaktivieren. Tastenkombination: R-Taste",
          resizeHandle: "Größenänderung {direction}-Ecke",
          moreOptions: "Weitere Optionen",
          noMoreOptions: "Keine weiteren Optionen verfügbar"
        },
        captions: {
          off: "Aus",
          select: "Untertitel auswählen",
          fontSize: "Schriftgröße",
          fontFamily: "Schriftart",
          color: "Textfarbe",
          backgroundColor: "Hintergrundfarbe",
          opacity: "Deckkraft"
        },
        fontSizes: {
          small: "Klein",
          normal: "Normal",
          large: "Groß",
          xlarge: "Sehr groß"
        },
        fontFamilies: {
          sansSerif: "Sans-serif",
          serif: "Serif",
          monospace: "Monospace"
        },
        styleLabels: {
          textColor: "Textfarbe",
          background: "Hintergrund",
          font: "Schrift",
          fontSize: "Schriftgröße",
          opacity: "Deckkraft"
        },
        audioDescription: {
          enable: "Audiodeskription aktivieren",
          disable: "Audiodeskription deaktivieren"
        },
        signLanguage: {
          show: "Gebärdensprache-Video anzeigen",
          hide: "Gebärdensprache-Video ausblenden",
          showInMainView: "Gebärdensprache im Hauptvideo anzeigen",
          hideInMainView: "Gebärdensprache aus Hauptvideo entfernen"
        },
        transcript: {
          title: "Transkript",
          ariaLabel: "Video-Transkript",
          close: "Transkript schließen",
          loading: "Transkript wird geladen...",
          noTranscript: "Kein Transkript für dieses Video verfügbar.",
          settings: "Transkript-Einstellungen. Eingabetaste zum Öffnen des Menüs drücken oder D zum Aktivieren des Verschiebemodus",
          keyboardDragMode: "Tastatur-Verschiebemodus mit Pfeiltasten umschalten. Tastenkombination: D-Taste",
          keyboardDragActive: "⌨️ Tastatur-Verschiebemodus aktiv (Pfeiltasten zum Bewegen, Umschalt+Pfeiltasten für große Schritte, D oder ESC zum Beenden)",
          dragResizePrompt: "Drücken Sie D zum Verschieben oder R zur Größenänderung. Home setzt die Position zurück, Esc schließt.",
          dragModeEnabled: "Tastatur-Verschiebemodus aktiviert. Pfeiltasten zum Bewegen, Umschalt+Pfeiltasten für größere Schritte. D oder Esc zum Beenden.",
          dragModeDisabled: "Tastatur-Verschiebemodus deaktiviert.",
          enableDragMode: "Verschiebemodus aktivieren. Tastenkombination: D-Taste",
          disableDragMode: "Verschiebemodus deaktivieren. Tastenkombination: D-Taste",
          enableDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten aktivieren. Tastenkombination: D-Taste",
          disableDragModeAria: "Tastatur-Verschiebemodus mit Pfeiltasten deaktivieren. Tastenkombination: D-Taste",
          resizeWindow: "Fenster vergrößern/verkleinern",
          disableResizeWindow: "Resize-Modus deaktivieren",
          enableResizeMode: "Größenänderungsmodus aktivieren. Tastenkombination: R-Taste",
          disableResizeMode: "Größenänderungsmodus deaktivieren. Tastenkombination: R-Taste",
          enableResizeModeAria: "Tastatur-Größenänderungsmodus mit Pfeiltasten aktivieren. Tastenkombination: R-Taste",
          disableResizeModeAria: "Tastatur-Größenänderungsmodus mit Pfeiltasten deaktivieren. Tastenkombination: R-Taste",
          resizeModeHint: "Griffe aktiviert. Ziehen Sie Kanten oder Ecken zum Anpassen. Esc oder R zum Beenden.",
          resizeModeEnabled: "Resize-Modus aktiviert. Kanten oder Ecken ziehen; Esc oder R beendet.",
          resizeModeDisabled: "Resize-Modus deaktiviert.",
          positionReset: "Transkriptposition zurückgesetzt.",
          styleTranscript: "Transkript-Stileinstellungen öffnen",
          closeMenu: "Menü schließen",
          styleTitle: "Transkript-Stil",
          autoscroll: "Auto-Scroll",
          settingsMenu: "Transkript-Dialog-Einstellungen",
          showTimestamps: "Zeitstempel anzeigen",
          hideTimestamps: "Zeitstempel ausblenden",
          showTimestampsAria: "Zeitstempel im Transkript anzeigen",
          hideTimestampsAria: "Zeitstempel im Transkript ausblenden"
        },
        settings: {
          title: "Einstellungen",
          quality: "Qualität",
          speed: "Geschwindigkeit",
          captions: "Untertitel",
          language: "Sprache",
          reset: "Zurücksetzen",
          close: "Schließen"
        },
        speeds: {
          normal: "Normal"
        },
        time: {
          display: "Zeitanzeige",
          durationPrefix: "Dauer: ",
          of: "von",
          hour: "{count} Stunde",
          hours: "{count} Stunden",
          minute: "{count} Minute",
          minutes: "{count} Minuten",
          second: "{count} Sekunde",
          seconds: "{count} Sekunden"
        },
        playlist: {
          title: "Wiedergabeliste",
          trackOf: "Titel {current} von {total}",
          nowPlaying: "Läuft gerade: Titel {current} von {total}. {title}{artist}",
          by: " von ",
          untitled: "Ohne Titel",
          trackUntitled: "Titel {number}",
          currentlyPlaying: "Wird gerade abgespielt",
          notPlaying: "Nicht aktiv",
          pressEnterPlay: "Eingabetaste zum Abspielen",
          pressEnterRestart: "Eingabetaste zum Neustart",
          keyboardInstructions: "Wiedergabelisten-Navigation: Verwenden Sie die Pfeiltasten nach oben und unten, um zwischen Titeln zu wechseln. Drücken Sie Bild auf oder Bild ab, um 5 Titel zu überspringen. Drücken Sie Pos1, um zum ersten Titel zu springen, Ende für den letzten Titel. Drücken Sie die Eingabetaste oder Leertaste, um den ausgewählten Titel abzuspielen.",
          endOfPlaylist: "Ende der Wiedergabeliste. {current} von {total}.",
          beginningOfPlaylist: "Anfang der Wiedergabeliste. 1 von {total}.",
          jumpedToLastTrack: "Zum letzten Titel gesprungen. {current} von {total}.",
          jumpedToFirstTrack: "Zum ersten Titel gesprungen. 1 von {total}.",
          firstTrack: "Erster Titel. 1 von {total}.",
          lastTrack: "Letzter Titel. {current} von {total}."
        }
      };
    }
  });

  // src/i18n/languages/es.js
  var es_exports = {};
  __export(es_exports, {
    es: () => es
  });
  var es;
  var init_es = __esm({
    "src/i18n/languages/es.js"() {
      es = {
        player: {
          label: "Reproductor de video",
          play: "Reproducir",
          pause: "Pausa",
          stop: "Detener",
          restart: "Reiniciar desde el principio",
          rewind: "Retroceder",
          forward: "Avanzar",
          rewindSeconds: "Retroceder {seconds} segundos",
          forwardSeconds: "Avanzar {seconds} segundos",
          previous: "Pista anterior",
          next: "Siguiente pista",
          playlist: "Alternar lista de reproducción",
          volume: "Volumen",
          mute: "Silenciar",
          unmute: "Activar sonido",
          fullscreen: "Pantalla completa",
          exitFullscreen: "Salir de pantalla completa",
          captions: "Subtítulos",
          chapters: "Capítulos",
          quality: "Calidad",
          captionStyling: "Estilo de subtítulos",
          transcript: "Alternar transcripción",
          audioDescription: "Audiodescripción",
          signLanguage: "Video en lengua de señas",
          settings: "Configuración",
          speed: "Velocidad de reproducción",
          pip: "Imagen en imagen",
          currentTime: "Tiempo actual",
          duration: "Duración",
          progress: "Progreso",
          seekForward: "Avanzar {seconds} segundos",
          seekBackward: "Retroceder {seconds} segundos",
          volumeUp: "Subir volumen",
          volumeDown: "Bajar volumen",
          loading: "Cargando...",
          loadingChapters: "Cargando capítulos...",
          error: "Error al cargar",
          buffering: "Almacenando en búfer...",
          signLanguageVideo: "Video en Lengua de Señas",
          closeSignLanguage: "Cerrar video en lengua de señas",
          signLanguageSettings: "Configuración de lengua de señas",
          noChapters: "No hay capítulos disponibles",
          noCaptions: "No hay subtítulos disponibles",
          auto: "Automático",
          autoQuality: "Automático (selección de calidad no disponible)",
          noQuality: "Selección de calidad no disponible",
          signLanguageDragResize: "Video en Lengua de Señas - Presione D para arrastrar con el teclado, R para cambiar el tamaño",
          signLanguageDragActive: "Video en Lengua de Señas - Modo de arrastre activo. Use las teclas de flecha para mover, Escape para salir.",
          signLanguageResizeActive: "Video en Lengua de Señas - Modo de cambio de tamaño activo. Use las teclas de flecha izquierda/derecha para cambiar el tamaño, Escape para salir.",
          enableSignDragMode: "Activar modo de arrastre. Atajo: tecla D",
          disableSignDragMode: "Desactivar modo de arrastre. Atajo: tecla D",
          enableSignDragModeAria: "Activar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
          disableSignDragModeAria: "Desactivar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
          enableSignResizeMode: "Activar modo de cambio de tamaño. Atajo: tecla R",
          disableSignResizeMode: "Desactivar modo de cambio de tamaño. Atajo: tecla R",
          enableSignResizeModeAria: "Activar modo de cambio de tamaño con teclado usando teclas de flecha. Atajo: tecla R",
          disableSignResizeModeAria: "Desactivar modo de cambio de tamaño con teclado usando teclas de flecha. Atajo: tecla R",
          resizeHandle: "Cambiar tamaño esquina {direction}",
          moreOptions: "Más opciones",
          noMoreOptions: "No hay opciones adicionales disponibles"
        },
        captions: {
          off: "Desactivado",
          select: "Seleccionar subtítulos",
          fontSize: "Tamaño de fuente",
          fontFamily: "Familia de fuente",
          color: "Color de texto",
          backgroundColor: "Color de fondo",
          opacity: "Opacidad"
        },
        fontSizes: {
          small: "Pequeño",
          normal: "Normal",
          large: "Grande",
          xlarge: "Muy grande"
        },
        fontFamilies: {
          sansSerif: "Sans-serif",
          serif: "Serif",
          monospace: "Monospace"
        },
        styleLabels: {
          textColor: "Color de texto",
          background: "Fondo",
          font: "Fuente",
          fontSize: "Tamaño de fuente",
          opacity: "Opacidad"
        },
        audioDescription: {
          enable: "Activar audiodescripción",
          disable: "Desactivar audiodescripción"
        },
        signLanguage: {
          show: "Mostrar video en lengua de señas",
          hide: "Ocultar video en lengua de señas",
          showInMainView: "Mostrar lengua de señas en video principal",
          hideInMainView: "Ocultar lengua de señas del video principal"
        },
        transcript: {
          title: "Transcripción",
          ariaLabel: "Transcripción de video",
          close: "Cerrar transcripción",
          loading: "Cargando transcripción...",
          noTranscript: "No hay transcripción disponible para este video.",
          settings: "Configuración de transcripción. Presione Enter para abrir el menú o D para activar el modo de arrastre",
          keyboardDragMode: "Alternar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
          keyboardDragActive: "⌨️ Modo de Arrastre con Teclado Activo (Teclas de flecha para mover, Mayús+Flechas para pasos grandes, D o ESC para salir)",
          dragResizePrompt: "Pulsa D para mover o R para cambiar el tamaño. Home restablece la posición; Esc cierra.",
          dragModeEnabled: "Modo de arrastre con teclado activado. Usa flechas para mover, Mayús+Flechas para pasos grandes. Pulsa D o Esc para salir.",
          dragModeDisabled: "Modo de arrastre con teclado desactivado.",
          enableDragMode: "Activar modo de arrastre. Atajo: tecla D",
          disableDragMode: "Desactivar modo de arrastre. Atajo: tecla D",
          enableDragModeAria: "Activar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
          disableDragModeAria: "Desactivar modo de arrastre con teclado usando teclas de flecha. Atajo: tecla D",
          resizeWindow: "Cambiar tamaño de ventana",
          disableResizeWindow: "Desactivar modo de cambio de tamaño",
          enableResizeMode: "Activar modo de cambio de tamaño. Atajo: tecla R",
          disableResizeMode: "Desactivar modo de cambio de tamaño. Atajo: tecla R",
          enableResizeModeAria: "Activar modo de cambio de tamaño con teclado usando teclas de flecha. Atajo: tecla R",
          disableResizeModeAria: "Desactivar modo de cambio de tamaño con teclado usando teclas de flecha. Atajo: tecla R",
          resizeModeHint: "Controladores habilitados. Arrastra bordes o esquinas para ajustar. Pulsa Esc o R para salir.",
          resizeModeEnabled: "Modo de cambio de tamaño activado. Arrastra bordes o esquinas. Pulsa Esc o R para salir.",
          resizeModeDisabled: "Modo de cambio de tamaño desactivado.",
          positionReset: "Posición de la transcripción restablecida.",
          styleTranscript: "Abrir configuración de estilo de transcripción",
          closeMenu: "Cerrar menú",
          styleTitle: "Estilo de Transcripción",
          autoscroll: "Desplazamiento automático",
          settingsMenu: "Configuración del diálogo de transcripción",
          showTimestamps: "Mostrar marcas de tiempo",
          hideTimestamps: "Ocultar marcas de tiempo",
          showTimestampsAria: "Mostrar marcas de tiempo en la transcripción",
          hideTimestampsAria: "Ocultar marcas de tiempo en la transcripción"
        },
        settings: {
          title: "Configuración",
          quality: "Calidad",
          speed: "Velocidad",
          captions: "Subtítulos",
          language: "Idioma",
          reset: "Restablecer",
          close: "Cerrar"
        },
        speeds: {
          normal: "Normal"
        },
        time: {
          display: "Visualización de tiempo",
          durationPrefix: "Duración: ",
          of: "de",
          hour: "{count} hora",
          hours: "{count} horas",
          minute: "{count} minuto",
          minutes: "{count} minutos",
          second: "{count} segundo",
          seconds: "{count} segundos"
        },
        playlist: {
          title: "Lista de reproducción",
          trackOf: "Pista {current} de {total}",
          nowPlaying: "Reproduciendo ahora: Pista {current} de {total}. {title}{artist}",
          by: " por ",
          untitled: "Sin título",
          trackUntitled: "Pista {number}",
          currentlyPlaying: "Reproduciendo actualmente",
          notPlaying: "Sin reproducir",
          pressEnterPlay: "Pulsa Enter para reproducir",
          pressEnterRestart: "Pulsa Enter para reiniciar",
          keyboardInstructions: "Navegación de lista de reproducción: Use las teclas de flecha arriba y abajo para moverse entre pistas. Pulse Retroceder página o Avanzar página para saltar 5 pistas. Pulse Inicio para ir a la primera pista, Fin para la última pista. Pulse Intro o Espacio para reproducir la pista seleccionada.",
          endOfPlaylist: "Fin de la lista de reproducción. {current} de {total}.",
          beginningOfPlaylist: "Inicio de la lista de reproducción. 1 de {total}.",
          jumpedToLastTrack: "Saltó a la última pista. {current} de {total}.",
          jumpedToFirstTrack: "Saltó a la primera pista. 1 de {total}.",
          firstTrack: "Primera pista. 1 de {total}.",
          lastTrack: "Última pista. {current} de {total}."
        }
      };
    }
  });

  // src/i18n/languages/fr.js
  var fr_exports = {};
  __export(fr_exports, {
    fr: () => fr
  });
  var fr;
  var init_fr = __esm({
    "src/i18n/languages/fr.js"() {
      fr = {
        player: {
          label: "Lecteur vidéo",
          play: "Lecture",
          pause: "Pause",
          stop: "Arrêt",
          restart: "Redémarrer du début",
          rewind: "Reculer",
          forward: "Avancer",
          rewindSeconds: "Reculer de {seconds} secondes",
          forwardSeconds: "Avancer de {seconds} secondes",
          previous: "Piste précédente",
          next: "Piste suivante",
          playlist: "Basculer la liste de lecture",
          volume: "Volume",
          mute: "Muet",
          unmute: "Activer le son",
          fullscreen: "Plein écran",
          exitFullscreen: "Quitter le plein écran",
          captions: "Sous-titres",
          chapters: "Chapitres",
          quality: "Qualité",
          captionStyling: "Style des sous-titres",
          transcript: "Activer/désactiver la transcription",
          audioDescription: "Audiodescription",
          signLanguage: "Vidéo en langue des signes",
          settings: "Paramètres",
          speed: "Vitesse de lecture",
          pip: "Image dans l'image",
          currentTime: "Temps actuel",
          duration: "Durée",
          progress: "Progression",
          seekForward: "Avancer de {seconds} secondes",
          seekBackward: "Reculer de {seconds} secondes",
          volumeUp: "Augmenter le volume",
          volumeDown: "Diminuer le volume",
          loading: "Chargement...",
          loadingChapters: "Chargement des chapitres...",
          error: "Erreur de chargement",
          buffering: "Mise en mémoire tampon...",
          signLanguageVideo: "Vidéo en Langue des Signes",
          closeSignLanguage: "Fermer la vidéo en langue des signes",
          signLanguageSettings: "Paramètres de la langue des signes",
          noChapters: "Aucun chapitre disponible",
          noCaptions: "Aucun sous-titre disponible",
          auto: "Automatique",
          autoQuality: "Automatique (sélection de qualité non disponible)",
          noQuality: "Sélection de qualité non disponible",
          signLanguageDragResize: "Vidéo en Langue des Signes - Appuyez sur D pour déplacer avec le clavier, R pour redimensionner",
          signLanguageDragActive: "Vidéo en Langue des Signes - Mode glissement actif. Utilisez les touches fléchées pour déplacer, Échap pour quitter.",
          signLanguageResizeActive: "Vidéo en Langue des Signes - Mode redimensionnement actif. Utilisez les touches fléchées gauche/droite pour redimensionner, Échap pour quitter.",
          enableSignDragMode: "Activer le mode glissement. Raccourci : touche D",
          disableSignDragMode: "Désactiver le mode glissement. Raccourci : touche D",
          enableSignDragModeAria: "Activer le mode glissement clavier avec les touches fléchées. Raccourci : touche D",
          disableSignDragModeAria: "Désactiver le mode glissement clavier avec les touches fléchées. Raccourci : touche D",
          enableSignResizeMode: "Activer le mode redimensionnement. Raccourci : touche R",
          disableSignResizeMode: "Désactiver le mode redimensionnement. Raccourci : touche R",
          enableSignResizeModeAria: "Activer le mode redimensionnement clavier avec les touches fléchées. Raccourci : touche R",
          disableSignResizeModeAria: "Désactiver le mode redimensionnement clavier avec les touches fléchées. Raccourci : touche R",
          resizeHandle: "Redimensionner coin {direction}",
          moreOptions: "Plus d'options",
          noMoreOptions: "Aucune option supplémentaire disponible"
        },
        captions: {
          off: "Désactivé",
          select: "Sélectionner les sous-titres",
          fontSize: "Taille de police",
          fontFamily: "Police",
          color: "Couleur du texte",
          backgroundColor: "Couleur de fond",
          opacity: "Opacité"
        },
        fontSizes: {
          small: "Petit",
          normal: "Normal",
          large: "Grand",
          xlarge: "Très grand"
        },
        fontFamilies: {
          sansSerif: "Sans-serif",
          serif: "Serif",
          monospace: "Monospace"
        },
        styleLabels: {
          textColor: "Couleur du texte",
          background: "Arrière-plan",
          font: "Police",
          fontSize: "Taille de police",
          opacity: "Opacité"
        },
        audioDescription: {
          enable: "Activer l'audiodescription",
          disable: "Désactiver l'audiodescription"
        },
        signLanguage: {
          show: "Afficher la vidéo en langue des signes",
          hide: "Masquer la vidéo en langue des signes",
          showInMainView: "Afficher langue des signes dans la vidéo principale",
          hideInMainView: "Masquer langue des signes de la vidéo principale"
        },
        transcript: {
          title: "Transcription",
          ariaLabel: "Transcription vidéo",
          close: "Fermer la transcription",
          loading: "Chargement de la transcription...",
          noTranscript: "Aucune transcription disponible pour cette vidéo.",
          settings: "Paramètres de transcription. Appuyez sur Entrée pour ouvrir le menu ou D pour activer le mode glissement",
          keyboardDragMode: "Basculer le mode glissement avec les touches fléchées. Raccourci: touche D",
          keyboardDragActive: "⌨️ Mode Glissement Clavier Actif (Touches fléchées pour déplacer, Maj+Fléchées pour grands pas, D ou Échap pour quitter)",
          dragResizePrompt: "Appuyez sur D pour déplacer ou R pour redimensionner. Home réinitialise la position, Échap ferme.",
          dragModeEnabled: "Mode glissement clavier activé. Utilisez les flèches pour déplacer, Maj+Flèches pour de grands pas. Appuyez sur D ou Échap pour quitter.",
          dragModeDisabled: "Mode glissement clavier désactivé.",
          enableDragMode: "Activer le mode glissement. Raccourci : touche D",
          disableDragMode: "Désactiver le mode glissement. Raccourci : touche D",
          enableDragModeAria: "Activer le mode glissement clavier avec les touches fléchées. Raccourci : touche D",
          disableDragModeAria: "Désactiver le mode glissement clavier avec les touches fléchées. Raccourci : touche D",
          resizeWindow: "Redimensionner la fenêtre",
          disableResizeWindow: "Désactiver le mode de redimensionnement",
          enableResizeMode: "Activer le mode redimensionnement. Raccourci : touche R",
          disableResizeMode: "Désactiver le mode redimensionnement. Raccourci : touche R",
          enableResizeModeAria: "Activer le mode redimensionnement clavier avec les touches fléchées. Raccourci : touche R",
          disableResizeModeAria: "Désactiver le mode redimensionnement clavier avec les touches fléchées. Raccourci : touche R",
          resizeModeHint: "Poignées activées. Faites glisser les bords ou les coins pour ajuster. Appuyez sur Échap ou R pour quitter.",
          resizeModeEnabled: "Mode redimensionnement activé. Faites glisser les bords ou coins. Appuyez sur Échap ou R pour quitter.",
          resizeModeDisabled: "Mode redimensionnement désactivé.",
          positionReset: "Position de la transcription réinitialisée.",
          styleTranscript: "Ouvrir les paramètres de style de transcription",
          closeMenu: "Fermer le menu",
          styleTitle: "Style de Transcription",
          autoscroll: "Défilement automatique",
          settingsMenu: "Paramètres de dialogue de transcription",
          showTimestamps: "Afficher les horodatages",
          hideTimestamps: "Masquer les horodatages",
          showTimestampsAria: "Afficher les horodatages dans la transcription",
          hideTimestampsAria: "Masquer les horodatages dans la transcription"
        },
        settings: {
          title: "Paramètres",
          quality: "Qualité",
          speed: "Vitesse",
          captions: "Sous-titres",
          language: "Langue",
          reset: "Réinitialiser",
          close: "Fermer"
        },
        speeds: {
          normal: "Normal"
        },
        time: {
          display: "Affichage du temps",
          durationPrefix: "Durée : ",
          of: "sur",
          hour: "{count} heure",
          hours: "{count} heures",
          minute: "{count} minute",
          minutes: "{count} minutes",
          second: "{count} seconde",
          seconds: "{count} secondes"
        },
        playlist: {
          title: "Liste de lecture",
          trackOf: "Piste {current} sur {total}",
          nowPlaying: "Lecture en cours : Piste {current} sur {total}. {title}{artist}",
          by: " par ",
          untitled: "Sans titre",
          trackUntitled: "Piste {number}",
          currentlyPlaying: "En cours de lecture",
          notPlaying: "Non en lecture",
          pressEnterPlay: "Appuyez sur Entrée pour lire",
          pressEnterRestart: "Appuyez sur Entrée pour recommencer",
          keyboardInstructions: "Navigation de la liste de lecture : Utilisez les touches fléchées haut et bas pour naviguer entre les pistes. Appuyez sur Page précédente ou Page suivante pour sauter 5 pistes. Appuyez sur Début pour aller à la première piste, Fin pour la dernière piste. Appuyez sur Entrée ou Espace pour lire la piste sélectionnée.",
          endOfPlaylist: "Fin de la liste de lecture. {current} sur {total}.",
          beginningOfPlaylist: "Début de la liste de lecture. 1 sur {total}.",
          jumpedToLastTrack: "Sauté à la dernière piste. {current} sur {total}.",
          jumpedToFirstTrack: "Sauté à la première piste. 1 sur {total}.",
          firstTrack: "Première piste. 1 sur {total}.",
          lastTrack: "Dernière piste. {current} sur {total}."
        }
      };
    }
  });

  // src/i18n/languages/ja.js
  var ja_exports = {};
  __export(ja_exports, {
    ja: () => ja
  });
  var ja;
  var init_ja = __esm({
    "src/i18n/languages/ja.js"() {
      ja = {
        player: {
          label: "ビデオプレーヤー",
          play: "再生",
          pause: "一時停止",
          stop: "停止",
          restart: "最初から再生",
          rewind: "巻き戻し",
          forward: "早送り",
          rewindSeconds: "{seconds}秒戻す",
          forwardSeconds: "{seconds}秒進める",
          previous: "前のトラック",
          next: "次のトラック",
          playlist: "プレイリストの切り替え",
          volume: "音量",
          mute: "ミュート",
          unmute: "ミュート解除",
          fullscreen: "全画面表示",
          exitFullscreen: "全画面表示を終了",
          captions: "字幕",
          chapters: "チャプター",
          quality: "画質",
          captionStyling: "字幕スタイル",
          transcript: "文字起こし切り替え",
          audioDescription: "音声解説",
          signLanguage: "手話動画",
          settings: "設定",
          speed: "再生速度",
          pip: "ピクチャーインピクチャー",
          currentTime: "現在の時間",
          duration: "再生時間",
          progress: "進行状況",
          seekForward: "{seconds}秒進める",
          seekBackward: "{seconds}秒戻す",
          volumeUp: "音量を上げる",
          volumeDown: "音量を下げる",
          loading: "読み込み中...",
          loadingChapters: "チャプター読み込み中...",
          error: "読み込みエラー",
          buffering: "バッファリング中...",
          signLanguageVideo: "手話動画",
          closeSignLanguage: "手話動画を閉じる",
          signLanguageSettings: "手話設定",
          noChapters: "チャプターがありません",
          noCaptions: "字幕がありません",
          auto: "自動",
          autoQuality: "自動（画質選択不可）",
          noQuality: "画質選択不可",
          signLanguageDragResize: "手話動画 - キーボードでドラッグするにはDキーを、サイズ変更するにはRキーを押してください",
          signLanguageDragActive: "手話動画 - ドラッグモードが有効です。矢印キーで移動、Escapeで終了します。",
          signLanguageResizeActive: "手話動画 - サイズ変更モードが有効です。左右の矢印キーでサイズ変更、Escapeで終了します。",
          enableSignDragMode: "ドラッグモードを有効にする。ショートカット：Dキー",
          disableSignDragMode: "ドラッグモードを無効にする。ショートカット：Dキー",
          enableSignDragModeAria: "矢印キーでキーボードドラッグモードを有効にする。ショートカット：Dキー",
          disableSignDragModeAria: "矢印キーでキーボードドラッグモードを無効にする。ショートカット：Dキー",
          enableSignResizeMode: "サイズ変更モードを有効にする。ショートカット：Rキー",
          disableSignResizeMode: "サイズ変更モードを無効にする。ショートカット：Rキー",
          enableSignResizeModeAria: "矢印キーでキーボードサイズ変更モードを有効にする。ショートカット：Rキー",
          disableSignResizeModeAria: "矢印キーでキーボードサイズ変更モードを無効にする。ショートカット：Rキー",
          resizeHandle: "{direction}コーナーのサイズ変更",
          moreOptions: "その他のオプション",
          noMoreOptions: "追加のオプションはありません"
        },
        captions: {
          off: "オフ",
          select: "字幕を選択",
          fontSize: "フォントサイズ",
          fontFamily: "フォント",
          color: "テキストの色",
          backgroundColor: "背景色",
          opacity: "不透明度"
        },
        fontSizes: {
          small: "小",
          normal: "標準",
          large: "大",
          xlarge: "特大"
        },
        fontFamilies: {
          sansSerif: "サンセリフ",
          serif: "セリフ",
          monospace: "等幅"
        },
        styleLabels: {
          textColor: "テキストの色",
          background: "背景",
          font: "フォント",
          fontSize: "フォントサイズ",
          opacity: "不透明度"
        },
        audioDescription: {
          enable: "音声解説を有効にする",
          disable: "音声解説を無効にする"
        },
        signLanguage: {
          show: "手話動画を表示",
          hide: "手話動画を非表示",
          showInMainView: "メイン動画に手話を表示",
          hideInMainView: "メイン動画から手話を削除"
        },
        transcript: {
          title: "文字起こし",
          ariaLabel: "ビデオ文字起こし",
          close: "文字起こしを閉じる",
          loading: "文字起こしを読み込み中...",
          noTranscript: "このビデオの文字起こしはありません。",
          settings: "文字起こし設定。Enterキーでメニューを開く、またはDキーでドラッグモードを有効にする",
          keyboardDragMode: "矢印キーでキーボードドラッグモードを切り替え。ショートカット：Dキー",
          keyboardDragActive: "⌨️ キーボードドラッグモード有効（矢印キーで移動、Shift+矢印キーで大きく移動、DまたはESCで終了）",
          dragResizePrompt: "Dキーで移動、Rキーでサイズ変更。Homeで位置をリセット、Escで閉じます。",
          dragModeEnabled: "キーボードドラッグモードを有効にしました。矢印キーで移動、Shift+矢印キーで大きく移動できます。終了するには D または Esc を押します。",
          dragModeDisabled: "キーボードドラッグモードを無効にしました。",
          enableDragMode: "ドラッグモードを有効にする。ショートカット：Dキー",
          disableDragMode: "ドラッグモードを無効にする。ショートカット：Dキー",
          enableDragModeAria: "矢印キーでキーボードドラッグモードを有効にする。ショートカット：Dキー",
          disableDragModeAria: "矢印キーでキーボードドラッグモードを無効にする。ショートカット：Dキー",
          resizeWindow: "ウィンドウのサイズ変更",
          disableResizeWindow: "サイズ変更モードを無効にする",
          enableResizeMode: "サイズ変更モードを有効にする。ショートカット：Rキー",
          disableResizeMode: "サイズ変更モードを無効にする。ショートカット：Rキー",
          enableResizeModeAria: "矢印キーでキーボードサイズ変更モードを有効にする。ショートカット：Rキー",
          disableResizeModeAria: "矢印キーでキーボードサイズ変更モードを無効にする。ショートカット：Rキー",
          resizeModeHint: "リサイズハンドルが有効になりました。辺や角をドラッグして調整します。Esc または R で終了します。",
          resizeModeEnabled: "サイズ変更モードを有効にしました。辺や角をドラッグして調整します。Esc または R で終了します。",
          resizeModeDisabled: "サイズ変更モードを無効にしました。",
          positionReset: "文字起こしの位置をリセットしました。",
          styleTranscript: "文字起こしスタイル設定を開く",
          closeMenu: "メニューを閉じる",
          styleTitle: "文字起こしスタイル",
          autoscroll: "自動スクロール",
          settingsMenu: "文字起こしダイアログ設定",
          showTimestamps: "タイムスタンプを表示",
          hideTimestamps: "タイムスタンプを非表示",
          showTimestampsAria: "文字起こしにタイムスタンプを表示",
          hideTimestampsAria: "文字起こしのタイムスタンプを非表示"
        },
        settings: {
          title: "設定",
          quality: "画質",
          speed: "速度",
          captions: "字幕",
          language: "言語",
          reset: "リセット",
          close: "閉じる"
        },
        speeds: {
          normal: "通常"
        },
        time: {
          display: "時間表示",
          durationPrefix: "再生時間: ",
          of: "/",
          hour: "{count}時間",
          hours: "{count}時間",
          minute: "{count}分",
          minutes: "{count}分",
          second: "{count}秒",
          seconds: "{count}秒"
        },
        playlist: {
          title: "プレイリスト",
          trackOf: "トラック {current}/{total}",
          nowPlaying: "再生中: トラック {current}/{total}. {title}{artist}",
          by: " - ",
          untitled: "タイトルなし",
          trackUntitled: "トラック {number}",
          currentlyPlaying: "再生中",
          notPlaying: "停止中",
          pressEnterPlay: "Enterキーで再生",
          pressEnterRestart: "Enterキーで最初から再生",
          keyboardInstructions: "プレイリストナビゲーション：上下の矢印キーでトラック間を移動します。Page UpまたはPage Downで5トラックをスキップします。Homeで最初のトラックへ、Endで最後のトラックへ移動します。EnterまたはSpaceで選択したトラックを再生します。",
          endOfPlaylist: "プレイリストの終わりです。{current}/{total}。",
          beginningOfPlaylist: "プレイリストの始めです。1/{total}。",
          jumpedToLastTrack: "最後のトラックにジャンプしました。{current}/{total}。",
          jumpedToFirstTrack: "最初のトラックにジャンプしました。1/{total}。",
          firstTrack: "最初のトラックです。1/{total}。",
          lastTrack: "最後のトラックです。{current}/{total}。"
        }
      };
    }
  });

  // src/i18n/translations.js
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
  var builtInLanguageLoaders, translations;
  var init_translations = __esm({
    "src/i18n/translations.js"() {
      init_en();
      builtInLanguageLoaders = {
        de: () => Promise.resolve().then(() => (init_de(), de_exports)),
        es: () => Promise.resolve().then(() => (init_es(), es_exports)),
        fr: () => Promise.resolve().then(() => (init_fr(), fr_exports)),
        ja: () => Promise.resolve().then(() => (init_ja(), ja_exports))
      };
      translations = getBaseTranslations();
    }
  });

  // src/i18n/i18n.js
  var I18n, i18n;
  var init_i18n = __esm({
    "src/i18n/i18n.js"() {
      init_translations();
      I18n = class {
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
            console.warn('Language "'.concat(lang, '" not found, falling back to English'));
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
              console.warn('Language "'.concat(normalizedLang, '" failed to load:'), error);
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
              value = value.replace(new RegExp("{".concat(placeholder, "}"), "g"), replacement);
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
                throw new Error("Failed to load language file: ".concat(response.statusText));
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
              console.error("Error loading language file from ".concat(url, ":"), error);
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
      i18n = new I18n();
    }
  });

  // src/utils/TimeUtils.js
  var TimeUtils;
  var init_TimeUtils = __esm({
    "src/utils/TimeUtils.js"() {
      init_i18n();
      TimeUtils = {
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
            return "".concat(pad(hours), ":").concat(pad(minutes), ":").concat(pad(secs));
          }
          return "".concat(pad(minutes), ":").concat(pad(secs));
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
    }
  });

  // src/icons/Icons.js
  function getIcon(name) {
    return Icons[name] || Icons.play;
  }
  function createIconElement(name, className = "") {
    const wrapper = document.createElement("span");
    wrapper.className = "vidply-icon ".concat(className).trim();
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
    const filterId = "vidply-play-shadow-".concat(Math.random().toString(36).substr(2, 9));
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
    circle.setAttribute("filter", "url(#".concat(filterId, ")"));
    circle.setAttribute("class", "vidply-play-overlay-bg");
    svg.appendChild(circle);
    const playTriangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    playTriangle.setAttribute("points", "32,28 32,52 54,40");
    playTriangle.setAttribute("fill", "#0a406e");
    playTriangle.setAttribute("class", "vidply-play-overlay-icon");
    svg.appendChild(playTriangle);
    return svg;
  }
  var iconPaths, svgWrapper, Icons;
  var init_Icons = __esm({
    "src/icons/Icons.js"() {
      iconPaths = {
        play: '<path d="M8 5v14l11-7z"/>',
        pause: '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>',
        stop: '<rect x="6" y="6" width="12" height="12"/>',
        rewind: '<path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>',
        forward: '<path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>',
        skipPrevious: '<path d="M6 6h2v12H6V6zm3 6l8.5 6V6L9 12z"/>',
        skipNext: '<path d="M16 6h2v12h-2V6zM6 6l8.5 6L6 18V6z"/>',
        restart: '<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>',
        volumeHigh: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
        volumeMedium: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>',
        volumeLow: '<path d="M7 9v6h4l5 5V4l-5 5H7z"/>',
        volumeMuted: '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
        fullscreen: '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
        fullscreenExit: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>',
        settings: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
        captions: '<path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>',
        captionsOff: '<path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/><path d="M0 0h24v24H0z" fill="none"/>',
        pip: '<path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>',
        speed: '<path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44z"/><path d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/>',
        close: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
        check: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
        loading: '<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>',
        error: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
        playlist: '<path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>',
        hd: '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1c0 .55-.45 1-1 1h-.75v1.5h-1.5V15H14c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v4zm-3.5-.5h2v-3h-2v3z"/>',
        transcript: '<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>',
        chapters: '<path d="M3 5h2v2H3V5zm0 4h2v2H3V9zm0 4h2v2H3v-2zm0 4h2v2H3v-2zM7 5h14v2H7V5zm0 4h14v2H7V9zm0 4h14v2H7v-2zm0 4h14v2H7v-2z"/>',
        audioDescription: '<rect x="2" y="5" width="20" height="14" rx="2" fill="#ffffff" stroke="#ffffff" stroke-width="2"/><text x="12" y="16" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="#1a1a1a">AD</text>',
        audioDescriptionOn: '<rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">AD</text>',
        signLanguage: '<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>',
        signLanguageOn: '<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>',
        signLanguagePip: '<g transform="scale(1.2) translate(1, 1)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g><polygon points="14,23 23,14 23,23" fill="currentColor"/>',
        signLanguagePipOn: '<g transform="scale(1.2) translate(1, 1)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g><polygon points="14,23 23,14 23,23" fill="currentColor"/>',
        music: '<path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7zm-1.5 16c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',
        moreVertical: '<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>',
        move: '<path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>',
        resize: '<path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v2.5L7 11l3-3.5V10h4V7.5l3 3.5-3 3.5z"/>',
        clock: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>'
      };
      svgWrapper = (paths) => '<svg viewBox="0 0 24 24" fill="currentColor">'.concat(paths, "</svg>");
      Icons = Object.fromEntries(
        Object.entries(iconPaths).map(([key, value]) => [key, svgWrapper(value)])
      );
    }
  });

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
  var init_FocusUtils = __esm({
    "src/utils/FocusUtils.js"() {
    }
  });

  // src/utils/StorageManager.js
  var StorageManager;
  var init_StorageManager = __esm({
    "src/utils/StorageManager.js"() {
      StorageManager = class {
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
          return "".concat(this.namespace, "_").concat(key);
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
    }
  });

  // src/renderers/HTML5Renderer.js
  var HTML5Renderer_exports = {};
  __export(HTML5Renderer_exports, {
    HTML5Renderer: () => HTML5Renderer
  });
  var HTML5Renderer;
  var init_HTML5Renderer = __esm({
    "src/renderers/HTML5Renderer.js"() {
      HTML5Renderer = class {
        constructor(player) {
          this.player = player;
          this.media = player.element;
          this._didDeferredLoad = false;
        }
        async init() {
          this.media.controls = false;
          this.media.removeAttribute("controls");
          this.attachEvents();
          if (this.player.options.deferLoad) {
            this.media.preload = this.player.options.preload || "none";
          } else {
            this.media.preload = this.player.options.preload;
            this.media.load();
          }
          if (this.player.container) {
            this.player.container.classList.remove("vidply-external-controls");
          }
        }
        attachEvents() {
          this.media.addEventListener("loadedmetadata", () => {
            this.player.state.duration = this.media.duration;
            this.player.emit("loadedmetadata");
            if (this.media.tagName === "VIDEO") {
              this.player.autoGeneratePoster().catch((error) => {
                this.player.log("Failed to auto-generate poster:", error, "warn");
              });
            }
          });
          this.media.addEventListener("play", () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
            if (this.player.options.pauseOthersOnPlay) {
              this.pauseOtherPlayers();
            }
          });
          this.media.addEventListener("pause", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          });
          this.media.addEventListener("ended", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.state.ended = true;
            this.player.emit("ended");
            if (this.player.options.onEnded) {
              this.player.options.onEnded.call(this.player);
            }
            if (this.player.options.loop) {
              this.player.seek(0);
              this.player.play();
            }
          });
          this.media.addEventListener("timeupdate", () => {
            this.player.state.currentTime = this.media.currentTime;
            this.player.emit("timeupdate", this.media.currentTime);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
            }
          });
          this.media.addEventListener("volumechange", () => {
            this.player.state.volume = this.media.volume;
            this.player.state.muted = this.media.muted;
            this.player.emit("volumechange", this.media.volume);
            if (this.player.options.onVolumeChange) {
              this.player.options.onVolumeChange.call(this.player, this.media.volume);
            }
          });
          this.media.addEventListener("seeking", () => {
            this.player.state.seeking = true;
            this.player.emit("seeking");
          });
          this.media.addEventListener("seeked", () => {
            this.player.state.seeking = false;
            this.player.emit("seeked");
          });
          this.media.addEventListener("waiting", () => {
            this.player.state.buffering = true;
            this.player.emit("waiting");
          });
          this.media.addEventListener("canplay", () => {
            this.player.state.buffering = false;
            this.player.emit("canplay");
          });
          this.media.addEventListener("progress", () => {
            if (this.media.buffered.length > 0) {
              const buffered = this.media.buffered.end(this.media.buffered.length - 1);
              this.player.emit("progress", buffered);
            }
          });
          this.media.addEventListener("error", (e) => {
            this.player.handleError(this.media.error);
          });
          this.media.addEventListener("ratechange", () => {
            this.player.state.playbackSpeed = this.media.playbackRate;
            this.player.emit("ratechange", this.media.playbackRate);
          });
        }
        pauseOtherPlayers() {
          const allPlayers = document.querySelectorAll(".vidply-player");
          allPlayers.forEach((playerEl) => {
            if (playerEl !== this.player.container) {
              const video = playerEl.querySelector("video, audio");
              if (video && !video.paused) {
                video.pause();
              }
            }
          });
        }
        play() {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          if (this.player.options.deferLoad && !this._didDeferredLoad) {
            try {
              if (this.media.readyState === 0) {
                this.media.load();
              }
            } catch (e) {
            }
            this._didDeferredLoad = true;
          }
          const promise = this.media.play();
          window.scrollTo(scrollX, scrollY);
          if (promise !== void 0) {
            promise.catch((error) => {
              this.player.log("Play failed:", error, "warn");
              if (this.player.options.autoplay && !this.player.state.muted) {
                this.player.log("Retrying play with muted audio", "info");
                this.media.muted = true;
                const retryScrollX = window.scrollX;
                const retryScrollY = window.scrollY;
                this.media.play().then(() => {
                  window.scrollTo(retryScrollX, retryScrollY);
                }).catch((err) => {
                  this.player.handleError(err);
                });
              }
            });
            return promise;
          }
          return Promise.resolve();
        }
        /**
         * Ensure the media element has been loaded at least once (metadata/initial state)
         * without starting playback. Useful for playlists to behave like single videos.
         */
        ensureLoaded() {
          if (!this.player.options.deferLoad || this._didDeferredLoad) {
            return;
          }
          try {
            if (this.media.readyState === 0) {
              this.media.load();
            }
          } catch (e) {
          }
          this._didDeferredLoad = true;
        }
        pause() {
          this.media.pause();
        }
        seek(time) {
          this.media.currentTime = time;
        }
        setVolume(volume) {
          this.media.volume = volume;
        }
        setMuted(muted) {
          this.media.muted = muted;
        }
        setPlaybackSpeed(speed) {
          this.media.playbackRate = speed;
        }
        /**
         * Get available quality levels from source elements
         * @returns {Array} Array of quality objects with index, height, width, and src
         */
        getQualities() {
          const sources = Array.from(this.media.querySelectorAll("source"));
          if (sources.length <= 1) {
            return [];
          }
          return sources.map((source, index) => {
            const label = source.getAttribute("data-quality") || source.getAttribute("label") || "";
            const height = source.getAttribute("data-height") || this.extractHeightFromLabel(label);
            const width = source.getAttribute("data-width") || "";
            return {
              index,
              height: height ? parseInt(height) : 0,
              width: width ? parseInt(width) : 0,
              src: source.src,
              type: source.type,
              name: label || (height ? "".concat(height, "p") : "Quality ".concat(index + 1))
            };
          }).filter((q) => q.height > 0);
        }
        /**
         * Extract height from quality label (e.g., "1080p" -> 1080)
         * @param {string} label 
         * @returns {number}
         */
        extractHeightFromLabel(label) {
          const match = label.match(/(\d+)p/i);
          return match ? parseInt(match[1]) : 0;
        }
        /**
         * Switch to a specific quality level
         * @param {number} qualityIndex - Index of the quality level (-1 for auto, not applicable for HTML5)
         */
        switchQuality(qualityIndex) {
          const qualities = this.getQualities();
          if (qualityIndex < 0 || qualityIndex >= qualities.length) {
            this.player.log("Invalid quality index", "warn");
            return;
          }
          const quality = qualities[qualityIndex];
          const currentTime = this.media.currentTime;
          const wasPlaying = !this.media.paused;
          const currentSrc = this.media.currentSrc;
          if (currentSrc === quality.src) {
            this.player.log("Already at this quality level", "info");
            return;
          }
          this.player.log("Switching to quality: ".concat(quality.name), "info");
          this.media.src = quality.src;
          const onLoadedMetadata = () => {
            this.media.removeEventListener("loadedmetadata", onLoadedMetadata);
            this.media.currentTime = currentTime;
            if (wasPlaying) {
              this.media.play().catch((err) => {
                this.player.log("Failed to resume playback after quality switch", "warn");
              });
            }
            this.player.emit("qualitychange", { quality: quality.name, index: qualityIndex });
          };
          this.media.addEventListener("loadedmetadata", onLoadedMetadata);
          this.media.load();
        }
        /**
         * Get current quality index
         * @returns {number}
         */
        getCurrentQuality() {
          const qualities = this.getQualities();
          const currentSrc = this.media.currentSrc;
          for (let i = 0; i < qualities.length; i++) {
            if (qualities[i].src === currentSrc) {
              return i;
            }
          }
          return 0;
        }
        destroy() {
          this.media.removeEventListener("loadedmetadata", () => {
          });
          this.media.removeEventListener("play", () => {
          });
          this.media.removeEventListener("pause", () => {
          });
        }
      };
    }
  });

  // src/utils/DraggableResizable.js
  var DraggableResizable;
  var init_DraggableResizable = __esm({
    "src/utils/DraggableResizable.js"() {
      DraggableResizable = class {
        constructor(element, options = {}) {
          this.element = element;
          this.options = __spreadValues({
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
            storageKey: null
          }, options);
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
          var _a, _b;
          if (e.isPrimary === false) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if (e.target.classList.contains("".concat(this.options.classPrefix, "-resize-handle"))) {
            return;
          }
          if (this.options.onDragStart && !this.options.onDragStart(e)) {
            return;
          }
          this.activePointerId = e.pointerId;
          this.activePointerType = e.pointerType;
          try {
            (_b = (_a = e.currentTarget) == null ? void 0 : _a.setPointerCapture) == null ? void 0 : _b.call(_a, e.pointerId);
          } catch (e2) {
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
          if (e.target.classList.contains("".concat(this.options.classPrefix, "-resize-handle"))) {
            return;
          }
          if (this.options.onDragStart && !this.options.onDragStart(e)) {
            return;
          }
          this.startDragging(e.clientX, e.clientY);
          e.preventDefault();
        }
        onTouchStart(e) {
          if (e.target.classList.contains("".concat(this.options.classPrefix, "-resize-handle"))) {
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
          var _a, _b;
          if (e.isPrimary === false) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          const handle = e.target;
          this.resizeDirection = handle.getAttribute("data-direction");
          this.activePointerId = e.pointerId;
          this.activePointerType = e.pointerType;
          try {
            (_b = (_a = e.currentTarget) == null ? void 0 : _a.setPointerCapture) == null ? void 0 : _b.call(_a, e.pointerId);
          } catch (e2) {
          }
          this.startResizing(e.clientX, e.clientY);
        }
        onResizeHandleMouseDown(e) {
          var _a, _b, _c, _d;
          e.preventDefault();
          e.stopPropagation();
          const handle = e.target;
          this.resizeDirection = handle.getAttribute("data-direction");
          const clientX = e.clientX || ((_b = (_a = e.touches) == null ? void 0 : _a[0]) == null ? void 0 : _b.clientX);
          const clientY = e.clientY || ((_d = (_c = e.touches) == null ? void 0 : _c[0]) == null ? void 0 : _d.clientY);
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
            newCssText += "left: ".concat(targetLeft, "px; top: ").concat(targetTop, "px; right: auto; bottom: auto; transform: none");
            this.element.style.cssText = newCssText;
          }
          const finalRect = this.element.getBoundingClientRect();
          this.dragOffsetX = clientX - finalRect.left;
          this.dragOffsetY = clientY - finalRect.top;
          this.isDragging = true;
          this.element.classList.add("".concat(this.options.classPrefix, "-dragging"));
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
          this.element.style.left = "".concat(newX, "px");
          this.element.style.top = "".concat(newY, "px");
          if (this.options.onDrag) {
            this.options.onDrag({ x: newX, y: newY });
          }
        }
        stopDragging() {
          this.isDragging = false;
          this.element.classList.remove("".concat(this.options.classPrefix, "-dragging"));
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
          this.element.classList.add("".concat(this.options.classPrefix, "-resizing"));
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
          this.element.style.width = "".concat(newWidth, "px");
          if (!this.options.maintainAspectRatio) {
            this.element.style.height = "".concat(newHeight, "px");
          } else {
            this.element.style.height = "auto";
          }
          if (this.resizeDirection.includes("w")) {
            this.element.style.left = "".concat(newLeft, "px");
          }
          if (this.resizeDirection.includes("n") && !this.options.maintainAspectRatio) {
            this.element.style.top = "".concat(newTop, "px");
          }
          if (this.options.onResize) {
            this.options.onResize({ width: newWidth, height: newHeight, left: newLeft, top: newTop });
          }
        }
        stopResizing() {
          this.isResizing = false;
          this.resizeDirection = null;
          this.element.classList.remove("".concat(this.options.classPrefix, "-resizing"));
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
          this.element.classList.add("".concat(this.options.classPrefix, "-keyboard-drag"));
          this.element.classList.remove("".concat(this.options.classPrefix, "-keyboard-resize"));
          this.focusElement();
        }
        disableKeyboardDragMode() {
          this.keyboardDragMode = false;
          this.element.classList.remove("".concat(this.options.classPrefix, "-keyboard-drag"));
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
          this.element.classList.add("".concat(this.options.classPrefix, "-keyboard-resize"));
          this.element.classList.remove("".concat(this.options.classPrefix, "-keyboard-drag"));
          this.focusElement();
        }
        disableKeyboardResizeMode() {
          this.keyboardResizeMode = false;
          this.element.classList.remove("".concat(this.options.classPrefix, "-keyboard-resize"));
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
          this.element.classList.add("".concat(this.options.classPrefix, "-resizable"));
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
          this.element.classList.remove("".concat(this.options.classPrefix, "-resizable"));
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
            this.element.style.left = "".concat(currentLeft, "px");
            this.element.style.top = "".concat(currentTop, "px");
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
          this.element.style.left = "".concat(newX, "px");
          this.element.style.top = "".concat(newY, "px");
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
          this.element.style.width = "".concat(width, "px");
          if (!this.options.maintainAspectRatio) {
            this.element.style.height = "".concat(height, "px");
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
            "".concat(this.options.classPrefix, "-dragging"),
            "".concat(this.options.classPrefix, "-resizing"),
            "".concat(this.options.classPrefix, "-keyboard-drag"),
            "".concat(this.options.classPrefix, "-keyboard-resize")
          );
        }
      };
    }
  });

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
      className: hasTextClass ? "".concat(classPrefix, "-settings-text") : void 0,
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
  var init_MenuUtils = __esm({
    "src/utils/MenuUtils.js"() {
      init_DOMUtils();
      init_Icons();
      init_i18n();
      init_FocusUtils();
    }
  });

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
  var init_FormUtils = __esm({
    "src/utils/FormUtils.js"() {
      init_DOMUtils();
      init_i18n();
    }
  });

  // src/controls/TranscriptManager.js
  var TranscriptManager_exports = {};
  __export(TranscriptManager_exports, {
    TranscriptManager: () => TranscriptManager
  });
  var TranscriptManager;
  var init_TranscriptManager = __esm({
    "src/controls/TranscriptManager.js"() {
      init_DOMUtils();
      init_TimeUtils();
      init_Icons();
      init_i18n();
      init_StorageManager();
      init_FocusUtils();
      init_MenuUtils();
      init_DraggableResizable();
      init_FormUtils();
      TranscriptManager = class {
        constructor(player) {
          var _a, _b;
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
          this.autoscrollEnabled = (savedPreferences == null ? void 0 : savedPreferences.autoscroll) !== void 0 ? savedPreferences.autoscroll : true;
          this.showTimestamps = (savedPreferences == null ? void 0 : savedPreferences.showTimestamps) !== void 0 ? savedPreferences.showTimestamps : false;
          this.transcriptStyle = {
            fontSize: (savedPreferences == null ? void 0 : savedPreferences.fontSize) || this.player.options.transcriptFontSize || "100%",
            fontFamily: (savedPreferences == null ? void 0 : savedPreferences.fontFamily) || this.player.options.transcriptFontFamily || "sans-serif",
            color: (savedPreferences == null ? void 0 : savedPreferences.color) || this.player.options.transcriptColor || "#ffffff",
            backgroundColor: (savedPreferences == null ? void 0 : savedPreferences.backgroundColor) || this.player.options.transcriptBackgroundColor || "#1e1e1e",
            opacity: (_b = (_a = savedPreferences == null ? void 0 : savedPreferences.opacity) != null ? _a : this.player.options.transcriptOpacity) != null ? _b : 0.98
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
              const isMobile2 = window.innerWidth < 768;
              if (isMobile2) {
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
          var _a, _b;
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
            const transcriptButton = (_b = (_a = this.player.controlBar) == null ? void 0 : _a.controls) == null ? void 0 : _b.transcript;
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
            className: "".concat(this.player.options.classPrefix, "-transcript-window"),
            attributes: {
              "role": "dialog",
              "aria-label": i18n.t("transcript.ariaLabel"),
              "tabindex": "-1"
            }
          });
          this.transcriptHeader = DOMUtils.createElement("div", {
            className: "".concat(this.player.options.classPrefix, "-transcript-header"),
            attributes: {
              "tabindex": "0"
            }
          });
          this.headerLeft = DOMUtils.createElement("div", {
            className: "".concat(this.player.options.classPrefix, "-transcript-header-left")
          });
          const settingsAriaLabel = i18n.t("transcript.settingsMenu");
          this.settingsButton = DOMUtils.createElement("button", {
            className: "".concat(this.player.options.classPrefix, "-transcript-settings"),
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
            textContent: "".concat(i18n.t("transcript.title"), ". ").concat(i18n.t("transcript.dragResizePrompt"))
          });
          const autoscrollId = "".concat(this.player.options.classPrefix, "-transcript-autoscroll-").concat(Date.now());
          const autoscrollLabel = DOMUtils.createElement("label", {
            className: "".concat(this.player.options.classPrefix, "-transcript-autoscroll-label"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-autoscroll-text")
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
          const selectId = "".concat(this.player.options.classPrefix, "-transcript-language-select-").concat(Date.now());
          const { label: languageLabel, select: languageSelector } = createLabeledSelect({
            classPrefix: this.player.options.classPrefix,
            labelClass: "".concat(this.player.options.classPrefix, "-transcript-language-label"),
            selectClass: "".concat(this.player.options.classPrefix, "-transcript-language-select"),
            labelText: "settings.language",
            selectId,
            hidden: false
            // Don't hide individual elements, we'll hide the wrapper instead
          });
          this.languageLabel = languageLabel;
          this.languageSelector = languageSelector;
          const languageSelectorWrapper = DOMUtils.createElement("div", {
            className: "".concat(this.player.options.classPrefix, "-transcript-language-wrapper"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-close"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-content")
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
              className: "".concat(this.player.options.classPrefix, "-transcript-resize-handle ").concat(this.player.options.classPrefix, "-transcript-resize-").concat(direction),
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
          const isMobile2 = window.innerWidth < 768;
          const videoRect = this.player.videoWrapper.getBoundingClientRect();
          const isFullscreen = this.player.state.fullscreen;
          if (isMobile2 && !isFullscreen) {
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
            this.transcriptWindow.style.width = "".concat(fullscreenWidth, "px");
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
            this.transcriptWindow.style.left = "".concat(left, "px");
            this.transcriptWindow.style.right = "auto";
            this.transcriptWindow.style.bottom = "auto";
            this.transcriptWindow.style.top = "0";
            this.transcriptWindow.style.height = "".concat(appliedHeight, "px");
            this.transcriptWindow.style.maxHeight = "none";
            this.transcriptWindow.style.width = "".concat(appliedWidth, "px");
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
              className: "".concat(this.player.options.classPrefix, "-transcript-loading"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-entry ").concat(this.player.options.classPrefix, "-transcript-").concat(type),
            attributes: {
              "tabindex": "0",
              "data-start": String(cue.startTime),
              "data-end": String(cue.endTime),
              "data-type": type
            }
          });
          const timestamp = DOMUtils.createElement("span", {
            className: "".concat(this.player.options.classPrefix, "-transcript-time"),
            textContent: TimeUtils.formatTime(cue.startTime),
            attributes: {
              "aria-hidden": "true"
              // Hide from screen readers - decorative timestamp
            }
          });
          const text = DOMUtils.createElement("span", {
            className: "".concat(this.player.options.classPrefix, "-transcript-text"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-empty"),
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
                "".concat(this.player.options.classPrefix, "-transcript-entry-active")
              );
            }
            activeEntry.element.classList.add(
              "".concat(this.player.options.classPrefix, "-transcript-entry-active")
            );
            this.scrollToEntry(activeEntry.element);
            this.currentActiveEntry = activeEntry;
          } else if (!activeEntry && this.currentActiveEntry) {
            this.currentActiveEntry.element.classList.remove(
              "".concat(this.player.options.classPrefix, "-transcript-entry-active")
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
          const isMobile2 = window.innerWidth < 768;
          const isFullscreen = this.player.state.fullscreen;
          if (isMobile2 && !isFullscreen) {
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
            classPrefix: "".concat(this.player.options.classPrefix, "-transcript"),
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
                ".".concat(this.player.options.classPrefix, "-transcript-close"),
                ".".concat(this.player.options.classPrefix, "-transcript-settings"),
                ".".concat(this.player.options.classPrefix, "-transcript-language-select"),
                ".".concat(this.player.options.classPrefix, "-transcript-language-label"),
                ".".concat(this.player.options.classPrefix, "-transcript-settings-menu"),
                ".".concat(this.player.options.classPrefix, "-transcript-style-dialog")
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
              const menuItems = this.settingsMenu.querySelectorAll(".".concat(this.player.options.classPrefix, "-transcript-settings-item"));
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
            className: "".concat(this.player.options.classPrefix, "-transcript-settings-menu"),
            attributes: {
              "role": "menu"
            }
          });
          const keyboardDragOption = createMenuItem({
            classPrefix: this.player.options.classPrefix,
            itemClass: "".concat(this.player.options.classPrefix, "-transcript-settings-item"),
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
          const dragTooltip = keyboardDragOption.querySelector(".".concat(this.player.options.classPrefix, "-tooltip"));
          if (dragTooltip) dragTooltip.remove();
          const dragButtonText = keyboardDragOption.querySelector(".".concat(this.player.options.classPrefix, "-button-text"));
          if (dragButtonText) dragButtonText.remove();
          this.dragOptionButton = keyboardDragOption;
          this.dragOptionText = keyboardDragOption.querySelector(".".concat(this.player.options.classPrefix, "-settings-text"));
          this.updateDragOptionState();
          const styleOption = createMenuItem({
            classPrefix: this.player.options.classPrefix,
            itemClass: "".concat(this.player.options.classPrefix, "-transcript-settings-item"),
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
          const styleTooltip = styleOption.querySelector(".".concat(this.player.options.classPrefix, "-tooltip"));
          if (styleTooltip) styleTooltip.remove();
          const styleButtonText = styleOption.querySelector(".".concat(this.player.options.classPrefix, "-button-text"));
          if (styleButtonText) styleButtonText.remove();
          const resizeOption = createMenuItem({
            classPrefix: this.player.options.classPrefix,
            itemClass: "".concat(this.player.options.classPrefix, "-transcript-settings-item"),
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
          const resizeTooltip = resizeOption.querySelector(".".concat(this.player.options.classPrefix, "-tooltip"));
          if (resizeTooltip) resizeTooltip.remove();
          const resizeButtonText = resizeOption.querySelector(".".concat(this.player.options.classPrefix, "-button-text"));
          if (resizeButtonText) resizeButtonText.remove();
          this.resizeOptionButton = resizeOption;
          this.resizeOptionText = resizeOption.querySelector(".".concat(this.player.options.classPrefix, "-settings-text"));
          this.updateResizeOptionState();
          const showTimestampsOption = createMenuItem({
            classPrefix: this.player.options.classPrefix,
            itemClass: "".concat(this.player.options.classPrefix, "-transcript-settings-item"),
            icon: "clock",
            label: "transcript.showTimestamps",
            hasTextClass: true,
            onClick: () => {
              this.toggleShowTimestamps();
            }
          });
          showTimestampsOption.setAttribute("role", "switch");
          showTimestampsOption.setAttribute("aria-checked", this.showTimestamps ? "true" : "false");
          const timestampsTooltip = showTimestampsOption.querySelector(".".concat(this.player.options.classPrefix, "-tooltip"));
          if (timestampsTooltip) timestampsTooltip.remove();
          const timestampsButtonText = showTimestampsOption.querySelector(".".concat(this.player.options.classPrefix, "-button-text"));
          if (timestampsButtonText) timestampsButtonText.remove();
          this.showTimestampsButton = showTimestampsOption;
          this.showTimestampsText = showTimestampsOption.querySelector(".".concat(this.player.options.classPrefix, "-settings-text"));
          this.updateShowTimestampsState();
          const closeOption = createMenuItem({
            classPrefix: this.player.options.classPrefix,
            itemClass: "".concat(this.player.options.classPrefix, "-transcript-settings-item"),
            icon: "close",
            label: "transcript.closeMenu",
            onClick: () => {
              this.hideSettingsMenu();
            }
          });
          const closeTooltip = closeOption.querySelector(".".concat(this.player.options.classPrefix, "-tooltip"));
          if (closeTooltip) closeTooltip.remove();
          const closeButtonText = closeOption.querySelector(".".concat(this.player.options.classPrefix, "-button-text"));
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
            ".".concat(this.player.options.classPrefix, "-transcript-settings-item"),
            () => this.hideSettingsMenu({ focusButton: true })
          );
          this.settingsMenuVisible = true;
          this.settingsMenu.style.display = "block";
          if (this.settingsButton) {
            this.settingsButton.setAttribute("aria-expanded", "true");
          }
          this.updateResizeOptionState();
          setTimeout(() => {
            const menuItems = this.settingsMenu.querySelectorAll(".".concat(this.player.options.classPrefix, "-transcript-settings-item"));
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
          this.settingsMenu.style.top = "".concat(menuTop, "px");
          this.settingsMenu.style.left = "".concat(buttonLeft, "px");
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
            ".".concat(this.player.options.classPrefix, "-transcript-settings-item"),
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
          this.transcriptWindow.classList.add("".concat(this.player.options.classPrefix, "-transcript-move-mode"));
          const tooltip = DOMUtils.createElement("div", {
            className: "".concat(this.player.options.classPrefix, "-transcript-move-tooltip"),
            textContent: "Drag with mouse or press D for keyboard drag mode"
          });
          this.transcriptHeader.appendChild(tooltip);
          setTimeout(() => {
            this.transcriptWindow.classList.remove("".concat(this.player.options.classPrefix, "-transcript-move-mode"));
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
          const timestamps = this.transcriptContent.querySelectorAll(".".concat(this.player.options.classPrefix, "-transcript-time"));
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
            className: "".concat(this.player.options.classPrefix, "-transcript-resize-tooltip"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-style-dialog")
          });
          const title = DOMUtils.createElement("h4", {
            textContent: i18n.t("transcript.styleTitle"),
            className: "".concat(this.player.options.classPrefix, "-transcript-style-title")
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
            className: "".concat(this.player.options.classPrefix, "-transcript-style-close"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-style-group")
          });
          const controlId = "".concat(this.player.options.classPrefix, "-transcript-").concat(property, "-").concat(Date.now());
          const labelEl = DOMUtils.createElement("label", {
            textContent: label,
            attributes: {
              "for": controlId
            }
          });
          group.appendChild(labelEl);
          const select = DOMUtils.createElement("select", {
            className: "".concat(this.player.options.classPrefix, "-transcript-style-select"),
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
            className: "".concat(this.player.options.classPrefix, "-transcript-style-group")
          });
          const controlId = "".concat(this.player.options.classPrefix, "-transcript-").concat(property, "-").concat(Date.now());
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
            className: "".concat(this.player.options.classPrefix, "-transcript-style-color")
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
            className: "".concat(this.player.options.classPrefix, "-transcript-style-group")
          });
          const controlId = "".concat(this.player.options.classPrefix, "-transcript-").concat(property, "-").concat(Date.now());
          const labelEl = DOMUtils.createElement("label", {
            textContent: label,
            attributes: {
              "for": controlId
            }
          });
          group.appendChild(labelEl);
          const valueDisplay = DOMUtils.createElement("span", {
            textContent: Math.round(this.transcriptStyle[property] * 100) + "%",
            className: "".concat(this.player.options.classPrefix, "-transcript-style-value")
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
            className: "".concat(this.player.options.classPrefix, "-transcript-style-range")
          });
          input.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            this.transcriptStyle[property] = value;
            valueDisplay.textContent = Math.round(value * 100) + "%";
            this.applyTranscriptStyles();
            this.savePreferences();
          });
          const inputContainer = DOMUtils.createElement("div", {
            className: "".concat(this.player.options.classPrefix, "-transcript-style-range-container")
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
          const textEntries = this.transcriptWindow.querySelectorAll(".".concat(this.player.options.classPrefix, "-transcript-text"));
          textEntries.forEach((entry) => {
            entry.style.fontSize = this.transcriptStyle.fontSize;
            entry.style.fontFamily = this.transcriptStyle.fontFamily;
            entry.style.color = this.transcriptStyle.color;
          });
          const timeEntries = this.transcriptWindow.querySelectorAll(".".concat(this.player.options.classPrefix, "-transcript-time"));
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
    }
  });

  // src/renderers/YouTubeRenderer.js
  var YouTubeRenderer_exports = {};
  __export(YouTubeRenderer_exports, {
    YouTubeRenderer: () => YouTubeRenderer
  });
  var YouTubeRenderer;
  var init_YouTubeRenderer = __esm({
    "src/renderers/YouTubeRenderer.js"() {
      YouTubeRenderer = class {
        constructor(player) {
          this.player = player;
          this.youtube = null;
          this.videoId = null;
          this.isReady = false;
          this.iframe = null;
        }
        async init() {
          const src = this.player.currentSource || this.player.element.src;
          this.videoId = this.extractVideoId(src);
          if (!this.videoId) {
            throw new Error("Invalid YouTube URL");
          }
          await this.loadYouTubeAPI();
          this.createIframe();
          await this.initializePlayer();
        }
        extractVideoId(url) {
          const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
            /youtube\.com\/embed\/([^&\s]+)/
          ];
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
              return match[1];
            }
          }
          return null;
        }
        async loadYouTubeAPI() {
          if (window.YT && window.YT.Player) {
            return Promise.resolve();
          }
          return new Promise((resolve, reject) => {
            if (window.onYouTubeIframeAPIReady) {
              const originalCallback = window.onYouTubeIframeAPIReady;
              window.onYouTubeIframeAPIReady = () => {
                originalCallback();
                resolve();
              };
              return;
            }
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            window.onYouTubeIframeAPIReady = () => {
              resolve();
            };
            tag.onerror = () => reject(new Error("Failed to load YouTube API"));
            const firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          });
        }
        createIframe() {
          this.player.element.style.display = "none";
          this.iframe = document.createElement("div");
          this.iframe.id = "youtube-player-".concat(Math.random().toString(36).substr(2, 9));
          this.iframe.style.width = "100%";
          this.iframe.style.maxHeight = "100%";
          this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
        }
        async initializePlayer() {
          return new Promise((resolve) => {
            this.youtube = new window.YT.Player(this.iframe.id, {
              videoId: this.videoId,
              width: "100%",
              height: "100%",
              playerVars: {
                controls: 1,
                // Use YouTube native controls
                disablekb: 0,
                // Allow keyboard controls
                fs: 1,
                // Allow fullscreen
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                autoplay: this.player.options.autoplay ? 1 : 0,
                mute: this.player.options.muted ? 1 : 0,
                start: this.player.options.startTime || 0
              },
              events: {
                onReady: (event) => {
                  this.isReady = true;
                  this.attachEvents();
                  if (this.player.container) {
                    this.player.container.classList.add("vidply-external-controls");
                  }
                  resolve();
                },
                onStateChange: (event) => this.handleStateChange(event),
                onError: (event) => this.handleError(event)
              }
            });
          });
        }
        attachEvents() {
          this.timeUpdateInterval = setInterval(() => {
            if (this.isReady && this.youtube) {
              const currentTime = this.youtube.getCurrentTime();
              const duration = this.youtube.getDuration();
              this.player.state.currentTime = currentTime;
              this.player.state.duration = duration;
              this.player.emit("timeupdate", currentTime);
            }
          }, 250);
          if (this.youtube.getDuration) {
            this.player.state.duration = this.youtube.getDuration();
            this.player.emit("loadedmetadata");
          }
        }
        handleStateChange(event) {
          const states = window.YT.PlayerState;
          switch (event.data) {
            case states.PLAYING:
              this.player.state.playing = true;
              this.player.state.paused = false;
              this.player.state.ended = false;
              this.player.state.buffering = false;
              this.player.emit("play");
              this.player.emit("playing");
              if (this.player.options.onPlay) {
                this.player.options.onPlay.call(this.player);
              }
              break;
            case states.PAUSED:
              this.player.state.playing = false;
              this.player.state.paused = true;
              this.player.emit("pause");
              if (this.player.options.onPause) {
                this.player.options.onPause.call(this.player);
              }
              break;
            case states.ENDED:
              this.player.state.playing = false;
              this.player.state.paused = true;
              this.player.state.ended = true;
              this.player.emit("ended");
              if (this.player.options.onEnded) {
                this.player.options.onEnded.call(this.player);
              }
              if (this.player.options.loop) {
                this.youtube.seekTo(0);
                this.youtube.playVideo();
              }
              break;
            case states.BUFFERING:
              this.player.state.buffering = true;
              this.player.emit("waiting");
              break;
            case states.CUED:
              this.player.emit("loadedmetadata");
              break;
          }
        }
        handleError(event) {
          const errors = {
            2: "Invalid video ID",
            5: "HTML5 player error",
            100: "Video not found",
            101: "Video not allowed to be played in embedded players",
            150: "Video not allowed to be played in embedded players"
          };
          const error = new Error(errors[event.data] || "YouTube player error");
          this.player.handleError(error);
        }
        play() {
          if (this.isReady && this.youtube) {
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            this.youtube.playVideo();
            window.scrollTo(scrollX, scrollY);
          }
        }
        pause() {
          if (this.isReady && this.youtube) {
            this.youtube.pauseVideo();
          }
        }
        seek(time) {
          if (this.isReady && this.youtube) {
            this.youtube.seekTo(time, true);
          }
        }
        setVolume(volume) {
          if (this.isReady && this.youtube) {
            this.youtube.setVolume(volume * 100);
            this.player.state.volume = volume;
          }
        }
        setMuted(muted) {
          if (this.isReady && this.youtube) {
            if (muted) {
              this.youtube.mute();
            } else {
              this.youtube.unMute();
            }
            this.player.state.muted = muted;
          }
        }
        setPlaybackSpeed(speed) {
          if (this.isReady && this.youtube) {
            this.youtube.setPlaybackRate(speed);
            this.player.state.playbackSpeed = speed;
          }
        }
        destroy() {
          if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
          }
          if (this.youtube && this.youtube.destroy) {
            this.youtube.destroy();
          }
          if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
          }
          if (this.player.element) {
            this.player.element.style.display = "";
          }
        }
      };
    }
  });

  // src/renderers/VimeoRenderer.js
  var VimeoRenderer_exports = {};
  __export(VimeoRenderer_exports, {
    VimeoRenderer: () => VimeoRenderer
  });
  var VimeoRenderer;
  var init_VimeoRenderer = __esm({
    "src/renderers/VimeoRenderer.js"() {
      VimeoRenderer = class {
        constructor(player) {
          this.player = player;
          this.vimeo = null;
          this.videoId = null;
          this.isReady = false;
          this.iframe = null;
        }
        async init() {
          const src = this.player.currentSource || this.player.element.src;
          this.videoId = this.extractVideoId(src);
          if (!this.videoId) {
            throw new Error("Invalid Vimeo URL");
          }
          await this.loadVimeoAPI();
          this.createIframe();
          await this.initializePlayer();
        }
        extractVideoId(url) {
          const patterns = [
            /vimeo\.com\/(\d+)/,
            /vimeo\.com\/video\/(\d+)/,
            /player\.vimeo\.com\/video\/(\d+)/
          ];
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
              return match[1];
            }
          }
          return null;
        }
        async loadVimeoAPI() {
          if (window.Vimeo && window.Vimeo.Player) {
            return Promise.resolve();
          }
          return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://player.vimeo.com/api/player.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Vimeo API"));
            document.head.appendChild(script);
          });
        }
        createIframe() {
          this.player.element.style.display = "none";
          this.iframe = document.createElement("div");
          this.iframe.id = "vimeo-player-".concat(Math.random().toString(36).substr(2, 9));
          this.iframe.style.width = "100%";
          this.iframe.style.maxHeight = "100%";
          this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
        }
        async initializePlayer() {
          const options = {
            id: this.videoId,
            width: "100%",
            height: "100%",
            controls: true,
            // Use Vimeo native controls
            autoplay: this.player.options.autoplay,
            muted: this.player.options.muted,
            loop: this.player.options.loop,
            keyboard: false
          };
          if (this.player.options.startTime > 0) {
            options.startTime = this.player.options.startTime;
          }
          this.vimeo = new window.Vimeo.Player(this.iframe.id, options);
          await this.vimeo.ready();
          this.isReady = true;
          const vimeoIframe = this.iframe.querySelector("iframe");
          if (vimeoIframe) {
            vimeoIframe.style.width = "100%";
            vimeoIframe.style.height = "100%";
            vimeoIframe.setAttribute("width", "100%");
            vimeoIframe.setAttribute("height", "100%");
          }
          if (this.player.container) {
            this.player.container.classList.add("vidply-external-controls");
          }
          this.attachEvents();
          try {
            const duration = await this.vimeo.getDuration();
            this.player.state.duration = duration;
            this.player.emit("loadedmetadata");
          } catch (error) {
            this.player.log("Error getting duration:", error, "warn");
          }
        }
        attachEvents() {
          this.vimeo.on("play", () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
          });
          this.vimeo.on("pause", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          });
          this.vimeo.on("ended", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.state.ended = true;
            this.player.emit("ended");
            if (this.player.options.onEnded) {
              this.player.options.onEnded.call(this.player);
            }
          });
          this.vimeo.on("timeupdate", (data) => {
            this.player.state.currentTime = data.seconds;
            this.player.state.duration = data.duration;
            this.player.emit("timeupdate", data.seconds);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, data.seconds);
            }
          });
          this.vimeo.on("volumechange", (data) => {
            this.player.state.volume = data.volume;
            this.player.emit("volumechange", data.volume);
          });
          this.vimeo.on("bufferstart", () => {
            this.player.state.buffering = true;
            this.player.emit("waiting");
          });
          this.vimeo.on("bufferend", () => {
            this.player.state.buffering = false;
            this.player.emit("canplay");
          });
          this.vimeo.on("seeking", () => {
            this.player.state.seeking = true;
            this.player.emit("seeking");
          });
          this.vimeo.on("seeked", () => {
            this.player.state.seeking = false;
            this.player.emit("seeked");
          });
          this.vimeo.on("playbackratechange", (data) => {
            this.player.state.playbackSpeed = data.playbackRate;
            this.player.emit("ratechange", data.playbackRate);
          });
          this.vimeo.on("error", (error) => {
            this.player.handleError(new Error("Vimeo error: ".concat(error.message)));
          });
        }
        play() {
          if (this.isReady && this.vimeo) {
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            this.vimeo.play().catch((error) => {
              this.player.log("Play error:", error, "warn");
            });
            window.scrollTo(scrollX, scrollY);
          }
        }
        pause() {
          if (this.isReady && this.vimeo) {
            this.vimeo.pause().catch((error) => {
              this.player.log("Pause error:", error, "warn");
            });
          }
        }
        seek(time) {
          if (this.isReady && this.vimeo) {
            this.vimeo.setCurrentTime(time).catch((error) => {
              this.player.log("Seek error:", error, "warn");
            });
          }
        }
        setVolume(volume) {
          if (this.isReady && this.vimeo) {
            this.vimeo.setVolume(volume).catch((error) => {
              this.player.log("Volume error:", error, "warn");
            });
            this.player.state.volume = volume;
          }
        }
        setMuted(muted) {
          if (this.isReady && this.vimeo) {
            if (muted) {
              this.vimeo.setVolume(0);
            } else {
              this.vimeo.setVolume(this.player.state.volume);
            }
            this.player.state.muted = muted;
          }
        }
        setPlaybackSpeed(speed) {
          if (this.isReady && this.vimeo) {
            this.vimeo.setPlaybackRate(speed).catch((error) => {
              this.player.log("Playback rate error:", error, "warn");
            });
            this.player.state.playbackSpeed = speed;
          }
        }
        destroy() {
          if (this.vimeo && this.vimeo.destroy) {
            this.vimeo.destroy();
          }
          if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
          }
          if (this.player.element) {
            this.player.element.style.display = "";
          }
        }
      };
    }
  });

  // src/renderers/HLSRenderer.js
  var HLSRenderer_exports = {};
  __export(HLSRenderer_exports, {
    HLSRenderer: () => HLSRenderer
  });
  var HLSRenderer;
  var init_HLSRenderer = __esm({
    "src/renderers/HLSRenderer.js"() {
      HLSRenderer = class {
        constructor(player) {
          this.player = player;
          this.media = player.element;
          this.hls = null;
          this._hlsSourceLoaded = false;
          this._pendingSrc = null;
        }
        async init() {
          if (this.canPlayNatively()) {
            this.player.log("Using native HLS support");
            await this.initNative();
          } else {
            this.player.log("Using hls.js for HLS support");
            await this.initHlsJs();
          }
        }
        canPlayNatively() {
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          if (!isSafari && !isIOS) {
            return false;
          }
          const video = document.createElement("video");
          return video.canPlayType("application/vnd.apple.mpegurl") !== "";
        }
        async initNative() {
          const HTML5Renderer2 = (await Promise.resolve().then(() => (init_HTML5Renderer(), HTML5Renderer_exports))).HTML5Renderer;
          const renderer = new HTML5Renderer2(this.player);
          await renderer.init();
          Object.getOwnPropertyNames(Object.getPrototypeOf(renderer)).forEach((method) => {
            if (method !== "constructor" && typeof renderer[method] === "function") {
              this[method] = renderer[method].bind(renderer);
            }
          });
        }
        async initHlsJs() {
          this.media.controls = false;
          this.media.removeAttribute("controls");
          if (!window.Hls) {
            await this.loadHlsJs();
          }
          if (!window.Hls.isSupported()) {
            throw new Error("HLS is not supported in this browser");
          }
          this.hls = new window.Hls({
            debug: this.player.options.debug,
            // When deferLoad is enabled, do not start loading until the first play().
            autoStartLoad: !this.player.options.deferLoad,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1e3 * 1e3,
            maxBufferHole: 0.5,
            // Network retry settings
            manifestLoadingTimeOut: 1e4,
            manifestLoadingMaxRetry: 4,
            manifestLoadingRetryDelay: 1e3,
            manifestLoadingMaxRetryTimeout: 64e3,
            levelLoadingTimeOut: 1e4,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 1e3,
            levelLoadingMaxRetryTimeout: 64e3,
            fragLoadingTimeOut: 2e4,
            fragLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 1e3,
            fragLoadingMaxRetryTimeout: 64e3
          });
          this.hls.attachMedia(this.media);
          let src = this.player.currentSource;
          if (!src) {
            const sourceElement = this.player.element.querySelector("source");
            if (sourceElement) {
              src = sourceElement.getAttribute("src");
            } else {
              src = this.player.element.getAttribute("src") || this.player.element.src;
            }
          }
          this.player.log("Loading HLS source: ".concat(src), "log");
          if (!src) {
            throw new Error("No HLS source found");
          }
          if (this.player.options.deferLoad) {
            this._pendingSrc = src;
          } else {
            this.hls.loadSource(src);
            this._hlsSourceLoaded = true;
          }
          this.attachHlsEvents();
          this.attachMediaEvents();
        }
        async loadHlsJs() {
          return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load hls.js"));
            document.head.appendChild(script);
          });
        }
        attachHlsEvents() {
          this.hls.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
            this.player.log("HLS manifest loaded, found " + data.levels.length + " quality levels");
            this.player.emit("hlsmanifestparsed", data);
            if (this.player.container) {
              this.player.container.classList.remove("vidply-external-controls");
            }
          });
          this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
            this.player.log("HLS level switched to " + data.level);
            this.player.emit("hlslevelswitched", data);
          });
          this.hls.on(window.Hls.Events.ERROR, (event, data) => {
            this.handleHlsError(data);
          });
          this.hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
            this.player.state.buffering = false;
          });
        }
        attachMediaEvents() {
          this.media.addEventListener("loadedmetadata", () => {
            this.player.state.duration = this.media.duration;
            this.player.emit("loadedmetadata");
          });
          this.media.addEventListener("play", () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
          });
          this.media.addEventListener("pause", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          });
          this.media.addEventListener("ended", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.state.ended = true;
            this.player.emit("ended");
            if (this.player.options.onEnded) {
              this.player.options.onEnded.call(this.player);
            }
            if (this.player.options.loop) {
              this.player.seek(0);
              this.player.play();
            }
          });
          this.media.addEventListener("timeupdate", () => {
            this.player.state.currentTime = this.media.currentTime;
            this.player.emit("timeupdate", this.media.currentTime);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
            }
          });
          this.media.addEventListener("volumechange", () => {
            this.player.state.volume = this.media.volume;
            this.player.state.muted = this.media.muted;
            this.player.emit("volumechange", this.media.volume);
          });
          this.media.addEventListener("waiting", () => {
            this.player.state.buffering = true;
            this.player.emit("waiting");
          });
          this.media.addEventListener("canplay", () => {
            this.player.state.buffering = false;
            this.player.emit("canplay");
          });
          this.media.addEventListener("error", () => {
            this.player.handleError(this.media.error);
          });
        }
        handleHlsError(data) {
          this.player.log("HLS Error - Type: ".concat(data.type, ", Details: ").concat(data.details, ", Fatal: ").concat(data.fatal), "warn");
          if (data.response) {
            this.player.log("Response code: ".concat(data.response.code, ", URL: ").concat(data.response.url), "warn");
          }
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                this.player.log("Fatal network error, trying to recover...", "error");
                this.player.log("Network error details: ".concat(data.details), "error");
                setTimeout(() => {
                  this.hls.startLoad();
                }, 1e3);
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                this.player.log("Fatal media error, trying to recover...", "error");
                this.hls.recoverMediaError();
                break;
              default:
                this.player.log("Fatal error, cannot recover", "error");
                this.player.handleError(new Error("HLS Error: ".concat(data.type, " - ").concat(data.details)));
                this.hls.destroy();
                break;
            }
          } else {
            this.player.log("Non-fatal HLS error: " + data.details, "warn");
          }
        }
        /**
         * Ensure the HLS manifest/initial loading is started without starting playback.
         * This makes playlist selection behave more like single-video initialization.
         */
        ensureLoaded() {
          if (!this.player.options.deferLoad) {
            return;
          }
          if (!this.hls) {
            return;
          }
          if (this._hlsSourceLoaded) {
            return;
          }
          const src = this._pendingSrc || this.player._pendingSource || this.player.currentSource;
          if (!src) {
            return;
          }
          try {
            this.hls.loadSource(src);
            this._hlsSourceLoaded = true;
            this.hls.startLoad();
          } catch (e) {
          }
        }
        play() {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          if (this.player.options.deferLoad && this.hls && !this._hlsSourceLoaded) {
            const src = this._pendingSrc || this.player.currentSource;
            if (src) {
              try {
                this.hls.loadSource(src);
                this.hls.startLoad();
                this._hlsSourceLoaded = true;
              } catch (e) {
              }
            }
          }
          const promise = this.media.play();
          window.scrollTo(scrollX, scrollY);
          if (promise !== void 0) {
            promise.catch((error) => {
              this.player.log("Play failed:", error, "warn");
            });
          }
        }
        pause() {
          this.media.pause();
        }
        seek(time) {
          this.media.currentTime = time;
        }
        setVolume(volume) {
          this.media.volume = volume;
        }
        setMuted(muted) {
          this.media.muted = muted;
        }
        setPlaybackSpeed(speed) {
          this.media.playbackRate = speed;
        }
        switchQuality(levelIndex) {
          if (this.hls) {
            this.hls.currentLevel = levelIndex;
          }
        }
        getQualities() {
          if (this.hls && this.hls.levels) {
            return this.hls.levels.map((level, index) => {
              const height = Number(level.height) || 0;
              const bitrate = Number(level.bitrate) || 0;
              const kb = bitrate > 0 ? Math.round(bitrate / 1e3) : 0;
              const name = height > 0 ? "".concat(height, "p") : kb > 0 ? "".concat(kb, " kb") : "Auto";
              return {
                index,
                height: level.height,
                width: level.width,
                bitrate: level.bitrate,
                name
              };
            });
          }
          return [];
        }
        getCurrentQuality() {
          if (this.hls) {
            return this.hls.currentLevel;
          }
          return -1;
        }
        destroy() {
          if (this.hls) {
            this.hls.destroy();
            this.hls = null;
          }
        }
      };
    }
  });

  // src/renderers/SoundCloudRenderer.js
  var SoundCloudRenderer_exports = {};
  __export(SoundCloudRenderer_exports, {
    SoundCloudRenderer: () => SoundCloudRenderer,
    default: () => SoundCloudRenderer_default
  });
  var SoundCloudRenderer, SoundCloudRenderer_default;
  var init_SoundCloudRenderer = __esm({
    "src/renderers/SoundCloudRenderer.js"() {
      SoundCloudRenderer = class {
        constructor(player) {
          this.player = player;
          this.widget = null;
          this.trackUrl = null;
          this.isReady = false;
          this.iframe = null;
          this.iframeId = null;
        }
        async init() {
          var _a;
          this.trackUrl = this.player.currentSource || this.player.element.src || ((_a = this.player.element.querySelector("source")) == null ? void 0 : _a.src);
          if (!this.trackUrl || !this.isValidSoundCloudUrl(this.trackUrl)) {
            throw new Error("Invalid SoundCloud URL");
          }
          await this.loadSoundCloudAPI();
          this.createIframe();
          await this.initializeWidget();
        }
        /**
         * Validate SoundCloud URL
         * @param {string} url 
         * @returns {boolean}
         */
        isValidSoundCloudUrl(url) {
          return url.includes("soundcloud.com") || url.includes("api.soundcloud.com");
        }
        /**
         * Check if URL is a playlist/set
         */
        isPlaylist() {
          return this.trackUrl && this.trackUrl.includes("/sets/");
        }
        /**
         * Extract track/playlist info from URL for embed
         * SoundCloud URLs can be:
         * - https://soundcloud.com/artist/track
         * - https://soundcloud.com/artist/sets/playlist
         * - https://api.soundcloud.com/tracks/123456
         */
        getEmbedUrl() {
          const encodedUrl = encodeURIComponent(this.trackUrl);
          const params = new URLSearchParams({
            url: this.trackUrl,
            auto_play: this.player.options.autoplay ? "true" : "false",
            hide_related: "true",
            show_comments: "false",
            show_user: "true",
            show_reposts: "false",
            show_teaser: "false",
            visual: "false",
            // Use classic player for better control
            color: "%23007bff"
          });
          return "https://w.soundcloud.com/player/?".concat(params.toString());
        }
        async loadSoundCloudAPI() {
          if (window.SC && window.SC.Widget) {
            return Promise.resolve();
          }
          return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://w.soundcloud.com/player/api.js";
            script.onload = () => {
              setTimeout(() => {
                if (window.SC && window.SC.Widget) {
                  resolve();
                } else {
                  reject(new Error("SoundCloud Widget API not available"));
                }
              }, 100);
            };
            script.onerror = () => reject(new Error("Failed to load SoundCloud Widget API"));
            document.head.appendChild(script);
          });
        }
        createIframe() {
          this.player.element.style.display = "none";
          this.player.element.removeAttribute("poster");
          if (this.player.videoWrapper) {
            this.player.videoWrapper.classList.remove("vidply-forced-poster");
            this.player.videoWrapper.style.removeProperty("--vidply-poster-image");
          }
          this.iframeId = "soundcloud-player-".concat(Math.random().toString(36).substr(2, 9));
          this.iframe = document.createElement("iframe");
          this.iframe.id = this.iframeId;
          this.iframe.scrolling = "no";
          this.iframe.frameBorder = "no";
          this.iframe.allow = "autoplay";
          this.iframe.src = this.getEmbedUrl();
          this.iframe.style.width = "100%";
          this.iframe.style.display = "block";
          if (this.isPlaylist()) {
            this.iframe.classList.add("vidply-soundcloud-iframe", "vidply-soundcloud-playlist");
          } else {
            this.iframe.classList.add("vidply-soundcloud-iframe");
          }
          this.iframe.style.maxHeight = "100%";
          this.player.element.parentNode.insertBefore(this.iframe, this.player.element);
        }
        async initializeWidget() {
          return new Promise((resolve, reject) => {
            this.iframe.addEventListener("load", () => {
              try {
                this.widget = window.SC.Widget(this.iframe);
                this.widget.bind(window.SC.Widget.Events.READY, () => {
                  this.isReady = true;
                  this.attachEvents();
                  if (this.player.container) {
                    this.player.container.classList.add("vidply-external-controls");
                  }
                  this.widget.getCurrentSound((sound) => {
                    if (sound) {
                      this.player.state.duration = sound.duration / 1e3;
                      this.player.emit("loadedmetadata");
                    }
                  });
                  resolve();
                });
                this.widget.bind(window.SC.Widget.Events.ERROR, (error) => {
                  this.player.handleError(new Error("SoundCloud error: ".concat(error.message || "Unknown error")));
                });
              } catch (error) {
                reject(error);
              }
            });
            setTimeout(() => {
              if (!this.isReady) {
                reject(new Error("SoundCloud widget initialization timeout"));
              }
            }, 1e4);
          });
        }
        attachEvents() {
          if (!this.widget) return;
          const Events = window.SC.Widget.Events;
          this.widget.bind(Events.PLAY, () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
          });
          this.widget.bind(Events.PAUSE, () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          });
          this.widget.bind(Events.FINISH, () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.state.ended = true;
            this.player.emit("ended");
            if (this.player.options.onEnded) {
              this.player.options.onEnded.call(this.player);
            }
            if (this.player.options.loop) {
              this.seek(0);
              this.play();
            }
          });
          this.widget.bind(Events.PLAY_PROGRESS, (data) => {
            const currentTime = data.currentPosition / 1e3;
            this.player.state.currentTime = currentTime;
            this.player.emit("timeupdate", currentTime);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, currentTime);
            }
          });
          this.widget.bind(Events.SEEK, (data) => {
            this.player.state.currentTime = data.currentPosition / 1e3;
            this.player.emit("seeked");
          });
          this.widget.bind(Events.LOAD_PROGRESS, (data) => {
            if (this.player.state.duration) {
              const buffered = data.loadedProgress * this.player.state.duration;
              this.player.emit("progress", buffered);
            }
          });
        }
        play() {
          if (this.isReady && this.widget) {
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            this.widget.play();
            window.scrollTo(scrollX, scrollY);
          }
        }
        pause() {
          if (this.isReady && this.widget) {
            this.widget.pause();
          }
        }
        seek(time) {
          if (this.isReady && this.widget) {
            this.widget.seekTo(time * 1e3);
            this.player.state.currentTime = time;
          }
        }
        setVolume(volume) {
          if (this.isReady && this.widget) {
            this.widget.setVolume(volume * 100);
            this.player.state.volume = volume;
          }
        }
        setMuted(muted) {
          if (this.isReady && this.widget) {
            if (muted) {
              this.widget.getVolume((vol) => {
                this._previousVolume = vol;
                this.widget.setVolume(0);
              });
            } else {
              this.widget.setVolume(this._previousVolume || 100);
            }
            this.player.state.muted = muted;
          }
        }
        setPlaybackSpeed(speed) {
          this.player.log("SoundCloud does not support playback speed control", "warn");
        }
        /**
         * Get current track info
         * @returns {Promise<Object>}
         */
        getCurrentSound() {
          return new Promise((resolve) => {
            if (this.isReady && this.widget) {
              this.widget.getCurrentSound((sound) => {
                resolve(sound);
              });
            } else {
              resolve(null);
            }
          });
        }
        destroy() {
          if (this.widget) {
            const Events = window.SC.Widget.Events;
            try {
              this.widget.unbind(Events.READY);
              this.widget.unbind(Events.PLAY);
              this.widget.unbind(Events.PAUSE);
              this.widget.unbind(Events.FINISH);
              this.widget.unbind(Events.PLAY_PROGRESS);
              this.widget.unbind(Events.SEEK);
              this.widget.unbind(Events.LOAD_PROGRESS);
              this.widget.unbind(Events.ERROR);
            } catch (e) {
            }
          }
          if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
          }
          if (this.player.element) {
            this.player.element.style.display = "";
          }
          this.widget = null;
          this.isReady = false;
        }
      };
      SoundCloudRenderer_default = SoundCloudRenderer;
    }
  });

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

  // src/core/Player.js
  init_DOMUtils();

  // src/controls/ControlBar.js
  init_DOMUtils();
  init_TimeUtils();
  init_Icons();
  init_i18n();
  init_FocusUtils();

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
      const isOverflowMenu = menu.classList.contains("".concat(this.player.options.classPrefix, "-overflow-menu-list"));
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
            menu.style.bottom = "".concat(containerRect.height - buttonTop + 8, "px");
            menu.style.top = "auto";
            menu.classList.remove("vidply-menu-below");
          } else {
            menu.style.top = "".concat(buttonBottom + 8, "px");
            menu.style.bottom = "auto";
            menu.classList.add("vidply-menu-below");
          }
          if (isOverflowMenu) {
            const buttonRight = buttonRect.right - containerRect.left;
            menu.style.right = "".concat(containerRect.width - buttonRight, "px");
            menu.style.left = "auto";
            menu.style.transform = "none";
          } else {
            menu.style.left = "".concat(buttonCenterX, "px");
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
        const isVolumeMenu = menu.classList.contains("".concat(this.player.options.classPrefix, "-volume-menu"));
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
            menu.style.left = "".concat(buttonCenterX, "px");
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
          menu.style.top = "".concat(menuTop, "px");
          menu.style.bottom = "auto";
        } else if (menuBottom !== null) {
          menu.style.top = "auto";
          menu.style.bottom = "".concat(menuBottom, "px");
        }
        if (menuLeft !== "auto") {
          menu.style.left = "".concat(menuLeft, "px");
          menu.style.right = "auto";
        } else {
          menu.style.left = "auto";
          menu.style.right = "".concat(menuRight, "px");
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
        menu.id = "vidply-menu-".concat(Math.random().toString(36).substr(2, 9));
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
            var _a;
            if (!blurHandlerActive || this.openMenu !== menu) {
              return;
            }
            const activeElement = document.activeElement;
            if (menu.contains(activeElement)) {
              return;
            }
            const signLanguageWrapper = this.player.signLanguageWrapper;
            const transcriptWindow = (_a = this.player.transcriptManager) == null ? void 0 : _a.transcriptWindow;
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
      const menuItems = Array.from(menu.querySelectorAll(".".concat(this.player.options.classPrefix, "-menu-item")));
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
        className: "".concat(this.player.options.classPrefix, "-controls"),
        attributes: {
          "role": "region",
          "aria-label": i18n.t("player.label") + " controls"
        }
      });
    }
    createControls() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
      const progressTimeWrapper = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-progress-time-wrapper")
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
        className: "".concat(this.player.options.classPrefix, "-controls-buttons")
      });
      const leftButtons = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-controls-left")
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
        className: "".concat(this.player.options.classPrefix, "-controls-right")
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
      const src = this.player.currentSource || ((_b = (_a = this.player.element) == null ? void 0 : _a.getAttribute) == null ? void 0 : _b.call(_a, "src")) || ((_c = this.player.element) == null ? void 0 : _c.currentSrc) || ((_d = this.player.element) == null ? void 0 : _d.src) || ((_h = (_g = (_f = (_e = this.player.element) == null ? void 0 : _e.querySelector) == null ? void 0 : _f.call(_e, "source")) == null ? void 0 : _g.getAttribute) == null ? void 0 : _h.call(_g, "src")) || ((_k = (_j = (_i = this.player.element) == null ? void 0 : _i.querySelector) == null ? void 0 : _j.call(_i, "source")) == null ? void 0 : _k.src) || "";
      const isHlsSource = typeof src === "string" && src.includes(".m3u8");
      const isVideoElement = ((_m = (_l = this.player.element) == null ? void 0 : _l.tagName) == null ? void 0 : _m.toLowerCase()) === "video";
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
        if (button.querySelector(".".concat(this.player.options.classPrefix, "-tooltip"))) {
          return;
        }
        if (button.querySelector(".".concat(this.player.options.classPrefix, "-button-text"))) {
          return;
        }
        if (button.getAttribute("role") === "menuitem" || button.classList.contains("".concat(this.player.options.classPrefix, "-settings-item")) || button.classList.contains("".concat(this.player.options.classPrefix, "-menu-item")) || button.classList.contains("".concat(this.player.options.classPrefix, "-transcript-settings-item")) || button.classList.contains("".concat(this.player.options.classPrefix, "-sign-language-settings-item")) || button.classList.contains("".concat(this.player.options.classPrefix, "-popup-settings-item"))) {
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
      var _a, _b;
      const textTracks = this.player.element.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        if (textTracks[i].kind === "chapters") return true;
      }
      const trackEls = Array.from(this.player.element.querySelectorAll('track[kind="chapters"]'));
      if (trackEls.length > 0) return true;
      const current = (_b = (_a = this.player.playlistManager) == null ? void 0 : _a.getCurrentTrack) == null ? void 0 : _b.call(_a);
      if ((current == null ? void 0 : current.tracks) && Array.isArray(current.tracks)) {
        return current.tracks.some((t) => (t == null ? void 0 : t.kind) === "chapters");
      }
      return false;
    }
    hasCaptionTracks() {
      var _a, _b;
      const textTracks = this.player.element.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        if (textTracks[i].kind === "captions" || textTracks[i].kind === "subtitles") return true;
      }
      const trackEls = Array.from(this.player.element.querySelectorAll("track"));
      if (trackEls.some((el) => el.getAttribute("kind") === "captions" || el.getAttribute("kind") === "subtitles")) {
        return true;
      }
      const current = (_b = (_a = this.player.playlistManager) == null ? void 0 : _a.getCurrentTrack) == null ? void 0 : _b.call(_a);
      if ((current == null ? void 0 : current.tracks) && Array.isArray(current.tracks)) {
        return current.tracks.some((t) => (t == null ? void 0 : t.kind) === "captions" || (t == null ? void 0 : t.kind) === "subtitles");
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
        className: "".concat(this.player.options.classPrefix, "-progress-container"),
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
        className: "".concat(this.player.options.classPrefix, "-progress-buffered")
      });
      this.controls.played = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-progress-played")
      });
      this.controls.progressHandle = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-progress-handle")
      });
      this.controls.progressTooltip = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-progress-tooltip")
      });
      this.controls.progressPreview = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-progress-preview"),
        attributes: {
          "aria-hidden": "true"
        }
      });
      this.controls.progressTooltip.appendChild(this.controls.progressPreview);
      this.controls.progressTooltipTime = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-progress-tooltip-time")
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
      var _a, _b;
      if (this.previewVideoInitialized) return;
      if (!((_b = (_a = this.player) == null ? void 0 : _a.state) == null ? void 0 : _b.hasStartedPlayback)) return;
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
            this.controls.progressPreview.style.backgroundImage = 'url("'.concat(thumbnail, '")');
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
        var _a, _b;
        if (!this.isDraggingProgress) {
          const { time } = updateProgress(e.clientX);
          const rect = progress.getBoundingClientRect();
          const left = e.clientX - rect.left;
          this.controls.progressTooltipTime.textContent = TimeUtils.formatTime(time);
          this.controls.progressTooltip.style.left = "".concat(left, "px");
          this.controls.progressTooltip.style.display = "block";
          if (!((_b = (_a = this.player) == null ? void 0 : _a.state) == null ? void 0 : _b.hasStartedPlayback)) {
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-play-pause"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-restart"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-previous"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-next"),
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
      const panelId = this.player.playlistManager ? "".concat(this.player.playlistManager.uniqueId, "-panel") : "vidply-playlist-panel";
      const button = DOMUtils.createElement("button", {
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-playlist-toggle"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-rewind"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-forward"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-mute"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-mute"),
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
      const existingSlider = document.querySelector(".".concat(this.player.options.classPrefix, "-volume-menu"));
      if (existingSlider) {
        existingSlider.remove();
        button.setAttribute("aria-expanded", "false");
        return;
      }
      const volumeMenu = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-volume-menu ").concat(this.player.options.classPrefix, "-menu")
      });
      const volumeSlider = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-volume-slider"),
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
        className: "".concat(this.player.options.classPrefix, "-volume-track")
      });
      const volumeFill = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-volume-fill")
      });
      const initialVolumePercent = this.player.state.volume * 100;
      volumeFill.style.height = "".concat(initialVolumePercent, "%");
      const volumeHandle = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-volume-handle")
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
        className: "".concat(this.player.options.classPrefix, "-time"),
        attributes: {
          "role": "group",
          "aria-label": i18n.t("time.display")
        }
      });
      this.controls.currentTimeDisplay = DOMUtils.createElement("span", {
        className: "".concat(this.player.options.classPrefix, "-current-time")
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
        className: "".concat(this.player.options.classPrefix, "-duration")
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-chapters"),
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
      const existingMenu = document.querySelector(".".concat(this.player.options.classPrefix, "-chapters-menu"));
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
        className: "".concat(this.player.options.classPrefix, "-chapters-menu ").concat(this.player.options.classPrefix, "-menu"),
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
          className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
            className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
              className: "".concat(this.player.options.classPrefix, "-menu-item"),
              attributes: {
                "type": "button",
                "role": "menuitem",
                "tabindex": "-1"
              }
            });
            const timeLabel = DOMUtils.createElement("span", {
              className: "".concat(this.player.options.classPrefix, "-chapter-time"),
              textContent: TimeUtils.formatTime(cue.startTime),
              attributes: {
                "aria-label": TimeUtils.formatDuration(cue.startTime)
              }
            });
            const titleLabel = DOMUtils.createElement("span", {
              className: "".concat(this.player.options.classPrefix, "-chapter-title"),
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
            const firstItem = menu.querySelector(".".concat(this.player.options.classPrefix, "-menu-item"));
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-quality"),
        attributes: {
          "type": "button",
          "aria-label": ariaLabel,
          "aria-expanded": "false"
        }
      });
      button.appendChild(createIconElement("hd"));
      DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
      const qualityText = DOMUtils.createElement("span", {
        className: "".concat(this.player.options.classPrefix, "-quality-text"),
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
      const existingMenu = document.querySelector(".".concat(this.player.options.classPrefix, "-quality-menu"));
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
        className: "".concat(this.player.options.classPrefix, "-quality-menu ").concat(this.player.options.classPrefix, "-menu"),
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
            className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
              className: "".concat(this.player.options.classPrefix, "-menu-item"),
              textContent: i18n.t("player.auto"),
              attributes: {
                "type": "button",
                "role": "menuitem",
                "tabindex": "-1"
              }
            });
            const isAuto = this.player.renderer.hls && this.player.renderer.hls.currentLevel === -1;
            if (isAuto) {
              autoItem.classList.add("".concat(this.player.options.classPrefix, "-menu-item-active"));
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
              className: "".concat(this.player.options.classPrefix, "-menu-item"),
              textContent: quality.name || "".concat(quality.height, "p"),
              attributes: {
                "type": "button",
                "role": "menuitem",
                "tabindex": "-1"
              }
            });
            if (quality.index === currentQuality) {
              item.classList.add("".concat(this.player.options.classPrefix, "-menu-item-active"));
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
            const focusTarget = activeItem || menu.querySelector(".".concat(this.player.options.classPrefix, "-menu-item"));
            if (focusTarget) {
              focusTarget.focus({ preventScroll: true });
            }
          }, 0);
        }
      } else {
        const noSupportItem = DOMUtils.createElement("div", {
          className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-caption-style"),
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
      const existingMenu = document.querySelector(".".concat(this.player.options.classPrefix, "-caption-style-menu"));
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
        className: "".concat(this.player.options.classPrefix, "-caption-style-menu ").concat(this.player.options.classPrefix, "-menu ").concat(this.player.options.classPrefix, "-settings-menu"),
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
          className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
      focusFirstElement(menu, ".".concat(this.player.options.classPrefix, "-style-select"));
    }
    createStyleControl(label, property, options) {
      const group = DOMUtils.createElement("div", {
        className: "".concat(this.player.options.classPrefix, "-style-group")
      });
      const controlId = "".concat(this.player.options.classPrefix, "-").concat(property, "-").concat(Date.now());
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
        className: "".concat(this.player.options.classPrefix, "-style-select"),
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
        className: "".concat(this.player.options.classPrefix, "-style-group")
      });
      const controlId = "".concat(this.player.options.classPrefix, "-").concat(property, "-").concat(Date.now());
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
        className: "".concat(this.player.options.classPrefix, "-style-group")
      });
      const controlId = "".concat(this.player.options.classPrefix, "-").concat(property, "-").concat(Date.now());
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-speed"),
        attributes: {
          "type": "button",
          "aria-label": i18n.t("player.speed"),
          "aria-expanded": "false"
        }
      });
      button.appendChild(createIconElement("speed"));
      const speedText = DOMUtils.createElement("span", {
        className: "".concat(this.player.options.classPrefix, "-speed-text"),
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
      return "".concat(speedStr, "×");
    }
    showSpeedMenu(button) {
      const existingMenu = document.querySelector(".".concat(this.player.options.classPrefix, "-speed-menu"));
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
        className: "".concat(this.player.options.classPrefix, "-speed-menu ").concat(this.player.options.classPrefix, "-menu"),
        attributes: {
          "role": "menu"
        }
      });
      const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
      let activeItem = null;
      speeds.forEach((speed) => {
        const item = DOMUtils.createElement("button", {
          className: "".concat(this.player.options.classPrefix, "-menu-item"),
          textContent: this.formatSpeedLabel(speed),
          attributes: {
            "type": "button",
            "role": "menuitem",
            "tabindex": "-1"
          }
        });
        if (speed === this.player.state.playbackSpeed) {
          item.classList.add("".concat(this.player.options.classPrefix, "-menu-item-active"));
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
        const focusTarget = activeItem || menu.querySelector(".".concat(this.player.options.classPrefix, "-menu-item"));
        if (focusTarget) {
          focusTarget.focus({ preventScroll: true });
        }
      }, 0);
    }
    createCaptionsButton() {
      const button = DOMUtils.createElement("button", {
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-captions-button"),
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
      const existingMenu = document.querySelector(".".concat(this.player.options.classPrefix, "-captions-menu"));
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
        className: "".concat(this.player.options.classPrefix, "-captions-menu ").concat(this.player.options.classPrefix, "-menu"),
        attributes: {
          "role": "menu",
          "aria-label": i18n.t("captions.select")
        }
      });
      if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
        const noTracksItem = DOMUtils.createElement("div", {
          className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
        className: "".concat(this.player.options.classPrefix, "-menu-item"),
        textContent: i18n.t("captions.off"),
        attributes: {
          "type": "button",
          "role": "menuitem",
          "tabindex": "-1"
        }
      });
      if (!this.player.state.captionsEnabled) {
        offItem.classList.add("".concat(this.player.options.classPrefix, "-menu-item-active"));
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
          className: "".concat(this.player.options.classPrefix, "-menu-item"),
          textContent: track.label,
          attributes: {
            "type": "button",
            "role": "menuitem",
            "lang": track.language,
            "tabindex": "-1"
          }
        });
        if (this.player.state.captionsEnabled && this.player.captionManager.currentTrack === this.player.captionManager.tracks[track.index]) {
          item.classList.add("".concat(this.player.options.classPrefix, "-menu-item-active"));
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
        const focusTarget = activeItem || menu.querySelector(".".concat(this.player.options.classPrefix, "-menu-item"));
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-transcript"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-audio-description"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-sign-language"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-sign-language-main-view"),
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
      const tooltip = btn.querySelector(".".concat(this.player.options.classPrefix, "-tooltip"));
      if (tooltip) tooltip.textContent = newLabel;
    }
    /**
     * Update accessibility buttons visibility based on current track data.
     * Called when loading a new playlist track to show/hide buttons accordingly.
     */
    updateAccessibilityButtons() {
      var _a;
      const hasAudioDescription = this.hasAudioDescription();
      const hasSignLanguage = this.hasSignLanguage();
      if (hasAudioDescription) {
        if (!this.controls.audioDescription && this.player.options.audioDescriptionButton !== false) {
          const btn = this.createAudioDescriptionButton();
          btn.dataset.overflowPriority = "2";
          btn.dataset.overflowPriorityMobile = "3";
          const transcriptBtn = this.rightButtons.querySelector(".".concat(this.player.options.classPrefix, "-transcript"));
          const playlistBtn = this.rightButtons.querySelector(".".concat(this.player.options.classPrefix, "-playlist-toggle"));
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
        const qualityBtn = this.rightButtons.querySelector(".".concat(classPrefix, "-quality"));
        const fullscreenBtn = this.rightButtons.querySelector(".".concat(classPrefix, "-fullscreen"));
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
          const afterPip = (_a = this.controls.signLanguage) == null ? void 0 : _a.nextSibling;
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-settings"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-pip"),
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-fullscreen"),
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
      this.controls.played.style.width = "".concat(percent, "%");
      this.controls.progress.setAttribute("aria-valuenow", String(Math.round(percent)));
      const currentTimeText = TimeUtils.formatDuration(this.player.state.currentTime);
      const durationText = TimeUtils.formatDuration(this.player.state.duration);
      this.controls.progress.setAttribute(
        "aria-valuetext",
        "".concat(Math.round(percent), "%, ").concat(currentTimeText, " ").concat(i18n.t("time.of"), " ").concat(durationText)
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
        this.controls.volumeFill.style.height = "".concat(percent, "%");
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
      this.controls.buffered.style.width = "".concat(percent, "%");
    }
    updateSpeedDisplay() {
      if (this.controls.speedText) {
        this.controls.speedText.textContent = "".concat(this.player.state.playbackSpeed, "x");
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
      const speedButton = this.rightButtons.querySelector(".".concat(this.player.options.classPrefix, "-speed"));
      const captionStyleButton = this.rightButtons.querySelector(".".concat(this.player.options.classPrefix, "-caption-style"));
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
          currentQualityText = currentQuality.height ? "".concat(currentQuality.height, "p") : "";
        }
      }
      this.controls.qualityText.textContent = currentQualityText;
    }
    setupAutoHide() {
      if (this.player.element.tagName !== "VIDEO") return;
      const showControls = () => {
        this.element.classList.add("".concat(this.player.options.classPrefix, "-controls-visible"));
        this.player.container.classList.add("".concat(this.player.options.classPrefix, "-controls-visible"));
        this.player.state.controlsVisible = true;
        clearTimeout(this.hideTimeout);
        if (this.player.state.playing) {
          const delay = this.player.state.fullscreen ? this.player.options.hideControlsDelay * 1.5 : this.player.options.hideControlsDelay;
          this.hideTimeout = setTimeout(() => {
            this.element.classList.remove("".concat(this.player.options.classPrefix, "-controls-visible"));
            this.player.container.classList.remove("".concat(this.player.options.classPrefix, "-controls-visible"));
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
              this.element.classList.remove("".concat(this.player.options.classPrefix, "-controls-visible"));
              this.player.container.classList.remove("".concat(this.player.options.classPrefix, "-controls-visible"));
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
        className: "".concat(this.player.options.classPrefix, "-button ").concat(this.player.options.classPrefix, "-overflow-menu"),
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
      const existingMenu = document.querySelector(".".concat(this.player.options.classPrefix, "-overflow-menu-list"));
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
        className: "".concat(this.player.options.classPrefix, "-overflow-menu-list ").concat(this.player.options.classPrefix, "-menu"),
        attributes: {
          "role": "menu",
          "aria-label": i18n.t("player.moreOptions")
        }
      });
      const overflowButtons = Array.from(this.rightButtons.querySelectorAll('button[data-in-overflow="true"]'));
      if (overflowButtons.length === 0) {
        const noItemsText = DOMUtils.createElement("div", {
          className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
            className: "".concat(this.player.options.classPrefix, "-menu-item"),
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
          const firstItem = menu.querySelector(".".concat(this.player.options.classPrefix, "-menu-item"));
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
          (btn) => !btn.classList.contains("".concat(this.player.options.classPrefix, "-overflow-menu"))
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
            console.log("Using ".concat(isSmallScreen2 ? "mobile" : "desktop", " priorities (width: ").concat(window.innerWidth, "px)"));
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
                console.log("  → Hiding button: ".concat(buttonLabel, " (priority ").concat(priority, ", ").concat(isSmallScreen2 ? "mobile" : "desktop", ")"));
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
      var _a;
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
      const newSrc = mainVideo.src || ((_a = mainVideo.querySelector("source")) == null ? void 0 : _a.src);
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
  init_DOMUtils();
  init_i18n();
  init_StorageManager();
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
        className: "".concat(this.player.options.classPrefix, "-captions"),
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
            const existingCues = this.element.querySelectorAll(".".concat(this.player.options.classPrefix, "-caption-cue"));
            existingCues.forEach((el) => el.classList.remove("".concat(this.player.options.classPrefix, "-caption-active")));
            const cueId = "cue-".concat(cue.startTime, "-").concat(cue.endTime);
            let cueElement = this.element.querySelector('[data-cue-id="'.concat(cueId, '"]'));
            if (!cueElement) {
              cueElement = document.createElement("div");
              cueElement.className = "".concat(this.player.options.classPrefix, "-caption-cue");
              cueElement.setAttribute("data-cue-id", cueId);
              cueElement.innerHTML = DOMUtils.sanitizeHTML(text);
              this.element.appendChild(cueElement);
            }
            cueElement.classList.add("".concat(this.player.options.classPrefix, "-caption-active"));
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
      var _a, _b;
      if (!this.element || this.element.style.display === "none") {
        return;
      }
      const isFullscreen = ((_a = this.player.state) == null ? void 0 : _a.fullscreen) || false;
      const mobile = isMobile();
      if (!mobile && !isFullscreen) {
        this.element.style.bottom = "";
        return;
      }
      const controls = (_b = this.player.controlBar) == null ? void 0 : _b.element;
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
        this.element.style.bottom = "".concat(bottomOffset, "px");
        if (this.player.options.debug) {
          console.log("[VidPly] Caption position:", {
            mobile,
            isFullscreen,
            controlsHeight: controlsRect.height,
            bottomOffset: "".concat(bottomOffset, "px")
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
        return "rgba(".concat(parseInt(result[1], 16), ", ").concat(parseInt(result[2], 16), ", ").concat(parseInt(result[3], 16), ", ").concat(alpha, ")");
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
      var _a, _b;
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
          const draggable = (_a = this.player.signLanguageManager) == null ? void 0 : _a.draggable;
          if ((draggable == null ? void 0 : draggable.keyboardDragMode) || (draggable == null ? void 0 : draggable.keyboardResizeMode)) {
            return;
          }
        }
        const transcriptWindow = activeElement.closest(".vidply-transcript-window");
        if (transcriptWindow) {
          const draggable = (_b = this.player.transcriptManager) == null ? void 0 : _b.draggableResizable;
          if ((draggable == null ? void 0 : draggable.keyboardDragMode) || (draggable == null ? void 0 : draggable.keyboardResizeMode)) {
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
          message = "Volume ".concat(Math.round(this.player.state.volume * 100), "%");
          break;
        case "volume-down":
          message = "Volume ".concat(Math.round(this.player.state.volume * 100), "%");
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
          message = "Speed ".concat(this.player.state.playbackSpeed, "x");
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
        announcer.style.cssText = "\n        position: absolute;\n        left: -10000px;\n        width: 1px;\n        height: 1px;\n        overflow: hidden;\n      ";
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

  // src/core/Player.js
  init_HTML5Renderer();
  init_Icons();
  init_i18n();
  init_StorageManager();
  init_DraggableResizable();
  init_MenuUtils();
  init_FormUtils();

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
          this.player.log("Found explicit described ".concat(trackKind, " track: ").concat(trackEl.getAttribute("src"), " -> ").concat(trackDescSrc));
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
      } catch (e) {
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
            } catch (e) {
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
            this.player.log("[VidPly] Syncing via caption: ".concat(currentTime, "s -> ").concat(syncTime, "s"));
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
  init_DOMUtils();
  init_Icons();
  init_i18n();
  init_DraggableResizable();
  init_MenuUtils();
  init_FormUtils();
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
      var _a, _b;
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
          (_b = (_a = this.player).log) == null ? void 0 : _b.call(_a, "Sign language main view: play after restore failed", e, "warn");
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
      var _a;
      if (this.player.captionManager && this.player.captionManager.currentTrack) {
        const captionLang = (_a = this.player.captionManager.currentTrack.language) == null ? void 0 : _a.toLowerCase().split("-")[0];
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
        className: "".concat(classPrefix, "-sign-language-header"),
        attributes: { "tabindex": "0" }
      });
      const headerLeft = DOMUtils.createElement("div", {
        className: "".concat(classPrefix, "-sign-language-header-left")
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
        className: "".concat(classPrefix, "-sign-language-settings"),
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
      const selectId = "".concat(classPrefix, "-sign-language-select-").concat(Date.now());
      const options = Object.keys(this.sources).map((langCode) => ({
        value: langCode,
        text: this.getLanguageLabel(langCode),
        selected: langCode === initialLang
      }));
      const { label, select } = createLabeledSelect({
        classPrefix,
        labelClass: "".concat(classPrefix, "-sign-language-label"),
        selectClass: "".concat(classPrefix, "-sign-language-select"),
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
        className: "".concat(classPrefix, "-sign-language-selector-wrapper")
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
        className: "".concat(classPrefix, "-sign-language-close"),
        attributes: {
          "type": "button",
          "aria-label": ariaLabel
        }
      });
      closeButton.appendChild(createIconElement("close"));
      DOMUtils.attachTooltip(closeButton, ariaLabel, classPrefix);
      closeButton.addEventListener("click", () => {
        var _a, _b;
        this.disable();
        if ((_b = (_a = this.player.controlBar) == null ? void 0 : _a.controls) == null ? void 0 : _b.signLanguage) {
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
          className: "".concat(classPrefix, "-sign-resize-handle ").concat(classPrefix, "-sign-resize-").concat(dir),
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
      var _a;
      const saved = this.player.storage.getSignLanguagePreferences();
      if ((_a = saved == null ? void 0 : saved.size) == null ? void 0 : _a.width) {
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
      var _a, _b;
      const isMobile2 = window.innerWidth < 768;
      const isFullscreen = this.player.state.fullscreen;
      if (isMobile2 && !isFullscreen && ((_b = (_a = this.player) == null ? void 0 : _a.options) == null ? void 0 : _b.signLanguageDragOnMobile) === false) {
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
        classPrefix: "".concat(classPrefix, "-sign"),
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
          if (e.target.closest(".".concat(classPrefix, "-sign-language-close")) || e.target.closest(".".concat(classPrefix, "-sign-language-settings")) || e.target.closest(".".concat(classPrefix, "-sign-language-select")) || e.target.closest(".".concat(classPrefix, "-sign-language-label")) || e.target.closest(".".concat(classPrefix, "-sign-language-settings-menu"))) {
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
        var _a, _b, _c, _d;
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
          if ((_a = this.draggable) == null ? void 0 : _a.pointerResizeMode) {
            this.draggable.disablePointerResizeMode();
            return;
          }
          if ((_b = this.draggable) == null ? void 0 : _b.keyboardDragMode) {
            this.draggable.disableKeyboardDragMode();
            return;
          }
          this.disable();
          if ((_d = (_c = this.player.controlBar) == null ? void 0 : _c.controls) == null ? void 0 : _d.signLanguage) {
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
          var _a, _b;
          if (((_a = this.player.captionManager) == null ? void 0 : _a.currentTrack) && this.selector) {
            const captionLang = (_b = this.player.captionManager.currentTrack.language) == null ? void 0 : _b.toLowerCase().split("-")[0];
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
      var _a;
      if (!this.wrapper || !this.player.videoWrapper) return;
      if ((_a = this.draggable) == null ? void 0 : _a.manuallyPositioned) return;
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
      this.wrapper.style.left = "".concat(left, "px");
      this.wrapper.style.top = "".concat(top, "px");
      this.wrapper.style.right = "auto";
      this.wrapper.style.bottom = "auto";
    }
    /**
     * Show settings menu
     */
    showSettingsMenu() {
      var _a;
      this.settingsMenuJustOpened = true;
      setTimeout(() => {
        this.settingsMenuJustOpened = false;
      }, 350);
      this._addDocumentClickHandler();
      if (this.settingsMenu) {
        this.settingsMenu.style.display = "block";
        this.settingsMenuVisible = true;
        (_a = this.settingsButton) == null ? void 0 : _a.setAttribute("aria-expanded", "true");
        this._attachMenuKeyboardNavigation();
        this._positionSettingsMenu();
        this._updateDragOptionState();
        this._updateResizeOptionState();
        focusFirstMenuItem(this.settingsMenu, ".".concat(this.player.options.classPrefix, "-sign-language-settings-item"));
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
        const menuItems = Array.from(this.settingsMenu.querySelectorAll(".".concat(classPrefix, "-sign-language-settings-item")));
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
      var _a, _b;
      const classPrefix = this.player.options.classPrefix;
      this.settingsMenu = DOMUtils.createElement("div", {
        className: "".concat(classPrefix, "-sign-language-settings-menu"),
        attributes: { "role": "menu" }
      });
      const dragOption = createMenuItem({
        classPrefix,
        itemClass: "".concat(classPrefix, "-sign-language-settings-item"),
        icon: "move",
        label: "player.enableSignDragMode",
        hasTextClass: true,
        onClick: () => {
          var _a2;
          this.toggleKeyboardDragMode();
          this.hideSettingsMenu({ focusButton: false });
          if ((_a2 = this.draggable) == null ? void 0 : _a2.keyboardDragMode) {
            setTimeout(() => {
              var _a3, _b2;
              (_b2 = (_a3 = this.wrapper) == null ? void 0 : _a3.focus) == null ? void 0 : _b2.call(_a3, { preventScroll: true });
            }, 20);
          }
        }
      });
      dragOption.setAttribute("data-setting", "keyboard-drag");
      dragOption.setAttribute("role", "switch");
      dragOption.setAttribute("aria-checked", "false");
      this._removeTooltipFromMenuItem(dragOption);
      this.dragOptionButton = dragOption;
      this.dragOptionText = dragOption.querySelector(".".concat(classPrefix, "-settings-text"));
      this._updateDragOptionState();
      const resizeOption = createMenuItem({
        classPrefix,
        itemClass: "".concat(classPrefix, "-sign-language-settings-item"),
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
      this.resizeOptionText = resizeOption.querySelector(".".concat(classPrefix, "-settings-text"));
      this._updateResizeOptionState();
      const closeOption = createMenuItem({
        classPrefix,
        itemClass: "".concat(classPrefix, "-sign-language-settings-item"),
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
      if ((_a = this.settingsButton) == null ? void 0 : _a.parentNode) {
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
      (_b = this.settingsButton) == null ? void 0 : _b.setAttribute("aria-expanded", "true");
      this._updateDragOptionState();
      this._updateResizeOptionState();
      focusFirstMenuItem(this.settingsMenu, ".".concat(classPrefix, "-sign-language-settings-item"));
    }
    /**
     * Remove tooltip from menu item
     */
    _removeTooltipFromMenuItem(item) {
      const classPrefix = this.player.options.classPrefix;
      const tooltip = item.querySelector(".".concat(classPrefix, "-tooltip"));
      if (tooltip) tooltip.remove();
      const buttonText = item.querySelector(".".concat(classPrefix, "-button-text"));
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
        ".".concat(this.player.options.classPrefix, "-sign-language-settings-item"),
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
        this.settingsMenu.style.top = "".concat(menuTop, "px");
        this.settingsMenu.style.bottom = "auto";
      } else if (menuBottom !== null) {
        this.settingsMenu.style.top = "auto";
        this.settingsMenu.style.bottom = "".concat(menuBottom, "px");
      }
      if (menuLeft !== "auto") {
        this.settingsMenu.style.left = "".concat(menuLeft, "px");
        this.settingsMenu.style.right = "auto";
      } else {
        this.settingsMenu.style.left = "auto";
        this.settingsMenu.style.right = "".concat(menuRight, "px");
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
      this.wrapper.classList.add("".concat(this.player.options.classPrefix, "-sign-move-mode"));
      this._updateResizeOptionState();
      setTimeout(() => {
        this.wrapper.classList.remove("".concat(this.player.options.classPrefix, "-sign-move-mode"));
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
      var _a;
      if (!this.dragOptionButton) return;
      const isEnabled = !!((_a = this.draggable) == null ? void 0 : _a.keyboardDragMode);
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
      var _a;
      if (!this.resizeOptionButton) return;
      const isEnabled = !!((_a = this.draggable) == null ? void 0 : _a.pointerResizeMode);
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
      var _a;
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
      if ((_a = this.wrapper) == null ? void 0 : _a.parentNode) {
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
      this.options = __spreadValues({
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
        onError: null
      }, options);
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
      var _a;
      try {
        if (!message) return;
        if (!this.container) return;
        if ((_a = this.keyboardManager) == null ? void 0 : _a.announce) {
          this.keyboardManager.announce(message, priority);
        }
        if (!this.noticeElement) {
          const el = document.createElement("div");
          el.className = "".concat(this.options.classPrefix, "-notice");
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
      var _a;
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
            this.log("Custom language file loaded for ".concat(this.options.languageFile));
          } catch (error) {
            console.warn("Failed to load language file for ".concat(this.options.languageFile, ":"), error);
          }
        }
        if (!this.options.language || this.options.language === "en") {
          const htmlLang = this.detectHtmlLanguage();
          if (htmlLang) {
            this.options.language = htmlLang;
            this.log("Auto-detected language from HTML: ".concat(htmlLang));
          }
        }
        if (!this.options.language) {
          this.options.language = "en";
        }
        await i18n.ensureLanguage(this.options.language);
        i18n.setLanguage(this.options.language);
        this.createContainer();
        const src = this.element.src || ((_a = this.element.querySelector("source")) == null ? void 0 : _a.src);
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
      const module = await Promise.resolve().then(() => (init_TranscriptManager(), TranscriptManager_exports));
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
      this.log('Language "'.concat(htmlLang, '" not available, using English as fallback'));
      return null;
    }
    createContainer() {
      const playerLabel = this.instanceId > 1 ? "".concat(i18n.t("player.label"), " ").concat(this.instanceId) : i18n.t("player.label");
      this.container = DOMUtils.createElement("div", {
        className: "".concat(this.options.classPrefix, "-player"),
        attributes: {
          "role": "application",
          "aria-label": playerLabel,
          "tabindex": "0"
        }
      });
      const mediaType = this.element.tagName.toLowerCase();
      this.container.classList.add("".concat(this.options.classPrefix, "-").concat(mediaType));
      if (this.options.responsive) {
        this.container.classList.add("".concat(this.options.classPrefix, "-responsive"));
      }
      this.videoWrapper = DOMUtils.createElement("div", {
        className: "".concat(this.options.classPrefix, "-video-wrapper")
      });
      this.element.parentNode.insertBefore(this.container, this.element);
      if (this.element.tagName === "AUDIO" && this.options.poster) {
        this.trackArtworkElement = DOMUtils.createElement("div", {
          className: "".concat(this.options.classPrefix, "-track-artwork"),
          attributes: {
            "aria-hidden": "true"
          }
        });
        this.trackArtworkElement.style.backgroundImage = "url(".concat(this.options.poster, ")");
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
        this.container.style.width = typeof this.options.width === "number" ? "".concat(this.options.width, "px") : this.options.width;
      }
      if (this.options.height) {
        this.container.style.height = typeof this.options.height === "number" ? "".concat(this.options.height, "px") : this.options.height;
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
      this.playButtonOverlay.style.top = "".concat(videoCenter, "px");
    }
    async initializeRenderer() {
      var _a;
      let src = this._pendingSource || this.element.src || ((_a = this.element.querySelector("source")) == null ? void 0 : _a.src);
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
        const module = await Promise.resolve().then(() => (init_YouTubeRenderer(), YouTubeRenderer_exports));
        rendererClass = module.YouTubeRenderer || module.default;
      } else if (src.includes("vimeo.com")) {
        const module = await Promise.resolve().then(() => (init_VimeoRenderer(), VimeoRenderer_exports));
        rendererClass = module.VimeoRenderer || module.default;
      } else if (src.includes(".m3u8")) {
        const module = await Promise.resolve().then(() => (init_HLSRenderer(), HLSRenderer_exports));
        rendererClass = module.HLSRenderer || module.default;
      } else if (src.includes("soundcloud.com") || src.includes("api.soundcloud.com")) {
        const module = await Promise.resolve().then(() => (init_SoundCloudRenderer(), SoundCloudRenderer_exports));
        rendererClass = module.SoundCloudRenderer || module.default;
      }
      this.log("Using ".concat((rendererClass == null ? void 0 : rendererClass.name) || "HTML5Renderer", " renderer"));
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
      this.videoWrapper.style.setProperty("--vidply-poster-image", 'url("'.concat(resolvedPoster, '")'));
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
      var _a;
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
              this.videoWrapper.style.setProperty("--vidply-poster-image", 'url("'.concat(resolvedPoster, '")'));
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
            (_a = this.transcriptManager) == null ? void 0 : _a.showTranscript();
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
        this.container.classList.add("".concat(this.options.classPrefix, "-fullscreen"));
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
      this.container.classList.remove("".concat(this.options.classPrefix, "-fullscreen"));
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
      var _a;
      this.state.fullscreen = true;
      this.container.classList.add("".concat(this.options.classPrefix, "-fullscreen"));
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
      this._originalViewport = (_a = document.querySelector('meta[name="viewport"]')) == null ? void 0 : _a.getAttribute("content");
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
              console.log("[VidPly] Syncing via caption: ".concat(currentTime, "s -> ").concat(syncTime2, "s"));
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
            console.log("[VidPly] Syncing via caption: ".concat(currentTime, "s -> ").concat(syncTime, "s"));
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
            console.log("[VidPly] Syncing via caption: ".concat(currentTime, "s -> ").concat(syncTime, "s"));
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
      var _a, _b, _c;
      if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && ((_b = (_a = this.playlistManager) == null ? void 0 : _a.tracks) == null ? void 0 : _b.length)) {
        this.showNotice(i18n.t("player.startPlaybackForAudioDescription"));
        return;
      }
      if (!this.renderer && this.playlistManager && ((_c = this.playlistManager.tracks) == null ? void 0 : _c.length)) {
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
      var _a;
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
          const captionLang = (_a = this.captionManager.currentTrack.language) == null ? void 0 : _a.toLowerCase().split("-")[0];
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
        className: "".concat(this.options.classPrefix, "-sign-language-header"),
        attributes: {
          "tabindex": "0"
        }
      });
      const headerLeft = DOMUtils.createElement("div", {
        className: "".concat(this.options.classPrefix, "-sign-language-header-left")
      });
      const title = DOMUtils.createElement("h3", {
        textContent: i18n.t("player.signLanguageVideo")
      });
      const settingsAriaLabel = i18n.t("player.signLanguageSettings");
      this.signLanguageSettingsButton = DOMUtils.createElement("button", {
        className: "".concat(this.options.classPrefix, "-sign-language-settings"),
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
        const selectId = "".concat(this.options.classPrefix, "-sign-language-select-").concat(Date.now());
        const options = Object.keys(this.signLanguageSources).map((langCode) => ({
          value: langCode,
          text: this.getSignLanguageLabel(langCode),
          selected: langCode === initialLang
        }));
        const { label: signLanguageLabel, select: signLanguageSelector } = createLabeledSelect({
          classPrefix: this.options.classPrefix,
          labelClass: "".concat(this.options.classPrefix, "-sign-language-label"),
          selectClass: "".concat(this.options.classPrefix, "-sign-language-select"),
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
          className: "".concat(this.options.classPrefix, "-sign-language-selector-wrapper")
        });
        signLanguageSelectorWrapper.appendChild(signLanguageLabel);
        signLanguageSelectorWrapper.appendChild(this.signLanguageSelector);
        preventDragOnElement(signLanguageSelectorWrapper);
        headerLeft.appendChild(signLanguageSelectorWrapper);
      }
      headerLeft.appendChild(title);
      const closeAriaLabel = i18n.t("player.closeSignLanguage");
      const closeButton = DOMUtils.createElement("button", {
        className: "".concat(this.options.classPrefix, "-sign-language-close"),
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
          className: "".concat(this.options.classPrefix, "-sign-resize-handle ").concat(this.options.classPrefix, "-sign-resize-").concat(dir),
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
          var _a2;
          if (this.captionManager && this.captionManager.currentTrack && this.signLanguageSelector) {
            const captionLang = (_a2 = this.captionManager.currentTrack.language) == null ? void 0 : _a2.toLowerCase().split("-")[0];
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
      var _a, _b, _c;
      if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && ((_b = (_a = this.playlistManager) == null ? void 0 : _a.tracks) == null ? void 0 : _b.length)) {
        this.showNotice(i18n.t("player.startPlaybackForSignLanguage"));
        return;
      }
      if (!this.renderer && this.playlistManager && ((_c = this.playlistManager.tracks) == null ? void 0 : _c.length)) {
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
        classPrefix: "".concat(this.options.classPrefix, "-sign"),
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
          if (e.target.closest(".".concat(this.options.classPrefix, "-sign-language-close")) || e.target.closest(".".concat(this.options.classPrefix, "-sign-language-settings")) || e.target.closest(".".concat(this.options.classPrefix, "-sign-language-select")) || e.target.closest(".".concat(this.options.classPrefix, "-sign-language-label")) || e.target.closest(".".concat(this.options.classPrefix, "-sign-language-settings-menu"))) {
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
      this.signLanguageWrapper.classList.add("".concat(this.options.classPrefix, "-sign-move-mode"));
      this.updateSignLanguageResizeOptionState();
      setTimeout(() => {
        this.signLanguageWrapper.classList.remove("".concat(this.options.classPrefix, "-sign-move-mode"));
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
          ".".concat(this.options.classPrefix, "-sign-language-settings-item"),
          () => this.hideSignLanguageSettingsMenu({ focusButton: true })
        );
        this.positionSignLanguageSettingsMenu();
        this.updateSignLanguageDragOptionState();
        this.updateSignLanguageResizeOptionState();
        focusFirstMenuItem(this.signLanguageSettingsMenu, ".".concat(this.options.classPrefix, "-sign-language-settings-item"));
        return;
      }
      this.signLanguageSettingsMenu = DOMUtils.createElement("div", {
        className: "".concat(this.options.classPrefix, "-sign-language-settings-menu"),
        attributes: {
          "role": "menu"
        }
      });
      const keyboardDragOption = createMenuItem({
        classPrefix: this.options.classPrefix,
        itemClass: "".concat(this.options.classPrefix, "-sign-language-settings-item"),
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
      const dragTooltip = keyboardDragOption.querySelector(".".concat(this.options.classPrefix, "-tooltip"));
      if (dragTooltip) dragTooltip.remove();
      const dragButtonText = keyboardDragOption.querySelector(".".concat(this.options.classPrefix, "-button-text"));
      if (dragButtonText) dragButtonText.remove();
      this.signLanguageDragOptionButton = keyboardDragOption;
      this.signLanguageDragOptionText = keyboardDragOption.querySelector(".".concat(this.options.classPrefix, "-settings-text"));
      this.updateSignLanguageDragOptionState();
      const resizeOption = createMenuItem({
        classPrefix: this.options.classPrefix,
        itemClass: "".concat(this.options.classPrefix, "-sign-language-settings-item"),
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
      const resizeTooltip = resizeOption.querySelector(".".concat(this.options.classPrefix, "-tooltip"));
      if (resizeTooltip) resizeTooltip.remove();
      const resizeButtonText = resizeOption.querySelector(".".concat(this.options.classPrefix, "-button-text"));
      if (resizeButtonText) resizeButtonText.remove();
      this.signLanguageResizeOptionButton = resizeOption;
      this.signLanguageResizeOptionText = resizeOption.querySelector(".".concat(this.options.classPrefix, "-settings-text"));
      this.updateSignLanguageResizeOptionState();
      const closeOption = createMenuItem({
        classPrefix: this.options.classPrefix,
        itemClass: "".concat(this.options.classPrefix, "-sign-language-settings-item"),
        icon: "close",
        label: "transcript.closeMenu",
        onClick: () => {
          this.hideSignLanguageSettingsMenu();
        }
      });
      const closeTooltip = closeOption.querySelector(".".concat(this.options.classPrefix, "-tooltip"));
      if (closeTooltip) closeTooltip.remove();
      const closeButtonText = closeOption.querySelector(".".concat(this.options.classPrefix, "-button-text"));
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
        ".".concat(this.options.classPrefix, "-sign-language-settings-item"),
        () => this.hideSignLanguageSettingsMenu({ focusButton: true })
      );
      this.signLanguageSettingsMenuVisible = true;
      if (this.signLanguageSettingsButton) {
        this.signLanguageSettingsButton.setAttribute("aria-expanded", "true");
      }
      this.updateSignLanguageDragOptionState();
      this.updateSignLanguageResizeOptionState();
      focusFirstMenuItem(this.signLanguageSettingsMenu, ".".concat(this.options.classPrefix, "-sign-language-settings-item"));
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
        this.signLanguageSettingsMenu.style.top = "".concat(menuTop, "px");
        this.signLanguageSettingsMenu.style.bottom = "auto";
      } else if (menuBottom !== null) {
        this.signLanguageSettingsMenu.style.top = "auto";
        this.signLanguageSettingsMenu.style.bottom = "".concat(menuBottom, "px");
      }
      if (menuLeft !== "auto") {
        this.signLanguageSettingsMenu.style.left = "".concat(menuLeft, "px");
        this.signLanguageSettingsMenu.style.right = "auto";
      } else {
        this.signLanguageSettingsMenu.style.left = "auto";
        this.signLanguageSettingsMenu.style.right = "".concat(menuRight, "px");
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
        ".".concat(this.options.classPrefix, "-sign-language-settings-item"),
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
      this.signLanguageWrapper.style.left = "".concat(left, "px");
      this.signLanguageWrapper.style.top = "".concat(top, "px");
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
            this.container.classList.add("".concat(this.options.classPrefix, "-fullscreen"));
            document.body.classList.add("vidply-fullscreen-active");
            this._makeBackgroundInert();
          } else {
            this.container.classList.remove("".concat(this.options.classPrefix, "-fullscreen"));
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
      return "#".concat(trimmed);
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
      var _a, _b;
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
        const playButton = (_b = (_a = this.controlBar) == null ? void 0 : _a.controls) == null ? void 0 : _b.playPause;
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
      var _a;
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
      const shouldFocus = options.focus !== void 0 ? options.focus : (_a = config.focusOnShow) != null ? _a : options.reason !== "focus";
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
            var _a2;
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
            }, (_a2 = config.focusDelay) != null ? _a2 : 100);
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
  init_DOMUtils();
  init_Icons();
  init_i18n();
  init_TimeUtils();
  var playlistInstanceCounter = 0;
  var PlaylistManager = class {
    constructor(player, options = {}) {
      this.player = player;
      this.tracks = [];
      this.initialTracks = Array.isArray(options.tracks) ? options.tracks : [];
      this.currentIndex = -1;
      this.instanceId = ++playlistInstanceCounter;
      this.uniqueId = "vidply-playlist-".concat(this.instanceId);
      this.options = __spreadValues({
        autoAdvance: options.autoAdvance !== false,
        // Default true
        autoPlayFirst: options.autoPlayFirst !== false,
        // Default true - auto-play first track on load
        loop: options.loop || false,
        showPanel: options.showPanel !== false,
        // Default true
        recreatePlayers: options.recreatePlayers || false
      }, options);
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
      var _a;
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
      const preservedPlayerOptions = ((_a = this.player) == null ? void 0 : _a.options) ? __spreadValues({}, this.player.options) : {};
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
          console.log("VidPly Playlist: Loaded ".concat(tracks.length, " tracks from data-playlist"));
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
      var _a, _b;
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
      if (((_b = (_a = this.player) == null ? void 0 : _a.options) == null ? void 0 : _b.deferLoad) && typeof this.player.ensureLoaded === "function") {
        Promise.resolve(loadPromise).then(() => {
          var _a2, _b2;
          return (_b2 = (_a2 = this.player) == null ? void 0 : _a2.ensureLoaded) == null ? void 0 : _b2.call(_a2);
        }).catch(() => {
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
      var _a, _b, _c, _d;
      if (index < 0 || index >= this.tracks.length) {
        console.warn("VidPly Playlist: Invalid track index", index);
        return;
      }
      const track = this.tracks[index];
      this.currentIndex = index;
      try {
        if (((_b = (_a = this.player) == null ? void 0 : _a.element) == null ? void 0 : _b.tagName) === "VIDEO") {
          if (track.poster) {
            const posterUrl = typeof this.player.resolvePosterPath === "function" ? this.player.resolvePosterPath(track.poster) : track.poster;
            this.player.element.poster = posterUrl;
            (_d = (_c = this.player).applyPosterAspectRatio) == null ? void 0 : _d.call(_c, posterUrl);
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
            if (!(tc == null ? void 0 : tc.src)) return;
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
      var _a, _b;
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
      if (((_b = (_a = this.player) == null ? void 0 : _a.audioDescriptionManager) == null ? void 0 : _b.desiredState) && track.audioDescriptionSrc) {
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
          id: "".concat(this.uniqueId, "-panel"),
          role: "region",
          "aria-label": i18n.t("playlist.title"),
          "aria-labelledby": "".concat(this.uniqueId, "-heading")
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
      const durationPart = trackDurationReadable ? ". ".concat(trackDurationReadable) : "";
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
      const durationHtml = trackDuration ? '<span class="vidply-track-duration" aria-hidden="true">'.concat(DOMUtils.escapeHTML(trackDuration), "</span>") : "";
      const trackDescription = track.description || "";
      this.trackInfoElement.innerHTML = '\n      <span class="vidply-sr-only">'.concat(DOMUtils.escapeHTML(announcement), '</span>\n      <div class="vidply-track-header" aria-hidden="true">\n        <span class="vidply-track-number">').concat(DOMUtils.escapeHTML(trackOfText), "</span>\n        ").concat(durationHtml, '\n      </div>\n      <div class="vidply-track-title" aria-hidden="true">').concat(DOMUtils.escapeHTML(trackTitle), "</div>\n      ").concat(trackArtist ? '<div class="vidply-track-artist" aria-hidden="true">'.concat(DOMUtils.escapeHTML(trackArtist), "</div>") : "", "\n      ").concat(trackDescription ? '<div class="vidply-track-description" aria-hidden="true">'.concat(DOMUtils.escapeHTML(trackDescription), "</div>") : "", "\n    ");
      this.trackInfoElement.style.display = "block";
      this.updateTrackArtwork(track);
    }
    /**
     * Update track artwork display (for audio playlists)
     */
    updateTrackArtwork(track) {
      var _a, _b;
      if (((_b = (_a = this.player) == null ? void 0 : _a.element) == null ? void 0 : _b.tagName) !== "AUDIO") {
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
        this.trackArtworkElement.style.backgroundImage = "url(".concat(track.poster, ")");
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
          id: "".concat(this.uniqueId, "-heading")
        }
      });
      header.textContent = "".concat(i18n.t("playlist.title"), " (").concat(this.tracks.length, ")");
      this.playlistPanel.appendChild(header);
      const instructions = DOMUtils.createElement("div", {
        className: "vidply-sr-only",
        attributes: {
          id: "".concat(this.uniqueId, "-keyboard-instructions")
        }
      });
      instructions.textContent = i18n.t("playlist.keyboardInstructions");
      this.playlistPanel.appendChild(instructions);
      const list = DOMUtils.createElement("ul", {
        className: "vidply-playlist-list",
        attributes: {
          role: "listbox",
          "aria-labelledby": "".concat(this.uniqueId, "-heading"),
          "aria-describedby": "".concat(this.uniqueId, "-keyboard-instructions")
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
      let ariaLabel = "".concat(trackTitle).concat(trackArtist);
      if (trackDurationReadable) {
        ariaLabel += ". ".concat(trackDurationReadable);
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
        thumbnail.style.backgroundImage = "url(".concat(track.poster, ")");
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
        const isExternalRenderer = this.isExternalRendererUrl(track2 == null ? void 0 : track2.src);
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
            const isExternalRenderer = this.isExternalRendererUrl(track == null ? void 0 : track.src);
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
          let ariaLabel = "".concat(trackTitle).concat(trackArtist);
          if (trackDurationReadable) {
            ariaLabel += ". ".concat(trackDurationReadable);
          }
          button.setAttribute("aria-label", ariaLabel);
          item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          item.classList.remove("vidply-playlist-item-active");
          button.removeAttribute("aria-current");
          button.setAttribute("aria-checked", "false");
          button.setAttribute("tabIndex", "-1");
          let ariaLabel = "".concat(trackTitle).concat(trackArtist);
          if (trackDurationReadable) {
            ariaLabel += ". ".concat(trackDurationReadable);
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
      const mergedOptions = __spreadValues(__spreadValues({}, dataOptions), options);
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
})();
//# sourceMappingURL=vidply.js.map
