import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { vertexShader, fragmentShader } from './shaders';
import { createClinicalPointCloudGeometry } from './geometry';

gsap.registerPlugin(ScrollTrigger);

export interface ScrollytellingInstance {
  destroy: () => void;
}

export function initEarlifyScrollytelling(): ScrollytellingInstance | null {
  const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement | null;
  const container = document.getElementById('earlify-scrolly-container');

  if (!canvas || !container) {
    return null;
  }

  // --- Lenis Kinetic Smooth Scroll Setup ---
  const lenis = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  lenis.on('scroll', ScrollTrigger.update);

  const tickerCallback = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  // --- Three.js Engine Setup ---
  const scene = new THREE.Scene();

  const isMobile = window.innerWidth <= 768;
  const initialCamY = isMobile ? -0.65 : 0.0;
  const initialCamZ = isMobile ? 6.2 : 4.8;

  const camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.set(0, initialCamY, initialCamZ);
  camera.lookAt(0, initialCamY, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 36,000 Particles BufferGeometry
  const geometry = createClinicalPointCloudGeometry();

  // Shader Uniforms
  const uniforms = {
    uProgress: { value: 0.0 },
    uTime: { value: 0.0 },
    uHoverPos: { value: new THREE.Vector3(999, 999, 999) },
    uHoverIntensity: { value: 0.0 },
    uParticleScale: { value: isMobile ? 0.82 : 1.05 },
    uRepelRects: {
      value: [
        new THREE.Vector4(0, 0, 0, 0),
        new THREE.Vector4(0, 0, 0, 0),
        new THREE.Vector4(0, 0, 0, 0),
        new THREE.Vector4(0, 0, 0, 0),
      ],
    },
    uRepelCount: { value: 0 },
  };

  const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const particleMesh = new THREE.Points(geometry, shaderMaterial);
  scene.add(particleMesh);

  // Subtle wireframe reference structures in background for Act 2 (Continuum Void)
  const wireframesGroup = new THREE.Group();
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x5c646b,
    wireframe: true,
    transparent: true,
    opacity: 0.0,
  });

  // 14 subtle polyhedral boundary nodes positioned on the right and center (Act 2)
  const boundaryMeshes: THREE.Mesh[] = [];
  const geomTetra = new THREE.TetrahedronGeometry(0.32);
  const geomOcta = new THREE.OctahedronGeometry(0.35);

  const siloPositions = [
    [0.8, 1.3, -0.5],
    [1.4, 0.6, -0.3],
    [0.5, 0.3, 0.2],
    [1.1, 1.6, 0.1],
    [2.1, 1.2, 0.1],
    [1.6, -0.2, -0.2],
    [2.3, 0.4, 0.3],
    [1.8, 1.5, -0.2],
    [0.9, -1.5, 0.4],
    [0.4, -1.2, 0.1],
    [1.3, -1.0, -0.3],
    [0.7, -1.8, 0.2],
    [1.9, -0.8, 0.5],
    [1.2, -0.4, 0.4],
  ];

  siloPositions.forEach(([x, y, z], i) => {
    const mesh = new THREE.Mesh(
      i % 2 === 0 ? geomTetra : geomOcta,
      wireframeMaterial.clone()
    );
    mesh.position.set(x, y, z);
    boundaryMeshes.push(mesh);
    wireframesGroup.add(mesh);
  });
  scene.add(wireframesGroup);

  // --- Interaction: Raycasting & "Goosebumps" Surface Normal Lift ---
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2(-999, -999);
  const targetHoverPos = new THREE.Vector3(999, 999, 999);
  const currentHoverPos = new THREE.Vector3(999, 999, 999);
  const virtualPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let targetHoverIntensity = 0.0;
  let currentHoverIntensity = 0.0;

  const onPointerMove = (e: MouseEvent | TouchEvent) => {
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    pointerNDC.x = (clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(virtualPlane, intersectPoint)) {
      targetHoverPos.copy(intersectPoint);
      targetHoverIntensity = 1.0;
    }
  };

  const onPointerLeave = () => {
    targetHoverIntensity = 0.0;
  };

  window.addEventListener('mousemove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('mouseleave', onPointerLeave);
  window.addEventListener('touchend', onPointerLeave, { passive: true });
  window.addEventListener('touchcancel', onPointerLeave, { passive: true });

  // --- View-Space Typography Repulsion Tracker ---
  const textPanels = Array.from(
    container.querySelectorAll<HTMLElement>('.act-panel-content')
  );
  const panels = [
    document.getElementById('act-panel-1'),
    document.getElementById('act-panel-2'),
    document.getElementById('act-panel-3'),
    document.getElementById('act-panel-4'),
  ];
  const telemetryBar = document.querySelector<HTMLElement>('.clinical-telemetry-bar');

  function updateTypographyRepulsion() {
    const activeRects: THREE.Vector4[] = [];

    // 1. Only query currently active/visible text cards (opacity > 0.05)
    textPanels.forEach((panel, idx) => {
      const parentPanel = panels[idx];
      const opacity = parentPanel ? parseFloat(parentPanel.style.opacity || '0') : 0;
      if (opacity > 0.05) {
        const rect = panel.getBoundingClientRect();
        if (
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth
        ) {
          const minX = (rect.left / window.innerWidth) * 2 - 1;
          const maxX = (rect.right / window.innerWidth) * 2 - 1;
          const minY = -((rect.bottom / window.innerHeight) * 2 - 1);
          const maxY = -((rect.top / window.innerHeight) * 2 - 1);
          activeRects.push(new THREE.Vector4(minX, minY, maxX, maxY));
        }
      }
    });

    // 2. Protect top clinical telemetry bar if room permits
    if (telemetryBar && activeRects.length < 4) {
      const rect = telemetryBar.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const minX = (rect.left / window.innerWidth) * 2 - 1;
        const maxX = (rect.right / window.innerWidth) * 2 - 1;
        const minY = -((rect.bottom / window.innerHeight) * 2 - 1);
        const maxY = -((rect.top / window.innerHeight) * 2 - 1);
        activeRects.push(new THREE.Vector4(minX, minY, maxX, maxY));
      }
    }

    uniforms.uRepelCount.value = Math.min(activeRects.length, 4);
    for (let i = 0; i < 4; i++) {
      if (i < activeRects.length) {
        uniforms.uRepelRects.value[i].copy(activeRects[i]);
      } else {
        uniforms.uRepelRects.value[i].set(0, 0, 0, 0);
      }
    }
  }

  // --- Scrollytracker Rail References ---
  const trackerSegments = [
    document.getElementById('track-act-1'),
    document.getElementById('track-act-2'),
    document.getElementById('track-act-3'),
    document.getElementById('track-act-4'),
  ];

  const trackerFills = [
    document.getElementById('fill-act-1'),
    document.getElementById('fill-act-2'),
    document.getElementById('fill-act-3'),
    document.getElementById('fill-act-4'),
  ];

  const scrollStarter = document.getElementById('scrolly-starter');

  // GSAP ScrollTrigger Pinning Timeline
  const st = ScrollTrigger.create({
    trigger: container,
    start: 'top top',
    end: '+=400%',
    pin: true,
    scrub: 0.8,
    onLeave: () => {
      canvas.style.transition = 'opacity 0.4s ease';
      canvas.style.opacity = '0';
    },
    onEnterBack: () => {
      canvas.style.transition = 'opacity 0.4s ease';
      canvas.style.opacity = '1';
    },
    onUpdate: (self) => {
      // Progress drives normalized 0.0 -> 4.0 spanning all 4 Clinical Acts
      const prog = self.progress * 4.0;
      uniforms.uProgress.value = prog;

      // Update Scrollytracker Rail segments & continuous fills
      trackerSegments.forEach((seg, idx) => {
        if (!seg) return;
        const segStart = idx;
        const segEnd = idx + 1;
        if (prog >= segStart && prog <= segEnd) {
          seg.classList.add('active');
          if (trackerFills[idx]) {
            const frac = (prog - segStart) / (segEnd - segStart);
            trackerFills[idx]!.style.width = `${Math.min(100, Math.max(0, frac * 100))}%`;
          }
        } else if (prog > segEnd) {
          seg.classList.add('active');
          if (trackerFills[idx]) {
            trackerFills[idx]!.style.width = '100%';
          }
        } else {
          seg.classList.remove('active');
          if (trackerFills[idx]) {
            trackerFills[idx]!.style.width = '0%';
          }
        }
      });

      // Panel cross-fades matching calibrated dwell and transition zones:
      // Act 1: Dwell [0.00, 0.65], fade out [0.65, 0.90]
      // Act 2: Fade in [0.85, 1.10], dwell [1.10, 1.65], fade out [1.65, 1.90]
      // Act 3: Fade in [1.85, 2.10], dwell [2.10, 2.65], fade out [2.65, 2.90]
      // Act 4: Fade in [2.85, 3.10], dwell [3.10, 4.00]
      const op1 = calcPanelOpacity(prog, 0.0, 0.0, 0.65, 0.90);
      const op2 = calcPanelOpacity(prog, 0.85, 1.10, 1.65, 1.90);
      const op3 = calcPanelOpacity(prog, 1.85, 2.10, 2.65, 2.90);
      const op4 = calcPanelOpacity(prog, 2.85, 3.10, 4.00, 4.00);

      if (panels[0]) panels[0].style.opacity = op1.toString();
      if (panels[1]) panels[1].style.opacity = op2.toString();
      if (panels[2]) panels[2].style.opacity = op3.toString();
      if (panels[3]) panels[3].style.opacity = op4.toString();

      // Scroll starter prompt fade-out
      if (scrollStarter) {
        scrollStarter.style.opacity = Math.max(0, 1 - prog * 3.5).toString();
      }

      // Wireframes visibility in Act 2 (Entropy & Void: [0.80, 1.90])
      const wireframeOpacity = Math.max(
        0,
        Math.min(0.24, (prog - 0.75) * 0.45) * (1.0 - Math.max(0, (prog - 1.75) * 1.8))
      );
      boundaryMeshes.forEach((mesh) => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = wireframeOpacity;
      });

      updateTypographyRepulsion();
    },
  });

  function calcPanelOpacity(
    p: number,
    inStart: number,
    inEnd: number,
    outStart: number,
    outEnd: number
  ): number {
    if (p < inStart) return 0;
    if (p < inEnd) {
      return inStart === inEnd ? 1 : (p - inStart) / (inEnd - inStart);
    }
    if (p <= outStart) return 1;
    if (p < outEnd) {
      return 1 - (p - outStart) / (outEnd - outStart);
    }
    return 0;
  }

  // --- Resize Handler ---
  const onResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width <= 768;

    camera.aspect = width / height;
    const camY = mobile ? -0.65 : 0.0;
    camera.position.set(0, camY, mobile ? 6.2 : 4.8);
    camera.lookAt(0, camY, 0);
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    uniforms.uParticleScale.value = mobile ? 0.82 : 1.05;
    updateTypographyRepulsion();
  };

  window.addEventListener('resize', onResize, { passive: true });
  updateTypographyRepulsion();

  // --- Intersection Observer for 0 Battery Drain when Out of View ---
  let isIntersecting = true;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const wasIntersecting = isIntersecting;
        isIntersecting = entry.isIntersecting;
        if (isIntersecting && !wasIntersecting) {
          lastTime = performance.now();
          renderLoop();
        }
      });
    },
    { threshold: 0.01 }
  );
  observer.observe(container);

  // --- WebGL Context Loss Recovery ---
  const onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(animationFrameId);
  };
  const onContextRestored = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    lastTime = performance.now();
    renderLoop();
  };
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  // --- Render Loop (performance.now() for zero WebGL warnings) ---
  let animationFrameId: number;
  let lastTime = performance.now();

  const renderLoop = () => {
    if (!isIntersecting) {
      return;
    }
    animationFrameId = requestAnimationFrame(renderLoop);

    const now = performance.now();
    const delta = (now - lastTime) * 0.001;
    lastTime = now;

    uniforms.uTime.value += delta;

    // Smooth lerp for hover lift ("Goosebumps" effect) - stable camera, no toy tilts
    currentHoverPos.lerp(targetHoverPos, 0.12);
    currentHoverIntensity += (targetHoverIntensity - currentHoverIntensity) * 0.1;
    uniforms.uHoverPos.value.copy(currentHoverPos);
    uniforms.uHoverIntensity.value = currentHoverIntensity;

    // Subtle rotation of wireframe boundaries in Act 2
    if (wireframesGroup.visible) {
      wireframesGroup.rotation.y += delta * 0.06;
      wireframesGroup.rotation.x += delta * 0.03;
    }

    renderer.render(scene, camera);
  };

  renderLoop();

  // --- Cleanup / Destroy Method ---
  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('touchend', onPointerLeave);
      window.removeEventListener('touchcancel', onPointerLeave);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      gsap.ticker.remove(tickerCallback);
      st.kill();
      lenis.destroy();

      geometry.dispose();
      shaderMaterial.dispose();
      geomTetra.dispose();
      geomOcta.dispose();
      wireframeMaterial.dispose();
      boundaryMeshes.forEach((mesh) => {
        (mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
    },
  };
}
