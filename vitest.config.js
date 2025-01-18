import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./test/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**'
            ],
        },
        include: ['test/**/*.test.ts']
    },
});
