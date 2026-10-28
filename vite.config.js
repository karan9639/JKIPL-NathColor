import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { normalizeApiBaseUrl } from './src/config/api-url.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Validate before starting the dev server or creating a production bundle.
  // Never enable a Vite proxy: all ERP requests must use the backend origin.
  normalizeApiBaseUrl(process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL);
  const port = Number(env.DEV_SERVER_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DEV_SERVER_PORT must be a valid TCP port.');
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: command === 'serve'
      ? { host: env.DEV_SERVER_HOST || '0.0.0.0', port, strictPort: true }
      : undefined,
  };
});
