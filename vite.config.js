import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const apiBaseUrl = String(env.VITE_API_BASE_URL || '').trim();
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required. Check .env or Vercel Environment Variables.');
  }

  const isDevServer = command === 'serve';
  const isDirectApi = /^https?:\/\//i.test(apiBaseUrl);
  const proxyTarget = String(env.API_PROXY_TARGET || 'http://localhost:8000').trim();
  const port = Number(env.DEV_SERVER_PORT || 3000);
  if (isDevServer && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error('DEV_SERVER_PORT must be a valid TCP port.');
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: isDevServer ? {
      host: env.DEV_SERVER_HOST || '0.0.0.0',
      port,
      strictPort: true,
      // Absolute Railway URL: browser calls Railway directly. No Vite proxy.
      // Relative /api/v1 URL: local Vite proxy forwards /api to the backend.
      ...(!isDirectApi ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true } } } : {}),
    } : undefined,
  };
});
