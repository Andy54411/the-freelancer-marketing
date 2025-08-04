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

            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              PDF
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
