import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../data/store';
import { ProjectCategory } from '../types';
import { ExternalLink, ArrowRight } from 'lucide-react';

export const ProjectsSection: React.FC = () => {
  const { projects, setSelectedProject } = useApp();
  const [filter, setFilter] = useState<'ALL' | ProjectCategory>('ALL');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [visibleProjectIds, setVisibleProjectIds] = useState<Set<string>>(new Set());
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filteredProjects = projects.filter(p => {
    if (filter === 'ALL') return true;
    return p.category === filter;
  });

  useEffect(() => {
    // Initialize first project as visible immediately
    if (filteredProjects.length > 0) {
      setVisibleProjectIds(new Set([filteredProjects[0].id]));
      setActiveProjectId(filteredProjects[0].id);
    }
  }, [filter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-project-id');
          if (!id) return;

          if (entry.isIntersecting) {
            setVisibleProjectIds(prev => new Set(prev).add(id));
            setActiveProjectId(id);
          }
        });
      },
      {
        root: null,
        rootMargin: '-8% 0px -20% 0px',
        threshold: 0.15
      }
    );

    cardRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredProjects.length]);

  return (
    <section id="section-work" className="py-24 sm:py-32 px-4 sm:px-8 md:px-16 relative overflow-x-clip bg-[#121414]">
      {/* Background kinetic grid glow */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#dfff00]/5 blur-[120px] pointer-events-none rounded-full"></div>
      <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#00f0ff]/5 blur-[120px] pointer-events-none rounded-full"></div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Section Header & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 font-technical text-[12px] text-[#dfff00] tracking-widest uppercase mb-3">
              <span className="w-2.5 h-2.5 bg-[#dfff00] inline-block animate-pulse shadow-[0_0_8px_#dfff00]"></span>
              <span>[ SELECTED_ARCHITECTURE // PRODUCTION_MODULES ]</span>
            </div>
            <h2 className="font-display text-[36px] sm:text-[48px] md:text-[60px] text-white uppercase font-black tracking-tight leading-[0.95]">
              Featured Projects
            </h2>
            <p className="text-[#a0a5a5] text-sm sm:text-base mt-3 max-w-xl font-mono">
              High-throughput distributed systems, real-time analytics engines, and applied machine learning pipelines.
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#161818] border border-white/10 rounded-sm self-start md:self-auto">
            {(['ALL', 'Fullstack', 'Systems', 'Infrastructure', 'AI / ML'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`font-technical text-[11px] px-3.5 py-1.5 rounded-sm uppercase tracking-wider transition-all cursor-pointer ${
                  filter === cat
                    ? 'bg-[#dfff00] text-[#121414] font-bold shadow-[0_0_12px_#dfff00]'
                    : 'text-[#c6c9ab] hover:text-white hover:bg-[#202222]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Stack: Every Project Visible with Horizontal Slide-In as Scrolled */}
        <div className="flex flex-col gap-10 sm:gap-14">
          {filteredProjects.map((project, index) => {
            const isVisible = visibleProjectIds.has(project.id);
            const isActive = activeProjectId === project.id;
            const entersFromLeft = index % 2 === 0;

            return (
              <div
                key={project.id}
                ref={el => {
                  cardRefs.current[index] = el;
                }}
                data-project-id={project.id}
                onClick={() => setSelectedProject(project)}
                style={{
                  transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out, filter 0.8s ease-out, border-color 0.4s ease, box-shadow 0.4s ease'
                }}
                className={`group relative rounded-md overflow-hidden cursor-pointer border glass-panel p-6 sm:p-10 transform-gpu ${
                  isVisible
                    ? 'opacity-100 translate-x-0 scale-100 filter-none'
                    : entersFromLeft
                    ? 'opacity-20 -translate-x-24 sm:-translate-x-32 scale-[0.94] blur-[3px]'
                    : 'opacity-20 translate-x-24 sm:translate-x-32 scale-[0.94] blur-[3px]'
                } ${
                  isActive
                    ? 'border-[#dfff00] bg-[#161818] shadow-[0_0_40px_rgba(223,255,0,0.18)] ring-1 ring-[#dfff00]/40'
                    : 'border-white/10 bg-[#121414]/90 hover:border-white/30'
                }`}
              >
                {/* Active Top Glow Stripe */}
                <div
                  className={`absolute top-0 left-0 h-[3px] transition-all duration-500 ${
                    isActive ? 'w-full bg-[#dfff00] shadow-[0_0_12px_#dfff00]' : 'w-16 bg-white/20'
                  }`}
                ></div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Project Info (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    {/* Header Badges */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-white/10 rounded-sm font-technical text-[11px] text-[#dfff00] bg-[#1a1c1c] uppercase tracking-wider font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#dfff00]"></span>
                        {project.category}
                      </div>

                      {isActive && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-[#dfff00] bg-[#dfff00]/20 text-[#dfff00] font-technical text-[10px] uppercase tracking-widest rounded-xs animate-pulse font-bold">
                          <span>● ACTIVE_INSPECTION</span>
                        </div>
                      )}

                      <span className="font-technical text-[11px] text-white/40 ml-auto font-mono">
                        PROJECT #{String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Subtitle & Title */}
                    {project.subtitle && (
                      <span className="font-mono text-[12px] text-[#00f0ff] uppercase tracking-wider font-semibold mb-1">
                        {project.subtitle}
                      </span>
                    )}

                    <h3 className="font-display text-[28px] sm:text-[38px] font-black text-white uppercase tracking-tight mb-4 group-hover:text-[#dfff00] transition-colors leading-tight">
                      {project.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[#c6c9ab] text-sm sm:text-base leading-relaxed mb-6">
                      {project.description}
                    </p>

                    {/* Metrics Strip */}
                    {project.metrics && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-[#0e1010] border border-white/10 rounded-sm mb-6">
                        {project.metrics.throughput && (
                          <div>
                            <span className="font-technical text-[9px] text-[#a0a5a5] uppercase block">Throughput</span>
                            <span className="font-mono text-[13px] font-bold text-white group-hover:text-[#dfff00] transition-colors">
                              {project.metrics.throughput}
                            </span>
                          </div>
                        )}
                        {project.metrics.latency && (
                          <div>
                            <span className="font-technical text-[9px] text-[#a0a5a5] uppercase block">Latency</span>
                            <span className="font-mono text-[13px] font-bold text-[#00f0ff]">
                              {project.metrics.latency}
                            </span>
                          </div>
                        )}
                        {project.metrics.uptime && (
                          <div className="hidden sm:block">
                            <span className="font-technical text-[9px] text-[#a0a5a5] uppercase block">Uptime</span>
                            <span className="font-mono text-[13px] font-bold text-[#a0ffa0]">
                              {project.metrics.uptime}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tech Stack Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-technical border border-white/10 bg-[#161818] px-2.5 py-1 text-[#c6c9ab] uppercase tracking-wider rounded-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="font-technical text-[12px] text-[#dfff00] font-bold tracking-wider flex items-center gap-2 group-hover:translate-x-1.5 transition-transform">
                        <span>INSPECT SPECIFICATION</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                      <span className="font-technical text-[10px] text-white/40">
                        CLICK TO EXPAND
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Visual Preview (5 cols) */}
                  <div className="lg:col-span-5 relative h-64 sm:h-80 rounded-md overflow-hidden border border-white/10 bg-[#0e1010]">
                    {project.imageUrl && (
                      <img
                        src={project.imageUrl}
                        alt={project.imageAlt || project.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700 "
                        // mix-blend-luminosity hover:mix-blend-normal
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e1010] via-transparent to-transparent pointer-events-none"></div>

                    {/* Hover expand icon */}
                    <div className="absolute top-4 right-4 p-2 rounded-sm bg-[#141616]/90 text-[#c6c9ab] group-hover:text-[#dfff00] group-hover:bg-[#1a1c1c] border border-white/10 transition-colors shadow-lg">
                      <ExternalLink className="w-4 h-4" />
                    </div>

                    <div className="absolute bottom-4 left-4 font-technical text-[10px] text-[#dfff00] bg-[#121414]/90 px-3 py-1 rounded-xs border border-[#dfff00]/30 backdrop-blur-sm">
                      SYS_SPEC // REPO: VERIFIED
                    </div>
                  </div>
                </div>

                {/* Corner accent */}
                <div
                  className={`absolute bottom-0 right-0 w-8 h-8 border-b border-r transition-colors m-3 pointer-events-none ${
                    isActive ? 'border-[#dfff00]' : 'border-white/10'
                  }`}
                ></div>
              </div>
            );
          })}
        </div>

        {/* Total Systems Indicator */}
        <div className="mt-12 flex justify-between items-center text-white/40 font-technical text-[11px] border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#dfff00] rounded-full inline-block animate-pulse"></span>
            <span>SHOWING ALL SYSTEMS IN CONTINUOUS INSPECTION FLOW</span>
          </div>
          <div>
            TOTAL MODULES: <span className="text-white font-mono">{filteredProjects.length}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
