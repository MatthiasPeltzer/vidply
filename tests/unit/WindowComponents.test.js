/**
 * Unit Tests: WindowComponents
 * Tests window component creation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createWindowHeader,
  createHeaderSelector,
  createAutoscrollCheckbox
} from '../../src/utils/WindowComponents.js';

// Mock dependencies
vi.mock('../../src/utils/DOMUtils.js', () => ({
  DOMUtils: {
    createElement: vi.fn((tag, options = {}) => {
      const el = document.createElement(tag);
      if (options.className) el.className = options.className;
      if (options.textContent) el.textContent = options.textContent;
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            el.setAttribute(key, String(value));
          }
        });
      }
      return el;
    }),
    attachTooltip: vi.fn()
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

describe('WindowComponents', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('createWindowHeader', () => {
    it('should create header element', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title'
      });

      expect(result.header).toBeDefined();
      expect(result.header.tagName).toBe('DIV');
    });

    it('should set header role and aria-level', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title'
      });

      expect(result.header.getAttribute('role')).toBe('heading');
      expect(result.header.getAttribute('aria-level')).toBe('2');
    });

    it('should set tabindex on header', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title'
      });

      expect(result.header.getAttribute('tabindex')).toBe('0');
    });

    it('should create close button', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title'
      });

      expect(result.closeButton).toBeDefined();
      expect(result.closeButton.tagName).toBe('BUTTON');
    });

    it('should add close icon to close button', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title'
      });

      const icon = result.closeButton.querySelector('.icon-close');
      expect(icon).not.toBeNull();
    });

    it('should attach onClose handler to close button', () => {
      const onClose = vi.fn();
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title',
        onClose
      });

      result.closeButton.click();
      expect(onClose).toHaveBeenCalled();
    });

    it('should create settings button when showSettings is true', () => {
      const onSettingsClick = vi.fn();
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title',
        showSettings: true,
        onSettingsClick
      });

      expect(result.settingsButton).not.toBeNull();
      expect(result.settingsButton.tagName).toBe('BUTTON');
    });

    it('should not create settings button when showSettings is false', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title',
        showSettings: false
      });

      expect(result.settingsButton).toBeNull();
    });

    it('should add settings icon when settings button created', () => {
      const onSettingsClick = vi.fn();
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title',
        showSettings: true,
        onSettingsClick
      });

      const icon = result.settingsButton.querySelector('.icon-settings');
      expect(icon).not.toBeNull();
    });

    it('should attach onSettingsClick handler', () => {
      const onSettingsClick = vi.fn();
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title',
        showSettings: true,
        onSettingsClick
      });

      result.settingsButton.click();
      expect(onSettingsClick).toHaveBeenCalled();
    });

    it('should create title element with text', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'My Title'
      });

      const title = result.leftSide.querySelector('h3');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('My Title');
    });

    it('should return leftSide element', () => {
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title'
      });

      expect(result.leftSide).toBeDefined();
      expect(result.leftSide.tagName).toBe('DIV');
    });

    it('should add leftContent elements', () => {
      const customElement = document.createElement('span');
      customElement.className = 'custom';
      
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title',
        leftContent: [customElement]
      });

      const custom = result.leftSide.querySelector('.custom');
      expect(custom).not.toBeNull();
    });

    it('should skip null elements in leftContent', () => {
      const customElement = document.createElement('span');
      customElement.className = 'custom';
      
      const result = createWindowHeader({
        classPrefix: 'vidply',
        headerClass: 'test-header',
        titleText: 'Test Title',
        leftContent: [null, customElement, null]
      });

      expect(result.leftSide.querySelectorAll('.custom').length).toBe(1);
    });
  });

  describe('createHeaderSelector', () => {
    it('should create label element', () => {
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'lang-select',
        options: []
      });

      expect(result.label).toBeDefined();
      expect(result.label.tagName).toBe('LABEL');
    });

    it('should set label for attribute', () => {
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'my-select-id',
        options: []
      });

      expect(result.label.getAttribute('for')).toBe('my-select-id');
    });

    it('should translate label text', () => {
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'lang-select',
        options: []
      });

      expect(result.label.textContent).toBe('translated:settings.language');
    });

    it('should create select element', () => {
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'lang-select',
        options: []
      });

      expect(result.select).toBeDefined();
      expect(result.select.tagName).toBe('SELECT');
    });

    it('should set select id', () => {
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'my-select',
        options: []
      });

      expect(result.select.id).toBe('my-select');
    });

    it('should create options from array', () => {
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'lang-select',
        options: [
          { value: 'en', text: 'English' },
          { value: 'de', text: 'German' }
        ]
      });

      const options = result.select.querySelectorAll('option');
      expect(options.length).toBe(2);
      expect(options[0].value).toBe('en');
      expect(options[0].textContent).toBe('English');
      expect(options[1].value).toBe('de');
      expect(options[1].textContent).toBe('German');
    });

    it('should set selected option', () => {
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'lang-select',
        options: [
          { value: 'en', text: 'English' },
          { value: 'de', text: 'German', selected: true }
        ]
      });

      const options = result.select.querySelectorAll('option');
      expect(options[1].selected).toBe(true);
    });

    it('should attach onChange handler', () => {
      const onChange = vi.fn();
      const result = createHeaderSelector({
        classPrefix: 'vidply',
        selectClass: 'test-select',
        labelText: 'settings.language',
        selectId: 'lang-select',
        options: [{ value: 'en', text: 'English' }],
        onChange
      });

      result.select.dispatchEvent(new Event('change'));
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('createAutoscrollCheckbox', () => {
    it('should create label element', () => {
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'autoscroll-checkbox',
        labelText: 'transcript.autoscroll'
      });

      expect(result.tagName).toBe('LABEL');
    });

    it('should set label for attribute', () => {
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'my-checkbox',
        labelText: 'transcript.autoscroll'
      });

      expect(result.getAttribute('for')).toBe('my-checkbox');
    });

    it('should contain checkbox input', () => {
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'autoscroll-checkbox',
        labelText: 'transcript.autoscroll'
      });

      const checkbox = result.querySelector('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();
    });

    it('should set checkbox id', () => {
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'my-id',
        labelText: 'transcript.autoscroll'
      });

      const checkbox = result.querySelector('input');
      expect(checkbox.id).toBe('my-id');
    });

    it('should set checkbox checked by default', () => {
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'autoscroll-checkbox',
        labelText: 'transcript.autoscroll',
        checked: true
      });

      const checkbox = result.querySelector('input');
      expect(checkbox.hasAttribute('checked')).toBe(true);
    });

    it('should not set checked when false', () => {
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'autoscroll-checkbox',
        labelText: 'transcript.autoscroll',
        checked: false
      });

      const checkbox = result.querySelector('input');
      expect(checkbox.hasAttribute('checked')).toBe(false);
    });

    it('should contain translated text span', () => {
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'autoscroll-checkbox',
        labelText: 'transcript.autoscroll'
      });

      const textSpan = result.querySelector('span');
      expect(textSpan).not.toBeNull();
      expect(textSpan.textContent).toBe('translated:transcript.autoscroll');
    });

    it('should attach onChange handler to checkbox', () => {
      const onChange = vi.fn();
      const result = createAutoscrollCheckbox({
        classPrefix: 'vidply',
        labelClass: 'autoscroll-label',
        textClass: 'autoscroll-text',
        checkboxId: 'autoscroll-checkbox',
        labelText: 'transcript.autoscroll',
        onChange
      });

      const checkbox = result.querySelector('input');
      checkbox.dispatchEvent(new Event('change'));
      expect(onChange).toHaveBeenCalled();
    });
  });
});
