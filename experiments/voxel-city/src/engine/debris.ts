import {
  BoxGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  type Material,
  type Scene,
  Vector3,
} from "three";
import { SIZE_X, SIZE_Y, SIZE_Z, VOXEL } from "./constants";
import { MATERIALS } from "./materials";
import type { World } from "./world";

const MAX = 30_000;
const GRAVITY = -9.81 / VOXEL;
const SLIDE = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export interface DebrisFrame {
  impacts: number;
  impactCenter: Vector3;
}

/** Loose voxels flying around. When they come to rest they are written back into the world. */
export class Debris {
  count = 0;
  private readonly px = new Float32Array(MAX);
  private readonly py = new Float32Array(MAX);
  private readonly pz = new Float32Array(MAX);
  private readonly vx = new Float32Array(MAX);
  private readonly vy = new Float32Array(MAX);
  private readonly vz = new Float32Array(MAX);
  private readonly rest = new Float32Array(MAX);
  private readonly age = new Float32Array(MAX);
  private readonly mat = new Uint8Array(MAX);
  private readonly mesh: InstancedMesh;
  private readonly colors = new Float32Array(MAX * 3);
  private readonly frame: DebrisFrame = {
    impacts: 0,
    impactCenter: new Vector3(),
  };

  constructor(
    scene: Scene,
    private readonly world: World,
    material: Material,
  ) {
    this.mesh = new InstancedMesh(
      new BoxGeometry(VOXEL, VOXEL, VOXEL),
      material,
      MAX,
    );
    this.mesh.instanceColor = new InstancedBufferAttribute(this.colors, 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  get free(): number {
    return MAX - this.count;
  }

  /** Position (voxel units) and velocity (voxels per second). */
  spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    mat: number,
  ): boolean {
    if (this.count >= MAX) return false;
    const i = this.count++;
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.vz[i] = vz;
    this.rest[i] = 0;
    this.age[i] = 0;
    this.mat[i] = mat;
    const c = MATERIALS[mat].color;
    const k = 0.85 + Math.random() * 0.25;
    this.colors[i * 3] = c.r * k;
    this.colors[i * 3 + 1] = c.g * k;
    this.colors[i * 3 + 2] = c.b * k;
    return true;
  }

  /** Pushes debris away from a point (voxel units); `power` in voxels per second. */
  blast(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    power: number,
  ): void {
    for (let i = 0; i < this.count; i++) {
      const dx = this.px[i] - cx;
      const dy = this.py[i] - cy;
      const dz = this.pz[i] - cz;
      const d = Math.hypot(dx, dy, dz);
      if (d > radius || d < 1e-3) continue;
      const k = (power * (1 - d / radius)) / d;
      this.vx[i] += dx * k;
      this.vy[i] += dy * k + power * 0.3;
      this.vz[i] += dz * k;
      this.rest[i] = 0;
    }
  }

  clear(): void {
    this.count = 0;
    this.mesh.count = 0;
  }

  update(dt: number): DebrisFrame {
    const { world, px, py, pz, vx, vy, vz } = this;
    const frame = this.frame;
    frame.impacts = 0;
    frame.impactCenter.set(0, 0, 0);

    let i = 0;
    while (i < this.count) {
      this.age[i] += dt;
      vy[i] += GRAVITY * dt;
      const fastest = Math.max(
        Math.abs(vx[i]),
        Math.abs(vy[i]),
        Math.abs(vz[i]),
      );
      const steps = Math.min(10, Math.max(1, Math.ceil((fastest * dt) / 0.8)));
      const h = dt / steps;

      for (let s = 0; s < steps; s++) {
        const nx = px[i] + vx[i] * h;
        if (world.isSolidAt(nx, py[i], pz[i])) vx[i] *= -0.3;
        else px[i] = nx;
        const nz = pz[i] + vz[i] * h;
        if (world.isSolidAt(px[i], py[i], nz)) vz[i] *= -0.3;
        else pz[i] = nz;
        const ny = py[i] + vy[i] * h;
        const edge = vy[i] < 0 ? ny - 0.5 : ny + 0.5;
        if (world.isSolidAt(px[i], edge, pz[i])) {
          if (vy[i] < 0) {
            if (vy[i] < -50) {
              frame.impacts++;
              frame.impactCenter.x += px[i];
              frame.impactCenter.y += py[i];
              frame.impactCenter.z += pz[i];
            }
            py[i] = Math.floor(edge) + 1.5;
            vy[i] *= -0.25;
            vx[i] *= 0.6;
            vz[i] *= 0.6;
          } else vy[i] = 0;
        } else py[i] = ny;
      }
      if (world.isSolidAt(px[i], py[i], pz[i])) py[i] = Math.floor(py[i]) + 1.5;

      const grounded = world.isSolidAt(px[i], py[i] - 0.55, pz[i]);
      if (grounded) {
        const f = Math.max(0, 1 - 10 * dt);
        vx[i] *= f;
        vz[i] *= f;
      }
      const speed2 = vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i];
      if (grounded && speed2 < 36) this.rest[i] += dt;
      else this.rest[i] = 0;

      const out =
        px[i] < 0 ||
        px[i] >= SIZE_X ||
        pz[i] < 0 ||
        pz[i] >= SIZE_Z ||
        py[i] < 0 ||
        this.age[i] > 12;
      if (out) {
        this.remove(i);
        continue;
      }
      if (this.rest[i] > 0.12 || (grounded && this.age[i] > 6)) {
        this.settle(i);
        this.remove(i);
        continue;
      }
      i++;
    }

    if (frame.impacts > 0)
      frame.impactCenter.multiplyScalar(VOXEL / frame.impacts);
    this.writeInstances();
    return frame;
  }

  /** Writes the voxel back, sliding down neighbouring slopes so rubble forms piles instead of columns. */
  private settle(i: number): void {
    const world = this.world;
    let x = Math.floor(this.px[i]);
    let z = Math.floor(this.pz[i]);
    let y = Math.floor(this.py[i]);
    while (y < SIZE_Y - 1 && world.get(x, y, z) !== 0) y++;
    for (let step = 0; step < 32 && y > 0; step++) {
      if (world.get(x, y - 1, z) === 0) {
        y--;
        continue;
      }
      const start = Math.floor(Math.random() * 4);
      let moved = false;
      for (let k = 0; k < 4 && !moved; k++) {
        const [dx, dz] = SLIDE[(start + k) & 3];
        if (
          world.get(x + dx, y, z + dz) === 0 &&
          world.get(x + dx, y - 1, z + dz) === 0
        ) {
          x += dx;
          z += dz;
          y--;
          moved = true;
        }
      }
      if (!moved) break;
    }
    world.set(x, y, z, this.mat[i]);
  }

  private remove(i: number): void {
    const last = --this.count;
    if (i === last) return;
    this.px[i] = this.px[last];
    this.py[i] = this.py[last];
    this.pz[i] = this.pz[last];
    this.vx[i] = this.vx[last];
    this.vy[i] = this.vy[last];
    this.vz[i] = this.vz[last];
    this.rest[i] = this.rest[last];
    this.age[i] = this.age[last];
    this.mat[i] = this.mat[last];
    this.colors.copyWithin(i * 3, last * 3, last * 3 + 3);
  }

  private writeInstances(): void {
    const m = this.mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      const o = i * 16;
      m[o] = 1;
      m[o + 1] = 0;
      m[o + 2] = 0;
      m[o + 3] = 0;
      m[o + 4] = 0;
      m[o + 5] = 1;
      m[o + 6] = 0;
      m[o + 7] = 0;
      m[o + 8] = 0;
      m[o + 9] = 0;
      m[o + 10] = 1;
      m[o + 11] = 0;
      m[o + 12] = this.px[i] * VOXEL;
      m[o + 13] = this.py[i] * VOXEL;
      m[o + 14] = this.pz[i] * VOXEL;
      m[o + 15] = 1;
    }
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
