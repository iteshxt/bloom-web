"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { dur } from "@/lib/motion";

// The stage every signature moment plays on (design §11.9, §12.4): full
// screen, announced politely to screen readers, and skippable with a tap
// after 1.2 s. With reduced motion, moments show their final state.

export const SKIP_AFTER_MS = 1200;

export function MomentOverlay({
  label,
  onDone,
  autoCloseMs,
  backdrop = "dim",
  children,
}: {
  /** What a screen reader hears. */
  label: string;
  onDone: () => void;
  /** Close by itself after this long; otherwise it waits for a tap. */
  autoCloseMs?: number;
  backdrop?: "dim" | "frost" | "none";
  children: ReactNode;
}) {
  const [canSkip, setCanSkip] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const skip = setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    const close = autoCloseMs
      ? setTimeout(() => done.current(), autoCloseMs)
      : undefined;
    return () => {
      clearTimeout(skip);
      clearTimeout(close);
    };
  }, [autoCloseMs]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur.base }}
      onClick={() => canSkip && done.current()}
    >
      <div
        className={`absolute inset-0 ${
          backdrop === "frost"
            ? "bg-frost-soft/80 backdrop-blur-[6px]"
            : backdrop === "dim"
              ? "bg-ink/25 backdrop-blur-[6px]"
              : ""
        }`}
      />
      <p className="sr-only" aria-live="polite">
        {label}
      </p>
      <div className="relative flex w-full max-w-[398px] flex-col items-center">
        {children}
      </div>
    </motion.div>,
    document.body,
  );
}

/** design §12.2 "Number change": digits roll like a slot machine. */
export function RollingNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const digits = String(value).split("");
  return (
    <span className={`tabular inline-flex overflow-hidden ${className}`}>
      {digits.map((d, i) => (
        <span key={`${digits.length}-${i}`} className="relative inline-block">
          <motion.span
            key={d}
            className="inline-block"
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 24,
              delay: i * 0.04,
            }}
          >
            {d}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
