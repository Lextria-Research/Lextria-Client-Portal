export type DepartmentType =
  | 'ALL'
  | 'IP_PATENT'
  | 'IP_SOFT'
  | 'LITIGATION'
  | 'AGREEMENT';

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
  workdrive_folder_id?: string | null;
}

export interface UnifiedMatter {
  id: string;
  code: string;
  code_normalized?: string;
  prefix?: string | null;
  department: 'IP_PATENT' | 'IP_SOFT' | 'LITIGATION' | 'AGREEMENT' | 'MISC_VENDOR' | 'OTHER';
  client_id: string;
  title: string;
  status: string;
  spoc_user_id?: string | null;
  lead_assignee_id?: string | null;
  workdrive_folder_id?: string | null;
  owning_app: string;
  created_at: string;
  // Enriched details
  last_event?: MatterEvent | null;
  events_count?: number;
  stage_progress?: {
    currentStage: string;
    stageIndex: number;
    totalStages: number;
    percentage: number;
  };
  court?: string | null;
  bench?: string | null;
  case_number?: string | null;
  cnr_number?: string | null;
  client_role?: string | null;
  next_hearing_date?: string | null;
  next_purpose?: string | null;
  current_stage?: string | null;
}

export interface MatterEvent {
  id: string;
  project_code_id: string;
  event_code: string;
  title: string;
  detail: string | null;
  occurred_at: string;
  source_app: string;
  client_visible: boolean;
  client_label: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface BillingStageItem {
  id: string;
  project_code_id: string;
  stage_name: string;
  trigger_event: string;
  amount: number;
  currency: string;
  status: 'NOT_TRIGGERED' | 'TRIGGERED' | 'INVOICED' | 'COLLECTED';
  triggered_at?: string | null;
  created_at: string;
}

export interface RecoverableCostItem {
  id: string;
  project_code_id: string;
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
  project_code_id: string | null;
  category: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  zoho_permalink: string | null;
  workdrive_path: string | null;
  client_shared: boolean;
  source_app: string;
  uploaded_at: string;
  project_code?: string;
}

