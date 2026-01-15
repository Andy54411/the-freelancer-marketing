'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebase/clients';
import { doc, getDoc, updateDoc, Timestamp, collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ProfitEstimationSettingsProps {
  uid: string;
}

type EstimationMethod = 'standard' | 'extrapolation' | 'manual';

interface EstimationData {
  method: EstimationMethod;
  standardAmount: number;
  manualAmount: number;
  extrapolatedAmount: number;
  updatedAt?: Date;
}

// Helper: Number zu deutschem String formatieren
function formatGermanNumber(value: number): string {
  if (value === 0) return '';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper: String zu Number konvertieren (deutsches Format)
function parseGermanNumber(value: string): number {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper: Live-Formatierung während der Eingabe
function formatCurrencyInput(value: string): string {
  let cleaned = value.replace(/[^\d,]/g, '');
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  const [integerPart, decimalPart] = cleaned.split(',');
  const formattedInteger = integerPart
    ? parseInt(integerPart, 10).toLocaleString('de-DE')
    : '';
  if (decimalPart !== undefined) {
    const limitedDecimal = decimalPart.slice(0, 2);
    return formattedInteger + ',' + limitedDecimal;
  }
  return formattedInteger;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export function ProfitEstimationSettings({ uid }: ProfitEstimationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimationData, setEstimationData] = useState<EstimationData>({
    method: 'standard',
    standardAmount: 10000,
    manualAmount: 0,
    extrapolatedAmount: 0,
  });
  const [manualAmountInput, setManualAmountInput] = useState('');
  const [standardAmountInput, setStandardAmountInput] = useState('10.000,00');
  const [currentQuarter, setCurrentQuarter] = useState(1);

  // Berechne Extrapolation basierend auf bisherigen Einnahmen/Ausgaben
  const calculateExtrapolation = useCallback(async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const quarter = Math.floor(currentMonth / 3) + 1;
    setCurrentQuarter(quarter);

    const yearStart = new Date(currentYear, 0, 1);
    const now = new Date();

    try {
      // Lade Einnahmen
      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesSnap = await getDocs(invoicesRef);
      let totalIncome = 0;
      invoicesSnap.forEach(docSnap => {
        const data = docSnap.data();
        let invoiceDate: Date | null = null;
        if (data.invoiceDate?.toDate) {
          invoiceDate = data.invoiceDate.toDate();
        } else if (data.issueDate) {
          invoiceDate = new Date(data.issueDate);
        } else if (data.date) {
          invoiceDate = new Date(data.date);
        } else if (data.createdAt?.toDate) {
          invoiceDate = data.createdAt.toDate();
        }
        if (invoiceDate && invoiceDate >= yearStart && invoiceDate <= now) {
          if (['finalized', 'paid', 'sent', 'overdue'].includes(data.status)) {
            totalIncome += data.subtotal || data.amount || data.netAmount || 0;
          }
        }
      });

      // Lade Ausgaben
      const expensesRef = collection(db, 'companies', uid, 'expenses');
      const expensesSnap = await getDocs(expensesRef);
      let totalExpenses = 0;
      expensesSnap.forEach(docSnap => {
        const data = docSnap.data();
        let expenseDate: Date | null = null;
        if (data.expenseDate?.toDate) {
          expenseDate = data.expenseDate.toDate();
        } else if (data.date) {
          expenseDate = new Date(data.date);
        } else if (data.createdAt?.toDate) {
          expenseDate = data.createdAt.toDate();
        }
        if (expenseDate && expenseDate >= yearStart && expenseDate <= now) {
          const status = data.status;
          if (!status || status === 'active' || ['PAID', 'APPROVED', 'paid', 'approved'].includes(status)) {
            totalExpenses += data.netAmount || data.amount || 0;
          }
        }
      });

      // Berechne bisherigen Gewinn und extrapoliere auf das Jahr
      const gewinnBisher = totalIncome - totalExpenses;
      
      // Anzahl der verstrichenen Monate (mindestens 1)
      const monthsElapsed = Math.max(1, currentMonth + 1);
      const extrapolatedYearlyProfit = (gewinnBisher / monthsElapsed) * 12;

      return Math.max(0, extrapolatedYearlyProfit);
    } catch {
      return 0;
    }
  }, [uid]);

  // Lade gespeicherte Einstellungen
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          const savedEstimation = data.profitEstimation || {};
          
          setEstimationData({
            method: savedEstimation.method || 'standard',
            standardAmount: savedEstimation.standardAmount || 10000,
            manualAmount: savedEstimation.manualAmount || 0,
            extrapolatedAmount: savedEstimation.extrapolatedAmount || 0,
          });
          
          setManualAmountInput(formatGermanNumber(savedEstimation.manualAmount || 0));
          setStandardAmountInput(formatGermanNumber(savedEstimation.standardAmount || 10000));
        }

        // Berechne aktuelle Extrapolation
        const extrapolated = await calculateExtrapolation();
        setEstimationData(prev => ({
          ...prev,
          extrapolatedAmount: extrapolated,
        }));

      } catch {
        toast.error('Fehler beim Laden der Einstellungen');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [uid, calculateExtrapolation]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const updatedData = {
        profitEstimation: {
          method: estimationData.method,
          standardAmount: parseGermanNumber(standardAmountInput) || 10000,
          manualAmount: parseGermanNumber(manualAmountInput) || 0,
          extrapolatedAmount: estimationData.extrapolatedAmount,
          updatedAt: Timestamp.now(),
        },
      };

      await updateDoc(doc(db, 'companies', uid), updatedData);
      toast.success('Gewinnschätzung gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const getEffectiveProfit = (): number => {
    switch (estimationData.method) {
      case 'standard':
        return parseGermanNumber(standardAmountInput) || 10000;
      case 'extrapolation':
        return estimationData.extrapolatedAmount;
      case 'manual':
        return parseGermanNumber(manualAmountInput) || 0;
      default:
        return 10000;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-100 rounded w-1/4"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header - Minimalistisch */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Gewinnschätzung</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Basis für deine Steuervorauszahlungen
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-gray-500 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                Die Gewinnschätzung wird für die Berechnung deiner voraussichtlichen 
                Einkommensteuer verwendet.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Optionen - Clean Radio Style */}
      <div className="divide-y divide-gray-100">
        {/* Option 1: Standardprofil */}
        <label 
          className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors ${
            estimationData.method === 'standard' ? 'bg-gray-50/50' : ''
          }`}
        >
          <input
            type="radio"
            name="estimation-method"
            checked={estimationData.method === 'standard'}
            onChange={() => setEstimationData(prev => ({ ...prev, method: 'standard' }))}
            className="mt-0.5 w-4 h-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f] focus:ring-offset-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-gray-900">Standardprofil</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(parseGermanNumber(standardAmountInput) || 10000)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Fester Betrag, wenn du deine Einnahmen noch nicht einschätzen kannst
            </p>
            
            {estimationData.method === 'standard' && (
              <div className="mt-3">
                <div className="relative w-40">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={standardAmountInput}
                    onChange={(e) => setStandardAmountInput(formatCurrencyInput(e.target.value))}
                    onBlur={() => {
                      const parsed = parseGermanNumber(standardAmountInput);
                      if (parsed > 0) {
                        setStandardAmountInput(formatGermanNumber(parsed));
                      }
                    }}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    placeholder="10.000,00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                </div>
              </div>
            )}
          </div>
        </label>

        {/* Option 2: Extrapolation */}
        <label 
          className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors ${
            estimationData.method === 'extrapolation' ? 'bg-gray-50/50' : ''
          }`}
        >
          <input
            type="radio"
            name="estimation-method"
            checked={estimationData.method === 'extrapolation'}
            onChange={() => setEstimationData(prev => ({ ...prev, method: 'extrapolation' }))}
            className="mt-0.5 w-4 h-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f] focus:ring-offset-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-gray-900">Automatische Hochrechnung</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(estimationData.extrapolatedAmount)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Basierend auf deinen bisherigen Einnahmen und Ausgaben in {new Date().getFullYear()}
            </p>
            
            {currentQuarter === 1 && estimationData.method === 'extrapolation' && (
              <p className="text-xs text-gray-400 mt-2">
                Hinweis: Im Q1 noch wenig Daten verfügbar
              </p>
            )}
          </div>
        </label>

        {/* Option 3: Manuelle Schätzung */}
        <label 
          className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors ${
            estimationData.method === 'manual' ? 'bg-gray-50/50' : ''
          }`}
        >
          <input
            type="radio"
            name="estimation-method"
            checked={estimationData.method === 'manual'}
            onChange={() => setEstimationData(prev => ({ ...prev, method: 'manual' }))}
            className="mt-0.5 w-4 h-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f] focus:ring-offset-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-gray-900">Eigene Schätzung</span>
              {parseGermanNumber(manualAmountInput) > 0 && (
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(parseGermanNumber(manualAmountInput))}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Du gibst deinen erwarteten Jahresgewinn selbst ein
            </p>
            
            {estimationData.method === 'manual' && (
              <div className="mt-3">
                <div className="relative w-40">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualAmountInput}
                    onChange={(e) => setManualAmountInput(formatCurrencyInput(e.target.value))}
                    onBlur={() => {
                      const parsed = parseGermanNumber(manualAmountInput);
                      if (parsed > 0) {
                        setManualAmountInput(formatGermanNumber(parsed));
                      }
                    }}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    placeholder="0,00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                </div>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Footer - Kompakt */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Aktiv: <span className="font-medium text-gray-900">{formatCurrency(getEffectiveProfit())}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#14ad9f] text-white text-sm font-medium rounded-lg hover:bg-[#0d8a7f] transition-colors disabled:opacity-50"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

export default ProfitEstimationSettings;
