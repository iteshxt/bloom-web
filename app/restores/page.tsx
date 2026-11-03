"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, PageShell } from "@/components/ui/PageShell";
import { api } from "@/lib/api/client";
import { derivePlayer, type PlayerView } from "@/lib/dashboard/derive";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useNow } from "@/lib/dashboard/useNow";
import { shortDate, weekday } from "@/lib/format/ist";
import { useRestoreHistory, type RestoreRow } from "@/lib/game/queries";
import { addDays, dayEndsAt } from "@/lib/time";

// design §11.6 and PRD 5.5, functional pass. The frozen creature, thaw and
// shatter moments arrive with the design pass.

export default function RestoresPage() {
  const now = useNow();
  const duel = useDuel();
  const history = useRestoreHistory();

  if (!now || !duel.data || !history.data) {
    return (
      <PageShell title="Restores">
        <p className="text-ink-2">
          {duel.isError || history.isError
            ? "Something went sideways. Try again."
            : "Loading…"}
        </p>
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

  return (
    <PageShell title="Restores" color={me.color}>
      {toMe && partner && <DecideCard request={toMe} partner={partner} />}
      {me.onIce && me.atRiskDay && partner && (
        <AskCard
          me={me}
          partner={partner}
          missedDay={me.atRiskDay}
          request={mine}
          now={now}
          graceMinutes={pair.graceMinutes}
        />
      )}
      {!toMe && !me.onIce && (
        <p className="text-ink-2">
          Nothing to restore right now. If a day slips, you can ask{" "}
          {partner?.name ?? "your partner"} here.
        </p>
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
  partner,
  missedDay,
  request,
  now,
  graceMinutes,
}: {
  me: PlayerView;
  partner: PlayerView;
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
    await queryClient.invalidateQueries();
  }

  return (
    <section className="bg-frost-soft flex flex-col gap-3 rounded-xl p-5">
      <h2 className="font-display text-frost-deep text-[22px] font-bold">
        Your flower is frosted
      </h2>
      <p>
        You missed {weekday(missedDay)}, {shortDate(missedDay).split(", ")[1]}.
      </p>
      <p className="text-frost-deep text-sm font-semibold">
        {me.tokens} {me.tokens === 1 ? "restore" : "restores"} left
      </p>

      {request?.status === "pending" ? (
        <>
          <p className="font-semibold">Waiting for {partner.name}…</p>
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
          <label htmlFor="restore-message" className="text-sm font-semibold">
            Say something to {partner.name} (optional)
          </label>
          <textarea
            id="restore-message"
            value={message}
            maxLength={280}
            rows={3}
            placeholder="I had a fever"
            onChange={(e) => setMessage(e.target.value)}
            className="border-line bg-surface focus:border-p focus:ring-p-soft rounded-sm border-[1.5px] p-3 outline-none focus:ring-4"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : `Ask ${partner.name} to restore`}
          </Button>
        </form>
      )}
      <p className="text-frost-deep text-sm tabular-nums">
        Closes in {Math.floor(mins / 60)}h {mins % 60}m
      </p>
      {error && (
        <p role="alert" className="text-peach-deep text-sm font-semibold">
          {error}
        </p>
      )}
    </section>
  );
}

function DecideCard({
  request,
  partner,
}: {
  request: RestoreRow;
  partner: PlayerView;
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
    if (!res.ok) return setError(res.message);
    await queryClient.invalidateQueries();
  }

  return (
    <section
      className="bg-surface shadow-soft flex flex-col gap-3 rounded-xl p-5"
      data-player-color={partner.color}
    >
      <h2 className="font-display text-[22px] font-bold">
        {partner.name} is asking for a restore
      </h2>
      <p className="text-ink-2 text-sm">
        For {weekday(request.missedDay)},{" "}
        {shortDate(request.missedDay).split(", ")[1]}.
      </p>
      {request.message && (
        <p className="bg-p-soft text-p-deep self-start rounded-md px-4 py-3">
          “{request.message}”
        </p>
      )}
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
        className="border-line bg-surface focus:border-p focus:ring-p-soft h-[52px] rounded-sm border-[1.5px] px-4 outline-none focus:ring-4"
      />
      {confirmReject ? (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">
            Their {partner.streak}-day streak will end. Are you sure?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => respond(false)}
            >
              Yes, not this time
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReject(false)}>
              Go back
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-mint! text-mint-deep!"
            disabled={busy}
            onClick={() => respond(true)}
          >
            {busy ? "Saving…" : "Approve"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReject(true)}>
            Not this time
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-peach-deep text-sm font-semibold">
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
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[22px] leading-[1.2] font-bold">
        History
      </h2>
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
    </section>
  );
}
