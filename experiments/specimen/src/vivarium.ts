import { MathUtils, type PerspectiveCamera, Vector2, type Vector3 } from "three";

/** Where the front pane sits, and where the murk at the back begins. */
const GLASS = 1.2;
const BACK = -2.5;

const span = new Vector2();

/**
 * The tank. Its walls are whatever the fixed camera can see at a given depth, so the creature
 * has real room to swim without ever leaving the frame.
 */
export class Vivarium {
  readonly glass = GLASS;
  readonly back = BACK;

  private spread = 0.38;
  private aspect = 1;
  private eye = 3.9;

  constructor(private readonly camera: PerspectiveCamera) {
    this.measure();
  }

  /** The walls follow the frustum, so they move with every resize. */
  measure(): void {
    this.spread = Math.tan(MathUtils.degToRad(this.camera.fov) * 0.5);
    this.aspect = this.camera.aspect;
    this.eye = this.camera.position.z;
  }

  /** Half-width and half-height of what is visible at that depth. */
  extent(z: number, out: Vector2): Vector2 {
    const half = this.spread * (this.eye - z);
    return out.set(half * this.aspect, half);
  }

  /** Where a point on screen lands once pushed back to that depth. */
  place(ndcX: number, ndcY: number, z: number, out: Vector3): Vector3 {
    this.extent(z, span);
    return out.set(ndcX * span.x, ndcY * span.y, z);
  }

  /** The bottom of the tank, which slopes away with the frustum. */
  floor(z: number, radius: number): number {
    return -this.extent(z, span).y + radius;
  }

  /** Keeps the creature behind the glass, and takes the outward push out of its velocity. */
  contain(position: Vector3, velocity: Vector3, radius: number): void {
    const front = this.glass - radius;
    const rear = this.back + radius * 0.5;
    if (position.z > front) {
      position.z = front;
      velocity.z = -Math.abs(velocity.z) * 0.25;
    } else if (position.z < rear) {
      position.z = rear;
      velocity.z = Math.abs(velocity.z) * 0.25;
    }

    this.extent(position.z, span);
    const wide = Math.max(span.x - radius, 0);
    const high = Math.max(span.y - radius, 0);
    if (position.x > wide) {
      position.x = wide;
      velocity.x = -Math.abs(velocity.x) * 0.25;
    } else if (position.x < -wide) {
      position.x = -wide;
      velocity.x = Math.abs(velocity.x) * 0.25;
    }
    if (position.y > high) {
      position.y = high;
      velocity.y = -Math.abs(velocity.y) * 0.25;
    } else if (position.y < -high) {
      position.y = -high;
      velocity.y = Math.abs(velocity.y) * 0.25;
    }
  }
}
