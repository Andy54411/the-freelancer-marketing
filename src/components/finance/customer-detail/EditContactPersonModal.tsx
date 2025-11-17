'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2, UserPlus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Customer, ContactPerson } from '@/components/finance/AddCustomerModal';

interface EditContactPersonModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditContactPersonModal({
  customer,
  isOpen,
  onClose,
  onUpdate,
}: EditContactPersonModalProps) {
  const [loading, setLoading] = useState(false);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);

  useEffect(() => {
    if (customer && isOpen) {
      setContactPersons(customer.contactPersons || []);
    }
  }, [customer, isOpen]);

  const addContactPerson = () => {
    const newContact: ContactPerson = {
      id: `contact_${Date.now()}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      isPrimary: contactPersons.length === 0,
    };
    setContactPersons([...contactPersons, newContact]);
  };

  const removeContactPerson = (index: number) => {
    const updated = contactPersons.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some(cp => cp.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setContactPersons(updated);
  };

  const setPrimaryContact = (index: number) => {
    const updated = contactPersons.map((cp, i) => ({
      ...cp,
      isPrimary: i === index,
    }));
    setContactPersons(updated);
  };

  const updateContactPerson = (index: number, field: keyof ContactPerson, value: string | boolean) => {
    const updated = [...contactPersons];
    updated[index] = { ...updated[index], [field]: value };
    setContactPersons(updated);
  };

  const handleSave = async () => {
    if (contactPersons.length === 0) {
      toast.error('Mindestens ein Ansprechpartner ist erforderlich');
      return;
    }

    const hasValidContact = contactPersons.some(
      cp => cp.firstName && cp.lastName && cp.email
    );

    if (!hasValidContact) {
      toast.error('Mindestens ein Ansprechpartner mit Name und E-Mail ist erforderlich');
      return;
    }

    try {
      setLoading(true);

      const customerRef = doc(db, 'companies', customer.companyId, 'customers', customer.id);
      await updateDoc(customerRef, {
        contactPersons: contactPersons,
      });

      toast.success('Ansprechpartner erfolgreich aktualisiert');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating contact persons:', error);
      toast.error('Fehler beim Aktualisieren der Ansprechpartner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ansprechpartner verwalten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Ansprechpartner für {customer.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Ansprechpartner</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addContactPerson}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Hinzufügen
            </Button>
          </div>

          {contactPersons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Keine Ansprechpartner vorhanden</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addContactPerson}
                className="mt-4"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Ersten Ansprechpartner hinzufügen
              </Button>
            </div>
          ) : (
            contactPersons.map((contact, index) => (
              <div key={contact.id || index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContactPerson(index)}
                      className="h-6 px-2"
                      disabled={contactPersons.length === 1}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`firstName-${index}`}>Vorname *</Label>
                    <Input
                      id={`firstName-${index}`}
                      value={contact.firstName}
                      onChange={(e) => updateContactPerson(index, 'firstName', e.target.value)}
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`lastName-${index}`}>Nachname *</Label>
                    <Input
                      id={`lastName-${index}`}
                      value={contact.lastName}
                      onChange={(e) => updateContactPerson(index, 'lastName', e.target.value)}
                      placeholder="Mustermann"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-${index}`}>E-Mail *</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContactPerson(index, 'email', e.target.value)}
                      placeholder="max@beispiel.de"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`phone-${index}`}>Telefon</Label>
                    <Input
                      id={`phone-${index}`}
                      value={contact.phone || ''}
                      onChange={(e) => updateContactPerson(index, 'phone', e.target.value)}
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`position-${index}`}>Position</Label>
                    <Input
                      id={`position-${index}`}
                      value={contact.position || ''}
                      onChange={(e) => updateContactPerson(index, 'position', e.target.value)}
                      placeholder="Geschäftsführer"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`department-${index}`}>Abteilung</Label>
                    <Input
                      id={`department-${index}`}
                      value={contact.department || ''}
                      onChange={(e) => updateContactPerson(index, 'department', e.target.value)}
                      placeholder="Vertrieb"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[#14ad9f] hover:bg-taskilo-hover">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Änderungen speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
