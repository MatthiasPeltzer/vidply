import { describe, it, expect, beforeEach } from 'vitest';
import { createSanitizedRichTextFragment } from '../../src/utils/RichText.js';
import { TrackInfoView } from '../../src/core/TrackInfoView.js';

describe('RichText', () => {
  it('strips scripts and keeps basic formatting', () => {
    const fragment = createSanitizedRichTextFragment(
      '<p>Hello <strong>world</strong></p><script>alert(1)</script>'
    );
    const container = document.createElement('div');
    container.append(fragment);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('world');
  });
});

describe('TrackInfoView', () => {
  let view;

  beforeEach(() => {
    document.body.innerHTML = '';
    view = new TrackInfoView('vidply');
    document.body.appendChild(view.element);
  });

  it('renders the full short description without truncation', () => {
    const description = 'Line one.\nLine two with more detail than a two-line clamp would allow.';
    view.render({
      title: 'Episode 11',
      description
    });

    const descriptionEl = view.element.querySelector('.vidply-track-description');
    expect(descriptionEl?.textContent).toBe(description);
  });

  it('renders a long-description toggle with a chevron-down icon', () => {
    view.render({
      title: 'Episode 11',
      longDescription: '<p>Extended notes.</p>'
    });

    const toggle = view.element.querySelector('.vidply-track-longdesc-toggle');
    expect(toggle).not.toBeNull();
    expect(view.element.querySelector('.vidply-track-longdesc')?.hasAttribute('hidden')).toBe(true);
    expect(view.element.querySelector('.vidply-track-longdesc-toggle-icon svg')).not.toBeNull();
  });

  it('expands the long description and switches to chevron-up when clicked', () => {
    view.render({
      title: 'Episode 11',
      longDescription: '<p>Extended notes.</p>'
    });

    const toggle = view.element.querySelector('.vidply-track-longdesc-toggle');
    toggle.click();

    const panel = view.element.querySelector('.vidply-track-longdesc');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.hasAttribute('hidden')).toBe(false);
    expect(panel?.textContent).toContain('Extended notes.');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel?.hasAttribute('hidden')).toBe(true);
  });

  it('does not render duration for standalone track-info', () => {
    view.render({
      title: 'Episode 11',
      duration: 180
    });

    expect(view.element.querySelector('.vidply-track-duration')).toBeNull();
    expect(view.element.style.display).toBe('block');
  });

  it('stays hidden when only duration would have been content without playlist context', () => {
    view.render({
      duration: 180
    });

    expect(view.element.style.display).toBe('none');
  });

  it('renders duration in the track header for playlists', () => {
    view.render({
      title: 'Episode 11',
      duration: 180,
      trackNumber: 2,
      totalTracks: 5
    });

    expect(view.element.querySelector('.vidply-track-duration')?.textContent).toBe('03:00');
    expect(view.element.style.display).toBe('block');
  });

  it('exposes standalone track metadata to assistive technologies', () => {
    view.render({
      title: 'Episode 11',
      artist: 'Example Artist',
      description: 'Short description.',
      longDescription: '<p>Extended notes.</p>'
    });

    expect(view.element.getAttribute('role')).toBe('region');
    const titleId = view.element.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(view.element.querySelector(`#${titleId}`)?.textContent).toBe('Episode 11');
    expect(view.element.querySelector('.vidply-track-title')?.tagName).toBe('P');
    expect(view.element.querySelector('.vidply-track-artist')?.tagName).toBe('P');
    expect(view.element.querySelector('.vidply-track-description')?.tagName).toBe('P');
    expect(view.element.querySelector('.vidply-sr-only')).toBeNull();
    expect(view.element.querySelector('.vidply-track-title')?.getAttribute('aria-hidden')).toBeNull();
    expect(view.element.querySelector('.vidply-track-artist')?.getAttribute('aria-hidden')).toBeNull();
    expect(view.element.querySelector('.vidply-track-description')?.getAttribute('aria-hidden')).toBeNull();
    expect(view.element.querySelector('.vidply-track-actions')?.getAttribute('aria-hidden')).toBeNull();

    const toggle = view.element.querySelector('.vidply-track-longdesc-toggle');
    const panel = view.element.querySelector('.vidply-track-longdesc');
    expect(toggle?.getAttribute('aria-controls')).toBe(panel?.id);
  });

  it('announces playlist track changes without hiding interactive controls', () => {
    view.render({
      title: 'Episode 11',
      artist: 'Example Artist',
      trackNumber: 2,
      totalTracks: 5,
      longDescription: '<p>Extended notes.</p>'
    });

    const liveRegion = view.element.querySelector('.vidply-sr-only[aria-live="polite"]');
    expect(liveRegion?.textContent).toContain('Episode 11');
    expect(view.element.querySelector('.vidply-track-longdesc-toggle')?.closest('[aria-hidden="true"]')).toBeNull();
  });
});
