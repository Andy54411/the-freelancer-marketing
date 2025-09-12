'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Minus,
  Calculator,
  Save,
  Send,
  FileText,
  ArrowLeft,
  User,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuoteService, Quote as QuoteType, QuoteItem } from '@/services/quoteService';
import { getCustomers } from '@/utils/api/companyApi';

interface Customer {
  id: string;
  customerNumber?: string;
  name: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export default function CreateQuotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    title: '',
    description: '',
    validUntil: '',
    notes: '',
  });

  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: crypto.randomUUID(),
      description: 'Leistung',
      quantity: 1,
      unitPrice: 50,
      total: 50,
    },
  ]);

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      if (!uid || !user || user.uid !== uid) return;

      try {
        setLoadingCustomers(true);
        const response = await getCustomers(uid);
        if (response.success && response.customers) {
          setCustomers(response.customers);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
        toast.error('Fehler beim Laden der Kunden');
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [uid, user]);

  // Authorization check
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

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * 0.19;
  const total = subtotal + taxAmount;

  // Handlers
  const handleCustomerSelect = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerName: customer.name,
        customerEmail: customer.email || '',
        customerAddress: customer.street && customer.city 
          ? `${customer.street}\n${customer.postalCode || ''} ${customer.city}\n${customer.country || 'Deutschland'}`
          : '',
      }));
    }
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    setItems(items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async (asDraft = true) => {
    if (loading) return;

    setLoading(true);

    try {
      // Validation
      if (!formData.customerName || !formData.validUntil) {
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

      const validUntilDate = new Date(formData.validUntil);
      
      const quoteData: Omit<QuoteType, 'id' | 'number' | 'createdAt' | 'updatedAt'> = {
        companyId: uid,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: '',
        customerAddress: formData.customerAddress ? {
          street: formData.customerAddress.split('\n')[0] || '',
          city: formData.customerAddress.split('\n')[1] || '',
          postalCode: '',
          country: formData.customerAddress.split('\n')[2] || 'Deutschland',
        } : undefined,
        date: new Date(),
        validUntil: validUntilDate,
        status: asDraft ? 'draft' : 'sent',
        title: formData.title,
        description: formData.description,
        notes: formData.notes,
        items: items.filter(item => item.description && item.quantity > 0),
        subtotal,
        taxAmount,
        total,
        currency: 'EUR',
        createdBy: uid,
      };

      const quoteId = await QuoteService.createQuote(uid, quoteData);
      
      toast.success(asDraft ? 'Angebot als Entwurf gespeichert' : 'Angebot erstellt und versendet');
      router.push(`/dashboard/company/${uid}/finance/quotes`);
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Fehler beim Erstellen des Angebots');
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Neues Angebot erstellen</h1>
            <p className="text-gray-600 mt-1">Erstellen Sie ein neues Angebot für Ihre Kunden</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Kundendaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Kunde auswählen</Label>
                <Select onValueChange={handleCustomerSelect}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCustomers
                          ? 'Kunden werden geladen...'
                          : customers.length === 0
                            ? 'Keine Kunden gefunden'
                            : 'Bestehenden Kunden wählen'
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
                <Label htmlFor="customerAddress">Adresse</Label>
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

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Angebotsdaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Angebots-Titel</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Website-Entwicklung"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Gültig bis *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detaillierte Beschreibung des Angebots..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Positionen
                </span>
                <Button
                  type="button"
                  onClick={addItem}
                  size="sm"
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Position hinzufügen
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="md:col-span-5">
                      <Label>Beschreibung</Label>
                      <Input
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Leistungsbeschreibung"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Menge</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Einzelpreis</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Gesamt</Label>
                      <div className="h-10 flex items-center text-sm font-medium">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={items.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Interne Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Interne Notizen (werden nicht im Angebot angezeigt)..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Als Entwurf speichern
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Erstellen und versenden
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nettobetrag:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MwSt. (19%):</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Gesamtbetrag:</span>
                  <span className="text-[#14ad9f]">{formatCurrency(total)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Positionen:</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kunde:</span>
                  <span className="text-right">{formData.customerName || 'Nicht ausgewählt'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gültig bis:</span>
                  <span>{formData.validUntil || 'Nicht festgelegt'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
