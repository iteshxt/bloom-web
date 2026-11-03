"use client";

import { Bloom } from "@/components/bloom/Bloom";
import { Companion, type Mood } from "@/components/companions/Companion";
import { Island } from "@/components/sky/Island";
import { bloomLabel } from "@/lib/bloom";
import type { Companion as Kind } from "@/lib/validation/onboarding";

// One player's floating island in the sky (design §6.2, layer 5): their
// flower and their companion, side by side.

export function PlayerIsland({
  name,
  kind,
  color,
  streak,
  mood,
  side,
  restored = false,
  done = false,
  width = 168,
  stretch = 0,
}: {
  /** Pull-to-refresh stretches the flower (0–1). */
  stretch?: number;
  name: string;
  kind: Kind;
  color: string;
  streak: number;
  mood: Mood;
  side: "left" | "right";
  restored?: boolean;
  done?: boolean;
  width?: number;
}) {
  const frozen = mood === "frozen";
  const flower = (
    <span
      className="inline-block origin-bottom transition-transform duration-150"
      style={
        stretch ? { transform: `scaleY(${1 + stretch * 0.3})` } : undefined
      }
    >
      <Bloom
        streak={streak}
        size={Math.round(width * 0.46)}
        frozen={frozen}
        restored={restored}
        label={bloomLabel({
          name,
          streak,
          state: frozen ? "frozen" : done ? "done" : "pending",
        })}
        className="-mx-2"
      />
    </span>
  );
  const creature = (
    <Companion
      kind={kind}
      mood={mood}
      size={Math.round(width * 0.56)}
      streak={streak}
      facing={side === "left" ? "right" : "left"}
      label={`${name}’s companion`}
      className="-mx-2"
    />
  );
  return (
    <div data-player-color={color}>
      <Island
        width={width}
        frozen={frozen}
        bobDelay={side === "left" ? 0 : 2.5}
      >
        {side === "left" ? (
          <>
            {creature}
            {flower}
          </>
        ) : (
          <>
            {flower}
            {creature}
          </>
        )}
      </Island>
    </div>
  );
}
