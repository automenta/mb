import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [],
    build: {
        sourcemap: true,
        target: 'esnext',
        outDir: 'dist'
        // Consider adding if you want to generate smaller bundles:
        /*minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.log in production
            },
        },*/
    },
    server: {
        port: 3000, // Default port
        strictPort: true, // Exit if port is already in use
        /*proxy: {
            '/socket.io': {
                target: 'ws://localhost:3000',
                ws: true
            }
        }*/
    },
    // For better organization you could add resolve aliases:
    resolve: {
        alias: {
            '@': '/src',
            '@ui': '/ui',
        },
    },
});