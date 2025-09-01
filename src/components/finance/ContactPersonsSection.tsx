'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Edit, Plus, Star } from 'lucide-react';
import { ContactPerson } from './AddCustomerModal';

interface ContactPersonsSectionProps {
  contactPersons?: ContactPerson[];
  onEdit?: () => void;
  onAdd?: () => void;
  readonly?: boolean;
}

export function ContactPersonsSection({
  contactPersons = [],
  onEdit,
  onAdd,
  readonly = false,
}: ContactPersonsSectionProps) {
  const primaryContact = contactPersons?.find(cp => cp.isPrimary);
  const otherContacts = contactPersons?.filter(cp => !cp.isPrimary) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Ansprechpartner</CardTitle>
          {!readonly && (
            <div className="flex gap-2">
              {contactPersons.length > 0 && onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-3 w-3 mr-1" />
                  Bearbeiten
                </Button>
              )}
              {onAdd && (
                <Button variant="outline" size="sm" onClick={onAdd}>
                  <Plus className="h-3 w-3 mr-1" />
                  Hinzufügen
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {contactPersons && contactPersons.length > 0 ? (
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
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    Hauptkontakt
                  </Badge>
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
                      <span className="font-medium">Position:</span> {primaryContact.position}
                    </div>
                  )}
                  {primaryContact.department && (
                    <div className="text-gray-600">
                      <span className="font-medium">Abteilung:</span> {primaryContact.department}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Weitere Ansprechpartner */}
            {otherContacts.length > 0 && (
              <div className="space-y-3">
                {otherContacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </span>
                      </div>
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
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Keine Ansprechpartner hinterlegt</p>
            {!readonly && onAdd && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onAdd}>
                <Plus className="h-3 w-3 mr-1" />
                Ersten Ansprechpartner hinzufügen
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
