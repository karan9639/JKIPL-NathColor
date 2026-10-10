import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import babel from '@rolldown/plugin-babel';
export default defineConfig(({ command, mode }) => ({
    plugins: [
        command === 'serve' && mode === 'development' && babel({
            include: /\/src\/.*\.jsx$/,
            plugins: ['module:@locator/babel-jsx'],
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: true,
    },
    build: {
        sourcemap: true,
        chunkSizeWarningLimit: 1200,
    },
}));
