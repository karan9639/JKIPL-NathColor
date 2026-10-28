import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signedIn, signedOut, logoutStarted } from '@/state/store';
import { useQueryClient } from '@tanstack/react-query';
import { http, setUnauthorizedHandler } from '@/services/http/client';
import { loginUser, logoutUser } from '@/services/auth/auth.service';
import { session } from '@/services/auth/session';
import { canAccess } from '@/constants/permissions';
import { isSuccessfulLoginResponse, userFromLoginResponse } from '@/services/auth/identity';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();
    const { username, user, isLoggingOut } = useSelector((state) => state.auth);
    const [ready, setReady] = useState(false);

    // A 401 means the API no longer recognizes our session. Do not call the
    // protected logout endpoint in response to 401: that would generate another
    // 401 and mask the actual cookie/session problem.
    const clearLocalSession = useCallback(() => {
        session.clear();
        queryClient.clear();
        dispatch(signedOut());
    }, [queryClient, dispatch]);

    const logout = useCallback(async () => {
        dispatch(logoutStarted());
        try {
            await logoutUser();
        } catch {
            // Clear local state even if the server session has already expired.
        } finally {
            clearLocalSession();
        }
    }, [clearLocalSession, dispatch]);

    useEffect(() => {
        let active = true;
        const verify = async () => {
            if (!session.getUsername()) { if (active) setReady(true); return; }
            try {
                const { data } = await http.get('/user/me');
                if (!active) return;
                const account = userFromLoginResponse(data, session.getUsername());
                session.save(null, account.username, '', account);
                dispatch(signedIn({ username: account.username, user: account }));
            } catch {
                if (active) { session.clear(); dispatch(signedOut()); }
            } finally { if (active) setReady(true); }
        };
        void verify();
        return () => {active = false;};
    }, [dispatch]);

    useEffect(() => {
        localStorage.removeItem('nc.device_uuid');
        setUnauthorizedHandler(clearLocalSession);
        return () => setUnauthorizedHandler(null);
    }, [clearLocalSession]);

    const login = useCallback(async (email, password, remember) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: response } = await loginUser({ email: normalizedEmail, password });
        // Axios has already removed its HTTP wrapper. The backend's payload
        // is { statusCode, success, data: { foundUser: { role, email, ... } } }.
        const isSuccess = isSuccessfulLoginResponse(response);
        if (!isSuccess) {
            throw new Error(response?.message ?? 'Invalid email or password.');
        }

        // This API authenticates by HttpOnly cookies, not a token in JSON.
        // Validate cookie persistence before treating a 200 login as a session.
        // This catches browser-blocked third-party cookies immediately.
        let verifiedResponse;
        try {
            verifiedResponse = await http.get('/user/me');
        } catch (error) {
            if (error?.status === 401) {
                throw new Error(
                    'Login accepted, but the browser did not send an authenticated session. ' +
                    'Check Set-Cookie/Cookies in DevTools. Prefer api.jkipl.com ' +
                    'pointing directly to Railway to avoid third-party-cookie restrictions.'
                );
            }
            throw error;
        }
        const account = userFromLoginResponse(
            verifiedResponse.data,
            normalizedEmail
        );
        const token = response.token ?? response.accessToken ??
            response.data?.token ?? response.data?.accessToken ?? null;
        const menuOptions = response.menuoptionslist ?? response.data?.menuoptionslist ?? '';

        session.save(token, account.username, menuOptions, account);
        session.setRememberedEmail(remember ? normalizedEmail : null);
        queryClient.clear(); // Clear any data from the previously logged-in account.
        dispatch(signedIn({ username: account.username, user: account }));
    }, [dispatch, queryClient]);

    const value = useMemo(() => ({
        username,
        user,
        role: user?.role ?? '',
        isAdmin: user?.role === 'admin',
        isLoggingOut,
        ready,
        isAuthenticated: Boolean(username) && ready,
        login,
        logout,
        can: (item) => canAccess(item, user ?? username),
    }), [username, user, ready, isLoggingOut, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

