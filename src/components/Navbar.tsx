import React, { useState, useEffect } from 'react';
import { useApp } from '../data/store';
import { Menu, X, ArrowUpRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { setIsContactOpen, config } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close nav on ESC key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleNavClick = (sectionId: string) => {
    setIsMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReturnToStage = () => {
    setIsMenuOpen(false);
    window.dispatchEvent(new CustomEvent('kinetic:reset-desktop'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Floating Logo and Floating Actions (Transparent Nav & Logo) */}
      <header className="fixed top-0 inset-x-0 z-40 p-4 sm:p-6 md:p-8 flex justify-between items-center pointer-events-none bg-transparent">
        {/* Floating Brand / Transparent Logo */}
        <div className="pointer-events-auto flex items-center">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('kinetic:reset-desktop'));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bg-transparent border-none p-0 flex items-center gap-2.5 cursor-pointer group hover:opacity-90 transition-opacity focus:outline-none"
          >
            
            <span className="font-display text-[20px] sm:text-[30px] text-[#dfff00] tracking-tight uppercase font-black drop-shadow-md">
              {config.ownerName || 'JEET PATEL'}
            </span>
          </button>
        </div>

        {/* Floating Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
          {/* Contact button: styled like Initialize Sequence (solid cyber yellow, bold, tracking-widest, shadow) */}
          <button
            onClick={() => setIsContactOpen(true)}
            className="bg-[#dfff00] text-[#121414] font-technical text-[11px] sm:text-[12px] py-2 sm:py-2.5 px-4 sm:px-6 rounded-sm uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(223,255,0,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Contact
          </button>

          {/* Menu button: styled like View Telemetry (hollow border, cyber yellow outline, hover glow) */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="border border-[#dfff00] text-[#dfff00] font-technical text-[11px] sm:text-[12px] py-2 sm:py-2.5 px-4 sm:px-5 rounded-sm hover:bg-[#dfff00]/10 uppercase tracking-widest font-semibold flex items-center gap-2 shadow-[0_0_10px_rgba(223,255,0,0.15)] active:scale-95 transition-all cursor-pointer"
            title="Open Navigation Menu"
            aria-label="Open Navigation Matrix"
          >
            <Menu className="w-4 h-4 text-[#dfff00]" />
            <span>MENU</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* FULLSCREEN KINETIC NAVLINKS PAGE / MATRIX OVERLAY */}
      {/* ======================================================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0c0c]/98 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-12 md:p-16 animate-in fade-in duration-200">
          {/* Top Header of Nav Overlay */}
          <div className="flex justify-between items-center border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dfff00] shadow-[0_0_8px_#dfff00] animate-pulse"></span>
              <span className="font-technical text-[11px] sm:text-[12px] text-[#dfff00] uppercase tracking-widest font-bold">
                [ NAVIGATION_MATRIX // SYSTEM_ROOT ]
              </span>
            </div>

            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-sm bg-[#181a1a] hover:bg-[#dfff00] text-[#e2e2e2] hover:text-[#121414] border border-white/10 hover:border-[#dfff00] transition-all flex items-center gap-2 font-technical text-[11px] uppercase tracking-widest font-bold cursor-pointer"
            >
              <span>CLOSE [ESC]</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Big Typographic Kinetic Navigation Links */}
          <div className="my-auto py-8 max-w-4xl">
            <ul className="space-y-4 sm:space-y-6">
              <li>
                <button
                  onClick={handleReturnToStage}
                  className="group flex items-center justify-between w-full text-left py-2 border-b border-white/5 hover:border-[#dfff00]/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-baseline gap-4 sm:gap-6">
                    <span className="font-technical text-[13px] sm:text-[15px] text-[#dfff00]/70 group-hover:text-[#dfff00] font-mono">
                      01 //
                    </span>
                    <span className="font-display text-[32px] sm:text-[48px] md:text-[62px] text-white uppercase font-black tracking-tight group-hover:text-[#dfff00] group-hover:translate-x-3 transition-all duration-200">
                      3D Stage & Rig
                    </span>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-white/30 group-hover:text-[#dfff00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('section-domains')}
                  className="group flex items-center justify-between w-full text-left py-2 border-b border-white/5 hover:border-[#dfff00]/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-baseline gap-4 sm:gap-6">
                    <span className="font-technical text-[13px] sm:text-[15px] text-[#dfff00]/70 group-hover:text-[#dfff00] font-mono">
                      02 //
                    </span>
                    <span className="font-display text-[32px] sm:text-[48px] md:text-[62px] text-white uppercase font-black tracking-tight group-hover:text-[#dfff00] group-hover:translate-x-3 transition-all duration-200">
                      What I Do
                    </span>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-white/30 group-hover:text-[#dfff00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('section-work')}
                  className="group flex items-center justify-between w-full text-left py-2 border-b border-white/5 hover:border-[#dfff00]/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-baseline gap-4 sm:gap-6">
                    <span className="font-technical text-[13px] sm:text-[15px] text-[#dfff00]/70 group-hover:text-[#dfff00] font-mono">
                      03 //
                    </span>
                    <span className="font-display text-[32px] sm:text-[48px] md:text-[62px] text-white uppercase font-black tracking-tight group-hover:text-[#dfff00] group-hover:translate-x-3 transition-all duration-200">
                      Projects & Work
                    </span>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-white/30 group-hover:text-[#dfff00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => handleNavClick('section-newsletter')}
                  className="group flex items-center justify-between w-full text-left py-2 border-b border-white/5 hover:border-[#dfff00]/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-baseline gap-4 sm:gap-6">
                    <span className="font-technical text-[13px] sm:text-[15px] text-[#dfff00]/70 group-hover:text-[#dfff00] font-mono">
                      04 //
                    </span>
                    <span className="font-display text-[32px] sm:text-[48px] md:text-[62px] text-white uppercase font-black tracking-tight group-hover:text-[#dfff00] group-hover:translate-x-3 transition-all duration-200">
                      Kinetic Dispatch
                    </span>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-white/30 group-hover:text-[#dfff00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </button>
              </li>
            </ul>
          </div>

          {/* Bottom Footer Information */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t border-white/10 font-technical text-[11px] sm:text-[12px] text-[#c6c9ab]">
            <div className="flex items-center gap-3">
              <span className="text-[#dfff00] font-bold">OPERATOR:</span>
              <span className="text-white uppercase font-semibold">{config.ownerName || 'JEET PATEL'}</span>
              <span className="text-white/40">// MSCIT STUDENT & DEVELOPER</span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsContactOpen(true);
                }}
                className="text-[#dfff00] hover:underline uppercase font-bold cursor-pointer"
              >
                Contact →
              </button>
              
            </div>
          </div>
        </div>
      )}
    </>
  );
};
