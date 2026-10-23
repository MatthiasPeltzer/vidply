import type { EmbedCaptionTrack, Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
export declare class YouTubeRenderer implements Renderer {
    /** Privacy-enhanced embed host (no cookies until the visitor starts playback). */
    static readonly EMBED_HOST = "https://www.youtube-nocookie.com";
    readonly rendererType: "youtube";
    player: Player;
    media: HTMLMediaElement;
    youtube: YTPlayer | null;
    videoId: string | null;
    isReady: boolean;
    iframe: HTMLDivElement | null;
    /** Inner mount node passed to `YT.Player` when chromeless crop wrapper is used. */
    private youtubeMount;
    timeUpdateInterval?: ReturnType<typeof setInterval>;
    private endScreenPreempted;
    /** When true, VidPly CC menu drives YouTube in-frame captions via setOption. */
    private embedCaptionBridgeActive;
    private youtubeEmbedCaptionMenu;
    private youtubeEmbedCaptionTracks;
    constructor(player: Player);
    /** origin + widget_referrer for YouTube's embed client-identity checks (iOS). */
    static embedIdentityPlayerVars(): Record<string, string>;
    /**
     * Chromium enforces `Permissions-Policy: autoplay=()`: `playVideo()` from
     * VidPly controls is then silently ignored and only a click inside the
     * iframe starts playback. Only the page's own allowance is checked — the
     * API reports cross-origin frames as blocked even when `allow="autoplay"`
     * delegates it. Firefox has no such API, so `undefined` counts as allowed.
     */
    static isEmbedAutoplayBlockedByPermissionsPolicy(): boolean;
    static applyEmbedReferrerPolicy(youtube: YTPlayer | null): void;
    /**
     * Chromeless mode: VidPly owns keyboard focus. Keep the cross-origin iframe
     * out of the tab order and assistive-tech traversal (YouTube still injects
     * links/overlays inside the frame).
     */
    private applyChromelessEmbedAccessibility;
    private showIosLanFallback;
    private usesProviderChrome;
    init(): Promise<void>;
    private clearEmbedChromeClassesOnInitFailure;
    extractVideoId(url: string): string | null;
    loadYouTubeAPI(): Promise<void>;
    private chromelessEmbedActive;
    private hasSidecarCaptionTracks;
    private unloadInFrameCaptionsModule;
    /**
     * When the embed caption bridge is inactive, unload YouTube's captions module.
     * When active, only clear the active track if VidPly captions are off.
     */
    private syncInFrameCaptionsWithVidPly;
    private syncEmbedCaptionBridgeFromApi;
    private refreshSidecarCaptionControls;
    private syncChromelessHostClasses;
    private applyChromelessIdlePoster;
    private applyYoutubeThumbnailIdlePoster;
    private setYoutubeIdleCover;
    createIframe(): void;
    private youtubePlayerElementId;
    initializePlayer(): Promise<void>;
    /**
     * YouTube paints the end-screen before the ENDED event; stop slightly early and
     * restore the VidPly poster cover (Google does not allow disabling that UI).
     */
    private maybePreemptYoutubeEndScreen;
    attachEvents(): void;
    handleStateChange(event: {
        data: number;
    }): void;
    handleError(event: {
        data: 2 | 5 | 100 | 101 | 150;
    }): void;
    /**
     * Switch to another YouTube video without recreating the iframe player.
     * Used by playlist track changes when the renderer type stays `youtube`.
     */
    loadSource(src: string): void;
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
//# sourceMappingURL=YouTubeRenderer.d.ts.map