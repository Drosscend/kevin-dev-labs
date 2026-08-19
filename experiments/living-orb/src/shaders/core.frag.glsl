uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uPulse;
uniform float uGlow;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vLocalDir;

void main() {
  vec3 view = normalize(cameraPosition - vWorldPos);
  float facing = clamp(dot(normalize(vNormal), view), 0.0, 1.0);
  float density = pow(facing, 1.6);

  float clouds = fbm3(vLocalDir * 3.6 + vec3(uTime * 0.11, uTime * 0.24, -uTime * 0.15));
  vec3 color = mix(uColorA, uColorB, clamp(clouds * 0.5 + 0.5, 0.0, 1.0));

  float amount = density * (0.2 + 0.34 * uGlow) * (0.8 + 0.4 * uPulse) * (0.45 + 0.5 * clouds);
  gl_FragColor = vec4(color * amount, 1.0);
}
