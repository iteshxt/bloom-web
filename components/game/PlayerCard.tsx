import type { PlayerView } from "@/lib/dashboard/derive";

// design §10.5–10.6 and §10.12: streak, heart-coin tokens, next gift, XP bar.
// The companion and flower art arrive with the design pass.

export function PlayerCard({
  player,
  label,
}: {
  player: PlayerView;
  label: string;
}) {
  const xpPct =
    player.xpLevelSpan > 0
      ? Math.min(100, (player.xpIntoLevel / player.xpLevelSpan) * 100)
      : 0;
  return (
    <section
      data-player-color={player.color}
      aria-label={`${label}: ${player.name}`}
      className={`shadow-player flex flex-col gap-3 rounded-lg p-4 ${
        player.onIce ? "bg-frost-soft ring-frost ring-2" : "bg-p-soft"
      }`}
    >
      <p className="text-p-deep truncate text-sm font-semibold">
        {player.name}
      </p>
      <div>
        <p className="font-display text-[48px] leading-none font-extrabold tabular-nums">
          {player.streak}
        </p>
        <p
          className={`text-sm ${player.onIce ? "text-frost-deep font-semibold" : "text-ink-2"}`}
        >
          {player.onIce ? "On ice" : "day streak"}
        </p>
      </div>

      <div
        className="flex items-center gap-1.5"
        aria-label={`${player.tokens} of ${player.tokensMax} tokens left`}
      >
        {Array.from({ length: player.tokensMax }, (_, i) => (
          <span
            key={i}
            className={`rounded-pill h-4 w-4 ${
              i < player.tokens
                ? "bg-butter"
                : "border-ink-3 border-[1.5px] border-dashed"
            }`}
          />
        ))}
        <span className="text-ink-2 ml-1 text-[13px]">tokens</span>
      </div>

      {player.nextMilestone && (
        <p className="rounded-pill bg-surface text-p-deep self-start px-3 py-1 text-[13px] font-semibold">
          {player.nextMilestone.daysToGo === 1
            ? "Next gift tomorrow"
            : `Next gift in ${player.nextMilestone.daysToGo} days`}
        </p>
      )}

      <div className="flex items-center gap-2">
        <div
          className="rounded-pill bg-butter-soft h-2.5 flex-1 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={player.xpLevelSpan}
          aria-valuenow={player.xpIntoLevel}
          aria-label="XP to next level"
        >
          <div
            className="rounded-pill bg-butter h-full"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <span className="text-butter-deep text-[13px] font-semibold">
          Lv {player.level}
        </span>
      </div>
    </section>
  );
}
