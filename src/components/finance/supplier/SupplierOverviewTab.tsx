'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Edit, Trash2, Mail, Phone, MapPin, Building } from 'lucide-react';
import { Supplier } from '../SupplierManager';

interface SupplierOverviewTabProps {
  suppliers: Supplier[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onViewSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string | undefined | null | any) => string;
}

export function SupplierOverviewTab({
  suppliers,
  searchTerm,
  onSearchChange,
  onViewSupplier,
  onEditSupplier,
  onDeleteSupplier,
  formatCurrency,
  formatDate,
}: SupplierOverviewTabProps) {
  const filteredSuppliers = suppliers.filter(
    supplier =>
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Lieferanten suchen..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Suppliers List */}
      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-center">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>Noch keine Lieferanten erfasst</p>
            <p className="text-sm">
              Klicken Sie auf &quot;Neuer Lieferant&quot; um zu beginnen
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuppliers.map(supplier => (
            <div
              key={supplier.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {supplier.supplierNumber}
                    </Badge>
                    <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{supplier.email}</span>
                    </div>

                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 md:col-span-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="break-words">
                        {supplier.street ||
                        supplier.city ||
                        supplier.postalCode ||
                        supplier.country
                          ? `${supplier.street}${supplier.street ? ', ' : ''}${supplier.postalCode}${supplier.postalCode ? ' ' : ''}${supplier.city}${supplier.city && supplier.country ? ', ' : ''}${supplier.country}`
                          : supplier.address}
                      </span>
                    </div>

                    {(supplier.taxNumber || supplier.vatId) && (
                      <div className="md:col-span-2 pt-2 border-t border-gray-100">
                        {supplier.taxNumber && (
                          <span className="text-xs text-gray-500 mr-4">
                            Steuer-Nr: {supplier.taxNumber}
                          </span>
                        )}
                        {supplier.vatId && (
                          <span className="text-xs text-gray-500">
                            USt-IdNr: {supplier.vatId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="font-semibold text-lg text-gray-900 mb-1">
                    {formatCurrency(supplier.totalAmount)}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    {supplier.totalInvoices} Rechnungen
                  </div>
                  <div className="text-xs text-gray-400">
                    Seit {formatDate(supplier.createdAt)}
                  </div>

                  <div className="flex gap-1 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewSupplier(supplier)}
                      title="Lieferant anzeigen"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditSupplier(supplier)}
                      title="Lieferant bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteSupplier(supplier)}
                      title="Lieferant löschen"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}