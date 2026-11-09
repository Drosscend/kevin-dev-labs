import { CHUNK_COUNT, CHUNKS_X, CHUNKS_Z, GROUND, SIZE_Y } from "./constants";
import type { World } from "./world";

const Z_STEP = 1 << 10;
const Y_STEP = 1 << 20;
const MAX_CLUSTER = 3_000_000;
/** Voxels below the grass layer are solid terrain: anything touching them is supported. */
export const SUPPORT_Y = GROUND - 1;

const stamps: (Uint32Array | null)[] = new Array(CHUNK_COUNT).fill(null);
let searchId = 0;
let stack = new Int32Array(1 << 16);

/**
 * Groups of solid voxels reachable from `seeds` (packed indices) that no longer touch the terrain.
 * Depth-first with the downward neighbour explored first, so supported structures exit early.
 */
export function findFloatingClusters(
  world: World,
  seeds: Iterable<number>,
): Int32Array[] {
  const chunks = world.chunks;
  const passStart = searchId + 1;
  const clusters: Int32Array[] = [];
  const members: number[] = [];

  const chunkOf = (i: number) =>
    ((i & 1023) >> 5) +
    CHUNKS_X * (((i >> 10) & 1023) >> 5) +
    CHUNKS_X * CHUNKS_Z * ((i >>> 20) >> 5);
  const localOf = (i: number) =>
    (i & 31) | (((i >> 10) & 31) << 5) | (((i >>> 20) & 31) << 10);
  const material = (i: number) => {
    const c = chunks[chunkOf(i)];
    return c === null ? 0 : c[localOf(i)];
  };
  const stampArray = (ci: number) => {
    let s = stamps[ci];
    if (s === null) {
      s = new Uint32Array(32768);
      stamps[ci] = s;
    }
    return s;
  };

  for (const seed of seeds) {
    if (material(seed) === 0) continue;
    const seedStamps = stampArray(chunkOf(seed));
    if (seedStamps[localOf(seed)] >= passStart) continue;
    const id = ++searchId;
    seedStamps[localOf(seed)] = id;
    stack[0] = seed;
    let top = 1;
    let supported = false;
    members.length = 0;

    const visit = (n: number): boolean => {
      const c = chunks[chunkOf(n)];
      if (c === null) return false;
      const li = localOf(n);
      if (c[li] === 0) return false;
      const st = stampArray(chunkOf(n));
      const s = st[li];
      if (s === id) return false;
      if (s >= passStart) return true;
      st[li] = id;
      if (top >= stack.length) {
        const bigger = new Int32Array(stack.length * 2);
        bigger.set(stack);
        stack = bigger;
      }
      stack[top++] = n;
      return false;
    };

    while (top > 0) {
      const i = stack[--top];
      members.push(i);
      if (i >>> 20 < SUPPORT_Y || members.length > MAX_CLUSTER) {
        supported = true;
        break;
      }
      const x = i & 1023;
      const z = (i >> 10) & 1023;
      const y = i >>> 20;
      if (
        (y + 1 < SIZE_Y && visit(i + Y_STEP)) ||
        (x < 1023 && visit(i + 1)) ||
        (x > 0 && visit(i - 1)) ||
        (z < 1023 && visit(i + Z_STEP)) ||
        (z > 0 && visit(i - Z_STEP)) ||
        (y > 0 && visit(i - Y_STEP))
      ) {
        supported = true;
        break;
      }
    }
    if (!supported) clusters.push(Int32Array.from(members));
  }
  return clusters;
}
