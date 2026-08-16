/**
 * Transcript Manager Component
 * Manages transcript display and interaction
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { StorageManager } from '../utils/StorageManager.js';
import {
  focusElement,
  setContainerChildrenInert,
} from '../utils/FocusUtils.js';
import { createMenuItem } from '../utils/MenuUtils.js';
import { DraggableResizable } from '../utils/DraggableResizable.js';
import { createLabeledSelect, preventDragOnElement } from '../utils/FormUtils.js';
import { DraggablePanel } from '../utils/DraggablePanel.js';
import { deriveTrackLabel } from '../utils/TrackLabelUtils.js';
import type { Player } from '../core/Player.js';
import type { Renderer } from '../types/renderer.js';

type TranscriptCue = TextTrackCue;
type TranscriptTrack = TextTrack & { _vidplyStale?: boolean };
type TranscriptLanguageInfo = {
  language: string;
  label: string;
  track: TranscriptTrack;
};
type TranscriptCueItem = {
  cue: TranscriptCue;
  type: 'caption' | 'description';
};
type TranscriptEntry = {
  element: HTMLElement;
  cue: TranscriptCue;
  type: 'caption' | 'description';
  startTime: number;
  endTime: number;
};

interface TranscriptStyleOptions {
  fontSize: string;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  opacity: number;
  [key: string]: unknown;
}

interface TranscriptHandlers {
  timeupdate: () => void;
  seeked: () => void;
  audiodescriptionenabled: () => void;
  audiodescriptiondisabled: () => void;
  textcuesupdate: (() => void) | null;
  resize: (() => void) | null;
  settingsClick: ((e: MouseEvent) => void) | null;
  settingsKeydown: ((e: KeyboardEvent) => void) | null;
  documentClick: ((e: MouseEvent) => void) | null;
  styleDialogKeydown: ((e: KeyboardEvent) => void) | null;
  floatingchange: ((state: 'pinned' | 'auto' | null) => void) | null;
  livechange: ((isLive: boolean) => void) | null;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export class TranscriptManager {
  /** Live HLS re-publishes the same subtitle line within ~6s segment overlap. */
  private static readonly LIVE_TRANSCRIPT_DEDUPE_WINDOW_SEC = 30;

    player: Player;
    _cueUpdateTimeout: TimerHandle | null;
    _liveSyncTimer: TimerHandle | null = null;
    autoscrollCheckbox: HTMLInputElement | null = null;
    autoscrollEnabled: boolean;
    availableTranscriptLanguages: TranscriptLanguageInfo[];
    currentActiveEntry: TranscriptEntry | null;
    currentTranscriptLanguage: string | null;
    customKeyHandler: ((e: KeyboardEvent) => void) | null = null;
    /** Elements marked inert while the floating transcript dialog is open. */
    private inertedElements: Element[] = [];
    previouslyFocused: HTMLElement | null = null;
    /**
     * True once the style-dialog's outside-click listener has been
     * attached. The settings-menu's outside-click listener is now
     * owned by {@link DraggablePanel} and tracked there; this flag
     * covers the dialog half of the shared `handlers.documentClick`.
     */
    documentClickHandlerAdded: boolean = false;
    draggableResizable: DraggableResizable | null;
    handlers: TranscriptHandlers = {} as TranscriptHandlers;
    headerLeft: HTMLElement | null = null;
    isVisible: boolean;
    languageLabel: HTMLElement | null;
    languageSelector: HTMLSelectElement | null;
    languageSelectorHandler: ((e: Event) => void) | null;
    languageSelectorWrapper: HTMLElement | null = null;
    liveRegion: HTMLElement | null;
    settingsButton: HTMLButtonElement | null;
    showTimestamps: boolean;
    showTimestampsButton: HTMLElement | null = null;
    showTimestampsText: Element | null = null;
    storage: StorageManager;
    styleDialog: HTMLElement | null;
    styleDialogJustOpened: boolean;
    styleDialogVisible: boolean;
    timeouts: Set<TimerHandle>;
    transcriptContent: HTMLElement | null = null;
    transcriptEntries: TranscriptEntry[];
    transcriptHeader: HTMLElement | null = null;
    transcriptResizeHandles: HTMLElement[];
    transcriptStyle: TranscriptStyleOptions;
    transcriptWindow: HTMLElement | null;
    _dashActiveLang: string | null;
    _vttCache: Map<string, TranscriptCueItem[]>;

    /**
     * Owns the settings-menu DOM scaffold, its outside-click
     * dismissal, keyboard navigation, viewport-aware positioning,
     * and the drag-mode / resize-mode toggle items. Instantiated
     * lazily once the header is built in {@link createTranscriptHeader}.
     */
    private _panel: DraggablePanel | null = null;

    // Back-compat getters for panel-owned state. External callers and
    // internal reads (e.g. `this.settingsMenuVisible` inside other
    // transcript methods) keep reading the same properties; the
    // setters are no-ops because the panel is now the authoritative
    // owner of those values.
    get settingsMenu(): HTMLElement | null {
        return this._panel?.settingsMenu ?? null;
    }
    set settingsMenu(_v: HTMLElement | null) {
        // panel-owned.
    }

    get settingsMenuVisible(): boolean {
        return this._panel?.settingsMenuVisible ?? false;
    }
    set settingsMenuVisible(_v: boolean) {
        // panel-owned.
    }

    get settingsMenuJustOpened(): boolean {
        return this._panel?.justOpened ?? false;
    }
    set settingsMenuJustOpened(_v: boolean) {
        // panel-owned.
    }

    get dragOptionButton(): HTMLElement | null {
        return this._panel?.dragOptionButton ?? null;
    }
    get dragOptionText(): Element | null {
        return this._panel?.dragOptionText ?? null;
    }
    get resizeOptionButton(): HTMLElement | null {
        return this._panel?.resizeOptionButton ?? null;
    }
    get resizeOptionText(): Element | null {
        return this._panel?.resizeOptionText ?? null;
    }

  constructor(player: Player) {
    this.player = player;
    this.transcriptWindow = null;
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    this.isVisible = false;
    
    // Storage manager
    this.storage = new StorageManager('vidply');
    
    // Draggable/Resizable utility
    this.draggableResizable = null;
    this.settingsButton = null;

    // Resize mode state
    this.transcriptResizeHandles = [];
    this.liveRegion = null;
    
    // Style dialog state
    this.styleDialog = null;
    this.styleDialogVisible = false;
    this.styleDialogJustOpened = false;
    
    // Language selector state
    this.languageSelector = null;
    this.languageLabel = null;
    this.currentTranscriptLanguage = null;
    this.availableTranscriptLanguages = [];
    this.languageSelectorHandler = null;
    
    const savedPreferences = this.storage.getTranscriptPreferences();
    
    this.autoscrollEnabled = typeof savedPreferences?.autoscroll === 'boolean' ? savedPreferences.autoscroll : true;
    
    this.showTimestamps = typeof savedPreferences?.showTimestamps === 'boolean' ? savedPreferences.showTimestamps : false;
    
    const savedFontSize = typeof savedPreferences?.fontSize === 'string' ? savedPreferences.fontSize : undefined;
    const savedFontFamily = typeof savedPreferences?.fontFamily === 'string' ? savedPreferences.fontFamily : undefined;
    const savedColor = typeof savedPreferences?.color === 'string' ? savedPreferences.color : undefined;
    const savedBackgroundColor = typeof savedPreferences?.backgroundColor === 'string' ? savedPreferences.backgroundColor : undefined;
    const savedOpacity = typeof savedPreferences?.opacity === 'number' ? savedPreferences.opacity : undefined;
    const optFontSize = typeof this.player.options.transcriptFontSize === 'string' ? this.player.options.transcriptFontSize : undefined;
    const optFontFamily = typeof this.player.options.transcriptFontFamily === 'string' ? this.player.options.transcriptFontFamily : undefined;
    const optColor = typeof this.player.options.transcriptColor === 'string' ? this.player.options.transcriptColor : undefined;
    const optBackgroundColor = typeof this.player.options.transcriptBackgroundColor === 'string' ? this.player.options.transcriptBackgroundColor : undefined;
    const optOpacity = typeof this.player.options.transcriptOpacity === 'number' ? this.player.options.transcriptOpacity : undefined;
    this.transcriptStyle = {
      fontSize: savedFontSize || optFontSize || '100%',
      fontFamily: savedFontFamily || optFontFamily || 'sans-serif',
      color: savedColor || optColor || '#ffffff',
      backgroundColor: savedBackgroundColor || optBackgroundColor || '#1e1e1e',
      opacity: savedOpacity ?? optOpacity ?? 0.98
    };
    
    // Store event handlers for cleanup
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
      floatingchange: null,
      livechange: null
    };

    this._cueUpdateTimeout = null;
    this._dashActiveLang = null;
    this._vttCache = new Map<string, TranscriptCueItem[]>();
    
    // Timeout management (for cleanup)
    this.timeouts = new Set();
    
    this.init();
  }

  init() {
    // Metadata-cue directives (PAUSE / FOCUS / #hashtags) are handled
    // centrally by the scoped `MetadataAlertsManager` (wired from
    // `Player.setupMetadataHandling()`), so the TranscriptManager no
    // longer attaches its own `cuechange` pipeline.

    // Listen for time updates to highlight active transcript entry
    this.player.on('timeupdate', this.handlers.timeupdate);
    this.player.on('seeked', this.handlers.seeked);
    
    // Listen for audio description changes to reload transcript
    this.player.on('audiodescriptionenabled', this.handlers.audiodescriptionenabled);
    this.player.on('audiodescriptiondisabled', this.handlers.audiodescriptiondisabled);

    // Listen for text cue updates (cues arrive incrementally as segments load in HLS/DASH).
    // Skip re-render when we already fetched the full VTT for the active language.
    this.handlers.textcuesupdate = () => {
      if (!this.isVisible) return;
      if (
        this.currentTranscriptLanguage
        && this._vttCache.has(this.currentTranscriptLanguage)
        && !this._isLiveTranscriptSource()
      ) {
        const cached = this._vttCache.get(this.currentTranscriptLanguage);
        const track = this._resolveCaptionTrackForTranscript(this.player.textTracks as TranscriptTrack[]);
        const trackCueCount = track?.cues?.length ?? 0;
        if (cached && (trackCueCount === 0 || cached.length >= trackCueCount)) {
          return;
        }
        this._vttCache.delete(this.currentTranscriptLanguage);
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
    this.player.on('textcuesupdate', this.handlers.textcuesupdate);

    this.handlers.livechange = (isLive: boolean) => {
      if (!this.isVisible) {
        return;
      }

      if (isLive) {
        this._startLiveTranscriptSync();
        return;
      }

      this._stopLiveTranscriptSync();
      if (this.currentTranscriptLanguage) {
        this._vttCache.delete(this.currentTranscriptLanguage);
      }
      this.loadTranscriptData();
    };
    this.player.on('livechange', this.handlers.livechange);
    
    // Reposition transcript when entering/exiting fullscreen
    this.player.on('fullscreenchange', () => {
      if (this.isVisible) {
        // Re-setup drag/drop when entering/exiting fullscreen on mobile devices
        // This enables drag/resize when entering fullscreen on mobile
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          this.setupDragAndDrop();
        }
        
        // Only auto-position if user hasn't manually positioned it
        if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
          // Add a small delay to ensure DOM has updated after fullscreen transition
          this.setManagedTimeout(() => this.positionTranscript(), 100);
        }
      }
    });

    // Collapse the transcript whenever the player enters the floating
    // shell. The floating miniplayer is intentionally narrow and only
    // shows a whitelisted subset of controls, so a full-size transcript
    // popup would either overflow the shell or travel with it and break
    // the miniplayer UX. We redock the transcript on exit by simply
    // letting the user re-open it if desired.
    this.handlers.floatingchange = (state) => {
      if (state && this.isVisible) {
        this.hideTranscript();
      }
    };
    this.player.on('floatingchange', this.handlers.floatingchange);
  }

  /**
   * For streaming renderers (DASH), tell the renderer to activate the text
   * track for `lang` so dash.js starts downloading subtitle segments and
   * populating cues.  Skips the call if the language is already active.
   */
  private _requestStreamingTrack(lang: string | null) {
    if (!lang) return;
    const renderer = this.player.renderer as Renderer | null | undefined;
    if (renderer?.isStreaming && typeof renderer.activateTextTrackForLanguage === 'function') {
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
    // The floating miniplayer hides the transcript control button and is
    // too narrow to host the transcript window, so refuse to open while
    // floating. Covers both the control-bar click (already gated by CSS)
    // and the keyboard shortcut / public API paths.
    if (this.player.state?.floating) {
      return;
    }

    this.previouslyFocused = document.activeElement as HTMLElement | null;

    // Always invalidate track cache to get fresh HLS subtitle tracks
    this.player.invalidateTrackCache();
    
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'flex';
      this.isVisible = true;
      
      // Reload transcript data to get fresh HLS tracks
      this.loadTranscriptData();
      this._requestStreamingTrack(this.currentTranscriptLanguage);
      this.updateLanguageSelector();

      if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === 'function') {
        this.player.controlBar.updateTranscriptButton();
      }

      if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
        this.setManagedTimeout(() => this.positionTranscript(), 0);
      } else {
        this.updateTranscriptModalState();
      }
      
      // Focus the settings button for keyboard accessibility
      focusElement(this.settingsButton, { delay: 150 });
      this._startLiveTranscriptSync();
      return;
    }

    this.createTranscriptWindow();
    this.loadTranscriptData();
    this._requestStreamingTrack(this.currentTranscriptLanguage);
    
    const transcriptWindow = this.transcriptWindow as HTMLElement | null;
    if (transcriptWindow) {
      transcriptWindow.style.display = 'flex';
      
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
    this._stopLiveTranscriptSync();
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'none';
      this.isVisible = false;
      this.updateTranscriptModalState();
    }
    if (this.draggableResizable && this.draggableResizable.pointerResizeMode) {
      this.draggableResizable.disablePointerResizeMode();
      this.updateResizeOptionState();
    }
    this.hideResizeModeIndicator();
    this.announceLive('');

    // Update transcript button state in control bar
    if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === 'function') {
      this.player.controlBar.updateTranscriptButton();
    }

    if (focusButton) {
      const transcriptButton = this.player.controlBar?.controls?.transcript;
      if (transcriptButton && typeof transcriptButton.focus === 'function') {
        transcriptButton.focus({ preventScroll: true });
      }
    }
  }

  /**
   * Create the transcript window UI
   */
  createTranscriptWindow() {
    this.transcriptWindow = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-window`,
      attributes: {
        'role': 'dialog',
        'aria-label': i18n.t('transcript.ariaLabel'),
        'aria-modal': 'false',
        'tabindex': '-1'
      }
    });

    // Header (draggable)
    this.transcriptHeader = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-header`,
      attributes: {
        'tabindex': '0'
      }
    });

    // Header left side (settings button + title)
    this.headerLeft = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-header-left`
    });

    // Settings button
    const settingsAriaLabel = i18n.t('transcript.settingsMenu');
    this.settingsButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-settings`,
      attributes: {
        'type': 'button',
        'aria-label': settingsAriaLabel,
        'aria-expanded': 'false'
      }
    });
    this.settingsButton.appendChild(createIconElement('settings'));
    DOMUtils.attachTooltip(this.settingsButton, settingsAriaLabel, this.player.options.classPrefix);

    // The panel owns the settings-menu DOM, lifecycle, and the drag
    // + resize toggle items. Transcript-specific extras (style dialog
    // opener and timestamps toggle) are appended via the extras
    // builder below. The manager keeps ownership of the toggle
    // semantics (announcements, focus target), which the panel
    // invokes via the click callbacks.
    this._panel = new DraggablePanel({
      player: this.player,
      namespace: 'transcript',
      settingsButton: this.settingsButton,
      getDraggable: () => this.draggableResizable,
      i18nKeys: {
        enableDrag: 'transcript.enableDragMode',
        disableDrag: 'transcript.disableDragMode',
        enableDragAria: 'transcript.enableDragModeAria',
        disableDragAria: 'transcript.disableDragModeAria',
        enableResize: 'transcript.enableResizeMode',
        disableResize: 'transcript.disableResizeMode',
        enableResizeAria: 'transcript.enableResizeModeAria',
        disableResizeAria: 'transcript.disableResizeModeAria',
        closeMenu: 'transcript.closeMenu',
      },
      menuAlign: 'left',
      getMenuParent: () =>
        this.headerLeft ?? this.transcriptHeader ?? this.transcriptWindow,
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
          icon: 'settings',
          label: 'transcript.styleTranscript',
          onClick: (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this._panel?.hide();
            setTimeout(() => {
              this.showStyleDialog();
            }, 50);
          },
        });
        stripInlineTooltip(styleOption);
        menu.appendChild(styleOption);

        const timestampsOption = createMenuItem({
          classPrefix,
          itemClass,
          icon: 'clock',
          label: 'transcript.showTimestamps',
          hasTextClass: true,
          onClick: () => {
            this.toggleShowTimestamps();
          },
        });
        timestampsOption.setAttribute('role', 'switch');
        timestampsOption.setAttribute(
          'aria-checked',
          this.showTimestamps ? 'true' : 'false'
        );
        stripInlineTooltip(timestampsOption);
        this.showTimestampsButton = timestampsOption;
        this.showTimestampsText = timestampsOption.querySelector(
          `.${classPrefix}-settings-text`
        );
        this.updateShowTimestampsState();
        menu.appendChild(timestampsOption);
      },
    });

    this.handlers.settingsClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this._panel?.markJustOpenedForClick();
      this._panel?.toggle();
    };
    this.settingsButton.addEventListener('click', this.handlers.settingsClick);
    
    // Keyboard handler for settings button
    this.handlers.settingsKeydown = (e: KeyboardEvent) => {
      // D key to toggle keyboard drag mode
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleKeyboardDragMode();
      }
      // R key to toggle resize mode
      else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleResizeMode();
      }
      // Escape to close menu if open
      else if (e.key === 'Escape' && this.settingsMenuVisible) {
        e.preventDefault();
        e.stopPropagation();
        this.hideSettingsMenu();
      }
    };
    this.settingsButton.addEventListener('keydown', this.handlers.settingsKeydown);

    const title = DOMUtils.createElement('h3', {
      textContent: `${i18n.t('transcript.title')}. ${i18n.t('transcript.dragResizePrompt')}`
    });

    // Autoscroll checkbox
    const autoscrollId = `${this.player.options.classPrefix}-transcript-autoscroll-${Date.now()}`;
    
    const autoscrollLabel = DOMUtils.createElement('label', {
      className: `${this.player.options.classPrefix}-transcript-autoscroll-label`,
      attributes: {
        'for': autoscrollId
      }
    });
    
    this.autoscrollCheckbox = DOMUtils.createElement('input', {
      attributes: {
        'id': autoscrollId,
        'type': 'checkbox'
      }
    });
    // Set checked property directly (boolean attribute, not "true" string)
    if (this.autoscrollEnabled) {
      this.autoscrollCheckbox.checked = true;
    }
    
    const autoscrollText = DOMUtils.createElement('span', {
      textContent: i18n.t('transcript.autoscroll'),
      className: `${this.player.options.classPrefix}-transcript-autoscroll-text`
    });
    
    autoscrollLabel.appendChild(this.autoscrollCheckbox);
    autoscrollLabel.appendChild(autoscrollText);
    
    // Handle autoscroll checkbox change
    this.autoscrollCheckbox.addEventListener('change', (e: Event) => {
      this.autoscrollEnabled = (e.target as HTMLInputElement).checked;
      this.saveAutoscrollPreference();
    });

    preventDragOnElement(autoscrollLabel);

    this.transcriptHeader.appendChild(title);
    this.headerLeft.appendChild(this.settingsButton);
    this.headerLeft.appendChild(autoscrollLabel);
    
    // Language selector (will be populated after tracks are loaded)
    const selectId = `${this.player.options.classPrefix}-transcript-language-select-${Date.now()}`;
    const { label: languageLabel, select: languageSelector } = createLabeledSelect({
      classPrefix: this.player.options.classPrefix,
      labelClass: `${this.player.options.classPrefix}-transcript-language-label`,
      selectClass: `${this.player.options.classPrefix}-transcript-language-select`,
      labelText: 'settings.language',
      selectId: selectId,
      hidden: false // Don't hide individual elements, we'll hide the wrapper instead
    });
    
    this.languageLabel = languageLabel;
    this.languageSelector = languageSelector;
    
    const languageSelectorWrapper = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-language-wrapper`,
      attributes: {
        'style': 'display: none;'
      }
    });
    languageSelectorWrapper.appendChild(languageLabel);
    languageSelectorWrapper.appendChild(languageSelector);
    this.languageSelectorWrapper = languageSelectorWrapper;
    
    preventDragOnElement(languageSelectorWrapper);
    
    if (this.headerLeft) {
      this.headerLeft.appendChild(languageSelectorWrapper);
    }

    const closeAriaLabel = i18n.t('transcript.close');
    const closeButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-close`,
      attributes: {
        'type': 'button',
        'aria-label': closeAriaLabel
      }
    });
    closeButton.appendChild(createIconElement('close'));
    DOMUtils.attachTooltip(closeButton, closeAriaLabel, this.player.options.classPrefix);
    closeButton.addEventListener('click', () => this.hideTranscript({ focusButton: true }));

    this.transcriptHeader.appendChild(this.headerLeft);
    this.transcriptHeader.appendChild(closeButton);

    // Content container
    this.transcriptContent = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-content`
    });

    this.transcriptWindow.appendChild(this.transcriptHeader);
    this.transcriptWindow.appendChild(this.transcriptContent);

    this.createResizeHandles();

    // Live region for announcements (screen reader feedback)
    this.liveRegion = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      attributes: {
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });
    this.transcriptWindow.appendChild(this.liveRegion);

    // Append to player container
    this.player.container.appendChild(this.transcriptWindow);
    
    // Setup drag functionality FIRST (this will restore saved position if it exists)
    this.setupDragAndDrop();
    
    // Then position it next to the video wrapper ONLY if user hasn't manually positioned it
    // This ensures we don't overwrite saved positions from localStorage
    if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
      this.positionTranscript();
    }
    
    // Outside-click dismissal for the *style dialog* only. The
    // settings-menu equivalent is owned by the DraggablePanel, which
    // attaches its own listener (tied to the player's lifecycle
    // signal) when the menu is first opened.
    this.handlers.documentClick = (e: MouseEvent) => {
      if (this.styleDialogJustOpened) {
        return;
      }
      const target = e.target as Node | null;
      if (this.styleDialogVisible && this.styleDialog &&
          target && !this.styleDialog.contains(target)) {
        this.hideStyleDialog();
      }
    };
    this.documentClickHandlerAdded = false;
    
    // Re-position on window resize (debounced) - but only if not manually positioned
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    this.handlers.resize = () => {
      if (resizeTimeout) {
        this.clearManagedTimeout(resizeTimeout);
      }
      resizeTimeout = this.setManagedTimeout(() => {
        // Only auto-position if user hasn't manually moved it
        if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
          this.positionTranscript();
        }
      }, 100);
    };
    window.addEventListener('resize', this.handlers.resize, {
      signal: this.player.lifecycleSignal
    });
  }
  
  createResizeHandles() {
    const transcriptWindow = this.transcriptWindow;
    if (!transcriptWindow) return;

    const directions: Array<'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'> = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    this.transcriptResizeHandles = directions.map(direction => {
      const handle = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-transcript-resize-handle ${this.player.options.classPrefix}-transcript-resize-${direction}`,
        attributes: {
          'data-direction': direction,
          'data-vidply-managed-resize': 'true',
          'aria-label': i18n.t('player.resizeHandle', { direction }),
          'aria-hidden': 'true'
        }
      });

      handle.style.display = 'none';
      transcriptWindow.appendChild(handle);
      return handle;
    });
  }

  /**
   * Position transcript window next to video
   */
  positionTranscript() {
    const playerWithVideoWrapper = this.player as Player & { videoWrapper?: HTMLElement | null };
    if (!this.transcriptWindow || !playerWithVideoWrapper.videoWrapper || !this.isVisible) return;
    
    // Don't auto-position if user has manually positioned it
    if (this.draggableResizable && this.draggableResizable.manuallyPositioned) {
      return;
    }
    
    const isMobile = window.innerWidth < 768;
    const videoRect = playerWithVideoWrapper.videoWrapper.getBoundingClientRect();
    
    // Check if player is in fullscreen mode
    const isFullscreen = this.player.state.fullscreen;
    
    if (isMobile && !isFullscreen) {
      // Mobile: Position directly underneath the video controls as part of the layout
      this.transcriptWindow.style.position = 'relative';
      this.transcriptWindow.style.left = '0';
      this.transcriptWindow.style.right = '0';
      this.transcriptWindow.style.bottom = 'auto';
      this.transcriptWindow.style.top = 'auto';
      this.transcriptWindow.style.width = '100%';
      this.transcriptWindow.style.maxWidth = '100%';
      this.transcriptWindow.style.maxHeight = '300px';
      this.transcriptWindow.style.height = 'auto';
      this.transcriptWindow.style.borderRadius = '0';
      this.transcriptWindow.style.transform = 'none';
      this.transcriptWindow.style.border = 'none';
      this.transcriptWindow.style.borderTop = '1px solid var(--vidply-border-light)';
      // Remove any empty border properties that might have been set
      this.transcriptWindow.style.removeProperty('border-right');
      this.transcriptWindow.style.removeProperty('border-bottom');
      this.transcriptWindow.style.removeProperty('border-left');
      // Remove border-image properties that can cause parse errors
      this.transcriptWindow.style.removeProperty('border-image');
      this.transcriptWindow.style.removeProperty('border-image-source');
      this.transcriptWindow.style.removeProperty('border-image-slice');
      this.transcriptWindow.style.removeProperty('border-image-width');
      this.transcriptWindow.style.removeProperty('border-image-outset');
      this.transcriptWindow.style.removeProperty('border-image-repeat');
      this.transcriptWindow.style.boxShadow = 'none';
      // Disable dragging on mobile
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = 'default';
      }
      
      // Insert directly after video wrapper to appear right under controls
      const videoWrapper = playerWithVideoWrapper.videoWrapper;
      if (videoWrapper && videoWrapper.parentNode && videoWrapper.nextSibling !== this.transcriptWindow) {
        videoWrapper.parentNode.insertBefore(this.transcriptWindow, videoWrapper.nextSibling);
      }
    } else if (isFullscreen) {
      // In fullscreen: position in bottom right corner inside the video
      this.transcriptWindow.style.position = 'fixed';
      this.transcriptWindow.style.left = 'auto';
      this.transcriptWindow.style.right = '20px';
      this.transcriptWindow.style.bottom = '80px'; // Above controls
      this.transcriptWindow.style.top = 'auto';
      this.transcriptWindow.style.maxHeight = 'calc(100vh - 180px)'; // Leave space for controls
      this.transcriptWindow.style.height = 'auto';
      const fullscreenMinWidth = 260;
      const fullscreenAvailable = Math.max(fullscreenMinWidth, window.innerWidth - 40);
      const fullscreenDesired = parseFloat(this.transcriptWindow.style.width) || 400;
      const fullscreenWidth = Math.max(fullscreenMinWidth, Math.min(fullscreenDesired, fullscreenAvailable));
      this.transcriptWindow.style.width = `${fullscreenWidth}px`;
      this.transcriptWindow.style.maxWidth = 'none';
      this.transcriptWindow.style.borderRadius = '8px';
      this.transcriptWindow.style.border = '1px solid var(--vidply-border)';
      // Remove borderTop and any other individual border properties to avoid empty values
      this.transcriptWindow.style.removeProperty('border-top');
      this.transcriptWindow.style.removeProperty('border-right');
      this.transcriptWindow.style.removeProperty('border-bottom');
      this.transcriptWindow.style.removeProperty('border-left');
      // Remove border-image properties that can cause parse errors
      this.transcriptWindow.style.removeProperty('border-image');
      this.transcriptWindow.style.removeProperty('border-image-source');
      this.transcriptWindow.style.removeProperty('border-image-slice');
      this.transcriptWindow.style.removeProperty('border-image-width');
      this.transcriptWindow.style.removeProperty('border-image-outset');
      this.transcriptWindow.style.removeProperty('border-image-repeat');
      // Enable dragging in fullscreen (including touch devices)
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = 'move';
      }
      
      // Move back to container for fullscreen
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    } else {
      // Desktop mode: position to the right of video, or overlay if insufficient space
      const transcriptWidth = parseFloat(this.transcriptWindow.style.width) || 400;
      const padding = 20;
      const minWidth = 260;
      const containerRect = this.player.container.getBoundingClientRect();

      const ensureContainerPositioned = () => {
        const computed = window.getComputedStyle(this.player.container);
        if (computed.position === 'static') {
          this.player.container.style.position = 'relative';
        }
      };

      ensureContainerPositioned();

      // Calculate available space to the right of the video
      // WCAG 1.4.10 Reflow: Avoid horizontal overflow and content being cut off
      const availableWidth = window.innerWidth - videoRect.right - padding;
      
      // Switch to overlay mode when:
      // 1. Available width is less than the desired transcript width (would cause squeezing/cutoff)
      // 2. OR available width is below minimum usable width
      // This triggers earlier - as soon as the transcript would be squeezed
      const wouldBeCutOff = availableWidth < transcriptWidth;
      const hasMinimumSpace = availableWidth >= minWidth;
      const useOverlay = wouldBeCutOff || !hasMinimumSpace;

      if (!useOverlay) {
        // Position to the right of the video (original behavior)
        const left = (videoRect.right - containerRect.left) + padding;
        const appliedWidth = Math.max(minWidth, Math.min(transcriptWidth, availableWidth));
        const appliedHeight = videoRect.height;

        this.transcriptWindow.style.position = 'absolute';
        this.transcriptWindow.style.left = `${left}px`;
        this.transcriptWindow.style.right = 'auto';
        this.transcriptWindow.style.bottom = 'auto';
        this.transcriptWindow.style.top = '0';
        this.transcriptWindow.style.height = `${appliedHeight}px`;
        this.transcriptWindow.style.maxHeight = 'none';
        this.transcriptWindow.style.width = `${appliedWidth}px`;
        this.transcriptWindow.style.maxWidth = 'none';
        this.transcriptWindow.style.boxShadow = '';
      } else {
        // Insufficient space: fall back to compact overlay mode inside video area
        // Positioned above controls to prevent horizontal overflow
        const overlayMaxWidth = 320;
        const overlayMaxHeight = 280;
        const overlayWidth = Math.min(overlayMaxWidth, videoRect.width - 40);
        const overlayHeight = Math.min(overlayMaxHeight, videoRect.height - 120);
        
        // Calculate position relative to container, placing overlay inside video area
        const videoWrapperRect = playerWithVideoWrapper.videoWrapper.getBoundingClientRect();
        const controlsHeight = 70; // Approximate height of controls
        
        // Position from top of container to bottom of video minus controls and overlay height
        const overlayActualHeight = Math.max(180, overlayHeight);
        const topPosition = (videoWrapperRect.bottom - containerRect.top) - controlsHeight - overlayActualHeight;
        const rightPosition = (containerRect.right - videoWrapperRect.right) + 12;

        this.transcriptWindow.style.position = 'absolute';
        this.transcriptWindow.style.left = 'auto';
        this.transcriptWindow.style.right = `${rightPosition}px`;
        this.transcriptWindow.style.top = `${topPosition}px`;
        this.transcriptWindow.style.bottom = 'auto';
        this.transcriptWindow.style.width = `${Math.max(minWidth, overlayWidth)}px`;
        this.transcriptWindow.style.maxWidth = `${overlayMaxWidth}px`;
        this.transcriptWindow.style.height = `${overlayActualHeight}px`;
        this.transcriptWindow.style.maxHeight = `${overlayMaxHeight}px`;
        this.transcriptWindow.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.6)'; // Enhanced shadow for overlay visibility
      }

      this.transcriptWindow.style.borderRadius = '8px';
      this.transcriptWindow.style.border = '1px solid var(--vidply-border)';
      // Remove borderTop and any other individual border properties to avoid empty values
      this.transcriptWindow.style.removeProperty('border-top');
      this.transcriptWindow.style.removeProperty('border-right');
      this.transcriptWindow.style.removeProperty('border-bottom');
      this.transcriptWindow.style.removeProperty('border-left');
      // Remove border-image properties that can cause parse errors
      this.transcriptWindow.style.removeProperty('border-image');
      this.transcriptWindow.style.removeProperty('border-image-source');
      this.transcriptWindow.style.removeProperty('border-image-slice');
      this.transcriptWindow.style.removeProperty('border-image-width');
      this.transcriptWindow.style.removeProperty('border-image-outset');
      this.transcriptWindow.style.removeProperty('border-image-repeat');
      // Enable dragging on desktop
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = 'move';
      }
      
      // Move back to container for desktop
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    }

    this.updateTranscriptModalState();
  }

  /**
   * Keep transcript as a companion panel: player controls stay operable.
   */
  private updateTranscriptModalState(): void {
    if (!this.transcriptWindow) {
      return;
    }

    this.transcriptWindow.setAttribute('aria-modal', 'false');

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
    const textTracks = this.player.textTracks as TranscriptTrack[];
    const languages = new Map<string, TranscriptLanguageInfo>();
    
    // Collect all caption/subtitle tracks with their languages.
    // For DASH/HLS, tracks may have placeholder labels (AdaptationSet IDs,
    // "null", etc.); deriveTrackLabel normalises them to human-readable names.
    textTracks.forEach((track: TranscriptTrack) => {
      if ((track.kind === 'captions' || track.kind === 'subtitles') && !track._vidplyStale) {
        const lang = (track.language ?? '').trim();
        const label = deriveTrackLabel(track.label, track.language, 'player.captions');
        const key = lang || label;
        if (key && !languages.has(key)) {
          languages.set(key, {
            language: lang,
            label,
            track: track
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
    
    languageSelector.innerHTML = '';
    
    if (this.availableTranscriptLanguages.length < 2) {
      if (this.languageSelectorWrapper) {
        this.languageSelectorWrapper.style.display = 'none';
      }
      return;
    }
    
    if (this.languageSelectorWrapper) {
      this.languageSelectorWrapper.style.display = 'flex';
    }
    
    this.availableTranscriptLanguages.forEach((langInfo: TranscriptLanguageInfo) => {
      const attrs: Record<string, string> = {
        'value': langInfo.language || langInfo.label
      };
      if (langInfo.language) {
        attrs['lang'] = langInfo.language;
      }
      const option = DOMUtils.createElement('option', {
        textContent: langInfo.label,
        attributes: attrs
      });
      languageSelector.appendChild(option);
    });
    
    if (this.currentTranscriptLanguage) {
      languageSelector.value = this.currentTranscriptLanguage;
    } else if (this.availableTranscriptLanguages.length > 0) {
      const activeTrack = this.player.textTracks.find(
        (track: TranscriptTrack) => (track.kind === 'captions' || track.kind === 'subtitles') && track.mode === 'showing'
      );
      const firstLang = this.availableTranscriptLanguages[0];
      const fallbackLang = firstLang ? firstLang.language : null;
      this.currentTranscriptLanguage = activeTrack ? activeTrack.language : fallbackLang;
      if (this.currentTranscriptLanguage) {
        languageSelector.value = this.currentTranscriptLanguage;
      }
    }
    
    if (this.languageSelectorHandler) {
      languageSelector.removeEventListener('change', this.languageSelectorHandler);
    }
    
    // Handle language change — tell the streaming renderer to switch tracks
    // first so dash.js starts downloading cues for the new language, then
    // render whatever is available (textcuesupdate will re-render later).
    const handler = (e: Event) => {
      this.currentTranscriptLanguage = (e.target as HTMLSelectElement).value;
      this._requestStreamingTrack(this.currentTranscriptLanguage);
      this.loadTranscriptData();
      
      if (this.transcriptContent && this.currentTranscriptLanguage) {
        this.transcriptContent.setAttribute('lang', this.currentTranscriptLanguage);
      }
    };
    this.languageSelectorHandler = handler;
    languageSelector.addEventListener('change', handler);
  }

  private _parseSubtitlePlaylistSegmentUris(m3u8Text: string): string[] {
    return m3u8Text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  }

  private async _fetchTextResource(url: string, timeoutMs = 10_000): Promise<string | null> {
    const signal = this._buildFetchSignal(timeoutMs);
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) {
        return null;
      }
      return await res.text();
    } catch {
      return null;
    }
  }

  private _parseVTT(vttText: string): TranscriptCueItem[] {
    const cues: TranscriptCueItem[] = [];
    const blocks = vttText.replace(/\r\n/g, '\n').split(/\n\n+/);
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      let tsLine = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes('-->')) { tsLine = i; break; }
      }
      if (tsLine < 0) continue;
      const match = lines[tsLine]?.match(
        /(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})/
      );
      if (!match) continue;
      const startTime =
        (match[1] ? parseInt(match[1]) * 3600 : 0) +
        parseInt(match[2] ?? '0') * 60 +
        parseInt(match[3] ?? '0') +
        parseInt(match[4] ?? '0') / 1000;
      const endTime =
        (match[5] ? parseInt(match[5]) * 3600 : 0) +
        parseInt(match[6] ?? '0') * 60 +
        parseInt(match[7] ?? '0') +
        parseInt(match[8] ?? '0') / 1000;
      const text = lines.slice(tsLine + 1).join('\n').trim();
      if (!text) continue;
      cues.push({
        cue: { startTime, endTime, text, id: '' } as unknown as TranscriptCue,
        type: 'caption'
      });
    }
    return cues;
  }

  private async _loadVttTranscript(lang: string): Promise<TranscriptCueItem[] | null> {
    const cached = this._vttCache.get(lang);
    if (cached) return cached;

    const renderer = this.player.renderer as Renderer | null | undefined;
    if (!renderer?.isStreaming || typeof renderer.getTextTrackURLs !== 'function') return null;

    const urls: { lang: string; url: string }[] = renderer.getTextTrackURLs();
    const entry = urls.find(u =>
      u.lang === lang || u.lang.startsWith(lang) || lang.startsWith(u.lang)
    );
    if (!entry) return null;

    try {
      const text = await this._fetchTextResource(entry.url);
      if (!text) {
        return null;
      }

      // HLS subtitle playlists are m3u8 files that reference segmented WebVTT.
      // Fetch every segment and merge cues — the first segment alone is only ~6s.
      if (text.trimStart().startsWith('#EXTM3U')) {
        const baseUrl = entry.url.substring(0, entry.url.lastIndexOf('/') + 1);
        const segmentUris = this._parseSubtitlePlaylistSegmentUris(text);
        if (segmentUris.length === 0) {
          return null;
        }

        const segmentTexts = await Promise.all(
          segmentUris.map(async (uri) => {
            const vttUrl = uri.startsWith('http') ? uri : new URL(uri, baseUrl).href;
            return this._fetchTextResource(vttUrl);
          })
        );

        const allCues: TranscriptCueItem[] = [];
        for (const segmentText of segmentTexts) {
          if (segmentText) {
            allCues.push(...this._parseVTT(segmentText));
          }
        }

        if (allCues.length === 0) {
          return null;
        }

        allCues.sort((a, b) => a.cue.startTime - b.cue.startTime);
        this._vttCache.set(lang, allCues);
        return allCues;
      }

      const cues = this._parseVTT(text);
      if (cues.length > 0) {
        this._vttCache.set(lang, cues);
      }
      return cues.length > 0 ? cues : null;
    } catch {
      return null;
    }
  }

  /**
   * Build an AbortSignal that fires when either the player is destroyed
   * or `timeoutMs` elapses, whichever happens first.
   */
  private _buildFetchSignal(timeoutMs: number): AbortSignal | undefined {
    const signals: AbortSignal[] = [];
    const lifecycle = (this.player as { lifecycleSignal?: AbortSignal }).lifecycleSignal;
    if (lifecycle) signals.push(lifecycle);
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      signals.push(AbortSignal.timeout(timeoutMs));
    }
    if (signals.length === 0) return undefined;
    if (signals.length === 1) return signals[0];
    const anyFn = (AbortSignal as { any?: (sigs: AbortSignal[]) => AbortSignal }).any;
    return anyFn ? anyFn(signals) : signals[0];
  }

  /**
   * Load transcript data from caption/subtitle tracks
   */
  loadTranscriptData() {
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    if (this.transcriptContent) {
      this.transcriptContent.innerHTML = '';
    }

    // Get all text tracks
    const textTracks = this.player.textTracks as TranscriptTrack[];

    const captionTrack = this._resolveCaptionTrackForTranscript(textTracks);
    if (captionTrack && !this.currentTranscriptLanguage) {
      this.currentTranscriptLanguage = captionTrack.language;
    }
    
    // Find description track matching the selected language
    let descriptionTrack: TranscriptTrack | null = null;
    if (this.currentTranscriptLanguage) {
      descriptionTrack = textTracks.find(
        (track: TranscriptTrack) => track.kind === 'descriptions' && track.language === this.currentTranscriptLanguage
      ) || null;
    }
    // Fallback to first available description track if no match found
    if (!descriptionTrack) {
      descriptionTrack = textTracks.find((track: TranscriptTrack) => track.kind === 'descriptions') || null;
    }
    
    const metadataTrack = textTracks.find((track: TranscriptTrack) => track.kind === 'metadata');

    // We need at least one track type available for display
    // (captions, descriptions, or metadata - though metadata is not displayed)
    if (!captionTrack && !descriptionTrack && !metadataTrack) {
      this.showNoTranscriptMessage();
      return;
    }

    // Enable all tracks to load cues so they're available for the transcript
    const tracksToLoad: TranscriptTrack[] = [captionTrack, descriptionTrack, metadataTrack].filter(
      (track): track is TranscriptTrack => Boolean(track)
    );
    tracksToLoad.forEach((track: TranscriptTrack) => {
      if (track.mode === 'disabled') {
        track.mode = 'hidden';
      }
    });

    // For streaming renderers, fetch the complete VTT file directly rather
    // than relying on dash.js's partial segment-based cues. Live HLS/DASH
    // streams only expose rolling subtitle segments — use the TextTrack
    // polling path below instead of a one-shot bulk fetch.
    const renderer = this.player.renderer as Renderer | null | undefined;
    const isStreaming = renderer?.isStreaming && typeof renderer.getTextTrackURLs === 'function';
    const isLiveStream = this._isLiveTranscriptSource();
    const lang = this.currentTranscriptLanguage || (captionTrack?.language ?? '');

    if (isStreaming && lang && !isLiveStream) {
      const loadingMessage = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: i18n.t('transcript.loading')
      });
      this.transcriptContent?.appendChild(loadingMessage);

      this._loadVttTranscript(lang).then(vttCues => {
        if (!this.isVisible) return;
        const trackCueCount = captionTrack?.cues?.length ?? 0;
        const useBulkVtt = Boolean(
          vttCues
          && vttCues.length > 0
          && (trackCueCount === 0 || vttCues.length >= trackCueCount)
        );
        this._renderTranscriptCues(
          useBulkVtt ? vttCues : null,
          captionTrack,
          descriptionTrack
        );
      });
      return;
    }

    // Live HLS/DASH: cues arrive incrementally with shifted timestamps for the
    // same line. Avoid full rebuild/poll loops — append via _syncLiveTranscriptCues.
    if (isLiveStream) {
      if (!captionTrack?.cues?.length) {
        const loadingMessage = DOMUtils.createElement('div', {
          className: `${this.player.options.classPrefix}-transcript-loading`,
          textContent: i18n.t('transcript.loading')
        });
        this.transcriptContent?.appendChild(loadingMessage);
        return;
      }

      this._syncLiveTranscriptCues();
      return;
    }

    // Non-streaming path: wait for sidecar <track> elements to load cues.
    const primaryTrack = captionTrack;
    const primaryNeedsCues = primaryTrack && (!primaryTrack.cues || primaryTrack.cues.length === 0);

    if (primaryNeedsCues) {
      const loadingMessage = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: i18n.t('transcript.loading')
      });
      this.transcriptContent?.appendChild(loadingMessage);

      const hasSidecarElement = this.player.findTrackElement?.(primaryTrack);
      if (hasSidecarElement) {
        primaryTrack.addEventListener('load', () => {
          this.loadTranscriptData();
        }, { once: true });
        this.setManagedTimeout(() => { this.loadTranscriptData(); }, 1000);
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

  private _renderTranscriptCues(
    vttCues: TranscriptCueItem[] | null,
    captionTrack: TranscriptTrack | null,
    descriptionTrack: TranscriptTrack | null
  ) {
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    const transcriptContent = this.transcriptContent;
    if (transcriptContent) {
      transcriptContent.innerHTML = '';
    }

    const allCues: TranscriptCueItem[] = [];

    if (vttCues && vttCues.length > 0) {
      allCues.push(...vttCues);
    } else if (captionTrack && captionTrack.cues) {
      Array.from(captionTrack.cues).forEach((cue: TranscriptCue) => {
        allCues.push({ cue, type: 'caption' });
      });
    }
    
    if (descriptionTrack && descriptionTrack.cues) {
      Array.from(descriptionTrack.cues).forEach((cue: TranscriptCue) => {
        allCues.push({ cue, type: 'description' });
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
      transcriptContent?.appendChild(entry);
    });
    
    this.applyTranscriptStyles();
    this.updateTimestampVisibility();
    
    if (this.transcriptContent && this.currentTranscriptLanguage) {
      this.transcriptContent.setAttribute('lang', this.currentTranscriptLanguage);
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
  handleMetadataCue(cue: TranscriptCue) {
    this.player.handleMetadataCue(cue);
  }

  /**
   * Create a single transcript entry element
   */
  createTranscriptEntry(cue: TranscriptCue, index: number, type: 'caption' | 'description' = 'caption') {
    const entryText = this.stripVTTFormatting(((cue as TextTrackCue & { text?: string }).text) || '');

    // Use a real <button> so screen readers/AT report "button", Enter and
    // Space activate it natively, and forms-mode users can find it.
    const seekLabelTemplate = i18n.t('transcript.seekTo') || 'Seek to {time}';
    const ariaLabel = seekLabelTemplate
      .replace('{time}', TimeUtils.formatTime(cue.startTime))
      .replace('{text}', entryText);

    const entry = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-entry ${this.player.options.classPrefix}-transcript-${type}`,
      attributes: {
        'type': 'button',
        'data-start': String(cue.startTime),
        'data-end': String(cue.endTime),
        'data-type': type,
        'aria-label': `${ariaLabel} — ${entryText}`
      }
    });

    const timestamp = DOMUtils.createElement('span', {
      className: `${this.player.options.classPrefix}-transcript-time`,
      textContent: TimeUtils.formatTime(cue.startTime),
      attributes: {
        'aria-hidden': 'true'  // Hide from screen readers - decorative timestamp
      }
    });

    const text = DOMUtils.createElement('span', {
      className: `${this.player.options.classPrefix}-transcript-text`,
      textContent: entryText
    });

    entry.appendChild(timestamp);
    entry.appendChild(text);

    // Click to seek. <button> elements activate on Enter/Space natively,
    // so a custom keydown handler is no longer needed.
    const seekToTime = () => {
      this.player.seek(cue.startTime);
      if (this.player.state.paused) {
        this.player.play();
      }
    };

    entry.addEventListener('click', seekToTime);

    return entry;
  }

  /**
   * Strip VTT formatting tags from text
   */
  stripVTTFormatting(text: string) {
    // Remove VTT tags like <v Speaker>, <c>, etc.
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\n/g, ' ')
      .trim();
  }

  private _isLiveTranscriptSource(): boolean {
    return this.player.state.isLive === true
      || (typeof this.player.isLiveStream === 'function' && this.player.isLiveStream());
  }

  private _cueDedupeKey(item: TranscriptCueItem): string {
    const cue = item.cue;
    const text = this._normalizedCueText(cue);
    return `${item.type}|${cue.startTime.toFixed(3)}|${cue.endTime.toFixed(3)}|${text}`;
  }

  private _normalizedCueText(cue: TranscriptCue): string {
    return this.stripVTTFormatting(((cue as TextTrackCue & { text?: string }).text) || '');
  }

  private _isNearDuplicateLiveCue(item: TranscriptCueItem): boolean {
    if (!this._isLiveTranscriptSource()) {
      return false;
    }

    const text = this._normalizedCueText(item.cue);
    if (text === '') {
      return false;
    }

    return this._hasDuplicateLiveText(
      item.type,
      text,
      item.cue.startTime,
      this.transcriptEntries.map((entry) => ({
        type: entry.type,
        cue: entry.cue,
        startTime: entry.startTime,
      }))
    );
  }

  private _hasDuplicateLiveText(
    type: TranscriptCueItem['type'],
    text: string,
    startTime: number,
    entries: Array<{ type: TranscriptCueItem['type']; cue: TranscriptCue; startTime: number }>
  ): boolean {
    const windowSec = TranscriptManager.LIVE_TRANSCRIPT_DEDUPE_WINDOW_SEC;

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

  private _dedupeTranscriptCueItems(items: TranscriptCueItem[]): TranscriptCueItem[] {
    const seen = new Set<string>();
    const unique: TranscriptCueItem[] = [];

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

  private _isNearDuplicateLiveCueForList(item: TranscriptCueItem, existing: TranscriptCueItem[]): boolean {
    if (!this._isLiveTranscriptSource()) {
      return false;
    }

    const text = this._normalizedCueText(item.cue);
    if (text === '') {
      return false;
    }

    return this._hasDuplicateLiveText(
      item.type,
      text,
      item.cue.startTime,
      existing.map((other) => ({
        type: other.type,
        cue: other.cue,
        startTime: other.cue.startTime,
      }))
    );
  }

  private _getTrackMaxCueStartTime(track: TranscriptTrack): number {
    if (!track.cues?.length) {
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

  private _pickTranscriptTrackFromGroup(group: TranscriptTrack[]): TranscriptTrack {
    if (this._isLiveTranscriptSource()) {
      return group.reduce((best, track) => (
        this._getTrackMaxCueStartTime(track) > this._getTrackMaxCueStartTime(best) ? track : best
      ));
    }

    return group.reduce((best, track) => {
      const bestLen = best.cues?.length ?? 0;
      const trackLen = track.cues?.length ?? 0;
      return trackLen > bestLen ? track : best;
    });
  }

  /**
   * Pick one caption/subtitle TextTrack for the transcript. Native HLS and
   * hls.js can expose multiple tracks for the same language/label.
   */
  private _resolveCaptionTrackForTranscript(textTracks: TranscriptTrack[]): TranscriptTrack | null {
    const candidates = textTracks.filter(
      (track) => (track.kind === 'captions' || track.kind === 'subtitles') && !track._vidplyStale
    );
    if (candidates.length === 0) {
      return null;
    }

    const pickFromGroup = (group: TranscriptTrack[]): TranscriptTrack => this._pickTranscriptTrackFromGroup(group);

    const groups = new Map<string, TranscriptTrack[]>();
    for (const track of candidates) {
      const key = this._isLiveTranscriptSource()
        ? (track.language || track.label || 'und')
        : `${track.language}|${track.label}`;
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

    let bestTrack: TranscriptTrack | null = null;
    let bestCueCount = -1;
    for (const group of groups.values()) {
      const track = pickFromGroup(group);
      const cueCount = track.cues?.length ?? 0;
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
  private _syncLiveTranscriptCues(): void {
    if (!this.transcriptContent) {
      return;
    }

    const captionTrack = this._resolveCaptionTrackForTranscript(this.player.textTracks as TranscriptTrack[]);
    if (!captionTrack?.cues?.length) {
      return;
    }

    if (!this.currentTranscriptLanguage && captionTrack.language) {
      this.currentTranscriptLanguage = captionTrack.language;
    }

    const existingKeys = new Set(
      this.transcriptEntries.map((entry) => this._cueDedupeKey({ cue: entry.cue, type: entry.type }))
    );

    Array.from(captionTrack.cues).forEach((cue: TranscriptCue) => {
      const item: TranscriptCueItem = { cue, type: 'caption' };
      const key = this._cueDedupeKey(item);
      if (existingKeys.has(key) || this._isNearDuplicateLiveCue(item)) {
        return;
      }
      existingKeys.add(key);

      const entry = this.createTranscriptEntry(cue, this.transcriptEntries.length, 'caption');
      this.transcriptEntries.push({
        element: entry,
        cue,
        type: 'caption',
        startTime: cue.startTime,
        endTime: cue.endTime,
      });
      this.transcriptContent?.appendChild(entry);
    });

    this._normalizeLiveTranscriptOrder();
    this.updateActiveEntry();
  }

  private _startLiveTranscriptSync(): void {
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
      this._liveSyncTimer = this.setManagedTimeout(tick, 2000);
    };

    this._liveSyncTimer = this.setManagedTimeout(tick, 2000);
  }

  private _stopLiveTranscriptSync(): void {
    if (this._liveSyncTimer) {
      this.clearManagedTimeout(this._liveSyncTimer);
      this._liveSyncTimer = null;
    }
  }

  /**
   * Sort live transcript entries chronologically and remove segment-overlap duplicates.
   */
  private _normalizeLiveTranscriptOrder(): void {
    if (!this._isLiveTranscriptSource() || !this.transcriptContent || this.transcriptEntries.length === 0) {
      return;
    }

    const windowSec = TranscriptManager.LIVE_TRANSCRIPT_DEDUPE_WINDOW_SEC;
    const sorted = [...this.transcriptEntries].sort((a, b) => a.startTime - b.startTime);
    const kept: TranscriptEntry[] = [];
    const seen: Array<{ type: TranscriptCueItem['type']; text: string; startTime: number }> = [];

    for (const entry of sorted) {
      const text = this._normalizedCueText(entry.cue);
      const isDuplicate = text !== '' && seen.some((prior) => (
        prior.type === entry.type
        && prior.text === text
        && Math.abs(prior.startTime - entry.startTime) < windowSec
      ));

      if (isDuplicate) {
        entry.element.remove();
        continue;
      }

      if (text !== '') {
        seen.push({ type: entry.type, text, startTime: entry.startTime });
      }
      kept.push(entry);
    }

    this.transcriptEntries = kept;
    kept.forEach((entry) => {
      this.transcriptContent?.appendChild(entry.element);
    });
  }

  /**
   * Show message when no transcript is available
   */
  showNoTranscriptMessage() {
    const message = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-empty`,
      textContent: i18n.t('transcript.noTranscript')
    });
    this.transcriptContent?.appendChild(message);
  }

  /**
   * Update active transcript entry based on current time
   */
  updateActiveEntry() {
    if (!this.isVisible || this.transcriptEntries.length === 0) return;

    const currentTime = this.player.state.currentTime;

    let activeEntry: TranscriptEntry | null;
    if (this._isLiveTranscriptSource()) {
      activeEntry = this.transcriptEntries.reduce<TranscriptEntry | null>((best, entry) => {
        if (currentTime < entry.startTime) {
          return best;
        }
        if (!best || entry.startTime > best.startTime) {
          return entry;
        }
        return best;
      }, null);

      // Drop stale highlights when playback has moved well past the transcript tail.
      if (activeEntry && currentTime - activeEntry.startTime > 120) {
        activeEntry = null;
      }
    } else {
      activeEntry = this.transcriptEntries.find(
        (entry: TranscriptEntry) => currentTime >= entry.startTime && currentTime < entry.endTime
      ) ?? null;
    }

    if (activeEntry && activeEntry !== this.currentActiveEntry) {
      // Remove previous active class
      if (this.currentActiveEntry) {
        this.currentActiveEntry.element.classList.remove(
          `${this.player.options.classPrefix}-transcript-entry-active`
        );
      }

      // Add active class to current entry
      activeEntry.element.classList.add(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      
      // Scroll to active entry
      this.scrollToEntry(activeEntry.element);
      
      this.currentActiveEntry = activeEntry;
    } else if (!activeEntry && this.currentActiveEntry) {
      // No active entry, remove active class
      this.currentActiveEntry.element.classList.remove(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      this.currentActiveEntry = null;
    }
  }

  /**
   * Scroll transcript window to show active entry
   */
  scrollToEntry(entryElement: HTMLElement) {
    if (!this.transcriptContent || !this.autoscrollEnabled) return;

    const contentRect = this.transcriptContent.getBoundingClientRect();
    const entryRect = entryElement.getBoundingClientRect();

    // Check if entry is out of view
    if (entryRect.top < contentRect.top || entryRect.bottom > contentRect.bottom) {
      // Scroll to center the entry
      const scrollTop = entryElement.offsetTop - (this.transcriptContent.clientHeight / 2) + (entryElement.clientHeight / 2);
      this.transcriptContent.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
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

    // Check if we're on mobile and not in fullscreen
    const isMobile = window.innerWidth < 768;
    const isFullscreen = this.player.state.fullscreen;
    
    // On mobile devices (< 768px), only enable drag/resize in fullscreen
    // On desktop/tablets (>= 768px), always enable drag/resize
    if (isMobile && !isFullscreen) {
      // Destroy existing instance if exiting fullscreen on mobile
      if (this.draggableResizable) {
        this.draggableResizable.destroy();
        this.draggableResizable = null;
      }
      return; // No drag/resize on mobile when not in fullscreen
    }

    // If already initialized, don't re-initialize
    if (this.draggableResizable) {
      return;
    }

    // Create DraggableResizable utility with touch support
    this.draggableResizable = new DraggableResizable(this.transcriptWindow, {
      dragHandle: this.transcriptHeader,
      resizeHandles: this.transcriptResizeHandles,
      constrainToViewport: true,
      classPrefix: `${this.player.options.classPrefix}-transcript`,
      keyboardDragKey: 'd',
      keyboardResizeKey: 'r',
      keyboardStep: 10,
      keyboardStepLarge: 50,
      minWidth: 300,
      minHeight: 200,
      maxWidth: () => Math.max(320, window.innerWidth - 40),
      maxHeight: () => Math.max(200, window.innerHeight - 120),
      pointerResizeIndicatorText: i18n.t('transcript.resizeModeHint'),
      onPointerResizeToggle: (enabled) => {
        // Update resize handles visibility
        this.transcriptResizeHandles.forEach((handle: HTMLElement) => {
          handle.style.display = enabled ? 'block' : 'none';
        });
        // Call the state change handler
        this.onPointerResizeModeChange(enabled);
      },
      onDragStart: (e: Event) => {
        // Don't drag if clicking on certain elements
        const ignoreSelectors = [
          `.${this.player.options.classPrefix}-transcript-close`,
          `.${this.player.options.classPrefix}-transcript-settings`,
          `.${this.player.options.classPrefix}-transcript-language-select`,
          `.${this.player.options.classPrefix}-transcript-language-label`,
          `.${this.player.options.classPrefix}-transcript-settings-menu`,
          `.${this.player.options.classPrefix}-transcript-style-dialog`
        ];
        
        for (const selector of ignoreSelectors) {
          if ((e.target as HTMLElement).closest(selector)) {
            return false; // Prevent drag
          }
        }
        
        return true; // Allow drag
      }
    });

    // Add custom keyboard handler for special keys (Escape, Home, Tab trap)
    this.customKeyHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const alreadyPrevented = e.defaultPrevented;

      // Don't handle keys if settings menu or style dialog is open (let them handle keys)
      if (this.settingsMenuVisible || this.styleDialogVisible) {
        return;
      }

      if (key === 'home') {
        e.preventDefault();
        e.stopPropagation();
        if (this.draggableResizable) {
          if (this.draggableResizable.pointerResizeMode) {
            this.draggableResizable.disablePointerResizeMode();
          }
          this.draggableResizable.manuallyPositioned = false;
          this.positionTranscript();
          this.updateResizeOptionState();
          this.announceLive(i18n.t('transcript.positionReset'));
        }
        return;
      }
      
      if (key === 'r') {
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
      
      if (key === 'escape') {
        // Check priority: resize mode > drag mode > close transcript
        // (settings menu and style dialog already handled by early return above)
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
          this.announceLive(i18n.t('transcript.dragModeDisabled'));
          return;
        }
        // Only close transcript if nothing else is open
        e.preventDefault();
        e.stopPropagation();
        this.hideTranscript({ focusButton: true });
        return;
      }
    };
    
    const customKeyHandler = this.customKeyHandler;
    if (this.transcriptWindow && customKeyHandler) {
      this.transcriptWindow.addEventListener('keydown', customKeyHandler, {
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
        this._panel?.showBadge(i18n.t('transcript.dragModeBadge'));
        this.announceLive(i18n.t('transcript.dragModeEnabled'));
      } else if (wasEnabled && !isEnabled) {
        this._panel?.hideBadge();
        this.announceLive(i18n.t('transcript.dragModeDisabled'));
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
    }, 2000);
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
    
    const text = this.showTimestamps
      ? i18n.t('transcript.hideTimestamps')
      : i18n.t('transcript.showTimestamps');
    const ariaLabel = this.showTimestamps
      ? i18n.t('transcript.hideTimestampsAria')
      : i18n.t('transcript.showTimestampsAria');

    this.showTimestampsButton.setAttribute('aria-checked', this.showTimestamps ? 'true' : 'false');
    this.showTimestampsButton.setAttribute('aria-label', ariaLabel);

    if (this.showTimestampsText) {
      this.showTimestampsText.textContent = text;
    }
  }

  updateTimestampVisibility() {
    if (!this.transcriptContent) return;
    
    const timestamps = this.transcriptContent.querySelectorAll<HTMLElement>(`.${this.player.options.classPrefix}-transcript-time`);
    timestamps.forEach((timestamp) => {
      timestamp.style.display = this.showTimestamps ? '' : 'none';
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
    this._panel?.showBadge(i18n.t('transcript.resizeModeBadge'));
  }

  hideResizeModeIndicator() {
    this._panel?.hideBadge();
  }

  onPointerResizeModeChange(enabled: boolean) {
    this.updateResizeOptionState();

    if (enabled) {
      this._panel?.showBadge(i18n.t('transcript.resizeModeBadge'));
      this.announceLive(i18n.t('transcript.resizeModeEnabled'));
    } else {
      this._panel?.hideBadge();
      this.announceLive(i18n.t('transcript.resizeModeDisabled'));
    }
  }

  /**
   * Show style dialog
   */
  showStyleDialog() {
    // The style dialog uses an outside-click listener to dismiss
    // itself. Previously that listener was armed the first time the
    // settings menu opened (the same handler also dismissed the
    // settings menu). Now that the settings menu owns its own
    // outside-click, we arm the style-dialog listener here on first
    // open. Tied to `lifecycleSignal` so teardown is automatic.
    if (!this.documentClickHandlerAdded) {
      setTimeout(() => {
        const documentClick = this.handlers.documentClick;
        if (documentClick) {
          document.addEventListener('click', documentClick, {
            signal: this.player.lifecycleSignal
          });
        }
        this.documentClickHandlerAdded = true;
      }, 300);
    }

    // If dialog already exists, just show it
    if (this.styleDialog) {
      this.styleDialog.style.display = 'block';
      this.styleDialogVisible = true;
      
      // Re-add keyboard handler
      if (this.handlers.styleDialogKeydown) {
        document.addEventListener('keydown', this.handlers.styleDialogKeydown, {
          signal: this.player.lifecycleSignal
        });
      }
      
      // Set flag to prevent immediate closing from document click
      this.styleDialogJustOpened = true;
      setTimeout(() => {
        this.styleDialogJustOpened = false;
      }, 350);
      
      setTimeout(() => {
        const dialog = this.styleDialog;
        if (!dialog) return;
        const firstSelect = dialog.querySelector<HTMLElement>('select, input');
        if (firstSelect) {
          firstSelect.focus({ preventScroll: true });
        }
      }, 0);
      return;
    }

    const styleDialog = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-dialog`
    });
    this.styleDialog = styleDialog;

    const title = DOMUtils.createElement('h4', {
      textContent: i18n.t('transcript.styleTitle'),
      className: `${this.player.options.classPrefix}-transcript-style-title`
    });
    styleDialog.appendChild(title);

    const fontSizeControl = this.createStyleSelectControl(
      i18n.t('captions.fontSize'),
      'fontSize',
      [
        { label: i18n.t('fontSizes.small'), value: '90%' },
        { label: i18n.t('fontSizes.normal'), value: '100%' },
        { label: i18n.t('fontSizes.large'), value: '110%' },
        { label: i18n.t('fontSizes.xlarge'), value: '120%' }
      ]
    );
    styleDialog.appendChild(fontSizeControl);

    const fontFamilyControl = this.createStyleSelectControl(
      i18n.t('captions.fontFamily'),
      'fontFamily',
      [
        { label: i18n.t('fontFamilies.sansSerif'), value: 'sans-serif' },
        { label: i18n.t('fontFamilies.serif'), value: 'serif' },
        { label: i18n.t('fontFamilies.monospace'), value: 'monospace' }
      ]
    );
    styleDialog.appendChild(fontFamilyControl);

    const colorControl = this.createStyleColorControl(i18n.t('captions.color'), 'color');
    styleDialog.appendChild(colorControl);

    const bgColorControl = this.createStyleColorControl(i18n.t('captions.backgroundColor'), 'backgroundColor');
    styleDialog.appendChild(bgColorControl);

    const opacityControl = this.createStyleOpacityControl(i18n.t('captions.opacity'), 'opacity');
    styleDialog.appendChild(opacityControl);

    const closeBtn = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-style-close`,
      textContent: i18n.t('settings.close'),
      attributes: {
        'type': 'button'
      }
    });
    closeBtn.addEventListener('click', () => this.hideStyleDialog());
    styleDialog.appendChild(closeBtn);

    const styleKeyHandler = (e: KeyboardEvent) => {
      if (!this.styleDialogVisible) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hideStyleDialog();
        return;
      }
      
      if (e.key === 'Tab') {
        const focusableElements = styleDialog.querySelectorAll<HTMLElement>(
          'select, input, button'
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
    document.addEventListener('keydown', styleKeyHandler, {
      signal: this.player.lifecycleSignal
    });

    if (this.headerLeft) {
      this.headerLeft.appendChild(styleDialog);
    } else if (this.transcriptHeader) {
      this.transcriptHeader.appendChild(styleDialog);
    }
    
    this.applyTranscriptStyles();
    
    this.styleDialogVisible = true;
    styleDialog.style.display = 'block';
    
    this.styleDialogJustOpened = true;
    setTimeout(() => {
      this.styleDialogJustOpened = false;
    }, 350);
    
    setTimeout(() => {
      const firstSelect = styleDialog.querySelector<HTMLElement>('select, input');
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
      this.styleDialog.style.display = 'none';
      this.styleDialogVisible = false;
      
      // Remove keyboard handler
      if (this.handlers.styleDialogKeydown) {
        document.removeEventListener('keydown', this.handlers.styleDialogKeydown);
      }
      
      // Return focus to settings button
      if (this.settingsButton) {
        this.settingsButton.focus({ preventScroll: true });
      }
    }
  }

  /**
   * Create style select control
   */
  createStyleSelectControl(label: string, property: string, options: Array<{ label: string; value: string }>) {
    const group = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });

    // Generate unique ID for the control
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': controlId
      }
    });
    group.appendChild(labelEl);

    const select = DOMUtils.createElement('select', {
      className: `${this.player.options.classPrefix}-transcript-style-select`,
      attributes: {
        'id': controlId
      }
    });

    options.forEach((opt: { label: string; value: string }) => {
      const option = DOMUtils.createElement('option', {
        textContent: opt.label,
        attributes: {
          'value': opt.value
        }
      });
      if (this.transcriptStyle[property as 'fontSize' | 'fontFamily'] === opt.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      this.transcriptStyle[property as 'fontSize' | 'fontFamily'] = (e.target as HTMLSelectElement).value;
      this.applyTranscriptStyles();
      this.savePreferences();
    });

    group.appendChild(select);
    return group;
  }

  /**
   * Create style color control
   */
  createStyleColorControl(label: string, property: string) {
    const group = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });

    // Generate unique ID for the control
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': controlId
      }
    });
    group.appendChild(labelEl);

    const input = DOMUtils.createElement('input', {
      attributes: {
        'id': controlId,
        'type': 'color',
        'value': this.transcriptStyle[property as 'color' | 'backgroundColor']
      },
      className: `${this.player.options.classPrefix}-transcript-style-color`
    });

    input.addEventListener('input', (e) => {
      this.transcriptStyle[property as 'color' | 'backgroundColor'] = (e.target as HTMLInputElement).value;
      this.applyTranscriptStyles();
      this.savePreferences();
    });

    group.appendChild(input);
    return group;
  }

  /**
   * Create style opacity control
   */
  createStyleOpacityControl(label: string, property: string) {
    const group = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });

    // Generate unique ID for the control
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': controlId
      }
    });
    group.appendChild(labelEl);

    const opacityProperty = property as 'opacity';
    const valueDisplay = DOMUtils.createElement('span', {
      textContent: Math.round(this.transcriptStyle[opacityProperty] * 100) + '%',
      className: `${this.player.options.classPrefix}-transcript-style-value`
    });

    const input = DOMUtils.createElement('input', {
      attributes: {
        'id': controlId,
        'type': 'range',
        'min': '0',
        'max': '1',
        'step': '0.1',
        'value': String(this.transcriptStyle[opacityProperty])
      },
      className: `${this.player.options.classPrefix}-transcript-style-range`
    });

    input.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.transcriptStyle[opacityProperty] = value;
      valueDisplay.textContent = Math.round(value * 100) + '%';
      this.applyTranscriptStyles();
      this.savePreferences();
    });

    const inputContainer = DOMUtils.createElement('div', {
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

    // Apply to transcript window background
    this.transcriptWindow.style.backgroundColor = this.transcriptStyle.backgroundColor;
    this.transcriptWindow.style.opacity = String(this.transcriptStyle.opacity);

    // Apply to content area
    if (this.transcriptContent) {
      this.transcriptContent.style.fontSize = this.transcriptStyle.fontSize;
      this.transcriptContent.style.fontFamily = this.transcriptStyle.fontFamily;
      this.transcriptContent.style.color = this.transcriptStyle.color;
    }

    const textEntries = this.transcriptWindow.querySelectorAll<HTMLElement>(`.${this.player.options.classPrefix}-transcript-text`);
    textEntries.forEach((entry) => {
      entry.style.fontSize = this.transcriptStyle.fontSize;
      entry.style.fontFamily = this.transcriptStyle.fontFamily;
      entry.style.color = this.transcriptStyle.color;
    });
    
    const timeEntries = this.transcriptWindow.querySelectorAll<HTMLElement>(`.${this.player.options.classPrefix}-transcript-time`);
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
  setManagedTimeout(callback: () => void, delay: number) {
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
  clearManagedTimeout(timeoutId: ReturnType<typeof setTimeout> | null) {
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

    // Tear down the settings-menu panel (removes its DOM + keyboard
    // listeners). The outside-click listener was attached with the
    // player's lifecycleSignal, so it cleans itself up as the player
    // is destroyed.
    if (this._panel) {
      this._panel.destroy();
      this._panel = null;
    }

    // Destroy draggableResizable utility
    if (this.draggableResizable) {
      if (this.draggableResizable.pointerResizeMode) {
        this.draggableResizable.disablePointerResizeMode();
        this.updateResizeOptionState();
      }
      this.draggableResizable.destroy();
      this.draggableResizable = null;
    }
    
    // Remove custom key handler
    if (this.transcriptWindow && this.customKeyHandler) {
      this.transcriptWindow.removeEventListener('keydown', this.customKeyHandler);
      this.customKeyHandler = null;
    }

    // Remove timeupdate and seeked listeners from player
    if (this.handlers.timeupdate) {
      this.player.off('timeupdate', this.handlers.timeupdate);
    }
    if (this.handlers.seeked) {
      this.player.off('seeked', this.handlers.seeked);
    }
    
    // Remove audio description listeners from player
    if (this.handlers.audiodescriptionenabled) {
      this.player.off('audiodescriptionenabled', this.handlers.audiodescriptionenabled);
    }
    if (this.handlers.audiodescriptiondisabled) {
      this.player.off('audiodescriptiondisabled', this.handlers.audiodescriptiondisabled);
    }

    // Remove text cue update listener
    if (this.handlers.textcuesupdate) {
      this.player.off('textcuesupdate', this.handlers.textcuesupdate);
    }
    if (this.handlers.livechange) {
      this.player.off('livechange', this.handlers.livechange);
    }

    // Remove floating-state listener
    if (this.handlers.floatingchange) {
      this.player.off('floatingchange', this.handlers.floatingchange);
    }
    
    // Remove settings button event listeners
    if (this.settingsButton) {
      if (this.handlers.settingsClick) {
        this.settingsButton.removeEventListener('click', this.handlers.settingsClick);
      }
      if (this.handlers.settingsKeydown) {
        this.settingsButton.removeEventListener('keydown', this.handlers.settingsKeydown);
      }
    }
    
    // Remove style dialog event listeners
    if (this.handlers.styleDialogKeydown) {
      document.removeEventListener('keydown', this.handlers.styleDialogKeydown);
    }

    // Remove document click listener
    if (this.handlers.documentClick) {
      document.removeEventListener('click', this.handlers.documentClick);
    }
    
    // Remove window-level listeners
    if (this.handlers.resize) {
      window.removeEventListener('resize', this.handlers.resize);
    }

    // Cleanup all managed timeouts
    this.timeouts.forEach((timeoutId: ReturnType<typeof setTimeout>) => clearTimeout(timeoutId));
    this.timeouts.clear();

    this.handlers = {} as TranscriptHandlers;

    // Remove DOM element
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

  announceLive(message: string) {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = message || '';
  }
}
