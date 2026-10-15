import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { store } from '@/state/store';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            retry: (count, error) => count < 1 && !error?.status,
            refetchOnWindowFocus: false,
        },
    },
});

export function AppProviders({ children }) {
    return (
        <StrictMode>
            <ErrorBoundary>
                <Provider store={store}>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            {children}
                            <Toaster position="top-right" richColors closeButton />
                        </AuthProvider>
                    </QueryClientProvider>
                </Provider>
            </ErrorBoundary>
        </StrictMode>
    );
}
