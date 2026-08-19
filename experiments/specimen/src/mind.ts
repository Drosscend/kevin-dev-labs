import { Color } from "three";

export type MoodName = "resting" | "curious" | "playful" | "startled" | "dreaming";

export interface MoodProfile {
  deep: Color;
  skin: Color;
  vein: Color;
  agitation: number;
  swell: number;
  breathRate: number;
  breathDepth: number;
  /** Roughly how many times a second something fires inside. */
  spark: number;
  glow: number;
  bloom: number;
  halo: number;
  scale: number;
  spin: number;
  /** Where in the tank it would rather be: 0 against the glass, 1 lost in the back. */
  depth: number;
  /** Thrusts per second. */
  pace: number;
  /** How hard each thrust pushes. */
  vigor: number;
  /** How far it lets itself drift sideways from where it was heading. */
  roam: number;
  /** How much it lets itself settle towards the floor. */
  sink: number;
}

const PROFILES: Record<MoodName, MoodProfile> = {
  resting: {
    deep: new Color(0x0a2540),
    skin: new Color(0x2fd6c0),
    vein: new Color(0x8ef7ff),
    agitation: 0.12,
    swell: 1.0,
    breathRate: 0.11,
    breathDepth: 0.036,
    spark: 0.5,
    glow: 0.4,
    bloom: 0.55,
    halo: 0.6,
    scale: 1.0,
    spin: 0.05,
    depth: 0.55,
    pace: 0.34,
    vigor: 0.9,
    roam: 0.5,
    sink: 0.06,
  },
  curious: {
    deep: new Color(0x123a4f),
    skin: new Color(0x5fe08c),
    vein: new Color(0xd9ff86),
    agitation: 0.3,
    swell: 1.1,
    breathRate: 0.17,
    breathDepth: 0.03,
    spark: 0.9,
    glow: 0.5,
    bloom: 0.62,
    halo: 0.7,
    scale: 1.03,
    spin: 0.09,
    depth: 0.08,
    pace: 0.75,
    vigor: 1.35,
    roam: 0.7,
    sink: 0,
  },
  playful: {
    deep: new Color(0x3a1148),
    skin: new Color(0xff5fa8),
    vein: new Color(0xffd166),
    agitation: 0.62,
    swell: 1.25,
    breathRate: 0.26,
    breathDepth: 0.026,
    spark: 1.6,
    glow: 0.62,
    bloom: 0.7,
    halo: 0.8,
    scale: 1.06,
    spin: 0.16,
    depth: 0.05,
    pace: 1.5,
    vigor: 2.1,
    roam: 1.2,
    sink: 0,
  },
  startled: {
    deep: new Color(0x400a18),
    skin: new Color(0xff3b52),
    vein: new Color(0xfff1a8),
    agitation: 1.0,
    swell: 0.9,
    breathRate: 0.4,
    breathDepth: 0.02,
    spark: 2.6,
    glow: 0.7,
    bloom: 0.78,
    halo: 0.95,
    scale: 0.94,
    spin: 0.28,
    depth: 0.95,
    pace: 1.9,
    vigor: 2.7,
    roam: 0.9,
    sink: 0,
  },
  dreaming: {
    deep: new Color(0x070b22),
    skin: new Color(0x3d55b8),
    vein: new Color(0x9a86ff),
    agitation: 0.05,
    swell: 0.8,
    breathRate: 0.055,
    breathDepth: 0.05,
    spark: 0.25,
    glow: 0.28,
    bloom: 0.55,
    halo: 0.45,
    scale: 0.95,
    spin: 0.02,
    depth: 0.88,
    pace: 0.12,
    vigor: 0.5,
    roam: 0.16,
    sink: 0.55,
  },
};

export interface Senses {
  pointerSpeed: number;
  pointerNear: number;
  idleTime: number;
  knocked: boolean;
  touch: number;
  /** How close the visitor's hand is to the creature itself, 0 to 1. */
  crowded: number;
  gone: boolean;
}

const WARM = new Color(0xffb27a);

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

function clone(profile: MoodProfile): MoodProfile {
  return {
    ...profile,
    deep: profile.deep.clone(),
    skin: profile.skin.clone(),
    vein: profile.vein.clone(),
  };
}

function approach(from: number, to: number, rate: number, dt: number): number {
  return from + (to - from) * (1 - Math.exp(-rate * dt));
}

/** Decides how the creature feels, and keeps every rendered value drifting there smoothly. */
export class Mind {
  name: MoodName = "dreaming";
  readonly felt: MoodProfile = clone(PROFILES.dreaming);
  /** How used to the visitor it is. Builds up while touched, fades over a couple of minutes. */
  familiarity = 0;
  /** How badly it wants something to happen. Only builds once it knows the visitor. */
  boredom = 0;
  /** Wants to come closer. */
  curiosity = 0;
  /** Wants to be somewhere else. */
  fear = 0;

  private energy = 0;
  private startle = 0;
  private held = 0;
  private readonly warmSkin = new Color();
  private readonly warmVein = new Color();

  update(dt: number, senses: Senses): void {
    this.energy += senses.pointerSpeed * dt * 2.4 - this.energy * dt * 0.7;
    this.energy = Math.max(0, Math.min(this.energy, 6));

    const engaged = clamp01(
      senses.touch * 0.9 + Math.min(senses.pointerSpeed, 5) * 0.14 + (senses.knocked ? 1 : 0),
    );
    this.familiarity = clamp01(this.familiarity + (engaged - this.familiarity * 0.35) * dt * 0.05);
    const ignored = senses.idleTime > 6 ? this.familiarity : 0;
    this.boredom += (ignored - this.boredom) * (1 - Math.exp(-0.07 * dt));

    this.drives(dt, senses);

    // A creature that knows you stops jumping at every knock.
    if (senses.knocked) this.startle = (1.4 + Math.random() * 0.9) * (1 - this.familiarity * 0.55);
    this.startle = Math.max(0, this.startle - dt);
    this.held += dt;

    const wanted = this.decide(senses);
    if (wanted !== this.name && this.held > 0.35) {
      this.name = wanted;
      this.held = 0;
    }

    const target = PROFILES[this.name];
    const rate = this.name === "startled" ? 9 : 1.1;
    const colorRate = this.name === "startled" ? 7 : 0.85;
    const k = 1 - Math.exp(-colorRate * dt);

    const warmth = this.familiarity * 0.17;
    this.warmSkin.copy(target.skin).lerp(WARM, warmth);
    this.warmVein.copy(target.vein).lerp(WARM, warmth * 0.6);

    this.felt.deep.lerp(target.deep, k);
    this.felt.skin.lerp(this.warmSkin, k);
    this.felt.vein.lerp(this.warmVein, k);

    this.felt.agitation = approach(this.felt.agitation, target.agitation, rate, dt);
    this.felt.swell = approach(this.felt.swell, target.swell, rate, dt);
    this.felt.breathRate = approach(this.felt.breathRate, target.breathRate, rate, dt);
    this.felt.breathDepth = approach(this.felt.breathDepth, target.breathDepth, rate, dt);
    this.felt.spark = approach(this.felt.spark, target.spark, rate * 1.4, dt);
    this.felt.glow = approach(this.felt.glow, target.glow, rate, dt);
    this.felt.bloom = approach(this.felt.bloom, target.bloom, rate, dt);
    this.felt.halo = approach(this.felt.halo, target.halo, rate, dt);
    this.felt.scale = approach(this.felt.scale, target.scale, rate, dt);
    this.felt.spin = approach(this.felt.spin, target.spin, rate, dt);
    this.felt.depth = approach(this.felt.depth, target.depth, rate * 0.7, dt);
    this.felt.pace = approach(this.felt.pace, target.pace, rate, dt);
    this.felt.vigor = approach(this.felt.vigor, target.vigor, rate, dt);
    this.felt.roam = approach(this.felt.roam, target.roam, rate, dt);
    this.felt.sink = approach(this.felt.sink, target.sink, rate * 0.6, dt);
  }

  /**
   * Two wants pulling against each other. Being crowded feeds the fear, which sends it away;
   * once away, the fear drains and the curiosity builds again. Nothing schedules the hesitation,
   * it falls out of the two rates.
   */
  private drives(dt: number, senses: Senses): void {
    const crowded = senses.crowded;
    const rush = clamp01((senses.pointerSpeed - 2.5) / 5);
    const shyness = 1 - this.familiarity * 0.45;
    const pressed = clamp01(crowded * (0.55 + rush * 0.7)) * shyness;

    if (senses.knocked) {
      this.fear = Math.min(1, this.fear + (0.55 + Math.random() * 0.35) * shyness);
    }
    const climbing = pressed > this.fear;
    this.fear = approach(this.fear, pressed, climbing ? 1.1 : 0.34, dt);

    const invited = senses.gone ? 0.12 : clamp01(1 - crowded * 0.85) * (1 - this.fear * 0.9);
    this.curiosity = approach(this.curiosity, invited, invited > this.curiosity ? 0.3 : 0.9, dt);
  }

  private decide(senses: Senses): MoodName {
    if (this.startle > 0 || this.fear > 0.62) return "startled";
    if (senses.idleTime > 15 + this.familiarity * 12) return "dreaming";
    if (this.energy > 2.6 - this.familiarity * 1.2) return "playful";
    if (senses.idleTime < 2.5 + this.familiarity * 2 || senses.pointerNear > 0.5) return "curious";
    return "resting";
  }
}
