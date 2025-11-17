/**
 * Resize Handles Factory
 * Creates and manages resize handle DOM elements for draggable/resizable windows.
 * Note: This only creates DOM elements. For actual resize behavior, use DraggableResizable class.
 */

import { DOMUtils } from './DOMUtils.js';

/**
 * Create resize handles for an element
 * @param {HTMLElement} element - Element to attach handles to
 * @param {string} classPrefix - Class prefix (e.g., 'vidply')
 * @param {string} handlePrefix - Specific handle prefix (e.g., 'transcript-resize', 'sign-resize')
 * @returns {Array} Array of handle objects with direction and element
 */
export function createResizeHandles(element, classPrefix, handlePrefix) {
    const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    const createdHandles = [];

    handles.forEach(direction => {
        const handle = DOMUtils.createElement('div', {
            className: `${classPrefix}-resize-handle ${classPrefix}-resize-handle-${direction} ${classPrefix}-${handlePrefix}-${direction}`
        });
        element.appendChild(handle);
        createdHandles.push({ direction, element: handle });
    });

    return createdHandles;
}

/**
 * Remove all resize handles from an element
 * @param {HTMLElement} element - Element to remove handles from
 * @param {string} classPrefix - Class prefix
 */
export function removeResizeHandles(element, classPrefix) {
    const handles = element.querySelectorAll(`.${classPrefix}-resize-handle`);
    handles.forEach(handle => {
        if (handle.parentNode) {
            handle.parentNode.removeChild(handle);
        }
    });
}

/**
 * Toggle resizable state class on element
 * @param {HTMLElement} element - Element to toggle state on
 * @param {string} classPrefix - Class prefix
 * @param {boolean} isResizable - Whether element should be resizable
 */
export function toggleResizableState(element, classPrefix, isResizable) {
    if (isResizable) {
        DOMUtils.addClass(element, `${classPrefix}-resizable`);
    } else {
        DOMUtils.removeClass(element, `${classPrefix}-resizable`);
    }
}

/**
 * Get cursor style for a resize direction
 * @param {string} direction - Direction (n, s, e, w, ne, nw, se, sw)
 * @returns {string} CSS cursor value
 */
export function getCursorForDirection(direction) {
    const cursorMap = {
        'n': 'ns-resize',
        's': 'ns-resize',
        'e': 'ew-resize',
        'w': 'ew-resize',
        'ne': 'nesw-resize',
        'sw': 'nesw-resize',
        'nw': 'nwse-resize',
        'se': 'nwse-resize'
    };
    return cursorMap[direction] || 'default';
}

