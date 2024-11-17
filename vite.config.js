import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
    ],
    build: {
        sourcemap: true,
        target: 'esnext',
        outDir: 'dist'
    }
});