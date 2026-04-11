// ──────────────────────────────────────────────────────────────
// Lead Management – TypeScript Types
// ──────────────────────────────────────────────────────────────

export interface LeadSource {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

export interface LeadStatus {
  id: number;
  name: string;
  code: string;
  color_code: string | null;
  sequence_order: number;
  is_terminal: boolean;
}

export interface Parent {
  id: number;
  parent_name: string;
  mobile_number: string;
  alternate_mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  relationship?: string | null;
  society?: string | null;
}

export interface LeadFollowup {
  id: number;
  lead_id: number;
  followup_date: string;
  followup_type: string;
  followup_notes?: string | null;
  followup_status: string; // Pending | Completed | Cancelled
  completed_at?: string | null;
  completion_notes?: string | null;
  next_followup_date?: string | null;
  created_at?: string | null;
}

export interface Lead {
  id: number;
  lead_code: string;
  child_name: string;
  child_gender?: string | null;
  child_dob?: string | null;
  parent_name?: string | null;
  mobile_number?: string | null;
  source_name?: string | null;
  status_name?: string | null;
  status_color?: string | null;
  next_followup_date?: string | null;
  assigned_to?: number | null;
  created_at?: string | null;
  converted: boolean;
}

export interface LeadDetail extends Lead {
  tenant_id: number;
  parent?: Parent | null;
  lead_source_id: number;
  lead_status_id: number;
  preferred_class_id?: number | null;
  preferred_academic_year_id?: number | null;
  expected_admission_date?: string | null;
  notes?: string | null;
  remarks?: string | null;
  converted_to_student_id?: number | null;
  converted_at?: string | null;
  followups: LeadFollowup[];
  updated_at?: string | null;
}

export interface LeadCreate {
  // Parent
  parent_name: string;
  mobile_number: string;
  alternate_mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  relationship?: string;
  society?: string | null;
  // Child
  child_name: string;
  child_dob?: string;
  child_gender?: string;
  // Lead meta
  lead_source_id: number;
  lead_status_id: number;
  preferred_class_id?: number | null;
  preferred_academic_year_id?: number | null;
  expected_admission_date?: string;
  notes?: string;
  remarks?: string;
  assigned_to?: number | null;
}

export type LeadUpdate = Partial<LeadCreate>;

export interface LeadFollowupCreate {
  lead_id: number;
  followup_date: string;
  followup_type: string;
  followup_notes?: string;
  next_followup_date?: string;
}

export interface LeadListResponse {
  data: Lead[];
  total: number;
}
