import Link from "next/link";
import type { Banner as BannerKind } from "@/lib/dashboard/derive";
import { weekday } from "@/lib/format/ist";

// design §10.8: one banner at a time, with one action.

const TONES = {
  frost: "bg-frost-soft text-frost-deep",
  blush: "bg-blush-soft text-blush-deep",
  peach: "bg-peach-soft text-peach-deep",
} as const;

export function Banner({
  banner,
  partnerName,
}: {
  banner: BannerKind;
  partnerName: string;
}) {
  const { tone, text, action } = content(banner, partnerName);
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-md px-4 py-3 text-sm font-semibold ${TONES[tone]}`}
    >
      <p>{text}</p>
      {action && (
        <Link
          href={action.href}
          className="bg-surface text-ink rounded-pill inline-flex h-11 shrink-0 items-center px-4"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function content(
  b: BannerKind,
  partner: string,
): {
  tone: keyof typeof TONES;
  text: string;
  action?: { href: string; label: string };
} {
  switch (b.kind) {
    case "restore_request":
      return {
        tone: "frost",
        text: `${partner} is asking you for a restore.`,
        action: { href: "/restores", label: "Decide" },
      };
    case "on_ice":
      return {
        tone: "frost",
        text: `Your flower is frosted. You missed ${weekday(b.missedDay)}. Ask ${partner} for a restore.`,
        action: { href: "/restores", label: "Ask" },
      };
    case "gift_owed":
      return {
        tone: "blush",
        text: `You owe ${partner} a gift for ${b.milestone} days.`,
        action: { href: "/gifts", label: "Choose" },
      };
    case "sync_failing":
      return {
        tone: "peach",
        text: "Can’t reach LeetCode right now. We’ll keep trying.",
      };
  }
}
