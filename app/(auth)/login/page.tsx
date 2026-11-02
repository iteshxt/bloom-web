"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/browser";

// design.md §11.1: one button, no other fields. The sky, islands and
// entrance choreography arrive with the design pass.

const FALLBACK_ERROR = "Sign-in didn't finish. Try again.";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center gap-10 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[48px] leading-none font-extrabold tracking-[-0.02em]">
          bloom
        </h1>
        <p className="text-ink-2">Grow a little every day, together.</p>
      </header>
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
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
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark */}
        <img src="/icons/google-g.svg" alt="" width={20} height={20} />
        {opening ? "Opening Google…" : "Continue with Google"}
      </Button>
    </div>
  );
}
