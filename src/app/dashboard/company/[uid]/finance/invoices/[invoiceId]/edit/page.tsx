'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, X } from 'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { toast } from 'sonner';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const invoiceId = typeof params?.invoiceId === 'string' ? params.invoiceId : '';

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    description: '',
    amount: 0,
    taxRate: 19,
    dueDate: '',
    status: 'draft' as const,
  });

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

      // Initialize form data
      setFormData({
        invoiceNumber: invoiceData.invoiceNumber || '',
        customerName: invoiceData.customer?.name || '',
        customerEmail: invoiceData.customer?.email || '',
        customerAddress: invoiceData.customer?.address || '',
        description: invoiceData.items?.[0]?.description || '',
        amount: invoiceData.items?.[0]?.amount || 0,
        taxRate: invoiceData.taxRate || 19,
        dueDate: invoiceData.dueDate || '',
        status: invoiceData.status || 'draft',
      });
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Fehler beim Laden der Rechnung');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!invoice) return;

    try {
      setSaving(true);

      // Update invoice data
      const updatedInvoice: Partial<InvoiceData> = {
        invoiceNumber: formData.invoiceNumber,
        customer: {
          name: formData.customerName,
          email: formData.customerEmail,
          address: formData.customerAddress,
        },
        items: [
          {
            description: formData.description,
            quantity: 1,
            unitPrice: formData.amount,
            amount: formData.amount,
          },
        ],
        taxRate: formData.taxRate,
        dueDate: formData.dueDate,
        status: formData.status,
        updatedAt: new Date().toISOString(),
      };

      await FirestoreInvoiceService.updateInvoice(invoiceId, updatedInvoice);

      toast.success('Rechnung erfolgreich aktualisiert');

      // Redirect back to invoice detail
      router.push(`/dashboard/company/${uid}/finance/invoices/${invoiceId}`);
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast.error('Fehler beim Speichern der Rechnung');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
            <p className="text-gray-600">Rechnung wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button onClick={handleCancel} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rechnung bearbeiten</h1>
            <p className="text-gray-600">{formData.invoiceNumber || 'Neue Rechnung'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button onClick={handleCancel} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#14ad9f] hover:bg-[#129488]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Rechnungsdetails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invoice Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Rechnungsnummer</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="RE-2024-001"
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Kundeninformationen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Kundenname</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">E-Mail</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="kunde@example.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Adresse</Label>
              <Textarea
                id="customerAddress"
                value={formData.customerAddress}
                onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
                placeholder="Musterstraße 123&#10;12345 Musterstadt"
                rows={3}
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Rechnungsposition</h3>
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beschreibung der Leistung oder des Produkts"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Betrag (€)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="taxRate">Steuersatz (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={formData.taxRate}
                  onChange={e =>
                    setFormData({ ...formData, taxRate: parseInt(e.target.value) || 19 })
                  }
                  placeholder="19"
                />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="text-right space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Nettobetrag:</span>
                <span>{formData.amount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>MwSt ({formData.taxRate}%):</span>
                <span>{((formData.amount * formData.taxRate) / 100).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900 border-t pt-2">
                <span>Gesamtbetrag:</span>
                <span>{(formData.amount * (1 + formData.taxRate / 100)).toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
