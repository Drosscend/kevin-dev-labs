uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 view = normalize(cameraPosition - vWorldPos);
  float facing = abs(dot(normalize(vNormal), view));
  float rim = pow(1.0 - facing, 3.8);
  float drift = 0.85 + 0.15 * sin(uTime * 0.63 + vWorldPos.y * 1.7);
  float amount = rim * uIntensity * drift * 0.6;
  gl_FragColor = vec4(uColor * amount, amount);
}
