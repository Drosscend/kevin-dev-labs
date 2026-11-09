import { type Builder, brick } from "../engine/builder";
import { M } from "../engine/materials";
import { G } from "./layout";
import { birch, conifer, flowerBed, hedge, willow } from "./park/flora";
import { gazebo } from "./park/gazebo";
import { paintGround } from "./park/ground";
import { playground } from "./park/playground";
import { fountain, pond } from "./park/water";
import { bench, bin, parkLamp } from "./props/furniture";
import { Local } from "./props/local";

const FOUNTAIN = { cx: 350, cz: 890, r: 62 };
const PLAZA = { cx: 520, cz: 900, r: 58 };
const GAZEBO = { cx: 720, cz: 866 };
const POND = { cx: 940, cz: 956 };

const WARM = [M.FLOWER_RED, M.FLOWER_YELLOW, M.FLOWER_RED, M.LEAVES_C];
const COOL = [
  M.FLOWER_PURPLE,
  M.FLOWER_WHITE,
  M.FLOWER_PURPLE,
  M.FLOWER_YELLOW,
];
const MIXED = [M.FLOWER_RED, M.FLOWER_YELLOW, M.FLOWER_PURPLE, M.FLOWER_WHITE];

/** Park along the back of the block. */
export function park(b: Builder): void {
  paintGround(
    b,
    [
      {
        width: 13,
        points: [
          [-20, 950],
          [60, 958],
          [150, 955],
          [230, 936],
          [300, 900],
          [350, 890],
          [410, 884],
          [470, 897],
          [520, 900],
          [575, 904],
          [630, 932],
          [700, 950],
          [780, 948],
          [850, 918],
          [910, 898],
          [980, 894],
          [1044, 902],
        ],
      },
      {
        width: 10,
        points: [
          [280, 800],
          [300, 812],
          [342, 831],
        ],
      },
      {
        width: 11,
        points: [
          [520, 800],
          [520, 850],
        ],
      },
      {
        width: 10,
        points: [
          [880, 800],
          [876, 850],
          [866, 905],
        ],
      },
      {
        width: 8,
        points: [
          [101, 910],
          [100, 950],
        ],
      },
      {
        width: 9,
        points: [
          [720, 915],
          [720, 950],
        ],
      },
      {
        width: 8,
        points: [
          [940, 900],
          [940, 916],
        ],
      },
    ],
    [FOUNTAIN, PLAZA],
  );
  walls(b);
  playground(b);
  fountain(b, FOUNTAIN.cx, FOUNTAIN.cz);
  gazebo(b, GAZEBO.cx, GAZEBO.cz);
  pond(b, POND.cx, POND.cz, 52, 34);
  gardens(b);
  furniture(b);
  trees(b);
}

function walls(b: Builder): void {
  const gates = [
    [262, 298],
    [500, 540],
    [860, 900],
  ];
  wallRun(new Local(b, 0, G, 800, 0), 0, 1024, gates);
  wallRun(new Local(b, 1023, G, 1023, 2), 0, 1024, []);
  wallRun(new Local(b, 0, G, 1023, 3), 5, 219, []);
  wallRun(new Local(b, 1023, G, 0, 1), 805, 1019, []);
}

function wallRun(f: Local, u0: number, u1: number, gates: number[][]): void {
  const inGate = (u: number) => gates.some(([a, c]) => u >= a && u < c);
  for (let u = u0; u < u1; u++) {
    if (inGate(u)) continue;
    for (let h = -1; h < 8; h++)
      for (let v = 1; v < 4; v++)
        f.put(u, h, v, brick(u, h + 4, [M.STONE, M.BRICK_GREY, M.STONE]));
    f.fill(u, 8, 0, u + 1, 10, 5, M.CONCRETE);
    f.put(u, 12, 2, M.METAL);
    f.put(u, 28, 2, M.METAL);
    if (u % 5 === 0) {
      f.fill(u, 10, 2, u + 1, 30, 3, M.METAL);
      f.put(u, 30, 2, M.BRASS);
    }
  }
  const pillars = new Set<number>([u0, u1 - 8]);
  for (const [a, c] of gates) {
    pillars.add(a - 8);
    pillars.add(c);
  }
  for (let u = u0 + 120; u < u1 - 60; u += 120)
    if (![...pillars].some((p) => Math.abs(p - u) < 40)) pillars.add(u);
  for (const p of pillars) {
    f.fill(p, -1, 0, p + 8, 34, 8, M.STONE);
    f.fill(p, 0, 0, p + 8, 34, 8, (u, h) =>
      brick(u, h, [M.STONE, M.BRICK_GREY, M.CONCRETE_DARK]),
    );
    f.fill(p - 1, 34, -1, p + 9, 36, 9, M.CONCRETE);
    f.fill(p + 2, 36, 2, p + 6, 38, 6, M.CONCRETE);
    f.fill(p + 3, 38, 3, p + 5, 40, 5, M.METAL);
  }
}

function gardens(b: Builder): void {
  hedge(b, 6, 1004, 1018, 1016, 18);
  hedge(b, 246, 808, 254, 904, 13);
  const { cx, cz } = PLAZA;
  hedge(b, cx - 90, cz, cx + 90, cz + 90, 11, (x, z) => {
    const d = Math.hypot(x - cx, z - cz);
    const a = (Math.atan2(z - cz, x - cx) * 180) / Math.PI;
    return d >= 80 && d < 86 && a > 35 && a < 145;
  });

  const sector =
    (
      ox: number,
      oz: number,
      r0: number,
      r1: number,
      center: number,
      half: number,
    ) =>
    (x: number, z: number) => {
      const d = Math.hypot(x - ox, z - oz);
      const a = (Math.atan2(z - oz, x - ox) * 180) / Math.PI;
      const da = Math.abs(((a - center + 540) % 360) - 180);
      return d >= r0 && d < r1 && da < half;
    };
  [45, 135, 225, 315].forEach((a, i) => {
    flowerBed(
      b,
      cx - 80,
      cz - 80,
      cx + 80,
      cz + 80,
      i % 2 ? WARM : COOL,
      sector(cx, cz, 61, 74, a, 24),
    );
    const f = FOUNTAIN;
    flowerBed(
      b,
      f.cx - 80,
      f.cz - 80,
      f.cx + 80,
      f.cz + 80,
      i % 2 ? COOL : MIXED,
      sector(f.cx, f.cz, 65, 75, a, 18),
    );
  });
  for (const [x0, x1, pal] of [
    [316, 480, WARM],
    [560, 650, MIXED],
    [780, 850, COOL],
    [912, 1012, WARM],
  ] as const)
    flowerBed(b, x0, 808, x1, 818, pal);
  const g = GAZEBO;
  for (const [x0, z0, x1, z1] of [
    [g.cx - 56, g.cz + 50, g.cx - 22, g.cz + 60],
    [g.cx + 22, g.cz + 50, g.cx + 56, g.cz + 60],
  ])
    flowerBed(b, x0, z0, x1, z1, MIXED);
  flowerBed(
    b,
    970,
    842,
    1010,
    882,
    COOL,
    (x, z) => Math.hypot(x - 990, z - 862) < 16,
  );
}

function furniture(b: Builder): void {
  const f = FOUNTAIN;
  bench(b, f.cx, G, f.cz + 52, "-z");
  bench(b, f.cx, G, f.cz - 52, "+z");
  bin(b, f.cx + 24, G, f.cz + 52);
  bin(b, f.cx - 24, G, f.cz - 52);
  const p = PLAZA;
  bench(b, p.cx, G, p.cz + 48, "-z", 40);
  bin(b, p.cx - 26, G, p.cz + 48);
  bin(b, p.cx + 26, G, p.cz + 48);
  bench(b, 160, G, 976, "-z");
  bench(b, 650, G, 970, "-z");
  bench(b, 930, G, 874, "+z");
  bin(b, 954, G, 872);
  bin(b, 180, G, 978);

  for (const [x, z] of [
    [122, 938],
    [235, 958],
    [f.cx - 41, f.cz - 41],
    [f.cx + 41, f.cz - 41],
    [f.cx - 41, f.cz + 41],
    [f.cx + 41, f.cz + 41],
    [p.cx - 37, p.cz - 37],
    [p.cx + 37, p.cz - 37],
    [p.cx - 37, p.cz + 37],
    [p.cx + 37, p.cz + 37],
    [640, 956],
    [800, 968],
    [880, 930],
    [1000, 880],
  ])
    parkLamp(b, x, G, z);
}

function trees(b: Builder): void {
  const { LEAVES_A: A, LEAVES_B: B, LEAVES_C: C } = M;
  for (const [x, z, h, r, leaves] of [
    [40, 984, 80, 28, [A, B]],
    [200, 986, 92, 34, [B, A, B]],
    [266, 864, 70, 26, [C, C, A]],
    [424, 986, 84, 32, [A, C]],
    [610, 990, 96, 36, [A, B]],
    [622, 832, 64, 24, [C, B]],
    [438, 834, 58, 22, [B, A]],
    [818, 990, 90, 34, [A, B]],
    [804, 836, 60, 22, [A, B, C]],
    [1000, 830, 72, 26, [C, A]],
  ] as const)
    b.tree(x, G, z, h, r, leaves);
  willow(b, 1004, 988, 64, 30);
  for (const [x, z] of [
    [300, 984],
    [326, 994],
    [344, 978],
  ])
    birch(b, x, z, 74, 18);
  for (const [x, z, h, r] of [
    [500, 994, 84, 13],
    [546, 996, 72, 11],
    [700, 994, 88, 14],
    [886, 994, 80, 12],
    [16, 900, 76, 12],
  ])
    conifer(b, x, z, h, r);
}
