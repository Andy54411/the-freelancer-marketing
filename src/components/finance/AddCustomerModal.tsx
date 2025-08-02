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
import { Plus, Loader2, Trash2, UserPlus, Star } from 'lucide-react';
import { toast } from 'sonner';

export interface ContactPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
}

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
  contactPersons: ContactPerson[];
  companyId: string;
}

interface AddCustomerModalProps {
  onAddCustomer: (
    customer: Omit<Customer, 'id' | 'totalInvoices' | 'totalAmount' | 'createdAt' | 'companyId'>
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

  const [contactPersons, setContactPersons] = useState<Omit<ContactPerson, 'id'>[]>([{
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    isPrimary: true,
  }]);

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

    // Validate contact persons
    const validContactPersons = contactPersons.filter(cp => 
      cp.firstName.trim() && cp.lastName.trim() && cp.email.trim()
    );

    if (validContactPersons.length === 0) {
      toast.error('Mindestens ein Ansprechpartner mit Name und E-Mail ist erforderlich');
      return;
    }

    // Validate contact person emails
    for (const cp of validContactPersons) {
      if (!emailRegex.test(cp.email)) {
        toast.error(`Ungültige E-Mail-Adresse für ${cp.firstName} ${cp.lastName}`);
        return;
      }
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
        contactPersons: validContactPersons.map((cp, index) => ({
          ...cp,
          id: `cp_${Date.now()}_${index}`,
          firstName: cp.firstName.trim(),
          lastName: cp.lastName.trim(),
          email: cp.email.trim(),
          phone: cp.phone?.trim() || undefined,
          position: cp.position?.trim() || undefined,
          department: cp.department?.trim() || undefined,
        })),
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

      setContactPersons([{
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        isPrimary: true,
      }]);

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

  const handleContactPersonChange = (index: number, field: keyof Omit<ContactPerson, 'id'>, value: string | boolean) => {
    setContactPersons(prev => prev.map((cp, i) => 
      i === index ? { ...cp, [field]: value } : cp
    ));
  };

  const addContactPerson = () => {
    setContactPersons(prev => [...prev, {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      isPrimary: false,
    }]);
  };

  const removeContactPerson = (index: number) => {
    if (contactPersons.length > 1) {
      setContactPersons(prev => prev.filter((_, i) => i !== index));
    }
  };

  const setPrimaryContact = (index: number) => {
    setContactPersons(prev => prev.map((cp, i) => ({
      ...cp,
      isPrimary: i === index
    })));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#14ad9f] hover:bg-[#0f9d84]">
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kunde
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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

          {/* Ansprechpartner Sektion */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Ansprechpartner *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addContactPerson}
                className="h-8"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Hinzufügen
              </Button>
            </div>

            {contactPersons.map((contact, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Ansprechpartner {index + 1}
                    {contact.isPrimary && (
                      <Star className="inline w-3 h-3 ml-1 text-yellow-500 fill-current" />
                    )}
                  </span>
                  <div className="flex gap-2">
                    {!contact.isPrimary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryContact(index)}
                        className="h-6 px-2 text-xs"
                      >
                        Als Hauptkontakt
                      </Button>
                    )}
                    {contactPersons.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContactPerson(index)}
                        className="h-6 px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`firstName-${index}`}>Vorname *</Label>
                    <Input
                      id={`firstName-${index}`}
                      value={contact.firstName}
                      onChange={e => handleContactPersonChange(index, 'firstName', e.target.value)}
                      placeholder="Max"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`lastName-${index}`}>Nachname *</Label>
                    <Input
                      id={`lastName-${index}`}
                      value={contact.lastName}
                      onChange={e => handleContactPersonChange(index, 'lastName', e.target.value)}
                      placeholder="Mustermann"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`contactEmail-${index}`}>E-Mail *</Label>
                    <Input
                      id={`contactEmail-${index}`}
                      type="email"
                      value={contact.email}
                      onChange={e => handleContactPersonChange(index, 'email', e.target.value)}
                      placeholder="max.mustermann@kunde.de"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`contactPhone-${index}`}>Telefon</Label>
                    <Input
                      id={`contactPhone-${index}`}
                      type="tel"
                      value={contact.phone}
                      onChange={e => handleContactPersonChange(index, 'phone', e.target.value)}
                      placeholder="+49 123 456789"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`position-${index}`}>Position</Label>
                    <Input
                      id={`position-${index}`}
                      value={contact.position}
                      onChange={e => handleContactPersonChange(index, 'position', e.target.value)}
                      placeholder="Geschäftsführer"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`department-${index}`}>Abteilung</Label>
                    <Input
                      id={`department-${index}`}
                      value={contact.department}
                      onChange={e => handleContactPersonChange(index, 'department', e.target.value)}
                      placeholder="Einkauf"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
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
