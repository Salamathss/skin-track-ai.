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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmetic_shelf: {
        Row: {
          active_ingredients: string[] | null
          brand: string | null
          category: string
          created_at: string
          id: string
          image_url: string | null
          ingredients_list: string | null
          is_active: boolean
          opened_at: string | null
          product_name: string
          shelf_life_months: number | null
          user_id: string
        }
        Insert: {
          active_ingredients?: string[] | null
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          ingredients_list?: string | null
          is_active?: boolean
          opened_at?: string | null
          product_name: string
          shelf_life_months?: number | null
          user_id: string
        }
        Update: {
          active_ingredients?: string[] | null
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          ingredients_list?: string | null
          is_active?: boolean
          opened_at?: string | null
          product_name?: string
          shelf_life_months?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          days: string[]
          enabled: boolean
          icon: string
          id: string
          label: string
          time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: string[]
          enabled?: boolean
          icon?: string
          id?: string
          label: string
          time: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: string[]
          enabled?: boolean
          icon?: string
          id?: string
          label?: string
          time?: string
          user_id?: string
        }
        Relationships: []
      }
      skin_reminders: {
        Row: {
          category: string
          created_at: string
          id: string
          is_completed: boolean
          is_manual: boolean
          profile_id: string | null
          scan_id: string | null
          task_name: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          is_manual?: boolean
          profile_id?: string | null
          scan_id?: string | null
          task_name: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          is_manual?: boolean
          profile_id?: string | null
          scan_id?: string | null
          task_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skin_reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_reminders_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "skin_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_scans: {
        Row: {
          acne_type: string | null
          created_at: string
          detailed_findings: string[] | null
          hydration: number | null
          id: string
          inflammation: string | null
          oiliness: number | null
          photo_url: string
          primary_concern: string | null
          profile_id: string | null
          recommendation: string | null
          routine_adjustments: string[] | null
          score: number | null
          sensitivity: number | null
          skin_type: string | null
          user_id: string
          zones: string[] | null
        }
        Insert: {
          acne_type?: string | null
          created_at?: string
          detailed_findings?: string[] | null
          hydration?: number | null
          id?: string
          inflammation?: string | null
          oiliness?: number | null
          photo_url: string
          primary_concern?: string | null
          profile_id?: string | null
          recommendation?: string | null
          routine_adjustments?: string[] | null
          score?: number | null
          sensitivity?: number | null
          skin_type?: string | null
          user_id: string
          zones?: string[] | null
        }
        Update: {
          acne_type?: string | null
          created_at?: string
          detailed_findings?: string[] | null
          hydration?: number | null
          id?: string
          inflammation?: string | null
          oiliness?: number | null
          photo_url?: string
          primary_concern?: string | null
          profile_id?: string | null
          recommendation?: string | null
          routine_adjustments?: string[] | null
          score?: number | null
          sensitivity?: number | null
          skin_type?: string | null
          user_id?: string
          zones?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "skin_scans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_profiles: {
        Row: {
          avatar_url: string | null
          city_lat: number | null
          city_lon: number | null
          city_name: string | null
          created_at: string
          gender: string | null
          id: string
          profile_name: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city_lat?: number | null
          city_lon?: number | null
          city_name?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          profile_name: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city_lat?: number | null
          city_lon?: number | null
          city_name?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          profile_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_facts: {
        Row: {
          created_at: string
          fact_key: string
          fact_value: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fact_key: string
          fact_value: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fact_key?: string
          fact_value?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weather_logs: {
        Row: {
          advice: Json | null
          aqi: number | null
          city: string | null
          created_at: string
          humidity: number | null
          id: string
          profile_id: string | null
          temperature: number | null
          user_id: string
          uv_index: number | null
        }
        Insert: {
          advice?: Json | null
          aqi?: number | null
          city?: string | null
          created_at?: string
          humidity?: number | null
          id?: string
          profile_id?: string | null
          temperature?: number | null
          user_id: string
          uv_index?: number | null
        }
        Update: {
          advice?: Json | null
          aqi?: number | null
          city?: string | null
          created_at?: string
          humidity?: number | null
          id?: string
          profile_id?: string | null
          temperature?: number | null
          user_id?: string
          uv_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_profiles"
            referencedColumns: ["id"]
          },
        ]
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
