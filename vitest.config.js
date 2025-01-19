import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        //environment: 'happy-dom',
        setupFiles: ['./test/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'test/**' // Exclude test files from coverage
            ],
            reportOnFailure: true
        },
        include: ['test/**/*.test.ts','test/**/*.integration.ts']
    },
});
