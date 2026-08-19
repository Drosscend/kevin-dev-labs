import {
  AdditiveBlending,
  BackSide,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  Vector3,
} from "three";
import type { MoodProfile } from "./mind";
import coreFrag from "./shaders/core.frag.glsl?raw";
import coreVert from "./shaders/core.vert.glsl?raw";
import haloFrag from "./shaders/halo.frag.glsl?raw";
import haloVert from "./shaders/halo.vert.glsl?raw";
import noise from "./shaders/noise.glsl?raw";
import orbFrag from "./shaders/orb.frag.glsl?raw";
import orbVert from "./shaders/orb.vert.glsl?raw";

const withNoise = (source: string) => `${noise}\n${source}`;

/** How big it is when it is neither swollen nor tucked in. */
const SIZE = 0.62;

export interface BodyState {
  time: number;
  breath: number;
  pulse: number;
  pulsePhase: number;
  spike: number;
  shy: number;
  shiver: number;
  stretch: number;
  touch: number;
  touchDir: Vector3;
  gazeDir: Vector3;
  focus: number;
  traceMap: Texture;
  position: Vector3;
  /** Direction of travel, in world space. */
  flow: Vector3;
  speed: number;
  jet: number;
  hidden: number;
  /** A surge or a withdrawal of light, which is most of what it has to say. */
  flare: number;
}

/** The creature itself: a membrane, the glow trapped inside it, and the aura it leaks. */
export class Body {
  readonly group = new Group();
  /** Rough world radius, good enough to test whether the visitor's hand is on it. */
  radius = SIZE;

  private readonly skin: Mesh;
  private readonly core: Mesh;
  private readonly halo: Mesh;
  private readonly localTouch = new Vector3(0, 0, 1);
  private readonly localGaze = new Vector3(0, 0, 1);
  private readonly localFlow = new Vector3(0, 0, 1);
  private readonly inverseSpin = new Quaternion();
  private size = SIZE;
  private elongation = 0;
  private trail = 0;

  constructor() {
    const skinMaterial = new ShaderMaterial({
      vertexShader: withNoise(orbVert),
      fragmentShader: withNoise(orbFrag),
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0 },
        uSwell: { value: 1 },
        uAgitation: { value: 0 },
        uPulse: { value: 0 },
        uPulsePhase: { value: 0 },
        uSpike: { value: 0 },
        uShy: { value: 0 },
        uShiver: { value: 0 },
        uTouch: { value: 0 },
        uTouchDir: { value: new Vector3(0, 0, 1) },
        uFlow: { value: new Vector3(0, 0, 1) },
        uStretch: { value: 0 },
        uTrail: { value: 0 },
        uJet: { value: 0 },
        uCompact: { value: 0 },
        uTrace: { value: null },
        uDeep: { value: new Color() },
        uSkin: { value: new Color() },
        uVein: { value: new Color() },
        uGlow: { value: 0.5 },
      },
    });

    const coreMaterial = new ShaderMaterial({
      vertexShader: withNoise(coreVert),
      fragmentShader: withNoise(coreFrag),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uGlow: { value: 0.5 },
        uColorA: { value: new Color() },
        uColorB: { value: new Color() },
      },
    });

    const haloMaterial = new ShaderMaterial({
      vertexShader: withNoise(haloVert),
      fragmentShader: haloFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: BackSide,
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0 },
        uColor: { value: new Color() },
        uIntensity: { value: 1 },
      },
    });

    this.skin = new Mesh(new IcosahedronGeometry(1, 44), skinMaterial);
    this.skin.renderOrder = 2;

    this.core = new Mesh(new IcosahedronGeometry(0.52, 24), coreMaterial);
    this.core.renderOrder = 1;

    this.halo = new Mesh(new SphereGeometry(1.32, 96, 64), haloMaterial);
    this.halo.renderOrder = 3;

    this.group.add(this.core, this.skin, this.halo);
  }

  /** A narrow window leaves it no room to swim sideways, so it comes out smaller. */
  resize(aspect: number): void {
    this.size = SIZE * Math.min(Math.max(aspect / 1.2, 0.5), 1);
  }

  /** Turns a world direction into the skin's own frame, which keeps turning. */
  localize(world: Vector3, out: Vector3): Vector3 {
    this.inverseSpin.copy(this.group.quaternion).invert();
    return out.copy(world).applyQuaternion(this.inverseSpin);
  }

  update(state: BodyState, mood: MoodProfile, dt: number): void {
    this.group.position.copy(state.position);
    this.group.rotation.y += dt * mood.spin;
    this.group.rotation.x = Math.sin(state.time * 0.13) * 0.12;

    this.inverseSpin.copy(this.group.quaternion).invert();
    this.localTouch.copy(state.touchDir).applyQuaternion(this.inverseSpin);
    this.localGaze.copy(state.gazeDir).applyQuaternion(this.inverseSpin);
    this.localFlow.copy(state.flow).applyQuaternion(this.inverseSpin);

    // The silhouette answers slower than the movement, and its tail slower still.
    const drawn = Math.min(state.speed * 0.42, 0.55);
    this.elongation += (drawn - this.elongation) * (1 - Math.exp(-3.2 * dt));
    this.trail += (drawn * 0.85 - this.trail) * (1 - Math.exp(-1.7 * dt));

    const dimmed = Math.max(0.3, (1 - state.hidden * 0.45) * (1 + state.flare * 0.9));

    const skin = this.skin.material as ShaderMaterial;
    skin.uniforms.uTime.value = state.time;
    skin.uniforms.uBreath.value = state.breath;
    skin.uniforms.uSwell.value = mood.swell;
    skin.uniforms.uAgitation.value = mood.agitation;
    skin.uniforms.uPulse.value = state.pulse;
    skin.uniforms.uPulsePhase.value = state.pulsePhase;
    skin.uniforms.uSpike.value = state.spike;
    skin.uniforms.uShy.value = state.shy;
    skin.uniforms.uShiver.value = state.shiver;
    skin.uniforms.uTouch.value = state.touch;
    (skin.uniforms.uTouchDir.value as Vector3).copy(this.localTouch);
    (skin.uniforms.uFlow.value as Vector3).copy(this.localFlow);
    skin.uniforms.uStretch.value = this.elongation;
    skin.uniforms.uTrail.value = this.trail;
    skin.uniforms.uJet.value = state.jet;
    skin.uniforms.uCompact.value = state.hidden;
    skin.uniforms.uTrace.value = state.traceMap;
    (skin.uniforms.uDeep.value as Color).copy(mood.deep);
    (skin.uniforms.uSkin.value as Color).copy(mood.skin);
    (skin.uniforms.uVein.value as Color).copy(mood.vein);
    skin.uniforms.uGlow.value = mood.glow * dimmed;

    const core = this.core.material as ShaderMaterial;
    core.uniforms.uTime.value = state.time;
    core.uniforms.uPulse.value = state.pulse + state.spike * 0.5;
    core.uniforms.uGlow.value = mood.glow * dimmed;
    (core.uniforms.uColorA.value as Color).copy(mood.vein);
    (core.uniforms.uColorB.value as Color).copy(mood.skin);
    this.core.rotation.y -= dt * (0.25 + mood.agitation * 0.8);

    // The inner glow leans toward whatever it is looking at: that lean reads as a pupil.
    this.core.position.copy(this.localGaze).multiplyScalar(0.16 * state.focus);
    this.core.scale.setScalar(1 + state.focus * 0.07 - state.spike * 0.22 + state.pulse * 0.03);

    const halo = this.halo.material as ShaderMaterial;
    halo.uniforms.uTime.value = state.time;
    halo.uniforms.uBreath.value = state.breath;
    halo.uniforms.uIntensity.value = mood.halo * dimmed * (0.92 + state.pulse * 0.18);
    (halo.uniforms.uColor.value as Color).copy(mood.skin);

    const breathing =
      this.size *
      mood.scale *
      (1 + state.breath * 0.35 + state.spike * 0.06) *
      (1 - state.hidden * 0.1);
    const lengthen = 1 + state.stretch * 0.085;
    const narrow = 1 - state.stretch * 0.045;
    this.group.scale.set(breathing * narrow, breathing * lengthen, breathing * narrow);
    this.radius = breathing * 1.15;
  }
}
