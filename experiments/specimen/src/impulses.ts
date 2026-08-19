import type { MoodName } from "./mind";

export type GestureKind = "discharge" | "clench" | "flare" | "adrift" | "stillness";

interface Shape {
  span: number;
  /** How often the gesture comes with something to be heard rather than passing in silence. */
  heard: number;
  /** Extra swell, in multiples of the current breath depth. */
  breath: (t: number) => number;
  shiver: (t: number) => number;
  stretch: (t: number) => number;
  jolt: (t: number) => number;
  /** A surge of light, which is most of what it has to say. */
  flare: (t: number) => number;
  /** How much of its own movement it holds back, 0 to 1. */
  still: (t: number) => number;
}

const nothing = () => 0;
const arc = (t: number) => Math.sin(Math.PI * t);

const SHAPES: Record<GestureKind, Shape> = {
  discharge: {
    span: 0.7,
    heard: 1,
    breath: (t) => 0.3 * Math.exp(-8 * t),
    shiver: (t) => 0.8 * Math.exp(-5 * t),
    stretch: nothing,
    jolt: (t) => Math.exp(-7 * t),
    flare: (t) => Math.exp(-9 * t),
    still: nothing,
  },
  clench: {
    span: 2.9,
    heard: 0.15,
    breath: (t) => -1.1 * (t < 0.18 ? t / 0.18 : Math.cos(((t - 0.18) / 0.82) * Math.PI * 0.5)),
    shiver: nothing,
    stretch: nothing,
    jolt: nothing,
    flare: (t) => -0.35 * arc(t ** 0.6),
    still: (t) => 0.8 * (t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5),
  },
  flare: {
    span: 1.6,
    heard: 0.5,
    breath: (t) => 0.45 * arc(t),
    shiver: nothing,
    stretch: (t) => 0.3 * arc(t),
    jolt: nothing,
    flare: (t) => arc(t) ** 0.55,
    still: nothing,
  },
  adrift: {
    span: 5.5,
    heard: 0,
    breath: (t) => 0.22 * arc(t),
    shiver: nothing,
    stretch: (t) => 0.25 * arc(t),
    jolt: nothing,
    flare: (t) => -0.2 * arc(t),
    still: (t) => 0.45 * arc(t ** 0.5),
  },
  // Nothing at all, for long enough to be wrong.
  stillness: {
    span: 5,
    heard: 0,
    breath: (t) => -0.18 * arc(t),
    shiver: nothing,
    stretch: nothing,
    jolt: nothing,
    flare: (t) => -0.3 * arc(t ** 0.4),
    still: (t) => (t < 0.08 ? t / 0.08 : t > 0.86 ? (1 - t) / 0.14 : 1),
  },
};

/** What each mood is liable to do on its own, and how long it waits between two urges. */
const REPERTOIRE: Record<
  MoodName,
  { weights: Partial<Record<GestureKind, number>>; wait: number }
> = {
  dreaming: { weights: { adrift: 3, clench: 1.2, stillness: 1 }, wait: 32 },
  resting: {
    weights: { adrift: 2, stillness: 1.6, clench: 1.4, flare: 0.8, discharge: 0.5 },
    wait: 26,
  },
  curious: { weights: { flare: 2, discharge: 1.4, stillness: 1.2, adrift: 1 }, wait: 18 },
  playful: { weights: { discharge: 2.4, flare: 2, clench: 1.2 }, wait: 12 },
  startled: { weights: { discharge: 3, stillness: 2, clench: 1.5 }, wait: 9 },
};

export interface Urge {
  breath: number;
  shiver: number;
  stretch: number;
  jolt: number;
  flare: number;
  still: number;
  /** Set for a single frame, when a gesture begins with something to be heard. */
  sounded: GestureKind | null;
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

/** The things it does when nobody asks: it discharges, clenches, flares, drifts, or stops dead. */
export class Urges {
  readonly out: Urge = {
    breath: 0,
    shiver: 0,
    stretch: 0,
    jolt: 0,
    flare: 0,
    still: 0,
    sounded: null,
  };

  private kind: GestureKind | null = null;
  private last: GestureKind | null = null;
  private elapsed = 0;
  private countdown = 12;

  update(dt: number, mood: MoodName, restlessness: number): void {
    const out = this.out;
    out.sounded = null;

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
        out.flare = 0;
        out.still = 0;
      } else {
        out.breath = shape.breath(t);
        out.shiver = shape.shiver(t);
        out.stretch = shape.stretch(t);
        out.jolt = shape.jolt(t);
        out.flare = shape.flare(t);
        out.still = shape.still(t);
      }
      return;
    }

    this.countdown -= dt * (1 + restlessness * 1.1);
    if (this.countdown > 0) return;

    const repertoire = REPERTOIRE[mood];
    this.kind = pick(repertoire.weights, this.last);
    this.last = this.kind;
    this.elapsed = 0;
    out.sounded = Math.random() < SHAPES[this.kind].heard ? this.kind : null;
    this.countdown = repertoire.wait * (0.5 + Math.random() * 1.4);
  }
}
