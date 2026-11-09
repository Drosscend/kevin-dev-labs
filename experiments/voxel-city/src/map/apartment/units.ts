import type { Builder } from "../../engine/builder";
import { M } from "../../engine/materials";
import {
  bathtub,
  bed,
  bookshelf,
  boxes,
  ceilingLamp,
  coffeeTable,
  desk,
  diningSet,
  FABRICS,
  floorLamp,
  fridge,
  kitchenRun,
  nightstand,
  officeChair,
  picture,
  plant,
  rug,
  sofa,
  toilet,
  tvUnit,
  wallCabinets,
  wardrobe,
  washbasin,
  washingMachine,
} from "./furniture";
import { LEVELS, makeUnit, pick, type Unit } from "./plan";

const WOODS = [M.PLANKS, M.WOOD_LIGHT, M.PLANKS_DARK, M.PLANKS] as const;
const BLANKETS = [
  M.FABRIC_GREEN,
  M.RUG,
  M.SOFA,
  M.FABRIC_YELLOW,
  M.PLASTER_BLUE,
  M.PLASTER_PINK,
] as const;
const CANVASES = [
  M.PLASTER_BLUE,
  M.FABRIC_YELLOW,
  M.LEAVES_C,
  M.PRODUCT_RED,
  M.SIGN_GREEN,
  M.PLASTER_PINK,
] as const;
const POTS = [M.BRICK_C, M.TILE_WHITE, M.TILE_BLACK, M.CONCRETE] as const;

export function units(b: Builder): void {
  for (let k = 0; k < LEVELS; k++)
    for (let s = 0; s < 2; s++) unit(makeUnit(b, k, s));
}

function unit(un: Unit): void {
  const wood = pick(WOODS, un.rnd(1));
  floors(un, wood);
  partitions(un);
  entrance(un);
  living(un);
  kitchen(un);
  bathroom(un);
  hall(un);
  master(un);
  smallRoom(un);
}

function floors(un: Unit, wood: number): void {
  const seam = wood === M.PLANKS_DARK ? M.TRUNK : M.PLANKS_DARK;
  const parquet = (x: number, _y: number, z: number) =>
    (z + (x >> 2) * 7) % 24 === 0 || x % 4 === 0 ? seam : wood;
  un.box(36, -1, 336, 150, 0, 470, parquet);
  un.box(36, -1, 470, 178, 0, 684, parquet);
  const tile = pick([M.TILE_BLACK, M.STONE, M.PLASTER_BLUE], un.rnd(2));
  un.box(36, -1, 470, 120, 0, 580, (x, _y, z) =>
    ((Math.floor(x / 6) + Math.floor(z / 6)) & 1) === 0 ? M.TILE_WHITE : tile,
  );
  un.box(124, -1, 470, 178, 0, 540, (x, _y, z) =>
    x % 4 === 0 || z % 4 === 0 ? M.TILE_BLACK : M.MARBLE,
  );
}

function doorLeaf(
  un: Unit,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  un.box(x0, 0, z0, x1, 43, z1, (x, y, z) => {
    const ly = y - un.f;
    const along = x1 - x0 > z1 - z0 ? x : z;
    return ly === 12 || ly === 30 || along % 9 === 0 ? M.PLANKS_DARK : M.DOOR;
  });
}

/** Doorway in a wall running along x (wall z wz..wz+4), opening x a..c. */
function doorZ(
  un: Unit,
  wz: number,
  a: number,
  c: number,
  leaf: -1 | 0 | 1,
): void {
  un.box(a - 1, 0, wz, c + 1, 46, wz + 4, M.FRAME);
  un.box(a, 0, wz, c, 45, wz + 4, M.AIR);
  const len = c - a - 2;
  if (leaf === 1) doorLeaf(un, a, wz + 4, a + 2, wz + 4 + len);
  if (leaf === -1) doorLeaf(un, a, wz - len, a + 2, wz);
  if (leaf !== 0) {
    const kz = leaf === 1 ? wz + 4 + len - 3 : wz - len + 2;
    un.box(a - 1, 22, kz, a + 3, 23, kz + 1, M.BRASS);
  }
}

/** Doorway in a wall running along z (wall x wx..wx+4), opening z a..c, leaf swung toward +x. */
function doorX(un: Unit, wx: number, a: number, c: number): void {
  un.box(wx, 0, a - 1, wx + 4, 46, c + 1, M.FRAME);
  un.box(wx, 0, a, wx + 4, 45, c, M.AIR);
  doorLeaf(un, wx + 4, a, wx + 2 + c - a, a + 2);
}

function partitions(un: Unit): void {
  const w = un.wall;
  un.box(36, 0, 466, 150, un.h, 470, w);
  un.box(120, 0, 470, 124, un.h, 580, w);
  un.box(124, 0, 540, 178, un.h, 544, w);
  un.box(36, 0, 580, 178, un.h, 584, w);
  un.box(110, 0, 584, 114, un.h, 684, w);

  const tile = (x: number, y: number, z: number) =>
    y - un.f >= 34 && y - un.f < 36
      ? M.TILE_BLACK
      : y - un.f >= 36
        ? un.wall
        : (x + z) % 5 === 0 || (y - un.f) % 5 === 0
          ? M.MORTAR
          : M.TILE_WHITE;
  un.box(123, 0, 470, 124, un.h, 540, tile);
  un.box(178, 0, 470, 179, un.h, 540, tile);
  un.box(124, 0, 469, 178, un.h, 470, tile);
  un.box(124, 0, 540, 178, un.h, 541, tile);

  doorZ(un, 466, 90, 114, 0);
  doorX(un, 120, 548, 568);
  doorZ(un, 540, 150, 168, -1);
  doorZ(un, 580, 70, 88, 1);
  doorZ(un, 580, 140, 158, 1);
}

function entrance(un: Unit): void {
  un.box(150, 0, 338, 154, 48, 362, M.FRAME);
  un.box(150, 0, 340, 154, 46, 360, M.AIR);
  if (un.rnd(3) < 0.35) {
    doorLeaf(un, 131, 357, 150, 359);
    un.box(133, 22, 356, 134, 23, 360, M.BRASS);
  } else {
    un.box(151, 0, 340, 153, 46, 360, (_x, y, z) =>
      y - un.f === 14 || y - un.f === 32 || z === 345 || z === 354
        ? M.PLANKS_DARK
        : M.DOOR,
    );
    un.box(150, 22, 356, 151, 23, 358, M.BRASS);
    un.box(153, 22, 356, 154, 23, 358, M.BRASS);
    un.box(153, 36, 349, 154, 37, 351, M.CHROME);
  }
  un.box(154, 50, 346, 155, 54, 354, M.BRASS);
  un.box(154, 0, 342, 162, 1, 358, M.RUBBER);
}

function living(un: Unit): void {
  const fabric = pick(FABRICS, un.rnd(10));
  const accent = pick([M.PILLOW, M.FABRIC_YELLOW, M.RUG], un.rnd(11));
  const wood = pick(WOODS, un.rnd(12));
  const rugA = pick([M.RUG, M.SOFA, M.FABRIC_GREEN, M.BED], un.rnd(13));
  const rugB = pick([M.FABRIC_YELLOW, M.PILLOW, M.PLANKS_DARK], un.rnd(14));
  const pot = pick(POTS, un.rnd(15));
  if (un.rnd(16) < 0.5) {
    rug(un, 58, 384, 104, 442, rugA, rugB);
    sofa(un, 38, 386, "+x", 48, fabric, accent);
    coffeeTable(un, 66, 398, "+x", 24, 14, wood);
    tvUnit(un, 142, 390, "-x", 40, wood);
    floorLamp(un, 39, 437);
    picture(un, 36, 26, 390, 37, 40, 410, pick(CANVASES, un.rnd(17)));
    diningSet(un, 96, 372, 28, 18, wood, fabric);
  } else {
    rug(un, 84, 380, 132, 440, rugA, rugB);
    sofa(un, 134, 384, "-x", 48, fabric, accent);
    coffeeTable(un, 102, 396, "-x", 24, 14, wood);
    tvUnit(un, 36, 386, "+x", 24, wood);
    floorLamp(un, 128, 436);
    diningSet(un, 50, 348, 30, 18, wood, fabric);
    picture(un, 149, 28, 400, 150, 42, 420, pick(CANVASES, un.rnd(17)));
  }
  if (un.rnd(18) < 0.7) bookshelf(un, 40, 460, "-z", 46, 40, wood);
  else {
    piano(un);
    aquarium(un, wood);
  }
  plant(un, 38, 340, pot, true);
  plant(un, 140, 440, pot, false);
  ceilingLamp(un, 90, 410);
}

function piano(un: Unit): void {
  un.box(40, 0, 456, 74, 30, 466, M.TILE_BLACK);
  un.box(40, 16, 452, 74, 18, 456, M.TILE_BLACK);
  un.box(41, 17, 452, 73, 18, 455, (x) =>
    x % 3 === 0 ? M.TILE_BLACK : M.PILLOW,
  );
  un.box(40, 0, 452, 42, 16, 454, M.TILE_BLACK);
  un.box(72, 0, 452, 74, 16, 454, M.TILE_BLACK);
  un.box(48, 0, 444, 64, 10, 450, M.TILE_BLACK);
}

function aquarium(un: Unit, wood: number): void {
  un.box(76, 0, 456, 88, 12, 466, wood);
  un.box(77, 12, 457, 87, 22, 465, M.GLASS);
  un.box(78, 12, 458, 86, 19, 464, M.WATER);
  un.box(80, 14, 460, 82, 15, 461, M.PRODUCT_ORANGE);
  un.box(84, 16, 462, 85, 17, 463, M.PRODUCT_ORANGE);
}

function kitchen(un: Unit): void {
  const cab = pick(
    [M.FRAME, M.WOOD_LIGHT, M.METAL_GREEN, M.PLANKS_DARK, M.PLASTER_BLUE],
    un.rnd(20),
  );
  const top = pick([M.MARBLE, M.TILE_BLACK, M.PLANKS, M.CONCRETE], un.rnd(21));
  un.box(35, 18, 474, 36, 22, 562, M.TILE_WHITE);
  un.box(35, 22, 474, 36, 30, 498, M.TILE_WHITE);
  un.box(35, 22, 530, 36, 30, 562, M.TILE_WHITE);
  kitchenRun(un, 36, 474, "+x", 86, cab, top, 40, 12);
  wallCabinets(un, 36, 474, "+x", 24, cab);
  wallCabinets(un, 36, 549, "+x", 13, cab);
  fridge(un, 36, 563, "+x", un.rnd(22) < 0.5 ? M.CAR_WHITE : M.CHROME);
  const wood = pick(WOODS, un.rnd(23));
  if (un.rnd(24) < 0.45) {
    kitchenRun(un, 108, 474, "-x", 56, cab, top, -1, -1);
    diningSet(un, 60, 506, 30, 18, wood, pick(FABRICS, un.rnd(25)));
  } else diningSet(un, 62, 502, 32, 20, wood, pick(FABRICS, un.rnd(25)));
  un.box(100, 0, 568, 108, 12, 576, M.METAL);
  un.box(100, 12, 568, 108, 13, 576, M.CHROME);
  ceilingLamp(un, 76, 512);
}

function bathroom(un: Unit): void {
  bathtub(un, 146, 470, "+z");
  toilet(un, 124, 496, "+x");
  washbasin(un, 124, 510, "+x");
  washingMachine(un, 166, 524, "-x");
  un.box(
    140,
    0,
    500,
    156,
    1,
    510,
    pick([M.PLASTER_BLUE, M.FABRIC_GREEN, M.PILLOW], un.rnd(30)),
  );
  un.box(124, 30, 528, 125, 31, 538, M.CHROME);
  un.box(
    125,
    18,
    529,
    126,
    31,
    537,
    pick([M.RUG, M.FABRIC_YELLOW, M.SOFA], un.rnd(31)),
  );
  ceilingLamp(un, 150, 505);
}

function hall(un: Unit): void {
  un.box(130, 0, 552, 172, 1, 574, M.RUG);
  un.box(166, 0, 546, 178, 10, 566, M.PLANKS);
  un.box(166, 10, 546, 178, 11, 566, M.PLANKS_DARK);
  for (let z = 548; z < 578; z += 8) {
    un.box(177, 36, z, 178, 37, z + 2, M.CHROME);
    if (un.rnd(z) < 0.6)
      un.box(173, 20, z - 1, 177, 37, z + 3, pick(FABRICS, un.rnd(z + 1)));
  }
  ceilingLamp(un, 150, 560);
}

function master(un: Unit): void {
  const wood = pick(WOODS, un.rnd(40));
  bed(un, 70, 618, "-x", 32, 40, pick(BLANKETS, un.rnd(41)), wood);
  nightstand(un, 100, 608, "-x", wood, true);
  nightstand(un, 100, 652, "-x", wood, un.rnd(42) < 0.5);
  wardrobe(un, 38, 584, "+z", 28, pick(WOODS, un.rnd(43)));
  rug(
    un,
    48,
    612,
    70,
    656,
    pick([M.BED, M.FABRIC_YELLOW, M.RUG], un.rnd(44)),
    M.PILLOW,
  );
  un.box(90, 0, 674, 108, 16, 684, wood);
  un.box(90, 7, 683, 108, 8, 684, M.PLANKS_DARK);
  un.box(92, 16, 678, 96, 22, 682, M.PRODUCT_BLUE);
  un.box(100, 16, 677, 104, 18, 681, M.BOOKS);
  picture(un, 109, 30, 624, 110, 42, 644, pick(CANVASES, un.rnd(45)));
  plant(un, 38, 676, pick(POTS, un.rnd(46)), un.rnd(47) < 0.5);
  ceilingLamp(un, 72, 634);
}

function smallRoom(un: Unit): void {
  const v = un.rnd(50);
  const wood = pick(WOODS, un.rnd(51));
  if (v < 0.4) {
    bed(un, 138, 650, "-x", 20, 40, pick(BLANKETS, un.rnd(52)), wood);
    desk(un, 114, 600, "+x", 28, wood);
    officeChair(un, 128, 610, "-x", M.RUG);
    rug(un, 126, 596, 166, 640, M.PLASTER_BLUE, M.FABRIC_YELLOW);
    const toys = [
      M.PRODUCT_RED,
      M.PRODUCT_BLUE,
      M.PRODUCT_GREEN,
      M.FABRIC_YELLOW,
    ];
    for (let i = 0; i < 9; i++) {
      const x = 134 + Math.floor(un.rnd(60 + i) * 26);
      const z = 602 + Math.floor(un.rnd(70 + i) * 30);
      const h = 1 + Math.floor(un.rnd(80 + i) * 3);
      un.box(x, 1, z, x + 3, 1 + h * 2, z + 3, pick(toys, un.rnd(90 + i)));
    }
    bookshelf(un, 158, 678, "-z", 18, 22, M.FRAME);
  } else if (v < 0.8) {
    desk(un, 130, 672, "-z", 36, wood);
    officeChair(un, 144, 660, "+z", M.TILE_BLACK);
    bookshelf(un, 114, 596, "+x", 60, 44, wood);
    sofa(un, 160, 600, "-x", 18, pick(FABRICS, un.rnd(53)), M.PILLOW);
    floorLamp(un, 170, 622);
    rug(un, 128, 610, 158, 650, M.RUG, M.FABRIC_YELLOW);
  } else {
    boxes(un, 118, 590, 3);
    boxes(un, 134, 592, 2);
    boxes(un, 160, 660, 4);
    boxes(un, 118, 664, 2);
    bed(un, 140, 610, "-x", 20, 38, M.BED, M.FRAME);
  }
  plant(un, 172, 588, pick(POTS, un.rnd(54)), false);
  ceilingLamp(un, 146, 634);
}
