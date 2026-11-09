import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  RepeatWrapping,
  type Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
} from "three";
import { GROUND, SIZE_X, SIZE_Z, VOXEL } from "../engine/constants";

export const SKY_HORIZON = 0xd4e7f2;
const SKY_TOP = 0x4f94d9;
const W = SIZE_X * VOXEL;
const D = SIZE_Z * VOXEL;
const Y = GROUND * VOXEL;

/** Sky, lights, and the static backdrop around the destructible block. */
export function addScenery(scene: Scene): void {
  scene.fog = new Fog(SKY_HORIZON, 60, 220);
  scene.add(sky());

  const cx = W / 2;
  const cz = D / 2;
  scene.add(new HemisphereLight(0xdbeaff, 0x6b5a45, 1.1));
  const sun = new DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(cx + 30, 55, cz - 20);
  sun.target.position.set(cx, 0, cz);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const cam = sun.shadow.camera;
  cam.left = -38;
  cam.right = 38;
  cam.top = 38;
  cam.bottom = -38;
  cam.near = 5;
  cam.far = 150;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  outerGround(scene);
  skyline(scene, cx, cz);
}

function sky(): Mesh {
  return new Mesh(
    new SphereGeometry(500, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new Color(SKY_TOP) },
        horizon: { value: new Color(SKY_HORIZON) },
      },
      vertexShader: `varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
        void main() {
          float t = pow(clamp(vDir.y, 0.0, 1.0), 0.6);
          gl_FragColor = vec4(mix(horizon, top, t), 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
}

function slab(
  scene: Scene,
  color: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
): void {
  const mesh = new Mesh(
    new PlaneGeometry(x1 - x0, z1 - z0),
    new MeshLambertMaterial({ color }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function outerGround(scene: Scene): void {
  const far = 500;
  const grass = 0x5a9e3a;
  slab(scene, grass, -far, -far, 0, D + far, Y);
  slab(scene, grass, W, -far, W + far, D + far, Y);
  slab(scene, grass, 0, -far, W, 0, Y);
  slab(scene, grass, 0, D, W, D + far, Y);
  for (const [x0, x1] of [
    [-far, 0],
    [W, W + far],
  ]) {
    slab(scene, 0x3a3c42, x0, 3, x1, 11, Y + 0.002);
    slab(scene, 0xb3b0a7, x0, 0, x1, 3, Y + 2 * VOXEL);
    slab(scene, 0xb3b0a7, x0, 11, x1, 14, Y + 2 * VOXEL);
  }
}

function windowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#6f8aa6";
    ctx.fillRect(8, 8, 16, 14);
  }
  const t = new CanvasTexture(canvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

function skyline(scene: Scene, cx: number, cz: number): void {
  const base = windowTexture();
  const colors = [0xc9b8a0, 0xa9a39a, 0xd8cdb8, 0x9aa3ab, 0xb88f72];
  for (let i = 0; i < 44; i++) {
    const angle = (i / 44) * Math.PI * 2 + Math.random() * 0.08;
    const dist = 62 + Math.random() * 60;
    const w = 10 + Math.random() * 14;
    const h = 10 + Math.random() * 40;
    const d = 10 + Math.random() * 14;
    const x = cx + Math.cos(angle) * dist;
    const z = cz + Math.sin(angle) * dist;
    if (Math.abs(z - 7) < Math.max(w, d) / 2 + 9) continue;
    const map = base.clone();
    map.repeat.set(Math.round(w / 2.5), Math.round(h / 3));
    const mesh = new Mesh(
      new BoxGeometry(w, h, d),
      new MeshLambertMaterial({ color: colors[i % colors.length], map }),
    );
    mesh.position.set(x, Y + h / 2, z);
    mesh.rotation.y = -angle;
    scene.add(mesh);
  }
}
