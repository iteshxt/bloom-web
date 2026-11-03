"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  pushState,
  type PushState,
} from "@/lib/push/client";

/** This device's notification state, with enable/disable actions that must
 *  be called from a tap. null while checking. */
export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setState(await pushState());
  }, []);

  useEffect(() => {
    pushState().then(setState);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    const res = await enablePush();
    setBusy(false);
    if (!res.ok) setMessage(res.message ?? "Couldn't turn on notifications.");
    await refresh();
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    await refresh();
  }, [refresh]);

  return { state, message, busy, enable, disable };
}
