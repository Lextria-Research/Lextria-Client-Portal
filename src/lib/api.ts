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

export function calculateStageProgress(department: string, events: MatterEvent[] = []) {
  const stageList = PROSECUTION_STAGES[department] || PROSECUTION_STAGES['IP_PATENT'];
  const totalStages = stageList.length;

  if (!events || events.length === 0) {
    return {
      currentStage: stageList[0],
      stageIndex: 0,
      totalStages,
      percentage: Math.round((1 / totalStages) * 100),
    };
  }

  // Derive highest stage from achieved events
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

/**
 * Fetch all matters belonging to client across all 4 departments
 */
export async function fetchClientMatters(clientId: string): Promise<UnifiedMatter[]> {
  try {
    const { data, error } = await coreDb
      .from('project_codes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching client matters:', error.message);
      return [];
    }

    const matters: UnifiedMatter[] = data || [];
    if (matters.length === 0) return [];

    // Fetch associated events in batch
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
    console.error('fetchClientMatters exception:', err);
    return [];
  }
}

/**
 * Fetch chronological milestones/events stream for client
 */
export async function fetchClientEvents(
  clientId: string,
  projectCodeId?: string
): Promise<MatterEvent[]> {
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

    const { data, error } = await query;
    if (error) {
      console.warn('fetchClientEvents error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('fetchClientEvents exception:', err);
    return [];
  }
}

/**
 * Fetch billing stages (work-in-progress / completed milestone billing)
 */
export async function fetchClientBillingStages(matterIds: string[]): Promise<BillingStageItem[]> {
  if (!matterIds.length) return [];
  try {
    const { data, error } = await financeDb
      .from('billing_stages')
      .select('*')
      .in('project_code_id', matterIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchClientBillingStages warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('fetchClientBillingStages exception:', err);
    return [];
  }
}

/**
 * Fetch official recoverable government fees and out-of-pocket costs
 */
export async function fetchClientRecoverableCosts(
  matterIds: string[]
): Promise<RecoverableCostItem[]> {
  if (!matterIds.length) return [];
  try {
    const { data, error } = await coreDb
      .from('recoverable_costs')
      .select('*')
      .in('project_code_id', matterIds)
      .order('cost_date', { ascending: false });

    if (error) {
      console.warn('fetchClientRecoverableCosts warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('fetchClientRecoverableCosts exception:', err);
    return [];
  }
}

/**
 * Fetch client-shared legal documents & filings
 */
export async function fetchClientDocuments(matterIds: string[]): Promise<ClientDocumentItem[]> {
  try {
    let query = coreDb
      .from('documents')
      .select('*')
      .eq('client_shared', true)
      .order('uploaded_at', { ascending: false });

    if (matterIds.length > 0) {
      query = query.or(`project_code_id.in.(${matterIds.join(',')}),project_code_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('fetchClientDocuments warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('fetchClientDocuments exception:', err);
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
