"use client";

import { type HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { forwardRef } from "react";
import { haptic } from "@/lib/haptics";
import { press, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";

// design §10.1. Every press squishes (snappy) and releases with the bouncy
// spring; primary presses add a light haptic.

const VARIANTS = {
  primary:
    "h-[52px] px-6 bg-p text-p-deep shadow-player font-semibold rounded-pill",
  secondary:
    "h-[52px] px-6 bg-surface text-ink shadow-soft font-semibold rounded-pill",
  soft: "h-11 px-5 font-semibold rounded-pill",
  ghost: "h-11 px-3 text-ink-2 font-semibold rounded-pill",
  icon: "h-11 w-11 bg-surface text-ink shadow-soft rounded-pill",
} as const;

const SOFT_TONES = {
  mint: "bg-mint-soft text-mint-deep",
  frost: "bg-frost-soft text-frost-deep",
  peach: "bg-peach-soft text-peach-deep",
  butter: "bg-butter-soft text-butter-deep",
  blush: "bg-blush-soft text-blush-deep",
  p: "bg-p-soft text-p-deep",
} as const;

export type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: keyof typeof VARIANTS;
  /** For the soft variant: which semantic soft shade to use. */
  tone?: keyof typeof SOFT_TONES;
  children?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", tone = "p", className = "", onClick, ...props },
    ref,
  ) {
    return (
      <m.button
        ref={ref}
        whileTap={props.disabled ? undefined : press}
        transition={spring.bouncy}
        onClick={(e) => {
          if (variant === "primary") haptic("press");
          playSound("tap");
          onClick?.(e);
        }}
        {...props}
        className={`inline-flex shrink-0 items-center justify-center gap-2 select-none disabled:opacity-60 ${VARIANTS[variant]} ${variant === "soft" ? SOFT_TONES[tone] : ""} ${className}`}
      />
    );
  },
);
