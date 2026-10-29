# Vidply — TypeScript backlog & optional improvements

Maintained for humans and agents. Audited against the **typescript-developer** skill
(`.cursor/skills/typescript-developer/SKILL.md`, synced from ai-kit `typescript` stack).

**Summary:** Vidply already meets the skill baseline for day-to-day work. Everything
below is **optional** except committing the Prettier rollout when *you* choose to.

---

## Task menu (check off as done)

- [ ] **Phase 0** — Commit Prettier tooling + formatted sources (`demo/` excluded); run `npm run test:all` first
- [ ] **1.1** — Typed `EventEmitter.emit` (conditional payload signature)
- [ ] **1.2** — `Player` / `PlaylistManager` constructor: `Partial<PlayerOptions>` + safe element narrowing
- [ ] **1.3** — ESLint `no-non-null-assertion: error` (optional; after `!` field policy is clear)
- [ ] **2.1** — ControlBar: replace icon `innerHTML` swaps with `replaceChildren(createIconElement(...))`
- [ ] **3.1** — Unit tests for `RichText.ts`
- [ ] **3.2** — Unit tests for `TrackLabelUtils.ts`
- [ ] **3.3** — `StorageManager` tests + coverage ratchet (optional)
- [ ] **4** — `SECURITY.md` 1.2.x; mpcore BDD rule vs missing `specs/bdd/` here
- [ ] **Refactor** — ControlBar overflow extract (see Refactor epic)
- [ ] **Refactor** — ControlBar progress preview extract
- [ ] **Refactor** — Player `load` / `initializeRenderer` → `core/player/`
- [ ] **Refactor** — PlaylistManager panel / carousel vs navigation split
- [ ] **Toolchain (only if/when needed)** — see section below; **not** required on TS 6.0.3 today

---

## Current toolchain (no action required)

Vidply already pins **TypeScript ^6.0.3** in `package.json`. The typescript-developer skill is
**version-agnostic** (strict typing, tsconfig, ESM, tests) — it does **not** require TypeScript 7.

You do **not** need the “Toolchain extras” block for normal feature work on 6.0.3.

---

## Skill-aligned assessment (current state)

| Skill area | Verdict | Evidence |
|------------|---------|----------|
| Compiler baseline | **Met** | `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`, `isolatedModules`; declarations via `tsconfig.build.json` |
| No `any` / ts-comments | **Mostly met** | No `: any` / `@ts-ignore` in `src/`; documented `(button as any)` note in `ControlBar.ts` |
| Casts | **Acceptable with debt** | Small set of `as unknown as` (EventEmitter, Icons, Player) — keep localized; do not add more |
| Public API + events | **Partial** | Strong `PlayerEventMap`; `EventEmitter.emit` still `...args: unknown[]` |
| DOM / security | **Mostly met** | `RichText.ts`, `UrlSafe.ts`, `index.ts` pollution guards; exception: ControlBar icon `innerHTML` (~7 sites) |
| Prettier / verify | **Met** | `package.json` `verify`: typecheck → `format:check` → lint → test → README check; `demo/` in `.prettierignore` |
| Tests | **Strong, thin spots** | 1348+ Vitest tests; ~48% line coverage; no dedicated `TrackLabelUtils` test file; RichText partly via `TrackInfoView.test.js` |
| BDD specs | **Not in this repo** | mpcore rule references `specs/bdd/` under vidply — not present here |

**Definite assignment (`!` on fields):** Used on class fields initialized in init paths. ESLint
`no-non-null-assertion` is **warn** — policy: no new postfix `!`; optional migration later.

**Optional strict tsconfig flags:** `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`
stay **off** — dedicated migration only, not drive-by.

---

## How to read this plan (nothing is mandatory)

| Bucket | Meaning |
|--------|---------|
| **Already good** | Ship features; run `npm run verify` / `test:all` when you change code. |
| **Optional when ready** | Phase 0 — commit Prettier rollout. |
| **Optional later** | Phases 1–4, refactor epic, toolchain — pick zero, one, or many. |

---

## Phase 0 — Optional when ready (Prettier commit)

- Config: `prettier.config.js`, `.prettierignore`, `eslint-config-prettier`, CI/GitLab lint steps, `CONTRIBUTING.md`, `CHANGELOG.md` `[Unreleased]`
- Formatting diff on `src/`, `tests/`, `build/`, docs (not `demo/`)

Before commit (this git root):

1. `npm run test:all`
2. Stage as you prefer; split `chore: Prettier CI` vs `style: apply Prettier` optional
3. `CHANGELOG.md` — curate before release as you usually do

**ai-kit (separate repo, optional):** One line in typescript-developer SKILL: follow `package.json` TypeScript version (6.x → 7.x when upgraded).

---

## Optional later — Phase 1 (TypeScript skill compliance)

### 1.1 Typed `EventEmitter.emit`

**Files:** `src/utils/EventEmitter.ts`, `tests/unit/EventEmitter.test.js`, Player call sites.

```ts
emit<K extends keyof TEvents>(
  event: K,
  ...args: TEvents[K] extends void ? [] : [payload: TEvents[K]]
): this;
```

### 1.2 Constructor / options typing

**Files:** `src/core/Player.ts`, `src/features/PlaylistManager.ts`

- `options?: Partial<PlayerOptions>` at public edge
- Narrow querySelector result (`instanceof HTMLMediaElement` or allowed host types)

### 1.3 ESLint stricter on `!`

Bump `no-non-null-assertion` to `error` only when ready (avoid repo-wide noise on definite-assignment fields).

---

## Optional later — Phase 2 (DOM / CSP)

### 2.1 ControlBar icons without `innerHTML`

**File:** `src/controls/ControlBar.ts` — helper e.g. `replaceIconElement(container, name)` using `createIconElement` from `src/icons/Icons.ts`.

---

## Optional later — Phase 3 (Tests)

- **3.1** — `tests/unit/RichText.test.js`: XSS, allowlist, `rel` on `_blank`, empty input
- **3.2** — `tests/unit/TrackLabelUtils.test.js`: placeholders, Intl, i18n fallback
- **3.3** — `StorageManager` + ratchet `vitest.config.js` thresholds (optional)

---

## Optional later — Phase 4 (Docs / process)

| Item | Action |
|------|--------|
| `SECURITY.md` | Supported versions **1.2.x** |
| mpcore `bdd-specs-vidply.mdc` | Add `specs/bdd/` here or narrow rule to mpc-vidply only |
| Release | `prepublishOnly` → `test:all`; PRs → `verify` + e2e when UI changes |

---

## Optional later — Refactor epic

**Intent:** Same public API (`Player`, `ControlBar`, `PlaylistManager`); extract behind facades (like existing `ThemeManager`, `ResumeManager`, …).

**Rules:** One extraction per PR + `npm run test:all`; no behaviour change in extract PR; package-private modules; avoid circular imports.

### ControlBar (~4.7k lines) → `src/controls/controlBar/`

Order: overflow (has tests) → menu positioning → progress preview → embed chrome rules → button factory (last).

Tests: `tests/unit/ControlBarOverflow.test.js`, `ControlBarDownload.test.js`.

### Player (~3.7k lines) → `src/core/player/`

Extract **media lifecycle**: `load()`, `initializeRenderer()`, renderer teardown, iOS priming. Optional: play overlay / buffering UI.

### PlaylistManager (~2.6k lines) → `src/features/playlist/`

Order: AttributeLoader → TrackNavigation → PanelAndCarousel.

### TranscriptManager (~2.5k lines)

Only when transcript work is active: split sync vs UI vs language selector.

### Refactor will not

- Change npm export map without semver major
- Flip strict tsconfig flags in the same PR as moves
- Big-bang rewrite

**Recommended (optional):** If you both refactor and do Phase 1–2, do emit typing + key tests + icon helper first so new code does not land in files you split next.

---

## Optional later — Toolchain extras (unrelated to “being on TS 6”)

These are **separate, future** chores. None of them fix a problem you have today on **6.0.3**.

| Item | What it is | When to bother |
|------|------------|----------------|
| **Strict tsconfig flags** (`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`) | Extra compiler checks beyond `strict: true`. Vidply has them **off** on purpose. | Only if you want maximum type precision and accept a **dedicated migration PR** (many call-site fixes). Not recommended as drive-by. |
| **TypeScript 7.1** | **Replacing** the compiler major version later (when *you* choose), same as any dependency upgrade. | When 7.1 is released/stable for you: bump `typescript` + matching `@typescript-eslint/*`, run `npm run test:all`, read release notes. **Ignore until then** — 6.0.3 is fine. |
| **ai-kit TS version note** | One sentence in ai-kit’s `typescript-developer` SKILL (“follow repo lockfile”). | Cosmetic; helps agents cite the right major version. Optional anytime; no vidply code change. |
| **BDD `specs/bdd/` scaffold** | Product/behaviour specs for agents (mpcore mentions this; folder **missing** in vidply). | Only if you want BDD like `mpc-vidply` — process/docs, not TypeScript version. |
| **ESLint `!` as error** | Stricter lint on definite-assignment fields (`container!: HTMLElement`). | Optional policy tighten; independent of TS 6 vs 7. |
| **TranscriptManager split** | Refactor epic slice. | When you work heavily on transcript — not toolchain. |

---

## If you do multiple items — suggested order (not required)

1. Phase 0 — Prettier commit
2. 1.1 typed `emit`
3. 3.1 + 3.2 tests
4. 2.1 icons
5. 1.2 constructor typing
6. Phase 4 docs
7. Refactor slices (one PR each)
8. Toolchain extras — **only if scheduled** (TS 7 upgrade, tsconfig migration, BDD, etc.)

Each code change: `npm run verify`; before commit: `npm run test:all`.
