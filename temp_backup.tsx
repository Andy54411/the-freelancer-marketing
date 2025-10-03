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
        console.log('Company ID mismatch:', {
          invoiceCompanyId: invoiceData.companyId,
          expectedUid: uid,
        });
        setError('Keine Berechtigung für diese Rechnung');
        return;
      }

      setInvoice(invoiceData);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(
        'Fehler beim Laden der Rechnung: ' +
          (err instanceof Error ? err.message : 'Unbekannter Fehler')
      );
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

  const handleMarkAsPaid = async () => {
    if (!invoice || invoice.status === 'paid') return;

    setUpdating(true);
    try {
      const invoiceRef = doc(db, 'companies', uid, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'paid',
        paidDate: new Date(),
        updatedAt: new Date(),
      });

      // Update local state
      setInvoice(prev => (prev ? { ...prev, status: 'paid', paidDate: new Date() } : null));

      toast.success('Rechnung als bezahlt markiert');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Fehler beim Markieren als bezahlt');
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
        {/* SevDesk-style Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={handleBackToInvoices} className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-semibold text-gray-900">
                  Rechnung Nr.{' '}
                  {invoice.invoiceNumber ||
                    invoice.number ||
                    `#${invoice.sequentialNumber || 'TEMP'}`}
                </h2>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-gray-300">
                  Neue Rechnung
                </Button>

                <Button variant="outline" className="border-gray-300">
                  Mehr
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="border-gray-300"
                >
                  {downloadingPdf ? 'Herunterladen...' : 'Herunterladen'}
                </Button>

                {invoice.status !== 'paid' && (
                  <Button
                    onClick={handleMarkAsPaid}
                    disabled={updating}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    {updating ? 'Markiere...' : 'Als bezahlt markieren'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - SevDesk Style */}
        <div className="fi-detail-grid without-feed p-6">
          {/* Invoice Details Section */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="p-6">
              <div className="space-y-4">
                {/* Tags */}
                <div className="detail">
                  <div className="left">
                    <p className="label">Tags</p>
                  </div>
                  <div className="right">
                    <div className="text-gray-500">Keine Tags</div>
                  </div>
                </div>

                {/* Invoice Date */}
                <div className="detail">
                  <div className="left">
                    <p className="label">Rechnungsdatum</p>
                  </div>
                  <div className="right">
                    <p>{new Date(invoice.createdAt || invoice.date).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>

                {/* Payment Terms */}
                {invoice.paymentTerms && (
                  <div className="detail">
                    <div className="left">
                      <p className="label">Zahlungsbedingungen</p>
                    </div>
                    <div className="right">
                      <p>{invoice.paymentTerms}</p>
                    </div>
                  </div>
                )}

                {/* DATEV Export History */}
                <div className="detail">
                  <div className="left">
                    <p className="label">DATEV Export-Historie</p>
                  </div>
                  <div className="right column">
                    <p className="sublabel">nicht exportiert</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Section */}
          <div className="pdf">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">PDF Vorschau</h3>
              <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">PDF wird geladen...</p>
                  <Button
                    onClick={handleViewPdf}
                    disabled={downloadingPdf}
                    className="mt-4 bg-[#14ad9f] hover:bg-[#129488]"
                  >
                    {downloadingPdf ? 'Laden...' : 'PDF anzeigen'}
                  </Button>
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
            invoice={invoice!}
            companyName={invoice.companyName || 'Ihr Unternehmen'}
          />
        )}
      </div>
    </div>
  );
}
