import { MathUtils, Vector3 } from "three";
import type { MoodProfile } from "./mind";
import type { Vivarium } from "./vivarium";

export interface Swim {
  vivarium: Vivarium;
  /** Where the visitor's hand sits on the glass, in normalised screen coordinates. */
  handX: number;
  handY: number;
  mood: MoodProfile;
  fear: number;
  curiosity: number;
  radius: number;
  knocked: boolean;
}

const ease = (dt: number, rate: number) => 1 - Math.exp(-rate * dt);

/**
 * How it gets around. Nothing steers continuously: it gathers itself, pushes once, then coasts,
 * so the swimming comes out in beats. Where it aims is the sum of two wants, one pulling it to
 * the glass and one pushing it into the back.
 */
export class Locomotion {
  readonly position = new Vector3(0, 0, -0.8);
  readonly velocity = new Vector3();
  /** Smoothed direction of travel, which the body lags behind. */
  readonly flow = new Vector3(0, 0, 1);
  speed = 0;
  /** The contraction that precedes a thrust, 0 to 1. */
  jet = 0;
  /** How far out of sight it has taken itself. */
  hidden = 0;
  /** How close it is to lying on the bottom. */
  grounded = 0;

  private readonly aim = new Vector3();
  private readonly course = new Vector3();
  private readonly escape = new Vector3();
  private phase = Math.random();
  private period = 2;
  private pushed = false;
  private frozen = 0;
  private clock = 0;
  private drift = Math.random() * 40;

  update(dt: number, swim: Swim): void {
    const { vivarium, mood, fear, curiosity, radius } = swim;
    this.clock += dt;

    // Prey holds still before it flees.
    if (swim.knocked) {
      this.frozen = 0.1 + Math.random() * 0.2;
      this.phase = 0;
      this.pushed = true;
    }
    const held = this.frozen > 0;
    this.frozen = Math.max(0, this.frozen - dt);
    if (held && this.frozen <= 0) {
      this.phase = 0.34;
      this.pushed = false;
    }

    const retreat = MathUtils.clamp(mood.depth + fear * 0.8 - curiosity * 0.35, 0, 1);
    const wantZ = MathUtils.lerp(vivarium.glass - radius * 1.1, vivarium.back + radius, retreat);
    vivarium.place(swim.handX, swim.handY, wantZ, this.aim);

    if (fear > 0.01) {
      this.escape.subVectors(this.position, this.aim).setZ(0);
      if (this.escape.lengthSq() < 1e-4) this.escape.set(1, 0.35, 0);
      this.escape.normalize().multiplyScalar(1.6 + fear * 1.4);
      this.aim.x = MathUtils.lerp(this.aim.x, this.position.x + this.escape.x, fear);
      this.aim.y = MathUtils.lerp(this.aim.y, this.position.y + this.escape.y, fear);
    }

    const swayX = Math.sin(this.clock * 0.23 + this.drift) * Math.sin(this.clock * 0.11 + 1.7);
    const swayY = Math.cos(this.clock * 0.19 + this.drift * 1.3) * Math.sin(this.clock * 0.09);
    this.aim.x += swayX * mood.roam;
    this.aim.y += swayY * mood.roam * 0.6;
    if (mood.sink > 0.01) {
      this.aim.y = MathUtils.lerp(this.aim.y, vivarium.floor(wantZ, radius * 0.9), mood.sink);
    }
    this.aim.z = wantZ;

    this.phase += dt / this.period;
    if (this.phase >= 1) {
      this.phase -= 1;
      this.period = (0.55 + Math.random() * 0.95) / Math.max(mood.pace, 0.05);
      this.pushed = false;
    }
    const gathering = MathUtils.clamp(this.phase / 0.34, 0, 1);
    this.jet =
      this.phase < 0.34 ? gathering * gathering : Math.max(0, 1 - (this.phase - 0.34) / 0.3);

    this.course.subVectors(this.aim, this.position);
    const gap = this.course.length();
    if (!this.pushed && this.phase >= 0.34) {
      this.pushed = true;
      if (this.frozen <= 0 && gap > 0.03) {
        const urge = MathUtils.clamp(gap / 0.7, 0.15, 1);
        this.velocity.addScaledVector(this.course, (mood.vigor * urge * 0.9) / gap);
      }
    }

    // Something too tired to swim slowly comes to rest on the bottom.
    this.velocity.y -= mood.sink * 0.35 * dt;
    this.velocity.multiplyScalar(Math.exp(-(this.frozen > 0 ? 7 : 1.9) * dt));
    this.position.addScaledVector(this.velocity, dt);
    vivarium.contain(this.position, this.velocity, radius);

    const rate = this.velocity.length();
    this.speed += (rate - this.speed) * ease(dt, 5);
    if (rate > 0.02) {
      this.course.copy(this.velocity).divideScalar(rate);
      this.flow.lerp(this.course, ease(dt, 3.2)).normalize();
    }

    const sunk = MathUtils.clamp(
      (vivarium.glass - this.position.z) / (vivarium.glass - vivarium.back),
      0,
      1,
    );
    this.hidden = MathUtils.clamp(sunk * (0.3 + fear * 0.9), 0, 1);
    const clearance = this.position.y - vivarium.floor(this.position.z, radius);
    this.grounded = MathUtils.clamp(1 - clearance / Math.max(radius, 0.01), 0, 1);
  }
}
