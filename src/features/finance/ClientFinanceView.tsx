// src/features/finance/ClientFinanceView.tsx
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  Receipt,
  FileCheck,
  TrendingDown,
  Building,
  RefreshCw,
  AlertCircle,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { fetchPortalData, PortalDataBundle, entityTabs, entityKey, formatINR, formatDate } from '../../lib/api';

// Billable statuses of finance.billing_stages.billing_status
const BILLED = new Set(['UNBILLED_WORK_DONE', 'INVOICED', 'PAID']);

export const ClientFinanceView: React.FC = () => {
  const { activeClient } = useAuth();
  const [bundle, setBundle] = useState<PortalDataBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stages' | 'costs' | 'statement'>('stages');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (activeClient?.id) {
      void loadFinanceData();
    }
  }, [activeClient?.id]);

  const loadFinanceData = async (force = false) => {
    setLoading(true);
    setLoadError(null);
    try {
      setBundle(await fetchPortalData(force));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the ledger.');
    } finally {
      setLoading(false);
    }
  };

  // Each firm entity has its own ledger, GSTIN and bank account. Never mix them.
  const matters = bundle?.matters ?? [];
  const ledgerTabs = entityTabs(bundle?.entities ?? [], matters);
  const requested = searchParams.get('entity');
  const activeEntityKey = ledgerTabs.some((t) => t.key === requested) ? requested! : ledgerTabs[0]?.key ?? null;
  const activeEntity = ledgerTabs.find((t) => t.key === activeEntityKey)?.entity ?? null;
  const selectEntity = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('entity', key);
    setSearchParams(next, { replace: true });
  };

  const billingStages = (bundle?.billingStages ?? []).filter((s) => entityKey(s.billing_entity) === activeEntityKey);
  const costs = (bundle?.recoverableCosts ?? []).filter((c) => entityKey(c.billing_entity) === activeEntityKey);
  const matterCodeMap = Object.fromEntries(matters.map((m) => [m.id, m.code]));

  const totalCompletedMilestones = billingStages
    .filter((s) => BILLED.has(s.status))
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const totalGovtDisbursements = costs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  // Advances/retainers live in finance.advances and are not exposed to the portal yet.
  // The previous hardcoded per-client retainer figures were demo values and have been removed.
  const netDueBalance = totalCompletedMilestones + totalGovtDisbursements;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Financial Ledger &amp; Billing Stages
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time statement of completed milestone billing, statutory government fees, and retainer balance
          </p>
        </div>

        <button
          onClick={() => void loadFinanceData(true)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload Ledger</span>
        </button>
      </div>

      {loadError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {loadError}
        </div>
      )}

      {/* One ledger per billing entity */}
      <div role="tablist" aria-label="Billing entity" className="flex flex-wrap gap-2">
        {ledgerTabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === activeEntityKey}
            onClick={() => selectEntity(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              t.key === activeEntityKey
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Billing entity card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Billed By</span>
            <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {activeEntity?.display_name ?? 'Unassigned'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">{activeEntity?.gstin ? `GSTIN ${activeEntity.gstin}` : '—'}</p>
        </div>

        {/* Completed Milestones Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Milestone Work</span>
            <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {formatINR(totalCompletedMilestones)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Triggered professional fees</p>
        </div>

        {/* Govt Disbursements Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Statutory Fees</span>
            <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {formatINR(totalGovtDisbursements)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Official patent/trademark fees</p>
        </div>

        {/* Net Settlement Balance Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Billable</span>
            <CreditCard className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {formatINR(netDueBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Fees + costs, before advances and payments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('stages')}
            className={`pb-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'stages'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Milestone Work Done ({billingStages.length})
          </button>
          <button
            onClick={() => setActiveTab('costs')}
            className={`pb-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'costs'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Statutory Govt Fees ({costs.length})
          </button>
          <button
            onClick={() => setActiveTab('statement')}
            className={`pb-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'statement'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Account Statement &amp; Remittance Details
          </button>
        </div>
      </div>

      {/* Tab 1: Billing Stages Table */}
      {activeTab === 'stages' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {billingStages.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No milestone billing stages configured yet. Stages automatically populate when milestone events trigger in patent, trademark, or litigation practices.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="p-3.5 pl-5">Matter Code</th>
                    <th className="p-3.5">Milestone Stage</th>
                    <th className="p-3.5">Trigger Event</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 pr-5 text-right">Billing Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {billingStages.map((stage) => (
                    <tr key={stage.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {matterCodeMap[stage.project_code_id] || '—'}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {stage.stage_name}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {stage.trigger_event}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(stage.amount)}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stage.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : stage.status === 'INVOICED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : stage.status === 'UNBILLED_WORK_DONE'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {stage.status === 'UNBILLED_WORK_DONE' ? 'WORK DONE' : stage.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recoverable Costs & Govt Fees Table */}
      {activeTab === 'costs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {costs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No statutory out-of-pocket costs recorded yet. Official filing fees (Form 1, Form 18, Form 9) logged by practice dashboards will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="p-3.5 pl-5">Date</th>
                    <th className="p-3.5">Matter Code</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 pr-5 text-right">Posting Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {costs.map((cost) => (
                    <tr key={cost.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 pl-5 font-mono text-slate-500 dark:text-slate-400">
                        {formatDate(cost.cost_date)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {matterCodeMap[cost.project_code_id] || '—'}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {cost.category}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {cost.description}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(cost.amount)}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {cost.posting_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Remittance & Banking Details */}
      {activeTab === 'statement' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Remittance Account: {activeEntity?.display_name ?? '—'}</span>
            </h3>
            {activeEntity?.bank_account_no ? (
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                {([
                  ['Account Name', activeEntity.bank_account_name],
                  ['Bank', activeEntity.bank_name],
                  ['Account No', activeEntity.bank_account_no],
                  ['IFSC Code', activeEntity.bank_ifsc],
                  ['Branch', activeEntity.bank_branch],
                ] as const).map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">{label}:</span>
                    <span className="font-bold">{value || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Bank details for this firm will be shared on your invoice.</p>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Tax &amp; GST Compliance</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Client GSTIN:</span>
                <span>{activeClient?.gstin || 'Unregistered / Exempt'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Client PAN:</span>
                <span>{activeClient?.pan || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Firm GSTIN:</span>
                <span className="font-bold">{activeEntity?.gstin || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Invoicing Cycle:</span>
                <span>Milestone-triggered &amp; Monthly Retainer</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClientFinanceView;

