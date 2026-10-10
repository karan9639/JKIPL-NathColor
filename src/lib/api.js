import axios from 'axios';
import { session } from './session';
export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
const apiBaseUrl = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true' || apiBaseUrl === '';
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 60000);
let mockAdapter = null;
async function getMockAdapter() {
    if (!mockAdapter) {
        const mod = await import('./mock/adapter');
        mockAdapter = mod.mockAdapter;
    }
    return mockAdapter;
}
export const http = axios.create({
    baseURL: useMockApi ? '/mock-api' : apiBaseUrl,
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
});
if (useMockApi) {
    http.defaults.adapter = async (cfg) => (await getMockAdapter())(cfg);
}
http.interceptors.request.use((cfg) => {
    const token = session.getToken();
    if (token)
        cfg.headers.set('Authorization', `Bearer ${token}`);
    if (cfg.data instanceof FormData)
        cfg.headers.delete('Content-Type');
    return cfg;
});
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}
http.interceptors.response.use((res) => res, (error) => {
    const status = error.response?.status;
    if (status === 401 && onUnauthorized)
        onUnauthorized();
    const serverMessage = error.response?.data?.message ?? error.response?.data?.detail;
    let message = serverMessage ?? error.message;
    if (error.code === 'ECONNABORTED')
        message = 'The server took too long to respond. Please try again.';
    else if (!error.response)
        message = 'Cannot reach the server. Check your network connection.';
    else if (status === 401)
        message = 'Your session has expired. Please sign in again.';
    else if (status === 403)
        message = 'You do not have permission to perform this action.';
    return Promise.reject(new ApiError(message, status));
});
export function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return 'Something went wrong.';
}
