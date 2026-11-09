import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../data/store';
import { ProjectCategory } from '../types';
import { ExternalLink, Github, Layers, ArrowRight, ArrowLeft, FolderGit2, Star, GitFork } from 'lucide-react';
import { MatrixBackground } from './MatrixBackground';
import { GITHUB_LANGUAGE_COLORS } from './AdminPanel';

export const ProjectsSection: React.FC = () => {
  const { projects, setIsAdminOpen, setScreen } = useApp();
  const [filter, setFilter] = useState<'ALL' | ProjectCategory>('ALL');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter only projects that are selected by admin
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.selected !== false)
      .filter(p => {
        if (filter === 'ALL') return true;
        return p.category === filter;
      });
  }, [projects, filter]);

  const totalCards = filteredProjects.length;

  // Track vertical page scroll to translate horizontally
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerTop = -rect.top;
      const totalScrollable = container.offsetHeight - window.innerHeight;

      if (totalScrollable <= 0) {
        setScrollProgress(0);
        setActiveIndex(0);
        return;
      }

      const progress = Math.max(0, Math.min(1, containerTop / totalScrollable));
      setScrollProgress(progress);

      if (totalCards > 0) {
        const targetIdx = Math.min(totalCards - 1, Math.round(progress * (totalCards - 1)));
        setActiveIndex(targetIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalCards]);

  // Jump to specific card smoothly
  const scrollToCard = (index: number) => {
    const container = containerRef.current;
    if (!container || totalCards <= 1) return;

    const totalScrollable = container.offsetHeight - window.innerHeight;
    const targetProgress = index / (totalCards - 1);
    const targetScrollY = container.offsetTop + targetProgress * totalScrollable;

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  };

  return (
    <section
      id="section-work"
      ref={containerRef}
      className="relative bg-[#121414] select-none"
      style={{
        // Smooth scroll height: comfortable scroll distance for sliding cards
        height: `${Math.max(180, totalCards * 75)}vh`
      }}
    >
      {/* Sticky Fullscreen Viewport */}
      <div className="sticky top-0 w-full h-screen overflow-hidden flex flex-col justify-between py-4 sm:py-6 bg-[#121414] relative">
        {/* Matrix Background */}
        <MatrixBackground glowOpacity="none" />

        {/* ======================================================== */}
        {/* 1. TOP HEADER & FILTER BAR */}
        {/* ======================================================== */}
        <div className="relative z-20 max-w-[1240px] w-full mx-auto px-4 sm:px-8 flex flex-col md:flex-row md:items-end justify-between gap-3 pt-12 sm:pt-14 pb-2 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 font-technical text-[11px] text-[#dfff00] tracking-widest uppercase mb-1">
              <span className="w-2.5 h-2.5 bg-[#dfff00] inline-block"></span>
              <span>[ SELECTED_ARCHITECTURE // CENTERED_SHOWCASE ]</span>
            </div>
            <h2 className="font-display text-[26px] sm:text-[34px] md:text-[40px] text-white uppercase font-black tracking-tight leading-none">
              Featured Projects
            </h2>
            <p className="text-[#a0a5a5] text-xs sm:text-sm mt-1 font-mono">
              Live GitHub repository architecture cards. Scroll down to slide each project into center.
            </p>
          </div>

          {/* Filter Chips & Nav Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Admin Console Shortcut */}
            <button
              onClick={() => {
                setIsAdminOpen(true);
                setScreen('admin');
              }}
              className="px-2.5 py-1.5 bg-[#171919] hover:bg-[#1f2222] text-[#dfff00] border border-[#dfff00]/40 rounded-sm font-technical text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Admin Console to select/export GitHub repos"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-[#dfff00]" />
              <span>Manage Repos</span>
            </button>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#161818] border border-white/10 rounded-sm">
              {(['ALL', 'Fullstack', 'AI / ML', 'Cybersecurity', 'Systems', 'Infrastructure'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`font-technical text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-sm uppercase tracking-wider transition-all cursor-pointer ${
                    filter === cat
                      ? 'bg-[#dfff00] text-[#121414] font-bold'
                      : 'text-[#c6c9ab] hover:text-white hover:bg-[#202222]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Left / Right Nav Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="p-1.5 sm:p-2 bg-[#181a1a] border border-white/10 hover:border-[#dfff00] text-white disabled:opacity-25 disabled:pointer-events-none rounded-sm transition-colors cursor-pointer"
                title="Previous Project"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToCard(Math.min(totalCards - 1, activeIndex + 1))}
                disabled={activeIndex >= totalCards - 1}
                className="p-1.5 sm:p-2 bg-[#181a1a] border border-white/10 hover:border-[#dfff00] text-white disabled:opacity-25 disabled:pointer-events-none rounded-sm transition-colors cursor-pointer"
                title="Next Project"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. HORIZONTAL SLIDING CARDS TRACK (MATHEMATICALLY CENTERED) */}
        {/* Each slide is 100vw, so every card is 100% centered in the viewport */}
        {/* ======================================================== */}
        <div className="relative z-10 w-full flex-1 flex items-center overflow-hidden my-auto py-1">
          <div
            className="flex h-full items-center transition-transform duration-300 ease-out will-change-transform"
            style={{
              // Translate exactly by percentage of total cards
              transform: `translate3d(-${scrollProgress * (totalCards - 1) * 100}vw, 0, 0)`
            }}
          >
            {filteredProjects.map((project, index) => {
              const currentVirtualIndex = scrollProgress * (totalCards - 1);
              const offsetFromCenter = currentVirtualIndex - index;
              const absDist = Math.abs(offsetFromCenter);
              const isCentered = absDist < 0.55;

              // Smooth scale from 0.92 to 1.0, opacity from 0.4 to 1.0
              const scale = Math.max(0.92, 1 - absDist * 0.08);
              const opacity = Math.max(0.4, 1 - absDist * 0.6);

              return (
                <div
                  key={project.id}
                  className="w-screen flex-shrink-0 flex items-center justify-center px-4 sm:px-8 md:px-12"
                >
                  {/* The Centered Project Card: Sized to fit 100% on any screen without cropping */}
                  <div
                    onClick={() => scrollToCard(index)}
                    style={{
                      transform: `scale(${scale})`,
                      opacity: opacity,
                      transition:
                        'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
                    }}
                    className={`w-full max-w-[1080px] rounded-md border p-4 sm:p-6 md:p-7 flex flex-col justify-between glass-panel relative overflow-hidden transform-gpu select-text cursor-pointer max-h-[calc(100vh-150px)] ${
                      isCentered
                        ? 'border-[#dfff00] bg-[#151818]/95 ring-1 ring-[#dfff00]/40 shadow-xl'
                        : 'border-white/10 bg-[#121414]/90 hover:border-white/25'
                    }`}
                  >
                    {/* Active Top Highlight Stripe */}
                    <div
                      className={`absolute top-0 left-0 h-[2px] transition-all duration-500 ${
                        isCentered ? 'w-full bg-[#dfff00]' : 'w-20 bg-white/20'
                      }`}
                    />

                    {/* --- CARD HEADER --- */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-[#dfff00]/40 rounded-sm font-technical text-[10px] text-[#dfff00] bg-[#1a1c1c] uppercase tracking-wider font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#dfff00]"></span>
                          {project.subtitle || project.category}
                        </div>

                        {/* GitHub Language Badge if available */}
                        {project.language && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-white/10 rounded-sm font-technical text-[10px] text-gray-300 bg-[#161818]">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{
                                backgroundColor:
                                  GITHUB_LANGUAGE_COLORS[project.language] || GITHUB_LANGUAGE_COLORS.Other
                              }}
                            />
                            <span>{project.language}</span>
                          </div>
                        )}

                        {isCentered && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[#dfff00]/60 bg-[#dfff00]/10 text-[#dfff00] font-technical text-[9px] uppercase tracking-widest rounded-xs font-bold">
                            <span>● FOCUS</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* GitHub Stars & Forks if available */}
                        {typeof project.stars === 'number' && (
                          <span className="flex items-center gap-1 font-technical text-[11px] text-amber-300">
                            <Star className="w-3.5 h-3.5 fill-amber-400/40 text-amber-400" />
                            <span>{project.stars}</span>
                          </span>
                        )}
                        <span className="font-technical text-[10px] text-white/50 font-mono hidden sm:inline-block">
                          REVISION: {project.updatedAt}
                        </span>
                        <span className="font-technical text-[11px] text-[#dfff00] font-mono font-bold">
                          #{String(index + 1).padStart(2, '0')} / {String(totalCards).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {/* --- CARD MAIN BODY (2 COLUMNS: ALL CONTENT FULLY VISIBLE) --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                      {/* Left Column: Title, Description, Architecture Specs & Stack (7 cols) */}
                      <div className="lg:col-span-7 space-y-2.5">
                        <div>
                          <h3 className="font-display text-[22px] sm:text-[26px] md:text-[30px] font-black text-white uppercase tracking-tight leading-tight group-hover:text-[#dfff00] transition-colors mb-1.5">
                            {project.title}
                          </h3>

                          {/* Primary Description */}
                          <p className="text-[12px] sm:text-[13px] text-[#e2e2e2] leading-relaxed font-normal mb-2.5">
                            {project.description}
                          </p>

                          {/* Complete Architectural Specifications */}
                          {project.detailedOverview && (
                            <div className="p-2.5 sm:p-3 rounded-sm bg-[#0e1010] border border-white/10 mb-2.5">
                              <h4 className="font-technical text-[10px] text-[#dfff00] uppercase tracking-widest mb-1 flex items-center gap-1.5 font-bold">
                                <Layers className="w-3 h-3" />
                                <span>Architectural Specifications</span>
                              </h4>
                              <p className="text-[11px] sm:text-[12px] text-[#c6c9ab] leading-relaxed">
                                {project.detailedOverview}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Technical Stack Tags */}
                        <div>
                          <span className="font-technical text-[9px] text-white/50 uppercase tracking-widest block mb-1 font-semibold">
                            TECHNICAL_PRIMITIVES:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {project.tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[9px] font-technical border border-white/15 bg-[#161818] px-2 py-0.5 text-[#c6c9ab] uppercase tracking-wider rounded-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Visual Preview & 4-Metric Grid (5 cols) */}
                      <div className="lg:col-span-5 space-y-2.5">
                        {/* Project Image */}
                        {project.imageUrl && (
                          <div className="relative h-28 sm:h-36 md:h-40 rounded-sm overflow-hidden border border-white/10 bg-[#0e1010]">
                            <img
                              src={project.imageUrl}
                              alt={project.imageAlt || project.title}
                              className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-transparent to-transparent pointer-events-none" />
                            <div className="absolute bottom-1.5 left-1.5 font-technical text-[9px] text-[#dfff00] bg-[#121414]/90 px-2 py-0.5 rounded-xs border border-[#dfff00]/40 backdrop-blur-sm">
                              TELEMETRY VERIFIED
                            </div>
                          </div>
                        )}

                        {/* 4-Metric Telemetry Grid */}
                        {project.metrics && (
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="p-2 bg-[#0e1010] border border-white/10 rounded-sm">
                              <span className="font-technical text-[8px] text-white/50 block uppercase">THROUGHPUT</span>
                              <span className="font-technical text-[11px] sm:text-[12px] text-[#dfff00] font-bold">
                                {project.metrics.throughput || '120k req/s'}
                              </span>
                            </div>
                            <div className="p-2 bg-[#0e1010] border border-white/10 rounded-sm">
                              <span className="font-technical text-[8px] text-white/50 block uppercase">LATENCY</span>
                              <span className="font-technical text-[11px] sm:text-[12px] text-[#00f0ff] font-bold">
                                {project.metrics.latency || '3.2ms p99'}
                              </span>
                            </div>
                            <div className="p-2 bg-[#0e1010] border border-white/10 rounded-sm">
                              <span className="font-technical text-[8px] text-white/50 block uppercase">UPTIME</span>
                              <span className="font-technical text-[11px] sm:text-[12px] text-[#a0ffa0] font-bold">
                                {project.metrics.uptime || '99.99%'}
                              </span>
                            </div>
                            <div className="p-2 bg-[#0e1010] border border-white/10 rounded-sm">
                              <span className="font-technical text-[8px] text-white/50 block uppercase">NODES</span>
                              <span className="font-technical text-[11px] sm:text-[12px] text-[#c6c9ab] font-bold">
                                {project.metrics.nodes || 'Cluster-01'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* --- CARD FOOTER: ACTION BUTTONS --- */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-3 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#dfff00] animate-pulse"></span>
                        <span className="font-technical text-[9px] text-white/60 uppercase">
                          COMPLETE PROJECT SPECIFICATION
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="px-3 py-1 border border-white/20 hover:border-[#dfff00] text-white hover:text-[#dfff00] rounded-sm font-technical text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Github className="w-3 h-3" />
                            <span>Source Code</span>
                          </a>
                        )}
                        {project.liveUrl && (
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="px-3.5 py-1 bg-[#dfff00] text-[#121414] hover:bg-[#dfff00]/90 rounded-sm font-technical text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Live Deployment</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. BOTTOM PROGRESS BAR & JUMP DOTS */}
        {/* ======================================================== */}
        <div className="relative z-20 max-w-[1240px] w-full mx-auto px-4 sm:px-8 pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="font-technical text-[10px] text-[#dfff00] font-bold">
              STREAM:
            </span>
            <div className="w-40 sm:w-56 h-1 bg-[#1e2020] rounded-full overflow-hidden border border-white/10 relative">
              <div
                className="h-full bg-gradient-to-r from-[#dfff00] to-cyan-400 transition-all duration-150"
                style={{ width: `${Math.round(scrollProgress * 100)}%` }}
              />
            </div>
            <span className="font-technical text-[10px] text-white/60 font-mono">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {filteredProjects.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToCard(idx)}
                className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                  activeIndex === idx
                    ? 'w-6 bg-[#dfff00]'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                title={`Jump to project #${idx + 1}`}
              />
            ))}
          </div>

          <div className="font-technical text-[9px] sm:text-[10px] text-white/40">
            SCROLL TO ADVANCE HORIZONTALLY
          </div>
        </div>
      </div>
    </section>
  );
};
