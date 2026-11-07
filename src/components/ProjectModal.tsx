import React from 'react';
import { Project } from '../types';
import { X, ExternalLink, Github, Cpu, Activity, Server, Layers } from 'lucide-react';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0c0c]/85 backdrop-blur-md">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-panel p-6 sm:p-8 rounded-md border border-[#dfff00]/40 bg-[#121414] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-6">
          <div>
            <div className="inline-block px-2.5 py-0.5 border border-[#dfff00]/40 rounded-sm font-technical text-[10px] text-[#dfff00] bg-[#121414] mb-2 uppercase tracking-widest font-bold">
              {project.subtitle || project.category}
            </div>
            <h3 className="font-display text-[28px] sm:text-[36px] font-bold text-white uppercase tracking-tight">
              {project.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm hover:bg-white/10 text-white/60 hover:text-[#dfff00] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Image if present */}
        {project.imageUrl && (
          <div className="relative h-60 sm:h-72 w-full rounded-sm overflow-hidden mb-6 border border-white/10">
            <img
              src={project.imageUrl}
              alt={project.imageAlt || project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-transparent to-transparent"></div>
          </div>
        )}

        {/* Primary Description */}
        <p className="text-[16px] text-white/90 leading-relaxed mb-6 font-medium">
          {project.description}
        </p>

        {/* Detailed Architecture Breakdown */}
        {project.detailedOverview && (
          <div className="mb-6 p-4 rounded-sm bg-[#1a1c1c] border border-white/10">
            <h4 className="font-technical text-[12px] text-[#dfff00] uppercase tracking-widest mb-2 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Architectural Specifications</span>
            </h4>
            <p className="text-[14px] text-[#c6c9ab] leading-relaxed">
              {project.detailedOverview}
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-[#181a1a] border border-white/10 rounded-sm">
            <span className="font-technical text-[10px] text-white/50 block uppercase">THROUGHPUT</span>
            <span className="font-technical text-[14px] text-[#dfff00] font-bold">
              {project.metrics?.throughput || 'N/A'}
            </span>
          </div>
          <div className="p-3 bg-[#181a1a] border border-white/10 rounded-sm">
            <span className="font-technical text-[10px] text-white/50 block uppercase">LATENCY</span>
            <span className="font-technical text-[14px] text-white font-bold">
              {project.metrics?.latency || 'N/A'}
            </span>
          </div>
          <div className="p-3 bg-[#181a1a] border border-white/10 rounded-sm">
            <span className="font-technical text-[10px] text-white/50 block uppercase">UPTIME</span>
            <span className="font-technical text-[14px] text-[#a0ffa0] font-bold">
              {project.metrics?.uptime || '99.99%'}
            </span>
          </div>
          <div className="p-3 bg-[#181a1a] border border-white/10 rounded-sm">
            <span className="font-technical text-[10px] text-white/50 block uppercase">NODES</span>
            <span className="font-technical text-[14px] text-[#c6c9ab] font-bold">
              {project.metrics?.nodes || 'Cluster-01'}
            </span>
          </div>
        </div>

        {/* Tech Stack Chips */}
        <div className="mb-8">
          <span className="font-technical text-[11px] text-white/60 uppercase tracking-widest block mb-2">
            TECHNICAL_PRIMITIVES
          </span>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag, idx) => (
              <span
                key={idx}
                className="font-technical text-[11px] border border-white/20 bg-[#161818] px-3 py-1 text-[#c6c9ab] rounded-sm uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="font-technical text-[11px] text-white/40">
            SPEC_REVISION: {project.updatedAt}
          </div>
          <div className="flex items-center gap-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 border border-white/20 hover:border-[#dfff00] text-white hover:text-[#dfff00] rounded-sm font-technical text-[11px] uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Source Code</span>
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 bg-[#dfff00] text-[#121414] hover:bg-[#dfff00]/90 rounded-sm font-technical text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 transition-colors"
              >
                <span>Live Deployment</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
