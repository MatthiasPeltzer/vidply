/**
 * Media Session API integration.
 *
 * Wires the player into `navigator.mediaSession` so the OS shows
 * now-playing metadata (title / artist / album / artwork) and routes
 * hardware/lock-screen/notification controls (play, pause, stop, seek,
 * and previous/next track for playlists) back into the player.
 *
 * Everything is feature-detected and wrapped in try/catch: unsupported
 * browsers and unsupported individual actions degrade silently.
 */

import type { Player } from './Player.js';

interface PlaylistLikeTrack {
  title?: string;
  artist?: string;
  poster?: string;
}

const POSITION_THROTTLE_MS = 1000;

/**
 * `navigator.mediaSession` is a single, global object shared by the whole
 * document, but a page can host several VidPly players at once (common in a
 * CMS). Only one of them may own the session at a time, otherwise the OS
 * controls would be wired to a player the user isn't actually listening to
 * (clicking play/pause/next then appears to "do nothing").
 *
 * We track the owning manager here and follow the browser convention: the
 * player that most recently started playing claims the session. Background
 * players never touch the global session, and a player only releases it on
 * destroy if it still owns it.
 */
let activeManager: MediaSessionManager | null = null;

function setActiveManager(manager: MediaSessionManager): void {
  activeManager = manager;
}

export class MediaSessionManager {
  player: Player;
  private supported: boolean;
  private handlers: Partial<Record<string, () => void>> = {};
  private boundActions: string[] = [];
  private lastPositionUpdate = 0;

  constructor(player: Player) {
    this.player = player;
    this.supported =
      typeof navigator !== 'undefined' && 'mediaSession' in navigator;

    if (!this.supported) return;

    this.attachEvents();

    // Claim the session up front only when no other player owns it yet (i.e.
    // we're the first/only player on the page). When other players already
    // exist we wait until this one actually starts playing before taking
    // over, so we never hijack a player the user is currently using.
    if (activeManager === null) {
      this.claimSession();
    }
  }

  /** Does this manager currently own the global media session? */
  private isActive(): boolean {
    return activeManager === this;
  }

  /**
   * Take ownership of the global session: (re)register the action handlers so
   * the OS controls drive this player, and refresh metadata/state/position.
   */
  private claimSession(): void {
    if (!this.supported) return;
    setActiveManager(this);
    this.setupActionHandlers();
    this.updateMetadata();
    this.updatePlaybackState();
    this.updatePositionState(true);
  }

  private get session(): MediaSession {
    return navigator.mediaSession;
  }

  private setActionHandler(
    action: MediaSessionAction,
    handler: MediaSessionActionHandler | null
  ): void {
    try {
      this.session.setActionHandler(action, handler);
      if (handler && !this.boundActions.includes(action)) {
        this.boundActions.push(action);
      }
    } catch {
      // Action not supported by this browser - ignore.
    }
  }

  private setupActionHandlers(): void {
    this.setActionHandler('play', () => this.player.play());
    this.setActionHandler('pause', () => this.player.pause());
    this.setActionHandler('stop', () => this.player.stop());

    this.setActionHandler('seekbackward', (details) => {
      this.player.seekBackward(this.offsetFrom(details));
    });
    this.setActionHandler('seekforward', (details) => {
      this.player.seekForward(this.offsetFrom(details));
    });
    this.setActionHandler('seekto', (details) => {
      if (details && typeof details.seekTime === 'number') {
        this.player.seek(details.seekTime);
      }
    });

    this.updateTrackHandlers();
  }

  private offsetFrom(details?: MediaSessionActionDetails): number | undefined {
    const offset = details && typeof details.seekOffset === 'number' ? details.seekOffset : undefined;
    return typeof offset === 'number' && offset > 0 ? offset : undefined;
  }

  /**
   * previous/next track only make sense with a multi-item playlist; bind
   * or clear them whenever the playlist state changes so the OS shows the
   * correct affordances.
   */
  private updateTrackHandlers(): void {
    const pm = this.player.playlistManager;
    const hasPlaylist = Boolean(pm && Array.isArray(pm.tracks) && pm.tracks.length > 1);

    if (hasPlaylist && pm) {
      this.setActionHandler('previoustrack', () => pm.previous());
      this.setActionHandler('nexttrack', () => pm.next());
    } else {
      this.setActionHandler('previoustrack', null);
      this.setActionHandler('nexttrack', null);
    }
  }

  private attachEvents(): void {
    this.handlers = {
      // Starting playback makes this player the session owner, taking over
      // the OS controls from any other player on the page.
      play: () => this.claimSession(),
      pause: () => {
        if (!this.isActive()) return;
        this.updatePlaybackState();
        this.updatePositionState(true);
      },
      ended: () => {
        if (!this.isActive()) return;
        this.updatePlaybackState();
      },
      timeupdate: () => {
        if (!this.isActive()) return;
        this.updatePositionState();
      },
      durationchange: () => {
        if (!this.isActive()) return;
        this.updatePositionState(true);
      },
      ratechange: () => {
        if (!this.isActive()) return;
        this.updatePositionState(true);
      },
      loadedmetadata: () => {
        if (!this.isActive()) return;
        this.updateMetadata();
        this.updatePositionState(true);
      },
      playlisttrackchange: () => {
        if (!this.isActive()) return;
        this.updateMetadata();
        this.updateTrackHandlers();
        this.updatePositionState(true);
      }
    };

    for (const [event, handler] of Object.entries(this.handlers)) {
      if (handler) {
        this.player.on(event as never, handler as never);
      }
    }
  }

  private resolveMetadata(): {
    title: string;
    artist: string;
    album: string;
    poster: string | null;
  } {
    const opts = this.player.options;
    let title = opts.title || '';
    let artist = opts.artist || '';
    const album = opts.album || '';
    let poster = opts.poster || null;

    const pm = this.player.playlistManager;
    if (pm && Array.isArray(pm.tracks) && pm.currentIndex >= 0) {
      const track = pm.tracks[pm.currentIndex] as PlaylistLikeTrack | undefined;
      if (track) {
        if (track.title) title = track.title;
        if (track.artist) artist = track.artist;
        if (track.poster) poster = track.poster;
      }
    }

    if (!title && typeof document !== 'undefined') {
      title = document.title || 'VidPly';
    }

    return { title, artist, album, poster };
  }

  updateMetadata(): void {
    if (!this.supported || typeof window === 'undefined' || typeof window.MediaMetadata === 'undefined') {
      return;
    }

    const { title, artist, album, poster } = this.resolveMetadata();
    const artwork: MediaImage[] = [];

    if (poster) {
      try {
        const src = this.player.resolvePosterPath(poster);
        if (src) {
          artwork.push({ src });
        }
      } catch {
        // Ignore poster resolution failures.
      }
    }

    try {
      this.session.metadata = new window.MediaMetadata({
        title,
        artist,
        album,
        artwork
      });
    } catch {
      // Ignore metadata construction failures.
    }
  }

  updatePlaybackState(): void {
    if (!this.supported) return;
    try {
      this.session.playbackState = this.player.state.playing ? 'playing' : 'paused';
    } catch {
      // Ignore.
    }
  }

  /**
   * Push the current position to the OS scrubber. `timeupdate` fires
   * several times a second, so non-forced updates are throttled.
   */
  updatePositionState(force = false): void {
    if (!this.supported || typeof this.session.setPositionState !== 'function') {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastPositionUpdate < POSITION_THROTTLE_MS) {
      return;
    }
    this.lastPositionUpdate = now;

    const duration = this.player.state.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      // A finite, positive duration is required; clear any stale state
      // (e.g. live streams or before metadata is known).
      try {
        this.session.setPositionState();
      } catch {
        // Ignore.
      }
      return;
    }

    const playbackRate = this.player.state.playbackSpeed || 1;
    const position = Math.min(Math.max(0, this.player.state.currentTime || 0), duration);

    try {
      this.session.setPositionState({
        duration,
        playbackRate: playbackRate > 0 ? playbackRate : 1,
        position
      });
    } catch {
      // Ignore (e.g. position > duration race).
    }
  }

  destroy(): void {
    if (!this.supported) return;

    for (const [event, handler] of Object.entries(this.handlers)) {
      if (handler) {
        this.player.off(event as never, handler as never);
      }
    }
    this.handlers = {};

    // Only tear down the global session if we currently own it; otherwise we
    // would wipe the controls of whichever player is actually playing.
    if (this.isActive()) {
      for (const action of this.boundActions) {
        try {
          this.session.setActionHandler(action as MediaSessionAction, null);
        } catch {
          // Ignore.
        }
      }

      try {
        this.session.metadata = null;
      } catch {
        // Ignore.
      }
      try {
        if (typeof this.session.setPositionState === 'function') {
          this.session.setPositionState();
        }
      } catch {
        // Ignore.
      }
      try {
        this.session.playbackState = 'none';
      } catch {
        // Ignore.
      }

      activeManager = null;
    }

    this.boundActions = [];
  }
}
