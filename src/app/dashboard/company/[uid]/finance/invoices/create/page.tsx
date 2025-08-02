'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Calculator, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceTemplatePicker } from '@/components/finance/InvoiceTemplatePicker';
import { InvoiceTemplate } from '@/components/finance/InvoiceTemplates';

interface Customer {
  id: string;
  name: string;
  email: string;
  address?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State for template loading and selection
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>('modern');
  const [templateLoading, setTemplateLoading] = useState(true);

  // Load user's preferred template from database
  useEffect(() => {
    const loadUserTemplate = async () => {
      if (!uid) return;

      try {
        setTemplateLoading(true);
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const preferredTemplate = userData.preferredInvoiceTemplate as InvoiceTemplate;
          if (preferredTemplate) {
            setSelectedTemplate(preferredTemplate);
          } else {
            // Fallback to localStorage if no database preference
            if (typeof window !== 'undefined') {
              const savedTemplate = localStorage.getItem(
                'selectedInvoiceTemplate'
              ) as InvoiceTemplate;
              if (savedTemplate) {
                setSelectedTemplate(savedTemplate);
              }
            }
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Template-Einstellung:', error);
        // Fallback to localStorage on error
        if (typeof window !== 'undefined') {
          const savedTemplate = localStorage.getItem('selectedInvoiceTemplate') as InvoiceTemplate;
          if (savedTemplate) {
            setSelectedTemplate(savedTemplate);
          }
        }
      } finally {
        setTemplateLoading(false);
      }
    };

    loadUserTemplate();
  }, [uid]);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: '',
    taxRate: '19', // Standard German VAT
    notes: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ]);

  // Mock customers - in real app would come from API
  const mockCustomers: Customer[] = [
    {
      id: 'cust_001',
      name: 'Mustermann GmbH',
      email: 'info@mustermann.de',
      address: 'Musterstraße 123\n12345 Berlin\nDeutschland',
    },
    {
      id: 'cust_002',
      name: 'Tech Solutions AG',
      email: 'kontakt@techsolutions.de',
      address: 'Techstraße 456\n54321 Hamburg\nDeutschland',
    },
    {
      id: 'cust_003',
      name: 'Digital Marketing GmbH',
      email: 'hello@digitalmarketing.de',
      address: 'Marketingweg 789\n98765 München\nDeutschland',
    },
  ];

  // Auto-generate invoice number
  React.useEffect(() => {
    if (!formData.invoiceNumber) {
      const currentYear = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 999) + 1;
      setFormData(prev => ({
        ...prev,
        invoiceNumber: `R-${currentYear}-${String(randomNum).padStart(3, '0')}`,
      }));
    }
  }, []);

  // Auto-set due date (14 days from issue date)
  React.useEffect(() => {
    if (formData.issueDate && !formData.dueDate) {
      const issueDate = new Date(formData.issueDate);
      const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0],
      }));
    }
  }, [formData.issueDate]);

  const handleCustomerSelect = (customerName: string) => {
    const customer = mockCustomers.find(c => c.name === customerName);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAddress: customer.address || '',
      }));
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate total if quantity or unitPrice changed
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(formData.taxRate) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.customerName ||
      !formData.invoiceNumber ||
      !formData.issueDate ||
      !formData.dueDate
    ) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    const hasValidItems = items.some(
      item => item.description && item.quantity > 0 && item.unitPrice > 0
    );
    if (!hasValidItems) {
      toast.error('Bitte fügen Sie mindestens eine gültige Position hinzu');
      return;
    }

    const { subtotal, tax, total } = calculateTotals();

    const newInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: formData.invoiceNumber,
      customerId: 'cust_new',
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerAddress: formData.customerAddress,
      amount: subtotal,
      tax,
      total,
      status: 'draft' as const,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      description: formData.description,
      template: selectedTemplate,
      items: items.filter(item => item.description && item.quantity > 0),
      notes: formData.notes,
    };

    // In real app: Save to database
    console.log('Creating invoice:', newInvoice);

    toast.success('Rechnung erfolgreich erstellt!');
    router.push(`/dashboard/company/${uid}/finance/invoices`);
  };

  const handleBackToInvoices = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices`);
  };

  const { subtotal, tax, total } = calculateTotals();

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

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Neue Rechnung erstellen</h1>
          <p className="text-gray-600">
            Erstellen Sie eine professionelle Rechnung für Ihre Kunden.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Kundendaten</CardTitle>
            <CardDescription>Informationen zum Rechnungsempfänger</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Kunde auswählen</Label>
                <Select onValueChange={handleCustomerSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bestehenden Kunden wählen oder neu eingeben" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCustomers.map(customer => (
                      <SelectItem key={customer.id} value={customer.name}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Firmenname *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Mustermann GmbH"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">E-Mail</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={e => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="info@mustermann.de"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerAddress">Rechnungsadresse</Label>
              <Textarea
                id="customerAddress"
                value={formData.customerAddress}
                onChange={e => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                placeholder="Musterstraße 123&#10;12345 Berlin&#10;Deutschland"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Rechnungsdetails</CardTitle>
            <CardDescription>Grundlegende Informationen zur Rechnung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Rechnungsnummer *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={e => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="R-2025-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issueDate">Rechnungsdatum *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={e => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Fälligkeitsdatum *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Kurzbeschreibung</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="z.B. Beratungsleistungen für Projekt XYZ"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Rechnungspositionen</CardTitle>
                <CardDescription>Fügen Sie Leistungen und Produkte hinzu</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Position hinzufügen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg"
                >
                  <div className="col-span-12 md:col-span-5">
                    <Label htmlFor={`description_${item.id}`}>Beschreibung</Label>
                    <Input
                      id={`description_${item.id}`}
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Leistungsbeschreibung"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label htmlFor={`quantity_${item.id}`}>Menge</Label>
                    <Input
                      id={`quantity_${item.id}`}
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label htmlFor={`unitPrice_${item.id}`}>Einzelpreis (€)</Label>
                    <Input
                      id={`unitPrice_${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e =>
                        updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Label>Gesamt</Label>
                    <div className="text-lg font-medium text-gray-900 mt-2">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between">
                    <span>Zwischensumme:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>MwSt.:</span>
                      <Select
                        value={formData.taxRate}
                        onValueChange={value => setFormData(prev => ({ ...prev, taxRate: value }))}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="7">7%</SelectItem>
                          <SelectItem value="19">19%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="font-medium">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Gesamtbetrag:</span>
                    <span className="text-[#14ad9f]">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Design-Template</CardTitle>
            <CardDescription>
              {templateLoading
                ? 'Template wird geladen...'
                : 'Wählen Sie das Aussehen Ihrer Rechnung'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templateLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#14ad9f]" />
                <span className="ml-2 text-gray-600">Template wird geladen...</span>
              </div>
            ) : (
              <InvoiceTemplatePicker
                selectedTemplate={selectedTemplate}
                onTemplateSelect={setSelectedTemplate}
                userId={uid}
                trigger={
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Template: {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Zusätzliche Informationen</CardTitle>
            <CardDescription>Optionale Anmerkungen für die Rechnung</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Zusätzliche Informationen oder Zahlungshinweise..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button type="button" variant="outline" onClick={handleBackToInvoices}>
            Abbrechen
          </Button>

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="outline"
              className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Als Entwurf speichern
            </Button>
            <Button type="submit" className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white">
              <FileText className="h-4 w-4 mr-2" />
              Rechnung erstellen
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
