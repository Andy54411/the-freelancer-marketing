'use client';

import React from 'react';

interface AccountingScoreCardProps {
  score?: number;
  paymentsWithoutReceipt?: number;
  requiresData?: boolean;
}

export default function AccountingScoreCard({
  score = 100,
  paymentsWithoutReceipt = 0,
  requiresData = true
}: AccountingScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 100) return '#22c55e';
    if (score >= 85) return '#eab308';
    return '#ef4444';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 100) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-500">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5"></circle>
          <path d="M9.3512 12.1294C11.249 10.6235 11.5267 9.18021 10.9644 8.29916C10.6914 7.87139 10.2309 7.61154 9.73854 7.59301C9.30505 7.5767 8.86465 7.74783 8.52071 8.12296C8.06921 7.88809 7.59683 7.8779 7.19507 8.0415C6.73873 8.22731 6.39488 8.62899 6.28465 9.12434C6.05761 10.1446 6.81225 11.4058 9.11063 12.1719C9.19284 12.1993 9.28332 12.1833 9.3512 12.1294Z" fill="currentColor"></path>
          <path d="M14.8895 12.1719C17.1878 11.4059 17.9425 10.1446 17.7154 9.12441C17.6052 8.62906 17.2613 8.22738 16.805 8.04157C16.4032 7.87798 15.9309 7.88816 15.4794 8.12303C15.1354 7.7479 14.695 7.57677 14.2615 7.59309C13.7692 7.61162 13.3087 7.87147 13.0356 8.29924C12.4734 9.18029 12.7511 10.6236 14.6489 12.1295C14.7168 12.1834 14.8073 12.1993 14.8895 12.1719Z" fill="currentColor"></path>
          <path d="M11.999 18C14.0206 18 15.6919 16.5003 15.9611 14.5527C16.0017 14.2591 15.7425 14.0267 15.4473 14.053C13.1381 14.2588 10.8598 14.2588 8.55062 14.053C8.25537 14.0267 7.99624 14.2591 8.03682 14.5527C8.306 16.5003 9.97734 18 11.999 18Z" fill="currentColor"></path>
        </svg>
      );
    } else if (score >= 85) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-yellow-500">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5"></circle>
          <circle cx="9" cy="9" r="1.25" fill="currentColor"></circle>
          <circle cx="15" cy="9" r="1.25" fill="currentColor"></circle>
          <path d="M8.64155 14.2981C8.93444 14.0052 9.40931 14.0052 9.70221 14.2981C10.9714 15.5673 13.0292 15.5673 14.2984 14.2981C14.5913 14.0052 15.0662 14.0052 15.3591 14.2981" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
        </svg>
      );
    } else {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5"></circle>
          <circle cx="9" cy="9" r="1.25" fill="currentColor"></circle>
          <circle cx="15" cy="9" r="1.25" fill="currentColor"></circle>
          <path d="M8 14.25h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
        </svg>
      );
    }
  };

  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Buchhaltungsscore</h2>
        </div>
        
        <div className="space-y-6">
          {/* Score Kreis */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Hintergrund Kreis */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                {/* Progress Kreis */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={getScoreColor(score)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{score}%</span>
              </div>
            </div>
            
            {/* Score Icon */}
            <div className="mt-4">
              {getScoreIcon(score)}
            </div>
          </div>

          {/* Score Legende */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500">
                <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5"></circle>
                <circle cx="9" cy="9" r="1.25" fill="currentColor"></circle>
                <circle cx="15" cy="9" r="1.25" fill="currentColor"></circle>
                <path d="M8 14.25h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
              </svg>
              <span className="text-gray-600">0 – 85</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-yellow-500">
                <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5"></circle>
                <circle cx="9" cy="9" r="1.25" fill="currentColor"></circle>
                <circle cx="15" cy="9" r="1.25" fill="currentColor"></circle>
                <path d="M8.64155 14.2981C8.93444 14.0052 9.40931 14.0052 9.70221 14.2981C10.9714 15.5673 13.0292 15.5673 14.2984 14.2981" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
              </svg>
              <span className="text-gray-600">85 – 99</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5"></circle>
                <path d="M9 12c.5-1 1.5-2 3-2s2.5 1 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                <circle cx="9" cy="9" r="1.25" fill="currentColor"></circle>
                <circle cx="15" cy="9" r="1.25" fill="currentColor"></circle>
              </svg>
              <span className="text-gray-600">100</span>
            </div>
          </div>

          {/* Zahlungen ohne Beleg */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-700">Zahlungen ohne Beleg</div>
              <div className="text-2xl font-bold text-gray-900">{paymentsWithoutReceipt}</div>
            </div>
            <button 
              className="px-4 py-2 bg-[#14ad9f] text-white text-sm font-medium rounded-lg hover:bg-[#129a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={score >= 100}
            >
              Score verbessern
            </button>
          </div>

          {/* Erklärung */}
          <div className="text-xs text-gray-500 leading-relaxed">
            Der Score berechnet sich aus dem Anteil aller Bank-Zahlungen, die noch keinem Beleg zugeordnet sind. 
            Du erreichst 100%, wenn all deine Zahlungen einem Beleg zugeordnet sind.
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          {requiresData && (
            <div className="text-sm text-gray-500">Daten erforderlich</div>
          )}
          <button className="text-sm text-[#14ad9f] hover:text-[#129a8f] font-medium flex items-center gap-2 transition-colors ml-auto">
            Bankkonto verknüpfen
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14.3322 5.83209L19.8751 11.375C20.2656 11.7655 20.2656 12.3987 19.8751 12.7892L14.3322 18.3321M19.3322 12.0821H3.83218" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}