import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';
import path from 'path';

export default defineConfig({
  ...baseConfig,
  root: path.resolve('./'), // Explicitly set root directory
  /*resolve: {
    alias: {
      'http': 'stream-http',
    },
  },*/
  test: {
    ...baseConfig.test,
    include: ['test/ui/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      isolate: false,
    },
    environment: 'jsdom',
    setupFiles: ['./test/ui/test-setup.ts'],
    globals: true,
    restoreMocks: true,
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
    deps: {
      inline: ['@testing-library/jest-dom'],
    },
  },
});