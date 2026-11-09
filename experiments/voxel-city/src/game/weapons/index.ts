import { dynamite } from "./dynamite";
import { grenade } from "./grenade";
import { hammer } from "./hammer";
import { rocket } from "./rocket";
import { shotgun } from "./shotgun";
import type { WeaponDef, WeaponId } from "./types";

export const WEAPONS: WeaponDef[] = [
  hammer,
  shotgun,
  dynamite,
  grenade,
  rocket,
].sort((a, b) => a.slot - b.slot);

export function weaponDef(id: WeaponId): WeaponDef {
  const def = WEAPONS.find((w) => w.id === id);
  if (!def) throw new Error(`Arme inconnue : ${id}`);
  return def;
}
