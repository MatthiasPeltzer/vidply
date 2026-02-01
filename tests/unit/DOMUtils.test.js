/**
 * DOMUtils Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DOMUtils } from '../../src/utils/DOMUtils.js';

describe('DOMUtils', () => {
  describe('createElement', () => {
    it('should create an element with the specified tag', () => {
      const div = DOMUtils.createElement('div');
      expect(div.tagName).toBe('DIV');
    });

    it('should apply className', () => {
      const div = DOMUtils.createElement('div', { className: 'test-class' });
      expect(div.className).toBe('test-class');
    });

    it('should apply attributes', () => {
      const button = DOMUtils.createElement('button', {
        attributes: {
          'aria-label': 'Play',
          'data-action': 'play',
          'disabled': 'true'
        }
      });
      expect(button.getAttribute('aria-label')).toBe('Play');
      expect(button.getAttribute('data-action')).toBe('play');
      expect(button.getAttribute('disabled')).toBe('true');
    });

    it('should set innerHTML', () => {
      const div = DOMUtils.createElement('div', { innerHTML: '<span>Test</span>' });
      expect(div.innerHTML).toBe('<span>Test</span>');
      expect(div.querySelector('span')).toBeTruthy();
    });

    it('should set textContent', () => {
      const span = DOMUtils.createElement('span', { textContent: 'Hello World' });
      expect(span.textContent).toBe('Hello World');
    });

    it('should apply inline styles', () => {
      const div = DOMUtils.createElement('div', {
        style: {
          color: 'red',
          fontSize: '16px',
          display: 'flex'
        }
      });
      expect(div.style.color).toBe('red');
      expect(div.style.fontSize).toBe('16px');
      expect(div.style.display).toBe('flex');
    });

    it('should append children', () => {
      const child1 = document.createElement('span');
      child1.textContent = 'Child 1';
      const child2 = document.createElement('span');
      child2.textContent = 'Child 2';

      const parent = DOMUtils.createElement('div', {
        children: [child1, child2]
      });

      expect(parent.children).toHaveLength(2);
      expect(parent.children[0].textContent).toBe('Child 1');
      expect(parent.children[1].textContent).toBe('Child 2');
    });

    it('should skip null/undefined children', () => {
      const child = document.createElement('span');
      const parent = DOMUtils.createElement('div', {
        children: [null, child, undefined]
      });

      expect(parent.children).toHaveLength(1);
    });

    it('should combine multiple options', () => {
      const child = DOMUtils.createElement('span', { textContent: 'Inner' });
      const element = DOMUtils.createElement('button', {
        className: 'btn btn-primary',
        attributes: { 'aria-label': 'Submit' },
        style: { backgroundColor: 'blue' },
        children: [child]
      });

      expect(element.className).toBe('btn btn-primary');
      expect(element.getAttribute('aria-label')).toBe('Submit');
      expect(element.style.backgroundColor).toBe('blue');
      expect(element.children).toHaveLength(1);
    });
  });

  describe('show', () => {
    it('should remove display:none from element', () => {
      const element = document.createElement('div');
      element.style.display = 'none';
      
      DOMUtils.show(element);
      
      expect(element.style.display).toBe('');
    });

    it('should handle null element gracefully', () => {
      expect(() => DOMUtils.show(null)).not.toThrow();
    });
  });

  describe('hide', () => {
    it('should set display to none', () => {
      const element = document.createElement('div');
      
      DOMUtils.hide(element);
      
      expect(element.style.display).toBe('none');
    });

    it('should handle null element gracefully', () => {
      expect(() => DOMUtils.hide(null)).not.toThrow();
    });
  });

  describe('fadeIn', () => {
    it('should set initial opacity and trigger transition', () => {
      const element = document.createElement('div');
      element.style.display = 'none';
      
      DOMUtils.fadeIn(element, 300);
      
      expect(element.style.display).toBe('');
      expect(element.style.transition).toContain('opacity');
      expect(element.style.opacity).toBe('1');
    });

    it('should call onComplete callback', async () => {
      const element = document.createElement('div');
      const onComplete = vi.fn();
      
      DOMUtils.fadeIn(element, 50, onComplete);
      
      // Wait for timeout fallback
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle null element gracefully', () => {
      expect(() => DOMUtils.fadeIn(null)).not.toThrow();
    });
  });

  describe('fadeOut', () => {
    it('should set opacity to 0', () => {
      const element = document.createElement('div');
      element.style.opacity = '1';
      
      DOMUtils.fadeOut(element, 300);
      
      expect(element.style.opacity).toBe('0');
      expect(element.style.transition).toContain('opacity');
    });

    it('should call onComplete callback', async () => {
      const element = document.createElement('div');
      const onComplete = vi.fn();
      
      DOMUtils.fadeOut(element, 50, onComplete);
      
      // Wait for timeout fallback
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle null element gracefully', () => {
      expect(() => DOMUtils.fadeOut(null)).not.toThrow();
    });
  });

  describe('offset', () => {
    it('should return position and dimensions', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      const result = DOMUtils.offset(element);
      
      expect(result).toHaveProperty('top');
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
    });

    it('should return zeros for null element', () => {
      const result = DOMUtils.offset(null);
      
      expect(result).toEqual({ top: 0, left: 0, width: 0, height: 0 });
    });
  });

  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(DOMUtils.escapeHTML('<script>')).toBe('&lt;script&gt;');
      expect(DOMUtils.escapeHTML('A & B')).toBe('A &amp; B');
      expect(DOMUtils.escapeHTML('"quoted"')).toBe('&quot;quoted&quot;');
      expect(DOMUtils.escapeHTML("it's")).toBe("it&#x27;s");
    });

    it('should handle strings with multiple special characters', () => {
      const input = '<div class="test" data-value=\'1 & 2\'>';
      const expected = '&lt;div class=&quot;test&quot; data-value=&#x27;1 &amp; 2&#x27;&gt;';
      expect(DOMUtils.escapeHTML(input)).toBe(expected);
    });

    it('should return unchanged string without special characters', () => {
      expect(DOMUtils.escapeHTML('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = DOMUtils.sanitizeHTML(input);
      expect(result).not.toContain('<script');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });

    it('should remove iframe tags', () => {
      const input = '<p>Test</p><iframe src="evil.com"></iframe>';
      const result = DOMUtils.sanitizeHTML(input);
      expect(result).not.toContain('<iframe');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = DOMUtils.sanitizeHTML(input);
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = DOMUtils.sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('should preserve safe formatting tags', () => {
      const input = '<b>Bold</b> <i>Italic</i> <u>Underline</u>';
      const result = DOMUtils.sanitizeHTML(input);
      expect(result).toContain('<b>Bold</b>');
      expect(result).toContain('<i>Italic</i>');
      expect(result).toContain('<u>Underline</u>');
    });
  });

  describe('createTooltip', () => {
    it('should create a tooltip span element', () => {
      const tooltip = DOMUtils.createTooltip('Test tooltip');
      
      expect(tooltip.tagName).toBe('SPAN');
      expect(tooltip.textContent).toBe('Test tooltip');
      expect(tooltip.className).toBe('vidply-tooltip');
      expect(tooltip.getAttribute('aria-hidden')).toBe('true');
    });

    it('should use custom class prefix', () => {
      const tooltip = DOMUtils.createTooltip('Test', 'custom');
      expect(tooltip.className).toBe('custom-tooltip');
    });
  });

  describe('createButtonText', () => {
    it('should create a button text span', () => {
      const text = DOMUtils.createButtonText('Play');
      
      expect(text.tagName).toBe('SPAN');
      expect(text.textContent).toBe('Play');
      expect(text.className).toBe('vidply-button-text');
      expect(text.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('class manipulation methods', () => {
    let element;

    beforeEach(() => {
      element = document.createElement('div');
    });

    describe('addClass', () => {
      it('should add a class to element', () => {
        DOMUtils.addClass(element, 'test-class');
        expect(element.classList.contains('test-class')).toBe(true);
      });

      it('should handle null element gracefully', () => {
        expect(() => DOMUtils.addClass(null, 'test')).not.toThrow();
      });
    });

    describe('removeClass', () => {
      it('should remove a class from element', () => {
        element.classList.add('test-class');
        DOMUtils.removeClass(element, 'test-class');
        expect(element.classList.contains('test-class')).toBe(false);
      });

      it('should handle null element gracefully', () => {
        expect(() => DOMUtils.removeClass(null, 'test')).not.toThrow();
      });
    });

    describe('toggleClass', () => {
      it('should toggle a class on element', () => {
        DOMUtils.toggleClass(element, 'test-class');
        expect(element.classList.contains('test-class')).toBe(true);
        
        DOMUtils.toggleClass(element, 'test-class');
        expect(element.classList.contains('test-class')).toBe(false);
      });

      it('should handle null element gracefully', () => {
        expect(() => DOMUtils.toggleClass(null, 'test')).not.toThrow();
      });
    });

    describe('hasClass', () => {
      it('should return true if element has class', () => {
        element.classList.add('test-class');
        expect(DOMUtils.hasClass(element, 'test-class')).toBe(true);
      });

      it('should return false if element does not have class', () => {
        expect(DOMUtils.hasClass(element, 'nonexistent')).toBe(false);
      });

      it('should return false for null element', () => {
        expect(DOMUtils.hasClass(null, 'test')).toBe(false);
      });
    });
  });
});
