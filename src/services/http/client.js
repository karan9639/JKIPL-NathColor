import axios from 'axios';
import { session } from '@/services/auth/session';
import { config } from '@/config/env';

export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

const { apiBaseUrl, legacyApiBaseUrl, useMockApi, timeoutMs } = config;
let mockAdapter = null;
async function getMockAdapter() {
    if (!mockAdapter) {
        const mod = await import('@/services/mock/adapter');
        mockAdapter = mod.mockAdapter;
    }
    return mockAdapter;
}

function makeClient(baseURL) {
    const client = axios.create({
        baseURL: useMockApi ? '/mock-api' : baseURL,
        timeout: timeoutMs,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
    });
    if (useMockApi) client.defaults.adapter = async (cfg) => (await getMockAdapter())(cfg);
    client.interceptors.request.use((cfg) => {
        const token = session.getToken();
        if (token) cfg.headers.set('Authorization', `Bearer ${token}`);
        if (cfg.data instanceof FormData) cfg.headers.delete('Content-Type');
        return cfg;
    });
    client.interceptors.response.use((res) => res, (error) => {
        const status = error.response?.status;
        // A failed login/logout request is handled by the form/auth context, not
        // the global 401 handler; other failures invalidate the current session.
        const isAuthRequest = /\/user\/(?:login|logout)(?:\?|$)/.test(error.config?.url ?? '');
        if (status === 401 && !isAuthRequest && onUnauthorized && session.getUsername()) onUnauthorized();
        const serverMessage = error.response?.data?.message ?? error.response?.data?.detail;
        let message = serverMessage ?? error.message;
        if (error.code === 'ECONNABORTED') message = 'The server took too long to respond. Please try again.';
        else if (!error.response) message = 'Cannot reach the server. Check the API URL and network connection.';
        else if (status === 401) message = 'Your session has expired. Please sign in again.';
        else if (status === 403) message = 'You do not have permission to perform this action.';
        else if (status === 404 && !serverMessage) message = `API endpoint not found: ${error.config?.url ?? 'unknown'}. Check the configured backend.`;
        return Promise.reject(new ApiError(message, status));
    });
    return client;
}

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

// Confirmed Nathcolor Express routes: /user, /dyeing and /yarn.
export const http = makeClient(apiBaseUrl);
// Routes carried over from the previous frontend have a different backend
// contract. They can point to a separate legacy service without hijacking
// authentication or the verified dyeing/yarn API paths.
export const legacyHttp = legacyApiBaseUrl && legacyApiBaseUrl !== apiBaseUrl
    ? makeClient(legacyApiBaseUrl) : http;

export function errorMessage(error) {
    return error instanceof Error ? error.message : 'Something went wrong.';
}
