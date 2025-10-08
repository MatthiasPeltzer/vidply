#!/usr/bin/env node

/**
 * VidPly CSS Build Script
 * Minifies CSS for production
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import CleanCSS from 'clean-css';

// Ensure dist directory exists
try {
  mkdirSync('dist', { recursive: true });
} catch (err) {
  // Directory already exists
}

console.log('🎨 Building CSS...\n');

const banner = `/*!
 * VidPly v1.0.0 - Styles
 * (c) ${new Date().getFullYear()} Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */`;

// Read source CSS
const cssSource = readFileSync('src/styles/vidply.css', 'utf8');

// Copy unminified version
console.log('📄 Copying unminified CSS...');
writeFileSync('dist/vidply.css', banner + '\n\n' + cssSource);
const unminifiedSize = (cssSource.length / 1024).toFixed(2);
console.log(`   ✓ dist/vidply.css (${unminifiedSize} KB)\n`);

// Minify CSS
console.log('⚡ Minifying CSS...');
const minifier = new CleanCSS({
  level: 2,
  returnPromise: false
});

const minified = minifier.minify(cssSource);

if (minified.errors.length > 0) {
  console.error('❌ CSS minification errors:');
  minified.errors.forEach(error => console.error('   ', error));
  process.exit(1);
}

if (minified.warnings.length > 0) {
  console.warn('⚠️  CSS minification warnings:');
  minified.warnings.forEach(warning => console.warn('   ', warning));
}

// Write minified CSS
writeFileSync('dist/vidply.min.css', banner + '\n' + minified.styles);

const minifiedSize = (minified.styles.length / 1024).toFixed(2);
const savings = ((1 - minified.styles.length / cssSource.length) * 100).toFixed(1);

console.log(`   ✓ dist/vidply.min.css (${minifiedSize} KB, ${savings}% smaller)\n`);

console.log('✅ CSS build completed!\n');

