import { at, wide } from "./stage";

// Milestone day: petals drift across the whole sky (design §6.3). Each
// petal is its own small layer, moved with CSS transforms.

const PETALS = [
  { x: 20, d: 11, delay: 0, c: "var(--blush)" },
  { x: 80, d: 14, delay: 3, c: "var(--butter)" },
  { x: 140, d: 12, delay: 6, c: "var(--sky)" },
  { x: 200, d: 13, delay: 1.5, c: "var(--blush)" },
  { x: 255, d: 10, delay: 5, c: "var(--lilac)" },
  { x: 310, d: 15, delay: 8, c: "var(--butter)" },
  { x: 350, d: 12, delay: 4, c: "var(--blush)" },
];

export function PetalDrift() {
  return (
    <div className="particle absolute inset-0">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="absolute block aspect-[9/5.2] -translate-1/2 animate-[petal-fall_12s_linear_infinite] rounded-[50%] opacity-85"
          style={{
            ...at(p.x, 0),
            width: wide(9),
            background: p.c,
            animationDuration: `${p.d}s`,
            animationDelay: `-${p.delay}s`,
            transform: `translate(0, ${40 + i * 30}px)`,
          }}
        />
      ))}
    </div>
  );
}
