import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signedIn, signedOut, logoutStarted } from '@/state/store';
import { useQueryClient } from '@tanstack/react-query';
import { http, setUnauthorizedHandler } from '@/services/http/client';
import { loginUser, logoutUser } from '@/services/auth/auth.service';
import { session } from '@/services/auth/session';
import { canAccess } from '@/constants/permissions';
import { isSuccessfulLoginResponse } from '@/services/auth/identity';
import { authenticatedUserFromMe, sessionCookieHelp } from '@/services/auth/session-verification';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();
    const { username, user, isLoggingOut } = useSelector((state) => state.auth);
    const [ready, setReady] = useState(false);

    const logout = useCallback(async () => {
        dispatch(logoutStarted());
        try {
            await logoutUser();
        } catch {
            // Still clear the local session if the network/API is unavailable.
        } finally {
            session.clear();
            queryClient.clear();
            dispatch(signedOut());
        }
    }, [queryClient, dispatch]);

    useEffect(() => {
        let active = true;
        const verify = async () => {
            if (!session.getUsername()) { if (active) setReady(true); return; }
            try {
                const { data } = await http.get('/user/me');
                if (!active) return;
                const account = authenticatedUserFromMe(data, session.getUsername());
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
        setUnauthorizedHandler(logout);
        return () => setUnauthorizedHandler(null);
    }, [logout]);

    const login = useCallback(async (email, password, remember) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: loginResponse } = await loginUser({ email: normalizedEmail, password });

        if (!isSuccessfulLoginResponse(loginResponse)) {
            throw new Error(loginResponse?.message || 'Invalid email or password.');
        }

        // Login's 200 response is not enough: third-party cookie restrictions
        // can discard Set-Cookie before subsequent authenticated requests.
        // Validate the cookie against the protected endpoint FIRST.
        let account;
        try {
            const { data: meResponse } = await http.get('/user/me', {
                headers: { 'Cache-Control': 'no-store' },
            });
            account = authenticatedUserFromMe(meResponse, normalizedEmail);
        } catch (error) {
            session.clear();
            queryClient.clear();
            dispatch(signedOut());
            const help = sessionCookieHelp(error);
            if (help) throw new Error(help);
            throw error;
        }

        // Only now is the authenticated session genuinely usable.
        session.save(null, account.username, '', account);
        session.setRememberedEmail(remember ? normalizedEmail : null);
        queryClient.clear();
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

