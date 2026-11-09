import {
  CELL_COUNT,
  CELLS_X,
  CELLS_Z,
  CHUNK_COUNT,
  CHUNKS_X,
  CHUNKS_Y,
  CHUNKS_Z,
  SIZE_X,
  SIZE_Y,
  SIZE_Z,
} from "./constants";
import { M } from "./materials";

export type VoxelListener = (
  x: number,
  y: number,
  z: number,
  filled: boolean,
) => void;

export function chunkIndex(cx: number, cy: number, cz: number): number {
  return cx + CHUNKS_X * (cz + CHUNKS_Z * cy);
}

export function chunkCoords(ci: number): [number, number, number] {
  const cx = ci % CHUNKS_X;
  const cz = Math.floor(ci / CHUNKS_X) % CHUNKS_Z;
  const cy = Math.floor(ci / (CHUNKS_X * CHUNKS_Z));
  return [cx, cy, cz];
}

/** Local index inside a 32^3 chunk: x, then z, then y. */
export function localIndex(x: number, y: number, z: number): number {
  return (x & 31) | ((z & 31) << 5) | ((y & 31) << 10);
}

/** Sparse voxel grid: only chunks that ever held a voxel are allocated. */
export class World {
  readonly chunks: (Uint8Array | null)[] = new Array(CHUNK_COUNT).fill(null);
  readonly counts = new Uint16Array(CHUNK_COUNT);
  /** Solid voxels per 4^3 cell. */
  readonly cells = new Uint8Array(CELL_COUNT);
  readonly dirty = new Set<number>();
  listener: VoxelListener | null = null;

  clear(): void {
    this.chunks.fill(null);
    this.counts.fill(0);
    this.cells.fill(0);
    this.dirty.clear();
  }

  get(x: number, y: number, z: number): number {
    if (y < 0) return M.BEDROCK;
    if (x < 0 || x >= SIZE_X || y >= SIZE_Y || z < 0 || z >= SIZE_Z) return 0;
    const c =
      this.chunks[(x >> 5) + CHUNKS_X * ((z >> 5) + CHUNKS_Z * (y >> 5))];
    return c === null ? 0 : c[(x & 31) | ((z & 31) << 5) | ((y & 31) << 10)];
  }

  /**
   * Calls `visit` for every solid voxel whose center lies within `radius` of (cx, cy, cz), in voxel units.
   * Skips empty chunks. `visit` may clear the voxel it receives.
   */
  forEachSolidInSphere(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    visit: (
      x: number,
      y: number,
      z: number,
      m: number,
      distance: number,
    ) => void,
  ): void {
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const z0 = Math.max(0, Math.floor(cz - radius));
    const x1 = Math.min(SIZE_X - 1, Math.ceil(cx + radius));
    const y1 = Math.min(SIZE_Y - 1, Math.ceil(cy + radius));
    const z1 = Math.min(SIZE_Z - 1, Math.ceil(cz + radius));
    for (let ky = y0 >> 5; ky <= y1 >> 5; ky++)
      for (let kz = z0 >> 5; kz <= z1 >> 5; kz++)
        for (let kx = x0 >> 5; kx <= x1 >> 5; kx++) {
          const c = this.chunks[chunkIndex(kx, ky, kz)];
          if (c === null) continue;
          const ya = Math.max(y0, ky << 5);
          const yb = Math.min(y1, (ky << 5) + 31);
          const za = Math.max(z0, kz << 5);
          const zb = Math.min(z1, (kz << 5) + 31);
          const xa = Math.max(x0, kx << 5);
          const xb = Math.min(x1, (kx << 5) + 31);
          for (let y = ya; y <= yb; y++) {
            const dy = y + 0.5 - cy;
            for (let z = za; z <= zb; z++) {
              const dz = z + 0.5 - cz;
              const rest = r2 - dy * dy - dz * dz;
              if (rest < 0) continue;
              const row = ((z & 31) << 5) | ((y & 31) << 10);
              for (let x = xa; x <= xb; x++) {
                const m = c[row | (x & 31)];
                if (m === 0) continue;
                const dx = x + 0.5 - cx;
                const d2 = rest - dx * dx;
                if (d2 >= 0) visit(x, y, z, m, Math.sqrt(r2 - d2));
              }
            }
          }
        }
  }

  isSolidAt(x: number, y: number, z: number): boolean {
    return this.get(Math.floor(x), Math.floor(y), Math.floor(z)) !== 0;
  }

  /** Writes during generation: no dirty tracking, no listener. */
  setRaw(x: number, y: number, z: number, value: number): void {
    if (x < 0 || x >= SIZE_X || y < 0 || y >= SIZE_Y || z < 0 || z >= SIZE_Z)
      return;
    this.write(x, y, z, value);
  }

  set(x: number, y: number, z: number, value: number): void {
    if (x < 0 || x >= SIZE_X || y < 0 || y >= SIZE_Y || z < 0 || z >= SIZE_Z)
      return;
    const before = this.write(x, y, z, value);
    if (before === value) return;
    this.markDirty(x, y, z);
    if (this.listener && (before === 0) !== (value === 0))
      this.listener(x, y, z, value !== 0);
  }

  /** Copies the 64 voxels of `cell` into `out` from `offset`, x fastest, then z, then y. */
  readCell(cell: number, out: Uint8Array, offset: number): void {
    const x0 = (cell % CELLS_X) << 2;
    const z0 = (Math.floor(cell / CELLS_X) % CELLS_Z) << 2;
    const y0 = Math.floor(cell / (CELLS_X * CELLS_Z)) << 2;
    const c =
      this.chunks[(x0 >> 5) + CHUNKS_X * ((z0 >> 5) + CHUNKS_Z * (y0 >> 5))];
    let k = offset;
    for (let y = y0; y < y0 + 4; y++)
      for (let z = z0; z < z0 + 4; z++)
        for (let x = x0; x < x0 + 4; x++)
          out[k++] =
            c === null ? 0 : c[(x & 31) | ((z & 31) << 5) | ((y & 31) << 10)];
  }

  /**
   * Bulk edit without the voxel listener: clears `cell` when `src` is null, otherwise writes the
   * non-empty voxels of `src` (layout of `readCell`). Adds the edited chunk to `touched`.
   */
  writeCell(
    cell: number,
    src: Uint8Array | null,
    offset: number,
    touched: Set<number>,
  ): void {
    const x0 = (cell % CELLS_X) << 2;
    const z0 = (Math.floor(cell / CELLS_X) % CELLS_Z) << 2;
    const y0 = Math.floor(cell / (CELLS_X * CELLS_Z)) << 2;
    const ci = (x0 >> 5) + CHUNKS_X * ((z0 >> 5) + CHUNKS_Z * (y0 >> 5));
    let c = this.chunks[ci];
    if (src === null) {
      const n = this.cells[cell];
      if (n === 0 || c === null) return;
      for (let y = y0; y < y0 + 4; y++)
        for (let z = z0; z < z0 + 4; z++) {
          const row = (x0 & 31) | ((z & 31) << 5) | ((y & 31) << 10);
          c.fill(0, row, row + 4);
        }
      this.counts[ci] -= n;
      this.cells[cell] = 0;
    } else {
      if (c === null) {
        c = new Uint8Array(32768);
        this.chunks[ci] = c;
      }
      let k = offset;
      let added = 0;
      for (let y = y0; y < y0 + 4; y++)
        for (let z = z0; z < z0 + 4; z++)
          for (let x = x0; x < x0 + 4; x++) {
            const m = src[k++];
            if (m === 0) continue;
            const li = (x & 31) | ((z & 31) << 5) | ((y & 31) << 10);
            if (c[li] === 0) added++;
            c[li] = m;
          }
      this.counts[ci] += added;
      this.cells[cell] += added;
    }
    this.markDirty(x0, y0, z0);
    this.markDirty(x0 + 3, y0 + 3, z0 + 3);
    touched.add(ci);
  }

  private write(x: number, y: number, z: number, value: number): number {
    const ci = (x >> 5) + CHUNKS_X * ((z >> 5) + CHUNKS_Z * (y >> 5));
    let c = this.chunks[ci];
    if (c === null) {
      if (value === 0) return 0;
      c = new Uint8Array(32768);
      this.chunks[ci] = c;
    }
    const li = (x & 31) | ((z & 31) << 5) | ((y & 31) << 10);
    const before = c[li];
    if (before === value) return before;
    c[li] = value;
    if (before !== 0 && value !== 0) return before;
    const cell = (x >> 2) + CELLS_X * ((z >> 2) + CELLS_Z * (y >> 2));
    if (before === 0) {
      this.counts[ci]++;
      this.cells[cell]++;
    } else {
      this.counts[ci]--;
      this.cells[cell]--;
    }
    return before;
  }

  private markDirty(x: number, y: number, z: number): void {
    const cx = x >> 5;
    const cy = y >> 5;
    const cz = z >> 5;
    const lx = x & 31;
    const ly = y & 31;
    const lz = z & 31;
    const x0 = lx === 0 && cx > 0 ? cx - 1 : cx;
    const x1 = lx === 31 && cx < CHUNKS_X - 1 ? cx + 1 : cx;
    const y0 = ly === 0 && cy > 0 ? cy - 1 : cy;
    const y1 = ly === 31 && cy < CHUNKS_Y - 1 ? cy + 1 : cy;
    const z0 = lz === 0 && cz > 0 ? cz - 1 : cz;
    const z1 = lz === 31 && cz < CHUNKS_Z - 1 ? cz + 1 : cz;
    for (let a = x0; a <= x1; a++)
      for (let b = y0; b <= y1; b++)
        for (let c = z0; c <= z1; c++) this.dirty.add(chunkIndex(a, b, c));
  }
}
