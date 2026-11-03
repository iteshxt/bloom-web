"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PuffyIcon } from "@/components/icons/puffy";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { parseProblemUrl } from "@/lib/checkin";
import { toast } from "@/lib/toast";

// Manual check-in (PRD 5.13): while LeetCode sync is failing, paste the
// link of a problem you just solved. It counts now and shows as unverified
// to your partner.

export function CheckInSheet({
  open,
  onClose,
  partnerName,
}: {
  open: boolean;
  onClose: () => void;
  partnerName: string;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = parseProblemUrl(url);

  async function paste() {
    try {
      setUrl((await navigator.clipboard.readText()).trim());
      setError(null);
    } catch {
      setError("Couldn't read the clipboard. Paste the link by hand.");
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api<{ counted: boolean; xp: number }>(
      "/api/checkin/manual",
      { body: { problemUrl: url } },
    );
    setBusy(false);
    if (!res.ok) return setError(res.message);
    toast(
      res.data.counted
        ? `Checked in${res.data.xp ? ` · +${res.data.xp} XP` : ""}`
        : "Already counted today",
      res.data.counted ? "sprout" : "check",
    );
    setUrl("");
    await queryClient.invalidateQueries();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Check in by hand">
      <div className="bg-peach-soft text-peach-deep flex items-start gap-3 rounded-md p-3 text-sm font-semibold">
        <PuffyIcon name="code" size={36} className="shrink-0" />
        <p>
          Bloom can’t reach LeetCode right now. Paste the link of a problem you
          just solved: it counts now, and {partnerName} sees it as unverified.
        </p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (slug) submit();
        }}
      >
        <TextField
          id="checkin-url"
          label="LeetCode problem link"
          value={url}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://leetcode.com/problems/two-sum/"
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          error={
            error ??
            (url.trim() && !slug
              ? "That doesn't look like a LeetCode problem link"
              : null)
          }
          hint={slug ? `Problem: ${slug}` : undefined}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="soft"
            className="h-[52px]!"
            onClick={paste}
          >
            Paste
          </Button>
          <Button type="submit" className="flex-1" disabled={!slug || busy}>
            {busy ? "Checking in…" : "Check in"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
