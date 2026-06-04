/**
 * Options accepted by {@link DOMUtils.createElement}.
 *
 * `innerHTML` is deliberately **not** exposed here. Code that needs to
 * inject raw markup must do so explicitly at the call site where the
 * source of the markup is auditable; DOMUtils is the "safe by default"
 * surface.
 */
export interface CreateElementOptions {
  className?: string;
  attributes?: Record<string, string | undefined>;
  textContent?: string;
  style?: Partial<CSSStyleDeclaration>;
  children?: (Node | null | undefined)[];
}

function createElementImpl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: CreateElementOptions
): HTMLElementTagNameMap[K];
function createElementImpl(tag: string, options?: CreateElementOptions): HTMLElement;
function createElementImpl(tag: string, options: CreateElementOptions = {}): HTMLElement {
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
}

export const DOMUtils = {
  createElement: createElementImpl,

  show(element: HTMLElement | null | undefined): void {
    if (element?.style) {
      element.style.display = '';
    }
  },

  hide(element: HTMLElement | null | undefined): void {
    if (element?.style) {
      element.style.display = 'none';
    }
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
    return str.replace(/[&<>"']/g, char => escapeMap[char] ?? char);
  },

  /**
   * Render a WebVTT cue's text safely.
   *
   * The previous implementation ran a regex-based blacklist over the cue
   * string and assigned the result to `innerHTML`, which is a known-unsafe
   * pattern (mutation-XSS bypasses, attribute-name tricks, etc.). Caption
   * text on most sites is fetched verbatim from external `.vtt` files that
   * the embedding page has no control over (third-party HLS/DASH manifests,
   * user-supplied playlists, ...) so this code path is reachable by
   * untrusted authors.
   *
   * The new implementation tokenizes only the WebVTT inline tags allowed by
   * the spec (`<b>`, `<i>`, `<u>`, `<c[.class]>`, `<v authorName>`) and
   * builds the resulting DOM via `document.createElement` /
   * `document.createTextNode`. Anything else (script, iframe, attributes,
   * URL schemes, character refs, ...) is rendered as literal text.
   *
   * Cue input is hard-capped at 10,000 characters before parsing to
   * eliminate ReDoS and runaway-DOM concerns.
   */
  renderVTTToDOM(text: string): DocumentFragment {
    const MAX_CUE_LENGTH = 10_000;
    const safeInput = text.length > MAX_CUE_LENGTH ? text.slice(0, MAX_CUE_LENGTH) : text;
    const fragment = document.createDocumentFragment();
    const stack: HTMLElement[] = [];

    const append = (node: Node): void => {
      const target = stack[stack.length - 1] ?? fragment;
      target.appendChild(node);
    };

    const tagPattern = /<(\/)?([a-z])(?:\.([\w.-]{1,200}))?(?:\s+([^<>]{0,500}))?>/i;
    let cursor = 0;

    while (cursor < safeInput.length) {
      const remaining = safeInput.slice(cursor);
      const match = tagPattern.exec(remaining);
      if (!match || match.index === undefined) {
        append(document.createTextNode(remaining));
        break;
      }

      if (match.index > 0) {
        append(document.createTextNode(remaining.slice(0, match.index)));
      }

      const [, closing, tagLetter, classList, voiceName] = match;
      const tag = (tagLetter || '').toLowerCase();

      if (closing) {
        const top = stack[stack.length - 1];
        if (top && top.dataset.vttTag === tag) {
          stack.pop();
        }
      } else if (tag === 'b' || tag === 'i' || tag === 'u') {
        const elementTag = tag === 'b' ? 'strong' : tag === 'i' ? 'em' : 'u';
        const node = document.createElement(elementTag);
        node.dataset.vttTag = tag;
        append(node);
        stack.push(node);
      } else if (tag === 'c') {
        const span = document.createElement('span');
        span.dataset.vttTag = tag;
        span.classList.add('caption-class');
        if (classList) {
          for (const cls of classList.split('.').filter(Boolean)) {
            if (/^[\w-]+$/.test(cls)) {
              span.classList.add(`caption-class-${cls}`);
            }
          }
        }
        append(span);
        stack.push(span);
      } else if (tag === 'v') {
        const span = document.createElement('span');
        span.dataset.vttTag = tag;
        span.classList.add('caption-voice');
        if (voiceName) {
          // Voice name is text; never an attribute. data-voice mirrors the
          // historical hook used by `caption-voice` styles.
          span.dataset.voice = voiceName.trim().slice(0, 200);
        }
        append(span);
        stack.push(span);
      } else {
        // Unknown tag — render literally as escaped text so authors can see
        // the bug without it becoming an injection vector.
        append(document.createTextNode(match[0]));
      }

      cursor += match.index + match[0].length;
    }

    return fragment;
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
