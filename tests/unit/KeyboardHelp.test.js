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
    options: {
      classPrefix: 'vidply',
      keyboardShortcuts: {
        'play-pause': [' '],
        help: ['?']
      }
    },
    controlBar: { controls: {} },
    emit: vi.fn()
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
});
