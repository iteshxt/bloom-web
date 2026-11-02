export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      activity: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: number;
          kind: string;
          pair_id: string;
          payload: Json;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: number;
          kind: string;
          pair_id: string;
          payload?: Json;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: number;
          kind?: string;
          pair_id?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "activity_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      badges_earned: {
        Row: {
          badge_key: string;
          earned_at: string;
          pair_id: string;
          player_id: string;
        };
        Insert: {
          badge_key: string;
          earned_at?: string;
          pair_id: string;
          player_id: string;
        };
        Update: {
          badge_key?: string;
          earned_at?: string;
          pair_id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badges_earned_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "badges_earned_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_targets: {
        Row: {
          created_at: string;
          effective_from: string;
          id: number;
          pair_id: string;
          player_id: string;
          set_by: string | null;
          target: number;
        };
        Insert: {
          created_at?: string;
          effective_from: string;
          id?: number;
          pair_id: string;
          player_id: string;
          set_by?: string | null;
          target: number;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          id?: number;
          pair_id?: string;
          player_id?: string;
          set_by?: string | null;
          target?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_targets_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_targets_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_targets_set_by_fkey";
            columns: ["set_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      days: {
        Row: {
          completed_at: string | null;
          day: string;
          finalized_at: string | null;
          makeup_required: number;
          pair_id: string;
          player_id: string;
          run_id: string | null;
          solved_count: number;
          status: Database["public"]["Enums"]["day_status"];
          target: number;
        };
        Insert: {
          completed_at?: string | null;
          day: string;
          finalized_at?: string | null;
          makeup_required?: number;
          pair_id: string;
          player_id: string;
          run_id?: string | null;
          solved_count?: number;
          status?: Database["public"]["Enums"]["day_status"];
          target: number;
        };
        Update: {
          completed_at?: string | null;
          day?: string;
          finalized_at?: string | null;
          makeup_required?: number;
          pair_id?: string;
          player_id?: string;
          run_id?: string | null;
          solved_count?: number;
          status?: Database["public"]["Enums"]["day_status"];
          target?: number;
        };
        Relationships: [
          {
            foreignKeyName: "days_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "days_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "days_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
      gifts: {
        Row: {
          delivered_at: string | null;
          details: string | null;
          giver_id: string;
          hint: string | null;
          id: string;
          link_url: string | null;
          milestone: number;
          pair_id: string;
          receiver_id: string;
          revealed_at: string | null;
          status: Database["public"]["Enums"]["gift_status"];
          title: string | null;
          unlocked_at: string | null;
          updated_at: string;
        };
        Insert: {
          delivered_at?: string | null;
          details?: string | null;
          giver_id: string;
          hint?: string | null;
          id?: string;
          link_url?: string | null;
          milestone: number;
          pair_id: string;
          receiver_id: string;
          revealed_at?: string | null;
          status?: Database["public"]["Enums"]["gift_status"];
          title?: string | null;
          unlocked_at?: string | null;
          updated_at?: string;
        };
        Update: {
          delivered_at?: string | null;
          details?: string | null;
          giver_id?: string;
          hint?: string | null;
          id?: string;
          link_url?: string | null;
          milestone?: number;
          pair_id?: string;
          receiver_id?: string;
          revealed_at?: string | null;
          status?: Database["public"]["Enums"]["gift_status"];
          title?: string | null;
          unlocked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gifts_giver_id_fkey";
            columns: ["giver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      milestone_achievements: {
        Row: {
          achieved_on: string;
          milestone: number;
          pair_id: string;
          player_id: string;
          run_id: string;
        };
        Insert: {
          achieved_on: string;
          milestone: number;
          pair_id: string;
          player_id: string;
          run_id: string;
        };
        Update: {
          achieved_on?: string;
          milestone?: number;
          pair_id?: string;
          player_id?: string;
          run_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestone_achievements_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "milestone_achievements_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "milestone_achievements_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_log: {
        Row: {
          dedupe_key: string;
          id: number;
          kind: string;
          player_id: string;
          sent_at: string;
        };
        Insert: {
          dedupe_key: string;
          id?: number;
          kind: string;
          player_id: string;
          sent_at?: string;
        };
        Update: {
          dedupe_key?: string;
          id?: number;
          kind?: string;
          player_id?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      nudges: {
        Row: {
          created_at: string;
          from_id: string;
          id: number;
          message: string;
          pair_id: string;
          to_id: string;
        };
        Insert: {
          created_at?: string;
          from_id: string;
          id?: number;
          message: string;
          pair_id: string;
          to_id: string;
        };
        Update: {
          created_at?: string;
          from_id?: string;
          id?: number;
          message?: string;
          pair_id?: string;
          to_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nudges_from_id_fkey";
            columns: ["from_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nudges_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nudges_to_id_fkey";
            columns: ["to_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pairs: {
        Row: {
          created_at: string;
          created_by: string;
          grace_minutes: number;
          id: string;
          invite_code: string;
          makeup_enabled: boolean;
          milestones: number[];
          start_date: string | null;
          tokens_per_run: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          grace_minutes?: number;
          id?: string;
          invite_code: string;
          makeup_enabled?: boolean;
          milestones?: number[];
          start_date?: string | null;
          tokens_per_run?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          grace_minutes?: number;
          id?: string;
          invite_code?: string;
          makeup_enabled?: boolean;
          milestones?: number[];
          start_date?: string | null;
          tokens_per_run?: number;
        };
        Relationships: [];
      };
      problems: {
        Row: {
          difficulty: Database["public"]["Enums"]["lc_difficulty"] | null;
          fetched_at: string;
          frontend_id: string | null;
          title: string;
          title_slug: string;
          topic_tags: string[];
        };
        Insert: {
          difficulty?: Database["public"]["Enums"]["lc_difficulty"] | null;
          fetched_at?: string;
          frontend_id?: string | null;
          title: string;
          title_slug: string;
          topic_tags?: string[];
        };
        Update: {
          difficulty?: Database["public"]["Enums"]["lc_difficulty"] | null;
          fetched_at?: string;
          frontend_id?: string | null;
          title?: string;
          title_slug?: string;
          topic_tags?: string[];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_key: string;
          best_streak: number;
          color: string;
          created_at: string;
          display_name: string;
          id: string;
          leetcode_username: string | null;
          leetcode_verified_at: string | null;
          level: number;
          notif_prefs: Json;
          pair_id: string | null;
          xp_total: number;
        };
        Insert: {
          avatar_key?: string;
          best_streak?: number;
          color?: string;
          created_at?: string;
          display_name: string;
          id: string;
          leetcode_username?: string | null;
          leetcode_verified_at?: string | null;
          level?: number;
          notif_prefs?: Json;
          pair_id?: string | null;
          xp_total?: number;
        };
        Update: {
          avatar_key?: string;
          best_streak?: number;
          color?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          leetcode_username?: string | null;
          leetcode_verified_at?: string | null;
          level?: number;
          notif_prefs?: Json;
          pair_id?: string | null;
          xp_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          failure_count: number;
          id: string;
          last_success_at: string | null;
          p256dh: string;
          player_id: string;
          user_agent: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          failure_count?: number;
          id?: string;
          last_success_at?: string | null;
          p256dh: string;
          player_id: string;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          failure_count?: number;
          id?: string;
          last_success_at?: string | null;
          p256dh?: string;
          player_id?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      restore_requests: {
        Row: {
          approver_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          message: string | null;
          missed_day: string;
          pair_id: string;
          player_id: string;
          responded_at: string | null;
          response_message: string | null;
          run_id: string;
          status: Database["public"]["Enums"]["restore_status"];
        };
        Insert: {
          approver_id: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          message?: string | null;
          missed_day: string;
          pair_id: string;
          player_id: string;
          responded_at?: string | null;
          response_message?: string | null;
          run_id: string;
          status?: Database["public"]["Enums"]["restore_status"];
        };
        Update: {
          approver_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          message?: string | null;
          missed_day?: string;
          pair_id?: string;
          player_id?: string;
          responded_at?: string | null;
          response_message?: string | null;
          run_id?: string;
          status?: Database["public"]["Enums"]["restore_status"];
        };
        Relationships: [
          {
            foreignKeyName: "restore_requests_approver_id_fkey";
            columns: ["approver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restore_requests_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restore_requests_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restore_requests_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          at_risk_day: string | null;
          created_at: string;
          end_reason: Database["public"]["Enums"]["run_end_reason"] | null;
          ended_on: string | null;
          id: string;
          last_counted_day: string | null;
          length: number;
          pair_id: string;
          player_id: string;
          restores_used: number;
          started_on: string;
          tokens_remaining: number;
        };
        Insert: {
          at_risk_day?: string | null;
          created_at?: string;
          end_reason?: Database["public"]["Enums"]["run_end_reason"] | null;
          ended_on?: string | null;
          id?: string;
          last_counted_day?: string | null;
          length?: number;
          pair_id: string;
          player_id: string;
          restores_used?: number;
          started_on: string;
          tokens_remaining: number;
        };
        Update: {
          at_risk_day?: string | null;
          created_at?: string;
          end_reason?: Database["public"]["Enums"]["run_end_reason"] | null;
          ended_on?: string | null;
          id?: string;
          last_counted_day?: string | null;
          length?: number;
          pair_id?: string;
          player_id?: string;
          restores_used?: number;
          started_on?: string;
          tokens_remaining?: number;
        };
        Relationships: [
          {
            foreignKeyName: "runs_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          assigned_day: string;
          counted: boolean;
          created_at: string;
          id: number;
          is_resolve: boolean;
          lc_submission_id: string | null;
          pair_id: string;
          player_id: string;
          source: Database["public"]["Enums"]["submission_source"];
          submitted_at: string;
          title_slug: string;
          xp: number;
        };
        Insert: {
          assigned_day: string;
          counted: boolean;
          created_at?: string;
          id?: number;
          is_resolve?: boolean;
          lc_submission_id?: string | null;
          pair_id: string;
          player_id: string;
          source: Database["public"]["Enums"]["submission_source"];
          submitted_at: string;
          title_slug: string;
          xp?: number;
        };
        Update: {
          assigned_day?: string;
          counted?: boolean;
          created_at?: string;
          id?: number;
          is_resolve?: boolean;
          lc_submission_id?: string | null;
          pair_id?: string;
          player_id?: string;
          source?: Database["public"]["Enums"]["submission_source"];
          submitted_at?: string;
          title_slug?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_title_slug_fkey";
            columns: ["title_slug"];
            isOneToOne: false;
            referencedRelation: "problems";
            referencedColumns: ["title_slug"];
          },
        ];
      };
      sync_state: {
        Row: {
          consecutive_failures: number;
          last_attempt_at: string | null;
          last_error: string | null;
          last_finalized_day: string | null;
          last_success_at: string | null;
          lock_owner: string | null;
          lock_until: string | null;
          player_id: string;
        };
        Insert: {
          consecutive_failures?: number;
          last_attempt_at?: string | null;
          last_error?: string | null;
          last_finalized_day?: string | null;
          last_success_at?: string | null;
          lock_owner?: string | null;
          lock_until?: string | null;
          player_id: string;
        };
        Update: {
          consecutive_failures?: number;
          last_attempt_at?: string | null;
          last_error?: string | null;
          last_finalized_day?: string | null;
          last_success_at?: string | null;
          lock_owner?: string | null;
          lock_until?: string | null;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_state_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      xp_events: {
        Row: {
          amount: number;
          created_at: string;
          id: number;
          pair_id: string;
          player_id: string;
          reason: string;
          ref: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: number;
          pair_id: string;
          player_id: string;
          reason: string;
          ref?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: number;
          pair_id?: string;
          player_id?: string;
          reason?: string;
          ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "xp_events_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "xp_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      level_for_xp: { Args: { p_xp: number }; Returns: number };
      my_pair_id: { Args: never; Returns: string };
      release_lock: {
        Args: { p_owner: string; p_player: string };
        Returns: undefined;
      };
      save_player_state: { Args: { p: Json }; Returns: Json };
      try_lock: {
        Args: { p_owner: string; p_player: string; p_ttl_seconds?: number };
        Returns: boolean;
      };
    };
    Enums: {
      day_status: "pending" | "complete" | "missed" | "restored";
      gift_status: "locked" | "unlocked" | "revealed" | "delivered";
      lc_difficulty: "Easy" | "Medium" | "Hard";
      restore_status:
        "pending" | "approved" | "rejected" | "expired" | "cancelled";
      run_end_reason:
        | "missed"
        | "no_tokens"
        | "restore_rejected"
        | "restore_expired"
        | "makeup_failed";
      submission_source: "leetcode" | "manual";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      day_status: ["pending", "complete", "missed", "restored"],
      gift_status: ["locked", "unlocked", "revealed", "delivered"],
      lc_difficulty: ["Easy", "Medium", "Hard"],
      restore_status: [
        "pending",
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ],
      run_end_reason: [
        "missed",
        "no_tokens",
        "restore_rejected",
        "restore_expired",
        "makeup_failed",
      ],
      submission_source: ["leetcode", "manual"],
    },
  },
} as const;
