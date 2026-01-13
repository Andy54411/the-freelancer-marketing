'use client';

import React, { useState } from 'react';
import { Users, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { PartnerSharingModal } from './PartnerSharingModal';

interface UpdatesSectionProps {
  userEmail: string;
  userPassword: string;
}

export function UpdatesSection({ userEmail, userPassword }: UpdatesSectionProps) {
  const { isDark } = useWebmailTheme();
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerSetup, setPartnerSetup] = useState<{
    partner: { name: string; email: string } | null;
    startDate: string | null;
  }>({ partner: null, startDate: null });

  const handleInviteSent = (
    partner: { name: string; email: string },
    startDate: string | null
  ) => {
    setPartnerSetup({ partner, startDate });
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={cn("text-2xl font-normal", isDark ? "text-white" : "text-gray-900")}>
          Updates
        </h1>
      </div>

      {/* Partner teilen Banner */}
      {!partnerSetup.partner && (
        <div className={cn(
          "flex items-center gap-4 p-4 rounded-xl mb-8",
          isDark ? "bg-[#303134]" : "bg-gray-50 border border-gray-200"
        )}>
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          
          {/* Text */}
          <div className="flex-1">
            <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
              Mit Partner teilen
            </h3>
            <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
              Nie mehr vergessen, ein Foto mit deinem Partner zu teilen
            </p>
          </div>
          
          {/* Button */}
          <button
            onClick={() => setShowPartnerModal(true)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium border transition-colors shrink-0",
              isDark 
                ? "border-teal-500 text-teal-400 hover:bg-teal-900/30" 
                : "border-teal-600 text-teal-600 hover:bg-teal-50"
            )}
          >
            Jetzt starten
          </button>
        </div>
      )}

      {/* Einladung gesendet Bestätigung */}
      {partnerSetup.partner && (
        <div className={cn(
          "flex items-center gap-4 p-4 rounded-xl mb-8",
          isDark ? "bg-teal-900/30 border border-teal-800" : "bg-teal-50 border border-teal-200"
        )}>
          <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className={cn("font-medium", isDark ? "text-teal-300" : "text-teal-800")}>
              Einladung gesendet
            </h3>
            <p className={cn("text-sm", isDark ? "text-teal-400" : "text-teal-700")}>
              Eine Einladung wurde an {partnerSetup.partner.email} gesendet.
            </p>
          </div>
          <button
            onClick={() => setPartnerSetup({ partner: null, startDate: null })}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              isDark ? "text-teal-400 hover:bg-teal-900/50" : "text-teal-600 hover:bg-teal-100"
            )}
          >
            Rückgängig
          </button>
        </div>
      )}

      {/* Keine Updates Illustration */}
      <div className="flex flex-col items-center justify-center py-16">
        {/* Paper Plane SVG Illustration */}
        <svg
          className="w-48 h-36 mb-8"
          viewBox="0 0 200 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wolken */}
          <ellipse cx="50" cy="100" rx="25" ry="12" fill={isDark ? "#4a4a4a" : "#e5e7eb"} />
          <ellipse cx="65" cy="95" rx="20" ry="10" fill={isDark ? "#4a4a4a" : "#e5e7eb"} />
          <ellipse cx="150" cy="110" rx="30" ry="14" fill={isDark ? "#4a4a4a" : "#e5e7eb"} />
          <ellipse cx="170" cy="105" rx="22" ry="11" fill={isDark ? "#4a4a4a" : "#e5e7eb"} />
          <ellipse cx="100" cy="120" rx="20" ry="10" fill={isDark ? "#4a4a4a" : "#e5e7eb"} />
          
          {/* Papierflieger */}
          <path
            d="M85 45 L130 75 L100 80 Z"
            fill="#14ad9f"
          />
          <path
            d="M85 45 L100 80 L95 95 Z"
            fill="#0d8a7f"
          />
          <path
            d="M100 80 L130 75 L95 95 Z"
            fill="#0f766e"
          />
          
          {/* Bewegungslinien */}
          <path
            d="M70 55 Q60 60 55 70"
            stroke={isDark ? "#6b7280" : "#d1d5db"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
            fill="none"
          />
          <path
            d="M75 65 Q65 70 60 80"
            stroke={isDark ? "#6b7280" : "#d1d5db"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
            fill="none"
          />
        </svg>
        
        <h2 className={cn("text-lg font-normal", isDark ? "text-gray-300" : "text-gray-700")}>
          Keine Updates verfügbar
        </h2>
      </div>

      {/* Partner Modal */}
      <PartnerSharingModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
        userEmail={userEmail}
        userPassword={userPassword}
        onInviteSent={handleInviteSent}
      />
    </div>
  );
}
