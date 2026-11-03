"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { Bloom } from "@/components/bloom/Bloom";
import { Companion } from "@/components/companions/Companion";
import { Island } from "@/components/sky/Island";
import { SkyScene } from "@/components/sky/SkyScene";
import { Button } from "@/components/ui/Button";
import { Ground } from "@/components/ui/Ground";
import { Wordmark } from "@/components/ui/Wordmark";

// Sign in (design §11.1): a full-screen dusk sky with two islands and two
// waving creatures, the wordmark and one button. The one page-load moment:
// the sky fades in, the islands float up, the creatures wave, then the
// wordmark's two o's roll in from the sides.

export default function LoginPage() {
  return (
    <SkyScene band="dusk" className="flex min-h-dvh flex-1 flex-col">
      {/* The entrance is CSS, so it starts with the first paint rather
          than after the JavaScript arrives (which kept the page blank). */}
      <main className="text-plum animate-fade-in relative mx-auto flex w-full flex-1 flex-col px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:max-w-[430px]">
        <div className="flex flex-1 items-center justify-between gap-2">
          {(
            [
              ["mochi", "blush", 12],
              ["tofu", "sky", 22],
            ] as const
          ).map(([kind, color, streak], i) => (
            <div
              key={kind}
              data-player-color={color}
              className="animate-rise"
              style={{ animationDelay: `${0.3 + i * 0.12}s` }}
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
            </div>
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
      </main>
      <Ground />
    </SkyScene>
  );
}

function SignIn() {
  const errorCode = useSearchParams().get("error");
  return (
    <div className="flex flex-col gap-4">
      <GoogleSignIn initialError={Boolean(errorCode)} />
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
