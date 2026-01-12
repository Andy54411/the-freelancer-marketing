'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Receipt,
  Euro,
  Send,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Building2,
  Clock,
  Download,
  Shield,
} from 'lucide-react';
import { TaxService } from '@/services/taxService';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface TaxWizardProps {
  companyId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

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

interface WizardData {
  year: number;
  quarter: number;
  invoices: Invoice[];
  expenses: Expense[];
  selectedInvoices: Set<string>;
  selectedExpenses: Set<string>;
  ustvaData: {
    umsatzSteuerpflichtig19: number;
    umsatzSteuerpflichtig7: number;
    umsatzsteuer19: number;
    umsatzsteuer7: number;
    vorsteuerAbziehbar: number;
    zahllast: number;
    erstattung: number;
  } | null;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Zeitraum', description: 'Voranmeldungszeitraum wählen' },
  { id: 2, title: 'Einnahmen', description: 'Rechnungen prüfen' },
  { id: 3, title: 'Ausgaben', description: 'Vorsteuer prüfen' },
  { id: 4, title: 'Zusammenfassung', description: 'Daten überprüfen' },
  { id: 5, title: 'Absenden', description: 'An ELSTER übermitteln' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const getQuarterLabel = (quarter: number) => {
  const labels: Record<number, string> = {
    1: 'Januar - März',
    2: 'April - Juni',
    3: 'Juli - September',
    4: 'Oktober - Dezember',
  };
  return labels[quarter] || '';
};

const getQuarterDueDate = (year: number, quarter: number) => {
  const dueDates: Record<number, string> = {
    1: `10.04.${year}`,
    2: `10.07.${year}`,
    3: `10.10.${year}`,
    4: `10.01.${year + 1}`,
  };
  return dueDates[quarter] || '';
};

export function TaxWizard({ companyId, userId, isOpen, onClose, onComplete }: TaxWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  
  const [wizardData, setWizardData] = useState<WizardData>({
    year: currentYear,
    quarter: currentQuarter > 1 ? currentQuarter - 1 : 4,
    invoices: [],
    expenses: [],
    selectedInvoices: new Set(),
    selectedExpenses: new Set(),
    ustvaData: null,
  });

  const loadInvoicesAndExpenses = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { year, quarter } = wizardData;
      const startMonth = (quarter - 1) * 3;
      const periodStart = new Date(year, startMonth, 1);
      const periodEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);
      
      const startTimestamp = Timestamp.fromDate(periodStart);
      const endTimestamp = Timestamp.fromDate(periodEnd);

      // Lade Rechnungen
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('invoiceDate', '>=', startTimestamp),
        where('invoiceDate', '<=', endTimestamp)
      );
      
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoices: Invoice[] = [];
      
      invoicesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const validStatus = ['paid', 'sent', 'overdue', 'partial'].includes(data.status);
        const isLocked = data.isLocked === true || data.gobdStatus === 'locked';
        
        if (validStatus || isLocked) {
          invoices.push({
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

      // Lade Ausgaben
      const expensesRef = collection(db, 'companies', companyId, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('expenseDate', '>=', startTimestamp),
        where('expenseDate', '<=', endTimestamp)
      );
      
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses: Expense[] = [];
      
      expensesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (['PAID', 'APPROVED'].includes(data.status)) {
          expenses.push({
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

      // Alle standardmäßig auswählen
      const selectedInvoices = new Set(invoices.map(i => i.id));
      const selectedExpenses = new Set(expenses.filter(e => e.isDeductible).map(e => e.id));

      setWizardData(prev => ({
        ...prev,
        invoices,
        expenses,
        selectedInvoices,
        selectedExpenses,
      }));

    } catch {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [companyId, wizardData.year, wizardData.quarter]);

  useEffect(() => {
    if (isOpen && currentStep === 2) {
      loadInvoicesAndExpenses();
    }
  }, [isOpen, currentStep, loadInvoicesAndExpenses]);

  const calculateUStVA = useCallback(() => {
    const { invoices, expenses, selectedInvoices, selectedExpenses } = wizardData;
    
    let umsatz19 = 0;
    let umsatz7 = 0;
    let ust19 = 0;
    let ust7 = 0;
    
    invoices.forEach(inv => {
      if (!selectedInvoices.has(inv.id)) return;
      
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
      if (!selectedExpenses.has(exp.id)) return;
      if (exp.isDeductible) {
        vorsteuer += exp.taxAmount;
      }
    });

    const umsatzsteuerSchuld = ust19 + ust7;
    const zahllast = umsatzsteuerSchuld - vorsteuer;

    return {
      umsatzSteuerpflichtig19: Math.round(umsatz19 * 100) / 100,
      umsatzSteuerpflichtig7: Math.round(umsatz7 * 100) / 100,
      umsatzsteuer19: Math.round(ust19 * 100) / 100,
      umsatzsteuer7: Math.round(ust7 * 100) / 100,
      vorsteuerAbziehbar: Math.round(vorsteuer * 100) / 100,
      zahllast: zahllast > 0 ? Math.round(zahllast * 100) / 100 : 0,
      erstattung: zahllast < 0 ? Math.round(Math.abs(zahllast) * 100) / 100 : 0,
    };
  }, [wizardData]);

  useEffect(() => {
    if (currentStep >= 4) {
      const ustvaData = calculateUStVA();
      setWizardData(prev => ({ ...prev, ustvaData }));
    }
  }, [currentStep, calculateUStVA]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { year, quarter, ustvaData } = wizardData;
      
      // Erstelle Steuerbericht
      await TaxService.createTaxReport({
        companyId,
        type: 'ustVA',
        year,
        quarter,
        periodStart: new Date(year, (quarter - 1) * 3, 1),
        periodEnd: new Date(year, quarter * 3, 0),
        status: 'calculated',
        taxData: { 
          ustVA: {
            umsatzSteuerpflichtig19: ustvaData?.umsatzSteuerpflichtig19 || 0,
            umsatzSteuerpflichtig7: ustvaData?.umsatzSteuerpflichtig7 || 0,
            umsatzSteuerpflichtig: (ustvaData?.umsatzSteuerpflichtig19 || 0) + (ustvaData?.umsatzSteuerpflichtig7 || 0),
            umsatzSteuerfrei: 0,
            innergemeinschaftlich: 0,
            umsatzsteuer19: ustvaData?.umsatzsteuer19 || 0,
            umsatzsteuer7: ustvaData?.umsatzsteuer7 || 0,
            vorsteuerAbziehbar: ustvaData?.vorsteuerAbziehbar || 0,
            vorsteuerInnergem: 0,
            vorsteuerImport: 0,
            umsatzsteuerSchuld: (ustvaData?.umsatzsteuer19 || 0) + (ustvaData?.umsatzsteuer7 || 0),
            vorsteuerGuthaben: ustvaData?.vorsteuerAbziehbar || 0,
            zahllast: ustvaData?.zahllast || 0,
            erstattung: ustvaData?.erstattung || 0,
          }
        },
        generatedBy: userId,
        notes: `UStVA Q${quarter}/${year} - Erstellt über Steuer-Wizard`,
      });

      toast.success('UStVA erfolgreich erstellt!');
      onComplete?.();
      onClose();
    } catch {
      toast.error('Fehler beim Erstellen der UStVA');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleInvoice = (id: string) => {
    setWizardData(prev => {
      const newSet = new Set(prev.selectedInvoices);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { ...prev, selectedInvoices: newSet };
    });
  };

  const toggleExpense = (id: string) => {
    setWizardData(prev => {
      const newSet = new Set(prev.selectedExpenses);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { ...prev, selectedExpenses: newSet };
    });
  };

  const selectAllInvoices = () => {
    setWizardData(prev => ({
      ...prev,
      selectedInvoices: new Set(prev.invoices.map(i => i.id)),
    }));
  };

  const deselectAllInvoices = () => {
    setWizardData(prev => ({
      ...prev,
      selectedInvoices: new Set(),
    }));
  };

  const selectAllExpenses = () => {
    setWizardData(prev => ({
      ...prev,
      selectedExpenses: new Set(prev.expenses.filter(e => e.isDeductible).map(e => e.id)),
    }));
  };

  const deselectAllExpenses = () => {
    setWizardData(prev => ({
      ...prev,
      selectedExpenses: new Set(),
    }));
  };

  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#14ad9f]/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-[#14ad9f]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Voranmeldungszeitraum wählen
              </h3>
              <p className="text-gray-600">
                Für welches Quartal möchten Sie die UStVA erstellen?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jahr</label>
                <select
                  value={wizardData.year}
                  onChange={(e) => setWizardData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f]"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quartal</label>
                <select
                  value={wizardData.quarter}
                  onChange={(e) => setWizardData(prev => ({ ...prev, quarter: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f]"
                >
                  {[1, 2, 3, 4].map(q => (
                    <option key={q} value={q}>Q{q} - {getQuarterLabel(q)}</option>
                  ))}
                </select>
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Abgabefrist</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Die UStVA für Q{wizardData.quarter}/{wizardData.year} ist fällig am{' '}
                      <strong>{getQuarterDueDate(wizardData.year, wizardData.quarter)}</strong>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Einnahmen prüfen
              </h3>
              <p className="text-gray-600">
                Prüfen Sie die Rechnungen, die in die UStVA einfließen sollen
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
                <span className="ml-3 text-gray-600">Lade Rechnungen...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {wizardData.selectedInvoices.size} von {wizardData.invoices.length} Rechnungen ausgewählt
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllInvoices}>
                      Alle auswählen
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAllInvoices}>
                      Keine
                    </Button>
                  </div>
                </div>

                {wizardData.invoices.length === 0 ? (
                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-6 text-center">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">Keine Rechnungen im gewählten Zeitraum gefunden</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {wizardData.invoices.slice(0, expandedInvoices ? undefined : 5).map(inv => (
                      <div
                        key={inv.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          wizardData.selectedInvoices.has(inv.id)
                            ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleInvoice(inv.id)}
                      >
                        <Checkbox
                          checked={wizardData.selectedInvoices.has(inv.id)}
                          onCheckedChange={() => toggleInvoice(inv.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {inv.invoiceNumber}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {inv.taxRate}%
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{inv.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(inv.netAmount)}</p>
                          <p className="text-sm text-green-600">+{formatCurrency(inv.taxAmount)} USt</p>
                        </div>
                      </div>
                    ))}
                    
                    {wizardData.invoices.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setExpandedInvoices(!expandedInvoices)}
                      >
                        {expandedInvoices ? (
                          <>Weniger anzeigen <ChevronUp className="h-4 w-4 ml-1" /></>
                        ) : (
                          <>Alle {wizardData.invoices.length} anzeigen <ChevronDown className="h-4 w-4 ml-1" /></>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">Umsatzsteuer gesamt</span>
                      <span className="text-xl font-bold text-green-700">
                        {formatCurrency(
                          wizardData.invoices
                            .filter(i => wizardData.selectedInvoices.has(i.id))
                            .reduce((sum, i) => sum + i.taxAmount, 0)
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Vorsteuer prüfen
              </h3>
              <p className="text-gray-600">
                Prüfen Sie die Ausgaben, deren Vorsteuer Sie geltend machen möchten
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {wizardData.selectedExpenses.size} von {wizardData.expenses.length} Ausgaben ausgewählt
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllExpenses}>
                  Alle auswählen
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllExpenses}>
                  Keine
                </Button>
              </div>
            </div>

            {wizardData.expenses.length === 0 ? (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6 text-center">
                  <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Keine Ausgaben im gewählten Zeitraum gefunden</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {wizardData.expenses.slice(0, expandedExpenses ? undefined : 5).map(exp => (
                  <div
                    key={exp.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      wizardData.selectedExpenses.has(exp.id)
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : exp.isDeductible
                          ? 'border-gray-200 hover:bg-gray-50'
                          : 'border-gray-200 bg-gray-100 opacity-60'
                    }`}
                    onClick={() => exp.isDeductible && toggleExpense(exp.id)}
                  >
                    <Checkbox
                      checked={wizardData.selectedExpenses.has(exp.id)}
                      disabled={!exp.isDeductible}
                      onCheckedChange={() => toggleExpense(exp.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {exp.title}
                        </span>
                        {!exp.isDeductible && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                            Nicht abziehbar
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{exp.vendor}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(exp.netAmount)}</p>
                      <p className="text-sm text-purple-600">-{formatCurrency(exp.taxAmount)} VSt</p>
                    </div>
                  </div>
                ))}
                
                {wizardData.expenses.length > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setExpandedExpenses(!expandedExpenses)}
                  >
                    {expandedExpenses ? (
                      <>Weniger anzeigen <ChevronUp className="h-4 w-4 ml-1" /></>
                    ) : (
                      <>Alle {wizardData.expenses.length} anzeigen <ChevronDown className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                )}
              </div>
            )}

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-purple-800">Vorsteuer gesamt</span>
                  <span className="text-xl font-bold text-purple-700">
                    -{formatCurrency(
                      wizardData.expenses
                        .filter(e => wizardData.selectedExpenses.has(e.id))
                        .reduce((sum, e) => sum + e.taxAmount, 0)
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Was ist abziehbar?</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Die Vorsteuer kann nur für betrieblich veranlasste Ausgaben geltend gemacht werden. 
                      Private Ausgaben oder gemischte Nutzung sind nur anteilig abziehbar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        const data = wizardData.ustvaData;
        const isErstattung = (data?.erstattung || 0) > 0;
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Euro className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Zusammenfassung
              </h3>
              <p className="text-gray-600">
                Prüfen Sie die berechneten Werte vor dem Absenden
              </p>
            </div>

            <Card className={`border-2 ${isErstattung ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600 mb-1">
                    {isErstattung ? 'Erstattungsanspruch' : 'Zahllast'} Q{wizardData.quarter}/{wizardData.year}
                  </p>
                  <p className={`text-4xl font-bold ${isErstattung ? 'text-green-600' : 'text-gray-900'}`}>
                    {isErstattung ? '-' : ''}{formatCurrency(isErstattung ? data?.erstattung || 0 : data?.zahllast || 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Fällig am {getQuarterDueDate(wizardData.year, wizardData.quarter)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">UStVA-Kennzahlen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Umsätze 19% (Kz. 81)</span>
                  <span className="font-medium">{formatCurrency(data?.umsatzSteuerpflichtig19 || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Umsätze 7% (Kz. 86)</span>
                  <span className="font-medium">{formatCurrency(data?.umsatzSteuerpflichtig7 || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">USt 19%</span>
                  <span className="font-medium text-blue-600">{formatCurrency(data?.umsatzsteuer19 || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">USt 7%</span>
                  <span className="font-medium text-blue-600">{formatCurrency(data?.umsatzsteuer7 || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Vorsteuer (Kz. 66)</span>
                  <span className="font-medium text-green-600">-{formatCurrency(data?.vorsteuerAbziehbar || 0)}</span>
                </div>
                <div className="flex justify-between py-3 font-semibold text-lg">
                  <span>{isErstattung ? 'Erstattung' : 'Zahllast'} (Kz. 83)</span>
                  <span className={isErstattung ? 'text-green-600' : ''}>
                    {isErstattung ? '-' : ''}{formatCurrency(isErstattung ? data?.erstattung || 0 : data?.zahllast || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Daten geprüft?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Bitte prüfen Sie alle Werte sorgfältig. Nach dem Absenden können die Daten 
                      nicht mehr geändert werden.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#14ad9f]/10 flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-[#14ad9f]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                UStVA absenden
              </h3>
              <p className="text-gray-600">
                Übermitteln Sie Ihre Umsatzsteuer-Voranmeldung
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Building2 className="h-10 w-10 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">UStVA Q{wizardData.quarter}/{wizardData.year}</p>
                    <p className="text-sm text-gray-500">{getQuarterLabel(wizardData.quarter)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Einnahmen</p>
                    <p className="text-lg font-bold text-blue-700">
                      {wizardData.selectedInvoices.size} Rechnungen
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Ausgaben</p>
                    <p className="text-lg font-bold text-purple-700">
                      {wizardData.selectedExpenses.size} Belege
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Abgabefrist</p>
                    <p className="text-sm text-amber-700">{getQuarterDueDate(wizardData.year, wizardData.quarter)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">ELSTER-Übermittlung</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Für die direkte Übermittlung an ELSTER wird ein ELSTER-Zertifikat benötigt. 
                      Alternativ können Sie die UStVA als PDF herunterladen und manuell einreichen.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Download className="h-4 w-4 mr-2" />
                Als PDF speichern
              </Button>
              <Button
                className="flex-1 bg-[#14ad9f] hover:bg-teal-700"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    UStVA erstellen
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#14ad9f]" />
            UStVA-Assistent
          </DialogTitle>
          <DialogDescription>
            Schritt {currentStep} von {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1].description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {WIZARD_STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id === currentStep
                    ? 'text-[#14ad9f]'
                    : step.id < currentStep
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id === currentStep
                      ? 'bg-[#14ad9f] text-white'
                      : step.id < currentStep
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="py-4">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Abbrechen' : 'Zurück'}
          </Button>
          
          {currentStep < WIZARD_STEPS.length && (
            <Button
              onClick={handleNext}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              Weiter
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
