import { type Builder, brick, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { ROOF, ROOF_SLAB, X0, X1, Z0, Z1 } from "./plan";

/** Cornice, parapet, skylight and the clutter of a flat city roof. Nothing rises above y 344. */
export function roof(b: Builder): void {
  b.fill(X0 + 4, ROOF - 1, Z0 + 4, X1 - 4, ROOF, Z1 - 4, (x, _y, z) =>
    hash3(x >> 2, 9, z >> 2) < 0.1 || hash3(x, 9, z) < 0.06
      ? M.GRAVEL
      : M.ROOF_TAR,
  );
  b.shell(
    X0 - 3,
    ROOF - 10,
    Z0 - 3,
    X1 + 3,
    ROOF - 4,
    Z1 + 3,
    4,
    (x, y, z, d) =>
      d < 3 && y < ROOF - 8 && (x + z) % 4 < 2 ? M.AIR : M.CONCRETE,
  );
  b.shell(X0, ROOF, Z0, X1, ROOF + 8, Z1, 4, (x, y, z) => brick(x + z, y));
  b.shell(X0 - 1, ROOF + 8, Z0 - 1, X1 + 1, ROOF + 10, Z1 + 1, 6, M.CONCRETE);

  skylight(b);
  waterTank(b, 100, 420);
  acUnit(b, 56, 600);
  acUnit(b, 84, 600);
  acUnit(b, 244, 396);
  chimney(b, 40, 520);
  chimney(b, X1 - 16, 520);
  antenna(b, 292, 460);
  dish(b, 244, 470);
  for (const z of [560, 592, 624]) solarRow(b, 222, 318, z);
  hatch(b, 200, 520);
  for (const [x, z] of [
    [130, 520],
    [150, 640],
    [60, 380],
    [270, 520],
  ])
    vent(b, x, z);
  for (const [x, z] of [
    [X0 + 4, Z0 + 4],
    [X1 - 8, Z0 + 4],
    [X0 + 4, Z1 - 8],
    [X1 - 8, Z1 - 8],
  ])
    b.fill(x, ROOF - 1, z, x + 4, ROOF, z + 4, (xx, _y, zz) =>
      (xx + zz) % 2 === 0 ? M.METAL : M.FRAME_DARK,
    );
}

function skylight(b: Builder): void {
  const x0 = 158;
  const x1 = 202;
  const z0 = 370;
  const z1 = 462;
  b.fill(x0, ROOF - ROOF_SLAB, z0, x1, ROOF + 3, z1, M.AIR);
  b.shell(
    x0 - 2,
    ROOF - ROOF_SLAB,
    z0 - 2,
    x1 + 2,
    ROOF + 3,
    z1 + 2,
    2,
    M.CONCRETE,
  );
  b.fill(x0, ROOF + 2, z0, x1, ROOF + 3, z1, (x, _y, z) =>
    (x - x0) % 11 === 0 || (z - z0) % 12 === 0 ? M.FRAME_DARK : M.GLASS,
  );
}

function waterTank(b: Builder, cx: number, cz: number): void {
  for (const [dx, dz] of [
    [-9, -9],
    [7, -9],
    [-9, 7],
    [7, 7],
  ])
    b.fill(cx + dx, ROOF, cz + dz, cx + dx + 2, ROOF + 5, cz + dz + 2, M.METAL);
  b.fill(cx - 11, ROOF + 5, cz - 11, cx + 11, ROOF + 6, cz + 11, M.PLANKS_DARK);
  b.cylinder(cx, cz, 10, ROOF + 6, ROOF + 15, (x, y, z) => {
    const r = Math.hypot(x - cx, z - cz);
    if (r > 9 && (y === ROOF + 8 || y === ROOF + 13)) return M.METAL;
    return (x + z) % 4 === 0 ? M.PLANKS_DARK : M.PLANKS;
  });
  b.cylinder(cx, cz, 9, ROOF + 15, ROOF + 16, M.ROOF_SLATE);
  b.cylinder(cx, cz, 6, ROOF + 16, ROOF + 17, M.ROOF_SLATE);
  b.cylinder(cx, cz, 3, ROOF + 17, ROOF + 18, M.ROOF_SLATE);
  b.put(cx, ROOF + 18, cz, M.METAL);
  for (let y = ROOF + 1; y < ROOF + 15; y += 2)
    b.fill(cx - 2, y, cz - 11, cx + 3, y + 1, cz - 10, M.METAL);
  b.fill(cx - 2, ROOF, cz - 11, cx - 1, ROOF + 15, cz - 10, M.METAL);
  b.fill(cx + 2, ROOF, cz - 11, cx + 3, ROOF + 15, cz - 10, M.METAL);
}

function acUnit(b: Builder, x: number, z: number): void {
  b.fill(x, ROOF, z + 2, x + 20, ROOF + 2, z + 4, M.METAL);
  b.fill(x, ROOF, z + 12, x + 20, ROOF + 2, z + 14, M.METAL);
  b.fill(x, ROOF + 2, z, x + 20, ROOF + 14, z + 16, (xx, y, zz) =>
    zz === z &&
    y > ROOF + 3 &&
    y < ROOF + 12 &&
    xx > x &&
    xx < x + 19 &&
    y % 2 === 0
      ? M.METAL
      : M.CAR_WHITE,
  );
  for (const fx of [x + 5, x + 14])
    b.cylinder(fx, z + 8, 4, ROOF + 13, ROOF + 14, (xx, _y, zz) => {
      const r = Math.hypot(xx - fx, zz - z - 8);
      return r < 1 ? M.CHROME : r > 3.2 ? M.METAL : M.FRAME_DARK;
    });
  b.fill(x + 20, ROOF + 4, z + 6, x + 22, ROOF + 6, z + 8, M.CHROME);
  b.fill(x + 20, ROOF, z + 6, x + 22, ROOF + 4, z + 8, M.CHROME);
}

function chimney(b: Builder, x: number, z: number): void {
  b.fill(x, ROOF, z, x + 12, ROOF + 14, z + 12, (xx, y, zz) =>
    brick(xx + zz, y),
  );
  b.fill(x - 1, ROOF + 14, z - 1, x + 13, ROOF + 16, z + 13, M.CONCRETE);
  for (const px of [x + 3, x + 8])
    b.cylinder(px, z + 6, 1.6, ROOF + 16, ROOF + 19, (xx, _y, zz) =>
      xx === px && zz === z + 6 ? M.TILE_BLACK : M.BRICK_C,
    );
}

function antenna(b: Builder, x: number, z: number): void {
  b.fill(x - 2, ROOF, z - 2, x + 3, ROOF + 1, z + 3, M.METAL);
  b.fill(x, ROOF + 1, z, x + 1, ROOF + 19, z + 1, M.METAL);
  b.fill(x - 7, ROOF + 12, z, x + 8, ROOF + 13, z + 1, M.METAL);
  b.fill(x - 5, ROOF + 16, z, x + 6, ROOF + 17, z + 1, M.METAL);
  for (const dx of [-7, -4, 4, 7]) b.put(x + dx, ROOF + 11, z, M.METAL);
  for (const dx of [-5, 5]) b.put(x + dx, ROOF + 15, z, M.METAL);
}

function dish(b: Builder, x: number, z: number): void {
  b.fill(x - 1, ROOF, z - 1, x + 1, ROOF + 8, z + 1, M.METAL);
  for (let dx = -5; dx <= 5; dx++)
    for (let dy = -5; dy <= 5; dy++)
      if (dx * dx + dy * dy <= 25)
        b.put(x + dx, ROOF + 12 + dy, z - 2, M.CHROME);
  b.fill(x, ROOF + 12, z - 8, x + 1, ROOF + 13, z - 2, M.METAL);
  b.fill(x - 1, ROOF + 11, z - 10, x + 2, ROOF + 14, z - 8, M.FRAME_DARK);
}

function solarRow(b: Builder, x0: number, x1: number, z0: number): void {
  const yAt = (dz: number) => ROOF + 3 + Math.floor(dz / 3);
  for (let dz = 0; dz < 18; dz++) {
    const y = yAt(dz);
    b.fill(x0, y - 1, z0 + dz, x1, y + 1, z0 + dz + 1, (x) =>
      x === x0 || x === x1 - 1 || dz === 0 || dz === 17 || (x - x0) % 16 === 0
        ? M.CHROME
        : dz % 6 === 0 || (x - x0) % 4 === 0
          ? M.FRAME_DARK
          : M.GLASS_DARK,
    );
  }
  for (const x of [x0 + 2, Math.floor((x0 + x1) / 2), x1 - 3]) {
    b.fill(x, ROOF, z0 + 1, x + 1, yAt(1) - 1, z0 + 2, M.METAL);
    b.fill(x, ROOF, z0 + 16, x + 1, yAt(16) - 1, z0 + 17, M.METAL);
  }
}

function hatch(b: Builder, x: number, z: number): void {
  b.fill(x, ROOF, z, x + 16, ROOF + 4, z + 16, M.METAL);
  b.fill(x - 1, ROOF + 4, z - 1, x + 17, ROOF + 5, z + 17, M.FRAME_DARK);
  b.fill(x + 6, ROOF + 5, z + 2, x + 10, ROOF + 6, z + 3, M.CHROME);
}

function vent(b: Builder, x: number, z: number): void {
  b.cylinder(x, z, 2, ROOF, ROOF + 8, M.METAL);
  b.cylinder(x, z, 3.2, ROOF + 8, ROOF + 9, M.FRAME_DARK);
  b.put(x, ROOF + 9, z, M.METAL);
}
