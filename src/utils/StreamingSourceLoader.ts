/**
 * Plays a URL on a secondary `<video>` (the sign-language overlay) whatever
 * its format: progressive files and native HLS (Safari) through `src`, HLS
 * elsewhere through hls.js, DASH through dash.js. When the stream cannot be
 * played (no MSE, library blocked, fatal error) the optional progressive
 * fallback is used instead.
 *
 * Deliberately small: no captions, quality menu or live handling; the main
 * player's renderers cover that.
 */
import { classifyRendererType } from './RendererType.js';
import { canPlayNativeHls } from './PerformanceUtils.js';
import {
  loadDashLibrary,
  loadHlsLibrary,
  type StreamingLibraryOptions
} from './StreamingLibraries.js';

/** `play()` without an unhandled rejection when autoplay is refused. */
export function playQuietly(media: HTMLMediaElement): void {
  const result = media.play() as Promise<void> | undefined;
  if (result && typeof result.catch === 'function') {
    result.catch(() => {});
  }
}

export interface StreamingSourceLoaderOptions extends StreamingLibraryOptions {
  log?: (message: string, level?: 'log' | 'warn') => void;
}

export class StreamingSourceLoader {
  readonly media: HTMLVideoElement;
  private readonly options: StreamingSourceLoaderOptions;
  private hls: HlsInstance | null = null;
  private dash: DashMediaPlayerInstance | null = null;
  private fallbackSrc: string | null = null;
  private usingFallback = false;
  /** Bumped per load(); async steps of an outdated load() give up. */
  private generation = 0;
  private readonly onMediaError = () => {
    this.useFallback(`media error ${this.media.error?.code ?? ''}`);
  };

  constructor(media: HTMLVideoElement, options: StreamingSourceLoaderOptions = {}) {
    this.media = media;
    this.options = options;
    this.media.addEventListener('error', this.onMediaError);
  }

  /** The library in use for the current source, for tests and debugging. */
  get engine(): 'native' | 'hls.js' | 'dash.js' | 'none' {
    if (this.hls) return 'hls.js';
    if (this.dash) return 'dash.js';
    return this.media.getAttribute('src') ? 'native' : 'none';
  }

  async load(src: string, fallbackSrc: string | null = null): Promise<void> {
    const generation = ++this.generation;
    this.teardownEngines();
    this.fallbackSrc = fallbackSrc && fallbackSrc !== src ? fallbackSrc : null;
    this.usingFallback = false;

    const type = classifyRendererType(src);
    try {
      if (type === 'hls' && !canPlayNativeHls()) {
        await this.attachHls(src, generation);
      } else if (type === 'dash') {
        await this.attachDash(src, generation);
      } else {
        this.media.src = src;
      }
    } catch (error) {
      if (generation === this.generation) {
        this.useFallback(error instanceof Error ? error.message : String(error));
      }
    }
  }

  destroy(): void {
    this.generation++;
    this.teardownEngines();
    this.media.removeEventListener('error', this.onMediaError);
    this.media.removeAttribute('src');
    this.media.load();
  }

  private async attachHls(src: string, generation: number): Promise<void> {
    await loadHlsLibrary(this.options);
    if (generation !== this.generation) return;
    const Hls = window.Hls;
    if (!Hls?.isSupported()) {
      throw new Error('hls.js is not supported in this browser');
    }
    // Small overlay: never fetch renditions wider than the element shows.
    const hls = new Hls({ enableWorker: true, capLevelToPlayerSize: true });
    this.hls = hls;
    hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
      const data = args[1] as HlsErrorData | undefined;
      if (data?.fatal && generation === this.generation) {
        this.useFallback(`HLS ${data.type}: ${data.details}`);
      }
    });
    hls.attachMedia(this.media);
    hls.loadSource(src);
  }

  private async attachDash(src: string, generation: number): Promise<void> {
    await loadDashLibrary(this.options);
    if (generation !== this.generation) return;
    const dashjs = window.dashjs;
    if (!dashjs || typeof window.MediaSource === 'undefined') {
      throw new Error('dash.js is not supported in this browser');
    }
    const dash = dashjs.MediaPlayer().create();
    this.dash = dash;
    dash.updateSettings({
      debug: { logLevel: 1 },
      streaming: { abr: { limitBitrateByPortal: true } }
    });
    dash.on(dashjs.MediaPlayer.events.ERROR, () => {
      if (generation === this.generation) {
        this.useFallback('DASH playback error');
      }
    });
    dash.initialize(this.media, src, false);
  }

  private useFallback(reason: string): void {
    if (this.usingFallback || !this.fallbackSrc) {
      this.options.log?.(`Sign-language video failed: ${reason}`, 'warn');
      return;
    }
    this.options.log?.(
      `Sign-language stream failed (${reason}), using ${this.fallbackSrc}`,
      'warn'
    );
    this.usingFallback = true;
    const time = this.media.currentTime;
    const wasPlaying = !this.media.paused;
    this.teardownEngines();
    this.media.src = this.fallbackSrc;
    if (time > 0) {
      this.media.currentTime = time;
    }
    if (wasPlaying) {
      playQuietly(this.media);
    }
  }

  private teardownEngines(): void {
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch {
        // already torn down
      }
      this.hls = null;
    }
    if (this.dash) {
      try {
        this.dash.reset();
      } catch {
        // already torn down
      }
      this.dash = null;
    }
  }
}
