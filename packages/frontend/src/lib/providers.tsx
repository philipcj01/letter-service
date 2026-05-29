'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth-context';
import { api } from './api';
import { Toaster } from 'sonner';

function ApiTokenWiring({ children }: { children: React.ReactNode }) {
  const { getIdToken, getValidToken } = useAuth();

  useEffect(() => {
    api.setTokenGetter(getIdToken);
    api.setValidTokenGetter(getValidToken);
  }, [getIdToken, getValidToken]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ApiTokenWiring>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' },
            }}
          />
        </ApiTokenWiring>
      </QueryClientProvider>
    </AuthProvider>
  );
}
