"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Companion } from "@/components/companions/Companion";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { useNudgesLeft } from "@/lib/game/queries";
import { NUDGE_MAX_LENGTH, NUDGE_PRESETS } from "@/lib/nudges";
import { playSound } from "@/lib/sound";
import { toast } from "@/lib/toast";
import type { Companion as Kind } from "@/lib/validation/onboarding";

// Nudge your partner (PRD 5.12, design §14.3): tap a preset or write your
// own; it arrives as a push and their creature waves. 3 a day.

export function NudgeSheet({
  open,
  onClose,
  meId,
  partnerName,
  partnerKind,
  partnerColor,
}: {
  open: boolean;
  onClose: () => void;
  meId: string;
  partnerName: string;
  partnerKind: Kind;
  partnerColor: string;
}) {
  const queryClient = useQueryClient();
  const left = useNudgesLeft(meId);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const none = left.data === 0;

  async function send(message: string) {
    setBusy(message);
    setError(null);
    const res = await api<{ left: number }>("/api/nudge", {
      body: { message },
    });
    setBusy(null);
    if (!res.ok) return setError(res.message);
    playSound("whoosh");
    toast(`Nudge sent to ${partnerName}`, "wave");
    setCustom("");
    await queryClient.invalidateQueries({ queryKey: ["nudges-left"] });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Nudge ${partnerName}`}>
      <div className="flex items-center gap-3" data-player-color={partnerColor}>
        <Companion kind={partnerKind} mood="waiting" size={64} />
        <p className="text-ink-2 text-sm">
          {left.data === undefined
            ? "Checking today’s nudges…"
            : none
              ? "That’s all 3 nudges for today. Try again tomorrow."
              : `${left.data} ${left.data === 1 ? "nudge" : "nudges"} left today. They’ll get a push.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {NUDGE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={none || busy !== null}
            onClick={() => send(p)}
            className="bg-peach-soft text-peach-deep rounded-pill min-h-11 px-4 py-2 text-left text-sm font-semibold transition-transform active:scale-[0.96] disabled:opacity-50"
          >
            {busy === p ? "Sending…" : p}
          </button>
        ))}
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) send(custom.trim());
        }}
      >
        <TextField
          id="nudge-custom"
          label="Or write your own"
          value={custom}
          maxLength={NUDGE_MAX_LENGTH}
          placeholder="You said you’d do two today 😏"
          onChange={(e) => setCustom(e.target.value)}
          error={error}
        />
        <Button
          type="submit"
          disabled={none || !custom.trim() || busy !== null}
        >
          {busy === custom.trim() ? "Sending…" : "Send nudge"}
        </Button>
      </form>
    </Sheet>
  );
}
