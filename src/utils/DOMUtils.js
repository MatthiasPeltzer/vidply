/**
 * DOM manipulation utilities
 * Optimized for performance with CSS transitions
 */

export const DOMUtils = {
  /**
   * Create an element with options
   * @param {string} tag - HTML tag name
   * @param {Object} options - Element options
   * @returns {HTMLElement}
   */
  createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        element.setAttribute(key, value);
      }
    }
    
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    
    if (options.style) {
      Object.assign(element.style, options.style);
    }
    
    if (options.children) {
      for (const child of options.children) {
        if (child) element.appendChild(child);
      }
    }
    
    return element;
  },

  /**
   * Show element (remove display:none)
   * @param {HTMLElement} element
   */
  show(element) {
    element?.style && (element.style.display = '');
  },

  /**
   * Hide element
   * @param {HTMLElement} element
   */
  hide(element) {
    element?.style && (element.style.display = 'none');
  },

  /**
   * Fade in element using CSS transitions (GPU accelerated)
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms
   * @param {Function} [onComplete] - Callback when complete
   */
  fadeIn(element, duration = 300, onComplete) {
    if (!element) return;
    
    // Set up initial state
    element.style.opacity = '0';
    element.style.display = '';
    element.style.transition = `opacity ${duration}ms ease`;
    
    // Force reflow to ensure transition works
    element.offsetHeight;
    
    // Trigger transition
    element.style.opacity = '1';
    
    // Cleanup after transition
    if (onComplete) {
      const cleanup = () => {
        element.removeEventListener('transitionend', cleanup);
        onComplete();
      };
      element.addEventListener('transitionend', cleanup, { once: true });
      // Fallback timeout in case transitionend doesn't fire
      setTimeout(cleanup, duration + 50);
    }
  },

  /**
   * Fade out element using CSS transitions (GPU accelerated)
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms
   * @param {Function} [onComplete] - Callback when complete
   */
  fadeOut(element, duration = 300, onComplete) {
    if (!element) return;
    
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = '0';
    
    const cleanup = () => {
      element.removeEventListener('transitionend', cleanup);
      element.style.display = 'none';
      if (onComplete) onComplete();
    };
    
    element.addEventListener('transitionend', cleanup, { once: true });
    // Fallback timeout in case transitionend doesn't fire
    setTimeout(cleanup, duration + 50);
  },

  /**
   * Get element's offset position and dimensions
   * @param {HTMLElement} element
   * @returns {Object} { top, left, width, height }
   */
  offset(element) {
    if (!element) return { top: 0, left: 0, width: 0, height: 0 };
    
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  },

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHTML(str) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
  },

  /**
   * Basic HTML sanitization for VTT captions
   * Allows safe formatting tags, removes dangerous content
   * @param {string} html - HTML string to sanitize
   * @returns {string} Sanitized HTML
   */
  sanitizeHTML(html) {
    // Remove dangerous content
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=/gi, '') // Event handlers
      .replace(/javascript:/gi, ''); // javascript: protocol
    
    // Use DOM parser for final sanitization
    const temp = document.createElement('div');
    temp.innerHTML = safeHtml;
    return temp.innerHTML;
  },

  /**
   * Create a tooltip element (aria-hidden)
   * @param {string} text - Tooltip text
   * @param {string} classPrefix - Class prefix
   * @returns {HTMLElement}
   */
  createTooltip(text, classPrefix = 'vidply') {
    return this.createElement('span', {
      className: `${classPrefix}-tooltip`,
      textContent: text,
      attributes: { 'aria-hidden': 'true' }
    });
  },

  /**
   * Attach a tooltip to an element with hover/focus behavior
   * @param {HTMLElement} element - Target element
   * @param {string} text - Tooltip text
   * @param {string} classPrefix - Class prefix
   */
  attachTooltip(element, text, classPrefix = 'vidply') {
    if (!element || !text) return;
    
    // Remove existing tooltip
    element.querySelector(`.${classPrefix}-tooltip`)?.remove();
    
    const tooltip = this.createTooltip(text, classPrefix);
    element.appendChild(tooltip);
    
    const visibleClass = `${classPrefix}-tooltip-visible`;
    const show = () => tooltip.classList.add(visibleClass);
    const hide = () => tooltip.classList.remove(visibleClass);
    
    element.addEventListener('mouseenter', show);
    element.addEventListener('mouseleave', hide);
    element.addEventListener('focus', show);
    element.addEventListener('blur', hide);
  },

  /**
   * Create button text element (visible when CSS disabled)
   * @param {string} text - Button text
   * @param {string} classPrefix - Class prefix
   * @returns {HTMLElement}
   */
  createButtonText(text, classPrefix = 'vidply') {
    return this.createElement('span', {
      className: `${classPrefix}-button-text`,
      textContent: text,
      attributes: { 'aria-hidden': 'true' }
    });
  },

  /**
   * Add class to element (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   */
  addClass(element, className) {
    element?.classList?.add(className);
  },

  /**
   * Remove class from element (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   */
  removeClass(element, className) {
    element?.classList?.remove(className);
  },

  /**
   * Toggle class on element (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   */
  toggleClass(element, className) {
    element?.classList?.toggle(className);
  },

  /**
   * Check if element has class (null-safe)
   * @param {HTMLElement} element
   * @param {string} className
   * @returns {boolean}
   */
  hasClass(element, className) {
    return element?.classList?.contains(className) ?? false;
  }
};
