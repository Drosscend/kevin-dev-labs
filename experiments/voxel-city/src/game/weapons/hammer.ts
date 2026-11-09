import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Vector3,
} from "three";
import type { GameAudio } from "../../engine/audio";
import { SOUND_COLOR } from "../../engine/audio";
import { MATERIALS, type SoundKind } from "../../engine/materials";
import {
  clamp01,
  dustColor,
  easeIn,
  easeInOut,
  easeOut,
  kickBody,
  ViewMotion,
} from "./shared";
import { aim, type WeaponContext, type WeaponDef } from "./types";

const REACH = 2.3;
const SWING = 0.7;
const WIND_END = 0.15;
const IMPACT = 0.25;
const HIT_STOP = 0.075;

const handleGeometry = new CylinderGeometry(0.016, 0.02, 0.56, 10);
const gripGeometry = new CylinderGeometry(0.023, 0.023, 0.15, 10);
const knobGeometry = new CylinderGeometry(0.027, 0.024, 0.025, 10);
const headGeometry = new BoxGeometry(0.088, 0.088, 0.19);
const faceGeometry = new BoxGeometry(0.098, 0.098, 0.022);
const collarGeometry = new BoxGeometry(0.046, 0.05, 0.046);
const stripeGeometry = new CylinderGeometry(0.0235, 0.0235, 0.012, 10);
const wood = new MeshLambertMaterial({ color: 0xb57c43 });
const rubber = new MeshLambertMaterial({ color: 0x1c1c1f });
const stripe = new MeshLambertMaterial({ color: 0xf2b12b });
const iron = new MeshLambertMaterial({ color: 0x2c3036 });
const polished = new MeshLambertMaterial({ color: 0xc3c9d0 });
const paint = new MeshLambertMaterial({ color: 0xb8322a });

/** Handle along +Y, origin at the hand, striking face toward -Z. */
function hammerModel(): Group {
  const g = new Group();
  const handle = new Mesh(handleGeometry, wood);
  handle.position.y = 0.18;
  const grip = new Mesh(gripGeometry, rubber);
  grip.position.y = -0.025;
  const band = new Mesh(stripeGeometry, stripe);
  band.position.y = 0.045;
  const knob = new Mesh(knobGeometry, rubber);
  knob.position.y = -0.11;
  const collar = new Mesh(collarGeometry, paint);
  collar.position.y = 0.415;
  const head = new Mesh(headGeometry, iron);
  head.position.y = 0.48;
  g.add(handle, grip, band, knob, collar, head);
  for (const side of [-1, 1]) {
    const face = new Mesh(faceGeometry, polished);
    face.position.set(0, 0.48, side * 0.104);
    g.add(face);
  }
  return g;
}

type Pose = readonly [number, number, number, number, number, number];

const REST: Pose = [0.32, -0.47, -0.58, 0.15, 0.5, 0.18];
const WINDUP: Pose = [0.34, -0.25, -0.4, 1, 0.3, -0.1];
const HIT: Pose = [0.08, -0.3, -0.62, -0.85, 0.05, 0.05];
const FOLLOW: Pose = [0.04, -0.38, -0.6, -1.35, -0.05, -0.05];

function mix(a: Pose, b: Pose, t: number): Pose {
  return a.map((v, i) => v + (b[i] - v) * t) as unknown as Pose;
}

function pose(t: number, missed: boolean): Pose {
  if (t < 0) return REST;
  if (t < WIND_END) return mix(REST, WINDUP, easeOut(t / WIND_END));
  if (t < IMPACT)
    return mix(WINDUP, HIT, easeIn((t - WIND_END) / (IMPACT - WIND_END)));
  const end = missed
    ? mix(HIT, FOLLOW, easeOut(clamp01((t - IMPACT) / 0.08)))
    : HIT;
  const back = clamp01((t - IMPACT - 0.07) / (SWING - IMPACT - 0.07));
  return mix(end, REST, easeInOut(back));
}

function swingSound(audio: GameAudio): void {
  audio.noise(null, {
    filter: "bandpass",
    freq: 180,
    freqEnd: 900,
    q: 1.5,
    gain: 0.45,
    attack: 0.04,
    decay: 0.12,
  });
}

function thud(
  audio: GameAudio,
  pos: Vector3,
  kind: SoundKind,
  removed: number,
): void {
  const color = SOUND_COLOR[kind];
  const dull = kind === "soft" || kind === "dirt";
  audio.tone(pos, {
    freq: dull ? 80 : 105,
    freqEnd: 34,
    gain: 1.6,
    attack: 0.003,
    decay: 0.32,
  });
  audio.noise(pos, {
    filter: "lowpass",
    freq: dull ? 1400 : 4200,
    freqEnd: 140,
    gain: 1.2,
    attack: 0.001,
    decay: 0.22,
  });
  audio.noise(pos, {
    filter: "bandpass",
    freq: color.freq,
    freqEnd: color.freq * 0.5,
    q: color.q,
    gain: kind === "metal" ? 0.6 : 1,
    decay: kind === "metal" ? 0.5 : 0.14,
  });
  if (kind === "metal")
    for (const [freq, gain, decay] of [
      [1240, 0.22, 0.9],
      [1870, 0.14, 0.6],
      [2950, 0.08, 0.35],
    ])
      audio.tone(pos, { type: "triangle", freq, gain, decay });
  if (kind === "wood") {
    audio.tone(pos, {
      type: "triangle",
      freq: 230,
      freqEnd: 140,
      gain: 0.5,
      decay: 0.12,
    });
    audio.noise(pos, {
      filter: "bandpass",
      freq: 1300,
      q: 2,
      gain: 0.6,
      decay: 0.05,
      delay: 0.01,
    });
  }
  if (kind === "stone")
    audio.noise(pos, {
      filter: "highpass",
      freq: 2600,
      gain: 0.55,
      decay: 0.05,
    });
  if (kind === "glass") audio.glass(pos, 1);
  else if (removed > 0) audio.rubble(pos, Math.min(1, removed / 80), 0.4);
}

function strike(ctx: WeaponContext): boolean {
  const { origin, dir } = aim(ctx.camera);
  const hit = ctx.destruction.raycast(origin, dir, REACH);
  if (!hit) {
    ctx.audio.whoosh();
    return false;
  }
  const mat = MATERIALS[hit.material];
  const kind = mat.sound;
  if (hit.body) kickBody(hit.body, hit.point, dir, 7, 180);

  const hardness = Number.isFinite(mat.hardness) ? mat.hardness : 2;
  const radius = 0.22 + 0.06 * clamp01((hardness - 0.35) / 1.45);
  const center = hit.point.clone().addScaledVector(dir, radius * 0.35);
  const push = dir
    .clone()
    .multiplyScalar(6)
    .addScaledVector(hit.normal, 2)
    .add(new Vector3(0, 1.5, 0));
  const { removed } = ctx.destruction.carve(center, radius, push, 0.9);
  ctx.physics.impulse(
    hit.point.clone().addScaledVector(dir, -0.3),
    1.1,
    removed > 0 ? 3.5 : 2,
  );

  const fx = ctx.effects;
  const surface = hit.point.clone().addScaledVector(hit.normal, 0.05);
  fx.dust(
    surface,
    Math.min(14, 5 + Math.floor(removed / 12)),
    0.12,
    dustColor(hit.material),
  );
  if (kind === "metal" || removed === 0) {
    fx.sparks(surface, hit.normal, 26, 7);
    fx.light(surface, 25);
  } else if (kind === "stone") fx.sparks(surface, hit.normal, 8, 5);
  fx.shake += 0.22 + Math.min(0.25, removed / 400);
  ctx.player.velocity.addScaledVector(dir, removed === 0 ? -2.5 : -0.8);
  thud(ctx.audio, hit.point, kind, removed);
  return true;
}

export const hammer: WeaponDef = {
  id: "hammer",
  name: "Masse",
  slot: 1,
  infinite: true,
  pickupAmmo: 0,
  maxAmmo: 0,
  pickupModel() {
    const model = hammerModel();
    model.rotation.z = Math.PI / 2;
    model.scale.setScalar(0.9);
    model.position.set(0.187, 0.045, 0);
    return model;
  },
  create(ctx) {
    const view = hammerModel();
    const motion = new ViewMotion();
    let t = -1;
    let stop = 0;
    let jolt = 0;
    let struck = false;
    let whooshed = false;
    let missed = false;
    view.addEventListener("removed", () => {
      t = -1;
      stop = 0;
      jolt = 0;
      motion.reset();
    });
    return {
      view,
      update(dt, input) {
        motion.update(dt, ctx.player, ctx.camera);
        if (stop > 0) stop -= dt;
        else if (t >= 0) t += dt;
        if (t >= SWING) t = -1;
        if (t < 0 && (input.pressed || input.held)) {
          t = 0;
          struck = false;
          whooshed = false;
          missed = false;
        }
        if (t >= WIND_END && !whooshed) {
          whooshed = true;
          swingSound(ctx.audio);
        }
        if (t >= IMPACT && !struck) {
          struck = true;
          missed = !strike(ctx);
          if (!missed) {
            t = IMPACT;
            stop = HIT_STOP;
            jolt = 1;
          }
        }
        jolt *= Math.exp(-dt * 9);

        const p = pose(t, missed);
        const buzz = stop > 0 ? 0.006 : 0;
        view.position.set(
          p[0] + motion.x + (Math.random() - 0.5) * buzz,
          p[1] + motion.y + (Math.random() - 0.5) * buzz + jolt * 0.02,
          p[2] + jolt * 0.06,
        );
        view.rotation.set(
          p[3] + motion.pitch + jolt * 0.2,
          p[4] + motion.yaw,
          p[5] + motion.roll,
        );
      },
    };
  },
};
