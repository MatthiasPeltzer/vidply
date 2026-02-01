/**
 * Unit Tests: FormUtils
 * Tests form element creation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key) => {
      const translations = {
        'transcript.fontSize': 'Font Size',
        'player.volume': 'Volume',
        'settings.quality': 'Quality',
        'captions.color': 'Text Color'
      };
      return translations[key] || key;
    })
  }
}));

describe('FormUtils', () => {
  let createLabeledSelect, toggleLabeledSelect, preventDragOnElement;

  beforeEach(async () => {
    document.body.innerHTML = '';
    
    const module = await import('../../src/utils/FormUtils.js');
    createLabeledSelect = module.createLabeledSelect;
    toggleLabeledSelect = module.toggleLabeledSelect;
    preventDragOnElement = module.preventDragOnElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('createLabeledSelect', () => {
    it('should create label and select elements', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Volume',
        selectId: 'volume-select'
      });

      expect(result.label).toBeTruthy();
      expect(result.select).toBeTruthy();
      expect(result.label.tagName).toBe('LABEL');
      expect(result.select.tagName).toBe('SELECT');
    });

    it('should set label text', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Volume',
        selectId: 'volume-select'
      });

      expect(result.label.textContent).toBe('Volume');
    });

    it('should translate i18n keys', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'transcript.fontSize',
        selectId: 'font-size-select'
      });

      expect(result.label.textContent).toBe('Font Size');
    });

    it('should set for attribute on label', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Volume',
        selectId: 'volume-select'
      });

      expect(result.label.getAttribute('for')).toBe('volume-select');
    });

    it('should set id on select', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Volume',
        selectId: 'volume-select'
      });

      expect(result.select.getAttribute('id')).toBe('volume-select');
    });

    it('should apply class names', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Volume',
        selectId: 'volume-select'
      });

      expect(result.label.className).toBe('vidply-label');
      expect(result.select.className).toBe('vidply-select');
    });

    it('should add options to select', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Quality',
        selectId: 'quality-select',
        options: [
          { value: '1080', text: '1080p' },
          { value: '720', text: '720p' },
          { value: '480', text: '480p' }
        ]
      });

      const options = result.select.querySelectorAll('option');
      expect(options.length).toBe(3);
      expect(options[0].value).toBe('1080');
      expect(options[0].textContent).toBe('1080p');
    });

    it('should mark selected option', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Quality',
        selectId: 'quality-select',
        options: [
          { value: '1080', text: '1080p' },
          { value: '720', text: '720p', selected: true },
          { value: '480', text: '480p' }
        ]
      });

      const options = result.select.querySelectorAll('option');
      expect(options[1].hasAttribute('selected')).toBe(true);
    });

    it('should attach change handler', () => {
      const onChange = vi.fn();
      
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Quality',
        selectId: 'quality-select',
        onChange,
        options: [
          { value: '1080', text: '1080p' },
          { value: '720', text: '720p' }
        ]
      });

      // Simulate change event
      result.select.dispatchEvent(new Event('change'));
      
      expect(onChange).toHaveBeenCalled();
    });

    it('should hide elements when hidden option is true', () => {
      const result = createLabeledSelect({
        classPrefix: 'vidply',
        labelClass: 'vidply-label',
        selectClass: 'vidply-select',
        labelText: 'Volume',
        selectId: 'volume-select',
        hidden: true
      });

      expect(result.label.getAttribute('style')).toContain('display: none');
      expect(result.select.getAttribute('style')).toContain('display: none');
    });
  });

  describe('toggleLabeledSelect', () => {
    it('should show elements when show is true', () => {
      const label = document.createElement('label');
      const select = document.createElement('select');
      label.style.display = 'none';
      select.style.display = 'none';

      toggleLabeledSelect(label, select, true);

      expect(label.style.display).toBe('block');
      expect(select.style.display).toBe('block');
    });

    it('should hide elements when show is false', () => {
      const label = document.createElement('label');
      const select = document.createElement('select');
      label.style.display = 'block';
      select.style.display = 'block';

      toggleLabeledSelect(label, select, false);

      expect(label.style.display).toBe('none');
      expect(select.style.display).toBe('none');
    });

    it('should handle null label', () => {
      const select = document.createElement('select');
      
      // Should not throw
      expect(() => toggleLabeledSelect(null, select, true)).not.toThrow();
      expect(select.style.display).toBe('block');
    });

    it('should handle null select', () => {
      const label = document.createElement('label');
      
      // Should not throw
      expect(() => toggleLabeledSelect(label, null, true)).not.toThrow();
      expect(label.style.display).toBe('block');
    });
  });

  describe('preventDragOnElement', () => {
    it('should stop propagation on mousedown', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      preventDragOnElement(element);
      
      const event = new MouseEvent('mousedown', { bubbles: true });
      const stopPropagation = vi.spyOn(event, 'stopPropagation');
      
      element.dispatchEvent(event);
      
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should stop propagation on click', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      preventDragOnElement(element);
      
      const event = new MouseEvent('click', { bubbles: true });
      const stopPropagation = vi.spyOn(event, 'stopPropagation');
      
      element.dispatchEvent(event);
      
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should handle null element', () => {
      // Should not throw
      expect(() => preventDragOnElement(null)).not.toThrow();
    });
  });
});
