// src/features/timeline/ClientTimelineView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  History,
  Search,
  Filter,
  Award,
  Layers,
  Scale,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fetchClientEvents, formatDate, fetchClientMatters } from '../../lib/api';
import { MatterEvent, UnifiedMatter } from '../../types/client';

export const ClientTimelineView: React.FC = () => {
  const { activeClient } = useAuth();
  const [events, setEvents] = useState<MatterEvent[]>([]);
  const [matters, setMatters] = useState<UnifiedMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatterId, setSelectedMatterId] = useState<string>('ALL');

  useEffect(() => {
    if (activeClient?.id) {
      loadTimeline(activeClient.id);
    }
  }, [activeClient?.id]);

  const loadTimeline = async (clientId: string) => {
    setLoading(true);
    try {
      const [eList, mList] = await Promise.all([
        fetchClientEvents(clientId),
        fetchClientMatters(clientId),
      ]);
      setEvents(eList);
      setMatters(mList);
    } finally {
      setLoading(false);
    }
  };

  const matterMap = useMemo(() => {
    return Object.fromEntries(matters.map((m) => [m.id, m]));
  }, [matters]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedMatterId !== 'ALL' && ev.project_code_id !== selectedMatterId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (ev.title || '').toLowerCase().includes(q);
        const labelMatch = (ev.client_label || '').toLowerCase().includes(q);
        const detailMatch = (ev.detail || '').toLowerCase().includes(q);
        const codeMatch = (ev.event_code || '').toLowerCase().includes(q);
        const matter = matterMap[ev.project_code_id];
        const mCodeMatch = matter?.code?.toLowerCase().includes(q);
        if (!titleMatch && !labelMatch && !detailMatch && !codeMatch && !mCodeMatch) return false;
      }
      return true;
    });
  }, [events, selectedMatterId, searchQuery, matterMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Milestones &amp; Recorded Filings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Official chronological timeline of patent prosecution events, trademark journals, and court filings
          </p>
        </div>

        <button
          onClick={() => activeClient?.id && loadTimeline(activeClient.id)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Milestones</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search milestone title, event code (e.g. FER, GRANT), or details..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-blue-600 shadow-xs"
          />
        </div>

        <select
          value={selectedMatterId}
          onChange={(e) => setSelectedMatterId(e.target.value)}
          className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-blue-600 shadow-xs cursor-pointer"
        >
          <option value="ALL">All Associated Matters ({matters.length})</option>
          {matters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} - {m.title.substring(0, 30)}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline Stream */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading milestone timeline...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No milestone events matching your filter criteria.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {filteredEvents.map((ev) => {
              const matter = matterMap[ev.project_code_id];
              return (
                <div key={ev.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900 shadow-xs flex items-center justify-center text-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {ev.event_code}
                        </span>
                        {matter && (
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            Matter: {matter.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(ev.occurred_at)}</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {ev.client_label || ev.title}
                    </h3>

                    {ev.detail && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {ev.detail}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Source Registry: {ev.source_app}</span>
                      <span>Milestone Verified &amp; Client Shared</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default ClientTimelineView;
