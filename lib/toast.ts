"use client";

import { useSyncExternalStore } from "react";
import type { PuffyName } from "@/components/icons/puffy";

// Toasts (design §10.13): one at a time, top centre, 2.8 s.

export interface Toast {
  id: number;
  text: string;
  icon?: PuffyName;
}

let current: Toast | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const TOAST_MS = 2800;

export function toast(text: string, icon?: PuffyName) {
  current = { id: nextId++, text, icon };
  clearTimeout(timer);
  timer = setTimeout(dismissToast, TOAST_MS);
  emit();
}

export function dismissToast() {
  current = null;
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
