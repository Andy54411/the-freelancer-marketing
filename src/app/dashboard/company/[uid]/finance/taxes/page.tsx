'use client';

/**
 * Steuerzentrale - Accountable-Style Design
 * Übersicht aller Steuerverpflichtungen nach Quartal/Jahr
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { TaxService } from '@/services/taxService';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import Link from 'next/link';

interface CompanyTaxSettings {
  steuernummer?: string;
  ustIdNr?: string;
  finanzamt?: string;
  bundesland?: string;
  kleinunternehmer?: boolean;
  voranmeldungszeitraum?: 'monatlich' | 'vierteljaehrlich' | 'jaehrlich';
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
}

interface YearlyStats {
  gewinn: number;
  geschaetzteEst: number;
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

// Jahresabschluss-Verpflichtungen
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

export default function TaxesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupBanner, setShowSetupBanner] = useState(true);
  
  const [taxSettings, setTaxSettings] = useState<CompanyTaxSettings | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats>({ gewinn: 0, geschaetzteEst: 0 });
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [yearEndObligations, setYearEndObligations] = useState<TaxObligation[]>([]);

  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  const loadTaxData = useCallback(async () => {
    if (!uid) return;
    
    try {
      setLoading(true);

      // Lade Unternehmenseinstellungen
      const companyDoc = await getDoc(doc(db, 'companies', uid));
      let isKleinunternehmer = false;
      
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        isKleinunternehmer = data.kleinunternehmer === 'ja' || data.ust === 'kleinunternehmer';
        setTaxSettings({
          steuernummer: data.taxNumber || data.steuernummer,
          ustIdNr: data.vatId || data.ustIdNr,
          finanzamt: data.finanzamt || data.step3?.finanzamt,
          bundesland: data.bundesland || data.step3?.bundesland,
          kleinunternehmer: isKleinunternehmer,
          voranmeldungszeitraum: data.voranmeldungszeitraum || 'vierteljaehrlich',
        });
        
        // Prüfe ob Setup Banner angezeigt werden soll
        setShowSetupBanner(!data.taxNumber && !data.steuernummer && !data.vatId);
      }

      // Berechne Gewinn für das Jahr
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

      // Lade Einnahmen
      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('invoiceDate', '>=', Timestamp.fromDate(yearStart)),
        where('invoiceDate', '<=', Timestamp.fromDate(yearEnd))
      );
      const invoicesSnap = await getDocs(invoicesQuery);
      let totalIncome = 0;
      invoicesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (['paid', 'sent', 'overdue'].includes(data.status)) {
          totalIncome += (data.netAmount || data.subtotal || 0) / 100;
        }
      });

      // Lade Ausgaben
      const expensesRef = collection(db, 'companies', uid, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('expenseDate', '>=', Timestamp.fromDate(yearStart)),
        where('expenseDate', '<=', Timestamp.fromDate(yearEnd))
      );
      const expensesSnap = await getDocs(expensesQuery);
      let totalExpenses = 0;
      expensesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (['PAID', 'APPROVED', 'paid', 'approved'].includes(data.status)) {
          totalExpenses += (data.netAmount || data.amount || 0) / 100;
        }
      });

      const gewinn = totalIncome - totalExpenses;
      // Geschätzte ESt (vereinfacht: ~25% auf Gewinn über Grundfreibetrag)
      const grundfreibetrag = 11604; // 2024
      const zuVersteuern = Math.max(0, gewinn - grundfreibetrag);
      const geschaetzteEst = zuVersteuern * 0.25;

      setYearlyStats({ gewinn, geschaetzteEst });

      // Generiere Steuerverpflichtungen
      const quarterlyObligations = generateTaxObligations(selectedYear, isKleinunternehmer);
      
      // Lade bereits eingereichte UStVAs
      const reports = await TaxService.getTaxReportsByCompany(uid);
      const submittedUstvas = reports.filter(r => r.type === 'ustVA' && r.year === selectedYear);
      
      // Update Status basierend auf eingereichten Berichten
      quarterlyObligations.forEach(obl => {
        if (obl.type === 'ustVA') {
          const submitted = submittedUstvas.find(r => r.quarter === obl.quarter);
          if (submitted) {
            obl.status = submitted.status === 'submitted' ? 'submitted' : 'pending';
            if (submitted.taxData?.ustVA) {
              obl.amount = submitted.taxData.ustVA.zahllast || 0;
            }
          }
        }
        
        // Prüfe ob überfällig
        if (obl.status === 'pending' && obl.dueDate < new Date()) {
          obl.status = 'overdue';
        }
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

  // Gruppiere Verpflichtungen nach Quartal
  const groupedByQuarter = obligations.reduce((acc, obl) => {
    const key = obl.quarter || 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(obl);
    return acc;
  }, {} as Record<number, TaxObligation[]>);

  // Prüfe ob alle Steuern aktuell sind
  const allUpToDate = obligations.every(o => o.status !== 'overdue' && o.status !== 'pending');

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
                {yearlyStats.geschaetzteEst > 0 ? formatCurrency(yearlyStats.geschaetzteEst) : '-'}
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

      {/* Quartale */}
      {[1, 2, 3, 4].map((quarter) => {
        const quarterObligations = groupedByQuarter[quarter] || [];
        if (quarterObligations.length === 0) return null;

        return (
          <div key={quarter} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">
              {quarter}. Quartal {selectedYear}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quarterObligations.map((obl) => (
                <Card 
                  key={obl.id} 
                  className={`relative hover:shadow-lg transition-shadow ${
                    obl.status === 'overdue' ? 'border-red-200' : 'border-gray-200'
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="absolute top-4 right-4">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Fälligkeitsdatum */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                      obl.status === 'overdue' 
                        ? 'bg-red-100 text-red-700'
                        : obl.status === 'submitted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}>
                      <Clock className="w-4 h-4" />
                      {obl.status === 'submitted' ? 'Eingereicht' : `Fällig am ${formatDate(obl.dueDate)}`}
                    </div>

                    {/* Titel */}
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {obl.title}
                    </h3>

                    {/* Betrag */}
                    <p className="text-2xl font-bold text-gray-900 mb-4">
                      {formatCurrency(obl.amount)}
                    </p>

                    {/* Action Button */}
                    {obl.type === 'ustVA' ? (
                      <Link href={`/dashboard/company/${uid}/finance/taxes/wizard?year=${selectedYear}&quarter=${quarter}`}>
                        <Button variant="outline" className="w-full">
                          {obl.status === 'submitted' ? 'Details ansehen' : 'Überprüfen'}
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" className="w-full">
                        Überprüfen
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Jahresabschluss */}
      <div className="space-y-3 mt-8">
        <h2 className="text-lg font-bold text-gray-900">
          Jahresabschluss {selectedYear}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {yearEndObligations.map((obl) => (
            <Card key={obl.id} className="relative hover:shadow-lg transition-shadow">
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
            <Card className="relative hover:shadow-lg transition-shadow border-[#14ad9f]/30">
              <CardContent className="p-5">
                <div className="absolute top-4 right-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Status */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  yearlyStats.gewinn < 22000
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  {yearlyStats.gewinn < 22000 ? 'Im Rahmen' : 'Umsatzgrenze überschritten'}
                </div>

                {/* Titel */}
                <h3 className="font-semibold text-gray-900 mb-4">
                  Umsatzgrenze für Kleinunternehmer
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
                <Calculator className="w-6 h-6 text-[#14ad9f]" />
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
    </div>
  );
}
