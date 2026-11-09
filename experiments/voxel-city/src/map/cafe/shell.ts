import { type Builder, hash3, type Mat } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";
import { lantern, streetText, text } from "./parts";
import {
  BX0,
  BX1,
  BZ0,
  BZ1,
  facade,
  finish,
  IX0,
  IX1,
  IZ0,
  IZ1,
  type Side,
  T,
  wallPos,
  X_SPLIT,
  Y_FLOOR,
  Y_PARAPET,
  Y_ROOF,
  Y_ROOF_TOP,
  Y_SLAB,
  Y_UPPER,
  Z_KITCHEN,
} from "./plan";

const SHOP_TOP = G + 54;

/** Brick shell, slabs, roof, cornices, all openings and everything fixed to the facades. */
export function shell(b: Builder): void {
  b.fill(BX0, G, BZ0, BX1, Y_FLOOR - 1, BZ1, M.CONCRETE);
  b.fill(IX0, Y_FLOOR - 1, IZ0, IX1, Y_FLOOR, IZ1, floorMat);
  walls(b);
  slabs(b);
  bands(b);
  storefronts(b);
  windows(b);
  fascia(b);
  awning(b, 746, 870, [746, 869]);
  awning(b, 888, 1002, [889, 1001]);
  bladeSign(b);
  balcony(b);
  backStair(b);
  downspouts(b);
  lantern(b, 879, G + 50, BZ0 - 1, 0, -1);
  lantern(b, BX0 - 1, G + 50, 426, -1, 0);
  lantern(b, BX0 - 1, G + 50, 462, -1, 0);
  lantern(b, 806, G + 52, BZ1, 0, 1);
  lantern(b, 1000, G + 132, BZ1, 0, 1);
  b.fill(874, G + 22, BZ0 - 4, 884, G + 34, BZ0, (x, y, z) =>
    y === G + 30 && z === BZ0 - 4 && x > 875 && x < 882
      ? M.FRAME_DARK
      : M.METAL_YELLOW,
  );
}

function floorMat(x: number, _y: number, z: number): number {
  if (x < X_SPLIT) {
    if (z >= Z_KITCHEN)
      return x % 6 === 0 || z % 6 === 0 ? M.CONCRETE : M.TILE_WHITE;
    return ((x >> 2) + (z >> 2)) & 1 ? M.TILE_BLACK : M.TILE_WHITE;
  }
  return x % 10 === 0 || z % 10 === 0 ? M.CONCRETE : M.MARBLE;
}

function wallMat(x: number, y: number, z: number): number {
  const dx = Math.min(x - BX0, BX1 - 1 - x);
  const dz = Math.min(z - BZ0, BZ1 - 1 - z);
  const storey = (y >= Y_FLOOR && y < Y_SLAB) || (y >= Y_UPPER && y < Y_ROOF);
  if (Math.min(dx, dz) >= T - 2 && storey) return finish(x, y, z);
  return dz <= dx ? facade(x, y, dx) : facade(z, y, dz);
}

function walls(b: Builder): void {
  b.fill(BX0, G, BZ0, BX1, Y_PARAPET, BZ0 + T, wallMat);
  b.fill(BX0, G, BZ1 - T, BX1, Y_PARAPET, BZ1, wallMat);
  b.fill(BX0, G, BZ0 + T, BX0 + T, Y_PARAPET, BZ1 - T, wallMat);
  b.fill(BX1 - T, G, BZ0 + T, BX1, Y_PARAPET, BZ1 - T, wallMat);
}

function slabs(b: Builder): void {
  b.fill(IX0, Y_SLAB, IZ0, IX1, Y_UPPER, IZ1, (x, y, z) => {
    if (y === Y_SLAB) return M.PLASTER;
    if (y < Y_UPPER - 1) return M.CONCRETE;
    const board = Math.floor(z / 5);
    return z % 5 === 0 || (x + board * 17) % 48 === 0
      ? M.PLANKS_DARK
      : M.PLANKS;
  });
  b.fill(IX0, Y_ROOF, IZ0, IX1, Y_ROOF_TOP, IZ1, (x, y, z) => {
    if (y === Y_ROOF) return M.PLASTER;
    if (y < Y_ROOF_TOP - 1) return M.CONCRETE;
    return hash3(x >> 2, 5, z >> 2) < 0.12 ? M.ROOF_SLATE : M.ROOF_TAR;
  });
}

function bands(b: Builder): void {
  const band = (y0: number, y1: number, out: number, t: number, m: Mat) =>
    b.shell(BX0 - out, y0, BZ0 - out, BX1 + out, y1, BZ1 + out, t, m);
  band(Y_SLAB, Y_SLAB + 4, 2, 2, (_x, y) =>
    y === Y_SLAB ? M.CONCRETE_DARK : M.CONCRETE,
  );
  band(Y_ROOF - 4, Y_ROOF - 2, 1, 1, M.CONCRETE);
  band(Y_ROOF - 2, Y_ROOF + 1, 2, 2, (x, _y, z) => {
    const along = z < BZ0 || z >= BZ1 ? x : z;
    return along % 4 < 2 ? M.CONCRETE : 0;
  });
  band(Y_ROOF + 1, Y_ROOF + 4, 3, 3, M.CONCRETE);
  band(Y_ROOF + 4, Y_ROOF + 5, 2, 2, M.CONCRETE_DARK);
  band(Y_PARAPET, Y_PARAPET + 2, 1, T + 2, M.CONCRETE);
}

function storefront(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  frame: number,
  bulk: number,
): void {
  const n = Math.max(1, Math.round((u1 - u0) / 24));
  const step = (u1 - u0) / n;
  const mullion = (u: number) => {
    for (let k = 1; k < n; k++)
      if (u === u0 + Math.round(k * step)) return true;
    return false;
  };
  for (let u = u0; u < u1; u++)
    for (let y = Y_FLOOR; y < SHOP_TOP; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        if (y < G + 12) {
          if (dep !== 0) continue;
          const mould =
            y === Y_FLOOR ||
            y === G + 10 ||
            u === u0 ||
            u === u1 - 1 ||
            (u - u0) % 12 === 0;
          b.put(x, y, z, y === G + 11 ? M.MARBLE : mould ? frame : bulk);
          continue;
        }
        const border =
          u < u0 + 2 || u >= u1 - 2 || y >= SHOP_TOP - 2 || y < G + 14;
        const bar = mullion(u) || y === G + 42 || y === G + 43;
        if ((border || bar) && dep >= 1 && dep <= 3) b.put(x, y, z, frame);
        else if (dep === 2) b.put(x, y, z, M.GLASS);
        else if (y === G + 12 && dep > 3) b.put(x, y, z, M.MARBLE);
        else b.put(x, y, z, M.AIR);
      }
  for (let u = u0 - 1; u < u1 + 1; u++) {
    const [x, z] = wallPos(side, u, -1);
    b.put(x, G + 11, z, M.MARBLE);
  }
}

function glassDoor(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  frame: number,
): void {
  const um = Math.floor((u0 + u1) / 2);
  for (let u = u0; u < u1; u++)
    for (let y = Y_FLOOR; y < SHOP_TOP; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        const border = u < u0 + 2 || u >= u1 - 2 || y >= SHOP_TOP - 2;
        const transom = y >= G + 42 && y < G + 46;
        const stile = y < G + 42 && (u === um || u === um - 1);
        if ((border || transom || stile) && dep >= 1 && dep <= 3) {
          b.put(x, y, z, frame);
          continue;
        }
        if (dep !== 2) {
          b.put(x, y, z, M.AIR);
          continue;
        }
        const rail =
          y < G + 42 && (y < Y_FLOOR + 5 || u === u0 + 2 || u === u1 - 3);
        b.put(x, y, z, rail ? frame : M.GLASS);
      }
  for (const dep of [0, 4])
    for (const u of [um - 1, um]) {
      const [x, z] = wallPos(side, u, dep);
      b.fill(x, G + 18, z, x + 1, G + 32, z + 1, M.CHROME);
    }
  for (let u = u0; u < u1; u++)
    for (let dep = -4; dep < T; dep++) {
      const [x, z] = wallPos(side, u, dep);
      if (dep >= 0) b.put(x, Y_FLOOR - 1, z, M.MARBLE);
      else b.put(x, G + 2, z, M.STONE);
    }
}

/** Panelled single door; `steel` gives a grey service door. */
function panelDoor(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
  steel: boolean,
): void {
  for (let u = u0; u < u1; u++)
    for (let y = y0; y < y1; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        const border = u < u0 + 2 || u >= u1 - 2 || y >= y1 - 2;
        if (border && dep >= 1 && dep <= 4) {
          b.put(x, y, z, steel ? M.FRAME_DARK : M.FRAME);
          continue;
        }
        if (dep !== 2 && dep !== 3) {
          b.put(x, y, z, M.AIR);
          continue;
        }
        const glassTop =
          !steel && y > y1 - 16 && y < y1 - 4 && u > u0 + 4 && u < u1 - 5;
        if (glassTop) {
          b.put(x, y, z, dep === 2 ? M.GLASS : M.AIR);
          continue;
        }
        const panel = (u - u0 - 2) % 8 === 0 || (y - y0) % 12 === 0;
        b.put(
          x,
          y,
          z,
          steel ? (panel ? M.METAL : M.CHROME) : panel ? M.PLANKS_DARK : M.DOOR,
        );
      }
  for (const dep of [1, 4]) {
    const [x, z] = wallPos(side, u1 - 5, dep);
    b.fill(x, y0 + 20, z, x + 1, y0 + 22, z + 1, M.BRASS);
  }
  for (let u = u0; u < u1; u++) {
    const [x, z] = wallPos(side, u, 0);
    b.put(x, y0 - 1, z, M.STONE);
  }
}

interface WindowOpts {
  frame?: number;
  shutters?: boolean;
  flowers?: boolean;
  door?: boolean;
}

/** Casement window, or French door when `opts.door`. */
function window(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
  opts: WindowOpts = {},
): void {
  const frame = opts.frame ?? M.FRAME;
  const um = Math.floor((u0 + u1) / 2);
  const ty = y1 - Math.floor((y1 - y0) / 3);
  for (let u = u0; u < u1; u++)
    for (let y = y0; y < y1; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        const border =
          u < u0 + 2 ||
          u >= u1 - 2 ||
          y >= y1 - 2 ||
          (!opts.door && y < y0 + 2);
        const bar =
          u === um ||
          y === ty ||
          (opts.door && (y < y0 + 12 || (y - y0) % 12 === 0));
        if (border && dep >= 1 && dep <= 3) b.put(x, y, z, frame);
        else if (dep === 2) b.put(x, y, z, bar ? frame : M.GLASS);
        else b.put(x, y, z, M.AIR);
      }
  for (let u = u0 - 2; u < u1 + 2; u++) {
    for (let dep = -2; dep <= 0; dep++) {
      const [x, z] = wallPos(side, u, dep);
      if (!opts.door) b.fill(x, y0 - 2, z, x + 1, y0, z + 1, M.CONCRETE);
      if (dep >= -1) {
        const key = Math.abs(u - um + 0.5) < 3;
        b.fill(x, y1, z, x + 1, y1 + (key ? 5 : 3), z + 1, M.STONE);
      }
    }
    if (u >= u0 && u < u1)
      for (let dep = opts.door ? 0 : 3; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        b.put(x, y0 - 1, z, opts.door ? M.STONE : M.WOOD_LIGHT);
      }
  }
  if (opts.shutters)
    for (const [s0, s1] of [
      [u0 - 9, u0],
      [u1, u1 + 9],
    ])
      for (let u = s0; u < s1; u++) {
        const [x, z] = wallPos(side, u, -1);
        b.fill(x, y0, z, x + 1, y1, z + 1, (_x, y) =>
          u === s0 || u === s1 - 1 || y === y0 || y === y1 - 1 || y === ty
            ? M.SIGN_GREEN
            : y % 2 === 0
              ? M.METAL_GREEN
              : M.SIGN_GREEN,
        );
      }
  if (opts.flowers)
    for (let u = u0; u < u1; u++)
      for (let dep = -5; dep <= -3; dep++) {
        const [x, z] = wallPos(side, u, dep);
        const edge = u === u0 || u === u1 - 1 || dep === -5 || dep === -3;
        b.fill(
          x,
          y0 - 2,
          z,
          x + 1,
          y0 + 3,
          z + 1,
          edge ? M.PLANKS_DARK : M.DIRT,
        );
        if (!edge) {
          const h = 1 + Math.floor(hash3(u, y0, dep) * 3);
          b.fill(x, y0 + 3, z, x + 1, y0 + 3 + h, z + 1, M.HEDGE);
          if (hash3(u, 3, dep) < 0.5)
            b.put(
              x,
              y0 + 3 + h,
              z,
              hash3(u, 4, dep) < 0.5 ? M.FLOWER_RED : M.FLOWER_PURPLE,
            );
        }
      }
}

function storefronts(b: Builder): void {
  const cafe = M.SIGN_GREEN;
  const shop = M.FRAME_DARK;
  storefront(b, "front", 748, 796, cafe, M.METAL_GREEN);
  glassDoor(b, "front", 796, 822, cafe);
  storefront(b, "front", 822, 868, cafe, M.METAL_GREEN);
  storefront(b, "front", 890, 944, shop, M.TILE_BLACK);
  glassDoor(b, "front", 944, 968, shop);
  storefront(b, "front", 968, 1000, shop, M.TILE_BLACK);
  storefront(b, "west", 372, 420, cafe, M.METAL_GREEN);
  glassDoor(b, "west", 432, 456, cafe);
  storefront(b, "west", 468, 496, cafe, M.METAL_GREEN);
}

function windows(b: Builder): void {
  const lo = G + 92;
  const hi = G + 128;
  for (const c of [776, 825, 923, 972])
    window(b, "front", c - 13, c + 13, lo, hi, {
      shutters: true,
      flowers: c === 825 || c === 923,
    });
  window(b, "front", 860, 888, Y_UPPER, hi, { door: true });
  for (const c of [400, 446, 520]) {
    window(b, "west", c - 13, c + 13, lo, hi, {
      shutters: true,
      flowers: c === 446,
    });
    window(b, "east", c - 13, c + 13, lo, hi, {
      shutters: true,
      flowers: c === 400,
    });
  }
  window(b, "west", 522, 548, G + 30, G + 52);
  window(b, "east", 410, 450, G + 30, G + 54, { frame: M.FRAME_DARK });
  window(b, "east", 462, 502, G + 30, G + 54, { frame: M.FRAME_DARK });
  window(b, "back", 760, 784, G + 28, G + 50);
  window(b, "back", 773, 799, lo, hi, { shutters: true });
  window(b, "back", 856, 876, G + 106, G + 124);
  window(b, "back", 927, 953, lo, hi);
  panelDoor(b, "back", 796, 816, Y_FLOOR, G + 48, false);
  panelDoor(b, "back", 980, 998, Y_FLOOR, G + 48, true);
  panelDoor(b, "back", 990, 1004, Y_UPPER, G + 126, false);
}

function fascia(b: Builder): void {
  const y0 = G + 57;
  const y1 = G + 76;
  const z = BZ0 - 1;
  b.fill(746, y0, z, 870, y1, z + 1, (x, y) =>
    x === 746 || x === 869 || y === y0 || y === y1 - 1 ? M.BRASS : M.SIGN_GREEN,
  );
  b.fill(888, y0, z, 1002, y1, z + 1, (x, y) =>
    x === 888 || x === 1001 || y === y0 || y === y1 - 1
      ? M.CHROME
      : M.FRAME_DARK,
  );
  streetText(b, "CAFE BAR", 2, 808, G + 73, z - 1, M.BRASS);
  b.fill(762, G + 59, z - 1, 855, G + 60, z, M.NEON_PINK);
  streetText(b, "EPICERIE", 2, 945, G + 73, z - 1, M.METAL_YELLOW);
  b.fill(900, G + 59, z - 1, 991, G + 60, z, M.NEON_CYAN);
  streetText(b, "OUVERT", 1, 918, G + 38, BZ0 + 3, M.NEON_CYAN);
}

function awning(b: Builder, x0: number, x1: number, brackets: number[]): void {
  const zw = BZ0 - 1;
  const zf = zw - 36;
  const stripe = (x: number) =>
    Math.floor((x - x0) / 6) % 2 === 0 ? M.AWNING_RED : M.AWNING_WHITE;
  const top = (z: number) => G + 56 - Math.floor((zw - z) / 3);
  for (let z = zf; z <= zw; z++) {
    const y = top(z);
    b.fill(x0, y - 1, z, x1, y + 1, z + 1, stripe);
  }
  b.fill(x0, G + 37, zf, x1, G + 44, zf + 1, (x, y) => {
    const s = (x - x0) % 6;
    if (y === G + 37 && (s === 0 || s === 5)) return 0;
    return stripe(x);
  });
  for (const x of [x0, x1 - 1])
    for (let z = zf; z <= zw; z++) {
      const low = G + 38 + Math.floor((z - zf) / 2);
      if (low < top(z) - 1)
        b.fill(x, low, z, x + 1, top(z) - 1, z + 1, stripe(x));
    }
  for (const x of brackets)
    b.line(x, G + 30, zw, x, G + 43, zf + 3, 1, M.METAL);
}

function bladeSign(b: Builder): void {
  const xa = 740;
  const xb = 744;
  const za = 324;
  const zb = 347;
  const ya = G + 84;
  const yb = G + 163;
  b.fill(xa, ya, za, xb, yb, zb, (_x, y, z) =>
    z === za || z === zb - 1 || y === ya || y === yb - 1
      ? M.BRASS
      : M.SIGN_GREEN,
  );
  for (const yy of [G + 92, G + 152])
    b.fill(xa + 1, yy, zb, xb - 1, yy + 2, BZ0, M.METAL);
  for (const x of [xa - 1, xb]) {
    b.fill(x, ya + 2, za + 2, x + 1, yb - 2, zb - 2, (_x, y, z) =>
      y === ya + 2 || y === yb - 3 || z === za + 2 || z === zb - 3
        ? M.NEON_CYAN
        : 0,
    );
    const west = x < xa;
    for (let i = 0; i < 4; i++)
      text(
        b,
        "CAFE"[i],
        2,
        x,
        G + 156 - i * 18,
        west ? za + 7 : zb - 8,
        0,
        west ? 1 : -1,
        M.NEON_PINK,
      );
  }
}

function balcony(b: Builder): void {
  const x0 = 852;
  const x1 = 896;
  const z0 = 334;
  b.fill(x0, G + 79, z0, x1, G + 82, BZ0, (_x, y) =>
    y === G + 81 ? M.STONE : M.CONCRETE,
  );
  for (const xc of [870, 884]) {
    b.fill(xc, G + 76, 340, xc + 4, G + 79, BZ0, M.STONE);
    b.fill(xc, G + 72, 344, xc + 4, G + 76, BZ0, M.STONE);
    b.fill(xc, G + 68, 347, xc + 4, G + 72, BZ0, M.STONE);
  }
  const posts: [number, number][] = [];
  for (let x = x0; x < x1; x += 3) posts.push([x, z0]);
  for (let z = z0 + 3; z < BZ0; z += 3) posts.push([x0, z], [x1 - 1, z]);
  for (const [x, z] of posts)
    b.fill(x, G + 82, z, x + 1, G + 100, z + 1, M.METAL);
  for (const y of [G + 84, G + 100]) {
    const m = y === G + 100 ? M.BRASS : M.METAL;
    b.fill(x0, y, z0, x1, y + 1, z0 + 1, m);
    b.fill(x0, y, z0, x0 + 1, y + 1, BZ0, m);
    b.fill(x1 - 1, y, z0, x1, y + 1, BZ0, m);
  }
}

function backStair(b: Builder): void {
  const z0 = BZ1;
  const z1 = BZ1 + 16;
  for (let i = 0; i <= 40; i++) {
    const xs = 867 + 3 * i;
    const y0 = G + 2 * i;
    b.fill(xs, y0, z0, xs + 3, y0 + 2, z1, (_x, _y, z) =>
      z % 3 === 0 ? M.FRAME_DARK : M.METAL,
    );
    b.fill(xs, Math.max(G, y0 - 3), z1, xs + 3, y0 + 2, z1 + 2, M.METAL);
    b.fill(xs, y0 + 18, z1 + 1, xs + 3, y0 + 21, z1 + 2, M.METAL);
    if (i % 4 === 0)
      b.fill(xs + 1, y0 + 2, z1 + 1, xs + 2, y0 + 18, z1 + 2, M.METAL);
  }
  const lx0 = 987;
  const lx1 = 1010;
  const lz1 = BZ1 + 22;
  b.fill(lx0, G + 79, z0, lx1, G + 82, lz1, (x, _y, z) =>
    (x + z) % 3 === 0 ? M.FRAME_DARK : M.METAL,
  );
  for (const x of [990, 1006])
    b.fill(x, G, lz1 - 3, x + 2, G + 79, lz1 - 1, M.METAL);
  for (let x = lx0 + 3; x < lx1; x += 3)
    b.fill(x, G + 82, lz1 - 1, x + 1, G + 100, lz1, M.METAL);
  for (let z = z0; z < lz1; z += 3)
    b.fill(lx1 - 1, G + 82, z, lx1, G + 100, z + 1, M.METAL);
  b.fill(lx0 + 3, G + 100, lz1 - 1, lx1, G + 101, lz1, M.METAL);
  b.fill(lx1 - 1, G + 100, z0, lx1, G + 101, lz1, M.METAL);
}

function downspouts(b: Builder): void {
  for (const [x, z] of [
    [BX0 - 2, BZ0 + 2],
    [BX0 - 2, BZ1 - 4],
    [BX1, BZ0 + 2],
    [BX1, BZ1 - 4],
  ]) {
    b.fill(x, G, z, x + 2, Y_PARAPET - 4, z + 2, M.METAL);
    b.fill(x - 1, Y_PARAPET - 8, z - 1, x + 3, Y_PARAPET - 4, z + 3, M.METAL);
  }
}
