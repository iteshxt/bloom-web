"use client";

import { LineIcon } from "@/components/icons/line";
import { Button } from "@/components/ui/Button";
import { PetalSpinner } from "@/components/ui/Progress";
import { ago } from "@/lib/format/ist";
import { useSyncNow } from "@/lib/useSyncNow";

// design §14.4: "Sync now" → "Syncing…" → "Synced · 2 new".

export function SyncButton({
  lastSyncAt,
  now,
  sync: shared,
}: {
  lastSyncAt: Date | string | null;
  now: Date;
  /** The page's sync, when pull-to-refresh shares it. */
  sync?: ReturnType<typeof useSyncNow>;
}) {
  const own = useSyncNow();
  const { state, sync } = shared ?? own;

  return (
    <div className="border-line flex items-center justify-between gap-3 border-t pt-3">
      <p className="text-ink-2 text-[13px]" role="status">
        {state.kind === "done" || state.kind === "error"
          ? state.text
          : lastSyncAt
            ? `Synced ${ago(new Date(lastSyncAt), now)}`
            : "Not synced yet"}
      </p>
      <Button
        variant="secondary"
        className="h-11! px-4 text-sm"
        onClick={sync}
        disabled={state.kind === "syncing"}
      >
        {state.kind === "syncing" ? (
          <>
            <PetalSpinner size={18} /> Syncing…
          </>
        ) : (
          <>
            Sync now <LineIcon name="sync" size={18} />
          </>
        )}
      </Button>
    </div>
  );
}
