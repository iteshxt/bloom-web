"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PetalSpinner } from "@/components/ui/Progress";
import {
  googleClientId,
  loadGoogleIdentity,
  makeNonce,
  type CredentialResponse,
} from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/browser";

// Sign in (design §11.1, techspec §13). Google's own button, on Bloom's
// page, so Google's screen says "Sign in to bloom.iteshxt.me". It returns
// an ID token that Supabase verifies (signInWithIdToken). If Google's
// script can't load (blocked, offline), the older redirect through
// Supabase still works as a fallback.

const FALLBACK_ERROR = "Sign-in didn't finish. Try again.";

export function GoogleSignIn({ initialError }: { initialError: boolean }) {
  const router = useRouter();
  const slot = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "button" | "fallback">(
    googleClientId() ? "loading" : "fallback",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? FALLBACK_ERROR : null,
  );

  async function finish(r: CredentialResponse, rawNonce: string) {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithIdToken({
      provider: "google",
      token: r.credential,
      nonce: rawNonce,
    });
    if (error) {
      setBusy(false);
      return setError(FALLBACK_ERROR);
    }
    // The proxy sends new players on to onboarding.
    router.replace("/");
    router.refresh();
  }

  useEffect(() => {
    const clientId = googleClientId();
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [google, nonce] = await Promise.all([
          loadGoogleIdentity(),
          makeNonce(),
        ]);
        if (cancelled || !slot.current) return;
        google.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          ux_mode: "popup",
          context: "signin",
          itp_support: true,
          use_fedcm_for_button: true,
          callback: (r: CredentialResponse) => finish(r, nonce.raw),
        });
        google.renderButton(slot.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: Math.min(400, Math.round(slot.current.clientWidth)),
        });
        setMode("button");
      } catch {
        if (!cancelled) setMode("fallback");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once: Google's button is set up a single time per visit, and
    // `finish` only uses stable setters and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The redirect through Supabase, for when Google's script can't load. */
  async function redirectSignIn() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setBusy(false);
      setError(FALLBACK_ERROR);
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

      {mode !== "fallback" && (
        <div className="relative flex min-h-[52px] items-center justify-center">
          {/* Google draws its button into this slot. */}
          <div
            ref={slot}
            className={`flex w-full justify-center ${busy ? "pointer-events-none opacity-40" : ""}`}
          />
          {(mode === "loading" || busy) && (
            <span className="bg-surface text-ink shadow-soft rounded-pill absolute inset-0 flex items-center justify-center gap-2 text-sm font-semibold">
              <PetalSpinner size={20} />
              {busy ? "Signing you in…" : "Loading Google…"}
            </span>
          )}
        </div>
      )}

      {mode === "fallback" && (
        <Button
          onClick={redirectSignIn}
          disabled={busy}
          data-player-color="blush"
        >
          {busy ? (
            <PetalSpinner size={20} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark
            <img src="/icons/google-g.svg" alt="" width={20} height={20} />
          )}
          {busy ? "Opening Google…" : "Continue with Google"}
        </Button>
      )}
    </div>
  );
}
