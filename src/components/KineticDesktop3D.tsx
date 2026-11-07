import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface KineticDesktop3DProps {
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  scrollProgress?: number; // 0 (wide desktop) -> 1 (fully zoomed into screen)
  onDiveComplete?: () => void;
}

// Module-level reusable math objects for zero garbage collection
const _targetLook = new THREE.Vector3();
const _headTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3();
const _camStartPos = new THREE.Vector3(2.35, 1.75, 2.75);
const _camStartLook = new THREE.Vector3(0, 1.05, 0);
const _camScreenPos = new THREE.Vector3(0.0, 1.35, -0.14);
const _camScreenLook = new THREE.Vector3(0.0, 1.35, -0.50);
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
  const [viewPreset] = useState<'hero' | 'figure' | 'screens' | 'orbit'>('hero');
  const [lightingPreset] = useState<'norris' | 'cyberpunk' | 'matrix' | 'stealth'>('norris');
  const [isTyping] = useState(true);

  // References for render loop coordination
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // References to animated character parts
  const headGroupRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const ahogeRef = useRef<THREE.Group | null>(null);
  const droneRef = useRef<THREE.Group | null>(null);
  const droneRingsRef = useRef<THREE.Group | null>(null);
  const droneEyeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const droneEyeTexRef = useRef<THREE.CanvasTexture | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceTexRef = useRef<THREE.CanvasTexture | null>(null);
  const mainScreenTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const sideScreenTextureRef = useRef<THREE.CanvasTexture | null>(null);

  const lightsRef = useRef<{
    keyLight: THREE.DirectionalLight;
    pointLight: THREE.PointLight;
    accentLight: THREE.PointLight;
    deskGlow: THREE.PointLight;
  } | null>(null);

  const pointerPos = useRef({ x: 0, y: 0 });
  const scrollProgressRef = useRef(scrollProgress);
  scrollProgressRef.current = scrollProgress;

  // Camera target animation
  const cameraTargetPos = useRef(new THREE.Vector3(2.35, 1.75, 2.75));
  const cameraLookAtPos = useRef(new THREE.Vector3(0, 1.05, 0));

  // Change camera position based on preset when not scrolling
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    if (scrollProgressRef.current > 0.05) return; // scroll overrides presets

    if (viewPreset === 'hero') {
      cameraTargetPos.current.set(2.35, 1.75, 2.75);
      cameraLookAtPos.current.set(0, 1.05, 0);
    } else if (viewPreset === 'figure') {
      cameraTargetPos.current.set(0.45, 1.38, 1.35);
      cameraLookAtPos.current.set(0, 1.25, 0.2);
    } else if (viewPreset === 'screens') {
      cameraTargetPos.current.set(0.0, 1.38, 1.4);
      cameraLookAtPos.current.set(0, 1.25, -0.4);
    }
  }, [viewPreset]);

  // Adjust lights on theme preset change
  useEffect(() => {
    if (!lightsRef.current) return;
    const { keyLight, pointLight, accentLight, deskGlow } = lightsRef.current;
    if (lightingPreset === 'norris') {
      keyLight.color.set('#ffffff');
      pointLight.color.set('#dfff00'); // Norris yellow
      accentLight.color.set('#dfff00');
      deskGlow.color.set('#dfff00');
    } else if (lightingPreset === 'cyberpunk') {
      keyLight.color.set('#00f0ff');
      pointLight.color.set('#ff0077');
      accentLight.color.set('#00ffff');
      deskGlow.color.set('#ff00aa');
    } else if (lightingPreset === 'matrix') {
      keyLight.color.set('#a0ffa0');
      pointLight.color.set('#00ff66');
      accentLight.color.set('#00ff44');
      deskGlow.color.set('#00ff88');
    } else if (lightingPreset === 'stealth') {
      keyLight.color.set('#ffffff');
      pointLight.color.set('#888888');
      accentLight.color.set('#ffffff');
      deskGlow.color.set('#444444');
    }
  }, [lightingPreset]);

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
    scene.background = new THREE.Color(0x0e1010);
    scene.fog = new THREE.FogExp2(0x0e1010, 0.12);

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
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Room Environment for PBR Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 0.8;
    controls.maxDistance = 6.5;
    controls.target.copy(_camStartLook);
    controlsRef.current = controls;

    let isUserInteracting = false;
    controls.addEventListener('start', () => { isUserInteracting = true; });
    controls.addEventListener('end', () => { isUserInteracting = false; });

    // 6. Balanced Studio Lights
    const hemiLight = new THREE.HemisphereLight(0x445566, 0x111111, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(3, 5, 3);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const pointLight = new THREE.PointLight(0xdfff00, 2.8, 5); // Norris Yellow hero rim light
    pointLight.position.set(-1.8, 2.2, 1.5);
    scene.add(pointLight);

    const accentLight = new THREE.PointLight(0xdfff00, 3.4, 4); // Screen glow
    accentLight.position.set(0, 1.35, -0.2);
    scene.add(accentLight);

    const deskGlow = new THREE.PointLight(0xdfff00, 1.6, 3); // Under-desk accent
    deskGlow.position.set(0, 0.4, 0.3);
    scene.add(deskGlow);

    lightsRef.current = { keyLight, pointLight, accentLight, deskGlow };

    // ==========================================
    // 7. BUILD PROCEDURAL 3D KINETIC DESKTOP SCENE
    // ==========================================
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // --- A. Grid Floor & Platform ---
    const floorGeo = new THREE.PlaneGeometry(16, 16, 32, 32);
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    fctx.fillStyle = '#101212';
    fctx.fillRect(0, 0, 512, 512);
    fctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    fctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      fctx.beginPath();
      fctx.moveTo(i, 0); fctx.lineTo(i, 512);
      fctx.moveTo(0, i); fctx.lineTo(512, i);
      fctx.stroke();
    }
    // Yellow hazard lines
    fctx.strokeStyle = 'rgba(223, 255, 0, 0.25)';
    fctx.lineWidth = 2;
    fctx.strokeRect(128, 128, 256, 256);
    fctx.strokeRect(192, 192, 128, 128);

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);
    floorTexture.colorSpace = THREE.SRGBColorSpace;

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.2
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    rootGroup.add(floorMesh);

    // Contact shadow
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.005;
    shadowMesh.position.z = 0.1;
    rootGroup.add(shadowMesh);

    // --- B. Cyberpunk Kinetic Desk ---
    const deskGroup = new THREE.Group();
    rootGroup.add(deskGroup);

    // Chamfered Desk Surface (High tech carbon finish)
    const deskShape = new THREE.Shape();
    deskShape.moveTo(-1.25, -0.45);
    deskShape.lineTo(1.25, -0.45);
    deskShape.lineTo(1.35, -0.3);
    deskShape.lineTo(1.25, 0.45);
    deskShape.lineTo(-1.25, 0.45);
    deskShape.lineTo(-1.35, -0.3);
    deskShape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2
    };
    const deskTopGeo = new THREE.ExtrudeGeometry(deskShape, extrudeSettings);
    deskTopGeo.rotateX(Math.PI / 2);

    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x161818,
      roughness: 0.35,
      metalness: 0.8
    });
    const deskTop = new THREE.Mesh(deskTopGeo, deskMat);
    deskTop.position.set(0, 0.85, -0.2);
    deskTop.castShadow = !isSoftwareGl;
    deskTop.receiveShadow = !isSoftwareGl;
    deskGroup.add(deskTop);

    // Yellow glowing front edge
    const edgeTrimGeo = new THREE.BoxGeometry(2.5, 0.012, 0.02);
    const edgeTrimMat = new THREE.MeshStandardMaterial({
      color: 0xdfff00,
      emissive: 0xdfff00,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });
    const edgeTrim = new THREE.Mesh(edgeTrimGeo, edgeTrimMat);
    edgeTrim.position.set(0, 0.85, 0.25);
    deskGroup.add(edgeTrim);

    // Aerodynamic Carbon Legs
    const legGeo = new THREE.BoxGeometry(0.06, 0.85, 0.7);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222424, roughness: 0.4, metalness: 0.85 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-1.1, 0.425, -0.2);
    deskGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(1.1, 0.425, -0.2);
    deskGroup.add(legR);

    // --- C. Holographic Triple Monitors with Live Canvas Content ---
    // 1. Center Monitor (The portal into the portfolio!)
    const codeCanvas = document.createElement('canvas');
    codeCanvas.width = 1024;
    codeCanvas.height = 640;
    const cctx = codeCanvas.getContext('2d')!;
    const codeTexture = new THREE.CanvasTexture(codeCanvas);
    codeTexture.colorSpace = THREE.SRGBColorSpace;
    mainScreenTextureRef.current = codeTexture;

    const screenMatCenter = new THREE.MeshStandardMaterial({
      map: codeTexture,
      emissiveMap: codeTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.1
    });

    const screenGeoCenter = new THREE.PlaneGeometry(1.05, 0.62);
    const screenCenter = new THREE.Mesh(screenGeoCenter, screenMatCenter);
    screenCenter.position.set(0, 1.35, -0.5);
    deskGroup.add(screenCenter);

    // Monitor Bezel Frame
    const frameGeoCenter = new THREE.BoxGeometry(1.08, 0.65, 0.02);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111313, roughness: 0.5, metalness: 0.9 });
    const frameCenter = new THREE.Mesh(frameGeoCenter, frameMat);
    frameCenter.position.set(0, 1.35, -0.51);
    deskGroup.add(frameCenter);

    // Monitor Stand
    const standGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.45, 12);
    const standMesh = new THREE.Mesh(standGeo, frameMat);
    standMesh.position.set(0, 1.05, -0.52);
    deskGroup.add(standMesh);

    // 2. Left Monitor (Curved Angle)
    const leftCanvas = document.createElement('canvas');
    leftCanvas.width = 512;
    leftCanvas.height = 420;
    const lctx = leftCanvas.getContext('2d')!;
    const leftTexture = new THREE.CanvasTexture(leftCanvas);
    leftTexture.colorSpace = THREE.SRGBColorSpace;
    sideScreenTextureRef.current = leftTexture;

    const screenMatSide = new THREE.MeshStandardMaterial({
      map: leftTexture,
      emissiveMap: leftTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.88,
      roughness: 0.2
    });

    const screenGeoSide = new THREE.PlaneGeometry(0.72, 0.52);
    const screenLeft = new THREE.Mesh(screenGeoSide, screenMatSide);
    screenLeft.position.set(-0.88, 1.35, -0.38);
    screenLeft.rotation.y = Math.PI / 5.5;
    deskGroup.add(screenLeft);

    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.02), frameMat);
    frameLeft.position.set(-0.88, 1.35, -0.39);
    frameLeft.rotation.y = Math.PI / 5.5;
    deskGroup.add(frameLeft);

    // 3. Right Monitor
    const screenRight = new THREE.Mesh(screenGeoSide, screenMatSide);
    screenRight.position.set(0.88, 1.35, -0.38);
    screenRight.rotation.y = -Math.PI / 5.5;
    deskGroup.add(screenRight);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.02), frameMat);
    frameRight.position.set(0.88, 1.35, -0.39);
    frameRight.rotation.y = -Math.PI / 5.5;
    deskGroup.add(frameRight);

    // --- D. Mechanical Cyber Keyboard & Trackpad ---
    const kbBaseGeo = new THREE.BoxGeometry(0.48, 0.015, 0.17);
    const kbBaseMat = new THREE.MeshStandardMaterial({ color: 0x181a1a, roughness: 0.4, metalness: 0.7 });
    const kbBase = new THREE.Mesh(kbBaseGeo, kbBaseMat);
    kbBase.position.set(0, 0.88, 0.02);
    deskGroup.add(kbBase);

    // Glowing key matrix with InstancedMesh
    const keyGeo = new THREE.BoxGeometry(0.022, 0.01, 0.022);
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0x242828,
      emissive: 0xdfff00,
      emissiveIntensity: 0.4,
      roughness: 0.3
    });
    const keyRows = 5;
    const keyCols = 14;
    const keyMesh = new THREE.InstancedMesh(keyGeo, keyMat, keyRows * keyCols);
    const dummy = new THREE.Object3D();
    let keyIdx = 0;
    for (let r = 0; r < keyRows; r++) {
      for (let c = 0; c < keyCols; c++) {
        const kx = -0.2 + c * 0.03;
        const kz = -0.055 + r * 0.028;
        dummy.position.set(kx, 0.895, 0.02 + kz);
        dummy.updateMatrix();
        keyMesh.setMatrixAt(keyIdx++, dummy.matrix);
      }
    }
    keyMesh.instanceMatrix.needsUpdate = true;
    deskGroup.add(keyMesh);

    // Cyber Trackpad
    const padGeo = new THREE.PlaneGeometry(0.24, 0.18);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x141616, roughness: 0.3, metalness: 0.6 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0.38, 0.88, 0.02);
    deskGroup.add(pad);

    // Cyber Mug
    const mugGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.08, 16);
    const mugMat = new THREE.MeshStandardMaterial({ color: 0x121414, roughness: 0.4, metalness: 0.8 });
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.set(-0.38, 0.91, -0.05);
    deskGroup.add(mug);

    const mugBandGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.015, 16);
    const mugBandMat = new THREE.MeshStandardMaterial({ color: 0xdfff00, emissive: 0xdfff00, emissiveIntensity: 0.6 });
    const mugBand = new THREE.Mesh(mugBandGeo, mugBandMat);
    mugBand.position.set(-0.38, 0.93, -0.05);
    deskGroup.add(mugBand);

    // --- E. Cyber Ergonomic Cockpit Chair ---
    const chairGroup = new THREE.Group();
    rootGroup.add(chairGroup);
    chairGroup.position.set(0, 0, 0.46);

    const seatGeo = new THREE.BoxGeometry(0.52, 0.08, 0.5);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1c1e1e, roughness: 0.7, metalness: 0.2 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.65, 0);
    chairGroup.add(seat);

    const backGeo = new THREE.BoxGeometry(0.46, 0.64, 0.06);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x181a1a, roughness: 0.6, metalness: 0.3 });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, 1.0, 0.23);
    back.rotation.x = -0.08;
    chairGroup.add(back);

    const headrestGeo = new THREE.BoxGeometry(0.3, 0.16, 0.08);
    const headrest = new THREE.Mesh(headrestGeo, backMat);
    headrest.position.set(0, 1.38, 0.26);
    chairGroup.add(headrest);

    // ==========================================
    // --- F. UPGRADED HIGH-FIDELITY ANIME FIGURE ---
    // (Detailed anime proportions, expressive face, layered hair & mecha ears)
    // ==========================================
    const animeFigureGroup = new THREE.Group();
    rootGroup.add(animeFigureGroup);
    animeFigureGroup.position.set(0, 0.68, 0.42);

    // Porcelain Anime Skin
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffede3,
      roughness: 0.55,
      metalness: 0.04
    });

    // Dark cyberpunk tactical hoodie
    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x131516,
      roughness: 0.65,
      metalness: 0.3
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xdfff00,
      emissive: 0xdfff00,
      emissiveIntensity: 0.65,
      roughness: 0.3
    });

    // 1. Seated Legs
    const thighGeo = new THREE.CylinderGeometry(0.068, 0.062, 0.38, 12);
    thighGeo.rotateX(Math.PI / 2);
    const legLMesh = new THREE.Mesh(thighGeo, jacketMat);
    legLMesh.position.set(-0.12, 0.03, -0.15);
    animeFigureGroup.add(legLMesh);

    const legRMesh = new THREE.Mesh(thighGeo, jacketMat);
    legRMesh.position.set(0.12, 0.03, -0.15);
    animeFigureGroup.add(legRMesh);

    const shinGeo = new THREE.CylinderGeometry(0.052, 0.046, 0.45, 12);
    const shinL = new THREE.Mesh(shinGeo, jacketMat);
    shinL.position.set(-0.12, -0.32, -0.32);
    animeFigureGroup.add(shinL);

    const shinR = new THREE.Mesh(shinGeo, jacketMat);
    shinR.position.set(0.12, -0.32, -0.32);
    animeFigureGroup.add(shinR);

    // Cyber high-top sneakers with yellow soles
    const shoeGeo = new THREE.BoxGeometry(0.088, 0.07, 0.18);
    const shoeL = new THREE.Mesh(shoeGeo, trimMat);
    shoeL.position.set(-0.12, -0.58, -0.28);
    animeFigureGroup.add(shoeL);

    const shoeR = new THREE.Mesh(shoeGeo, trimMat);
    shoeR.position.set(0.12, -0.58, -0.28);
    animeFigureGroup.add(shoeR);

    // 2. Torso (Oversized Cyber Techwear Hoodie)
    const torsoGroup = new THREE.Group();
    animeFigureGroup.add(torsoGroup);
    torsoGroup.position.set(0, 0.15, 0);

    const chestGeo = new THREE.CylinderGeometry(0.13, 0.105, 0.34, 16);
    const chest = new THREE.Mesh(chestGeo, jacketMat);
    chest.position.set(0, 0.16, 0);
    chest.castShadow = !isSoftwareGl;
    torsoGroup.add(chest);

    // High ribbed tactical collar
    const collarGeo = new THREE.TorusGeometry(0.095, 0.04, 12, 24);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, jacketMat);
    collar.position.set(0, 0.34, 0);
    torsoGroup.add(collar);

    // Cyber choker with yellow LED node
    const chokerGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.02, 16);
    const chokerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
    const choker = new THREE.Mesh(chokerGeo, chokerMat);
    choker.position.set(0, 0.38, 0);
    torsoGroup.add(choker);

    const chokerNodeGeo = new THREE.BoxGeometry(0.015, 0.015, 0.01);
    const chokerNode = new THREE.Mesh(chokerNodeGeo, trimMat);
    chokerNode.position.set(0, 0.38, 0.048);
    torsoGroup.add(chokerNode);

    // Tactical harness straps
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.28, 0.01), trimMat);
    strapL.position.set(-0.06, 0.17, 0.115);
    torsoGroup.add(strapL);

    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.28, 0.01), trimMat);
    strapR.position.set(0.06, 0.17, 0.115);
    torsoGroup.add(strapR);

    // 3. Head & Expressive Anime Face
    const headGroup = new THREE.Group();
    headGroupRef.current = headGroup;
    headGroup.position.set(0, 0.44, 0);
    torsoGroup.add(headGroup);

    // Anime Head with tapered chin
    const headGeo = new THREE.SphereGeometry(0.12, 24, 20);
    headGeo.scale(0.96, 1.14, 0.96);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0.07, 0);
    headGroup.add(head);

    // Cute anime chin wedge
    const chinGeo = new THREE.ConeGeometry(0.04, 0.06, 4);
    chinGeo.rotateX(Math.PI);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, -0.05, 0.06);
    headGroup.add(chin);

    // --- HIGH RESOLUTION ANIME FACE CANVAS TEXTURE ---
    // Generates beautiful anime eyes with gradients, highlights, blush, and eyelashes
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    faceCanvasRef.current = faceCanvas;
    const fCtx = faceCanvas.getContext('2d')!;

    const drawAnimeFace = (blinkProgress: number = 0) => {
      fCtx.clearRect(0, 0, 512, 512);

      // Cheeks Blush
      const blushGradL = fCtx.createRadialGradient(140, 310, 5, 140, 310, 45);
      blushGradL.addColorStop(0, 'rgba(255, 130, 160, 0.45)');
      blushGradL.addColorStop(1, 'rgba(255, 130, 160, 0)');
      fCtx.fillStyle = blushGradL;
      fCtx.fillRect(90, 260, 100, 100);

      const blushGradR = fCtx.createRadialGradient(372, 310, 5, 372, 310, 45);
      blushGradR.addColorStop(0, 'rgba(255, 130, 160, 0.45)');
      blushGradR.addColorStop(1, 'rgba(255, 130, 160, 0)');
      fCtx.fillStyle = blushGradR;
      fCtx.fillRect(322, 260, 100, 100);

      // Cute anime nose dot
      fCtx.fillStyle = 'rgba(220, 140, 140, 0.7)';
      fCtx.beginPath();
      fCtx.arc(256, 315, 3.5, 0, Math.PI * 2);
      fCtx.fill();

      // Focused anime lips with subtle smile
      fCtx.strokeStyle = 'rgba(210, 110, 120, 0.85)';
      fCtx.lineWidth = 3.5;
      fCtx.lineCap = 'round';
      fCtx.beginPath();
      fCtx.arc(256, 345, 16, 0.15 * Math.PI, 0.85 * Math.PI);
      fCtx.stroke();

      // Draw Anime Eyes (Left eye center ~170, Right eye center ~342)
      const eyeCenters = [170, 342];
      const eyeY = 240;

      eyeCenters.forEach((cx, idx) => {
        const isLeft = idx === 0;

        // Eyebrows
        fCtx.strokeStyle = '#22252a';
        fCtx.lineWidth = 4;
        fCtx.beginPath();
        if (isLeft) {
          fCtx.moveTo(cx - 45, eyeY - 60);
          fCtx.quadraticCurveTo(cx, eyeY - 72, cx + 45, eyeY - 55);
        } else {
          fCtx.moveTo(cx - 45, eyeY - 55);
          fCtx.quadraticCurveTo(cx, eyeY - 72, cx + 45, eyeY - 60);
        }
        fCtx.stroke();

        // If blinking
        if (blinkProgress > 0.6) {
          // Closed eyelid line
          fCtx.strokeStyle = '#181a1e';
          fCtx.lineWidth = 6;
          fCtx.beginPath();
          fCtx.arc(cx, eyeY, 40, 0.2 * Math.PI, 0.8 * Math.PI);
          fCtx.stroke();
          return;
        }

        // Eye White (Sclera)
        fCtx.fillStyle = '#ffffff';
        fCtx.beginPath();
        fCtx.ellipse(cx, eyeY, 44, 48 * (1 - blinkProgress * 0.8), 0, 0, Math.PI * 2);
        fCtx.fill();

        // Iris Gradient (Deep violet-black to electric Norris Yellow/Cyan)
        fCtx.save();
        fCtx.beginPath();
        fCtx.ellipse(cx, eyeY + 4, 34, 40 * (1 - blinkProgress * 0.8), 0, 0, Math.PI * 2);
        fCtx.clip();

        const irisGrad = fCtx.createLinearGradient(cx, eyeY - 30, cx, eyeY + 40);
        irisGrad.addColorStop(0, '#101222');
        irisGrad.addColorStop(0.4, '#1b2640');
        irisGrad.addColorStop(0.7, '#00d4ff');
        irisGrad.addColorStop(1, '#dfff00');
        fCtx.fillStyle = irisGrad;
        fCtx.fillRect(cx - 40, eyeY - 40, 80, 80);

        // Pupil
        fCtx.fillStyle = '#0a0b12';
        fCtx.beginPath();
        fCtx.ellipse(cx, eyeY + 6, 16, 20 * (1 - blinkProgress * 0.8), 0, 0, Math.PI * 2);
        fCtx.fill();

        // Cyber iris ring glow
        fCtx.strokeStyle = 'rgba(223, 255, 0, 0.6)';
        fCtx.lineWidth = 2;
        fCtx.stroke();

        // Specular Catchlights (Iconic Anime Eye Glint)
        fCtx.fillStyle = '#ffffff';
        fCtx.beginPath();
        fCtx.ellipse(cx - 10, eyeY - 8, 9, 13 * (1 - blinkProgress * 0.8), -0.2, 0, Math.PI * 2);
        fCtx.fill();

        fCtx.beginPath();
        fCtx.arc(cx + 12, eyeY + 12, 5, 0, Math.PI * 2);
        fCtx.fill();

        fCtx.restore();

        // Upper Anime Eyelash curve with wing
        fCtx.strokeStyle = '#121418';
        fCtx.lineWidth = 7;
        fCtx.lineCap = 'round';
        fCtx.beginPath();
        fCtx.arc(cx, eyeY - 4, 44, 1.15 * Math.PI, 1.85 * Math.PI);
        fCtx.stroke();

        // Eyelash wing flick
        fCtx.lineWidth = 5;
        fCtx.beginPath();
        if (isLeft) {
          fCtx.moveTo(cx - 38, eyeY - 20);
          fCtx.lineTo(cx - 52, eyeY - 30);
        } else {
          fCtx.moveTo(cx + 38, eyeY - 20);
          fCtx.lineTo(cx + 52, eyeY - 30);
        }
        fCtx.stroke();

        // Lower eyelash hint
        fCtx.strokeStyle = '#343840';
        fCtx.lineWidth = 2.5;
        fCtx.beginPath();
        fCtx.arc(cx, eyeY + 18, 30, 0.3 * Math.PI, 0.7 * Math.PI);
        fCtx.stroke();
      });
    };

    drawAnimeFace(0);

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTexRef.current = faceTex;

    const facePlaneGeo = new THREE.PlaneGeometry(0.19, 0.19);
    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
      depthWrite: false
    });
    const faceMesh = new THREE.Mesh(facePlaneGeo, faceMat);
    faceMesh.position.set(0, 0.08, 0.106);
    headGroup.add(faceMesh);

    // --- TRANSLUCENT HOLOGRAPHIC GOGGLES / VISOR ---
    // Stylish anime hacker visor resting over her brow so her anime eyes shine through!
    const visorGeo = new THREE.BoxGeometry(0.18, 0.038, 0.03);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xdfff00,
      emissive: 0xdfff00,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.6
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.115, 0.115);
    headGroup.add(visor);

    // Glowing edge frame for visor
    const visorFrameGeo = new THREE.BoxGeometry(0.184, 0.008, 0.032);
    const visorFrame = new THREE.Mesh(visorFrameGeo, trimMat);
    visorFrame.position.set(0, 0.134, 0.115);
    headGroup.add(visorFrame);

    // --- STYLIZED LAYERED ANIME HAIR ---
    // Deep obsidian-indigo hair with neon Norris Yellow edge tips
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x181a24, // Midnight indigo anime hair
      roughness: 0.45,
      metalness: 0.25
    });

    const hairHighlightMat = new THREE.MeshStandardMaterial({
      color: 0xdfff00,
      emissive: 0xdfff00,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });

    // 1. Hair Base Dome
    const hairBaseGeo = new THREE.SphereGeometry(0.134, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
    hairBase.position.set(0, 0.08, -0.015);
    headGroup.add(hairBase);

    // 2. Front Bangs (7 distinct geometric tapered tufts)
    const bangAngles = [-0.08, -0.05, -0.02, 0.01, 0.04, 0.07, 0.09];
    bangAngles.forEach((bx, idx) => {
      const bGeo = new THREE.ConeGeometry(0.026, 0.13, 5);
      bGeo.rotateX(Math.PI * 0.82);
      const isHighlighted = idx === 1 || idx === 5;
      const bangMesh = new THREE.Mesh(bGeo, isHighlighted ? hairHighlightMat : hairMat);
      bangMesh.position.set(bx, 0.165, 0.095);
      bangMesh.rotation.z = bx * 2.8;
      headGroup.add(bangMesh);
    });

    // 3. Twin Side Locks (Iconic anime face-framing strands)
    const sideLockGeo = new THREE.ConeGeometry(0.025, 0.22, 5);
    sideLockGeo.rotateX(Math.PI);

    const lockL = new THREE.Mesh(sideLockGeo, hairMat);
    lockL.position.set(-0.115, 0.04, 0.06);
    lockL.rotation.z = -0.08;
    headGroup.add(lockL);

    const lockR = new THREE.Mesh(sideLockGeo, hairMat);
    lockR.position.set(0.115, 0.04, 0.06);
    lockR.rotation.z = 0.08;
    headGroup.add(lockR);

    // Yellow hairclips on side locks
    const clipGeo = new THREE.BoxGeometry(0.015, 0.03, 0.01);
    const clipL = new THREE.Mesh(clipGeo, trimMat);
    clipL.position.set(-0.12, 0.12, 0.07);
    headGroup.add(clipL);

    const clipR = new THREE.Mesh(clipGeo, trimMat);
    clipR.position.set(0.12, 0.12, 0.07);
    headGroup.add(clipR);

    // 4. Iconic Ahoge (Anime Antenna Hair Tuft)
    const ahogeGroup = new THREE.Group();
    ahogeRef.current = ahogeGroup;
    ahogeGroup.position.set(0, 0.22, 0.02);
    headGroup.add(ahogeGroup);

    const ahogeGeo = new THREE.CylinderGeometry(0.006, 0.014, 0.12, 8);
    ahogeGeo.rotateZ(Math.PI / 4);
    const ahogeMesh = new THREE.Mesh(ahogeGeo, hairHighlightMat);
    ahogeMesh.position.set(0.04, 0.04, 0);
    ahogeGroup.add(ahogeMesh);

    // 5. Back Hair Flow
    const backHairGeo = new THREE.ConeGeometry(0.13, 0.28, 7);
    backHairGeo.rotateX(-Math.PI * 0.85);
    const backHair = new THREE.Mesh(backHairGeo, hairMat);
    backHair.position.set(0, 0.04, -0.11);
    headGroup.add(backHair);

    // --- MECHA CAT-EAR CYBER ANIME HEADSET ---
    const phoneGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16);
    phoneGeo.rotateZ(Math.PI / 2);
    const phoneMat = new THREE.MeshStandardMaterial({ color: 0x121414, roughness: 0.3, metalness: 0.85 });

    const phoneL = new THREE.Mesh(phoneGeo, phoneMat);
    phoneL.position.set(-0.125, 0.08, 0);
    headGroup.add(phoneL);

    const phoneRingGeo = new THREE.TorusGeometry(0.042, 0.006, 8, 16);
    phoneRingGeo.rotateY(Math.PI / 2);
    const phoneRingL = new THREE.Mesh(phoneRingGeo, trimMat);
    phoneRingL.position.set(-0.141, 0.08, 0);
    headGroup.add(phoneRingL);

    const phoneR = new THREE.Mesh(phoneGeo, phoneMat);
    phoneR.position.set(0.125, 0.08, 0);
    headGroup.add(phoneR);

    const phoneRingR = new THREE.Mesh(phoneRingGeo, trimMat);
    phoneRingR.position.set(0.141, 0.08, 0);
    headGroup.add(phoneRingR);

    const bandGeo = new THREE.TorusGeometry(0.136, 0.012, 8, 16, Math.PI);
    const band = new THREE.Mesh(bandGeo, phoneMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.175, 0);
    headGroup.add(band);

    // Mecha Cat Ears on headset
    const earGeo = new THREE.ConeGeometry(0.035, 0.08, 4);
    earGeo.rotateZ(Math.PI / 7);
    const earL = new THREE.Mesh(earGeo, phoneMat);
    earL.position.set(-0.09, 0.23, 0);
    headGroup.add(earL);

    const earTipL = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.03, 4), trimMat);
    earTipL.position.set(-0.105, 0.265, 0);
    headGroup.add(earTipL);

    const earR = new THREE.Mesh(earGeo, phoneMat);
    earR.rotation.y = Math.PI;
    earR.position.set(0.09, 0.23, 0);
    headGroup.add(earR);

    const earTipR = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.03, 4), trimMat);
    earTipR.position.set(0.105, 0.265, 0);
    headGroup.add(earTipR);

    // 4. Arms & Slender Hands with Gauntlets
    // Left Arm
    const armLGroup = new THREE.Group();
    leftArmRef.current = armLGroup;
    armLGroup.position.set(-0.155, 0.28, 0);
    torsoGroup.add(armLGroup);

    const upperArmGeo = new THREE.CylinderGeometry(0.038, 0.034, 0.22, 12);
    const upperArmL = new THREE.Mesh(upperArmGeo, jacketMat);
    upperArmL.position.set(-0.04, -0.09, -0.04);
    upperArmL.rotation.set(0.4, 0, 0.2);
    armLGroup.add(upperArmL);

    const forearmGeo = new THREE.CylinderGeometry(0.032, 0.026, 0.24, 12);
    const forearmL = new THREE.Mesh(forearmGeo, jacketMat);
    forearmL.position.set(-0.04, -0.15, -0.22);
    forearmL.rotation.set(-1.1, 0.3, 0.1);
    armLGroup.add(forearmL);

    // Cyber glove & slender anime hand
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.018, 0.045), skinMat);
    handL.position.set(-0.07, -0.11, -0.34);
    armLGroup.add(handL);

    const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.02, 12), trimMat);
    cuffL.position.set(-0.065, -0.105, -0.31);
    armLGroup.add(cuffL);

    // Right Arm
    const armRGroup = new THREE.Group();
    rightArmRef.current = armRGroup;
    armRGroup.position.set(0.155, 0.28, 0);
    torsoGroup.add(armRGroup);

    const upperArmR = new THREE.Mesh(upperArmGeo, jacketMat);
    upperArmR.position.set(0.04, -0.09, -0.04);
    upperArmR.rotation.set(0.4, 0, -0.2);
    armRGroup.add(upperArmR);

    const forearmR = new THREE.Mesh(forearmGeo, jacketMat);
    forearmR.position.set(0.04, -0.15, -0.22);
    forearmR.rotation.set(-1.1, -0.3, -0.1);
    armRGroup.add(forearmR);

    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.018, 0.045), skinMat);
    handR.position.set(0.07, -0.11, -0.34);
    armRGroup.add(handR);

    const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.02, 12), trimMat);
    cuffR.position.set(0.065, -0.105, -0.31);
    armRGroup.add(cuffR);

    // --- G. Cute Holographic Companion Drone (Kawaii Chibi Familiar) ---
    const droneGroup = new THREE.Group();
    droneRef.current = droneGroup;
    droneGroup.position.set(0.72, 1.45, 0.15);
    rootGroup.add(droneGroup);

    const droneGeo = new THREE.SphereGeometry(0.075, 20, 20);
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0x121414,
      roughness: 0.2,
      metalness: 0.95
    });
    const droneCore = new THREE.Mesh(droneGeo, droneMat);
    droneGroup.add(droneCore);

    // Dynamic Kawaii Face Canvas
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 128;
    eyeCanvas.height = 128;
    droneEyeCanvasRef.current = eyeCanvas;
    const ectx = eyeCanvas.getContext('2d')!;

    const drawDroneFace = (expression: string) => {
      ectx.fillStyle = '#121414';
      ectx.fillRect(0, 0, 128, 128);
      ectx.fillStyle = '#dfff00';
      ectx.font = 'bold 32px monospace';
      ectx.textAlign = 'center';
      ectx.textBaseline = 'middle';
      ectx.fillText(expression, 64, 64);
    };

    drawDroneFace('( ^ _ ^ )');

    const eyeTex = new THREE.CanvasTexture(eyeCanvas);
    droneEyeTexRef.current = eyeTex;
    const eyeMat = new THREE.MeshBasicMaterial({ map: eyeTex });
    const eyeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), eyeMat);
    eyeMesh.position.set(0, 0.01, 0.076);
    droneGroup.add(eyeMesh);

    // Orbital Gyroscope Rings
    const ringsGroup = new THREE.Group();
    droneRingsRef.current = ringsGroup;
    droneGroup.add(ringsGroup);

    const ringGeo1 = new THREE.TorusGeometry(0.11, 0.005, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xdfff00 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ringsGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(0.13, 0.004, 8, 32);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat);
    ring2.rotation.x = Math.PI / 3;
    ringsGroup.add(ring2);

    // Ambient floating particles
    const particleCount = 70;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 4.5;
      pPositions[i * 3 + 1] = 0.5 + Math.random() * 2.5;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xdfff00,
      size: 0.025,
      transparent: true,
      opacity: 0.55
    });
    const particles = new THREE.Points(pGeo, pMat);
    rootGroup.add(particles);

    // ==========================================
    // 8. DYNAMIC MONITOR CONTENT GENERATION
    // ==========================================
    const codeLines = [
      '// KINETIC_KERNEL_v5.2.0 [READY]',
      'const sys = initializeDistributedNodes();',
      'const telemetry = await sys.connectMesh({',
      '  protocol: "UDP_QUIC_MULTIPATH",',
      '  latencyThreshold: 14.0 /* ms */,',
      '  failoverPolicy: "CONSENSUS_RAFT"',
      '});',
      '// OPTIMIZING NEURAL WEIGHTS...',
      'model.train({ epoch: 4592, loss: 0.042 });',
      'deployTelemetryPipeline("SDJIC_PLATFORM");',
      'sys.auditTrace({ status: "OPTIMAL" });',
      '// ENTERING PORTFOLIO DATASTREAM...',
      'stream.bindPort(3000).mountHUD();'
    ];
    let lineScroll = 0;

    const updateScreens = (time: number, isZooming: boolean) => {
      // Center Screen
      cctx.fillStyle = '#0a0d0d';
      cctx.fillRect(0, 0, 1024, 640);

      // Top bar
      cctx.fillStyle = '#161c1c';
      cctx.fillRect(0, 0, 1024, 52);
      cctx.fillStyle = '#dfff00';
      cctx.font = 'bold 20px monospace';
      cctx.fillText('[ TERMINAL: SYSTEM_ARCHITECT // ROOT_NODE ]', 24, 34);
      cctx.fillStyle = '#a0ffa0';
      cctx.fillText('STATUS: ONLINE', 840, 34);

      // Code text
      cctx.font = '22px monospace';
      const visibleLines = 11;
      const startIdx = Math.floor(lineScroll) % codeLines.length;
      for (let i = 0; i < visibleLines; i++) {
        const text = codeLines[(startIdx + i) % codeLines.length];
        if (text.startsWith('//')) {
          cctx.fillStyle = '#dfff00';
        } else if (text.includes('const') || text.includes('await')) {
          cctx.fillStyle = '#a0ffa0';
        } else {
          cctx.fillStyle = '#e2e2e2';
        }
        cctx.fillText(text, 32, 105 + i * 46);
      }

      // Blinking cursor
      if (Math.sin(time * 5) > 0) {
        cctx.fillStyle = '#dfff00';
        cctx.fillRect(720, 105 + 8 * 46 - 20, 14, 26);
      }

      // If zooming, draw digital flare overlay on screen
      if (isZooming) {
        cctx.fillStyle = `rgba(223, 255, 0, ${0.15 + Math.sin(time * 12) * 0.1})`;
        cctx.fillRect(0, 0, 1024, 640);
        cctx.fillStyle = '#ffffff';
        cctx.font = 'bold 28px monospace';
        cctx.fillText('>> SYNCHRONIZING WITH SYSTEM ARCHITECT PORTFOLIO...', 80, 580);
      }

      codeTexture.needsUpdate = true;

      // Side Screen
      lctx.fillStyle = '#0a0d0d';
      lctx.fillRect(0, 0, 512, 420);

      lctx.fillStyle = '#dfff00';
      lctx.font = 'bold 16px monospace';
      lctx.fillText('[ DATA_STREAM_A // TELEMETRY ]', 20, 32);

      // Waveform
      lctx.beginPath();
      lctx.strokeStyle = '#dfff00';
      lctx.lineWidth = 2.5;
      for (let x = 0; x < 512; x += 4) {
        const y = 200 + Math.sin(x * 0.04 + time * 3) * 45 + Math.cos(x * 0.02 - time * 2) * 20;
        if (x === 0) lctx.moveTo(x, y);
        else lctx.lineTo(x, y);
      }
      lctx.stroke();

      lctx.fillStyle = '#ffffff';
      lctx.font = 'bold 18px monospace';
      lctx.fillText('THROUGHPUT: 78.4%', 20, 380);
      lctx.fillStyle = '#dfff00';
      lctx.fillText('LATENCY: 14MS', 320, 380);

      leftTexture.needsUpdate = true;
    };

    // Kawaii Drone expression rotation
    const droneFaces = ['( ^ _ ^ )', '( •̀ ω •́ )✧', '( ˘ ³˘)♥', '( ◕ ‿ ◕ )', '( > ‿ < )'];
    let lastDroneFaceTime = 0;

    // Blink timer
    let nextBlinkTime = 2.5;
    let blinkDuration = 0.18;
    let isBlinking = false;
    let blinkStart = 0;

    // ==========================================
    // 9. ANIMATION & RENDER LOOP
    // ==========================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 6);
    }

    let smoothedSp = 0;
    let lastScreenUpdateTime = 0;

    const tick = () => {
      if (isDisposed) return;

      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsedTime = clock.getElapsedTime();
      const targetSp = scrollProgressRef.current;

      // Silky smooth exponential damping for camera zoom
      smoothedSp = THREE.MathUtils.damp(smoothedSp, targetSp, 12.0, delta);

      // CAMERA POSITIONING LOGIC:
      // When smoothedSp > 0: Drive camera zoom smoothly towards central monitor!
      if (smoothedSp > 0.002) {
        const eased = easeInOutCubic(Math.min(1, smoothedSp));
        _currentTargetPos.lerpVectors(_camStartPos, _camScreenPos, eased);
        _currentLookAt.lerpVectors(_camStartLook, _camScreenLook, eased);

        camera.position.copy(_currentTargetPos);
        controls.target.copy(_currentLookAt);
      } else if (!isUserInteracting) {
        // Standard view interpolation
        camera.position.lerp(cameraTargetPos.current, 0.06);
        controls.target.lerp(cameraLookAtPos.current, 0.06);
      }
      controls.update();

      // Eye Blinking Animation
      if (elapsedTime > nextBlinkTime && !isBlinking) {
        isBlinking = true;
        blinkStart = elapsedTime;
      }
      if (isBlinking) {
        const blinkProgress = (elapsedTime - blinkStart) / blinkDuration;
        if (blinkProgress >= 1) {
          isBlinking = false;
          nextBlinkTime = elapsedTime + 3.0 + Math.random() * 3.0;
          drawAnimeFace(0);
          if (faceTexRef.current) faceTexRef.current.needsUpdate = true;
        } else {
          // Half blink / full blink
          const blinkScale = Math.sin(blinkProgress * Math.PI);
          drawAnimeFace(blinkScale);
          if (faceTexRef.current) faceTexRef.current.needsUpdate = true;
        }
      }

      // Anime Ahoge (antenna hair) gentle bouncy sway
      if (ahogeRef.current) {
        ahogeRef.current.rotation.z = Math.sin(elapsedTime * 3.5) * 0.15;
        ahogeRef.current.rotation.x = Math.cos(elapsedTime * 2.8) * 0.1;
      }

      // Character Breathing & Typing Animation
      if (torsoGroup) {
        torsoGroup.position.y = 0.15 + Math.sin(elapsedTime * 2.0) * 0.005;
      }

      // Alternate typing motion on anime hands
      if (isTyping && leftArmRef.current && rightArmRef.current) {
        const leftType = Math.sin(elapsedTime * 15) * 0.014;
        const rightType = Math.cos(elapsedTime * 17) * 0.014;
        leftArmRef.current.position.y = 0.28 + leftType;
        rightArmRef.current.position.y = 0.28 + rightType;
      }

      // Head follows mouse gently with anime tilt
      if (headGroupRef.current) {
        _headTarget.set(
          pointerPos.current.x * 0.32,
          -pointerPos.current.y * 0.18,
          0
        );
        headGroupRef.current.rotation.y = THREE.MathUtils.damp(
          headGroupRef.current.rotation.y,
          _headTarget.x,
          4,
          delta
        );
        headGroupRef.current.rotation.x = THREE.MathUtils.damp(
          headGroupRef.current.rotation.x,
          _headTarget.y,
          4,
          delta
        );
      }

      // Drone float & expression cycle
      if (droneRef.current) {
        droneRef.current.position.y = 1.45 + Math.sin(elapsedTime * 2.2) * 0.06;
        droneRef.current.position.x = 0.72 + Math.cos(elapsedTime * 1.5) * 0.04;
      }
      if (droneRingsRef.current) {
        droneRingsRef.current.rotation.x += delta * 1.2;
        droneRingsRef.current.rotation.y += delta * 1.8;
      }

      if (elapsedTime - lastDroneFaceTime > 4.0) {
        lastDroneFaceTime = elapsedTime;
        const nextFace = droneFaces[Math.floor(Math.random() * droneFaces.length)];
        drawDroneFace(nextFace);
        if (droneEyeTexRef.current) droneEyeTexRef.current.needsUpdate = true;
      }

      // Ambient particle float
      particles.rotation.y = elapsedTime * 0.03;

      // Update Screen Textures (throttled to ~15fps to free GPU texture bandwidth)
      lineScroll += delta * 1.4;
      if (elapsedTime - lastScreenUpdateTime > 0.065 || (smoothedSp > 0.3 && elapsedTime - lastScreenUpdateTime > 0.033)) {
        lastScreenUpdateTime = elapsedTime;
        updateScreens(elapsedTime, smoothedSp > 0.4);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
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

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerPos.current.x = nx;
      pointerPos.current.y = ny;
    };
    container.addEventListener('mousemove', onPointerMove);

    return () => {
      isDisposed = true;
      if (isSoftwareGl) clearTimeout(frameId);
      else cancelAnimationFrame(frameId);

      container.removeEventListener('mousemove', onPointerMove);
      resizeObserver.disconnect();

      // Dispose Three.js objects
      controls.dispose();
      renderer.dispose();
      floorTexture.dispose();
      shadowTex.dispose();
      codeTexture.dispose();
      leftTexture.dispose();
      faceTex.dispose();
      eyeTex.dispose();
      deskTopGeo.dispose();
      pGeo.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="w-full h-full relative cursor-grab active:cursor-grabbing" />
    </div>
  );
};
