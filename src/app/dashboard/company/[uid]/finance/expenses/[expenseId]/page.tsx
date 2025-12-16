'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Download,
  FileText,
  Euro,
  Calendar,
  Building,
  MoreHorizontal,
  Edit,
  Trash2,
  Tag,
} from 'lucide-react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/clients';
import { ref, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

interface ExpenseData {
  id: string;
  title: string;
  amount: number;
  netAmount?: number;
  vatAmount?: number;
  vatRate?: number;
  date: string;
  dueDate?: string;
  category?: string;
  description?: string;
  vendor?: string;
  invoiceNumber?: string;
  companyName?: string;
  companyAddress?: string;
  companyVatNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  receipt?: {
    fileName: string;
    downloadURL: string;
  };
  createdAt?: any;
  updatedAt?: any;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const expenseId = typeof params?.expenseId === 'string' ? params.expenseId : '';

  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.uid === uid && expenseId) {
      loadExpense();
    }
  }, [user, uid, expenseId]);

  const loadExpense = async () => {
    try {
      setLoading(true);
      setError(null);

      const expenseRef = doc(db, 'companies', uid, 'expenses', expenseId);
      const expenseSnap = await getDoc(expenseRef);

      if (!expenseSnap.exists()) {
        setError('Ausgabe nicht gefunden');
        return;
      }

      const rawData = expenseSnap.data();
      const expenseData = {
        id: expenseSnap.id,
        ...rawData,
      } as ExpenseData;

      setExpense(expenseData);

      // Load PDF - Verwende die bestehende PDF-Proxy API
      const fileName = (rawData as any).fileName;
      const storageUrl = (rawData as any).storageUrl;
      const receiptDownloadUrl = expenseData.receipt?.downloadURL;

      let originalUrl: string | null = null;

      // 1. Versuche receipt.downloadURL (modernste Variante)
      if (receiptDownloadUrl && receiptDownloadUrl.includes('firebasestorage.googleapis.com')) {
        originalUrl = receiptDownloadUrl;
      }
      // 2. Versuche storageUrl (legacy)
      else if (storageUrl && storageUrl.includes('firebasestorage.googleapis.com')) {
        try {
          // Extract path from storage URL
          const match = storageUrl.match(/\/o\/(.+?)\?/);
          if (match && match[1]) {
            const storagePath = decodeURIComponent(match[1]);
            const storageRef = ref(storage, storagePath);
            originalUrl = await getDownloadURL(storageRef);
          } else {
            originalUrl = storageUrl;
          }
        } catch (err) {
          originalUrl = storageUrl;
        }
      }
      // 3. Versuche fileName (construct path)
      else if (fileName) {
        try {
          // Verschiedene mögliche Pfade probieren
          const possiblePaths = [
            `companies/${uid}/expenses/${fileName}`,
            `expense-receipts/${uid}/${fileName}`, // Legacy support
            `uploads/${uid}/${fileName}`,
          ];

          for (const path of possiblePaths) {
            try {
              const storageRef = ref(storage, path);
              originalUrl = await getDownloadURL(storageRef);
              break;
            } catch (pathErr) {
              // Continue to next path
            }
          }
        } catch (err) {
          // Path construction failed
        }
      }

      // Verwende die sichere Expense-PDF API
      const secureUrl = `/api/expenses/${uid}/${expenseId}/pdf`;

      // Lade die signierte URL von der API
      try {
        const pdfResponse = await fetch(secureUrl);
        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json();
          if (pdfData.success && pdfData.url) {
            setPdfUrl(pdfData.url);
          } else {
            setPdfUrl(secureUrl); // Fallback
          }
        } else {
          setPdfUrl(secureUrl); // Fallback
        }
      } catch (err) {
        setPdfUrl(secureUrl); // Fallback
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Ausgabe');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToExpenses = () => {
    router.push(`/dashboard/company/${uid}/finance/expenses`);
  };

  const handleDelete = async () => {
    if (!expense) return;

    if (!confirm('Möchten Sie diese Ausgabe wirklich löschen?')) return;

    try {
      await deleteDoc(doc(db, 'companies', uid, 'expenses', expenseId));
      toast.success('Ausgabe gelöscht');
      handleBackToExpenses();
    } catch (err: any) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleDownloadReceipt = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
      toast.success('Beleg wird heruntergeladen');
    }
  };

  // Auth check
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
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Ausgabe wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackToExpenses}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Ausgaben
        </Button>

        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error || 'Ausgabe nicht gefunden'}</p>
            <Button onClick={handleBackToExpenses} className="bg-[#14ad9f] hover:bg-taskilo-hover">
              Zurück zu Ausgaben
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={handleBackToExpenses} className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {expense.title || 'Ausgabe'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {expense.vendor && `${expense.vendor} • `}
                    {new Date(expense.date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {pdfUrl && (
                  <Button
                    onClick={handleDownloadReceipt}
                    className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Beleg herunterladen
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => toast.info('Bearbeiten wird bald hinzugefügt')}
                    >
                      <Edit className="h-4 w-4 mr-3" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-3" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Expense Details */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="border-b border-gray-100 p-4">
                <h3 className="text-lg font-semibold text-gray-900">Ausgabedetails</h3>
              </div>

              <div className="p-4 space-y-3">
                {/* Amount */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center">
                    <Euro className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Betrag</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{expense.amount.toFixed(2)} €</p>
                </div>

                {/* Category */}
                {expense.category && (
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Kategorie</p>
                    </div>
                    <Badge variant="outline">{expense.category}</Badge>
                  </div>
                )}

                {/* Date */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Datum</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(expense.date).toLocaleDateString('de-DE')}
                  </p>
                </div>

                {/* Vendor */}
                {expense.vendor && (
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Lieferant</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{expense.vendor}</p>
                  </div>
                )}

                {/* Invoice Number */}
                {expense.invoiceNumber && (
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Rechnungsnr.</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{expense.invoiceNumber}</p>
                  </div>
                )}

                {/* Description */}
                {expense.description && (
                  <div className="py-2 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-1">Beschreibung</p>
                    <p className="text-sm text-gray-900">{expense.description}</p>
                  </div>
                )}

                {/* VAT Info */}
                {expense.vatAmount !== undefined && expense.vatAmount !== null && (
                  <>
                    <div className="flex justify-between items-center py-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600">Nettobetrag</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(expense.netAmount || 0).toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <p className="text-sm text-gray-600">MwSt. ({expense.vatRate || 19}%)</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(expense.vatAmount || 0).toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Gesamtbetrag</p>
                      <p className="text-sm font-bold text-gray-900">
                        {expense.amount.toFixed(2)} €
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* PDF Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg h-[800px] overflow-hidden">
              {pdfUrl ? (
                <iframe src={pdfUrl} className="w-full h-full border-0" title="Beleg Vorschau" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Kein Beleg verfügbar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
