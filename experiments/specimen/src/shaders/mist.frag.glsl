uniform sampler2D uPrevious;
uniform vec2 uTexel;
uniform vec2 uAt;
uniform float uAmount;
uniform float uAspect;
uniform float uDelta;

varying vec2 vUv;

void main() {
  float here = texture2D(uPrevious, vUv).r;
  float around = 0.25 * (
      texture2D(uPrevious, vUv + vec2(uTexel.x, 0.0)).r
    + texture2D(uPrevious, vUv - vec2(uTexel.x, 0.0)).r
    + texture2D(uPrevious, vUv + vec2(0.0, uTexel.y)).r
    + texture2D(uPrevious, vUv - vec2(0.0, uTexel.y)).r
  );

  float fog = mix(here, around, min(1.0, uDelta * 1.6));

  vec2 reach = (vUv - uAt) * vec2(uAspect, 1.0);
  fog += uAmount * uDelta * exp(-dot(reach, reach) * 34.0);

  // A pane clears from the outside in, and never quite all at once.
  fog *= exp(-uDelta * 0.12);
  fog = max(0.0, fog - uDelta * 0.004);

  gl_FragColor = vec4(min(fog, 0.75), 0.0, 0.0, 1.0);
}
