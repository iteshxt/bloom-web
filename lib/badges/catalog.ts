// Badge names and copy (PRD 4.10). `condition` is the locked-badge text in
// the badge cabinet; `cheer` is the push body when it's earned (design §14.2:
// at most one emoji, at the end).

export interface BadgeInfo {
  name: string;
  condition: string;
  cheer: string;
}

export const BADGES: Record<string, BadgeInfo> = {
  first_blood: {
    name: "First Blood",
    condition: "Count your first solve",
    cheer: "Your first solve counted 🌱",
  },
  hat_trick: {
    name: "Hat Trick",
    condition: "Solve 3 problems in one day",
    cheer: "Three in a day 🎩",
  },
  hard_hitter: {
    name: "Hard Hitter",
    condition: "Solve your first Hard",
    cheer: "Your first Hard is down 💪",
  },
  hard_mode: {
    name: "Hard Mode",
    condition: "Solve 10 Hards",
    cheer: "Ten different Hards solved 🔥",
  },
  night_owl: {
    name: "Night Owl",
    condition: "Save a day in the grace hour",
    cheer: "Saved a day in the grace hour 🦉",
  },
  early_bird: {
    name: "Early Bird",
    condition: "Solve before 8 am",
    cheer: "Solved before 8 am 🐦",
  },
  perfect_week: {
    name: "Perfect Week",
    condition: "Reach a 7-day streak",
    cheer: "Seven days in a row 🌸",
  },
  iron_will: {
    name: "Iron Will",
    condition: "Reach 30 days without a restore",
    cheer: "Thirty days, no restores 🛡️",
  },
  comeback: {
    name: "Comeback Kid",
    condition: "Finish a make-up day",
    cheer: "Make-up paid, bloom kept 💖",
  },
  big_heart: {
    name: "Big Heart",
    condition: "Approve 3 of your partner's restores",
    cheer: "Three restores given 💝",
  },
  explorer: {
    name: "Explorer",
    condition: "Solve across 10 topics",
    cheer: "Ten topics explored 🧭",
  },
  century: {
    name: "Century",
    condition: "Solve 100 different problems",
    cheer: "A hundred problems solved 💯",
  },
  ms_15: {
    name: "15 Days",
    condition: "Reach a 15-day streak",
    cheer: "Your first bloom 🌸",
  },
  ms_30: {
    name: "30 Days",
    condition: "Reach a 30-day streak",
    cheer: "A whole bouquet 💐",
  },
  ms_50: {
    name: "50 Days",
    condition: "Reach a 50-day streak",
    cheer: "Your blossom bush is in full bloom 🌳",
  },
  ms_100: {
    name: "100 Days",
    condition: "Reach a 100-day streak",
    cheer: "A hundred days. A whole garden 🌷",
  },
};

export const badgeInfo = (key: string): BadgeInfo =>
  BADGES[key] ?? {
    name: key.replace(/_/g, " "),
    condition: "",
    cheer: "Keep growing 🌸",
  };
