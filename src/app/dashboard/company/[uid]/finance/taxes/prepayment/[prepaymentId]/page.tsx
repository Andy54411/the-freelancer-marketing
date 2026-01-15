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
  ChevronDown,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import Link from 'next/link';
import { TaxEstimationWizard } from '@/components/finance/TaxEstimationWizard';
import { FixedAssetService } from '@/services/fixedAssetService';

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

interface TaxCalculationDetails {
  // Schätzmethode
  estimationMethod: 'standard' | 'extrapolation' | 'manual';
  // Einnahmen & Ausgaben
  totalIncome: number;
  totalExpenses: number;
  yearlyDepreciation: number;
  afaBisQuartal: number;
  gewinnBisQuartal: number;
  extrapolierterJahresgewinn: number;
  hochgerechneterJahresgewinn: number;
  // Zusätzliche Einkünfte
  einkommenAngestellt: number;
  gesamtEinkommen: number;
  // Abzüge
  krankenversicherung: number;
  privateKV: number;
  pflegeversicherung: number;
  vorsorgeaufwendungen: number;
  grundfreibetrag: number;
  // Ergebnis
  zuVersteuerndesEinkommen: number;
  einkommensteuer: number;
  solidaritaetszuschlag: number;
  kirchensteuer: number;
  gesamteSteuer: number;
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

/**
 * Berechnet die Einkommensteuer nach deutschem Tarif 2024/2025
 * Tarifzonen: Grundtarif (nicht Splittingtarif)
 */
function berechneEinkommensteuer(zvE: number): number {
  // Tarifzonen 2024 (vereinfacht)
  // Zone 1: 0 - 11.604€ = 0%
  // Zone 2: 11.605€ - 17.005€ = 14% - 24% (progressiv)
  // Zone 3: 17.006€ - 66.760€ = 24% - 42% (progressiv)
  // Zone 4: 66.761€ - 277.825€ = 42%
  // Zone 5: ab 277.826€ = 45%
  
  if (zvE <= 0) return 0;
  
  // Zone 1: Grundfreibetrag (bereits abgezogen in Berechnung oben)
  // Hier berechnen wir ab zvE = zu versteuerndes Einkommen nach Abzug Grundfreibetrag
  
  // Vereinfachte progressive Berechnung
  let steuer = 0;
  
  if (zvE <= 5401) {
    // Zone 2 (14% - 24%)
    const y = zvE / 10000;
    steuer = (1088.67 * y + 1400) * y;
  } else if (zvE <= 55156) {
    // Zone 3 (24% - 42%)
    const y = (zvE - 5401) / 10000;
    steuer = (206.43 * y + 2397) * y + 938.24;
  } else if (zvE <= 266221) {
    // Zone 4 (42%)
    steuer = 0.42 * zvE - 9972.98;
  } else {
    // Zone 5 (45%)
    steuer = 0.45 * zvE - 17962.64;
  }
  
  return Math.max(0, Math.round(steuer * 100) / 100);
}

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
  const [calculationDetails, setCalculationDetails] = useState<TaxCalculationDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

      // Lade TaxProfile-Daten aus dem Wizard
      const companyDoc = await getDoc(doc(db, 'companies', uid));
      const companyData = companyDoc.exists() ? companyDoc.data() : {};
      const taxProfile = companyData.taxProfile || {};
      const profitEstimation = companyData.profitEstimation || { method: 'extrapolation' };

      // Berechne geschätzte Einkommensteuer basierend auf bisherigen Einnahmen/Ausgaben
      const yearStart = new Date(year, 0, 1);
      const quarterEnd = new Date(year, quarter * 3, 0); // Ende des Quartals

      // Lade Einnahmen bis zum Quartal
      // Hinweis: Rechnungen haben verschiedene Datumsfelder (date, createdAt, invoiceDate)
      // Daher laden wir alle und filtern clientseitig
      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesSnap = await getDocs(invoicesRef);
      let totalIncome = 0;
      invoicesSnap.forEach(docSnap => {
        const data = docSnap.data();
        
        // Datum aus verschiedenen möglichen Feldern extrahieren
        let invoiceDate: Date | null = null;
        if (data.date) {
          invoiceDate = data.date instanceof Date ? data.date : 
                        data.date?.toDate?.() ? data.date.toDate() : 
                        typeof data.date === 'string' ? new Date(data.date) : null;
        } else if (data.createdAt) {
          invoiceDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : 
                        data.createdAt instanceof Date ? data.createdAt : null;
        } else if (data.invoiceDate) {
          invoiceDate = typeof data.invoiceDate === 'string' ? new Date(data.invoiceDate) : 
                        data.invoiceDate?.toDate?.() ? data.invoiceDate.toDate() : null;
        }
        
        // Prüfe ob im relevanten Zeitraum
        if (invoiceDate && invoiceDate >= yearStart && invoiceDate <= quarterEnd) {
          // Status-Filter: finalized, sent, paid, overdue (nicht draft, cancelled, storno)
          if (['finalized', 'paid', 'sent', 'overdue'].includes(data.status)) {
            // Beträge sind in Euro gespeichert (nicht Cents!)
            totalIncome += data.subtotal || data.amount || data.netAmount || 0;
          }
        }
      });

      // Lade Ausgaben bis zum Quartal
      // Hinweis: Ausgaben haben 'date' als String (YYYY-MM-DD Format)
      // Normale Ausgaben haben kein Statusfeld - sie werden immer gezählt
      const expensesRef = collection(db, 'companies', uid, 'expenses');
      const expensesSnap = await getDocs(expensesRef);
      let totalExpenses = 0;
      expensesSnap.forEach(docSnap => {
        const data = docSnap.data();
        
        // Datum aus verschiedenen möglichen Feldern extrahieren
        let expenseDate: Date | null = null;
        if (data.date) {
          expenseDate = data.date instanceof Date ? data.date : 
                        data.date?.toDate?.() ? data.date.toDate() : 
                        typeof data.date === 'string' ? new Date(data.date) : null;
        } else if (data.createdAt) {
          expenseDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : 
                        data.createdAt instanceof Date ? data.createdAt : null;
        } else if (data.expenseDate) {
          expenseDate = typeof data.expenseDate === 'string' ? new Date(data.expenseDate) : 
                        data.expenseDate?.toDate?.() ? data.expenseDate.toDate() : null;
        }
        
        // Prüfe ob im relevanten Zeitraum
        if (expenseDate && expenseDate >= yearStart && expenseDate <= quarterEnd) {
          // Normale Ausgaben haben kein Statusfeld (nur wiederkehrende haben 'active'/'paused'/'cancelled')
          // Wir zählen alle Ausgaben, außer stornierte/gelöschte
          const status = data.status;
          if (!status || status === 'active' || ['PAID', 'APPROVED', 'paid', 'approved'].includes(status)) {
            // Beträge sind in Euro gespeichert (nicht Cents!)
            totalExpenses += data.netAmount || data.amount || 0;
          }
        }
      });

      // Lade Abschreibungen (AfA) für das Jahr
      let yearlyDepreciation = 0;
      try {
        const assetSummary = await FixedAssetService.getAssetSummary(uid, year);
        yearlyDepreciation = assetSummary.yearlyDepreciation / 100; // Cent zu Euro
      } catch {
        // Falls keine Anlagen vorhanden oder Service fehlt
        yearlyDepreciation = 0;
      }
      // Anteilige AfA bis zum Quartal
      const afaBisQuartal = (yearlyDepreciation / 4) * quarter;

      // Hochrechnung auf das ganze Jahr (inkl. AfA)
      const gewinnBisQuartal = totalIncome - totalExpenses - afaBisQuartal;
      const extrapolierterJahresgewinn = quarter > 0 ? (gewinnBisQuartal / quarter) * 4 : 0;

      // === GEWINNSCHÄTZUNG BASIEREND AUF BENUTZEREINSTELLUNG ===
      // Unterstützt 3 Methoden: standard, extrapolation, manual
      let hochgerechneterJahresgewinn: number;
      switch (profitEstimation.method) {
        case 'standard':
          // Fester Standardbetrag (z.B. 10.000€ für neue Selbständige)
          hochgerechneterJahresgewinn = profitEstimation.standardAmount || 10000;
          break;
        case 'manual':
          // Manuell eingegebener Betrag
          hochgerechneterJahresgewinn = profitEstimation.manualAmount || 0;
          break;
        case 'extrapolation':
        default:
          // Hochrechnung basierend auf bisherigen Einnahmen/Ausgaben
          hochgerechneterJahresgewinn = extrapolierterJahresgewinn;
          break;
      }

      // === VERBESSERTE EINKOMMENSTEUER-BERECHNUNG ===
      // Berücksichtigt TaxProfile-Daten aus dem Wizard
      
      // 1. Zusätzliches Einkommen aus Angestelltenverhältnis
      const einkommenAngestellt = taxProfile.warAngestellt ? (taxProfile.einkommenAngestellt || 0) : 0;
      
      // 2. Gesamteinkommen
      const gesamtEinkommen = hochgerechneterJahresgewinn + einkommenAngestellt;
      
      // 3. Sonderausgaben (Vorsorgeaufwendungen)
      const krankenversicherung = taxProfile.hatKrankenversicherung ? (taxProfile.krankenversicherungBetrag || 0) : 0;
      const privateKV = taxProfile.hatPrivateKV ? (taxProfile.privateKVBetrag || 0) : 0;
      const pflegeversicherung = taxProfile.hatPflegeversicherung ? (taxProfile.pflegeversicherungBetrag || 0) : 0;
      const krankengeld = taxProfile.hatKrankengeld ? (taxProfile.krankengeldBetrag || 0) : 0;
      
      // Vorsorgeaufwendungen sind als Sonderausgaben abzugsfähig
      const vorsorgeaufwendungen = krankenversicherung + privateKV + pflegeversicherung + krankengeld;
      
      // 4. Zu versteuerndes Einkommen
      const grundfreibetrag2024 = 11604;
      const grundfreibetrag2025 = 12096;
      const grundfreibetrag2026 = 12500; // geschätzt
      const grundfreibetrag = year >= 2026 ? grundfreibetrag2026 : (year === 2025 ? grundfreibetrag2025 : grundfreibetrag2024);
      
      // Bei Verheirateten: Splittingtarif (doppelter Grundfreibetrag)
      const istVerheiratet = taxProfile.familienstand === 'verheiratet' || taxProfile.familienstand === 'lebenspartnerschaft';
      const effektiverGrundfreibetrag = istVerheiratet ? grundfreibetrag * 2 : grundfreibetrag;
      
      const zuVersteuerndesEinkommen = Math.max(0, gesamtEinkommen - vorsorgeaufwendungen - effektiverGrundfreibetrag);
      
      // 5. Einkommensteuer nach deutschem Tarif 2024/2025
      // Vereinfachte Berechnung der Zonen
      let einkommensteuer = 0;
      if (zuVersteuerndesEinkommen > 0) {
        if (istVerheiratet) {
          // Splittingtarif: Einkommen halbieren, Steuer berechnen, verdoppeln
          const halbEinkommen = zuVersteuerndesEinkommen / 2;
          einkommensteuer = berechneEinkommensteuer(halbEinkommen) * 2;
        } else {
          einkommensteuer = berechneEinkommensteuer(zuVersteuerndesEinkommen);
        }
      }
      
      // 6. Solidaritätszuschlag (nur bei höheren Einkommen)
      const soliFreigrenze = istVerheiratet ? 35086 : 17543;
      let solidaritaetszuschlag = 0;
      if (einkommensteuer > soliFreigrenze) {
        solidaritaetszuschlag = einkommensteuer * 0.055;
      }
      
      // 7. Kirchensteuer (wenn kirchensteuerpflichtig)
      let kirchensteuer = 0;
      if (taxProfile.kirchensteuerpflichtig && taxProfile.religionsgemeinschaft !== 'Nicht Kirchensteuerpflichtig') {
        // Bayern und Baden-Württemberg: 8%, Rest: 9%
        const kirchensteuersatz = ['Bayern', 'Baden-Württemberg'].includes(taxProfile.bundesland || '') ? 0.08 : 0.09;
        kirchensteuer = einkommensteuer * kirchensteuersatz;
      }
      
      // 8. Gesamte Steuerlast
      const gesamteSteuer = einkommensteuer + solidaritaetszuschlag + kirchensteuer;
      
      // Quartalsanteil
      const estimatedQuarterAmount = gesamteSteuer / 4;

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
      
      // Speichere Berechnungsdetails für Transparenz
      setCalculationDetails({
        estimationMethod: profitEstimation.method || 'extrapolation',
        totalIncome,
        totalExpenses,
        yearlyDepreciation,
        afaBisQuartal,
        gewinnBisQuartal,
        extrapolierterJahresgewinn,
        hochgerechneterJahresgewinn,
        einkommenAngestellt,
        gesamtEinkommen,
        krankenversicherung,
        privateKV,
        pflegeversicherung,
        vorsorgeaufwendungen,
        grundfreibetrag: effektiverGrundfreibetrag,
        zuVersteuerndesEinkommen,
        einkommensteuer,
        solidaritaetszuschlag,
        kirchensteuer,
        gesamteSteuer,
      });

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
        
        {/* Hinweis zur Berechnungsgrundlage */}
        <div className="mb-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            Die Schätzung basiert auf deinen <span className="font-medium text-gray-800">Rechnungen</span>, <span className="font-medium text-gray-800">Ausgaben</span> und <span className="font-medium text-gray-800">Abschreibungen (AfA)</span> bis zum aktuellen Quartal, hochgerechnet auf das gesamte Jahr.
          </p>
        </div>
        
        {/* Aufklappbare Berechnungsdetails */}
        {calculationDetails && (
          <div className="mb-4 border border-gray-200 rounded-xl bg-white overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Berechnungsdetails anzeigen</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
            </button>
            
            {showDetails && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 space-y-4">
                {/* Einnahmen & Ausgaben */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bis Q{prepayment.quarter} {prepayment.year}</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Einnahmen (Rechnungen)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">- Ausgaben</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">- Abschreibungen (AfA)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.afaBisQuartal)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                      <span className="font-medium text-gray-700">= Gewinn bis Q{prepayment.quarter}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(calculationDetails.gewinnBisQuartal)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Hochrechnung */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jahresgewinn-Schätzung</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      calculationDetails.estimationMethod === 'standard' ? 'bg-blue-100 text-blue-700' :
                      calculationDetails.estimationMethod === 'manual' ? 'bg-purple-100 text-purple-700' :
                      'bg-teal-100 text-teal-700'
                    }`}>
                      {calculationDetails.estimationMethod === 'standard' ? 'Standardprofil' :
                       calculationDetails.estimationMethod === 'manual' ? 'Manuelle Schätzung' :
                       'Extrapolation'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {calculationDetails.estimationMethod === 'extrapolation' ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Hochgerechneter Jahresgewinn</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.hochgerechneterJahresgewinn)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>(Extrapolation würde ergeben)</span>
                          <span>{formatCurrency(calculationDetails.extrapolierterJahresgewinn)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {calculationDetails.estimationMethod === 'standard' ? 'Standardprofil' : 'Manuelle Schätzung'}
                          </span>
                          <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.hochgerechneterJahresgewinn)}</span>
                        </div>
                      </>
                    )}
                    {calculationDetails.einkommenAngestellt > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">+ Einkommen aus Anstellung</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.einkommenAngestellt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                      <span className="font-medium text-gray-700">= Gesamteinkommen</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(calculationDetails.gesamtEinkommen)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Abzüge */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Abzüge</h4>
                  <div className="space-y-1.5">
                    {calculationDetails.krankenversicherung > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Krankenversicherung (gesetzl.)</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.krankenversicherung)}</span>
                      </div>
                    )}
                    {calculationDetails.privateKV > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Private Krankenversicherung</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.privateKV)}</span>
                      </div>
                    )}
                    {calculationDetails.pflegeversicherung > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pflegeversicherung</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.pflegeversicherung)}</span>
                      </div>
                    )}
                    {calculationDetails.vorsorgeaufwendungen > 0 && (
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-gray-600">= Vorsorgeaufwendungen gesamt</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.vorsorgeaufwendungen)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Grundfreibetrag</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.grundfreibetrag)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Steuerberechnung */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Steuerberechnung</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Zu versteuerndes Einkommen</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.zuVersteuerndesEinkommen)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Einkommensteuer</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.einkommensteuer)}</span>
                    </div>
                    {calculationDetails.solidaritaetszuschlag > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">+ Solidaritätszuschlag</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.solidaritaetszuschlag)}</span>
                      </div>
                    )}
                    {calculationDetails.kirchensteuer > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">+ Kirchensteuer</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.kirchensteuer)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Gesamte Jahressteuer</span>
                      <span className="font-bold text-[#14ad9f]">{formatCurrency(calculationDetails.gesamteSteuer)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-gray-600">Quartalsanteil (÷ 4)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculationDetails.gesamteSteuer / 4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Geschätzte Einkommensteuer */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-700">Geschätzte Einkommensteuer</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowEstimationWizard(true)}
                  className="text-[#14ad9f] hover:text-[#0d8a7f] text-sm font-medium"
                >
                  Profil anpassen
                </button>
                <span className="text-gray-300">|</span>
                <Link 
                  href={`/dashboard/company/${uid}/finance/settings`}
                  className="text-[#14ad9f] hover:text-[#0d8a7f] text-sm font-medium"
                >
                  Schätzmethode ändern
                </Link>
              </div>
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
