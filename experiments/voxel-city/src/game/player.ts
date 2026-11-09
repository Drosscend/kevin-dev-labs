import { type Camera, Vector3 } from "three";
import { SIZE_X, SIZE_Z, VOXEL } from "../engine/constants";
import type { World } from "../engine/world";

const RADIUS = 0.28;
const HEIGHT = 1.7;
const EYE = 1.58;
const GRAVITY = 22;
const JUMP = 7.2;
const WALK = 4.8;
const SPRINT = 8;
const MAX_STEP = 9;
const EPS = 1e-4;

export interface MoveInput {
  forward: number;
  right: number;
  jump: boolean;
  sprint: boolean;
}

/** First-person walker colliding against the voxel grid, with automatic step-up over rubble. */
export class Player {
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  onGround = false;
  private smoothY = 0;
  private readonly forward = new Vector3();
  private readonly right = new Vector3();

  constructor(private readonly world: World) {}

  spawn(position: Vector3): void {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.smoothY = position.y;
  }

  get eye(): Vector3 {
    return new Vector3(this.position.x, this.smoothY + EYE, this.position.z);
  }

  update(dt: number, input: MoveInput, camera: Camera): void {
    this.unstick();
    camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, camera.up).normalize();
    const wish = new Vector3()
      .addScaledVector(this.forward, input.forward)
      .addScaledVector(this.right, input.right);
    if (wish.lengthSq() > 1) wish.normalize();
    wish.multiplyScalar(input.sprint ? SPRINT : WALK);

    const k = 1 - Math.exp(-(this.onGround ? 14 : 2.5) * dt);
    this.velocity.x += (wish.x - this.velocity.x) * k;
    this.velocity.z += (wish.z - this.velocity.z) * k;
    if (input.jump && this.onGround) this.velocity.y = JUMP;
    this.velocity.y = Math.max(-40, this.velocity.y - GRAVITY * dt);

    const travel = Math.max(
      Math.abs(this.velocity.x),
      Math.abs(this.velocity.y),
      Math.abs(this.velocity.z),
    );
    const steps = Math.max(1, Math.ceil((travel * dt) / VOXEL));
    const h = dt / steps;
    const wasGrounded = this.onGround;
    this.onGround = false;
    for (let s = 0; s < steps; s++) {
      this.moveHorizontal(this.velocity.x * h, 0, wasGrounded);
      this.moveHorizontal(0, this.velocity.z * h, wasGrounded);
      this.moveVertical(this.velocity.y * h);
    }
    if (!this.onGround && this.velocity.y <= 0)
      this.onGround = this.collides(
        this.position.x,
        this.position.y - 0.02,
        this.position.z,
      );

    const margin = RADIUS + 0.05;
    this.position.x = Math.min(
      SIZE_X * VOXEL - margin,
      Math.max(margin, this.position.x),
    );
    this.position.z = Math.min(
      SIZE_Z * VOXEL - margin,
      Math.max(margin, this.position.z),
    );

    const y = this.position.y;
    if (y > this.smoothY)
      this.smoothY = Math.max(
        y - 0.5,
        this.smoothY + (y - this.smoothY) * Math.min(1, dt * 16),
      );
    else this.smoothY = y;
  }

  private moveHorizontal(dx: number, dz: number, grounded: boolean): void {
    if (dx === 0 && dz === 0) return;
    const { x, y, z } = this.position;
    const nx = x + dx;
    const nz = z + dz;
    if (!this.collides(nx, y, nz)) {
      this.position.x = nx;
      this.position.z = nz;
      return;
    }
    if (grounded || this.onGround) {
      for (let s = 1; s <= MAX_STEP; s++) {
        const sy = (Math.floor(y / VOXEL + EPS) + s) * VOXEL;
        if (!this.collides(nx, sy, nz) && !this.collides(x, sy, z)) {
          this.position.set(nx, sy, nz);
          return;
        }
      }
    }
    if (dx !== 0) this.velocity.x = 0;
    if (dz !== 0) this.velocity.z = 0;
  }

  private moveVertical(dy: number): void {
    const { x, y, z } = this.position;
    const ny = y + dy;
    if (!this.collides(x, ny, z)) {
      this.position.y = ny;
      return;
    }
    if (dy < 0) {
      this.onGround = true;
      const snapped = (Math.floor(ny / VOXEL) + 1) * VOXEL;
      if (!this.collides(x, snapped, z)) this.position.y = snapped;
    }
    this.velocity.y = 0;
  }

  private unstick(): void {
    const { x, z } = this.position;
    for (let i = 0; i < 60 && this.collides(x, this.position.y, z); i++)
      this.position.y = (Math.floor(this.position.y / VOXEL) + 1) * VOXEL;
  }

  collides(px: number, py: number, pz: number): boolean {
    const x0 = Math.floor((px - RADIUS) / VOXEL);
    const x1 = Math.floor((px + RADIUS) / VOXEL - EPS);
    const y0 = Math.floor(py / VOXEL + EPS);
    const y1 = Math.floor((py + HEIGHT) / VOXEL - EPS);
    const z0 = Math.floor((pz - RADIUS) / VOXEL);
    const z1 = Math.floor((pz + RADIUS) / VOXEL - EPS);
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++)
          if (this.world.get(x, y, z) !== 0) return true;
    return false;
  }
}
