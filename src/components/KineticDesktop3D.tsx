import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface KineticDesktop3DProps {
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  scrollProgress?: number; // 0 (room overview) -> 1 (zoomed into center monitor screen)
  onDiveComplete?: () => void;
}

// Module-level reusable math objects for zero garbage collection
const _camStartPos = new THREE.Vector3(2.4, 1.7, 2.2);
const _camStartLook = new THREE.Vector3(0, 1.1, -0.15);
const _camScreenPos = new THREE.Vector3(0.0, 1.35, -0.10);
const _camScreenLook = new THREE.Vector3(0.0, 1.35, -0.44);
const _currentTargetPos = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();

// Smooth cubic easing helper
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export const KineticDesktop3D: React.FC<KineticDesktop3DProps> = ({
  className = '',
  isFullscreen = false,
  onToggleFullscreen,
  scrollProgress = 0,
  onDiveComplete
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References for render loop coordination
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // References to animated elements
  const mainScreenTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const vertScreenTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const sideScreenTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const pcFansRef = useRef<THREE.Mesh[]>([]);
  const steamParticlesRef = useRef<THREE.Points | null>(null);

  const scrollProgressRef = useRef(scrollProgress);
  scrollProgressRef.current = scrollProgress;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect Software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Setup Scene & Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0e1112);
    scene.fog = new THREE.FogExp2(0x0e1112, 0.075);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.copy(_camStartPos);
    cameraRef.current = camera;

    // 3. Renderer with Physical Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Room Environment for PBR Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. OrbitControls - Room exploration with left-click orbit & right-click pan
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    // Enable zoom only in fullscreen 3D mode; in page flow, wheel smoothly scrolls page/dives into screen
    controls.enableZoom = isFullscreen;
    controls.minDistance = 0.45; // Can zoom in super close in fullscreen
    controls.maxDistance = 4.2; // Keeps camera within room bounds
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Cannot look from beneath floor
    controls.target.copy(_camStartLook);
    controlsRef.current = controls;

    // 6. Atmospheric Stylized Studio Lighting (Warm, soft, no radioactive yellow glare)
    const hemiLight = new THREE.HemisphereLight(0x7890a8, 0x1e2228, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ea, 1.4);
    keyLight.position.set(2.8, 4.2, 2.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Gentle warm fill for desk workspace
    const deskFill = new THREE.PointLight(0xffecd1, 0.75, 4.0);
    deskFill.position.set(-0.8, 1.8, 0.4);
    scene.add(deskFill);

    // Subtle cool rear monitor back-halo
    const accentLight = new THREE.PointLight(0x38bdf8, 0.45, 2.5);
    accentLight.position.set(0, 1.35, -0.52);
    scene.add(accentLight);

    // Gentle PC internal glow
    const pcGlow = new THREE.PointLight(0x38bdf8, 0.5, 1.8);
    pcGlow.position.set(1.55, 1.15, -0.05);
    scene.add(pcGlow);

    // Screen lightbar soft warm downlight
    const lightBarSpot = new THREE.SpotLight(0xfff7e6, 1.8, 2.4, Math.PI / 4, 0.5, 1.2);
    lightBarSpot.position.set(0, 1.70, -0.38);
    lightBarSpot.target.position.set(0, 0.88, 0.05);
    scene.add(lightBarSpot);
    scene.add(lightBarSpot.target);

    // ==========================================
    // 7. BUILD RICH, COZY CODER SANCTUARY ROOM
    // (Architectural walls, acoustic slats, Nanoleaf panels, server rack, espresso bar, plants, hardware lab)
    // ==========================================
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // --- A. ROOM FLOOR & PLUSH GEOMETRIC RUG ---
    const floorGeo = new THREE.PlaneGeometry(9.0, 8.5, 32, 32);
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    fctx.fillStyle = '#111314';
    fctx.fillRect(0, 0, 512, 512);

    // Studio tech-tile grid
    fctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    fctx.lineWidth = 2;
    for (let y = 0; y <= 512; y += 48) {
      fctx.beginPath(); fctx.moveTo(0, y); fctx.lineTo(512, y); fctx.stroke();
    }
    for (let x = 0; x <= 512; x += 64) {
      fctx.beginPath(); fctx.moveTo(x, 0); fctx.lineTo(x, 512); fctx.stroke();
    }

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);
    floorTexture.colorSpace = THREE.SRGBColorSpace;

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.65, metalness: 0.2 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0.2);
    floorMesh.receiveShadow = !isSoftwareGl;
    rootGroup.add(floorMesh);

    // Geometric Coder Rug
    const rugGeo = new THREE.PlaneGeometry(3.4, 2.6);
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 512;
    rugCanvas.height = 512;
    const rctx = rugCanvas.getContext('2d')!;
    rctx.fillStyle = '#151819';
    rctx.fillRect(0, 0, 512, 512);
    rctx.strokeStyle = 'rgba(223, 255, 0, 0.35)';
    rctx.lineWidth = 3;
    rctx.strokeRect(18, 18, 476, 476);
    rctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    rctx.lineWidth = 1.5;
    for (let i = 36; i < 480; i += 32) {
      rctx.beginPath(); rctx.moveTo(i, 18); rctx.lineTo(i, 494); rctx.stroke();
      rctx.beginPath(); rctx.moveTo(18, i); rctx.lineTo(494, i); rctx.stroke();
    }
    const rugTexture = new THREE.CanvasTexture(rugCanvas);
    rugTexture.colorSpace = THREE.SRGBColorSpace;
    const rugMesh = new THREE.Mesh(rugGeo, new THREE.MeshStandardMaterial({ map: rugTexture, roughness: 0.9 }));
    rugMesh.rotation.x = -Math.PI / 2;
    rugMesh.position.set(0, 0.004, 0.25);
    rugMesh.receiveShadow = !isSoftwareGl;
    rootGroup.add(rugMesh);

    // --- B. DEEP 3D CELESTIAL COSMOS OUTSIDE PANORAMIC OBSERVATION WINDOW ---
    // User requested: "In 3D Make Chair and Space outside window more realistic"
    // Features:
    // 1. Deep cosmic curved celestial panorama with layered multi-spectral nebulae and dust lanes (z ~ -20)
    // 2. Volumetric 3D multi-spectral starfield point cloud (1,200+ stars distributed at z ~ -6.5 to -28)
    // 3. True 3D Gas Giant Planet with realistic atmospheric bands, great storm vortex, and Rayleigh limb glow (at z = -14.5)
    // 4. 3D Inclined multi-band planetary ring system with Cassini division and icy dust striations
    // 5. Distant orbital relay habitat station with solar arrays, communication dish, and flashing collision beacons (at z = -8.5)

    // 1. High-Resolution Deep Cosmic Sky Panorama
    const spaceCanvas = document.createElement('canvas');
    spaceCanvas.width = 2048;
    spaceCanvas.height = 1024;
    const spCtx = spaceCanvas.getContext('2d')!;

    // Cosmic void base
    const bgGrad = spCtx.createLinearGradient(0, 0, 2048, 1024);
    bgGrad.addColorStop(0, '#020308');
    bgGrad.addColorStop(0.3, '#040714');
    bgGrad.addColorStop(0.65, '#020510');
    bgGrad.addColorStop(1, '#010207');
    spCtx.fillStyle = bgGrad;
    spCtx.fillRect(0, 0, 2048, 1024);

    // Multi-Layer Billowing Nebulae across panoramic viewport
    // Left Zone (Framed in left window pane): Glowing Magenta/Violet Carina emission complex
    const nebMagenta = spCtx.createRadialGradient(420, 400, 30, 420, 400, 460);
    nebMagenta.addColorStop(0, 'rgba(217, 70, 239, 0.46)');
    nebMagenta.addColorStop(0.35, 'rgba(147, 51, 234, 0.28)');
    nebMagenta.addColorStop(0.7, 'rgba(76, 29, 149, 0.12)');
    nebMagenta.addColorStop(1, 'rgba(0, 0, 0, 0)');
    spCtx.fillStyle = nebMagenta;
    spCtx.fillRect(0, 0, 2048, 1024);

    // Distant Spiral Galaxy (Andromeda-style inclined disk in left window sky)
    spCtx.save();
    spCtx.translate(340, 250);
    spCtx.rotate(-0.35);
    // Outer galaxy spiral halo
    const galOuter = spCtx.createRadialGradient(0, 0, 10, 0, 0, 110);
    galOuter.addColorStop(0, 'rgba(224, 242, 254, 0.75)');
    galOuter.addColorStop(0.35, 'rgba(56, 189, 248, 0.35)');
    galOuter.addColorStop(0.7, 'rgba(99, 102, 241, 0.15)');
    galOuter.addColorStop(1, 'rgba(0, 0, 0, 0)');
    spCtx.fillStyle = galOuter;
    spCtx.beginPath();
    spCtx.ellipse(0, 0, 110, 34, 0, 0, Math.PI * 2);
    spCtx.fill();
    // Bright galactic nucleus core
    const galCore = spCtx.createRadialGradient(0, 0, 2, 0, 0, 22);
    galCore.addColorStop(0, '#ffffff');
    galCore.addColorStop(0.4, 'rgba(254, 240, 138, 0.85)');
    galCore.addColorStop(1, 'rgba(234, 179, 8, 0)');
    spCtx.fillStyle = galCore;
    spCtx.beginPath();
    spCtx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
    spCtx.fill();
    spCtx.restore();

    // Center-Right Zone: Luminous Cyan & Turquoise Ionization Cloud
    const nebCyan = spCtx.createRadialGradient(1350, 360, 40, 1350, 360, 520);
    nebCyan.addColorStop(0, 'rgba(6, 182, 212, 0.44)');
    nebCyan.addColorStop(0.4, 'rgba(14, 116, 144, 0.26)');
    nebCyan.addColorStop(0.75, 'rgba(8, 47, 73, 0.10)');
    nebCyan.addColorStop(1, 'rgba(0, 0, 0, 0)');
    spCtx.fillStyle = nebCyan;
    spCtx.fillRect(0, 0, 2048, 1024);

    // Warm Gold Stellar Nursery Filaments & Ionized Gas
    const nebGold = spCtx.createRadialGradient(1020, 480, 20, 1020, 480, 380);
    nebGold.addColorStop(0, 'rgba(234, 179, 8, 0.30)');
    nebGold.addColorStop(0.45, 'rgba(223, 255, 0, 0.14)');
    nebGold.addColorStop(0.8, 'rgba(161, 98, 7, 0.04)');
    nebGold.addColorStop(1, 'rgba(0, 0, 0, 0)');
    spCtx.fillStyle = nebGold;
    spCtx.fillRect(0, 0, 2048, 1024);

    // Interstellar Dark Dust Absorption Lanes (Eagle Nebula "Pillars")
    spCtx.strokeStyle = 'rgba(2, 4, 8, 0.62)';
    spCtx.lineWidth = 26;
    spCtx.filter = 'blur(10px)';
    spCtx.beginPath();
    spCtx.moveTo(280, 460);
    spCtx.bezierCurveTo(550, 380, 750, 450, 1100, 360);
    spCtx.stroke();
    spCtx.beginPath();
    spCtx.moveTo(700, 560);
    spCtx.bezierCurveTo(950, 460, 1280, 420, 1680, 310);
    spCtx.stroke();
    spCtx.filter = 'none';

    // Dense Field of 850 Distant Micro-Stars baked into backdrop
    for (let s = 0; s < 850; s++) {
      const sx = (Math.sin(s * 1537.7) * 0.5 + 0.5) * 2048;
      const sy = (Math.cos(s * 821.3) * 0.5 + 0.5) * 1024;
      const sr = (s % 13 === 0) ? 2.4 : (s % 4 === 0 ? 1.5 : 0.8);
      const alpha = 0.35 + (s % 7) * 0.10;
      spCtx.fillStyle = (s % 9 === 0) ? `rgba(223, 255, 0, ${alpha})` :
                        (s % 5 === 0) ? `rgba(147, 197, 253, ${alpha})` :
                        (s % 7 === 0) ? `rgba(244, 114, 182, ${alpha})` :
                        `rgba(255, 255, 255, ${alpha})`;
      spCtx.beginPath();
      spCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      spCtx.fill();

      // Optical diffraction spikes on bright primary stars
      if (s % 27 === 0) {
        spCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
        spCtx.lineWidth = 1;
        spCtx.beginPath();
        spCtx.moveTo(sx - 10, sy); spCtx.lineTo(sx + 10, sy);
        spCtx.moveTo(sx, sy - 10); spCtx.lineTo(sx, sy + 10);
        spCtx.stroke();
      }
    }

    const spaceTexture = new THREE.CanvasTexture(spaceCanvas);
    spaceTexture.colorSpace = THREE.SRGBColorSpace;

    // Curved panoramic celestial backdrop (parabolic curved wrap)
    const cosmicGeo = new THREE.PlaneGeometry(42, 24, 32, 1);
    const cPos = cosmicGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      cPos.setZ(i, -(x * x) * 0.014);
    }
    cosmicGeo.computeVertexNormals();

    const spaceMesh = new THREE.Mesh(
      cosmicGeo,
      new THREE.MeshBasicMaterial({ map: spaceTexture, side: THREE.DoubleSide, fog: false })
    );
    spaceMesh.position.set(0, 3.2, -20.0);
    rootGroup.add(spaceMesh);

    // 2. Volumetric 3D Multi-Magnitude Starfield (True 3D Points Cloud)
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 44;
      starPositions[i * 3 + 1] = -4 + Math.random() * 20;
      starPositions[i * 3 + 2] = -6.5 - Math.random() * 20;

      const starType = i % 10;
      if (starType <= 2) {
        starColors[i * 3] = 0.72; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 1.0;
      } else if (starType <= 5) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      } else if (starType <= 7) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.94; starColors[i * 3 + 2] = 0.70;
      } else if (starType <= 8) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.68; starColors[i * 3 + 2] = 0.45;
      } else {
        starColors[i * 3] = 0.87; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 0.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starField = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        fog: false
      })
    );
    rootGroup.add(starField);

    // 3. True 3D Gas Giant Planet with Fluid Dynamic Atmospheric Bands & Storms
    const planetGroup = new THREE.Group();
    // Positioned in upper center-right window opening
    planetGroup.position.set(0.85, 2.42, -8.4);
    rootGroup.add(planetGroup);

    // High-Resolution Atmospheric Canvas Texture (1024x512)
    const planetCanvas = document.createElement('canvas');
    planetCanvas.width = 1024;
    planetCanvas.height = 512;
    const plCtx = planetCanvas.getContext('2d')!;

    // Zonal jet streams and turbulent Jovian/Neptunian cloud decks
    const bandColors = [
      '#051527', '#0a2340', '#0284c7', '#38bdf8', '#0284c7',
      '#071a33', '#1e3a8a', '#60a5fa', '#0c4a6e', '#38bdf8',
      '#0f2b48', '#0369a1', '#7dd3fc', '#0b2038', '#03172c'
    ];
    for (let b = 0; b < bandColors.length; b++) {
      const y = (b / bandColors.length) * 512;
      const h = 512 / bandColors.length + 3;
      plCtx.fillStyle = bandColors[b];
      plCtx.beginPath();
      plCtx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) {
        const wave = Math.sin(x * 0.024 + b * 1.8) * 5.0 + Math.cos(x * 0.05 + b) * 2.5;
        plCtx.lineTo(x, y + wave);
      }
      plCtx.lineTo(1024, y + h);
      plCtx.lineTo(0, y + h);
      plCtx.closePath();
      plCtx.fill();
    }

    // Atmospheric swirling eddy plumes & storm filaments
    for (let c = 0; c < 45; c++) {
      const cy = Math.random() * 512;
      const cx = Math.random() * 1024;
      const cw = 110 + Math.random() * 240;
      const ch = 4 + Math.random() * 12;
      plCtx.fillStyle = (c % 3 === 0) ? 'rgba(224, 242, 254, 0.28)' :
                        (c % 2 === 0) ? 'rgba(14, 165, 233, 0.25)' :
                        'rgba(3, 105, 161, 0.32)';
      plCtx.beginPath();
      plCtx.ellipse(cx, cy, cw / 2, ch / 2, Math.sin(cx * 0.01) * 0.1, 0, Math.PI * 2);
      plCtx.fill();
    }

    // Great Cyclonic Vortex Storm with spiral eyewall
    const stormX = 430, stormY = 295;
    const stormGrad = plCtx.createRadialGradient(stormX, stormY, 4, stormX, stormY, 46);
    stormGrad.addColorStop(0, '#f8fafc');
    stormGrad.addColorStop(0.28, '#7dd3fc');
    stormGrad.addColorStop(0.65, '#0284c7');
    stormGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    plCtx.fillStyle = stormGrad;
    plCtx.beginPath();
    plCtx.ellipse(stormX, stormY, 46, 24, -0.12, 0, Math.PI * 2);
    plCtx.fill();

    // Planet Day/Night Terminator Shading (Directional Solar Lighting)
    const termGrad = plCtx.createLinearGradient(0, 0, 1024, 0);
    termGrad.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
    termGrad.addColorStop(0.52, 'rgba(0, 0, 0, 0)');
    termGrad.addColorStop(0.82, 'rgba(0, 0, 0, 0.68)');
    termGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
    plCtx.fillStyle = termGrad;
    plCtx.fillRect(0, 0, 1024, 512);

    // Planetary Ring Shadow across upper cloud deck
    const shadowGrad = plCtx.createLinearGradient(0, 140, 0, 210);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(0.35, 'rgba(0, 4, 12, 0.70)');
    shadowGrad.addColorStop(0.85, 'rgba(0, 4, 12, 0.70)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    plCtx.fillStyle = shadowGrad;
    plCtx.fillRect(0, 140, 1024, 70);

    const planetTexture = new THREE.CanvasTexture(planetCanvas);
    planetTexture.colorSpace = THREE.SRGBColorSpace;

    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.15, 64, 64),
      new THREE.MeshBasicMaterial({ map: planetTexture, fog: false })
    );
    planetMesh.rotation.y = -0.55;
    planetGroup.add(planetMesh);

    // Rayleigh Scattering Ethereal Atmospheric Limb Glow Shell
    const atmoGlow = new THREE.Mesh(
      new THREE.SphereGeometry(2.26, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.44,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        fog: false
      })
    );
    planetGroup.add(atmoGlow);

    // 4. Authentic Concentric Multi-Band Planetary Rings (512x512 Radial Canvas)
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 512;
    ringCanvas.height = 512;
    const rCtx = ringCanvas.getContext('2d')!;
    const cxR = 256, cyR = 256;

    // Inner radius = 2.6 / 4.8 * 256 = 138.6px
    // Outer radius = 256px
    // Radial Gradient representing A, B, C Rings and Cassini Division
    const rGrad = rCtx.createRadialGradient(cxR, cyR, 138, cxR, cyR, 256);
    rGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rGrad.addColorStop(0.04, 'rgba(56, 189, 248, 0.35)'); // Inner Crepe Ring C
    rGrad.addColorStop(0.18, 'rgba(147, 197, 253, 0.78)'); // Dense B-Ring Start
    rGrad.addColorStop(0.38, 'rgba(224, 242, 254, 0.90)'); // Bright B-Ring Core
    rGrad.addColorStop(0.52, 'rgba(186, 230, 253, 0.82)');
    // Cassini Division Gap (Sharp dark gap)
    rGrad.addColorStop(0.56, 'rgba(1, 2, 6, 0.06)');
    rGrad.addColorStop(0.62, 'rgba(1, 2, 6, 0.06)');
    // Outer A-Ring
    rGrad.addColorStop(0.66, 'rgba(125, 211, 252, 0.72)');
    rGrad.addColorStop(0.82, 'rgba(186, 230, 253, 0.65)');
    rGrad.addColorStop(0.85, 'rgba(1, 2, 6, 0.15)'); // Encke Division slit
    rGrad.addColorStop(0.88, 'rgba(125, 211, 252, 0.60)');
    rGrad.addColorStop(0.96, 'rgba(56, 189, 248, 0.35)'); // F-Ring edge
    rGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    rCtx.fillStyle = rGrad;
    rCtx.beginPath();
    rCtx.arc(cxR, cyR, 256, 0, Math.PI * 2);
    rCtx.fill();

    // Concentric hairline micro-ringlet striations for high-fidelity realism
    for (let ri = 0; ri < 30; ri++) {
      const radius = 142 + ri * 3.6;
      if (radius >= 198 && radius <= 208) continue; // Skip Cassini gap
      rCtx.strokeStyle = (ri % 2 === 0) ? 'rgba(255, 255, 255, 0.14)' : 'rgba(10, 30, 60, 0.18)';
      rCtx.lineWidth = 1;
      rCtx.beginPath();
      rCtx.arc(cxR, cyR, radius, 0, Math.PI * 2);
      rCtx.stroke();
    }

    const ringTexture = new THREE.CanvasTexture(ringCanvas);
    ringTexture.colorSpace = THREE.SRGBColorSpace;

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 4.8, 128),
      new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        fog: false
      })
    );
    ringMesh.rotation.x = Math.PI / 2 + 0.34;
    ringMesh.rotation.y = -0.24;
    planetGroup.add(ringMesh);

    // 5. Distant Orbital Relay Station / Deep Space Habitat (In Left Window Pane)
    const stationGroup = new THREE.Group();
    stationGroup.position.set(-1.75, 2.45, -5.8);
    rootGroup.add(stationGroup);

    const stationMat = new THREE.MeshStandardMaterial({ color: 0xc4d1db, roughness: 0.3, metalness: 0.85 });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2, metalness: 0.9 });
    const beaconRedMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, fog: false });
    const beaconCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, fog: false });

    // Pressurized titanium central hull cylinder
    const stCore = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 16), stationMat);
    stationGroup.add(stCore);

    // Centrifugal habitat ring torus
    const stRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 12, 24), stationMat);
    stRing.rotation.x = Math.PI / 2;
    stationGroup.add(stRing);

    // Solar array cross truss
    const stTruss = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.02), stationMat);
    stationGroup.add(stTruss);

    // Twin High-Efficiency Photovoltaic Solar Panels
    const solarL = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.010, 0.26), solarMat);
    solarL.position.set(-0.52, 0, 0);
    stationGroup.add(solarL);

    const solarR = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.010, 0.26), solarMat);
    solarR.position.set(0.52, 0, 0);
    stationGroup.add(solarR);

    // Parabolic Deep Space Communications Dish
    const stDish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.07, 16, 1, true), stationMat);
    stDish.position.set(0, 0.38, 0.05);
    stDish.rotation.x = 0.5;
    stDish.rotation.y = 0.8;
    stationGroup.add(stDish);

    // Port & Starboard Blinking Navigational Collision Strobe Beacons
    const beaconL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), beaconRedMat);
    beaconL.position.set(-0.80, 0, 0);
    stationGroup.add(beaconL);

    const beaconR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), beaconCyanMat);
    beaconR.position.set(0.80, 0, 0);
    stationGroup.add(beaconR);

    // 2. Front Architectural Window Enclosure & Mullions
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x161819, roughness: 0.85, metalness: 0.1 });
    const frameMatWall = new THREE.MeshStandardMaterial({ color: 0x101213, roughness: 0.4, metalness: 0.85 });

    // Left and Right Wall Flanks flanking the central window
    const wallFlankL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.2, 0.1), wallMat);
    wallFlankL.position.set(-3.6, 2.1, -3.2);
    rootGroup.add(wallFlankL);

    const wallFlankR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.2, 0.1), wallMat);
    wallFlankR.position.set(3.6, 2.1, -3.2);
    rootGroup.add(wallFlankR);

    // Vertical Acoustic Slats on Wall Flanks
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x222627, roughness: 0.7, metalness: 0.15 });
    for (let i = -4.3; i <= -2.9; i += 0.14) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.8, 0.03), slatMat);
      slat.position.set(i, 2.0, -3.14);
      rootGroup.add(slat);
    }
    for (let i = 2.9; i <= 4.3; i += 0.14) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.8, 0.03), slatMat);
      slat.position.set(i, 2.0, -3.14);
      rootGroup.add(slat);
    }

    // Lower apron below window (subtle low sill)
    const lowerApron = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 0.1), wallMat);
    lowerApron.position.set(0, 0.225, -3.2);
    rootGroup.add(lowerApron);

    // Top lintel above window
    const topLintel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 0.1), wallMat);
    topLintel.position.set(0, 3.975, -3.2);
    rootGroup.add(topLintel);

    // Illuminated Window Sill with Warm Ambient LED Glow
    const windowSill = new THREE.Mesh(
      new THREE.BoxGeometry(5.62, 0.04, 0.22),
      frameMatWall
    );
    windowSill.position.set(0, 0.45, -3.14);
    rootGroup.add(windowSill);

    const sillGlow = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.015, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.15 })
    );
    sillGlow.position.set(0, 0.47, -3.05);
    rootGroup.add(sillGlow);

    // Sleek Architectural Vertical Mullions (Dividing into wide cinematic panes)
    const mullion1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.5, 0.08), frameMatWall);
    mullion1.position.set(-1.0, 2.2, -3.18);
    rootGroup.add(mullion1);

    const mullion2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.5, 0.08), frameMatWall);
    mullion2.position.set(1.0, 2.2, -3.18);
    rootGroup.add(mullion2);

    // Clear Panoramic Aerospace Glass Pane with Optical Anti-Reflective Sheen
    const spaceGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 3.5),
      new THREE.MeshStandardMaterial({
        color: 0x05101a,
        transparent: true,
        opacity: 0.14,
        roughness: 0.04,
        metalness: 0.4
      })
    );
    spaceGlass.position.set(0, 2.2, -3.2);
    rootGroup.add(spaceGlass);

    // High-Tech Etched Holographic HUD Telemetry Reticle on Glass
    const hudCanvas = document.createElement('canvas');
    hudCanvas.width = 1024;
    hudCanvas.height = 512;
    const hctx = hudCanvas.getContext('2d')!;
    hctx.clearRect(0, 0, 1024, 512);

    // Faint celestial compass azimuth bar at top
    hctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    hctx.lineWidth = 1.5;
    hctx.beginPath();
    hctx.moveTo(180, 48); hctx.lineTo(844, 48);
    hctx.stroke();

    hctx.font = '10px "JetBrains Mono", monospace';
    hctx.fillStyle = 'rgba(6, 182, 212, 0.55)';
    hctx.textAlign = 'center';
    for (let deg = 100; deg <= 160; deg += 10) {
      const hx = 180 + ((deg - 100) / 60) * 664;
      hctx.beginPath();
      hctx.moveTo(hx, 42); hctx.lineTo(hx, 54);
      hctx.stroke();
      hctx.fillText(`${deg}°`, hx, 36);
    }
    hctx.fillStyle = 'rgba(223, 255, 0, 0.65)';
    hctx.fillText('[ HDG 132° // ELEV +14.2° ]', 512, 68);

    // Horizon pitch ladder
    hctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    hctx.beginPath();
    hctx.moveTo(432, 256); hctx.lineTo(482, 256);
    hctx.moveTo(542, 256); hctx.lineTo(592, 256);
    hctx.moveTo(512, 246); hctx.lineTo(512, 266);
    hctx.stroke();

    // Planet Lock Reticle (Targeting Kepler Exoplanet)
    hctx.strokeStyle = 'rgba(223, 255, 0, 0.45)';
    hctx.lineWidth = 1.5;
    hctx.strokeRect(500, 110, 140, 85);
    hctx.beginPath();
    hctx.moveTo(490, 152); hctx.lineTo(500, 152);
    hctx.moveTo(640, 152); hctx.lineTo(650, 152);
    hctx.moveTo(570, 100); hctx.lineTo(570, 110);
    hctx.moveTo(570, 195); hctx.lineTo(570, 205);
    hctx.stroke();
    hctx.font = '9px "JetBrains Mono", monospace';
    hctx.fillStyle = 'rgba(223, 255, 0, 0.65)';
    hctx.textAlign = 'left';
    hctx.fillText('TARGET: EXOPLANET-452', 504, 126);
    hctx.fillStyle = 'rgba(147, 197, 253, 0.55)';
    hctx.fillText('RANGE: 4.8 AU', 504, 142);
    hctx.fillText('ATM: N2-CH4-H2O', 504, 158);
    hctx.fillText('CLASS: GAS GIANT', 504, 174);

    // Orbital Station Telemetry HUD in lower-left
    hctx.fillStyle = 'rgba(6, 182, 212, 0.50)';
    hctx.fillText('ORBITAL STATUS: GEO-SYNCHRONOUS', 80, 440);
    hctx.fillText('ALT: 418.4 KM // VEL: 7.68 KM/S', 80, 456);
    hctx.fillText('HULL INTEGRITY: 100% // RAD: 0.12 μSv', 80, 472);

    const hudTexture = new THREE.CanvasTexture(hudCanvas);
    hudTexture.colorSpace = THREE.SRGBColorSpace;
    const hudMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.48, 3.48),
      new THREE.MeshBasicMaterial({
        map: hudTexture,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        fog: false
      })
    );
    hudMesh.position.set(0, 2.2, -3.19);
    rootGroup.add(hudMesh);

    // Sleek Station ID Sign above Window Header
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d')!;
    sctx.fillStyle = '#0a0c0c';
    sctx.fillRect(0, 0, 512, 128);
    sctx.strokeStyle = '#dfff00';
    sctx.lineWidth = 4;
    sctx.strokeRect(6, 6, 500, 116);
    sctx.fillStyle = '#dfff00';
    sctx.font = 'bold 36px "JetBrains Mono", monospace';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('>_ JEET.DEV // ORBITAL', 256, 64);

    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.32),
      new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 3.96, -3.14);
    rootGroup.add(signMesh);

    // --- C. ENCLOSING WALLS, BACKWALL DOOR & HIGH-VISIBILITY ARCHITECTURAL BOARD ---
    // User requested: "Swap the Right and Left Wall and the Door should be on Back wall side, The Board on Backwall is not properly visible."
    
    // 1. Back Wall (z = 3.6)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.0, 4.2, 0.1), wallMat);
    backWall.position.set(0, 2.1, 3.6);
    rootGroup.add(backWall);

    // Warm ceiling wash light for back wall
    const backWash = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.02, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.18 })
    );
    backWash.position.set(0, 4.0, 3.52);
    rootGroup.add(backWash);

    // Modern Architectural Access Door on the BACK WALL (Left side: x = -2.5, z = 3.55)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-2.5, 0, 3.55);
    rootGroup.add(doorGroup);

    // Door Frame Surround
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x121415, roughness: 0.35, metalness: 0.85 });
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.65, 0.10), doorFrameMat);
    doorFrame.position.set(0, 1.325, 0);
    doorGroup.add(doorFrame);

    // Recessed Door Leaf (Dark Charcoal Minimalist Panel)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x1c1f21, roughness: 0.45, metalness: 0.5 });
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.55, 0.05), doorMat);
    doorLeaf.position.set(0, 1.325, -0.015);
    doorGroup.add(doorLeaf);

    // Architectural Horizontal Seams on Door Leaf
    for (let k = 0.6; k <= 2.2; k += 0.5) {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.008, 0.055),
        new THREE.MeshStandardMaterial({ color: 0x0a0c0d, roughness: 0.8 })
      );
      seam.position.set(0, k, -0.015);
      doorGroup.add(seam);
    }

    // Long Vertical Flush Door Handle with Warm Amber/Norris LED Backlight
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x252a2d, roughness: 0.2, metalness: 0.95 });
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, 0.03), handleMat);
    handleBar.position.set(0.48, 1.28, -0.045);
    doorGroup.add(handleBar);

    const handleGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 1.02, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.2 })
    );
    handleGlow.position.set(0.48, 1.28, -0.038);
    doorGroup.add(handleGlow);

    // Electronic Smart Access Keypad Console beside Door
    const keypadConsole = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.24, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x141718, roughness: 0.35, metalness: 0.85 })
    );
    keypadConsole.position.set(-0.85, 1.35, -0.02);
    doorGroup.add(keypadConsole);

    // Glowing Status LED on Keypad (Green = Access Granted)
    const accessLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.0 })
    );
    accessLed.position.set(-0.85, 1.42, -0.036);
    doorGroup.add(accessLed);

    // Door Header Station Exit Plaque
    const doorSignCanvas = document.createElement('canvas');
    doorSignCanvas.width = 256;
    doorSignCanvas.height = 64;
    const dsCtx = doorSignCanvas.getContext('2d')!;
    dsCtx.fillStyle = '#0a0d0e';
    dsCtx.fillRect(0, 0, 256, 64);
    dsCtx.strokeStyle = '#dfff00';
    dsCtx.lineWidth = 2;
    dsCtx.strokeRect(3, 3, 250, 58);
    dsCtx.fillStyle = '#dfff00';
    dsCtx.font = 'bold 20px "JetBrains Mono", monospace';
    dsCtx.textAlign = 'center';
    dsCtx.textBaseline = 'middle';
    dsCtx.fillText('[ ACCESS // SECTOR_01 ]', 128, 32);

    const doorSignTex = new THREE.CanvasTexture(doorSignCanvas);
    doorSignTex.colorSpace = THREE.SRGBColorSpace;
    const doorSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.22),
      new THREE.MeshBasicMaterial({ map: doorSignTex, toneMapped: false })
    );
    doorSignMesh.position.set(0, 2.82, -0.065);
    doorSignMesh.rotation.y = Math.PI; // Faces into room towards front
    doorGroup.add(doorSignMesh);

    // Overhead Directional Downlight above Doorway
    const doorSpot = new THREE.SpotLight(0xfff5db, 2.5, 3.8, Math.PI / 4, 0.35, 1.2);
    doorSpot.position.set(-2.5, 3.5, 2.8);
    doorSpot.target.position.set(-2.5, 1.3, 3.55);
    rootGroup.add(doorSpot);
    rootGroup.add(doorSpot.target);

    // 2. High-Tech Prominently Visible Architectural Blueprint Board on Back Wall
    // User requested: "The Board on Backwall is not properly visible"
    // Positioned beside the door: centered at x = 1.1, y = 2.15, z = 3.54 (3.6m wide x 1.9m high)
    const bpCanvas = document.createElement('canvas');
    bpCanvas.width = 1536;
    bpCanvas.height = 800;
    const bpCtx = bpCanvas.getContext('2d')!;
    bpCtx.fillStyle = '#080c10';
    bpCtx.fillRect(0, 0, 1536, 800);

    // Technical Blueprint Grid
    bpCtx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    bpCtx.lineWidth = 1;
    for (let x = 0; x <= 1536; x += 32) {
      bpCtx.beginPath(); bpCtx.moveTo(x, 0); bpCtx.lineTo(x, 800); bpCtx.stroke();
    }
    for (let y = 0; y <= 800; y += 32) {
      bpCtx.beginPath(); bpCtx.moveTo(0, y); bpCtx.lineTo(1536, y); bpCtx.stroke();
    }

    // Outer double glowing architectural frame
    bpCtx.strokeStyle = '#dfff00';
    bpCtx.lineWidth = 4;
    bpCtx.strokeRect(24, 24, 1488, 752);
    bpCtx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    bpCtx.lineWidth = 1.5;
    bpCtx.strokeRect(32, 32, 1472, 736);

    // Title Header Bar
    bpCtx.fillStyle = '#0f161d';
    bpCtx.fillRect(36, 36, 1464, 90);
    bpCtx.strokeStyle = '#dfff00';
    bpCtx.lineWidth = 2;
    bpCtx.strokeRect(36, 36, 1464, 90);

    bpCtx.fillStyle = '#dfff00';
    bpCtx.font = 'bold 36px "JetBrains Mono", monospace';
    bpCtx.fillText('[ JEET PATEL // CLUSTER_ARCHITECTURE & DISTRIBUTED_SYSTEMS ]', 64, 94);

    bpCtx.fillStyle = '#00e5ff';
    bpCtx.font = 'bold 18px "JetBrains Mono", monospace';
    bpCtx.fillText('STATUS: RUNNING // MULTI-REGION CONSENSUS // ENCLAVE SECURED // SURAT', 64, 118);

    // Blueprint Diagram Modules
    const drawBpBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      sub: string,
      accentColor: string,
      status: string
    ) => {
      bpCtx.fillStyle = '#101720';
      bpCtx.fillRect(x, y, w, h);
      bpCtx.strokeStyle = accentColor;
      bpCtx.lineWidth = 2.5;
      bpCtx.strokeRect(x, y, w, h);

      // Header strip
      bpCtx.fillStyle = accentColor;
      bpCtx.fillRect(x, y, w, 28);
      bpCtx.fillStyle = '#080a0c';
      bpCtx.font = 'bold 16px "JetBrains Mono", monospace';
      bpCtx.fillText(title, x + 12, y + 20);

      bpCtx.fillStyle = '#ffffff';
      bpCtx.font = '14px "JetBrains Mono", monospace';
      bpCtx.fillText(sub, x + 14, y + 54);

      bpCtx.fillStyle = '#10b981';
      bpCtx.font = 'bold 12px "JetBrains Mono", monospace';
      bpCtx.fillText(`● ${status}`, x + 14, y + 78);
    };

    drawBpBox(70, 160, 310, 95, 'INGRESS_GATEWAY', 'Envoy / Multipath QUIC / TLS 1.3', '#00e5ff', 'ONLINE (0% LOSS)');
    drawBpBox(440, 160, 310, 95, 'CONSENSUS_ENGINE', 'Multi-Raft Quorum / 32 Nodes', '#dfff00', 'LEADER ELECTED');
    drawBpBox(810, 160, 310, 95, 'NEURAL_TENSOR_CORE', 'CUDA FP16 / Triton Server', '#e879f9', '1.2ms LATENCY');
    drawBpBox(1180, 160, 300, 95, 'STORAGE_LSM_TREE', 'Distributed RocksDB / NVMe', '#34d399', 'PERSISTED');

    drawBpBox(250, 320, 320, 95, 'ZERO_TRUST_SECURITY', 'eBPF Kernel Packet Inspection', '#f87171', 'ALL CVE 0');
    drawBpBox(630, 320, 320, 95, 'STREAMING_PIPELINE', 'Kafka / Event Aggregator', '#38bdf8', '890k MSG/SEC');
    drawBpBox(1010, 320, 320, 95, 'OBSERVABILITY_RADAR', 'Prometheus / OpenTelemetry', '#fbbf24', 'HEALTHY');

    // Glowing Bus Connections
    bpCtx.strokeStyle = '#dfff00';
    bpCtx.lineWidth = 3;
    bpCtx.beginPath();
    bpCtx.moveTo(380, 207); bpCtx.lineTo(440, 207);
    bpCtx.moveTo(750, 207); bpCtx.lineTo(810, 207);
    bpCtx.moveTo(1120, 207); bpCtx.lineTo(1180, 207);

    bpCtx.moveTo(595, 255); bpCtx.lineTo(595, 320);
    bpCtx.moveTo(965, 255); bpCtx.lineTo(965, 320);
    bpCtx.stroke();

    // Circuit Data Path Grid at bottom
    bpCtx.fillStyle = '#0e141a';
    bpCtx.fillRect(70, 460, 1390, 270);
    bpCtx.strokeStyle = 'rgba(223, 255, 0, 0.4)';
    bpCtx.lineWidth = 1.5;
    bpCtx.strokeRect(70, 460, 1390, 270);

    bpCtx.fillStyle = '#dfff00';
    bpCtx.font = 'bold 20px "JetBrains Mono", monospace';
    bpCtx.fillText('HARDWARE & KERNEL ACCELERATION MATRIX [TOPOLOGY_V5]', 94, 500);

    bpCtx.font = '15px "JetBrains Mono", monospace';
    bpCtx.fillStyle = '#94a3b8';
    bpCtx.fillText('>_ [KERNEL] Linux 6.8-rt / NUMA topology balanced / CPU affinity pin: cores 0-7', 94, 545);
    bpCtx.fillText('>_ [GPU] NVIDIA RTX 4090 / 16,384 CUDA Cores / 512 Tensor Cores / VRAM: 24GB G6X', 94, 585);
    bpCtx.fillText('>_ [NETWORKING] Dual 10GbE SFP+ / DPDK Userspace Packet Processing / QUIC Ingress', 94, 625);
    bpCtx.fillText('>_ [STORAGE] 4x 2TB Gen5 NVMe RAID-0 / 14,000 MB/s Sequential Read / 1.5M IOPS', 94, 665);
    bpCtx.fillStyle = '#10b981';
    bpCtx.fillText('● SYSTEM READY // HIGH PERFORMANCE COMPUTING SANCTUARY // FULL TELEMETRY ONLINE', 94, 705);

    const bpTex = new THREE.CanvasTexture(bpCanvas);
    bpTex.colorSpace = THREE.SRGBColorSpace;
    const bpMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.9),
      new THREE.MeshBasicMaterial({ map: bpTex, toneMapped: false })
    );
    bpMesh.position.set(1.1, 2.15, 3.54);
    bpMesh.rotation.y = Math.PI; // Faces into room towards front window
    rootGroup.add(bpMesh);

    // Glowing Neon Yellow Border Frame around Board
    const boardFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.68, 1.98, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x181a1c, roughness: 0.4, metalness: 0.9 })
    );
    boardFrame.position.set(1.1, 2.15, 3.56);
    rootGroup.add(boardFrame);

    const boardFrameTrim = new THREE.Mesh(
      new THREE.BoxGeometry(3.64, 1.94, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.15 })
    );
    boardFrameTrim.position.set(1.1, 2.15, 3.545);
    rootGroup.add(boardFrameTrim);

    // Dedicated Overhead Spotlight shining down on the Board
    const boardSpot = new THREE.SpotLight(0xfff7e6, 1.6, 5.0, Math.PI / 3.2, 0.45, 1.1);
    boardSpot.position.set(1.1, 3.8, 2.3);
    boardSpot.target.position.set(1.1, 2.15, 3.54);
    rootGroup.add(boardSpot);
    rootGroup.add(boardSpot.target);

    // Vertical Acoustic Slats on Back Wall Edges
    for (const sx of [-3.8, -3.6, -3.4, 3.2, 3.4, 3.6, 3.8]) {
      const bSlat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.8, 0.03), slatMat);
      bSlat.position.set(sx, 2.1, 3.54);
      rootGroup.add(bSlat);
    }

    // ==========================================
    // 3. SWAPPED WALLS: LEFT WALL (x = -4.2)
    // (Credenza, Espresso Bar, Mini Cooler, Floating Shelves, Books, VR Headset, Plant, Lamp)
    // ==========================================
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 7.0), wallMat);
    leftWall.position.set(-4.2, 2.1, 0.2);
    rootGroup.add(leftWall);

    // Credenza Snack & Espresso Bar on Left Wall
    const barGroup = new THREE.Group();
    barGroup.position.set(-3.4, 0.75, 0.4);
    barGroup.rotation.y = Math.PI;
    rootGroup.add(barGroup);

    const credenza = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.75, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.5, metalness: 0.3 })
    );
    barGroup.add(credenza);

    // Espresso Machine (Italian pump machine with portafilter)
    const espressoMachine = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.32, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x2b3035, roughness: 0.25, metalness: 0.95 })
    );
    espressoMachine.position.set(0, 0.53, -0.3);
    barGroup.add(espressoMachine);

    // Mini Beverage Cooler with Glowing Cans
    const cooler = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.52, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x111314, roughness: 0.35, metalness: 0.85 })
    );
    cooler.position.set(0, 0.63, 0.35);
    barGroup.add(cooler);

    const coolerGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.48),
      new THREE.MeshStandardMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35 })
    );
    coolerGlass.rotation.y = Math.PI / 2;
    coolerGlass.position.set(0.226, 0.63, 0.35);
    barGroup.add(coolerGlass);

    // Floating Bookshelves on Left Wall
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.5, metalness: 0.3 });
    const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 1.8), shelfMat);
    shelf1.position.set(-4.02, 1.6, -1.0);
    rootGroup.add(shelf1);
    const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 1.8), shelfMat);
    shelf2.position.set(-4.02, 2.15, -1.0);
    rootGroup.add(shelf2);

    // Books on Shelf
    const bookColors = [0xdfff00, 0x00e5ff, 0xff007f, 0x10b981, 0x6366f1, 0xf59e0b, 0xec4899];
    let bookZ = -1.7;
    for (let i = 0; i < 9; i++) {
      const bThickness = 0.03 + Math.random() * 0.02;
      const bHeight = 0.18 + Math.random() * 0.06;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, bHeight, bThickness),
        new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length], roughness: 0.6 })
      );
      book.position.set(-4.02, 1.6 + bHeight / 2 + 0.018, bookZ);
      rootGroup.add(book);
      bookZ += bThickness + 0.02;
    }

    // VR Headset resting on Shelf 2
    const vrHeadset = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.09, 0.11),
      new THREE.MeshStandardMaterial({ color: 0x181a1b, roughness: 0.35, metalness: 0.7 })
    );
    vrHeadset.position.set(-4.02, 2.22, -0.6);
    rootGroup.add(vrHeadset);

    // Potted Lush Monstera Plant on Left Wall
    const plantGroup = new THREE.Group();
    plantGroup.position.set(-3.4, 0, -2.4);
    rootGroup.add(plantGroup);

    const bigPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.16, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
    );
    bigPot.position.set(0, 0.275, 0);
    plantGroup.add(bigPot);

    const plantLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), plantLeafMat);
      const angle = (i / 9) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.12, 0.65 + (i % 3) * 0.12, Math.sin(angle) * 0.12);
      leaf.rotation.x = Math.sin(angle) * 0.5;
      leaf.rotation.z = -Math.cos(angle) * 0.5;
      plantGroup.add(leaf);
    }

    // Ambient Corner Vertical Lamp on Left
    const cornerLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 2.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.15 })
    );
    cornerLamp.position.set(-3.9, 1.2, -2.9);
    rootGroup.add(cornerLamp);

    // ==========================================
    // 4. SWAPPED WALLS: RIGHT WALL (x = +4.2)
    // (Hardware Lab Pegboard, Diagnostics Lab, Tech Rack, Glowing Neon Cyber Sign)
    // ==========================================
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 7.0), wallMat);
    rightWall.position.set(4.2, 2.1, 0.2);
    rootGroup.add(rightWall);

    // Glowing Neon Cyber Sign on Right Wall ("BUILD // BREACH // DEPLOY")
    const signGroup = new THREE.Group();
    signGroup.position.set(4.12, 2.85, 0.2);
    signGroup.rotation.y = -Math.PI / 2;
    rootGroup.add(signGroup);

    const neonSignCanvas = document.createElement('canvas');
    neonSignCanvas.width = 512;
    neonSignCanvas.height = 128;
    const nctx = neonSignCanvas.getContext('2d')!;
    nctx.fillStyle = '#0a0d0e';
    nctx.fillRect(0, 0, 512, 128);
    nctx.strokeStyle = '#dfff00';
    nctx.lineWidth = 3;
    nctx.strokeRect(6, 6, 500, 116);
    nctx.fillStyle = '#dfff00';
    nctx.font = 'bold 32px "JetBrains Mono", monospace';
    nctx.textAlign = 'center';
    nctx.textBaseline = 'middle';
    nctx.fillText('BUILD // BREACH // DEPLOY', 256, 52);
    nctx.font = 'bold 16px "JetBrains Mono", monospace';
    nctx.fillStyle = '#00e5ff';
    nctx.fillText('HIGH-PERFORMANCE SYSTEM ARCHITECT', 256, 88);

    const neonSignTex = new THREE.CanvasTexture(neonSignCanvas);
    neonSignTex.colorSpace = THREE.SRGBColorSpace;
    const neonSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.48),
      new THREE.MeshBasicMaterial({ map: neonSignTex, toneMapped: false })
    );
    signGroup.add(neonSignMesh);

    // Hardware Diagnostics Pegboard on Right Wall
    const pegGroup = new THREE.Group();
    pegGroup.position.set(4.12, 1.9, -0.6);
    pegGroup.rotation.y = -Math.PI / 2;
    rootGroup.add(pegGroup);

    const pegBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.0, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x161819, roughness: 0.7, metalness: 0.3 })
    );
    pegGroup.add(pegBoard);

    // Digital Oscilloscope Screen on Pegboard
    const osciCanvas = document.createElement('canvas');
    osciCanvas.width = 256;
    osciCanvas.height = 160;
    const octx = osciCanvas.getContext('2d')!;
    octx.fillStyle = '#091014';
    octx.fillRect(0, 0, 256, 160);
    octx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    octx.lineWidth = 1;
    for (let i = 0; i <= 256; i += 20) { octx.beginPath(); octx.moveTo(i, 0); octx.lineTo(i, 160); octx.stroke(); }
    for (let i = 0; i <= 160; i += 20) { octx.beginPath(); octx.moveTo(0, i); octx.lineTo(256, i); octx.stroke(); }
    octx.strokeStyle = '#00e5ff';
    octx.lineWidth = 2.5;
    octx.beginPath();
    for (let x = 0; x < 256; x++) {
      const y = 80 + Math.sin(x * 0.1) * 35 + Math.sin(x * 0.04) * 15;
      if (x === 0) octx.moveTo(x, y);
      else octx.lineTo(x, y);
    }
    octx.stroke();
    octx.fillStyle = '#dfff00';
    octx.font = 'bold 12px "JetBrains Mono", monospace';
    octx.fillText('OSCILLOSCOPE // 2.4 GHz', 10, 20);

    const osciTex = new THREE.CanvasTexture(osciCanvas);
    osciTex.colorSpace = THREE.SRGBColorSpace;
    const osciMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.35),
      new THREE.MeshBasicMaterial({ map: osciTex, toneMapped: false })
    );
    osciMesh.position.set(-0.35, 0.15, 0.02);
    pegGroup.add(osciMesh);

    // Wall-Mounted Tech Rack Shelf on Right Wall
    const techShelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.035, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1f2224, roughness: 0.4, metalness: 0.7 })
    );
    techShelf.position.set(4.02, 1.45, 1.0);
    rootGroup.add(techShelf);

    // Blinking Rack-mount Switch with LED activity
    const switchBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x111314, roughness: 0.3, metalness: 0.85 })
    );
    switchBox.position.set(4.02, 1.51, 1.0);
    rootGroup.add(switchBox);

    // Right Wall Ambient Sconce Light
    const rightWallSconce = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.15 })
    );
    rightWallSconce.position.set(3.9, 1.2, -2.9);
    rootGroup.add(rightWallSconce);

    // --- H. THE CODER BATTLESTATION DESK (SPACIOUS & SEPARATED) ---
    const deskGroup = new THREE.Group();
    rootGroup.add(deskGroup);

    // Extended Heavy-Duty Chamfered Desktop (3.4m wide - plenty of room!)
    const deskShape = new THREE.Shape();
    deskShape.moveTo(-1.7, -0.52);
    deskShape.lineTo(1.7, -0.52);
    deskShape.lineTo(1.78, -0.36);
    deskShape.lineTo(1.7, 0.52);
    deskShape.lineTo(-1.7, 0.52);
    deskShape.lineTo(-1.78, -0.36);
    deskShape.closePath();

    const deskTopGeo = new THREE.ExtrudeGeometry(deskShape, {
      steps: 1, depth: 0.045, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2
    });
    deskTopGeo.rotateX(Math.PI / 2);

    const deskMat = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.38, metalness: 0.65 });
    const deskTop = new THREE.Mesh(deskTopGeo, deskMat);
    deskTop.position.set(0, 0.85, -0.2);
    deskTop.castShadow = !isSoftwareGl;
    deskTop.receiveShadow = !isSoftwareGl;
    deskGroup.add(deskTop);

    // Front edge RGB lightstrip (subtle warm tone)
    const edgeTrim = new THREE.Mesh(
      new THREE.BoxGeometry(3.38, 0.012, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.18, roughness: 0.2 })
    );
    edgeTrim.position.set(0, 0.85, 0.32);
    deskGroup.add(edgeTrim);

    // Steel Legs
    const legSteelMat = new THREE.MeshStandardMaterial({ color: 0x1f2222, roughness: 0.45, metalness: 0.85 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.68), legSteelMat);
    legL.position.set(-1.42, 0.425, -0.2);
    deskGroup.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.68), legSteelMat);
    legR.position.set(1.42, 0.425, -0.2);
    deskGroup.add(legR);

    // --- I. TRIPLE MONITORS (VIBRANT SELF-LUMINOUS SCREENS WITH ZERO CLIPPING) ---
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111314, roughness: 0.45, metalness: 0.9 });

    // 1. Center Monitor (Rooted at x = 0, y = 1.35, z = -0.42)
    const centerMonitorGroup = new THREE.Group();
    centerMonitorGroup.position.set(0, 1.35, -0.42);
    deskGroup.add(centerMonitorGroup);

    const codeCanvas = document.createElement('canvas');
    codeCanvas.width = 1024;
    codeCanvas.height = 640;
    const cctx = codeCanvas.getContext('2d')!;
    const codeTexture = new THREE.CanvasTexture(codeCanvas);
    codeTexture.colorSpace = THREE.SRGBColorSpace;
    mainScreenTextureRef.current = codeTexture;

    // Outer Bezel Frame
    const frameCenter = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.66, 0.025), frameMat);
    frameCenter.position.set(0, 0, -0.012);
    centerMonitorGroup.add(frameCenter);

    // Glowing Self-Luminous Screen Face (Pure MeshBasicMaterial = 100% visible, zero shadow, zero glare)
    const screenCenter = new THREE.Mesh(
      new THREE.PlaneGeometry(1.07, 0.63),
      new THREE.MeshBasicMaterial({ map: codeTexture, toneMapped: false })
    );
    screenCenter.position.set(0, 0, 0.003);
    centerMonitorGroup.add(screenCenter);

    // VESA Mount Plate & Rear Arm (Completely BEHIND screen at local z = -0.03 to -0.07)
    const vesaPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.02), frameMat);
    vesaPlate.position.set(0, 0, -0.03);
    centerMonitorGroup.add(vesaPlate);

    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.48, 16), frameMat);
    standPole.position.set(0, -0.25, -0.07);
    centerMonitorGroup.add(standPole);

    // BenQ-style Slim Screen Lightbar
    const lightBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.52, 16),
      new THREE.MeshStandardMaterial({ color: 0x222424, roughness: 0.3, metalness: 0.85 })
    );
    lightBar.geometry.rotateZ(Math.PI / 2);
    lightBar.position.set(0, 0.35, 0.02);
    centerMonitorGroup.add(lightBar);

    // 2. Left Vertical Monitor - AI Computer Vision & Neural Image Segmentation
    // Rooted at x = -0.76, y = 1.35, z = -0.38, angled cleanly inward toward user
    const leftMonitorGroup = new THREE.Group();
    leftMonitorGroup.position.set(-0.76, 1.35, -0.38);
    leftMonitorGroup.rotation.y = 0.42; // ~24 deg inward
    deskGroup.add(leftMonitorGroup);

    const vertCanvas = document.createElement('canvas');
    vertCanvas.width = 512;
    vertCanvas.height = 800;
    const vctx = vertCanvas.getContext('2d')!;
    const vertTexture = new THREE.CanvasTexture(vertCanvas);
    vertTexture.colorSpace = THREE.SRGBColorSpace;
    vertScreenTextureRef.current = vertTexture;

    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.78, 0.025), frameMat);
    frameLeft.position.set(0, 0, -0.012);
    leftMonitorGroup.add(frameLeft);

    const screenLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(0.47, 0.75),
      new THREE.MeshBasicMaterial({ map: vertTexture, toneMapped: false })
    );
    screenLeft.position.set(0, 0, 0.003);
    leftMonitorGroup.add(screenLeft);

    // 3. Right Horizontal Monitor - Cluster Telemetry & Radar Cockpit
    // Rooted at x = 0.76, y = 1.35, z = -0.38, angled cleanly inward toward user
    const rightMonitorGroup = new THREE.Group();
    rightMonitorGroup.position.set(0.76, 1.35, -0.38);
    rightMonitorGroup.rotation.y = -0.42; // ~-24 deg inward
    deskGroup.add(rightMonitorGroup);

    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = 640;
    sideCanvas.height = 480;
    const lctx = sideCanvas.getContext('2d')!;
    const sideTexture = new THREE.CanvasTexture(sideCanvas);
    sideTexture.colorSpace = THREE.SRGBColorSpace;
    sideScreenTextureRef.current = sideTexture;

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.54, 0.025), frameMat);
    frameRight.position.set(0, 0, -0.012);
    rightMonitorGroup.add(frameRight);

    const screenRight = new THREE.Mesh(
      new THREE.PlaneGeometry(0.71, 0.51),
      new THREE.MeshBasicMaterial({ map: sideTexture, toneMapped: false })
    );
    screenRight.position.set(0, 0, 0.003);
    rightMonitorGroup.add(screenRight);

    // --- J. STUDIO SPEAKERS (FLANKING MONITORS CLEANLY - ZERO OVERLAP) ---
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x161819, roughness: 0.45, metalness: 0.4 });
    const wooferMat = new THREE.MeshStandardMaterial({ color: 0xdfff00, roughness: 0.35, metalness: 0.3 });
    const tweeterMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.9 });

    const createSpeaker = (xPos: number, zPos: number, yRot: number) => {
      const sGroup = new THREE.Group();
      sGroup.position.set(xPos, 0.98, zPos);
      sGroup.rotation.y = yRot;

      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
      pad.position.set(0, -0.125, 0);
      sGroup.add(pad);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.18), speakerMat);
      sGroup.add(cab);

      const woofer = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.015, 16), wooferMat);
      woofer.rotation.x = Math.PI / 2;
      woofer.position.set(0, -0.035, 0.09);
      sGroup.add(woofer);

      const tweeter = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), tweeterMat);
      tweeter.position.set(0, 0.065, 0.09);
      sGroup.add(tweeter);

      return sGroup;
    };

    // Left Speaker clearly flanking left monitor with comfortable margin
    deskGroup.add(createSpeaker(-1.18, -0.20, Math.PI / 7));
    // Right Speaker clearly flanking right monitor (at x = 1.18, 0.12m clear from screen edge)
    deskGroup.add(createSpeaker(1.18, -0.20, -Math.PI / 7));

    // --- K. PC RIG / THE CPU (PLACED AT X = 1.54, ZERO OVERLAP WITH SPEAKER AT X = 1.18) ---
    // A full 36 cm of clear, open desk space between Speaker (x = 1.18) and PC Case (x = 1.54)!
    const pcGroup = new THREE.Group();
    pcGroup.position.set(1.54, 1.10, -0.06);
    pcGroup.rotation.y = -Math.PI / 7; // Angled 25 deg inward
    deskGroup.add(pcGroup);

    // PC Chassis Frame
    const pcCaseMat = new THREE.MeshStandardMaterial({ color: 0x111314, roughness: 0.35, metalness: 0.85 });
    const pcBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.02), pcCaseMat);
    pcBack.position.set(0, 0, -0.21);
    pcGroup.add(pcBack);
    const pcTop = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.44), pcCaseMat);
    pcTop.position.set(0, 0.22, 0);
    pcGroup.add(pcTop);
    const pcBottom = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.44), pcCaseMat);
    pcBottom.position.set(0, -0.22, 0);
    pcGroup.add(pcBottom);

    // Tempered Glass Panels
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111618, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.2
    });
    const glassSide = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.44), glassMat);
    glassSide.rotation.y = -Math.PI / 2;
    glassSide.position.set(-0.108, 0, 0);
    pcGroup.add(glassSide);

    // Illuminated GPU
    const gpuMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.09, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.35, metalness: 0.85 })
    );
    gpuMesh.position.set(0.0, -0.04, 0.02);
    pcGroup.add(gpuMesh);

    const gpuRgb = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.015, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.25 })
    );
    gpuRgb.position.set(0.0, 0.012, 0.02);
    pcGroup.add(gpuRgb);

    // RGB RAM Sticks
    for (let i = 0; i < 4; i++) {
      const ram = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.045, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.2 })
      );
      ram.position.set(0.02 + i * 0.014, 0.10, -0.05);
      pcGroup.add(ram);
    }

    // Liquid CPU Cooler Pump
    const cpuPump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.025, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.2 })
    );
    cpuPump.rotation.z = Math.PI / 2;
    cpuPump.position.set(0.04, 0.07, 0.02);
    pcGroup.add(cpuPump);

    // Spinning Front Fans
    const fanGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.014, 12);
    fanGeo.rotateX(Math.PI / 2);
    const fanMat = new THREE.MeshStandardMaterial({
      color: 0x282c2d, emissive: 0x38bdf8, emissiveIntensity: 0.2, roughness: 0.4
    });

    const frontFan1 = new THREE.Mesh(fanGeo, fanMat);
    frontFan1.position.set(0, 0.09, 0.20);
    pcGroup.add(frontFan1);
    pcFansRef.current.push(frontFan1);

    const frontFan2 = new THREE.Mesh(fanGeo, fanMat);
    frontFan2.position.set(0, -0.09, 0.20);
    pcGroup.add(frontFan2);
    pcFansRef.current.push(frontFan2);

    // (Note: The single global 3D floating bot companion is rendered via FloatingBot.tsx across the whole web)

    // --- M. DESK ACCESSORIES (KEYBOARD, MOUSE, COFFEE, PLANT, NOTES) ---
    // Deskmat
    const deskmatGeo = new THREE.PlaneGeometry(0.96, 0.38);
    const matCanvas = document.createElement('canvas');
    matCanvas.width = 512;
    matCanvas.height = 256;
    const mctx = matCanvas.getContext('2d')!;
    mctx.fillStyle = '#161819';
    mctx.fillRect(0, 0, 512, 256);
    mctx.strokeStyle = 'rgba(223, 255, 0, 0.35)';
    mctx.lineWidth = 2;
    for (let r = 40; r < 360; r += 32) {
      mctx.beginPath();
      mctx.ellipse(256, 128, r, r * 0.45, 0, 0, Math.PI * 2);
      mctx.stroke();
    }
    const matTexture = new THREE.CanvasTexture(matCanvas);
    matTexture.colorSpace = THREE.SRGBColorSpace;
    const deskmat = new THREE.Mesh(deskmatGeo, new THREE.MeshStandardMaterial({ map: matTexture, roughness: 0.85 }));
    deskmat.rotation.x = -Math.PI / 2;
    deskmat.position.set(0, 0.88, 0.05);
    deskGroup.add(deskmat);

    // Mechanical Keyboard
    const kbBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.016, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x181b1c, roughness: 0.4, metalness: 0.7 })
    );
    kbBase.position.set(-0.04, 0.89, 0.05);
    deskGroup.add(kbBase);

    // Key Matrix
    const keyGeo = new THREE.BoxGeometry(0.018, 0.009, 0.018);
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0x242828, emissive: 0xdfff00, emissiveIntensity: 0.35, roughness: 0.3
    });
    const keyMesh = new THREE.InstancedMesh(keyGeo, keyMat, 70);
    const dummy = new THREE.Object3D();
    let keyIdx = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        dummy.position.set(-0.04 - 0.19 + c * 0.024, 0.903, 0.05 - 0.045 + r * 0.023);
        dummy.updateMatrix();
        keyMesh.setMatrixAt(keyIdx++, dummy.matrix);
      }
    }
    keyMesh.instanceMatrix.needsUpdate = true;
    deskGroup.add(keyMesh);

    // Gaming Mouse
    const mouseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.028, 0.11),
      new THREE.MeshStandardMaterial({ color: 0x141617, roughness: 0.35, metalness: 0.6 })
    );
    mouseMesh.position.set(0.26, 0.895, 0.05);
    deskGroup.add(mouseMesh);

    // Steaming Coffee Mug
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.032, 0.085, 16),
      new THREE.MeshStandardMaterial({ color: 0x141616, roughness: 0.4, metalness: 0.7 })
    );
    mug.position.set(-0.35, 0.92, -0.08);
    deskGroup.add(mug);

    const mugBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.039, 0.039, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.15 })
    );
    mugBand.position.set(-0.35, 0.94, -0.08);
    deskGroup.add(mugBand);

    // Steam particles
    const steamGeo = new THREE.BufferGeometry();
    const steamPos = new Float32Array(18 * 3);
    for (let i = 0; i < 18; i++) {
      steamPos[i * 3] = -0.35 + (Math.random() - 0.5) * 0.03;
      steamPos[i * 3 + 1] = 0.98 + Math.random() * 0.15;
      steamPos[i * 3 + 2] = -0.08 + (Math.random() - 0.5) * 0.03;
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    const steamPoints = new THREE.Points(
      steamGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.016, transparent: true, opacity: 0.35 })
    );
    deskGroup.add(steamPoints);
    steamParticlesRef.current = steamPoints;

    // Ceramic Planter with Succulent
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.026, 0.055, 6),
      new THREE.MeshStandardMaterial({ color: 0x333738, roughness: 0.9 })
    );
    pot.position.set(0.44, 0.91, -0.2);
    deskGroup.add(pot);

    const plantMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65 });
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.045, 4), plantMat);
      const angle = (i / 7) * Math.PI * 2;
      leaf.position.set(0.44 + Math.cos(angle) * 0.018, 0.945, -0.2 + Math.sin(angle) * 0.018);
      leaf.rotation.x = Math.sin(angle) * 0.4;
      leaf.rotation.z = -Math.cos(angle) * 0.4;
      deskGroup.add(leaf);
    }

    // --- N. REALISTIC HIGH-END ERGONOMIC TASK CHAIR ---
    // User requested: "In 3D Make Chair and Space outside window more realistic"
    const chairGroup = new THREE.Group();
    rootGroup.add(chairGroup);
    chairGroup.position.set(0, 0, 0.50);
    chairGroup.rotation.y = 0.22;

    // Procedural High-Tensile Breathable Woven Mesh Texture
    const chairMeshCanvas = document.createElement('canvas');
    chairMeshCanvas.width = 128;
    chairMeshCanvas.height = 128;
    const meshCtx = chairMeshCanvas.getContext('2d')!;
    meshCtx.fillStyle = '#141618';
    meshCtx.fillRect(0, 0, 128, 128);
    meshCtx.fillStyle = '#1e2225';
    for (let my = 0; my < 128; my += 8) {
      for (let mx = 0; mx < 128; mx += 8) {
        if ((mx / 8 + my / 8) % 2 === 0) {
          meshCtx.fillRect(mx + 1, my + 1, 6, 6);
        }
      }
    }
    meshCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    meshCtx.lineWidth = 1;
    for (let mi = 0; mi <= 128; mi += 8) {
      meshCtx.beginPath(); meshCtx.moveTo(mi, 0); meshCtx.lineTo(mi, 128); meshCtx.stroke();
      meshCtx.beginPath(); meshCtx.moveTo(0, mi); meshCtx.lineTo(128, mi); meshCtx.stroke();
    }
    const meshTexture = new THREE.CanvasTexture(chairMeshCanvas);
    meshTexture.wrapS = THREE.RepeatWrapping;
    meshTexture.wrapT = THREE.RepeatWrapping;
    meshTexture.repeat.set(6, 6);
    meshTexture.colorSpace = THREE.SRGBColorSpace;

    // Contact Ground Shadow Disk (Anchors chair visually to the floor/rug)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shCtx = shadowCanvas.getContext('2d')!;
    const shGrad = shCtx.createRadialGradient(128, 128, 15, 128, 128, 120);
    shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
    shGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
    shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shCtx.fillStyle = shGrad;
    shCtx.fillRect(0, 0, 256, 256);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

    const chairShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.85 })
    );
    chairShadow.rotation.x = -Math.PI / 2;
    chairShadow.position.set(0, 0.005, 0);
    chairGroup.add(chairShadow);

    // Advanced PBR Materials with high architectural definition
    const chairBaseMat = new THREE.MeshStandardMaterial({ color: 0x444b50, roughness: 0.22, metalness: 0.92 });
    const chairChromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.98 });
    const chairFrameMat = new THREE.MeshStandardMaterial({ color: 0x181a1c, roughness: 0.48, metalness: 0.32 });
    const chairSoftMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.85, metalness: 0.05 });
    const chairMeshMat = new THREE.MeshStandardMaterial({
      map: meshTexture,
      color: 0x24282c,
      roughness: 0.55,
      metalness: 0.22
    });
    const chairAccentMat = new THREE.MeshStandardMaterial({
      color: 0xdfff00,
      emissive: 0xdfff00,
      emissiveIntensity: 0.45,
      roughness: 0.2
    });

    // 1. Five-Star Arched Die-Cast Aluminum Base & Dual-Wheel Casters
    const baseHub = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.055, 24), chairBaseMat);
    baseHub.position.set(0, 0.088, 0);
    chairGroup.add(baseHub);

    const baseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.062, 0.015, 24), chairChromeMat);
    baseCap.position.set(0, 0.118, 0);
    chairGroup.add(baseCap);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;

      // Sculpted Arched Spider Leg (tapered die-cast profile)
      const legGroup = new THREE.Group();
      legGroup.rotation.y = angle;
      chairGroup.add(legGroup);

      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.024, 0.29), chairBaseMat);
      leg.position.set(0, 0.078, 0.155);
      leg.rotation.x = -0.06; // Downward rake towards caster
      legGroup.add(leg);

      // Polished top spine rib
      const legRib = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.26), chairChromeMat);
      legRib.position.set(0, 0.092, 0.155);
      legRib.rotation.x = -0.06;
      legGroup.add(legRib);

      // Caster Vertical Socket Sleeve
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.038, 12), chairFrameMat);
      socket.position.set(0, 0.054, 0.295);
      legGroup.add(socket);

      // Dual-Wheel Hooded Caster Assembly
      const casterGroup = new THREE.Group();
      casterGroup.position.set(0, 0.032, 0.295);
      legGroup.add(casterGroup);

      // Wheel hood / fork
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.028), chairFrameMat);
      hood.position.set(0, 0.012, 0);
      casterGroup.add(hood);

      // Left and Right Dual Polyurethane Wheels
      const wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 16), chairFrameMat);
      wheelL.rotation.z = Math.PI / 2;
      wheelL.position.set(-0.014, 0, 0);
      casterGroup.add(wheelL);

      const wheelR = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 16), chairFrameMat);
      wheelR.rotation.z = Math.PI / 2;
      wheelR.position.set(0.014, 0, 0);
      casterGroup.add(wheelR);

      // Chrome Axle Pin Hub
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.044, 12), chairChromeMat);
      axle.rotation.z = Math.PI / 2;
      casterGroup.add(axle);
    }

    // 2. Telescoping Hydraulic Gas Lift Piston
    const lowerPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.22, 20), chairFrameMat);
    lowerPiston.position.set(0, 0.21, 0);
    chairGroup.add(lowerPiston);

    const upperPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 20), chairChromeMat);
    upperPiston.position.set(0, 0.36, 0);
    chairGroup.add(upperPiston);

    const pistonCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.025, 20), chairBaseMat);
    pistonCollar.position.set(0, 0.32, 0);
    chairGroup.add(pistonCollar);

    // 3. Heavy-Duty Synchro-Tilt Mechanism & Under-Seat Chassis
    const tiltChassis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.26), chairFrameMat);
    tiltChassis.position.set(0, 0.45, 0.02);
    chairGroup.add(tiltChassis);

    // Forward tilt tension knob (knurled cylinder)
    const tensionKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.07, 16), chairBaseMat);
    tensionKnob.position.set(0, 0.42, -0.11);
    tensionKnob.rotation.x = 0.4;
    chairGroup.add(tensionKnob);

    // Right height adjustment paddle lever
    const leverStemR = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 12), chairChromeMat);
    leverStemR.rotation.z = Math.PI / 2;
    leverStemR.position.set(0.18, 0.44, 0.04);
    chairGroup.add(leverStemR);

    const leverPaddleR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.07), chairFrameMat);
    leverPaddleR.position.set(0.26, 0.44, 0.04);
    chairGroup.add(leverPaddleR);

    // Left recline limiter lever
    const leverStemL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 12), chairChromeMat);
    leverStemL.rotation.z = Math.PI / 2;
    leverStemL.position.set(-0.17, 0.44, 0.04);
    chairGroup.add(leverStemL);

    const leverPaddleL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.06), chairFrameMat);
    leverPaddleL.position.set(-0.24, 0.44, 0.04);
    chairGroup.add(leverPaddleL);

    // 4. Ergonomic Waterfall Contoured Seat Pan
    // Structural Perimeter Bezel Frame
    const seatFrameRear = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.048, 0.06), chairFrameMat);
    seatFrameRear.position.set(0, 0.525, 0.18);
    chairGroup.add(seatFrameRear);

    const seatFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.052, 0.40), chairFrameMat);
    seatFrameL.position.set(-0.23, 0.525, -0.01);
    chairGroup.add(seatFrameL);

    const seatFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.052, 0.40), chairFrameMat);
    seatFrameR.position.set(0.23, 0.525, -0.01);
    chairGroup.add(seatFrameR);

    // Pressure-relieving front waterfall roll (rounded forward drop)
    const seatWaterfall = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.44, 24), chairFrameMat);
    seatWaterfall.rotation.z = Math.PI / 2;
    seatWaterfall.position.set(0, 0.505, -0.22);
    chairGroup.add(seatWaterfall);

    // Breathable Tensile Woven Mesh Seat Pan (contoured saddle dish)
    const seatMeshPan = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.026, 0.38), chairMeshMat);
    seatMeshPan.position.set(0, 0.526, -0.01);
    chairGroup.add(seatMeshPan);

    // 5. Ergonomic S-Curved Breathable Mesh Backrest Frame
    // Contoured Composite Perimeter Loop Frame (Anatomical S-Curve Profile)
    const backStileL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.58, 16), chairFrameMat);
    backStileL.position.set(-0.21, 0.94, 0.175);
    backStileL.rotation.x = -0.11;
    chairGroup.add(backStileL);

    const backStileR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.58, 16), chairFrameMat);
    backStileR.position.set(0.21, 0.94, 0.175);
    backStileR.rotation.x = -0.11;
    chairGroup.add(backStileR);

    // Contoured Thoracic Shoulder Frame Arch
    const backTopArch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 16), chairFrameMat);
    backTopArch.rotation.z = Math.PI / 2;
    backTopArch.position.set(0, 1.22, 0.208);
    chairGroup.add(backTopArch);

    // Sacral Base Crossbar
    const backBottomBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 16), chairFrameMat);
    backBottomBar.rotation.z = Math.PI / 2;
    backBottomBar.position.set(0, 0.67, 0.145);
    chairGroup.add(backBottomBar);

    // Translucent High-Tensile Breathable Pellicle Mesh Membrane
    const backMeshPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.39, 0.54, 0.014),
      new THREE.MeshStandardMaterial({
        map: meshTexture,
        color: 0x24282c,
        roughness: 0.50,
        metalness: 0.25,
        transparent: true,
        opacity: 0.88,
        depthWrite: true
      })
    );
    backMeshPanel.position.set(0, 0.94, 0.175);
    backMeshPanel.rotation.x = -0.11;
    chairGroup.add(backMeshPanel);

    // 6. Biomorphic Wishbone Exoskeleton Spine (Engineered Arch Backbone)
    // Central Lumbo-Sacral Vertebra Trunk
    const spineTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.32, 0.042), chairBaseMat);
    spineTrunk.position.set(0, 0.65, 0.205);
    spineTrunk.rotation.x = -0.11;
    chairGroup.add(spineTrunk);

    // Neon Chartreuse Architectural Pinstripe on Vertebra
    const spineStripe = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.30, 0.008), chairAccentMat);
    spineStripe.position.set(0, 0.65, 0.228);
    spineStripe.rotation.x = -0.11;
    chairGroup.add(spineStripe);

    // Structural Wishbone Center Yoke
    const wishboneYoke = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.045, 16), chairChromeMat);
    wishboneYoke.position.set(0, 0.78, 0.22);
    chairGroup.add(wishboneYoke);

    // Contoured Wishbone Support Arms that seamlessly cradle the back frame
    const wishboneL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.31, 16), chairFrameMat);
    wishboneL.position.set(-0.095, 0.90, 0.215);
    wishboneL.rotation.z = -0.66;
    wishboneL.rotation.x = -0.11;
    chairGroup.add(wishboneL);

    const wishboneJointL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), chairChromeMat);
    wishboneJointL.position.set(-0.19, 1.02, 0.21);
    chairGroup.add(wishboneJointL);

    const wishboneR = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.31, 16), chairFrameMat);
    wishboneR.position.set(0.095, 0.90, 0.215);
    wishboneR.rotation.z = 0.66;
    wishboneR.rotation.x = -0.11;
    chairGroup.add(wishboneR);

    const wishboneJointR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), chairChromeMat);
    wishboneJointR.position.set(0.19, 1.02, 0.21);
    chairGroup.add(wishboneJointR);

    // 7. Dynamic PostureFit Dual-Wing Lumbar Support Cradle
    const lumbarBridge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.024, 0.020), chairFrameMat);
    lumbarBridge.position.set(0, 0.80, 0.20);
    chairGroup.add(lumbarBridge);

    // Anatomically Contoured Butterfly Lumbar Wings
    const lumbarPadL = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.088, 0.022), chairSoftMat);
    lumbarPadL.position.set(-0.095, 0.80, 0.195);
    lumbarPadL.rotation.y = 0.16;
    chairGroup.add(lumbarPadL);

    const lumbarPadR = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.088, 0.022), chairSoftMat);
    lumbarPadR.position.set(0.095, 0.80, 0.195);
    lumbarPadR.rotation.y = -0.16;
    chairGroup.add(lumbarPadR);

    // Polished Aluminum Knurled Depth Adjustment Dials
    const lumbarDialL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.024, 16), chairChromeMat);
    lumbarDialL.rotation.z = Math.PI / 2;
    lumbarDialL.position.set(-0.175, 0.80, 0.20);
    chairGroup.add(lumbarDialL);

    const lumbarDialR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.024, 16), chairChromeMat);
    lumbarDialR.rotation.z = Math.PI / 2;
    lumbarDialR.position.set(0.175, 0.80, 0.20);
    chairGroup.add(lumbarDialR);

    // 8. Articulated 4D Adjustable Armrests with Soft-Touch Sculpted Pads
    // Left Armrest Assembly
    const armMountL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.030, 0.040), chairBaseMat);
    armMountL.position.set(-0.24, 0.48, 0.02);
    chairGroup.add(armMountL);

    const armStanchionL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.22, 16), chairBaseMat);
    armStanchionL.position.set(-0.29, 0.62, 0.035);
    chairGroup.add(armStanchionL);

    const armCollarL = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.035, 16), chairChromeMat);
    armCollarL.position.set(-0.29, 0.69, 0.035);
    chairGroup.add(armCollarL);

    const armPadL = new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.028, 0.24), chairSoftMat);
    armPadL.position.set(-0.29, 0.742, 0.035);
    chairGroup.add(armPadL);

    // Rounded soft caps on arm pad
    const armCapFrontL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.028, 16, 1, false, 0, Math.PI), chairSoftMat);
    armCapFrontL.rotation.y = Math.PI;
    armCapFrontL.position.set(-0.29, 0.742, -0.085);
    chairGroup.add(armCapFrontL);

    // Right Armrest Assembly
    const armMountR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.030, 0.040), chairBaseMat);
    armMountR.position.set(0.24, 0.48, 0.02);
    chairGroup.add(armMountR);

    const armStanchionR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.22, 16), chairBaseMat);
    armStanchionR.position.set(0.29, 0.62, 0.035);
    chairGroup.add(armStanchionR);

    const armCollarR = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.035, 16), chairChromeMat);
    armCollarR.position.set(0.29, 0.69, 0.035);
    chairGroup.add(armCollarR);

    const armPadR = new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.028, 0.24), chairSoftMat);
    armPadR.position.set(0.29, 0.742, 0.035);
    chairGroup.add(armPadR);

    const armCapFrontR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.028, 16, 1, false, 0, Math.PI), chairSoftMat);
    armCapFrontR.rotation.y = Math.PI;
    armCapFrontR.position.set(0.29, 0.742, -0.085);
    chairGroup.add(armCapFrontR);

    // 9. Articulated Ergonomic Cervical Cradle Headrest Assembly
    const headRodL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 12), chairChromeMat);
    headRodL.position.set(-0.055, 1.28, 0.24);
    headRodL.rotation.x = -0.14;
    chairGroup.add(headRodL);

    const headRodR = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 12), chairChromeMat);
    headRodR.position.set(0.055, 1.28, 0.24);
    headRodR.rotation.x = -0.14;
    chairGroup.add(headRodR);

    // Articulating Dual-Pivot Hinge Knuckle
    const headPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 16), chairBaseMat);
    headPivot.rotation.z = Math.PI / 2;
    headPivot.position.set(0, 1.34, 0.26);
    chairGroup.add(headPivot);

    // Ergonomic Cervical Cradle Pad (Curved Headrest Center & Wings)
    const headrestCenter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.032), chairMeshMat);
    headrestCenter.position.set(0, 1.37, 0.275);
    headrestCenter.rotation.x = -0.14;
    chairGroup.add(headrestCenter);

    const headrestWingL = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.095, 0.026), chairSoftMat);
    headrestWingL.position.set(-0.11, 1.37, 0.265);
    headrestWingL.rotation.x = -0.14;
    headrestWingL.rotation.y = 0.28;
    chairGroup.add(headrestWingL);

    const headrestWingR = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.095, 0.026), chairSoftMat);
    headrestWingR.position.set(0.11, 1.37, 0.265);
    headrestWingR.rotation.x = -0.14;
    headrestWingR.rotation.y = -0.28;
    chairGroup.add(headrestWingR);

    // Dedicated Subtle Specular Highlight on Ergonomic Task Chair
    const chairHighlight = new THREE.PointLight(0x7dd3fc, 0.38, 3.4);
    chairHighlight.position.set(-0.55, 1.35, 0.85);
    rootGroup.add(chairHighlight);

    // Ambient floating particles
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 6.0;
      pPositions[i * 3 + 1] = 0.5 + Math.random() * 2.8;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xdfff00, size: 0.02, transparent: true, opacity: 0.5 })
    );
    rootGroup.add(particles);

    // ==========================================
    // 8. DYNAMIC MONITOR SCREENS GENERATION
    // ==========================================
    const codeLines = [
      '// JEET_PATEL // SYSTEM_ARCHITECT_v7.0',
      'import { QuantumMesh, TelemetryEngine } from "@system/core";',
      'const cluster = await QuantumMesh.connect({',
      '  protocol: "QUIC_MULTIPATH",',
      '  clusterRegion: "AP_SOUTH_MUMBAI",',
      '  failoverPolicy: "CONSENSUS_RAFT_STABLE"',
      '});',
      '// NEURAL INFERENCE ENGINE // LATENCY: 12.4ms',
      'const model = TelemetryEngine.loadWeights("TRANSFORMER_V4");',
      'model.optimizeGraph({ precision: "FP16_TENSOR" });',
      'await cluster.deployTelemetryPipeline("PROD_CLUSTER");',
      'console.log(">> SYSTEM READY // EXPLORE ROOM FREELY");',
      'stream.bindPort(3000).mountPortfolio();'
    ];
    let lineScroll = 0;

    const vertLines = [
      '[DOCKER] 32 containers healthy',
      '[GIT] commit 7f8a91c verified',
      '[CARGO] compiling core-mesh v2.4',
      '[K8S] pods balanced: 12/12',
      '[SECURITY] zero CVEs detected',
      '[CUDA] memory allocated: 22.4 GB',
      '[LATENCY] p99 = 14.2ms',
      '[BUILD] SUCCESS in 1.48s'
    ];

    const updateScreens = (time: number, isZooming: boolean) => {
      // 1. Center Screen
      cctx.fillStyle = '#0a0d0d';
      cctx.fillRect(0, 0, 1024, 640);
      cctx.fillStyle = '#161c1c';
      cctx.fillRect(0, 0, 1024, 52);
      cctx.fillStyle = '#dfff00';
      cctx.font = 'bold 20px monospace';
      cctx.fillText('[ TERMINAL: SYSTEM_ARCHITECT // BATTLESTATION_ROOT ]', 24, 34);
      cctx.fillStyle = '#a0ffa0';
      cctx.fillText('STATUS: ONLINE // GPU: RTX 4090', 700, 34);

      cctx.font = '22px monospace';
      const visibleLines = 11;
      const startIdx = Math.floor(lineScroll) % codeLines.length;
      for (let i = 0; i < visibleLines; i++) {
        const text = codeLines[(startIdx + i) % codeLines.length];
        if (text.startsWith('//')) cctx.fillStyle = '#dfff00';
        else if (text.includes('const') || text.includes('await') || text.includes('import')) cctx.fillStyle = '#a0ffa0';
        else cctx.fillStyle = '#e2e2e2';
        cctx.fillText(text, 32, 105 + i * 46);
      }

      if (Math.sin(time * 5) > 0) {
        cctx.fillStyle = '#dfff00';
        cctx.fillRect(660, 105 + 8 * 46 - 20, 14, 26);
      }

      if (isZooming) {
        cctx.fillStyle = `rgba(223, 255, 0, ${0.15 + Math.sin(time * 12) * 0.1})`;
        cctx.fillRect(0, 0, 1024, 640);
        cctx.fillStyle = '#ffffff';
        cctx.font = 'bold 28px monospace';
        cctx.fillText('>> SYNCHRONIZING WITH SYSTEM ARCHITECT PORTFOLIO...', 80, 580);
      }
      codeTexture.needsUpdate = true;

      // 2. Left Vertical Screen - AI Computer Vision & Image Visualization
      // User requested: "all screen on left side screen img visualization right screen with something"
      vctx.fillStyle = '#070a0c';
      vctx.fillRect(0, 0, 512, 800);

      // Top Title Bar
      vctx.fillStyle = '#161d22';
      vctx.fillRect(0, 0, 512, 46);
      vctx.fillStyle = '#dfff00';
      vctx.font = 'bold 18px "JetBrains Mono", monospace';
      vctx.fillText('[ AI_VISION // NEURAL_SEGMENTATION ]', 20, 30);
      vctx.fillStyle = '#00e5ff';
      vctx.font = 'bold 14px "JetBrains Mono", monospace';
      vctx.fillText('120 FPS // 3.2ms', 360, 30);

      // Main Image Visualization Viewport
      const imgX = 24, imgY = 58, imgW = 464, imgH = 340;
      vctx.fillStyle = '#0a1015';
      vctx.fillRect(imgX, imgY, imgW, imgH);
      vctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      vctx.lineWidth = 1.5;
      vctx.strokeRect(imgX, imgY, imgW, imgH);

      // Inner image background grid
      vctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      for (let gx = imgX; gx <= imgX + imgW; gx += 32) {
        vctx.beginPath(); vctx.moveTo(gx, imgY); vctx.lineTo(gx, imgY + imgH); vctx.stroke();
      }
      for (let gy = imgY; gy <= imgY + imgH; gy += 32) {
        vctx.beginPath(); vctx.moveTo(imgX, gy); vctx.lineTo(imgX + imgW, gy); vctx.stroke();
      }

      // Visualized Neural Object / Cyber Core
      const centerX = imgX + imgW / 2;
      const centerY = imgY + imgH / 2;

      // Segmentation mask gradient blob
      const segGrad = vctx.createRadialGradient(centerX - 30, centerY - 20, 10, centerX, centerY, 120);
      segGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      segGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.35)');
      segGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      vctx.fillStyle = segGrad;
      vctx.beginPath();
      vctx.ellipse(centerX, centerY, 110, 85, 0.2, 0, Math.PI * 2);
      vctx.fill();

      // Cybernetic wireframe subject contour
      vctx.strokeStyle = '#00e5ff';
      vctx.lineWidth = 2;
      vctx.beginPath();
      vctx.moveTo(centerX - 70, centerY - 50);
      vctx.lineTo(centerX + 70, centerY - 50);
      vctx.lineTo(centerX + 90, centerY + 40);
      vctx.lineTo(centerX, centerY + 80);
      vctx.lineTo(centerX - 90, centerY + 40);
      vctx.closePath();
      vctx.stroke();

      // Inner core rings
      vctx.strokeStyle = '#dfff00';
      vctx.lineWidth = 1.5;
      vctx.beginPath();
      vctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
      vctx.stroke();

      // Bounding Box 1 (Main target object)
      const b1x = centerX - 95, b1y = centerY - 75, b1w = 190, b1h = 165;
      vctx.strokeStyle = '#dfff00';
      vctx.lineWidth = 2;
      // Corner brackets style
      const cLen = 16;
      vctx.beginPath();
      vctx.moveTo(b1x, b1y + cLen); vctx.lineTo(b1x, b1y); vctx.lineTo(b1x + cLen, b1y);
      vctx.moveTo(b1x + b1w - cLen, b1y); vctx.lineTo(b1x + b1w, b1y); vctx.lineTo(b1x + b1w, b1y + cLen);
      vctx.moveTo(b1x, b1y + b1h - cLen); vctx.lineTo(b1x, b1y + b1h); vctx.lineTo(b1x + cLen, b1y + b1h);
      vctx.moveTo(b1x + b1w - cLen, b1y + b1h); vctx.lineTo(b1x + b1w, b1y + b1h); vctx.lineTo(b1x + b1w, b1y + b1h - cLen);
      vctx.stroke();

      // Bounding box tag
      vctx.fillStyle = '#dfff00';
      vctx.fillRect(b1x, b1y - 20, 160, 20);
      vctx.fillStyle = '#121414';
      vctx.font = 'bold 12px "JetBrains Mono", monospace';
      vctx.fillText('TARGET: 99.8% [CORE]', b1x + 6, b1y - 5);

      // Bounding Box 2 (Secondary feature detection)
      const b2x = imgX + 26, b2y = centerY + 10, b2w = 95, b2h = 75;
      vctx.strokeStyle = '#00e5ff';
      vctx.lineWidth = 1.5;
      vctx.strokeRect(b2x, b2y, b2w, b2h);
      vctx.fillStyle = '#00e5ff';
      vctx.fillRect(b2x, b2y - 18, 95, 18);
      vctx.fillStyle = '#080a0c';
      vctx.font = 'bold 11px "JetBrains Mono", monospace';
      vctx.fillText('ROI: 96.4%', b2x + 4, b2y - 4);

      // Real-time Scanning Laser Line
      const scanY = imgY + ((time * 110) % imgH);
      const laserGrad = vctx.createLinearGradient(imgX, scanY - 12, imgX, scanY);
      laserGrad.addColorStop(0, 'rgba(223, 255, 0, 0)');
      laserGrad.addColorStop(1, 'rgba(223, 255, 0, 0.4)');
      vctx.fillStyle = laserGrad;
      vctx.fillRect(imgX, scanY - 12, imgW, 12);
      vctx.strokeStyle = '#dfff00';
      vctx.lineWidth = 2;
      vctx.beginPath();
      vctx.moveTo(imgX, scanY); vctx.lineTo(imgX + imgW, scanY);
      vctx.stroke();

      // Convolution Feature Map Grid (8x filters)
      vctx.fillStyle = '#dfff00';
      vctx.font = 'bold 14px "JetBrains Mono", monospace';
      vctx.fillText('FEATURE_ACTIVATION_MAPS [8x CONV_FILTERS]', 24, 424);

      const fSize = 48, fGap = 10;
      for (let f = 0; f < 8; f++) {
        const fx = 24 + (f % 4) * (fSize + fGap + 12);
        const fy = 438 + Math.floor(f / 4) * (fSize + fGap);
        vctx.fillStyle = '#11181c';
        vctx.fillRect(fx, fy, fSize, fSize);
        vctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        vctx.lineWidth = 1;
        vctx.strokeRect(fx, fy, fSize, fSize);

        // Simulated activation heat dots
        const actVal = Math.sin(time * 3 + f * 1.5) * 0.5 + 0.5;
        vctx.fillStyle = f % 2 === 0 ? `rgba(223, 255, 0, ${actVal})` : `rgba(0, 229, 255, ${actVal})`;
        vctx.fillRect(fx + 6, fy + 6, fSize - 12, fSize - 12);
      }

      // Classification Probability Bars
      vctx.fillStyle = '#ffffff';
      vctx.font = '13px "JetBrains Mono", monospace';
      vctx.fillText('NEURAL_INFERENCE_CONFIDENCE:', 24, 580);

      const drawProbBar = (yPos: number, label: string, pct: number, col: string) => {
        vctx.fillStyle = '#94a3b8';
        vctx.font = '12px "JetBrains Mono", monospace';
        vctx.fillText(label, 24, yPos);
        vctx.fillStyle = '#161d22';
        vctx.fillRect(24, yPos + 6, 464, 14);
        vctx.fillStyle = col;
        vctx.fillRect(24, yPos + 6, 464 * pct, 14);
        vctx.fillStyle = '#ffffff';
        vctx.fillText(`${(pct * 100).toFixed(1)}%`, 430, yPos);
      };

      drawProbBar(602, 'OBJ_CLASSIFICATION', 0.994, '#dfff00');
      drawProbBar(638, 'FEATURE_EMBEDDING', 0.958, '#00e5ff');
      drawProbBar(674, 'DEPTH_ESTIMATION', 0.924, '#10b981');

      vctx.fillStyle = '#475569';
      vctx.font = '12px "JetBrains Mono", monospace';
      vctx.fillText('INPUT: 4K_RGB // TENSOR: CUDA_FP16 // LATENT: 512-DIM', 24, 735);
      vctx.fillStyle = '#00ff88';
      vctx.fillText('● REAL-TIME VISION INFERENCE STREAM ACTIVE', 24, 765);
      vertTexture.needsUpdate = true;

      // 3. Right Monitor - Systems Telemetry, Multi-Core Metrics & Radar Cockpit
      // User requested: "right screen with something"
      lctx.fillStyle = '#080a0c';
      lctx.fillRect(0, 0, 640, 480);

      // Top Title Bar
      lctx.fillStyle = '#14181c';
      lctx.fillRect(0, 0, 640, 44);
      lctx.fillStyle = '#dfff00';
      lctx.font = 'bold 17px "JetBrains Mono", monospace';
      lctx.fillText('[ CLUSTER_TELEMETRY // PERFORMANCE_COCKPIT ]', 20, 28);
      lctx.fillStyle = '#a0ffa0';
      lctx.font = 'bold 13px "JetBrains Mono", monospace';
      lctx.fillText('NODES: 32 ONLINE', 480, 28);

      // Left Half: Telemetry Waveforms Box
      const wBoxX = 20, wBoxY = 56, wBoxW = 360, wBoxH = 195;
      lctx.fillStyle = '#0d1115';
      lctx.fillRect(wBoxX, wBoxY, wBoxW, wBoxH);
      lctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      lctx.lineWidth = 1;
      lctx.strokeRect(wBoxX, wBoxY, wBoxW, wBoxH);

      // Grid lines inside waveform box
      for (let y = wBoxY + 30; y < wBoxY + wBoxH; y += 35) {
        lctx.beginPath(); lctx.moveTo(wBoxX, y); lctx.lineTo(wBoxX + wBoxW, y); lctx.stroke();
      }

      // Wave 1: Throughput (Yellow)
      lctx.beginPath();
      lctx.strokeStyle = '#dfff00';
      lctx.lineWidth = 2.5;
      for (let x = 0; x < wBoxW; x += 4) {
        const y = wBoxY + 70 + Math.sin(x * 0.035 + time * 3.5) * 32 + Math.cos(x * 0.02 - time * 2) * 12;
        if (x === 0) lctx.moveTo(wBoxX + x, y);
        else lctx.lineTo(wBoxX + x, y);
      }
      lctx.stroke();

      // Wave 2: GPU Load (Cyan)
      lctx.beginPath();
      lctx.strokeStyle = '#00e5ff';
      lctx.lineWidth = 2;
      for (let x = 0; x < wBoxW; x += 4) {
        const y = wBoxY + 130 + Math.sin(x * 0.05 - time * 2.8) * 22;
        if (x === 0) lctx.moveTo(wBoxX + x, y);
        else lctx.lineTo(wBoxX + x, y);
      }
      lctx.stroke();

      lctx.fillStyle = '#dfff00';
      lctx.font = 'bold 12px "JetBrains Mono", monospace';
      lctx.fillText('● THROUGHPUT: 450k req/s', wBoxX + 12, wBoxY + 22);
      lctx.fillStyle = '#00e5ff';
      lctx.fillText('● GPU TENSOR CORE: 94.2%', wBoxX + 180, wBoxY + 22);

      // Right Half: Circular Mesh Radar Scope
      const rCenterX = 515, rCenterY = 150, radarR = 68;
      lctx.fillStyle = '#0d1317';
      lctx.beginPath();
      lctx.arc(rCenterX, rCenterY, radarR, 0, Math.PI * 2);
      lctx.fill();
      lctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      lctx.lineWidth = 1.5;
      lctx.stroke();

      // Concentric rings
      lctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
      lctx.beginPath(); lctx.arc(rCenterX, rCenterY, radarR * 0.65, 0, Math.PI * 2); lctx.stroke();
      lctx.beginPath(); lctx.arc(rCenterX, rCenterY, radarR * 0.35, 0, Math.PI * 2); lctx.stroke();

      // Rotating Radar Sweep Line
      const sweepAngle = time * 2.8;
      lctx.strokeStyle = '#00e5ff';
      lctx.lineWidth = 2;
      lctx.beginPath();
      lctx.moveTo(rCenterX, rCenterY);
      lctx.lineTo(rCenterX + Math.cos(sweepAngle) * radarR, rCenterY + Math.sin(sweepAngle) * radarR);
      lctx.stroke();

      // Blinking Node Pings
      const pingNodes = [
        { angle: 0.5, dist: 0.75, col: '#dfff00' },
        { angle: 1.8, dist: 0.5, col: '#00e5ff' },
        { angle: 3.2, dist: 0.85, col: '#00ff88' },
        { angle: 4.5, dist: 0.4, col: '#dfff00' },
        { angle: 5.4, dist: 0.65, col: '#00e5ff' }
      ];
      pingNodes.forEach(pn => {
        const px = rCenterX + Math.cos(pn.angle) * (radarR * pn.dist);
        const py = rCenterY + Math.sin(pn.angle) * (radarR * pn.dist);
        lctx.fillStyle = pn.col;
        lctx.beginPath();
        lctx.arc(px, py, 3.5, 0, Math.PI * 2);
        lctx.fill();
      });

      lctx.fillStyle = '#94a3b8';
      lctx.font = '11px "JetBrains Mono", monospace';
      lctx.textAlign = 'center';
      lctx.fillText('MESH_RADAR_SCOPE', rCenterX, rCenterY + radarR + 18);
      lctx.textAlign = 'left';

      // Bottom Metrics & 8-Core CPU Bar Histogram
      lctx.fillStyle = '#ffffff';
      lctx.font = 'bold 13px "JetBrains Mono", monospace';
      lctx.fillText('CPU CORE LOAD [8-CORES]:', 20, 280);

      for (let c = 0; c < 8; c++) {
        const barX = 20 + c * 46;
        const barH = 30 + Math.sin(time * 4 + c * 1.8) * 22;
        lctx.fillStyle = '#1a2228';
        lctx.fillRect(barX, 350 - 55, 36, 55);
        lctx.fillStyle = c % 2 === 0 ? '#dfff00' : '#00e5ff';
        lctx.fillRect(barX, 350 - barH, 36, barH);
        lctx.fillStyle = '#94a3b8';
        lctx.font = '10px "JetBrains Mono", monospace';
        lctx.fillText(`C${c}`, barX + 8, 368);
      }

      // Memory & Event Logs
      lctx.fillStyle = '#ffffff';
      lctx.font = '12px "JetBrains Mono", monospace';
      lctx.fillText('RAM: 28.4 / 32 GB (88.7%)', 400, 280);
      lctx.fillStyle = '#161d22';
      lctx.fillRect(400, 290, 220, 10);
      lctx.fillStyle = '#dfff00';
      lctx.fillRect(400, 290, 220 * 0.887, 10);

      lctx.fillStyle = '#94a3b8';
      lctx.font = '11px "JetBrains Mono", monospace';
      lctx.fillText('>_ [QUIC] ingress packet stream: 0 loss', 20, 405);
      lctx.fillText('>_ [RAFT] term 4819 accepted by all quorums', 20, 428);
      lctx.fillText('>_ [CUDA] tensor inference batch: 1.2ms latency', 20, 451);
      sideTexture.needsUpdate = true;
    };

    updateScreens(0, false);

    // Kawaii Drone expressions
    const droneFaces = ['( ^ _ ^ )', '( •̀ ω •́ )✧', '( ˘ ³˘)♥', '( ◕ ‿ ◕ )', '( > ‿ < )', '( ⌐■_■ )'];
    let lastDroneFaceTime = 0;

    // ==========================================
    // 9. ANIMATION & RENDER LOOP (OPTIMIZED 60FPS)
    // ==========================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;
    let isSceneVisible = true;

    // IntersectionObserver to pause rendering when scrolled away from Hero
    const visibilityObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          isSceneVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.01 }
    );
    visibilityObserver.observe(container);

    let smoothedSp = 0;
    let lastScreenUpdateTime = 0;

    const tick = () => {
      if (isDisposed) return;

      // When the 3D room is completely scrolled off-screen, sleep to save 100% GPU/CPU for page scrolling!
      if (!isSceneVisible && !isFullscreen) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsedTime = clock.getElapsedTime();

      // Spin PC fans smoothly
      pcFansRef.current.forEach((fan, idx) => {
        fan.rotation.z += delta * (14 + idx * 2);
      });

      // Animate curling coffee steam particles (smooth organic drift)
      if (steamParticlesRef.current) {
        const posAttr = steamParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < 18; i++) {
          let y = posAttr.getY(i) + delta * 0.07;
          if (y > 1.18) y = 0.98;
          posAttr.setY(i, y);
          posAttr.setX(i, -0.35 + Math.sin(elapsedTime * 2.5 + i * 0.5) * 0.014);
          posAttr.setZ(i, -0.08 + Math.cos(elapsedTime * 2.2 + i * 0.4) * 0.014);
        }
        posAttr.needsUpdate = true;
      }

      // Smooth scroll dive into monitor screen
      const currentScroll = scrollProgressRef.current;
      smoothedSp = THREE.MathUtils.damp(smoothedSp, currentScroll, 12.0, delta);

      if (smoothedSp > 0.005) {
        const t = easeInOutCubic(Math.min(smoothedSp, 1.0));
        _currentTargetPos.lerpVectors(_camStartPos, _camScreenPos, t);
        _currentLookAt.lerpVectors(_camStartLook, _camScreenLook, t);

        camera.position.copy(_currentTargetPos);
        controls.target.copy(_currentLookAt);

        if (smoothedSp >= 0.98 && onDiveComplete) {
          onDiveComplete();
        }
      } else if (!isFullscreen) {
        // Stylized animated camera breathing idle: gives the room a warm, living Pixar-style diorama feeling
        const breathX = Math.sin(elapsedTime * 0.75) * 0.018;
        const breathY = Math.cos(elapsedTime * 0.95) * 0.012;
        camera.position.x = _camStartPos.x + breathX;
        camera.position.y = _camStartPos.y + breathY;
      }

      controls.update();

      // STRICT CAMERA CLAMPING: Camera MUST stay inside room and never cross wall/window!
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -3.8, 3.8);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.45, 3.6);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -2.8, 3.2);

      // Rotate deep space celestial elements smoothly
      planetMesh.rotation.y += delta * 0.015;
      stationGroup.rotation.y += delta * 0.025;
      beaconRedMat.color.setHex(Math.sin(elapsedTime * 6.0) > 0.4 ? 0xff3b30 : 0x400500);
      beaconCyanMat.color.setHex(Math.sin(elapsedTime * 6.0 + Math.PI) > 0.4 ? 0x00f0ff : 0x003344);

      // Gentle floating particles
      particles.rotation.y = elapsedTime * 0.02;

      // Update screen textures at controlled 10 FPS rate to eliminate WebGL texture upload stutters
      lineScroll += delta * 1.5;
      if (elapsedTime - lastScreenUpdateTime > 0.1) {
        lastScreenUpdateTime = elapsedTime;
        updateScreens(elapsedTime, smoothedSp > 0.4);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      if (isSoftwareGl) clearTimeout(frameId);
      else cancelAnimationFrame(frameId);

      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      // Dispose Three.js objects
      controls.dispose();
      renderer.dispose();
      floorTexture.dispose();
      rugTexture.dispose();
      codeTexture.dispose();
      vertTexture.dispose();
      sideTexture.dispose();
      signTexture.dispose();
      matTexture.dispose();
      spaceTexture.dispose();
      planetTexture.dispose();
      ringTexture.dispose();
      hudTexture.dispose();
      meshTexture.dispose();
      shadowTexture.dispose();
      deskTopGeo.dispose();
      pGeo.dispose();
      starGeo.dispose();
      cosmicGeo.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* 3D WebGL Canvas Mount Container - Clean and 100% unobstructed view! */}
      <div ref={mountRef} className="w-full h-full relative cursor-grab active:cursor-grabbing" />
    </div>
  );
};
