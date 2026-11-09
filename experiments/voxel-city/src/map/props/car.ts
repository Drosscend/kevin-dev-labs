import { M } from "../../engine/materials";
import type { Local } from "./local";

/** Vehicle profile in local voxels: u along the length (front at u = length - 1), v across, h above the road. */
export interface CarSpec {
  length: number;
  width: number;
  paint: number;
  wheelR: number;
  axles: readonly [number, number];
  /** Height of the waistline, the hood tip and the trunk. */
  belt: number;
  nose: number;
  tail: number;
  roof: number;
  /** u of the rear window base, rear roof edge, front roof edge and windshield base. */
  cabin: readonly [number, number, number, number];
  bPillar: number;
  /** Side windows only from this u on (vans have a blind cargo box). */
  windowsFrom: number;
  doors: readonly number[];
  handles: readonly number[];
  bumper: number;
  seat: number;
  rearSeat: boolean;
  stripe?: number;
  taxi?: boolean;
}

const EMPTY = 0;
const BODY = 1;
const CABIN = 2;
const WHEEL = 3;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A parked vehicle resting on its tires at h = 0, hollow cabin with seats. */
export function car(f: Local, s: CarSpec): void {
  const L = s.length;
  const W = s.width;
  const H = s.roof + 1;
  const [c0, c1, c2, c3] = s.cabin;
  const hc = Math.floor(s.wheelR);
  const mid = (W - 1) / 2;

  const top = (u: number) =>
    Math.round(
      u > c3
        ? lerp(s.belt, s.nose, (u - c3) / (L - 1 - c3))
        : u < c0
          ? lerp(s.tail, s.belt, u / c0)
          : s.belt,
    );
  const roofAt = (u: number) =>
    Math.round(
      u < c1
        ? lerp(s.belt, s.roof, (u - c0) / (c1 - c0))
        : u <= c2
          ? s.roof
          : lerp(s.roof, s.belt, (u - c2) / (c3 - c2)),
    );
  const corner = (u: number) => {
    const e = Math.min(u, L - 1 - u);
    return e < 6 ? Math.round(6 - Math.sqrt(36 - (6 - e) ** 2)) : 0;
  };
  const inWheelBand = (v: number) =>
    (v >= 1 && v <= 6) || (v >= W - 7 && v <= W - 2);

  const NU = L + 2;
  const NV = W + 2;
  const grid = new Uint8Array(NU * NV * (H + 2));
  const at = (u: number, h: number, v: number) =>
    ((h + 1) * NV + v + 1) * NU + u + 1;
  const kind = (u: number, h: number, v: number) =>
    u < 0 || u >= L || v < 0 || v >= W || h < 0 || h >= H
      ? EMPTY
      : grid[at(u, h, v)];

  for (let u = 0; u < L; u++) {
    const t = top(u);
    const r = roofAt(u);
    const ci = corner(u);
    const e = Math.min(u, L - 1 - u);
    for (let h = 0; h < H; h++)
      for (let v = 0; v < W; v++) {
        let k = EMPTY;
        if (
          inWheelBand(v) &&
          s.axles.some((a) => Math.hypot(u - a, h - hc) <= s.wheelR)
        )
          k = WHEEL;
        else if (h >= (e < 2 ? 4 : 3) && h <= t) {
          const ins = ci + (h >= t - 1 ? 1 : 0) + (h === 3 ? 1 : 0);
          const arch =
            (v <= 6 || v >= W - 7) &&
            s.axles.some((a) => Math.hypot(u - a, h - hc) < s.wheelR + 1.6);
          if (v >= ins && v <= W - 1 - ins && !arch) k = BODY;
        } else if (u >= c0 && u <= c3 && h > t && h <= r) {
          const ins =
            ci +
            2 +
            Math.round(((h - s.belt) / (s.roof - s.belt)) * 2) +
            (h === r ? 1 : 0);
          if (v >= ins && v <= W - 1 - ins) k = CABIN;
        }
        grid[at(u, h, v)] = k;
      }
  }

  const out = (u: number, h: number, v: number) => kind(u, h, v) === EMPTY;
  const nearOut = (u: number, h: number, v: number) => {
    for (let dh = -1; dh <= 1; dh++)
      for (let dv = -1; dv <= 1; dv++)
        for (let du = -1; du <= 1; du++)
          if (out(u + du, h + dh, v + dv)) return true;
    return false;
  };
  const plate = (v: number, h: number, bandV: number, midH: number) => {
    if (v === bandV) return M.CAR_BLUE;
    if (h === midH && v % 2 === 0 && Math.abs(v - mid) < 4) return M.METAL;
    return M.ROAD_WHITE;
  };

  for (let u = 0; u < L; u++) {
    const t = top(u);
    const r = roofAt(u);
    const e = Math.min(u, L - 1 - u);
    for (let h = 0; h < H; h++)
      for (let v = 0; v < W; v++) {
        const k = grid[at(u, h, v)];
        if (k === EMPTY) continue;
        const sideOut = out(u, h, v - 1) || out(u, h, v + 1);
        const frontOut = out(u + 1, h, v);
        const rearOut = out(u - 1, h, v);
        const upOut = out(u, h + 1, v);
        const surface = sideOut || frontOut || rearOut || upOut;
        let m = s.paint;

        if (k === WHEEL) {
          const a =
            Math.abs(u - s.axles[0]) < Math.abs(u - s.axles[1])
              ? s.axles[0]
              : s.axles[1];
          const d = Math.hypot(u - a, h - hc);
          const outer = v === 1 || v === W - 2;
          const spoke =
            Math.floor(((Math.atan2(h - hc, u - a) + Math.PI) / Math.PI) * 5) %
              2 ===
            0;
          if (outer && d < 1.3) m = M.METAL;
          else if (outer && d < s.wheelR - 2.4) m = spoke ? M.CHROME : M.METAL;
          else m = M.TIRE;
        } else if (k === CABIN) {
          if (!nearOut(u, h, v)) continue;
          const slope = u < c1 || u > c2;
          if (!surface) m = s.paint;
          else if (sideOut) {
            const band =
              h >= s.belt + 2 &&
              h <= r - (slope ? 3 : 2) &&
              u >= s.windowsFrom &&
              Math.abs(u - s.bPillar) > 1;
            if (band) m = M.GLASS_DARK;
          } else if (slope && (frontOut || rearOut || upOut)) {
            const edge = out(u, h, v - 2) || out(u, h, v + 2);
            if (!edge && h >= s.belt + 2) m = M.GLASS_DARK;
          }
        } else {
          const front = frontOut && u > L - 8;
          const rear = rearOut && u < 8;
          const hollow =
            !nearOut(u, h, v) && u >= c0 + 2 && u <= c3 - 2 && h >= 7;
          if (hollow) continue;
          if (!surface) m = s.paint;
          else if (front && h >= 4 && h <= 6 && Math.abs(v - mid) <= 5)
            m = plate(v, h, Math.floor(mid + 5), 5);
          else if (h <= 6 && e <= 6) m = s.bumper;
          else if (sideOut && h <= 4) m = M.METAL;
          else if (
            front &&
            h >= t - 4 &&
            h <= t - 2 &&
            ((v >= 2 && v <= 9) || (v >= W - 10 && v <= W - 3))
          )
            m = M.LAMP;
          else if (front && h >= 7 && h <= t - 3 && Math.abs(v - mid) <= 7)
            m = h % 2 === 0 ? M.CHROME : M.METAL;
          else if (rear && h >= t - 4 && h <= t - 1 && (v <= 8 || v >= W - 9))
            m = M.TAIL_LIGHT;
          else if (rear && h >= 7 && h <= 9 && Math.abs(v - mid) <= 5)
            m = plate(v, h, Math.round(mid - 5), 8);
          else if (sideOut && s.doors.includes(u) && h >= 5 && h <= t - 1)
            m = M.METAL;
          else if (sideOut && h === t - 2 && s.handles.includes(u))
            m = M.CHROME;
          else if (
            sideOut &&
            s.stripe !== undefined &&
            h >= t - 5 &&
            h <= t - 4
          )
            m = s.stripe;
        }
        f.put(u, h, v, m);
      }
  }

  interior(f, s, corner(c0 + 3), roofAt(c0 + 2) - 2);
  mirrors(f, s);
  if (s.taxi) {
    const u0 = Math.round((c1 + c2) / 2) - 3;
    const v0 = Math.round(mid) - 5;
    f.fill(u0, s.roof + 1, v0, u0 + 6, s.roof + 2, v0 + 11, M.METAL);
    f.fill(u0, s.roof + 2, v0, u0 + 6, s.roof + 5, v0 + 11, M.ROAD_WHITE);
    f.fill(u0 - 1, s.roof + 3, v0 + 2, u0 + 7, s.roof + 4, v0 + 9, M.LAMP);
  }
}

function interior(f: Local, s: CarSpec, ins: number, rearTop: number): void {
  const [c0, , , c3] = s.cabin;
  const W = s.width;
  const uA = c0 + 3;
  const uB = c3 - 2;
  const half = Math.floor(W / 2);
  const frontBack = Math.round(lerp(uA, uB, s.rearSeat ? 0.55 : 0.4));
  for (const [v0, v1] of [
    [ins + 3, half - 1],
    [half + 1, W - 3 - ins],
  ]) {
    f.fillAir(frontBack, 7, v0, frontBack + 9, 10, v1, s.seat);
    f.fillAir(frontBack - 2, 7, v0, frontBack, s.belt + 7, v1, s.seat);
    f.fillAir(
      frontBack - 2,
      s.belt + 7,
      v0 + 2,
      frontBack,
      s.belt + 9,
      v1 - 2,
      s.seat,
    );
  }
  if (s.rearSeat) {
    f.fillAir(uA + 1, 7, ins + 3, uA + 9, 10, W - 3 - ins, s.seat);
    f.fillAir(
      uA - 1,
      7,
      ins + 3,
      uA + 1,
      Math.min(s.belt + 5, rearTop),
      W - 3 - ins,
      s.seat,
    );
  }
  f.fillAir(uB - 4, s.belt - 3, 2, c3 + 1, s.belt + 1, W - 2, M.METAL);
  const sv = Math.round(W * 0.3);
  const sh = s.belt + 4;
  const su = uB - 6;
  for (let dv = -3; dv <= 3; dv++)
    for (let dh = -3; dh <= 3; dh++)
      if (Math.max(Math.abs(dv), Math.abs(dh)) === 3 || dh === 0)
        f.fillAir(
          su,
          sh + dh,
          sv + dv,
          su + 1,
          sh + dh + 1,
          sv + dv + 1,
          M.RUBBER,
        );
  f.fillAir(su + 1, s.belt, sv, uB - 3, sh + 1, sv + 1, M.METAL);
}

function mirrors(f: Local, s: CarSpec): void {
  const u0 = s.cabin[3] - 3;
  const h = s.belt;
  for (const [stalk, v0, v1] of [
    [-1, -3, -1],
    [s.width, s.width, s.width + 2],
  ]) {
    f.fill(u0 + 1, h - 2, stalk, u0 + 3, h, stalk + 1, M.METAL);
    f.fill(u0, h, v0, u0 + 4, h + 3, v1 + 1, s.paint);
    f.fill(u0 - 1, h, v0, u0, h + 3, v1 + 1, M.GLASS);
  }
}

export function sedan(paint: number, taxi = false): CarSpec {
  return {
    length: 86,
    width: 36,
    paint,
    wheelR: 6.5,
    axles: [16, 69],
    belt: 15,
    nose: 13,
    tail: 14,
    roof: 28,
    cabin: [20, 32, 50, 64],
    bPillar: 41,
    windowsFrom: 0,
    doors: [24, 42, 62],
    handles: [27, 28, 45, 46],
    bumper: M.METAL,
    seat: M.RUBBER,
    rearSeat: true,
    taxi,
  };
}

export function hatchback(paint: number): CarSpec {
  return {
    length: 74,
    width: 34,
    paint,
    wheelR: 6,
    axles: [13, 60],
    belt: 15,
    nose: 12,
    tail: 15,
    roof: 28,
    cabin: [5, 13, 42, 56],
    bPillar: 26,
    windowsFrom: 0,
    doors: [24, 54],
    handles: [27, 28],
    bumper: M.RUBBER,
    seat: M.FABRIC_GREEN,
    rearSeat: true,
  };
}

export function van(paint: number, stripe: number): CarSpec {
  return {
    length: 100,
    width: 40,
    paint,
    wheelR: 7,
    axles: [18, 80],
    belt: 17,
    nose: 14,
    tail: 17,
    roof: 44,
    cabin: [1, 3, 74, 88],
    bPillar: 70,
    windowsFrom: 72,
    doors: [30, 66, 86],
    handles: [33, 34, 73, 74],
    bumper: M.METAL,
    seat: M.RUBBER,
    rearSeat: false,
    stripe,
  };
}
