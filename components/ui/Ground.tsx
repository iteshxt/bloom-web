// The plum ground at the bottom of every screen (design §10.7). Android
// paints its navigation bar once, from the manifest, in this plum; meeting
// it with the same colour lets the page run straight into the bar. By day
// the light page settles onto it along a soft wave, like the garden's
// earth; at night it's one continuous plum.

/** The soft wave where the page meets the dock. */
export function DockWave({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 20"
      preserveAspectRatio="none"
      className={`pointer-events-none block h-5 w-full ${className}`}
      aria-hidden
    >
      <path
        d="M0 14C50 4 110 2 170 9C230 16 290 18 340 10C365 6 385 6 400 8V20H0Z"
        fill="var(--dock)"
      />
      {/* a few fireflies in the dark earth */}
      <circle cx="96" cy="15" r="1.2" fill="var(--butter)" opacity="0.5" />
      <circle cx="312" cy="17" r="1" fill="var(--butter)" opacity="0.4" />
    </svg>
  );
}

/** For screens without the nav dock (sign-in, onboarding, offline): just
 *  the wave and the bottom safe area, fixed to the bottom edge. */
export function Ground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto md:hidden md:max-w-[430px]"
    >
      <DockWave />
      <div className="bg-dock h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
