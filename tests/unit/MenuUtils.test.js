/**
 * Unit Tests: MenuUtils
 * Tests menu creation and keyboard navigation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMenuItem,
  attachMenuKeyboardNavigation,
  focusFirstMenuItem
} from '../../src/utils/MenuUtils.js';

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
    })
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

vi.mock('../../src/utils/FocusUtils.js', () => ({
  focusElement: vi.fn((el) => el?.focus?.())
}));

describe('MenuUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createMenuItem', () => {
    it('should create a button element', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test Label'
      });

      expect(item.tagName).toBe('BUTTON');
    });

    it('should set button type attribute', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test'
      });

      expect(item.getAttribute('type')).toBe('button');
    });

    it('should set tabindex to -1', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test'
      });

      expect(item.getAttribute('tabindex')).toBe('-1');
    });

    it('should apply item class', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'my-menu-item',
        label: 'Test'
      });

      expect(item.className).toBe('my-menu-item');
    });

    it('should add icon when provided', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        icon: 'settings',
        label: 'Test'
      });

      const icon = item.querySelector('.icon-settings');
      expect(icon).not.toBeNull();
    });

    it('should not add icon when not provided', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test'
      });

      expect(item.querySelector('span.icon-settings')).toBeNull();
    });

    it('should add text span with label', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'My Label'
      });

      const textSpan = item.querySelector('span[aria-hidden="true"]');
      expect(textSpan).not.toBeNull();
      expect(textSpan.textContent).toBe('My Label');
    });

    it('should translate i18n keys for label', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'settings.title'
      });

      const textSpan = item.querySelector('span[aria-hidden="true"]');
      expect(textSpan.textContent).toBe('translated:settings.title');
    });

    it('should set aria-label from label', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test Label'
      });

      expect(item.getAttribute('aria-label')).toBe('Test Label');
    });

    it('should use custom ariaLabel when provided', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Label',
        ariaLabel: 'Custom ARIA Label'
      });

      expect(item.getAttribute('aria-label')).toBe('Custom ARIA Label');
    });

    it('should attach click handler', () => {
      const onClick = vi.fn();
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test',
        onClick
      });

      item.click();
      expect(onClick).toHaveBeenCalled();
    });

    it('should add text class when hasTextClass is true', () => {
      const item = createMenuItem({
        classPrefix: 'vidply',
        itemClass: 'menu-item',
        label: 'Test',
        hasTextClass: true
      });

      const textSpan = item.querySelector('span[aria-hidden="true"]');
      expect(textSpan.className).toBe('vidply-settings-text');
    });
  });

  describe('attachMenuKeyboardNavigation', () => {
    let menu, button, items;

    beforeEach(() => {
      menu = document.createElement('div');
      button = document.createElement('button');
      
      items = [];
      for (let i = 0; i < 3; i++) {
        const item = document.createElement('button');
        item.className = 'menu-item';
        item.textContent = `Item ${i}`;
        menu.appendChild(item);
        items.push(item);
      }

      document.body.appendChild(menu);
      document.body.appendChild(button);
    });

    it('should return undefined for null menu', () => {
      const result = attachMenuKeyboardNavigation(null, button, '.menu-item', vi.fn());
      expect(result).toBeUndefined();
    });

    it('should return undefined when no menu items found', () => {
      const emptyMenu = document.createElement('div');
      document.body.appendChild(emptyMenu);

      const result = attachMenuKeyboardNavigation(emptyMenu, button, '.menu-item', vi.fn());
      expect(result).toBeUndefined();
    });

    it('should navigate down with ArrowDown key', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      // Focus first item
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[1].getAttribute('tabindex')).toBe('0');
    });

    it('should navigate up with ArrowUp key', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      items[1].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[0].getAttribute('tabindex')).toBe('0');
    });

    it('should wrap around on ArrowDown from last item', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      items[2].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[0].getAttribute('tabindex')).toBe('0');
    });

    it('should wrap around on ArrowUp from first item', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[2].getAttribute('tabindex')).toBe('0');
    });

    it('should go to first item on Home key', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      items[2].focus();

      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[0].getAttribute('tabindex')).toBe('0');
    });

    it('should go to last item on End key', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      menu.dispatchEvent(event);

      expect(items[2].getAttribute('tabindex')).toBe('0');
    });

    it('should call onClose on Escape key', () => {
      const onClose = vi.fn();
      attachMenuKeyboardNavigation(menu, button, '.menu-item', onClose);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      menu.dispatchEvent(event);

      expect(onClose).toHaveBeenCalled();
    });

    it('should click active item on Enter key', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      const clickSpy = vi.spyOn(items[0], 'click');
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      menu.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should click active item on Space key', () => {
      attachMenuKeyboardNavigation(menu, button, '.menu-item', vi.fn());
      
      const clickSpy = vi.spyOn(items[0], 'click');
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      menu.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('focusFirstMenuItem', () => {
    it('should do nothing for null menu', () => {
      expect(() => focusFirstMenuItem(null, '.menu-item')).not.toThrow();
    });

    it('should set first item tabindex to 0', () => {
      const menu = document.createElement('div');
      const item1 = document.createElement('button');
      item1.className = 'menu-item';
      const item2 = document.createElement('button');
      item2.className = 'menu-item';
      menu.appendChild(item1);
      menu.appendChild(item2);
      document.body.appendChild(menu);

      focusFirstMenuItem(menu, '.menu-item');
      vi.advanceTimersByTime(100);

      expect(item1.getAttribute('tabindex')).toBe('0');
      expect(item2.getAttribute('tabindex')).toBe('-1');
    });

    it('should respect delay parameter', () => {
      const menu = document.createElement('div');
      const item = document.createElement('button');
      item.className = 'menu-item';
      menu.appendChild(item);
      document.body.appendChild(menu);

      focusFirstMenuItem(menu, '.menu-item', 200);
      vi.advanceTimersByTime(100);

      expect(item.getAttribute('tabindex')).toBeNull();

      vi.advanceTimersByTime(100);
      expect(item.getAttribute('tabindex')).toBe('0');
    });

    it('should handle menu with no items', () => {
      const menu = document.createElement('div');
      document.body.appendChild(menu);

      expect(() => focusFirstMenuItem(menu, '.menu-item')).not.toThrow();
    });
  });
});
