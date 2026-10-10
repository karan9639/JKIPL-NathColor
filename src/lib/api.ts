import axios, { AxiosError, type AxiosAdapter } from 'axios'
import { session } from './session'

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

const apiBaseUrl = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true' || apiBaseUrl === ''
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 60000)

let mockAdapter: AxiosAdapter | null = null

async function getMockAdapter(): Promise<AxiosAdapter> {
  if (!mockAdapter) {
    const mod = await import('./mock/adapter')
    mockAdapter = mod.mockAdapter
  }
  return mockAdapter
}

export const http = axios.create({
  baseURL: useMockApi ? '/mock-api' : apiBaseUrl,
  timeout: timeoutMs,
  headers: { 'Content-Type': 'application/json' },
})

if (useMockApi) {
  http.defaults.adapter = async (cfg) => (await getMockAdapter())(cfg)
}

http.interceptors.request.use((cfg) => {
  const token = session.getToken()
  if (token) cfg.headers.set('Authorization', `Bearer ${token}`)
  if (cfg.data instanceof FormData) cfg.headers.delete('Content-Type')
  return cfg
})

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string; detail?: string }>) => {
    const status = error.response?.status
    if (status === 401 && onUnauthorized) onUnauthorized()
    const serverMessage = error.response?.data?.message ?? error.response?.data?.detail
    let message = serverMessage ?? error.message
    if (error.code === 'ECONNABORTED') message = 'The server took too long to respond. Please try again.'
    else if (!error.response) message = 'Cannot reach the server. Check your network connection.'
    else if (status === 401) message = 'Your session has expired. Please sign in again.'
    else if (status === 403) message = 'You do not have permission to perform this action.'
    return Promise.reject(new ApiError(message, status))
  },
)

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
