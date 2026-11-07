/**
 * Unit Tests: Context menu
 * Entry building (availability, separators, shortcuts), when the menu opens
 * instead of the browser menu, positioning and the keyboard model.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextMenuManager } from '../../src/controls/ContextMenuManager.js';
import {
  getContextMenuEntries,
  isControlAvailable,
  normalizeEntries
} from '../../src/controls/PlayerContextActions.js';
import { Player } from '../../src/core/Player.js';
import { getChapterTrack } from '../../src/utils/ChapterTracks.js';

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key, params) => (params ? `${key}:${JSON.stringify(params)}` : key)),
    getLanguage: vi.fn(() => 'en')
  }
}));

function button(label) {
  const el = document.createElement('button');
  el.setAttribute('aria-label', label);
  return el;
}

function createPlayer({ controls = ['playPause'], options = {}, state = {} } = {}) {
  const container = document.createElement('div');
  container.className = 'vidply-player';
  container.tabIndex = 0;
  const video = document.createElement('video');
  container.appendChild(video);
  const bar = document.createElement('div');
  container.appendChild(bar);
  document.body.appendChild(container);

  const controlMap = {};
  for (const name of controls) {
    controlMap[name] = button(name);
    bar.appendChild(controlMap[name]);
  }

  const controller = new AbortController();
  const player = {
    container,
    element: video,
    instanceId: 1,
    lifecycleSignal: controller.signal,
    state: { playing: false, muted: false, currentTime: 0, playbackSpeed: 1, ...state },
    options: {
      classPrefix: 'vidply',
      controls: true,
      contextMenu: true,
      keyboard: true,
      seekInterval: 10,
      keyboardShortcuts: {
        'play-pause': [' ', 'k'],
        mute: ['m'],
        fullscreen: ['f'],
        'seek-forward': ['ArrowRight'],
        'seek-backward': ['ArrowLeft'],
        help: ['?']
      },
      ...options
    },
    controlBar: {
      controls: controlMap,
      hasControl(name) {
        const control = this.controls[name];
        return Boolean(control?.isConnected && !control.hidden);
      },
      activateControl: vi.fn((el) => el.click()),
      closeOpenMenu: vi.fn(),
      formatSpeedLabel: (speed) => (speed === 1 ? 'Normal' : `${speed}×`),
      updateCaptionsButton: vi.fn(),
      hasEmbedCaptionBridge: () => false
    },
    renderer: null,
    playlistManager: null,
    captionManager: null,
    keyboardHelp: null,
    transcriptManager: null,
    signLanguageManager: null,
    toggle: vi.fn(),
    toggleMute: vi.fn(),
    seekForward: vi.fn(),
    seekBackward: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleKeyboardHelp: vi.fn(),
    setPlaybackSpeed: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isContextMenuActive: vi.fn(() => true),
    destroyController: controller
  };
  return player;
}

const ids = (entries) => entries.map((e) => e.id);

function contextMenuEvent(target, init = {}) {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 50,
    clientY: 60,
    button: 2,
    ...init
  });
  target.dispatchEvent(event);
  return event;
}

function pointerDown(target, pointerType) {
  const event = new Event('pointerdown', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
}

function key(target, keyName, init = {}) {
  const event = new KeyboardEvent('keydown', {
    key: keyName,
    bubbles: true,
    cancelable: true,
    ...init
  });
  target.dispatchEvent(event);
  return event;
}

describe('normalizeEntries', () => {
  const sep = (id) => ({ id, type: 'separator' });
  const item = (id) => ({ id, type: 'action', label: id });

  it('drops empty slots and leading, trailing and repeated separators', () => {
    const result = normalizeEntries([
      sep('a'),
      item('one'),
      null,
      sep('b'),
      sep('c'),
      item('two'),
      sep('d')
    ]);
    expect(ids(result)).toEqual(['one', 'b', 'two']);
  });

  it('returns an empty list when nothing is available', () => {
    expect(normalizeEntries([sep('a'), null, sep('b')])).toEqual([]);
  });
});

describe('getContextMenuEntries', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('always offers play/pause with its shortcut hint', () => {
    const player = createPlayer();
    const [first] = getContextMenuEntries(player);
    expect(first).toMatchObject({
      id: 'play-pause',
      label: 'player.play',
      shortcut: 'help.keys.space',
      ariaShortcut: 'Space'
    });

    player.state.playing = true;
    expect(getContextMenuEntries(player)[0].label).toBe('player.pause');
  });

  it('only lists functions whose control is available', () => {
    const player = createPlayer({
      controls: ['playPause', 'mute', 'speed', 'fullscreen', 'download']
    });
    player.controlBar.controls.download.style.display = 'none';

    const result = ids(getContextMenuEntries(player));
    expect(result).toContain('mute');
    expect(result).toContain('speed');
    expect(result).toContain('fullscreen');
    expect(result).not.toContain('download');
    expect(result).not.toContain('captions');
    expect(result).not.toContain('previous');
  });

  it('keeps controls that collapsed into the overflow menu', () => {
    const player = createPlayer({ controls: ['playPause', 'download'] });
    const download = player.controlBar.controls.download;
    download.style.display = 'none';
    download.dataset.inOverflow = 'true';

    expect(isControlAvailable(player, 'download')).toBe(true);
    const entry = getContextMenuEntries(player).find((e) => e.id === 'download');
    expect(entry?.label).toBe('download');
  });

  it('skips hidden and disabled controls', () => {
    const player = createPlayer({ controls: ['playPause', 'next', 'previous'] });
    player.controlBar.controls.next.hidden = true;
    player.controlBar.controls.previous.disabled = true;

    const result = ids(getContextMenuEntries(player));
    expect(result).not.toContain('next');
    expect(result).not.toContain('previous');
  });

  it('offers loop only where it applies', () => {
    const player = createPlayer();
    expect(ids(getContextMenuEntries(player))).toContain('loop');

    player.state.isLive = true;
    expect(ids(getContextMenuEntries(player))).not.toContain('loop');

    player.state.isLive = false;
    player.playlistManager = {};
    expect(ids(getContextMenuEntries(player))).not.toContain('loop');
  });

  it('toggles the loop option', () => {
    const player = createPlayer({ options: { loop: false } });
    const loop = getContextMenuEntries(player).find((e) => e.id === 'loop');
    expect(loop.checked).toBe(false);
    loop.run();
    expect(player.options.loop).toBe(true);
  });

  it('omits shortcut hints and help when keyboard support is off', () => {
    const player = createPlayer({ controls: ['playPause', 'mute'], options: { keyboard: false } });
    const entries = getContextMenuEntries(player);
    expect(entries.every((e) => !e.shortcut)).toBe(true);
    expect(ids(entries)).not.toContain('help');
  });

  it('builds the speed submenu with the current rate checked', () => {
    const player = createPlayer({
      controls: ['playPause', 'speed'],
      state: { playbackSpeed: 1.5 }
    });
    const speed = getContextMenuEntries(player).find((e) => e.id === 'speed');
    const children = speed.children();
    expect(children.map((c) => c.label)).toContain('Normal');
    expect(children.find((c) => c.checked)?.id).toBe('speed-1.5');

    children.find((c) => c.id === 'speed-2').run();
    expect(player.setPlaybackSpeed).toHaveBeenCalledWith(2);
  });

  it('delegates dialog and toggle buttons to the control bar', () => {
    const player = createPlayer({ controls: ['playPause', 'transcript'] });
    player.transcriptManager = { isVisible: true };
    const transcript = getContextMenuEntries(player).find((e) => e.id === 'transcript');
    expect(transcript).toMatchObject({ type: 'checkbox', checked: true });

    transcript.run();
    expect(player.controlBar.activateControl).toHaveBeenCalledWith(
      player.controlBar.controls.transcript
    );
  });
});

describe('caption styling submenu', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('offers style submenus instead of opening the dialog', () => {
    const player = createPlayer({
      controls: ['playPause', 'captionStyle'],
      options: {
        captionsFontSize: '100%',
        captionsFontFamily: 'sans-serif',
        captionsColor: '#FFFFFF',
        captionsBackgroundColor: '#000000',
        captionsOpacity: 0.8
      }
    });
    player.captionManager = { setCaptionStyle: vi.fn() };

    const style = getContextMenuEntries(player).find((e) => e.id === 'caption-style');
    expect(style.type).toBe('submenu');
    const children = style.children();
    expect(ids(children)).toEqual([
      'caption-font-size',
      'caption-font',
      'caption-color',
      'caption-background',
      'caption-opacity',
      'sep-caption-style-more',
      'captionStyle'
    ]);

    const sizes = children[0].children();
    expect(sizes.find((c) => c.checked)?.label).toBe('fontSizes.normal');
    sizes.find((c) => c.label === 'fontSizes.large').run();
    expect(player.captionManager.setCaptionStyle).toHaveBeenCalledWith('fontSize', '125%');

    const colors = children[2].children();
    expect(colors.find((c) => c.checked)?.label).toBe('contextMenu.colors.white');

    const opacities = children[4].children();
    expect(opacities.map((c) => c.label)).toContain('80%');
    expect(opacities.find((c) => c.checked)?.label).toBe('80%');
  });
});

describe('getChapterTrack', () => {
  const track = (language, mode = 'disabled', kind = 'chapters') => ({ kind, language, mode });
  const media = (tracks) => ({ textTracks: tracks });

  it('prefers the chapters track in the player language', () => {
    const en = track('en');
    expect(getChapterTrack(media([track('de'), track('en', 'disabled', 'captions'), en]))).toBe(en);
    expect(getChapterTrack(media([track('de'), track('en-GB')]))?.language).toBe('en-GB');
  });

  it('falls back to an active track, then the first one', () => {
    const fr = track('fr', 'hidden');
    expect(getChapterTrack(media([track('de'), fr]))).toBe(fr);
    expect(getChapterTrack(media([track('de'), track('fr')]))?.language).toBe('de');
    expect(getChapterTrack(media([track('en', 'showing', 'captions')]))).toBeNull();
  });
});

describe('Player.isContextMenuActive', () => {
  const active = (overrides) =>
    Player.prototype.isContextMenuActive.call({
      options: { controls: true, contextMenu: true },
      controlBar: {},
      shouldHideVidplyControls: () => false,
      ...overrides
    });

  it('is on by default', () => {
    expect(active()).toBe(true);
  });

  it('is off for false, "native", no controls or provider controls', () => {
    expect(active({ options: { controls: true, contextMenu: false } })).toBe(false);
    expect(active({ options: { controls: true, contextMenu: 'native' } })).toBe(false);
    expect(active({ options: { controls: false, contextMenu: true } })).toBe(false);
    expect(active({ controlBar: null })).toBe(false);
    expect(active({ shouldHideVidplyControls: () => true })).toBe(false);
  });
});

describe('ContextMenuManager', () => {
  let player;
  let manager;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = createPlayer({ controls: ['playPause', 'mute', 'speed', 'fullscreen'] });
    manager = new ContextMenuManager(player);
  });

  afterEach(() => {
    manager.destroy();
    player.destroyController.abort();
  });

  describe('opening', () => {
    it('replaces the browser menu on right-click', () => {
      const event = contextMenuEvent(player.element);

      expect(event.defaultPrevented).toBe(true);
      expect(manager.isOpen).toBe(true);
      const [menu] = manager.menus;
      expect(menu.getAttribute('role')).toBe('menu');
      expect(menu.getAttribute('aria-label')).toBe('contextMenu.label');
      expect(menu.querySelector('[role="menuitem"]').textContent).toContain('player.play');
    });

    it('keeps the browser menu for Shift + right-click', () => {
      const event = contextMenuEvent(player.element, { shiftKey: true });
      expect(event.defaultPrevented).toBe(false);
      expect(manager.isOpen).toBe(false);
    });

    it('keeps the browser menu for touch and pen long-press', () => {
      for (const type of ['touch', 'pen']) {
        pointerDown(player.element, type);
        const event = contextMenuEvent(player.element);
        expect(event.defaultPrevented).toBe(false);
        expect(manager.isOpen).toBe(false);
      }
    });

    it('opens from Shift+F10 and focuses the first item', () => {
      key(player.container, 'F10', { shiftKey: true });
      const event = contextMenuEvent(player.container, { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(manager.menus[0].querySelector('[role="menuitem"]'));
    });

    it('opens from the Menu key', () => {
      key(player.container, 'ContextMenu');
      contextMenuEvent(player.container);
      expect(manager.isOpen).toBe(true);
    });

    it('keeps the browser menu on text fields and links', () => {
      const input = document.createElement('input');
      const link = document.createElement('a');
      link.href = 'https://example.com/';
      player.container.append(input, link);

      expect(contextMenuEvent(input).defaultPrevented).toBe(false);
      expect(contextMenuEvent(link).defaultPrevented).toBe(false);
      expect(manager.isOpen).toBe(false);
    });

    it('stays out of the way when disabled or a dialog is open', () => {
      player.isContextMenuActive.mockReturnValueOnce(false);
      expect(contextMenuEvent(player.element).defaultPrevented).toBe(false);

      player.keyboardHelp = { isOpen: true };
      expect(contextMenuEvent(player.element).defaultPrevented).toBe(false);
      player.keyboardHelp = null;

      const dialog = document.createElement('div');
      dialog.setAttribute('aria-modal', 'true');
      player.container.appendChild(dialog);
      expect(contextMenuEvent(player.element).defaultPrevented).toBe(false);
      expect(manager.isOpen).toBe(false);
    });

    it('allows only one open menu per page', () => {
      const other = createPlayer();
      const otherManager = new ContextMenuManager(other);
      contextMenuEvent(player.element);
      contextMenuEvent(other.element);

      expect(manager.isOpen).toBe(false);
      expect(otherManager.isOpen).toBe(true);
      otherManager.destroy();
      other.destroyController.abort();
    });
  });

  describe('closing', () => {
    it('closes on outside pointerdown', () => {
      contextMenuEvent(player.element);
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(manager.isOpen).toBe(false);
    });

    it('closes when the page scrolls', () => {
      contextMenuEvent(player.element);
      Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
      document.dispatchEvent(new Event('scroll'));
      expect(manager.isOpen).toBe(false);
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    });

    it('ignores the late scroll event from focusing the player', () => {
      contextMenuEvent(player.element);
      document.dispatchEvent(new Event('scroll'));
      expect(manager.isOpen).toBe(true);
    });

    it('closes on player changes', () => {
      const events = player.on.mock.calls.map(([event]) => event);
      expect(events).toEqual(
        expect.arrayContaining(['playlisttrackchange', 'sourcechange', 'fullscreenchange'])
      );
      contextMenuEvent(player.element);
      player.on.mock.calls[0][1]();
      expect(manager.isOpen).toBe(false);
    });

    it('removes everything on destroy', () => {
      contextMenuEvent(player.element);
      manager.destroy();
      expect(document.querySelector('.vidply-context-menu')).toBeNull();
      expect(player.off).toHaveBeenCalled();
    });
  });

  describe('keyboard model', () => {
    let menu;
    let items;

    beforeEach(() => {
      player.container.focus();
      key(player.container, 'ContextMenu');
      contextMenuEvent(player.container);
      [menu] = manager.menus;
      items = Array.from(menu.querySelectorAll('[role^="menuitem"]'));
    });

    it('moves with arrows, wraps and jumps with Home/End', () => {
      expect(document.activeElement).toBe(items[0]);
      key(menu, 'ArrowDown');
      expect(document.activeElement).toBe(items[1]);
      key(menu, 'End');
      expect(document.activeElement).toBe(items[items.length - 1]);
      key(menu, 'ArrowDown');
      expect(document.activeElement).toBe(items[0]);
      key(menu, 'ArrowUp');
      expect(document.activeElement).toBe(items[items.length - 1]);
      key(menu, 'Home');
      expect(document.activeElement).toBe(items[0]);
    });

    it('jumps to items by typing', () => {
      const fullscreen = items.find((item) => item.textContent.startsWith('player.fullscreen'));
      key(menu, 'p');
      key(menu, 'l');
      key(menu, 'a');
      key(menu, 'y');
      key(menu, 'e');
      key(menu, 'r');
      key(menu, '.');
      key(menu, 'f');
      expect(document.activeElement).toBe(fullscreen);
    });

    it('activates with Enter and restores focus first', () => {
      const mute = items.find((item) => item.textContent.startsWith('player.mute'));
      mute.focus();
      player.toggleMute.mockImplementation(() => {
        expect(document.activeElement).toBe(player.container);
      });
      key(menu, 'Enter');

      expect(player.toggleMute).toHaveBeenCalled();
      expect(manager.isOpen).toBe(false);
    });

    it('opens a submenu with ArrowRight and closes it with ArrowLeft', async () => {
      const speed = items.find((item) => item.getAttribute('aria-haspopup') === 'menu');
      speed.focus();
      key(menu, 'ArrowRight');
      await vi.waitFor(() => expect(manager.menus).toHaveLength(2));

      const submenu = manager.menus[1];
      expect(speed.getAttribute('aria-expanded')).toBe('true');
      expect(speed.getAttribute('aria-controls')).toBe(submenu.id);
      expect(document.activeElement.getAttribute('aria-checked')).toBe('true');

      key(submenu, 'ArrowLeft');
      expect(manager.menus).toHaveLength(1);
      expect(document.activeElement).toBe(speed);
      expect(speed.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes with Escape and returns focus', () => {
      key(menu, 'Escape');
      expect(manager.isOpen).toBe(false);
      expect(document.activeElement).toBe(player.container);
    });

    it('marks shortcuts for assistive technology', () => {
      expect(items[0].getAttribute('aria-keyshortcuts')).toBe('Space');
      expect(
        items[0].querySelector('.vidply-context-menu-shortcut').getAttribute('aria-hidden')
      ).toBe('true');
    });
  });

  describe('positioning', () => {
    const size = (width, height) => {
      const menu = document.createElement('div');
      menu.getBoundingClientRect = () => ({ width, height });
      return menu;
    };

    beforeEach(() => {
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 1000,
        configurable: true
      });
      Object.defineProperty(document.documentElement, 'clientHeight', {
        value: 800,
        configurable: true
      });
    });

    it('opens at the pointer', () => {
      const menu = size(200, 300);
      manager.positionAtPoint(menu, { x: 100, y: 100 });
      expect([menu.style.left, menu.style.top]).toEqual(['101px', '101px']);
    });

    it('flips left and up at the viewport edge', () => {
      const menu = size(200, 300);
      manager.positionAtPoint(menu, { x: 900, y: 700 });
      expect([menu.style.left, menu.style.top]).toEqual(['700px', '400px']);
    });

    it('shifts inside the viewport when it fits on neither side', () => {
      const menu = size(200, 600);
      manager.positionAtPoint(menu, { x: 100, y: 500 });
      expect(menu.style.top).toBe('196px');
    });
  });
});
