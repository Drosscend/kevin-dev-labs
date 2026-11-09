import {
  AdditiveBlending,
  BoxGeometry,
  type BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { glowTexture, randomDir } from "../../engine/effects";
import { smoothstep, ViewMotion } from "./shared";
import { aim, type WeaponContext, type WeaponDef } from "./types";

const BLAST = 2.6;
const START_SPEED = 24;
const MAX_SPEED = 48;
const ACCELERATION = 45;
const GRAVITY = 0.1;
const LIFETIME = 6;
const RELOAD_TIME = 1.6;
const TRAIL_SPACING = 0.6;
const UP = new Vector3(0, 1, 0);

const olive = new MeshLambertMaterial({ color: 0x4f5a2e });
const oliveDark = new MeshLambertMaterial({ color: 0x353d1d });
const black = new MeshLambertMaterial({ color: 0x1e1e1c });
const bellMaterial = new MeshLambertMaterial({
  color: 0x2a2a26,
  side: DoubleSide,
});
const steel = new MeshLambertMaterial({ color: 0x8c8e88 });
const warhead = new MeshLambertMaterial({ color: 0x5d6448 });
const yellow = new MeshLambertMaterial({ color: 0xd8a51c });
const lens = new MeshLambertMaterial({ color: 0x220000, emissive: 0xff3020 });

function glowSprite(color: number, name: string, scale: number): Sprite {
  const s = new Sprite(
    new SpriteMaterial({
      map: glowTexture(),
      color,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  s.name = name;
  s.scale.setScalar(scale);
  return s;
}

function mesh(
  geometry: BufferGeometry,
  material: MeshLambertMaterial,
  x: number,
  y: number,
  z: number,
): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** Flying rocket pointing along +Y, with its exhaust flame. */
function rocketModel(): Group {
  const g = new Group();
  g.add(mesh(new CylinderGeometry(0.035, 0.035, 0.36, 12), olive, 0, 0, 0));
  g.add(mesh(new CylinderGeometry(0.048, 0.035, 0.04, 12), warhead, 0, 0.2, 0));
  g.add(mesh(new CylinderGeometry(0.048, 0.048, 0.1, 12), warhead, 0, 0.27, 0));
  g.add(
    mesh(new CylinderGeometry(0.049, 0.049, 0.014, 12), yellow, 0, 0.25, 0),
  );
  g.add(mesh(new ConeGeometry(0.048, 0.14, 12), warhead, 0, 0.39, 0));
  g.add(mesh(new SphereGeometry(0.008, 6, 4), steel, 0, 0.46, 0));
  g.add(mesh(new CylinderGeometry(0.025, 0.032, 0.04, 10), black, 0, -0.2, 0));
  const finGeometry = new BoxGeometry(0.005, 0.1, 0.06);
  for (let k = 0; k < 4; k++) {
    const pivot = new Group();
    pivot.rotation.y = (k * Math.PI) / 2 + Math.PI / 4;
    pivot.position.y = -0.13;
    pivot.add(mesh(finGeometry, oliveDark, 0, 0, 0.06));
    g.add(pivot);
  }
  for (const child of g.children) child.castShadow = true;
  const flame = glowSprite(0xff8a2a, "flame", 0.4);
  flame.position.y = -0.32;
  const core = glowSprite(0xfff2c0, "core", 0.16);
  core.position.y = -0.24;
  g.add(flame, core);
  return g;
}

/** Warhead sticking out of the tube, pointing along -Z from its base. */
function tipModel(): Group {
  const g = new Group();
  const parts = [
    mesh(new CylinderGeometry(0.03, 0.03, 0.05, 12), warhead, 0, 0.02, 0),
    mesh(new CylinderGeometry(0.05, 0.05, 0.09, 14), warhead, 0, 0.085, 0),
    mesh(new CylinderGeometry(0.051, 0.051, 0.014, 14), yellow, 0, 0.07, 0),
    mesh(new ConeGeometry(0.05, 0.15, 14), warhead, 0, 0.205, 0),
    mesh(new SphereGeometry(0.009, 6, 4), steel, 0, 0.28, 0),
  ];
  const holder = new Group();
  holder.rotation.x = -Math.PI / 2;
  holder.add(...parts);
  g.add(holder);
  return g;
}

/** Launcher with its tube along -Z; the warhead group is named "tip". */
function launcherModel(): Group {
  const g = new Group();
  const tube = new Group();
  tube.rotation.x = Math.PI / 2;
  tube.add(
    mesh(new CylinderGeometry(0.055, 0.055, 0.9, 18), olive, 0, 0, 0),
    mesh(new CylinderGeometry(0.063, 0.063, 0.05, 18), oliveDark, 0, -0.43, 0),
    mesh(new CylinderGeometry(0.059, 0.059, 0.03, 18), oliveDark, 0, -0.2, 0),
    mesh(new CylinderGeometry(0.059, 0.059, 0.03, 18), oliveDark, 0, 0.15, 0),
  );
  const bell = new Mesh(
    new CylinderGeometry(0.078, 0.058, 0.12, 18, 1, true),
    bellMaterial,
  );
  bell.position.y = 0.5;
  tube.add(bell);
  tube.position.z = -0.1;
  g.add(tube);

  const grip = mesh(new BoxGeometry(0.032, 0.1, 0.045), black, 0, -0.1, -0.02);
  grip.rotation.x = 0.25;
  const guard = mesh(
    new BoxGeometry(0.008, 0.008, 0.06),
    black,
    0,
    -0.1,
    -0.07,
  );
  const trigger = mesh(
    new BoxGeometry(0.006, 0.025, 0.006),
    steel,
    0,
    -0.075,
    -0.06,
  );
  const foregrip = mesh(
    new BoxGeometry(0.03, 0.08, 0.04),
    black,
    0,
    -0.09,
    -0.33,
  );
  foregrip.rotation.x = 0.15;
  const pad = mesh(
    new BoxGeometry(0.07, 0.035, 0.18),
    oliveDark,
    0,
    -0.065,
    0.12,
  );
  g.add(grip, guard, trigger, foregrip, pad);

  const sight = new Group();
  sight.position.set(-0.05, 0.07, -0.26);
  sight.add(mesh(new BoxGeometry(0.02, 0.03, 0.07), black, 0, -0.012, 0));
  const scope = new Mesh(
    new CylinderGeometry(0.016, 0.016, 0.12, 12),
    oliveDark,
  );
  scope.rotation.x = Math.PI / 2;
  scope.position.y = 0.012;
  sight.add(scope);
  sight.add(mesh(new SphereGeometry(0.011, 8, 6), lens, 0, 0.012, 0.058));
  const hood = mesh(
    new CylinderGeometry(0.019, 0.019, 0.02, 12),
    black,
    0,
    0.012,
    -0.06,
  );
  hood.rotation.x = Math.PI / 2;
  sight.add(hood);
  g.add(sight);

  const tip = tipModel();
  tip.name = "tip";
  tip.position.z = -0.55;
  g.add(tip);
  return g;
}

function fire(
  ctx: WeaponContext,
  color: Color,
  pos: Vector3,
  velocity: Vector3,
  life: number,
  startScale: number,
  endScale: number,
): void {
  ctx.effects.puff(pos, velocity, {
    color,
    additive: true,
    life,
    startScale,
    endScale,
    opacity: 1,
    drag: 4,
    rise: 0.5,
  });
}

function smokePuff(
  ctx: WeaponContext,
  pos: Vector3,
  velocity: Vector3,
  life: number,
  startScale: number,
  endScale: number,
  shade: number,
  opacity = 0.55,
): void {
  ctx.effects.puff(pos, velocity, {
    color: new Color(shade, shade, shade * 0.97),
    additive: false,
    life,
    startScale,
    endScale,
    opacity,
    drag: 2,
    rise: 0.45,
  });
}

function launchEffects(
  ctx: WeaponContext,
  dir: Vector3,
  muzzle: Vector3,
  rear: Vector3,
): void {
  const { effects, audio } = ctx;
  for (let i = 0; i < 18; i++) {
    const v = dir
      .clone()
      .multiplyScalar(-(4 + Math.random() * 7))
      .add(randomDir(1.8, 0.1));
    smokePuff(
      ctx,
      rear.clone().add(randomDir(0.15, 0)),
      v,
      2 + Math.random() * 1.8,
      0.3,
      1.8 + Math.random() * 0.9,
      0.6 + Math.random() * 0.2,
    );
  }
  for (let i = 0; i < 9; i++)
    fire(
      ctx,
      new Color().setHSL(0.07 + Math.random() * 0.05, 1, 0.55),
      rear.clone(),
      dir
        .clone()
        .multiplyScalar(-(8 + Math.random() * 7))
        .add(randomDir(2, 0)),
      0.15 + Math.random() * 0.12,
      0.3,
      0.9,
    );
  for (let i = 0; i < 6; i++) {
    fire(
      ctx,
      new Color(1, 0.8, 0.45),
      muzzle.clone(),
      dir
        .clone()
        .multiplyScalar(3 + Math.random() * 4)
        .add(randomDir(1, 0)),
      0.1,
      0.2,
      0.5,
    );
    smokePuff(
      ctx,
      muzzle.clone(),
      dir
        .clone()
        .multiplyScalar(1 + Math.random() * 2)
        .add(randomDir(0.6, 0.2)),
      1.2,
      0.1,
      0.7,
      0.8,
      0.4,
    );
  }
  const floor = ctx.player.position
    .clone()
    .addScaledVector(new Vector3(dir.x, 0, dir.z).normalize(), -0.9);
  effects.dust(floor, 6, 0.6);
  effects.light(muzzle, 300);
  effects.shake += 0.22;

  audio.whoosh();
  audio.tone(null, {
    freq: 95,
    freqEnd: 36,
    gain: 1.1,
    attack: 0.004,
    decay: 0.32,
  });
  audio.noise(null, {
    filter: "lowpass",
    freq: 3200,
    freqEnd: 150,
    gain: 1,
    attack: 0.003,
    decay: 0.6,
  });
  audio.noise(null, {
    filter: "highpass",
    freq: 2500,
    gain: 0.4,
    decay: 0.08,
  });
}

function detonate(ctx: WeaponContext, center: Vector3, normal: Vector3): void {
  const { effects, audio } = ctx;
  ctx.destruction.explode(center, BLAST);
  effects.light(center, 2400);
  const d = ctx.player.position.distanceTo(center);
  effects.shake += 0.6 * Math.max(0, 1 - d / 40);

  const t1 = new Vector3()
    .crossVectors(normal, Math.abs(normal.y) < 0.9 ? UP : new Vector3(1, 0, 0))
    .normalize();
  const t2 = new Vector3().crossVectors(normal, t1);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const v = t1
      .clone()
      .multiplyScalar(Math.cos(a))
      .addScaledVector(t2, Math.sin(a))
      .multiplyScalar(18 + Math.random() * 4)
      .addScaledVector(normal, 1.5);
    fire(ctx, new Color(1, 0.62, 0.3), center.clone(), v, 0.35, 0.5, 1.4);
  }
  effects.sparks(center, normal, 50, 20);
  effects.dust(center, 14, 2.5);

  audio.tone(center, {
    freq: 55,
    freqEnd: 18,
    gain: 1.6,
    attack: 0.01,
    decay: 1.6,
  });
  audio.noise(center, {
    filter: "bandpass",
    freq: 400,
    freqEnd: 80,
    q: 0.7,
    gain: 0.8,
    attack: 0.05,
    decay: 2.5,
    delay: 0.12,
  });
}

function launch(ctx: WeaponContext): void {
  const { origin, dir } = aim(ctx.camera);
  const right = new Vector3().crossVectors(dir, ctx.camera.up).normalize();
  const up = new Vector3().crossVectors(right, dir);
  const muzzle = origin
    .clone()
    .addScaledVector(dir, 0.75)
    .addScaledVector(right, 0.15)
    .addScaledVector(up, -0.12);
  const rear = origin
    .clone()
    .addScaledVector(dir, -0.5)
    .addScaledVector(right, 0.2)
    .addScaledVector(up, -0.1);
  launchEffects(ctx, dir, muzzle, rear);
  ctx.player.velocity.addScaledVector(
    new Vector3(dir.x, 0, dir.z).normalize(),
    -1.5,
  );

  const model = rocketModel();
  model.quaternion.setFromUnitVectors(UP, dir);
  const flame = model.getObjectByName("flame") as Object3D;
  const core = model.getObjectByName("core") as Object3D;
  const lastTail = muzzle.clone();
  const forward = new Vector3();
  ctx.projectiles.spawn({
    model,
    position: muzzle,
    velocity: dir.clone().multiplyScalar(START_SPEED),
    radius: 0.05,
    gravity: GRAVITY,
    fuse: LIFETIME,
    alignToVelocity: true,
    loop: ctx.audio.motor(muzzle),
    onUpdate: (p, dt) => {
      forward.copy(p.velocity).normalize();
      if (p.velocity.length() < MAX_SPEED)
        p.velocity.addScaledVector(forward, ACCELERATION * dt);
      flame.scale.setScalar(0.32 + Math.random() * 0.18);
      core.scale.setScalar(0.13 + Math.random() * 0.06);

      const tail = p.position.clone().addScaledVector(forward, -0.3);
      const gap = tail.distanceTo(lastTail);
      const n = Math.floor(gap / TRAIL_SPACING);
      for (let k = 1; k <= n; k++)
        smokePuff(
          ctx,
          lastTail.clone().lerp(tail, (k * TRAIL_SPACING) / gap),
          randomDir(0.5, 0.3).addScaledVector(forward, -2),
          1 + Math.random() * 0.4,
          0.3,
          1.1 + Math.random() * 0.5,
          0.72 + Math.random() * 0.15,
        );
      if (n > 0) lastTail.lerp(tail, (n * TRAIL_SPACING) / gap);
      fire(
        ctx,
        new Color(1, 0.6 + Math.random() * 0.2, 0.25),
        tail.clone(),
        forward.clone().multiplyScalar(-6).add(randomDir(0.8, 0)),
        0.12,
        0.28,
        0.06,
      );
      ctx.effects.light(p.position, 60);
    },
    onImpact: (_p, hit) => {
      detonate(
        ctx,
        hit.point.clone().addScaledVector(hit.normal, 0.1),
        hit.normal,
      );
      return true;
    },
    onExpire: (p) => detonate(ctx, p.position.clone(), UP),
  });
}

function reloadSound(ctx: WeaponContext): void {
  ctx.audio.noise(null, {
    filter: "bandpass",
    freq: 900,
    q: 2,
    gain: 0.5,
    decay: 0.08,
  });
  ctx.audio.tone(null, {
    type: "triangle",
    freq: 180,
    freqEnd: 90,
    gain: 0.35,
    decay: 0.12,
  });
  ctx.audio.tone(null, {
    type: "square",
    freq: 1200,
    freqEnd: 800,
    gain: 0.07,
    decay: 0.03,
    delay: 0.15,
  });
}

export const rocket: WeaponDef = {
  id: "rocket",
  name: "Lance-roquettes",
  slot: 5,
  infinite: false,
  pickupAmmo: 3,
  maxAmmo: 9,
  pickupModel() {
    const g = launcherModel();
    g.rotation.set(0, Math.PI / 2, Math.PI / 2);
    g.scale.setScalar(0.6);
    g.position.y = 0.078 * 0.6;
    return g;
  },
  create(ctx) {
    const view = launcherModel();
    const tip = view.getObjectByName("tip") as Object3D;
    const base = new Vector3(0.21, -0.2, -0.3);
    const sway = new ViewMotion();
    let loaded = true;
    let reloading = false;
    let reloadT = 0;
    let clunked = false;
    let kick = 0;
    let cameraKick = 0;
    view.addEventListener("removed", () => {
      sway.reset();
      reloading = false;
      kick = 0;
      cameraKick = 0;
    });

    const startReload = () => {
      reloading = true;
      reloadT = 0;
      clunked = false;
    };

    return {
      view,
      update(dt, input, ammo) {
        sway.update(dt, ctx.player, ctx.camera);
        kick *= Math.exp(-8 * dt);

        if (cameraKick > 0) {
          const step = cameraKick * (1 - Math.exp(-25 * dt));
          cameraKick -= step;
          const rot = ctx.camera.rotation;
          rot.x = Math.min(Math.PI / 2 - 0.01, rot.x + step);
        }

        if (input.pressed && !reloading) {
          if (loaded && ammo.take()) {
            launch(ctx);
            loaded = false;
            kick = 1;
            cameraKick = 0.06;
          } else ctx.audio.click();
        }
        if (!reloading && !loaded && ammo.count > 0) startReload();

        let dip = 0;
        let insert = 1;
        if (reloading) {
          reloadT += dt;
          dip =
            smoothstep(0.3, 0.6, reloadT) *
            (1 - smoothstep(1.15, 1.6, reloadT));
          insert = smoothstep(0.65, 1, reloadT);
          if (reloadT >= 0.65) loaded = true;
          if (!clunked && reloadT >= 1) {
            clunked = true;
            reloadSound(ctx);
          }
          if (reloadT >= RELOAD_TIME) reloading = false;
        }
        tip.visible = loaded && ammo.count > 0;
        tip.position.z = -0.55 - (1 - insert) * 0.3;

        view.position.set(
          base.x + sway.x - dip * 0.03,
          base.y + sway.y - dip * 0.14 + kick * 0.02,
          base.z + kick * 0.14,
        );
        view.rotation.set(
          kick * 0.22 + dip * 0.35,
          0.05,
          sway.roll + dip * 0.3,
        );
      },
    };
  },
};
