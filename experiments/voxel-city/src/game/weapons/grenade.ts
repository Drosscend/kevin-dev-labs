import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { VOXEL } from "../../engine/constants";
import { randomDir } from "../../engine/effects";
import { smoothstep, ViewMotion } from "./shared";
import { aim, type WeaponContext, type WeaponDef } from "./types";

const FUSE = 2.8;
const BLAST = 2.0;
const RADIUS = 0.035;
const THROW_SPEED = 15;
const PULL_TIME = 0.22;
const RECOVER_TIME = 0.6;
const MIN_FUSE_LEFT = 0.4;
const SHRAPNEL = 26;
const SHRAPNEL_RANGE = 9;
const SHRAPNEL_SPEED = 45;
const SHRAPNEL_HOLE = 0.06;

const olive = new MeshLambertMaterial({ color: 0x5a6b2f, flatShading: true });
const groove = new MeshLambertMaterial({ color: 0x2c3516 });
const metal = new MeshLambertMaterial({ color: 0xb4b4aa });
const darkMetal = new MeshLambertMaterial({ color: 0x55574f });
const wood = new MeshLambertMaterial({ color: 0x8a6538 });
const woodDark = new MeshLambertMaterial({ color: 0x5e4122 });
const straw = new MeshLambertMaterial({ color: 0xb89a5a });
const stencil = new MeshLambertMaterial({ color: 0xe0b020 });

const bodyGeometry = new SphereGeometry(0.032, 10, 8);
const grooveGeometry = new TorusGeometry(0.032, 0.0022, 4, 24);
const fuzeGeometry = new CylinderGeometry(0.011, 0.012, 0.022, 10);
const capGeometry = new CylinderGeometry(0.013, 0.013, 0.006, 10);
const spoonGeometry = new BoxGeometry(0.006, 0.066, 0.014);
const spoonLipGeometry = new BoxGeometry(0.02, 0.005, 0.014);
const ringGeometry = new TorusGeometry(0.011, 0.0018, 6, 16);
const pinGeometry = new CylinderGeometry(0.0015, 0.0015, 0.03, 4);

function spoon(): Group {
  const g = new Group();
  const lever = new Mesh(spoonGeometry, metal);
  lever.position.set(0.031, 0.022, 0);
  lever.rotation.z = 0.27;
  const lip = new Mesh(spoonLipGeometry, metal);
  lip.position.set(0.02, 0.056, 0);
  g.add(lever, lip);
  return g;
}

/** Frag grenade centered on its body; the pin group is named "pin". */
function grenadeModel(withPin: boolean, withSpoon: boolean): Group {
  const g = new Group();
  const shell = new Group();
  shell.scale.y = 1.15;
  const body = new Mesh(bodyGeometry, olive);
  body.castShadow = true;
  shell.add(body);
  for (const h of [-0.016, 0, 0.016]) {
    const ring = new Mesh(grooveGeometry, groove);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h;
    ring.scale.setScalar(Math.sqrt(1 - (h / 0.032) ** 2));
    shell.add(ring);
  }
  for (const a of [0, Math.PI / 2]) {
    const ring = new Mesh(grooveGeometry, groove);
    ring.rotation.y = a;
    shell.add(ring);
  }
  g.add(shell);
  const fuze = new Mesh(fuzeGeometry, darkMetal);
  fuze.position.y = 0.045;
  const cap = new Mesh(capGeometry, darkMetal);
  cap.position.y = 0.057;
  g.add(fuze, cap);
  if (withSpoon) g.add(spoon());
  if (withPin) {
    const pin = new Group();
    pin.name = "pin";
    const rod = new Mesh(pinGeometry, metal);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(-0.006, 0.047, 0);
    const ring = new Mesh(ringGeometry, metal);
    ring.position.set(-0.03, 0.047, 0);
    ring.rotation.set(0.3, Math.PI / 2, 0);
    pin.add(rod, ring);
    g.add(pin);
  }
  return g;
}

/** Short raycasts from the blast that pepper surrounding surfaces with small holes. */
function shrapnel(ctx: WeaponContext, center: Vector3): void {
  const pings: Vector3[] = [];
  for (let i = 0; i < SHRAPNEL; i++) {
    const dir = randomDir(1, 0.1);
    const hit = ctx.destruction.raycast(center, dir, SHRAPNEL_RANGE);
    const dist = hit ? hit.distance : SHRAPNEL_RANGE;
    ctx.effects.puff(
      center.clone(),
      dir.clone().multiplyScalar(SHRAPNEL_SPEED),
      {
        color: new Color(1, 0.85, 0.5),
        additive: true,
        life: Math.max(0.02, Math.min(0.2, dist / SHRAPNEL_SPEED)),
        startScale: 0.08,
        endScale: 0.03,
        opacity: 1,
        drag: 0,
        rise: 0,
      },
    );
    if (!hit) continue;
    const at = hit.point.clone().addScaledVector(dir, VOXEL * 0.5);
    ctx.destruction.carve(
      at,
      SHRAPNEL_HOLE,
      dir.clone().multiplyScalar(5),
      0.5,
    );
    ctx.effects.sparks(hit.point, hit.normal, 5, 5);
    if (pings.length < 5 && Math.random() < 0.4) pings.push(hit.point.clone());
  }
  for (const p of pings)
    ctx.audio.tone(p, {
      type: "triangle",
      freq: 2200 + Math.random() * 1800,
      freqEnd: 700,
      gain: 0.12,
      decay: 0.18,
      delay: 0.03 + Math.random() * 0.2,
    });
}

export const grenade: WeaponDef = {
  id: "grenade",
  name: "Grenades",
  slot: 4,
  infinite: false,
  pickupAmmo: 4,
  maxAmmo: 12,
  pickupModel() {
    const g = new Group();
    const W = 0.4;
    const H = 0.12;
    const D = 0.26;
    const T = 0.015;
    const floor = new Mesh(new BoxGeometry(W, T, D), woodDark);
    floor.position.y = T / 2;
    g.add(floor);
    for (const side of [-1, 1]) {
      const long = new Mesh(new BoxGeometry(W, H, T), wood);
      long.position.set(0, H / 2, side * (D / 2 - T / 2));
      const short = new Mesh(new BoxGeometry(T, H, D - T * 2), wood);
      short.position.set(side * (W / 2 - T / 2), H / 2, 0);
      g.add(long, short);
    }
    const band = new Mesh(new BoxGeometry(W * 0.5, 0.025, 0.002), stencil);
    band.position.set(0, H * 0.55, D / 2 + 0.001);
    g.add(band);
    const fill = new Mesh(new BoxGeometry(W - T * 2, 0.05, D - T * 2), straw);
    fill.position.y = 0.04;
    g.add(fill);
    for (let i = 0; i < 3; i++) {
      const n = grenadeModel(true, true);
      n.rotation.set(0, 0.3 * (i - 1), Math.PI / 2);
      n.position.set(-0.11 + i * 0.11, 0.1, (i - 1) * 0.03);
      g.add(n);
    }
    return g;
  },
  create(ctx) {
    const view = new Group();
    const model = grenadeModel(true, true);
    model.rotation.set(0.15, 0.7, -0.2);
    view.add(model);
    const pin = model.getObjectByName("pin") as Object3D;
    const base = new Vector3(0.24, -0.22, -0.42);
    const sway = new ViewMotion();
    let state: "ready" | "pulling" | "cooking" | "recover" = "ready";
    let timer = 0;
    let cook = 0;
    let nextTick = 0;
    view.addEventListener("removed", () => {
      sway.reset();
      state = "ready";
    });

    const setPin = (visible: boolean, out: number) => {
      pin.visible = visible;
      pin.position.set(-out * 0.12, out * 0.05, out * 0.02);
    };

    const throwGrenade = () => {
      const { origin, dir } = aim(ctx.camera);
      const right = new Vector3().crossVectors(dir, ctx.camera.up).normalize();
      const start = origin
        .clone()
        .addScaledVector(dir, 0.35)
        .addScaledVector(right, 0.12);
      const velocity = dir
        .clone()
        .multiplyScalar(THROW_SPEED)
        .addScaledVector(ctx.player.velocity, 0.6);
      velocity.y += 2.5;
      ctx.audio.whoosh();
      ctx.audio.tone(start, {
        type: "triangle",
        freq: 3400,
        freqEnd: 3000,
        gain: 0.07,
        decay: 0.3,
      });

      const lever = spoon();
      ctx.projectiles.spawn({
        model: lever,
        position: start.clone().addScaledVector(right, 0.05),
        velocity: velocity
          .clone()
          .multiplyScalar(0.35)
          .addScaledVector(right, 2.5)
          .add(new Vector3(0, 3, 0)),
        radius: 0.01,
        restitution: 0.5,
        fuse: 3,
        spin: new Vector3(18, 6, 12),
      });

      let wisp = 0;
      ctx.projectiles.spawn({
        model: grenadeModel(false, false),
        position: start,
        velocity,
        radius: RADIUS,
        restitution: 0.45,
        friction: 2,
        fuse: Math.max(MIN_FUSE_LEFT, FUSE - cook),
        spin: new Vector3(
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 16,
        ),
        onUpdate: (p, dt) => {
          wisp -= dt;
          if (wisp > 0) return;
          wisp = 0.08;
          ctx.effects.smoke(
            p.position.clone().add(new Vector3(0, 0.05, 0)),
            new Vector3(0, 0.3, 0),
            0.07,
            0.7,
            0.85,
          );
        },
        onExpire: (p) => {
          ctx.destruction.explode(p.position, BLAST);
          shrapnel(ctx, p.position.clone().add(new Vector3(0, 0.05, 0)));
        },
      });
    };

    return {
      view,
      update(dt, input, ammo) {
        sway.update(dt, ctx.player, ctx.camera);
        timer += dt;
        const pos = base.clone();
        let pitch = 0;
        let roll = 0;
        let visible = true;

        if (state === "ready") {
          setPin(true, 0);
          visible = ammo.count > 0;
          if (input.pressed && ammo.count > 0) {
            state = "pulling";
            timer = 0;
            cook = 0;
            nextTick = 0.5;
            ctx.audio.click();
            ctx.audio.tone(null, {
              type: "triangle",
              freq: 2600,
              freqEnd: 2300,
              gain: 0.1,
              decay: 0.15,
              delay: 0.08,
            });
          }
        }

        if (state === "pulling" || state === "cooking") {
          cook += dt;
          const pull = Math.min(1, timer / PULL_TIME);
          setPin(pull < 1, pull);
          const windup = smoothstep(0, 0.25, cook);
          pos.x += windup * 0.03;
          pos.y += windup * 0.05;
          pos.z += windup * 0.07;
          pitch = windup * 0.3;
          roll = -windup * 0.2;
          if (cook > 0.5) {
            pos.x += (Math.random() - 0.5) * 0.002;
            pos.y += (Math.random() - 0.5) * 0.002;
          }
          if (cook >= nextTick) {
            nextTick += 0.5;
            ctx.audio.tone(null, {
              type: "square",
              freq: 1900,
              gain: 0.04,
              decay: 0.02,
            });
          }
          if (state === "pulling" && timer >= PULL_TIME) state = "cooking";
          if (
            state === "cooking" &&
            (!input.held || cook >= FUSE - MIN_FUSE_LEFT)
          ) {
            if (ammo.take()) throwGrenade();
            state = "recover";
            timer = 0;
          }
        }

        if (state === "recover") {
          const out = Math.min(1, timer / 0.12);
          pos.y += 0.05 + out * 0.04;
          pos.z -= out * 0.2;
          pitch = 0.3 - out * 0.6;
          visible = timer < 0.12;
          if (timer > 0.25 && ammo.count > 0) {
            setPin(true, 0);
            visible = true;
            const rise = 1 - smoothstep(0.25, RECOVER_TIME, timer);
            pos.copy(base);
            pos.y -= rise * 0.25;
            pitch = -rise * 0.5;
          }
          if (timer >= RECOVER_TIME) state = "ready";
        }

        view.visible = visible;
        view.position.set(pos.x + sway.x, pos.y + sway.y, pos.z);
        view.rotation.set(pitch, 0, roll + sway.roll);
      },
    };
  },
};
