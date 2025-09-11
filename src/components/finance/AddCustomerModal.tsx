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
import { Plus, Loader2, Trash2, UserPlus, Star, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validateVATNumber, getVATFormat } from '@/utils/vatValidation';

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
  // Legacy address für Kompatibilität
  address: string;
  // Strukturierte Adresse
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxNumber?: string;
  vatId?: string;
  vatValidated?: boolean;
  isSupplier?: boolean; // Unterscheidung zwischen Kunde und Lieferant
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
    // Legacy address für Kompatibilität
    address: '',
    // Strukturierte Adresse
    street: '',
    city: '',
    postalCode: '',
    country: 'Deutschland',
    // Unternehmenstyp für Deutschland
    businessType: 'kleinunternehmer', // 'kleinunternehmer' oder 'regelbesteuert'
    taxNumber: '',
    vatId: '',
    vatValidated: false,
  });

  const [contactPersons, setContactPersons] = useState<Omit<ContactPerson, 'id'>[]>([
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      isPrimary: true,
    },
  ]);

  // Update customer number when prop changes
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, customerNumber: nextCustomerNumber }));
  }, [nextCustomerNumber]);

  // VAT Validation
  const handleVATChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({
      ...prev,
      vatId: upperValue,
      // Leere Steuernummer wenn VAT befüllt wird
      taxNumber: upperValue ? '' : prev.taxNumber,
    }));

    if (upperValue.length > 2) {
      const validation = validateVATNumber(upperValue);
      setFormData(prev => ({ ...prev, vatValidated: validation.isValid }));
    } else {
      setFormData(prev => ({ ...prev, vatValidated: false }));
    }
  };

  // Tax Number Change Handler
  const handleTaxNumberChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      taxNumber: value,
      // Leere VAT wenn Steuernummer befüllt wird
      vatId: value ? '' : prev.vatId,
      vatValidated: false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 AddCustomerModal - Starting form submission...');
    console.log('📋 Form Data:', formData);
    console.log('👥 Contact Persons:', contactPersons);

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.street.trim() ||
      !formData.city.trim() ||
      !formData.postalCode.trim()
    ) {
      console.error('❌ Required fields missing');
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      console.error('❌ Invalid email format:', formData.email);
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    // Validate contact persons
    const validContactPersons = contactPersons.filter(
      cp => cp.firstName.trim() && cp.lastName.trim() && cp.email.trim()
    );

    console.log('👥 Valid contact persons:', validContactPersons.length);

    if (validContactPersons.length === 0) {
      console.error('❌ No valid contact persons');
      toast.error('Mindestens ein Ansprechpartner mit Name und E-Mail ist erforderlich');
      return;
    }

    // Validate contact person emails
    for (const cp of validContactPersons) {
      if (!emailRegex.test(cp.email)) {
        console.error('❌ Invalid contact person email:', cp.email);
        toast.error(`Ungültige E-Mail-Adresse für ${cp.firstName} ${cp.lastName}`);
        return;
      }
    }

    try {
      console.log('💾 Calling onAddCustomer function...');
      setLoading(true);

      const customerDataToSave = {
        customerNumber: formData.customerNumber,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        // Legacy address für Kompatibilität - kombiniert aus strukturierten Feldern
        address: `${formData.street}, ${formData.postalCode} ${formData.city}, ${formData.country}`,
        // Strukturierte Adresse
        street: formData.street.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country,
        taxNumber: formData.taxNumber.trim() || undefined,
        vatId: formData.vatId.trim() || undefined,
        vatValidated: formData.vatValidated,
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
      };

      console.log('📋 Final customer data to save:', customerDataToSave);

      await onAddCustomer(customerDataToSave);

      console.log('✅ Customer successfully added via onAddCustomer');

      // Reset form
      setFormData({
        customerNumber: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'Deutschland',
        businessType: 'kleinunternehmer',
        taxNumber: '',
        vatId: '',
        vatValidated: false,
      });

      setContactPersons([
        {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          position: '',
          department: '',
          isPrimary: true,
        },
      ]);

      setOpen(false);
      toast.success('Kunde erfolgreich hinzugefügt');
      console.log('✅ Form reset and modal closed');
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      console.error('🔍 Error details:', error instanceof Error ? error.message : String(error));
      toast.error(
        `Fehler beim Hinzufügen des Kunden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactPersonChange = (
    index: number,
    field: keyof Omit<ContactPerson, 'id'>,
    value: string | boolean
  ) => {
    setContactPersons(prev => prev.map((cp, i) => (i === index ? { ...cp, [field]: value } : cp)));
  };

  const addContactPerson = () => {
    setContactPersons(prev => [
      ...prev,
      {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        isPrimary: false,
      },
    ]);
  };

  const removeContactPerson = (index: number) => {
    if (contactPersons.length > 1) {
      setContactPersons(prev => prev.filter((_, i) => i !== index));
    }
  };

  const setPrimaryContact = (index: number) => {
    setContactPersons(prev =>
      prev.map((cp, i) => ({
        ...cp,
        isPrimary: i === index,
      }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#14ad9f] hover:bg-[#0f9d84]">
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kunde
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto w-[90vw]">
        <DialogHeader>
          <DialogTitle>Neuen Kunden hinzufügen</DialogTitle>
          <DialogDescription>
            Geben Sie die Kundendaten ein. Pflichtfelder sind mit * gekennzeichnet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Autofill-Honeypot - versteckte Felder für Browser-Autofill */}
          <div style={{ display: 'none' }}>
            <input type="text" name="username" tabIndex={-1} autoComplete="username" />
            <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
            <input type="email" name="fakeEmail" tabIndex={-1} autoComplete="email" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerNumber">Kundennummer</Label>
              <Input
                id="customerNumber"
                name="customerNumber"
                value={formData.customerNumber}
                onChange={e => handleChange('customerNumber', e.target.value)}
                placeholder="KD-001"
                disabled
                className="bg-gray-50"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="name">Firmenname *</Label>
              <Input
                id="name"
                name="company-name"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="z.B. Mustermann GmbH"
                required
                autoComplete="organization"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                name="company-email"
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="info@kunde.de"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="company-phone"
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+49 123 456789"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Strukturierte Adresse */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Adresse *</Label>

            <div>
              <Label htmlFor="street">Straße & Hausnummer *</Label>
              <Input
                id="street"
                name="street"
                value={formData.street}
                onChange={e => handleChange('street', e.target.value)}
                placeholder="Musterstraße 123"
                required
                autoComplete="street-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode">PLZ *</Label>
                <Input
                  id="postalCode"
                  name="postal-code"
                  value={formData.postalCode}
                  onChange={e => handleChange('postalCode', e.target.value)}
                  placeholder="12345"
                  required
                  autoComplete="postal-code"
                />
              </div>
              <div>
                <Label htmlFor="city">Stadt *</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={e => handleChange('city', e.target.value)}
                  placeholder="Musterstadt"
                  required
                  autoComplete="address-level2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">Land *</Label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={e => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                required
              >
                <option value="Deutschland">Deutschland</option>
                <option value="Österreich">Österreich</option>
                <option value="Schweiz">Schweiz</option>
                <option value="Niederlande">Niederlande</option>
                <option value="Belgien">Belgien</option>
                <option value="Frankreich">Frankreich</option>
                <option value="Italien">Italien</option>
                <option value="Spanien">Spanien</option>
                <option value="Polen">Polen</option>
                <option value="Tschechien">Tschechien</option>
                <option value="Andere">Andere</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Deutschland: Nur ENTWEDER Steuernummer ODER VAT */}
            {formData.country === 'Deutschland' ? (
              <>
                <div>
                  <Label htmlFor="taxNumber">Steuernummer</Label>
                  <Input
                    id="taxNumber"
                    name="tax-number"
                    value={formData.taxNumber}
                    onChange={e => handleTaxNumberChange(e.target.value)}
                    placeholder="12345/67890"
                    autoComplete="off"
                    disabled={!!formData.vatId}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.vatId
                      ? 'Deaktiviert - VAT-Nummer ist gesetzt'
                      : 'Deutsche Steuernummer (Kleinunternehmer)'}
                  </div>
                </div>
                <div>
                  <Label htmlFor="vatId">USt-IdNr.</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="vatId"
                        name="vat-id"
                        value={formData.vatId}
                        onChange={e => handleVATChange(e.target.value)}
                        placeholder="DE123456789"
                        autoComplete="off"
                        disabled={!!formData.taxNumber}
                        className={
                          formData.vatId && formData.vatValidated
                            ? 'border-green-500 pr-10'
                            : formData.vatId && !formData.vatValidated
                              ? 'border-red-500 pr-10'
                              : ''
                        }
                      />
                      {formData.vatId && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {formData.vatValidated ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formData.taxNumber
                        ? 'Deaktiviert - Steuernummer ist gesetzt'
                        : 'Deutsche USt-IdNr. (Regelbesteuert)'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Andere Länder: Hauptsächlich VAT, optional lokale Steuernummer */
              <>
                <div>
                  <Label htmlFor="vatId">USt-IdNr. / VAT-Nummer</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="vatId"
                        name="vat-id"
                        value={formData.vatId}
                        onChange={e => handleVATChange(e.target.value)}
                        placeholder={
                          formData.country === 'Österreich'
                            ? 'ATU12345678'
                            : formData.country === 'Schweiz'
                              ? 'CHE123456789'
                              : formData.country === 'Niederlande'
                                ? 'NL123456789B01'
                                : formData.country === 'USA'
                                  ? '12-3456789'
                                  : formData.country === 'Brasilien'
                                    ? '12.345.678/0001-90'
                                    : 'Länderkürzel + Nummer'
                        }
                        autoComplete="off"
                        className={
                          formData.vatId && formData.vatValidated
                            ? 'border-green-500 pr-10'
                            : formData.vatId && !formData.vatValidated
                              ? 'border-red-500 pr-10'
                              : ''
                        }
                      />
                      {formData.vatId && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {formData.vatValidated ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {formData.vatId && (
                      <div className="text-xs text-gray-500">
                        Format: {getVATFormat(formData.country)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="taxNumber">Lokale Steuernummer (optional)</Label>
                  <Input
                    id="taxNumber"
                    name="tax-number"
                    value={formData.taxNumber}
                    onChange={e => handleTaxNumberChange(e.target.value)}
                    placeholder="Lokale Steuernummer"
                    autoComplete="off"
                  />
                  <div className="text-xs text-gray-500 mt-1">Zusätzliche lokale Steuernummer</div>
                </div>
              </>
            )}
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
                      name={`contact-firstName-${index}`}
                      value={contact.firstName}
                      onChange={e => handleContactPersonChange(index, 'firstName', e.target.value)}
                      placeholder="Max"
                      className="text-sm"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`lastName-${index}`}>Nachname *</Label>
                    <Input
                      id={`lastName-${index}`}
                      name={`contact-lastName-${index}`}
                      value={contact.lastName}
                      onChange={e => handleContactPersonChange(index, 'lastName', e.target.value)}
                      placeholder="Mustermann"
                      className="text-sm"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`contactEmail-${index}`}>E-Mail *</Label>
                    <Input
                      id={`contactEmail-${index}`}
                      name={`contact-email-${index}`}
                      type="email"
                      value={contact.email}
                      onChange={e => handleContactPersonChange(index, 'email', e.target.value)}
                      placeholder="max.mustermann@kunde.de"
                      className="text-sm"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`contactPhone-${index}`}>Telefon</Label>
                    <Input
                      id={`contactPhone-${index}`}
                      name={`contact-phone-${index}`}
                      type="tel"
                      value={contact.phone}
                      onChange={e => handleContactPersonChange(index, 'phone', e.target.value)}
                      placeholder="+49 123 456789"
                      className="text-sm"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`position-${index}`}>Position</Label>
                    <Input
                      id={`position-${index}`}
                      name={`contact-position-${index}`}
                      value={contact.position}
                      onChange={e => handleContactPersonChange(index, 'position', e.target.value)}
                      placeholder="Geschäftsführer"
                      className="text-sm"
                      autoComplete="organization-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`department-${index}`}>Abteilung</Label>
                    <Input
                      id={`department-${index}`}
                      name={`contact-department-${index}`}
                      value={contact.department}
                      onChange={e => handleContactPersonChange(index, 'department', e.target.value)}
                      placeholder="Einkauf"
                      className="text-sm"
                      autoComplete="off"
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
