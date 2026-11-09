import { type Builder, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { type Direction, facingToward, Local } from "./local";

/** Wooden slat bench on cast metal ends, centered on (x, z), the sitter looking toward `look`. */
export function bench(
  b: Builder,
  x: number,
  y: number,
  z: number,
  look: Direction,
  len = 32,
): void {
  const f = new Local(b, x, y, z, facingToward(look));
  const u0 = -Math.floor(len / 2);
  const u1 = u0 + len;
  const ends = [u0 + 2, u1 - 4];
  const frames = len >= 40 ? [...ends, -1] : ends;
  for (const u of frames) {
    f.fill(u, 0, -3, u + 2, 10, -2, M.METAL);
    f.fill(u, 0, 3, u + 2, 9, 4, M.METAL);
    f.fill(u, 8, -3, u + 2, 9, 4, M.METAL);
    f.fill(u, 9, -4, u + 2, 22, -3, M.METAL);
  }
  for (const u of ends) {
    f.fill(u, 9, 3, u + 2, 13, 4, M.METAL);
    f.fill(u, 13, -3, u + 2, 14, 5, M.METAL);
    f.fill(u - 1, 0, -4, u + 3, 1, -1, M.METAL);
    f.fill(u - 1, 0, 2, u + 3, 1, 5, M.METAL);
  }
  for (const [v0, v1] of [
    [-3, -1],
    [0, 2],
    [3, 5],
  ])
    f.fill(u0, 9, v0, u1, 10, v1, M.PLANKS);
  for (const h of [11, 14, 17, 20]) f.fill(u0, h, -5, u1, h + 2, -4, M.PLANKS);
}

export function bin(b: Builder, x: number, y: number, z: number): void {
  for (let dz = -4; dz <= 4; dz++)
    for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 3.7) continue;
      b.fill(x + dx, y, z + dz, x + dx + 1, y + 2, z + dz + 1, M.METAL);
      if (d > 2.6) {
        for (let h = 2; h < 17; h++)
          b.put(
            x + dx,
            y + h,
            z + dz,
            h === 9 || h === 10 ? M.METAL : M.METAL_GREEN,
          );
        b.put(x + dx, y + 17, z + dz, M.CHROME);
      } else if (hash3(x + dx, y, z + dz) < 0.6) {
        const trash = [M.PRODUCT_RED, M.PRODUCT_BLUE, M.PILLOW];
        b.put(
          x + dx,
          y + 2,
          z + dz,
          trash[Math.floor(hash3(dx, 9, dz + x) * 3)],
        );
        if (hash3(x, dx, dz) < 0.4)
          b.put(x + dx, y + 3, z + dz, M.PRODUCT_ORANGE);
      }
    }
}

export function parkLamp(b: Builder, x: number, y: number, z: number): void {
  b.cylinder(x, z, 2.9, y, y + 5, M.METAL_GREEN);
  b.cylinder(x, z, 2.1, y + 5, y + 8, M.METAL_GREEN);
  b.cylinder(x, z, 1.5, y + 8, y + 62, M.METAL_GREEN);
  b.cylinder(x, z, 2.1, y + 30, y + 32, M.METAL_GREEN);
  b.cylinder(x, z, 2.1, y + 58, y + 62, M.METAL_GREEN);
  b.fill(x - 3, y + 62, z - 3, x + 4, y + 64, z + 4, M.METAL);
  b.fill(x - 3, y + 64, z - 3, x + 4, y + 73, z + 4, (px, _py, pz) =>
    Math.abs(px - x) === 3 && Math.abs(pz - z) === 3 ? M.METAL : M.LAMP,
  );
  b.fill(x - 4, y + 73, z - 4, x + 5, y + 75, z + 5, M.METAL);
  b.fill(x - 2, y + 75, z - 2, x + 3, y + 77, z + 3, M.METAL);
  b.fill(x - 1, y + 77, z - 1, x + 2, y + 79, z + 2, M.METAL);
  b.fill(x, y + 79, z, x + 1, y + 82, z + 1, M.BRASS);
}

/** Tall street light whose arm reaches over the road toward `toward`. */
export function streetLamp(
  b: Builder,
  x: number,
  y: number,
  z: number,
  toward: Direction,
): void {
  b.cylinder(x, z, 3.2, y, y + 4, M.CONCRETE_DARK);
  b.cylinder(x, z, 2.4, y + 4, y + 14, M.METAL);
  b.cylinder(x, z, 1.5, y + 14, y + 126, M.METAL);
  const f = new Local(b, x, y, z, facingToward(toward));
  f.fill(-1, 20, 2, 2, 30, 3, M.METAL);
  f.line(0, 122, 0, 0, 129, 8, 1, M.METAL);
  f.line(0, 129, 8, 0, 131, 30, 1, M.METAL);
  f.fill(-4, 129, 26, 5, 133, 44, M.METAL);
  f.fill(-3, 133, 28, 4, 134, 40, M.METAL);
  f.fill(-3, 128, 28, 4, 129, 42, M.LAMP);
}
