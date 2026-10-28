import { normalizeApiBaseUrl } from './api-url.js';

// Vite replaces these STATIC references at build time. Environment-specific
// .env.development and .env.production files provide the correct backend host.
export const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const legacyApiBaseUrl = normalizeApiBaseUrl(
  import.meta.env.VITE_LEGACY_API_BASE_URL || import.meta.env.VITE_API_BASE_URL,
  'VITE_LEGACY_API_BASE_URL',
);
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 60000);
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
