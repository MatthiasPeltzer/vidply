import { describe, it, expect, vi } from 'vitest';
import { CaptionManager } from '../../src/controls/CaptionManager.js';

const cue = (startTime, endTime, text) => ({ startTime, endTime, text });

function createManager(rendererType, currentTime) {
  const cues = [cue(0, 5, 'Intro'), cue(30, 34, 'with varying tastes'), cue(35, 39, 'Later')];
  const track = {
    mode: 'hidden',
    cues,
    // The idle <video> behind an iframe embed never advances past 0 s.
    activeCues: [cues[0]]
  };

  const manager = Object.create(CaptionManager.prototype);
  manager.player = {
    renderer: { rendererType, handlesOwnCaptions: () => false },
    element: document.createElement('video'),
    state: { currentTime },
    options: { classPrefix: 'vidply' },
    emit: vi.fn()
  };
  manager.element = document.createElement('div');
  manager.currentTrack = { track, language: 'en', label: 'English', kind: 'captions', index: 0, isDefault: false, alternatives: [] };
  manager.currentCue = null;
  return manager;
}

describe('CaptionManager sidecar captions on iframe embeds', () => {
  it.each(['youtube', 'vimeo', 'soundcloud'])('uses the player clock for %s', (rendererType) => {
    const manager = createManager(rendererType, 31);

    manager.updateCaptions();

    expect(manager.element.textContent).toBe('with varying tastes');
    expect(manager.element.style.display).toBe('block');
  });

  it('hides the caption between embed cues', () => {
    const manager = createManager('youtube', 31);
    manager.updateCaptions();

    manager.player.state.currentTime = 34.5;
    manager.updateCaptions();

    expect(manager.element.textContent).toBe('');
    expect(manager.element.style.display).toBe('none');
  });

  it('keeps native activeCues for HTML5 media', () => {
    const manager = createManager('html5', 31);

    manager.updateCaptions();

    expect(manager.element.textContent).toBe('Intro');
  });
});
