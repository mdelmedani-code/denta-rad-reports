export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      auth_secrets: {
        Row: {
          created_at: string | null
          mfa_backup_codes: Json | null
          mfa_secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          mfa_backup_codes?: Json | null
          mfa_secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          mfa_backup_codes?: Json | null
          mfa_secret?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      case_annotations: {
        Row: {
          annotation_data: Json
          annotation_type: string
          case_id: string
          created_at: string
          created_by: string
          id: string
          image_index: number | null
          updated_at: string
        }
        Insert: {
          annotation_data: Json
          annotation_type?: string
          case_id: string
          created_at?: string
          created_by: string
          id?: string
          image_index?: number | null
          updated_at?: string
        }
        Update: {
          annotation_data?: Json
          annotation_type?: string
          case_id?: string
          created_at?: string
          created_by?: string
          id?: string
          image_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_annotations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          clinic_id: string
          clinical_question: string
          created_at: string | null
          dicom_metadata: Json | null
          dropbox_path: string | null
          field_of_view: Database["public"]["Enums"]["field_of_view"]
          file_path: string | null
          id: string
          monthly_billed: boolean | null
          monthly_invoice_id: string | null
          patient_dob: string | null
          patient_id: string | null
          patient_internal_id: string | null
          patient_name: string
          pregenerated_zip_path: string | null
          processed_at: string | null
          report_path: string | null
          series_count: number | null
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string | null
          upload_date: string | null
          urgency: Database["public"]["Enums"]["urgency_level"]
          zip_generation_status: string | null
        }
        Insert: {
          clinic_id: string
          clinical_question: string
          created_at?: string | null
          dicom_metadata?: Json | null
          dropbox_path?: string | null
          field_of_view?: Database["public"]["Enums"]["field_of_view"]
          file_path?: string | null
          id?: string
          monthly_billed?: boolean | null
          monthly_invoice_id?: string | null
          patient_dob?: string | null
          patient_id?: string | null
          patient_internal_id?: string | null
          patient_name: string
          pregenerated_zip_path?: string | null
          processed_at?: string | null
          report_path?: string | null
          series_count?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string | null
          upload_date?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"]
          zip_generation_status?: string | null
        }
        Update: {
          clinic_id?: string
          clinical_question?: string
          created_at?: string | null
          dicom_metadata?: Json | null
          dropbox_path?: string | null
          field_of_view?: Database["public"]["Enums"]["field_of_view"]
          file_path?: string | null
          id?: string
          monthly_billed?: boolean | null
          monthly_invoice_id?: string | null
          patient_dob?: string | null
          patient_id?: string | null
          patient_internal_id?: string | null
          patient_name?: string
          pregenerated_zip_path?: string | null
          processed_at?: string | null
          report_path?: string | null
          series_count?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string | null
          upload_date?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"]
          zip_generation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      cbct_report_templates: {
        Row: {
          clinical_history_template: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          findings_template: string
          id: string
          imaging_technique_template: string | null
          impression_template: string
          indication_category: string
          is_default: boolean | null
          name: string
          recommendations_template: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          clinical_history_template?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings_template: string
          id?: string
          imaging_technique_template?: string | null
          impression_template: string
          indication_category: string
          is_default?: boolean | null
          name: string
          recommendations_template?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          clinical_history_template?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings_template?: string
          id?: string
          imaging_technique_template?: string | null
          impression_template?: string
          indication_category?: string
          is_default?: boolean | null
          name?: string
          recommendations_template?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      clinic_branding: {
        Row: {
          accent_color: string
          clinic_id: string
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          clinic_id: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          clinic_id?: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_branding_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_branding_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          contact_email: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          contact_email: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          contact_email?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          case_id: string
          clinic_id: string
          created_at: string
          currency: string
          exported_at: string | null
          id: string
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
        }
        Insert: {
          amount: number
          case_id: string
          clinic_id: string
          created_at?: string
          currency?: string
          exported_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
        }
        Update: {
          amount?: number
          case_id?: string
          clinic_id?: string
          created_at?: string
          currency?: string
          exported_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_time: string | null
          email: string
          id: string
          ip_address: unknown | null
          successful: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          id?: string
          ip_address?: unknown | null
          successful?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          id?: string
          ip_address?: unknown | null
          successful?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          email_sent: boolean | null
          id: string
          message: string
          recipient_id: string
          sent_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          email_sent?: boolean | null
          id?: string
          message: string
          recipient_id: string
          sent_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          email_sent?: boolean | null
          id?: string
          message?: string
          recipient_id?: string
          sent_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      pdf_generation_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          report_id: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          report_id?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          report_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_generation_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "billable_reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "pdf_generation_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_templates: {
        Row: {
          company_address: string | null
          company_name: string | null
          created_at: string
          description: string | null
          font_family: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          indication_type: string | null
          is_active: boolean | null
          is_default: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          template_data: Json
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          font_family?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          indication_type?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          template_data: Json
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          font_family?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          indication_type?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          created_at: string | null
          currency: string | null
          effective_from: string | null
          effective_to: string | null
          field_of_view: string
          id: string
          price: number
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          effective_from?: string | null
          effective_to?: string | null
          field_of_view: string
          id?: string
          price: number
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          effective_from?: string | null
          effective_to?: string | null
          field_of_view?: string
          id?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          backup_codes: Json | null
          clinic_id: string | null
          created_at: string | null
          credentials: string | null
          csrf_token: string | null
          csrf_token_expires_at: string | null
          email: string
          id: string
          mfa_backup_codes: string[] | null
          mfa_enabled: boolean | null
          mfa_enforced_at: string | null
          mfa_secret: string | null
          notification_preferences: Json | null
          professional_title: string | null
          role: Database["public"]["Enums"]["user_role"]
          signature_statement: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
        }
        Insert: {
          backup_codes?: Json | null
          clinic_id?: string | null
          created_at?: string | null
          credentials?: string | null
          csrf_token?: string | null
          csrf_token_expires_at?: string | null
          email: string
          id: string
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_enforced_at?: string | null
          mfa_secret?: string | null
          notification_preferences?: Json | null
          professional_title?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signature_statement?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_codes?: Json | null
          clinic_id?: string | null
          created_at?: string | null
          credentials?: string | null
          csrf_token?: string | null
          csrf_token_expires_at?: string | null
          email?: string
          id?: string
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_enforced_at?: string | null
          mfa_secret?: string | null
          notification_preferences?: Json | null
          professional_title?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signature_statement?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      report_shares: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          report_id: string
          share_token: string
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          report_id: string
          share_token: string
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          report_id?: string
          share_token?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          author_id: string | null
          billed: boolean | null
          billed_date: string | null
          case_id: string
          created_at: string | null
          finalized_at: string | null
          id: string
          pdf_url: string | null
          report_text: string | null
          signatory_credentials: string | null
          signatory_name: string | null
          signatory_title: string | null
          signature_statement: string | null
          signed_off_at: string | null
          signed_off_by: string | null
        }
        Insert: {
          author_id?: string | null
          billed?: boolean | null
          billed_date?: string | null
          case_id: string
          created_at?: string | null
          finalized_at?: string | null
          id?: string
          pdf_url?: string | null
          report_text?: string | null
          signatory_credentials?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          signature_statement?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
        }
        Update: {
          author_id?: string | null
          billed?: boolean | null
          billed_date?: string | null
          case_id?: string
          created_at?: string | null
          finalized_at?: string | null
          id?: string
          pdf_url?: string | null
          report_text?: string | null
          signatory_credentials?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          signature_statement?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          event_category: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          session_id: string | null
          severity: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          event_category?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          session_id?: string | null
          severity?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          event_category?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          session_id?: string | null
          severity?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      template_indications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          indication_name: string
          keywords: string[] | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          indication_name: string
          keywords?: string[] | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          indication_name?: string
          keywords?: string[] | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_indications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_rate_limits: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string | null
          id: string
          upload_timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          upload_timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          upload_timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      billable_reports: {
        Row: {
          amount: number | null
          case_date: string | null
          case_id: string | null
          clinic_email: string | null
          clinic_id: string | null
          clinic_name: string | null
          field_of_view: string | null
          has_invoice: boolean | null
          patient_name: string | null
          report_date: string | null
          report_id: string | null
          stripe_invoice_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_case_price: {
        Args: {
          p_addons?: string[]
          p_field_of_view: Database["public"]["Enums"]["field_of_view"]
          p_urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Returns: number
      }
      check_upload_rate_limit: {
        Args: { _user_id: string }
        Returns: boolean
      }
      create_report_share: {
        Args: { p_report_id: string }
        Returns: string
      }
      detect_indication_from_clinical_question: {
        Args: { clinical_question: string }
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_backup_codes: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_current_user_clinic: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_monthly_income_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          income_so_far: number
          projected_income: number
          reported_cases: number
          total_cases: number
        }[]
      }
      get_template_for_indication: {
        Args: { p_indication_name: string }
        Returns: string
      }
      get_unbilled_reports: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          cases: Json
          clinic_email: string
          clinic_name: string
          report_count: number
          total_amount: number
        }[]
      }
      get_weekly_income_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          income_so_far: number
          projected_income: number
          reported_cases: number
          total_cases: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_template_usage: {
        Args: { template_id: string }
        Returns: undefined
      }
      is_account_locked: {
        Args: { p_email: string }
        Returns: {
          attempts: number
          locked: boolean
          unlock_at: string
        }[]
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_event_category?: string
          p_ip_address?: string
          p_new_values?: Json
          p_old_values?: Json
          p_session_id?: string
          p_severity?: string
          p_table_name: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_audit_event_secure: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      record_login_attempt: {
        Args: {
          p_email: string
          p_ip_address?: string
          p_successful: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      sign_off_report: {
        Args: {
          p_report_id: string
          p_signatory_credentials: string
          p_signatory_name: string
          p_signatory_title: string
          p_signature_statement?: string
        }
        Returns: boolean
      }
      store_mfa_secret: {
        Args: { p_backup_codes: Json; p_mfa_secret: string; p_user_id: string }
        Returns: boolean
      }
      test_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      verify_mfa_token: {
        Args: { p_token: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "clinic" | "reporter"
      case_status:
        | "uploaded"
        | "in_progress"
        | "report_ready"
        | "awaiting_payment"
      field_of_view: "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8"
      urgency_level: "standard" | "urgent"
      user_role: "clinic" | "admin" | "reporter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "clinic", "reporter"],
      case_status: [
        "uploaded",
        "in_progress",
        "report_ready",
        "awaiting_payment",
      ],
      field_of_view: ["up_to_5x5", "up_to_8x5", "up_to_8x8", "over_8x8"],
      urgency_level: ["standard", "urgent"],
      user_role: ["clinic", "admin", "reporter"],
    },
  },
} as const
