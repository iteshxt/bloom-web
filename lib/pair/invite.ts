// 6-character pair invite codes with no ambiguous characters (no 0/O, 1/I/L),
// so they're easy to read aloud and type (techspec §10).

export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_LENGTH = 6;

export function generateInviteCode(
  randomBytes: (n: number) => Uint8Array = (n) =>
    crypto.getRandomValues(new Uint8Array(n)),
): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % INVITE_ALPHABET.length);
  let code = "";
  while (code.length < INVITE_LENGTH) {
    for (const b of randomBytes(INVITE_LENGTH * 2)) {
      if (b < limit && code.length < INVITE_LENGTH) {
        code += INVITE_ALPHABET[b % INVITE_ALPHABET.length];
      }
    }
  }
  return code;
}

/** Uppercases and strips spaces and dashes; null if it can't be a code. */
export function normalizeInviteCode(input: string): string | null {
  const code = input.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== INVITE_LENGTH) return null;
  for (const c of code) if (!INVITE_ALPHABET.includes(c)) return null;
  return code;
}
