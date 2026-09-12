export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      leisure_collection_items: {
        Row: {
          added_at: string;
          collection_id: string;
          item_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          collection_id: string;
          item_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          collection_id?: string;
          item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leisure_collection_items_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'leisure_collections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leisure_collection_items_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'leisure_items';
            referencedColumns: ['id'];
          },
        ];
      };
      leisure_collections: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      leisure_items: {
        Row: {
          archived_at: string | null;
          cover_image: string | null;
          created_at: string;
          description: string | null;
          details: Json;
          duration_type: string;
          estimated_duration: number | null;
          favorite: boolean;
          id: string;
          minimum_useful_duration: number | null;
          priority: string | null;
          recommended_by: string | null;
          source: string | null;
          source_url: string | null;
          status: string;
          tags: string[];
          title: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          cover_image?: string | null;
          created_at?: string;
          description?: string | null;
          details?: Json;
          duration_type?: string;
          estimated_duration?: number | null;
          favorite?: boolean;
          id?: string;
          minimum_useful_duration?: number | null;
          priority?: string | null;
          recommended_by?: string | null;
          source?: string | null;
          source_url?: string | null;
          status?: string;
          tags?: string[];
          title: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          cover_image?: string | null;
          created_at?: string;
          description?: string | null;
          details?: Json;
          duration_type?: string;
          estimated_duration?: number | null;
          favorite?: boolean;
          id?: string;
          minimum_useful_duration?: number | null;
          priority?: string | null;
          recommended_by?: string | null;
          source?: string | null;
          source_url?: string | null;
          status?: string;
          tags?: string[];
          title?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      leisure_log_entries: {
        Row: {
          activity_type: string;
          completed_at: string;
          created_at: string;
          duration: number | null;
          id: string;
          leisure_item_id: string | null;
          notes: string | null;
          rating: number | null;
          started_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          completed_at: string;
          created_at?: string;
          duration?: number | null;
          id?: string;
          leisure_item_id?: string | null;
          notes?: string | null;
          rating?: number | null;
          started_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          completed_at?: string;
          created_at?: string;
          duration?: number | null;
          id?: string;
          leisure_item_id?: string | null;
          notes?: string | null;
          rating?: number | null;
          started_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leisure_log_entries_leisure_item_id_fkey';
            columns: ['leisure_item_id'];
            isOneToOne: false;
            referencedRelation: 'leisure_items';
            referencedColumns: ['id'];
          },
        ];
      };
      leisure_notes: {
        Row: {
          archived: boolean;
          checklist_items: Json;
          content: string;
          created_at: string;
          id: string;
          link_url: string | null;
          pinned: boolean;
          related_leisure_item_id: string | null;
          reminder_date: string | null;
          tags: string[];
          title: string | null;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived?: boolean;
          checklist_items?: Json;
          content?: string;
          created_at?: string;
          id?: string;
          link_url?: string | null;
          pinned?: boolean;
          related_leisure_item_id?: string | null;
          reminder_date?: string | null;
          tags?: string[];
          title?: string | null;
          type?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived?: boolean;
          checklist_items?: Json;
          content?: string;
          created_at?: string;
          id?: string;
          link_url?: string | null;
          pinned?: boolean;
          related_leisure_item_id?: string | null;
          reminder_date?: string | null;
          tags?: string[];
          title?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leisure_notes_related_leisure_item_id_fkey';
            columns: ['related_leisure_item_id'];
            isOneToOne: false;
            referencedRelation: 'leisure_items';
            referencedColumns: ['id'];
          },
        ];
      };
      leisure_plan_entries: {
        Row: {
          archived: boolean;
          archived_at: string | null;
          completed: boolean;
          created_at: string;
          date: string;
          duration: number | null;
          end_time: string | null;
          id: string;
          leisure_item_id: string | null;
          notes: string | null;
          recurrence: string;
          reminder: boolean;
          start_time: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          archived?: boolean;
          archived_at?: string | null;
          completed?: boolean;
          created_at?: string;
          date: string;
          duration?: number | null;
          end_time?: string | null;
          id?: string;
          leisure_item_id?: string | null;
          notes?: string | null;
          recurrence?: string;
          reminder?: boolean;
          start_time?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          archived?: boolean;
          archived_at?: string | null;
          completed?: boolean;
          created_at?: string;
          date?: string;
          duration?: number | null;
          end_time?: string | null;
          id?: string;
          leisure_item_id?: string | null;
          notes?: string | null;
          recurrence?: string;
          reminder?: boolean;
          start_time?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leisure_plan_entries_leisure_item_id_fkey';
            columns: ['leisure_item_id'];
            isOneToOne: false;
            referencedRelation: 'leisure_items';
            referencedColumns: ['id'];
          },
        ];
      };
      leisure_plan_entry_completions: {
        Row: {
          completed_at: string;
          id: string;
          occurrence_date: string;
          plan_entry_id: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          id?: string;
          occurrence_date: string;
          plan_entry_id: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          id?: string;
          occurrence_date?: string;
          plan_entry_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leisure_plan_entry_completions_plan_entry_id_fkey';
            columns: ['plan_entry_id'];
            isOneToOne: false;
            referencedRelation: 'leisure_plan_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_external_url: string | null;
          avatar_path: string | null;
          bio: string | null;
          birth_date: string | null;
          city: string | null;
          country_code: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          onboarding_completed_at: string | null;
          onboarding_version: number;
          profile_bootstrapped_at: string | null;
          region: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_external_url?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          city?: string | null;
          country_code?: string | null;
          created_at?: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          onboarding_completed_at?: string | null;
          onboarding_version?: number;
          profile_bootstrapped_at?: string | null;
          region?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_external_url?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          city?: string | null;
          country_code?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          onboarding_completed_at?: string | null;
          onboarding_version?: number;
          profile_bootstrapped_at?: string | null;
          region?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_profile: {
        Args: {
          p_bio?: string;
          p_birth_date: string;
          p_city?: string;
          p_country_code?: string;
          p_first_name: string;
          p_last_name: string;
          p_region?: string;
          p_username: string;
        };
        Returns: {
          avatar_external_url: string | null;
          avatar_path: string | null;
          bio: string | null;
          birth_date: string | null;
          city: string | null;
          country_code: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          onboarding_completed_at: string | null;
          onboarding_version: number;
          profile_bootstrapped_at: string | null;
          region: string | null;
          updated_at: string;
          username: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      update_profile: {
        Args: {
          p_bio?: string;
          p_birth_date: string;
          p_city?: string;
          p_country_code?: string;
          p_first_name: string;
          p_last_name: string;
          p_region?: string;
          p_username: string;
        };
        Returns: {
          avatar_external_url: string | null;
          avatar_path: string | null;
          bio: string | null;
          birth_date: string | null;
          city: string | null;
          country_code: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          onboarding_completed_at: string | null;
          onboarding_version: number;
          profile_bootstrapped_at: string | null;
          region: string | null;
          updated_at: string;
          username: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
