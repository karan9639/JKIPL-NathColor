import axios from 'axios';
import { session } from '@/services/auth/session';
import { config } from '@/config/env';
import { httpFailureMessage, isAuthRequest } from './http-errors.js';

export class ApiError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

const { apiBaseUrl, legacyApiBaseUrl, useMockApi, timeoutMs } = config;


function makeClient(baseURL) {
    const client = axios.create({
        baseURL: baseURL,
        timeout: timeoutMs,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
    });

    client.interceptors.request.use((cfg) => {
        const token = session.getToken();
        if (token) cfg.headers.set('Authorization', `Bearer ${token}`);
        if (cfg.data instanceof FormData) cfg.headers.delete('Content-Type');
        return cfg;
    });
    client.interceptors.response.use((res) => res, (error) => {
        const status = error.response?.status;
        const url = error.config?.url ?? '';
        // Never treat a failed login as an expired authenticated session.
        if (status === 401 && !isAuthRequest(url) && onUnauthorized && session.getUsername()) onUnauthorized();
        const serverMessage = error.response?.data?.message ?? error.response?.data?.detail;
        const message = httpFailureMessage({status, url, serverMessage, code:error.code, fallback:error.message});
        return Promise.reject(new ApiError(message, status, error.response?.data?.code));
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
