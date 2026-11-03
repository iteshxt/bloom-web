"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ReceivingGift, GivingGift } from "@/lib/gifts/view";
import { createClient } from "@/lib/supabase/browser";

// Read hooks for the step 6 screens. Rows come from Supabase under RLS,
// except gifts, which only the server may read (invariant 5). Realtime
// events from useDuel() invalidate all of these.

export function useGifts() {
  return useQuery({
    queryKey: ["gifts"],
    queryFn: async () => {
      const res = await api<{
        giving: GivingGift[];
        receiving: ReceivingGift[];
      }>("/api/gifts");
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export interface RestoreRow {
  id: string;
  playerId: string;
  approverId: string;
  missedDay: string;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  responseMessage: string | null;
  expiresAt: string;
  createdAt: string;
}

export function useRestoreHistory() {
  return useQuery({
    queryKey: ["restores"],
    queryFn: async (): Promise<RestoreRow[]> => {
      const { data, error } = await createClient()
        .from("restore_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        playerId: r.player_id,
        approverId: r.approver_id,
        missedDay: r.missed_day,
        message: r.message,
        status: r.status,
        responseMessage: r.response_message,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
      }));
    },
  });
}

/** Lifetime milestone achievements for both players. */
export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("milestone_achievements")
        .select("player_id, milestone, achieved_on");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** One player's target history, newest first. */
export function useTargetHistory(playerId: string) {
  return useQuery({
    queryKey: ["targets", playerId],
    enabled: playerId !== "",
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("daily_targets")
        .select("target, effective_from, set_by, created_at")
        .eq("player_id", playerId)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface HistorySolve {
  slug: string;
  title: string;
  difficulty: string | null;
  topics: string[];
  day: string;
  submittedAt: string;
  counted: boolean;
  xp: number;
}

/** Everything a profile's heatmap and stats need (PRD 5.4): every day row,
 *  every stored solve with its problem, and every run's length. */
export function usePlayerHistory(playerId: string) {
  return useQuery({
    queryKey: ["history", playerId],
    enabled: playerId !== "",
    queryFn: async () => {
      const supabase = createClient();
      const [days, subs, runs] = await Promise.all([
        supabase
          .from("days")
          .select("day, status, solved_count, target, makeup_required")
          .eq("player_id", playerId),
        supabase
          .from("submissions")
          .select(
            "title_slug, assigned_day, submitted_at, counted, xp, problems(title, difficulty, topic_tags)",
          )
          .eq("player_id", playerId)
          .order("submitted_at", { ascending: true }),
        supabase.from("runs").select("length").eq("player_id", playerId),
      ]);
      for (const r of [days, subs, runs]) if (r.error) throw r.error;
      return {
        rows: (days.data ?? []).map((d) => ({
          day: d.day,
          status: d.status,
          solved: d.solved_count,
          target: d.target,
          makeup: d.makeup_required,
        })),
        solves: (subs.data ?? []).map((s): HistorySolve => ({
          slug: s.title_slug,
          title: s.problems?.title ?? s.title_slug,
          difficulty: s.problems?.difficulty ?? null,
          topics: s.problems?.topic_tags ?? [],
          day: s.assigned_day,
          submittedAt: s.submitted_at,
          counted: s.counted,
          xp: s.xp,
        })),
        runLengths: (runs.data ?? []).map((r) => r.length),
      };
    },
  });
}
