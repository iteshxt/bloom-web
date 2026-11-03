"use client";

import { useState } from "react";
import LoginPage from "@/app/(auth)/login/page";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { Bloom } from "@/components/bloom/Bloom";
import { CheckInSheet } from "@/components/game/CheckInSheet";
import { BADGES } from "@/lib/badges/catalog";
import { MomentHost } from "@/components/moments/Moments";
import { Unboxing } from "@/components/moments/Unboxing";
import { enqueueMoments, useMoments } from "@/lib/useMoments";
import { Companion, type Mood } from "@/components/companions/Companion";
import { LineIcon } from "@/components/icons/line";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";
import { Island } from "@/components/sky/Island";
import { Rainbow } from "@/components/sky/Rainbow";
import { SkyScene } from "@/components/sky/SkyScene";
import { WaveEdge } from "@/components/sky/WaveEdge";
import { Button } from "@/components/ui/Button";
import { Chip, StatChip } from "@/components/ui/Chip";
import { PetalSpinner, ProgressBar } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { Wordmark } from "@/components/ui/Wordmark";
import { toast } from "@/lib/toast";
import type { SkyBand } from "@/lib/sky";

const MOODS: Mood[] = [
  "idle",
  "waiting",
  "urgent",
  "happy",
  "sleeping",
  "frozen",
  "celebrate",
  "sad",
  "wave",
];
const BANDS: SkyBand[] = ["dawn", "day", "dusk", "night", "grace", "deep"];
const PUFFY: PuffyName[] = [
  "bloom",
  "ice",
  "coin",
  "gift",
  "giftOpen",
  "trophy",
  "crown",
  "star",
  "map",
  "calendar",
  "wave",
  "hourglass",
  "sprout",
  "check",
  "scroll",
  "chat",
  "gear",
  "code",
  "moon",
  "sun",
  "bell",
  "heart",
  "home",
  "face",
  "lock",
];

export function Gallery() {
  const [sheet, setSheet] = useState(false);
  const [unbox, setUnbox] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const moments = useMoments(null, null);
  return (
    <main
      data-player-color="blush"
      className="mx-auto flex w-full max-w-[430px] flex-col gap-8 px-4 py-8"
    >
      <Wordmark />

      <MomentHost
        queue={moments.queue}
        onDone={moments.next}
        cast={{
          name: "Asha",
          kind: "mochi",
          color: "blush",
          streak: 23,
          tokensMax: 3,
          partnerName: "Riya",
        }}
      />
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-bold">Badges</h2>
        <BadgeGrid
          earned={Object.fromEntries(
            Object.keys(BADGES)
              .slice(0, 13)
              .map((k) => [k, "2026-11-04T10:00:00Z"]),
          )}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-bold">Sign in</h2>
        <div className="-mx-4 h-[760px] overflow-hidden rounded-xl">
          <LoginPage />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-bold">Moments</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Day complete", { kind: "day", streak: 24 }],
              ["Both done", { kind: "rainbow" }],
              ["On ice", { kind: "ice", day: "2026-11-01" }],
              ["Thaw", { kind: "thaw", day: "2026-11-01" }],
              ["Shatter", { kind: "shatter", day: "2026-11-01", streak: 23 }],
              ["Milestone", { kind: "milestone", milestone: 30 }],
              ["Level up", { kind: "level", level: 7 }],
            ] as const
          ).map(([label, m]) => (
            <Button
              key={label}
              variant="secondary"
              className="h-11! text-sm"
              onClick={() => enqueueMoments([m])}
            >
              {label}
            </Button>
          ))}
          <Button
            variant="secondary"
            className="h-11! text-sm"
            onClick={() => setUnbox(true)}
          >
            Unboxing
          </Button>
          <Button
            variant="secondary"
            className="h-11! text-sm"
            onClick={() => setCheckIn(true)}
          >
            Check-in sheet
          </Button>
        </div>
        <CheckInSheet
          open={checkIn}
          onClose={() => setCheckIn(false)}
          partnerName="Riya"
        />
        {unbox && (
          <Unboxing
            milestone={30}
            partnerName="Riya"
            color="blush"
            reveal={async () => ({
              title: "A cozy weekend away",
              details: "Pack light. Bring the board games.",
              linkUrl: null,
            })}
            onReceived={async () => undefined}
            onClose={() => setUnbox(false)}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] font-bold">Companions</h2>
        {(["mochi", "tofu", "pip", "bun", "puff", "sprig"] as const).map(
          (kind, ki) => (
            <div key={kind} className="flex flex-col gap-1">
              <h3 className="font-display font-semibold">{kind}</h3>
              <div
                className="grid grid-cols-5 gap-1"
                data-player-color={["blush", "sky", "lilac"][ki % 3]}
              >
                {MOODS.map((m) => (
                  <div
                    key={m}
                    className="bg-surface flex flex-col items-center rounded-md"
                  >
                    <Companion kind={kind} mood={m} size={64} streak={30} />
                    <span className="text-ink-3 text-[10px]">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        )}
        <div className="bg-surface flex justify-center rounded-md">
          <Companion kind="mochi" mood="sad" size={140} color="sky" />
          <Companion kind="bun" mood="celebrate" size={140} color="lilac" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] font-bold">Flowers</h2>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 3, 6, 7, 10, 14, 15, 22, 29, 30, 40, 50, 75, 100, 140].map(
            (n, i) => (
              <div
                key={n}
                data-player-color={["blush", "sky", "lilac"][i % 3]}
                className="bg-surface flex flex-col items-center rounded-md p-1"
              >
                <Bloom streak={n} size={80} />
                <span className="text-ink-3 text-xs">{n}</span>
              </div>
            ),
          )}
          <div className="bg-surface flex flex-col items-center rounded-md p-1">
            <Bloom streak={9} size={80} frozen />
            <span className="text-ink-3 text-xs">9 frozen</span>
          </div>
          <div className="bg-surface flex flex-col items-center rounded-md p-1">
            <Bloom streak={23} size={80} frozen />
            <span className="text-ink-3 text-xs">23 frozen</span>
          </div>
          <div className="bg-surface flex flex-col items-center rounded-md p-1">
            <Bloom streak={23} size={80} restored />
            <span className="text-ink-3 text-xs">23 restored</span>
          </div>
          <div className="bg-surface flex flex-col items-center rounded-md p-1">
            <Bloom streak={4} size={40} />
            <span className="text-ink-3 text-xs">40 px</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] font-bold">Skies</h2>
        {BANDS.map((band, i) => (
          <div key={band} className="overflow-hidden rounded-lg">
            <SkyScene
              band={band}
              petals={band === "dusk"}
              className="h-[300px]"
            >
              <span className="glass rounded-pill absolute top-3 left-3 px-3 py-1 text-sm font-semibold">
                {band}
              </span>
              <div className="absolute inset-x-0 bottom-10 flex justify-around">
                <Island frozen={i === 3}>
                  <span className="h-16 w-10" />
                </Island>
                <Island bobDelay={2}>
                  <span className="h-16 w-10" />
                </Island>
              </div>
              {band === "day" && (
                <Rainbow className="absolute bottom-24 left-1/2 w-48 -translate-x-1/2" />
              )}
              <WaveEdge className="absolute inset-x-0 bottom-0" />
            </SkyScene>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] font-bold">Puffy icons</h2>
        <div className="grid grid-cols-5 gap-3">
          {PUFFY.map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <PuffyIcon name={n} size={56} />
              <span className="text-ink-3 text-xs">{n}</span>
            </div>
          ))}
        </div>
        <div className="text-ink flex flex-wrap gap-3">
          {(
            [
              "home",
              "map",
              "gift",
              "me",
              "bell",
              "gear",
              "close",
              "back",
              "sync",
              "copy",
              "share",
              "plus",
              "minus",
              "check",
              "lock",
              "link",
            ] as const
          ).map((n) => (
            <LineIcon key={n} name={n} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-bold">Components</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="soft" tone="mint">
            Approve
          </Button>
          <Button variant="ghost">Not this time</Button>
          <Button variant="icon" aria-label="Settings">
            <LineIcon name="gear" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone="mint" icon="check">
            Approved
          </Chip>
          <Chip tone="peach">Not this time</Chip>
          <Chip tone="frost" icon="ice">
            +1 make-up
          </Chip>
          <Chip tone="butter" icon="coin">
            2 left
          </Chip>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <StatChip icon="hourglass" value="23" label="day streak" />
          <StatChip icon="crown" value="6" label="level" />
        </div>
        <ProgressBar value={34} max={60} tone="butter" label="XP" />
        <div className="text-p-deep flex items-center gap-2">
          <PetalSpinner /> Loading
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open sheet
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast("Day 24 done", "sprout")}
          >
            Toast
          </Button>
        </div>
      </section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="A sheet">
        <p className="text-ink-2">Drag down or tap outside to close.</p>
        <Button onClick={() => setSheet(false)}>Done</Button>
      </Sheet>
    </main>
  );
}
