import {
  ACESFilmicToneMapping,
  MathUtils,
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
import { Body } from "./body";
import { Gaze } from "./gaze";
import { Urges } from "./impulses";
import { Locomotion } from "./locomotion";
import { Mind, MOOD_LABELS } from "./mind";
import { createPost } from "./post";
import { Presence } from "./presence";
import { Trace } from "./trace";
import { Vitals } from "./vitals";
import { Vivarium } from "./vivarium";

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
camera.lookAt(0, 0, 0);

const body = new Body();
scene.add(body.group);

const post = createPost(renderer, scene, camera);
const vivarium = new Vivarium(camera);
const presence = new Presence();
const mind = new Mind();
const gaze = new Gaze();
const urges = new Urges();
const vitals = new Vitals();
const locomotion = new Locomotion();
const ambience = new Ambience();
const trace = new Trace();

const raycaster = new Raycaster();
const bounds = new Sphere(new Vector3(), 1);
const hitPoint = new Vector3();
const lookDir = new Vector3(0, 0, 1);
const touchDir = new Vector3(0, 0, 1);
const localTouch = new Vector3(0, 0, 1);
const span = new Vector2();

let spike = 0;
let touch = 0;
let press = 0;
let dwell = 0;
let shy = 0;
let greeted = false;
let lastReadout = 0;

const ease = (dt: number, rate: number) => 1 - Math.exp(-rate * dt);
const clamp01 = (value: number) => MathUtils.clamp(value, 0, 1);

presence.listen(() => ambience.wake());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  vivarium.measure();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.resize(window.innerWidth, window.innerHeight);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) ambience.suspend();
  else ambience.wake();
});
window.addEventListener("pointerdown", () => {
  spike = 0.65;
});

const timer = new Timer();

renderer.setAnimationLoop((timestamp: number) => {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.05);
  const time = timer.getElapsed();

  presence.update(dt);
  if (!greeted && !presence.gone) {
    greeted = true;
    hint.dataset.seen = "true";
  }

  // Where the visitor's hand falls on the creature, wherever the creature happens to be.
  const radius = body.radius;
  bounds.center.copy(locomotion.position);
  bounds.radius = radius;
  raycaster.setFromCamera(presence.ndc, camera);
  const reach = raycaster.ray.distanceToPoint(bounds.center);
  const landed = raycaster.ray.intersectSphere(bounds, hitPoint) !== null;
  if (!landed) raycaster.ray.closestPointToPoint(bounds.center, hitPoint);
  lookDir.subVectors(hitPoint, bounds.center);
  if (lookDir.lengthSq() > 1e-6) lookDir.normalize();
  touchDir.copy(lookDir);

  const near = clamp01(1 - reach / (radius * 2.6));
  // The skin answers well before the hand arrives, then answers fully once it lands.
  const felt = presence.gone ? 0 : clamp01((radius * 3 - reach) / (radius * 2));
  touch += (felt - touch) * ease(dt, felt > touch ? 6 : 2.6);
  const pressing = landed && !presence.gone ? 1 : 0;
  press += (pressing - press) * ease(dt, pressing > press ? 8 : 3);

  dwell = press > 0.5 && near > 0.82 ? dwell + dt : Math.max(0, dwell - dt * 1.6);
  const shyTarget = clamp01((dwell - 2.2) * 0.55);
  shy += (shyTarget - shy) * ease(dt, shyTarget > shy ? 1.9 : 1.1);

  mind.update(dt, {
    pointerSpeed: presence.speed,
    pointerNear: near,
    idleTime: presence.idle,
    knocked: presence.knocked,
    touch,
    crowded: near,
    gone: presence.gone,
  });
  const mood = mind.felt;

  gaze.update(dt, {
    wanted: lookDir,
    seen: presence.idle < 2.2 && !presence.gone,
    shy,
    agitation: mood.agitation,
  });

  urges.update(dt, mind.name, mind.boredom);
  const urge = urges.out;

  vitals.update(dt, time, mood, urge.breath);

  locomotion.update(dt, {
    vivarium,
    handX: presence.ndc.x,
    handY: presence.ndc.y,
    mood,
    fear: mind.fear,
    curiosity: mind.curiosity,
    radius,
    knocked: presence.knocked,
  });

  spike -= spike * ease(dt, 3.4);
  const startle = spike + urge.jolt * 0.5;

  body.localize(touchDir, localTouch);
  trace.update(renderer, dt, localTouch, press * 0.55, 0.21);

  body.update(
    {
      time,
      breath: vitals.breath,
      pulse: vitals.pulse,
      pulsePhase: vitals.phase,
      spike: startle,
      shy,
      shiver: urge.shiver,
      stretch: urge.stretch,
      touch,
      touchDir,
      gazeDir: gaze.dir,
      focus: gaze.focus,
      traceMap: trace.texture,
      position: locomotion.position,
      flow: locomotion.flow,
      speed: locomotion.speed,
      jet: locomotion.jet,
      hidden: locomotion.hidden,
    },
    mood,
    dt,
  );

  vivarium.extent(locomotion.position.z, span);
  ambience.update({
    mood: mind.name,
    breath: vitals.wave,
    agitation: mood.agitation,
    beat: vitals.beat,
    pan: MathUtils.clamp(locomotion.position.x / Math.max(span.x, 0.001), -1, 1),
    flinched: presence.knocked,
    gesture: urge.voice,
    rub: press * Math.min(1, presence.speed * 0.45),
    familiarity: mind.familiarity,
  });

  post.setBloom(mood.bloom * (1 + vitals.pulse * 0.07) + startle * 0.12);
  post.setGrade(time, (vitals.pulse + startle) * 0.3, 0.3 + mood.agitation * 0.55);
  post.composer.render();

  if (time - lastReadout > 0.3) {
    lastReadout = time;
    moodOut.textContent = MOOD_LABELS[mind.name];
    moodOut.style.color = `#${mood.skin.getHexString()}`;
    pulseOut.textContent = `${Math.round(vitals.bpm)} bpm`;
  }
});
