/**
 * Public payload for the `playlisttrackchange` event. Mirrors what
 * `PlaylistManager` actually emits at runtime so consumers can rely on
 * the index/total/item triple.
 */
export interface PlaylistTrack {
    src?: string;
    title?: string;
    artist?: string;
    poster?: string;
    duration?: number;
    /**
     * Publish date of the track, as a **preformatted, already localised
     * string** (e.g. "18. Mai 2021"). The player renders it verbatim — the
     * host application knows the content language, the library does not.
     */
    date?: string;
    type?: string;
    /**
     * File the download button offers while this track is selected. Set it on
     * every downloadable track — as soon as one track carries it, the button
     * follows the playlist instead of the player's `downloadUrl` option.
     */
    downloadUrl?: string;
    /** Format shown in the download label, e.g. "MP3". Inferred from `type` or the URL when omitted. */
    downloadFormat?: string;
    /** Size of `downloadUrl` in bytes. Skips the HEAD request the button would otherwise send. */
    downloadFileSize?: number;
    captions?: Array<{
        src: string;
        lang: string;
        label?: string;
        default?: boolean;
    }>;
    audioDescription?: string;
    signLanguage?: string;
    signLanguageSources?: Record<string, string>;
    [key: string]: unknown;
}
/**
 * Reason the player entered/left the floating ("own PiP") mode.
 *  - 'pinned' — explicitly toggled by the user via the PiP button.
 *  - 'auto'   — auto-floated because the player scrolled out of view.
 *  - null     — floating was disabled / player returned to its slot.
 */
export type FloatingChangeDetail = 'pinned' | 'auto' | null;
export interface PlayerEventMap {
    ready: void;
    play: void;
    playing: void;
    pause: void;
    ended: void;
    waiting: void;
    canplay: void;
    seeking: void;
    seeked: void;
    timeupdate: number;
    durationchange: number;
    ratechange: number;
    loadedmetadata: void;
    progress: TimeRanges | number;
    volumechange: number | void;
    playbackspeedchange: number;
    sourcechange: Record<string, unknown>;
    qualitychange: {
        quality: string;
        index: number;
    };
    fullscreenchange: boolean;
    enterfullscreen: void;
    exitfullscreen: void;
    pipchange: boolean;
    /** Floating ("own PiP") player toggled. */
    floatingchange: FloatingChangeDetail;
    captionsenabled: TextTrack;
    captionsdisabled: void;
    captionchange: VTTCue;
    captionschange: void;
    textcuesupdate: void;
    themechange: {
        theme: string;
        previousTheme?: string;
    };
    resumepromptshow: {
        savedTime: number;
    };
    resumeprompthide: void;
    settingsopen: void;
    settingsclose: void;
    keyboardhelpopen: void;
    keyboardhelpclose: void;
    audiodescriptionenabled: void;
    audiodescriptiondisabled: void;
    audiodescriptioncuestart: {
        time: number;
        endTime: number;
        text: string;
        cue: TextTrackCue;
    };
    audiodescriptioncueend: {
        time: number;
        endTime: number;
        text: string;
        cue: TextTrackCue;
    };
    signlanguageenabled: void;
    signlanguagedisabled: void;
    signlanguageinmainviewenabled: void;
    signlanguageinmainviewdisabled: void;
    signlanguagelanguagechanged: string;
    playlisttrackchange: {
        index: number;
        item: PlaylistTrack;
        total: number;
        previousIndex?: number;
    };
    playlisttrackselect: {
        index: number;
        item: PlaylistTrack;
    };
    metadata: {
        type: string;
        data: unknown;
    };
    'metadata:pause': {
        time: number;
        text: string;
    };
    'metadata:focus': {
        selector: string;
        options?: Record<string, unknown>;
    };
    'metadata:hashtags': {
        hashtags: string[];
        time?: number;
    };
    error: {
        code: number;
        message: string;
        details?: unknown;
    } | unknown;
    hlsmanifestparsed: unknown;
    hlslevelswitched: unknown;
    hlssubtitletracksupdated: unknown;
    hlssubtitletrackswitch: unknown;
    dashmanifestloaded: unknown;
    dashqualitychanged: unknown;
    dashsubtitletracksupdated: {
        tracks: unknown[];
    };
    dashstreaminitialized: void;
    dashmanifestparsed: {
        qualities: unknown[];
    };
}
//# sourceMappingURL=events.d.ts.map