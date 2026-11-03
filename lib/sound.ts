"use client";

import { getPrefs } from "@/lib/prefs";

// Sounds (design §13.1): tiny files played through the Web Audio API with a
// shared buffer cache. Celebration sounds are on by default; `tap` is off.
// Sound is never the only feedback, so every failure is silent.

export type SoundName =
  | "pop"
  | "chime"
  | "clink"
  | "crack"
  | "melt"
  | "whoosh"
  | "tap"
  | "rustle";

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

function context(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  return ctx;
}

function extension(): "ogg" | "mp3" {
  const a = document.createElement("audio");
  return a.canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "mp3";
}

function load(name: SoundName): Promise<AudioBuffer | null> {
  let p = buffers.get(name);
  if (!p) {
    const ac = context();
    p = ac
      ? fetch(`/sounds/${name}.${extension()}`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
          .then((b) => ac.decodeAudioData(b))
          .catch(() => null)
      : Promise.resolve(null);
    buffers.set(name, p);
  }
  return p;
}

export async function playSound(name: SoundName, delayMs = 0) {
  const prefs = getPrefs();
  if (!prefs.sounds || (name === "tap" && !prefs.tapSound)) return;
  const ac = context();
  if (!ac) return;
  if (ac.state === "suspended") await ac.resume().catch(() => undefined);
  const buffer = await load(name);
  if (!buffer) return;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = 0.6;
  src.connect(gain).connect(ac.destination);
  src.start(ac.currentTime + delayMs / 1000);
}
