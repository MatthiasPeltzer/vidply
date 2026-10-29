#!/usr/bin/env node

/**
 * Clean dist directory
 */

import { rmSync } from 'fs';

console.log('🧹 Cleaning dist directory...\n');

try {
  rmSync('dist', { recursive: true, force: true });
  console.log('✅ Dist directory cleaned!\n');
} catch (error) {
  console.error('❌ Error cleaning dist:', error);
  process.exit(1);
}
