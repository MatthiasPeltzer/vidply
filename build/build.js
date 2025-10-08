#!/usr/bin/env node

/**
 * VidPly Build Script
 * Creates bundled and minified versions of the player
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure dist directory exists
try {
  mkdirSync('dist', { recursive: true });
} catch (err) {
  // Directory already exists
}

console.log('🔨 Building VidPly...\n');

// Banner comment
const banner = `/*!
 * VidPly v1.0.0
 * Universal, Accessible Video Player
 * (c) ${new Date().getFullYear()} Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */`;

// Build configurations
const builds = [
  {
    name: 'ESM Bundle',
    entryPoint: 'src/index.js',
    outfile: 'dist/vidply.esm.js',
    format: 'esm',
    minify: false
  },
  {
    name: 'ESM Bundle (Minified)',
    entryPoint: 'src/index.js',
    outfile: 'dist/vidply.esm.min.js',
    format: 'esm',
    minify: true
  },
  {
    name: 'IIFE Bundle',
    entryPoint: 'src/index.js',
    outfile: 'dist/vidply.js',
    format: 'iife',
    globalName: 'VidPly',
    minify: false
  },
  {
    name: 'IIFE Bundle (Minified)',
    entryPoint: 'src/index.js',
    outfile: 'dist/vidply.min.js',
    format: 'iife',
    globalName: 'VidPly',
    minify: true
  }
];

// Build each configuration
async function buildAll() {
  for (const config of builds) {
    console.log(`📦 Building ${config.name}...`);
    
    try {
      const result = await esbuild.build({
        entryPoints: [config.entryPoint],
        bundle: true,
        format: config.format,
        outfile: config.outfile,
        minify: config.minify,
        sourcemap: !config.minify,
        target: ['es2020', 'chrome90', 'firefox88', 'safari14', 'edge90'],
        banner: {
          js: banner
        },
        globalName: config.globalName,
        legalComments: 'none',
        logLevel: 'info',
        metafile: true
      });

      // Get file size
      const fileContent = readFileSync(config.outfile);
      const sizeKB = (fileContent.length / 1024).toFixed(2);
      
      console.log(`   ✓ Built successfully (${sizeKB} KB)\n`);

      // Write metafile for the minified version
      if (config.minify && result.metafile) {
        const metaPath = config.outfile.replace('.js', '.meta.json');
        writeFileSync(metaPath, JSON.stringify(result.metafile, null, 2));
      }
    } catch (error) {
      console.error(`   ✗ Error building ${config.name}:`, error);
      process.exit(1);
    }
  }
}

// Run build
buildAll()
  .then(() => {
    console.log('✅ Build completed successfully!\n');
    console.log('📂 Output files:');
    console.log('   dist/vidply.esm.js          - ES Module (development)');
    console.log('   dist/vidply.esm.min.js      - ES Module (production)');
    console.log('   dist/vidply.js              - IIFE (development)');
    console.log('   dist/vidply.min.js          - IIFE (production)');
    console.log('');
  })
  .catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });

