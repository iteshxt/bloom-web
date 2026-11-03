"use client";

import { useSyncExternalStore } from "react";

// Install UX (techspec §12). Chrome fires `beforeinstallprompt` once, early,
// so it's captured here as soon as this module loads (Providers imports it),
// before any component that wants it has mounted.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** installed: running as the installed app. elsewhere: installed on this
 *  phone but opened in the browser. prompt: Chrome's install dialog is
 *  ready. manual: Android without the dialog (Chrome hasn't offered it
 *  yet), so we show the menu steps. ios: Safari's Share steps. */
export type InstallMode =
  "installed" | "elsewhere" | "prompt" | "manual" | "ios" | "unavailable";

let deferred: InstallPromptEvent | null = null;
let installed = false;
let installedElsewhere = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
  // Chrome on Android can tell a page its own installed app exists (the
  // manifest lists itself under related_applications).
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<unknown[]>;
  };
  nav
    .getInstalledRelatedApps?.()
    .then((apps) => {
      if (apps.length > 0) {
        installedElsewhere = true;
        emit();
      }
    })
    .catch(() => undefined);
}

function mode(): InstallMode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone || installed) return "installed";
  if (deferred) return "prompt";
  if (installedElsewhere) return "elsewhere";
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
  if (iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "manual";
  return "unavailable";
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** How Bloom can be installed on this device; "installed" during prerender. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, mode, () => "installed");
}

/** Shows Chrome's install dialog. Call from a tap. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  emit();
  return outcome === "accepted";
}
