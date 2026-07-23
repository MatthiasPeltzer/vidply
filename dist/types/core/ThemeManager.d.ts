/**
 * Theme + CSS custom-property support extracted from Player.
 *
 * Every path that used to live on `Player.applyTheme` /
 * `Player.setTheme` / `Player.setThemeVariable` / `Player.resetTheme`
 * now routes through this module. Player keeps thin public delegates
 * so existing consumers (`player.setTheme('light')`, etc.) keep
 * working unchanged.
 *
 * The validation rules are deliberately strict: names must start with
 * `--vidply-` followed by `[A-Za-z0-9_-]+`, values must be short and
 * must not contain characters that would let a malicious override
 * escape the declaration or rule. That way a consumer that passes
 * user-supplied text through `setThemeVariable` cannot accidentally
 * turn the player into a CSS-injection sink.
 */
import type { Player } from './Player.js';
export type ThemeName = 'dark' | 'light' | 'minimal' | 'high-contrast';
export declare const PLAYER_THEMES: readonly ThemeName[];
/**
 * Validate a CSS variable name before it reaches `setProperty`. The
 * browser would silently drop unparseable names; the bigger risk is an
 * attacker smuggling `;` / `:` to escape into another declaration, so
 * the allow-list is intentionally narrow.
 */
export declare function isValidThemeVariableName(name: string): boolean;
export declare function isValidThemeVariableValue(value: unknown): value is string;
export declare class ThemeManager {
    private readonly player;
    constructor(player: Player);
    /**
     * Apply `options.theme` and validate-and-apply every entry in
     * `options.themeVariables` to the container. Bad entries are logged
     * and skipped so a single malformed override cannot poison siblings.
     */
    apply(): void;
    /**
     * Swap the active theme at runtime. Emits `themechange` with the old
     * and new names so external consumers (e.g. telemetry) can react.
     */
    set(themeName: ThemeName, customVariables?: Record<string, string>): void;
    get(): ThemeName | undefined;
    /** Set a single CSS variable override, validating the (name, value)
     *  pair before it reaches the DOM. Callers must pass a string value. */
    setVariable(variableName: string, value: string): void;
    /**
     * Reset to the default theme (dark) and clear every override that was
     * applied through `options.themeVariables`.
     */
    reset(): void;
}
//# sourceMappingURL=ThemeManager.d.ts.map