import React, { useState } from 'react';
import { useApp } from '../data/store';
import { Github, Linkedin, Twitter, Briefcase, Code, Shield, FileText } from 'lucide-react';
import { MatrixBackground } from './MatrixBackground';

export const Footer: React.FC = () => {
  const { config } = useApp();
  const [docModal, setDocModal] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0d0f0f] border-t border-[#dfff00]/20 relative z-10 pt-16 pb-12 overflow-hidden">
      {/* Matrix Background with Decreased Subtle Glow */}
      <MatrixBackground glowOpacity="subtle" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-white/10 pb-12">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="font-display text-[26px] text-[#dfff00] tracking-tighter uppercase font-bold mb-4">
              Jeet Patel
            </div>
            <p className="text-[14px] text-[#c6c9ab] max-w-md mb-6 leading-relaxed">
              Building high-performance interfaces and architecting scalable systems. Bridging the gap between human needs and technical capabilities.
            </p>
          </div>

          {/* Directory Links */}
          <div>
            <h4 className="font-technical text-[12px] text-white uppercase tracking-widest mb-6 font-bold">
              Directory
            </h4>
            <ul className="font-technical text-[12px] text-[#c6c9ab] space-y-3 uppercase tracking-widest">
              <li>
                <button onClick={() => scrollTo('section-domains')} className="hover:text-[#dfff00] transition-colors cursor-pointer">
                  What I Do
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('section-work')} className="hover:text-[#dfff00] transition-colors cursor-pointer">
                  Featured Projects
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('section-newsletter')} className="hover:text-[#dfff00] transition-colors cursor-pointer">
                  NewsLetter
                </button>
              </li>
            </ul>
          </div>

          {/* Network Links */}
          <div>
            <h4 className="font-technical text-[12px] text-white uppercase tracking-widest mb-6 font-bold">
              Network
            </h4>
            <ul className="font-technical text-[12px] text-[#c6c9ab] space-y-3 uppercase tracking-widest">
              <li>
                <a
                  href='https://github.com/Jeet1466'
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfff00] transition-colors flex items-center gap-2"
                >
                  <Github className="w-3.5 h-3.5" /> GitHub
                </a>
              </li>
              <li>
                <a
                  href={config.upworkUrl || 'https://upwork.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfff00] transition-colors flex items-center gap-2"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Upwork
                </a>
              </li>
              <li>
                <a
                  href= 'https://linkedin.com/in/jeet1466'
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfff00] transition-colors flex items-center gap-2"
                >
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </a>
              </li>
              <li>
                <a
                  href={config.twitterUrl || 'https://x.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#dfff00] transition-colors flex items-center gap-2"
                >
                  <Twitter className="w-3.5 h-3.5" /> Twitter / X
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Ticker & Legal Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 font-technical text-[10px] uppercase text-[#c6c9ab]/60 tracking-widest">
          <div>
            © 2026 ALL_RIGHTS_RESERVED.
          </div>
          <div className="flex gap-6">
            <button
              onClick={() => setDocModal(`Privacy Protocol:

            • Data Collection: We only collect information you explicitly provide (such as your email address when subscribing).

            • Data Usage: Your data is used exclusively to send project updates, technical write-ups, and newsletter issues.

            • Third-Party Policy: We never sell, rent, or trade your personal data with third parties.

            • Tracking & Cookies: We minimize tracking to essential operational cookies—no aggressive cross-site user profiling.
            
            • Data Control: You retain full ownership of your data. You can request deletion or unsubscribe instantly at any time via the link in every dispatch.`)}
              className="hover:text-[#dfff00] transition-colors"
            >
              Privacy_Protocol
            </button>
            <button
              onClick={() => setDocModal(
                "[ Terms of Service Protocol ]\n\n" +
                "01. PERMISSIBLE USE → Read, execute, and adapt shared code snippets for personal or educational projects.\n\n" +
                "02. PROPRIETARY RIGHTS → Written logs and system designs are published under attribution guidelines.\n\n" +
                "03. NO WARRANTY → Systems and scripts are dispatched as-is with no guarantee of uptime or specific runtime behavior.\n\n" +
                "04. SYSTEM INTEGRITY → Automated payload injection, unauthorized endpoint scraping, or abuse is forbidden."
              )}
              className="hover:text-[#dfff00] transition-colors"
            >
              Terms_of_Service
            </button>
            <button
                onClick={() => setDocModal(`[ Source Code Policy & Licensing ]

              01. OPEN DISTRIBUTION → All public repository code snippets, components, and scripts are provided under permissive personal/educational terms.

              02. ATTRIBUTION REQUIREMENT → Reproduction or integration into external systems requires maintaining core author header credits.

              03. NO COMMERCIAL RESALE → Packaging, bundling, or redistributing these source assets directly for commercial sale is strictly prohibited.

              04. AS-IS EXECUTION → Systems are provided without warranty. Execution, deployment, and security auditing remain the sole responsibility of the user.`)}
                className="hover:text-[#dfff00] transition-colors"
              >
                Source_Code_Policy
              </button>
          </div>
        </div>
      </div>

      {/* Quick Protocol Dialog */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 max-w-md w-full rounded-md border border-[#dfff00]/40 bg-[#121414]">
            <h5 className="font-technical text-[12px] text-[#dfff00] font-bold mb-3 uppercase">
              [ PROTOCOL_SPECIFICATION ]
            </h5>
            <p className="text-[13px] text-white/90 mb-5 leading-relaxed font-mono whitespace-pre-line">
              {docModal}
            </p>
            <button
              onClick={() => setDocModal(null)}
              className="w-full bg-[#dfff00] text-[#121414] font-technical text-[11px] font-bold py-2 rounded-sm"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
