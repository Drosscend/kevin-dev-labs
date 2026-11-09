import type { Builder } from "../engine/builder";
import { M } from "../engine/materials";
import { G, SIDEWALK_TOP, ZONES } from "./layout";
import { type CarSpec, car, hatchback, sedan, van } from "./props/car";
import {
  bikeRack,
  bollard,
  busShelter,
  hydrant,
  mailbox,
  sign,
  streetTree,
  trafficLight,
} from "./props/fixtures";
import { bench, bin, streetLamp } from "./props/furniture";
import { Local } from "./props/local";

const S = SIDEWALK_TOP;
const SOUTH_CURB = ZONES.road.z0 + 2;
const NORTH_CURB = ZONES.road.z1 - 2;

/** Street furniture, parked cars and street trees. */
export function props(b: Builder): void {
  roadDetails(b);
  parkedCars(b);
  southSidewalk(b);
  northSidewalk(b);
}

function parkedCars(b: Builder): void {
  const south: [number, CarSpec][] = [
    [60, hatchback(M.CAR_YELLOW)],
    [250, sedan(M.CAR_BLUE)],
    [880, van(M.CAR_WHITE, M.CAR_BLUE)],
  ];
  for (const [x0, spec] of south)
    car(
      new Local(b, x0 + spec.length - 1, G, SOUTH_CURB + spec.width - 1, 2),
      spec,
    );
  const north: [number, CarSpec][] = [
    [110, sedan(M.CAR_WHITE)],
    [300, hatchback(M.CAR_RED)],
    [600, sedan(M.CAR_YELLOW, true)],
    [820, sedan(M.CAR_RED)],
  ];
  for (const [x0, spec] of north)
    car(new Local(b, x0, G, NORTH_CURB - spec.width, 0), spec);
}

function roadDetails(b: Builder): void {
  for (let x = 640; x < 800; x++) {
    const tri = Math.abs(((x - 640) % 24) - 12);
    const z = SOUTH_CURB + 1 + tri;
    b.fill(x, G - 1, z, x + 1, G, z + 2, M.ROAD_LINE);
  }
  for (const [cx, cz] of [
    [300, 140],
    [760, 100],
  ])
    for (let dz = -6; dz <= 6; dz++)
      for (let dx = -6; dx <= 6; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > 6.3) continue;
        const ring = d > 5.2 || (dx + dz) % 3 === 0;
        b.put(cx + dx, G - 1, cz + dz, ring ? M.METAL : M.CONCRETE_DARK);
      }
  for (const [x, z] of [
    [200, ZONES.road.z0],
    [700, ZONES.road.z1 - 4],
  ])
    b.fill(x, G - 1, z, x + 16, G, z + 4, (px, _y, pz) =>
      (px + pz) % 2 === 0 ? M.METAL : 0,
    );
}

function southSidewalk(b: Builder): void {
  for (const x of [90, 350, 610, 980]) streetLamp(b, x, S, 52, "+z");
  for (const [x, leaves] of [
    [300, [M.LEAVES_A, M.LEAVES_B]],
    [400, [M.LEAVES_B, M.LEAVES_C]],
    [900, [M.LEAVES_A, M.LEAVES_C]],
  ] as const)
    streetTree(b, x, S, 44, 52, 24, leaves);

  bench(b, 136, S, 9, "+z");
  bin(b, 162, S, 8);
  hydrant(b, 240, S, 52);

  for (const x of [438, 450]) bollard(b, x, S, 55);
  for (const x of [556, 568, 580]) bollard(b, x, S, 55);
  sign(b, 594, S, 54, "+x", "crossing");
  trafficLight(b, 545, S, 55, "+z");
  bin(b, 440, S, 42);

  busShelter(b, 660, 780, S, 4);
  sign(b, 792, S, 52, "+x", "bus");
  sign(b, 640, S, 54, "+x", "noParking");
  bin(b, 800, S, 12);
}

function northSidewalk(b: Builder): void {
  for (const x of [200, 620, 860]) streetLamp(b, x, S, 228, "-z");
  for (const [x, leaves] of [
    [100, [M.LEAVES_A, M.LEAVES_B]],
    [330, [M.LEAVES_C, M.LEAVES_A]],
    [780, [M.LEAVES_B, M.LEAVES_A]],
    [980, [M.LEAVES_A, M.LEAVES_B]],
  ] as const)
    streetTree(b, x, S, 236, 52, 24, leaves);

  trafficLight(b, 463, S, 224, "-z");
  for (const x of [552, 564, 576]) bollard(b, x, S, 224);
  sign(b, 410, S, 226, "-x", "crossing");
  hydrant(b, 160, S, 226);
  bikeRack(b, 250, S, 258, "+z", 5);
  mailbox(b, 640, S, 270, "-z");
  bench(b, 916, S, 270, "-z");
  bin(b, 944, S, 272);
}
