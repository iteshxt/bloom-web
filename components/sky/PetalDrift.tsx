// Milestone day: petals drift across the whole sky (design §6.3).

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
    <g className="particle">
      {PETALS.map((p, i) => (
        <g key={i} transform={`translate(${p.x} 0)`}>
          <ellipse
            rx={4.5}
            ry={2.6}
            fill={p.c}
            opacity={0.85}
            className="animate-[petal-fall_12s_linear_infinite]"
            style={{
              animationDuration: `${p.d}s`,
              animationDelay: `-${p.delay}s`,
              transform: `translate(0, ${40 + i * 30}px)`,
            }}
          />
        </g>
      ))}
    </g>
  );
}
