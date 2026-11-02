// ALLOWED_EMAILS gates sign-in at /auth/callback and again at onboarding
// (CLAUDE.md "Security"): Bloom is for exactly two Google accounts.

export function parseAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ALLOWED_EMAILS,
): boolean {
  if (!email) return false;
  return parseAllowlist(raw).has(email.trim().toLowerCase());
}
