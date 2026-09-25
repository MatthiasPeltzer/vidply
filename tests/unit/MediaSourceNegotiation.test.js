import { describe, it, expect } from 'vitest';
import { negotiateMediaSources } from '../../src/utils/MediaSourceNegotiation.js';

describe('negotiateMediaSources', () => {
  it('prefers progressive MP4 for native element mode when DASH is first in list', () => {
    const result = negotiateMediaSources(
      [
        { src: 'https://example.test/video.mpd', type: 'application/dash+xml' },
        { src: 'https://example.test/video.mp4', type: 'video/mp4' },
      ],
      { preferNativeElement: true },
    );
    expect(result.src).toContain('.mp4');
  });

  it('prefers DASH when MSE is available and native mode is off', () => {
    const result = negotiateMediaSources([
      { src: 'https://example.test/video.mpd', type: 'application/dash+xml' },
      { src: 'https://example.test/video.mp4', type: 'video/mp4' },
    ]);
    if (typeof MediaSource !== 'undefined') {
      expect(result.src).toContain('.mpd');
    }
  });
});
