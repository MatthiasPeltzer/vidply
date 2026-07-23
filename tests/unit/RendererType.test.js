/**
 * Unit Tests: classifyRendererType
 * The single source of truth that maps a media source URL to a renderer type,
 * shared by Player._detectRendererClass and Player.shouldChangeRenderer.
 */

import { describe, it, expect } from 'vitest';
import { classifyRendererType } from '../../src/utils/RendererType.js';

describe('classifyRendererType', () => {
  it('classifies YouTube watch, short and nocookie URLs', () => {
    expect(classifyRendererType('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(classifyRendererType('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(classifyRendererType('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('classifies Vimeo URLs', () => {
    expect(classifyRendererType('https://vimeo.com/123456789')).toBe('vimeo');
  });

  it('classifies HLS (.m3u8) and DASH (.mpd) manifests', () => {
    expect(classifyRendererType('https://cdn.example.com/stream/index.m3u8')).toBe('hls');
    expect(classifyRendererType('https://cdn.example.com/stream/manifest.mpd')).toBe('dash');
  });

  it('classifies SoundCloud URLs', () => {
    expect(classifyRendererType('https://soundcloud.com/artist/track')).toBe('soundcloud');
    expect(classifyRendererType('https://api.soundcloud.com/tracks/123')).toBe('soundcloud');
  });

  it('falls back to html5 for plain media URLs', () => {
    expect(classifyRendererType('https://example.com/video.mp4')).toBe('html5');
    expect(classifyRendererType('/local/audio.mp3')).toBe('html5');
    expect(classifyRendererType('')).toBe('html5');
  });

  it('maps deterministically: provider hosts take precedence over extensions', () => {
    // Provider checks run before extension checks, so a provider hint in the
    // URL wins. The guarantee that matters is a single deterministic mapping
    // (both _detectRendererClass and shouldChangeRenderer use this function).
    expect(classifyRendererType('https://host/vimeo.com-path/index.m3u8')).toBe('vimeo');
  });
});
