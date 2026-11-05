export type DepartmentType =
  | 'ALL'
  | 'IP_PATENT'
  | 'IP_SOFT'
  | 'LITIGATION'
  | 'AGREEMENT';

/** Firm entity that owns and bills a matter. Values come from core.legal_entities.code. */
export type BillingEntityCode = 'LEXTRIA_RESEARCH' | 'PBA' | (string & {});

export interface LegalEntity {
  code: BillingEntityCode;
  display_name: string;
  practice_areas: string; // e.g. "Patents, Trademarks, Copyrights, Designs"
  sort_order: number;
  gstin: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
}

export interface ClientProfile {
  id: string;
  client_code: string;
  client_name: string;
  entity_type: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  billing_address: string | null;
  state_code: string | null;
}

export interface StageProgress {
  currentStage: string;
  stageIndex: number;
  totalStages: number;
  percentage: number;
}

export interface UnifiedMatter {
  id: string;
  code: string;
  prefix?: string | null;
  department: 'IP_PATENT' | 'IP_SOFT' | 'LITIGATION' | 'AGREEMENT' | 'MISC_VENDOR' | 'OTHER';
  billing_entity: BillingEntityCode | null;
  client_id: string;
  title: string;
  status: string;
  owning_app: string;
  created_at: string;
  // Enriched details
  last_event?: MatterEvent | null;
  events_count?: number;
  stage_progress?: StageProgress;
  court?: string | null;
  bench?: string | null;
  case_number?: string | null;
  cnr_number?: string | null;
  client_role?: string | null;
  next_hearing_date?: string | null;
  next_purpose?: string | null;
  current_stage?: string | null;
  // Patent details
  application_number?: string | null;
  patent_number?: string | null;
  specification_type?: string | null;
  patent_status?: string | null;
}

export interface MatterEvent {
  id: string;
  project_code_id: string;
  billing_entity?: BillingEntityCode | null;
  project_code?: string | null;
  matter_title?: string | null;
  event_code: string | null;
  title: string;
  detail: string | null;
  occurred_at: string;
  source_app: string;
  client_visible: boolean;
  client_label: string | null;
  created_at: string;
}

export interface BillingStageItem {
  id: string;
  project_code_id: string;
  billing_entity?: BillingEntityCode | null;
  stage_name: string;
  trigger_event: string;
  amount: number;
  currency: string;
  /** finance.billing_stages.billing_status */
  status: 'PENDING' | 'UNBILLED_WORK_DONE' | 'INVOICED' | 'PAID';
  is_completed: boolean;
  triggered_at?: string | null;
  created_at: string;
}

export interface RecoverableCostItem {
  id: string;
  project_code_id: string;
  billing_entity?: BillingEntityCode | null;
  source_app: string;
  source_type: string;
  category: string;
  description: string;
  amount: number;
  cost_date: string;
  posting_status: string;
}

export interface ClientDocumentItem {
  id: string;
  project_code_id: string;
  billing_entity?: BillingEntityCode | null;
  category: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  zoho_permalink: string | null;
  workdrive_path: string | null;
  client_shared: boolean;
  source_app: string;
  uploaded_at: string;
  project_code?: string | null;
}
