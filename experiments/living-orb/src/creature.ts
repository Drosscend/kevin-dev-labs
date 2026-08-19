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
import type { MoodProfile } from "./moods";
import coreFrag from "./shaders/core.frag.glsl?raw";
import coreVert from "./shaders/core.vert.glsl?raw";
import haloFrag from "./shaders/halo.frag.glsl?raw";
import haloVert from "./shaders/halo.vert.glsl?raw";
import noise from "./shaders/noise.glsl?raw";
import orbFrag from "./shaders/orb.frag.glsl?raw";
import orbVert from "./shaders/orb.vert.glsl?raw";

const withNoise = (source: string) => `${noise}\n${source}`;

export interface Vitals {
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
}

/** The orb itself: a membrane, the glow trapped inside it, and the aura it leaks. */
export class Creature {
  readonly group = new Group();

  private readonly skin: Mesh;
  private readonly core: Mesh;
  private readonly halo: Mesh;
  private readonly localTouch = new Vector3(0, 0, 1);
  private readonly localGaze = new Vector3(0, 0, 1);
  private readonly inverseSpin = new Quaternion();

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

  /** Turns a world direction into the skin's own frame, which keeps turning. */
  localize(world: Vector3, out: Vector3): Vector3 {
    this.inverseSpin.copy(this.group.quaternion).invert();
    return out.copy(world).applyQuaternion(this.inverseSpin);
  }

  update(vitals: Vitals, mood: MoodProfile, dt: number): void {
    this.group.rotation.y += dt * mood.spin;
    this.group.rotation.x = Math.sin(vitals.time * 0.13) * 0.12;

    this.inverseSpin.copy(this.group.quaternion).invert();
    this.localTouch.copy(vitals.touchDir).applyQuaternion(this.inverseSpin);
    this.localGaze.copy(vitals.gazeDir).applyQuaternion(this.inverseSpin);

    const skin = this.skin.material as ShaderMaterial;
    skin.uniforms.uTime.value = vitals.time;
    skin.uniforms.uBreath.value = vitals.breath;
    skin.uniforms.uSwell.value = mood.swell;
    skin.uniforms.uAgitation.value = mood.agitation;
    skin.uniforms.uPulse.value = vitals.pulse;
    skin.uniforms.uPulsePhase.value = vitals.pulsePhase;
    skin.uniforms.uSpike.value = vitals.spike;
    skin.uniforms.uShy.value = vitals.shy;
    skin.uniforms.uShiver.value = vitals.shiver;
    skin.uniforms.uTouch.value = vitals.touch;
    (skin.uniforms.uTouchDir.value as Vector3).copy(this.localTouch);
    skin.uniforms.uTrace.value = vitals.traceMap;
    (skin.uniforms.uDeep.value as Color).copy(mood.deep);
    (skin.uniforms.uSkin.value as Color).copy(mood.skin);
    (skin.uniforms.uVein.value as Color).copy(mood.vein);
    skin.uniforms.uGlow.value = mood.glow;

    const core = this.core.material as ShaderMaterial;
    core.uniforms.uTime.value = vitals.time;
    core.uniforms.uPulse.value = vitals.pulse + vitals.spike * 0.5;
    core.uniforms.uGlow.value = mood.glow;
    (core.uniforms.uColorA.value as Color).copy(mood.vein);
    (core.uniforms.uColorB.value as Color).copy(mood.skin);
    this.core.rotation.y -= dt * (0.25 + mood.agitation * 0.8);

    // The inner glow leans toward whatever the orb is looking at: that lean reads as a pupil.
    this.core.position.copy(this.localGaze).multiplyScalar(0.16 * vitals.focus);
    this.core.scale.setScalar(1 + vitals.focus * 0.07 - vitals.spike * 0.22 + vitals.pulse * 0.03);

    const halo = this.halo.material as ShaderMaterial;
    halo.uniforms.uTime.value = vitals.time;
    halo.uniforms.uBreath.value = vitals.breath;
    halo.uniforms.uIntensity.value = mood.halo * (0.92 + vitals.pulse * 0.18);
    (halo.uniforms.uColor.value as Color).copy(mood.skin);

    const breathing = mood.scale * (1 + vitals.breath * 0.35 + vitals.spike * 0.06);
    const lengthen = 1 + vitals.stretch * 0.085;
    const narrow = 1 - vitals.stretch * 0.045;
    this.group.scale.set(breathing * narrow, breathing * lengthen, breathing * narrow);
  }
}
