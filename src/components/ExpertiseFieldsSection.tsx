import React, { useEffect, useRef, useState } from 'react';
import { MatrixBackground } from './MatrixBackground';

interface FieldItem {
  id: string;
  tag: string;
  name: string;
  subtitle: string;
  description: string;
}

const FIELDS: FieldItem[] = [
  {
    id: 'field-01',
    tag: 'FIELD_01 // INTELLIGENCE',
    name: 'Artificial Intelligence & Machine Learning',
    subtitle: 'Neural Architectures, Quantized Edge Inference & Agentic Systems',
    description:
      'Designing and deploying deep neural networks, transformer fine-tuning pipelines, and real-time computer vision models. Specializing in high-throughput tensor optimization, Retrieval-Augmented Generation (RAG), and agentic tool-use runtimes.'
  },
  {
    id: 'field-02',
    tag: 'FIELD_02 // SECURITY',
    name: 'Cybersecurity & Threat Defense',
    subtitle: 'Offensive Security Auditing, Packet Forensics & Zero-Trust Architecture',
    description:
      'Executing rigorous security posture assessments, vulnerability research, and protocol reverse engineering. Enforcing defense-in-depth methodologies, zero-trust authentication boundaries, and automated vulnerability scanning across infrastructure.'
  },
  {
    id: 'field-03',
    tag: 'FIELD_03 // SYSTEMS & ARCHITECTURE',
    name: 'Software Development & Distributed Systems',
    subtitle: 'High-Throughput Microservices, Event Streaming & Scalable Platforms',
    description:
      'Engineering fault-tolerant distributed applications, low-latency microservices, and interactive modern user experiences. Architecting reactive event streams, thread-safe asynchronous runtimes, and high-performance database schemas.'
  },
  {
    id: 'field-04',
    tag: 'FIELD_04 // INFRASTRUCTURE',
    name: 'Cloud Infrastructure & DevOps',
    subtitle: 'Container Orchestration, Infrastructure as Code & Observability',
    description:
      'Building automated GitOps delivery pipelines, cloud-native Kubernetes clusters, and end-to-end telemetry observability. Ensuring multi-region high availability, blue-green deployment rollouts, and zero-downtime scaling.'
  }
];

export const ExpertiseFieldsSection: React.FC = () => {
  const [activeFieldId, setActiveFieldId] = useState<string>(FIELDS[0].id);
  const [visibleFieldIds, setVisibleFieldIds] = useState<Set<string>>(new Set([FIELDS[0].id]));
  const fieldRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-field-id');
          if (!id) return;

          if (entry.isIntersecting) {
            setVisibleFieldIds(prev => new Set(prev).add(id));
            setActiveFieldId(id);
          }
        });
      },
      {
        root: null,
        rootMargin: '-8% 0px -20% 0px',
        threshold: 0.15
      }
    );

    fieldRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="section-domains" className="py-24 sm:py-32 px-4 sm:px-8 md:px-16 relative overflow-hidden bg-[#0a0c0c] border-t border-b border-white/5">
      {/* Matrix Background with Decreased Delicate Glow */}
      <MatrixBackground glowOpacity="subtle" />

      <div className="max-w-[1200px] mx-auto relative z-10 [perspective:1400px]">
        {/* Section Header */}
        <div className="mb-16 sm:mb-20">
          <div className="flex items-center gap-2 font-technical text-[12px] text-[#dfff00] tracking-widest uppercase mb-3">
            <span className="w-2.5 h-2.5 bg-[#dfff00] inline-block"></span>
            <span>[ WHAT_I_DO // SPECIALIZED_FIELDS ]</span>
          </div>
          
          <h2 className="font-display text-[36px] sm:text-[48px] md:text-[60px] text-white uppercase font-black tracking-tight leading-[0.95]">
            Engineering Disciplines
          </h2>
        </div>

        {/* Vertical Scrolled Fields Sequence with Zoom-Into-Screen Transition */}
        <div className="flex flex-col gap-10 sm:gap-14">
          {FIELDS.map((field, index) => {
            const isVisible = visibleFieldIds.has(field.id);
            const isActive = activeFieldId === field.id;

            return (
              <div
                key={field.id}
                ref={el => {
                  fieldRefs.current[index] = el;
                }}
                data-field-id={field.id}
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.75s ease-out, filter 0.75s ease-out, border-color 0.4s ease'
                }}
                className={`relative rounded-md p-6 sm:p-10 md:p-12 glass-panel border transform-gpu ${
                  isVisible
                    ? 'opacity-100 scale-100 translate-y-0 filter-none [transform:rotateX(0deg)_translateZ(0px)]'
                    : 'opacity-20 scale-[0.88] translate-y-16 blur-[3px] [transform:rotateX(7deg)_translateZ(-80px)]'
                } ${
                  isActive
                    ? 'border-[#dfff00] bg-[#141616]/95 ring-1 ring-[#dfff00]/40'
                    : 'border-white/10 bg-[#101212]/75 hover:border-white/20'
                }`}
              >
                {/* Active Indicator Top Stripe */}
                <div
                  className={`absolute top-0 left-0 h-[2px] transition-all duration-500 ${
                    isActive ? 'w-full bg-[#dfff00]' : 'w-12 bg-white/20'
                  }`}
                ></div>

                {/* Tag & Index */}
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-white/10 bg-[#161818] font-technical text-[11px] sm:text-[12px] text-[#dfff00] uppercase tracking-widest font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#dfff00]"></span>
                    <span>{field.tag}</span>
                  </div>

                  <span className="font-technical text-[12px] text-white/40 tracking-widest font-mono">
                    0{index + 1} / 0{FIELDS.length}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display text-[28px] sm:text-[40px] md:text-[46px] font-black text-white uppercase tracking-tight leading-tight mb-2">
                  {field.name}
                </h3>

                {/* Subtitle */}
                <h4 className="font-mono text-[14px] sm:text-[16px] text-[#00f0ff] font-semibold mb-6 tracking-wide">
                  {field.subtitle}
                </h4>

                {/* Description */}
                <p className="text-[15px] sm:text-[17px] md:text-[18px] text-[#c6c9ab] leading-relaxed max-w-4xl border-l-2 border-[#dfff00] pl-5 sm:pl-6 bg-gradient-to-r from-[#dfff00]/5 to-transparent py-2.5">
                  {field.description}
                </p>

                {/* Corner Accent */}
                <div
                  className={`absolute bottom-0 right-0 w-8 h-8 border-b border-r transition-colors m-3 pointer-events-none ${
                    isActive ? 'border-[#dfff00]' : 'border-white/10'
                  }`}
                ></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
