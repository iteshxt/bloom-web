"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bloom } from "@/components/bloom/Bloom";
import { Companion } from "@/components/companions/Companion";
import { heartPath, sparklePath } from "@/components/icons/geometry";
import { PuffyIcon } from "@/components/icons/puffy";
import { Button } from "@/components/ui/Button";
import { growthFor } from "@/lib/bloom";
import { burstConfetti } from "@/lib/confetti";
import { weekday } from "@/lib/format/ist";
import { haptic } from "@/lib/haptics";
import { dur, ease, spring } from "@/lib/motion";
import { useReducedMotionPref } from "@/lib/prefs";
import { levelTitle } from "@/lib/push/copy";
import { playSound } from "@/lib/sound";
import { toast } from "@/lib/toast";
import type { Moment } from "@/lib/moments";
import type { Companion as Kind } from "@/lib/players";
import { MomentOverlay, RollingNumber } from "./MomentOverlay";

// The signature moments (design §12.4), played one at a time by
// <MomentHost>. Each has one star (the creature, the flower or the box);
// everything else supports it.

export interface MomentCast {
  name: string;
  kind: Kind;
  color: string;
  streak: number;
  tokensMax: number;
  partnerName: string;
}

export function MomentHost({
  queue,
  cast,
  onDone,
}: {
  queue: Moment[];
  cast: MomentCast;
  /** The first moment in the queue has finished. */
  onDone: () => void;
}) {
  const m = queue[0];
  return (
    <AnimatePresence mode="wait">
      {m && (
        <MomentView
          key={JSON.stringify(m)}
          moment={m}
          cast={cast}
          onDone={onDone}
        />
      )}
    </AnimatePresence>
  );
}

function MomentView({
  moment,
  cast,
  onDone,
}: {
  moment: Moment;
  cast: MomentCast;
  onDone: () => void;
}) {
  switch (moment.kind) {
    case "day":
      return <DayComplete streak={moment.streak} onDone={onDone} />;
    case "rainbow":
      return <BothDone onDone={onDone} />;
    case "ice":
      return <OnIce cast={cast} onDone={onDone} />;
    case "thaw":
      return <Thaw cast={cast} day={moment.day} onDone={onDone} />;
    case "shatter":
      return <Shatter cast={cast} streak={moment.streak} onDone={onDone} />;
    case "milestone":
      return (
        <Milestone cast={cast} milestone={moment.milestone} onDone={onDone} />
      );
    case "level":
      return <LevelUp cast={cast} level={moment.level} onDone={onDone} />;
    case "nudge":
      return (
        <NudgeReceived
          from={cast.partnerName}
          message={moment.message}
          onDone={onDone}
        />
      );
  }
}

/** Day complete (~1.6 s, overlay-light): the seed sprouts and the creature
 *  hops on the page itself; here, a petal burst, the sound, the haptic and
 *  the toast. */
function DayComplete({
  streak,
  onDone,
}: {
  streak: number;
  onDone: () => void;
}) {
  useEffect(() => {
    playSound("pop");
    haptic("success");
    const t1 = setTimeout(() => toast(`Day ${streak} done`, "sprout"), 900);
    const t2 = setTimeout(onDone, 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [streak, onDone]);
  return <PetalBurst />;
}

/** A nudge arrived: the partner's creature waves on home (the page reads
 *  this moment) while a toast shows the message. */
function NudgeReceived({
  from,
  message,
  onDone,
}: {
  from: string;
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    playSound("whoosh");
    toast(`${from}: ${message}`, "wave");
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [from, message, onDone]);
  return null;
}

function BothDone({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    playSound("chime");
    toast("You both bloomed today", "bloom");
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);
  return null;
}

/** 8 small petals bursting from the left island (design §12.4, t = 420). */
function PetalBurst() {
  const reduced = useReducedMotionPref();
  if (reduced) return null;
  return (
    <div className="pointer-events-none fixed top-[150px] left-[25%] z-[65] max-[430px]:left-[22%] md:left-[calc(50%-110px)]">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className={`absolute h-3 w-2 rounded-full ${i % 2 ? "bg-butter" : "bg-p"}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
            animate={{
              x: Math.cos(a) * 64,
              y: Math.sin(a) * 64 - 18,
              opacity: 0,
              scale: 1,
              rotate: 160,
            }}
            transition={{ duration: 0.9, delay: 0.42, ease: ease.out }}
          />
        );
      })}
    </div>
  );
}

/** Streak on ice (1.4 s): the snow cloud slides in, an ice cube forms
 *  around the creature from the bottom up, then the frost banner. */
function OnIce({ cast, onDone }: { cast: MomentCast; onDone: () => void }) {
  return (
    <MomentOverlay
      label="Your flower is frosted"
      onDone={onDone}
      autoCloseMs={2600}
      backdrop="frost"
    >
      <motion.svg
        viewBox="0 0 80 52"
        className="w-24"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={spring.floaty}
        aria-hidden
      >
        <g fill="var(--frost)">
          <circle cx={22} cy={18} r={10} />
          <circle cx={38} cy={12} r={12} />
          <circle cx={55} cy={18} r={10} />
          <rect x={12} y={16} width={56} height={12} rx={6} />
        </g>
      </motion.svg>
      <div className="relative" data-player-color={cast.color}>
        <Companion kind={cast.kind} mood="sad" size={160} />
        <motion.div
          className="bg-frost/50 absolute inset-x-3 top-6 bottom-1 origin-bottom rounded-[28px] border-2 border-white/70"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: ease.out }}
        />
      </div>
      <motion.p
        className="font-display text-frost-deep mt-4 text-[28px] font-extrabold"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, ...spring.soft }}
      >
        Your flower is frosted
      </motion.p>
      <p className="text-frost-deep mt-1 text-center">
        Ask {cast.partnerName} for a restore.
      </p>
    </MomentOverlay>
  );
}

/** Restore approved: the ice cracks and melts, droplets become hearts, the
 *  creature shakes off and hops, the flower gets its colour back. */
function Thaw({
  cast,
  day,
  onDone,
}: {
  cast: MomentCast;
  day: string;
  onDone: () => void;
}) {
  useEffect(() => {
    playSound("crack");
    playSound("melt", 300);
    haptic("success");
    const t = setTimeout(
      () => toast(`${cast.partnerName} restored your ${weekday(day)}`, "heart"),
      1600,
    );
    return () => clearTimeout(t);
  }, [cast.partnerName, day]);

  return (
    <MomentOverlay
      label={`${cast.partnerName} restored your ${weekday(day)}`}
      onDone={onDone}
      autoCloseMs={3200}
    >
      <div className="relative flex items-end" data-player-color={cast.color}>
        <motion.div
          initial={{ x: 0 }}
          animate={{
            x: [0, -6, 6, -6, 6, -6, 6, 0],
            y: [0, 0, 0, 0, 0, 0, -18, 0],
          }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <Companion kind={cast.kind} mood="happy" size={150} />
        </motion.div>
        <motion.div
          initial={{ filter: "saturate(0.6)" }}
          animate={{ filter: "saturate(1)" }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <Bloom streak={cast.streak} size={110} restored />
        </motion.div>

        {/* the ice: cracks, then melts downward */}
        <motion.svg
          viewBox="0 0 260 170"
          className="absolute inset-0 h-full w-full"
          initial={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
          animate={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }}
          transition={{ delay: 0.3, duration: 0.6, ease: ease.out }}
          aria-hidden
        >
          <rect
            x={6}
            y={6}
            width={248}
            height={158}
            rx={28}
            fill="var(--frost)"
            opacity={0.5}
            stroke="var(--white)"
            strokeWidth={2}
          />
          <motion.path
            d="M130 10L118 52L140 80L122 120M140 80L182 96M118 52L80 60"
            stroke="var(--white)"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.svg>

        {/* droplets that turn into hearts floating up */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.svg
            key={i}
            viewBox="0 0 20 20"
            className="particle absolute w-5"
            style={{ left: `${18 + i * 16}%`, top: "40%" }}
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              y: [0, 30, -90],
              opacity: [0, 1, 0],
              scale: [0.4, 0.6, 1],
            }}
            transition={{
              delay: 0.7 + i * 0.06,
              duration: 1.4,
              ease: ease.out,
            }}
            aria-hidden
          >
            <path d={heartPath(10, 10, 18)} fill="var(--blush)" />
          </motion.svg>
        ))}
      </div>
      <motion.p
        className="font-display mt-4 text-center text-[28px] font-extrabold text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
      >
        Thawed!
      </motion.p>
    </MomentOverlay>
  );
}

/** Restore declined or expired: a soft shatter, never violent. The flower
 *  sinks back into the soil and a new seed sprouts. */
function Shatter({
  cast,
  streak,
  onDone,
}: {
  cast: MomentCast;
  streak: number;
  onDone: () => void;
}) {
  useEffect(() => {
    playSound("crack");
    haptic("error");
  }, []);
  return (
    <MomentOverlay
      label="A new seed is planted. Day 1 starts now."
      onDone={onDone}
    >
      <div
        className="relative h-[200px] w-[220px]"
        data-player-color={cast.color}
      >
        {/* six ice pieces drifting outward */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              className="bg-frost/70 particle absolute top-1/2 left-1/2 h-10 w-8 rounded-[10px] border border-white/70"
              initial={{ x: -16, y: -20, opacity: 1, rotate: 0 }}
              animate={{
                x: Math.cos(a) * 110 - 16,
                y: Math.sin(a) * 90 - 20,
                opacity: 0,
                rotate: i % 2 ? 40 : -40,
              }}
              transition={{ delay: 0.25, ...spring.floaty }}
            />
          );
        })}
        <AnimatePresence>
          <motion.div
            key="old"
            className="absolute inset-0 flex items-end justify-center"
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: 40, scale: 0.6 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Bloom streak={Math.max(1, streak)} size={160} />
          </motion.div>
          <motion.div
            key="seed"
            className="absolute inset-0 flex items-end justify-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, ...spring.bouncy }}
          >
            <Bloom streak={0} size={160} />
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.div
        className="bg-surface shadow-float mt-2 flex flex-col items-center gap-2 rounded-xl p-6 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, ...spring.soft }}
      >
        <p className="font-display text-[22px] font-bold">
          A new seed is planted
        </p>
        <p className="text-ink-2">
          {streak > 0 ? `Your ${streak}-day streak ended. ` : ""}Day 1 starts
          now.
        </p>
        <Button className="mt-2" onClick={onDone}>
          Let’s grow
        </Button>
      </motion.div>
    </MomentOverlay>
  );
}

/** Milestone (~4.5 s, full screen): the creature walks to a gift on a
 *  pedestal and jumps, the flower grows into its new stage, confetti, the
 *  title rolls in, three heart-coins drop into the pouch. */
function Milestone({
  cast,
  milestone,
  onDone,
}: {
  cast: MomentCast;
  milestone: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const reduced = useReducedMotionPref();
  const stage = growthFor(milestone).label.toLowerCase();
  const title = `${milestone} days!`;

  useEffect(() => {
    const ts = [
      setTimeout(() => {
        playSound("chime");
        haptic("milestone");
      }, 1300),
      setTimeout(() => burstConfetti(cast.color), 2200),
      ...[0, 1, 2].map((i) =>
        setTimeout(() => playSound("clink"), 3200 + i * 120),
      ),
    ];
    return () => ts.forEach(clearTimeout);
  }, [cast.color]);

  return (
    <MomentOverlay
      label={`${title} Your ${stage} bloomed.`}
      onDone={onDone}
      backdrop="none"
    >
      <div
        className="fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--sky-dusk-top), var(--sky-dusk-bottom))",
        }}
      />
      <div
        className="text-plum relative flex w-full flex-col items-center"
        data-player-color={cast.color}
      >
        <div className="relative flex h-[200px] w-full items-end justify-center">
          <motion.div
            className="absolute bottom-0"
            initial={{ x: -170 }}
            animate={{ x: -70 }}
            transition={{ duration: 1, delay: 0.3, ease: ease.out }}
          >
            <Companion kind={cast.kind} mood="celebrate" size={130} />
          </motion.div>
          <motion.div
            className="absolute right-6 bottom-2 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ...spring.floaty }}
          >
            <PuffyIcon name="giftOpen" size={72} />
            <span className="bg-wood rounded-pill -mt-2 h-3 w-16" />
          </motion.div>
          <motion.div
            className="absolute bottom-0"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.08, 1], opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
          >
            <Bloom streak={milestone} size={150} />
          </motion.div>
        </div>
        <h2
          className="font-display mt-4 flex text-[64px] leading-none font-extrabold"
          aria-hidden
        >
          {title.split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: reduced ? 0 : 2.6 + i * 0.05,
                ...spring.bouncy,
              }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </h2>
        <motion.p
          className="mt-2 text-lg font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.9 }}
        >
          Your {stage} bloomed. {cast.partnerName}’s gift is unlocked.
        </motion.p>
        <div
          className="mt-4 flex gap-2"
          aria-label={`${cast.tokensMax} restores refilled`}
        >
          {Array.from({ length: cast.tokensMax }, (_, i) => (
            <motion.span
              key={i}
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: [-120, 0, -14, 0, -5, 0], opacity: 1 }}
              transition={{ delay: 3.2 + i * 0.12, duration: 0.7 }}
            >
              <PuffyIcon name="coin" size={36} />
            </motion.span>
          ))}
        </div>
        <motion.div
          className="mt-6 flex w-full flex-col gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.8, ...spring.soft }}
        >
          <Button
            onClick={() => {
              onDone();
              router.push("/gifts");
            }}
          >
            Open gift
          </Button>
          <Button variant="ghost" className="text-plum!" onClick={onDone}>
            Later
          </Button>
        </motion.div>
      </div>
    </MomentOverlay>
  );
}

/** Level up: a crown drops onto the creature, the number rolls, the new
 *  title fades in, a ring of butter sparkles. */
function LevelUp({
  cast,
  level,
  onDone,
}: {
  cast: MomentCast;
  level: number;
  onDone: () => void;
}) {
  useEffect(() => {
    playSound("chime");
    haptic("success");
  }, []);
  return (
    <MomentOverlay
      label={`Level ${level}: ${levelTitle(level)}`}
      onDone={onDone}
    >
      <motion.div
        className="bg-surface shadow-float flex w-full flex-col items-center gap-2 rounded-xl px-6 pt-4 pb-6"
        data-player-color={cast.color}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.bouncy}
      >
        <div className="relative">
          <svg
            viewBox="0 0 200 200"
            className="particle absolute -inset-6 h-[calc(100%+48px)] w-[calc(100%+48px)]"
            aria-hidden
          >
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <motion.path
                  key={i}
                  d={sparklePath(
                    Math.round((100 + 86 * Math.cos(a)) * 100) / 100,
                    Math.round((100 + 86 * Math.sin(a)) * 100) / 100,
                    6,
                  )}
                  fill="var(--butter)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0.6], scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.04, duration: 0.6 }}
                />
              );
            })}
          </svg>
          <Companion kind={cast.kind} mood="happy" size={140} />
          <motion.span
            className="absolute -top-2 left-1/2 -translate-x-1/2"
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, ...spring.bouncy }}
          >
            <PuffyIcon name="crown" size={56} />
          </motion.span>
        </div>
        <p className="font-display text-[40px] leading-none font-extrabold">
          Level <RollingNumber value={level} />
        </p>
        <motion.p
          className="text-ink-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: dur.slow }}
        >
          New title:{" "}
          <span className="text-butter-ink font-semibold">
            {levelTitle(level)}
          </span>
        </motion.p>
        <Button className="mt-3 w-full" onClick={onDone}>
          Keep growing
        </Button>
      </motion.div>
    </MomentOverlay>
  );
}
