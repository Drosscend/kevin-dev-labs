import {
  AdditiveBlending,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { aim, type WeaponDef } from "./types";

const FUSE = 2.4;
const RADIUS = 0.035;
const BLAST = 1.6;

const stickGeometry = new CylinderGeometry(RADIUS, RADIUS, 0.24, 10);
const bandGeometry = new CylinderGeometry(
  RADIUS * 1.05,
  RADIUS * 1.05,
  0.04,
  10,
);
const fuseGeometry = new CylinderGeometry(0.005, 0.005, 0.06, 4);
const red = new MeshLambertMaterial({ color: 0xc62828 });
const paper = new MeshLambertMaterial({ color: 0xe8dcc0 });
const cord = new MeshLambertMaterial({ color: 0x222222 });

function stick(spark: boolean): Group {
  const g = new Group();
  const body = new Mesh(stickGeometry, red);
  body.castShadow = true;
  g.add(body, new Mesh(bandGeometry, paper));
  const fuse = new Mesh(fuseGeometry, cord);
  fuse.position.y = 0.15;
  g.add(fuse);
  if (spark) {
    const s = new Sprite(
      new SpriteMaterial({
        color: 0xffd166,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    s.name = "spark";
    s.position.y = 0.18;
    s.scale.setScalar(0.08);
    g.add(s);
  }
  return g;
}

export const dynamite: WeaponDef = {
  id: "dynamite",
  name: "Dynamite",
  slot: 3,
  infinite: false,
  pickupAmmo: 5,
  maxAmmo: 15,
  pickupModel() {
    const g = new Group();
    for (let i = -1; i <= 1; i++) {
      const s = stick(false);
      s.rotation.z = Math.PI / 2;
      s.position.set(0, RADIUS, i * 0.075);
      g.add(s);
    }
    return g;
  },
  create(ctx) {
    const view = stick(false);
    view.position.set(0.22, -0.2, -0.4);
    view.rotation.set(0.5, 0, -0.35);
    let cooldown = 0;
    let anim = 0;
    return {
      view,
      update(dt, input, ammo) {
        cooldown -= dt;
        anim = Math.max(0, anim - dt * 4);
        view.visible = ammo.count > 0 && anim < 0.5;
        view.position.z = -0.4 - anim * 0.2;
        if (!input.pressed || cooldown > 0 || !ammo.take()) return;
        cooldown = 0.45;
        anim = 1;
        const { origin, dir } = aim(ctx.camera);
        const right = new Vector3()
          .crossVectors(dir, ctx.camera.up)
          .normalize();
        const start = origin
          .clone()
          .addScaledVector(dir, 0.35)
          .addScaledVector(right, 0.12);
        const velocity = dir
          .clone()
          .multiplyScalar(13)
          .addScaledVector(ctx.player.velocity, 0.5);
        velocity.y += 2;
        const model = stick(true);
        ctx.audio.whoosh();
        ctx.projectiles.spawn({
          model,
          position: start,
          velocity,
          radius: RADIUS,
          restitution: 0.3,
          fuse: FUSE,
          spin: new Vector3(
            Math.random() * 10,
            Math.random() * 4,
            Math.random() * 10,
          ),
          loop: ctx.audio.fuse(start),
          onUpdate: () => {
            const spark = model.getObjectByName("spark");
            if (spark) spark.scale.setScalar(0.05 + Math.random() * 0.07);
          },
          onExpire: (p) => ctx.destruction.explode(p.position, BLAST),
        });
      },
    };
  },
};
