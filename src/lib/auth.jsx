import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signedIn, signedOut, logoutStarted } from './store';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler } from './api';
import { loginUser, logoutUser } from '@/services/authAPI';
import { session } from './session';
import { canAccess } from './navigation';
import { isSuccessfulLoginResponse, userFromLoginResponse } from './identity';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();
    const { username, user, isLoggingOut } = useSelector((state) => state.auth);

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
        localStorage.removeItem('nc.device_uuid');
        setUnauthorizedHandler(logout);
        return () => setUnauthorizedHandler(null);
    }, [logout]);

    const login = useCallback(async (email, password, remember) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: response } = await loginUser({ email: normalizedEmail, password });
        // Axios has already removed its HTTP wrapper. The backend's payload
        // is { statusCode, success, data: { foundUser: { role, email, ... } } }.
        const isSuccess = isSuccessfulLoginResponse(response);
        if (!isSuccess) {
            throw new Error(response?.message ?? 'Invalid email or password.');
        }

        const account = userFromLoginResponse(response, normalizedEmail);
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
        isAuthenticated: Boolean(username),
        login,
        logout,
        can: (item) => canAccess(item, user ?? username),
    }), [username, user, isLoggingOut, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
