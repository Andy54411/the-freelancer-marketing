'use client';

import React from 'react';
import { X, Building2, Mail, Phone, MapPin, FileText, Euro, Calendar, TrendingUp } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate?: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalRevenue: number;
  invoiceCount: number;
  invoices: Invoice[];
  lastInvoiceDate?: string;
  averageInvoiceAmount?: number;
}

interface CustomerDetailModalProps {
  customer: CustomerDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerDetailModal({ customer, isOpen, onClose }: CustomerDetailModalProps) {
  if (!isOpen || !customer) return null;

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')}\u00A0€`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'paid': 'bg-green-100 text-green-800',
      'bezahlt': 'bg-green-100 text-green-800',
      'finalized': 'bg-blue-100 text-blue-800',  // Fertiggestellt aber offen (blau)
      'sent': 'bg-blue-100 text-blue-800',
      'versendet': 'bg-blue-100 text-blue-800', 
      'open': 'bg-yellow-100 text-yellow-800',
      'offen': 'bg-yellow-100 text-yellow-800',
      'overdue': 'bg-red-100 text-red-800',
      'draft': 'bg-gray-100 text-gray-800'
    };

    const statusLabels: Record<string, string> = {
      'paid': 'Bezahlt',
      'bezahlt': 'Bezahlt',
      'finalized': 'Fertiggestellt', // Erstellt aber noch offen
      'sent': 'Versendet',
      'versendet': 'Versendet',
      'open': 'Offen',
      'offen': 'Offen',
      'overdue': 'Überfällig',
      'draft': 'Entwurf'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  // Korrigiere Status-Filterung - nur 'paid' ist wirklich bezahlt
  const paidInvoices = customer.invoices.filter(inv => 
    inv.status === 'paid' || inv.status === 'bezahlt'
  );
  const openInvoices = customer.invoices.filter(inv => 
    ['sent', 'open', 'overdue', 'finalized', 'versendet', 'offen', 'draft'].includes(inv.status)
  );
  const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalOpenAmount = openInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-[#14ad9f] text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">{customer.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{customer.invoiceCount} Rechnungen</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4" />
                  <span>{formatAmount(customer.totalRevenue)} Gesamtumsatz</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>{formatAmount(customer.averageInvoiceAmount || 0)} ⌀ Rechnung</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Kontaktinformationen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Kontaktdaten */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Kontaktdaten</h3>
                <div className="space-y-2 text-sm">
                  {customer.email && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{customer.address}</span>
                    </div>
                  )}
                  {(!customer.email && !customer.phone && !customer.address) && (
                    <span className="text-gray-400 italic">Keine Kontaktdaten verfügbar</span>
                  )}
                </div>
              </div>

              {/* Bezahlte Rechnungen */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Bezahlte Rechnungen</h3>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {paidInvoices.length}
                </div>
                <div className="text-sm text-green-700">
                  {formatAmount(totalPaidAmount)}
                </div>
              </div>

              {/* Offene Rechnungen */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-3">Offene Rechnungen</h3>
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {openInvoices.length}
                </div>
                <div className="text-sm text-yellow-700">
                  {formatAmount(totalOpenAmount)}
                </div>
              </div>
            </div>

            {/* Rechnungsübersicht */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Alle Rechnungen</h3>
              
              {customer.invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rechnungsnummer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Betrag
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rechnungsdatum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fälligkeitsdatum
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customer.invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatAmount(invoice.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(invoice.issueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Keine Rechnungen gefunden</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Letzte Aktualisierung: {formatDate(customer.lastInvoiceDate || new Date().toISOString())}
              </div>
              <button
                onClick={onClose}
                className="bg-[#14ad9f] text-white px-4 py-2 rounded-lg hover:bg-[#129488] transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}