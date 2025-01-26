import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
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
