// src/components/layout/ClientHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  Briefcase,
  History,
  CreditCard,
  FolderLock,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Building2,
  CheckCircle2,
  Moon,
  Sun,
  ExternalLink,
} from 'lucide-react';
import { useAuth, PRESET_CLIENTS } from '../../lib/auth';

export const ClientHeader: React.FC = () => {
  const { activeClient, selectPresetClient, signOut } = useAuth();
  const navigate = useNavigate();
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setClientMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Matters & Cases', to: '/matters', icon: Briefcase },
    { label: 'Milestones & Filings', to: '/timeline', icon: History },
    { label: 'Billing & Retainers', to: '/finance', icon: CreditCard },
    { label: 'Document Vault', to: '/vault', icon: FolderLock },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Banner: Client switcher and portal info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/20">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  LEXTRIA
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Client Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Unified Legal &amp; Intellectual Property Hub
              </p>
            </div>
          </div>

          {/* Active Client Selector Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setClientMenuOpen(!clientMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center text-xs font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="max-w-[200px] sm:max-w-[280px] truncate">
                <div className="text-xs font-semibold text-slate-100 truncate">
                  {activeClient?.client_name || 'Select Client'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Code: {activeClient?.client_code || '—'} • {activeClient?.entity_type || 'Entity'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {clientMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-slate-200">Switch Client Account</div>
                  <div className="text-[11px] text-slate-400">
                    Select a client portfolio to view live matters and financials
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto py-1 space-y-1">
                  {PRESET_CLIENTS.map((c) => {
                    const isSelected = activeClient?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          selectPresetClient(c);
                          setClientMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                            : 'hover:bg-slate-800/70 border border-transparent text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold truncate text-slate-100">
                            {c.client_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="px-1 rounded bg-slate-800 text-blue-300 font-bold">
                              {c.client_code}
                            </span>
                            <span className="truncate">{c.email || 'No email registered'}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-slate-800 bg-slate-950/50 rounded-b-xl flex items-center justify-between text-[11px] text-slate-400">
                  <span>Authorized Client Session</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions: Dark mode toggle & sign out */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              title="Toggle theme"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 border border-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
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

