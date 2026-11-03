import Link from "next/link";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";
import type { Banner as BannerKind } from "@/lib/dashboard/derive";
import { weekday } from "@/lib/format/ist";

// design §10.8: one banner at a time, a soft-fill card with a 40 px puffy
// icon, one line of text and one action.

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
  const { tone, icon, text, action } = content(banner, partnerName);
  return (
    <div
      role="status"
      className={`shadow-soft flex items-center gap-3 rounded-md py-2.5 pr-2.5 pl-2 text-sm font-semibold ${TONES[tone]}`}
    >
      <PuffyIcon name={icon} size={40} />
      <p className="flex-1">{text}</p>
      {action && (
        <Link
          href={action.href}
          className={`rounded-pill inline-flex h-11 shrink-0 items-center px-4 ${
            action.primary
              ? "bg-p text-p-deep shadow-player"
              : "bg-surface text-ink"
          }`}
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
  icon: PuffyName;
  text: string;
  action?: { href: string; label: string; primary?: boolean };
} {
  switch (b.kind) {
    case "restore_request":
      return {
        tone: "frost",
        icon: "ice",
        text: `${partner} is asking you for a restore.`,
        action: { href: "/restores", label: "Decide", primary: true },
      };
    case "on_ice":
      return {
        tone: "frost",
        icon: "ice",
        text: `Your flower is frosted. You missed ${weekday(b.missedDay)}. Ask ${partner} for a restore.`,
        action: { href: "/restores", label: "Ask" },
      };
    case "gift_owed":
      return {
        tone: "blush",
        icon: "gift",
        text: `You owe ${partner} a gift for ${b.milestone} days.`,
        action: { href: "/gifts", label: "Choose" },
      };
    case "sync_failing":
      return {
        tone: "peach",
        icon: "code",
        text: "Can’t reach LeetCode right now. We’ll keep trying.",
      };
  }
}
