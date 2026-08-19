import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  ShaderMaterial,
  type Texture,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import quadVert from "./shaders/grade.vert.glsl?raw";
import mistFrag from "./shaders/mist.frag.glsl?raw";

const WIDTH = 256;
const HEIGHT = 144;

function sheet(): WebGLRenderTarget {
  const target = new WebGLRenderTarget(WIDTH, HEIGHT, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  target.texture.wrapS = ClampToEdgeWrapping;
  target.texture.wrapT = ClampToEdgeWrapping;
  return target;
}

/**
 * What the pane keeps of the creature's breath: a patch of fog where it came close,
 * spreading a little and clearing over half a minute. Held in screen space, so a mark
 * stays where it was breathed even once the creature has swum off.
 */
export class Mist {
  private readonly sheets = [sheet(), sheet()];
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private front = 0;

  constructor() {
    this.material = new ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: mistFrag,
      uniforms: {
        uPrevious: { value: this.sheets[1].texture },
        uTexel: { value: new Vector2(1 / WIDTH, 1 / HEIGHT) },
        uAt: { value: new Vector2(0.5, 0.5) },
        uAmount: { value: 0 },
        uAspect: { value: 1 },
        uDelta: { value: 0 },
      },
    });
    this.quad = new FullScreenQuad(this.material);
  }

  get texture(): Texture {
    return this.sheets[this.front].texture;
  }

  update(
    renderer: WebGLRenderer,
    dt: number,
    atX: number,
    atY: number,
    amount: number,
    aspect: number,
  ): void {
    const target = this.sheets[1 - this.front];
    const uniforms = this.material.uniforms;
    uniforms.uPrevious.value = this.sheets[this.front].texture;
    uniforms.uDelta.value = dt;
    uniforms.uAmount.value = amount;
    uniforms.uAspect.value = aspect;
    (uniforms.uAt.value as Vector2).set(atX, atY);

    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
    renderer.setRenderTarget(previous);
    this.front = 1 - this.front;
  }
}
