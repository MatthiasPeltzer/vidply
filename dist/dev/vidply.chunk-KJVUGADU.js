/*!
 * VidPly v1.2.17 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/PerformanceUtils.ts
function debounce(func, wait = 100) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
function throttle(func, limit = 100) {
  let inThrottle = false;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
function isMobile(breakpoint = 768) {
  return window.innerWidth < breakpoint;
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
function isIPhone() {
  return /iPhone|iPod/.test(navigator.userAgent);
}
var DEV_TUNNEL_HOST_SUFFIXES = [
  ".sslip.io",
  ".nip.io",
  ".xip.io",
  ".ddev.site",
  ".ddev.local",
  ".docker.internal"
];
function isLikelyUnsupportedYoutubeEmbedHost(hostname) {
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
  if (!host) {
    return true;
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
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
  if (host.includes(":")) {
    return true;
  }
  return false;
}
function shouldUseYoutubeIosLanFallback() {
  return isIPhone() && isLikelyUnsupportedYoutubeEmbedHost();
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function reducedMotionScrollOptions(block = "nearest") {
  return { behavior: prefersReducedMotion() ? "auto" : "smooth", block };
}
function scrollParentOf(element) {
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
function scrollIntoViewWithinScrollParent(element) {
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
  container.scrollTo({ top, left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
function rafWithTimeout(callback, timeout = 100) {
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

export {
  debounce,
  throttle,
  isMobile,
  isIOS,
  isLikelyUnsupportedYoutubeEmbedHost,
  shouldUseYoutubeIosLanFallback,
  reducedMotionScrollOptions,
  scrollIntoViewWithinScrollParent,
  rafWithTimeout
};
//# sourceMappingURL=vidply.chunk-KJVUGADU.js.map
