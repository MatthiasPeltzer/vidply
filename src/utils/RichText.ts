/**
 * Minimal RTE HTML sanitiser for host-supplied rich text (e.g. CMS long
 * descriptions). Strips scripts, event handlers, and dangerous URLs while
 * keeping common formatting tags.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a',
  'h2', 'h3', 'h4', 'blockquote', 'span', 'div'
]);

const ALLOWED_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'title', 'target', 'rel'])
};

const FORBIDDEN_URI_PATTERN = /^\s*(javascript|data|vbscript):/i;

function sanitizeNode(root: ParentNode): void {
  const elements = root instanceof Element
    ? Array.from(root.children)
    : Array.from(root.childNodes).filter((node): node is Element => node instanceof Element);

  for (const child of elements) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      while (child.firstChild) {
        child.parentNode?.insertBefore(child.firstChild, child);
      }
      child.remove();
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        child.removeAttribute(attr.name);
        continue;
      }

      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed?.has(name)) {
        child.removeAttribute(attr.name);
      }
    }

    if (tag === 'a') {
      const href = child.getAttribute('href') ?? '';
      if (href === '' || FORBIDDEN_URI_PATTERN.test(href)) {
        child.removeAttribute('href');
      } else if (child.getAttribute('target') === '_blank') {
        const rel = (child.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean);
        if (!rel.includes('noopener')) rel.push('noopener');
        if (!rel.includes('noreferrer')) rel.push('noreferrer');
        child.setAttribute('rel', rel.join(' '));
      }
    }

    sanitizeNode(child);
  }
}

/**
 * Parse `html` and return a sanitised `DocumentFragment` safe to append.
 * Returns an empty fragment for blank input.
 */
export function createSanitizedRichTextFragment(html: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const trimmed = html.trim();
  if (trimmed === '') {
    return fragment;
  }

  const template = document.createElement('template');
  template.innerHTML = trimmed;
  sanitizeNode(template.content);
  fragment.append(...Array.from(template.content.childNodes));
  return fragment;
}

/**
 * Replace `container` children with sanitised rich-text content.
 */
export function setSanitizedRichText(container: HTMLElement, html: string): void {
  container.replaceChildren(...Array.from(createSanitizedRichTextFragment(html).childNodes));
}
