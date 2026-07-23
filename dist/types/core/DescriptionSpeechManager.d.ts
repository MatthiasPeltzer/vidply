/**
 * Extended audio description via WebVTT descriptions cues and speech synthesis.
 * Pauses the video, speaks the cue text, then resumes playback when finished.
 */
import type { Player } from './Player.js';
export interface DescriptionCueDetail {
    time: number;
    endTime: number;
    text: string;
    cue: TextTrackCue;
}
export declare class DescriptionSpeechManager {
    player: Player;
    enabled: boolean;
    descriptionTrack: TextTrack | null;
    cueChangeHandler: (() => void) | null;
    seekedHandler: (() => void) | null;
    wasPlayingBeforeCue: boolean;
    speaking: boolean;
    lastSpokenCueKey: string | null;
    private _pendingUtterance;
    constructor(player: Player);
    /**
     * Whether speech synthesis is available and enabled in player options.
     */
    canUseSpeech(): boolean;
    /**
     * Resolve the descriptions track, preferring the active caption language.
     */
    findDescriptionTrack(): TextTrack | null;
    /**
     * Enable VTT speech mode: wire cuechange/seeked listeners.
     */
    enable(): boolean;
    /**
     * Disable VTT speech mode and restore track state.
     */
    disable(): void;
    /**
     * Handle active description cues on the wired track.
     */
    handleCueChange(): void;
    /**
     * Pause playback and speak a description cue.
     */
    speakCue(cue: VTTCue, cueKey: string): void;
    /**
     * Cancel any in-progress speech synthesis.
     */
    cancelSpeech(): void;
    destroy(): void;
}
//# sourceMappingURL=DescriptionSpeechManager.d.ts.map