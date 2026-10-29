import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { normalizeApiBaseUrl } from './src/config/api-url.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // An environment variable configured in Vercel overrides .env.production.
  const apiBase = normalizeApiBaseUrl(process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL);
  const legacyBase = normalizeApiBaseUrl(
    process.env.VITE_LEGACY_API_BASE_URL || env.VITE_LEGACY_API_BASE_URL || apiBase,
    'VITE_LEGACY_API_BASE_URL',
  );
  if (command === 'build' && (apiBase !== '/api/v1' || legacyBase !== '/api/v1')) {
    throw new Error('Production builds require VITE_API_BASE_URL=/api/v1 and VITE_LEGACY_API_BASE_URL=/api/v1. Update Vercel environment variables and redeploy.');
  }

  const port = Number(env.DEV_SERVER_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DEV_SERVER_PORT must be a valid TCP port.');
  }
  const proxyTarget = process.env.DEV_API_PROXY_TARGET || env.DEV_API_PROXY_TARGET || 'http://localhost:8000';
  let target;
  try { target = new URL(proxyTarget); }
  catch { throw new Error('DEV_API_PROXY_TARGET must be an absolute http(s) origin.'); }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password ||
      target.pathname !== '/' || target.search || target.hash) {
    throw new Error('DEV_API_PROXY_TARGET must be an http(s) origin without path or credentials.');
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: command === 'serve'
      ? {
          host: env.DEV_SERVER_HOST || '0.0.0.0',
          port,
          strictPort: true,
          proxy: { '/api': { target: target.origin, changeOrigin: true } },
        }
      : undefined,
  };
});
