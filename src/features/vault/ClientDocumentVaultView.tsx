// src/features/vault/ClientDocumentVaultView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderLock,
  Search,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  File,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fetchClientDocuments, fetchClientMatters, formatDate } from '../../lib/api';
import { ClientDocumentItem, UnifiedMatter } from '../../types/client';

export const ClientDocumentVaultView: React.FC = () => {
  const { activeClient } = useAuth();
  const [documents, setDocuments] = useState<ClientDocumentItem[]>([]);
  const [matters, setMatters] = useState<UnifiedMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    if (activeClient?.id) {
      loadDocs(activeClient.id);
    }
  }, [activeClient?.id]);

  const loadDocs = async (clientId: string) => {
    setLoading(true);
    try {
      const mList = await fetchClientMatters(clientId);
      setMatters(mList);
      const matterIds = mList.map((m) => m.id);
      const docList = await fetchClientDocuments(matterIds);
      setDocuments(docList);
    } finally {
      setLoading(false);
    }
  };

  const matterMap = useMemo(() => {
    return Object.fromEntries(matters.map((m) => [m.id, m.code]));
  }, [matters]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (categoryFilter !== 'ALL' && doc.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fileMatch = (doc.file_name || '').toLowerCase().includes(q);
        const catMatch = (doc.category || '').toLowerCase().includes(q);
        const matterCode = doc.project_code_id ? matterMap[doc.project_code_id] || '' : '';
        const mMatch = matterCode.toLowerCase().includes(q);
        if (!fileMatch && !catMatch && !mMatch) return false;
      }
      return true;
    });
  }, [documents, categoryFilter, searchQuery, matterMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Client Document Vault
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Encrypted repository of official patent specifications, trademark certificates, pleadings, and executed contracts
          </p>
        </div>

        <button
          onClick={() => activeClient?.id && loadDocs(activeClient.id)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload Vault</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by file name, category, or matter code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-blue-600 shadow-xs"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-56 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-blue-600 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Categories ({documents.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading encrypted document vault...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No client-shared documents found in the vault for {activeClient?.client_name}.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDocs.map((doc) => {
              const matterCode = doc.project_code_id ? matterMap[doc.project_code_id] : null;
              return (
                <div
                  key={doc.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.file_name}
                        </span>
                        {matterCode && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {matterCode}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {doc.category || 'General'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                        <span>{Math.round((doc.size_bytes || 0) / 1024)} KB</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                        <span>•</span>
                        <span>Source: {doc.source_app}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {doc.zoho_permalink ? (
                      <a
                        href={doc.zoho_permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Document</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-400 cursor-not-allowed"
                      >
                        Vault File
                      </button>
                    )}
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
export default ClientDocumentVaultView;
