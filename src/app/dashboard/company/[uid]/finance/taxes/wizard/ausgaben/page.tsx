'use client';

/**
 * UStVA-Assistent Wizard - Schritt 3: Ausgaben/Vorsteuer prüfen
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Calendar, FileText, Receipt, ClipboardCheck, Send, Loader2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface Expense {
  id: string;
  title: string;
  vendor: string;
  netAmount: number;
  taxAmount: number;
  taxRate: number;
  expenseDate: Date;
  category: string;
  isDeductible: boolean;
}

export default function WizardAusgabenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = params.uid as string;

  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const quarter = parseInt(searchParams.get('quarter') || '1');

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadExpenses = useCallback(async () => {
    if (!uid) return;
    
    setLoading(true);
    try {
      const startMonth = (quarter - 1) * 3;
      const periodStart = new Date(year, startMonth, 1);
      const periodEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);
      
      const startTimestamp = Timestamp.fromDate(periodStart);
      const endTimestamp = Timestamp.fromDate(periodEnd);

      const expensesRef = collection(db, 'companies', uid, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('expenseDate', '>=', startTimestamp),
        where('expenseDate', '<=', endTimestamp)
      );
      
      const snapshot = await getDocs(expensesQuery);
      const loadedExpenses: Expense[] = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (['PAID', 'APPROVED', 'paid', 'approved'].includes(data.status)) {
          loadedExpenses.push({
            id: docSnap.id,
            title: data.title || data.description || 'Ohne Titel',
            vendor: data.vendor || data.supplierName || 'Unbekannt',
            netAmount: (data.netAmount || data.amount || 0) / 100,
            taxAmount: (data.taxInfo?.taxAmount || data.vatAmount || 0) / 100,
            taxRate: data.taxInfo?.taxRate || data.vatRate || 19,
            expenseDate: data.expenseDate?.toDate() || new Date(),
            category: data.category || 'Sonstige',
            isDeductible: data.taxInfo?.isDeductible !== false,
          });
        }
      });

      setExpenses(loadedExpenses);
      // Nur abziehbare standardmäßig auswählen
      setSelectedIds(new Set(loadedExpenses.filter(e => e.isDeductible).map(e => e.id)));
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  }, [uid, year, quarter]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const toggleExpense = (id: string) => {
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

  const selectAll = () => setSelectedIds(new Set(expenses.map(e => e.id)));
  const selectNone = () => setSelectedIds(new Set());

  const totalVorsteuer = expenses
    .filter(exp => selectedIds.has(exp.id))
    .reduce((sum, exp) => sum + exp.taxAmount, 0);

  const handleNext = () => {
    // Speichere ausgewählte IDs in sessionStorage
    sessionStorage.setItem('ustva_selected_expenses', JSON.stringify([...selectedIds]));
    sessionStorage.setItem('ustva_expenses', JSON.stringify(expenses));
    router.push(`/dashboard/company/${uid}/finance/taxes/wizard/zusammenfassung?year=${year}&quarter=${quarter}`);
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
          Q{quarter}/{year} - Ausgaben und Vorsteuer prüfen
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center ${step.id <= 3 ? 'text-[#14ad9f]' : 'text-gray-400'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.id < 3 ? 'bg-[#14ad9f]/20 text-[#14ad9f]' :
                step.id === 3 ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={60} className="h-2" />
        <p className="text-sm text-gray-500 mt-2">Schritt 3 von 5</p>
      </div>

      {/* Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#14ad9f]" />
            Ausgaben und Vorsteuer prüfen
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Vorsteuer können Sie nur für betriebliche Ausgaben geltend machen, 
                    für die Sie eine ordnungsgemäße Rechnung mit ausgewiesener Umsatzsteuer haben.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Wählen Sie die Ausgaben, deren Vorsteuer Sie geltend machen möchten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
              <span className="ml-3 text-gray-600">Lade Ausgaben...</span>
            </div>
          ) : (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <span className="text-sm text-gray-600">
                  {selectedIds.size} von {expenses.length} Ausgaben ausgewählt
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

              {/* Expense List */}
              {expenses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Ausgaben im gewählten Zeitraum gefunden</p>
                  <p className="text-sm mt-2">
                    Zeitraum: Q{quarter}/{year}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(expense.id) 
                          ? 'bg-[#14ad9f]/5 border-[#14ad9f]' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleExpense(expense.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(expense.id)}
                        onCheckedChange={() => toggleExpense(expense.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {expense.title}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {expense.category}
                          </span>
                          {!expense.isDeductible && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                              Nicht abziehbar
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {expense.vendor}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(expense.netAmount)}
                        </p>
                        <p className="text-sm text-[#14ad9f]">
                          VSt: {formatCurrency(expense.taxAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Vorsteuer gesamt (abziehbar)</span>
                  <span className="text-xl font-bold text-[#14ad9f]">
                    {formatCurrency(totalVorsteuer)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Link href={`/dashboard/company/${uid}/finance/taxes/wizard/einnahmen?year=${year}&quarter=${quarter}`}>
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
