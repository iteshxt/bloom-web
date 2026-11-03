// Bloom service worker (techspec §11.3), hand-written: no PWA plugin.
// Served with Cache-Control: no-cache (next.config.ts) so updates land fast.
//
// Offline (PRD 5.10): pages are network-first with the last copy as a
// fallback, Next's hashed static files are cache-first, and anything never
// visited falls back to /offline. API and Supabase calls are never cached;
// the app keeps its last data itself. Caching is off when registered from
// the dev server (?mode=dev), whose files change on every edit.

const VERSION = "v1";
const SHELL = `bloom-shell-${VERSION}`;
const PAGES = `bloom-pages-${VERSION}`;
const STATIC = `bloom-static-${VERSION}`;
const SHELL_FILES = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/badge-72.png",
  "/manifest.webmanifest",
];
const CACHING = new URL(self.location.href).searchParams.get("mode") !== "dev";

self.addEventListener("install", (event) => {
  if (CACHING) {
    event.waitUntil(
      caches.open(SHELL).then((cache) => cache.addAll(SHELL_FILES)),
    );
  }
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = CACHING ? [SHELL, PAGES, STATIC] : [];
      for (const key of await caches.keys()) {
        if (key.startsWith("bloom-") && !keep.includes(key)) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (!CACHING) return;
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, LeetCode, fonts CDN
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  } else if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    // Keep real pages only, not redirects to /login.
    if (response.ok && !response.redirected) {
      const cache = await caches.open(PAGES);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match("/")) ||
      (await caches.match("/offline")) ||
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("push", (event) => {
  let n = { title: "Bloom", body: "", url: "/", tag: undefined };
  try {
    if (event.data) n = { ...n, ...event.data.json() };
  } catch {
    if (event.data) n.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(n.title, {
      body: n.body,
      tag: n.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { url: n.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open = windows.find((w) => "focus" in w);
      if (open) {
        await open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
