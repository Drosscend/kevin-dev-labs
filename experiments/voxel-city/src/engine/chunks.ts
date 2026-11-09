import { type Material, Mesh, type Scene } from "three";
import {
  CHUNK,
  CHUNKS_X,
  CHUNKS_Y,
  CHUNKS_Z,
  SIZE_X,
  SIZE_Y,
  SIZE_Z,
  VOXEL,
} from "./constants";
import type { MesherPool } from "./mesher-pool";
import { geometryFromMesh } from "./voxel-material";
import { chunkCoords, chunkIndex, type World } from "./world";

/** One mesh covers 2 x 2 x 2 chunks: far fewer draw calls than one mesh per chunk. */
const REGION = CHUNK * 2;
const RX = Math.ceil(SIZE_X / REGION);
const RY = Math.ceil(SIZE_Y / REGION);
const RZ = Math.ceil(SIZE_Z / REGION);
const REGION_COUNT = RX * RY * RZ;
/** A region edited again soon after a remesh waits this long (ms), so settling rubble does not remesh it every frame. */
const REMESH_INTERVAL = 150;
/** Region copies per frame (empty regions are free): each costs about 0.4 ms on the main thread. */
const REMESH_PER_FRAME = 4;

function regionOfChunk(cx: number, cy: number, cz: number): number {
  return (cx >> 1) + RX * ((cz >> 1) + RZ * (cy >> 1));
}

function regionCoords(ri: number): [number, number, number] {
  return [ri % RX, Math.floor(ri / RX) % RZ, Math.floor(ri / (RX * RZ))];
}

/** Keeps one mesh per region in sync with the world, meshing in workers. */
export class ChunkRenderer {
  private readonly meshes = new Map<number, Mesh>();
  private readonly versions = new Uint32Array(REGION_COUNT);
  private readonly inFlight = new Set<number>();
  private readonly queued = new Set<number>();
  private readonly lastRemesh = new Float64Array(REGION_COUNT);
  private readonly doneStart = new Float64Array(REGION_COUNT);

  constructor(
    private readonly scene: Scene,
    private readonly world: World,
    private readonly material: Material,
    private readonly pool: MesherPool,
  ) {}

  /** Meshes every non-empty region; resolves when all are on screen. */
  async buildAll(): Promise<void> {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      this.scene.remove(mesh);
    }
    this.meshes.clear();
    this.world.dirty.clear();
    this.queued.clear();
    const jobs: Promise<void>[] = [];
    for (let ri = 0; ri < REGION_COUNT; ri++)
      if (!this.isEmpty(ri)) jobs.push(this.remesh(ri));
    await Promise.all(jobs);
  }

  flush(): void {
    for (const ci of this.world.dirty) {
      const [cx, cy, cz] = chunkCoords(ci);
      this.queued.add(regionOfChunk(cx, cy, cz));
    }
    this.world.dirty.clear();
    const now = performance.now();
    let budget = REMESH_PER_FRAME;
    for (const ri of this.queued) {
      if (budget === 0) break;
      if (this.inFlight.has(ri) || now - this.lastRemesh[ri] < REMESH_INTERVAL)
        continue;
      this.queued.delete(ri);
      if (!this.isEmpty(ri)) budget--;
      void this.remesh(ri);
    }
  }

  /** True once every region holding one of `chunks` shows a remesh started after `since` (ms). */
  updatedSince(chunks: Iterable<number>, since: number): boolean {
    for (const ci of chunks) {
      const [cx, cy, cz] = chunkCoords(ci);
      if (this.doneStart[regionOfChunk(cx, cy, cz)] < since) return false;
    }
    return true;
  }

  private isEmpty(ri: number): boolean {
    const [rx, rz, ry] = regionCoords(ri);
    for (let cy = ry * 2; cy < Math.min(CHUNKS_Y, ry * 2 + 2); cy++)
      for (let cz = rz * 2; cz < Math.min(CHUNKS_Z, rz * 2 + 2); cz++)
        for (let cx = rx * 2; cx < Math.min(CHUNKS_X, rx * 2 + 2); cx++)
          if (this.world.counts[chunkIndex(cx, cy, cz)] > 0) return false;
    return true;
  }

  private async remesh(ri: number): Promise<void> {
    const version = ++this.versions[ri];
    const start = performance.now();
    this.lastRemesh[ri] = start;
    this.inFlight.add(ri);
    const [rx, rz, ry] = regionCoords(ri);
    const sx = Math.min(REGION, SIZE_X - rx * REGION);
    const sy = Math.min(REGION, SIZE_Y - ry * REGION);
    const sz = Math.min(REGION, SIZE_Z - rz * REGION);
    const data = this.isEmpty(ri)
      ? null
      : await this.pool.mesh(this.extract(rx, ry, rz, sx, sy, sz), sx, sy, sz);
    this.inFlight.delete(ri);
    if (version !== this.versions[ri]) return;
    this.swap(ri, rx, ry, rz, data ? geometryFromMesh(data) : null);
    this.doneStart[ri] = start;
  }

  private swap(
    ri: number,
    rx: number,
    ry: number,
    rz: number,
    geometry: ReturnType<typeof geometryFromMesh> | null,
  ): void {
    const old = this.meshes.get(ri);
    if (old) {
      old.geometry.dispose();
      this.scene.remove(old);
      this.meshes.delete(ri);
    }
    if (!geometry) return;
    const mesh = new Mesh(geometry, this.material);
    const size = REGION * VOXEL;
    mesh.position.set(rx * size, ry * size, rz * size);
    mesh.scale.setScalar(VOXEL);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene.add(mesh);
    this.meshes.set(ri, mesh);
  }

  /** Region voxels plus a one-voxel border, x fastest, then z, then y. */
  private extract(
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
  ): Uint8Array {
    const px = sx + 2;
    const pz = sz + 2;
    const vol = new Uint8Array(px * pz * (sy + 2));
    const world = this.world;
    const x0 = rx * REGION;
    const y0 = ry * REGION - 1;
    const z0 = rz * REGION - 1;
    for (let y = 0; y < sy + 2; y++) {
      const wy = y0 + y;
      for (let z = 0; z < pz; z++) {
        const wz = z0 + z;
        const row = (y * pz + z) * px;
        if (wy < 0 || wy >= SIZE_Y || wz < 0 || wz >= SIZE_Z) {
          for (let x = 0; x < px; x++)
            vol[row + x] = world.get(x0 - 1 + x, wy, wz);
          continue;
        }
        const src = ((wz & 31) << 5) | ((wy & 31) << 10);
        for (let k = 0; k < sx; k += CHUNK) {
          const chunk =
            world.chunks[chunkIndex((x0 + k) >> 5, wy >> 5, wz >> 5)];
          if (chunk) vol.set(chunk.subarray(src, src + CHUNK), row + 1 + k);
        }
        vol[row] = world.get(x0 - 1, wy, wz);
        vol[row + px - 1] = world.get(x0 + sx, wy, wz);
      }
    }
    return vol;
  }
}
