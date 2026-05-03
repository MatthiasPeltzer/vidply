# Contributing to VidPly

Thanks for your interest in improving VidPly! This document is the developer onboarding guide. For high-level usage, see the [README](./README.md).

## Code of Conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md). In short: be respectful, and treat the project as a place where everyone — regardless of disability, language, or experience level — is welcome.

## Quick start

```bash
git clone https://github.com/MatthiasPeltzer/vidply.git
cd vidply
npm install
npm run build
npm test
```

You need:

- **Node.js ≥ 24** (matches the resolved dep tree; pinned via `.nvmrc`).
- **npm ≥ 10**.
- A modern browser for `npm run dev` (`http://localhost:3000`).

## Project layout

```
src/
  core/         Player, AudioDescriptionManager, SignLanguageManager, FloatingPlayerManager
  controls/     ControlBar, CaptionManager, KeyboardManager, SettingsDialog, TranscriptManager
  renderers/    HTML5, YouTube, Vimeo, SoundCloud, HLS (hls.js + native iOS), DASH (dash.js)
  features/     PlaylistManager
  i18n/         Built-in translations (en/de/es/fr/ja); add new languages here
  icons/        SVG icons (no images)
  styles/       Single CSS file with CSS variables
  types/        Public TypeScript declarations (PlayerOptions, PlayerEventMap, …)
  utils/        DOMUtils, EventEmitter, FormUtils, MenuFactory, etc.

build/          Build scripts (esbuild + Terser + clean-css)
docs/           Long-form documentation
demo/           Demo pages used by GitHub Pages
tests/          Vitest (unit + integration) and Playwright (e2e)
```

## TypeScript expectations

- The project is **strict TypeScript** (`tsconfig.json` enables `strict`, `noImplicitAny`, `useUnknownInCatchVariables`, etc.).
- New code must compile with `npm run typecheck` (`tsc --noEmit`).
- Avoid `: any`, `as any`, `as unknown as X` and `!` non-null assertions. If you must, add a one-line comment explaining why and prefer narrowing helpers (`if (x !== null)`) or type guards.
- Public API types live in `src/types/`. When you add an event, add it to `PlayerEventMap`. When you add an option, add it to `PlayerOptions`.

## Accessibility expectations

- Target WCAG 2.2 AA. See `~/.cursor/skills/accessibility/SKILL.md` if you have it; otherwise the [WCAG quick reference](https://www.w3.org/WAI/WCAG22/quickref/).
- Every user-visible string must be rendered through `i18n.t('namespace.key')`. Add the key to all five built-in languages (`src/i18n/languages/{en,de,es,fr,ja}.ts`).
- Every interactive element must be keyboard-operable. Use `<button>` for actions; reach for `role` only as a last resort.
- Run the e2e accessibility suite: `npm run test:e2e -- tests/e2e/keyboard.spec.js`.

## Security expectations

- Never assign untrusted strings to `innerHTML`. Use `textContent` or a typed DOM builder.
- Never interpolate untrusted strings into `style.backgroundImage = 'url(...)'`. Use the URL constructor and validate `protocol` / `hostname`.
- New `fetch` calls take an `AbortSignal` (the player has a per-instance `AbortController`).
- New `JSON.parse` of attacker-influenced data is wrapped in `try/catch` and validated against an explicit shape before merging.

## Branching & commits

- Work on a feature branch off `main`.
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `security:`.
- Reference the issue number where applicable.

Example:

```
fix(captions): render cue text via textContent

Replaces the regex-based sanitizer with a typed DOM builder. Fixes a
class of mutation-XSS bypasses on third-party VTT tracks. No public API
change.

Closes #123
```

## Pull request checklist

Before opening a PR, run:

```bash
npm run typecheck
npm run lint            # if eslint is configured
npm run test            # vitest unit + integration
npm run test:e2e        # Playwright (requires Chromium installed)
npm run build           # produces dist/ to confirm the bundle still builds
```

The PR description should include:

- A summary of the change and the motivation.
- Screenshots or screen recordings for UI changes.
- A note on accessibility impact (keyboard, SR, focus, contrast).
- A note on backwards compatibility (semver bucket: patch / minor / major).

## Adding a new language

1. Copy `src/i18n/languages/en.ts` to `src/i18n/languages/<code>.ts`. Use a valid BCP 47 subtag (`pt`, `pt-BR`, `zh-Hans`, …).
2. Translate every key. Keep `{placeholder}` tokens identical.
3. Register the loader in `src/i18n/translations.ts` (`<code>: () => import('./languages/<code>.js')`).
4. Add a demo at `demo/demo-<code>.html` with `<html lang="<code>">`.
5. `npm run typecheck` and `npm run test`.

## Reporting bugs

Use the GitHub issue tracker. Include:

- Browser + OS + version.
- A minimal reproduction (`.html` file or CodeSandbox link).
- Console output (with `debug: true` enabled if relevant).

For security issues, see [SECURITY.md](./SECURITY.md).

## License

By contributing you agree that your contributions will be licensed under the [GNU GPL v2.0 or later](./LICENSE).
