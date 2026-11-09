import { Group, type Material, Mesh, type Scene, Vector3 } from "three";
import type { GameAudio } from "./audio";
import type { ChunkRenderer } from "./chunks";
import {
  CELL,
  CELL_COUNT,
  CELLS_X,
  CELLS_Y,
  CELLS_Z,
  GROUND,
  VOXEL,
} from "./constants";
import type { Debris } from "./debris";
import type { Effects } from "./effects";
import type { MeshData } from "./greedy";
import type { MesherPool } from "./mesher-pool";
import type { Physics } from "./physics";
import { geometryFromMesh } from "./voxel-material";
import type { World } from "./world";

const LAYER = CELLS_X * CELLS_Z;
const REGION = 64;
const REGION_CELLS = REGION / CELL;
const PAD = REGION + 2;
/** Upper parts lighter than this (voxels) never collapse: lamp posts, small trees. */
const MIN_MASS = 40_000;
const MAX_CELLS = 400_000;
/** Half-size (cells) of the square around a blast where the remaining walls are measured. */
const WINDOW = 15;
/** Collapse when the band near the blast keeps less than this share of its original section. */
const WEAK = 0.6;
const CHECK_DELAY = 0.3;
/** A later blast this close (m) re-checks the same spot, so the earlier check is dropped. */
const MERGE_DISTANCE = 4;
/** Main-thread time (ms) a collapse may take per frame. */
const BUDGET = 4;
const MAX_DEBRIS = 5000;
/** Yielded by the collapse sequence to wait for the next frame. */
const FRAME = 1;

type Work = Generator<number | undefined, void, number>;

/** Crushed layers around a blast, in cells. */
interface Band {
  bottom: number;
  top: number;
  cx: number;
  cz: number;
}

interface Upper {
  cells: Int32Array;
  /** Footprint columns (cx + CELLS_X * cz). */
  columns: Int32Array;
  /** Fall distance in cells. */
  drop: number;
}

function bandAround(center: Vector3, radius: number): Band | null {
  const reach = (radius / VOXEL) * 1.25;
  const vy = center.y / VOXEL;
  const top = Math.floor((vy + reach) / CELL);
  const bottom = Math.max(Math.floor((vy - reach) / CELL), (GROUND >> 2) + 1);
  if (top + 1 >= CELLS_Y || top < bottom) return null;
  return {
    bottom,
    top,
    cx: Math.floor(center.x / VOXEL / CELL),
    cz: Math.floor(center.z / VOXEL / CELL),
  };
}

/** Share of its original section the band keeps around its center: 1 when intact. */
function bandShare(
  world: World,
  intact: Uint8Array,
  center: Vector3,
  radius: number,
): number {
  const band = bandAround(center, radius);
  if (!band) return 1;
  const x0 = Math.max(0, band.cx - WINDOW);
  const x1 = Math.min(CELLS_X - 1, band.cx + WINDOW);
  const z0 = Math.max(0, band.cz - WINDOW);
  const z1 = Math.min(CELLS_Z - 1, band.cz + WINDOW);
  let now = Number.POSITIVE_INFINITY;
  let before = Number.POSITIVE_INFINITY;
  for (let y = band.bottom; y <= band.top; y++) {
    let s = 0;
    let s0 = 0;
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const c = x + CELLS_X * z + y * LAYER;
        s += world.cells[c];
        s0 += intact[c];
      }
    now = Math.min(now, s);
    before = Math.min(before, s0);
  }
  return before === 0 ? 1 : now / before;
}

/** Weakened buildings: the part above a destroyed band falls straight down and crushes it. */
export class Collapse {
  /** Screen shake request: `amount` at `center`, scaled by the caller with distance. */
  onShake: ((center: Vector3, amount: number) => void) | null = null;
  private readonly checks: { center: Vector3; radius: number; at: number }[] =
    [];
  private work: Work | null = null;
  private intact = new Uint8Array(0);
  private group: Group | null = null;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly world: World,
    private readonly chunks: ChunkRenderer,
    private readonly pool: MesherPool,
    private readonly physics: Physics,
    private readonly debris: Debris,
    private readonly effects: Effects,
    private readonly audio: GameAudio,
    private readonly material: Material,
  ) {}

  /** Queues a stability check around an explosion. */
  check(center: Vector3, radius: number): void {
    if (this.checks.length < 8)
      this.checks.push({
        center: center.clone(),
        radius,
        at: this.time + CHECK_DELAY,
      });
  }

  /** Forgets everything in progress and takes the freshly generated map as the intact state. */
  reset(): void {
    this.intact = this.world.cells.slice();
    this.checks.length = 0;
    this.work = null;
    this.removeGroup();
  }

  update(dt: number): void {
    this.time += dt;
    if (!this.work) {
      this.pickCheck();
      return;
    }
    const start = performance.now();
    for (;;) {
      const step = this.work.next(dt);
      if (step.done) {
        this.work = null;
        return;
      }
      if (step.value === FRAME || performance.now() - start > BUDGET) return;
    }
  }

  private pickCheck(): void {
    const next = this.checks[0];
    if (!next || next.at > this.time) return;
    this.checks.shift();
    if (
      this.checks.some((c) => c.center.distanceTo(next.center) < MERGE_DISTANCE)
    )
      return;
    const band = bandAround(next.center, next.radius);
    if (
      band &&
      bandShare(this.world, this.intact, next.center, next.radius) < WEAK
    )
      this.work = this.run(band);
  }

  private *run(band: Band): Work {
    const upper = yield* this.findUpper(band);
    if (!upper) return;
    const center = this.footprintCenter(upper, band);
    this.audio.creak(center);
    this.onShake?.(center, 0.25);

    const saved = new Uint8Array(upper.cells.length * 64);
    const volumes = new Map<number, Uint8Array>();
    for (let k = 0; k < upper.cells.length; k++) {
      this.copyCell(upper.cells[k], k, saved, volumes);
      if ((k & 1023) === 0) yield;
    }
    let meshes: { key: number; data: MeshData | null }[] | null = null;
    void Promise.all(
      [...volumes].map(([key, vol]) =>
        this.pool
          .mesh(vol, REGION, REGION, REGION)
          .then((data) => ({ key, data })),
      ),
    ).then((done) => {
      meshes = done;
    });
    while (!meshes) yield FRAME;
    const group = yield* this.buildGroup(meshes);

    let touched = new Set<number>();
    let since = performance.now();
    for (let k = 0; k < upper.cells.length; k++) {
      this.world.writeCell(upper.cells[k], null, 0, touched);
      if ((k & 2047) === 0) yield;
    }
    this.physics.forgetChunks(touched);
    while (!this.chunks.updatedSince(touched, since)) {
      this.trickle(upper, band, 0);
      yield FRAME;
    }

    const distance = upper.drop * CELL * VOXEL;
    let fallen = 0;
    let speed = 0;
    while (fallen < distance) {
      const dt = yield FRAME;
      speed += 9.81 * dt;
      fallen = Math.min(distance, fallen + speed * dt);
      group.position.y = -fallen;
      this.trickle(upper, band, fallen);
      this.onShake?.(center, 0.05);
    }

    this.audio.crash(center);
    this.onShake?.(center, 1.6);
    const edges = this.edgeColumns(upper);
    this.dustRing(edges, band);
    touched = new Set<number>();
    since = performance.now();
    const buffer = new Uint8Array(64);
    const chance = Math.min(
      1,
      MAX_DEBRIS / Math.max(1, edges.size * (band.top - band.bottom + 1) * 20),
    );
    let n = 0;
    for (const col of upper.columns) {
      const edge = edges.has(col);
      for (let y = band.bottom; y <= band.top; y++) {
        const c = col + y * LAYER;
        if (this.world.cells[c] === 0) continue;
        if (edge) this.spray(c, buffer, chance, center);
        this.world.writeCell(c, null, 0, touched);
      }
      if ((++n & 255) === 0) yield;
    }
    const shift = upper.drop * LAYER;
    for (let k = 0; k < upper.cells.length; k++) {
      this.world.writeCell(upper.cells[k] - shift, saved, k * 64, touched);
      if ((k & 2047) === 0) yield;
    }
    this.physics.forgetChunks(touched);
    while (!this.chunks.updatedSince(touched, since)) yield FRAME;
    this.removeGroup();
  }

  /** Coarse cells connected to the layer just above the band, and how far they can fall. */
  private *findUpper(band: Band): Generator<undefined, Upper | null, number> {
    const cells = this.world.cells;
    const visited = new Uint8Array(CELL_COUNT);
    let queue = new Int32Array(1 << 16);
    let count = 0;
    const push = (c: number) => {
      if (visited[c] || cells[c] === 0) return;
      visited[c] = 1;
      if (count >= queue.length) {
        const bigger = new Int32Array(queue.length * 2);
        bigger.set(queue);
        queue = bigger;
      }
      queue[count++] = c;
    };
    const seedLayer = (band.top + 1) * LAYER;
    const rc = band.top - band.bottom;
    for (
      let z = Math.max(0, band.cz - rc);
      z <= Math.min(CELLS_Z - 1, band.cz + rc);
      z++
    )
      for (
        let x = Math.max(0, band.cx - rc);
        x <= Math.min(CELLS_X - 1, band.cx + rc);
        x++
      )
        push(seedLayer + x + CELLS_X * z);

    for (let head = 0; head < count; head++) {
      if (count > MAX_CELLS) return null;
      const c = queue[head];
      const x = c % CELLS_X;
      const z = ((c - x) / CELLS_X) % CELLS_Z;
      const y = (c - (c % LAYER)) / LAYER;
      if (x > 0) push(c - 1);
      if (x < CELLS_X - 1) push(c + 1);
      if (z > 0) push(c - CELLS_X);
      if (z < CELLS_Z - 1) push(c + CELLS_X);
      if (y > band.top + 1) push(c - LAYER);
      if (y < CELLS_Y - 1) push(c + LAYER);
      if ((head & 8191) === 0) yield;
    }

    let mass = 0;
    const bottoms = new Int16Array(LAYER).fill(-1);
    const columns: number[] = [];
    for (let k = 0; k < count; k++) {
      const c = queue[k];
      mass += cells[c];
      const col = c % LAYER;
      const y = (c - col) / LAYER;
      if (bottoms[col] < 0) columns.push(col);
      if (bottoms[col] < 0 || y < bottoms[col]) bottoms[col] = y;
    }
    let drop = Number.POSITIVE_INFINITY;
    for (const col of columns) {
      let below = band.bottom - 1;
      while (below > 0 && cells[col + below * LAYER] === 0) below--;
      drop = Math.min(drop, bottoms[col] - below - 1);
    }
    if (mass < MIN_MASS || drop <= 0) return null;
    return {
      cells: queue.slice(0, count),
      columns: Int32Array.from(columns),
      drop,
    };
  }

  /** Saves cell `c` as entry `k` of `saved` and copies it into its region volume for meshing. */
  private copyCell(
    c: number,
    k: number,
    saved: Uint8Array,
    volumes: Map<number, Uint8Array>,
  ): void {
    this.world.readCell(c, saved, k * 64);
    const cx = c % CELLS_X;
    const cz = Math.floor(c / CELLS_X) % CELLS_Z;
    const cy = Math.floor(c / LAYER);
    const key =
      Math.floor(cx / REGION_CELLS) +
      64 * Math.floor(cz / REGION_CELLS) +
      4096 * Math.floor(cy / REGION_CELLS);
    let vol = volumes.get(key);
    if (!vol) {
      vol = new Uint8Array(PAD * PAD * PAD);
      volumes.set(key, vol);
    }
    const lx = (cx % REGION_CELLS) * CELL + 1;
    const ly = (cy % REGION_CELLS) * CELL + 1;
    const lz = (cz % REGION_CELLS) * CELL + 1;
    let s = k * 64;
    for (let y = 0; y < CELL; y++)
      for (let z = 0; z < CELL; z++) {
        const row = ((ly + y) * PAD + lz + z) * PAD + lx;
        for (let x = 0; x < CELL; x++) vol[row + x] = saved[s++];
      }
  }

  private *buildGroup(
    meshes: { key: number; data: MeshData | null }[],
  ): Generator<number | undefined, Group, number> {
    const group = new Group();
    let n = 0;
    this.scene.add(group);
    this.group = group;
    for (const { key, data } of meshes) {
      if (!data) continue;
      yield ++n % 8 === 0 ? FRAME : undefined;
      const mesh = new Mesh(geometryFromMesh(data), this.material);
      mesh.position
        .set(key % 64, Math.floor(key / 4096), Math.floor(key / 64) % 64)
        .multiplyScalar(REGION * VOXEL);
      mesh.scale.setScalar(VOXEL);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  /** Dust falling from the crush line. */
  private trickle(upper: Upper, band: Band, fallen: number): void {
    if (Math.random() > 0.35) return;
    const col = upper.columns[Math.floor(Math.random() * upper.columns.length)];
    this.effects.dust(
      this.columnPoint(col, (band.top + 1) * CELL * VOXEL - fallen),
      3,
      0.6,
    );
  }

  private dustRing(edges: Set<number>, band: Band): void {
    const list = [...edges];
    const ground = band.bottom * CELL * VOXEL;
    for (let i = 0; i < Math.min(70, list.length); i++) {
      const col = list[Math.floor(Math.random() * list.length)];
      this.effects.dust(
        this.columnPoint(col, ground + Math.random() * 1.5),
        5,
        1.2,
      );
    }
  }

  private edgeColumns(upper: Upper): Set<number> {
    const footprint = new Set(upper.columns);
    return new Set(
      upper.columns.filter(
        (col) =>
          !footprint.has(col - 1) ||
          !footprint.has(col + 1) ||
          !footprint.has(col - CELLS_X) ||
          !footprint.has(col + CELLS_X),
      ),
    );
  }

  /** Throws some voxels of a crushed edge cell outward. */
  private spray(
    c: number,
    buffer: Uint8Array,
    chance: number,
    center: Vector3,
  ): void {
    this.world.readCell(c, buffer, 0);
    const x0 = (c % CELLS_X) * CELL;
    const z0 = (Math.floor(c / CELLS_X) % CELLS_Z) * CELL;
    const y0 = Math.floor(c / LAYER) * CELL;
    for (let k = 0; k < 64; k++) {
      const m = buffer[k];
      if (m === 0 || Math.random() > chance) continue;
      const x = x0 + (k & 3) + 0.5;
      const z = z0 + ((k >> 2) & 3) + 0.5;
      const dx = x - center.x / VOXEL;
      const dz = z - center.z / VOXEL;
      const inv = 1 / Math.max(1, Math.hypot(dx, dz));
      const speed = 30 + Math.random() * 90;
      this.debris.spawn(
        x,
        y0 + (k >> 4) + 0.5,
        z,
        dx * inv * speed + (Math.random() - 0.5) * 30,
        10 + Math.random() * 50,
        dz * inv * speed + (Math.random() - 0.5) * 30,
        m,
      );
    }
  }

  private footprintCenter(upper: Upper, band: Band): Vector3 {
    let sx = 0;
    let sz = 0;
    for (const col of upper.columns) {
      sx += col % CELLS_X;
      sz += Math.floor(col / CELLS_X);
    }
    const n = upper.columns.length;
    return new Vector3(
      (sx / n + 0.5) * CELL * VOXEL,
      ((band.bottom + band.top) / 2) * CELL * VOXEL,
      (sz / n + 0.5) * CELL * VOXEL,
    );
  }

  private columnPoint(col: number, y: number): Vector3 {
    return new Vector3(
      ((col % CELLS_X) + 0.5) * CELL * VOXEL,
      y,
      (Math.floor(col / CELLS_X) + 0.5) * CELL * VOXEL,
    );
  }

  private removeGroup(): void {
    if (!this.group) return;
    for (const child of this.group.children) (child as Mesh).geometry.dispose();
    this.scene.remove(this.group);
    this.group = null;
  }
}
