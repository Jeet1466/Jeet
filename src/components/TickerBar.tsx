import React from 'react';
import { useApp } from '../data/store';

export const TickerBar: React.FC = () => {
  const { config } = useApp();

  const items = [
    `SYS_CORE_TEMP: ${config.coreTemp || '42°C'}`,
    `DATA_NODES: ${config.activeNodes.toLocaleString()} ONLINE`,
    `LATENCY: ${config.latencyMs}MS`,
    `UPTIME: ${config.uptime}`,
    `KERNEL: v5.2.0-KINETIC`,
    `MEMORY_PRESSURE: 18.4%`,
    `RAFT_CONSENSUS: STABLE`,
    `SYSTEM_STATUS: ${config.systemStatus || 'OPTIMAL'}`
  ];

  const fullSequence = [...items, ...items, ...items];

  return (
    <div className="w-full bg-[#dfff00] text-[#121414] py-1.5 overflow-hidden border-t border-b border-[#121414]/20 z-20 select-none">
      <div className="animate-marquee flex items-center gap-8 font-technical text-[11px] font-extrabold tracking-widest uppercase">
        {fullSequence.map((item, idx) => (
          <React.Fragment key={idx}>
            <span>{item}</span>
            <span className="opacity-40 font-bold">//</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
