// The grace hour's slow aurora ribbon, frost to blush (design §6.1). The
// blurred ribbon is drawn once; its HTML layer sways on the compositor.

export function Aurora({ u }: { u: string }) {
  return (
    <div className="absolute inset-0 animate-[sway_12s_ease-in-out_infinite] opacity-50">
      <svg viewBox="0 0 390 360" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`${u}-aurora`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--frost)" stopOpacity="0" />
            <stop offset="0.3" stopColor="var(--frost)" />
            <stop offset="0.7" stopColor="var(--blush)" />
            <stop offset="1" stopColor="var(--blush)" stopOpacity="0" />
          </linearGradient>
          <filter
            id={`${u}-aurora-blur`}
            x="-20%"
            y="-50%"
            width="140%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <path
          d="M-20 120C60 70 120 150 200 104C270 64 320 120 410 84L410 112C320 150 270 96 200 136C120 180 60 102 -20 152Z"
          fill={`url(#${u}-aurora)`}
          filter={`url(#${u}-aurora-blur)`}
        />
      </svg>
    </div>
  );
}
