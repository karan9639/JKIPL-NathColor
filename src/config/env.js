function readRequired(key) {
    const value = String(import.meta.env[key] ?? '').trim();
    if (!value) {
        throw new Error(`Missing environment variable ${key}. Copy .env.example to .env and set it.`);
    }
    return value;
}

const trimSlashes = (value) => value.replace(/\/+$/, '');

const apiBaseUrl = trimSlashes(readRequired('VITE_API_BASE_URL'));
const timeoutMs = Number(readRequired('VITE_API_TIMEOUT_MS'));

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('VITE_API_TIMEOUT_MS must be a positive number of milliseconds.');
}

export const config = {
    apiBaseUrl,
    legacyApiBaseUrl: trimSlashes(String(import.meta.env.VITE_LEGACY_API_BASE_URL ?? '').trim()) || apiBaseUrl,
    useMockApi: false,
    timeoutMs,
    appName: 'Nathcolor+',
};
export const JET_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);
