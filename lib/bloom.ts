// Flower growth stages (design §7): the current streak picks the stage, and
// the day within the stage picks a visible micro-step.

export type BloomStage =
  | "seed"
  | "sprout"
  | "bud"
  | "bloom"
  | "bouquet"
  | "bush"
  | "garden";

const STAGES: { stage: BloomStage; from: number; label: string }[] = [
  { stage: "seed", from: 0, label: "Seed" },
  { stage: "sprout", from: 1, label: "Sprout" },
  { stage: "bud", from: 7, label: "Bud" },
  { stage: "bloom", from: 15, label: "Bloom" },
  { stage: "bouquet", from: 30, label: "Bouquet" },
  { stage: "bush", from: 50, label: "Blossom bush" },
  { stage: "garden", from: 100, label: "Garden" },
];

export interface Growth {
  stage: BloomStage;
  /** Days into this stage, from 0. */
  step: number;
  label: string;
}

export function growthFor(streak: number): Growth {
  const s = Math.max(0, Math.floor(streak));
  let found = STAGES[0];
  for (const st of STAGES) if (s >= st.from) found = st;
  return { stage: found.stage, step: s - found.from, label: found.label };
}

/** "Riya's flower, bud stage, 9-day streak, done today" (design §15). */
export function bloomLabel(input: {
  name: string;
  streak: number;
  state?: "done" | "pending" | "frozen";
}): string {
  const { label } = growthFor(input.streak);
  const state =
    input.state === "done"
      ? ", done today"
      : input.state === "frozen"
        ? ", on ice"
        : "";
  return `${input.name}’s flower, ${label.toLowerCase()} stage, ${input.streak}-day streak${state}`;
}
