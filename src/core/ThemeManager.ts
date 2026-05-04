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

import { isForbiddenKey } from '../utils/Sanitize.js';
import type { Player } from './Player.js';

export type ThemeName = 'dark' | 'light' | 'minimal' | 'high-contrast';

export const PLAYER_THEMES: readonly ThemeName[] = ['dark', 'light', 'minimal', 'high-contrast'];

/**
 * Validate a CSS variable name before it reaches `setProperty`. The
 * browser would silently drop unparseable names; the bigger risk is an
 * attacker smuggling `;` / `:` to escape into another declaration, so
 * the allow-list is intentionally narrow.
 */
export function isValidThemeVariableName(name: string): boolean {
  return /^--vidply-[A-Za-z0-9_-]{1,64}$/.test(name);
}

export function isValidThemeVariableValue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length > 200) return false;
  return !/[<>{};@\\]/.test(value);
}

export class ThemeManager {
  private readonly player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Apply `options.theme` and validate-and-apply every entry in
   * `options.themeVariables` to the container. Bad entries are logged
   * and skipped so a single malformed override cannot poison siblings.
   */
  apply(): void {
    const player = this.player;
    if (!player.container) return;

    // Clear any previous theme class so switching themes at runtime
    // does not leave two active theme classes on the element.
    const themeClasses = PLAYER_THEMES.map(t => `${player.options.classPrefix}-theme-${t}`);
    player.container.classList.remove(...themeClasses);

    const theme = player.options.theme as ThemeName | undefined;
    if (theme && (PLAYER_THEMES as readonly string[]).includes(theme)) {
      player.container.classList.add(`${player.options.classPrefix}-theme-${theme}`);
    }

    if (player.options.themeVariables && typeof player.options.themeVariables === 'object') {
      for (const [rawKey, rawValue] of Object.entries(player.options.themeVariables)) {
        if (isForbiddenKey(rawKey)) continue;
        const cssVar = rawKey.startsWith('--vidply-') ? rawKey : `--vidply-${rawKey}`;
        if (!isValidThemeVariableName(cssVar)) {
          player.log(`[VidPly] Ignoring invalid theme variable name: ${rawKey}`, 'warn');
          continue;
        }
        if (!isValidThemeVariableValue(rawValue)) {
          player.log(`[VidPly] Ignoring invalid theme variable value for ${cssVar}`, 'warn');
          continue;
        }
        player.container.style.setProperty(cssVar, rawValue);
      }
    }
  }

  /**
   * Swap the active theme at runtime. Emits `themechange` with the old
   * and new names so external consumers (e.g. telemetry) can react.
   */
  set(themeName: ThemeName, customVariables: Record<string, string> = {}): void {
    const player = this.player;
    const previousTheme = player.options.theme;

    player.options.theme = themeName;

    if (customVariables && Object.keys(customVariables).length > 0) {
      player.options.themeVariables = {
        ...player.options.themeVariables,
        ...customVariables
      };
    }

    this.apply();

    player.emit('themechange', {
      theme: themeName,
      previousTheme,
      customVariables: player.options.themeVariables
    });
  }

  get(): ThemeName | undefined {
    return this.player.options.theme as ThemeName | undefined;
  }

  /** Set a single CSS variable override, validating the (name, value)
   *  pair before it reaches the DOM. Callers must pass a string value. */
  setVariable(variableName: string, value: string): void {
    const player = this.player;
    if (!player.container) return;

    const cssVar = variableName.startsWith('--vidply-')
      ? variableName
      : `--vidply-${variableName}`;

    if (!isValidThemeVariableName(cssVar) || !isValidThemeVariableValue(value)) {
      player.log(`[VidPly] Ignoring unsafe setThemeVariable(${variableName})`, 'warn');
      return;
    }

    player.container.style.setProperty(cssVar, value);

    if (!player.options.themeVariables) {
      player.options.themeVariables = {};
    }
    player.options.themeVariables[variableName] = value;
  }

  /**
   * Reset to the default theme (dark) and clear every override that was
   * applied through `options.themeVariables`.
   */
  reset(): void {
    const player = this.player;
    if (player.container && player.options.themeVariables) {
      Object.keys(player.options.themeVariables).forEach(key => {
        const cssVar = key.startsWith('--vidply-') ? key : `--vidply-${key}`;
        player.container.style.removeProperty(cssVar);
      });
    }

    const previousTheme = player.options.theme;
    player.options.theme = 'dark';
    player.options.themeVariables = {};

    this.apply();
    player.emit('themechange', { theme: 'dark', previousTheme });
  }
}
