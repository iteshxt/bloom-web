"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LineIcon } from "@/components/icons/line";
import { prefersReducedMotion } from "@/lib/prefs";
import { COLOR_NAMES, COMPANION_INFO } from "@/lib/companions";
import {
  COMPANIONS,
  PLAYER_COLORS,
  type Companion as Kind,
  type PlayerColor,
} from "@/lib/players";
import { Companion } from "./Companion";

// design §11.2 step 2: a horizontal carousel of the six creatures (140 px,
// idle) plus three colour dots. The chosen colour dresses the scarf at once.
// Swipe it, drag it, tap a card, or use the arrows under it.

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
  const drag = useRef<{
    id: number;
    x: number;
    left: number;
    moved: boolean;
    t: number;
    /** The card that was centred when the swipe began. */
    from: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const [centred, setCentred] = useState(COMPANIONS.indexOf(kind));

  /** Scrolls only the carousel (scrollIntoView would also scroll every
   *  scrollable parent sideways, like a sheet). */
  const centre = useCallback((i: number, smooth = true) => {
    const r = row.current;
    const el = refs.current[COMPANIONS[i]];
    if (!r || !el) return;
    const k = Math.max(0, Math.min(COMPANIONS.length - 1, i));
    const target = refs.current[COMPANIONS[k]] ?? el;
    r.scrollTo({
      left: target.offsetLeft - (r.clientWidth - target.clientWidth) / 2,
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
    });
    setCentred(k);
  }, []);

  useEffect(() => {
    centre(COMPANIONS.indexOf(kind), false);
    // Only on mount: later picks are centred as they're made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The card nearest the middle of the row. */
  function nearest(): number {
    const r = row.current;
    if (!r) return 0;
    const mid = r.scrollLeft + r.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    COMPANIONS.forEach((c, i) => {
      const el = refs.current[c];
      if (!el) return;
      const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  }

  // Swiping is handled here rather than left to the browser: the row says
  // touch-action: pan-y, so vertical scrolling stays native while sideways
  // moves come to us. That works however the page around it is set up
  // (a sheet, a scrolling panel), and a mouse can drag it too.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!row.current) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      left: row.current.scrollLeft,
      moved: false,
      t: performance.now(),
      from: nearest(),
    };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const r = row.current;
    if (!d || !r || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      r.setPointerCapture(e.pointerId);
    }
    if (d.moved) r.scrollLeft = d.left - dx;
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.moved) return;
    suppressClick.current = true;
    const dx = e.clientX - d.x;
    const fast = Math.abs(dx) / (performance.now() - d.t) > 0.5;
    let i = nearest();
    // A quick flick moves at least one card in its direction.
    if (fast && i === d.from) i = d.from + (dx < 0 ? 1 : -1);
    centre(i);
  }

  return (
    <div className="flex flex-col gap-5" data-player-color={color}>
      {/* min-w-0: a fieldset otherwise refuses to shrink below its
          content, so the row never overflows and can't be swiped. */}
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold">Companion</legend>
        <div
          ref={row}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onScroll={() => setCentred(nearest())}
          onClickCapture={(e) => {
            // The click that ends a swipe shouldn't also pick a creature.
            if (suppressClick.current) {
              e.preventDefault();
              e.stopPropagation();
              suppressClick.current = false;
            }
          }}
          className="no-scrollbar relative -mx-4 flex touch-pan-y gap-3 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-3 select-none"
        >
          {COMPANIONS.map((c, i) => (
            <label
              key={c}
              ref={(el) => {
                refs.current[c] = el;
              }}
              onClick={() => centre(i)}
              className={`bg-surface flex w-[168px] shrink-0 cursor-pointer flex-col items-center rounded-lg px-3 pt-2 pb-4 transition-shadow ${
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
        {/* Arrows and dots: the other creatures are always reachable. */}
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous companion"
            disabled={centred === 0}
            onClick={() => centre(centred - 1)}
            className="bg-surface text-ink shadow-soft rounded-pill flex h-11 w-11 items-center justify-center disabled:opacity-40"
          >
            <LineIcon name="back" size={20} />
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {COMPANIONS.map((c, i) => (
              <span
                key={c}
                className={`rounded-pill h-2 transition-all ${
                  i === centred ? "bg-p w-5" : "bg-ink-3/40 w-2"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next companion"
            disabled={centred === COMPANIONS.length - 1}
            onClick={() => centre(centred + 1)}
            className="bg-surface text-ink shadow-soft rounded-pill flex h-11 w-11 items-center justify-center disabled:opacity-40"
          >
            <LineIcon name="next" size={20} />
          </button>
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
