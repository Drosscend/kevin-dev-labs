uniform float uTime;
uniform float uPulse;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vLocalDir;

void main() {
  vec3 dir = normalize(position);
  float knead = 0.12 * fbm3(dir * 2.3 + vec3(0.0, uTime * 0.3, uTime * 0.17));
  vec3 displaced = dir * (1.0 + knead + uPulse * 0.22);

  vLocalDir = dir;
  vNormal = normalize(mat3(modelMatrix) * dir);
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
