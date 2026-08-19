uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uPulse;
uniform float uAberration;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
}

void main() {
  vec2 offset = vUv - 0.5;
  float dist = length(offset);
  float shift = (uAberration + uPulse * 0.6) * 0.006 * dist;

  vec3 color;
  color.r = texture2D(tDiffuse, vUv + offset * shift).r;
  color.g = texture2D(tDiffuse, vUv).g;
  color.b = texture2D(tDiffuse, vUv - offset * shift).b;

  color *= smoothstep(1.15, 0.22, dist);
  color += (hash(vUv * 940.0 + fract(uTime)) - 0.5) * 0.022;

  gl_FragColor = vec4(color, 1.0);
}
