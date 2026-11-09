import {
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  Vector3,
} from "three";
import type { GameAudio } from "../../engine/audio";
import type { Debris } from "../../engine/debris";
import type { Destruction } from "../../engine/destruction";
import type { Effects } from "../../engine/effects";
import type { Physics } from "../../engine/physics";
import type { World } from "../../engine/world";
import type { Player } from "../player";
import type { Projectiles } from "../projectiles";

export type WeaponId = "hammer" | "shotgun" | "dynamite" | "grenade" | "rocket";

/** Everything a weapon may use. Camera children are rendered in front of the player. */
export interface WeaponContext {
  scene: Scene;
  camera: PerspectiveCamera;
  world: World;
  destruction: Destruction;
  physics: Physics;
  projectiles: Projectiles;
  effects: Effects;
  audio: GameAudio;
  debris: Debris;
  player: Player;
}

export interface FireInput {
  /** True only on the frame the button went down. */
  pressed: boolean;
  held: boolean;
}

export interface Ammo {
  readonly count: number;
  /** Consumes one round; false when empty. Always true for infinite weapons. */
  take(): boolean;
}

export interface Weapon {
  /** View model, attached to the camera while equipped. */
  readonly view: Object3D;
  /** Called every frame while equipped. */
  update(dt: number, input: FireInput, ammo: Ammo): void;
}

export interface WeaponDef {
  id: WeaponId;
  /** Label shown in the hotbar (French). */
  name: string;
  /** Hotbar slot, 1 to 5. */
  slot: number;
  infinite: boolean;
  /** Rounds given by one pickup. */
  pickupAmmo: number;
  maxAmmo: number;
  create(ctx: WeaponContext): Weapon;
  /** Model lying on the map, about 40 cm long, origin at its bottom center. */
  pickupModel(): Object3D;
}

/** Camera position and forward direction. */
export function aim(camera: PerspectiveCamera): {
  origin: Vector3;
  dir: Vector3;
} {
  const dir = new Vector3();
  camera.getWorldDirection(dir);
  return { origin: camera.position.clone(), dir };
}
