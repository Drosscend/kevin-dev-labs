import type { Builder } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";
import { bench } from "../props/furniture";
import { Local } from "../props/local";

const R = 48;
const FLOOR = G + 4;
const BEAM = G + 58;
const EAVE = 54;

function oct(dx: number, dz: number): number {
  const a = Math.abs(dx);
  const c = Math.abs(dz);
  return Math.max(a, c, (a + c) * Math.SQRT1_2);
}

function roofTop(o: number): number {
  return Math.round(BEAM + 4 + (EAVE - o) * 0.6);
}

/** Octagonal bandstand on a stone plinth, open toward +z. */
export function gazebo(b: Builder, cx: number, cz: number): void {
  const w = new Local(b, 0, 0, 0, 0);
  for (let dz = -EAVE; dz <= EAVE; dz++)
    for (let dx = -EAVE; dx <= EAVE; dx++) {
      const o = oct(dx, dz);
      const x = cx + dx;
      const z = cz + dz;
      if (o <= R) {
        b.fill(x, G - 1, z, x + 1, FLOOR - 1, z + 1, M.STONE);
        b.put(
          x,
          FLOOR - 1,
          z,
          o > R - 3
            ? M.MARBLE
            : (dx + 200) % 6 === 0
              ? M.PLANKS_DARK
              : M.PLANKS,
        );
      }
      if (o >= 38 && o <= 46)
        b.fill(x, BEAM, z, x + 1, roofTop(o) - 2, z + 1, M.FRAME);
      if (o <= EAVE) {
        const t = roofTop(o);
        const a = Math.abs(dx);
        const c = Math.abs(dz);
        const d = (a + c) * Math.SQRT1_2;
        const sorted = [a, c, d].sort((p, q) => q - p);
        const hip = sorted[0] - sorted[1] < 1.1;
        const m = o > EAVE - 2 ? M.FRAME_DARK : hip ? M.METAL : M.ROOF_SLATE;
        b.fill(x, t - 2, z, x + 1, t + 1, z + 1, m);
      }
    }
  b.fill(cx - 16, G - 1, cz + R + 1, cx + 17, G + 2, cz + R + 7, M.STONE);

  const posts: [number, number][] = [];
  for (const [a, c] of [
    [42, 17],
    [17, 42],
    [-17, 42],
    [-42, 17],
    [-42, -17],
    [-17, -42],
    [17, -42],
    [42, -17],
  ])
    posts.push([cx + a, cz + c]);
  for (const [x, z] of posts) {
    b.fill(x - 2, FLOOR, z - 2, x + 3, FLOOR + 3, z + 3, M.FRAME);
    b.fill(x - 1, FLOOR + 3, z - 1, x + 2, BEAM, z + 2, M.FRAME);
    b.fill(x - 2, BEAM - 4, z - 2, x + 3, BEAM, z + 2 + 1, M.FRAME);
  }
  for (let i = 0; i < posts.length; i++) {
    if (i === 1) continue;
    const [ax, az] = posts[i];
    const [bx, bz] = posts[(i + 1) % posts.length];
    w.wire(ax, FLOOR + 3, az, bx, FLOOR + 3, bz, M.FRAME);
    w.wire(ax, FLOOR + 20, az, bx, FLOOR + 20, bz, M.FRAME);
    w.wire(ax, FLOOR + 21, az, bx, FLOOR + 21, bz, M.FRAME);
    const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
    for (let k = 3; k < n - 2; k += 3) {
      const x = Math.round(ax + ((bx - ax) * k) / n);
      const z = Math.round(az + ((bz - az) * k) / n);
      b.fill(x, FLOOR, z, x + 1, FLOOR + 20, z + 1, M.FENCE);
    }
    const mx = Math.round((ax + bx) / 2);
    const mz = Math.round((az + bz) / 2);
    w.wire(ax, BEAM - 6, az, mx, BEAM - 1, mz, M.FRAME);
    w.wire(bx, BEAM - 6, bz, mx, BEAM - 1, mz, M.FRAME);
  }

  const peak = roofTop(0);
  b.cylinder(cx, cz, 1, peak, peak + 8, M.BRASS);
  b.sphere(cx, peak + 9, cz, 2, M.BRASS);
  b.fill(cx, G + 44, cz, cx + 1, peak - 2, cz + 1, M.METAL);
  b.fill(cx - 3, G + 42, cz - 3, cx + 4, G + 44, cz + 4, M.METAL);
  b.fill(cx - 2, G + 34, cz - 2, cx + 3, G + 42, cz + 3, M.LAMP);
  b.fill(cx - 3, G + 32, cz - 3, cx + 4, G + 34, cz + 4, M.METAL);
  for (const [dx, dz] of [
    [-3, -3],
    [3, -3],
    [-3, 3],
    [3, 3],
  ])
    b.fill(cx + dx, G + 34, cz + dz, cx + dx + 1, G + 42, cz + dz + 1, M.METAL);

  bench(b, cx - 17, FLOOR, cz - 22, "+z", 24);
  bench(b, cx + 17, FLOOR, cz - 22, "+z", 24);
}
