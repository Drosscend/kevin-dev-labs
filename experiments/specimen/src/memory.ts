import type { Vector3 } from "three";

const KEY = "specimen";
const MARKS = 5;
const DAY = 86_400_000;

export interface Remembered {
  seed: number;
  /** When it last saw anyone, in milliseconds. */
  seen: number;
  familiarity: number;
  /** How used it is to being knocked at, and to being approached. */
  knockTolerance: number;
  nearTolerance: number;
  /** The spot it keeps coming back to, in its own tank. */
  home: [number, number, number] | null;
  /** Where it has been touched enough for the mark to stay, plus how strong each one is. */
  marks: [number, number, number, number][];
}

function fresh(): Remembered {
  return {
    seed: Math.floor(Math.random() * 4294967296),
    seen: Date.now(),
    familiarity: 0,
    knockTolerance: 0,
    nearTolerance: 0,
    home: null,
    marks: [],
  };
}

/**
 * The one thing that survives the tab: which creature this browser hatched, and what it has
 * made of you. Nothing here leaves the machine, and clearing the site data kills it for good.
 */
export class Memory {
  readonly state: Remembered;
  private since = 0;
  private gone = false;

  constructor() {
    this.state = this.recall();
  }

  private recall(): Remembered {
    let stored: Remembered | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) stored = JSON.parse(raw) as Remembered;
    } catch {
      stored = null;
    }
    if (!stored || typeof stored.seed !== "number") return fresh();

    // Everything it holds cools off while nobody comes. The marks outlast the rest.
    const days = Math.max(0, (Date.now() - stored.seen) / DAY);
    stored.familiarity *= Math.exp(-days / 2.5);
    stored.knockTolerance *= Math.exp(-days / 5);
    stored.nearTolerance *= Math.exp(-days / 5);
    stored.marks = (stored.marks ?? [])
      .map(([x, y, z, weight]) => [x, y, z, weight * Math.exp(-days / 30)] as const)
      .filter(([, , , weight]) => weight > 0.04)
      .map((mark) => [...mark] as [number, number, number, number]);
    return stored;
  }

  /** Strengthens the mark nearest to where the hand rested, or leaves a new one. */
  markAt(dir: Vector3, amount: number): void {
    const marks = this.state.marks;
    let nearest = -1;
    let closest = 0.94;
    for (let i = 0; i < marks.length; i++) {
      const [x, y, z] = marks[i];
      const alike = dir.x * x + dir.y * y + dir.z * z;
      if (alike > closest) {
        closest = alike;
        nearest = i;
      }
    }
    if (nearest >= 0) {
      marks[nearest][3] = Math.min(1, marks[nearest][3] + amount);
      return;
    }
    if (marks.length >= MARKS) {
      let weakest = 0;
      for (let i = 1; i < marks.length; i++) if (marks[i][3] < marks[weakest][3]) weakest = i;
      if (marks[weakest][3] > amount) return;
      marks.splice(weakest, 1);
    }
    marks.push([dir.x, dir.y, dir.z, amount]);
  }

  /** Called now and then: writing on every frame would be absurd. */
  keep(dt: number): void {
    this.since += dt;
    if (this.since < 12) return;
    this.since = 0;
    this.save();
  }

  save(): void {
    if (this.gone) return;
    this.state.seen = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // A browser that refuses to remember simply hatches a new creature every time.
    }
  }

  /** Nothing may write it back afterwards: leaving the page must not resurrect it. */
  forget(): void {
    this.gone = true;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to forget.
    }
  }
}
