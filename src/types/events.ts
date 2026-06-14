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
  type?: string;
  captions?: Array<{ src: string; lang: string; label?: string; default?: boolean }>;
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
  // Note: an open `[key: string]: any` index signature was deliberately
  // omitted so typos in event names now fail typecheck instead of being
  // silently treated as `any`.

  // Playback
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

  // Source
  sourcechange: Record<string, unknown>;
  qualitychange: { quality: string; index: number };

  // Fullscreen & PiP
  fullscreenchange: boolean;
  enterfullscreen: void;
  exitfullscreen: void;
  pipchange: boolean;
  /** Floating ("own PiP") player toggled. */
  floatingchange: FloatingChangeDetail;

  // Captions
  captionsenabled: TextTrack;
  captionsdisabled: void;
  captionchange: VTTCue;
  captionschange: void;
  textcuesupdate: void;

  // Theme
  themechange: { theme: string; previousTheme?: string };

  // Resume
  resumepromptshow: { savedTime: number };
  resumeprompthide: void;

  // Settings
  settingsopen: void;
  settingsclose: void;

  // Audio description
  audiodescriptionenabled: void;
  audiodescriptiondisabled: void;
  audiodescriptioncuestart: { time: number; endTime: number; text: string; cue: TextTrackCue };
  audiodescriptioncueend: { time: number; endTime: number; text: string; cue: TextTrackCue };

  // Sign language
  signlanguageenabled: void;
  signlanguagedisabled: void;
  signlanguageinmainviewenabled: void;
  signlanguageinmainviewdisabled: void;
  signlanguagelanguagechanged: string;

  // Playlist
  playlisttrackchange: {
    index: number;
    item: PlaylistTrack;
    total: number;
    previousIndex?: number;
  };
  playlisttrackselect: { index: number; item: PlaylistTrack };

  // Metadata (chapter cues)
  metadata: { type: string; data: unknown };
  'metadata:pause': { time: number; text: string };
  'metadata:focus': { selector: string; options?: Record<string, unknown> };
  'metadata:hashtags': { hashtags: string[]; time?: number };

  // Error
  error: { code: number; message: string; details?: unknown } | unknown;

  // HLS-specific
  hlsmanifestparsed: unknown;
  hlslevelswitched: unknown;
  hlssubtitletracksupdated: unknown;
  hlssubtitletrackswitch: unknown;

  // DASH-specific
  dashmanifestloaded: unknown;
  dashqualitychanged: unknown;
  dashsubtitletracksupdated: { tracks: unknown[] };
  dashstreaminitialized: void;
  dashmanifestparsed: { qualities: unknown[] };
}
