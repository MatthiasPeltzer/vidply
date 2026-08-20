/**
 * Unit Tests: ControlBar overflow detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ControlBar } from '../../src/controls/ControlBar.js';

function createButton(label, priority = '3') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'vidply-button';
  btn.setAttribute('aria-label', label);
  btn.dataset.overflowPriority = priority;
  Object.defineProperty(btn, 'offsetWidth', { value: 44, configurable: true });
  return btn;
}

function createOverflowControlBar() {
  const controlBar = Object.create(ControlBar.prototype);
  controlBar.player = {
    options: { classPrefix: 'vidply', debug: false },
    state: { fullscreen: false },
  };
  controlBar.rightButtons = document.createElement('div');
  controlBar.rightButtons.className = 'vidply-controls-right';
  controlBar.overflowMenuButton = document.createElement('button');
  controlBar.overflowMenuButton.className = 'vidply-button vidply-overflow-menu';
  controlBar.overflowMenuButton.style.display = 'none';
  Object.defineProperty(controlBar.overflowMenuButton, 'offsetWidth', { value: 44, configurable: true });
  controlBar.rightButtons.appendChild(controlBar.overflowMenuButton);
  controlBar.measureControlButton = ControlBar.prototype.measureControlButton;
  controlBar.getOverflowPriority = ControlBar.prototype.getOverflowPriority;
  controlBar.isFullscreenControlButton = ControlBar.prototype.isFullscreenControlButton;
  controlBar.fitCollapsibleButtons = ControlBar.prototype.fitCollapsibleButtons;
  return controlBar;
}

function createFullscreenButton() {
  const btn = createButton('Fullscreen', '1');
  btn.classList.add('vidply-fullscreen');
  return btn;
}

describe('ControlBar.checkOverflow', () => {
  let originalInnerWidth;
  let originalInnerHeight;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
  });

  it('shows the overflow menu on desktop when right-side buttons do not fit', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

    const controlBar = createOverflowControlBar();
    controlBar.rightButtons.appendChild(createButton('Captions', '1'));
    controlBar.rightButtons.appendChild(createButton('Transcript', '3'));
    controlBar.rightButtons.appendChild(createButton('Download', '3'));
    controlBar.rightButtons.appendChild(createFullscreenButton());

    Object.defineProperty(controlBar.rightButtons, 'offsetWidth', { value: 120, configurable: true });

    controlBar.checkOverflow();

    const overflowItems = controlBar.rightButtons.querySelectorAll('button[data-in-overflow="true"]');
    expect(overflowItems.length).toBeGreaterThan(0);
    expect(controlBar.overflowMenuButton.style.display).not.toBe('none');
    expect(controlBar.rightButtons.querySelector('.vidply-fullscreen').style.display).not.toBe('none');
  });

  it('keeps all buttons visible on desktop when they fit', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

    const controlBar = createOverflowControlBar();
    controlBar.rightButtons.appendChild(createButton('Captions', '1'));
    controlBar.rightButtons.appendChild(createFullscreenButton());

    Object.defineProperty(controlBar.rightButtons, 'offsetWidth', { value: 400, configurable: true });

    controlBar.checkOverflow();

    const hiddenButtons = [...controlBar.rightButtons.querySelectorAll('button')]
      .filter(btn => !btn.classList.contains('vidply-overflow-menu'))
      .filter(btn => btn.style.display === 'none');

    expect(hiddenButtons).toHaveLength(0);
    expect(controlBar.overflowMenuButton.style.display).toBe('none');
  });

  it('always keeps fullscreen visible on desktop even in a tight column', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

    const controlBar = createOverflowControlBar();
    controlBar.rightButtons.appendChild(createButton('Captions', '1'));
    controlBar.rightButtons.appendChild(createButton('Transcript', '3'));
    controlBar.rightButtons.appendChild(createButton('Download', '3'));
    controlBar.rightButtons.appendChild(createButton('Keyboard help', '3'));
    controlBar.rightButtons.appendChild(createButton('Sign language', '3'));
    controlBar.rightButtons.appendChild(createFullscreenButton());

    Object.defineProperty(controlBar.rightButtons, 'offsetWidth', { value: 160, configurable: true });

    controlBar.checkOverflow();

    const fullscreen = controlBar.rightButtons.querySelector('.vidply-fullscreen');
    expect(fullscreen.style.display).not.toBe('none');
    expect(fullscreen.dataset.inOverflow).toBe('false');
    expect(controlBar.overflowMenuButton.style.display).not.toBe('none');
  });

  it('still collapses low-priority buttons on mobile portrait', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });

    const controlBar = createOverflowControlBar();
    controlBar.rightButtons.appendChild(createButton('Captions', '1'));
    controlBar.rightButtons.appendChild(createButton('Transcript', '3'));
    controlBar.rightButtons.appendChild(createButton('Download', '3'));
    controlBar.rightButtons.appendChild(createFullscreenButton());

    Object.defineProperty(controlBar.rightButtons, 'offsetWidth', { value: 320, configurable: true });

    controlBar.checkOverflow();

    expect(controlBar.rightButtons.querySelector('button[aria-label="Transcript"]').style.display).toBe('none');
    expect(controlBar.rightButtons.querySelector('button[aria-label="Download"]').style.display).toBe('none');
    expect(controlBar.rightButtons.querySelector('.vidply-fullscreen').style.display).not.toBe('none');
    expect(controlBar.overflowMenuButton.style.display).not.toBe('none');
  });

  it('keeps playlist transport controls visible on mobile portrait', () => {
    Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

    const controlBar = createOverflowControlBar();
    const row = document.createElement('div');
    row.className = 'vidply-controls-buttons';
    Object.defineProperty(row, 'clientWidth', { value: 272, configurable: true });

    controlBar.leftButtons = document.createElement('div');
    controlBar.leftButtons.className = 'vidply-controls-left';
    row.appendChild(controlBar.leftButtons);
    row.appendChild(controlBar.rightButtons);

    const play = createButton('Play', '1');
    play.classList.add('vidply-play-pause');
    const previous = createButton('Previous', '1');
    previous.classList.add('vidply-previous');
    previous.dataset.overflowPriorityMobile = '1';
    const playlist = createButton('Playlist', '3');
    playlist.classList.add('vidply-playlist-toggle');
    playlist.dataset.overflowPriorityMobile = '3';
    const next = createButton('Next', '1');
    next.classList.add('vidply-next');
    next.dataset.overflowPriorityMobile = '1';
    const volume = createButton('Volume', '1');
    volume.classList.add('vidply-mute');

    controlBar.leftButtons.appendChild(previous);
    controlBar.leftButtons.appendChild(play);
    controlBar.leftButtons.appendChild(next);
    controlBar.leftButtons.appendChild(volume);

    controlBar.rightButtons.insertBefore(playlist, controlBar.overflowMenuButton);
    controlBar.rightButtons.insertBefore(createFullscreenButton(), controlBar.overflowMenuButton);

    Object.defineProperty(controlBar.rightButtons, 'offsetWidth', { value: 72, configurable: true });
    Object.defineProperty(controlBar.rightButtons, 'getBoundingClientRect', {
      value: () => ({ width: 72, height: 32, top: 0, left: 200, right: 272, bottom: 32 }),
      configurable: true,
    });

    controlBar.checkOverflow();

    expect(controlBar.leftButtons.querySelector('.vidply-previous').style.display).not.toBe('none');
    expect(controlBar.leftButtons.querySelector('.vidply-play-pause').style.display).not.toBe('none');
    expect(controlBar.rightButtons.querySelector('.vidply-playlist-toggle').style.display).toBe('none');
    expect(controlBar.rightButtons.querySelector('.vidply-playlist-toggle').dataset.inOverflow).toBe('true');
    expect(controlBar.leftButtons.querySelector('.vidply-next').style.display).not.toBe('none');
    expect(controlBar.leftButtons.querySelector('.vidply-mute').style.display).not.toBe('none');
    expect(controlBar.leftButtons.querySelector('.vidply-previous').dataset.inOverflow).toBe('false');
    expect(controlBar.rightButtons.querySelector('.vidply-fullscreen').style.display).not.toBe('none');
    expect(controlBar.overflowMenuButton.style.display).not.toBe('none');
  });
});
