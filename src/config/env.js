const trimSlashes = (value) => String(value ?? '').trim().replace(/\/+$/, '');

// Static import.meta.env references are replaced by Vite during the build.
const apiBaseUrl = trimSlashes(import.meta.env.VITE_API_BASE_URL);
const legacyApiBaseUrl = trimSlashes(import.meta.env.VITE_LEGACY_API_BASE_URL) || apiBaseUrl;
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 60000);

if (!apiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL. Configure the frontend Vercel environment and redeploy.');
}
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  throw new Error('VITE_API_TIMEOUT_MS must be a positive number of milliseconds.');
}

export const config = {
  apiBaseUrl,
  legacyApiBaseUrl,
  useMockApi: false,
  timeoutMs,
  appName: 'Nathcolor+',
};

export const JET_NUMBERS = Array.from({ length: 30 }, (_, index) => index + 1);
