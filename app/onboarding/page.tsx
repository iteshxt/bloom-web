"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bloom } from "@/components/bloom/Bloom";
import { Companion as Creature } from "@/components/companions/Companion";
import {
  ColorDots,
  CompanionPicker,
} from "@/components/companions/CompanionPicker";
import { LineIcon } from "@/components/icons/line";
import { PuffyIcon } from "@/components/icons/puffy";
import { RemindersPrompt } from "@/components/push/RemindersPrompt";
import { InstallCard } from "@/components/pwa/InstallCard";
import { ScreenSky } from "@/components/sky/ScreenSky";
import { Button } from "@/components/ui/Button";
import { Ground } from "@/components/ui/Ground";
import { CodeSeeds } from "@/components/ui/CodeSeeds";
import { PetalSpinner, Skeleton } from "@/components/ui/Progress";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { shortDate } from "@/lib/format/ist";
import { createClient } from "@/lib/supabase/browser";
import { addDays, todayIST } from "@/lib/time";
import { toast } from "@/lib/toast";
import {
  MAX_START_DAYS_AHEAD,
  type Companion,
  type PlayerColor,
} from "@/lib/validation/onboarding";

// Onboarding (design §11.2): name → companion and colour → LeetCode → pair
// up → install and reminders, on one calm panel under a little sky, with
// five sprouts at the top that grow as you go.

type Step =
  "loading" | "name" | "companion" | "leetcode" | "pair" | "invite" | "install";
const STEPS: Step[] = ["name", "companion", "leetcode", "pair", "install"];

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
  const [paired, setPaired] = useState(false);
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
      setStartDate(now); // default: today, so the pair can begin at once
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
      // Already paired and linked: nothing left to set up.
      if (profile.pair_id && profile.leetcode_username)
        return router.replace("/");
      setPaired(Boolean(profile.pair_id));
      setStep(profile.leetcode_username ? "pair" : "leetcode");
    })();
  }, [router]);

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
      <Shell step={step} color={color} kind={companion}>
        <Skeleton className="h-[52px]" />
        <Skeleton className="rounded-pill h-[52px]" />
      </Shell>
    );
  }

  if (step === "name") {
    return (
      <Shell
        step={step}
        color={color}
        kind={companion}
        title="What should your partner call you?"
      >
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
      <Shell
        step={step}
        color={color}
        kind={companion}
        title="Pick a companion and your colour"
      >
        <div className="flex flex-col gap-6" data-player-color={color}>
          <CompanionPicker
            kind={companion}
            color={color}
            onKind={setCompanion}
            onColor={setColor}
          />
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
      <Shell
        step={step}
        color={color}
        kind={companion}
        title="Link your LeetCode"
      >
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
              // Someone who paired before linking LeetCode is done here.
              if (paired) return router.push("/");
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
            hint={
              lc.state === "checking" ? (
                <span className="text-p-ink inline-flex items-center gap-1.5">
                  <PetalSpinner size={16} /> Checking…
                </span>
              ) : (
                lcHint(lc)
              )
            }
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
              <span className="flex-1 text-sm font-semibold">
                {lc.username} · {lc.solved} solved
              </span>
              <PuffyIcon name="check" size={32} />
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
      <Shell step={step} color={color} kind={companion} title="Pair up">
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
                  // A repeated submit: the pair exists and home shows its code.
                  if (!res.ok && res.code === "already_paired")
                    return router.push("/");
                  if (!res.ok) return setError(res.message);
                  setInvite({
                    code: res.data.pair.inviteCode,
                    startDate: res.data.pair.startDate,
                  });
                  setStep("invite");
                });
              }}
            >
              {today && (
                <div
                  className="flex gap-2"
                  role="group"
                  aria-label="Quick start"
                >
                  {(
                    [
                      ["Today", today],
                      ["Tomorrow", addDays(today, 1)],
                    ] as const
                  ).map(([label, day]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={startDate === day}
                      onClick={() => setStartDate(day)}
                      className={`rounded-pill h-11 px-4 text-sm font-semibold ${
                        startDate === day
                          ? "bg-p text-p-deep shadow-player"
                          : "bg-surface text-ink-2 shadow-soft"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <TextField
                id="start"
                label="Start date"
                type="date"
                value={startDate}
                min={today ?? undefined}
                max={today ? addDays(today, MAX_START_DAYS_AHEAD) : undefined}
                onChange={(e) => setStartDate(e.target.value)}
                hint={
                  startDate === today
                    ? "Starting today: anything you've already solved today counts."
                    : "Day 1 of the challenge. Solves before it count as pre-season."
                }
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
                  if (!res.ok && res.code === "already_paired")
                    return router.push("/");
                  if (!res.ok) {
                    setColorClash(res.code === "color_taken");
                    return setError(res.message);
                  }
                  toast("You’re paired up", "heart");
                  setStep("install");
                });
              }}
            >
              <CodeSeeds
                id="code"
                label="The 6-character code your partner shared"
                value={joinCode}
                onChange={setJoinCode}
              />
              {colorClash && <ColorDots value={color} onChange={setColor} />}
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

  if (step === "invite") {
    return (
      <Shell step={step} color={color} kind={companion} title="Share your code">
        <div className="flex flex-col gap-6" data-player-color={color}>
          <p className="text-ink-2">
            Send this code to your partner so they can join.
          </p>
          <p
            aria-label={`Invite code ${invite?.code.split("").join(" ")}`}
            className="bg-surface font-display shadow-player rounded-xl py-7 text-center text-[48px] leading-none font-extrabold tracking-[0.14em]"
          >
            {invite?.code}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={async () => {
                if (!invite) return;
                await navigator.clipboard?.writeText(invite.code);
                toast("Code copied", "check");
              }}
            >
              <LineIcon name="copy" size={20} /> Copy code
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
              <LineIcon name="share" size={20} /> Share
            </Button>
          </div>
          <p className="text-ink-2 text-sm">
            Day 1 is {invite ? shortDate(invite.startDate) : ""}.
          </p>
          <Button onClick={() => setStep("install")}>Continue</Button>
        </div>
      </Shell>
    );
  }

  // step === "install"
  return (
    <Shell step={step} color={color} kind={companion} title="Keep Bloom close">
      <div className="flex flex-col gap-6" data-player-color={color}>
        <InstallCard />
        <div className="glass flex items-center gap-3 rounded-md p-3">
          <PuffyIcon name="bloom" size={40} />
          <div className="flex-1">
            <p className="text-sm font-semibold">Your flower’s thirsty</p>
            <p className="text-ink-2 text-sm">
              3 hours left today. 0 of 1 done 🌱
            </p>
          </div>
        </div>
        <RemindersPrompt />
        <Button onClick={() => router.push("/")}>Go to my garden</Button>
      </div>
    </Shell>
  );
}

function Shell({
  step,
  color,
  kind,
  title,
  children,
}: {
  step: Step;
  color: PlayerColor;
  kind: Companion;
  title?: string;
  children: React.ReactNode;
}) {
  const index = step === "invite" ? STEPS.indexOf("pair") : STEPS.indexOf(step);
  return (
    <main
      data-player-color={color}
      className="mx-auto flex w-full flex-1 flex-col md:max-w-[430px]"
    >
      <ScreenSky className="pb-12">
        <div className="flex items-end justify-between px-4 pt-6">
          <ol aria-label="Setup progress" className="flex items-end gap-1">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-label={`Step ${i + 1}${i < index ? ", done" : i === index ? ", current" : ""}`}
                aria-current={i === index ? "step" : undefined}
              >
                <Bloom
                  streak={i < index ? 6 : i === index ? 2 : 0}
                  size={i === index ? 44 : 36}
                />
              </li>
            ))}
          </ol>
          <Creature kind={kind} mood="wave" size={72} color={color} />
        </div>
      </ScreenSky>
      <div className="flex flex-1 flex-col gap-6 px-4 pt-2 pb-10">
        {title && (
          <h1 className="font-display text-[28px] leading-[1.15] font-extrabold">
            {title}
          </h1>
        )}
        {children}
      </div>
      <Ground />
    </main>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-peach-ink text-sm font-semibold">
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
