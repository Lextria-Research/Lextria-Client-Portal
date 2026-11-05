// src/lib/api.ts
// Data service for Lextria Unified Client Portal.
//
// All client data comes from /api/portal-data, which derives the client id from the
// verified session token. The browser never chooses which client's data it receives,
// and there is no direct-to-Supabase fallback (that path bypassed the server checks and
// silently rendered empty data when RLS denied it).
import { supabase } from './supabase';
import {
  UnifiedMatter,
  MatterEvent,
  BillingStageItem,
  RecoverableCostItem,
  ClientDocumentItem,
  ClientProfile,
  LegalEntity,
  BillingEntityCode,
} from '../types/client';

export interface PortalDataBundle {
  client: ClientProfile;
  entities: LegalEntity[];
  matters: UnifiedMatter[];
  events: MatterEvent[];
  billingStages: BillingStageItem[];
  recoverableCosts: RecoverableCostItem[];
  documents: ClientDocumentItem[];
  /** Sections the server could not load; the UI shows a notice instead of a silent empty list. */
  warnings: string[];
}

export class PortalApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
  }
}

const CACHE_TTL_MS = 20_000;
let cached: { userId: string; at: number; data: PortalDataBundle } | null = null;
let inflight: { userId: string; promise: Promise<PortalDataBundle> } | null = null;

export function clearPortalCache() {
  cached = null;
  inflight = null;
}

/**
 * Fetch the signed-in client's full portal bundle. Cached per auth user for 20 s and
 * de-duplicated while a request is in flight, so the several views mounting at once
 * share one network call. Throws PortalApiError on failure (never returns fake data).
 */
export async function fetchPortalData(force = false): Promise<PortalDataBundle> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user) {
    throw new PortalApiError('Sign in required.', 401);
  }
  const userId = session.user.id;

  if (!force && cached?.userId === userId && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }
  if (!force && inflight?.userId === userId) {
    return inflight.promise;
  }

  const promise = (async () => {
    const res = await fetch('/api/portal-data', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new PortalApiError(json.error || `Portal request failed (HTTP ${res.status}).`, res.status);
    }
    const bundle: PortalDataBundle = {
      client: json.client,
      entities: json.entities || [],
      matters: json.matters || [],
      events: json.events || [],
      billingStages: json.billingStages || [],
      recoverableCosts: json.recoverableCosts || [],
      documents: json.documents || [],
      warnings: json.warnings || [],
    };
    cached = { userId, at: Date.now(), data: bundle };
    return bundle;
  })();

  inflight = { userId, promise };
  try {
    return await promise;
  } finally {
    if (inflight?.promise === promise) inflight = null;
  }
}

// ---------------------------------------------------------------------------
// View-level accessors (kept with their previous signatures so the timeline, vault and
// detail views need no changes). The clientId argument is ignored: the server decides.
// ---------------------------------------------------------------------------

export async function fetchClientMatters(_clientId?: string, force = false): Promise<UnifiedMatter[]> {
  return (await fetchPortalData(force)).matters;
}

export async function fetchClientEvents(_clientId?: string, projectCodeId?: string): Promise<MatterEvent[]> {
  const { events } = await fetchPortalData();
  return projectCodeId ? events.filter((e) => e.project_code_id === projectCodeId) : events;
}

export async function fetchClientBillingStages(matterIds: string[]): Promise<BillingStageItem[]> {
  const ids = new Set(matterIds);
  return (await fetchPortalData()).billingStages.filter((b) => ids.has(b.project_code_id));
}

export async function fetchClientRecoverableCosts(matterIds: string[]): Promise<RecoverableCostItem[]> {
  const ids = new Set(matterIds);
  return (await fetchPortalData()).recoverableCosts.filter((c) => ids.has(c.project_code_id));
}

export async function fetchClientDocuments(matterIds: string[]): Promise<ClientDocumentItem[]> {
  const ids = new Set(matterIds);
  return (await fetchPortalData()).documents.filter((d) => ids.has(d.project_code_id));
}

/** Stage labels for the lifecycle stepper. Progress itself is computed server-side. */
export const PROSECUTION_STAGES: Record<string, string[]> = {
  IP_PATENT: [
    'IDF & Intake',
    'Provisional Filed',
    'Complete Specification Filed',
    'Request for Examination',
    'FER Response Submitted',
    'Hearing & Written Submissions',
    'Patent Granted',
  ],
  IP_PATENT_CS: [
    'IDF & Intake',
    'Complete Specification Filed',
    'Request for Examination',
    'FER Response Submitted',
    'Hearing & Written Submissions',
    'Patent Granted',
  ],
  IP_SOFT: [
    'Application Filed',
    'Formality Check Passed',
    'Examination Report Answered',
    'Journal Publication',
    'Registered',
  ],
  LITIGATION: [
    'Suit / Petition Filed',
    'Summons / Notice Issued',
    'Pleadings & Objections',
    'Arguments & Evidence',
    'Final Order / Decree',
  ],
  AGREEMENT: [
    'Term Sheet Finalized',
    'First Draft Formulated',
    'Counterparty Review & Redlines',
    'Execution & Sign-Off',
    'Closed / Implemented',
  ],
};

// ---------------------------------------------------------------------------
// Entity helpers. Grouping keys come from the DB column project_codes.billing_entity;
// tab labels and order come from core.legal_entities. Nothing here is hardcoded per firm.
// ---------------------------------------------------------------------------

export const UNASSIGNED_ENTITY = '__UNASSIGNED__';

export function entityKey(code: BillingEntityCode | null | undefined): string {
  return code || UNASSIGNED_ENTITY;
}

export function groupByEntity<T extends { billing_entity?: BillingEntityCode | null }>(
  rows: T[]
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const key = entityKey(row.billing_entity);
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push(row);
  }
  return out;
}

/**
 * Tabs to render: every active entity from the DB, plus an "Unassigned" bucket only if
 * some matter has no billing_entity (which signals a data problem staff should fix).
 */
export function entityTabs(
  entities: LegalEntity[],
  matters: UnifiedMatter[]
): { key: string; label: string; subtitle: string; entity: LegalEntity | null }[] {
  const tabs: { key: string; label: string; subtitle: string; entity: LegalEntity | null }[] = [...entities]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((e) => ({ key: e.code, label: e.display_name, subtitle: e.practice_areas, entity: e }));
  if (matters.some((m) => !m.billing_entity)) {
    tabs.push({
      key: UNASSIGNED_ENTITY,
      label: 'Other Matters',
      subtitle: 'Awaiting assignment by the firm',
      entity: null,
    });
  }
  return tabs;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getDepartmentLabel(dept: string): string {
  switch (dept) {
    case 'IP_PATENT':
      return 'Patent Prosecution';
    case 'IP_SOFT':
      return 'Trademark / Copyright / Design';
    case 'LITIGATION':
      return 'Dispute & Litigation';
    case 'AGREEMENT':
      return 'Commercial Agreement';
    default:
      return 'Corporate Advisory';
  }
}

export function getDepartmentColor(dept: string): { bg: string; text: string; border: string; badge: string } {
  switch (dept) {
    case 'IP_PATENT':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        badge: 'bg-blue-600 text-white',
      };
    case 'IP_SOFT':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        badge: 'bg-purple-600 text-white',
      };
    case 'LITIGATION':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        badge: 'bg-amber-600 text-white',
      };
    case 'AGREEMENT':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        badge: 'bg-emerald-600 text-white',
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-900',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-800',
        badge: 'bg-slate-600 text-white',
      };
  }
}
