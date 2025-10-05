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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Search, Eye, Mail, Phone, MapPin, Trash2, Plus, FileText, Receipt, Archive, Building, Users, History, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { AddSupplierModal } from './AddSupplierModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { EditCustomerModal } from './EditCustomerModal';
import { SupplierOverviewTab } from './supplier/SupplierOverviewTab';
import { SupplierExpensesTab } from './supplier/SupplierExpensesTab';
import { SupplierDocumentsTab } from './supplier/SupplierDocumentsTab';
import { SupplierHistoryTab } from './supplier/SupplierHistoryTab';
import { SupplierContactsTab } from './supplier/SupplierContactsTab';
import { SupplierDetailView } from './supplier/SupplierDetailView';

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
  customerNumber: string; // Für CustomerDetailModal: entspricht supplierNumber
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

// Tab definition interface
interface SupplierTab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export function SupplierManager({ companyId }: SupplierManagerProps) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextSupplierNumber, setNextSupplierNumber] = useState(''); // Will be set by NumberSequenceService
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expenseCount, setExpenseCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  // Tab definitions with counts
  const tabs: SupplierTab[] = [
    {
      id: 'overview',
      label: 'Übersicht',
      count: suppliers.length,
      icon: Building,
    },
    {
      id: 'expenses',
      label: 'Ausgaben',
      count: expenseCount,
      icon: Receipt,
    },
    {
      id: 'documents',
      label: 'Belege',
      count: documentCount,
      icon: FileText,
    },
    {
      id: 'history',
      label: 'Verlauf',
      icon: History,
    },
    {
      id: 'contacts',
      label: 'Personen',
      count: 0,
      icon: Users,
    },
  ];

  // ✅ REMOVED: generateNextSupplierNumber - use SupplierService.getNextSupplierNumber() instead  // Load expense and document counts
  const loadCounts = async () => {
    try {
      if (!companyId) return;

      // Count expenses for all suppliers
      const expensesQuery = query(
        collection(db, `companies/${companyId}/expenses`),
        where('supplierId', '!=', null)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      setExpenseCount(expensesSnapshot.size);

      // Count documents (could be extended to actual document collection)
      setDocumentCount(0); // Placeholder
    } catch (error) {
      console.error('Fehler beim Laden der Zähler:', error);
    }
  };

  // Load suppliers from Firebase
  const loadSuppliers = async () => {
    try {
      if (!user || !companyId) {
        return;
      }
      
      const suppliersQuery = query(
        collection(db, `companies/${companyId}/customers`),
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

        const supplierNumber = data.supplierNumber || data.customerNumber || '';
        
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
          supplierNumber: supplierNumber,
          customerNumber: supplierNumber, // Für CustomerDetailModal: customerNumber = supplierNumber
          companyId: data.companyId || companyId, // Fallback auf aktuelle companyId
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
      // ✅ REMOVED: generateNextSupplierNumber call - NumberSequenceService handles this
      // setNextSupplierNumber will be set by NumberSequenceService when needed
    } catch (error) {
      console.error('Fehler beim Laden der Lieferanten:', error);
      toast.error('Fehler beim Laden der Lieferanten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadCounts();
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

      const newSupplierDoc = await addDoc(collection(db, `companies/${companyId}/customers`), {
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
      // ✅ REMOVED: generateNextSupplierNumber call - NumberSequenceService handles this
      loadCounts(); // Update counts after adding

      toast.success('Lieferant erfolgreich hinzugefügt');
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Lieferanten');
      throw error;
    }
  };

  // View supplier details
  const handleViewSupplier = (supplier: Supplier) => {
    setDetailSupplier(supplier);
    setShowDetailView(true);
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

      const supplierRef = doc(db, 'companies', companyId, 'customers', updatedSupplier.id);
      await updateDoc(supplierRef, cleanSupplierData);

      setSuppliers(prev => prev.map(s => (s.id === updatedSupplier.id ? updatedSupplier : s)));
      loadCounts(); // Update counts after updating

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
      const supplierRef = doc(db, 'companies', companyId, 'customers', supplier.id);
      await deleteDoc(supplierRef);

      // Update local state only if deletion was successful
      setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
      loadCounts(); // Update counts after deletion

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
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierNumber?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lieferanten Management</CardTitle>
              <CardDescription>
                Verwalten Sie Ihre Lieferantendaten und Ausgaben ({suppliers.length} Lieferanten)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neuer Lieferant
              </Button>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Optionen
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Supplier Overview */}
      <Card>
        <CardContent className="p-6">
          <SupplierOverviewTab
            suppliers={filteredSuppliers}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onViewSupplier={handleViewSupplier}
            onEditSupplier={handleEditSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        </CardContent>
      </Card>

      {/* Supplier Detail View Modal */}
      {detailSupplier && (
        <SupplierDetailView
          supplier={detailSupplier}
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setDetailSupplier(null);
          }}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

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
    </div>
  );
}
