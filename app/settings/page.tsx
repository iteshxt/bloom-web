"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clearOfflineCache } from "@/lib/offline/cache";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePushState } from "@/components/push/usePushState";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { api } from "@/lib/api/client";
import { useNow } from "@/lib/dashboard/useNow";
import { shortDate } from "@/lib/format/ist";
import {
  NOTIFICATION_CATEGORIES,
  categoryEnabled,
} from "@/lib/push/categories";
import { createClient } from "@/lib/supabase/browser";
import { addDays, todayIST } from "@/lib/time";
import { MAX_START_DAYS_AHEAD } from "@/lib/validation/onboarding";

// Settings (PRD 5.17, design §11.14), functional pass: notifications and the
// shared challenge settings. Profile editing and appearance (theme, sounds)
// arrive with later steps.

function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getClaims();
      const userId = auth?.claims?.sub;
      if (!userId) throw new Error("Signed out");
      const { data: me, error } = await supabase
        .from("profiles")
        .select("id, display_name, leetcode_username, notif_prefs, pair_id")
        .eq("id", userId)
        .single();
      if (error) throw error;
      const { data: pair, error: pairError } = await supabase
        .from("pairs")
        .select("makeup_enabled, start_date")
        .eq("id", me.pair_id!)
        .single();
      if (pairError) throw pairError;
      return { me, pair };
    },
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = useNow();
  const settings = useSettings();

  async function signOut() {
    await createClient().auth.signOut();
    // Don't leave this account's data on the device.
    queryClient.clear();
    clearOfflineCache();
    router.replace("/login");
    router.refresh();
  }

  if (!settings.data || !now) {
    return (
      <PageShell title="Settings">
        <p className="text-ink-2">
          {settings.isError
            ? "Something went sideways. Try again."
            : "Loading…"}
        </p>
      </PageShell>
    );
  }
  const { me, pair } = settings.data;
  const prefs = (me.notif_prefs ?? {}) as Record<string, unknown>;

  return (
    <PageShell title="Settings">
      <Group title="Reminders">
        <DevicePush />
        {NOTIFICATION_CATEGORIES.map((c) => (
          <CategoryToggle
            key={c.key}
            label={c.label}
            hint={c.hint}
            kinds={c.kinds}
            on={categoryEnabled(prefs, c.kinds)}
          />
        ))}
      </Group>

      <Group title="Challenge">
        <MakeupToggle on={pair.makeup_enabled} />
        {pair.start_date && todayIST(now) < pair.start_date && (
          <StartDate current={pair.start_date} today={todayIST(now)} />
        )}
      </Group>

      <Group title="Profile">
        <Row label="Name" value={me.display_name} />
        <Row label="LeetCode" value={me.leetcode_username ?? "Not linked"} />
      </Group>

      <Button variant="ghost" className="self-start" onClick={signOut}>
        Sign out
      </Button>
    </PageShell>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[22px] leading-[1.2] font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface flex items-center justify-between gap-3 rounded-md px-4 py-3">
      <span className="font-semibold">{label}</span>
      <span className="text-ink-2 truncate">{value}</span>
    </div>
  );
}

function Switch({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="bg-surface flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-md px-4 py-3"
    >
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-ink-2 text-sm">{hint}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-mint-deep h-6 w-6 shrink-0"
      />
    </label>
  );
}

/** Notifications on this device: subscribe from a tap, plus a test push. */
function DevicePush() {
  const { state, message, busy, enable, disable } = usePushState();
  const [test, setTest] = useState<string | null>(null);

  if (state === null) return null;
  if (state === "unsupported") {
    return (
      <p className="text-ink-2 text-sm">
        This browser can’t show notifications. Install Bloom on your phone to
        get them.
      </p>
    );
  }
  return (
    <>
      <Switch
        id="device-push"
        label="Notifications on this device"
        hint={
          state === "denied"
            ? "Blocked in your browser's site settings"
            : undefined
        }
        checked={state === "on"}
        disabled={busy || state === "denied"}
        onChange={(next) => (next ? enable() : disable())}
      />
      {message && (
        <p className="text-peach-deep text-sm font-semibold">{message}</p>
      )}
      {state === "on" && (
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              setTest("Sending…");
              const res = await api("/api/push/test", { body: {} });
              setTest(
                res.ok ? "Sent. It should appear in a moment." : res.message,
              );
            }}
          >
            Send a test notification
          </Button>
          {test && (
            <span className="text-ink-2 text-sm" role="status">
              {test}
            </span>
          )}
        </div>
      )}
    </>
  );
}

function CategoryToggle({
  label,
  hint,
  kinds,
  on,
}: {
  label: string;
  hint: string;
  kinds: string[];
  on: boolean;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Switch
      id={`cat-${kinds[0]}`}
      label={label}
      hint={hint}
      checked={on}
      disabled={busy}
      onChange={async (next) => {
        setBusy(true);
        await api("/api/settings/notifications", {
          method: "PATCH",
          body: Object.fromEntries(kinds.map((k) => [k, next])),
        });
        setBusy(false);
        await queryClient.invalidateQueries({ queryKey: ["settings"] });
      }}
    />
  );
}

/** PRD 4.6: make-up days after an approved restore (shared setting). */
function MakeupToggle({ on }: { on: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Switch
      id="makeup"
      label="Make-up after a restore"
      hint="The day after a restored day needs that day's problems too"
      checked={on}
      disabled={busy}
      onChange={async (next) => {
        setBusy(true);
        await api("/api/pair", {
          method: "PATCH",
          body: { makeupEnabled: next },
        });
        setBusy(false);
        await queryClient.invalidateQueries();
      }}
    />
  );
}

/** Editable only before the challenge starts (PRD 5.17). */
function StartDate({ current, today }: { current: string; today: string }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(current);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="bg-surface flex flex-col gap-2 rounded-md px-4 py-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await api("/api/pair", {
          method: "PATCH",
          body: { startDate: value },
        });
        setMessage(res.ok ? `Day 1 is now ${shortDate(value)}.` : res.message);
        await queryClient.invalidateQueries();
      }}
    >
      <label htmlFor="start-date" className="font-semibold">
        Start date
      </label>
      <div className="flex gap-2">
        <input
          id="start-date"
          type="date"
          value={value}
          min={today}
          max={addDays(today, MAX_START_DAYS_AHEAD)}
          onChange={(e) => setValue(e.target.value)}
          className="border-line bg-surface h-11 rounded-sm border-[1.5px] px-3"
        />
        <Button
          type="submit"
          variant="secondary"
          className="h-11!"
          disabled={value === current}
        >
          Save
        </Button>
      </div>
      <p className="text-ink-2 text-sm" role="status">
        {message ?? "You can change this until the challenge begins."}
      </p>
    </form>
  );
}
