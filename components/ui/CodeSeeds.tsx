"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { spring } from "@/lib/motion";

// The pair code input (design §10.10): six round "seed" slots, each
// sprouting a small leaf when a character is typed. Pasting fills them in
// sequence, 40 ms apart. One real input sits on top for typing, paste and
// screen readers.

const LENGTH = 6;

export function CodeSeeds({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clean = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, LENGTH);

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const code = clean(e.clipboardData.getData("text"));
    timers.current.forEach(clearTimeout);
    timers.current = code
      .split("")
      .map((_, i) => setTimeout(() => onChange(code.slice(0, i + 1)), i * 40));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          autoCorrect="off"
          spellCheck={false}
          maxLength={LENGTH}
          onChange={(e) => onChange(clean(e.target.value))}
          onPaste={onPaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 z-10 h-full w-full opacity-0"
        />
        <div className="flex justify-between gap-1" aria-hidden>
          {Array.from({ length: LENGTH }, (_, i) => {
            const ch = value[i];
            const active = focused && i === Math.min(value.length, LENGTH - 1);
            return (
              <span
                key={i}
                className={`bg-surface rounded-pill font-display shadow-soft relative flex h-12 w-12 items-center justify-center text-xl font-bold ${
                  active ? "ring-p ring-4" : ""
                } ${ch ? "text-p-deep" : ""}`}
              >
                <AnimatePresence>
                  {ch && (
                    <motion.svg
                      key="leaf"
                      viewBox="0 0 16 12"
                      className="svg-origin-bottom absolute -top-2.5 left-1/2 w-4 -translate-x-1/2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={spring.bouncy}
                    >
                      <path
                        d="M8 12C8 6 11 2 16 1.5C16 7 13 11 8 12Z"
                        fill="var(--leaf)"
                      />
                      <path
                        d="M8 12C8 8 5.5 5 1 4.5C1 9 4 12 8 12Z"
                        fill="var(--leaf)"
                      />
                    </motion.svg>
                  )}
                </AnimatePresence>
                {ch ?? ""}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
