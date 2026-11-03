"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect, useRef } from "react";
import { Bloom } from "@/components/bloom/Bloom";
import { Companion, type Mood } from "@/components/companions/Companion";
import { sparklePath } from "@/components/icons/geometry";
import { PuffyIcon } from "@/components/icons/puffy";
import { RollingNumber } from "@/components/moments/MomentOverlay";
import { ProgressBar } from "@/components/ui/Progress";
import { growthFor } from "@/lib/bloom";
import type { PlayerView } from "@/lib/dashboard/derive";
import type { Companion as Kind } from "@/lib/validation/onboarding";
import { TokenPouch } from "./TokenPouch";

// design §10.5–10.6 and §10.12: companion and flower stage, streak, heart-coin
// tokens, the next gift and the XP bar. On ice the card frosts over, with
// crystals in two corners and a slow frost glow.

export function PlayerCard({
  player,
  kind,
  mood,
  label,
}: {
  player: PlayerView;
  kind: Kind;
  mood: Mood;
  label: string;
}) {
  const stage = growthFor(player.streak).label;
  const nudge = useNudge(
    `${player.streak}:${player.focus?.solved ?? 0}:${player.onIce}`,
  );
  return (
    <motion.section
      animate={nudge}
      data-player-color={player.color}
      aria-label={`${label}: ${player.name}, ${player.streak}-day streak${player.onIce ? ", on ice" : ""}`}
      className={`shadow-player relative flex h-full flex-col gap-2.5 overflow-hidden rounded-lg p-4 ${
        player.onIce
          ? "bg-frost-soft shadow-glow-frost animate-pulse-soft [animation-duration:4s]"
          : "bg-p-wash"
      }`}
    >
      {player.onIce && <FrostCorners />}
      <div className="flex items-start justify-between gap-1">
        <Companion
          kind={kind}
          mood={mood}
          size={64}
          streak={player.streak}
          className="-mt-2 -ml-2"
        />
        <div className="flex flex-col items-end">
          <Bloom streak={player.streak} size={40} frozen={player.onIce} />
          <span className="text-p-ink text-xs font-semibold">{stage}</span>
        </div>
      </div>
      <p className="text-p-ink -mt-1 truncate text-sm font-semibold">
        {player.name}
      </p>
      <div>
        <p className="font-display text-[48px] leading-none font-extrabold">
          <RollingNumber value={player.streak} />
        </p>
        <p
          className={`text-sm ${player.onIce ? "text-frost-ink font-semibold" : "text-ink-2"}`}
        >
          {player.onIce ? "On ice" : "day streak"}
        </p>
      </div>

      <TokenPouch
        tokens={player.tokens}
        max={player.tokensMax}
        label="tokens"
      />

      {player.nextMilestone && (
        <p className="rounded-pill bg-surface text-p-ink inline-flex items-center gap-1 self-start py-0.5 pr-3 pl-1 text-[13px] font-semibold">
          <PuffyIcon name="gift" size={22} />
          {player.nextMilestone.daysToGo === 1
            ? "Gift tomorrow"
            : `in ${player.nextMilestone.daysToGo} days`}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2">
        <ProgressBar
          value={player.xpIntoLevel}
          max={player.xpLevelSpan}
          tone="butter"
          label="XP to next level"
          className="flex-1"
        />
        <span className="text-butter-ink tabular text-[13px] font-semibold">
          Lv {player.level}
        </span>
      </div>
    </motion.section>
  );
}

/** design §12.3: a realtime update makes the card nudge (x ±3, bouncy).
 *  Not on first render. */
function useNudge(signature: string) {
  const controls = useAnimationControls();
  const first = useRef(signature);
  useEffect(() => {
    if (first.current === signature) return;
    first.current = signature;
    controls.start({
      x: [0, 3, -3, 2, 0],
      transition: { duration: 0.4, ease: "easeOut" },
    });
  }, [signature, controls]);
  return controls;
}

function FrostCorners() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <path d="M0 0H26L0 22Z" fill="var(--white)" opacity={0.7} />
      <path d="M100 100H72L100 76Z" fill="var(--white)" opacity={0.7} />
      <path d={sparklePath(8, 7, 4)} fill="var(--frost-deep)" opacity={0.35} />
      <path
        d={sparklePath(92, 92, 4)}
        fill="var(--frost-deep)"
        opacity={0.35}
      />
    </svg>
  );
}
