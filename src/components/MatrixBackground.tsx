import React from 'react';

interface MatrixBackgroundProps {
  className?: string;
  glowOpacity?: 'low' | 'subtle' | 'none';
}

export const MatrixBackground: React.FC<MatrixBackgroundProps> = ({
  className = '',
  glowOpacity = 'subtle'
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}>
      {/* Crisp Cyberpunk Matrix Grid */}
      <div className="absolute inset-0 bg-grid opacity-20" />

      {/* Very Soft, Decreased Ambient Glow Nebulae (non-distracting, refined) */}
      {glowOpacity !== 'none' && (
        <>
          <div className="absolute top-1/4 right-1/4 w-[480px] h-[480px] bg-[#dfff00]/2.5 blur-[130px] rounded-full" />
          <div className="absolute bottom-1/4 left-1/4 w-[520px] h-[520px] bg-[#00f0ff]/2 blur-[150px] rounded-full" />
        </>
      )}
    </div>
  );
};
