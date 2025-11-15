/**
 * Focus management utilities
 */

/**
 * Safely focus an element after DOM updates
 * @param {HTMLElement} element - Element to focus
 * @param {Object} options - Focus options
 * @param {number} options.delay - Delay in milliseconds (default: 0)
 * @param {boolean} options.preventScroll - Prevent scroll on focus (default: true)
 */
export function focusElement(element, { delay = 0, preventScroll = true } = {}) {
    if (!element) return;
    
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (element && document.contains(element)) {
                element.focus({ preventScroll });
            }
        }, delay);
    });
}

/**
 * Focus first element matching selector in container
 * @param {HTMLElement} container - Container to search in
 * @param {string} selector - CSS selector
 * @param {Object} options - Focus options
 */
export function focusFirstElement(container, selector, options = {}) {
    if (!container) return;
    const element = container.querySelector(selector);
    if (element) {
        focusElement(element, options);
    }
}

