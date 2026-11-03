// The service worker's fallback for a page that was never visited while
// online (techspec §11.3). Static, so it's cached at install.

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center gap-4 px-4 py-12">
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
    </main>
  );
}
