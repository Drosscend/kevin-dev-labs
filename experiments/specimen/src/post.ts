import type { Camera, Scene, WebGLRenderer } from "three";
import { Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import gradeFrag from "./shaders/grade.frag.glsl?raw";
import gradeVert from "./shaders/grade.vert.glsl?raw";

export interface Post {
  composer: EffectComposer;
  setBloom: (strength: number) => void;
  setGrade: (time: number, pulse: number, aberration: number) => void;
  resize: (width: number, height: number) => void;
}

export function createPost(renderer: WebGLRenderer, scene: Scene, camera: Camera): Post {
  const size = renderer.getSize(new Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(size, 0.55, 0.5, 0.5);
  composer.addPass(bloom);

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
