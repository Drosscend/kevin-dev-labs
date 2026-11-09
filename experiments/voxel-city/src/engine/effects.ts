import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  NormalBlending,
  PointLight,
  type Scene,
  Sprite,
  SpriteMaterial,
  type Texture,
  Vector3,
} from "three";

export interface PuffOptions {
  color: Color;
  additive: boolean;
  life: number;
  startScale: number;
  endScale: number;
  opacity: number;
  drag: number;
  /** Upward acceleration (m/s²); negative values fall. */
  rise: number;
}

interface Puff extends PuffOptions {
  sprite: Sprite;
  velocity: Vector3;
  age: number;
}

const MAX_PUFFS = 900;

let glow: Texture | null = null;

/** Soft white radial sprite texture, shared by every glow and puff. */
export function glowTexture(): Texture {
  if (glow) return glow;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  glow = new CanvasTexture(canvas);
  return glow;
}

export function randomDir(length: number, upBias = 0.2): Vector3 {
  return new Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5 + upBias,
    Math.random() - 0.5,
  )
    .normalize()
    .multiplyScalar(length);
}

/** Sprites for fire, smoke, dust and sparks, plus one reusable flash light. */
export class Effects {
  shake = 0;
  private readonly puffs: Puff[] = [];
  private readonly flash = new PointLight(0xffa64d, 0, 40, 1.6);

  constructor(private readonly scene: Scene) {
    scene.add(this.flash);
  }

  get count(): number {
    return this.puffs.length;
  }

  /** `scale` 1 matches a dynamite stick. */
  explosion(pos: Vector3, scale = 1): void {
    this.light(pos, 600 * scale);
    for (let i = 0; i < 18 * scale; i++)
      this.puff(pos, randomDir((4 + Math.random() * 5) * scale), {
        color: new Color().setHSL(
          0.05 + Math.random() * 0.07,
          1,
          0.5 + Math.random() * 0.15,
        ),
        additive: true,
        life: 0.3 + Math.random() * 0.35,
        startScale: 0.6 * scale,
        endScale: (2.6 + Math.random()) * scale,
        opacity: 1,
        drag: 4,
        rise: 1,
      });
    for (let i = 0; i < 24 * scale; i++) {
      const v = 0.22 + Math.random() * 0.25;
      this.puff(pos, randomDir((2 + Math.random() * 2.5) * scale), {
        color: new Color(v, v, v * 0.95),
        additive: false,
        life: 3 + Math.random() * 3,
        startScale: 1 * scale,
        endScale: (4.5 + Math.random() * 2.5) * scale,
        opacity: 0.6,
        drag: 2.2,
        rise: 0.8,
      });
    }
    this.sparks(pos, new Vector3(0, 1, 0), Math.round(40 * scale), 14 * scale);
  }

  dust(
    pos: Vector3,
    amount: number,
    radius: number,
    color = new Color(0.62, 0.56, 0.48),
  ): void {
    for (let i = 0; i < amount; i++) {
      const p = pos.clone().add(randomDir(radius * Math.random(), 0));
      this.puff(p, randomDir(1 + Math.random(), 0.3), {
        color,
        additive: false,
        life: 1.5 + Math.random() * 2,
        startScale: 0.4,
        endScale: 1.6 + Math.random() * 1.6,
        opacity: 0.45,
        drag: 2,
        rise: 0.3,
      });
    }
  }

  /** Short-lived bright particles thrown around `normal`. */
  sparks(pos: Vector3, normal: Vector3, count: number, speed = 8): void {
    for (let i = 0; i < count; i++) {
      const v = randomDir(speed * (0.4 + Math.random() * 0.6), 0).add(
        normal.clone().multiplyScalar(speed * 0.5),
      );
      this.puff(pos, v, {
        color: new Color(1, 0.75 + Math.random() * 0.2, 0.35),
        additive: true,
        life: 0.25 + Math.random() * 0.45,
        startScale: 0.06,
        endScale: 0.02,
        opacity: 1,
        drag: 1.5,
        rise: -9.81,
      });
    }
  }

  /** A single smoke puff, used for trails and muzzles. */
  smoke(
    pos: Vector3,
    velocity: Vector3,
    size = 0.4,
    life = 1.2,
    shade = 0.75,
  ): void {
    this.puff(pos, velocity, {
      color: new Color(shade, shade, shade),
      additive: false,
      life,
      startScale: size * 0.5,
      endScale: size * 2.5,
      opacity: 0.5,
      drag: 2,
      rise: 0.6,
    });
  }

  /** Brief point light at `pos` (candela). */
  light(pos: Vector3, intensity: number): void {
    if (intensity < this.flash.intensity) return;
    this.flash.position.copy(pos);
    this.flash.intensity = intensity;
  }

  puff(pos: Vector3, velocity: Vector3, o: PuffOptions): void {
    if (this.puffs.length >= MAX_PUFFS) return;
    const material = new SpriteMaterial({
      map: glowTexture(),
      color: o.color,
      transparent: true,
      depthWrite: false,
      blending: o.additive ? AdditiveBlending : NormalBlending,
      opacity: o.opacity,
    });
    const sprite = new Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.setScalar(o.startScale);
    this.scene.add(sprite);
    this.puffs.push({ ...o, sprite, velocity, age: 0 });
  }

  update(dt: number): void {
    this.flash.intensity *= Math.exp(-dt * 12);
    this.shake *= Math.exp(-dt * 6);
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.puffs[i] = this.puffs[this.puffs.length - 1];
        this.puffs.pop();
        continue;
      }
      p.velocity.multiplyScalar(Math.exp(-p.drag * dt));
      p.velocity.y += p.rise * dt;
      p.sprite.position.addScaledVector(p.velocity, dt);
      p.sprite.scale.setScalar(
        p.startScale + (p.endScale - p.startScale) * (1 - (1 - t) ** 2),
      );
      p.sprite.material.opacity = p.opacity * (1 - t) ** 1.5;
    }
  }
}
