import type { Player } from '../core/Player.js';

export interface QualityLevel {
  name: string;
  src?: string;
  bitrate?: number;
  height?: number;
  width?: number;
  index?: number;
}

/**
 * Stable, minification-safe identifier for each renderer implementation.
 * Prefer this over `renderer.constructor.name`, which is mangled in
 * production builds (e.g. `class s`) and breaks runtime type checks.
 */
export type RendererType =
  | 'html5'
  | 'hls'
  | 'dash'
  | 'youtube'
  | 'vimeo'
  | 'soundcloud';

export interface Renderer {
  player: Player;
  media: HTMLMediaElement;

  /**
   * Stable renderer identifier that survives minification. Used by the
   * Player to decide whether a source change requires swapping renderers.
   */
  readonly rendererType: RendererType;

  /** Streaming engines, present on HLS / DASH renderers. */
  hls?: HlsInstance | null;
  dash?: DashMediaPlayerInstance | null;

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
  /**
   * Switch to a new source URL without tearing down the embed when the
   * renderer type stays the same (e.g. YouTube → YouTube in a playlist).
   */
  loadSource?(src: string): void | Promise<void>;
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
