// Where the sky meets the calm panel (design §5.3): a soft wave with two
// gentle crests (18 px amplitude) that shift 8 px over 12 s, with a few
// blades of grass and tiny wildflowers on top (§6.2, layer 6).

export function WaveEdge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 44"
      preserveAspectRatio="none"
      className={`pointer-events-none block h-11 w-full ${className}`}
      aria-hidden
    >
      <g className="animate-[wave-shift_12s_ease-in-out_infinite_alternate]">
        <path
          d="M-10 26C40 8 90 8 140 22C190 36 240 36 290 20C330 8 370 10 420 22V44H-10Z"
          fill="var(--cloud)"
        />
        <path
          d="M34 18l-2-7M38 18l1-8M42 18l3-6M316 16l-2-6M320 15l1-7"
          stroke="var(--leaf-deep)"
          strokeOpacity={0.5}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={46} cy={11} r={2.4} fill="var(--blush)" />
        <circle cx={326} cy={9} r={2.4} fill="var(--butter)" />
        <circle cx={198} cy={30} r={2} fill="var(--lilac)" />
      </g>
    </svg>
  );
}
