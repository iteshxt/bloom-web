"use client";

import { useSyncExternalStore } from "react";

// Appearance preferences (design §11.14): per device, kept in localStorage,
// never synced. Read with usePrefs(); change with setPrefs().

export type ThemePref = "sky" | "day" | "night";
export type MotionPref = "system" | "reduce" | "full";

export interface Prefs {
  /** "sky" follows the IST sky: night palette 21:00–05:00 (design §6.1). */
  theme: ThemePref;
  sounds: boolean;
  /** The barely-there button tick (design §13.1), off by default. */
  tapSound: boolean;
  haptics: boolean;
  motion: MotionPref;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "sky",
  sounds: true,
  tapSound: false,
  haptics: true,
  motion: "system",
};

const KEY = "bloom:prefs";
const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    cache = DEFAULT_PREFS;
  }
  return cache!;
}

export function getPrefs(): Prefs {
  return typeof window === "undefined" ? DEFAULT_PREFS : read();
}

export function setPrefs(patch: Partial<Prefs>) {
  cache = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, () => DEFAULT_PREFS);
}

const reduceQuery = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)");

function subscribeReduce(l: () => void) {
  const q = reduceQuery();
  q.addEventListener("change", l);
  const off = subscribe(l);
  return () => {
    q.removeEventListener("change", l);
    off();
  };
}

/** True when motion should be reduced: the in-app setting, else the system. */
export function prefersReducedMotion(): boolean {
  const { motion } = getPrefs();
  if (motion === "reduce") return true;
  if (motion === "full") return false;
  return typeof window !== "undefined" && reduceQuery().matches;
}

export function useReducedMotionPref(): boolean {
  return useSyncExternalStore(
    subscribeReduce,
    prefersReducedMotion,
    () => false,
  );
}
