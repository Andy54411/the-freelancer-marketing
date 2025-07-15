'use client';

import { useState } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { Settings } from 'lucide-react';

export default function CookieSettings() {
  const { resetConsent } = useCookieConsent();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    resetConsent();
    setShowTooltip(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-2 text-gray-600 hover:text-[#14ad9f] transition-colors rounded-lg hover:bg-gray-100"
        aria-label="Cookie-Einstellungen"
      >
        <Settings className="w-5 h-5" />
      </button>
      
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap z-10">
          Cookie-Einstellungen
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}
