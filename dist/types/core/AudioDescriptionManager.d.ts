/**
 * Audio Description Manager
 * Handles audio-described video source switching and caption track swapping
 */
import type { Player } from './Player.js';
import { DescriptionSpeechManager } from './DescriptionSpeechManager.js';
export type AudioDescriptionDeliveryMode = 'swap' | 'vtt_speech' | 'none';
/**
 * Caption-track entry tracked by the audio-description manager. Each
 * entry pairs a `<track>` element with its described/original source
 * URLs so the manager can swap the rendered captions when the user
 * toggles audio description.
 */
interface CaptionTrackInfo {
    trackElement: HTMLTrackElement;
    originalSrc: string | null;
    describedSrc: string;
    originalTrackSrc: string | null;
    explicit: boolean;
}
export declare class AudioDescriptionManager {
    player: Player;
    captionTracks: CaptionTrackInfo[];
    desiredState: boolean;
    enabled: boolean;
    originalSource: string | null;
    sourceElement: Element | null;
    src: string | null;
    speechManager: DescriptionSpeechManager | null;
    constructor(player: Player);
    /**
     * Whether a described video source swap is configured.
     */
    _hasSwapSource(): boolean;
    /**
     * Whether a descriptions VTT track is present on the media element.
     */
    _hasDescriptionsTrack(): boolean;
    /**
     * Resolve which audio-description delivery mode applies for the current media.
     */
    resolveDeliveryMode(): AudioDescriptionDeliveryMode;
    _ensureSpeechManager(): DescriptionSpeechManager;
    /**
     * Initialize audio description from source elements
     * Called during player initialization
     */
    initFromSourceElements(sourceElements: Element[], trackElements: Element[]): void;
    /**
     * Check if audio description is available
     */
    isAvailable(): boolean;
    /**
     * Enable audio description
     */
    enable(): Promise<void>;
    /**
     * Disable audio description
     */
    disable(): Promise<void>;
    /**
     * Toggle audio description
     */
    toggle(): Promise<void>;
    /**
     * Get current caption text for synchronization
     */
    _getCurrentCaptionText(): string | null;
    /**
     * Validate that a track URL exists. Bounded by the player's lifecycle
     * AbortController + an 8s timeout so a torn-down player cannot leak
     * the request.
     */
    _validateTrackExists(url: string): Promise<boolean>;
    /**
     * Swap caption tracks to described versions
     */
    _swapCaptionTracks(toDescribed?: boolean): Promise<CaptionTrackInfo[]>;
    /**
     * Update source elements to described versions
     */
    _updateSourceElements(toDescribed?: boolean): void;
    /**
     * Wait for media to be ready
     */
    _waitForMediaReady(needSeek?: boolean): Promise<void>;
    /**
     * Restore playback state after source change
     */
    _restorePlaybackState(currentTime: number, wasPlaying: boolean, shouldKeepPoster: boolean, currentCaptionText: string | null): Promise<void>;
    /**
     * Enable with source element method
     */
    _enableWithSourceElement(currentTime: number, wasPlaying: boolean, posterValue: string | null, shouldKeepPoster: boolean, currentCaptionText: string | null): Promise<void>;
    /**
     * Enable with direct src method
     */
    _enableWithDirectSrc(currentTime: number, wasPlaying: boolean, posterValue: string | null, shouldKeepPoster: boolean): Promise<void>;
    /**
     * Disable with source element method
     */
    _disableWithSourceElement(currentTime: number, wasPlaying: boolean, posterValue: string | null, shouldKeepPoster: boolean, currentCaptionText: string | null): Promise<void>;
    /**
     * Disable with direct src method
     */
    _disableWithDirectSrc(currentTime: number, wasPlaying: boolean, posterValue: string | null): Promise<void>;
    /**
     * Reload transcript after audio description state change
     */
    _reloadTranscript(): void;
    /**
     * Update sources (called when playlist changes)
     */
    updateSources(audioDescriptionSrc: string | null | undefined): void;
    /**
     * Reinitialize from current player elements (called after playlist loads new tracks)
     */
    reinitialize(): void;
    /**
     * Cleanup
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=AudioDescriptionManager.d.ts.map