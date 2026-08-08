/**
 * Unit Tests: ControlBar download button
 * Covers the target resolution that lets the button follow a playlist track
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ControlBar } from '../../src/controls/ControlBar.js';

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    getLanguage: vi.fn(() => 'en'),
    t: vi.fn((key) => {
      const strings = {
        'player.download': 'Download',
        'player.downloadWithFormat': 'Download {format}',
        'player.downloadWithSize': 'Download ({size})',
        'player.downloadWithFormatSize': 'Download {format} ({size})'
      };
      return strings[key] || key;
    })
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createIconElement: vi.fn(() => document.createElement('span'))
}));

/**
 * The button is created and updated in isolation: `init()` would build the
 * whole bar (and needs a full player), while these tests only care about which
 * file the button offers and how it is labelled.
 */
function createControlBar(player) {
  const controlBar = Object.create(ControlBar.prototype);
  controlBar.player = player;
  controlBar.controls = {};
  controlBar.rightButtons = document.createElement('div');
  controlBar.checkOverflow = vi.fn();
  return controlBar;
}

function createPlayer(options = {}, tracks = null, currentIndex = 0) {
  const element = document.createElement('audio');
  const player = {
    element,
    options: {
      classPrefix: 'vidply',
      downloadButton: true,
      downloadUrl: null,
      downloadFormat: null,
      downloadFileSize: null,
      downloadFetchSize: true,
      ...options
    }
  };

  if (tracks) {
    player.playlistManager = {
      tracks,
      currentIndex,
      getCurrentTrack: () => player.playlistManager.tracks[player.playlistManager.currentIndex] || null
    };
  }

  return player;
}

const episodes = [
  {
    src: 'https://example.com/stream/one.m3u8',
    type: 'application/x-mpegURL',
    downloadUrl: 'https://example.com/files/one.mp3',
    downloadFileSize: 7_340_032
  },
  {
    src: 'https://example.com/files/two.mp3',
    type: 'audio/mpeg',
    downloadUrl: 'https://example.com/files/two.mp3',
    downloadFileSize: 3_145_728
  },
  { src: 'https://example.com/files/three.mp3', type: 'audio/mpeg' }
];

describe('ControlBar download button', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '2097152' }
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe('resolveDownloadTarget', () => {
    it('uses the player option for single media and infers the format', () => {
      const controlBar = createControlBar(createPlayer({ downloadUrl: 'https://example.com/talk.mp4' }));

      expect(controlBar.resolveDownloadTarget()).toEqual({
        url: 'https://example.com/talk.mp4',
        format: 'MP4',
        sizeBytes: null
      });
    });

    it('falls back to the element attribute', () => {
      const player = createPlayer();
      player.element.dataset.vidplyDownloadUrl = 'https://example.com/talk.webm';
      player.element.dataset.vidplyDownloadSize = '4096';

      expect(createControlBar(player).resolveDownloadTarget()).toEqual({
        url: 'https://example.com/talk.webm',
        format: 'WebM',
        sizeBytes: 4096
      });
    });

    it('offers the selected track, not the media element source', () => {
      const controlBar = createControlBar(createPlayer({}, episodes, 0));

      expect(controlBar.resolveDownloadTarget()).toEqual({
        url: 'https://example.com/files/one.mp3',
        format: 'MP3',
        sizeBytes: 7_340_032
      });
    });

    it('offers nothing for a track without a download', () => {
      const controlBar = createControlBar(createPlayer({}, episodes, 2));

      expect(controlBar.resolveDownloadTarget()).toBeNull();
    });

    it('keeps the element-level target for playlists that say nothing about downloads', () => {
      const legacyTracks = [{ src: 'one.mp3' }, { src: 'two.mp3' }];
      const controlBar = createControlBar(
        createPlayer({ downloadUrl: 'https://example.com/album.zip' }, legacyTracks, 1)
      );

      expect(controlBar.resolveDownloadTarget()?.url).toBe('https://example.com/album.zip');
    });
  });

  describe('updateDownloadButton', () => {
    it('creates the button before the fullscreen button and labels format and size', () => {
      const controlBar = createControlBar(createPlayer({}, episodes, 0));
      const fullscreen = document.createElement('button');
      fullscreen.className = 'vidply-fullscreen';
      controlBar.rightButtons.appendChild(fullscreen);

      controlBar.updateDownloadButton();

      const button = controlBar.controls.download;
      expect(button.className).toContain('vidply-download');
      expect(button.nextElementSibling).toBe(fullscreen);
      expect(button.getAttribute('aria-label')).toBe('Download MP3 (7.0 MB)');
      expect(button.dataset.vidplyDownloadUrl).toBe('https://example.com/files/one.mp3');
    });

    it('follows the next track', () => {
      const player = createPlayer({}, episodes, 0);
      const controlBar = createControlBar(player);
      controlBar.updateDownloadButton();

      player.playlistManager.currentIndex = 1;
      controlBar.updateDownloadButton();

      const button = controlBar.controls.download;
      expect(button.dataset.vidplyDownloadUrl).toBe('https://example.com/files/two.mp3');
      expect(button.getAttribute('aria-label')).toBe('Download MP3 (3.0 MB)');
      expect(button.style.display).toBe('');
    });

    it('hides the button on a track that may not be downloaded', () => {
      const player = createPlayer({}, episodes, 0);
      const controlBar = createControlBar(player);
      controlBar.updateDownloadButton();

      player.playlistManager.currentIndex = 2;
      controlBar.updateDownloadButton();

      expect(controlBar.controls.download.style.display).toBe('none');
    });

    it('shows a previously hidden button again', () => {
      const player = createPlayer({}, episodes, 2);
      const controlBar = createControlBar(player);
      controlBar.updateDownloadButton();
      expect(controlBar.controls.download).toBeUndefined();

      player.playlistManager.currentIndex = 1;
      controlBar.updateDownloadButton();

      expect(controlBar.controls.download.style.display).toBe('');
    });

    it('builds a new button when a rebuild discarded the previous one', () => {
      const player = createPlayer({}, episodes, 0);
      const controlBar = createControlBar(player);
      controlBar.updateDownloadButton();
      const discarded = controlBar.controls.download;

      controlBar.rightButtons = document.createElement('div');
      controlBar.updateDownloadButton();

      expect(controlBar.controls.download).not.toBe(discarded);
      expect(controlBar.rightButtons.contains(controlBar.controls.download)).toBe(true);
    });

    it('does nothing while the download button is switched off', () => {
      const controlBar = createControlBar(createPlayer({ downloadButton: false }, episodes, 0));

      controlBar.updateDownloadButton();

      expect(controlBar.controls.download).toBeUndefined();
    });
  });

  describe('download target on click', () => {
    it('hands out the track selected at click time', () => {
      const player = createPlayer({}, episodes, 0);
      const controlBar = createControlBar(player);
      controlBar.updateDownloadButton();

      const anchor = document.createElement('a');
      const click = vi.fn();
      anchor.click = click;
      vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor);

      player.playlistManager.currentIndex = 1;
      controlBar.controls.download.dispatchEvent(new Event('click'));

      expect(click).toHaveBeenCalled();
      expect(anchor.href).toBe('https://example.com/files/two.mp3');
      expect(anchor.getAttribute('download')).toBe('two.mp3');
    });
  });

  describe('file size lookup', () => {
    it('trusts the size the track provides instead of asking the server', () => {
      const controlBar = createControlBar(createPlayer({}, episodes, 0));

      controlBar.updateDownloadButton();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('asks the server when the size is unknown and relabels the button', async () => {
      const tracks = [{ src: 'one.mp3', type: 'audio/mpeg', downloadUrl: 'https://example.com/one.mp3' }];
      const controlBar = createControlBar(createPlayer({}, tracks, 0));

      controlBar.updateDownloadButton();
      await vi.waitFor(() => {
        expect(controlBar.controls.download.getAttribute('aria-label')).toBe('Download MP3 (2.0 MB)');
      });

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/one.mp3', expect.objectContaining({ method: 'HEAD' }));
    });

    it('drops a size that arrives after the track changed', async () => {
      const tracks = [
        { src: 'one.mp3', type: 'audio/mpeg', downloadUrl: 'https://example.com/one.mp3' },
        { src: 'two.mp3', type: 'audio/mpeg', downloadUrl: 'https://example.com/two.mp3', downloadFileSize: 1_048_576 }
      ];
      const player = createPlayer({}, tracks, 0);
      const controlBar = createControlBar(player);

      controlBar.updateDownloadButton();
      player.playlistManager.currentIndex = 1;
      controlBar.updateDownloadButton();

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      await Promise.resolve();

      expect(controlBar.controls.download.getAttribute('aria-label')).toBe('Download MP3 (1.0 MB)');
    });
  });
});
