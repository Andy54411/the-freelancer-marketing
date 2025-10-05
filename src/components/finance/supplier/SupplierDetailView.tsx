'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Plus, Edit, Trash2, Building2, Calendar } from 'lucide-react';
import { Supplier } from '../SupplierManager';

interface ContactPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
}

interface SupplierDetailViewProps {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string | undefined | null | any) => string;
}

export function SupplierDetailView({
  supplier,
  isOpen,
  onClose,
  formatCurrency,
  formatDate,
}: SupplierDetailViewProps) {
  const [contacts, setContacts] = useState<ContactPerson[]>([
    {
      id: '1',
      name: 'Andy Staudinger',
      email: 'a.staudinger32@icloud.com',
      phone: '+49123456789',
      position: 'CEO',
      department: 'Test',
    },
  ]);

  const [expenses] = useState([
    {
      id: '1',
      status: 'paid',
      amount: 24.48,
      description: 'Google AI Studio OCR: transaktionen - admin-konsole.pdf',
      number: '5078178663',
      createdAt: '01.09.2025',
      dueDate: '14.11.2024',
    },
    {
      id: '2',
      status: 'paid',
      amount: 5.52,
      description: 'Rechnung: 5078178663.pdf',
      number: '5078178663',
      createdAt: '01.09.2025',
      dueDate: '30.09.2024',
    },
    {
      id: '3',
      status: 'paid',
      amount: 27.60,
      description: 'Rechnung: 5096391117.pdf',
      number: '5096391117',
      createdAt: '01.09.2025',
      dueDate: '31.10.2024',
    },
  ]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Bezahlt</Badge>;
      default:
        return <Badge variant="secondary">Offen</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#14ad9f] text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              <p className="text-[#14ad9f]-100">Kunde {supplier.supplierNumber} - Detailansicht und Rechnungshistorie</p>
            </div>
            <Button onClick={onClose} variant="ghost" className="text-white hover:bg-[#129488]">
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Data */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Unternehmensdaten
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{supplier.email}</span>
                  </div>
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>
                      {supplier.street && `${supplier.street}, `}
                      {supplier.postalCode && `${supplier.postalCode} `}
                      {supplier.city}
                      {supplier.country && `, ${supplier.country}`}
                    </span>
                  </div>
                  {supplier.vatId && (
                    <div className="text-sm text-gray-600">
                      <strong>USt-IdNr:</strong> {supplier.vatId}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(supplier.totalAmount)}
                    </div>
                    <div className="text-sm text-gray-500">Gesamtumsatz</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {supplier.totalInvoices}
                    </div>
                    <div className="text-sm text-gray-500">Rechnungen</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Kunde seit {formatDate(supplier.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses & Invoices */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Rechnungen & Ausgaben</h2>
                <Button size="sm" className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Ausgabe
                </Button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Alle Rechnungen und Ausgaben für {supplier.name}
              </p>

              {expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>(Nicht verfügbar)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map(expense => (
                    <div
                      key={expense.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusBadge(expense.status)}
                            <span className="text-sm text-gray-500">Ausgabe</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 font-medium">
                              Beschreibung: {expense.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Erstellt: {expense.createdAt}</span>
                              <span>Fällig: {expense.dueDate}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {expense.number}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-lg text-gray-900">
                            {formatCurrency(expense.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Persons */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Ansprechpartner</h2>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufügen
                </Button>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Keine Ansprechpartner erfasst</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div
                      key={contact.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {contact.name}
                          </h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            {contact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {(contact.position || contact.department) && (
                              <div className="text-xs text-gray-500">
                                {contact.position && `Position: ${contact.position}`}
                                {contact.position && contact.department && ' • '}
                                {contact.department && `Abteilung: ${contact.department}`}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}