'use client';

/**
 * UStVA-Assistent Wizard - Schritt 2: Einnahmen/Rechnungen prüfen
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Calendar, FileText, Receipt, ClipboardCheck, Send, Loader2 } from 'lucide-react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
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
  invoiceDate: Date;
  status: string;
}

export default function WizardEinnahmenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = params.uid as string;

  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const quarter = parseInt(searchParams.get('quarter') || '1');

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadInvoices = useCallback(async () => {
    if (!uid) return;
    
    setLoading(true);
    try {
      const startMonth = (quarter - 1) * 3;
      const periodStart = new Date(year, startMonth, 1);
      const periodEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);
      
      const startTimestamp = Timestamp.fromDate(periodStart);
      const endTimestamp = Timestamp.fromDate(periodEnd);

      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('invoiceDate', '>=', startTimestamp),
        where('invoiceDate', '<=', endTimestamp)
      );
      
      const snapshot = await getDocs(invoicesQuery);
      const loadedInvoices: Invoice[] = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const validStatus = ['paid', 'sent', 'overdue', 'partial'].includes(data.status);
        const isLocked = data.isLocked === true || data.gobdStatus === 'locked';
        
        if (validStatus || isLocked) {
          loadedInvoices.push({
            id: docSnap.id,
            invoiceNumber: data.invoiceNumber || data.number || 'Ohne Nr.',
            customerName: data.customerName || data.customer?.name || 'Unbekannt',
            netAmount: (data.netAmount || data.subtotal || 0) / 100,
            taxAmount: (data.taxAmount || data.tax || 0) / 100,
            taxRate: data.taxRate || data.vatRate || 19,
            invoiceDate: data.invoiceDate?.toDate() || new Date(),
            status: data.status,
          });
        }
      });

      setInvoices(loadedInvoices);
      // Alle standardmäßig auswählen
      setSelectedIds(new Set(loadedInvoices.map(i => i.id)));
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  }, [uid, year, quarter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const toggleInvoice = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => setSelectedIds(new Set(invoices.map(i => i.id)));
  const selectNone = () => setSelectedIds(new Set());

  const totalTax = invoices
    .filter(inv => selectedIds.has(inv.id))
    .reduce((sum, inv) => sum + inv.taxAmount, 0);

  const handleNext = () => {
    // Speichere ausgewählte IDs in sessionStorage für den nächsten Schritt
    sessionStorage.setItem('ustva_selected_invoices', JSON.stringify([...selectedIds]));
    sessionStorage.setItem('ustva_invoices', JSON.stringify(invoices));
    router.push(`/dashboard/company/${uid}/finance/taxes/wizard/ausgaben?year=${year}&quarter=${quarter}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

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
          Q{quarter}/{year} - Rechnungen prüfen
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center ${step.id <= 2 ? 'text-[#14ad9f]' : 'text-gray-400'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.id < 2 ? 'bg-[#14ad9f]/20 text-[#14ad9f]' :
                step.id === 2 ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={40} className="h-2" />
        <p className="text-sm text-gray-500 mt-2">Schritt 2 von 5</p>
      </div>

      {/* Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#14ad9f]" />
            Einnahmen prüfen
          </CardTitle>
          <CardDescription>
            Prüfen und wählen Sie die Rechnungen, die in die UStVA einfließen sollen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
              <span className="ml-3 text-gray-600">Lade Rechnungen...</span>
            </div>
          ) : (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <span className="text-sm text-gray-600">
                  {selectedIds.size} von {invoices.length} Rechnungen ausgewählt
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Alle auswählen
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>
                    Keine
                  </Button>
                </div>
              </div>

              {/* Invoice List */}
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Rechnungen im gewählten Zeitraum gefunden</p>
                  <p className="text-sm mt-2">
                    Zeitraum: Q{quarter}/{year}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(invoice.id) 
                          ? 'bg-[#14ad9f]/5 border-[#14ad9f]' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleInvoice(invoice.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(invoice.id)}
                        onCheckedChange={() => toggleInvoice(invoice.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {invoice.taxRate}% USt
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {invoice.customerName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(invoice.netAmount)}
                        </p>
                        <p className="text-sm text-[#14ad9f]">
                          USt: {formatCurrency(invoice.taxAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Umsatzsteuer gesamt</span>
                  <span className="text-xl font-bold text-[#14ad9f]">
                    {formatCurrency(totalTax)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Link href={`/dashboard/company/${uid}/finance/taxes/wizard?year=${year}&quarter=${quarter}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </Link>
        <Button onClick={handleNext} className="bg-[#14ad9f] hover:bg-teal-700" disabled={loading}>
          Weiter
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
