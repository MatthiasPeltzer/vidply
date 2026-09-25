import { availableParallelism } from 'node:os';
import { defineConfig } from 'vitest/config';

/** Cap workers — Vitest doctor often finds this faster than using every CPU (Vite transforms on the main thread). Override with VITEST_MAX_WORKERS. */
function resolveMaxWorkers() {
  if (process.env.VITEST_MAX_WORKERS) {
    const parsed = Number.parseInt(process.env.VITEST_MAX_WORKERS, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const cpus = availableParallelism();
  return Math.max(1, Math.min(8, cpus));
}

export default defineConfig({
  test: {
    // Use jsdom for DOM API testing
    environment: 'jsdom',

    // vmForks: one jsdom per worker (not per file). isolate: false: share window
    // within a worker — tests must reset DOM (see tests/setup.js). Run
    // `npx vitest doctor` to compare pools / maxWorkers on your machine.
    pool: 'vmForks',
    isolate: false,
    maxWorkers: resolveMaxWorkers(),

    // Test file patterns
    include: ['tests/unit/**/*.test.{js,ts}', 'tests/integration/**/*.test.{js,ts}'],

    // Exclude e2e tests (handled by Playwright)
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],

    // Enable globals (describe, it, expect) without imports
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/styles/**', 'src/icons/**', 'src/types/**'],
      // Regression floors set just below the current measured coverage so
      // `test:coverage` (run in CI) fails if coverage drops. Ratchet these up
      // as the suite grows — do not lower them to accommodate new untested code.
      thresholds: {
        statements: 40,
        branches: 32,
        functions: 42,
        lines: 40
      }
    },

    // Setup files to run before each test file
    setupFiles: ['./tests/setup.js'],

    // Timeout for tests (in ms)
    testTimeout: 10000,

    // Reporter
    reporters: ['default'],

    // Watch mode settings
    watchExclude: ['node_modules/**', 'dist/**']
  }
});
