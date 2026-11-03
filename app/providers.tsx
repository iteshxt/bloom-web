"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState, type ReactNode } from "react";
import {
  OFFLINE_CACHE_MAX_AGE,
  OFFLINE_CACHE_VERSION,
  createOfflinePersister,
  useOnline,
} from "@/lib/offline/cache";
import { syncPushOnStart } from "@/lib/push/client";
// Loaded early so Chrome's one-time install event is never missed.
import "@/lib/pwa/install";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Realtime events invalidate queries, so they rarely go stale.
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // Kept as long as the offline copy, so it can be restored.
            gcTime: OFFLINE_CACHE_MAX_AGE,
          },
        },
      }),
  );
  const [persister] = useState(createOfflinePersister);

  // Register the service worker and keep this device's push subscription
  // known to the server (techspec §11.2).
  useEffect(() => {
    syncPushOnStart().catch(() => undefined);
  }, []);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: OFFLINE_CACHE_MAX_AGE,
        buster: OFFLINE_CACHE_VERSION,
      }}
    >
      <OfflinePill />
      {children}
    </PersistQueryClientProvider>
  );
}

/** design §11.15: "You're offline. Showing what we had." */
function OfflinePill() {
  const online = useOnline();
  if (online) return null;
  return (
    <p
      role="status"
      className="bg-glass shadow-float text-ink rounded-pill fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-sm font-semibold"
    >
      You’re offline. Showing what we had.
    </p>
  );
}
