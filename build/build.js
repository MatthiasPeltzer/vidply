#!/usr/bin/env node

/**
 * VidPly Build Script
 * Creates bundled and minified versions of the player
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { basename, dirname, join } from 'path';
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
 * Universal, Accessible Video Player
 * (c) ${new Date().getFullYear()} Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */`;

// Build configurations
const builds = [
  // Modern ESM
  {
    name: 'ESM Bundle',
    entryPoint: 'src/index.js',
    outfile: 'dist/vidply.esm.js',
    format: 'esm',
    minify: false,
    splitting: true
  },
  {
    name: 'ESM Bundle (Minified)',
    entryPoint: 'src/index.js',
    outfile: 'dist/vidply.esm.min.js',
    format: 'esm',
    minify: true,
    splitting: true
  },

  // Legacy IIFE (non-splitting) for older browsers
  {
    name: 'IIFE Bundle',
    entryPoint: 'src/index.js',
    outfile: 'dist/legacy/vidply.js',
    format: 'iife',
    globalName: 'VidPly',
    minify: false,
    splitting: false,
    legacy: true
  },
  {
    name: 'IIFE Bundle (Minified)',
    entryPoint: 'src/index.js',
    outfile: 'dist/legacy/vidply.min.js',
    format: 'iife',
    globalName: 'VidPly',
    minify: true,
    splitting: false,
    legacy: true
  }
];

// Build each configuration
async function buildAll() {
  for (const config of builds) {
    console.log(`📦 Building ${config.name}...`);
    
    try {
      const commonOptions = {
        entryPoints: [config.entryPoint],
        bundle: true,
        format: config.format,
        minify: config.minify,
        sourcemap: !config.minify,
        target: config.legacy
          ? ['es2017', 'chrome60', 'firefox60', 'safari12', 'edge79']
          : ['es2022', 'chrome100', 'firefox100', 'safari15', 'edge100'],
        charset: 'utf8',
        banner: {
          js: banner
        },
        legalComments: 'none',
        logLevel: 'info',
        metafile: true
      };

      const outDir = config.legacy
        ? 'dist/legacy'
        : (config.minify ? 'dist/prod' : 'dist/dev');

      if (config.splitting) {
        commonOptions.splitting = true;
        commonOptions.chunkNames = config.minify ? 'vidply.[name]-[hash].min' : 'vidply.[name]-[hash]';
        commonOptions.entryNames = basename(config.outfile).replace('.js', '');
        commonOptions.assetNames = 'vidply.[name]';
        commonOptions.outdir = outDir;
      } else {
        commonOptions.outfile = join(outDir, basename(config.outfile));
      }

      const result = await esbuild.build({
        ...commonOptions
      });

      // Calculate output size (excluding source maps)
      const outputs = Object.entries(result.metafile.outputs).filter(
        ([filePath]) => !filePath.endsWith('.map')
      );
      const totalBytes = outputs.reduce((sum, [, meta]) => sum + meta.bytes, 0);
      const sizeKB = (totalBytes / 1024).toFixed(2);
      
      const sizeLabel = config.splitting ? `${sizeKB} KB (all chunks)` : `${sizeKB} KB`;
      console.log(`   ✓ Built successfully (${sizeLabel})\n`);

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
    console.log('   dist/legacy/vidply.js       - IIFE (legacy development)');
    console.log('   dist/legacy/vidply.min.js   - IIFE (legacy production)');
    console.log('');
  })
  .catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });

