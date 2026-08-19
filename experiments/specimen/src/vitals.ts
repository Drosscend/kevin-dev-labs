import type { MoodProfile } from "./mind";

const TAU = Math.PI * 2;
const LIVE = 4;

/** Air goes in quickly, comes out slowly, and rests a moment at the bottom. */
function breathCurve(phase: number): number {
  const p = phase - Math.floor(phase);
  if (p < 0.34) return -Math.cos((p / 0.34) * Math.PI);
  return Math.cos(((p - 0.34) / 0.66) ** 0.78 * Math.PI);
}

/**
 * The slow swell, and whatever it is that beats inside. The beating has no rhythm to hold on
 * to: a handful of impulses crowd together, then nothing for long enough to wonder whether it
 * stopped. Never a rate, never twice the same interval.
 */
export class Vitals {
  /** How much the whole body swells, already scaled by the mood's breath depth. */
  breath = 0;
  /** The raw swell wave, from full out to full in. */
  wave = 0;
  pulse = 0;
  /** Seconds since the last impulse, which the skin uses to send a ring around. */
  phase = 9;
  /** True for the single frame an impulse fires. */
  fired = false;

  private breathPhase = 0;
  private readonly ages = new Float32Array(LIVE).fill(99);
  private slot = 0;
  private left = 0;
  private next = 1.5;

  update(dt: number, mood: MoodProfile, extraBreath: number): void {
    this.breathPhase += dt * mood.breathRate;
    this.wave = breathCurve(this.breathPhase);
    const tide = this.wave * 0.82 + Math.sin(this.breathPhase * TAU * 0.41 + 1.2) * 0.18;
    this.breath = (tide + extraBreath * 1.9) * mood.breathDepth;

    this.fired = false;
    this.next -= dt;
    if (this.next <= 0) {
      this.fired = true;
      this.ages[this.slot] = 0;
      this.slot = (this.slot + 1) % LIVE;
      if (this.left > 0) {
        this.left -= 1;
        this.next = 0.07 + Math.random() * 0.17;
      } else {
        // A run of one to five, then a silence with no length you could guess.
        this.left = Math.random() < 0.45 ? 0 : 1 + Math.floor(Math.random() * 4);
        this.next = (0.35 + Math.random() ** 2 * 5.5) / Math.max(mood.spark, 0.05);
      }
    }

    this.pulse = 0;
    this.phase = 9;
    for (let i = 0; i < LIVE; i++) {
      const age = this.ages[i] + dt;
      this.ages[i] = age;
      if (age > 1.4) continue;
      this.phase = Math.min(this.phase, age);
      this.pulse += age < 0.05 ? age / 0.05 : Math.exp(-(age - 0.05) * 6.5);
    }
    this.pulse = Math.min(this.pulse, 1.6) * 0.72;
  }
}
