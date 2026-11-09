import { type Builder, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { chair, plant } from "./furniture";
import { floorY, LEVELS, makeUnit, pick, type Unit, Z0, Z1 } from "./plan";

const BX0 = 38;
const BX1 = 146;
const BZ0 = Z0 - 24;

/** Cantilevered front balconies on every upper level, each one dressed differently. */
export function balconies(b: Builder): void {
  for (let k = 1; k < LEVELS; k++)
    for (let s = 0; s < 2; s++) balcony(makeUnit(b, k, s));
}

function balcony(un: Unit): void {
  const deck = pick(
    [M.TILE_WHITE, M.PLANKS, M.CONCRETE, M.TILE_BLACK],
    un.rnd(100),
  );
  un.box(BX0, -4, BZ0, BX1, 0, Z0, M.CONCRETE);
  un.box(BX0 + 1, -1, BZ0 + 1, BX1 - 1, 0, Z0, (x, _y, z) =>
    deck === M.PLANKS && x % 4 === 0
      ? M.PLANKS_DARK
      : deck === M.TILE_WHITE && (x + z) % 6 === 0
        ? M.MORTAR
        : deck,
  );
  un.box(BX0, -5, BZ0, BX1, -4, BZ0 + 1, M.CONCRETE_DARK);

  const style = Math.floor(un.rnd(101) * 3);
  const rail = pick([M.METAL, M.FRAME_DARK, M.CHROME], un.rnd(102));
  const edges: [number, number, number, number][] = [
    [BX0, BZ0, BX1, BZ0 + 1],
    [BX0, BZ0, BX0 + 1, Z0],
    [BX1 - 1, BZ0, BX1, Z0],
  ];
  for (const [x0, z0, x1, z1] of edges) {
    if (style === 0) {
      un.box(x0, 0, z0, x1, 20, z1, (x, y, z) =>
        (x + z) % 3 === 0 || y - un.f < 2 ? rail : M.AIR,
      );
      un.box(x0, 20, z0, x1, 22, z1, rail);
    } else if (style === 1) {
      un.box(x0, 0, z0, x1, 2, z1, M.CHROME);
      un.box(x0, 2, z0, x1, 19, z1, (x, _y, z) =>
        (x + z) % 18 === 0 ? M.CHROME : M.GLASS,
      );
      un.box(x0, 19, z0, x1, 21, z1, M.CHROME);
    } else {
      un.box(x0, 0, z0, x1, 15, z1, M.PLASTER);
      un.box(x0, 15, z0, x1, 16, z1, M.CONCRETE);
      un.box(x0, 16, z0, x1, 22, z1, (x, y, z) =>
        (x + z) % 6 === 0 || y - un.f === 21 ? rail : M.AIR,
      );
    }
  }
  un.box(BX0, 0, BZ0, BX0 + 1, 22, BZ0 + 1, rail);
  un.box(BX1 - 1, 0, BZ0, BX1, 22, BZ0 + 1, rail);

  if (style !== 2 && un.rnd(103) < 0.6) {
    for (const x of [BX0 + 8, BX0 + 60]) {
      un.box(x, 13, BZ0 + 1, x + 28, 18, BZ0 + 5, M.PLANKS_DARK);
      un.box(x + 1, 17, BZ0 + 2, x + 27, 18, BZ0 + 4, M.DIRT);
      for (let i = 1; i < 27; i += 2) {
        const r = hash3(x + i, un.k, un.s);
        un.box(
          x + i,
          18,
          BZ0 + 2,
          x + i + 1,
          19 + Math.floor(r * 3),
          BZ0 + 4,
          r < 0.5
            ? M.LEAVES_A
            : pick([M.FLOWER_RED, M.FLOWER_YELLOW, M.FLOWER_PURPLE], r * 2 - 1),
        );
      }
    }
  }

  const v = Math.floor(un.rnd(104) * 5);
  const seat = pick([M.FABRIC_YELLOW, M.RUG, M.FABRIC_GREEN], un.rnd(105));
  if (v === 0 || v === 3) {
    un.box(56, 0, BZ0 + 10, 58, 10, BZ0 + 12, M.METAL);
    un.box(52, 10, BZ0 + 6, 62, 11, BZ0 + 16, M.FRAME);
    chair(un, 42, BZ0 + 7, "+x", M.METAL, seat);
    chair(un, 64, BZ0 + 7, "-x", M.METAL, seat);
    un.box(55, 11, BZ0 + 9, 57, 13, BZ0 + 11, M.TILE_WHITE);
  }
  if (v === 1) {
    for (const z of [BZ0 + 8, BZ0 + 18]) {
      un.box(42, 22, z, 79, 24, z + 1, M.CHROME);
      for (const x of [42, 54, 66, 78])
        un.box(x, 0, z, x + 1, 24, z + 1, M.CHROME);
    }
    const cloth = [
      M.PILLOW,
      M.PLASTER_BLUE,
      M.RUG,
      M.FABRIC_YELLOW,
      M.BED,
      M.SOFA,
    ];
    for (let i = 0; i < 6; i++) {
      const x = 44 + i * 6;
      un.box(x, 12 + (i % 2) * 3, BZ0 + 8, x + 5, 22, BZ0 + 9, cloth[i]);
      un.box(
        x,
        14 + (i % 3) * 2,
        BZ0 + 18,
        x + 5,
        22,
        BZ0 + 19,
        cloth[(i + 3) % 6],
      );
    }
  }
  if (v === 2) {
    un.box(44, 0, BZ0 + 6, 46, 14, BZ0 + 8, M.METAL);
    un.box(56, 0, BZ0 + 6, 58, 14, BZ0 + 8, M.METAL);
    un.box(50, 0, BZ0 + 14, 52, 14, BZ0 + 16, M.METAL);
    un.box(43, 14, BZ0 + 5, 59, 20, BZ0 + 17, M.TILE_BLACK);
    un.box(44, 20, BZ0 + 6, 58, 21, BZ0 + 16, M.METAL);
    un.box(43, 20, BZ0 + 16, 59, 28, BZ0 + 17, M.TILE_BLACK);
  }
  if (v === 3 || v === 4) {
    un.box(118, 0, BZ0 + 10, 136, 12, Z0, (x, y) =>
      x === 118 && y - un.f > 1 && y - un.f < 11 ? M.METAL : M.CAR_WHITE,
    );
    un.box(117, 2, BZ0 + 12, 118, 10, Z0 - 2, (_x, y, z) =>
      (y + z) % 2 === 0 ? M.METAL : M.FRAME_DARK,
    );
  }
  if (v === 4) {
    const wx = 70;
    un.box(wx, 0, BZ0 + 4, wx + 2, 28, BZ0 + 6, M.METAL);
    un.box(wx - 4, 22, BZ0 + 2, wx + 6, 32, BZ0 + 3, M.CHROME);
    un.box(wx - 3, 23, BZ0 + 3, wx + 5, 31, BZ0 + 4, M.CHROME);
    un.box(wx, 26, BZ0 + 1, wx + 2, 28, BZ0 + 2, M.FRAME_DARK);
  }
  const pot = pick([M.BRICK_C, M.TILE_WHITE, M.CONCRETE], un.rnd(106));
  plant(un, BX1 - 8, BZ0 + 3, pot, un.rnd(107) < 0.5);
  if (un.rnd(108) < 0.6) plant(un, 82, BZ0 + 3, M.BRICK_C, false);
}

const FX0 = 44;
const FX1 = 150;
const FZ1 = Z1 + 32;
const LANE0 = Z1 + 18;
const STAIR_X = 70;

/** Black steel fire escape on the back of the west units, with stairs between platforms. */
export function fireEscape(b: Builder): void {
  const grate = (x: number, _y: number, z: number) =>
    (x + z) % 3 === 0 ? M.FRAME_DARK : M.METAL;
  for (let k = 1; k < LEVELS; k++) {
    const f = floorY(k);
    b.fill(FX0, f - 2, Z1, FX1, f, FZ1, grate);
    if (k > 1)
      b.fill(STAIR_X + 22, f - 2, LANE0, STAIR_X + 56, f, FZ1 - 1, M.AIR);
    b.fill(FX0, f + 20, FZ1 - 1, FX1, f + 22, FZ1, M.METAL);
    for (let x = FX0; x < FX1; x += 4)
      b.fill(x, f, FZ1 - 1, x + 1, f + 20, FZ1, M.METAL);
    for (const x of [FX0, FX1 - 1]) {
      b.fill(x, f + 20, Z1, x + 1, f + 22, FZ1, M.METAL);
      for (let z = Z1; z < FZ1; z += 4)
        b.fill(x, f, z, x + 1, f + 20, z + 1, M.METAL);
    }
    for (const x of [FX0 + 2, 106, 128])
      b.line(x, f - 3, FZ1 - 2, x, f - 26, Z1, 1, M.FRAME_DARK);
    if (k === LEVELS - 1) continue;
    for (let i = 0; i < 10; i++) {
      const x = STAIR_X + 6 * i;
      const top = f + 6 * (i + 1);
      b.fill(x, top - 2, LANE0 + 1, x + 6, top, LANE0 + 11, grate);
    }
    for (let x = STAIR_X; x < STAIR_X + 60; x++) {
      const yc = f + (x - STAIR_X);
      b.fill(x, yc - 3, LANE0, x + 1, yc + 4, LANE0 + 1, M.METAL);
      b.fill(x, yc - 3, LANE0 + 11, x + 1, yc + 4, LANE0 + 12, M.METAL);
      b.fill(x, yc + 18, LANE0 + 12, x + 1, yc + 20, LANE0 + 13, M.METAL);
      if ((x - STAIR_X) % 14 === 2)
        b.fill(x, yc - 3, LANE0 + 12, x + 1, yc + 18, LANE0 + 13, M.METAL);
    }
  }
  const f1 = floorY(1);
  for (const x of [136, 144])
    b.fill(x, f1 - 40, FZ1 - 4, x + 1, f1 - 2, FZ1 - 3, M.METAL);
  for (let y = f1 - 38; y < f1 - 2; y += 6)
    b.fill(137, y, FZ1 - 4, 144, y + 1, FZ1 - 3, M.METAL);
}
