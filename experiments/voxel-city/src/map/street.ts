import { type Builder, hash3 } from "../engine/builder";
import { SIZE_X, SIZE_Z, vox } from "../engine/constants";
import { M } from "../engine/materials";
import { G, ZONES } from "./layout";

/** Bedrock, dirt and grass everywhere, then the road and both sidewalks. */
export function terrain(b: Builder): void {
  b.fill(0, 0, 0, SIZE_X, 1, SIZE_Z, M.BEDROCK);
  b.fill(0, 1, 0, SIZE_X, G - 1, SIZE_Z, M.DIRT);
  b.fill(0, G - 1, 0, SIZE_X, G, SIZE_Z, (x, _y, z) =>
    hash3(x >> 4, 0, z >> 4) < 0.3 || hash3(x, 1, z) < 0.3
      ? M.GRASS_DARK
      : M.GRASS,
  );
}

export function street(b: Builder): void {
  const road = ZONES.road;
  const line = vox(7);
  const crossing = { x0: vox(23), x1: vox(27) };
  b.fill(0, G - 1, road.z0, SIZE_X, G, road.z1, (x, _y, z) => {
    if (
      x >= crossing.x0 &&
      x < crossing.x1 &&
      z > road.z0 + 8 &&
      z < road.z1 - 8
    )
      return (z - road.z0) % 16 < 8 ? M.ROAD_WHITE : M.ASPHALT;
    if (z >= line - 2 && z < line + 2 && x % 60 < 32) return M.ROAD_LINE;
    return M.ASPHALT;
  });
  sidewalk(b, ZONES.sidewalkSouth.z0, ZONES.sidewalkSouth.z1, road.z0 - 1);
  sidewalk(b, ZONES.sidewalkNorth.z0, ZONES.sidewalkNorth.z1, road.z1);
}

function sidewalk(b: Builder, z0: number, z1: number, curbZ: number): void {
  b.fill(0, G - 1, z0, SIZE_X, G, z1, M.CONCRETE);
  b.fill(0, G, z0, SIZE_X, G + 2, z1, (x, _y, z) => {
    if (Math.abs(z - curbZ) <= 1) return M.CURB;
    if (x % 30 === 0 || (z - z0) % 30 === 0) return M.CONCRETE;
    return M.SIDEWALK;
  });
}
