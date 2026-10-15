import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/** Read the authenticated account and its granted navigation permissions. */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
