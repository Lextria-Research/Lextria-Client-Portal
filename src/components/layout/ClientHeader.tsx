// src/components/layout/ClientHeader.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  History,
  CreditCard,
  FolderLock,
  LayoutDashboard,
  LogOut,
  Building2,
  Moon,
  Sun,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

export const ClientHeader: React.FC = () => {
  const { activeClient, authUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('lextria_theme');
      if (saved) return saved === 'dark';
    } catch {}
    return (
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      try { localStorage.setItem('lextria_theme', 'dark'); } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try { localStorage.setItem('lextria_theme', 'light'); } catch {}
    }
  }, [isDark]);

  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Matters & Cases', to: '/matters', icon: Briefcase },
    { label: 'Milestones & Filings', to: '/timeline', icon: History },
    // Hidden from client view for now; kept ready for future release:
    // { label: 'Billing & Retainers', to: '/finance', icon: CreditCard },
    // { label: 'Document Vault', to: '/vault', icon: FolderLock },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Banner: Brand and Authenticated Client Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name (Personalized to authenticated Client) */}
          <div className="flex items-center gap-3">
            {activeClient?.logo_url ? (
              <img
                src={activeClient.logo_url}
                alt={activeClient.client_name}
                className="h-10 max-h-10 max-w-[160px] object-contain rounded-xl bg-white/10 p-1 border border-white/15 shadow-md shadow-blue-500/10 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/20 shrink-0">
                {(activeClient?.client_name || activeClient?.client_code || 'CL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white truncate max-w-[240px] sm:max-w-[420px]" title={activeClient?.client_name || 'Client Portal'}>
                  {activeClient?.client_name || 'Client Portal'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  Client Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Unified Legal &amp; Intellectual Property Hub • Managed via Lextria
              </p>
            </div>
          </div>

          {/* Authenticated Client Account Badge (Locked to authenticated client) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="max-w-[140px] sm:max-w-[200px] truncate text-left">
                <div className="text-xs font-bold text-slate-200 truncate">
                  {authUser?.email || activeClient?.email || activeClient?.client_code || 'Client Account'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span className="font-bold text-blue-400">
                    {activeClient?.client_code || 'CODE'}
                  </span>
                  <span>•</span>
                  <span className="uppercase text-[9px] px-1 rounded bg-slate-700/60 text-slate-300">
                    {activeClient?.entity_type || 'AUTHORIZED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dark/Light mode toggle */}
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center justify-center border border-slate-700/60"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 border border-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-slate-950/80 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
