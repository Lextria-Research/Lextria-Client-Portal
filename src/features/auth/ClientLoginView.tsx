// src/features/auth/ClientLoginView.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth, PRESET_CLIENTS } from '../../lib/auth';
import { ClientProfile } from '../../types/client';

export const ClientLoginView: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, selectPresetClient } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your client account email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password.trim());
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or client account not found.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (client: ClientProfile) => {
    selectPresetClient(client);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      {/* Decorative gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/30 border border-blue-400/20">
            L
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Lextria Client Portal
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          Unified Legal Practice &amp; Intellectual Property Transparency
        </p>
      </div>

      <div className="mt-8 relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-5 sm:px-10 shadow-2xl rounded-2xl border border-slate-800">
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client Account Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. legal@clientcompany.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Portal Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-blue-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating with Central Registry...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Client Profiles */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>1-Click Test &amp; Preview Portfolios</span>
            </div>
            <div className="space-y-2">
              {PRESET_CLIENTS.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handlePresetSelect(client)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-800 hover:border-blue-500/50 bg-slate-800/40 hover:bg-blue-950/20 transition text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
                      {client.client_code.substring(0, 3)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300 truncate transition">
                        {client.client_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {client.client_code} • {client.entity_type}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-blue-400 opacity-80 group-hover:opacity-100 shrink-0">
                    Explore →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Client accounts and credentials are created and provisioned via{' '}
          <span className="text-slate-400 font-medium">Lextria Task Manager Settings → Clients</span>.
        </p>
      </div>
    </div>
  );
};
export default ClientLoginView;

