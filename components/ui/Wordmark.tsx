// The wordmark (design §2.1): lowercase "bloom" in Baloo 2 ExtraBold, the
// two o's drawn as overlapping Blush and Sky circles that blend to lilac.

export function Wordmark({
  height = 48,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  // Letters are measured against a 48 px cap height; the o's sit on the
  // x-height between "bl" and "m".
  return (
    <span
      role="img"
      aria-label="bloom"
      className={`font-display text-ink inline-flex items-baseline leading-none font-extrabold tracking-[-0.02em] ${className}`}
      style={{ fontSize: height }}
    >
      <span aria-hidden>bl</span>
      <svg
        aria-hidden
        viewBox="0 0 100 56"
        style={{ height: height * 0.56, width: height * 1.0 }}
        className="mx-[0.02em] self-baseline"
      >
        <circle cx={28} cy={28} r={25} fill="var(--blush)" />
        <circle cx={72} cy={28} r={25} fill="var(--sky)" />
        <path
          d="M50 16.13A25 25 0 0 1 50 39.87A25 25 0 0 1 50 16.13Z"
          fill="var(--overlap)"
        />
        <circle cx={20} cy={18} r={5} fill="var(--white)" opacity={0.5} />
        <circle cx={64} cy={18} r={5} fill="var(--white)" opacity={0.5} />
      </svg>
      <span aria-hidden>m</span>
    </span>
  );
}
