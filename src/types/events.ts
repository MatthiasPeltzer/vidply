export interface PlayerEventMap {
  [key: string]: any;

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
  progress: TimeRanges;
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

  // Sign language
  signlanguageenabled: void;
  signlanguagedisabled: void;
  signlanguageinmainviewenabled: void;
  signlanguageinmainviewdisabled: void;
  signlanguagelanguagechanged: string;

  // Playlist
  playlisttrackchange: { index: number; track: unknown; previousIndex?: number };
  playlisttrackselect: { index: number; track: unknown };

  // Metadata (chapter cues)
  metadata: { type: string; data: unknown };
  'metadata:pause': { time: number; text: string };
  'metadata:focus': { selector: string; options?: Record<string, unknown> };
  'metadata:hashtags': { hashtags: string[]; time?: number };

  // Error
  error: { code: number; message: string; details?: unknown };

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
