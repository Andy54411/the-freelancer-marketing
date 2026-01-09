'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Calculator,
  Save,
  Send,
  FileText,
  Download,
  Mail,
  Printer,
  X,
  Calendar,
  User,
  Building,
  Phone,
  MapPin,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuoteService, Quote as QuoteType, QuoteItem } from '@/services/quoteService';
import { CustomerSelect } from '@/components/finance/CustomerSelect';
import { Customer } from '@/components/finance/AddCustomerModal';
import { CustomerService } from '@/services/customerService';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  quote?: QuoteType | null; // Für Bearbeitung
  mode: 'create' | 'edit' | 'view';
}

export function QuoteModal({ isOpen, onClose, companyId, quote, mode }: QuoteModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [_loadingCustomers, setLoadingCustomers] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    customerName: quote?.customerName || '',
    customerEmail: quote?.customerEmail || '',
    customerPhone: quote?.customerPhone || '',
    title: quote?.title || '',
    description: quote?.description || '',
    validUntil: quote?.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
    notes: quote?.notes || '',
    items: quote?.items || ([] as QuoteItem[]),
  });

  // Lade Kunden beim Öffnen der Modal
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen, companyId]);

  // Setze den ausgewählten Kunden basierend auf dem Quote
  useEffect(() => {
    if (quote && customers.length > 0) {
      const customer = customers.find(c => c.name === quote.customerName);
      if (customer) {
        setSelectedCustomer(customer);
      }
    }
  }, [quote, customers]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);

      const loadedCustomers = await CustomerService.getCustomers(companyId);
      setCustomers(loadedCustomers);
    } catch {
      toast.error('Kunden konnten nicht geladen werden');
    } finally {
      setLoadingCustomers(false);
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
    try {
      setLoading(true);

      if (!selectedCustomer && mode === 'create') {
        toast.error('Bitte wählen Sie einen Kunden aus');
        return;
      }

      if (!formData.validUntil) {
        toast.error('Bitte geben Sie ein Gültigkeitsdatum an');
        return;
      }

      if (formData.items.length === 0) {
        toast.error('Bitte fügen Sie mindestens eine Position hinzu');
        return;
      }

      const validUntilDate = new Date(formData.validUntil);

      if (mode === 'create') {
        const quoteData: Omit<QuoteType, 'id' | 'number' | 'createdAt' | 'updatedAt'> = {
          companyId,
          customerName: selectedCustomer!.name,
          customerEmail: selectedCustomer!.email,
          customerPhone: selectedCustomer!.phone,
          customerAddress:
            selectedCustomer!.street && selectedCustomer!.city
              ? {
                  street: selectedCustomer!.street,
                  city: selectedCustomer!.city,
                  postalCode: selectedCustomer!.postalCode || '',
                  country: selectedCustomer!.country || 'Deutschland',
                }
              : undefined,
          date: new Date(),
          validUntil: validUntilDate,
          status: 'draft',
          title: formData.title,
          description: formData.description,
          notes: formData.notes,
          items: formData.items,
          subtotal,
          taxAmount,
          total,
          currency: 'EUR',
          createdBy: companyId, // TODO: Echte User-ID
        };

        await QuoteService.createQuote(companyId, quoteData);
        toast.success('Angebot erfolgreich erstellt');
      } else if (mode === 'edit' && quote) {
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

        await QuoteService.updateQuote(companyId, quote.id, updates);
        toast.success('Angebot erfolgreich aktualisiert');
      }

      onClose();
    } catch {
      toast.error('Fehler beim Speichern des Angebots');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!quote) return;

    try {
      await QuoteService.sendQuote(companyId, quote.id);
      toast.success('Angebot wurde versendet');
      onClose();
    } catch {
      toast.error('Fehler beim Versenden des Angebots');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: QuoteType['status']) => {
    const statusConfig = {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Angenommen', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Abgelaufen', className: 'bg-orange-100 text-orange-800' },
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {mode === 'create' && 'Neues Angebot erstellen'}
                {mode === 'edit' && `Angebot ${quote?.number} bearbeiten`}
                {mode === 'view' && `Angebot ${quote?.number}`}
                {quote && getStatusBadge(quote.status)}
              </DialogTitle>
              <DialogDescription>
                {mode === 'create' && 'Erstellen Sie ein neues professionelles Angebot'}
                {mode === 'edit' && 'Bearbeiten Sie die Angebotsdaten'}
                {mode === 'view' && `Detailansicht für ${quote?.customerName}`}
              </DialogDescription>
            </div>

            {mode === 'view' && quote && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                {quote.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={handleSend}
                    className="bg-[#14ad9f] hover:bg-[#0f9d84]"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Versenden
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[75vh] space-y-6">
          {mode !== 'view' && (
            <>
              {/* Kundenauswahl */}
              {mode === 'create' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <User className="h-5 w-5 mr-2 text-[#14ad9f]" />
                      Kunde
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CustomerSelect
                      selectedCustomer={selectedCustomer}
                      onCustomerSelect={setSelectedCustomer}
                      companyId={companyId}
                    />
                  </CardContent>
                </Card>
              )}

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
                        onChange={e =>
                          setFormData(prev => ({ ...prev, validUntil: e.target.value }))
                        }
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Beschreibung des Angebots..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Kundendaten anzeigen (View Mode) */}
          {mode === 'view' && quote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Building className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Kundendaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{quote.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{quote.customerEmail}</span>
                </div>
                {quote.customerPhone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{quote.customerPhone}</span>
                  </div>
                )}
                {quote.customerAddress && typeof quote.customerAddress === 'object' && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>
                      {quote.customerAddress.street}, {quote.customerAddress.postalCode}{' '}
                      {quote.customerAddress.city}
                    </span>
                  </div>
                )}
                {quote.customerAddress && typeof quote.customerAddress === 'string' && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{quote.customerAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Angebots-Informationen (View Mode) */}
          {mode === 'view' && quote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Angebots-Informationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Erstellt am:</span>
                    <span>{new Date(quote.date).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Gültig bis:</span>
                    <span>{new Date(quote.validUntil).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
                {quote.title && (
                  <div>
                    <span className="text-sm text-gray-600">Titel:</span>
                    <p className="font-medium">{quote.title}</p>
                  </div>
                )}
                {quote.description && (
                  <div>
                    <span className="text-sm text-gray-600">Beschreibung:</span>
                    <p className="mt-1">{quote.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Positionen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Positionen
                </div>
                {mode !== 'view' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Position hinzufügen
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.items.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {mode === 'view'
                      ? 'Keine Positionen vorhanden'
                      : 'Fügen Sie Positionen zu Ihrem Angebot hinzu'}
                  </p>
                  {mode !== 'view' && (
                    <Button variant="outline" className="mt-4" onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Erste Position hinzufügen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-5">
                          <Label htmlFor={`desc-${index}`}>Beschreibung</Label>
                          {mode === 'view' ? (
                            <p className="mt-1">{item.description}</p>
                          ) : (
                            <Textarea
                              id={`desc-${index}`}
                              value={item.description}
                              onChange={e => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Leistungsbeschreibung..."
                              rows={2}
                            />
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor={`qty-${index}`}>Menge</Label>
                          {mode === 'view' ? (
                            <p className="mt-1">{item.quantity}</p>
                          ) : (
                            <Input
                              id={`qty-${index}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e =>
                                handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                            />
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor={`price-${index}`}>Einzelpreis</Label>
                          {mode === 'view' ? (
                            <p className="mt-1">{formatCurrency(item.unitPrice)}</p>
                          ) : (
                            <Input
                              id={`price-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e =>
                                handleItemChange(
                                  index,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <Label>Gesamt</Label>
                          <p className="mt-1 font-medium">{formatCurrency(item.total)}</p>
                        </div>

                        {mode !== 'view' && (
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
                        )}
                      </div>
                    </div>
                  ))}

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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notizen */}
          {mode !== 'view' && (
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
          )}

          {/* Notizen anzeigen (View Mode) */}
          {mode === 'view' && quote?.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Buttons */}
        {mode !== 'view' && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                loading ||
                !formData.validUntil ||
                formData.items.length === 0 ||
                (mode === 'create' && !selectedCustomer)
              }
              className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {mode === 'create' ? 'Angebot erstellen' : 'Änderungen speichern'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
