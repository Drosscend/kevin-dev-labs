import { type Builder, hash3 } from "../../engine/builder";
import { SIZE_X, SIZE_Z } from "../../engine/constants";
import { M } from "../../engine/materials";
import { G, ZONES } from "../layout";

interface Path {
  points: readonly (readonly [number, number])[];
  width: number;
}

interface Plaza {
  cx: number;
  cz: number;
  r: number;
}

const Z0 = ZONES.park.z0;
const DEPTH = SIZE_Z - Z0;

export function paintGround(
  b: Builder,
  paths: readonly Path[],
  plazas: readonly Plaza[],
): void {
  for (let z = Z0; z < SIZE_Z; z++)
    for (let x = 0; x < SIZE_X; x++) {
      const stripe = Math.floor((x + z * 0.35) / 26) & 1;
      const patch = hash3(x >> 3, 11, z >> 3) < 0.18;
      const dark = ((stripe === 1) !== patch) !== hash3(x, 12, z) < 0.12;
      b.put(x, G - 1, z, dark ? M.GRASS_DARK : M.GRASS);
      const tuft = hash3(x, 13, z);
      if (tuft < 0.008) b.put(x, G, z, M.GRASS_DARK);
      else if (tuft < 0.0095) b.put(x, G, z, M.FLOWER_YELLOW);
      else if (tuft < 0.0105) b.put(x, G, z, M.FLOWER_WHITE);
    }

  const field = new Float32Array(SIZE_X * DEPTH).fill(1e9);
  for (const path of paths)
    for (const [px, pz] of sample(path.points)) {
      const r = Math.ceil(path.width);
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          const x = Math.round(px) + dx;
          const z = Math.round(pz) + dz;
          if (x < 0 || x >= SIZE_X || z < Z0 || z >= SIZE_Z) continue;
          const s = Math.hypot(x - px, z - pz) - path.width;
          const i = (z - Z0) * SIZE_X + x;
          if (s < field[i]) field[i] = s;
        }
    }
  for (let z = Z0; z < SIZE_Z; z++)
    for (let x = 0; x < SIZE_X; x++) {
      const s = field[(z - Z0) * SIZE_X + x];
      if (s >= 0) continue;
      b.put(x, G, z, 0);
      b.put(
        x,
        G - 1,
        z,
        s >= -1.5 ? M.STONE : hash3(x, 14, z) < 0.12 ? M.PATH : M.GRAVEL,
      );
    }

  for (const p of plazas) paving(b, p);
}

function paving(b: Builder, { cx, cz, r }: Plaza): void {
  const ri = Math.ceil(r);
  for (let dz = -ri; dz <= ri; dz++)
    for (let dx = -ri; dx <= ri; dx++) {
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      const a = Math.atan2(dz, dx);
      let m: number;
      const star = d < 22 * (0.25 + 0.75 * Math.abs(Math.cos(2 * a)) ** 6);
      if (d < 4) m = M.MARBLE;
      else if (star) m = Math.cos(2 * a) > 0 ? M.MARBLE : M.STONE;
      else if (d > r - 3) m = M.STONE;
      else if (d > r - 5) m = M.MARBLE;
      else {
        const ring = Math.floor(d / 5);
        const seg = Math.floor(((a + Math.PI) * d) / 6);
        const h = hash3(ring, seg, cx);
        m =
          ring % 4 === 0
            ? M.CONCRETE
            : h < 0.5
              ? M.PATH
              : h < 0.85
                ? M.SIDEWALK
                : M.CONCRETE;
      }
      b.put(cx + dx, G, cz + dz, 0);
      b.put(cx + dx, G - 1, cz + dz, m);
    }
}

/** Catmull-Rom points about one voxel apart. */
function* sample(
  pts: readonly (readonly [number, number])[],
): Generator<[number, number]> {
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b0: number, c: number, d: number) =>
        0.5 *
        (2 * b0 +
          (c - a) * t +
          (2 * a - 5 * b0 + 4 * c - d) * t2 +
          (3 * b0 - a - 3 * c + d) * t3);
      yield [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
    }
  }
  const last = pts[pts.length - 1];
  yield [last[0], last[1]];
}
