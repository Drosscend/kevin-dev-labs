import { type Builder, brick, hash3 } from "../engine/builder";
import { M } from "../engine/materials";
import { G } from "./layout";

const HX0 = 420;
const HX1 = 620;
const HZ0 = 360;
const HZ1 = 520;
const T = 6;
const Y_FLOOR = G + 6;
const Y_SLAB = G + 62;
const Y_UPPER = G + 68;
const Y_ROOF = G + 120;

type Side = "front" | "back" | "left" | "right";

function wallPos(side: Side, u: number, depth: number): [number, number] {
  switch (side) {
    case "front":
      return [u, HZ0 + depth];
    case "back":
      return [u, HZ1 - 1 - depth];
    case "left":
      return [HX0 + depth, u];
    case "right":
      return [HX1 - 1 - depth, u];
  }
}

function depthOf(x: number, z: number): number {
  return Math.min(x - HX0, HX1 - 1 - x, z - HZ0, HZ1 - 1 - z);
}

/** Two-storey brick house with garden, fence, tree and shed. */
export function house(b: Builder): void {
  garden(b);
  b.fill(HX0 - 4, G, HZ0 - 4, HX1 + 4, Y_FLOOR, HZ1 + 4, M.CONCRETE);
  b.fill(HX0 + T, Y_FLOOR - 1, HZ0 + T, HX1 - T, Y_FLOOR, HZ1 - T, M.PLANKS);
  b.fill(496, G, HZ0 - 16, 544, G + 2, HZ0 - 10, M.CONCRETE);
  b.fill(496, G, HZ0 - 10, 544, G + 4, HZ0 - 4, M.CONCRETE);

  for (let x = HX0; x < HX1; x++)
    for (let z = HZ0; z < HZ1; z++) {
      const d = depthOf(x, z);
      const along = z < HZ0 + T || z >= HZ1 - T ? x : z;
      if (d < T)
        for (let y = Y_FLOOR; y < Y_SLAB; y++)
          b.put(x, y, z, d >= T - 2 ? M.WALLPAPER : brick(along, y));
      for (let y = Y_SLAB; y < Y_UPPER; y++)
        b.put(x, y, z, d < 2 ? M.FRAME : M.PLANKS);
      if (d < T)
        for (let y = Y_UPPER; y < Y_ROOF; y++)
          b.put(x, y, z, d >= T - 2 ? M.WALLPAPER : M.PLASTER);
    }

  roof(b);
  windows(b);
  interior(b);

  b.fill(492, G + 58, HZ0 - 18, 548, G + 62, HZ0, M.ROOF_B);
  b.fill(494, G, HZ0 - 18, 498, G + 58, HZ0 - 14, M.FRAME);
  b.fill(542, G, HZ0 - 18, 546, G + 58, HZ0 - 14, M.FRAME);

  b.fill(620, G, 376, 634, G + 196, 396, (x, y, z) => brick(x + z, y));
  b.fill(618, G + 196, 374, 636, G + 202, 398, M.CONCRETE_DARK);
}

function roof(b: Builder): void {
  const z0 = HZ0 - 10;
  const z1 = HZ1 + 10;
  for (let z = z0; z < z1; z++) {
    const d = Math.min(z - z0, z1 - 1 - z);
    const top = Y_ROOF + Math.floor(d * 0.8);
    for (let x = HX0 - 6; x < HX1 + 6; x++) {
      const tileRow = Math.floor(d / 3);
      const tile = ((tileRow & 1) === 0) !== hash3(x >> 3, tileRow, 3) < 0.15;
      for (let y = top - 4; y <= top; y++)
        b.put(x, y, z, tile ? M.ROOF_A : M.ROOF_B);
      if (d >= 87) b.put(x, top + 1, z, M.ROOF_B);
      if (x >= HX0 && x < HX1 && z >= HZ0 && z < HZ1) {
        const wd = depthOf(x, z);
        if (wd < T)
          for (let y = Y_ROOF; y < top - 4; y++)
            b.put(x, y, z, wd >= T - 2 ? M.WALLPAPER : M.PLASTER);
      }
    }
  }
}

function windowAt(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
): void {
  const um = Math.floor((u0 + u1) / 2);
  const ym = Math.floor((y0 + y1) / 2);
  for (let u = u0; u < u1; u++)
    for (let y = y0; y < y1; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        const border = u < u0 + 2 || u >= u1 - 2 || y < y0 + 2 || y >= y1 - 2;
        const mullion = Math.abs(u - um) < 1 || Math.abs(y - ym) < 1;
        if (border) b.put(x, y, z, M.FRAME);
        else if (dep === 2) b.put(x, y, z, mullion ? M.FRAME : M.GLASS);
        else b.put(x, y, z, M.AIR);
      }
  for (let u = u0 - 2; u < u1 + 2; u++)
    for (const dep of [-1, -2]) {
      const [x, z] = wallPos(side, u, dep);
      b.put(x, y0 - 1, z, M.FRAME);
      b.put(x, y0 - 2, z, M.FRAME);
    }
}

function door(
  b: Builder,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
): void {
  for (let u = u0; u < u1; u++)
    for (let y = y0; y < y1; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos("front", u, dep);
        const border = u < u0 + 2 || u >= u1 - 2 || y >= y1 - 2;
        if (border) b.put(x, y, z, M.FRAME);
        else if (dep === 2 || dep === 3) {
          const panel = (u - u0) % 12 === 0 || (y - y0) % 16 === 0;
          b.put(x, y, z, panel ? M.PLANKS_DARK : M.DOOR);
        } else b.put(x, y, z, M.AIR);
      }
  const ky = y0 + 24;
  for (const dep of [1, 4]) {
    const [kx, kz] = wallPos("front", u1 - 7, dep);
    b.put(kx, ky, kz, M.BRASS);
    b.put(kx + 1, ky, kz, M.BRASS);
  }
}

function windows(b: Builder): void {
  const low = [G + 18, G + 50] as const;
  const high = [G + 80, G + 108] as const;
  for (const [u0, u1] of [
    [440, 480],
    [560, 600],
  ])
    windowAt(b, "front", u0, u1, ...low);
  for (const [u0, u1] of [
    [436, 476],
    [500, 540],
    [564, 604],
  ])
    windowAt(b, "front", u0, u1, ...high);
  for (const [u0, u1] of [
    [448, 488],
    [552, 592],
  ]) {
    windowAt(b, "back", u0, u1, ...low);
    windowAt(b, "back", u0, u1, ...high);
  }
  windowAt(b, "left", 372, 400, ...low);
  windowAt(b, "left", 400, 460, ...high);
  windowAt(b, "right", 420, 480, ...low);
  windowAt(b, "right", 420, 480, ...high);
  door(b, 504, 536, Y_FLOOR, G + 54);
}

function interior(b: Builder): void {
  b.fill(552, Y_FLOOR, HZ0 + T, 558, Y_SLAB, HZ1 - T, M.WALLPAPER);
  b.fill(552, Y_FLOOR, 440, 558, G + 54, 472, M.AIR);

  b.fill(452, Y_FLOOR, 420, 512, Y_FLOOR + 1, 472, (x, _y, z) =>
    (x + z) % 10 < 2 ? M.FABRIC_YELLOW : M.RUG,
  );
  b.fill(464, G + 20, 432, 496, G + 22, 456, M.TABLE);
  for (const [x, z] of [
    [464, 432],
    [494, 432],
    [464, 454],
    [494, 454],
  ])
    b.fill(x, G + 7, z, x + 2, G + 20, z + 2, M.TABLE);

  b.fill(456, Y_FLOOR, 488, 508, G + 16, 512, M.SOFA);
  b.fill(456, G + 16, 506, 508, G + 28, 512, M.SOFA);
  b.fill(456, G + 16, 488, 462, G + 22, 512, M.SOFA);
  b.fill(502, G + 16, 488, 508, G + 22, 512, M.SOFA);
  b.fill(466, G + 16, 500, 476, G + 24, 506, M.FABRIC_YELLOW);
  b.fill(486, G + 16, 500, 496, G + 24, 506, M.FABRIC_GREEN);

  b.fill(600, Y_FLOOR, 400, 614, G + 24, 510, (_x, y, z) =>
    z % 20 === 0 || y === G + 15 ? M.PLANKS : M.PLANKS_DARK,
  );
  b.fill(598, G + 24, 400, 614, G + 26, 510, M.MARBLE);

  for (let k = 0; k < 11; k++) {
    const top = Y_FLOOR + Math.round(((k + 1) * 62) / 11);
    b.fill(426, Y_FLOOR, 400 + 10 * k, 448, top, 410 + 10 * k, M.PLANKS);
  }
  b.fill(426, Y_SLAB, 410, 448, Y_UPPER, 500, M.AIR);

  b.fill(560, Y_UPPER, 464, 600, Y_UPPER + 10, 512, M.BED);
  b.fill(560, Y_UPPER + 8, 464, 600, Y_UPPER + 10, 492, M.SOFA);
  b.fill(564, Y_UPPER + 10, 500, 596, Y_UPPER + 12, 510, M.PILLOW);
  b.fill(560, Y_UPPER, 512, 600, Y_UPPER + 20, 514, M.PLANKS_DARK);
  b.fill(480, Y_UPPER, 496, 508, Y_UPPER + 40, 514, (x) =>
    x === 494 ? M.PLANKS_DARK : M.PLANKS,
  );
  b.fill(500, Y_UPPER, 400, 548, Y_UPPER + 1, 450, M.RUG);
}

function garden(b: Builder): void {
  const fenceZ = 300;
  for (let x = 362; x < 672; x++) {
    if (x >= 504 && x < 536) continue;
    b.put(x, G + 6, fenceZ, M.FENCE);
    b.put(x, G + 14, fenceZ, M.FENCE);
    if (x % 6 < 3) {
      const top = x % 6 === 1 ? G + 20 : G + 19;
      for (let y = G; y < top; y++) b.put(x, y, fenceZ, M.FENCE);
    }
  }
  b.fill(504, G - 1, 280, 536, G, HZ0 - 16, (x, _y, z) =>
    hash3(x >> 3, 3, z >> 3) < 0.5 ? M.PATH : M.SIDEWALK,
  );
  for (const [x0, x1] of [
    [440, 490],
    [550, 600],
  ]) {
    b.fill(x0, G - 1, 316, x1, G, 340, M.DIRT);
    for (let x = x0; x < x1; x++)
      for (let z = 316; z < 340; z++) {
        if (hash3(x, 5, z) > 0.2) continue;
        b.put(x, G, z, M.LEAVES_B);
        b.put(x, G + 1, z, M.LEAVES_B);
        if (hash3(x, 6, z) < 0.6)
          b.put(
            x,
            G + 2,
            z,
            [M.FLOWER_RED, M.FLOWER_YELLOW, M.FLOWER_PURPLE][
              Math.floor(hash3(x, 7, z) * 3)
            ],
          );
      }
  }
  b.fill(352, G, 302, 360, G + 22, 800, M.HEDGE);
  b.fill(672, G, 302, 680, G + 22, 800, M.HEDGE);
  b.tree(390, G, 468, 80, 30);
  shed(b);
}

function shed(b: Builder): void {
  const x0 = 560;
  const x1 = 640;
  const z0 = 600;
  const z1 = 672;
  b.fill(x0, G - 1, z0, x1, G, z1, M.PLANKS);
  for (let z = z0 - 6; z < z1 + 6; z++) {
    const top = G + 68 - Math.floor((z - (z0 - 6)) / 3);
    for (let x = x0 - 6; x < x1 + 6; x++) {
      for (let y = top - 3; y <= top; y++)
        b.put(x, y, z, ((z >> 2) & 1) === 0 ? M.ROOF_A : M.ROOF_B);
      const wall =
        x >= x0 &&
        x < x1 &&
        z >= z0 &&
        z < z1 &&
        Math.min(x - x0, x1 - 1 - x, z - z0, z1 - 1 - z) < 4;
      if (!wall) continue;
      const u = z < z0 + 4 || z >= z1 - 4 ? x : z;
      for (let y = G; y < top - 3; y++)
        b.put(x, y, z, u % 10 < 2 ? M.PLANKS_DARK : M.SHED);
    }
  }
  b.fill(584, G, z0, 612, G + 48, z0 + 4, M.AIR);
  b.fill(x1 - 4, G + 24, 624, x1, G + 44, 648, M.FRAME);
  b.fill(x1 - 4, G + 26, 626, x1, G + 42, 646, M.AIR);
  b.fill(x1 - 3, G + 26, 626, x1 - 2, G + 42, 646, M.GLASS);
  b.fill(x0 + 6, G, z1 - 16, x0 + 40, G + 30, z1 - 4, M.PLANKS_DARK);
}
