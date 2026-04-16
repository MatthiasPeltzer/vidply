export interface CreateElementOptions {
  className?: string;
  attributes?: Record<string, string | undefined>;
  innerHTML?: string;
  textContent?: string;
  style?: Partial<CSSStyleDeclaration>;
  children?: (Node | null | undefined)[];
}

export const DOMUtils = {
  createElement(tag: string, options: CreateElementOptions = {}): HTMLElement {
    const element = document.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }

    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        if (value !== undefined) {
          element.setAttribute(key, value);
        }
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

  show(element: HTMLElement | null | undefined): void {
    element?.style && (element.style.display = '');
  },

  hide(element: HTMLElement | null | undefined): void {
    element?.style && (element.style.display = 'none');
  },

  fadeIn(element: HTMLElement | null, duration = 300, onComplete?: () => void): void {
    if (!element) return;

    element.style.opacity = '0';
    element.style.display = '';
    element.style.transition = `opacity ${duration}ms ease`;

    // Force reflow to ensure transition works
    void element.offsetHeight;

    element.style.opacity = '1';

    if (onComplete) {
      let called = false;
      const cleanup = () => {
        if (called) return;
        called = true;
        element.removeEventListener('transitionend', cleanup);
        onComplete();
      };
      element.addEventListener('transitionend', cleanup, { once: true });
      setTimeout(cleanup, duration + 50);
    }
  },

  fadeOut(element: HTMLElement | null, duration = 300, onComplete?: () => void): void {
    if (!element) return;

    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = '0';

    let called = false;
    const cleanup = () => {
      if (called) return;
      called = true;
      element.removeEventListener('transitionend', cleanup);
      element.style.display = 'none';
      if (onComplete) onComplete();
    };

    element.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, duration + 50);
  },

  offset(element: HTMLElement | null): { top: number; left: number; width: number; height: number } {
    if (!element) return { top: 0, left: 0, width: 0, height: 0 };

    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  },

  escapeHTML(str: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
  },

  sanitizeHTML(html: string): string {
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/javascript:/gi, '');

    const temp = document.createElement('div');
    temp.innerHTML = safeHtml;
    return temp.innerHTML;
  },

  createTooltip(text: string, classPrefix = 'vidply'): HTMLElement {
    return this.createElement('span', {
      className: `${classPrefix}-tooltip`,
      textContent: text,
      attributes: { 'aria-hidden': 'true' }
    });
  },

  attachTooltip(element: HTMLElement | null, text: string, classPrefix = 'vidply'): void {
    if (!element || !text) return;

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

  createButtonText(text: string, classPrefix = 'vidply'): HTMLElement {
    return this.createElement('span', {
      className: `${classPrefix}-button-text`,
      textContent: text,
      attributes: { 'aria-hidden': 'true' }
    });
  },

  addClass(element: HTMLElement | null | undefined, className: string): void {
    element?.classList?.add(className);
  },

  removeClass(element: HTMLElement | null | undefined, className: string): void {
    element?.classList?.remove(className);
  },

  toggleClass(element: HTMLElement | null | undefined, className: string): void {
    element?.classList?.toggle(className);
  },

  hasClass(element: HTMLElement | null | undefined, className: string): boolean {
    return element?.classList?.contains(className) ?? false;
  }
};
