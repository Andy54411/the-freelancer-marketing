'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  User,
  Euro,
  Hash,
  MapPin,
  Phone,
  Mail,
  Building,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';

interface ExpenseData {
  id: string;
  documentNumber: string;
  customerName: string;
  amount: number;
  netAmount?: number;
  vatAmount?: number;
  vatRate?: number;
  date: string;
  dueDate?: string;
  category?: string;
  description?: string;
  currency?: string;
  status?: string;
  storageUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt?: any;
  updatedAt?: any;
  costCenter?: string;
  transactionId?: string;
}

export default function ReceiptDetailPage() {
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
        setError('Beleg nicht gefunden');
        return;
      }

      const expenseData = {
        id: expenseSnap.id,
        ...expenseSnap.data(),
      } as ExpenseData;

      setExpense(expenseData);

      if (expenseData.storageUrl) {
        setPdfUrl(expenseData.storageUrl);
      } else {
        console.warn('⚠️ Kein storageUrl Feld vorhanden');
      }
    } catch (err) {
      console.error('❌ Fehler beim Laden des Belegs:', err);
      setError(
        'Fehler beim Laden des Belegs: ' +
          (err instanceof Error ? err.message : 'Unbekannter Fehler')
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      toast.error('Keine PDF-URL verfügbar');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Beleg...</p>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6">
            <div className="text-red-600 flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Fehler</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">{error || 'Beleg nicht gefunden'}</p>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Beleg {expense.documentNumber}
                </h1>
                <p className="text-sm text-gray-500">{expense.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Herunterladen
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Betragsinfo */}
            <div className="infocard bg-white border border-gray-200 rounded-lg">
              <div className="top border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Betragsinformationen</h3>
                  <div className="group">
                    <Euro className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="details p-4">
                <div className="space-y-4">
                  <div className="detail flex justify-between items-start py-2 border-t border-gray-100 pt-4">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Gesamtbetrag</p>
                    </div>
                    <div className="right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </div>
                  {expense.netAmount !== undefined && (
                    <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Nettobetrag</p>
                      </div>
                      <div className="right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(expense.netAmount)}
                        </p>
                      </div>
                    </div>
                  )}
                  {expense.vatAmount !== undefined && (
                    <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">
                          MwSt. ({expense.vatRate || 0}%)
                        </p>
                      </div>
                      <div className="right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(expense.vatAmount)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Belegdetails */}
            <div className="infocard bg-white border border-gray-200 rounded-lg">
              <div className="top border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Belegdetails</h3>
                  <div className="group">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="details p-4">
                <div className="space-y-4">
                  <div className="detail flex justify-between items-start py-2 gap-4">
                    <div className="left flex-shrink-0">
                      <p className="label text-sm text-gray-600">Belegnummer</p>
                    </div>
                    <div className="right text-right">
                      <p className="text-sm font-medium text-gray-900">{expense.documentNumber}</p>
                    </div>
                  </div>
                  <div className="detail flex justify-between items-start py-2 gap-4">
                    <div className="left flex-shrink-0">
                      <p className="label text-sm text-gray-600">Belegdatum</p>
                    </div>
                    <div className="right text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(expense.date)}
                      </p>
                    </div>
                  </div>
                  {expense.dueDate && (
                    <div className="detail flex justify-between items-start py-2 gap-4">
                      <div className="left flex-shrink-0">
                        <p className="label text-sm text-gray-600">Fälligkeitsdatum</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(expense.dueDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="detail flex justify-between items-start py-2 gap-4">
                    <div className="left flex-shrink-0">
                      <p className="label text-sm text-gray-600">Kunde</p>
                    </div>
                    <div className="right text-right">
                      <p className="text-sm font-medium text-gray-900">{expense.customerName}</p>
                    </div>
                  </div>
                  {expense.category && (
                    <div className="detail flex justify-between items-start py-2 gap-4">
                      <div className="left flex-shrink-0">
                        <p className="label text-sm text-gray-600">Kategorie</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">{expense.category}</p>
                      </div>
                    </div>
                  )}
                  {expense.costCenter && (
                    <div className="detail flex justify-between items-start py-2 gap-4">
                      <div className="left flex-shrink-0">
                        <p className="label text-sm text-gray-600">Kostenstelle</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">{expense.costCenter}</p>
                      </div>
                    </div>
                  )}
                  {expense.description && (
                    <div className="detail flex justify-between items-start py-2 border-t border-gray-100 pt-4 gap-4">
                      <div className="left flex-shrink-0">
                        <p className="label text-sm text-gray-600">Beschreibung</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - PDF Preview */}
          <div className="lg:col-span-2">
            <div className="infocard bg-white border border-gray-200 rounded-lg h-full">
              <div className="top border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    Beleg-Vorschau
                  </h3>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#14ad9f] hover:text-[#129488] transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>In neuem Tab öffnen</span>
                    </a>
                  )}
                </div>
              </div>
              <div className="details p-0">
                {pdfUrl ? (
                  <div className="w-full h-[800px] bg-gray-50 rounded-b-lg overflow-hidden">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full border-0"
                      title="Beleg PDF"
                      onError={() => {
                        console.error('❌ Fehler beim Laden des PDFs');
                        toast.error('Fehler beim Laden des PDFs');
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-[800px] bg-gray-50 rounded-b-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-[#14ad9f] opacity-40" />
                      <p className="font-medium text-gray-700">Keine PDF-Vorschau verfügbar</p>
                      <p className="text-sm mt-2">Der Beleg wurde ohne Datei-Anhang gespeichert.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
