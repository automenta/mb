import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  resolve: {
    browser: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
    alias: {
      'socket.io-client': 'socket.io-client/dist/socket.io.js',
      http: './browser-shim.js',
      https: './browser-shim.js',
      net: './browser-shim.js',
      tls: './browser-shim.js'
    }
  },
  test: {
    ...baseConfig.test,
    environment: 'happy-dom',
    include: ['test/browser/**/*.test.ts'],
    setupFiles: ['./test/browser/setup.js'],
    globals: true
  }
});