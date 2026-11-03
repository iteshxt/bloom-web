"use client";

import { useState } from "react";
import { PuffyIcon } from "@/components/icons/puffy";
import { Button } from "@/components/ui/Button";
import { promptInstall, useInstallMode } from "@/lib/pwa/install";

const DISMISSED_KEY = "bloom:install-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

// design §11.2 step 5: "Install Bloom" on Android, Chrome's menu steps
// when its install dialog isn't offered, the three-step "Share → Add to
// Home Screen" note on iPhone Safari, and a "you have it" note when the app
// is installed but opened in the browser. Hidden inside the installed app.
// On home it can be dismissed; in Settings it always shows.

export function InstallCard({
  dismissible = false,
}: {
  dismissible?: boolean;
}) {
  const mode = useInstallMode();
  const [dismissed, setDismissed] = useState(() =>
    dismissible && typeof window !== "undefined" ? readDismissed() : false,
  );

  if (mode === "installed" || mode === "unavailable" || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // fine: it just shows again next time
    }
  }

  return (
    <section className="bg-mint-soft text-mint-deep shadow-soft flex flex-col gap-2 rounded-md p-4">
      <p className="flex items-center gap-3 font-semibold">
        <PuffyIcon name="sprout" size={40} className="shrink-0" />
        Put Bloom on your home screen
      </p>
      {mode === "prompt" ? (
        <>
          <p className="text-sm">
            It opens full screen, like an app, and keeps your reminders working.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => promptInstall()}>
              Install Bloom
            </Button>
            {dismissible && (
              <Button variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            )}
          </div>
        </>
      ) : mode === "elsewhere" ? (
        <p className="text-sm">
          Bloom is already on this phone. Open it from your home screen for full
          screen and reminders.
        </p>
      ) : (
        <>
          <ol className="list-decimal pl-5 text-sm">
            {mode === "manual" ? (
              <>
                <li>Tap Chrome’s ⋮ menu (top right)</li>
                <li>Choose “Install app” or “Add to Home screen”</li>
                <li>Open Bloom from your home screen</li>
              </>
            ) : (
              <>
                <li>Tap the Share button in Safari</li>
                <li>Choose “Add to Home Screen”</li>
                <li>Open Bloom from your home screen</li>
              </>
            )}
          </ol>
          {dismissible && (
            <Button variant="ghost" className="self-start" onClick={dismiss}>
              Not now
            </Button>
          )}
        </>
      )}
    </section>
  );
}
