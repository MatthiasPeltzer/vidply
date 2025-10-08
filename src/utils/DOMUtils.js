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
  }
};

