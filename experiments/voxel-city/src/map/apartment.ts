import type { Builder } from "../engine/builder";
import { stairCore } from "./apartment/core";
import { balconies, fireEscape } from "./apartment/outdoor";
import { roof } from "./apartment/roof";
import { facadeDetails, structure, windows } from "./apartment/shell";
import { units } from "./apartment/units";
import { backYard, frontYard } from "./apartment/yard";

/** Five-level brick apartment block with furnished units, stair core, balconies and yards. */
export function apartment(b: Builder): void {
  frontYard(b);
  structure(b);
  windows(b);
  units(b);
  stairCore(b);
  balconies(b);
  fireEscape(b);
  roof(b);
  facadeDetails(b);
  backYard(b);
}
