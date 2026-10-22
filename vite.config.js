import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const CLIENT_KEYS = ['VITE_API_BASE_URL', 'VITE_API_TIMEOUT_MS'];
const DEV_SERVER_KEYS = ['DEV_SERVER_HOST', 'DEV_SERVER_PORT', 'API_PROXY_TARGET'];

function requireEnv(env, keys) {
  const missing = keys.filter((key) => !String(env[key] ?? '').trim());
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }
}

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const isDevServer = command === 'serve' && !process.argv.includes('preview');

  requireEnv(env, isDevServer ? [...CLIENT_KEYS, ...DEV_SERVER_KEYS] : CLIENT_KEYS);

  const port = Number(env.DEV_SERVER_PORT);
  const apiPrefix = new URL(env.VITE_API_BASE_URL, 'http://placeholder').pathname.split('/').filter(Boolean)[0];

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: isDevServer
      ? {
          host: env.DEV_SERVER_HOST,
          port,
          strictPort: true,
          proxy: apiPrefix
            ? { [`/${apiPrefix}`]: { target: env.API_PROXY_TARGET, changeOrigin: true } }
            : undefined,
        }
      : undefined,
  };
});
