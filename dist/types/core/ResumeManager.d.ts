/**
 * Resume-playback feature extracted from Player.
 *
 * Owns:
 * - Throttled progress persistence during playback.
 * - "Where were we?" detection on `loadedmetadata`.
 * - Clearing persisted progress on `ended`.
 * - The optional resume prompt (accessible modal with two buttons).
 *
 * Because `resumePlayback` is opt-in, the Player only instantiates
 * this manager when the option is enabled — so pages without the
 * feature don't pay for the extra state / event handlers.
 */
import type { Player } from './Player.js';
export declare class ResumeManager {
    private readonly player;
    private saveProgressThrottled;
    private resumeChecked;
    private listenersAttached;
    /** Element focused before the modal opened, restored when it closes. */
    private previouslyFocused;
    constructor(player: Player);
    /**
     * Wire up the progress-save + resume-check listeners. Safe to call
     * multiple times: repeat calls are no-ops so a re-init path during
     * source switching doesn't stack duplicate listeners.
     */
    init(): void;
    /**
     * Persist current playback progress to storage. No-op when the
     * feature is disabled, when the video is too short / at the very
     * start, or when playback is effectively complete.
     */
    saveProgress(): void;
    /**
     * Check for a previously-saved resume point for the current video
     * and either auto-resume or show the prompt depending on
     * `options.resumePrompt`. Safe to call manually, e.g. after an
     * external source change.
     */
    checkForResume(): void;
    /**
     * Format a time value as `mm:ss` (or `hh:mm:ss` once we cross an
     * hour) for display in the resume prompt label. No localisation is
     * needed because the surrounding prompt text is already localised
     * by i18n.
     */
    private formatTime;
    /**
     * Collect the tabbable elements inside a container, in DOM order. Used to
     * keep Tab / Shift+Tab cycling within the modal (focus trap).
     */
    private getFocusableElements;
    showPrompt(savedTime: number): void;
    hidePrompt(): void;
}
//# sourceMappingURL=ResumeManager.d.ts.map