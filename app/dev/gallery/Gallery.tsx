"use client";

import { useState } from "react";
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
  return (
    <main
      data-player-color="blush"
      className="mx-auto flex w-full max-w-[430px] flex-col gap-8 px-4 py-8"
    >
      <Wordmark />

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
        <div className="flex gap-2 overflow-x-auto">
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
