/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './data/store';
import { Navbar } from './components/Navbar';
import { KineticScrollHero } from './components/KineticScrollHero';
import { TickerBar } from './components/TickerBar';
import { ProjectsSection } from './components/ProjectsSection';
import { ExpertiseFieldsSection } from './components/ExpertiseFieldsSection';
import { NewsletterSection } from './components/NewsletterSection';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { ContactModal } from './components/ContactModal';
import { KineticDesktop3D } from './components/KineticDesktop3D';
import { X } from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    selectedProject,
    setSelectedProject,
    is3DFullscreen,
    setIs3DFullscreen
  } = useApp();

  return (
    <div className="min-h-screen bg-[#121414] text-[#e2e2e2] flex flex-col relative selection:bg-[#dfff00] selection:text-[#121414]">
      {/* Top Fixed Navigation Bar */}
      <Navbar />

      {/* Main Portfolio Stream */}
      <main className="flex-1">
        {/* Fullscreen 3D Kinetic Desktop Initial Landing with smooth zoom into screen */}
        <KineticScrollHero />

        {/* Real-time Telemetric Marquee */}
        <TickerBar />

        {/* Section 01: What I Engineer & Deploy (Fields) */}
        <ExpertiseFieldsSection />

        {/* Section 02: Projects Architecture */}
        <ProjectsSection />

        {/* Section 03: Kinetic Dispatch (Newsletter Subscription) */}
        <NewsletterSection />

        {/* Comprehensive Footer */}
        <Footer />
      </main>

      {/* Interactive Global Modals */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
      <ContactModal />

      {/* Fullscreen 3D Stage Modal */}
      {is3DFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0a0c0c] flex flex-col">
          {/* Top Bar for Fullscreen 3D */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-white/10 bg-[#121414]/90 backdrop-blur-md z-30">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dfff00] shadow-[0_0_8px_#dfff00]"></span>
              <span className="font-technical text-[12px] text-[#dfff00] font-bold uppercase tracking-widest">
                KINETIC_CODER_ROOM // 3D_STAGE
              </span>
            </div>
            <button
              onClick={() => setIs3DFullscreen(false)}
              className="p-1.5 rounded-sm hover:bg-white/10 text-white hover:text-[#dfff00] border border-white/10 transition-colors font-technical text-[11px] flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Exit 3D Stage</span>
            </button>
          </div>

          {/* 3D Viewport */}
          <div className="flex-1 w-full h-full relative">
            <KineticDesktop3D isFullscreen={true} onToggleFullscreen={() => setIs3DFullscreen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
