/**
 * Performance Utilities
 */

/**
 * Debounce function - limits how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - ensures function is called at most once per interval
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Check if current viewport is mobile size
 * @param {number} breakpoint - Mobile breakpoint in pixels (default 768)
 * @returns {boolean} True if mobile
 */
export function isMobile(breakpoint = 768) {
    return window.innerWidth < breakpoint;
}

/**
 * Request animation frame with timeout fallback
 * @param {Function} callback - Function to call
 * @param {number} timeout - Timeout in ms (default 100)
 */
export function rafWithTimeout(callback, timeout = 100) {
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

