/**
 * Unit Tests: SettingsMenuFactory
 * Tests settings menu creation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSettingsMenu,
  createSettingsMenuItem,
  showSettingsMenu,
  hideSettingsMenu,
  toggleSettingsMenu,
  setupSettingsMenuKeyboard
} from '../../src/utils/SettingsMenuFactory.js';

// Mock dependencies
vi.mock('../../src/utils/DOMUtils.js', () => ({
  DOMUtils: {
    createElement: vi.fn((tag, options = {}) => {
      const el = document.createElement(tag);
      if (options.className) el.className = options.className;
      if (options.textContent) el.textContent = options.textContent;
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          if (value !== undefined) el.setAttribute(key, String(value));
        });
      }
      return el;
    }),
    addClass: vi.fn((el, className) => el.classList.add(className)),
    removeClass: vi.fn((el, className) => el.classList.remove(className))
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createIconElement: vi.fn((iconName) => {
    const span = document.createElement('span');
    span.className = `icon-${iconName}`;
    return span;
  })
}));

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key) => `translated:${key}`)
  }
}));

describe('SettingsMenuFactory', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createSettingsMenu', () => {
    it('should create a div element', () => {
      const menu = createSettingsMenu({
        classPrefix: 'vidply',
        menuClass: 'test-menu',
        menuId: 'test-menu-id',
        items: []
      });

      expect(menu.tagName).toBe('DIV');
    });

    it('should set menu role attribute', () => {
      const menu = createSettingsMenu({
        classPrefix: 'vidply',
        menuClass: 'test-menu',
        menuId: 'test-menu-id',
        items: []
      });

      expect(menu.getAttribute('role')).toBe('menu');
    });

    it('should set menu id', () => {
      const menu = createSettingsMenu({
        classPrefix: 'vidply',
        menuClass: 'test-menu',
        menuId: 'my-menu-id',
        items: []
      });

      expect(menu.id).toBe('my-menu-id');
    });

    it('should apply class names', () => {
      const menu = createSettingsMenu({
        classPrefix: 'vidply',
        menuClass: 'custom-menu',
        menuId: 'test-id',
        items: []
      });

      expect(menu.className).toContain('vidply-popup-settings-menu');
      expect(menu.className).toContain('custom-menu');
    });

    it('should create menu items from items array', () => {
      const menu = createSettingsMenu({
        classPrefix: 'vidply',
        menuClass: 'test-menu',
        menuId: 'test-id',
        items: [
          { icon: 'settings', label: 'Item 1' },
          { icon: 'close', label: 'Item 2' }
        ]
      });

      const items = menu.querySelectorAll('button');
      expect(items.length).toBe(2);
    });
  });

  describe('createSettingsMenuItem', () => {
    it('should create a button element', () => {
      const item = createSettingsMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test'
      });

      expect(item.tagName).toBe('BUTTON');
    });

    it('should set button type', () => {
      const item = createSettingsMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test'
      });

      expect(item.getAttribute('type')).toBe('button');
    });

    it('should set role to menuitem', () => {
      const item = createSettingsMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test'
      });

      expect(item.getAttribute('role')).toBe('menuitem');
    });

    it('should set tabindex to -1', () => {
      const item = createSettingsMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test'
      });

      expect(item.getAttribute('tabindex')).toBe('-1');
    });

    it('should add icon when provided', () => {
      const item = createSettingsMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        icon: 'settings',
        label: 'Test'
      });

      expect(item.querySelector('.icon-settings')).not.toBeNull();
    });

    it('should translate i18n keys', () => {
      const item = createSettingsMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'settings.title'
      });

      const textSpan = item.querySelector('span');
      expect(textSpan.textContent).toBe('translated:settings.title');
    });

    it('should attach click handler', () => {
      const onClick = vi.fn();
      const item = createSettingsMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test',
        onClick
      });

      item.click();
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('showSettingsMenu', () => {
    let menu, button;

    beforeEach(() => {
      menu = document.createElement('div');
      menu.style.display = 'none';
      button = document.createElement('button');
      document.body.appendChild(menu);
      document.body.appendChild(button);
    });

    it('should do nothing for null menu', () => {
      expect(() => showSettingsMenu(null, button, 'vidply')).not.toThrow();
    });

    it('should do nothing for null button', () => {
      expect(() => showSettingsMenu(menu, null, 'vidply')).not.toThrow();
    });

    it('should show menu', () => {
      showSettingsMenu(menu, button, 'vidply');
      expect(menu.style.display).toBe('block');
    });

    it('should focus first menu item', () => {
      const menuItem = document.createElement('button');
      menuItem.setAttribute('role', 'menuitem');
      menu.appendChild(menuItem);
      const focusSpy = vi.spyOn(menuItem, 'focus');

      showSettingsMenu(menu, button, 'vidply');
      vi.advanceTimersByTime(100);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should set first item tabindex to 0', () => {
      const menuItem = document.createElement('button');
      menuItem.setAttribute('role', 'menuitem');
      menu.appendChild(menuItem);

      showSettingsMenu(menu, button, 'vidply');

      expect(menuItem.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('hideSettingsMenu', () => {
    let menu, button;

    beforeEach(() => {
      menu = document.createElement('div');
      menu.style.display = 'block';
      button = document.createElement('button');
      document.body.appendChild(menu);
      document.body.appendChild(button);
    });

    it('should do nothing for null menu', () => {
      expect(() => hideSettingsMenu(null, button)).not.toThrow();
    });

    it('should hide menu', () => {
      hideSettingsMenu(menu, button);
      expect(menu.style.display).toBe('none');
    });

    it('should focus trigger button', () => {
      const focusSpy = vi.spyOn(button, 'focus');

      hideSettingsMenu(menu, button);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should handle null button', () => {
      expect(() => hideSettingsMenu(menu, null)).not.toThrow();
      expect(menu.style.display).toBe('none');
    });
  });

  describe('toggleSettingsMenu', () => {
    let menu, button;

    beforeEach(() => {
      menu = document.createElement('div');
      menu.style.display = 'none';
      button = document.createElement('button');
      document.body.appendChild(menu);
      document.body.appendChild(button);
    });

    it('should do nothing for null menu', () => {
      expect(() => toggleSettingsMenu(null, button, 'vidply')).not.toThrow();
    });

    it('should show menu when hidden', () => {
      menu.style.display = 'none';
      toggleSettingsMenu(menu, button, 'vidply');
      expect(menu.style.display).toBe('block');
    });

    it('should hide menu when shown', () => {
      menu.style.display = 'block';
      toggleSettingsMenu(menu, button, 'vidply');
      expect(menu.style.display).toBe('none');
    });
  });

  describe('setupSettingsMenuKeyboard', () => {
    let menu, button, items;

    beforeEach(() => {
      menu = document.createElement('div');
      button = document.createElement('button');
      
      items = [];
      for (let i = 0; i < 3; i++) {
        const item = document.createElement('button');
        item.setAttribute('role', 'menuitem');
        menu.appendChild(item);
        items.push(item);
      }

      document.body.appendChild(menu);
      document.body.appendChild(button);
    });

    it('should return noop function for null menu', () => {
      const cleanup = setupSettingsMenuKeyboard(null, button, vi.fn());
      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
    });

    it('should return cleanup function', () => {
      const cleanup = setupSettingsMenuKeyboard(menu, button, vi.fn());
      expect(typeof cleanup).toBe('function');
    });

    it('should navigate down on ArrowDown', () => {
      setupSettingsMenuKeyboard(menu, button, vi.fn());
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[1].getAttribute('tabindex')).toBe('0');
    });

    it('should navigate up on ArrowUp', () => {
      setupSettingsMenuKeyboard(menu, button, vi.fn());
      items[1].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[0].getAttribute('tabindex')).toBe('0');
    });

    it('should go to first item on Home', () => {
      setupSettingsMenuKeyboard(menu, button, vi.fn());
      items[2].focus();

      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[0].getAttribute('tabindex')).toBe('0');
    });

    it('should go to last item on End', () => {
      setupSettingsMenuKeyboard(menu, button, vi.fn());
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[2].getAttribute('tabindex')).toBe('0');
    });

    it('should call onClose on Escape', () => {
      const onClose = vi.fn();
      setupSettingsMenuKeyboard(menu, button, onClose);

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      menu.dispatchEvent(event);

      expect(onClose).toHaveBeenCalled();
    });

    it('should click item on Enter', () => {
      setupSettingsMenuKeyboard(menu, button, vi.fn());
      const clickSpy = vi.spyOn(items[0], 'click');
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      menu.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should click item on Space', () => {
      setupSettingsMenuKeyboard(menu, button, vi.fn());
      const clickSpy = vi.spyOn(items[0], 'click');
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      menu.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('cleanup should remove event listener', () => {
      const cleanup = setupSettingsMenuKeyboard(menu, button, vi.fn());
      cleanup();

      // After cleanup, keyboard events should not work
      items[0].focus();
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      menu.dispatchEvent(event);

      // First item should still have no tabindex change (listener removed)
      expect(items[1].getAttribute('tabindex')).not.toBe('0');
    });
  });
});
