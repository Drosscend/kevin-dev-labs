import { type Builder, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";

const FONT: Record<string, readonly string[]> = {
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  B: ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  C: [" ### ", "#   #", "#    ", "#    ", "#    ", "#   #", " ### "],
  D: ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  F: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  I: [" ### ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  M: ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
};

function textWidth(str: string, scale: number): number {
  return (str.length * 6 - 1) * scale;
}

/**
 * Draws 5x7 pixel letters. (x, yTop, z) is the top-left corner seen by the reader,
 * (dx, dz) the reading direction, letters grow downward.
 */
export function text(
  b: Builder,
  str: string,
  scale: number,
  x: number,
  yTop: number,
  z: number,
  dx: number,
  dz: number,
  m: number,
): void {
  for (let i = 0; i < str.length; i++) {
    const glyph = FONT[str[i]];
    if (!glyph) continue;
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 5; c++) {
        if (glyph[r][c] !== "#") continue;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) {
            const u = (i * 6 + c) * scale + sx;
            b.put(x + dx * u, yTop - r * scale - sy, z + dz * u, m);
          }
      }
  }
}

/** Text read from the street (viewer looking +z), centered on `cx`. */
export function streetText(
  b: Builder,
  str: string,
  scale: number,
  cx: number,
  yTop: number,
  z: number,
  m: number,
): void {
  const w = textWidth(str, scale);
  text(b, str, scale, cx + Math.floor(w / 2) - 1, yTop, z, -1, 0, m);
}

type Facing = "+x" | "-x" | "+z" | "-z";

/** Bistro chair: the sitter looks toward `facing`; (x, z) is the seat center. */
export function chair(
  b: Builder,
  x: number,
  y0: number,
  z: number,
  facing: Facing,
  seat: number = M.TABLE,
  frame: number = M.TABLE,
): void {
  const x0 = x - 3;
  const z0 = z - 3;
  for (const [lx, lz] of [
    [x0, z0],
    [x0 + 5, z0],
    [x0, z0 + 5],
    [x0 + 5, z0 + 5],
  ])
    b.fill(lx, y0, lz, lx + 1, y0 + 8, lz + 1, frame);
  b.fill(x0, y0 + 8, z0, x0 + 6, y0 + 9, z0 + 6, seat);
  const back: [number, number, number, number] =
    facing === "+x"
      ? [x0, z0, x0 + 1, z0 + 6]
      : facing === "-x"
        ? [x0 + 5, z0, x0 + 6, z0 + 6]
        : facing === "+z"
          ? [x0, z0, x0 + 6, z0 + 1]
          : [x0, z0 + 5, x0 + 6, z0 + 6];
  const [bx0, bz0, bx1, bz1] = back;
  b.fill(bx0, y0 + 9, bz0, bx1, y0 + 18, bz1, (xx, yy, zz) => {
    const along = bx1 - bx0 > 1 ? xx - bx0 : zz - bz0;
    return yy >= y0 + 15 || along === 0 || along === 5 ? frame : 0;
  });
}

/** Round pedestal table; `height` counts from the floor to the first air above the top. */
export function roundTable(
  b: Builder,
  cx: number,
  y0: number,
  cz: number,
  r: number,
  height: number,
  top: number,
  foot: number = M.METAL,
): void {
  b.cylinder(cx, cz, 3, y0, y0 + 1, foot);
  b.fill(cx, y0 + 1, cz, cx + 1, y0 + height - 1, cz + 1, foot);
  b.cylinder(cx, cz, r, y0 + height - 1, y0 + height, top);
}

export function stool(
  b: Builder,
  cx: number,
  y0: number,
  cz: number,
  seat: number = M.RUG,
): void {
  b.cylinder(cx, cz, 2.5, y0, y0 + 1, M.CHROME);
  b.fill(cx, y0 + 1, cz, cx + 1, y0 + 14, cz + 1, M.CHROME);
  b.fill(cx - 2, y0 + 6, cz - 2, cx + 3, y0 + 7, cz + 3, (x, _y, z) =>
    x === cx || z === cz || Math.max(Math.abs(x - cx), Math.abs(z - cz)) === 2
      ? M.CHROME
      : 0,
  );
  b.cylinder(cx, cz, 3.2, y0 + 14, y0 + 16, seat);
}

/** Pendant lamp hanging by a cord from the ceiling whose lowest solid layer is `ceil`. */
export function pendant(
  b: Builder,
  cx: number,
  ceil: number,
  cz: number,
  drop: number,
  shade: number = M.BRASS,
): void {
  const yb = ceil - drop;
  b.fill(cx, yb + 3, cz, cx + 1, ceil, cz + 1, M.METAL);
  b.cylinder(cx, cz, 1.5, yb + 2, yb + 3, shade);
  b.cylinder(cx, cz, 2.5, yb + 1, yb + 2, shade);
  b.cylinder(cx, cz, 3.6, yb, yb + 1, shade);
  b.cylinder(cx, cz, 2.2, yb, yb + 1, M.LAMP);
}

/** Wall lantern: bracket out of the wall along (dx, dz) from (x, z), lamp hanging at the end. */
export function lantern(
  b: Builder,
  x: number,
  y: number,
  z: number,
  dx: number,
  dz: number,
): void {
  for (let i = 0; i < 5; i++) b.put(x + dx * i, y, z + dz * i, M.METAL);
  const lx = x + dx * 4;
  const lz = z + dz * 4;
  b.fill(lx - 1, y - 6, lz - 1, lx + 2, y, lz + 2, (xx, yy, zz) =>
    yy === y - 1 || yy === y - 6 || (xx !== lx && zz !== lz)
      ? M.FRAME_DARK
      : M.LAMP,
  );
}

export function planter(
  b: Builder,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  b.fill(x0, y0, z0, x1, y0 + 9, z1, (x, y, z) => {
    const edge = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1;
    if (edge) return y === y0 + 8 ? M.PLANKS : M.PLANKS_DARK;
    return y < y0 + 8 ? M.DIRT : M.GRASS_DARK;
  });
  for (let x = x0 + 1; x < x1 - 1; x++)
    for (let z = z0 + 1; z < z1 - 1; z++) {
      const h = 2 + Math.floor(hash3(x >> 1, 11, z >> 1) * 6);
      for (let y = y0 + 9; y < y0 + 9 + h; y++) b.put(x, y, z, M.HEDGE);
      if (hash3(x, 12, z) < 0.12)
        b.put(
          x,
          y0 + 9 + h,
          z,
          [M.FLOWER_RED, M.FLOWER_YELLOW, M.FLOWER_PURPLE][
            Math.floor(hash3(x, 13, z) * 3)
          ],
        );
    }
}

export function pottedPlant(
  b: Builder,
  cx: number,
  y0: number,
  cz: number,
  size: number,
  pot: number = M.CONCRETE_DARK,
): void {
  b.cylinder(cx, cz, 3.5, y0, y0 + 7, pot);
  b.tree(cx, y0 + 7, cz, size, Math.round(size * 0.7 + 3));
}

export function parasol(
  b: Builder,
  cx: number,
  y0: number,
  cz: number,
  r: number,
  height: number,
): void {
  b.fill(cx - 3, y0, cz - 3, cx + 4, y0 + 2, cz + 4, M.CONCRETE);
  b.fill(cx, y0 + 2, cz, cx + 1, y0 + height + 3, cz + 1, M.METAL);
  const top = y0 + height + 2;
  const ri = Math.ceil(r);
  for (let z = -ri; z <= ri; z++)
    for (let x = -ri; x <= ri; x++) {
      const d = Math.hypot(x, z);
      if (d > r) continue;
      const y = top - Math.floor(d * 0.38);
      const sector = Math.floor(
        ((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 12,
      );
      const m = sector % 2 === 0 ? M.AWNING_RED : M.AWNING_WHITE;
      b.put(cx + x, y, cz + z, m);
      b.put(cx + x, y - 1, cz + z, m);
      if (d > r - 1.2) b.put(cx + x, y - 2, cz + z, m);
    }
  b.put(cx, top + 1, cz, M.METAL);
}

/** Wooden crate of fruit (top at y0 + 6). */
export function fruitCrate(
  b: Builder,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  z1: number,
  fruit: number,
): void {
  b.fill(x0, y0, z0, x1, y0 + 5, z1, (x, y, z) => {
    const edge = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1;
    if (edge || y === y0) return y === y0 + 2 ? M.PLANKS_DARK : M.PLANKS;
    return y === y0 + 4 ? fruit : M.PLANKS;
  });
  for (let x = x0 + 1; x < x1 - 1; x++)
    for (let z = z0 + 1; z < z1 - 1; z++)
      if ((x + z) % 2 === 0 || hash3(x, 21, z) < 0.3)
        b.put(x, y0 + 5, z, fruit);
}

/** Wooden pallet, 4 voxels tall. */
export function pallet(
  b: Builder,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  b.fill(x0, y0, z0, x1, y0 + 4, z1, (x, y, z) => {
    const runner =
      z - z0 < 3 || z1 - 1 - z < 3 || Math.abs(z - (z0 + z1) / 2) < 1.5;
    if (y === y0 || y === y0 + 2) return runner ? M.PLANKS_DARK : 0;
    if (y === y0 + 1)
      return runner &&
        (x - x0 < 3 || x1 - 1 - x < 3 || Math.abs(x - (x0 + x1) / 2) < 1.5)
        ? M.PLANKS_DARK
        : 0;
    return (x - x0) % 4 === 3 ? 0 : M.PLANKS;
  });
}

export function box(
  b: Builder,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): void {
  const mx = Math.floor((x0 + x1) / 2);
  b.fill(x0, y0, z0, x1, y1, z1, (x, y) =>
    y === y1 - 1 && x === mx ? M.PLANKS : M.WOOD_LIGHT,
  );
}

const PRODUCTS = [
  M.PRODUCT_RED,
  M.PRODUCT_BLUE,
  M.PRODUCT_ORANGE,
  M.PRODUCT_GREEN,
  M.FABRIC_YELLOW,
  M.CAR_WHITE,
  M.BOOKS,
  M.PRODUCT_RED,
  M.PRODUCT_BLUE,
  M.WOOD_LIGHT,
] as const;

/**
 * Packed goods sitting on a shelf board whose top surface is `y0 - 1`.
 * Items run along the axis given by `alongX`, with varied widths, heights and colors.
 */
export function goods(
  b: Builder,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  z1: number,
  maxH: number,
  seed: number,
  alongX = false,
): void {
  b.fill(x0, y0, z0, x1, y0 + maxH, z1, (x, y, z) => {
    const u = alongX ? x : z;
    const item = Math.floor(u / 4);
    const h0 = hash3(item, seed, 31);
    if (u % 4 === 3 || h0 < 0.06) return 0;
    const h = Math.max(
      2,
      Math.round(maxH * (0.45 + hash3(item, seed, 32) * 0.55)),
    );
    if (y - y0 >= h) return 0;
    const m = PRODUCTS[Math.floor(hash3(item, seed, 33) * PRODUCTS.length)];
    if (y - y0 === h - 1 && h0 > 0.7) return M.CAR_WHITE;
    return m;
  });
}
