/**
 * Menu creation and management utilities
 */

import { DOMUtils } from './DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { focusElement } from './FocusUtils.js';

/**
 * Create a menu item button with icon and text
 * @param {Object} options - Menu item options
 * @param {string} options.classPrefix - Class prefix
 * @param {string} options.itemClass - Menu item class name
 * @param {string} options.icon - Icon name
 * @param {string} options.label - Button label (i18n key or text)
 * @param {string} options.ariaLabel - ARIA label (optional, uses label if not provided)
 * @param {Function} options.onClick - Click handler
 * @param {boolean} options.hasTextClass - Whether to add text class to span
 * @returns {HTMLElement} Menu item button
 */
export function createMenuItem({ classPrefix, itemClass, icon, label, ariaLabel, onClick, hasTextClass = false }) {
    const button = DOMUtils.createElement('button', {
        className: itemClass,
        attributes: {
            'type': 'button',
            'aria-label': ariaLabel || label,
            'tabindex': '-1'
        }
    });
    
    if (icon) {
        button.appendChild(createIconElement(icon));
    }
    
    const text = DOMUtils.createElement('span', {
        textContent: typeof label === 'string' && label.startsWith('transcript.') || label.startsWith('player.') 
            ? i18n.t(label) || label 
            : label,
        className: hasTextClass ? `${classPrefix}-settings-text` : undefined
    });
    button.appendChild(text);
    
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    
    return button;
}

/**
 * Setup keyboard navigation for menu items
 * @param {HTMLElement} menu - Menu container
 * @param {HTMLElement} button - Trigger button
 * @param {string} itemSelector - Selector for menu items
 * @param {Function} onClose - Function to close menu
 */
export function attachMenuKeyboardNavigation(menu, button, itemSelector, onClose) {
    if (!menu) return;
    
    const menuItems = Array.from(menu.querySelectorAll(itemSelector));
    if (menuItems.length === 0) return;

    const handleKeyDown = (e) => {
        const currentIndex = menuItems.indexOf(document.activeElement);
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                const nextIndex = (currentIndex + 1) % menuItems.length;
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === nextIndex ? '0' : '-1');
                });
                menuItems[nextIndex].focus();
                break;
            
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === prevIndex ? '0' : '-1');
                });
                menuItems[prevIndex].focus();
                break;
            
            case 'Home':
                e.preventDefault();
                e.stopPropagation();
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === 0 ? '0' : '-1');
                });
                menuItems[0].focus();
                break;
            
            case 'End':
                e.preventDefault();
                e.stopPropagation();
                const lastIndex = menuItems.length - 1;
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === lastIndex ? '0' : '-1');
                });
                menuItems[lastIndex].focus();
                break;
            
            case 'Enter':
            case ' ':
                e.preventDefault();
                e.stopPropagation();
                if (document.activeElement && menuItems.includes(document.activeElement)) {
                    document.activeElement.click();
                    if (onClose) {
                        setTimeout(() => {
                            if (button && document.contains(button)) {
                                button.focus();
                            }
                        }, 0);
                    }
                }
                break;
            
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                if (onClose) {
                    onClose();
                }
                break;
        }
    };

    menu.addEventListener('keydown', handleKeyDown);
    return handleKeyDown; // Return handler for cleanup
}

/**
 * Focus first menu item and set tabindex
 * @param {HTMLElement} menu - Menu container
 * @param {string} itemSelector - Selector for menu items
 * @param {number} delay - Delay in milliseconds
 */
export function focusFirstMenuItem(menu, itemSelector, delay = 0) {
    if (!menu) return;
    
    setTimeout(() => {
        const menuItems = Array.from(menu.querySelectorAll(itemSelector));
        if (menuItems.length > 0) {
            menuItems.forEach((item, index) => {
                item.setAttribute('tabindex', index === 0 ? '0' : '-1');
            });
            focusElement(menuItems[0], { delay: 0 });
        }
    }, delay);
}

