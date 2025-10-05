'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Mail, Phone, Edit, Trash2, Search, Building } from 'lucide-react';

interface ContactPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  isMainContact?: boolean;
}

interface SupplierContactsTabProps {
  companyId: string;
}

export function SupplierContactsTab({ companyId }: SupplierContactsTabProps) {
  const [contacts, setContacts] = useState<ContactPerson[]>([
    {
      id: '1',
      name: 'Andy Staudinger',
      email: 'a.staudinger32@icloud.com',
      phone: '+49123456789',
      position: 'CEO',
      department: 'Management',
      isMainContact: true,
    },
    {
      id: '2',
      name: 'Maria Schmidt',
      email: 'm.schmidt@google.com',
      phone: '+353 1 234 5678',
      position: 'Account Manager',
      department: 'Sales',
      isMainContact: false,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteContact = (contactId: string) => {
    if (confirm('Möchten Sie diesen Kontakt wirklich löschen?')) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Ansprechpartner</h3>
          <p className="text-sm text-gray-500">Verwalten Sie Kontaktpersonen bei Ihren Lieferanten</p>
        </div>
        <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Kontakt hinzufügen
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Ansprechpartner suchen..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Ansprechpartner vorhanden</h3>
          <p>Fügen Sie Ihren ersten Kontakt hinzu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                    {contact.isMainContact && (
                      <Badge className="bg-[#14ad9f] text-white text-xs">
                        Hauptkontakt
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="break-all">{contact.email}</span>
                      </div>
                    )}
                    
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    
                    {(contact.position || contact.department) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {contact.position}
                          {contact.position && contact.department && ' • '}
                          {contact.department}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteContact(contact.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-gray-900 mb-2">Kontakt-Übersicht</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-2xl font-bold text-gray-900">{contacts.length}</div>
            <div className="text-gray-500">Gesamt</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {contacts.filter(c => c.isMainContact).length}
            </div>
            <div className="text-gray-500">Hauptkontakte</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {contacts.filter(c => c.email).length}
            </div>
            <div className="text-gray-500">Mit E-Mail</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {contacts.filter(c => c.phone).length}
            </div>
            <div className="text-gray-500">Mit Telefon</div>
          </div>
        </div>
      </div>
    </div>
  );
}