export const VOXEL = 0.05;
export const CHUNK = 32;
export const SIZE_X = 1024;
export const SIZE_Y = 352;
export const SIZE_Z = 1024;
export const CHUNKS_X = SIZE_X / CHUNK;
export const CHUNKS_Y = SIZE_Y / CHUNK;
export const CHUNKS_Z = SIZE_Z / CHUNK;
export const CHUNK_COUNT = CHUNKS_X * CHUNKS_Y * CHUNKS_Z;

/** First air layer above the ground slab, in voxels. */
export const GROUND = 20;

/** Converts meters to a whole number of voxels. */
export function vox(meters: number): number {
  return Math.round(meters / VOXEL);
}

/** Packs voxel coordinates into one integer (x and z on 10 bits, y above). */
export function pack(x: number, y: number, z: number): number {
  return x | (z << 10) | (y << 20);
}

export function unpackX(i: number): number {
  return i & 1023;
}

export function unpackZ(i: number): number {
  return (i >> 10) & 1023;
}

export function unpackY(i: number): number {
  return i >>> 20;
}

/** Coarse cells (4^3 voxels) used for structural queries. */
export const CELL = 4;
export const CELLS_X = SIZE_X / CELL;
export const CELLS_Y = SIZE_Y / CELL;
export const CELLS_Z = SIZE_Z / CELL;
export const CELL_COUNT = CELLS_X * CELLS_Y * CELLS_Z;
