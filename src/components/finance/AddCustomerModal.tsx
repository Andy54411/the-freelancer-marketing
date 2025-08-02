'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  taxNumber?: string;
  vatId?: string;
  totalInvoices: number;
  totalAmount: number;
  createdAt: string;
}

interface AddCustomerModalProps {
  onAddCustomer: (
    customer: Omit<Customer, 'id' | 'totalInvoices' | 'totalAmount' | 'createdAt'>
  ) => Promise<void>;
  nextCustomerNumber: string;
}

export function AddCustomerModal({ onAddCustomer, nextCustomerNumber }: AddCustomerModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerNumber: nextCustomerNumber,
    name: '',
    email: '',
    phone: '',
    address: '',
    taxNumber: '',
    vatId: '',
  });

  // Update customer number when prop changes
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, customerNumber: nextCustomerNumber }));
  }, [nextCustomerNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.address.trim()) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    try {
      setLoading(true);
      await onAddCustomer({
        customerNumber: formData.customerNumber,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim(),
        taxNumber: formData.taxNumber.trim() || undefined,
        vatId: formData.vatId.trim() || undefined,
      });

      // Reset form
      setFormData({
        customerNumber: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        taxNumber: '',
        vatId: '',
      });

      setOpen(false);
      toast.success('Kunde erfolgreich hinzugefügt');
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Kunden:', error);
      toast.error('Fehler beim Hinzufügen des Kunden');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#14ad9f] hover:bg-[#0f9d84]">
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kunde
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Neuen Kunden hinzufügen</DialogTitle>
          <DialogDescription>
            Geben Sie die Kundendaten ein. Pflichtfelder sind mit * gekennzeichnet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerNumber">Kundennummer</Label>
              <Input
                id="customerNumber"
                value={formData.customerNumber}
                onChange={e => handleChange('customerNumber', e.target.value)}
                placeholder="KD-001"
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="name">Firmenname *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="z.B. Mustermann GmbH"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="info@kunde.de"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+49 123 456789"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Adresse *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="Straße Hausnummer&#10;PLZ Ort&#10;Land"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxNumber">Steuernummer</Label>
              <Input
                id="taxNumber"
                value={formData.taxNumber}
                onChange={e => handleChange('taxNumber', e.target.value)}
                placeholder="12345/67890"
              />
            </div>
            <div>
              <Label htmlFor="vatId">USt-IdNr.</Label>
              <Input
                id="vatId"
                value={formData.vatId}
                onChange={e => handleChange('vatId', e.target.value)}
                placeholder="DE123456789"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#14ad9f] hover:bg-[#0f9d84]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kunde hinzufügen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
