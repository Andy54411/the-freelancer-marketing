'use client';

/**
 * Einkommensteuer-Vorauszahlung Detail-Seite
 * Zeigt Details zu einer bestimmten Vorauszahlung mit Schätzung und Zahlungsoptionen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  HelpCircle,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, getDocs, query, where, Timestamp, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import Link from 'next/link';
import { TaxEstimationWizard } from '@/components/finance/TaxEstimationWizard';

interface TaxPrepayment {
  id: string;
  quarter: number;
  year: number;
  dueDate: Date;
  estimatedAmount: number;
  finanzamtAmount: number;
  paidInPreviousQuarters: number;
  estimatedRefund: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const getQuarterName = (quarter: number): string => {
  const names: Record<number, string> = {
    1: '1. Quartal',
    2: '2. Quartal',
    3: '3. Quartal',
    4: '4. Quartal',
  };
  return names[quarter] || `Q${quarter}`;
};

export default function EstPrepaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const prepaymentId = typeof params?.prepaymentId === 'string' ? params.prepaymentId : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prepayment, setPrepayment] = useState<TaxPrepayment | null>(null);
  const [showAmountEditor, setShowAmountEditor] = useState(false);
  const [editedAmount, setEditedAmount] = useState('0');
  const [showEstimationWizard, setShowEstimationWizard] = useState(false);

  // Parse prepaymentId (Format: est-2026-q2)
  const parsePrepaymentId = useCallback(() => {
    const match = prepaymentId.match(/est-(\d{4})-q(\d)/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        quarter: parseInt(match[2], 10),
      };
    }
    return null;
  }, [prepaymentId]);

  const loadPrepaymentData = useCallback(async () => {
    if (!uid || !prepaymentId) return;

    const parsed = parsePrepaymentId();
    if (!parsed) {
      toast.error('Ungültige Vorauszahlungs-ID');
      router.push(`/dashboard/company/${uid}/finance/taxes`);
      return;
    }

    try {
      setLoading(true);
      const { year, quarter } = parsed;

      // Berechne Fälligkeitsdatum
      const dueDates: Record<number, { month: number; day: number }> = {
        1: { month: 2, day: 10 }, // 10. März
        2: { month: 5, day: 10 }, // 10. Juni
        3: { month: 8, day: 10 }, // 10. September
        4: { month: 11, day: 10 }, // 10. Dezember
      };
      const dueDate = new Date(year, dueDates[quarter].month, dueDates[quarter].day);

      // Lade gespeicherte Vorauszahlungsdaten
      const prepaymentDoc = await getDoc(doc(db, 'companies', uid, 'taxPrepayments', prepaymentId));
      let finanzamtAmount = 0;
      let paidInPreviousQuarters = 0;
      let status: 'pending' | 'paid' | 'overdue' = 'pending';
      let paidAt: Date | undefined;

      if (prepaymentDoc.exists()) {
        const data = prepaymentDoc.data();
        finanzamtAmount = data.finanzamtAmount || 0;
        paidInPreviousQuarters = data.paidInPreviousQuarters || 0;
        status = data.status || 'pending';
        paidAt = data.paidAt?.toDate?.() || undefined;
      }

      // Berechne geschätzte Einkommensteuer basierend auf bisherigen Einnahmen/Ausgaben
      const yearStart = new Date(year, 0, 1);
      const quarterEnd = new Date(year, quarter * 3, 0); // Ende des Quartals

      // Lade Einnahmen bis zum Quartal
      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('invoiceDate', '>=', Timestamp.fromDate(yearStart)),
        where('invoiceDate', '<=', Timestamp.fromDate(quarterEnd))
      );
      const invoicesSnap = await getDocs(invoicesQuery);
      let totalIncome = 0;
      invoicesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (['paid', 'sent', 'overdue'].includes(data.status)) {
          totalIncome += (data.netAmount || data.subtotal || 0) / 100;
        }
      });

      // Lade Ausgaben bis zum Quartal
      const expensesRef = collection(db, 'companies', uid, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('expenseDate', '>=', Timestamp.fromDate(yearStart)),
        where('expenseDate', '<=', Timestamp.fromDate(quarterEnd))
      );
      const expensesSnap = await getDocs(expensesQuery);
      let totalExpenses = 0;
      expensesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (['PAID', 'APPROVED', 'paid', 'approved'].includes(data.status)) {
          totalExpenses += (data.netAmount || data.amount || 0) / 100;
        }
      });

      // Hochrechnung auf das ganze Jahr
      const gewinnBisQuartal = totalIncome - totalExpenses;
      const hochgerechneterJahresgewinn = (gewinnBisQuartal / quarter) * 4;

      // Geschätzte ESt (vereinfacht: ~25% auf Gewinn über Grundfreibetrag)
      const grundfreibetrag = 11604; // 2024
      const zuVersteuern = Math.max(0, hochgerechneterJahresgewinn - grundfreibetrag);
      const geschaetzteJahresEst = zuVersteuern * 0.25;
      const estimatedQuarterAmount = geschaetzteJahresEst / 4;

      // Berechne Erstattung/Nachzahlung
      const estimatedRefund = paidInPreviousQuarters + finanzamtAmount - (estimatedQuarterAmount * quarter);

      // Prüfe Status
      if (status === 'pending' && dueDate < new Date()) {
        status = 'overdue';
      }

      setPrepayment({
        id: prepaymentId,
        quarter,
        year,
        dueDate,
        estimatedAmount: estimatedQuarterAmount,
        finanzamtAmount,
        paidInPreviousQuarters,
        estimatedRefund,
        status,
        paidAt,
      });
      setEditedAmount(finanzamtAmount.toString());

    } catch (error) {
      console.error('Fehler beim Laden:', error);
      toast.error('Fehler beim Laden der Vorauszahlungsdaten');
    } finally {
      setLoading(false);
    }
  }, [uid, prepaymentId, parsePrepaymentId, router]);

  useEffect(() => {
    loadPrepaymentData();
  }, [loadPrepaymentData]);

  const handleSaveFinanzamtAmount = async () => {
    if (!prepayment) return;

    try {
      setSaving(true);
      const amount = parseFloat(editedAmount.replace(',', '.')) || 0;

      await setDoc(doc(db, 'companies', uid, 'taxPrepayments', prepaymentId), {
        finanzamtAmount: amount,
        paidInPreviousQuarters: prepayment.paidInPreviousQuarters,
        status: prepayment.status,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      setPrepayment(prev => prev ? { ...prev, finanzamtAmount: amount } : null);
      setShowAmountEditor(false);
      toast.success('Betrag gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!prepayment) return;

    try {
      setSaving(true);

      await setDoc(doc(db, 'companies', uid, 'taxPrepayments', prepaymentId), {
        status: 'paid',
        paidAt: Timestamp.now(),
        finanzamtAmount: prepayment.finanzamtAmount,
        paidInPreviousQuarters: prepayment.paidInPreviousQuarters,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      setPrepayment(prev => prev ? { ...prev, status: 'paid', paidAt: new Date() } : null);
      toast.success('Als bezahlt markiert');
    } catch (error) {
      console.error('Fehler beim Markieren:', error);
      toast.error('Fehler beim Markieren');
    } finally {
      setSaving(false);
    }
  };

  // Autorisierung
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="h-12 bg-gray-200 rounded w-2/3"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!prepayment) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-600">Vorauszahlung nicht gefunden.</p>
        <Link href={`/dashboard/company/${uid}/finance/taxes`}>
          <Button className="mt-4">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  const amountToPay = Math.max(0, prepayment.finanzamtAmount);
  const nothingToPay = amountToPay === 0;

  return (
    <div className="max-w-4xl mx-auto pb-32">
      {/* Breadcrumb */}
      <Link 
        href={`/dashboard/company/${uid}/finance/taxes`}
        className="inline-flex items-center gap-1 text-[#14ad9f] hover:text-[#0d8a7f] mb-4 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Steuern
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Einkommensteuer-Vorauszahlung {getQuarterName(prepayment.quarter)} {prepayment.year}
        </h1>
        <button className="text-gray-400 hover:text-gray-600">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Status Badge wenn bezahlt */}
      {prepayment.status === 'paid' && (
        <div className="mb-6 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            Bezahlt{prepayment.paidAt ? ` am ${new Intl.DateTimeFormat('de-DE').format(prepayment.paidAt)}` : ''}
          </span>
        </div>
      )}

      {/* Selbständige Tätigkeit */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Selbständige Tätigkeit</h2>
        
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Geschätzte Einkommensteuer */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Geschätzte Einkommensteuer</span>
              <button 
                onClick={() => setShowEstimationWizard(true)}
                className="text-[#14ad9f] hover:text-[#0d8a7f] text-sm font-medium"
              >
                Schätzung verbessern
              </button>
            </div>
            <span className="text-gray-900 font-medium">{formatCurrency(prepayment.estimatedAmount)}</span>
          </div>

          {/* Vom Finanzamt festgelegte Vorauszahlung */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Vom Finanzamt festgelegte Vorauszahlung</span>
                <span className="text-gray-500 text-sm">(aktualisiere manuell, falls Betrag abweicht)</span>
              </div>
              <div className="text-sm text-gray-500">
                Basierend auf deinen Angaben{' '}
                <button 
                  onClick={() => setShowAmountEditor(true)}
                  className="text-[#14ad9f] hover:text-[#0d8a7f] font-medium"
                >
                  (ändern)
                </button>
              </div>
            </div>
            <span className="text-gray-900 font-medium">{formatCurrency(prepayment.finanzamtAmount)}</span>
          </div>

          {/* In vorhergehenden Quartalen bereits gezahlt */}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-gray-700">In vorhergehenden Quartalen in {prepayment.year} bereits gezahlt</span>
            <span className="text-gray-900 font-medium">{formatCurrency(prepayment.paidInPreviousQuarters)}</span>
          </div>

          {/* Geschätzte Erstattung */}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-gray-700">Geschätzte Erstattung der Einkommensteuer</span>
            <span className="text-gray-900 font-medium">{formatCurrency(Math.max(0, prepayment.estimatedRefund))}</span>
          </div>
        </div>
      </div>

      {/* Betrag Editor Modal */}
      {showAmountEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Vorauszahlungsbetrag ändern
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Geben Sie den vom Finanzamt festgelegten Vorauszahlungsbetrag ein.
            </p>
            <div className="relative mb-6">
              <input
                type="text"
                value={editedAmount}
                onChange={(e) => setEditedAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-medium text-right pr-12 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
                placeholder="0,00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAmountEditor(false)}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveFinanzamtAmount}
                disabled={saving}
                className="flex-1 bg-[#14ad9f] hover:bg-[#0d8a7f]"
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Bar */}
      {prepayment.status !== 'paid' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              {nothingToPay ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xs">i</span>
                  </div>
                  <span className="text-blue-700 font-medium">Du musst nichts zahlen.</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-amber-600 text-xs">!</span>
                  </div>
                  <span className="text-amber-700 font-medium">
                    Zu zahlen: {formatCurrency(amountToPay)}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="default"
                className="bg-[#14ad9f] hover:bg-[#0d8a7f] text-white px-6"
                disabled={nothingToPay}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Mit Taskilo bezahlen
              </Button>
              <Button
                variant="outline"
                onClick={handleMarkAsPaid}
                disabled={saving}
                className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f]/10"
              >
                {saving ? 'Speichern...' : "Als 'bezahlt' markieren"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Estimation Wizard Modal */}
      <TaxEstimationWizard
        isOpen={showEstimationWizard}
        onClose={() => setShowEstimationWizard(false)}
        companyId={uid}
        onComplete={() => loadPrepaymentData()}
      />
    </div>
  );
}
