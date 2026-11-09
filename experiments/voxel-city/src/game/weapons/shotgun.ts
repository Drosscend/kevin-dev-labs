import {
  AdditiveBlending,
  BoxGeometry,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import type { GameAudio } from "../../engine/audio";
import { SOUND_COLOR } from "../../engine/audio";
import type { Hit } from "../../engine/destruction";
import { MATERIALS } from "../../engine/materials";
import {
  clamp01,
  dustColor,
  easeInOut,
  easeOut,
  flashTexture,
  kickBody,
  ViewMotion,
} from "./shared";
import { aim, type WeaponContext, type WeaponDef } from "./types";

const PELLETS = 11;
const SPREAD = (4 * Math.PI) / 180;
const RANGE = 60;
const COOLDOWN = 0.85;
const PITCH_KICK = 0.05;
const SPEED_OF_SOUND = 343;

const steel = new MeshLambertMaterial({ color: 0x2b2e34 });
const steelLight = new MeshLambertMaterial({ color: 0x454a52 });
const black = new MeshLambertMaterial({ color: 0x111113 });
const wood = new MeshLambertMaterial({ color: 0x7a4a26 });
const woodDark = new MeshLambertMaterial({ color: 0x4a2b14 });
const brass = new MeshLambertMaterial({ color: 0xe0b44c });
const shellRed = new MeshLambertMaterial({ color: 0xc0281f });

const tube = (r: number, len: number, segments = 14) =>
  new CylinderGeometry(r, r, len, segments);
const AXIAL = Math.PI / 2;

type Part = [BufferGeometry, Material, number, number, number, number?];

const FRAME: Part[] = [
  [new BoxGeometry(0.046, 0.075, 0.22), steel, 0, 0.005, 0],
  [new BoxGeometry(0.02, 0.008, 0.2), steelLight, 0, 0.046, 0],
  [new BoxGeometry(0.004, 0.024, 0.065), black, 0.024, 0.016, -0.01],
  [tube(0.0125, 0.52), steelLight, 0, 0.026, -0.37, AXIAL],
  [tube(0.0155, 0.022), steel, 0, 0.026, -0.62, AXIAL],
  [new BoxGeometry(0.006, 0.009, 0.006), brass, 0, 0.043, -0.615],
  [tube(0.011, 0.42), steel, 0, -0.006, -0.32, AXIAL],
  [tube(0.0128, 0.014), steelLight, 0, -0.006, -0.535, AXIAL],
  [new BoxGeometry(0.03, 0.05, 0.012), steel, 0, 0.01, -0.5],
  [new BoxGeometry(0.012, 0.006, 0.075), steel, 0, -0.05, 0.025],
  [new BoxGeometry(0.012, 0.022, 0.006), steel, 0, -0.04, -0.012],
  [new BoxGeometry(0.006, 0.024, 0.006), black, 0, -0.035, 0.022, 0.35],
  [new BoxGeometry(0.038, 0.058, 0.11), wood, 0, -0.012, 0.155, 0.12],
  [new BoxGeometry(0.042, 0.088, 0.2), wood, 0, -0.04, 0.29, 0.1],
  [new BoxGeometry(0.045, 0.094, 0.016), black, 0, -0.05, 0.396, 0.1],
];
const ridge = tube(0.0235, 0.007);
const PUMP: Part[] = [
  [tube(0.022, 0.16), wood, 0, 0, 0, AXIAL],
  ...[-2, -1, 0, 1, 2].map(
    (i): Part => [ridge, woodDark, 0, 0, i * 0.028, AXIAL],
  ),
];
const SHELL: Part[] = [
  [tube(0.0105, 0.04, 10), shellRed, 0, 0, 0],
  [tube(0.0112, 0.013, 10), brass, 0, -0.025, 0],
];

function build(parts: Part[]): Group {
  const g = new Group();
  for (const [geometry, material, x, y, z, rx = 0] of parts) {
    const m = new Mesh(geometry, material);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  }
  return g;
}

/** Barrel toward -Z, origin at the receiver. */
function shotgunModel(): {
  group: Group;
  pump: Group;
  muzzle: Object3D;
  port: Object3D;
} {
  const group = build(FRAME);
  const pump = build(PUMP);
  pump.position.set(0, -0.004, -0.27);
  const muzzle = new Object3D();
  muzzle.position.set(0, 0.026, -0.64);
  const port = new Object3D();
  port.position.set(0.03, 0.016, -0.01);
  group.add(pump, muzzle, port);
  return { group, pump, muzzle, port };
}

function ejectShell(ctx: WeaponContext, port: Object3D): void {
  const q = ctx.camera.quaternion;
  const right = new Vector3(1, 0, 0).applyQuaternion(q);
  const up = new Vector3(0, 1, 0).applyQuaternion(q);
  let clinks = 0;
  ctx.projectiles.spawn({
    model: build(SHELL),
    position: port.getWorldPosition(new Vector3()),
    velocity: right
      .multiplyScalar(1.6 + Math.random() * 0.6)
      .addScaledVector(up, 1.6 + Math.random() * 0.5)
      .add(ctx.player.velocity),
    radius: 0.012,
    restitution: 0.45,
    silent: true,
    fuse: 4,
    spin: new Vector3(
      Math.random() * 20,
      Math.random() * 6,
      Math.random() * 20,
    ),
    onImpact: (p, hit) => {
      if (hit.speed > 0.6 && clinks++ < 3) shellClink(ctx.audio, p.position);
      return false;
    },
  });
}

function gunshot(audio: GameAudio): void {
  audio.noise(null, {
    filter: "lowpass",
    freq: 10000,
    freqEnd: 700,
    gain: 1.5,
    attack: 0.001,
    decay: 0.2,
  });
  audio.noise(null, {
    filter: "bandpass",
    freq: 1100,
    freqEnd: 250,
    q: 0.7,
    gain: 1.1,
    attack: 0.001,
    decay: 0.38,
  });
  audio.tone(null, {
    freq: 150,
    freqEnd: 38,
    gain: 2,
    attack: 0.002,
    decay: 0.35,
  });
  audio.tone(null, {
    freq: 72,
    freqEnd: 28,
    gain: 1.3,
    attack: 0.004,
    decay: 0.55,
    delay: 0.004,
  });
  audio.noise(null, {
    filter: "lowpass",
    freq: 420,
    gain: 0.6,
    attack: 0.02,
    decay: 1.3,
    delay: 0.03,
  });
  audio.noise(null, {
    filter: "lowpass",
    freq: 1600,
    freqEnd: 300,
    gain: 0.28,
    attack: 0.01,
    decay: 0.5,
    delay: 0.19,
  });
}

function clack(audio: GameAudio, pitch: number): void {
  audio.noise(null, {
    filter: "bandpass",
    freq: 2400 * pitch,
    q: 4,
    gain: 0.55,
    attack: 0.001,
    decay: 0.04,
  });
  audio.noise(null, {
    filter: "bandpass",
    freq: 650 * pitch,
    q: 2,
    gain: 0.45,
    attack: 0.002,
    decay: 0.07,
  });
  audio.tone(null, {
    type: "square",
    freq: 950 * pitch,
    freqEnd: 480 * pitch,
    gain: 0.1,
    decay: 0.03,
  });
}

function dryClick(audio: GameAudio): void {
  audio.click();
  audio.noise(null, {
    filter: "bandpass",
    freq: 3200,
    q: 5,
    gain: 0.35,
    decay: 0.025,
  });
}

function shellClink(audio: GameAudio, pos: Vector3): void {
  audio.tone(pos, {
    type: "triangle",
    freq: 2600 + Math.random() * 900,
    gain: 0.12,
    decay: 0.06,
  });
}

function muzzleFlash(ctx: WeaponContext, pos: Vector3, dir: Vector3): void {
  const fx = ctx.effects;
  fx.light(pos.clone().addScaledVector(dir, 0.3), 140);
  for (let i = 0; i < 7; i++) {
    const along = 0.05 + i * 0.07;
    fx.puff(
      pos.clone().addScaledVector(dir, along),
      dir.clone().multiplyScalar(2 + Math.random() * 6),
      {
        color: new Color().setHSL(0.08 + Math.random() * 0.05, 1, 0.6),
        additive: true,
        life: 0.05 + Math.random() * 0.04,
        startScale: 0.32 - i * 0.035,
        endScale: 0.55 - i * 0.05,
        opacity: 1,
        drag: 6,
        rise: 0,
      },
    );
  }
  for (let i = 0; i < 6; i++)
    fx.smoke(
      pos.clone().addScaledVector(dir, 0.1 + Math.random() * 0.3),
      dir
        .clone()
        .multiplyScalar(1 + Math.random() * 2.5)
        .add(
          new Vector3(
            Math.random() - 0.5,
            Math.random() * 0.4,
            Math.random() - 0.5,
          ).multiplyScalar(0.6),
        ),
      0.16 + Math.random() * 0.1,
      1.2 + Math.random() * 0.8,
      0.78,
    );
}

function pelletImpact(ctx: WeaponContext, hit: Hit, d: Vector3): void {
  const fx = ctx.effects;
  const kind = MATERIALS[hit.material].sound;
  if (hit.body) kickBody(hit.body, hit.point, d, 2, 25);
  const push = hit.normal.clone().multiplyScalar(3).addScaledVector(d, 5);
  ctx.destruction.carve(
    hit.point.clone().addScaledVector(d, 0.04),
    0.07 + Math.random() * 0.03,
    push,
    0.7,
  );
  const surface = hit.point.clone().addScaledVector(hit.normal, 0.03);
  fx.puff(surface, new Vector3(), {
    color: new Color(1, 0.85, 0.6),
    additive: true,
    life: 0.07,
    startScale: 0.2,
    endScale: 0.05,
    opacity: 1,
    drag: 0,
    rise: 0,
  });
  const color = dustColor(hit.material);
  for (let i = 0; i < 2; i++)
    fx.puff(
      surface,
      hit.normal
        .clone()
        .multiplyScalar(1 + Math.random() * 1.2)
        .add(
          new Vector3(
            Math.random() - 0.5,
            Math.random() - 0.3,
            Math.random() - 0.5,
          ).multiplyScalar(0.8),
        ),
      {
        color,
        additive: false,
        life: 0.8 + Math.random() * 0.7,
        startScale: 0.1,
        endScale: 0.5 + Math.random() * 0.35,
        opacity: 0.5,
        drag: 3,
        rise: 0.2,
      },
    );
  if (kind === "metal") fx.sparks(surface, hit.normal, 7, 5);
  else if (kind === "stone" && Math.random() < 0.5)
    fx.sparks(surface, hit.normal, 2, 4);
}

function tracer(ctx: WeaponContext, from: Vector3, to: Vector3): void {
  const dir = to.clone().sub(from);
  const dist = dir.length();
  if (dist < 1) return;
  const speed = 110;
  ctx.effects.puff(from, dir.normalize().multiplyScalar(speed), {
    color: new Color(1, 0.9, 0.65),
    additive: true,
    life: Math.min(0.1, dist / speed),
    startScale: 0.045,
    endScale: 0.025,
    opacity: 0.9,
    drag: 0,
    rise: 0,
  });
}

function fire(ctx: WeaponContext, muzzle: Vector3): void {
  const { origin, dir } = aim(ctx.camera);
  const helper =
    Math.abs(dir.y) > 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(dir, helper).normalize();
  const up = new Vector3().crossVectors(right, dir);
  let glass: Vector3 | null = null;
  const rubble = new Vector3();
  let hits = 0;
  let ticks = 0;
  for (let i = 0; i < PELLETS; i++) {
    const a = Math.tan(SPREAD * Math.sqrt(Math.random()));
    const phi = Math.random() * Math.PI * 2;
    const d = dir
      .clone()
      .addScaledVector(right, a * Math.cos(phi))
      .addScaledVector(up, a * Math.sin(phi))
      .normalize();
    const hit = ctx.destruction.raycast(origin, d, RANGE);
    const end = hit ? hit.point : origin.clone().addScaledVector(d, RANGE);
    if (i % 2 === 0) tracer(ctx, muzzle, end);
    if (!hit) continue;
    pelletImpact(ctx, hit, d);
    hits++;
    rubble.add(hit.point);
    const kind = MATERIALS[hit.material].sound;
    if (kind === "glass") glass = hit.point;
    if (ticks < 5) {
      ticks++;
      const color = SOUND_COLOR[kind];
      ctx.audio.noise(hit.point, {
        filter: "bandpass",
        freq: color.freq * (0.9 + Math.random() * 0.3),
        q: color.q,
        gain: 0.4,
        decay: kind === "metal" ? 0.18 : 0.06,
        delay: hit.distance / SPEED_OF_SOUND + Math.random() * 0.02,
      });
    }
  }
  if (glass) ctx.audio.glass(glass, 0.8);
  if (hits > 0) ctx.audio.rubble(rubble.divideScalar(hits), 0.5, 0.3);
  muzzleFlash(ctx, muzzle, dir);
  gunshot(ctx.audio);
  ctx.effects.shake += 0.12;
  ctx.player.velocity.addScaledVector(dir, -1.2);
}

export const shotgun: WeaponDef = {
  id: "shotgun",
  name: "Fusil à pompe",
  slot: 2,
  infinite: false,
  pickupAmmo: 8,
  maxAmmo: 24,
  pickupModel() {
    const { group } = shotgunModel();
    group.rotation.z = Math.PI / 2;
    group.scale.setScalar(0.6);
    group.position.set(0, 0.014, 0.074);
    return group;
  },
  create(ctx) {
    const { group: view, pump, muzzle, port } = shotgunModel();
    const flash = new Sprite(
      new SpriteMaterial({
        map: flashTexture(),
        color: 0xffd08a,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    flash.position.copy(muzzle.position);
    flash.position.z -= 0.06;
    flash.visible = false;
    view.add(flash);
    const muzzleWorld = new Vector3();
    const motion = new ViewMotion();

    let cooldown = 0;
    let since = Number.POSITIVE_INFINITY;
    let queued = 0;
    let kick = 0;
    let flashTime = 0;
    let smokeTime = 0;
    let smokeTick = 0;
    let pendingPitch = 0;
    let pendingYaw = 0;
    let recover = 0;
    let clackBack = true;
    let clackFront = true;
    let ejected = true;

    view.addEventListener("removed", () => {
      since = Number.POSITIVE_INFINITY;
      queued = 0;
      kick = 0;
      flashTime = 0;
      flash.visible = false;
      smokeTime = 0;
      pendingPitch = 0;
      pendingYaw = 0;
      recover = 0;
      clackBack = true;
      clackFront = true;
      ejected = true;
      motion.reset();
    });

    return {
      view,
      update(dt, input, ammo) {
        motion.update(dt, ctx.player, ctx.camera);
        cooldown -= dt;
        since += dt;
        queued = input.pressed ? 0.2 : queued - dt;

        if (queued > 0 && cooldown <= 0) {
          queued = 0;
          if (!ammo.take()) {
            dryClick(ctx.audio);
            cooldown = 0.3;
            kick = Math.max(kick, 0.12);
          } else {
            muzzle.getWorldPosition(muzzleWorld);
            fire(ctx, muzzleWorld);
            cooldown = COOLDOWN;
            since = 0;
            kick = 1;
            flashTime = 0.05;
            smokeTime = 1.3;
            pendingPitch += PITCH_KICK;
            pendingYaw += (Math.random() - 0.5) * 0.02;
            recover += PITCH_KICK * 0.6;
            clackBack = false;
            clackFront = false;
            ejected = false;
            flash.material.rotation = Math.random() * Math.PI * 2;
            flash.scale.setScalar(0.28 + Math.random() * 0.12);
          }
        }

        const rise = 1 - Math.exp(-dt * 35);
        const stepPitch = pendingPitch * rise;
        const stepYaw = pendingYaw * rise;
        pendingPitch -= stepPitch;
        pendingYaw -= stepYaw;
        let pitchChange = stepPitch;
        if (since > 0.12 && recover > 0) {
          const back = recover * (1 - Math.exp(-dt * 6));
          recover -= back;
          pitchChange -= back;
        }
        const cam = ctx.camera.rotation;
        cam.x = Math.max(-1.52, Math.min(1.52, cam.x + pitchChange));
        cam.y += stepYaw;

        if (since > 0.28 && !clackBack) {
          clackBack = true;
          clack(ctx.audio, 1);
        }
        if (since > 0.38 && !ejected) {
          ejected = true;
          ejectShell(ctx, port);
        }
        if (since > 0.56 && !clackFront) {
          clackFront = true;
          clack(ctx.audio, 1.25);
        }

        const back = easeOut(clamp01((since - 0.28) / 0.12));
        const front = easeOut(clamp01((since - 0.48) / 0.1));
        pump.position.z = -0.27 + 0.075 * (back - front);
        const tilt = Math.sin(
          Math.PI * easeInOut(clamp01((since - 0.2) / 0.5)),
        );

        kick *= Math.exp(-dt * 9);
        flashTime -= dt;
        flash.visible = flashTime > 0;

        if (smokeTime > 0) {
          smokeTime -= dt;
          smokeTick -= dt;
          if (smokeTick <= 0) {
            smokeTick = 0.06;
            muzzle.getWorldPosition(muzzleWorld);
            ctx.effects.puff(
              muzzleWorld,
              new Vector3(
                (Math.random() - 0.5) * 0.08,
                0.2 + Math.random() * 0.15,
                (Math.random() - 0.5) * 0.08,
              ),
              {
                color: new Color(0.85, 0.85, 0.85),
                additive: false,
                life: 0.9 + Math.random() * 0.5,
                startScale: 0.03,
                endScale: 0.16,
                opacity: 0.25 * (smokeTime / 1.3),
                drag: 1,
                rise: 0.3,
              },
            );
          }
        }

        view.position.set(
          0.17 + motion.x - tilt * 0.012,
          -0.19 + motion.y - tilt * 0.018 + kick * 0.02,
          -0.33 + kick * 0.1,
        );
        view.rotation.set(
          motion.pitch + kick * 0.28 + tilt * 0.06,
          0.035 + motion.yaw,
          motion.roll + tilt * 0.2,
        );
      },
    };
  },
};
