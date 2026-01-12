'use client';

/**
 * UStVA-Assistent Wizard - Schritt 4: Zusammenfassung
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Calendar, FileText, Receipt, ClipboardCheck, Send, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  { id: 1, title: 'Zeitraum', icon: Calendar },
  { id: 2, title: 'Einnahmen', icon: FileText },
  { id: 3, title: 'Ausgaben', icon: Receipt },
  { id: 4, title: 'Zusammenfassung', icon: ClipboardCheck },
  { id: 5, title: 'Absenden', icon: Send },
];

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  netAmount: number;
  taxAmount: number;
  taxRate: number;
}

interface Expense {
  id: string;
  title: string;
  vendor: string;
  netAmount: number;
  taxAmount: number;
  taxRate: number;
}

interface UStVAData {
  umsatzSteuerpflichtig19: number;
  umsatzSteuerpflichtig7: number;
  umsatzsteuer19: number;
  umsatzsteuer7: number;
  vorsteuerAbziehbar: number;
  zahllast: number;
  erstattung: number;
}

export default function WizardZusammenfassungPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = params.uid as string;

  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const quarter = parseInt(searchParams.get('quarter') || '1');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [ustvaData, setUstvaData] = useState<UStVAData | null>(null);

  useEffect(() => {
    // Lade Daten aus sessionStorage
    const savedInvoices = sessionStorage.getItem('ustva_invoices');
    const savedSelectedInvoices = sessionStorage.getItem('ustva_selected_invoices');
    const savedExpenses = sessionStorage.getItem('ustva_expenses');
    const savedSelectedExpenses = sessionStorage.getItem('ustva_selected_expenses');

    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    }
    if (savedSelectedInvoices) {
      setSelectedInvoiceIds(new Set(JSON.parse(savedSelectedInvoices)));
    }
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
    if (savedSelectedExpenses) {
      setSelectedExpenseIds(new Set(JSON.parse(savedSelectedExpenses)));
    }
  }, []);

  useEffect(() => {
    // Berechne UStVA
    let umsatz19 = 0;
    let umsatz7 = 0;
    let ust19 = 0;
    let ust7 = 0;

    invoices.forEach(inv => {
      if (!selectedInvoiceIds.has(inv.id)) return;
      if (inv.taxRate === 19) {
        umsatz19 += inv.netAmount;
        ust19 += inv.taxAmount;
      } else if (inv.taxRate === 7) {
        umsatz7 += inv.netAmount;
        ust7 += inv.taxAmount;
      }
    });

    let vorsteuer = 0;
    expenses.forEach(exp => {
      if (!selectedExpenseIds.has(exp.id)) return;
      vorsteuer += exp.taxAmount;
    });

    const ustGesamt = ust19 + ust7;
    const saldo = ustGesamt - vorsteuer;

    setUstvaData({
      umsatzSteuerpflichtig19: umsatz19,
      umsatzSteuerpflichtig7: umsatz7,
      umsatzsteuer19: ust19,
      umsatzsteuer7: ust7,
      vorsteuerAbziehbar: vorsteuer,
      zahllast: saldo > 0 ? saldo : 0,
      erstattung: saldo < 0 ? Math.abs(saldo) : 0,
    });
  }, [invoices, expenses, selectedInvoiceIds, selectedExpenseIds]);

  const handleNext = () => {
    // Speichere berechnete Daten
    sessionStorage.setItem('ustva_calculated', JSON.stringify(ustvaData));
    router.push(`/dashboard/company/${uid}/finance/taxes/wizard/absenden?year=${year}&quarter=${quarter}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const selectedInvoiceCount = invoices.filter(i => selectedInvoiceIds.has(i.id)).length;
  const selectedExpenseCount = expenses.filter(e => selectedExpenseIds.has(e.id)).length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/dashboard/company/${uid}/finance/taxes`}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Steuerzentrale
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">UStVA-Assistent</h1>
        <p className="text-gray-600 mt-2">
          Q{quarter}/{year} - Zusammenfassung
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center ${step.id <= 4 ? 'text-[#14ad9f]' : 'text-gray-400'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.id < 4 ? 'bg-[#14ad9f]/20 text-[#14ad9f]' :
                step.id === 4 ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={80} className="h-2" />
        <p className="text-sm text-gray-500 mt-2">Schritt 4 von 5</p>
      </div>

      {/* Content */}
      <div className="space-y-6 mb-8">
        {/* Übersicht */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#14ad9f]" />
              Zusammenfassung UStVA Q{quarter}/{year}
            </CardTitle>
            <CardDescription>
              Prüfen Sie Ihre Angaben vor dem Absenden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Ausgewählte Rechnungen</p>
                <p className="text-2xl font-bold text-gray-900">{selectedInvoiceCount}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Ausgewählte Ausgaben</p>
                <p className="text-2xl font-bold text-gray-900">{selectedExpenseCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Umsätze */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Steuerpflichtige Umsätze</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">Umsätze 19% (Kz. 81)</p>
                  <p className="text-sm text-gray-500">Netto-Umsätze mit 19% USt</p>
                </div>
                <span className="font-mono">{formatCurrency(ustvaData?.umsatzSteuerpflichtig19 || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">Umsätze 7% (Kz. 86)</p>
                  <p className="text-sm text-gray-500">Netto-Umsätze mit 7% USt</p>
                </div>
                <span className="font-mono">{formatCurrency(ustvaData?.umsatzSteuerpflichtig7 || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">USt auf Umsätze 19%</p>
                </div>
                <span className="font-mono">{formatCurrency(ustvaData?.umsatzsteuer19 || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">USt auf Umsätze 7%</p>
                </div>
                <span className="font-mono">{formatCurrency(ustvaData?.umsatzsteuer7 || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vorsteuer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Abziehbare Vorsteuer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium">Vorsteuer (Kz. 66)</p>
                <p className="text-sm text-gray-500">Aus Eingangsrechnungen</p>
              </div>
              <span className="font-mono text-[#14ad9f]">{formatCurrency(ustvaData?.vorsteuerAbziehbar || 0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Ergebnis */}
        <Card className={ustvaData && ustvaData.zahllast > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ustvaData && ustvaData.zahllast > 0 ? (
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
                <div>
                  <p className="font-medium text-lg">
                    {ustvaData && ustvaData.zahllast > 0 ? 'Zahllast (Kz. 83)' : 'Erstattung (Kz. 83)'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {ustvaData && ustvaData.zahllast > 0 
                      ? 'Dieser Betrag ist an das Finanzamt zu überweisen'
                      : 'Dieser Betrag wird Ihnen erstattet'}
                  </p>
                </div>
              </div>
              <span className={`text-3xl font-bold ${ustvaData && ustvaData.zahllast > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(ustvaData?.zahllast || ustvaData?.erstattung || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Link href={`/dashboard/company/${uid}/finance/taxes/wizard/ausgaben?year=${year}&quarter=${quarter}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </Link>
        <Button onClick={handleNext} className="bg-[#14ad9f] hover:bg-teal-700">
          Weiter zum Absenden
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
