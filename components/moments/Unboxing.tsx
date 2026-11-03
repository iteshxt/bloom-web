"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sparklePath } from "@/components/icons/geometry";
import { LineIcon } from "@/components/icons/line";
import { Puff, Shine, SoftBlur } from "@/components/icons/Puff";
import { Button } from "@/components/ui/Button";
import { burstConfetti } from "@/lib/confetti";
import { haptic } from "@/lib/haptics";
import { dur, spring } from "@/lib/motion";
import { useReducedMotionPref } from "@/lib/prefs";
import { playSound } from "@/lib/sound";

// Gift unboxing (design §11.8, §12.4): tap three times. Tap 1 squishes and
// wobbles the box, tap 2 wobbles harder with light peeking out, tap 3
// unties the ribbon, pops the lid and raises the keepsake card, which flips
// to face you. Long-press skips to the reveal; with reduced motion one tap
// crossfades straight to the card.

export interface Revealed {
  title: string | null;
  details: string | null;
  linkUrl: string | null;
}

export function Unboxing({
  milestone,
  partnerName,
  color,
  reveal,
  onReceived,
  onClose,
}: {
  milestone: number;
  partnerName: string;
  color: string;
  /** Opens the gift on the server and returns what's inside. */
  reveal: () => Promise<Revealed | null>;
  onReceived: () => Promise<void>;
  onClose: () => void;
}) {
  const reduced = useReducedMotionPref();
  const [taps, setTaps] = useState(0);
  const [gift, setGift] = useState<Revealed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const box = useAnimationControls();
  const opening = useRef(false);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function open() {
    if (opening.current) return;
    opening.current = true;
    setTaps(3);
    playSound("rustle");
    haptic("success");
    // Let the ribbon untie and the lid pop before the card rises.
    const [g] = await Promise.all([
      reveal(),
      new Promise((r) => setTimeout(r, reduced ? 0 : 900)),
    ]);
    if (!g) {
      opening.current = false;
      setTaps(2);
      return setError("This gift can’t be opened yet.");
    }
    setGift(g);
    setTimeout(() => burstConfetti(color, { x: 0.5, y: 0.4 }), 500);
  }

  function tap() {
    if (gift || opening.current) return;
    if (reduced) return void open();
    const n = taps + 1;
    if (n >= 3) return void open();
    setTaps(n);
    playSound("pop");
    haptic("press");
    const deg = n === 1 ? 6 : 10;
    box.start({
      scaleY: [1, 0.88, 1.04, 1],
      rotate: [0, -deg, deg, -deg / 2, 0],
      transition: { duration: 0.5 },
    });
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden px-6"
      data-player-color={color}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur.base }}
      role="dialog"
      aria-modal="true"
      aria-label={`Your ${milestone}-day gift from ${partnerName}`}
    >
      {/* a dim sky behind */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--sky-night-top), var(--sky-night-bottom))",
        }}
      />
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="bg-surface text-ink shadow-soft rounded-pill absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 inline-flex h-11 w-11 items-center justify-center"
      >
        <LineIcon name="close" />
      </button>

      <AnimatePresence mode="wait">
        {!gift ? (
          <motion.div
            key="box"
            className="relative flex flex-col items-center gap-6"
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: dur.fast }}
          >
            <motion.button
              type="button"
              aria-label={`Tap to open (${3 - Math.min(taps, 3)} more)`}
              className="relative"
              onClick={tap}
              onPointerDown={() => {
                press.current = setTimeout(() => void open(), 600);
              }}
              onPointerUp={() => clearTimeout(press.current)}
              onPointerLeave={() => clearTimeout(press.current)}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.bouncy}
            >
              {taps >= 2 && (
                <span className="bg-butter/40 absolute inset-0 -z-10 scale-125 rounded-full blur-2xl" />
              )}
              <motion.div
                animate={box}
                className={`svg-origin-bottom ${taps === 0 ? "animate-wiggle" : ""}`}
              >
                <GiftBox size={180} glow={taps >= 2} untie={taps >= 3} />
              </motion.div>
            </motion.button>
            <div className="flex flex-col items-center gap-2 text-white">
              <p className="font-display text-xl font-bold">
                {taps >= 3 ? "Opening…" : "Tap to open"}
              </p>
              <div className="flex gap-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`rounded-pill h-2.5 w-2.5 transition-colors ${i < taps ? "bg-butter" : "bg-white/35"}`}
                  />
                ))}
              </div>
              {error && (
                <p role="alert" className="text-peach text-sm font-semibold">
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.section
            key="card"
            className="bg-surface shadow-float relative flex w-full max-w-[360px] flex-col gap-3 rounded-xl p-6"
            style={{ transformPerspective: 900 }}
            initial={
              reduced ? { opacity: 0 } : { y: 120, rotateY: 90, opacity: 0 }
            }
            animate={{ y: 0, rotateY: 0, opacity: 1 }}
            transition={
              reduced
                ? { duration: 0.16 }
                : { ...spring.floaty, rotateY: { duration: 0.5, delay: 0.3 } }
            }
          >
            <span className="text-p-ink text-sm font-semibold">
              Your {milestone}-day gift
            </span>
            <h2 className="font-display text-[32px] leading-[1.1] font-extrabold">
              {gift.title}
            </h2>
            {gift.details && (
              <p className="text-ink-2 whitespace-pre-line">{gift.details}</p>
            )}
            {gift.linkUrl && (
              <a
                href={gift.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-p-soft text-p-deep rounded-pill inline-flex h-11 items-center gap-2 self-start px-4 font-semibold"
              >
                <LineIcon name="link" size={18} /> Open link
              </a>
            )}
            <p className="font-display text-p-ink mt-1 text-sm font-semibold">
              From {partnerName}, for {milestone} days
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onReceived();
                  setBusy(false);
                  onClose();
                }}
              >
                Mark as received
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Done
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}

/** The big gift box: blush with a butter ribbon. When untied the ribbon
 *  halves slide apart and the lid pops up and spins away. */
function GiftBox({
  size,
  glow,
  untie,
}: {
  size: number;
  glow: boolean;
  untie: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="overflow-visible"
      aria-hidden
    >
      <defs>
        <SoftBlur id="ub-s" std={2} />
      </defs>
      {glow &&
        [0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M60 48L${40 + i * 10} ${8 - (i % 2) * 6}`}
            stroke="var(--butter)"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.7}
            className="animate-twinkle"
            style={{
              animationDuration: "1.2s",
              animationDelay: `-${i * 0.2}s`,
            }}
          />
        ))}
      <Puff
        id="ub-b"
        tone="blush"
        shade={[-3, -4]}
        shape={(p) => (
          <rect
            x={20}
            y={54}
            width={80}
            height={56}
            rx={12}
            {...(p as object)}
          />
        )}
      />
      <motion.g
        animate={{ opacity: untie ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <rect
          x={54}
          y={54}
          width={12}
          height={56}
          rx={3}
          fill="var(--butter)"
        />
      </motion.g>
      <motion.g
        className="svg-origin-center"
        animate={
          untie
            ? { y: -120, rotate: 160, opacity: 0 }
            : { y: 0, rotate: 0, opacity: 1 }
        }
        transition={untie ? { ...spring.bouncy, delay: 0.3 } : spring.soft}
      >
        <Puff
          id="ub-l"
          tone="blush"
          shape={(p) => (
            <rect
              x={14}
              y={38}
              width={92}
              height={22}
              rx={10}
              {...(p as object)}
            />
          )}
        />
        <rect
          x={54}
          y={38}
          width={12}
          height={22}
          rx={3}
          fill="var(--butter)"
        />
        <motion.g
          animate={untie ? { x: -16, opacity: 0 } : { x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ellipse
            cx={46}
            cy={30}
            rx={15}
            ry={10}
            transform="rotate(20 46 30)"
            fill="var(--butter)"
          />
        </motion.g>
        <motion.g
          animate={untie ? { x: 16, opacity: 0 } : { x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ellipse
            cx={74}
            cy={30}
            rx={15}
            ry={10}
            transform="rotate(-20 74 30)"
            fill="var(--butter)"
          />
        </motion.g>
        <circle cx={60} cy={34} r={7} fill="var(--butter)" />
        <Shine filter="ub-s" cx={30} cy={44} rx={8} ry={3} rotate={0} />
      </motion.g>
      <path
        d={sparklePath(102, 30, 6)}
        fill="var(--butter)"
        className="animate-twinkle"
      />
      <path
        d={sparklePath(16, 64, 4)}
        fill="var(--white)"
        className="animate-twinkle"
        style={{ animationDelay: "-1s" }}
      />
    </svg>
  );
}
