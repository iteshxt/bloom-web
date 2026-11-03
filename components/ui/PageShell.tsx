import Link from "next/link";
import type { ReactNode } from "react";

// A secondary screen: back to home, a title, then the content. The floating
// nav (design §10.7) replaces the back link in the design pass.

export function PageShell({
  title,
  color,
  children,
}: {
  title: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <main
      data-player-color={color}
      className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-5 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10"
    >
      <Link
        href="/"
        className="text-ink-2 -ml-2 inline-flex h-11 items-center self-start px-2 text-sm font-semibold"
      >
        ← Home
      </Link>
      <h1 className="font-display text-[28px] leading-[1.15] font-extrabold">
        {title}
      </h1>
      {children}
    </main>
  );
}

export function Chip({
  tone,
  children,
}: {
  tone: "mint" | "peach" | "frost" | "butter" | "muted";
  children: ReactNode;
}) {
  const styles = {
    mint: "bg-mint-soft text-mint-deep",
    peach: "bg-peach-soft text-peach-deep",
    frost: "bg-frost-soft text-frost-deep",
    butter: "bg-butter-soft text-butter-deep",
    muted: "bg-surface text-ink-3 border border-line",
  } as const;
  return (
    <span
      className={`rounded-pill inline-flex h-7 shrink-0 items-center px-3 text-[13px] font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
