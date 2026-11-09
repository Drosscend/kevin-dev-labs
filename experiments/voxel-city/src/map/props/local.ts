import type { Builder } from "../../engine/builder";

/** Where local +u points: 0 = +x, 1 = +z, 2 = -x, 3 = -z. Local +v is +u turned a quarter to the right. */
type Facing = 0 | 1 | 2 | 3;

export type Direction = "+x" | "-x" | "+z" | "-z";

/** Facing whose local +v points toward `dir`. */
export function facingToward(dir: Direction): Facing {
  return ({ "+z": 0, "-x": 1, "-z": 2, "+x": 3 } as const)[dir];
}

/** A rotated frame anchored at a world voxel: u along, v across, h up. */
export class Local {
  constructor(
    readonly b: Builder,
    readonly ox: number,
    readonly oy: number,
    readonly oz: number,
    readonly facing: Facing,
  ) {}

  x(u: number, v: number): number {
    return this.ox + [u, -v, -u, v][this.facing];
  }

  z(u: number, v: number): number {
    return this.oz + [v, u, -v, -u][this.facing];
  }

  get(u: number, h: number, v: number): number {
    return this.b.get(this.x(u, v), this.oy + h, this.z(u, v));
  }

  put(u: number, h: number, v: number, m: number): void {
    this.b.put(this.x(u, v), this.oy + h, this.z(u, v), m);
  }

  /** Half-open box in local coordinates. */
  fill(
    u0: number,
    h0: number,
    v0: number,
    u1: number,
    h1: number,
    v1: number,
    m: number | ((u: number, h: number, v: number) => number),
  ): void {
    for (let h = h0; h < h1; h++)
      for (let v = v0; v < v1; v++)
        for (let u = u0; u < u1; u++)
          this.put(u, h, v, typeof m === "number" ? m : m(u, h, v));
  }

  /** One voxel thick line whose voxels always share a face. */
  wire(
    au: number,
    ah: number,
    av: number,
    bu: number,
    bh: number,
    bv: number,
    m: number,
  ): void {
    const n = Math.max(Math.abs(bu - au), Math.abs(bh - ah), Math.abs(bv - av));
    let pu = au;
    let ph = ah;
    let pv = av;
    this.put(pu, ph, pv, m);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const nu = Math.round(au + (bu - au) * t);
      const nh = Math.round(ah + (bh - ah) * t);
      const nv = Math.round(av + (bv - av) * t);
      if (nu !== pu) {
        pu = nu;
        this.put(pu, ph, pv, m);
      }
      if (nv !== pv) {
        pv = nv;
        this.put(pu, ph, pv, m);
      }
      if (nh !== ph) {
        ph = nh;
        this.put(pu, ph, pv, m);
      }
    }
  }

  /** Like `fill`, but only where the world is still empty. */
  fillAir(
    u0: number,
    h0: number,
    v0: number,
    u1: number,
    h1: number,
    v1: number,
    m: number,
  ): void {
    for (let h = h0; h < h1; h++)
      for (let v = v0; v < v1; v++)
        for (let u = u0; u < u1; u++)
          if (this.get(u, h, v) === 0) this.put(u, h, v, m);
  }

  line(
    au: number,
    ah: number,
    av: number,
    bu: number,
    bh: number,
    bv: number,
    r: number,
    m: number,
  ): void {
    this.b.line(
      this.x(au, av),
      this.oy + ah,
      this.z(au, av),
      this.x(bu, bv),
      this.oy + bh,
      this.z(bu, bv),
      r,
      m,
    );
  }
}
