import { type Builder, brick, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";

export function fountain(b: Builder, cx: number, cz: number): void {
  for (let dz = -41; dz <= 41; dz++)
    for (let dx = -41; dx <= 41; dx++) {
      const d = Math.hypot(dx, dz);
      const x = cx + dx;
      const z = cz + dz;
      if (d < 35) {
        b.put(x, G - 3, z, M.STONE);
        b.fill(x, G - 2, z, x + 1, G + 5, z + 1, M.WATER);
      } else if (d < 40) {
        const u = Math.round(Math.atan2(dz, dx) * 40);
        for (let y = G - 3; y < G + 7; y++)
          b.put(x, y, z, brick(u, y, [M.STONE, M.BRICK_GREY]));
      }
      if (d >= 34 && d < 41) b.fill(x, G + 7, z, x + 1, G + 9, z + 1, M.MARBLE);
    }

  b.cylinder(cx, cz, 8.5, G - 2, G + 8, M.MARBLE);
  b.cylinder(cx, cz, 5.5, G + 8, G + 22, M.MARBLE);
  b.cylinder(cx, cz, 7, G + 14, G + 16, M.MARBLE);
  bowl(b, cx, cz, G + 22, 7, 2, 5);
  b.cylinder(cx, cz, 3, G + 27, G + 40, M.MARBLE);
  b.cylinder(cx, cz, 4, G + 33, G + 35, M.MARBLE);
  bowl(b, cx, cz, G + 40, 4, 1.5, 4);
  b.cylinder(cx, cz, 1.5, G + 44, G + 48, M.MARBLE);
  b.sphere(cx, G + 49, cz, 2.2, M.MARBLE);
  b.cylinder(cx, cz, 1, G + 51, G + 58, M.WATER);
  b.sphere(cx, G + 58, cz, 2, M.WATER);

  for (const [dx, dz] of [
    [9, 0],
    [0, 9],
    [-9, 0],
    [0, -9],
    [7, 6],
    [-6, 7],
    [-7, -6],
    [6, -7],
  ])
    b.fill(cx + dx, G + 27, cz + dz, cx + dx + 1, G + 44, cz + dz + 1, M.WATER);
  for (const [dx, dz] of [
    [15, 0],
    [0, 15],
    [-15, 0],
    [0, -15],
    [11, 11],
    [-11, 11],
    [-11, -11],
    [11, -11],
  ])
    b.fill(cx + dx, G + 5, cz + dz, cx + dx + 1, G + 27, cz + dz + 1, M.WATER);
}

/** Flaring marble bowl starting at y0, holding water in its top two layers. */
function bowl(
  b: Builder,
  cx: number,
  cz: number,
  y0: number,
  r0: number,
  flare: number,
  layers: number,
): void {
  const rTop = r0 + flare * (layers - 1);
  for (let k = 0; k < layers; k++) {
    const r = r0 + flare * k;
    const water = k >= layers - 2;
    b.cylinder(cx, cz, r, y0 + k, y0 + k + 1, (x, _y, z) =>
      water && Math.hypot(x - cx, z - cz) < rTop - 2 ? M.WATER : M.MARBLE,
    );
  }
}

export function pond(
  b: Builder,
  cx: number,
  cz: number,
  rx: number,
  rz: number,
): void {
  const shape = (x: number, z: number) => {
    const dx = (x - cx) / rx;
    const dz = (z - cz) / rz;
    const a = Math.atan2(dz, dx);
    return (
      (dx * dx + dz * dz) *
      (1 + 0.12 * Math.sin(a * 3 + 1) + 0.06 * Math.sin(a * 7))
    );
  };
  for (let z = cz - rz - 12; z <= cz + rz + 12; z++)
    for (let x = cx - rx - 12; x <= cx + rx + 12; x++) {
      const e = shape(x, z);
      if (e < 1) {
        const depth = 2 + Math.floor(5 * (1 - e));
        b.fill(x, G - 1 - depth, z, x + 1, G, z + 1, M.WATER);
        b.put(
          x,
          G - 2 - depth,
          z,
          hash3(x >> 2, 3, z >> 2) < 0.3 ? M.GRAVEL : M.SAND,
        );
        if (e > 0.8 && z > cz && hash3(x, 51, z) < 0.1) reed(b, x, z);
      } else if (e < 1.25) {
        b.fill(x, G - 4, z, x + 1, G, z + 1, M.STONE);
        const rock = hash3(x >> 2, 52, z >> 2);
        if (rock < 0.45) b.put(x, G, z, M.STONE);
        if (rock < 0.15 && hash3(x, 53, z) < 0.7) b.put(x, G + 1, z, M.STONE);
      } else if (e < 1.4 && hash3(x, 54, z) < 0.3) b.put(x, G, z, M.GRASS_DARK);
    }

  for (const [dx, dz] of [
    [-30, 8],
    [-22, 16],
    [18, 12],
    [26, -4],
    [8, 20],
    [-8, -12],
  ])
    lilyPad(b, cx + dx, cz + dz);
  duck(b, cx - 12, cz + 2, 1);
  duck(b, cx + 4, cz + 8, -1);
  pier(b, cx - 8, cz - rz - 8, cz - 6);
}

function reed(b: Builder, x: number, z: number): void {
  const h = 5 + Math.floor(hash3(x, 55, z) * 7);
  for (let k = 0; k < h; k++) b.put(x, G + k, z, M.LEAVES_B);
  if (hash3(x, 56, z) < 0.5) {
    b.put(x, G + h, z, M.TRUNK);
    b.put(x, G + h + 1, z, M.TRUNK);
  }
}

function lilyPad(b: Builder, cx: number, cz: number): void {
  for (let dz = -3; dz <= 3; dz++)
    for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 2.8 || (dx > 0 && Math.abs(dz) < 1)) continue;
      b.put(cx + dx, G, cz + dz, M.LEAVES_A);
    }
  if (hash3(cx, 57, cz) < 0.6) {
    b.put(cx - 1, G + 1, cz, M.FLOWER_PURPLE);
    b.put(cx - 1, G + 2, cz, M.FLOWER_YELLOW);
  }
}

function duck(b: Builder, x: number, z: number, dir: 1 | -1): void {
  b.fill(x - 3, G, z - 1, x + 4, G + 2, z + 2, M.TRUNK);
  b.fill(x - 2, G + 2, z - 1, x + 2, G + 3, z + 2, M.TRUNK);
  b.put(x - 3 * dir, G + 2, z, M.TRUNK);
  const hx = x + 3 * dir;
  b.put(hx, G + 2, z, M.FLOWER_WHITE);
  b.fill(hx, G + 3, z, hx + 1, G + 5, z + 1, M.DUCK_GREEN);
  b.put(hx, G + 3, z + 1, M.DUCK_GREEN);
  b.put(hx + dir, G + 4, z, M.FLOWER_YELLOW);
}

function pier(b: Builder, x0: number, z0: number, z1: number): void {
  const x1 = x0 + 16;
  for (const x of [x0 + 1, x1 - 2])
    b.fill(x, G - 1, z0, x + 1, G, z1, M.PLANKS_DARK);
  for (let z = z0; z < z1; z++)
    if ((z - z0) % 4 !== 3) b.fill(x0, G, z, x1, G + 1, z + 1, M.PLANKS);
  for (let z = z0 + 6; z < z1; z += 8)
    for (const x of [x0 + 1, x1 - 2])
      b.fill(x, G - 7, z, x + 1, G - 1, z + 1, M.PLANKS_DARK);
  for (const x of [x0, x1 - 1]) {
    for (let z = z0; z < z1; z += 6)
      b.fill(x, G + 1, z, x + 1, G + 10, z + 1, M.PLANKS_DARK);
    b.fill(x, G + 10, z0, x + 1, G + 11, z1, M.PLANKS);
  }
}
