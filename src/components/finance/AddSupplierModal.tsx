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
} from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Supplier } from './SupplierManager';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSupplier: (
    supplierData: Omit<Supplier, 'id' | 'createdAt' | 'totalAmount' | 'totalInvoices'>
  ) => Promise<void>;
  nextSupplierNumber: string;
  companyId: string;
}

export function AddSupplierModal({
  isOpen,
  onClose,
  onAddSupplier,
  nextSupplierNumber,
  companyId,
}: AddSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Deutschland',
    vatId: '',
    taxNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Firmenname ist erforderlich');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('E-Mail ist erforderlich');
      return;
    }

    setIsSubmitting(true);

    try {
      const supplierData: Omit<Supplier, 'id' | 'createdAt' | 'totalAmount' | 'totalInvoices'> = {
        supplierNumber: nextSupplierNumber,
        companyId,
        isSupplier: true,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        street: formData.street.trim() || undefined,
        city: formData.city.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        country: formData.country.trim() || undefined,
        vatId: formData.vatId.trim() || undefined,
        taxNumber: formData.taxNumber.trim() || undefined,
        address: `${formData.street}, ${formData.postalCode} ${formData.city}`, // Legacy address
        contactPersons: [],
      };

      await onAddSupplier(supplierData);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'Deutschland',
        vatId: '',
        taxNumber: '',
      });

      onClose();
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#14ad9f]" />
            Neuen Lieferanten hinzufügen
          </DialogTitle>
          <DialogDescription>
            Erfassen Sie die Grunddaten Ihres neuen Lieferanten. Die Nummer {nextSupplierNumber}{' '}
            wird automatisch vergeben.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grunddaten */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Grunddaten</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Firmenname *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="z.B. Google Cloud EMEA Limited"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  placeholder="kontakt@firma.de"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Adresse</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Straße & Hausnummer</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={e => handleInputChange('street', e.target.value)}
                  placeholder="Musterstraße 123"
                />
              </div>

              <div>
                <Label htmlFor="postalCode">PLZ</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={e => handleInputChange('postalCode', e.target.value)}
                  placeholder="12345"
                />
              </div>

              <div>
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={e => handleInputChange('city', e.target.value)}
                  placeholder="Berlin"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={e => handleInputChange('country', e.target.value)}
                  placeholder="Deutschland"
                />
              </div>
            </div>
          </div>

          {/* Steuerdaten */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Steuerdaten</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vatId">USt-IdNr.</Label>
                <Input
                  id="vatId"
                  value={formData.vatId}
                  onChange={e => handleInputChange('vatId', e.target.value)}
                  placeholder="DE123456789"
                />
              </div>

              <div>
                <Label htmlFor="taxNumber">Steuernummer</Label>
                <Input
                  id="taxNumber"
                  value={formData.taxNumber}
                  onChange={e => handleInputChange('taxNumber', e.target.value)}
                  placeholder="123/456/78901"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Lieferant hinzufügen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
