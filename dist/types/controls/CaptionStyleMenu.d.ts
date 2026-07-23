/**
 * Caption-style menu (font size/family, text & background color, opacity).
 *
 * Extracted from ControlBar and loaded on demand via dynamic import() so the
 * builder code for this relatively rarely-opened panel is not part of the
 * always-loaded core bundle. ControlBar.showCaptionStyleMenu() awaits this
 * module the first time the panel is opened.
 */
import type { ControlBar } from './ControlBar.js';
/**
 * Build and show the caption-style dialog for the given ControlBar. Mirrors
 * the toggle/positioning behavior of the other ControlBar menus by delegating
 * back to the ControlBar's shared DOM-insertion / positioning / close helpers.
 */
export declare function showCaptionStyleMenu(controlBar: ControlBar, button: HTMLElement): void;
//# sourceMappingURL=CaptionStyleMenu.d.ts.map