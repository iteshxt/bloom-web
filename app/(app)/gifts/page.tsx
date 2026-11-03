"use client";

import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Companion } from "@/components/companions/Companion";
import { GiftShelf } from "@/components/game/GiftShelf";
import type { Revealed } from "@/components/moments/Unboxing";
import { LineIcon } from "@/components/icons/line";
import { PuffyIcon } from "@/components/icons/puffy";
import { Button } from "@/components/ui/Button";
import { Chip, PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { asKind } from "@/lib/companions";
import { spring } from "@/lib/motion";
import { toast } from "@/lib/toast";
import { api } from "@/lib/api/client";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useHydrated } from "@/lib/useHydrated";
import type { GivingGift, ReceivingGift } from "@/lib/gifts/view";
import { useGifts } from "@/lib/game/queries";

// The unboxing loads after the page; it only plays when a gift is opened.
const Unboxing = dynamic(
  () => import("@/components/moments/Unboxing").then((m) => m.Unboxing),
  { ssr: false },
);

// Gifts (design §11.7, PRD 5.8): a "For me / For {Partner}" toggle. For me
// is the wooden shelf; tapping an unlocked box opens it, tapping an opened
// one shows its keepsake card. For the partner, each milestone card opens
// the editor sheet ("Wrap it").

export default function GiftsPage() {
  // Waits for hydration: the offline cache restores before it.
  const hydrated = useHydrated();
  const duel = useDuel();
  const gifts = useGifts();
  const [tab, setTab] = useState<"mine" | "theirs">("mine");
  const [open, setOpen] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const partnerName = duel.data?.partner?.name ?? "your partner";
  if (!hydrated || !duel.data || !gifts.data) {
    return (
      <PageShell title="Gifts">
        {duel.isError || gifts.isError ? (
          <p className="text-ink-2">Something went sideways. Try again.</p>
        ) : (
          <Skeleton className="h-72 rounded-xl" />
        )}
      </PageShell>
    );
  }
  if (!duel.data.partner) {
    return (
      <PageShell title="Gifts" color={duel.data.me.color}>
        <section className="bg-surface shadow-soft flex flex-col items-center gap-2 rounded-xl p-6 text-center">
          <PuffyIcon name="gift" size={72} />
          <p className="text-ink-2">
            Gifts open up once your partner joins with code{" "}
            <span className="font-display text-ink font-bold tracking-[0.1em]">
              {duel.data.pair.inviteCode}
            </span>
            .
          </p>
        </section>
      </PageShell>
    );
  }
  const streak = duel.data.me.run?.length ?? 0;
  const partnerKind = asKind(duel.data.partner.avatarKey);
  const partnerColor = duel.data.partner.color;
  const selected = gifts.data.receiving.find((g) => g.milestone === open);
  const unboxing = selected?.canOpen ? selected : undefined;

  return (
    <PageShell
      title="Gifts"
      color={duel.data.me.color}
      skyClassName="pb-12"
      sky={
        <div
          role="tablist"
          aria-label="Whose gifts"
          className="bg-surface shadow-soft rounded-pill grid grid-cols-2 gap-1 p-1"
        >
          {(["mine", "theirs"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-pill relative h-11 font-semibold ${tab === t ? "text-p-deep" : "text-ink-2"}`}
            >
              {tab === t && (
                <motion.span
                  layoutId="gift-tab"
                  className="bg-p rounded-pill absolute inset-0"
                  transition={spring.soft}
                />
              )}
              <span className="relative">
                {t === "mine" ? "For me" : `For ${partnerName}`}
              </span>
            </button>
          ))}
        </div>
      }
    >
      {tab === "mine" ? (
        <GiftShelf
          gifts={gifts.data.receiving}
          streak={streak}
          partnerName={partnerName}
          onSelect={(g) => setOpen(g.milestone)}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {gifts.data.giving.map((g) => (
            <Giving
              key={g.milestone}
              gift={g}
              partnerName={partnerName}
              partnerKind={partnerKind}
              partnerColor={partnerColor}
            />
          ))}
        </ul>
      )}

      <AnimatePresence>
        {unboxing?.id && (
          <Unboxing
            key={unboxing.id}
            milestone={unboxing.milestone}
            partnerName={partnerName}
            color={duel.data.me.color}
            reveal={async () => {
              const res = await api<{ gift: Revealed }>(
                `/api/gifts/${unboxing.id}/reveal`,
                { body: {} },
              );
              return res.ok ? res.data.gift : null;
            }}
            onReceived={async () => {
              await api(`/api/gifts/${unboxing.id}/received`, { body: {} });
              toast("Marked as received", "check");
            }}
            onClose={() => {
              setOpen(null);
              queryClient.invalidateQueries({ queryKey: ["gifts"] });
            }}
          />
        )}
      </AnimatePresence>

      <Sheet
        open={Boolean(selected) && !unboxing}
        onClose={() => setOpen(null)}
        title={selected ? `Your ${selected.milestone}-day gift` : ""}
        color={duel.data.me.color}
      >
        {selected && (
          <Receiving
            gift={selected}
            partnerName={partnerName}
            streak={streak}
          />
        )}
      </Sheet>
    </PageShell>
  );
}

function Receiving({
  gift,
  partnerName,
  streak,
}: {
  gift: ReceivingGift;
  partnerName: string;
  streak: number;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function step(path: "reveal" | "received") {
    if (!gift.id) return;
    setBusy(true);
    setError(null);
    const res = await api(`/api/gifts/${gift.id}/${path}`, { body: {} });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    if (path === "received") toast("Marked as received", "check");
    await queryClient.invalidateQueries({ queryKey: ["gifts"] });
  }

  const daysToGo = Math.max(0, gift.milestone - streak);
  return (
    <div className="flex flex-col gap-3 pb-2">
      <Chip tone={chipTone(gift.status)} className="self-start">
        {receivingLabel(gift, daysToGo)}
      </Chip>

      {gift.status === "locked" && (
        <p className="text-ink-2">
          {gift.hint ? `Hint: ${gift.hint}` : "A mystery, for now."}
        </p>
      )}
      {gift.waiting && (
        <p className="text-ink-2">{partnerName} is wrapping it…</p>
      )}
      {gift.canOpen && (
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="animate-wiggle">
            <PuffyIcon name="gift" size={120} />
          </span>
          <Button disabled={busy} onClick={() => step("reveal")}>
            {busy ? "Opening…" : "Open gift"}
          </Button>
        </div>
      )}
      {(gift.status === "revealed" || gift.status === "delivered") && (
        <div className="bg-p-wash shadow-player flex flex-col gap-2 rounded-xl p-5">
          <PuffyIcon name="giftOpen" size={48} />
          <p className="font-display text-p-ink text-[32px] leading-[1.1] font-extrabold">
            {gift.title}
          </p>
          {gift.details && (
            <p className="whitespace-pre-line">{gift.details}</p>
          )}
          {gift.linkUrl && (
            <a
              href={gift.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface text-ink rounded-pill inline-flex h-11 items-center gap-2 self-start px-4 font-semibold"
            >
              <LineIcon name="link" size={18} /> Open link
            </a>
          )}
          <p className="text-p-ink font-display mt-1 text-sm font-semibold">
            From {partnerName}, for {gift.milestone} days
          </p>
        </div>
      )}
      {gift.status === "revealed" && (
        <Button disabled={busy} onClick={() => step("received")}>
          Mark as received
        </Button>
      )}
      {error && (
        <p role="alert" className="text-peach-ink text-sm font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}

function Giving({
  gift,
  partnerName,
  partnerKind,
  partnerColor,
}: {
  gift: GivingGift;
  partnerName: string;
  partnerKind: ReturnType<typeof asKind>;
  partnerColor: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: gift.title ?? "",
    hint: gift.hint ?? "",
    details: gift.details ?? "",
    linkUrl: gift.linkUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await api("/api/gifts", {
      method: "PUT",
      body: { milestone: gift.milestone, ...form },
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setEditing(false);
    toast(`Wrapped for ${partnerName}`, "gift");
    await queryClient.invalidateQueries({ queryKey: ["gifts"] });
  }

  return (
    <li
      className={`bg-surface shadow-soft flex flex-col gap-3 rounded-lg p-5 ${gift.owed ? "ring-blush ring-2" : ""}`}
    >
      <div className="flex items-center gap-3">
        <PuffyIcon
          name={
            gift.status === "revealed" || gift.status === "delivered"
              ? "giftOpen"
              : "gift"
          }
          size={48}
        />
        <h2 className="font-display flex-1 text-lg font-semibold">
          {gift.milestone} days
        </h2>
        <Chip tone={chipTone(gift.status)}>{givingLabel(gift)}</Chip>
      </div>
      {gift.owed && (
        <div
          className="flex items-center gap-2"
          data-player-color={partnerColor}
        >
          <Companion kind={partnerKind} mood="wave" size={48} />
          <p className="text-blush-deep text-sm font-semibold">
            {partnerName} reached {gift.milestone} days. You owe a gift.
          </p>
        </div>
      )}

      {gift.title ? (
        <>
          <p className="font-semibold">{gift.title}</p>
          {gift.hint && <p className="text-ink-2 text-sm">Hint: {gift.hint}</p>}
          {gift.editable && (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}
        </>
      ) : (
        <Button className="self-start" onClick={() => setEditing(true)}>
          Choose a gift
        </Button>
      )}

      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title={`A gift for ${partnerName}’s ${gift.milestone} days`}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <TextField
            id={`gift-${gift.milestone}`}
            label="Gift"
            value={form.title}
            maxLength={80}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            id={`hint-${gift.milestone}`}
            label="Hint they can see before (optional)"
            placeholder="Something cozy for rainy days"
            value={form.hint}
            maxLength={120}
            onChange={(e) => setForm({ ...form, hint: e.target.value })}
          />
          <TextField
            id={`details-${gift.milestone}`}
            label="Details (optional)"
            value={form.details}
            maxLength={1000}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
          />
          <TextField
            id={`link-${gift.milestone}`}
            label="Link (optional)"
            type="url"
            placeholder="https://"
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
          />
          <Button type="submit" disabled={busy || !form.title.trim()}>
            {busy ? "Wrapping…" : "Wrap it"}
          </Button>
          {error && (
            <p role="alert" className="text-peach-ink text-sm font-semibold">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      {error && (
        <p role="alert" className="text-peach-ink text-sm font-semibold">
          {error}
        </p>
      )}
    </li>
  );
}

function chipTone(status: GivingGift["status"]) {
  return status === "unlocked"
    ? "butter"
    : status === "revealed" || status === "delivered"
      ? "mint"
      : "muted";
}

function receivingLabel(g: ReceivingGift, daysToGo: number): string {
  switch (g.status) {
    case "locked":
      return daysToGo === 1 ? "1 day to go" : `${daysToGo} days to go`;
    case "unlocked":
      return g.waiting ? "Being wrapped" : "Ready to open";
    case "revealed":
      return "Opened";
    case "delivered":
      return "Received";
  }
}

function givingLabel(g: GivingGift): string {
  switch (g.status) {
    case "locked":
      return g.title ? "Wrapped" : "Not chosen";
    case "unlocked":
      return g.title ? "Unlocked" : "Owed";
    case "revealed":
      return "Opened";
    case "delivered":
      return "Received";
  }
}
