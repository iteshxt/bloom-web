// Push notification copy (design §14.2, PRD §7). Pure: the notify service
// passes the kind, its data, who's receiving it and the other player's name.
// Copy uses display names, never pronouns, and at most one emoji, at the end.

import { badgeInfo } from "@/lib/badges/catalog";
import type { NotificationKind } from "@/lib/engine/types";
import { addDays, istMidnight, todayIST } from "@/lib/time";

export interface PushCopy {
  title: string;
  body: string;
  /** Where tapping the notification opens. */
  url: string;
  /** Same tag replaces an earlier notification of that kind. */
  tag: string;
}

export interface CopyInput {
  kind: NotificationKind | string;
  data: Record<string, unknown>;
  /** Did the receiving player cause this event (their own streak, solve…)? */
  recipientIsActor: boolean;
  /** The other player in the pair, from the receiver's point of view. */
  otherName: string;
  recipientId: string;
  now: Date;
}

const LEVEL_TITLES = [
  "Seedling",
  "Sprout",
  "Leafling",
  "Budding",
  "Petal Pro",
  "Blossom",
  "Bloomer",
  "Garden Keeper",
  "Grove Guardian",
];
export const levelTitle = (level: number): string =>
  LEVEL_TITLES[level - 1] ?? "Evergreen";

/** design §7: the flower stage a milestone opens. */
const STAGE: Record<number, string> = {
  15: "bloom",
  30: "bouquet",
  50: "blossom bush",
  100: "garden",
};

const num = (v: unknown, fallback = 0) =>
  typeof v === "number" ? v : fallback;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function notificationCopy(input: CopyInput): PushCopy {
  const { data, otherName: other, kind } = input;
  const tag = String(kind);
  const home = (title: string, body: string): PushCopy => ({
    title,
    body,
    url: "/",
    tag,
  });

  switch (kind) {
    case "reminder_evening": {
      const midnight = istMidnight(addDays(todayIST(input.now), 1));
      const hours = Math.max(
        1,
        Math.round((midnight.getTime() - input.now.getTime()) / 3_600_000),
      );
      return home(
        "Your flower's thirsty",
        `${hours} ${hours === 1 ? "hour" : "hours"} left today. ${num(data.solved)} of ${num(data.required, 1)} done 🌱`,
      );
    }
    case "reminder_late":
      return home(
        "One hour to midnight",
        "Then there's a grace hour, but why wait?",
      );
    case "reminder_grace":
      return home(
        "Grace hour",
        `${num(data.minutesLeft, 45)} minutes to save yesterday's bloom ⏳`,
      );
    case "partner_done":
      return home(`${other} bloomed today`, "Your move 👀");
    case "streak_on_ice":
      return {
        title: "Your flower is frosted",
        body: `Ask ${other} for a restore before 1 am tomorrow ❄️`,
        url: "/restores",
        tag,
      };
    case "restore_ask":
      return {
        title: "Your flower is still frosted",
        body: `Ask ${other} for a restore before 1 am ❄️`,
        url: "/restores",
        tag,
      };
    case "streak_broken": {
      const length = num(data.length);
      return input.recipientIsActor
        ? home(
            "A new seed is planted",
            `Your ${length}-day streak ended. Day 1 starts now 🌱`,
          )
        : home(
            `${other}'s streak ended`,
            `${length} days, then a new seed. Cheer them on 🌱`,
          );
    }
    case "restore_requested": {
      const message = str(data.message);
      return {
        title: `${other} needs a little sunshine`,
        body: message ? `"${message}" · Tap to decide` : "Tap to decide",
        url: "/restores",
        tag,
      };
    }
    case "restore_closing":
      return {
        title: `${other}'s request closes soon`,
        body: "2 hours left to decide",
        url: "/restores",
        tag,
      };
    case "restore_answered": {
      if (data.approved === true) {
        const makeup = num(data.makeup);
        return {
          title: `${other} thawed your flower 💖`,
          body:
            makeup > 0
              ? `Finish today plus ${makeup} make-up to keep it`
              : "Your streak is back. Keep it growing",
          url: "/",
          tag,
        };
      }
      return home(
        `${other} said not this time`,
        "A new seed is planted. You've got this 🌱",
      );
    }
    case "target_changed":
      return {
        title: "New daily goal",
        body: `${other} set your target to ${num(data.target, 1)}, starting tomorrow`,
        url: `/player/${input.recipientId}`,
        tag,
      };
    case "milestone_reached": {
      const m = num(data.milestone);
      const firstTime = data.firstTime === true;
      if (input.recipientIsActor) {
        const stage = STAGE[m] ?? "garden";
        return {
          title: `${m} days!`,
          body: firstTime
            ? `Your ${stage} bloomed. ${other}'s gift is unlocked 🎁`
            : `Your ${stage} bloomed again 🌸`,
          url: firstTime ? "/gifts" : "/milestones",
          tag,
        };
      }
      return {
        title: `${other} hit ${m} days!`,
        body: firstTime
          ? `Your gift for ${other} is unlocked. Is it ready? 👀`
          : "Send them some love 💖",
        url: firstTime ? "/gifts" : "/milestones",
        tag,
      };
    }
    case "gift_owed":
      return {
        title: "You owe a gift",
        body: `${other} reached ${num(data.milestone)} days. Wrap something special 🎁`,
        url: "/gifts",
        tag,
      };
    case "gift_revealed":
      return {
        title: `${other} opened your gift`,
        body: `Your ${num(data.milestone)}-day surprise is out 💝`,
        url: "/gifts",
        tag,
      };
    case "gift_received":
      return {
        title: "Gift delivered",
        body: `${other} marked your gift as received 💝`,
        url: "/gifts",
        tag,
      };
    case "level_up": {
      const level = num(data.level, 2);
      return home(`Level ${level}: ${levelTitle(level)}`, "Keep growing 🌸");
    }
    case "badge_earned": {
      const badge = badgeInfo(str(data.badge));
      return home(`New badge: ${badge.name}`, badge.cheer);
    }
    case "sync_failing":
      return home(
        "Can't reach LeetCode",
        "We'll keep trying. Your solves will catch up",
      );
    case "nudge":
      return home(
        `${other} nudged you`,
        str(data.message) || "Go do your LeetCode 😤",
      );
    default:
      return home("Bloom", "Something new in your garden 🌸");
  }
}
