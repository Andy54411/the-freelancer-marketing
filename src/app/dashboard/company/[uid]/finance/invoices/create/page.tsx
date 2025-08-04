'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
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
import { ArrowLeft, Plus, Trash2, Calculator, FileText, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceTemplatePicker } from '@/components/finance/InvoiceTemplatePicker';
import { InvoiceTemplate } from '@/components/finance/InvoiceTemplates';
import { InvoicePreview } from '@/components/finance/InvoicePreview';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface Customer {
  id: string;
  customerNumber?: string;
  name: string;
  email: string;
  phone?: string;
  // Legacy address für Kompatibilität
  address?: string;
  // Strukturierte Adresse
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxNumber?: string;
  vatId?: string;
  vatValidated?: boolean;
  totalInvoices?: number;
  totalAmount?: number;
  createdAt?: string;
  contactPersons?: any[];
  companyId?: string;
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

  // Load company settings
  const {
    settings: companySettings,
    loading: companyLoading,
    error: companyError,
  } = useCompanySettings(uid);

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

  // State für echte Kunden
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Lade echte Kunden aus Firestore
  useEffect(() => {
    const loadCustomers = async () => {
      if (!uid) return;

      try {
        setLoadingCustomers(true);
        const customersQuery = query(
          collection(db, 'customers'),
          where('companyId', '==', uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(customersQuery);
        const loadedCustomers: Customer[] = [];

        querySnapshot.forEach(doc => {
          const data = doc.data();
          loadedCustomers.push({
            id: doc.id,
            customerNumber: data.customerNumber || '',
            name: data.name || '',
            email: data.email || '',
            phone: data.phone,
            // Legacy address fallback
            address: data.address || '',
            // Strukturierte Adresse
            street: data.street || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            country: data.country || '',
            taxNumber: data.taxNumber,
            vatId: data.vatId,
            vatValidated: data.vatValidated || false,
            totalInvoices: data.totalInvoices || 0,
            totalAmount: data.totalAmount || 0,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            contactPersons: data.contactPersons || [],
            companyId: data.companyId || uid,
          });
        });

        setCustomers(loadedCustomers);
      } catch (error) {
        console.error('Fehler beim Laden der Kunden:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ]);

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
    const customer = customers.find(c => c.name === customerName);
    if (customer) {
      // Erstelle Adresse aus strukturierten Feldern oder verwende Legacy-Adresse
      const customerAddress =
        customer.street || customer.city || customer.postalCode || customer.country
          ? `${customer.street || ''}${customer.street ? '\n' : ''}${customer.postalCode || ''} ${customer.city || ''}${customer.city && customer.country ? '\n' : ''}${customer.country || ''}`
          : customer.address || '';

      setFormData(prev => ({
        ...prev,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAddress: customerAddress,
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

    // Use company settings for VAT calculation
    let tax = 0;
    let total = subtotal;

    if (companySettings?.ust !== 'kleinunternehmer') {
      const taxRate = parseFloat(companySettings?.defaultTaxRate || '19') / 100;
      tax = subtotal * taxRate;
      total = subtotal + tax;
    }

    return { subtotal, tax, total };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Funktion zum Generieren der nächsten Rechnungsnummer
  const generateNextInvoiceNumber = async () => {
    try {
      const year = new Date().getFullYear();
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('companyId', '==', uid),
        where('status', '==', 'finalized'), // Nur finalisierte Rechnungen zählen
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(invoicesQuery);
      let highestNumber = 0;

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const invoiceNumber = data.invoiceNumber || data.number;
        if (invoiceNumber && typeof invoiceNumber === 'string') {
          // Extract number from format R-YYYY-XXX
          const match = invoiceNumber.match(/R-(\d{4})-(\d+)/);
          if (match && parseInt(match[1]) === year) {
            const number = parseInt(match[2]);
            if (number > highestNumber) {
              highestNumber = number;
            }
          }
        }
      });

      const nextNumber = highestNumber + 1;
      return `R-${year}-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Fehler beim Generieren der Rechnungsnummer:', error);
      // Fallback
      const year = new Date().getFullYear();
      const randomNumber = Math.floor(Math.random() * 1000) + 1;
      return `R-${year}-${randomNumber.toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent, action: 'draft' | 'finalize') => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.customerName || !formData.issueDate || !formData.dueDate) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      // Für finalisierte Rechnungen auch Rechnungsnummer validieren
      if (action === 'finalize' && !formData.invoiceNumber) {
        toast.error('Rechnungsnummer ist für finalisierte Rechnungen erforderlich');
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

      // Bei Finalisierung automatisch Rechnungsnummer generieren, falls nicht vorhanden
      let finalInvoiceNumber = formData.invoiceNumber;
      if (action === 'finalize' && !finalInvoiceNumber) {
        finalInvoiceNumber = await generateNextInvoiceNumber();
      }

      const newInvoice = {
        number: finalInvoiceNumber || '', // Nur für finalisierte Rechnungen
        invoiceNumber: finalInvoiceNumber || '', // Nur für finalisierte Rechnungen
        date: formData.issueDate,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        description: formData.description,

        // Company information from settings
        companyId: uid,
        companyName: companySettings?.companyName || '',
        companyAddress: companySettings?.companyAddress || '',
        companyEmail: companySettings?.companyEmail || '',
        companyPhone: companySettings?.companyPhone || '',
        companyWebsite: companySettings?.companyWebsite || '',
        companyLogo: companySettings?.companyLogo || '',
        companyVatId: companySettings?.vatId || '',
        companyTaxNumber: companySettings?.taxNumber || '',
        companyRegister: companySettings?.companyRegister || '',
        districtCourt: companySettings?.districtCourt || '',
        legalForm: companySettings?.legalForm || '',
        companyTax: companySettings?.taxNumber || '',

        // Tax settings
        isSmallBusiness: companySettings?.ust === 'kleinunternehmer',
        vatRate: parseFloat(companySettings?.defaultTaxRate || '19'),
        priceInput: companySettings?.priceInput || 'netto',

        // Financial data
        items: items.filter(item => item.description && item.quantity > 0),
        amount: subtotal,
        tax,
        total,
        status: action === 'finalize' ? 'finalized' : 'draft',
        template: selectedTemplate,
        notes: formData.notes,

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Nur bei finalisierten Rechnungen das Finalisierungsdatum setzen
        ...(action === 'finalize' && { finalizedAt: serverTimestamp() }),
      };

      // Save invoice to Firestore
      console.log('Saving invoice to Firestore:', newInvoice);

      const docRef = await addDoc(collection(db, 'invoices'), newInvoice);

      console.log('Invoice saved with ID:', docRef.id);

      if (action === 'finalize') {
        toast.success(`Rechnung ${finalInvoiceNumber} erfolgreich erstellt!`);
      } else {
        toast.success('Entwurf erfolgreich gespeichert!');
      }

      router.push(`/dashboard/company/${uid}/finance/invoices`);
    } catch (error) {
      console.error('Fehler beim Speichern der Rechnung:', error);
      toast.error('Fehler beim Speichern der Rechnung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToInvoices = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices`);
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={e => e.preventDefault()} className="space-y-8">
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
                        <SelectValue
                          placeholder={
                            loadingCustomers
                              ? 'Kunden werden geladen...'
                              : customers.length === 0
                                ? 'Keine Kunden gefunden - erstellen Sie zuerst einen Kunden'
                                : 'Bestehenden Kunden wählen oder neu eingeben'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <span className="text-xs text-gray-500">
                                {customer.customerNumber}
                              </span>
                            </div>
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
                      onChange={e =>
                        setFormData(prev => ({ ...prev, customerName: e.target.value }))
                      }
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
                      onChange={e =>
                        setFormData(prev => ({ ...prev, customerEmail: e.target.value }))
                      }
                      placeholder="info@mustermann.de"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Rechnungsadresse</Label>
                  <Textarea
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, customerAddress: e.target.value }))
                    }
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
                    <Label htmlFor="invoiceNumber">
                      Rechnungsnummer
                      <span className="text-sm text-gray-500 ml-2">
                        (wird automatisch generiert beim Erstellen)
                      </span>
                    </Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))
                      }
                      placeholder="R-2025-001 (optional für Entwürfe)"
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
                          onChange={e =>
                            updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)
                          }
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
                            onValueChange={value =>
                              setFormData(prev => ({ ...prev, taxRate: value }))
                            }
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
                        Template:{' '}
                        {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
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
                {/* PDF Preview Button */}
                <InvoicePreview
                  invoiceData={{
                    invoiceNumber: formData.invoiceNumber,
                    issueDate: formData.issueDate,
                    dueDate: formData.dueDate,
                    customerName: formData.customerName,
                    customerAddress: formData.customerAddress,
                    customerEmail: formData.customerEmail,
                    description: formData.description,
                    items: items,
                    amount: subtotal,
                    tax: tax,
                    total: total,
                  }}
                  template={selectedTemplate}
                  companySettings={companySettings || undefined}
                  trigger={
                    <Button
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      PDF-Vorschau
                    </Button>
                  }
                />

                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={e => handleSubmit(e, 'draft')}
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Als Entwurf speichern
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={e => handleSubmit(e, 'finalize')}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Rechnung erstellen
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live PDF-Vorschau
                </CardTitle>
                <CardDescription>Echtzeit-Vorschau Ihrer Rechnung</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Quick Preview */}
                  <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <div className="h-96 overflow-hidden relative">
                      <div className="transform scale-[0.15] origin-top-left w-[1000px] h-[1200px] pointer-events-none">
                        <div className="bg-white p-8">
                          {/* Mini Preview Content */}
                          <div className="border-b-2 border-gray-800 pb-4 mb-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                                  {companySettings?.companyName || 'Ihr Unternehmen'}
                                </h1>
                                <div className="text-gray-600 text-xs">
                                  {companySettings?.companyAddress || 'Ihre Firmenadresse'}
                                </div>
                              </div>
                              <div className="text-right">
                                <h2 className="text-xl font-bold text-gray-800 mb-1">RECHNUNG</h2>
                                <div className="text-xs text-gray-600">
                                  <div>Nr.: {formData.invoiceNumber || 'R-2025-000'}</div>
                                  <div>Datum: {formData.issueDate || 'TT.MM.JJJJ'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mb-4">
                            <h3 className="font-semibold text-gray-800 mb-1">
                              Rechnungsempfänger:
                            </h3>
                            <div className="text-gray-700 text-xs">
                              {formData.customerName || 'Kunden auswählen...'}
                            </div>
                          </div>
                          <div className="border rounded p-2 mb-4">
                            <div className="text-xs text-gray-600">
                              {items.length} Position(en) • Gesamt: {formatCurrency(total)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Full Preview Button */}
                  <InvoicePreview
                    invoiceData={{
                      invoiceNumber: formData.invoiceNumber,
                      issueDate: formData.issueDate,
                      dueDate: formData.dueDate,
                      customerName: formData.customerName,
                      customerAddress: formData.customerAddress,
                      customerEmail: formData.customerEmail,
                      description: formData.description,
                      items: items,
                      amount: subtotal,
                      tax: tax,
                      total: total,
                    }}
                    template={selectedTemplate}
                    companySettings={companySettings || undefined}
                    trigger={
                      <Button
                        variant="outline"
                        className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vollständige PDF-Vorschau
                      </Button>
                    }
                  />

                  {/* Quick Stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Positionen:</span>
                      <span className="font-medium">{items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zwischensumme:</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">MwSt. ({formData.taxRate}%):</span>
                      <span className="font-medium">{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Gesamtbetrag:</span>
                      <span className="font-bold text-[#14ad9f]">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
