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
