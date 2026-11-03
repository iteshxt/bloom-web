import { Companion } from "@/components/companions/Companion";
import { Ground } from "@/components/ui/Ground";

// The service worker's fallback for a page that was never visited while
// online (techspec §11.3). Static, so it's cached at install.

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col justify-center gap-4 px-4 py-12 md:max-w-[430px]">
      {/* design §11.15: a tiny rain cloud over a creature, never an apology */}
      <div className="relative self-start">
        <svg
          viewBox="0 0 80 52"
          className="absolute -top-8 left-8 w-20"
          aria-hidden
        >
          <g fill="var(--frost)">
            <circle cx={22} cy={18} r={10} />
            <circle cx={38} cy={12} r={12} />
            <circle cx={55} cy={18} r={10} />
            <rect x={12} y={16} width={56} height={12} rx={6} />
          </g>
          <path
            d="M24 34l-2 6M38 34l-2 6M52 34l-2 6"
            stroke="var(--sky)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </svg>
        <Companion kind="mochi" mood="waiting" size={120} color="blush" />
      </div>
      <h1 className="font-display text-[28px] leading-[1.15] font-extrabold">
        You’re offline
      </h1>
      <p className="text-ink-2">
        Bloom will catch up as soon as you’re back. Your solves on LeetCode
        still count; they sync when the connection returns.
      </p>
      {/* A full reload (not client navigation) so the network is retried. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="bg-surface text-ink shadow-soft rounded-pill inline-flex h-[52px] items-center self-start px-6 font-semibold"
      >
        Try again
      </a>
      <Ground />
    </main>
  );
}
