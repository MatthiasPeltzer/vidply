/**
 * Unit Tests: PlaylistManager
 * Tests playlist functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaylistManager } from '../../src/features/PlaylistManager.js';

// Mock dependencies
vi.mock('../../src/utils/DOMUtils.js', () => ({
  DOMUtils: {
    createElement: vi.fn((tag, options = {}) => {
      const el = document.createElement(tag);
      if (options.className) el.className = options.className;
      if (options.textContent) el.textContent = options.textContent;
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            el.setAttribute(key, String(value));
          }
        });
      }
      return el;
    }),
    escapeHTML: vi.fn((str) => str.replace(/[&<>"']/g, ''))
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createIconElement: vi.fn((iconName) => {
    const span = document.createElement('span');
    span.className = `icon-${iconName}`;
    return span;
  })
}));

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key, params = {}) => {
      const templates = {
        'playlist.title': 'Playlist',
        'playlist.untitled': 'Untitled',
        'playlist.trackUntitled': `Track ${params.number || ''}`,
        'playlist.trackOf': `${params.current || ''} of ${params.total || ''}`,
        'playlist.by': ' by ',
        'playlist.nowPlaying': `Now playing ${params.current || ''} of ${params.total || ''}: ${params.title || ''}${params.artist || ''}`,
        'playlist.keyboardInstructions': 'Use arrow keys to navigate'
      };
      return templates[key] || key;
    })
  }
}));

vi.mock('../../src/utils/TimeUtils.js', () => ({
  TimeUtils: {
    formatTime: vi.fn((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }),
    formatDuration: vi.fn((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins} minutes, ${secs} seconds`;
    })
  }
}));

describe('PlaylistManager', () => {
  let manager;
  let mockPlayer;
  let container;

  const mockTracks = [
    { src: 'track1.mp3', title: 'Track 1', artist: 'Artist 1', duration: 180 },
    { src: 'track2.mp3', title: 'Track 2', artist: 'Artist 2', duration: 240 },
    { src: 'track3.mp3', title: 'Track 3', artist: 'Artist 3', duration: 200 }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    
    container = document.createElement('div');
    document.body.appendChild(container);

    mockPlayer = {
      element: document.createElement('video'),
      container,
      videoWrapper: document.createElement('div'),
      controlBar: {
        element: document.createElement('div'),
        controls: {},
        createControls: vi.fn(),
        attachEvents: vi.fn(),
        setupAutoHide: vi.fn()
      },
      options: {
        deferLoad: false
      },
      state: {
        duration: 0,
        currentTime: 0,
        playing: false,
        paused: true,
        fullscreen: false,
        audioDescriptionEnabled: false
      },
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      load: vi.fn().mockResolvedValue(undefined),
      play: vi.fn(),
      pause: vi.fn(),
      playlistManager: null,
      ensureLoaded: vi.fn(),
      updateControlBar: vi.fn(),
      invalidateTrackCache: vi.fn()
    };

    container.appendChild(mockPlayer.element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      manager = new PlaylistManager(mockPlayer);
      expect(manager.player).toBe(mockPlayer);
    });

    it('should initialize empty tracks array', () => {
      manager = new PlaylistManager(mockPlayer);
      expect(manager.tracks).toEqual([]);
    });

    it('should initialize currentIndex to -1', () => {
      manager = new PlaylistManager(mockPlayer);
      expect(manager.currentIndex).toBe(-1);
    });

    it('should set default options', () => {
      manager = new PlaylistManager(mockPlayer);
      
      expect(manager.options.autoAdvance).toBe(true);
      expect(manager.options.autoPlayFirst).toBe(true);
      expect(manager.options.loop).toBe(false);
      expect(manager.options.showPanel).toBe(true);
    });

    it('should accept custom options', () => {
      manager = new PlaylistManager(mockPlayer, {
        autoAdvance: false,
        loop: true
      });
      
      expect(manager.options.autoAdvance).toBe(false);
      expect(manager.options.loop).toBe(true);
    });

    it('should register with player', () => {
      manager = new PlaylistManager(mockPlayer);
      expect(mockPlayer.playlistManager).toBe(manager);
    });

    it('should attach event listeners', () => {
      manager = new PlaylistManager(mockPlayer);
      
      expect(mockPlayer.on).toHaveBeenCalledWith('ended', expect.any(Function));
      expect(mockPlayer.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should load tracks if provided in options', () => {
      manager = new PlaylistManager(mockPlayer, { tracks: mockTracks });
      
      expect(manager.tracks).toEqual(mockTracks);
    });
  });

  describe('getTrackMediaType', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer);
    });

    it('should detect YouTube URLs', () => {
      expect(manager.getTrackMediaType({ src: 'https://youtube.com/watch?v=123' })).toBe('youtube');
      expect(manager.getTrackMediaType({ src: 'https://youtu.be/123' })).toBe('youtube');
    });

    it('should detect Vimeo URLs', () => {
      expect(manager.getTrackMediaType({ src: 'https://vimeo.com/123456' })).toBe('vimeo');
    });

    it('should detect SoundCloud URLs', () => {
      expect(manager.getTrackMediaType({ src: 'https://soundcloud.com/artist/track' })).toBe('soundcloud');
      expect(manager.getTrackMediaType({ src: 'https://api.soundcloud.com/tracks/123' })).toBe('soundcloud');
    });

    it('should detect HLS URLs', () => {
      expect(manager.getTrackMediaType({ src: 'https://example.com/stream.m3u8' })).toBe('hls');
    });

    it('should detect audio type from MIME type', () => {
      expect(manager.getTrackMediaType({ src: 'song.mp3', type: 'audio/mpeg' })).toBe('audio');
    });

    it('should default to video', () => {
      expect(manager.getTrackMediaType({ src: 'video.mp4' })).toBe('video');
    });
  });

  describe('loadPlaylist', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
    });

    it('should store tracks', () => {
      manager.loadPlaylist(mockTracks);
      expect(manager.tracks).toEqual(mockTracks);
    });

    it('should update currentIndex after loading first track', () => {
      manager.currentIndex = 2;
      manager.loadPlaylist(mockTracks);
      // loadPlaylist calls loadTrack(0) which sets currentIndex to 0
      expect(manager.currentIndex).toBe(0);
    });

    it('should add playlist class to container', () => {
      manager.loadPlaylist(mockTracks);
      expect(container.classList.contains('vidply-has-playlist')).toBe(true);
    });

    it('should auto-play first track when enabled', () => {
      manager.options.autoPlayFirst = true;
      const playSpy = vi.spyOn(manager, 'play');
      
      manager.loadPlaylist(mockTracks);
      
      expect(playSpy).toHaveBeenCalledWith(0);
    });

    it('should load first track without playing when autoPlayFirst is false', () => {
      const loadTrackSpy = vi.spyOn(manager, 'loadTrack');
      
      manager.loadPlaylist(mockTracks);
      
      expect(loadTrackSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('play', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
    });

    it('should update currentIndex', async () => {
      await manager.play(1);
      vi.advanceTimersByTime(200);
      expect(manager.currentIndex).toBe(1);
    });

    it('should load track into player', async () => {
      await manager.play(1);
      
      expect(mockPlayer.load).toHaveBeenCalledWith(expect.objectContaining({
        src: 'track2.mp3'
      }));
    });

    it('should emit playlisttrackchange event', async () => {
      await manager.play(0);
      
      expect(mockPlayer.emit).toHaveBeenCalledWith('playlisttrackchange', expect.objectContaining({
        index: 0,
        total: 3
      }));
    });

    it('should call player.play after load completes', async () => {
      await manager.play(0);

      expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    });

    it('should load embed tracks only once when init outlasts the old autoplay delay', async () => {
      let resolveLoad;
      mockPlayer.load.mockImplementation(
        () => new Promise((resolve) => {
          resolveLoad = resolve;
        })
      );

      const playPromise = manager.play(1);
      vi.advanceTimersByTime(200);

      expect(mockPlayer.load).toHaveBeenCalledTimes(1);

      resolveLoad();
      await playPromise;

      expect(mockPlayer.load).toHaveBeenCalledTimes(1);
      expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    });

    it('should warn on invalid index', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await manager.play(-1);
      
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should warn on out of range index', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await manager.play(10);
      
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('next', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
      manager.currentIndex = 0;
    });

    it('should play next track', () => {
      const playSpy = vi.spyOn(manager, 'play');
      
      manager.next();
      
      expect(playSpy).toHaveBeenCalledWith(1);
    });

    it('should not advance past last track without loop', () => {
      manager.currentIndex = 2;
      const playSpy = vi.spyOn(manager, 'play');
      
      manager.next();
      
      expect(playSpy).not.toHaveBeenCalled();
    });

    it('should loop to first track when loop enabled', () => {
      manager.options.loop = true;
      manager.currentIndex = 2;
      const playSpy = vi.spyOn(manager, 'play');
      
      manager.next();
      
      expect(playSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('previous', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
      manager.currentIndex = 1;
    });

    it('should play previous track', () => {
      const playSpy = vi.spyOn(manager, 'play');
      
      manager.previous();
      
      expect(playSpy).toHaveBeenCalledWith(0);
    });

    it('should not go before first track without loop', () => {
      manager.currentIndex = 0;
      const playSpy = vi.spyOn(manager, 'play');
      
      manager.previous();
      
      expect(playSpy).not.toHaveBeenCalled();
    });

    it('should loop to last track when loop enabled', () => {
      manager.options.loop = true;
      manager.currentIndex = 0;
      const playSpy = vi.spyOn(manager, 'play');
      
      manager.previous();
      
      expect(playSpy).toHaveBeenCalledWith(2);
    });
  });

  describe('handleTrackEnd', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
      manager.currentIndex = 0;
    });

    it('should auto-advance when enabled', () => {
      const nextSpy = vi.spyOn(manager, 'next');
      
      manager.handleTrackEnd();
      
      expect(nextSpy).toHaveBeenCalled();
    });

    it('should not auto-advance when disabled', () => {
      manager.options.autoAdvance = false;
      const nextSpy = vi.spyOn(manager, 'next');
      
      manager.handleTrackEnd();
      
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should not advance when already changing tracks', () => {
      manager.isChangingTrack = true;
      const nextSpy = vi.spyOn(manager, 'next');
      
      manager.handleTrackEnd();
      
      expect(nextSpy).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentTrack', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
    });

    it('should return current track', () => {
      manager.currentIndex = 1;
      
      const track = manager.getCurrentTrack();
      
      expect(track).toEqual(mockTracks[1]);
    });

    it('should return null when no track selected', () => {
      manager.currentIndex = -1;
      
      const track = manager.getCurrentTrack();
      
      expect(track).toBeNull();
    });
  });

  describe('getPlaylistInfo', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
      manager.currentIndex = 1;
    });

    it('should return playlist info', () => {
      const info = manager.getPlaylistInfo();
      
      expect(info.currentIndex).toBe(1);
      expect(info.totalTracks).toBe(3);
      expect(info.currentTrack).toEqual(mockTracks[1]);
      expect(info.hasNext).toBe(true);
      expect(info.hasPrevious).toBe(true);
    });
  });

  describe('hasNext', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
    });

    it('should return true when not at last track', () => {
      manager.currentIndex = 0;
      expect(manager.hasNext()).toBe(true);
    });

    it('should return false at last track without loop', () => {
      manager.currentIndex = 2;
      expect(manager.hasNext()).toBe(false);
    });

    it('should return true at last track with loop', () => {
      manager.options.loop = true;
      manager.currentIndex = 2;
      expect(manager.hasNext()).toBe(true);
    });
  });

  describe('hasPrevious', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = mockTracks;
    });

    it('should return true when not at first track', () => {
      manager.currentIndex = 1;
      expect(manager.hasPrevious()).toBe(true);
    });

    it('should return false at first track without loop', () => {
      manager.currentIndex = 0;
      expect(manager.hasPrevious()).toBe(false);
    });

    it('should return true at first track with loop', () => {
      manager.options.loop = true;
      manager.currentIndex = 0;
      expect(manager.hasPrevious()).toBe(true);
    });
  });

  describe('addTrack', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = [...mockTracks];
    });

    it('should add track to playlist', () => {
      const newTrack = { src: 'new.mp3', title: 'New Track' };
      
      manager.addTrack(newTrack);
      
      expect(manager.tracks).toHaveLength(4);
      expect(manager.tracks[3]).toEqual(newTrack);
    });
  });

  describe('removeTrack', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = [...mockTracks];
    });

    it('should remove track at index', () => {
      manager.removeTrack(1);
      
      expect(manager.tracks).toHaveLength(2);
      expect(manager.tracks[1].title).toBe('Track 3');
    });

    it('should adjust currentIndex when removing before current', () => {
      manager.currentIndex = 2;
      
      manager.removeTrack(0);
      
      expect(manager.currentIndex).toBe(1);
    });

    it('should ignore invalid index', () => {
      manager.removeTrack(-1);
      expect(manager.tracks).toHaveLength(3);
      
      manager.removeTrack(10);
      expect(manager.tracks).toHaveLength(3);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
      manager.tracks = [...mockTracks];
      manager.currentIndex = 1;
    });

    it('should clear tracks', () => {
      manager.clear();
      expect(manager.tracks).toEqual([]);
    });

    it('should reset currentIndex', () => {
      manager.clear();
      expect(manager.currentIndex).toBe(-1);
    });
  });

  describe('togglePanel', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { showPanel: true });
      manager.playlistPanel = document.createElement('div');
      manager.playlistPanel.style.display = 'none';
      container.appendChild(manager.playlistPanel);
    });

    it('should show panel when hidden', () => {
      manager.togglePanel();
      
      expect(manager.playlistPanel.style.display).toBe('block');
      expect(manager.isPanelVisible).toBe(true);
    });

    it('should hide panel when shown', () => {
      manager.playlistPanel.style.display = 'block';
      manager.isPanelVisible = true;
      
      manager.togglePanel();
      
      expect(manager.playlistPanel.style.display).toBe('none');
      expect(manager.isPanelVisible).toBe(false);
    });

    it('should force show with true parameter', () => {
      manager.togglePanel(true);
      
      expect(manager.playlistPanel.style.display).toBe('block');
    });

    it('should force hide with false parameter', () => {
      manager.playlistPanel.style.display = 'block';
      
      manager.togglePanel(false);
      
      expect(manager.playlistPanel.style.display).toBe('none');
    });

    it('should return false when no panel', () => {
      manager.playlistPanel = null;
      
      const result = manager.togglePanel();
      
      expect(result).toBe(false);
    });
  });

  describe('showPanel', () => {
    it('should call togglePanel with true', () => {
      manager = new PlaylistManager(mockPlayer, { showPanel: true });
      manager.playlistPanel = document.createElement('div');
      const toggleSpy = vi.spyOn(manager, 'togglePanel');
      
      manager.showPanel();
      
      expect(toggleSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('hidePanel', () => {
    it('should call togglePanel with false', () => {
      manager = new PlaylistManager(mockPlayer, { showPanel: true });
      manager.playlistPanel = document.createElement('div');
      const toggleSpy = vi.spyOn(manager, 'togglePanel');
      
      manager.hidePanel();
      
      expect(toggleSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('isExternalRendererUrl', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
    });

    it('should detect YouTube URLs', () => {
      expect(manager.isExternalRendererUrl('https://youtube.com/watch?v=123')).toBe(true);
      expect(manager.isExternalRendererUrl('https://youtu.be/123')).toBe(true);
    });

    it('should detect Vimeo URLs', () => {
      expect(manager.isExternalRendererUrl('https://vimeo.com/123')).toBe(true);
    });

    it('should detect SoundCloud URLs', () => {
      expect(manager.isExternalRendererUrl('https://soundcloud.com/artist/track')).toBe(true);
    });

    it('should detect HLS URLs', () => {
      expect(manager.isExternalRendererUrl('https://example.com/stream.m3u8')).toBe(true);
    });

    it('should return false for regular URLs', () => {
      expect(manager.isExternalRendererUrl('https://example.com/video.mp4')).toBe(false);
    });

    it('should return false for empty URL', () => {
      expect(manager.isExternalRendererUrl('')).toBe(false);
      expect(manager.isExternalRendererUrl(null)).toBe(false);
    });
  });

  describe('getEffectiveDuration', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { autoPlayFirst: false });
    });

    it('should return regular duration when AD is disabled', () => {
      const track = { duration: 180 };
      
      const duration = manager.getEffectiveDuration(track);
      
      expect(duration).toBe(180);
    });

    it('should return AD duration when AD is enabled and available', () => {
      mockPlayer.state.audioDescriptionEnabled = true;
      const track = { duration: 180, audioDescriptionDuration: 200 };
      
      const duration = manager.getEffectiveDuration(track);
      
      expect(duration).toBe(200);
    });

    it('should return regular duration when AD enabled but no AD duration', () => {
      mockPlayer.state.audioDescriptionEnabled = true;
      const track = { duration: 180 };
      
      const duration = manager.getEffectiveDuration(track);
      
      expect(duration).toBe(180);
    });

    it('should return null for track without duration', () => {
      const track = { src: 'test.mp3' };
      
      const duration = manager.getEffectiveDuration(track);
      
      expect(duration).toBeNull();
    });

    it('should return null for null track', () => {
      const duration = manager.getEffectiveDuration(null);
      expect(duration).toBeNull();
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer, { showPanel: true });
      manager.tracks = mockTracks;
    });

    it('should remove event listeners', () => {
      manager.destroy();
      
      expect(mockPlayer.off).toHaveBeenCalledWith('ended', expect.any(Function));
      expect(mockPlayer.off).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should remove UI elements', () => {
      manager.trackInfoElement = document.createElement('div');
      container.appendChild(manager.trackInfoElement);
      
      manager.destroy();
      
      expect(manager.tracks).toEqual([]);
    });

    it('should call clear', () => {
      const clearSpy = vi.spyOn(manager, 'clear');
      
      manager.destroy();
      
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('track date', () => {
    beforeEach(() => {
      manager = new PlaylistManager(mockPlayer);
      manager.tracks = mockTracks;
    });

    it('should render the preformatted date in a playlist row', () => {
      const item = manager.createPlaylistItem(
        { src: 'track1.mp3', title: 'Episode 11', date: '18. Mai 2021' },
        0
      );
      
      const date = item.querySelector('.vidply-playlist-item-date');
      expect(date).not.toBeNull();
      expect(date.textContent).toBe('18. Mai 2021');
    });

    it('should omit the date element when no date is set', () => {
      const item = manager.createPlaylistItem({ src: 'track1.mp3', title: 'Episode 11' }, 0);
      
      expect(item.querySelector('.vidply-playlist-item-date')).toBeNull();
    });

    it('should announce the date in the row label', () => {
      const item = manager.createPlaylistItem(
        { src: 'track1.mp3', title: 'Episode 11', duration: 180, date: '18. Mai 2021' },
        0
      );
      
      const label = item.querySelector('.vidply-playlist-item-button').getAttribute('aria-label');
      expect(label).toContain('18. Mai 2021');
      expect(label).toContain('3 minutes, 0 seconds');
    });

    it('should render the date in the track info panel', () => {
      manager.trackInfoElement = document.createElement('div');
      manager.currentIndex = 0;
      
      manager.updateTrackInfo({ src: 'track1.mp3', title: 'Episode 11', date: '18. Mai 2021' });
      
      const date = manager.trackInfoElement.querySelector('.vidply-track-date');
      expect(date).not.toBeNull();
      expect(date.textContent).toBe('18. Mai 2021');
    });
  });
});
