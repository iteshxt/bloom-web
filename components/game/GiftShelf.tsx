"use client";

import * as m from "motion/react-m";
import { PuffyIcon } from "@/components/icons/puffy";
import { press } from "@/lib/motion";
import type { ReceivingGift } from "@/lib/gifts/view";

// "For me" (design §11.7): a soft peach wooden shelf with a gift box for
// each milestone. Locked boxes swing a hint tag; unlocked ones wiggle with a
// sparkle aura; a box the giver hasn't filled in is a dashed outline;
// opened boxes lean a keepsake card; received ones wear a mint ribbon.

export function GiftShelf({
  gifts,
  streak,
  partnerName,
  onSelect,
}: {
  gifts: ReceivingGift[];
  streak: number;
  partnerName: string;
  onSelect: (gift: ReceivingGift) => void;
}) {
  const rows: ReceivingGift[][] = [];
  for (let i = 0; i < gifts.length; i += 2) rows.push(gifts.slice(i, i + 2));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, r) => (
        <div key={r} className="flex flex-col">
          <div className="grid grid-cols-2 gap-3 px-2">
            {row.map((g) => (
              <Box
                key={g.milestone}
                gift={g}
                daysToGo={Math.max(0, g.milestone - streak)}
                partnerName={partnerName}
                onSelect={() => onSelect(g)}
              />
            ))}
          </div>
          {/* the plank */}
          <div className="bg-wood shadow-soft relative z-0 -mt-2 h-4 rounded-sm">
            <div className="bg-wood-deep/30 absolute inset-x-0 bottom-0 h-1.5 rounded-b-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Box({
  gift,
  daysToGo,
  partnerName,
  onSelect,
}: {
  gift: ReceivingGift;
  daysToGo: number;
  partnerName: string;
  onSelect: () => void;
}) {
  const opened = gift.status === "revealed" || gift.status === "delivered";
  const label = `${gift.milestone}-day gift: ${
    gift.canOpen
      ? "ready to open"
      : gift.waiting
        ? `${partnerName} is wrapping it`
        : opened
          ? "opened"
          : `${daysToGo} days to go`
  }`;
  return (
    <m.button
      type="button"
      aria-label={label}
      whileTap={press}
      onClick={onSelect}
      disabled={gift.status === "locked" || gift.waiting}
      className="relative z-10 flex min-h-[178px] flex-col items-center justify-end gap-1 pt-6 disabled:opacity-100"
    >
      {gift.canOpen && (
        <span className="bg-butter/50 absolute top-6 h-24 w-24 rounded-full blur-xl" />
      )}

      {gift.status === "locked" && gift.hint && (
        <span className="bg-surface text-ink-2 shadow-soft absolute top-0 right-1 max-w-[120px] origin-top-left animate-[wiggle_4s_ease-in-out_infinite] rounded-sm px-2 py-1 text-left text-[11px] leading-tight">
          {gift.hint}
        </span>
      )}

      <span
        className={`relative ${gift.canOpen ? "animate-wiggle" : ""} ${gift.waiting ? "opacity-40" : ""}`}
      >
        {gift.waiting ? (
          <span className="border-ink-3 block h-[78px] w-[86px] rounded-md border-2 border-dashed" />
        ) : (
          <PuffyIcon name={opened ? "giftOpen" : "gift"} size={96} />
        )}
        {gift.status === "locked" && (
          <span className="absolute -right-1 bottom-2">
            <PuffyIcon name="lock" size={30} />
          </span>
        )}
        {gift.status === "delivered" && (
          <span className="absolute -right-1 bottom-2">
            <PuffyIcon name="check" size={32} />
          </span>
        )}
        {gift.status === "revealed" && (
          <span className="bg-surface shadow-soft absolute -right-3 bottom-3 h-12 w-9 rotate-12 rounded-[6px]" />
        )}
      </span>

      <span className="font-display text-lg leading-none font-bold">
        {gift.milestone} days
      </span>
      <span
        className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
          gift.canOpen
            ? "bg-p text-p-deep"
            : opened
              ? "bg-mint-soft text-mint-deep"
              : "bg-surface text-ink-2"
        }`}
      >
        {gift.canOpen
          ? "Open"
          : gift.waiting
            ? `${partnerName} is wrapping it…`
            : gift.status === "delivered"
              ? "Received"
              : gift.status === "revealed"
                ? "Opened"
                : daysToGo === 1
                  ? "1 day to go"
                  : `${daysToGo} days to go`}
      </span>
    </m.button>
  );
}
