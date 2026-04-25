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
}
