// src/components/layout/ClientLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { ClientHeader } from './ClientHeader';
import { Shield, ExternalLink } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export const ClientLayout: React.FC = () => {
  const { activeClient } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
      <ClientHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Lextria Legal &amp; Intellectual Property Practice
            </span>
            <span>•</span>
            <span>End-to-End Client Confidentiality &amp; Privilege Maintained</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px]">
              Active Client ID: {activeClient?.client_code || '—'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-[11px]">v1.0.0 (Unified Ecosystem)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default ClientLayout;
