// src/features/dashboard/ClientDashboardView.tsx
// Client overview, split into one tab per billing entity (core.legal_entities):
//   Lextria Research            -> IP matters (patents, trademarks, copyrights, designs)
//   Pranav Bhat & Associates    -> litigation and agreements
// Which matter lands in which tab is decided by project_codes.billing_entity in the DB.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Scale,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Building2,
  Receipt,
  FileCheck,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  fetchPortalData,
  PortalDataBundle,
  entityTabs,
  entityKey,
  formatDate,
  formatINR,
  getDepartmentLabel,
} from '../../lib/api';
import { UnifiedMatter } from '../../types/client';
import { DepartmentBadge, MatterStatusBadge } from '../../components/common/StatusBadge';

// finance.billing_stages.billing_status values that represent work done / billable.
const BILLED_STATUSES = new Set(['UNBILLED_WORK_DONE', 'INVOICED', 'PAID']);

export const ClientDashboardView: React.FC = () => {
  const { activeClient } = useAuth();
  const [bundle, setBundle] = useState<PortalDataBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setBundle(await fetchPortalData(force));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your portfolio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeClient?.id) void loadData();
  }, [activeClient?.id, loadData]);

  const matters = bundle?.matters ?? [];
  const tabs = useMemo(() => entityTabs(bundle?.entities ?? [], matters), [bundle, matters]);

  const requested = searchParams.get('entity');
  const activeKey = tabs.some((t) => t.key === requested) ? requested! : tabs[0]?.key ?? null;
  const activeTab = tabs.find((t) => t.key === activeKey) ?? null;

  const selectTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('entity', key);
    setSearchParams(next, { replace: true });
  };

  // Everything below is scoped to the active entity.
  const inTab = <T extends { billing_entity?: string | null }>(rows: T[]) =>
    rows.filter((r) => entityKey(r.billing_entity) === activeKey);

  const tabMatters = useMemo(() => inTab(matters), [matters, activeKey]);
  const tabEvents = useMemo(() => inTab(bundle?.events ?? []), [bundle, activeKey]);
  const tabStages = useMemo(() => inTab(bundle?.billingStages ?? []), [bundle, activeKey]);
  const tabCosts = useMemo(() => inTab(bundle?.recoverableCosts ?? []), [bundle, activeKey]);

  // Department counts are derived from the data in this tab, not from a fixed list.
  const departmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of tabMatters) counts.set(m.department, (counts.get(m.department) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tabMatters]);

  const upcomingHearings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tabMatters
      .filter((m): m is UnifiedMatter & { next_hearing_date: string } => !!m.next_hearing_date && m.next_hearing_date >= today)
      .sort((a, b) => a.next_hearing_date.localeCompare(b.next_hearing_date));
  }, [tabMatters]);

  const feesBilled = tabStages.filter((s) => BILLED_STATUSES.has(s.status)).reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const costsIncurred = tabCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Overview Header & Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Portfolio Overview</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active matters, statutory deadlines, and progression milestones grouped by handling firm.
          </p>
        </div>

        <button
          onClick={() => void loadData(true)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer disabled:opacity-60"
          title="Refresh portfolio data"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Portfolio'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-300 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={() => void loadData(true)} className="text-xs font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}
      {!!bundle?.warnings.length && (
        <div role="status" className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Some sections could not be loaded ({bundle.warnings.join(', ')}). Figures below may be incomplete.
        </div>
      )}

      {/* Entity tabs */}
      {tabs.length > 0 && (
        <div role="tablist" aria-label="Firm" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tabs.map((tab) => {
            const count = matters.filter((m) => entityKey(m.billing_entity) === tab.key).length;
            const selected = tab.key === activeKey;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={selected}
                aria-controls="entity-panel"
                onClick={() => selectTab(tab.key)}
                className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
                  selected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Building2 className="w-4 h-4" />
                    {tab.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${selected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {loading ? '—' : count}
                  </span>
                </div>
                <p className={`text-[11px] mt-1 ${selected ? 'text-blue-100' : 'text-slate-400'}`}>{tab.subtitle}</p>
              </button>
            );
          })}
        </div>
      )}

      <div id="entity-panel" role="tabpanel" className="space-y-8">
        {/* KPI cards for the active entity */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KpiCard label="Matters" value={loading ? '—' : String(tabMatters.length)} hint={activeTab?.label ?? ''} icon={<Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />} />
          {departmentCounts.map(([dept, n]) => (
            <KpiCard key={dept} label={getDepartmentLabel(dept)} value={loading ? '—' : String(n)} hint="Active in this practice" icon={<FileCheck className="w-4 h-4 text-slate-500" />} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matters for this entity */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeTab?.label ?? 'Matters'}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recently updated matters with their current stage</p>
              </div>
              <Link
                to={activeKey ? `/matters?entity=${encodeURIComponent(activeKey)}` : '/matters'}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>View all ({tabMatters.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <EmptyCard><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />Loading matters...</EmptyCard>
            ) : tabMatters.length === 0 ? (
              <EmptyCard>No matters with {activeTab?.label ?? 'this firm'} yet.</EmptyCard>
            ) : (
              <div className="space-y-3">
                {tabMatters.slice(0, 6).map((matter) => (
                  <MatterRow key={matter.id} matter={matter} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Court dates: shown whenever this entity has matters with a listed hearing. */}
            {upcomingHearings.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-600" /> Upcoming hearings
                </h2>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {upcomingHearings.slice(0, 6).map((m) => (
                    <div key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{formatDate(m.next_hearing_date)}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{m.case_number || m.code}</span>
                        {m.court && <> · {m.court}</>}
                        {m.next_purpose && <> · {m.next_purpose}</>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Milestones for this entity */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Milestones</h2>
                <Link to="/timeline" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <span>Full timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                {tabEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No milestones recorded yet.</div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {tabEvents.slice(0, 5).map((ev) => (
                      <div key={ev.id} className="relative">
                        <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(ev.occurred_at)}</span>
                          {ev.project_code && <span>· {ev.project_code}</span>}
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">{ev.client_label || ev.title}</div>
                        {ev.detail && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{ev.detail}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {activeTab?.entity && (
              <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
                <h3 className="font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">Practice Entity</h3>
                <p className="mt-1 font-semibold">{activeTab.entity.display_name}</p>
                {activeTab.entity.gstin && <p className="font-mono mt-0.5">GSTIN {activeTab.entity.gstin}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ label: string; value: string; hint: string; icon: React.ReactNode }> = ({ label, value, hint, icon }) => (
  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
    <p className="text-[11px] text-slate-400 mt-1 truncate">{hint}</p>
  </div>
);

const EmptyCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
    {children}
  </div>
);

const MatterRow: React.FC<{ matter: UnifiedMatter }> = ({ matter }) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="space-y-1.5 min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{matter.code}</span>
        <DepartmentBadge department={matter.department} />
        <MatterStatusBadge status={matter.status} />
      </div>
      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{matter.title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">Opened {formatDate(matter.created_at)}</div>
      {matter.court && (
        <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
          <span className="font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/50 flex items-center gap-1">
            <Scale className="w-3 h-3" />
            <span>{matter.court}</span>
            {matter.case_number && <span className="font-mono">({matter.case_number})</span>}
          </span>
          {matter.next_hearing_date && (
            <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" />
              <span>Next: <strong>{formatDate(matter.next_hearing_date)}</strong>{matter.next_purpose && ` (${matter.next_purpose})`}</span>
            </span>
          )}
        </div>
      )}
    </div>
    <div className="sm:text-right shrink-0">
      <div className="text-[11px] font-semibold text-slate-400 mb-1">Current Stage</div>
      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{matter.stage_progress?.currentStage ?? '—'}</div>
      <div className="w-32 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 sm:ml-auto overflow-hidden">
        <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${matter.stage_progress?.percentage ?? 0}%` }} />
      </div>
    </div>
  </div>
);

export default ClientDashboardView;
