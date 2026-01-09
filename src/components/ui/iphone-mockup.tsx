'use client';

import React from 'react';

interface IPhoneMockupProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function IPhoneMockup({ children, className = '', size = 'md' }: IPhoneMockupProps) {
  const sizes = {
    sm: { width: 280, height: 570, radius: 44, notch: 90, homeBar: 100, bezel: 6 },
    md: { width: 320, height: 650, radius: 50, notch: 110, homeBar: 120, bezel: 6 },
    lg: { width: 360, height: 730, radius: 56, notch: 130, homeBar: 140, bezel: 6 },
  };

  const s = sizes[size];
  const screenRadius = s.radius - s.bezel;

  return (
    <div className={`relative ${className}`} style={{ width: s.width, height: s.height }}>
      {/* Äußerer Rahmen (Titanium) */}
      <div 
        className="absolute inset-0 shadow-2xl"
        style={{ 
          borderRadius: s.radius,
          background: 'linear-gradient(to bottom, #A0A0A5, #D4D4D8, #A0A0A5)',
          padding: 3 
        }}
      >
        {/* Innerer Rand (dunkel) */}
        <div 
          className="w-full h-full"
          style={{ 
            borderRadius: s.radius - 3,
            background: '#1C1C1E',
            padding: 3
          }}
        >
          {/* Screen Bereich mit Content */}
          <div 
            className="relative w-full h-full overflow-hidden bg-white"
            style={{ borderRadius: screenRadius }}
          >
            {/* Content - füllt den gesamten Screen */}
            <div className="absolute inset-0 z-10">
              {children}
            </div>

            {/* Dynamic Island - über dem Content */}
            <div 
              className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-black rounded-full"
              style={{ width: s.notch, height: 30 }}
            />

            {/* Home Indicator - über dem Content */}
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 bg-black/40 rounded-full h-[5px]"
              style={{ width: s.homeBar }}
            />
          </div>
        </div>
      </div>

      {/* Seitenbuttons */}
      <div className="absolute left-0 top-[100px] w-[3px] h-[60px] bg-gradient-to-b from-[#8E8E93] to-[#6E6E73] rounded-l-sm -translate-x-[2px]" />
      <div className="absolute left-0 top-[180px] w-[3px] h-[40px] bg-gradient-to-b from-[#8E8E93] to-[#6E6E73] rounded-l-sm -translate-x-[2px]" />
      <div className="absolute left-0 top-[230px] w-[3px] h-[40px] bg-gradient-to-b from-[#8E8E93] to-[#6E6E73] rounded-l-sm -translate-x-[2px]" />
      <div className="absolute right-0 top-[160px] w-[3px] h-[80px] bg-gradient-to-b from-[#8E8E93] to-[#6E6E73] rounded-r-sm translate-x-[2px]" />
    </div>
  );
}
