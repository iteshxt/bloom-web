"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { syncPushOnStart } from "@/lib/push/client";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Realtime events invalidate queries, so they rarely go stale.
          queries: { staleTime: 30_000, refetchOnWindowFocus: true },
        },
      }),
  );
  // Register the service worker and keep this device's push subscription
  // known to the server (techspec §11.2).
  useEffect(() => {
    syncPushOnStart().catch(() => undefined);
  }, []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
