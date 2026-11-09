import { type Object3D, type Scene, Vector3 } from "three";
import type { GameAudio, LoopSound } from "../engine/audio";
import { VOXEL } from "../engine/constants";
import type { Physics } from "../engine/physics";
import type { World } from "../engine/world";

export interface ProjectileHit {
  point: Vector3;
  normal: Vector3;
  /** Speed along the normal at impact, m/s. */
  speed: number;
}

export interface ProjectileOptions {
  model: Object3D;
  position: Vector3;
  velocity: Vector3;
  /** Collision radius in meters. */
  radius?: number;
  /** Gravity multiplier: 0 flies straight. */
  gravity?: number;
  restitution?: number;
  /** Ground friction rate, 1/s (default 6). */
  friction?: number;
  /** No bounce sound. */
  silent?: boolean;
  /** Seconds before `onExpire`. */
  fuse?: number;
  spin?: Vector3;
  /** Return true to remove the projectile (e.g. a rocket exploding). */
  onImpact?: (p: Projectile, hit: ProjectileHit) => boolean;
  onExpire?: (p: Projectile) => void;
  onUpdate?: (p: Projectile, dt: number) => void;
  loop?: LoopSound;
  /** Orient the model along its velocity instead of spinning. */
  alignToVelocity?: boolean;
}

export class Projectile {
  readonly position: Vector3;
  readonly velocity: Vector3;
  age = 0;
  alive = true;

  constructor(readonly options: ProjectileOptions) {
    this.position = options.position.clone();
    this.velocity = options.velocity.clone();
  }
}

/** Anything thrown or fired: bounces on voxels and bodies, with fuse and impact callbacks. */
export class Projectiles {
  private readonly list: Projectile[] = [];
  private readonly forward = new Vector3(0, 1, 0);

  constructor(
    private readonly scene: Scene,
    private readonly world: World,
    private readonly physics: Physics,
    private readonly audio: GameAudio,
  ) {}

  spawn(options: ProjectileOptions): Projectile {
    const p = new Projectile(options);
    options.model.position.copy(p.position);
    this.scene.add(options.model);
    this.list.push(p);
    return p;
  }

  remove(p: Projectile): void {
    if (!p.alive) return;
    p.alive = false;
    p.options.loop?.stop();
    this.scene.remove(p.options.model);
  }

  clear(): void {
    for (const p of this.list) this.remove(p);
    this.list.length = 0;
  }

  update(dt: number): void {
    for (const p of [...this.list]) {
      if (p.alive) this.advance(p, dt);
      if (!p.alive) this.list.splice(this.list.indexOf(p), 1);
    }
  }

  private advance(p: Projectile, dt: number): void {
    const o = p.options;
    const r = o.radius ?? 0.04;
    p.age += dt;
    p.velocity.y -= 9.81 * (o.gravity ?? 1) * dt;

    const bodyHit = this.physics.castRay(
      p.position,
      p.velocity.clone().normalize(),
      p.velocity.length() * dt + r,
    );
    if (bodyHit && p.velocity.lengthSq() > 1e-4) {
      if (this.impact(p, bodyHit.point, bodyHit.normal)) return;
    } else {
      const steps = Math.max(
        1,
        Math.ceil((p.velocity.length() * dt) / (VOXEL * 0.7)),
      );
      const h = dt / steps;
      for (let s = 0; s < steps && p.alive; s++) if (this.step(p, h, r)) return;
    }

    const grounded = this.solid(
      p.position.x,
      p.position.y - r - 0.01,
      p.position.z,
    );
    if (grounded) {
      const f = Math.exp(-(o.friction ?? 6) * dt);
      p.velocity.x *= f;
      p.velocity.z *= f;
      o.spin?.multiplyScalar(f);
    }
    const model = o.model;
    model.position.copy(p.position);
    if (o.alignToVelocity && p.velocity.lengthSq() > 0.01)
      model.quaternion.setFromUnitVectors(
        this.forward,
        p.velocity.clone().normalize(),
      );
    else if (o.spin) {
      model.rotation.x += o.spin.x * dt;
      model.rotation.y += o.spin.y * dt;
      model.rotation.z += o.spin.z * dt;
    }
    o.loop?.move(p.position);
    o.onUpdate?.(p, dt);

    if (o.fuse !== undefined && p.age >= o.fuse && p.alive) {
      this.remove(p);
      o.onExpire?.(p);
    }
  }

  /** Moves one sub-step; returns true if the projectile was removed. */
  private step(p: Projectile, h: number, r: number): boolean {
    const pos = p.position;
    const v = p.velocity;
    const axes: ("x" | "y" | "z")[] = ["x", "z", "y"];
    for (const axis of axes) {
      const next = pos[axis] + v[axis] * h;
      const probe = pos.clone();
      probe[axis] = next + Math.sign(v[axis]) * r;
      if (!this.solid(probe.x, probe.y, probe.z)) {
        pos[axis] = next;
        continue;
      }
      const normal = new Vector3();
      normal[axis] = -Math.sign(v[axis]);
      if (axis === "y" && v.y < 0)
        pos.y = (Math.floor((next - r) / VOXEL) + 1) * VOXEL + r;
      if (this.impact(p, pos.clone(), normal)) return true;
    }
    return false;
  }

  /** Reflects the velocity or lets `onImpact` consume the projectile. */
  private impact(p: Projectile, point: Vector3, normal: Vector3): boolean {
    const speed = Math.abs(p.velocity.dot(normal));
    if (p.options.onImpact?.(p, { point, normal, speed })) {
      this.remove(p);
      return true;
    }
    const e = p.options.restitution ?? 0.35;
    const vn = normal.clone().multiplyScalar(p.velocity.dot(normal));
    p.velocity.sub(vn).multiplyScalar(0.8).addScaledVector(vn, -e);
    if (speed > 1.5 && !p.options.silent) this.audio.bounce(p.position, speed);
    return false;
  }

  private solid(x: number, y: number, z: number): boolean {
    return this.world.isSolidAt(x / VOXEL, y / VOXEL, z / VOXEL);
  }
}
