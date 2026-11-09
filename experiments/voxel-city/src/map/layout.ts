import { GROUND, vox } from "../engine/constants";

/** Ground level: first air layer above grass and road (voxels). */
export const G = GROUND;
/** Sidewalks are raised by 2 voxels: their walkable surface is G + 2. */
export const SIDEWALK_TOP = G + 2;

export interface Zone {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

function zone(x0: number, z0: number, x1: number, z1: number): Zone {
  return { x0: vox(x0), z0: vox(z0), x1: vox(x1), z1: vox(z1) };
}

/** Lots of the block, in voxels (converted from meters). The street runs along x. */
export const ZONES = {
  sidewalkSouth: zone(0, 0, 51.2, 3),
  road: zone(0, 3, 51.2, 11),
  sidewalkNorth: zone(0, 11, 51.2, 14),
  apartment: zone(0.5, 14, 17.5, 40),
  house: zone(17.5, 14, 34, 40),
  cafe: zone(34, 14, 51, 40),
  park: zone(0, 40, 51.2, 51.2),
} as const;
