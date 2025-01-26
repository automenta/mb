import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom', // Add this line
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [
        'node_modules/**',
        'dist/**'
      ],
      reportOnFailure: true
    }
  }
});
