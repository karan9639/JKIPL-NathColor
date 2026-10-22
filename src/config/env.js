const rawBaseUrl = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? '/api/v1').trim().replace(/\/+$/, '');
export const config = {
    apiBaseUrl: rawBaseUrl,
    // Optional: only needed when the original Nathcolor API runs separately.
    legacyApiBaseUrl: String(import.meta.env.VITE_LEGACY_API_BASE_URL ?? '/api/v1').trim().replace(/\/+$/, ''),
    useMockApi: false,
    timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 60000),
    appName: 'Nathcolor+',
};
export const JET_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);
