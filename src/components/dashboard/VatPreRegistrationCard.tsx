'use client';

import React from 'react';

interface VatPreRegistrationCardProps {
  taxLiability?: number;
  dueDate?: string;
  vatAmount?: number;
  inputTax?: number;
}

export default function VatPreRegistrationCard({
  taxLiability = 0,
  dueDate = '10.01.2026',
  vatAmount = 0,
  inputTax = 0,
}: VatPreRegistrationCardProps) {
  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')}\u00A0€`;
  };

  const calculateNetLiability = () => {
    return vatAmount - inputTax;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Umsatzsteuer-Voranmeldung</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Zahllast Okt - Dez</div>
              <div className="text-2xl font-bold text-gray-900">{formatAmount(taxLiability)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Fällig am</div>
              <div className="text-xl font-semibold text-gray-900">{dueDate}</div>
              <button className="mt-2 p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M8.14236 3.89973C9.25672 3.16986 10.5856 2.75 12 2.75C15.458 2.75 18.4048 5.2596 18.9554 8.67345L20.1168 15.8742M18.25 18.25H4.67421C4.05839 18.25 3.58891 17.6987 3.68697 17.0908L5.04461 8.67345C5.19977 7.71144 5.54521 6.82123 6.03875 6.03875M18.25 18.25L6.03875 6.03875M18.25 18.25L21 21M3 3L6.03875 6.03875M16 18.25C15.3267 20.0159 13.7891 21.25 12 21.25C10.2109 21.25 8.67327 20.0159 8 18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
              <div className="text-sm font-medium text-gray-700">Umsatzsteuer</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{formatAmount(vatAmount)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                  <path d="M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
              <div className="text-sm font-medium text-gray-700">- Vorsteuer</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{formatAmount(inputTax)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                  <path d="M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer border-t border-gray-200 pt-3 transition-colors">
              <div className="text-sm font-semibold text-gray-900">= Zahllast</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{formatAmount(calculateNetLiability())}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                  <path d="M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <button className="text-sm text-[#14ad9f] hover:text-[#129a8f] font-medium flex items-center gap-2 transition-colors">
          UStVA erstellen
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14.3322 5.83209L19.8751 11.375C20.2656 11.7655 20.2656 12.3987 19.8751 12.7892L14.3322 18.3321M19.3322 12.0821H3.83218" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}