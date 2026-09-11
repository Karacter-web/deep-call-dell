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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      call_sessions: {
        Row: {
          call_sid: string
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          from_number: string | null
          id: string
          phone_number_id: string | null
          provider_error: string | null
          source_lang: string
          started_at: string
          status: string
          target_lang: string
          to_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          call_sid: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          phone_number_id?: string | null
          provider_error?: string | null
          source_lang?: string
          started_at?: string
          status?: string
          target_lang?: string
          to_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          call_sid?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          phone_number_id?: string | null
          provider_error?: string | null
          source_lang?: string
          started_at?: string
          status?: string
          target_lang?: string
          to_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      call_transcripts: {
        Row: {
          created_at: string
          id: string
          is_final: boolean
          sequence: number
          session_id: string
          speaker: string
          text: string
          translated_text: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_final?: boolean
          sequence?: number
          session_id: string
          speaker?: string
          text: string
          translated_text?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_final?: boolean
          sequence?: number
          session_id?: string
          speaker?: string
          text?: string
          translated_text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          capabilities: Json
          country: string
          created_at: string
          friendly_name: string | null
          id: string
          monthly_price: number | null
          phone_number: string
          status: string
          twilio_sid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities?: Json
          country?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          monthly_price?: number | null
          phone_number: string
          status?: string
          twilio_sid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities?: Json
          country?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          monthly_price?: number | null
          phone_number?: string
          status?: string
          twilio_sid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          organization: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          organization?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          organization?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string
          created_at: string
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          from_number: string
          id: string
          message_sid: string | null
          phone_number_id: string | null
          sent_at: string | null
          status: string
          to_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          error_message?: string | null
          from_number: string
          id?: string
          message_sid?: string | null
          phone_number_id?: string | null
          sent_at?: string | null
          status?: string
          to_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          from_number?: string
          id?: string
          message_sid?: string | null
          phone_number_id?: string | null
          sent_at?: string | null
          status?: string
          to_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      voice_models: {
        Row: {
          created_at: string
          description: string | null
          gender: string
          id: string
          is_default: boolean
          is_preset: boolean
          language: string
          name: string
          pitch: number
          provider: string
          provider_voice_id: string | null
          sample_path: string | null
          similarity: number
          speed: number
          stability: number
          status: string
          style: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gender?: string
          id?: string
          is_default?: boolean
          is_preset?: boolean
          language?: string
          name: string
          pitch?: number
          provider?: string
          provider_voice_id?: string | null
          sample_path?: string | null
          similarity?: number
          speed?: number
          stability?: number
          status?: string
          style?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gender?: string
          id?: string
          is_default?: boolean
          is_preset?: boolean
          language?: string
          name?: string
          pitch?: number
          provider?: string
          provider_voice_id?: string | null
          sample_path?: string | null
          similarity?: number
          speed?: number
          stability?: number
          status?: string
          style?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      voice_samples: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_path: string
          id: string
          label: string | null
          size_bytes: number | null
          user_id: string
          voice_model_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_path: string
          id?: string
          label?: string | null
          size_bytes?: number | null
          user_id: string
          voice_model_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_path?: string
          id?: string
          label?: string | null
          size_bytes?: number | null
          user_id?: string
          voice_model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_samples_voice_model_id_fkey"
            columns: ["voice_model_id"]
            isOneToOne: false
            referencedRelation: "voice_models"
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
      app_role: "admin" | "agent" | "customer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "agent", "customer"],
    },
  },
} as const
