uniform float uTime;
uniform float uBreath;

varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 dir = normalize(position);
  float wobble = 0.045 * snoise(dir * 1.7 + vec3(0.0, uTime * 0.12, uTime * 0.09));
  vec3 displaced = dir * (1.0 + uBreath * 1.5 + wobble);

  vNormal = normalize(mat3(modelMatrix) * dir);
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
