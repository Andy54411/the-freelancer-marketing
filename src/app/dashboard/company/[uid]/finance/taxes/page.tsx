'use client';

/**
 * Steuerzentrale - UStVA-Übersicht mit Echtzeit-Schätzung
 * 
 * Features:
 * - Echtzeit-Vorsteuer-Schätzung basierend auf Rechnungen & Ausgaben
 * - Fehlende Daten werden klar angezeigt
 * - Vollständigkeits-Prüfung vor Absenden
 * - Steuerberater einladen Option
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  X,
  MoreVertical,
  ChevronRight,
  Settings,
  BarChart3,
  Plus,
  Calculator,
  FileText,
  Send,
  Users,
  Shield,
  Upload,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Euro,
  Receipt,
  ArrowRight,
  Sparkles,
  UserPlus,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { TaxService } from '@/services/taxService';
import { TaxRuleType } from '@/types/taxRules';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import Link from 'next/link';

interface CompanyTaxSettings {
  steuernummer?: string;
  ustIdNr?: string;
  finanzamt?: string;
  bundesland?: string;
  kleinunternehmer?: boolean;
  voranmeldungszeitraum?: 'monatlich' | 'vierteljaehrlich' | 'jaehrlich';
  elsterCertificateExists?: boolean;
  name?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  email?: string;
}

interface QuarterData {
  quarter: number;
  year: number;
  // Umsätze nach Steuersatz (Bemessungsgrundlagen)
  kz81: number; // 19%
  kz86: number; // 7%
  // Steuerfreie Umsätze
  kz41: number; // Innergemeinschaftliche Lieferungen
  kz43: number; // Ausfuhren
  kz45: number; // Nicht steuerbar
  kz48: number; // Steuerfrei ohne VoSt
  kz60: number; // §13b steuerpflichtig
  kz21: number; // §18b sonstige Leistungen
  // Vorsteuer
  kz66: number; // Vorsteuer aus Rechnungen
  // Berechnete Werte
  umsatzsteuer19: number;
  umsatzsteuer7: number;
  umsatzsteuerGesamt: number;
  zahllast: number;
  erstattung: number;
  // Statistiken
  invoiceCount: number;
  expenseCount: number;
  // Status
  isComplete: boolean;
  missingData: string[];
}

interface TaxObligation {
  id: string;
  type: 'ustVA' | 'estVorauszahlung' | 'eur' | 'est' | 'zahlung';
  title: string;
  quarter?: number;
  year: number;
  dueDate: Date;
  amount: number;
  status: 'pending' | 'submitted' | 'paid' | 'overdue';
  quarterData?: QuarterData;
}

interface YearlyStats {
  gewinn: number;
  geschaetzteEst: number;
  totalUmsatz: number;
  totalVorsteuer: number;
  totalZahllast: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// Generiere Steuerverpflichtungen für ein Jahr
const generateTaxObligations = (year: number, isKleinunternehmer: boolean): TaxObligation[] => {
  const obligations: TaxObligation[] = [];
  
  // Einkommensteuer-Vorauszahlungen (Q1-Q4)
  const estQuarters = [
    { quarter: 1, dueMonth: 2, dueDay: 10 }, // 10. März
    { quarter: 2, dueMonth: 5, dueDay: 10 }, // 10. Juni
    { quarter: 3, dueMonth: 8, dueDay: 10 }, // 10. September
    { quarter: 4, dueMonth: 11, dueDay: 10 }, // 10. Dezember
  ];
  
  estQuarters.forEach(({ quarter, dueMonth, dueDay }) => {
    obligations.push({
      id: `est-${year}-q${quarter}`,
      type: 'estVorauszahlung',
      title: 'Einkommensteuer-Vorauszahlung',
      quarter,
      year,
      dueDate: new Date(year, dueMonth, dueDay),
      amount: 0,
      status: 'pending',
    });
  });

  // UStVA nur wenn nicht Kleinunternehmer
  if (!isKleinunternehmer) {
    const ustvaQuarters = [
      { quarter: 1, dueMonth: 3, dueDay: 10 }, // 10. April
      { quarter: 2, dueMonth: 6, dueDay: 10 }, // 10. Juli
      { quarter: 3, dueMonth: 9, dueDay: 10 }, // 10. Oktober
      { quarter: 4, dueMonth: 0, dueDay: 10, nextYear: true }, // 10. Januar nächstes Jahr
    ];

    ustvaQuarters.forEach(({ quarter, dueMonth, dueDay, nextYear }) => {
      obligations.push({
        id: `ustva-${year}-q${quarter}`,
        type: 'ustVA',
        title: 'Umsatzsteuer-Voranmeldung',
        quarter,
        year,
        dueDate: new Date(nextYear ? year + 1 : year, dueMonth, dueDay),
        amount: 0,
        status: 'pending',
      });
    });
  }

  return obligations;
};

// Generiere Jahresabschluss-Verpflichtungen
const generateYearEndObligations = (year: number): TaxObligation[] => {
  const obligations: TaxObligation[] = [];

  // EÜR - Fällig 31.07. des Folgejahres
  obligations.push({
    id: `eur-${year}`,
    type: 'eur',
    title: 'EÜR',
    year,
    dueDate: new Date(year + 1, 6, 31),
    amount: 0,
    status: 'pending',
  });

  // Einkommensteuererklärung - Fällig 31.07. des Folgejahres
  obligations.push({
    id: `est-${year}`,
    type: 'est',
    title: 'Einkommensteuererklärung',
    year,
    dueDate: new Date(year + 1, 6, 31),
    amount: 0,
    status: 'pending',
  });

  // Zahlung Einkommensteuer
  obligations.push({
    id: `est-zahlung-${year}`,
    type: 'zahlung',
    title: 'Zahlung Einkommensteuer',
    year,
    dueDate: new Date(year + 1, 7, 31), // Nach Steuerbescheid
    amount: 0,
    status: 'pending',
  });

  return obligations;
};

// Berechne Quartalsdaten aus Rechnungen und Ausgaben
const calculateQuarterData = (
  invoices: any[],
  expenses: any[],
  quarter: number,
  year: number,
  taxSettings: CompanyTaxSettings | null
): QuarterData => {
  const startMonth = (quarter - 1) * 3;
  const quarterStart = new Date(year, startMonth, 1);
  const quarterEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);

  // Filtere Rechnungen für dieses Quartal (nutze _parsedDate falls vorhanden)
  const quarterInvoices = invoices.filter(inv => {
    let date: Date;
    if (inv._parsedDate) {
      date = inv._parsedDate;
    } else if (inv.invoiceDate?.toDate) {
      date = inv.invoiceDate.toDate();
    } else if (inv.issueDate) {
      date = new Date(inv.issueDate);
    } else if (inv.date) {
      date = new Date(inv.date);
    } else {
      return false;
    }
    return date >= quarterStart && date <= quarterEnd;
  });

  // Filtere Ausgaben für dieses Quartal
  const quarterExpenses = expenses.filter(exp => {
    let date: Date;
    if (exp._parsedDate) {
      date = exp._parsedDate;
    } else if (exp.expenseDate?.toDate) {
      date = exp.expenseDate.toDate();
    } else if (exp.date?.toDate) {
      date = exp.date.toDate();
    } else if (exp.expenseDate) {
      date = new Date(exp.expenseDate);
    } else if (exp.date) {
      date = new Date(exp.date);
    } else {
      return false;
    }
    return date >= quarterStart && date <= quarterEnd;
  });

  // Initialisiere Kennzahlen
  let kz81 = 0, kz86 = 0, kz41 = 0, kz43 = 0, kz45 = 0, kz48 = 0, kz60 = 0, kz21 = 0;
  let umsatzsteuer19 = 0, umsatzsteuer7 = 0;

  // Verarbeite Rechnungen nach TaxRuleType
  quarterInvoices.forEach(inv => {
    // Status prüfen - Entwürfe und stornierte Rechnungen ausschließen
    const status = (inv.status || 'finalized').toLowerCase();
    const excludedStatuses = ['draft', 'cancelled', 'storno', 'deleted'];
    if (excludedStatuses.includes(status)) return;
    
    // Nettobetrag: amount ist Netto, total ist Brutto
    // Dieselbe Logik wie BWA-Report
    const netAmount = inv.amount || inv.netAmount || (inv.total ? inv.total / 1.19 : 0);
    const taxAmount = inv.tax || inv.taxAmount || 0;
    const taxRule = inv.taxRuleType || inv.taxRule || 'DE_TAXABLE';
    const vatRate = inv.vatRate || inv.taxRate || 19;

    switch (taxRule) {
      case TaxRuleType.DE_TAXABLE:
      case 'DE_TAXABLE':
        kz81 += netAmount;
        umsatzsteuer19 += taxAmount || netAmount * 0.19;
        break;
      case TaxRuleType.DE_TAXABLE_REDUCED:
      case 'DE_TAXABLE_REDUCED':
        kz86 += netAmount;
        umsatzsteuer7 += taxAmount || netAmount * 0.07;
        break;
      case TaxRuleType.EU_INTRACOMMUNITY_SUPPLY:
      case 'EU_INTRACOMMUNITY_SUPPLY':
        kz41 += netAmount;
        break;
      case TaxRuleType.NON_EU_EXPORT:
      case 'NON_EU_EXPORT':
        kz43 += netAmount;
        break;
      case TaxRuleType.NON_EU_OUT_OF_SCOPE:
      case 'NON_EU_OUT_OF_SCOPE':
        kz45 += netAmount;
        break;
      case TaxRuleType.DE_EXEMPT_4_USTG:
      case 'DE_EXEMPT_4_USTG':
        kz48 += netAmount;
        break;
      case TaxRuleType.DE_REVERSE_13B:
      case 'DE_REVERSE_13B':
        kz60 += netAmount;
        break;
      case TaxRuleType.EU_REVERSE_18B:
      case 'EU_REVERSE_18B':
        kz21 += netAmount;
        break;
      default:
        // Fallback basierend auf Steuersatz
        if (vatRate === 19 || vatRate === 0.19) {
          kz81 += netAmount;
          umsatzsteuer19 += taxAmount || netAmount * 0.19;
        } else if (vatRate === 7 || vatRate === 0.07) {
          kz86 += netAmount;
          umsatzsteuer7 += taxAmount || netAmount * 0.07;
        }
    }
  });

  // Verarbeite Ausgaben → Vorsteuer (Kz66)
  let kz66 = 0;
  quarterExpenses.forEach(exp => {
    // Erweiterte Status-Prüfung (inkl. Ausgaben ohne Status)
    const status = (exp.status || 'paid').toLowerCase();
    if (!['paid', 'approved', 'open', 'pending'].includes(status)) return;
    // WICHTIG: Beträge sind in Euro gespeichert, NICHT in Cent!
    const vatAmount = exp.vatAmount || exp.taxAmount || 0;
    kz66 += vatAmount;
  });

  const umsatzsteuerGesamt = umsatzsteuer19 + umsatzsteuer7;
  const saldo = umsatzsteuerGesamt - kz66;

  // Prüfe auf fehlende Daten
  const missingData: string[] = [];
  if (!taxSettings?.steuernummer) missingData.push('Steuernummer');
  if (!taxSettings?.finanzamt) missingData.push('Finanzamt');
  if (!taxSettings?.elsterCertificateExists) missingData.push('ELSTER-Zertifikat');
  if (quarterInvoices.length === 0) missingData.push('Keine Rechnungen im Quartal');

  return {
    quarter,
    year,
    kz81: Math.round(kz81),
    kz86: Math.round(kz86),
    kz41: Math.round(kz41),
    kz43: Math.round(kz43),
    kz45: Math.round(kz45),
    kz48: Math.round(kz48),
    kz60: Math.round(kz60),
    kz21: Math.round(kz21),
    kz66: Math.round(kz66 * 100) / 100,
    umsatzsteuer19: Math.round(umsatzsteuer19 * 100) / 100,
    umsatzsteuer7: Math.round(umsatzsteuer7 * 100) / 100,
    umsatzsteuerGesamt: Math.round(umsatzsteuerGesamt * 100) / 100,
    zahllast: saldo > 0 ? Math.round(saldo * 100) / 100 : 0,
    erstattung: saldo < 0 ? Math.round(Math.abs(saldo) * 100) / 100 : 0,
    invoiceCount: quarterInvoices.length,
    expenseCount: quarterExpenses.length,
    isComplete: missingData.length === 0 || (missingData.length === 1 && missingData[0] === 'Keine Rechnungen im Quartal'),
    missingData,
  };
};

export default function TaxesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupBanner, setShowSetupBanner] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
  const [taxSettings, setTaxSettings] = useState<CompanyTaxSettings | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats>({ 
    gewinn: 0, 
    geschaetzteEst: 0,
    totalUmsatz: 0,
    totalVorsteuer: 0,
    totalZahllast: 0,
  });
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [yearEndObligations, setYearEndObligations] = useState<TaxObligation[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);

  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  const loadTaxData = useCallback(async () => {
    if (!uid) return;
    
    try {
      setLoading(true);

      // Lade Unternehmenseinstellungen
      const companyDoc = await getDoc(doc(db, 'companies', uid));
      let isKleinunternehmer = false;
      let settings: CompanyTaxSettings = {};
      
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        isKleinunternehmer = data.kleinunternehmer === 'ja' || data.ust === 'kleinunternehmer';
        settings = {
          steuernummer: data.taxNumber || data.steuernummer,
          ustIdNr: data.vatId || data.ustIdNr,
          finanzamt: data.finanzamt || data.step3?.finanzamt,
          bundesland: data.bundesland || data.step3?.bundesland,
          kleinunternehmer: isKleinunternehmer,
          voranmeldungszeitraum: data.voranmeldungszeitraum || 'vierteljaehrlich',
          name: data.companyName || data.name,
          strasse: data.street || data.step1?.street,
          plz: data.zipCode || data.step1?.zipCode,
          ort: data.city || data.step1?.city,
          telefon: data.phone || data.step1?.phone,
          email: data.email || data.step1?.email,
        };
        setTaxSettings(settings);
        
        // Prüfe ob Setup Banner angezeigt werden soll
        setShowSetupBanner(!data.taxNumber && !data.steuernummer);
      }

      // Prüfe ELSTER-Zertifikat
      try {
        const certResponse = await fetch(`/api/company/${uid}/elster/certificate-status`);
        const certData = await certResponse.json();
        if (certData.success) {
          settings.elsterCertificateExists = certData.certificateExists;
          setTaxSettings({ ...settings });
        }
      } catch {
        // Ignorieren
      }

      // Lade ALLE Rechnungen für das Jahr (für Quartals-Berechnung)
      // HINWEIS: Rechnungen haben issueDate/date als String, nicht als Timestamp
      // Daher laden wir alle und filtern clientseitig
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesSnap = await getDocs(invoicesRef);
      const invoices: any[] = [];
      let totalIncome = 0;
      invoicesSnap.forEach(docSnap => {
        const data: any = { id: docSnap.id, ...docSnap.data() };
        
        // Datum ermitteln (verschiedene Formate unterstützen)
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
        
        // Nur Rechnungen im ausgewählten Jahr
        if (invoiceDate && invoiceDate >= yearStart && invoiceDate <= yearEnd) {
          // Normalisiertes Datum speichern für spätere Quartals-Berechnung
          data._parsedDate = invoiceDate;
          invoices.push(data);
          // Status prüfen - Entwürfe und stornierte Rechnungen ausschließen
          const status = (data.status || 'finalized').toLowerCase();
          const excludedStatuses = ['draft', 'cancelled', 'storno', 'deleted'];
          if (!excludedStatuses.includes(status)) {
            // Nettobetrag: amount ist Netto, total ist Brutto
            // Dieselbe Logik wie BWA-Report
            const netAmount = data.amount || data.netAmount || (data.total ? data.total / 1.19 : 0);
            totalIncome += netAmount;
          }
        }
      });
      setAllInvoices(invoices);

      // Lade ALLE Ausgaben für das Jahr
      const expensesRef = collection(db, 'companies', uid, 'expenses');
      const expensesSnap = await getDocs(expensesRef);
      const expenses: any[] = [];
      let totalExpenses = 0;
      let totalVorsteuer = 0;
      expensesSnap.forEach(docSnap => {
        const data: any = { id: docSnap.id, ...docSnap.data() };
        
        // Datum ermitteln (verschiedene Formate unterstützen)
        let expenseDate: Date | null = null;
        if (data.expenseDate?.toDate) {
          expenseDate = data.expenseDate.toDate();
        } else if (data.date?.toDate) {
          expenseDate = data.date.toDate();
        } else if (data.expenseDate) {
          expenseDate = new Date(data.expenseDate);
        } else if (data.date) {
          expenseDate = new Date(data.date);
        } else if (data.createdAt?.toDate) {
          expenseDate = data.createdAt.toDate();
        }
        
        // Nur Ausgaben im ausgewählten Jahr
        if (expenseDate && expenseDate >= yearStart && expenseDate <= yearEnd) {
          data._parsedDate = expenseDate;
          expenses.push(data);
          const status = (data.status || 'paid').toLowerCase();
          if (['paid', 'approved', 'open', 'pending'].includes(status)) {
            // Für EÜR-Gewinn: Nettobetrag verwenden (Vorsteuer ist kein Aufwand)
            // amount = Brutto, netAmount = Netto, vatAmount = MwSt
            // Wenn netAmount fehlt, berechne aus amount - vatAmount
            let expenseNet = data.netAmount;
            if (!expenseNet && data.amount) {
              const vat = data.vatAmount || 0;
              expenseNet = data.amount - vat;
            }
            totalExpenses += expenseNet || 0;
            totalVorsteuer += data.vatAmount || data.taxAmount || 0;
          }
        }
      });
      setAllExpenses(expenses);

      const gewinn = totalIncome - totalExpenses;
      const grundfreibetrag = 11604;
      const zuVersteuern = Math.max(0, gewinn - grundfreibetrag);
      const geschaetzteEst = zuVersteuern * 0.25;

      // Generiere Steuerverpflichtungen mit Echtzeit-Quartalsdaten
      const quarterlyObligations = generateTaxObligations(selectedYear, isKleinunternehmer);
      
      // Berechne Quartalsdaten für jede UStVA
      let totalZahllast = 0;
      quarterlyObligations.forEach(obl => {
        if (obl.type === 'ustVA' && obl.quarter) {
          const qData = calculateQuarterData(invoices, expenses, obl.quarter, selectedYear, settings);
          obl.quarterData = qData;
          obl.amount = qData.zahllast || -qData.erstattung;
          totalZahllast += qData.zahllast - qData.erstattung;
        }
      });

      // Lade bereits eingereichte UStVAs
      const reports = await TaxService.getTaxReportsByCompany(uid);
      const submittedUstvas = reports.filter(r => r.type === 'ustVA' && r.year === selectedYear);
      
      // Update Status basierend auf eingereichten Berichten
      quarterlyObligations.forEach(obl => {
        if (obl.type === 'ustVA') {
          const submitted = submittedUstvas.find(r => r.quarter === obl.quarter);
          if (submitted) {
            obl.status = submitted.status === 'submitted' ? 'submitted' : 'pending';
          }
        }
        
        // Prüfe ob überfällig
        if (obl.status === 'pending' && obl.dueDate < new Date()) {
          obl.status = 'overdue';
        }
      });

      setYearlyStats({ 
        gewinn, 
        geschaetzteEst,
        totalUmsatz: totalIncome,
        totalVorsteuer,
        totalZahllast,
      });
      setObligations(quarterlyObligations);
      setYearEndObligations(generateYearEndObligations(selectedYear));

    } catch (error) {
      console.error('Fehler beim Laden:', error);
      toast.error('Fehler beim Laden der Steuerdaten');
    } finally {
      setLoading(false);
    }
  }, [uid, selectedYear]);

  useEffect(() => {
    loadTaxData();
  }, [loadTaxData]);

  // Gruppiere UStVA-Verpflichtungen
  const ustvaObligations = obligations.filter(o => o.type === 'ustVA');
  const estObligations = obligations.filter(o => o.type === 'estVorauszahlung');

  // Gruppiere nach Quartal
  const groupedByQuarter: Record<number, TaxObligation[]> = {};
  obligations.forEach(obl => {
    if (obl.quarter) {
      if (!groupedByQuarter[obl.quarter]) {
        groupedByQuarter[obl.quarter] = [];
      }
      groupedByQuarter[obl.quarter].push(obl);
    }
  });

  // Prüfe ob alle Verpflichtungen aktuell sind
  const allUpToDate = obligations.every(o => 
    o.status === 'submitted' || o.status === 'paid' || o.dueDate > new Date()
  );

  // Prüfe globale Vollständigkeit
  const globalMissingData: string[] = [];
  if (!taxSettings?.steuernummer) globalMissingData.push('Steuernummer');
  if (!taxSettings?.finanzamt) globalMissingData.push('Finanzamt');
  if (!taxSettings?.elsterCertificateExists) globalMissingData.push('ELSTER-Zertifikat');
  
  const isReadyForSubmission = globalMissingData.length === 0;

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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-2xl mb-6"></div>
          <div className="h-12 bg-gray-200 rounded-lg mb-6 w-1/3"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Card */}
      <div className="bg-linear-to-r from-[#14ad9f]/10 via-teal-50 to-white rounded-2xl p-6 border border-[#14ad9f]/20">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="text-4xl">✌️</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Steuern</h1>
              {/* Steuerinfo */}
              {(taxSettings?.steuernummer || taxSettings?.finanzamt || taxSettings?.bundesland) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                  {taxSettings?.bundesland && (
                    <span>
                      <span className="text-gray-400">Bundesland:</span> {taxSettings.bundesland}
                    </span>
                  )}
                  {taxSettings?.finanzamt && (
                    <span>
                      <span className="text-gray-400">Finanzamt:</span> {taxSettings.finanzamt}
                    </span>
                  )}
                  {taxSettings?.steuernummer && (
                    <span>
                      <span className="text-gray-400">St.-Nr.:</span> {taxSettings.steuernummer}
                    </span>
                  )}
                  {taxSettings?.ustIdNr && (
                    <span>
                      <span className="text-gray-400">USt-ID:</span> {taxSettings.ustIdNr}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                Gewinn in {selectedYear}
                <button className="text-gray-400 hover:text-gray-600">
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(yearlyStats.gewinn)}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                Geschätzte Einkommensteuer für das ganze Jahr
                <button className="text-gray-400 hover:text-gray-600">
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(yearlyStats.geschaetzteEst)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/dashboard/company/${uid}/finance/reports`}>
              <Button variant="outline" size="icon" className="rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </Button>
            </Link>
            <Link href={`/dashboard/company/${uid}/settings?view=tax`}>
              <Button variant="outline" size="icon" className="rounded-lg">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Jahr-Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedYear === year
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {year}
          </button>
        ))}
        <button className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <Plus className="w-4 h-4" />
          Jahr hinzufügen
        </button>
        
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
          Zeige gesamtes Jahr {selectedYear}
          <input type="checkbox" className="rounded" />
        </div>
      </div>

      {/* Suche und Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Suche in Steuerverpflichtungen"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Setup Banner */}
      {showSetupBanner && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    Du bist fast fertig! Schließe die Einrichtung deiner Steuern ab!
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Vervollständige dein Steuer-Setup, damit wir deine Fristen festlegen und dir helfen können, alles im Blick zu behalten.
                  </p>
                  <Link 
                    href={`/dashboard/company/${uid}/settings?view=tax`}
                    className="text-sm font-medium text-blue-700 hover:text-blue-900 underline mt-2 inline-block"
                  >
                    Schließe die Einrichtung deiner Steuern ab!
                  </Link>
                </div>
              </div>
              <button 
                onClick={() => setShowSetupBanner(false)}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Banner */}
      {allUpToDate && !showSetupBanner && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">
            Sehr gut, deine Steuern sind auf dem neuesten Stand
          </span>
        </div>
      )}

      {/* Globale Warnungen für fehlende Daten */}
      {globalMissingData.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">
                  Fehlende Daten für ELSTER-Übermittlung
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Folgende Angaben fehlen noch:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {globalMissingData.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-sm rounded-md">
                      <X className="w-3 h-3" />
                      {item}
                    </span>
                  ))}
                </div>
                <Link 
                  href={`/dashboard/company/${uid}/settings?view=tax`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900 mt-3"
                >
                  Jetzt vervollständigen
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* UStVA Quartals-Übersicht mit Echtzeit-Schätzung */}
      {!taxSettings?.kleinunternehmer && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#14ad9f]" />
              Umsatzsteuer-Voranmeldungen {selectedYear}
            </h2>
            <div className="flex items-center gap-2">
              {isReadyForSubmission ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  Bereit für ELSTER
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  Daten unvollständig
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {ustvaObligations.map((obl) => {
              const qData = obl.quarterData;
              const isPastQuarter = obl.quarter && obl.quarter < currentQuarter && obl.year === currentYear;
              const isCurrentQuarter = obl.quarter === currentQuarter && obl.year === currentYear;
              
              return (
                <Card 
                  key={obl.id} 
                  className={`relative hover:shadow-lg transition-all duration-300 shrink-0 w-[380px] snap-start ${
                    obl.status === 'overdue' 
                      ? 'border-red-300 bg-red-50/50' 
                      : obl.status === 'submitted'
                      ? 'border-green-300 bg-green-50/50'
                      : isCurrentQuarter
                      ? 'border-[#14ad9f] ring-2 ring-[#14ad9f]/20'
                      : 'border-gray-200'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          Q{obl.quarter} - {obl.title}
                          {isCurrentQuarter && (
                            <span className="text-xs bg-[#14ad9f] text-white px-2 py-0.5 rounded-full">
                              Aktuell
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          Fällig: {formatDate(obl.dueDate)}
                        </CardDescription>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        obl.status === 'submitted' 
                          ? 'bg-green-100 text-green-700'
                          : obl.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {obl.status === 'submitted' ? 'Eingereicht' : obl.status === 'overdue' ? 'Überfällig' : 'Offen'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {qData && (
                      <>
                        {/* Haupt-Ergebnis */}
                        <div className={`p-4 rounded-xl ${
                          qData.zahllast > 0 
                            ? 'bg-amber-50 border border-amber-200' 
                            : qData.erstattung > 0 
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">
                                {qData.zahllast > 0 ? 'Geschätzte Zahllast' : qData.erstattung > 0 ? 'Geschätzte Erstattung' : 'Saldo'}
                              </p>
                              <p className={`text-2xl font-bold ${
                                qData.zahllast > 0 
                                  ? 'text-amber-700' 
                                  : qData.erstattung > 0 
                                  ? 'text-green-700'
                                  : 'text-gray-700'
                              }`}>
                                {qData.zahllast > 0 
                                  ? formatCurrency(qData.zahllast) 
                                  : qData.erstattung > 0 
                                  ? formatCurrency(qData.erstattung)
                                  : formatCurrency(0)
                                }
                              </p>
                            </div>
                            {qData.zahllast > 0 ? (
                              <TrendingUp className="w-8 h-8 text-amber-400" />
                            ) : qData.erstattung > 0 ? (
                              <TrendingDown className="w-8 h-8 text-green-400" />
                            ) : (
                              <Euro className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Detail-Zeilen */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Umsätze 19%</span>
                            <span className="font-medium">{formatCurrency(qData.kz81)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">USt 19%</span>
                            <span className="font-medium">{formatCurrency(qData.umsatzsteuer19)}</span>
                          </div>
                          {qData.kz86 > 0 && (
                            <>
                              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Umsätze 7%</span>
                                <span className="font-medium">{formatCurrency(qData.kz86)}</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">USt 7%</span>
                                <span className="font-medium">{formatCurrency(qData.umsatzsteuer7)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg col-span-2">
                            <span className="text-blue-700">Vorsteuer (abziehbar)</span>
                            <span className="font-medium text-blue-700">- {formatCurrency(qData.kz66)}</span>
                          </div>
                        </div>

                        {/* Statistiken */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            {qData.invoiceCount} Rechnungen
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Receipt className="w-4 h-4" />
                            {qData.expenseCount} Ausgaben
                          </div>
                          {qData.missingData.length > 0 && !qData.missingData.includes('Keine Rechnungen im Quartal') && (
                            <div className="flex items-center gap-1.5 text-amber-600">
                              <AlertTriangle className="w-4 h-4" />
                              {qData.missingData.length} fehlend
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/dashboard/company/${uid}/finance/taxes/wizard?year=${selectedYear}&quarter=${obl.quarter}`} className="flex-1">
                        <Button 
                          variant={obl.status === 'submitted' ? 'outline' : 'default'}
                          className={`w-full ${obl.status !== 'submitted' ? 'bg-[#14ad9f] hover:bg-teal-700' : ''}`}
                        >
                          {obl.status === 'submitted' ? 'Details ansehen' : 'Prüfen & Absenden'}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Einkommensteuer-Vorauszahlungen */}
      {estObligations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Euro className="w-5 h-5 text-[#14ad9f]" />
            Einkommensteuer-Vorauszahlungen {selectedYear}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {estObligations.map((obl) => (
              <Card 
                key={obl.id} 
                className={`relative hover:shadow-lg transition-shadow shrink-0 w-60 snap-start ${
                  obl.status === 'overdue' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <CardContent className="p-5">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                    obl.status === 'overdue' 
                      ? 'bg-red-100 text-red-700'
                      : obl.status === 'submitted' || obl.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-teal-100 text-teal-700'
                  }`}>
                    <Clock className="w-4 h-4" />
                    Q{obl.quarter}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                    {obl.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Fällig: {formatDate(obl.dueDate)}
                  </p>
                  <Link href={`/dashboard/company/${uid}/finance/taxes/prepayment/est-${selectedYear}-q${obl.quarter}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Jahresabschluss */}
      <div className="space-y-3 mt-8">
        <h2 className="text-lg font-bold text-gray-900">
          Jahresabschluss {selectedYear}
        </h2>
        
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {yearEndObligations.map((obl) => (
            <Card key={obl.id} className="relative hover:shadow-lg transition-shadow shrink-0 w-[280px] snap-start">
              <CardContent className="p-5">
                <div className="absolute top-4 right-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Fälligkeitsdatum */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  obl.type === 'zahlung'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-teal-100 text-teal-700'
                }`}>
                  <Clock className="w-4 h-4" />
                  {obl.type === 'zahlung' 
                    ? 'Fällig am (siehe Steuerbescheid)'
                    : `Fällig am ${formatDate(obl.dueDate)}`
                  }
                </div>

                {/* Titel */}
                <h3 className="font-semibold text-gray-900 mb-4">
                  {obl.title}
                </h3>

                {/* Action Button */}
                {obl.type === 'eur' ? (
                  <Link href={`/dashboard/company/${uid}/finance/taxes/eur?year=${selectedYear}`}>
                    <Button variant="outline" className="w-full">
                      Überprüfen und Abschicken
                    </Button>
                  </Link>
                ) : obl.type === 'est' ? (
                  <Link href={`/dashboard/company/${uid}/finance/taxes/est?year=${selectedYear}`}>
                    <Button variant="outline" className="w-full">
                      Überprüfen und Abschicken
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full">
                    {obl.type === 'zahlung' ? 'Überprüfen' : 'Überprüfen und Abschicken'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Kleinunternehmer Grenze Karte */}
          {taxSettings?.kleinunternehmer && (
            <Card className="relative hover:shadow-lg transition-shadow border-[#14ad9f]/30 shrink-0 w-[280px] snap-start">
              <CardContent className="p-5">
                <div className="absolute top-4 right-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Status */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  yearlyStats.gewinn < 25000
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  {yearlyStats.gewinn < 25000 ? 'Im Rahmen' : 'Umsatzgrenze überschritten'}
                </div>

                {/* Titel */}
                <h3 className="font-semibold text-gray-900 mb-4">
                  Umsatzgrenze für Kleinunternehmer (§19 UStG 2025)
                </h3>

                {/* Action Button */}
                <Link href={`/dashboard/company/${uid}/finance/reports`}>
                  <Button variant="outline" className="w-full text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f]/10">
                    Übersicht
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* KI Steuerberater Link */}
      <Card className="border-[#14ad9f]/20 bg-linear-to-r from-[#14ad9f]/5 to-transparent mt-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#14ad9f]/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#14ad9f]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">KI Steuerberater & Hilfe</h3>
                <p className="text-sm text-gray-600">Fragen zu deinen Steuern? Unser KI-Assistent hilft dir weiter.</p>
              </div>
            </div>
            <Button className="bg-[#14ad9f] hover:bg-teal-700">
              Starte Chat
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Steuerberater einladen */}
      <Card className="border-purple-200 bg-linear-to-r from-purple-50 to-transparent mt-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Steuerberater einladen</h3>
                <p className="text-sm text-gray-600">
                  Lade deinen Steuerberater ein, um die UStVA-Daten gemeinsam zu prüfen und abzusenden.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => setShowInviteModal(true)}
            >
              <Mail className="w-4 h-4 mr-2" />
              Einladen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Steuerberater Einladungs-Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                Steuerberater einladen
              </CardTitle>
              <CardDescription>
                Ihr Steuerberater erhält einen Link, um Ihre UStVA-Daten einzusehen und bei Bedarf abzusenden.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse des Steuerberaters
                </label>
                <Input
                  type="email"
                  placeholder="steuerberater@kanzlei.de"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Der Steuerberater kann:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Ihre Rechnungen und Ausgaben einsehen</li>
                  <li>Die UStVA-Berechnung prüfen</li>
                  <li>Die UStVA an ELSTER übermitteln</li>
                </ul>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                >
                  Abbrechen
                </Button>
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    if (inviteEmail) {
                      toast.success(`Einladung an ${inviteEmail} gesendet`);
                      setShowInviteModal(false);
                      setInviteEmail('');
                    } else {
                      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
                    }
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Einladung senden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
