import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeNonce } from "@/lib/auth/google";

describe("Google sign-in nonce (techspec §13)", () => {
  it("gives Google the SHA-256 of the raw nonce Supabase checks", async () => {
    const { raw, hashed } = await makeNonce();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).toBe(createHash("sha256").update(raw).digest("hex"));
  });

  it("is different every time", async () => {
    const [a, b] = await Promise.all([makeNonce(), makeNonce()]);
    expect(a.raw).not.toBe(b.raw);
  });
});
