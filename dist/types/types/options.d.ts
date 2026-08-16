import type { Player } from '../core/Player.js';
export interface KeyboardShortcuts {
    'play-pause'?: string[];
    'volume-up'?: string[];
    'volume-down'?: string[];
    'seek-forward'?: string[];
    'seek-backward'?: string[];
    'mute'?: string[];
    'fullscreen'?: string[];
    'captions'?: string[];
    'caption-style-menu'?: string[];
    'speed-up'?: string[];
    'speed-down'?: string[];
    'speed-menu'?: string[];
    'quality-menu'?: string[];
    'chapters-menu'?: string[];
    'transcript-toggle'?: string[];
    'help'?: string[];
}
export interface PlayerOptions {
    width: number | string | null;
    height: number | string | null;
    poster: string | null;
    responsive: boolean;
    fillContainer: boolean;
    /** Render `.vidply-track-info` for standalone players; playlists use their own header. */
    showTrackInfo: boolean;
    mediaType?: 'video' | 'audio';
    title?: string | null;
    artist?: string | null;
    album?: string | null;
    /** Short plain-text summary shown in the track-info header. */
    description?: string | null;
    /** RTE HTML for the collapsible long description in the track-info header. */
    longDescription?: string | null;
    /** Preformatted, already localised publish date for the track-info header. */
    date?: string | null;
    episodeNumber?: string | null;
    mediaSession: boolean;
    autoplay: boolean;
    loop: boolean;
    muted: boolean;
    volume: number;
    playbackSpeed: number;
    preload: 'none' | 'metadata' | 'auto';
    initialDuration: number;
    deferLoad: boolean;
    requirePlaybackForAccessibilityToggles: boolean;
    startTime: number;
    playsInline: boolean;
    controls: boolean;
    hideControlsDelay: number;
    playPauseButton: boolean;
    /**
     * Centered play button on top of the media.
     *
     *   'auto'  — (default) video only, matching the historic behaviour.
     *   true    — also render it for audio players, on top of the track
     *             artwork. Useful for podcast/episode presentations.
     *   false   — never render it.
     *
     * On audio the overlay is a real `<button>` (the audio element itself is
     * not a click target), so it is keyboard operable and labelled via i18n.
     */
    playButtonOverlay: boolean | 'auto';
    progressBar: boolean;
    currentTime: boolean;
    duration: boolean;
    volumeControl: boolean;
    muteButton: boolean;
    chaptersButton: boolean;
    qualityButton: boolean;
    captionStyleButton: boolean;
    speedButton: boolean;
    hideSpeedForHls: boolean;
    hideSpeedForHlsVideo: boolean;
    hideSpeedForDash: boolean;
    hideSpeedForDashVideo: boolean;
    captionsButton: boolean;
    transcriptButton: boolean;
    fullscreenButton: boolean;
    pipButton: boolean;
    floating: boolean;
    floatingPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    floatingMinViewportWidth: number;
    downloadButton: boolean;
    downloadUrl: string | null;
    downloadFormat: string | null;
    downloadFileSize: number | null;
    downloadFetchSize: boolean;
    playlistToggleButton?: boolean;
    helpButton: boolean;
    seekInterval: number;
    seekIntervalLarge: number;
    captions: boolean;
    captionsDefault: boolean;
    captionsFontSize: string;
    captionsFontFamily: string;
    captionsColor: string;
    captionsBackgroundColor: string;
    captionsOpacity: number;
    audioDescription: boolean;
    audioDescriptionSrc: string | null;
    audioDescriptionButton: boolean;
    audioDescriptionMode: 'auto' | 'swap' | 'vtt_speech';
    audioDescriptionSpeech: boolean;
    audioDescriptionExtended: boolean;
    signLanguage: boolean;
    signLanguageSrc: string | null;
    signLanguageButton: boolean;
    signLanguagePosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    signLanguageDisplayMode: 'pip' | 'main' | 'both';
    signLanguageSources?: Record<string, string>;
    transcript: boolean;
    transcriptPosition: string;
    transcriptContainer: HTMLElement | string | null;
    keyboard: boolean;
    keyboardShortcuts: KeyboardShortcuts;
    ariaLabels: Record<string, string>;
    screenReaderAnnouncements: boolean;
    highContrast: boolean;
    focusHighlight: boolean;
    metadataAlerts: Record<string, unknown>;
    metadataHashtags: Record<string, unknown>;
    language: string;
    languages: string[];
    languageFiles?: Record<string, string>;
    languageFile?: string;
    languageFileUrl?: string;
    resumePlayback: boolean;
    resumeThreshold: number;
    resumePrompt: boolean;
    thumbnailPreview: boolean;
    thumbnailCacheSize: number;
    thumbnailPregenerate: boolean;
    thumbnailInterval: number;
    thumbnailWidth: number;
    thumbnailHeight: number;
    thumbnailQuality: number;
    lazyInit: boolean;
    lazyMargin: string;
    theme: 'dark' | 'light' | 'minimal' | 'high-contrast';
    themeVariables: Record<string, string>;
    hlsScriptUrl?: string;
    hlsScriptIntegrity?: string;
    dashScriptUrl?: string;
    dashScriptIntegrity?: string;
    /**
     * Controls how metadata-cue directives (FOCUS:..., #hashtag) drive DOM
     * side effects (focus() and metadata alerts). Opt-in — DOM mutation is
     * disabled by default to keep cue-driven side effects from being a
     * vector for caption-source authors.
     *
     *   false       — (default) emit `metadata:focus` / `metadata:hashtags`
     *                 events, but never call .focus() or open alerts. Safe.
     *   'container' — perform DOM side effects, but resolve selectors only
     *                 against descendants of the player container.
     *   true | 'global' — legacy behavior: resolve selectors against the
     *                 entire document. Useful for cross-page deep linking,
     *                 but accepts content authors as trusted.
     */
    metadataDirectives?: boolean | 'container' | 'global';
    debug: boolean;
    classPrefix: string;
    iconType: string;
    pauseOthersOnPlay: boolean;
    onReady: ((this: Player) => void) | null;
    onPlay: ((this: Player) => void) | null;
    onPause: ((this: Player) => void) | null;
    onEnded: ((this: Player) => void) | null;
    onTimeUpdate: ((this: Player, time: number) => void) | null;
    onVolumeChange: ((this: Player, volume: number) => void) | null;
    onError: ((this: Player, error: unknown) => void) | null;
}
//# sourceMappingURL=options.d.ts.map