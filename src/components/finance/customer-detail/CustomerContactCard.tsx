'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Phone,
  Star,
  Edit,
  Plus,
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';

interface ContactPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
}

interface CustomerContactCardProps {
  customer: Customer;
  onEditContact?: () => void;
}

export function CustomerContactCard({ customer, onEditContact }: CustomerContactCardProps) {
  const primaryContact = customer.contactPersons?.find(cp => cp.isPrimary);
  const otherContacts = customer.contactPersons?.filter(cp => !cp.isPrimary) || [];

  const handleAddContact = () => {
    // Öffne EditCustomerModal für Ansprechpartner-Verwaltung
    window.dispatchEvent(
      new CustomEvent('openEditModal', { detail: customer })
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Ansprechpartner</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddContact}
          >
            <Plus className="h-3 w-3 mr-1" />
            Hinzufügen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {customer.contactPersons && customer.contactPersons.length > 0 ? (
          <div className="space-y-4">
            {/* Hauptansprechpartner */}
            {primaryContact && (
              <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      {primaryContact.firstName} {primaryContact.lastName}
                    </span>
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={onEditContact}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-gray-500" />
                    <span>{primaryContact.email}</span>
                  </div>
                  {primaryContact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-gray-500" />
                      <span>{primaryContact.phone}</span>
                    </div>
                  )}
                  {primaryContact.position && (
                    <div className="text-gray-600">
                      <span className="font-medium">Position:</span>{' '}
                      {primaryContact.position}
                    </div>
                  )}
                  {primaryContact.department && (
                    <div className="text-gray-600">
                      <span className="font-medium">Abteilung:</span>{' '}
                      {primaryContact.department}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Weitere Ansprechpartner */}
            {otherContacts.map(contact => (
              <div key={contact.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onEditContact}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-gray-500" />
                    <span>{contact.email}</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-gray-500" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.position && (
                    <div className="text-gray-600">
                      <span className="font-medium">Position:</span> {contact.position}
                    </div>
                  )}
                  {contact.department && (
                    <div className="text-gray-600">
                      <span className="font-medium">Abteilung:</span> {contact.department}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Keine Ansprechpartner hinterlegt</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleAddContact}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ersten Ansprechpartner hinzufügen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}