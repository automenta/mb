import {defineConfig} from 'vitest/config';
import baseConfig from './vitest.config.js';

export default defineConfig({
    ...baseConfig,
    test: {
        ...baseConfig.test,
        include: ['test/server/**/*.test.ts', 'test/server/**/*.integration.ts'],
        environment: 'node',
        setupFiles: ['./test/server/test-setup.ts'],
    }
});