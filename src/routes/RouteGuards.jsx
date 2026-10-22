import { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { findNavItem } from '@/constants/navigation';
import { LoadingState, EmptyState } from '@/components/ui/panel';

export function RequireAuth({ children }) {
    const { isAuthenticated, ready } = useAuth();
    const location = useLocation();
    if (!ready) return <LoadingState />;
    if (!isAuthenticated)
        return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
    return children;
}
export function Guard({ children }) {
    const { can } = useAuth();
    const location = useLocation();
    const item = findNavItem(location.pathname);
    if (item && !can(item)) {
        return <EmptyState title="Access restricted" description="Your account does not have permission to open this module. Contact your administrator if you need access."/>;
    }
    return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}
