'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
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
import { Edit, Search, Eye, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { AddCustomerModal, Customer } from './AddCustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { EditCustomerModal } from './EditCustomerModal';
import { calculateCustomerStats, updateCustomerStats } from '@/utils/customerStatsUtils';

interface CustomerManagerProps {
  companyId: string;
}

export function CustomerManager({ companyId }: CustomerManagerProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextCustomerNumber, setNextCustomerNumber] = useState('KD-001');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerStats, setCustomerStats] = useState<{
    [customerId: string]: { totalAmount: number; totalInvoices: number };
  }>({});

  // Generate next customer number
  const generateNextCustomerNumber = (existingCustomers: Customer[]) => {
    if (existingCustomers.length === 0) {
      return 'KD-001';
    }

    const numbers = existingCustomers
      .map(c => c.customerNumber)
      .filter(num => num.startsWith('KD-'))
      .map(num => parseInt(num.replace('KD-', ''), 10))
      .filter(num => !isNaN(num));

    const highestNumber = Math.max(...numbers, 0);
    return `KD-${String(highestNumber + 1).padStart(3, '0')}`;
  };

  // Lade Kundenstatistiken im Hintergrund (ohne DB-Update)
  const loadCustomerStatsInBackground = async (customerList: Customer[]) => {
    try {

      const stats: { [customerId: string]: { totalAmount: number; totalInvoices: number } } = {};

      for (const customer of customerList) {
        try {
          const customerStats = await calculateCustomerStats(companyId, customer.name);
          stats[customer.id] = customerStats;

          // SOFORTIGE UPDATE in der Datenbank für künftige Ladevorgänge
          if (
            user?.uid &&
            (customerStats.totalAmount !== customer.totalAmount ||
              customerStats.totalInvoices !== customer.totalInvoices)
          ) {
            try {
              await updateCustomerStats(customer.id, customerStats, user.uid);

            } catch (error) {

            }
          }
        } catch (error) {

          stats[customer.id] = { totalAmount: 0, totalInvoices: 0 };
        }
      }

      setCustomerStats(stats);
    } catch (error) {

    }
  };

  // Aktualisiere Kundenstatistiken im Hintergrund
  const updateCustomerStatsInBackground = async (customerList: Customer[]) => {
    if (!user?.uid) {

      return;
    }

    try {

      for (const customer of customerList) {
        try {
          const stats = await calculateCustomerStats(companyId, customer.name);

          // Nur aktualisieren, wenn sich die Werte geändert haben
          if (
            stats.totalAmount !== customer.totalAmount ||
            stats.totalInvoices !== customer.totalInvoices
          ) {
            await updateCustomerStats(customer.id, stats, user.uid);

            // Aktualisiere lokalen State
            setCustomers(prev =>
              prev.map(c =>
                c.id === customer.id
                  ? { ...c, totalAmount: stats.totalAmount, totalInvoices: stats.totalInvoices }
                  : c
              )
            );
          }
        } catch (error) {

        }
      }
    } catch (error) {

    }
  };

  // Load customers from Firestore
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customersQuery = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(customersQuery);
      const loadedCustomers: Customer[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        loadedCustomers.push({
          id: doc.id,
          customerNumber: data.customerNumber || 'KD-000',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone,
          // Legacy address fallback für alte Kunden
          address: data.address || '',
          // Neue strukturierte Adresse
          street: data.street || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          taxNumber: data.taxNumber,
          vatId: data.vatId,
          vatValidated: data.vatValidated || false,
          totalInvoices: data.totalInvoices || 0,
          totalAmount: data.totalAmount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          contactPersons: data.contactPersons || [],
          companyId: data.companyId || companyId,
        });
      });

      setCustomers(loadedCustomers);
      setNextCustomerNumber(generateNextCustomerNumber(loadedCustomers));

      // Lade die korrekten Statistiken für jeden Kunden
      loadCustomerStatsInBackground(loadedCustomers);
    } catch (error) {

      toast.error('Fehler beim Laden der Kundendaten');
    } finally {
      setLoading(false);
    }
  };

  // Add new customer
  const handleAddCustomer = async (
    customerData: Omit<Customer, 'id' | 'totalInvoices' | 'totalAmount' | 'createdAt' | 'companyId'>
  ) => {
    try {

      if (!user) {

        throw new Error('Benutzer nicht authentifiziert');
      }

      // Verify user has permission to add customers to this company
      if (user.uid !== companyId) {

        throw new Error('Keine Berechtigung für diese Firma');
      }

      // Filter undefined values for Firebase compatibility
      const cleanCustomerData = Object.entries(customerData).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Clean contact persons - remove undefined fields
      if (cleanCustomerData.contactPersons) {
        cleanCustomerData.contactPersons = cleanCustomerData.contactPersons.map((cp: any) => {
          return Object.entries(cp).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key] = value;
            }
            return acc;
          }, {} as any);
        });
      }

      const newCustomer = {
        ...cleanCustomerData,
        companyId,
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        lastModifiedBy: user.uid,
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'customers'), newCustomer);

      const addedCustomer: Customer = {
        ...customerData,
        id: docRef.id,
        companyId,
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };

      setCustomers(prev => [addedCustomer, ...prev]);
      setNextCustomerNumber(generateNextCustomerNumber([addedCustomer, ...customers]));

      toast.success(`Kunde ${customerData.name} erfolgreich hinzugefügt`);
    } catch (error) {

      // More detailed error logging
      if (error instanceof Error) {

      }

      throw error;
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  // Update customer in Firebase
  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {

      if (!user) {

        throw new Error('Benutzer nicht authentifiziert');
      }

      // Verify user has permission to update customers for this company
      if (user.uid !== companyId) {

        throw new Error('Keine Berechtigung für diese Firma');
      }

      // Filter undefined values for Firebase compatibility
      const cleanCustomerData = Object.entries(updatedCustomer).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && key !== 'id') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Clean contact persons - remove undefined fields
      if (cleanCustomerData.contactPersons) {
        cleanCustomerData.contactPersons = cleanCustomerData.contactPersons.map((cp: any) => {
          return Object.entries(cp).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key] = value;
            }
            return acc;
          }, {} as any);
        });
      }

      // Add update metadata
      cleanCustomerData.lastModifiedBy = user.uid;
      cleanCustomerData.updatedAt = serverTimestamp();

      const customerRef = doc(db, 'customers', updatedCustomer.id);
      await updateDoc(customerRef, cleanCustomerData);

      // Update local state
      setCustomers(prev => prev.map(c => (c.id === updatedCustomer.id ? updatedCustomer : c)));

    } catch (error) {

      // More detailed error logging
      if (error instanceof Error) {

      }

      throw error;
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    if (companyId) {
      loadCustomers();
    }
  }, [companyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <span className="ml-2 text-gray-600">Lade Kundendaten...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Kunden</CardTitle>
            <CardDescription>
              Verwalten Sie Ihre Kundendaten ({customers.length} Kunden)
            </CardDescription>
          </div>
          <AddCustomerModal
            onAddCustomer={handleAddCustomer}
            nextCustomerNumber={nextCustomerNumber}
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Kunden suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
              name="customer-search"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                {searchTerm ? 'Keine Kunden gefunden' : 'Noch keine Kunden vorhanden'}
              </div>
              {!searchTerm && (
                <AddCustomerModal
                  onAddCustomer={handleAddCustomer}
                  nextCustomerNumber={nextCustomerNumber}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {customer.customerNumber}
                        </Badge>
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{customer.email}</span>
                        </div>

                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{customer.phone}</span>
                          </div>
                        )}

                        <div className="flex items-start gap-2 md:col-span-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span className="break-words">
                            {customer.street ||
                            customer.city ||
                            customer.postalCode ||
                            customer.country
                              ? // Neue strukturierte Adresse
                                `${customer.street}${customer.street ? ', ' : ''}${customer.postalCode}${customer.postalCode ? ' ' : ''}${customer.city}${customer.city && customer.country ? ', ' : ''}${customer.country}`
                              : // Fallback auf legacy address
                                customer.address}
                          </span>
                        </div>

                        {(customer.taxNumber || customer.vatId) && (
                          <div className="md:col-span-2 pt-2 border-t border-gray-100">
                            {customer.taxNumber && (
                              <span className="text-xs text-gray-500 mr-4">
                                Steuer-Nr: {customer.taxNumber}
                              </span>
                            )}
                            {customer.vatId && (
                              <span className="text-xs text-gray-500">
                                USt-IdNr: {customer.vatId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="font-semibold text-lg text-gray-900 mb-1">
                        {formatCurrency(
                          customerStats[customer.id]?.totalAmount || customer.totalAmount
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {customerStats[customer.id]?.totalInvoices || customer.totalInvoices}{' '}
                        Rechnungen
                      </div>
                      <div className="text-xs text-gray-400">
                        Seit {formatDate(customer.createdAt)}
                      </div>

                      <div className="flex gap-1 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCustomer(customer)}
                          title="Kunde anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                          title="Kunde bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
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

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCustomer(null);
        }}
        onCustomerUpdated={() => {
          // Lade die Kunden neu, um aktualisierte Statistiken zu zeigen
          loadCustomers();
        }}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        customer={editingCustomer}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCustomer(null);
        }}
        onUpdateCustomer={handleUpdateCustomer}
      />
    </Card>
  );
}
