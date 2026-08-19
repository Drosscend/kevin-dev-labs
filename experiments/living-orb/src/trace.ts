import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  RepeatWrapping,
  ShaderMaterial,
  type Texture,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import quadVert from "./shaders/grade.vert.glsl?raw";
import traceFrag from "./shaders/trace.frag.glsl?raw";

const WIDTH = 256;
const HEIGHT = 128;

function sheet(): WebGLRenderTarget {
  const target = new WebGLRenderTarget(WIDTH, HEIGHT, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  target.texture.wrapS = RepeatWrapping;
  target.texture.wrapT = ClampToEdgeWrapping;
  return target;
}

/**
 * What the skin remembers of being touched: heat laid down where the pointer rests,
 * spreading a little and cooling off over a few seconds. Stored as a lat/long sheet
 * in the orb's own frame, so a mark stays on the spot it was made and turns with it.
 */
export class Trace {
  private readonly sheets = [sheet(), sheet()];
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private front = 0;

  constructor() {
    this.material = new ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: traceFrag,
      uniforms: {
        uPrevious: { value: this.sheets[1].texture },
        uTexel: { value: new Vector2(1 / WIDTH, 1 / HEIGHT) },
        uDir: { value: new Vector3(0, 0, 1) },
        uAmount: { value: 0 },
        uRadius: { value: 0.24 },
        uDelta: { value: 0 },
      },
    });
    this.quad = new FullScreenQuad(this.material);
  }

  get texture(): Texture {
    return this.sheets[this.front].texture;
  }

  update(renderer: WebGLRenderer, dt: number, dir: Vector3, amount: number, radius: number): void {
    const target = this.sheets[1 - this.front];
    const uniforms = this.material.uniforms;
    uniforms.uPrevious.value = this.sheets[this.front].texture;
    uniforms.uDelta.value = dt;
    uniforms.uAmount.value = amount;
    uniforms.uRadius.value = radius;
    (uniforms.uDir.value as Vector3).copy(dir);

    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
    renderer.setRenderTarget(previous);
    this.front = 1 - this.front;
  }
}
