import type { ButtonHTMLAttributes } from "react";

// design.md §10.1. Spring presses and sounds arrive with the design pass.
const VARIANTS = {
  primary:
    "h-[52px] px-6 bg-p text-p-deep shadow-player font-semibold rounded-pill",
  secondary:
    "h-[52px] px-6 bg-surface text-ink shadow-soft font-semibold rounded-pill",
  ghost: "h-11 px-3 text-ink-2 font-semibold rounded-pill",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 transition-transform disabled:opacity-60 motion-safe:active:scale-[0.96] ${VARIANTS[variant]} ${className}`}
    />
  );
}
