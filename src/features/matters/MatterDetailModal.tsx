// src/features/matters/MatterDetailModal.tsx
import React, { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  Award,
  Layers,
  Scale,
  FileCheck,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { UnifiedMatter, MatterEvent } from '../../types/client';
import { fetchClientEvents, formatDate } from '../../lib/api';
import { DepartmentBadge, MatterStatusBadge } from '../../components/common/StatusBadge';
import { MatterTimelineStepper } from '../../components/common/MatterTimelineStepper';

interface ModalProps {
  matter: UnifiedMatter | null;
  onClose: () => void;
}

export const MatterDetailModal: React.FC<ModalProps> = ({ matter, onClose }) => {
  const [events, setEvents] = useState<MatterEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (matter?.id) {
      setLoading(true);
      fetchClientEvents(matter.client_id, matter.id)
        .then(setEvents)
        .finally(() => setLoading(false));
    }
  }, [matter?.id, matter?.client_id]);

  if (!matter) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-extrabold px-3 py-1 rounded-lg bg-blue-600 text-white shadow-xs">
              {matter.code}
            </span>
            <DepartmentBadge department={matter.department} size="md" />
            <MatterStatusBadge status={matter.status} />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Matter Title & Core Info */}
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
              {matter.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Originating App: {matter.owning_app}</span>
              <span>•</span>
              <span>Registered {formatDate(matter.created_at)}</span>
              <span>•</span>
              <span>Internal Ref ID: {matter.id.substring(0, 8)}</span>
            </div>
          </div>

          {/* Court & Litigation Details if applicable */}
          {matter.court && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Scale className="w-4 h-4" />
                  <span>Litigation &amp; Court Details</span>
                </div>
                {matter.client_role && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Role: {matter.client_role}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Court / Forum:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{matter.court}</p>
                  {matter.bench && <p className="text-[11px] text-slate-500">Bench: {matter.bench}</p>}
                </div>
                <div>
                  <span className="text-slate-400">Case &amp; CNR Number:</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{matter.case_number || 'Pending'}</p>
                  {matter.cnr_number && <p className="font-mono text-[11px] text-slate-500">CNR: {matter.cnr_number}</p>}
                </div>
                {matter.filing_date && (
                  <div>
                    <span className="text-slate-400">Date of Filing:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(matter.filing_date)}</p>
                  </div>
                )}
                {matter.next_hearing_date && (
                  <div className="sm:col-span-2 pt-2 border-t border-amber-500/10 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                      <Calendar className="w-4 h-4" />
                      <span>Next Hearing: {formatDate(matter.next_hearing_date)}</span>
                    </span>
                    {matter.next_purpose && (
                      <span className="text-slate-600 dark:text-slate-400">
                        Purpose: <strong className="text-slate-800 dark:text-slate-200">{matter.next_purpose}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Patent Details if applicable */}
          {matter.department === 'IP_PATENT' && (
            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <Award className="w-4 h-4" />
                  <span>Patent Prosecution &amp; Filing Details</span>
                </div>
                {matter.specification_type && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                    Spec: {matter.specification_type}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Application Number:</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {matter.application_number || 'Awaiting Filing Receipt'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Current Docket Status:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {matter.patent_status || matter.status || 'Active Docket'}
                  </p>
                </div>
                {matter.patent_number && (
                  <div className="sm:col-span-2 pt-2 border-t border-blue-500/10 flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Patent Granted: No. {matter.patent_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lifecycle Stepper */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
              Matter Prosecution &amp; Execution Lifecycle
            </div>
            <MatterTimelineStepper
              department={matter.department}
              stageIndex={matter.stage_progress?.stageIndex ?? 0}
              stages={matter.stage_progress?.stages}
            />
          </div>

          {/* Event History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Milestones &amp; Recorded Filings
              </h3>
              <span className="text-xs text-slate-400">
                {events.length} milestone{events.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Loading matter milestones...
              </div>
            ) : events.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                Initial application docketed. Next statutory milestones will appear here as filings are completed.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {events.map((ev) => (
                  <div key={ev.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(ev.occurred_at)}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold text-blue-600 dark:text-blue-400">
                        {ev.event_code}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {ev.client_label || ev.title}
                    </div>
                    {ev.detail && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {ev.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Official Registry Record • Counsel Nexus
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default MatterDetailModal;

