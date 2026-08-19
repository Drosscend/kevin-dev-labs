uniform sampler2D uPrevious;
uniform vec2 uTexel;
uniform vec3 uDir;
uniform float uAmount;
uniform float uRadius;
uniform float uDelta;

varying vec2 vUv;

const float TAU = 6.2831853;
const float PI = 3.14159265;

vec3 directionOf(vec2 uv) {
  float lon = (uv.x - 0.5) * TAU;
  float lat = (uv.y - 0.5) * PI;
  float band = cos(lat);
  return vec3(band * cos(lon), sin(lat), band * sin(lon));
}

void main() {
  float here = texture2D(uPrevious, vUv).r;
  float around = 0.25 * (
      texture2D(uPrevious, vUv + vec2(uTexel.x, 0.0)).r
    + texture2D(uPrevious, vUv - vec2(uTexel.x, 0.0)).r
    + texture2D(uPrevious, vUv + vec2(0.0, uTexel.y)).r
    + texture2D(uPrevious, vUv - vec2(0.0, uTexel.y)).r
  );

  float heat = mix(here, around, min(1.0, uDelta * 5.0));
  heat *= exp(-uDelta * 0.55);
  heat = max(0.0, heat - uDelta * 0.02);

  float reach = acos(clamp(dot(directionOf(vUv), uDir), -1.0, 1.0));
  heat += uAmount * uDelta * exp(-pow(reach / uRadius, 2.0));

  gl_FragColor = vec4(min(heat, 0.6), 0.0, 0.0, 1.0);
}
