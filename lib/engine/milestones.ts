// Streak-length hooks: milestones, token refills, gifts (PRD 4.7–4.8,
// techspec §7.4).

import { MILESTONE_BADGES, badgesForStreak } from "./badges";
import { activity, addXp, awardBadge, notify, type Tx } from "./tx";
import { milestoneXp } from "./xp";
import type { DayKey, Run } from "./types";

export function onStreakLength(tx: Tx, run: Run, day: DayKey): void {
  tx.s.bestStreak = Math.max(tx.s.bestStreak, run.length);
  const milestone = run.length;

  if (tx.s.rules.milestones.includes(milestone)) {
    run.tokensRemaining = tx.s.rules.tokensPerRun; // refill, never above the max
    const firstTime = !tx.s.achievements.includes(milestone);

    tx.effects.push({
      kind: "milestone",
      milestone,
      firstTime,
      runId: run.id,
      day,
    });
    notify(tx, "both", "milestone_reached", `${run.id}:${milestone}`, {
      milestone,
      firstTime,
    });
    activity(tx, "milestone", { milestone, firstTime, day });

    // Earned once per player for life. A milestone reached on a restored day
    // is kept even if that restore is later undone by a failed make-up.
    if (firstTime) {
      tx.s.achievements.push(milestone);
      addXp(tx, milestoneXp(milestone), "milestone", String(milestone));
      if (MILESTONE_BADGES.includes(milestone))
        awardBadge(tx, `ms_${milestone}`);
      tx.effects.push({ kind: "gift_unlock", milestone });
    }
  }

  badgesForStreak(tx, run);
}
