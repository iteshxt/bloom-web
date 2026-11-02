"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { COLOR_NAMES, COMPANION_INFO } from "@/lib/companions";
import { createClient } from "@/lib/supabase/browser";
import { addDays, todayIST } from "@/lib/time";
import {
  COMPANIONS,
  MAX_START_DAYS_AHEAD,
  PLAYER_COLORS,
  type Companion,
  type PlayerColor,
} from "@/lib/validation/onboarding";

// design.md §11.2, functional pass: name → companion and colour → LeetCode →
// pair up. Install and notification prompts arrive with push (build step 7)
// and the PWA (step 8); the illustrated version comes with the design pass.

type Step = "loading" | "name" | "companion" | "leetcode" | "pair" | "invite";
const STEPS: Step[] = ["name", "companion", "leetcode", "pair"];

type LcCheck =
  | { state: "idle" | "checking" | "missing" | "unavailable" }
  | { state: "found"; username: string; avatar: string | null; solved: number };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [name, setName] = useState("");
  const [companion, setCompanion] = useState<Companion>("mochi");
  const [color, setColor] = useState<PlayerColor>("blush");
  const [lcName, setLcName] = useState("");
  const [lc, setLc] = useState<LcCheck>({ state: "idle" });
  const [mode, setMode] = useState<"create" | "join">("create");
  // "Today" is read in the browser after load, never during prerender.
  const [today, setToday] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [colorClash, setColorClash] = useState(false);
  const [invite, setInvite] = useState<{
    code: string;
    startDate: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Resume where this player left off.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getClaims();
      const now = todayIST(new Date());
      setToday(now);
      setStartDate(addDays(now, 1)); // default: tomorrow
      const userId = data?.claims?.sub;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_key, color, pair_id, leetcode_username")
        .eq("id", userId)
        .maybeSingle();
      if (!profile) return setStep("name");
      setName(profile.display_name);
      setCompanion(profile.avatar_key as Companion);
      setColor(profile.color as PlayerColor);
      setStep(profile.leetcode_username ? "pair" : "leetcode");
    })();
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const saveProfile = () =>
    api("/api/onboarding/profile", {
      body: { displayName: name, avatarKey: companion, color },
    });

  function onLcChange(value: string) {
    setLcName(value);
    setLc({ state: value.trim() ? "checking" : "idle" });
    clearTimeout(checkTimer.current);
    if (!value.trim()) return;
    checkTimer.current = setTimeout(async () => {
      const res = await api<{
        exists: boolean;
        username?: string;
        avatar?: string | null;
        solved?: number;
      }>(`/api/leetcode/validate?username=${encodeURIComponent(value.trim())}`);
      if (!res.ok)
        return setLc({
          state: res.code === "invalid_input" ? "missing" : "unavailable",
        });
      setLc(
        res.data.exists
          ? {
              state: "found",
              username: res.data.username!,
              avatar: res.data.avatar ?? null,
              solved: res.data.solved ?? 0,
            }
          : { state: "missing" },
      );
    }, 500);
  }

  if (step === "loading") {
    return (
      <Shell step={step}>
        <p className="text-ink-2">Loading…</p>
      </Shell>
    );
  }

  if (step === "name") {
    return (
      <Shell step={step} title="What should your partner call you?">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) setStep("companion");
          }}
        >
          <TextField
            id="name"
            label="Your name"
            value={name}
            maxLength={30}
            autoComplete="given-name"
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="submit"
            disabled={!name.trim()}
            data-player-color={color}
          >
            Next
          </Button>
        </form>
      </Shell>
    );
  }

  if (step === "companion") {
    return (
      <Shell step={step} title="Pick a companion and your colour">
        <div className="flex flex-col gap-6" data-player-color={color}>
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="mb-2 text-sm font-semibold">Companion</legend>
            {COMPANIONS.map((c) => (
              <label
                key={c}
                className={`bg-surface flex min-h-11 cursor-pointer flex-col rounded-md border-[1.5px] px-4 py-3 ${companion === c ? "border-p ring-p-soft ring-4" : "border-line"}`}
              >
                <input
                  type="radio"
                  name="companion"
                  value={c}
                  checked={companion === c}
                  onChange={() => setCompanion(c)}
                  className="sr-only"
                />
                <span className="font-display text-lg font-semibold">
                  {COMPANION_INFO[c].name}
                </span>
                <span className="text-ink-2 text-sm">
                  {COMPANION_INFO[c].blurb}
                </span>
              </label>
            ))}
          </fieldset>
          <ColorPicker value={color} onChange={setColor} />
          {error && <ErrorText>{error}</ErrorText>}
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const res = await saveProfile();
                if (!res.ok) return setError(res.message);
                setStep("leetcode");
              })
            }
          >
            {busy ? "Saving…" : "Next"}
          </Button>
          <Button variant="ghost" onClick={() => setStep("name")}>
            Back
          </Button>
        </div>
      </Shell>
    );
  }

  if (step === "leetcode") {
    return (
      <Shell step={step} title="Link your LeetCode">
        <form
          className="flex flex-col gap-6"
          data-player-color={color}
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const res = await api("/api/leetcode/link", {
                body: { username: lcName },
              });
              if (!res.ok) return setError(res.message);
              setStep("pair");
            });
          }}
        >
          <TextField
            id="leetcode"
            label="LeetCode username"
            value={lcName}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            onChange={(e) => onLcChange(e.target.value)}
            hint={lcHint(lc)}
          />
          {lc.state === "found" && (
            <div className="bg-mint-soft text-mint-deep flex items-center gap-3 rounded-md px-4 py-3">
              {lc.avatar && (
                // eslint-disable-next-line @next/next/no-img-element -- remote LeetCode avatar
                <img
                  src={lc.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-pill"
                />
              )}
              <span className="text-sm font-semibold">
                {lc.username} · {lc.solved} solved
              </span>
            </div>
          )}
          <p className="text-ink-2 text-sm">
            Bloom reads your public accepted submissions. Keep your LeetCode
            profile public.
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" disabled={busy || lc.state !== "found"}>
            {busy ? "Linking…" : "Link LeetCode"}
          </Button>
        </form>
      </Shell>
    );
  }

  if (step === "pair") {
    return (
      <Shell step={step} title="Pair up">
        <div className="flex flex-col gap-6" data-player-color={color}>
          <div
            role="tablist"
            className="rounded-pill bg-surface shadow-soft grid grid-cols-2 gap-1 p-1"
          >
            {(["create", "join"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-pill h-11 font-semibold ${mode === m ? "bg-p text-p-deep" : "text-ink-2"}`}
              >
                {m === "create" ? "Create a pair" : "Join with a code"}
              </button>
            ))}
          </div>

          {mode === "create" ? (
            <form
              className="flex flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const res = await api<{
                    pair: { inviteCode: string; startDate: string };
                  }>("/api/pair/create", { body: { startDate } });
                  if (!res.ok) return setError(res.message);
                  setInvite({
                    code: res.data.pair.inviteCode,
                    startDate: res.data.pair.startDate,
                  });
                  setStep("invite");
                });
              }}
            >
              <TextField
                id="start"
                label="Start date"
                type="date"
                value={startDate}
                min={today ?? undefined}
                max={today ? addDays(today, MAX_START_DAYS_AHEAD) : undefined}
                onChange={(e) => setStartDate(e.target.value)}
                hint="Day 1 of the challenge. Solves before it count as pre-season."
              />
              {error && <ErrorText>{error}</ErrorText>}
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create pair"}
              </Button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  if (colorClash) {
                    const saved = await saveProfile();
                    if (!saved.ok) return setError(saved.message);
                  }
                  const res = await api("/api/pair/join", {
                    body: { code: joinCode },
                  });
                  if (!res.ok) {
                    setColorClash(res.code === "color_taken");
                    return setError(res.message);
                  }
                  router.push("/");
                });
              }}
            >
              <TextField
                id="code"
                label="Invite code"
                value={joinCode}
                maxLength={7}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                hint="The 6-character code your partner shared."
              />
              {colorClash && <ColorPicker value={color} onChange={setColor} />}
              {error && <ErrorText>{error}</ErrorText>}
              <Button
                type="submit"
                disabled={busy || joinCode.trim().length < 6}
              >
                {busy
                  ? "Joining…"
                  : colorClash
                    ? "Change colour and join"
                    : "Join pair"}
              </Button>
            </form>
          )}
        </div>
      </Shell>
    );
  }

  // step === "invite"
  return (
    <Shell step={step} title="Share your code">
      <div className="flex flex-col gap-6" data-player-color={color}>
        <p className="text-ink-2">
          Send this code to your partner so they can join.
        </p>
        <p
          aria-label={`Invite code ${invite?.code.split("").join(" ")}`}
          className="bg-surface font-display shadow-soft rounded-lg py-6 text-center text-[40px] leading-none font-extrabold tracking-[0.12em]"
        >
          {invite?.code}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              invite && navigator.clipboard?.writeText(invite.code)
            }
          >
            Copy code
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              invite &&
              navigator.share?.({
                title: "Join me on Bloom",
                text: `Join my Bloom with code ${invite.code}`,
              })
            }
          >
            Share
          </Button>
        </div>
        <p className="text-ink-2 text-sm">
          Your challenge starts on {invite?.startDate}.
        </p>
        <Button onClick={() => router.push("/")}>Continue</Button>
      </div>
    </Shell>
  );
}

function Shell({
  step,
  title,
  children,
}: {
  step: Step;
  title?: string;
  children: React.ReactNode;
}) {
  const index = step === "invite" ? STEPS.length : STEPS.indexOf(step);
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-8 px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
      <ol aria-label="Setup progress" className="flex gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === index ? "step" : undefined}
            className={`rounded-pill h-2 flex-1 ${i <= index ? "bg-mint" : "bg-line"}`}
          />
        ))}
      </ol>
      {title && (
        <h1 className="font-display text-[28px] leading-[1.15] font-extrabold">
          {title}
        </h1>
      )}
      {children}
    </main>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: PlayerColor;
  onChange: (c: PlayerColor) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Your colour</legend>
      <div className="flex gap-3">
        {PLAYER_COLORS.map((c) => (
          <label key={c} data-player-color={c} className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value={c}
              checked={value === c}
              onChange={() => onChange(c)}
              className="peer sr-only"
            />
            <span className="rounded-pill bg-p-soft text-p-deep peer-checked:ring-p flex h-11 items-center gap-2 px-4 font-semibold peer-checked:ring-4 peer-focus-visible:outline-2">
              <span className="rounded-pill bg-p h-4 w-4" aria-hidden />
              {COLOR_NAMES[c]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-peach-deep text-sm font-semibold">
      {children}
    </p>
  );
}

function lcHint(lc: LcCheck): string | undefined {
  switch (lc.state) {
    case "checking":
      return "Checking…";
    case "missing":
      return "We couldn't find that LeetCode user.";
    case "unavailable":
      return "Can't reach LeetCode right now. Try again in a minute.";
    default:
      return undefined;
  }
}
