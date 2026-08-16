const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Collect tabbable elements inside a container, in DOM order (WCAG 2.4.3).
 */
export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1'
  );
}

/**
 * Keep Tab / Shift+Tab within a modal container (WCAG 2.1.2, 2.4.3).
 * Returns true when the key event was handled.
 */
export function trapFocusInContainer(e: KeyboardEvent, container: HTMLElement | null): boolean {
  if (e.key !== 'Tab' || !container) {
    return false;
  }

  const focusable = getFocusableElements(container).filter(
    (el) => el.offsetParent !== null || container.contains(el)
  );
  if (focusable.length === 0) {
    return false;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    return false;
  }

  const active = document.activeElement as HTMLElement | null;
  const within = active !== null && container.contains(active);

  if (e.shiftKey) {
    if (!within || active === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
      return true;
    }
  } else if (!within || active === last) {
    e.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }

  return false;
}

/**
 * Mark all direct children of a container inert except one element.
 * Returns the list of elements this call marked so they can be restored later.
 */
export function setContainerChildrenInert(
  container: HTMLElement,
  except: HTMLElement | null,
  enabled: boolean,
  tracked: Element[]
): Element[] {
  if (!enabled) {
    for (const el of tracked) {
      el.removeAttribute('inert');
    }
    return [];
  }

  const next: Element[] = [];
  for (const child of Array.from(container.children)) {
    if (child === except) {
      continue;
    }
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    const tag = child.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') {
      continue;
    }
    if (!child.hasAttribute('inert')) {
      child.setAttribute('inert', '');
      next.push(child);
    }
  }

  return next;
}

export function focusElement(
  element: HTMLElement | null,
  { delay = 0, preventScroll = true }: { delay?: number; preventScroll?: boolean } = {}
): void {
  if (!element) return;

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (element && document.contains(element)) {
        element.focus({ preventScroll });
      }
    }, delay);
  });
}

export function focusFirstElement(
  container: HTMLElement | null,
  selector: string,
  options: { delay?: number; preventScroll?: boolean } = {}
): void {
  if (!container) return;
  const element = container.querySelector<HTMLElement>(selector);
  if (element) {
    focusElement(element, options);
  }
}
