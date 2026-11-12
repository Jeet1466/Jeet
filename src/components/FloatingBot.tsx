import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { X } from 'lucide-react';
import { useApp } from '../data/store';

interface FloatingBotProps {
  onNavigateToProjects?: () => void;
}

export const FloatingBot: React.FC<FloatingBotProps> = ({ onNavigateToProjects }) => {
  const { setIs3DFullscreen } = useApp();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // Bot speech & interaction state - ONLY pops up on direct click!
  const [expression, setExpression] = useState('( ^ _ ^ )');
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);

  // References for Three.js 3D Bot
  const droneGroupRef = useRef<THREE.Group | null>(null);
  const droneRingsRef = useRef<THREE.Group | null>(null);
  const eyeTexRef = useRef<THREE.CanvasTexture | null>(null);
  const eyeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const eyeOffsetRef = useRef({ x: 0, y: 0 });
  const isSpinningRef = useRef(0); // For 3D barrel-roll flip on click

  // Expression pool that automatically cycles
  const expressions = useRef([
    { face: '( ^ _ ^ )', quote: 'System status: 100% nominal! All telemetry green.' },
    { face: '( •̀ ω •́ )✧', quote: 'Scanning architecture... Zero CVEs detected!' },
    { face: '( ◕ ‿ ◕ )', quote: 'Watching your movements across the entire sanctuary.' },
    { face: '( ⌐■_■ )', quote: 'Sub-5ms p99 latency confirmed across all shards.' },
    { face: '( > ‿ < )', quote: 'Full speed navigation online! 3D Gyroscopes calibrated.' },
    { face: '( ˘ ³˘)♥', quote: 'Jeet Patel // High Performance Architecture & AI.' },
    { face: '(*ﾟ▽ﾟ*)', quote: 'Horizontal Projects matrix centered & focused!' },
    { face: '( ⊙ o ⊙ )', quote: 'Input event acknowledged! Logging to buffer.' }
  ]).current;

  const currentFaceIdxRef = useRef(0);

  // AUTOMATICALLY CHANGE EXPRESSIONS on a smooth interval
  useEffect(() => {
    const interval = setInterval(() => {
      currentFaceIdxRef.current = (currentFaceIdxRef.current + 1) % expressions.length;
      const nextExp = expressions[currentFaceIdxRef.current];
      setExpression(nextExp.face);
    }, 3800);

    return () => clearInterval(interval);
  }, [expressions]);

  // Draw face on 2D canvas texture with eye pupil offset looking towards mouse
  const drawFace = useCallback((faceText: string, offsetX: number = 0, offsetY: number = 0) => {
    const canvas = eyeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0d0e';
    ctx.fillRect(0, 0, 256, 160);

    // Subtle CRT scanline effect
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 160; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Outer cyber border
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 244, 148);

    // Expression Text shifted toward mouse gaze direction (clean, crisp, no glow blur)
    ctx.fillStyle = '#dfff00';
    ctx.font = 'bold 44px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(faceText, 128 + offsetX, 80 + offsetY);

    if (eyeTexRef.current) {
      eyeTexRef.current.needsUpdate = true;
    }
  }, []);

  // Initialize genuine Three.js 3D Bot
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const width = 120;
    const height = 120;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 20);
    camera.position.set(0, 0, 2.3);

    // 2. WebGL Renderer with Transparent Background
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // 3. Balanced Stylized Lighting (Soft, warm, no harsh specular glare)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff5ea, 1.4);
    dirLight1.position.set(2, 3, 2);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x7dd3fc, 0.6);
    dirLight2.position.set(-2, -1, 1.5);
    scene.add(dirLight2);

    // 4. THE 3D ANIMATED MASCOT DRONE MODEL
    const droneGroup = new THREE.Group();
    droneGroupRef.current = droneGroup;
    scene.add(droneGroup);

    // A. Stylized Animated Porcelain Shell Core (Warm Graphite/Matte)
    const droneCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.40, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x181c20,
        roughness: 0.42,
        metalness: 0.35
      })
    );
    droneGroup.add(droneCore);

    // Cute Little Animated Mascot Antenna on top
    const antennaStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.3, metalness: 0.8 })
    );
    antennaStem.position.set(0, 0.44, 0);
    droneGroup.add(antennaStem);

    const antennaBead = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.4 })
    );
    antennaBead.position.set(0, 0.52, 0);
    droneGroup.add(antennaBead);

    // Cute Ear Thruster Pods (Left & Right)
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x202428, roughness: 0.4, metalness: 0.5 });
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 16), thrusterMat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.41, 0.02, 0);
    droneGroup.add(earL);

    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 16), thrusterMat);
    earR.rotation.z = Math.PI / 2;
    earR.position.set(0.41, 0.02, 0);
    droneGroup.add(earR);

    // B. Kawaii Dynamic Face Screen Visor
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 256;
    eyeCanvas.height = 160;
    eyeCanvasRef.current = eyeCanvas;
    drawFace('( ^ _ ^ )');

    const eyeTex = new THREE.CanvasTexture(eyeCanvas);
    eyeTex.colorSpace = THREE.SRGBColorSpace;
    eyeTexRef.current = eyeTex;

    const eyeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.28),
      new THREE.MeshBasicMaterial({ map: eyeTex })
    );
    eyeMesh.position.set(0, 0.04, 0.402);
    droneGroup.add(eyeMesh);

    // C. Dual Spinning Orbital Gyroscope Rings (Electric Yellow and Cyan)
    const ringsGroup = new THREE.Group();
    droneRingsRef.current = ringsGroup;
    droneGroup.add(ringsGroup);

    // Ring 1 (Yellow #dfff00)
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.020, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0xdfff00 })
    );
    ringsGroup.add(ring1);

    // Ring 2 (Cyan #00e5ff) angled at Math.PI / 3
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.016, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    ring2.rotation.x = Math.PI / 3;
    ringsGroup.add(ring2);

    // D. Soft Downward Ambient Fill (No radioactive glare)
    const botLight = new THREE.PointLight(0xffffff, 0.35, 1.8);
    botLight.position.set(0, -0.25, 0);
    droneGroup.add(botLight);

    // 5. Animation Render Loop
    let frameId = 0;
    const startTime = performance.now();
    let lastTime = startTime;

    const tick = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      const elapsedTime = (now - startTime) / 1000;
      lastTime = now;

      // Gyroscope orbital rings spin continuously
      ringsGroup.rotation.x += delta * 1.6;
      ringsGroup.rotation.y += delta * 2.2;

      // Gentle floating bob in 3D space
      droneGroup.position.y = Math.sin(elapsedTime * 2.4) * 0.04;

      // 3D HEAD LOOK-AT: Smoothly turn directly towards mouse cursor
      const targetX = targetRotationRef.current.x;
      const targetY = targetRotationRef.current.y;

      droneGroup.rotation.x = THREE.MathUtils.damp(droneGroup.rotation.x, targetX, 10.0, delta);
      droneGroup.rotation.y = THREE.MathUtils.damp(droneGroup.rotation.y, targetY, 10.0, delta);

      // 3D Barrel Roll Spin on click
      if (isSpinningRef.current > 0) {
        const spinStep = Math.min(isSpinningRef.current, delta * 18);
        droneGroup.rotation.z += spinStep;
        isSpinningRef.current -= spinStep;
      } else {
        droneGroup.rotation.z = THREE.MathUtils.damp(droneGroup.rotation.z, 0, 10.0, delta);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      droneCore.geometry.dispose();
      eyeMesh.geometry.dispose();
      ring1.geometry.dispose();
      ring2.geometry.dispose();
      eyeTex.dispose();
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [drawFace]);

  // Redraw face whenever expression changes
  useEffect(() => {
    drawFace(expression, eyeOffsetRef.current.x, eyeOffsetRef.current.y);
  }, [expression, drawFace]);

  // TRACK MOUSE CURSOR: Bot turns and looks directly toward mouse coordinates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const botCenterX = rect.left + rect.width / 2;
        const botCenterY = rect.top + rect.height / 2;

        const dx = e.clientX - botCenterX;
        const dy = e.clientY - botCenterY;

        // FIXED 3D ROTATION:
        // When cursor is LEFT of bot (dx < 0), bot turns LEFT (rotY < 0).
        // When cursor is RIGHT of bot (dx > 0), bot turns RIGHT (rotY > 0).
        // When cursor is BELOW bot (dy > 0), bot pitches DOWN (rotX > 0).
        // When cursor is ABOVE bot (dy < 0), bot pitches UP (rotX < 0).
        // const rotY = Math.max(-0.55, Math.min(0.55, (dx / window.innerWidth) * 1.5));
        // const rotX = Math.max(-0.45, Math.min(0.45, (dy / window.innerHeight) * 1.4));

        const rotY = Math.max(-0.35, Math.min(0.35, (dx / window.innerWidth) * 1.5));
        const rotX = Math.max(-0.30, Math.min(0.30, (dy / window.innerHeight) * 1.4));

        targetRotationRef.current = { x: rotX, y: rotY };

        // Pupil eye offset on 2D texture (shifts up to 10px in direction of mouse)
        const pupilX = Math.max(-10, Math.min(10, (dx / window.innerWidth) * 24));
        const pupilY = Math.max(-8, Math.min(8, (dy / window.innerHeight) * 20));
        eyeOffsetRef.current = { x: pupilX, y: pupilY };

        drawFace(expression, pupilX, pupilY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [expression, drawFace]);

  // ONLY POP UP ON CLICKING THE BOT
  const handleBotDirectClick = useCallback(() => {
    isSpinningRef.current = Math.PI * 2; // 360-degree spin in 3D

    // Switch to a new expression and show quote popup
    currentFaceIdxRef.current = (currentFaceIdxRef.current + 1) % expressions.length;
    const current = expressions[currentFaceIdxRef.current];
    setExpression(current.face);
    setSpeechText(current.quote);
    setIsTalking(true);
  }, [expressions]);

  return (
    <div
      ref={containerRef}
      className="fixed top-22 sm:top-24 right-4 sm:right-8 z-40 select-none will-change-transform"
    >
      <div className="relative">
        {/* Speech Dialogue Bubble - ONLY SHOWN WHEN USER CLICKS THE BOT */}
        {isTalking && speechText && (
          <div className="absolute top-full right-0 mt-3 w-64 p-3 rounded-md bg-[#121414]/95 backdrop-blur-md border border-[#dfff00]/60 text-white shadow-xl pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-200 z-50">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#dfff00]"></span>
                <span className="font-technical text-[10px] text-[#dfff00] font-bold uppercase tracking-wider">
                  3D_BOT // ORBITAL_COMPANION
                </span>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsTalking(false);
                }}
                className="p-0.5 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <p className="text-[12px] font-mono text-[#e2e2e2] leading-relaxed mb-2.5">
              {speechText}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
              <button
                onClick={e => {
                  e.stopPropagation();
                  const el = document.getElementById('section-work');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  if (onNavigateToProjects) onNavigateToProjects();
                  setIsTalking(false);
                }}
                className="px-2 py-1 bg-[#dfff00]/15 hover:bg-[#dfff00] text-[#dfff00] hover:text-[#121414] rounded-xs font-technical text-[9px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Jump to Projects →</span>
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIs3DFullscreen(true);
                  setIsTalking(false);
                }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xs font-technical text-[9px] uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Fullscreen 3D Room</span>
              </button>
            </div>

            <div className="absolute bottom-full right-8 w-0 h-0 border-x-6 border-x-transparent border-b-6 border-b-[#dfff00]/60" />
          </div>
        )}

        {/* ======================================================== */}
        {/* THREE.JS 3D BOT CANVAS MOUNT */}
        {/* ======================================================== */}
        <div
          onClick={handleBotDirectClick}
          className="relative w-[120px] h-[120px] cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          title="Click to interact with the 3D Bot!"
        >
          <div ref={canvasMountRef} className="w-full h-full relative" />
        </div>
      </div>
    </div>
  );
};
