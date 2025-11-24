import { CaseStatus, UrgencyLevel, FieldOfView } from '@/lib/constants';

/**
 * Unified Case type used across all dashboards
 */
export interface Case {
  id: string;
  patient_name: string;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  patient_dob?: string | null;
  patient_id?: string | null;
  patient_internal_id?: string | null;
  simple_id?: number | null;
  upload_date: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  clinical_question: string;
  status: CaseStatus;
  urgency: UrgencyLevel;
  field_of_view: FieldOfView;
  folder_name?: string | null;
  clinic_id: string;
  clinics?: {
    name: string;
    contact_email?: string;
  };
  reporter_notes?: string | null;
  special_instructions?: string | null;
  estimated_cost?: number;
}
