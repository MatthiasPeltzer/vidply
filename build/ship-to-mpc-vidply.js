#!/usr/bin/env node

/**
 * Copy VidPly production build into mpc-vidply without re-encoding UTF-8.
 * PowerShell Get-Content corrupts umlauts in locale chunks — always use this script.
 */

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vidplyRoot = join(__dirname, '..');
const workspaceRoot = join(vidplyRoot, '..', '..');

const prodJs = join(vidplyRoot, 'dist', 'prod');
const distCss = join(vidplyRoot, 'dist');
const targetJs = join(workspaceRoot, 'mpcore', 'packages', 'mpc-vidply', 'Resources', 'Public', 'JavaScript', 'vidply');
const targetCss = join(workspaceRoot, 'mpcore', 'packages', 'mpc-vidply', 'Resources', 'Public', 'Css');

const SOURCEMAP_LINE = /^\s*\/\/# sourceMappingURL=.*\r?\n?/m;

function stripSourceMappingUrl(content) {
  return content.replace(SOURCEMAP_LINE, '');
}

function shipJs() {
  if (!statSync(prodJs).isDirectory()) {
    console.error('Missing dist/prod — run npm run build first.');
    process.exit(1);
  }

  rmSync(targetJs, { recursive: true, force: true });
  mkdirSync(targetJs, { recursive: true });

  let count = 0;
  for (const file of readdirSync(prodJs)) {
    if (!file.endsWith('.js') || file.endsWith('.map')) {
      continue;
    }
    const srcPath = join(prodJs, file);
    const destPath = join(targetJs, file);
    let content = readFileSync(srcPath, 'utf8');
    content = stripSourceMappingUrl(content);
    writeFileSync(destPath, content, { encoding: 'utf8' });
    count++;
  }

  console.log(`✓ Shipped ${count} JS files to mpc-vidply (UTF-8, no source maps)`);
}

function shipCss() {
  for (const name of ['vidply.css', 'vidply.min.css']) {
    const src = join(distCss, name);
    cpSync(src, join(targetCss, name));
  }
  console.log('✓ Shipped vidply.css + vidply.min.css');
}

console.log('📦 Shipping VidPly → mpc-vidply…\n');
shipJs();
shipCss();
console.log('\n✅ Done.\n');
