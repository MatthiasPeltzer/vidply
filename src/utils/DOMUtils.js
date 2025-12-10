/**
 * DOM manipulation utilities
 */

export const DOMUtils = {
  createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
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
      options.children.forEach(child => {
        if (child) element.appendChild(child);
      });
    }
    
    return element;
  },

  addClass(element, className) {
    if (element && className) {
      element.classList.add(className);
    }
  },

  removeClass(element, className) {
    if (element && className) {
      element.classList.remove(className);
    }
  },

  toggleClass(element, className) {
    if (element && className) {
      element.classList.toggle(className);
    }
  },

  hasClass(element, className) {
    return element && element.classList.contains(className);
  },

  show(element) {
    if (element) {
      element.style.display = '';
    }
  },

  hide(element) {
    if (element) {
      element.style.display = 'none';
    }
  },

  fadeIn(element, duration = 300) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.display = '';
    
    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.min(progress / duration, 1);
      
      element.style.opacity = opacity;
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },

  fadeOut(element, duration = 300) {
    if (!element) return;
    
    const startOpacity = parseFloat(getComputedStyle(element).opacity) || 1;
    let start = null;
    
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.max(startOpacity - (progress / duration), 0);
      
      element.style.opacity = opacity;
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    };
    
    requestAnimationFrame(animate);
  },

  offset(element) {
    if (!element) return { top: 0, left: 0 };
    
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.pageYOffset,
      left: rect.left + window.pageXOffset,
      width: rect.width,
      height: rect.height
    };
  },

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  sanitizeHTML(html) {
    // Basic HTML sanitization - allow safe tags for VTT captions
    // Since we control the HTML (from VTT parsing), we can safely allow these tags
    const temp = document.createElement('div');
    
    // Strip out any potentially dangerous tags/attributes
    // Allow: strong, em, u, span, b, i with class and data-voice attributes
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/javascript:/gi, ''); // Remove javascript: protocol
    
    temp.innerHTML = safeHtml;
    return temp.innerHTML;
  },

  /**
   * Create a tooltip element that is aria-hidden (not read by screen readers)
   * @param {string} text - Tooltip text
   * @param {string} classPrefix - Class prefix for styling
   * @returns {HTMLElement} Tooltip element
   */
  createTooltip(text, classPrefix = 'vidply') {
    const tooltip = this.createElement('span', {
      className: `${classPrefix}-tooltip`,
      textContent: text,
      attributes: {
        'aria-hidden': 'true'
      }
    });
    return tooltip;
  },

  /**
   * Attach a tooltip to an element
   * @param {HTMLElement} element - Element to attach tooltip to
   * @param {string} text - Tooltip text
   * @param {string} classPrefix - Class prefix for styling
   */
  attachTooltip(element, text, classPrefix = 'vidply') {
    if (!element || !text) return;
    
    // Remove existing tooltip if any
    const existingTooltip = element.querySelector(`.${classPrefix}-tooltip`);
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    const tooltip = this.createTooltip(text, classPrefix);
    element.appendChild(tooltip);
    
    // Show tooltip on hover/focus
    const showTooltip = () => {
      tooltip.classList.add(`${classPrefix}-tooltip-visible`);
    };
    
    const hideTooltip = () => {
      tooltip.classList.remove(`${classPrefix}-tooltip-visible`);
    };
    
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
    element.addEventListener('focus', showTooltip);
    element.addEventListener('blur', hideTooltip);
  },

  /**
   * Create visible button text that is hidden by CSS but visible when CSS is disabled
   * @param {string} text - Button text
   * @param {string} classPrefix - Class prefix for styling
   * @returns {HTMLElement} Button text element
   */
  createButtonText(text, classPrefix = 'vidply') {
    const buttonText = this.createElement('span', {
      className: `${classPrefix}-button-text`,
      textContent: text,
      attributes: {
        'aria-hidden': 'true'
      }
    });
    return buttonText;
  }
};

