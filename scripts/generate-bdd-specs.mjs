#!/usr/bin/env node
/**
 * Scaffold Gherkin BDD feature files from vidply TypeScript source.
 *
 * Usage (from .libs/vidply):
 *   node scripts/generate-bdd-specs.mjs
 *   node scripts/generate-bdd-specs.mjs --check   # exit 1 if specs drift
 *
 * Generated files live under specs/bdd/ and mirror src/ layout.
 * Hand-edit scenarios after generation — the script only creates simple starters.
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'specs', 'bdd');
const CHECK = process.argv.includes('--check');

const SKIP_METHODS = new Set(['constructor']);

/** @typedef {{ kind: 'function' | 'method' | 'object-method', name: string, owner?: string, line: number }} SymbolInfo */

/**
 * @param {string} content
 * @returns {SymbolInfo[]}
 */
function extractSymbols(content) {
  const symbols = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let m = line.match(/^export\s+(async\s+)?function\s+(\w+)/);
    if (m) {
      symbols.push({ kind: 'function', name: m[2], line: i + 1 });
      continue;
    }

    m = line.match(/^export\s+const\s+(\w+)\s*=\s*\{/);
    if (m) {
      const owner = m[1];
      for (let j = i + 1; j < lines.length; j++) {
        const inner = lines[j];
        if (/^\};/.test(inner.trim())) break;
        const mm = inner.match(/^\s+(\w+)\s*\(/);
        if (mm && !SKIP_METHODS.has(mm[1])) {
          symbols.push({ kind: 'object-method', name: mm[1], owner, line: j + 1 });
        }
      }
      continue;
    }

    m = line.match(/^export\s+class\s+(\w+)/);
    if (m) {
      const owner = m[1];
      for (let j = i + 1; j < lines.length; j++) {
        const inner = lines[j];
        if (/^}/.test(inner.trim()) && !inner.includes('(')) break;
        const mm = inner.match(/^\s+(?:public\s+)?(?:async\s+)?(\w+)\s*\(/);
        if (mm && !SKIP_METHODS.has(mm[1]) && !mm[1].startsWith('#')) {
          symbols.push({ kind: 'method', name: mm[1], owner, line: j + 1 });
        }
      }
    }
  }

  return symbols;
}

/**
 * @param {string} relPath e.g. utils/UrlSafe.ts
 * @param {string} className
 * @param {SymbolInfo[]} symbols
 */
function buildFeature(relPath, className, symbols) {
  const modulePath = `src/${relPath.replace(/\\/g, '/')}`;
  const tags = ['@vidply', `@${className}`];
  const header = `# Generated starter — extend with concrete examples and edge cases.
# Source: ${modulePath}
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

${tags.join(' ')}
Feature: ${className}
  Behaviour contract for AI-generated and human-maintained code in ${modulePath}.
  Each public function or method has at least one happy-path and one guard scenario.

`;

  if (symbols.length === 0) {
    return `${header}  @placeholder
  Scenario: Module exports are documented
    Given the ${className} module from ${modulePath}
    Then it should expose a documented public API
    And unit tests should cover its primary behaviour
`;
  }

  const blocks = symbols.flatMap((sym) => {
    const fn = sym.owner ? `${sym.owner}.${sym.name}` : sym.name;
    const tagFn = `@${sym.name}`;
    return `  ${tagFn} @happy-path
  Scenario: ${fn} handles valid input
    Given a prepared ${className} context
    When ${fn} is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  ${tagFn} @guard
  Scenario: ${fn} rejects or normalizes invalid input safely
    Given a prepared ${className} context
    When ${fn} is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
`;
  });

  return header + blocks.join('\n');
}

/** @param {string} dir */
async function walkTs(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTs(full)));
    } else if (entry.isFile() && extname(entry.name) === '.ts' && !entry.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const files = await walkTs(SRC);
  let created = 0;
  let changed = 0;

  for (const file of files.sort()) {
    const rel = relative(SRC, file);
    const className = basename(rel, '.ts');
    const outFile = join(OUT, rel.replace(/\.ts$/, '.feature'));
    const content = await readFile(file, 'utf8');
    const symbols = extractSymbols(content);
    const feature = buildFeature(rel, className, symbols);

    await mkdir(dirname(outFile), { recursive: true });

    let existing = null;
    try {
      existing = await readFile(outFile, 'utf8');
    } catch {
      /* new file */
    }

    if (existing?.startsWith('# Reference spec')) continue;
    if (existing === feature) continue;

    if (CHECK) {
      console.error(`Drift: ${relative(ROOT, outFile)}`);
      changed++;
      continue;
    }

    if (existing === null) created++;
    else changed++;
    await writeFile(outFile, feature, 'utf8');
  }

  const indexLines = [
    '# Vidply BDD spec index',
    '',
    'Auto-generated list of feature files. See README.md for usage.',
    '',
    ...files.sort().map((f) => `- [${basename(f, '.ts')}](${relative(OUT, join(OUT, relative(SRC, f).replace(/\.ts$/, '.feature'))).replace(/\\/g, '/')})`),
    '',
  ];
  const indexPath = join(OUT, 'INDEX.md');
  const indexContent = indexLines.join('\n');
  if (!CHECK) {
    await writeFile(indexPath, indexContent, 'utf8');
  }

  if (CHECK && changed > 0) {
    console.error(`${changed} feature file(s) out of date. Run: node scripts/generate-bdd-specs.mjs`);
    process.exit(1);
  }

  console.log(CHECK ? 'BDD specs are up to date.' : `Wrote ${created} new and updated ${changed} feature file(s) under specs/bdd/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
