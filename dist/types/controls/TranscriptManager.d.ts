/**
 * Transcript Manager Component
 * Manages transcript display and interaction
 */
import { StorageManager } from '../utils/StorageManager.js';
import { DraggableResizable } from '../utils/DraggableResizable.js';
import type { Player } from '../core/Player.js';
type TranscriptCue = TextTrackCue;
type TranscriptTrack = TextTrack & {
    _vidplyStale?: boolean;
};
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
}
type TimerHandle = ReturnType<typeof setTimeout>;
export declare class TranscriptManager {
    player: Player;
    _cueUpdateTimeout: TimerHandle | null;
    autoscrollCheckbox: HTMLInputElement | null;
    autoscrollEnabled: boolean;
    availableTranscriptLanguages: TranscriptLanguageInfo[];
    currentActiveEntry: TranscriptEntry | null;
    currentTranscriptLanguage: string | null;
    customKeyHandler: ((e: KeyboardEvent) => void) | null;
    /** Elements marked inert while the floating transcript dialog is open. */
    private inertedElements;
    previouslyFocused: HTMLElement | null;
    /**
     * True once the style-dialog's outside-click listener has been
     * attached. The settings-menu's outside-click listener is now
     * owned by {@link DraggablePanel} and tracked there; this flag
     * covers the dialog half of the shared `handlers.documentClick`.
     */
    documentClickHandlerAdded: boolean;
    draggableResizable: DraggableResizable | null;
    handlers: TranscriptHandlers;
    headerLeft: HTMLElement | null;
    isVisible: boolean;
    languageLabel: HTMLElement | null;
    languageSelector: HTMLSelectElement | null;
    languageSelectorHandler: ((e: Event) => void) | null;
    languageSelectorWrapper: HTMLElement | null;
    liveRegion: HTMLElement | null;
    settingsButton: HTMLButtonElement | null;
    showTimestamps: boolean;
    showTimestampsButton: HTMLElement | null;
    showTimestampsText: Element | null;
    storage: StorageManager;
    styleDialog: HTMLElement | null;
    styleDialogJustOpened: boolean;
    styleDialogVisible: boolean;
    timeouts: Set<TimerHandle>;
    transcriptContent: HTMLElement | null;
    transcriptEntries: TranscriptEntry[];
    transcriptHeader: HTMLElement | null;
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
    private _panel;
    get settingsMenu(): HTMLElement | null;
    set settingsMenu(_v: HTMLElement | null);
    get settingsMenuVisible(): boolean;
    set settingsMenuVisible(_v: boolean);
    get settingsMenuJustOpened(): boolean;
    set settingsMenuJustOpened(_v: boolean);
    get dragOptionButton(): HTMLElement | null;
    get dragOptionText(): Element | null;
    get resizeOptionButton(): HTMLElement | null;
    get resizeOptionText(): Element | null;
    constructor(player: Player);
    init(): void;
    /**
     * For streaming renderers (DASH), tell the renderer to activate the text
     * track for `lang` so dash.js starts downloading subtitle segments and
     * populating cues.  Skips the call if the language is already active.
     */
    private _requestStreamingTrack;
    /**
     * Toggle transcript window visibility
     */
    toggleTranscript(): void;
    /**
     * Show transcript window
     */
    showTranscript(): void;
    /**
     * Hide transcript window
     */
    hideTranscript({ focusButton }?: {
        focusButton?: boolean | undefined;
    }): void;
    /**
     * Create the transcript window UI
     */
    createTranscriptWindow(): void;
    createResizeHandles(): void;
    /**
     * Position transcript window next to video
     */
    positionTranscript(): void;
    /**
     * Floating/overlay layouts behave as modal dialogs; inline mobile layout does not.
     */
    private isFloatingTranscriptLayout;
    /**
     * Toggle aria-modal, background inert, and related WCAG semantics after layout.
     */
    private updateTranscriptModalState;
    /**
     * Get available transcript languages from tracks
     */
    getAvailableTranscriptLanguages(): TranscriptLanguageInfo[];
    /**
     * Update language selector dropdown
     */
    updateLanguageSelector(): void;
    private _parseVTT;
    private _loadVttTranscript;
    /**
     * Build an AbortSignal that fires when either the player is destroyed
     * or `timeoutMs` elapses, whichever happens first.
     */
    private _buildFetchSignal;
    /**
     * Load transcript data from caption/subtitle tracks
     */
    loadTranscriptData(): void;
    private _renderTranscriptCues;
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
    handleMetadataCue(cue: TranscriptCue): void;
    /**
     * Create a single transcript entry element
     */
    createTranscriptEntry(cue: TranscriptCue, index: number, type?: 'caption' | 'description'): HTMLButtonElement;
    /**
     * Strip VTT formatting tags from text
     */
    stripVTTFormatting(text: string): string;
    /**
     * Show message when no transcript is available
     */
    showNoTranscriptMessage(): void;
    /**
     * Update active transcript entry based on current time
     */
    updateActiveEntry(): void;
    /**
     * Scroll transcript window to show active entry
     */
    scrollToEntry(entryElement: HTMLElement): void;
    /**
     * Save autoscroll preference to localStorage
     */
    saveAutoscrollPreference(): void;
    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop(): void;
    /**
     * Toggle keyboard drag mode. Mirrors the sign-language flow: a
     * persistent badge is shown on the transcript window while the mode
     * is active, and a live-region announcement is made on each state
     * change.
     */
    toggleKeyboardDragMode(): void;
    /**
     * Toggle settings menu visibility
     */
    toggleSettingsMenu(): void;
    /**
     * Show the settings menu. Delegates to the shared {@link DraggablePanel};
     * kept as a named method so external callers (tests, other managers)
     * that referenced the legacy API keep working.
     */
    showSettingsMenu(): void;
    /** @see {@link showSettingsMenu} */
    positionSettingsMenu(): void;
    /** @see {@link showSettingsMenu} */
    hideSettingsMenu({ focusButton }?: {
        focusButton?: boolean | undefined;
    }): void;
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
    enableMoveMode(): void;
    /**
     * Toggle resize mode
     */
    toggleResizeMode({ focus }?: {
        focus?: boolean | undefined;
    }): boolean;
    updateDragOptionState(): void;
    updateResizeOptionState(): void;
    toggleShowTimestamps(): void;
    updateShowTimestampsState(): void;
    updateTimestampVisibility(): void;
    saveTimestampsPreference(): void;
    showResizeModeIndicator(): void;
    hideResizeModeIndicator(): void;
    onPointerResizeModeChange(enabled: boolean): void;
    /**
     * Show style dialog
     */
    showStyleDialog(): void;
    /**
     * Hide style dialog
     */
    hideStyleDialog(): void;
    /**
     * Create style select control
     */
    createStyleSelectControl(label: string, property: string, options: Array<{
        label: string;
        value: string;
    }>): HTMLDivElement;
    /**
     * Create style color control
     */
    createStyleColorControl(label: string, property: string): HTMLDivElement;
    /**
     * Create style opacity control
     */
    createStyleOpacityControl(label: string, property: string): HTMLDivElement;
    /**
     * Save transcript preferences to localStorage
     */
    savePreferences(): void;
    /**
     * Apply transcript styles
     */
    applyTranscriptStyles(): void;
    /**
     * Set a managed timeout that will be cleaned up on destroy
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setManagedTimeout(callback: () => void, delay: number): number;
    /**
     * Clear a managed timeout
     * @param {number} timeoutId - Timeout ID to clear
     */
    clearManagedTimeout(timeoutId: ReturnType<typeof setTimeout> | null): void;
    /**
     * Cleanup
     */
    destroy(): void;
    announceLive(message: string): void;
}
export {};
//# sourceMappingURL=TranscriptManager.d.ts.map