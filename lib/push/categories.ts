import type { NotificationKind } from "@/lib/engine/types";

// Settings toggles (PRD 5.9, 5.17). Preferences are stored per kind in
// profiles.notif_prefs ({ "<kind>": false } to mute); the UI groups kinds
// into a few categories people actually think in.

export const NOTIFICATION_CATEGORIES: {
  key: string;
  label: string;
  hint: string;
  kinds: NotificationKind[];
}[] = [
  {
    key: "reminders",
    label: "Daily reminders",
    hint: "Evening, late-night and grace-hour nudges while today is open",
    kinds: ["reminder_evening", "reminder_late", "reminder_grace"],
  },
  {
    key: "partner",
    label: "Your partner's progress",
    hint: "When your partner finishes their day, and their nudges",
    kinds: ["partner_done", "nudge"],
  },
  {
    key: "restores",
    label: "Streaks and restores",
    hint: "Frosted streaks, restore requests and answers",
    kinds: [
      "streak_on_ice",
      "streak_broken",
      "restore_requested",
      "restore_ask",
      "restore_closing",
      "restore_answered",
    ],
  },
  {
    key: "gifts",
    label: "Milestones and gifts",
    hint: "Milestones reached, gifts owed, opened and received",
    kinds: ["milestone_reached", "gift_owed", "gift_revealed", "gift_received"],
  },
  {
    key: "progress",
    label: "Levels, badges and goals",
    hint: "Level ups, new badges and target changes",
    kinds: ["level_up", "badge_earned", "target_changed"],
  },
  {
    key: "sync",
    label: "Sync problems",
    hint: "When Bloom can't reach LeetCode for a while",
    kinds: ["sync_failing"],
  },
];

export const ALL_KINDS: NotificationKind[] = NOTIFICATION_CATEGORIES.flatMap(
  (c) => c.kinds,
);

/** A category is on unless every kind in it is muted. */
export const categoryEnabled = (
  prefs: Record<string, unknown>,
  kinds: NotificationKind[],
) => kinds.some((k) => prefs[k] !== false);
