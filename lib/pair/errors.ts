// Postgres errors surfaced by pairing writes.

interface PgError {
  code?: string;
  message?: string;
  details?: string;
}

/** Unique violation (23505), optionally on a specific constraint or index. */
export function isUniqueViolation(
  error: PgError | null,
  constraint?: string,
): boolean {
  if (error?.code !== "23505") return false;
  if (!constraint) return true;
  return `${error.message ?? ""} ${error.details ?? ""}`.includes(constraint);
}

/** The enforce_pair_size trigger's "pair is full" exception. */
export const isPairFull = (error: PgError | null): boolean =>
  Boolean(error?.message?.includes("pair is full"));
