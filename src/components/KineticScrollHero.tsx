import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../data/store';
import { KineticDesktop3D } from './KineticDesktop3D';
import { ArrowDown } from 'lucide-react';
import { smoothDampWithSpeedLimit, calculateScrollProgress } from '../utils/math';

export const KineticScrollHero: React.FC = () => {
  const { config } = useApp();
  const heroTrackRef = useRef<HTMLDivElement>(null);

  // Progress: 0.0 (Wide 3D Desktop Stage) -> 1.0 (Zoomed into Monitor / Portfolio Screen)
  const [visualProgress, setVisualProgress] = useState(0);
  const visualProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const isTransitioningRef = useRef(false);

  // Typewriter effect for architect roles
  const roles = config.titleRoles || ['MScIT Student.', 'Engineer.', 'Researcher.', 'System Architect.'];
  const [currentText, setCurrentText] = useState('');
  const [roleIndex, setRoleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = roles[roleIndex % roles.length];
    const typeSpeed = isDeleting ? 40 : 85;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < fullText.length) {
          setCurrentText(fullText.substring(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(fullText.substring(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setRoleIndex(prev => (prev + 1) % roles.length);
        }
      }
    }, typeSpeed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, roleIndex, roles]);

  // HIGH-PERFORMANCE RESPONSIVE ANIMATION LOOP:
  // Smoothly drives visual camera zoom in direct synchronization with user scroll
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastRenderedProgress = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const current = visualProgressRef.current;
      const target = targetProgressRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.002) {
        // Fast, buttery smooth damping (factor 18) for ultra-responsive tracking with zero lag
        const next = current + diff * (1 - Math.exp(-18 * dt));
        visualProgressRef.current = next;

        // Only trigger React state update if change is visually noticeable or crosses threshold
        const crossedThreshold =
          (current < 0.15 && next >= 0.15) ||
          (current >= 0.15 && next < 0.15) ||
          (current < 0.82 && next >= 0.82) ||
          (current >= 0.82 && next < 0.82);

        if (crossedThreshold || Math.abs(next - lastRenderedProgress) > 0.012) {
          lastRenderedProgress = next;
          setVisualProgress(next);
        }
        isTransitioningRef.current = true;
      } else if (current !== target) {
        visualProgressRef.current = target;
        lastRenderedProgress = target;
        setVisualProgress(target);
        isTransitioningRef.current = false;
      } else {
        isTransitioningRef.current = false;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const returnTo3D = useCallback(() => {
    targetProgressRef.current = 0.0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Natural Page Scroll Listener:
  // As the user scrolls down through the 220vh track, camera dives smoothly into the center screen!
  useEffect(() => {
    const onScroll = () => {
      const track = heroTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const scrolledDistance = -rect.top;
      const trackHeight = track.offsetHeight;
      const viewportHeight = window.innerHeight;
      const progress = calculateScrollProgress(scrolledDistance, trackHeight, viewportHeight);
      targetProgressRef.current = progress;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Touch & Keyboard handlers
  useEffect(() => {
    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      const scrollY = window.scrollY;

      if (scrollY <= 10) {
        // Swiping up (scrolling down into monitor)
        if (deltaY > 35) {
          const track = heroTrackRef.current;
          if (track) {
            const targetY = track.offsetTop + track.offsetHeight - window.innerHeight;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const scrollY = window.scrollY;
      const current = visualProgressRef.current;

      if (scrollY <= 10) {
        if ((e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') && current < 0.95) {
          e.preventDefault();
          const track = heroTrackRef.current;
          if (track) {
            const targetY = track.offsetTop + track.offsetHeight - window.innerHeight;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        } else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && current > 0.05) {
          e.preventDefault();
          returnTo3D();
        }
      }
    };

    const onReset = () => {
      returnTo3D();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('kinetic:reset-desktop', onReset);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('kinetic:reset-desktop', onReset);
    };
  }, [returnTo3D]);

  const isInsideScreen = visualProgress >= 0.82;

  return (
    <div ref={heroTrackRef} className="relative w-full h-[220vh]">
      {/* ======================================================== */}
      {/* 1. STICKY FULLSCREEN 3D KINETIC STAGE & MONITOR PORTAL */}
      {/* Scrolling through the 220vh track dives the 3D camera into the monitor! */}
      {/* ======================================================== */}
      <div className="sticky top-0 w-full h-screen overflow-hidden bg-[#0a0c0c]">
        {/* Three.js Scene: 3D Coder Room Battlestation, camera zoom driven by visualProgress */}
        <KineticDesktop3D
          className="w-full h-full"
          scrollProgress={visualProgress}
        />

        {/* Initial Screen Prompt HUD (Only visible on wide 3D view) */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-400 ease-out z-20 flex flex-col justify-between p-4 sm:p-8 md:p-12 ${
            visualProgress > 0.15 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Top Stage Header */}
          <div className="pt-28 sm:pt-36 md:pt-54 max-w-xl">
            <h1 className="font-display text-[38px] sm:text-[54px] md:text-[68px] text-white uppercase font-black leading-[0.92] tracking-tighter drop-shadow-2xl">
              {config.ownerName || 'Jeet Patel'}
              <br />
              <span className="text-[#dfff00] opacity-95 inline-block text-[32px] sm:text-[46px] md:text-[58px]">
                {currentText}
              </span>
              <span className="typewriter-cursor"></span>
            </h1>

            {/* Direct Enter Portfolio Button */}
            <div className="mt-7 pointer-events-auto flex items-center gap-4">
              <button
                onClick={() => {
                  const track = heroTrackRef.current;
                  if (track) {
                    const targetY = track.offsetTop + track.offsetHeight - window.innerHeight;
                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                  } else {
                    targetProgressRef.current = 1.0;
                  }
                }}
                className="bg-[#dfff00] text-[#121414] font-technical text-[12px] py-3.5 px-7 rounded-sm kinetic-hover uppercase tracking-widest font-bold flex items-center gap-2 shadow-[0_0_18px_rgba(223,255,0,0.35)] cursor-pointer transition-transform active:scale-95"
              >
                <span>Enter Portfolio</span>
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. THE SCREEN BECOMES THE USER'S SCREEN OVERLAY */}
        {/* As camera completes zoom into center monitor, this overlay seamlessly fades in */}
        {/* ======================================================== */}
        <div
          className={`absolute inset-0 z-30 transition-opacity duration-300 ${
            isInsideScreen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: '#121414',
            backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(223, 255, 0, 0.05) 0%, transparent 60%)'
          }}
        >
          {/* Monitor Screen Core: Portfolio Bio & Headline */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 md:px-16 pt-24 pb-8 flex flex-col justify-center h-full">
            <div className="max-w-4xl">
              {/* Live System Status Pill */}
              {/* <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 border border-white/10 rounded-full bg-[#1e2020]/70 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-[#dfff00] shadow-[0_0_8px_#dfff00]"></div>
                <span className="font-technical text-[10px] md:text-[11px] text-[#c6c9ab] uppercase tracking-widest font-semibold">
                  LIVE SYSTEM STATUS: {config.systemStatus || 'OPTIMAL'}
                </span>
              </div> */}

              {/* Primary Name & Typewriter */}
              <h2 className="font-display text-[44px] sm:text-[62px] md:text-[80px] text-white uppercase leading-[0.92] tracking-tighter mb-6 font-black">
                {config.ownerName || 'Jeet Patel'}
                <br />
                <span className="text-[#dfff00] opacity-95 inline-block text-[36px] sm:text-[50px] md:text-[64px]">
                  {currentText}
                </span>
                <span className="typewriter-cursor"></span>
              </h2>

              {/* Data Document Badge */}
              <div className=" mb-8">
                <div className="font-technical text-[13px] md:text-[14px] text-[#dfff00] font-bold mb-1 tracking-wider">
                  {'{ DATA:ABOUT_ME }'}
                </div>
                <div className="text-[15px] md:text-[17px] text-[#c6c9ab] leading-relaxed border-l-2 border-[#dfff00] pl-5 py-2.5 bg-gradient-to-r from-[#333535]/30 to-transparent">
                  {
                    "I'm an Integrated M.Sc. IT student at Surat, Learning about technology, software development, and problem-solving. I enjoy exploring Web Development, AI/ML, and Cybersecurity while building practical projects and continuously expanding my skills. I'm driven by curiosity, a love for learning, and the ambition to turn ideas into meaningful solutions."}
                </div>
              </div>

              {/* Action Buttons inside Monitor Screen */}
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  onClick={() => {
                    const el = document.getElementById('section-domains');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#dfff00] text-[#121414] font-technical text-[12px] py-3.5 px-8 rounded-sm kinetic-hover uppercase tracking-widest font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(223,255,0,0.3)] cursor-pointer"
                >
                  <span>Domains </span>
                  <ArrowDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    targetProgressRef.current = 0.0;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="border border-white/20 hover:border-[#dfff00] text-[#e2e2e2] hover:text-[#dfff00] font-technical text-[12px] py-3.5 px-6 rounded-sm uppercase tracking-widest font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Back to 3D Room ↑</span>
                </button>

                <div className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-technical text-[#dfff00]/70">
                  <span>▼ SCROLL DOWN FOR PERFORMANCE MODULES</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
