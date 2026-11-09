import { type Builder, hash3 } from "../../engine/builder";
import { pack, unpackX, unpackY, unpackZ } from "../../engine/constants";
import { M } from "../../engine/materials";
import { G } from "../layout";

type Inside = (x: number, z: number) => boolean;

const SIDES = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

/** Writes the candidate voxels that connect, face to face, to something already solid. */
function plantConnected(b: Builder, cells: Map<number, number>): void {
  const stack: number[] = [];
  const kept = new Set<number>();
  for (const key of cells.keys()) {
    const x = unpackX(key);
    const y = unpackY(key);
    const z = unpackZ(key);
    if (b.get(x, y, z) !== 0) continue;
    for (const [dx, dy, dz] of SIDES) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (!cells.has(pack(nx, ny, nz)) && b.get(nx, ny, nz) !== 0) {
        kept.add(key);
        stack.push(key);
        break;
      }
    }
  }
  while (stack.length > 0) {
    const key = stack.pop() as number;
    const x = unpackX(key);
    const y = unpackY(key);
    const z = unpackZ(key);
    for (const [dx, dy, dz] of SIDES) {
      const n = pack(x + dx, y + dy, z + dz);
      if (cells.has(n) && !kept.has(n) && b.get(x + dx, y + dy, z + dz) === 0) {
        kept.add(n);
        stack.push(n);
      }
    }
  }
  for (const key of kept)
    b.put(unpackX(key), unpackY(key), unpackZ(key), cells.get(key) as number);
}

export function conifer(
  b: Builder,
  cx: number,
  cz: number,
  height: number,
  radius: number,
): void {
  const top = G + height;
  b.cylinder(cx, cz, 1.6, G, top - 4, M.TRUNK);
  const base = G + Math.round(height * 0.18);
  const cells = new Map<number, number>();
  for (let y = base; y <= top; y++) {
    const t = (y - base) / (top - base);
    const tier = ((top - y) % 10) / 10;
    const r = radius * (1 - t) * (0.62 + 0.38 * tier) + 1.2;
    const ri = Math.ceil(r);
    for (let dz = -ri; dz <= ri; dz++)
      for (let dx = -ri; dx <= ri; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > r - hash3(cx + dx, y, cz + dz) * 1.8) continue;
        const shade = hash3((cx + dx) >> 1, y >> 1, (cz + dz) >> 1);
        cells.set(
          pack(cx + dx, y, cz + dz),
          shade < 0.45 ? M.HEDGE : shade < 0.9 ? M.LEAVES_B : M.LEAVES_A,
        );
      }
  }
  plantConnected(b, cells);
}

export function birch(
  b: Builder,
  cx: number,
  cz: number,
  height: number,
  radius: number,
): void {
  b.tree(cx, G, cz, height, radius, [M.LEAVES_A, M.LEAVES_A, M.LEAVES_B]);
  for (let y = G; y < G + height; y++)
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++)
        if (b.get(cx + dx, y, cz + dz) === M.TRUNK)
          b.put(
            cx + dx,
            y,
            cz + dz,
            hash3(cx + dx, y >> 1, cz + dz) < 0.18 ? M.METAL : M.BIRCH_BARK,
          );
}

export function willow(
  b: Builder,
  cx: number,
  cz: number,
  height: number,
  radius: number,
): void {
  b.tree(cx, G, cz, height, radius, [M.LEAVES_A, M.LEAVES_A, M.HEDGE]);
  const r = radius + 2;
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      const z = cz + dz;
      if (hash3(x, 41, z) > 0.4) continue;
      let low = -1;
      for (let y = G + height + radius * 2; y > G + height - radius; y--) {
        const m = b.get(x, y, z);
        if (m === M.LEAVES_A || m === M.HEDGE) low = y;
        else if (low !== -1 && m === 0) break;
      }
      if (low === -1) continue;
      const len = 6 + Math.floor(hash3(x, 42, z) * 22);
      for (let y = low - 1; y > Math.max(G + 6, low - len); y--) {
        if (b.get(x, y, z) !== 0) break;
        b.put(x, y, z, hash3(x, y, z) < 0.3 ? M.HEDGE : M.LEAVES_A);
      }
    }
}

/** Hedge over the columns where `inside` holds. */
export function hedge(
  b: Builder,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  height: number,
  inside: Inside = () => true,
): void {
  for (let z = z0; z < z1; z++)
    for (let x = x0; x < x1; x++) {
      if (!inside(x, z)) continue;
      const bump = hash3(x >> 1, 77, z >> 1);
      const h = height - (bump < 0.25 ? 1 : 0) + (bump > 0.93 ? 1 : 0);
      for (let y = G; y < G + h; y++)
        b.put(x, y, z, hash3(x, y, z) < 0.12 ? M.LEAVES_B : M.HEDGE);
    }
}

export function flowerBed(
  b: Builder,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  palette: readonly number[],
  inside: Inside = () => true,
): void {
  const ins = (x: number, z: number) =>
    x >= x0 && x < x1 && z >= z0 && z < z1 && inside(x, z);
  for (let z = z0; z < z1; z++)
    for (let x = x0; x < x1; x++) {
      if (!ins(x, z)) continue;
      const edge =
        !ins(x + 1, z) || !ins(x - 1, z) || !ins(x, z + 1) || !ins(x, z - 1);
      if (edge) {
        b.fill(x, G - 1, z, x + 1, G + 2, z + 1, M.STONE);
        continue;
      }
      b.put(x, G - 1, z, M.DIRT);
      b.put(x, G, z, M.DIRT);
      const p = hash3(x, 31, z);
      if (p < 0.55) {
        const stem = 1 + Math.floor(hash3(x, 32, z) * 3);
        for (let k = 0; k < stem; k++) b.put(x, G + 1 + k, z, M.LEAVES_B);
        const clump = hash3((x / 3) | 0, 5, (z / 3) | 0);
        if (hash3(x, 33, z) < 0.75)
          b.put(
            x,
            G + 1 + stem,
            z,
            palette[Math.floor(clump * palette.length)],
          );
      } else if (p < 0.8) b.put(x, G + 1, z, M.LEAVES_A);
    }
}
