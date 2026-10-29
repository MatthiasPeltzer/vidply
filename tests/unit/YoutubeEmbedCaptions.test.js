import { describe, it, expect, vi } from 'vitest';
import {
  filterYoutubeCaptionTracklist,
  isYoutubeAsrTrack,
  probeYoutubeCaptionTrack,
  readYoutubeCaptionTracklist
} from '../../src/utils/YoutubeEmbedCaptions.js';

describe('YoutubeEmbedCaptions', () => {
  describe('isYoutubeAsrTrack', () => {
    it('detects ASR by kind', () => {
      expect(isYoutubeAsrTrack({ kind: 'asr', languageCode: 'en' })).toBe(true);
    });

    it('detects ASR by vssId prefix', () => {
      expect(isYoutubeAsrTrack({ vssId: 'a.en', languageCode: 'en' })).toBe(true);
    });
  });

  describe('filterYoutubeCaptionTracklist', () => {
    it('prefers uploaded captions over ASR for the same language', () => {
      const list = filterYoutubeCaptionTracklist([
        { languageCode: 'en', displayName: 'English', kind: 'asr', vssId: 'a.en' },
        { languageCode: 'en', displayName: 'English', kind: '', vssId: '.en' }
      ]);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('.en');
      expect(list[0].label).toBe('English');
    });

    it('falls back to ASR with auto-generated label when no upload exists', () => {
      const list = filterYoutubeCaptionTracklist([
        { languageCode: 'de', displayName: 'German', kind: 'asr', vssId: 'a.de' }
      ]);
      expect(list).toHaveLength(1);
      expect(list[0].label).toBe('German (auto-generated)');
    });

    it('keeps distinct languages', () => {
      const list = filterYoutubeCaptionTracklist([
        { languageCode: 'en', displayName: 'English', vssId: '.en' },
        { languageCode: 'fr', displayName: 'French', vssId: '.fr' }
      ]);
      expect(list.map((t) => t.language)).toEqual(expect.arrayContaining(['en', 'fr']));
    });
  });

  describe('readYoutubeCaptionTracklist', () => {
    it('returns null when tracklist is missing', () => {
      expect(readYoutubeCaptionTracklist({})).toBeNull();
    });

    it('returns the array from getOption', () => {
      const tracks = [{ languageCode: 'en', vssId: '.en' }];
      expect(
        readYoutubeCaptionTracklist({
          getOption: vi.fn(() => tracks)
        })
      ).toEqual(tracks);
    });
  });

  describe('probeYoutubeCaptionTrack', () => {
    it('returns true when setOption succeeds', () => {
      const youtube = { setOption: vi.fn() };
      expect(probeYoutubeCaptionTrack(youtube, { vssId: '.en' })).toBe(true);
      expect(youtube.setOption).toHaveBeenCalledTimes(2);
    });

    it('returns false when setOption throws', () => {
      const youtube = {
        setOption: vi.fn(() => {
          throw new Error('blocked');
        })
      };
      expect(probeYoutubeCaptionTrack(youtube, { vssId: '.en' })).toBe(false);
    });
  });
});
