import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'happy-dom',    
    include: ['test/browser/*.test.ts'],
    setupFiles: ['./test/browser/setup.js'],
    globals: true
  }
});