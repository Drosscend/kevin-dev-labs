import { Vector2 } from "three";

/**
 * The visitor, as felt from inside the tank: a place on the glass, a speed, and knocks.
 * A mouse lingers once it stops moving; a finger that lifts leaves nobody there.
 */
export class Presence {
  readonly ndc = new Vector2();
  speed = 0;
  idle = 99;
  gone = true;
  down = false;
  knocked = false;

  private readonly last = new Vector2();
  private pending = false;

  listen(wake: () => void): void {
    const notice = (event: PointerEvent) => {
      this.ndc.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      this.idle = 0;
      this.gone = false;
      wake();
    };

    window.addEventListener("pointermove", notice);
    window.addEventListener("pointerdown", (event) => {
      notice(event);
      this.down = true;
      this.pending = true;
    });
    window.addEventListener("pointerup", (event) => {
      this.down = false;
      if (event.pointerType !== "mouse") this.gone = true;
    });
    window.addEventListener("pointerout", (event) => {
      if (!event.relatedTarget) this.gone = true;
    });
  }

  update(dt: number): void {
    this.idle += dt;
    this.speed = Math.min(this.last.distanceTo(this.ndc) / Math.max(dt, 0.008), 10);
    this.last.copy(this.ndc);
    this.knocked = this.pending;
    this.pending = false;
  }
}
