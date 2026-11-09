import { Vector3 } from "three";
import { Builder } from "../engine/builder";
import { VOXEL, vox } from "../engine/constants";
import type { World } from "../engine/world";
import type { LootSpawn } from "../game/loot";
import { apartment } from "./apartment";
import { cafe } from "./cafe";
import { house } from "./house";
import { G, SIDEWALK_TOP } from "./layout";
import { park } from "./park";
import { props } from "./props";
import { street, terrain } from "./street";

export interface MapInfo {
  spawn: Vector3;
  loot: LootSpawn[];
}

const at = (x: number, y: number, z: number) => new Vector3(x, y * VOXEL, z);

/** Builds the whole block into `world` and returns where the player and the pickups start. */
export function generateMap(world: World): MapInfo {
  world.clear();
  const b = new Builder(world);
  terrain(b);
  street(b);
  house(b);
  apartment(b);
  cafe(b);
  park(b);
  props(b);
  return {
    spawn: at(26, SIDEWALK_TOP + 2, 1.5),
    loot: [
      { weapon: "shotgun", position: at(22, SIDEWALK_TOP, 12.5) },
      { weapon: "dynamite", position: at(24, G, 16) },
      { weapon: "dynamite", position: at(30.5, G, 31.5) },
      { weapon: "grenade", position: at(36, SIDEWALK_TOP, 12.5) },
      { weapon: "rocket", position: at(26, G, vox(45) * VOXEL) },
      { weapon: "shotgun", position: at(10, SIDEWALK_TOP, 1.5) },
      { weapon: "grenade", position: at(42, SIDEWALK_TOP, 1.5) },
    ],
  };
}
