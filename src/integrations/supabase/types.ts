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
          archived: boolean | null
          archived_at: string | null
          archived_reason: string | null
          billed: boolean | null
          billed_at: string | null
          clinic_id: string
          clinical_question: string
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          deletion_reason: string | null
          dicom_metadata: Json | null
          dropbox_path: string | null
          dropbox_report_path: string | null
          dropbox_scan_path: string | null
          field_of_view: Database["public"]["Enums"]["field_of_view"]
          file_path: string | null
          folder_name: string | null
          id: string
          monthly_billed: boolean | null
          monthly_invoice_id: string | null
          patient_dob: string | null
          patient_first_name: string | null
          patient_id: string | null
          patient_internal_id: string | null
          patient_last_name: string | null
          patient_name: string
          payment_received: boolean | null
          payment_received_at: string | null
          pregenerated_zip_path: string | null
          processed_at: string | null
          report_path: string | null
          reporter_notes: string | null
          scan_upload_verified_at: string | null
          scan_uploaded_to_dropbox: boolean | null
          series_count: number | null
          simple_id: number | null
          special_instructions: string | null
          sr_validated: boolean | null
          sr_validation_errors: Json | null
          status: Database["public"]["Enums"]["case_status"]
          stripe_invoice_id: string | null
          sync_warnings: string | null
          synced_at: string | null
          synced_to_dropbox: boolean | null
          updated_at: string | null
          upload_completed: boolean | null
          upload_date: string | null
          urgency: Database["public"]["Enums"]["urgency_level"]
          zip_generation_status: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          archived_reason?: string | null
          billed?: boolean | null
          billed_at?: string | null
          clinic_id: string
          clinical_question: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          dicom_metadata?: Json | null
          dropbox_path?: string | null
          dropbox_report_path?: string | null
          dropbox_scan_path?: string | null
          field_of_view?: Database["public"]["Enums"]["field_of_view"]
          file_path?: string | null
          folder_name?: string | null
          id?: string
          monthly_billed?: boolean | null
          monthly_invoice_id?: string | null
          patient_dob?: string | null
          patient_first_name?: string | null
          patient_id?: string | null
          patient_internal_id?: string | null
          patient_last_name?: string | null
          patient_name: string
          payment_received?: boolean | null
          payment_received_at?: string | null
          pregenerated_zip_path?: string | null
          processed_at?: string | null
          report_path?: string | null
          reporter_notes?: string | null
          scan_upload_verified_at?: string | null
          scan_uploaded_to_dropbox?: boolean | null
          series_count?: number | null
          simple_id?: number | null
          special_instructions?: string | null
          sr_validated?: boolean | null
          sr_validation_errors?: Json | null
          status?: Database["public"]["Enums"]["case_status"]
          stripe_invoice_id?: string | null
          sync_warnings?: string | null
          synced_at?: string | null
          synced_to_dropbox?: boolean | null
          updated_at?: string | null
          upload_completed?: boolean | null
          upload_date?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"]
          zip_generation_status?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          archived_reason?: string | null
          billed?: boolean | null
          billed_at?: string | null
          clinic_id?: string
          clinical_question?: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          dicom_metadata?: Json | null
          dropbox_path?: string | null
          dropbox_report_path?: string | null
          dropbox_scan_path?: string | null
          field_of_view?: Database["public"]["Enums"]["field_of_view"]
          file_path?: string | null
          folder_name?: string | null
          id?: string
          monthly_billed?: boolean | null
          monthly_invoice_id?: string | null
          patient_dob?: string | null
          patient_first_name?: string | null
          patient_id?: string | null
          patient_internal_id?: string | null
          patient_last_name?: string | null
          patient_name?: string
          payment_received?: boolean | null
          payment_received_at?: string | null
          pregenerated_zip_path?: string | null
          processed_at?: string | null
          report_path?: string | null
          reporter_notes?: string | null
          scan_upload_verified_at?: string | null
          scan_uploaded_to_dropbox?: boolean | null
          series_count?: number | null
          simple_id?: number | null
          special_instructions?: string | null
          sr_validated?: boolean | null
          sr_validation_errors?: Json | null
          status?: Database["public"]["Enums"]["case_status"]
          stripe_invoice_id?: string | null
          sync_warnings?: string | null
          synced_at?: string | null
          synced_to_dropbox?: boolean | null
          updated_at?: string | null
          upload_completed?: boolean | null
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
      clinics: {
        Row: {
          address: string | null
          contact_email: string
          created_at: string | null
          id: string
          name: string
          stripe_customer_id: string | null
        }
        Insert: {
          address?: string | null
          contact_email: string
          created_at?: string | null
          id?: string
          name: string
          stripe_customer_id?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string
          created_at?: string | null
          id?: string
          name?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          available_variables: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          subject: string
          template_key: string
          template_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          available_variables?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          subject: string
          template_key: string
          template_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          available_variables?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          subject?: string
          template_key?: string
          template_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          case_id: string
          case_ids: string[] | null
          clinic_id: string
          created_at: string
          currency: string
          due_date: string | null
          exported_at: string | null
          id: string
          invoice_number: string | null
          line_items: Json
          paid_at: string | null
          payment_method: string | null
          pdf_storage_path: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          sent_at: string | null
          status: string
          status_updated_at: string | null
          stripe_invoice_id: string | null
        }
        Insert: {
          amount: number
          case_id: string
          case_ids?: string[] | null
          clinic_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          exported_at?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json
          paid_at?: string | null
          payment_method?: string | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          status?: string
          status_updated_at?: string | null
          stripe_invoice_id?: string | null
        }
        Update: {
          amount?: number
          case_id?: string
          case_ids?: string[] | null
          clinic_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          exported_at?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json
          paid_at?: string | null
          payment_method?: string | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          status?: string
          status_updated_at?: string | null
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
          ip_address: unknown
          successful: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          id?: string
          ip_address?: unknown
          successful?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          id?: string
          ip_address?: unknown
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
      pdf_template_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pdf_templates: {
        Row: {
          color_scheme: Json | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          footer_config: Json | null
          header_config: Json | null
          id: string
          indication_type: string | null
          is_default: boolean | null
          is_published: boolean | null
          layout_config: Json | null
          name: string
          thumbnail_url: string | null
          typography_config: Json | null
          updated_at: string | null
        }
        Insert: {
          color_scheme?: Json | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          footer_config?: Json | null
          header_config?: Json | null
          id?: string
          indication_type?: string | null
          is_default?: boolean | null
          is_published?: boolean | null
          layout_config?: Json | null
          name: string
          thumbnail_url?: string | null
          typography_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          color_scheme?: Json | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          footer_config?: Json | null
          header_config?: Json | null
          id?: string
          indication_type?: string | null
          is_default?: boolean | null
          is_published?: boolean | null
          layout_config?: Json | null
          name?: string
          thumbnail_url?: string | null
          typography_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          clinic_id: string | null
          created_at: string | null
          credentials: string | null
          csrf_token: string | null
          csrf_token_expires_at: string | null
          email: string
          id: string
          mfa_backup_codes: string[] | null
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
          clinic_id?: string | null
          created_at?: string | null
          credentials?: string | null
          csrf_token?: string | null
          csrf_token_expires_at?: string | null
          email: string
          id: string
          mfa_backup_codes?: string[] | null
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
          clinic_id?: string | null
          created_at?: string | null
          credentials?: string | null
          csrf_token?: string | null
          csrf_token_expires_at?: string | null
          email?: string
          id?: string
          mfa_backup_codes?: string[] | null
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
      report_images: {
        Row: {
          caption: string | null
          case_id: string | null
          id: string
          image_url: string
          position: number | null
          report_id: string | null
          section: string | null
          uploaded_at: string | null
        }
        Insert: {
          caption?: string | null
          case_id?: string | null
          id?: string
          image_url: string
          position?: number | null
          report_id?: string | null
          section?: string | null
          uploaded_at?: string | null
        }
        Update: {
          caption?: string | null
          case_id?: string | null
          id?: string
          image_url?: string
          position?: number | null
          report_id?: string | null
          section?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_images_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_images_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "billable_reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "report_images_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
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
      report_snippets: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          shortcut: string | null
          use_count: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          shortcut?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          shortcut?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          category: string
          clinical_history: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          findings: string | null
          id: string
          impression: string | null
          is_default: boolean | null
          name: string
          recommendations: string | null
          technique: string | null
          template_type: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category: string
          clinical_history?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          is_default?: boolean | null
          name: string
          recommendations?: string | null
          technique?: string | null
          template_type: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string
          clinical_history?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          is_default?: boolean | null
          name?: string
          recommendations?: string | null
          technique?: string | null
          template_type?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      report_versions: {
        Row: {
          attached_images: string[] | null
          clinical_history: string | null
          findings: string | null
          id: string
          impression: string | null
          recommendations: string | null
          report_id: string | null
          saved_at: string | null
          saved_by: string | null
          technique: string | null
          version_number: number
        }
        Insert: {
          attached_images?: string[] | null
          clinical_history?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          recommendations?: string | null
          report_id?: string | null
          saved_at?: string | null
          saved_by?: string | null
          technique?: string | null
          version_number: number
        }
        Update: {
          attached_images?: string[] | null
          clinical_history?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          recommendations?: string | null
          report_id?: string | null
          saved_at?: string | null
          saved_by?: string | null
          technique?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "billable_reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          attached_images: string[] | null
          author_id: string | null
          billed: boolean | null
          billed_date: string | null
          can_reopen: boolean | null
          case_id: string
          clinical_history: string | null
          completed_at: string | null
          created_at: string | null
          dropbox_path: string | null
          finalized_at: string | null
          findings: string | null
          id: string
          impression: string | null
          is_latest: boolean | null
          is_signed: boolean | null
          is_superseded: boolean | null
          last_saved_at: string | null
          pdf_generated: boolean | null
          pdf_storage_path: string | null
          pdf_url: string | null
          previous_version_id: string | null
          recommendations: string | null
          report_content: Json | null
          report_text: string | null
          signatory_credentials: string | null
          signatory_name: string | null
          signatory_title: string | null
          signature_hash: string | null
          signature_statement: string | null
          signed_at: string | null
          signed_by: string | null
          signed_off_at: string | null
          signed_off_by: string | null
          superseded_by: string | null
          supersedes: string | null
          technique: string | null
          template_id: string | null
          template_used: string | null
          version: number | null
        }
        Insert: {
          attached_images?: string[] | null
          author_id?: string | null
          billed?: boolean | null
          billed_date?: string | null
          can_reopen?: boolean | null
          case_id: string
          clinical_history?: string | null
          completed_at?: string | null
          created_at?: string | null
          dropbox_path?: string | null
          finalized_at?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          is_latest?: boolean | null
          is_signed?: boolean | null
          is_superseded?: boolean | null
          last_saved_at?: string | null
          pdf_generated?: boolean | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          previous_version_id?: string | null
          recommendations?: string | null
          report_content?: Json | null
          report_text?: string | null
          signatory_credentials?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          signature_hash?: string | null
          signature_statement?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          superseded_by?: string | null
          supersedes?: string | null
          technique?: string | null
          template_id?: string | null
          template_used?: string | null
          version?: number | null
        }
        Update: {
          attached_images?: string[] | null
          author_id?: string | null
          billed?: boolean | null
          billed_date?: string | null
          can_reopen?: boolean | null
          case_id?: string
          clinical_history?: string | null
          completed_at?: string | null
          created_at?: string | null
          dropbox_path?: string | null
          finalized_at?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          is_latest?: boolean | null
          is_signed?: boolean | null
          is_superseded?: boolean | null
          last_saved_at?: string | null
          pdf_generated?: boolean | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          previous_version_id?: string | null
          recommendations?: string | null
          report_content?: Json | null
          report_text?: string | null
          signatory_credentials?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          signature_hash?: string | null
          signature_statement?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          superseded_by?: string | null
          supersedes?: string | null
          technique?: string | null
          template_id?: string | null
          template_used?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "billable_reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "reports_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "billable_reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "reports_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "billable_reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "reports_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
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
      signature_audit: {
        Row: {
          case_id: string | null
          id: string
          ip_address: string | null
          is_superseded: boolean | null
          report_id: string | null
          report_version: number | null
          signature_hash: string
          signed_at: string | null
          signer_credentials: string | null
          signer_id: string | null
          signer_name: string
          superseded_by: string | null
          user_agent: string | null
          verification_token: string | null
        }
        Insert: {
          case_id?: string | null
          id?: string
          ip_address?: string | null
          is_superseded?: boolean | null
          report_id?: string | null
          report_version?: number | null
          signature_hash: string
          signed_at?: string | null
          signer_credentials?: string | null
          signer_id?: string | null
          signer_name: string
          superseded_by?: string | null
          user_agent?: string | null
          verification_token?: string | null
        }
        Update: {
          case_id?: string | null
          id?: string
          ip_address?: string | null
          is_superseded?: boolean | null
          report_id?: string | null
          report_version?: number | null
          signature_hash?: string
          signed_at?: string | null
          signer_credentials?: string | null
          signer_id?: string | null
          signer_name?: string
          superseded_by?: string | null
          user_agent?: string | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_audit_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "billable_reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "signature_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_audit_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "signature_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage_log: {
        Row: {
          case_id: string | null
          generated_by: string | null
          id: string
          template_id: string | null
          used_at: string | null
        }
        Insert: {
          case_id?: string | null
          generated_by?: string | null
          id?: string
          template_id?: string | null
          used_at?: string | null
        }
        Update: {
          case_id?: string | null
          generated_by?: string | null
          id?: string
          template_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_log_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["id"]
          },
        ]
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
      acquire_case_lock: {
        Args: { p_patient_first_name: string; p_patient_last_name: string }
        Returns: boolean
      }
      auto_pseudonymize_old_cases: { Args: never; Returns: number }
      calculate_case_price: {
        Args: {
          p_addons?: string[]
          p_field_of_view: Database["public"]["Enums"]["field_of_view"]
          p_urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Returns: number
      }
      check_system_health: {
        Args: never
        Returns: {
          count: number
          details: string
          issue_type: string
          severity: string
        }[]
      }
      check_upload_rate_limit: {
        Args: { p_clinic_id: string }
        Returns: boolean
      }
      create_report_share: { Args: { p_report_id: string }; Returns: string }
      create_report_version: {
        Args: { p_new_version_number: number; p_original_report_id: string }
        Returns: string
      }
      detect_indication_from_clinical_question: {
        Args: { clinical_question: string }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_current_user_clinic: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_health_metrics: { Args: never; Returns: Json }
      get_monthly_income_stats: {
        Args: never
        Returns: {
          income_so_far: number
          projected_income: number
          reported_cases: number
          total_cases: number
        }[]
      }
      get_report_version_chain: {
        Args: { p_report_id: string }
        Returns: {
          id: string
          is_current: boolean
          is_superseded: boolean
          signed_at: string
          signed_by: string
          version: number
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
        Args: never
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
      release_case_lock: {
        Args: { p_patient_first_name: string; p_patient_last_name: string }
        Returns: boolean
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
      test_rls_policies: {
        Args: never
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      update_overdue_invoices: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "clinic" | "reporter"
      case_status:
        | "uploaded"
        | "in_progress"
        | "report_ready"
        | "awaiting_payment"
      field_of_view: "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8"
      invoice_status: "draft" | "sent" | "paid" | "overdue"
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
      invoice_status: ["draft", "sent", "paid", "overdue"],
      urgency_level: ["standard", "urgent"],
      user_role: ["clinic", "admin", "reporter"],
    },
  },
} as const
