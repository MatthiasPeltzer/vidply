/**
 * Settings Menu Factory
 * Creates standardized popup settings menus with consistent styling
 */

import { DOMUtils } from './DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';

interface SettingsMenuItemConfig {
    icon?: string;
    label: string;
    onClick?: ((e: Event) => void) | null;
    closeMenuOnClick?: boolean;
}

interface CreateSettingsMenuOptions {
    classPrefix: string;
    menuClass: string;
    menuId: string;
    items?: SettingsMenuItemConfig[];
}

interface CreateSettingsMenuItemOptions {
    classPrefix: string;
    itemClass: string;
    icon?: string;
    label: string;
    onClick?: ((e: Event) => void) | null;
    closeMenuOnClick?: boolean;
}

/**
 * Create a popup settings menu
 * @param {Object} options - Menu options
 * @param {string} options.classPrefix - Class prefix
 * @param {string} options.menuClass - Specific menu class name
 * @param {string} options.menuId - Menu element ID
 * @param {Array} options.items - Array of menu item definitions
 * @returns {HTMLElement} Menu element
 */
export function createSettingsMenu({
    classPrefix,
    menuClass,
    menuId,
    items = []
}: CreateSettingsMenuOptions): HTMLElement {
    const menu = DOMUtils.createElement('div', {
        className: `${classPrefix}-popup-settings-menu ${menuClass}`,
        attributes: {
            'id': menuId,
            'role': 'menu',
            'aria-label': i18n.t('settings.title')
        }
    });

    // Add menu items
    items.forEach((item: SettingsMenuItemConfig) => {
        const menuItem = createSettingsMenuItem({
            classPrefix,
            itemClass: `${menuClass}-item`,
            ...item
        });
        menu.appendChild(menuItem);
    });

    return menu;
}

/**
 * Create a settings menu item
 * @param {Object} options - Item options
 * @param {string} options.classPrefix - Class prefix
 * @param {string} options.itemClass - Item class name
 * @param {string} options.icon - Icon name
 * @param {string} options.label - Item label (i18n key or text)
 * @param {Function} options.onClick - Click handler
 * @param {boolean} options.closeMenuOnClick - Whether to close menu after click
 * @returns {HTMLElement} Menu item button
 */
export function createSettingsMenuItem({
    classPrefix,
    itemClass,
    icon,
    label,
    onClick = null,
    closeMenuOnClick = true
}: CreateSettingsMenuItemOptions): HTMLElement {
    // Check if label is an i18n key
    const isI18nKey = typeof label === 'string' && 
        (label.startsWith('transcript.') || 
         label.startsWith('player.') || 
         label.startsWith('settings.') ||
         label.startsWith('captions.'));
    const labelText = isI18nKey ? (i18n.t(label) || label) : label;

    const button = DOMUtils.createElement('button', {
        className: `${classPrefix}-popup-settings-item ${itemClass}`,
        attributes: {
            'type': 'button',
            'role': 'menuitem',
            'tabindex': '-1'
        }
    });

    if (icon) {
        button.appendChild(createIconElement(icon));
    }

    const text = DOMUtils.createElement('span', {
        textContent: labelText
    });
    button.appendChild(text);

    if (onClick) {
        button.addEventListener('click', (e) => {
            onClick(e);
            // Menu closing is handled by the caller if needed
        });
    }

    return button;
}

/**
 * Show a popup settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button
 * @param {string} classPrefix - Class prefix
 */
export function showSettingsMenu(menu: HTMLElement, button: HTMLElement, classPrefix: string): void {
    if (!menu || !button) return;

    // Position menu relative to button
    menu.style.display = 'block';
    
    // Check if menu would go off-screen
    const menuRect = menu.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Position above or below based on space
    if (buttonRect.top - menuRect.height < 0 && buttonRect.bottom + menuRect.height < viewportHeight) {
        // Position below
        menu.style.top = '100%';
        menu.style.bottom = 'auto';
        DOMUtils.removeClass(menu, `${classPrefix}-menu-above`);
    } else {
        // Position above
        menu.style.bottom = '100%';
        menu.style.top = 'auto';
        DOMUtils.addClass(menu, `${classPrefix}-menu-above`);
    }

    // Focus first item
    const firstItem = menu.querySelector('[role="menuitem"]') as HTMLElement | null;
    if (firstItem) {
        firstItem.setAttribute('tabindex', '0');
        setTimeout(() => firstItem.focus(), 50);
    }
}

/**
 * Hide a popup settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button (to return focus)
 */
export function hideSettingsMenu(menu: HTMLElement, button: HTMLElement | null): void {
    if (!menu) return;

    menu.style.display = 'none';

    // Return focus to trigger button
    if (button && document.contains(button)) {
        button.focus();
    }
}

/**
 * Toggle a popup settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button
 * @param {string} classPrefix - Class prefix
 */
export function toggleSettingsMenu(menu: HTMLElement, button: HTMLElement | null, classPrefix: string): void {
    if (!menu || !button) return;

    if (menu.style.display === 'block') {
        hideSettingsMenu(menu, button);
    } else {
        showSettingsMenu(menu, button, classPrefix);
    }
}

/**
 * Setup keyboard navigation for settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button
 * @param {Function} onClose - Close callback
 * @returns {Function} Cleanup function
 */
export function setupSettingsMenuKeyboard(menu: HTMLElement, button: HTMLElement | null, onClose?: () => void) {
    if (!menu) return () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
        const menuItems = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % menuItems.length;
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === nextIndex ? '0' : '-1');
                });
                menuItems[nextIndex].focus({ preventScroll: false });
                menuItems[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                break;

            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === prevIndex ? '0' : '-1');
                });
                menuItems[prevIndex].focus({ preventScroll: false });
                menuItems[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                break;

            case 'Home':
                e.preventDefault();
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === 0 ? '0' : '-1');
                });
                menuItems[0].focus({ preventScroll: false });
                menuItems[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                break;

            case 'End':
                e.preventDefault();
                const lastIndex = menuItems.length - 1;
                menuItems.forEach((item, idx) => {
                    item.setAttribute('tabindex', idx === lastIndex ? '0' : '-1');
                });
                menuItems[lastIndex].focus({ preventScroll: false });
                menuItems[lastIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                break;

            case 'Escape':
                e.preventDefault();
                if (onClose) {
                    onClose();
                }
                if (button) {
                    button.focus();
                }
                break;

            case 'Enter':
            case ' ':
                e.preventDefault();
                if (document.activeElement && menuItems.includes(document.activeElement as HTMLElement)) {
                    (document.activeElement as HTMLElement).click();
                }
                break;
        }
    };

    menu.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
        menu.removeEventListener('keydown', handleKeyDown);
    };
}

