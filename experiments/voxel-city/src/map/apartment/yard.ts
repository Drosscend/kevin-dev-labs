import { type Builder, brick, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G, ZONES } from "../layout";
import { FLIP_X, FLOOR0, flipX, X0, X1, Z0, Z1 } from "./plan";

const LOT = ZONES.apartment;
const PATH_X0 = 164;
const PATH_X1 = 196;

/** Fenced front garden, entrance path and steps, gravel strips along the sides. */
export function frontYard(b: Builder): void {
  const paving = (x: number, _y: number, z: number) =>
    (x - PATH_X0) % 16 === 0 || (z + ((x - PATH_X0) >> 4) * 8) % 16 === 0
      ? M.MORTAR
      : hash3(x >> 3, 4, z >> 3) < 0.5
        ? M.PATH
        : M.SIDEWALK;
  b.fill(PATH_X0, G - 1, LOT.z0, PATH_X1, G + 2, Z0 - 18, paving);
  b.fill(PATH_X0 - 2, G - 1, LOT.z0, PATH_X0, G + 3, Z0 - 18, M.CURB);
  b.fill(PATH_X1, G - 1, LOT.z0, PATH_X1 + 2, G + 3, Z0 - 18, M.CURB);
  b.fill(156, G, Z0 - 18, 204, G + 4, Z0 - 14, M.STONE);
  b.fill(156, G, Z0 - 14, 204, FLOOR0, Z0, M.STONE);
  b.fill(156, FLOOR0 - 1, Z0 - 14, 204, FLOOR0, Z0, (x, _y, z) =>
    (x + z) % 12 === 0 ? M.STONE : M.MARBLE,
  );

  for (let s = 0; s < 2; s++) {
    const [wa, wc] = flipX(s, 12, PATH_X0 - 6);
    b.fill(wa, G, LOT.z0, wc, G + 8, LOT.z0 + 4, (x, y) =>
      brick(x, y, [M.BRICK_GREY, M.STONE]),
    );
    b.fill(wa, G + 8, LOT.z0, wc, G + 9, LOT.z0 + 4, M.CONCRETE);
    const fx0 = Math.max(wa, 32);
    const fx1 = Math.min(wc, FLIP_X - 32);
    b.fill(fx0, G + 20, LOT.z0 + 2, fx1, G + 21, LOT.z0 + 3, M.FRAME_DARK);
    for (let x = Math.ceil(fx0 / 5) * 5; x < fx1; x += 5) {
      b.fill(x, G + 9, LOT.z0 + 2, x + 1, G + 20, LOT.z0 + 3, M.FRAME_DARK);
      b.put(x, G + 21, LOT.z0 + 2, M.BRASS);
    }
    const [pa, pc] = flipX(s, PATH_X0 - 6, PATH_X0 - 2);
    b.fill(pa, G, LOT.z0, pc, G + 18, LOT.z0 + 4, (x, y) =>
      brick(x, y, [M.BRICK_GREY]),
    );
    b.fill(pa - 1, G + 18, LOT.z0 - 1, pc + 1, G + 20, LOT.z0 + 5, M.CONCRETE);
    b.fill(pa + 1, G + 20, LOT.z0 + 1, pc - 1, G + 22, LOT.z0 + 3, M.LAMP);

    const [ba, bc] = flipX(s, 36, 152);
    const bz0 = Z0 - 30;
    b.fill(ba, G - 1, bz0, bc, G, Z0 - 2, M.DIRT);
    b.shell(ba, G, bz0, bc, G + 3, Z0 - 1, 2, (x, y) =>
      brick(x, y, [M.BRICK_C, M.BRICK_A]),
    );
    for (let x = ba + 2; x < bc - 2; x++)
      for (let z = bz0 + 2; z < Z0 - 3; z++) {
        const r = hash3(x, 13, z);
        if (r > 0.4) continue;
        b.put(x, G, z, M.LEAVES_A);
        if (r < 0.1)
          b.put(
            x,
            G + 1,
            z,
            [M.FLOWER_YELLOW, M.FLOWER_RED, M.FLOWER_PURPLE][
              Math.floor(r * 30) % 3
            ],
          );
      }
    for (let x = ba + 11; x < bc - 8; x += 19) {
      const rad = 6.5 + hash3(x, 16, s) * 2.5;
      b.sphere(x, G + 3, Z0 - 15, rad, (px, py, pz) =>
        py < G - 1
          ? M.DIRT
          : hash3(px >> 1, py >> 1, pz >> 1) < 0.3
            ? M.LEAVES_B
            : M.HEDGE,
      );
    }

    const [ta] = flipX(s, 156, 164);
    b.fill(ta, FLOOR0, Z0 - 12, ta + 8, FLOOR0 + 8, Z0 - 4, M.STONE);
    b.fill(ta + 1, FLOOR0 + 7, Z0 - 11, ta + 7, FLOOR0 + 8, Z0 - 5, M.DIRT);
    for (let i = 0; i < 7; i++) {
      const r = 4 - Math.floor(i / 2);
      b.fill(
        ta + 4 - r,
        FLOOR0 + 8 + i * 3,
        Z0 - 8 - r,
        ta + 4 + r,
        FLOOR0 + 11 + i * 3,
        Z0 - 8 + r,
        M.HEDGE,
      );
    }

    for (const z of [LOT.z0 + 10, Z0 - 26]) {
      const [la] = flipX(s, PATH_X0 - 5, PATH_X0 - 3);
      b.fill(la, G, z, la + 2, G + 16, z + 2, M.METAL);
      b.fill(la, G + 16, z, la + 2, G + 19, z + 2, M.LAMP);
      b.fill(la, G + 19, z, la + 2, G + 20, z + 2, M.METAL);
    }
  }

  b.fill(LOT.x0, G - 1, Z0, X0 - 1, G, Z1, M.GRAVEL);
  b.fill(X1 + 1, G - 1, Z0, LOT.x1, G, Z1, M.GRAVEL);
  b.fill(14, G - 1, Z0 - 30, 26, G, Z1 + 40, (x, _y, z) =>
    z % 10 === 0 || x === 14 || x === 25 ? M.MORTAR : M.PATH,
  );
}

/** Terrace, bikes, bins and garden. x 258..302 stays clear up to the park gate at z 800. */
export function backYard(b: Builder): void {
  b.fill(X0, G - 1, Z1, X1, G, Z1 + 46, (x, _y, z) =>
    x % 12 === 0 || z % 12 === 0
      ? M.MORTAR
      : hash3(x / 12, 3, z / 12) < 0.3
        ? M.STONE
        : M.PATH,
  );
  for (let i = 0; i < 6; i++) bikeHoop(b, 206 + i * 20, Z1 + 12);
  bike(b, 210, Z1 + 16, M.CAR_RED);
  bike(b, 250, Z1 + 16, M.CAR_BLUE);
  bike(b, 290, Z1 + 16, M.METAL_GREEN);
  bins(b);
  b.tree(190, G, 768, 64, 24);
  bench(b, 120, 760);
  picnic(b, 210, 742);
  clothesline(b, 304, 344, 784);
}

function bikeHoop(b: Builder, x: number, z: number): void {
  b.fill(x, G - 1, z - 1, x + 14, G, z + 3, M.CONCRETE);
  b.fill(x, G, z, x + 2, G + 16, z + 2, M.CHROME);
  b.fill(x + 12, G, z, x + 14, G + 16, z + 2, M.CHROME);
  b.fill(x, G + 16, z, x + 14, G + 18, z + 2, M.CHROME);
}

function bike(b: Builder, x: number, z: number, color: number): void {
  const wy = G + 7;
  for (const cx of [x + 7, x + 27])
    for (let dx = -7; dx <= 7; dx++)
      for (let dy = -7; dy <= 7; dy++) {
        const r = Math.hypot(dx, dy);
        if ((r > 5.6 && r < 7.3) || r < 1.2)
          b.put(cx + dx, wy + dy, z, r < 1.2 ? M.CHROME : M.TIRE);
      }
  b.line(x + 7, wy, z, x + 15, wy + 1, z, 1, color);
  b.line(x + 15, wy + 1, z, x + 12, wy + 13, z, 1, color);
  b.line(x + 7, wy, z, x + 12, wy + 12, z, 1, color);
  b.line(x + 12, wy + 12, z, x + 24, wy + 12, z, 1, color);
  b.line(x + 15, wy + 1, z, x + 24, wy + 12, z, 1, color);
  b.line(x + 24, wy + 12, z, x + 27, wy, z, 1, color);
  b.line(x + 24, wy + 12, z, x + 23, wy + 17, z, 1, M.METAL);
  b.fill(x + 22, wy + 17, z - 4, x + 24, wy + 18, z + 5, M.METAL);
  b.fill(x + 9, wy + 15, z - 1, x + 15, wy + 16, z + 2, M.RUBBER);
  b.fill(x + 12, wy + 12, z, x + 13, wy + 15, z + 1, M.METAL);
}

function bins(b: Builder): void {
  const ex1 = 110;
  const ez0 = 750;
  const ez1 = 796;
  const slat = (x: number, _y: number, z: number) =>
    (x + z) % 6 === 0 ? M.PLANKS_DARK : M.PLANKS;
  b.fill(LOT.x0 + 4, G - 1, ez0, ex1, G, ez1, M.CONCRETE);
  b.fill(ex1 - 2, G, ez0, ex1, G + 28, ez1, slat);
  b.fill(70, G, ez0, ex1, G + 28, ez0 + 2, slat);
  b.fill(ex1 - 2, G + 28, ez0, ex1, G + 30, ez1, M.PLANKS_DARK);
  b.fill(70, G + 28, ez0, ex1, G + 30, ez0 + 2, M.PLANKS_DARK);
  const colors = [M.METAL_GREEN, M.METAL_YELLOW, M.CAR_BLUE];
  for (let i = 0; i < 3; i++) {
    const x = 18 + i * 30;
    const z = 770;
    for (const [dx, dz] of [
      [1, 1],
      [19, 1],
      [1, 15],
      [19, 15],
    ])
      b.fill(x + dx, G, z + dz, x + dx + 3, G + 3, z + dz + 3, M.TIRE);
    b.fill(x, G + 3, z, x + 23, G + 24, z + 19, colors[i]);
    b.fill(x + 1, G + 4, z - 1, x + 22, G + 5, z, M.FRAME_DARK);
    b.fill(x - 1, G + 24, z - 1, x + 24, G + 26, z + 20, M.RUBBER);
    b.fill(x + 8, G + 24, z - 2, x + 15, G + 25, z - 1, M.RUBBER);
  }
  b.sphere(36, G + 4, 760, 4, M.TILE_BLACK);
  b.sphere(29, G + 3, 758, 3.2, M.TILE_BLACK);
  b.fill(50, G, 754, 64, G + 8, 764, M.SHED);
  b.fill(50, G + 7, 758, 64, G + 8, 760, M.PLANKS);
}

function bench(b: Builder, x: number, z: number): void {
  for (const dx of [2, 32])
    b.fill(x + dx, G, z, x + dx + 2, G + 9, z + 8, M.METAL);
  b.fill(x, G + 9, z, x + 36, G + 10, z + 8, (xx) =>
    xx % 3 === 0 ? M.PLANKS_DARK : M.PLANKS,
  );
  for (const dx of [2, 32])
    b.fill(x + dx, G + 10, z + 7, x + dx + 2, G + 20, z + 8, M.METAL);
  b.fill(x, G + 13, z + 7, x + 36, G + 19, z + 8, (_x, y) =>
    y % 3 === 0 ? M.PLANKS_DARK : M.PLANKS,
  );
}

function picnic(b: Builder, x: number, z: number): void {
  for (const dx of [2, 30]) {
    b.line(x + dx, G, z + 2, x + dx, G + 15, z + 10, 1, M.PLANKS_DARK);
    b.line(x + dx, G, z + 18, x + dx, G + 15, z + 10, 1, M.PLANKS_DARK);
  }
  b.fill(x, G + 15, z + 4, x + 34, G + 17, z + 16, M.PLANKS);
  b.fill(x, G + 8, z, x + 34, G + 9, z + 3, M.PLANKS);
  b.fill(x, G + 8, z + 17, x + 34, G + 9, z + 20, M.PLANKS);
  for (const dx of [2, 30])
    b.fill(x + dx - 1, G + 8, z, x + dx + 2, G + 9, z + 20, M.PLANKS_DARK);
  b.fill(x + 14, G + 17, z + 8, x + 18, G + 19, z + 12, M.TILE_WHITE);
  b.fill(x + 6, G + 17, z + 7, x + 8, G + 21, z + 9, M.GLASS_DARK);
}

function clothesline(b: Builder, x0: number, x1: number, z: number): void {
  for (const x of [x0, x1]) {
    b.fill(x, G, z - 1, x + 2, G + 40, z + 1, M.METAL);
    b.fill(x, G + 38, z - 6, x + 2, G + 40, z + 6, M.METAL);
  }
  for (const dz of [-5, 4])
    b.fill(x0 + 2, G + 39, z + dz, x1, G + 40, z + dz + 1, M.PILLOW);
  const cloth = [
    M.PILLOW,
    M.PLASTER_BLUE,
    M.RUG,
    M.FABRIC_YELLOW,
    M.BED,
    M.SOFA,
    M.FABRIC_GREEN,
  ];
  for (let i = 0, x = x0 + 4; x + 9 <= x1; i++, x += 6) {
    const dz = i % 2 === 0 ? -5 : 4;
    const h = 8 + Math.floor(hash3(i, 5, z) * 8);
    b.fill(
      x,
      G + 39 - h,
      z + dz,
      x + 9,
      G + 39,
      z + dz + 1,
      cloth[i % cloth.length],
    );
    b.put(x + 1, G + 40, z + dz, M.FRAME);
    b.put(x + 7, G + 40, z + dz, M.FRAME);
  }
}
