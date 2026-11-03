import type { InputHTMLAttributes, ReactNode } from "react";

// design.md §10.10: label above, 52 px input, player-colour focus ring.
export function TextField({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  hint?: ReactNode;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        {...props}
        className="border-line bg-surface text-ink placeholder:text-ink-3 focus:border-p focus:ring-p-soft h-[52px] rounded-sm border-[1.5px] px-4 text-base outline-none focus:ring-4"
      />
      {(error || hint) && (
        <p
          id={`${id}-note`}
          className={`text-sm ${error ? "text-peach-ink" : "text-ink-2"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
