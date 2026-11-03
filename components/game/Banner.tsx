import type { Banner as BannerKind } from "@/lib/dashboard/derive";
import { weekday } from "@/lib/format/ist";

// design §10.8: one banner at a time. Actions (open the restore sheet) arrive
// with the restores screen in build step 6.

export function Banner({
  banner,
  partnerName,
}: {
  banner: BannerKind;
  partnerName: string;
}) {
  const { tone, text } = content(banner, partnerName);
  return (
    <p
      role="status"
      className={`rounded-md px-4 py-3 text-sm font-semibold ${
        tone === "frost"
          ? "bg-frost-soft text-frost-deep"
          : "bg-peach-soft text-peach-deep"
      }`}
    >
      {text}
    </p>
  );
}

function content(
  b: BannerKind,
  partner: string,
): { tone: "frost" | "peach"; text: string } {
  switch (b.kind) {
    case "restore_request":
      return { tone: "frost", text: `${partner} is asking you for a restore.` };
    case "on_ice":
      return {
        tone: "frost",
        text: `Your flower is frosted. You missed ${weekday(b.missedDay)}. Ask ${partner} for a restore.`,
      };
    case "sync_failing":
      return {
        tone: "peach",
        text: "Can’t reach LeetCode right now. We’ll keep trying.",
      };
  }
}
