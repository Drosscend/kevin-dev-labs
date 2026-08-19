uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uSkin;
uniform vec3 uVein;
uniform float uGlow;
uniform float uAgitation;
uniform float uDensity;
uniform vec4 uMarks[6];

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalDir;
varying float vDisp;
varying float vPulse;
varying float vCrease;
varying float vHeat;

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 view = normalize(cameraPosition - vWorldPos);

  float facing = clamp(dot(normal, view), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, 3.0);

  vec3 veinSpace = vLocalDir * (2.9 * uDensity) + vec3(0.0, uTime * 0.06, uTime * 0.02);
  float veinNoise = ridged3(veinSpace) * 0.78 + 0.28 * fbm3(vLocalDir * 5.4 - uTime * 0.11);
  float veins = smoothstep(0.58, 0.94, veinNoise);
  float capillaries =
    smoothstep(0.72, 1.0, ridged3(vLocalDir * (9.0 * uDensity) + uTime * 0.05)) * 0.45;

  // What it was born with, and what you left on it by coming back.
  float stain = 0.0;
  for (int i = 0; i < 6; i++) {
    stain += uMarks[i].w * exp(-(1.0 - dot(vLocalDir, uMarks[i].xyz)) * 11.0);
  }

  vec3 iridescence = 0.5 + 0.5 * cos(
    6.28318 * (vec3(0.0, 0.33, 0.67) + fresnel * 1.5 + vDisp * 4.0 + uTime * 0.04)
  );

  vec3 color = mix(uDeep * 0.22, uSkin * 0.3, smoothstep(-0.25, 0.35, vCrease));
  color += uDeep * (1.0 - fresnel) * (0.22 + 0.3 * uGlow);
  color += uVein * (veins + capillaries) * (0.34 + 0.5 * uGlow);
  color += uSkin * pow(fresnel, 1.8) * (0.85 + 0.35 * uAgitation);
  color += iridescence * fresnel * 0.16;
  color += uVein * vPulse * 0.55;
  color += mix(uVein, vec3(1.0, 0.88, 0.76), 0.25) * vHeat * 0.2;
  color += mix(uVein, vec3(1.0, 0.94, 0.88), 0.45) * stain * 0.26;

  vec3 light = normalize(vec3(0.55, 0.85, 0.9));
  float spec = pow(max(dot(reflect(-view, normal), light), 0.0), 42.0);
  color += vec3(0.9, 0.97, 1.0) * spec * 0.22;

  float alpha = clamp(0.34 + fresnel * 0.7 + veins * 0.3 + vPulse * 0.8 + vHeat * 0.22, 0.0, 1.0);

  // The water between you and it takes its share.
  float haze = smoothstep(2.6, 6.2, length(cameraPosition - vWorldPos));
  color *= mix(vec3(1.0), vec3(0.3, 0.42, 0.62), haze);
  alpha *= 1.0 - haze * 0.35;

  gl_FragColor = vec4(color, alpha);
}
