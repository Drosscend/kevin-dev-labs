import { type Builder, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { CORE, ceilY, FLOOR0, floorY, LEVELS, SPLIT, Z0 } from "./plan";

const LX0 = CORE.x0 + 4;
const LX1 = CORE.x1 - 4;
const IN_Z = Z0 + 6;

const terrazzo = (x: number, y: number, z: number) => {
  const r = hash3(x, y, z);
  return r < 0.08 ? M.STONE : r < 0.12 ? M.BRICK_C : M.MARBLE;
};

/** Switchback stairs on every level, landings, lobby, entrance and the top-floor railing. */
export function stairCore(b: Builder): void {
  b.fill(LX0, FLOOR0 - 1, IN_Z, LX1, FLOOR0, CORE.back, terrazzo);
  for (let k = 0; k < LEVELS; k++) {
    const f = floorY(k);
    b.fill(LX0, f - 1, IN_Z, LX1, f, CORE.land, terrazzo);
    b.fill(SPLIT - 3, ceilY(k) - 3, 348, SPLIT + 3, ceilY(k), 354, M.LAMP);
    b.fill(SPLIT - 4, ceilY(k) - 1, 347, SPLIT + 4, ceilY(k), 355, M.CHROME);
    if (k === LEVELS - 1) continue;
    for (let i = 0; i < 5; i++) {
      const top = f + 6 * (i + 1);
      const z0 = CORE.land + 12 * i;
      b.fill(
        LX0,
        Math.max(f, top - 10),
        z0,
        SPLIT - 2,
        top - 1,
        z0 + 12,
        M.CONCRETE,
      );
      b.fill(LX0, top - 1, z0, SPLIT - 2, top, z0 + 12, M.MARBLE);
      b.fill(LX0, top - 1, z0, SPLIT - 2, top, z0 + 1, M.FRAME_DARK);
    }
    b.fill(LX0, f + 24, CORE.mid, LX1, f + 29, CORE.back, M.CONCRETE);
    b.fill(LX0, f + 29, CORE.mid, LX1, f + 30, CORE.back, terrazzo);
    for (let j = 0; j < 5; j++) {
      const top = f + 30 + 6 * (j + 1);
      const z1 = CORE.mid - 12 * j;
      b.fill(SPLIT + 2, top - 10, z1 - 12, LX1, top - 1, z1, M.CONCRETE);
      b.fill(SPLIT + 2, top - 1, z1 - 12, LX1, top, z1, M.MARBLE);
      b.fill(SPLIT + 2, top - 1, z1 - 1, LX1, top, z1, M.FRAME_DARK);
    }
    for (let z = CORE.land; z < CORE.mid; z++) {
      const upA = f + 6 * (Math.floor((z - CORE.land) / 12) + 1);
      const upB = f + 30 + 6 * (Math.floor((CORE.mid - 1 - z) / 12) + 1);
      b.fill(LX0, upA + 17, z, LX0 + 1, upA + 19, z + 1, M.PLANKS_DARK);
      b.fill(SPLIT - 3, upA + 17, z, SPLIT - 2, upA + 19, z + 1, M.PLANKS_DARK);
      b.fill(SPLIT + 2, upB + 17, z, SPLIT + 3, upB + 19, z + 1, M.PLANKS_DARK);
      b.fill(LX1 - 1, upB + 17, z, LX1, upB + 19, z + 1, M.PLANKS_DARK);
    }
    b.fill(
      SPLIT - 2,
      f + 44,
      CORE.back - 1,
      SPLIT + 2,
      f + 48,
      CORE.back,
      M.LAMP,
    );
  }
  const top = floorY(LEVELS - 1);
  b.fill(LX0, top + 20, CORE.land - 1, SPLIT - 2, top + 22, CORE.land, M.METAL);
  for (let x = LX0; x < SPLIT - 2; x += 4)
    b.fill(x, top, CORE.land - 1, x + 1, top + 20, CORE.land, M.METAL);

  lobby(b);
  entrance(b);
}

function lobby(b: Builder): void {
  const f = FLOOR0;
  const x0 = LX1 - 4;
  b.fill(x0, f + 12, 372, LX1, f + 36, 400, (_x, y, z) => {
    const ly = y - f - 12;
    const lz = z - 372;
    if (ly === 0 || ly === 23 || lz === 0 || lz === 27 || lz === 14)
      return M.FRAME_DARK;
    if (ly % 5 === 0) return M.FRAME_DARK;
    if (ly % 5 === 2 && lz % 14 > 4 && lz % 14 < 10) return M.BRASS;
    return M.METAL;
  });
  b.fill(x0 - 1, f + 12, 372, x0, f + 13, 400, M.FRAME_DARK);
  b.fill(168, f, 338, 192, f + 1, 350, (x, _y, z) =>
    x === 168 || x === 191 || z === 338 || z === 349 ? M.RUBBER : M.RUG,
  );
  b.fill(LX0, f + 30, 336, LX0 + 8, f + 44, 337, M.PLANKS_DARK);
  b.fill(LX0 + 1, f + 31, 336, LX0 + 7, f + 43, 337, M.PLASTER);
  b.fill(LX0 + 2, f + 36, 336, LX0 + 5, f + 41, 337, M.FABRIC_YELLOW);
}

function entrance(b: Builder): void {
  const f = FLOOR0;
  const ux0 = 164;
  const ux1 = 196;
  const mid = 180;
  for (let x = ux0; x < ux1; x++)
    for (let y = f; y < f + 52; y++)
      for (let z = Z0; z < Z0 + 6; z++) {
        const border = x < ux0 + 2 || x >= ux1 - 2 || y >= f + 50;
        const bar = y === f + 42 || y === f + 43 || x === mid - 1 || x === mid;
        if (border) b.put(x, y, z, M.FRAME_DARK);
        else if (z === Z0 + 2) {
          if (bar) b.put(x, y, z, M.FRAME_DARK);
          else if (x > mid && y < f + 42) b.put(x, y, z, M.AIR);
          else
            b.put(
              x,
              y,
              z,
              y < f + 3 || x === ux0 + 2 || x === mid - 2
                ? M.FRAME_DARK
                : M.GLASS,
            );
        } else b.put(x, y, z, M.AIR);
      }
  for (const z of [Z0 + 1, Z0 + 3])
    b.fill(ux0 + 4, f + 22, z, mid - 3, f + 23, z + 1, M.CHROME);
  b.fill(ux1 - 4, f, IN_Z, ux1 - 2, f + 42, IN_Z + 14, (_x, y, z) =>
    y < f + 3 || y > f + 39 || z === IN_Z + 13 ? M.FRAME_DARK : M.GLASS,
  );
  b.fill(ux1 - 5, f + 22, IN_Z + 3, ux1 - 4, f + 23, IN_Z + 11, M.CHROME);

  b.fill(ux1 + 9, f + 22, Z0 - 1, ux1 + 14, f + 34, Z0, M.CHROME);
  for (let y = f + 24; y < f + 33; y += 3) b.put(ux1 + 11, y, Z0 - 2, M.BRASS);
  b.fill(ux1 + 8, f + 38, Z0 - 1, ux1 + 14, f + 42, Z0, M.SIGN_GREEN);
  b.fill(ux1 + 9, f + 39, Z0 - 2, ux1 + 13, f + 41, Z0 - 1, M.PILLOW);
  for (const x of [ux0 - 6, ux1 + 4]) {
    b.fill(x, f + 30, Z0 - 3, x + 2, f + 31, Z0, M.METAL);
    b.fill(x - 1, f + 26, Z0 - 5, x + 3, f + 31, Z0 - 2, M.LAMP);
    b.fill(x - 1, f + 31, Z0 - 5, x + 3, f + 32, Z0 - 2, M.METAL);
  }

  const cy = floorY(1) - 10;
  b.fill(LX0, cy, Z0 - 22, LX1, cy + 4, Z0, M.CONCRETE);
  b.fill(LX0, cy - 1, Z0 - 22, LX1, cy, Z0 - 21, M.FRAME_DARK);
  b.fill(LX0, cy + 4, Z0 - 22, LX1, cy + 5, Z0, M.METAL);
  for (const x of [LX0 + 2, LX1 - 3])
    b.line(x, cy + 4, Z0 - 20, x, cy + 26, Z0, 1, M.METAL);
  for (const x of [170, 190])
    b.fill(x, cy - 1, Z0 - 12, x + 2, cy, Z0 - 10, M.LAMP);
  const digits = ["010110010010111", "111001111100111"];
  digits.forEach((bits, d) => {
    const xd = 182 - d * 5;
    for (let i = 0; i < 15; i++)
      if (bits[i] === "1")
        b.put(xd + 2 - (i % 3), cy + 3 - Math.floor(i / 3), Z0 - 23, M.BRASS);
  });
}
