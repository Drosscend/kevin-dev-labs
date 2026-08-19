import {
  ACESFilmicToneMapping,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sphere,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { Ambience } from "./ambience";
import { Creature } from "./creature";
import { Gaze } from "./gaze";
import { Urges } from "./impulses";
import { Mind, MOOD_LABELS } from "./moods";
import { createPost } from "./post";
import { Trace } from "./trace";

const TAU = Math.PI * 2;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing element: ${selector}`);
  return element;
}

const canvas = required<HTMLCanvasElement>("#scene");
const moodOut = required<HTMLElement>("#mood");
const pulseOut = required<HTMLElement>("#pulse");
const hint = required<HTMLElement>("#hint");

const renderer = new WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new Scene();
const camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 3.9);

const creature = new Creature();
scene.add(creature.group);

const post = createPost(renderer, scene, camera);
const mind = new Mind();
const gaze = new Gaze();
const urges = new Urges();
const ambience = new Ambience();
const trace = new Trace();

const pointer = new Vector2(0, 0);
const lastPointer = new Vector2(0, 0);
const raycaster = new Raycaster();
const orbBounds = new Sphere(new Vector3(0, 0, 0), 1);
const hitPoint = new Vector3();
const lookDir = new Vector3(0, 0, 1);
const touchDir = new Vector3(0, 0, 1);
const localTouch = new Vector3(0, 0, 1);

let idleTime = 99;
let poked = false;
let pointerGone = true;
let breathPhase = 0;
let heartPhase = 0;
let breath = 0;
let pulse = 0;
let spike = 0;
let rush = 0;
let compensate = 0;
let touch = 0;
let press = 0;
let dwell = 0;
let shy = 0;
let lastReadout = 0;

const ease = (dt: number, rate: number) => 1 - Math.exp(-rate * dt);

/** Air goes in quickly, comes out slowly, and rests a moment at the bottom. */
function breathCurve(phase: number): number {
  const p = phase - Math.floor(phase);
  if (p < 0.34) return -Math.cos((p / 0.34) * Math.PI);
  return Math.cos(((p - 0.34) / 0.66) ** 0.78 * Math.PI);
}

function noticePointer(event: PointerEvent): void {
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1,
  );
  idleTime = 0;
  pointerGone = false;
  hint.dataset.seen = "true";
  ambience.wake();
}

window.addEventListener("pointermove", noticePointer);
window.addEventListener("pointerdown", (event) => {
  noticePointer(event);
  poked = true;
  spike = 0.65;
});
window.addEventListener("pointerout", (event) => {
  if (!event.relatedTarget) pointerGone = true;
});
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.resize(window.innerWidth, window.innerHeight);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) ambience.suspend();
  else ambience.wake();
});

const timer = new Timer();

renderer.setAnimationLoop((timestamp: number) => {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.05);
  const time = timer.getElapsed();
  idleTime += dt;

  const pointerSpeed = Math.min(lastPointer.distanceTo(pointer) / Math.max(dt, 0.008), 10);
  lastPointer.copy(pointer);

  raycaster.setFromCamera(pointer, camera);
  const reach = raycaster.ray.distanceToPoint(orbBounds.center);
  const near = Math.max(0, Math.min(1, 1 - reach / 1.6));
  const landed = raycaster.ray.intersectSphere(orbBounds, hitPoint) !== null;
  if (!landed) raycaster.ray.closestPointToPoint(orbBounds.center, hitPoint);
  if (hitPoint.lengthSq() > 0.0001) lookDir.copy(hitPoint).normalize();
  touchDir.copy(lookDir);

  // The skin answers well before the pointer arrives, then answers fully once it lands.
  const felt = pointerGone ? 0 : Math.max(0, Math.min(1, (1.9 - reach) / 0.9));
  touch += (felt - touch) * ease(dt, felt > touch ? 6 : 2.6);
  const pressing = landed && !pointerGone ? 1 : 0;
  press += (pressing - press) * ease(dt, pressing > press ? 8 : 3);

  dwell = press > 0.5 && near > 0.82 ? dwell + dt : Math.max(0, dwell - dt * 1.6);
  const shyTarget = Math.min(1, Math.max(0, (dwell - 2.2) * 0.55));
  shy += (shyTarget - shy) * ease(dt, shyTarget > shy ? 1.9 : 1.1);

  const flinched = poked;
  mind.update(dt, { pointerSpeed, pointerNear: near, idleTime, poked, touch });
  const mood = mind.felt;
  poked = false;

  gaze.update(dt, {
    wanted: lookDir,
    seen: idleTime < 2.2 && !pointerGone,
    shy,
    agitation: mood.agitation,
  });

  urges.update(dt, mind.name, mind.boredom);
  const urge = urges.out;

  breathPhase += dt * mood.breathRate;
  const breathWave = breathCurve(breathPhase);
  const tide = breathWave * 0.82 + Math.sin(breathPhase * TAU * 0.41 + 1.2) * 0.18;
  breath = (tide + urge.breath * 1.9) * mood.breathDepth;

  // Sinus arrhythmia: the heart hurries on the way in and eases off on the way out.
  const sway = Math.sin(time * 0.37) + Math.sin(time * 0.131 + 2.1);
  const bpm = mood.bpm * (1 + breathWave * 0.085 + sway * 0.018) * (compensate > 0 ? 0.72 : 1);
  heartPhase += (dt * bpm) / 60 + (rush > 0 ? dt * 1.7 : 0);
  let beat = false;
  if (heartPhase >= 1) {
    heartPhase -= 1;
    beat = true;
    if (rush > 0) {
      rush = 0;
      compensate = 0.9;
    } else if (compensate > 0) {
      compensate = 0;
    } else if (Math.random() < 0.028) {
      // Once in a while a beat comes early, and the next one waits for it.
      rush = 0.9;
    }
  }
  rush = Math.max(0, rush - dt);
  compensate = Math.max(0, compensate - dt);
  const lub = Math.exp(-((heartPhase * 9) ** 2));
  const dub = 0.55 * Math.exp(-(((heartPhase - 0.17) * 11) ** 2));
  pulse = (lub + dub) * 0.72;

  spike -= spike * ease(dt, 3.4);
  const startle = spike + urge.jolt * 0.5;

  creature.localize(touchDir, localTouch);
  trace.update(renderer, dt, localTouch, press * 0.55, 0.21);

  creature.update(
    {
      time,
      breath,
      pulse,
      pulsePhase: heartPhase,
      spike: startle,
      shy,
      shiver: urge.shiver,
      stretch: urge.stretch,
      touch,
      touchDir,
      gazeDir: gaze.dir,
      focus: gaze.focus,
      traceMap: trace.texture,
    },
    mood,
    dt,
  );

  ambience.update({
    mood: mind.name,
    breath: breathWave,
    agitation: mood.agitation,
    beat,
    pan: pointer.x,
    flinched,
    gesture: urge.voice,
    rub: press * Math.min(1, pointerSpeed * 0.45),
    familiarity: mind.familiarity,
  });

  const driftX = Math.sin(time * 0.11) * 0.18 + pointer.x * 0.45;
  const driftY = Math.cos(time * 0.09) * 0.13 + pointer.y * 0.3;
  camera.position.x += (driftX - camera.position.x) * ease(dt, 1.4);
  camera.position.y += (driftY - camera.position.y) * ease(dt, 1.4);
  camera.position.z +=
    (3.9 + Math.sin(time * 0.07) * 0.14 + shy * 0.25 - camera.position.z) * ease(dt, 1.2);
  camera.lookAt(0, 0, 0);

  post.setBloom(mood.bloom * (1 + pulse * 0.07) + startle * 0.12);
  post.setGrade(time, (pulse + startle) * 0.3, 0.3 + mood.agitation * 0.55);
  post.composer.render();

  if (time - lastReadout > 0.3) {
    lastReadout = time;
    moodOut.textContent = MOOD_LABELS[mind.name];
    moodOut.style.color = `#${mood.skin.getHexString()}`;
    pulseOut.textContent = `${Math.round(bpm)} bpm`;
  }
});
