/**
 * Sign Language Video Manager
 * Handles picture-in-picture sign language video overlay
 */
import { DraggableResizable } from '../utils/DraggableResizable.js';
import type { Player } from './Player.js';
/**
 * Bag of player-event handlers the sign-language overlay binds to so it
 * can mirror the main player's playback state.
 */
interface SignLanguageHandlers {
    play: () => void;
    pause: () => void;
    timeupdate: () => void;
    ratechange: () => void;
    captionChange?: () => void;
}
interface SignLanguageSettingsHandlers {
    click: (e: MouseEvent) => void;
    keydown: (e: KeyboardEvent) => void;
}
interface SignLanguageInteractionHandlers {
    draggable: DraggableResizable | null;
    customKeyHandler: ((e: KeyboardEvent) => void) | null;
}
export declare class SignLanguageManager {
    player: Player;
    _mainViewMutedBefore: boolean;
    _mainViewUsingSourceSwap: boolean;
    currentLanguage: string | null;
    customKeyHandler: ((e: KeyboardEvent) => void) | null;
    desiredPosition: string;
    draggable: DraggableResizable | null;
    handlers: SignLanguageHandlers | null;
    header: HTMLElement | null;
    inMainView: boolean;
    interactionHandlers: SignLanguageInteractionHandlers | null;
    mainViewOriginalSources: HTMLSourceElement[] | null;
    mainViewOriginalSrc: string | null;
    resizeHandles: HTMLElement[];
    selector: HTMLSelectElement | null;
    settingsButton: HTMLButtonElement | null;
    settingsHandlers: SignLanguageSettingsHandlers | null;
    sources: Record<string, string>;
    src: string | null;
    enabled: boolean;
    video: HTMLVideoElement | null;
    wrapper: HTMLElement | null;
    /**
     * Encapsulates the settings-menu DOM, lifecycle (show/hide/outside-
     * click/keyboard nav/positioning), and the drag/resize toggle items.
     * Owned here but lazily created once {@link _setupSettingsButton}
     * instantiates the button it needs to anchor from.
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
    /**
     * Check if sign language is available
     */
    isAvailable(): boolean;
    /**
     * Enable sign language video
     */
    enable(): void;
    /**
     * Disable sign language video
     */
    disable(): void;
    /**
     * Toggle sign language video
     */
    toggle(): void;
    /**
     * Enable sign language in main view: replace main video src with sign language URL (like audio description).
     * Same video element, different URL; no overlay.
     */
    enableInMainView(): Promise<void>;
    /**
     * Disable sign language in main view: restore main video src.
     */
    disableInMainView(): Promise<void>;
    /**
     * Wait for media ready (like AudioDescriptionManager).
     */
    _waitForMediaReadyMainView(needSeek?: boolean): Promise<void>;
    /**
     * Toggle sign language in main view (src swap, like audio description).
     */
    toggleInMainView(): void;
    /**
     * Switch to a different sign language
     */
    switchLanguage(langCode: string): void;
    _inferVideoType(url: string): string;
    /**
     * Get language label
     */
    getLanguageLabel(langCode: string): string;
    /**
     * Determine initial sign language
     */
    _determineInitialLanguage(): string;
    /**
     * Create wrapper element
     */
    _createWrapper(): void;
    /**
     * Create header element
     */
    _createHeader(hasMultipleSources: boolean, initialLang: string | null): void;
    /**
     * Create settings button and wire it to a {@link DraggablePanel}
     * that owns the drag/resize settings menu and its lifecycle.
     */
    _createSettingsButton(container: HTMLElement): void;
    /**
     * Create language selector
     */
    _createLanguageSelector(container: HTMLElement, initialLang: string | null): void;
    /**
     * Create close button
     */
    _createCloseButton(): HTMLButtonElement;
    /**
     * Create video element
     */
    _createVideo(src: string | null): void;
    /**
     * Create resize handles
     */
    _createResizeHandles(): void;
    /**
     * Apply initial size
     */
    _applyInitialSize(): void;
    /**
     * Setup interaction (drag and resize)
     */
    _setupInteraction(): void;
    /**
     * Setup custom keyboard handler
     */
    _setupCustomKeyHandler(): void;
    /**
     * Setup event handlers
     */
    _setupEventHandlers(hasMultipleSources: boolean): void;
    /**
     * Constrain position within video wrapper
     */
    constrainPosition(): void;
    /**
     * Show the settings menu. Delegates to the shared {@link DraggablePanel},
     * which owns the DOM, outside-click dismissal, keyboard navigation and
     * positioning. Kept as a named method so external callers (other
     * managers, tests) that referenced the legacy API keep working.
     */
    showSettingsMenu(): void;
    /** @see {@link showSettingsMenu} */
    hideSettingsMenu({ focusButton }?: {
        focusButton?: boolean | undefined;
    }): void;
    _showModeBadge(text: string): void;
    _hideModeBadge(): void;
    /**
     * Toggle keyboard drag mode
     */
    toggleKeyboardDragMode(): void;
    /**
     * Enable move mode visual feedback
     */
    _enableMoveMode(): void;
    /**
     * Toggle resize mode
     */
    toggleResizeMode({ focus }?: {
        focus?: boolean | undefined;
    }): boolean;
    _updateDragOptionState(): void;
    _updateResizeOptionState(): void;
    /**
     * Save preferences
     */
    savePreferences(): void;
    /**
     * Update sources (called when playlist changes)
     */
    updateSources(signLanguageSrc?: string | null, signLanguageSources?: Record<string, string> | null): void;
    /**
     * Cleanup
     */
    cleanup(): void;
    /**
     * Destroy
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=SignLanguageManager.d.ts.map