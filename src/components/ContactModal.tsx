import React, { useState } from 'react';
import { useApp } from '../data/store';
import { X, Send, CheckCircle2 } from 'lucide-react';

export const ContactModal: React.FC = () => {
  const { isContactOpen, setIsContactOpen } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isContactOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsContactOpen(false);
      setName('');
      setEmail('');
      setMessage('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="p-6 sm:p-8 max-w-lg w-full rounded-md border border-[#dfff00]/40 bg-[#121414] shadow-2xl relative">
        {/* Simple Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
          <div>
            <h3 className="font-display text-[22px] sm:text-[24px] text-white font-bold uppercase tracking-tight">
              Get in Touch
            </h3>
            <p className="text-xs text-[#a0a5a5] font-mono mt-0.5">
              Send a direct message to Jeet Patel
            </p>
          </div>
          <button
            onClick={() => setIsContactOpen(false)}
            className="p-1.5 rounded-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close contact dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-10 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#dfff00] mx-auto animate-bounce" />
            <h4 className="font-display text-[20px] text-white font-bold uppercase">
              Message Sent!
            </h4>
            <p className="text-sm text-[#c6c9ab] font-mono max-w-xs mx-auto">
              Thank you for reaching out. I'll get back to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-white/70 block mb-1.5 font-medium">
                Your Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jeet Patel"
                className="w-full bg-[#181a1a] border border-white/15 focus:border-[#dfff00] text-white text-sm px-3.5 py-2.5 rounded-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-white/70 block mb-1.5 font-medium">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full bg-[#181a1a] border border-white/15 focus:border-[#dfff00] text-white text-sm px-3.5 py-2.5 rounded-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-white/70 block mb-1.5 font-medium">
                Message
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full bg-[#181a1a] border border-white/15 focus:border-[#dfff00] text-white text-sm px-3.5 py-2.5 rounded-sm outline-none transition-colors resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="bg-[#dfff00] text-[#121414] font-technical text-[12px] font-bold uppercase tracking-wider py-3 px-7 rounded-sm hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(223,255,0,0.25)]"
              >
                <span>Send Message</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
