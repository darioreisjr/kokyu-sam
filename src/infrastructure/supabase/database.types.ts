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
          p_bio?: string | null;
          p_birth_date: string;
          p_city?: string | null;
          p_country_code?: string | null;
          p_first_name: string;
          p_last_name: string;
          p_region?: string | null;
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
          p_bio?: string | null;
          p_birth_date: string;
          p_city?: string | null;
          p_country_code?: string | null;
          p_first_name: string;
          p_last_name: string;
          p_region?: string | null;
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
