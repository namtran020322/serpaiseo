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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_actions_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          starts_at: string | null
          target_type: string
          target_user_ids: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          starts_at?: string | null
          target_type?: string
          target_user_ids?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          starts_at?: string | null
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_orders: {
        Row: {
          amount: number
          created_at: string
          credits: number
          id: string
          order_invoice_number: string
          package_id: string
          paid_at: string | null
          sepay_order_id: string | null
          sepay_transaction_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits: number
          id?: string
          order_invoice_number: string
          package_id: string
          paid_at?: string | null
          sepay_order_id?: string | null
          sepay_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          id?: string
          order_invoice_number?: string
          package_id?: string
          paid_at?: string | null
          sepay_order_id?: string | null
          sepay_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      keyword_ranking_history: {
        Row: {
          checked_at: string
          competitor_rankings: Json | null
          found_url: string | null
          id: string
          keyword_id: string
          ranking_position: number | null
          user_id: string
        }
        Insert: {
          checked_at?: string
          competitor_rankings?: Json | null
          found_url?: string | null
          id?: string
          keyword_id: string
          ranking_position?: number | null
          user_id: string
        }
        Update: {
          checked_at?: string
          competitor_rankings?: Json | null
          found_url?: string | null
          id?: string
          keyword_id?: string
          ranking_position?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_ranking_history_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "project_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_classes: {
        Row: {
          competitor_domains: Json | null
          country_id: string
          country_name: string
          created_at: string
          device: string
          domain: string
          id: string
          language_code: string
          language_name: string
          last_checked_at: string | null
          location_id: string | null
          location_name: string | null
          name: string
          project_id: string
          schedule: string | null
          schedule_time: string | null
          schedule_timezone: string | null
          top_results: number
          updated_at: string
          user_id: string
        }
        Insert: {
          competitor_domains?: Json | null
          country_id: string
          country_name: string
          created_at?: string
          device?: string
          domain: string
          id?: string
          language_code: string
          language_name: string
          last_checked_at?: string | null
          location_id?: string | null
          location_name?: string | null
          name: string
          project_id: string
          schedule?: string | null
          schedule_time?: string | null
          schedule_timezone?: string | null
          top_results?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          competitor_domains?: Json | null
          country_id?: string
          country_name?: string
          created_at?: string
          device?: string
          domain?: string
          id?: string
          language_code?: string
          language_name?: string
          last_checked_at?: string | null
          location_id?: string | null
          location_name?: string | null
          name?: string
          project_id?: string
          schedule?: string | null
          schedule_time?: string | null
          schedule_timezone?: string | null
          top_results?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_classes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_keywords: {
        Row: {
          best_position: number | null
          class_id: string
          competitor_rankings: Json | null
          created_at: string
          first_position: number | null
          found_url: string | null
          id: string
          keyword: string
          last_checked_at: string | null
          previous_position: number | null
          ranking_position: number | null
          serp_results: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_position?: number | null
          class_id: string
          competitor_rankings?: Json | null
          created_at?: string
          first_position?: number | null
          found_url?: string | null
          id?: string
          keyword: string
          last_checked_at?: string | null
          previous_position?: number | null
          ranking_position?: number | null
          serp_results?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_position?: number | null
          class_id?: string
          competitor_rankings?: Json | null
          created_at?: string
          first_position?: number | null
          found_url?: string | null
          id?: string
          keyword?: string
          last_checked_at?: string | null
          previous_position?: number | null
          ranking_position?: number | null
          serp_results?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_keywords_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "project_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          domain: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ranking_check_queue: {
        Row: {
          class_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          keyword_ids: string[] | null
          processed_keywords: number | null
          started_at: string | null
          status: string | null
          total_keywords: number | null
          user_id: string
        }
        Insert: {
          class_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword_ids?: string[] | null
          processed_keywords?: number | null
          started_at?: string | null
          status?: string | null
          total_keywords?: number | null
          user_id: string
        }
        Update: {
          class_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword_ids?: string[] | null
          processed_keywords?: number | null
          started_at?: string | null
          status?: string | null
          total_keywords?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_check_queue_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "project_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_purchased: number
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_ranking_history: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_pending_orders: { Args: never; Returns: number }
      get_class_ranking_stats: { Args: { p_class_id: string }; Returns: Json }
      get_projects_paginated: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_payment_webhook: {
        Args: {
          p_order_invoice_number: string
          p_sepay_order_id: string
          p_sepay_transaction_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
