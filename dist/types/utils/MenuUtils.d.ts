export interface MenuItemOptions {
    classPrefix: string;
    itemClass: string;
    icon?: string;
    label: string;
    ariaLabel?: string;
    onClick?: (e: Event) => void;
    hasTextClass?: boolean;
}
export declare function createMenuItem({ classPrefix, itemClass, icon, label, ariaLabel, onClick, hasTextClass }: MenuItemOptions): HTMLElement;
export declare function attachMenuKeyboardNavigation(menu: HTMLElement | null, button: HTMLElement | null, itemSelector: string, onClose?: () => void): ((e: KeyboardEvent) => void) | undefined;
export declare function focusFirstMenuItem(menu: HTMLElement | null, itemSelector: string, delay?: number): void;
//# sourceMappingURL=MenuUtils.d.ts.map