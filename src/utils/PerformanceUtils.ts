export function debounce<T extends (...args: unknown[]) => void>(func: T, wait = 100): T {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function executedFunction(this: unknown, ...args: unknown[]) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as unknown as T;
}

export function throttle<T extends (...args: unknown[]) => void>(func: T, limit = 100): T {
  let inThrottle = false;
  return function executedFunction(this: unknown, ...args: unknown[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  } as unknown as T;
}

export function isMobile(breakpoint = 768): boolean {
  return window.innerWidth < breakpoint;
}

/** iOS / iPadOS (including iPad desktop mode reporting as MacIntel). */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isIPhone(): boolean {
  return /iPhone|iPod/.test(navigator.userAgent);
}

const DEV_TUNNEL_HOST_SUFFIXES = [
  '.sslip.io',
  '.nip.io',
  '.xip.io',
  '.ddev.site',
  '.ddev.local',
  '.docker.internal'
];

export function isLikelyUnsupportedYoutubeEmbedHost(hostname?: string): boolean {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (!host) {
    return true;
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }
  if (DEV_TUNNEL_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))) {
    return true;
  }
  if (/\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}/.test(host)) {
    return true;
  }
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return true;
  }
  if (host.includes(':')) {
    return true;
  }
  return false;
}

export function shouldUseYoutubeIosLanFallback(): boolean {
  return isIPhone() && isLikelyUnsupportedYoutubeEmbedHost();
}

/**
 * True when the user has requested reduced motion via the OS / browser.
 * Guards against environments without matchMedia (older test runners).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Build scrollIntoView options whose animation honors prefers-reduced-motion:
 * smooth scrolling is downgraded to an instant jump when the user has
 * requested reduced motion (WCAG 2.3.3 Animation from Interactions).
 */
export function reducedMotionScrollOptions(
  block: ScrollLogicalPosition = 'nearest'
): ScrollIntoViewOptions {
  return { behavior: prefersReducedMotion() ? 'auto' : 'smooth', block };
}

/**
 * Nearest scrollable ancestor of `element`, stopping before body/documentElement
 * so the page itself is never returned.
 */
function scrollParentOf(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const scrollsY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
    const scrollsX = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
    if (scrollsY || scrollsX) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Reveal `element` inside its own scroll container without moving the page.
 *
 * `scrollIntoView()` scrolls every scrollable ancestor up to the document, even
 * with `block: 'nearest'`. Calling it while the page is still loading therefore
 * drags the whole viewport to the player, which the visitor sees as the page
 * scrolling on its own. Use this instead whenever the scroll was not requested
 * by the user.
 */
export function scrollIntoViewWithinScrollParent(element: HTMLElement): void {
  const container = scrollParentOf(element);
  if (!container) {
    return;
  }

  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  let top = container.scrollTop;
  if (elementRect.top < containerRect.top) {
    top += elementRect.top - containerRect.top;
  } else if (elementRect.bottom > containerRect.bottom) {
    top += elementRect.bottom - containerRect.bottom;
  }

  let left = container.scrollLeft;
  if (elementRect.left < containerRect.left) {
    left += elementRect.left - containerRect.left;
  } else if (elementRect.right > containerRect.right) {
    left += elementRect.right - containerRect.right;
  }

  if (top === container.scrollTop && left === container.scrollLeft) {
    return;
  }

  container.scrollTo({ top, left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function rafWithTimeout(callback: () => void, timeout = 100): void {
  let called = false;

  const execute = () => {
    if (!called) {
      called = true;
      callback();
    }
  };

  requestAnimationFrame(execute);
  setTimeout(execute, timeout);
}
