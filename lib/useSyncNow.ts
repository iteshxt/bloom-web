"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api } from "@/lib/api/client";
import { DUEL_KEY } from "@/lib/dashboard/useDuel";
import { toast } from "@/lib/toast";

// "Sync now" (design §14.4), shared by the button and pull-to-refresh.

export type SyncState =
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

export function useSyncNow() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SyncState>({ kind: "idle" });

  const sync = useCallback(async () => {
    setState({ kind: "syncing" });
    const res = await api<{ sync: string; newSolves: number }>("/api/sync", {
      body: {},
    });
    if (!res.ok) return setState({ kind: "error", text: res.message });
    if (res.data.sync === "failed") {
      return setState({
        kind: "error",
        text: "Can’t reach LeetCode right now. Try again soon.",
      });
    }
    const text =
      res.data.newSolves > 0
        ? `Synced · ${res.data.newSolves} new`
        : "Synced · nothing new";
    setState({ kind: "done", text });
    toast(text, "code");
    await queryClient.invalidateQueries({ queryKey: DUEL_KEY });
  }, [queryClient]);

  return { state, sync };
}
