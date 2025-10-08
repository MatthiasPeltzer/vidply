#!/usr/bin/env node

/**
 * Watch mode for development
 */

import * as esbuild from 'esbuild';
import { watch } from 'fs';

console.log('👀 Watching for changes...\n');

// ESM build context
const esmContext = await esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/vidply.esm.js',
  sourcemap: true,
  target: ['es2020'],
  logLevel: 'info'
});

// IIFE build context
const iifeContext = await esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'VidPly',
  outfile: 'dist/vidply.js',
  sourcemap: true,
  target: ['es2020'],
  logLevel: 'info'
});

await esmContext.watch();
await iifeContext.watch();

// Watch CSS
watch('src/styles/vidply.css', async (eventType) => {
  if (eventType === 'change') {
    console.log('🎨 CSS changed, copying to dist...');
    const { readFileSync, writeFileSync } = await import('fs');
    const css = readFileSync('src/styles/vidply.css', 'utf8');
    writeFileSync('dist/vidply.css', css);
    console.log('✓ CSS updated\n');
  }
});

console.log('✅ Watching for changes (press Ctrl+C to stop)...\n');
console.log('📂 Output:');
console.log('   dist/vidply.esm.js');
console.log('   dist/vidply.js');
console.log('   dist/vidply.css\n');

// Keep process alive
process.on('SIGINT', async () => {
  console.log('\n\n👋 Stopping watch mode...');
  await esmContext.dispose();
  await iifeContext.dispose();
  process.exit(0);
});

