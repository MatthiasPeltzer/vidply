import type { EmbedCaptionTrack, Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
export declare class VimeoRenderer implements Renderer {
    readonly rendererType: "vimeo";
    player: Player;
    media: HTMLMediaElement;
    vimeo: VimeoPlayer | null;
    videoId: string | null;
    isReady: boolean;
    iframe: HTMLDivElement | null;
    constructor(player: Player);
    init(): Promise<void>;
    private clearEmbedChromeClassesOnInitFailure;
    private usesProviderChrome;
    private chromelessEmbedActive;
    private applyChromelessIdlePoster;
    private applyVimeoThumbnailIdlePoster;
    private setVimeoIdleCover;
    extractVideoId(url: string): string | null;
    loadVimeoAPI(): Promise<void>;
    createIframe(): void;
    initializePlayer(): Promise<void>;
    attachEvents(): void;
    /**
     * Switch to another Vimeo video without recreating the embed player.
     */
    loadSource(src: string): Promise<void>;
    play(): void;
    pause(): void;
    seek(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setPlaybackSpeed(speed: number): void;
    handlesOwnCaptions(): boolean;
    getEmbedCaptionTracks(): Promise<EmbedCaptionTrack[]>;
    setEmbedCaptionTrack(trackId: string | null): Promise<void>;
    destroy(): void;
}
//# sourceMappingURL=VimeoRenderer.d.ts.map