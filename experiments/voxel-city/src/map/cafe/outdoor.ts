import { type Builder, brick, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G, ZONES } from "../layout";
import {
  box,
  chair,
  fruitCrate,
  lantern,
  pallet,
  parasol,
  planter,
  pottedPlant,
  roundTable,
  streetText,
} from "./parts";
import { BX0, BX1, BZ0, BZ1, Y_PARAPET, Y_ROOF, Y_ROOF_TOP } from "./plan";

const LOT = ZONES.cafe;
const S = G + 2;

/** Ground works first: everything else stands on them. */
export function grounds(b: Builder): void {
  b.fill(LOT.x0, G - 1, LOT.z0, LOT.x1, G, BZ0, M.CONCRETE);
  b.fill(LOT.x0, G, LOT.z0, LOT.x1, S, BZ0, (x, _y, z) => {
    if (x % 20 === 0 || z % 20 === 0) return M.CONCRETE;
    return hash3(Math.floor(x / 20), 7, Math.floor(z / 20)) < 0.5
      ? M.SIDEWALK
      : M.PATH;
  });
  b.fill(684, G - 1, BZ0, BX0, G, 562, M.CONCRETE);
  b.fill(684, G, BZ0, BX0, S, 562, (x, y) =>
    y === G ? M.PLANKS_DARK : x % 6 === 0 ? M.PLANKS_DARK : M.PLANKS,
  );
  b.fill(BX0, G - 1, BZ1, 1016, G, 690, (x, _y, z) =>
    x % 40 === 0 || z % 40 === 0 ? M.CONCRETE_DARK : M.CONCRETE,
  );
  b.fill(880, G - 1, 690, 920, G, 794, M.GRAVEL);
}

export function terrace(b: Builder): void {
  planter(b, 690, S, 282, 790, 290);
  planter(b, 830, S, 282, 882, 290);
  for (const x of [766, 848]) {
    roundTable(b, x, S, 332, 6, 16, M.MARBLE);
    chair(b, x - 11, S, 332, "+x", M.FABRIC_GREEN, M.METAL);
    chair(b, x + 11, S, 332, "-x", M.FABRIC_GREEN, M.METAL);
  }
  for (const x of [762, 852]) {
    parasol(b, x, S, 299, 12, 40);
    b.cylinder(x, 299, 6, S + 15, S + 16, M.TABLE);
    chair(b, x - 11, S, 299, "+x", M.FABRIC_GREEN, M.METAL);
    chair(b, x + 11, S, 299, "-x", M.FABRIC_GREEN, M.METAL);
  }
  aBoard(b, 812, 300);
  for (const z of [362, 424, 489, 550]) festoon(b, 688, z);

  for (const z of [392, 456, 522]) {
    parasol(b, 710, S, z, 17, 44);
    b.cylinder(710, z, 7, S + 15, S + 16, M.TABLE);
    chair(b, 698, S, z, "+x", M.FABRIC_YELLOW, M.METAL);
    chair(b, 722, S, z, "-x", M.FABRIC_YELLOW, M.METAL);
    chair(b, 710, S, z - 12, "+z", M.FABRIC_YELLOW, M.METAL);
    chair(b, 710, S, z + 12, "-z", M.FABRIC_YELLOW, M.METAL);
  }
  for (const [z0, z1] of [
    [352, 372],
    [418, 430],
    [482, 496],
    [540, 560],
  ])
    planter(b, 685, S, z0, 693, z1);

  b.fill(892, S, 326, 942, G + 10, 334, M.PLANKS_DARK);
  b.fill(892, S, 334, 942, G + 16, 342, M.PLANKS_DARK);
  b.fill(892, S, 342, 942, G + 22, 349, M.PLANKS_DARK);
  const fruit = [
    M.PRODUCT_RED,
    M.PRODUCT_ORANGE,
    M.FLOWER_YELLOW,
    M.PRODUCT_GREEN,
    M.LEAVES_A,
    M.FLOWER_PURPLE,
  ];
  for (let i = 0; i < 4; i++) {
    const x = 893 + i * 12;
    fruitCrate(b, x, G + 10, 326, x + 12, 334, fruit[i]);
    fruitCrate(b, x, G + 16, 334, x + 12, 342, fruit[(i + 2) % 6]);
    fruitCrate(b, x, G + 22, 342, x + 12, 349, fruit[(i + 4) % 6]);
  }
  b.fill(972, S, 330, 996, G + 18, 344, (_x, y) =>
    y === G + 17 || (y >= G + 10 && y < G + 12) ? M.CAR_BLUE : M.CAR_WHITE,
  );
  for (const [x, z] of [
    [1004, 336],
    [1012, 336],
    [1008, 344],
  ]) {
    b.cylinder(x, z, 2.6, S, S + 8, M.METAL);
    b.cylinder(x, z, 2, S + 8, S + 11, M.HEDGE);
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++)
        if (hash3(x + dx, 5, z + dz) < 0.55 && dx * dx + dz * dz <= 4)
          b.put(
            x + dx,
            S + 11,
            z + dz,
            [M.FLOWER_RED, M.FLOWER_YELLOW, M.FLOWER_PURPLE, M.PILLOW][
              Math.floor(hash3(x, dx, dz) * 4)
            ],
          );
  }
}

function aBoard(b: Builder, x: number, z: number): void {
  for (let y = S; y < S + 20; y++) {
    const off = Math.floor(((y - S) * 4) / 20);
    for (const zz of [z - 4 + off, z - 3 + off, z + 2 - off, z + 3 - off])
      b.fill(x - 6, y, zz, x + 6, y + 1, zz + 1, (xx) => {
        if (xx === x - 6 || xx === x + 5 || y === S + 19 || y === S + 4)
          return M.PLANKS;
        if (y < S + 4) return 0;
        return zz < z && (y - S) % 3 === 0 && hash3(xx, y, 3) < 0.7
          ? M.TILE_WHITE
          : M.TILE_BLACK;
      });
  }
}

function fence(
  b: Builder,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  const alongX = x1 - x0 > z1 - z0;
  b.fill(x0, G, z0, x1, G + 36, z1, (x, y, z) => {
    const u = alongX ? x : z;
    if (u % 24 < 2) return M.PLANKS_DARK;
    if (y >= G + 34) return y === G + 35 ? M.PLANKS_DARK : M.PLANKS;
    return Math.floor(u / 3) % 2 === 0 ? M.SHED : M.PLANKS;
  });
}

export function yard(b: Builder): void {
  fence(b, 680, 794, 880, 796);
  fence(b, 920, 794, 1018, 796);
  fence(b, 1016, BZ1, 1018, 794);
  fence(b, 684, 564, 700, 566);
  fence(b, 716, 564, BX0, 566);
  b.fill(878, G, 794, 880, G + 40, 796, M.PLANKS_DARK);
  b.fill(920, G, 794, 922, G + 40, 796, M.PLANKS_DARK);
  b.fill(880, G + 1, 794, 920, G + 34, 796, (x, y) => {
    if (y === G + 6 || y === G + 28) return M.PLANKS_DARK;
    const leaf = x < 900 ? x - 880 : 919 - x;
    if (Math.abs(leaf - Math.floor(((y - G - 6) * 20) / 22)) < 1)
      return M.PLANKS_DARK;
    return x % 4 === 3 ? 0 : M.FENCE;
  });

  for (const x0 of [742, 790]) dumpster(b, x0, 600);
  for (const [x, m] of [
    [838, M.METAL_YELLOW],
    [853, M.CAR_BLUE],
    [868, M.METAL_GREEN],
  ])
    wheelieBin(b, x, 604, m);

  for (let k = 0; k < 6; k++) pallet(b, 900, G + 4 * k, 612, 924, 632);
  pallet(b, 930, G, 612, 954, 632);
  box(b, 931, G + 4, 613, 942, G + 14, 622);
  box(b, 942, G + 4, 613, 953, G + 12, 631);
  box(b, 931, G + 4, 622, 942, G + 12, 631);
  box(b, 932, G + 14, 614, 940, G + 20, 621);
  for (let k = 0; k < 3; k++) crate(b, 962, G + 8 * k, 614, M.PRODUCT_BLUE);
  for (let k = 0; k < 2; k++) crate(b, 976, G + 8 * k, 614, M.PRODUCT_GREEN);
  for (const x of [966, 976, 986]) {
    b.cylinder(x, 646, 4, G, G + 12, M.CHROME);
    for (const y of [G, G + 6, G + 11])
      b.cylinder(x, 646, 4.2, y, y + 1, M.METAL);
  }

  shed(b, 930, 700, 1004, 780);

  b.fill(790, G + 14, 728, 830, G + 15, 742, (_x, _y, z) =>
    z % 4 === 3 ? 0 : M.PLANKS,
  );
  for (const x of [796, 824])
    b.fill(x, G + 13, 728, x + 1, G + 14, 742, M.PLANKS_DARK);
  for (const [z0, z1] of [
    [720, 726],
    [744, 750],
  ])
    b.fill(790, G + 8, z0, 830, G + 9, z1, M.PLANKS);
  for (const x of [794, 826]) {
    b.fill(x, G, 722, x + 2, G + 8, 724, M.PLANKS_DARK);
    b.fill(x, G, 746, x + 2, G + 8, 748, M.PLANKS_DARK);
    b.fill(x, G, 729, x + 2, G + 14, 741, (_x, _y, z) =>
      z === 729 || z === 740 || z === 734 ? M.PLANKS_DARK : 0,
    );
  }
  b.tree(760, G, 752, 46, 22);
  vegetableBed(b, 840, 712, 872, 756);
  bike(b, 842, 790);

  b.fill(740, G, BZ1, 758, G + 18, BZ1 + 10, (x, y, z) => {
    const d = Math.hypot(x - 749, y - (G + 9));
    if (d < 7 && z === BZ1 + 9)
      return d < 1.5
        ? M.CHROME
        : Math.floor(d) % 2 === 0
          ? M.FRAME_DARK
          : M.METAL;
    return M.CHROME;
  });
  b.fill(752, G + 18, BZ1, 754, G + 44, BZ1 + 2, M.METAL);
  b.fill(BX1, G, 520, LOT.x1, G + 18, 536, (_x, y, z) =>
    (y + z) % 3 === 0 ? M.FRAME_DARK : M.CHROME,
  );
}

function dumpster(b: Builder, x0: number, z0: number): void {
  for (const [x, z] of [
    [x0 + 2, z0 + 2],
    [x0 + 35, z0 + 2],
    [x0 + 2, z0 + 23],
    [x0 + 35, z0 + 23],
  ])
    b.fill(x, G, z, x + 3, G + 3, z + 3, M.TIRE);
  b.fill(x0, G + 3, z0, x0 + 40, G + 28, z0 + 28, (x, y) =>
    y === G + 15 || y === G + 27 || (x - x0) % 10 === 0
      ? M.METAL
      : M.METAL_GREEN,
  );
  b.fill(x0 - 1, G + 28, z0 - 1, x0 + 41, G + 30, z0 + 29, (_x, y, z) =>
    y === G + 29 && z < z0 + 13 ? 0 : M.FRAME_DARK,
  );
  for (const x of [x0 - 2, x0 + 40])
    b.fill(x, G + 18, z0 + 8, x + 2, G + 22, z0 + 20, M.METAL);
}

function wheelieBin(b: Builder, x0: number, z0: number, m: number): void {
  b.fill(x0, G, z0 + 9, x0 + 3, G + 3, z0 + 12, M.TIRE);
  b.fill(x0 + 9, G, z0 + 9, x0 + 12, G + 3, z0 + 12, M.TIRE);
  b.fill(x0, G + 2, z0, x0 + 12, G + 22, z0 + 11, m);
  b.fill(x0 - 1, G + 22, z0 - 1, x0 + 13, G + 23, z0 + 12, M.FRAME_DARK);
  b.fill(x0 + 2, G + 20, z0 + 11, x0 + 10, G + 21, z0 + 13, M.FRAME_DARK);
}

function crate(
  b: Builder,
  x0: number,
  y0: number,
  z0: number,
  m: number,
): void {
  b.fill(x0, y0, z0, x0 + 12, y0 + 8, z0 + 10, (x, y, z) =>
    y === y0 || x === x0 || x === x0 + 11 || z === z0 || z === z0 + 9 ? m : 0,
  );
  b.fill(x0 + 4, y0 + 5, z0, x0 + 8, y0 + 7, z0 + 1, 0);
}

function shed(
  b: Builder,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  b.fill(x0 - 2, G - 1, z0 - 2, x1 + 2, G, z1 + 2, M.CONCRETE);
  for (let z = z0 - 3; z < z1 + 3; z++) {
    const top = G + 52 - Math.floor(((z - z0 + 3) * 8) / (z1 - z0 + 6));
    b.fill(x0 - 3, top - 1, z, x1 + 3, top + 1, z + 1, (x) =>
      x % 4 < 2 ? M.METAL : M.CHROME,
    );
    if (z < z0 || z >= z1) continue;
    b.fill(x0, G, z, x1, top - 1, z + 1, (x) => {
      const wall = x < x0 + 2 || x >= x1 - 2 || z < z0 + 2 || z >= z1 - 2;
      if (!wall) return 0;
      const u = z < z0 + 2 || z >= z1 - 2 ? x : z;
      return u % 4 < 2 ? M.METAL_GREEN : M.SIGN_GREEN;
    });
  }
  b.fill(950, G, z0, 978, G + 40, z0 + 2, (x, y) => {
    if (x === 950 || x === 977 || x === 963 || x === 964 || y === G + 39)
      return M.FRAME_DARK;
    return (y - G) % 8 === 0 ? M.METAL : M.CHROME;
  });
  for (const x of [961, 966])
    b.fill(x, G + 18, z0 - 1, x + 1, G + 24, z0, M.BRASS);
  for (const y of [G + 14, G + 30])
    b.fill(x0 + 2, y, z1 - 12, x1 - 2, y + 1, z1 - 2, M.PLANKS);
  for (let x = x0 + 4; x < x1 - 6; x += 7) {
    b.cylinder(
      x + 2,
      z1 - 7,
      2.5,
      G + 15,
      G + 21,
      hash3(x, 1, 2) < 0.5 ? M.PRODUCT_BLUE : M.METAL_RED,
    );
    box(b, x, G + 31, z1 - 11, x + 6, G + 36, z1 - 3);
  }
  b.fill(x0 + 4, G, z0 + 10, x0 + 6, G + 44, z0 + 30, (_x, y, z) =>
    z === z0 + 10 || z === z0 + 29 || (y - G) % 8 === 0 ? M.WOOD_LIGHT : 0,
  );
}

export function rooftop(b: Builder): void {
  const r = Y_ROOF_TOP;
  for (const x0 of [896, 948]) hvac(b, x0, 404);
  roofTerrace(b);
  b.fill(960, r, 500, 978, r + 5, 518, M.CONCRETE);
  b.fill(959, r + 5, 499, 979, r + 6, 519, M.FRAME_DARK);

  b.fill(850, Y_ROOF, 500, 880, r + 2, 530, (x, y, z) => {
    if (x === 850 || x === 879 || z === 500 || z === 529) return M.FRAME_DARK;
    if (y === r + 1) return (x - 850) % 10 === 0 ? M.FRAME_DARK : M.GLASS;
    return 0;
  });

  b.fill(836, G + 60, 556, 844, G + 68, BZ1 + 6, M.METAL);
  b.fill(836, G + 60, BZ1, 844, Y_PARAPET + 12, BZ1 + 6, M.METAL);
  b.fill(834, Y_PARAPET + 12, BZ1 - 2, 846, Y_PARAPET + 14, BZ1 + 8, M.METAL);
  b.fill(838, Y_PARAPET + 14, BZ1 + 2, 842, Y_PARAPET + 17, BZ1 + 4, M.METAL);
  b.fill(
    833,
    Y_PARAPET + 17,
    BZ1 - 3,
    847,
    Y_PARAPET + 18,
    BZ1 + 9,
    M.FRAME_DARK,
  );

  b.fill(980, r, 540, 982, r + 14, 542, M.METAL);
  const yc = r + 16;
  for (let dy = -6; dy <= 6; dy++)
    for (let dx = -6; dx <= 6; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > 36) continue;
      const z = 538 + Math.floor((36 - d2) / 18);
      b.put(981 + dx, yc + dy, z, M.CAR_WHITE);
      b.put(981 + dx, yc + dy, z + 1, M.CAR_WHITE);
    }
  b.fill(981, yc - 4, 532, 982, yc - 3, 540, M.METAL);
  b.fill(980, yc - 5, 529, 983, yc - 2, 533, M.FRAME_DARK);

  b.fill(1000, r, 540, 1001, r + 34, 541, M.METAL);
  for (const [y, w] of [
    [r + 33, 8],
    [r + 29, 6],
    [r + 25, 4],
  ])
    b.fill(1000 - w, y, 540, 1001 + w, y + 1, 541, M.METAL);
  for (const [x, z] of [
    [800, 450],
    [880, 460],
    [940, 540],
    [780, 400],
  ]) {
    b.cylinder(x, z, 1.5, r, r + 9, M.METAL);
    b.cylinder(x, z, 2.5, r + 9, r + 10, M.FRAME_DARK);
  }

  const y0 = r + 14;
  const y1 = r + 45;
  const x0 = 760;
  const x1 = 990;
  b.fill(x0, y0, 362, x1, y1, 364, (x, y, z) =>
    z === 363 && (x % 16 < 2 || (y - y0) % 10 < 2) ? M.METAL : M.FRAME_DARK,
  );
  b.fill(x0 + 2, y0 + 2, 361, x1 - 2, y1 - 2, 362, (x, y) =>
    x === x0 + 2 || x === x1 - 3 || y === y0 + 2 || y === y1 - 3
      ? M.NEON_CYAN
      : 0,
  );
  streetText(b, "CAFE DU COIN", 3, 875, y1 - 6, 361, M.NEON_PINK);
  for (const x of [772, 874, 976]) {
    b.fill(x, r, 362, x + 2, y0, 364, M.METAL);
    b.line(x, r, 384, x, y0 + 16, 365, 1, M.METAL);
  }
}

function hvac(b: Builder, x0: number, z0: number): void {
  const r = Y_ROOF_TOP;
  for (const z of [z0 + 2, z0 + 21])
    b.fill(x0 + 2, r, z, x0 + 38, r + 2, z + 3, M.METAL);
  b.fill(x0, r + 2, z0, x0 + 40, r + 20, z0 + 26, (x, y, z) => {
    const face = x === x0 || x === x0 + 39 || z === z0 || z === z0 + 25;
    return face && y % 3 === 0 && y < r + 18 ? M.FRAME_DARK : M.CHROME;
  });
  const cx = x0 + 20;
  const cz = z0 + 13;
  b.fill(cx - 10, r + 20, cz - 10, cx + 11, r + 22, cz + 11, (x, y, z) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d > 9.5) return 0;
    if (d > 8) return M.METAL;
    if (y === r + 21)
      return d < 2 ? M.CHROME : (x - cx) % 2 === 0 ? M.FRAME_DARK : 0;
    return 0;
  });
  b.fill(x0 + 16, r, z0 + 26, x0 + 24, r + 8, z0 + 40, M.METAL);
}

function festoon(b: Builder, xPost: number, z: number): void {
  const xw = BX0 - 1;
  const yTop = G + 60;
  b.fill(xPost - 1, S, z - 1, xPost + 1, yTop + 3, z + 1, M.PLANKS_DARK);
  let prev = yTop;
  for (let x = xPost + 1; x <= xw; x++) {
    const t = (x - xPost) / (xw - xPost);
    const y = Math.round(yTop - 24 * t * (1 - t));
    b.fill(
      x,
      Math.min(y, prev),
      z,
      x + 1,
      Math.max(y, prev) + 1,
      z + 1,
      M.METAL,
    );
    if ((x - xPost) % 5 === 3) b.put(x, y - 1, z, M.LAMP);
    prev = y;
  }
}

/** 4-connected line in a vertical x-y plane. */
function line4(
  b: Builder,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  m: number,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x1 > x0 ? 1 : -1;
  const sy = y1 > y0 ? 1 : -1;
  let x = x0;
  let y = y0;
  let ix = 0;
  let iy = 0;
  b.put(x, y, z, m);
  for (let i = 0; i < dx + dy; i++) {
    if ((0.5 + ix) / dx < (0.5 + iy) / dy) {
      x += sx;
      ix++;
    } else {
      y += sy;
      iy++;
    }
    b.put(x, y, z, m);
  }
}

function bike(b: Builder, xb: number, z: number): void {
  const wy = G + 6;
  for (const cx of [xb, xb + 22]) {
    for (let dy = -7; dy <= 7; dy++)
      for (let dx = -7; dx <= 7; dx++) {
        const d = Math.hypot(dx, dy);
        if (d >= 5.3 && d <= 6.8) b.put(cx + dx, wy + dy, z, M.TIRE);
      }
    for (const [ex, ey] of [
      [6, 0],
      [-6, 0],
      [0, 6],
      [0, -6],
      [4, 4],
      [-4, -4],
      [4, -4],
      [-4, 4],
    ])
      line4(b, cx, wy, cx + ex, wy + ey, z, M.CHROME);
  }
  const c: [number, number] = [xb + 10, G + 5];
  const s: [number, number] = [xb + 8, G + 17];
  const h: [number, number] = [xb + 19, G + 17];
  for (const [p, q] of [
    [[xb, wy], c],
    [[xb, wy], s],
    [c, s],
    [s, h],
    [c, h],
    [h, [xb + 22, wy]],
    [h, [xb + 18, G + 21]],
  ] as [number, number][][])
    line4(b, p[0], p[1], q[0], q[1], z, M.METAL_RED);
  b.fill(xb + 18, G + 21, z - 3, xb + 19, G + 22, z + 4, M.CHROME);
  b.fill(xb + 6, G + 18, z, xb + 11, G + 19, z + 1, M.FRAME_DARK);
  b.put(xb + 8, G + 18, z, M.FRAME_DARK);
  b.fill(c[0], c[1], z - 2, c[0] + 1, c[1] + 1, z + 3, M.FRAME_DARK);
}

function vegetableBed(
  b: Builder,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  b.fill(x0, G, z0, x1, G + 6, z1, (x, y, z) => {
    const edge = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1;
    return edge ? (y === G + 5 ? M.PLANKS : M.PLANKS_DARK) : M.DIRT;
  });
  for (let z = z0 + 3; z < z1 - 2; z += 5)
    for (let x = x0 + 2; x < x1 - 2; x += 3) {
      const h = 1 + Math.floor(hash3(x, 9, z) * 5);
      b.fill(x, G + 6, z, x + 1, G + 6 + h, z + 1, M.LEAVES_A);
      b.put(x + 1, G + 6, z, M.LEAVES_B);
      if (hash3(x, 10, z) < 0.35) b.put(x, G + 6 + h, z, M.PRODUCT_RED);
    }
}

function lounger(b: Builder, x0: number, y0: number, z0: number): void {
  for (const [x, z] of [
    [x0, z0],
    [x0 + 9, z0],
    [x0, z0 + 22],
    [x0 + 9, z0 + 22],
  ])
    b.fill(x, y0, z, x + 1, y0 + 4, z + 1, M.METAL);
  b.fill(x0, y0 + 4, z0, x0 + 10, y0 + 5, z0 + 23, M.WOOD_LIGHT);
  b.fill(x0 + 1, y0 + 5, z0, x0 + 9, y0 + 6, z0 + 15, M.FABRIC_YELLOW);
  for (let z = z0 + 15; z < z0 + 23; z++) {
    const y = y0 + 5 + (z - z0 - 15);
    b.fill(x0 + 1, y, z, x0 + 9, y + 2, z + 1, M.FABRIC_YELLOW);
  }
}

function roofTerrace(b: Builder): void {
  const r = Y_ROOF_TOP;
  b.fill(744, r, 532, 776, r + 47, 563, (x, y, z) =>
    y >= r + 44 ? M.CONCRETE : brick(x + z, y),
  );
  b.fill(743, r + 44, 531, 777, r + 46, 564, M.CONCRETE);
  b.fill(775, r, 540, 776, r + 38, 554, (_x, y, z) =>
    z === 540 || z === 553 || y === r + 37
      ? M.FRAME
      : (y - r) % 12 === 0
        ? M.PLANKS_DARK
        : M.DOOR,
  );
  b.put(774, r + 18, 551, M.BRASS);
  b.put(776, r + 18, 551, M.BRASS);
  lantern(b, 776, r + 42, 547, 1, 0);

  b.fill(778, r, 470, 848, r + 1, 563, (x, _y, z) =>
    x % 5 === 0 || (z + Math.floor(x / 5) * 13) % 40 === 0
      ? M.PLANKS_DARK
      : M.WOOD_LIGHT,
  );
  b.fill(848, r, 470, 850, r + 20, 563, (_x, y, z) =>
    z % 4 < 2 || y === r || y === r + 19 ? M.PLANKS : 0,
  );
  planter(b, 780, r + 1, 555, 846, 563);
  planter(b, 744, r, 472, 752, 528);
  for (const x of [786, 802]) lounger(b, x, r + 1, 524);
  b.cylinder(799, 540, 2.5, r + 1, r + 7, M.TABLE);
  parasol(b, 828, r + 1, 492, 13, 38);
  b.cylinder(828, 492, 5, r + 16, r + 17, M.TABLE);
  chair(b, 817, r + 1, 492, "+x");
  chair(b, 839, r + 1, 492, "-x");
  for (const [dx, dz] of [
    [-2, -1],
    [2, -1],
    [0, 2],
  ])
    b.fill(840 + dx, r + 1, 532 + dz, 841 + dx, r + 9, 533 + dz, M.METAL);
  b.cylinder(840, 532, 3.2, r + 9, r + 13, M.FRAME_DARK);
  b.cylinder(840, 532, 2.4, r + 13, r + 15, M.FRAME_DARK);
  pottedPlant(b, 786, r + 1, 478, 6);
  pottedPlant(b, 842, r + 1, 478, 5, M.TILE_WHITE);
}
