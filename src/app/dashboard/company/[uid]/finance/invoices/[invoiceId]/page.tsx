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

  useEffect(() => {
    if (user && user.uid === uid && invoiceId) {
      loadInvoice();
    }
  }, [user, uid, invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const invoiceData = await FirestoreInvoiceService.getInvoiceById(invoiceId);

      if (!invoiceData || invoiceData.companyId !== uid) {
        setError('Rechnung nicht gefunden oder keine Berechtigung');
        return;
      }

      setInvoice(invoiceData);
    } catch (err) {
      console.error('Fehler beim Laden der Rechnung:', err);
      setError('Fehler beim Laden der Rechnung');
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
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'finalized',
        finalizedAt: new Date(),
        updatedAt: new Date(),
      });

      setInvoice(prev => (prev ? { ...prev, status: 'finalized' } : null));
      toast.success('Rechnung wurde finalisiert!');
    } catch (error) {
      console.error('Fehler beim Finalisieren:', error);
      toast.error('Fehler beim Finalisieren der Rechnung');
    } finally {
      setUpdating(false);
    }
  };

  const handleBackToInvoices = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices`);
  };

  const handleEditInvoice = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices/edit/${invoiceId}`);
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;

    setDownloadingPdf(true);
    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;

      // Create styled HTML template directly (more reliable than React rendering)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Rechnung ${invoice.invoiceNumber || invoice.number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              color: #333;
              line-height: 1.6;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #14ad9f;
              padding-bottom: 20px;
            }
            .company-info { 
              flex: 1; 
            }
            .invoice-info { 
              flex: 1; 
              text-align: right; 
            }
            .invoice-title { 
              font-size: 24px; 
              font-weight: bold; 
              color: #14ad9f; 
              margin-bottom: 10px;
            }
            .customer-section { 
              margin: 30px 0; 
              background: #f8f9fa;
              padding: 20px;
              border-left: 4px solid #14ad9f;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 30px 0; 
            }
            .items-table th, .items-table td { 
              border: 1px solid #dee2e6; 
              padding: 12px; 
              text-align: left; 
            }
            .items-table th { 
              background-color: #14ad9f; 
              color: white; 
              font-weight: bold;
            }
            .items-table .amount { 
              text-align: right; 
            }
            .totals { 
              margin-left: auto; 
              width: 300px; 
              margin-top: 20px;
            }
            .totals table { 
              width: 100%; 
              border-collapse: collapse; 
            }
            .totals td { 
              padding: 8px; 
              border-bottom: 1px solid #eee; 
            }
            .total-row { 
              font-weight: bold; 
              background-color: #f8f9fa; 
              border-top: 2px solid #14ad9f !important;
            }
            .total-row td { 
              color: #14ad9f; 
              font-size: 18px;
            }
            .notes { 
              margin-top: 30px; 
              padding: 20px; 
              background: #f8f9fa; 
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1 style="margin: 0; color: #14ad9f;">${invoice.companyName}</h1>
              <div style="margin-top: 10px;">
                ${invoice.companyAddress.replace(/\n/g, '<br>')}<br>
                ${invoice.companyEmail}<br>
                ${invoice.companyPhone}
              </div>
              ${invoice.companyVatId ? `<div style="margin-top: 10px;">USt-IdNr.: ${invoice.companyVatId}</div>` : ''}
            </div>
            <div class="invoice-info">
              <div class="invoice-title">RECHNUNG</div>
              <div style="font-size: 18px; font-weight: bold;">${invoice.invoiceNumber || invoice.number || 'R-' + invoice.id.substring(0, 8)}</div>
              <div style="margin-top: 15px;">
                <strong>Datum:</strong> ${new Date(invoice.date).toLocaleDateString('de-DE')}<br>
                <strong>Fällig:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}
              </div>
            </div>
          </div>

          <div class="customer-section">
            <strong>Rechnungsempfänger:</strong><br>
            <div style="margin-top: 10px;">
              <strong>${invoice.customerName}</strong><br>
              ${invoice.customerEmail}<br>
              ${invoice.customerAddress.replace(/\n/g, '<br>')}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Beschreibung</th>
                <th style="width: 80px; text-align: center;">Menge</th>
                <th style="width: 100px; text-align: right;">Einzelpreis</th>
                <th style="width: 100px; text-align: right;">Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              ${
                invoice.items
                  ?.map(
                    item => `
                <tr>
                  <td>${item.description}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td class="amount">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.unitPrice)}</td>
                  <td class="amount">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.total)}</td>
                </tr>
              `
                  )
                  .join('') || ''
              }
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td style="text-align: right;">Zwischensumme:</td>
                <td style="text-align: right;">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.amount)}</td>
              </tr>
              <tr>
                <td style="text-align: right;">MwSt. (${invoice.vatRate}%):</td>
                <td style="text-align: right;">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.tax)}</td>
              </tr>
              <tr class="total-row">
                <td style="text-align: right;">Gesamtbetrag:</td>
                <td style="text-align: right;">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.total)}</td>
              </tr>
            </table>
          </div>

          ${
            invoice.notes
              ? `
            <div class="notes">
              <strong>Anmerkungen:</strong><br>
              ${invoice.notes.replace(/\n/g, '<br>')}
            </div>
          `
              : ''
          }

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            Vielen Dank für Ihr Vertrauen!
          </div>
        </body>
        </html>
      `;

      // Create temporary element
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      document.body.appendChild(element);

      const options = {
        margin: 10,
        filename: `Rechnung_${invoice.invoiceNumber || invoice.number || invoice.id.substring(0, 8)}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: 'white',
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      };

      console.log('Starting PDF generation...');
      // @ts-ignore - html2pdf doesn't have TypeScript types
      await html2pdf().set(options).from(element).save();

      // Clean up
      document.body.removeChild(element);

      toast.success('PDF wurde erfolgreich heruntergeladen!');
    } catch (error) {
      console.error('Fehler beim PDF-Download:', error);
      toast.error('Fehler beim Erstellen des PDFs: ' + error.message);
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={handleBackToInvoices}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Rechnungen
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Rechnung {invoice.invoiceNumber || invoice.sequentialNumber}
            </h1>
            <div className="flex items-center gap-4">
              {getStatusBadge(invoice.status)}
              <span className="text-gray-600">
                Erstellt am {new Date(invoice.date).toLocaleDateString('de-DE')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleEditInvoice}
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
                <Button
                  onClick={handleFinalizeInvoice}
                  disabled={updating}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {updating ? 'Finalisiere...' : 'Finalisieren'}
                </Button>
              </>
            )}

            {invoice.status === 'finalized' && (
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                <Send className="h-4 w-4 mr-2" />
                Senden
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingPdf ? 'Erstelle PDF...' : 'PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Kunde</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-medium text-lg">{invoice.customerName}</div>
                <div className="text-gray-600">{invoice.customerEmail}</div>
                <div className="text-gray-600 whitespace-pre-line">{invoice.customerAddress}</div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>Rechnungspositionen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.items?.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 py-3 border-b last:border-b-0"
                  >
                    <div className="col-span-6">
                      <div className="font-medium">{item.description}</div>
                    </div>
                    <div className="col-span-2 text-center">{item.quantity}</div>
                    <div className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</div>
                    <div className="col-span-2 text-right font-medium">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Anmerkungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Summary & Dates */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Zwischensumme:</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">MwSt.:</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Gesamtbetrag:</span>
                <span className="text-[#14ad9f]">{formatCurrency(invoice.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Termine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Rechnungsdatum:</span>
                <span>{new Date(invoice.date).toLocaleDateString('de-DE')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fälligkeitsdatum:</span>
                <span
                  className={
                    new Date(invoice.dueDate) < new Date() ? 'text-red-600 font-medium' : ''
                  }
                >
                  {new Date(invoice.dueDate).toLocaleDateString('de-DE')}
                </span>
              </div>
              {invoice.status === 'draft' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Diese Rechnung ist noch ein Entwurf. Finalisieren Sie sie, um eine offizielle
                    Rechnungsnummer zu erhalten.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
