export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
            referencedRelation: "case_studies"
            referencedColumns: ["case_id"]
          },
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
          field_of_view: Database["public"]["Enums"]["field_of_view"]
          file_path: string | null
          id: string
          monthly_billed: boolean | null
          monthly_invoice_id: string | null
          orthanc_instance_ids: string[] | null
          orthanc_series_id: string | null
          orthanc_study_id: string | null
          patient_dob: string | null
          patient_internal_id: string | null
          patient_name: string
          report_path: string | null
          status: Database["public"]["Enums"]["case_status"]
          study_instance_uid: string | null
          updated_at: string | null
          upload_date: string | null
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          clinic_id: string
          clinical_question: string
          created_at?: string | null
          field_of_view?: Database["public"]["Enums"]["field_of_view"]
          file_path?: string | null
          id?: string
          monthly_billed?: boolean | null
          monthly_invoice_id?: string | null
          orthanc_instance_ids?: string[] | null
          orthanc_series_id?: string | null
          orthanc_study_id?: string | null
          patient_dob?: string | null
          patient_internal_id?: string | null
          patient_name: string
          report_path?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          study_instance_uid?: string | null
          updated_at?: string | null
          upload_date?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          clinic_id?: string
          clinical_question?: string
          created_at?: string | null
          field_of_view?: Database["public"]["Enums"]["field_of_view"]
          file_path?: string | null
          id?: string
          monthly_billed?: boolean | null
          monthly_invoice_id?: string | null
          orthanc_instance_ids?: string[] | null
          orthanc_series_id?: string | null
          orthanc_study_id?: string | null
          patient_dob?: string | null
          patient_internal_id?: string | null
          patient_name?: string
          report_path?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          study_instance_uid?: string | null
          updated_at?: string | null
          upload_date?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"]
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
            foreignKeyName: "cases_monthly_invoice_id_fkey"
            columns: ["monthly_invoice_id"]
            isOneToOne: false
            referencedRelation: "monthly_invoices"
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
          due_date: string
          id: string
          invoice_number: string
          line_items: Json
          paid_at: string | null
          status: string
        }
        Insert: {
          amount: number
          case_id: string
          clinic_id: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number: string
          line_items?: Json
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          case_id?: string
          clinic_id?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string
          line_items?: Json
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_invoices: {
        Row: {
          case_count: number
          clinic_id: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          month: number
          status: string
          total_amount: number
          year: number
        }
        Insert: {
          case_count?: number
          clinic_id: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number: string
          month: number
          status?: string
          total_amount?: number
          year: number
        }
        Update: {
          case_count?: number
          clinic_id?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          month?: number
          status?: string
          total_amount?: number
          year?: number
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
      profiles: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          email: string
          id: string
          notification_preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          email: string
          id: string
          notification_preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          notification_preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
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
          id: string
          pdf_url: string | null
          report_text: string | null
        }
        Insert: {
          author_id?: string | null
          billed?: boolean | null
          billed_date?: string | null
          case_id: string
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          report_text?: string | null
        }
        Update: {
          author_id?: string | null
          billed?: boolean | null
          billed_date?: string | null
          case_id?: string
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          report_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["case_id"]
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
    Views: {
      case_studies: {
        Row: {
          case_id: string | null
          clinic_id: string | null
          created_at: string | null
          patient_name: string | null
          study_instance_uid: string | null
        }
        Insert: {
          case_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          patient_name?: string | null
          study_instance_uid?: string | null
        }
        Update: {
          case_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          patient_name?: string | null
          study_instance_uid?: string | null
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
    }
    Functions: {
      calculate_case_price: {
        Args: {
          p_field_of_view: Database["public"]["Enums"]["field_of_view"]
          p_urgency: Database["public"]["Enums"]["urgency_level"]
          p_addons?: string[]
        }
        Returns: number
      }
      create_report_share: {
        Args: { p_report_id: string }
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_monthly_invoice_number: {
        Args: { p_clinic_id: string; p_month: number; p_year: number }
        Returns: string
      }
      generate_monthly_invoices: {
        Args: Record<PropertyKey, never>
        Returns: {
          clinic_id: string
          invoice_id: string
          total_amount: number
          case_count: number
        }[]
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
          projected_income: number
          income_so_far: number
          total_cases: number
          reported_cases: number
        }[]
      }
      get_weekly_income_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          projected_income: number
          income_so_far: number
          total_cases: number
          reported_cases: number
        }[]
      }
    }
    Enums: {
      case_status:
        | "uploaded"
        | "in_progress"
        | "report_ready"
        | "awaiting_payment"
      field_of_view: "up_to_5x5" | "up_to_8x5" | "up_to_8x8" | "over_8x8"
      urgency_level: "standard" | "urgent"
      user_role: "clinic" | "admin"
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
      case_status: [
        "uploaded",
        "in_progress",
        "report_ready",
        "awaiting_payment",
      ],
      field_of_view: ["up_to_5x5", "up_to_8x5", "up_to_8x8", "over_8x8"],
      urgency_level: ["standard", "urgent"],
      user_role: ["clinic", "admin"],
    },
  },
} as const
