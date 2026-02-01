/**
 * Vitest Setup File
 * Runs before each test file
 */

import { vi } from 'vitest';

// Mock window.matchMedia (not implemented in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (not implemented in jsdom)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver (not implemented in jsdom)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id));

// Mock HTMLMediaElement methods (not implemented in jsdom)
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

// Mock scrollIntoView (not implemented in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Mock getBoundingClientRect with reasonable defaults
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 800,
  height: 450,
  x: 0,
  y: 0,
  toJSON: () => ({})
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});
