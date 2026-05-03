#!/usr/bin/env node
// Light "docs ↔ types" drift check.
// Asserts that every `player.<name>(...)` example in README.md resolves to
// either a known method on the Player class or to one of the manager
// sub-objects we explicitly document. Catches doc/code drift before it
// reaches users.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');
const playerSrc = readFileSync(join(repoRoot, 'src', 'core', 'Player.ts'), 'utf8');

// Crude but effective: match `player.foo(` and `player.bar.baz(`.
const calls = [...readme.matchAll(/\bplayer\.([a-zA-Z][\w.]*)\s*\(/g)].map((m) => m[1]);

// Methods declared on a class body (export class Foo ... { method(...) { } }).
//
// Notable design points:
// - `(?:<[^\n>]*>\s*)?` allows TypeScript generic method declarations like
//   `on<K extends keyof TEvents>(event: K, ...): this { ... }`.
// - `\([^\n]*\)` greedily matches the parameter list within a single line, so
//   default values that themselves contain parens (e.g.
//   `interval: number = (this.options.seekInterval as number)`) don't
//   prematurely terminate the match the way `[^)]*` would. Multi-line
//   parameter lists are out of scope; the codebase keeps signatures on one line.
const methodPattern =
  /^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(?:static\s+)?(?:get\s+|set\s+)?([a-zA-Z][\w$]*)\s*(?:<[^\n>]*>\s*)?\([^\n]*\)\s*[:{]/gm;

const ignoredKeywords = new Set([
  'constructor', 'if', 'for', 'switch', 'while', 'return',
  'function', 'catch', 'do', 'else', 'try'
]);

const collectMethods = (src) =>
  new Set(
    [...src.matchAll(methodPattern)]
      .map((m) => m[1])
      .filter((n) => !ignoredKeywords.has(n))
  );

// Player.ts methods + inherited EventEmitter methods. Player extends
// EventEmitter, so on/off/once/emit/removeAllListeners are all valid on
// player instances and must count as known.
const playerMethods = collectMethods(playerSrc);
const eventEmitterPath = join(repoRoot, 'src', 'utils', 'EventEmitter.ts');
if (existsSync(eventEmitterPath)) {
  const eventEmitterSrc = readFileSync(eventEmitterPath, 'utf8');
  for (const m of collectMethods(eventEmitterSrc)) playerMethods.add(m);
}

// Manager sub-objects: load src/controls/* and core/* and collect method names by file.
const managerFiles = [
  ['transcriptManager', 'src/controls/TranscriptManager.ts'],
  ['captionManager', 'src/controls/CaptionManager.ts'],
  ['signLanguageManager', 'src/core/SignLanguageManager.ts'],
  ['audioDescriptionManager', 'src/core/AudioDescriptionManager.ts'],
  ['playlistManager', 'src/features/PlaylistManager.ts'],
  ['controlBar', 'src/controls/ControlBar.ts'],
  ['floatingPlayerManager', 'src/core/FloatingPlayerManager.ts']
];

const managers = new Map();
for (const [key, path] of managerFiles) {
  const fullPath = join(repoRoot, path);
  if (!existsSync(fullPath)) continue;
  const src = readFileSync(fullPath, 'utf8');
  managers.set(key, collectMethods(src));
}

const errors = [];
for (const call of calls) {
  const segments = call.split('.');
  if (segments.length === 1) {
    if (!playerMethods.has(segments[0])) {
      // Some examples reference fields like `player.options`, allow that.
      const fieldPattern = new RegExp(`(^|\\s)${segments[0]}\\s*[:!?]`);
      if (!fieldPattern.test(playerSrc)) {
        errors.push(`README references unknown player method: player.${call}()`);
      }
    }
    continue;
  }

  const [first, ...rest] = segments;
  const methodName = rest[rest.length - 1];
  if (!managers.has(first)) {
    errors.push(`README references unknown player sub-object: player.${first}.${rest.join('.')}()`);
    continue;
  }
  const methods = managers.get(first);
  if (!methods.has(methodName)) {
    errors.push(`README references unknown method: player.${first}.${rest.join('.')}() (no ${methodName} in ${first})`);
  }
}

if (errors.length > 0) {
  console.error('README ↔ types drift detected:');
  for (const err of errors) console.error('  - ' + err);
  process.exit(1);
}

console.log('README ↔ types: OK (' + calls.length + ' call sites checked)');
