"use client";

import { useEffect, useRef } from "react";
import { COLOR_NAMES, COMPANION_INFO } from "@/lib/companions";
import {
  COMPANIONS,
  PLAYER_COLORS,
  type Companion as Kind,
  type PlayerColor,
} from "@/lib/validation/onboarding";
import { Companion } from "./Companion";

// design §11.2 step 2: a horizontal carousel of the six creatures (140 px,
// idle) plus three colour dots. The chosen colour dresses the scarf at once.

export function CompanionPicker({
  kind,
  color,
  onKind,
  onColor,
}: {
  kind: Kind;
  color: PlayerColor;
  onKind: (k: Kind) => void;
  onColor: (c: PlayerColor) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<Kind, HTMLLabelElement | null>>>({});
  useEffect(() => {
    // Centre the current pick by scrolling only the carousel. (scrollIntoView
    // would also scroll every scrollable parent sideways, like a sheet.)
    const el = refs.current[kind];
    const r = row.current;
    if (el && r) {
      r.scrollLeft = el.offsetLeft - (r.clientWidth - el.clientWidth) / 2;
    }
    // Only on mount: later picks are already in view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-5" data-player-color={color}>
      {/* min-w-0: a fieldset otherwise refuses to shrink below its
          content, so the row never overflows and can't be swiped. */}
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold">Companion</legend>
        <div
          ref={row}
          className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-3"
        >
          {COMPANIONS.map((c) => (
            <label
              key={c}
              ref={(el) => {
                refs.current[c] = el;
              }}
              className={`bg-surface flex w-[168px] shrink-0 cursor-pointer snap-center flex-col items-center rounded-lg px-3 pt-2 pb-4 transition-shadow ${
                kind === c ? "ring-p shadow-player ring-4" : "shadow-soft"
              }`}
            >
              <input
                type="radio"
                name="companion"
                value={c}
                checked={kind === c}
                onChange={() => onKind(c)}
                className="sr-only"
              />
              <Companion
                kind={c}
                mood={kind === c ? "wave" : "idle"}
                size={140}
                streak={20}
              />
              <span className="font-display text-lg font-semibold">
                {COMPANION_INFO[c].name}
              </span>
              <span className="text-ink-2 text-center text-xs">
                {COMPANION_INFO[c].blurb}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <ColorDots value={color} onChange={onColor} />
    </div>
  );
}

export function ColorDots({
  value,
  onChange,
}: {
  value: PlayerColor;
  onChange: (c: PlayerColor) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold">Your colour</legend>
      <div className="flex gap-3">
        {PLAYER_COLORS.map((c) => (
          <label key={c} data-player-color={c} className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value={c}
              checked={value === c}
              onChange={() => onChange(c)}
              className="peer sr-only"
            />
            <span className="rounded-pill bg-p-soft text-p-deep peer-checked:ring-p peer-focus-visible:outline-p flex h-11 items-center gap-2 px-4 font-semibold peer-checked:ring-4 peer-focus-visible:outline-2">
              <span className="rounded-pill bg-p h-5 w-5" aria-hidden />
              {COLOR_NAMES[c]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
