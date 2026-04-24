import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const minified = mode === 'min';

    return {
        build: {
            target: 'es2015',
            emptyOutDir: false,
            minify: minified ? 'esbuild' : false,
            lib: {
                entry: resolve(__dirname, 'dist/index.js'),
                name: 'bus',
                formats: ['iife'],
                fileName: () => minified ? 'browser-bus.min.js' : 'browser-bus.js'
            }
        }
    };
});
