import {
  ACESFilmicToneMapping,
  type Light,
  MeshLambertMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GameAudio } from "./engine/audio";
import { ChunkRenderer } from "./engine/chunks";
import { Collapse } from "./engine/collapse";
import { Debris } from "./engine/debris";
import { Destruction } from "./engine/destruction";
import { Effects } from "./engine/effects";
import { createPaletteTexture, MATERIALS } from "./engine/materials";
import { MesherPool } from "./engine/mesher-pool";
import { initPhysics, Physics } from "./engine/physics";
import { createVoxelMaterial } from "./engine/voxel-material";
import { World } from "./engine/world";
import { Hud } from "./game/hud";
import { Inventory, VIEW_LAYER } from "./game/inventory";
import { Loot, type LootTarget } from "./game/loot";
import { Player } from "./game/player";
import { Projectiles } from "./game/projectiles";
import { addScenery, SKY_HORIZON } from "./game/scenery";
import { weaponDef } from "./game/weapons";
import { generateMap, type MapInfo } from "./map";

await initPhysics();

const hud = new Hud();
const renderer = new WebGLRenderer({ antialias: true });
const MAX_PIXEL_RATIO = Math.min(window.devicePixelRatio, 1.5);
renderer.setPixelRatio(MAX_PIXEL_RATIO);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.autoClear = false;
renderer.setClearColor(SKY_HORIZON);
renderer.shadowMap.autoUpdate = false;
document.body.appendChild(renderer.domElement);

const scene = new Scene();
const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.03,
  700,
);
camera.rotation.set(0, Math.PI, 0, "YXZ");
scene.add(camera);
addScenery(scene);

const palette = createPaletteTexture();
const world = new World();
const mesher = new MesherPool();
const chunks = new ChunkRenderer(
  scene,
  world,
  createVoxelMaterial(palette, true),
  mesher,
);
const debris = new Debris(scene, world, new MeshLambertMaterial());
const physics = new Physics(
  scene,
  world,
  debris,
  createVoxelMaterial(palette, false),
);
const effects = new Effects(scene);
const audio = new GameAudio();
const destruction = new Destruction(world, physics, debris, effects, audio);
const fallingMaterial = createVoxelMaterial(palette, true);
fallingMaterial.polygonOffset = true;
fallingMaterial.polygonOffsetFactor = 1;
fallingMaterial.polygonOffsetUnits = 1;
const collapse = new Collapse(
  scene,
  world,
  chunks,
  mesher,
  physics,
  debris,
  effects,
  audio,
  fallingMaterial,
);
const player = new Player(world);
const projectiles = new Projectiles(scene, world, physics, audio);
const inventory = new Inventory({
  scene,
  camera,
  world,
  destruction,
  physics,
  projectiles,
  effects,
  audio,
  debris,
  player,
});
const loot = new Loot(scene, world);
scene.traverse((o) => {
  if ((o as Light).isLight) o.layers.enableAll();
});
const controls = new PointerLockControls(camera, renderer.domElement);

destruction.onBlast = (center, radius) => {
  collapse.check(center, radius);
  const toPlayer = player.position
    .clone()
    .add(new Vector3(0, 0.9, 0))
    .sub(center);
  const dist = toPlayer.length();
  effects.shake +=
    Math.max(0, 1 - dist / (radius * 12)) * 0.5 * Math.min(2, radius / 1.6);
  const reach = radius * 2.5;
  if (dist < reach) {
    const push = (reach - dist) * 3;
    player.velocity.addScaledVector(toPlayer.normalize(), push);
    player.velocity.y += push * 0.5;
  }
};

collapse.onShake = (center, amount) => {
  const d = center.distanceTo(player.position);
  effects.shake += amount * Math.max(0, 1 - d / 40);
};

physics.onImpact = (impact) => {
  audio.impact(
    impact.position,
    impact.size,
    impact.speed,
    MATERIALS[impact.material].sound,
  );
  effects.dust(
    impact.position,
    Math.min(16, 2 + Math.floor(impact.size / 600)),
    0.8 + Math.min(2, impact.size / 4000),
  );
  const d = impact.position.distanceTo(player.position);
  effects.shake +=
    Math.min(0.35, impact.size / 40000) * Math.max(0, 1 - d / 25);
};

let map: MapInfo;
let lootTarget: LootTarget | null = null;
let timeScale = 1;
const keys = new Set<string>();
const fire = { pressed: false, held: false };

async function resetMap(): Promise<void> {
  debris.clear();
  physics.clear();
  projectiles.clear();
  destruction.clear();
  inventory.clear();
  map = generateMap(world);
  collapse.reset();
  await chunks.buildAll();
  loot.setSpawns(map.loot);
  player.spawn(map.spawn);
  inventory.give("hammer", 1);
}

addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (!controls.isLocked) return;
  if (e.code.startsWith("Digit")) inventory.selectSlot(Number(e.code.slice(5)));
  if (e.code === "KeyE" && lootTarget && inventory.canTake(lootTarget.weapon)) {
    inventory.give(lootTarget.weapon, weaponDef(lootTarget.weapon).pickupAmmo);
    loot.take(lootTarget);
    lootTarget = null;
    audio.pickup();
  }
  if (e.code === "KeyT") timeScale = timeScale === 1 ? 0.25 : 1;
  if (e.code === "KeyR") void resetMap();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("mousedown", (e) => {
  if (!controls.isLocked || e.button !== 0) return;
  fire.pressed = true;
  fire.held = true;
});
addEventListener("mouseup", (e) => {
  if (e.button === 0) fire.held = false;
});
addEventListener(
  "wheel",
  (e) => {
    if (controls.isLocked && e.deltaY !== 0)
      inventory.cycle(Math.sign(e.deltaY));
  },
  { passive: true },
);
function fitToWindow(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
addEventListener("resize", fitToWindow);
hud.overlay.addEventListener("click", () => {
  audio.unlock();
  renderer.domElement.requestPointerLock().catch(() => {
    hud.overlayTitle.textContent =
      "Souris non capturable ici : ouvrir dans un navigateur";
  });
});
controls.addEventListener("lock", () => {
  hud.overlay.hidden = true;
});
controls.addEventListener("unlock", () => {
  hud.overlayTitle.textContent = "Pause";
  hud.overlay.hidden = false;
  keys.clear();
  fire.held = false;
});

let renderCount = 0;
const recentFrames: number[] = [];

/** Lowers the render resolution while most frames are slow, and raises it back once they are fast again. */
function adaptResolution(real: number): void {
  recentFrames.push(real);
  if (recentFrames.length < 60) return;
  recentFrames.sort((a, b) => a - b);
  const median = recentFrames[30];
  recentFrames.length = 0;
  const ratio = renderer.getPixelRatio();
  const floor = MAX_PIXEL_RATIO * 0.55;
  if (median > 1 / 40 && ratio > floor)
    renderer.setPixelRatio(Math.max(floor, ratio - 0.15));
  else if (median < 1 / 75 && ratio < MAX_PIXEL_RATIO)
    renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, ratio + 0.1));
}

function render(): void {
  renderer.shadowMap.needsUpdate = renderCount++ % 2 === 0;
  renderer.clear();
  camera.layers.set(0);
  renderer.render(scene, camera);
  renderer.clearDepth();
  camera.layers.set(VIEW_LAYER);
  renderer.render(scene, camera);
}

let last = performance.now();
let fps = 60;
const look = new Vector3();

function frame(now: number): void {
  const real = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  fps += (1 / Math.max(real, 1e-3) - fps) * 0.05;
  const dt = real * timeScale;
  adaptResolution(real);

  const axis = (a: string, b: string) =>
    (keys.has(a) ? 1 : 0) - (keys.has(b) ? 1 : 0);
  player.update(
    dt,
    {
      forward: axis("KeyW", "KeyS"),
      right: axis("KeyD", "KeyA"),
      jump: keys.has("Space"),
      sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
    },
    camera,
  );
  physics.setPlayer(player.position);
  camera.position.copy(player.eye);
  if (effects.shake > 0.001) {
    const s = effects.shake * 0.25;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
    camera.position.z += (Math.random() - 0.5) * s;
  }
  camera.updateMatrixWorld();

  inventory.update(dt, fire);
  fire.pressed = false;
  projectiles.update(dt);
  destruction.update();
  collapse.update(dt);
  physics.step(dt);
  const rubble = debris.update(dt);
  if (rubble.impacts > 3)
    audio.rubble(rubble.impactCenter, Math.min(1, rubble.impacts / 40));

  chunks.flush();
  effects.update(dt);
  camera.getWorldDirection(look);
  lootTarget = loot.update(dt, camera.position, look);
  audio.setListener(camera);
  hud.update(
    inventory,
    lootTarget,
    `${Math.round(fps)} FPS · ${debris.count} débris · ${physics.bodies.length} blocs${timeScale < 1 ? " · ralenti" : ""}`,
  );
  render();
  requestAnimationFrame(frame);
}

await resetMap();
fitToWindow();
hud.overlayTitle.textContent = "Cliquer pour jouer";
hud.overlay.classList.add("ready");
requestAnimationFrame(frame);
