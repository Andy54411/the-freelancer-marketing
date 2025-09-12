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
import { CustomerSelect } from '@/components/finance/CustomerSelect';
import { Customer } from '@/components/finance/AddCustomerModal';

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const quoteId = typeof params?.quoteId === 'string' ? params.quoteId : '';

  const [quote, setQuote] = useState<QuoteType | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    validUntil: '',
    notes: '',
    items: [] as QuoteItem[],
  });

  useEffect(() => {
    loadQuote();
  }, [quoteId, uid]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const quoteData = await QuoteService.getQuote(uid, quoteId);
      if (!quoteData) {
        toast.error('Angebot nicht gefunden');
        router.push(`/dashboard/company/${uid}/finance/quotes`);
        return;
      }
      setQuote(quoteData);

      // Formular mit Quote-Daten füllen
      setFormData({
        title: quoteData.title || '',
        description: quoteData.description || '',
        validUntil: quoteData.validUntil
          ? new Date(quoteData.validUntil).toISOString().split('T')[0]
          : '',
        notes: quoteData.notes || '',
        items: quoteData.items || [],
      });
    } catch (error) {
      toast.error('Angebot konnte nicht geladen werden');
      router.push(`/dashboard/company/${uid}/finance/quotes`);
    } finally {
      setLoading(false);
    }
  };

  // Berechnungen
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.19; // 19% MwSt.
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handleAddItem = () => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          // Automatische Berechnung des Totals
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const handleSave = async () => {
    if (!quote) return;

    try {
      setSaving(true);

      if (!formData.validUntil) {
        toast.error('Bitte geben Sie ein Gültigkeitsdatum an');
        return;
      }

      if (formData.items.length === 0) {
        toast.error('Bitte fügen Sie mindestens eine Position hinzu');
        return;
      }

      const validUntilDate = new Date(formData.validUntil);

      const updates: Partial<QuoteType> = {
        title: formData.title,
        description: formData.description,
        notes: formData.notes,
        validUntil: validUntilDate,
        items: formData.items,
        subtotal,
        taxAmount,
        total,
      };

      await QuoteService.updateQuote(uid, quote.id, updates);
      toast.success('Angebot erfolgreich aktualisiert');
      router.push(`/dashboard/company/${uid}/finance/quotes/${quote.id}`);
    } catch (error) {
      toast.error('Fehler beim Speichern des Angebots');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  // Autorisierung prüfen (nach Hooks platzieren, um React Hooks-Regeln einzuhalten)
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

  if (!quote) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Angebot nicht gefunden</h2>
          <p className="text-gray-600">Das angeforderte Angebot existiert nicht.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/company/${uid}/finance/quotes/${quote.id}`)}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Angebot {quote.number} bearbeiten</h1>
            <p className="text-gray-600">Für {quote.customerName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hauptbereich */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grunddaten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Beschreibung des Angebots..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Positionen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Positionen
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Position hinzufügen
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.items.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Fügen Sie Positionen zu Ihrem Angebot hinzu</p>
                  <Button variant="outline" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Erste Position hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-5">
                          <Label htmlFor={`desc-${index}`}>Beschreibung</Label>
                          <Textarea
                            id={`desc-${index}`}
                            value={item.description}
                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Leistungsbeschreibung..."
                            rows={2}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor={`qty-${index}`}>Menge</Label>
                          <Input
                            id={`qty-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e =>
                              handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor={`price-${index}`}>Einzelpreis</Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e =>
                              handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label>Gesamt</Label>
                          <p className="mt-1 font-medium">{formatCurrency(item.total)}</p>
                        </div>

                        <div className="md:col-span-1">
                          <Label className="invisible">Aktionen</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 border-red-200 hover:bg-red-50 w-full"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notizen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Zusätzliche Notizen oder Bedingungen..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Zusammenfassung */}
        <div className="space-y-6">
          {/* Angebots-Zusammenfassung */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Angebots-Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Kunde</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{quote.customerName}</p>
                  <p className="text-gray-600">{quote.customerEmail}</p>
                  {quote.customerPhone && <p className="text-gray-600">{quote.customerPhone}</p>}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Positionen</h4>
                <p className="text-sm text-gray-600">{formData.items.length} Position(en)</p>
              </div>

              <Separator />

              {/* Summen */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Nettobetrag:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>MwSt. (19%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Gesamtbetrag:</span>
                  <span className="text-[#14ad9f]">{formatCurrency(total)}</span>
                </div>
              </div>

              <Separator />

              {/* Aktions-Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.validUntil || formData.items.length === 0}
                  className="w-full bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Änderungen speichern
                </Button>

                <Button
                  onClick={() =>
                    router.push(`/dashboard/company/${uid}/finance/quotes/${quote.id}`)
                  }
                  variant="outline"
                  className="w-full"
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
