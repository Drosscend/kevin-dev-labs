import { brick } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";

/** Building footprint (voxels, half-open). The storefront faces -z. */
export const BX0 = 736;
export const BX1 = 1012;
export const BZ0 = 350;
export const BZ1 = 570;
/** Outer wall thickness. */
export const T = 6;

export const Y_FLOOR = G + 4;
export const Y_SLAB = G + 76;
export const Y_UPPER = G + 82;
export const Y_ROOF = G + 140;
/** First air layer above the roof membrane. */
export const Y_ROOF_TOP = Y_ROOF + 6;
export const Y_PARAPET = Y_ROOF + 18;

/** Café / shop partition wall, x in [X_SPLIT, X_SPLIT + 6). */
export const X_SPLIT = 876;
/** Café main room / kitchen partition, z in [Z_KITCHEN, Z_KITCHEN + 4). */
export const Z_KITCHEN = 500;
/** Upper flat: front living area / back rooms partition. */
export const Z_FLAT = 470;

/** Inner faces of the outer walls. */
export const IX0 = BX0 + T;
export const IX1 = BX1 - T;
export const IZ0 = BZ0 + T;
export const IZ1 = BZ1 - T;

export type Side = "front" | "back" | "west" | "east";

/** World (x, z) of a point `u` along a wall and `dep` voxels deep from its outer face (negative is outside). */
export function wallPos(side: Side, u: number, dep: number): [number, number] {
  switch (side) {
    case "front":
      return [u, BZ0 + dep];
    case "back":
      return [u, BZ1 - 1 - dep];
    case "west":
      return [BX0 + dep, u];
    case "east":
      return [BX1 - 1 - dep, u];
  }
}

/** Interior wall finish depending on the room. */
export function finish(x: number, y: number, z: number): number {
  if (y >= Y_UPPER) {
    if (x >= 836 && x < 900 && z >= Z_FLAT + 4)
      return y < Y_UPPER + 30 ? M.TILE_WHITE : M.WALLPAPER;
    return y === Y_UPPER + 4 ? M.PLANKS_DARK : M.WALLPAPER;
  }
  if (x < X_SPLIT) {
    if (z >= Z_KITCHEN) return M.TILE_WHITE;
    if (y < G + 24) return (x + z) % 8 === 0 ? M.PLANKS : M.PLANKS_DARK;
    if (y === G + 24) return M.WOOD_LIGHT;
    return M.WALLPAPER_WARM;
  }
  return y < Y_FLOOR + 3 ? M.CONCRETE_DARK : M.PLASTER;
}

/** Outer facade: concrete plinth, stone quoins at the corners, brick elsewhere. */
export function facade(u: number, y: number, cornerDist: number): number {
  if (y < G + 8)
    return y === G + 7 || u % 24 === 0 ? M.CONCRETE : M.CONCRETE_DARK;
  const row = Math.floor((y - G - 8) / 8);
  const len = row % 2 === 0 ? 14 : 9;
  if (cornerDist < len)
    return (y - G - 8) % 8 === 7 || cornerDist === len - 1 ? M.MORTAR : M.STONE;
  return brick(u, y);
}
