import { type Builder, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { G } from "../layout";
import {
  box,
  chair,
  fruitCrate,
  goods,
  pallet,
  pendant,
  pottedPlant,
  roundTable,
  stool,
  text,
} from "./parts";
import {
  finish,
  IX0,
  IX1,
  IZ0,
  IZ1,
  X_SPLIT,
  Y_FLOOR,
  Y_ROOF,
  Y_SLAB,
  Y_UPPER,
  Z_FLAT,
  Z_KITCHEN,
} from "./plan";

export function interiors(b: Builder): void {
  partitions(b);
  cafeRoom(b);
  kitchen(b);
  shop(b);
  flat(b);
}

function partitions(b: Builder): void {
  b.fill(X_SPLIT, Y_FLOOR, IZ0, X_SPLIT + 6, Y_SLAB, IZ1, (x, y, z) => {
    if (x === X_SPLIT) return finish(x - 1, y, z);
    if (x === X_SPLIT + 5) return finish(x + 1, y, z);
    return M.CONCRETE;
  });
  b.fill(IX0, Y_FLOOR, Z_KITCHEN, X_SPLIT, Y_SLAB, Z_KITCHEN + 4, (x, y, z) => {
    if (z === Z_KITCHEN) return finish(x, y, z - 1);
    if (z === Z_KITCHEN + 3) return M.TILE_WHITE;
    return M.CONCRETE;
  });
  b.fill(846, Y_FLOOR, Z_KITCHEN, 862, G + 48, Z_KITCHEN + 4, (x, y, z) => {
    if (x < 848 || x >= 860 || y >= G + 46) return M.FRAME;
    if (z === Z_KITCHEN || z === Z_KITCHEN + 3) return 0;
    if (y < Y_FLOOR + 4) return M.CHROME;
    return Math.hypot(x - 853.5, y - (G + 36)) < 3.2 ? M.GLASS : M.DOOR;
  });

  b.fill(966, Y_FLOOR, 520, IX1, Y_SLAB, 524, M.PLASTER);
  b.fill(966, Y_FLOOR, 524, 970, Y_SLAB, IZ1, M.PLASTER);
  b.fill(984, Y_FLOOR, 520, 1000, G + 48, 524, (x, y, z) => {
    if (x < 986 || x >= 998 || y >= G + 46) return M.FRAME_DARK;
    if (z === 520 || z === 523) return 0;
    return (y - Y_FLOOR) % 14 === 0 ? M.PLANKS_DARK : M.DOOR;
  });

  b.fill(IX0, Y_UPPER, Z_FLAT, IX1, Y_ROOF, Z_FLAT + 4, M.WALLPAPER);
  b.fill(830, Y_UPPER, Z_FLAT + 4, 834, Y_ROOF, IZ1, M.WALLPAPER);
  b.fill(900, Y_UPPER, Z_FLAT + 4, 904, Y_ROOF, IZ1, M.WALLPAPER);
  for (const [x0, x1] of [
    [800, 818],
    [856, 872],
    [940, 958],
  ])
    b.fill(x0 - 1, Y_UPPER, Z_FLAT, x1 + 1, G + 127, Z_FLAT + 4, (x, y) =>
      x === x0 - 1 || x === x1 || y === G + 126 ? M.FRAME : 0,
    );
}

function cafeRoom(b: Builder): void {
  const top = G + 22;
  b.fill(830, Y_FLOOR, 390, 840, top, 476, (_x, y, z) => {
    if (y < Y_FLOOR + 2) return M.TILE_BLACK;
    return z % 8 === 0 || y === G + 20 ? M.PLANKS : M.PLANKS_DARK;
  });
  b.fill(828, top, 388, 842, top + 2, 478, M.MARBLE);
  b.fill(829, Y_FLOOR + 3, 392, 830, Y_FLOOR + 4, 474, M.BRASS);

  const py = top + 2;
  b.fill(830, py, 394, 840, py + 10, 424, (x, y, z) =>
    x === 830 ||
    x === 839 ||
    z === 394 ||
    z === 423 ||
    y === py + 9 ||
    y === py + 5
      ? M.GLASS
      : 0,
  );
  const pastries = [
    M.FABRIC_YELLOW,
    M.PRODUCT_RED,
    M.PLANKS,
    M.PRODUCT_ORANGE,
    M.WOOD_LIGHT,
    M.FLOWER_PURPLE,
  ];
  let k = 0;
  for (const yy of [py, py + 6])
    for (let z = 396; z < 421; z += 5)
      for (const x of [832, 836]) {
        b.fill(x, yy, z, x + 2, yy + 2, z + 3, pastries[k % pastries.length]);
        k++;
      }
  b.fill(832, py, 430, 838, py + 4, 438, M.FRAME_DARK);
  b.fill(833, py + 4, 433, 834, py + 9, 437, M.GLASS_DARK);
  b.fill(832, py, 442, 836, py + 5, 446, (x, _y, z) =>
    (x + z) % 2 === 0 ? M.TILE_WHITE : 0,
  );
  b.fill(834, py, 452, 836, py + 8, 454, M.CHROME);
  b.fill(834, py + 8, 448, 836, py + 10, 460, M.CHROME);
  for (const z of [449, 454, 459])
    b.fill(834, py + 10, z, 835, py + 14, z + 1, M.TABLE);

  b.fill(864, Y_FLOOR, 380, X_SPLIT, G + 20, 490, (_x, y, z) =>
    z % 10 === 0 || y === G + 12 ? M.PLANKS : M.PLANKS_DARK,
  );
  b.fill(863, G + 20, 380, X_SPLIT, G + 22, 490, M.MARBLE);
  const by = G + 22;
  b.fill(866, by, 400, 875, by + 10, 418, (_x, y) =>
    y === by + 8 ? M.BRASS : M.CHROME,
  );
  b.fill(868, by + 10, 402, 874, by + 11, 416, (x, _y, z) =>
    (x + z) % 3 === 0 ? M.TILE_WHITE : 0,
  );
  b.fill(864, by, 401, 866, by + 1, 417, M.METAL);
  for (const z of [403, 408, 413]) {
    b.fill(864, by + 4, z, 866, by + 6, z + 2, M.METAL);
    b.fill(862, by + 4, z, 864, by + 5, z + 2, M.FRAME_DARK);
    b.fill(864, by + 1, z, 865, by + 2, z + 2, M.TILE_WHITE);
  }
  b.fill(868, by + 2, 418, 869, by + 8, 419, M.CHROME);
  b.fill(867, by, 422, 873, by + 8, 428, M.FRAME_DARK);
  b.fill(868, by + 8, 423, 872, by + 15, 427, M.GLASS_DARK);
  b.fill(868, by + 15, 423, 872, by + 16, 427, M.FRAME_DARK);
  b.fill(864, by - 1, 440, 874, by, 452, M.METAL);
  b.fill(872, by, 445, 873, by + 6, 446, M.CHROME);
  b.fill(869, by + 5, 445, 872, by + 6, 446, M.CHROME);

  for (const y of [G + 40, G + 50]) {
    b.fill(869, y, 380, X_SPLIT, y + 1, 422, M.PLANKS);
    for (let z = 381; z < 421; z++) {
      if (z % 3 === 2) continue;
      const h = hash3(z, y, 41);
      const [m, n] =
        h < 0.4
          ? [M.TILE_WHITE, 2]
          : h < 0.75
            ? [M.GLASS, 4]
            : [M.GLASS_DARK, 6];
      b.fill(871, y + 1, z, 874, y + 1 + n, z + 1, m);
    }
  }

  b.fill(873, G + 34, 426, X_SPLIT, G + 64, 488, (_x, y, z) =>
    y === G + 34 || y === G + 63 || z === 426 || z === 487
      ? M.PLANKS_DARK
      : M.TILE_BLACK,
  );
  text(b, "MENU", 1, 872, G + 60, 446, 0, 1, M.TILE_WHITE);
  for (let line = 0; line < 4; line++) {
    const y = G + 50 - line * 4;
    const len = 18 + Math.floor(hash3(line, 2, 3) * 18);
    for (let z = 432; z < 432 + len; z++)
      if (hash3(z >> 2, line, 9) < 0.8) b.put(872, y, z, M.TILE_WHITE);
    b.fill(872, y, 476, 873, y + 1, 482, M.TILE_WHITE);
  }

  for (const z of [398, 412, 426, 440, 454, 468]) stool(b, 822, Y_FLOOR, z);

  b.fill(750, G + 22, IZ0, 794, G + 23, 362, M.PLANKS);
  for (const x of [751, 792])
    b.fill(x, Y_FLOOR, 360, x + 1, G + 22, 361, M.METAL);
  for (const x of [758, 772, 786]) stool(b, x, Y_FLOOR, 368);

  for (const [x, z] of [
    [764, 396],
    [800, 396],
    [800, 446],
  ]) {
    roundTable(b, x, Y_FLOOR, z, 6, 16, M.MARBLE);
    chair(b, x - 11, Y_FLOOR, z, "+x");
    chair(b, x + 11, Y_FLOOR, z, "-x");
    pendant(b, x, Y_SLAB, z, 30);
  }

  b.fill(746, Y_FLOOR, 490, 826, G + 12, Z_KITCHEN, (_x, y) =>
    y >= G + 10 ? M.RUG : M.PLANKS_DARK,
  );
  b.fill(746, G + 12, 497, 826, G + 28, Z_KITCHEN, (x, y) =>
    x % 8 === 4 && y % 6 === 0 ? M.PLANKS_DARK : M.RUG,
  );
  for (const x of [760, 786, 812]) {
    roundTable(b, x, Y_FLOOR, 481, 5, 16, M.MARBLE);
    chair(b, x, Y_FLOOR, 468, "+z");
    pendant(b, x, Y_SLAB, 481, 28, M.METAL_GREEN);
  }
  for (const [i, x] of [752, 778, 804].entries())
    b.fill(x, G + 34, Z_KITCHEN - 1, x + 14, G + 48, Z_KITCHEN, (xx, y) =>
      xx === x || xx === x + 13 || y === G + 34 || y === G + 47
        ? M.PLANKS_DARK
        : [M.PLASTER_BLUE, M.FLOWER_YELLOW, M.PLASTER_PINK][i],
    );

  for (const z of [405, 435, 465]) pendant(b, 835, Y_SLAB, z, 24);
  pendant(b, 772, Y_SLAB, 360, 26, M.METAL_GREEN);
  pottedPlant(b, 868, Y_FLOOR, 366, 10);
  pottedPlant(b, 748, Y_FLOOR, 424, 8);
}

function kitchen(b: Builder): void {
  const z0 = Z_KITCHEN + 4;
  b.fill(IX0, Y_FLOOR, z0 + 2, 754, G + 21, IZ1 - 2, (_x, _y, z) =>
    z % 12 === 0 ? M.CHROME : M.METAL,
  );
  b.fill(IX0, G + 21, z0 + 2, 755, G + 22, IZ1 - 2, M.CHROME);
  b.cylinder(748, 512, 2.5, G + 22, G + 27, M.METAL);
  b.fill(745, G + 22, 530, 753, G + 23, 542, M.PLANKS);

  b.fill(820, Y_FLOOR, 550, 860, G + 20, IZ1, M.METAL);
  for (const x of [822, 842])
    b.fill(x, Y_FLOOR + 4, 549, x + 16, G + 16, 550, M.GLASS_DARK);
  b.fill(820, G + 20, 550, 860, G + 21, IZ1, M.FRAME_DARK);
  for (const x of [828, 840, 852]) {
    b.cylinder(x, 556, 2.5, G + 21, G + 22, M.CHROME);
    b.put(x, G + 21, 556, M.FRAME_DARK);
  }
  b.cylinder(828, 556, 3, G + 22, G + 28, M.METAL);
  b.cylinder(852, 556, 3.5, G + 22, G + 26, M.CHROME);
  b.fill(818, G + 50, 548, 862, G + 56, IZ1, M.CHROME);
  b.fill(826, G + 56, 552, 854, G + 60, IZ1, M.CHROME);
  b.fill(836, G + 60, 556, 844, Y_SLAB, IZ1, M.METAL);

  b.fill(862, Y_FLOOR, z0 + 2, X_SPLIT, G + 62, 522, (_x, _y, z) =>
    z === 514 ? M.METAL : M.CHROME,
  );
  b.fill(861, G + 30, 512, 862, G + 44, 513, M.METAL);
  b.fill(861, G + 30, 516, 862, G + 44, 517, M.METAL);

  const boards = [Y_FLOOR + 10, Y_FLOOR + 22, Y_FLOOR + 34, Y_FLOOR + 46];
  b.fill(862, Y_FLOOR, 526, X_SPLIT, G + 52, 546, (x, y, z) => {
    if ((x === 862 || x === X_SPLIT - 1) && (z === 526 || z === 545))
      return M.METAL;
    return boards.includes(y) ? M.PLANKS : 0;
  });
  for (const [i, y] of boards.entries())
    goods(b, 863, y + 1, 527, X_SPLIT - 1, 545, 8, i + 50);

  b.fill(790, Y_FLOOR, 520, 830, G + 21, 536, (x, y, z) => {
    if (y === G + 20) return M.CHROME;
    const leg = (x === 790 || x === 829) && (z === 520 || z === 535);
    return leg || y === Y_FLOOR + 3 ? M.METAL : 0;
  });
  b.fill(796, G + 21, 524, 812, G + 22, 532, M.METAL);
  b.fill(797, G + 22, 525, 811, G + 23, 531, (x, _y, z) =>
    (x + z) % 3 === 0 ? 0 : M.FABRIC_YELLOW,
  );
  b.cylinder(820, 528, 3, G + 21, G + 25, M.TILE_WHITE);

  b.fill(758, Y_FLOOR, 552, 786, G + 21, IZ1, M.METAL);
  b.fill(758, G + 20, 552, 786, G + 21, IZ1, M.CHROME);
  b.fill(762, G + 17, 554, 782, G + 21, 562, 0);
  b.fill(772, G + 21, 562, 773, G + 27, 563, M.CHROME);
  b.fill(772, G + 26, 558, 773, G + 27, 562, M.CHROME);

  b.fill(790, Y_SLAB - 1, 526, 830, Y_SLAB, 532, M.CHROME);
  b.fill(792, Y_SLAB - 2, 528, 828, Y_SLAB - 1, 530, M.LAMP);
}

function gondola(
  b: Builder,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  seed: number,
): void {
  const xm = (x0 + x1) >> 1;
  const boards = [G + 6, G + 14, G + 22, G + 30, G + 38];
  b.fill(x0, Y_FLOOR, z0, x1, G + 39, z1, (x, y) => {
    if (y <= G + 6) return y === G + 6 ? M.CAR_WHITE : M.METAL;
    if (x === xm || x === xm - 1) return M.CAR_WHITE;
    return boards.includes(y) ? M.CAR_WHITE : 0;
  });
  for (const [i, y] of boards.slice(0, 4).entries()) {
    goods(b, x0, y + 1, z0, xm - 1, z1, 6, seed * 10 + i);
    goods(b, xm + 1, y + 1, z0, x1, z1, 6, seed * 10 + i + 5);
  }
  for (const z of [z0 - 1, z1])
    b.fill(x0, Y_FLOOR, z, x1, G + 44, z + 1, (_x, y) =>
      y >= G + 39 ? M.PRODUCT_RED : M.CAR_WHITE,
    );
}

function wallShelf(
  b: Builder,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  yTop: number,
  seed: number,
): void {
  for (let y = G + 6, i = 0; y < yTop; y += 8, i++) {
    b.fill(x0, y, z0, x1, y + 1, z1, M.CAR_WHITE);
    goods(b, x0, y + 1, z0, x1, z1, 6, seed + i);
  }
  b.fill(x0, Y_FLOOR, z0, x1, G + 6, z1, M.METAL);
}

function shop(b: Builder): void {
  const fx0 = 882;
  const fx1 = 962;
  const fz0 = 546;
  const shelves = [G + 8, G + 18, G + 28, G + 38, G + 48];
  b.fill(fx0, Y_FLOOR, fz0, fx1 + 4, G + 64, IZ1, (x, y, z) => {
    if (x >= fx1 || z === IZ1 - 1 || y < Y_FLOOR + 4) return M.METAL;
    if (y >= G + 56) return z === fz0 ? M.PLASTER_BLUE : M.METAL;
    const s = (x - fx0) % 16;
    if (s < 2 && z <= fz0 + 1) return M.FRAME_DARK;
    if (s === 0) return M.METAL;
    if (z === fz0) return y >= G + 54 ? M.FRAME_DARK : M.GLASS;
    if (y === G + 55 && z < fz0 + 3) return M.LAMP;
    return shelves.includes(y) ? M.METAL : 0;
  });
  for (let sx = fx0; sx < fx1; sx += 16)
    for (const [i, y] of shelves.slice(0, 4).entries())
      goods(b, sx + 1, y + 1, fz0 + 2, sx + 16, IZ1 - 1, 8, 70 + i + sx, true);
  for (let sx = fx0 + 16; sx < fx1; sx += 16)
    b.fill(sx + 1, G + 22, fz0 - 1, sx + 2, G + 40, fz0, M.CHROME);
  text(b, "FRAIS", 1, 936, G + 62, fz0 - 1, -1, 0, M.CAR_WHITE);

  box(b, 974, Y_FLOOR, 530, 990, Y_FLOOR + 12, 546);
  box(b, 976, Y_FLOOR + 12, 532, 988, Y_FLOOR + 22, 544);
  pallet(b, 972, Y_FLOOR, 548, 1004, IZ1);
  box(b, 974, Y_FLOOR + 4, 549, 988, Y_FLOOR + 16, IZ1 - 1);
  box(b, 990, Y_FLOOR + 4, 549, 1003, Y_FLOOR + 12, IZ1 - 1);
  box(b, 994, Y_FLOOR, 528, 1004, Y_FLOOR + 8, 540);

  gondola(b, 906, 916, 410, 508, 1);
  gondola(b, 934, 944, 410, 508, 2);
  gondola(b, 962, 972, 410, 508, 3);
  wallShelf(b, 882, 890, 384, 540, G + 46, 200);
  wallShelf(b, 998, IX1, 404, 516, G + 28, 300);
  b.fill(1002, G + 24, 358, IX1, G + 50, 374, (_x, y) =>
    (y - G) % 6 === 0 ? M.PLANKS_DARK : 0,
  );
  for (let y = G + 25; y < G + 49; y += 6)
    goods(b, 1002, y, 358, IX1, 374, 4, y);

  b.fill(972, Y_FLOOR, 372, 1000, G + 20, 382, (x, y) =>
    y === G + 19 ? M.FRAME_DARK : x % 7 === 0 ? M.METAL : M.CAR_WHITE,
  );
  b.fill(972, G + 20, 374, 988, G + 21, 380, M.RUBBER);
  b.fill(990, G + 20, 374, 998, G + 24, 380, M.FRAME_DARK);
  b.fill(992, G + 24, 377, 996, G + 29, 378, M.GLASS_DARK);
  b.fill(972, G + 10, 382, 990, G + 11, 386, M.CAR_WHITE);
  goods(b, 972, G + 11, 383, 990, 386, 4, 400, true);
  stool(b, 986, Y_FLOOR, 364, M.FRAME_DARK);

  b.fill(892, Y_FLOOR, 364, 940, G + 10, 372, M.PLANKS_DARK);
  b.fill(892, Y_FLOOR, 358, 940, G + 16, 364, M.PLANKS_DARK);
  const fruit = [
    M.PRODUCT_RED,
    M.PRODUCT_ORANGE,
    M.FLOWER_YELLOW,
    M.PRODUCT_GREEN,
  ];
  for (let i = 0; i < 4; i++) {
    fruitCrate(b, 892 + i * 12, G + 10, 364, 904 + i * 12, 372, fruit[i]);
    fruitCrate(b, 892 + i * 12, G + 16, 358, 904 + i * 12, 364, fruit[3 - i]);
  }
  b.fill(948, Y_FLOOR, 360, 956, Y_FLOOR + 10, 368, (x, y, z) =>
    x === 948 || x === 955 || z === 360 || z === 367 || y % 3 === 0
      ? M.PRODUCT_RED
      : 0,
  );

  for (const x of [897, 925, 953, 984]) {
    b.fill(x - 1, Y_SLAB - 1, 400, x + 3, Y_SLAB, 520, M.CHROME);
    b.fill(x, Y_SLAB - 2, 402, x + 2, Y_SLAB - 1, 518, M.LAMP);
  }
}

function flat(b: Builder): void {
  const f = Y_UPPER;
  b.fill(762, f, 384, 840, f + 1, 446, (x, _y, z) =>
    x < 765 || x >= 837 || z < 387 || z >= 443
      ? M.FABRIC_YELLOW
      : (x + z) % 12 < 2
        ? M.FABRIC_YELLOW
        : M.RUG,
  );
  b.fill(770, f, 452, 830, f + 8, 466, M.SOFA);
  b.fill(770, f + 8, 462, 830, f + 18, 466, M.SOFA);
  b.fill(770, f + 8, 452, 774, f + 12, 462, M.SOFA);
  b.fill(826, f + 8, 452, 830, f + 12, 462, M.SOFA);
  b.fill(778, f + 8, 458, 788, f + 15, 462, M.FABRIC_YELLOW);
  b.fill(812, f + 8, 458, 822, f + 15, 462, M.FABRIC_GREEN);
  b.fill(788, f, 424, 812, f + 8, 440, (x, y, z) =>
    y === f + 7 || ((x === 788 || x === 811) && (z === 424 || z === 439))
      ? M.TABLE
      : 0,
  );
  b.fill(792, f + 8, 428, 798, f + 10, 434, M.BOOKS);
  b.fill(804, f + 8, 430, 806, f + 11, 432, M.TILE_WHITE);

  b.fill(790, f, IZ0, 812, f + 10, 364, (x) =>
    x % 7 === 0 ? M.PLANKS_DARK : M.TABLE,
  );
  b.fill(792, f + 10, 360, 810, f + 24, 362, M.FRAME_DARK);
  b.fill(793, f + 11, 359, 809, f + 23, 360, M.GLASS_DARK);

  b.fill(744, f, IZ0, 760, f + 46, 364, (_x, y, z) => {
    if ((y - f) % 9 === 0 || z === IZ0) return M.PLANKS;
    const h = hash3(Math.floor(z / 2), y >> 3, 61);
    if ((y - f) % 9 > 6 + Math.floor(h * 2)) return 0;
    return [
      M.BOOKS,
      M.PRODUCT_RED,
      M.PRODUCT_BLUE,
      M.SIGN_GREEN,
      M.FABRIC_YELLOW,
    ][Math.floor(hash3(Math.floor(z / 2), y >> 3, 62) * 5)];
  });

  b.fill(746, f, 434, 760, f + 8, 450, M.FABRIC_GREEN);
  b.fill(746, f + 8, 434, 750, f + 20, 450, M.FABRIC_GREEN);
  b.fill(746, f + 8, 434, 760, f + 12, 437, M.FABRIC_GREEN);
  b.fill(746, f + 8, 447, 760, f + 12, 450, M.FABRIC_GREEN);
  b.cylinder(752, 460, 2.5, f, f + 1, M.METAL);
  b.fill(752, f + 1, 460, 753, f + 34, 461, M.METAL);
  b.cylinder(752, 460, 3.5, f + 34, f + 40, M.FABRIC_YELLOW);
  b.cylinder(752, 460, 2, f + 33, f + 34, M.LAMP);

  b.fill(852, f, 400, 896, f + 16, 420, (x, y, z) =>
    y === f + 15 || ((x === 853 || x === 894) && (z === 401 || z === 418))
      ? M.TABLE
      : 0,
  );
  for (const x of [862, 886]) {
    chair(b, x, f, 394, "+z");
    chair(b, x, f, 426, "-z");
  }
  b.cylinder(874, 410, 3, f + 16, f + 20, M.GLASS);
  b.fill(874, f + 20, 410, 875, f + 24, 411, M.FLOWER_RED);

  b.fill(950, f + 15, 454, 1000, f + 16, Z_FLAT, M.TABLE);
  for (const x of [951, 998])
    b.fill(x, f, 455, x + 1, f + 15, Z_FLAT - 1, M.TABLE);
  b.fill(966, f + 16, 464, 984, f + 28, 466, M.FRAME_DARK);
  b.fill(967, f + 17, 463, 983, f + 27, 464, M.GLASS_DARK);
  b.fill(974, f + 16, 466, 976, f + 17, 468, M.FRAME_DARK);
  b.fill(968, f + 16, 456, 982, f + 17, 459, M.CAR_WHITE);
  b.fill(988, f + 16, 458, 996, f + 20, 466, M.BOOKS);
  chair(b, 975, f, 446, "+z", M.SOFA, M.METAL);
  pottedPlant(b, 1000, f, 362, 9);
  pottedPlant(b, 840, f, 362, 7, M.TILE_WHITE);

  pendant(b, 800, Y_ROOF, 432, 22, M.FABRIC_YELLOW);
  pendant(b, 874, Y_ROOF, 410, 20);
  pendant(b, 975, Y_ROOF, 420, 22, M.METAL_GREEN);

  b.fill(778, f, 500, 830, f + 6, 540, M.TABLE);
  b.fill(780, f + 6, 502, 830, f + 10, 538, M.BED);
  b.fill(780, f + 10, 502, 814, f + 11, 538, M.SOFA);
  b.fill(818, f + 10, 506, 828, f + 13, 518, M.PILLOW);
  b.fill(818, f + 10, 522, 828, f + 13, 534, M.PILLOW);
  b.fill(828, f + 6, 498, 830, f + 26, 542, M.PLANKS_DARK);
  for (const z of [488, 542]) {
    b.fill(820, f, z, 830, f + 10, z + 10, M.PLANKS);
    b.cylinder(825, z + 5, 1.5, f + 10, f + 12, M.BRASS);
    b.cylinder(825, z + 5, 2.5, f + 12, f + 16, M.LAMP);
  }
  b.fill(744, f, 548, 770, f + 44, IZ1, (x, y) =>
    x === 757 || y === f + 43 || y === f ? M.PLANKS_DARK : M.PLANKS,
  );
  b.fill(756, f + 20, 547, 760, f + 24, 548, M.BRASS);
  b.fill(752, f, 490, 774, f + 1, 520, M.RUG);
  pendant(b, 800, Y_ROOF, 520, 18, M.FABRIC_GREEN);

  b.fill(834, f - 1, Z_FLAT + 4, 900, f, IZ1, (x, _y, z) =>
    ((x >> 1) + (z >> 1)) & 1 ? M.TILE_BLACK : M.TILE_WHITE,
  );
  b.fill(840, f, 548, 880, f + 12, IZ1, (x, y, z) =>
    x < 842 || x >= 878 || z < 550 || y < f + 2
      ? M.TILE_WHITE
      : y < f + 9
        ? M.WATER
        : 0,
  );
  b.fill(878, f + 12, 556, 879, f + 17, 557, M.CHROME);
  b.fill(875, f + 16, 556, 878, f + 17, 557, M.CHROME);
  b.fill(886, f, 498, 896, f + 8, 506, M.TILE_WHITE);
  b.fill(887, f + 8, 499, 895, f + 9, 505, M.PILLOW);
  b.fill(894, f + 9, 498, 900, f + 18, 506, M.TILE_WHITE);
  b.fill(848, f, 474, 852, f + 14, 478, M.TILE_WHITE);
  b.fill(844, f + 14, 474, 856, f + 18, 482, M.TILE_WHITE);
  b.fill(849, f + 18, 474, 851, f + 22, 476, M.CHROME);
  b.fill(844, f + 24, 474, 856, f + 40, 475, M.GLASS);
  pendant(b, 870, Y_ROOF, 488, 14, M.TILE_WHITE);

  b.fill(904, f, 480, 916, f + 17, 556, (_x, y, z) =>
    z % 12 === 0 || y === f + 2 ? M.WOOD_LIGHT : M.PLANKS,
  );
  b.fill(904, f + 17, 480, 917, f + 19, 540, M.MARBLE);
  b.fill(906, f + 18, 492, 914, f + 19, 504, M.METAL);
  b.fill(905, f + 19, 497, 906, f + 25, 498, M.CHROME);
  b.fill(906, f + 24, 497, 909, f + 25, 498, M.CHROME);
  b.fill(904, f + 17, 520, 917, f + 19, 534, M.FRAME_DARK);
  for (const z of [524, 530]) b.cylinder(910, z, 2, f + 19, f + 20, M.CHROME);
  b.fill(904, f + 30, 520, 914, f + 36, 534, M.CHROME);
  b.fill(904, f + 30, 480, 912, f + 46, 518, (_x, y, z) =>
    z % 10 === 0 || y === f + 30 ? M.WOOD_LIGHT : M.PLANKS,
  );
  b.fill(904, f, 540, 918, f + 42, 556, (_x, y) =>
    y === f + 26 ? M.CHROME : M.CAR_WHITE,
  );
  roundTable(b, 955, f, 510, 7, 16, M.TABLE, M.TABLE);
  chair(b, 943, f, 510, "+x");
  chair(b, 967, f, 510, "-x");
  pendant(b, 955, Y_ROOF, 510, 22, M.BRASS);
  b.fill(IX1 - 2, f + 20, 484, IX1, f + 21, 500, M.PLANKS);
  for (const z of [486, 490, 494, 498])
    b.fill(IX1 - 2, f + 21, z, IX1, f + 24, z + 2, M.PRODUCT_ORANGE);
}
