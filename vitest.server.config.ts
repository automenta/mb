import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['test/core/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./test/core/test-setup.ts'],
  }
});