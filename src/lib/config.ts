const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')

export const config = {
  apiBaseUrl: rawBaseUrl,
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true' || rawBaseUrl === '',
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 60000),
  appName: 'Nathcolor+',
} as const

export const JET_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1)
