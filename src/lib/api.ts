// src/lib/api.ts
// Data service for Lextria Unified Client Portal
import { supabase, coreDb, financeDb } from './supabase';
import {
  UnifiedMatter,
  MatterEvent,
  BillingStageItem,
  RecoverableCostItem,
  ClientDocumentItem,
  DepartmentType,
} from '../types/client';

export const PROSECUTION_STAGES: Record<string, string[]> = {
  IP_PATENT: [
    'Provisional Filed',
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
    'Trademark Registered',
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

export function calculateStageProgress(
  department: string,
  events: MatterEvent[] = [],
  litCase?: any
) {
  const stageList = PROSECUTION_STAGES[department] || PROSECUTION_STAGES['LITIGATION'];
  const totalStages = stageList.length;

  if (department === 'LITIGATION' && litCase?.current_stage) {
    const cs = litCase.current_stage.toLowerCase();
    let stageIdx = 0;
    if (cs.includes('decree') || cs.includes('order') || cs.includes('disposed') || cs.includes('judgment')) stageIdx = 4;
    else if (cs.includes('argument') || cs.includes('evidence') || cs.includes('hearing') || cs.includes('trial')) stageIdx = 3;
    else if (cs.includes('pleading') || cs.includes('objection') || cs.includes('reply') || cs.includes('rejoinder') || cs.includes('ws')) stageIdx = 2;
    else if (cs.includes('summons') || cs.includes('notice') || cs.includes('admission')) stageIdx = 1;
    else stageIdx = 0;

    return {
      currentStage: litCase.current_stage,
      stageIndex: stageIdx,
      totalStages,
      percentage: Math.round(((stageIdx + 1) / totalStages) * 100),
    };
  }

  if (!events || events.length === 0) {
    return {
      currentStage: stageList[0],
      stageIndex: 0,
      totalStages,
      percentage: Math.round((1 / totalStages) * 100),
    };
  }

  const eventCodes = events.map((e) => (e.event_code || '').toUpperCase());

  let stageIndex = 0;
  if (department === 'IP_PATENT') {
    if (eventCodes.some((c) => c.includes('GRANT'))) stageIndex = 5;
    else if (eventCodes.some((c) => c.includes('HEARING') || c.includes('WS'))) stageIndex = 4;
    else if (eventCodes.some((c) => c.includes('FER_REPLY') || c.includes('FER'))) stageIndex = 3;
    else if (eventCodes.some((c) => c.includes('RFE'))) stageIndex = 2;
    else if (eventCodes.some((c) => c.includes('CS_FILED'))) stageIndex = 1;
    else stageIndex = 0;
  } else if (department === 'IP_SOFT') {
    if (eventCodes.some((c) => c.includes('GRANT') || c.includes('REGISTERED'))) stageIndex = 4;
    else if (eventCodes.some((c) => c.includes('PUBLISHED') || c.includes('JOURNAL'))) stageIndex = 3;
    else if (eventCodes.some((c) => c.includes('FER') || c.includes('REPLY'))) stageIndex = 2;
    else if (eventCodes.some((c) => c.includes('FORMALITY'))) stageIndex = 1;
    else stageIndex = 0;
  } else if (department === 'LITIGATION') {
    if (eventCodes.some((c) => c.includes('DECREE') || c.includes('ORDER') || c.includes('JUDGMENT'))) stageIndex = 4;
    else if (eventCodes.some((c) => c.includes('ARGUMENT') || c.includes('EVIDENCE'))) stageIndex = 3;
    else if (eventCodes.some((c) => c.includes('SUMMONS') || c.includes('NOTICE'))) stageIndex = 1;
    else stageIndex = 0;
  } else {
    stageIndex = Math.min(events.length - 1, totalStages - 1);
  }

  return {
    currentStage: stageList[stageIndex],
    stageIndex,
    totalStages,
    percentage: Math.round(((stageIndex + 1) / totalStages) * 100),
  };
}

export interface PortalDataBundle {
  client?: any;
  matters: UnifiedMatter[];
  events: MatterEvent[];
  billingStages: BillingStageItem[];
  recoverableCosts: RecoverableCostItem[];
  documents: ClientDocumentItem[];
}

let cachedBundle: { clientId: string; timestamp: number; data: PortalDataBundle } | null = null;
let activeFetchPromise: Promise<PortalDataBundle> | null = null;

export function clearPortalCache() {
  cachedBundle = null;
  activeFetchPromise = null;
}

export async function fetchPortalData(clientId: string, force = false): Promise<PortalDataBundle> {
  const now = Date.now();
  if (!force && cachedBundle && cachedBundle.clientId === clientId && (now - cachedBundle.timestamp < 20000)) {
    return cachedBundle.data;
  }

  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'x-client-id': clientId,
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/portal-data?clientId=${encodeURIComponent(clientId)}`, {
        headers,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const bundle: PortalDataBundle = {
            client: json.client || null,
            matters: json.matters || [],
            events: json.events || [],
            billingStages: json.billingStages || [],
            recoverableCosts: json.recoverableCosts || [],
            documents: json.documents || [],
          };
          cachedBundle = { clientId, timestamp: Date.now(), data: bundle };
          return bundle;
        }
      } else {
        console.warn('API /api/portal-data returned HTTP', res.status);
      }
    } catch (err) {
      console.warn('API /api/portal-data call error:', err);
    } finally {
      activeFetchPromise = null;
    }

    // Fallback: direct Supabase querying
    const fallbackMatters = await fetchDirectClientMatters(clientId);
    const bundle: PortalDataBundle = {
      matters: fallbackMatters,
      events: [],
      billingStages: [],
      recoverableCosts: [],
      documents: [],
    };
    cachedBundle = { clientId, timestamp: Date.now(), data: bundle };
    return bundle;
  })();

  return activeFetchPromise;
}

/**
 * Direct fallback for fetchClientMatters in case serverless is unreachable
 */
async function fetchDirectClientMatters(clientId: string): Promise<UnifiedMatter[]> {
  try {
    const { data, error } = await coreDb
      .from('project_codes')
      .select('*')
      .eq('client_id', clientId)
      .limit(2500)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Direct fallback matters error:', error.message);
      return [];
    }

    const matters: UnifiedMatter[] = data || [];
    if (matters.length === 0) return [];

    const matterIds = matters.map((m) => m.id);
    const { data: eventsData } = await coreDb
      .from('matter_events')
      .select('*')
      .in('project_code_id', matterIds)
      .eq('client_visible', true)
      .order('occurred_at', { ascending: false });

    const eventsByMatter: Record<string, MatterEvent[]> = {};
    (eventsData || []).forEach((ev: MatterEvent) => {
      if (!eventsByMatter[ev.project_code_id]) {
        eventsByMatter[ev.project_code_id] = [];
      }
      eventsByMatter[ev.project_code_id].push(ev);
    });

    return matters.map((m) => {
      const matterEvents = eventsByMatter[m.id] || [];
      return {
        ...m,
        last_event: matterEvents[0] || null,
        events_count: matterEvents.length,
        stage_progress: calculateStageProgress(m.department, matterEvents),
      };
    });
  } catch (err) {
    console.error('fetchDirectClientMatters error:', err);
    return [];
  }
}

/**
 * Fetch all matters belonging to client across all 4 departments (with Litigator case enrichment)
 */
export async function fetchClientMatters(clientId: string, force = false): Promise<UnifiedMatter[]> {
  try {
    const bundle = await fetchPortalData(clientId, force);
    if (bundle && Array.isArray(bundle.matters)) {
      return bundle.matters;
    }
  } catch (err) {
    console.warn('fetchClientMatters bundle lookup failed:', err);
  }
  return fetchDirectClientMatters(clientId);
}

/**
 * Fetch chronological milestones/events stream for client
 */
export async function fetchClientEvents(
  clientId: string,
  projectCodeId?: string
): Promise<MatterEvent[]> {
  try {
    const bundle = await fetchPortalData(clientId);
    if (bundle && Array.isArray(bundle.events)) {
      if (projectCodeId) {
        return bundle.events.filter((e) => e.project_code_id === projectCodeId);
      }
      return bundle.events;
    }
  } catch (err) {
    console.warn('fetchClientEvents bundle lookup failed:', err);
  }

  // Fallback to direct coreDb
  try {
    let query = coreDb
      .from('matter_events')
      .select('*, project_codes!inner(client_id, code, title)')
      .eq('client_visible', true)
      .order('occurred_at', { ascending: false });

    if (projectCodeId) {
      query = query.eq('project_code_id', projectCodeId);
    } else {
      query = query.eq('project_codes.client_id', clientId);
    }

    const { data } = await query;
    return data || [];
  } catch (err) {
    console.error('Direct fetchClientEvents error:', err);
    return [];
  }
}

/**
 * Fetch billing stages (work-in-progress / completed milestone billing)
 */
export async function fetchClientBillingStages(
  matterIds: string[],
  clientId?: string
): Promise<BillingStageItem[]> {
  if (!matterIds.length) return [];
  if (cachedBundle?.data?.billingStages?.length) {
    return cachedBundle.data.billingStages.filter((b) => matterIds.includes(b.project_code_id));
  }
  if (clientId) {
    try {
      const bundle = await fetchPortalData(clientId);
      return (bundle.billingStages || []).filter((b) => matterIds.includes(b.project_code_id));
    } catch (e) {}
  }
  try {
    const { data } = await financeDb
      .from('billing_stages')
      .select('*')
      .in('project_code_id', matterIds)
      .order('created_at', { ascending: false });
    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Fetch official recoverable government fees and out-of-pocket costs
 */
export async function fetchClientRecoverableCosts(
  matterIds: string[],
  clientId?: string
): Promise<RecoverableCostItem[]> {
  if (!matterIds.length) return [];
  if (cachedBundle?.data?.recoverableCosts?.length) {
    return cachedBundle.data.recoverableCosts.filter((c) => matterIds.includes(c.project_code_id));
  }
  if (clientId) {
    try {
      const bundle = await fetchPortalData(clientId);
      return (bundle.recoverableCosts || []).filter((c) => matterIds.includes(c.project_code_id));
    } catch (e) {}
  }
  try {
    const { data } = await coreDb
      .from('recoverable_costs')
      .select('*')
      .in('project_code_id', matterIds)
      .order('cost_date', { ascending: false });
    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Fetch client-shared legal documents & filings
 */
export async function fetchClientDocuments(
  matterIds: string[],
  clientId?: string
): Promise<ClientDocumentItem[]> {
  if (cachedBundle?.data?.documents?.length) {
    if (matterIds.length === 0) return cachedBundle.data.documents;
    return cachedBundle.data.documents.filter(
      (d) => !d.project_code_id || matterIds.includes(d.project_code_id)
    );
  }
  if (clientId) {
    try {
      const bundle = await fetchPortalData(clientId);
      return bundle.documents || [];
    } catch (e) {}
  }
  try {
    let query = coreDb
      .from('documents')
      .select('*')
      .eq('client_shared', true)
      .order('uploaded_at', { ascending: false });

    if (matterIds.length > 0) {
      query = query.or(`project_code_id.in.(${matterIds.join(',')}),project_code_id.is.null`);
    }

    const { data } = await query;
    return data || [];
  } catch (err) {
    return [];
  }
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function getDepartmentLabel(dept: string): string {
  switch (dept) {
    case 'IP_PATENT':
      return 'Patent Prosecution';
    case 'IP_SOFT':
      return 'Trademark / Soft IP';
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
