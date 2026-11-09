import { hash3, type Mat } from "../../engine/builder";
import { M } from "../../engine/materials";
import { flipX, pick, type Unit } from "./plan";

/** Direction the front of a piece faces. Pieces are drawn with their back at v = 0. */
type Facing = "+x" | "-x" | "+z" | "-z";

type Put = (
  u0: number,
  y0: number,
  v0: number,
  u1: number,
  y1: number,
  v1: number,
  m: Mat,
) => void;

/**
 * Maps piece coordinates (u across, v from back to front) onto the unit.
 * The footprint min corner is (ox, oz): w x d for +z/-z, d x w for +x/-x.
 */
function orient(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  d: number,
): Put {
  return (u0, y0, v0, u1, y1, v1, m) => {
    switch (facing) {
      case "+z":
        un.box(ox + u0, y0, oz + v0, ox + u1, y1, oz + v1, m);
        break;
      case "-z":
        un.box(ox + w - u1, y0, oz + d - v1, ox + w - u0, y1, oz + d - v0, m);
        break;
      case "+x":
        un.box(ox + v0, y0, oz + w - u1, ox + v1, y1, oz + w - u0, m);
        break;
      case "-x":
        un.box(ox + d - v1, y0, oz + u0, ox + d - v0, y1, oz + u1, m);
        break;
    }
  };
}

/** Four legs of size `n`, inset by `i` from the corners of a w x d footprint. */
function legs(
  p: Put,
  w: number,
  d: number,
  i: number,
  n: number,
  h: number,
  m: Mat,
): void {
  for (const a of [i, w - i - n])
    for (const c of [i, d - i - n]) p(a, 0, c, a + n, h, c + n, m);
}

export const FABRICS = [
  M.SOFA,
  M.FABRIC_GREEN,
  M.FABRIC_YELLOW,
  M.RUG,
  M.BRICK_GREY,
  M.PLANKS_DARK,
] as const;
const BOOK_COLORS = [
  M.BOOKS,
  M.PRODUCT_RED,
  M.PRODUCT_BLUE,
  M.SIGN_GREEN,
  M.FABRIC_YELLOW,
  M.PILLOW,
  M.PRODUCT_ORANGE,
  M.RUG,
  M.BOOKS,
  M.TILE_BLACK,
] as const;

export function sofa(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  fabric: number,
  accent: number,
): void {
  const d = 16;
  const p = orient(un, ox, oz, facing, w, d);
  legs(p, w, d, 1, 2, 2, M.PLANKS_DARK);
  p(0, 2, 0, w, 8, d, fabric);
  p(0, 8, 0, w, 19, 5, fabric);
  p(0, 8, 5, 4, 13, d, fabric);
  p(w - 4, 8, 5, w, 13, d, fabric);
  for (let a = 4; a < w - 4; a += 14)
    p(a, 8, 5, Math.min(a + 13, w - 4), 10, d - 1, fabric);
  p(5, 10, 5, 10, 15, 8, accent);
  if (w > 24) p(w - 10, 10, 5, w - 5, 15, 8, accent);
}

export function coffeeTable(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  d: number,
  top: number,
): void {
  const p = orient(un, ox, oz, facing, w, d);
  legs(p, w, d, 0, 2, 7, M.PLANKS_DARK);
  p(0, 7, 0, w, 8, d, top);
  p(0, 3, 0, w, 4, d, M.PLANKS_DARK);
  p(3, 8, 3, 9, 9, 8, M.PRODUCT_RED);
  p(4, 9, 4, 8, 10, 7, M.PRODUCT_BLUE);
  p(w - 6, 8, d - 6, w - 3, 11, d - 3, M.TILE_WHITE);
}

export function tvUnit(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  wood: number,
): void {
  const p = orient(un, ox, oz, facing, w, 8);
  p(0, 0, 0, w, 10, 8, (x, y, z) =>
    y === un.f + 5 || (x + z) % 12 === 0 ? M.PLANKS_DARK : wood,
  );
  const tw = Math.min(w - 4, 26);
  const a = Math.floor((w - tw) / 2);
  const c = Math.floor(w / 2);
  p(c - 4, 10, 2, c + 4, 11, 6, M.METAL);
  p(c - 1, 11, 3, c + 1, 14, 4, M.METAL);
  p(a, 14, 3, a + tw, 30, 4, M.TILE_BLACK);
  p(a + 1, 15, 4, a + tw - 1, 29, 5, M.GLASS_DARK);
  p(2, 10, 2, 7, 13, 6, M.TILE_BLACK);
  p(w - 5, 10, 3, w - 3, 16, 5, M.TILE_BLACK);
}

export function bookshelf(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  h: number,
  frame: number,
): void {
  const p = orient(un, ox, oz, facing, w, 6);
  p(0, 0, 0, w, h, 1, frame);
  p(0, 0, 0, 1, h, 6, frame);
  p(w - 1, 0, 0, w, h, 6, frame);
  for (let y = 0; y < h - 1; y += 9) p(0, y, 0, w, y + 1, 6, frame);
  p(0, h - 1, 0, w, h, 6, frame);
  const salt = un.k * 31 + un.s * 7 + ox + oz;
  for (let y = 1; y + 8 <= h - 1; y += 9)
    for (let u = 1; u < w - 1; u++) {
      const r = hash3(u, y, salt);
      if (r < 0.1) continue;
      if (r > 0.97 && u < w - 5) {
        p(u, y, 1, u + 3, y + 3, 5, M.TILE_WHITE);
        p(u + 1, y + 3, 2, u + 2, y + 6, 4, M.LEAVES_A);
        u += 3;
        continue;
      }
      const hh = 5 + Math.floor(hash3(u, y, salt + 1) * 3);
      const color = pick(BOOK_COLORS, hash3(u >> 1, y, salt + 2));
      p(u, y, 1, u + 1, y + hh, r > 0.6 ? 5 : 4, color);
    }
}

export function bed(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  len: number,
  blanket: number,
  frame: number,
): void {
  const p = orient(un, ox, oz, facing, w, len);
  p(0, 0, 0, w, 5, len, frame);
  p(0, 0, 0, w, 24, 2, frame);
  p(1, 5, 2, w - 1, 10, len - 1, M.BED);
  p(0, 5, 15, w, 11, len, blanket);
  p(1, 11, 15, w - 1, 12, 18, M.BED);
  if (w >= 28) {
    p(3, 10, 3, Math.floor(w / 2) - 1, 13, 11, M.PILLOW);
    p(Math.floor(w / 2) + 1, 10, 3, w - 3, 13, 11, M.PILLOW);
  } else p(3, 10, 3, w - 3, 13, 11, M.PILLOW);
}

export function nightstand(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  wood: number,
  lamp: boolean,
): void {
  const p = orient(un, ox, oz, facing, 8, 8);
  p(0, 0, 0, 8, 11, 8, wood);
  p(1, 6, 8, 7, 7, 9, M.PLANKS_DARK);
  p(3, 8, 8, 5, 9, 9, M.BRASS);
  if (lamp) {
    p(2, 11, 2, 5, 12, 5, M.METAL);
    p(3, 12, 3, 4, 16, 4, M.METAL);
    p(1, 16, 1, 6, 20, 6, M.LAMP);
  } else {
    p(1, 11, 2, 6, 13, 6, M.BOOKS);
    p(2, 13, 2, 5, 14, 5, M.PRODUCT_BLUE);
  }
}

export function wardrobe(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  wood: number,
): void {
  const p = orient(un, ox, oz, facing, w, 12);
  const mid = Math.floor(w / 2);
  p(0, 0, 0, w, 44, 12, wood);
  p(0, 0, 11, w, 2, 12, M.PLANKS_DARK);
  p(mid, 2, 11, mid + 1, 44, 12, M.PLANKS_DARK);
  p(mid - 2, 18, 12, mid - 1, 28, 13, M.CHROME);
  p(mid + 1, 18, 12, mid + 2, 28, 13, M.CHROME);
  p(2, 44, 1, 12, 50, 10, M.SHED);
  if (w > 24) p(14, 44, 2, 22, 48, 9, M.PRODUCT_ORANGE);
}

export function kitchenRun(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  cabinet: number,
  top: number,
  sinkAt: number,
  stoveAt: number,
): void {
  const p = orient(un, ox, oz, facing, w, 12);
  const seam = cabinet === M.PLANKS_DARK ? M.FRAME_DARK : M.PLANKS_DARK;
  p(0, 0, 0, w, 2, 11, M.TILE_BLACK);
  p(0, 2, 0, w, 17, 12, cabinet);
  for (let a = 0; a < w; a += 12) {
    p(a, 3, 11, a + 1, 17, 12, seam);
    p(a + 5, 14, 12, a + 8, 15, 13, M.CHROME);
  }
  p(0, 17, 0, w, 19, 13, top);
  if (sinkAt >= 0) {
    p(sinkAt, 16, 3, sinkAt + 12, 19, 10, M.CHROME);
    p(sinkAt + 1, 17, 4, sinkAt + 11, 19, 9, M.AIR);
    p(sinkAt + 5, 19, 1, sinkAt + 7, 24, 3, M.CHROME);
    p(sinkAt + 5, 22, 3, sinkAt + 7, 24, 6, M.CHROME);
  }
  if (stoveAt >= 0) {
    p(stoveAt, 18, 1, stoveAt + 12, 19, 11, M.TILE_BLACK);
    for (const [a, c] of [
      [2, 2],
      [7, 2],
      [2, 7],
      [7, 7],
    ])
      p(stoveAt + a, 19, c, stoveAt + a + 3, 20, c + 3, M.METAL);
    p(stoveAt + 1, 4, 11, stoveAt + 11, 14, 12, M.GLASS_DARK);
    p(stoveAt + 1, 15, 12, stoveAt + 11, 16, 13, M.CHROME);
    p(stoveAt + 1, 32, 0, stoveAt + 11, 36, 9, M.CHROME);
    p(stoveAt + 4, 36, 0, stoveAt + 8, un.h, 4, M.CHROME);
  }
  const r = un.rnd(ox + oz);
  const mw = w - 24;
  if (sinkAt < 0 || mw > sinkAt + 12) {
    p(mw, 19, 2, mw + 10, 25, 8, M.CAR_WHITE);
    p(mw + 1, 20, 8, mw + 7, 24, 9, M.GLASS_DARK);
  }
  if (r < 0.7 && w > 40) {
    p(w - 8, 19, 3, w - 5, 23, 6, M.CHROME);
    p(w - 14, 19, 2, w - 10, 20, 9, M.PLANKS);
    p(w - 14, 20, 4, w - 11, 22, 7, M.PRODUCT_GREEN);
  }
}

export function wallCabinets(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  cabinet: number,
): void {
  const p = orient(un, ox, oz, facing, w, 7);
  p(0, 30, 0, w, 44, 7, cabinet);
  for (let a = 0; a < w; a += 12) p(a, 30, 6, a + 1, 44, 7, M.PLANKS_DARK);
  for (let a = 5; a < w - 2; a += 12) p(a, 31, 7, a + 2, 32, 8, M.CHROME);
}

export function fridge(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  body: number,
): void {
  const p = orient(un, ox, oz, facing, 14, 13);
  p(0, 0, 0, 14, 42, 13, body);
  p(0, 27, 12, 14, 28, 13, M.FRAME_DARK);
  p(11, 29, 13, 12, 37, 14, M.CHROME);
  p(11, 15, 13, 12, 25, 14, M.CHROME);
  p(3, 33, 13, 4, 34, 14, M.PRODUCT_RED);
  p(6, 31, 13, 7, 32, 14, M.FABRIC_YELLOW);
  p(4, 20, 13, 7, 23, 14, M.PILLOW);
}

export function chair(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  wood: number,
  seat: number,
): void {
  const p = orient(un, ox, oz, facing, 8, 8);
  legs(p, 8, 8, 0, 1, 8, wood);
  p(0, 8, 0, 8, 9, 8, seat);
  p(0, 9, 0, 8, 19, 1, wood);
  p(2, 11, 0, 6, 17, 1, M.AIR);
}

export function diningSet(
  un: Unit,
  x0: number,
  z0: number,
  w: number,
  d: number,
  wood: number,
  seat: number,
): void {
  const p = orient(un, x0, z0, "+z", w, d);
  legs(p, w, d, 1, 2, 15, wood);
  p(0, 15, 0, w, 17, d, wood);
  const cx = Math.floor(w / 2);
  const cz = Math.floor(d / 2);
  p(cx - 1, 17, cz - 1, cx + 2, 21, cz + 2, M.TILE_WHITE);
  p(cx, 21, cz, cx + 1, 24, cz + 1, M.LEAVES_A);
  p(cx - 1, 24, cz, cx + 2, 25, cz + 1, M.FLOWER_RED);
  p(cx, 24, cz - 1, cx + 1, 25, cz + 2, M.FLOWER_RED);
  for (const a of [3, w - 9]) {
    p(a, 17, 2, a + 5, 18, 7, M.PILLOW);
    p(a, 17, d - 7, a + 5, 18, d - 2, M.PILLOW);
  }
  for (const a of [2, w - 10]) {
    chair(un, x0 + a, z0 - 6, "+z", wood, seat);
    chair(un, x0 + a, z0 + d - 2, "-z", wood, seat);
  }
}

export function floorLamp(un: Unit, x: number, z: number): void {
  un.box(x, 0, z, x + 3, 1, z + 3, M.METAL);
  un.box(x + 1, 1, z + 1, x + 2, 31, z + 2, M.METAL);
  un.box(x - 1, 28, z - 1, x + 4, 34, z + 4, M.LAMP);
}

export function plant(
  un: Unit,
  x: number,
  z: number,
  pot: number,
  tall: boolean,
): void {
  un.box(x, 0, z, x + 4, 6, z + 4, pot);
  un.box(x, 5, z, x + 4, 6, z + 4, M.DIRT);
  const top = tall ? 26 : 14;
  un.box(x + 1, 6, z + 1, x + 3, top - 6, z + 3, M.TRUNK);
  un.box(x - 2, top - 8, z + 1, x + 6, top - 2, z + 3, M.LEAVES_A);
  un.box(x + 1, top - 8, z - 2, x + 3, top - 2, z + 6, M.LEAVES_B);
  un.box(x, top - 4, z, x + 4, top, z + 4, M.LEAVES_A);
}

export function rug(
  un: Unit,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  a: number,
  c: number,
): void {
  const [wx0, wx1] = flipX(un.s, x0, x1);
  un.box(x0, 0, z0, x1, 1, z1, (x, _y, z) => {
    const edge = Math.min(x - wx0, wx1 - 1 - x, z - z0, z1 - 1 - z);
    return edge < 2 || (edge > 3 && (x + z) % 8 === 0) ? c : a;
  });
}

export function ceilingLamp(un: Unit, x: number, z: number): void {
  un.box(x + 1, un.h - 7, z + 1, x + 2, un.h, z + 2, M.METAL);
  un.box(x, un.h - 10, z, x + 3, un.h - 7, z + 3, M.LAMP);
  un.box(x - 1, un.h - 8, z - 1, x + 4, un.h - 7, z + 4, M.METAL);
}

/** A framed picture flat against a wall face (1 voxel off the wall). */
export function picture(
  un: Unit,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  canvas: number,
): void {
  un.box(x0, y0, z0, x1, y1, z1, M.PLANKS_DARK);
  const alongX = x1 - x0 > z1 - z0;
  if (alongX) un.box(x0 + 1, y0 + 1, z0, x1 - 1, y1 - 1, z1, canvas);
  else un.box(x0, y0 + 1, z0 + 1, x1, y1 - 1, z1 - 1, canvas);
}

export function desk(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
  w: number,
  wood: number,
): void {
  const p = orient(un, ox, oz, facing, w, 12);
  p(0, 0, 0, 2, 15, 12, wood);
  p(w - 10, 0, 0, w, 15, 12, wood);
  p(w - 9, 5, 12, w - 1, 6, 13, M.CHROME);
  p(w - 9, 10, 12, w - 1, 11, 13, M.CHROME);
  p(0, 15, 0, w, 16, 12, wood);
  const c = Math.floor(w / 2);
  p(c - 2, 16, 2, c + 2, 17, 5, M.METAL);
  p(c - 1, 17, 2, c + 1, 19, 3, M.METAL);
  p(c - 7, 19, 2, c + 7, 28, 3, M.TILE_BLACK);
  p(c - 6, 20, 3, c + 6, 27, 4, M.GLASS_DARK);
  p(c - 5, 16, 6, c + 5, 17, 9, M.FRAME_DARK);
  p(c + 7, 16, 7, c + 9, 17, 9, M.FRAME_DARK);
  p(2, 16, 2, 4, 17, 4, M.METAL);
  p(2, 17, 2, 3, 22, 3, M.METAL);
  p(2, 22, 2, 6, 24, 5, M.LAMP);
  p(w - 8, 16, 4, w - 3, 18, 10, M.PILLOW);
}

export function officeChair(
  un: Unit,
  x: number,
  z: number,
  facing: Facing,
  fabric: number,
): void {
  const p = orient(un, x, z, facing, 8, 8);
  p(0, 0, 3, 8, 1, 5, M.METAL);
  p(3, 0, 0, 5, 1, 8, M.METAL);
  p(3, 1, 3, 5, 7, 5, M.METAL);
  p(0, 7, 0, 8, 9, 8, fabric);
  p(1, 9, 0, 7, 22, 2, fabric);
}

export function bathtub(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
): void {
  const p = orient(un, ox, oz, facing, 30, 14);
  p(0, 0, 0, 30, 11, 14, M.TILE_WHITE);
  p(2, 2, 2, 28, 11, 12, M.AIR);
  p(2, 2, 2, 28, 6, 12, M.WATER);
  p(24, 11, 0, 26, 18, 2, M.CHROME);
  p(24, 16, 2, 26, 18, 5, M.CHROME);
  p(4, 11, 0, 5, 40, 1, M.CHROME);
  p(4, 38, 1, 5, 40, 4, M.CHROME);
  p(3, 37, 3, 6, 38, 6, M.CHROME);
}

export function toilet(un: Unit, ox: number, oz: number, facing: Facing): void {
  const p = orient(un, ox, oz, facing, 8, 11);
  p(2, 0, 3, 6, 6, 9, M.TILE_WHITE);
  p(0, 6, 3, 8, 9, 11, M.TILE_WHITE);
  p(1, 9, 3, 7, 10, 10, M.PILLOW);
  p(0, 6, 0, 8, 17, 3, M.TILE_WHITE);
  p(3, 17, 1, 5, 18, 2, M.CHROME);
}

export function washbasin(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
): void {
  const p = orient(un, ox, oz, facing, 12, 9);
  p(4, 0, 0, 8, 14, 4, M.TILE_WHITE);
  p(0, 14, 0, 12, 18, 9, M.TILE_WHITE);
  p(2, 16, 2, 10, 18, 7, M.AIR);
  p(5, 18, 0, 7, 21, 1, M.CHROME);
  p(5, 20, 1, 7, 21, 3, M.CHROME);
  p(1, 24, -1, 11, 38, 0, M.CHROME);
  p(2, 25, -1, 10, 37, 0, M.MIRROR);
}

export function washingMachine(
  un: Unit,
  ox: number,
  oz: number,
  facing: Facing,
): void {
  const p = orient(un, ox, oz, facing, 12, 12);
  p(0, 0, 0, 12, 17, 12, M.CAR_WHITE);
  p(3, 3, 11, 9, 10, 12, M.CHROME);
  p(4, 4, 11, 8, 9, 12, M.GLASS_DARK);
  p(1, 13, 11, 11, 16, 12, M.FRAME);
  p(8, 14, 12, 10, 15, 13, M.TILE_BLACK);
  p(2, 17, 3, 6, 22, 7, M.PRODUCT_ORANGE);
}

export function boxes(un: Unit, x: number, z: number, n: number): void {
  let y = 0;
  for (let i = 0; i < n; i++) {
    const w = 10 + Math.floor(un.rnd(x + i) * 6);
    const h = 7 + Math.floor(un.rnd(z + i) * 5);
    const dx = i % 2;
    un.box(x + dx, y, z + dx, x + dx + w, y + h, z + dx + 10, M.SHED);
    un.box(
      x + dx,
      y + h - 1,
      z + dx + 4,
      x + dx + w,
      y + h,
      z + dx + 6,
      M.PLANKS,
    );
    y += h;
  }
}
