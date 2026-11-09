import { type Builder, hash3 } from "../../engine/builder";
import { M } from "../../engine/materials";
import { type Direction, facingToward, Local } from "./local";

export function bollard(b: Builder, x: number, y: number, z: number): void {
  b.cylinder(x, z, 1.5, y, y + 17, (_x, py) =>
    py - y === 12 || py - y === 13 ? M.ROAD_WHITE : M.METAL,
  );
  b.cylinder(x, z, 1, y + 17, y + 18, M.CHROME);
}

export function hydrant(b: Builder, x: number, y: number, z: number): void {
  b.cylinder(x, z, 2.6, y, y + 2, M.METAL_RED);
  b.cylinder(x, z, 2, y + 2, y + 13, M.METAL_RED);
  b.cylinder(x, z, 2.6, y + 13, y + 14, M.METAL_RED);
  b.cylinder(x, z, 1.5, y + 14, y + 16, M.METAL_RED);
  b.put(x, y + 16, z, M.BRASS);
  b.fill(x - 4, y + 8, z, x + 5, y + 10, z + 1, M.CHROME);
  b.fill(x, y + 7, z - 4, x + 1, y + 10, z + 5, M.METAL_RED);
  b.put(x, y + 8, z - 4, M.BRASS);
  b.put(x, y + 8, z + 4, M.BRASS);
}

/** Mast arm traffic light: signal over the lane facing local +u, walk signal facing the road. */
export function trafficLight(
  b: Builder,
  x: number,
  y: number,
  z: number,
  road: Direction,
): void {
  const f = new Local(b, x, y, z, facingToward(road));
  b.cylinder(x, z, 3, y, y + 4, M.CONCRETE_DARK);
  b.cylinder(x, z, 2, y + 4, y + 120, M.METAL);
  f.fill(-1, 104, 2, 2, 107, 54, M.METAL);
  f.line(0, 92, 1, 0, 104, 16, 1, M.METAL);
  signalHead(f, 2, 84, 40);
  signalHead(f, 3, 58, 0);
  f.fill(-3, 56, 3, 4, 73, 7, M.METAL);
  f.fill(-2, 65, 7, 3, 71, 8, M.METAL_RED);
  f.fill(-2, 58, 7, 3, 64, 8, M.SIGNAL_GREEN);
  f.fill(-1, 22, -4, 2, 28, -2, M.METAL_YELLOW);
  f.fill(3, 112, 0, 30, 118, 1, (u, h) =>
    u === 3 || u === 29 || h === 112 || h === 117
      ? M.ROAD_WHITE
      : (u + h) % 3 === 0 && h > 113 && h < 116 && u > 5 && u < 27
        ? M.ROAD_WHITE
        : M.SIGN_GREEN,
  );
}

/** Housing spans h0..h0 + 20, lamps on its +u face at u0 - 1. */
function signalHead(f: Local, u0: number, h0: number, v: number): void {
  f.fill(u0 - 6, h0, v - 3, u0, h0 + 20, v + 4, M.METAL);
  const lights = [M.METAL_GREEN, M.METAL_YELLOW, M.TAIL_LIGHT];
  lights.forEach((m, i) => {
    const hc = h0 + 3 + i * 6;
    for (let dh = -2; dh <= 2; dh++)
      for (let dv = -2; dv <= 2; dv++)
        if (Math.abs(dh) + Math.abs(dv) < 4) f.put(u0 - 1, hc + dh, v + dv, m);
    f.fill(u0, hc + 3, v - 2, u0 + 3, hc + 4, v + 3, M.METAL);
  });
}

type SignKind = "crossing" | "noParking" | "bus";

export function sign(
  b: Builder,
  x: number,
  y: number,
  z: number,
  face: Direction,
  kind: SignKind,
): void {
  const f = new Local(b, x, y, z, facingToward(face));
  b.cylinder(x, z, 1, y, y + 58, M.METAL);
  for (let h = 42; h < 60; h++)
    for (let u = -7; u <= 7; u++) {
      const m = plate(kind, u, h - 50);
      if (m !== 0) f.put(u, h, 2, m);
    }
  f.fill(-1, 46, 1, 2, 48, 2, M.METAL);
  f.fill(-1, 54, 1, 2, 56, 2, M.METAL);
}

function plate(kind: SignKind, u: number, h: number): number {
  if (kind === "crossing") {
    if (Math.abs(u) > 6 || Math.abs(h) > 6) return 0;
    const inTriangle = h >= -4 && Math.abs(u) <= (5 - h) * 0.55;
    if (!inTriangle) return M.CAR_BLUE;
    const figure =
      (u === 0 && h >= -1 && h <= 2) ||
      (h === -2 && Math.abs(u) === 1) ||
      (h === -3 && Math.abs(u) === 1) ||
      (u === 0 && h === 3);
    return figure ? M.METAL : M.ROAD_WHITE;
  }
  if (kind === "noParking") {
    const d = Math.hypot(u, h);
    if (d > 6.5) return 0;
    if (d > 4.8 || Math.abs(u - h) < 1) return M.METAL_RED;
    return M.CAR_BLUE;
  }
  if (Math.abs(u) > 5 || h < -6 || h > 8) return 0;
  if (h <= -5) return M.METAL;
  const icon = h >= -2 && h <= 4 && Math.abs(u) <= 3 && !(h === 2 && u !== 0);
  return icon ? M.ROAD_WHITE : M.SIGN_GREEN;
}

export function mailbox(
  b: Builder,
  x: number,
  y: number,
  z: number,
  face: Direction,
): void {
  const f = new Local(b, x, y, z, facingToward(face));
  b.cylinder(x, z, 1.5, y, y + 18, M.METAL);
  f.fill(-5, 18, -3, 6, 34, 4, M.METAL_YELLOW);
  f.fill(-4, 34, -2, 5, 36, 3, M.METAL_YELLOW);
  f.fill(-3, 30, 4, 4, 31, 5, M.METAL);
  f.fill(-5, 24, 4, 6, 26, 5, M.CAR_BLUE);
}

/** Row of hoops across `toward`, a bike parked along it. */
export function bikeRack(
  b: Builder,
  x: number,
  y: number,
  z: number,
  toward: Direction,
  count: number,
): void {
  const f = new Local(b, x, y, z, facingToward(toward));
  for (let i = 0; i < count; i++) {
    const u = i * 10;
    f.fill(u, 0, -6, u + 1, 15, -5, M.CHROME);
    f.fill(u, 0, 5, u + 1, 15, 6, M.CHROME);
    f.fill(u, 15, -6, u + 1, 17, 6, M.CHROME);
    f.fill(u, 0, -7, u + 1, 1, 7, M.METAL);
  }
  bike(f, 11, M.METAL_RED);
}

function bike(f: Local, u: number, frame: number): void {
  for (const vc of [-13, 11])
    for (let h = 0; h <= 15; h++)
      for (let v = vc - 8; v <= vc + 8; v++) {
        const d = Math.hypot(v - vc, h - 7);
        if (d >= 5.8 && d <= 7.3) f.put(u, h, v, M.TIRE);
        else if (d < 1.2) f.put(u, h, v, M.METAL);
        else if (d < 5.8 && (v === vc || h === 7)) f.put(u, h, v, M.CHROME);
      }
  f.wire(u, 7, -13, u, 17, -5, frame);
  f.wire(u, 17, -5, u, 7, -3, frame);
  f.wire(u, 7, -3, u, 17, 7, frame);
  f.wire(u, 17, -5, u, 17, 7, frame);
  f.wire(u, 7, -13, u, 7, -3, frame);
  f.wire(u, 17, 7, u, 7, 11, frame);
  f.wire(u, 17, 7, u, 21, 8, M.METAL);
  f.fill(u - 4, 21, 7, u + 5, 22, 9, M.METAL);
  f.fill(u - 4, 21, 7, u - 2, 22, 9, M.RUBBER);
  f.fill(u + 3, 21, 7, u + 5, 22, 9, M.RUBBER);
  f.wire(u, 17, -5, u, 19, -6, M.METAL);
  f.fill(u - 1, 20, -9, u + 2, 21, -4, M.RUBBER);
}

export function streetTree(
  b: Builder,
  x: number,
  top: number,
  z: number,
  height: number,
  radius: number,
  leaves: readonly number[],
): void {
  const r = 9;
  for (let dz = -r; dz < r; dz++)
    for (let dx = -r; dx < r; dx++) {
      const px = x + dx;
      const pz = z + dz;
      b.fill(px, top - 3, pz, px + 1, top - 1, pz + 1, M.DIRT);
      const rim = Math.max(Math.abs(dx + 0.5), Math.abs(dz + 0.5)) > r - 2;
      const d = Math.hypot(dx + 0.5, dz + 0.5);
      const bar = (px + pz) % 3 === 0 || (px - pz + 999) % 3 === 0;
      b.put(px, top - 1, pz, rim || (bar && d > 4) ? M.METAL : 0);
    }
  b.tree(x, top - 3, z, height, radius, leaves);
  b.cylinder(x, z, 3.5, top - 3, top - 1, M.TRUNK);
}

/** Glass bus shelter on the sidewalk, open toward +z, between x0 and x1. */
export function busShelter(
  b: Builder,
  x0: number,
  x1: number,
  y: number,
  z0: number,
): void {
  const zb = z0;
  const zf = z0 + 34;
  const top = y + 48;
  for (let x = x0; x < x1; x += 30)
    b.fill(x, y, zb, x + 2, top, zb + 2, M.METAL);
  b.fill(x1 - 2, y, zb, x1, top, zb + 2, M.METAL);
  b.fill(x0, y, zb, x1, y + 3, zb + 2, M.METAL);
  b.fill(x0, top - 3, zb, x1, top, zb + 2, M.METAL);
  b.fill(x0, y + 3, zb, x1, top - 3, zb + 1, (x) =>
    (x - x0) % 30 < 2 ? M.METAL : M.GLASS,
  );

  b.fill(x0, y + 3, zb + 2, x0 + 1, top - 3, zb + 24, M.GLASS);
  b.fill(x0, y + 3, zb + 24, x0 + 2, top, zb + 26, M.METAL);
  b.fill(x0, y, zb + 2, x0 + 2, y + 3, zb + 24, M.METAL);
  b.fill(x0, top - 3, zb + 2, x0 + 2, top, zb + 24, M.METAL);

  b.fill(x1 - 4, y, zb + 2, x1, top, zb + 26, (x, py, z) => {
    const edge = py - y < 3 || top - py <= 3 || z - zb < 4 || zb + 26 - z <= 2;
    if (edge) return M.METAL;
    if (x === x1 - 3 || x === x1 - 2) return M.LAMP;
    return poster(z - zb, py - y);
  });

  b.fill(x0 - 4, top, zb - 2, x1 + 4, top + 3, zf + 2, (x, _py, z) =>
    x - x0 < 0 || x1 - x <= 0 || z - zb < 0 || zf + 2 - z <= 4
      ? M.METAL
      : M.GLASS,
  );
  b.fill(x0 - 4, top - 4, zf - 2, x1 + 4, top, zf + 2, (x, py) =>
    py === top - 2 && (x % 4 === 0 || x % 4 === 1) && x > x0 + 20 && x < x0 + 60
      ? M.ROAD_WHITE
      : M.SIGN_GREEN,
  );
  for (const x of [x0, x1 - 2])
    b.fill(x, y, zf - 4, x + 2, top - 4, zf - 2, M.METAL);

  for (const x of [x0 + 34, x0 + 60, x0 + 86]) {
    b.fill(x, y, zb + 12, x + 2, y + 9, zb + 14, M.METAL);
    b.fill(x, y + 8, zb + 2, x + 2, y + 9, zb + 14, M.METAL);
  }
  b.fill(x0 + 30, y + 9, zb + 4, x0 + 92, y + 10, zb + 15, (_x, _y, z) =>
    (z - zb) % 4 === 3 ? 0 : M.PLANKS,
  );
  b.fill(x0 + 30, y + 9, zb + 2, x0 + 92, y + 10, zb + 4, M.METAL);
}

function poster(z: number, h: number): number {
  const d = Math.hypot(z - 13, h - 30);
  if (d < 6) return M.PRODUCT_ORANGE;
  if (h < 14)
    return h % 4 === 0 && z > 6 && z < 20 ? M.ROAD_WHITE : M.PRODUCT_RED;
  if (h > 38 && h < 42 && z > 6 && z < 22 && hash3(z, h, 1) < 0.7)
    return M.ROAD_WHITE;
  return M.PRODUCT_BLUE;
}
