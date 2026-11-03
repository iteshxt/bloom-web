"use client";

import { api } from "@/lib/api/client";

// Browser side of Web Push (techspec §11.2). Permission is requested only
// from a user tap (CLAUDE.md "Push and PWA").

export type PushState = "unsupported" | "denied" | "off" | "on";

export const pushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return Promise.resolve(null);
  return navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch(() => null);
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return Notification.permission === "granted" && sub ? "on" : "off";
}

/** Call from a click handler only. */
export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  if (!pushSupported())
    return { ok: false, message: "This browser can't show notifications." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      message:
        "Notifications are blocked. Allow them in your browser settings.",
    };
  }
  const reg =
    (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, message: "Push isn't set up yet." };
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));
  const res = await api("/api/push/subscribe", { body: sub.toJSON() });
  return res.ok ? { ok: true } : { ok: false, message: res.message };
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/api/push/unsubscribe", { body: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}

/** On app start: register the worker and, if this device is already
 *  subscribed, make sure the server still has it (subscriptions can drop). */
export async function syncPushOnStart(): Promise<void> {
  const reg = await registerServiceWorker();
  if (!reg || Notification.permission !== "granted") return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await api("/api/push/subscribe", { body: sub.toJSON() });
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
