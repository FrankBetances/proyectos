/**
 * Custom GLSL Shaders for Earlify Health Scrollytelling Experience
 * 4 Clinical Acts: Cochlea & Craniofacial -> Continuum Gap -> Lúa GC9A01 -> Longitudinal Loop
 */

export const vertexShader = /* glsl */ `
precision highp float;

attribute vec3 aPosChaos;
attribute vec3 aPosLua;
attribute vec3 aPosEco;
attribute vec3 aNormStage1;
attribute vec3 aNormStage3;
attribute vec4 aSeed; // x: primitive (0..1), y: phase, z: speed, w: scale
attribute vec3 aColor1;
attribute vec3 aColor2;
attribute vec3 aColor3;
attribute vec4 aColor4; // rgb + glint intensity

uniform float uProgress;       // 0.0 -> 4.0
uniform float uTime;
uniform vec3 uHoverPos;
uniform float uHoverIntensity; // 0.0 -> 1.0
uniform float uParticleScale;
uniform vec4 uRepelRects[4];   // [minX, minY, maxX, maxY] in NDC [-1, 1]
uniform int uRepelCount;

varying vec3 vBaseColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vSeed;
varying float vHoverFactor;
varying float vAlpha;

// --- Simplex 3D Noise Implementation ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 curlNoise(vec3 p) {
  const float e = 0.035;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  float n_x0 = snoise(p - dx);
  float n_x1 = snoise(p + dx);
  float n_y0 = snoise(p - dy);
  float n_y1 = snoise(p + dy);
  float n_z0 = snoise(p - dz);
  float n_z1 = snoise(p + dz);

  float x = (n_y1 - n_y0) - (n_z1 - n_z0);
  float y = (n_z1 - n_z0) - (n_x1 - n_x0);
  float z = (n_x1 - n_x0) - (n_y1 - n_y0);

  return normalize(vec3(x, y, z) + vec3(0.0001));
}

void main() {
  vSeed = aSeed;

  // --- Smoothstep Multi-Stage Interpolation (4 Acts) ---
  float t01 = smoothstep(0.0, 1.0, clamp(uProgress, 0.0, 1.0));
  float t12 = smoothstep(1.0, 2.0, clamp(uProgress, 1.0, 2.0));
  float t23 = smoothstep(2.0, 3.0, clamp(uProgress, 2.0, 3.0));

  // Base positions
  vec3 pos = mix(position, aPosChaos, t01);
  pos = mix(pos, aPosLua, t12);
  pos = mix(pos, aPosEco, t23);

  // Surface normals
  vec3 norm = mix(aNormStage1, vec3(0.0, 0.0, 1.0), t01);
  norm = mix(norm, aNormStage3, t12);
  vec3 ecoNorm = normalize(pos + vec3(0.001));
  norm = mix(norm, ecoNorm, t23);
  norm = normalize(norm);
  vNormal = normalMatrix * norm;

  // Colors
  vec3 col = mix(aColor1, aColor2, t01);
  col = mix(col, aColor3, t12);
  col = mix(col, aColor4.rgb, t23);
  vBaseColor = col;

  // Base alpha
  vAlpha = 0.94;

  // --- Curl Noise Aerodynamic Transitions ---
  // Modulate transitions with 3D curl noise proportional to sin(fract(uProgress) * PI)
  float stageFraction = fract(uProgress);
  if (uProgress >= 3.0) {
    stageFraction = 0.0;
  }
  float transitionWeight = sin(stageFraction * 3.14159265359);
  if (transitionWeight > 0.005) {
    vec3 curl = curlNoise(pos * 0.55 + vec3(uTime * 0.12, uTime * 0.08, aSeed.y * 2.0));
    pos += curl * (transitionWeight * 0.68);
  }

  // --- Longitudinal Ecosystem Pulse (Act 4: progress >= 2.8) ---
  if (uProgress >= 2.7) {
    float ecoBlend = smoothstep(2.7, 3.0, uProgress);
    float angle = atan(pos.y, pos.x);
    float pulse = sin(angle * 3.0 - uTime * 2.0 + aSeed.z * 6.28) * 0.045;
    pos += norm * (pulse * ecoBlend);
  }

  // --- Localized Surface Lift ("Goosebumps" Hover Effect) ---
  // Vertices within radius R < 0.65 displace outward strictly along surface normal
  float distToHover = length(pos - uHoverPos);
  float hoverRadius = 0.65;
  float liftFactor = uHoverIntensity * smoothstep(hoverRadius, 0.0, distToHover);
  pos += norm * (liftFactor * 0.25);
  vHoverFactor = liftFactor;

  // View-space transformation
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = mvPosition.xyz;

  // --- View-Space Typography Repulsion Halo ---
  // Project vertex position to screen view-space (NDC)
  vec4 clipPos = projectionMatrix * mvPosition;
  vec2 ndc = clipPos.xy / clipPos.w; // [-1, 1]

  // Test against active text containers bounding boxes
  for (int i = 0; i < 4; i++) {
    if (i < uRepelCount) {
      vec4 rect = uRepelRects[i]; // [minX, minY, maxX, maxY]
      if (rect.z > rect.x && rect.w > rect.y) {
        vec2 center = (rect.xy + rect.zw) * 0.5;
        vec2 halfSize = (rect.zw - rect.xy) * 0.5 + vec2(0.08, 0.06); // Clearance padding

        vec2 delta = abs(ndc - center) - halfSize;
        float outsideDist = length(max(delta, vec2(0.0)));
        float insideDist = min(max(delta.x, delta.y), 0.0);
        float distToBox = outsideDist + insideDist;

        float repelRadius = 0.22;
        if (distToBox < repelRadius) {
          vec2 repelDir = normalize(ndc - center + vec2(0.0001, 0.0001));
          float repelStrength = 0.42;
          float factor = smoothstep(repelRadius, 0.0, distToBox);
          
          // Displace outward in view-space and push backwards in z
          mvPosition.xy += repelDir * (repelStrength * factor * abs(mvPosition.z) * 0.35);
          mvPosition.z -= 15.0 * factor;
        }
      }
    }
  }

  // Final screen projection
  gl_Position = projectionMatrix * mvPosition;

  // Particle size attenuation
  float baseSize = 34.0 * uParticleScale * aSeed.w;
  gl_PointSize = clamp(baseSize / (-mvPosition.z), 1.5, 48.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;

varying vec3 vBaseColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vSeed;
varying float vHoverFactor;
varying float vAlpha;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float alpha = 0.0;

  // --- SDF Micro-Primitives ---
  // 60% clean circular micro-points (vSeed.x < 0.60)
  // 25% wireframe equilateral micro-triangles with sharp borders (0.60 <= vSeed.x < 0.85)
  // 15% specular star glints (vSeed.x >= 0.85)

  if (vSeed.x < 0.60) {
    // 1. Circular micro-point SDF
    float dist = length(p) - 0.44;
    alpha = 1.0 - smoothstep(0.0, 0.08, dist);
  } else if (vSeed.x < 0.85) {
    // 2. Wireframe equilateral micro-triangle SDF
    const float k = 1.7320508; // sqrt(3)
    vec2 tp = vec2(p.x, -p.y);
    tp.x = abs(tp.x) - 0.38;
    tp.y = tp.y + 0.38 / k;
    if (tp.x + k * tp.y > 0.0) {
      tp = vec2(tp.x - k * tp.y, -k * tp.x - tp.y) * 0.5;
    }
    tp.x -= clamp(tp.x, -0.76, 0.0);
    float triDist = -length(tp) * sign(tp.y);
    // Wireframe border with sharp 0.06 width
    float wireDist = abs(triDist) - 0.06;
    alpha = 1.0 - smoothstep(0.0, 0.08, wireDist);
  } else {
    // 3. Specular 4-point star glint SDF
    vec2 sp = abs(p);
    float starDist = (sp.x + sp.y) - 0.40;
    float coreDist = length(p) - 0.14;
    float starA = 1.0 - smoothstep(0.0, 0.07, starDist);
    float coreA = 1.0 - smoothstep(0.0, 0.05, coreDist);
    alpha = max(starA, coreA);
  }

  if (alpha < 0.02) {
    discard;
  }

  // --- View-Space Fresnel Rim Lighting ---
  vec3 viewDir = normalize(-vViewPosition);
  vec3 normal = normalize(vNormal);
  float NdotV = max(dot(normal, viewDir), 0.0);
  float fresnel = pow(1.0 - NdotV, 2.4);

  // --- Non-Clipping Proportional Additive Blending ---
  // Avoid solid blown-out white blobs (#FFFFFF)
  vec3 finalColor = vBaseColor + vBaseColor * (0.45 * fresnel);

  // --- Hover Glint Illumination ---
  // Soft turquoise (#00C4BE) / champagne (#F5E6C8) glint
  vec3 turquoiseGlint = vec3(0.0, 0.77, 0.75);
  vec3 champagneGlint = vec3(0.96, 0.90, 0.78);
  vec3 hoverColor = mix(turquoiseGlint, champagneGlint, vSeed.y);
  finalColor += hoverColor * (vHoverFactor * 0.75);

  gl_FragColor = vec4(finalColor, alpha * vAlpha);
}
`;
