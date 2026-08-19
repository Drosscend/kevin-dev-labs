import type { GestureKind } from "./impulses";
import type { MoodName } from "./mind";

const GESTURES: GestureKind[] = ["discharge", "clench", "flare", "adrift", "stillness"];
const MOODS: MoodName[] = ["dreaming", "resting", "curious", "playful", "startled"];

export interface Traits {
  /** How big it grew, as a multiple of the standard size. */
  size: number;
  /** How finely veined its skin is. */
  density: number;
  /** Lobes in the silhouette, and how deep they cut. */
  lobes: number;
  lobeDepth: number;
  /** How easily it starts playing. */
  temper: number;
  /** How hard and how often it pushes. */
  quickness: number;
  /** How much a hand frightens it. */
  shyness: number;
  /** Where its drone sits. */
  timbre: number;
  /** Its own reading of every mood: the same colour never means the same thing twice over. */
  hues: Record<MoodName, number>;
  /** Gestures it simply does not have. */
  missing: GestureKind[];
  /** The one it does more than the others. */
  favours: GestureKind;
  /** A mark it was born with, in its own frame. */
  birthmark: [number, number, number];
}

/** Deterministic from the seed, so the same browser always hatches the same creature. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function traitsFrom(seed: number): Traits {
  const random = rng(seed);
  const between = (low: number, high: number) => low + random() * (high - low);

  const missing: GestureKind[] = [];
  const pool = [...GESTURES];
  const gaps = random() < 0.45 ? 1 : 0;
  for (let i = 0; i < gaps; i++) {
    // Never take away the discharge: without it, nothing it does would be visible.
    const choices = pool.filter((kind) => kind !== "discharge");
    missing.push(choices[Math.floor(random() * choices.length)]);
    pool.splice(pool.indexOf(missing[i]), 1);
  }

  const hues = {} as Record<MoodName, number>;
  const drift = between(-0.5, 0.5);
  for (const mood of MOODS) hues[mood] = drift + between(-0.16, 0.16);

  const around = random() * Math.PI * 2;
  const up = between(-0.85, 0.85);
  const band = Math.sqrt(1 - up * up);

  return {
    size: between(0.82, 1.22),
    density: between(0.72, 1.38),
    lobes: random() < 0.55 ? 0 : 3 + Math.floor(random() * 3),
    lobeDepth: between(0.018, 0.042),
    temper: between(0.7, 1.4),
    quickness: between(0.8, 1.32),
    shyness: between(0.68, 1.36),
    timbre: between(0.86, 1.18),
    hues,
    missing,
    favours: pool[Math.floor(random() * pool.length)],
    birthmark: [band * Math.cos(around), up, band * Math.sin(around)],
  };
}
