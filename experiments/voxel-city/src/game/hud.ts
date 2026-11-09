import type { Inventory } from "./inventory";
import type { LootTarget } from "./loot";
import { weaponDef } from "./weapons";

function element(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} manquant`);
  return el;
}

/** Hotbar, pickup prompt and debug counters. */
export class Hud {
  readonly overlay = element("overlay");
  readonly overlayTitle = element("overlay-title");
  private readonly hotbar = element("hotbar");
  private readonly prompt = element("prompt");
  private readonly stats = element("stats");
  private lastHotbar = "";

  update(inventory: Inventory, target: LootTarget | null, stats: string): void {
    const entries = inventory.entries();
    const key = entries.map((e) => `${e.owned}${e.ammo}${e.selected}`).join();
    if (key !== this.lastHotbar) {
      this.lastHotbar = key;
      this.hotbar.replaceChildren(
        ...entries.map((e) => {
          const slot = document.createElement("div");
          slot.className = "slot";
          slot.classList.toggle("owned", e.owned);
          slot.classList.toggle("selected", e.selected);
          const ammo = e.def.infinite ? "∞" : e.owned ? String(e.ammo) : "";
          slot.innerHTML = `<kbd>${e.def.slot}</kbd><span class="name">${e.def.name}</span><span class="ammo">${ammo}</span>`;
          return slot;
        }),
      );
    }
    if (target) {
      const def = weaponDef(target.weapon);
      this.prompt.textContent = inventory.canTake(target.weapon)
        ? `[E] Ramasser : ${def.name}${def.infinite ? "" : ` × ${def.pickupAmmo}`}`
        : `${def.name} : plein`;
      this.prompt.hidden = false;
    } else this.prompt.hidden = true;
    this.stats.textContent = stats;
  }
}
