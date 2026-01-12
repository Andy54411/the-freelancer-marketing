'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TaxService } from '@/services/taxService';

interface UStVAData {
  umsatzsteuerSchuld: number;
  vorsteuerGuthaben: number;
  zahllast: number;
  erstattung: number;
}

export default function VatPreRegistrationCard() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  
  const [ustVAData, setUstVAData] = useState<UStVAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quarterLabel, setQuarterLabel] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const loadUStVAData = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
        
        // Zeige das vorherige Quartal (das zur Abgabe fällig ist)
        const displayQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
        const displayYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
        
        const data = await TaxService.calculateUStVA(uid, displayYear, displayQuarter);
        
        if (data) {
          setUstVAData({
            umsatzsteuerSchuld: data.umsatzsteuerSchuld,
            vorsteuerGuthaben: data.vorsteuerGuthaben,
            zahllast: data.zahllast,
            erstattung: data.erstattung,
          });
        }

        // Quartalslabel setzen
        const quarterMonths: Record<number, string> = {
          1: 'Jan - Mär',
          2: 'Apr - Jun',
          3: 'Jul - Sep',
          4: 'Okt - Dez',
        };
        setQuarterLabel(quarterMonths[displayQuarter] || '');

        // Fälligkeitsdatum berechnen (10. des Folgemonats nach Quartalsende)
        const dueDateObj = new Date(displayYear, displayQuarter * 3, 10);
        setDueDate(dueDateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      } catch (error) {
        // Fehler wird nicht in der Konsole ausgegeben (keine console.log)
        setUstVAData(null);
      } finally {
        setLoading(false);
      }
    };

    loadUStVAData();
  }, [uid]);

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')}\u00A0€`;
  };

  const taxLiability = ustVAData?.zahllast || ustVAData?.erstattung || 0;
  const vatAmount = ustVAData?.umsatzsteuerSchuld || 0;
  const inputTax = ustVAData?.vorsteuerGuthaben || 0;
  const isRefund = (ustVAData?.erstattung || 0) > 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Umsatzsteuer-Voranmeldung</h2>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-28"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Umsatzsteuer-Voranmeldung</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">
                {isRefund ? 'Erstattung' : 'Zahllast'} {quarterLabel}
              </div>
              <div className={`text-2xl font-bold ${isRefund ? 'text-green-600' : 'text-gray-900'}`}>
                {isRefund ? '-' : ''}{formatAmount(taxLiability)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Fällig am</div>
              <div className="text-xl font-semibold text-gray-900">{dueDate}</div>
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
              <div className="text-sm font-semibold text-gray-900">
                = {isRefund ? 'Erstattung' : 'Zahllast'}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isRefund ? 'text-green-600' : 'text-gray-900'}`}>
                  {isRefund ? '-' : ''}{formatAmount(vatAmount - inputTax > 0 ? vatAmount - inputTax : Math.abs(vatAmount - inputTax))}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                  <path d="M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <Link 
          href={`/dashboard/company/${uid}/finance/taxes`}
          className="text-sm text-[#14ad9f] hover:text-[#129a8f] font-medium flex items-center gap-2 transition-colors"
        >
          UStVA erstellen
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14.3322 5.83209L19.8751 11.375C20.2656 11.7655 20.2656 12.3987 19.8751 12.7892L14.3322 18.3321M19.3322 12.0821H3.83218" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}