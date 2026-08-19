uniform sampler2D tDiffuse;
uniform sampler2D uMist;
uniform vec2 uKnock;
uniform float uKnockAge;
uniform float uAspect;

varying vec2 vUv;

void main() {
  vec2 middle = vUv - 0.5;
  float rim = dot(middle, middle);

  // The pane has thickness: whatever crosses it near the rim comes through bent.
  vec2 uv = vUv - middle * rim * 0.12;

  // A knock travels out from where the finger landed.
  if (uKnockAge >= 0.0) {
    vec2 reach = (uv - uKnock) * vec2(uAspect, 1.0);
    float far = length(reach) + 1e-5;
    float front = uKnockAge * 1.25;
    float ring = exp(-pow((far - front) * 8.0, 2.0)) * exp(-uKnockAge * 2.4);
    uv += (reach / far) * ring * 0.015;
  }

  float fog = texture2D(uMist, uv).r;
  vec3 color = texture2D(tDiffuse, uv).rgb;

  if (fog > 0.002) {
    float blur = 0.003 + fog * 0.013;
    vec3 scattered = 0.25 * (
        texture2D(tDiffuse, uv + vec2(blur, 0.0)).rgb
      + texture2D(tDiffuse, uv - vec2(blur, 0.0)).rgb
      + texture2D(tDiffuse, uv + vec2(0.0, blur)).rgb
      + texture2D(tDiffuse, uv - vec2(0.0, blur)).rgb
    );
    color = mix(color, scattered, min(fog * 1.7, 0.8));
    color += vec3(0.34, 0.44, 0.6) * fog * 0.045;
  }

  // The room you are standing in, caught flat on the pane.
  float sheen = smoothstep(0.46, 0.0, abs(vUv.x * 0.78 + vUv.y * 0.62 - 0.94));
  color += vec3(0.17, 0.21, 0.32) * sheen * (0.085 + fog * 0.12);

  gl_FragColor = vec4(color, 1.0);
}
