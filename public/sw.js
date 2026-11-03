// Bloom service worker (techspec §11.3), hand-written: no PWA plugin.
// Served with Cache-Control: no-cache (next.config.ts) so updates land fast.
// The offline shell joins in build step 8.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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
