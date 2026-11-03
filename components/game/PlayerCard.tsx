import { Bloom } from "@/components/bloom/Bloom";
import { Companion } from "@/components/companions/Companion";
import { sparklePath } from "@/components/icons/geometry";
import { PuffyIcon } from "@/components/icons/puffy";
import { RollingNumber } from "@/components/moments/MomentOverlay";
import { ProgressBar } from "@/components/ui/Progress";
import { growthFor } from "@/lib/bloom";
import type { CompanionMood, PlayerView } from "@/lib/dashboard/derive";
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
  mood: CompanionMood;
  label: string;
}) {
  const stage = growthFor(player.streak).label;
  return (
    <section
      data-player-color={player.color}
      aria-label={`${label}: ${player.name}, ${player.streak}-day streak${player.onIce ? ", on ice" : ""}`}
      className={`shadow-player relative flex h-full flex-col gap-2.5 overflow-hidden rounded-lg p-4 ${
        player.onIce
          ? "bg-frost-soft shadow-glow-frost animate-pulse-soft [animation-duration:4s]"
          : "bg-p-soft"
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
          <span className="text-p-deep text-xs font-semibold">{stage}</span>
        </div>
      </div>
      <p className="text-p-deep -mt-1 truncate text-sm font-semibold">
        {player.name}
      </p>
      <div>
        <p className="font-display text-[48px] leading-none font-extrabold">
          <RollingNumber value={player.streak} />
        </p>
        <p
          className={`text-sm ${player.onIce ? "text-frost-deep font-semibold" : "text-ink-2"}`}
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
        <p className="rounded-pill bg-surface text-p-deep inline-flex items-center gap-1 self-start py-0.5 pr-3 pl-1 text-[13px] font-semibold">
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
        <span className="text-butter-deep tabular text-[13px] font-semibold">
          Lv {player.level}
        </span>
      </div>
    </section>
  );
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
