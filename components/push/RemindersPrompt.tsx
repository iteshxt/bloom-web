"use client";

import { Button } from "@/components/ui/Button";
import { usePushState } from "./usePushState";

// design §11.2 step 5: "Turn on reminders", shown on home until this device
// has notifications on. Permission is asked only when the button is tapped.

export function RemindersPrompt() {
  const { state, message, busy, enable } = usePushState();
  if (state !== "off" && state !== "denied") return null;

  return (
    <section className="bg-butter-soft text-butter-deep flex flex-col gap-2 rounded-md p-4">
      <p className="font-semibold">
        {state === "denied"
          ? "Notifications are blocked for Bloom. Allow them in your browser's site settings to get reminders."
          : "Turn on reminders so you never lose a streak to a busy day."}
      </p>
      {state === "off" && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={busy}
          onClick={enable}
        >
          {busy ? "Turning on…" : "Turn on reminders"}
        </Button>
      )}
      {message && <p className="text-sm">{message}</p>}
    </section>
  );
}
