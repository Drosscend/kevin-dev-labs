import { type Builder, hash3, type Mat } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";

/** Building footprint (voxels, half-open). The front faces -z, toward the street. */
export const X0 = 30;
export const X1 = 330;
export const Z0 = 330;
export const Z1 = 690;
/** Outer wall thickness. */
export const T = 6;
/** The east unit is the west unit reflected: x -> FLIP_X - 1 - x. */
export const FLIP_X = X0 + X1;
/** Center of the party wall between the two units of a level. */
export const SPLIT = 180;

export const FLOOR0 = G + 6;
const STOREY = 60;
export const LEVELS = 5;
export const ROOF = FLOOR0 + STOREY * LEVELS;
export const ROOF_SLAB = 6;

/** Walkable surface of level `k`. */
export function floorY(k: number): number {
  return FLOOR0 + STOREY * k;
}

/** Underside of the slab above level `k`. */
export function ceilY(k: number): number {
  return k === LEVELS - 1 ? ROOF - ROOF_SLAB : floorY(k + 1) - 4;
}

export function levelOf(y: number): number {
  return Math.max(0, Math.min(LEVELS - 1, Math.floor((y - FLOOR0) / STOREY)));
}

/** Range [a, c) along x for side `s` (0 west, 1 east). */
export function flipX(s: number, a: number, c: number): [number, number] {
  return s === 0 ? [a, c] : [FLIP_X - c, FLIP_X - a];
}

/** Stair core: side walls at x 150..154 and 206..210, from the front wall to z 470. */
export const CORE = {
  x0: 150,
  x1: 210,
  z1: 470,
  /** Floor landing spans z 336..land. */
  land: 366,
  /** Flights run between land and mid; the half landing spans mid..back. */
  mid: 426,
  back: 466,
} as const;

const WALL_FINISHES = [
  M.WALLPAPER,
  M.WALLPAPER_WARM,
  M.PLASTER,
  M.PLASTER_BLUE,
  M.PLASTER_GREEN,
  M.PLASTER_PINK,
  M.WALLPAPER,
  M.PLASTER_YELLOW,
] as const;

export function unitWall(k: number, s: number): number {
  return pick(WALL_FINISHES, hash3(k, s, 11));
}

export type Side = "front" | "back" | "west" | "east";

/** World (x, z) of a facade point: `u` runs along the wall, `dep` goes inward from the outer face. */
export function wallPos(side: Side, u: number, dep: number): [number, number] {
  switch (side) {
    case "front":
      return [u, Z0 + dep];
    case "back":
      return [u, Z1 - 1 - dep];
    case "west":
      return [X0 + dep, u];
    case "east":
      return [X1 - 1 - dep, u];
  }
}

/** One apartment: level `k`, side `s`. Local coordinates are those of the west unit. */
export interface Unit {
  k: number;
  s: number;
  /** Floor surface (world y). */
  f: number;
  /** Ceiling height above the floor. */
  h: number;
  wall: number;
  rnd(salt: number): number;
  /** Fill in local coordinates, y relative to the floor. */
  box(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    m: Mat,
  ): void;
}

export function makeUnit(b: Builder, k: number, s: number): Unit {
  const f = floorY(k);
  return {
    k,
    s,
    f,
    h: ceilY(k) - f,
    wall: unitWall(k, s),
    rnd: (salt) => hash3(k * 2 + s, salt, 97),
    box(x0, y0, z0, x1, y1, z1, m) {
      const [a, c] = flipX(s, x0, x1);
      b.fill(a, f + y0, z0, c, f + y1, z1, m);
    },
  };
}

export function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}
