/**
 * Unit Tests: KeyboardHelp
 * Covers the stacking class that keeps the dialog above host page content
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyboardHelp } from '../../src/controls/KeyboardHelp.js';

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key) => key)
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createIconElement: vi.fn(() => document.createElement('span'))
}));

function createPlayer() {
  const container = document.createElement('div');
  container.className = 'vidply-player';
  container.focus = vi.fn();
  document.body.appendChild(container);

  return {
    container,
    state: { isLive: false },
    options: {
      classPrefix: 'vidply',
      keyboardShortcuts: {
        'play-pause': [' '],
        help: ['?']
      }
    },
    controlBar: createControlBar(),
    emit: vi.fn()
  };
}

function createControlBar(controls = {}) {
  return {
    controls,
    hasControl(name) {
      const control = this.controls[name];
      return Boolean(control?.isConnected && !control.hidden);
    }
  };
}

describe('KeyboardHelp', () => {
  let player;
  let help;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = createPlayer();
    help = new KeyboardHelp(player);
  });

  it('marks the player while the dialog is open', () => {
    expect(player.container.classList.contains('vidply-modal-open')).toBe(false);

    help.show();

    expect(help.isOpen).toBe(true);
    expect(player.container.classList.contains('vidply-modal-open')).toBe(true);
  });

  it('drops the marker again when the dialog closes', () => {
    help.show();
    help.hide();

    expect(help.isOpen).toBe(false);
    expect(player.container.classList.contains('vidply-modal-open')).toBe(false);
  });

  it('drops the marker when the player is destroyed while open', () => {
    help.show();
    help.destroy();

    expect(player.container.classList.contains('vidply-modal-open')).toBe(false);
    expect(player.container.querySelector('.vidply-settings-overlay')).toBeNull();
  });

  it('keeps the marker in sync across repeated toggles', () => {
    help.toggle();
    expect(player.container.classList.contains('vidply-modal-open')).toBe(true);

    help.toggle();
    expect(player.container.classList.contains('vidply-modal-open')).toBe(false);

    help.toggle();
    expect(player.container.classList.contains('vidply-modal-open')).toBe(true);
  });

  it('shows a live stream controls section when the player is live', () => {
    player.state = { isLive: true };
    player.options.seekInterval = 15;
    player.options.goLiveButton = true;

    help.show();

    const liveSection = player.container.querySelector('.vidply-help-live-section');
    expect(liveSection).not.toBeNull();
    expect(liveSection?.querySelector('.vidply-help-live-title')?.textContent).toBe(
      'help.liveSectionTitle'
    );
    expect(liveSection?.querySelectorAll('dt').length).toBeGreaterThan(0);
  });

  it('hides speed shortcuts in the help dialog for live streams', () => {
    player.state = { isLive: true };
    player.options.keyboardShortcuts = {
      'play-pause': [' '],
      'speed-menu': ['s'],
      help: ['?']
    };
    const speed = document.createElement('button');
    player.container.appendChild(speed);
    player.controlBar = createControlBar({ speed });

    help.show();

    const actions = Array.from(player.container.querySelectorAll('.vidply-help-action')).map(
      (node) => node.textContent
    );
    expect(actions.some((text) => text === 'help.actions.speed-menu')).toBe(false);
  });

  describe('speed shortcuts', () => {
    const speedActions = [
      'help.actions.speed-down',
      'help.actions.speed-up',
      'help.actions.speed-menu'
    ];
    const listedActions = () =>
      Array.from(player.container.querySelectorAll('.vidply-help-action')).map(
        (node) => node.textContent
      );

    beforeEach(() => {
      player.options.keyboardShortcuts = {
        'play-pause': [' '],
        'speed-down': ['<'],
        'speed-up': ['>'],
        'speed-menu': ['s'],
        help: ['?']
      };
    });

    it('lists them while the speed button is in the bar', () => {
      const speed = document.createElement('button');
      player.container.appendChild(speed);
      player.controlBar = createControlBar({ speed });

      help.show();

      expect(listedActions()).toEqual(expect.arrayContaining(speedActions));
    });

    it('omits them when the speed button reference is stale after a bar rebuild', () => {
      player.controlBar = createControlBar({ speed: document.createElement('button') });

      help.show();

      expect(listedActions().filter((text) => speedActions.includes(text))).toEqual([]);
    });
  });
});
