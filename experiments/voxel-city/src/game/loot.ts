import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  type Scene,
  Sprite,
  SpriteMaterial,
  type Vector3,
} from "three";
import { VOXEL } from "../engine/constants";
import type { World } from "../engine/world";
import { weaponDef } from "./weapons";
import type { WeaponId } from "./weapons/types";

const RESPAWN = 20;

export interface LootSpawn {
  weapon: WeaponId;
  position: Vector3;
}

interface Spot {
  weapon: WeaponId;
  home: Vector3;
  position: Vector3;
  model: Group;
  vy: number;
  active: boolean;
  timer: number;
}

export interface LootTarget {
  weapon: WeaponId;
  spot: Spot;
}

function glowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,220,120,0.9)");
    g.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(canvas);
}

/** Weapon pickups lying on the map; they fall when the ground breaks and respawn after a while. */
export class Loot {
  private readonly spots: Spot[] = [];
  private readonly glow = glowTexture();
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly world: World,
  ) {}

  setSpawns(spawns: LootSpawn[]): void {
    for (const s of this.spots) this.scene.remove(s.model);
    this.spots.length = 0;
    for (const { weapon, position } of spawns) {
      const model = new Group();
      model.add(weaponDef(weapon).pickupModel());
      const halo = new Sprite(
        new SpriteMaterial({
          map: this.glow,
          blending: AdditiveBlending,
          transparent: true,
          depthWrite: false,
        }),
      );
      halo.scale.setScalar(0.9);
      halo.position.y = 0.15;
      model.add(halo);
      const spot = {
        weapon,
        home: position.clone(),
        position: position.clone(),
        model,
        vy: 0,
        active: false,
        timer: 0,
      };
      this.activate(spot);
      this.spots.push(spot);
    }
  }

  take(target: LootTarget): void {
    target.spot.active = false;
    target.spot.timer = RESPAWN;
    this.scene.remove(target.spot.model);
  }

  update(dt: number, eye: Vector3, look: Vector3): LootTarget | null {
    this.time += dt;
    let best: LootTarget | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const s of this.spots) {
      if (!s.active) {
        s.timer -= dt;
        if (s.timer <= 0) this.activate(s);
        continue;
      }
      this.fall(s, dt);
      s.model.position.copy(s.position);
      s.model.position.y += 0.1 + Math.sin(this.time * 2.5 + s.home.x) * 0.04;
      s.model.rotation.y = this.time * 0.9;
      const to = s.model.position.clone().sub(eye);
      const d = to.length();
      if (
        d < 2.4 &&
        (to.normalize().dot(look) > 0.8 || d < 1.1) &&
        d < bestDistance
      ) {
        bestDistance = d;
        best = { weapon: s.weapon, spot: s };
      }
    }
    return best;
  }

  private activate(s: Spot): void {
    s.position.copy(s.home);
    s.vy = 0;
    s.active = true;
    this.scene.add(s.model);
  }

  private fall(s: Spot, dt: number): void {
    const p = s.position;
    if (this.world.isSolidAt(p.x / VOXEL, (p.y - 0.01) / VOXEL, p.z / VOXEL)) {
      s.vy = 0;
      return;
    }
    s.vy -= 9.81 * dt;
    const ny = p.y + s.vy * dt;
    if (this.world.isSolidAt(p.x / VOXEL, ny / VOXEL, p.z / VOXEL)) {
      p.y = (Math.floor(ny / VOXEL) + 1) * VOXEL;
      s.vy = 0;
    } else p.y = ny;
  }
}
