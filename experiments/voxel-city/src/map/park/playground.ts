import { type Builder, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";
import { bench, bin } from "../props/furniture";
import { Local } from "../props/local";

export function playground(b: Builder): void {
  const w = new Local(b, 0, 0, 0, 0);
  mulch(b, 12, 812, 86, 874);
  mulch(b, 98, 808, 142, 906);
  swings(b, w);
  slide(b, w);
  sandbox(b, 160, 822);
  seesaw(b, 150, 890);
  springRider(b, 222, 846);
  fence(b);
  bench(b, 214, G, 904, "-z");
  bin(b, 236, G, 904);
}

function mulch(
  b: Builder,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  b.fill(x0, G - 1, z0, x1, G, z1, M.BARK_MULCH);
  b.fill(x0, G, z0, x1, G + 1, z1, 0);
  b.shell(x0, G, z0, x1, G + 1, z1, 1, M.PLANKS);
}

function swings(b: Builder, w: Local): void {
  const xa = 20;
  const xb = 76;
  const zc = 843;
  const top = G + 46;
  for (const x of [xa, xb]) {
    b.line(x, G, zc - 17, x, top, zc, 1.5, M.METAL_YELLOW);
    b.line(x, G, zc + 17, x, top, zc, 1.5, M.METAL_YELLOW);
    b.line(x, G + 16, zc - 11, x, G + 16, zc + 11, 1, M.METAL_YELLOW);
    b.fill(x - 2, G - 1, zc - 19, x + 3, G, zc - 14, M.CONCRETE);
    b.fill(x - 2, G - 1, zc + 15, x + 3, G, zc + 20, M.CONCRETE);
  }
  b.line(xa, top, zc, xb, top, zc, 1.5, M.METAL_RED);
  for (const x of [31, 43]) {
    for (let y = G + 10; y < top - 1; y++)
      b.put(x, y, zc, (y & 1) === 0 ? M.METAL : M.CHROME);
  }
  b.fill(30, G + 9, zc - 2, 45, G + 10, zc + 3, M.RUBBER);
  for (const x of [53, 65]) w.wire(x, top - 2, zc, x, G + 12, zc + 9, M.CHROME);
  b.fill(52, G + 11, zc + 7, 67, G + 12, zc + 12, M.RUBBER);
}

function slide(b: Builder, w: Local): void {
  const x0 = 110;
  const x1 = 130;
  const z0 = 828;
  const z1 = 848;
  const deck = G + 24;
  for (const [x, z] of [
    [x0, z0],
    [x1 - 2, z0],
    [x0, z1 - 2],
    [x1 - 2, z1 - 2],
  ])
    b.fill(x, G, z, x + 2, deck + 20, z + 2, M.METAL_YELLOW);
  b.fill(x0, deck, z0, x1, deck + 2, z1, (x) =>
    (x - x0) % 4 === 3 ? M.PLANKS_DARK : M.PLANKS,
  );
  for (let k = 0; k < 8; k++)
    b.fill(
      x0 - 2 + k,
      deck + 20 + k,
      z0 - 2 + k,
      x1 + 2 - k,
      deck + 21 + k,
      z1 + 2 - k,
      k % 2 === 0 ? M.METAL_RED : M.AWNING_WHITE,
    );
  for (const x of [x0, x1 - 1]) {
    b.fill(x, deck + 11, z0, x + 1, deck + 12, z1, M.METAL_YELLOW);
    for (let z = z0 + 3; z < z1 - 2; z += 3)
      b.fill(x, deck + 2, z, x + 1, deck + 11, z + 1, M.METAL_YELLOW);
  }

  for (const x of [x0 + 3, x1 - 4])
    w.wire(x, G, z0 - 16, x, deck + 1, z0, M.METAL_YELLOW);
  for (let h = 4; h < 24; h += 4) {
    const z = Math.round(z0 - 16 + (16 * h) / 25);
    b.fill(x0 + 3, G + h, z, x1 - 3, G + h + 1, z + 1, M.CHROME);
  }

  const sx0 = 115;
  const sx1 = 125;
  for (let z = z1; z < z1 + 54; z++) {
    const hb =
      z < z1 + 46 ? Math.round(deck + 1 - ((z - z1) * 22) / 46) : deck - 21;
    b.fill(sx0 + 1, hb - 1, z, sx1 - 1, hb + 1, z + 1, M.CHROME);
    b.fill(sx0, hb - 1, z, sx0 + 1, hb + 4, z + 1, M.METAL_RED);
    b.fill(sx1 - 1, hb - 1, z, sx1, hb + 4, z + 1, M.METAL_RED);
    if (z === z1 + 20 || z === z1 + 50)
      for (const x of [sx0, sx1 - 1])
        b.fill(x, G, z, x + 1, hb - 1, z + 1, M.METAL_YELLOW);
  }
}

function sandbox(b: Builder, x0: number, z0: number): void {
  const n = 40;
  b.fill(x0, G - 1, z0, x0 + n, G, z0 + n, M.SAND);
  for (let z = z0; z < z0 + n; z++)
    for (let x = x0; x < x0 + n; x++) {
      const d = Math.min(x - x0, x0 + n - 1 - x, z - z0, z0 + n - 1 - z);
      if (d < 3) {
        b.fill(x, G, z, x + 1, G + 4, z + 1, M.PLANKS);
        b.put(x, G + 4, z, M.PLANKS_DARK);
      } else {
        const mound = Math.max(0, 4 - Math.hypot(x - x0 - 26, z - z0 - 24) / 3);
        const top = G + 2 + Math.round(mound + hash3(x, 62, z) * 0.6);
        b.fill(x, G, z, x + 1, top, z + 1, M.SAND);
      }
    }
  const cx = x0 + 13;
  const cz = z0 + 14;
  b.fill(cx - 4, G + 2, cz - 4, cx + 5, G + 6, cz + 5, M.SAND);
  b.cylinder(cx, cz, 2.5, G + 6, G + 11, M.SAND);
  for (const [dx, dz] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ])
    b.fill(cx + dx, G + 6, cz + dz, cx + dx + 1, G + 8, cz + dz + 1, M.SAND);
  b.cylinder(x0 + 28, z0 + 10, 2.3, G + 2, G + 3, M.METAL_RED);
  b.cylinder(x0 + 28, z0 + 10, 2.3, G + 3, G + 8, (x, _y, z) =>
    Math.hypot(x - x0 - 28, z - z0 - 10) > 1.3 ? M.METAL_RED : 0,
  );
  b.fill(x0 + 10, G + 2, z0 + 30, x0 + 11, G + 3, z0 + 38, M.METAL_YELLOW);
  b.fill(x0 + 9, G + 2, z0 + 27, x0 + 12, G + 3, z0 + 30, M.METAL_YELLOW);
}

function seesaw(b: Builder, x0: number, zc: number): void {
  const len = 56;
  const cx = x0 + len / 2;
  b.fill(cx - 4, G, zc - 4, cx + 4, G + 3, zc + 4, M.METAL_RED);
  b.fill(cx - 3, G + 3, zc - 3, cx + 3, G + 6, zc + 3, M.METAL_RED);
  b.fill(cx - 2, G + 6, zc - 4, cx + 2, G + 8, zc + 4, M.CHROME);
  for (let x = x0; x < x0 + len; x++) {
    const hb = G + 1 + Math.round(((x - x0) * 12) / len);
    b.fill(x, hb - 1, zc - 3, x + 1, hb + 1, zc + 3, M.PLANKS);
  }
  for (const x of [x0 + 7, x0 + len - 8]) {
    const hb = G + 1 + Math.round(((x - x0) * 12) / len);
    b.fill(x, hb + 1, zc - 1, x + 1, hb + 6, zc + 1, M.METAL);
    b.fill(x, hb + 6, zc - 3, x + 1, hb + 7, zc + 3, M.METAL_YELLOW);
    const sx = x < cx ? x - 6 : x + 1;
    for (let s = sx; s < sx + 5; s++) {
      const hs = G + 1 + Math.round(((s - x0) * 12) / len);
      b.fill(s, hs + 1, zc - 3, s + 1, hs + 2, zc + 3, M.RUBBER);
    }
  }
}

function springRider(b: Builder, cx: number, cz: number): void {
  b.fill(cx - 4, G - 1, cz - 4, cx + 5, G, cz + 5, M.CONCRETE);
  for (let y = G; y < G + 9; y++)
    b.cylinder(cx, cz, (y & 1) === 0 ? 2.2 : 1.5, y, y + 1, M.METAL);
  b.fill(cx - 7, G + 9, cz - 3, cx + 7, G + 14, cz + 3, M.CAR_RED);
  b.fill(cx - 3, G + 14, cz - 3, cx + 2, G + 15, cz + 3, M.RUBBER);
  b.fill(cx + 4, G + 14, cz - 2, cx + 8, G + 20, cz + 2, M.CAR_RED);
  b.fill(cx + 5, G + 20, cz - 2, cx + 11, G + 24, cz + 2, M.CAR_RED);
  b.put(cx + 10, G + 22, cz - 2, M.METAL);
  b.put(cx + 10, G + 22, cz + 1, M.METAL);
  b.fill(cx + 3, G + 17, cz - 5, cx + 4, G + 18, cz + 5, M.METAL_YELLOW);
  b.fill(cx - 9, G + 10, cz - 1, cx - 7, G + 13, cz + 1, M.FABRIC_YELLOW);
}

function fence(b: Builder): void {
  const z = 914;
  for (let x = 6; x < 246; x++) {
    if (x >= 92 && x < 110) continue;
    b.put(x, G + 4, z, M.FENCE);
    b.put(x, G + 11, z, M.FENCE);
    if (x % 4 < 2) {
      const top = x % 4 === 0 ? G + 15 : G + 14;
      for (let y = G; y < top; y++) b.put(x, y, z, M.FENCE);
    }
  }
  for (const x of [90, 110])
    b.fill(x, G, z - 1, x + 2, G + 18, z + 1, M.PLANKS_DARK);
}
