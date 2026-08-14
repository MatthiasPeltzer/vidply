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
});
