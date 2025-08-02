'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceTemplatePicker } from './InvoiceTemplatePicker';
import { InvoiceTemplate } from './InvoiceTemplates';

interface InvoiceCreateModalProps {
  trigger?: React.ReactNode;
  onInvoiceCreate?: (invoice: any) => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

export function InvoiceCreateModal({ trigger, onInvoiceCreate }: InvoiceCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>('modern');
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    amount: '',
    description: '',
    dueDate: '',
    taxRate: '19', // Standard German VAT
  });

  // Mock customers - in real app would come from API
  const mockCustomers: Customer[] = [
    { id: 'cust_001', name: 'Mustermann GmbH', email: 'info@mustermann.de' },
    { id: 'cust_002', name: 'Tech Solutions AG', email: 'kontakt@techsolutions.de' },
    { id: 'cust_003', name: 'Digital Marketing GmbH', email: 'hello@digitalmarketing.de' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.amount || !formData.description || !formData.dueDate) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    const amount = parseFloat(formData.amount);
    const taxRate = parseFloat(formData.taxRate) / 100;
    const tax = amount * taxRate;
    const total = amount + tax;

    const newInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `R-${new Date().getFullYear()}-${String(Date.now()).slice(-3).padStart(3, '0')}`,
      customerId: 'cust_new',
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      amount,
      tax,
      total,
      status: 'draft' as const,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate,
      description: formData.description,
      template: selectedTemplate, // Template info hinzufügen
    };

    // Call the callback if provided
    if (onInvoiceCreate) {
      onInvoiceCreate(newInvoice);
    }

    toast.success('Rechnung erfolgreich erstellt!');
    setOpen(false);

    // Reset form
    setFormData({
      customerName: '',
      customerEmail: '',
      amount: '',
      description: '',
      dueDate: '',
      taxRate: '19',
    });
  };

  const handleCustomerSelect = (customerName: string) => {
    const customer = mockCustomers.find(c => c.name === customerName);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerName: customer.name,
        customerEmail: customer.email,
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const amount = parseFloat(formData.amount) || 0;
  const taxRate = parseFloat(formData.taxRate) / 100;
  const tax = amount * taxRate;
  const total = amount + tax;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neue Rechnung
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Neue Rechnung erstellen</DialogTitle>
          <DialogDescription>Erstellen Sie eine neue Rechnung für Ihren Kunden.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Rechnungs-Template</Label>
            <InvoiceTemplatePicker
              selectedTemplate={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
              trigger={
                <Button type="button" variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Template:{' '}
                  {selectedTemplate === 'modern'
                    ? 'Modern (Empfohlen)'
                    : selectedTemplate === 'classic'
                      ? 'Klassisch'
                      : selectedTemplate === 'minimal'
                        ? 'Minimal'
                        : selectedTemplate === 'corporate'
                          ? 'Corporate'
                          : selectedTemplate === 'creative'
                            ? 'Kreativ'
                            : selectedTemplate}
                </Button>
              }
            />
          </div>

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Kunde *</Label>
            <Select onValueChange={handleCustomerSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Kunde auswählen oder neuen eingeben" />
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

          {/* Manual Customer Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Kundenname *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Firmenname oder Name"
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
                placeholder="kunde@firma.de"
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beschreibung der Leistung..."
              rows={3}
              required
            />
          </div>

          {/* Amount and Tax */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Nettobetrag (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Steuersatz (%)</Label>
              <Select
                value={formData.taxRate}
                onValueChange={value => setFormData(prev => ({ ...prev, taxRate: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Steuerbefreit)</SelectItem>
                  <SelectItem value="7">7% (Ermäßigt)</SelectItem>
                  <SelectItem value="19">19% (Standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Fälligkeitsdatum *</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Summary */}
          {amount > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Nettobetrag:</span>
                <span>{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>MwSt ({formData.taxRate}%):</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Gesamtbetrag:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-[#14ad9f] hover:bg-[#0f9d84]">
              Rechnung erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
