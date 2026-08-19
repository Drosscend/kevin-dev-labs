import { Vector2 } from "three";

/**
 * The visitor, as felt from inside the tank: a place on the glass, a speed, and knocks.
 * A mouse lingers once it stops moving; a finger that lifts leaves nobody there.
 */
/** How short and how still a touch has to be to count as a knock rather than a caress. */
const TAP_TIME = 400;
const TAP_SLIP = 0.035;

export class Presence {
  readonly ndc = new Vector2();
  speed = 0;
  idle = 99;
  gone = true;
  down = false;
  knocked = false;

  private readonly last = new Vector2();
  private readonly tapFrom = new Vector2();
  private pending = false;
  private tapping = false;
  private tapAt = 0;

  listen(wake: () => void): void {
    const notice = (event: PointerEvent) => {
      this.ndc.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      this.idle = 0;
      this.gone = false;
      if (this.tapping && this.ndc.distanceTo(this.tapFrom) > TAP_SLIP) this.tapping = false;
      wake();
    };

    window.addEventListener("pointermove", notice);
    window.addEventListener("pointerdown", (event) => {
      notice(event);
      this.down = true;
      // A mouse click is always a knock. A finger might be on its way to stroking the pane,
      // so it only counts as one if it leaves again straight away.
      if (event.pointerType === "mouse") {
        this.pending = true;
        return;
      }
      this.tapping = true;
      this.tapAt = performance.now();
      this.tapFrom.copy(this.ndc);
    });
    window.addEventListener("pointerup", (event) => {
      this.down = false;
      if (event.pointerType === "mouse") return;
      if (this.tapping && performance.now() - this.tapAt < TAP_TIME) this.pending = true;
      this.tapping = false;
      this.gone = true;
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
