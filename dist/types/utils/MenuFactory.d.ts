/**
 * Menu Factory - Centralized menu creation and management
 * Reduces code duplication across ControlBar menu methods
 */
import type { Player } from '../core/Player.js';
interface DividerMenuItem {
    type: 'divider';
}
interface HeaderMenuItem {
    type: 'header';
    text: string;
}
interface ActionMenuItem {
    type?: 'action';
    text?: string;
    value?: unknown;
    active?: boolean;
    disabled?: boolean;
    icon?: string;
    textClass?: string;
    timeLabel?: string;
    timeAriaLabel?: string;
    onClick?: (value: unknown, index: number) => void;
}
type MenuItem = DividerMenuItem | HeaderMenuItem | ActionMenuItem;
interface CreateMenuOptions {
    player: Player;
    button: HTMLElement;
    menuClass: string;
    ariaLabel: string;
    items?: MenuItem[];
    activeIndex?: number;
    onClose?: (() => void) | null;
    radioGroup?: boolean;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}
interface SpeedMenuOptions {
    player: Player;
    button: HTMLElement;
    currentSpeed: number;
    speeds?: number[];
    onSpeedChange: (value: number) => void;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}
interface CaptionsMenuOptions {
    player: Player;
    button: HTMLElement;
    tracks: Array<{
        label?: string;
        language?: string;
    }>;
    currentTrackIndex: number;
    captionsEnabled: boolean;
    onTrackSelect: (index: number) => void;
    onDisable: () => void;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}
interface ChaptersMenuOptions {
    player: Player;
    button: HTMLElement;
    chapters: Array<{
        startTime: number;
        text: string;
    }> | null | undefined;
    onChapterSelect: (value: number) => void;
    formatTime: (seconds: number) => string;
    formatDuration: (seconds: number) => string;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}
interface QualityMenuOptions {
    player: Player;
    button: HTMLElement;
    qualities: Array<{
        name?: string;
        height?: number;
        index: number;
    }>;
    currentQuality: number;
    isHLS: boolean;
    onQualitySelect: (index: number) => void;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}
/**
 * Create and show a menu with standard positioning and behavior
 * @param {Object} options - Menu configuration
 * @returns {HTMLElement} The created menu element
 */
export declare function createMenu({ player, button, menuClass, ariaLabel, items, activeIndex, onClose, radioGroup, insertIntoDOM, positionMenu, attachCloseHandler }: CreateMenuOptions): HTMLElement | null;
/**
 * Create a speed menu
 */
export declare function createSpeedMenu({ player, button, currentSpeed, speeds, onSpeedChange, insertIntoDOM, positionMenu, attachCloseHandler }: SpeedMenuOptions): HTMLElement | null;
/**
 * Create a captions menu
 */
export declare function createCaptionsMenu({ player, button, tracks, currentTrackIndex, captionsEnabled, onTrackSelect, onDisable, insertIntoDOM, positionMenu, attachCloseHandler }: CaptionsMenuOptions): HTMLElement | null;
/**
 * Create a chapters menu
 */
export declare function createChaptersMenu({ player, button, chapters, onChapterSelect, formatTime, formatDuration, insertIntoDOM, positionMenu, attachCloseHandler }: ChaptersMenuOptions): HTMLElement | null;
/**
 * Create a quality menu
 */
export declare function createQualityMenu({ player, button, qualities, currentQuality, isHLS, onQualitySelect, insertIntoDOM, positionMenu, attachCloseHandler }: QualityMenuOptions): HTMLElement | null;
export {};
//# sourceMappingURL=MenuFactory.d.ts.map