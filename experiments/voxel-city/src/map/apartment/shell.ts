import { type Builder, brick, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";
import {
  CORE,
  ceilY,
  FLOOR0,
  flipX,
  floorY,
  LEVELS,
  levelOf,
  pick,
  ROOF,
  ROOF_SLAB,
  type Side,
  SPLIT,
  T,
  unitWall,
  wallPos,
  X0,
  X1,
  Z0,
  Z1,
} from "./plan";

function depthOf(x: number, z: number): number {
  return Math.min(x - X0, X1 - 1 - x, z - Z0, Z1 - 1 - z);
}

function facade(x: number, y: number, z: number): number {
  const dz = Math.min(z - Z0, Z1 - 1 - z);
  const dx = Math.min(x - X0, X1 - 1 - x);
  const frontBack = dz <= dx;
  const u = frontBack ? x : z;
  const corner = frontBack ? dx : dz;
  if (y < floorY(1) - 4) {
    const v = y - FLOOR0;
    const row = Math.floor(v / 10);
    if (v % 10 === 9 || (u + (row & 1) * 16) % 32 === 31)
      return M.CONCRETE_DARK;
    return M.STONE;
  }
  if (z - Z0 < T && x >= CORE.x0 && x < CORE.x1) return M.PLASTER;
  const quoin = (Math.floor(y / 8) & 1) === 0 ? 12 : 7;
  if (corner < quoin) return y % 8 === 7 ? M.MORTAR : M.PLASTER;
  return brick(u, y);
}

function finish(x: number, y: number, z: number): number {
  if (x >= CORE.x0 && x < CORE.x1 && z < CORE.z1) return M.PLASTER;
  return unitWall(levelOf(y), x < SPLIT ? 0 : 1);
}

function outerWall(x: number, y: number, z: number): number {
  return depthOf(x, z) >= T - 2 ? finish(x, y, z) : facade(x, y, z);
}

/** Foundation, outer walls, floor slabs, roof slab and the load-bearing inner walls. */
export function structure(b: Builder): void {
  b.fill(X0, G, Z0, X1, FLOOR0, Z1, M.CONCRETE);
  b.shell(X0 - 1, G, Z0 - 1, X1 + 1, FLOOR0 + 2, Z1 + 1, 1, M.CONCRETE_DARK);

  b.fill(X0, FLOOR0, Z0, X1, ROOF, Z0 + T, outerWall);
  b.fill(X0, FLOOR0, Z1 - T, X1, ROOF, Z1, outerWall);
  b.fill(X0, FLOOR0, Z0 + T, X0 + T, ROOF, Z1 - T, outerWall);
  b.fill(X1 - T, FLOOR0, Z0 + T, X1, ROOF, Z1 - T, outerWall);

  for (let k = 1; k < LEVELS; k++) {
    const y = floorY(k);
    b.fill(X0, y - 4, Z0, X1, y, Z1, M.CONCRETE);
    b.shell(X0 - 1, y - 3, Z0 - 1, X1 + 1, y - 1, Z1 + 1, 1, M.CONCRETE);
  }
  b.fill(X0, ROOF - ROOF_SLAB, Z0, X1, ROOF, Z1, M.CONCRETE);

  for (let k = 0; k < LEVELS; k++) {
    const y0 = floorY(k);
    const y1 = ceilY(k);
    const left = unitWall(k, 0);
    const right = unitWall(k, 1);
    b.fill(CORE.x0, y0, Z0 + T, CORE.x0 + 4, y1, CORE.z1, (x) =>
      x < CORE.x0 + 2 ? left : M.PLASTER,
    );
    b.fill(CORE.x1 - 4, y0, Z0 + T, CORE.x1, y1, CORE.z1, (x) =>
      x >= CORE.x1 - 2 ? right : M.PLASTER,
    );
    b.fill(CORE.x0, y0, CORE.back, CORE.x1, y1, CORE.z1, (x, _y, z) =>
      z < CORE.back + 2 ? M.PLASTER : x < SPLIT ? left : right,
    );
    b.fill(SPLIT - 2, y0, CORE.z1, SPLIT + 2, y1, Z1 - T, (x) =>
      x < SPLIT ? left : right,
    );
  }
  b.fill(
    SPLIT - 2,
    FLOOR0,
    CORE.land,
    SPLIT + 2,
    ROOF - ROOF_SLAB,
    CORE.mid,
    M.PLASTER,
  );
  for (let k = 1; k < LEVELS; k++) {
    const y = floorY(k);
    b.fill(CORE.x0 + 4, y - 4, CORE.land, SPLIT - 2, y, CORE.back, M.AIR);
    b.fill(SPLIT + 2, y - 4, CORE.land, CORE.x1 - 4, y, CORE.back, M.AIR);
  }
}

interface WindowStyle {
  frame: number;
  curtain: number;
  shutters: boolean;
  bars: boolean;
  box: boolean;
}

const CURTAINS = [
  M.AIR,
  M.AIR,
  M.FABRIC_YELLOW,
  M.RUG,
  M.SOFA,
  M.BED,
  M.FABRIC_GREEN,
  M.PILLOW,
] as const;

function lintel(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  y1: number,
): void {
  for (let u = u0 - 2; u < u1 + 2; u++)
    for (let dep = 0; dep < 2; dep++) {
      const [x, z] = wallPos(side, u, dep);
      for (let y = y1; y < y1 + 3; y++) b.put(x, y, z, M.CONCRETE);
    }
}

function windowAt(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
  st: WindowStyle,
): void {
  const um = Math.floor((u0 + u1) / 2);
  const yt = y1 - Math.floor((y1 - y0) / 3);
  lintel(b, side, u0, u1, y1);
  for (let u = u0; u < u1; u++)
    for (let y = y0; y < y1; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        const border = u < u0 + 2 || u >= u1 - 2 || y < y0 + 2 || y >= y1 - 2;
        const mullion = (u === um || u === um - 1) && y < yt;
        const transom = y === yt || y === yt - 1;
        if (border) b.put(x, y, z, st.frame);
        else if (dep === 2)
          b.put(x, y, z, mullion || transom ? st.frame : M.GLASS);
        else b.put(x, y, z, M.AIR);
      }
  for (let u = u0 - 2; u < u1 + 2; u++)
    for (const dep of [-1, -2, 0]) {
      const [x, z] = wallPos(side, u, dep);
      b.put(x, y0 - 1, z, M.CONCRETE);
      b.put(x, y0 - 2, z, M.CONCRETE);
    }
  if (st.curtain !== M.AIR) {
    const cw = Math.max(3, Math.floor((u1 - u0) / 5));
    for (const [a, c] of [
      [u0 + 2, u0 + 2 + cw],
      [u1 - 2 - cw, u1 - 2],
    ])
      for (let u = a; u < c; u++)
        for (let y = y0 + 3; y < y1 - 2; y++) {
          const [x, z] = wallPos(side, u, T - 1);
          b.put(x, y, z, st.curtain);
        }
  }
  if (st.shutters) {
    const hw = Math.floor((u1 - u0) / 2);
    for (const [a, c] of [
      [u0 - hw, u0],
      [u1, u1 + hw],
    ])
      for (let u = a; u < c; u++)
        for (let y = y0; y < y1; y++) {
          const [x, z] = wallPos(side, u, -1);
          const edge = u === a || u === c - 1 || y === y0 || y === y1 - 1;
          b.put(
            x,
            y,
            z,
            edge ? M.METAL_GREEN : y % 2 === 0 ? M.SIGN_GREEN : M.METAL_GREEN,
          );
        }
  }
  if (st.bars) {
    for (let u = u0; u < u1; u++)
      for (let y = y0 - 1; y <= y1; y++) {
        const [x, z] = wallPos(side, u, -1);
        if ((u - u0) % 4 === 1 || y === y0 - 1 || y === y1 || y === y0 + 12)
          b.put(x, y, z, M.FRAME_DARK);
      }
  }
  if (st.box) {
    for (let u = u0; u < u1; u++)
      for (let dep = -6; dep < -2; dep++) {
        const [x, z] = wallPos(side, u, dep);
        for (let y = y0 - 6; y < y0 - 2; y++)
          b.put(x, y, z, dep === -6 || y === y0 - 6 ? M.PLANKS_DARK : M.DIRT);
        const r = hash3(x, y0, z);
        if (dep > -6 && r < 0.75) {
          b.put(x, y0 - 2, z, r < 0.35 ? M.LEAVES_A : M.LEAVES_B);
          if (r < 0.3)
            b.put(
              x,
              y0 - 1,
              z,
              pick([M.FLOWER_RED, M.FLOWER_YELLOW, M.FLOWER_PURPLE], r / 0.3),
            );
        }
      }
    for (const u of [u0 + 2, u1 - 3])
      for (let dep = -6; dep < 0; dep++) {
        const [x, z] = wallPos(side, u, dep);
        b.put(x, y0 - 7, z, M.METAL);
      }
  }
}

/** Glazed balcony door: same frame as a window but reaching the floor, with a kick panel. */
function balconyDoor(
  b: Builder,
  side: Side,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
  curtain: number,
): void {
  const um = Math.floor((u0 + u1) / 2);
  lintel(b, side, u0, u1, y1);
  for (let u = u0; u < u1; u++)
    for (let y = y0; y < y1; y++)
      for (let dep = 0; dep < T; dep++) {
        const [x, z] = wallPos(side, u, dep);
        const border = u < u0 + 2 || u >= u1 - 2 || y >= y1 - 2;
        if (border) b.put(x, y, z, M.FRAME);
        else if (dep === 2) {
          const frame =
            u === um || u === um - 1 || y < y0 + 10 || y === y0 + 10;
          b.put(x, y, z, frame ? M.FRAME : M.GLASS);
        } else b.put(x, y, z, M.AIR);
      }
  for (const dep of [1, 3]) {
    const [x, z] = wallPos(side, um - 3, dep);
    b.put(x, y0 + 22, z, M.CHROME);
    const [x2, z2] = wallPos(side, um + 2, dep);
    b.put(x2, y0 + 22, z2, M.CHROME);
  }
  if (curtain !== M.AIR)
    for (let u = u0 + 2; u < u0 + 6; u++)
      for (let y = y0 + 2; y < y1 - 2; y++) {
        const [x, z] = wallPos(side, u, T - 1);
        b.put(x, y, z, curtain);
      }
}

/** Every opening of the facades except the entrance (built with the stair core). */
export function windows(b: Builder): void {
  for (let k = 0; k < LEVELS; k++) {
    const f = floorY(k);
    for (let s = 0; s < 2; s++) {
      const style = (salt: number, shutters: boolean): WindowStyle => {
        const r = hash3(k * 2 + s, salt, 5);
        return {
          frame: M.FRAME,
          curtain: pick(CURTAINS, r),
          shutters: shutters && k > 0,
          bars: k === 0,
          box: k > 0 && hash3(k * 2 + s, salt, 6) < 0.3,
        };
      };
      const [fa, fb] = flipX(s, 44, 72);
      windowAt(b, "front", fa, fb, f + 18, f + 46, {
        ...style(1, false),
        box: false,
      });
      const [na, nb] = flipX(s, 122, 142);
      windowAt(b, "front", na, nb, f + 18, f + 46, {
        ...style(2, false),
        box: false,
      });
      if (k === 0) {
        const [da, db] = flipX(s, 86, 114);
        windowAt(b, "front", da, db, f + 18, f + 46, style(3, false));
      } else {
        const [da, db] = flipX(s, 88, 112);
        balconyDoor(b, "front", da, db, f, f + 46, style(3, false).curtain);
      }
      const side: Side = s === 0 ? "west" : "east";
      windowAt(b, side, 356, 384, f + 18, f + 46, style(4, true));
      windowAt(b, side, 412, 440, f + 18, f + 46, style(5, true));
      windowAt(b, side, 500, 528, f + 22, f + 46, {
        ...style(6, true),
        curtain: M.AIR,
      });
      windowAt(b, side, 612, 644, f + 18, f + 46, style(7, true));
      const [ba, bb] = flipX(s, 56, 88);
      windowAt(b, "back", ba, bb, f + 18, f + 46, {
        ...style(8, false),
        box: s === 1 && k > 0,
      });
      const [sa, sb] = flipX(s, 132, 164);
      windowAt(b, "back", sa, sb, f + 18, f + 46, style(9, false));
    }
    if (k > 0)
      windowAt(b, "front", 162, 198, f + 8, f + 52, {
        frame: M.FRAME_DARK,
        curtain: M.AIR,
        shutters: false,
        bars: false,
        box: false,
      });
  }
}

/** Downpipes, outdoor AC units and a gas meter hung on the facades. */
export function facadeDetails(b: Builder): void {
  for (const [x, z] of [
    [X0 - 2, Z0 + 2],
    [X0 - 2, Z1 - 4],
    [X1, Z0 + 2],
    [X1, Z1 - 4],
  ]) {
    b.fill(x, G, z, x + 2, ROOF - 10, z + 2, M.METAL);
    for (let y = FLOOR0 + 30; y < ROOF - 10; y += 60)
      b.fill(x, y, z - 1, x + 2, y + 2, z + 3, M.FRAME_DARK);
    b.fill(x - 1, G, z - 1, x + 3, G + 1, z + 3, M.CONCRETE_DARK);
  }

  for (let k = 1; k < LEVELS; k++)
    for (let s = 0; s < 2; s++) {
      if (hash3(k, s, 21) > 0.45) continue;
      const f = floorY(k);
      const z0 = 452;
      const xOut = s === 0 ? X0 - 7 : X1;
      b.fill(xOut, f + 4, z0, xOut + 7, f + 16, z0 + 16, (x, y, z) =>
        (s === 0 ? x === xOut : x === xOut + 6) &&
        y > f + 5 &&
        y < f + 15 &&
        z > z0 + 1 &&
        z < z0 + 14
          ? (y + z) % 2 === 0
            ? M.METAL
            : M.FRAME_DARK
          : M.CAR_WHITE,
      );
      b.fill(xOut, f + 3, z0 + 2, xOut + 7, f + 4, z0 + 4, M.METAL);
      b.fill(xOut, f + 3, z0 + 12, xOut + 7, f + 4, z0 + 14, M.METAL);
    }

  b.fill(X0 - 5, G + 6, 600, X0, G + 22, 612, (_x, y, z) =>
    y === G + 14 || z === 606 ? M.METAL : M.METAL_YELLOW,
  );
  b.fill(X0 - 2, G, 605, X0, G + 6, 607, M.METAL);
}
