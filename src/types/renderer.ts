import type { Player } from '../core/Player.js';

export interface QualityLevel {
  name: string;
  src?: string;
  bitrate?: number;
  height?: number;
  width?: number;
  index?: number;
}

export interface Renderer {
  player: Player;
  media: HTMLMediaElement;

  /** Streaming engines, present on HLS / DASH renderers. */
  hls?: HlsInstance | null;
  dash?: DashMediaPlayerInstance | null;

  /** Internal flags used by deferred loading paths. */
  _didDeferredLoad?: boolean;
  _hlsSourceLoaded?: boolean;
  _dashSourceLoaded?: boolean;

  /**
   * True for renderers that drive playback through Media Source Extensions
   * (dash.js, hls.js). The `<video>` element's `src` is a MediaSource blob
   * URL that must not be copied to a second media element — otherwise Firefox
   * emits a "may not load data from blob:" security warning. UI features such
   * as scrub-bar thumbnail previews consult this flag to avoid cloning the src.
   */
  readonly isStreaming?: boolean;

  init(): Promise<void>;
  play(): void;
  pause(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setPlaybackSpeed(speed: number): void;
  destroy(): void;

  ensureLoaded?(): void;
  getQualities?(): QualityLevel[];
  switchQuality?(index: number): void;
  getCurrentQuality?(): number;
  supportsAutoQuality?(): boolean;
  isAutoQuality?(): boolean;
  handlesOwnCaptions?(): boolean;

  /**
   * Ask the streaming renderer to activate the text track whose language
   * matches `lang`, so segment downloads begin and cues become available.
   * Returns true if the renderer switched, false if no match was found.
   */
  activateTextTrackForLanguage?(lang: string): boolean;

  /**
   * Return absolute URLs for each text track so the transcript can fetch the
   * complete VTT file instead of relying on partial segment-based cues.
   */
  getTextTrackURLs?(): { lang: string; url: string }[];
}
