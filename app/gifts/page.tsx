"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, PageShell } from "@/components/ui/PageShell";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { useDuel } from "@/lib/dashboard/useDuel";
import type { GivingGift, ReceivingGift } from "@/lib/gifts/view";
import { useGifts } from "@/lib/game/queries";

// design §11.7 and PRD 5.8, functional pass. The shelf, wiggling boxes and
// unboxing moment arrive with the design pass.

export default function GiftsPage() {
  const duel = useDuel();
  const gifts = useGifts();
  const [tab, setTab] = useState<"mine" | "theirs">("mine");

  const partnerName = duel.data?.partner?.name ?? "your partner";
  if (!duel.data || !gifts.data) {
    return (
      <PageShell title="Gifts">
        <p className="text-ink-2">
          {duel.isError || gifts.isError
            ? "Something went sideways. Try again."
            : "Loading…"}
        </p>
      </PageShell>
    );
  }
  if (!duel.data.partner) {
    return (
      <PageShell title="Gifts" color={duel.data.me.color}>
        <p className="text-ink-2">
          Gifts open up once your partner joins with code{" "}
          {duel.data.pair.inviteCode}.
        </p>
      </PageShell>
    );
  }
  const streak = duel.data.me.run?.length ?? 0;

  return (
    <PageShell title="Gifts" color={duel.data.me.color}>
      <div
        role="tablist"
        className="bg-surface shadow-soft rounded-pill grid grid-cols-2 gap-1 p-1"
      >
        {(["mine", "theirs"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-pill h-11 font-semibold ${tab === t ? "bg-p text-p-deep" : "text-ink-2"}`}
          >
            {t === "mine" ? "For me" : `For ${partnerName}`}
          </button>
        ))}
      </div>

      {tab === "mine" ? (
        <ul className="flex flex-col gap-3">
          {gifts.data.receiving.map((g) => (
            <Receiving
              key={g.milestone}
              gift={g}
              partnerName={partnerName}
              streak={streak}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-3">
          {gifts.data.giving.map((g) => (
            <Giving key={g.milestone} gift={g} partnerName={partnerName} />
          ))}
        </ul>
      )}
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
    await queryClient.invalidateQueries({ queryKey: ["gifts"] });
  }

  const daysToGo = Math.max(0, gift.milestone - streak);
  return (
    <li className="bg-surface shadow-soft flex flex-col gap-2 rounded-lg p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">
          {gift.milestone} days
        </h2>
        <Chip tone={chipTone(gift.status)}>
          {receivingLabel(gift, daysToGo)}
        </Chip>
      </div>

      {gift.status === "locked" && (
        <p className="text-ink-2">
          {gift.hint ? `Hint: ${gift.hint}` : "A mystery, for now."}
        </p>
      )}
      {gift.waiting && (
        <p className="text-ink-2">{partnerName} is wrapping it…</p>
      )}
      {gift.canOpen && (
        <Button
          className="self-start"
          disabled={busy}
          onClick={() => step("reveal")}
        >
          {busy ? "Opening…" : "Open"}
        </Button>
      )}
      {(gift.status === "revealed" || gift.status === "delivered") && (
        <div className="bg-p-soft flex flex-col gap-1 rounded-md p-4">
          <p className="font-display text-p-deep text-2xl font-extrabold">
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
              className="text-p-deep font-semibold underline"
            >
              Open link
            </a>
          )}
          <p className="text-ink-2 text-sm">
            From {partnerName}, for {gift.milestone} days
          </p>
        </div>
      )}
      {gift.status === "revealed" && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={busy}
          onClick={() => step("received")}
        >
          Mark as received
        </Button>
      )}
      {error && (
        <p role="alert" className="text-peach-deep text-sm font-semibold">
          {error}
        </p>
      )}
    </li>
  );
}

function Giving({
  gift,
  partnerName,
}: {
  gift: GivingGift;
  partnerName: string;
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
    await queryClient.invalidateQueries({ queryKey: ["gifts"] });
  }

  return (
    <li
      className={`bg-surface shadow-soft flex flex-col gap-3 rounded-lg p-5 ${gift.owed ? "ring-blush ring-2" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">
          {gift.milestone} days
        </h2>
        <Chip tone={chipTone(gift.status)}>{givingLabel(gift)}</Chip>
      </div>
      {gift.owed && (
        <p className="text-blush-deep font-semibold">
          {partnerName} reached {gift.milestone} days. You owe a gift.
        </p>
      )}

      {editing ? (
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
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !form.title.trim()}>
              {busy ? "Wrapping…" : "Wrap it"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : gift.title ? (
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
      {error && (
        <p role="alert" className="text-peach-deep text-sm font-semibold">
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
