// src/features/dashboard/ClientDashboardView.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Award,
  Layers,
  Scale,
  FileCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  fetchClientMatters,
  fetchClientEvents,
  formatDate,
  getDepartmentColor,
  getDepartmentLabel,
} from '../../lib/api';
import { UnifiedMatter, MatterEvent } from '../../types/client';
import { DepartmentBadge, MatterStatusBadge } from '../../components/common/StatusBadge';

export const ClientDashboardView: React.FC = () => {
  const { activeClient } = useAuth();
  const [matters, setMatters] = useState<UnifiedMatter[]>([]);
  const [events, setEvents] = useState<MatterEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeClient?.id) {
      loadData(activeClient.id);
    }
  }, [activeClient?.id]);

  const loadData = async (clientId: string) => {
    setLoading(true);
    try {
      const [mList, eList] = await Promise.all([
        fetchClientMatters(clientId),
        fetchClientEvents(clientId),
      ]);
      setMatters(mList);
      setEvents(eList);
    } finally {
      setLoading(false);
    }
  };

  const patentCount = matters.filter((m) => m.department === 'IP_PATENT').length;
  const softIpCount = matters.filter((m) => m.department === 'IP_SOFT').length;
  const litigationCount = matters.filter((m) => m.department === 'LITIGATION').length;
  const agreementCount = matters.filter((m) => m.department === 'AGREEMENT').length;

  return (
    <div className="space-y-8">
      {/* Welcome & Client Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Client Portfolio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {activeClient?.client_name || 'Client Overview'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time centralized tracking of patent prosecution, trademark registrations, active court litigations, and commercial contract executions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => activeClient?.id && loadData(activeClient.id)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Portfolio</span>
            </button>
            <Link
              to="/matters"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              <span>Explore All Matters</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Matters */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Matters</span>
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '—' : matters.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all 4 practice areas</p>
        </div>

        {/* Patents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Patents</span>
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {loading ? '—' : patentCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Invention filings &amp; grants</p>
        </div>

        {/* Trademarks / Soft IP */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Soft IP / TM</span>
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {loading ? '—' : softIpCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Trademarks &amp; copyrights</p>
        </div>

        {/* Litigation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Litigation</span>
            <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {loading ? '—' : litigationCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Court &amp; tribunal disputes</p>
        </div>

        {/* Agreements */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Agreements</span>
            <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {loading ? '—' : agreementCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Commercial contracts</p>
        </div>
      </div>

      {/* Main Grid: Recent Milestones Stream & Active Matters Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Matters Spotlight (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Active Matters Portfolio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recently updated client matters with current prosecution stage
              </p>
            </div>
            <Link
              to="/matters"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View all ({matters.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              <span>Loading active matters from central registry...</span>
            </div>
          ) : matters.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No matters registered for this client account yet.
            </div>
          ) : (
            <div className="space-y-3">
              {matters.slice(0, 6).map((matter) => (
                <div
                  key={matter.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {matter.code}
                      </span>
                      <DepartmentBadge department={matter.department} />
                      <MatterStatusBadge status={matter.status} />
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {matter.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>Filing/Registry: {matter.owning_app}</span>
                      <span>•</span>
                      <span>Created {formatDate(matter.created_at)}</span>
                    </div>
                  </div>

                  {/* Stage Progress Indicator */}
                  <div className="sm:text-right shrink-0">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">
                      Current Stage
                    </div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {matter.stage_progress?.currentStage || 'Prosecution Active'}
                    </div>
                    <div className="w-32 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 sm:ml-auto overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${matter.stage_progress?.percentage || 25}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Live Milestones Stream (1 col) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Milestones Stream
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official filings, orders &amp; publications
              </p>
            </div>
            <Link
              to="/timeline"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Full timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No official milestone events recorded yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {events.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="relative group">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-xs" />
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(ev.occurred_at)}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {ev.client_label || ev.title}
                    </div>
                    {ev.detail && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {ev.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Contact / Support Card */}
          <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Dedicated Practice Lead
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-300/80 mt-1">
              Have an urgent filing requirement or need an updated status report?
            </p>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
              <span>contact@lextria.in</span>
              <span className="font-mono">+91 80 4000 8000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ClientDashboardView;

