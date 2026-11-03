"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { clearOfflineCache } from "@/lib/offline/cache";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Companion } from "@/components/companions/Companion";
import { CompanionPicker } from "@/components/companions/CompanionPicker";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";
import { usePushState } from "@/components/push/usePushState";
import { InstallCard } from "@/components/pwa/InstallCard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { asKind } from "@/lib/companions";
import { spring } from "@/lib/motion";
import {
  setPrefs,
  usePrefs,
  type MotionPref,
  type ThemePref,
} from "@/lib/prefs";
import { toast } from "@/lib/toast";
import type { PlayerColor } from "@/lib/validation/onboarding";
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

// Settings (PRD 5.17, design §11.14): grouped white cards for the profile,
// reminders, appearance (per-device, kept in localStorage), the shared
// challenge settings and sign out.

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
        .select(
          "id, display_name, leetcode_username, notif_prefs, pair_id, avatar_key, color",
        )
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
      <PageShell title="Settings" back="/player/me">
        {settings.isError ? (
          <p className="text-ink-2">Something went sideways. Try again.</p>
        ) : (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        )}
      </PageShell>
    );
  }
  const { me, pair } = settings.data;
  const prefs = (me.notif_prefs ?? {}) as Record<string, unknown>;

  return (
    <PageShell title="Settings" back="/player/me" color={me.color}>
      <InstallCard />

      <Group title="Profile" icon="face">
        <ProfileRow
          name={me.display_name}
          kind={asKind(me.avatar_key)}
          color={me.color as PlayerColor}
        />
        <Row label="LeetCode" value={me.leetcode_username ?? "Not linked"} />
      </Group>

      <Group title="Reminders" icon="bell">
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

      <Appearance />

      <Group title="Challenge" icon="map">
        <MakeupToggle on={pair.makeup_enabled} />
        {pair.start_date && todayIST(now) < pair.start_date && (
          <StartDate current={pair.start_date} today={todayIST(now)} />
        )}
      </Group>

      <Group title="About" icon="sprout">
        <Row label="Version" value={APP_VERSION} />
        <Button variant="secondary" className="self-start" onClick={signOut}>
          Sign out
        </Button>
      </Group>
    </PageShell>
  );
}

const APP_VERSION = "1.0";

/** Name, companion and colour, edited in a sheet with the onboarding
 *  carousel (design §11.14). */
function ProfileRow({
  name,
  kind,
  color,
}: {
  name: string;
  kind: ReturnType<typeof asKind>;
  color: PlayerColor;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name, kind, color });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await api("/api/onboarding/profile", {
      body: {
        displayName: form.name.trim(),
        avatarKey: form.kind,
        color: form.color,
      },
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setOpen(false);
    toast("Profile saved", "check");
    await queryClient.invalidateQueries();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setForm({ name, kind, color });
          setOpen(true);
        }}
        className="bg-surface flex items-center gap-3 rounded-md px-3 py-2 text-left"
      >
        <Companion kind={kind} mood="idle" size={52} color={color} />
        <span className="flex flex-1 flex-col">
          <span className="font-semibold">{name}</span>
          <span className="text-ink-2 text-sm">Name, companion and colour</span>
        </span>
        <span className="text-ink-2 text-sm font-semibold">Edit</span>
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your profile"
        color={form.color}
      >
        <TextField
          id="profile-name"
          label="Your name"
          value={form.name}
          maxLength={30}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <CompanionPicker
          kind={form.kind}
          color={form.color}
          onKind={(k) => setForm({ ...form, kind: k })}
          onColor={(c) => setForm({ ...form, color: c })}
        />
        {error && (
          <p role="alert" className="text-peach-ink text-sm font-semibold">
            {error}
          </p>
        )}
        <Button disabled={busy || !form.name.trim()} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </Sheet>
    </>
  );
}

/** design §11.14 Appearance: per-device preferences, not synced. */
function Appearance() {
  const prefs = usePrefs();
  return (
    <Group title="Appearance" icon="moon">
      <Segmented<ThemePref>
        label="Theme"
        value={prefs.theme}
        onChange={(theme) => setPrefs({ theme })}
        options={[
          ["sky", "Follow the sky"],
          ["day", "Always day"],
          ["night", "Always night"],
        ]}
      />
      <Switch
        id="sounds"
        label="Sounds"
        hint="Soft pops and chimes for the big moments"
        checked={prefs.sounds}
        onChange={(sounds) => setPrefs({ sounds })}
      />
      {prefs.sounds && (
        <Switch
          id="tap-sound"
          label="Button taps"
          hint="A barely-there tick on every press"
          checked={prefs.tapSound}
          onChange={(tapSound) => setPrefs({ tapSound })}
        />
      )}
      <Switch
        id="haptics"
        label="Haptics"
        hint="Little buzzes on Android"
        checked={prefs.haptics}
        onChange={(haptics) => setPrefs({ haptics })}
      />
      <Segmented<MotionPref>
        label="Motion"
        value={prefs.motion}
        onChange={(motion) => setPrefs({ motion })}
        options={[
          ["system", "Follow system"],
          ["reduce", "Reduced"],
          ["full", "Full"],
        ]}
      />
    </Group>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="bg-surface flex flex-col gap-2 rounded-md px-4 py-3">
      <span className="font-semibold">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="bg-cloud rounded-pill grid gap-1 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`rounded-pill relative min-h-11 px-2 text-sm font-semibold ${value === v ? "text-p-deep" : "text-ink-2"}`}
          >
            {value === v && (
              <motion.span
                layoutId={`seg-${label}`}
                className="bg-p rounded-pill absolute inset-0"
                transition={spring.soft}
              />
            )}
            <span className="relative">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Group({
  title,
  icon,
  children,
}: {
  title: string;
  icon: PuffyName;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display flex items-center gap-2 text-[22px] leading-[1.2] font-bold">
        <PuffyIcon name={icon} size={32} />
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
        className="peer sr-only"
      />
      {/* the visible switch: mint when on (design §3.1 "done") */}
      <span
        aria-hidden
        className="bg-line peer-checked:bg-mint peer-focus-visible:outline-p rounded-pill after:shadow-soft relative h-8 w-[52px] shrink-0 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:opacity-50 after:absolute after:top-1 after:left-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}

/** Notifications on this device: subscribe from a tap, plus a test push. */
function DevicePush() {
  const { state, message, busy, enable, disable } = usePushState();
  const [test, setTest] = useState<string | null>(null);

  if (state === null) return null;
  if (state === "unconfigured") {
    return (
      <p className="text-ink-2 text-sm">
        Reminders aren’t switched on for Bloom yet. They’ll appear here once
        they are.
      </p>
    );
  }
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
        <p className="text-peach-ink text-sm font-semibold">{message}</p>
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
  const [confirm, setConfirm] = useState(false);

  async function save() {
    setConfirm(false);
    const res = await api("/api/pair", {
      method: "PATCH",
      body: { startDate: value },
    });
    setMessage(res.ok ? `Day 1 is now ${shortDate(value)}.` : res.message);
    await queryClient.invalidateQueries();
  }

  return (
    <form
      className="bg-surface flex flex-col gap-2 rounded-md px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        setConfirm(true);
      }}
    >
      <ConfirmDialog
        open={confirm}
        title="Change the start date?"
        body={
          value === today
            ? "Day 1 becomes today for both of you, and today's solves count."
            : `Day 1 moves to ${shortDate(value)} for both of you.`
        }
        confirmLabel="Change it"
        onConfirm={save}
        onCancel={() => setConfirm(false)}
      />
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
          className="border-line bg-surface text-ink h-11 rounded-sm border-[1.5px] px-3"
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
      <Button
        type="button"
        variant="soft"
        className="self-start"
        onClick={() => {
          setValue(today);
          setConfirm(true);
        }}
      >
        Start today
      </Button>
      <p className="text-ink-2 text-sm" role="status">
        {message ??
          "You can change this until the challenge begins. Starting today counts what you've already solved today."}
      </p>
    </form>
  );
}
