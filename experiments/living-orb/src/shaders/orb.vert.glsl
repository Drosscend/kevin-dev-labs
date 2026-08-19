uniform float uTime;
uniform float uBreath;
uniform float uSwell;
uniform float uAgitation;
uniform float uPulse;
uniform float uPulsePhase;
uniform float uSpike;
uniform float uShy;
uniform float uShiver;
uniform float uTouch;
uniform vec3 uTouchDir;
uniform sampler2D uTrace;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalDir;
varying float vDisp;
varying float vPulse;
varying float vCrease;
varying float vHeat;

vec2 sphericalUv(vec3 dir) {
  return vec2(
    atan(dir.z, dir.x) / 6.2831853 + 0.5,
    asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265 + 0.5
  );
}

float heatAt(vec3 dir) {
  return texture2D(uTrace, sphericalUv(dir)).r;
}

const vec3 HEART_POLE = vec3(0.0, -0.28, 0.96);

float heartRing(vec3 dir) {
  float angle = acos(clamp(dot(dir, normalize(HEART_POLE)), -1.0, 1.0));
  return uPulse * exp(-pow((angle - uPulsePhase * 3.6) * 2.3, 2.0));
}

vec2 field(vec3 dir) {
  float t = uTime;

  vec3 warp = vec3(
    snoise(dir * 1.25 + vec3(0.0, 0.0, t * 0.05)),
    snoise(dir * 1.25 + vec3(5.2, 1.3, t * 0.043)),
    snoise(dir * 1.25 + vec3(9.1, 7.7, t * 0.057))
  );

  float swell = fbm3(dir * 1.65 + warp * 0.5 + vec3(0.0, t * 0.07, 0.0));
  float ripple = snoise(dir * 4.4 + vec3(t * 0.26, -t * 0.19, t * 0.22));
  float grain = fbm3(dir * 7.5 + vec3(t * 0.16, -t * 0.11, t * 0.21));
  float tremor = snoise(dir * 12.0 + t * (1.1 + 3.4 * uAgitation));

  float reach = acos(clamp(dot(dir, uTouchDir), -1.0, 1.0));
  float bump = exp(-pow(reach * 3.2, 2.0));
  float rings = cos(reach * 10.0 - t * 2.4) * exp(-reach * 1.6);

  float disp =
      uSwell * (0.105 + 0.06 * uAgitation) * swell
    + 0.05 * ripple * (0.5 + uAgitation)
    + 0.017 * grain * (0.6 + 0.8 * uAgitation)
    + 0.012 * tremor * uAgitation
    + uShiver * 0.026 * snoise(dir * 15.0 + t * 26.0)
    + 0.085 * heartRing(dir)
    + uSpike * 0.13 * snoise(dir * 3.2 + t * 5.0)
    + (uTouch * 0.24 - uShy * 0.24) * bump
    + uTouch * 0.034 * rings
    + heatAt(dir) * 0.04;

  return vec2(disp, swell);
}

vec3 surfaceAt(vec3 dir) {
  return dir * (1.0 + uBreath + field(dir).x);
}

void main() {
  vec3 dir = normalize(position);
  vec2 shape = field(dir);
  vec3 displaced = dir * (1.0 + uBreath + shape.x);

  vec3 helper = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(helper, dir));
  vec3 bitangent = cross(dir, tangent);
  float eps = 0.014;
  vec3 alongU = surfaceAt(normalize(dir + tangent * eps));
  vec3 alongV = surfaceAt(normalize(dir + bitangent * eps));
  vec3 normal = normalize(cross(alongU - displaced, alongV - displaced));
  if (dot(normal, dir) < 0.0) normal = -normal;

  vHeat = heatAt(dir);
  vDisp = shape.x;
  vCrease = shape.y;
  vPulse = heartRing(dir);
  vLocalDir = dir;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
