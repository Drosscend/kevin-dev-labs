import {
  CanvasTexture,
  Color,
  type PerspectiveCamera,
  type Texture,
  type Vector3,
} from "three";
import { MATERIALS } from "../../engine/materials";
import type { VoxelBody } from "../../engine/physics";
import type { Player } from "../player";

const DUST_GREY = new Color(0.62, 0.58, 0.52);

export function dustColor(material: number): Color {
  return MATERIALS[material].color.clone().lerp(DUST_GREY, 0.35);
}

export function smoothstep(a: number, b: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeIn = (t: number) => t * t * t;
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** Pushes a hit body along `dir` at `point`: speed change `dv` (m/s), impulse capped at `max` (N.s). */
export function kickBody(
  body: VoxelBody,
  point: Vector3,
  dir: Vector3,
  dv: number,
  max: number,
): void {
  if (!body.alive) return;
  const j = Math.min(body.rb.mass() * dv, max);
  body.rb.applyImpulseAtPoint(
    { x: dir.x * j, y: dir.y * j + j * 0.15, z: dir.z * j },
    { x: point.x, y: point.y, z: point.z },
    true,
  );
  const v = body.rb.linvel();
  body.prevVel.set(v.x, v.y, v.z);
}

/** Idle breathing, walk bob, jump lag and look sway for a view model, in camera space. */
export class ViewMotion {
  x = 0;
  y = 0;
  pitch = 0;
  yaw = 0;
  roll = 0;
  private time = 0;
  private phase = 0;
  private walk = 0;
  private fall = 0;
  private lagYaw = 0;
  private lagPitch = 0;
  private lastYaw = Number.NaN;
  private lastPitch = 0;

  /** Forgets the last camera angles so re-equipping does not sway. */
  reset(): void {
    this.lastYaw = Number.NaN;
    this.lagYaw = 0;
    this.lagPitch = 0;
    this.fall = 0;
  }

  update(dt: number, player: Player, camera: PerspectiveCamera): void {
    if (dt <= 0) return;
    this.time += dt;
    const v = player.velocity;
    const speed = Math.hypot(v.x, v.z);
    const k = 1 - Math.exp(-dt * 8);
    const walkTarget = player.onGround ? Math.min(1.4, speed / 4.8) : 0;
    this.walk += (walkTarget - this.walk) * k;
    this.phase += dt * speed * 1.45;
    const fallTarget = Math.max(-0.035, Math.min(0.03, -v.y * 0.004));
    this.fall += (fallTarget - this.fall) * k;

    const yaw = camera.rotation.y;
    const pitch = camera.rotation.x;
    if (Number.isNaN(this.lastYaw)) {
      this.lastYaw = yaw;
      this.lastPitch = pitch;
    }
    let dYaw = yaw - this.lastYaw;
    if (dYaw > Math.PI) dYaw -= Math.PI * 2;
    if (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const dPitch = pitch - this.lastPitch;
    this.lastYaw = yaw;
    this.lastPitch = pitch;
    const lag = 1 - Math.exp(-dt * 12);
    const limit = 0.035;
    this.lagYaw +=
      (Math.max(-limit, Math.min(limit, (dYaw / dt) * 0.006)) - this.lagYaw) *
      lag;
    this.lagPitch +=
      (Math.max(-limit, Math.min(limit, (dPitch / dt) * 0.006)) -
        this.lagPitch) *
      lag;

    const w = this.walk;
    const breathe = Math.sin(this.time * 1.6);
    this.x =
      Math.sin(this.phase) * 0.012 * w +
      Math.sin(this.time * 0.9) * 0.002 +
      this.lagYaw;
    this.y =
      -Math.abs(Math.cos(this.phase)) * 0.014 * w +
      breathe * 0.003 +
      this.fall -
      this.lagPitch;
    this.pitch = breathe * 0.006 - this.lagPitch * 1.5 + this.fall * 0.8;
    this.yaw = -this.lagYaw * 1.5;
    this.roll = Math.sin(this.phase) * 0.02 * w + this.lagYaw * 0.8;
  }
}

let flash: Texture | null = null;

/** Star-shaped additive sprite texture for muzzle flashes. */
export function flashTexture(): Texture {
  if (flash) return flash;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.translate(64, 64);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,230,170,0.9)");
    g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
      const len = 40 + Math.random() * 24;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.22) * 10, Math.sin(a - 0.22) * 10);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.lineTo(Math.cos(a + 0.22) * 10, Math.sin(a + 0.22) * 10);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  flash = new CanvasTexture(canvas);
  return flash;
}
