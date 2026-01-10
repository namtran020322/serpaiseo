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
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ranking_checks: {
        Row: {
          country_id: string
          country_name: string
          created_at: string
          device: string
          found_url: string | null
          id: string
          keyword: string
          language_code: string
          language_name: string
          location_id: string | null
          location_name: string | null
          ranking_position: number | null
          serp_results: Json | null
          target_url: string | null
          top_results: number
          user_id: string
        }
        Insert: {
          country_id: string
          country_name: string
          created_at?: string
          device?: string
          found_url?: string | null
          id?: string
          keyword: string
          language_code: string
          language_name: string
          location_id?: string | null
          location_name?: string | null
          ranking_position?: number | null
          serp_results?: Json | null
          target_url?: string | null
          top_results?: number
          user_id: string
        }
        Update: {
          country_id?: string
          country_name?: string
          created_at?: string
          device?: string
          found_url?: string | null
          id?: string
          keyword?: string
          language_code?: string
          language_name?: string
          location_id?: string | null
          location_name?: string | null
          ranking_position?: number | null
          serp_results?: Json | null
          target_url?: string | null
          top_results?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
