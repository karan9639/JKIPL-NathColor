import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/lib/store';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { App } from './app';
import './index.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            retry: (count, error) => count < 1 && !error.status,
            refetchOnWindowFocus: false,
        },
    },
});
createRoot(document.getElementById('root')).render(<StrictMode>
    <ErrorBoundary>
    <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster position="top-right" richColors closeButton/>
      </AuthProvider>
    </QueryClientProvider>
    </Provider>
    </ErrorBoundary>
  </StrictMode>);
