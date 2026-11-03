"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Companion } from "@/components/companions/Companion";
import { TokenPouch } from "@/components/game/TokenPouch";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Chip, PageShell, SectionTitle } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Progress";
import { api } from "@/lib/api/client";
import { asKind } from "@/lib/companions";
import { derivePlayer, type PlayerView } from "@/lib/dashboard/derive";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useNow } from "@/lib/dashboard/useNow";
import { shortDate, weekday } from "@/lib/format/ist";
import { useRestoreHistory, type RestoreRow } from "@/lib/game/queries";
import { toast } from "@/lib/toast";
import { addDays, dayEndsAt } from "@/lib/time";
import type { Companion as Kind } from "@/lib/players";

// Restores (design §11.6, PRD 5.5): a frost-themed card for the player who
// missed, a chat-like card for the partner deciding, and the history
// grouped by month.

export default function RestoresPage() {
  const now = useNow();
  const duel = useDuel();
  const history = useRestoreHistory();

  if (!now || !duel.data || !history.data) {
    return (
      <PageShell title="Restores" back="/">
        {duel.isError || history.isError ? (
          <p className="text-ink-2">Something went sideways. Try again.</p>
        ) : (
          <Skeleton className="h-64 rounded-xl" />
        )}
      </PageShell>
    );
  }

  const { pair } = duel.data;
  const me = derivePlayer(duel.data.me, pair, now);
  const partner = duel.data.partner
    ? derivePlayer(duel.data.partner, pair, now)
    : null;
  const rows = history.data;
  const mine = me.atRiskDay
    ? rows.find(
        (r) =>
          r.playerId === me.id &&
          r.missedDay === me.atRiskDay &&
          r.status !== "cancelled",
      )
    : undefined;
  const toMe = partner
    ? rows.find(
        (r) =>
          r.playerId === partner.id &&
          r.approverId === me.id &&
          r.status === "pending",
      )
    : undefined;

  const myKind = asKind(duel.data.me.avatarKey);
  const partnerKind = asKind(duel.data.partner?.avatarKey);

  return (
    <PageShell title="Restores" color={me.color} back="/">
      {toMe && partner && (
        <DecideCard request={toMe} partner={partner} kind={partnerKind} />
      )}
      {me.onIce && me.atRiskDay && partner && (
        <AskCard
          me={me}
          kind={myKind}
          partner={partner}
          partnerKind={partnerKind}
          missedDay={me.atRiskDay}
          request={mine}
          now={now}
          graceMinutes={pair.graceMinutes}
        />
      )}
      {!toMe && !me.onIce && (
        <section className="bg-surface shadow-soft flex flex-col items-center gap-2 rounded-xl p-6 text-center">
          <Companion kind={myKind} mood="happy" size={96} />
          <p className="font-display text-lg font-semibold">
            Nothing frosted right now
          </p>
          <p className="text-ink-2 text-sm">
            If a day slips, you can ask {partner?.name ?? "your partner"} for a
            restore here.
          </p>
          <TokenPouch
            tokens={me.tokens}
            max={me.tokensMax}
            label="left this run"
          />
        </section>
      )}
      <History
        rows={rows}
        meId={me.id}
        names={{
          [me.id]: me.name,
          ...(partner ? { [partner.id]: partner.name } : {}),
        }}
      />
    </PageShell>
  );
}

function AskCard({
  me,
  kind,
  partner,
  partnerKind,
  missedDay,
  request,
  now,
  graceMinutes,
}: {
  me: PlayerView;
  kind: Kind;
  partner: PlayerView;
  partnerKind: Kind;
  missedDay: string;
  request: RestoreRow | undefined;
  now: Date;
  graceMinutes: number;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closes = dayEndsAt(addDays(missedDay, 1), graceMinutes);
  const mins = Math.max(
    0,
    Math.ceil((closes.getTime() - now.getTime()) / 60_000),
  );

  async function call(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    const res = await api(path, { body });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    if (path.endsWith("/request"))
      toast(`Restore sent to ${partner.name}`, "ice");
    await queryClient.invalidateQueries();
  }

  return (
    <section className="bg-frost-soft text-ink shadow-glow-frost flex flex-col gap-3 rounded-xl p-5">
      <div className="flex items-center gap-3">
        <Companion kind={kind} mood="frozen" size={96} className="-my-2" />
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-frost-deep text-[22px] leading-[1.2] font-bold">
            Your flower is frosted
          </h2>
          <p className="text-frost-deep text-sm">
            You missed {weekday(missedDay)},{" "}
            {shortDate(missedDay).split(", ")[1]}.
          </p>
        </div>
      </div>
      <TokenPouch
        tokens={me.tokens}
        max={me.tokensMax}
        label={`${me.tokens} ${me.tokens === 1 ? "restore" : "restores"} left`}
      />

      {request?.status === "pending" ? (
        <>
          <div
            className="flex items-center gap-2"
            data-player-color={partner.color}
          >
            <Companion kind={partnerKind} mood="idle" size={56} />
            <span className="bg-surface text-ink-2 rounded-md rounded-bl-[4px] px-3 py-2 text-sm font-semibold">
              <span className="animate-pulse-soft">…</span>
            </span>
            <p className="text-frost-deep font-semibold">
              Waiting for {partner.name}…
            </p>
          </div>
          {request.message && (
            <p className="text-ink-2 text-sm">You said: “{request.message}”</p>
          )}
          <Button
            variant="ghost"
            className="self-start"
            disabled={busy}
            onClick={() =>
              call("/api/restore/cancel", { requestId: request.id })
            }
          >
            Cancel request
          </Button>
        </>
      ) : request ? (
        <p className="text-ink-2">This day was already asked about.</p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            call("/api/restore/request", { message });
          }}
        >
          <label
            htmlFor="restore-message"
            className="text-frost-deep text-sm font-semibold"
          >
            Say something to {partner.name} (optional)
          </label>
          <textarea
            id="restore-message"
            value={message}
            maxLength={280}
            rows={3}
            placeholder="I had a fever 🥺"
            onChange={(e) => setMessage(e.target.value)}
            className="border-line bg-surface text-ink placeholder:text-ink-3 focus:border-p focus:ring-p-soft rounded-sm border-[1.5px] p-3 outline-none focus:ring-4"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : `Ask ${partner.name} to restore`}
          </Button>
        </form>
      )}
      <p className="text-frost-deep tabular text-sm font-semibold">
        Closes in {Math.floor(mins / 60)}h {mins % 60}m
      </p>
      {error && (
        <p role="alert" className="text-peach-ink text-sm font-semibold">
          {error}
        </p>
      )}
    </section>
  );
}

function DecideCard({
  request,
  partner,
  kind,
}: {
  request: RestoreRow;
  partner: PlayerView;
  kind: Kind;
}) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(approve: boolean) {
    setBusy(true);
    setError(null);
    const res = await api("/api/restore/respond", {
      body: { requestId: request.id, approve, reply },
    });
    setBusy(false);
    setConfirmReject(false);
    if (!res.ok) return setError(res.message);
    toast(
      approve
        ? `You restored ${partner.name}’s ${weekday(request.missedDay)}`
        : `${partner.name}’s streak ends. A new seed is planted.`,
      approve ? "heart" : "sprout",
    );
    await queryClient.invalidateQueries();
  }

  return (
    <section
      className="bg-surface shadow-player flex flex-col gap-3 rounded-xl p-5"
      data-player-color={partner.color}
    >
      <h2 className="font-display text-[22px] leading-[1.2] font-bold">
        {partner.name} needs a little sunshine
      </h2>
      <p className="text-ink-2 text-sm">
        A restore for {weekday(request.missedDay)},{" "}
        {shortDate(request.missedDay).split(", ")[1]}.
      </p>
      <div className="flex items-end gap-2">
        <Companion kind={kind} mood="frozen" size={72} className="shrink-0" />
        <p className="bg-p text-p-deep relative mb-6 rounded-lg rounded-bl-[6px] px-4 py-3 font-semibold">
          {request.message
            ? `“${request.message}”`
            : "Could you thaw my flower?"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip tone="peach">{partner.streak}-day streak</Chip>
        <Chip tone="butter">
          {partner.tokens} {partner.tokens === 1 ? "restore" : "restores"} left
        </Chip>
      </div>
      <label htmlFor="restore-reply" className="text-sm font-semibold">
        Reply (optional)
      </label>
      <input
        id="restore-reply"
        value={reply}
        maxLength={280}
        onChange={(e) => setReply(e.target.value)}
        className="border-line bg-surface text-ink focus:border-p focus:ring-p-soft h-[52px] rounded-sm border-[1.5px] px-4 outline-none focus:ring-4"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="soft"
          tone="mint"
          className="h-[52px]!"
          disabled={busy}
          onClick={() => respond(true)}
        >
          {busy ? "Saving…" : "Approve"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirmReject(true)}>
          Not this time
        </Button>
      </div>
      <ConfirmDialog
        open={confirmReject}
        title="Not this time?"
        body={`Their ${partner.streak}-day streak will end. Are you sure?`}
        confirmLabel="Yes, not this time"
        busy={busy}
        onConfirm={() => respond(false)}
        onCancel={() => setConfirmReject(false)}
      />
      {error && (
        <p role="alert" className="text-peach-ink text-sm font-semibold">
          {error}
        </p>
      )}
    </section>
  );
}

const STATUS: Record<
  RestoreRow["status"],
  { label: string; tone: "mint" | "peach" | "muted" | "frost" }
> = {
  approved: { label: "Approved", tone: "mint" },
  rejected: { label: "Not this time", tone: "peach" },
  expired: { label: "Expired", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "muted" },
  pending: { label: "Waiting", tone: "frost" },
};

function History({
  rows,
  meId,
  names,
}: {
  rows: RestoreRow[];
  meId: string;
  names: Record<string, string>;
}) {
  if (rows.length === 0) return null;
  const months = new Map<string, RestoreRow[]>();
  for (const r of rows) {
    const key = monthLabel(r.missedDay);
    months.set(key, [...(months.get(key) ?? []), r]);
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>History</SectionTitle>
      {[...months].map(([month, list]) => (
        <div key={month} className="flex flex-col gap-2">
          <h3 className="text-ink-2 text-sm font-semibold">{month}</h3>
          <HistoryList rows={list} meId={meId} names={names} />
        </div>
      ))}
    </section>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const monthLabel = (day: string) =>
  `${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;

function HistoryList({
  rows,
  meId,
  names,
}: {
  rows: RestoreRow[];
  meId: string;
  names: Record<string, string>;
}) {
  return (
    <>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="bg-surface shadow-soft flex flex-col gap-1 rounded-md p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                {shortDate(r.missedDay)} ·{" "}
                {r.playerId === meId ? "You" : (names[r.playerId] ?? "Partner")}{" "}
                asked
              </span>
              <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Chip>
            </div>
            {r.message && (
              <p className="text-ink-2 truncate text-sm">“{r.message}”</p>
            )}
            {r.responseMessage && (
              <p className="text-ink-2 truncate text-sm">
                Reply: “{r.responseMessage}”
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
