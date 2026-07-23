/**
 * Settings Menu Factory
 * Creates standardized popup settings menus with consistent styling
 */
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
export declare function createSettingsMenu({ classPrefix, menuClass, menuId, items }: CreateSettingsMenuOptions): HTMLElement;
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
export declare function createSettingsMenuItem({ classPrefix, itemClass, icon, label, onClick, closeMenuOnClick: _closeMenuOnClick }: CreateSettingsMenuItemOptions): HTMLElement;
/**
 * Show a popup settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button
 * @param {string} classPrefix - Class prefix
 */
export declare function showSettingsMenu(menu: HTMLElement, button: HTMLElement, classPrefix: string): void;
/**
 * Hide a popup settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button (to return focus)
 */
export declare function hideSettingsMenu(menu: HTMLElement, button: HTMLElement | null): void;
/**
 * Toggle a popup settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button
 * @param {string} classPrefix - Class prefix
 */
export declare function toggleSettingsMenu(menu: HTMLElement, button: HTMLElement | null, classPrefix: string): void;
/**
 * Setup keyboard navigation for settings menu
 * @param {HTMLElement} menu - Menu element
 * @param {HTMLElement} button - Trigger button
 * @param {Function} onClose - Close callback
 * @returns {Function} Cleanup function
 */
export declare function setupSettingsMenuKeyboard(menu: HTMLElement, button: HTMLElement | null, onClose?: () => void): () => void;
export {};
//# sourceMappingURL=SettingsMenuFactory.d.ts.map