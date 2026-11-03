import type { ReactNode } from "react";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";

// design §10.2: 32 px pill, semantic soft fill, deep-shade label, optional
// 16 px puffy icon. Status chips always carry a word, never colour alone.

const TONES = {
  mint: "bg-mint-soft text-mint-deep",
  peach: "bg-peach-soft text-peach-deep",
  frost: "bg-frost-soft text-frost-deep",
  butter: "bg-butter-soft text-butter-deep",
  blush: "bg-blush-soft text-blush-deep",
  sky: "bg-sky-soft text-sky-deep",
  lilac: "bg-lilac-soft text-lilac-deep",
  p: "bg-p-soft text-p-deep",
  muted: "bg-surface text-ink-2 shadow-soft",
  glass: "glass text-ink",
} as const;

export type ChipTone = keyof typeof TONES;

export function Chip({
  tone,
  icon,
  className = "",
  children,
}: {
  tone: ChipTone;
  icon?: PuffyName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-pill inline-flex h-8 shrink-0 items-center gap-1.5 text-[13px] font-semibold ${icon ? "pr-3 pl-1.5" : "px-3"} ${TONES[tone]} ${className}`}
    >
      {icon && <PuffyIcon name={icon} size={20} />}
      {children}
    </span>
  );
}

/** design §10.2 stat chip: a 40 px puffy icon, a bold value, a tiny label. */
export function StatChip({
  icon,
  value,
  label,
  glass = false,
}: {
  icon: PuffyName;
  value: ReactNode;
  label: string;
  glass?: boolean;
}) {
  return (
    <div
      className={`rounded-pill flex shrink-0 items-center gap-2 py-1.5 pr-4 pl-1.5 ${glass ? "glass" : "bg-surface shadow-soft"}`}
    >
      <PuffyIcon name={icon} size={40} />
      <div className="flex flex-col leading-tight">
        <span className="font-display tabular text-lg leading-none font-bold">
          {value}
        </span>
        <span className="text-ink-2 text-xs font-semibold">{label}</span>
      </div>
    </div>
  );
}
