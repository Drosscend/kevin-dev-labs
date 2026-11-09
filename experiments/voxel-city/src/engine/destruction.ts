import { Matrix4, Vector3 } from "three";
import type { GameAudio } from "./audio";
import {
  pack,
  SIZE_X,
  SIZE_Y,
  SIZE_Z,
  unpackX,
  unpackY,
  unpackZ,
  VOXEL,
} from "./constants";
import type { Debris } from "./debris";
import type { Effects } from "./effects";
import { M, MATERIALS } from "./materials";
import type { Physics, VoxelBody } from "./physics";
import { findFloatingClusters, SUPPORT_Y } from "./structure";
import type { World } from "./world";

export interface Hit {
  point: Vector3;
  normal: Vector3;
  distance: number;
  material: number;
  body: VoxelBody | null;
}

export interface CarveResult {
  removed: number;
  material: number;
}

const DEBRIS_PER_BLAST = 2600;

/** Everything that breaks voxels: explosions, bullets, melee, plus raycasts against world and bodies. */
export class Destruction {
  /** Called after every explosion (player knockback, screen shake). */
  onBlast: ((center: Vector3, radius: number) => void) | null = null;
  private readonly pending: {
    removed: number[];
    center: Vector3;
    radius: number;
    strength: number;
  }[] = [];
  private blasted = false;

  constructor(
    private readonly world: World,
    private readonly physics: Physics,
    private readonly debris: Debris,
    private readonly effects: Effects,
    private readonly audio: GameAudio,
  ) {}

  /** Detaches what the latest blast left unsupported: one blast per frame, skipping frames that already paid for an explosion. */
  update(): void {
    const blasted = this.blasted;
    this.blasted = false;
    if (blasted && this.pending.length < 3) return;
    const job = this.pending.shift();
    if (job) this.detach(job.removed, job.center, job.radius, job.strength);
  }

  clear(): void {
    this.pending.length = 0;
  }

  /** Explosion of `radius` meters (dynamite: 1.6). Breaks world and bodies, throws pieces, plays fx and sound. */
  explode(center: Vector3, radius = 1.6): void {
    const cx = center.x / VOXEL;
    const cy = center.y / VOXEL;
    const cz = center.z / VOXEL;
    const R = radius / VOXEL;
    const reach = Math.ceil(R * 1.25);
    const removed: number[] = [];
    const removedMat: number[] = [];
    const removedDist: number[] = [];

    this.world.forEachSolidInSphere(cx, cy, cz, reach, (x, y, z, m, d) => {
      const hardness = MATERIALS[m].hardness;
      if (!Number.isFinite(hardness)) return;
      const e = d * hardness;
      if (e > R * 1.2 || (e > R * 0.8 && Math.random() < 0.5)) return;
      this.world.set(x, y, z, 0);
      removed.push(pack(x, y, z));
      removedMat.push(m);
      removedDist.push(d);
    });

    const chance = Math.min(1, DEBRIS_PER_BLAST / Math.max(1, removed.length));
    for (let k = 0; k < removed.length; k++) {
      if (Math.random() > chance || this.debris.free === 0) continue;
      const i = removed[k];
      const x = unpackX(i) + 0.5;
      const y = unpackY(i) + 0.5;
      const z = unpackZ(i) + 0.5;
      this.fling(x, y, z, cx, cy, cz, removedDist[k], R, removedMat[k]);
    }

    this.physics.damage(
      center,
      radius * 1.2,
      (d, m) =>
        d * MATERIALS[m].hardness < radius * (0.8 + Math.random() * 0.4),
      (x, y, z, m) => {
        if (Math.random() < 0.4)
          this.fling(
            x,
            y,
            z,
            cx,
            cy,
            cz,
            Math.hypot(x - cx, y - cy, z - cz),
            R,
            m,
          );
      },
    );
    this.physics.impulse(center, radius * 3, 10);
    this.pending.push({
      removed,
      center: center.clone(),
      radius: radius * 3,
      strength: 9,
    });
    this.debris.blast(cx, cy, cz, R * 2.5, 120);
    this.blasted = true;

    const scale = radius / 1.6;
    this.effects.explosion(center, scale);
    this.audio.explosion(center, scale);
    if (removedMat.some((m) => MATERIALS[m].sound === "glass"))
      this.audio.glass(center, 1);
    this.onBlast?.(center, radius);
  }

  /**
   * Removes a small sphere (bullets, hammer). `push` is the velocity (m/s) given to the pieces.
   * Returns how many voxels broke and the main material hit.
   */
  carve(
    center: Vector3,
    radius: number,
    push: Vector3,
    debrisChance = 0.6,
  ): CarveResult {
    const cx = center.x / VOXEL;
    const cy = center.y / VOXEL;
    const cz = center.z / VOXEL;
    const R = radius / VOXEL;
    const reach = Math.ceil(R);
    const removed: number[] = [];
    let material = M.AIR;
    const pv = push.clone().divideScalar(VOXEL);
    const spawn = (x: number, y: number, z: number, m: number) => {
      if (Math.random() > debrisChance) return;
      this.debris.spawn(
        x,
        y,
        z,
        pv.x * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 40,
        pv.y * (0.4 + Math.random() * 0.6) + Math.random() * 40,
        pv.z * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 40,
        m,
      );
    };

    this.world.forEachSolidInSphere(cx, cy, cz, reach, (x, y, z, m, d) => {
      const hardness = MATERIALS[m].hardness;
      if (!Number.isFinite(hardness) || d * hardness > R + Math.random() * 0.8)
        return;
      this.world.set(x, y, z, 0);
      removed.push(pack(x, y, z));
      material = m;
      spawn(x + 0.5, y + 0.5, z + 0.5, m);
    });

    let bodyHits = 0;
    this.physics.damage(
      center,
      radius,
      (d, m) =>
        d * MATERIALS[m].hardness <= radius + Math.random() * VOXEL * 0.8,
      (x, y, z, m) => {
        material = m;
        bodyHits++;
        spawn(x, y, z, m);
      },
    );
    if (bodyHits > 0 || removed.length > 0)
      this.physics.impulse(
        center,
        radius * 4,
        Math.min(6, push.length() * 0.3),
      );
    this.pending.push({
      removed,
      center: center.clone(),
      radius: radius * 4,
      strength: push.length() * 0.2,
    });
    return { removed: removed.length + bodyHits, material };
  }

  /** Nearest solid voxel or body along a ray. `dir` must be normalized. */
  raycast(origin: Vector3, dir: Vector3, maxDist: number): Hit | null {
    const worldHit = this.raycastWorld(origin, dir, maxDist);
    const bodyHit = this.physics.castRay(
      origin,
      dir,
      worldHit ? worldHit.distance : maxDist,
    );
    if (bodyHit) {
      const local = bodyHit.point.clone().addScaledVector(dir, VOXEL * 0.5);
      return {
        point: bodyHit.point,
        normal: bodyHit.normal,
        distance: bodyHit.distance,
        material: this.bodyMaterialNear(bodyHit.body, local),
        body: bodyHit.body,
      };
    }
    return worldHit;
  }

  private raycastWorld(
    origin: Vector3,
    dir: Vector3,
    maxDist: number,
  ): Hit | null {
    const px = origin.x / VOXEL;
    const py = origin.y / VOXEL;
    const pz = origin.z / VOXEL;
    let x = Math.floor(px);
    let y = Math.floor(py);
    let z = Math.floor(pz);
    const sx = Math.sign(dir.x);
    const sy = Math.sign(dir.y);
    const sz = Math.sign(dir.z);
    const tdx = sx !== 0 ? Math.abs(1 / dir.x) : Number.POSITIVE_INFINITY;
    const tdy = sy !== 0 ? Math.abs(1 / dir.y) : Number.POSITIVE_INFINITY;
    const tdz = sz !== 0 ? Math.abs(1 / dir.z) : Number.POSITIVE_INFINITY;
    let tx =
      sx !== 0 ? ((sx > 0 ? x + 1 : x) - px) / dir.x : Number.POSITIVE_INFINITY;
    let ty =
      sy !== 0 ? ((sy > 0 ? y + 1 : y) - py) / dir.y : Number.POSITIVE_INFINITY;
    let tz =
      sz !== 0 ? ((sz > 0 ? z + 1 : z) - pz) / dir.z : Number.POSITIVE_INFINITY;
    const max = maxDist / VOXEL;
    const normal = new Vector3(-dir.x, -dir.y, -dir.z);
    let t = 0;
    while (t <= max) {
      const m = this.world.get(x, y, z);
      if (m !== 0)
        return {
          point: origin.clone().addScaledVector(dir, t * VOXEL),
          normal,
          distance: t * VOXEL,
          material: m,
          body: null,
        };
      if (tx < ty && tx < tz) {
        x += sx;
        t = tx;
        tx += tdx;
        normal.set(-sx, 0, 0);
      } else if (ty < tz) {
        y += sy;
        t = ty;
        ty += tdy;
        normal.set(0, -sy, 0);
      } else {
        z += sz;
        t = tz;
        tz += tdz;
        normal.set(0, 0, -sz);
      }
    }
    return null;
  }

  private bodyMaterialNear(body: VoxelBody, point: Vector3): number {
    const inv = body.matrix(new Matrix4()).invert();
    const p = point.clone().applyMatrix4(inv).divideScalar(VOXEL);
    let best = body.mats[0];
    let bestD = Number.POSITIVE_INFINITY;
    for (let k = 0; k < body.count; k++) {
      const d =
        (body.coords[k * 3] + 0.5 - p.x) ** 2 +
        (body.coords[k * 3 + 1] + 0.5 - p.y) ** 2 +
        (body.coords[k * 3 + 2] + 0.5 - p.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = body.mats[k];
      }
    }
    return best;
  }

  private fling(
    x: number,
    y: number,
    z: number,
    cx: number,
    cy: number,
    cz: number,
    d: number,
    R: number,
    m: number,
  ): void {
    const inv = 1 / Math.max(d, 0.5);
    const speed =
      (60 + Math.random() * 110) * Math.max(0.1, 1 - d / (R * 1.3)) + 15;
    this.debris.spawn(
      x,
      y,
      z,
      (x - cx) * inv * speed,
      (y - cy) * inv * speed + 40 + Math.random() * 60,
      (z - cz) * inv * speed,
      m,
    );
  }

  /** Turns whatever lost its support around `removed` into rigid bodies thrown away from `center`. */
  private detach(
    removed: number[],
    center: Vector3,
    radius: number,
    strength: number,
  ): void {
    if (removed.length === 0) return;
    const seeds: number[] = [];
    const world = this.world;
    const seed = (x: number, y: number, z: number) => {
      if (y >= SUPPORT_Y && world.get(x, y, z) !== 0) seeds.push(pack(x, y, z));
    };
    for (const i of removed) {
      const x = unpackX(i);
      const y = unpackY(i);
      const z = unpackZ(i);
      if (x > 0) seed(x - 1, y, z);
      if (x < SIZE_X - 1) seed(x + 1, y, z);
      if (y > 0) seed(x, y - 1, z);
      if (y < SIZE_Y - 1) seed(x, y + 1, z);
      if (z > 0) seed(x, y, z - 1);
      if (z < SIZE_Z - 1) seed(x, y, z + 1);
    }
    for (const cluster of findFloatingClusters(this.world, seeds)) {
      const c = new Vector3();
      const step = Math.max(1, Math.floor(cluster.length / 200));
      let n = 0;
      for (let k = 0; k < cluster.length; k += step) {
        c.x += unpackX(cluster[k]);
        c.y += unpackY(cluster[k]);
        c.z += unpackZ(cluster[k]);
        n++;
      }
      c.multiplyScalar(VOXEL / n);
      const dir = c.clone().sub(center);
      const d = dir.length();
      const falloff = Math.max(0, 1 - d / radius);
      const mass = Math.max(1, cluster.length / 2000);
      const velocity = dir
        .normalize()
        .multiplyScalar((strength * falloff) / Math.sqrt(mass));
      velocity.y += (strength * falloff * 0.3) / Math.sqrt(mass);
      const spin = new Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).multiplyScalar((6 * falloff) / mass);
      this.physics.detach(cluster, velocity, spin);
    }
  }
}
