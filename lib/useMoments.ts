"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  detectMoments,
  type Moment,
  type Seen,
  type Snapshot,
} from "@/lib/moments";

// Plays each signature moment once per device: what's been shown is kept in
// localStorage per player, detectMoments() decides what's new, and a small
// queue plays them one at a time.

const key = (playerId: string) => `bloom:seen:${playerId}`;

function readSeen(playerId: string): Seen | null {
  try {
    const raw = window.localStorage.getItem(key(playerId));
    return raw ? (JSON.parse(raw) as Seen) : null;
  } catch {
    return null;
  }
}

function writeSeen(playerId: string, seen: Seen) {
  try {
    window.localStorage.setItem(key(playerId), JSON.stringify(seen));
  } catch {
    // Private mode: moments may repeat next visit, which is harmless.
  }
}

let queue: Moment[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Queues moments directly (the dev gallery's previews). */
export function enqueueMoments(moments: Moment[]) {
  queue = [...queue, ...moments];
  emit();
}

/** The first moment has finished. */
export function nextMoment() {
  queue = queue.slice(1);
  emit();
}

export function useMoments(playerId: string | null, snapshot: Snapshot | null) {
  const signature = snapshot ? JSON.stringify(snapshot) : null;

  useEffect(() => {
    if (!playerId || !snapshot) return;
    const { moments, seen } = detectMoments(readSeen(playerId), snapshot);
    writeSeen(playerId, seen);
    if (moments.length) {
      queue = [...queue, ...moments];
      emit();
    }
    // `signature` stands in for the snapshot's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, signature]);

  const current = useSyncExternalStore(
    subscribe,
    () => queue,
    () => queue,
  );
  return { queue: current, next: nextMoment };
}
