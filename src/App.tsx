// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';
import { ClientLayout } from './components/layout/ClientLayout';
import { ClientLoginView } from './features/auth/ClientLoginView';
import { ClientDashboardView } from './features/dashboard/ClientDashboardView';
import { ClientMattersView } from './features/matters/ClientMattersView';
import { ClientTimelineView } from './features/timeline/ClientTimelineView';
import { ClientFinanceView } from './features/finance/ClientFinanceView';
import { ClientDocumentVaultView } from './features/vault/ClientDocumentVaultView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const ProtectedClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeClient, loading } = useAuth();

  React.useEffect(() => {
    if (activeClient?.client_name) {
      document.title = `${activeClient.client_name} | Client Portal`;
    } else {
      document.title = 'Client Portal';
    }
  }, [activeClient?.client_name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
        Authenticating Client Portal...
      </div>
    );
  }

  if (!activeClient) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<ClientLoginView />} />
            <Route
              path="/"
              element={
                <ProtectedClientRoute>
                  <ClientLayout />
                </ProtectedClientRoute>
              }
            >
              <Route index element={<ClientDashboardView />} />
              <Route path="matters" element={<ClientMattersView />} />
              <Route path="timeline" element={<ClientTimelineView />} />
              {/* Fees/Billing and Document Vault temporarily disabled for clients; redirected to overview */}
              <Route path="finance" element={<Navigate to="/" replace />} />
              <Route path="vault" element={<Navigate to="/" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

