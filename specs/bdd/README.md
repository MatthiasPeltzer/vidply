# BDD specs for AI-generated code (vidply)

Gherkin behaviour specifications for the standalone Vidply player. They describe **what** each public function must do so humans and AI agents can implement or change code without guessing.

## Purpose

- **Before coding:** read the relevant `.feature` file for the module you touch.
- **After coding:** extend scenarios with concrete examples; map them to Vitest unit tests or Playwright e2e tests.
- **Regenerate scaffolds** when new public functions are added: `node scripts/generate-bdd-specs.mjs`

Scaffolds are intentionally **simple** (happy path + one guard per function). Replace placeholders with real values as behaviour is locked by tests.

## Layout

```
specs/bdd/
  README.md          ← this file
  INDEX.md           ← auto-generated module list
  utils/
    UrlSafe.feature  ← mirrors src/utils/UrlSafe.ts
  core/
    Player.feature
  …
```

## Conventions

| Tag | Meaning |
|-----|---------|
| `@vidply` | Player package scope |
| `@ClassName` | Module or class under test |
| `@methodName` | Specific function or method |
| `@happy-path` | Valid input, expected success |
| `@guard` | Invalid/untrusted input, safe failure |
| `@security` | XSS, URL injection, CSP (add manually) |
| `@a11y` | WCAG 2.2 AA behaviour (add manually) |
| `@unit` | Maps to Vitest under `tests/unit/` |
| `@e2e` | Maps to Playwright under `tests/e2e/` |

### Scenario style (start simple)

1. **Given** — minimal context (module loaded, DOM fixture, mock player).
2. **When** — one action (single function call or user step).
3. **Then** — observable outcome (return value, DOM state, event fired).

Add **Examples** tables when the same rule applies to many inputs (see `utils/UrlSafe.feature`).

## Mapping to tests

| BDD | Implementation |
|-----|----------------|
| `@unit` scenarios | `tests/unit/<Module>.test.js` — Vitest `describe` / `it` |
| `@e2e` scenarios | `tests/e2e/*.spec.js` — Playwright |
| Security `@guard` | Must have a matching rejection assertion (null, throw, no DOM mutation) |

Example mapping:

```gherkin
When sanitizePosterUrl is called with "javascript:alert(1)"
Then the result should be null
```

→ `expect(sanitizePosterUrl('javascript:alert(1)')).toBeNull()` in `tests/unit/UrlSafe.test.js`.

## AI agent checklist

When generating or modifying code in `src/`:

1. Open the matching file under `specs/bdd/`.
2. Implement so **all `@happy-path` and `@guard` scenarios pass**.
3. Add concrete scenarios for new public functions before merging.
4. Run `npm run test` and `npm run verify`.
5. Do not weaken `@security` or `@a11y` scenarios without explicit review.

## Commands

```bash
node scripts/generate-bdd-specs.mjs          # refresh scaffolds
node scripts/generate-bdd-specs.mjs --check  # CI: fail if scaffolds drift
npm run test                                 # unit + integration
npm run test:e2e                             # browser scenarios
```

## Reference examples

Fully worked scenarios (not just scaffolds):

- `utils/UrlSafe.feature` — URL allow-list and CSS escaping
- `utils/TimeUtils.feature` — time formatting edge cases
- `utils/Sanitize.feature` — prototype pollution guards
- `core/Player.feature` — playback, volume, security, a11y, lifecycle

Extend other modules from these patterns.
