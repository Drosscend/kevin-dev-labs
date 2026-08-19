import { Vector3 } from "three";

const UP = new Vector3(0, 1, 0);
const ASIDE = new Vector3(1, 0, 0);

export interface GazeSenses {
  /** Where the pointer sits on the orb, in world space. */
  wanted: Vector3;
  /** The pointer is present and has moved recently. */
  seen: boolean;
  /** How much the orb wants to pull away from what it sees. */
  shy: number;
  agitation: number;
}

const clamp1 = (value: number) => Math.min(Math.max(value, -1), 1);

function tangentOf(dir: Vector3, out: Vector3): Vector3 {
  const helper = Math.abs(dir.y) < 0.97 ? UP : ASIDE;
  return out.crossVectors(dir, helper).normalize();
}

/** Great-circle interpolation, valid past t = 1 so a saccade can overshoot. */
function slerp(out: Vector3, from: Vector3, to: Vector3, t: number): Vector3 {
  const theta = Math.acos(clamp1(from.dot(to)));
  if (theta < 1e-4) return out.copy(to);
  const sin = Math.sin(theta);
  return out
    .copy(from)
    .multiplyScalar(Math.sin((1 - t) * theta) / sin)
    .addScaledVector(to, Math.sin(t * theta) / sin)
    .normalize();
}

function overshoot(t: number): number {
  const p = t - 1;
  return 1 + 2.2 * p * p * p + 1.2 * p * p;
}

/**
 * Where the orb is looking. Eyes do not track continuously: they jump, hold, drift a little,
 * keep staring at the last place something was, then wander off looking for it.
 */
export class Gaze {
  readonly dir = new Vector3(0, 0, 1);
  focus = 0;
  searching = false;

  private readonly target = new Vector3(0, 0, 1);
  private readonly from = new Vector3(0, 0, 1);
  private readonly to = new Vector3(0, 0, 1);
  private readonly side = new Vector3();
  private readonly lift = new Vector3();
  private travel = 1;
  private span = 0.1;
  private refractory = 0;
  private wander = 0;
  private lost = 99;
  private avertSide = 1;
  private clock = 0;

  update(dt: number, senses: GazeSenses): void {
    this.clock += dt;
    this.lost = senses.seen ? 0 : this.lost + dt;
    this.refractory -= dt;
    this.wander -= dt;
    this.searching = this.lost > 3.2;

    if (this.searching) {
      if (this.wander <= 0) {
        this.roam();
        this.wander = 1.5 + Math.random() * 3.5;
      }
      this.focus += (0.28 - this.focus) * (1 - Math.exp(-0.7 * dt));
    } else {
      this.target.copy(senses.wanted);
      if (senses.shy < 0.05) this.avertSide = Math.random() < 0.5 ? 1 : -1;
      else this.avert(senses.shy);
      this.focus += (1 - this.focus) * (1 - Math.exp(-2.4 * dt));
    }

    const gap = Math.acos(clamp1(this.dir.dot(this.target)));
    if (this.travel >= 1 && this.refractory <= 0 && gap > 0.11) {
      this.from.copy(this.dir);
      this.to.copy(this.target);
      this.span = 0.045 + gap * 0.05;
      this.travel = 0;
      this.refractory = this.span + (0.12 + Math.random() * 0.3) / (0.7 + senses.agitation);
    }

    if (this.travel < 1) {
      this.travel = Math.min(1, this.travel + dt / this.span);
      slerp(this.dir, this.from, this.to, overshoot(this.travel));
    } else {
      slerp(this.dir, this.dir, this.target, 1 - Math.exp(-0.75 * dt));
    }

    this.tremble(0.0032 + 0.005 * senses.agitation);
  }

  /** Ocular microtremor: the eye never truly holds still. */
  private tremble(amount: number): void {
    tangentOf(this.dir, this.side);
    this.lift.crossVectors(this.dir, this.side);
    this.dir
      .addScaledVector(this.side, Math.sin(this.clock * 8.7) * amount)
      .addScaledVector(this.lift, Math.cos(this.clock * 6.1 + 1.3) * amount)
      .normalize();
  }

  private avert(shy: number): void {
    tangentOf(this.target, this.side);
    const angle = shy * 0.8 * this.avertSide;
    this.target.multiplyScalar(Math.cos(angle)).addScaledVector(this.side, Math.sin(angle));
    this.target.normalize();
  }

  private roam(): void {
    const around = Math.random() * Math.PI * 2;
    const away = 0.3 + Math.random() * 1.0;
    this.target
      .set(Math.cos(around) * Math.sin(away), Math.sin(around) * Math.sin(away), Math.cos(away))
      .normalize();
  }
}
