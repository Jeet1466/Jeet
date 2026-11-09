import React, { useState } from 'react';
import { useApp } from '../data/store';
import { TopicInterest } from '../types';
import { Mail, Check, AlertCircle, Send, Radio } from 'lucide-react';
import { MatrixBackground } from './MatrixBackground';

export const NewsletterSection: React.FC = () => {
  const { subscribe, subscribers } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<TopicInterest>('All Systems');
  const [feedback, setFeedback] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });

  const topics: TopicInterest[] = [
    'All Systems',
    'AI & Architecture',
    'Kinetic UX',
    'Engineering Research'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = subscribe(name, email, topic);
    if (result.success) {
      setFeedback({ status: 'success', message: result.message });
      setName('');
      setEmail('');
    } else {
      setFeedback({ status: 'error', message: result.message });
    }
  };

  return (
    <section id="section-newsletter" className="py-24 px-4 sm:px-8 md:px-16 border-t border-[#dfff00]/20 bg-[#141616] relative overflow-hidden">
      {/* Matrix Background with Decreased Subtle Glow */}
      <MatrixBackground glowOpacity="subtle" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="glass-panel p-8 sm:p-12 md:p-16 rounded-md border border-white/10 bg-[#121414]/90 relative overflow-hidden shadow-2xl">
          {/* Ambient Corner Accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#dfff00]/5 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#dfff00]/30 m-4 pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Dispatch Brief */}
            <div className="lg:col-span-6">
              <div className="font-technical text-[12px] text-[#dfff00] tracking-widest uppercase mb-3 font-bold flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#dfff00] animate-pulse" />
                <span>[ Newslatter ]</span>
              </div>
              <h2 className="font-display text-[32px] sm:text-[42px] font-black text-white uppercase tracking-tight mb-4 leading-tight">
                Subscribe &
                <br />
                <span className="text-[#dfff00]">follow the build</span>
              </h2>
              <p className="text-[15px] sm:text-[16px] text-[#c6c9ab] leading-relaxed mb-6">
                Join to get practical Code breakdown & sinnpets, Project updates, fresh Posts and original Articles in your inbox.
              </p>

              {/* Roster Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1a1c1c] border border-white/10 rounded-sm font-technical text-[11px] text-[#c6c9ab]">
                <span className="w-2 h-2 rounded-full bg-[#dfff00]"></span>
                <span>ACTIVE_NODES: {subscribers.filter(s => s.status === 'ACTIVE').length + 1420} SUBSCRIBED</span>
              </div>
            </div>

            {/* Right Column: Interactive Subscription Form */}
            <div className="lg:col-span-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Topic Selector Chips */}
                {/* <div>
                  <label className="font-technical text-[10px] text-white/60 uppercase tracking-widest block mb-2 font-bold">
                    SELECT_SUBSCRIPTION_STREAM
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {topics.map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setTopic(t)}
                        className={`px-3 py-2 text-left font-technical text-[11px] rounded-sm border transition-all ${
                          topic === t
                            ? 'border-[#dfff00] bg-[#dfff00]/10 text-[#dfff00] font-bold'
                            : 'border-white/10 bg-[#161818] text-[#c6c9ab] hover:border-white/30'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div> */}

                {/* Name Input */}
                <div>
                  <label className="font-technical text-[10px] text-white/60 uppercase tracking-widest block mb-1">
                    NAME (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dr. Alex Mercer"
                    className="w-full bg-[#181a1a] border border-white/10 focus:border-[#dfff00] focus:ring-0 text-white font-technical text-[13px] px-3.5 py-2.5 rounded-sm outline-none transition-colors"
                  />
                </div>

                {/* Email Input */}
                <div>
                  <label className="font-technical text-[10px] text-white/60 uppercase tracking-widest block mb-1">
                    EMAIL *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="operator@system.io"
                      className="w-full bg-[#181a1a] border border-white/10 focus:border-[#dfff00] focus:ring-0 text-white font-technical text-[13px] pl-3.5 pr-10 py-2.5 rounded-sm outline-none transition-colors"
                    />
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  </div>
                </div>

                {/* Feedback Toast */}
                {feedback.status !== 'idle' && (
                  <div
                    className={`p-3 rounded-sm font-technical text-[11px] flex items-center gap-2 border ${
                      feedback.status === 'success'
                        ? 'bg-[#dfff00]/10 border-[#dfff00] text-[#dfff00]'
                        : 'bg-red-500/10 border-red-500 text-red-400'
                    }`}
                  >
                    {feedback.status === 'success' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-[#dfff00] text-[#121414] font-technical text-[12px] py-3.5 px-6 rounded-sm kinetic-hover uppercase tracking-widest font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(223,255,0,0.3)] cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Subscribe Now</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
