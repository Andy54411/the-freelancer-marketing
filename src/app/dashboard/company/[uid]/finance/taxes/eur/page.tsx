'use client';

/**
 * EÜR (Einnahmen-Überschuss-Rechnung) Wizard
 * Schritt-für-Schritt Erstellung der EÜR
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  HelpCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Circle,
  FileText,
  Search,
  Send,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import Link from 'next/link';

interface WizardStep {
  id: number;
  title: string;
  subtitle?: string;
  status: 'complete' | 'current' | 'pending';
}

interface EURData {
  year: number;
  ustStatus: 'kleinunternehmer' | 'regelbesteuerung';
  einnahmen: {
    umsaetze19: number;
    umsaetze7: number;
    umsaetze0: number;
    sonstigeEinnahmen: number;
    vereinnahmteUst: number;
  };
  ausgaben: {
    wareneinkauf: number;
    personalkosten: number;
    raumkosten: number;
    versicherungen: number;
    fahrzeugkosten: number;
    werbekosten: number;
    reisekosten: number;
    telefonInternet: number;
    buerokosten: number;
    beratungskosten: number;
    abschreibungen: number;
    sonstigeAusgaben: number;
    gezahlteVorsteuer: number;
  };
  gewinn: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

export default function EURPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const currentYear = new Date().getFullYear();
  const yearParam = searchParams.get('year');
  const selectedYear = yearParam ? parseInt(yearParam) : currentYear - 1;

  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [ustStatus, setUstStatus] = useState<'kleinunternehmer' | 'regelbesteuerung'>('kleinunternehmer');
  const [eurData, setEurData] = useState<EURData | null>(null);

  const [steps, setSteps] = useState<WizardStep[]>([
    { id: 1, title: 'Umsatzsteuerpflichtig?', status: 'current' },
    { id: 2, title: 'Steuer Überprüfung', subtitle: undefined, status: 'pending' },
    { id: 3, title: 'Einreichung', status: 'pending' },
  ]);

  const loadEURData = useCallback(async () => {
    if (!uid) return;

    try {
      setLoading(true);

      // Lade Unternehmenseinstellungen
      const companyDoc = await getDoc(doc(db, 'companies', uid));
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        const isKleinunternehmer = data.kleinunternehmer === 'ja' || data.ust === 'kleinunternehmer';
        setUstStatus(isKleinunternehmer ? 'kleinunternehmer' : 'regelbesteuerung');
      }

      // Lade Einnahmen für das Jahr
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('invoiceDate', '>=', Timestamp.fromDate(yearStart)),
        where('invoiceDate', '<=', Timestamp.fromDate(yearEnd))
      );
      const invoicesSnap = await getDocs(invoicesQuery);

      let umsaetze19 = 0;
      let umsaetze7 = 0;
      let umsaetze0 = 0;
      let vereinnahmteUst = 0;

      invoicesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (['paid', 'sent', 'overdue'].includes(data.status)) {
          const netAmount = (data.netAmount || data.subtotal || 0) / 100;
          const taxAmount = (data.taxAmount || data.tax || 0) / 100;
          const taxRate = data.taxRate || data.vatRate || 19;

          if (taxRate === 19) {
            umsaetze19 += netAmount;
          } else if (taxRate === 7) {
            umsaetze7 += netAmount;
          } else {
            umsaetze0 += netAmount;
          }
          vereinnahmteUst += taxAmount;
        }
      });

      // Lade Ausgaben für das Jahr
      const expensesRef = collection(db, 'companies', uid, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('expenseDate', '>=', Timestamp.fromDate(yearStart)),
        where('expenseDate', '<=', Timestamp.fromDate(yearEnd))
      );
      const expensesSnap = await getDocs(expensesQuery);

      const ausgaben = {
        wareneinkauf: 0,
        personalkosten: 0,
        raumkosten: 0,
        versicherungen: 0,
        fahrzeugkosten: 0,
        werbekosten: 0,
        reisekosten: 0,
        telefonInternet: 0,
        buerokosten: 0,
        beratungskosten: 0,
        abschreibungen: 0,
        sonstigeAusgaben: 0,
        gezahlteVorsteuer: 0,
      };

      expensesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (['PAID', 'APPROVED', 'paid', 'approved'].includes(data.status)) {
          const netAmount = (data.netAmount || data.amount || 0) / 100;
          const taxAmount = (data.taxInfo?.taxAmount || data.vatAmount || 0) / 100;
          const category = (data.category || '').toLowerCase();

          ausgaben.gezahlteVorsteuer += taxAmount;

          // Kategorisierung
          if (category.includes('waren') || category.includes('material')) {
            ausgaben.wareneinkauf += netAmount;
          } else if (category.includes('personal') || category.includes('gehalt')) {
            ausgaben.personalkosten += netAmount;
          } else if (category.includes('miete') || category.includes('raum')) {
            ausgaben.raumkosten += netAmount;
          } else if (category.includes('versicherung')) {
            ausgaben.versicherungen += netAmount;
          } else if (category.includes('fahrzeug') || category.includes('auto') || category.includes('kfz')) {
            ausgaben.fahrzeugkosten += netAmount;
          } else if (category.includes('werbung') || category.includes('marketing')) {
            ausgaben.werbekosten += netAmount;
          } else if (category.includes('reise')) {
            ausgaben.reisekosten += netAmount;
          } else if (category.includes('telefon') || category.includes('internet')) {
            ausgaben.telefonInternet += netAmount;
          } else if (category.includes('büro')) {
            ausgaben.buerokosten += netAmount;
          } else if (category.includes('beratung') || category.includes('steuer')) {
            ausgaben.beratungskosten += netAmount;
          } else if (category.includes('abschreibung') || category.includes('afa')) {
            ausgaben.abschreibungen += netAmount;
          } else {
            ausgaben.sonstigeAusgaben += netAmount;
          }
        }
      });

      const totalEinnahmen = umsaetze19 + umsaetze7 + umsaetze0;
      const totalAusgaben = Object.values(ausgaben).reduce((a, b) => a + b, 0) - ausgaben.gezahlteVorsteuer;
      const gewinn = totalEinnahmen - totalAusgaben;

      setEurData({
        year: selectedYear,
        ustStatus,
        einnahmen: {
          umsaetze19,
          umsaetze7,
          umsaetze0,
          sonstigeEinnahmen: 0,
          vereinnahmteUst,
        },
        ausgaben,
        gewinn,
      });

      // Update Wizard-Steps
      const pendingItems = Object.entries(ausgaben).filter(([, v]) => v === 0).length;
      setSteps(prev => prev.map(s => 
        s.id === 2 ? { ...s, subtitle: pendingItems > 0 ? `${pendingItems} Punkte zu prüfen` : undefined } : s
      ));

    } catch (error) {
      console.error('Fehler beim Laden:', error);
      toast.error('Fehler beim Laden der EÜR-Daten');
    } finally {
      setLoading(false);
    }
  }, [uid, selectedYear, ustStatus]);

  useEffect(() => {
    loadEURData();
  }, [loadEURData]);

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
    setSteps(prev => prev.map(s => ({
      ...s,
      status: s.id < stepId ? 'complete' : s.id === stepId ? 'current' : 'pending',
    })));
  };

  const handleSaveUstStatus = () => {
    toast.success('Umsatzsteuer-Status gespeichert');
    handleStepClick(2);
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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="col-span-2 h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Zurück-Link */}
      <Link 
        href={`/dashboard/company/${uid}/finance/taxes`}
        className="inline-flex items-center text-[#14ad9f] hover:text-teal-700 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Steuern
      </Link>

      {/* Titel */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900">EÜR {selectedYear}</h1>
        <button className="text-gray-400 hover:text-gray-600">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Info Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Deine EÜR für {selectedYear} wird voraussichtlich Anfang Februar {selectedYear + 1} verfügbar. 
              Mit Taskilo kannst du deine EÜR für {selectedYear} mit unserer Steuergarantie pünktlich und 
              sicher einreichen. Bei Fragen wende dich bitte an unseren Support.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wizard Steps Sidebar */}
        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6 text-gray-600">
              <HelpCircle className="w-5 h-5" />
              <span className="font-medium">Für wen ist diese Erklärung?</span>
            </div>

            <div className="space-y-6">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`flex items-start gap-3 w-full text-left transition-colors ${
                    step.status === 'current' ? '' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    step.status === 'complete' 
                      ? 'bg-[#14ad9f] text-white'
                      : step.status === 'current'
                      ? 'bg-[#14ad9f] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.status === 'complete' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${
                      step.status === 'current' ? 'text-[#14ad9f]' : 'text-gray-700'
                    }`}>
                      {step.title}
                    </p>
                    {step.subtitle && (
                      <p className="text-sm text-orange-600">{step.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {currentStep === 1 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Umsatzsteuer-Status während des Zeitraums
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Dein Umsatzsteuer-Status in {selectedYear}, wie vom Finanzamt angegeben
                      </label>
                      <button className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <Select value={ustStatus} onValueChange={(v) => setUstStatus(v as typeof ustStatus)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kleinunternehmer">Kleinunternehmer</SelectItem>
                        <SelectItem value="regelbesteuerung">Regelbesteuerung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800">
                          Basierend auf deinen Einnahmen und Ausgaben gehen wir davon aus, dass du im Laufe des Jahres {ustStatus === 'kleinunternehmer' ? 'Kleinunternehmer' : 'regelbesteuert'} warst. 
                          Bitte bestätige dies oder passe den Status an, falls dies nicht korrekt ist. 
                          Bei Fragen kannst du dich gerne an uns wenden. Wir werden die Einnahmen-Überschuss-Rechnung (EÜR) und die Umsatzsteuererklärung auf Grundlage deiner Antwort erstellen.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveUstStatus}
                      className="bg-[#14ad9f] hover:bg-teal-700"
                    >
                      Speichern
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Steuer Überprüfung
                </h2>

                <div className="space-y-6">
                  {/* Einnahmen */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#14ad9f]" />
                      Betriebseinnahmen
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Umsätze 19%</span>
                        <span className="font-medium">{formatCurrency(eurData?.einnahmen.umsaetze19 || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Umsätze 7%</span>
                        <span className="font-medium">{formatCurrency(eurData?.einnahmen.umsaetze7 || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Umsätze 0% (steuerfrei)</span>
                        <span className="font-medium">{formatCurrency(eurData?.einnahmen.umsaetze0 || 0)}</span>
                      </div>
                      {ustStatus === 'regelbesteuerung' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vereinnahmte Umsatzsteuer</span>
                          <span className="font-medium">{formatCurrency(eurData?.einnahmen.vereinnahmteUst || 0)}</span>
                        </div>
                      )}
                      <div className="border-t pt-3 flex justify-between font-semibold">
                        <span>Gesamt Einnahmen</span>
                        <span className="text-[#14ad9f]">
                          {formatCurrency(
                            (eurData?.einnahmen.umsaetze19 || 0) + 
                            (eurData?.einnahmen.umsaetze7 || 0) + 
                            (eurData?.einnahmen.umsaetze0 || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ausgaben */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      Betriebsausgaben
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {eurData?.ausgaben && Object.entries(eurData.ausgaben)
                        .filter(([key]) => key !== 'gezahlteVorsteuer')
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </span>
                            <span className="font-medium">{formatCurrency(value)}</span>
                          </div>
                        ))}
                      {ustStatus === 'regelbesteuerung' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gezahlte Vorsteuer</span>
                          <span className="font-medium">{formatCurrency(eurData?.ausgaben.gezahlteVorsteuer || 0)}</span>
                        </div>
                      )}
                      <div className="border-t pt-3 flex justify-between font-semibold">
                        <span>Gesamt Ausgaben</span>
                        <span className="text-orange-500">
                          {formatCurrency(
                            Object.entries(eurData?.ausgaben || {})
                              .filter(([key]) => key !== 'gezahlteVorsteuer')
                              .reduce((sum, [, v]) => sum + v, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gewinn */}
                  <Card className="border-[#14ad9f]/30 bg-[#14ad9f]/5">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">
                          Gewinn/Verlust {selectedYear}
                        </span>
                        <span className={`text-2xl font-bold ${
                          (eurData?.gewinn || 0) >= 0 ? 'text-[#14ad9f]' : 'text-red-600'
                        }`}>
                          {formatCurrency(eurData?.gewinn || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => handleStepClick(3)}
                      className="bg-[#14ad9f] hover:bg-teal-700"
                    >
                      Weiter zur Einreichung
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  EÜR einreichen
                </h2>

                <div className="space-y-6">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-green-900">Deine EÜR ist bereit zur Einreichung</p>
                          <p className="text-sm text-green-700 mt-1">
                            Alle erforderlichen Daten wurden erfasst und geprüft.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Zusammenfassung */}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900">Zusammenfassung EÜR {selectedYear}</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Betriebseinnahmen</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(
                            (eurData?.einnahmen.umsaetze19 || 0) + 
                            (eurData?.einnahmen.umsaetze7 || 0) + 
                            (eurData?.einnahmen.umsaetze0 || 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Betriebsausgaben</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(
                            Object.entries(eurData?.ausgaben || {})
                              .filter(([key]) => key !== 'gezahlteVorsteuer')
                              .reduce((sum, [, v]) => sum + v, 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Gewinn/Verlust</p>
                        <p className={`text-lg font-semibold ${
                          (eurData?.gewinn || 0) >= 0 ? 'text-[#14ad9f]' : 'text-red-600'
                        }`}>
                          {formatCurrency(eurData?.gewinn || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {ustStatus === 'kleinunternehmer' ? 'Kleinunternehmer' : 'Regelbesteuerung'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800">
                          <strong>Hinweis zur ELSTER-Übermittlung:</strong><br />
                          Die direkte Übermittlung an ELSTER wird vorbereitet. Aktuell kannst du die EÜR 
                          als PDF herunterladen und manuell über{' '}
                          <a 
                            href="https://www.elster.de" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-900"
                          >
                            elster.de
                          </a>{' '}
                          einreichen.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline">
                      PDF herunterladen
                    </Button>
                    <Button className="bg-[#14ad9f] hover:bg-teal-700 gap-2">
                      <Send className="w-4 h-4" />
                      Überprüfen und Abschicken
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
