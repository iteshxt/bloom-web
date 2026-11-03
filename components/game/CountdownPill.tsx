import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";
import {
  countdownLabel,
  urgency,
  type PlayerView,
} from "@/lib/dashboard/derive";

// design §10.3: a glass pill with an hourglass. The hourglass turns peach
// under 3 h; under 1 h the pill fills peach and pulses; the grace hour is
// frost with an aurora shimmer; mint when done; butter before the start.

const STYLES = {
  calm: "glass text-ink",
  soon: "glass text-peach-deep",
  urgent: "bg-peach-soft text-peach-deep shadow-float animate-pulse-soft",
  grace: "bg-frost-soft text-frost-deep shadow-float",
  done: "bg-mint-soft text-mint-deep shadow-float",
  before: "bg-butter-soft text-butter-deep shadow-float",
} as const;

const ICONS: Record<keyof typeof STYLES, PuffyName> = {
  calm: "hourglass",
  soon: "hourglass",
  urgent: "hourglass",
  grace: "moon",
  done: "check",
  before: "calendar",
};

export function CountdownPill({ me }: { me: PlayerView }) {
  if (me.startsInDays !== null) {
    const days = me.startsInDays;
    return (
      <Pill style="before">
        {days === 1 ? "Starts tomorrow" : `Starts in ${days} days`}
      </Pill>
    );
  }
  if (!me.focus) return null;
  return <Pill style={urgency(me.focus)}>{countdownLabel(me.focus)}</Pill>;
}

function Pill({
  style,
  children,
}: {
  style: keyof typeof STYLES;
  children: React.ReactNode;
}) {
  return (
    <span
      role="timer"
      className={`rounded-pill tabular relative inline-flex h-9 shrink-0 items-center gap-1 overflow-hidden pr-3.5 pl-1 text-[13px] font-semibold ${STYLES[style]}`}
    >
      {style === "grace" && (
        <span className="animate-shimmer via-blush/40 absolute inset-0 bg-linear-to-r from-transparent to-transparent [animation-duration:3s]" />
      )}
      <span
        className="relative"
        style={style === "calm" ? { filter: "saturate(0.2)" } : undefined}
      >
        <PuffyIcon name={ICONS[style]} size={28} />
      </span>
      <span className="relative">{children}</span>
    </span>
  );
}
