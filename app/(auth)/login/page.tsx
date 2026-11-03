"use client";

import { motion } from "motion/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bloom } from "@/components/bloom/Bloom";
import { Companion } from "@/components/companions/Companion";
import { Island } from "@/components/sky/Island";
import { SkyScene } from "@/components/sky/SkyScene";
import { Button } from "@/components/ui/Button";
import { PetalSpinner } from "@/components/ui/Progress";
import { Wordmark } from "@/components/ui/Wordmark";
import { spring } from "@/lib/motion";
import { createClient } from "@/lib/supabase/browser";

// Sign in (design §11.1): a full-screen dusk sky with two islands and two
// waving creatures, the wordmark and one button. The one page-load moment:
// the sky fades in, the islands float up, the creatures wave, then the
// wordmark's two o's roll in from the sides.

const FALLBACK_ERROR = "Sign-in didn't finish. Try again.";

export default function LoginPage() {
  return (
    <SkyScene band="dusk" className="flex min-h-dvh flex-1 flex-col">
      <motion.main
        className="text-plum relative mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-1 items-center justify-between gap-2">
          {(
            [
              ["mochi", "blush", 12],
              ["tofu", "sky", 22],
            ] as const
          ).map(([kind, color, streak], i) => (
            <motion.div
              key={kind}
              data-player-color={color}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...spring.floaty, delay: 0.3 + i * 0.12 }}
            >
              <Island width={160} bobDelay={i * 2.5}>
                {i === 0 && (
                  <Companion
                    kind={kind}
                    mood="wave"
                    size={92}
                    className="-mr-3"
                  />
                )}
                <Bloom streak={streak} size={72} />
                {i === 1 && (
                  <Companion
                    kind={kind}
                    mood="wave"
                    size={92}
                    className="-ml-3"
                  />
                )}
              </Island>
            </motion.div>
          ))}
        </div>
        <header className="flex flex-col gap-2 pt-8 pb-10">
          <h1>
            <Wordmark height={56} rollIn delay={1} />
          </h1>
          <p className="text-lg font-semibold">
            Grow a little every day, together.
          </p>
        </header>
        <Suspense>
          <SignIn />
        </Suspense>
      </motion.main>
    </SkyScene>
  );
}

function SignIn() {
  const errorCode = useSearchParams().get("error");
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const error = failed || errorCode ? FALLBACK_ERROR : null;

  async function signIn() {
    setOpening(true);
    setFailed(false);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is already navigating to Google.
    if (error) {
      setOpening(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="bg-frost-soft text-frost-deep rounded-md px-4 py-3 text-sm font-semibold"
        >
          {error}
        </p>
      )}
      <Button onClick={signIn} disabled={opening} data-player-color="blush">
        {opening ? (
          <PetalSpinner size={20} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark
          <img src="/icons/google-g.svg" alt="" width={20} height={20} />
        )}
        {opening ? "Opening Google…" : "Continue with Google"}
      </Button>
      {process.env.NODE_ENV === "development" && <DevSignIn />}
    </div>
  );
}

/** Development only (removed from production builds): sign in as a test
 *  player without Google, to try the screens. See app/api/dev/login. */
function DevSignIn() {
  return (
    <form
      method="post"
      action="/api/dev/login"
      className="bg-surface/70 text-ink flex flex-col gap-2 rounded-md border-[1.5px] border-dashed border-current/20 p-4"
    >
      <p className="text-ink-2 text-sm">
        Dev only: try the app as a test player
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" name="player" value="a" type="submit">
          Test player A
        </Button>
        <Button variant="secondary" name="player" value="b" type="submit">
          Test player B
        </Button>
      </div>
    </form>
  );
}
