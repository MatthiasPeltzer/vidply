/**
 * Metadata-track alert handling extracted from Player.
 *
 * The alert system lets a `kind=metadata` text track drive
 * accessibility affordances on the page — pausing the video,
 * focusing an element, showing or hiding a marked-up alert region,
 * wiring a "Continue" button. All of that lives here rather than on
 * Player so the code can be skipped entirely (via tree-shaking) when
 * the `metadataAlerts`/`metadataDirectives` options are disabled.
 *
 * Public-ish entry points (Player exposes them through thin
 * delegates that keep the same names):
 *
 * - `setupHandling()` — wire the `cuechange` listener
 * - `handleCue(cue)` — parse a single cue and dispatch directives
 * - `handleAlert(selector, options)` — manually drive the alert UI
 * - `handleHashtags(tags)` — resolve a list of cue hashtags
 * - `cleanup()` — called from Player.destroy()
 */
import type { Player } from './Player.js';
/** Per-selector metadata alert configuration. */
export interface MetadataAlertConfig {
    titleSelector?: string;
    messageSelector?: string;
    title?: string;
    message?: string;
    focus?: boolean;
    focusOnShow?: boolean;
    focusTarget?: string;
    focusDelay?: number;
    label?: string;
    role?: string;
    show?: boolean;
    display?: string;
    hideDisplay?: string;
    autoScroll?: boolean;
    selector?: string;
    alert?: string;
    target?: string;
    continueButton?: string;
    hideOnContinue?: boolean;
    resume?: boolean;
    resetContent?: boolean;
    notification?: string;
    persist?: boolean;
    [key: string]: unknown;
}
/** Options accepted by `handleAlert`. */
export interface MetadataAlertOptions {
    element?: HTMLElement | null;
    reason?: string;
    cue?: VTTCue | null;
    show?: boolean;
    focus?: boolean;
    autoScroll?: boolean;
}
export declare class MetadataAlertsManager {
    private readonly player;
    private cueChangeHandler;
    private readonly alertHandlers;
    constructor(player: Player);
    /** The `cuechange` handler this manager installed on the metadata
     *  track. Exposed so Player can mirror it onto itself for legacy
     *  access (some tests poke at `player.metadataCueChangeHandler`). */
    get cuechangeListener(): (() => void) | null;
    setupHandling(): void;
    /**
     * Sanitise a user-supplied selector string. Returns `null` for
     * anything that isn't obviously safe: non-string input, empty
     * after trimming, or too long to bound selector-engine cost.
     */
    normalizeSelector(selector: unknown): string | null;
    resolveConfig(map: Record<string, unknown> | null | undefined, key: string | null | undefined): MetadataAlertConfig | null;
    /**
     * Remember the original title/message text before a hashtag cue
     * overwrites them, so `restoreContent` can roll back on the next
     * cue boundary. Idempotent — a second call for the same element
     * does not overwrite the already-cached value.
     */
    cacheContent(element: HTMLElement | null | undefined, config?: MetadataAlertConfig): void;
    restoreContent(element: HTMLElement | null | undefined, config?: MetadataAlertConfig): void;
    /**
     * Move focus to one of the well-known targets understood by the
     * alert system, or to a named selector. Never silently errors — an
     * unresolved target is simply a no-op.
     */
    focusTarget(target: string | null | undefined, fallbackElement?: HTMLElement | null): void;
    /**
     * The public alert entry point. Pulls config out of
     * `options.metadataAlerts`, locates the DOM element, and applies
     * show/focus/continue logic per configuration.
     */
    handleAlert(selector: string, options?: MetadataAlertOptions): HTMLElement | undefined;
    handleHashtags(hashtags: string[] | null | undefined): void;
    /**
     * Parse a single metadata cue for directives (`PAUSE`, `FOCUS:x`,
     * `#hashtag`), emit the corresponding public events, and execute
     * DOM side-effects only when `options.metadataDirectives` is set.
     */
    handleCue(cue: VTTCue | TextTrackCue): void;
    /**
     * Resolve a metadata-cue selector inside the configured directive
     * scope. Returns `null` when directives are disabled or the
     * selector doesn't resolve. Container-scoped resolution is the
     * default so a malicious caption cannot focus a login-form input
     * or trigger a dialog elsewhere on the page.
     */
    private resolveElement;
    /** Tear down the per-alert click handlers and the cuechange
     *  listener. Called from Player.destroy(). */
    cleanup(): void;
}
//# sourceMappingURL=MetadataAlertsManager.d.ts.map