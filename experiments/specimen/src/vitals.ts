import type { MoodProfile } from "./mind";

const TAU = Math.PI * 2;

/** Air goes in quickly, comes out slowly, and rests a moment at the bottom. */
function breathCurve(phase: number): number {
  const p = phase - Math.floor(phase);
  if (p < 0.34) return -Math.cos((p / 0.34) * Math.PI);
  return Math.cos(((p - 0.34) / 0.66) ** 0.78 * Math.PI);
}

/** Breathing and the heart, neither of them a sine wave. */
export class Vitals {
  /** How much the whole body swells, already scaled by the mood's breath depth. */
  breath = 0;
  /** The raw breathing wave, from full out to full in. */
  wave = 0;
  pulse = 0;
  phase = 0;
  bpm = 44;
  beat = false;

  private breathPhase = 0;
  private rush = 0;
  private compensate = 0;

  update(dt: number, time: number, mood: MoodProfile, extraBreath: number): void {
    this.breathPhase += dt * mood.breathRate;
    this.wave = breathCurve(this.breathPhase);
    const tide = this.wave * 0.82 + Math.sin(this.breathPhase * TAU * 0.41 + 1.2) * 0.18;
    this.breath = (tide + extraBreath * 1.9) * mood.breathDepth;

    // Sinus arrhythmia: the heart hurries on the way in and eases off on the way out.
    const sway = Math.sin(time * 0.37) + Math.sin(time * 0.131 + 2.1);
    this.bpm = mood.bpm * (1 + this.wave * 0.085 + sway * 0.018) * (this.compensate > 0 ? 0.72 : 1);

    this.phase += (dt * this.bpm) / 60 + (this.rush > 0 ? dt * 1.7 : 0);
    this.beat = false;
    if (this.phase >= 1) {
      this.phase -= 1;
      this.beat = true;
      if (this.rush > 0) {
        this.rush = 0;
        this.compensate = 0.9;
      } else if (this.compensate > 0) {
        this.compensate = 0;
      } else if (Math.random() < 0.028) {
        // Once in a while a beat comes early, and the next one waits for it.
        this.rush = 0.9;
      }
    }
    this.rush = Math.max(0, this.rush - dt);
    this.compensate = Math.max(0, this.compensate - dt);

    const lub = Math.exp(-((this.phase * 9) ** 2));
    const dub = 0.55 * Math.exp(-(((this.phase - 0.17) * 11) ** 2));
    this.pulse = (lub + dub) * 0.72;
  }
}
