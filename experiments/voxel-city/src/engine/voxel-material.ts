import {
  BufferAttribute,
  BufferGeometry,
  MeshLambertMaterial,
  type Texture,
} from "three";
import { VOXEL } from "./constants";
import type { MeshData } from "./greedy";

/**
 * Lambert material reading the material id and AO from vertex data.
 * `worldCells`: hash per world voxel (static chunks) instead of per local voxel (moving bodies).
 */
export function createVoxelMaterial(
  palette: Texture,
  worldCells: boolean,
): MeshLambertMaterial {
  const material = new MeshLambertMaterial();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPalette = { value: palette };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec2 aData;
        varying float vMat;
        varying float vAO;
        varying vec3 vCell;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vMat = aData.x;
        vAO = aData.y;
        vCell = position - normal * 0.5 ${
          worldCells
            ? `+ floor(modelMatrix[3].xyz / ${VOXEL.toFixed(4)} + 0.5)`
            : ""
        };`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uPalette;
        varying float vMat;
        varying float vAO;
        varying vec3 vCell;
        float voxelHash(vec3 p) {
          p = fract(p * vec3(0.1031, 0.1030, 0.0973));
          p += dot(p, p.yxz + 33.33);
          return fract((p.x + p.y) * p.z);
        }`,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `vec4 pal = texture2D(uPalette, vec2((vMat + 0.5) / 256.0, 0.25));
        float emissiveStrength = texture2D(uPalette, vec2((vMat + 0.5) / 256.0, 0.75)).r * 2.0;
        vec3 baseColor = pow(pal.rgb, vec3(2.2));
        float jitter = 1.0 + (voxelHash(floor(vCell + 0.001)) - 0.5) * 0.6 * pal.a;
        float occlusion = 0.42 + 0.193 * vAO;
        vec4 diffuseColor = vec4(baseColor * jitter * occlusion, opacity);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += baseColor * emissiveStrength;`,
      );
  };
  material.customProgramCacheKey = () =>
    worldCells ? "voxel-world" : "voxel-local";
  return material;
}

export function geometryFromMesh(mesh: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(mesh.normals, 3));
  geometry.setAttribute("aData", new BufferAttribute(mesh.data, 2));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
