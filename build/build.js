#!/usr/bin/env node

/**
 * VidPly Build Script
 * Creates bundled and minified versions of the player
 * Uses esbuild for bundling and Terser for optimal minification
 */

import * as esbuild from 'esbuild';
import { minify } from 'terser';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
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

// Terser options for optimal minification
const terserOptions = {
  compress: {
    ecma: 2020,
    passes: 2,
    pure_getters: true,
    unsafe_arrows: true,
    unsafe_methods: true,
    drop_console: false, // Keep console for debugging in production
    drop_debugger: true
  },
  mangle: {
    properties: false // Don't mangle properties to avoid breaking dynamic access
  },
  format: {
    ecma: 2020,
    comments: /^!/  // Keep banner comments
  },
  module: true
};

// Terser options for legacy IIFE builds
const terserOptionsLegacy = {
  ...terserOptions,
  compress: {
    ...terserOptions.compress,
    ecma: 2020
  },
  format: {
    ...terserOptions.format,
    ecma: 2020
  },
  module: false
};

/**
 * Apply Terser minification to JS files in a directory
 * @param {string} dir - Directory containing files to minify
 * @param {boolean} isLegacy - Whether to use legacy Terser options
 * @param {string|null} filePattern - Optional pattern to match files (e.g., '.min.js')
 */
async function terserMinifyDirectory(dir, isLegacy = false, filePattern = null) {
  const files = readdirSync(dir);
  let totalSaved = 0;
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    // Skip if file doesn't match pattern (if provided)
    if (filePattern && !file.includes(filePattern)) {
      continue;
    }
    
    if (stat.isFile() && file.endsWith('.js') && !file.endsWith('.map')) {
      const originalCode = readFileSync(filePath, 'utf8');
      const originalSize = Buffer.byteLength(originalCode, 'utf8');

      // Chain the esbuild-produced sourcemap (bundle → TS sources) through
      // Terser so the shipped minified file maps back to the original source.
      const mapPath = `${filePath}.map`;
      const inputMap = existsSync(mapPath) ? readFileSync(mapPath, 'utf8') : undefined;

      try {
        const baseOptions = isLegacy ? terserOptionsLegacy : terserOptions;
        const result = await minify(originalCode, {
          ...baseOptions,
          sourceMap: {
            content: inputMap,
            url: `${file}.map`,
            includeSources: true
          }
        });
        if (result.code) {
          writeFileSync(filePath, result.code);
          const newSize = Buffer.byteLength(result.code, 'utf8');
          totalSaved += originalSize - newSize;
        }
        if (result.map) {
          writeFileSync(mapPath, result.map);
        }
      } catch (err) {
        console.warn(`   ⚠ Terser warning for ${file}:`, err.message);
      }
    }
  }
  
  return totalSaved;
}

// Banner comment.
// Reproducible across builds: prefer SOURCE_DATE_EPOCH (set by CI) and fall
// back to the version in package.json so two builds of the same git ref
// produce identical bundles.
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const epoch = process.env.SOURCE_DATE_EPOCH;
const bannerYear = epoch
  ? new Date(parseInt(epoch, 10) * 1000).getUTCFullYear()
  : (process.env.VIDPLY_COPYRIGHT_YEAR || new Date().getUTCFullYear());
const banner = `/*!
 * VidPly v${pkg.version} - Universal, Accessible Video Player
 * (c) ${bannerYear} Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */`;

// Build configurations
const builds = [
  // Modern ESM
  {
    name: 'ESM Bundle',
    entryPoint: 'src/index.ts',
    outfile: 'dist/vidply.esm.js',
    format: 'esm',
    minify: false,
    splitting: true
  },
  {
    name: 'ESM Bundle (Minified)',
    entryPoint: 'src/index.ts',
    outfile: 'dist/vidply.esm.min.js',
    format: 'esm',
    minify: true,
    splitting: true
  },

  // Legacy IIFE (non-splitting) for older browsers
  {
    name: 'IIFE Bundle',
    entryPoint: 'src/index.ts',
    outfile: 'dist/legacy/vidply.js',
    format: 'iife',
    globalName: 'VidPly',
    minify: false,
    splitting: false,
    legacy: true
  },
  {
    name: 'IIFE Bundle (Minified)',
    entryPoint: 'src/index.ts',
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
      // For minified builds, we'll use esbuild for bundling only, then Terser for minification
      const useEsbuildMinify = !config.minify; // Only use esbuild minify for non-minified (development) builds
      
      const commonOptions = {
        entryPoints: [config.entryPoint],
        bundle: true,
        format: config.format,
        minify: false, // We'll use Terser for minification instead
        // Dev builds: linked sourcemaps (with //# comment). Minified builds:
        // external map with no comment here — Terser re-emits the composed map
        // and appends the sourceMappingURL after minification.
        sourcemap: config.minify ? 'external' : true,
        target: config.legacy
          ? ['es2020', 'chrome80', 'firefox78', 'safari14', 'edge88']
          : ['es2022', 'chrome100', 'firefox100', 'safari15', 'edge100'],
        // Destructuring is natively supported in all targeted browsers (ES2015+).
        // Explicitly disable esbuild's attempt to lower it (esbuild 0.25+ errors
        // instead of silently passing through patterns it cannot fully transform).
        ...(config.legacy ? { supported: { destructuring: true } } : {}),
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

      // Calculate output size before Terser (excluding source maps)
      const outputs = Object.entries(result.metafile.outputs).filter(
        ([filePath]) => !filePath.endsWith('.map')
      );
      const esbuildBytes = outputs.reduce((sum, [, meta]) => sum + meta.bytes, 0);
      const esbuildKB = (esbuildBytes / 1024).toFixed(2);
      
      // Apply Terser minification for production builds
      if (config.minify) {
        console.log(`   → esbuild: ${esbuildKB} KB, applying Terser...`);
        
        // For legacy builds, only minify .min.js files (not the dev bundle)
        const filePattern = config.legacy ? '.min.js' : null;
        const savedBytes = await terserMinifyDirectory(outDir, config.legacy, filePattern);
        
        // Recalculate final size (only counting minified files for legacy)
        let finalBytes = 0;
        const finalFiles = readdirSync(outDir);
        for (const file of finalFiles) {
          const shouldCount = config.legacy 
            ? file.endsWith('.min.js') 
            : (file.endsWith('.js') && !file.endsWith('.map'));
          if (shouldCount) {
            finalBytes += statSync(join(outDir, file)).size;
          }
        }
        const finalKB = (finalBytes / 1024).toFixed(2);
        const savedKB = (savedBytes / 1024).toFixed(2);
        
        const sizeLabel = config.splitting ? `${finalKB} KB (all chunks)` : `${finalKB} KB`;
        console.log(`   ✓ Built successfully (${sizeLabel}, Terser saved ${savedKB} KB)\n`);
      } else {
        const sizeLabel = config.splitting ? `${esbuildKB} KB (all chunks)` : `${esbuildKB} KB`;
        console.log(`   ✓ Built successfully (${sizeLabel})\n`);
      }

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

