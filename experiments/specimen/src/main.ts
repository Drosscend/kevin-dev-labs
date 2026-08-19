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
import { Memory } from "./memory";
import { Mind } from "./mind";
import { Mist } from "./mist";
import { createPost } from "./post";
import { Presence } from "./presence";
import { Trace } from "./trace";
import { traitsFrom } from "./traits";
import { Vitals } from "./vitals";
import { Vivarium } from "./vivarium";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing element: ${selector}`);
  return element;
}

const canvas = required<HTMLCanvasElement>("#scene");
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

// Which creature this browser hatched, and what it has made of you.
const memory = new Memory();
const traits = traitsFrom(memory.state.seed);

const body = new Body(traits);
body.resize(camera.aspect);
body.remember(memory.state.marks);
scene.add(body.group);

const post = createPost(renderer, scene, camera);
const vivarium = new Vivarium(camera);
const presence = new Presence();
const mind = new Mind(traits, memory.state);
const gaze = new Gaze();
const urges = new Urges(traits);
const vitals = new Vitals();
const locomotion = new Locomotion();
const ambience = new Ambience(traits.timbre);
const trace = new Trace();
const mist = new Mist();

let home = memory.state.home ? new Vector3(...memory.state.home) : null;

const raycaster = new Raycaster();
const bounds = new Sphere(new Vector3(), 1);
const hitPoint = new Vector3();
const lookDir = new Vector3(0, 0, 1);
const touchDir = new Vector3(0, 0, 1);
const localTouch = new Vector3(0, 0, 1);
const markDir = new Vector3(0, 0, 1);
const onScreen = new Vector3();
const span = new Vector2();

let spike = 0;
let touch = 0;
let press = 0;
let dwell = 0;
let shy = 0;
let markDwell = 0;
let greeted = false;
let knockAge = -1;
let knockX = 0.5;
let knockY = 0.5;

const ease = (dt: number, rate: number) => 1 - Math.exp(-rate * dt);
const clamp01 = (value: number) => MathUtils.clamp(value, 0, 1);
/** How much of it is within reach of the pane, and so of the visitor. */
const atGlass = (z: number, radius: number) =>
  clamp01((z - (vivarium.glass - radius * 2.6)) / (radius * 1.3));

// A corner remembered from a wider window may no longer be inside this one.
if (home) {
  home.z = MathUtils.clamp(home.z, vivarium.back, vivarium.glass);
  vivarium.extent(home.z, span);
  home.x = MathUtils.clamp(home.x, -span.x, span.x);
  home.y = MathUtils.clamp(home.y, -span.y, span.y);
}

presence.listen(() => ambience.wake());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  vivarium.measure();
  body.resize(camera.aspect);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.resize(window.innerWidth, window.innerHeight);
});
function remember(): void {
  memory.state.familiarity = mind.familiarity;
  memory.state.knockTolerance = mind.knockTolerance;
  memory.state.nearTolerance = mind.nearTolerance;
  memory.save();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    remember();
    ambience.suspend();
  } else {
    ambience.wake();
  }
});
window.addEventListener("pagehide", remember);
window.addEventListener("keydown", (event) => {
  // Undocumented on purpose: this one dies and another hatches.
  if (event.shiftKey && event.key.toLowerCase() === "n") {
    memory.forget();
    location.reload();
  }
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
  if (presence.knocked) {
    spike = 0.65;
    knockAge = 0;
    knockX = presence.ndc.x * 0.5 + 0.5;
    knockY = presence.ndc.y * 0.5 + 0.5;
  } else if (knockAge >= 0) {
    knockAge = knockAge > 1.6 ? -1 : knockAge + dt;
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

  // Nothing of the hand reaches it unless it has come up to the pane itself.
  const reachable = atGlass(locomotion.position.z, radius);
  const near = clamp01(1 - reach / (radius * 2.6));
  // The skin answers well before the hand arrives, then answers fully once it lands.
  const felt = presence.gone ? 0 : clamp01((radius * 3 - reach) / (radius * 2)) * reachable;
  touch += (felt - touch) * ease(dt, felt > touch ? 6 : 2.6);
  const pressing = landed && !presence.gone ? reachable : 0;
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
    crowded: near * (0.35 + reachable * 0.65),
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

  vitals.update(dt, mood, urge.breath);

  locomotion.update(dt, {
    vivarium,
    handX: presence.ndc.x,
    handY: presence.ndc.y,
    mood,
    fear: mind.fear,
    curiosity: mind.curiosity,
    radius,
    knocked: presence.knocked,
    still: urge.still,
    quickness: traits.quickness,
    home,
  });

  // Wherever it keeps ending up when nothing is asking anything of it becomes its corner.
  if (mind.curiosity < 0.4 && mind.fear < 0.25) {
    if (home) home.lerp(locomotion.position, dt * 0.02);
    else home = locomotion.position.clone();
    memory.state.home = [home.x, home.y, home.z];
  }

  spike -= spike * ease(dt, 3.4);
  const startle = spike + urge.jolt * 0.5;

  // Breath only reaches the pane from right up against it, and stays where it was laid.
  onScreen.copy(locomotion.position).project(camera);
  mist.update(
    renderer,
    dt,
    onScreen.x * 0.5 + 0.5,
    onScreen.y * 0.5 + 0.5,
    atGlass(locomotion.position.z, radius) * (0.2 + clamp01(vitals.wave) * 0.35),
    camera.aspect,
  );

  body.localize(touchDir, localTouch);
  trace.update(renderer, dt, localTouch, press * 0.55, 0.21);

  // A hand that stays on the same spot long enough leaves something that does not wash off.
  if (press > 0.55) {
    if (localTouch.dot(markDir) > 0.9) markDwell += dt;
    else {
      markDir.copy(localTouch);
      markDwell = 0;
    }
    if (markDwell > 1.6) {
      markDwell = 0;
      memory.markAt(markDir, 0.18);
      body.remember(memory.state.marks);
    }
  } else {
    markDwell = Math.max(0, markDwell - dt);
  }

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
      flare: urge.flare,
    },
    mood,
    dt,
  );

  vivarium.extent(locomotion.position.z, span);
  ambience.update({
    mood: mind.name,
    breath: vitals.wave,
    agitation: mood.agitation,
    fired: vitals.fired,
    pan: MathUtils.clamp(locomotion.position.x / Math.max(span.x, 0.001), -1, 1),
    atGlass: reachable,
    knocked: presence.knocked,
    gesture: urge.sounded,
    rub: press * Math.min(1, presence.speed * 0.45),
    familiarity: mind.familiarity,
  });

  post.setGlass({
    mist: mist.texture,
    knockX,
    knockY,
    knockAge,
    aspect: camera.aspect,
  });
  memory.state.familiarity = mind.familiarity;
  memory.state.knockTolerance = mind.knockTolerance;
  memory.state.nearTolerance = mind.nearTolerance;
  memory.keep(dt);

  post.setBloom(mood.bloom * (1 + vitals.pulse * 0.07) + startle * 0.12);
  post.setGrade(time, (vitals.pulse + startle) * 0.3, 0.3 + mood.agitation * 0.55);
  post.composer.render();
});
