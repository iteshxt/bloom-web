// Browser-side helper for calling Bloom's /api routes, which answer errors as
// { error: { code, message } }.

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string };

export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
      headers:
        init?.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return {
      ok: false,
      code: "offline",
      message: "You seem to be offline. Try again.",
    };
  }
  const json = (await res.json().catch(() => null)) as
    (T & { error?: { code: string; message: string } }) | null;
  if (!res.ok || !json) {
    return {
      ok: false,
      code: json?.error?.code ?? "unknown",
      message: json?.error?.message ?? "Something went sideways. Try again.",
    };
  }
  return { ok: true, data: json };
}
