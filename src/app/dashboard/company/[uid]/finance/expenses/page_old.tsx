'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ImportXRechnungDialog } from '@/components/finance/ImportXRechnungDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  FileDown,
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseData {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  dueDate?: string; // 🎯 FÄLLIGKEITSDATUM hinzugefügt
  paymentTerms?: string; // 🎯 ZAHLUNGSBEDINGUNGEN hinzugefügt
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  vatAmount?: number;
  netAmount?: number;
  vatRate?: number;
  companyName?: string;
  companyAddress?: string;
  companyVatNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  supplierId?: string; // 🔗 Lieferanten-Verknüpfung
  receipt?: {
    fileName: string;
    downloadURL: string;
    uploadDate: string;
  };
  taxDeductible?: boolean;
  createdAt?: Date;
}

export default function ExpensesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Ausgaben von API laden
  const loadExpenses = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/expenses?companyId=${uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.expenses) {
        // Konvertiere API-Daten zu Component-Format
        const formattedExpenses: ExpenseData[] = result.expenses.map((expense: any) => ({
          id: expense.id,
          title: expense.title || expense.description || 'Ausgabe',
          amount: expense.amount || 0,
          category: expense.category || 'Sonstiges',
          date: expense.date || new Date().toISOString().split('T')[0],
          dueDate: expense.dueDate || '', // 🎯 FÄLLIGKEITSDATUM vom Backend
          paymentTerms: expense.paymentTerms || '', // 🎯 ZAHLUNGSBEDINGUNGEN vom Backend
          description: expense.description || '',
          vendor: expense.vendor || '',
          invoiceNumber: expense.invoiceNumber || '',
          vatAmount: expense.vatAmount || null,
          netAmount: expense.netAmount || null,
          vatRate: expense.vatRate || null,
          companyName: expense.companyName || '',
          companyAddress: expense.companyAddress || '',
          companyVatNumber: expense.companyVatNumber || '',
          contactEmail: expense.contactEmail || '',
          contactPhone: expense.contactPhone || '',
          supplierId: expense.supplierId || '', // 🔗 Lieferanten-Verknüpfung
          receipt: expense.receipt || null,
          taxDeductible: expense.taxDeductible || false,
          createdAt: expense.createdAt ? new Date(expense.createdAt) : new Date(),
        }));

        setExpenses(formattedExpenses);
      } else {
        toast.error('Fehler beim Laden der Ausgaben: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Ausgaben');
    } finally {
      setLoading(false);
    }
  };

  // Ausgabe löschen
  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Ausgabe löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses?id=${expenseId}&companyId=${uid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Ausgabe erfolgreich gelöscht');
        await loadExpenses();
      } else {
        toast.error('Fehler beim Löschen: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      toast.error('Fehler beim Löschen der Ausgabe');
    }
  };

  useEffect(() => {
    if (uid && user) {
      loadExpenses();
    }
  }, [uid, user]);

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
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
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <span className="ml-3 text-gray-600">Lade Ausgaben...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Navigation Buttons */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ausgaben-Übersicht</h1>
          <p className="text-gray-600 mt-1">Alle erfassten Geschäftsausgaben verwalten</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            E-Rechnung importieren
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/company/${uid}/finance/expenses/create`)}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Neue Ausgabe
          </Button>
        </div>
      </header>

      {/* Ausgaben Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Ausgaben</CardTitle>
          <CardDescription>
            {expenses.length === 0
              ? 'Noch keine Ausgaben erfasst'
              : `${expenses.length} ${expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'} erfasst`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
              </div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Noch keine Ausgaben erfasst
              </h3>
              <p className="text-gray-500 mb-6">Erfassen Sie Ihre erste Ausgabe um zu beginnen</p>
              <Button
                onClick={() => router.push(`/dashboard/company/${uid}/finance/expenses/create`)}
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Erste Ausgabe erfassen
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Beleg</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Lieferant</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map(expense => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        router.push(`/dashboard/company/${uid}/finance/expenses/${expense.id}`)
                      }
                    >
                      <TableCell>
                        {expense.receipt?.downloadURL ? (
                          <Eye className="h-4 w-4 text-[#14ad9f]" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-300" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{expense.title}</div>
                        {expense.invoiceNumber && (
                          <div className="text-xs text-gray-500">RG: {expense.invoiceNumber}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{expense.vendor || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(expense.date).toLocaleDateString('de-DE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => e.stopPropagation()}
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                router.push(
                                  `/dashboard/company/${uid}/finance/expenses/${expense.id}/edit`
                                );
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            {expense.receipt?.downloadURL && (
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  window.open(expense.receipt!.downloadURL, '_blank');
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Beleg herunterladen
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteExpense(expense.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* E-Rechnung Import Dialog */}
      <ImportXRechnungDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        companyId={uid}
        onSuccess={loadExpenses}
        defaultType="expense"
      />
    </div>
  );
}
