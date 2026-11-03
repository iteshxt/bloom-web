"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { DUEL_KEY } from "@/lib/dashboard/useDuel";
import { ago } from "@/lib/format/ist";

// design §14.4: "Sync now" → "Syncing…" → "Synced · 2 new".

export function SyncButton({
  lastSyncAt,
  now,
}: {
  lastSyncAt: Date | null;
  now: Date;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "syncing" }
    | { kind: "done"; text: string }
    | { kind: "error"; text: string }
  >({ kind: "idle" });

  async function sync() {
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
    setState({
      kind: "done",
      text:
        res.data.newSolves > 0
          ? `Synced · ${res.data.newSolves} new`
          : "Synced · nothing new",
    });
    await queryClient.invalidateQueries({ queryKey: DUEL_KEY });
  }

  return (
    <div className="border-line flex items-center justify-between gap-3 border-t pt-3">
      <p className="text-ink-2 text-[13px]" role="status">
        {state.kind === "done" || state.kind === "error"
          ? state.text
          : lastSyncAt
            ? `Synced ${ago(lastSyncAt, now)}`
            : "Not synced yet"}
      </p>
      <Button
        variant="secondary"
        className="h-11!"
        onClick={sync}
        disabled={state.kind === "syncing"}
      >
        {state.kind === "syncing" ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}
