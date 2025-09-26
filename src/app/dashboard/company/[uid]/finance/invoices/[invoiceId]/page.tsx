'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Edit, Send, X, FileText } from 'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceTemplateRenderer } from '@/components/finance/InvoiceTemplates';
import { SendInvoiceDialog } from '@/components/finance/SendInvoiceDialog';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const invoiceId = typeof params?.invoiceId === 'string' ? params.invoiceId : '';

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  useEffect(() => {
    if (user && user.uid === uid && invoiceId) {
      loadInvoice();
    }
  }, [user, uid, invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      console.log('Loading invoice:', { uid, invoiceId });
      
      const invoiceData = await FirestoreInvoiceService.getInvoiceById(uid, invoiceId);
      console.log('Invoice data loaded:', invoiceData);

      if (!invoiceData) {
        console.log('No invoice data found');
        setError('Rechnung nicht gefunden');
        return;
      }

      if (invoiceData.companyId !== uid) {
        console.log('Company ID mismatch:', { invoiceCompanyId: invoiceData.companyId, expectedUid: uid });
        setError('Keine Berechtigung für diese Rechnung');
        return;
      }

      setInvoice(invoiceData);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Fehler beim Laden der Rechnung: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  };

  // Berechne korrekte Summen basierend auf Items
  const calculateInvoiceTotals = (invoice: InvoiceData) => {
    if (!invoice.items || invoice.items.length === 0) {
      return {
        subtotal: invoice.amount || 0,
        taxAmount: invoice.tax || 0,
        total: invoice.total || invoice.amount || 0,
      };
    }

    // Berechne Zwischensumme aus Items
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);

    // Berechne Steuer
    const vatRate = invoice.vatRate || 19;
    const taxAmount = invoice.isSmallBusiness ? 0 : (subtotal * vatRate) / 100;

    // Gesamtsumme
    const total = subtotal + taxAmount;

    return {
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total,
    };
  };

  const invoiceTotals = invoice
    ? calculateInvoiceTotals(invoice)
    : { subtotal: 0, taxAmount: 0, total: 0 };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: {
        label: 'Entwurf',
        variant: 'secondary' as const,
        color: 'bg-gray-100 text-gray-800',
      },
      finalized: {
        label: 'Rechnung',
        variant: 'default' as const,
        color: 'bg-[#14ad9f] text-white',
      },
      sent: { label: 'Gesendet', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Bezahlt', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      overdue: {
        label: 'Überfällig',
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800',
      },
      cancelled: {
        label: 'Storniert',
        variant: 'secondary' as const,
        color: 'bg-gray-100 text-gray-800',
      },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleFinalizeInvoice = async () => {
    if (!invoice || invoice.status !== 'draft') return;

    setUpdating(true);
    try {
      // Generiere Rechnungsnummer wenn noch keine vorhanden
      let invoiceNumber = invoice.invoiceNumber || invoice.number;
      let sequentialNumber = invoice.sequentialNumber;

      if (!invoiceNumber) {
        try {
          const result = await FirestoreInvoiceService.getNextInvoiceNumber(uid);
          invoiceNumber = result.formattedNumber;
          sequentialNumber = result.sequentialNumber;
        } catch (error) {
          toast.error('Fehler beim Generieren der Rechnungsnummer');
          return;
        }
      }

      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'finalized',
        invoiceNumber,
        number: invoiceNumber,
        ...(sequentialNumber && { sequentialNumber }),
        finalizedAt: new Date(),

        updatedAt: new Date(),
      });

      setInvoice(prev =>
        prev
          ? {
              ...prev,
              status: 'finalized',
              invoiceNumber,
              number: invoiceNumber,

              ...(sequentialNumber && { sequentialNumber }),
            }
          : null
      );

      toast.success(`Rechnung ${invoiceNumber} wurde finalisiert!`);
    } catch (error) {
      toast.error('Fehler beim Finalisieren der Rechnung');
    } finally {
      setUpdating(false);
    }
  };

  const handleBackToInvoices = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices`);
  };

  const handleEditInvoice = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices/${invoiceId}/edit`);
  };

  const handleViewPdf = async () => {
    if (!invoice) return;

    setDownloadingPdf(true);
    try {
      // Call our modern PDF API endpoint
      const response = await fetch('/api/generate-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceData: invoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF-Generation fehlgeschlagen');
      }

      const contentType = response.headers.get('content-type');

      // Check if we got a PDF directly (Development with Puppeteer)
      if (contentType?.includes('application/pdf')) {
        const pdfBlob = await response.blob();
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Open PDF in new tab instead of downloading
        window.open(pdfUrl, '_blank');
        
        // Clean up after a short delay
        setTimeout(() => {
          window.URL.revokeObjectURL(pdfUrl);
        }, 10000);

        return;
      }

      // Handle JSON response (contains printUrl)
      const responseData = await response.json();

      if (responseData.printUrl) {
        // Open the print URL in a new tab
        window.open(responseData.printUrl, '_blank');
        return;
      }

      // If we get here, something unexpected happened
      throw new Error('Unerwartetes Response-Format vom PDF-Service');
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Fehler beim Anzeigen der PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;

    setDownloadingPdf(true);
    try {
      // Call our modern PDF API endpoint
      const response = await fetch('/api/generate-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceData: invoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF-Generation fehlgeschlagen');
      }

      const contentType = response.headers.get('content-type');

      // Check if we got a PDF directly (Development with Puppeteer)
      if (contentType?.includes('application/pdf')) {
        const pdfBlob = await response.blob();
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Rechnung_${invoice.invoiceNumber || invoice.number || invoice.id.substring(0, 8)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up URL
        setTimeout(() => {
          window.URL.revokeObjectURL(pdfUrl);
        }, 5000);

        toast.success('PDF erfolgreich heruntergeladen!');
        return;
      }

      // Check if we got JSON response with print URL (Production fallback)
      if (contentType?.includes('application/json')) {
        const responseData = await response.json();

        if (responseData.success && responseData.printUrl && responseData.useClientPrint) {
          // Open our React-based print page in a new window
          const printWindow = window.open(responseData.printUrl, '_blank', 'width=1200,height=800');

          if (printWindow) {
            // Wait for the page to load, then trigger print
            printWindow.addEventListener('load', () => {
              setTimeout(() => {
                printWindow.focus();
                printWindow.print();
              }, 1000);
            });

            toast.success('Rechnung wird zum Drucken geöffnet...');
          } else {
            // Fallback: User can manually navigate to print page
            toast.info('Popup wurde blockiert. Navigieren Sie zur Print-Seite für PDF-Download.', {
              action: {
                label: 'Print-Seite öffnen',
                onClick: () => window.open(responseData.printUrl, '_blank'),
              },
              duration: 8000,
            });
          }
          return;
        }
      }

      // If we get here, something unexpected happened
      throw new Error('Unerwartetes Response-Format vom PDF-Service');
    } catch (error) {
      // Ultimate fallback: browser print
      toast.error('PDF-Service nicht verfügbar. Verwende Browser-Druck als Fallback.', {
        action: {
          label: 'Jetzt drucken',
          onClick: () => window.print(),
        },
        duration: 8000,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

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
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Rechnung wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackToInvoices}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Rechnungen
        </Button>

        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error || 'Rechnung nicht gefunden'}</p>
            <Button onClick={handleBackToInvoices} className="bg-[#14ad9f] hover:bg-[#129488]">
              Zurück zu Rechnungen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={handleBackToInvoices}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {invoice.status === 'draft'
                      ? 'Rechnungsentwurf'
                      : `Rechnung ${invoice.invoiceNumber || invoice.number || `#${invoice.sequentialNumber || 'TEMP'}`}`}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {invoice.customerName && `${invoice.customerName} • `}
                    {formatCurrency(invoiceTotals.total)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {getStatusBadge(invoice.status)}

                {invoice.status === 'draft' && (
                  <Button
                    onClick={handleFinalizeInvoice}
                    disabled={updating}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2"
                  >
                    {updating ? 'Finalisiere...' : 'Finalisieren'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleViewPdf}
                  disabled={downloadingPdf}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 px-4 py-2"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {downloadingPdf ? 'Laden...' : 'Anzeigen'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingPdf ? 'PDF...' : 'Download'}
                </Button>

                {invoice.status !== 'draft' && (
                  <Button
                    variant="outline"
                    onClick={() => setSendDialogOpen(true)}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50 px-4 py-2"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Senden
                  </Button>
                )}

                {invoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    onClick={handleEditInvoice}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Content - Invoice Details */}
            <div className="col-span-12 lg:col-span-8">
              {/* Invoice Header Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Rechnungsnummer
                      </h3>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {invoice.invoiceNumber ||
                          invoice.number ||
                          `#${invoice.sequentialNumber || 'TEMP'}`}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Rechnungsdatum
                      </h3>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {new Date(invoice.issueDate || invoice.date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Fälligkeitsdatum
                      </h3>
                      <p
                        className={`mt-1 text-lg font-semibold ${
                          new Date(invoice.dueDate) < new Date()
                            ? 'text-red-600'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {new Date(invoice.dueDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kunde</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Name
                      </h3>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {invoice.customerName || 'Nicht angegeben'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        E-Mail
                      </h3>
                      <p className="text-gray-900 dark:text-white">
                        {invoice.customerEmail || 'Nicht angegeben'}
                      </p>
                    </div>
                    {invoice.customerAddress && (
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Adresse
                        </h3>
                        <p className="text-gray-900 dark:text-white whitespace-pre-line">
                          {invoice.customerAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Positionen
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Beschreibung
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Menge
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Einzelpreis
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Gesamtpreis
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {invoice.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Anmerkungen
                    </h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {invoice.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="col-span-12 lg:col-span-4">
              {/* Financial Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summen</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Zwischensumme
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(invoiceTotals.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {invoice.isSmallBusiness
                          ? 'MwSt. (Kleinunternehmer)'
                          : `MwSt. (${invoice.vatRate || '19'}%)`}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.isSmallBusiness
                          ? 'keine MwSt.'
                          : formatCurrency(invoiceTotals.taxAmount)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                          Gesamtbetrag
                        </span>
                        <span className="text-xl font-bold text-[#14ad9f]">
                          {formatCurrency(invoiceTotals.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Alerts */}
              {invoice.status === 'draft' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Entwurf
                      </h3>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        Diese Rechnung ist noch ein Entwurf. Finalisieren Sie sie, um eine
                        offizielle Rechnungsnummer zu erhalten.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <X className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Überfällig
                      </h3>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        Fällig seit {new Date(invoice.dueDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aktionen</h2>
                </div>
                <div className="p-6 space-y-3">
                  <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="w-full justify-start border-gray-300 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-3" />
                    {downloadingPdf ? 'PDF wird erstellt...' : 'PDF herunterladen'}
                  </Button>

                  {invoice.status !== 'draft' && (
                    <Button
                      variant="outline"
                      onClick={() => setSendDialogOpen(true)}
                      className="w-full justify-start border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Send className="h-4 w-4 mr-3" />
                      Per E-Mail senden
                    </Button>
                  )}

                  {invoice.status === 'draft' && (
                    <Button
                      variant="outline"
                      onClick={handleEditInvoice}
                      className="w-full justify-start border-gray-300 hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4 mr-3" />
                      Bearbeiten
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Send Invoice Dialog */}
        {invoice && (
          <SendInvoiceDialog
            isOpen={sendDialogOpen}
            onClose={() => setSendDialogOpen(false)}
            invoice={invoice}
            companyName={invoice.companyName || 'Ihr Unternehmen'}
          />
        )}
      </div>
    </div>
  );
}
