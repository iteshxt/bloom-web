// Three clouds drifting at 80 s, 110 s and 140 s per loop with a slight
// bob (design §6.2). CSS transforms only; paused in the background and
// static with reduced motion (they rest where they start).

const CLOUDS = [
  { y: 40, scale: 1, duration: 80, delay: 22, x: 40 },
  { y: 118, scale: 0.72, duration: 110, delay: 70, x: 240 },
  { y: 176, scale: 0.5, duration: 140, delay: 30, x: 150 },
];

export function Clouds({ night }: { night: boolean }) {
  return (
    <g opacity={night ? 0.22 : 0.92}>
      {CLOUDS.map((c, i) => (
        <g key={i} transform={`translate(0 ${c.y})`}>
          <g
            className="animate-drift"
            style={{
              animationDuration: `${c.duration}s`,
              animationDelay: `-${c.delay}s`,
              // The resting spot when animations are off (reduced motion);
              // a running animation overrides it.
              transform: `translateX(${c.x}px)`,
            }}
          >
            <g
              className="animate-bob"
              style={{ animationDuration: `${7 + i * 2}s` }}
            >
              <g transform={`scale(${c.scale})`}>
                <Cloud />
              </g>
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

function Cloud() {
  return (
    <g>
      <g fill="var(--white)">
        <circle cx={26} cy={30} r={15} />
        <circle cx={50} cy={20} r={20} />
        <circle cx={76} cy={28} r={15} />
        <rect x={10} y={28} width={82} height={18} rx={9} />
      </g>
      <rect
        x={14}
        y={38}
        width={74}
        height={8}
        rx={4}
        fill="var(--frost)"
        opacity={0.35}
      />
    </g>
  );
}
