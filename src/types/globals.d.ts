/* Custom property augmentation for TextTrack */
interface TextTrack {
  _vidplyStale?: boolean;
}

/* Vendor-prefixed fullscreen APIs */
interface HTMLElement {
  webkitRequestFullscreen?(): Promise<void>;
  mozRequestFullScreen?(): Promise<void>;
  msRequestFullscreen?(): Promise<void>;
}

interface Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?(): Promise<void>;
  mozCancelFullScreen?(): Promise<void>;
  msExitFullscreen?(): Promise<void>;
}

interface Navigator {
  msMaxTouchPoints?: number;
}

interface HTMLMediaElement {
  vidply?: unknown;
}

/* Third-party libraries loaded via CDN script injection */

interface HlsConfig {
  enableWorker?: boolean;
  startLevel?: number;
  debug?: boolean;
  [key: string]: unknown;
}

interface HlsLevel {
  height: number;
  width: number;
  bitrate: number;
  name?: string;
  url: string | string[];
}

interface HlsSubtitleTrack {
  id?: number;
  lang?: string;
  language?: string;
  name?: string;
  url?: string;
  type?: string;
  default?: boolean;
}

interface HlsErrorResponse {
  code?: number;
  url?: string;
  text?: string;
}

interface HlsErrorData {
  type: string;
  details: string;
  fatal: boolean;
  response?: HlsErrorResponse;
  url?: string;
  reason?: string;
}

interface HlsInstance {
  loadSource(src: string): void;
  attachMedia(media: HTMLMediaElement): void;
  destroy(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  startLoad(startPosition?: number): void;
  stopLoad(): void;
  recoverMediaError(): void;
  levels: HlsLevel[];
  currentLevel: number;
  loadLevel?: number;
  subtitleTracks: HlsSubtitleTrack[];
  subtitleTrack: number;
}

/**
 * The hls.js event-name constants we consume. Declared as concrete `string`
 * properties (rather than a `Record<string, string>` index signature) so that
 * accessing them under `noUncheckedIndexedAccess` yields `string`, not
 * `string | undefined`.
 */
interface HlsEventsMap {
  MANIFEST_PARSED: string;
  LEVEL_SWITCHED: string;
  SUBTITLE_TRACKS_UPDATED: string;
  SUBTITLE_TRACK_SWITCH: string;
  ERROR: string;
  FRAG_BUFFERED: string;
  SUBTITLE_FRAG_PROCESSED: string;
  CUES_PARSED: string;
  [event: string]: string;
}

interface HlsStatic {
  new (config?: HlsConfig): HlsInstance;
  isSupported(): boolean;
  Events: HlsEventsMap;
  ErrorTypes: Record<string, string>;
}

interface DashMediaPlayer {
  create(): DashMediaPlayerInstance;
}

interface DashRepresentation {
  id?: string;
  height?: number;
  width?: number;
  bandwidth?: number;
  bitrate?: number;
}

interface DashBitrateInfo {
  height?: number;
  width?: number;
  bitrate?: number;
}

interface DashMediaPlayerInstance {
  initialize(view: HTMLMediaElement, url: string | null, autoPlay: boolean): void;
  updateSettings(settings: Record<string, unknown>): void;
  attachSource(url: string): void;
  attachTTMLRenderingDiv(div: HTMLElement): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  destroy(): void;
  reset(): void;
  getBitrateInfoListFor(type: string): DashBitrateInfo[];
  getQualityFor(type: string): number;
  setQualityFor(type: string, value: number, force?: boolean): void;
  setAutoSwitchQualityFor?(type: string, value: boolean): void;
  getAutoSwitchQualityFor?(type: string): boolean;
  getRepresentationsByType?(type: string): DashRepresentation[];
  setRepresentationForTypeByIndex?(type: string, index: number): void;
  getCurrentRepresentationForType?(type: string): DashRepresentation | null | undefined;
  getSettings?(): { streaming?: { abr?: { autoSwitchBitrate?: { video?: boolean; audio?: boolean } } } };
  getManifest?(): unknown;
  getTracksFor(type: string): unknown[];
  setCurrentTrack(track: unknown): void;
  setTextTrack(index: number): void;
  getActiveStream?(): { getStreamInfo?: () => { manifestInfo?: { duration?: number } } };
  time?(): number;
  duration?(): number;
  isPaused?(): boolean;
  isSeeking?(): boolean;
  getVolume?(): number;
  setVolume?(volume: number): void;
  setMute?(muted: boolean): void;
  isMuted?(): boolean;
  seek?(time: number): void;
  play?(): void;
  pause?(): void;
  setPlaybackRate?(rate: number): void;
  getPlaybackRate?(): number;
}

/**
 * The dash.js MediaPlayer event-name constants we consume. Declared as
 * concrete `string` properties (rather than a `Record<string, string>` index
 * signature) so accessing them under `noUncheckedIndexedAccess` yields
 * `string`, not `string | undefined`.
 */
interface DashEventsMap {
  MANIFEST_LOADED: string;
  QUALITY_CHANGE_RENDERED: string;
  TEXT_TRACKS_ADDED: string;
  STREAM_INITIALIZED: string;
  ERROR: string;
  FRAGMENT_LOADING_COMPLETED: string;
  [event: string]: string;
}

interface DashMediaPlayerFactory {
  (): DashMediaPlayer;
  events: DashEventsMap;
}

interface DashJsStatic {
  MediaPlayer: DashMediaPlayerFactory;
}

interface YTPlayerOptions {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: Record<string, unknown>;
  events?: Record<string, (...args: unknown[]) => void>;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTStatic {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

interface VimeoPlayerOptions {
  id?: number;
  url?: string;
  width?: number;
  height?: number;
  autopause?: boolean;
  autoplay?: boolean;
  background?: boolean;
  byline?: boolean;
  color?: string;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  portrait?: boolean;
  responsive?: boolean;
  speed?: boolean;
  title?: boolean;
  transparent?: boolean;
}

interface VimeoPlayer {
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback?: (...args: unknown[]) => void): void;
  play(): Promise<void>;
  pause(): Promise<void>;
  setCurrentTime(seconds: number): Promise<number>;
  setVolume(volume: number): Promise<number>;
  setPlaybackRate(rate: number): Promise<number>;
  getDuration(): Promise<number>;
  getCurrentTime(): Promise<number>;
  getVolume(): Promise<number>;
  destroy(): Promise<void>;
  ready(): Promise<void>;
}

interface VimeoStatic {
  Player: new (element: HTMLElement | string, options?: VimeoPlayerOptions) => VimeoPlayer;
}

interface SCWidgetEvents {
  READY: string;
  PLAY: string;
  PAUSE: string;
  FINISH: string;
  PLAY_PROGRESS: string;
  SEEK: string;
  LOAD_PROGRESS: string;
  ERROR: string;
  [key: string]: string;
}

interface SCWidget {
  bind(event: string, handler: (...args: unknown[]) => void): void;
  unbind(event: string): void;
  play(): void;
  pause(): void;
  seekTo(milliseconds: number): void;
  setVolume(volume: number): void;
  getVolume(callback: (volume: number) => void): void;
  getDuration(callback: (duration: number) => void): void;
  getPosition(callback: (position: number) => void): void;
  isPaused(callback: (paused: boolean) => void): void;
  getCurrentSound(callback: (sound: unknown) => void): void;
  skip(index: number): void;
  load(url: string, options?: Record<string, unknown>): void;
}

interface SCStatic {
  Widget: {
    (iframe: HTMLIFrameElement): SCWidget;
    Events: SCWidgetEvents;
  };
}

interface Window {
  Hls?: HlsStatic;
  dashjs?: DashJsStatic;
  YT?: YTStatic;
  onYouTubeIframeAPIReady?: (() => void) | null;
  Vimeo?: VimeoStatic;
  SC?: SCStatic;
  MSStream?: unknown;
}
