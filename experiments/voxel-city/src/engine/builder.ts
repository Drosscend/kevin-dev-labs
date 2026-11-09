import { SIZE_X, SIZE_Y, SIZE_Z } from "./constants";
import { M } from "./materials";
import type { World } from "./world";

export type MatFn = (x: number, y: number, z: number) => number;
export type Mat = number | MatFn;

/** Deterministic hash of integer coordinates, in [0, 1). */
export function hash3(x: number, y: number, z: number): number {
  let h =
    (Math.imul(x, 374761393) +
      Math.imul(y, 668265263) +
      Math.imul(z, 1274126177)) |
    0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Brick bond pattern for a wall. `u` runs along the wall, `y` is the height (voxels).
 * Bricks are 8 x 4 voxels (40 x 20 cm) with 1-voxel mortar joints.
 */
export function brick(
  u: number,
  y: number,
  palette: readonly number[] = [M.BRICK_A, M.BRICK_B, M.BRICK_C],
): number {
  const row = Math.floor(y / 4);
  if (y % 4 === 3) return M.MORTAR;
  const off = (row & 1) * 4;
  if ((u + off) % 8 === 7) return M.MORTAR;
  const h = hash3(Math.floor((u + off) / 8), row, 7);
  return palette[Math.floor(h * palette.length)];
}

/** Map generation helpers. All coordinates are voxels; ranges are half-open [a, b). */
export class Builder {
  constructor(readonly world: World) {}

  get(x: number, y: number, z: number): number {
    return this.world.get(x, y, z);
  }

  put(x: number, y: number, z: number, m: number): void {
    this.world.setRaw(x, y, z, m);
  }

  fill(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    m: Mat,
  ): void {
    const lx = Math.max(0, x0);
    const hx = Math.min(SIZE_X, x1);
    const ly = Math.max(0, y0);
    const hy = Math.min(SIZE_Y, y1);
    const lz = Math.max(0, z0);
    const hz = Math.min(SIZE_Z, z1);
    if (typeof m === "number") {
      for (let y = ly; y < hy; y++)
        for (let z = lz; z < hz; z++)
          for (let x = lx; x < hx; x++) this.world.setRaw(x, y, z, m);
      return;
    }
    for (let y = ly; y < hy; y++)
      for (let z = lz; z < hz; z++)
        for (let x = lx; x < hx; x++) this.world.setRaw(x, y, z, m(x, y, z));
  }

  /** Only the shell of the box, `t` voxels thick; `m` may also receive the depth from the outside. */
  shell(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    t: number,
    m: number | ((x: number, y: number, z: number, depth: number) => number),
  ): void {
    for (let y = y0; y < y1; y++)
      for (let z = z0; z < z1; z++)
        for (let x = x0; x < x1; x++) {
          const depth = Math.min(x - x0, x1 - 1 - x, z - z0, z1 - 1 - z);
          if (depth >= t) continue;
          this.put(x, y, z, typeof m === "number" ? m : m(x, y, z, depth));
        }
  }

  /** Vertical cylinder centered on (cx, cz). */
  cylinder(
    cx: number,
    cz: number,
    r: number,
    y0: number,
    y1: number,
    m: Mat,
  ): void {
    const ri = Math.ceil(r);
    for (let y = y0; y < y1; y++)
      for (let z = -ri; z <= ri; z++)
        for (let x = -ri; x <= ri; x++)
          if (x * x + z * z <= r * r)
            this.put(
              cx + x,
              y,
              cz + z,
              typeof m === "number" ? m : m(cx + x, y, cz + z),
            );
  }

  sphere(cx: number, cy: number, cz: number, r: number, m: Mat): void {
    const ri = Math.ceil(r);
    for (let y = -ri; y <= ri; y++)
      for (let z = -ri; z <= ri; z++)
        for (let x = -ri; x <= ri; x++)
          if (x * x + y * y + z * z <= r * r)
            this.put(
              cx + x,
              cy + y,
              cz + z,
              typeof m === "number" ? m : m(cx + x, cy + y, cz + z),
            );
  }

  /** A thick line of voxels between two points. */
  line(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    r: number,
    m: number,
  ): void {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay, bz - az));
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n;
      this.sphere(
        Math.round(ax + (bx - ax) * t),
        Math.round(ay + (by - ay) * t),
        Math.round(az + (bz - az) * t),
        r,
        m,
      );
    }
  }

  /**
   * Tree with a trunk, a few branches and a noisy canopy.
   * Canopy voxels not connected to the trunk are dropped so nothing floats.
   */
  tree(
    cx: number,
    groundY: number,
    cz: number,
    height: number,
    radius: number,
    leaves: readonly number[] = [M.LEAVES_A, M.LEAVES_B],
  ): void {
    const trunkR = Math.max(2, radius * 0.14);
    this.cylinder(cx, cz, trunkR, groundY, groundY + height, M.TRUNK);
    const cy = groundY + height + Math.floor(radius * 0.4);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + hash3(cx, i, cz) * 1.5;
      this.line(
        cx,
        groundY + height - 4,
        cz,
        cx + Math.cos(a) * radius * 0.6,
        cy,
        cz + Math.sin(a) * radius * 0.6,
        1.2,
        M.TRUNK,
      );
    }

    const r = radius + 2;
    const size = r * 2 + 1;
    const local = new Uint8Array(size * size * size);
    const at = (x: number, y: number, z: number) => (y * size + z) * size + x;
    for (let y = 0; y < size; y++)
      for (let z = 0; z < size; z++)
        for (let x = 0; x < size; x++) {
          const wx = cx - r + x;
          const wy = cy - r + y;
          const wz = cz - r + z;
          const d = Math.hypot(wx - cx, (wy - cy) * 1.2, wz - cz);
          const blob = hash3(wx >> 3, wy >> 3, wz >> 3) * 5;
          if (d < radius - blob - hash3(wx, wy, wz) * 2.5)
            local[at(x, y, z)] =
              leaves[
                Math.floor(hash3(wx >> 2, wy >> 2, wz >> 2) * leaves.length)
              ];
        }
    const keep = new Uint8Array(local.length);
    const stack: number[] = [];
    for (let i = 0; i < local.length; i++) {
      if (local[i] === 0) continue;
      const x = i % size;
      const z = Math.floor(i / size) % size;
      const y = Math.floor(i / (size * size));
      if (this.get(cx - r + x, cy - r + y, cz - r + z) === M.TRUNK) {
        keep[i] = 1;
        stack.push(i);
      }
    }
    if (stack.length === 0) {
      const center = at(r, 0, r);
      for (let y = 0; y < size; y++) {
        const i = center + y * size * size;
        if (local[i]) {
          keep[i] = 1;
          stack.push(i);
          break;
        }
      }
    }
    while (stack.length > 0) {
      const i = stack.pop() as number;
      const x = i % size;
      const z = Math.floor(i / size) % size;
      const y = Math.floor(i / (size * size));
      for (const [dx, dy, dz] of [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (
          nx < 0 ||
          ny < 0 ||
          nz < 0 ||
          nx >= size ||
          ny >= size ||
          nz >= size
        )
          continue;
        const n = at(nx, ny, nz);
        if (local[n] && !keep[n]) {
          keep[n] = 1;
          stack.push(n);
        }
      }
    }
    for (let i = 0; i < local.length; i++) {
      if (!keep[i]) continue;
      const x = i % size;
      const z = Math.floor(i / size) % size;
      const y = Math.floor(i / (size * size));
      const wx = cx - r + x;
      const wy = cy - r + y;
      const wz = cz - r + z;
      if (this.get(wx, wy, wz) === 0) this.put(wx, wy, wz, local[i]);
    }
  }
}
