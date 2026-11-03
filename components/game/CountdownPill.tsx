import {
  countdownLabel,
  urgency,
  type PlayerView,
} from "@/lib/dashboard/derive";

// design §10.3: calm → peach under 3 h → peach fill under 1 h → frost in the
// grace hour → mint when done → butter before the start date.
const STYLES = {
  calm: "bg-surface text-ink shadow-soft",
  soon: "bg-surface text-peach-deep shadow-soft",
  urgent: "bg-peach-soft text-peach-deep motion-safe:animate-pulse",
  grace: "bg-frost-soft text-frost-deep",
  done: "bg-mint-soft text-mint-deep",
  before: "bg-butter-soft text-butter-deep",
} as const;

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
      className={`rounded-pill inline-flex h-8 items-center px-3 text-[13px] font-semibold tabular-nums ${STYLES[style]}`}
    >
      {children}
    </span>
  );
}
