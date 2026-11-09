import RAPIER from "@dimforge/rapier3d-compat";
import {
  Group,
  type Material,
  Matrix4,
  Mesh,
  type Scene,
  Vector3,
} from "three";
import {
  CHUNK,
  CHUNKS_X,
  CHUNKS_Y,
  CHUNKS_Z,
  pack,
  unpackX,
  unpackY,
  unpackZ,
  VOXEL,
} from "./constants";
import type { Debris } from "./debris";
import { greedyMesh } from "./greedy";
import { MATERIALS } from "./materials";
import { findFloatingClusters } from "./structure";
import { geometryFromMesh } from "./voxel-material";
import { chunkCoords, chunkIndex, type World } from "./world";

const STEP = 1 / 60;
const MIN_BODY = 160;
/** A body still awake after this many seconds turns into debris. */
const MAX_AWAKE = 12;
const MAX_BODIES = 140;
const CRUSH_IMPACT = 4.5;
const SOUND_IMPACT = 1.8;
const VOXEL_SIZE = { x: VOXEL, y: VOXEL, z: VOXEL };

export async function initPhysics(): Promise<void> {
  await RAPIER.init();
}

export interface Impact {
  position: Vector3;
  size: number;
  speed: number;
  material: number;
}

export interface BodyHit {
  body: VoxelBody;
  point: Vector3;
  normal: Vector3;
  distance: number;
}

/** A detached piece of voxels simulated as one rigid body. */
export class VoxelBody {
  readonly object = new Group();
  readonly prevVel = new Vector3();
  mesh: Mesh | null = null;
  collider: RAPIER.Collider | null = null;
  alive = true;
  rest = 0;
  age = 0;
  stampCooldown = 0;
  /** Local bounding box in voxels: min xyz, max xyz. */
  readonly bounds = new Int32Array(6);

  constructor(
    readonly rb: RAPIER.RigidBody,
    public coords: Int16Array,
    public mats: Uint8Array,
  ) {}

  get count(): number {
    return this.mats.length;
  }

  /** World transform applied to local points (meters). */
  matrix(out: Matrix4): Matrix4 {
    const t = this.rb.translation();
    const r = this.rb.rotation();
    return out.compose(
      new Vector3(t.x, t.y, t.z),
      this.object.quaternion.set(r.x, r.y, r.z, r.w),
      new Vector3(1, 1, 1),
    );
  }
}

/** Rapier world: static voxel colliders built lazily around moving bodies, plus the bodies themselves. */
export class Physics {
  readonly rapier = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly bodies: VoxelBody[] = [];
  onImpact: ((impact: Impact) => void) | null = null;
  private readonly fixed: RAPIER.RigidBody;
  private readonly player: RAPIER.RigidBody;
  private readonly chunkColliders = new Map<number, RAPIER.Collider>();
  private readonly byCollider = new Map<number, VoxelBody>();
  private accumulator = 0;
  private readonly tmpMatrix = new Matrix4();
  private readonly tmpVec = new Vector3();

  constructor(
    private readonly scene: Scene,
    private readonly world: World,
    private readonly debris: Debris,
    private readonly material: Material,
  ) {
    this.fixed = this.rapier.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.player = this.rapier.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased(),
    );
    this.rapier.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, 0.28),
      this.player,
    );
    world.listener = (x, y, z, filled) => this.onVoxel(x, y, z, filled);
  }

  clear(): void {
    for (const body of [...this.bodies]) this.removeBody(body);
    for (const collider of this.chunkColliders.values())
      this.rapier.removeCollider(collider, false);
    this.chunkColliders.clear();
    this.accumulator = 0;
  }

  /** Drops the static colliders of chunks edited in bulk; they are rebuilt on demand. */
  forgetChunks(chunks: Iterable<number>): void {
    for (const ci of chunks) {
      const collider = this.chunkColliders.get(ci);
      if (!collider) continue;
      this.rapier.removeCollider(collider, false);
      this.chunkColliders.delete(ci);
    }
  }

  setPlayer(feet: Vector3): void {
    this.player.setNextKinematicTranslation({
      x: feet.x,
      y: feet.y + 0.83,
      z: feet.z,
    });
  }

  /** Removes the voxels of `cluster` (packed indices) from the world and turns them into a rigid body. */
  detach(cluster: Int32Array, velocity?: Vector3, spin?: Vector3): void {
    const n = cluster.length;
    const mats = new Uint8Array(n);
    let minX = 1 << 30;
    let minY = 1 << 30;
    let minZ = 1 << 30;
    for (let k = 0; k < n; k++) {
      const i = cluster[k];
      const x = unpackX(i);
      const y = unpackY(i);
      const z = unpackZ(i);
      mats[k] = this.world.get(x, y, z);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
    }
    for (let k = 0; k < n; k++) {
      const i = cluster[k];
      this.world.set(unpackX(i), unpackY(i), unpackZ(i), 0);
    }

    if (n < MIN_BODY) {
      for (let k = 0; k < n; k++) {
        const i = cluster[k];
        this.debris.spawn(
          unpackX(i) + 0.5,
          unpackY(i) + 0.5,
          unpackZ(i) + 0.5,
          (velocity?.x ?? 0) / VOXEL + (Math.random() - 0.5) * 10,
          (velocity?.y ?? 0) / VOXEL,
          (velocity?.z ?? 0) / VOXEL + (Math.random() - 0.5) * 10,
          mats[k],
        );
      }
      return;
    }

    const coords = new Int16Array(n * 3);
    for (let k = 0; k < n; k++) {
      const i = cluster[k];
      coords[k * 3] = unpackX(i) - minX;
      coords[k * 3 + 1] = unpackY(i) - minY;
      coords[k * 3 + 2] = unpackZ(i) - minZ;
    }
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(minX * VOXEL, minY * VOXEL, minZ * VOXEL)
      .setCcdEnabled(n < 400);
    if (velocity) desc.setLinvel(velocity.x, velocity.y, velocity.z);
    if (spin) desc.setAngvel({ x: spin.x, y: spin.y, z: spin.z });
    this.createBody(this.rapier.createRigidBody(desc), coords, mats);
    while (this.bodies.length > MAX_BODIES) this.removeBody(this.bodies[0]);
  }

  step(dt: number): void {
    this.accumulator += dt;
    let n = 0;
    while (this.accumulator >= STEP && n < 3) {
      this.rapier.step();
      this.afterStep();
      this.accumulator -= STEP;
      n++;
    }
    if (n === 3) this.accumulator = 0;
    for (const body of this.bodies) {
      const t = body.rb.translation();
      const r = body.rb.rotation();
      body.object.position.set(t.x, t.y, t.z);
      body.object.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  /** Nearest body hit along a ray (meters). */
  castRay(origin: Vector3, dir: Vector3, maxDist: number): BodyHit | null {
    const ray = new RAPIER.Ray(origin, dir);
    const hit = this.rapier.castRayAndGetNormal(
      ray,
      maxDist,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      (c) => this.byCollider.has(c.handle),
    );
    if (!hit) return null;
    const body = this.byCollider.get(hit.collider.handle);
    if (!body) return null;
    return {
      body,
      point: origin.clone().addScaledVector(dir, hit.timeOfImpact),
      normal: new Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      distance: hit.timeOfImpact,
    };
  }

  /**
   * Removes body voxels for which `remove(distance from center in meters, material)` is true.
   * Each removed voxel is reported through `removed(world position in voxel units, material)`.
   */
  damage(
    center: Vector3,
    radius: number,
    remove: (distance: number, material: number) => boolean,
    removed: (x: number, y: number, z: number, material: number) => void,
  ): void {
    for (const body of [...this.bodies]) {
      if (this.distanceToBody(body, center) > radius) continue;
      const m = body.matrix(this.tmpMatrix);
      const keep = new Uint8Array(body.count).fill(1);
      let any = false;
      const p = this.tmpVec;
      for (let k = 0; k < body.count; k++) {
        p.set(
          body.coords[k * 3] + 0.5,
          body.coords[k * 3 + 1] + 0.5,
          body.coords[k * 3 + 2] + 0.5,
        )
          .multiplyScalar(VOXEL)
          .applyMatrix4(m);
        const d = p.distanceTo(center);
        if (d > radius || !remove(d, body.mats[k])) continue;
        keep[k] = 0;
        any = true;
        removed(p.x / VOXEL, p.y / VOXEL, p.z / VOXEL, body.mats[k]);
      }
      if (any) this.rebuild(body, keep);
    }
  }

  /** Pushes bodies away from `center`: velocity change `strength` (m/s) fading to 0 at `radius`. */
  impulse(center: Vector3, radius: number, strength: number): void {
    for (const body of this.bodies) {
      const com = body.rb.worldCom();
      const dir = new Vector3(
        com.x - center.x,
        com.y - center.y,
        com.z - center.z,
      );
      const d = dir.length();
      if (d > radius) continue;
      dir.normalize();
      dir.y += 0.35;
      const dv = strength * (1 - d / radius);
      const mass = body.rb.mass();
      const offset = new Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).multiplyScalar(0.3);
      body.rb.applyImpulseAtPoint(
        { x: dir.x * dv * mass, y: dir.y * dv * mass, z: dir.z * dv * mass },
        { x: com.x + offset.x, y: com.y + offset.y, z: com.z + offset.z },
        true,
      );
      const v = body.rb.linvel();
      body.prevVel.set(v.x, v.y, v.z);
    }
  }

  private onVoxel(x: number, y: number, z: number, filled: boolean): void {
    const ci = chunkIndex(x >> 5, y >> 5, z >> 5);
    const collider = this.chunkColliders.get(ci);
    if (!collider) return;
    const lx = x & 31;
    const ly = y & 31;
    const lz = z & 31;
    collider.setVoxel(lx, ly, lz, filled);
    if (
      lx === 0 ||
      lx === 31 ||
      ly === 0 ||
      ly === 31 ||
      lz === 0 ||
      lz === 31
    ) {
      const [cx, cy, cz] = chunkCoords(ci);
      for (const [dx, dy, dz] of NEIGHBOURS) {
        const other = this.colliderAt(cx + dx, cy + dy, cz + dz);
        if (other)
          collider.propagateVoxelChange(
            other,
            lx,
            ly,
            lz,
            dx * CHUNK,
            dy * CHUNK,
            dz * CHUNK,
          );
      }
    }
  }

  private colliderAt(
    cx: number,
    cy: number,
    cz: number,
  ): RAPIER.Collider | undefined {
    if (
      cx < 0 ||
      cy < 0 ||
      cz < 0 ||
      cx >= CHUNKS_X ||
      cy >= CHUNKS_Y ||
      cz >= CHUNKS_Z
    )
      return undefined;
    return this.chunkColliders.get(chunkIndex(cx, cy, cz));
  }

  private ensureRegion(center: Vector3, radius: number): void {
    const r = radius + 0.6;
    const size = CHUNK * VOXEL;
    const x0 = Math.max(0, Math.floor((center.x - r) / size));
    const x1 = Math.min(CHUNKS_X - 1, Math.floor((center.x + r) / size));
    const y0 = Math.max(0, Math.floor((center.y - r) / size));
    const y1 = Math.min(CHUNKS_Y - 1, Math.floor((center.y + r) / size));
    const z0 = Math.max(0, Math.floor((center.z - r) / size));
    const z1 = Math.min(CHUNKS_Z - 1, Math.floor((center.z + r) / size));
    for (let cy = y0; cy <= y1; cy++)
      for (let cz = z0; cz <= z1; cz++)
        for (let cx = x0; cx <= x1; cx++) {
          const ci = chunkIndex(cx, cy, cz);
          if (this.world.counts[ci] > 0 && !this.chunkColliders.has(ci))
            this.buildChunkCollider(ci, cx, cy, cz);
        }
  }

  private buildChunkCollider(
    ci: number,
    cx: number,
    cy: number,
    cz: number,
  ): void {
    const data = this.world.chunks[ci];
    if (!data) return;
    const coords = new Int32Array(this.world.counts[ci] * 3);
    let n = 0;
    for (let li = 0; li < 32768; li++) {
      if (data[li] === 0) continue;
      coords[n++] = li & 31;
      coords[n++] = li >> 10;
      coords[n++] = (li >> 5) & 31;
    }
    const size = CHUNK * VOXEL;
    const collider = this.rapier.createCollider(
      RAPIER.ColliderDesc.voxels(coords.subarray(0, n), VOXEL_SIZE)
        .setTranslation(cx * size, cy * size, cz * size)
        .setFriction(0.8),
      this.fixed,
    );
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const other = this.colliderAt(cx + dx, cy + dy, cz + dz);
      if (other)
        collider.combineVoxelStates(other, dx * CHUNK, dy * CHUNK, dz * CHUNK);
    }
    this.chunkColliders.set(ci, collider);
  }

  private createBody(
    rb: RAPIER.RigidBody,
    coords: Int16Array,
    mats: Uint8Array,
  ): VoxelBody {
    rb.setLinearDamping(0.05);
    rb.setAngularDamping(0.5);
    const body = new VoxelBody(rb, coords, mats);
    this.setShape(body);
    const t = rb.translation();
    body.object.position.set(t.x, t.y, t.z);
    const v = rb.linvel();
    body.prevVel.set(v.x, v.y, v.z);
    this.scene.add(body.object);
    this.bodies.push(body);
    return body;
  }

  /** (Re)creates the collider and mesh from the body's voxels. */
  private setShape(body: VoxelBody): void {
    if (body.collider) {
      this.byCollider.delete(body.collider.handle);
      this.rapier.removeCollider(body.collider, true);
    }
    if (body.mesh) {
      body.mesh.geometry.dispose();
      body.object.remove(body.mesh);
      body.mesh = null;
    }
    const { coords, mats } = body;
    const n = mats.length;
    const b = body.bounds;
    b[0] = b[1] = b[2] = 1 << 30;
    b[3] = b[4] = b[5] = -(1 << 30);
    let density = 0;
    for (let k = 0; k < n; k++) {
      for (let a = 0; a < 3; a++) {
        const c = coords[k * 3 + a];
        if (c < b[a]) b[a] = c;
        if (c > b[a + 3]) b[a + 3] = c;
      }
      density += MATERIALS[mats[k]].density;
    }
    const collider = this.rapier.createCollider(
      RAPIER.ColliderDesc.voxels(Int32Array.from(coords), VOXEL_SIZE)
        .setDensity((density / n) * 1000)
        .setFriction(0.7)
        .setRestitution(0.05),
      body.rb,
    );
    body.collider = collider;
    this.byCollider.set(collider.handle, body);

    const nx = b[3] - b[0] + 1;
    const ny = b[4] - b[1] + 1;
    const nz = b[5] - b[2] + 1;
    const px = nx + 2;
    const pz = nz + 2;
    const vol = new Uint8Array(px * (ny + 2) * pz);
    for (let k = 0; k < n; k++) {
      const x = coords[k * 3] - b[0];
      const y = coords[k * 3 + 1] - b[1];
      const z = coords[k * 3 + 2] - b[2];
      vol[((y + 1) * pz + (z + 1)) * px + (x + 1)] = mats[k];
    }
    const data = greedyMesh(vol, nx, ny, nz);
    if (!data) return;
    const mesh = new Mesh(geometryFromMesh(data), this.material);
    mesh.position.set(b[0] * VOXEL, b[1] * VOXEL, b[2] * VOXEL);
    mesh.scale.setScalar(VOXEL);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    body.object.add(mesh);
    body.mesh = mesh;
  }

  private removeBody(body: VoxelBody): void {
    if (!body.alive) return;
    body.alive = false;
    if (body.collider) this.byCollider.delete(body.collider.handle);
    this.rapier.removeRigidBody(body.rb);
    if (body.mesh) body.mesh.geometry.dispose();
    this.scene.remove(body.object);
    const i = this.bodies.indexOf(body);
    if (i >= 0) this.bodies.splice(i, 1);
  }

  private boundingSphere(body: VoxelBody, center: Vector3): number {
    const b = body.bounds;
    center
      .set((b[0] + b[3] + 1) / 2, (b[1] + b[4] + 1) / 2, (b[2] + b[5] + 1) / 2)
      .multiplyScalar(VOXEL)
      .applyMatrix4(body.matrix(this.tmpMatrix));
    return (
      (Math.hypot(b[3] - b[0] + 1, b[4] - b[1] + 1, b[5] - b[2] + 1) / 2) *
      VOXEL
    );
  }

  private distanceToBody(body: VoxelBody, point: Vector3): number {
    const c = new Vector3();
    const r = this.boundingSphere(body, c);
    return Math.max(0, c.distanceTo(point) - r);
  }

  private afterStep(): void {
    const center = new Vector3();
    for (const body of [...this.bodies]) {
      if (!body.alive) continue;
      body.age += STEP;
      body.stampCooldown -= STEP;
      const radius = this.boundingSphere(body, center);
      this.ensureRegion(center, radius);
      if (center.y < -5) {
        this.removeBody(body);
        continue;
      }

      const lv = body.rb.linvel();
      const v = new Vector3(lv.x, lv.y, lv.z);
      const dv = v.distanceTo(body.prevVel);
      if (dv > SOUND_IMPACT && body.age > 0.05)
        this.hit(body, body.prevVel.clone(), dv);
      if (!body.alive) continue;
      body.prevVel.copy(v);

      const av = body.rb.angvel();
      const calm = v.length() < 0.25 && Math.hypot(av.x, av.y, av.z) < 0.6;
      body.rest = body.rb.isSleeping() || calm ? body.rest + STEP : 0;
      if ((body.rest > 0.3 || body.age > 8) && body.stampCooldown <= 0)
        this.tryStamp(body);
    }
  }

  /** Crushes the leading side of a body after a violent velocity change. */
  private hit(body: VoxelBody, before: Vector3, dv: number): void {
    const m = body.matrix(this.tmpMatrix);
    const p = this.tmpVec;
    const dir =
      before.lengthSq() > 0.04
        ? before.clone().normalize()
        : new Vector3(0, -1, 0);
    const n = body.count;
    const proj = new Float32Array(n);
    let maxProj = Number.NEGATIVE_INFINITY;
    for (let k = 0; k < n; k++) {
      p.set(
        body.coords[k * 3] + 0.5,
        body.coords[k * 3 + 1] + 0.5,
        body.coords[k * 3 + 2] + 0.5,
      )
        .multiplyScalar(VOXEL)
        .applyMatrix4(m);
      proj[k] = p.dot(dir) / VOXEL;
      if (proj[k] > maxProj) maxProj = proj[k];
    }

    const crush = dv > CRUSH_IMPACT;
    const depth = crush ? Math.min(10, (dv - CRUSH_IMPACT) * 2 + 1.5) : 1;
    const keep = new Uint8Array(n).fill(1);
    const contact = new Vector3();
    let contacts = 0;
    let removed = 0;
    let mainMaterial = body.mats[0];
    const budget = Math.min(4000, this.debris.free);
    for (let k = 0; k < n; k++) {
      if (proj[k] < maxProj - depth) continue;
      p.set(
        body.coords[k * 3] + 0.5,
        body.coords[k * 3 + 1] + 0.5,
        body.coords[k * 3 + 2] + 0.5,
      )
        .multiplyScalar(VOXEL)
        .applyMatrix4(m);
      contact.add(p);
      contacts++;
      mainMaterial = body.mats[k];
      if (!crush || removed >= budget || Math.random() > 0.7) continue;
      keep[k] = 0;
      removed++;
      const spread = dv / VOXEL;
      this.debris.spawn(
        p.x / VOXEL,
        p.y / VOXEL,
        p.z / VOXEL,
        (before.x * 0.25) / VOXEL + (Math.random() - 0.5) * spread * 0.5,
        Math.random() * spread * 0.3,
        (before.z * 0.25) / VOXEL + (Math.random() - 0.5) * spread * 0.5,
        body.mats[k],
      );
    }
    if (contacts > 0)
      this.onImpact?.({
        position: contact.divideScalar(contacts),
        size: n,
        speed: dv,
        material: mainMaterial,
      });
    if (removed > 0) this.rebuild(body, keep);
  }

  /** Keeps the flagged voxels, splitting the body into connected pieces. */
  private rebuild(body: VoxelBody, keep: Uint8Array): void {
    const src = body.coords;
    const srcMats = body.mats;
    const pieces = connectedPieces(src, keep);
    const m = body.matrix(new Matrix4());
    const p = this.tmpVec;
    const lv = body.rb.linvel();
    const av = body.rb.angvel();
    const t = body.rb.translation();
    const r = body.rb.rotation();
    let reused = false;
    for (const piece of pieces) {
      if (piece.length < MIN_BODY) {
        for (const k of piece) {
          p.set(src[k * 3] + 0.5, src[k * 3 + 1] + 0.5, src[k * 3 + 2] + 0.5)
            .multiplyScalar(VOXEL)
            .applyMatrix4(m);
          this.debris.spawn(
            p.x / VOXEL,
            p.y / VOXEL,
            p.z / VOXEL,
            lv.x / VOXEL,
            lv.y / VOXEL,
            lv.z / VOXEL,
            srcMats[k],
          );
        }
        continue;
      }
      const coords = new Int16Array(piece.length * 3);
      const mats = new Uint8Array(piece.length);
      piece.forEach((k, j) => {
        coords[j * 3] = src[k * 3];
        coords[j * 3 + 1] = src[k * 3 + 1];
        coords[j * 3 + 2] = src[k * 3 + 2];
        mats[j] = srcMats[k];
      });
      if (!reused) {
        reused = true;
        body.coords = coords;
        body.mats = mats;
        this.setShape(body);
        continue;
      }
      const rb = this.rapier.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(t.x, t.y, t.z)
          .setRotation(r)
          .setLinvel(lv.x, lv.y, lv.z)
          .setAngvel(av),
      );
      this.createBody(rb, coords, mats);
    }
    if (!reused) this.removeBody(body);
  }

  /** Writes a resting body back into the world, unless it would float (resting on another body). */
  private tryStamp(body: VoxelBody): void {
    const m = body.matrix(this.tmpMatrix);
    const p = this.tmpVec;
    const placed: number[] = [];
    for (let k = 0; k < body.count; k++) {
      p.set(
        body.coords[k * 3] + 0.5,
        body.coords[k * 3 + 1] + 0.5,
        body.coords[k * 3 + 2] + 0.5,
      )
        .multiplyScalar(VOXEL)
        .applyMatrix4(m)
        .divideScalar(VOXEL);
      const x = Math.floor(p.x);
      const z = Math.floor(p.z);
      let y = Math.floor(p.y);
      if (this.world.get(x, y, z) !== 0) y++;
      if (this.world.get(x, y, z) !== 0 || y < 0) continue;
      this.world.set(x, y, z, body.mats[k]);
      placed.push(pack(x, y, z));
    }
    if (findFloatingClusters(this.world, placed).length > 0) {
      for (const i of placed)
        this.world.set(unpackX(i), unpackY(i), unpackZ(i), 0);
      body.stampCooldown = 1;
      body.rest = 0;
      if (body.age > MAX_AWAKE) this.dissolve(body);
      return;
    }
    this.removeBody(body);
  }

  /** Replaces a body that cannot settle by debris particles, which always do. */
  private dissolve(body: VoxelBody): void {
    const m = body.matrix(this.tmpMatrix);
    const p = this.tmpVec;
    const lv = body.rb.linvel();
    for (let k = 0; k < body.count && this.debris.free > 0; k++) {
      p.set(
        body.coords[k * 3] + 0.5,
        body.coords[k * 3 + 1] + 0.5,
        body.coords[k * 3 + 2] + 0.5,
      )
        .multiplyScalar(VOXEL)
        .applyMatrix4(m);
      this.debris.spawn(
        p.x / VOXEL,
        p.y / VOXEL,
        p.z / VOXEL,
        lv.x / VOXEL,
        lv.y / VOXEL,
        lv.z / VOXEL,
        body.mats[k],
      );
    }
    this.removeBody(body);
  }
}

const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

/** Splits the kept voxels into 6-connected groups, largest first. */
function connectedPieces(coords: Int16Array, keep: Uint8Array): number[][] {
  const index = new Map<number, number>();
  for (let k = 0; k < keep.length; k++)
    if (keep[k])
      index.set(pack(coords[k * 3], coords[k * 3 + 1], coords[k * 3 + 2]), k);
  const seen = new Uint8Array(keep.length);
  const pieces: number[][] = [];
  const stack: number[] = [];
  for (const [, start] of index) {
    if (seen[start]) continue;
    seen[start] = 1;
    stack.push(start);
    const piece: number[] = [];
    while (stack.length > 0) {
      const k = stack.pop() as number;
      piece.push(k);
      const x = coords[k * 3];
      const y = coords[k * 3 + 1];
      const z = coords[k * 3 + 2];
      for (const [dx, dy, dz] of NEIGHBOURS) {
        if (x + dx < 0 || y + dy < 0 || z + dz < 0) continue;
        const nb = index.get(pack(x + dx, y + dy, z + dz));
        if (nb !== undefined && !seen[nb]) {
          seen[nb] = 1;
          stack.push(nb);
        }
      }
    }
    pieces.push(piece);
  }
  return pieces.sort((a, b) => b.length - a.length);
}
