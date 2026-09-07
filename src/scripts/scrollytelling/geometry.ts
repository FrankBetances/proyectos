import * as THREE from 'three';

export const PARTICLE_COUNT = 36000;

// Colors defined in specification
const COLOR_SLATE = new THREE.Color('#5C646B');
const COLOR_LINEN = new THREE.Color('#D8D0C5');
const COLOR_AMBER = new THREE.Color('#D9822B');
const COLOR_OBSIDIAN = new THREE.Color('#18191B');
const COLOR_WHITE = new THREE.Color('#FFFFFF');
const COLOR_TURQUOISE = new THREE.Color('#00C4BE');
const COLOR_CHAMPAGNE = new THREE.Color('#F5E6C8');
const COLOR_CHAOS_DARK = new THREE.Color('#2A2E33');
const COLOR_CHAOS_SLATE = new THREE.Color('#4A525A');

/**
 * Pseudo-random generator with deterministic seed
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Procedural generation of the 36,000 GPU Particles across 4 Clinical Acts
 */
export function createClinicalPointCloudGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const posStage1 = new Float32Array(PARTICLE_COUNT * 3);
  const posChaos = new Float32Array(PARTICLE_COUNT * 3);
  const posLua = new Float32Array(PARTICLE_COUNT * 3);
  const posEco = new Float32Array(PARTICLE_COUNT * 3);

  const normStage1 = new Float32Array(PARTICLE_COUNT * 3);
  const normStage3 = new Float32Array(PARTICLE_COUNT * 3);

  const seed = new Float32Array(PARTICLE_COUNT * 4);

  const col1 = new Float32Array(PARTICLE_COUNT * 3);
  const col2 = new Float32Array(PARTICLE_COUNT * 3);
  const col3 = new Float32Array(PARTICLE_COUNT * 3);
  const col4 = new Float32Array(PARTICLE_COUNT * 4); // rgb + glint

  const rng = seededRandom(42);

  // --- ACT 1: VIA+ Cochlear & Craniofacial Mesh ---
  // Split 18,000 for cochlea spiral, 18,000 for craniofacial/auricular mesh
  const cochleaCount = 18000;
  const cranialCount = PARTICLE_COUNT - cochleaCount;

  for (let i = 0; i < cochleaCount; i++) {
    const t = i / cochleaCount; // 0 (base) to 1 (apex)
    const theta = 2.65 * Math.PI * 2 * t; // 2.65 turns
    const rBase = 1.95 * (1.0 - 0.72 * t);
    const zBase = 0.95 * Math.pow(t, 0.85) - 0.45;
    const rTube = 0.36 * (1.0 - 0.68 * t);

    // Cross-section angle
    const phi = rng() * Math.PI * 2;
    const radJitter = (rng() - 0.5) * 0.05 * rTube;
    const currentRTube = rTube + radJitter;

    const cx = rBase * Math.cos(theta);
    const cy = rBase * Math.sin(theta);
    const cz = zBase;

    // Normal to curve in xy plane
    const nx = Math.cos(theta);
    const ny = Math.sin(theta);

    // Point on tube surface
    const px = cx + currentRTube * Math.cos(phi) * nx - 0.45;
    const py = cy + currentRTube * Math.cos(phi) * ny + 0.15;
    const pz = cz + currentRTube * Math.sin(phi);

    const idx = i * 3;
    posStage1[idx] = px;
    posStage1[idx + 1] = py;
    posStage1[idx + 2] = pz;

    // Analytical normal pointing outward from tube
    const normalX = Math.cos(phi) * nx;
    const normalY = Math.cos(phi) * ny;
    const normalZ = Math.sin(phi);
    const nLen = Math.hypot(normalX, normalY, normalZ) || 1.0;
    normStage1[idx] = normalX / nLen;
    normStage1[idx + 1] = normalY / nLen;
    normStage1[idx + 2] = normalZ / nLen;

    // Stage 1 Color
    let c = COLOR_LINEN;
    if (t < 0.22 && rng() < 0.4) {
      c = COLOR_AMBER; // High-frequency threshold accent at cochlear base
    } else if (rng() < 0.45) {
      c = COLOR_SLATE;
    }
    col1[idx] = c.r;
    col1[idx + 1] = c.g;
    col1[idx + 2] = c.b;
  }

  // Craniofacial & Auricular contour (18,000 vertices)
  for (let i = 0; i < cranialCount; i++) {
    const globalIdx = cochleaCount + i;
    const idx = globalIdx * 3;

    const u = (i / cranialCount) * Math.PI * 2;
    const v = rng();

    // Harmonic ear helix & antihelix contour
    const rEar = 1.38 * (1.0 + 0.32 * Math.cos(u) - 0.22 * Math.cos(2 * u) + 0.12 * Math.sin(u));
    const isEar = i < 11000;

    let px = 0;
    let py = 0;
    let pz = 0;
    let nx = 0;
    let ny = 0;
    let nz = 1;

    if (isEar) {
      // Auricle (Pinna)
      const earSpread = 0.15 * (rng() - 0.5);
      px = 0.48 + (rEar + earSpread) * Math.cos(u) * 0.85;
      py = 0.10 + (rEar + earSpread) * Math.sin(u) * 1.15;
      pz = 0.35 * Math.sin(2 * u) + 0.2 * (v - 0.5) - 0.15;

      nx = Math.cos(u) * 0.6;
      ny = Math.sin(u) * 0.6;
      nz = 0.8;
    } else {
      // Pediatric craniofacial cheek/mandible line embracing the acoustic inlet
      const jawU = (i - 11000) / (cranialCount - 11000);
      const angle = -Math.PI * 0.5 + jawU * Math.PI * 1.1;
      const jawR = 2.1 + 0.25 * Math.sin(jawU * 3.0);
      px = 0.35 + jawR * Math.cos(angle) * 0.95 + (rng() - 0.5) * 0.12;
      py = -0.15 + jawR * Math.sin(angle) * 1.05 + (rng() - 0.5) * 0.12;
      pz = -0.45 + 0.55 * Math.cos(jawU * Math.PI) + (rng() - 0.5) * 0.1;

      nx = Math.cos(angle) * 0.8;
      ny = Math.sin(angle) * 0.8;
      nz = 0.4;
    }

    posStage1[idx] = px;
    posStage1[idx + 1] = py;
    posStage1[idx + 2] = pz;

    const nLen = Math.hypot(nx, ny, nz) || 1.0;
    normStage1[idx] = nx / nLen;
    normStage1[idx + 1] = ny / nLen;
    normStage1[idx + 2] = nz / nLen;

    // Color: Slate & Linen with amber accents on acoustic inlet
    let c = COLOR_LINEN;
    if (isEar && Math.abs(u - 3.14) < 0.6 && rng() < 0.35) {
      c = COLOR_AMBER;
    } else if (rng() < 0.55) {
      c = COLOR_SLATE;
    }
    col1[idx] = c.r;
    col1[idx + 1] = c.g;
    col1[idx + 2] = c.b;
  }

  // --- ACT 2: The Care Continuum Gap (Entropy & Fragmentation) ---
  // 3 Disconnected Orbital Vortices (7,500 + 7,500 + 7,500) + 13,500 Volumetric Drift Cloud
  const vortexCenters = [
    { x: -1.9, y: 0.95, z: -0.3, spin: 1.0 }, // Hospital consultation
    { x: 1.85, y: 1.1, z: 0.25, spin: -1.0 }, // Logopedia / Early intervention
    { x: 0.1, y: -1.65, z: 0.38, spin: 1.2 }, // Family home solitude
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const idx = i * 3;
    let px = 0;
    let py = 0;
    let pz = 0;
    let c = COLOR_CHAOS_SLATE;

    if (i < 22500) {
      // One of the 3 Vortices
      const vIdx = Math.floor(i / 7500);
      const center = vortexCenters[vIdx];
      const localI = i % 7500;
      const t = localI / 7500;
      const radius = 0.18 + 1.15 * Math.sqrt(rng());
      const angle = center.spin * (3.8 * Math.log(radius + 0.1) + t * Math.PI * 14.0 + rng() * 0.4);

      px = center.x + radius * Math.cos(angle);
      py = center.y + radius * Math.sin(angle);
      pz = center.z + 0.45 * (1.0 - radius) * Math.sin(3.0 * angle) + (rng() - 0.5) * 0.2;

      if (rng() < 0.6) {
        c = COLOR_CHAOS_DARK;
      } else if (rng() < 0.12) {
        c = COLOR_AMBER; // Warning spark: lost therapy window
      } else {
        c = COLOR_CHAOS_SLATE;
      }
    } else {
      // Volumetric Drift Cloud in the disconnect void
      px = (rng() - 0.5) * 6.2;
      py = (rng() - 0.5) * 4.4;
      pz = (rng() - 0.5) * 2.8;

      // Subtle clustering along boundaries
      if (rng() < 0.7) {
        c = COLOR_CHAOS_DARK;
      } else {
        c = COLOR_CHAOS_SLATE;
      }
    }

    posChaos[idx] = px;
    posChaos[idx + 1] = py;
    posChaos[idx + 2] = pz;

    col2[idx] = c.r;
    col2[idx + 1] = c.g;
    col2[idx + 2] = c.b;
  }

  // --- ACT 3: Caregiver-Led Continuity (Valeria+ & Lúa Companion) ---
  // Circular matrix disc (GC9A01 32.4mm / 240x240 display)
  // Ring: 6,000 | Disc lattice: 13,000 | Lúa tuxedo cat silhouette: 17,000
  const ringCount = 6000;
  const matrixCount = 13000;
  const luaCount = PARTICLE_COUNT - ringCount - matrixCount;

  // 1. Concentric Therapeutic Progress Ring (6,000)
  for (let i = 0; i < ringCount; i++) {
    const idx = i * 3;
    const angle = (i / ringCount) * Math.PI * 2;
    const r = 2.05 + 0.16 * rng();

    // 18 segment gaps representing clinical milestone badges
    const segment = (angle / (Math.PI * 2)) * 18;
    const isGap = (segment % 1.0) > 0.88;
    const radius = isGap ? r - 0.05 : r;

    posLua[idx] = radius * Math.cos(angle);
    posLua[idx + 1] = radius * Math.sin(angle);
    posLua[idx + 2] = 0.02 * Math.sin(angle * 9.0);

    // Bevel normal on ring
    normStage3[idx] = Math.cos(angle) * 0.4;
    normStage3[idx + 1] = Math.sin(angle) * 0.4;
    normStage3[idx + 2] = 0.82;

    col3[idx] = COLOR_TURQUOISE.r;
    col3[idx + 1] = COLOR_TURQUOISE.g;
    col3[idx + 2] = COLOR_TURQUOISE.b;
  }

  // 2. Circular Matrix Disc Screen (13,000)
  for (let i = 0; i < matrixCount; i++) {
    const globalIdx = ringCount + i;
    const idx = globalIdx * 3;

    // Uniform distribution on disc r <= 1.95
    const r = 1.95 * Math.sqrt(rng());
    const angle = rng() * Math.PI * 2;

    posLua[idx] = r * Math.cos(angle);
    posLua[idx + 1] = r * Math.sin(angle);
    posLua[idx + 2] = 0.015 * Math.cos(r * 4.0);

    normStage3[idx] = 0.0;
    normStage3[idx + 1] = 0.0;
    normStage3[idx + 2] = 1.0;

    col3[idx] = COLOR_OBSIDIAN.r;
    col3[idx + 1] = COLOR_OBSIDIAN.g;
    col3[idx + 2] = COLOR_OBSIDIAN.b;
  }

  // 3. Lúa Tuxedo Cat Silhouette & Features (17,000)
  for (let i = 0; i < luaCount; i++) {
    const globalIdx = ringCount + matrixCount + i;
    const idx = globalIdx * 3;

    let px = 0;
    let py = 0;
    let pz = 0.03;
    let c = COLOR_OBSIDIAN;

    if (i < 4000) {
      // Ears: Left & Right triangular pointed ears
      const isLeft = i < 2000;
      const earSign = isLeft ? -1 : 1;
      const u = rng();
      // Triangle base to tip
      const base1 = { x: earSign * 0.35, y: 0.85 };
      const base2 = { x: earSign * 0.95, y: 0.82 };
      const tip = { x: earSign * 0.72, y: 1.58 };

      // Barycentric coords
      const w0 = 1 - Math.sqrt(u);
      const w1 = rng() * (1 - w0);
      const w2 = 1 - w0 - w1;

      px = w0 * base1.x + w1 * base2.x + w2 * tip.x + (rng() - 0.5) * 0.03;
      py = w0 * base1.y + w1 * base2.y + w2 * tip.y + (rng() - 0.5) * 0.03;
      pz = 0.04;

      if (w2 > 0.4 && rng() < 0.35) {
        c = COLOR_LINEN; // Soft inner ear highlight
      } else {
        c = COLOR_OBSIDIAN;
      }
    } else if (i < 8000) {
      // Tuxedo White Muzzle & Chest Bib
      const u = rng();
      const v = rng();
      const spread = (0.55 - u * 0.25);
      px = (v - 0.5) * 2.0 * spread;
      py = -0.15 - u * 1.1;
      pz = 0.05;
      c = COLOR_WHITE;
    } else if (i < 9800) {
      // Almond Eyes with Turquoise Pupil Glints
      const isLeft = i < 8900;
      const eyeSign = isLeft ? -1 : 1;
      const eyeCenter = { x: eyeSign * 0.38, y: 0.24 };
      const eyeAngle = rng() * Math.PI * 2;
      const eyeR = 0.16 * Math.sqrt(rng());

      px = eyeCenter.x + eyeR * Math.cos(eyeAngle) * 1.25;
      py = eyeCenter.y + eyeR * Math.sin(eyeAngle) * 0.75;
      pz = 0.06;

      // Center is turquoise pupil glint
      if (eyeR < 0.08) {
        c = COLOR_TURQUOISE;
      } else {
        c = COLOR_WHITE;
      }
    } else if (i < 11200) {
      // Fine Whiskers (3 lines per cheek)
      const isLeft = i < 10500;
      const sign = isLeft ? -1 : 1;
      const lineIdx = (i % 3);
      const t = rng();
      const whiskerAngle = (lineIdx - 1) * 0.18 + (sign < 0 ? Math.PI : 0);
      const len = 0.45 + 0.65 * t;

      px = sign * 0.22 + len * Math.cos(whiskerAngle);
      py = -0.05 + len * Math.sin(whiskerAngle) + 0.04 * (t * t);
      pz = 0.05;
      c = COLOR_WHITE;
    } else {
      // Head silhouette contour & face filling
      const angle = rng() * Math.PI * 2;
      const r = 0.94 * Math.sqrt(rng());
      px = r * Math.cos(angle);
      py = -0.05 + r * Math.sin(angle) * 0.95;
      pz = 0.035;
      c = COLOR_OBSIDIAN;
    }

    posLua[idx] = px;
    posLua[idx + 1] = py;
    posLua[idx + 2] = pz;

    normStage3[idx] = 0.0;
    normStage3[idx + 1] = 0.0;
    normStage3[idx + 2] = 1.0;

    col3[idx] = c.r;
    col3[idx + 1] = c.g;
    col3[idx + 2] = c.b;
  }

  // --- ACT 4: The Closed-Loop Ecosystem (Longitudinal Continuum) ---
  // Double-helix closed loop (toroidal ribbon with bridge rungs)
  // Strand A: 14,000 | Strand B: 14,000 | Synchronized Wave Bridges: 8,000
  const strandACount = 14000;
  const strandBCount = 14000;
  const bridgeCount = PARTICLE_COUNT - strandACount - strandBCount;

  const torusR = 2.1;
  const tubeR = 0.52;
  const numTwists = 3.0;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const idx = i * 3;
    const colIdx = i * 4;

    let px = 0;
    let py = 0;
    let pz = 0;
    let c = COLOR_SLATE;
    let glint = 0.0;

    if (i < strandACount) {
      // Strand A: Clinical Evaluation -> Home Care
      const alpha = (i / strandACount) * Math.PI * 2;
      const twist = numTwists * alpha;
      const rJitter = (rng() - 0.5) * 0.14;
      const currentR = tubeR + rJitter;

      px = (torusR + currentR * Math.cos(twist)) * Math.cos(alpha);
      py = (torusR + currentR * Math.cos(twist)) * Math.sin(alpha);
      pz = currentR * Math.sin(twist);

      if (rng() < 0.4) {
        c = COLOR_TURQUOISE;
        glint = 0.8;
      } else if (rng() < 0.6) {
        c = COLOR_LINEN;
      } else {
        c = COLOR_SLATE;
      }
    } else if (i < strandACount + strandBCount) {
      // Strand B: Home Progress -> Clinical Consultation
      const localI = i - strandACount;
      const alpha = (localI / strandBCount) * Math.PI * 2;
      const twist = numTwists * alpha + Math.PI; // Opposite phase
      const rJitter = (rng() - 0.5) * 0.14;
      const currentR = tubeR + rJitter;

      px = (torusR + currentR * Math.cos(twist)) * Math.cos(alpha);
      py = (torusR + currentR * Math.cos(twist)) * Math.sin(alpha);
      pz = currentR * Math.sin(twist);

      if (rng() < 0.35) {
        c = COLOR_CHAMPAGNE;
        glint = 0.9;
      } else if (rng() < 0.65) {
        c = COLOR_TURQUOISE;
        glint = 0.6;
      } else {
        c = COLOR_SLATE;
      }
    } else {
      // Synchronized Cross-Bridge Rungs (Longitudinal Transfer)
      const localI = i - strandACount - strandBCount;
      const rungStep = Math.floor((localI / bridgeCount) * 36);
      const alpha = (rungStep / 36) * Math.PI * 2;
      const interp = rng(); // 0 on Strand A to 1 on Strand B

      const twistA = numTwists * alpha;
      const twistB = numTwists * alpha + Math.PI;

      const ptAx = (torusR + tubeR * Math.cos(twistA)) * Math.cos(alpha);
      const ptAy = (torusR + tubeR * Math.cos(twistA)) * Math.sin(alpha);
      const ptAz = tubeR * Math.sin(twistA);

      const ptBx = (torusR + tubeR * Math.cos(twistB)) * Math.cos(alpha);
      const ptBy = (torusR + tubeR * Math.cos(twistB)) * Math.sin(alpha);
      const ptBz = tubeR * Math.sin(twistB);

      px = ptAx + (ptBx - ptAx) * interp + (rng() - 0.5) * 0.08;
      py = ptAy + (ptBy - ptAy) * interp + (rng() - 0.5) * 0.08;
      pz = ptAz + (ptBz - ptAz) * interp + (rng() - 0.5) * 0.08;

      if (rng() < 0.5) {
        c = COLOR_TURQUOISE;
        glint = 1.0;
      } else {
        c = COLOR_CHAMPAGNE;
        glint = 0.7;
      }
    }

    posEco[idx] = px;
    posEco[idx + 1] = py;
    posEco[idx + 2] = pz;

    col4[colIdx] = c.r;
    col4[colIdx + 1] = c.g;
    col4[colIdx + 2] = c.b;
    col4[colIdx + 3] = glint;
  }

  // --- Particle Seed Attributes (Randomness, Primitives, Scale) ---
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const sIdx = i * 4;
    seed[sIdx] = rng();      // x: primitive selection (0..1)
    seed[sIdx + 1] = rng();  // y: random phase (0..1)
    seed[sIdx + 2] = rng();  // z: speed modulation (0..1)
    seed[sIdx + 3] = 0.75 + 0.65 * rng(); // w: scale (0.75..1.4)
  }

  // Set Buffer Attributes on Geometry
  geometry.setAttribute('position', new THREE.BufferAttribute(posStage1, 3));
  geometry.setAttribute('aPosChaos', new THREE.BufferAttribute(posChaos, 3));
  geometry.setAttribute('aPosLua', new THREE.BufferAttribute(posLua, 3));
  geometry.setAttribute('aPosEco', new THREE.BufferAttribute(posEco, 3));

  geometry.setAttribute('aNormStage1', new THREE.BufferAttribute(normStage1, 3));
  geometry.setAttribute('aNormStage3', new THREE.BufferAttribute(normStage3, 3));

  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));

  geometry.setAttribute('aColor1', new THREE.BufferAttribute(col1, 3));
  geometry.setAttribute('aColor2', new THREE.BufferAttribute(col2, 3));
  geometry.setAttribute('aColor3', new THREE.BufferAttribute(col3, 3));
  geometry.setAttribute('aColor4', new THREE.BufferAttribute(col4, 4));

  return geometry;
}
