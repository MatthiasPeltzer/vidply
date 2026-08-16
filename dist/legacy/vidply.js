/*!
 * VidPly v1.2.9 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
  var DOMUtils;
  var init_DOMUtils = __esm({
    "src/utils/DOMUtils.ts"() {
      "use strict";
      DOMUtils = {
        createElement: createElementImpl,
        show(element) {
          if (element == null ? void 0 : element.style) {
            element.style.display = "";
          }
        },
        hide(element) {
          if (element == null ? void 0 : element.style) {
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
          var _a;
          if (!element || !text) return;
          (_a = element.querySelector(`.${classPrefix}-tooltip`)) == null ? void 0 : _a.remove();
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
          var _a;
          (_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.add(className);
        },
        removeClass(element, className) {
          var _a;
          (_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.remove(className);
        },
        toggleClass(element, className) {
          var _a;
          (_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.toggle(className);
        },
        hasClass(element, className) {
          var _a;
          return ((_a = element == null ? void 0 : element.classList) == null ? void 0 : _a.contains(className)) ?? false;
        }
      };
    }
  });

  // src/i18n/languages/en.ts
  var en;
  var init_en = __esm({
    "src/i18n/languages/en.ts"() {
      "use strict";
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
          live: "Live",
          goLive: "Go to live broadcast",
          goLiveShort: "Live",
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
          liveSectionTitle: "Live stream controls",
          keys: {
            space: "Space"
          },
          actions: {
            "play-pause": "Play / Pause",
            "seek-backward": "Seek backward",
            "seek-forward": "Seek forward",
            "seek-forward-live": "Seek forward (when behind live)",
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
          },
          live: {
            skipBack: "Skip back",
            skipBackDesc: "{seconds} seconds — always available",
            skipForward: "Skip forward",
            skipForwardDesc: "{seconds} seconds — only when you are behind the live broadcast",
            goLive: "Go live",
            goLiveDesc: "Jump to the current live edge and resume playback",
            progress: "Progress bar",
            progressDesc: "Shows your position within the available rewind window; the right edge is live",
            liveBadge: "LIVE badge",
            liveBadgeDesc: "Shown at the live edge; when you rewind, the time before it shows how far behind live you are"
          }
        },
        speeds: {
          normal: "Normal"
        },
        time: {
          display: "Time display",
          durationPrefix: "Duration: ",
          behindLive: "{time} behind live",
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
        },
        trackInfo: {
          descriptionShow: "Show description",
          descriptionHide: "Hide description"
        }
      };
    }
  });

  // src/i18n/languages/de.ts
  var de_exports = {};
  __export(de_exports, {
    de: () => de
  });
  var de;
  var init_de = __esm({
    "src/i18n/languages/de.ts"() {
      "use strict";
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
          live: "Live",
          goLive: "Zurück zur Live-Übertragung",
          goLiveShort: "Live",
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
          floatingPlayer: "Schwebender Player",
          floatingPlayerClose: "Schwebenden Player schließen",
          floatingPlayerEnter: "Video ausklappen",
          floatingPlayerExit: "Video andocken",
          floatingPlayerDialog: "Schwebender Videoplayer. D zum Verschieben, R zum Größenändern, Escape zum Schließen.",
          download: "Herunterladen",
          downloadWithFormat: "Herunterladen {format}",
          downloadWithSize: "Herunterladen ({size})",
          downloadWithFormatSize: "Herunterladen {format} ({size})",
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
          signDragModeHint: "Verschiebemodus: Pfeiltasten zum Bewegen, Esc zum Beenden",
          signResizeModeHint: "Größenänderungsmodus: Pfeiltasten zum Ändern, Esc zum Beenden",
          signDragModeDisabled: "Verschiebemodus für Gebärdensprache-Video deaktiviert.",
          signResizeModeDisabled: "Größenänderungsmodus für Gebärdensprache-Video deaktiviert.",
          resizeHandle: "Größenänderung {direction}-Ecke",
          moreOptions: "Weitere Optionen",
          noMoreOptions: "Keine weiteren Optionen verfügbar",
          playing: "Wird abgespielt",
          paused: "Pausiert",
          muted: "Stummgeschaltet",
          unmuted: "Ton an",
          captionsOn: "Untertitel an",
          captionsOff: "Untertitel aus",
          volumePercent: "Lautstärke {percent} Prozent",
          volumePercentMuted: "Stummgeschaltet",
          speedRate: "Geschwindigkeit {rate}x"
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
          dragModeBadge: "Verschiebemodus: Pfeiltasten zum Bewegen, Esc zum Beenden",
          resizeModeBadge: "Resize-Modus: Kanten oder Ecken ziehen, Esc zum Beenden",
          positionReset: "Transkriptposition zurückgesetzt.",
          styleTranscript: "Transkript-Stileinstellungen öffnen",
          closeMenu: "Menü schließen",
          styleTitle: "Transkript-Stil",
          autoscroll: "Auto-Scroll",
          settingsMenu: "Transkript-Dialog-Einstellungen",
          showTimestamps: "Zeitstempel anzeigen",
          hideTimestamps: "Zeitstempel ausblenden",
          showTimestampsAria: "Zeitstempel im Transkript anzeigen",
          hideTimestampsAria: "Zeitstempel im Transkript ausblenden",
          seekTo: "Springe zu {time}"
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
        help: {
          title: "Tastaturkürzel",
          button: "Tastaturkürzel",
          close: "Schließen",
          or: "oder",
          liveSectionTitle: "Livestream-Steuerung",
          keys: {
            space: "Leertaste"
          },
          actions: {
            "play-pause": "Wiedergabe / Pause",
            "seek-backward": "Zurückspulen",
            "seek-forward": "Vorspulen",
            "seek-forward-live": "Vorspulen (wenn hinter Live)",
            "volume-up": "Lauter",
            "volume-down": "Leiser",
            "mute": "Stumm / Ton an",
            "captions": "Untertitel umschalten",
            "caption-style-menu": "Untertitel-Stil",
            "speed-down": "Langsamer",
            "speed-up": "Schneller",
            "speed-menu": "Wiedergabegeschwindigkeit",
            "quality-menu": "Qualität",
            "chapters-menu": "Kapitel",
            "transcript-toggle": "Transkript umschalten",
            "fullscreen": "Vollbild umschalten",
            "help": "Tastaturkürzel"
          },
          live: {
            skipBack: "Zurückspringen",
            skipBackDesc: "{seconds} Sekunden — immer verfügbar",
            skipForward: "Vorspringen",
            skipForwardDesc: "{seconds} Sekunden — nur wenn Sie hinter der Live-Übertragung sind",
            goLive: "Zurück zur Live-Übertragung",
            goLiveDesc: "Springt zur aktuellen Live-Position und setzt die Wiedergabe fort",
            progress: "Fortschrittsbalken",
            progressDesc: "Zeigt Ihre Position im verfügbaren Zurückspul-Fenster; der rechte Rand ist live",
            liveBadge: "LIVE-Kennzeichnung",
            liveBadgeDesc: "An der Live-Position sichtbar; nach dem Zurückspulen zeigt die Zeit davor, wie weit Sie hinter Live sind"
          }
        },
        speeds: {
          normal: "Normal"
        },
        time: {
          display: "Zeitanzeige",
          durationPrefix: "Dauer: ",
          behindLive: "{time} hinter Live",
          of: "von",
          hour: "{count} Stunde",
          hours: "{count} Stunden",
          minute: "{count} Minute",
          minutes: "{count} Minuten",
          second: "{count} Sekunde",
          seconds: "{count} Sekunden"
        },
        resume: {
          prompt: "Bei {time} fortsetzen?",
          resume: "Fortsetzen",
          startOver: "Von vorne"
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
        },
        trackInfo: {
          descriptionShow: "Beschreibung anzeigen",
          descriptionHide: "Beschreibung ausblenden"
        }
      };
    }
  });

  // src/i18n/languages/es.ts
  var es_exports = {};
  __export(es_exports, {
    es: () => es
  });
  var es;
  var init_es = __esm({
    "src/i18n/languages/es.ts"() {
      "use strict";
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
          live: "En directo",
          goLive: "Ir a la emisión en directo",
          goLiveShort: "Directo",
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
          floatingPlayer: "Reproductor flotante",
          floatingPlayerClose: "Cerrar reproductor flotante",
          floatingPlayerEnter: "Sacar el vídeo",
          floatingPlayerExit: "Anclar el vídeo",
          floatingPlayerDialog: "Reproductor de vídeo flotante. Pulsa D para mover, R para redimensionar, Escape para cerrar.",
          download: "Descargar",
          downloadWithFormat: "Descargar {format}",
          downloadWithSize: "Descargar ({size})",
          downloadWithFormatSize: "Descargar {format} ({size})",
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
          signDragModeHint: "Modo de arrastre: flechas para mover, Esc para salir",
          signResizeModeHint: "Modo de cambio de tamaño: flechas para redimensionar, Esc para salir",
          signDragModeDisabled: "Modo de arrastre del video en lengua de señas desactivado.",
          signResizeModeDisabled: "Modo de cambio de tamaño del video en lengua de señas desactivado.",
          resizeHandle: "Cambiar tamaño esquina {direction}",
          moreOptions: "Más opciones",
          noMoreOptions: "No hay opciones adicionales disponibles",
          playing: "Reproduciendo",
          paused: "En pausa",
          muted: "Silenciado",
          unmuted: "Sonido activado",
          captionsOn: "Subtítulos activados",
          captionsOff: "Subtítulos desactivados",
          volumePercent: "Volumen {percent} por ciento",
          volumePercentMuted: "Silenciado",
          speedRate: "Velocidad {rate}x"
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
          dragModeBadge: "Modo mover: flechas para mover, Esc para salir",
          resizeModeBadge: "Modo redimensionar: arrastra bordes o esquinas, Esc para salir",
          positionReset: "Posición de la transcripción restablecida.",
          styleTranscript: "Abrir configuración de estilo de transcripción",
          closeMenu: "Cerrar menú",
          styleTitle: "Estilo de Transcripción",
          autoscroll: "Desplazamiento automático",
          settingsMenu: "Configuración del diálogo de transcripción",
          showTimestamps: "Mostrar marcas de tiempo",
          hideTimestamps: "Ocultar marcas de tiempo",
          showTimestampsAria: "Mostrar marcas de tiempo en la transcripción",
          hideTimestampsAria: "Ocultar marcas de tiempo en la transcripción",
          seekTo: "Saltar a {time}"
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
        help: {
          title: "Atajos de teclado",
          button: "Atajos de teclado",
          close: "Cerrar",
          or: "o",
          liveSectionTitle: "Controles de emisión en directo",
          keys: {
            space: "Espacio"
          },
          actions: {
            "play-pause": "Reproducir / Pausar",
            "seek-backward": "Retroceder",
            "seek-forward": "Avanzar",
            "seek-forward-live": "Avanzar (cuando va retrasado respecto al directo)",
            "volume-up": "Subir volumen",
            "volume-down": "Bajar volumen",
            "mute": "Silenciar / Activar sonido",
            "captions": "Alternar subtítulos",
            "caption-style-menu": "Estilo de subtítulos",
            "speed-down": "Reducir velocidad",
            "speed-up": "Aumentar velocidad",
            "speed-menu": "Velocidad de reproducción",
            "quality-menu": "Calidad",
            "chapters-menu": "Capítulos",
            "transcript-toggle": "Alternar transcripción",
            "fullscreen": "Alternar pantalla completa",
            "help": "Atajos de teclado"
          },
          live: {
            skipBack: "Retroceder",
            skipBackDesc: "{seconds} segundos — siempre disponible",
            skipForward: "Avanzar",
            skipForwardDesc: "{seconds} segundos — solo cuando va retrasado respecto al directo",
            goLive: "Ir al directo",
            goLiveDesc: "Salta al punto en directo actual y reanuda la reproducción",
            progress: "Barra de progreso",
            progressDesc: "Muestra su posición dentro de la ventana de rebobinado; el borde derecho es el directo",
            liveBadge: "Indicador EN DIRECTO",
            liveBadgeDesc: "Visible en el directo; al rebobinar, la hora anterior muestra el retraso respecto al directo"
          }
        },
        speeds: {
          normal: "Normal"
        },
        time: {
          display: "Visualización de tiempo",
          durationPrefix: "Duración: ",
          behindLive: "{time} de retraso respecto al directo",
          of: "de",
          hour: "{count} hora",
          hours: "{count} horas",
          minute: "{count} minuto",
          minutes: "{count} minutos",
          second: "{count} segundo",
          seconds: "{count} segundos"
        },
        resume: {
          prompt: "¿Continuar desde {time}?",
          resume: "Continuar",
          startOver: "Empezar de nuevo"
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
        },
        trackInfo: {
          descriptionShow: "Mostrar descripción",
          descriptionHide: "Ocultar descripción"
        }
      };
    }
  });

  // src/i18n/languages/fr.ts
  var fr_exports = {};
  __export(fr_exports, {
    fr: () => fr
  });
  var fr;
  var init_fr = __esm({
    "src/i18n/languages/fr.ts"() {
      "use strict";
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
          live: "Direct",
          goLive: "Revenir au direct",
          goLiveShort: "Direct",
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
          floatingPlayer: "Lecteur flottant",
          floatingPlayerClose: "Fermer le lecteur flottant",
          floatingPlayerEnter: "Détacher la vidéo",
          floatingPlayerExit: "Rattacher la vidéo",
          floatingPlayerDialog: "Lecteur vidéo flottant. Appuyez sur D pour déplacer, R pour redimensionner, Échap pour fermer.",
          download: "Télécharger",
          downloadWithFormat: "Télécharger {format}",
          downloadWithSize: "Télécharger ({size})",
          downloadWithFormatSize: "Télécharger {format} ({size})",
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
          signDragModeHint: "Mode glissement : flèches pour déplacer, Échap pour quitter",
          signResizeModeHint: "Mode redimensionnement : flèches pour redimensionner, Échap pour quitter",
          signDragModeDisabled: "Mode glissement de la vidéo en langue des signes désactivé.",
          signResizeModeDisabled: "Mode redimensionnement de la vidéo en langue des signes désactivé.",
          resizeHandle: "Redimensionner coin {direction}",
          moreOptions: "Plus d'options",
          noMoreOptions: "Aucune option supplémentaire disponible",
          playing: "Lecture en cours",
          paused: "En pause",
          muted: "Muet",
          unmuted: "Son activé",
          captionsOn: "Sous-titres activés",
          captionsOff: "Sous-titres désactivés",
          volumePercent: "Volume {percent} pour cent",
          volumePercentMuted: "Muet",
          speedRate: "Vitesse {rate}x"
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
          dragModeBadge: "Mode déplacement : flèches pour déplacer, Échap pour quitter",
          resizeModeBadge: "Mode redimensionnement : faites glisser les bords ou les coins, Échap pour quitter",
          positionReset: "Position de la transcription réinitialisée.",
          styleTranscript: "Ouvrir les paramètres de style de transcription",
          closeMenu: "Fermer le menu",
          styleTitle: "Style de Transcription",
          autoscroll: "Défilement automatique",
          settingsMenu: "Paramètres de dialogue de transcription",
          showTimestamps: "Afficher les horodatages",
          hideTimestamps: "Masquer les horodatages",
          showTimestampsAria: "Afficher les horodatages dans la transcription",
          hideTimestampsAria: "Masquer les horodatages dans la transcription",
          seekTo: "Aller à {time}"
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
        help: {
          title: "Raccourcis clavier",
          button: "Raccourcis clavier",
          close: "Fermer",
          or: "ou",
          liveSectionTitle: "Commandes du direct",
          keys: {
            space: "Espace"
          },
          actions: {
            "play-pause": "Lecture / Pause",
            "seek-backward": "Reculer",
            "seek-forward": "Avancer",
            "seek-forward-live": "Avancer (en retard sur le direct)",
            "volume-up": "Augmenter le volume",
            "volume-down": "Baisser le volume",
            "mute": "Couper / Activer le son",
            "captions": "Activer/désactiver les sous-titres",
            "caption-style-menu": "Style des sous-titres",
            "speed-down": "Ralentir",
            "speed-up": "Accélérer",
            "speed-menu": "Vitesse de lecture",
            "quality-menu": "Qualité",
            "chapters-menu": "Chapitres",
            "transcript-toggle": "Activer/désactiver la transcription",
            "fullscreen": "Activer/désactiver le plein écran",
            "help": "Raccourcis clavier"
          },
          live: {
            skipBack: "Reculer",
            skipBackDesc: "{seconds} secondes — toujours disponible",
            skipForward: "Avancer",
            skipForwardDesc: "{seconds} secondes — uniquement en retard sur le direct",
            goLive: "Revenir au direct",
            goLiveDesc: "Rejoint le point live actuel et reprend la lecture",
            progress: "Barre de progression",
            progressDesc: "Indique votre position dans la fenêtre de retour arrière ; le bord droit est le direct",
            liveBadge: "Badge DIRECT",
            liveBadgeDesc: "Affiché au direct ; après un retour arrière, l’heure indique le retard sur le direct"
          }
        },
        speeds: {
          normal: "Normal"
        },
        time: {
          display: "Affichage du temps",
          durationPrefix: "Durée : ",
          behindLive: "{time} de retard sur le direct",
          of: "sur",
          hour: "{count} heure",
          hours: "{count} heures",
          minute: "{count} minute",
          minutes: "{count} minutes",
          second: "{count} seconde",
          seconds: "{count} secondes"
        },
        resume: {
          prompt: "Reprendre à {time} ?",
          resume: "Reprendre",
          startOver: "Recommencer"
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
        },
        trackInfo: {
          descriptionShow: "Afficher la description",
          descriptionHide: "Masquer la description"
        }
      };
    }
  });

  // src/i18n/languages/ja.ts
  var ja_exports = {};
  __export(ja_exports, {
    ja: () => ja
  });
  var ja;
  var init_ja = __esm({
    "src/i18n/languages/ja.ts"() {
      "use strict";
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
          live: "ライブ",
          goLive: "ライブ放送に戻る",
          goLiveShort: "ライブ",
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
          floatingPlayer: "フローティングプレーヤー",
          floatingPlayerClose: "フローティングプレーヤーを閉じる",
          floatingPlayerEnter: "ビデオを切り離す",
          floatingPlayerExit: "ビデオを戻す",
          floatingPlayerDialog: "フローティング動画プレーヤー。Dキーで移動、Rキーでサイズ変更、Escで閉じる。",
          download: "ダウンロード",
          downloadWithFormat: "{format} をダウンロード",
          downloadWithSize: "ダウンロード ({size})",
          downloadWithFormatSize: "{format} をダウンロード ({size})",
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
          signDragModeHint: "ドラッグモード：矢印キーで移動、Escで終了",
          signResizeModeHint: "サイズ変更モード：矢印キーでサイズ変更、Escで終了",
          signDragModeDisabled: "手話動画のドラッグモードを無効にしました。",
          signResizeModeDisabled: "手話動画のサイズ変更モードを無効にしました。",
          resizeHandle: "{direction}コーナーのサイズ変更",
          moreOptions: "その他のオプション",
          noMoreOptions: "追加のオプションはありません",
          playing: "再生中",
          paused: "一時停止中",
          muted: "ミュート中",
          unmuted: "ミュート解除",
          captionsOn: "字幕オン",
          captionsOff: "字幕オフ",
          volumePercent: "音量 {percent} パーセント",
          volumePercentMuted: "ミュート",
          speedRate: "速度 {rate}x"
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
          dragModeBadge: "移動モード：矢印キーで移動、Escで終了",
          resizeModeBadge: "サイズ変更モード：辺や角をドラッグ、Escで終了",
          positionReset: "文字起こしの位置をリセットしました。",
          styleTranscript: "文字起こしスタイル設定を開く",
          closeMenu: "メニューを閉じる",
          styleTitle: "文字起こしスタイル",
          autoscroll: "自動スクロール",
          settingsMenu: "文字起こしダイアログ設定",
          showTimestamps: "タイムスタンプを表示",
          hideTimestamps: "タイムスタンプを非表示",
          showTimestampsAria: "文字起こしにタイムスタンプを表示",
          hideTimestampsAria: "文字起こしのタイムスタンプを非表示",
          seekTo: "{time} へ移動"
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
        help: {
          title: "キーボードショートカット",
          button: "キーボードショートカット",
          close: "閉じる",
          or: "または",
          liveSectionTitle: "ライブストリームの操作",
          keys: {
            space: "スペース"
          },
          actions: {
            "play-pause": "再生 / 一時停止",
            "seek-backward": "巻き戻し",
            "seek-forward": "早送り",
            "seek-forward-live": "早送り（ライブより遅れているとき）",
            "volume-up": "音量を上げる",
            "volume-down": "音量を下げる",
            "mute": "ミュート / ミュート解除",
            "captions": "字幕の切り替え",
            "caption-style-menu": "字幕スタイル",
            "speed-down": "速度を下げる",
            "speed-up": "速度を上げる",
            "speed-menu": "再生速度",
            "quality-menu": "画質",
            "chapters-menu": "チャプター",
            "transcript-toggle": "文字起こしの切り替え",
            "fullscreen": "全画面表示の切り替え",
            "help": "キーボードショートカット"
          },
          live: {
            skipBack: "巻き戻し",
            skipBackDesc: "{seconds} 秒 — 常に利用可能",
            skipForward: "早送り",
            skipForwardDesc: "{seconds} 秒 — ライブより遅れているときのみ",
            goLive: "ライブに戻る",
            goLiveDesc: "現在のライブ位置に移動して再生を再開します",
            progress: "プログレスバー",
            progressDesc: "巻き戻し可能な範囲内の位置を示します。右端がライブです",
            liveBadge: "LIVE 表示",
            liveBadgeDesc: "ライブ位置では LIVE のみ表示。巻き戻すと、その前にライブからの遅れが表示されます"
          }
        },
        speeds: {
          normal: "通常"
        },
        time: {
          display: "時間表示",
          durationPrefix: "再生時間: ",
          behindLive: "ライブより {time} 遅れ",
          of: "/",
          hour: "{count}時間",
          hours: "{count}時間",
          minute: "{count}分",
          minutes: "{count}分",
          second: "{count}秒",
          seconds: "{count}秒"
        },
        resume: {
          prompt: "{time}から再開しますか？",
          resume: "再開",
          startOver: "最初から"
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
        },
        trackInfo: {
          descriptionShow: "説明を表示",
          descriptionHide: "説明を非表示"
        }
      };
    }
  });

  // src/i18n/translations.ts
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
    "src/i18n/translations.ts"() {
      "use strict";
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

  // src/utils/Sanitize.ts
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
  var PROTO_FORBIDDEN_KEYS;
  var init_Sanitize = __esm({
    "src/utils/Sanitize.ts"() {
      "use strict";
      PROTO_FORBIDDEN_KEYS = Object.freeze(
        /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"])
      );
    }
  });

  // src/i18n/i18n.ts
  function escapeRegExp(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function deepSanitizeTranslations(input) {
    return deepSanitize(input);
  }
  var I18n, i18n;
  var init_i18n = __esm({
    "src/i18n/i18n.ts"() {
      "use strict";
      init_translations();
      init_Sanitize();
      I18n = class {
        constructor() {
          __publicField(this, "currentLanguage");
          __publicField(this, "translations");
          __publicField(this, "loadingPromises");
          __publicField(this, "builtInLanguageLoaders");
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
              const value2 = String(replacement);
              result = result.replace(new RegExp(`\\{${safe}\\}`, "g"), () => value2);
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
            var _a;
            const signals = [];
            if (options.signal) signals.push(options.signal);
            if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
              signals.push(AbortSignal.timeout(options.timeoutMs ?? 8e3));
            }
            const signal = signals.length === 0 ? void 0 : signals.length === 1 ? signals[0] : ((_a = AbortSignal.any) == null ? void 0 : _a.call(AbortSignal, signals)) ?? signals[0];
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
      i18n = new I18n();
    }
  });

  // src/utils/TimeUtils.ts
  var TimeUtils;
  var init_TimeUtils = __esm({
    "src/utils/TimeUtils.ts"() {
      "use strict";
      init_i18n();
      TimeUtils = {
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
        parseTime(timeString) {
          const parts = timeString.split(":").map((p) => parseInt(p, 10));
          if (parts.length === 3) {
            return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
          } else if (parts.length === 2) {
            return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
          } else if (parts.length === 1) {
            return parts[0] ?? 0;
          }
          return 0;
        },
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
        formatPercentage(value, total) {
          if (total === 0) return 0;
          return Math.round(value / total * 100);
        },
        /** Visual offset from the live edge, e.g. "−12:34". */
        formatBehindLive(seconds) {
          if (!Number.isFinite(seconds) || seconds <= 0) {
            return `−00:00`;
          }
          return `−${TimeUtils.formatTime(seconds)}`;
        }
      };
    }
  });

  // src/icons/Icons.ts
  function createIconElement(name, className = "") {
    const wrapper = document.createElement("span");
    wrapper.className = `vidply-icon ${className}`.trim();
    wrapper.setAttribute("aria-hidden", "true");
    const template = iconTemplates[name] || iconTemplates.play;
    if (template) {
      wrapper.appendChild(template.cloneNode(true));
    }
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
    const filterId = `vidply-play-shadow-${Math.random().toString(36).slice(2, 11)}`;
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
  var iconPaths, svgWrapper, Icons, iconTemplates;
  var init_Icons = __esm({
    "src/icons/Icons.ts"() {
      "use strict";
      iconPaths = {
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
        audioDescription: `<rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="12" y="14.5" text-anchor="middle" font-size="8" font-weight="bold" font-family="Arial, sans-serif" fill="currentColor">AD</text>`,
        audioDescriptionOn: `<rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor"/><text x="12" y="14.5" text-anchor="middle" font-size="8" font-weight="bold" font-family="Arial, sans-serif" class="vidply-icon-ad-fg">AD</text>`,
        signLanguage: `<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>`,
        signLanguageOn: `<g transform="scale(1.5)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g>`,
        signLanguagePip: `<g transform="scale(1.2) translate(1, 1)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g><polygon points="14,23 23,14 23,23" fill="currentColor"/>`,
        signLanguagePipOn: `<g transform="scale(1.2) translate(1, 1)"><path d="M16 11.3c-.1-.9-4.8 1.3-5.4 1.1-2.6-1 5.8-1.3 5.1-2.9s-5.1 1.5-6 1.4C6.5 9.4 16.5 9.1 13.5 8c-1.9-.6-8.8 2.9-6.8.4.7-.6.7-1.9-.7-1.7-9.7 7.2-.7 12.2 8.8 7 0-1.3-3.5.4-4.1.4-2.6 0 5.6-2 5.4-3ZM3.9 7.8c3.2-4.2 3.7 1.2 6 .1s.2-.2.2-.3c.7-2.7 2.5-7.5-1.5-1.3-1.6 0 1.1-4 1-4.6C8.9-1 7.3 4.4 7.2 4.9c-1.6.7-.9-1.4-.7-1.5 3-6-.6-3.1-.9.4-2.5 1.8 0-2.8 0-3.5C2.8-.9 4 9.4 1.1 4.9S.1 4.6 0 5c-.4 2.7 2.6 7.2 3.9 2.8Z"/></g><polygon points="14,23 23,14 23,23" fill="currentColor"/>`,
        music: `<path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7zm-1.5 16c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>`,
        moreVertical: `<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>`,
        move: `<path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>`,
        resize: `<path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v2.5L7 11l3-3.5V10h4V7.5l3 3.5-3 3.5z"/>`,
        clock: `<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>`,
        download: `<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>`,
        help: `<path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>`,
        chevronDown: `<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>`,
        chevronUp: `<path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/>`
      };
      svgWrapper = (paths) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">${paths}</svg>`;
      Icons = Object.fromEntries(
        Object.entries(iconPaths).map(([key, value]) => [key, svgWrapper(value)])
      );
      iconTemplates = (() => {
        const parser = new DOMParser();
        const templates = {};
        for (const [key, paths] of Object.entries(iconPaths)) {
          const doc = parser.parseFromString(svgWrapper(paths), "image/svg+xml");
          const root = doc.documentElement;
          if (root && root.nodeName.toLowerCase() === "svg" && !root.querySelector("parsererror")) {
            templates[key] = root;
          }
        }
        return templates;
      })();
    }
  });

  // src/utils/FocusUtils.ts
  function getFocusableElements(container) {
    if (!container) {
      return [];
    }
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1"
    );
  }
  function trapFocusInContainer(e, container) {
    if (e.key !== "Tab" || !container) {
      return false;
    }
    const focusable = getFocusableElements(container).filter(
      (el) => el.offsetParent !== null || container.contains(el)
    );
    if (focusable.length === 0) {
      return false;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return false;
    }
    const active = document.activeElement;
    const within = active !== null && container.contains(active);
    if (e.shiftKey) {
      if (!within || active === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
        return true;
      }
    } else if (!within || active === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
      return true;
    }
    return false;
  }
  function setContainerChildrenInert(container, except, enabled, tracked) {
    if (!enabled) {
      for (const el of tracked) {
        el.removeAttribute("inert");
      }
      return [];
    }
    const next = [];
    for (const child of Array.from(container.children)) {
      if (child === except) {
        continue;
      }
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      const tag = child.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") {
        continue;
      }
      if (!child.hasAttribute("inert")) {
        child.setAttribute("inert", "");
        next.push(child);
      }
    }
    return next;
  }
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
  var FOCUSABLE_SELECTOR;
  var init_FocusUtils = __esm({
    "src/utils/FocusUtils.ts"() {
      "use strict";
      FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    }
  });

  // src/utils/PerformanceUtils.ts
  function debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  function throttle(func, limit = 100) {
    let inThrottle = false;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  function isMobile(breakpoint = 768) {
    return window.innerWidth < breakpoint;
  }
  function prefersReducedMotion() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function reducedMotionScrollOptions(block = "nearest") {
    return { behavior: prefersReducedMotion() ? "auto" : "smooth", block };
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
  var init_PerformanceUtils = __esm({
    "src/utils/PerformanceUtils.ts"() {
      "use strict";
    }
  });

  // src/controls/CaptionStyleMenu.ts
  var CaptionStyleMenu_exports = {};
  __export(CaptionStyleMenu_exports, {
    showCaptionStyleMenu: () => showCaptionStyleMenu
  });
  function captionStylePropertyName(property) {
    const stripped = property.replace("captions", "");
    return stripped.charAt(0).toLowerCase() + stripped.slice(1);
  }
  function createStyleControl(player, label, property, options) {
    const group = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-style-group`
    });
    const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;
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
      className: `${player.options.classPrefix}-style-select`,
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
    const currentValue = player.options[property];
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
      player.options[property] = e.target.value;
      if (player.captionManager) {
        player.captionManager.setCaptionStyle(
          captionStylePropertyName(property),
          e.target.value
        );
      }
    });
    group.appendChild(select);
    return group;
  }
  function createColorControl(player, label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-style-group`
    });
    const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;
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
        value: String(player.options[property] ?? "")
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
      player.options[property] = e.target.value;
      if (player.captionManager) {
        player.captionManager.setCaptionStyle(
          captionStylePropertyName(property),
          e.target.value
        );
      }
    });
    group.appendChild(input);
    return group;
  }
  function createOpacityControl(player, label, property) {
    const group = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-style-group`
    });
    const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;
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
      textContent: Math.round(Number(player.options[property] ?? 0) * 100) + "%",
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
        value: String(player.options[property])
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
      player.options[property] = value;
      if (player.captionManager) {
        player.captionManager.setCaptionStyle(
          captionStylePropertyName(property),
          value
        );
      }
    });
    group.appendChild(input);
    return group;
  }
  function showCaptionStyleMenu(controlBar, button) {
    const player = controlBar.player;
    const existingMenu = player.container.querySelector(`.${player.options.classPrefix}-caption-style-menu`);
    if (existingMenu) {
      existingMenu.remove();
      button.setAttribute("aria-expanded", "false");
      if (controlBar.openMenu === existingMenu) {
        controlBar.openMenu = null;
        controlBar.openMenuButton = null;
      }
      return;
    }
    const menuLabelId = `${player.options.classPrefix}-caption-style-label-${player.instanceId || ""}`;
    const menu = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-caption-style-menu ${player.options.classPrefix}-menu ${player.options.classPrefix}-settings-menu`,
      attributes: {
        "role": "dialog",
        "aria-modal": "true",
        "aria-labelledby": menuLabelId
      }
    });
    const visuallyHiddenLabel = DOMUtils.createElement("h2", {
      textContent: i18n.t("player.captionStyling"),
      attributes: { id: menuLabelId, class: `${player.options.classPrefix}-sr-only` },
      style: {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0"
      }
    });
    menu.appendChild(visuallyHiddenLabel);
    menu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    if (!player.captionManager || player.captionManager.tracks.length === 0) {
      const noTracksItem = DOMUtils.createElement("div", {
        className: `${player.options.classPrefix}-menu-item`,
        textContent: i18n.t("player.noCaptions"),
        attributes: {
          "role": "status"
        },
        style: { opacity: "0.5", cursor: "default", padding: "12px 16px" }
      });
      menu.appendChild(noTracksItem);
      menu.style.visibility = "hidden";
      menu.style.display = "block";
      controlBar.insertMenuIntoDOM(menu, button);
      controlBar.positionMenu(menu, button, true);
      requestAnimationFrame(() => {
        menu.style.visibility = "visible";
      });
      controlBar.attachMenuCloseHandler(menu, button, true);
      return;
    }
    menu.appendChild(createStyleControl(
      player,
      i18n.t("styleLabels.fontSize"),
      "captionsFontSize",
      [
        { label: i18n.t("fontSizes.small"), value: "87.5%" },
        { label: i18n.t("fontSizes.normal"), value: "100%" },
        { label: i18n.t("fontSizes.large"), value: "125%" },
        { label: i18n.t("fontSizes.xlarge"), value: "150%" }
      ]
    ));
    menu.appendChild(createStyleControl(
      player,
      i18n.t("styleLabels.font"),
      "captionsFontFamily",
      [
        { label: i18n.t("fontFamilies.sansSerif"), value: "sans-serif" },
        { label: i18n.t("fontFamilies.serif"), value: "serif" },
        { label: i18n.t("fontFamilies.monospace"), value: "monospace" }
      ]
    ));
    menu.appendChild(createColorControl(player, i18n.t("styleLabels.textColor"), "captionsColor"));
    menu.appendChild(createColorControl(player, i18n.t("styleLabels.background"), "captionsBackgroundColor"));
    menu.appendChild(createOpacityControl(player, i18n.t("styleLabels.opacity"), "captionsOpacity"));
    menu.style.minWidth = "220px";
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    controlBar.insertMenuIntoDOM(menu, button);
    controlBar.positionMenu(menu, button, true);
    requestAnimationFrame(() => {
      menu.style.visibility = "visible";
    });
    controlBar.attachMenuCloseHandler(menu, button, true);
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        trapFocusInContainer(e, menu);
      }
    });
    focusFirstElement(menu, `.${player.options.classPrefix}-style-select`);
  }
  var init_CaptionStyleMenu = __esm({
    "src/controls/CaptionStyleMenu.ts"() {
      "use strict";
      init_DOMUtils();
      init_i18n();
      init_FocusUtils();
    }
  });

  // src/utils/StorageManager.ts
  function clamp(n, min, max) {
    if (!Number.isFinite(n)) return min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }
  function isFiniteNonNegative(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
  function isWatchProgressEntry(value) {
    if (!value || typeof value !== "object") return false;
    const v = value;
    return isFiniteNonNegative(v.currentTime) && isFiniteNonNegative(v.duration) && typeof v.percentage === "number" && Number.isFinite(v.percentage) && typeof v.updatedAt === "number" && Number.isFinite(v.updatedAt);
  }
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function isWatchProgressMap(value) {
    if (!isPlainObject(value)) return false;
    for (const entry of Object.values(value)) {
      if (!isWatchProgressEntry(entry)) return false;
    }
    return true;
  }
  var _StorageManager, StorageManager;
  var init_StorageManager = __esm({
    "src/utils/StorageManager.ts"() {
      "use strict";
      init_Sanitize();
      _StorageManager = class _StorageManager {
        constructor(namespace = "vidply") {
          __publicField(this, "namespace");
          __publicField(this, "storage");
          this.namespace = namespace;
          this.storage = this.isStorageAvailable() ? localStorage : null;
        }
        /**
         * `localStorage` access can throw in private-browsing modes (Safari) and
         * is undefined in non-DOM environments. Both are tolerated here so the
         * Player still works (without persistence) when storage is unavailable.
         */
        isStorageAvailable() {
          try {
            if (typeof localStorage === "undefined") return false;
            const test = "__storage_test__";
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
          } catch {
            return false;
          }
        }
        getKey(key) {
          return `${this.namespace}_${key}`;
        }
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
         * Generic get. Accepts an optional `validator` so callers can assert the
         * runtime shape of the parsed JSON before trusting it. Falls back to
         * `defaultValue` if the payload fails validation.
         */
        get(key, defaultValue = null, validator) {
          if (!this.storage) return defaultValue;
          try {
            const namespacedKey = this.getKey(key);
            const raw = this.storage.getItem(namespacedKey);
            if (raw === null) return defaultValue;
            const parsed = JSON.parse(raw);
            if (validator && !validator(parsed)) {
              console.warn(`[VidPly] Discarding malformed localStorage payload for "${key}"`);
              return defaultValue;
            }
            return parsed;
          } catch (e) {
            console.warn("Failed to read from localStorage:", e);
            return defaultValue;
          }
        }
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
        clear() {
          if (!this.storage) return false;
          try {
            const storage = this.storage;
            const keys = Object.keys(storage);
            keys.forEach((key) => {
              if (key.startsWith(this.namespace)) {
                storage.removeItem(key);
              }
            });
            return true;
          } catch (e) {
            console.warn("Failed to clear localStorage:", e);
            return false;
          }
        }
        saveTranscriptPreferences(preferences) {
          return this.set("transcript_preferences", shallowSanitize(preferences));
        }
        getTranscriptPreferences() {
          return this.get(
            "transcript_preferences",
            null,
            isPlainObject
          );
        }
        saveCaptionPreferences(preferences) {
          return this.set("caption_preferences", shallowSanitize(preferences));
        }
        getCaptionPreferences() {
          return this.get("caption_preferences", null, isPlainObject);
        }
        savePlayerPreferences(preferences) {
          const sanitized = shallowSanitize(preferences);
          if (typeof sanitized.volume === "number") {
            sanitized.volume = clamp(sanitized.volume, 0, 1);
          }
          if (typeof sanitized.playbackSpeed === "number") {
            sanitized.playbackSpeed = clamp(sanitized.playbackSpeed, 0.1, 4);
          }
          return this.set("player_preferences", sanitized);
        }
        getPlayerPreferences() {
          const value = this.get("player_preferences", null, isPlainObject);
          if (!value) return null;
          if (typeof value.volume === "number") {
            value.volume = clamp(value.volume, 0, 1);
          }
          if (typeof value.playbackSpeed === "number") {
            value.playbackSpeed = clamp(value.playbackSpeed, 0.1, 4);
          }
          return value;
        }
        saveSignLanguagePreferences(preferences) {
          return this.set("sign_language_preferences", shallowSanitize(preferences));
        }
        getSignLanguagePreferences() {
          return this.get("sign_language_preferences", null, isPlainObject);
        }
        saveFloatingPreferences(preferences) {
          return this.set("floating_preferences", shallowSanitize(preferences));
        }
        getFloatingPreferences() {
          return this.get("floating_preferences", null, isPlainObject);
        }
        /**
         * Persist watch progress for a video id. Numeric inputs are validated +
         * clamped so a caller cannot poison the store with `Infinity`/negatives.
         */
        saveWatchProgress(videoId, currentTime, duration) {
          if (typeof videoId !== "string" || !videoId) return false;
          if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return false;
          const safeDuration = clamp(duration, 1e-3, 24 * 60 * 60);
          const safeCurrent = clamp(currentTime, 0, safeDuration);
          const allProgress = this.get(
            "watch_progress",
            /* @__PURE__ */ Object.create(null),
            isWatchProgressMap
          ) ?? /* @__PURE__ */ Object.create(null);
          const percentage = safeCurrent / safeDuration * 100;
          allProgress[videoId] = {
            currentTime: safeCurrent,
            duration: safeDuration,
            percentage: clamp(percentage, 0, 100),
            updatedAt: Date.now()
          };
          const entries = Object.entries(allProgress);
          if (entries.length > _StorageManager.MAX_WATCH_PROGRESS_ENTRIES) {
            entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
            const toRemove = entries.length - _StorageManager.MAX_WATCH_PROGRESS_ENTRIES;
            for (let i = 0; i < toRemove; i++) {
              const entry = entries[i];
              if (entry) {
                delete allProgress[entry[0]];
              }
            }
          }
          return this.set("watch_progress", allProgress);
        }
        getWatchProgress(videoId) {
          if (!videoId) return null;
          const allProgress = this.get(
            "watch_progress",
            /* @__PURE__ */ Object.create(null),
            isWatchProgressMap
          ) ?? /* @__PURE__ */ Object.create(null);
          const entry = allProgress[videoId];
          return entry && isWatchProgressEntry(entry) ? entry : null;
        }
        clearWatchProgress(videoId) {
          if (!videoId) return false;
          const allProgress = this.get(
            "watch_progress",
            /* @__PURE__ */ Object.create(null),
            isWatchProgressMap
          ) ?? /* @__PURE__ */ Object.create(null);
          if (allProgress[videoId]) {
            delete allProgress[videoId];
            return this.set("watch_progress", allProgress);
          }
          return true;
        }
      };
      __publicField(_StorageManager, "MAX_WATCH_PROGRESS_ENTRIES", 100);
      StorageManager = _StorageManager;
    }
  });

  // src/utils/TrackLabelUtils.ts
  function deriveTrackLabel(rawLabel, language, fallbackKey = "player.captions") {
    const cleanLabel = (rawLabel ?? "").trim();
    const cleanLang = (language ?? "").trim();
    const looksLikePlaceholder = cleanLabel === "" || /^\d+$/.test(cleanLabel) || /^(null|undefined)$/i.test(cleanLabel);
    if (!looksLikePlaceholder) {
      return cleanLabel;
    }
    const cleanLangIsUsable = cleanLang !== "" && !/^(null|undefined)$/i.test(cleanLang);
    if (cleanLangIsUsable) {
      try {
        const displayNames = new Intl.DisplayNames([cleanLang, "en"], { type: "language" });
        const name = displayNames.of(cleanLang);
        if (name && name.toLowerCase() !== cleanLang.toLowerCase()) {
          return name;
        }
      } catch {
      }
      return cleanLang.toUpperCase();
    }
    return i18n.t(fallbackKey);
  }
  var init_TrackLabelUtils = __esm({
    "src/utils/TrackLabelUtils.ts"() {
      "use strict";
      init_i18n();
    }
  });

  // src/controls/CaptionManager.ts
  var CaptionManager;
  var init_CaptionManager = __esm({
    "src/controls/CaptionManager.ts"() {
      "use strict";
      init_DOMUtils();
      init_i18n();
      init_StorageManager();
      init_PerformanceUtils();
      init_TrackLabelUtils();
      CaptionManager = class {
        constructor(player) {
          __publicField(this, "player");
          __publicField(this, "_altCueChangeHandler", null);
          __publicField(this, "cueChangeHandler", null);
          __publicField(this, "currentCue");
          __publicField(this, "currentTrack");
          __publicField(this, "debouncedPositionCaptions");
          __publicField(this, "element");
          __publicField(this, "storage");
          __publicField(this, "tracks");
          this.player = player;
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
            if (typeof saved.fontSize === "string") this.player.options.captionsFontSize = saved.fontSize;
            if (typeof saved.fontFamily === "string") this.player.options.captionsFontFamily = saved.fontFamily;
            if (typeof saved.color === "string") this.player.options.captionsColor = saved.color;
            if (typeof saved.backgroundColor === "string") this.player.options.captionsBackgroundColor = saved.backgroundColor;
            if (typeof saved.opacity === "number") this.player.options.captionsOpacity = saved.opacity;
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
              "aria-label": i18n.t("player.captions"),
              "aria-live": "polite"
            }
          });
          this.updateStyles();
          const target = this.player.videoWrapper || this.player.container;
          target.appendChild(this.element);
        }
        loadTracks() {
          const textTracks = this.player.element.textTracks;
          let defaultTrackIndex = -1;
          const seen = /* @__PURE__ */ new Map();
          for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            if (!track) continue;
            if ((track.kind === "subtitles" || track.kind === "captions") && !track._vidplyStale) {
              track.mode = "hidden";
              const dedupeKey = `${track.language}|${track.label}`;
              const existing = seen.get(dedupeKey);
              if (existing) {
                existing.alternatives.push(track);
                continue;
              }
              const trackElement = this.player.findTrackElement(track);
              const isDefault = trackElement ? trackElement.hasAttribute("default") : false;
              const entry = {
                track,
                language: track.language,
                label: deriveTrackLabel(track.label, track.language),
                kind: track.kind,
                index: i,
                isDefault,
                alternatives: []
              };
              this.tracks.push(entry);
              seen.set(dedupeKey, entry);
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
        /**
         * Sync hls.js subtitle rendition to match the given language.
         * Matches by lang, language, or falls back to name/label.
         */
        _syncHlsSubtitleTrack(targetLang, targetLabel) {
          var _a;
          const renderer = this.player.renderer;
          if (!(renderer == null ? void 0 : renderer.hls) || !((_a = renderer.hls.subtitleTracks) == null ? void 0 : _a.length)) return;
          const tracks = renderer.hls.subtitleTracks;
          const normalizedTarget = targetLang.trim();
          let hlsIndex = normalizedTarget !== "" ? tracks.findIndex((t) => {
            const tLang = (t.lang || t.language || "").trim();
            return tLang === normalizedTarget || tLang !== "" && (tLang.startsWith(normalizedTarget) || normalizedTarget.startsWith(tLang));
          }) : -1;
          if (hlsIndex < 0 && targetLabel) {
            hlsIndex = tracks.findIndex(
              (t) => t.name === targetLabel
            );
          }
          if (hlsIndex < 0 && tracks.length > 0) {
            const defaultIndex = tracks.findIndex((t) => t.default);
            hlsIndex = defaultIndex >= 0 ? defaultIndex : 0;
          }
          if (hlsIndex >= 0 && renderer.hls.subtitleTrack !== hlsIndex) {
            renderer.hls.subtitleTrack = hlsIndex;
            this.player.log(`HLS subtitle track set to index ${hlsIndex} (${targetLang || targetLabel || "default"})`, "info");
          }
        }
        attachEvents() {
          this.player.on("timeupdate", () => {
            this.updateCaptions();
          });
          this.player.on("textcuesupdate", () => {
            this.updateCaptions();
          });
          this.player.on("captionschange", () => {
            this.updateStyles();
          });
          this.debouncedPositionCaptions = debounce(() => {
            this.positionCaptionsOnMobile();
          }, 150);
          window.addEventListener("resize", this.debouncedPositionCaptions, {
            signal: this.player.lifecycleSignal
          });
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
          this._cleanupTrackListeners();
          const selectedTrack = this.tracks[trackIndex];
          if (selectedTrack && selectedTrack.track) {
            selectedTrack.track.mode = "hidden";
            this.currentTrack = selectedTrack;
            this.player.state.captionsEnabled = true;
            if (selectedTrack.language) {
              this.element.setAttribute("lang", selectedTrack.language);
            }
            const cueChangeHandler = () => {
              this.updateCaptions();
            };
            this.cueChangeHandler = cueChangeHandler;
            selectedTrack.track.addEventListener("cuechange", cueChangeHandler);
            if (selectedTrack.alternatives && selectedTrack.alternatives.length > 0) {
              const altCueChangeHandler = () => {
                if (this.currentTrack !== selectedTrack) return;
                for (const alt of selectedTrack.alternatives) {
                  if (alt.activeCues && alt.activeCues.length > 0) {
                    this.player.log(`Switching to alternative caption track for "${selectedTrack.label}"`, "info");
                    selectedTrack.track.removeEventListener("cuechange", cueChangeHandler);
                    selectedTrack.alternatives.forEach((a) => a.removeEventListener("cuechange", altCueChangeHandler));
                    selectedTrack.track = alt;
                    selectedTrack.track.addEventListener("cuechange", cueChangeHandler);
                    this._altCueChangeHandler = null;
                    this.updateCaptions();
                    return;
                  }
                }
              };
              this._altCueChangeHandler = altCueChangeHandler;
              selectedTrack.alternatives.forEach((alt) => {
                alt.mode = "hidden";
                alt.addEventListener("cuechange", altCueChangeHandler);
              });
            }
            const trackElement = this.player.findTrackElement(selectedTrack.track);
            const ensureTrackReady = () => {
              if (trackElement && trackElement.readyState < 2) {
                const onTrackLoad = () => {
                  trackElement.removeEventListener("load", onTrackLoad);
                  trackElement.removeEventListener("error", onTrackLoad);
                  requestAnimationFrame(() => {
                    if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                      this.updateCaptions();
                    }
                  });
                };
                trackElement.addEventListener("load", onTrackLoad, { once: true });
                trackElement.addEventListener("error", onTrackLoad, { once: true });
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
            this._syncHlsSubtitleTrack(selectedTrack.language, selectedTrack.label);
            this.player.emit("captionsenabled", selectedTrack);
          }
        }
        _cleanupTrackListeners() {
          if (this.currentTrack && this.currentTrack.track) {
            const cueChangeHandler = this.cueChangeHandler;
            if (cueChangeHandler) {
              this.currentTrack.track.removeEventListener("cuechange", cueChangeHandler);
            }
            const altCueChangeHandler = this._altCueChangeHandler;
            if (altCueChangeHandler && this.currentTrack.alternatives) {
              this.currentTrack.alternatives.forEach((alt) => {
                alt.removeEventListener("cuechange", altCueChangeHandler);
              });
            }
            this.currentTrack.track.mode = "hidden";
          }
          this._altCueChangeHandler = null;
        }
        disable() {
          this._cleanupTrackListeners();
          this.currentTrack = null;
          this.element.style.display = "none";
          this.element.replaceChildren();
          this.element.removeAttribute("lang");
          this.currentCue = null;
          this.player.state.captionsEnabled = false;
          this.player.emit("captionsdisabled");
        }
        updateCaptions() {
          var _a, _b;
          if (!this.currentTrack || !this.currentTrack.track) {
            return;
          }
          if ((_b = (_a = this.player.renderer) == null ? void 0 : _a.handlesOwnCaptions) == null ? void 0 : _b.call(_a)) {
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
                this.element.replaceChildren();
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
              const rawText = cue.text || "";
              if (!rawText.trim()) {
                return;
              }
              const fragment = DOMUtils.renderVTTToDOM(rawText);
              if (isAudioPlayer) {
                const existingCues = this.element.querySelectorAll(`.${this.player.options.classPrefix}-caption-cue`);
                existingCues.forEach((el) => el.classList.remove(`${this.player.options.classPrefix}-caption-active`));
                const cueId = `cue-${cue.startTime}-${cue.endTime}`;
                let cueElement = this.element.querySelector(`[data-cue-id="${cueId}"]`);
                if (!cueElement) {
                  cueElement = document.createElement("div");
                  cueElement.className = `${this.player.options.classPrefix}-caption-cue`;
                  cueElement.setAttribute("data-cue-id", cueId);
                  cueElement.replaceChildren(fragment);
                  this.element.appendChild(cueElement);
                } else {
                  cueElement.replaceChildren(fragment);
                }
                cueElement.classList.add(`${this.player.options.classPrefix}-caption-active`);
                requestAnimationFrame(() => {
                  if (cueElement) {
                    cueElement.scrollIntoView(reducedMotionScrollOptions("center"));
                  }
                });
              } else {
                this.element.replaceChildren(fragment);
              }
              this.element.style.display = "block";
              this.positionCaptionsOnMobile();
              this.player.emit("captionchange", cue);
            }
          } else if (this.currentCue) {
            if (!isAudioPlayer) {
              this.element.replaceChildren();
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
            if (!this.player.videoWrapper) return;
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
        // VTT formatting is parsed via DOMUtils.renderVTTToDOM() which returns
        // a DocumentFragment built with createElement / createTextNode. The
        // previous regex-based parseVTTFormatting helper was removed because
        // it produced strings that were assigned to `innerHTML`, which is
        // unsafe for cue text from third-party WebVTT sources.
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
          if (result && result[1] && result[2] && result[3]) {
            return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
          }
          return hex;
        }
        setCaptionStyle(property, value) {
          switch (property) {
            case "fontSize":
              this.player.options.captionsFontSize = String(value);
              break;
            case "fontFamily":
              this.player.options.captionsFontFamily = String(value);
              break;
            case "color":
              this.player.options.captionsColor = String(value);
              break;
            case "backgroundColor":
              this.player.options.captionsBackgroundColor = String(value);
              break;
            case "opacity":
              this.player.options.captionsOpacity = Number(value);
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
        /**
         * Refresh tracks list - useful when HLS adds subtitle tracks dynamically
         */
        refreshTracks() {
          var _a;
          const currentLanguage = (_a = this.currentTrack) == null ? void 0 : _a.language;
          const wasEnabled = this.player.state.captionsEnabled;
          if (this.currentTrack) {
            this.disable();
          }
          this.tracks = [];
          this.loadTracks();
          this.player.log(`Caption tracks refreshed, found ${this.tracks.length} tracks`, "info");
          if (wasEnabled && currentLanguage && this.tracks.length > 0) {
            const matchingIndex = this.tracks.findIndex((t) => t.language === currentLanguage);
            if (matchingIndex >= 0) {
              this.enable(matchingIndex);
            }
          } else if (!wasEnabled && this.player.options.captionsDefault && this.tracks.length > 0) {
            this.enable(0);
          }
          return this.tracks.length;
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
    }
  });

  // src/renderers/HTML5Renderer.ts
  var HTML5Renderer_exports = {};
  __export(HTML5Renderer_exports, {
    HTML5Renderer: () => HTML5Renderer
  });
  var HTML5Renderer;
  var init_HTML5Renderer = __esm({
    "src/renderers/HTML5Renderer.ts"() {
      "use strict";
      HTML5Renderer = class {
        constructor(player) {
          __publicField(this, "rendererType", "html5");
          __publicField(this, "player");
          __publicField(this, "media");
          __publicField(this, "_didDeferredLoad");
          // All media listeners are registered with this controller's signal so a
          // single abort() in destroy() detaches every one of them. Avoids the leak
          // of removeEventListener being called with fresh, non-matching callbacks.
          __publicField(this, "_listenerController");
          this.player = player;
          this.media = player.element;
          this._didDeferredLoad = false;
          this._listenerController = new AbortController();
        }
        async init() {
          this.media.controls = false;
          this.media.removeAttribute("controls");
          this.attachEvents();
          if (this.player.options.deferLoad) {
            this.media.preload = this.player.options.preload || "none";
            if (this.player.options.preload === "metadata") {
              this.media.load();
            }
          } else {
            this.media.preload = this.player.options.preload;
            this.media.load();
          }
          if (this.player.container) {
            this.player.container.classList.remove("vidply-external-controls");
          }
        }
        attachEvents() {
          const { signal } = this._listenerController;
          this.media.addEventListener("loadedmetadata", () => {
            this.player.state.duration = this.media.duration;
            this.player.emit("loadedmetadata");
            if (this.media.tagName === "VIDEO") {
              this.player.autoGeneratePoster().catch((error) => {
                this.player.log("Failed to auto-generate poster:", error, "warn");
              });
            }
          }, { signal });
          this.media.addEventListener("durationchange", () => {
            const duration = this.media.duration;
            if (duration && isFinite(duration) && duration > 0) {
              this.player.state.duration = duration;
              this.player.emit("durationchange", duration);
            }
          }, { signal });
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
          }, { signal });
          this.media.addEventListener("pause", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          }, { signal });
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
          }, { signal });
          this.media.addEventListener("timeupdate", () => {
            this.player.state.currentTime = this.media.currentTime;
            this.player.emit("timeupdate", this.media.currentTime);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
            }
          }, { signal });
          this.media.addEventListener("volumechange", () => {
            if (!this.player.shouldSyncVolumeFromMedia()) {
              return;
            }
            this.player.state.volume = this.media.volume;
            this.player.state.muted = this.media.muted;
            this.player.emit("volumechange", this.media.volume);
            if (this.player.options.onVolumeChange) {
              this.player.options.onVolumeChange.call(this.player, this.media.volume);
            }
          }, { signal });
          this.media.addEventListener("seeking", () => {
            this.player.state.seeking = true;
            this.player.emit("seeking");
          }, { signal });
          this.media.addEventListener("seeked", () => {
            this.player.state.seeking = false;
            this.player.emit("seeked");
          }, { signal });
          this.media.addEventListener("waiting", () => {
            this.player.state.buffering = true;
            this.player.emit("waiting");
          }, { signal });
          this.media.addEventListener("canplay", () => {
            this.player.state.buffering = false;
            this.player.emit("canplay");
          }, { signal });
          this.media.addEventListener("progress", () => {
            if (this.media.buffered.length > 0) {
              const buffered = this.media.buffered.end(this.media.buffered.length - 1);
              this.player.emit("progress", buffered);
            }
          }, { signal });
          this.media.addEventListener("error", (_e) => {
            this.player.handleError(this.media.error);
          }, { signal });
          this.media.addEventListener("ratechange", () => {
            this.player.state.playbackSpeed = this.media.playbackRate;
            this.player.emit("ratechange", this.media.playbackRate);
          }, { signal });
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
            } catch {
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
          } catch {
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
            const label = source.getAttribute("data-quality") || source.getAttribute("data-label") || source.getAttribute("label") || "";
            const height = source.getAttribute("data-height") || String(this.extractHeightFromLabel(label));
            const width = source.getAttribute("data-width") || "";
            return {
              index,
              height: height ? parseInt(height) : 0,
              width: width ? parseInt(width) : 0,
              src: source.src,
              type: source.type,
              name: label || (height ? `${height}p` : `Quality ${index + 1}`)
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
          return match && match[1] ? parseInt(match[1], 10) : 0;
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
          if (!quality || !quality.src) {
            return;
          }
          const currentTime = this.media.currentTime;
          const wasPlaying = !this.media.paused;
          const currentSrc = this.media.currentSrc;
          if (currentSrc === quality.src) {
            this.player.log("Already at this quality level", "info");
            return;
          }
          this.player.log(`Switching to quality: ${quality.name}`, "info");
          this.media.src = quality.src;
          const onLoadedMetadata = () => {
            this.media.removeEventListener("loadedmetadata", onLoadedMetadata);
            this.media.currentTime = currentTime;
            if (wasPlaying) {
              this.media.play().catch(() => {
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
          var _a;
          const qualities = this.getQualities();
          const currentSrc = this.media.currentSrc;
          for (let i = 0; i < qualities.length; i++) {
            if (((_a = qualities[i]) == null ? void 0 : _a.src) === currentSrc) {
              return i;
            }
          }
          return 0;
        }
        destroy() {
          this._listenerController.abort();
        }
      };
    }
  });

  // src/core/DescriptionSpeechManager.ts
  var DescriptionSpeechManager;
  var init_DescriptionSpeechManager = __esm({
    "src/core/DescriptionSpeechManager.ts"() {
      "use strict";
      DescriptionSpeechManager = class {
        constructor(player) {
          __publicField(this, "player");
          __publicField(this, "enabled", false);
          __publicField(this, "descriptionTrack", null);
          __publicField(this, "cueChangeHandler", null);
          __publicField(this, "seekedHandler", null);
          __publicField(this, "wasPlayingBeforeCue", false);
          __publicField(this, "speaking", false);
          __publicField(this, "lastSpokenCueKey", null);
          __publicField(this, "_pendingUtterance", null);
          this.player = player;
        }
        /**
         * Whether speech synthesis is available and enabled in player options.
         */
        canUseSpeech() {
          if (this.player.options.audioDescriptionSpeech === false) {
            return false;
          }
          return typeof window !== "undefined" && "speechSynthesis" in window;
        }
        /**
         * Resolve the descriptions track, preferring the active caption language.
         */
        findDescriptionTrack() {
          var _a, _b, _c;
          const textTracks = this.player.element ? Array.from(this.player.element.textTracks || []) : [];
          const descriptionsTracks = textTracks.filter(
            (track) => track.kind === "descriptions" && !track._vidplyStale
          );
          if (descriptionsTracks.length === 0) {
            return null;
          }
          const captionLang = (_c = (_b = (_a = this.player.captionManager) == null ? void 0 : _a.currentTrack) == null ? void 0 : _b.track) == null ? void 0 : _c.language;
          if (captionLang) {
            const match = descriptionsTracks.find((track) => track.language === captionLang);
            if (match) {
              return match;
            }
          }
          return descriptionsTracks[0] ?? null;
        }
        /**
         * Enable VTT speech mode: wire cuechange/seeked listeners.
         */
        enable() {
          const track = this.findDescriptionTrack();
          if (!track) {
            return false;
          }
          if (!this.canUseSpeech()) {
            track.mode = "showing";
            return true;
          }
          this.descriptionTrack = track;
          track.mode = "hidden";
          this.cueChangeHandler = () => {
            this.handleCueChange();
          };
          track.addEventListener("cuechange", this.cueChangeHandler);
          this.seekedHandler = () => {
            this.cancelSpeech();
            this.lastSpokenCueKey = null;
            this.handleCueChange();
          };
          this.player.on("seeked", this.seekedHandler);
          this.enabled = true;
          this.handleCueChange();
          return true;
        }
        /**
         * Disable VTT speech mode and restore track state.
         */
        disable() {
          this.cancelSpeech();
          this.lastSpokenCueKey = null;
          this.enabled = false;
          if (this.descriptionTrack && this.cueChangeHandler) {
            this.descriptionTrack.removeEventListener("cuechange", this.cueChangeHandler);
          }
          if (this.seekedHandler) {
            this.player.off("seeked", this.seekedHandler);
          }
          if (this.descriptionTrack) {
            this.descriptionTrack.mode = "hidden";
          }
          this.cueChangeHandler = null;
          this.seekedHandler = null;
          this.descriptionTrack = null;
          this.wasPlayingBeforeCue = false;
        }
        /**
         * Handle active description cues on the wired track.
         */
        handleCueChange() {
          var _a;
          if (!this.enabled || !this.descriptionTrack || !this.canUseSpeech()) {
            return;
          }
          const activeCues = this.descriptionTrack.activeCues;
          if (!activeCues || activeCues.length === 0) {
            return;
          }
          const cue = activeCues[0];
          const text = (_a = cue.text) == null ? void 0 : _a.trim();
          if (!text) {
            return;
          }
          const cueKey = `${cue.startTime}:${cue.endTime}:${text}`;
          if (this.speaking && this.lastSpokenCueKey === cueKey) {
            return;
          }
          if (this.lastSpokenCueKey === cueKey && !this.player.state.playing) {
            return;
          }
          this.speakCue(cue, cueKey);
        }
        /**
         * Pause playback and speak a description cue.
         */
        speakCue(cue, cueKey) {
          var _a;
          if (!this.canUseSpeech()) {
            return;
          }
          if (this.player.state.paused && !this.speaking && !this.wasPlayingBeforeCue) {
            return;
          }
          this.cancelSpeech();
          this.wasPlayingBeforeCue = this.player.state.playing;
          if (this.wasPlayingBeforeCue) {
            this.player.pause();
          }
          this.speaking = true;
          this.lastSpokenCueKey = cueKey;
          const detail = {
            time: cue.startTime,
            endTime: cue.endTime,
            text: cue.text.trim(),
            cue
          };
          this.player.emit("audiodescriptioncuestart", detail);
          const utterance = new SpeechSynthesisUtterance(detail.text);
          const lang = ((_a = this.descriptionTrack) == null ? void 0 : _a.language) || this.player.options.language || "en";
          utterance.lang = lang;
          const finish = () => {
            if (this._pendingUtterance !== utterance) {
              return;
            }
            this._pendingUtterance = null;
            this.speaking = false;
            this.player.emit("audiodescriptioncueend", detail);
            const extended = this.player.options.audioDescriptionExtended !== false;
            const shouldResume = extended ? this.wasPlayingBeforeCue : this.wasPlayingBeforeCue && this.player.state.currentTime < cue.endTime;
            if (shouldResume && this.enabled) {
              void this.player.play();
            }
            this.wasPlayingBeforeCue = false;
          };
          utterance.onend = finish;
          utterance.onerror = finish;
          this._pendingUtterance = utterance;
          window.speechSynthesis.speak(utterance);
        }
        /**
         * Cancel any in-progress speech synthesis.
         */
        cancelSpeech() {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          this._pendingUtterance = null;
          this.speaking = false;
          this.wasPlayingBeforeCue = false;
        }
        destroy() {
          this.disable();
        }
      };
    }
  });

  // src/core/AudioDescriptionManager.ts
  var AudioDescriptionManager_exports = {};
  __export(AudioDescriptionManager_exports, {
    AudioDescriptionManager: () => AudioDescriptionManager
  });
  var AudioDescriptionManager;
  var init_AudioDescriptionManager = __esm({
    "src/core/AudioDescriptionManager.ts"() {
      "use strict";
      init_CaptionManager();
      init_DescriptionSpeechManager();
      AudioDescriptionManager = class {
        constructor(player) {
          __publicField(this, "player");
          __publicField(this, "captionTracks");
          __publicField(this, "desiredState");
          __publicField(this, "enabled");
          __publicField(this, "originalSource");
          __publicField(this, "sourceElement");
          __publicField(this, "src");
          __publicField(this, "speechManager");
          this.player = player;
          this.enabled = false;
          this.desiredState = false;
          this.src = player.options.audioDescriptionSrc;
          this.sourceElement = null;
          this.originalSource = null;
          this.captionTracks = [];
          this.speechManager = null;
        }
        /**
         * Whether a described video source swap is configured.
         */
        _hasSwapSource() {
          const hasSourceElementsWithDesc = this.player.sourceElements.some(
            (el) => el.getAttribute("data-desc-src")
          );
          return Boolean(this.src || hasSourceElementsWithDesc);
        }
        /**
         * Whether a descriptions VTT track is present on the media element.
         */
        _hasDescriptionsTrack() {
          return Boolean(this.player.findTextTrack("descriptions"));
        }
        /**
         * Resolve which audio-description delivery mode applies for the current media.
         */
        resolveDeliveryMode() {
          const configured = this.player.options.audioDescriptionMode ?? "auto";
          const hasSwap = this._hasSwapSource();
          const hasDescriptions = this._hasDescriptionsTrack();
          if (configured === "swap") {
            return hasSwap ? "swap" : "none";
          }
          if (configured === "vtt_speech") {
            return hasDescriptions ? "vtt_speech" : "none";
          }
          if (hasSwap) {
            return "swap";
          }
          if (hasDescriptions) {
            return "vtt_speech";
          }
          return "none";
        }
        _ensureSpeechManager() {
          if (!this.speechManager) {
            this.speechManager = new DescriptionSpeechManager(this.player);
          }
          return this.speechManager;
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
            if ((trackKind === "captions" || trackKind === "subtitles" || trackKind === "chapters" || trackKind === "descriptions") && trackDescSrc && trackEl instanceof HTMLTrackElement) {
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
          const mode = this.resolveDeliveryMode();
          if (mode === "swap" || mode === "vtt_speech") {
            return true;
          }
          return this.captionTracks.length > 0;
        }
        /**
         * Enable audio description
         */
        async enable() {
          const deliveryMode = this.resolveDeliveryMode();
          const hasTracksWithDesc = this.captionTracks.length > 0;
          if (deliveryMode === "none" && !hasTracksWithDesc) {
            console.warn("VidPly: No audio description source, descriptions track, or tracks provided");
            return;
          }
          this.desiredState = true;
          if (deliveryMode === "vtt_speech") {
            const speechManager = this._ensureSpeechManager();
            const started = speechManager.enable();
            if (!started) {
              console.warn("VidPly: No descriptions track available for VTT speech mode");
              return;
            }
            this.enabled = true;
            this.player.state.audioDescriptionEnabled = true;
            this.player.emit("audiodescriptionenabled");
            return;
          }
          const currentTime = this.player.state.currentTime;
          const wasPlaying = this.player.state.playing;
          const posterValue = this.player.element.poster || this.player.element.getAttribute("poster") || this.player.options.poster;
          const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;
          const currentCaptionText = this._getCurrentCaptionText();
          if (this.sourceElement) {
            await this._enableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
          } else if (this.src) {
            await this._enableWithDirectSrc(currentTime, wasPlaying, posterValue, shouldKeepPoster);
          } else if (hasTracksWithDesc) {
            await this._swapCaptionTracks(true);
            this.enabled = true;
            this.player.emit("audiodescriptionenabled");
          }
        }
        /**
         * Disable audio description
         */
        async disable() {
          var _a;
          this.desiredState = false;
          if ((_a = this.speechManager) == null ? void 0 : _a.enabled) {
            this.speechManager.disable();
            this.enabled = false;
            this.player.state.audioDescriptionEnabled = false;
            this.player.emit("audiodescriptiondisabled");
            return;
          }
          const hasTracksWithDesc = this.captionTracks.length > 0;
          if (!this.sourceElement && !this.src && hasTracksWithDesc) {
            await this._swapCaptionTracks(false);
            this.enabled = false;
            this.player.emit("audiodescriptiondisabled");
            return;
          }
          if (!this.player.originalSrc) {
            return;
          }
          const currentTime = this.player.state.currentTime;
          const wasPlaying = this.player.state.playing;
          const posterValue = this.player.element.poster || this.player.element.getAttribute("poster") || this.player.options.poster;
          const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;
          const currentCaptionText = this._getCurrentCaptionText();
          if (this.sourceElement) {
            await this._disableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
          } else if (this.src) {
            await this._disableWithDirectSrc(currentTime, wasPlaying, posterValue);
          }
        }
        /**
         * Toggle audio description
         */
        async toggle() {
          const deliveryMode = this.resolveDeliveryMode();
          const descriptionTrack = this.player.findTextTrack("descriptions");
          const hasSwapOrTracks = this._hasSwapSource() || this.captionTracks.length > 0;
          if (deliveryMode === "vtt_speech") {
            if (this.enabled) {
              await this.disable();
            } else {
              await this.enable();
            }
            return;
          }
          if (descriptionTrack && !hasSwapOrTracks) {
            if (descriptionTrack.mode === "showing") {
              descriptionTrack.mode = "hidden";
              this.enabled = false;
              this.player.state.audioDescriptionEnabled = false;
              this.player.emit("audiodescriptiondisabled");
            } else {
              descriptionTrack.mode = "showing";
              this.enabled = true;
              this.player.state.audioDescriptionEnabled = true;
              this.player.emit("audiodescriptionenabled");
            }
          } else if (descriptionTrack && hasSwapOrTracks) {
            if (this.enabled) {
              this.desiredState = false;
              await this.disable();
            } else {
              descriptionTrack.mode = "showing";
              this.desiredState = true;
              await this.enable();
            }
          } else if (hasSwapOrTracks) {
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
         * Validate that a track URL exists. Bounded by the player's lifecycle
         * AbortController + an 8s timeout so a torn-down player cannot leak
         * the request.
         */
        async _validateTrackExists(url) {
          if (typeof url !== "string" || !url) return false;
          const signals = [];
          const lifecycle = this.player.lifecycleSignal;
          if (lifecycle) signals.push(lifecycle);
          if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
            signals.push(AbortSignal.timeout(8e3));
          }
          let signal;
          if (signals.length === 1) signal = signals[0];
          else if (signals.length > 1) {
            const anyFn = AbortSignal.any;
            signal = anyFn ? anyFn(signals) : signals[0];
          }
          try {
            const response = await fetch(url, { method: "HEAD", signal });
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
                const url = toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc;
                if (!url) return { trackInfo, exists: false };
                try {
                  const exists = await this._validateTrackExists(url);
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
              this.player.setManagedTimeout(() => {
                tracksToReadd.forEach(({ trackInfo, parent, nextSibling, attributes }) => {
                  const newSrc = toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc;
                  if (!newSrc) {
                    return;
                  }
                  swappedTracks.push(trackInfo);
                  const newTrackElement = document.createElement("track");
                  newTrackElement.setAttribute("src", newSrc);
                  Object.keys(attributes).forEach((attrName) => {
                    const attrValue = attributes[attrName];
                    if (attrName !== "src" && attrName !== "data-desc-src" && attrValue !== void 0) {
                      newTrackElement.setAttribute(attrName, attrValue);
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
                      const trackElement = trackInfo.trackElement;
                      const newTextTrack = trackElement.track;
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
                        if (trackElement.readyState >= 2) {
                          restoreMode();
                        } else {
                          trackElement.addEventListener("load", restoreMode, { once: true });
                          trackElement.addEventListener("error", restoreMode, { once: true });
                        }
                      }
                    });
                  }, 300);
                };
                if (this.player.element.readyState >= 1) {
                  this.player.setManagedTimeout(setupNewTracks, 200);
                } else {
                  this.player.element.addEventListener("loadedmetadata", setupNewTracks, { once: true });
                  this.player.setManagedTimeout(setupNewTracks, 2e3);
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
              const origSrc = sourceEl.getAttribute("data-orig-src") || currentSrc;
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
            if (!sourceInfo.src) {
              return;
            }
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
          if (!this.src) return;
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
          if (!originalSrcToUse) {
            return;
          }
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
          var _a;
          (_a = this.speechManager) == null ? void 0 : _a.destroy();
          this.speechManager = null;
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
          var _a;
          (_a = this.speechManager) == null ? void 0 : _a.destroy();
          this.speechManager = null;
          this.enabled = false;
          this.desiredState = false;
          this.captionTracks = [];
          this.sourceElement = null;
          this.originalSource = null;
        }
      };
    }
  });

  // src/utils/DraggableResizable.ts
  var DraggableResizable;
  var init_DraggableResizable = __esm({
    "src/utils/DraggableResizable.ts"() {
      "use strict";
      DraggableResizable = class {
        constructor(element, options = {}) {
          __publicField(this, "element");
          __publicField(this, "options");
          __publicField(this, "isDragging");
          __publicField(this, "isResizing");
          __publicField(this, "resizeDirection");
          __publicField(this, "dragOffsetX");
          __publicField(this, "dragOffsetY");
          __publicField(this, "positionOffsetX");
          __publicField(this, "positionOffsetY");
          __publicField(this, "initialMouseX");
          __publicField(this, "initialMouseY");
          __publicField(this, "needsPositionConversion");
          __publicField(this, "resizeStartX");
          __publicField(this, "resizeStartY");
          __publicField(this, "resizeStartWidth");
          __publicField(this, "resizeStartHeight");
          __publicField(this, "resizeStartLeft");
          __publicField(this, "resizeStartTop");
          __publicField(this, "keyboardDragMode");
          __publicField(this, "keyboardResizeMode");
          __publicField(this, "pointerResizeMode");
          __publicField(this, "manuallyPositioned");
          __publicField(this, "resizeHandlesManaged");
          __publicField(this, "resizeIndicatorElement");
          __publicField(this, "handlers");
          __publicField(this, "activePointerId");
          __publicField(this, "activePointerType");
          this.element = element;
          this.options = {
            dragHandle: null,
            resizeHandles: [],
            onDragStart: null,
            onDrag: null,
            onDragEnd: null,
            onResizeStart: null,
            onResize: null,
            onResizeEnd: null,
            constrainToViewport: true,
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
            storageKey: null,
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
          const target = e.target;
          if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
            return;
          }
          if (this.options.onDragStart && !this.options.onDragStart(e)) {
            return;
          }
          this.activePointerId = e.pointerId;
          this.activePointerType = e.pointerType;
          try {
            (_b = (_a = e.currentTarget) == null ? void 0 : _a.setPointerCapture) == null ? void 0 : _b.call(_a, e.pointerId);
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
          const target = e.target;
          if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
            return;
          }
          if (this.options.onDragStart && !this.options.onDragStart(e)) {
            return;
          }
          this.startDragging(e.clientX, e.clientY);
          e.preventDefault();
        }
        onTouchStart(e) {
          const target = e.target;
          if (target.classList.contains(`${this.options.classPrefix}-resize-handle`)) {
            return;
          }
          if (this.options.onDragStart && !this.options.onDragStart(e)) {
            return;
          }
          const touch = e.touches[0];
          if (!touch) return;
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
          } catch {
          }
          this.startResizing(e.clientX, e.clientY);
        }
        onResizeHandleMouseDown(e) {
          var _a, _b, _c, _d;
          e.preventDefault();
          e.stopPropagation();
          const handle = e.target;
          this.resizeDirection = handle.getAttribute("data-direction");
          const clientX = "clientX" in e ? e.clientX : (_b = (_a = e.touches) == null ? void 0 : _a[0]) == null ? void 0 : _b.clientX;
          const clientY = "clientY" in e ? e.clientY : (_d = (_c = e.touches) == null ? void 0 : _c[0]) == null ? void 0 : _d.clientY;
          if (clientX === void 0 || clientY === void 0) return;
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
            if (!touch) return;
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
          const key = e.key.toLowerCase();
          const isToggleKey = key === this.options.keyboardDragKey.toLowerCase() || key === this.options.keyboardResizeKey.toLowerCase();
          if (isToggleKey) {
            const target = e.target;
            const isEditable = target !== null && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));
            const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
            if (isEditable || hasModifier) {
              return;
            }
          }
          if (key === this.options.keyboardDragKey.toLowerCase()) {
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
          if ("PointerEvent" in window) {
            document.addEventListener("pointermove", this.handlers.pointermove, { passive: false });
          }
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
          if ("PointerEvent" in window) {
            document.removeEventListener("pointermove", this.handlers.pointermove);
          }
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
          if ("PointerEvent" in window) {
            document.addEventListener("pointermove", this.handlers.pointermove, { passive: false });
          }
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
          const resizeDirection = this.resizeDirection ?? "";
          if (resizeDirection.includes("e")) {
            newWidth = Math.max(this.options.minWidth, this.resizeStartWidth + deltaX);
          }
          if (resizeDirection.includes("w")) {
            const proposedWidth = Math.max(this.options.minWidth, this.resizeStartWidth - deltaX);
            newLeft = this.resizeStartLeft + (this.resizeStartWidth - proposedWidth);
            newWidth = proposedWidth;
          }
          const maxWidthOption = typeof this.options.maxWidth === "function" ? this.options.maxWidth() : this.options.maxWidth;
          if (typeof maxWidthOption === "number" && Number.isFinite(maxWidthOption)) {
            const clampedWidth = Math.min(newWidth, maxWidthOption);
            if (clampedWidth !== newWidth && resizeDirection.includes("w")) {
              newLeft += newWidth - clampedWidth;
            }
            newWidth = clampedWidth;
          }
          if (!this.options.maintainAspectRatio) {
            if (resizeDirection.includes("s")) {
              newHeight = Math.max(this.options.minHeight, this.resizeStartHeight + deltaY);
            }
            if (resizeDirection.includes("n")) {
              const proposedHeight = Math.max(this.options.minHeight, this.resizeStartHeight - deltaY);
              newTop = this.resizeStartTop + (this.resizeStartHeight - proposedHeight);
              newHeight = proposedHeight;
            }
            const maxHeightOption = typeof this.options.maxHeight === "function" ? this.options.maxHeight() : this.options.maxHeight;
            if (typeof maxHeightOption === "number" && Number.isFinite(maxHeightOption)) {
              const clampedHeight = Math.min(newHeight, maxHeightOption);
              if (clampedHeight !== newHeight && resizeDirection.includes("n")) {
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
          if (resizeDirection.includes("w")) {
            this.element.style.left = `${newLeft}px`;
          }
          if (resizeDirection.includes("n") && !this.options.maintainAspectRatio) {
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
          if ("PointerEvent" in window) {
            document.removeEventListener("pointermove", this.handlers.pointermove);
          }
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
            } catch {
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
    }
  });

  // src/utils/FormUtils.ts
  function createLabeledSelect({
    classPrefix: _classPrefix,
    labelClass,
    selectClass,
    labelText,
    selectId,
    hidden = false,
    onChange = void 0,
    options = []
  }) {
    const isI18nKey = typeof labelText === "string" && (labelText.startsWith("transcript.") || labelText.startsWith("player.") || labelText.startsWith("settings.") || labelText.startsWith("captions."));
    const labelTextContent = isI18nKey ? i18n.t(labelText) || labelText : labelText;
    const label = DOMUtils.createElement("label", {
      className: labelClass,
      textContent: labelTextContent,
      attributes: {
        for: selectId,
        style: hidden ? "display: none;" : void 0
      }
    });
    const select = DOMUtils.createElement("select", {
      className: selectClass,
      attributes: {
        id: selectId,
        style: hidden ? "display: none;" : void 0
      }
    });
    options.forEach((opt) => {
      const option = DOMUtils.createElement("option", {
        textContent: opt.text,
        attributes: {
          value: opt.value,
          selected: opt.selected ? "selected" : void 0
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
    ["pointerdown", "mousedown", "click"].forEach((eventType) => {
      element.addEventListener(eventType, (e) => {
        e.stopPropagation();
      });
    });
  }
  var init_FormUtils = __esm({
    "src/utils/FormUtils.ts"() {
      "use strict";
      init_DOMUtils();
      init_i18n();
    }
  });

  // src/utils/MenuUtils.ts
  function createMenuItem({
    classPrefix,
    itemClass,
    icon,
    label,
    ariaLabel,
    onClick,
    hasTextClass = false
  }) {
    const isI18nKeyForAria = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
    const ariaLabelText = ariaLabel || (isI18nKeyForAria ? i18n.t(label) || label : label);
    const button = DOMUtils.createElement("button", {
      className: itemClass,
      attributes: {
        type: "button",
        "aria-label": ariaLabelText,
        tabindex: "-1"
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
      attributes: { "aria-hidden": "true" }
    });
    button.appendChild(text);
    if (onClick) {
      button.addEventListener("click", onClick);
    }
    return button;
  }
  function attachMenuKeyboardNavigation(menu, button, itemSelector, onClose) {
    if (!menu) return void 0;
    const menuItems = Array.from(menu.querySelectorAll(itemSelector)).filter((item) => item.getAttribute("aria-disabled") !== "true");
    if (menuItems.length === 0) return void 0;
    const handleKeyDown = (e) => {
      const currentIndex = menuItems.indexOf(document.activeElement);
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          e.stopPropagation();
          const nextIndex = (currentIndex + 1) % menuItems.length;
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === nextIndex ? "0" : "-1");
          });
          const next = menuItems[nextIndex];
          if (next) {
            next.focus({ preventScroll: false });
            next.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          e.stopPropagation();
          const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === prevIndex ? "0" : "-1");
          });
          const prev = menuItems[prevIndex];
          if (prev) {
            prev.focus({ preventScroll: false });
            prev.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          e.stopPropagation();
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === 0 ? "0" : "-1");
          });
          const firstItem = menuItems[0];
          if (firstItem) {
            firstItem.focus({ preventScroll: false });
            firstItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "End": {
          e.preventDefault();
          e.stopPropagation();
          const lastIndex = menuItems.length - 1;
          menuItems.forEach((item, idx) => {
            item.setAttribute("tabindex", idx === lastIndex ? "0" : "-1");
          });
          const lastItem = menuItems[lastIndex];
          if (lastItem) {
            lastItem.focus({ preventScroll: false });
            lastItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
          }
          break;
        }
        case "Enter":
        case " ": {
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
        }
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
      const menuItems = Array.from(menu.querySelectorAll(itemSelector)).filter((item) => item.getAttribute("aria-disabled") !== "true");
      const firstItem = menuItems[0];
      if (firstItem) {
        menuItems.forEach((item, index) => {
          item.setAttribute("tabindex", index === 0 ? "0" : "-1");
        });
        focusElement(firstItem, { delay: 0 });
        firstItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
      }
    }, delay);
  }
  var init_MenuUtils = __esm({
    "src/utils/MenuUtils.ts"() {
      "use strict";
      init_DOMUtils();
      init_Icons();
      init_i18n();
      init_FocusUtils();
      init_PerformanceUtils();
    }
  });

  // src/utils/DraggablePanelMenu.ts
  function updateToggleMenuItem(button, textElement, state) {
    if (!button) return;
    button.setAttribute("aria-checked", state.enabled ? "true" : "false");
    button.setAttribute("aria-label", state.enabled ? state.enabledAria : state.disabledAria);
    if (textElement) {
      textElement.textContent = state.enabled ? state.enabledText : state.disabledText;
    }
  }
  function positionSettingsMenu(menu, button, opts = {}) {
    if (!menu || !button) return;
    const { align = "left", gap = 4, spaceReserve = 20 } = opts;
    const parentContainer = button.parentElement;
    if (!parentContainer) return;
    const buttonRect = button.getBoundingClientRect();
    const parentRect = parentContainer.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const buttonBottom = buttonRect.bottom - parentRect.top;
    const buttonTop = buttonRect.top - parentRect.top;
    const buttonLeftOffset = buttonRect.left - parentRect.left;
    const buttonCenterX = buttonLeftOffset + buttonRect.width / 2;
    const spaceAbove = buttonRect.top;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    let menuTop = buttonBottom + gap;
    let menuBottomPx = null;
    if (spaceBelow < menuRect.height + spaceReserve && spaceAbove > spaceBelow) {
      if (align === "center") {
        const parentHeight = parentRect.bottom - parentRect.top;
        menuBottomPx = parentHeight - buttonTop + gap;
        menuTop = null;
      } else {
        menuTop = buttonTop - menuRect.height - gap;
      }
      menu.classList.add("vidply-menu-above");
    } else {
      menu.classList.remove("vidply-menu-above");
    }
    let leftValue;
    let rightValue;
    let transform;
    if (align === "center") {
      const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
      if (menuLeftAbsolute < 10) {
        leftValue = "0";
        rightValue = "auto";
        transform = "translateX(0)";
      } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
        leftValue = "auto";
        rightValue = "0";
        transform = "translateX(0)";
      } else {
        leftValue = `${buttonCenterX}px`;
        rightValue = "auto";
        transform = "translateX(-50%)";
      }
    } else {
      leftValue = `${buttonLeftOffset}px`;
      rightValue = "auto";
      transform = "translateX(0)";
    }
    if (menuTop !== null) {
      menu.style.top = `${menuTop}px`;
      menu.style.bottom = "auto";
    } else if (menuBottomPx !== null) {
      menu.style.top = "auto";
      menu.style.bottom = `${menuBottomPx}px`;
    }
    menu.style.left = leftValue;
    menu.style.right = rightValue;
    menu.style.transform = transform;
  }
  function positionSettingsMenuDeferred(menu, button, opts = {}) {
    requestAnimationFrame(() => {
      setTimeout(() => positionSettingsMenu(menu, button, opts), 10);
    });
  }
  var init_DraggablePanelMenu = __esm({
    "src/utils/DraggablePanelMenu.ts"() {
      "use strict";
    }
  });

  // src/utils/DraggablePanel.ts
  var DraggablePanel;
  var init_DraggablePanel = __esm({
    "src/utils/DraggablePanel.ts"() {
      "use strict";
      init_DOMUtils();
      init_i18n();
      init_MenuUtils();
      init_DraggablePanelMenu();
      DraggablePanel = class {
        constructor(opts) {
          __publicField(this, "opts");
          /** Populated lazily on first `show()`. */
          __publicField(this, "settingsMenu", null);
          __publicField(this, "settingsMenuVisible", false);
          __publicField(this, "dragOptionButton", null);
          __publicField(this, "dragOptionText", null);
          __publicField(this, "resizeOptionButton", null);
          __publicField(this, "resizeOptionText", null);
          __publicField(this, "_justOpened", false);
          __publicField(this, "_justOpenedTimer", null);
          __publicField(this, "_keyHandler", null);
          __publicField(this, "_documentClick", null);
          __publicField(this, "_documentClickAdded", false);
          __publicField(this, "_modeBadge", null);
          this.opts = opts;
        }
        /** True while the just-opened debounce window (prevents the same
         *  click that opened the menu from also closing it via document
         *  `mousedown` / `click`). */
        get justOpened() {
          return this._justOpened;
        }
        get classPrefix() {
          return this.opts.player.options.classPrefix;
        }
        get menuClass() {
          return `${this.classPrefix}-${this.opts.namespace}-settings-menu`;
        }
        get itemClass() {
          return `${this.classPrefix}-${this.opts.namespace}-settings-item`;
        }
        /**
         * Show the menu. First call creates the DOM; subsequent calls reuse
         * it. Refreshes menu item state from the current draggable.
         */
        show() {
          this._markJustOpened(350);
          this._ensureDocumentClickHandler();
          if (this.settingsMenu) {
            this.settingsMenu.style.display = "block";
            this.settingsMenuVisible = true;
            this.opts.settingsButton.setAttribute("aria-expanded", "true");
            this._attachKeyboardNavigation();
            this._positionImmediate();
            this.refreshState();
            focusFirstMenuItem(this.settingsMenu, `.${this.itemClass}`);
            return;
          }
          this._createMenu();
        }
        /**
         * Hide the menu. By default returns focus to the settings button;
         * callers can opt out when the next interaction should land
         * elsewhere (e.g. on the wrapper after enabling drag mode).
         */
        hide({ focusButton = true } = {}) {
          if (!this.settingsMenu) return;
          this.settingsMenu.style.display = "none";
          this.settingsMenuVisible = false;
          this._clearJustOpened();
          if (this._keyHandler) {
            this.settingsMenu.removeEventListener("keydown", this._keyHandler, true);
            this._keyHandler = null;
          }
          const items = this.settingsMenu.querySelectorAll(`.${this.itemClass}`);
          items.forEach((item) => item.setAttribute("tabindex", "-1"));
          const { settingsButton } = this.opts;
          settingsButton.setAttribute("aria-expanded", "false");
          if (focusButton) {
            settingsButton.focus({ preventScroll: true });
          }
        }
        toggle() {
          if (this.settingsMenuVisible) {
            this.hide();
          } else {
            this.show();
          }
        }
        /** Set a short "just opened" guard so the document-click handler
         *  attached for outside-dismissal ignores the originating click. */
        markJustOpenedForClick() {
          if (this._documentClick) {
            this._markJustOpened(100);
          }
        }
        /** Refresh the drag and resize toggle item state from the draggable. */
        refreshState() {
          this.refreshDragState();
          this.refreshResizeState();
        }
        refreshDragState() {
          const draggable = this.opts.getDraggable();
          updateToggleMenuItem(this.dragOptionButton, this.dragOptionText, {
            enabled: Boolean(draggable == null ? void 0 : draggable.keyboardDragMode),
            enabledText: i18n.t(this.opts.i18nKeys.disableDrag),
            disabledText: i18n.t(this.opts.i18nKeys.enableDrag),
            enabledAria: i18n.t(this.opts.i18nKeys.disableDragAria),
            disabledAria: i18n.t(this.opts.i18nKeys.enableDragAria)
          });
        }
        refreshResizeState() {
          const draggable = this.opts.getDraggable();
          updateToggleMenuItem(this.resizeOptionButton, this.resizeOptionText, {
            enabled: Boolean(draggable == null ? void 0 : draggable.pointerResizeMode),
            enabledText: i18n.t(this.opts.i18nKeys.disableResize),
            disabledText: i18n.t(this.opts.i18nKeys.enableResize),
            enabledAria: i18n.t(this.opts.i18nKeys.disableResizeAria),
            disabledAria: i18n.t(this.opts.i18nKeys.enableResizeAria)
          });
        }
        /**
         * Show a persistent mode-feedback badge (e.g. "Drag mode: arrow
         * keys to move, Esc to exit") anchored to the host element
         * returned by `getBadgeHost`. Replaces any previous badge. The
         * badge is a real DOM element (not a CSS pseudo-element) so its
         * text is translatable, selectable, visible under high-contrast
         * themes, and reflected in browser translation overlays.
         *
         * Marked `aria-hidden` because the accompanying live-region
         * announcement (the manager's responsibility) already conveys the
         * state change to assistive tech.
         */
        showBadge(text) {
          var _a, _b;
          const host = (_b = (_a = this.opts).getBadgeHost) == null ? void 0 : _b.call(_a);
          if (!host) return;
          this.hideBadge();
          const className = this.opts.badgeClass ?? `${this.classPrefix}-${this.opts.namespace}-mode-badge`;
          const badge = DOMUtils.createElement("span", {
            className,
            textContent: text,
            attributes: { "aria-hidden": "true" }
          });
          host.appendChild(badge);
          this._modeBadge = badge;
        }
        /** Remove the mode-feedback badge if one is showing. */
        hideBadge() {
          if (this._modeBadge && this._modeBadge.parentNode) {
            this._modeBadge.remove();
          }
          this._modeBadge = null;
        }
        /** RAF-deferred reposition (e.g. after a panel resize). */
        reposition() {
          positionSettingsMenuDeferred(this.settingsMenu, this.opts.settingsButton, {
            align: this.opts.menuAlign,
            gap: this.opts.menuGap ?? 4,
            spaceReserve: this.opts.menuSpaceReserve ?? 20
          });
        }
        /**
         * Tear down any DOM/listeners owned by this panel. Safe to call
         * multiple times. Callers must still drop their own references.
         */
        destroy() {
          if (this._justOpenedTimer) {
            clearTimeout(this._justOpenedTimer);
            this._justOpenedTimer = null;
          }
          this._justOpened = false;
          this.hideBadge();
          if (this.settingsMenu) {
            if (this._keyHandler) {
              this.settingsMenu.removeEventListener("keydown", this._keyHandler, true);
            }
            this.settingsMenu.remove();
            this.settingsMenu = null;
          }
          this._keyHandler = null;
          this.settingsMenuVisible = false;
          this.dragOptionButton = null;
          this.dragOptionText = null;
          this.resizeOptionButton = null;
          this.resizeOptionText = null;
          this._documentClick = null;
          this._documentClickAdded = false;
        }
        _createMenu() {
          const { player, settingsButton, i18nKeys } = this.opts;
          const menu = DOMUtils.createElement("div", {
            className: this.menuClass,
            attributes: { role: "menu" }
          });
          this.settingsMenu = menu;
          const dragOption = createMenuItem({
            classPrefix: this.classPrefix,
            itemClass: this.itemClass,
            icon: "move",
            label: i18nKeys.enableDrag,
            hasTextClass: true,
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.opts.onDragItemClick(this);
              this.refreshState();
            }
          });
          dragOption.setAttribute("role", "switch");
          dragOption.setAttribute("aria-checked", "false");
          dragOption.setAttribute("data-setting", "keyboard-drag");
          this._stripInlineTooltip(dragOption);
          this.dragOptionButton = dragOption;
          this.dragOptionText = dragOption.querySelector(`.${this.classPrefix}-settings-text`);
          const resizeOption = createMenuItem({
            classPrefix: this.classPrefix,
            itemClass: this.itemClass,
            icon: "resize",
            label: i18nKeys.enableResize,
            hasTextClass: true,
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.opts.onResizeItemClick(this);
              this.refreshState();
            }
          });
          resizeOption.setAttribute("role", "switch");
          resizeOption.setAttribute("aria-checked", "false");
          this._stripInlineTooltip(resizeOption);
          this.resizeOptionButton = resizeOption;
          this.resizeOptionText = resizeOption.querySelector(`.${this.classPrefix}-settings-text`);
          menu.appendChild(dragOption);
          menu.appendChild(resizeOption);
          if (this.opts.buildExtraItems) {
            this.opts.buildExtraItems({
              menu,
              itemClass: this.itemClass,
              classPrefix: this.classPrefix,
              stripInlineTooltip: (item) => this._stripInlineTooltip(item)
            });
          }
          const closeOption = createMenuItem({
            classPrefix: this.classPrefix,
            itemClass: this.itemClass,
            icon: "close",
            label: i18nKeys.closeMenu,
            onClick: () => this.hide()
          });
          this._stripInlineTooltip(closeOption);
          menu.appendChild(closeOption);
          menu.style.visibility = "hidden";
          menu.style.display = "block";
          const parent = this.opts.getMenuParent();
          if (settingsButton.parentNode) {
            settingsButton.insertAdjacentElement("afterend", menu);
          } else if (parent) {
            parent.appendChild(menu);
          }
          this._positionImmediate();
          requestAnimationFrame(() => {
            if (this.settingsMenu) {
              this.settingsMenu.style.visibility = "visible";
            }
          });
          this._attachKeyboardNavigation();
          this.settingsMenuVisible = true;
          settingsButton.setAttribute("aria-expanded", "true");
          this.refreshState();
          focusFirstMenuItem(menu, `.${this.itemClass}`);
          void player;
        }
        _attachKeyboardNavigation() {
          const menu = this.settingsMenu;
          if (!menu) return;
          if (this._keyHandler) {
            menu.removeEventListener("keydown", this._keyHandler, true);
          }
          const handler = attachMenuKeyboardNavigation(
            menu,
            this.opts.settingsButton,
            `.${this.itemClass}`,
            () => this.hide({ focusButton: true })
          );
          this._keyHandler = handler ?? null;
        }
        _positionImmediate() {
          positionSettingsMenu(this.settingsMenu, this.opts.settingsButton, {
            align: this.opts.menuAlign,
            gap: this.opts.menuGap ?? 4,
            spaceReserve: this.opts.menuSpaceReserve ?? 20
          });
        }
        /**
         * Remove tooltip and duplicate button-text nodes from a menu item.
         * `createMenuItem` is used both for toolbar buttons (which want a
         * tooltip) and for settings-menu rows (which show the same text
         * inline). This strips the duplicated pieces so screen readers
         * don't read the label twice.
         */
        _stripInlineTooltip(item) {
          const tooltip = item.querySelector(`.${this.classPrefix}-tooltip`);
          if (tooltip) tooltip.remove();
          const buttonText = item.querySelector(`.${this.classPrefix}-button-text`);
          if (buttonText) buttonText.remove();
        }
        _markJustOpened(durationMs) {
          this._justOpened = true;
          if (this._justOpenedTimer) {
            clearTimeout(this._justOpenedTimer);
          }
          this._justOpenedTimer = setTimeout(() => {
            this._justOpened = false;
            this._justOpenedTimer = null;
          }, durationMs);
        }
        _clearJustOpened() {
          this._justOpened = false;
          if (this._justOpenedTimer) {
            clearTimeout(this._justOpenedTimer);
            this._justOpenedTimer = null;
          }
        }
        _ensureDocumentClickHandler() {
          if (this._documentClickAdded) return;
          this._documentClick = (event) => {
            if (this._justOpened) return;
            const target = event.target;
            const { settingsButton } = this.opts;
            if (settingsButton === target || target && settingsButton.contains(target)) {
              return;
            }
            if (this.settingsMenu && target && this.settingsMenu.contains(target)) {
              return;
            }
            if (this.settingsMenuVisible) {
              this.hide();
            }
          };
          setTimeout(() => {
            const handler = this._documentClick;
            if (!handler) return;
            document.addEventListener("mousedown", handler, {
              capture: true,
              signal: this.opts.player.lifecycleSignal
            });
            this._documentClickAdded = true;
          }, 300);
        }
      };
    }
  });

  // src/core/SignLanguageManager.ts
  var SignLanguageManager_exports = {};
  __export(SignLanguageManager_exports, {
    SignLanguageManager: () => SignLanguageManager
  });
  var SignLanguageManager;
  var init_SignLanguageManager = __esm({
    "src/core/SignLanguageManager.ts"() {
      "use strict";
      init_DOMUtils();
      init_Icons();
      init_i18n();
      init_DraggableResizable();
      init_FormUtils();
      init_DraggablePanel();
      SignLanguageManager = class {
        constructor(player) {
          __publicField(this, "player");
          __publicField(this, "_mainViewMutedBefore");
          __publicField(this, "_mainViewUsingSourceSwap");
          __publicField(this, "currentLanguage");
          __publicField(this, "customKeyHandler");
          __publicField(this, "desiredPosition");
          __publicField(this, "draggable");
          __publicField(this, "handlers");
          __publicField(this, "header");
          __publicField(this, "inMainView");
          __publicField(this, "interactionHandlers");
          __publicField(this, "mainViewOriginalSources");
          __publicField(this, "mainViewOriginalSrc");
          __publicField(this, "resizeHandles");
          __publicField(this, "selector");
          __publicField(this, "settingsButton");
          __publicField(this, "settingsHandlers");
          __publicField(this, "sources");
          __publicField(this, "src");
          __publicField(this, "enabled");
          __publicField(this, "video");
          __publicField(this, "wrapper");
          /**
           * Encapsulates the settings-menu DOM, lifecycle (show/hide/outside-
           * click/keyboard nav/positioning), and the drag/resize toggle items.
           * Owned here but lazily created once {@link _setupSettingsButton}
           * instantiates the button it needs to anchor from.
           */
          __publicField(this, "_panel", null);
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
        // Back-compat getters for external callers (Player.ts exposes these
        // under `signLanguageSettingsMenu` / `signLanguageSettingsMenuVisible`)
        // and for internal readers of the shared menu-item state (which is now
        // panel-owned). Setters are no-ops by design — the panel is the
        // authoritative owner of these values.
        get settingsMenu() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.settingsMenu) ?? null;
        }
        set settingsMenu(_v) {
        }
        get settingsMenuVisible() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.settingsMenuVisible) ?? false;
        }
        set settingsMenuVisible(_v) {
        }
        get settingsMenuJustOpened() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.justOpened) ?? false;
        }
        set settingsMenuJustOpened(_v) {
        }
        get dragOptionButton() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.dragOptionButton) ?? null;
        }
        get dragOptionText() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.dragOptionText) ?? null;
        }
        get resizeOptionButton() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.resizeOptionButton) ?? null;
        }
        get resizeOptionText() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.resizeOptionText) ?? null;
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
            initialSrc = this.sources[initialLang] ?? null;
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
          var _a, _b, _c;
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
          this.player.currentSource = this.mainViewOriginalSrc || ((_a = el.querySelector("source")) == null ? void 0 : _a.src) || "";
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
              (_c = (_b = this.player).log) == null ? void 0 : _c.call(_b, "Sign language main view: play after restore failed", e, "warn");
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
          const cleanUrl = (url.split("?")[0] ?? "").toLowerCase();
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
            if (playerLang && this.sources[playerLang]) {
              return playerLang;
            }
          }
          return Object.keys(this.sources)[0] ?? "";
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
              var _a;
              this.toggleKeyboardDragMode();
              panel.hide({ focusButton: false });
              if ((_a = this.draggable) == null ? void 0 : _a.keyboardDragMode) {
                setTimeout(() => {
                  var _a2, _b;
                  (_b = (_a2 = this.wrapper) == null ? void 0 : _a2.focus) == null ? void 0 : _b.call(_a2, { preventScroll: true });
                }, 20);
              }
            },
            onResizeItemClick: (panel) => {
              const enabled = this.toggleResizeMode({ focus: false });
              if (enabled) {
                panel.hide({ focusButton: false });
                setTimeout(() => {
                  var _a, _b;
                  (_b = (_a = this.wrapper) == null ? void 0 : _a.focus) == null ? void 0 : _b.call(_a, { preventScroll: true });
                }, 20);
              } else {
                panel.hide({ focusButton: true });
              }
            }
          });
          this.settingsHandlers = {
            click: (e) => {
              var _a, _b;
              e.preventDefault();
              e.stopPropagation();
              (_a = this._panel) == null ? void 0 : _a.markJustOpenedForClick();
              (_b = this._panel) == null ? void 0 : _b.toggle();
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
            var _a, _b;
            this.disable();
            const signLanguageButton = (_b = (_a = this.player.controlBar) == null ? void 0 : _a.controls) == null ? void 0 : _b.signLanguage;
            if (signLanguageButton) {
              this.player.setManagedTimeout(() => {
                signLanguageButton.focus({ preventScroll: true });
              }, 0);
            }
          }, { signal: this.player.lifecycleSignal });
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
          var _a;
          const wrapper = this.wrapper;
          if (!wrapper) return;
          const saved = this.player.storage.getSignLanguagePreferences();
          if ((_a = saved == null ? void 0 : saved.size) == null ? void 0 : _a.width) {
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
              var _a2, _b2;
              this.resizeHandles.forEach((handle) => {
                handle.style.display = enabled ? "block" : "none";
              });
              if (enabled) {
                this._showModeBadge(i18n.t("player.signResizeModeHint"));
                (_a2 = this.player.keyboardManager) == null ? void 0 : _a2.announce(i18n.t("player.signLanguageResizeActive"));
              } else {
                this._hideModeBadge();
                (_b2 = this.player.keyboardManager) == null ? void 0 : _b2.announce(i18n.t("player.signResizeModeDisabled"));
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
          var _a;
          this.customKeyHandler = (e) => {
            var _a2, _b, _c, _d, _e, _f;
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
                (_a2 = this.wrapper) == null ? void 0 : _a2.focus({ preventScroll: true });
              }
              return;
            }
            if (key === "escape") {
              e.preventDefault();
              e.stopPropagation();
              if ((_b = this.draggable) == null ? void 0 : _b.pointerResizeMode) {
                this.draggable.disablePointerResizeMode();
                return;
              }
              if ((_c = this.draggable) == null ? void 0 : _c.keyboardDragMode) {
                this.draggable.disableKeyboardDragMode();
                this._hideModeBadge();
                this._updateDragOptionState();
                (_d = this.player.keyboardManager) == null ? void 0 : _d.announce(i18n.t("player.signDragModeDisabled"));
                return;
              }
              this.disable();
              const signLanguageButton = (_f = (_e = this.player.controlBar) == null ? void 0 : _e.controls) == null ? void 0 : _f.signLanguage;
              if (signLanguageButton) {
                setTimeout(() => {
                  signLanguageButton.focus({ preventScroll: true });
                }, 0);
              }
            }
          };
          (_a = this.wrapper) == null ? void 0 : _a.addEventListener("keydown", this.customKeyHandler);
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
          var _a;
          (_a = this._panel) == null ? void 0 : _a.show();
        }
        /** @see {@link showSettingsMenu} */
        hideSettingsMenu({ focusButton = true } = {}) {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.hide({ focusButton });
        }
        // Badge management moved into {@link DraggablePanel}; these
        // delegates keep the legacy names so internal call sites and
        // subclassers (if any) continue to work. Announcements for
        // assistive tech still go through the shared KeyboardManager
        // live region so AT doesn't read both the badge text and the
        // live-region copy.
        _showModeBadge(text) {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.showBadge(text);
        }
        _hideModeBadge() {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.hideBadge();
        }
        /**
         * Toggle keyboard drag mode
         */
        toggleKeyboardDragMode() {
          var _a, _b;
          if (!this.draggable) return;
          const wasEnabled = this.draggable.keyboardDragMode;
          this.draggable.toggleKeyboardDragMode();
          const isEnabled = this.draggable.keyboardDragMode;
          if (!wasEnabled && isEnabled) {
            this._enableMoveMode();
            this._showModeBadge(i18n.t("player.signDragModeHint"));
            (_a = this.player.keyboardManager) == null ? void 0 : _a.announce(i18n.t("player.signLanguageDragActive"));
          } else if (wasEnabled && !isEnabled) {
            this._hideModeBadge();
            (_b = this.player.keyboardManager) == null ? void 0 : _b.announce(i18n.t("player.signDragModeDisabled"));
          }
          this._updateDragOptionState();
        }
        /**
         * Enable move mode visual feedback
         */
        _enableMoveMode() {
          var _a;
          (_a = this.wrapper) == null ? void 0 : _a.classList.add(`${this.player.options.classPrefix}-sign-move-mode`);
          this._updateResizeOptionState();
          setTimeout(() => {
            var _a2;
            (_a2 = this.wrapper) == null ? void 0 : _a2.classList.remove(`${this.player.options.classPrefix}-sign-move-mode`);
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
          var _a;
          (_a = this._panel) == null ? void 0 : _a.refreshDragState();
        }
        _updateResizeOptionState() {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.refreshResizeState();
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
        }
        /**
         * Destroy
         */
        destroy() {
          this.cleanup();
          this.enabled = false;
        }
      };
    }
  });

  // src/core/FloatingPlayerManager.ts
  var FloatingPlayerManager_exports = {};
  __export(FloatingPlayerManager_exports, {
    FloatingPlayerManager: () => FloatingPlayerManager
  });
  var FLOATING_CLAIM_EVENT, DEFAULT_WIDTH, MIN_WIDTH, EDGE_MARGIN, FloatingPlayerManager;
  var init_FloatingPlayerManager = __esm({
    "src/core/FloatingPlayerManager.ts"() {
      "use strict";
      init_DOMUtils();
      init_DraggableResizable();
      init_Icons();
      init_i18n();
      FLOATING_CLAIM_EVENT = "vidply:floating-claim";
      DEFAULT_WIDTH = 400;
      MIN_WIDTH = 240;
      EDGE_MARGIN = 16;
      FloatingPlayerManager = class {
        constructor(player) {
          __publicField(this, "player");
          __publicField(this, "classPrefix");
          __publicField(this, "shell");
          __publicField(this, "dragHandle");
          __publicField(this, "closeButton");
          __publicField(this, "resizeHandles");
          __publicField(this, "placeholder");
          __publicField(this, "draggable");
          __publicField(this, "originalParent");
          __publicField(this, "originalNextSibling");
          __publicField(this, "intersectionObserver");
          __publicField(this, "observerTarget");
          __publicField(this, "lastRatio");
          __publicField(this, "_autoDismissedThisPlay");
          __publicField(this, "_playListenerAttached");
          __publicField(this, "_onPlayAfterDismiss");
          __publicField(this, "_onClaim");
          __publicField(this, "_onResize");
          __publicField(this, "_onKeyDown");
          __publicField(this, "_onEnterFullscreen");
          __publicField(this, "_destroyed");
          __publicField(this, "_triggerFocusEl");
          __publicField(this, "_claimId");
          __publicField(this, "_lastAutoExitTime");
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
          this._lastAutoExitTime = 0;
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
          if (reason === "auto") {
            this._lastAutoExitTime = Date.now();
          }
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
          const enterFs = this._onEnterFullscreen;
          if (enterFs) {
            this.player.off("enterfullscreen", enterFs);
            this._onEnterFullscreen = null;
          }
          const playAfterDismiss = this._onPlayAfterDismiss;
          if (playAfterDismiss && this._playListenerAttached) {
            this.player.off("play", playAfterDismiss);
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
          const signal = this.player.lifecycleSignal;
          window.addEventListener(FLOATING_CLAIM_EVENT, this._onClaim, { signal });
          this._onResize = () => {
            const minWidth = this.player.options.floatingMinViewportWidth ?? 768;
            if (this.player.state.floating && window.innerWidth < minWidth) {
              this.exit("auto");
            }
          };
          window.addEventListener("resize", this._onResize, { signal });
        }
        _setupFullscreenGuard() {
          const onEnterFullscreen = () => {
            if (this.player.state.floating) {
              this.exit("manual");
            }
          };
          this._onEnterFullscreen = onEnterFullscreen;
          this.player.on("enterfullscreen", onEnterFullscreen);
        }
        _armPlayListenerToClearDismiss() {
          if (this._playListenerAttached) return;
          const onPlayAfterDismiss = () => {
            this._autoDismissedThisPlay = false;
            const handler = this._onPlayAfterDismiss;
            if (handler) {
              this.player.off("play", handler);
            }
            this._playListenerAttached = false;
            this._onPlayAfterDismiss = null;
          };
          this._onPlayAfterDismiss = onPlayAfterDismiss;
          this.player.on("play", onPlayAfterDismiss);
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
              if (entry.intersectionRatio >= 0.5) {
                this.exit("auto");
              }
              return;
            }
            if (this.player.state.floating === "pinned") {
              return;
            }
            if (entry.intersectionRatio < 0.1 && this._canFloat("auto")) {
              const AUTO_EXIT_COOLDOWN_MS = 500;
              if (Date.now() - this._lastAutoExitTime < AUTO_EXIT_COOLDOWN_MS) return;
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
          const shell = this.shell;
          this.resizeHandles.forEach((handle) => shell.appendChild(handle));
          this._onKeyDown = (event) => {
            if (event.key === "Escape") {
              const d = this.draggable;
              const inEditMode = Boolean(
                d && (d.keyboardDragMode || d.keyboardResizeMode || d.pointerResizeMode)
              );
              if (inEditMode) {
                return;
              }
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
          const placeholderIcon = createIconElement("pip", `${this.classPrefix}-floating-placeholder-icon`);
          this.placeholder.appendChild(placeholderIcon);
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
          var _a, _b, _c;
          if (!this.shell) return;
          const prefs = ((_b = (_a = this.player.storage) == null ? void 0 : _a.getFloatingPreferences) == null ? void 0 : _b.call(_a)) || {};
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          let width = prefs.width && prefs.width >= MIN_WIDTH ? prefs.width : DEFAULT_WIDTH;
          width = Math.min(width, Math.max(MIN_WIDTH, vw - EDGE_MARGIN * 2));
          const containerRect = (_c = this.player.container) == null ? void 0 : _c.getBoundingClientRect();
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
          var _a;
          if (!this.shell || !((_a = this.player.storage) == null ? void 0 : _a.saveFloatingPreferences)) return;
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
    }
  });

  // src/controls/TranscriptManager.ts
  var TranscriptManager_exports = {};
  __export(TranscriptManager_exports, {
    TranscriptManager: () => TranscriptManager
  });
  var _TranscriptManager, TranscriptManager;
  var init_TranscriptManager = __esm({
    "src/controls/TranscriptManager.ts"() {
      "use strict";
      init_DOMUtils();
      init_TimeUtils();
      init_Icons();
      init_i18n();
      init_StorageManager();
      init_FocusUtils();
      init_MenuUtils();
      init_DraggableResizable();
      init_FormUtils();
      init_DraggablePanel();
      init_TrackLabelUtils();
      _TranscriptManager = class _TranscriptManager {
        constructor(player) {
          __publicField(this, "player");
          __publicField(this, "_cueUpdateTimeout");
          __publicField(this, "_liveSyncTimer", null);
          __publicField(this, "autoscrollCheckbox", null);
          __publicField(this, "autoscrollEnabled");
          __publicField(this, "availableTranscriptLanguages");
          __publicField(this, "currentActiveEntry");
          __publicField(this, "currentTranscriptLanguage");
          __publicField(this, "customKeyHandler", null);
          /** Elements marked inert while the floating transcript dialog is open. */
          __publicField(this, "inertedElements", []);
          __publicField(this, "previouslyFocused", null);
          /**
           * True once the style-dialog's outside-click listener has been
           * attached. The settings-menu's outside-click listener is now
           * owned by {@link DraggablePanel} and tracked there; this flag
           * covers the dialog half of the shared `handlers.documentClick`.
           */
          __publicField(this, "documentClickHandlerAdded", false);
          __publicField(this, "draggableResizable");
          __publicField(this, "handlers", {});
          __publicField(this, "headerLeft", null);
          __publicField(this, "isVisible");
          __publicField(this, "languageLabel");
          __publicField(this, "languageSelector");
          __publicField(this, "languageSelectorHandler");
          __publicField(this, "languageSelectorWrapper", null);
          __publicField(this, "liveRegion");
          __publicField(this, "settingsButton");
          __publicField(this, "showTimestamps");
          __publicField(this, "showTimestampsButton", null);
          __publicField(this, "showTimestampsText", null);
          __publicField(this, "storage");
          __publicField(this, "styleDialog");
          __publicField(this, "styleDialogJustOpened");
          __publicField(this, "styleDialogVisible");
          __publicField(this, "timeouts");
          __publicField(this, "transcriptContent", null);
          __publicField(this, "transcriptEntries");
          __publicField(this, "transcriptHeader", null);
          __publicField(this, "transcriptResizeHandles");
          __publicField(this, "transcriptStyle");
          __publicField(this, "transcriptWindow");
          __publicField(this, "_dashActiveLang");
          __publicField(this, "_vttCache");
          /**
           * Owns the settings-menu DOM scaffold, its outside-click
           * dismissal, keyboard navigation, viewport-aware positioning,
           * and the drag-mode / resize-mode toggle items. Instantiated
           * lazily once the header is built in {@link createTranscriptHeader}.
           */
          __publicField(this, "_panel", null);
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
          this.autoscrollEnabled = typeof (savedPreferences == null ? void 0 : savedPreferences.autoscroll) === "boolean" ? savedPreferences.autoscroll : true;
          this.showTimestamps = typeof (savedPreferences == null ? void 0 : savedPreferences.showTimestamps) === "boolean" ? savedPreferences.showTimestamps : false;
          const savedFontSize = typeof (savedPreferences == null ? void 0 : savedPreferences.fontSize) === "string" ? savedPreferences.fontSize : void 0;
          const savedFontFamily = typeof (savedPreferences == null ? void 0 : savedPreferences.fontFamily) === "string" ? savedPreferences.fontFamily : void 0;
          const savedColor = typeof (savedPreferences == null ? void 0 : savedPreferences.color) === "string" ? savedPreferences.color : void 0;
          const savedBackgroundColor = typeof (savedPreferences == null ? void 0 : savedPreferences.backgroundColor) === "string" ? savedPreferences.backgroundColor : void 0;
          const savedOpacity = typeof (savedPreferences == null ? void 0 : savedPreferences.opacity) === "number" ? savedPreferences.opacity : void 0;
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
        // Back-compat getters for panel-owned state. External callers and
        // internal reads (e.g. `this.settingsMenuVisible` inside other
        // transcript methods) keep reading the same properties; the
        // setters are no-ops because the panel is now the authoritative
        // owner of those values.
        get settingsMenu() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.settingsMenu) ?? null;
        }
        set settingsMenu(_v) {
        }
        get settingsMenuVisible() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.settingsMenuVisible) ?? false;
        }
        set settingsMenuVisible(_v) {
        }
        get settingsMenuJustOpened() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.justOpened) ?? false;
        }
        set settingsMenuJustOpened(_v) {
        }
        get dragOptionButton() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.dragOptionButton) ?? null;
        }
        get dragOptionText() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.dragOptionText) ?? null;
        }
        get resizeOptionButton() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.resizeOptionButton) ?? null;
        }
        get resizeOptionText() {
          var _a;
          return ((_a = this._panel) == null ? void 0 : _a.resizeOptionText) ?? null;
        }
        init() {
          this.player.on("timeupdate", this.handlers.timeupdate);
          this.player.on("seeked", this.handlers.seeked);
          this.player.on("audiodescriptionenabled", this.handlers.audiodescriptionenabled);
          this.player.on("audiodescriptiondisabled", this.handlers.audiodescriptiondisabled);
          this.handlers.textcuesupdate = () => {
            if (!this.isVisible) return;
            if (this.currentTranscriptLanguage && this._vttCache.has(this.currentTranscriptLanguage) && !this._isLiveTranscriptSource()) {
              return;
            }
            if (this._cueUpdateTimeout) {
              this.clearManagedTimeout(this._cueUpdateTimeout);
            }
            this._cueUpdateTimeout = this.setManagedTimeout(() => {
              this._cueUpdateTimeout = null;
              if (this._isLiveTranscriptSource()) {
                this._syncLiveTranscriptCues();
                return;
              }
              this.loadTranscriptData();
            }, 400);
          };
          this.player.on("textcuesupdate", this.handlers.textcuesupdate);
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
          if ((renderer == null ? void 0 : renderer.isStreaming) && typeof renderer.activateTextTrackForLanguage === "function") {
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
          var _a;
          if ((_a = this.player.state) == null ? void 0 : _a.floating) {
            return;
          }
          this.previouslyFocused = document.activeElement;
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
            if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
              this.setManagedTimeout(() => this.positionTranscript(), 0);
            } else {
              this.updateTranscriptModalState();
            }
            focusElement(this.settingsButton, { delay: 150 });
            this._startLiveTranscriptSync();
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
            } else {
              this.updateTranscriptModalState();
            }
            focusElement(this.settingsButton, { delay: 150 });
          }
          this.isVisible = true;
          this._startLiveTranscriptSync();
        }
        /**
         * Hide transcript window
         */
        hideTranscript({ focusButton = false } = {}) {
          var _a, _b;
          this._stopLiveTranscriptSync();
          if (this.transcriptWindow) {
            this.transcriptWindow.style.display = "none";
            this.isVisible = false;
            this.updateTranscriptModalState();
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
            className: `${this.player.options.classPrefix}-transcript-window`,
            attributes: {
              "role": "dialog",
              "aria-label": i18n.t("transcript.ariaLabel"),
              "aria-modal": "false",
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
                  var _a;
                  (_a = this.transcriptWindow) == null ? void 0 : _a.focus({ preventScroll: true });
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
                  var _a;
                  e.preventDefault();
                  e.stopPropagation();
                  (_a = this._panel) == null ? void 0 : _a.hide();
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
            var _a, _b;
            e.preventDefault();
            e.stopPropagation();
            (_a = this._panel) == null ? void 0 : _a.markJustOpenedForClick();
            (_b = this._panel) == null ? void 0 : _b.toggle();
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
                "aria-label": i18n.t("player.resizeHandle", { direction }),
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
          const isMobile2 = window.innerWidth < 768;
          const videoRect = playerWithVideoWrapper.videoWrapper.getBoundingClientRect();
          const isFullscreen = this.player.state.fullscreen;
          if (isMobile2 && !isFullscreen) {
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
          this.updateTranscriptModalState();
        }
        /**
         * Keep transcript as a companion panel: player controls stay operable.
         */
        updateTranscriptModalState() {
          if (!this.transcriptWindow) {
            return;
          }
          this.transcriptWindow.setAttribute("aria-modal", "false");
          const container = this.player.container;
          if (!container) {
            return;
          }
          this.inertedElements = setContainerChildrenInert(
            container,
            null,
            false,
            this.inertedElements
          );
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
          var _a, _b;
          const cues = [];
          const blocks = vttText.replace(/\r\n/g, "\n").split(/\n\n+/);
          for (const block of blocks) {
            const lines = block.trim().split("\n");
            let tsLine = -1;
            for (let i = 0; i < lines.length; i++) {
              if ((_a = lines[i]) == null ? void 0 : _a.includes("-->")) {
                tsLine = i;
                break;
              }
            }
            if (tsLine < 0) continue;
            const match = (_b = lines[tsLine]) == null ? void 0 : _b.match(
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
          if (!(renderer == null ? void 0 : renderer.isStreaming) || typeof renderer.getTextTrackURLs !== "function") return null;
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
          var _a, _b, _c, _d, _e, _f;
          this.transcriptEntries = [];
          this.currentActiveEntry = null;
          if (this.transcriptContent) {
            this.transcriptContent.innerHTML = "";
          }
          const textTracks = this.player.textTracks;
          const captionTrack = this._resolveCaptionTrackForTranscript(textTracks);
          if (captionTrack && !this.currentTranscriptLanguage) {
            this.currentTranscriptLanguage = captionTrack.language;
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
          const isStreaming = (renderer == null ? void 0 : renderer.isStreaming) && typeof renderer.getTextTrackURLs === "function";
          const isLiveStream = this._isLiveTranscriptSource();
          const lang = this.currentTranscriptLanguage || ((captionTrack == null ? void 0 : captionTrack.language) ?? "");
          if (isStreaming && lang && !isLiveStream) {
            const loadingMessage = DOMUtils.createElement("div", {
              className: `${this.player.options.classPrefix}-transcript-loading`,
              textContent: i18n.t("transcript.loading")
            });
            (_a = this.transcriptContent) == null ? void 0 : _a.appendChild(loadingMessage);
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
          if (isLiveStream) {
            if (!((_b = captionTrack == null ? void 0 : captionTrack.cues) == null ? void 0 : _b.length)) {
              const loadingMessage = DOMUtils.createElement("div", {
                className: `${this.player.options.classPrefix}-transcript-loading`,
                textContent: i18n.t("transcript.loading")
              });
              (_c = this.transcriptContent) == null ? void 0 : _c.appendChild(loadingMessage);
              return;
            }
            this._syncLiveTranscriptCues();
            return;
          }
          const primaryTrack = captionTrack;
          const primaryNeedsCues = primaryTrack && (!primaryTrack.cues || primaryTrack.cues.length === 0);
          if (primaryNeedsCues) {
            const loadingMessage = DOMUtils.createElement("div", {
              className: `${this.player.options.classPrefix}-transcript-loading`,
              textContent: i18n.t("transcript.loading")
            });
            (_d = this.transcriptContent) == null ? void 0 : _d.appendChild(loadingMessage);
            const hasSidecarElement = (_f = (_e = this.player).findTrackElement) == null ? void 0 : _f.call(_e, primaryTrack);
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
          const uniqueCues = this._dedupeTranscriptCueItems(allCues);
          uniqueCues.forEach((item, index) => {
            const entry = this.createTranscriptEntry(item.cue, index, item.type);
            this.transcriptEntries.push({
              element: entry,
              cue: item.cue,
              type: item.type,
              startTime: item.cue.startTime,
              endTime: item.cue.endTime
            });
            transcriptContent == null ? void 0 : transcriptContent.appendChild(entry);
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
        _isLiveTranscriptSource() {
          return this.player.state.isLive === true || typeof this.player.isLiveStream === "function" && this.player.isLiveStream();
        }
        _cueDedupeKey(item) {
          const cue = item.cue;
          const text = this._normalizedCueText(cue);
          return `${item.type}|${cue.startTime.toFixed(3)}|${cue.endTime.toFixed(3)}|${text}`;
        }
        _normalizedCueText(cue) {
          return this.stripVTTFormatting(cue.text || "");
        }
        _isNearDuplicateLiveCue(item) {
          if (!this._isLiveTranscriptSource()) {
            return false;
          }
          const text = this._normalizedCueText(item.cue);
          if (text === "") {
            return false;
          }
          return this._hasDuplicateLiveText(
            item.type,
            text,
            item.cue.startTime,
            this.transcriptEntries.map((entry) => ({
              type: entry.type,
              cue: entry.cue,
              startTime: entry.startTime
            }))
          );
        }
        _hasDuplicateLiveText(type, text, startTime, entries) {
          const windowSec = _TranscriptManager.LIVE_TRANSCRIPT_DEDUPE_WINDOW_SEC;
          return entries.some((entry) => {
            if (entry.type !== type) {
              return false;
            }
            if (this._normalizedCueText(entry.cue) !== text) {
              return false;
            }
            return Math.abs(entry.startTime - startTime) < windowSec;
          });
        }
        _dedupeTranscriptCueItems(items) {
          const seen = /* @__PURE__ */ new Set();
          const unique = [];
          for (const item of items) {
            const key = this._cueDedupeKey(item);
            if (seen.has(key) || this._isNearDuplicateLiveCueForList(item, unique)) {
              continue;
            }
            seen.add(key);
            unique.push(item);
          }
          return unique;
        }
        _isNearDuplicateLiveCueForList(item, existing) {
          if (!this._isLiveTranscriptSource()) {
            return false;
          }
          const text = this._normalizedCueText(item.cue);
          if (text === "") {
            return false;
          }
          return this._hasDuplicateLiveText(
            item.type,
            text,
            item.cue.startTime,
            existing.map((other) => ({
              type: other.type,
              cue: other.cue,
              startTime: other.cue.startTime
            }))
          );
        }
        _getTrackMaxCueStartTime(track) {
          var _a;
          if (!((_a = track.cues) == null ? void 0 : _a.length)) {
            return -1;
          }
          let max = -1;
          for (const cue of Array.from(track.cues)) {
            if (cue.startTime > max) {
              max = cue.startTime;
            }
          }
          return max;
        }
        _pickTranscriptTrackFromGroup(group) {
          if (this._isLiveTranscriptSource()) {
            return group.reduce((best, track) => this._getTrackMaxCueStartTime(track) > this._getTrackMaxCueStartTime(best) ? track : best);
          }
          return group.reduce((best, track) => {
            var _a, _b;
            const bestLen = ((_a = best.cues) == null ? void 0 : _a.length) ?? 0;
            const trackLen = ((_b = track.cues) == null ? void 0 : _b.length) ?? 0;
            return trackLen > bestLen ? track : best;
          });
        }
        /**
         * Pick one caption/subtitle TextTrack for the transcript. Native HLS and
         * hls.js can expose multiple tracks for the same language/label.
         */
        _resolveCaptionTrackForTranscript(textTracks) {
          var _a;
          const candidates = textTracks.filter(
            (track) => (track.kind === "captions" || track.kind === "subtitles") && !track._vidplyStale
          );
          if (candidates.length === 0) {
            return null;
          }
          const pickFromGroup = (group) => this._pickTranscriptTrackFromGroup(group);
          const groups = /* @__PURE__ */ new Map();
          for (const track of candidates) {
            const key = this._isLiveTranscriptSource() ? track.language || track.label || "und" : `${track.language}|${track.label}`;
            const group = groups.get(key) ?? [];
            group.push(track);
            groups.set(key, group);
          }
          if (this.currentTranscriptLanguage) {
            const languageMatches = candidates.filter(
              (track) => track.language === this.currentTranscriptLanguage
            );
            if (languageMatches.length > 0) {
              if (this._isLiveTranscriptSource()) {
                return pickFromGroup(languageMatches);
              }
              const first = languageMatches[0];
              if (first) {
                const key = `${first.language}|${first.label}`;
                return pickFromGroup(groups.get(key) ?? languageMatches);
              }
            }
          }
          let bestTrack = null;
          let bestCueCount = -1;
          for (const group of groups.values()) {
            const track = pickFromGroup(group);
            const cueCount = ((_a = track.cues) == null ? void 0 : _a.length) ?? 0;
            if (cueCount > bestCueCount) {
              bestTrack = track;
              bestCueCount = cueCount;
            }
          }
          return bestTrack ?? pickFromGroup(candidates);
        }
        /**
         * Append newly arrived live cues without rebuilding the whole transcript.
         * hls.js may repeat cues in TextTrackList during rolling live updates.
         */
        _syncLiveTranscriptCues() {
          var _a;
          if (!this.transcriptContent) {
            return;
          }
          const captionTrack = this._resolveCaptionTrackForTranscript(this.player.textTracks);
          if (!((_a = captionTrack == null ? void 0 : captionTrack.cues) == null ? void 0 : _a.length)) {
            return;
          }
          if (!this.currentTranscriptLanguage && captionTrack.language) {
            this.currentTranscriptLanguage = captionTrack.language;
          }
          const existingKeys = new Set(
            this.transcriptEntries.map((entry) => this._cueDedupeKey({ cue: entry.cue, type: entry.type }))
          );
          Array.from(captionTrack.cues).forEach((cue) => {
            var _a2;
            const item = { cue, type: "caption" };
            const key = this._cueDedupeKey(item);
            if (existingKeys.has(key) || this._isNearDuplicateLiveCue(item)) {
              return;
            }
            existingKeys.add(key);
            const entry = this.createTranscriptEntry(cue, this.transcriptEntries.length, "caption");
            this.transcriptEntries.push({
              element: entry,
              cue,
              type: "caption",
              startTime: cue.startTime,
              endTime: cue.endTime
            });
            (_a2 = this.transcriptContent) == null ? void 0 : _a2.appendChild(entry);
          });
          this._normalizeLiveTranscriptOrder();
          this.updateActiveEntry();
        }
        _startLiveTranscriptSync() {
          this._stopLiveTranscriptSync();
          if (!this.isVisible || !this._isLiveTranscriptSource()) {
            return;
          }
          const tick = () => {
            if (!this.isVisible || !this._isLiveTranscriptSource()) {
              this._liveSyncTimer = null;
              return;
            }
            this._syncLiveTranscriptCues();
            this._liveSyncTimer = this.setManagedTimeout(tick, 2e3);
          };
          this._liveSyncTimer = this.setManagedTimeout(tick, 2e3);
        }
        _stopLiveTranscriptSync() {
          if (this._liveSyncTimer) {
            this.clearManagedTimeout(this._liveSyncTimer);
            this._liveSyncTimer = null;
          }
        }
        /**
         * Sort live transcript entries chronologically and remove segment-overlap duplicates.
         */
        _normalizeLiveTranscriptOrder() {
          if (!this._isLiveTranscriptSource() || !this.transcriptContent || this.transcriptEntries.length === 0) {
            return;
          }
          const windowSec = _TranscriptManager.LIVE_TRANSCRIPT_DEDUPE_WINDOW_SEC;
          const sorted = [...this.transcriptEntries].sort((a, b) => a.startTime - b.startTime);
          const kept = [];
          const seen = [];
          for (const entry of sorted) {
            const text = this._normalizedCueText(entry.cue);
            const isDuplicate = text !== "" && seen.some((prior) => prior.type === entry.type && prior.text === text && Math.abs(prior.startTime - entry.startTime) < windowSec);
            if (isDuplicate) {
              entry.element.remove();
              continue;
            }
            if (text !== "") {
              seen.push({ type: entry.type, text, startTime: entry.startTime });
            }
            kept.push(entry);
          }
          this.transcriptEntries = kept;
          kept.forEach((entry) => {
            var _a;
            (_a = this.transcriptContent) == null ? void 0 : _a.appendChild(entry.element);
          });
        }
        /**
         * Show message when no transcript is available
         */
        showNoTranscriptMessage() {
          var _a;
          const message = DOMUtils.createElement("div", {
            className: `${this.player.options.classPrefix}-transcript-empty`,
            textContent: i18n.t("transcript.noTranscript")
          });
          (_a = this.transcriptContent) == null ? void 0 : _a.appendChild(message);
        }
        /**
         * Update active transcript entry based on current time
         */
        updateActiveEntry() {
          if (!this.isVisible || this.transcriptEntries.length === 0) return;
          const currentTime = this.player.state.currentTime;
          let activeEntry;
          if (this._isLiveTranscriptSource()) {
            activeEntry = this.transcriptEntries.reduce((best, entry) => {
              if (currentTime < entry.startTime) {
                return best;
              }
              if (!best || entry.startTime > best.startTime) {
                return entry;
              }
              return best;
            }, null);
            if (activeEntry && currentTime - activeEntry.startTime > 120) {
              activeEntry = null;
            }
          } else {
            activeEntry = this.transcriptEntries.find(
              (entry) => currentTime >= entry.startTime && currentTime < entry.endTime
            ) ?? null;
          }
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
            var _a;
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
                (_a = this.transcriptWindow) == null ? void 0 : _a.focus({ preventScroll: true });
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
          var _a, _b, _c;
          if (this.draggableResizable) {
            const wasEnabled = this.draggableResizable.keyboardDragMode;
            this.draggableResizable.toggleKeyboardDragMode();
            const isEnabled = this.draggableResizable.keyboardDragMode;
            if (!wasEnabled && isEnabled) {
              this.enableMoveMode();
              (_a = this._panel) == null ? void 0 : _a.showBadge(i18n.t("transcript.dragModeBadge"));
              this.announceLive(i18n.t("transcript.dragModeEnabled"));
            } else if (wasEnabled && !isEnabled) {
              (_b = this._panel) == null ? void 0 : _b.hideBadge();
              this.announceLive(i18n.t("transcript.dragModeDisabled"));
            }
            this.updateDragOptionState();
            if (this.settingsMenuVisible) {
              this.hideSettingsMenu();
            }
            (_c = this.transcriptWindow) == null ? void 0 : _c.focus({ preventScroll: true });
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
          var _a;
          (_a = this._panel) == null ? void 0 : _a.show();
        }
        /** @see {@link showSettingsMenu} */
        positionSettingsMenu() {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.reposition();
        }
        /** @see {@link showSettingsMenu} */
        hideSettingsMenu({ focusButton = true } = {}) {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.hide({ focusButton });
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
          var _a;
          (_a = this.transcriptWindow) == null ? void 0 : _a.classList.add(
            `${this.player.options.classPrefix}-transcript-move-mode`
          );
          setTimeout(() => {
            var _a2;
            (_a2 = this.transcriptWindow) == null ? void 0 : _a2.classList.remove(
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
          var _a;
          (_a = this._panel) == null ? void 0 : _a.refreshDragState();
        }
        updateResizeOptionState() {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.refreshResizeState();
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
          var _a;
          (_a = this._panel) == null ? void 0 : _a.showBadge(i18n.t("transcript.resizeModeBadge"));
        }
        hideResizeModeIndicator() {
          var _a;
          (_a = this._panel) == null ? void 0 : _a.hideBadge();
        }
        onPointerResizeModeChange(enabled) {
          var _a, _b;
          this.updateResizeOptionState();
          if (enabled) {
            (_a = this._panel) == null ? void 0 : _a.showBadge(i18n.t("transcript.resizeModeBadge"));
            this.announceLive(i18n.t("transcript.resizeModeEnabled"));
          } else {
            (_b = this._panel) == null ? void 0 : _b.hideBadge();
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
          this._stopLiveTranscriptSync();
          this.hideResizeModeIndicator();
          const container = this.player.container;
          if (container) {
            this.inertedElements = setContainerChildrenInert(container, null, false, this.inertedElements);
          }
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
      /** Live HLS re-publishes the same subtitle line within ~6s segment overlap. */
      __publicField(_TranscriptManager, "LIVE_TRANSCRIPT_DEDUPE_WINDOW_SEC", 30);
      TranscriptManager = _TranscriptManager;
    }
  });

  // src/utils/ScriptLoader.ts
  function findExistingScript(url) {
    const scripts = document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script && script.src === url) {
        return script;
      }
    }
    return null;
  }
  function waitForReady(url, isReady, timeout, resolve, reject) {
    if (isReady()) {
      resolve();
      return;
    }
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (isReady()) {
        window.clearInterval(interval);
        resolve();
      } else if (Date.now() - start >= timeout) {
        window.clearInterval(interval);
        reject(new Error(`Script loaded but did not become ready: ${url}`));
      }
    }, 50);
  }
  function loadScriptOnce(url, options = {}) {
    const cached = inFlight.get(url);
    if (cached) {
      return cached;
    }
    const { integrity, crossOrigin, referrerPolicy, isReady, readyTimeout = 1e3 } = options;
    const promise = new Promise((resolve, reject) => {
      const onLoad = () => {
        if (isReady) {
          waitForReady(url, isReady, readyTimeout, resolve, reject);
        } else {
          resolve();
        }
      };
      const existing = findExistingScript(url);
      if (existing) {
        if (isReady && isReady()) {
          resolve();
          return;
        }
        existing.addEventListener("load", onLoad, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error(`Failed to load script: ${url}`)),
          { once: true }
        );
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = crossOrigin ?? "anonymous";
        script.referrerPolicy = referrerPolicy ?? "no-referrer";
      } else if (crossOrigin !== void 0 && crossOrigin !== null) {
        script.crossOrigin = crossOrigin;
      }
      script.onload = onLoad;
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
    const tracked = promise.catch((err) => {
      inFlight.delete(url);
      throw err;
    });
    inFlight.set(url, tracked);
    return tracked;
  }
  function loadPinnedScript(config) {
    const url = config.url || config.defaultUrl;
    const integrity = config.integrity ?? (url === config.defaultUrl ? config.defaultIntegrity : void 0);
    return loadScriptOnce(url, { integrity });
  }
  var inFlight;
  var init_ScriptLoader = __esm({
    "src/utils/ScriptLoader.ts"() {
      "use strict";
      inFlight = /* @__PURE__ */ new Map();
    }
  });

  // src/renderers/YouTubeRenderer.ts
  var YouTubeRenderer_exports = {};
  __export(YouTubeRenderer_exports, {
    YouTubeRenderer: () => YouTubeRenderer
  });
  var YouTubeRenderer;
  var init_YouTubeRenderer = __esm({
    "src/renderers/YouTubeRenderer.ts"() {
      "use strict";
      init_ScriptLoader();
      YouTubeRenderer = class {
        constructor(player) {
          __publicField(this, "rendererType", "youtube");
          __publicField(this, "player");
          __publicField(this, "media");
          __publicField(this, "youtube");
          __publicField(this, "videoId");
          __publicField(this, "isReady");
          __publicField(this, "iframe");
          __publicField(this, "timeUpdateInterval");
          this.player = player;
          this.media = player.element;
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
          const id = "([^&?#/\\s]+)";
          const host = "(?:youtube\\.com|youtube-nocookie\\.com)";
          const patterns = [
            // watch URLs — `v` may be any query parameter, not only the first.
            new RegExp(`${host}\\/watch\\?(?:[^\\s]*&)?v=${id}`),
            // Short links.
            new RegExp(`youtu\\.be\\/${id}`),
            // /embed/, /shorts/ and legacy /v/ path forms.
            new RegExp(`${host}\\/(?:embed|shorts|v)\\/${id}`)
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
          return loadScriptOnce("https://www.youtube.com/iframe_api", {
            isReady: () => Boolean(window.YT && window.YT.Player),
            readyTimeout: 8e3
          });
        }
        createIframe() {
          var _a;
          this.player.element.style.display = "none";
          this.iframe = document.createElement("div");
          this.iframe.id = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
          this.iframe.style.width = "100%";
          this.iframe.style.maxHeight = "100%";
          (_a = this.player.element.parentNode) == null ? void 0 : _a.insertBefore(this.iframe, this.player.element);
        }
        async initializePlayer() {
          return new Promise((resolve, reject) => {
            if (!window.YT || !this.iframe) {
              reject(new Error("YouTube IFrame API is not available"));
              return;
            }
            this.youtube = new window.YT.Player(this.iframe.id, {
              videoId: this.videoId ?? void 0,
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
                onReady: (_event) => {
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
            const youtube2 = this.youtube;
            if (this.isReady && youtube2) {
              const currentTime = youtube2.getCurrentTime();
              const duration = youtube2.getDuration();
              this.player.state.currentTime = currentTime;
              this.player.state.duration = duration;
              this.player.emit("timeupdate", currentTime);
            }
          }, 250);
          const youtube = this.youtube;
          if (youtube && youtube.getDuration) {
            this.player.state.duration = youtube.getDuration();
            this.player.emit("loadedmetadata");
          }
        }
        handleStateChange(event) {
          var _a;
          const states = (_a = window.YT) == null ? void 0 : _a.PlayerState;
          if (!states) return;
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
              if (this.player.options.loop && this.youtube) {
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
        /**
         * Switch to another YouTube video without recreating the iframe player.
         * Used by playlist track changes when the renderer type stays `youtube`.
         */
        loadSource(src) {
          const videoId = this.extractVideoId(src);
          if (!videoId) {
            throw new Error("Invalid YouTube URL");
          }
          if (videoId === this.videoId) {
            return;
          }
          this.videoId = videoId;
          this.player.currentSource = src;
          if (this.isReady && this.youtube) {
            this.youtube.cueVideoById(videoId);
          }
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

  // src/renderers/VimeoRenderer.ts
  var VimeoRenderer_exports = {};
  __export(VimeoRenderer_exports, {
    VimeoRenderer: () => VimeoRenderer
  });
  var VimeoRenderer;
  var init_VimeoRenderer = __esm({
    "src/renderers/VimeoRenderer.ts"() {
      "use strict";
      init_ScriptLoader();
      VimeoRenderer = class {
        constructor(player) {
          __publicField(this, "rendererType", "vimeo");
          __publicField(this, "player");
          __publicField(this, "media");
          __publicField(this, "vimeo");
          __publicField(this, "videoId");
          __publicField(this, "isReady");
          __publicField(this, "iframe");
          this.player = player;
          this.media = player.element;
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
          return loadScriptOnce("https://player.vimeo.com/api/player.js", {
            isReady: () => Boolean(window.Vimeo && window.Vimeo.Player)
          });
        }
        createIframe() {
          var _a;
          this.player.element.style.display = "none";
          this.iframe = document.createElement("div");
          this.iframe.id = `vimeo-player-${Math.random().toString(36).substr(2, 9)}`;
          this.iframe.style.width = "100%";
          this.iframe.style.maxHeight = "100%";
          (_a = this.player.element.parentNode) == null ? void 0 : _a.insertBefore(this.iframe, this.player.element);
        }
        async initializePlayer() {
          var _a;
          const options = {
            id: this.videoId,
            width: "100%",
            height: "100%",
            controls: true,
            autoplay: this.player.options.autoplay,
            muted: this.player.options.muted,
            loop: this.player.options.loop,
            keyboard: false
          };
          if (this.player.options.startTime > 0) {
            options.startTime = this.player.options.startTime;
          }
          if (!window.Vimeo || !this.iframe) {
            throw new Error("Vimeo Player API is not available");
          }
          this.vimeo = new window.Vimeo.Player(this.iframe.id, options);
          await this.vimeo.ready();
          this.isReady = true;
          const vimeoIframe = (_a = this.iframe) == null ? void 0 : _a.querySelector("iframe");
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
          const vimeo = this.vimeo;
          if (!vimeo) return;
          vimeo.on("play", () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
          });
          vimeo.on("pause", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          });
          vimeo.on("ended", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.state.ended = true;
            this.player.emit("ended");
            if (this.player.options.onEnded) {
              this.player.options.onEnded.call(this.player);
            }
          });
          vimeo.on("timeupdate", (...args) => {
            const data = args[0];
            this.player.state.currentTime = data.seconds;
            this.player.state.duration = data.duration;
            this.player.emit("timeupdate", data.seconds);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, data.seconds);
            }
          });
          vimeo.on("volumechange", (...args) => {
            const data = args[0];
            this.player.state.volume = data.volume;
            this.player.emit("volumechange", data.volume);
          });
          vimeo.on("bufferstart", () => {
            this.player.state.buffering = true;
            this.player.emit("waiting");
          });
          vimeo.on("bufferend", () => {
            this.player.state.buffering = false;
            this.player.emit("canplay");
          });
          vimeo.on("seeking", () => {
            this.player.state.seeking = true;
            this.player.emit("seeking");
          });
          vimeo.on("seeked", () => {
            this.player.state.seeking = false;
            this.player.emit("seeked");
          });
          vimeo.on("playbackratechange", (...args) => {
            const data = args[0];
            this.player.state.playbackSpeed = data.playbackRate;
            this.player.emit("ratechange", data.playbackRate);
          });
          vimeo.on("error", (...args) => {
            const error = args[0];
            this.player.handleError(new Error(`Vimeo error: ${(error == null ? void 0 : error.message) ?? "unknown"}`));
          });
        }
        /**
         * Switch to another Vimeo video without recreating the embed player.
         */
        async loadSource(src) {
          const videoId = this.extractVideoId(src);
          if (!videoId) {
            throw new Error("Invalid Vimeo URL");
          }
          if (videoId === this.videoId) {
            return;
          }
          this.videoId = videoId;
          this.player.currentSource = src;
          if (this.isReady && this.vimeo) {
            await this.vimeo.loadVideo(Number(videoId));
          }
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

  // src/renderers/HLSRenderer.ts
  var HLSRenderer_exports = {};
  __export(HLSRenderer_exports, {
    HLSRenderer: () => HLSRenderer
  });
  var HLSRenderer;
  var init_HLSRenderer = __esm({
    "src/renderers/HLSRenderer.ts"() {
      "use strict";
      init_ScriptLoader();
      HLSRenderer = class {
        constructor(player) {
          __publicField(this, "rendererType", "hls");
          __publicField(this, "player");
          __publicField(this, "media");
          __publicField(this, "hls");
          __publicField(this, "_hlsSourceLoaded");
          __publicField(this, "_pendingSrc");
          __publicField(this, "_hlsSubtitleTracksCount");
          __publicField(this, "_cueUpdateTimer");
          __publicField(this, "_lastKnownCueCount");
          __publicField(this, "_lastKnownMaxCueStart");
          __publicField(this, "_nativeTrackListenersDestroyed");
          __publicField(this, "_didDeferredLoad");
          __publicField(this, "_manifestUrl");
          /**
           * True when the most recent startLoad() call was triggered by a seek on a
           * paused media element (not by play()). The FRAG_BUFFERED handler uses this
           * to call stopLoad() once the seek target is buffered, so hls.js does not
           * keep pre-fetching subsequent segments while the user is still paused.
           */
          __publicField(this, "_loadingForSeekOnly");
          __publicField(this, "_cleanupNativeTextTrackListeners");
          // Detaches all hls.js-path media listeners (attachMediaEvents) in destroy().
          __publicField(this, "_listenerController");
          // Pending setTimeout ids so destroy() can cancel retries that would
          // otherwise fire (and touch a torn-down player) after teardown.
          __publicField(this, "_timers");
          // Tracked 'ready' listener registered by updateCaptionButtonsForHls when the
          // control bar isn't built yet; removed on destroy if it never fired.
          __publicField(this, "_pendingReadyHandler");
          this.player = player;
          this.media = player.element;
          this.hls = null;
          this._hlsSourceLoaded = false;
          this._pendingSrc = null;
          this._hlsSubtitleTracksCount = void 0;
          this._cueUpdateTimer = null;
          this._lastKnownCueCount = 0;
          this._lastKnownMaxCueStart = -1;
          this._manifestUrl = null;
          this._cleanupNativeTextTrackListeners = () => {
          };
          this._listenerController = new AbortController();
          this._timers = /* @__PURE__ */ new Set();
          this._pendingReadyHandler = null;
        }
        // True once hls.js is driving playback via MSE. Native HLS playback on
        // iOS / iPadOS keeps a real HTTP URL on the <video> and does not need the
        // streaming path to be forced.
        get isStreaming() {
          return this.hls !== null && this.hls !== void 0;
        }
        /**
         * Schedule a timeout that is automatically cancelled by destroy(). Prevents
         * caption-retry / error-recovery callbacks from running after teardown.
         */
        _setTimeout(handler, ms) {
          const id = setTimeout(() => {
            this._timers.delete(id);
            handler();
          }, ms);
          this._timers.add(id);
        }
        _clearTimers() {
          for (const id of this._timers) {
            clearTimeout(id);
          }
          this._timers.clear();
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
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          const isIPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
          if (!isIOS && !isIPadDesktopMode) {
            return false;
          }
          const video = document.createElement("video");
          return video.canPlayType("application/vnd.apple.mpegurl") !== "";
        }
        async initNative() {
          const { HTML5Renderer: HTML5Renderer2 } = await Promise.resolve().then(() => (init_HTML5Renderer(), HTML5Renderer_exports));
          const native = new HTML5Renderer2(this.player);
          await native.init();
          this.play = () => native.play();
          this.pause = () => native.pause();
          this.seek = (time) => native.seek(time);
          this.setVolume = (volume) => native.setVolume(volume);
          this.setMuted = (muted) => native.setMuted(muted);
          this.setPlaybackSpeed = (speed) => native.setPlaybackSpeed(speed);
          this.ensureLoaded = () => {
            var _a;
            return (_a = native.ensureLoaded) == null ? void 0 : _a.call(native);
          };
          this.getQualities = () => {
            var _a;
            return ((_a = native.getQualities) == null ? void 0 : _a.call(native)) ?? [];
          };
          this.switchQuality = (index) => {
            var _a;
            return (_a = native.switchQuality) == null ? void 0 : _a.call(native, index);
          };
          this.getCurrentQuality = () => {
            var _a;
            return ((_a = native.getCurrentQuality) == null ? void 0 : _a.call(native)) ?? 0;
          };
          this._attachNativeTextTrackListeners();
          this.destroy = () => {
            this._cleanupNativeTextTrackListeners();
            this._clearTimers();
            if (this._pendingReadyHandler) {
              this.player.off("ready", this._pendingReadyHandler);
              this._pendingReadyHandler = null;
            }
            native.destroy();
          };
        }
        /**
         * Listen for HLS-exposed text tracks so captions/transcript buttons appear on native HLS.
         * Debounces rapid addtrack bursts (one per subtitle rendition in the manifest).
         */
        _attachNativeTextTrackListeners() {
          let debounceTimer;
          const checkTracks = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              var _a;
              if (this._nativeTrackListenersDestroyed) return;
              const tracks = this.media.textTracks;
              let count = 0;
              for (let i = 0; i < tracks.length; i++) {
                const k = (_a = tracks[i]) == null ? void 0 : _a.kind;
                if (k === "subtitles" || k === "captions") {
                  count++;
                }
              }
              this._hlsSubtitleTracksCount = count;
              this.updateCaptionButtonsForHls();
            }, 150);
          };
          this.media.textTracks.addEventListener("addtrack", checkTracks);
          this.media.textTracks.addEventListener("removetrack", checkTracks);
          this.media.addEventListener("loadedmetadata", checkTracks);
          this._cleanupNativeTextTrackListeners = () => {
            this._nativeTrackListenersDestroyed = true;
            clearTimeout(debounceTimer);
            this.media.textTracks.removeEventListener("addtrack", checkTracks);
            this.media.textTracks.removeEventListener("removetrack", checkTracks);
            this.media.removeEventListener("loadedmetadata", checkTracks);
          };
        }
        async initHlsJs() {
          var _a;
          this.media.controls = false;
          this.media.removeAttribute("controls");
          if (!window.Hls) {
            await this.loadHlsJs();
          }
          const HlsCtor = window.Hls;
          if (!(HlsCtor == null ? void 0 : HlsCtor.isSupported())) {
            throw new Error("HLS is not supported in this browser");
          }
          const sourceElements = Array.from(this.media.querySelectorAll("source"));
          let originalSrc = null;
          if (sourceElements.length > 0) {
            originalSrc = ((_a = sourceElements[0]) == null ? void 0 : _a.getAttribute("src")) ?? null;
            sourceElements.forEach((source) => source.remove());
            this.player.log("Removed <source> elements for HTML5 validity (hls.js uses src attribute)");
          }
          this.hls = new HlsCtor({
            debug: this.player.options.debug,
            // Never let hls.js auto-start segment loading. loadSource() alone fetches
            // the manifest (needed for duration, quality levels, subtitle tracks) but
            // startLoad() is what kicks off media fragment downloads. We defer that
            // to the first play() (or ensureLoaded() for playlists) so paused HLS
            // players don't pre-download the entire stream the way hls.js does by
            // default. This matches dash.js behavior where initialize(media, null, false)
            // only loads the init segment + minimal startup buffer.
            autoStartLoad: false,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            // Buffer ceilings tuned to roughly match dash.js defaults so HLS and DASH
            // behave similarly in terms of pre-fetched data:
            //  - maxBufferLength (12s) ≈ dash.js bufferTimeDefault: 12
            //  - maxMaxBufferLength (60s) ≈ dash.js bufferTimeAtTopQualityLongForm: 60
            //  - maxBufferSize (30 MB) — byte cap, hit first on high-bitrate streams.
            // For typical 6s segments this keeps ~2 segments buffered ahead during
            // playback. Combined with stopLoad() on pause(), zero segments are
            // pre-fetched when paused.
            maxBufferLength: 12,
            maxMaxBufferLength: 60,
            maxBufferSize: 30 * 1e3 * 1e3,
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
          if (!src && originalSrc) {
            src = originalSrc;
          }
          if (!src) {
            src = this.player.element.getAttribute("data-vidply-src");
          }
          if (!src) {
            const elementSrc = this.player.element.getAttribute("src") || this.player.element.src;
            if (elementSrc && !elementSrc.startsWith("blob:")) {
              src = elementSrc;
            }
          }
          this.player.log(`Loading HLS source: ${src}`, "log");
          if (!src) {
            throw new Error("No HLS source found");
          }
          this._pendingSrc = src;
          this._manifestUrl = src;
          this.hls.loadSource(src);
          this._hlsSourceLoaded = true;
          this.attachHlsEvents();
          this.attachMediaEvents();
        }
        /**
         * Load hls.js. Pinned to an exact version by default (no more `@latest`) and
         * shipped with a matching Subresource Integrity hash, so the default CDN
         * script is verified out of the box. Embedders who self-host can override via:
         *   - `options.hlsScriptUrl` (URL to load from)
         *   - `options.hlsScriptIntegrity` (Subresource Integrity hash, e.g.
         *     `sha384-XXXX`)
         *
         * The built-in hash only applies to the pinned default URL. A custom URL
         * without an explicit integrity gets none — we can't know its hash. Generate
         * a hash for a new pin/URL with:
         *   curl -sSL <url> | openssl dgst -sha384 -binary | openssl base64 -A
         * and prefix with `sha384-`.
         */
        async loadHlsJs() {
          return loadPinnedScript({
            defaultUrl: "https://cdn.jsdelivr.net/npm/hls.js@1.7.0/dist/hls.min.js",
            defaultIntegrity: "sha384-NsaFqWMOpy26cQK1F9VfwDdMFB97h7JCesDaPSI1sr79bzoezFrUOTYBhdsLJgha",
            url: this.player.options.hlsScriptUrl,
            integrity: this.player.options.hlsScriptIntegrity
          });
        }
        attachHlsEvents() {
          const hls = this.hls;
          const Hls = window.Hls;
          if (!hls || !Hls) return;
          hls.on(Hls.Events.MANIFEST_PARSED, (...args) => {
            var _a;
            const data = args[1];
            this.player.log("HLS manifest loaded, found " + data.levels.length + " quality levels");
            this.player.emit("hlsmanifestparsed", data);
            (_a = this.player.liveStreamManager) == null ? void 0 : _a.evaluateHls(this.hls);
            if (this.player.container) {
              this.player.container.classList.remove("vidply-external-controls");
            }
            this._setTimeout(() => {
              var _a2, _b;
              if (this._hlsSubtitleTracksCount === void 0 || this._hlsSubtitleTracksCount === 0) {
                const currentCount = ((_b = (_a2 = this.hls) == null ? void 0 : _a2.subtitleTracks) == null ? void 0 : _b.length) || 0;
                if (currentCount === 0) {
                  this._hlsSubtitleTracksCount = 0;
                  this.updateCaptionButtonsForHls();
                }
              }
            }, 500);
          });
          hls.on(Hls.Events.LEVEL_SWITCHED, (...args) => {
            const data = args[1];
            this.player.log("HLS level switched to " + data.level);
            this.player.emit("hlslevelswitched", data);
          });
          hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (...args) => {
            const data = args[1];
            this.player.log("HLS subtitle tracks updated, found " + data.subtitleTracks.length + " tracks");
            this.player.emit("hlssubtitletracksupdated", data);
            this._hlsSubtitleTracksCount = data.subtitleTracks.length;
            this.updateCaptionButtonsForHls();
            if (data.subtitleTracks.length > 0) {
              this._startCueUpdatePolling();
              this._ensureHlsSubtitleTrackActive();
            }
          });
          hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (...args) => {
            const data = args[1];
            this.player.log("HLS subtitle track switched to " + data.id);
            this.player.emit("hlssubtitletrackswitch", data);
            this._lastKnownCueCount = 0;
            this._startCueUpdatePolling();
          });
          hls.on(Hls.Events.ERROR, (...args) => {
            this.handleHlsError(args[1]);
          });
          hls.on(Hls.Events.FRAG_BUFFERED, () => {
            var _a;
            this.player.state.buffering = false;
            (_a = this.player.liveStreamManager) == null ? void 0 : _a.evaluateHls(this.hls);
            if (!this.media.paused) {
              this._loadingForSeekOnly = false;
            } else if (this._loadingForSeekOnly && this._isTimeBuffered(this.media.currentTime)) {
              this._loadingForSeekOnly = false;
              try {
                hls.stopLoad();
              } catch {
              }
            }
          });
          hls.on(Hls.Events.SUBTITLE_FRAG_PROCESSED, (...args) => {
            const data = args[1];
            if (!data || !data.success) return;
            this._emitTextCuesUpdateIfChanged();
          });
          hls.on(Hls.Events.CUES_PARSED, () => {
            this.player.emit("textcuesupdate");
          });
        }
        _getTotalCueCount() {
          const textTracks = this.media.textTracks;
          let total = 0;
          if (!textTracks) return total;
          for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            if (track && (track.kind === "subtitles" || track.kind === "captions") && track.cues) {
              total += track.cues.length;
            }
          }
          return total;
        }
        _getMaxCueStartTime() {
          const textTracks = this.media.textTracks;
          if (!textTracks) {
            return -1;
          }
          let max = -1;
          for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            if (!track || track.kind !== "subtitles" && track.kind !== "captions" || !track.cues) {
              continue;
            }
            for (let j = 0; j < track.cues.length; j++) {
              const cue = track.cues[j];
              if (cue && cue.startTime > max) {
                max = cue.startTime;
              }
            }
          }
          return max;
        }
        _isLivePlayback() {
          return typeof this.player.isLiveStream === "function" && this.player.isLiveStream();
        }
        /**
         * Live HLS keeps a rolling TextTrack window — cue count plateaus while
         * content keeps changing. Emit when count or latest cue time advances.
         */
        _emitTextCuesUpdateIfChanged() {
          const count = this._getTotalCueCount();
          const maxStart = this._getMaxCueStartTime();
          const isLive = this._isLivePlayback();
          if (isLive || count > this._lastKnownCueCount || maxStart > this._lastKnownMaxCueStart) {
            this._lastKnownCueCount = count;
            this._lastKnownMaxCueStart = maxStart;
            this.player.emit("textcuesupdate");
            return true;
          }
          return false;
        }
        /**
         * Return true if `time` falls inside any TimeRange the SourceBuffer already
         * holds, with a small tolerance to absorb GOP boundaries. Used by the
         * seeking handler to decide whether to surface a 'waiting' event for the
         * spinner UI.
         */
        _isTimeBuffered(time) {
          const buffered = this.media.buffered;
          if (!buffered || buffered.length === 0) return false;
          const tolerance = 0.25;
          for (let i = 0; i < buffered.length; i++) {
            if (time >= buffered.start(i) - tolerance && time <= buffered.end(i) + tolerance) {
              return true;
            }
          }
          return false;
        }
        _startCueUpdatePolling() {
          this._stopCueUpdatePolling();
          let prevCueCount = 0;
          let prevMaxStart = -1;
          let stableRounds = 0;
          const isLive = this._isLivePlayback();
          this._cueUpdateTimer = setInterval(() => {
            const count = this._getTotalCueCount();
            const maxStart = this._getMaxCueStartTime();
            if (isLive) {
              if (count > prevCueCount || maxStart > prevMaxStart) {
                prevCueCount = count;
                prevMaxStart = maxStart;
                this._lastKnownCueCount = count;
                this._lastKnownMaxCueStart = maxStart;
                this.player.emit("textcuesupdate");
              }
              return;
            }
            if (count > prevCueCount || maxStart > prevMaxStart) {
              prevCueCount = count;
              prevMaxStart = maxStart;
              stableRounds = 0;
              this._lastKnownCueCount = count;
              this._lastKnownMaxCueStart = maxStart;
              this.player.emit("textcuesupdate");
            } else {
              stableRounds++;
              if (stableRounds >= 8) {
                this._stopCueUpdatePolling();
                if (count > 0) {
                  this.player.emit("textcuesupdate");
                }
              }
            }
          }, 500);
        }
        _stopCueUpdatePolling() {
          if (this._cueUpdateTimer) {
            clearInterval(this._cueUpdateTimer);
            this._cueUpdateTimer = null;
          }
        }
        /**
         * Update caption buttons based on HLS subtitle tracks
         * Handles the case where control bar may not exist yet
         */
        updateCaptionButtonsForHls(retryCount = 0) {
          const tracksCount = this._hlsSubtitleTracksCount || 0;
          const doUpdate = () => {
            var _a, _b;
            this.player.invalidateTrackCache();
            if (tracksCount > 0) {
              if (this.player.captionManager) {
                const found = this.player.captionManager.refreshTracks();
                if (found === 0 && retryCount < 5) {
                  const delay = (retryCount + 1) * 200;
                  this.player.log(`HLS caption tracks not yet on video element, retrying in ${delay}ms (attempt ${retryCount + 1})`, "info");
                  this._setTimeout(() => {
                    this.updateCaptionButtonsForHls(retryCount + 1);
                  }, delay);
                  return;
                }
              }
              if ((_a = this.player.transcriptManager) == null ? void 0 : _a.isVisible) {
                this.player.transcriptManager.loadTranscriptData();
                this.player.transcriptManager.updateLanguageSelector();
              }
              if (this.player.controlBar) {
                this.player.controlBar.ensureCaptionsButton();
                this.player.controlBar.ensureCaptionStyleButton();
                this.player.controlBar.ensureTranscriptButton();
              }
            } else {
              if (this.player.captionManager) {
                this.player.captionManager.refreshTracks();
              }
              if ((_b = this.player.transcriptManager) == null ? void 0 : _b.isVisible) {
                this.player.transcriptManager.hideTranscript();
              }
              if (this.player.controlBar) {
                this.player.controlBar.removeHlsCaptionButtons(true);
              }
            }
          };
          if (this.player.controlBar) {
            doUpdate();
            return;
          }
          const onReady = () => {
            this.player.off("ready", onReady);
            this._pendingReadyHandler = null;
            doUpdate();
          };
          this._pendingReadyHandler = onReady;
          this.player.on("ready", onReady);
        }
        attachMediaEvents() {
          const { signal } = this._listenerController;
          this.media.addEventListener("loadedmetadata", () => {
            this.player.state.duration = this.media.duration;
            this.player.emit("loadedmetadata");
          }, { signal });
          this.media.addEventListener("durationchange", () => {
            const duration = this.media.duration;
            if (duration && isFinite(duration) && duration > 0) {
              this.player.state.duration = duration;
              this.player.emit("durationchange", duration);
            }
          }, { signal });
          this.media.addEventListener("play", () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
          }, { signal });
          this.media.addEventListener("pause", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          }, { signal });
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
          }, { signal });
          this.media.addEventListener("timeupdate", () => {
            this.player.state.currentTime = this.media.currentTime;
            this.player.emit("timeupdate", this.media.currentTime);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
            }
          }, { signal });
          this.media.addEventListener("volumechange", () => {
            if (!this.player.shouldSyncVolumeFromMedia()) {
              return;
            }
            this.player.state.volume = this.media.volume;
            this.player.state.muted = this.media.muted;
            this.player.emit("volumechange", this.media.volume);
          }, { signal });
          this.media.addEventListener("waiting", () => {
            this.player.state.buffering = true;
            this.player.emit("waiting");
          }, { signal });
          this.media.addEventListener("seeking", () => {
            this.player.state.seeking = true;
            this.player.emit("seeking");
            if (!this._isTimeBuffered(this.media.currentTime)) {
              this.player.state.buffering = true;
              this.player.emit("waiting");
            }
          }, { signal });
          this.media.addEventListener("seeked", () => {
            this.player.state.seeking = false;
            this.player.emit("seeked");
            if (this.media.paused && this.hls) {
              try {
                this.hls.stopLoad();
              } catch {
              }
            }
          }, { signal });
          this.media.addEventListener("canplay", () => {
            this.player.state.buffering = false;
            this.player.emit("canplay");
          }, { signal });
          this.media.addEventListener("error", () => {
            this.player.handleError(this.media.error);
          }, { signal });
        }
        handleHlsError(data) {
          var _a, _b, _c;
          this.player.log(`HLS Error - Type: ${data.type}, Details: ${data.details}, Fatal: ${data.fatal}`, "warn");
          if (data.response) {
            this.player.log(`Response code: ${data.response.code}, URL: ${data.response.url}`, "warn");
          }
          if (data.fatal) {
            const ErrorTypes = (_a = window.Hls) == null ? void 0 : _a.ErrorTypes;
            switch (data.type) {
              case (ErrorTypes == null ? void 0 : ErrorTypes.NETWORK_ERROR):
                this.player.log("Fatal network error, trying to recover...", "error");
                this.player.log(`Network error details: ${data.details}`, "error");
                this._setTimeout(() => {
                  var _a2;
                  (_a2 = this.hls) == null ? void 0 : _a2.startLoad();
                }, 1e3);
                break;
              case (ErrorTypes == null ? void 0 : ErrorTypes.MEDIA_ERROR):
                this.player.log("Fatal media error, trying to recover...", "error");
                (_b = this.hls) == null ? void 0 : _b.recoverMediaError();
                break;
              default:
                this.player.log("Fatal error, cannot recover", "error");
                this.player.handleError(new Error(`HLS Error: ${data.type} - ${data.details}`));
                (_c = this.hls) == null ? void 0 : _c.destroy();
                break;
            }
          } else {
            this.player.log("Non-fatal HLS error: " + data.details, "warn");
          }
        }
        /**
         * Begin fetching media fragments without starting playback. Used by the
         * playlist manager when a track is selected so playback can start quickly
         * once the user hits play. The manifest was already loaded in initHlsJs();
         * this call is just the equivalent of "press play without playing".
         */
        ensureLoaded() {
          if (!this.hls) {
            return;
          }
          if (this._didDeferredLoad) {
            return;
          }
          try {
            this.hls.startLoad(-1);
          } catch {
          }
          this._didDeferredLoad = true;
        }
        play() {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          if (this.hls) {
            this._loadingForSeekOnly = false;
            try {
              this.hls.startLoad(-1);
            } catch {
            }
            this._didDeferredLoad = true;
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
          if (this.hls) {
            try {
              this.hls.stopLoad();
            } catch {
            }
          }
        }
        seek(time) {
          this.media.currentTime = time;
          if (this.hls) {
            if (this.media.paused) {
              this._loadingForSeekOnly = true;
            }
            try {
              this.hls.startLoad(-1);
            } catch {
            }
          }
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
            const byHeight = /* @__PURE__ */ new Map();
            this.hls.levels.forEach((level, index) => {
              const height = Number(level.height) || 0;
              const bitrate = Number(level.bitrate) || 0;
              const key = height > 0 ? height : `br_${bitrate}`;
              const existing = byHeight.get(key);
              if (!existing || bitrate > (existing.bitrate || 0)) {
                byHeight.set(key, { index, height: level.height, width: level.width, bitrate, level });
              }
            });
            return Array.from(byHeight.values()).map((entry) => {
              const height = Number(entry.height) || 0;
              const kb = entry.bitrate > 0 ? Math.round(entry.bitrate / 1e3) : 0;
              const name = height > 0 ? `${height}p` : kb > 0 ? `${kb} kb` : "Auto";
              return { index: entry.index, height: entry.height, width: entry.width, bitrate: entry.bitrate, name };
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
        activateTextTrackForLanguage(lang) {
          if (!this.hls || !lang) return false;
          const tracks = this.hls.subtitleTracks;
          if (!tracks || tracks.length === 0) return false;
          const idx = tracks.findIndex((t) => {
            const tLang = t.lang || t.language || "";
            return tLang === lang || tLang.startsWith(lang) || lang.startsWith(tLang);
          });
          if (idx < 0) return false;
          this.player.log(`Activating HLS subtitle track index ${idx} for language "${lang}"`);
          this.hls.subtitleTrack = idx;
          this._lastKnownCueCount = 0;
          this._startCueUpdatePolling();
          return true;
        }
        /**
         * hls.js does not download subtitle segments until a subtitle rendition is
         * selected. Activate the default (or first) track when captions/transcript
         * should be on so live streams receive rolling WebVTT cues.
         */
        _ensureHlsSubtitleTrackActive() {
          var _a, _b, _c;
          if (!((_b = (_a = this.hls) == null ? void 0 : _a.subtitleTracks) == null ? void 0 : _b.length)) {
            return;
          }
          const wantsSubtitles = this.player.state.captionsEnabled || this.player.options.captionsDefault || ((_c = this.player.transcriptManager) == null ? void 0 : _c.isVisible);
          if (!wantsSubtitles) {
            return;
          }
          if (this.hls.subtitleTrack >= 0) {
            return;
          }
          const tracks = this.hls.subtitleTracks;
          const defaultIdx = tracks.findIndex((t) => t.default);
          const idx = defaultIdx >= 0 ? defaultIdx : 0;
          this.hls.subtitleTrack = idx;
          this._lastKnownCueCount = 0;
          this._startCueUpdatePolling();
          this.player.log(`HLS subtitle track auto-selected: index ${idx}`, "info");
        }
        getTextTrackURLs() {
          if (!this.hls || !this._manifestUrl) return [];
          try {
            const tracks = this.hls.subtitleTracks;
            if (!tracks || tracks.length === 0) return [];
            const results = [];
            for (const track of tracks) {
              const lang = track.lang || track.language || "";
              const playlistUrl = track.url;
              if (!lang || !playlistUrl) continue;
              results.push({ lang, url: playlistUrl });
            }
            return results;
          } catch {
            return [];
          }
        }
        supportsAutoQuality() {
          return true;
        }
        isAutoQuality() {
          var _a;
          return ((_a = this.hls) == null ? void 0 : _a.currentLevel) === -1;
        }
        destroy() {
          this._stopCueUpdatePolling();
          this._clearTimers();
          this._listenerController.abort();
          if (this._pendingReadyHandler) {
            this.player.off("ready", this._pendingReadyHandler);
            this._pendingReadyHandler = null;
          }
          this._lastKnownCueCount = 0;
          this._manifestUrl = null;
          if (this.hls) {
            this.hls.destroy();
            this.hls = null;
          }
        }
      };
    }
  });

  // src/renderers/DASHRenderer.ts
  var DASHRenderer_exports = {};
  __export(DASHRenderer_exports, {
    DASHRenderer: () => DASHRenderer
  });
  var DASHRenderer;
  var init_DASHRenderer = __esm({
    "src/renderers/DASHRenderer.ts"() {
      "use strict";
      init_ScriptLoader();
      DASHRenderer = class {
        constructor(player) {
          __publicField(this, "rendererType", "dash");
          __publicField(this, "player");
          __publicField(this, "media");
          __publicField(this, "dash");
          __publicField(this, "isStreaming", true);
          __publicField(this, "_dashSourceLoaded");
          __publicField(this, "_pendingSrc");
          __publicField(this, "_dashSubtitleTracksCount");
          __publicField(this, "_dashTextTracks");
          __publicField(this, "_cueUpdateTimer");
          __publicField(this, "_captionEnabledHandler");
          __publicField(this, "_captionDisabledHandler");
          __publicField(this, "_lastKnownCueCount");
          __publicField(this, "_lastKnownMaxCueStart");
          __publicField(this, "_dashTextIsTtml");
          __publicField(this, "_pendingTimeouts");
          __publicField(this, "_ttmlDiv");
          __publicField(this, "_manifestUrl");
          // Detaches all media listeners (attachMediaEvents) in destroy().
          __publicField(this, "_listenerController");
          // Deferred 'ready' handler from updateCaptionButtonsForStreaming, removed on
          // destroy if it never fired.
          __publicField(this, "_pendingReadyHandler");
          this.player = player;
          this.media = player.element;
          this.dash = null;
          this._dashSourceLoaded = false;
          this._pendingSrc = null;
          this._dashSubtitleTracksCount = void 0;
          this._dashTextTracks = [];
          this._cueUpdateTimer = null;
          this._captionEnabledHandler = null;
          this._captionDisabledHandler = null;
          this._lastKnownCueCount = 0;
          this._lastKnownMaxCueStart = -1;
          this._dashTextIsTtml = false;
          this._pendingTimeouts = [];
          this._ttmlDiv = null;
          this._manifestUrl = null;
          this._listenerController = new AbortController();
          this._pendingReadyHandler = null;
        }
        async init() {
          this.player.log("Using dash.js for DASH support");
          await this.initDashJs();
        }
        async initDashJs() {
          var _a;
          this.media.controls = false;
          this.media.removeAttribute("controls");
          if (!window.dashjs) {
            await this.loadDashJs();
          }
          const sourceElements = Array.from(this.media.querySelectorAll("source"));
          let originalSrc = null;
          if (sourceElements.length > 0) {
            originalSrc = ((_a = sourceElements[0]) == null ? void 0 : _a.getAttribute("src")) ?? null;
            sourceElements.forEach((source) => source.remove());
            this.player.log("Removed <source> elements for HTML5 validity (dash.js uses MSE)");
          }
          const dashjs = window.dashjs;
          if (!dashjs) {
            throw new Error("dash.js not available");
          }
          this.dash = dashjs.MediaPlayer().create();
          this.dash.updateSettings({
            debug: {
              logLevel: this.player.options.debug ? 4 : 0
            },
            streaming: {
              // Override dash.js default of 'lowestStartupDelay'. For audio
              // AdaptationSets that tie on selectionPriority and role=main (e.g.
              // Axinom's three en/en-low/en-high tracks), 'lowestStartupDelay'
              // falls through to 'highestEfficiency' which, for audio, has no
              // meaningful pixels-per-bit metric and collapses to "highest
              // bitrate". 'firstTrack' respects manifest order instead, which is
              // both predictable and closer to the MPD author's intent.
              selectionModeForInitialTrack: "firstTrack",
              // NOTE on pre-play preload: we deliberately do NOT set
              // streaming.scheduling.scheduleWhilePaused = false here. While that
              // is the documented dash.js way to suppress segment downloads while
              // paused / before the first play, in our setup (dash.js 5.2.0 +
              // dash.initialize(media, null, false) + attachSource at init) it
              // tears down the SourceBuffers mid-init with
              // "SourceBuffer has been removed from the parent media source"
              // exceptions, which leaves the player unable to seek or play. The
              // PR #3785 fix that was supposed to handle the initial-playback /
              // autoPlay=false case is fragile against our usage pattern.
              // Instead we keep dash.js's default scheduling (scheduleWhilePaused
              // stays at its default `true`) and let the buffer caps below limit
              // how much is fetched before play. With a single ~6s segment size,
              // the visible network preload is one init segment per track plus
              // 1–2 media segments — the same "first two chunks" behavior the
              // user previously confirmed as acceptable for DASH.
              buffer: {
                bufferTimeAtTopQuality: 30,
                bufferTimeAtTopQualityLongForm: 60,
                // dash.js 5.x: use bufferTimeDefault (replaces removed stableBufferTime).
                // Keep at 12s — going lower (0 / 1) was tested but dash.js still
                // loads the first segment regardless because it's needed to make
                // the MediaSource playable, so the savings are negligible while
                // hurting mid-playback resilience on slow networks.
                bufferTimeDefault: 12,
                bufferToKeep: 20,
                bufferPruningInterval: 10
              },
              retryAttempts: {
                MPD: 4,
                MediaSegment: 6,
                InitializationSegment: 4,
                BitstreamSwitchingSegment: 4
              },
              retryIntervals: {
                MPD: 1e3,
                MediaSegment: 1e3,
                InitializationSegment: 1e3,
                BitstreamSwitchingSegment: 1e3
              },
              abr: {
                autoSwitchBitrate: { video: true, audio: true }
              },
              text: {
                defaultEnabled: true
              }
            }
          });
          this._ttmlDiv = document.createElement("div");
          this._ttmlDiv.className = "vidply-dash-ttml";
          this._ttmlDiv.style.visibility = "hidden";
          const wrapper = this.player.videoWrapper || this.media.parentElement;
          if (wrapper) {
            wrapper.appendChild(this._ttmlDiv);
          }
          this.dash.initialize(this.media, null, false);
          this.dash.attachTTMLRenderingDiv(this._ttmlDiv);
          let src = this.player.currentSource;
          if (!src && originalSrc) {
            src = originalSrc;
          }
          if (!src) {
            src = this.player.element.getAttribute("data-vidply-src");
          }
          if (!src) {
            const elementSrc = this.player.element.getAttribute("src") || this.player.element.src;
            if (elementSrc && !elementSrc.startsWith("blob:")) {
              src = elementSrc;
            }
          }
          this.player.log(`Loading DASH source: ${src}`, "log");
          if (!src) {
            throw new Error("No DASH source found");
          }
          this._pendingSrc = src;
          this._manifestUrl = src;
          this.dash.attachSource(src);
          this._dashSourceLoaded = true;
          this.player.showPosterOverlay();
          this.attachDashEvents();
          this.attachMediaEvents();
          this._setupCaptionSync();
        }
        /**
         * Load dash.js. Pinned to an exact version (the previous default
         * `5.2.0` is preserved) and shipped with a matching Subresource
         * Integrity hash, so the default CDN script is verified out of the
         * box. Overridable via `options.dashScriptUrl` (URL) /
         * `options.dashScriptIntegrity` (SRI hash). The built-in hash only
         * applies to the pinned default URL. See HLSRenderer.loadHlsJs() for
         * the SRI computation command.
         */
        async loadDashJs() {
          return loadPinnedScript({
            defaultUrl: "https://cdn.jsdelivr.net/npm/dashjs@5.2.0/dist/modern/umd/dash.all.min.js",
            defaultIntegrity: "sha384-DUqWPzOl/i7/DGF7SBoe4NrlZOMxxomlJsg3X0daS5SBeFxco3dmwWQPFr2oauXn",
            url: this.player.options.dashScriptUrl,
            integrity: this.player.options.dashScriptIntegrity
          });
        }
        _setTimeout(fn, delay) {
          const id = setTimeout(() => {
            this._pendingTimeouts = this._pendingTimeouts.filter((t) => t !== id);
            fn();
          }, delay);
          this._pendingTimeouts.push(id);
          return id;
        }
        attachDashEvents() {
          const dashjs = window.dashjs;
          const dash = this.dash;
          if (!dashjs || !dash) return;
          const dashEvents = dashjs.MediaPlayer.events;
          dash.on(dashEvents.MANIFEST_LOADED, (...args) => {
            var _a;
            const e = args[0];
            const data = (e == null ? void 0 : e.data) ?? e;
            this.player.log("DASH manifest loaded");
            this.player.emit("dashmanifestloaded", data);
            (_a = this.player.liveStreamManager) == null ? void 0 : _a.evaluateDash(this.dash);
            if (this.player.container) {
              this.player.container.classList.remove("vidply-external-controls");
            }
            this._setTimeout(() => {
              this._checkSubtitleTracks();
            }, 500);
          });
          dash.on(dashEvents.QUALITY_CHANGE_RENDERED, (...args) => {
            const e = args[0];
            if (e.mediaType === "video") {
              this.player.log("DASH quality changed to index " + e.newQuality);
              this.player.emit("dashqualitychanged", e);
            }
          });
          dash.on(dashEvents.TEXT_TRACKS_ADDED, (...args) => {
            const e = args[0];
            const tracks = (e == null ? void 0 : e.tracks) ?? [];
            this._dashTextTracks = tracks;
            this._dashTextIsTtml = tracks.some(
              (t) => t.isTTML || /stpp|ttml/i.test(t.codec || "") || /ttml/i.test(t.mimeType || "")
            );
            this.player.log(`DASH text tracks added: ${tracks.length} tracks, format: ${this._dashTextIsTtml ? "TTML" : "WebVTT"}`);
            this._dashSubtitleTracksCount = tracks.length;
            this.player.emit("dashsubtitletracksupdated", { tracks });
            this.updateCaptionButtonsForDash();
            if (tracks.length > 0) {
              try {
                dash.setTextTrack(0);
              } catch {
              }
              if (!this._dashTextIsTtml) {
                this._startCueUpdatePolling();
              }
            }
          });
          dash.on(dashEvents.STREAM_INITIALIZED, () => {
            this.player.log("DASH stream initialized");
            this.player.emit("dashstreaminitialized");
            this._setTimeout(() => {
              const qualities = this.getQualities();
              if (qualities.length > 0) {
                this.player.emit("dashmanifestparsed", { qualities });
              }
            }, 300);
          });
          dash.on(dashEvents.ERROR, (...args) => {
            this.handleDashError(args[0]);
          });
          dash.on(dashEvents.FRAGMENT_LOADING_COMPLETED, (...args) => {
            var _a;
            const e = args[0];
            this.player.state.buffering = false;
            if (((_a = e == null ? void 0 : e.request) == null ? void 0 : _a.mediaType) === "text" && !this._dashTextIsTtml) {
              this._setTimeout(() => {
                this._emitTextCuesUpdateIfChanged();
              }, 100);
            }
          });
        }
        /**
         * Count total cues across all subtitle/caption tracks (for WebVTT DASH).
         */
        _getTotalCueCount() {
          const textTracks = this.media.textTracks;
          let total = 0;
          if (!textTracks) return total;
          for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            if (track && (track.kind === "subtitles" || track.kind === "captions") && !track._vidplyStale && track.cues) {
              total += track.cues.length;
            }
          }
          return total;
        }
        _getMaxCueStartTime() {
          const textTracks = this.media.textTracks;
          if (!textTracks) {
            return -1;
          }
          let max = -1;
          for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            if (!track || track.kind !== "subtitles" && track.kind !== "captions" || track._vidplyStale || !track.cues) {
              continue;
            }
            for (let j = 0; j < track.cues.length; j++) {
              const cue = track.cues[j];
              if (cue && cue.startTime > max) {
                max = cue.startTime;
              }
            }
          }
          return max;
        }
        _isLivePlayback() {
          return typeof this.player.isLiveStream === "function" && this.player.isLiveStream();
        }
        _emitTextCuesUpdateIfChanged() {
          const count = this._getTotalCueCount();
          const maxStart = this._getMaxCueStartTime();
          const isLive = this._isLivePlayback();
          if (isLive || count > this._lastKnownCueCount || maxStart > this._lastKnownMaxCueStart) {
            this._lastKnownCueCount = count;
            this._lastKnownMaxCueStart = maxStart;
            this.player.emit("textcuesupdate");
            return true;
          }
          return false;
        }
        /**
         * Return true if `time` falls inside any TimeRange the SourceBuffer already
         * holds, with a small tolerance to absorb GOP boundaries. Used by the
         * seeking handler to decide whether to surface a 'waiting' event for the
         * spinner UI when the user scrubs while paused.
         */
        _isTimeBuffered(time) {
          const buffered = this.media.buffered;
          if (!buffered || buffered.length === 0) return false;
          const tolerance = 0.25;
          for (let i = 0; i < buffered.length; i++) {
            if (time >= buffered.start(i) - tolerance && time <= buffered.end(i) + tolerance) {
              return true;
            }
          }
          return false;
        }
        /**
         * Sync VidPly caption track switches with dash.js so it loads
         * subtitle segments for the selected language.
         */
        _setupCaptionSync() {
          this._captionEnabledHandler = (selectedTrack) => {
            if (this._dashTextIsTtml) {
              if (selectedTrack.track) {
                selectedTrack.track.mode = "showing";
              }
              if (this._ttmlDiv) {
                this._ttmlDiv.style.visibility = "visible";
              }
            }
            this._syncDashTextTrack(selectedTrack);
          };
          this._captionDisabledHandler = () => {
            if (this._dashTextIsTtml && this._ttmlDiv) {
              this._ttmlDiv.style.visibility = "hidden";
            }
            if (this.dash) {
              try {
                this.dash.setTextTrack(-1);
              } catch {
              }
            }
          };
          this.player.on("captionsenabled", this._captionEnabledHandler);
          this.player.on("captionsdisabled", this._captionDisabledHandler);
        }
        /**
         * Map a VidPly caption track to the corresponding dash.js track index
         * and switch dash.js to load segments for that language.
         */
        _syncDashTextTrack(selectedTrack) {
          if (!this.dash || !this._dashTextTracks.length) return;
          const lang = selectedTrack.language;
          if (!lang) return;
          const dashIndex = this._dashTextTracks.findIndex((dt) => {
            const dtLang = dt.lang || dt.language || dt.srclang || "";
            if (!dtLang) return false;
            return dtLang === lang || dtLang.startsWith(lang) || lang.startsWith(dtLang);
          });
          if (dashIndex >= 0) {
            this.player.log(`Syncing DASH text track to index ${dashIndex} (${lang})`);
            try {
              this.dash.setTextTrack(dashIndex);
            } catch {
            }
            if (!this._dashTextIsTtml) {
              this._lastKnownCueCount = 0;
              this._startCueUpdatePolling();
            }
          }
        }
        /**
         * Poll for new WebVTT cues being added by dash.js as subtitle segments load.
         * Emits events for transcript refresh when new cues arrive.
         */
        _startCueUpdatePolling() {
          this._stopCueUpdatePolling();
          let prevCueCount = 0;
          let prevMaxStart = -1;
          let stableRounds = 0;
          const isLive = this._isLivePlayback();
          this._cueUpdateTimer = setInterval(() => {
            const count = this._getTotalCueCount();
            const maxStart = this._getMaxCueStartTime();
            if (isLive) {
              if (count > prevCueCount || maxStart > prevMaxStart) {
                prevCueCount = count;
                prevMaxStart = maxStart;
                this._lastKnownCueCount = count;
                this._lastKnownMaxCueStart = maxStart;
                this.player.emit("textcuesupdate");
              }
              return;
            }
            if (count > prevCueCount || maxStart > prevMaxStart) {
              prevCueCount = count;
              prevMaxStart = maxStart;
              stableRounds = 0;
              this._lastKnownCueCount = count;
              this._lastKnownMaxCueStart = maxStart;
              this.player.emit("textcuesupdate");
            } else {
              stableRounds++;
              if (stableRounds >= 8) {
                this._stopCueUpdatePolling();
                if (count > 0) {
                  this.player.emit("textcuesupdate");
                }
              }
            }
          }, 500);
        }
        _stopCueUpdatePolling() {
          if (this._cueUpdateTimer) {
            clearInterval(this._cueUpdateTimer);
            this._cueUpdateTimer = null;
          }
        }
        _checkSubtitleTracks() {
          if (this._dashSubtitleTracksCount !== void 0 && this._dashSubtitleTracksCount > 0) {
            return;
          }
          const tracks = this.media.textTracks;
          let count = 0;
          for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (track && (track.kind === "subtitles" || track.kind === "captions") && !track._vidplyStale) {
              count++;
            }
          }
          this._dashSubtitleTracksCount = count;
          this.updateCaptionButtonsForDash();
        }
        updateCaptionButtonsForDash(retryCount = 0) {
          const tracksCount = this._dashSubtitleTracksCount || 0;
          const doUpdate = () => {
            var _a, _b;
            this.player.invalidateTrackCache();
            if (tracksCount > 0) {
              if (this.player.captionManager) {
                const found = this.player.captionManager.refreshTracks();
                if (found === 0 && retryCount < 5) {
                  const delay = (retryCount + 1) * 200;
                  this.player.log(`DASH caption tracks not yet on video element, retrying in ${delay}ms (attempt ${retryCount + 1})`, "info");
                  this._setTimeout(() => {
                    this.updateCaptionButtonsForDash(retryCount + 1);
                  }, delay);
                  return;
                }
              }
              if (!this._dashTextIsTtml && ((_a = this.player.transcriptManager) == null ? void 0 : _a.isVisible)) {
                this.player.transcriptManager.loadTranscriptData();
                this.player.transcriptManager.updateLanguageSelector();
              }
              if (this.player.controlBar) {
                this.player.controlBar.ensureCaptionsButton();
                if (!this._dashTextIsTtml) {
                  this.player.controlBar.ensureCaptionStyleButton();
                  this.player.controlBar.ensureTranscriptButton();
                }
              }
            } else {
              if (this.player.captionManager) {
                this.player.captionManager.refreshTracks();
              }
              if ((_b = this.player.transcriptManager) == null ? void 0 : _b.isVisible) {
                this.player.transcriptManager.hideTranscript();
              }
              if (this.player.controlBar) {
                this.player.controlBar.removeHlsCaptionButtons(true);
              }
            }
          };
          if (this.player.controlBar) {
            doUpdate();
            return;
          }
          const onReady = () => {
            this.player.off("ready", onReady);
            this._pendingReadyHandler = null;
            doUpdate();
          };
          this._pendingReadyHandler = onReady;
          this.player.on("ready", onReady);
        }
        attachMediaEvents() {
          const { signal } = this._listenerController;
          this.media.addEventListener("loadedmetadata", () => {
            this.player.state.duration = this.media.duration;
            this.player.emit("loadedmetadata");
          }, { signal });
          this.media.addEventListener("durationchange", () => {
            const duration = this.media.duration;
            if (duration && isFinite(duration) && duration > 0) {
              this.player.state.duration = duration;
              this.player.emit("durationchange", duration);
            }
          }, { signal });
          this.media.addEventListener("play", () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
          }, { signal });
          this.media.addEventListener("pause", () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          }, { signal });
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
          }, { signal });
          this.media.addEventListener("timeupdate", () => {
            this.player.state.currentTime = this.media.currentTime;
            this.player.emit("timeupdate", this.media.currentTime);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, this.media.currentTime);
            }
          }, { signal });
          this.media.addEventListener("volumechange", () => {
            if (!this.player.shouldSyncVolumeFromMedia()) {
              return;
            }
            this.player.state.volume = this.media.volume;
            this.player.state.muted = this.media.muted;
            this.player.emit("volumechange", this.media.volume);
          }, { signal });
          this.media.addEventListener("seeking", () => {
            this.player.state.seeking = true;
            this.player.emit("seeking");
            if (!this._isTimeBuffered(this.media.currentTime)) {
              this.player.state.buffering = true;
              this.player.emit("waiting");
            }
          }, { signal });
          this.media.addEventListener("seeked", () => {
            this.player.state.seeking = false;
            this.player.emit("seeked");
          }, { signal });
          this.media.addEventListener("waiting", () => {
            this.player.state.buffering = true;
            this.player.emit("waiting");
          }, { signal });
          this.media.addEventListener("canplay", () => {
            this.player.state.buffering = false;
            this.player.emit("canplay");
          }, { signal });
          this.media.addEventListener("error", () => {
            this.player.handleError(this.media.error);
          }, { signal });
        }
        handleDashError(e) {
          const wrapped = e;
          const error = (wrapped == null ? void 0 : wrapped.error) ?? wrapped;
          if (!error) return;
          const code = error.code ?? "";
          const message = error.message || "";
          this.player.log(`DASH Error - Code: ${code}, Message: ${message}`, "warn");
          if (typeof code === "number" && code >= 100) {
            this.player.log("Fatal DASH error", "error");
            this.player.handleError(new Error(`DASH Error: ${code} - ${message}`));
          } else {
            this.player.log("Non-fatal DASH error: " + (message || String(error)), "warn");
          }
        }
        ensureLoaded() {
          if (!this.player.options.deferLoad) {
            return;
          }
          if (!this.dash) {
            return;
          }
          if (this._dashSourceLoaded) {
            return;
          }
          const src = this._pendingSrc || this.player._pendingSource || this.player.currentSource;
          if (!src) {
            return;
          }
          try {
            this.dash.attachSource(src);
            this._dashSourceLoaded = true;
          } catch {
          }
        }
        play() {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          if (this.player.options.deferLoad && this.dash && !this._dashSourceLoaded) {
            const src = this._pendingSrc || this.player.currentSource;
            if (src) {
              try {
                this.dash.attachSource(src);
                this._dashSourceLoaded = true;
              } catch {
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
        switchQuality(qualityIndex) {
          if (!this.dash) return;
          if (qualityIndex === -1) {
            if (typeof this.dash.setAutoSwitchQualityFor === "function") {
              this.dash.setAutoSwitchQualityFor("video", true);
            } else {
              this.dash.updateSettings({
                streaming: { abr: { autoSwitchBitrate: { video: true } } }
              });
            }
          } else {
            if (typeof this.dash.setAutoSwitchQualityFor === "function") {
              this.dash.setAutoSwitchQualityFor("video", false);
            } else {
              this.dash.updateSettings({
                streaming: { abr: { autoSwitchBitrate: { video: false } } }
              });
            }
            if (typeof this.dash.setRepresentationForTypeByIndex === "function") {
              this.dash.setRepresentationForTypeByIndex("video", qualityIndex);
            } else if (typeof this.dash.setQualityFor === "function") {
              this.dash.setQualityFor("video", qualityIndex, true);
            }
          }
        }
        getQualities() {
          if (!this.dash) return [];
          try {
            let reps = null;
            if (typeof this.dash.getRepresentationsByType === "function") {
              reps = this.dash.getRepresentationsByType("video");
            }
            if (reps && reps.length > 0) {
              const heightCounts2 = {};
              reps.forEach((r) => {
                const h = Number(r.height) || 0;
                heightCounts2[h] = (heightCounts2[h] || 0) + 1;
              });
              return reps.map((rep, index) => {
                const height = Number(rep.height) || 0;
                const bitrate = Number(rep.bandwidth || rep.bitrate) || 0;
                const kb = bitrate > 0 ? Math.round(bitrate / 1e3) : 0;
                let name;
                if (height > 0 && (heightCounts2[height] ?? 0) > 1 && kb > 0) {
                  name = `${height}p (${kb} kbps)`;
                } else if (height > 0) {
                  name = `${height}p`;
                } else {
                  name = kb > 0 ? `${kb} kbps` : "Auto";
                }
                return {
                  index,
                  id: rep.id,
                  height: rep.height,
                  width: rep.width,
                  bitrate,
                  name
                };
              });
            }
            const bitrateList = this.dash.getBitrateInfoListFor("video");
            if (!bitrateList || bitrateList.length === 0) return [];
            const heightCounts = {};
            bitrateList.forEach((info) => {
              const h = Number(info.height) || 0;
              heightCounts[h] = (heightCounts[h] || 0) + 1;
            });
            return bitrateList.map((info, index) => {
              const height = Number(info.height) || 0;
              const bitrate = Number(info.bitrate) || 0;
              const kb = bitrate > 0 ? Math.round(bitrate / 1e3) : 0;
              let name;
              if (height > 0 && (heightCounts[height] ?? 0) > 1 && kb > 0) {
                name = `${height}p (${kb} kbps)`;
              } else if (height > 0) {
                name = `${height}p`;
              } else {
                name = kb > 0 ? `${kb} kbps` : "Auto";
              }
              return {
                index,
                height: info.height,
                width: info.width,
                bitrate: info.bitrate,
                name
              };
            });
          } catch {
            return [];
          }
        }
        getCurrentQuality() {
          var _a, _b;
          if (!this.dash) return -1;
          try {
            if (typeof this.dash.getRepresentationsByType === "function") {
              const reps = this.dash.getRepresentationsByType("video");
              const current = (_b = (_a = this.dash).getCurrentRepresentationForType) == null ? void 0 : _b.call(_a, "video");
              if (current && reps) {
                const idx = reps.findIndex((r) => r.id === current.id);
                if (idx >= 0) return idx;
              }
            }
            return this.dash.getQualityFor("video");
          } catch {
            return -1;
          }
        }
        handlesOwnCaptions() {
          return this._dashTextIsTtml;
        }
        /**
         * Tell dash.js to activate the text track for `lang` so it begins
         * downloading subtitle segments and populating cues for that language.
         */
        activateTextTrackForLanguage(lang) {
          if (!this.dash || !this._dashTextTracks.length || !lang) return false;
          let dashIndex = this._dashTextTracks.findIndex((dt) => {
            const dtLang = dt.lang || dt.language || dt.srclang || "";
            if (!dtLang) return false;
            return dtLang === lang || dtLang.startsWith(lang) || lang.startsWith(dtLang);
          });
          if (dashIndex < 0) {
            dashIndex = this._dashTextTracks.findIndex((dt) => {
              const dtLabel = (dt.label || dt.labels || "").toString().toLowerCase();
              return dtLabel.includes(lang.toLowerCase());
            });
          }
          if (dashIndex < 0) return false;
          this.player.log(`Activating DASH text track index ${dashIndex} for transcript language "${lang}"`);
          try {
            this.dash.setTextTrack(dashIndex);
          } catch {
          }
          if (this.media.paused) {
            const pos = this.media.currentTime;
            const wasMuted = this.media.muted;
            this.media.muted = true;
            const playPromise = this.media.play();
            const doPause = () => {
              if (this.media && !this.media.paused) {
                this.media.pause();
                this.media.muted = wasMuted;
                if (Math.abs(this.media.currentTime - pos) > 0.5) {
                  this.media.currentTime = pos;
                }
              }
            };
            if (playPromise && typeof playPromise.then === "function") {
              playPromise.then(() => {
                this._setTimeout(doPause, 250);
              }).catch(() => {
                this.media.muted = wasMuted;
              });
            } else {
              this._setTimeout(doPause, 250);
            }
          }
          if (!this._dashTextIsTtml) {
            this._lastKnownCueCount = 0;
            this._startCueUpdatePolling();
          }
          return true;
        }
        getTextTrackURLs() {
          var _a, _b;
          if (!this.dash || !this._manifestUrl) return [];
          try {
            const manifest = (_b = (_a = this.dash).getManifest) == null ? void 0 : _b.call(_a);
            if (!manifest) return [];
            const baseUrl = this._manifestUrl.substring(0, this._manifestUrl.lastIndexOf("/") + 1);
            const results = [];
            const rawPeriods = manifest.Period || manifest.period || manifest.periods || manifest;
            const periods = Array.isArray(rawPeriods) ? rawPeriods : [rawPeriods];
            for (const period of periods) {
              const rawAdaptSets = period.AdaptationSet || period.adaptationSet || period.AdaptationSet_asArray || [];
              const adaptSets = Array.isArray(rawAdaptSets) ? rawAdaptSets : [rawAdaptSets];
              for (const as of adaptSets) {
                const ct = String(as.contentType || as.ContentType || "");
                const mime = String(as.mimeType || as.MimeType || "");
                if (ct !== "text" && !/text\/vtt|application\/ttml/i.test(mime)) continue;
                const lang = String(as.lang || as.language || "");
                const rawReps = as.Representation || as.representation || as.Representation_asArray || [];
                const reps = Array.isArray(rawReps) ? rawReps : [rawReps];
                for (const rep of reps) {
                  const bu = rep.BaseURL || rep.baseURL || rep.BaseURL_asArray;
                  let rawUrl;
                  if (Array.isArray(bu)) {
                    const first = bu[0];
                    rawUrl = typeof first === "string" ? first : first == null ? void 0 : first.__text;
                  } else if (typeof bu === "string") {
                    rawUrl = bu;
                  } else {
                    rawUrl = bu == null ? void 0 : bu.__text;
                  }
                  if (!rawUrl) continue;
                  const url = rawUrl.startsWith("http") ? rawUrl : new URL(rawUrl, baseUrl).href;
                  results.push({ lang, url });
                  break;
                }
              }
            }
            return results;
          } catch {
            return [];
          }
        }
        supportsAutoQuality() {
          return true;
        }
        isAutoQuality() {
          var _a, _b, _c, _d, _e;
          if (!this.dash) return true;
          try {
            if (typeof this.dash.getAutoSwitchQualityFor === "function") {
              return this.dash.getAutoSwitchQualityFor("video");
            }
            const settings = (_b = (_a = this.dash).getSettings) == null ? void 0 : _b.call(_a);
            return ((_e = (_d = (_c = settings == null ? void 0 : settings.streaming) == null ? void 0 : _c.abr) == null ? void 0 : _d.autoSwitchBitrate) == null ? void 0 : _e.video) !== false;
          } catch {
            return true;
          }
        }
        destroy() {
          this._pendingTimeouts.forEach((id) => clearTimeout(id));
          this._pendingTimeouts = [];
          this._stopCueUpdatePolling();
          this._lastKnownCueCount = 0;
          this._listenerController.abort();
          if (this._pendingReadyHandler) {
            this.player.off("ready", this._pendingReadyHandler);
            this._pendingReadyHandler = null;
          }
          if (this._captionEnabledHandler) {
            this.player.off("captionsenabled", this._captionEnabledHandler);
            this._captionEnabledHandler = null;
          }
          if (this._captionDisabledHandler) {
            this.player.off("captionsdisabled", this._captionDisabledHandler);
            this._captionDisabledHandler = null;
          }
          if (this._ttmlDiv && this._ttmlDiv.parentNode) {
            this._ttmlDiv.parentNode.removeChild(this._ttmlDiv);
            this._ttmlDiv = null;
          }
          const textTracks = this.media.textTracks;
          for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            if (track && (track.kind === "subtitles" || track.kind === "captions")) {
              track._vidplyStale = true;
              track.mode = "disabled";
            }
          }
          if (this.dash) {
            try {
              this.dash.updateSettings({ debug: { logLevel: 0 } });
              this.dash.reset();
            } catch {
            }
            try {
              this.dash.destroy();
            } catch {
            }
            this.dash = null;
          }
          this._dashTextTracks = [];
          this._dashTextIsTtml = false;
          this._manifestUrl = null;
        }
      };
    }
  });

  // src/renderers/SoundCloudRenderer.ts
  var SoundCloudRenderer_exports = {};
  __export(SoundCloudRenderer_exports, {
    SoundCloudRenderer: () => SoundCloudRenderer,
    default: () => SoundCloudRenderer_default
  });
  var SoundCloudRenderer, SoundCloudRenderer_default;
  var init_SoundCloudRenderer = __esm({
    "src/renderers/SoundCloudRenderer.ts"() {
      "use strict";
      init_ScriptLoader();
      SoundCloudRenderer = class {
        constructor(player) {
          __publicField(this, "rendererType", "soundcloud");
          __publicField(this, "player");
          __publicField(this, "media");
          __publicField(this, "widget");
          __publicField(this, "trackUrl");
          __publicField(this, "isReady");
          __publicField(this, "iframe");
          __publicField(this, "iframeId");
          __publicField(this, "_previousVolume");
          // Pending init timeout (rejects after 10s); cleared once READY fires or on
          // destroy so it can't reject / touch a torn-down player afterwards.
          __publicField(this, "_initTimeoutId");
          // Detaches the iframe 'load' listener on destroy.
          __publicField(this, "_initController");
          this.player = player;
          this.media = player.element;
          this.widget = null;
          this.trackUrl = null;
          this.isReady = false;
          this.iframe = null;
          this.iframeId = null;
          this._previousVolume = 100;
          this._initTimeoutId = null;
          this._initController = null;
        }
        async init() {
          var _a;
          this.trackUrl = this.player.currentSource || this.player.element.src || ((_a = this.player.element.querySelector("source")) == null ? void 0 : _a.src) || null;
          if (!this.trackUrl || !this.isValidSoundCloudUrl(this.trackUrl)) {
            throw new Error("Invalid SoundCloud URL");
          }
          await this.loadSoundCloudAPI();
          this.createIframe();
          await this.initializeWidget();
        }
        /**
         * Validate a SoundCloud URL by parsing it with the URL constructor and
         * checking the protocol + hostname against an explicit allow-list.
         * Substring checks like `url.includes('soundcloud.com')` accept things
         * like `https://evil.com/?leak=soundcloud.com` or
         * `https://soundcloud.com.attacker.example`.
         */
        isValidSoundCloudUrl(url) {
          if (typeof url !== "string" || !url) return false;
          let parsed;
          try {
            parsed = new URL(url);
          } catch {
            return false;
          }
          if (parsed.protocol !== "https:") return false;
          const allowedHosts = /* @__PURE__ */ new Set([
            "soundcloud.com",
            "www.soundcloud.com",
            "m.soundcloud.com",
            "api.soundcloud.com",
            "api-v2.soundcloud.com"
          ]);
          return allowedHosts.has(parsed.hostname.toLowerCase());
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
          const trackUrl = this.trackUrl;
          if (!trackUrl) {
            throw new Error("SoundCloudRenderer.getEmbedUrl(): trackUrl is not set");
          }
          const params = new URLSearchParams({
            url: trackUrl,
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
          return `https://w.soundcloud.com/player/?${params.toString()}`;
        }
        async loadSoundCloudAPI() {
          if (typeof window.SC !== "undefined") {
            return Promise.resolve();
          }
          return loadScriptOnce("https://w.soundcloud.com/player/api.js", {
            isReady: () => typeof window.SC !== "undefined"
          });
        }
        createIframe() {
          var _a;
          this.player.element.style.display = "none";
          this.player.element.removeAttribute("poster");
          if (this.player.videoWrapper) {
            this.player.videoWrapper.classList.remove("vidply-forced-poster");
            this.player.videoWrapper.style.removeProperty("--vidply-poster-image");
          }
          this.iframeId = `soundcloud-player-${Math.random().toString(36).substr(2, 9)}`;
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
          (_a = this.player.element.parentNode) == null ? void 0 : _a.insertBefore(this.iframe, this.player.element);
        }
        async initializeWidget() {
          return new Promise((resolve, reject) => {
            const iframe = this.iframe;
            if (!iframe || typeof window.SC === "undefined") {
              reject(new Error("SoundCloud widget cannot initialize"));
              return;
            }
            const SC = window.SC;
            if (!SC) {
              reject(new Error("SoundCloud widget cannot initialize"));
              return;
            }
            this._initController = new AbortController();
            iframe.addEventListener("load", () => {
              try {
                const widget = SC.Widget(iframe);
                this.widget = widget;
                widget.bind(SC.Widget.Events.READY, () => {
                  this.isReady = true;
                  if (this._initTimeoutId !== null) {
                    clearTimeout(this._initTimeoutId);
                    this._initTimeoutId = null;
                  }
                  this.attachEvents();
                  if (this.player.container) {
                    this.player.container.classList.add("vidply-external-controls");
                  }
                  widget.getCurrentSound((sound) => {
                    const info = sound;
                    if (info) {
                      this.player.state.duration = info.duration / 1e3;
                      this.player.emit("loadedmetadata");
                    }
                  });
                  resolve();
                });
                widget.bind(SC.Widget.Events.ERROR, (...args) => {
                  const error = args[0];
                  this.player.handleError(new Error(`SoundCloud error: ${(error == null ? void 0 : error.message) || "Unknown error"}`));
                });
              } catch (error) {
                reject(error);
              }
            }, { signal: this._initController.signal });
            this._initTimeoutId = setTimeout(() => {
              this._initTimeoutId = null;
              if (!this.isReady) {
                reject(new Error("SoundCloud widget initialization timeout"));
              }
            }, 1e4);
          });
        }
        attachEvents() {
          const widget = this.widget;
          const SC = window.SC;
          if (!widget || !SC) return;
          const Events = SC.Widget.Events;
          widget.bind(Events.PLAY, () => {
            this.player.state.playing = true;
            this.player.state.paused = false;
            this.player.state.ended = false;
            this.player.emit("play");
            if (this.player.options.onPlay) {
              this.player.options.onPlay.call(this.player);
            }
          });
          widget.bind(Events.PAUSE, () => {
            this.player.state.playing = false;
            this.player.state.paused = true;
            this.player.emit("pause");
            if (this.player.options.onPause) {
              this.player.options.onPause.call(this.player);
            }
          });
          widget.bind(Events.FINISH, () => {
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
          widget.bind(Events.PLAY_PROGRESS, (...args) => {
            const data = args[0];
            const currentTime = data.currentPosition / 1e3;
            this.player.state.currentTime = currentTime;
            this.player.emit("timeupdate", currentTime);
            if (this.player.options.onTimeUpdate) {
              this.player.options.onTimeUpdate.call(this.player, currentTime);
            }
          });
          widget.bind(Events.SEEK, (...args) => {
            const data = args[0];
            this.player.state.currentTime = data.currentPosition / 1e3;
            this.player.emit("seeked");
          });
          widget.bind(Events.LOAD_PROGRESS, (...args) => {
            const data = args[0];
            if (this.player.state.duration && data.loadedProgress !== void 0) {
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
          const widget = this.widget;
          if (this.isReady && widget) {
            if (muted) {
              widget.getVolume((vol) => {
                this._previousVolume = vol;
                widget.setVolume(0);
              });
            } else {
              widget.setVolume(this._previousVolume || 100);
            }
            this.player.state.muted = muted;
          }
        }
        setPlaybackSpeed(_speed) {
          this.player.log("SoundCloud does not support playback speed control", "warn");
        }
        /**
         * Get current track info. Returns the raw sound payload from the
         * SoundCloud Widget API (shape is best described as `unknown` since
         * the API exposes many optional fields we don't formally type).
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
          if (this._initTimeoutId !== null) {
            clearTimeout(this._initTimeoutId);
            this._initTimeoutId = null;
          }
          if (this._initController) {
            this._initController.abort();
            this._initController = null;
          }
          if (this.widget && window.SC) {
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
            } catch {
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

  // src/utils/EventEmitter.ts
  var EventEmitter = class {
    constructor() {
      __publicField(this, "events", {});
    }
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

  // src/core/Player.ts
  init_DOMUtils();

  // src/controls/ControlBar.ts
  init_DOMUtils();
  init_TimeUtils();
  init_Icons();
  init_i18n();
  init_FocusUtils();
  init_PerformanceUtils();

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
    var _a;
    if (!url) return null;
    try {
      const cleaned = ((_a = url.split("?")[0]) == null ? void 0 : _a.split("#")[0]) ?? "";
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
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "_overflowMenuItemRef", null);
      __publicField(this, "controls");
      __publicField(this, "currentPreviewTime");
      __publicField(this, "element");
      __publicField(this, "hideTimeout");
      __publicField(this, "isDraggingProgress");
      __publicField(this, "isDraggingVolume");
      __publicField(this, "openMenu");
      __publicField(this, "openMenuButton");
      __publicField(this, "overflowResizeObserver", null);
      /** Player-event subscriptions grouped by the method that registered them,
       *  so rebuilds can detach-and-re-add per group without leaking. */
      __publicField(this, "_playerSubscriptions", []);
      /** Guards the one-time auto-hide DOM/player listener binding so control
       *  rebuilds (which re-call setupAutoHide) don't stack duplicate handlers. */
      __publicField(this, "_autoHideBound", false);
      /** Guards the one-time window-resize/fullscreen overflow listeners so
       *  control rebuilds (which re-call setupOverflowDetection) don't stack them.
       *  The ResizeObserver is still recreated each call for the new rightButtons. */
      __publicField(this, "_overflowGlobalBound", false);
      __publicField(this, "previewSupported", false);
      __publicField(this, "previewThumbnailCache", /* @__PURE__ */ new Map());
      __publicField(this, "previewThumbnailTimeout", null);
      __publicField(this, "previewUsingMainVideo", false);
      __publicField(this, "previewVideo", null);
      __publicField(this, "previewVideoInitialized", false);
      __publicField(this, "previewVideoReady", false);
      __publicField(this, "rightButtons");
      __publicField(this, "overflowMenuButton", null);
      /** Track of the currently open volume slider so a single pair of
       *  document listeners (installed once in {@link init}) can update the
       *  right element while dragging without being re-registered per open. */
      __publicField(this, "_activeVolumeTrack", null);
      /** Track of the currently rendered progress bar so document-level
       *  mousemove/mouseup handlers installed once in {@link init} can resolve
       *  the geometry without re-registering per drag. */
      __publicField(this, "_progressBarRect", null);
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
      if (isFullscreen && menu.parentElement === this.player.container) {
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
        const previousHandlers = menuButtonHandlers.get(this.openMenuButton);
        if (previousHandlers == null ? void 0 : previousHandlers.blur) {
          this.openMenuButton.removeEventListener("blur", previousHandlers.blur);
          delete previousHandlers.blur;
        }
        if (previousHandlers == null ? void 0 : previousHandlers.mousedown) {
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
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
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
      if (!this.player.playlistManager) {
        const rewindButton = this.createRewindButton();
        leftButtons.appendChild(rewindButton);
        this.controls.rewind = rewindButton;
      }
      if (!this.player.playlistManager) {
        const forwardButton = this.createForwardButton();
        leftButtons.appendChild(forwardButton);
        this.controls.forward = forwardButton;
      }
      if (!this.player.playlistManager && this.player.options.goLiveButton) {
        const goLiveButton = this.createGoLiveButton();
        leftButtons.appendChild(goLiveButton);
        this.controls.goLive = goLiveButton;
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
      const src = this.player.currentSource || ((_b = (_a = this.player.element) == null ? void 0 : _a.getAttribute) == null ? void 0 : _b.call(_a, "src")) || ((_c = this.player.element) == null ? void 0 : _c.currentSrc) || ((_d = this.player.element) == null ? void 0 : _d.src) || ((_h = (_g = (_f = (_e = this.player.element) == null ? void 0 : _e.querySelector) == null ? void 0 : _f.call(_e, "source")) == null ? void 0 : _g.getAttribute) == null ? void 0 : _h.call(_g, "src")) || ((_k = (_j = (_i = this.player.element) == null ? void 0 : _i.querySelector) == null ? void 0 : _j.call(_i, "source")) == null ? void 0 : _k.src) || "";
      const isHlsSource = typeof src === "string" && src.includes(".m3u8");
      const isDashSource = typeof src === "string" && src.includes(".mpd");
      const isVideoElement = ((_m = (_l = this.player.element) == null ? void 0 : _l.tagName) == null ? void 0 : _m.toLowerCase()) === "video";
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
      var _a, _b, _c;
      const textTracks = this.player.element.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        if (((_a = textTracks[i]) == null ? void 0 : _a.kind) === "chapters") return true;
      }
      const trackEls = Array.from(this.player.element.querySelectorAll('track[kind="chapters"]'));
      if (trackEls.length > 0) return true;
      const current = (_c = (_b = this.player.playlistManager) == null ? void 0 : _b.getCurrentTrack) == null ? void 0 : _c.call(_b);
      if ((current == null ? void 0 : current.tracks) && Array.isArray(current.tracks)) {
        const tracks = current.tracks;
        return tracks.some((t) => (t == null ? void 0 : t.kind) === "chapters");
      }
      return false;
    }
    hasCaptionTracks() {
      var _a, _b;
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
      const current = (_b = (_a = this.player.playlistManager) == null ? void 0 : _a.getCurrentTrack) == null ? void 0 : _b.call(_a);
      const playlistTracks = (current == null ? void 0 : current.tracks) ?? [];
      if (playlistTracks.some((t) => (t == null ? void 0 : t.kind) === "captions" || (t == null ? void 0 : t.kind) === "subtitles")) {
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
      var _a, _b;
      if (this.previewVideoInitialized) return;
      if (!((_b = (_a = this.player) == null ? void 0 : _a.state) == null ? void 0 : _b.hasStartedPlayback)) return;
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
        var _a, _b;
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
      this.subscribe("controls", "playlisttrackchange", updateState);
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
      this.subscribe("controls", "playlisttrackchange", updateState);
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
        className: `${this.player.options.classPrefix}-live-indicator`,
        attributes: {
          "hidden": "true"
        }
      });
      this.controls.liveBadge.appendChild(liveBadgeVisual);
      this.controls.liveBadge.appendChild(liveBadgeAccessible);
      this.controls.liveBadgeVisual = liveBadgeVisual;
      this.controls.liveBadgeAccessible = liveBadgeAccessible;
      container.appendChild(this.controls.currentTimeDisplay);
      container.appendChild(separator);
      container.appendChild(this.controls.durationDisplay);
      container.appendChild(this.controls.liveBadge);
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
              var _a;
              if ((_a = this.player.renderer) == null ? void 0 : _a.switchQuality) {
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
              var _a;
              if (((_a = this.player.renderer) == null ? void 0 : _a.switchQuality) && quality.index !== void 0) {
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
      Promise.resolve().then(() => (init_CaptionStyleMenu(), CaptionStyleMenu_exports)).then(({ showCaptionStyleMenu: showCaptionStyleMenu2 }) => showCaptionStyleMenu2(this, button)).catch((error) => this.player.log("Failed to load caption style menu:", error, "error"));
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
          var _a;
          (_a = this.player.captionManager) == null ? void 0 : _a.switchTrack(track.index);
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
      var _a;
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
        var _a, _b;
        const url = ((_a = this.resolveDownloadTarget()) == null ? void 0 : _a.url) || downloadUrl;
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        a.download = ((_b = url.split("/").pop()) == null ? void 0 : _b.split("?")[0]) || "download";
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
      this.controls.download = button;
      this.applyDownloadTarget(button, {
        url: downloadUrl,
        format: (target == null ? void 0 : target.format) ?? this.resolveDownloadFormat(downloadUrl),
        sizeBytes: (target == null ? void 0 : target.sizeBytes) ?? this.resolveInitialDownloadSize()
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
      var _a, _b;
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
      const url = this.player.options.downloadUrl || ((_b = (_a = this.player.element) == null ? void 0 : _a.dataset) == null ? void 0 : _b.vidplyDownloadUrl) || "";
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
      var _a;
      const manager = this.player.playlistManager;
      const tracks = manager == null ? void 0 : manager.tracks;
      if (!manager || !Array.isArray(tracks) || tracks.length === 0) return null;
      const describesDownloads = tracks.some((track) => {
        const url = track == null ? void 0 : track.downloadUrl;
        return typeof url === "string" && url !== "";
      });
      if (!describesDownloads) return null;
      return ((_a = manager.getCurrentTrack) == null ? void 0 : _a.call(manager)) ?? null;
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
      var _a, _b;
      const dataset = ((_a = this.player.element) == null ? void 0 : _a.dataset) || {};
      const explicit = this.player.options.downloadFormat || dataset.vidplyDownloadFormat || null;
      if (explicit) return explicit;
      const sourceEls = ((_b = this.player.element) == null ? void 0 : _b.querySelectorAll) ? Array.from(this.player.element.querySelectorAll("source")) : [];
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
      var _a;
      const dataset = ((_a = this.player.element) == null ? void 0 : _a.dataset) || {};
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
      if (this.controls.liveBadge) {
        this.controls.liveBadge.hidden = !isLive;
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
      var _a;
      const isLive = this.player.state.isLive;
      const behindLive = this.player.state.behindLive;
      const prefix = this.player.options.classPrefix;
      if (this.controls.restart) {
        this.controls.restart.hidden = isLive;
      }
      if (this.controls.forward) {
        this.controls.forward.hidden = !isLive || !behindLive;
      }
      if (this.controls.goLive) {
        this.controls.goLive.hidden = !isLive || !behindLive;
      }
      this.updateLiveTimeDisplay();
      const speedButton = (_a = this.rightButtons) == null ? void 0 : _a.querySelector(`.${prefix}-speed`);
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
      var _a;
      const textTracks = this.player.element.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        const tt = textTracks[i];
        if (tt) tt.mode = "disabled";
      }
      const captionsContainer = (_a = this.player.container) == null ? void 0 : _a.querySelector(`.${this.player.options.classPrefix}-captions`);
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
      const overflowButtons = Array.from(this.rightButtons.querySelectorAll('button[data-in-overflow="true"]'));
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
        const width = btn.offsetWidth + parseInt(style.marginLeft || "0") + parseInt(style.marginRight || "0");
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
        const priorityAttr = isSmallScreen ? "overflowPriorityMobile" : "overflowPriority";
        if (this.player.options.debug) {
          console.log(`Using ${isSmallScreen ? "mobile" : "desktop"} priorities (width: ${window.innerWidth}px)`);
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
          const shouldHide = isSmallScreen ? priority > 1 : currentWidth > availableWidth;
          if (shouldHide) {
            btn.dataset.inOverflow = "true";
            btn.style.display = "none";
            currentWidth -= width;
            movedToOverflow++;
            if (this.player.options.debug) {
              console.log(`  → Hiding button: ${buttonLabel} (priority ${priority}, ${isSmallScreen ? "mobile" : "desktop"})`);
            }
          } else {
            btn.dataset.inOverflow = "false";
            btn.style.display = "";
          }
        }
        if (this.player.options.debug) {
          console.log("Overflow button exists?", Boolean(this.overflowMenuButton));
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
        if (this.overflowMenuButton) {
          this.overflowMenuButton.style.display = "none";
        }
      }
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

  // src/core/Player.ts
  init_CaptionManager();

  // src/controls/KeyboardManager.ts
  init_i18n();
  init_PerformanceUtils();
  var KeyboardManager = class {
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "shortcuts");
      __publicField(this, "announcer", null);
      // Announcements are driven by player state-change events so they fire for
      // mouse/touch control use too, not only keyboard shortcuts (WCAG 4.1.3).
      // Gated until 'ready' so initial volume/mute/source setup stays silent.
      __publicField(this, "_announceReady", false);
      __publicField(this, "_prevMuted");
      __publicField(this, "_prevVolumePercent");
      __publicField(this, "_stateAnnouncers", []);
      __publicField(this, "_announceVolume");
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
      var _a, _b;
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
            break;
          }
        }
      }
      if (!handled && this.player.options.debug) {
        console.log("[VidPly] Unhandled key:", e.key, "code:", e.code, "shiftKey:", e.shiftKey);
      }
    }
    executeAction(action, _event) {
      var _a;
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
            const captionsButton = (_a = this.player.controlBar) == null ? void 0 : _a.controls.captions;
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
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "supported");
      __publicField(this, "handlers", {});
      __publicField(this, "boundActions", []);
      __publicField(this, "lastPositionUpdate", 0);
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

  // src/core/Player.ts
  init_HTML5Renderer();
  init_Icons();
  init_i18n();
  init_StorageManager();
  init_PerformanceUtils();

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
    constructor(player) {
      __publicField(this, "player");
      // All of the "remember current style / scroll / viewport" slots used
      // to restore state on exit. Kept private so the rest of the code
      // base cannot poke into them.
      __publicField(this, "originalScrollX");
      __publicField(this, "originalScrollY");
      __publicField(this, "originalBodyOverflow");
      __publicField(this, "originalBodyPosition");
      __publicField(this, "originalBodyWidth");
      __publicField(this, "originalBodyHeight");
      __publicField(this, "originalHtmlOverflow");
      __publicField(this, "originalBodyBackground");
      __publicField(this, "originalHtmlBackground");
      __publicField(this, "originalViewport");
      __publicField(this, "inertElements", []);
      this.player = player;
    }
    enable() {
      var _a;
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
      this.originalViewport = (_a = document.querySelector('meta[name="viewport"]')) == null ? void 0 : _a.getAttribute("content");
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
  init_Sanitize();
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
    constructor(player) {
      __publicField(this, "player");
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
    constructor(player) {
      __publicField(this, "player");
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
  init_DOMUtils();
  init_i18n();
  init_PerformanceUtils();
  var ResumeManager = class {
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "saveProgressThrottled", null);
      __publicField(this, "resumeChecked", false);
      __publicField(this, "listenersAttached", false);
      /** Element focused before the modal opened, restored when it closes. */
      __publicField(this, "previouslyFocused", null);
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
        var _a;
        if (this.player.state.playing && this.player.state.duration > 0) {
          (_a = this.saveProgressThrottled) == null ? void 0 : _a.call(this);
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
        var _a;
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
          const withinModal = ((_a = player.resumePromptElement) == null ? void 0 : _a.contains(active)) ?? false;
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
      var _a, _b;
      const player = this.player;
      if (!player.resumePromptElement) return;
      const toRestore = this.previouslyFocused;
      this.previouslyFocused = null;
      player.resumePromptElement.remove();
      player.resumePromptElement = null;
      player.state.resumePromptVisible = false;
      const fallback = ((_b = (_a = player.controlBar) == null ? void 0 : _a.controls) == null ? void 0 : _b.playPause) ?? null;
      const target = toRestore && document.contains(toRestore) ? toRestore : fallback;
      target == null ? void 0 : target.focus({ preventScroll: true });
      player.emit("resumeprompthide");
    }
  };

  // src/core/ResponsiveManager.ts
  var ResponsiveManager = class {
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "orientationQuery", null);
      __publicField(this, "orientationHandler", null);
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
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "boundRefresh");
      __publicField(this, "boundReset");
      /** Set by renderers when the manifest reports a dynamic/live playlist. */
      __publicField(this, "sourceReportsLive", null);
      this.player = player;
      this.boundRefresh = () => this.refresh();
      this.boundReset = () => {
        this.sourceReportsLive = null;
        this.refresh();
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
    /** Called by HLSRenderer when the manifest or buffer state indicates live. */
    evaluateHls(hls) {
      if (!hls) {
        return;
      }
      const liveSync = hls.liveSyncPosition;
      if (typeof liveSync === "number" && Number.isFinite(liveSync)) {
        this.sourceReportsLive = true;
        this.refresh();
      }
    }
    /** Called by DASHRenderer after the MPD is loaded. */
    evaluateDash(dash) {
      if (!dash || typeof dash.isDynamic !== "function") {
        return;
      }
      if (dash.isDynamic()) {
        this.sourceReportsLive = true;
        this.refresh();
      }
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
      if (media.duration === Infinity || !Number.isFinite(media.duration)) {
        return true;
      }
      const renderer = this.player.renderer;
      if ((renderer == null ? void 0 : renderer.rendererType) === "hls") {
        const hls = renderer.hls ?? null;
        const liveSync = hls == null ? void 0 : hls.liveSyncPosition;
        if (typeof liveSync === "number" && Number.isFinite(liveSync)) {
          return true;
        }
      }
      if ((renderer == null ? void 0 : renderer.rendererType) === "dash") {
        const dash = renderer.dash ?? null;
        if (dash && typeof dash.isDynamic === "function" && dash.isDynamic()) {
          return true;
        }
      }
      return false;
    }
    getLiveEdge() {
      const media = this.player.element;
      if (!media) {
        return null;
      }
      const renderer = this.player.renderer;
      if ((renderer == null ? void 0 : renderer.rendererType) === "hls") {
        const hls = renderer.hls ?? null;
        const liveSync = hls == null ? void 0 : hls.liveSyncPosition;
        if (typeof liveSync === "number" && Number.isFinite(liveSync)) {
          return liveSync;
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
      var _a;
      const media = this.player.element;
      if (!((_a = media == null ? void 0 : media.seekable) == null ? void 0 : _a.length)) {
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
      var _a, _b;
      const wasLive = this.player.state.isLive;
      const wasBehind = this.player.state.behindLive;
      const isLive = this.resolveIsLive();
      const liveEdge = isLive ? this.getLiveEdge() : null;
      const behindLive = isLive && this.isBehindLive();
      this.player.state.isLive = isLive;
      this.player.state.liveEdge = liveEdge;
      this.player.state.behindLive = behindLive;
      const prefix = this.player.options.classPrefix;
      (_a = this.player.container) == null ? void 0 : _a.classList.toggle(`${prefix}-is-live`, isLive);
      (_b = this.player.container) == null ? void 0 : _b.classList.toggle(`${prefix}-behind-live`, behindLive);
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
  init_PerformanceUtils();
  var MetadataAlertsManager = class {
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "cueChangeHandler", null);
      __publicField(this, "alertHandlers", /* @__PURE__ */ new Map());
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
      var _a, _b;
      if (!element) return;
      const titleSelector = config.titleSelector || "[data-vidply-alert-title], h3, header";
      const messageSelector = config.messageSelector || "[data-vidply-alert-message], p";
      const titleEl = element.querySelector(titleSelector);
      if (titleEl && !titleEl.dataset.vidplyAlertTitleOriginal) {
        titleEl.dataset.vidplyAlertTitleOriginal = ((_a = titleEl.textContent) == null ? void 0 : _a.trim()) ?? "";
      }
      const messageEl = element.querySelector(messageSelector);
      if (messageEl && !messageEl.dataset.vidplyAlertMessageOriginal) {
        messageEl.dataset.vidplyAlertMessageOriginal = ((_b = messageEl.textContent) == null ? void 0 : _b.trim()) ?? "";
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
      var _a, _b, _c;
      if (!target || target === "none") return;
      if (target === "alert" && fallbackElement) {
        fallbackElement.focus({ preventScroll: true });
        return;
      }
      const player = this.player;
      if (target === "player") {
        (_a = player.container) == null ? void 0 : _a.focus({ preventScroll: true });
        return;
      }
      if (target === "media") {
        player.element.focus({ preventScroll: true });
        return;
      }
      if (target === "playButton") {
        const playButton = (_c = (_b = player.controlBar) == null ? void 0 : _b.controls) == null ? void 0 : _c.playPause;
        playButton == null ? void 0 : playButton.focus({ preventScroll: true });
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

  // src/core/TrackInfoView.ts
  init_DOMUtils();

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
    var _a;
    const elements = root instanceof Element ? Array.from(root.children) : Array.from(root.childNodes).filter((node) => node instanceof Element);
    for (const child of elements) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        while (child.firstChild) {
          (_a = child.parentNode) == null ? void 0 : _a.insertBefore(child.firstChild, child);
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
        if (!(allowed == null ? void 0 : allowed.has(name))) {
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
  init_Icons();
  init_i18n();
  init_TimeUtils();
  var _TrackInfoView = class _TrackInfoView {
    constructor(classPrefix = "vidply") {
      __publicField(this, "element");
      __publicField(this, "classPrefix");
      __publicField(this, "titleElementId");
      __publicField(this, "longDescPanelId");
      __publicField(this, "handleClick");
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
      var _a;
      const panel = (_a = button.closest(`.${this.classPrefix}-track-info`)) == null ? void 0 : _a.querySelector(`#${CSS.escape(this.longDescPanelId)}`);
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
  __publicField(_TrackInfoView, "instanceCounter", 0);
  var TrackInfoView = _TrackInfoView;

  // src/controls/KeyboardHelp.ts
  init_DOMUtils();
  init_Icons();
  init_i18n();
  init_FocusUtils();
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
    constructor(player) {
      __publicField(this, "player");
      __publicField(this, "isOpen", false);
      __publicField(this, "overlay", null);
      __publicField(this, "_triggerElement", null);
      __publicField(this, "_keydownHandler", null);
      __publicField(this, "_content", null);
      __publicField(this, "_inertedElements", []);
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
      var _a;
      if ((_a = this.player.state) == null ? void 0 : _a.isLive) {
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
      var _a;
      if (((_a = this.player.state) == null ? void 0 : _a.isLive) && action === "seek-forward") {
        return i18n.t("help.actions.seek-forward-live");
      }
      return i18n.t(`help.actions.${action}`);
    }
    buildLiveControlsSection() {
      var _a;
      if (!((_a = this.player.state) == null ? void 0 : _a.isLive)) {
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
      var _a;
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
      (_a = this.player.container) == null ? void 0 : _a.classList.add(`${this.prefix}-modal-open`);
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
      closeButton == null ? void 0 : closeButton.focus({ preventScroll: true });
      this.player.emit("keyboardhelpopen");
    }
    hide() {
      var _a, _b, _c;
      if (!this.overlay) return;
      this.overlay.style.display = "none";
      (_a = this.player.container) == null ? void 0 : _a.classList.remove(`${this.prefix}-modal-open`);
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
          (_b = this.player.container) == null ? void 0 : _b.focus();
        }
      } else {
        (_c = this.player.container) == null ? void 0 : _c.focus();
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
      var _a;
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
      (_a = this.player.container) == null ? void 0 : _a.classList.remove(`${this.prefix}-modal-open`);
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
      const module = await Promise.resolve().then(() => (init_AudioDescriptionManager(), AudioDescriptionManager_exports));
      AudioDescriptionManagerModule = module.AudioDescriptionManager;
    }
    return AudioDescriptionManagerModule;
  }
  async function loadSignLanguageManager() {
    if (!SignLanguageManagerModule) {
      const module = await Promise.resolve().then(() => (init_SignLanguageManager(), SignLanguageManager_exports));
      SignLanguageManagerModule = module.SignLanguageManager;
    }
    return SignLanguageManagerModule;
  }
  async function loadFloatingPlayerManager() {
    if (!FloatingPlayerManagerModule) {
      const module = await Promise.resolve().then(() => (init_FloatingPlayerManager(), FloatingPlayerManager_exports));
      FloatingPlayerManagerModule = module.FloatingPlayerManager;
    }
    return FloatingPlayerManagerModule;
  }
  var ALLOWED_MEDIA_TYPES = ["video", "audio"];
  var playerInstanceCounter = 0;
  var _Player = class _Player extends EventEmitter {
    constructor(element, options = {}) {
      super();
      __publicField(this, "element");
      __publicField(this, "container");
      /**
       * Runtime options. Includes a `[key: string]: unknown` index for
       * internal-only dynamic keys that have not yet been promoted into
       * the public {@link PlayerOptions} interface.
       */
      __publicField(this, "options");
      __publicField(this, "state");
      __publicField(this, "renderer", null);
      __publicField(this, "controlBar", null);
      __publicField(this, "captionManager", null);
      __publicField(this, "keyboardManager", null);
      __publicField(this, "mediaSessionManager", null);
      __publicField(this, "transcriptManager", null);
      __publicField(this, "playlistManager", null);
      __publicField(this, "keyboardHelp", null);
      __publicField(this, "audioDescriptionManager", null);
      __publicField(this, "signLanguageManager", null);
      __publicField(this, "floatingPlayerManager", null);
      __publicField(this, "liveStreamManager", null);
      __publicField(this, "storage");
      __publicField(this, "instanceId");
      __publicField(this, "_audioDescriptionDesiredState");
      __publicField(this, "_fallbackSources", null);
      __publicField(this, "_isAudioContent");
      __publicField(this, "_isFallingBack");
      __publicField(this, "_managersLoading", null);
      __publicField(this, "_originalElement");
      /** Lazily-created on first pseudo-fullscreen entry. Owns the scroll /
       *  inert / viewport bookkeeping that used to live as `_original*`
       *  fields directly on the player. */
      __publicField(this, "pseudoFullscreen", null);
      /** Owns `applyTheme`/`setTheme`/`setThemeVariable`/`resetTheme`. Player
       *  keeps delegating public methods so the existing API is unchanged. */
      __publicField(this, "themeManager");
      /** Owns poster resolution, canvas-capture, and overlay show/hide. */
      __publicField(this, "posterManager");
      /** Owns resume-playback prompt + progress persistence. Lazily
       *  created the first time `initResumePlayback` is called so sites
       *  that don't enable the feature don't pay the DOM / listener cost. */
      __publicField(this, "resumeManager", null);
      /** Standalone track metadata header (single-item players without a playlist). */
      __publicField(this, "trackInfoView", null);
      /** Owns resize-observer, orientation matchMedia, and the
       *  cross-vendor fullscreenchange listeners. */
      __publicField(this, "responsiveManager");
      /** Baseline `muted|volume` from page options; invalidates stale localStorage. */
      __publicField(this, "_preferencesConfigKey", "");
      /** While true, HTML5 renderers ignore media `volumechange` sync. */
      __publicField(this, "_isApplyingVolumeSettings", false);
      /** Owns `kind=metadata` text-track directives (PAUSE, FOCUS,
       *  #hashtag) + the per-selector alert UI. Lazily created on first
       *  `setupMetadataHandling()` call. */
      __publicField(this, "metadataAlertsManager", null);
      __publicField(this, "_pendingSource", null);
      __publicField(this, "_sourceElementsCache", null);
      __publicField(this, "_sourceElementsDirty", true);
      __publicField(this, "_switchingRenderer");
      __publicField(this, "_trackElementsCache", null);
      __publicField(this, "_trackElementsDirty", true);
      __publicField(this, "_textTracksCache", null);
      __publicField(this, "_textTracksDirty");
      __publicField(this, "audioDescriptionCaptionTracks", []);
      __publicField(this, "audioDescriptionSourceElement", null);
      __publicField(this, "audioDescriptionSrc", null);
      __publicField(this, "currentSignLanguage", null);
      __publicField(this, "currentSource", null);
      __publicField(this, "debouncedPositionPlayOverlay", null);
      __publicField(this, "fullscreenChangeHandler", null);
      /** Mirrored from `MetadataAlertsManager` so the TextTrack cleanup
       *  path in `destroy()` can still find it by a fixed field name. */
      __publicField(this, "metadataCueChangeHandler", null);
      __publicField(this, "noticeElement", null);
      __publicField(this, "noticeTimeout", null);
      __publicField(this, "orientationHandler", null);
      __publicField(this, "orientationQuery", null);
      __publicField(this, "originalAudioDescriptionSource", null);
      __publicField(this, "originalSrc", null);
      __publicField(this, "playButtonOverlay", null);
      /** Wrapper button for the audio play overlay. Video keeps the bare,
       *  presentational SVG because the video surface is itself clickable. */
      __publicField(this, "playButtonOverlayButton", null);
      __publicField(this, "resizeHandler", null);
      __publicField(this, "resizeObserver", null);
      __publicField(this, "resumePromptElement", null);
      __publicField(this, "signLanguageDraggable", null);
      __publicField(this, "signLanguageHeader", null);
      __publicField(this, "signLanguageSettingsButton", null);
      __publicField(this, "signLanguageSettingsMenu", null);
      __publicField(this, "signLanguageSettingsMenuVisible", false);
      __publicField(this, "signLanguageSources", {});
      __publicField(this, "signLanguageSrc", null);
      __publicField(this, "signLanguageVideo", null);
      __publicField(this, "signLanguageWrapper", null);
      __publicField(this, "timeouts", /* @__PURE__ */ new Set());
      __publicField(this, "trackArtworkElement", null);
      __publicField(this, "videoWrapper", null);
      /** Centered buffering spinner (see `.vidply-loading` / `.vidply-buffering` in CSS) */
      __publicField(this, "loadingOverlayElement", null);
      /** Native `playing` listener — must be removed in destroy() */
      __publicField(this, "_bufferingHideOnMediaPlaying", null);
      /** AbortController, whose signal feeds every window/document listener and
       *  every user-influenced fetch the Player creates. `destroy()` calls
       *  `abort()` so a torn-down player can never leak listeners or pending
       *  network calls. */
      __publicField(this, "_lifecycleController", new AbortController());
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
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.wrapper;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.wrapper = v;
          }
        },
        signLanguageVideo: {
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.video;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.video = v;
          }
        },
        signLanguageHeader: {
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.header;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.header = v;
          }
        },
        signLanguageSettingsButton: {
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.settingsButton;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.settingsButton = v;
          }
        },
        signLanguageSettingsMenu: {
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.settingsMenu;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.settingsMenu = v;
          }
        },
        signLanguageSettingsMenuVisible: {
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.settingsMenuVisible;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.settingsMenuVisible = v;
          }
        },
        signLanguageDraggable: {
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.draggable;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.draggable = v;
          }
        },
        currentSignLanguage: {
          get: () => {
            var _a;
            return (_a = this.signLanguageManager) == null ? void 0 : _a.currentLanguage;
          },
          set: (v) => {
            if (this.signLanguageManager) this.signLanguageManager.currentLanguage = v;
          }
        }
      });
      this.init();
    }
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
      var _a;
      try {
        if (!message) return;
        if (!this.container) return;
        if ((_a = this.keyboardManager) == null ? void 0 : _a.announce) {
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
      var _a, _b;
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
        const src = this.element.src || ((_a = this.element.querySelector("source")) == null ? void 0 : _a.src);
        if (src) {
          await this.initializeRenderer();
        } else {
          this.log("No initial source - waiting for playlist or manual load");
        }
        await this.initFeatureManagers();
        if (this.options.controls) {
          this.controlBar = new ControlBar(this);
          (_b = this.videoWrapper) == null ? void 0 : _b.appendChild(this.controlBar.element);
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
      const module = await Promise.resolve().then(() => (init_TranscriptManager(), TranscriptManager_exports));
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
      if (this.options.signLanguageSrc || this.signLanguageSrc) {
        return true;
      }
      return Boolean(this.options.signLanguageSources && Object.keys(this.options.signLanguageSources).length > 0);
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
      var _a, _b, _c;
      const explicitId = this.element.getAttribute("data-video-id") || this.element.dataset.videoId || ((_a = this._originalElement) == null ? void 0 : _a.getAttribute("data-video-id")) || ((_c = (_b = this._originalElement) == null ? void 0 : _b.dataset) == null ? void 0 : _c.videoId);
      if (explicitId) {
        return explicitId;
      }
      let src = this.element.src;
      if (!src) {
        const sourceEl = this.element.querySelector("source");
        src = sourceEl == null ? void 0 : sourceEl.src;
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
      var _a;
      (_a = this.resumeManager) == null ? void 0 : _a.saveProgress();
    }
    checkForResume() {
      var _a;
      (_a = this.resumeManager) == null ? void 0 : _a.checkForResume();
    }
    showResumePrompt(savedTime) {
      var _a;
      (_a = this.resumeManager) == null ? void 0 : _a.showPrompt(savedTime);
    }
    hideResumePrompt() {
      var _a;
      (_a = this.resumeManager) == null ? void 0 : _a.hidePrompt();
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
      var _a;
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
      (_a = this.element.parentNode) == null ? void 0 : _a.insertBefore(this.container, this.element);
      if (this.element.tagName === "AUDIO" && this.options.poster) {
        const safePoster = sanitizePosterUrl(this.options.poster);
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
        var _a;
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        (_a = this.playButtonOverlayButton) == null ? void 0 : _a.setAttribute("aria-label", i18n.t("player.pause"));
      });
      this.on("pause", () => {
        var _a;
        node.style.opacity = "1";
        node.style.pointerEvents = "auto";
        (_a = this.playButtonOverlayButton) == null ? void 0 : _a.setAttribute("aria-label", i18n.t("player.play"));
        this.positionPlayOverlayOnMobile();
      });
      this.on("ended", () => {
        var _a;
        node.style.opacity = "1";
        node.style.pointerEvents = "auto";
        (_a = this.playButtonOverlayButton) == null ? void 0 : _a.setAttribute("aria-label", i18n.t("player.play"));
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
      const isExternalControls = () => {
        var _a;
        return (_a = this.container) == null ? void 0 : _a.classList.contains(`${prefix}-external-controls`);
      };
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
      var _a;
      if (!this.playButtonOverlay || this.element.tagName !== "VIDEO") {
        return;
      }
      const mobile = isMobile();
      if (!mobile) {
        this.playButtonOverlay.style.top = "";
        return;
      }
      const videoRect = this.element.getBoundingClientRect();
      const wrapperRect = (_a = this.videoWrapper) == null ? void 0 : _a.getBoundingClientRect();
      if (!wrapperRect) return;
      const videoCenter = videoRect.top - wrapperRect.top + videoRect.height / 2;
      this.playButtonOverlay.style.top = `${videoCenter}px`;
    }
    async initializeRenderer() {
      var _a, _b, _c;
      let src = this._pendingSource;
      let rendererClass = null;
      if (!src) {
        const sourceElements = Array.from(this.element.querySelectorAll("source"));
        if (sourceElements.length > 1) {
          const negotiated = this._selectBestSource(sourceElements);
          src = negotiated.src;
          this._fallbackSources = negotiated.fallbacks;
        } else {
          src = this.element.src || ((_a = sourceElements[0]) == null ? void 0 : _a.src);
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
      (_b = this.audioDescriptionManager) == null ? void 0 : _b.initFromSourceElements(this.sourceElements, this.trackElements);
      if (!this.originalSrc) {
        this.originalSrc = src;
      }
      rendererClass = await this._detectRendererClass(src);
      this.log(`Using ${(rendererClass == null ? void 0 : rendererClass.name) || "HTML5Renderer"} renderer`);
      this.renderer = new rendererClass(this);
      const initTimeout = (((_c = this._fallbackSources) == null ? void 0 : _c.length) ?? 0) > 0 ? 1e4 : 0;
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
    }
    async _detectRendererClass(src) {
      switch (classifyRendererType(src)) {
        case "youtube": {
          const module = await Promise.resolve().then(() => (init_YouTubeRenderer(), YouTubeRenderer_exports));
          return module.YouTubeRenderer ?? module.default;
        }
        case "vimeo": {
          const module = await Promise.resolve().then(() => (init_VimeoRenderer(), VimeoRenderer_exports));
          return module.VimeoRenderer ?? module.default;
        }
        case "hls": {
          const module = await Promise.resolve().then(() => (init_HLSRenderer(), HLSRenderer_exports));
          return module.HLSRenderer ?? module.default;
        }
        case "dash": {
          const module = await Promise.resolve().then(() => (init_DASHRenderer(), DASHRenderer_exports));
          return module.DASHRenderer ?? module.default;
        }
        case "soundcloud": {
          const module = await Promise.resolve().then(() => (init_SoundCloudRenderer(), SoundCloudRenderer_exports));
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
      return { src: (chosen == null ? void 0 : chosen.src) ?? "", fallbacks };
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
      var _a, _b;
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
          if ((_a = this.transcriptManager) == null ? void 0 : _a.isVisible) {
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
          if ((_b = this.transcriptManager) == null ? void 0 : _b.isVisible) {
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
              newManager == null ? void 0 : newManager.showTranscript();
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
    }
    shouldChangeRenderer(src) {
      if (!this.renderer) return true;
      return classifyRendererType(src) !== this.renderer.rendererType;
    }
    // Playback controls
    play() {
      var _a;
      if (this.renderer) {
        this.renderer.play();
        return;
      }
      if (this._switchingRenderer || ((_a = this.playlistManager) == null ? void 0 : _a.isChangingTrack)) {
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
      var _a;
      const step = Number.isFinite(interval) ? interval : 5;
      let targetTime = this.state.currentTime + step;
      if ((_a = this.liveStreamManager) == null ? void 0 : _a.resolveIsLive()) {
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
      var _a;
      const step = Number.isFinite(interval) ? interval : 5;
      const minTime = ((_a = this.liveStreamManager) == null ? void 0 : _a.resolveIsLive()) ? this.liveStreamManager.getSeekableStart() : 0;
      this.seek(Math.max(this.state.currentTime - step, minTime));
    }
    isLiveStream() {
      var _a;
      return ((_a = this.liveStreamManager) == null ? void 0 : _a.resolveIsLive()) ?? false;
    }
    isBehindLive() {
      var _a;
      return ((_a = this.liveStreamManager) == null ? void 0 : _a.isBehindLive()) ?? false;
    }
    getSecondsBehindLive() {
      var _a;
      return ((_a = this.liveStreamManager) == null ? void 0 : _a.getSecondsBehindLive()) ?? 0;
    }
    getLiveSeekRange() {
      var _a;
      return ((_a = this.liveStreamManager) == null ? void 0 : _a.getSeekRange()) ?? null;
    }
    seekToLive() {
      var _a;
      (_a = this.liveStreamManager) == null ? void 0 : _a.seekToLive();
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
      var _a;
      (_a = this.pseudoFullscreen) == null ? void 0 : _a.disable();
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
      var _a;
      if (typeof url !== "string" || !url) return false;
      const signals = [this.lifecycleSignal];
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        signals.push(AbortSignal.timeout(8e3));
      }
      const signal = signals.length === 1 ? signals[0] : ((_a = AbortSignal.any) == null ? void 0 : _a.call(AbortSignal, signals)) ?? signals[0];
      try {
        const response = await fetch(url, { method: "HEAD", cache: "no-cache", signal });
        return response.ok;
      } catch (error) {
        if (this.options.debug) {
          this.log(`validateTrackExists("${url}") failed: ${(error == null ? void 0 : error.message) ?? error}`, "warn");
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
      return manager == null ? void 0 : manager.enable();
    }
    async disableAudioDescription() {
      const manager = await this.ensureAudioDescriptionManager();
      return manager == null ? void 0 : manager.disable();
    }
    async toggleAudioDescription() {
      var _a, _b, _c;
      if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && ((_b = (_a = this.playlistManager) == null ? void 0 : _a.tracks) == null ? void 0 : _b.length)) {
        this.showNotice(i18n.t("player.startPlaybackForAudioDescription"));
        return;
      }
      const manager = await this.ensureAudioDescriptionManager();
      if (!manager) return;
      if (!this.renderer && this.playlistManager && ((_c = this.playlistManager.tracks) == null ? void 0 : _c.length)) {
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
      return manager == null ? void 0 : manager.enable();
    }
    async disableSignLanguage() {
      const manager = await this.ensureSignLanguageManager();
      return manager == null ? void 0 : manager.disable();
    }
    async toggleSignLanguage() {
      var _a, _b, _c;
      if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && ((_b = (_a = this.playlistManager) == null ? void 0 : _a.tracks) == null ? void 0 : _b.length)) {
        this.showNotice(i18n.t("player.startPlaybackForSignLanguage"));
        return;
      }
      const manager = await this.ensureSignLanguageManager();
      if (!manager) return;
      if (!this.renderer && this.playlistManager && ((_c = this.playlistManager.tracks) == null ? void 0 : _c.length)) {
        const wasEnabled = manager.enabled;
        const result = manager.toggle();
        if (!wasEnabled && manager.enabled) {
          this.play();
        }
        return result;
      }
      return manager.toggle();
    }
    setupSignLanguageInteraction() {
      var _a;
      return (_a = this.signLanguageManager) == null ? void 0 : _a._setupInteraction();
    }
    switchSignLanguage(langCode) {
      var _a;
      return (_a = this.signLanguageManager) == null ? void 0 : _a.switchLanguage(langCode);
    }
    showSignLanguageSettingsMenu() {
      var _a;
      return (_a = this.signLanguageManager) == null ? void 0 : _a.showSettingsMenu();
    }
    hideSignLanguageSettingsMenu({ focusButton = true } = {}) {
      var _a;
      return (_a = this.signLanguageManager) == null ? void 0 : _a.hideSettingsMenu({ focusButton });
    }
    constrainSignLanguagePosition() {
      var _a;
      return (_a = this.signLanguageManager) == null ? void 0 : _a.constrainPosition();
    }
    saveSignLanguagePreferences() {
      var _a;
      return (_a = this.signLanguageManager) == null ? void 0 : _a.savePreferences();
    }
    cleanupSignLanguage() {
      var _a;
      return (_a = this.signLanguageManager) == null ? void 0 : _a.cleanup();
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
      var _a;
      (_a = this.keyboardHelp) == null ? void 0 : _a.hide();
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
      var _a, _b;
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
      (_a = this.responsiveManager) == null ? void 0 : _a.cleanup();
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
      (_b = this.metadataAlertsManager) == null ? void 0 : _b.cleanup();
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
  __publicField(_Player, "instances", []);
  /**
   * Available theme names. Kept as a static field for backward
   * compatibility with external callers that used
   * `Player.THEMES.includes(x)`; the canonical source is
   * `PLAYER_THEMES` in `./ThemeManager.ts`.
   */
  __publicField(_Player, "THEMES", PLAYER_THEMES);
  var Player = _Player;

  // src/features/PlaylistManager.ts
  init_DOMUtils();
  init_Icons();
  init_i18n();
  init_TimeUtils();
  init_PerformanceUtils();
  var playlistInstanceCounter = 0;
  var PlaylistManager = class {
    constructor(player, options = {}) {
      __publicField(this, "player");
      __publicField(this, "container");
      __publicField(this, "currentIndex");
      __publicField(this, "hostElement");
      __publicField(this, "initialTracks");
      __publicField(this, "instanceId");
      __publicField(this, "isChangingTrack");
      __publicField(this, "isPanelVisible");
      __publicField(this, "navigationFeedback");
      __publicField(this, "options");
      __publicField(this, "PlayerClass");
      __publicField(this, "playlistPanel");
      __publicField(this, "trackArtworkElement");
      __publicField(this, "trackInfoView");
      __publicField(this, "tracks");
      __publicField(this, "uniqueId");
      // Timers owned by this manager. Tracked so destroy() can cancel any pending
      // deferred callback (auto-play, guard-flag resets, live-region clears,
      // focus moves) that would otherwise run against a torn-down player.
      __publicField(this, "_timers", /* @__PURE__ */ new Set());
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
        recreatePlayers: Boolean(options.recreatePlayers) || false
      };
      this.container = null;
      this.playlistPanel = null;
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
      var _a, _b;
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
      if ((_a = this.trackInfoView) == null ? void 0 : _a.element.parentNode) {
        this.trackInfoView.element.parentNode.removeChild(this.trackInfoView.element);
      }
      if (this.navigationFeedback && this.navigationFeedback.parentNode) {
        this.navigationFeedback.parentNode.removeChild(this.navigationFeedback);
      }
      if (this.playlistPanel && this.playlistPanel.parentNode) {
        this.playlistPanel.parentNode.removeChild(this.playlistPanel);
      }
      const preservedPlayerOptions = ((_b = this.player) == null ? void 0 : _b.options) ? { ...this.player.options } : {};
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
        var _a2;
        if ((_a2 = this.player.state) == null ? void 0 : _a2.ready) {
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
        if (this.trackArtworkElement) {
          const videoWrapper = this.player.container.querySelector(".vidply-video-wrapper");
          if (videoWrapper) {
            this.player.container.insertBefore(this.trackArtworkElement, videoWrapper);
          } else {
            this.player.container.appendChild(this.trackArtworkElement);
          }
        }
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
      this.container = this.player.container;
      this.updatePlayerControls();
      this.tracks = savedTracks;
      this.currentIndex = savedIndex;
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
      var _a;
      if (typeof ((_a = this.player.controlBar) == null ? void 0 : _a.updateDownloadButton) === "function") {
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
      var _a, _b, _c, _d, _e, _f;
      if (index < 0 || index >= this.tracks.length) {
        console.warn("VidPly Playlist: Invalid track index", index);
        return;
      }
      const track = this.tracks[index];
      if (!track) return;
      this.currentIndex = index;
      try {
        if (((_b = (_a = this.player) == null ? void 0 : _a.element) == null ? void 0 : _b.tagName) === "VIDEO") {
          if (track.poster) {
            const resolved = typeof this.player.resolvePosterPath === "function" ? this.player.resolvePosterPath(track.poster) : track.poster;
            const posterUrl = sanitizePosterUrl(resolved);
            if (posterUrl) {
              this.player.element.poster = posterUrl;
              (_d = (_c = this.player).applyPosterAspectRatio) == null ? void 0 : _d.call(_c, posterUrl);
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
        } else if ((_f = (_e = this.player).hasAudioDescriptionContent) == null ? void 0 : _f.call(_e)) {
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
      var _a, _b;
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
      if (((_b = (_a = this.player) == null ? void 0 : _a.audioDescriptionManager) == null ? void 0 : _b.desiredState) && track.audioDescriptionSrc) {
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
    }
    /**
     * Update track info display
     */
    updateTrackInfo(track) {
      if (!this.trackInfoView) return;
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
      this.updateTrackArtwork(track);
    }
    /**
     * Update track artwork display (for audio playlists)
     */
    updateTrackArtwork(track) {
      var _a, _b, _c;
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
      const safeBackground = track.poster ? toCssBackgroundImage(track.poster) : null;
      if (safeBackground) {
        this.trackArtworkElement.style.backgroundImage = safeBackground;
        this.trackArtworkElement.style.display = "block";
        (_c = this.player) == null ? void 0 : _c.mountPlayButtonOverlay(this.trackArtworkElement);
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
        const isExternalRenderer = this.isExternalRendererUrl(track2 == null ? void 0 : track2.src);
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
            const isExternalRenderer = this.isExternalRendererUrl(track == null ? void 0 : track.src);
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
      if (this.playlistPanel) {
        this.playlistPanel.remove();
      }
      this.clear();
    }
  };

  // src/index.ts
  init_Sanitize();
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
})();
//# sourceMappingURL=vidply.js.map
