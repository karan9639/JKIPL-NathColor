import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signedIn, signedOut, logoutStarted } from './store';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler } from './api';
import { loginUser, logoutUser } from '@/services/authAPI';
import { session } from './session';
import { canAccess } from './navigation';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();
    const { username, isLoggingOut } = useSelector((state) => state.auth);
    const logout = useCallback(async () => {
        dispatch(logoutStarted());
        try {
            // Call the backend logout endpoint, but always clear the local session.
            await logoutUser();
        }
        catch {
            // A network/API failure must not leave the user signed in locally.
        }
        finally {
            session.clear();
            queryClient.clear();
            dispatch(signedOut());
        }
    }, [queryClient, dispatch]);
    useEffect(() => {
        // Remove the identifier saved by older device-based login versions.
        localStorage.removeItem('nc.device_uuid');
        setUnauthorizedHandler(logout);
    }, [logout]);
    const login = useCallback(async (userEmail, password, remember) => {
        const email = userEmail.trim().toLowerCase();
        const { data: response } = await loginUser({ email, password });
        // `response` is the backend response body (Axios has already unwrapped its own response).
        // Do not replace it with response.data: the backend nests the user there and
        // keeps `success: true` at the top level.
        const responseStatus = String(response?.status ?? '').toLowerCase();
        const isSuccess = response?.success === true ||
            Boolean(response?.token || response?.accessToken || response?.user?.token || response?.user?.accessToken) ||
            responseStatus === 'passed' ||
            responseStatus === 'success' ||
            responseStatus === 'successful';
        if (!isSuccess) {
            throw new Error(response?.message ?? 'Invalid username or password.');
        }
        const token = response.token ?? response.accessToken ?? response.data?.token ?? response.data?.accessToken ?? null;
        const menuOptions = response.menuoptionslist ?? response.data?.menuoptionslist ?? '';
        const authenticatedUsername = response.data?.foundUser?.email ?? response.user?.username ?? email;
        session.save(token, authenticatedUsername, menuOptions);
        session.setRememberedUsername(remember ? email : null);
        dispatch(signedIn(authenticatedUsername));
    }, [dispatch]);
    const value = useMemo(() => ({
        username,
        isLoggingOut,
        isAuthenticated: !!username,
        login,
        logout,
        can: (item) => canAccess(item, username),
    }), [username, isLoggingOut, login, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
