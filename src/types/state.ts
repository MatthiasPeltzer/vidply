export interface PlayerState {
  ready: boolean;
  playing: boolean;
  paused: boolean;
  ended: boolean;
  buffering: boolean;
  seeking: boolean;
  hasStartedPlayback: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  fullscreen: boolean;
  pip: boolean;
  floating: null | 'pinned' | 'auto';
  captionsEnabled: boolean;
  currentCaption: string | null;
  controlsVisible: boolean;
  audioDescriptionEnabled: boolean;
  signLanguageEnabled: boolean;
  signLanguageInMainView: boolean;
  resumePromptVisible: boolean;
  /** True when the current source is a live (or live-DVR) stream. */
  isLive: boolean;
  /** True when playback is more than {@link PlayerOptions.liveBehindThreshold} behind the live edge. */
  behindLive: boolean;
  /** Current live edge in seconds, or null when unknown. */
  liveEdge: number | null;
}
