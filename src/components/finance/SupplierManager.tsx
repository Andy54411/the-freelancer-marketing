'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Search, Eye, Mail, Phone, MapPin, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AddSupplierModal } from './AddSupplierModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { EditCustomerModal } from './EditCustomerModal';

// Supplier Interface (erweitert Customer für Lieferanten)
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatId?: string;
  taxNumber?: string;
  supplierNumber: string;
  companyId: string;
  isSupplier: true; // Immer true für Lieferanten
  totalAmount: number;
  totalInvoices: number;
  createdAt: Date;
  lastModifiedBy?: string;
  updatedAt?: Date;
  contactPersons?: Array<{
    name: string;
    email?: string;
    phone?: string;
    department?: string;
  }>;
}

interface SupplierManagerProps {
  companyId: string;
}

export function SupplierManager({ companyId }: SupplierManagerProps) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextSupplierNumber, setNextSupplierNumber] = useState('LF-001');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Generate next supplier number
  const generateNextSupplierNumber = (existingSuppliers: Supplier[]) => {
    if (existingSuppliers.length === 0) {
      return 'LF-001';
    }

    const numbers = existingSuppliers
      .map(s => s.supplierNumber)
      .filter(num => num.startsWith('LF-'))
      .map(num => parseInt(num.replace('LF-', ''), 10))
      .filter(num => !isNaN(num));

    const highestNumber = Math.max(...numbers, 0);
    return `LF-${String(highestNumber + 1).padStart(3, '0')}`;
  };

  // Load suppliers from Firebase
  const loadSuppliers = async () => {
    try {
      if (!user || !companyId) return;

      const suppliersQuery = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId),
        where('isSupplier', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(suppliersQuery);
      const suppliersData: Supplier[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();

        // Robuste Datums-Konvertierung
        let createdAtDate: Date;
        try {
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt && data.createdAt.seconds) {
            createdAtDate = new Date(data.createdAt.seconds * 1000);
          } else if (data.createdAt && typeof data.createdAt === 'string') {
            createdAtDate = new Date(data.createdAt);
          } else {
            createdAtDate = new Date();
          }
        } catch (error) {
          createdAtDate = new Date();
        }

        let updatedAtDate: Date | undefined;
        try {
          if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
            updatedAtDate = data.updatedAt.toDate();
          } else if (data.updatedAt && data.updatedAt.seconds) {
            updatedAtDate = new Date(data.updatedAt.seconds * 1000);
          } else if (data.updatedAt && typeof data.updatedAt === 'string') {
            updatedAtDate = new Date(data.updatedAt);
          }
        } catch (error) {}

        suppliersData.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          street: data.street || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          vatId: data.vatId || '',
          taxNumber: data.taxNumber || '',
          supplierNumber: data.supplierNumber || data.customerNumber || '', // Fallback
          companyId: data.companyId,
          isSupplier: true,
          totalAmount: data.totalAmount || 0,
          totalInvoices: data.totalInvoices || 0,
          createdAt: createdAtDate,
          lastModifiedBy: data.lastModifiedBy,
          updatedAt: updatedAtDate,
          contactPersons: data.contactPersons || [],
        });
      });

      setSuppliers(suppliersData);
      setNextSupplierNumber(generateNextSupplierNumber(suppliersData));
    } catch (error) {
      toast.error('Fehler beim Laden der Lieferanten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [user, companyId]);

  // Event-Listener für das Öffnen des EditModals von CustomerDetailModal
  useEffect(() => {
    const handleOpenEditModal = (event: CustomEvent) => {
      const supplier = event.detail;

      if (supplier && supplier.isSupplier) {
        setEditingSupplier(supplier);
        setShowEditModal(true);
      }
    };

    // @ts-ignore
    window.addEventListener('openEditModal', handleOpenEditModal);

    return () => {
      // @ts-ignore
      window.removeEventListener('openEditModal', handleOpenEditModal);
    };
  }, []);

  // Add new supplier
  const handleAddSupplier = async (
    supplierData: Omit<Supplier, 'id' | 'createdAt' | 'totalAmount' | 'totalInvoices'>
  ) => {
    try {
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      if (user.uid !== companyId) {
        throw new Error('Keine Berechtigung für diese Firma');
      }

      const newSupplierDoc = await addDoc(collection(db, 'customers'), {
        ...supplierData,
        isSupplier: true,
        totalAmount: 0,
        totalInvoices: 0,
        createdAt: serverTimestamp(),
        lastModifiedBy: user.uid,
      });

      const newSupplier: Supplier = {
        ...supplierData,
        id: newSupplierDoc.id,
        totalAmount: 0,
        totalInvoices: 0,
        createdAt: new Date(),
      };

      setSuppliers(prev => [newSupplier, ...prev]);
      setNextSupplierNumber(generateNextSupplierNumber([newSupplier, ...suppliers]));

      toast.success('Lieferant erfolgreich hinzugefügt');
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Lieferanten');
      throw error;
    }
  };

  // View supplier details
  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  // Edit supplier
  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowEditModal(true);
  };

  // Update supplier in Firebase
  const handleUpdateSupplier = async (updatedSupplier: Supplier) => {
    try {
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      if (user.uid !== companyId) {
        throw new Error('Keine Berechtigung für diese Firma');
      }

      const cleanSupplierData = Object.entries(updatedSupplier).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && key !== 'id') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      cleanSupplierData.lastModifiedBy = user.uid;
      cleanSupplierData.updatedAt = serverTimestamp();

      const supplierRef = doc(db, 'customers', updatedSupplier.id);
      await updateDoc(supplierRef, cleanSupplierData);

      setSuppliers(prev => prev.map(s => (s.id === updatedSupplier.id ? updatedSupplier : s)));

      toast.success('Lieferant erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Lieferanten');
      throw error;
    }
  };

  // Delete supplier from Firebase
  const handleDeleteSupplier = async (supplier: Supplier) => {
    try {
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      if (user.uid !== companyId) {
        throw new Error('Keine Berechtigung für diese Firma');
      }

      // Confirm deletion
      if (!confirm(`Möchten Sie den Lieferanten "${supplier.name}" wirklich löschen?`)) {
        return;
      }

      // Try to delete the document
      const supplierRef = doc(db, 'customers', supplier.id);
      await deleteDoc(supplierRef);

      // Update local state only if deletion was successful
      setSuppliers(prev => prev.filter(s => s.id !== supplier.id));

      toast.success('Lieferant erfolgreich gelöscht');
    } catch (error) {
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          toast.error('Keine Berechtigung zum Löschen. Überprüfen Sie Ihre Firestore-Regeln.');
        } else {
          toast.error(`Fehler beim Löschen: ${error.message}`);
        }
      } else {
        toast.error('Unbekannter Fehler beim Löschen des Lieferanten');
      }
    }
  };

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(
    supplier =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date | string | undefined | null | any) => {
    if (!date) return 'Unbekannt';

    try {
      let dateObj: Date;

      // Handle verschiedene Date-Typen
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date && typeof date === 'object') {
        // Firestore Timestamp Objekt
        if (date.toDate && typeof date.toDate === 'function') {
          dateObj = date.toDate();
        } else if (date.seconds) {
          // Firestore Timestamp mit seconds
          dateObj = new Date(date.seconds * 1000);
        } else if (date._seconds) {
          // Alternative Firestore Timestamp Struktur
          dateObj = new Date(date._seconds * 1000);
        } else {
          // Fallback für unbekannte Objekte

          return 'Unbekannt';
        }
      } else {
        return 'Unbekannt';
      }

      // Überprüfe ob das Datum gültig ist
      if (!dateObj || typeof dateObj.getTime !== 'function' || isNaN(dateObj.getTime())) {
        return 'Unbekannt';
      }

      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(dateObj);
    } catch (error) {
      return 'Unbekannt';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-2"></div>
            <p className="text-gray-600">Lade Lieferanten...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lieferanten</CardTitle>
            <CardDescription>
              Verwalten Sie Ihre Lieferantendaten ({suppliers.length} Lieferanten)
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Lieferant
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Lieferanten suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Suppliers List */}
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
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
                          onClick={() => handleViewSupplier(supplier)}
                          title="Lieferant anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSupplier(supplier)}
                          title="Lieferant bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSupplier(supplier)}
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
      </CardContent>

      {/* Add Supplier Modal */}
      <AddSupplierModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddSupplier={handleAddSupplier}
        nextSupplierNumber={nextSupplierNumber}
        companyId={companyId}
      />

      {/* Supplier Detail Modal (using CustomerDetailModal) */}
      <CustomerDetailModal
        customer={selectedSupplier as any} // Type assertion for compatibility
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSupplier(null);
        }}
        onCustomerUpdated={() => {
          loadSuppliers(); // Reload suppliers after update
        }}
      />

      {/* Edit Supplier Modal (using EditCustomerModal) */}
      <EditCustomerModal
        customer={editingSupplier as any} // Type assertion for compatibility
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSupplier(null);
        }}
        onUpdateCustomer={handleUpdateSupplier as any} // Type assertion for compatibility
      />
    </Card>
  );
}
