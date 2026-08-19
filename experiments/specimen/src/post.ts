import type { Camera, Scene, Texture, WebGLRenderer } from "three";
import { Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import glassFrag from "./shaders/glass.frag.glsl?raw";
import gradeFrag from "./shaders/grade.frag.glsl?raw";
import gradeVert from "./shaders/grade.vert.glsl?raw";

export interface GlassState {
  mist: Texture;
  /** Where the last knock landed on the pane, in screen coordinates from 0 to 1. */
  knockX: number;
  knockY: number;
  /** Seconds since that knock, or a negative number once it has faded. */
  knockAge: number;
  aspect: number;
}

export interface Post {
  composer: EffectComposer;
  setBloom: (strength: number) => void;
  setGlass: (state: GlassState) => void;
  setGrade: (time: number, pulse: number, aberration: number) => void;
  resize: (width: number, height: number) => void;
}

export function createPost(renderer: WebGLRenderer, scene: Scene, camera: Camera): Post {
  const size = renderer.getSize(new Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(size, 0.55, 0.5, 0.5);
  composer.addPass(bloom);

  const glass = new ShaderPass({
    name: "glass",
    uniforms: {
      tDiffuse: { value: null },
      uMist: { value: null },
      uKnock: { value: new Vector2(0.5, 0.5) },
      uKnockAge: { value: -1 },
      uAspect: { value: 1 },
    },
    vertexShader: gradeVert,
    fragmentShader: glassFrag,
  });
  composer.addPass(glass);

  const grade = new ShaderPass({
    name: "grade",
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uAberration: { value: 0.4 },
    },
    vertexShader: gradeVert,
    fragmentShader: gradeFrag,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    composer,
    setBloom: (strength) => {
      bloom.strength = strength;
    },
    setGlass: (state) => {
      glass.uniforms.uMist.value = state.mist;
      (glass.uniforms.uKnock.value as Vector2).set(state.knockX, state.knockY);
      glass.uniforms.uKnockAge.value = state.knockAge;
      glass.uniforms.uAspect.value = state.aspect;
    },
    setGrade: (time, pulse, aberration) => {
      grade.uniforms.uTime.value = time;
      grade.uniforms.uPulse.value = pulse;
      grade.uniforms.uAberration.value = aberration;
    },
    resize: (width, height) => {
      composer.setSize(width, height);
      bloom.setSize(width, height);
    },
  };
}
