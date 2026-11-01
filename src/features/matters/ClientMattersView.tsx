// src/features/matters/ClientMattersView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Briefcase,
  Award,
  Layers,
  Scale,
  FileCheck,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fetchClientMatters, formatDate } from '../../lib/api';
import { UnifiedMatter, DepartmentType } from '../../types/client';
import { DepartmentBadge, MatterStatusBadge } from '../../components/common/StatusBadge';
import { MatterDetailModal } from './MatterDetailModal';

export const ClientMattersView: React.FC = () => {
  const { activeClient } = useAuth();
  const [matters, setMatters] = useState<UnifiedMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DepartmentType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMatter, setSelectedMatter] = useState<UnifiedMatter | null>(null);

  useEffect(() => {
    if (activeClient?.id) {
      loadMatters(activeClient.id);
    }
  }, [activeClient?.id]);

  const loadMatters = async (clientId: string) => {
    setLoading(true);
    try {
      const data = await fetchClientMatters(clientId);
      setMatters(data);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: DepartmentType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'ALL', label: 'All Matters', icon: Briefcase },
    { id: 'IP_PATENT', label: 'Patents', icon: Award },
    { id: 'IP_SOFT', label: 'Trademarks / Soft IP', icon: Layers },
    { id: 'LITIGATION', label: 'Litigation & Disputes', icon: Scale },
    { id: 'AGREEMENT', label: 'Commercial Agreements', icon: FileCheck },
  ];

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      // Department tab filter
      if (activeTab !== 'ALL' && m.department !== activeTab) return false;

      // Status filter
      if (statusFilter !== 'ALL') {
        const norm = (m.status || '').toUpperCase();
        if (statusFilter === 'GRANTED' && !norm.includes('GRANT') && !norm.includes('REGISTER')) return false;
        if (statusFilter === 'ACTIVE' && (norm.includes('GRANT') || norm.includes('CLOSED'))) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (m.code || '').toLowerCase().includes(q);
        const titleMatch = (m.title || '').toLowerCase().includes(q);
        const appMatch = (m.owning_app || '').toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !appMatch) return false;
      }

      return true;
    });
  }, [matters, activeTab, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Matters &amp; Case Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Comprehensive registry of all IP assets, proceedings, and transactional contracts
          </p>
        </div>

        <button
          onClick={() => activeClient?.id && loadMatters(activeClient.id)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload Matters</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div className="flex space-x-2 sm:space-x-4 pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === 'ALL'
                ? matters.length
                : matters.filter((m) => m.department === tab.id).length;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by matter code (e.g. MCR303, LT09), title, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-blue-600 shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-blue-600 shadow-xs cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">In Prosecution / Active</option>
          <option value="GRANTED">Granted / Registered</option>
        </select>
      </div>

      {/* Matters Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading matters for {activeClient?.client_name}...</span>
          </div>
        ) : filteredMatters.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No matters found matching your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMatters.map((matter) => (
              <div
                key={matter.id}
                onClick={() => setSelectedMatter(matter)}
                className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Code, Title, Tags */}
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition">
                      {matter.code}
                    </span>
                    <DepartmentBadge department={matter.department} />
                    <MatterStatusBadge status={matter.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                    {matter.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Registry: {matter.owning_app}</span>
                    <span>•</span>
                    <span>Docketed: {formatDate(matter.created_at)}</span>
                    {matter.events_count !== undefined && (
                      <>
                        <span>•</span>
                        <span>{matter.events_count} Milestones Logged</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Stage Stepper preview & details arrow */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="hidden sm:block text-right">
                    <div className="text-[11px] font-semibold text-slate-400">Current Phase</div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {matter.stage_progress?.currentStage || 'Active'}
                    </div>
                    <div className="w-28 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 ml-auto overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${matter.stage_progress?.percentage || 25}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {filteredMatters.length} of {matters.length} matters</span>
          <span>Click any matter row for full prosecution milestones &amp; case details</span>
        </div>
      </div>

      {/* Matter Detail Modal */}
      <MatterDetailModal matter={selectedMatter} onClose={() => setSelectedMatter(null)} />
    </div>
  );
};
export default ClientMattersView;

