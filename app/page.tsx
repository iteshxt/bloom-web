"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/browser";

// Placeholder home until the duel dashboard (build step 5): shows the pair
// and the invite code while waiting for the partner.

interface Home {
  me: { name: string; color: string; leetcode: string | null };
  partner: { name: string } | null;
  pair: { code: string; startDate: string | null };
}

export default function HomePage() {
  const router = useRouter();
  const [home, setHome] = useState<Home | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getClaims();
      const userId = data?.claims?.sub;
      if (!userId) return;
      const { data: members } = await supabase
        .from("profiles")
        .select("id, display_name, color, leetcode_username, pair_id");
      const me = members?.find((m) => m.id === userId);
      if (!me?.pair_id) return;
      const partner = members?.find((m) => m.id !== userId) ?? null;
      const { data: pair } = await supabase
        .from("pairs")
        .select("invite_code, start_date")
        .eq("id", me.pair_id)
        .single();
      setHome({
        me: {
          name: me.display_name,
          color: me.color,
          leetcode: me.leetcode_username,
        },
        partner: partner ? { name: partner.display_name } : null,
        pair: {
          code: pair?.invite_code ?? "",
          startDate: pair?.start_date ?? null,
        },
      });
    })();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main
      data-player-color={home?.me.color}
      className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-6 px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10"
    >
      {!home ? (
        <p className="text-ink-2">Loading…</p>
      ) : (
        <>
          <h1 className="font-display text-[28px] leading-[1.15] font-extrabold">
            Hi {home.me.name}
          </h1>
          <section className="bg-surface shadow-soft flex flex-col gap-2 rounded-lg p-5">
            {home.partner ? (
              <p>
                You’re paired with <strong>{home.partner.name}</strong>.
              </p>
            ) : (
              <>
                <p>Waiting for your partner to join. Share this code:</p>
                <p className="font-display text-[32px] font-extrabold tracking-[0.12em]">
                  {home.pair.code}
                </p>
              </>
            )}
            <p className="text-ink-2 text-sm">
              Challenge starts {home.pair.startDate} · LeetCode:{" "}
              {home.me.leetcode}
            </p>
          </section>
          <p className="text-ink-2 text-sm">
            The duel dashboard arrives in the next build step.
          </p>
          <Button variant="ghost" onClick={signOut} className="self-start">
            Sign out
          </Button>
        </>
      )}
    </main>
  );
}
