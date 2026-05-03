import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom for DOM API testing
    environment: 'jsdom',
    
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
      // Floors aligned with the current public test surface; raise as the suite grows.
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 60,
        lines: 60
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
