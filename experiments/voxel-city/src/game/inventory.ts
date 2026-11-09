import { WEAPONS, weaponDef } from "./weapons";
import type {
  Ammo,
  FireInput,
  Weapon,
  WeaponContext,
  WeaponDef,
  WeaponId,
} from "./weapons/types";

/** Layer of the view models, drawn after the world so they never clip into walls. */
export const VIEW_LAYER = 1;

interface Slot {
  def: WeaponDef;
  weapon: Weapon;
  ammo: number;
}

/** Owned weapons, their ammo, and which one is in hand. */
export class Inventory {
  private readonly slots = new Map<WeaponId, Slot>();
  private current: Slot | null = null;

  constructor(private readonly ctx: WeaponContext) {}

  get selected(): WeaponId | null {
    return this.current?.def.id ?? null;
  }

  /** Hotbar content in slot order. */
  entries(): {
    def: WeaponDef;
    owned: boolean;
    ammo: number;
    selected: boolean;
  }[] {
    return WEAPONS.map((def) => {
      const slot = this.slots.get(def.id);
      return {
        def,
        owned: !!slot,
        ammo: slot?.ammo ?? 0,
        selected: this.current?.def.id === def.id,
      };
    });
  }

  give(id: WeaponId, amount: number): void {
    const def = weaponDef(id);
    let slot = this.slots.get(id);
    if (!slot) {
      slot = { def, weapon: def.create(this.ctx), ammo: 0 };
      this.slots.set(id, slot);
      if (!this.current || this.current.def.infinite) this.select(id);
    }
    slot.ammo = Math.min(def.maxAmmo, slot.ammo + amount);
  }

  canTake(id: WeaponId): boolean {
    const def = weaponDef(id);
    const slot = this.slots.get(id);
    return !slot || (!def.infinite && slot.ammo < def.maxAmmo);
  }

  select(id: WeaponId): void {
    const slot = this.slots.get(id);
    if (!slot || slot === this.current) return;
    if (this.current) this.ctx.camera.remove(this.current.weapon.view);
    this.current = slot;
    slot.weapon.view.traverse((o) => o.layers.set(VIEW_LAYER));
    this.ctx.camera.add(slot.weapon.view);
    this.ctx.audio.click();
  }

  selectSlot(n: number): void {
    const def = WEAPONS.find((w) => w.slot === n);
    if (def) this.select(def.id);
  }

  cycle(step: number): void {
    const owned = WEAPONS.filter((w) => this.slots.has(w.id));
    if (owned.length === 0) return;
    const i = owned.findIndex((w) => w.id === this.current?.def.id);
    this.select(owned[(i + step + owned.length) % owned.length].id);
  }

  clear(): void {
    if (this.current) this.ctx.camera.remove(this.current.weapon.view);
    this.current = null;
    this.slots.clear();
  }

  update(dt: number, input: FireInput): void {
    const slot = this.current;
    if (!slot) return;
    const ammo: Ammo = {
      get count() {
        return slot.def.infinite ? Number.POSITIVE_INFINITY : slot.ammo;
      },
      take() {
        if (slot.def.infinite) return true;
        if (slot.ammo <= 0) return false;
        slot.ammo--;
        return true;
      },
    };
    slot.weapon.update(dt, input, ammo);
  }
}
