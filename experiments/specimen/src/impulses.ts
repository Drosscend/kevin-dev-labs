import type { MoodName } from "./moods";

export type GestureKind = "sigh" | "yawn" | "shiver" | "stretch" | "twitch" | "chirp";

interface Shape {
  span: number;
  /** How often the gesture comes with a sound rather than passing in silence. */
  voiced: number;
  /** Extra breath, in multiples of the current breath depth. */
  breath: (t: number) => number;
  shiver: (t: number) => number;
  stretch: (t: number) => number;
  jolt: (t: number) => number;
}

const nothing = () => 0;
const arc = (t: number) => Math.sin(Math.PI * t);

const SHAPES: Record<GestureKind, Shape> = {
  sigh: {
    span: 2.1,
    voiced: 0.8,
    breath: (t) =>
      t < 0.25
        ? Math.sin((t / 0.25) * Math.PI * 0.5)
        : Math.cos(((t - 0.25) / 0.75) * Math.PI * 0.5) - 0.24 * arc((t - 0.25) / 0.75),
    shiver: nothing,
    stretch: nothing,
    jolt: nothing,
  },
  yawn: {
    span: 3.0,
    voiced: 0.75,
    breath: (t) =>
      1.5 *
      (t < 0.42
        ? Math.sin((t / 0.42) * Math.PI * 0.5)
        : Math.cos(((t - 0.42) / 0.58) ** 1.4 * Math.PI * 0.5)),
    shiver: (t) => 0.25 * Math.max(0, Math.sin((t - 0.55) * Math.PI * 2.2)),
    stretch: (t) => 0.85 * arc(t ** 0.8),
    jolt: nothing,
  },
  shiver: {
    span: 1.1,
    voiced: 0.3,
    breath: (t) => 0.28 * arc(t),
    shiver: (t) => Math.sin(Math.PI * t) ** 0.45,
    stretch: nothing,
    jolt: (t) => 0.25 * Math.exp(-9 * t),
  },
  stretch: {
    span: 2.6,
    voiced: 0.25,
    breath: (t) => 0.55 * arc(t),
    shiver: nothing,
    stretch: (t) => arc(t) ** 0.7,
    jolt: nothing,
  },
  twitch: {
    span: 0.45,
    voiced: 0.2,
    breath: nothing,
    shiver: (t) => 0.5 * Math.exp(-6 * t),
    stretch: nothing,
    jolt: (t) => Math.exp(-5 * t),
  },
  chirp: {
    span: 0.7,
    voiced: 1,
    breath: (t) => 0.35 * arc(t),
    shiver: (t) => 0.3 * Math.exp(-4 * t),
    stretch: (t) => 0.35 * arc(t),
    jolt: (t) => 0.2 * Math.exp(-7 * t),
  },
};

/** What each mood is liable to do on its own, and how long it waits between two urges. */
const REPERTOIRE: Record<
  MoodName,
  { weights: Partial<Record<GestureKind, number>>; wait: number }
> = {
  dreaming: { weights: { sigh: 3, twitch: 1.6, shiver: 0.7 }, wait: 30 },
  resting: { weights: { sigh: 2.2, stretch: 1.6, yawn: 1.1, shiver: 0.9, twitch: 0.7 }, wait: 24 },
  curious: { weights: { chirp: 2, twitch: 1.5, stretch: 1, sigh: 0.8 }, wait: 18 },
  playful: { weights: { chirp: 3, shiver: 1.3, stretch: 1.5, twitch: 1.2 }, wait: 12 },
  startled: { weights: { twitch: 2.5, shiver: 1.8 }, wait: 9 },
};

export interface Urge {
  breath: number;
  shiver: number;
  stretch: number;
  jolt: number;
  /** Set for a single frame, when a gesture begins with something to be heard. */
  voice: GestureKind | null;
}

function draw(entries: [GestureKind, number][]): GestureKind {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return entries[0][0];
}

/** Weighted draw that avoids repeating itself twice in a row when it has the choice. */
function pick(
  weights: Partial<Record<GestureKind, number>>,
  avoid: GestureKind | null,
): GestureKind {
  const entries = Object.entries(weights) as [GestureKind, number][];
  const fresh = entries.filter(([kind]) => kind !== avoid);
  return draw(fresh.length > 0 ? fresh : entries);
}

/** The things the orb does when nobody asks: sighs, shivers, stretches, yawns, twitches. */
export class Urges {
  readonly out: Urge = { breath: 0, shiver: 0, stretch: 0, jolt: 0, voice: null };

  private kind: GestureKind | null = null;
  private last: GestureKind | null = null;
  private elapsed = 0;
  private countdown = 12;

  update(dt: number, mood: MoodName, restlessness: number): void {
    const out = this.out;
    out.voice = null;

    if (this.kind) {
      const shape = SHAPES[this.kind];
      this.elapsed += dt;
      const t = this.elapsed / shape.span;
      if (t >= 1) {
        this.kind = null;
        out.breath = 0;
        out.shiver = 0;
        out.stretch = 0;
        out.jolt = 0;
      } else {
        out.breath = shape.breath(t);
        out.shiver = shape.shiver(t);
        out.stretch = shape.stretch(t);
        out.jolt = shape.jolt(t);
      }
      return;
    }

    this.countdown -= dt * (1 + restlessness * 1.1);
    if (this.countdown > 0) return;

    const repertoire = REPERTOIRE[mood];
    this.kind = pick(repertoire.weights, this.last);
    this.last = this.kind;
    this.elapsed = 0;
    out.voice = Math.random() < SHAPES[this.kind].voiced ? this.kind : null;
    this.countdown = repertoire.wait * (0.5 + Math.random() * 1.4);
  }
}
